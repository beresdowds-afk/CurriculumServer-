# IIAPE and Versioned Instance Architecture Profiles

## 1. Intelligent Instance Architecture & Provisioning Engine (IIAPE)
IIAPE analyses customer requirements (student capacity, user count, concurrency, data retention, compliance, and budget) to recommend optimal deployment topologies:
1. **Shared Application Infrastructure**: Multi-tenant shared Cloud Run service for micro-schools and low-density academies.
2. **Dedicated Cloud Run Service**: Isolated container deployment for mid-tier colleges.
3. **Dedicated GCP Project**: Sovereign project provisioning for school groups and large university foundations.
4. **Dedicated Database Infrastructure**: Dedicated Cloud SQL instance for high-throughput transactional isolation.
5. **Hybrid Architecture**: Edge node synchronization combined with central cloud control.

IIAPE strictly separates **recommendations** from **human-approved deployment decisions**.

## 2. Versioned Instance Architecture Profiles
Every provisioned instance is governed by an authoritative JSON/PostgreSQL architecture profile (`InstanceArchitectureProfile`) capturing:
- Customer & Organisation reference IDs.
- Instance type & application family.
- Enabled feature entitlements & bundles.
- GCP project and resource identifiers.
- Database & storage strategy.
- Security & IAM boundary rules.
- Complete approval history and version changelog.
