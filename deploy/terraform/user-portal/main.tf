# ============================================================================
# 1. Artifact Registry & Least-Privilege Service Accounts
# ============================================================================

resource "google_artifact_registry_repository" "user_portal_repo" {
  location      = var.region
  repository_id = "ge-user-portal-repo"
  description   = "Container repository for Gemini AI Hub User Portal (Dockerfile.user)"
  format        = "DOCKER"
}

resource "google_service_account" "web_sa" {
  account_id   = "sa-user-portal-web"
  display_name = "Gemini AI Hub User Portal Web Service Account"
}

resource "google_service_account" "sync_sa" {
  account_id   = "sa-user-portal-sync"
  display_name = "Gemini AI Hub User Portal 15-min Sync Job Service Account"
}

resource "google_project_iam_member" "web_sa_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

resource "google_project_iam_member" "sync_sa_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/discoveryengine.viewer",
    "roles/cloudidentity.groupsViewer",
    "roles/run.invoker",
    "roles/logging.logWriter",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.sync_sa.email}"
}

# ============================================================================
# 2. GCP Secret Manager Secrets (OAuth 2.0, Session Secret, DB URL)
# ============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "ge-user-db-url",
    "ge-oauth-client-id",
    "ge-oauth-client-secret",
    "ge-user-session-secret",
  ])
  secret_id = each.value
  replication {
    auto {}
  }
}

# ============================================================================
# 3. Cloud SQL for PostgreSQL 16 (REGIONAL HA, Private IP Only, PITR)
# ============================================================================

resource "google_sql_database_instance" "user_pg" {
  name                = "geapphub-user-pg"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = true

  settings {
    tier              = "db-custom-2-8192"
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 50
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }
  }
}

resource "google_sql_database" "geapphub_user_db" {
  name     = "geapphub_user"
  instance = google_sql_database_instance.user_pg.name
}

# ============================================================================
# 4. Cloud Run v2 Web Service (Warm Production: min=1, max=10, 2 vCPU / 1 GiB)
# ============================================================================

resource "google_cloud_run_v2_service" "user_portal_web" {
  name     = "ge-user-portal-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account                  = google_service_account.web_sa.email
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = var.vpc_network_id
        subnetwork = var.vpc_egress_subnet_id
      }
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "SYNC_ENABLED"
        value = "false"
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["ge-user-db-url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["ge-oauth-client-id"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["ge-oauth-client-secret"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["ge-user-session-secret"].secret_id
            version = "latest"
          }
        }
      }
    }
  }
}

# ============================================================================
# 5. Cloud Run v2 Sync Job & 15-Minute Cloud Scheduler Trigger
# ============================================================================

resource "google_cloud_run_v2_job" "user_portal_sync_job" {
  name     = "ge-user-portal-sync-job"
  location = var.region

  template {
    template {
      service_account = google_service_account.sync_sa.email
      timeout         = "600s"

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"
        network_interfaces {
          network    = var.vpc_network_id
          subnetwork = var.vpc_egress_subnet_id
        }
      }

      containers {
        image   = var.container_image
        command = ["python", "-m", "app.sync_job"]

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets["ge-user-db-url"].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }
}

resource "google_cloud_scheduler_job" "user_portal_sync_schedule" {
  name        = "ge-user-portal-sync-every-15m"
  description = "Triggers ge-user-portal-sync-job every 15 minutes to sync GE apps and Cloud Identity groups"
  schedule    = "*/15 * * * *"
  time_zone   = "Etc/UTC"
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.user_portal_sync_job.name}:run"

    oauth_token {
      service_account_email = google_service_account.sync_sa.email
    }
  }
}

# ============================================================================
# 6. Regional Internal Application Load Balancer (HTTPS) + Private Cloud DNS
# ============================================================================

resource "google_compute_region_network_endpoint_group" "user_portal_neg" {
  name                  = "neg-ge-user-portal-web"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.user_portal_web.name
  }
}

resource "google_compute_region_backend_service" "user_portal_backend" {
  name                  = "bs-ge-user-portal-internal"
  region                = var.region
  protocol              = "HTTPS"
  load_balancing_scheme = "INTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.user_portal_neg.id
    capacity_scaler = 1.0
  }
}

resource "google_compute_region_url_map" "user_portal_url_map" {
  name            = "urlmap-ge-user-portal-internal"
  region          = var.region
  default_service = google_compute_region_backend_service.user_portal_backend.id
}

resource "google_compute_region_target_https_proxy" "user_portal_https_proxy" {
  name             = "proxy-ge-user-portal-internal-https"
  region           = var.region
  url_map          = google_compute_region_url_map.user_portal_url_map.id
  ssl_certificates = [var.ssl_certificate_id]
}

resource "google_compute_address" "user_portal_internal_vip" {
  name         = "vip-ge-user-portal-internal"
  region       = var.region
  subnetwork   = var.ilb_subnet_id
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
}

resource "google_compute_forwarding_rule" "user_portal_https_fw_rule" {
  name                  = "fw-ge-user-portal-internal-https"
  region                = var.region
  ip_protocol           = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  port_range            = "443"
  target                = google_compute_region_target_https_proxy.user_portal_https_proxy.id
  network               = var.vpc_network_id
  subnetwork            = var.ilb_subnet_id
  ip_address            = google_compute_address.user_portal_internal_vip.id
}

resource "google_dns_record_set" "user_portal_dns_a" {
  name         = "${var.internal_domain_name}."
  managed_zone = var.private_dns_zone_name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_address.user_portal_internal_vip.address]
}
