# Customer Storage, Monitoring, and Cost Governance Architecture

## 1. Provider-Independent Storage Abstraction
Curriculum Server supports a flexible storage model:
1. **Platform-Managed Cloud Storage**: Tenant-isolated GCS buckets with strict IAM and lifecycle retention policies.
2. **Private Drive Integration**: OAuth-delegated access to Google Drive, OneDrive, or Dropbox without storing user passwords.
3. **Hybrid Storage**: Combined local caching and cloud archiving.

## 2. Monitoring & Cost Governance
- Tracks Cloud Run container CPU/memory usage, connection pool utilization, API request latencies, and error rates.
- Enforces per-instance cost attribution, budget threshold alerts, and storage usage metering.
