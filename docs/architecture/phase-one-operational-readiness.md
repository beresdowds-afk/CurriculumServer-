# Phase One Authorization and Operational Readiness

This report is a source/configuration review for the Phase One completion sprint.
It is not a production-readiness declaration. The complete route snapshot is in
[`phase-one-api-route-authorization-matrix.csv`](./phase-one-api-route-authorization-matrix.csv).
The matrix was generated from the Express registrations in `server.ts` and
`server/ai/routes.ts`, expanding the shared-service route loop. Each row records
the capability decision for the route, middleware visible at registration,
permission metadata, resource scope, associated registry test, and source
location. Registry test names are evidence links, not proof that every row has
an individual integration test.

## API route authorization inventory

The inventory contains 270 registered API method/path pairs: 253 literal API
routes in `server.ts`, 8 AI router routes, and 9 shared-service routes expanded
from the service loop. All are behind
`createApiCapabilityGateMiddleware()` mounted before route registration.

| Registry result | Routes | Interpretation |
| --- | ---: | --- |
| Ready and served by the gate | 61 | Capability requirements are declared ready; route middleware still applies. |
| Implemented, but unavailable | 53 | Required readiness evidence is absent. |
| Not started and unavailable | 5 | The feature itself is not complete. |
| No matching capability registration | 151 | The gate returns the established 503 unavailable response. |

The 209 blocked routes remain unavailable. A handler or route-level guard does
not override the capability gate. `unclassified (blocked)` and
`unregistered/unknown_route` entries identify handlers for which the current
registry does not establish a safe, ready API contract. Do not mount or expose
them by bypassing the gate.

For scoped school records, the matrix names guards such as
`studentRecordRead`, `studentUpdate`, `classUpdate`, and `staffRecordRead`.
Those guards resolve the principal's database grants and resource assignments;
the repository also scopes reads/writes by the server-resolved school and
tenant. The route-level registry remains unavailable until its required
operational evidence is populated. The matrix lists capability permission
families when a route does not declare one inline; the guard expression is the
route-specific source of truth when present.

Known incomplete route groups include legacy curriculum/diagnostic/worker
routes, the AI router namespace (unregistered in the API gate), provisioning,
school identity, staff administration, role/permission administration,
template discovery, and the scoped-write Question Bank/assessment routes.
These are blocked rather than treated as public or production-ready. Individual
route classifications and integration-test associations are in the CSV.

## Platform administrator verification

| Control | Implementation/evidence | Status |
| --- | --- | --- |
| Allowlist | `PLATFORM_ADMIN_CREDENTIALS_JSON` is parsed as normalized email to distinct 32+ character login key; malformed/missing configuration fails closed. | Implemented; deployment values not inspected. |
| Credential check and issuance | Platform login validates allowlisted key and secure signing configuration, then calls the dedicated `issuePlatformAdminToken`; successful login is audited. | Implemented and covered by token/middleware tests; live audit durability not verified. |
| Role and context binding | Tenant token issuance rejects `super_admin`, non-canonical tenant roles, and the platform tenant ID. Platform issuance fixes role, issuer, audience, and tenant ID and limits lifetime to one hour. | Implemented; token regression tests added. |
| Request validation | Signature/expiry and platform context are verified; the platform middleware rechecks the current allowlist on every request. Removing an allowlist entry therefore denies the next request. | Implemented; middleware regression covers allowlist removal. |
| Tenant/platform separation | A platform context is rejected as a tenant session; tenant roles cannot be issued as platform tokens. | Implemented and tested. |
| Revocation/audit | Allowlist removal is the current platform-token revocation mechanism; platform login success is recorded in the existing audit ledger. There is no independent platform session-revocation table or durable deployment verification for the local-file audit ledger. | Partially implemented; operational evidence remains blocked. |

No email-only authorization is used. Account configuration and successful
credential verification are required for issuance; downstream access also
requires the current allowlist. Tenant invitation and role assignment paths
cannot create platform administrators.

## Google service identity caller-to-operation policy

Google ID-token verification checks the RS256 signature against Google's
published signing keys, accepted Google issuer, exact configured audience,
expiration/issued-at bounds, verified email, and a configured caller allowlist.
The middleware now also requires an explicit caller-to-operation entry in
`INTERNAL_SERVICE_OPERATIONS`; callers must appear in both
`INTERNAL_SERVICE_CALLERS` and that JSON policy. Unknown operations and missing
or invalid policy fail closed. The legacy `INTERNAL_SERVICE_KEY` path remains
available during migration and is not caller-specific authentication.

| Service route operation | Policy code | Additional application authorization |
| --- | --- | --- |
| `GET /api/v1/shared/curriculum/discovery` | `shared.curriculum.discover` | Tenant session, permission, and application entitlement. |
| `POST /api/v1/shared/curriculum/authorization` | `shared.curriculum.authorize` | Tenant session, operation contract, permission, and application entitlement. |
| `GET /api/v1/shared/curriculum/health` | `shared.curriculum.health` | Tenant session, permission, and application entitlement. |
| Textbooks equivalents | `shared.textbooks.discover`, `.authorize`, `.health`; consumption uses `.consume`. | Tenant session, service permission, and application entitlement. |
| Vehicle-tracking equivalents | `shared.vehicle_tracking.discover`, `.authorize`, `.health`; consumption uses `.consume`. | Tenant session, service permission, and application entitlement. |
| GET shared curriculum/textbook content routes | `shared.curriculum.consume` or `shared.textbooks.consume` | Tenant permission and application entitlement; request-specific operation is separately checked by the repository. |

The receiving service must set its own exact `INTERNAL_SERVICE_AUDIENCE`, list
the calling service identity in `INTERNAL_SERVICE_CALLERS`, and explicitly
grant only needed operation codes in `INTERNAL_SERVICE_OPERATIONS`, for example:

```json
{
  "worker@example.org": [
    "shared.curriculum.discover",
    "shared.curriculum.consume"
  ]
}
```

The sample is documentation only; it is not a configured identity. No deployed
caller, audience, Google-issued token, or operation policy was inspected. The
synthetic-key tests prove verifier behavior, not a live Cloud Run integration.
The AI router is still unregistered in the API gate and remains unavailable;
its separate auth path was not changed. For supported shared-service callers,
the migration path is to configure audience/caller/operation policy first,
verify a real caller and the required tenant bearer authorization, then switch
the integration to `X-Serverless-Authorization` while retaining the legacy
key only for the approved transition window. Do not change IAM or runtime
service accounts as part of this application change.

## Migration and runtime checklist

The migration runner applies all migration files in numeric order and never
rewrites applied checksums. The direct Phase One schema milestones are:

| Migration | Purpose / readiness check |
| --- | --- |
| 008 | Canonical users, memberships, normalized roles/permissions, resource scopes, sessions, and authorization repository schema. |
| 009 | School administration records and tenant RLS policies; inspect final policy state after 010. |
| 010 | Signed, transaction-local authorization context; runtime cannot read the HMAC signing-key table. |
| 018 | Intended invitation role and assignment lifecycle constraints/indexes. |

Apply the complete ordered sequence `001`–`018`, not selected files. Migrations
`001`–`007` establish the preceding control-plane and provisioning schema;
`011`–`017` establish other intervening domains and are still part of the
runner's ordered database state. No migration was added in this sprint.

Before any development or staging application, verify:

- Use distinct migration-owner and application-runtime roles. The runtime role
  must not own tenant tables, be superuser, or have `BYPASSRLS`; grant only
  required schema/table/sequence privileges.
- On a clean ordered migration, migration 009 seeds reference tables already
  under `FORCE ROW LEVEL SECURITY` and its read-only policy. A non-superuser
  migration owner without `BYPASSRLS` fails at that seed step. Use a separate,
  controlled migration identity with temporary migration-only `BYPASSRLS`
  (or an equivalently reviewed migration procedure), then remove that
  privilege; never grant it to the application runtime role. The local
  acceptance run exercises the runtime as non-owner/non-superuser/non-
  `BYPASSRLS`.
- Confirm `FORCE ROW LEVEL SECURITY` and final policy expressions use the
  verified signed context from migration 010. Migration 009's initial GUC
  policies are superseded by 010; do not assess 009 in isolation.
- Provision `CONTROL_PLANE_SECRET` only through the approved secret mechanism.
  The controlled migration runner synchronizes it into
  `control_plane.authorization_context_keys`; the runtime role must not read
  that table.
- The signing secret is also used by the trusted application process to sign
  tenant context. Coordinate a rotation with the migration-owner connection
  and every application instance. There is no demonstrated dual-key/overlap
  rotation procedure; perform a planned coordinated cutover and verify
  readiness before restoring traffic.
- Confirm backup/PITR configuration and test a restore before rollout.
  Migrations are forward-only; there is no automatic down migration. Rollback
  from applied schema/data changes requires an operator-approved, verified
  backup restore or a separately reviewed forward fix.
- Run disposable PostgreSQL acceptance with different owner/runtime URLs and
  synthetic data. The runner verifies runtime role flags, applies migrations,
  checks HMAC-key isolation, and runs six integration tests. A staging run,
  production migration, backup restore, and live key rotation have not been
  established by this report.

Controlled development/staging command shape (supply secrets through the
operator's secret injection, not shell history or committed files):

```sh
npm run db:migrate:status
npm run db:migrate -- --dry-run
npm run db:migrate
```

The commands must run with `MIGRATION_DATABASE_URL` and `CONTROL_PLANE_SECRET`
set for the migration process, and only after the target environment is
confirmed. The dry run does not apply SQL. Never run these commands against
production as part of this sprint.

## Capability readiness

`ready` entries are registry states, not proof of deployed runtime availability.
For the listed Phase One groups, `readinessEvidence` is currently empty unless
noted. No capability was activated during this sprint.

| Capability / area | State | Missing evidence or blocker |
| --- | --- | --- |
| Identity/login (`central_iam`) | Not started | Complete central identity/login, Google OIDC/MFA/session capability, end-to-end acceptance tests, and operational evidence. |
| Provisioning (`school_provisioning`) | Implemented, unavailable | Non-empty production readiness evidence and complete deployment/runtime proof for provisioning repositories, migrations, auth, mail/outbox, and activation workflow. |
| School administration (`school_identity`, student/class/lifecycle) | Implemented, unavailable | Readiness evidence for production repositories, current database permissions/scopes, database-backed route tests, and operational status. |
| Role administration (`administrative_permissions`) | Not started | Complete authorized role/membership administration API and repository lifecycle, audit proof, escalation tests, and capability evidence. Keep routes unavailable. |
| Staff administration/account linking | Implemented route/data portions, unavailable | Staff capability evidence and an implemented/tested user-membership-to-staff linking workflow. Do not infer this from nullable schema FKs. |
| Student identity association | Not implemented | A separately designed, reviewed identity association workflow and schema; not present in the completed identity model. |
| Guardian identity association | Not implemented | A separately designed, reviewed guardian/user association workflow and schema; not present in the completed identity model. |
| Template discovery | Not started | Template repository, authorization, migrations, tests, and readiness evidence. Keep route unavailable. |
| Question Bank/assessment writes with per-item scopes | Implemented, unavailable | Readiness evidence and repository-bound principal/scope proof for blocked writes. Existing ready read paths do not make writes ready. |

## Test evidence and remaining blockers

New targeted coverage in this sprint verifies canonical platform token
issuance, rejection of tenant `super_admin`/legacy roles, platform token
expiry, and denial after allowlist removal. Google service-identity tests now
also require a configured caller-operation policy and reject a valid caller
using an ungranted route operation. Synthetic RSA keys are used; no deployed
Google identity is tested.

Prior to this sprint, the branch reported 152 passing unit/integration tests
and 6 passing disposable-PostgreSQL acceptance tests. Those are historical
results; the full 152-test suite was not rerun in this sprint. Current results:

| Check | Result |
| --- | --- |
| Focused token, authorization middleware, Google service identity, and AI gateway tests | 25 passed, 0 failed, 0 skipped. |
| `npm run lint` (`tsc --noEmit`) | Passed. |
| `npm run test:postgres:acceptance` on disposable PostgreSQL 16 | 6 passed, 0 failed, 0 skipped. |
| Ordered migrations | 001–018 applied on the disposable database; no migration was added in this sprint. |
| Runtime database role | Verified non-owner, non-superuser, and no `BYPASSRLS`; signing-key table access was explicitly revoked. |

During local setup, migration 009 failed with a non-superuser migration role
that lacked `BYPASSRLS`, because it seeds reference tables already protected by
`FORCE ROW LEVEL SECURITY`. The migration was retried only after granting
temporary `BYPASSRLS` to the isolated migration role; the role was returned to
`NOBYPASSRLS` before the acceptance suite. The runtime role remained
`NOBYPASSRLS` throughout. This validates the local disposable setup, not a
staging migration or deployed migration-owner configuration.

Phase One is **not recommended for final acceptance** until:

1. The targeted and full PostgreSQL acceptance suites pass with no skips.
2. The deployment configures an exact Google audience, caller list, and
   caller-operation map and validates a real Google-issued service identity.
3. Development/staging migration results, runtime-role grants, key isolation,
   backup/restore, and rotation procedures are recorded.
4. Readiness evidence is supplied for every capability intended to be exposed.
5. Student/guardian associations and staff account linking are separately
   completed where required by product scope.

No Cloud Build, trigger, Dockerfile, Cloud Run, GCP IAM, runtime identity,
production database, or central AI gateway architecture was changed.
