CREATE SCHEMA IF NOT EXISTS attendance;

CREATE TABLE attendance.devices (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  device_identity TEXT NOT NULL UNIQUE CHECK (length(device_identity) BETWEEN 1 AND 256),
  device_type TEXT NOT NULL CHECK (device_type IN ('rfid', 'fingerprint', 'facial', 'combined')),
  modalities TEXT[] NOT NULL CHECK (cardinality(modalities) > 0),
  approved_location TEXT NOT NULL CHECK (length(trim(approved_location)) BETWEEN 1 AND 200),
  allowed_event_types TEXT[] NOT NULL CHECK (cardinality(allowed_event_types) > 0),
  permitted_population TEXT NOT NULL CHECK (permitted_population IN ('students', 'staff', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  firmware_version TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  last_sequence_number BIGINT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, created_by) REFERENCES production.memberships (tenant_id, user_id)
);

-- A separate control-plane lookup permits authentication before the tenant is
-- known. The value is ciphertext produced by the server secret vault, not a key.
CREATE TABLE control_plane.attendance_device_credentials (
  device_identity TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  device_id UUID NOT NULL,
  encrypted_signing_key TEXT NOT NULL,
  credential_version BIGINT NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  revoked_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);
REVOKE ALL ON control_plane.attendance_device_credentials FROM PUBLIC;

CREATE TABLE attendance.credentials (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  credential_digest CHAR(64) NOT NULL CHECK (credential_digest ~ '^[0-9a-f]{64}$'),
  modality TEXT NOT NULL CHECK (modality IN ('rfid', 'fingerprint', 'facial')),
  student_id UUID,
  staff_id UUID,
  biometric_reference TEXT,
  enrolled_by UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  CHECK (num_nonnulls(student_id, staff_id) = 1),
  CHECK (modality <> 'facial' OR biometric_reference IS NOT NULL),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, enrolled_by) REFERENCES production.memberships (tenant_id, user_id)
);
CREATE UNIQUE INDEX attendance_active_credential_digest_uq
  ON attendance.credentials (tenant_id, school_id, credential_digest) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX attendance_active_student_credential_uq
  ON attendance.credentials (tenant_id, school_id, student_id, modality)
  WHERE revoked_at IS NULL AND student_id IS NOT NULL;
CREATE UNIQUE INDEX attendance_active_staff_credential_uq
  ON attendance.credentials (tenant_id, school_id, staff_id, modality)
  WHERE revoked_at IS NULL AND staff_id IS NOT NULL;

CREATE TABLE attendance.device_events (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  event_id UUID NOT NULL,
  sequence_number BIGINT,
  occurrence_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, device_id, event_id),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);
CREATE INDEX attendance_device_events_received_idx
  ON attendance.device_events (tenant_id, school_id, received_at);
CREATE INDEX attendance_device_events_sequence_idx
  ON attendance.device_events (tenant_id, school_id, device_id, sequence_number);

CREATE TABLE attendance.event_processing (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  device_event_id UUID NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'received', 'authenticating', 'validating', 'processing', 'accepted',
    'rejected', 'duplicate', 'review_required', 'retry_pending'
  )),
  error_classification TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, device_event_id)
    REFERENCES attendance.device_events (tenant_id, school_id, id)
);
CREATE INDEX attendance_event_processing_history_idx
  ON attendance.event_processing (tenant_id, school_id, device_event_id, occurred_at);

CREATE TABLE attendance.records (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  population TEXT NOT NULL CHECK (population IN ('student', 'staff')),
  student_id UUID,
  staff_id UUID,
  class_id UUID,
  attendance_date DATE NOT NULL,
  attendance_type TEXT NOT NULL CHECK (attendance_type IN ('school', 'classroom', 'staff_shift')),
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused', 'early_departure')),
  source_event_id UUID,
  source_location TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('device', 'manual_correction', 'schedule_cutoff')),
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  CHECK ((population = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
         (population = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, source_event_id)
    REFERENCES attendance.device_events (tenant_id, school_id, id)
);
CREATE INDEX attendance_records_register_idx
  ON attendance.records (tenant_id, school_id, attendance_date, class_id, status);

CREATE TABLE attendance.adjustments (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL,
  previous_state JSONB NOT NULL,
  new_state JSONB NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  actor_user_id UUID NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, attendance_record_id)
    REFERENCES attendance.records (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, actor_user_id)
    REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TABLE attendance.notification_intents (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  guardian_identity TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'arrival', 'departure', 'late_arrival', 'absence', 'early_departure'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'failed')),
  notification_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, event_id, guardian_identity, event_type),
  FOREIGN KEY (tenant_id, school_id, event_id)
    REFERENCES attendance.device_events (tenant_id, school_id, id)
);

CREATE TABLE attendance.device_nonces (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  device_id UUID NOT NULL,
  nonce UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, device_id, nonce),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attendance.devices', 'attendance.credentials', 'attendance.device_events',
    'attendance.event_processing',
    'attendance.records', 'attendance.adjustments', 'attendance.notification_intents',
    'attendance.device_nonces'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (tenant_id::text = production.current_tenant_id()) WITH CHECK (tenant_id::text = production.current_tenant_id())',
      table_name
    );
  END LOOP;
END $$;

CREATE FUNCTION attendance.reject_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Attendance device events are immutable evidence';
END;
$$;
CREATE TRIGGER attendance_device_events_immutable
  BEFORE UPDATE OR DELETE ON attendance.device_events
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_event_mutation();
CREATE TRIGGER attendance_event_processing_immutable
  BEFORE UPDATE OR DELETE ON attendance.event_processing
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_event_mutation();

CREATE FUNCTION attendance.reject_device_identity_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.device_identity IS DISTINCT FROM OLD.device_identity OR
     NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
     NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'Attendance device identity and assignment are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_device_identity_immutable
  BEFORE UPDATE ON attendance.devices
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_device_identity_change();
