# PIAM Human-in-the-Loop GitHub Actions Runbook

## Current behavior

`.github/workflows/piam-human-in-the-loop.yml` is a manually dispatched, read-only governance workflow. It validates controlled request inputs, requires a run from protected `main`, runs the repository TypeScript, unit, PostgreSQL acceptance, and build checks against disposable PostgreSQL, records PIAM as `PIAM_UNAVAILABLE`, and then pauses at the `piam-review` GitHub Environment. Repository mode reruns provisioning/governance tests after review. Infrastructure mode always ends blocked; the workflow has no cloud credentials, OIDC permission, resource mutation step, or deploy operation.

The GitHub Environment decision is human authorization for this workflow only. It never sets PIAM to approved and cannot authorize customer database/storage provisioning, project creation, IAM changes, Cloud Run changes, or production deployment. A successful repository-only run means checks completed; it does not mean PIAM or infrastructure is ready.

Same-repository issue and pull-request references are checked with GitHub's read-only API. `approval:<id>` references fail closed because there is no PIAM approval lookup API. The workflow performs no source edits and does not create branches or pull requests.

## Repository administrator setup

Before enabling manual runs:

1. Protect `main` with pull-request-only changes, required current CI checks, stale approval dismissal, no force pushes, and restricted bypass. Confirm the organization ruleset also reports the branch as protected; preflight rejects an unprotected ref.
2. Create the `piam-review` GitHub Environment. Add the designated human infrastructure/security reviewers as required reviewers; enable **Prevent self-review** where GitHub supports it; restrict deployments to the protected `main` branch. Do not select the workflow initiator as the only reviewer. GitHub's deployment record is the source for reviewer identity because the job context does not expose it.
3. Create `provisioning-staging` and `provisioning-production` Environments with separate, authorized reviewer sets and protected-branch restrictions. They are reserved for future activation. The current workflow can reach the staging/production infrastructure gate only if PIAM reports verified, and that gate still deliberately exits without making changes.
4. Do not attach secrets or service-account credentials to these Environments. Do not grant this workflow `id-token: write`. It has no need for Google Cloud access.
5. Restrict access to workflow runs and downloaded artifacts to trusted repository members. Reports have a 90-day artifact retention and contain identifiers/statuses only, not approval payloads, credentials, or tokens.

GitHub environment protection is configured in repository settings, not by workflow YAML. The preflight makes a read-only GitHub API check that `piam-review` has a required-reviewer rule, self-review prevention, and protected-branch restrictions; infrastructure requests also require the selected `provisioning-staging` or `provisioning-production` environment to pass the same check. A repository administrator must still verify that the configured users/teams are the designated reviewers before treating the gate as active. Where the self-review control is unavailable, preflight fails rather than weakening the gate.

## Dispatch procedure

Use **Actions → PIAM Human-in-the-Loop Governance → Run workflow** on `main`. Supply the request and tenant UUIDs (or the CIPA request identifier), a listed operation, `staging` or `production`, remediation mode, an optional project ID for infrastructure requests, and a same-repository issue/PR reference. Approval-record references are rejected until PIAM lookup is implemented.

Repository mode is limited to `verify_only` and `repository_remediation`. It validates the branch, clean checkout, migrations, runtime role/RLS acceptance suite, TypeScript, unit tests, and production builds. After Environment review, it reruns the provisioning and workflow unit tests. No source modifications are made.

Infrastructure mode accepts only the listed resource operations and requires a syntactically valid project ID. The run executes no infrastructure operation. It records `PROVISIONING_BLOCKED`, publishes the audit report, and exits unsuccessfully while PIAM remains unavailable. Do not interpret that expected blocked result as a deployment failure that should be bypassed.

The JSON report is uploaded as a workflow artifact and summarized in the run. It includes repository/commit/run identity, requester, inputs, human authorization outcome, PIAM status, test and remediation status, state transitions, and blockers. The human reviewer identity must be read from GitHub's deployment audit trail.

## Workflow state controls

The governance state machine is implemented in `scripts/piam-governance/governance.mjs` and covered by `governance.test.mjs`. It forbids `PIAM_UNAVAILABLE → PIAM_VERIFIED`. Human approval can follow an unavailable PIAM result but cannot change that PIAM result; infrastructure remains blocked. Tests that require an external PIAM authority are not represented as passed—the external adapter and staging integration do not exist.

## Activation prerequisites

Staging repository-governance use requires verified `main` protection and configured `piam-review` reviewers. Run the workflow first with `verify_only` and repository mode. Staging infrastructure activation additionally requires an independently implemented and tested PIAM adapter, durable one-time consumption/replay protection, resource-scoped approvals, and a reviewed infrastructure job with a dedicated least-privilege identity. None is enabled here.

Production activation additionally requires all staging prerequisites, a separately approved production PIAM policy and GitHub reviewer group, independently reviewed production change plan, verified project/tenant/resource scope, staging end-to-end evidence, rollback/recovery plan, and a separately authorized deployment identity. This implementation changes no production resources or IAM.
