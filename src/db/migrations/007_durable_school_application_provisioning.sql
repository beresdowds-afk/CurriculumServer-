ALTER TABLE production.schools
  ADD COLUMN short_name TEXT,
  ADD COLUMN website TEXT,
  ADD COLUMN motto TEXT,
  ADD COLUMN principal_name TEXT,
  ADD COLUMN principal_email TEXT,
  ADD COLUMN principal_phone TEXT,
  ADD COLUMN ict_administrator_name TEXT,
  ADD COLUMN ict_administrator_email TEXT,
  ADD COLUMN ict_administrator_phone TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN primary_brand_color TEXT NOT NULL DEFAULT '#1d4ed8',
  ADD COLUMN accent_brand_color TEXT NOT NULL DEFAULT '#0f766e';

ALTER TABLE production.schools
  DROP CONSTRAINT IF EXISTS production_schools_type_check,
  ADD CONSTRAINT production_schools_type_check
    CHECK (length(trim(school_type)) BETWEEN 1 AND 100);

UPDATE production.schools
SET short_name = name
WHERE short_name IS NULL;

ALTER TABLE production.schools
  ALTER COLUMN short_name SET NOT NULL,
  ADD CONSTRAINT production_schools_primary_color_check
    CHECK (primary_brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT production_schools_accent_color_check
    CHECK (accent_brand_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE production.application_instances
  ADD COLUMN architecture TEXT NOT NULL DEFAULT 'shared_database',
  ADD COLUMN template_id TEXT NOT NULL DEFAULT 'school-standard',
  ADD COLUMN template_version TEXT NOT NULL DEFAULT '1',
  ADD COLUMN provisioning_status TEXT NOT NULL DEFAULT 'provisioning',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE production.application_instances
SET architecture = deployment_architecture;

ALTER TABLE production.application_instances
  DROP CONSTRAINT IF EXISTS application_instances_status_check,
  ADD CONSTRAINT production_application_instances_status_check
    CHECK (status IN (
      'draft', 'pending_approval', 'approved', 'provisioning',
      'provisioning_failed', 'provisioned', 'configuration_pending',
      'ready_for_activation', 'active', 'suspended', 'decommissioning',
      'decommissioned', 'failed'
    )),
  ADD CONSTRAINT production_application_instances_provisioning_status_check
    CHECK (provisioning_status IN (
      'provisioning', 'pending', 'running', 'retryable_failure', 'failed', 'ready'
    )),
  ADD CONSTRAINT production_application_instances_architecture_check
    CHECK (architecture IN (
      'shared_database', 'dedicated_database', 'dedicated_infrastructure'
    ));

CREATE TABLE production.application_instance_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  configuration_version INTEGER NOT NULL CHECK (configuration_version > 0),
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  configuration JSONB NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, application_instance_id, configuration_version),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_application_configurations_tenant_instance_idx
  ON production.application_instance_configurations
    (tenant_id, application_instance_id, configuration_version DESC);

CREATE TABLE production.school_provisioning_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  request_payload JSONB NOT NULL CHECK (jsonb_typeof(request_payload) = 'object'),
  initiated_by TEXT NOT NULL,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE SET NULL,
  school_id UUID,
  application_instance_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'retryable_failure', 'failed', 'ready')),
  retryable BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_code TEXT,
  error_details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(error_details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX production_school_provisioning_operations_tenant_created_idx
  ON production.school_provisioning_operations (tenant_id, created_at DESC);
CREATE INDEX production_school_provisioning_operations_status_idx
  ON production.school_provisioning_operations (status, updated_at);

CREATE TABLE production.school_commercial_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  commercial_model TEXT NOT NULL
    CHECK (commercial_model IN ('monthly', 'annual', 'lease_to_own')),
  plan_reference TEXT NOT NULL,
  price_reference TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_interval TEXT NOT NULL
    CHECK (billing_interval IN ('month', 'year', 'lease')),
  agreed_amount_minor BIGINT CHECK (agreed_amount_minor IS NULL OR agreed_amount_minor >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'manual_approval_required', 'verified')),
  payment_provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, application_instance_id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_school_commercial_agreements_tenant_idx
  ON production.school_commercial_agreements (tenant_id, school_id);

CREATE TABLE production.school_configuration_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  configuration_version INTEGER NOT NULL CHECK (configuration_version > 0),
  configuration JSONB NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, school_id, configuration_version),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_school_configuration_versions_tenant_school_idx
  ON production.school_configuration_versions (tenant_id, school_id, configuration_version DESC);

CREATE TABLE production.application_instance_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  requested_subdomain TEXT,
  requested_custom_domain TEXT,
  application_url TEXT,
  deployment_target TEXT NOT NULL DEFAULT 'shared_platform',
  deployment_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (deployment_status IN ('not_required', 'pending', 'manual_action_required', 'verified', 'failed')),
  dns_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (dns_status IN ('not_requested', 'pending', 'manual_action_required', 'verified', 'failed')),
  tls_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (tls_status IN ('not_requested', 'pending', 'manual_action_required', 'verified', 'failed')),
  health_check_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (health_check_status IN ('pending', 'verified', 'failed')),
  health_check_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, application_instance_id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_application_deployments_tenant_idx
  ON production.application_instance_deployments (tenant_id, application_instance_id);

ALTER TABLE production.school_admin_invitations
  DROP CONSTRAINT IF EXISTS school_admin_invitations_status_check,
  ADD CONSTRAINT production_school_admin_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'delivery_failed', 'revoked')),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN accepted_user_id UUID REFERENCES production.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX production_school_admin_invitations_tenant_id_id_uq
  ON production.school_admin_invitations (tenant_id, id);

CREATE TABLE production.invitation_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invitation_id UUID NOT NULL REFERENCES production.school_admin_invitations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'school_admin_invitation'
    CHECK (event_type = 'school_admin_invitation'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'delivered', 'retryable_failure', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, invitation_id)
    REFERENCES production.school_admin_invitations (tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX production_invitation_outbox_one_live_event_uq
  ON production.invitation_outbox (invitation_id)
  WHERE status IN ('pending', 'sending', 'retryable_failure');
CREATE UNIQUE INDEX production_invitation_outbox_tenant_id_id_uq
  ON production.invitation_outbox (tenant_id, id);
CREATE INDEX production_invitation_outbox_pending_idx
  ON production.invitation_outbox (available_at, created_at)
  WHERE status IN ('pending', 'retryable_failure');

CREATE TABLE production.invitation_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  outbox_id UUID NOT NULL REFERENCES production.invitation_outbox(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sending', 'delivered', 'failed')),
  error_code TEXT,
  provider_message_id TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (tenant_id, outbox_id)
    REFERENCES production.invitation_outbox (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_invitation_delivery_attempts_tenant_outbox_idx
  ON production.invitation_delivery_attempts (tenant_id, outbox_id, attempted_at DESC);

DROP POLICY IF EXISTS tenant_user_login_access ON production.users;
CREATE POLICY tenant_user_login_access ON production.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM production.memberships membership
      WHERE membership.user_id = production.users.id
        AND membership.tenant_id =
          nullif(current_setting('app.tenant_id', true), '')::uuid
    )
  );
CREATE POLICY invitation_token_user_access ON production.users
  USING (
    lower(email) = (
      SELECT lower(invitation.administrator_email)
      FROM production.school_admin_invitations invitation
      WHERE invitation.token_hash = decode(
        nullif(current_setting('app.invitation_token_hash', true), ''), 'hex'
      )
        AND invitation.status = 'pending'
        AND invitation.expires_at > now()
      LIMIT 1
    )
  )
  WITH CHECK (
    lower(email) = (
      SELECT lower(invitation.administrator_email)
      FROM production.school_admin_invitations invitation
      WHERE invitation.token_hash = decode(
        nullif(current_setting('app.invitation_token_hash', true), ''), 'hex'
      )
        AND invitation.status = 'pending'
        AND invitation.expires_at > now()
      LIMIT 1
    )
  );
CREATE POLICY invitation_token_lookup ON production.school_admin_invitations
  FOR SELECT
  USING (
    token_hash = decode(nullif(current_setting('app.invitation_token_hash', true), ''), 'hex')
  );

DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'production.application_instance_configurations',
    'production.school_provisioning_operations',
    'production.school_commercial_agreements',
    'production.school_configuration_versions',
    'production.application_instance_deployments',
    'production.invitation_outbox',
    'production.invitation_delivery_attempts'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s
      USING (
        tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid
        OR current_setting(''app.control_plane_admin'', true) = ''true''
      )
      WITH CHECK (
        tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid
        OR current_setting(''app.control_plane_admin'', true) = ''true''
      )', table_name);
  END LOOP;
END $$;
