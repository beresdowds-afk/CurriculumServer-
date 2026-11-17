# Central IAM Stage 1: baseline and blockers

**Status: not implemented, not production-ready.** This is a source inspection,
not evidence that any deployment, existing accounts, or provider integration
has been verified. The `central_iam` capability is `not_started`; the API
capability gate returns 503 for the three legacy login routes and token
verification route.

## Baseline

- `production.users` uses stable UUIDs and a required password hash; membership,
  normalized role assignments, scopes, permissions and tenant-scoped sessions
  are in migrations 005, 006 and 008. Migration 009 adds account suspension;
  migration 010 replaces tenant context policies with signed assertions.
  Migrations 011-013 add logistics references to these identities, not an IAM
  provider or MFA implementation. Existing IDs and records have not been changed.
- `curriculum_flow.users` is a separate legacy table with its own UUID, email,
  role and textual tenant ID (migrations 001, 002, 004). A database inventory
  and reconciliation of real records and references is still required; an
  email match by itself must not merge accounts or grant membership.
- `/api/v1/server/auth/login` authenticates a configured email and secret and
  issues a one-hour platform bearer token without a PostgreSQL session or MFA.
  `/api/v1/server/auth/verify` verifies the signed token, not a live session.
  `/api/v1/schools/auth/login` checks a password and active user, membership and
  approved tenant, then issues a 12-hour bearer token and PostgreSQL session.
  `/api/v1/flow/auth/login` has a 410 handler, but the global capability gate
  currently intercepts it with 503. Invitation activation requires the
  existing password before adding an existing user to another tenant.
- `server/authorization/middleware.ts` and `authorizationRepository.ts` resolve
  current session, user, tenant membership and role grants in PostgreSQL for
  the routes using them. `requireSchoolAuth` instead checks token claims and
  ends in 503; it is not a replacement for database authorization.
  `tenantContext.ts` signs transaction-local context for the RLS policies.
  The token service uses a custom HMAC format with `CONTROL_PLANE_SECRET`, not
  a centrally managed refresh-token lifecycle.
- `SchoolAdminAccessPage` calls the school password endpoints.
  `unifiedApiClient` persists bearer credentials in browser sessionStorage
  and clears them locally; this is not server-side logout or revocation.
  Its client-side token decoding does not verify signatures. `AuthModal` has
  simulated password, Google and phone flows, and `Principal2FAGate` accepts
  client-generated or arbitrary six-digit codes and local session state.
  `apps/curriculum-flow/src/App.tsx` initializes and switches demo users and
  allows workspace navigation by hash. None of these UI checks is proof of
  authentication, MFA or authorization.
- Google OIDC discovery, code exchange and ID-token validation, explicit
  provider linking, refresh rotation and reuse detection, real MFA enrollment
  and challenges, recovery, security notifications, and the requested IAM
  secret configuration are not implemented. Existing sample UI credentials
  and mock identities must never be treated as production authentication.

## Security and migration blockers

The simulated authentication and MFA interfaces, platform login without a
revocable session or MFA, browser-readable bearer tokens, legacy guards and
incomplete central account lifecycle are high-risk if exposed as production
authentication. The current API gate reduces exposure but does not secure
client-side demo content or establish readiness. Do not enable the blocked
routes based on the presence of handlers, schemas or unit tests.

Before any consolidation, inventory actual `curriculum_flow.users` and
`production.users` records and all referencing data under an appropriately
authorized database connection. Resolve ambiguous identities with proof of
account ownership, preserve both IDs and relationships, and document a
reversible rollout and session compatibility plan. No production records were
inspected or migrated in this change.

## Intended architecture, not yet implemented

```text
Browser / future native client
       |  authorization code + PKCE, state and nonce
       v
Central IAM <-----------------> Google OpenID Connect
       | verified provider subject; explicit account linking
       v
production.users -- memberships -- roles / permissions / scopes
       |                          |
       +-- sessions and MFA       +-- tenant-scoped requests and RLS
```

Google identity must not grant membership by matching an email or domain.
Platform administrators need separately enforced MFA. Browser session
handling, session rotation and revocation, provider linking, recovery and
tenant authorization must be implemented together and independently verified.

## Deployment prerequisites

Create a dedicated Google OAuth web client in the appropriate Cloud project,
configure its consent screen and exact HTTPS callback URI, and provide a
dedicated test client and authorized test accounts in controlled staging.
No callback URI or integration exists yet, so do not enable a production
client against this repository.

The proposed configuration is `GOOGLE_OIDC_CLIENT_ID`,
`GOOGLE_OIDC_CLIENT_SECRET`, `GOOGLE_OIDC_ISSUER`,
`GOOGLE_OIDC_REDIRECT_URI`, `IAM_SESSION_SIGNING_KEY`,
`IAM_REFRESH_TOKEN_PEPPER`, `IAM_ENCRYPTION_KEY`, and `APP_BASE_URL`.
Production secret values must be provisioned through Google Cloud Secret
Manager with least-privilege runtime access and a documented rotation process.
Secret Manager integration and startup validation are not implemented; these
names are requirements, not evidence that the application consumes them.

## Verification still required

No new database migration is included. Disposable PostgreSQL migration and
record-preservation checks, security and isolation integration tests, frontend
and backend integration, live Google protocol tests, production configuration
verification and CI for this branch remain **NOT VERIFIED**. Google tests
require an actual staging OAuth client and real provider interaction; no
provider connectivity or deployment is claimed. Stage 1 must remain blocked
until all requested completion conditions have evidence.
