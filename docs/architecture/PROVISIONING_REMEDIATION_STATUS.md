# Provisioning Remediation Status

## Recovery

The worktree was clean on `main` at `8c33094587965d9b47bb03b3c7f409cecf4650c2`. There were no staged or unstaged changes, untracked files, merge conflicts, or partial migration files. The checkout contains only a shallow/grafted HEAD commit, and no prior Copilot task UUID was available to query its live status. No repository reset, history rewrite, or production GCP operation was performed.

The tracked `.aistudio/artifacts/.../implementation_plan.md` is a Phase 1 frontend separation plan last updated on 2026-11-01; it does not describe this provisioning remediation or an unfinished implementation.

The existing TypeScript GCP provisioning engine and its client remain in place. Fabricated job/resource inventory, simulated execution, and the client-side approval-token decommission flow were removed. The execution and inventory APIs now fail closed when the durable store or authenticated server-side execution adapter is unavailable. Customer onboarding will not mark an instance activation-ready after an unverified provisioning result, and activation verification no longer marks security, DNS, or health checks successful without evidence.

CIPA readiness now reports unavailable dependencies rather than claiming that PostgreSQL, PIAM, or the orchestrator is operational. CIPA request and approval endpoints are authenticated and unavailable until durable persistence and the trusted approval controls exist. A client-supplied approver identity or approval token cannot authorize provisioning through these endpoints.

## Not implemented

- There is no server-side PostgreSQL runtime pool or PIAM schema beyond the repository's existing initial control-plane migration.
- The repository's current server auth is a custom HMAC tenant token mechanism; no trusted external MFA provider integration or verified MFA assurance is present. No MFA verifier was added or claimed operational.
- CIPA and IIAPE still lack durable request/profile/plan persistence and a canonical versioned provisioning contract.
- No production Cloud Run Job or Workflows adapter was implemented. Project Factory, Infrastructure Deployer, Domain Manager, actual resource verification, retries, and idempotent execution remain unavailable.
- No Google Cloud API connectivity, IAM permission, service-account, or real-resource operation was tested. Production deployment was not performed.

The application must remain unavailable for privileged provisioning until PostgreSQL persistence, trusted MFA verification, independently enforced PIAM, scoped execution adapters, and resource verification are implemented and tested together. Do not configure production credentials or enable privileged GCP operations as a workaround for these missing controls.

## Follow-up correction

The onboarding UI no longer treats request submission, payment API errors, provisioning API errors, or activation API errors as success. It does not generate activation tokens or links, and verification checks remain `unknown` or `unavailable` without evidence. Persisted legacy onboarding records are downgraded to blocked/unverified and their fabricated payment and activation artifacts are removed.

Architecture requests now carry an explicit IIAPE deployment target. Shared infrastructure plans exclude customer-project creation and are blocked because shared tenant-configuration and verification adapters are missing. Dedicated-project requests require explicit project-creation consent, a validated project ID and parent scope, and are blocked until independent PIAM authorization exists; billing association is not included in that approval. Other supported targets remain distinct and block when their target-specific adapters are absent.

Control-plane login and CIPA request operations remain unavailable: email-only super-admin token issuance has been disabled, CIPA uses only an authenticated session token, and no PIAM approval controls or in-memory approval path can authorize an operation. Payment checkout, verification, and readiness endpoints also return unavailable until trusted provider integrations exist. No production GCP resource, service identity, or IAM configuration was changed.

## Configuration and validation

No new secret or environment variable was introduced. The repository does not contain a sufficient authentication-provider integration or Cloud Run Job/Workflows execution configuration to specify valid provider settings or verify the listed service identities. The `gcloud` CLI is unavailable in this environment, so live service-account and IAM configuration was not inspected. Production IAM requirements therefore remain unverified and should be assessed read-only before any deployment.

`npm run lint`, `npm test` (17 unit tests), and `npm run build` passed. The build reports an existing large JavaScript chunk warning. No PostgreSQL, MFA-provider, PIAM, payment-provider, GCP integration, or end-to-end tests were run because those services and test environments are not configured. No real GCP operation was attempted.
