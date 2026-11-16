# School instance provisioning

## What this workflow creates

The unified Express API persists the school, tenant, academic and application configuration snapshots, commercial agreement, application instance, provisioning operation, deployment request, and administrator invitation outbox in the shared PostgreSQL database. The operation records completion of the database provisioning transaction; the instance remains `ready_for_activation` until its administrator accepts the invitation. Activation creates the canonical `production.users` account and tenant membership transactionally, but does not change the instance to active. This is a logical shared-database record, not a deployed Cloud Run service, dedicated database, GCP project, DNS record, TLS certificate, or storage bucket. No cloud resources are created by this workflow.

Configuration readiness, administrator invitation delivery, and application runtime readiness are separate statuses. Runtime readiness remains pending until a real application-specific health check has been recorded; registration and retry responses do not report success while that check is pending. The initial implementation provisions only `shared_database` architecture. A requested subdomain or custom domain is persisted as `manual_action_required`; it is not represented as provisioned DNS or TLS. Commercial references are stored with payment status `pending`; no payment provider is integrated.

## Database setup

Provision PostgreSQL 15+ and configure the runtime connection as described in [postgresql-foundation.md](./postgresql-foundation.md). Apply the numbered migrations using the controlled migration command; do not make application startup apply schema changes:

```sh
npm run db:migrate:status
npm run db:migrate -- up --dry-run
npm run db:migrate -- up
```

The school schema is added by `005_production_tenant_boundary.sql` and `006_school_instance_provisioning.sql`; `007_durable_school_application_provisioning.sql` adds the versioned application/school configuration, durable operation, commercial agreement, deployment status, and invitation outbox/attempt tables. Migrations are forward-only; restore from a verified backup under an operator-approved recovery plan rather than manually deleting migration history.

Use distinct migration-owner and application-runtime database roles. The runtime role must not own these tables, be a superuser, or have `BYPASSRLS`; grant only schema usage and required DML privileges. The application sets transaction-local tenant context only after verifying a server-issued token and current database membership. Platform provisioning uses a separate server-authorized control-plane context. The RLS policies use application-set PostgreSQL settings; they do not protect against a fully compromised application process or arbitrary SQL execution with the runtime role. Automated disposable-PostgreSQL tenant-isolation tests are required before treating isolation as production-verified.

## Authentication and email configuration

Configure these values through the approved secret manager in each environment; do not commit real values:

* `CONTROL_PLANE_SECRET`: at least 32 characters of high-entropy secret material. The server refuses to sign or verify privileged tokens without it. Token-signing code is server-only; the browser can only retain a token returned by the login API.
* `PLATFORM_ADMIN_CREDENTIALS_JSON`: JSON mapping each authorized platform email to a distinct security key of at least 32 characters, for example `{"operator@example.org":"<unique-random-key>"}`. Platform administrators authenticate through `POST /api/v1/server/auth/login`; school administrator membership never grants platform access.
* `INVITATION_EMAIL_API_KEY`: Resend API key.
* `INVITATION_EMAIL_FROM`: sender identity verified with Resend.
* `APP_URL`: HTTPS origin of the deployed application (HTTP is accepted only outside production).

Provisioning does not accept a school administrator password. It stores a hash of a random one-time invitation token in PostgreSQL's canonical `production.school_admin_invitations` table, queues delivery in `production.invitation_outbox`, and expires the token after 24 hours. The administrator sets a 12–256 character password after possessing the link. Delivery attempts and provider outcomes are persisted. If delivery fails, the same idempotency key safely resumes the operation and retries delivery. The raw invitation token is never included in an API response. Verify provider delivery in staging; configuration presence alone does not establish deliverability. Provisioning can persist while email configuration is absent, but invitation delivery then remains pending and the overall operation is not reported as operational success.

School passwords are hashed with Node.js `scrypt`; successful login creates a 12-hour server-signed session. Protected school routes check the token's tenant and user claims against the active PostgreSQL membership on every request and scope the transaction to that tenant. The first invitation verifies email access by possession of the email link. No external identity provider is currently integrated.

## API contract

All responses use the unified API response envelope with `success`, `data` or a safe `error`/`code`, `correlationId`, and timestamp. Provisioning and protected school operations require PostgreSQL and the corresponding credentials described above.

| Endpoint | Authorization | Purpose |
| --- | --- | --- |
| `POST /api/v1/server/auth/login` | Public; configured platform email and security key required | Issue a platform administrator session. |
| `POST /api/v1/schools/provision` | Platform administrator bearer token; `Idempotency-Key` header | Validate and transactionally create school, configuration, instance, and invitation records; send the administrator invitation. |
| `GET /api/v1/schools/provision/:instanceId` | Platform administrator bearer token | Read the persisted provisioning and activation status. |
| `POST /api/v1/schools/provision/:operationId/retry` | Platform administrator bearer token | Resume an interrupted operation and/or retry pending invitation delivery; does not report overall success while runtime health is pending. |
| `POST /api/v1/schools/activation` | Public; unexpired one-time invitation token | Create/associate the real local user, create `tenant_admin` membership, approve the tenant, and activate the instance transactionally. |
| `POST /api/v1/schools/auth/login` | Public; school UUID, verified account email, and password | Authenticate an active school administrator. |
| `GET /api/v1/schools/me` | Active school administrator bearer token | Read only the caller's school and application instance. |
| `GET /api/v1/schools/me/config` | Active school administrator bearer token | Read the caller's academic and locale configuration. |
| `PUT /api/v1/schools/me/config` | Active school administrator bearer token | Validate and transactionally update the caller's school configuration. |
| `GET /api/v1/schools/me/membership` | Active school administrator bearer token | Read the caller's verified tenant membership and role. |

`SchoolProvisioningRequest` and response contracts are in `packages/shared-types/src/apiContracts.ts`. The response separates configuration readiness, runtime readiness, invitation delivery, administrator activation, and deployment status. It never returns a password, invitation token, bearer token, or internal database configuration. Runtime readiness is `pending` until an application-specific health-check integration is available and records a real successful check.

## Staging procedure and current limits

1. Provision an isolated staging PostgreSQL database and separate migration/runtime roles; verify backups and recovery.
2. Inject the staging database URL, a dedicated control-plane secret, per-operator platform keys, a verified Resend sender/key, and the HTTPS staging `APP_URL`.
3. Review the migration dry-run and apply migrations from the controlled migration job.
4. Confirm `/api/v1/health` reports `ready`, then run `npm run test:postgres:acceptance` (also set `POSTGRES_ACCEPTANCE=1` and `MIGRATION_DATABASE_URL`) with `TEST_DATABASE_URL` pointing to the disposable database and `DATABASE_TEST_DISPOSABLE=1`. The acceptance test requires a non-owner runtime role without superuser or `BYPASSRLS`.
5. In staging, verify actual invitation delivery and cross-tenant denial. The automated test verifies isolated tenant reads/writes, invitation token rotation and one-time activation, idempotent retries, configuration persistence across runtime restart, and readiness with invitation delivery unconfigured.
6. Only after these checks, approve a separately reviewed staging deployment. This repository change does not deploy or alter production infrastructure.

The application-specific runtime health-check adapter, Resend live-delivery verification, payment verification, custom-domain DNS/TLS provisioning, and cloud infrastructure provisioning remain external integrations. The automated PostgreSQL acceptance test runs against a disposable database; it does not prove a live email provider or deployed school runtime. The legacy universal onboarding component and JSON-backed managers remain in the repository but are no longer the active Curriculum Flow production onboarding entry point; the stage-one wizard uses the PostgreSQL provisioning APIs. No production deployment or live customer data modification is performed by this repository workflow.
