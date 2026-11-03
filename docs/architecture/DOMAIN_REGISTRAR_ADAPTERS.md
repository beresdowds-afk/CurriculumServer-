# Domain Registrar Adapters & Management Module

## 1. Provider-Independent Domain Management Architecture
To avoid vendor lock-in and support Nigerian and international domain registrars, Curriculum Server implements a provider-independent domain management interface (`DomainRegistrarAdapter`).

## 2. Supported Registrar Adapters
The platform defines adapter interfaces and integration specifications for:
1. **GO54 / WhoGoHost**: Primary Nigerian domain registrar integration for `.com.ng`, `.org.ng`, and `.sch.ng` domains.
2. **Namecheap**: International registrar integration supporting API-based domain registration and DNS record management.
3. **Cloudflare**: DNS and SSL management adapter for rapid edge routing and CNAME flattening.
4. **Other Supported Providers**: Abstract extensible interface for future regional or enterprise registrars.

## 3. Registrar Security & Credential Reference Handling
- Registrar API keys and secrets are never exposed to frontend code or stored in plaintext.
- Credential references are securely managed through the platform's secret management layer.
- All domain registration, renewal, and DNS record modification actions are logged in the immutable audit ledger with correlated admin identities.

## 4. Domain Lifecycle States
- `PENDING_OWNERSHIP_VERIFICATION`
- `DNS_CONFIGURATION_PENDING`
- `DNS_VERIFIED`
- `CERTIFICATE_PENDING`
- `OPERATIONAL`
- `RENEWAL_REQUIRED`
- `EXPIRED`
- `SUSPENDED`
