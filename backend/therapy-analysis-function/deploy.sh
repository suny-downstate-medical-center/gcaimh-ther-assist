#!/bin/bash

# Set variables
PROJECT_ID="${PROJECT_ID}"
REGION="us-central1"
SERVICE_NAME="therapy-analysis"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images/${SERVICE_NAME}"

echo "=== Deploying Therapy Analysis Service to Cloud Run ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Build and push Docker image via Cloud Build
echo "Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
    --default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET \
    --quiet

# Deploy to Cloud Run with org policy compliance
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --allow-unauthenticated \
    --memory 8Gi \
    --cpu 4 \
    --timeout 300 \
    --max-instances 10 \
    --concurrency 40 \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=${REGION}" \
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
echo "Service URL: ${SERVICE_URL}"
echo "Analysis endpoint: ${SERVICE_URL}/therapy_analysis"
echo ""
echo "To test:"
echo "curl -X POST ${SERVICE_URL}/therapy_analysis -H 'Content-Type: application/json' -d '{\"action\": \"health_check\"}'"
