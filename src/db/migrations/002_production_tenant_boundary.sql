-- Production tenant records live in a dedicated schema. Demo data is never
-- imported into this schema, and every record is constrained to production.
CREATE SCHEMA production;

CREATE TABLE production.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'suspended', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id)
);

CREATE TABLE production.memberships (
    tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
    user_subject TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'staff', 'read_only')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, user_subject)
);

CREATE TABLE production.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_subject TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    record_origin TEXT NOT NULL DEFAULT 'production'
      CHECK (record_origin = 'production'),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX production_registration_requests_status_idx
    ON production.registration_requests (status, submitted_at);

CREATE TABLE production.registration_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_request_id UUID NOT NULL
      REFERENCES production.registration_requests(id) ON DELETE CASCADE,
    approver_subject TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    rationale TEXT NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    record_origin TEXT NOT NULL DEFAULT 'production'
      CHECK (record_origin = 'production')
);

CREATE TABLE production.instances (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested'
      CHECK (status IN ('requested', 'approved', 'provisioning', 'active', 'suspended', 'failed', 'decommissioned')),
    record_origin TEXT NOT NULL DEFAULT 'production'
      CHECK (record_origin = 'production'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, organization_id)
      REFERENCES production.organizations(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_instances_tenant_status_idx
    ON production.instances (tenant_id, status, created_at);

CREATE TABLE production.provisioning_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    instance_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'running', 'succeeded', 'failed', 'cancelled')),
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, idempotency_key),
    FOREIGN KEY (tenant_id, instance_id)
      REFERENCES production.instances(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    instance_id UUID NOT NULL,
    approver_subject TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, instance_id)
      REFERENCES production.instances(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.audit_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
    actor_subject TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id)
);

CREATE TABLE production.schools (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, organization_id)
      REFERENCES production.organizations(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.classes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    school_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, school_id)
      REFERENCES production.schools(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.students (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    school_id UUID NOT NULL,
    class_id UUID,
    admission_number VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, school_id, admission_number),
    FOREIGN KEY (tenant_id, school_id)
      REFERENCES production.schools(tenant_id, id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, class_id)
      REFERENCES production.classes(tenant_id, id)
);
CREATE INDEX production_students_school_idx ON production.students (tenant_id, school_id);

CREATE TABLE production.academic_records (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    student_id UUID NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    academic_period VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    score NUMERIC(6, 2) NOT NULL CHECK (score >= 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id),
    FOREIGN KEY (tenant_id, student_id)
      REFERENCES production.students(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_academic_records_student_idx
    ON production.academic_records (tenant_id, student_id, academic_period);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenants', 'organizations', 'memberships', 'instances',
    'provisioning_jobs', 'approvals', 'audit_events', 'schools',
    'classes', 'students', 'academic_records'
  ]
  LOOP
    EXECUTE format('ALTER TABLE production.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE production.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON production.%I USING (%s = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (%s = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name,
      CASE WHEN table_name = 'tenants' THEN 'id' ELSE 'tenant_id' END,
      CASE WHEN table_name = 'tenants' THEN 'id' ELSE 'tenant_id' END
    );
  END LOOP;
END $$;
