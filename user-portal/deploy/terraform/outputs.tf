output "gcs_source_bucket" {
  description = "GCS bucket used for syncing User Portal source code and staging Cloud Build archives"
  value       = "gs://${google_storage_bucket.user_portal_source_bucket.name}"
}

output "internal_load_balancer_vip" {
  description = "Private RFC 1918 IP address of the User Portal Internal Application Load Balancer (map your manual DNS A record to this VIP)"
  value       = google_compute_address.user_portal_internal_vip.address
}

output "cloud_run_service_uri" {
  description = "Cloud Run v2 service URI"
  value       = google_cloud_run_v2_service.user_portal_web.uri
}

output "cloud_sql_private_ip" {
  description = "Private IP address of the geapphub-user-pg Cloud SQL HA instance"
  value       = google_sql_database_instance.user_pg.private_ip_address
}
