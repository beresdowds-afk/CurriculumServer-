# CURRICULUM SERVER — PRODUCTION-ORIENTED MULTI-TENANT SAAS CONTROL PLANE SPECIFICATION

## System Overview & Architect Persona
You are a senior SaaS platform architect, DevOps engineer, security engineer, database architect, and full-stack engineer.

The platform has an EXISTING application called:
**CURRICULUM SERVER**

Do NOT rebuild the application from scratch. First inspect and understand the existing CURRICULUM SERVER codebase, architecture, database schema, authentication, existing tenant/provisioning logic, existing portal, existing optional-feature selection system, existing domain/registrar functionality, DNS management, billing/subscription functionality if present, and existing CURRICULUM FLOW provisioning mechanisms.

Your task is to **UPGRADE** the existing CURRICULUM SERVER into a production-oriented multi-tenant SaaS **CONTROL PLANE** for provisioning, selling, operating, upgrading, downgrading, monitoring and eventually decommissioning isolated **CURRICULUM FLOW** tenant applications.

---

## 1. PRODUCT ARCHITECTURE

The architecture must clearly separate:

### A. CURRICULUM SERVER
- SaaS control plane
- Platform administration
- Tenant management
- Subscription management
- Billing
- Provisioning
- Feature management
- Domain management
- DNS management
- Tenant lifecycle management
- Application version management
- Monitoring
- Audit logs
- Resource management

### B. CURRICULUM FLOW
- School-facing application
- One provisioned tenant application per client school
- School administration
- Students
- Teachers
- Classes
- Subjects
- Curriculum
- Lesson notes
- Teaching management
- Attendance
- Punctuality
- Academic records
- Question bank
- Assessments
- Examinations
- Marking schemes
- Academic analytics

**CURRICULUM SERVER is the CONTROL PLANE.**  
**CURRICULUM FLOW is the TENANT APPLICATION / WORKLOAD.**  
*Do not mix platform-management data with individual school operational data.*

---

## 2. FIRST PHASE — EXISTING SYSTEM AUDIT

Before making major changes:
1. Inspect the entire existing CURRICULUM SERVER codebase.
2. Identify:
   - frontend architecture
   - backend architecture
   - database
   - authentication
   - authorization
   - current tenant model
   - current provisioning logic
   - current CURRICULUM FLOW cloning/provisioning logic
   - current subscription system
   - current optional feature selection
   - current domain registrar integration
   - current DNS integration
   - current API architecture
   - existing environment variables
   - existing deployment architecture
3. Identify components that should be preserved.
4. Identify components that need refactoring.
5. Identify components that are unsafe for multi-tenancy.
6. Identify components that could create cross-tenant data leakage.
7. Identify components that could create noisy-neighbor/resource problems.
8. Do not destroy existing working functionality unnecessarily.

*Produce an implementation plan before performing destructive architectural changes.*

---

## 3. PHASED DOCKER-PER-TENANT ARCHITECTURE

Implement a phased Docker-per-tenant architecture.

**IMPORTANT:**  
"One Docker per tenant" means an isolated tenant application **STACK**, not necessarily one single Docker container.

A tenant may eventually consist of:
- CURRICULUM FLOW frontend container
- CURRICULUM FLOW API/backend container
- background worker container
- tenant-specific supporting services where required
- tenant-specific PostgreSQL database or equivalent isolated database

*Do not create a separate source-code fork for every school.*  
Use **ONE** version-controlled CURRICULUM FLOW codebase/image and provision isolated tenant environments from it.

### Conceptual Architecture Diagram:
```
CURRICULUM SERVER (Control Plane)
       │
       ├─── Tenant A (e.g. Atlantic Hall)
       │       ├── CurriculumFlow Frontend (Docker)
       │       ├── CurriculumFlow API (Docker)
       │       ├── Background Worker (Docker)
       │       ├── Tenant Database (Isolated Postgres)
       │       └── Tenant Storage (Isolated Namespace/Bucket)
       │
       ├─── Tenant B (e.g. Corona Schools)
       │       ├── CurriculumFlow Frontend (Docker)
       │       ├── CurriculumFlow API (Docker)
       │       ├── Background Worker (Docker)
       │       ├── Tenant Database (Isolated Postgres)
       │       └── Tenant Storage (Isolated Namespace/Bucket)
       │
       └─── Tenant C (e.g. King's College)
               ├── CurriculumFlow Frontend (Docker)
               ├── CurriculumFlow API (Docker)
               ├── Background Worker (Docker)
               ├── Tenant Database (Isolated Postgres)
               └── Tenant Storage (Isolated Namespace/Bucket)
```

**Failure Isolation:**  
CURRICULUM SERVER itself must remain independent of tenant application failures. If Tenant A's CURRICULUM FLOW application crashes, CURRICULUM SERVER and other tenants must continue operating seamlessly.

---

## 4. TENANT IDENTITY

Create or strengthen an immutable tenant identity model.

Every provisioned school must have:
- `tenant_id` (UUID / immutable identifier)
- `tenant_code` (e.g. `SCH-LAG-001`)
- `school_name`
- `legal_business_name` (where applicable)
- `subscription_plan`
- `subscription_status`
- `application_status`
- `application_version`
- `database_version`
- `configuration_version`
- `provisioning_status`
- `primary_domain`
- `custom_domains`
- `created_at`
- `updated_at`
- `suspended_at`
- `archived_at`

**`tenant_id` must be immutable.** Never use school name or domain name as the primary tenant identifier.

---

## 5. TENANT DATA ISOLATION

Strongly isolate tenant operational data.

The preferred architecture is:
```
Tenant A ──► Tenant A Database (tenant_001_db)
Tenant B ──► Tenant B Database (tenant_002_db)
Tenant C ──► Tenant C Database (tenant_003_db)
```

Do not put all school operational data into one shared database unless there is a compelling architectural reason.

CURRICULUM SERVER maintains centralized platform metadata such as:
- tenant registry
- subscriptions
- plans
- billing
- provisioning state
- feature entitlements
- domains
- DNS
- application versions
- infrastructure status

School-specific operational data belongs exclusively to the CURRICULUM FLOW tenant environment.

**Zero Data Leakage Boundary:**  
School A must **never** be able to access:
- School B students
- School B teachers
- School B attendance
- School B academic records
- School B examinations
- School B documents
- School B database
- School B storage
- School B secrets

---

## 6. TENANT STORAGE ISOLATION

Tenant files and documents must also be isolated using tenant-specific storage namespaces, buckets, or directories:
```
/storage/tenants/tenant-A/
/storage/tenants/tenant-B/
/storage/tenants/tenant-C/
```
The application must enforce strict tenant-level authorization. Never allow client-side manipulation of tenant IDs to access another school's files.

---

## 7. TENANT SECRETS

Tenant-specific secrets must be strictly isolated:
- database credentials
- storage credentials
- email credentials
- third-party integration credentials
- API credentials
- webhook secrets

Do not expose tenant secrets to other tenants. Never hard-code secrets in source code.

---

## 8. RESOURCE ISOLATION & NOISY NEIGHBOR PROTECTION

Tenant isolation must include operational stability. A tenant generating excessive:
- AI requests
- examination generation jobs
- report generation
- API requests
- file processing
- background jobs

must **not** bring down other tenants.

Implement configurable per-tenant resource policies:
- API rate limits
- concurrent job limits
- AI generation limits
- background worker limits
- storage quotas
- CPU limits
- memory limits
- request quotas
- monthly usage limits

The limits must be determined by subscription plan and/or tenant-specific overrides.

---

## 9. ASYNCHRONOUS JOB ARCHITECTURE

Do not perform expensive AI operations synchronously inside normal HTTP requests.

Use background jobs/queues for:
- lesson generation
- question generation
- examination generation
- marking scheme generation
- large reports
- document generation
- bulk imports
- analytics
- other expensive operations

Each job must contain tenant context:
```json
{
  "job_id": "job_998124_exam",
  "tenant_id": "tenant_grace_college",
  "job_type": "EXAM_PAPER_GENERATION",
  "priority": "HIGH",
  "status": "PROCESSING",
  "created_at": "2026-08-17T05:00:00Z",
  "started_at": "2026-08-17T05:00:01Z",
  "completed_at": null,
  "error": null,
  "retry_count": 0
}
```
A tenant's jobs must be isolated/throttled so that one tenant cannot exhaust all worker capacity.

---

## 10. TENANT PROVISIONING ENGINE

CURRICULUM SERVER must have a proper automated tenant provisioning engine.

When a school purchases a CURRICULUM FLOW subscription:
1. Confirm successful payment.
2. Create tenant record.
3. Generate immutable `tenant_id`.
4. Create tenant configuration.
5. Create tenant database.
6. Run database migrations.
7. Provision tenant storage.
8. Provision tenant secrets.
9. Provision CURRICULUM FLOW containers.
10. Configure environment variables.
11. Apply selected feature entitlements.
12. Configure domain/subdomain.
13. Configure DNS.
14. Configure SSL/HTTPS.
15. Create school administrator account or onboarding invitation.
16. Run health checks.
17. Verify database connectivity.
18. Verify application connectivity.
19. Verify domain routing.
20. Verify enabled features.
21. Mark tenant as **ACTIVE**.
22. Send onboarding notification.

**Idempotency Requirement:**  
Provisioning must be idempotent. If provisioning fails halfway through, CURRICULUM SERVER must know exactly which stage failed and must support retry/recovery without corrupting the tenant.

---

## 11. PROVISIONING STATE MACHINE

Implement explicit provisioning states:
- `PENDING`
- `PAYMENT_CONFIRMED`
- `TENANT_CREATED`
- `DATABASE_PROVISIONING`
- `DATABASE_READY`
- `STORAGE_PROVISIONING`
- `APP_PROVISIONING`
- `CONFIGURING`
- `DOMAIN_CONFIGURING`
- `SSL_CONFIGURING`
- `HEALTH_CHECK`
- `READY`
- `ACTIVE`
- `FAILED`
- `SUSPENDED`
- `ARCHIVED`
- `DECOMMISSIONING`

*Do not rely on a single boolean such as `provisioned = true`.*

---

## 12. CUSTOMER-FACING HERO PAGE

Create or upgrade the public CURRICULUM SERVER hero/marketing page.

The hero page must clearly communicate that schools can:
1. Select a CURRICULUM FLOW subscription.
2. Select optional features.
3. Create an account.
4. Enter school information.
5. Select a domain/subdomain option.
6. Pay online.
7. Automatically have their CURRICULUM FLOW environment provisioned.
8. Receive access credentials/onboarding instructions.
9. Start configuring their school.

### Core Workflow:
```
SELECT PLAN ──► SELECT FEATURES ──► REGISTER SCHOOL ──► CHOOSE DOMAIN ──► PAY ──► AUTOMATIC PROVISIONING ──► CURRICULUM FLOW READY
```
**Clear Value Proposition:** *"Subscribe. Pay. Get Your School's CURRICULUM FLOW."*  
*Do not require manual platform administrator intervention for normal customer provisioning.*

---

## 13. SUBSCRIPTION MANAGEMENT

Create a comprehensive subscription system supporting:
- Free / Trial Plan
- Basic
- Professional
- Enterprise
- Custom Plans

Plans define:
- price
- billing interval (monthly, termly, annually)
- maximum users
- maximum students
- maximum teachers
- storage quota
- AI usage
- examination generation limits
- API limits
- enabled features
- support level
- resource allocation
- tenant infrastructure tier

*Do not hard-code plan behavior throughout the application; use a centralized entitlement/configuration system.*

---

## 14. OPTIONAL FEATURES

There is an EXISTING portal in CURRICULUM SERVER that allows administrators to select optional features for a provisioned CURRICULUM FLOW.

**PRESERVE THIS FUNCTIONALITY.** Refactor it into a proper entitlement system.

Each feature must have:
- `feature_id`
- `name`
- `description`
- `category`
- `status`
- `base_availability`
- `plan_availability`
- `price`
- `billing_model`
- `dependencies`
- `version`
- `tenant_entitlement`

Example optional features:
- Attendance & Punctuality
- Parent Portal & Student Portal
- Teacher Portal
- Advanced Academic Analytics
- Examination Generator
- AI Lesson Notes & AI Question Bank
- AI Marking Scheme
- CBT Module
- SMS, Email & WhatsApp Gateways
- Custom Domain & Anycast DNS
- Advanced Reporting & Transcripts
- API Access & Embed Widgets
- Custom School Branding & Theme

---

## 15. FUTURE FEATURE UPGRADE / DOWNGRADE

A tenant must be able to upgrade or downgrade optional features after initial provisioning without destroying the tenant application.

### Feature Lifecycle States:
- `ACTIVE`
- `PENDING_UPGRADE`
- `PENDING_DOWNGRADE`
- `SCHEDULED_FOR_REMOVAL`
- `SUSPENDED`
- `CANCELLED`

Feature changes are reflected in CURRICULUM FLOW through centralized entitlement/configuration synchronization.

---

## 16. FEATURE ENTITLEMENT ARCHITECTURE

```
TENANT
   │
   ├── SUBSCRIPTION
   ├── PLAN
   └── FEATURE ENTITLEMENTS
           ├── FEATURE A = ENABLED
           ├── FEATURE B = ENABLED
           ├── FEATURE C = DISABLED
           └── FEATURE D = TRIAL
```
CURRICULUM SERVER is the authoritative source of tenant feature entitlements. CURRICULUM FLOW receives configuration securely. Every protected feature must be enforced server-side.

---

## 17. DOMAIN REGISTRAR AND DNS

Preserve and strengthen the existing domain registrar and DNS management functionality:
- platform subdomains (`*.curriculumflow.com`, `*.curriculumserver.ng`)
- official NiRA educational domain registration (`.sch.ng`, `.edu.ng`, `.ng`)
- connect existing custom domains
- configure DNS records (A, CNAME, TXT, MX, NS)
- verify domain ownership
- provision automated SSL/TLS (Let's Encrypt / Cloudflare Edge)
- live multi-node DNS propagation checking

All domain resources are associated with an immutable `tenant_id`.

---

## 18. TENANT APPLICATION HEALTH & MONITORING

Continuously monitor tenant application health:
- frontend availability
- API availability
- database availability
- worker availability
- CPU & Memory usage
- storage consumption
- queue depth
- error rates & latency
- container status
- application & database versions
- last backup status
- SSL status
- domain propagation status

---

## 19. SELF-HEALING & AUTOMATED RECOVERY

- Container crashes ──► Auto-restart container ──► Health check ──► Mark healthy
- Repeated crashes ──► Escalate ──► Alert platform administrator
- Failed deployment ──► Stop rollout ──► Preserve previous stable version ──► Rollback safely

---

## 20. VERSION MANAGEMENT

CURRICULUM SERVER tracks:
- `tenant_id`
- `application_version`
- `database_version`
- `configuration_version`

Supports staged deployments, canary rollouts, tenant-specific upgrades, and scheduled maintenance windows.

---

## 21. PHASED DEPLOYMENT STRATEGY

- **PHASE 1:** Development / local Docker environment
- **PHASE 2:** Single-server multi-tenant Docker deployment
- **PHASE 3:** Automated tenant provisioning
- **PHASE 4:** Resource quotas and tenant isolation
- **PHASE 5:** Central monitoring and health checks
- **PHASE 6:** Automated application updates
- **PHASE 7:** Automated backups and tenant restoration
- **PHASE 8:** Scalable container orchestration (Kubernetes-ready Docker abstractions)

---

## 22. DATABASE ARCHITECTURE

Dedicated PostgreSQL database per tenant:
- `tenant_001_db`
- `tenant_002_db`
- `tenant_003_db`

Automated migrations, version tracking, and zero browser exposure of connection strings.

---

## 23. BACKUPS AND RESTORATION

- Last successful backup timestamp & status
- Backup retention policies & storage location
- Independent tenant-specific restoration workflow (BACKUP ──► RESTORE ──► VERIFY ──► ACTIVATE)

---

## 24. SECURITY BOUNDARIES

- Tenant isolation & RBAC
- Least privilege & secure secrets management
- HTTPS / TLS v1.3
- Secure cookies/tokens & CSRF protection
- Input validation & rate limiting
- Tamper-proof audit logs
- Signed webhooks & inter-service authentication
- Strict server-side validation (never trust client-supplied tenant IDs)

---

## 25. AUDIT LOGGING

CURRICULUM SERVER records all critical platform actions:
- `tenant_created`
- `tenant_provisioning_started`
- `tenant_provisioning_completed`
- `tenant_provisioning_failed`
- `subscription_created`
- `subscription_upgraded`
- `subscription_downgraded`
- `feature_enabled`
- `feature_disabled`
- `domain_added`
- `dns_record_changed`
- `app_deployed`
- `app_upgraded`
- `app_rolled_back`
- `tenant_suspended`
- `tenant_reactivated`
- `tenant_archived`
- `admin_login`
- `admin_action`

Each audit record includes:
- timestamp (ISO UTC)
- actor (User ID / API Key / System Worker)
- `tenant_id` where applicable
- action name
- target resource
- result status (`SUCCESS`, `FAILED`, `PENDING`)
- IP address, user-agent, and device metadata

---

## 26. API-FIRST DESIGN & INTEGRATION SUITE

CURRICULUM SERVER and CURRICULUM FLOW are designed as API-capable platforms with versioned endpoints (`/api/v1/...`):
- School Management Systems (SMS) & LMS
- CBT Platforms & Online Exam Portals
- Educational Publishers
- Teacher & Student Applications
- Government Education Quality Assurance Systems

Supported endpoints:
- `/api/v1/curriculum`
- `/api/v1/lesson-notes`
- `/api/v1/questions`
- `/api/v1/assessments`
- `/api/v1/examinations`
- `/api/v1/marking-schemes`
- `/api/v1/students`
- `/api/v1/teachers`
- `/api/v1/attendance`
- `/api/v1/results`
- `/api/v1/analytics`
- `/api/v1/tenants` (Authorized Control-Plane only)
- `/api/v1/embed/...` (Embeddable Widgets for school websites)

*Control plane operations remain strictly protected and isolated from public client routes.*

---

## 27. WEBHOOK ARCHITECTURE

Real-time, signed, and retryable webhook event dispatching:
- `tenant.created`
- `tenant.provisioning.completed`
- `tenant.provisioning.failed`
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `feature.enabled`
- `feature.disabled`
- `domain.verified`
- `domain.updated`
- `application.deployed`
- `application.updated`
- `application.failed`
- `exam.generated`
- `exam.released`

Webhooks include HMAC-SHA256 signatures, exponential backoff retries, and delivery audit trails.

---

## 28. CUSTOMER SELF-SERVICE PORTAL

School proprietors and ICT directors can:
- View current subscription plan & renewal dates
- Upgrade / downgrade plans on-demand
- Add or remove optional modular features
- View itemized invoices & billing receipts
- Update payment methods (Paystack, Flutterwave, Direct Debit)
- View domain status & manage DNS records
- Monitor application uptime, version, and performance health
- Manage school administrator & ICT personnel accounts
- Access developer API keys, embed codes, and webhook settings
- Submit priority technical support tickets

*All high-risk infrastructure actions remain strictly guarded by the CURRICULUM SERVER control plane.*

---

## 29. ADMIN CONTROL PLANE DASHBOARD

The Master Platform Console features real-time telemetry:
- **Total Tenants & Active Tenants**
- **Provisioning Pipeline & Failed Provisioning alerts**
- **Suspended & Archived Tenants**
- **Active Subscriptions & MRR / Annual Revenue Analytics**
- **Platform AI Token Usage & Quota Consumption**
- **Global Storage Quota Allocation**
- **Total Registered & Managed Domain Count**
- **Global Application & Container Health Status**
- **Failed Background Jobs & Error Rates**
- **System Security & Audit Alerts**
- **Full Tenant Search & Interactive Filtering**

---

## 30. TENANT CONTROL PAGE (DRILLDOWN INSPECTOR)

Clicking any tenant displays its comprehensive command cockpit:
- **IDENTITY:** `tenant_id`, school code, legal name, primary domain, status badge
- **SUBSCRIPTION:** Plan tier, billing interval, cycle start/end, auto-renew status
- **FEATURES:** Enabled features, disabled features, pending upgrade/downgrade queues
- **APPLICATION:** Running version, Docker image tag, deployment state, container health
- **INFRASTRUCTURE:** Dedicated database name, storage bucket usage, CPU/RAM telemetry, worker queue depth
- **DOMAIN & DNS:** Primary subdomain, registered custom domain, SSL handshake status, DNS zone records
- **SECURITY & AUDIT:** School admin users, active sessions, security event trail
- **BACKUP & DISASTER RECOVERY:** Last snapshot timestamp, backup health, one-click restore & verification

---

## 31. PROVISIONING LOG & REAL-TIME RUNTIME TERMINAL

Every provisioning operation produces a step-by-step observable pipeline log:
```
[✓] Payment confirmed (Paystack Ref: PSTK_889210)
[✓] Tenant record created (ID: ten_atlantic_0912)
[✓] Dedicated PostgreSQL database provisioned (db_tenant_atlantic_0912)
[✓] Schema migrations applied (v1.4.2 -> 48 tables)
[✓] Isolated storage namespace allocated (/storage/tenants/ten_atlantic_0912)
[✓] CURRICULUM FLOW Docker container stack initialized
[✓] Environment configuration & secrets injected
[✓] Selected feature entitlements synchronized
[✓] Domain & DNS routing configured (atlantic-hall.sch.ng)
[✓] SSL/TLS certificate issued (Let's Encrypt Wildcard)
[✓] Health check verified (HTTP 200 OK / 18ms latency)
[✓] Primary school administrator account invited
[✓] Tenant marked as ACTIVE
```
If a step fails (e.g. `[✗] DNS verification timeout`), the interface displays the exact error code, affected tenant context, root cause diagnostics, and an idempotent **Retry Step** action.

---

## 32. UI/UX DESIGN STANDARDS

- **Public SaaS Experience:** Crisp, modern, trustworthy aesthetic tailored for school proprietors, government education boards, and institutional buyers.
- **Admin Control Plane:** Dense, high-contrast, data-rich operational cockpit with real-time health visualizers and quick actions.
- **School-Facing CURRICULUM FLOW:** Cohesive, academic-first interface designed for school leadership, teachers, and students.

---

## 33. CORE ARCHITECTURAL & IMPLEMENTATION RULES

1. **DO NOT delete working existing functionality without justification.**
2. **DO NOT rebuild the application from scratch.**
3. **Inspect first.**
4. **Reuse existing components where appropriate.**
5. **Preserve the existing optional-feature portal.**
6. **Convert existing feature selection into a robust entitlement architecture.**
7. **Preserve existing domain registrar / DNS functionality.**
8. **Make tenant provisioning automated and idempotent.**
9. **Make tenant failures strictly isolated.**
10. **Make heavy AI / exam generation jobs asynchronous.**
11. **Never trust client-supplied `tenant_id` values.**
12. **Never expose secrets to clients.**
13. **Do not hard-code tenant-specific configuration into the codebase.**
14. **Do not create permanent source-code forks for individual schools.**
15. **Use versioned Docker images.**
16. **Design for future Kubernetes migration.**
17. **Maintain backward compatibility where practical.**
18. **Create migrations rather than destructive database changes.**
19. **Add automated tests for tenant data isolation.**

---

## 34. REQUIRED TENANT ISOLATION TESTS

Automated validation suite verifying:
- Tenant A cannot access Tenant B API resources.
- Tenant A cannot access Tenant B database.
- Tenant A cannot access Tenant B storage.
- Tenant A cannot manipulate Tenant B feature entitlements.
- Tenant A cannot modify Tenant B DNS records.
- Tenant A cannot access Tenant B examination papers or marking schemes.
- Tenant A cannot access Tenant B student, teacher, or attendance records.
- **Noisy Neighbor Protection:** Tenant A executing bulk AI exam generation does not degrade Tenant B's response latency or service limits.

---

## 35. REQUIRED DELIVERABLES

1. Updated Architecture & System Blueprint
2. Tenant Data Model (`tenant_id`, metadata, lifecycle states)
3. Subscription & Pricing Plan Model
4. Feature Entitlement Engine with Dynamic Upgrades / Downgrades
5. Automated Provisioning State Machine & Runtime Execution Service
6. Docker Multi-Tenant Architecture & Dockerfile/Compose specs
7. Tenant Health & Infrastructure Telemetry Dashboard
8. Resource Quota & Noisy-Neighbor Throttling Engine
9. Asynchronous Background Job Queue Architecture
10. Customer-Facing Hero & Self-Service Subscription Page
11. Customer Self-Service Account & Subscription Portal
12. Upgraded Optional-Feature Governance Portal
13. Domain & DNS Tenant Isolation Engine (NiRA + Anycast DNS)
14. Tenant Database & Storage Namespace Provisioner
15. Backup, Snapshot & Restore Architecture
16. Application Version Management & Staged Rollout Manager
17. Immutable Platform Audit Logging System
18. Tenant Isolation & Security Test Suite
19. API v1 Integration Suite & Embeddable Website Widgets
20. Webhook Dispatcher & Event Signing Foundation
21. Comprehensive Developer & Administrator Documentation

---

## 36. DEVELOPMENT & MIGRATION PHASES

- **PHASE 1:** Tenant Data Model & Control Plane Foundation
- **PHASE 2:** Dockerized CURRICULUM FLOW Stack & Image Abstraction
- **PHASE 3:** Automated Provisioning Engine & State Machine
- **PHASE 4:** Public Hero Page & Purchase-to-Provisioning Journey
- **PHASE 5:** Feature Entitlement Engine & Dynamic Upgrade/Downgrade
- **PHASE 6:** Domain & DNS Isolation (NiRA Registry & Anycast Edge)
- **PHASE 7:** Infrastructure Telemetry, Health Monitoring & Resource Quotas
- **PHASE 8:** Async Job Queue, Backup/Restore & Version Management
- **PHASE 9:** API v1 Developer Suite, Embed Widgets & Webhook Architecture
- **PHASE 10:** Production Hardening, Audit Logging & Security Isolation Tests

---

## 37. FINAL BUSINESS WORKFLOW (END-TO-END)

```
VISITOR
   ↓
CURRICULUM SERVER HERO PAGE
   ↓
VIEW CURRICULUM FLOW CAPABILITIES
   ↓
SELECT SUBSCRIPTION PLAN (Basic, Pro, Enterprise)
   ↓
SELECT OPTIONAL FEATURES (AI Lesson Notes, CBT, Question Bank, Attendance)
   ↓
REGISTER SCHOOL (Name, State, CAC/Reg No, Admin Contact)
   ↓
CHOOSE DOMAIN (Platform Subdomain or NiRA .sch.ng / Custom Domain)
   ↓
REVIEW ORDER & PAY (Paystack / Flutterwave / Bank Transfer)
   ↓
PAYMENT CONFIRMED
   ↓
AUTOMATIC TENANT PROVISIONING (Idempotent 12-Step Engine)
   ↓
DATABASE & STORAGE NAMESPACE CREATED
   ↓
CURRICULUM FLOW DOCKER INSTANCE INITIALIZED
   ↓
FEATURE ENTITLEMENTS APPLIED
   ↓
DOMAIN / DNS / SSL ROUTED
   ↓
HEALTH CHECK PASSED
   ↓
SCHOOL ADMINISTRATOR CREDENTIALS DISPATCHED
   ↓
CURRICULUM FLOW LIVE & OPERATIONAL
```

---

## 38. SUCCESS CRITERIA

1. CURRICULUM SERVER operates as the central SaaS control plane.
2. CURRICULUM FLOW functions as the isolated tenant workload application.
3. New schools can purchase and automatically receive their own provisioned instance in seconds.
4. Total data isolation is enforced across database, storage, secrets, and cache layers.
5. Optional features can be upgraded or downgraded dynamically without tenant downtime.
6. Domain registration, DNS management, and SSL provisioning are tenant-isolated.
7. Background worker queues isolate heavy AI generation workloads per tenant.
8. Comprehensive test suites verify zero cross-tenant data leakage.
