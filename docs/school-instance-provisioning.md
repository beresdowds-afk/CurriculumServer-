# School instance provisioning

## What this workflow creates

The unified Express API persists the school, tenant, academic configuration, application-instance record, idempotency record, and administrator invitation in the shared PostgreSQL database. The application instance is marked `provisioning` until the invited administrator activates their account; membership creation, tenant approval, and instance activation then commit in one transaction. This is a logical shared-database instance, not a deployed Cloud Run service, dedicated database, GCP project, or storage bucket. No cloud resources are created by this workflow.

The application identifier is stored independently from the tenant and deployment architecture, and the instance schema allows shared-database, dedicated-database, and dedicated-infrastructure modes. The initial registration interface selects Curriculum Flow; `feat_exam_management` is recorded as an enabled capability, but examination functionality is not implemented here. Because this workflow does not deploy an application-specific runtime, its application version remains unset and its configuration version is recorded as `1`.

## Database setup

Provision PostgreSQL 15+ and configure the runtime connection as described in [postgresql-foundation.md](./postgresql-foundation.md). Apply the numbered migrations using the controlled migration command; do not make application startup apply schema changes:

```sh
npm run db:migrate:status
npm run db:migrate -- up --dry-run
npm run db:migrate -- up
```

The school schema is added by `005_production_tenant_boundary.sql` and `006_school_instance_provisioning.sql`. Migration 006 adds immutable UUID tenant identifiers, globally unique school and instance IDs, school identity/configuration, account memberships, application instances, idempotency records, invitations, foreign keys, indexes, checks, and tenant RLS policies. Migrations are forward-only; restore from a verified backup under an operator-approved recovery plan rather than manually deleting migration history.

Use distinct migration-owner and application-runtime database roles. The runtime role must not own these tables, be a superuser, or have `BYPASSRLS`; grant only schema usage and required DML privileges. The application sets transaction-local tenant context only after verifying a server-issued token and current database membership. Platform provisioning uses a separate server-authorized control-plane context. The RLS policies use application-set PostgreSQL settings; they do not protect against a fully compromised application process or arbitrary SQL execution with the runtime role. Automated disposable-PostgreSQL tenant-isolation tests are required before treating isolation as production-verified.

## Authentication and email configuration

Configure these values through the approved secret manager in each environment; do not commit real values:

* `CONTROL_PLANE_SECRET`: at least 32 characters of high-entropy secret material. The server refuses to sign or verify privileged tokens without it. Token-signing code is server-only; the browser can only retain a token returned by the login API.
* `PLATFORM_ADMIN_CREDENTIALS_JSON`: JSON mapping each authorized platform email to a distinct security key of at least 32 characters, for example `{"operator@example.org":"<unique-random-key>"}`. Platform administrators authenticate through `POST /api/v1/server/auth/login`; school administrator membership never grants platform access.
* `INVITATION_EMAIL_API_KEY`: Resend API key.
* `INVITATION_EMAIL_FROM`: sender identity verified with Resend.
* `APP_URL`: HTTPS origin of the deployed application (HTTP is accepted only outside production).

Provisioning does not accept a school administrator password. It stores a hash of a random one-time invitation token, sends the invitation using Resend, and expires it after 24 hours. The administrator sets a 12–256 character password after possessing the link. If delivery fails, the school remains in `provisioning`, the invitation delivery failure is recorded, and the same `Idempotency-Key` can safely retry delivery. The raw invitation token is never included in the provisioning response. Verify provider delivery in staging; configuration presence alone does not establish deliverability.

School passwords are hashed with Node.js `scrypt`; successful login creates a 12-hour server-signed session. Protected school routes check the token's tenant and user claims against the active PostgreSQL membership on every request and scope the transaction to that tenant. The first invitation verifies email access by possession of the email link. No external identity provider is currently integrated.

## API contract

All responses use the unified API response envelope with `success`, `data` or a safe `error`/`code`, `correlationId`, and timestamp. Provisioning and protected school operations require PostgreSQL and the corresponding credentials described above.

| Endpoint | Authorization | Purpose |
| --- | --- | --- |
| `POST /api/v1/server/auth/login` | Public; configured platform email and security key required | Issue a platform administrator session. |
| `POST /api/v1/schools/provision` | Platform administrator bearer token; `Idempotency-Key` header | Validate and transactionally create school, configuration, instance, and invitation records; send the administrator invitation. |
| `GET /api/v1/schools/provision/:instanceId` | Platform administrator bearer token | Read the persisted provisioning and activation status. |
| `POST /api/v1/schools/activation` | Public; unexpired one-time invitation token | Create/associate the real local user, create `tenant_admin` membership, approve the tenant, and activate the instance transactionally. |
| `POST /api/v1/schools/auth/login` | Public; school UUID, verified account email, and password | Authenticate an active school administrator. |
| `GET /api/v1/schools/me` | Active school administrator bearer token | Read only the caller's school and application instance. |
| `GET /api/v1/schools/me/config` | Active school administrator bearer token | Read the caller's academic and locale configuration. |
| `PUT /api/v1/schools/me/config` | Active school administrator bearer token | Validate and transactionally update the caller's school configuration. |
| `GET /api/v1/schools/me/membership` | Active school administrator bearer token | Read the caller's verified tenant membership and role. |

`SchoolProvisioningRequest` and response contracts are in `packages/shared-types/src/apiContracts.ts`. Provisioning returns school, tenant, and instance identifiers, the persisted status, application identifier, administrator activation status, and timestamp. It never returns a password, invitation token, bearer token, or internal database configuration.

## Staging procedure and current limits

1. Provision an isolated staging PostgreSQL database and separate migration/runtime roles; verify backups and recovery.
2. Inject the staging database URL, a dedicated control-plane secret, per-operator platform keys, a verified Resend sender/key, and the HTTPS staging `APP_URL`.
3. Review the migration dry-run and apply migrations from the controlled migration job.
4. Confirm `/api/v1/health` reports `ready`, and run the disposable PostgreSQL integration tests against this isolated database (`TEST_DATABASE_URL` and `DATABASE_TEST_DISPOSABLE=1`).
5. Register two test schools through the frontend, verify both invitation deliveries, activate both administrators, and verify cross-tenant reads/writes are denied. Restart the backend and repeat persisted school/configuration/membership reads.
6. Only after these checks, approve a separately reviewed staging deployment. This repository change does not deploy or alter production infrastructure.

The current environment has not applied the migrations, verified a PostgreSQL-backed end-to-end run, or delivered a real Resend invitation. The school application runtime and GCP provisioning are not created by this feature; the active instance status means the shared-database records and administrator membership were committed, not that cloud infrastructure was deployed. Existing JSON-backed lifecycle/onboarding managers and legacy school application APIs remain outside this migration; those legacy APIs are fail-closed and must not be treated as this provisioning path.
