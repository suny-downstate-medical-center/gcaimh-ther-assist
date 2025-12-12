# Terraform Automation for Ther-Assist

This Terraform configuration automates the deployment of the Ther-Assist application, specifically replacing **steps 4, 5, and environment configuration** from the main README.md.

## What This Automates

**Step 4: Backend Deployments**
- ✅ Deploy Therapy Analysis Function (Cloud Function)
- ✅ Deploy Storage Access Function (Cloud Function)  
- ✅ Deploy Streaming Transcription Service (Cloud Run)

**Step 5: Frontend Deployment**
- ✅ Deploy Frontend to Cloud Run (instead of Firebase Hosting)

**Environment Configuration**
- ✅ Automatically generate all `.env` files with correct service URLs
- ✅ Update frontend environment with deployed backend URLs
- ✅ Configure authentication settings across all services

## Prerequisites

**Complete these steps from the main README first:**

1. ✅ **GCP & Firebase Setup** (Step 1) - Enable APIs, Firebase Auth
2. ✅ **Firebase Authentication Setup** (Step 2) - Configure domains and get Firebase config
3. ✅ **Create RAG Corpuses** (Step 3) - **MUST BE COMPLETED BEFORE RUNNING TERRAFORM**

**Required Tools:**
- Terraform >= 1.0
- Google Cloud CLI (`gcloud`) installed and authenticated
- Node.js 18+ and npm (for frontend build)

## Quick Start

1. **Set up Terraform variables:**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

2. **Edit `terraform.tfvars` with your values:**
```hcl
project_id = "your-gcp-project-id"
region = "us-central1"
auth_allowed_domains = "google.com,yourdomain.com"
auth_allowed_emails = "user1@example.com,user2@example.com"
```

3. **Initialize and deploy:**
```bash
terraform init
terraform plan
terraform apply
```

## What Gets Deployed

### Backend Services
- **Therapy Analysis Function**: `https://us-central1-{project-id}.cloudfunctions.net/therapy-analysis`
- **Storage Access Function**: `https://us-central1-{project-id}.cloudfunctions.net/storage-access`
- **Streaming Transcription Service**: `https://therapy-streaming-transcription-xxxxx.us-central1.run.app`

### Frontend
- **Frontend Application**: `https://ther-assist-frontend-xxxxx.us-central1.run.app`

### Generated Environment Files

The following `.env` files are automatically created/updated:

```
frontend/.env                                    # Production environment
frontend/.env.development                       # Local development
backend/therapy-analysis-function/.env          # Function environment
backend/storage-access-function/.env            # Function environment  
backend/streaming-transcription-service/.env    # Service environment
```

## Outputs

After deployment, Terraform provides:

```bash
terraform output deployment_summary
```

Shows all deployed URLs and configuration details.

## Verification

1. **Check backend services:**
```bash
# Test therapy analysis function
curl "$(terraform output -raw therapy_analysis_function_url)/health"

# Test storage access function  
curl "$(terraform output -raw storage_access_function_url)/health"

# Test streaming service
curl "$(terraform output -raw streaming_transcription_service_url)/health"
```

2. **Test frontend:**
```bash
# Open frontend in browser
open "$(terraform output -raw frontend_url)"
```

## Development Workflow

After Terraform deployment, you can still develop locally:

1. **Frontend development:**
```bash
cd frontend
npm run dev  # Uses .env.development with localhost backends
```

2. **Backend development:**
```bash
# Each service can run locally using generated .env files
cd backend/therapy-analysis-function
source .venv/bin/activate
functions-framework --target=therapy_analysis --port=8080
```

## Troubleshooting

### Common Issues

**1. RAG Corpuses not found:**
```
Error: Discovery Engine corpus not found
```
- **Solution**: Complete Step 3 (Create RAG Corpuses) before running Terraform

**2. Permission denied errors:**
```
Error: googleapi: Error 403: Permission denied
```
- **Solution**: Ensure `gcloud auth application-default login` is run
- **Solution**: Verify your account has necessary GCP permissions

**3. Frontend build failures:**
```
Error: npm ci failed
```
- **Solution**: Ensure Node.js 18+ is installed
- **Solution**: Check frontend dependencies in `package.json`

### Clean Deployment

To redeploy everything:
```bash
terraform destroy
terraform apply
```

## File Structure

```
terraform/
├── main.tf                              # Main Terraform configuration
├── variables.tf                         # Input variables
├── outputs.tf                          # Output values
├── terraform.tfvars.example            # Example variables file
├── templates/                          # Environment file templates
│   ├── frontend.env.tpl
│   ├── frontend.env.development.tpl
│   ├── backend.env.tpl
│   └── backend-streaming.env.tpl
└── README.md                           # This file
```

## Integration with Main Workflow

This Terraform configuration replaces manual steps from the main README:

- ✅ **Skip Step 4**: Backend deployments automated
- ✅ **Skip Step 5**: Frontend deployment automated  
- ✅ **Skip Environment Setup**: All `.env` files generated automatically

You can proceed directly to testing and usage after `terraform apply` completes successfully.
