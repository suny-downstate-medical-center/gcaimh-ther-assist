#!/bin/bash
# Upload demo audio files to GCS for production use
# Run this after: gcloud auth login --login-config="gcloud.json"

PROJECT="brk-prj-salvador-dura-bern-sbx"
BUCKET="gs://${PROJECT}-demo-audio"
AUDIO_DIR="$(dirname "$0")/../../../"

echo "=== TherAssist Demo Audio Upload ==="
echo "Project: $PROJECT"
echo "Bucket:  $BUCKET"
echo ""

# Step 1: Create bucket if it doesn't exist
echo "[1/3] Creating bucket (if needed)..."
gsutil ls "$BUCKET" 2>/dev/null || gsutil mb -p "$PROJECT" -l us-central1 "$BUCKET"

# Step 2: Upload audio files
echo "[2/3] Uploading 305_AUDIO.wav..."
gsutil -o "GSUtil:parallel_composite_upload_threshold=50M" cp "${AUDIO_DIR}/305_AUDIO.wav" "${BUCKET}/305_AUDIO.wav"

echo "[3/3] Uploading 307_AUDIO.wav..."
gsutil -o "GSUtil:parallel_composite_upload_threshold=50M" cp "${AUDIO_DIR}/307_AUDIO.wav" "${BUCKET}/307_AUDIO.wav"

echo ""
echo "=== Done ==="
echo "Files in bucket:"
gsutil ls -l "$BUCKET"
echo ""
echo "The frontend will automatically fetch these via the storage-access service in production."
