# School Administration & Identity — Stage 2 implementation status

**Status: incomplete; not production-ready and not fully provisionable.** This report describes the verified work in the Stage 2 branch. It does not claim that the assignment's full acceptance criteria are met.

## Baseline verification

- The session began on a clean, shallow `main` checkout at `079034ee87a66022e6aa4f24a919f46e92d4f6b5` (the merge commit for PR #8).
- The target remote branch exists at `2899791431d8bfa5d73d9507842ea577565ea44b` (`Add school administration foundation`) and contains migrations 001–009, including migration 008 and the prior readiness work. Work was moved to the local `feature/school-administration-identity-stage2` branch at that exact tip before edits; `main` was not changed.
- Migrations 001–009 were present and sorted by the existing numeric migration runner. Their SHA-256 values were checked before changes; no historical migration was edited. A fresh disposable PostgreSQL database successfully applied migrations 001–010 with the runner's checksum tracking.

## Implemented in this increment

- Migration 010 adds a database-verifiable, 120-second HMAC authorization context. RLS policies no longer authorize from `app.tenant_id` or `app.control_plane_admin` alone. The key is stored in a migration-owner-only table and is synchronized from `CONTROL_PLANE_SECRET` by `npm run db:migrate`; readiness fails if the key is absent or the runtime role can access it. Invitation token lookup also verifies a signed context.
- `withTenantTransaction`, `withControlPlaneTransaction`, school login, and invitation acceptance now establish signed transaction-local contexts. Direct GUC-forgery tests use the non-owner runtime role and check tenant, student, class, staff, and control-plane records.
- The production capability registry now uses explicit `not_started`, `implemented`, `configured`, `ready`, `degraded`, and `disabled` states plus readiness evidence. Existing school, student, class, and lifecycle handlers map to their actual route patterns. Database-backed capabilities remain blocked; the template-discovery route also requires platform authentication.
- Readiness verifies that the context key exists and that the runtime role has no table privileges on it. Its report separately exposes capability implementation, template configuration, runtime dependency, and per-instance application readiness; these remain false until their evidence exists. CI configures a synthetic test key and revokes all runtime-role privileges on the key table.
- Migration 009 adds department and staff tables, staff appointments, class sections and teacher links, tenant/school composite relationships, student lifecycle status and history, class-assignment history, explicit frontend-role mappings, granular permission definitions and school roles, and account suspension state. RLS for production students, classes, and new domain records is tenant-scoped; the migration is forward-only.
- `SchoolAdministrationRepository` adds PostgreSQL-backed student registration, paginated/searchable student reads, class creation, admission/activation, class assignment, promotion/internal transfer, external transfer, graduation, withdrawal/reinstatement, and lifecycle history. It enforces database-derived permissions and filters class-scoped teacher reads.
- Student and class-create route handlers use the existing authentication middleware, database-authoritative principal, correlation IDs, and consistent response envelopes. They remain unavailable because their capabilities are not ready. `GET /api/v1/application-templates` remains unavailable and now requires platform authentication; it is not yet a complete discoverability API.
- Account suspension blocks authentication and authorization; a database trigger revokes active sessions.
- The Application Builder configuration shape is shared, validated, normalized, included in idempotency hashing without volatile validation timestamps, and persisted with its supplied configuration version.
- Template metadata and a `GET /api/v1/application-templates` handler were added. The endpoint is blocked by the production capability gate, so template discovery is not operational. The template remains `draft` and provisioning rejects it. School identity is no longer hard-coded as a mandatory selected feature for every application.
- PostgreSQL acceptance coverage now includes role-name mapping, restricted administrative-assistant permissions, two-tenant student isolation, class-scoped reads, lifecycle behavior, account suspension, session revocation, and builder configuration-version persistence.

## Verification

- `npm run lint` (TypeScript typecheck): passed.
- `npm test` with the disposable PostgreSQL runtime configured: **69 passed, 0 failed, 0 skipped**.
- `npm run test:postgres:acceptance`: **3 passed, 0 failed, 0 skipped** against disposable PostgreSQL 16. Runtime and migration-owner roles were separate; the runtime was non-owner, non-superuser, and not `BYPASSRLS`. Tenant and control-plane GUC-forgery attempts were denied.
- Fresh migration application: migrations 001–010 applied in order with checksum tracking. Upgrade compatibility was also exercised by applying 001–009 to a separate disposable database and then applying migration 010 successfully.
- `npm run build:all`: passed for the server and both frontends. Existing large-chunk warnings remain.
- The latest hosted GitHub Actions run was for the pre-remediation branch head `2899791` and failed in `server/tenantTokenService.test.ts`: its token-tampering assertion could accidentally replace a token's final `0` with the same character. The assertion is now deterministic; no hosted run for the remediation commits has been observed, so hosted CI remains unverified.
- No production database, customer records, cloud infrastructure, or live email provider was used.

## Not implemented or not verified

- The full Stage 1 domain remains incomplete. Staff and department tables exist, but staff repositories, staff/department/office APIs, appointments and account-linking flows are not implemented.
- Student admission applications and approvals, class listing/update/section-management APIs, and academic-session history are incomplete.
- The existing invitation service still covers initial school-administrator activation, not the full additional administrator/staff invitation lifecycle. Resend delivery was not tested against staging; delivery must not be reported as operational.
- Email verification, password recovery/change, account reactivation endpoints, membership activation/reactivation endpoints, and comprehensive audit history are not complete.
- Role definitions and explicit legacy-name mappings are present, but complete role/permission administration APIs, school-specific custom roles, scoped role assignment, and the full requested authorization matrix are not implemented.
- Existing administration screens have not been integrated with these APIs; demo/production separation and frontend loading, error, pagination, and permission states are not complete.
- Template metadata exists but its discovery endpoint is gated, and the template remains non-provisionable. Capability-level configuration UI, dependency composition, multi-template composition, and builder-to-provisioning acceptance are not complete. Provisioning persists and validates the current versioned configuration but does not yet provision only the selected template's migrations or activation prerequisites.
- The production capability gate intentionally remains fail-closed. Correct route matching is now present, but database-backed capabilities have only `implemented` status and no operational readiness evidence. Their handlers are not production-available.
- `CONTROL_PLANE_SECRET` must be supplied to the migration-owner migration command and to the application runtime. Key rotation and deployment-specific privilege grants must be coordinated; hosted CI has not yet verified the workflow.
- The acceptance suite does not yet cover the requested staff, complete invitation, API-level cross-tenant matrix, full frontend, restart/recovery, external-transfer authorization, or all provisioning and lifecycle cases.

## Readiness decision

Do not enable or sell the School Administration & Identity template as a production module yet. Do not claim external email delivery, cloud deployment, or the complete Stage 2 acceptance criteria. The next blocking work is completion of the staff, invitation, role-administration, guardian, frontend, and Builder/provisioning flows above, followed by full acceptance, build, and hosted CI verification.
