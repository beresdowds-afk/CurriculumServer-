
#!/usr/bin/env bash
#
# Curriculum Server — GCP foundation reconciliation
#
# Project:    curious-subject-477114-e4
# Region:     europe-west1
# Repository: beresdowds-afk/CurriculumServer-
#
# SAFE DEFAULT: read-only dry-run.
# Mutations require --apply and exact confirmation.
#
# Preserved live Cloud Run identity mappings:
# curriculum-server             -> vertex-express
# curriculum-flow               -> cf-frontend-runtime
# unified-backend               -> backend-runtime
# curriculum-provisioning-agent -> provisioning-agent-runtime
#
# provisioning-controller remains a separate identity.
#
# Usage:
# chmod +x deploy/provision-curriculum-gcp-foundation.sh
# ./deploy/provision-curriculum-gcp-foundation.sh
# ./deploy/provision-curriculum-gcp-foundation.sh --apply

set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:-curious-subject-477114-e4}"
REGION="${REGION:-europe-west1}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-beresdowds-afk/CurriculumServer-}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
WIF_POOL_ID="${WIF_POOL_ID:-github-actions-pool}"
WIF_PROVIDER_ID="${WIF_PROVIDER_ID:-github-actions-provider}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-curriculum-registry}"

MODE="dry-run"

usage() {
  sed -n '2,34p' "$0"
}

for arg in "$@"; do
  case "$arg" in
    --apply) MODE="apply" ;;
    --dry-run) MODE="dry-run" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "ERROR: Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  echo "FATAL: $*" >&2
  exit 1
}

run() {
  printf '  +'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$MODE" == "apply" ]]; then
    "$@"
  fi
}

require() {
  command -v "$1" >/dev/null 2>&1 ||
    die "Required command not found: $1"
}

require gcloud
require jq

log "Preflight"

ACTIVE_ACCOUNT="$(
  gcloud auth list \
    --filter='status:ACTIVE' \
    --format='value(account)' | head -n 1
)"

[[ -n "$ACTIVE_ACCOUNT" ]] ||
  die "No active gcloud account. Authenticate first."

gcloud projects describe "$PROJECT_ID" \
  --format='value(projectId)' >/dev/null ||
  die "Cannot access target project: $PROJECT_ID"

PROJECT_NUMBER="$(
  gcloud projects describe "$PROJECT_ID" \
    --format='value(projectNumber)'
)"

[[ "$PROJECT_NUMBER" =~ ^[0-9]+$ ]] ||
  die "Could not resolve project number."

echo "Active account : $ACTIVE_ACCOUNT"
echo "Project        : $PROJECT_ID ($PROJECT_NUMBER)"
echo "Region         : $REGION"
echo "Repository     : $GITHUB_REPOSITORY"
echo "Branch         : $GITHUB_BRANCH"
echo "Mode           : $MODE"

if [[ "$MODE" == "apply" ]]; then
  echo
  echo "This will enable APIs and create missing foundation resources."
  echo "It will NOT create customer projects, attach billing, deploy"
  echo "services, or modify existing Cloud Run service configurations."
  echo
  read -r -p "Type exactly 'APPLY CURRICULUM FOUNDATION': " CONFIRM
  [[ "$CONFIRM" == "APPLY CURRICULUM FOUNDATION" ]] ||
    die "Confirmation failed."
fi

REQUIRED_APIS=(
  artifactregistry.googleapis.com
  cloudbuild.googleapis.com
  cloudresourcemanager.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  run.googleapis.com
  sts.googleapis.com
  serviceusage.googleapis.com
)

log "Reconcile required APIs"

for api in "${REQUIRED_APIS[@]}"; do
  if gcloud services list \
      --enabled \
      --project="$PROJECT_ID" \
      --filter="config.name=$api" \
      --format='value(config.name)' | grep -Fxq "$api"; then
    echo "  [PRESENT] $api"
  else
    echo "  [MISSING] $api"
    run gcloud services enable "$api" \
      --project="$PROJECT_ID"
  fi
done

SERVICE_ACCOUNTS=(
  "vertex-express:Curriculum Server frontend runtime"
  "cf-frontend-runtime:Curriculum Flow frontend runtime"
  "backend-runtime:Unified backend runtime"
  "provisioning-agent-runtime:Provisioning agent Cloud Run runtime"
  "project-factory:Customer GCP project factory execution identity"
  "infrastructure-deployer:Infrastructure deployment execution identity"
  "domain-manager:Domain and DNS management execution identity"
  "provisioning-orchestrator:Cloud Workflows orchestration identity"
  "curriculum-ci-deployer:GitHub Actions CI deployment identity"
)

log "Reconcile service accounts"

for item in "${SERVICE_ACCOUNTS[@]}"; do
  sa_id="${item%%:*}"
  sa_desc="${item#*:}"
  sa_email="${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com"

  if gcloud iam service-accounts describe "$sa_email" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] $sa_email"
  else
    echo "  [MISSING] $sa_email"
    run gcloud iam service-accounts create "$sa_id" \
      --project="$PROJECT_ID" \
      --display-name="$sa_desc" \
      --description="$sa_desc"
  fi
done

echo
echo "  [PRESERVE] provisioning-controller remains separate."

POOL_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}"

ATTRIBUTE_CONDITION="assertion.repository == '${GITHUB_REPOSITORY}' && assertion.ref == 'refs/heads/${GITHUB_BRANCH}'"

log "Reconcile GitHub Workload Identity Federation pool"

if gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global >/dev/null 2>&1; then
  echo "  [PRESENT] WIF pool $WIF_POOL_ID"
else
  echo "  [MISSING] WIF pool $WIF_POOL_ID"
  run gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name="Curriculum Server GitHub Actions"
fi

log "Check GitHub WIF provider"

if gcloud iam workload-identity-pools providers describe \
    "$WIF_PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$WIF_POOL_ID" \
    --format=json > /tmp/curriculum-wif-provider.json 2>/dev/null; then

  ISSUER="$(jq -r '.oidc.issuerUri // empty' /tmp/curriculum-wif-provider.json)"
  CONDITION="$(jq -r '.attributeCondition // empty' /tmp/curriculum-wif-provider.json)"
  REPO_MAPPING="$(jq -r '.attributeMapping["attribute.repository"] // empty' /tmp/curriculum-wif-provider.json)"
  REF_MAPPING="$(jq -r '.attributeMapping["attribute.ref"] // empty' /tmp/curriculum-wif-provider.json)"
  SUBJECT_MAPPING="$(jq -r '.attributeMapping["google.subject"] // empty' /tmp/curriculum-wif-provider.json)"

  if [[ "$ISSUER" != "https://token.actions.githubusercontent.com" ||
        "$CONDITION" != "$ATTRIBUTE_CONDITION" ||
        "$REPO_MAPPING" != "assertion.repository" ||
        "$REF_MAPPING" != "assertion.ref" ||
        "$SUBJECT_MAPPING" != "assertion.sub" ]]; then
    die "Existing WIF provider differs from expected policy. Inspect manually; refusing to overwrite."
  fi

  echo "  [VALID] Existing provider configuration matches."
else
  echo "  [MISSING] WIF provider $WIF_PROVIDER_ID"

  run gcloud iam workload-identity-pools providers create-oidc \
    "$WIF_PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$WIF_POOL_ID" \
    --display-name="Curriculum Server GitHub Actions Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
fi

CI_SA="curriculum-ci-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

WIF_MEMBER="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${GITHUB_REPOSITORY}"

ensure_project_binding() {
  local role="$1"
  local member="$2"
  local policy

  policy="$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json)"

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
    echo "  [PRESENT] project $role -> $member"
    return
  fi

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition != null))' \
      <<<"$policy" >/dev/null; then
    die "Conditional project binding exists for $member / $role. Review manually."
  fi

  run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$member" \
    --role="$role" \
    --condition=None
}

ensure_sa_binding() {
  local sa_email="$1"
  local role="$2"
  local member="$3"
  local policy

  policy="$(gcloud iam service-accounts get-iam-policy \
    "$sa_email" --project="$PROJECT_ID" --format=json)"

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
    echo "  [PRESENT] $sa_email $role -> $member"
    return
  fi

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition != null))' \
      <<<"$policy" >/dev/null; then
    die "Conditional service-account binding exists for $sa_email / $role / $member."
  fi

  run gcloud iam service-accounts add-iam-policy-binding "$sa_email" \
    --project="$PROJECT_ID" \
    --role="$role" \
    --member="$member"
}

log "Reconcile GitHub-to-CI impersonation"

ensure_sa_binding "$CI_SA" \
  "roles/iam.workloadIdentityUser" \
  "$WIF_MEMBER"

ensure_service_binding() {
  local service="$1"
  local role="$2"
  local member="$3"
  local policy

  policy="$(gcloud run services get-iam-policy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --format=json)"

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
    echo "  [PRESENT] Cloud Run $service $role -> $member"
    return
  fi

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition != null))' \
      <<<"$policy" >/dev/null; then
    die "Conditional Cloud Run binding exists for $service / $role / $member."
  fi

  run gcloud run services add-iam-policy-binding "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --role="$role" \
    --member="$member"
}

ensure_repository_binding() {
  local repository="$1"
  local role="$2"
  local member="$3"
  local policy

  if ! gcloud artifacts repositories describe "$repository" \
      --project="$PROJECT_ID" \
      --location="$REGION" >/dev/null 2>&1; then
    echo "  [PENDING] Repository IAM binding after repository creation"
    run gcloud artifacts repositories add-iam-policy-binding "$repository" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --role="$role" \
      --member="$member"
    return
  fi

  policy="$(gcloud artifacts repositories get-iam-policy "$repository" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --format=json)"

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
    echo "  [PRESENT] Repository $repository $role -> $member"
    return
  fi

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition != null))' \
      <<<"$policy" >/dev/null; then
    die "Conditional repository binding exists for $repository / $role / $member."
  fi

  run gcloud artifacts repositories add-iam-policy-binding "$repository" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --role="$role" \
    --member="$member"
}


log "Reconcile CI permissions on application services"

CI_MEMBER="serviceAccount:${CI_SA}"

for service in curriculum-server curriculum-flow; do
  ensure_service_binding "$service" \
    "roles/run.developer" \
    "$CI_MEMBER"
done

RUNTIME_SAS=(
  "vertex-express@${PROJECT_ID}.iam.gserviceaccount.com"
  "cf-frontend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
)

log "Reconcile CI actAs on frontend runtime identities"

for runtime_sa in "${RUNTIME_SAS[@]}"; do
  ensure_sa_binding "$runtime_sa" \
    "roles/iam.serviceAccountUser" \
    "$CI_MEMBER"
done

log "Reconcile Artifact Registry"

if gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" >/dev/null 2>&1; then
  echo "  [PRESENT] $ARTIFACT_REPOSITORY ($REGION)"
else
  echo "  [MISSING] $ARTIFACT_REPOSITORY ($REGION)"

  run gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format=docker \
    --description="Curriculum Server container images"
fi
ensure_repository_binding "$ARTIFACT_REPOSITORY" \
  "roles/artifactregistry.writer" \
  "serviceAccount:${CI_SA}"
  
log "Read-only Cloud Run service inventory"

gcloud run services list \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='table(metadata.name,status.latestReadyRevisionName)' || true

log "Read-only Cloud Run job inventory"

gcloud run jobs list \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='table(metadata.name)' || true

log "Read-only Cloud Workflows inventory"

gcloud workflows list \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --format='table(name,state)' || true

log "Read-only Cloud Build trigger inventory"

gcloud builds triggers list \
  --project="$PROJECT_ID" \
  --format='table(name,disabled,serviceAccount)' || true

cat <<REPORT

============================================================
CURRICULUM SERVER FOUNDATION RECONCILIATION
============================================================

Project:             ${PROJECT_ID}
Project number:      ${PROJECT_NUMBER}
Region:              ${REGION}
Active account:      ${ACTIVE_ACCOUNT}
Mode:                ${MODE}

GitHub repository:   ${GITHUB_REPOSITORY}
GitHub branch:       ${GITHUB_BRANCH}

WIF pool/provider:   ${WIF_POOL_ID}/${WIF_PROVIDER_ID}
CI service account:  ${CI_SA}
Artifact Registry:   ${ARTIFACT_REPOSITORY}

PRESERVED CLOUD RUN IDENTITY MAPPINGS
-------------------------------------
curriculum-server             -> vertex-express
curriculum-flow               -> cf-frontend-runtime
unified-backend               -> backend-runtime
curriculum-provisioning-agent -> provisioning-agent-runtime

SECURITY BOUNDARIES
-------------------
- provisioning-controller remains separate and untouched.
- No privileged project roles granted to project-factory,
  infrastructure-deployer, domain-manager, or orchestrator.
- No customer project creation or billing association.
- No Cloud Run service/job deployment or scaling changes.
- No Workflow creation or execution.
- No DNS, domain, Cloud SQL, bucket, or secret mutation.
- No deletion or replacement of existing resources.
- Existing WIF provider is validated, not silently overwritten.

PENDING WORK
------------
Before real tenant provisioning, separately implement and test:
1. Durable CIPA/PIAM approval.
2. Correct job-to-service-account mappings.
3. Least-privilege job IAM.
4. Billing controls and approval enforcement.
5. Real provisioning adapters replacing simulated behavior.

============================================================
REPORT
