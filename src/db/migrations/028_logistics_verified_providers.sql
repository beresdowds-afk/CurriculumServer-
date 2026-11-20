ALTER TABLE production.logistics_route_stops
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN geofence_radius_meters INTEGER NOT NULL DEFAULT 150
    CHECK (geofence_radius_meters BETWEEN 25 AND 2000),
  ADD CONSTRAINT logistics_route_stop_coordinates_pair CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );

CREATE TABLE production.logistics_gps_device_bindings (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider = 'traccar'),
  provider_device_id BIGINT NOT NULL CHECK (provider_device_id > 0),
  provider_unique_id TEXT NOT NULL CHECK (length(trim(provider_unique_id)) BETWEEN 1 AND 200),
  vehicle_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  verified_at TIMESTAMPTZ NOT NULL,
  verified_by UUID NOT NULL REFERENCES production.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, vehicle_id)
    REFERENCES production.logistics_vehicles (tenant_id, school_id, id),
  CHECK (
    (status = 'active' AND revoked_at IS NULL AND revoked_by IS NULL) OR
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);
CREATE UNIQUE INDEX logistics_gps_device_active_provider_uq
  ON production.logistics_gps_device_bindings (tenant_id, school_id, provider, provider_device_id)
  WHERE status = 'active';
CREATE UNIQUE INDEX logistics_gps_vehicle_active_binding_uq
  ON production.logistics_gps_device_bindings (tenant_id, school_id, vehicle_id)
  WHERE status = 'active';

CREATE TABLE production.logistics_gps_telemetry (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  binding_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  provider_position_id BIGINT,
  fix_time TIMESTAMPTZ NOT NULL,
  provider_server_time TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  speed_kph DOUBLE PRECISION CHECK (speed_kph IS NULL OR speed_kph BETWEEN 0 AND 500),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, binding_id)
    REFERENCES production.logistics_gps_device_bindings (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, vehicle_id)
    REFERENCES production.logistics_vehicles (tenant_id, school_id, id)
);
CREATE INDEX logistics_gps_vehicle_fix_history_idx
  ON production.logistics_gps_telemetry (tenant_id, school_id, vehicle_id, fix_time DESC);
CREATE UNIQUE INDEX logistics_gps_provider_position_uq
  ON production.logistics_gps_telemetry (tenant_id, school_id, binding_id, provider_position_id)
  WHERE provider_position_id IS NOT NULL;

CREATE TABLE production.logistics_gps_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID,
  vehicle_id UUID NOT NULL,
  route_stop_id UUID,
  telemetry_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'geofence_entry', 'geofence_exit', 'route_deviation', 'device_unhealthy'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, trip_id)
    REFERENCES production.logistics_trips (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, vehicle_id)
    REFERENCES production.logistics_vehicles (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, route_stop_id)
    REFERENCES production.logistics_route_stops (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, telemetry_id)
    REFERENCES production.logistics_gps_telemetry (tenant_id, school_id, id)
);
CREATE INDEX logistics_gps_events_trip_history_idx
  ON production.logistics_gps_events (tenant_id, school_id, trip_id, occurred_at DESC);

CREATE TABLE production.logistics_library_storage_configurations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  strategy TEXT NOT NULL CHECK (strategy IN ('private_drive', 'platform_storage', 'hybrid')),
  primary_provider TEXT NOT NULL CHECK (primary_provider IN ('google_drive', 'google_cloud_storage')),
  secondary_provider TEXT CHECK (secondary_provider IN ('google_drive', 'google_cloud_storage')),
  drive_folder_id TEXT,
  gcs_bucket TEXT,
  placement_rules JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(placement_rules) = 'object'),
  credentials_envelope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified', 'verified', 'degraded', 'disabled')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES production.users(id),
  configuration_version INTEGER NOT NULL DEFAULT 1 CHECK (configuration_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  CHECK (
    (strategy = 'private_drive' AND primary_provider = 'google_drive' AND secondary_provider IS NULL) OR
    (strategy = 'platform_storage' AND primary_provider = 'google_cloud_storage' AND secondary_provider IS NULL) OR
    (strategy = 'hybrid' AND secondary_provider IS NOT NULL AND secondary_provider <> primary_provider)
  ),
  CHECK (
    (primary_provider <> 'google_drive' OR drive_folder_id IS NOT NULL) AND
    (primary_provider <> 'google_cloud_storage' OR gcs_bucket IS NOT NULL) AND
    (secondary_provider <> 'google_drive' OR drive_folder_id IS NOT NULL) AND
    (secondary_provider <> 'google_cloud_storage' OR gcs_bucket IS NOT NULL)
  ),
  CHECK ((status = 'verified' AND verified_at IS NOT NULL AND verified_by IS NOT NULL) OR
         (status <> 'verified'))
);

CREATE TABLE production.logistics_library_usage_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES production.users(id),
  action TEXT NOT NULL CHECK (action IN ('view', 'download')),
  resource_version INTEGER NOT NULL CHECK (resource_version > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, resource_id)
    REFERENCES production.logistics_library_resources (tenant_id, school_id, id)
);
CREATE INDEX logistics_library_usage_history_idx
  ON production.logistics_library_usage_events (tenant_id, school_id, resource_id, occurred_at DESC);

ALTER TABLE production.logistics_library_resource_versions
  ADD COLUMN content_type TEXT
    CHECK (content_type IS NULL OR content_type ~ '^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+$'),
  ADD COLUMN content_length BIGINT
    CHECK (content_length IS NULL OR content_length BETWEEN 1 AND 262144000),
  ADD CONSTRAINT logistics_library_file_metadata_pair CHECK
    ((content_type IS NULL) = (content_length IS NULL));

ALTER TABLE production.logistics_library_resources
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'staff_only'
    CHECK (visibility IN ('staff_only', 'students', 'staff_and_students'));

CREATE TABLE production.logistics_library_resource_student_access (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  student_id UUID NOT NULL,
  granted_by UUID NOT NULL REFERENCES production.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, school_id, resource_id, student_id),
  FOREIGN KEY (tenant_id, school_id, resource_id)
    REFERENCES production.logistics_library_resources (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE INDEX logistics_library_resource_student_access_student_idx
  ON production.logistics_library_resource_student_access
     (tenant_id, school_id, student_id, resource_id);

CREATE TRIGGER logistics_gps_telemetry_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_gps_telemetry
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_gps_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_gps_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_library_usage_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_library_usage_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();

INSERT INTO production.permissions (code, description) VALUES
  ('logistics.gps.read', 'Read verified school vehicle telemetry and geofence events'),
  ('logistics.gps.manage', 'Verify and manage school GPS device bindings'),
  ('logistics.library.storage.manage', 'Configure verified private school library storage')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('tenant_admin', 'logistics.gps.read'),
  ('tenant_admin', 'logistics.gps.manage'),
  ('tenant_admin', 'logistics.library.storage.manage'),
  ('student', 'logistics.library.read'),
  ('transport_manager', 'logistics.gps.read'),
  ('transport_manager', 'logistics.gps.manage')
ON CONFLICT DO NOTHING;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.logistics_gps_device_bindings',
    'production.logistics_gps_telemetry',
    'production.logistics_gps_events',
    'production.logistics_library_storage_configurations',
    'production.logistics_library_usage_events',
    'production.logistics_library_resource_student_access'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (
         tenant_id::text = production.current_tenant_id()::text
         OR production.is_verified_control_plane_context()
       ) WITH CHECK (
         tenant_id::text = production.current_tenant_id()::text
         OR production.is_verified_control_plane_context()
       )', table_name
    );
    EXECUTE format(
      'CREATE TRIGGER prevent_tenant_id_change
       BEFORE UPDATE OF tenant_id ON %s
       FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_id_change()', table_name
    );
  END LOOP;
END $$;
