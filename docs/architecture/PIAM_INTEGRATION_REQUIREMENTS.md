# PIAM Integration Requirements

## Existing repository boundary

There is no independently authenticated PIAM approval lookup/consume endpoint or external PIAM authentication/signature specification in this repository. `server/cipaAgentService.ts` exposes `piamApprovalAction`, but it always throws `PIAM_UNAVAILABLE`; CIPA request records are in-memory and are not an approval authority. `POST /api/v1/agent/requests/:requestId/piam-approval` is covered by `requireSuperAdmin`, but the route itself currently returns 503 with other CIPA operations. That route authentication does not establish MFA assurance, separation of duties, approval signatures, revocation, replay protection, or exact-contract binding.

`control_plane.piam_authorizations` from migration 002 is a persistence schema, not a verifier. Migrations 021 and 022 persist database/storage approvals and enforce control-plane-only writes, but their fields do not independently prove who approved, MFA, separation of duties, exact contract hash, expiry/revocation, one-time consumption, or signed evidence. A caller-signed provisioning contract also does not prove a PIAM decision.

`server/piamVerificationAdapter.ts` defines the internal `PiamVerificationAdapter` boundary and an `UnavailablePiamVerificationAdapter`. No external endpoint, credential, trust anchor, signature format, or successful implementation is configured. The default adapter always returns unavailable. `TenantDatabaseProvisioningService` now requires a successful, scope-matching PIAM verification before claiming an operation or invoking database/storage providers. It records contract version/hash, tenant/instance, project, operation, region, database/storage strategies, result, verifier, approver assurance/separation-of-duties, one-time consumption, and evidence reference/hash in `production.tenant_provisioning_authorization_checks` (migration 023), including unavailable/invalid outcomes. The normalized adapter result is an internal trust boundary, not the format of an assumed external API; a future implementation must verify authentic PIAM evidence before returning `verified`. This local boundary is not a production PIAM integration.

The GitHub Actions human review is a separate control. Environment approval cannot construct, replace, consume, or mark PIAM evidence verified.

## Required PIAM provider contract before an adapter can be implemented

PIAM owners must supply and review a service specification that defines:

- A stable service identity and authenticated server-to-server protocol, trust roots, key rotation, TLS requirements, timeouts, availability behavior, and error classification. No endpoint or authentication scheme is presumed here.
- A request binding to approval ID, canonical provisioning-contract version and SHA-256 hash, tenant UUID, application-instance/school UUID, operation, region, target project, database strategy, storage strategy, and exact allocated resource identifiers where known.
- A response that cryptographically authenticates the PIAM authority and includes the authenticated approver identity, verified MFA/authentication assurance, approver role/scope, requester identity, separation-of-duties result, decision, approved scope, issue/expiry times, revocation status, one-time consumption receipt, replay/idempotency semantics, and tamper-evident audit/evidence reference.
- Atomic one-time consumption semantics. Safe retries must reuse only the same contract hash and operation idempotency key and return the original durable consumption record; another contract, tenant, operation, or resource must be rejected. Concurrent verification must permit only the defined single-use claim.
- Explicit statuses for unavailable, pending, rejected, expired, revoked, reused, malformed, signature-invalid, scope-mismatch, and verified. Missing, timeout, malformed, or unverifiable responses must never be treated as approval.
- Defined audit retention, revocation propagation, approver/requester identity sources, independent role administration, and operator recovery behavior for ambiguous consume outcomes.

This repository must not create PIAM approvals, synthesize approver identities, or infer approvals from GitHub Environment decisions, CIPA memory, payment status, or unsigned database rows. Until the specification and independent verifier are implemented and tested, the only valid production status is unavailable/blocked.

## Required tests for a real adapter

Before enabling the adapter, add provider-contract tests for valid signed evidence and invalid signature, expiry, revocation, wrong tenant, wrong school/instance, wrong project, wrong operation, wrong database/storage/resource scope, changed contract hash/version, requester approving their own request, insufficient role/MFA, reuse, concurrent consumption, timeout, malformed response, and ambiguous network failure. Verify that only successful one-time verification is recorded as `verified`, rejected outcomes remain durable, and provider execution never begins after any failure. A disposable staging integration must exercise the real authority and its audit trail; mocked provider responses do not establish production authorization.
