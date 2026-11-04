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
| **Communication API Keys** (SMS / WhatsApp) | `curriculum-backend` | Secret | Gate arrival & attendance notifications | Secret Manager | **Pending** |
| **OAuth Client Credentials** | `curriculum-backend` | Secret | Third-party integrations (Google Drive / OneDrive) | Secret Manager | **Pending** |
| **Webhook Signing Secrets** | `curriculum-backend` | Secret | API webhook verification | Secret Manager | **Pending** |
| **Frontend API Base URL** (`VITE_API_BASE_URL`) | `curriculum-server`, `curriculum-flow` | Non-secret | API endpoint routing | Cloud Run environment variables | **Pending** |
