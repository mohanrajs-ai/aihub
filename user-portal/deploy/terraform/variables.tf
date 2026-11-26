variable "project_id" {
  description = "Target Google Cloud Project ID (must be provided by the user)"
  type        = string
}

variable "region" {
  description = "Primary GCP Region for Google Artifact Registry, Cloud Run, Internal ALB, and Cloud SQL HA"
  type        = string
  default     = "us-central1"
}

variable "ar_repo_id" {
  description = "Google Artifact Registry Docker repository ID"
  type        = string
  default     = "ge-user-portal-repo"
}

variable "container_image" {
  description = "Google Artifact Registry container image URI built from user-portal/Dockerfile"
  type        = string
}

variable "oauth_Secret_name" {
  description = "Deprecated alias; use oauth_secret_name"
  type        = string
  default     = ""
}

variable "oauth_secret_name" {
  description = "Cloud Secret Manager secret ID storing both Google OAuth 2.0 Client ID and Client Secret (JSON)"
  type        = string
  default     = "ge-oauth-credentials"
}

variable "ssl_secret_name" {
  description = "Cloud Secret Manager secret ID storing both the TLS SSL Certificate and Private Key (combined PEM or JSON)"
  type        = string
  default     = "ge-ssl-certificate"
}

variable "oauth_credentials_json" {
  description = "Optional JSON payload containing client_id and client_secret to seed into ge-oauth-credentials"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssl_bundle_pem" {
  description = "Optional combined PEM (certificate + private key) or JSON to seed into ge-ssl-certificate"
  type        = string
  sensitive   = true
  default     = ""
}

variable "internal_domain_name" {
  description = "Internal FQDN for the User Portal"
  type        = string
  default     = "aihub.internal.corp"
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
