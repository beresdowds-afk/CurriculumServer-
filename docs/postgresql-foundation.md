# PostgreSQL application foundation

## Status and scope

The server-side PostgreSQL driver, configuration validation, pool, transactional repository primitives, versioned migration runner, tenant RLS policies, and readiness checks are implemented in application code. They do not provision a database or make this application connected: a successful database connection and migration run must be verified in the target environment.

The root `server.ts` health reporting is truthful, storage/database and student reads no longer expose fixture records, and those tenant-sensitive routes fail closed. The PostgreSQL repository operations are tested with injected principals, but are deliberately not reachable from the current application authentication middleware. The existing HMAC token issuer accepts caller-supplied tenant/role claims and the school login path uses fixture users, so these mechanisms cannot establish a trusted tenant identity for RLS. Readiness reports the database/RLS state separately and remains not ready until an approved trusted identity verifier is integrated. Resource provisioning, payment verification, trusted MFA, and PIAM remain unavailable. Existing onboarding, lifecycle, audit, academic, and other JSON-backed managers have not all been migrated; those paths are not made PostgreSQL-ready by this foundation and must be moved behind repositories before they can be treated as durable platform state.

## Database and connection settings

PostgreSQL 15 or later is the supported minimum. No additional extension is required; `gen_random_uuid()` is built into PostgreSQL 13 and later. The intended database name is `curriculum_platform`, with `control_plane` and `curriculum_flow` schemas. The implementation is not GCP-specific and supports an approved external PostgreSQL service.

Set either:

```text
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/curriculum_platform
```

or all of `PGHOST`, `PGPORT` (optional; defaults to `5432`), `PGDATABASE`, `PGUSER`, and `PGPASSWORD`. Do not set both forms together. `PGSSLMODE` accepts `verify-full` (default), `verify-ca`, `require`, or `disable`; production TCP connections reject `disable`. A Unix-domain socket can use `disable` when TLS is terminated by an approved local connector/proxy. Credentials must be injected through a local ignored `.env` file or the deployment platform's approved secret mechanism; never place real credentials in source, build arguments, logs, or health responses.

The pool is bounded to 10 connections and uses a 5-second connect timeout, 30-second idle timeout, and 15-second query/statement timeout. Connection errors and repository failures expose only categorized, secret-free messages. Pool shutdown is tied to server `SIGTERM` and `SIGINT`.

## Local development and tests

An operator may use a disposable local PostgreSQL 16 instance, for example:

```sh
docker run --name curriculum-postgres-dev \
  -e POSTGRES_DB=curriculum_platform \
  -e POSTGRES_USER=curriculum_migrator \
  -e POSTGRES_PASSWORD='<local-only-secret>' \
  -p 5432:5432 postgres:16
```

Populate a local `.env` with the explicit connection variables and `PGSSLMODE=disable`; do not commit that file. For isolated persistence/RLS tests, provision a separate disposable test database, apply the migrations, and configure `TEST_DATABASE_URL` plus `DATABASE_TEST_DISPOSABLE=1`. The integration test writes and deletes only records carrying random test tenant identifiers. It is skipped unless both safeguards are explicitly set. Never point it at production or a shared database.

## Controlled migrations

Migrations are SQL files under `src/db/migrations`, discovered by numeric filename prefix and applied in ascending order. `001_initial_control_plane.sql` is preserved; `002_durable_control_plane.sql` adds the lifecycle model and RLS, `003_tenant_relationship_integrity.sql` constrains relational tenant ownership, and `004_historical_record_provenance.sql` labels pre-existing jobs/users/students unverified. The runner stores version, checksum, start/execution time, duration, and `running`/`applied`/`failed` status in `control_plane.schema_migrations`, rejects edits to applied migration contents, and serializes runners with a PostgreSQL advisory lock. Each migration and its success record are transactional. Failed migrations roll back and are separately recorded as failed when the database remains available.

Run only from an operator-approved, controlled migration job or maintenance process, not from normal application startup or independently in each Cloud Run instance:

```sh
npm run db:migrate:status
npm run db:migrate -- up --dry-run
npm run db:migrate -- up
```

The status and dry-run commands do not execute migration SQL. Migrations are forward-only; there is no automatic down migration or destructive cleanup. For a failed migration, retain the failure record, inspect the sanitized migration name and database-side diagnostics, confirm transactional rollback, correct the cause, and re-run the controlled migration command. If a migration has already applied, do not edit it: prepare and review a new forward migration. Recovery from data damage requires an operator-approved restore from a verified backup and a documented recovery plan; backup/restore automation is not implemented here.

## Database identities and tenant security

Use separate identities:

* **Migration/owner identity:** owns the schemas and tables, can create/alter schema objects, and applies migrations. It is for the controlled migration process only.
* **Application runtime identity:** is not a superuser, schema/table owner, or `BYPASSRLS` role. Grant only the required schema usage, table DML, and sequence privileges. It must not be used by the migration process.
* **Privileged control-plane operations:** require an explicit server-side control-plane authorization. The transaction helper uses a transaction-local control-plane context; it is not exposed as a client option or inferred from browser-provided tenant identifiers. No application route currently invokes this helper because the existing identity mechanisms are not trusted.
* **Tenant application operations:** require a trusted server-side principal and set `app.tenant_id` with transaction-local `set_config`. The RLS policies default deny when that context is absent. Tenant context is reset at transaction end, including rollback paths. Current request middleware does not attach such a principal; database-backed tenant endpoints return unavailable rather than trusting client-supplied identity or current fixture-based tokens.

`FORCE ROW LEVEL SECURITY` is enabled on tenant-owned tables. The current token verifier does not establish a trusted tenant identity, MFA, or PIAM; those prerequisites remain unavailable and tenant-scoped database operations and provisioning are blocked. Database owner credentials must never be used for ordinary tenant queries.

## Cloud Run and Cloud SQL compatibility

No Cloud Run service, Cloud SQL instance, IAM role, VPC, secret, billing setting, or deployment was changed. A Cloud Run deployment must supply the application runtime credentials through an approved secret-injection mechanism and provide network connectivity to the approved PostgreSQL service.

For Cloud SQL, an operator may select a Cloud SQL Auth Proxy/connector Unix socket or private-IP connectivity with the required Serverless VPC Access/private networking. This repository does not configure or install a Cloud SQL connector, grant IAM database authentication, attach a VPC, or provision an instance. Direct TCP TLS must validate the server certificate; do not disable certificate checks or use `rejectUnauthorized: false`. Confirm the selected Cloud SQL connectivity option supports the configured Node `pg` connection settings before deployment.

The repository's existing Cloud Run frontend containers serve static assets and their `/healthz` route reports process liveness only. They are not changed by this application foundation and do not establish that the database-backed root API has been deployed.

## Backups and recovery

This change does not configure backups, point-in-time recovery, encryption keys, replication, retention, or restore testing. An operator must define and verify database backups and recovery objectives before production use. Backup status must not be inferred from resource configuration rows or historical fixtures.
