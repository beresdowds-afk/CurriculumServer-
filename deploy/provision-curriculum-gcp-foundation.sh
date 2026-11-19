
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
# curriculum-billing-payments   -> billing-payments-runtime
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
BACKEND_SERVICE="unified-backend"
BACKEND_RUNTIME_SA="backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
BILLING_PAYMENTS_SERVICE="curriculum-billing-payments"
BILLING_PAYMENTS_RUNTIME_SA="billing-payments-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_BILLING_OPERATOR_SA="cloud-billing-operator@${PROJECT_ID}.iam.gserviceaccount.com"
LOGISTICS_TOPICS=(
  curriculum-bus-telemetry
  curriculum-geofence-events
  curriculum-logistics-dead-letter
)
LOGISTICS_SECRETS=(
  curriculum-logistics-gps-provider-config
  curriculum-logistics-notification-provider-config
)
LOGISTICS_QUEUE="curriculum-logistics-notifications"
LOGISTICS_SUBSCRIPTIONS=()
LOGISTICS_SUBSCRIPTIONS_INSPECTED="false"

MODE="dry-run"
declare -A LOGISTICS_RESOURCE_STATUS=()
declare -A LOGISTICS_API_STATUS=()
LOGISTICS_IAM_BINDINGS=()

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
  pubsub.googleapis.com
  cloudtasks.googleapis.com
  secretmanager.googleapis.com
  cloudbilling.googleapis.com
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
    LOGISTICS_API_STATUS["$api"]="already present"
  else
    echo "  [MISSING] $api"
    run gcloud services enable "$api" \
      --project="$PROJECT_ID"
    if [[ "$MODE" == "apply" ]]; then
      LOGISTICS_API_STATUS["$api"]="enabled"
    else
      LOGISTICS_API_STATUS["$api"]="planned (dry-run)"
    fi
  fi
done

SERVICE_ACCOUNTS=(
  "vertex-express:Curriculum Server frontend runtime"
  "cf-frontend-runtime:Curriculum Flow frontend runtime"
  "backend-runtime:Unified backend runtime"
  "billing-payments-runtime:Curriculum Server billing and payments runtime"
  "cloud-billing-operator:Separately authorized Cloud Billing operator"
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
    if [[ "$sa_email" == "$BACKEND_RUNTIME_SA" ]]; then
      die "Expected existing backend runtime service account is missing: $sa_email; refusing to create or replace it."
    fi
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

record_logistics_status() {
  local kind="$1"
  local name="$2"
  local state="$3"
  LOGISTICS_RESOURCE_STATUS["${kind}:${name}"]="$state"
}

logistics_status() {
  local kind="$1"
  local name="$2"
  printf '%s' "${LOGISTICS_RESOURCE_STATUS["${kind}:${name}"]:-pending}"
}

ensure_pubsub_topic() {
  local topic="$1"
  local topic_json
  local retention
  if topic_json="$(gcloud pubsub topics describe "$topic" \
      --project="$PROJECT_ID" --format=json 2>/dev/null)"; then
    retention="$(jq -r '.messageRetentionDuration // ""' <<<"$topic_json")"
    if [[ "$retention" == "604800s" ]]; then
      echo "  [PRESENT] Pub/Sub topic $topic (seven-day retention verified)"
      record_logistics_status topic "$topic" "already present; seven-day retention verified"
    else
      echo "  [UPDATE] Pub/Sub topic $topic retention is ${retention:-unset}"
      run gcloud pubsub topics update "$topic" \
        --project="$PROJECT_ID" \
        --message-retention-duration=604800s
      if [[ "$MODE" == "apply" ]]; then
        record_logistics_status topic "$topic" "seven-day retention reconciled"
      else
        record_logistics_status topic "$topic" "seven-day retention pending (dry-run)"
      fi
    fi
    return
  fi

  echo "  [MISSING] Pub/Sub topic $topic"
  run gcloud pubsub topics create "$topic" \
    --project="$PROJECT_ID" \
    --message-retention-duration=604800s
  if [[ "$MODE" == "apply" ]]; then
    record_logistics_status topic "$topic" "newly created"
  else
    record_logistics_status topic "$topic" "pending creation (dry-run)"
  fi
}

ensure_pubsub_subscription() {
  local subscription="$1"
  local topic="$2"
  local ack_deadline="${3:-60}"

  if gcloud pubsub subscriptions describe "$subscription" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] Pub/Sub subscription $subscription"
    record_logistics_status subscription "$subscription" "already present"
    return
  fi

  echo "  [MISSING] Pull subscription $subscription (consumer must be verified before use)"
  run gcloud pubsub subscriptions create "$subscription" \
    --project="$PROJECT_ID" \
    --topic="$topic" \
    --ack-deadline="$ack_deadline" \
    --message-retention-duration=604800s
  if [[ "$MODE" == "apply" ]]; then
    record_logistics_status subscription "$subscription" "newly created"
  else
    record_logistics_status subscription "$subscription" "pending creation (dry-run)"
  fi
}

ensure_resource_iam_binding() {
  local policy="$1"
  local role="$2"
  local member="$3"
  local resource="$4"

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition == null))' \
      <<<"$policy" >/dev/null; then
    echo "  [PRESENT] $resource $role -> $member"
    LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member (already present)")
    return 0
  fi

  if jq -e --arg role "$role" --arg member "$member" \
      '.bindings[]? | select(.role==$role and ((.members // []) | index($member)) and (.condition != null))' \
      <<<"$policy" >/dev/null; then
    die "Conditional binding exists for $resource / $role / $member. Review manually."
  fi
  return 1
}

ensure_topic_iam_binding() {
  local topic="$1"
  local role="$2"
  local member="$3"
  local policy
  local resource="Pub/Sub topic $topic"

  if ! gcloud pubsub topics describe "$topic" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PENDING] $resource IAM after topic creation"
    run gcloud pubsub topics add-iam-policy-binding "$topic" \
      --project="$PROJECT_ID" \
      --role="$role" \
      --member="$member" \
      --condition=None
    LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member (pending)")
    return
  fi

  policy="$(gcloud pubsub topics get-iam-policy "$topic" \
    --project="$PROJECT_ID" --format=json)"
  if ensure_resource_iam_binding "$policy" "$role" "$member" "$resource"; then
    return
  fi
  run gcloud pubsub topics add-iam-policy-binding "$topic" \
    --project="$PROJECT_ID" \
    --role="$role" \
    --member="$member" \
    --condition=None
  LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member")
}

ensure_subscription_iam_binding() {
  local subscription="$1"
  local role="$2"
  local member="$3"
  local policy
  local resource="Pub/Sub subscription $subscription"

  if ! gcloud pubsub subscriptions describe "$subscription" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PENDING] $resource IAM after subscription creation"
    run gcloud pubsub subscriptions add-iam-policy-binding "$subscription" \
      --project="$PROJECT_ID" \
      --role="$role" \
      --member="$member" \
      --condition=None
    LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member (pending)")
    return
  fi

  policy="$(gcloud pubsub subscriptions get-iam-policy "$subscription" \
    --project="$PROJECT_ID" --format=json)"
  if ensure_resource_iam_binding "$policy" "$role" "$member" "$resource"; then
    return
  fi
  run gcloud pubsub subscriptions add-iam-policy-binding "$subscription" \
    --project="$PROJECT_ID" \
    --role="$role" \
    --member="$member" \
    --condition=None
  LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member")
}

ensure_cloud_tasks_queue() {
  local queue="$1"
  local queue_json
  local max_attempts
  local min_backoff
  local max_backoff
  local max_concurrent
  local max_rate

  if ! queue_json="$(gcloud tasks queues describe "$queue" \
      --project="$PROJECT_ID" --location="$REGION" \
      --format=json 2>/dev/null)"; then
    echo "  [MISSING] Cloud Tasks queue $queue ($REGION)"
    run gcloud tasks queues create "$queue" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --max-attempts=10 \
      --min-backoff=10s \
      --max-backoff=3600s \
      --max-concurrent-dispatches=10 \
      --max-dispatches-per-second=5
    if [[ "$MODE" == "apply" ]]; then
      record_logistics_status queue "$queue" "newly created"
    else
      record_logistics_status queue "$queue" "pending creation (dry-run)"
    fi
    return
  fi

  max_attempts="$(jq -r '.retryConfig.maxAttempts // 0' <<<"$queue_json")"
  min_backoff="$(jq -r '.retryConfig.minBackoff // ""' <<<"$queue_json")"
  max_backoff="$(jq -r '.retryConfig.maxBackoff // ""' <<<"$queue_json")"
  max_concurrent="$(jq -r '.rateLimits.maxConcurrentDispatches // 0' <<<"$queue_json")"
  max_rate="$(jq -r '.rateLimits.maxDispatchesPerSecond // 0' <<<"$queue_json")"

  if [[ "$max_attempts" == "10" && "$min_backoff" == "10s" &&
        "$max_backoff" == "3600s" && "$max_concurrent" == "10" &&
        "$max_rate" == "5" ]]; then
    echo "  [PRESENT] Cloud Tasks queue $queue has requested settings"
    record_logistics_status queue "$queue" "already present; settings verified"
    return
  fi

  echo "  [UPDATE] Cloud Tasks queue $queue settings differ"
  run gcloud tasks queues update "$queue" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --max-attempts=10 \
    --min-backoff=10s \
    --max-backoff=3600s \
    --max-concurrent-dispatches=10 \
    --max-dispatches-per-second=5
  if [[ "$MODE" == "apply" ]]; then
    record_logistics_status queue "$queue" "settings reconciled"
  else
    record_logistics_status queue "$queue" "settings reconciliation pending (dry-run)"
  fi
}

ensure_queue_iam_binding() {
  local queue="$1"
  local role="$2"
  local member="$3"
  local policy
  local resource="Cloud Tasks queue $queue"

  if ! gcloud tasks queues describe "$queue" \
      --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
    echo "  [PENDING] $resource IAM after queue creation"
    run gcloud tasks queues add-iam-policy-binding "$queue" \
      --project="$PROJECT_ID" \
      --location="$REGION" \
      --role="$role" \
      --member="$member" \
      --condition=None
    LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member (pending)")
    return
  fi

  policy="$(gcloud tasks queues get-iam-policy "$queue" \
    --project="$PROJECT_ID" --location="$REGION" --format=json)"
  if ensure_resource_iam_binding "$policy" "$role" "$member" "$resource"; then
    return
  fi
  run gcloud tasks queues add-iam-policy-binding "$queue" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --role="$role" \
    --member="$member" \
    --condition=None
  LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member")
}

ensure_secret() {
  local secret="$1"
  if gcloud secrets describe "$secret" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PRESENT] Secret Manager secret $secret"
    record_logistics_status secret "$secret" "already present"
    return
  fi

  echo "  [MISSING] Secret Manager secret $secret"
  run gcloud secrets create "$secret" \
    --project="$PROJECT_ID" \
    --replication-policy=automatic
  if [[ "$MODE" == "apply" ]]; then
    record_logistics_status secret "$secret" "newly created"
  else
    record_logistics_status secret "$secret" "pending creation (dry-run)"
  fi
}

ensure_secret_iam_binding() {
  local secret="$1"
  local role="$2"
  local member="$3"
  local policy
  local resource="Secret Manager secret $secret"

  if ! gcloud secrets describe "$secret" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  [PENDING] $resource IAM after secret creation"
    run gcloud secrets add-iam-policy-binding "$secret" \
      --project="$PROJECT_ID" \
      --role="$role" \
      --member="$member" \
      --condition=None
    LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member (pending)")
    return
  fi

  policy="$(gcloud secrets get-iam-policy "$secret" \
    --project="$PROJECT_ID" --format=json)"
  if ensure_resource_iam_binding "$policy" "$role" "$member" "$resource"; then
    return
  fi
  run gcloud secrets add-iam-policy-binding "$secret" \
    --project="$PROJECT_ID" \
    --role="$role" \
    --member="$member" \
    --condition=None
  LOGISTICS_IAM_BINDINGS+=("$resource: $role -> $member")
}

log "Verify existing unified-backend runtime identity"

BACKEND_SERVICE_JSON="$(gcloud run services describe "$BACKEND_SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" --format=json 2>/dev/null)" ||
  die "Cloud Run service $BACKEND_SERVICE does not exist in $REGION; refusing logistics provisioning."
DEPLOYED_BACKEND_RUNTIME_SA="$(jq -r \
  '.spec.template.spec.serviceAccountName // .template.serviceAccount // empty' \
  <<<"$BACKEND_SERVICE_JSON")"
[[ "$DEPLOYED_BACKEND_RUNTIME_SA" == "$BACKEND_RUNTIME_SA" ]] ||
  die "Cloud Run service $BACKEND_SERVICE uses runtime identity '${DEPLOYED_BACKEND_RUNTIME_SA:-<unset>}' instead of $BACKEND_RUNTIME_SA; refusing to change it."
echo "  [VALID] $BACKEND_SERVICE -> $DEPLOYED_BACKEND_RUNTIME_SA"

log "Reconcile Campus Logistics resources"

for topic in "${LOGISTICS_TOPICS[@]}"; do
  ensure_pubsub_topic "$topic"
done

# No backend event-consumer endpoints are implemented and verified yet.
# Therefore, do not create subscriptions that would retry against absent handlers.
echo "  [DEFERRED] Processing subscriptions: no verified backend consumer endpoints."
if [[ "${LOGISTICS_API_STATUS[pubsub.googleapis.com]:-}" == "planned (dry-run)" ]]; then
  echo "  [PENDING] Existing subscriptions cannot be inspected until Pub/Sub API is enabled."
else
  PUBSUB_SUBSCRIPTIONS_JSON="$(gcloud pubsub subscriptions list \
    --project="$PROJECT_ID" --format=json)" ||
    die "Could not inspect Pub/Sub subscriptions in project $PROJECT_ID."
  LOGISTICS_SUBSCRIPTIONS_INSPECTED="true"
  for topic in "${LOGISTICS_TOPICS[@]}"; do
    while IFS= read -r subscription; do
      [[ -n "$subscription" ]] && LOGISTICS_SUBSCRIPTIONS+=("$subscription")
    done < <(jq -r --arg topic "projects/${PROJECT_ID}/topics/${topic}" \
      '.[]? | select(.topic==$topic) | .name | split("/")[-1]' \
      <<<"$PUBSUB_SUBSCRIPTIONS_JSON")
  done
  if ((${#LOGISTICS_SUBSCRIPTIONS[@]})); then
    printf '  [PRESENT] Existing subscriptions on logistics topics: %s\n' \
      "$(IFS=', '; echo "${LOGISTICS_SUBSCRIPTIONS[*]}")"
    echo "  [DEFERRED] Existing subscription consumers are not assumed or granted access."
  else
    echo "  [NONE] No existing subscriptions found on logistics topics."
  fi
fi

for secret in "${LOGISTICS_SECRETS[@]}"; do
  ensure_secret "$secret"
done

log "Reconcile read-only Cloud Billing visibility"

ensure_project_binding \
  "roles/billing.viewer" \
  "serviceAccount:${BILLING_PAYMENTS_RUNTIME_SA}"

echo "  [BOUNDARY] ${BILLING_PAYMENTS_RUNTIME_SA} receives billing.viewer only."
echo "  [BOUNDARY] ${CLOUD_BILLING_OPERATOR_SA} receives no billing role from this script."
echo "  [BOUNDARY] No billing.admin role is granted to the payments runtime."

ensure_cloud_tasks_queue "$LOGISTICS_QUEUE"

log "Reconcile backend resource-level IAM"

BACKEND_MEMBER="serviceAccount:${BACKEND_RUNTIME_SA}"
ensure_topic_iam_binding "curriculum-bus-telemetry" \
  "roles/pubsub.publisher" "$BACKEND_MEMBER"
ensure_topic_iam_binding "curriculum-geofence-events" \
  "roles/pubsub.publisher" "$BACKEND_MEMBER"
ensure_queue_iam_binding "$LOGISTICS_QUEUE" \
  "roles/cloudtasks.enqueuer" "$BACKEND_MEMBER"
for secret in "${LOGISTICS_SECRETS[@]}"; do
  ensure_secret_iam_binding "$secret" \
    "roles/secretmanager.secretAccessor" "$BACKEND_MEMBER"
done

for api in pubsub.googleapis.com cloudtasks.googleapis.com secretmanager.googleapis.com; do
  echo "  [API] $api: ${LOGISTICS_API_STATUS["$api"]:-already enabled}"
done

  
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

CAMPUS LOGISTICS RESOURCES
--------------------------
Backend service:     ${BACKEND_SERVICE}
Runtime identity:    ${BACKEND_RUNTIME_SA}
Pub/Sub topics:
$(for topic in "${LOGISTICS_TOPICS[@]}"; do printf '  - %s: %s\n' "$topic" "$(logistics_status topic "$topic")"; done)
Pub/Sub subscriptions:
$(if ((${#LOGISTICS_SUBSCRIPTIONS[@]})); then printf '  - %s (existing; consumer not verified)\n' "${LOGISTICS_SUBSCRIPTIONS[@]}"; elif [[ "$LOGISTICS_SUBSCRIPTIONS_INSPECTED" == "true" ]]; then echo '  - None found on logistics topics; creation deferred pending verified endpoints.'; else echo '  - Not inspected because Pub/Sub API is not yet enabled; creation deferred pending verified endpoints.'; fi)
Cloud Tasks queue:
  - ${LOGISTICS_QUEUE} (${REGION}): $(logistics_status queue "$LOGISTICS_QUEUE")
  - Attempts/backoff/concurrency/rate: 10 / 10s-3600s / 10 / 5 per second
Secret Manager containers:
$(for secret in "${LOGISTICS_SECRETS[@]}"; do printf '  - %s: %s\n' "$secret" "$(logistics_status secret "$secret")"; done)
Logistics APIs:
$(for api in pubsub.googleapis.com cloudtasks.googleapis.com secretmanager.googleapis.com; do printf '  - %s: %s\n' "$api" "${LOGISTICS_API_STATUS["$api"]:-already enabled}"; done)
Backend resource-level IAM:
$(if ((${#LOGISTICS_IAM_BINDINGS[@]})); then printf '  - %s\n' "${LOGISTICS_IAM_BINDINGS[@]}"; else echo '  - Required bindings already present.'; fi)
  - No Pub/Sub subscriber role: no processing subscriptions are currently verified.
  - No dead-letter publisher role: backend failure-event publishing is not yet implemented.

UNCONFIGURED PROVIDER CREDENTIALS
---------------------------------
- Add administrator-managed versions to the GPS and notification provider
  secrets after selecting providers. This script creates containers only.
- No fake credentials or secret versions are created.

DEFERRED APPLICATION INTEGRATIONS
---------------------------------
- Implement authenticated telemetry/geofence ingestion and event consumers.
- Implement Cloud Tasks dispatch handlers on ${BACKEND_SERVICE}; configure
  parent SMS, WhatsApp, email, transport, geofence, and failure-recovery flows.
- Persist canonical operational records in the existing PostgreSQL database.
- Define and verify dead-letter publishing and subscription consumer behavior.

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
- No DNS, domain, Cloud SQL, bucket, secret-version, or credential mutation.
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
