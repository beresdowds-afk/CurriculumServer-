
#!/usr/bin/env bash
#
# Curriculum Server — GCP Foundation Provisioner
#
# Architecture: CIPA + PIAM + separate service identities + GitHub WIF
# Project:      curious-subject-477114-e4
# Region:       europe-west1
# Repository:   beresdowds-afk/CurriculumServer-
#
# DEFAULT: dry-run. No mutations unless --apply is supplied.
#
# This script:
#   1. Checks the active GCP identity and target project.
#   2. Enables the APIs required by the documented platform architecture.
#   3. Creates the separate service identities if they do not exist.
#   4. Creates a GitHub Actions WIF pool/provider restricted to this repo's
#      main branch.
#   5. Allows that GitHub identity to impersonate curriculum-ci-deployer.
#   6. Grants the CI identity only project-scoped deployment permissions.
#   7. Grants CI serviceAccountUser only on the three runtime identities.
#   8. Creates the Artifact Registry repository referenced by cloudbuild.yaml
#      if it does not already exist.
#
# Deliberately NOT performed:
#   - No organisation-wide IAM grants.
#   - No project creation or billing association.
#   - No PIAM bypass or fabricated approval.
#   - No privileged roles granted to project-factory,
#     infrastructure-deployer, or domain-manager.
#   - No database, DNS, domain, secret, or customer resource mutation.
#   - No deployment of application code.
#   - No deletion or replacement of existing resources.
#
# Usage:
#   chmod +x deploy/provision-curriculum-gcp-foundation.sh
#   ./deploy/provision-curriculum-gcp-foundation.sh
#   ./deploy/provision-curriculum-gcp-foundation.sh --apply
#
set -Eeuo pipefail

# ---------------------------------------------------------------------------
# 1. CONFIGURATION — override with environment variables if required.
# ---------------------------------------------------------------------------

PROJECT_ID="${PROJECT_ID:-curious-subject-477114-e4}"
REGION="${REGION:-europe-west1}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-beresdowds-afk/CurriculumServer-}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"

WIF_POOL_ID="${WIF_POOL_ID:-github-actions-pool}"
WIF_PROVIDER_ID="${WIF_PROVIDER_ID:-github-actions-provider}"

ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-curriculum-registry}"

MODE="dry-run"

# ---------------------------------------------------------------------------
# 2. ARGUMENTS
# ---------------------------------------------------------------------------

for arg in "$@"; do
  case "$arg" in
    --apply)
      MODE="apply"
      ;;
    --dry-run)
      MODE="dry-run"
      ;;
    --help|-h)
      sed -n '2,45p' "$0"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# 3. LOGGING AND COMMAND EXECUTION
# ---------------------------------------------------------------------------

log() {
  printf '\n[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  echo
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

# ---------------------------------------------------------------------------
# 4. REQUIRED TOOL CHECKS
# ---------------------------------------------------------------------------

log "Checking local tools"

command -v gcloud >/dev/null 2>&1 ||
  die "Google Cloud CLI (gcloud) is not installed."

command -v jq >/dev/null 2>&1 ||
  die "jq is required. Install jq and run this script again."

gcloud version >/dev/null 2>&1 ||
  die "gcloud is not operational."

# ---------------------------------------------------------------------------
# 5. AUTHENTICATION AND PROJECT PREFLIGHT
# ---------------------------------------------------------------------------

log "Checking active Google Cloud account"

ACTIVE_ACCOUNT="$(
  gcloud auth list \
    --filter="status:ACTIVE" \
    --format="value(account)" 2>/dev/null | head -n 1
)"

[[ -n "$ACTIVE_ACCOUNT" ]] ||
  die "No active gcloud account. Authenticate before continuing."

echo "Active account: $ACTIVE_ACCOUNT"
echo "Target project: $PROJECT_ID"
echo "Region:         $REGION"
echo "GitHub repo:    $GITHUB_REPOSITORY"
echo "GitHub branch:  $GITHUB_BRANCH"
echo "Mode:           $MODE"

gcloud projects describe "$PROJECT_ID" \
  --format="value(projectId)" >/dev/null ||
  die "The target project cannot be accessed by the active account."

PROJECT_NUMBER="$(
  gcloud projects describe "$PROJECT_ID" \
    --format="value(projectNumber)"
)"

[[ "$PROJECT_NUMBER" =~ ^[0-9]+$ ]] ||
  die "Could not resolve the numeric GCP project number."

log "Project access confirmed"
echo "Project number: $PROJECT_NUMBER"

# ---------------------------------------------------------------------------
# 6. EXPLICIT APPLY CONFIRMATION
# ---------------------------------------------------------------------------

if [[ "$MODE" == "apply" ]]; then
  echo
  echo "WARNING: This will create or configure GCP foundation resources."
  echo "It will not create customer projects or bypass PIAM."
  echo
  echo "Type exactly: APPLY CURRICULUM FOUNDATION"
  read -r CONFIRMATION

  [[ "$CONFIRMATION" == "APPLY CURRICULUM FOUNDATION" ]] ||
    die "Confirmation did not match. No changes made."
fi

# ---------------------------------------------------------------------------
# 7. ENABLE REQUIRED GOOGLE CLOUD APIS
# ---------------------------------------------------------------------------

log "Checking/enabling platform APIs"

APIS=(
  artifactregistry.googleapis.com
  cloudbuild.googleapis.com
  cloudresourcemanager.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  run.googleapis.com
  sts.googleapis.com
  sqladmin.googleapis.com
  secretmanager.googleapis.com
  storage.googleapis.com
  dns.googleapis.com
  certificatemanager.googleapis.com
  compute.googleapis.com
  serviceusage.googleapis.com
)

for api in "${APIS[@]}"; do
  if gcloud services list \
      --enabled \
      --project="$PROJECT_ID" \
      --filter="config.name=$api" \
      --format="value(config.name)" | grep -Fxq "$api"; then
    echo "  [EXISTS] $api"
  else
    echo "  [ENABLE] $api"
    run gcloud services enable "$api" \
      --project="$PROJECT_ID"
  fi
done

# ---------------------------------------------------------------------------
# 8. CREATE SEPARATE SERVICE IDENTITIES
# ---------------------------------------------------------------------------
#
# The privileged identities are created without privileged IAM roles.
# Their permission grants remain subject to PIAM and a separately verified
# approval/execution workflow.
#
# The IDs below follow the repository's IAM architecture.
# ---------------------------------------------------------------------------

log "Creating separate service identities where absent"

SERVICE_ACCOUNTS=(
  "cs-frontend-runtime:Curriculum Server frontend runtime"
  "cf-frontend-runtime:Curriculum Flow frontend runtime"
  "backend-runtime:Unified backend runtime"
  "project-factory:Customer GCP project factory"
  "infrastructure-deployer:Infrastructure deployment agent"
  "domain-manager:Domain and DNS management agent"
  "provisioning-orchestrator:CIPA provisioning workflow orchestrator"
  "curriculum-ci-deployer:GitHub Actions CI deployment identity"
)

for item in "${SERVICE_ACCOUNTS[@]}"; do
  SA_ID="${item%%:*}"
  SA_DESCRIPTION="${item#*:}"
  SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

  if gcloud iam service-accounts describe "$SA_EMAIL" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [EXISTS] $SA_EMAIL"
  else
    echo "  [CREATE] $SA_EMAIL"
    run gcloud iam service-accounts create "$SA_ID" \
      --project="$PROJECT_ID" \
      --display-name="$SA_DESCRIPTION" \
      --description="$SA_DESCRIPTION"
  fi
done

# ---------------------------------------------------------------------------
# 9. CREATE GITHUB WORKLOAD IDENTITY FEDERATION
# ---------------------------------------------------------------------------

log "Checking GitHub Actions Workload Identity Federation"

if gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
    --project="$PROJECT_ID" \
    --location="global" >/dev/null 2>&1; then
  echo "  [EXISTS] WIF pool: $WIF_POOL_ID"
else
  echo "  [CREATE] WIF pool: $WIF_POOL_ID"
  run gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --display-name="Curriculum Server GitHub Actions"
fi

POOL_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}"

ATTRIBUTE_CONDITION="assertion.repository == '${GITHUB_REPOSITORY}' && assertion.ref == 'refs/heads/${GITHUB_BRANCH}'"

if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$WIF_POOL_ID" >/dev/null 2>&1; then
  echo "  [EXISTS] WIF provider: $WIF_PROVIDER_ID"
  echo "  IMPORTANT: Existing provider was not modified."
  echo "  Verify its issuer, attribute mapping and condition manually."
else
  echo "  [CREATE] WIF provider: $WIF_PROVIDER_ID"

  run gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$WIF_POOL_ID" \
    --display-name="Curriculum Server GitHub Actions Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
fi

# ---------------------------------------------------------------------------
# 10. ALLOW ONLY THIS REPOSITORY TO IMPERSONATE THE CI DEPLOYER
# ---------------------------------------------------------------------------

log "Binding GitHub WIF principal to curriculum-ci-deployer"

CI_SA="curriculum-ci-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

WIF_PRINCIPAL="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${GITHUB_REPOSITORY}"

run gcloud iam service-accounts add-iam-policy-binding "$CI_SA" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$WIF_PRINCIPAL"

# ---------------------------------------------------------------------------
# 11. PROJECT-SCOPED CI DEPLOYMENT PERMISSIONS
# ---------------------------------------------------------------------------
#
# These permissions are limited to the existing Curriculum Server project.
# No organisation-level or folder-level role is granted.
#
# No project-factory, infrastructure-deployer or domain-manager privileges
# are granted here.
# ---------------------------------------------------------------------------

log "Granting limited project-level CI permissions"

run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CI_SA}" \
  --role="roles/artifactregistry.writer" \
  --condition=None

run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CI_SA}" \
  --role="roles/run.developer" \
  --condition=None

# ---------------------------------------------------------------------------
# 12. LIMIT CI SERVICE ACCOUNT IMPERSONATION TO RUNTIME IDENTITIES
# ---------------------------------------------------------------------------

log "Granting CI actAs only on the runtime identities"

RUNTIME_ACCOUNTS=(
  "cs-frontend-runtime"
  "cf-frontend-runtime"
  "backend-runtime"
)

for runtime_id in "${RUNTIME_ACCOUNTS[@]}"; do
  RUNTIME_EMAIL="${runtime_id}@${PROJECT_ID}.iam.gserviceaccount.com"

  run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.serviceAccountUser" \
    --member="serviceAccount:${CI_SA}"
done

# ---------------------------------------------------------------------------
# 13. ARTIFACT REGISTRY
# ---------------------------------------------------------------------------
#
# cloudbuild.yaml references:
# europe-west1-docker.pkg.dev/<project>/curriculum-registry/
# ---------------------------------------------------------------------------

log "Checking Artifact Registry repository"

if gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" >/dev/null 2>&1; then
  echo "  [EXISTS] $ARTIFACT_REPOSITORY"
else
  echo "  [CREATE] $ARTIFACT_REPOSITORY"
  run gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format="docker" \
    --description="Curriculum Server container images"
fi

# ---------------------------------------------------------------------------
# 14. READ-ONLY INVENTORY — EXISTING CLOUD RUN RESOURCES
# ---------------------------------------------------------------------------

log "Inspecting existing Cloud Run services"

gcloud run services list \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="table(metadata.name,status.url,status.latestReadyRevisionName)" ||
  echo "  Cloud Run service inventory unavailable."

log "Inspecting existing Cloud Run jobs"

gcloud run jobs list \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="table(metadata.name,status.conditions[0].status)" ||
  echo "  Cloud Run job inventory unavailable."

# ---------------------------------------------------------------------------
# 15. REPORT SECURITY BOUNDARIES AND PENDING PIAM WORK
# ---------------------------------------------------------------------------

log "Provisioning foundation script completed"

cat <<EOF

============================================================
CURRICULUM SERVER — FOUNDATION PROVISIONING REPORT
============================================================

GCP project:       ${PROJECT_ID}
Project number:    ${PROJECT_NUMBER}
Region:            ${REGION}
Active account:    ${ACTIVE_ACCOUNT}
Execution mode:    ${MODE}

GitHub repository: ${GITHUB_REPOSITORY}
GitHub branch:     ${GITHUB_BRANCH}

WIF pool:          ${WIF_POOL_ID}
WIF provider:      ${WIF_PROVIDER_ID}
CI identity:       ${CI_SA}

Artifact Registry: ${ARTIFACT_REPOSITORY}

IDENTITY BOUNDARIES
-------------------
GitHub Actions:
  May impersonate curriculum-ci-deployer only.

curriculum-ci-deployer:
  Project-scoped Artifact Registry writer.
  Project-scoped Cloud Run developer.
  ServiceAccountUser only on the three runtime identities.

project-factory:
  Created if absent; no privileged roles granted.
  Project creation and billing association remain PIAM-gated.

infrastructure-deployer:
  Created if absent; no privileged roles granted.
  Infrastructure execution remains PIAM-gated.

domain-manager:
  Created if absent; no privileged roles granted.
  DNS/domain changes remain PIAM-gated.

provisioning-orchestrator:
  Created if absent; no broad infrastructure roles granted.
  Must coordinate through the CIPA control plane.

IMPORTANT IMPLEMENTATION GAPS
-----------------------------
1. The repository's current CIPA provisioning engine uses simulated
   provisioning behavior and must be replaced with real GCP adapters.

2. The current PIAM approval implementation is not yet a durable,
   independently verified production approval authority.

3. Project creation and billing association require a real PIAM approval
   record and a separately authorized project-factory execution path.

4. infrastructure-deployer and domain-manager require narrowly scoped
   IAM grants only after their PIAM execution controls are operational.

5. Existing WIF provider configuration was not overwritten if it already
   existed. Inspect its condition and attribute mapping.

6. No application deployment, customer project creation, billing change,
   database provisioning, DNS mutation, or resource deletion was performed.

NEXT REQUIRED STAGE
-------------------
Implement and test the real CIPA-to-PIAM authorization and execution
adapters before enabling privileged provisioning operations.

============================================================

EOF
