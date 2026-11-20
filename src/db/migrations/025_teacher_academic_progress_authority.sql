-- 025_teacher_academic_progress_authority.sql
-- Phase A: Teacher Academic Progress Authority & Evidence Integration
-- Establishes authenticated teacher-to-class-section-subject-curriculum-version assignments,
-- lesson note linkage (never counting as taught evidence), 6-stage teaching delivery workflow,
-- immutable delivery audit history, teacher-only versioned assessment scope authorizations,
-- assessment generation provenance, and Forced Row-Level Security across all tables.

-- 1. Authenticated Teacher -> School Instance -> Session/Term -> Class/Section -> Subject -> NERDC Curriculum Version
CREATE TABLE production.teacher_subject_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL CHECK (length(trim(academic_session)) BETWEEN 4 AND 40),
  term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term')),
  class_id UUID NOT NULL,
  class_grade_name TEXT NOT NULL CHECK (length(trim(class_grade_name)) BETWEEN 1 AND 80),
  section TEXT NOT NULL DEFAULT 'General' CHECK (length(trim(section)) BETWEEN 1 AND 80),
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL CHECK (length(trim(subject_name)) BETWEEN 1 AND 200),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revocation_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, teacher_user_id)
    REFERENCES production.memberships (tenant_id, user_id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE UNIQUE INDEX production_teacher_subject_assignments_active_uq
  ON production.teacher_subject_assignments (
    tenant_id, application_instance_id, academic_session, term, class_id, section, subject_id, teacher_user_id
  )
  WHERE status = 'active';

CREATE INDEX production_teacher_subject_assignments_teacher_idx
  ON production.teacher_subject_assignments (tenant_id, application_instance_id, teacher_user_id, status, academic_session, term);

-- 2. Lesson Notes (explicitly separated from taught confirmation)
CREATE TABLE production.lesson_note_records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL CHECK (length(trim(academic_session)) BETWEEN 4 AND 40),
  term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term')),
  class_id UUID NOT NULL,
  class_grade_name TEXT NOT NULL CHECK (length(trim(class_grade_name)) BETWEEN 1 AND 80),
  section TEXT NOT NULL DEFAULT 'General' CHECK (length(trim(section)) BETWEEN 1 AND 80),
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  topic_id TEXT REFERENCES production.curriculum_topics(id) ON DELETE RESTRICT,
  topic_title TEXT NOT NULL CHECK (length(trim(topic_title)) BETWEEN 1 AND 300),
  objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(objective_ids) = 'array'),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  note_content JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(note_content) = 'object'),
  generation_source TEXT NOT NULL DEFAULT 'teacher_authored'
    CHECK (generation_source IN ('teacher_authored', 'ai_gateway', 'imported')),
  ai_gateway_request_id UUID,
  counts_as_taught BOOLEAN NOT NULL DEFAULT false CHECK (counts_as_taught = false),
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id, assignment_id)
    REFERENCES production.teacher_subject_assignments (tenant_id, application_instance_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE CASCADE
);

CREATE INDEX production_lesson_note_records_assignment_idx
  ON production.lesson_note_records (tenant_id, application_instance_id, assignment_id, created_at DESC);

-- 3. Persistent 6-stage Teaching Delivery & Evidence Records
CREATE TABLE production.teaching_delivery_records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL CHECK (length(trim(academic_session)) BETWEEN 4 AND 40),
  term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term')),
  class_id UUID NOT NULL,
  class_grade_name TEXT NOT NULL CHECK (length(trim(class_grade_name)) BETWEEN 1 AND 80),
  section TEXT NOT NULL DEFAULT 'General' CHECK (length(trim(section)) BETWEEN 1 AND 80),
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  topic_id TEXT REFERENCES production.curriculum_topics(id) ON DELETE RESTRICT,
  topic_title_input TEXT NOT NULL CHECK (length(trim(topic_title_input)) BETWEEN 1 AND 300),
  resolved_topic_title TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'resolved'
    CHECK (resolution_status IN ('resolved', 'unresolved', 'manually_mapped')),
  resolution_notes TEXT,
  lesson_note_id UUID,
  week_number INTEGER NOT NULL DEFAULT 1 CHECK (week_number >= 1),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'received', 'opened', 'acknowledged', 'taught', 'completed')),
  received_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  taught_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_confirmed_by_teacher BOOLEAN NOT NULL DEFAULT false,
  completion_teacher_user_id UUID,
  completion_idempotency_key TEXT,
  coverage_mode TEXT NOT NULL DEFAULT 'full' CHECK (coverage_mode IN ('full', 'partial', 'none')),
  covered_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(covered_objective_ids) = 'array'),
  uncovered_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(uncovered_objective_ids) = 'array'),
  understanding_level TEXT CHECK (understanding_level IS NULL OR understanding_level IN ('excellent', 'good', 'fair', 'poor')),
  student_engagement TEXT CHECK (student_engagement IS NULL OR student_engagement IN ('high', 'medium', 'low')),
  remedial_needed BOOLEAN NOT NULL DEFAULT false,
  remedial_topic TEXT,
  teacher_comments TEXT NOT NULL DEFAULT '',
  challenges_noted TEXT,
  verification_basis TEXT NOT NULL DEFAULT 'teacher_self_reported'
    CHECK (verification_basis IN ('teacher_self_reported', 'admin_verified', 'peer_verified')),
  admin_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (admin_verification_status IN ('unverified', 'verified', 'flagged')),
  admin_verified_by UUID,
  admin_verified_at TIMESTAMPTZ,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version >= 1),
  used_in_assessment_count INTEGER NOT NULL DEFAULT 0 CHECK (used_in_assessment_count >= 0),
  correction_reason TEXT,
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id, assignment_id)
    REFERENCES production.teacher_subject_assignments (tenant_id, application_instance_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, lesson_note_id)
    REFERENCES production.lesson_note_records (tenant_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE CASCADE,
  CHECK (resolution_status = 'unresolved' OR topic_id IS NOT NULL),
  CHECK (
    status NOT IN ('taught', 'completed')
    OR (completion_confirmed_by_teacher = true AND completion_teacher_user_id IS NOT NULL AND taught_at IS NOT NULL)
  ),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE UNIQUE INDEX production_teaching_delivery_idempotency_uq
  ON production.teaching_delivery_records (tenant_id, application_instance_id, assignment_id, completion_idempotency_key)
  WHERE completion_idempotency_key IS NOT NULL;

CREATE INDEX production_teaching_delivery_scope_idx
  ON production.teaching_delivery_records (
    tenant_id, application_instance_id, academic_session, term, class_id, section, subject_id, status
  );

-- 4. Immutable Audit Ledger for Teaching Delivery Transitions, Corrections, Mappings, and Evidence Access
CREATE TABLE production.teaching_delivery_audit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  delivery_record_id UUID,
  assignment_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'assigned', 'received', 'opened', 'acknowledged', 'taught', 'completed',
    'corrected', 'curriculum_mapped', 'admin_verified', 'evidence_retrieved'
  )),
  record_version INTEGER NOT NULL DEFAULT 1,
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT,
  before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(before_snapshot) = 'object'),
  after_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(after_snapshot) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX production_teaching_delivery_audit_record_idx
  ON production.teaching_delivery_audit_history (tenant_id, application_instance_id, delivery_record_id, occurred_at DESC);

-- 5. Persistent Versioned Teacher-Only Assessment Scope Authorizations
CREATE TABLE production.assessment_scope_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  school_id UUID NOT NULL,
  academic_session TEXT NOT NULL CHECK (length(trim(academic_session)) BETWEEN 4 AND 40),
  term TEXT NOT NULL CHECK (term IN ('Term 1', 'Term 2', 'Term 3', 'First Term', 'Second Term', 'Third Term')),
  class_id UUID NOT NULL,
  class_grade_name TEXT NOT NULL CHECK (length(trim(class_grade_name)) BETWEEN 1 AND 80),
  section TEXT NOT NULL DEFAULT 'General' CHECK (length(trim(section)) BETWEEN 1 AND 80),
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  teacher_user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'quiz', 'class_test', 'test', 'continuous_assessment', 'assignment', 'midterm_exam', 'exam'
  )),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 300),
  scope_version INTEGER NOT NULL DEFAULT 1 CHECK (scope_version >= 1),
  supersedes_authorization_id UUID,
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized', 'superseded', 'revoked')),
  selected_topic_ids JSONB NOT NULL CHECK (jsonb_typeof(selected_topic_ids) = 'array' AND jsonb_array_length(selected_topic_ids) > 0),
  selected_objective_ids JSONB NOT NULL CHECK (jsonb_typeof(selected_objective_ids) = 'array' AND jsonb_array_length(selected_objective_ids) > 0),
  source_delivery_ids JSONB NOT NULL CHECK (jsonb_typeof(source_delivery_ids) = 'array' AND jsonb_array_length(source_delivery_ids) > 0),
  question_count INTEGER NOT NULL CHECK (question_count BETWEEN 1 AND 100),
  question_types_config JSONB NOT NULL DEFAULT '{"objective":5}'::jsonb CHECK (jsonb_typeof(question_types_config) = 'object'),
  objective_theory_balance JSONB NOT NULL DEFAULT '{"objectivePercent":100,"theoryPercent":0,"practicalPercent":0}'::jsonb
    CHECK (jsonb_typeof(objective_theory_balance) = 'object'),
  total_marks INTEGER NOT NULL CHECK (total_marks BETWEEN 1 AND 1000),
  difficulty_mix JSONB NOT NULL DEFAULT '{"Easy":30,"Medium":50,"Hard":20}'::jsonb CHECK (jsonb_typeof(difficulty_mix) = 'object'),
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 300),
  instructions TEXT NOT NULL DEFAULT '',
  scope_hash TEXT NOT NULL,
  authorized_by_teacher_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id, assignment_id)
    REFERENCES production.teacher_subject_assignments (tenant_id, application_instance_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, teacher_user_id)
    REFERENCES production.memberships (tenant_id, user_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE INDEX production_assessment_scope_authorizations_lookup_idx
  ON production.assessment_scope_authorizations (tenant_id, application_instance_id, assignment_id, status, scope_version DESC);

-- 6. Extend Assessment Blueprints non-destructively with optional scope authorization provenance
ALTER TABLE production.instance_assessment_blueprints
  ADD COLUMN IF NOT EXISTS scope_authorization_id UUID,
  ADD COLUMN IF NOT EXISTS selected_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_delivery_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS authorized_teacher_user_id UUID,
  ADD COLUMN IF NOT EXISTS academic_session TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instance_assessment_blueprints_scope_auth_fk'
  ) THEN
    ALTER TABLE production.instance_assessment_blueprints
      ADD CONSTRAINT instance_assessment_blueprints_scope_auth_fk
      FOREIGN KEY (tenant_id, application_instance_id, scope_authorization_id)
      REFERENCES production.assessment_scope_authorizations (tenant_id, application_instance_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Assessment Generation Provenance Ledger
CREATE TABLE production.assessment_generation_provenance (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  scope_authorization_id UUID NOT NULL,
  blueprint_id UUID,
  exam_configuration_id UUID,
  assignment_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  academic_session TEXT NOT NULL,
  term TEXT NOT NULL,
  class_id UUID NOT NULL,
  section TEXT NOT NULL DEFAULT 'General',
  subject_id TEXT NOT NULL,
  curriculum_version_id TEXT NOT NULL,
  verified_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(verified_topic_ids) = 'array'),
  verified_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(verified_objective_ids) = 'array'),
  source_delivery_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_delivery_ids) = 'array'),
  generated_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(generated_question_ids) = 'array'),
  ai_gateway_request_id UUID,
  provider_id TEXT,
  model_id TEXT,
  generation_status TEXT NOT NULL DEFAULT 'generated'
    CHECK (generation_status IN ('generated', 'insufficient_evidence', 'rejected')),
  rejection_reason TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id, scope_authorization_id)
    REFERENCES production.assessment_scope_authorizations (tenant_id, application_instance_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id, blueprint_id)
    REFERENCES production.instance_assessment_blueprints (tenant_id, application_instance_id, id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, application_instance_id, exam_configuration_id)
    REFERENCES production.instance_exam_configurations (tenant_id, application_instance_id, id) ON DELETE SET NULL
);

CREATE INDEX production_assessment_generation_provenance_scope_idx
  ON production.assessment_generation_provenance (tenant_id, application_instance_id, scope_authorization_id, created_at DESC);

-- 8. Phase A Permissions & Strict Teacher-Only Assessment Scope Role Grants
INSERT INTO production.permissions (code, description) VALUES
  ('teaching.assignments.manage', 'Create, update, and revoke teacher subject-class-curriculum assignments'),
  ('teaching.delivery.read', 'Read persistent teaching delivery records and subject progress'),
  ('teaching.delivery.manage', 'Create and progress teaching delivery records and lesson notes for assigned classes'),
  ('teaching.evidence.read', 'Read verified taught-topic evidence for authorized school operations'),
  ('assessments.scope.authorize', 'Authorize teacher-owned taught assessment scope specifications')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES
  ('tenant_admin', 'teaching.assignments.manage'),
  ('tenant_admin', 'teaching.delivery.read'),
  ('tenant_admin', 'teaching.evidence.read'),
  ('proprietor', 'teaching.delivery.read'),
  ('principal', 'teaching.assignments.manage'),
  ('principal', 'teaching.delivery.read'),
  ('principal', 'teaching.evidence.read'),
  ('principal_administrator', 'teaching.assignments.manage'),
  ('principal_administrator', 'teaching.delivery.read'),
  ('principal_administrator', 'teaching.evidence.read'),
  ('vice_principal_academic', 'teaching.assignments.manage'),
  ('vice_principal_academic', 'teaching.delivery.read'),
  ('vice_principal_academic', 'teaching.evidence.read'),
  ('academic_coordinator', 'teaching.assignments.manage'),
  ('academic_coordinator', 'teaching.delivery.read'),
  ('academic_coordinator', 'teaching.evidence.read'),
  ('department_head', 'teaching.delivery.read'),
  ('department_head', 'teaching.evidence.read'),
  ('examination_officer', 'teaching.delivery.read'),
  ('examination_officer', 'teaching.evidence.read'),
  ('teacher', 'teaching.delivery.read'),
  ('teacher', 'teaching.delivery.manage'),
  ('teacher', 'teaching.evidence.read'),
  ('teacher', 'assessments.manage'),
  ('teacher', 'assessments.scope.authorize'),
  ('teacher', 'ai.gateway.read'),
  ('teacher', 'ai.curriculum.generate'),
  ('teacher', 'ai.assessments.generate'),
  ('teacher', 'ai.cbt.generate'),
  ('teacher', 'ai.tutor.use'),
  ('teacher', 'shared.curriculum.consume'),
  ('subject_teacher', 'teaching.delivery.read'),
  ('subject_teacher', 'teaching.delivery.manage'),
  ('subject_teacher', 'teaching.evidence.read'),
  ('subject_teacher', 'assessments.manage'),
  ('subject_teacher', 'assessments.scope.authorize'),
  ('subject_teacher', 'ai.gateway.read'),
  ('subject_teacher', 'ai.curriculum.generate'),
  ('subject_teacher', 'ai.assessments.generate'),
  ('subject_teacher', 'ai.cbt.generate'),
  ('subject_teacher', 'ai.tutor.use'),
  ('subject_teacher', 'shared.curriculum.consume'),
  ('staff', 'teaching.delivery.read')
) AS grants(role_code, permission_code)
WHERE EXISTS (SELECT 1 FROM production.roles r WHERE r.code = grants.role_code)
  AND EXISTS (SELECT 1 FROM production.permissions p WHERE p.code = grants.permission_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 9. Forced Row-Level Security Across Every Phase A Table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'production.teacher_subject_assignments',
    'production.lesson_note_records',
    'production.teaching_delivery_records',
    'production.teaching_delivery_audit_history',
    'production.assessment_scope_authorizations',
    'production.assessment_generation_provenance'
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
  END LOOP;
END $$;
