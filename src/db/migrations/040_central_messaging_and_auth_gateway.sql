-- Central Messaging & Authentication Gateway (CMAG)
-- Forward-only migration extending 014 (shared services) and 027 (notification delivery).
-- Preserves existing Email, Web Push, Attendance, Logistics, and Invitation outbox workflows
-- while adding platform-independent CMAG control-plane tables, tenant/application boundaries,
-- pluggable provider configuration, OTP challenges, consent/opt-out governance, broadcasts,
-- delivery receipts, usage accounting, and immutable audit trails.

-- ---------------------------------------------------------------------------
-- 1. Extend existing production.notification_outbox & notification_attempts
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c_name TEXT;
BEGIN
  -- Drop existing status / lease CHECK constraints on production.notification_outbox
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'production.notification_outbox'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%status%'
        OR pg_get_constraintdef(oid) LIKE '%lease_token%'
      )
  LOOP
    EXECUTE format('ALTER TABLE production.notification_outbox DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;

  -- Drop existing status CHECK constraint on production.notification_attempts
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'production.notification_attempts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE production.notification_attempts DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.notification_outbox
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'school'
    CHECK (scope IN ('platform', 'school', 'application')),
  ADD COLUMN IF NOT EXISTS application_id TEXT,
  ADD COLUMN IF NOT EXISTS application_instance_id UUID,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  ADD COLUMN IF NOT EXISTS classification TEXT NOT NULL DEFAULT 'transactional'
    CHECK (classification IN ('authentication', 'transactional', 'broadcast', 'emergency', 'marketing')),
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'notification',
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS sender_identity TEXT,
  ADD COLUMN IF NOT EXISTS recipient_ref TEXT,
  ADD COLUMN IF NOT EXISTS student_id UUID,
  ADD COLUMN IF NOT EXISTS guardian_id UUID,
  ADD COLUMN IF NOT EXISTS broadcast_campaign_id UUID,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_message TEXT,
  ADD COLUMN IF NOT EXISTS cost_minor INTEGER CHECK (cost_minor IS NULL OR cost_minor >= 0),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object');

ALTER TABLE production.notification_outbox
  ADD CONSTRAINT notification_outbox_status_check
    CHECK (status IN (
      'created', 'queued', 'processing', 'submitted', 'provider_accepted',
      'accepted', 'sent', 'delivered', 'read', 'failed', 'expired',
      'cancelled', 'retry_scheduled'
    )),
  ADD CONSTRAINT notification_outbox_lease_pairing_check
    CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  ADD CONSTRAINT notification_outbox_lease_status_check
    CHECK (status IN ('queued', 'processing', 'retry_scheduled') OR lease_token IS NULL);

DROP INDEX IF EXISTS production.notification_outbox_due_idx;
CREATE INDEX notification_outbox_due_idx
  ON production.notification_outbox (tenant_id, next_attempt_at, created_at)
  WHERE status IN ('queued', 'retry_scheduled');

CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_idempotency_uq
  ON production.notification_outbox (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_outbox_provider_msg_idx
  ON production.notification_outbox (provider_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_outbox_app_idx
  ON production.notification_outbox (tenant_id, application_id, application_instance_id, created_at DESC);

ALTER TABLE production.notification_attempts
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS failover_from_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_response_code TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0);

ALTER TABLE production.notification_attempts
  ADD CONSTRAINT notification_attempts_status_check
    CHECK (status IN ('pending', 'submitted', 'accepted', 'provider_accepted', 'sent', 'delivered', 'failed')),
  ADD CONSTRAINT notification_attempts_pending_finished_check
    CHECK ((status = 'pending') = (finished_at IS NULL));

-- ---------------------------------------------------------------------------
-- 2. Extend Shared Service Entitlements (migration 014) for central_messaging
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'production.application_service_entitlements'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%service_id%'
  LOOP
    EXECUTE format('ALTER TABLE production.application_service_entitlements DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.application_service_entitlements
  ADD CONSTRAINT application_service_entitlements_service_id_check
  CHECK (service_id IN (
    'central_curriculum',
    'central_textbooks',
    'central_vehicle_tracking',
    'central_messaging'
  ));

-- ---------------------------------------------------------------------------
-- 3. Control-Plane / Platform-Independent CMAG Tables
--    Platform OTP, MFA, security & provisioning alerts work even with 0 tenants.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION control_plane.cmag_reject_immutable_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'CMAG immutable audit and webhook records cannot be modified or deleted';
END;
$$;

CREATE TABLE IF NOT EXISTS control_plane.cmag_platform_config (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  preferred_channel TEXT NOT NULL DEFAULT 'sms'
    CHECK (preferred_channel IN ('sms', 'whatsapp', 'email')),
  auth_channel_policy TEXT NOT NULL DEFAULT 'sms_only'
    CHECK (auth_channel_policy IN ('sms_only', 'whatsapp_only', 'sms_then_whatsapp', 'whatsapp_then_sms', 'user_selected', 'email')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT false,
  default_sms_provider TEXT NOT NULL DEFAULT 'sendchamp',
  default_whatsapp_provider TEXT NOT NULL DEFAULT 'sendchamp',
  failover_sms_provider TEXT,
  failover_whatsapp_provider TEXT,
  daily_sms_limit INTEGER NOT NULL DEFAULT 5000 CHECK (daily_sms_limit >= 0),
  daily_whatsapp_limit INTEGER NOT NULL DEFAULT 5000 CHECK (daily_whatsapp_limit >= 0),
  monthly_budget_minor INTEGER CHECK (monthly_budget_minor IS NULL OR monthly_budget_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
  retention_days INTEGER NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 7 AND 3650),
  suspended_channels TEXT[] NOT NULL DEFAULT '{}'::text[],
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO control_plane.cmag_platform_config (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS control_plane.cmag_provider_configs (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_:-]{2,64}$'),
  display_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('sms', 'whatsapp', 'multi')),
  supported_channels TEXT[] NOT NULL DEFAULT '{}'::text[],
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_reason TEXT,
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 1),
  base_url TEXT NOT NULL,
  encrypted_credentials TEXT,
  encrypted_webhook_secret TEXT,
  options JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(options) = 'object'),
  readiness_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (readiness_status IN (
      'not_configured', 'credentials_missing', 'credentials_invalid',
      'sender_not_approved', 'template_not_approved', 'unavailable',
      'operational', 'degraded', 'channel_disabled', 'tenant_unauthorized'
    )),
  last_verified_at TIMESTAMPTZ,
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS control_plane.cmag_provider_health (
  provider_id TEXT NOT NULL REFERENCES control_plane.cmag_provider_configs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email', 'web_push')),
  circuit_state TEXT NOT NULL DEFAULT 'closed' CHECK (circuit_state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  opened_at TIMESTAMPTZ,
  next_probe_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_code TEXT,
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, channel)
);

CREATE TABLE IF NOT EXISTS control_plane.cmag_sender_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'school')),
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES control_plane.cmag_provider_configs(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  sender_value TEXT NOT NULL CHECK (length(trim(sender_value)) BETWEEN 1 AND 128),
  sms_route TEXT CHECK (sms_route IS NULL OR sms_route IN ('dnd', 'non_dnd', 'international')),
  waba_id TEXT,
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'submitted', 'approved', 'rejected', 'suspended')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((scope = 'platform' AND tenant_id IS NULL) OR (scope = 'school' AND tenant_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS control_plane.cmag_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('platform', 'school')),
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES control_plane.cmag_provider_configs(id),
  template_key TEXT NOT NULL,
  provider_template_name TEXT NOT NULL,
  provider_template_id TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL CHECK (category IN ('AUTHENTICATION', 'UTILITY', 'MARKETING')),
  body_preview TEXT NOT NULL,
  variable_schema JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(variable_schema) = 'array'),
  approval_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected', 'paused')),
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  approved_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((scope = 'platform' AND tenant_id IS NULL) OR (scope = 'school' AND tenant_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS control_plane.cmag_platform_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'web_push')),
  classification TEXT NOT NULL DEFAULT 'transactional'
    CHECK (classification IN ('authentication', 'transactional', 'broadcast', 'emergency', 'marketing')),
  category TEXT NOT NULL DEFAULT 'platform_operations',
  purpose TEXT NOT NULL DEFAULT 'notification',
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  correlation_id TEXT,
  idempotency_key TEXT UNIQUE,
  template_key TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  provider_id TEXT,
  sender_identity TEXT,
  recipient_ref TEXT,
  encrypted_request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'created', 'queued', 'processing', 'submitted', 'provider_accepted',
      'accepted', 'sent', 'delivered', 'read', 'failed', 'expired',
      'cancelled', 'retry_scheduled'
    )),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  dead_lettered_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cost_minor INTEGER CHECK (cost_minor IS NULL OR cost_minor >= 0),
  currency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK (status IN ('queued', 'processing', 'retry_scheduled') OR lease_token IS NULL)
);

CREATE INDEX IF NOT EXISTS cmag_platform_outbox_due_idx
  ON control_plane.cmag_platform_outbox (next_attempt_at, created_at)
  WHERE status IN ('queued', 'retry_scheduled');

CREATE TABLE IF NOT EXISTS control_plane.cmag_platform_attempts (
  outbox_id UUID NOT NULL REFERENCES control_plane.cmag_platform_outbox(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  lease_token UUID NOT NULL,
  provider_id TEXT,
  failover_from_provider TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'accepted', 'provider_accepted', 'sent', 'delivered', 'failed')),
  error_code TEXT,
  provider_message_id TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (outbox_id, attempt_number),
  CHECK ((status = 'pending') = (finished_at IS NULL))
);

CREATE TABLE IF NOT EXISTS control_plane.cmag_auth_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_email TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  purpose TEXT NOT NULL CHECK (purpose IN ('platform_login', 'platform_mfa', 'platform_recovery', 'security_verify')),
  otp_hash BYTEA NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  resend_count INTEGER NOT NULL DEFAULT 0 CHECK (resend_count >= 0),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  outbox_id UUID,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cmag_platform_otp_lookup_idx
  ON control_plane.cmag_auth_otp_challenges (lower(subject_email), purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS control_plane.cmag_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_message_id TEXT,
  signature_hash TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ,
  delivery_status TEXT NOT NULL,
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload_summary) = 'object'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, provider_event_id)
);

CREATE TRIGGER cmag_webhook_events_immutable
  BEFORE UPDATE OR DELETE ON control_plane.cmag_webhook_events
  FOR EACH ROW EXECUTE FUNCTION control_plane.cmag_reject_immutable_mutation();

CREATE TABLE IF NOT EXISTS control_plane.cmag_platform_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success',
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER cmag_platform_audit_events_immutable
  BEFORE UPDATE OR DELETE ON control_plane.cmag_platform_audit_events
  FOR EACH ROW EXECUTE FUNCTION control_plane.cmag_reject_immutable_mutation();

-- Seed default pluggable provider skeletons (disabled until verified credentials exist)
INSERT INTO control_plane.cmag_provider_configs (
  id, display_name, provider_type, supported_channels, environment, enabled, priority, base_url, readiness_status
) VALUES
  ('sendchamp', 'Sendchamp Multi-Channel Gateway', 'multi', ARRAY['sms', 'whatsapp']::text[], 'production', false, 10, 'https://api.sendchamp.com', 'not_configured'),
  ('meta_whatsapp', 'Meta WhatsApp Business Cloud API', 'whatsapp', ARRAY['whatsapp']::text[], 'production', false, 20, 'https://graph.facebook.com', 'not_configured'),
  ('termii_sms', 'Termii Regional SMS Gateway', 'sms', ARRAY['sms']::text[], 'production', false, 30, 'https://v3.api.termii.com', 'not_configured')
ON CONFLICT (id) DO NOTHING;

INSERT INTO control_plane.cmag_provider_health (provider_id, channel)
VALUES
  ('sendchamp', 'sms'),
  ('sendchamp', 'whatsapp'),
  ('meta_whatsapp', 'whatsapp'),
  ('termii_sms', 'sms')
ON CONFLICT (provider_id, channel) DO NOTHING;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'control_plane.cmag_platform_config',
    'control_plane.cmag_provider_configs',
    'control_plane.cmag_provider_health',
    'control_plane.cmag_sender_identities',
    'control_plane.cmag_whatsapp_templates',
    'control_plane.cmag_platform_outbox',
    'control_plane.cmag_platform_attempts',
    'control_plane.cmag_auth_otp_challenges',
    'control_plane.cmag_webhook_events',
    'control_plane.cmag_platform_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS control_plane_only ON %s', tbl);
    EXECUTE format(
      'CREATE POLICY control_plane_only ON %s
       USING (production.is_verified_control_plane_context())
       WITH CHECK (production.is_verified_control_plane_context())',
      tbl
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Tenant & Application-Instance Scoped CMAG Tables (production.*)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production.cmag_tenant_configs (
  tenant_id UUID PRIMARY KEY REFERENCES production.tenants(id) ON DELETE CASCADE,
  feature_enabled BOOLEAN NOT NULL DEFAULT false,
  provisioning_status TEXT NOT NULL DEFAULT 'not_provisioned'
    CHECK (provisioning_status IN ('not_provisioned', 'pending', 'provisioned', 'suspended', 'failed')),
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  auth_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  school_comms_enabled BOOLEAN NOT NULL DEFAULT false,
  preferred_channel TEXT NOT NULL DEFAULT 'sms'
    CHECK (preferred_channel IN ('sms', 'whatsapp', 'email')),
  auth_channel_policy TEXT NOT NULL DEFAULT 'sms_only'
    CHECK (auth_channel_policy IN ('sms_only', 'whatsapp_only', 'sms_then_whatsapp', 'whatsapp_then_sms', 'user_selected', 'email')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT false,
  provider_allocation JSONB NOT NULL DEFAULT '{"sms":"sendchamp","whatsapp":"sendchamp","mode":"platform_shared_allocated"}'::jsonb
    CHECK (jsonb_typeof(provider_allocation) = 'object'),
  sender_identity_id UUID,
  whatsapp_sender_id UUID,
  sms_sender_name TEXT,
  whatsapp_sender_number TEXT,
  default_locale TEXT NOT NULL DEFAULT 'en',
  jurisdiction TEXT NOT NULL DEFAULT 'NG',
  enabled_categories TEXT[] NOT NULL DEFAULT ARRAY['authentication','attendance','fees','admissions','academics','emergency','logistics']::text[],
  daily_quota INTEGER NOT NULL DEFAULT 500 CHECK (daily_quota >= 0),
  monthly_quota INTEGER NOT NULL DEFAULT 15000 CHECK (monthly_quota >= 0),
  monthly_budget_minor INTEGER CHECK (monthly_budget_minor IS NULL OR monthly_budget_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
  suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  retention_days INTEGER NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 7 AND 3650),
  escalation_policy JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(escalation_policy) = 'object'),
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production.cmag_application_configs (
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  application_id TEXT NOT NULL,
  share_tenant_config BOOLEAN NOT NULL DEFAULT true,
  entitlement_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (entitlement_status IN ('pending', 'active', 'suspended', 'revoked')),
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  auth_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  comms_enabled BOOLEAN NOT NULL DEFAULT false,
  auth_channel_policy TEXT NOT NULL DEFAULT 'sms_only'
    CHECK (auth_channel_policy IN ('sms_only', 'whatsapp_only', 'sms_then_whatsapp', 'whatsapp_then_sms', 'user_selected', 'email')),
  permitted_channels TEXT[] NOT NULL DEFAULT ARRAY['sms']::text[],
  daily_quota INTEGER NOT NULL DEFAULT 300 CHECK (daily_quota >= 0),
  readiness_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (readiness_status IN (
      'not_configured', 'credentials_missing', 'credentials_invalid',
      'sender_not_approved', 'template_not_approved', 'unavailable',
      'operational', 'degraded', 'channel_disabled', 'tenant_unauthorized'
    )),
  last_readiness_check_at TIMESTAMPTZ,
  config_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config_details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, application_instance_id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS production.cmag_message_templates (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id TEXT,
  template_key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  classification TEXT NOT NULL CHECK (classification IN ('authentication', 'transactional', 'broadcast', 'emergency', 'marketing')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body_template TEXT NOT NULL,
  whatsapp_template_name TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  sensitive_data_policy TEXT NOT NULL DEFAULT 'standard'
    CHECK (sensitive_data_policy IN ('standard', 'restricted_guardian_verified', 'auth_only')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS cmag_message_templates_key_uq
  ON production.cmag_message_templates (tenant_id, COALESCE(application_id, ''), template_key, locale, channel);

CREATE TABLE IF NOT EXISTS production.cmag_recipient_preferences (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'staff', 'guardian', 'student')),
  recipient_id TEXT NOT NULL,
  phone_e164 TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  whatsapp_capable BOOLEAN NOT NULL DEFAULT false,
  preferred_channel TEXT NOT NULL DEFAULT 'sms' CHECK (preferred_channel IN ('sms', 'whatsapp', 'email')),
  preferred_locale TEXT NOT NULL DEFAULT 'en',
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  transactional_opt_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
  daily_frequency_cap INTEGER NOT NULL DEFAULT 10 CHECK (daily_frequency_cap BETWEEN 1 AND 100),
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, recipient_type, recipient_id)
);

CREATE TABLE IF NOT EXISTS production.cmag_consent_records (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'staff', 'guardian', 'student')),
  recipient_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  category TEXT NOT NULL,
  consent_status TEXT NOT NULL CHECK (consent_status IN ('granted', 'withdrawn', 'mandatory_auth')),
  jurisdiction TEXT NOT NULL DEFAULT 'NG',
  source TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS production.cmag_auth_otp_challenges (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  application_instance_id UUID,
  user_id TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'staff', 'guardian', 'student', 'user')),
  recipient_ref TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  purpose TEXT NOT NULL CHECK (purpose IN (
    'login_otp', 'mfa_verify', 'account_verify', 'password_recovery',
    'sensitive_action', 'device_verify', 'registration_verify'
  )),
  otp_hash BYTEA NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  resend_count INTEGER NOT NULL DEFAULT 0 CHECK (resend_count >= 0),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  outbox_id UUID,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS cmag_tenant_otp_lookup_idx
  ON production.cmag_auth_otp_challenges (tenant_id, application_id, recipient_hash, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS production.cmag_broadcast_campaigns (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL DEFAULT 'app_curriculum_flow',
  application_instance_id UUID,
  title TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('broadcast', 'emergency', 'transactional', 'marketing')),
  category TEXT NOT NULL,
  target_mode TEXT NOT NULL CHECK (target_mode IN ('one_to_one', 'group', 'role', 'class', 'guardians', 'staff', 'students', 'school_wide')),
  target_filter JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(target_filter) = 'object'),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'auto')),
  template_key TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  message_body TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('draft', 'scheduled', 'queued', 'dispatching', 'completed', 'cancelled', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  queued_count INTEGER NOT NULL DEFAULT 0 CHECK (queued_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS production.cmag_delivery_receipts (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  outbox_id UUID NOT NULL,
  provider_id TEXT NOT NULL,
  provider_message_id TEXT,
  provider_event_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  raw_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(raw_summary) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, provider_id, provider_event_id),
  FOREIGN KEY (tenant_id, outbox_id)
    REFERENCES production.notification_outbox(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS production.cmag_usage_records (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email', 'web_push')),
  classification TEXT NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_id, usage_date, channel, classification)
);

CREATE TABLE IF NOT EXISTS production.cmag_audit_events (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  application_id TEXT,
  application_instance_id UUID,
  actor_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success',
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TRIGGER cmag_audit_events_immutable
  BEFORE UPDATE OR DELETE ON production.cmag_audit_events
  FOR EACH ROW EXECUTE FUNCTION control_plane.cmag_reject_immutable_mutation();

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'production.cmag_tenant_configs',
    'production.cmag_application_configs',
    'production.cmag_message_templates',
    'production.cmag_recipient_preferences',
    'production.cmag_consent_records',
    'production.cmag_auth_otp_challenges',
    'production.cmag_broadcast_campaigns',
    'production.cmag_delivery_receipts',
    'production.cmag_usage_records',
    'production.cmag_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s
       USING (tenant_id::text = production.current_tenant_id() OR production.is_verified_control_plane_context())
       WITH CHECK (tenant_id::text = production.current_tenant_id() OR production.is_verified_control_plane_context())',
      tbl
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Permissions & Least-Privilege Role Assignments
-- ---------------------------------------------------------------------------
INSERT INTO production.permissions (code, description) VALUES
  ('shared.messaging.discover', 'Discover the central messaging and authentication gateway'),
  ('shared.messaging.authorize', 'Request authorization for central messaging operations'),
  ('shared.messaging.health', 'Read central messaging service health'),
  ('shared.messaging.consume', 'Consume central messaging dispatch and reporting operations'),
  ('messaging.config.read', 'View school and application messaging gateway configuration'),
  ('messaging.config.manage', 'Update school and application messaging gateway configuration'),
  ('messaging.send', 'Dispatch school transactional and guardian/staff notifications'),
  ('messaging.broadcast', 'Create and dispatch school group, role, and class broadcasts'),
  ('messaging.emergency', 'Dispatch emergency school-wide SMS/WhatsApp broadcasts'),
  ('messaging.templates.manage', 'Create and manage school localized communication templates'),
  ('messaging.preferences.manage', 'Manage recipient consent, opt-in/opt-out, and preferences'),
  ('messaging.reports.read', 'Read school messaging delivery logs, history, and usage reports'),
  ('messaging.retry', 'Retry failed or dead-lettered school messages'),
  ('messaging.audit.read', 'Read school messaging audit trail')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES
  ('tenant_admin', 'shared.messaging.discover'),
  ('tenant_admin', 'shared.messaging.authorize'),
  ('tenant_admin', 'shared.messaging.health'),
  ('tenant_admin', 'shared.messaging.consume'),
  ('tenant_admin', 'messaging.config.read'),
  ('tenant_admin', 'messaging.config.manage'),
  ('tenant_admin', 'messaging.send'),
  ('tenant_admin', 'messaging.broadcast'),
  ('tenant_admin', 'messaging.emergency'),
  ('tenant_admin', 'messaging.templates.manage'),
  ('tenant_admin', 'messaging.preferences.manage'),
  ('tenant_admin', 'messaging.reports.read'),
  ('tenant_admin', 'messaging.retry'),
  ('tenant_admin', 'messaging.audit.read'),

  ('proprietor', 'shared.messaging.discover'),
  ('proprietor', 'shared.messaging.authorize'),
  ('proprietor', 'shared.messaging.health'),
  ('proprietor', 'shared.messaging.consume'),
  ('proprietor', 'messaging.config.read'),
  ('proprietor', 'messaging.config.manage'),
  ('proprietor', 'messaging.send'),
  ('proprietor', 'messaging.broadcast'),
  ('proprietor', 'messaging.emergency'),
  ('proprietor', 'messaging.templates.manage'),
  ('proprietor', 'messaging.preferences.manage'),
  ('proprietor', 'messaging.reports.read'),
  ('proprietor', 'messaging.retry'),
  ('proprietor', 'messaging.audit.read'),

  ('principal', 'shared.messaging.discover'),
  ('principal', 'shared.messaging.authorize'),
  ('principal', 'shared.messaging.health'),
  ('principal', 'shared.messaging.consume'),
  ('principal', 'messaging.config.read'),
  ('principal', 'messaging.config.manage'),
  ('principal', 'messaging.send'),
  ('principal', 'messaging.broadcast'),
  ('principal', 'messaging.emergency'),
  ('principal', 'messaging.templates.manage'),
  ('principal', 'messaging.preferences.manage'),
  ('principal', 'messaging.reports.read'),
  ('principal', 'messaging.retry'),
  ('principal', 'messaging.audit.read'),

  ('principal_administrator', 'shared.messaging.discover'),
  ('principal_administrator', 'shared.messaging.authorize'),
  ('principal_administrator', 'shared.messaging.health'),
  ('principal_administrator', 'shared.messaging.consume'),
  ('principal_administrator', 'messaging.config.read'),
  ('principal_administrator', 'messaging.config.manage'),
  ('principal_administrator', 'messaging.send'),
  ('principal_administrator', 'messaging.broadcast'),
  ('principal_administrator', 'messaging.emergency'),
  ('principal_administrator', 'messaging.templates.manage'),
  ('principal_administrator', 'messaging.preferences.manage'),
  ('principal_administrator', 'messaging.reports.read'),
  ('principal_administrator', 'messaging.retry'),
  ('principal_administrator', 'messaging.audit.read'),

  ('vice_principal_administration', 'shared.messaging.discover'),
  ('vice_principal_administration', 'shared.messaging.health'),
  ('vice_principal_administration', 'shared.messaging.consume'),
  ('vice_principal_administration', 'messaging.config.read'),
  ('vice_principal_administration', 'messaging.send'),
  ('vice_principal_administration', 'messaging.broadcast'),
  ('vice_principal_administration', 'messaging.emergency'),
  ('vice_principal_administration', 'messaging.preferences.manage'),
  ('vice_principal_administration', 'messaging.reports.read'),
  ('vice_principal_administration', 'messaging.retry'),

  ('ict_system_administrator', 'shared.messaging.discover'),
  ('ict_system_administrator', 'shared.messaging.authorize'),
  ('ict_system_administrator', 'shared.messaging.health'),
  ('ict_system_administrator', 'messaging.config.read'),
  ('ict_system_administrator', 'messaging.config.manage'),
  ('ict_system_administrator', 'messaging.reports.read'),
  ('ict_system_administrator', 'messaging.audit.read'),

  ('administrative_assistant', 'shared.messaging.discover'),
  ('administrative_assistant', 'shared.messaging.health'),
  ('administrative_assistant', 'messaging.config.read'),
  ('administrative_assistant', 'messaging.send'),
  ('administrative_assistant', 'messaging.broadcast'),
  ('administrative_assistant', 'messaging.preferences.manage'),
  ('administrative_assistant', 'messaging.reports.read'),

  ('bursar', 'shared.messaging.discover'),
  ('bursar', 'shared.messaging.health'),
  ('bursar', 'messaging.config.read'),
  ('bursar', 'messaging.send'),
  ('bursar', 'messaging.reports.read')
) AS grants(role_code, permission_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Extend user_sessions.auth_method to record OTP authentication methods
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'production.user_sessions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%auth_method%'
  LOOP
    EXECUTE format('ALTER TABLE production.user_sessions DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.user_sessions
  ADD CONSTRAINT user_sessions_auth_method_check
  CHECK (auth_method IN ('password', 'google_oidc', 'invitation', 'mfa_verified', 'otp_sms', 'otp_whatsapp', 'otp_email'));

