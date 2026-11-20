CREATE TABLE production.logistics_workflow_requests (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES production.users(id),
  fingerprint BYTEA NOT NULL CHECK (length(fingerprint) = 32),
  result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id)
);

CREATE TABLE production.logistics_night_curfew (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  service_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'unaccounted')),
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, student_id, service_date),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_dietary_restrictions (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  restriction TEXT NOT NULL CHECK (length(trim(restriction)) BETWEEN 1 AND 1000),
  starts_on DATE NOT NULL,
  ends_on DATE,
  authorized_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES production.users(id),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);
CREATE INDEX logistics_dietary_restrictions_active_idx
  ON production.logistics_dietary_restrictions (tenant_id, school_id, student_id, starts_on, ends_on)
  WHERE revoked_at IS NULL;

ALTER TABLE production.logistics_vehicles ADD COLUMN insurance_valid_until DATE;
ALTER TABLE production.logistics_dining_attendance ADD COLUMN request_fingerprint BYTEA
  CHECK (request_fingerprint IS NULL OR length(request_fingerprint) = 32);
CREATE TABLE production.logistics_vehicle_maintenance (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
  due_on DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES production.users(id),
  scheduled_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, vehicle_id)
    REFERENCES production.logistics_vehicles (tenant_id, school_id, id),
  CHECK ((completed_at IS NULL) = (completed_by IS NULL))
);

CREATE TABLE production.logistics_transport_incidents (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  student_id UUID,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('missed_pickup', 'incident')),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 1000),
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, trip_id)
    REFERENCES production.logistics_trips (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  CHECK (incident_type <> 'missed_pickup' OR student_id IS NOT NULL)
);
CREATE UNIQUE INDEX logistics_missed_pickup_once
  ON production.logistics_transport_incidents (tenant_id, trip_id, student_id)
  WHERE incident_type = 'missed_pickup';
CREATE TRIGGER logistics_transport_incidents_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_transport_incidents
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();

INSERT INTO production.permissions (code, description) VALUES
  ('logistics.dietary.read', 'Read authorized dietary restrictions'),
  ('logistics.dietary.manage', 'Authorize and revoke dietary restrictions'),
  ('logistics.dietary.exception', 'Authorize dietary attendance exceptions')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.logistics_workflow_requests',
    'production.logistics_night_curfew',
    'production.logistics_dietary_restrictions',
    'production.logistics_vehicle_maintenance',
    'production.logistics_transport_incidents'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (
         tenant_id::text = production.current_tenant_id()::text OR production.is_verified_control_plane_context()
       ) WITH CHECK (
         tenant_id::text = production.current_tenant_id()::text OR production.is_verified_control_plane_context()
       )', table_name);
    EXECUTE format('CREATE TRIGGER prevent_tenant_id_change BEFORE UPDATE OF tenant_id ON %s
      FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_id_change()', table_name);
  END LOOP;
END $$;
