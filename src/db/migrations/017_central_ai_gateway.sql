-- 017_central_ai_gateway.sql
-- Non-destructive migration introducing Central AI Gateway & Intelligent Request Router persistence:
--   1. production.ai_gateway_capabilities (registered applications, capabilities, routing defaults)
--   2. production.tenant_ai_entitlements (per-tenant/instance AI eligibility, limits & quotas)
--   3. production.ai_gateway_requests (request ledger, routing decisions, status & latency)
--   4. production.ai_gateway_usage_metrics (authentic provider token & cost metadata tracking)
--   5. production.ai_gateway_audit_events (tamper-evident AI governance & security audit events)
-- All tables enforce Forced Row-Level Security (RLS) consistent with migrations 005-016.

CREATE TABLE IF NOT EXISTS production.ai_gateway_capabilities (
  capability_id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL CHECK (application_id IN (
    'CURRICULUM_SERVER', 'CURRICULUM_FLOW', 'SCHOOL_INSTANCE', 'PROVISIONING_AGENT'
  )),
  description TEXT NOT NULL,
  default_model_tier TEXT NOT NULL DEFAULT 'standard' CHECK (default_model_tier IN ('fast', 'standard', 'reasoning')),
  default_model_id TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  requires_tenant_context BOOLEAN NOT NULL DEFAULT true,
  requires_teacher_review BOOLEAN NOT NULL DEFAULT false,
  read_only_advisory BOOLEAN NOT NULL DEFAULT false,
  required_permissions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(required_permissions) = 'array'),
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60 CHECK (rate_limit_per_minute > 0),
  max_concurrency INTEGER NOT NULL DEFAULT 10 CHECK (max_concurrency > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production.tenant_ai_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  application_instance_id UUID NOT NULL,
  application_id TEXT NOT NULL CHECK (application_id IN (
    'CURRICULUM_FLOW', 'SCHOOL_INSTANCE'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  allowed_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_capabilities) = 'array'),
  daily_request_limit INTEGER NOT NULL DEFAULT 500 CHECK (daily_request_limit > 0),
  monthly_request_limit INTEGER NOT NULL DEFAULT 10000 CHECK (monthly_request_limit > 0),
  monthly_token_limit INTEGER NOT NULL DEFAULT 5000000 CHECK (monthly_token_limit > 0),
  max_concurrent_requests INTEGER NOT NULL DEFAULT 5 CHECK (max_concurrent_requests > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL AND revoked_by IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS production_tenant_ai_entitlements_lookup_idx
  ON production.tenant_ai_entitlements (tenant_id, application_instance_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS production.ai_gateway_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE CASCADE,
  application_instance_id UUID,
  calling_application TEXT NOT NULL CHECK (calling_application IN (
    'CURRICULUM_SERVER', 'CURRICULUM_FLOW', 'SCHOOL_INSTANCE', 'PROVISIONING_AGENT'
  )),
  capability_id TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT '',
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  provider_id TEXT NOT NULL DEFAULT 'GOOGLE_GEMINI',
  model_id TEXT NOT NULL,
  routing_strategy TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'executing', 'completed', 'rejected', 'failed', 'timed_out'
  )),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_code TEXT,
  error_message TEXT,
  request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(request_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS production_ai_gateway_requests_tenant_idx
  ON production.ai_gateway_requests (tenant_id, calling_application, capability_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS production_ai_gateway_requests_idempotency_uq
  ON production.ai_gateway_requests (calling_application, capability_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS production.ai_gateway_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES production.ai_gateway_requests(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE CASCADE,
  application_instance_id UUID,
  calling_application TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  candidates_tokens INTEGER CHECK (candidates_tokens IS NULL OR candidates_tokens >= 0),
  total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),
  cost_metadata_available BOOLEAN NOT NULL DEFAULT false,
  estimated_cost_usd NUMERIC(12,6) CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  http_status INTEGER NOT NULL CHECK (http_status BETWEEN 100 AND 599),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_ai_gateway_usage_tenant_idx
  ON production.ai_gateway_usage_metrics (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS production.ai_gateway_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  request_id UUID REFERENCES production.ai_gateway_requests(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE CASCADE,
  application_instance_id UUID,
  calling_application TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allowed', 'denied', 'rate_limited', 'quota_exceeded', 'validation_failed', 'provider_error')),
  reason_code TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS production_ai_gateway_audit_tenant_idx
  ON production.ai_gateway_audit_events (tenant_id, created_at DESC);

-- Seed canonical capability registry metadata (idempotent)
INSERT INTO production.ai_gateway_capabilities (
  capability_id, application_id, description, default_model_tier, default_model_id,
  requires_tenant_context, requires_teacher_review, read_only_advisory, required_permissions
) VALUES
  ('LESSON_GENERATION', 'CURRICULUM_SERVER', 'Central curriculum-aligned lesson notes, schemes of work, and adaptive remedial design', 'standard', 'gemini-4-hydrogen', false, false, false, '["ai.curriculum.generate"]'::jsonb),
  ('TEXTBOOK_GENERATION', 'CURRICULUM_SERVER', 'Central authoritative textbook outline and chapter authoring grounded in approved curriculum', 'standard', 'gemini-4-hydrogen', false, false, false, '["ai.curriculum.generate"]'::jsonb),
  ('CURRICULUM_CONTENT_GENERATION', 'CURRICULUM_SERVER', 'Central curriculum guidance, advisor inquiries, and pedagogical content structuring', 'fast', 'gemini-4-hydrogen', false, false, false, '["ai.curriculum.generate"]'::jsonb),
  ('EXAMINATION_GENERATION', 'CURRICULUM_FLOW', 'Curriculum Flow school-scoped examination generation and assessment assembly', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('CBT_GENERATION', 'CURRICULUM_FLOW', 'Curriculum Flow CBT examination question sets and computerized test assembly', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.cbt.generate"]'::jsonb),
  ('QUESTION_BANK_GENERATION', 'CURRICULUM_FLOW', 'Curriculum Flow school-owned question bank authoring and variable item generation', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('ASSESSMENT_SUPPORT', 'CURRICULUM_FLOW', 'Curriculum Flow taught-only classroom assessment and remedial support', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('MARKING_ASSISTANCE', 'CURRICULUM_FLOW', 'Confidential marking schemes, rubrics, and examiner step-by-step scoring guides', 'reasoning', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('SCHOOL_EXAMINATION_GENERATION', 'SCHOOL_INSTANCE', 'Dedicated school instance examination generation scoped strictly to verified tenant', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('SCHOOL_CBT_GENERATION', 'SCHOOL_INSTANCE', 'Dedicated school instance CBT question and locked exam paper generation', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.cbt.generate"]'::jsonb),
  ('SCHOOL_QUESTION_BANK_GENERATION', 'SCHOOL_INSTANCE', 'Dedicated school instance Question Bank item generation (requires teacher approval)', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate", "question_bank.manage"]'::jsonb),
  ('SCHOOL_ASSESSMENT_GENERATION', 'SCHOOL_INSTANCE', 'Dedicated school instance taught-only assessment and adaptive intervention generation', 'standard', 'gemini-4-hydrogen', true, true, false, '["ai.assessments.generate"]'::jsonb),
  ('SCHOOL_REQUIREMENTS_ANALYSIS', 'PROVISIONING_AGENT', 'Structured extraction of school provisioning requirements from natural language (read-only advisory)', 'standard', 'gemini-4-hydrogen', false, false, true, '[]'::jsonb),
  ('ARCHITECTURE_RECOMMENDATION', 'PROVISIONING_AGENT', 'Advisory topology selection and isolation trade-off evaluation (zero direct GCP mutation)', 'reasoning', 'gemini-4-hydrogen', false, false, true, '[]'::jsonb),
  ('RESOURCE_SIZING_RECOMMENDATION', 'PROVISIONING_AGENT', 'Advisory Cloud Run, Cloud SQL, and storage sizing estimates (read-only)', 'standard', 'gemini-4-hydrogen', false, false, true, '[]'::jsonb),
  ('WORKLOAD_ANALYSIS', 'PROVISIONING_AGENT', 'Concurrency, CBT surge, and term-time academic traffic profile estimation (read-only)', 'standard', 'gemini-4-hydrogen', false, false, true, '[]'::jsonb)
ON CONFLICT (capability_id) DO NOTHING;

-- AI Gateway permissions and default role grants
INSERT INTO production.permissions (code, description) VALUES
  ('ai.gateway.read', 'Inspect allowed AI Gateway capabilities and tenant AI usage metrics'),
  ('ai.curriculum.generate', 'Execute curriculum, lesson note, scheme of work, and remedial AI generation'),
  ('ai.assessments.generate', 'Execute exam, marking scheme, taught assessment, and question bank AI generation'),
  ('ai.cbt.generate', 'Execute CBT item and computerized examination AI generation'),
  ('ai.tutor.use', 'Use curriculum advisor and pedagogical AI guidance')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code IN (
  'ai.gateway.read',
  'ai.curriculum.generate',
  'ai.assessments.generate',
  'ai.cbt.generate',
  'ai.tutor.use'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'staff', code
FROM production.permissions
WHERE code IN (
  'ai.gateway.read',
  'ai.curriculum.generate',
  'ai.assessments.generate',
  'ai.cbt.generate',
  'ai.tutor.use'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Forced RLS on all AI Gateway tables
ALTER TABLE production.ai_gateway_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.ai_gateway_capabilities FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_gateway_capabilities_read ON production.ai_gateway_capabilities
  FOR SELECT
  USING (
    production.is_verified_control_plane_context()
    OR production.current_tenant_id() IS NOT NULL
  );

CREATE POLICY ai_gateway_capabilities_control_plane_write ON production.ai_gateway_capabilities
  FOR ALL
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

ALTER TABLE production.tenant_ai_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.tenant_ai_entitlements FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_ai_entitlements_tenant_read ON production.tenant_ai_entitlements
  FOR SELECT
  USING (tenant_id::text = production.current_tenant_id()::text);

CREATE POLICY tenant_ai_entitlements_control_plane_all ON production.tenant_ai_entitlements
  FOR ALL
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'production.ai_gateway_requests',
    'production.ai_gateway_usage_metrics',
    'production.ai_gateway_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY %I_tenant_isolation ON %s
      FOR ALL
      USING (
        production.is_verified_control_plane_context()
        OR (tenant_id IS NOT NULL AND tenant_id::text = production.current_tenant_id()::text)
      )
      WITH CHECK (
        production.is_verified_control_plane_context()
        OR (tenant_id IS NOT NULL AND tenant_id::text = production.current_tenant_id()::text)
      )', replace(tbl, 'production.', ''), tbl);
  END LOOP;
END $$;
