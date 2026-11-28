# Curriculum Messaging & Authentication Gateway (CMAG) Architecture

## 1. Central Gateway Architecture & Topology

CMAG (`server/messaging/`) is the single centralized, multi-tenant SMS, WhatsApp, and Email delivery & authentication gateway hosted inside Curriculum Server (`server.ts`). Individual school instances (`app_curriculum_flow`) and platform operations never connect directly to telecom or Meta APIs and never hold provider API keys or webhook signing secrets.

CMAG extends the notification foundation in `server/notifications/` and migration `027_notification_delivery.sql`:
- Existing `NotificationService`, Email (Resend), and Web Push (`web-push`) workflows remain intact.
- Migration `040_central_messaging_and_auth_gateway.sql` extends `production.notification_outbox` and `production.notification_attempts` with CMAG lifecycle columns, adds `auth_method` tracking on `production.user_sessions`, extends `control_plane.application_service_entitlements` for `central_messaging`, and provisions 20 CMAG control-plane (`control_plane.cmag_*`) and tenant-isolated (`production.cmag_*`) tables.

---

## 2. Three Independent Scopes

1. **Platform Scope (`platform`) — Curriculum Server Control Plane**
   - Stored in `control_plane.cmag_*` tables; works independently even when zero schools are provisioned.
   - Handles super-admin OTP/MFA/recovery (`POST /api/v1/server/auth/otp/request`, `/verify`) and platform operational/security alerts (`school_provisioned`, `provisioning_failed`, `provider_failure`, `worker_backlog`, `tenant_suspended`, `security_alert`).
   - Managed via `/api/v1/platform/messaging/*` and `PlatformMessagingGatewayPortal.tsx`.

2. **School Scope (`school`) — Provisioned Tenant Institutions**
   - Stored in `production.cmag_*` tables with **forced PostgreSQL Row-Level Security (RLS)** keyed by `app.current_tenant_id`.
   - Manages school SMS/WhatsApp preferences, OTP channel policies, localized message templates, guardian/staff/student opt-ins & quiet hours, verified guardian-student linkages, daily/monthly quotas, targeted 1:1 sends, group/class/role/school-wide/emergency broadcasts, and queue retry visibility via `/api/v1/messaging/*` and `SchoolMessagingGatewayTab.tsx`.

3. **Application Scope (`application`) — `app_curriculum_flow`**
   - Stored in `production.cmag_application_configs` with explicit `application_id` and `application_instance_id` boundaries plus an explicit `share_tenant_config` toggle.
   - Exposes `POST /api/v1/flow/auth/otp/request` and `/verify` alongside `/api/v1/schools/auth/otp/*`, ensuring OTP challenges minted for one tenant/application cannot be verified against another.

---

## 3. Database Schema (Migration `040`)

- **Control-Plane Tables (`control_plane.cmag_*`)**:
  - `cmag_platform_config`, `cmag_provider_configs`, `cmag_sender_identities`, `cmag_whatsapp_templates`, `cmag_tenant_allocations`, `cmag_platform_auth_challenges`, `cmag_platform_outbox`, `cmag_platform_attempts`, `cmag_webhook_events`, `cmag_platform_audit_events`.
- **Tenant-Isolated Tables (`production.cmag_*`, Forced RLS)**:
  - `cmag_tenant_configs`, `cmag_application_configs`, `cmag_sender_identities`, `cmag_message_templates`, `cmag_recipient_preferences`, `cmag_auth_challenges`, `cmag_broadcasts`, `cmag_usage_daily`, `cmag_delivery_receipts`, `cmag_audit_events`.
- **Seeded Permissions (`server/authorization/permissions.ts`)**:
  - `shared.messaging.{discover,authorize,health}`, `messaging.config.{read,manage}`, `messaging.templates.manage`, `messaging.preferences.manage`, `messaging.{send,broadcast,emergency,retry}`, `messaging.reports.read`, `platform.messaging.{read,manage}`.

---

## 4. Provider Abstraction, Security & Failover

- **Adapters (`server/messaging/providers.ts`)**:
  - `SendchampProviderAdapter` (Nigeria/Africa DND & non-DND SMS + WhatsApp)
  - `MetaWhatsAppProviderAdapter` (Meta Graph API v21+ WhatsApp Business Cloud API)
  - `TermiiSmsProviderAdapter` (Termii DND / generic SMS fallback)
  - Resend Email / Web Push delegation from `server/notifications/`
- **Encrypted Credential Vault**:
  - Provider API keys and webhook secrets are encrypted at rest with AES-256-GCM via `ServerSecretVault` (`STORAGE_VAULT_KEYS` / `CMAG_MASTER_KEY`) inside `control_plane.cmag_provider_configs` and are never returned to browsers or tenant endpoints.
- **Staging-in-Production Guard**:
  - Staging/sandbox provider configurations are blocked when `NODE_ENV=production` or `DEPLOYMENT_ENVIRONMENT=production`.
- **Webhook Security**:
  - `POST /api/v1/messaging/webhooks/:providerId` verifies HMAC-SHA256 signatures using constant-time comparison, enforces timestamp skew limits, rejects duplicate webhook replays via `control_plane.cmag_webhook_events`, and applies monotonic delivery-receipt state transitions (e.g., `delivered` or `read` never regress to `sent`).

---

## 5. Durable Outbox, Worker, Retry & Circuit Breaker

- Implemented in `server/messaging/deliveryEngine.ts`:
  - 13 explicit lifecycle states (`queued`, `processing`, `submitted`, `accepted`, `sent`, `delivered`, `read`, `retry_scheduled`, `failed`, `dead_letter`, `expired`, `cancelled`, plus initial creation state).
  - Background worker started in `server.ts` (disable via `CMAG_WORKER_DISABLED=true`, interval `CMAG_WORKER_POLL_MS`).
  - Claims due messages using 60-second leases and `FOR UPDATE SKIP LOCKED`, with stale lease recovery.
  - Exponential backoff + jitter (`30s * 2^attempt` capped at 1 hour), max attempt enforcement into `dead_letter`, per-provider circuit breaker (`closed` -> `open` -> `half_open`), and explicit failover (e.g., primary SMS failure -> Termii/fallback; WhatsApp failure -> SMS only when policy/config explicitly allows failover).

---

## 6. Authentication Delivery Engine (`server/messaging/otpService.ts`)

- Generates CSPRNG 6-digit OTPs hashed immediately with HMAC-SHA256 (`CONTROL_PLANE_SECRET` / `CMAG_OTP_PEPPER`); plaintext codes are never persisted or logged.
- Enforces TTL (5 minutes), resend cooldown (45s), max verification attempts (5), brute-force lockout, and multi-dimensional sliding-window rate limits (per-IP, per-recipient, per-tenant, per-application).
- Evaluates channel policy (`sms_only`, `whatsapp_only`, `sms_then_whatsapp`, `whatsapp_then_sms`, `user_selected`, `email`) and exempts security/authentication OTPs from marketing opt-outs.
- Issues signed sessions (`user_sessions.auth_method`) only after challenge verification passes within the matching scope/tenant/application.

---

## 7. Provisioning & Reusable Feature Integration

- Central shared service registered as `central_messaging` in `server/sharedServices/registry.ts` and `packages/shared-types/src/sharedServiceContracts.ts`.
- Reusable feature `"whatsapp_sms_broadcast"` ("SMS & WhatsApp Communication Gateway") registered as `provisionable` and `production_approved` in `src/data/applicationRegistryData.ts`, `src/data/messagingGatewayFeatureTemplate.ts`, and `src/data/applicationInstanceConfiguration.ts`.
- `SchoolProvisioningRepository` invokes `provisionTenantMessagingInTransaction` inside the provisioning transaction to initialize `production.cmag_tenant_configs`, `production.cmag_application_configs`, `control_plane.cmag_tenant_allocations`, and `control_plane.application_service_entitlements` idempotently.

---

## 8. Workflow Event Integration (`server/messaging/eventHooks.ts`)

Fault-isolated (`try/catch` non-blocking) hooks emit durable outbox alerts for:
- School provisioning success/failure (platform alerts)
- Admissions review & enrollment
- School Finance fee-policy approval
- Biometric/RFID attendance manual adjustments
- Boarding-house exeat departure authorization

---

## 9. Setup Checklists (External Dependencies)

### Environment Variables
See `.env.example` and `docs/infrastructure/CREDENTIALS_AND_CONFIG_REGISTER.md` for `CMAG_MASTER_KEY`, `CMAG_OTP_PEPPER`, `CONTROL_PLANE_SECRET`, `STORAGE_VAULT_KEYS`, `SENDCHAMP_*`, `META_WHATSAPP_*`, and `TERMII_*`.

### Sendchamp / Termii (Nigeria / Africa SMS)
1. Provision live API keys and register webhook URL `https://<host>/api/v1/messaging/webhooks/sendchamp` (or `/termii`) with matching webhook secret.
2. Complete NCC / telco DND Sender ID KYC approval for each requested alphanumeric sender ID (`3–11` chars).

### Meta WhatsApp Business Cloud API
1. Verify Meta Business Portfolio, WABA ID, and dedicated E.164 phone number (`META_WHATSAPP_PHONE_NUMBER_ID`).
2. Submit `AUTHENTICATION` (OTP) and `UTILITY` (admissions/fees/attendance/exeat) templates for Meta approval and record approved templates in `PlatformMessagingGatewayPortal`.
3. Configure webhook callback `https://<host>/api/v1/messaging/webhooks/meta_whatsapp` signed with `META_WHATSAPP_APP_SECRET`.

---

## 10. Software Readiness vs. External Carrier/Database Dependencies

- **Completed in Code**: Schema migration `040`, forced RLS policies, provider adapters, encrypted secret vault, OTP hashing/rate limiting/lockouts, durable worker/retries/circuit breaker/failover, webhook signature + replay protection, RBAC & capability gate registrations, provisioning hooks, event hooks, and Platform + School UIs.
- **External Dependencies Required Before Live Traffic**:
  1. Running PostgreSQL instance with `DATABASE_URL` and migration `040` applied.
  2. Live Sendchamp / Termii / Meta WhatsApp API credentials and webhook secrets injected into Secret Manager / CMAG provider vault.
  3. Telco DND Sender ID approvals and Meta-approved WhatsApp Business templates.
