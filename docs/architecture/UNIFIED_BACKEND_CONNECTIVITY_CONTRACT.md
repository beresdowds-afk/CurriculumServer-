# CRITICAL ARCHITECTURAL REMEDIATION: UNIFIED BACKEND CONNECTIVITY AND INTEGRATION CONTRACT (UBCIC)

**Repository:** `beresdowds-afk/CurriculumServer-`  
**Target:** Existing implementation following Phases 1–7 of the Curriculum Server transformation.  
**Priority:** **CRITICAL — MUST BE COMPLETED & SATISFIED BEFORE PHASE 8.**  
**Document Status:** Permanent Architectural Authority & Phase 8+ Governance Reference  
**Effective Date:** November 2026

---

## 1. Background and Architectural Requirement

The repository has undergone substantial architectural transformation. The platform is structured into two independently deployable frontend applications operating against a single unified backend with PostgreSQL as its authoritative relational datastore:

1. **CURRICULUM SERVER**: Multi-tenant Control Plane, Fleet Management, SaaS Business Cockpit, IIAPE Architecture Evaluator, GCP Provisioning Orchestrator, and Application/Feature Registry.
2. **CURRICULUM FLOW**: School Operational Management System (SMS/ERP), Academic Registry, Timetable, Teaching Delivery, Lesson Plans, Scheme of Work, Question Banks, Examination Builder, Attendance, and Bursary.

The separation of the two frontends must never create independent, disconnected application ecosystems.

### Target Architectural Topology

```text
CURRICULUM SERVER FRONTEND (apps/curriculum-server)
          │
          ▼
CURRICULUM SERVER APPLICATION SERVICES (src/services/*)
          │
          ▼
   UNIFIED BACKEND (server.ts :3000 /api/v1/*)
   ├── CURRICULUM SERVER SERVICES (Control Plane & Fleet)
   ├── CURRICULUM FLOW SERVICES (School Instance Operations)
   ├── SHARED PLATFORM SERVICES (Audit, Health, Versioning)
   ├── INSTANCE AND TENANT SERVICES (Multi-Tenant Persistence)
   ├── AUTHENTICATION AND AUTHORISATION (HMAC-SHA256 Token Vault)
   ├── APPLICATION AND FEATURE REGISTRIES (Modular Catalog)
   └── DATABASE AND STORAGE SERVICES (PostgreSQL & Storage Adapters)
          │
          ▼
      POSTGRESQL (Authoritative Relational Datastore)
          ▲
          │
   UNIFIED BACKEND (server.ts :3000 /api/v1/*)
          ▲
          │
CURRICULUM FLOW APPLICATION SERVICES (src/services/*)
          ▲
          │
CURRICULUM FLOW FRONTEND (apps/curriculum-flow)
```

Both frontends communicate with the appropriate backend services through authenticated, versioned APIs (`/api/v1/*`). They must not become independent applications with unrelated databases, authentication systems, user identities, or disconnected business records.

---

## 2. Non-Negotiable Architectural Principles

These requirements govern all existing implementations and every future phase (Phase 8 and beyond):

### A. Independent Frontends
- **Separate Entry Points**: `apps/curriculum-server/src/App.tsx` and `apps/curriculum-flow/src/App.tsx` remain distinct applications with isolated React component trees.
- **Separate Route Trees & Navigation**: Control plane cockpit routing and school operational routing do not cross-pollute.
- **Independent Build Outputs**: Dedicated build pipelines (`vite.server.config.ts`, `vite.flow.config.ts`, and root `vite.config.ts`) produce distinct deployable artifacts.
- **Independent Deployability**: Each frontend can be re-bundled and redeployed without forcing code modifications on the other.

### B. Unified Authoritative Backend
- **Single Backend Ecosystem**: All client applications communicate with `server.ts` running Express on port 3000.
- **Service Governance**: One authoritative backend architecture; shared services have explicit ownership and typed contract boundaries.
- **No Competing Backends**: No parallel mock servers or competing runtime engines are permitted.
- **Zero Duplicated Business Logic**: Business rules (licensing, status transitions, amortization calculations) reside on the backend.
- **No Disconnected Mock APIs**: Frontends do not fall back to volatile fabricated state when durable backend operations are expected.

### C. Unified Data Governance & PostgreSQL Authority
- **PostgreSQL Relational Authority**: PostgreSQL 16 LTS is the sole, authoritative system of record.
- **Zero Firebase Footprint**: Neither Firestore, Firebase Authentication, nor Firebase Cloud Storage may be introduced into the project.
- **Preserved Phase 1–7 Records**: Customer organizations, school instances, student profiles, attendance ledgers, IIAPE profiles, registry catalogs, and audit chains remain intact.
- **Sharded Architecture**: Schema namespace isolation, dedicated customer databases, and customer-project hardware isolation remain strictly respected.

### D. Unified Identity and Security
- **Authoritative Identity Provider**: Both applications use the cryptographic token context manager (`TenantSecurityContextManager`) with HMAC-SHA256 signatures.
- **Separation of Privileges**: Platform Super Admin privileges (`role: super_admin`) and School Principal/Staff privileges (`role: principal`, `role: teacher`) remain mutually exclusive and rigorously checked on the server.
- **Server-Side Authorisation**: A user cannot gain access to a school instance simply because a browser client presents a tenant identifier header.
- **Cross-Tenant Rejection**: Any attempt by Tenant A to access Tenant B's data is rejected at the middleware level, logged to the immutable audit ledger, and flagged.

### E. Application Independence
- **Curriculum Server**: Controls platform operations, SaaS billing, provisioning gates, and feature entitlements.
- **Curriculum Flow**: Controls school-level academic and operational execution.
- **No Cross-Root UI Imports**: Neither frontend may import the root component or private UI views of the other.

---

## 3. Integration Inventory & Directory Structure

```text
/
├── apps/
│   ├── curriculum-server/              # Control Plane Frontend SPA
│   │   ├── src/App.tsx                 # Super Admin Cockpit & Fleet Engine
│   │   ├── server.ts                   # Standalone Server Entry
│   │   └── Dockerfile                  # Container Deployment Spec
│   └── curriculum-flow/                # School Flow SMS Frontend SPA
│       ├── src/App.tsx                 # School Principal & Staff Operations
│       ├── server.ts                   # Standalone Flow Server Entry
│       └── Dockerfile                  # Container Deployment Spec
├── server/
│   ├── serverSchoolManager.ts          # Authoritative Multi-Tenant Persistence Store
│   ├── storageAndDatabaseManager.ts    # PostgreSQL Shard & Storage Provider Manager
│   ├── gcpProvisioningEngine.ts        # GCP Infrastructure Orchestration Engine
│   ├── serverAuditLedger.ts            # Tamper-Evident SHA-256 Hash Chained Audit Store
│   └── unifiedConnectivityTests.ts     # 12-Test UBCIC Automated Integration Suite
├── packages/
│   └── shared-types/
│       └── src/
│           ├── apiContracts.ts         # Unified UBCIC Request/Response Models
│           └── index.ts                # Shared Type Exports
├── src/
│   ├── components/                     # Modular Reusable Domain Components
│   │   ├── CurriculumServerDashboard.tsx
│   │   ├── GCPProvisioningOrchestrationConsole.tsx
│   │   ├── StorageAndDatabasePortal.tsx
│   │   └── ...
│   ├── services/
│   │   ├── unifiedApiClient.ts         # Singleton Client with Distributed Tracing
│   │   ├── tenantSecurityContext.ts    # Cryptographic HMAC-SHA256 Token Context
│   │   ├── storageAndDatabaseClient.ts # Browser-Safe Storage/DB Service Client
│   │   └── gcpProvisioningClient.ts    # Browser-Safe GCP Provisioning Service Client
│   ├── types/                          # Domain Type Definitions
│   └── data/                           # Master Gazette & Registry Seed Catalogs
├── server.ts                           # Unified Monolithic & API Backend Gateway
└── vite.config.ts                      # Client Bundling & Server Middleware Proxy
```

---

## 4. Identified Communication Failures & Permanent Root Cause Remediations

Prior to this remediation, five critical systemic communication failures were identified and permanently resolved:

1. **CORS & Preflight Blockages**:
   - *Failure*: `server.ts` lacked CORS headers and preflight `OPTIONS` handlers, rejecting cross-origin requests.
   - *Remediation*: CORS middleware installed in `server.ts` with explicit allowed origins, headers (`Authorization`, `Content-Type`, `X-Correlation-ID`, `X-Tenant-ID`), and credentials support.

2. **Detached Client React State**:
   - *Failure*: Frontends mounted strictly with static mock snapshots, never fetching live tenant or instance state.
   - *Remediation*: Hooked `unifiedApiClient` inside `useEffect` on frontend mount to fetch authoritative PostgreSQL records.

3. **Node Built-in Leakage into Browser Bundles**:
   - *Failure*: React components imported server engines containing Node built-ins (`crypto`, `fs`), causing Vite to externalize `crypto` as an error-throwing Proxy.
   - *Remediation*: Created browser-safe service clients (`storageAndDatabaseClient`, `gcpProvisioningClient`) and lazy getters in server modules, ensuring zero Node built-in execution in the browser.

4. **Symmetric Tenant Authorization Guard Absence**:
   - *Failure*: Backend guarded Control Plane routes with `requireSuperAdmin`, but School Flow ERP routes lacked server-side cross-tenant boundary validation.
   - *Remediation*: Added `requireSchoolAuth` middleware in `server.ts` enforcing cryptographic signature validity and asserting `req.params.tenantId === token.tenantId`.

5. **Entity Key & Metrics Misalignment**:
   - *Failure*: Backend metrics returned `totalProvisionedTenants` and `activeStudentsAcrossFleet`, whereas UI expected `totalTenants` and `totalManagedStudents`, causing runtime `TypeError: undefined (reading 'toLocaleString')`.
   - *Remediation*: Consolidated schemas in `apiContracts.ts` and `serverSchoolManager.ts`, providing both canonical keys and defensive nullish coalescing in UI components.

---

## 5. Unified API Contract Specifications (`/api/v1/*`)

All communication between frontends and backend MUST follow the contracts in `packages/shared-types/src/apiContracts.ts`:

### Standard API Envelope

```json
{
  "success": true,
  "data": { ... },
  "correlationId": "corr_1730598000_a1b2c3",
  "timestamp": "2026-11-03T03:00:00.000Z"
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": "Human readable error description",
  "code": "ERROR_CODE_ENUM",
  "correlationId": "corr_1730598000_a1b2c3",
  "timestamp": "2026-11-03T03:00:00.000Z"
}
```

### Registered Endpoints

| Method | Endpoint | Auth Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | System status, PostgreSQL, and storage health |
| `POST` | `/api/v1/server/auth/login` | Public | Super admin control plane login |
| `GET` | `/api/v1/server/metrics` | `requireSuperAdmin` | SaaS metrics (MRR, ARR, fleet counts, capacity) |
| `GET` | `/api/v1/server/tenants` | `requireSuperAdmin` | Retrieve authoritative provisioned school instances |
| `POST` | `/api/v1/server/tenants/provision` | `requireSuperAdmin` | Provision new school instance into PostgreSQL |
| `POST` | `/api/v1/server/tenants/:id/toggle-status` | `requireSuperAdmin` | Activate or suspend school instance |
| `GET` | `/api/v1/server/applications` | `requireSuperAdmin` | List registered applications catalog |
| `GET` | `/api/v1/server/features` | `requireSuperAdmin` | List modular feature definitions |
| `GET` | `/api/v1/server/architecture/profiles` | `requireSuperAdmin` | Retrieve IIAPE architecture profiles |
| `POST` | `/api/v1/server/architecture/evaluate` | `requireSuperAdmin` | Run IIAPE recommendation engine |
| `GET` | `/api/v1/server/infrastructure/jobs` | `requireSuperAdmin` | GCP Provisioning job status & history |
| `GET` | `/api/v1/server/databases` | `requireSuperAdmin` | PostgreSQL shard inventory & health |
| `POST` | `/api/v1/server/databases/configure` | `requireSuperAdmin` | Configure database isolation strategy |
| `GET` | `/api/v1/server/storage` | `requireSuperAdmin` | Customer storage configurations & migrations |
| `POST` | `/api/v1/server/storage/configure` | `requireSuperAdmin` | Configure customer-selectable storage rules |
| `POST` | `/api/v1/server/storage/migrate` | `requireSuperAdmin` | Trigger background storage migration job |
| `GET` | `/api/v1/server/audit-logs` | `requireSuperAdmin` | Query tamper-evident audit ledger |
| `POST` | `/api/v1/flow/auth/login` | Public | School user authentication (Principal/Staff) |
| `GET` | `/api/v1/flow/school/:tenantId/profile` | `requireSchoolAuth` | Retrieve school profile & entitlements |
| `GET` | `/api/v1/flow/school/:tenantId/students` | `requireSchoolAuth` | Retrieve tenant-isolated student roster |
| `POST` | `/api/v1/flow/school/:tenantId/students` | `requireSchoolAuth` | Enroll student into school instance |
| `GET` | `/api/v1/flow/school/:tenantId/attendance` | `requireSchoolAuth` | Retrieve daily attendance register |
| `POST` | `/api/v1/flow/school/:tenantId/attendance` | `requireSchoolAuth` | Submit biometric/manual attendance record |
| `GET` | `/api/v1/integration/test` | Public | Automated UBCIC 12-test suite execution |

---

## 6. Authentication, Session & Cryptographic Tenant Isolation

### Cryptographic Token Structure

All tokens issued by `TenantSecurityContextManager` are signed using HMAC-SHA256 with a sovereign platform secret:

```text
token = base64Url(payload) + "." + hmacSha256(base64Url(payload), secret)
```

The payload contains:
- `tenantId`: Active tenant or `'control_plane'`
- `role`: Role identifier (`'super_admin'`, `'principal'`, `'academic_coordinator'`, `'teacher'`)
- `userEmail`: Authenticated user email address
- `permissions`: Scoped permission array
- `issuedAt`: Issuance timestamp (Unix ms)
- `expiresAt`: Expiration timestamp (Unix ms)

### Enforcement Rules
1. **Never Trust Client Routing Headers**: `X-Tenant-ID` is treated exclusively as a routing hint. The backend extracts `tenantId` from the cryptographically verified token.
2. **Path Parameter Assertion**: If an endpoint contains `:tenantId` (e.g., `/api/v1/flow/school/:tenantId/students`), middleware strictly verifies:
   $$\text{token.role} === \text{'super\_admin'} \quad \lor \quad \text{token.tenantId} === \text{req.params.tenantId}$$
3. **Audit Logging on Violation**: Any mismatch immediately yields HTTP 403 `CROSS_TENANT_ACCESS_DENIED`, logs a security violation to `serverAuditLedger`, and terminates the request.

---

## 7. Storage & Database Architecture Compliance (Phase 7)

1. **Database Sharding Strategies**:
   - `shared_schema_isolated`: Shared PostgreSQL cluster with tenant schemas and Row-Level Security (RLS).
   - `dedicated_database`: Dedicated PostgreSQL database instance on private VPC (`10.82.0.x`).
   - `dedicated_customer_gcp_project`: Customer-owned GCP Project with CMEK encryption and hardware project isolation.
2. **Customer-Selectable Storage**:
   - `private_drive`: School-controlled Google Drive or OneDrive using OAuth tokens stored in encrypted vaults (`ServerSecretVault`).
   - `platform_storage`: Managed Google Cloud Storage buckets in `europe-west2`.
   - `hybrid`: Content-routed placement rules (sensitive transcripts to Private Drive; CBT anti-malpractice video to GCS).

---

## 8. Automated UBCIC Integration Test Suite

The test suite in `server/unifiedConnectivityTests.ts` must execute cleanly before any release or subsequent architectural phase.

| Test ID | Category | Name | Success Criterion |
| :--- | :--- | :--- | :--- |
| **CS-01** | Curriculum Server | Super Admin Token Verification | HMAC-SHA256 signature verified; role = `super_admin` |
| **CS-02** | Curriculum Server | Authoritative Instance Registry | Retrieved provisioned schools from PostgreSQL store |
| **CS-03** | Curriculum Server | App & Feature Registry | Verified application and modular feature catalog |
| **CS-04** | Curriculum Server | IIAPE Architecture Profiles | Verified versioned profiles with deployment targets |
| **CF-01** | Curriculum Flow | School Tenant-Scoped Auth | Principal authenticated with isolated tenant context |
| **CF-02** | Curriculum Flow | Authoritative School Profile | Configuration resolved with storage and DB strategy |
| **CF-03** | Curriculum Flow | Student Records Registry | Retrieved student records strictly isolated to tenant |
| **ID-01** | Shared Identity | Role Boundary Enforcement | School Principal token rejected for Control Plane |
| **ID-02** | Shared Identity | Cryptographic Tamper Protection | Tampered signature rejected immediately |
| **TI-01** | Tenant Isolation | Strict Cross-Tenant Rejection | Tenant A token accessing Tenant B blocked & audited |
| **DB-01** | Deployment & DB | PostgreSQL Relational Authority | All shards on PostgreSQL 16 LTS; zero Firebase |
| **DB-02** | Deployment & DB | Customer Storage Portability | Private Drive, GCS, and Hybrid rules operational |

---

## 9. Phase 8+ Governance Rules

Any engineer or automated agent working on Phase 8 or subsequent work must adhere to the following blocking constraints:

1. **Do Not Reintroduce Firebase**: Any import of `firebase`, `@firebase/*`, or Firestore will be rejected.
2. **Do Not Import Server Modules in Client Code**: Never import files under `/server/*` into `/src/*` or `/apps/*`. Use `packages/shared-types` and client service singletons.
3. **Preserve UBCIC Tests**: `server/unifiedConnectivityTests.ts` must maintain a 100% pass rate (12 / 12 passing).
4. **Maintain CORS & Tracing**: Every new endpoint in `server.ts` must propagate `correlationId` and adhere to established authentication guards.
5. **Durable Persistence**: Never replace durable storage (`serverSchoolManager.ts`, PostgreSQL) with volatile component state.
