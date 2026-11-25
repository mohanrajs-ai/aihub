variable "project_id" {
  description = "Target Google Cloud Project ID (must be provided by the user)"
  type        = string
}

variable "region" {
  description = "Primary GCP Region for Cloud Run, Internal ALB, and Cloud SQL HA"
  type        = string
  default     = "us-central1"
}

variable "container_image" {
  description = "Artifact Registry container image built from user-portal/Dockerfile"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth 2.0 Web Application Client ID stored automatically in Secret Manager"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 Web Application Client Secret stored automatically in Secret Manager"
  type        = string
  sensitive   = true
  default     = ""
}

variable "internal_domain_name" {
  description = "Internal FQDN provisioned automatically in Cloud DNS Private Zone and TLS Certificate"
  type        = string
  default     = "aihub.internal.corp"
}

variable "github_repo_url" {
  description = "GitHub repository HTTPS or SSH URL hosting the User Portal source code"
  type        = string
  default     = ""
}

variable "github_repo_owner" {
  description = "GitHub organization or user name owning the repository (for Cloud Build GitHub Trigger)"
  type        = string
  default     = ""
}

variable "github_repo_name" {
  description = "GitHub repository name (for Cloud Build GitHub Trigger)"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch pattern that triggers automated builds and deployments"
  type        = string
  default     = "main"
}

variable "subnet_cidr" {
  description = "Primary CIDR range for the User Portal Direct VPC Egress & Internal ALB VIP subnet"
  type        = string
  default     = "10.128.10.0/24"
}

variable "proxy_only_subnet_cidr" {
  description = "CIDR range for the Regional Managed Proxy-Only subnet required by Internal ALB"
  type        = string
  default     = "10.128.11.0/24"
}
