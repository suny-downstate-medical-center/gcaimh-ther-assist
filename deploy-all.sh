#!/bin/bash
set -e

# ─── Configuration ──────────────────────────────────────────────────
PROJECT_ID="brk-prj-salvador-dura-bern-sbx"
REGION="us-central1"
AR_REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images"

# ─── Org Policy Compliance ──────────────────────────────────────────
# Cloud Build requires a custom service account (constraints/cloudbuild.useBuildServiceAccount)
# Ask your GCP admin to create this SA and grant it:
#   - roles/cloudbuild.builds.builder
#   - roles/artifactregistry.writer
#   - roles/logging.logWriter
BUILD_SERVICE_ACCOUNT="${PROJECT_ID}@cloudbuild.gserviceaccount.com"

# Shared VPC config (constraints/run.allowedVPCEgress)
# Host project: brk-prj-net-shared
SHARED_VPC_NETWORK="brk-sandboxes-shared-vpc"
SHARED_VPC_SUBNET="projects/brk-prj-net-shared/regions/${REGION}/subnetworks/brk-sandboxes-sbn-serverless-usc1"
VPC_EGRESS="private-ranges-only"

# Ingress policy (constraints/run.allowedIngress)
INGRESS="internal-and-cloud-load-balancing"

export PROJECT_ID
export REGION
export BUILD_SERVICE_ACCOUNT
export SHARED_VPC_NETWORK
export SHARED_VPC_SUBNET
export VPC_EGRESS
export INGRESS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "  TherAssist — Deploy All Services"
echo "============================================"
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "Registry: ${AR_REPO}"
echo ""

# ─── Step 1: Deploy Streaming Transcription ─────────────────────────
echo "━━━ [1/4] Streaming Transcription Service ━━━"
cd "${SCRIPT_DIR}/backend/streaming-transcription-service"
bash deploy.sh

STREAMING_URL=$(gcloud run services describe therapy-streaming-transcription \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')
echo "✓ Streaming URL: ${STREAMING_URL}"
echo ""

# ─── Step 2: Deploy Therapy Analysis ────────────────────────────────
echo "━━━ [2/4] Therapy Analysis Service ━━━"
cd "${SCRIPT_DIR}/backend/therapy-analysis-function"
bash deploy.sh

ANALYSIS_URL=$(gcloud run services describe therapy-analysis \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')
echo "✓ Analysis URL: ${ANALYSIS_URL}"
echo ""

# ─── Step 3: Deploy Storage Access ──────────────────────────────────
echo "━━━ [3/4] Storage Access Service ━━━"
cd "${SCRIPT_DIR}/backend/storage-access-function"
bash deploy.sh

STORAGE_URL=$(gcloud run services describe storage-access \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')
echo "✓ Storage URL: ${STORAGE_URL}"
echo ""

# ─── Step 4: Update Frontend .env.production & Deploy ───────────────
echo "━━━ [4/4] Frontend ━━━"

# Convert HTTPS URL to WSS for streaming WebSocket
STREAMING_WSS="${STREAMING_URL/https:\/\//wss://}"

echo "Updating frontend/.env.production with backend URLs..."
cat > "${SCRIPT_DIR}/frontend/.env.production" << EOF
# Google Cloud settings
VITE_GOOGLE_CLOUD_PROJECT=${PROJECT_ID}

# Backend API endpoints (Cloud Run)
VITE_ANALYSIS_API=${ANALYSIS_URL}
VITE_STORAGE_ACCESS_URL=${STORAGE_URL}/storage_access
VITE_STREAMING_API=${STREAMING_WSS}

# Authorization Configuration
VITE_AUTH_ALLOWED_DOMAINS=downstate.edu
VITE_AUTH_ALLOWED_EMAILS=mohsin.sardar@downstate.edu
EOF

echo "Updated .env.production:"
cat "${SCRIPT_DIR}/frontend/.env.production"
echo ""

cd "${SCRIPT_DIR}/frontend"
bash deploy.sh

FRONTEND_URL=$(gcloud run services describe ther-assist-frontend \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')

# ─── Summary ────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Frontend:     ${FRONTEND_URL}"
echo "Streaming:    ${STREAMING_URL}"
echo "  WebSocket:  ${STREAMING_WSS}/ws/transcribe"
echo "Analysis:     ${ANALYSIS_URL}"
echo "Storage:      ${STORAGE_URL}"
echo ""
echo "Quick tests:"
echo "  curl ${STREAMING_URL}/"
echo "  curl -X POST ${ANALYSIS_URL}/therapy_analysis -H 'Content-Type: application/json' -d '{\"action\": \"health_check\"}'"
echo "  Open: ${FRONTEND_URL}"
