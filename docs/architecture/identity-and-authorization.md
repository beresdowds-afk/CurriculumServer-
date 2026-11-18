# Identity, Authorization, Capability Gate and Lifecycle Architecture

The identity foundation was introduced by migration
`008_identity_authorization_foundation.sql`; migration
`009_school_administration_domain.sql` adds a partial administration domain.
Neither migration alone makes the Stage 2 module production-ready. See
`SCHOOL_ADMINISTRATION_IDENTITY_STAGE2.md` for verified implementation status
and blockers.

## 1. Canonical identity model

| Concern | Canonical source |
| --- | --- |
| User identity | `production.users` (one table; no second users table, one password store) |
| Tenant membership | `production.memberships` (`status`: active/suspended/revoked; `revoked_at`) |
| Staff profile association | `production.staff` has a nullable tenant-scoped FK to `production.memberships(tenant_id, user_id)`; staff account-linking workflows are incomplete. |
| Student identity association | `curriculum_flow`/`production` student rows stay tenant records; any student login links via a future FK to `users.id`. Not created yet. |
| Guardian association | Future guardian table keyed by `users.id`; reserved, not created. |
| Role assignment | `production.membership_role_assignments` (partial unique index on active rows; revocation timestamps) |
| Permission assignment | `production.roles` → `production.role_permissions` → `production.permissions` (reference tables, runtime role is SELECT-only) |
| Resource scope | `production.role_assignment_scopes` (empty scope = tenant-wide) |
| Session identity | `production.user_sessions` (id carried as `sessionId` claim in the signed token) |
| Session revocation | `user_sessions.revoked_at`; membership revocation also revokes sessions |
| Platform administrators | Allowlisted platform credentials and signed control-plane tokens; never a tenant role or membership |

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
* `AuthorizedPrincipal` (branded and deeply frozen) is created only after DB checks.
  Privileged repository methods (`updateConfiguration`, `assignRole`, `revokeMembership`)
  and `revokeSession` require it via `assertAuthorized` and recheck the actor's current
  session, membership and permission inside the write transaction.
* Middleware (`server/authorization/middleware.ts`): `authenticated`, `activeMembership`,
  `requirePermission`, `requireResourcePermission`, `tenantAdministrator`,
  `platformAdministrator`, and `internalService`. Platform access requires the signed
  `platform-control-plane` issuer/audience context and an email in
  `PLATFORM_ADMIN_CREDENTIALS_JSON`; a `super_admin` token claim alone is insufficient.
* New tenant role assignments are limited to `tenant_admin`, `staff`, and `read_only`.
  Existing normalized assignments remain readable for compatibility; platform
  `super_admin` is never a tenant assignment. Resource-scoped permissions are checked
  against the requested resource (including application-instance scopes).
* AI tenant access has no token-role permission fallback: PostgreSQL session, membership,
  assignments and permissions are required. Missing database authorization returns 503.
* Internal service authentication supports Cloud Run's `X-Serverless-Authorization`
  Google OIDC ID token with an exact configured audience and allowlisted caller emails
  (`INTERNAL_SERVICE_AUDIENCE`, `INTERNAL_SERVICE_CALLERS`). The legacy
  `x-internal-service-key` remains supported during migration, but service identity
  alone grants no tenant permission, platform access, or infrastructure IAM.
* School application access is no longer restricted to `tenant_admin`; permissions decide.
* Tenant context is transaction-local and signed by the server (`withTenantTransaction`). RLS calls
  `production.verified_authorization_context_kind()` and compares the signed tenant assertion with
  `app.tenant_id`; the raw setting is not authorization evidence. Control-plane access uses the
  signed `control_plane` assertion produced only after platform-token verification by
  `withControlPlaneTransaction`. The invitation token hash is separately signed and verified by
  `production.current_invitation_token_hash()`.
* Migration 010 stores the HMAC key in `control_plane.authorization_context_keys`, inaccessible to
  the runtime role. `npm run db:migrate` synchronizes that key from `CONTROL_PLANE_SECRET`; readiness
  remains false if the key is absent or the runtime role can read it. Assertions expire after 120
  seconds and transaction-local settings prevent context leakage between pooled requests.
* Database signatures prove the assertion came from the trusted server; the API still verifies
  current account, session, membership and permissions in PostgreSQL for each request. The key must
  be managed and rotated through the migration-owner connection, never exposed to application SQL.
* Role assignment cannot escalate: an actor can only assign roles whose permissions it holds.
* Invitation acceptance stays a narrow token-hash-scoped transaction (`withInvitationTokenTransaction`).

## 3. Production capability gate

`server/capabilities/productionCapabilityRegistry.ts` declares, per route group: canonical capability
id, routes, required repositories and migrations, authentication, authorization, tenant-context
requirement, acceptance tests, readiness evidence and lifecycle state (`not_started`, `implemented`,
`configured`, `ready`, `degraded`, or `disabled`). `server.ts` applies the fail-closed gate to all
`/api` namespaces before registering routes. Versioned routes map to the existing registry; other
namespaces use a separate legacy registry and cannot inherit versioned registrations. A route is
served only when its registration is `ready` and has operational evidence;
unknown and unready operations return 503. Existing school, student, class and lifecycle handlers now
map to their canonical groups, but remain blocked until the complete administration, authorization,
configuration and runtime-readiness evidence exists. Staff, role administration and template
discovery remain unavailable.

The legacy `/api/ai/*`, `/api/ai/v1/*`, diagnostics, worker, demo and legacy curriculum
routes are unavailable until separately registered with their own authorization and readiness
evidence. Question Bank and assessment reads retain application-instance authorization, but
their writes and individual-item mutations are unavailable until their repositories require
an authorized principal and enforce item-level scopes. School profile/configuration routes
currently require tenant-wide permissions; school-scoped grants need a verified school resolver
and scoped repository checks before they can be supported. Missing profile-update, invitation,
role/permission and staff-appointment routes require their own feature implementations.

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
