ALTER TABLE attendance.devices
  DROP CONSTRAINT IF EXISTS devices_status_check,
  ADD CONSTRAINT attendance_devices_status_check CHECK (status IN (
    'pending', 'enrolled', 'active', 'degraded', 'offline', 'suspended',
    'revocation_pending', 'revoked', 'decommissioned'
  ));

CREATE UNIQUE INDEX attendance_application_instance_school_uq
  ON production.application_instances (tenant_id, school_id, id);

CREATE TABLE attendance.device_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL CHECK (length(trim(manufacturer)) BETWEEN 1 AND 160),
  model TEXT NOT NULL CHECK (length(trim(model)) BETWEEN 1 AND 160),
  category TEXT NOT NULL CHECK (category IN ('rfid', 'fingerprint', 'facial', 'combined')),
  modalities TEXT[] NOT NULL CHECK (cardinality(modalities) > 0),
  communication_protocols TEXT[] NOT NULL DEFAULT '{}',
  integration_method TEXT NOT NULL CHECK (integration_method IN (
    'signed_http', 'mutual_tls', 'vendor_gateway', 'local_gateway', 'unknown'
  )),
  firmware_compatibility JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(firmware_compatibility) = 'object'),
  supported_event_types TEXT[] NOT NULL DEFAULT '{}',
  offline_sync BOOLEAN NOT NULL DEFAULT false,
  credential_management BOOLEAN NOT NULL DEFAULT false,
  configuration_capabilities TEXT[] NOT NULL DEFAULT '{}',
  adapter_id TEXT,
  adapter_version TEXT,
  verification_status TEXT NOT NULL CHECK (verification_status IN (
    'implemented_tested', 'vendor_supported_not_integrated', 'planned', 'test_simulator'
  )),
  operational_limitations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manufacturer, model)
);

CREATE TABLE attendance.device_adapters (
  adapter_id TEXT NOT NULL CHECK (adapter_id ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  adapter_version TEXT NOT NULL CHECK (adapter_version ~ '^[A-Za-z0-9.+_-]{1,64}$'),
  manufacturer TEXT NOT NULL,
  supported_models TEXT[] NOT NULL DEFAULT '{}',
  capability_manifest JSONB NOT NULL CHECK (jsonb_typeof(capability_manifest) = 'object'),
  verification_status TEXT NOT NULL CHECK (verification_status IN (
    'implemented_tested', 'vendor_supported_not_integrated', 'planned', 'test_simulator'
  )),
  enabled BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (adapter_id, adapter_version),
  CHECK ((verification_status = 'implemented_tested') = (verified_at IS NOT NULL))
);

CREATE TABLE attendance.school_capabilities (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'not_requested', 'requested', 'provisioning', 'provisioned',
    'active', 'suspended', 'remediation'
  )),
  requested_configuration JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(requested_configuration) = 'object'),
  requested_by TEXT,
  activated_by TEXT,
  requested_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, school_id, application_instance_id),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, school_id, id),
  CHECK ((status = 'not_requested' AND requested_at IS NULL) OR
         (status <> 'not_requested' AND requested_at IS NOT NULL)),
  CHECK (status <> 'active' OR (activated_at IS NOT NULL AND activated_by IS NOT NULL))
);

CREATE TABLE attendance.installation_locations (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  location_key TEXT NOT NULL CHECK (location_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$'),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, application_instance_id, id),
  UNIQUE (tenant_id, school_id, location_key),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, school_id, id)
);

CREATE TABLE attendance.provisioning_requests (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 8 AND 128),
  device_category TEXT NOT NULL CHECK (device_category IN ('rfid', 'fingerprint', 'facial', 'combined')),
  device_model_id UUID REFERENCES attendance.device_catalogue(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000),
  intended_locations JSONB NOT NULL CHECK (jsonb_typeof(intended_locations) = 'array'),
  intended_population TEXT NOT NULL CHECK (intended_population IN ('students', 'staff', 'both')),
  attendance_use_cases TEXT[] NOT NULL CHECK (cardinality(attendance_use_cases) > 0),
  preferred_integration_method TEXT NOT NULL CHECK (preferred_integration_method IN (
    'signed_http', 'mutual_tls', 'vendor_gateway', 'local_gateway', 'unknown'
  )),
  required_capabilities TEXT[] NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'requested' CHECK (state IN (
    'requested', 'compatibility_check', 'allocation_pending', 'allocated',
    'enrollment_pending', 'enrolled', 'configuration_pending', 'configured',
    'connection_verification', 'integration_verification', 'activation_pending',
    'active', 'rejected', 'failed', 'retry_pending', 'suspended',
    'revocation_pending', 'revoked'
  )),
  retryable BOOLEAN NOT NULL DEFAULT false,
  request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  requested_by TEXT NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, application_instance_id, id),
  UNIQUE (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id) REFERENCES production.schools (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, school_id, id)
);
CREATE INDEX attendance_provisioning_requests_state_idx
  ON attendance.provisioning_requests (tenant_id, state, updated_at);

CREATE TABLE attendance.provisioning_steps (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  request_id UUID NOT NULL,
  step_id UUID NOT NULL DEFAULT gen_random_uuid(),
  step_name TEXT NOT NULL CHECK (step_name IN (
    'compatibility', 'allocation', 'enrollment', 'configuration',
    'connection_test', 'time_sync', 'event_delivery_test', 'attendance_acceptance_test'
  )),
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 5),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'retryable_failure', 'failed', 'skipped')),
  adapter_operation_reference TEXT,
  safe_result JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(safe_result) = 'object'),
  error_code TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, step_id),
  UNIQUE (tenant_id, request_id, step_name, attempt_number),
  FOREIGN KEY (tenant_id, school_id, request_id)
    REFERENCES attendance.provisioning_requests (tenant_id, school_id, id)
);

CREATE TABLE attendance.device_allocations (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  provisioning_request_id UUID,
  catalogue_model_id UUID REFERENCES attendance.device_catalogue(id),
  location_id UUID NOT NULL,
  adapter_id TEXT,
  adapter_version TEXT,
  state TEXT NOT NULL CHECK (state IN (
    'allocated', 'enrollment_pending', 'enrolled', 'configured', 'active',
    'degraded', 'offline', 'suspended', 'revocation_pending', 'revoked', 'decommissioned'
  )),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id)
    REFERENCES attendance.school_capabilities (tenant_id, school_id, application_instance_id),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id, location_id)
    REFERENCES attendance.installation_locations (tenant_id, school_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, school_id, application_instance_id, provisioning_request_id)
    REFERENCES attendance.provisioning_requests (tenant_id, school_id, application_instance_id, id),
  FOREIGN KEY (adapter_id, adapter_version)
    REFERENCES attendance.device_adapters (adapter_id, adapter_version)
);
CREATE UNIQUE INDEX attendance_device_single_active_allocation_idx
  ON attendance.device_allocations (device_id)
  WHERE state NOT IN ('revoked', 'decommissioned');
CREATE INDEX attendance_device_allocations_school_idx
  ON attendance.device_allocations (tenant_id, school_id, state);

CREATE TABLE attendance.device_health_checks (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  device_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  connectivity_status TEXT NOT NULL CHECK (connectivity_status IN ('online', 'offline', 'unknown')),
  attendance_processing_status TEXT NOT NULL CHECK (attendance_processing_status IN ('healthy', 'degraded', 'failed', 'unknown')),
  configuration_sync_status TEXT NOT NULL CHECK (configuration_sync_status IN ('synced', 'pending', 'failed', 'unknown')),
  clock_drift_ms BIGINT,
  pending_event_count INTEGER CHECK (pending_event_count IS NULL OR pending_event_count >= 0),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_details) = 'object'),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);
CREATE INDEX attendance_device_health_latest_idx
  ON attendance.device_health_checks (tenant_id, school_id, device_id, checked_at DESC);

CREATE TABLE attendance.provisioning_audit_events (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  request_id UUID,
  device_id UUID,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 100),
  previous_state TEXT,
  new_state TEXT,
  idempotency_key TEXT,
  reason TEXT,
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(safe_details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, request_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id, request_id)
    REFERENCES attendance.provisioning_requests (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, device_id)
    REFERENCES attendance.devices (tenant_id, school_id, id)
);
CREATE INDEX attendance_provisioning_audit_request_idx
  ON attendance.provisioning_audit_events (tenant_id, school_id, request_id, occurred_at DESC);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attendance.devices', 'attendance.credentials', 'attendance.device_events',
    'attendance.event_processing', 'attendance.records', 'attendance.adjustments',
    'attendance.notification_intents', 'attendance.device_nonces',
    'attendance.school_capabilities', 'attendance.installation_locations',
    'attendance.provisioning_requests', 'attendance.provisioning_steps',
    'attendance.device_allocations', 'attendance.device_health_checks',
    'attendance.provisioning_audit_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_or_control_plane_isolation ON %s
       USING (tenant_id::text = production.current_tenant_id()
              OR production.is_verified_control_plane_context())
       WITH CHECK (tenant_id::text = production.current_tenant_id()
                   OR production.is_verified_control_plane_context())',
      table_name
    );
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

CREATE FUNCTION attendance.reject_provisioning_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Attendance provisioning audit events are immutable';
END;
$$;
CREATE TRIGGER attendance_provisioning_audit_immutable
  BEFORE UPDATE OR DELETE ON attendance.provisioning_audit_events
  FOR EACH ROW EXECUTE FUNCTION attendance.reject_provisioning_audit_mutation();
