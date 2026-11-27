# ============================================================================
# 0. Enable Required Google Cloud APIs Automatically
# ============================================================================

locals {
  required_apis = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "discoveryengine.googleapis.com",
    "cloudidentity.googleapis.com",
  ])
  generated_db_password  = substr(sha256("${var.project_id}-${var.region}-geapphub-user-db"), 0, 24)
  generated_session_hmac = sha256("${var.project_id}-${var.region}-geapphub-session-secret")
  resolved_ssl_certificate_id = (
    var.ssl_certificate_id == "" ? "" : (
      can(regex("^projects/", var.ssl_certificate_id)) || can(regex("^https://", var.ssl_certificate_id))
      ? var.ssl_certificate_id
      : "projects/${var.project_id}/regions/${var.region}/sslCertificates/${var.ssl_certificate_id}"
    )
  )
}

resource "google_project_service" "enabled_apis" {
  for_each           = local.required_apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ============================================================================
# 1. Existing VPC Network & Subnet (via Variables) + Proxy-Only Subnet & PSA
# ============================================================================

data "google_compute_network" "user_portal_vpc" {
  name       = basename(var.vpc_name)
  project    = var.project_id
  depends_on = [google_project_service.enabled_apis]
}

data "google_compute_subnetwork" "user_portal_subnet" {
  name       = basename(var.subnet_name)
  region     = var.region
  project    = var.project_id
  depends_on = [google_project_service.enabled_apis]
}

resource "google_compute_subnetwork" "regional_proxy_subnet" {
  name          = "subnet-ge-user-portal-proxy-only"
  ip_cidr_range = var.proxy_only_subnet_cidr
  region        = var.region
  network       = data.google_compute_network.user_portal_vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

resource "google_compute_global_address" "private_ip_alloc" {
  name          = "psa-ge-user-portal-sql"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = data.google_compute_network.user_portal_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = data.google_compute_network.user_portal_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# ============================================================================
# 2. Least-Privilege Service Accounts (Artifact Registry Repos Created in Step 1)
# ============================================================================

data "google_artifact_registry_repository" "user_portal_source_repo" {
  location      = var.region
  repository_id = var.ar_source_repo_id
  depends_on    = [google_project_service.enabled_apis]
}

data "google_artifact_registry_repository" "user_portal_repo" {
  location      = var.region
  repository_id = var.ar_repo_id
  depends_on    = [google_project_service.enabled_apis]
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
    "roles/run.invoker",
    "roles/logging.logWriter",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.sync_sa.email}"
}

resource "google_organization_iam_member" "cloud_identity_groups_viewer" {
  for_each = var.org_id != "" ? toset(["web", "sync"]) : toset([])
  org_id   = var.org_id
  role     = "roles/cloudidentity.groupsViewer"
  member   = "serviceAccount:${each.key == "web" ? google_service_account.web_sa.email : google_service_account.sync_sa.email}"
}

# ============================================================================
# 3. Cloud SQL for PostgreSQL 16 (REGIONAL HA, Private IP Only, PITR)
# ============================================================================

resource "google_sql_database_instance" "user_pg" {
  name                = "geapphub-user-pg"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = true
  depends_on          = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = "db-custom-2-8192"
    availability_type = "REGIONAL"
    disk_autoresize   = true
    disk_size         = 50
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = data.google_compute_network.user_portal_vpc.id
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

resource "google_sql_user" "appuser" {
  name     = "appuser"
  instance = google_sql_database_instance.user_pg.name
  password = local.generated_db_password
}

# ============================================================================
# 4. GCP Secret Manager (DB & Session Secrets; OAuth Secret Pre-Created in Step 3)
# ============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "ge-user-db-url",
    "ge-user-session-secret",
  ])
  secret_id  = each.value
  depends_on = [google_project_service.enabled_apis]

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url_version" {
  secret      = google_secret_manager_secret.secrets["ge-user-db-url"].id
  secret_data = "postgresql+psycopg://${google_sql_user.appuser.name}:${local.generated_db_password}@${google_sql_database_instance.user_pg.private_ip_address}:5432/${google_sql_database.geapphub_user_db.name}"
}

resource "google_secret_manager_secret_version" "session_secret_version" {
  secret      = google_secret_manager_secret.secrets["ge-user-session-secret"].id
  secret_data = local.generated_session_hmac
}

# ============================================================================
# 5. Cloud Run v2 Web Service (Warm Production: min=1, max=10, 2 vCPU / 1 GiB)
# ============================================================================

resource "google_cloud_run_v2_service" "user_portal_web" {
  name     = "ge-user-portal-web"
  location = var.region
  ingress  = var.cloud_run_ingress
  depends_on = [
    google_project_iam_member.web_sa_roles,
    google_secret_manager_secret_version.db_url_version,
    google_secret_manager_secret_version.session_secret_version,
  ]

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
        network    = data.google_compute_network.user_portal_vpc.id
        subnetwork = data.google_compute_subnetwork.user_portal_subnet.id
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
        cpu_idle = false
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
        name  = "SYNC_ON_STARTUP"
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
        name = "GOOGLE_OAUTH_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = var.oauth_secret_name
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
# 6. Cloud Run v2 Sync Job & 15-Minute Cloud Scheduler Trigger
# ============================================================================

resource "google_cloud_run_v2_job" "user_portal_sync_job" {
  name       = "ge-user-portal-sync-job"
  location   = var.region
  depends_on = [
    google_project_iam_member.sync_sa_roles,
    google_secret_manager_secret_version.db_url_version,
  ]

  template {
    template {
      service_account = google_service_account.sync_sa.email
      timeout         = "600s"

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"
        network_interfaces {
          network    = google_compute_network.user_portal_vpc.id
          subnetwork = google_compute_subnetwork.user_portal_subnet.id
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
# 7. Regional Internal Application Load Balancer (Uses SSL_CERTIFICATE_ID)
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
  protocol              = "HTTP"
  load_balancing_scheme = "INTERNAL_MANAGED"

  backend {
    group           = google_compute_region_network_endpoint_group.user_portal_neg.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
}

resource "google_compute_region_url_map" "user_portal_url_map" {
  name            = "urlmap-ge-user-portal-internal"
  region          = var.region
  default_service = google_compute_region_backend_service.user_portal_backend.id
}

resource "google_compute_address" "user_portal_internal_vip" {
  name         = "vip-ge-user-portal-internal"
  region       = var.region
  subnetwork   = data.google_compute_subnetwork.user_portal_subnet.id
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
}

resource "google_compute_region_target_http_proxy" "user_portal_http_proxy" {
  count   = local.resolved_ssl_certificate_id == "" ? 1 : 0
  name    = "proxy-ge-user-portal-internal-http"
  region  = var.region
  url_map = google_compute_region_url_map.user_portal_url_map.id
}

resource "google_compute_forwarding_rule" "user_portal_http_fw_rule" {
  count                 = local.resolved_ssl_certificate_id == "" ? 1 : 0
  name                  = "fw-ge-user-portal-internal-http"
  region                = var.region
  ip_protocol           = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.user_portal_http_proxy[0].id
  network               = data.google_compute_network.user_portal_vpc.id
  subnetwork            = data.google_compute_subnetwork.user_portal_subnet.id
  ip_address            = google_compute_address.user_portal_internal_vip.id
  depends_on            = [google_compute_subnetwork.regional_proxy_subnet]
}

resource "google_compute_region_target_https_proxy" "user_portal_https_proxy" {
  count            = local.resolved_ssl_certificate_id != "" ? 1 : 0
  name             = "proxy-ge-user-portal-internal-https"
  region           = var.region
  url_map          = google_compute_region_url_map.user_portal_url_map.id
  ssl_certificates = [local.resolved_ssl_certificate_id]
}

resource "google_compute_forwarding_rule" "user_portal_https_fw_rule" {
  count                 = local.resolved_ssl_certificate_id != "" ? 1 : 0
  name                  = "fw-ge-user-portal-internal-https"
  region                = var.region
  ip_protocol           = "TCP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  port_range            = "443"
  target                = google_compute_region_target_https_proxy.user_portal_https_proxy[0].id
  network               = data.google_compute_network.user_portal_vpc.id
  subnetwork            = data.google_compute_subnetwork.user_portal_subnet.id
  ip_address            = google_compute_address.user_portal_internal_vip.id
  depends_on            = [google_compute_subnetwork.regional_proxy_subnet]
}
