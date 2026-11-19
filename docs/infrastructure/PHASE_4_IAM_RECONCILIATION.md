# Phase 4 IAM reconciliation: repository inspection and live-verification blockers

**Status: blocked; not ready for acceptance or IAM remediation.** This is a
repository-only review, not a GCP inventory. In this review environment,
`gcloud` is unavailable; the active Google Cloud account and credential
configuration therefore could not be queried. No Google credential-related
environment variables were present. No live GCP configuration or IAM policy
was inspected, and no IAM changes were made. Repository claims, names and
scripts below are not evidence that resources or grants exist.

The requested target is project `curious-subject-477114-e4`, region
`europe-west1`. A workflow config references project number `797788066041`;
verify that mapping live. Record the date, active reviewer, project number, API
failures and authorization limits with the eventual live evidence. Never collect
secret values or key material.

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

## K. Repository inspection update (2026-11-19)

PR #20 is merged. This update inspects the deployment scripts, Cloud Run
specifications, workflows, Cloud Build file, database integrations, billing
runtime and provisioning references in the checked-out `main` branch. It does
**not** change the live-evidence status above. Because `gcloud` is unavailable,
the active account and credential configuration could not be queried, and no
GCP IAM, resource, attachment, key, API or secret metadata was inspected. The
project ID, project number, region and all emails below are repository-configured
values or candidates, not independently verified live facts.

### K.1 Identity inventory and workload mapping

| Candidate identity / email | Repository-declared purpose and workload mapping | Inventory status |
| --- | --- | --- |
| `curriculum-ci-deployer@curious-subject-477114-e4.iam.gserviceaccount.com` | Configured by the two frontend deployment workflows and the PostgreSQL workflow through the same WIF provider. The PostgreSQL workflow can also run the GCP Cloud SQL provisioning path. | Email and workflow references verified in source; account existence, WIF trust, keys, grants and actual workflow use unknown. One principal combines application deployment and database provisioning. |
| `vertex-express@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script claims `curriculum-server` runtime; database script also grants it Cloud SQL Client and access to runtime URL/control-plane secrets. | Candidate only. Conflicts with the Cloud Run YAML's different account/project and older `cs-frontend-runtime` reports. |
| `cf-frontend-runtime@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script claims `curriculum-flow` runtime; CI is configured for `actAs` on this account. | Candidate only. Conflicts with Cloud Run YAML's different account/project. |
| `backend-runtime@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script claims `unified-backend` runtime; database script lists it for Cloud SQL Client and runtime/control-plane secret access; foundation script adds Pub/Sub, Tasks and logistics-secret candidates. | Candidate only; no checked-in Cloud Run service specification or workflow establishes the live attachment. |
| `billing-payments-runtime@curious-subject-477114-e4.iam.gserviceaccount.com` | Billing deployment script explicitly selects it for `curriculum-billing-payments`; foundation script grants it `roles/billing.viewer`; deployment script binds the billing database, control-plane and provider secrets it finds. | Candidate only; deployment script is not evidence that the service was deployed or that any binding exists. |
| `provisioning-agent-runtime@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script claims `curriculum-provisioning-agent` runtime. Other documents use the name `curriculum-provisioning-agent-runtime`. | Candidate only; naming conflict and live attachment unresolved. |
| `curriculum-server-runner@curriculum-server-prod.iam.gserviceaccount.com` | Runtime account in `curriculum-server-service.yaml`, for service `curriculum-server-frontend` in `europe-west2`. | Literal YAML candidate only. It names a different project and region than the task target and the Actions deployment (`curriculum-server`, `europe-west1`). Do not adopt or replace it without live verification. |
| `curriculum-flow-runner@curriculum-server-prod.iam.gserviceaccount.com` | Runtime account in `curriculum-flow-service.yaml`, for service `curriculum-flow-frontend` in `europe-west2`. | Literal YAML candidate only; same project, region and service-name conflicts as above. |
| `payment-provider-provisioner-runtime@PROJECT_ID.iam.gserviceaccount.com` | Placeholder runtime account in the Cloud Run Job specification for `curriculum-payment-provider-provisioner`. | Not an exact email until the template is rendered; no evidence the job or account exists. |
| `project-factory@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script proposes this as customer-project factory identity. | Script candidate only; no workload or active permission is established. |
| `infrastructure-deployer@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script and payment-provider architecture reserve infrastructure deployment to this identity. | Script/documentation candidate only; no deployed workload is established. |
| `domain-manager@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script proposes domain/DNS management identity. | Script candidate only; no workload or active permission is established. |
| `provisioning-orchestrator@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script proposes a Cloud Workflows orchestration identity. | Script candidate only; no Workflows execution is established. |
| `cloud-billing-operator@curious-subject-477114-e4.iam.gserviceaccount.com` | Foundation script names a separately authorized billing operator and grants it no billing role. Application code explicitly rejects direct billing association and refers to this operator. | Script/application intent only; no live account, operator process or grant is established. |
| `provisioning-controller` | Mentioned as a separate identity to preserve; no exact email is configured in the inspected scripts. | Name only; exact principal, owner, workload and existence unknown. |
| `cs-frontend-runtime`, `curriculum-backend`, `curriculum-provisioning-agent-runtime` | Older infrastructure reports use these names; the last is also in the credentials register. | Conflicting historical names; no exact account email or current attachment established. `curriculum-backend` is a workload name, not proof of an account. |
| Tenant database provisioner | No dedicated account is configured. The GCP workflow path uses `curriculum-ci-deployer`; the direct-PostgreSQL path uses GitHub-stored database credentials and does not establish a GCP identity. | No separate provisioner identity is established. Separation from ordinary CI deployment is not implemented in the inspected workflow. |
| Cloud Build execution identity and Google-managed service agents | `cloudbuild.yaml` builds, pushes and deploys two frontend services but specifies no `serviceAccount`. | Exact trigger/build principal and service-agent identities must be discovered live. Do not infer the default account. |
| Manual foundation, billing and central-database deployers | The shell scripts use the active `gcloud`/Application Default Credentials of whoever runs them; the scripts do not select a dedicated deployment identity. The central database script can use Cloud SQL Auth Proxy. | Exact caller identity is not in source; no workflow reference to the billing or central-database deployment scripts was found in the inspected workflows. Discover execution records and distinguish the operator from each workload runtime. |

Sources: `deploy/provision-curriculum-gcp-foundation.sh:13-20,176-213`;
`deploy/provision-postgresql-databases.sh:51-62,666-690`;
`deploy/deploy-billing-payments.sh:16-39,106-143`;
`deploy/deploy-central-curriculum-textbook-databases.sh:1-20,148-171`;
`deploy/cloud-run/curriculum-server-service.yaml:1-21`;
`deploy/cloud-run/curriculum-flow-service.yaml:1-21`;
`deploy/cloud-run/curriculum-payment-provider-provisioner-job.yaml:1-27`;
`.github/workflows/deploy-curriculum-server.yml:32-39,60-70`;
`.github/workflows/deploy-curriculum-flow.yml:32-39,60-70`;
`.github/workflows/provision-postgresql-databases.yml:32-43,120-172`;
`cloudbuild.yaml:1-101`; `docs/infrastructure/PHASE_1_INFRASTRUCTURE_REPORT.md:10-23`;
`docs/architecture/EXTERNAL_DEPLOYMENT_SPECIFICATIONS.md:7-11`.

### K.2 Configured permissions, resources and actual-versus-required status

The following are **repository-specified candidates**, not verified effective
grants. Every current grant, missing permission and excess permission remains
**unknown** until direct and inherited policies, conditions, denies and
resource-level policies are read. Required roles below are not approvals to
grant them.

| Principal | Candidate role / permission and resource | Purpose in inspected configuration | Current grants / missing / excess | Disposition |
| --- | --- | --- | --- | --- |
| CI deployer | `roles/run.developer` on each of `curriculum-server` and `curriculum-flow`; `roles/iam.serviceAccountUser` on `vertex-express` and `cf-frontend-runtime`; `roles/artifactregistry.writer` on repository `curriculum-registry` in `europe-west1` | Foundation script's GitHub deploy design. Workflows deploy those two services and images. | All live states unknown. Service names and runtime identities conflict with the YAML specifications. | Verify actual deploy mechanism, service and account policies before proposing any grant or removal. |
| CI deployer / tenant DB provisioner | `roles/cloudsql.client` at project scope and `roles/secretmanager.secretAccessor` on configured runtime/control-plane secrets; migration URL secret access is separately specified for CI | PostgreSQL script's intended access. The workflow can run live Cloud SQL provisioning and migrations on pushes to `main` when its GCP path is selected. | All live states unknown. Actual provisioning operations include API enablement, SQL instance/database/user operations, secret creation/access/version writes and IAM reconciliation; the source does not establish a minimum role set for that workflow. | High-priority separation-of-duties review. Do not grant the deployment identity project-wide database/secret administration to make this workflow pass. Split identities only after workload ownership and operational design are approved. |
| `vertex-express` | `roles/cloudsql.client` at project scope; `roles/secretmanager.secretAccessor` on `curriculum-postgres-runtime-url` and `curriculum-control-plane-secret` | PostgreSQL script's intended binding to a frontend-named identity. | All live states unknown. The service identity matrix says frontend identities have no direct database access, contradicting this script. | Investigate service attachment and runtime database use before retaining or removing. |
| `backend-runtime` | `roles/cloudsql.client` at project scope; accessor on the two PostgreSQL runtime/control-plane secrets; `roles/pubsub.publisher` on `curriculum-bus-telemetry` and `curriculum-geofence-events`; `roles/cloudtasks.enqueuer` on `curriculum-logistics-notifications`; accessor on the two logistics secrets | Database and foundation scripts' intended runtime operations. Application database code consumes `DATABASE_URL` and `CONTROL_PLANE_SECRET`; foundation script states logistics integration is deferred where consumers are not verified. | All live states unknown; Cloud Run secret attachment and API calls are not established. | Verify each active operation and secret separately. Do not apply deferred logistics grants solely because the reconciliation script names them. |
| `cf-frontend-runtime` | `roles/iam.serviceAccountUser` binding for CI is specified; no runtime grant set is established. | Intended Flow runtime and CI deployment `actAs`. | All live states unknown; YAML instead names `curriculum-flow-runner@curriculum-server-prod`. | Resolve actual attachment and CI deploy path. |
| `billing-payments-runtime` | `roles/billing.viewer` at project scope; `roles/secretmanager.secretAccessor` at each configured billing database, control-plane and discovered provider secret | Foundation script's read-only billing proposal; billing deploy script wires the listed secret variables. The service calls Cloud Billing `projects/{id}/billingInfo` via its attached runtime identity. | All live states unknown. No broad billing-admin role is specified by the scripts; no live grant is verified. | Confirm the read endpoint's authorized project scope and each provider actually enabled. Do not grant billing administration to this runtime. |
| Cloud billing operator | No role is granted by the foundation script. Application direct association endpoint returns `403` and says an independently authorized operator is required. | Separation between billing read access and project billing association. | Account and all grants unknown. | Keep association disabled until an approved operator workflow and its exact API operation/resource are verified. |
| Payment provider provisioner runtime | Candidate `secretmanager.versions.access` on exact tenant intake secrets; `secretmanager.versions.add` on exact tenant destination secrets; `roles/run.invoker` on `curriculum-billing-payments` | Payment provisioning architecture; job YAML refers to one contract-signing secret. | All live states unknown; job template still contains placeholders and is described as not production-ready. | No grants until the job, caller and secret lifecycle are implemented and the exact tenant-scoped resources exist. |
| `project-factory`, `infrastructure-deployer`, `domain-manager`, `provisioning-orchestrator`, `provisioning-controller`, `provisioning-agent-runtime` | No current workload-specific role set can be established. Foundation script explicitly says it does not grant privileged project roles to several future identities. | Reserved or future provisioning duties. | Identity existence, live grants and use all unknown. | Do not activate or grant roles based only on architectural names. |
| Cloud Build execution identity | Artifact Registry push and Cloud Run deploy operations are in `cloudbuild.yaml`; no explicit build service account or runtime `--service-account` is declared. | Build, push and deploy two images. | Principal and all grants unknown. | Inspect build trigger and individual build metadata, then scope access to the actual repository, services and runtime service accounts. |
| Manual deployment / central database operator | Shell scripts perform API enablement, resource deployment, IAM reconciliation or Cloud SQL Auth Proxy operations using caller credentials; no dedicated account is selected. | Human/operator-run foundation, billing and central-database tasks. | Caller and all effective grants unknown. | Identify the real invoking principal from audit/build records. Do not attribute its privileges to the runtime service account named in a deployment script. |

The foundation script also lists APIs it would enable, including Cloud Run,
Artifact Registry, Cloud Build, IAM, STS, Pub/Sub, Cloud Tasks, Secret Manager
and Cloud Billing. These are project configuration candidates, not per-account
permissions or proof that an API is enabled. Cloud SQL operations in the
PostgreSQL script require separate live API and permission review.

API/operation candidates visible in source are: GitHub federation through STS
and service-account impersonation; Cloud Run and Artifact Registry for CI and
Cloud Build deployment; Cloud SQL Admin and Secret Manager for PostgreSQL
provisioning; Cloud SQL connectivity and Secret Manager for database runtimes;
Pub/Sub and Cloud Tasks for the deferred backend logistics integration;
Vertex AI for the backend's optional ADC model path; and Cloud Billing's
`projects/{projectId}/billingInfo` read for the billing runtime. The payment
provisioner design also names Secret Manager version access/creation,
Cloud Run Job execution and invocation of the billing service. These are
operation/API candidates, not a verified per-identity API enablement or a
complete list of required IAM permission strings. Establish the exact
permissions from actual calls, role definitions, resource policies and
observed errors before designing grants; no operational error evidence is
available in this review.

### K.3 Secret access map

No secret metadata or IAM policy was read. The names below are configuration
references only; do not access secret versions or print values during
reconciliation.

| Secret / source | Configured consumer or purpose | Candidate principal / scope | Verified access |
| --- | --- | --- | --- |
| `curriculum-postgres-runtime-url` | `DATABASE_URL` for PostgreSQL runtime; database script binds it to its runtime-account list. | Script proposes `backend-runtime`, `vertex-express`, and CI at individual-secret scope. | Unknown. Frontend and CI access are unverified and require dependency review. |
| `curriculum-postgres-migration-url` | Migration connection; database script specifies CI access. | CI service account, individual secret. The workflow also has an alternative GitHub `MIGRATION_DATABASE_URL` secret path. | Unknown; source does not prove which workflow branch ran. |
| `curriculum-control-plane-secret` | HMAC signing secret consumed through `CONTROL_PLANE_SECRET`; PostgreSQL script binds its runtime list, and billing deployment binds it to the billing runtime. | Backend/`vertex-express`/CI per database script; billing runtime per billing deployment script, individual secret. | Unknown; deployed secret references and policies not inspected. |
| `curriculum-billing-postgres-runtime-url` | Billing service's `DATABASE_URL`; billing deployment rejects reuse of the unified runtime URL. | Billing runtime only, individual secret per deployment script. | Unknown. |
| Paystack, Flutterwave, OPay, Interswitch and bank-transfer secret names listed in `deploy-billing-payments.sh` | Billing provider API/webhook environment variables. Script attaches a matching secret if it exists. | Billing runtime, individual secret; actual enabled provider and use must be narrowed. | Unknown; the script's presence test is not a live access inventory. |
| `curriculum-logistics-gps-provider-config`, `curriculum-logistics-notification-provider-config` | Foundation script's deferred logistics integration. | Backend runtime, individual secrets, candidate only. | Unknown; script says provider credentials and verified consumers are deferred. |
| `curriculum-payment-provider-contract-key` | Payment provider job template's contract-signing environment value. | Job runtime, individual secret, placeholder project. | Unknown; job is not established as deployed. |
| Tenant-specific payment intake/destination secrets | Payment-provider architecture's per-tenant credentials. | Provisioner runtime; candidate read of exact intake secret and version creation on exact destination secret. | Unknown; no deployed job, secret policy or live tenant secret inventory. |
| GitHub Actions repository secrets (`MIGRATION_DATABASE_URL`, `RUNTIME_DATABASE_URL`, `CONTROL_PLANE_SECRET`, `RUNTIME_DB_PASSWORD`) | Direct PostgreSQL workflow path, not GCP Secret Manager. | GitHub Actions job scope; no GCP principal is established for this direct connection path. | Repository configuration only; GitHub secret values were not inspected. |

### K.4 GitHub, Cloud Build and attachment findings

- Frontend and PostgreSQL workflows declare `contents: read` and
  `id-token: write`, then use `google-github-actions/auth@v2` with the
  configured WIF provider and the CI service account. No long-lived
  service-account key is configured in these workflow files. The foundation
  script intends a repository-and-`main`-ref OIDC condition and a
  `roles/iam.workloadIdentityUser` binding. The live provider, mappings,
  conditions, impersonation binding, other trust paths and branch protections
  are unverified.
- The PostgreSQL workflow shares the CI principal with frontend deployment.
  Its `main`-branch GCP path sets `--apply --yes` unless the manual dry-run
  input is true; a separate branch uses GitHub database secrets for direct
  PostgreSQL. This is a material privilege-separation and change-approval risk,
  not proof that the workflow has successfully run.
- `cloudbuild.yaml` uses build, push and `gcloud run deploy` steps but does not
  declare a Cloud Build service account, runtime service account, trigger or
  conditions. The actual build identity and deployment actor must come from
  live triggers/build records. Do not treat the Cloud Build default account as
  verified.
- The checked-in Cloud Run service YAMLs specify `europe-west2`, service names
  ending in `-frontend`, and runtime emails in project `curriculum-server-prod`.
  The Actions and foundation configuration use project
  `curious-subject-477114-e4`, region `europe-west1`, and service names without
  `-frontend`. The payment Job YAML has unresolved project/region/image
  placeholders. These are spec conflicts; none establishes a deployed
  attachment.
- The foundation script's comments call its mappings "preserved live" but the
  same repository has conflicting identities and service specs. Treat those
  comments as claims requiring live confirmation, not attachment evidence.
  No identity is recommended for replacement in this report.

### K.5 Remediation commands, approval and acceptance

No permission-changing command is safe to generate from this evidence. For
every principal, the exact current effective grant, missing permission, excess
grant, resource existence and workload attachment are unknown. Supplying
`add-iam-policy-binding` or `remove-iam-policy-binding` commands now would
invent missing/excess access and could change production policy. Therefore:

- **Proposed grants/revocations:** none; no principal/role/resource change is
  approved, and none is classified as permanent or temporary.
- **Per-identity command groups:** blocked until the read-only inventory
  establishes the exact principal and resource. For each discovered identity,
  first run `gcloud iam service-accounts describe EMAIL --project=PROJECT_ID`
  and `gcloud iam service-accounts get-iam-policy EMAIL --project=PROJECT_ID
  --format=json`, then capture project and applicable resource policies,
  conditions, deny policies and inherited bindings. These are inspection
  commands only, not remediations.
- **Future command record:** every later proposed binding must state principal,
  exact role and included permissions, exact resource, purpose, existing
  binding state, verified missing/excess permission, permanent/temporary
  duration, approver, change ticket, pre-check, post-check and rollback. Do not
  execute before explicit approval.
- **Acceptance:** incomplete/blocked. The repository inventory is documented,
  but actual account existence, all workload identities, live bindings,
  effective permissions, secrets, APIs, service attachments, IAM excess/missing
  grants, Google-managed service agents and an auditable approval record are
  not verified. No Owner or Editor grant is proposed or introduced by this
  documentation update; absence of such live grants is unknown. No production
  IAM or workload changes were made.
