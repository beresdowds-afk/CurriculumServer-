# School Administration & Identity — Stage 2 implementation status

**Status: incomplete; not production-ready and not fully provisionable.** This report describes the verified work in the Stage 2 branch. It does not claim that the assignment's full acceptance criteria are met.

## Baseline verification

- Current `main` is `c27c604eb7b4805adda100f86aaa98c57862424c`, merge PR #9. The feature branch tip `454193ab500258ec0d3af4adcfc06fdda97f3971` is its second parent and has the identical tree; this work continues on `feature/school-administration-identity-stage2`, without modifying `main`.
- The main merge includes the forward-only security migration 010 and its related server, test, readiness, CI and documentation changes. Migrations 001–010 exist in numeric application order; historical migrations were not edited.
- The main CI run for `c27c604` failed in the mandatory PostgreSQL acceptance step even though all three tests passed: the runner parsed the local Node test reporter's `ℹ pass` output but CI emits TAP `# pass`. The runner now recognizes both formats. The fresh local mandatory acceptance run passed after this correction; there has not yet been a hosted run of the correction.

## Implemented in this increment

- Migration 010 adds a database-verifiable, 120-second HMAC authorization context. RLS policies no longer authorize from `app.tenant_id` or `app.control_plane_admin` alone. The key is stored in a migration-owner-only table and is synchronized from `CONTROL_PLANE_SECRET` by `npm run db:migrate`; readiness fails if the key is absent or the runtime role can access it. Invitation token lookup also verifies a signed context.
- `withTenantTransaction`, `withControlPlaneTransaction`, school login, and invitation acceptance now establish signed transaction-local contexts. Direct GUC-forgery tests use the non-owner runtime role and check tenant, student, class, staff, and control-plane records.
- The production capability registry now uses explicit `not_started`, `implemented`, `configured`, `ready`, `degraded`, and `disabled` states plus readiness evidence. Existing school, student, class, and lifecycle handlers map to their actual route patterns. Database-backed capabilities remain blocked; the template-discovery route also requires platform authentication.
- Readiness verifies that the context key exists and that the runtime role has no table privileges on it. Its report separately exposes capability implementation, template configuration, runtime dependency, and per-instance application readiness; these remain false until their evidence exists. CI configures a synthetic test key and revokes all runtime-role privileges on the key table.
- Migration 009 adds department and staff tables, staff appointments, class sections and teacher links, tenant/school composite relationships, student lifecycle status and history, class-assignment history, explicit frontend-role mappings, granular permission definitions and school roles, and account suspension state. RLS for production students, classes, and new domain records is tenant-scoped; the migration is forward-only.
- `SchoolAdministrationRepository` adds PostgreSQL-backed student registration, paginated/searchable student reads, class creation, admission/activation, class assignment, promotion/internal transfer, external transfer, graduation, withdrawal/reinstatement, and lifecycle history. It enforces database-derived permissions and filters class-scoped teacher reads.
- Student and class route handlers use the existing authentication middleware, database-authoritative principal, correlation IDs, and consistent response envelopes. Implemented operations include student create/list/read/update, class create/list/update, student class assignment, lifecycle transitions, and history. They remain unavailable because their capabilities are not ready. `GET /api/v1/application-templates` remains unavailable and now requires platform authentication; it is not yet a complete discoverability API.
- Staff record creation, directory search/list, detail retrieval and profile update now use `production.staff`, tenant transaction context, persisted `staff.*` permissions and redacted audit events. Staff creation does not create an account or membership. The endpoints are registered but remain unavailable behind the capability gate pending the rest of the staff and identity lifecycle.
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
- `main` CI at `c27c604` failed only at the mandatory acceptance runner output parsing described above; its earlier typecheck and unit/PostgreSQL test steps passed. After fixing the parser locally, mandatory PostgreSQL acceptance passed 3/3 with zero skips. Hosted CI for this fix and staff changes is not yet verified.
- The CI workflow now also runs on pushes to `feature/school-administration-identity-stage2`, so future feature commits are eligible for hosted verification.
- No production database, customer records, cloud infrastructure, or live email provider was used.

## Not implemented or not verified

- Staff records now have basic repository/API CRUD, but staff invitations, account/membership linking, role appointment changes, suspension/reinstatement, revocation, complete history, and department/office APIs are not implemented.
- Student admission applications and approvals, class lifecycle/section-management, and academic-session history are incomplete.
- The existing invitation service still covers initial school-administrator activation, not the full additional administrator/staff invitation lifecycle. Resend delivery was not tested against staging; delivery must not be reported as operational.
- Email verification, password recovery/change, account reactivation endpoints, membership activation/reactivation endpoints, and comprehensive audit history are not complete.
- Role definitions and explicit legacy-name mappings are present, but complete role/permission administration APIs, school-specific custom roles, scoped role assignment, and the full requested authorization matrix are not implemented.
- No school-administration frontend has been connected to these APIs. Existing administration screens have not been integrated; loading, empty, error, pagination, permission, and mutation states remain incomplete.
- Template metadata exists but its discovery endpoint is gated, and the template remains non-provisionable. Capability-level configuration UI, dependency composition, multi-template composition, and builder-to-provisioning acceptance are not complete. Provisioning persists and validates the current versioned configuration but does not yet provision only the selected template's migrations or activation prerequisites.
- The production capability gate intentionally remains fail-closed. Correct route matching is now present, but database-backed capabilities have only `implemented` status and no operational readiness evidence. Their handlers are not production-available.
- Platform readiness now reports the administration template configurable only when the template is published, all registered Stage 2 capabilities are ready with tests and evidence, mandatory runtime dependencies are available, and the lifecycle schema is present. These requirements currently remain unmet.
- `CONTROL_PLANE_SECRET` must be supplied to the migration-owner migration command and to the application runtime. Key rotation and deployment-specific privilege grants must be coordinated; hosted CI has not yet verified the workflow.
- The acceptance suite does not yet cover the requested staff, complete invitation, API-level cross-tenant matrix, full frontend, restart/recovery, external-transfer authorization, or all provisioning and lifecycle cases.

## Readiness decision

Do not enable or sell the School Administration & Identity template as a production module yet. Do not claim external email delivery, cloud deployment, or the complete Stage 2 acceptance criteria. The next blocking work is completion of the staff, invitation, role-administration, guardian, frontend, and Builder/provisioning flows above, followed by full acceptance, build, and hosted CI verification.
