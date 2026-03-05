# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/bash

# Set variables
PROJECT_ID="${PROJECT_ID}"
REGION="us-central1"
SERVICE_NAME="therapy-streaming-transcription"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/therapy-images/${SERVICE_NAME}"

echo "=== Deploying Streaming Transcription Service to Cloud Run ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    --project=${PROJECT_ID}

# Build and push Docker image via Cloud Build
# Uses custom service account per constraints/cloudbuild.useBuildServiceAccount
# Uses regional buckets per constraints/cloudbuild.disableCreateDefaultServiceAccount
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
    --memory 2Gi \
    --cpu 2 \
    --timeout 3600 \
    --max-instances 100 \
    --concurrency 500 \
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
echo "WebSocket endpoint: ${SERVICE_URL/https/wss}/ws/transcribe"
echo "Health check: ${SERVICE_URL}/health"
echo ""
echo "To test the WebSocket connection:"
echo "wscat -c '${SERVICE_URL/https/wss}/ws/transcribe'"
