variable "project_id" {
  description = "Target Google Cloud Project ID (must be provided by the user)"
  type        = string
}

variable "region" {
  description = "Primary GCP Region for Cloud Run, Internal ALB, and Cloud SQL HA"
  type        = string
  default     = "us-central1"
}

variable "vpc_network_id" {
  description = "Self-link or ID of the shared/existing VPC network"
  type        = string
}

variable "vpc_egress_subnet_id" {
  description = "Subnet ID used by Cloud Run Direct VPC Egress"
  type        = string
}

variable "ilb_subnet_id" {
  description = "Subnet ID for the Internal Application Load Balancer forwarding rule VIP"
  type        = string
}

variable "container_image" {
  description = "Artifact Registry container image built from user-portal/Dockerfile"
  type        = string
}

variable "internal_domain_name" {
  description = "Internal FQDN in Cloud DNS Private Zone for the User Portal"
  type        = string
}

variable "private_dns_zone_name" {
  description = "Existing Cloud DNS Private Zone name where the A record will be registered"
  type        = string
}

variable "ssl_certificate_id" {
  description = "Regional SSL Certificate ID (CAS / Private PKI) for the Internal HTTPS Load Balancer"
  type        = string
}
