# Curriculum Server — Phase 3 Infrastructure Report: Provisioning Jobs & Workflows

## 1. Cloud Run Jobs for Automated Provisioning
To execute asynchronous customer provisioning workflows securely and reliably, three dedicated Cloud Run Jobs are specified and configured to run with their respective pre-created service identities:

### A. `curriculum-project-factory`
- **Purpose**: Execution environment for customer GCP project creation, folder assignment, billing association, API enablement, and security baseline application.
- **Runtime Identity**: `project-factory`
- **Resources**: 2 vCPU, 2 GiB RAM
- **Execution Limits**: Task count: 1, Parallelism: 1, Timeout: 60 minutes.

### B. `curriculum-infrastructure-deployer`
- **Purpose**: Execution environment for approved customer infrastructure deployment (Cloud Run services, container revisions, secret references, database provisioning).
- **Runtime Identity**: `infrastructure-deployer`
- **Resources**: 4 vCPU, 4 GiB RAM
- **Execution Limits**: Task count: 1, Parallelism: 1, Timeout: 120 minutes.

### C. `curriculum-domain-manager`
- **Purpose**: Execution environment for domain registration, DNS record configuration, nameserver management, and SSL verification.
- **Runtime Identity**: `domain-manager`
- **Resources**: 1 vCPU, 1 GiB RAM
- **Execution Limits**: Task count: 1, Parallelism: 1, Timeout: 30 minutes.

## 2. Cloud Workflows Orchestrator (`curriculum-provisioning-orchestrator`)
- **Region**: `europe-west1`
- **Runtime Identity**: `provisioning-orchestrator`
- **Orchestration Lifecycle**:
  1. Receives and validates approved provisioning request.
  2. Retrieves authoritative Instance Architecture Profile.
  3. Verifies human approval status via PIAM.
  4. Triggers `curriculum-project-factory` Job.
  5. Triggers `curriculum-infrastructure-deployer` Job.
  6. Triggers `curriculum-domain-manager` Job.
  7. Performs health checks and activates tenant instance.

## 3. Supporting Infrastructure & Artifact Registry
- **Artifact Registry**: Docker repository configured in `europe-west1` for hosting version-controlled container images.
- **Audit Logging**: Cloud Logging and Cloud Audit Logs enabled for all provisioning jobs and workflow executions.

## 4. Phase 3 Acceptance Status
- Three Cloud Run Jobs specified with correct service identities.
- Cloud Workflow orchestrator defined.
- Supporting Artifact Registry and logging configured.
- Zero secrets installed.
- Ready for Phase 3 sign-off and administrator review.
