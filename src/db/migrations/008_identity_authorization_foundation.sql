-- Identity and authorization foundation (forward-only).
-- production.users remains the single canonical identity table and
-- production.memberships remains the tenant membership table. Legacy
-- membership rows (including rows with only user_subject) are preserved.

-- Backfills below read forced-RLS tables; the setting is transaction-local.
SELECT set_config('app.control_plane_admin', 'true', true);

-- 1. Membership lifecycle. The legacy role column is retained and is no longer
--    the authoritative permission source; normalized role assignments are.
ALTER TABLE production.memberships
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  ADD COLUMN status_changed_at TIMESTAMPTZ,
  ADD COLUMN revoked_at TIMESTAMPTZ;

-- 2. Platform reference data: permissions, roles, and their mapping.
--    Read-only to the runtime role (RLS allows SELECT only).
CREATE TABLE production.permissions (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z_]+(\.[a-z_]+)+$'),
  description TEXT NOT NULL
);

CREATE TABLE production.roles (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  description TEXT NOT NULL,
  system_role BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE production.role_permissions (
  role_code TEXT NOT NULL REFERENCES production.roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES production.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

INSERT INTO production.permissions (code, description) VALUES
  ('school.profile.read', 'Read the school profile'),
  ('school.configuration.read', 'Read the school application configuration'),
  ('school.configuration.manage', 'Change the school application configuration'),
  ('membership.read', 'Read the caller''s own membership'),
  ('membership.roles.assign', 'Assign or revoke tenant role assignments'),
  ('students.read', 'Read student records'),
  ('students.manage', 'Create and change student records'),
  ('classes.read', 'Read class records'),
  ('classes.manage', 'Create and change class records'),
  ('staff.read', 'Read staff records'),
  ('staff.manage', 'Create and change staff records'),
  ('student_lifecycle.manage', 'Run student lifecycle transitions');

INSERT INTO production.roles (code, description) VALUES
  ('tenant_admin', 'Tenant administrator'),
  ('staff', 'School staff member'),
  ('read_only', 'Read-only school user');

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code FROM production.permissions;
INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('staff', 'school.profile.read'),
  ('staff', 'school.configuration.read'),
  ('staff', 'membership.read'),
  ('staff', 'students.read'),
  ('staff', 'classes.read'),
  ('staff', 'staff.read'),
  ('read_only', 'school.profile.read'),
  ('read_only', 'school.configuration.read'),
  ('read_only', 'membership.read');

-- 3. Normalized, tenant-scoped role assignments. A membership may hold several
--    roles. Optional scope rows restrict an assignment to specific resources;
--    an assignment without scope rows is tenant-wide.
CREATE TABLE production.membership_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_subject TEXT NOT NULL,
  role_code TEXT NOT NULL REFERENCES production.roles(code),
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  FOREIGN KEY (tenant_id, user_subject)
    REFERENCES production.memberships (tenant_id, user_subject) ON DELETE CASCADE
);
CREATE UNIQUE INDEX production_role_assignments_active_uq
  ON production.membership_role_assignments (tenant_id, user_subject, role_code)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX production_role_assignments_tenant_id_id_uq
  ON production.membership_role_assignments (tenant_id, id);

CREATE TABLE production.role_assignment_scopes (
  tenant_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type ~ '^[a-z_]+$'),
  resource_id UUID NOT NULL,
  PRIMARY KEY (assignment_id, resource_type, resource_id),
  FOREIGN KEY (tenant_id, assignment_id)
    REFERENCES production.membership_role_assignments (tenant_id, id) ON DELETE CASCADE
);

-- Backfill from the legacy restricted role; the legacy column is not altered.
INSERT INTO production.membership_role_assignments
  (tenant_id, user_subject, role_code, assigned_by)
SELECT tenant_id, user_subject, role, 'migration:008_legacy_role'
FROM production.memberships
WHERE role IN (SELECT code FROM production.roles);

-- 4. Server-side sessions so revocation does not depend on token expiry.
CREATE TABLE production.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES production.users(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  CHECK (expires_at > issued_at)
);
CREATE INDEX production_user_sessions_user_idx
  ON production.user_sessions (tenant_id, user_id) WHERE revoked_at IS NULL;

-- 5. Invitation durability: token versioning, idempotency, bounded retries,
--    and dead-lettering. Plaintext tokens are never stored.
ALTER TABLE production.school_admin_invitations
  ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1 CHECK (token_version > 0);

ALTER TABLE production.invitation_outbox
  DROP CONSTRAINT invitation_outbox_status_check,
  ADD CONSTRAINT invitation_outbox_status_check
    CHECK (status IN ('pending', 'sending', 'delivered', 'retryable_failure',
                      'failed', 'cancelled', 'dead_letter')),
  ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  ADD COLUMN idempotency_key TEXT,
  ADD COLUMN dead_lettered_at TIMESTAMPTZ;
CREATE UNIQUE INDEX production_invitation_outbox_idempotency_uq
  ON production.invitation_outbox (invitation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE production.invitation_delivery_attempts
  ADD COLUMN token_version INTEGER;

-- 6. Application lifecycle, separate from account activation.
ALTER TABLE production.application_instances
  ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'registration_approved'
    CHECK (lifecycle_stage IN (
      'registration_approved', 'provisioned', 'template_verified', 'admin_invited',
      'admin_activated', 'membership_active', 'configuration_completed',
      'application_activated'
    ));

UPDATE production.application_instances instance
SET lifecycle_stage = CASE
  WHEN instance.status = 'active' THEN 'application_activated'
  WHEN EXISTS (
    SELECT 1 FROM production.school_admin_invitations invitation
    WHERE invitation.tenant_id = instance.tenant_id AND invitation.status = 'accepted'
  ) THEN 'membership_active'
  WHEN instance.provisioning_status = 'ready' THEN 'provisioned'
  ELSE 'registration_approved'
END;

CREATE OR REPLACE FUNCTION production.enforce_lifecycle_transition() RETURNS trigger AS $$
DECLARE
  stages TEXT[] := ARRAY[
    'registration_approved', 'provisioned', 'template_verified', 'admin_invited',
    'admin_activated', 'membership_active', 'configuration_completed',
    'application_activated'
  ];
BEGIN
  IF NEW.lifecycle_stage IS DISTINCT FROM OLD.lifecycle_stage THEN
    IF array_position(stages, NEW.lifecycle_stage) <> array_position(stages, OLD.lifecycle_stage) + 1 THEN
      RAISE EXCEPTION 'Invalid application lifecycle transition % -> %',
        OLD.lifecycle_stage, NEW.lifecycle_stage USING ERRCODE = '23514';
    END IF;
    IF NEW.lifecycle_stage = 'application_activated' AND NEW.status <> 'active' THEN
      RAISE EXCEPTION 'Application activation requires status active' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_instances_lifecycle_transition
  BEFORE UPDATE OF lifecycle_stage ON production.application_instances
  FOR EACH ROW EXECUTE FUNCTION production.enforce_lifecycle_transition();

CREATE TABLE production.application_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  actor TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_lifecycle_events_instance_idx
  ON production.application_lifecycle_events (tenant_id, application_instance_id, created_at);

SELECT set_config('app.control_plane_admin', '', true);

-- 7. Row-level security.
DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'production.membership_role_assignments',
    'production.role_assignment_scopes',
    'production.user_sessions',
    'production.application_lifecycle_events'
  ];
  reference_tables TEXT[] := ARRAY[
    'production.permissions',
    'production.roles',
    'production.role_permissions'
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
  FOREACH table_name IN ARRAY reference_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY reference_read_only ON %s FOR SELECT USING (true)', table_name);
  END LOOP;
END $$;
