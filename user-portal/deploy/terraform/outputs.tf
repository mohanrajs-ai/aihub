output "internal_load_balancer_vip" {
  description = "Private RFC 1918 IP address of the User Portal Internal Application Load Balancer"
  value       = google_compute_address.user_portal_internal_vip.address
}

output "internal_portal_url" {
  description = "Internal HTTPS URL for the Gemini AI Hub User Portal"
  value       = "https://${var.internal_domain_name}"
}

output "private_dns_zone_name" {
  description = "Automated Private Cloud DNS Managed Zone name"
  value       = google_dns_managed_zone.private_zone.name
}

output "ssl_certificate_id" {
  description = "Automated Regional Certificate Manager Certificate ID attached to the Internal HTTPS Load Balancer"
  value       = google_certificate_manager_certificate.user_portal_ssl_cert.id
}

output "cloud_run_service_uri" {
  description = "Cloud Run v2 service URI"
  value       = google_cloud_run_v2_service.user_portal_web.uri
}

output "cloud_sql_private_ip" {
  description = "Private IP address of the geapphub-user-pg Cloud SQL HA instance"
  value       = google_sql_database_instance.user_pg.private_ip_address
}
