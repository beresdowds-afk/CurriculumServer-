#!/usr/bin/env bash
#
# Curriculum Server — PostgreSQL 16 Database Provisioning & Migration Script
#
# Covers Stage 1 (Control Plane, Production Tenant Boundary, Verified HMAC Contexts,
# Central Shared Services Entitlements 001–014) and Stage 2 (Central Curriculum DB,
# Central Textbook DB, Usage Metering, and Strictly Isolated Instance Question Bank 015).
#
# Modes:
#   --mode=gcp-cloudsql    Reconcile GCP Cloud SQL PostgreSQL 16 instance, databases,
#                          non-owner roles, Secret Manager containers/URLs, Cloud SQL IAM,
#                          run migrations 001–015 via Cloud SQL Auth Proxy, and verify RLS.
#   --mode=direct-postgres Provision/reconcile roles, schemas, migrations 001–015,
#                          HMAC context key, and 80-table RLS verification against an
#                          existing PostgreSQL 16 endpoint ($MIGRATION_DATABASE_URL).
#
# Safety:
#   Default action is --dry-run unless --apply is passed.
#   Interactive confirmation is required for --mode=gcp-cloudsql --apply unless --yes is set
#   (e.g. from GitHub Actions automation).
#
# Usage:
#   chmod +x deploy/provision-postgresql-databases.sh
#   ./deploy/provision-postgresql-databases.sh --mode=direct-postgres --apply --yes
#   ./deploy/provision-postgresql-databases.sh --mode=gcp-cloudsql --dry-run
#   ./deploy/provision-postgresql-databases.sh --mode=gcp-cloudsql --apply --yes

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${PROVISION_MODE:-gcp-cloudsql}"
ACTION="dry-run"
AUTO_APPROVE="false"
VERIFY_ONLY="false"
SKIP_MIGRATE="false"
SEED_NERDC_BASELINE="false"

# GCP / Cloud SQL defaults aligned with deploy/provision-curriculum-gcp-foundation.sh
PROJECT_ID="${PROJECT_ID:-curious-subject-477114-e4}"
REGION="${REGION:-europe-west1}"
CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-curriculum-postgres-prod}"
CLOUD_SQL_TIER="${CLOUD_SQL_TIER:-db-custom-2-7680}"
CLOUD_SQL_DISK_SIZE_GB="${CLOUD_SQL_DISK_SIZE_GB:-50}"
CLOUD_SQL_EDITION="${CLOUD_SQL_EDITION:-ENTERPRISE}"
CLOUD_SQL_AVAILABILITY="${CLOUD_SQL_AVAILABILITY:-REGIONAL}"
PG_DATABASE="${PG_DATABASE:-curriculum_platform}"
MIGRATOR_ROLE="${MIGRATOR_ROLE:-postgres}"
RUNTIME_ROLE="${RUNTIME_ROLE:-curriculum_runtime}"
CLOUD_SQL_PROXY_PORT="${CLOUD_SQL_PROXY_PORT:-15432}"

# Secret Manager identifiers (containers + versions managed safely via Secret Manager)
SECRET_MIGRATION_URL="${SECRET_MIGRATION_URL:-curriculum-postgres-migration-url}"
SECRET_RUNTIME_URL="${SECRET_RUNTIME_URL:-curriculum-postgres-runtime-url}"
SECRET_CONTROL_PLANE="${SECRET_CONTROL_PLANE:-curriculum-control-plane-secret}"

# Cloud Run runtime service accounts (preserved from foundation architecture)
RUNTIME_SERVICE_ACCOUNTS=(
  "backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
  "vertex-express@${PROJECT_ID}.iam.gserviceaccount.com"
  "curriculum-ci-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
)

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
  sed -n '2,26p' "$0"
}

for arg in "$@"; do
  case "$arg" in
    --mode=*) MODE="${arg#*=}" ;;
    --apply) ACTION="apply" ;;
    --dry-run) ACTION="dry-run" ;;
    --yes|-y) AUTO_APPROVE="true" ;;
    --verify-only) VERIFY_ONLY="true" ;;
    --skip-migrate) SKIP_MIGRATE="true" ;;
    --seed-nerdc-baseline) SEED_NERDC_BASELINE="true" ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$MODE" in
  gcp-cloudsql|direct-postgres) ;;
  *)
    echo "ERROR: Invalid --mode='$MODE'. Expected 'gcp-cloudsql' or 'direct-postgres'." >&2
    exit 2
    ;;
esac

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  echo "FATAL: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

run_cmd() {
  printf '  +'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$ACTION" == "apply" && "$VERIFY_ONLY" != "true" ]]; then
    "$@"
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  fi
}

sql_escape_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

url_encode_component() {
  node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1"
}

validate_control_plane_secret() {
  local val="$1"
  [[ ${#val} -ge 32 ]] || return 1
  [[ "$val" != "default_insecure_secret" ]] || return 1
  [[ "$val" != "dev_insecure_fallback_secret_curriculum_server_2026_secure" ]] || return 1
  return 0
}

# Build psql or node SQL execution helper so verification works whether psql is installed or not.
run_sql_file_or_stdin() {
  local db_url="$1"
  local sql_content="$2"

  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="" psql "$db_url" -v ON_ERROR_STOP=1 -X -q <<SQL
$sql_content
SQL
    return $?
  fi

  # Fallback using repository Node 'pg' package
  SQL_TARGET_URL="$db_url" SQL_STATEMENT="$sql_content" node --input-type=module <<'NODE'
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
  await client.query(statement);
} finally {
  await client.end();
}
NODE
}

run_sql_scalar() {
  local db_url="$1"
  local query="$2"

  if command -v psql >/dev/null 2>&1; then
    psql "$db_url" -v ON_ERROR_STOP=1 -X -t -A -c "$query"
    return $?
  fi

  SQL_TARGET_URL="$db_url" SQL_STATEMENT="$query" node --input-type=module <<'NODE'
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
  for (const row of res.rows) {
    console.log(Object.values(row).join('|'));
  }
} finally {
  await client.end();
}
NODE
}

provision_postgresql_internals() {
  local migration_url="$1"
  local runtime_url="$2"
  local runtime_password="$3"
  local control_plane_secret="$4"

  log "Step A — Ensure PostgreSQL 16 extensions, core schemas, and non-owner runtime role"

  if [[ "$ACTION" != "apply" || "$VERIFY_ONLY" == "true" ]]; then
    echo "  [PLANNED] Ensure schemas: control_plane, production, curriculum_flow, central_curriculum, central_textbooks, public"
    echo "  [PLANNED] Ensure extension: pgcrypto"
    echo "  [PLANNED] Reconcile non-owner role '${RUNTIME_ROLE}' (NOSUPERUSER, NOBYPASSRLS)"
  else
    local esc_pass
    esc_pass="$(sql_escape_literal "$runtime_password")"

    run_sql_file_or_stdin "$migration_url" "
DO \$\$
DECLARE
  server_major INT;
BEGIN
  server_major := current_setting('server_version_num')::int / 10000;
  IF server_major < 16 THEN
    RAISE EXCEPTION 'PostgreSQL 16+ is required; found major version %', server_major;
  END IF;
END \$\$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS control_plane;
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS curriculum_flow;
CREATE SCHEMA IF NOT EXISTS central_curriculum;
CREATE SCHEMA IF NOT EXISTS central_textbooks;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RUNTIME_ROLE}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L', '${RUNTIME_ROLE}', '${esc_pass}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L', '${RUNTIME_ROLE}', '${esc_pass}');
  END IF;
END \$\$;
"
    echo "  [APPLIED] PostgreSQL 16 version verified, pgcrypto + schemas ready, role '${RUNTIME_ROLE}' reconciled."
  fi

  log "Step B — Apply versioned migrations (001 through latest, including 014 Shared Services & 015 Central Curriculum/Textbooks/Instance QB)"

  if [[ "$SKIP_MIGRATE" == "true" ]]; then
    echo "  [SKIPPED] Migrations skipped via --skip-migrate."
  elif [[ "$ACTION" != "apply" || "$VERIFY_ONLY" == "true" ]]; then
    if [[ -d "${REPO_ROOT}/node_modules" ]]; then
      echo "  [DRY-RUN] Inspecting migration status via npm run db:migrate:status"
      MIGRATION_DATABASE_URL="$migration_url" npm --prefix "$REPO_ROOT" run db:migrate:status || true
    else
      echo "  [DRY-RUN] node_modules not installed; skipping live db:migrate:status check."
    fi
  else
    [[ -d "${REPO_ROOT}/node_modules" ]] || die "node_modules is missing; run 'npm install' before executing migrations."
    MIGRATION_DATABASE_URL="$migration_url" \
    CONTROL_PLANE_SECRET="$control_plane_secret" \
      npm --prefix "$REPO_ROOT" run db:migrate
    echo "  [APPLIED] Versioned SQL migrations applied and HMAC context key synced."
  fi

  log "Step C — Enforce strict two-role least-privilege boundaries & revoke signing key access"

  if [[ "$ACTION" != "apply" || "$VERIFY_ONLY" == "true" ]]; then
    echo "  [PLANNED] Grant schema USAGE + table DML + sequence USAGE to '${RUNTIME_ROLE}'"
    echo "  [PLANNED] Set ALTER DEFAULT PRIVILEGES for future migrations"
    echo "  [PLANNED] REVOKE ALL ON control_plane.authorization_context_keys FROM '${RUNTIME_ROLE}', PUBLIC"
  else
    run_sql_file_or_stdin "$migration_url" "
GRANT USAGE ON SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks TO ${RUNTIME_ROLE};

ALTER DEFAULT PRIVILEGES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${RUNTIME_ROLE};
ALTER DEFAULT PRIVILEGES IN SCHEMA public, production, control_plane, curriculum_flow, central_curriculum, central_textbooks
  GRANT USAGE, SELECT ON SEQUENCES TO ${RUNTIME_ROLE};

REVOKE ALL ON TABLE control_plane.authorization_context_keys FROM PUBLIC;
REVOKE ALL ON TABLE control_plane.authorization_context_keys FROM ${RUNTIME_ROLE};
"
    echo "  [APPLIED] Privileges granted to '${RUNTIME_ROLE}'; control_plane.authorization_context_keys strictly revoked."
  fi

  if [[ "$SEED_NERDC_BASELINE" == "true" && "$ACTION" == "apply" && "$VERIFY_ONLY" != "true" ]]; then
    log "Step D — Migrate baseline TypeScript NERDC curriculum dataset (explicitly marked is_official_verified = false)"
    MIGRATION_DATABASE_URL="$migration_url" \
    DATABASE_URL="$runtime_url" \
    CONTROL_PLANE_SECRET="$control_plane_secret" \
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
  console.log(JSON.stringify(report, null, 2));
} finally {
  await runtime.close();
}
"
  fi

  log "Step E — Verify all 86 required tables, FORCE ROW LEVEL SECURITY, non-owner runtime isolation, and HMAC key configuration"

  if [[ "$ACTION" != "apply" && "$VERIFY_ONLY" != "true" ]]; then
    echo "  [DRY-RUN] Skipping live runtime SQL verification because no mutations were applied."
    return 0
  fi

  # 1. Verify runtime role cannot access signing keys, is not superuser/bypassrls, owns 0 required tables, and sees all 86 tables with RLS+FORCE RLS
  local verification_output
  verification_output="$(run_sql_scalar "$runtime_url" "
WITH required(table_name) AS (
  VALUES
    ('control_plane.customers'),
    ('control_plane.organisations'),
    ('control_plane.instances'),
    ('control_plane.provisioning_requests'),
    ('control_plane.provisioning_jobs'),
    ('control_plane.audit_logs'),
    ('control_plane.approval_records'),
    ('control_plane.piam_authorizations'),
    ('control_plane.resource_configurations'),
    ('control_plane.resource_verification_evidence'),
    ('control_plane.architecture_profiles'),
    ('control_plane.provisioning_job_attempts'),
    ('curriculum_flow.users'),
    ('curriculum_flow.students'),
    ('production.tenants'),
    ('production.organizations'),
    ('production.memberships'),
    ('production.instances'),
    ('production.provisioning_jobs'),
    ('production.approvals'),
    ('production.audit_events'),
    ('production.schools'),
    ('production.classes'),
    ('production.students'),
    ('production.academic_records'),
    ('production.users'),
    ('production.school_configurations'),
    ('production.application_instances'),
    ('production.school_provisioning_requests'),
    ('production.school_provisioning_operations'),
    ('production.application_instance_configurations'),
    ('production.application_service_entitlements'),
    ('production.school_commercial_agreements'),
    ('production.school_configuration_versions'),
    ('production.application_instance_deployments'),
    ('production.school_admin_invitations'),
    ('production.invitation_outbox'),
    ('production.invitation_delivery_attempts'),
    ('production.user_sessions'),
    ('production.membership_role_assignments'),
    ('production.role_assignment_scopes'),
    ('production.application_lifecycle_events'),
    ('production.permissions'),
    ('production.roles'),
    ('production.role_permissions'),
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
    ('production.shared_service_usage_metrics'),
    ('production.instance_question_categories'),
    ('production.instance_question_bank_items'),
    ('production.instance_assessment_blueprints'),
    ('production.instance_exam_configurations'),
    ('production.instance_assessment_records'),
    ('central_curriculum.curriculum_source_documents'),
    ('central_curriculum.curriculum_competencies'),
    ('central_textbooks.textbook_illustrations'),
    ('central_textbooks.textbook_glossaries'),
    ('central_textbooks.textbook_validation_reports'),
    ('central_textbooks.textbook_revisions')
),
checked AS (
  SELECT
    r.table_name,
    c.oid IS NOT NULL AS exists_ok,
    coalesce(c.relrowsecurity, false) AS rls_ok,
    coalesce(c.relforcerowsecurity, false) AS force_rls_ok,
    coalesce(c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user), false) AS owned_by_runtime
  FROM required r
  LEFT JOIN pg_namespace n ON n.nspname = split_part(r.table_name, '.', 1)
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = split_part(r.table_name, '.', 2)
),
role_info AS (
  SELECT rolname, rolsuper, rolbypassrls
  FROM pg_roles
  WHERE rolname = current_user
)
SELECT
  (SELECT count(*) FROM checked WHERE exists_ok) || '/' || (SELECT count(*) FROM required) ||
  '|rls=' || (SELECT count(*) FROM checked WHERE rls_ok AND force_rls_ok) ||
  '|owned_by_runtime=' || (SELECT count(*) FROM checked WHERE owned_by_runtime) ||
  '|super=' || (SELECT rolsuper FROM role_info) ||
  '|bypassrls=' || (SELECT rolbypassrls FROM role_info) ||
  '|hmac_key_configured=' || production.authorization_context_key_configured() ||
  '|runtime_key_priv=' || (
    has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'SELECT')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'INSERT')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'UPDATE')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'DELETE')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRUNCATE')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'REFERENCES')
    OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRIGGER')
  ) ||
  '|shared_perms=' || (SELECT count(*) FROM production.permissions WHERE code LIKE 'shared.%');
")"

  echo "  [VERIFIED] Runtime SQL check: ${verification_output}"

  [[ "$verification_output" == "86/86|rls=86|owned_by_runtime=0|super=f|bypassrls=f|hmac_key_configured=t|runtime_key_priv=f|shared_perms=12" ]] ||
    die "Database verification failed security/schema invariants: ${verification_output}"
}

ensure_gcp_secret_container() {
  local secret_name="$1"
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] Secret Manager secret: $secret_name"
  else
    echo "  [MISSING] Secret Manager secret: $secret_name"
    run_cmd gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic
  fi
}

ensure_gcp_secret_accessor() {
  local secret_name="$1"
  local member="$2"
  local policy
  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud secrets add-iam-policy-binding "$secret_name" \
      --project="$PROJECT_ID" \
      --role="roles/secretmanager.secretAccessor" \
      --member="$member" \
      --condition=None
    return
  fi
  policy="$(gcloud secrets get-iam-policy "$secret_name" --project="$PROJECT_ID" --format=json)"
  if jq -e --arg member "$member" \
    '.bindings[]? | select(.role=="roles/secretmanager.secretAccessor" and ((.members // []) | index($member)) and (.condition == null))' \
    <<<"$policy" >/dev/null; then
    echo "  [PRESENT] $secret_name secretAccessor -> $member"
  else
    run_cmd gcloud secrets add-iam-policy-binding "$secret_name" \
      --project="$PROJECT_ID" \
      --role="roles/secretmanager.secretAccessor" \
      --member="$member" \
      --condition=None
  fi
}

read_secret_value_if_exists() {
  local secret_name="$1"
  if gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" 2>/dev/null; then
    return 0
  fi
  return 1
}

write_secret_version() {
  local secret_name="$1"
  local secret_value="$2"
  printf '%s' "$secret_value" | gcloud secrets versions add "$secret_name" \
    --project="$PROJECT_ID" \
    --data-file=- >/dev/null
}

start_cloud_sql_proxy() {
  local connection_name="$1"
  local proxy_bin=""

  if command -v cloud-sql-proxy >/dev/null 2>&1; then
    proxy_bin="cloud-sql-proxy"
  elif command -v cloud_sql_proxy >/dev/null 2>&1; then
    proxy_bin="cloud_sql_proxy"
  else
    log "Downloading cloud-sql-proxy v2 to temporary directory"
    local tmp_proxy
    tmp_proxy="$(mktemp /tmp/cloud-sql-proxy.XXXXXX)"
    TMP_FILES+=("$tmp_proxy")
    curl -fsSL "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.3/cloud-sql-proxy.linux.amd64" -o "$tmp_proxy"
    chmod +x "$tmp_proxy"
    proxy_bin="$tmp_proxy"
  fi

  local proxy_log
  proxy_log="$(mktemp /tmp/cloud-sql-proxy-log.XXXXXX)"
  TMP_FILES+=("$proxy_log")

  "$proxy_bin" "$connection_name" --port="$CLOUD_SQL_PROXY_PORT" >"$proxy_log" 2>&1 &
  PROXY_PID="$!"

  local attempts=0
  while (( attempts < 30 )); do
    if ! kill -0 "$PROXY_PID" >/dev/null 2>&1; then
      cat "$proxy_log" >&2 || true
      die "Cloud SQL Auth Proxy exited unexpectedly."
    fi
    if (echo >/dev/tcp/127.0.0.1/"$CLOUD_SQL_PROXY_PORT") >/dev/null 2>&1; then
      echo "  [READY] Cloud SQL Auth Proxy listening on 127.0.0.1:${CLOUD_SQL_PROXY_PORT} -> ${connection_name}"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  cat "$proxy_log" >&2 || true
  die "Timed out waiting for Cloud SQL Auth Proxy on 127.0.0.1:${CLOUD_SQL_PROXY_PORT}."
}

run_direct_postgres_mode() {
  log "Mode: direct-postgres | Action: ${ACTION} | VerifyOnly: ${VERIFY_ONLY}"

  local migration_url="${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}"
  [[ -n "$migration_url" ]] || die "MIGRATION_DATABASE_URL (owner/admin PostgreSQL connection URL) is required in direct-postgres mode."

  local cp_secret="${CONTROL_PLANE_SECRET:-}"
  if ! validate_control_plane_secret "$cp_secret"; then
    if [[ "$VERIFY_ONLY" == "true" || "$ACTION" != "apply" ]]; then
      die "CONTROL_PLANE_SECRET (32+ chars, non-default) must be supplied."
    fi
    cp_secret="$(generate_secret)"
    echo "  [GENERATED] Ephemeral strong CONTROL_PLANE_SECRET generated for direct-postgres provisioning."
  fi

  local runtime_pw="${RUNTIME_DB_PASSWORD:-}"
  local runtime_url="${TEST_DATABASE_URL:-${RUNTIME_DATABASE_URL:-}}"

  if [[ -n "$runtime_url" && -z "$runtime_pw" ]]; then
    runtime_pw="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.password || ''));" "$runtime_url")"
  fi
  if [[ -z "$runtime_pw" ]]; then
    runtime_pw="$(generate_secret)"
  fi

  if [[ -z "$runtime_url" ]]; then
    runtime_url="$(node -e "
      const m = new URL(process.argv[1]);
      m.username = process.argv[2];
      m.password = process.argv[3];
      process.stdout.write(m.toString());
    " "$migration_url" "$RUNTIME_ROLE" "$runtime_pw")"
  fi

  provision_postgresql_internals "$migration_url" "$runtime_url" "$runtime_pw" "$cp_secret"
}

run_gcp_cloudsql_mode() {
  log "Mode: gcp-cloudsql | Project: ${PROJECT_ID} | Region: ${REGION} | Instance: ${CLOUD_SQL_INSTANCE} | Action: ${ACTION}"

  require_cmd gcloud
  require_cmd jq

  local active_account
  active_account="$(gcloud auth list --filter='status:ACTIVE' --format='value(account)' | head -n 1)"
  [[ -n "$active_account" ]] || die "No active gcloud account found."
  echo "  Active gcloud identity: ${active_account}"

  if [[ "$ACTION" == "apply" && "$VERIFY_ONLY" != "true" && "$AUTO_APPROVE" != "true" ]]; then
    echo
    echo "This will provision/reconcile Cloud SQL PostgreSQL 16 (${CLOUD_SQL_INSTANCE}),"
    echo "create database '${PG_DATABASE}', manage Secret Manager secrets, apply migrations 001–015,"
    echo "and verify restricted runtime role '${RUNTIME_ROLE}'."
    read -r -p "Type exactly 'APPLY POSTGRES PROVISIONING': " confirm
    [[ "$confirm" == "APPLY POSTGRES PROVISIONING" ]] || die "Confirmation failed."
  fi

  log "Step 1 — Reconcile Cloud SQL & Secret Manager APIs"
  for api in sqladmin.googleapis.com secretmanager.googleapis.com; do
    if gcloud services list --enabled --project="$PROJECT_ID" --filter="config.name=${api}" --format='value(config.name)' | grep -Fxq "$api"; then
      echo "  [PRESENT] API $api"
    else
      echo "  [MISSING] API $api"
      run_cmd gcloud services enable "$api" --project="$PROJECT_ID"
    fi
  done

  log "Step 2 — Reconcile Cloud SQL PostgreSQL 16 instance (${CLOUD_SQL_INSTANCE})"
  if gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] Cloud SQL instance ${CLOUD_SQL_INSTANCE}"
  else
    echo "  [MISSING] Cloud SQL instance ${CLOUD_SQL_INSTANCE} (POSTGRES_16, PITR enabled, ENCRYPTED_ONLY SSL)"
    run_cmd gcloud sql instances create "$CLOUD_SQL_INSTANCE" \
      --project="$PROJECT_ID" \
      --database-version=POSTGRES_16 \
      --region="$REGION" \
      --tier="$CLOUD_SQL_TIER" \
      --edition="$CLOUD_SQL_EDITION" \
      --availability-type="$CLOUD_SQL_AVAILABILITY" \
      --storage-type=SSD \
      --storage-size="${CLOUD_SQL_DISK_SIZE_GB}" \
      --storage-auto-increase \
      --backup-start-time=02:00 \
      --enable-point-in-time-recovery \
      --retained-backups-count=14 \
      --ssl-mode=ENCRYPTED_ONLY \
      --deletion-protection
  fi

  log "Step 3 — Reconcile database '${PG_DATABASE}' inside '${CLOUD_SQL_INSTANCE}'"
  if gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1 &&
     gcloud sql databases describe "$PG_DATABASE" --instance="$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] Database ${PG_DATABASE}"
  else
    echo "  [MISSING] Database ${PG_DATABASE}"
    run_cmd gcloud sql databases create "$PG_DATABASE" \
      --instance="$CLOUD_SQL_INSTANCE" \
      --project="$PROJECT_ID"
  fi

  log "Step 4 — Reconcile Cloud Run & CI IAM access (roles/cloudsql.client + Secret Manager)"
  for sa in "${RUNTIME_SERVICE_ACCOUNTS[@]}"; do
    local member="serviceAccount:${sa}"
    local policy
    policy="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"
    if jq -e --arg member "$member" \
      '.bindings[]? | select(.role=="roles/cloudsql.client" and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
      echo "  [PRESENT] roles/cloudsql.client -> $member"
    else
      run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="$member" \
        --role="roles/cloudsql.client" \
        --condition=None
    fi
  done

  for secret_name in "$SECRET_RUNTIME_URL" "$SECRET_CONTROL_PLANE"; do
    ensure_gcp_secret_container "$secret_name"
    for sa in "${RUNTIME_SERVICE_ACCOUNTS[@]}"; do
      ensure_gcp_secret_accessor "$secret_name" "serviceAccount:${sa}"
    done
  done
  ensure_gcp_secret_container "$SECRET_MIGRATION_URL"
  ensure_gcp_secret_accessor "$SECRET_MIGRATION_URL" "serviceAccount:curriculum-ci-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

  if [[ "$ACTION" != "apply" ]]; then
    echo
    echo "============================================================"
    echo "DRY-RUN COMPLETE (no Cloud SQL resources or schemas mutated)"
    echo "============================================================"
    return 0
  fi

  local connection_name
  connection_name="$(gcloud sql instances describe "$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
  [[ -n "$connection_name" ]] || die "Could not resolve Cloud SQL connectionName."

  # Resolve or provision database credentials & URLs cleanly via Secret Manager
  local cp_secret="${CONTROL_PLANE_SECRET:-}"
  if ! validate_control_plane_secret "$cp_secret"; then
    cp_secret="$(read_secret_value_if_exists "$SECRET_CONTROL_PLANE" || true)"
    if ! validate_control_plane_secret "$cp_secret"; then
      cp_secret="$(generate_secret)"
      write_secret_version "$SECRET_CONTROL_PLANE" "$cp_secret"
      echo "  [SECRET] Stored initial generated version in Secret Manager: ${SECRET_CONTROL_PLANE}"
    fi
  fi

  local migrator_pw=""
  local runtime_pw=""
  local migration_proxy_url=""
  local runtime_proxy_url=""

  if [[ -n "${MIGRATION_DATABASE_URL:-}" ]]; then
    migration_proxy_url="$MIGRATION_DATABASE_URL"
  else
    local stored_mig_url
    stored_mig_url="$(read_secret_value_if_exists "$SECRET_MIGRATION_URL" || true)"
    if [[ -n "$stored_mig_url" ]]; then
      migrator_pw="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.password || ''));" "$stored_mig_url")"
    fi
    if [[ -z "$migrator_pw" ]]; then
      migrator_pw="$(generate_secret)"
      if gcloud sql users list --instance="$CLOUD_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(name)' | grep -Fxq "$MIGRATOR_ROLE"; then
        gcloud sql users set-password "$MIGRATOR_ROLE" \
          --instance="$CLOUD_SQL_INSTANCE" \
          --project="$PROJECT_ID" \
          --password="$migrator_pw" >/dev/null
      else
        gcloud sql users create "$MIGRATOR_ROLE" \
          --instance="$CLOUD_SQL_INSTANCE" \
          --project="$PROJECT_ID" \
          --password="$migrator_pw" >/dev/null
      fi
      local enc_mig_pw enc_socket_mig
      enc_mig_pw="$(url_encode_component "$migrator_pw")"
      enc_socket_mig="postgresql://${MIGRATOR_ROLE}:${enc_mig_pw}@/${PG_DATABASE}?host=/cloudsql/${connection_name}"
      write_secret_version "$SECRET_MIGRATION_URL" "$enc_socket_mig"
      echo "  [SECRET] Stored Cloud SQL Unix-socket migration URL in Secret Manager: ${SECRET_MIGRATION_URL}"
    fi
    local enc_mig_pw
    enc_mig_pw="$(url_encode_component "$migrator_pw")"
    migration_proxy_url="postgres://${MIGRATOR_ROLE}:${enc_mig_pw}@127.0.0.1:${CLOUD_SQL_PROXY_PORT}/${PG_DATABASE}?sslmode=disable"
  fi

  local stored_run_url
  stored_run_url="$(read_secret_value_if_exists "$SECRET_RUNTIME_URL" || true)"
  if [[ -n "$stored_run_url" ]]; then
    runtime_pw="$(node -e "const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.password || ''));" "$stored_run_url")"
  fi
  if [[ -z "$runtime_pw" ]]; then
    runtime_pw="$(generate_secret)"
    local enc_run_pw enc_socket_run
    enc_run_pw="$(url_encode_component "$runtime_pw")"
    enc_socket_run="postgresql://${RUNTIME_ROLE}:${enc_run_pw}@/${PG_DATABASE}?host=/cloudsql/${connection_name}"
    write_secret_version "$SECRET_RUNTIME_URL" "$enc_socket_run"
    echo "  [SECRET] Stored Cloud SQL Unix-socket runtime URL in Secret Manager: ${SECRET_RUNTIME_URL}"
  fi
  local enc_run_pw
  enc_run_pw="$(url_encode_component "$runtime_pw")"
  runtime_proxy_url="postgres://${RUNTIME_ROLE}:${enc_run_pw}@127.0.0.1:${CLOUD_SQL_PROXY_PORT}/${PG_DATABASE}?sslmode=disable"

  log "Step 5 — Open encrypted Cloud SQL Auth Proxy tunnel & apply PostgreSQL schema provisioning"
  start_cloud_sql_proxy "$connection_name"
  provision_postgresql_internals "$migration_proxy_url" "$runtime_proxy_url" "$runtime_pw" "$cp_secret"
}

if [[ "$MODE" == "direct-postgres" ]]; then
  run_direct_postgres_mode
else
  run_gcp_cloudsql_mode
fi

log "PostgreSQL provisioning & verification finished cleanly."
