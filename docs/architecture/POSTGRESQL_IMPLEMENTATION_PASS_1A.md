# PostgreSQL implementation pass 1A

## Repository-grounded inventory

The inspected checkout was `main` at `c52c609831b1aeab834acbd42c6475c13a70f9f2`. It had one SQL migration (`001_initial_control_plane.sql`), no PostgreSQL driver, no pool/repository/transaction layer, and no applied-migration runner. The existing migration was preserved; `002_production_tenant_boundary.sql` is forward-only. No data migration or database migration execution against a production database was performed.

| Component | Current persistence | Intended purpose | Required action/status |
|---|---|---|---|
| Curriculum Flow mock users, schools, students, classes and academic records | `src/data/curriculumFlowData.ts` and other frontend mock modules | Demonstration | Keep in the frontend demo; no database import |
| Sample onboarding organizations and instances | Initial records in `server/customerOnboardingManager.ts`; prior JSON path `data/universal_instances.json` | Demonstration only | Reclassified as demo; default file moved to `data/demo/universal_instances.json`; served only by opt-in `/api/demo/instances` |
| Other checked-in JSON under `data/` | Mix of mock tenants/students/attendance, demo instances, application configuration, curriculum artifacts, audit and backup artifacts | Demo, reference content, tests, and operational artifacts; not all tenant records | No bulk migration; production-facing tenant/control-plane operations blocked pending PostgreSQL integration |
| Customer and organisation records | Embedded sample onboarding records; no PostgreSQL customer/organisation service | Future production | Not implemented; onboarding API persistence blocked |
| Tenant registration and memberships | `production.registration_requests` and `production.memberships` schema foundations; no PostgreSQL service; token context is custom HMAC data and does not establish a trusted identity provider or membership | Future production | Service and trusted identity adapter not implemented; fail closed |
| Tenant instances and architecture/lifecycle configuration | `instanceLifecycleManager` and configuration managers use JSON/in-memory state | Future production | PostgreSQL instance repository/schema foundation added; production API handlers remain blocked |
| Provisioning requests, jobs/attempts, approvals and PIAM | `customerOnboardingManager`, lifecycle managers and simulated in-memory execution paths; new schema includes request approvals, provisioning jobs and instance approvals | Production control plane, future | Schema foundation only; PIAM and API operations remain blocked; no provisioning enabled |
| Audit trails, payment/idempotency and verification evidence | `serverAuditLedger`, payment manager and filesystem evidence | Production control plane, future | Not PostgreSQL-backed; business API operations blocked; legacy denial/audit events may still write to the file ledger |
| School, student, class and academic records | `serverSchoolManager` and `serverAcademicPersistence` use JSON; frontend also has mock data; new schema has tenant-scoped schools, students, classes and academic records | Demo now; PostgreSQL for future onboarded customers | Schema only; application services not integrated; tenant-data handlers remain blocked |
| Attendance, assessment and transfer records | JSON-backed or in-memory services and frontend fixtures | Demo now; PostgreSQL for future onboarded customers | Not integrated; tenant-data handlers remain blocked |
| Homepage configuration, cost governance and durable backup metadata | Homepage/cost managers and backup metadata use JSON; backup payloads are files | Future production or artifact storage | Not PostgreSQL-backed (binary artifacts remain file/object-storage concerns); API operations blocked |
| Curriculum sources, reviews, jobs and evidence | `serverNerdcUpdateManager` stores JSON manifests and files | Platform reference-content administration | Not tenant records; mutation/read APIs under `/api/v1` are blocked; legacy `/api/nerdc` reads remain platform content only |
| Storage/database configuration | `StorageAndDatabaseManager` in memory; credential vault is configuration-backed | Future production | Not PostgreSQL-backed; protected APIs remain blocked |
| Tests | Temporary JSON fixtures and in-memory test doubles | Test-only | Keep deterministic and isolated; PostgreSQL test uses synthetic tenants in a disposable database |

The reviewed server-side JSON-backed managers include customer onboarding, school management/governance, academic persistence, instance lifecycle, inter-school transfers, homepage configuration/versioning, cost governance, payment/idempotency, audit ledger, backup metadata, and curriculum update records. Persistent manager singletons are now lazy, so importing the application no longer seeds or reads these files before an API operation. Some files are content snapshots, backup artifacts, or test evidence—not customer database exports—and were not treated as migration input.

## Enforced boundary and current blockers

- Production tenant rows are defined in a dedicated `production` schema, separate from the legacy `control_plane` and `curriculum_flow` schemas. The migration contains no fixture import or seed statements. Tenant-owned rows use tenant-scoped foreign keys and forced RLS; production instances have a database constraint that only permits `record_origin = 'production'`.
- The existing onboarding sample JSON is no longer the default file used by the manager. `/api/demo/instances` exposes it only when `DEMONSTRATION_MODE=true`, labels the response `demonstration`, and lazily loads the manager. All `/api/v1/*` APIs except liveness/readiness, Flow status, and immutable public curriculum reference reads return `503 PRODUCTION_PERSISTENCE_UNAVAILABLE`. This prevents legacy handlers—including previously unguarded ones—from reading or writing JSON as production operations. The isolated demo endpoint is outside that production API namespace.
- This is a containment boundary, not a claim that onboarding, authentication, or the remaining services are complete. The tenant token implementation does not validate an external issuer/audience or authoritative tenant membership. Tenant-sensitive services therefore remain blocked even when a PostgreSQL URL is configured.
- The new repository sets `app.tenant_id` transaction-locally, accepts only UUID tenant IDs, verifies that the tenant is approved, and rejects superuser, `BYPASSRLS`, and production-table-owner roles. It never falls back to JSON. It is not yet wired to customer onboarding, academic, school, audit, payment, job, or provisioning service execution paths.
- Liveness (`/api/health`) is separate from `/api/v1/readiness`. The latter remains `503 not_ready` until tenant authorization and onboarding readiness are implemented; successful PostgreSQL connectivity alone does not change that.

## Migrations and controlled operation

`npm run db:migrate:status` and `npm run db:migrate` are explicit commands. They require `MIGRATION_DATABASE_URL`, which must use a dedicated migration role. Normal application startup does not invoke migrations. The runtime pool uses the separate `DATABASE_URL`; its role must not own production tables, be a superuser, or have `BYPASSRLS`. Do not grant the runtime role tenant creation or administrative approval privileges.

Controlled deployment sequence: provision PostgreSQL and separate migration/runtime roles out of band; inspect pending migrations with the status command; apply forward-only migrations through the controlled migration command; grant only required runtime privileges; verify RLS using a disposable test database; then deploy application code. This repository change did not provision infrastructure, apply a production migration, or deploy.

PostgreSQL integration test environment:

- `MIGRATION_DATABASE_URL`: disposable database URL for the migration/admin role.
- `TEST_DATABASE_URL`: same disposable database using the non-owner `curriculum_runtime` role (without superuser or `BYPASSRLS`).
- The role must be granted `USAGE` on `production`, `SELECT` on `production.tenants`, and `SELECT, INSERT, UPDATE, DELETE` on `production.instances`. Do not use a production database.

Run `npm run test:postgres` only with those disposable test URLs. If they are absent, the integration test is skipped and does not constitute a passing PostgreSQL verification.
