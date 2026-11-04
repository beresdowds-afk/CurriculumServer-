# Curriculum Server — Phase 1 Infrastructure Report: Cloud SQL & Central Cloud Run Services

## 1. Environment & Scope Verification
- **GCP Project ID**: `curious-subject-477114-e4`
- **Region**: `europe-west1` (Belgium)
- **Database Engine**: Cloud SQL for PostgreSQL 15+ (`curriculum-postgres-primary`)
- **Schemas**: `control_plane`, `curriculum_flow`
- **Firebase**: Prohibited (excluded from architecture)

## 2. Service Identities Inventory & Verification
In accordance with mandatory instructions, pre-created service identities are mapped to workloads without modifying their IAM bindings or permissions:
- `cs-frontend-runtime` → Attached to Cloud Run service `curriculum-server`
- `cf-frontend-runtime` → Attached to Cloud Run service `curriculum-flow`
- `backend-runtime` → Attached to Cloud Run service `curriculum-backend`
- `project-factory` → Designated for Cloud Run Job `curriculum-project-factory`
- `infrastructure-deployer` → Designated for Cloud Run Job `curriculum-infrastructure-deployer`
- `domain-manager` → Designated for Cloud Run Job `curriculum-domain-manager`
- `provisioning-orchestrator` → Designated for Cloud Workflow `curriculum-provisioning-orchestrator`
- `curriculum-ci-deployer` → Designated for GitHub Actions Workload Identity Federation

## 3. Cloud SQL PostgreSQL Specification (`curriculum-postgres-primary`)
- **Instance Name**: `curriculum-postgres-primary`
- **Database**: `curriculum_platform`
- **Schemas**: `control_plane`, `curriculum_flow`
- **Tier**: Enterprise (2 vCPU, 8 GB RAM, 100 GB SSD)
- **High Availability**: Regional HA for production (single zone for dev/test)
- **Protection**: Automated backups, PITR enabled, deletion protection enabled.
- **Connectivity**: Private IP / Cloud SQL Auth Proxy model (no unrestricted public IP exposure).

## 4. Central Cloud Run Services
1. **`curriculum-server`** (Control Plane Frontend)
   - Runtime Identity: `cs-frontend-runtime`
   - CPU: 1 vCPU, Memory: 1 GiB, Port: 8080, Max Instances: 10
   - Preservation: Existing deployment preserved without breaking routing.
2. **`curriculum-flow`** (Education Application Frontend)
   - Runtime Identity: `cf-frontend-runtime`
   - CPU: 1 vCPU, Memory: 1 GiB, Port: 8080, Max Instances: 30
3. **`curriculum-backend`** (Unified Application API)
   - Runtime Identity: `backend-runtime`
   - CPU: 2 vCPU, Memory: 2 GiB, Port: 8080, Max Instances: 30, Timeout: 120s
   - Container Image: Pending deployment container image build.

## 5. Secrets and Environment Configuration Compliance
- **Zero Secrets Installed**: In strict compliance with security directives, no passwords, API keys, tokens, or Cloud Run environment variables containing credentials or application config have been created or populated.
- **Configuration Register**: See `docs/infrastructure/CREDENTIALS_AND_CONFIG_REGISTER.md`.

## 6. Phase 1 Acceptance Status
- Cloud SQL specification and connectivity prepared.
- Schemas (`control_plane`, `curriculum_flow`) defined.
- Three central Cloud Run services specified with correct runtime identities.
- Existing `curriculum-server` preserved.
- Ready for Phase 1 sign-off and administrator review.
