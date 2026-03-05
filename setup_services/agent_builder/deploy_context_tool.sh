#!/bin/bash
# Deploy Session Context Tool to Cloud Run
set -e

PROJECT_ID="${PROJECT_ID:-brk-prj-salvador-dura-bern-sbx}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="session-context-tool"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images/${SERVICE_NAME}"

echo "=== Deploying Session Context Tool ==="

# Build
gcloud builds submit --tag ${IMAGE_NAME} \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --quiet

# Deploy
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --max-instances 5 \
    --concurrency 80 \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --ingress=${INGRESS} \
    --network=${SHARED_VPC_NETWORK} \
    --subnet=${SHARED_VPC_SUBNET} \
    --vpc-egress=${VPC_EGRESS} \
    --quiet

SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed --region ${REGION} --project ${PROJECT_ID} \
    --format 'value(status.url)')

echo "=== Deployed ==="
echo "Context Tool URL: ${SERVICE_URL}"
