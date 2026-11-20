-- School fee policies are independent of platform subscription billing.
CREATE SCHEMA IF NOT EXISTS school_finance;

CREATE TABLE school_finance.fee_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL CHECK (length(trim(academic_session)) BETWEEN 1 AND 40),
  term TEXT NOT NULL CHECK (length(trim(term)) BETWEEN 1 AND 40),
  version INTEGER NOT NULL CHECK (version > 0),
  effective_date DATE NOT NULL,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, academic_session, term, version),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, created_by) REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TABLE school_finance.fee_policy_approvals (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_id),
  FOREIGN KEY (tenant_id, school_id, policy_id)
    REFERENCES school_finance.fee_policies (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, approved_by) REFERENCES production.memberships (tenant_id, user_id)
);

CREATE FUNCTION school_finance.reject_policy_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'School fee policy records are immutable';
END;
$$;

CREATE TRIGGER fee_policies_immutable BEFORE UPDATE OR DELETE ON school_finance.fee_policies
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();
CREATE TRIGGER fee_policy_approvals_immutable BEFORE UPDATE OR DELETE ON school_finance.fee_policy_approvals
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['school_finance.fee_policies', 'school_finance.fee_policy_approvals']
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING
      (tenant_id::text = production.current_tenant_id())
      WITH CHECK (tenant_id::text = production.current_tenant_id())', table_name);
  END LOOP;
END $$;

INSERT INTO production.permissions (code, description) VALUES
  ('school_finance.policies.read', 'Read school fee policies'),
  ('school_finance.policies.create', 'Create immutable school fee policy versions'),
  ('school_finance.policies.approve', 'Approve school fee policies as principal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('tenant_admin', 'school_finance.policies.read'),
  ('tenant_admin', 'school_finance.policies.create'),
  ('bursar', 'school_finance.policies.read'),
  ('bursar', 'school_finance.policies.create'),
  ('principal_administrator', 'school_finance.policies.read'),
  ('principal_administrator', 'school_finance.policies.create'),
  ('principal_administrator', 'school_finance.policies.approve')
ON CONFLICT (role_code, permission_code) DO NOTHING;
