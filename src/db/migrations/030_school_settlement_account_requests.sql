CREATE TABLE school_finance.settlement_account_requests (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('opay', 'paystack', 'flutterwave')),
  encrypted_details TEXT NOT NULL CHECK (length(encrypted_details) > 0),
  account_last_four TEXT NOT NULL CHECK (account_last_four ~ '^[0-9]{4}$'),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, requested_by) REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TABLE school_finance.settlement_account_approvals (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  request_id UUID NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, school_id, request_id)
    REFERENCES school_finance.settlement_account_requests (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, approved_by) REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TRIGGER settlement_account_requests_immutable
  BEFORE UPDATE OR DELETE ON school_finance.settlement_account_requests
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();
CREATE TRIGGER settlement_account_approvals_immutable
  BEFORE UPDATE OR DELETE ON school_finance.settlement_account_approvals
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'school_finance.settlement_account_requests', 'school_finance.settlement_account_approvals'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING
      (tenant_id::text = production.current_tenant_id())
      WITH CHECK (tenant_id::text = production.current_tenant_id())', table_name);
  END LOOP;
END $$;

INSERT INTO production.permissions (code, description) VALUES
  ('school_finance.settlement.read', 'Read school settlement account requests'),
  ('school_finance.settlement.request', 'Propose school settlement accounts as principal'),
  ('school_finance.settlement.approve', 'Approve school settlement accounts as proprietor')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('principal', 'school_finance.settlement.read'),
  ('principal', 'school_finance.settlement.request'),
  ('principal_administrator', 'school_finance.settlement.read'),
  ('principal_administrator', 'school_finance.settlement.request'),
  ('proprietor', 'school_finance.settlement.read'),
  ('proprietor', 'school_finance.settlement.approve'),
  ('principal', 'school_finance.policies.read'),
  ('proprietor', 'school_finance.policies.read')
ON CONFLICT (role_code, permission_code) DO NOTHING;
