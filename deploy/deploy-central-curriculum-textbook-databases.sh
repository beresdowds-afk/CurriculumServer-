#!/usr/bin/env bash
#
# deploy-central-curriculum-textbook-databases.sh
#
# Safe, idempotent, non-destructive PostgreSQL / Cloud SQL deployment & migration script
# for the Central Curriculum Database and Central Textbook Database domains.
#
# Supports:
#   --mode=direct-postgres   Connect directly using MIGRATION_DATABASE_URL (or explicit PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)
#   --mode=cloudsql          Connect through Cloud SQL Auth Proxy for CLOUD_SQL_CONNECTION_NAME (or PROJECT_ID/REGION/CLOUD_SQL_INSTANCE)
#
# Execution Modes:
#   --dry-run                (Default) Validate tools, environment, connectivity, target DB identity, and pending migrations without mutating schema/data.
#   --apply                  Apply ordered versioned SQL migrations (001-016), reconcile domain schemas & privileges, and verify schema/RLS/indexes/FKs.
#   --seed-nerdc-baseline    (With --apply) Idempotently migrate TypeScript NERDC curriculum baseline (is_official_verified = false) after migrations.
#   --expected-database=...  Fail fast unless the connected current_database() matches this exact database name.
#   --help                   Print usage.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/src/db/migrations"

MODE="${DEPLOY_DB_MODE:-direct-postgres}"
ACTION="dry-run"
SEED_NERDC_BASELINE="false"
EXPECTED_DATABASE="${EXPECTED_DATABASE:-${PGDATABASE:-curriculum_platform}}"
RUNTIME_ROLE="${RUNTIME_ROLE:-curriculum_runtime}"
CLOUD_SQL_PROXY_PORT="${CLOUD_SQL_PROXY_PORT:-15433}"

PROXY_PID=""
TMP_FILES=()

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]] && kill -0 "$PROXY_PID" >/dev/null 2>&1; then
    kill "$PROXY_PID" >/dev/null 2>&1 || true
    wait "$PROXY_PID" >/dev/null 2>&1 || true
  fi
  for f in "${TMP_FILES[@]:-}"; do
    [[ -e "$f" ]] && rm -f "$f" || true
  done
}
trap cleanup EXIT

usage() {
  sed -n '2,20p' "$0"
}

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  echo "FATAL: $*" >&2
  exit 1
}

redact_url() {
  local raw="$1"
  node -e "
    try {
      const u = new URL(process.argv[1]);
      const port = u.port ? ':' + u.port : '';
      const host = u.hostname || '(unix-socket)';
      const db = u.pathname ? u.pathname.replace(/^\//, '') : '';
      process.stdout.write(u.protocol + '//' + (u.username || '***') + ':***@' + host + port + '/' + db);
    } catch {
      process.stdout.write('<redacted-connection-string>');
    }
  " "$raw"
}

for arg in "$@"; do
  case "$arg" in
    --mode=*) MODE="${arg#*=}" ;;
    --apply) ACTION="apply" ;;
    --dry-run) ACTION="dry-run" ;;
    --seed-nerdc-baseline) SEED_NERDC_BASELINE="true" ;;
    --expected-database=*) EXPECTED_DATABASE="${arg#*=}" ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$MODE" in
  direct-postgres|cloudsql) ;;
  *) die "Invalid --mode='$MODE'. Allowed values: direct-postgres, cloudsql." ;;
esac

# ---------------------------------------------------------------------------
# Requirement 1 & 5: Confirm required CLI tools & required env vars up front
# ---------------------------------------------------------------------------
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required tool not found in PATH: $1"
}

log "Step 1 — Checking required CLI tools and repository migration files"
require_cmd node
require_cmd npm
require_cmd npx
[[ -d "$MIGRATIONS_DIR" ]] || die "Migrations directory not found: $MIGRATIONS_DIR"
[[ -d "${REPO_ROOT}/node_modules" ]] || die "node_modules directory is missing. Run 'npm install' first."

MIGRATION_COUNT="$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9]_*.sql' | wc -l | tr -d ' ')"
[[ "$MIGRATION_COUNT" -ge 16 ]] || die "Expected at least 16 ordered versioned migrations in ${MIGRATIONS_DIR}, found ${MIGRATION_COUNT}."

if [[ "$MODE" == "cloudsql" ]]; then
  if ! command -v cloud-sql-proxy >/dev/null 2>&1 && ! command -v cloud_sql_proxy >/dev/null 2>&1; then
    die "cloud-sql-proxy binary is required for --mode=cloudsql."
  fi
fi

# Requirement 2 & 5: Validate required environment variables explicitly without leaking values
CONTROL_PLANE_SECRET_VAL="${CONTROL_PLANE_SECRET:-}"
if [[ ${#CONTROL_PLANE_SECRET_VAL} -lt 32 ]]; then
  die "CONTROL_PLANE_SECRET (32+ characters) is required and was not provided."
fi
if [[ "$CONTROL_PLANE_SECRET_VAL" == "default_insecure_secret" || "$CONTROL_PLANE_SECRET_VAL" == "dev_insecure_fallback_secret_curriculum_server_2026_secure" ]]; then
  die "Refusing to run against placeholder/insecure CONTROL_PLANE_SECRET."
fi

resolve_target_url() {
  if [[ "$MODE" == "direct-postgres" ]]; then
    if [[ -n "${MIGRATION_DATABASE_URL:-}" ]]; then
      printf '%s' "$MIGRATION_DATABASE_URL"
      return 0
    fi
    if [[ -n "${PGHOST:-}" && -n "${PGDATABASE:-}" && -n "${PGUSER:-}" && -n "${PGPASSWORD:-}" ]]; then
      local port="${PGPORT:-5432}"
      local sslmode="${PGSSLMODE:-require}"
      node -e "
        const [h, port, db, user, pass, ssl] = process.argv.slice(1);
        const url = new URL('postgresql://' + encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@' + h + ':' + port + '/' + encodeURIComponent(db));
        if (ssl) url.searchParams.set('sslmode', ssl);
        process.stdout.write(url.toString());
      " "$PGHOST" "$port" "$PGDATABASE" "$PGUSER" "$PGPASSWORD" "$sslmode"
      return 0
    fi
    die "In direct-postgres mode, MIGRATION_DATABASE_URL or (PGHOST, PGDATABASE, PGUSER, PGPASSWORD) must be set."
  fi

  # Cloud SQL mode via Cloud SQL Auth Proxy
  local conn_name="${CLOUD_SQL_CONNECTION_NAME:-}"
  if [[ -z "$conn_name" && -n "${PROJECT_ID:-}" && -n "${REGION:-}" && -n "${CLOUD_SQL_INSTANCE:-}" ]]; then
    conn_name="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
  fi
  [[ -n "$conn_name" ]] || die "CLOUD_SQL_CONNECTION_NAME (or PROJECT_ID, REGION, CLOUD_SQL_INSTANCE) is required in cloudsql mode."
  [[ -n "${PGUSER:-}" && -n "${PGPASSWORD:-}" && -n "${PGDATABASE:-}" ]] || die "PGUSER, PGPASSWORD, and PGDATABASE are required in cloudsql mode."

  local proxy_bin
  if command -v cloud-sql-proxy >/dev/null 2>&1; then
    proxy_bin="cloud-sql-proxy"
  else
    proxy_bin="cloud_sql_proxy"
  fi
  local proxy_log
  proxy_log="$(mktemp /tmp/central-db-proxy.XXXXXX)"
  TMP_FILES+=("$proxy_log")

  "$proxy_bin" "$conn_name" --port="$CLOUD_SQL_PROXY_PORT" >"$proxy_log" 2>&1 &
  PROXY_PID="$!"

  local attempts=0
  while (( attempts < 30 )); do
    if ! kill -0 "$PROXY_PID" >/dev/null 2>&1; then
      die "Cloud SQL Auth Proxy exited prematurely. Check IAM permissions and CLOUD_SQL_CONNECTION_NAME."
    fi
    if (echo >/dev/tcp/127.0.0.1/"$CLOUD_SQL_PROXY_PORT") >/dev/null 2>&1; then
      break
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  (( attempts < 30 )) || die "Timed out waiting for Cloud SQL Auth Proxy on 127.0.0.1:${CLOUD_SQL_PROXY_PORT}."

  node -e "
    const [port, db, user, pass] = process.argv.slice(1);
    const url = new URL('postgresql://' + encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@127.0.0.1:' + port + '/' + encodeURIComponent(db) + '?sslmode=disable');
    process.stdout.write(url.toString());
  " "$CLOUD_SQL_PROXY_PORT" "$PGDATABASE" "$PGUSER" "$PGPASSWORD"
}

run_sql() {
  local db_url="$1"
  local statement="$2"
  SQL_TARGET_URL="$db_url" SQL_STATEMENT="$statement" node --input-type=module <<'NODE'
import { Client } from 'pg';
const url = process.env.SQL_TARGET_URL;
const statement = process.env.SQL_STATEMENT;
const parsed = new URL(url);
const sslmode = parsed.searchParams.get('sslmode');
const client = new Client({
  connectionString: url,
  ssl: sslmode === 'disable' || parsed.hostname.startsWith('/') ? false : { rejectUnauthorized: false }
});
await client.connect();
try {
  const res = await client.query(statement);
  if (res.rows && res.rows.length > 0) {
    console.log(JSON.stringify(res.rows));
  }
} finally {
  await client.end();
}
NODE
}

TARGET_URL="$(resolve_target_url)"
SAFE_TARGET_LABEL="$(redact_url "$TARGET_URL")"

log "Step 2 — Validating target PostgreSQL connectivity & database identity (${SAFE_TARGET_LABEL})"

# ---------------------------------------------------------------------------
# Requirement 3, 4 & 10: Confirm connectivity, exact database match, and primary read-write status
# ---------------------------------------------------------------------------
PRECHECK_JSON="$(run_sql "$TARGET_URL" "
  SELECT current_database() AS db_name,
         current_user AS db_user,
         (current_setting('server_version_num')::int / 10000) AS pg_major,
         pg_is_in_recovery() AS in_recovery
")" || die "Database connectivity check failed for ${SAFE_TARGET_LABEL}."

DB_CHECK_SUMMARY="$(node -e "
  const rows = JSON.parse(process.argv[1]);
  const r = rows[0] || {};
  console.log([r.db_name || '', r.db_user || '', r.pg_major || 0, String(r.in_recovery)].join('|'));
" "$PRECHECK_JSON")"

IFS='|' read -r ACTUAL_DB ACTUAL_USER ACTUAL_PG_MAJOR IN_RECOVERY <<< "$DB_CHECK_SUMMARY"

[[ -n "$ACTUAL_DB" ]] || die "Unable to verify connected current_database()."
if [[ -n "$EXPECTED_DATABASE" && "$ACTUAL_DB" != "$EXPECTED_DATABASE" ]]; then
  die "Target database mismatch! Connected to '${ACTUAL_DB}' but expected '${EXPECTED_DATABASE}'. Aborting to prevent silent DB switch."
fi
(( ACTUAL_PG_MAJOR >= 16 )) || die "PostgreSQL 16+ is required; connected server reported major version ${ACTUAL_PG_MAJOR}."
[[ "$IN_RECOVERY" == "false" ]] || die "Target database '${ACTUAL_DB}' is a read-only replica (pg_is_in_recovery() = true)."

log "  Connected safely: database=${ACTUAL_DB} user=${ACTUAL_USER} pg_major=${ACTUAL_PG_MAJOR} mode=${MODE}"

# ---------------------------------------------------------------------------
# Requirement 12: Dry-Run vs Apply Mode
# ---------------------------------------------------------------------------
if [[ "$ACTION" != "apply" ]]; then
  log "Step 3 — DRY-RUN ONLY: Inspecting ordered migration status without applying changes"
  MIGRATION_DATABASE_URL="$TARGET_URL" npm --prefix "$REPO_ROOT" run db:migrate:status
  log "DRY-RUN SUMMARY: target_db=${ACTUAL_DB} mode=${MODE} action=dry-run migrations_discovered=${MIGRATION_COUNT} no_mutations_applied=true"
  exit 0
fi

# ---------------------------------------------------------------------------
# Requirement 6, 7, 8, 10, 11: Ordered, transactional, idempotent schema & migrations
# ---------------------------------------------------------------------------
log "Step 3 — Ensuring extensions & logical domains (central_curriculum, central_textbooks, production, control_plane)"
run_sql "$TARGET_URL" "
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE SCHEMA IF NOT EXISTS control_plane;
  CREATE SCHEMA IF NOT EXISTS production;
  CREATE SCHEMA IF NOT EXISTS curriculum_flow;
  CREATE SCHEMA IF NOT EXISTS central_curriculum;
  CREATE SCHEMA IF NOT EXISTS central_textbooks;
" >/dev/null

log "Step 4 — Applying ordered versioned SQL migrations (001 through ${MIGRATION_COUNT})"
MIGRATION_DATABASE_URL="$TARGET_URL" \
CONTROL_PLANE_SECRET="$CONTROL_PLANE_SECRET_VAL" \
  npm --prefix "$REPO_ROOT" run db:migrate

log "Step 5 — Reconciling least-privilege runtime grants for role '${RUNTIME_ROLE}' (if present)"
run_sql "$TARGET_URL" "
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RUNTIME_ROLE}') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE}';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE}';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE}';
    EXECUTE 'REVOKE ALL ON TABLE control_plane.authorization_context_keys FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON TABLE control_plane.authorization_context_keys FROM ${RUNTIME_ROLE}';
  END IF;
END \$\$;
" >/dev/null

if [[ "$SEED_NERDC_BASELINE" == "true" ]]; then
  log "Step 6 — Running idempotent TypeScript NERDC dataset import (marked is_official_verified = false)"
  MIGRATION_DATABASE_URL="$TARGET_URL" \
  DATABASE_URL="$TARGET_URL" \
  CONTROL_PLANE_SECRET="$CONTROL_PLANE_SECRET_VAL" \
    npx --prefix "$REPO_ROOT" tsx --input-type=module -e "
import { PostgresRuntime } from './server/db/postgres';
import { migrateNerdcDatasetsToPostgres } from './server/curriculum/nerdcMigrationLoader';
const runtime = new PostgresRuntime({ ...process.env, DATABASE_URL: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL });
try {
  const report = await migrateNerdcDatasetsToPostgres(runtime.getPool(), {
    userId: 'platform-provisioner',
    email: 'provisioner@curriculumserver.local',
    tenantId: 'control-plane',
    role: 'super_admin'
  });
  console.log(JSON.stringify({
    subjectsMigrated: report.subjectsMigrated,
    topicsMigrated: report.topicsMigrated,
    objectivesMigrated: report.objectivesMigrated,
    isOfficialVerified: report.isOfficialVerified
  }));
} finally {
  await runtime.close();
}
"
fi

# ---------------------------------------------------------------------------
# Requirement 13 & 14: Post-deployment schema, FKs, indexes, RLS & non-sensitive summary
# ---------------------------------------------------------------------------
log "Step 7 — Verifying schemas, core tables, foreign keys, indexes, and FORCE ROW LEVEL SECURITY"
VERIFY_JSON="$(run_sql "$TARGET_URL" "
WITH required(table_name) AS (
  VALUES
    ('production.curriculum_countries'),
    ('production.curriculum_education_authorities'),
    ('production.curriculum_frameworks'),
    ('production.curriculum_education_levels'),
    ('production.curriculum_class_grades'),
    ('production.curriculum_subject_classifications'),
    ('production.curriculum_subjects'),
    ('production.curriculum_versions'),
    ('production.curriculum_version_subjects'),
    ('production.curriculum_themes'),
    ('production.curriculum_topics'),
    ('production.curriculum_subtopics'),
    ('production.curriculum_learning_objectives'),
    ('production.curriculum_standards'),
    ('production.curriculum_change_history'),
    ('central_curriculum.curriculum_source_documents'),
    ('central_curriculum.curriculum_competencies'),
    ('production.central_publishers'),
    ('production.central_authors'),
    ('production.central_textbooks'),
    ('production.central_textbook_contributors'),
    ('production.central_textbook_versions'),
    ('production.central_textbook_chapters'),
    ('production.central_textbook_sections'),
    ('production.central_textbook_content_blocks'),
    ('production.central_textbook_objective_mappings'),
    ('production.central_textbook_media_assets'),
    ('production.central_textbook_citations'),
    ('production.central_textbook_editorial_reviews'),
    ('production.central_textbook_coverage_manifests'),
    ('production.central_textbook_generation_jobs'),
    ('central_textbooks.textbook_illustrations'),
    ('central_textbooks.textbook_glossaries'),
    ('central_textbooks.textbook_validation_reports'),
    ('central_textbooks.textbook_revisions'),
    ('production.instance_question_categories'),
    ('production.instance_question_bank_items'),
    ('production.instance_assessment_blueprints'),
    ('production.instance_exam_configurations'),
    ('production.instance_assessment_records')
),
checked AS (
  SELECT
    r.table_name,
    c.oid IS NOT NULL AS exists_ok,
    coalesce(c.relrowsecurity, false) AS rls_ok,
    coalesce(c.relforcerowsecurity, false) AS force_rls_ok
  FROM required r
  LEFT JOIN pg_namespace n ON n.nspname = split_part(r.table_name, '.', 1)
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = split_part(r.table_name, '.', 2)
)
SELECT
  (SELECT count(*) FROM checked WHERE exists_ok) AS tables_present,
  (SELECT count(*) FROM required) AS tables_expected,
  (SELECT count(*) FROM checked WHERE rls_ok AND force_rls_ok) AS tables_rls_forced,
  (SELECT count(*) FROM control_plane.schema_migrations WHERE status = 'applied') AS migrations_applied,
  (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname IN ('production', 'central_curriculum', 'central_textbooks')) AS fk_count,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname IN ('production', 'central_curriculum', 'central_textbooks')) AS index_count,
  production.authorization_context_key_configured() AS hmac_key_configured
")"

VERIFY_SUMMARY="$(node -e "
  const r = JSON.parse(process.argv[1])[0] || {};
  console.log(JSON.stringify(r));
  if (Number(r.tables_present) !== Number(r.tables_expected) || Number(r.tables_rls_forced) !== Number(r.tables_expected)) {
    process.exit(1);
  }
  if (!r.hmac_key_configured) {
    process.exit(2);
  }
" "$VERIFY_JSON")" || die "Schema/RLS/HMAC verification failed: ${VERIFY_JSON}"

log "DEPLOYMENT SUMMARY (non-sensitive): database=${ACTUAL_DB} mode=${MODE} result=${VERIFY_SUMMARY}"
