# Curriculum Server & Curriculum Flow — Target System Architecture

## 1. Executive Architecture Overview
Curriculum Server is a multi-architecture SaaS provisioning and control-plane platform designed to manage educational institutions, school groups, and multi-campus foundations. Curriculum Flow is the education operating system application family running on top of Curriculum Server.

### Key Architectural Principles
- **Separation of Control Plane and Workloads**: Curriculum Server manages customer lifecycle, tenant provisioning, application registries, feature entitlements, domain routing, and infrastructure governance. Curriculum Flow provides the operational school ERP features (admissions, attendance, CBT, bursary, report cards).
- **Unified Backend**: A single securely governed backend service (`server.ts` / API endpoints) serves both frontends with strict server-side tenant isolation and RBAC.
- **PostgreSQL Control & Operational Plane**: Authoritative relational storage (`curriculum_platform` database) utilizing separate schemas for `control_plane` and `curriculum_flow`.
- **Intelligent Instance Architecture & Provisioning Engine (IIAPE)**: Recommends appropriate deployment topologies (shared multi-tenant, dedicated Cloud Run services, dedicated GCP projects) based on scale and security requirements.
- **Privileged Infrastructure Authorisation Manager (PIAM)**: Enforces human-in-the-loop approvals for sensitive infrastructure operations (project creation, billing association, custom domain assignment).

---

## 2. Existing Application Audit & Classification

| Component / Subsystem | Implementation Status | Operational Readiness |
| :--- | :--- | :--- |
| **Curriculum Server Control Plane Frontend** | Implemented | Operational (Dashboard, Portals, IIAPE, Billing) |
| **Curriculum Flow Education App Frontend** | Implemented | Operational (23 modular school ERP tabs & CBT) |
| **Unified Backend API (`server.ts`)** | Implemented | Operational (Express middleware, mock DB fallback, health checks) |
| **PostgreSQL Database Integration** | Designed / Migrations Prepared | Ready for Cloud SQL Connection |
| **Instance Architecture Profiles & IIAPE** | Implemented | Operational (Interactive simulator & recommender) |
| **Domain Management & Routing** | Implemented | Operational (Registrar simulation & DNS checks) |
| **Provisioning & PIAM Authorisation** | Implemented | Operational (Approval workflows & audit logs) |
| **Google Cloud Live Infrastructure Execution** | Restricted (By Design) | Out of AI Studio scope; integration contracts prepared |

---

## 3. Frontend Application Separation
- **Curriculum Server (`/apps/curriculum-server` or main SaaS control plane)**: Focuses on SaaS administration, customer accounts, subscription billing, domain registrar integration, IIAPE recommendations, and provisioning orchestration.
- **Curriculum Flow (`/apps/curriculum-flow` or `/src`)**: Focuses on school management operations, NERDC curriculum alignment, teacher delivery tracking, CBT examination kiosks, attendance, and bursary accounting.

## 4. Central Shared-Services Foundation (Stage 1)

The backend maintains a versioned registry for `central_curriculum`, `central_textbooks`, and `central_vehicle_tracking`. Curriculum and textbook services are registered but unavailable until their central databases and operational adapters are provisioned. Vehicle tracking is explicitly planned/deferred; GPS ingestion, telemetry, and tracking operations are not implemented.

Tenant-facing discovery, authorization, and health foundations are under `/api/v1/shared/{curriculum,textbooks,vehicle-tracking}`. They require the existing signed tenant session, active database-verified membership, a tenant-owned active application instance, a declared `centralServiceDependencies` entry, an explicit database-backed permission, and a non-expired, non-revoked platform entitlement. Requests and entitlement lifecycle changes are audited; entitlement administration uses the existing platform-administrator and signed control-plane transaction mechanisms. The entitlement table is forced through PostgreSQL RLS.

Central curriculum and textbook records are not stored as school-owned records by this foundation. School-instance Question Bank, examinations, assessment, and CBT remain instance-owned. Application service dependencies are recorded separately from locally provisioned capabilities; this extends the configuration contract without implementing the later Application Builder workflow.
