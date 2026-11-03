# Phase 3 — Backend Separation and Secure API Architecture Report

## 1. Executive Summary
Phase 3 establishes clean backend ownership and cryptographic security boundaries between **Curriculum Server** (the SaaS control plane and provisioning platform) and **Curriculum Flow** (the school-facing academic management ERP). While both applications share the underlying PostgreSQL relational storage engine and NERDC curriculum core, their backend routes, service modules, authentication guards, and API contracts are fully partitioned.

---

## 2. Backend Ownership Matrix

| Functional Domain | System / Application | Owner Module / Service | Description & Responsibility |
| :--- | :--- | :--- | :--- |
| **Platform Provisioning & Tenants** | Curriculum Server | `TenantLifecycleManager`, `TenantSecurityContextManager` | Provisions isolated tenant Docker shards, PostgreSQL schemas, custom NIIRA domains, and crypto credentials. |
| **SaaS Billing & Invoicing** | Curriculum Server | `serverAuditLedger`, `PricingOffersManagementPortal` | Tracks MRR/ARR, subscription tiers, installment payment policies, and billing ledger audits. |
| **Infrastructure & Docker Orch** | Curriculum Server | `DockerOrchestrationConsole` | Manages Cloud Run container revisions, scaling policies, health checks, and resource allocations. |
| **IAM & Security Governance** | Curriculum Server | `IAMGovernanceTab`, `requireSuperAdmin` | Manages super-admin access, audit logs, tamper-evident ledgers, and tenant isolation tests. |
| **School Academic ERP** | Curriculum Flow | `serverAcademicEngine`, `AcademicRecordsTab` | Manages student enrollments, attendance, teacher allocation, timetables, and class groups. |
| **CBT & Examination Kiosk** | Curriculum Flow | `SecureExaminationTab`, `CBTExamKiosk` | Handles computer-based testing, question banking, secure exam delivery, and automated grading. |
| **Terminal Report Cards** | Curriculum Flow | `TerminalReportCardStudio` | Generates verified PDF/QR report cards, continuous assessment records, and transcript histories. |
| **NERDC Curriculum Core** | Shared Infrastructure | `nerdcDatabase`, `textbookGenerationEngine` | Authoritative NERDC curriculum dataset, syllabus themes, objectives, and AI textbook generation tools. |

---

## 3. Versioned API Contracts & Route Segmentation

### Curriculum Server API (`/api/v1/server/*`)
- `POST /api/v1/server/tenants/provision` — Provision new tenant organization and isolated schema.
- `GET /api/v1/server/tenants` — List all provisioned school tenants and status.
- `POST /api/v1/server/tenants/:id/toggle-status` — Suspend or activate tenant instance.
- `GET /api/v1/server/metrics` — SaaS financial and operational metrics (MRR, ARR, active utilization).
- `GET /api/v1/server/audit-logs` — Tamper-evident platform audit ledger.

### Curriculum Flow API (`/api/v1/flow/*`)
- `GET /api/v1/flow/school/profile` — Get active tenant school metadata, branding, and capacity.
- `GET /api/v1/flow/students` — Student directory and attendance registers.
- `POST /api/v1/flow/exams/generate` — AI-powered examination paper generation.
- `GET /api/v1/flow/grades` — Continuous assessment and terminal grade records.

### Shared Infrastructure API (`/api/curriculum/*`)
- `GET /api/curriculum/subjects` — NERDC curriculum subjects, themes, and learning objectives.
- `GET /api/curriculum/stats` — National curriculum statistics.
- `GET /api/health` — Platform health check endpoint.

---

## 4. Service-to-Service Security & Authentication

1. **Cryptographic Bearer Verification**: Control-plane endpoints (`/api/v1/server/*`) are guarded by `requireSuperAdmin`, requiring a valid signed cryptographic bearer token verified against `TenantSecurityContextManager`. Client-controlled role headers (`x-user-role`, `x-role`) are strictly ignored and logged as security violations.
2. **Service-to-Service Trust Tokens**: Internal microservice calls use short-lived HMAC-signed service tokens (`X-Service-Auth-Token`) to prevent spoofing between Curriculum Server and Curriculum Flow runtimes.
3. **Request Tracing & Audit Logging**: All mutations and access attempts are cryptographically recorded in `TamperEvidentAuditService` with IP, actor ID, action summary, and resulting verification status.

---

## 5. Database Access Boundaries

- **PostgreSQL Relational Core**: Authoritative datastore with strict schema separation (`schema_control_plane` for Curriculum Server and `schema_tenant_<id>` for Curriculum Flow school instances).
- **Tenant Isolation**: Direct cross-tenant queries are prohibited by query-level tenant context injection and parameterized isolation filters.
- **Backup & Recovery**: Daily automated encrypted backups verified via `serverBackupService` and disaster recovery test suites.
