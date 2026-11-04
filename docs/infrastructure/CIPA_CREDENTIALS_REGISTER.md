# CIPA Credentials and Environment Configuration Register

## Overview
In accordance with mandatory security instructions, no credentials, database passwords, AI provider API keys, or secret environment variables have been installed or populated in AI Studio for CIPA (`curriculum-provisioning-agent`). This register tracks all required non-secret and secret configuration items for later deployment outside AI Studio.

| Configuration Item | Intended Resource / Service | Type | Purpose | Required Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agent Runtime Service Account** | `curriculum-provisioning-agent` | Non-secret | Least-privilege runtime identity | Cloud Run IAM Configuration | **Assigned** (`curriculum-provisioning-agent-runtime`) |
| **PostgreSQL Control Plane URL** (`DATABASE_URL`) | `curriculum-provisioning-agent` | Secret | Access to `control_plane` and `curriculum_flow` schemas | Secret Manager | **Pending** |
| **AI Model Provider API Key** (Gemini / Vertex) | `curriculum-provisioning-agent` | Secret | Natural language requirement parsing & reasoning | Secret Manager | **Pending** |
| **Orchestrator API Auth Token** | `curriculum-provisioning-agent` | Secret | Secure service-to-service communication with Cloud Workflows | Secret Manager | **Pending** |
| **PIAM Authorisation Secret** | `curriculum-provisioning-agent` | Secret | Cryptographic signing for human approval tokens | Secret Manager | **Pending** |
