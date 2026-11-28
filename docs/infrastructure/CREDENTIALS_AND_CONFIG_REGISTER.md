# Credentials and Environment Configuration Register

## Overview
In accordance with mandatory security instructions, no credentials, database passwords, registrar API keys, OAuth secrets, or application environment variables have been installed or populated. This register documents all configuration items required for later manual or automated secure population via Secret Manager and Cloud Run environment variables.

| Configuration Item | Intended Resource / Service | Type | Purpose | Required Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL Connection String** (`DATABASE_URL`) | `curriculum-backend` | Non-secret / Secret component | Database connectivity to `curriculum_platform` | Cloud Run environment / Secret Manager | **Pending** (Awaiting Cloud SQL provisioning) |
| **Database Superuser / App Credentials** | `curriculum-backend` | Secret | Database authentication (`cs_app_user`) | Secret Manager | **Pending** (Awaiting generation outside AI Studio) |
| **Registrar API Credentials** (GO54, Namecheap, Cloudflare) | Domain Manager Job / Backend | Secret | Domain registration & DNS record management | Secret Manager | **Pending** |
| **Gemini / GenAI API Key** | `curriculum-backend` | Secret | AI curriculum advisor and tutoring features | Secret Manager | **Pending** |
| **Payment Gateway Credentials** (Paystack / OPay) | `curriculum-backend` | Secret | School fee settlement and bursary splits | Secret Manager | **Pending** |
| **Communication API Keys** (Sendchamp, Meta WhatsApp Cloud API, Termii, Resend) | `curriculum-backend` (CMAG) | Secret | Central SMS, WhatsApp, OTP/MFA, and platform operational alerts (`SENDCHAMP_API_KEY`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `TERMII_API_KEY`, `INVITATION_EMAIL_API_KEY`) | Secret Manager / `control_plane.cmag_provider_configs` vault | **Pending** (Awaiting live provider accounts & DND/Meta approvals) |
| **CMAG Vault & OTP Signing Keys** (`CMAG_MASTER_KEY`, `CMAG_OTP_PEPPER`, `CONTROL_PLANE_SECRET`, `STORAGE_VAULT_KEYS`) | `curriculum-backend` (CMAG) | Secret | AES-256-GCM encryption of provider credentials & HMAC-SHA256 hashing of 6-digit OTPs | Secret Manager | **Pending** |
| **Messaging Webhook Secrets** (`SENDCHAMP_WEBHOOK_SECRET`, `META_WHATSAPP_APP_SECRET`, `TERMII_WEBHOOK_SECRET`) | `curriculum-backend` (`/api/v1/messaging/webhooks/:providerId`) | Secret | HMAC-SHA256 + timestamp signature verification for delivery receipts | Secret Manager | **Pending** |
| **Platform Alert Targets & Defaults** (`PLATFORM_ALERT_PHONE`, `PLATFORM_ALERT_EMAIL`, `CMAG_DEFAULT_SMS_PROVIDER`, `CMAG_DEFAULT_WHATSAPP_PROVIDER`) | `curriculum-backend` (CMAG) | Non-secret | Default platform escalation phone/email & SMS/WhatsApp provider selection | Cloud Run environment variables | **Pending** |
| **OAuth Client Credentials** | `curriculum-backend` | Secret | Third-party integrations (Google Drive / OneDrive) | Secret Manager | **Pending** |
| **Webhook Signing Secrets** | `curriculum-backend` | Secret | API webhook verification | Secret Manager | **Pending** |
| **Frontend API Base URL** (`VITE_API_BASE_URL`) | `curriculum-server`, `curriculum-flow` | Non-secret | API endpoint routing | Cloud Run environment variables | **Pending** |

