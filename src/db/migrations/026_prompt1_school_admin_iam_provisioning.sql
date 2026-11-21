-- Prompt 1: Complete School Administration, Institutional Directories,
-- Student Lifecycle, Guardian Management, Central IAM, and Provisioning Suite.
-- Forward-only migration; preserves all prior migrations (001-025).

-- Utility trigger function to prevent mutation of tenant_id on child tables.
CREATE OR REPLACE FUNCTION production.prevent_tenant_column_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Tenant identifiers are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. SCHOOL INSTITUTIONAL IDENTITY, ORGANIZATION & ACADEMIC CALENDAR
-- =====================================================================

ALTER TABLE production.schools
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS registered_identity TEXT,
  ADD COLUMN IF NOT EXISTS ownership TEXT NOT NULL DEFAULT 'private'
    CHECK (ownership IN ('public', 'private', 'mission', 'federal', 'state', 'international', 'community')),
  ADD COLUMN IF NOT EXISTS educational_classification TEXT NOT NULL DEFAULT 'k12_secondary',
  ADD COLUMN IF NOT EXISTS administrative_address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS operational_policies JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(operational_policies) = 'object'),
  ADD COLUMN IF NOT EXISTS institutional_status TEXT NOT NULL DEFAULT 'pending_activation'
    CHECK (institutional_status IN ('pending_activation', 'active', 'suspended', 'decommissioned')),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

UPDATE production.schools
SET legal_name = COALESCE(legal_name, name),
    administrative_address = COALESCE(administrative_address, physical_address)
WHERE legal_name IS NULL OR administrative_address IS NULL;

CREATE TABLE production.school_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL
    CHECK (to_status IN ('pending_activation', 'active', 'suspended', 'decommissioned')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  changed_by TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_school_status_history_idx
  ON production.school_status_history (tenant_id, school_id, occurred_at DESC);

CREATE TABLE production.academic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  session_code TEXT NOT NULL CHECK (length(trim(session_code)) BETWEEN 3 AND 40),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 3 AND 120),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'archived')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, session_code),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  CHECK (ends_on > starts_on)
);
CREATE UNIQUE INDEX production_academic_sessions_current_uq
  ON production.academic_sessions (tenant_id, school_id)
  WHERE is_current = true;

CREATE TABLE production.academic_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  session_id UUID NOT NULL,
  term_order INTEGER NOT NULL CHECK (term_order BETWEEN 1 AND 6),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, session_id, term_order),
  FOREIGN KEY (tenant_id, school_id, session_id)
    REFERENCES production.academic_sessions (tenant_id, school_id, id) ON DELETE CASCADE,
  CHECK (ends_on > starts_on)
);
CREATE UNIQUE INDEX production_academic_terms_current_uq
  ON production.academic_terms (tenant_id, school_id)
  WHERE is_current = true;

ALTER TABLE production.school_departments
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'academic'
    CHECK (unit_type IN ('academic', 'administrative', 'support', 'faculty')),
  ADD COLUMN IF NOT EXISTS parent_department_id UUID,
  ADD COLUMN IF NOT EXISTS head_staff_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'));

ALTER TABLE production.school_departments
  ADD CONSTRAINT production_school_departments_parent_fk
    FOREIGN KEY (tenant_id, school_id, parent_department_id)
    REFERENCES production.school_departments (tenant_id, school_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT production_school_departments_head_staff_fk
    FOREIGN KEY (tenant_id, school_id, head_staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE SET NULL;

ALTER TABLE production.classes
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS academic_session_id UUID,
  ADD COLUMN IF NOT EXISTS grade_level TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS arm TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS room_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE production.classes
  ADD CONSTRAINT production_classes_department_fk
    FOREIGN KEY (tenant_id, school_id, department_id)
    REFERENCES production.school_departments (tenant_id, school_id, id) ON DELETE SET NULL,
  ADD CONSTRAINT production_classes_session_fk
    FOREIGN KEY (tenant_id, school_id, academic_session_id)
    REFERENCES production.academic_sessions (tenant_id, school_id, id) ON DELETE SET NULL;

-- =====================================================================
-- 2. STUDENT ADMINISTRATION, ADMISSIONS, MEDICAL & DIGITAL IDS
-- =====================================================================

DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'production'
      AND rel.relname = 'students'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%lifecycle_status%'
  LOOP
    EXECUTE format('ALTER TABLE production.students DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.students
  ADD CONSTRAINT production_students_lifecycle_status_check
    CHECK (lifecycle_status IN (
      'applicant', 'admitted', 'enrolled', 'active', 'suspended',
      'transferred', 'graduated', 'withdrawn', 'legacy_unverified'
    )),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS state_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS lga_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS residential_address TEXT,
  ADD COLUMN IF NOT EXISTS previous_school_history JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(previous_school_history) = 'array'),
  ADD COLUMN IF NOT EXISTS academic_history_summary JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(academic_history_summary) = 'object'),
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(emergency_contacts) = 'array'),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rfid_card_uid TEXT,
  ADD COLUMN IF NOT EXISTS digital_id_code TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'production_students_membership_user_fk'
  ) THEN
    ALTER TABLE production.students
      ADD CONSTRAINT production_students_membership_user_fk
      FOREIGN KEY (tenant_id, user_id)
      REFERENCES production.memberships (tenant_id, user_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS production_students_user_uq
  ON production.students (tenant_id, school_id, user_id)
  WHERE user_id IS NOT NULL;

DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'production'
      AND rel.relname = 'student_lifecycle_events'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE production.student_lifecycle_events DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.student_lifecycle_events
  ADD CONSTRAINT production_student_lifecycle_event_type_check
    CHECK (event_type IN (
      'registered', 'admitted', 'enrolled', 'activated', 'suspended',
      'class_assigned', 'class_changed', 'promoted', 'internal_transfer',
      'external_transfer', 'graduated', 'withdrawn', 'reinstated',
      'profile_updated', 'medical_updated', 'guardian_linked', 'id_card_issued'
    ));

CREATE TABLE production.student_admissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  application_number TEXT NOT NULL CHECK (length(trim(application_number)) BETWEEN 3 AND 64),
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 100),
  last_name TEXT NOT NULL CHECK (length(trim(last_name)) BETWEEN 1 AND 100),
  middle_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  target_grade_level TEXT NOT NULL CHECK (length(trim(target_grade_level)) BETWEEN 1 AND 60),
  target_class_id UUID,
  academic_session_id UUID,
  previous_school_name TEXT,
  previous_class TEXT,
  guardian_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(guardian_summary) = 'object'),
  documents JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(documents) = 'array'),
  review_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled')),
  reviewed_by UUID REFERENCES production.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES production.users(id),
  approved_at TIMESTAMPTZ,
  enrolled_student_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, application_number),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, target_class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id, academic_session_id)
    REFERENCES production.academic_sessions (tenant_id, school_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id, enrolled_student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE SET NULL
);
CREATE INDEX production_student_admissions_status_idx
  ON production.student_admissions (tenant_id, school_id, status, submitted_at DESC);

CREATE TABLE production.student_medical_profiles (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  blood_group TEXT CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  genotype TEXT CHECK (genotype IS NULL OR genotype IN ('AA', 'AS', 'SS', 'AC', 'SC', 'unknown')),
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allergies) = 'array'),
  chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(chronic_conditions) = 'array'),
  immunization_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(immunization_summary) = 'object'),
  dietary_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(dietary_restrictions) = 'array'),
  physician_name TEXT,
  physician_phone TEXT,
  medical_notes TEXT,
  consent_for_emergency_care BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, student_id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE
);

CREATE TABLE production.student_digital_id_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  card_number TEXT NOT NULL CHECK (length(trim(card_number)) BETWEEN 3 AND 64),
  qr_token_hash BYTEA NOT NULL,
  issued_by UUID NOT NULL REFERENCES production.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, card_number),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE,
  CHECK (expires_at > issued_at)
);
CREATE UNIQUE INDEX production_student_active_digital_id_uq
  ON production.student_digital_id_cards (tenant_id, school_id, student_id)
  WHERE status = 'active';

-- =====================================================================
-- 3. INSTITUTIONAL GUARDIAN & PARENT MANAGEMENT
-- =====================================================================

CREATE TABLE production.guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  user_id UUID,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 160),
  email TEXT,
  phone TEXT NOT NULL CHECK (length(trim(phone)) BETWEEN 3 AND 40),
  alternate_phone TEXT,
  occupation TEXT,
  residential_address TEXT,
  identity_document_type TEXT,
  identity_reference_hash BYTEA,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_by UUID REFERENCES production.users(id),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX production_guardians_linked_user_uq
  ON production.guardians (tenant_id, school_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX production_guardians_school_name_idx
  ON production.guardians (tenant_id, school_id, lower(full_name));

CREATE TABLE production.student_guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  guardian_id UUID NOT NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('mother', 'father', 'legal_guardian', 'sponsor', 'sibling', 'other')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_financial_sponsor BOOLEAN NOT NULL DEFAULT false,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT true,
  authorized_pickup BOOLEAN NOT NULL DEFAULT true,
  can_view_academic_records BOOLEAN NOT NULL DEFAULT true,
  can_view_medical_summary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  linked_by UUID REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, student_id, guardian_id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, guardian_id)
    REFERENCES production.guardians (tenant_id, school_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX production_student_primary_guardian_uq
  ON production.student_guardians (tenant_id, school_id, student_id)
  WHERE is_primary = true AND status = 'active';

-- =====================================================================
-- 4. STAFF ADMINISTRATION, ALLOCATIONS & SEPARATION HISTORY
-- =====================================================================

DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'production'
      AND rel.relname = 'staff'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE production.staff DROP CONSTRAINT %I', c_name);
  END LOOP;
END $$;

ALTER TABLE production.staff
  ADD CONSTRAINT production_staff_status_check
    CHECK (status IN ('active', 'on_leave', 'suspended', 'retired', 'departed')),
  ADD COLUMN IF NOT EXISTS staff_category TEXT NOT NULL DEFAULT 'teaching'
    CHECK (staff_category IN ('teaching', 'administrative', 'support', 'executive')),
  ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'visiting')),
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS certifications JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(certifications) = 'array'),
  ADD COLUMN IF NOT EXISTS trcn_number TEXT,
  ADD COLUMN IF NOT EXISTS trcn_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_id TEXT,
  ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER NOT NULL DEFAULT 24
    CHECK (max_periods_per_week BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS separated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS separation_reason TEXT,
  ADD COLUMN IF NOT EXISTS specialization_notes TEXT;

CREATE TABLE production.staff_subject_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  academic_session_id UUID,
  subject_code TEXT NOT NULL CHECK (length(trim(subject_code)) BETWEEN 1 AND 64),
  subject_name TEXT NOT NULL CHECK (length(trim(subject_name)) BETWEEN 1 AND 160),
  class_id UUID,
  periods_per_week INTEGER NOT NULL DEFAULT 4 CHECK (periods_per_week BETWEEN 1 AND 40),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  assigned_by UUID REFERENCES production.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, academic_session_id)
    REFERENCES production.academic_sessions (tenant_id, school_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX production_staff_active_subject_allocation_uq
  ON production.staff_subject_allocations (tenant_id, school_id, staff_id, subject_code, class_id)
  WHERE status = 'active' AND class_id IS NOT NULL;

CREATE TABLE production.staff_separation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL CHECK (to_status IN ('active', 'on_leave', 'suspended', 'retired', 'departed')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE CASCADE
);

-- =====================================================================
-- 5. CENTRAL IAM: MEMBER INVITATIONS, MFA, OIDC PKCE & SESSION META
-- =====================================================================

CREATE TABLE production.member_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 160),
  email TEXT NOT NULL CHECK (length(trim(email)) BETWEEN 3 AND 254),
  intended_role_code TEXT NOT NULL REFERENCES production.roles(code)
    CHECK (intended_role_code <> 'super_admin'),
  department_id UUID,
  staff_id UUID,
  guardian_id UUID,
  token_hash BYTEA NOT NULL UNIQUE,
  token_version INTEGER NOT NULL DEFAULT 1 CHECK (token_version > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES production.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_by UUID REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, department_id)
    REFERENCES production.school_departments (tenant_id, school_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id, guardian_id)
    REFERENCES production.guardians (tenant_id, school_id, id) ON DELETE SET NULL
);
CREATE INDEX production_member_invitations_pending_idx
  ON production.member_invitations (tenant_id, school_id, status, expires_at);

CREATE TABLE production.user_mfa_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES production.users(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL DEFAULT 'totp' CHECK (factor_type IN ('totp')),
  friendly_name TEXT NOT NULL DEFAULT 'Authenticator App',
  secret_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, user_id, id)
);
CREATE UNIQUE INDEX production_user_mfa_active_totp_uq
  ON production.user_mfa_factors (tenant_id, user_id, factor_type)
  WHERE status = 'verified';

CREATE TABLE production.mfa_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  factor_id UUID NOT NULL,
  challenge_purpose TEXT NOT NULL DEFAULT 'login' CHECK (challenge_purpose IN ('login', 'step_up')),
  token_hash BYTEA NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id, factor_id)
    REFERENCES production.user_mfa_factors (tenant_id, user_id, id) ON DELETE CASCADE,
  CHECK (expires_at > created_at)
);

CREATE TABLE production.oidc_auth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google')),
  state_hash BYTEA NOT NULL UNIQUE,
  pkce_verifier_encrypted TEXT NOT NULL,
  nonce TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (expires_at > created_at)
);

ALTER TABLE production.user_sessions
  ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'password'
    CHECK (auth_method IN ('password', 'google_oidc', 'invitation', 'mfa_verified')),
  ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- =====================================================================
-- 6. PROVISIONING WORKFLOW STEPS & APPLICATION TEMPLATES CATALOG
-- =====================================================================

CREATE TABLE production.school_provisioning_workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES production.school_provisioning_operations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE SET NULL,
  school_id UUID,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  step_code TEXT NOT NULL CHECK (length(trim(step_code)) BETWEEN 1 AND 64),
  step_name TEXT NOT NULL CHECK (length(trim(step_name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (operation_id, step_code),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX production_provisioning_steps_op_idx
  ON production.school_provisioning_workflow_steps (operation_id, step_order);

ALTER TABLE production.application_instances
  ADD COLUMN IF NOT EXISTS instance_type TEXT NOT NULL DEFAULT 'single_school',
  ADD COLUMN IF NOT EXISTS storage_choice TEXT NOT NULL DEFAULT 'managed_cloud';

CREATE TABLE production.application_templates (
  template_id TEXT NOT NULL CHECK (length(trim(template_id)) BETWEEN 1 AND 80),
  template_version TEXT NOT NULL CHECK (length(trim(template_version)) BETWEEN 1 AND 32),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'school_erp',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
  provisionable BOOLEAN NOT NULL DEFAULT false,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(capabilities) = 'array'),
  default_features JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(default_features) = 'array'),
  configuration_schema JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuration_schema) = 'object'),
  default_configuration JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(default_configuration) = 'object'),
  upgrade_compatibility JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(upgrade_compatibility) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, template_version)
);

INSERT INTO production.application_templates (
  template_id, template_version, display_name, description, category,
  status, provisionable, capabilities, default_features,
  configuration_schema, default_configuration, upgrade_compatibility
) VALUES
  (
    'school-standard', '1',
    'Curriculum Flow Standard School ERP',
    'Complete institutional identity, student lifecycle, guardians, faculty, timetable, assessments, and central shared curriculum/textbook access.',
    'school_erp', 'active', true,
    '["school_identity","student_administration","class_administration","staff_administration","student_lifecycle","guardian_management","central_iam"]'::jsonb,
    '["feat_nerdc_curriculum","feat_lesson_plans","feat_school_administration","feat_cbt_examinations"]'::jsonb,
    '{"type":"object","properties":{"academicSession":{"type":"string"},"currency":{"type":"string"},"timeZone":{"type":"string"}}}'::jsonb,
    '{"academicSession":"2026/2027 Session","currency":"NGN","timeZone":"Africa/Lagos"}'::jsonb,
    '{"compatibleFrom":[],"notes":"Production standard K-12 school template"}'::jsonb
  ),
  (
    'school_administration_identity', '1.0.0',
    'School Administration & Identity Foundation',
    'Core institutional directory, student lifecycle, guardian linking, staff directory, and tenant RBAC foundation.',
    'administration_core', 'active', true,
    '["school_identity","student_administration","class_administration","staff_administration","student_lifecycle","administrative_permissions","central_iam"]'::jsonb,
    '["feat_school_administration"]'::jsonb,
    '{"type":"object","properties":{"studentGenderPolicy":{"type":"string","enum":["optional","required","not_collected"]}},"required":["studentGenderPolicy"]}'::jsonb,
    '{"studentGenderPolicy":"optional"}'::jsonb,
    '{"compatibleFrom":["0.1.0"],"notes":"Promoted to production-ready administration foundation"}'::jsonb
  )
ON CONFLICT (template_id, template_version) DO NOTHING;

-- =====================================================================
-- 7. GRANULAR PERMISSIONS & ROLE GRANTS FOR PROMPT 1 SUITE
-- =====================================================================

INSERT INTO production.permissions (code, description) VALUES
  ('students.medical.read', 'Read restricted student medical profiles'),
  ('students.medical.manage', 'Create and update restricted student medical profiles'),
  ('admissions.read', 'Read student admission applications'),
  ('admissions.manage', 'Review, approve, reject, and enroll student admission applications'),
  ('guardians.read', 'Read guardian directory and student-guardian links'),
  ('guardians.manage', 'Create, update, and link guardian records'),
  ('guardians.verify', 'Verify or suspend guardian identities'),
  ('departments.read', 'Read school departments and academic units'),
  ('departments.manage', 'Create and manage school departments and unit leadership'),
  ('sessions.read', 'Read academic sessions and terms'),
  ('sessions.manage', 'Create and activate academic sessions and terms'),
  ('audit.read', 'Read tenant-scoped institutional audit events'),
  ('identity.sessions.manage', 'Inspect and revoke active user sessions'),
  ('identity.mfa.manage', 'Enroll and manage multi-factor authentication factors')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES
  ('tenant_admin', 'students.medical.read'),
  ('tenant_admin', 'students.medical.manage'),
  ('tenant_admin', 'admissions.read'),
  ('tenant_admin', 'admissions.manage'),
  ('tenant_admin', 'guardians.read'),
  ('tenant_admin', 'guardians.manage'),
  ('tenant_admin', 'guardians.verify'),
  ('tenant_admin', 'departments.read'),
  ('tenant_admin', 'departments.manage'),
  ('tenant_admin', 'sessions.read'),
  ('tenant_admin', 'sessions.manage'),
  ('tenant_admin', 'audit.read'),
  ('tenant_admin', 'identity.sessions.manage'),
  ('tenant_admin', 'identity.mfa.manage'),
  ('proprietor', 'students.medical.read'),
  ('proprietor', 'admissions.read'),
  ('proprietor', 'admissions.manage'),
  ('proprietor', 'guardians.read'),
  ('proprietor', 'guardians.manage'),
  ('proprietor', 'guardians.verify'),
  ('proprietor', 'departments.read'),
  ('proprietor', 'departments.manage'),
  ('proprietor', 'sessions.read'),
  ('proprietor', 'sessions.manage'),
  ('proprietor', 'audit.read'),
  ('proprietor', 'identity.sessions.manage'),
  ('proprietor', 'identity.mfa.manage'),
  ('principal', 'students.medical.read'),
  ('principal', 'students.medical.manage'),
  ('principal', 'admissions.read'),
  ('principal', 'admissions.manage'),
  ('principal', 'guardians.read'),
  ('principal', 'guardians.manage'),
  ('principal', 'guardians.verify'),
  ('principal', 'departments.read'),
  ('principal', 'departments.manage'),
  ('principal', 'sessions.read'),
  ('principal', 'sessions.manage'),
  ('principal', 'audit.read'),
  ('principal', 'identity.sessions.manage'),
  ('principal', 'identity.mfa.manage'),
  ('principal_administrator', 'admissions.read'),
  ('principal_administrator', 'admissions.manage'),
  ('principal_administrator', 'guardians.read'),
  ('principal_administrator', 'guardians.manage'),
  ('principal_administrator', 'departments.read'),
  ('principal_administrator', 'departments.manage'),
  ('principal_administrator', 'sessions.read'),
  ('principal_administrator', 'sessions.manage'),
  ('principal_administrator', 'audit.read'),
  ('principal_administrator', 'identity.mfa.manage'),
  ('vice_principal_academic', 'admissions.read'),
  ('vice_principal_academic', 'departments.read'),
  ('vice_principal_academic', 'departments.manage'),
  ('vice_principal_academic', 'sessions.read'),
  ('vice_principal_academic', 'sessions.manage'),
  ('vice_principal_academic', 'identity.mfa.manage'),
  ('vice_principal_administration', 'admissions.read'),
  ('vice_principal_administration', 'admissions.manage'),
  ('vice_principal_administration', 'guardians.read'),
  ('vice_principal_administration', 'guardians.manage'),
  ('vice_principal_administration', 'guardians.verify'),
  ('vice_principal_administration', 'departments.read'),
  ('vice_principal_administration', 'departments.manage'),
  ('vice_principal_administration', 'sessions.read'),
  ('vice_principal_administration', 'audit.read'),
  ('vice_principal_administration', 'identity.mfa.manage'),
  ('dean_student_affairs', 'students.medical.read'),
  ('dean_student_affairs', 'students.medical.manage'),
  ('dean_student_affairs', 'guardians.read'),
  ('dean_student_affairs', 'guardians.manage'),
  ('dean_student_affairs', 'departments.read'),
  ('dean_student_affairs', 'sessions.read'),
  ('administrative_assistant', 'admissions.read'),
  ('administrative_assistant', 'guardians.read'),
  ('administrative_assistant', 'guardians.manage'),
  ('administrative_assistant', 'departments.read'),
  ('administrative_assistant', 'sessions.read'),
  ('ict_system_administrator', 'departments.read'),
  ('ict_system_administrator', 'sessions.read'),
  ('ict_system_administrator', 'audit.read'),
  ('ict_system_administrator', 'identity.sessions.manage'),
  ('ict_system_administrator', 'identity.mfa.manage'),
  ('staff', 'departments.read'),
  ('staff', 'sessions.read'),
  ('staff', 'identity.mfa.manage'),
  ('teacher', 'departments.read'),
  ('teacher', 'sessions.read'),
  ('teacher', 'identity.mfa.manage'),
  ('subject_teacher', 'departments.read'),
  ('subject_teacher', 'sessions.read'),
  ('subject_teacher', 'identity.mfa.manage'),
  ('parent', 'membership.read'),
  ('parent', 'sessions.read'),
  ('parent', 'guardians.read'),
  ('parent', 'identity.mfa.manage'),
  ('student', 'membership.read'),
  ('student', 'sessions.read'),
  ('student', 'identity.mfa.manage'),
  ('read_only', 'departments.read'),
  ('read_only', 'sessions.read')
) AS grants(role_code, permission_code)
WHERE EXISTS (SELECT 1 FROM production.roles r WHERE r.code = grants.role_code)
  AND EXISTS (SELECT 1 FROM production.permissions p WHERE p.code = grants.permission_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- =====================================================================
-- 8. FORCED ROW-LEVEL SECURITY ON ALL NEW TABLES & INVITATION ACCESS
-- =====================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Standard tenant-isolated tables
  FOREACH tbl IN ARRAY ARRAY[
    'production.school_status_history',
    'production.academic_sessions',
    'production.academic_terms',
    'production.student_admissions',
    'production.student_medical_profiles',
    'production.student_digital_id_cards',
    'production.guardians',
    'production.student_guardians',
    'production.staff_subject_allocations',
    'production.staff_separation_history',
    'production.member_invitations'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY %I_tenant_isolation ON %s
      FOR ALL
      USING (
        production.is_verified_control_plane_context()
        OR tenant_id::text = production.current_tenant_id()::text
      )
      WITH CHECK (
        production.is_verified_control_plane_context()
        OR tenant_id::text = production.current_tenant_id()::text
      )', replace(tbl, 'production.', ''), tbl);
    EXECUTE format(
      'CREATE TRIGGER prevent_tenant_id_change
       BEFORE UPDATE OF tenant_id ON %s
       FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_column_change()',
      tbl
    );
  END LOOP;

  -- Tables accessed both during pre-session login and inside tenant sessions
  FOREACH tbl IN ARRAY ARRAY[
    'production.user_mfa_factors',
    'production.mfa_challenges',
    'production.oidc_auth_states'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY %I_tenant_or_login_isolation ON %s
      FOR ALL
      USING (
        production.is_verified_control_plane_context()
        OR tenant_id::text = coalesce(
          production.current_tenant_id(),
          production.current_login_tenant_id()
        )::text
      )
      WITH CHECK (
        production.is_verified_control_plane_context()
        OR tenant_id::text = coalesce(
          production.current_tenant_id(),
          production.current_login_tenant_id()
        )::text
      )', replace(tbl, 'production.', ''), tbl);
    EXECUTE format(
      'CREATE TRIGGER prevent_tenant_id_change
       BEFORE UPDATE OF tenant_id ON %s
       FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_column_change()',
      tbl
    );
  END LOOP;
END $$;

-- Invitation-token lookup & user creation policies for general member_invitations
CREATE POLICY member_invitation_token_lookup ON production.member_invitations
  FOR SELECT
  USING (token_hash = production.current_invitation_token_hash());

CREATE POLICY member_invitation_token_accept ON production.member_invitations
  FOR UPDATE
  USING (token_hash = production.current_invitation_token_hash())
  WITH CHECK (token_hash = production.current_invitation_token_hash());

CREATE POLICY member_invitation_token_user_access ON production.users
  USING (
    lower(email) = (
      SELECT lower(inv.email)
      FROM production.member_invitations inv
      WHERE inv.token_hash = production.current_invitation_token_hash()
        AND inv.status = 'pending'
        AND inv.expires_at > now()
      LIMIT 1
    )
  )
  WITH CHECK (
    lower(email) = (
      SELECT lower(inv.email)
      FROM production.member_invitations inv
      WHERE inv.token_hash = production.current_invitation_token_hash()
        AND inv.status = 'pending'
        AND inv.expires_at > now()
      LIMIT 1
    )
  );

-- Provisioning workflow steps: control-plane or owning tenant (nullable tenant_id during initial validation)
ALTER TABLE production.school_provisioning_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.school_provisioning_workflow_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY school_provisioning_workflow_steps_isolation ON production.school_provisioning_workflow_steps
  FOR ALL
  USING (
    production.is_verified_control_plane_context()
    OR (tenant_id IS NOT NULL AND tenant_id::text = production.current_tenant_id()::text)
  )
  WITH CHECK (
    production.is_verified_control_plane_context()
  );

-- Application templates: read-only catalog to tenants, managed by verified control-plane
ALTER TABLE production.application_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.application_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY application_templates_read_only ON production.application_templates
  FOR SELECT USING (true);
CREATE POLICY application_templates_control_plane_write ON production.application_templates
  FOR ALL
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());
