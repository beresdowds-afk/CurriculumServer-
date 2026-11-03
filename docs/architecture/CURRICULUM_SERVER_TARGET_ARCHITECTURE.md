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
