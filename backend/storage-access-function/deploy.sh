#!/bin/bash

# Set variables
PROJECT_ID="${PROJECT_ID}"
REGION="us-central1"
SERVICE_NAME="storage-access"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images/${SERVICE_NAME}"
SERVICE_ACCOUNT="420536872556-compute@developer.gserviceaccount.com"

echo "=== Deploying Storage Access Service to Cloud Run ==="
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
    --memory 256Mi \
    --cpu 1 \
    --timeout 60 \
    --max-instances 5 \
    --concurrency 80 \
    --service-account ${SERVICE_ACCOUNT} \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
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
echo "Storage access endpoint: ${SERVICE_URL}/storage_access"
echo ""
echo "To test:"
echo "curl '${SERVICE_URL}/storage_access?uri=gs://bucket-name/path/to/file.pdf'"
