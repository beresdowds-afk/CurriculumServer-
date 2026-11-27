-- Complete Attendance Device Provisioning, School Device Management,
-- Authenticated Ingestion, Classification Integrity, and Credential Rotation History.
-- Forward-only migration building on 008, 009, 027, 031, 032, 033, and 034.

-- 1. Extend device catalogue and adapters for platform governance & verification evidence
ALTER TABLE attendance.device_catalogue
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(verification_evidence) = 'object');

ALTER TABLE attendance.device_adapters
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(verification_evidence) = 'object'),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS attendance.catalogue_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_model_id UUID REFERENCES attendance.device_catalogue(id),
  adapter_id TEXT,
  adapter_version TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 100),
  reason TEXT,
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(safe_details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER attendance_catalogue_audit_immutable
  BEFORE UPDATE OR DELETE ON attendance.catalogue_audit_events
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_provisioning_audit_mutation();

-- 2. Extend control-plane device credentials and immutable rotation/revocation history
ALTER TABLE control_plane.attendance_device_credentials
  ADD COLUMN IF NOT EXISTS issued_by TEXT,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE TABLE IF NOT EXISTS control_plane.attendance_device_credential_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_identity TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  device_id UUID NOT NULL,
  credential_version BIGINT NOT NULL CHECK (credential_version > 0),
  event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'rotated', 'revoked')),
  actor TEXT NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);

CREATE INDEX IF NOT EXISTS attendance_credential_history_device_idx
  ON control_plane.attendance_device_credential_history (device_identity, credential_version DESC, occurred_at DESC);

CREATE TRIGGER attendance_credential_history_immutable
  BEFORE UPDATE OR DELETE ON control_plane.attendance_device_credential_history
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_provisioning_audit_mutation();

REVOKE ALL ON control_plane.attendance_device_credential_history FROM PUBLIC;

ALTER TABLE control_plane.attendance_device_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_plane.attendance_device_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS control_plane_only ON control_plane.attendance_device_credentials;
CREATE POLICY control_plane_only ON control_plane.attendance_device_credentials
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

ALTER TABLE control_plane.attendance_device_credential_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_plane.attendance_device_credential_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS control_plane_only ON control_plane.attendance_device_credential_history;
CREATE POLICY control_plane_only ON control_plane.attendance_device_credential_history
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

-- 3. Extend attendance.devices and school_capabilities for complete management & health evaluation
ALTER TABLE attendance.devices
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS catalogue_model_id UUID REFERENCES attendance.device_catalogue(id),
  ADD COLUMN IF NOT EXISTS adapter_id TEXT,
  ADD COLUMN IF NOT EXISTS adapter_version TEXT,
  ADD COLUMN IF NOT EXISTS location_id UUID,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connectivity_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (connectivity_status IN ('online', 'degraded', 'offline', 'unknown')),
  ADD COLUMN IF NOT EXISTS degraded_threshold_seconds INTEGER NOT NULL DEFAULT 300
    CHECK (degraded_threshold_seconds > 0),
  ADD COLUMN IF NOT EXISTS offline_threshold_seconds INTEGER NOT NULL DEFAULT 900
    CHECK (offline_threshold_seconds > degraded_threshold_seconds),
  ADD COLUMN IF NOT EXISTS enrollment_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decommissioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_devices_adapter_fk'
  ) THEN
    ALTER TABLE attendance.devices
      ADD CONSTRAINT attendance_devices_adapter_fk
      FOREIGN KEY (adapter_id, adapter_version)
      REFERENCES attendance.device_adapters (adapter_id, adapter_version);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_devices_location_fk'
  ) THEN
    ALTER TABLE attendance.devices
      ADD CONSTRAINT attendance_devices_location_fk
      FOREIGN KEY (tenant_id, school_id, location_id)
      REFERENCES attendance.installation_locations (tenant_id, school_id, id);
  END IF;
END $$;

ALTER TABLE attendance.school_capabilities
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS heartbeat_thresholds JSONB NOT NULL DEFAULT '{"degradedSeconds":300,"offlineSeconds":900}'::jsonb
    CHECK (jsonb_typeof(heartbeat_thresholds) = 'object');

-- Allow degraded connectivity state in device_health_checks as well
DO $$
DECLARE c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'attendance'
      AND rel.relname = 'device_health_checks'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%connectivity_status%'
  LOOP
    EXECUTE format('ALTER TABLE attendance.device_health_checks DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE attendance.device_health_checks
  ADD CONSTRAINT attendance_device_health_connectivity_check
  CHECK (connectivity_status IN ('online', 'degraded', 'offline', 'unknown'));

-- 4. Strengthen attendance.records: review_required support, out-of-order monotonic bounds, duplicate context uniqueness
DO $$
DECLARE c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'attendance'
      AND rel.relname = 'records'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE attendance.records DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE attendance.records
  ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present', 'late', 'absent', 'excused', 'early_departure', 'review_required')),
  ADD COLUMN IF NOT EXISTS first_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_source_event_id UUID,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_last_source_event_fk'
  ) THEN
    ALTER TABLE attendance.records
      ADD CONSTRAINT attendance_records_last_source_event_fk
      FOREIGN KEY (tenant_id, school_id, last_source_event_id)
      REFERENCES attendance.device_events (tenant_id, school_id, id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_student_context_uq
  ON attendance.records (
    tenant_id,
    school_id,
    student_id,
    attendance_date,
    attendance_type,
    COALESCE(class_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_staff_context_uq
  ON attendance.records (tenant_id, school_id, staff_id, attendance_date, attendance_type)
  WHERE staff_id IS NOT NULL;

-- 5. Enforce adjustment immutability and extend notification_intents + nonce index
CREATE TRIGGER attendance_adjustments_immutable
  BEFORE UPDATE OR DELETE ON attendance.adjustments
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_event_mutation();

DO $$
DECLARE c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'attendance'
      AND rel.relname = 'notification_intents'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE attendance.notification_intents DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE attendance.notification_intents
  ADD CONSTRAINT attendance_notification_intents_status_check
    CHECK (status IN ('pending', 'queued', 'failed', 'blocked')),
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS attendance_device_nonces_received_idx
  ON attendance.device_nonces (tenant_id, device_id, received_at DESC);

-- 6. Seed canonical attendance permissions and least-privilege role grants
INSERT INTO production.permissions (code, description) VALUES
  ('attendance.read', 'Read school attendance registers, device status, sync status, and capability state'),
  ('attendance.adjust', 'Create immutable manual attendance record adjustments with reason'),
  ('attendance.devices.manage', 'Inspect and run connectivity tests or location reassignments for school attendance devices'),
  ('attendance.devices.activate', 'Activate or reactivate verified attendance devices for a school'),
  ('attendance.devices.suspend', 'Suspend active school attendance devices'),
  ('attendance.devices.revoke', 'Revoke or decommission school attendance devices'),
  ('attendance.credentials.manage', 'Enroll/revoke person attendance credentials and rotate/revoke device signing credentials'),
  ('attendance.devices.provision', 'Platform attendance device catalogue administration and provisioning orchestration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code LIKE 'attendance.%'
  AND code <> 'attendance.devices.provision'
ON CONFLICT DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('proprietor', 'attendance.read'),
  ('principal', 'attendance.read'),
  ('principal', 'attendance.adjust'),
  ('principal', 'attendance.devices.manage'),
  ('principal', 'attendance.devices.activate'),
  ('principal', 'attendance.devices.suspend'),
  ('principal', 'attendance.devices.revoke'),
  ('principal', 'attendance.credentials.manage'),
  ('principal_administrator', 'attendance.read'),
  ('principal_administrator', 'attendance.adjust'),
  ('principal_administrator', 'attendance.devices.manage'),
  ('principal_administrator', 'attendance.devices.activate'),
  ('principal_administrator', 'attendance.devices.suspend'),
  ('principal_administrator', 'attendance.devices.revoke'),
  ('principal_administrator', 'attendance.credentials.manage'),
  ('vice_principal_administration', 'attendance.read'),
  ('vice_principal_administration', 'attendance.adjust'),
  ('vice_principal_administration', 'attendance.devices.manage'),
  ('vice_principal_administration', 'attendance.devices.suspend'),
  ('ict_system_administrator', 'attendance.read'),
  ('ict_system_administrator', 'attendance.devices.manage'),
  ('ict_system_administrator', 'attendance.devices.suspend'),
  ('ict_system_administrator', 'attendance.credentials.manage'),
  ('ict_technician', 'attendance.read'),
  ('ict_technician', 'attendance.devices.manage'),
  ('administrative_assistant', 'attendance.read'),
  ('teacher', 'attendance.read'),
  ('read_only', 'attendance.read')
ON CONFLICT DO NOTHING;
