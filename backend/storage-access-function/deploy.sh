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

# Deploy the storage access Cloud Function

# Set variables
PROJECT_ID="${PROJECT_ID}"
FUNCTION_NAME="storage-access"
REGION="us-central1"
RUNTIME="python311"
ENTRY_POINT="storage_access"
MEMORY="256MB"
TIMEOUT="30s"
SERVICE_ACCOUNT="storage-access-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Deploying Storage Access Cloud Function..."

# Create service account if it doesn't exist
echo "Checking service account..."
if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT} --project=${PROJECT_ID} &>/dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create storage-access-sa \
        --display-name="Storage Access Function Service Account" \
        --project=${PROJECT_ID}
    
    # Grant Storage Object Viewer role
    echo "Granting Storage Object Viewer role..."
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/storage.objectViewer"
fi

# Deploy the function
gcloud functions deploy ${FUNCTION_NAME} \
    --gen2 \
    --runtime=${RUNTIME} \
    --region=${REGION} \
    --source=. \
    --entry-point=${ENTRY_POINT} \
    --trigger-http \
    --allow-unauthenticated \
    --memory=${MEMORY} \
    --timeout=${TIMEOUT} \
    --service-account=${SERVICE_ACCOUNT} \
    --project=${PROJECT_ID} \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"

# Get the function URL
FUNCTION_URL=$(gcloud functions describe ${FUNCTION_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(serviceConfig.uri)")

echo ""
echo "Storage Access Function deployed successfully!"
echo "Function URL: ${FUNCTION_URL}"
echo ""
echo "To test the function:"
echo "curl '${FUNCTION_URL}?uri=gs://bucket-name/path/to/file.pdf'"
