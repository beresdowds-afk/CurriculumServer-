# Privileged Infrastructure Authorisation Manager (PIAM) & Human Authorisation

## 1. Privileged Operations Governance
PIAM governs sensitive infrastructure operations, requiring explicit human approval before any execution can be submitted to an external environment. Operations requiring PIAM approval include:
- Customer GCP project creation.
- Billing account association and budget allocation.
- Project migration between organisational folders.
- Production project deletion or tenant suspension.
- Organisation-wide IAM modifications.

## 2. Administrator Authorisation Centre & Security Controls
- **Requester & Approver Separation**: The administrator requesting a privileged action cannot approve their own request.
- **MFA & Verified Identity**: Authorised approvers require verified sessions and role-based permissions.
- **Immutable Audit Trail**: All approval, rejection, and execution events are recorded in tamper-evident audit ledgers.
- **Scope-Aware Permissions**: Distinguishes project-level, folder-level, and billing-account scopes.
