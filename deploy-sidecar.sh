#!/bin/bash
set -e

# ─── Configuration ──────────────────────────────────────────────────
PROJECT_ID="brk-prj-salvador-dura-bern-sbx"
REGION="us-central1"
AR_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images"
BUILD_SERVICE_ACCOUNT="420536872556-compute@developer.gserviceaccount.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "  TherAssist — Sidecar Deployment"
echo "  (All services in one Cloud Run instance)"
echo "============================================"
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo ""

# ─── Step 1: Build all 4 container images ────────────────────────────

echo "━━━ [1/5] Building Streaming Transcription image ━━━"
cd "${SCRIPT_DIR}/backend/streaming-transcription-service"
gcloud builds submit --tag "${AR_REPO}/therapy-streaming-transcription:sidecar" \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --quiet
echo "✓ Streaming image built"
echo ""

echo "━━━ [2/5] Building Therapy Analysis image ━━━"
cd "${SCRIPT_DIR}/backend/therapy-analysis-function"
gcloud builds submit --tag "${AR_REPO}/therapy-analysis:sidecar" \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --quiet
echo "✓ Analysis image built"
echo ""

echo "━━━ [3/5] Building Storage Access image ━━━"
cd "${SCRIPT_DIR}/backend/storage-access-function"
gcloud builds submit --tag "${AR_REPO}/storage-access:sidecar" \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --quiet
echo "✓ Storage image built"
echo ""

echo "━━━ [4/5] Building Frontend image ━━━"
cd "${SCRIPT_DIR}/frontend"
gcloud builds submit --tag "${AR_REPO}/ther-assist-frontend:sidecar" \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --timeout=600 \
    --quiet
echo "✓ Frontend image built"
echo ""

# ─── Step 5: Deploy multi-container service ──────────────────────────

echo "━━━ [5/5] Deploying sidecar service ━━━"
cd "${SCRIPT_DIR}"
gcloud run services replace service-sidecar.yaml \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --quiet

# Set IAM policy for public access
gcloud run services add-iam-policy-binding ther-assist-sidecar \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --quiet 2>/dev/null || echo "(IAM binding may require admin — check with Ernest)"

# Get service URL
SERVICE_URL=$(gcloud run services describe ther-assist-sidecar \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')

# ─── Summary ────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Sidecar Deployment Complete!"
echo "============================================"
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "All backends are sidecars behind nginx:"
echo "  Analysis:  ${SERVICE_URL}/api/analysis/therapy_analysis"
echo "  Storage:   ${SERVICE_URL}/api/storage/storage_access"
echo "  WebSocket: ${SERVICE_URL/https/wss}/ws/transcribe"
echo ""
echo "Quick tests:"
echo "  curl -X POST ${SERVICE_URL}/api/analysis/therapy_analysis -H 'Content-Type: application/json' -d '{\"action\": \"health_check\"}'"
echo "  Open: ${SERVICE_URL}"
