variable "project_id" {
  description = "Target Google Cloud Project ID (must be provided by the user)"
  type        = string
}

variable "org_id" {
  description = "Google Cloud Organization ID used to grant roles/cloudidentity.groupsViewer to the Web and Sync service accounts"
  type        = string
  default     = ""
}

variable "region" {
  description = "Primary GCP Region for Google Artifact Registry, Cloud Run, Internal ALB, and Cloud SQL HA"
  type        = string
  default     = "us-central1"
}

variable "ar_source_repo_id" {
  description = "Google Artifact Registry Generic repository ID for storing User Portal source code archives"
  type        = string
  default     = "ge-user-portal-source"
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

variable "oauth_secret_name" {
  description = "Cloud Secret Manager secret ID storing both Google OAuth 2.0 Client ID and Client Secret (JSON)"
  type        = string
  default     = "ge-oauth-credentials"
}

variable "oauth_credentials_json" {
  description = "Optional JSON payload containing client_id and client_secret to seed into ge-oauth-credentials"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssl_certificate_id" {
  description = "Regional Compute SSL Certificate ID or name (e.g. projects/<PROJECT_ID>/regions/<REGION>/sslCertificates/<CERT_NAME> or <CERT_NAME>)"
  type        = string
  default     = ""
}

variable "internal_domain_name" {
  description = "Internal FQDN for the User Portal"
  type        = string
  default     = "aihub.internal.corp"
}

variable "cloud_run_ingress" {
  description = "Cloud Run ingress setting (INGRESS_TRAFFIC_INTERNAL_ONLY satisfies constraints/run.allowedIngress org policy and allows Internal ALB + VPC traffic)"
  type        = string
  default     = "INGRESS_TRAFFIC_INTERNAL_ONLY"
}

variable "cloud_run_vpc_egress" {
  description = "Cloud Run Direct VPC Egress setting (ALL_TRAFFIC routes all egress via VPC with no direct internet egress, satisfying constraints/run.allowedVPCEgress)"
  type        = string
  default     = "ALL_TRAFFIC"
}

variable "vpc_name" {
  description = "Existing VPC network ID or name (for Shared VPC: projects/<HOST_PROJECT_ID>/global/networks/<VPC_NAME>)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "Full Shared VPC self-link or resource ID (projects/<HOST_PROJECT_ID>/global/networks/<VPC_NAME>)"
  type        = string
  default     = ""
}

variable "subnet_name" {
  description = "Existing regional subnetwork ID or name (for Shared VPC: projects/<HOST_PROJECT_ID>/regions/<REGION>/subnetworks/<SUBNET_NAME>)"
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Full Shared VPC subnetwork self-link or resource ID (projects/<HOST_PROJECT_ID>/regions/<REGION>/subnetworks/<SUBNET_NAME>)"
  type        = string
  default     = ""
}

variable "vpc_host_project_id" {
  description = "Optional Shared VPC Host Project ID (automatically extracted when vpc_id/vpc_name is in projects/<HOST_PROJECT_ID>/global/networks/<VPC_NAME> format)"
  type        = string
  default     = ""
}
