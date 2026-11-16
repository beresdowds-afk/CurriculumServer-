# Stage 2 Readiness — Architectural Blocker Remediation Report

Branch: `feature/stage-2-readiness-remediation` (from `main` @ f6fadca). Not merged. Nothing deployed.

## Stage 1 dependency state (verified by inspection)

The "Stage 1" present on main is **school instance provisioning** (migrations 001–007,
`docs/stage-1-provisioning-audit.md`). The School Administration & Identity Stage 1 domain work is **absent**:

| Item | State |
| --- | --- |
| Student/class/academic tables | Exist in 005; **no repositories** |
| Student and staff repositories | Absent |
| Student lifecycle services | Absent |
| Role/permission foundation | Absent before this work; foundation added in 008 (reference data only, no domain use) |
| Versioned School Admin template manifest | Absent; only a minimal supported-template catalogue was added |
| Shared configuration contracts | Absent; added (`applicationInstanceConfiguration.ts`) |
| Stage 1 integration tests | Provisioning only |

Stage 2 requires from Stage 1: student/staff/class repositories, lifecycle services, the template
manifest, and domain integration tests. None were invented here.

## Findings

* No duplicate control-plane transaction helper exists; `withControlPlaneTransaction` in `server/db/tenantContext.ts` is the single one.
* `test:postgres` exists; the real gap was silent skipping and docs. Reconciled (see below).
* Conflicting feature ids live in `src/services/customerOnboardingClient.ts`; alias map added, legacy client not rewritten.

## Implemented

| Area | Files |
| --- | --- |
| Migration 008 | `src/db/migrations/008_identity_authorization_foundation.sql` |
| Authorization | `server/authorization/{permissions,authorizedPrincipal,authorizationRepository,middleware}.ts` |
| Capability gate | `server/capabilities/productionCapabilityRegistry.ts`, `server.ts` |
| Lifecycle | `server/db/applicationLifecycle.ts`, `server/db/schoolProvisioningRepository.ts` |
| Config contract | `src/data/applicationInstanceConfiguration.ts`, `src/data/applicationRegistryData.ts`, `server/schoolProvisioning.ts` |
| Invitation outbox | 008 + `schoolProvisioningRepository.ts` |
| Session claim | `server/tenantTokenService.ts`, `src/services/tenantSecurityContext.ts` |
| Readiness | `server/db/readiness.ts` (per-capability `capabilities` object) |
| Test tooling / CI | `scripts/postgres-acceptance.ts`, `package.json`, `.github/workflows/ci.yml`, `server/db/testSupport.ts` |
| Docs | `docs/architecture/identity-and-authorization.md`, this report, three `test:postgres` doc fixes |
| Tests | `server/authorization/middleware.test.ts`, `server/capabilities/productionCapabilityRegistry.test.ts`, `server/db/applicationLifecycle.test.ts`, `server/db/authorization.integration.test.ts`, updated `postgres.integration.test.ts`, `migrations.test.ts` |

## Verified (local, disposable PostgreSQL 16, non-owner role)

* `npx tsc --noEmit`: clean.
* Full `npm test` with PostgreSQL: see final results in the hand-off message.
* `npm run test:postgres:acceptance`: refuses without opt-in, fails on unreachable DB, passes with 0 skips.

## Not verified / outstanding

* Hosted GitHub Actions CI has not run for these changes.
* No live Cloud SQL, Resend delivery, or production infrastructure was touched or verified.
* `activateApplication` has no health-check adapter and no route; application activation is unreachable by design until one exists.
* Stage 2 capabilities remain `not_started`; their `/api/v1` routes still return 503.
* Legacy onboarding wizard/client still use legacy feature keys; migration to Builder-supplied configuration is prepared only.
* `memberships.role` legacy column/CHECK remains until a later forward-only migration.
* Guardian/staff/student identity FKs are documented, not created.
* Acceptance still sets `tenants.status='approved'` (pre-existing conflation).
* Readiness `capabilities` is covered by the existing readiness integration assertions; dedicated per-field unit tests are limited.
