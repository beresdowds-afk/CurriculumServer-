# Application Service Identity and IAM Permission Matrix

## 1. Architectural Overview of Service Identities
To enforce the principle of least privilege across the Curriculum Server platform, distinct service identities are defined for each operational tier. These service identities govern application runtimes, CI/CD pipelines, and infrastructure provisioning agents.

| Service Identity Name | Architectural Purpose | Intended Resource Scope | Permission Type | Human Approval Required |
| :--- | :--- | :--- | :--- | :--- |
| `cs-frontend-runtime` | Runs Curriculum Server Control Plane UI (Cloud Run) | Public / Internal Load Balancer | Least-Privilege HTTPS Ingress | No |
| `cf-frontend-runtime` | Runs Curriculum Flow School ERP UI (Cloud Run) | Public / Internal Load Balancer | Least-Privilege HTTPS Ingress | No |
| `backend-runtime` | Runs Unified Express Backend API & DB access | Cloud SQL, Secret Manager (read-only) | DML Database Access & API Handling | No |
| `project-factory` | Provisions new customer GCP projects | GCP Organisation / Folder scope | Project Creation & Folder Association | **Yes (PIAM)** |
| `infrastructure-deployer` | Deploys Cloud Run services and jobs | Dedicated Customer GCP Projects | Cloud Run & Secret Access | **Yes (PIAM)** |
| `domain-manager` | Manages DNS records and custom domains | Cloud DNS / Registrar APIs | DNS Record CRUD | **Yes (PIAM)** |
| `provisioning-orchestrator` | Coordinates multi-step provisioning workflows | Control Plane DB & Provisioning APIs | Orchestration State Machine | No |
| `curriculum-ci-deployer` | CI/CD deployment runner (GitHub Actions) | Artifact Registry & Cloud Run revision deploy | CI/CD Deployment scope | No |

## 2. Security Boundaries & Least Privilege
- **Frontend Isolation**: Frontend service identities (`cs-frontend-runtime`, `cf-frontend-runtime`) have zero direct database access or infrastructure provisioning privileges.
- **Backend Least Privilege**: The backend identity (`backend-runtime`) only connects to `curriculum_platform` via application connection strings with DML rights.
- **Privileged Operations**: Infrastructure-altering identities (`project-factory`, `infrastructure-deployer`, `domain-manager`) require explicit human approval via the Privileged Infrastructure Authorisation Manager (PIAM) before any execution.
