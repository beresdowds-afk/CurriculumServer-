CREATE TABLE production.tenant_provisioning_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  approval_subject TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  database_strategy TEXT NOT NULL
    CHECK (database_strategy IN (
      'shared_schema_isolated', 'dedicated_database', 'dedicated_customer_gcp_project'
    )),
  storage_strategy TEXT NOT NULL
    CHECK (storage_strategy IN ('platform_storage', 'private_drive', 'hybrid')),
  approved_region TEXT NOT NULL,
  approved_customer_project_id TEXT,
  approved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  CHECK (
    database_strategy <> 'dedicated_customer_gcp_project'
    OR approved_customer_project_id IS NOT NULL
  )
);
CREATE INDEX production_tenant_provisioning_approvals_lookup_idx
  ON production.tenant_provisioning_approvals
    (tenant_id, application_instance_id, decision, approved_at DESC);

CREATE TABLE production.tenant_provisioning_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  approval_id UUID NOT NULL REFERENCES production.tenant_provisioning_approvals(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'retryable_failure', 'failed', 'ready')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_tenant_provisioning_operations_instance_idx
  ON production.tenant_provisioning_operations
    (tenant_id, application_instance_id, created_at DESC);
CREATE INDEX production_tenant_provisioning_operations_status_idx
  ON production.tenant_provisioning_operations (status, updated_at);

CREATE TABLE production.tenant_database_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  database_strategy TEXT NOT NULL
    CHECK (database_strategy IN (
      'shared_schema_isolated', 'dedicated_database', 'dedicated_customer_gcp_project'
    )),
  engine TEXT NOT NULL CHECK (engine = 'PostgreSQL 16'),
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
  database_name TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  runtime_role_name TEXT NOT NULL,
  secret_manager_reference TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL
    CHECK (lifecycle_state IN ('provisioning', 'ready', 'degraded', 'decommissioned')),
  verified_at TIMESTAMPTZ,
  resource_evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(resource_evidence) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, application_instance_id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, operation_id)
    REFERENCES production.tenant_provisioning_operations (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.tenant_storage_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  storage_strategy TEXT NOT NULL
    CHECK (storage_strategy IN ('platform_storage', 'private_drive', 'hybrid')),
  provider_configuration JSONB NOT NULL
    CHECK (jsonb_typeof(provider_configuration) = 'object'),
  lifecycle_state TEXT NOT NULL
    CHECK (lifecycle_state IN ('provisioning', 'pending_authorization', 'ready', 'degraded', 'decommissioned')),
  verified_at TIMESTAMPTZ,
  resource_evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(resource_evidence) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, application_instance_id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, operation_id)
    REFERENCES production.tenant_provisioning_operations (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.tenant_provisioning_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  stage TEXT NOT NULL
    CHECK (stage IN ('database', 'storage', 'migration', 'verification')),
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'retryable_failure', 'failed')),
  provider_operation_id TEXT,
  error_code TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(evidence) = 'object'),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, operation_id, attempt_number, stage),
  FOREIGN KEY (tenant_id, operation_id)
    REFERENCES production.tenant_provisioning_operations (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_tenant_provisioning_attempts_history_idx
  ON production.tenant_provisioning_attempts (tenant_id, operation_id, started_at);

CREATE TABLE production.tenant_provisioning_verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  resource_kind TEXT NOT NULL CHECK (resource_kind IN ('database', 'storage')),
  provider_resource_id TEXT NOT NULL,
  verifier TEXT NOT NULL,
  checks JSONB NOT NULL CHECK (jsonb_typeof(checks) = 'object'),
  verified_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (tenant_id, operation_id)
    REFERENCES production.tenant_provisioning_operations (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_tenant_provisioning_evidence_history_idx
  ON production.tenant_provisioning_verification_evidence
    (tenant_id, operation_id, verified_at);

DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'production.tenant_provisioning_approvals',
    'production.tenant_provisioning_operations',
    'production.tenant_database_resources',
    'production.tenant_storage_configurations',
    'production.tenant_provisioning_attempts',
    'production.tenant_provisioning_verification_evidence'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_or_control_plane_isolation ON %s
      USING (
        tenant_id::text = production.current_tenant_id()
        OR production.is_verified_control_plane_context()
      )
      WITH CHECK (
        tenant_id::text = production.current_tenant_id()
        OR production.is_verified_control_plane_context()
      )', table_name);
  END LOOP;
END $$;
