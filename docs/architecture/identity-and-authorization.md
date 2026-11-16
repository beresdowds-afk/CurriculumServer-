# Identity, Authorization, Capability Gate and Lifecycle Architecture

Introduced by migration `008_identity_authorization_foundation.sql`. This is the
foundation for School Administration & Identity Stage 2; it does not implement
Stage 2 features.

## 1. Canonical identity model

| Concern | Canonical source |
| --- | --- |
| User identity | `production.users` (one table; no second users table, one password store) |
| Tenant membership | `production.memberships` (`status`: active/revoked; `revoked_at`) |
| Staff profile association | Future nullable FK from a staff profile table to `users.id` (+ tenant). Not created yet. |
| Student identity association | `curriculum_flow`/`production` student rows stay tenant records; any student login links via a future FK to `users.id`. Not created yet. |
| Guardian association | Future guardian table keyed by `users.id`; reserved, not created. |
| Role assignment | `production.membership_role_assignments` (partial unique index on active rows; revocation timestamps) |
| Permission assignment | `production.roles` → `production.role_permissions` → `production.permissions` (reference tables, runtime role is SELECT-only) |
| Resource scope | `production.role_assignment_scopes` (empty scope = tenant-wide) |
| Session identity | `production.user_sessions` (id carried as `sessionId` claim in the signed token) |
| Session revocation | `user_sessions.revoked_at`; membership revocation also revokes sessions |
| Platform administrators | Environment-configured, token role `super_admin`; never a tenant role or membership |

Existing user ids, membership rows and `memberships.user_subject` values are
preserved. Legacy `memberships.role` is retained; migration 008 backfills
normalized assignments from it without discarding any subject.

### Forward-only plan for the legacy role column

1. 008 (done): add normalized assignments, backfill, keep `memberships.role` CHECK.
2. Application reads only assignments (done for authorization).
3. Future migration (not yet written): once all writers use assignments, drop the
   `memberships.role` CHECK and make the column nullable/deprecated. Never rewrite
   or delete historical subjects.

## 2. Authorization

* Authentication (signed token, `ServerTenantTokenService`) only identifies the user, tenant and session.
* PostgreSQL decides current membership, roles, permissions and scopes on every request
  (`server/authorization/authorizationRepository.ts`). Token role claims are never the permission source.
* `AuthorizedPrincipal` (branded, frozen) is created only by the repository after DB checks.
  Privileged repository methods (`updateConfiguration`, `assignRole`, `revokeMembership`)
  require it via `assertAuthorized`, so they do not rely on Express guards alone.
* Middleware (`server/authorization/middleware.ts`): `authenticated`, `activeMembership`,
  `requirePermission`, `requireResourcePermission`, `tenantAdministrator`,
  `platformAdministrator`, `internalService` (`x-internal-service-key`, `INTERNAL_SERVICE_KEY` ≥ 32 chars).
* School application access is no longer restricted to `tenant_admin`; permissions decide.
* Tenant context is set transaction-locally (`withTenantTransaction`); control-plane access uses the
  single `withControlPlaneTransaction` helper in `server/db/tenantContext.ts`. No runtime superuser or BYPASSRLS.
* Role assignment cannot escalate: an actor can only assign roles whose permissions it holds.
* Invitation acceptance stays a narrow token-hash-scoped transaction (`withInvitationTokenTransaction`).

## 3. Production capability gate

`server/capabilities/productionCapabilityRegistry.ts` declares, per route group: capability id,
required repositories and migrations, authentication, authorization, tenant-context requirement,
acceptance tests and readiness. `server.ts` keeps the global `/api/v1` fail-closed lockdown and calls
`evaluateProductionCapabilityGate`: a route is served only if its capability is `enabled`, declares
acceptance tests, routes, and consistent auth/tenant rules. Unknown and unimplemented operations return 503.
Registered but `not_started`: school_identity, student_administration, class_administration,
staff_administration, administrative_permissions, student_lifecycle.

## 4. Application configuration contract

`src/data/applicationInstanceConfiguration.ts` defines one versioned contract (application id/version,
templates, enabled capabilities, dependencies, configuration version, deployment architecture,
database strategy, validation evidence) used by the Application Builder data, request validation
(`server/schoolProvisioning.ts`), the provisioning repository snapshot, and `isCapabilityEnabled`
for runtime checks. Only registered templates (`app_curriculum_flow` / `school-standard` / `1`) and
`shared_database` architecture are provisionable. Feature readiness is derived from evidence stages
(`deriveFeatureReadiness`), not from the static registry entry. Legacy identifiers map through
`FEATURE_ID_ALIASES`/`canonicalFeatureId` (e.g. `student_registers`, `question_bank`,
`cbt_examination` → `feat_*`). The legacy onboarding wizard/client still use legacy keys; migration to
Builder-supplied configuration is prepared, not completed.

## 5. Lifecycle separation

`production.application_instances.lifecycle_stage` is linear and enforced by a DB trigger and
`server/db/applicationLifecycle.ts`: registration_approved → provisioned → template_verified →
admin_invited → admin_activated → membership_active → configuration_completed → application_activated.
Invitation acceptance reaches `membership_active` only. `activateApplication` additionally requires
`configuration_completed` and a verified health check. Transitions are logged in
`production.application_lifecycle_events`.

Known pre-existing conflation (documented, unchanged): acceptance sets `tenants.status = 'approved'`.

## 6. Invitation delivery durability

`invitation_outbox` has pending/processing/succeeded/failed/dead_letter, retry scheduling,
`max_attempts` (5), `idempotency_key`; invitations carry `token_version`; only token hashes are stored.
Redelivery rotates the token, writes a `school_admin_invitation_token_rotated` audit event (recording
whether the previous attempt's outcome was unknown), and revocation is supported. Resend remains the only
provider; credentials stay server-side.

## 7. Persistence boundaries

* Demonstration: `server/serverSchoolManager.ts`, `server/serverAcademicPersistence.ts`, mock data, demo JSON. Retained, never imported into production.
* Production tenant data: PostgreSQL repositories only (RLS tenant tables).
* Platform reference data: `production.permissions/roles/role_permissions`, curriculum reference; runtime SELECT-only.
* Operational evidence/audit: `audit_events`, `application_lifecycle_events`, `invitation_delivery_attempts`.
