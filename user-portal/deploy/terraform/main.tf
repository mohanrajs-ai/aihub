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
    "dns.googleapis.com",
    "privateca.googleapis.com",
    "certificatemanager.googleapis.com",
    "discoveryengine.googleapis.com",
    "cloudidentity.googleapis.com",
  ])
  dns_zone_domain        = join(".", slice(split(".", var.internal_domain_name), 1, length(split(".", var.internal_domain_name))))
  generated_db_password  = substr(sha256("${var.project_id}-${var.region}-geapphub-user-db"), 0, 24)
  generated_session_hmac = sha256("${var.project_id}-${var.region}-geapphub-session-secret")
}

resource "google_project_service" "enabled_apis" {
  for_each           = local.required_apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ============================================================================
# 1. Automated VPC Network, Subnets, Proxy-Only Subnet & Private Services Access
# ============================================================================

resource "google_compute_network" "user_portal_vpc" {
  name                    = "vpc-ge-user-portal"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.enabled_apis]
}

resource "google_compute_subnetwork" "user_portal_subnet" {
  name                     = "subnet-ge-user-portal"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.user_portal_vpc.id
  private_ip_google_access = true
}

resource "google_compute_subnetwork" "regional_proxy_subnet" {
  name          = "subnet-ge-user-portal-proxy-only"
  ip_cidr_range = var.proxy_only_subnet_cidr
  region        = var.region
  network       = google_compute_network.user_portal_vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

resource "google_compute_global_address" "private_ip_alloc" {
  name          = "psa-ge-user-portal-sql"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.user_portal_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.user_portal_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# ============================================================================
# 2. Artifact Registry & Least-Privilege Service Accounts
# ============================================================================

resource "google_artifact_registry_repository" "user_portal_repo" {
  location      = var.region
  repository_id = "ge-user-portal-repo"
  description   = "Container repository for Gemini AI Hub User Portal"
  format        = "DOCKER"
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
    "roles/cloudidentity.groupsViewer",
    "roles/run.invoker",
    "roles/logging.logWriter",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.sync_sa.email}"
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
      private_network = google_compute_network.user_portal_vpc.id
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
# 4. GCP Secret Manager Secrets & Automated Secret Versions
# ============================================================================

resource "google_secret_manager_secret" "secrets" {
  for_each = toset([
    "ge-user-db-url",
    "ge-oauth-client-id",
    "ge-oauth-client-secret",
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

resource "google_secret_manager_secret_version" "oauth_client_id_version" {
  secret      = google_secret_manager_secret.secrets["ge-oauth-client-id"].id
  secret_data = var.google_client_id != "" ? var.google_client_id : "configure-google-oauth-client-id"
}

resource "google_secret_manager_secret_version" "oauth_client_secret_version" {
  secret      = google_secret_manager_secret.secrets["ge-oauth-client-secret"].id
  secret_data = var.google_client_secret != "" ? var.google_client_secret : "configure-google-oauth-client-secret"
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
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
  depends_on = [
    google_project_iam_member.web_sa_roles,
    google_secret_manager_secret_version.db_url_version,
    google_secret_manager_secret_version.oauth_client_id_version,
    google_secret_manager_secret_version.oauth_client_secret_version,
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
        network    = google_compute_network.user_portal_vpc.id
        subnetwork = google_compute_subnetwork.user_portal_subnet.id
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
# 7. Automated Certificate Authority Service (CAS), Regional Cert Manager,
#    Internal HTTPS Application Load Balancer & Private Cloud DNS Zone
# ============================================================================

resource "google_privateca_ca_pool" "user_portal_ca_pool" {
  name       = "capool-ge-user-portal"
  location   = var.region
  tier       = "DEVOPS"
  depends_on = [google_project_service.enabled_apis]
}

resource "google_privateca_certificate_authority" "user_portal_root_ca" {
  pool                                   = google_privateca_ca_pool.user_portal_ca_pool.name
  certificate_authority_id               = "ca-ge-user-portal-root"
  location                               = var.region
  deletion_protection                    = false
  skip_grace_period                      = true
  ignore_active_certificates_on_deletion = true

  config {
    subject_config {
      subject {
        organization = "Gemini AI Hub"
        common_name  = "Gemini AI Hub Internal Root CA"
      }
    }
    x509_config {
      ca_options {
        is_ca = true
      }
      key_usage {
        base_key_usage {
          cert_sign = true
          crl_sign  = true
        }
        extended_key_usage {
          server_auth = true
        }
      }
    }
  }

  key_spec {
    algorithm = "RSA_PKCS1_2048_SHA256"
  }
}

resource "google_certificate_manager_certificate_issuance_config" "user_portal_cert_issuance" {
  name       = "issuance-ge-user-portal"
  location   = var.region
  lifetime   = "2592000s" # 30 days auto-renewed by Certificate Manager
  rotation_window_percentage = 66
  key_algorithm              = "RSA_2048"
  depends_on = [google_privateca_certificate_authority.user_portal_root_ca]

  certificate_authority_config {
    certificate_authority_service_config {
      ca_pool = google_privateca_ca_pool.user_portal_ca_pool.id
    }
  }
}

resource "google_certificate_manager_certificate" "user_portal_ssl_cert" {
  name     = "cert-ge-user-portal-internal"
  location = var.region
  scope    = "CLIENT_AUTH"

  managed {
    domains            = [var.internal_domain_name]
    issuance_config    = google_certificate_manager_certificate_issuance_config.user_portal_cert_issuance.id
  }
}

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
  name                             = "proxy-ge-user-portal-internal-https"
  region                           = var.region
  url_map                          = google_compute_region_url_map.user_portal_url_map.id
  certificate_manager_certificates = [google_certificate_manager_certificate.user_portal_ssl_cert.id]
}

resource "google_compute_address" "user_portal_internal_vip" {
  name         = "vip-ge-user-portal-internal"
  region       = var.region
  subnetwork   = google_compute_subnetwork.user_portal_subnet.id
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
  network               = google_compute_network.user_portal_vpc.id
  subnetwork            = google_compute_subnetwork.user_portal_subnet.id
  ip_address            = google_compute_address.user_portal_internal_vip.id
  depends_on            = [google_compute_subnetwork.regional_proxy_subnet]
}

resource "google_dns_managed_zone" "private_zone" {
  name        = "zone-ge-user-portal-private"
  dns_name    = "${local.dns_zone_domain}."
  description = "Automated Private Cloud DNS Zone for Gemini AI Hub User Portal"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.user_portal_vpc.id
    }
  }
}

resource "google_dns_record_set" "user_portal_dns_a" {
  name         = "${var.internal_domain_name}."
  managed_zone = google_dns_managed_zone.private_zone.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_address.user_portal_internal_vip.address]
}

# ============================================================================
# 8. Optional Cloud Build GitHub Trigger (CI/CD from GitHub Repository)
# ============================================================================

resource "google_cloudbuild_trigger" "user_portal_github_ci" {
  count       = var.github_repo_owner != "" && var.github_repo_name != "" ? 1 : 0
  name        = "ge-user-portal-github-ci"
  description = "Builds and pushes Gemini AI Hub User Portal from GitHub (${var.github_repo_owner}/${var.github_repo_name})"
  location    = var.region
  filename    = "user-portal/cloudbuild.yaml"

  included_files = [
    "user-portal/**",
  ]

  github {
    owner = var.github_repo_owner
    name  = var.github_repo_name
    push {
      branch = "^${var.github_branch}$"
    }
  }

  substitutions = {
    _REGION     = var.region
    _AR_REPO    = google_artifact_registry_repository.user_portal_repo.repository_id
    _IMAGE_NAME = "ge-user-portal"
    _TAG        = "latest"
  }
}
