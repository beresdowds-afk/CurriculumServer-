# Project-creation event orchestration: foundation and blockers

## Status

The requested one-initiation orchestration is **not operational**. There is no
configured project-authorization registry, approval topic or subscription,
PIAM decision interface or signing specification, authenticated push receiver,
GitHub continuation, or project-creation and school-infrastructure execution
adapter. No project, IAM, subscription, topic, or deployment is created by
this change. The existing PIAM governance workflow still requires its
configured human review; it has not been changed to implement the requested
automatic existing-project path. The current tenant database/storage
coordinator still fails closed without independent PIAM verification.

Migration 024 and `server/projectApprovalNotifications.ts` add a
control-plane-only PostgreSQL inbox foundation. A registered project-creation
request binds a request UUID, tenant UUID, project ID, operation, contract
hash and authority reference. An internal, normalized notification carries
the same scope plus an event UUID, claimed status and timestamp. The event
schema is local to this repository; it is **not** a PIAM or Pub/Sub provider
contract. It cannot be used to infer an external authority's protocol.

Registration and event insertion are idempotent and transactional. Reuse of
an ID with different content fails. The request row serializes concurrent
delivery; older or out-of-order claims are retained without changing
authorization. RLS permits access only in an already verified control-plane
context. The test exercises this with a non-owner PostgreSQL role. There is no
receiver or publisher wired to the inbox, and caller authentication is not
implemented by the inbox. `APPROVED` and all other statuses are **unverified
claims**, not approval states, verification evidence, or permission to
continue. Nothing here checks a signature, approval expiry, revocation, or
authority identity.

## Integration needed before activation

1. Establish an authoritative, independently administered registry of
   authorized projects and scope, and define policy checks for organization,
   folder, billing, resource ownership and exceptional privileged changes.
   Project existence alone is not authorization. Define how a new project's
   reviewed bootstrap scope becomes an authorized target.
2. Obtain the actual PIAM event and verification contract, trust roots, key
   rotation, expiry/revocation semantics, atomic one-time consumption and
   audit requirements described in `PIAM_INTEGRATION_REQUIREMENTS.md`. A
   signed notification and a Pub/Sub delivery identity are not a substitute
   for independent current PIAM verification.
3. Designate approval-request and decision topics, subscriptions, project,
   authenticated push identity, audience, retry and dead-letter policy,
   retention and operator ownership. Existing Pub/Sub configuration in
   `deploy/provision-curriculum-gcp-foundation.sh` concerns logistics and
   does not establish approval infrastructure. Its existing WIF and
   `curriculum-ci-deployer` configuration have not been verified for this
   purpose and must not be assumed authorized.
4. Implement a transactional outbox with stable event IDs and an
   ADC-authenticated, least-privilege publisher; publish only to the
   designated topic with `pubsub.topics.publish`. For authenticated push,
   verify Google's signed ID token, exact configured audience and allowed
   push service-account identity, and restrict Cloud Run invocation. Reuse
   `server/authorization/googleServiceIdentity.ts` only after a security
   review of its suitability for this endpoint. Pub/Sub's push identity
   authenticates delivery, not the original PIAM publisher. Configure the
   Pub/Sub service agent and push identity as required by Google Cloud;
   verify precise grants against the deployed subscription and service.
   Pull delivery instead requires a subscriber with
   `pubsub.subscriptions.consume` on the designated subscription; do not
   grant that permission merely for push.
5. Add durable processing leases, recovery and a continuation outbox.
   A GitHub App or other approved narrowly scoped identity must initiate
   continuation without a manual dispatch, from a trusted protected revision.
   Treat dispatch as at-least-once: persist the dispatch intent before
   sending, deduplicate consumers, reconcile ambiguous sends, and never trust
   event payloads as authorization. Record separate PIAM and GitHub
   authorization evidence. Configure the project-creation GitHub Environment
   and prevent self-review; check that its actual reviewer identities are
   authorized. If protection is unavailable, project creation stays blocked.
6. Bind the project request and both decisions to immutable tenant, project,
   operation, contract hash, organization/folder, billing limits and exact
   bootstrap scope. Verify PIAM evidence independently before the GitHub
   review and revalidate expiry, revocation, scope and both authorizations
   immediately before execution. Handle revocation and older messages without
   turning a previous approval back on. Make external operations idempotent
   and reconcile unknown provider outcomes before retrying.
7. Implement and independently test actual scoped project creation,
   registration and the existing-project provisioning adapters. Verify
   organization placement, billing, IAM, database isolation, storage,
   application health and resource ownership against real staging resources.
   Only after this and explicit activation approval should the workflow change
   to allow routine, policy-authorized operations without human review.

The existing GitHub deployment workflows use WIF and a deployment service
account; neither their identities nor permissions were changed. No cloud
resources or IAM grants were inspected live or modified. A production
rollout requires separate project, billing, security, PIAM, repository and
infrastructure-owner approvals. Dead-letter queues and retries require
operator monitoring; no automatic deletion is safe for ambiguous resources.
