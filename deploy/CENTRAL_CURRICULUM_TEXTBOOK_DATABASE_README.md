# Central Curriculum & Central Textbook PostgreSQL Databases — Deployment & Operations Guide

## 1. Architecture Overview

Curriculum Server separates authoritative central services from school-instance-owned assessment data:

- **Central Curriculum Database** (`production.curriculum_*` + `central_curriculum.*`): Authoritative national & regional curriculum frameworks, authorities (including NERDC), source provenance documents, version lifecycles (`draft -> under_review -> approved -> published -> superseded`), subjects, themes, topics, subtopics, learning/performance objectives, competencies/skills, standards, and immutable change history.
- **Central Textbook Database** (`production.central_*` + `central_textbooks.*`): Authoritative textbooks generated or authored strictly against approved & published curriculum versions, editorial review logs, section-to-objective mappings, private media assets, citations, illustrations, glossaries, validation reports, textbook revisions, coverage manifests, and recoverable Gemini generation jobs.
- **School Instance Question Bank** (`production.instance_*`): Strictly tenant-owned (`tenant_id` + `application_instance_id`) via PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`). Central services never store, share, or read school question banks, CBT exams, or grading history.

## 2. Database Objects Created Across Migrations (`014`–`016`)

### Migration `015_central_curriculum_and_textbooks.sql`
- `production.curriculum_countries`, `production.curriculum_education_authorities`, `production.curriculum_frameworks`, `production.curriculum_education_levels`, `production.curriculum_class_grades`, `production.curriculum_subject_classifications`, `production.curriculum_subjects`, `production.curriculum_versions`, `production.curriculum_version_subjects`, `production.curriculum_themes`, `production.curriculum_topics`, `production.curriculum_subtopics`, `production.curriculum_learning_objectives`, `production.curriculum_standards`, `production.curriculum_change_history`
- `production.central_publishers`, `production.central_authors`, `production.central_textbooks`, `production.central_textbook_contributors`, `production.central_textbook_versions`, `production.central_textbook_chapters`, `production.central_textbook_sections`, `production.central_textbook_content_blocks`, `production.central_textbook_objective_mappings`, `production.central_textbook_media_assets`, `production.central_textbook_citations`, `production.central_textbook_editorial_reviews`, `production.central_textbook_coverage_manifests`, `production.central_textbook_generation_jobs`
- `production.shared_service_usage_metrics`
- `production.instance_question_categories`, `production.instance_question_bank_items`, `production.instance_assessment_blueprints`, `production.instance_exam_configurations`, `production.instance_assessment_records`

### Migration `016_central_curriculum_and_textbook_domains.sql`
- Logical Schemas: `central_curriculum`, `central_textbooks`
- `central_curriculum.curriculum_source_documents`, `central_curriculum.curriculum_competencies`
- `central_textbooks.textbook_illustrations`, `central_textbooks.textbook_glossaries`, `central_textbooks.textbook_validation_reports`, `central_textbooks.textbook_revisions`
- Non-destructive extensions to `production.central_textbooks`, `production.central_textbook_chapters`, `production.central_textbook_sections`, `production.central_textbook_generation_jobs` (idempotency keys, `gemini_model`, `prompt_version`, `generation_config`, `generating`/`generated`/`under_review`/`rejected`/`superseded` editorial states).

## 3. Prerequisites

- PostgreSQL 16+ (`pgcrypto` extension enabled)
- Node.js 20+ with repository dependencies installed (`npm install`)
- For `--mode=cloudsql`: `cloud-sql-proxy` v2 installed and IAM `roles/cloudsql.client` authorized
- Strong `CONTROL_PLANE_SECRET` (32+ characters, non-placeholder)

## 4. Required & Optional Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `MIGRATION_DATABASE_URL` | Yes (or `PGHOST`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`) | Privileged migrator connection URL for applying DDL migrations |
| `DATABASE_URL` | Runtime | Restricted non-owner `curriculum_runtime` connection URL used by the app |
| `CONTROL_PLANE_SECRET` | Yes | Used to derive and sync the PostgreSQL HMAC context verification key |
| `GEMINI_API_KEY` | For Gemini generation | Server-side Google Gemini API key (`@google/genai`) |
| `GEMINI_TEXTBOOK_MODEL` | Optional | Default `gemini-4-hydrogen` |
| `GEMINI_TEXTBOOK_TIMEOUT_MS` | Optional | Request timeout in ms (default `45000`) |
| `GEMINI_TEXTBOOK_PROMPT_VERSION` | Optional | Recorded on generated chapters/jobs (default `v2.nerdc-grounded`) |
| `SHARED_SERVICE_ENTITLEMENT_MODE` | Optional | `decoupled` (default when entitlement admin is pending) or `strict` |

## 5. Safe Execution

```bash
chmod +x deploy/deploy-central-curriculum-textbook-databases.sh

# 1. Dry-run first (no schema mutations)
MIGRATION_DATABASE_URL="postgres://migrator:***@127.0.0.1:5432/curriculum_platform?sslmode=disable" \
CONTROL_PLANE_SECRET="your-32-plus-char-secret" \
  ./deploy/deploy-central-curriculum-textbook-databases.sh --mode=direct-postgres --dry-run

# 2. Apply migrations 001-016 and verify all tables, FKs, indexes & forced RLS
MIGRATION_DATABASE_URL="postgres://migrator:***@127.0.0.1:5432/curriculum_platform?sslmode=disable" \
CONTROL_PLANE_SECRET="your-32-plus-char-secret" \
  ./deploy/deploy-central-curriculum-textbook-databases.sh --mode=direct-postgres --apply --seed-nerdc-baseline

# 3. Cloud SQL via Cloud SQL Auth Proxy
CLOUD_SQL_CONNECTION_NAME="project:region:instance" \
PGDATABASE="curriculum_platform" \
PGUSER="postgres" \
PGPASSWORD="***" \
CONTROL_PLANE_SECRET="your-32-plus-char-secret" \
  ./deploy/deploy-central-curriculum-textbook-databases.sh --mode=cloudsql --apply
```

## 6. Troubleshooting

- **Target database mismatch**: Supply `--expected-database=<db_name>` to match your target database cleanly without silent switching.
- **Checksum mismatch**: Never edit already applied SQL files (`001`–`015`); always add new versioned migrations (`017+`).
- **Missing `GEMINI_API_KEY`**: Textbook generation explicitly fails with a structured configuration error when `GEMINI_API_KEY` is missing; set it server-side before triggering generation.
