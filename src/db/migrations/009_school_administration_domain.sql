-- School administration records and auditable student lifecycle.
-- This migration is forward-only and preserves existing production rows.

-- A school user can belong to more than one tenant, but each tenant/user pair
-- is unique and can be referenced by a staff profile.
CREATE UNIQUE INDEX production_memberships_tenant_user_uq
  ON production.memberships (tenant_id, user_id);

CREATE TABLE production.school_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, code),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  user_id UUID,
  department_id UUID,
  staff_number TEXT NOT NULL CHECK (length(trim(staff_number)) BETWEEN 1 AND 64),
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 100),
  last_name TEXT NOT NULL CHECK (length(trim(last_name)) BETWEEN 1 AND 100),
  email TEXT,
  designation TEXT NOT NULL CHECK (length(trim(designation)) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'departed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, staff_number),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, department_id)
    REFERENCES production.school_departments (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id)
);
CREATE UNIQUE INDEX production_staff_linked_user_uq
  ON production.staff (tenant_id, school_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX production_staff_school_name_idx
  ON production.staff (tenant_id, school_id, lower(last_name), lower(first_name));

CREATE TABLE production.staff_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  role_code TEXT NOT NULL REFERENCES production.roles(code),
  responsibility_scope JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(responsibility_scope) = 'object'),
  appointed_by UUID NOT NULL,
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, staff_id)
    REFERENCES production.staff (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (appointed_by) REFERENCES production.users (id),
  FOREIGN KEY (revoked_by) REFERENCES production.users (id),
  CHECK (ends_at IS NULL OR ends_at > appointed_at)
);
CREATE UNIQUE INDEX production_staff_active_appointment_uq
  ON production.staff_appointments (tenant_id, staff_id, role_code)
  WHERE revoked_at IS NULL;

ALTER TABLE production.classes
  ADD COLUMN section TEXT NOT NULL DEFAULT 'General'
    CHECK (length(trim(section)) BETWEEN 1 AND 80),
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived'));
CREATE UNIQUE INDEX production_classes_tenant_school_id_uq
  ON production.classes (tenant_id, school_id, id);

ALTER TABLE production.classes
  ADD COLUMN class_teacher_staff_id UUID;
ALTER TABLE production.classes
  ADD CONSTRAINT production_classes_teacher_fk
    FOREIGN KEY (tenant_id, school_id, class_teacher_staff_id)
    REFERENCES production.staff (tenant_id, school_id, id);

ALTER TABLE production.students
  ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'legacy_unverified'
    CHECK (lifecycle_status IN (
      'applicant', 'admitted', 'active', 'transferred', 'graduated',
      'withdrawn', 'legacy_unverified'
    )),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX production_students_tenant_school_id_uq
  ON production.students (tenant_id, school_id, id);

ALTER TABLE production.students
  DROP CONSTRAINT IF EXISTS production_students_tenant_id_class_id_fkey,
  ADD CONSTRAINT production_students_class_same_school_fk
    FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id);

CREATE TABLE production.student_class_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id),
  FOREIGN KEY (assigned_by) REFERENCES production.users (id),
  FOREIGN KEY (ended_by) REFERENCES production.users (id),
  CHECK (ended_at IS NULL OR ended_at > assigned_at)
);
CREATE UNIQUE INDEX production_student_active_class_uq
  ON production.student_class_assignments (tenant_id, student_id)
  WHERE ended_at IS NULL;
CREATE INDEX production_student_class_register_idx
  ON production.student_class_assignments (tenant_id, school_id, class_id, assigned_at DESC);

CREATE TABLE production.student_lifecycle_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'registered', 'admitted', 'activated', 'class_assigned', 'class_changed',
    'promoted', 'internal_transfer', 'external_transfer', 'graduated',
    'withdrawn', 'reinstated'
  )),
  from_status TEXT,
  to_status TEXT,
  from_class_id UUID,
  to_class_id UUID,
  actor_user_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES production.users (id),
  FOREIGN KEY (tenant_id, school_id, from_class_id)
    REFERENCES production.classes (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, to_class_id)
    REFERENCES production.classes (tenant_id, school_id, id)
);
CREATE INDEX production_student_lifecycle_history_idx
  ON production.student_lifecycle_events (tenant_id, school_id, student_id, occurred_at DESC);

CREATE TABLE production.school_role_appointments (
  legacy_role TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('school', 'platform')),
  role_code TEXT REFERENCES production.roles(code),
  CHECK (
    (scope = 'school' AND role_code IS NOT NULL) OR
    (scope = 'platform' AND role_code IS NULL)
  )
);

INSERT INTO production.permissions (code, description) VALUES
  ('school.profile.update', 'Update school profile information'),
  ('students.create', 'Register a student'),
  ('students.update', 'Update student information'),
  ('students.admit', 'Approve a student admission'),
  ('students.transfer', 'Transfer a student'),
  ('students.promote', 'Promote a student'),
  ('students.graduate', 'Graduate a student'),
  ('classes.create', 'Create class groups'),
  ('classes.update', 'Update class groups'),
  ('staff.create', 'Create staff records'),
  ('staff.update', 'Update staff records'),
  ('staff.appoint', 'Appoint staff to school responsibilities'),
  ('identity.invite', 'Invite school members'),
  ('identity.manage', 'Manage school accounts and memberships'),
  ('permissions.manage', 'Manage school role permissions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.roles (code, description, system_role) VALUES
  ('proprietor', 'School proprietor or owner', true),
  ('principal', 'School principal', true),
  ('principal_administrator', 'Principal administrator', true),
  ('vice_principal_academic', 'Vice principal for academics', true),
  ('vice_principal_administration', 'Vice principal for administration', true),
  ('academic_coordinator', 'Academic coordinator', true),
  ('administrative_assistant', 'Administrative assistant', true),
  ('department_head', 'Department head', true),
  ('examination_officer', 'Examination officer', true),
  ('bursar', 'School bursar', true),
  ('dean_student_affairs', 'Dean of student affairs', true),
  ('ict_system_administrator', 'School ICT system administrator', true),
  ('ict_technician', 'School ICT technician', true),
  ('teacher', 'School teacher', true),
  ('subject_teacher', 'Subject teacher', true),
  ('student', 'Student account', true),
  ('parent', 'Parent account', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.school_role_appointments (legacy_role, scope, role_code) VALUES
  ('proprietor', 'school', 'proprietor'),
  ('principal', 'school', 'principal'),
  ('principal_admin', 'school', 'principal_administrator'),
  ('vice_principal_academic', 'school', 'vice_principal_academic'),
  ('vice_principal_admin', 'school', 'vice_principal_administration'),
  ('academic_coordinator', 'school', 'academic_coordinator'),
  ('admin_assistant', 'school', 'administrative_assistant'),
  ('administrative_assistant', 'school', 'administrative_assistant'),
  ('hod', 'school', 'department_head'),
  ('hod_sciences', 'school', 'department_head'),
  ('hod_arts', 'school', 'department_head'),
  ('exam_officer', 'school', 'examination_officer'),
  ('bursar_finance', 'school', 'bursar'),
  ('dean_student_affairs', 'school', 'dean_student_affairs'),
  ('ict_system_admin', 'school', 'ict_system_administrator'),
  ('ict_technician', 'school', 'ict_technician'),
  ('teacher', 'school', 'teacher'),
  ('subject_teacher', 'school', 'subject_teacher'),
  ('student', 'school', 'student'),
  ('parent', 'school', 'parent'),
  ('super_admin', 'platform', NULL);

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES
  ('proprietor', 'school.profile.read'),
  ('proprietor', 'school.profile.update'),
  ('proprietor', 'school.configuration.read'),
  ('proprietor', 'school.configuration.manage'),
  ('proprietor', 'students.read'),
  ('proprietor', 'students.create'),
  ('proprietor', 'students.update'),
  ('proprietor', 'students.admit'),
  ('proprietor', 'students.transfer'),
  ('proprietor', 'students.promote'),
  ('proprietor', 'students.graduate'),
  ('proprietor', 'classes.read'),
  ('proprietor', 'classes.create'),
  ('proprietor', 'classes.update'),
  ('proprietor', 'staff.read'),
  ('proprietor', 'staff.create'),
  ('proprietor', 'staff.update'),
  ('proprietor', 'staff.appoint'),
  ('proprietor', 'identity.invite'),
  ('proprietor', 'identity.manage'),
  ('proprietor', 'membership.roles.assign'),
  ('proprietor', 'permissions.manage'),
  ('principal', 'school.profile.read'),
  ('principal', 'school.profile.update'),
  ('principal', 'school.configuration.read'),
  ('principal', 'school.configuration.manage'),
  ('principal', 'students.read'),
  ('principal', 'students.create'),
  ('principal', 'students.update'),
  ('principal', 'students.admit'),
  ('principal', 'students.transfer'),
  ('principal', 'students.promote'),
  ('principal', 'students.graduate'),
  ('principal', 'classes.read'),
  ('principal', 'classes.create'),
  ('principal', 'classes.update'),
  ('principal', 'staff.read'),
  ('principal', 'staff.create'),
  ('principal', 'staff.update'),
  ('principal', 'staff.appoint'),
  ('principal', 'identity.invite'),
  ('principal', 'identity.manage'),
  ('principal', 'membership.roles.assign'),
  ('principal_administrator', 'school.profile.read'),
  ('principal_administrator', 'students.read'),
  ('principal_administrator', 'students.create'),
  ('principal_administrator', 'students.update'),
  ('principal_administrator', 'students.admit'),
  ('principal_administrator', 'students.transfer'),
  ('principal_administrator', 'students.promote'),
  ('principal_administrator', 'students.graduate'),
  ('principal_administrator', 'classes.read'),
  ('principal_administrator', 'classes.create'),
  ('principal_administrator', 'classes.update'),
  ('principal_administrator', 'staff.read'),
  ('principal_administrator', 'staff.create'),
  ('principal_administrator', 'staff.update'),
  ('principal_administrator', 'identity.invite'),
  ('vice_principal_academic', 'school.profile.read'),
  ('vice_principal_academic', 'students.read'),
  ('vice_principal_academic', 'students.update'),
  ('vice_principal_academic', 'students.promote'),
  ('vice_principal_academic', 'students.graduate'),
  ('vice_principal_academic', 'classes.read'),
  ('vice_principal_academic', 'classes.create'),
  ('vice_principal_academic', 'classes.update'),
  ('vice_principal_administration', 'school.profile.read'),
  ('vice_principal_administration', 'students.read'),
  ('vice_principal_administration', 'students.create'),
  ('vice_principal_administration', 'students.update'),
  ('vice_principal_administration', 'students.admit'),
  ('vice_principal_administration', 'students.transfer'),
  ('vice_principal_administration', 'classes.read'),
  ('vice_principal_administration', 'staff.read'),
  ('vice_principal_administration', 'staff.create'),
  ('vice_principal_administration', 'staff.update'),
  ('vice_principal_administration', 'staff.appoint'),
  ('academic_coordinator', 'school.profile.read'),
  ('academic_coordinator', 'students.read'),
  ('academic_coordinator', 'students.promote'),
  ('academic_coordinator', 'classes.read'),
  ('academic_coordinator', 'classes.update'),
  ('administrative_assistant', 'school.profile.read'),
  ('administrative_assistant', 'students.read'),
  ('administrative_assistant', 'students.create'),
  ('administrative_assistant', 'students.update'),
  ('administrative_assistant', 'classes.read'),
  ('administrative_assistant', 'staff.read'),
  ('department_head', 'school.profile.read'),
  ('department_head', 'students.read'),
  ('department_head', 'classes.read'),
  ('department_head', 'staff.read'),
  ('examination_officer', 'school.profile.read'),
  ('examination_officer', 'students.read'),
  ('examination_officer', 'classes.read'),
  ('bursar', 'school.profile.read'),
  ('bursar', 'students.read'),
  ('bursar', 'classes.read'),
  ('dean_student_affairs', 'school.profile.read'),
  ('dean_student_affairs', 'students.read'),
  ('dean_student_affairs', 'students.update'),
  ('dean_student_affairs', 'classes.read'),
  ('ict_system_administrator', 'school.profile.read'),
  ('ict_system_administrator', 'identity.invite'),
  ('ict_system_administrator', 'identity.manage'),
  ('ict_technician', 'school.profile.read'),
  ('teacher', 'school.profile.read'),
  ('teacher', 'students.read'),
  ('teacher', 'classes.read'),
  ('subject_teacher', 'school.profile.read'),
  ('subject_teacher', 'students.read'),
  ('subject_teacher', 'classes.read'),
  ('student', 'school.profile.read'),
  ('parent', 'school.profile.read')
) AS role_grants(role_code, permission_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code IN (
  'school.profile.update', 'students.create', 'students.update',
  'students.admit', 'students.transfer', 'students.promote',
  'students.graduate', 'classes.create', 'classes.update',
  'staff.create', 'staff.update', 'staff.appoint',
  'identity.invite', 'identity.manage', 'permissions.manage'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- User records are global identities; suspension is global and must revoke
-- active sessions without changing school-specific memberships.
ALTER TABLE production.users
  ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended')),
  ADD COLUMN account_status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE FUNCTION production.revoke_sessions_on_account_suspension()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_status = 'suspended' AND OLD.account_status <> 'suspended' THEN
    UPDATE production.user_sessions
    SET revoked_at = now(), revoked_reason = 'account_suspended'
    WHERE user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_account_suspension_revokes_sessions
  AFTER UPDATE OF account_status ON production.users
  FOR EACH ROW EXECUTE FUNCTION production.revoke_sessions_on_account_suspension();

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.school_departments',
    'production.staff',
    'production.staff_appointments',
    'production.student_class_assignments',
    'production.student_lifecycle_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
  DROP POLICY tenant_isolation ON production.classes;
  CREATE POLICY tenant_isolation ON production.classes
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  DROP POLICY tenant_isolation ON production.students;
  CREATE POLICY tenant_isolation ON production.students
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  ALTER TABLE production.school_role_appointments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE production.school_role_appointments FORCE ROW LEVEL SECURITY;
  CREATE POLICY reference_read_only ON production.school_role_appointments
    FOR SELECT USING (true);
END $$;
