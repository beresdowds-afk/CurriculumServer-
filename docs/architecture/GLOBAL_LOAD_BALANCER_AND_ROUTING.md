# Global Load Balancer Architecture and Tenant Routing

## 1. Target Traffic-Routing Architecture
The Curriculum Server platform operates behind a Google Cloud global external Application Load Balancer using Serverless Network Endpoint Groups (NEGs) pointing to Cloud Run services (`curriculum-server`, `curriculum-flow`, and `curriculum-backend`).

### Authoritative Hostnames
- **Control Plane**: `curriculumserver.com.ng`, `www.curriculumserver.com.ng`
- **Application ERP**: `curriculumflow.com.ng`, `www.curriculumflow.com.ng`
- **Tenant Subdomains**: `{tenant}.curriculumflow.com.ng`
- **Custom Domains**: Customer-owned domains mapped via CNAME/A records.

## 2. Server-Side Tenant Hostname Resolution
Incoming requests are intercepted by the backend router. Tenant routing logic performs:
1. **Normalization & Validation**: Trims and lowercases incoming hostname.
2. **Authoritative Lookup**: Queries `control_plane.domains` and `control_plane.instances`.
3. **Activation & Ownership Verification**: Validates that the domain is verified, active, and mapped to an authorized tenant instance.
4. **Rejection of Unknown Hostnames**: Unrecognized or suspended domains are rejected with HTTP 404/403.
