-- Durable school provisioning and invitation-based first-administrator setup.
-- The existing production schema remains application-architecture agnostic.

ALTER TABLE production.tenants
  ADD COLUMN tenant_slug TEXT,
  ADD COLUMN created_by TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE production.tenants
SET tenant_slug = 'tenant-' || id::text,
    created_by = COALESCE(created_by, 'historical_unverified')
WHERE tenant_slug IS NULL OR created_by IS NULL;
ALTER TABLE production.tenants
  ALTER COLUMN tenant_slug SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL;
CREATE UNIQUE INDEX production_tenants_slug_uq ON production.tenants (tenant_slug);

ALTER TABLE production.organizations
  ADD COLUMN school_type TEXT,
  ADD COLUMN country TEXT,
  ADD COLUMN state_province TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN physical_address TEXT,
  ADD COLUMN official_contact_email TEXT,
  ADD COLUMN telephone TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE production.schools
  ADD COLUMN school_slug TEXT,
  ADD COLUMN school_type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN country TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN state_province TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN city TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN physical_address TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN official_contact_email TEXT NOT NULL DEFAULT 'unknown@example.invalid',
  ADD COLUMN telephone TEXT NOT NULL DEFAULT '',
  ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN default_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE production.schools
SET school_slug = 'school-' || id::text
WHERE school_slug IS NULL;
ALTER TABLE production.schools ALTER COLUMN school_slug SET NOT NULL;
CREATE UNIQUE INDEX production_schools_slug_uq ON production.schools (school_slug);
CREATE UNIQUE INDEX production_schools_id_uq ON production.schools (id);
CREATE UNIQUE INDEX production_schools_registration_uq
  ON production.schools (lower(name), lower(official_contact_email));
ALTER TABLE production.schools
  ADD CONSTRAINT production_schools_type_check
  CHECK (school_type IN ('primary', 'secondary', 'combined', 'tertiary', 'other'));

CREATE TABLE production.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX production_users_email_lower_uq ON production.users (lower(email));

ALTER TABLE production.memberships
  ADD COLUMN user_id UUID REFERENCES production.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX production_memberships_user_uq
  ON production.memberships (tenant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE production.school_configurations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL,
  academic_term_structure JSONB NOT NULL
    CHECK (jsonb_typeof(academic_term_structure) = 'array' AND jsonb_array_length(academic_term_structure) > 0),
  education_levels JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(education_levels) = 'array'),
  grading_configuration JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(grading_configuration) = 'object'),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(settings) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, school_id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.application_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  application_id TEXT NOT NULL,
  application_version TEXT,
  configuration_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'suspended', 'failed', 'decommissioned')),
  enabled_features TEXT[] NOT NULL DEFAULT '{}',
  deployment_architecture TEXT NOT NULL DEFAULT 'shared_database'
    CHECK (deployment_architecture IN ('shared_database', 'dedicated_database', 'dedicated_infrastructure')),
  storage_configuration_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, application_id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_application_instances_status_idx
  ON production.application_instances (tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX production_application_instances_id_uq
  ON production.application_instances (id);

CREATE TABLE production.school_provisioning_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  initiated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.school_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  administrator_name TEXT NOT NULL,
  administrator_email TEXT NOT NULL,
  token_hash BYTEA NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'delivery_failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  delivery_attempts INTEGER NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
  last_delivery_error TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_school_invitations_pending_idx
  ON production.school_admin_invitations (tenant_id, school_id, expires_at)
  WHERE status IN ('pending', 'delivery_failed');

CREATE FUNCTION production.prevent_tenant_id_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Tenant identifiers are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_tenant_id_immutable
  BEFORE UPDATE OF id ON production.tenants
  FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_id_change();

DO $$
DECLARE
  table_name TEXT;
  tenant_column TEXT;
  tenant_tables TEXT[] := ARRAY[
    'production.tenants',
    'production.organizations',
    'production.memberships',
    'production.instances',
    'production.provisioning_jobs',
    'production.approvals',
    'production.audit_events',
    'production.schools',
    'production.classes',
    'production.students',
    'production.academic_records',
    'production.school_configurations',
    'production.application_instances',
    'production.school_provisioning_requests',
    'production.school_admin_invitations'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    tenant_column := CASE WHEN table_name = 'production.tenants' THEN 'id' ELSE 'tenant_id' END;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s
       USING (
         (%I = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)
         OR current_setting(''app.control_plane_admin'', true) = ''true''
       )
       WITH CHECK (
         (%I = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)
         OR current_setting(''app.control_plane_admin'', true) = ''true''
       )',
      table_name, tenant_column, tenant_column
    );
  END LOOP;

  ALTER TABLE production.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE production.users FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS control_plane_user_access ON production.users;
  CREATE POLICY control_plane_user_access ON production.users
    USING (current_setting('app.control_plane_admin', true) = 'true')
    WITH CHECK (current_setting('app.control_plane_admin', true) = 'true');
END $$;
