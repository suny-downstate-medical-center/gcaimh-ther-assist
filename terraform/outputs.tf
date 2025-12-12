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

output "therapy_analysis_function_url" {
  description = "URL of the therapy analysis Cloud Function"
  value       = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.therapy_analysis.name}"
}

output "storage_access_function_url" {
  description = "URL of the storage access Cloud Function"
  value       = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.storage_access.name}"
}

output "streaming_transcription_service_url" {
  description = "URL of the streaming transcription Cloud Run service"
  value       = "https://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app"
}

output "frontend_url" {
  description = "URL of the frontend Cloud Run service"
  value       = "https://${google_cloud_run_v2_service.frontend.name}-${data.google_project.current.number}.${var.region}.run.app"
}

output "websocket_url" {
  description = "WebSocket URL for streaming transcription"
  value       = "wss://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app/ws/transcribe"
}

output "deployment_summary" {
  description = "Summary of deployed services"
  value = {
    project_id             = var.project_id
    region                = var.region
    therapy_analysis_url   = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.therapy_analysis.name}"
    storage_access_url     = "https://${var.region}-${var.project_id}.cloudfunctions.net/${google_cloudfunctions2_function.storage_access.name}"
    streaming_service_url  = "https://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app"
    frontend_url          = "https://${google_cloud_run_v2_service.frontend.name}-${data.google_project.current.number}.${var.region}.run.app"
    websocket_url         = "wss://${google_cloud_run_v2_service.streaming_transcription.name}-${data.google_project.current.number}.${var.region}.run.app/ws/transcribe"
  }
}
