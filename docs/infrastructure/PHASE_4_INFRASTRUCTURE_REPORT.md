# Curriculum Server — Phase 4 Infrastructure Report: Monitoring, Storage & Operational Readiness

## 1. Customer Storage Infrastructure Architecture
To support tenant data storage, backup archives, and document uploads:
- **Google Cloud Storage**: Tenant-isolated GCS buckets configured with:
  - Uniform bucket-level access enabled.
  - Public access prevention enforced.
  - Object versioning and lifecycle retention rules.
- **Private Drive Integration**: OAuth-delegated access abstraction supporting Google Drive, OneDrive, and Dropbox without storing customer passwords.

## 2. Central Observability & Monitoring
- **Cloud Monitoring Dashboards**: Real-time tracking of Cloud Run CPU/memory utilization, container concurrency, request latencies, and error rates.
- **Cloud SQL Health Checks**: Monitoring connection pool exhaustion, IOPS, CPU utilization, and replication lag.
- **Alerting Policies**: Uptime checks and threshold alerts configured for service degradation and provisioning job failures.

## 3. Billing & Cost Governance
- **Resource Labelling**: Mandatory resource ownership labels (`tenant_id`, `environment`, `app_family`).
- **Budget Monitoring**: GCP budget alerts configured to notify administrators of cost spikes.
- **Cost Attribution**: Per-instance cost tracking for billing reconciliation.
