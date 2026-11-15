-- Durable control-plane lifecycle data and tenant isolation.
-- Historical rows without an authoritative tenant relationship stop this migration.

ALTER TABLE control_plane.customers
  ADD COLUMN tenant_id TEXT,
  ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'historical_unverified',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE control_plane.customers SET tenant_id = 'legacy:' || id::text WHERE tenant_id IS NULL;
ALTER TABLE control_plane.customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE UNIQUE INDEX customers_tenant_id_uq ON control_plane.customers (tenant_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM control_plane.organisations o
    LEFT JOIN control_plane.customers c ON c.id = o.customer_id
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot assign tenant context to orphaned historical organisations';
  END IF;
  IF EXISTS (
    SELECT 1 FROM control_plane.instances i
    LEFT JOIN control_plane.organisations o ON o.id = i.org_id
    WHERE o.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot assign tenant context to orphaned historical instances';
  END IF;
  IF EXISTS (
    SELECT 1 FROM control_plane.provisioning_jobs j
    LEFT JOIN control_plane.instances i ON i.id = j.instance_id
    WHERE i.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot assign tenant context to orphaned historical provisioning jobs';
  END IF;
END $$;

ALTER TABLE control_plane.organisations ADD COLUMN tenant_id TEXT;
UPDATE control_plane.organisations o SET tenant_id = c.tenant_id
FROM control_plane.customers c WHERE c.id = o.customer_id;
ALTER TABLE control_plane.organisations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE control_plane.organisations
  ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'historical_unverified',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE control_plane.instances ADD COLUMN tenant_id TEXT;
UPDATE control_plane.instances i SET tenant_id = o.tenant_id
FROM control_plane.organisations o WHERE o.id = i.org_id;
ALTER TABLE control_plane.instances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE control_plane.instances
  ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'historical_unverified',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE control_plane.provisioning_jobs ADD COLUMN tenant_id TEXT;
UPDATE control_plane.provisioning_jobs j SET tenant_id = i.tenant_id
FROM control_plane.instances i WHERE i.id = j.instance_id;
ALTER TABLE control_plane.provisioning_jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE control_plane.provisioning_jobs
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN correlation_id TEXT,
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  ADD COLUMN version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE control_plane.audit_logs
  ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'platform_control_plane',
  ADD COLUMN actor_id TEXT,
  ADD COLUMN correlation_id TEXT,
  ADD COLUMN outcome TEXT NOT NULL DEFAULT 'historical_unverified'
    CHECK (outcome IN ('success', 'failure', 'blocked', 'historical_unverified'));

CREATE TABLE control_plane.provisioning_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (request_status IN ('pending', 'reviewing', 'approved', 'rejected', 'blocked', 'cancelled')),
  requested_by TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  architecture_profile_id UUID,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version BIGINT NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE control_plane.architecture_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  profile_version INTEGER NOT NULL CHECK (profile_version > 0),
  selected_strategy TEXT NOT NULL,
  profile_status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (profile_status IN ('proposed', 'approved', 'retired', 'historical_unverified')),
  strategy_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, profile_name, profile_version)
);

ALTER TABLE control_plane.provisioning_requests
  ADD CONSTRAINT provisioning_requests_architecture_profile_fk
  FOREIGN KEY (architecture_profile_id) REFERENCES control_plane.architecture_profiles(id);

CREATE TABLE control_plane.provisioning_job_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES control_plane.provisioning_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  attempt_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (attempt_status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sanitized_error TEXT,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, job_id, attempt_number)
);

CREATE TABLE control_plane.approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  request_id UUID NOT NULL REFERENCES control_plane.provisioning_requests(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('billing', 'project_creation', 'architecture')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'revoked')),
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  authorization_reference TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE control_plane.piam_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  request_id UUID NOT NULL REFERENCES control_plane.provisioning_requests(id) ON DELETE CASCADE,
  authorization_status TEXT NOT NULL CHECK (authorization_status IN ('authorized', 'denied', 'revoked', 'expired')),
  authorization_reference TEXT NOT NULL,
  authorized_actor_id TEXT NOT NULL,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE control_plane.resource_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  instance_id UUID REFERENCES control_plane.instances(id) ON DELETE RESTRICT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('database', 'storage')),
  configuration_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (configuration_status IN ('planned', 'configured', 'unverified', 'verified', 'failed')),
  provider_resource_id TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE control_plane.resource_verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  resource_configuration_id UUID NOT NULL REFERENCES control_plane.resource_configurations(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'verified', 'failed')),
  verifier TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE control_plane.application_versions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_name TEXT NOT NULL,
  application_version TEXT NOT NULL,
  schema_version BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_name, application_version, schema_version)
);

ALTER TABLE curriculum_flow.users
  DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE curriculum_flow.users
  ADD CONSTRAINT users_tenant_email_uq UNIQUE (tenant_id, email);
ALTER TABLE curriculum_flow.students
  ADD CONSTRAINT students_tenant_admission_uq UNIQUE (tenant_id, admission_number);

CREATE INDEX organisations_tenant_customer_idx ON control_plane.organisations (tenant_id, customer_id);
CREATE INDEX instances_tenant_status_idx ON control_plane.instances (tenant_id, status, created_at DESC);
CREATE INDEX provisioning_jobs_tenant_status_idx ON control_plane.provisioning_jobs (tenant_id, status, created_at DESC);
CREATE INDEX audit_logs_tenant_timestamp_idx ON control_plane.audit_logs (tenant_id, timestamp DESC);
CREATE INDEX provisioning_requests_tenant_status_idx ON control_plane.provisioning_requests (tenant_id, request_status, created_at DESC);
CREATE INDEX provisioning_requests_correlation_idx ON control_plane.provisioning_requests (correlation_id);
CREATE INDEX job_attempts_job_status_idx ON control_plane.provisioning_job_attempts (tenant_id, job_id, attempt_status);
CREATE INDEX approval_records_request_type_idx ON control_plane.approval_records (tenant_id, request_id, approval_type, decided_at DESC);
CREATE INDEX piam_authorizations_request_status_idx ON control_plane.piam_authorizations (tenant_id, request_id, authorization_status);
CREATE INDEX resource_configurations_instance_type_idx ON control_plane.resource_configurations (tenant_id, instance_id, resource_type);
CREATE INDEX resource_evidence_configuration_idx ON control_plane.resource_verification_evidence (tenant_id, resource_configuration_id, created_at DESC);
CREATE INDEX curriculum_flow_students_tenant_class_idx ON curriculum_flow.students (tenant_id, class_group);

DO $$
DECLARE
  table_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'control_plane.customers',
    'control_plane.organisations',
    'control_plane.instances',
    'control_plane.provisioning_jobs',
    'control_plane.audit_logs',
    'control_plane.provisioning_requests',
    'control_plane.architecture_profiles',
    'control_plane.provisioning_job_attempts',
    'control_plane.approval_records',
    'control_plane.piam_authorizations',
    'control_plane.resource_configurations',
    'control_plane.resource_verification_evidence',
    'curriculum_flow.users',
    'curriculum_flow.students'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_scope ON %s
      USING (
        tenant_id = current_setting(''app.tenant_id'', true)
        OR current_setting(''app.control_plane_admin'', true) = ''true''
      )
      WITH CHECK (
        tenant_id = current_setting(''app.tenant_id'', true)
        OR current_setting(''app.control_plane_admin'', true) = ''true''
      )', table_name);
  END LOOP;
END $$;
