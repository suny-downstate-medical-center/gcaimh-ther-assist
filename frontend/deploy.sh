#!/bin/bash

# Set variables
PROJECT_ID="${PROJECT_ID}"
REGION="us-central1"
SERVICE_NAME="ther-assist-frontend"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images/${SERVICE_NAME}"

echo "=== Deploying TherAssist Frontend to Cloud Run ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Build and push Docker image via Cloud Build
echo "Building Docker image (includes npm build)..."
gcloud builds submit --tag ${IMAGE_NAME} \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --timeout=600 \
    --quiet

# Deploy to Cloud Run with org policy compliance
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --allow-unauthenticated \
    --memory 256Mi \
    --cpu 1 \
    --timeout 60 \
    --max-instances 10 \
    --concurrency 80 \
    --port 8080 \
    --ingress=${INGRESS} \
    --network=${SHARED_VPC_NETWORK} \
    --subnet=${SHARED_VPC_SUBNET} \
    --vpc-egress=${VPC_EGRESS} \
    --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format 'value(status.url)')

echo "=== Deployment Complete ==="
echo "Frontend URL: ${SERVICE_URL}"
echo ""
echo "Open in browser: ${SERVICE_URL}"
