#!/usr/bin/env bash
#
# Deploy the dedicated internal billing and payments Cloud Run service.
# This script keeps payment initialization/refunds disabled by default.
#
# Usage:
#   BILLING_PAYMENTS_IMAGE=REGION-docker.pkg.dev/PROJECT/REPO/billing:TAG \
#     ./deploy/deploy-billing-payments.sh --dry-run
#   BILLING_PAYMENTS_IMAGE=... \
#     ./deploy/deploy-billing-payments.sh --apply

set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:-curious-subject-477114-e4}"
REGION="${REGION:-europe-west1}"
SERVICE="curriculum-billing-payments"
BACKEND_SERVICE="unified-backend"
BACKEND_RUNTIME_SA="backend-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
BILLING_RUNTIME_SA="billing-payments-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE="${BILLING_PAYMENTS_IMAGE:-}"
DATABASE_SECRET="${BILLING_DATABASE_SECRET:-curriculum-billing-postgres-runtime-url}"
CONTROL_PLANE_SECRET="${CONTROL_PLANE_SECRET_NAME:-curriculum-control-plane-secret}"
RETURN_URL="${BILLING_PAYMENTS_RETURN_URL:-}"
WEBHOOK_BASE_URL="${BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL:-}"
MODE="dry-run"

PROVIDER_SECRETS=(
  "PAYSTACK_SECRET_KEY:curriculum-paystack-secret-key"
  "FLUTTERWAVE_SECRET_KEY:curriculum-flutterwave-secret-key"
  "FLUTTERWAVE_WEBHOOK_SECRET_HASH:curriculum-flutterwave-webhook-secret"
  "OPAY_SECRET_KEY:curriculum-opay-secret-key"
  "OPAY_PUBLIC_KEY:curriculum-opay-public-key"
  "OPAY_MERCHANT_ID:curriculum-opay-merchant-id"
  "INTERSWITCH_CLIENT_ID:curriculum-interswitch-client-id"
  "INTERSWITCH_CLIENT_SECRET:curriculum-interswitch-client-secret"
  "INTERSWITCH_MERCHANT_CODE:curriculum-interswitch-merchant-code"
  "INTERSWITCH_PAY_ITEM_ID:curriculum-interswitch-pay-item-id"
  "INTERSWITCH_WEBHOOK_SECRET:curriculum-interswitch-webhook-secret"
  "BANK_TRANSFER_WEBHOOK_SECRET:curriculum-bank-transfer-webhook-secret"
)

for arg in "$@"; do
  case "$arg" in
    --apply) MODE="apply" ;;
    --dry-run) MODE="dry-run" ;;
    --help|-h)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "ERROR: Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

die() {
  echo "FATAL: $*" >&2
  exit 1
}

command -v gcloud >/dev/null 2>&1 || die "Required command not found: gcloud"
[[ -n "$IMAGE" ]] || die "Set BILLING_PAYMENTS_IMAGE to a built and tagged service image."
[[ "$DATABASE_SECRET" != "curriculum-postgres-runtime-url" ]] ||
  die "Billing must use a dedicated least-privilege PostgreSQL secret, not the unified backend runtime secret."
[[ "$RETURN_URL" == https://* ]] || die "Set BILLING_PAYMENTS_RETURN_URL to the HTTPS application return URL."
[[ "$WEBHOOK_BASE_URL" == https://* ]] || die "Set BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL to the HTTPS unified-backend webhook URL."

ACTIVE_ACCOUNT="$(gcloud auth list --filter='status:ACTIVE' --format='value(account)' | head -n 1)"
[[ -n "$ACTIVE_ACCOUNT" ]] || die "No active gcloud account."
gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null ||
  die "Cannot access project ${PROJECT_ID}."
gcloud iam service-accounts describe "$BILLING_RUNTIME_SA" --project="$PROJECT_ID" >/dev/null 2>&1 ||
  die "Provision ${BILLING_RUNTIME_SA} with deploy/provision-curriculum-gcp-foundation.sh first."
gcloud run services describe "$BACKEND_SERVICE" --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1 ||
  die "Expected existing service ${BACKEND_SERVICE} was not found; refusing to alter the backend topology."

gcloud secrets describe "$DATABASE_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 ||
  die "Required PostgreSQL Secret Manager secret ${DATABASE_SECRET} was not found."
gcloud secrets describe "$CONTROL_PLANE_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 ||
  die "Required Secret Manager secret ${CONTROL_PLANE_SECRET} was not found."

SECRETS=(
  "DATABASE_URL=${DATABASE_SECRET}:latest"
  "CONTROL_PLANE_SECRET=${CONTROL_PLANE_SECRET}:latest"
)
AVAILABLE_PROVIDERS=()
for item in "${PROVIDER_SECRETS[@]}"; do
  env_name="${item%%:*}"
  secret_name="${item#*:}"
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    SECRETS+=("${env_name}=${secret_name}:latest")
    AVAILABLE_PROVIDERS+=("$secret_name")
  else
    echo "  [NOT CONFIGURED] Secret Manager secret ${secret_name}"
  fi
done

echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE} (internal ingress; unauthenticated invocation disabled)"
echo "Runtime identity: ${BILLING_RUNTIME_SA}"
echo "Caller identity: ${BACKEND_RUNTIME_SA}"
echo "Image: ${IMAGE}"
echo "Payment initialization/refunds: disabled (BILLING_PAYMENTS_ENABLED=false)"
echo "Provider secrets present: ${#AVAILABLE_PROVIDERS[@]}"

if [[ "$MODE" == "dry-run" ]]; then
  printf '  gcloud run deploy %q --project=%q --region=%q --image=%q --service-account=%q --ingress=internal --no-allow-unauthenticated\n' \
    "$SERVICE" "$PROJECT_ID" "$REGION" "$IMAGE" "$BILLING_RUNTIME_SA"
  exit 0
fi

read -r -p "Type exactly 'DEPLOY INTERNAL BILLING SERVICE': " CONFIRM
[[ "$CONFIRM" == "DEPLOY INTERNAL BILLING SERVICE" ]] || die "Confirmation failed."

for secret in "$DATABASE_SECRET" "$CONTROL_PLANE_SECRET" "${AVAILABLE_PROVIDERS[@]}"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${BILLING_RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE" \
  --service-account="$BILLING_RUNTIME_SA" \
  --ingress=internal \
  --no-allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --concurrency=40 \
  --max=5 \
  --min=0 \
  --set-env-vars="NODE_ENV=production,BILLING_PAYMENTS_AUTOSTART=true,BILLING_PAYMENTS_ENABLED=false,BILLING_PAYMENTS_RETURN_URL=${RETURN_URL},BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL=${WEBHOOK_BASE_URL}" \
  --set-secrets="$(IFS=,; echo "${SECRETS[*]}")"

gcloud run services add-iam-policy-binding "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --member="serviceAccount:${BACKEND_RUNTIME_SA}" \
  --role="roles/run.invoker" >/dev/null

SERVICE_URL="$(gcloud run services describe "$SERVICE" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
echo
echo "Deployed ${SERVICE_URL}"
echo "Set BILLING_PAYMENTS_SERVICE_URL=${SERVICE_URL} on ${BACKEND_SERVICE}."
echo "Keep payment initialization disabled until staging verification is approved."
