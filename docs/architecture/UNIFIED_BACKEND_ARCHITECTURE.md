# Unified Backend Architecture

## 1. Architectural Role
The unified backend service is the single authoritative entry point for all API requests from both Curriculum Server and Curriculum Flow frontends. It enforces strict server-side validation, tenant resolution, RBAC, feature entitlement checks, and audit logging.

## 2. Core Subsystems
- **Authentication & Authorization**: Validates user identity and role (Principal, Teacher, Bursar, Student, Parent, ICT Admin, Super Admin) against PostgreSQL records. Never trusts browser-supplied role headers without cryptographic or session validation.
- **Tenant & Instance Resolution**: Resolves incoming hostnames or tenant headers to authoritative tenant IDs (`tenant_id`), verifying subscription status and feature entitlements.
- **API Endpoints (`/api/v1/*`)**:
  - `/api/v1/health`: System liveness and DB connectivity checks.
  - `/api/v1/tenants`: Customer and tenant management.
  - `/api/v1/auth`: Session login and role checks.
  - `/api/v1/provisioning`: IIAPE profiles and provisioning jobs.
  - `/api/v1/domains`: Registrar and DNS validation records.
  - `/api/v1/audit`: Immutable security and administrative logs.
- **Database Access Layer**: Parameterized queries and ORM mappings to prevent SQL injection and ensure strict multi-tenant data isolation.

## 3. Security Boundaries
- **No Client-Side Privilege Escalation**: All sensitive actions (provisioning approval, billing modification, role assignment) require server-side authentication and authorization middleware.
- **CORS & Rate Limiting**: Enforced at the API gateway level.
