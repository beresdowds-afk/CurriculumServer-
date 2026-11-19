ALTER TABLE production.tenant_provisioning_approvals
  ADD CONSTRAINT tenant_provisioning_approvals_scope_id_uq
  UNIQUE (tenant_id, application_instance_id, id);

CREATE TABLE production.tenant_provisioning_authorization_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  approval_id UUID NOT NULL,
  contract_id UUID NOT NULL,
  contract_version SMALLINT NOT NULL CHECK (contract_version = 1),
  contract_hash CHAR(64) NOT NULL CHECK (contract_hash ~ '^[0-9a-f]{64}$'),
  operation TEXT NOT NULL CHECK (operation = 'tenant_database_storage_provisioning'),
  target_project_id TEXT,
  database_strategy TEXT NOT NULL CHECK (
    database_strategy IN ('shared_schema_isolated', 'dedicated_database',
                          'dedicated_customer_gcp_project')
  ),
  storage_strategy TEXT NOT NULL CHECK (
    storage_strategy IN ('platform_storage', 'private_drive', 'hybrid')
  ),
  approved_region TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (
    verification_status IN ('verified', 'unavailable', 'pending', 'rejected',
                            'expired', 'revoked', 'reused', 'invalid')
  ),
  verifier TEXT NOT NULL,
  evidence_reference TEXT,
  evidence_hash CHAR(64) CHECK (evidence_hash IS NULL OR evidence_hash ~ '^[0-9a-f]{64}$'),
  approver_identity TEXT,
  authentication_assurance TEXT CHECK (
    authentication_assurance IS NULL OR authentication_assurance = 'mfa_verified'
  ),
  requester_approver_separated BOOLEAN,
  consumed BOOLEAN,
  safe_reason TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (verification_status <> 'verified' OR
         (evidence_reference IS NOT NULL AND evidence_hash IS NOT NULL
          AND approver_identity IS NOT NULL AND authentication_assurance = 'mfa_verified'
          AND requester_approver_separated IS TRUE AND consumed IS TRUE)),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id, approval_id)
    REFERENCES production.tenant_provisioning_approvals
      (tenant_id, application_instance_id, id) ON DELETE CASCADE
);
CREATE INDEX production_tenant_provisioning_authorization_checks_history_idx
  ON production.tenant_provisioning_authorization_checks
    (tenant_id, application_instance_id, checked_at DESC);

ALTER TABLE production.tenant_provisioning_authorization_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.tenant_provisioning_authorization_checks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_provisioning_authorization_read
  ON production.tenant_provisioning_authorization_checks FOR SELECT
  USING (tenant_id::text = production.current_tenant_id()
         OR production.is_verified_control_plane_context());
CREATE POLICY tenant_provisioning_authorization_write
  ON production.tenant_provisioning_authorization_checks FOR ALL
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());
