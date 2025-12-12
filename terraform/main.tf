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

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Get current project information
data "google_project" "current" {
  project_id = var.project_id
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com"
  ])
  
  service = each.key
  project = var.project_id
  
  disable_dependent_services = false
  disable_on_destroy = false
}

# Create service account for storage access function
resource "google_service_account" "storage_access_sa" {
  account_id   = "storage-access-sa"
  display_name = "Storage Access Function Service Account"
  project      = var.project_id
}

# Grant Storage Object Viewer role to service account
resource "google_project_iam_member" "storage_access_sa_binding" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.storage_access_sa.email}"
}

# Grant Project Editor role to service account
resource "google_project_iam_member" "storage_access_sa_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.storage_access_sa.email}"
}

# Create ZIP archive for therapy analysis function
data "archive_file" "therapy_analysis_zip" {
  type        = "zip"
  source_dir  = "../backend/therapy-analysis-function"
  output_path = "./therapy-analysis-function.zip"
  excludes    = [".env", ".venv", "__pycache__"]
}

# Create ZIP archive for storage access function
data "archive_file" "storage_access_zip" {
  type        = "zip"
  source_dir  = "../backend/storage-access-function"
  output_path = "./storage-access-function.zip"
  excludes    = [".env", ".venv", "__pycache__", "deploy.sh"]
}

# Deploy Therapy Analysis Cloud Function
resource "google_cloudfunctions2_function" "therapy_analysis" {
  name        = "therapy-analysis"
  location    = var.region
  project     = var.project_id
  
  build_config {
    runtime     = "python312"
    entry_point = "therapy_analysis"
    source {
      storage_source {
        bucket = google_storage_bucket.functions_bucket.name
        object = google_storage_bucket_object.therapy_analysis_source.name
      }
    }
  }
  
  service_config {
    max_instance_count    = 100
    available_memory      = "1Gi"
    timeout_seconds       = 540
    service_account_email = google_service_account.storage_access_sa.email
    environment_variables = {
      GOOGLE_CLOUD_PROJECT = var.project_id
      AUTH_ALLOWED_DOMAINS = var.auth_allowed_domains
      AUTH_ALLOWED_EMAILS  = var.auth_allowed_emails
    }
  }
  
  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.therapy_analysis_source
  ]
}


# Deploy Storage Access Cloud Function
resource "google_cloudfunctions2_function" "storage_access" {
  name        = "storage-access"
  location    = var.region
  project     = var.project_id
  
  build_config {
    runtime     = "python311"
    entry_point = "storage_access"
    source {
      storage_source {
        bucket = google_storage_bucket.functions_bucket.name
        object = google_storage_bucket_object.storage_access_source.name
      }
    }
  }
  
  service_config {
    max_instance_count    = 100
    available_memory      = "256Mi"
    timeout_seconds       = 30
    service_account_email = google_service_account.storage_access_sa.email
    environment_variables = {
      GOOGLE_CLOUD_PROJECT = var.project_id
      AUTH_ALLOWED_DOMAINS = var.auth_allowed_domains
      AUTH_ALLOWED_EMAILS  = var.auth_allowed_emails
    }
  }
  
  depends_on = [
    google_project_service.apis,
    google_storage_bucket_object.storage_access_source
  ]
}


# Create storage bucket for function source code
resource "google_storage_bucket" "functions_bucket" {
  name     = "${var.project_id}-functions-source"
  location = var.region
  project  = var.project_id
  
  uniform_bucket_level_access = true
}

# Upload therapy analysis function source
resource "google_storage_bucket_object" "therapy_analysis_source" {
  name   = "therapy-analysis-${data.archive_file.therapy_analysis_zip.output_md5}.zip"
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.therapy_analysis_zip.output_path
}

# Upload storage access function source
resource "google_storage_bucket_object" "storage_access_source" {
  name   = "storage-access-${data.archive_file.storage_access_zip.output_md5}.zip"
  bucket = google_storage_bucket.functions_bucket.name
  source = data.archive_file.storage_access_zip.output_path
}

# Build Docker image for streaming transcription service
# This needs to be built first before the Cloud Run service can reference it
resource "null_resource" "build_streaming_service" {
  triggers = {
    # Trigger rebuild when any source file changes
    source_hash = md5(join("", [
      filebase64sha256("../backend/streaming-transcription-service/Dockerfile"),
      filebase64sha256("../backend/streaming-transcription-service/main.py"),
      filebase64sha256("../backend/streaming-transcription-service/requirements.txt")
    ]))
  }
  
  provisioner "local-exec" {
    command = <<-EOT
      echo "Building Docker image for streaming transcription service..."
      cd ../backend/streaming-transcription-service
      
      # Enable required APIs first
      gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com --project=${var.project_id}
      
      # Build and push the Docker image
      gcloud builds submit --tag gcr.io/${var.project_id}/therapy-streaming-transcription:latest --project=${var.project_id} --timeout=20m || {
        echo "Failed to build Docker image. Please ensure Cloud Build API is enabled and you have the necessary permissions."
        exit 1
      }
      
      echo "Docker image built successfully: gcr.io/${var.project_id}/therapy-streaming-transcription:latest"
    EOT
  }
  
  depends_on = [google_project_service.apis]
}

# Add a delay to ensure the image is available in the registry
resource "time_sleep" "wait_for_streaming_image" {
  depends_on = [null_resource.build_streaming_service]
  
  create_duration = "30s"
}

# Deploy streaming transcription service to Cloud Run
resource "google_cloud_run_v2_service" "streaming_transcription" {
  name     = "therapy-streaming-transcription"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "gcr.io/${var.project_id}/therapy-streaming-transcription:latest"
      
      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }
      
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      
      env {
        name  = "AUTH_ALLOWED_DOMAINS"
        value = var.auth_allowed_domains
      }
      
      env {
        name  = "AUTH_ALLOWED_EMAILS"
        value = var.auth_allowed_emails
      }
    }
    
    scaling {
      max_instance_count = 100
    }
    
    timeout = "3600s"
  }

  depends_on = [
    google_project_service.apis,
    time_sleep.wait_for_streaming_image
  ]
}

# Deploy frontend to Cloud Run
resource "google_cloud_run_v2_service" "frontend" {
  name     = "ther-assist-frontend"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "gcr.io/${var.project_id}/ther-assist-frontend:latest"
      
      ports {
        container_port = 80
      }
      
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
    
    scaling {
      max_instance_count = 100
    }
  }

  depends_on = [
    google_project_service.apis,
    time_sleep.wait_for_frontend_image
  ]
}


# Build Docker image for frontend
resource "null_resource" "build_frontend" {
  triggers = {
    # Trigger on environment variable changes
    env_hash = md5(jsonencode({
      project_id = var.project_id
      therapy_analysis_url = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.therapy_analysis.name}"
      storage_access_url = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.storage_access.name}"
      streaming_url = "https://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app"
    }))
  }
  
  provisioner "local-exec" {
    command = <<-EOT
      echo "Building Docker image for frontend..."
      cd ../frontend
      
      # Create production Dockerfile
      cat > Dockerfile << 'EOF'
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

      # Create nginx config
      cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    server {
        listen 80;
        server_name localhost;
        
        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
        
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }
    }
}
EOF

      # Build and push Docker image
      gcloud builds submit --tag gcr.io/${var.project_id}/ther-assist-frontend:latest --project=${var.project_id} --timeout=20m || {
        echo "Failed to build frontend Docker image. Please ensure Cloud Build API is enabled and you have the necessary permissions."
        exit 1
      }
      
      echo "Frontend Docker image built successfully: gcr.io/${var.project_id}/ther-assist-frontend:latest"
    EOT
  }
  
  depends_on = [
    google_project_service.apis,
    google_cloudfunctions2_function.therapy_analysis,
    google_cloudfunctions2_function.storage_access,
    google_cloud_run_v2_service.streaming_transcription,
    local_file.frontend_env
  ]
}

# Add a delay to ensure the frontend image is available in the registry
resource "time_sleep" "wait_for_frontend_image" {
  depends_on = [null_resource.build_frontend]
  
  create_duration = "30s"
}

# Generate environment files for all services
# Frontend .env file
resource "local_file" "frontend_env" {
  content = templatefile("${path.module}/templates/frontend.env.tpl", {
    project_id         = var.project_id
    analysis_api_url   = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.therapy_analysis.name}"
    storage_api_url    = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.storage_access.name}"
    streaming_api_url  = "https://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app"
    auth_domains       = var.auth_allowed_domains
    auth_emails        = var.auth_allowed_emails
  })
  filename = "../frontend/.env"
  
  depends_on = [
    google_cloudfunctions2_function.therapy_analysis,
    google_cloudfunctions2_function.storage_access,
    google_cloud_run_v2_service.streaming_transcription
  ]
}

# Frontend .env.development file
resource "local_file" "frontend_env_dev" {
  content = templatefile("${path.module}/templates/frontend.env.development.tpl", {
    project_id   = var.project_id
    auth_domains = var.auth_allowed_domains
    auth_emails  = var.auth_allowed_emails
  })
  filename = "../frontend/.env.development"
}

# Backend therapy-analysis-function .env file
resource "local_file" "backend_therapy_analysis_env" {
  content = templatefile("${path.module}/templates/backend.env.tpl", {
    project_id    = var.project_id
    auth_domains  = var.auth_allowed_domains
    auth_emails   = var.auth_allowed_emails
  })
  filename = "../backend/therapy-analysis-function/.env"
}

# Backend storage-access-function .env file
resource "local_file" "backend_storage_access_env" {
  content = templatefile("${path.module}/templates/backend.env.tpl", {
    project_id    = var.project_id
    auth_domains  = var.auth_allowed_domains
    auth_emails   = var.auth_allowed_emails
  })
  filename = "../backend/storage-access-function/.env"
}

# Backend streaming-transcription-service .env file
resource "local_file" "backend_streaming_env" {
  content = templatefile("${path.module}/templates/backend-streaming.env.tpl", {
    project_id    = var.project_id
    auth_domains  = var.auth_allowed_domains
    auth_emails   = var.auth_allowed_emails
  })
  filename = "../backend/streaming-transcription-service/.env"
}
