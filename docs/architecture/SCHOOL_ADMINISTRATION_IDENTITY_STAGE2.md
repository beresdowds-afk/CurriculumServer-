# School Administration & Identity — Stage 2 implementation status

**Status: incomplete; not production-ready and not fully provisionable.** This report describes the verified work in the Stage 2 branch. It does not claim that the assignment's full acceptance criteria are met.

## Baseline verification

- Latest repository baseline before implementation: `b1e92096e4e328c1e14277d0ca667e2657ab8e4b` (`main`).
- Actual School Administration & Identity Stage 1 commit: `407037d0957347aa73d4cbd2382db5edb5cd9317`.
- The Stage 1 report at `docs/architecture/SCHOOL_ADMINISTRATION_IDENTITY_STAGE1.md` says the branch contributes only a draft manifest and contract. It has no administration-domain migration or repositories, and is explicitly not production-ready. No PR for that Stage 1 commit was found.
- The Stage 1 tests cover only draft manifest behavior. They passed as part of the repository test suite.
- Work continues on `feature/school-administration-identity-stage2`, based on latest `main`, with the Stage 1 draft commit carried forward. No changes were made on `main`.

## Implemented in this increment

- Migration 009 adds department and staff tables, staff appointments, class sections and teacher links, tenant/school composite relationships, student lifecycle status and history, class-assignment history, explicit frontend-role mappings, granular permission definitions and school roles, and account suspension state. RLS for production students, classes, and new domain records is tenant-scoped; the migration is forward-only.
- `SchoolAdministrationRepository` adds PostgreSQL-backed student registration, paginated/searchable student reads, class creation, admission/activation, class assignment, promotion/internal transfer, external transfer, graduation, withdrawal/reinstatement, and lifecycle history. It enforces database-derived permissions and filters class-scoped teacher reads.
- Student and class-create route handlers use the existing authentication middleware, database-authoritative principal, correlation IDs, and consistent response envelopes. They are **not currently reachable**: the global `/api/v1` capability gate has no matching enabled registrations for these route paths. `GET /api/v1/application-templates` is also blocked by the gate. These handlers and registry data therefore do not constitute operational APIs or template discovery.
- Account suspension blocks authentication and authorization; a database trigger revokes active sessions.
- The Application Builder configuration shape is shared, validated, normalized, included in idempotency hashing without volatile validation timestamps, and persisted with its supplied configuration version.
- Template metadata and a `GET /api/v1/application-templates` handler were added. The endpoint is blocked by the production capability gate, so template discovery is not operational. The template remains `draft` and provisioning rejects it. School identity is no longer hard-coded as a mandatory selected feature for every application.
- PostgreSQL acceptance coverage now includes role-name mapping, restricted administrative-assistant permissions, two-tenant student isolation, class-scoped reads, lifecycle behavior, account suspension, session revocation, and builder configuration-version persistence.

## Verification

- `npm run lint`: passed.
- `npm test` with the disposable PostgreSQL runtime configured: **67 passed, 0 failed, 0 skipped**.
- `npm run test:postgres:acceptance`: **3 passed, 0 failed, 0 skipped**, against local disposable PostgreSQL 16 using separate migration-owner and non-owner, non-superuser, non-BYPASSRLS runtime roles. The new acceptance case provisions two synthetic tenants and checks isolation and class-scoped access.
- `npm run build:all`: passed for the server and both frontends. Existing large-chunk warnings remain.
- No production database, customer records, cloud infrastructure, or live email provider was used.

## Not implemented or not verified

- The full Stage 1 domain remains incomplete. Staff and department tables exist, but staff repositories, staff/department/office APIs, appointments and account-linking flows are not implemented.
- Student admission applications and approvals, class listing/update/section-management APIs, and academic-session history are incomplete.
- The existing invitation service still covers initial school-administrator activation, not the full additional administrator/staff invitation lifecycle. Resend delivery was not tested against staging; delivery must not be reported as operational.
- Email verification, password recovery/change, account reactivation endpoints, membership activation/reactivation endpoints, and comprehensive audit history are not complete.
- Role definitions and explicit legacy-name mappings are present, but complete role/permission administration APIs, school-specific custom roles, scoped role assignment, and the full requested authorization matrix are not implemented.
- Existing administration screens have not been integrated with these APIs; demo/production separation and frontend loading, error, pagination, and permission states are not complete.
- Template metadata exists but its discovery endpoint is gated, and the template remains non-provisionable. Capability-level configuration UI, dependency composition, multi-template composition, and builder-to-provisioning acceptance are not complete. Provisioning persists and validates the current versioned configuration but does not yet provision only the selected template's migrations or activation prerequisites.
- The production capability gate intentionally remains fail-closed. The new student, lifecycle, class, and template-discovery handlers are not registered as enabled capabilities, and the student route patterns in the registry do not match the `/schools/me/...` handlers. No Stage 2 endpoint should be represented as operational until route registration, acceptance evidence, and the underlying security blockers are resolved.
- Existing policies for provisioning/control-plane records still trust the caller-settable `app.control_plane_admin` setting, and tenant context uses a caller-settable `app.tenant_id`. Separate runtime and control-plane database identities and a database-verifiable tenant context are still required before treating RLS as a security boundary against arbitrary SQL.
- The acceptance suite does not yet cover the requested staff, complete invitation, API-level cross-tenant matrix, full frontend, restart/recovery, external-transfer authorization, or all provisioning and lifecycle cases.

## Readiness decision

Do not enable or sell the School Administration & Identity template as a production module yet. Do not claim external email delivery, cloud deployment, or the complete Stage 2 acceptance criteria. The next blocking work is the database identity/context security boundary and completion of the staff, invitation, role-administration, frontend, and builder/provisioning flows above.
