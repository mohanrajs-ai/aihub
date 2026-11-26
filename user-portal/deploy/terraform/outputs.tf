output "artifact_registry_repository" {
  description = "Google Artifact Registry Docker repository URI for User Portal container images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.user_portal_repo.repository_id}"
}

output "internal_load_balancer_vip" {
  description = "Private RFC 1918 IP address of the User Portal Internal HTTPS Application Load Balancer (map your DNS A record to this VIP)"
  value       = google_compute_address.user_portal_internal_vip.address
}

output "ssl_certificate_self_link" {
  description = "Regional Compute SSL Certificate provisioned from Cloud Secret Manager"
  value       = google_compute_region_ssl_certificate.user_portal_ssl_cert.self_link
}

output "cloud_run_service_uri" {
  description = "Cloud Run v2 service URI"
  value       = google_cloud_run_v2_service.user_portal_web.uri
}

output "cloud_sql_private_ip" {
  description = "Private IP address of the geapphub-user-pg Cloud SQL HA instance"
  value       = google_sql_database_instance.user_pg.private_ip_address
}
