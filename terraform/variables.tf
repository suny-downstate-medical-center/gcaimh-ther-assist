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

variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region for deployments"
  type        = string
  default     = "us-central1"
}

variable "auth_allowed_domains" {
  description = "Comma-separated list of allowed domains for authentication"
  type        = string
  default     = "google.com"
}

variable "auth_allowed_emails" {
  description = "Comma-separated list of allowed emails for authentication"
  type        = string
}
