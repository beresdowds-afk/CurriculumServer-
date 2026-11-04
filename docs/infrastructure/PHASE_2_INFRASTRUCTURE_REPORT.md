# Curriculum Server — Phase 2 Infrastructure Report: Global Load Balancer & Domain Routing

## 1. Global External Application Load Balancer Architecture
To handle public traffic across the Curriculum Server ecosystem, a Google Cloud global external Application Load Balancer is architected utilizing Serverless Network Endpoint Groups (NEGs) connected directly to Cloud Run services in `europe-west1`.

### Core Load Balancer Components
- **Global External Static IP Address**: Reserved for public ingress (`IPv4` / `IPv6`).
- **Serverless NEGs**:
  - `neg-curriculum-server` → Cloud Run service `curriculum-server`
  - `neg-curriculum-flow` → Cloud Run service `curriculum-flow`
  - `neg-curriculum-backend` → Cloud Run service `curriculum-backend`
- **Backend Services**: Configured with health checks and request timeouts (60s - 120s).
- **URL Map**: Directs traffic based on hostnames and path rules.
- **HTTPS Target Proxy & SSL Certificates**: Google-managed SSL certificates for automated issuance and renewal.
- **HTTP-to-HTTPS Redirection**: Enforces secure encrypted transport for all incoming traffic.

## 2. Backend Routing & Hostname Architecture
The URL map enforces strict host-based routing rules:
- `curriculumserver.com.ng` & `www.curriculumserver.com.ng` → `curriculum-server` (Control Plane)
- `curriculumflow.com.ng` & `www.curriculumflow.com.ng` → `curriculum-flow` (Education ERP)
- `api.curriculumserver.com.ng` → `curriculum-backend` (Unified API Service)
- `{tenant}.curriculumflow.com.ng` → Verified tenant application backend (Tenant-isolated routing)

## 3. Cloud Run Ingress & Security Controls
- **Ingress Settings**: Configured to `internal-and-cloud-load-balancing` for backend services, ensuring that traffic must originate from the global external HTTP(S) load balancer or internal VPC connectors.
- **Direct Public Access Restricted**: Prevents bypass of load-balancer security policies and Cloud Armor DDoS protection.

## 4. Domain & DNS Infrastructure Readiness
- **Registrar Integration Prepared**: Specifications prepared for GO54/WhoGoHost, Namecheap, and Cloudflare DNS management.
- **Zero Secrets Installed**: In strict compliance with security directives, no registrar API keys or private certificate materials have been created or installed.

## 5. Phase 2 Acceptance Status
- Global load balancer routing architecture documented and specified.
- Serverless NEGs and URL map rules defined.
- HTTPS redirection and Google-managed certificate strategy prepared.
- Ready for Phase 2 sign-off and administrator review.
