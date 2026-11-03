# Provisioning Control Plane and Orchestration Architecture

## 1. Control Plane Interfaces
The control plane exposes abstract execution interfaces for infrastructure integration:
- **Project Factory Interface**: Manages customer GCP project creation, folder assignment, billing association, and security baseline application.
- **Infrastructure Deployer Interface**: Manages Cloud Run service deployments, container revisions, secret references, and health verification.
- **Domain Manager Interface**: Manages DNS records, custom domain verification, and SSL status monitoring.

## 2. Provisioning Lifecycle States
Provisioning jobs progress through a robust state machine:
`Draft` → `Submitted` → `Architecture Review` → `Awaiting Approval` → `Approved` (or `Rejected`) → `Ready for Execution` → `Executing` → `Awaiting Verification` → `Completed` (or `Failed` / `Rollback Required`).

## 3. Orchestration Engine (`curriculum-provisioning-orchestrator`)
Coordinates execution requests against authoritative architecture profiles, validates PIAM authorisations, tracks idempotency keys, handles retries, and records execution results prior to instance activation.
