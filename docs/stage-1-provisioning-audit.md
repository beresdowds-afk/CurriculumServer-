# Stage 1 school provisioning audit

## Repository baseline and existing architecture

- Starting `main` commit: `ab62271f886dad6fe8164b349ce26ec96a542b6f`.
- Implementation branch: `feature/stage-1-real-school-instance-provisioning`.
- Production persistence already used the shared PostgreSQL database and the `production` schema for tenants, schools, users, memberships, application instances, school configuration, and invitations. Migrations 005 and 006 establish this boundary and its RLS policies.
- The canonical school-administrator identity is `production.users`, with tenant membership in `production.memberships`; `curriculum_flow.users` is a separate legacy operational table.
- The pre-existing generic onboarding, payment, lifecycle, and infrastructure managers include paths that are not suitable as authoritative production provisioning. The Stage 1 production wizard now calls the durable school provisioning API; those legacy managers are not used to record Stage 1 tenant state.
- The application registry already provides application/feature metadata and dependency declarations. Stage 1 validates selected features against canonical IDs and only permits the shared PostgreSQL architecture.

## Implementation boundary

Migration `007_durable_school_application_provisioning.sql` adds the versioned application/school configuration snapshots, durable provisioning-operation state, commercial references, deployment/health-check state, and invitation outbox/attempt history. Provisioning persists the tenant, school, configuration, instance, operation, and invitation records transactionally; its idempotency key and operation status support safe resume. Invitation tokens are hashed, rotate on redelivery, and may be accepted once to create the canonical user and tenant membership.

Platform APIs require a verified platform-administrator session and database readiness. Tenant routes derive their scope from the verified server-side principal and use transaction-local RLS context. The onboarding UI reads and retries persisted state, and displays configuration readiness, runtime readiness, invitation delivery, administrator activation, and deployment status separately. Runtime readiness remains pending until an application-specific health check has been recorded; a persisted database instance is not represented as a deployed or operational school application.

## Verification completed

- `npm run lint`: passed.
- `npm test` with `DATABASE_TEST_DISPOSABLE=1` and a non-owner PostgreSQL runtime role: 44 passed, 0 failed, 0 skipped. The suite includes registration persistence, idempotency/concurrent retry, invitation retry and one-time activation, configuration survival across a runtime restart, readiness with email delivery unconfigured, and two-tenant RLS read/write isolation.
- `npm run db:migrate:status`: migrations 001–007 applied and checksums current on the disposable database.
- Migration compatibility test: migrations 001–006 were applied, an existing `dedicated_database` instance was inserted, and migration 007 preserved that architecture and completed successfully.
- `npm run build:all`: passed for the server and both frontends. Vite emitted existing large-chunk warnings.
- `git diff --check`: passed.
- A GitHub-hosted CI run has not yet occurred; the new workflow will execute typecheck, migration, PostgreSQL acceptance tests, unit tests, and all production builds on the pull request.

## Remaining integrations and limits

- No application-specific runtime deployment or health-check adapter is available, so application runtime readiness cannot yet transition to verified.
- Resend delivery, payment verification, custom-domain DNS/TLS, cloud resources, and application-specific storage provisioning have not been tested or implemented by this stage.
- Shared PostgreSQL is the only architecture provisioned. Other architectures are retained for existing records but are not accepted by the new registration API.
- The integration tests use disposable local PostgreSQL only. No production deployment or live customer data modification was performed.
