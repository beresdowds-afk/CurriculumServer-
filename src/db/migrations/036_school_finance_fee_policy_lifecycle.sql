-- Prompt 2: Immutable fee-policy supersession/retirement history and principal approval permissions
CREATE TABLE IF NOT EXISTS school_finance.fee_policy_supersessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  policy_id UUID NOT NULL,
  superseded_by_policy_id UUID,
  action TEXT NOT NULL CHECK (action IN ('superseded', 'retired')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  acted_by UUID NOT NULL,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_id),
  UNIQUE (tenant_id, id),
  CHECK (superseded_by_policy_id IS NULL OR superseded_by_policy_id <> policy_id),
  CHECK (
    (action = 'retired' AND superseded_by_policy_id IS NULL) OR
    (action = 'superseded' AND superseded_by_policy_id IS NOT NULL)
  ),
  FOREIGN KEY (tenant_id, school_id, policy_id)
    REFERENCES school_finance.fee_policies (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, superseded_by_policy_id)
    REFERENCES school_finance.fee_policies (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, acted_by) REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TRIGGER fee_policy_supersessions_immutable
  BEFORE UPDATE OR DELETE ON school_finance.fee_policy_supersessions
  FOR EACH ROW EXECUTE FUNCTION school_finance.reject_policy_mutation();

ALTER TABLE school_finance.fee_policy_supersessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_finance.fee_policy_supersessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON school_finance.fee_policy_supersessions USING
  (tenant_id::text = production.current_tenant_id())
  WITH CHECK (tenant_id::text = production.current_tenant_id());

INSERT INTO production.permissions (code, description) VALUES
  ('school_finance.policies.supersede', 'Supersede or retire approved school fee policies as principal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('principal', 'school_finance.policies.approve'),
  ('principal', 'school_finance.policies.supersede'),
  ('principal_administrator', 'school_finance.policies.supersede')
ON CONFLICT (role_code, permission_code) DO NOTHING;
