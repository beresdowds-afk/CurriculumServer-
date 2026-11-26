-- Prompt 3: School settlement account lifecycle states, active default constraint, and append-only event log
CREATE TABLE IF NOT EXISTS school_finance.settlement_account_states (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  request_id UUID NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN (
      'pending_proprietor_approval',
      'approved_awaiting_verification',
      'verification_in_progress',
      'verified',
      'active',
      'rejected',
      'suspended',
      'revoked',
      'replaced'
    )
  ),
  is_default BOOLEAN NOT NULL DEFAULT false,
  replaced_by_request_id UUID,
  encrypted_provider_reference TEXT,
  verified_account_name TEXT,
  verification_provider_status TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  verified_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  replaced_at TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, school_id, request_id)
    REFERENCES school_finance.settlement_account_requests (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, replaced_by_request_id)
    REFERENCES school_finance.settlement_account_requests (tenant_id, school_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS settlement_account_active_default_idx
  ON school_finance.settlement_account_states (tenant_id, school_id)
  WHERE state = 'active' AND is_default = true;

CREATE TABLE IF NOT EXISTS school_finance.settlement_account_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  request_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'requested',
      'approved',
      'rejected',
      'verification_started',
      'verification_succeeded',
      'verification_failed',
      'verification_callback',
      'activated',
      'suspended',
      'revoked',
      'replaced'
    )
  ),
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_id UUID,
  idempotency_key TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, request_id)
    REFERENCES school_finance.settlement_account_requests (tenant_id, school_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS settlement_account_events_idempotency_idx
  ON school_finance.settlement_account_events (tenant_id, school_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER settlement_account_events_immutable
  BEFORE UPDATE OR DELETE ON school_finance.settlement_account_events
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'school_finance.settlement_account_states',
    'school_finance.settlement_account_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING
      (tenant_id::text = production.current_tenant_id())
      WITH CHECK (tenant_id::text = production.current_tenant_id())', table_name);
  END LOOP;
END $$;

INSERT INTO production.permissions (code, description) VALUES
  ('school_finance.settlement.verify', 'Run external provider verification for approved school settlement accounts'),
  ('school_finance.settlement.manage', 'Activate, reject, suspend, revoke, or replace school settlement accounts as proprietor')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('principal', 'school_finance.settlement.verify'),
  ('principal_administrator', 'school_finance.settlement.verify'),
  ('proprietor', 'school_finance.settlement.verify'),
  ('proprietor', 'school_finance.settlement.manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;
