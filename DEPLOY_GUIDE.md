# TherAssist — Cloud Run Deployment Guide

This guide covers everything needed to deploy TherAssist to Google Cloud Run in project `brk-prj-salvador-dura-bern-sbx`.

## Prerequisites Checklist

Before running the deploy script, a GCP admin must complete these steps:

### 1. Cloud Build Service Account

The org policy requires a custom Cloud Build service account. Create it and grant roles:

```bash
PROJECT_ID="brk-prj-salvador-dura-bern-sbx"

# Create the service account (if it doesn't exist)
gcloud iam service-accounts create ${PROJECT_ID} \
  --display-name="Cloud Build SA" \
  --project=${PROJECT_ID}

# Grant required roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_ID}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_ID}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_ID}@cloudbuild.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

### 2. Artifact Registry Repository

Create the Docker image repository:

```bash
gcloud artifacts repositories create therapy-images \
  --repository-format=docker \
  --location=us-central1 \
  --project=${PROJECT_ID}
```

### 3. Shared VPC Subnet Access

The Cloud Run Service Agent needs network access to the shared VPC subnet:

```bash
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

gcloud projects add-iam-policy-binding brk-prj-net-shared \
  --member="serviceAccount:service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com" \
  --role="roles/compute.networkUser" \
  --condition=None
```

> **Note:** This must be run by an admin of the host project `brk-prj-net-shared`.

### 4. APIs (should already be enabled)

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  speech.googleapis.com \
  aiplatform.googleapis.com \
  discoveryengine.googleapis.com \
  firestore.googleapis.com \
  --project=${PROJECT_ID}
```

---

## Deploy (One Command)

Once prerequisites are met, deploy all 4 services:

```bash
cd gcaimh-ther-assist-DEV
chmod +x deploy-all.sh
./deploy-all.sh
```

This script:
1. Builds and deploys **Streaming Transcription** (STT v2 WebSocket service)
2. Builds and deploys **Therapy Analysis** (Gemini-powered clinical analysis)
3. Builds and deploys **Storage Access** (Firestore session storage)
4. Auto-generates `frontend/.env.production` with the backend URLs
5. Builds and deploys **Frontend** (React + nginx)

Total deploy time: ~10-15 minutes.

### What Each Service Does

| Service | Purpose | Port |
|---------|---------|------|
| `therapy-streaming-transcription` | Real-time speech-to-text via WebSocket, speaker diarization | 8080 |
| `therapy-analysis` | Clinical analysis using Gemini 2.5 Pro + RAG | 8080 |
| `storage-access` | Session save/load via Firestore | 8080 |
| `ther-assist-frontend` | React UI served by nginx | 8080 |

---

## Post-Deploy Steps

### Enable Unauthenticated Access

Due to org policy, `--allow-unauthenticated` may not take effect automatically. For each service, go to the Cloud Run console and enable unauthenticated invocations:

1. Go to: https://console.cloud.google.com/run?project=brk-prj-salvador-dura-bern-sbx
2. Click each service → **Security** tab → **Allow unauthenticated invocations**

Or via CLI (if permissions allow):

```bash
for SERVICE in therapy-streaming-transcription therapy-analysis storage-access ther-assist-frontend; do
  gcloud run services add-iam-policy-binding ${SERVICE} \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=us-central1 \
    --project=${PROJECT_ID}
done
```

### Verify Deployment

The deploy script prints all URLs at the end. Quick health checks:

```bash
# Streaming service
curl https://<STREAMING_URL>/

# Analysis service
curl -X POST https://<ANALYSIS_URL>/therapy_analysis \
  -H 'Content-Type: application/json' \
  -d '{"action": "health_check"}'

# Frontend
open https://<FRONTEND_URL>
```

---

## Architecture Overview

```
Browser → Frontend (nginx/React)
            ├── WebSocket → Streaming Transcription (FastAPI/uvicorn)
            │                  └── Google Cloud Speech-to-Text v2
            ├── HTTP POST → Therapy Analysis (Cloud Function)
            │                  ├── Gemini 2.5 Flash (realtime)
            │                  ├── Gemini 2.5 Pro (comprehensive + RAG)
            │                  └── Discovery Engine (7 RAG datastores, 452+ papers)
            └── HTTP → Storage Access (Cloud Function)
                          └── Firestore
```

---

## Org Policy Compliance

All deploy scripts are pre-configured to satisfy these constraints:

| Constraint | How We Comply |
|-----------|---------------|
| `constraints/cloudbuild.useBuildServiceAccount` | Custom build SA on every `gcloud builds submit` |
| `constraints/cloudbuild.disableCreateDefaultServiceAccount` | `--default-buckets-behavior=REGIONAL_USER_OWNED_BUCKET` |
| `constraints/run.allowedIngress` | `--ingress=internal-and-cloud-load-balancing` |
| `constraints/run.allowedVPCEgress` | `--network`, `--subnet`, `--vpc-egress=private-ranges-only` |
| `constraints/gcp.resourceLocations` | All resources in `us-central1` |

---

## Environment Variables

Each service has a `.env.example` file. The deploy script handles production values automatically, but for reference:

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `VITE_ANALYSIS_API` | Therapy analysis Cloud Run URL |
| `VITE_STORAGE_ACCESS_URL` | Storage access Cloud Run URL |
| `VITE_STREAMING_API` | Streaming transcription WebSocket URL (wss://) |

### Therapy Analysis
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` |

### Streaming Transcription
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` |
| `PORT` | Service port (8080 for Cloud Run) |

### Storage Access
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
