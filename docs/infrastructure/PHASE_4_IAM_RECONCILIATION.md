# Phase 4 IAM reconciliation: preliminary repository evidence

**Status: blocked; not ready for acceptance or IAM remediation.** This is a
repository-only review, not a GCP inventory. The review environment had no
`gcloud` CLI, Google application default credentials, Cloud SDK configuration,
or reachable Google metadata server. No live GCP configuration or IAM policy
was inspected, and no IAM changes were made. Repository claims, names and
scripts below are not evidence that resources or grants exist.

The target supplied for live verification is project
`curious-subject-477114-e4` (number `797788066041`), region `europe-west1`.
Record the date, active reviewer, project number, API failures and authorization
limits with the eventual live evidence. Never collect secret values or key
material.

## A. Service-account inventory

The following are **candidates for discovery**, not discovered accounts.
Existence, numeric unique ID, display name, description, creation time,
disabled state, owner, user-managed key metadata and age, attached workloads,
direct and inherited grants, impersonation, activity and operational status are
all unknown. Key listings cannot establish whether an externally held copy
exists. An absence of available authentication logs does not prove an account
is unused.

| Candidate | Repository evidence or intended responsibility |
| --- | --- |
| `vertex-express` | Foundation script reports the legacy Curriculum Server frontend runtime. Preserve its attachment pending live review. |
| `cf-frontend-runtime` | Foundation script reports the Curriculum Flow frontend runtime. |
| `backend-runtime` | Foundation script reports the unified backend runtime; AI configuration also names this as its intended runtime. |
| `provisioning-agent-runtime` | Foundation script reports the provisioning agent runtime. Another register refers to `curriculum-provisioning-agent-runtime`; resolve the conflict from live configuration. |
| `curriculum-ci-deployer` | GitHub workflows configure this identity for federation; actual trust and use are unknown. |
| `project-factory`, `infrastructure-deployer`, `domain-manager`, `provisioning-orchestrator` | Foundation script and architecture documents identify separate proposed provisioning responsibilities. Their existence, owners and attachments are unknown. |
| `provisioning-controller` | Foundation script says to preserve this separately; existence and purpose are unverified. |
| `cs-frontend-runtime` | Older architecture documents identify this frontend identity, in conflict with the foundation script. Existence and attachment are unverified. |
| Tenant database provisioner | A responsibility to investigate; no specific account is established by this review. |
| Cloud Build identities and Google-managed service agents | Not identified by repository configuration. Discover separately; do not classify service agents as ordinary runtime identities. |

Sources: `deploy/provision-curriculum-gcp-foundation.sh:13-19,171-206`;
`docs/infrastructure/CIPA_CREDENTIALS_REGISTER.md:8`;
`docs/architecture/SERVICE_IDENTITY_AND_IAM_MATRIX.md:8-15`;
`.github/workflows/deploy-curriculum-server.yml:32-38`;
`server/ai/modelConfig.ts:3-13`.

## B. Workload identity mapping

| Workload | Repository-reported or configured identity | Live runtime, deployer, build and caller identities |
| --- | --- | --- |
| Cloud Run `curriculum-server` | `vertex-express` in foundation script; older report says `cs-frontend-runtime` | All unknown; resolve conflicting claims without changing the attachment. |
| Cloud Run `curriculum-flow` | `cf-frontend-runtime` in foundation script | All unknown. |
| Cloud Run `unified-backend` | `backend-runtime` in foundation script | All unknown. Older reports instead refer to `curriculum-backend`. |
| Cloud Run `curriculum-provisioning-agent` | `provisioning-agent-runtime` in foundation script | All unknown. |
| GitHub Actions frontend workflows | Configure federation to `curriculum-ci-deployer` | Live provider trust and effective principal unknown. |
| Cloud Build | `cloudbuild.yaml` builds, pushes and deploys both frontend images | Trigger and actual build execution identity unknown. |
| Other services, jobs, builds, triggers, workflows, Scheduler, Tasks, Pub/Sub, storage, secrets, Vertex AI and Cloud SQL | Not inventoried | Unknown; enumerate all locations and identify actual service attachments and callers. |

Sources: `deploy/provision-curriculum-gcp-foundation.sh:13-17`;
`docs/infrastructure/PHASE_1_INFRASTRUCTURE_REPORT.md:10-23`;
`cloudbuild.yaml`; `.github/workflows/deploy-curriculum-flow.yml:32-38,64-68`.
Configuration files are not proof a build or deployment ran.

## C. Responsibility matrix and provisional role map

This is an assessment framework, **not an approved or final grant list**.
Every existing status below is unknown. No proposed action authorizes a grant
or removal. Determine named owners and verify operations before choosing roles.

### Permanent runtime candidates

| Service account | Intended responsibility | Resource scope | Candidate role or permission | Existing status | Proposed action and reason |
| --- | --- | --- | --- | --- | --- |
| Frontend runtimes, including legacy `vertex-express` if attached | Serve frontend workloads | Only verified dependencies | To be determined | Unknown | Inspect actual calls and grants. Investigate AI, backend secret, database, IAM and impersonation access; do not remove anything before dependency review. |
| `backend-runtime` | Backend execution and central AI gateway | Actual Vertex project/location; individually referenced secrets and other verified resources | To be determined from actual operations; Secret Manager accessor is a candidate only for a secret actually consumed through Secret Manager | Unknown | Verify attachment, ADC mode, APIs, model operations, resource scopes and effective access. Preserve configured Supabase/database connectivity and credentials. |
| `provisioning-agent-runtime` | Current agent execution only | Verified current dependencies | To be determined | Unknown | Separate current use from future provisioning; do not grant project creation, owner or IAM administration by assumption. |

### Deployment-only candidates

| Service account | Intended responsibility | Resource scope | Candidate role or permission | Existing status | Proposed action and reason |
| --- | --- | --- | --- | --- | --- |
| `curriculum-ci-deployer` | Approved CI operations, if verified | Specific deployed services, image repository and runtime accounts | `roles/run.developer`, `roles/artifactregistry.writer`, and `roles/iam.serviceAccountUser` are script candidates, not verified minima | Unknown | Establish actual workflow operations and scopes; assess each grant, including `actAs`, independently. Database provisioning workflow separately configures this identity, so its actual responsibilities require review. |
| Actual Cloud Build execution identity | Build, push and possibly deploy, if triggers execute `cloudbuild.yaml` | Actual source, logs, repository, deployment targets and runtime accounts | To be determined | Unknown | Identify build and trigger accounts and required handoff before proposing access. |
| `infrastructure-deployer` | Explicitly approved infrastructure deployments, if any | Actual approved targets | To be determined | Unknown | Confirm whether it exists and is used; keep separate from CI and runtime responsibilities. |

### Temporary remediation

None identified or proposed. An operational failure alone does not justify a
broad temporary grant. Record any future proposal's expiry, owner and rollback.

### Future Phase 5

`project-factory`, `infrastructure-deployer`, `domain-manager`,
`provisioning-orchestrator`, `provisioning-controller`, and any actually
discovered tenant database provisioner require individual existence and
responsibility checks. Their appearance in code does not establish that they
exist, are reserved, or need present-day grants. Do not activate future
workflows or provision permissions in Phase 4.

## D. Existing IAM grants

No live bindings are known. Inventory allow and deny policies, conditions and
policy inheritance at organization, folder, project and applicable resource
scopes. Include service-account policies, secrets, buckets, Artifact Registry,
Cloud Run, queues, topics and subscriptions. Record group and federated principal
membership where visible. A denied or unsupported read is **unknown**, not an
empty policy. Resolve predefined and custom role permissions at review time;
consider IAM deny policies, principal access boundaries and conditions when
assessing effective access.

The foundation script *would reconcile* service-level `roles/run.developer`
for CI, account-level `roles/iam.serviceAccountUser` on two frontend accounts,
and repository-level `roles/artifactregistry.writer`; it also specifies backend
Pub/Sub publisher, Cloud Tasks enqueuer and individual-secret accessor bindings.
None is verified as present or necessary
(`deploy/provision-curriculum-gcp-foundation.sh:405-443,801-810`).

## E. Required IAM grants

No exact minimum permission set has been established. Map each verified API
operation to documented permissions, supported resource scope, existing effective
access and an operational owner. Evaluate custom roles only after verifying the
operations and the supported permissions; no custom role is proposed here.
In particular, `server/ai/geminiProvider.ts:41-62` supports both an API key
and Vertex AI ADC and calls `models.generateContent`. Configured backend
identity metadata is not proof of the Cloud Run attachment, current auth mode,
model availability, API enablement or live execution readiness.

## F. Excessive and risky permissions

No live excess grant has been verified. Investigate broad Owner, Editor, IAM
administration, service-account administration, token creation, broad Run
deployment, AI and project-level secret access, as well as combinations that
permit privilege escalation. Include inherited grants and impersonation chains.

The PostgreSQL provisioning script lists `backend-runtime`, `vertex-express`
and `curriculum-ci-deployer` for project-level `roles/cloudsql.client`, and
individual access to the configured runtime database URL and control-plane
secret; it separately specifies migration URL access for CI
(`deploy/provision-postgresql-databases.sh:51-62,666-690`). This is **script
intent, not a confirmed grant**. If applied, frontend and CI access warrants
particular review against actual database and migration responsibilities; do
not revoke it until dependencies and safe migration are established.

## G. Missing permissions

Unknown. Do not infer a missing grant from a role's absence without checking
inherited access, conditions, deny policies, the actual operation and runtime
configuration. Capture exact operation, error, principal and resource before
proposing a remedy.

## H. Impersonation and trust

No effective impersonation matrix has been verified. Inspect service-account
policies, inherited grants, custom roles, group membership and WIF bindings for
`iam.serviceAccounts.actAs`, `iam.serviceAccounts.getAccessToken`,
`iam.serviceAccounts.signBlob` and related token issuance. Verify frontend to
backend, runtime to infrastructure deployer, CI to each runtime, provisioning
agent to privileged principals, and infrastructure deployer to unrelated
identities. Examine Cloud Run invoker policies and actual internal authentication.

The foundation script intends a GitHub OIDC provider restricted to the named
repository and `main` ref and checks its mappings
(`deploy/provision-curriculum-gcp-foundation.sh:208-264`). That does not prove
the live provider, other providers, pool principals, branch protections or
environment restrictions are configured or effective.

## I. Secret access

No live secret names, references or accessor grants are verified. Inspect
metadata and policies without accessing secret versions. Map each actual
service's secret references to its runtime account, project-level and
individual-secret grants, and application use. The foundation and database
scripts contain candidate secret names and bindings, not an inventory.
`server/db/postgres.ts:66` and `server/db/tenantContext.ts:30` read database and
control-plane environment variables, respectively; this does not establish
their deployed source or a Secret Manager mapping. Do not expose values or
change credentials, and do not assume Supabase is hosted in this project.

## J. Phase 5 reservations

See the future Phase 5 candidates in section C. Classifying any account as
reserved requires live existence, ownership and intended-use evidence. Future
permissions and workflow implementation remain outside this phase.

## Required live discovery before acceptance

1. Authenticate a read-only reviewer in Cloud Shell and independently verify
   active account, project ID and project number. Inventory all user-managed
   accounts, Google-managed service agents, account metadata and key metadata;
   obtain activity evidence where accessible.
2. Enumerate services, jobs and revisions in all relevant regions; builds and
   triggers; workflows and schedulers; queues and dispatch identities; Pub/Sub;
   storage; secrets; Vertex resources; SQL; enabled APIs and other discovered
   resources. Record attachments, callers and deployment/build identities.
3. Collect resource-level and inherited allow/deny policies, conditions,
   effective impersonation and federated trust, including visibility gaps.
   Record secret references and policies only, never environment values,
   secret versions, tokens or private key material.
4. Reconcile owners, exact operations, current permissions, activity and
   conflicting repository claims. Investigate legacy accounts without declaring
   them obsolete solely from a lack of logs.
5. Present the evidence and complete role map to the human reviewer. Only then
   prepare ordered grant/removal commands with pre-checks, exact discovered
   principals and scopes, justification, duration, verification and rollback.
   Do not execute changes without explicit approval.
