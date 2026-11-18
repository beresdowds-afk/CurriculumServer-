import type {
  CreateSchoolClassRequest,
  CreateSchoolStudentRequest,
  CreateSchoolStaffRequest,
  UpdateSchoolClassRequest,
  UpdateSchoolStaffRequest,
  UpdateSchoolStudentRequest
} from '../../packages/shared-types/src/apiContracts';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { assertAuthorized, assertResourceAuthorized } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from './postgres';
import { withTenantTransaction } from './tenantContext';

export type StudentLifecycleStatus =
  | 'applicant'
  | 'admitted'
  | 'active'
  | 'transferred'
  | 'graduated'
  | 'withdrawn'
  | 'legacy_unverified';

export interface StudentRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  class_id: string | null;
  admission_number: string;
  first_name: string;
  last_name: string;
  lifecycle_status: StudentLifecycleStatus;
  created_at: Date;
  updated_at: Date;
}

export interface StudentListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  lifecycleStatus?: StudentLifecycleStatus;
  classId?: string;
}

export type UpdateStudentInput = UpdateSchoolStudentRequest;

export interface StudentPage {
  records: StudentRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StudentHistoryRecord {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  from_class_id: string | null;
  to_class_id: string | null;
  actor_user_id: string;
  details: Record<string, unknown>;
  occurred_at: Date;
}

export interface StaffRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  user_id: string | null;
  department_id: string | null;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  designation: string;
  status: 'active' | 'suspended' | 'departed';
  created_at: Date;
  updated_at: Date;
}

export interface StaffListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: StaffRecord['status'];
}

export interface StaffPage {
  records: StaffRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export type CreateStaffInput = CreateSchoolStaffRequest & {
  schoolId: string;
};

export type UpdateStaffInput = UpdateSchoolStaffRequest;

export interface ClassRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  academic_year: string;
  section: string;
  status: 'active' | 'archived';
  class_teacher_staff_id: string | null;
  created_at: Date;
}

export interface ClassListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ClassRecord['status'];
}

export interface ClassPage {
  records: ClassRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export type UpdateClassInput = UpdateSchoolClassRequest;

export type CreateStudentInput = CreateSchoolStudentRequest & {
  schoolId: string;
};

export type CreateClassInput = CreateSchoolClassRequest & {
  schoolId: string;
};

export type StudentTransition =
  | { type: 'admit' }
  | { type: 'activate' }
  | { type: 'external_transfer'; destination: string }
  | { type: 'graduate' }
  | { type: 'withdraw'; reason: string }
  | { type: 'reinstate'; reason: string };

export class SchoolAdministrationError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'STUDENT_NOT_FOUND'
      | 'CLASS_NOT_FOUND'
      | 'STAFF_NOT_FOUND'
      | 'INVALID_STUDENT_TRANSITION'
      | 'INVALID_INPUT',
    message: string = code
  ) {
    super(message);
    this.name = 'SchoolAdministrationError';
  }
}

function studentReadScopes(actor: AuthorizedPrincipal): {
  tenantWide: boolean;
  studentIds: string[];
  classIds: string[];
} {
  if (actor.hasPermission(PERMISSIONS.studentsRead)) {
    return { tenantWide: true, studentIds: [], classIds: [] };
  }
  const relevant = actor.grants.filter(grant => grant.permissions.includes(PERMISSIONS.studentsRead));
  const studentIds = [...new Set(relevant.flatMap(grant =>
    grant.scopes.filter(scope => scope.resourceType === 'student').map(scope => scope.resourceId)
  ))];
  const classIds = [...new Set(relevant.flatMap(grant =>
    grant.scopes.filter(scope => scope.resourceType === 'class').map(scope => scope.resourceId)
  ))];
  if (!studentIds.length && !classIds.length) throw new SchoolAdministrationError('FORBIDDEN');
  return { tenantWide: false, studentIds, classIds };
}

function assertStudentRead(
  actor: AuthorizedPrincipal,
  studentId: string,
  classId: string | null
): void {
  if (actor.hasPermission(PERMISSIONS.studentsRead) ||
      actor.hasPermissionFor(PERMISSIONS.studentsRead, 'student', studentId) ||
      (classId && actor.hasPermissionFor(PERMISSIONS.studentsRead, 'class', classId))) {
    return;
  }
  throw new SchoolAdministrationError('FORBIDDEN');
}

function normalizeText(value: string, maximumLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maximumLength) {
    throw new SchoolAdministrationError('INVALID_INPUT', 'A required field is invalid.');
  }
  return normalized;
}

export class SchoolAdministrationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listClasses(
    actor: AuthorizedPrincipal,
    schoolId: string,
    options: ClassListOptions = {}
  ): Promise<ClassPage> {
    assertAuthorized(actor, PERMISSIONS.classesRead);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 25)));
    const search = options.search?.trim().slice(0, 100) || null;
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      const filters = ['class_record.tenant_id = $1', 'class_record.school_id = $2'];
      if (options.status) {
        values.push(options.status);
        filters.push(`class_record.status = $${values.length}`);
      }
      if (search) {
        values.push(`%${search}%`);
        filters.push(`(class_record.name ILIKE $${values.length}
          OR class_record.section ILIKE $${values.length}
          OR class_record.academic_year ILIKE $${values.length})`);
      }
      const where = filters.join(' AND ');
      const total = await client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM production.classes class_record WHERE ${where}`,
        values
      );
      const records = await client.query<ClassRecord>(
        `SELECT id, tenant_id, school_id, name, academic_year, section, status,
                class_teacher_staff_id, created_at
         FROM production.classes class_record WHERE ${where}
         ORDER BY academic_year DESC, lower(name), lower(section), id
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize]
      );
      return { records: records.rows, page, pageSize, total: Number(total.rows[0].total) };
    });
  }

  async updateStudent(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    input: UpdateStudentInput
  ): Promise<StudentRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsUpdate, 'student', studentId);
    const fields: Array<[keyof UpdateStudentInput, string, string]> = [];
    if (input.admissionNumber !== undefined) {
      fields.push(['admissionNumber', 'admission_number', normalizeText(input.admissionNumber, 100)]);
    }
    if (input.firstName !== undefined) fields.push(['firstName', 'first_name', normalizeText(input.firstName, 100)]);
    if (input.lastName !== undefined) fields.push(['lastName', 'last_name', normalizeText(input.lastName, 100)]);
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one student field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column], index) => `${column} = $${index + 4}`);
      const result = await client.query<StudentRecord>(
        `UPDATE production.students SET ${assignments.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, class_id, admission_number,
                   first_name, last_name, lifecycle_status, created_at, updated_at`,
        [actor.tenantId, schoolId, studentId, ...fields.map(([, , value]) => value)]
      );
      const student = result.rows[0];
      if (!student) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'student_record_updated', $3::jsonb)`,
        [
          actor.tenantId,
          actor.userId,
          JSON.stringify({
            schoolId,
            studentId,
            changedFields: fields.map(([field]) => field)
          })
        ]
      );
      return student;
    });
  }

  async updateClass(
    actor: AuthorizedPrincipal,
    schoolId: string,
    classId: string,
    input: UpdateClassInput
  ): Promise<ClassRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.classesUpdate, 'class', classId);
    const fields: Array<[keyof UpdateClassInput, string, string]> = [];
    if (input.name !== undefined) fields.push(['name', 'name', normalizeText(input.name, 100)]);
    if (input.academicYear !== undefined) {
      fields.push(['academicYear', 'academic_year', normalizeText(input.academicYear, 20)]);
    }
    if (input.section !== undefined) fields.push(['section', 'section', normalizeText(input.section, 80)]);
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one class field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column], index) => `${column} = $${index + 4}`);
      const result = await client.query<ClassRecord>(
        `UPDATE production.classes SET ${assignments.join(', ')}
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, name, academic_year, section,
                   status, class_teacher_staff_id, created_at`,
        [actor.tenantId, schoolId, classId, ...fields.map(([, , value]) => value)]
      );
      const classRecord = result.rows[0];
      if (!classRecord) throw new SchoolAdministrationError('CLASS_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'class_record_updated', $3::jsonb)`,
        [
          actor.tenantId,
          actor.userId,
          JSON.stringify({
            schoolId,
            classId,
            changedFields: fields.map(([field]) => field)
          })
        ]
      );
      return classRecord;
    });
  }

  async listStaff(
    actor: AuthorizedPrincipal,
    schoolId: string,
    options: StaffListOptions = {}
  ): Promise<StaffPage> {
    assertAuthorized(actor, PERMISSIONS.staffRead);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 25)));
    const search = options.search?.trim().slice(0, 100) || null;
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      const filters = ['staff.tenant_id = $1', 'staff.school_id = $2'];
      if (options.status) {
        values.push(options.status);
        filters.push(`staff.status = $${values.length}`);
      }
      if (search) {
        values.push(`%${search}%`);
        filters.push(`(staff.staff_number ILIKE $${values.length}
          OR staff.first_name ILIKE $${values.length}
          OR staff.last_name ILIKE $${values.length}
          OR staff.email ILIKE $${values.length}
          OR staff.designation ILIKE $${values.length})`);
      }
      const where = filters.join(' AND ');
      const total = await client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM production.staff staff WHERE ${where}`,
        values
      );
      const records = await client.query<StaffRecord>(
        `SELECT staff.id, staff.tenant_id, staff.school_id, staff.user_id,
                staff.department_id, staff.staff_number, staff.first_name,
                staff.last_name, staff.email, staff.designation, staff.status,
                staff.created_at, staff.updated_at
         FROM production.staff staff WHERE ${where}
         ORDER BY lower(staff.last_name), lower(staff.first_name), staff.id
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize]
      );
      return { records: records.rows, page, pageSize, total: Number(total.rows[0].total) };
    });
  }

  async getStaff(actor: AuthorizedPrincipal, schoolId: string, staffId: string): Promise<StaffRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.staffRead, 'staff', staffId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StaffRecord>(
        `SELECT id, tenant_id, school_id, user_id, department_id, staff_number,
                first_name, last_name, email, designation, status, created_at, updated_at
         FROM production.staff
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, staffId]
      );
      if (!result.rows[0]) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      return result.rows[0];
    });
  }

  async createStaff(actor: AuthorizedPrincipal, input: CreateStaffInput): Promise<StaffRecord> {
    assertAuthorized(actor, PERMISSIONS.staffCreate);
    const staffNumber = normalizeText(input.staffNumber, 64);
    const firstName = normalizeText(input.firstName, 100);
    const lastName = normalizeText(input.lastName, 100);
    const designation = normalizeText(input.designation, 120);
    const email = input.email?.trim().toLowerCase() || null;
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'A valid staff email is required.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StaffRecord>(
        `INSERT INTO production.staff
           (tenant_id, school_id, department_id, staff_number, first_name,
            last_name, email, designation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status, created_at, updated_at`,
        [
          actor.tenantId, input.schoolId, input.departmentId ?? null,
          staffNumber, firstName, lastName, email, designation
        ]
      );
      const staff = result.rows[0];
      await this.recordStaffAudit(client, actor, staff, 'staff_record_created', ['created']);
      return staff;
    });
  }

  async updateStaff(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    input: UpdateStaffInput
  ): Promise<StaffRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.staffUpdate, 'staff', staffId);
    const fields: Array<[keyof UpdateStaffInput, string, unknown]> = [];
    if (input.staffNumber !== undefined) fields.push(['staffNumber', 'staff_number', normalizeText(input.staffNumber, 64)]);
    if (input.firstName !== undefined) fields.push(['firstName', 'first_name', normalizeText(input.firstName, 100)]);
    if (input.lastName !== undefined) fields.push(['lastName', 'last_name', normalizeText(input.lastName, 100)]);
    if (input.designation !== undefined) fields.push(['designation', 'designation', normalizeText(input.designation, 120)]);
    if (input.email !== undefined) {
      const email = input.email?.trim().toLowerCase() || null;
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new SchoolAdministrationError('INVALID_INPUT', 'A valid staff email is required.');
      }
      fields.push(['email', 'email', email]);
    }
    if (input.departmentId !== undefined) fields.push(['departmentId', 'department_id', input.departmentId]);
    if (fields.length === 0) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one staff field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column], index) => `${column} = $${index + 4}`);
      const result = await client.query<StaffRecord>(
        `UPDATE production.staff SET ${assignments.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status, created_at, updated_at`,
        [actor.tenantId, schoolId, staffId, ...fields.map(([, , value]) => value)]
      );
      const staff = result.rows[0];
      if (!staff) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      await this.recordStaffAudit(client, actor, staff, 'staff_record_updated', fields.map(([key]) => key));
      return staff;
    });
  }

  private async recordStaffAudit(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    staff: StaffRecord,
    action: string,
    changedFields: string[]
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        actor.tenantId, actor.userId, action,
        JSON.stringify({ schoolId: staff.school_id, staffId: staff.id, changedFields })
      ]
    );
  }

  async listStudents(
    actor: AuthorizedPrincipal,
    schoolId: string,
    options: StudentListOptions = {}
  ): Promise<StudentPage> {
    const scopes = studentReadScopes(actor);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 25)));
    const offset = (page - 1) * pageSize;
    const search = options.search?.trim().slice(0, 100) || null;

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      const filters = ['student.tenant_id = $1', 'student.school_id = $2'];
      if (options.lifecycleStatus) {
        values.push(options.lifecycleStatus);
        filters.push(`student.lifecycle_status = $${values.length}`);
      }
      if (options.classId) {
        values.push(options.classId);
        filters.push(`student.class_id = $${values.length}`);
      }
      if (search) {
        values.push(`%${search}%`);
        filters.push(`(student.admission_number ILIKE $${values.length}
          OR student.first_name ILIKE $${values.length}
          OR student.last_name ILIKE $${values.length})`);
      }
      if (!scopes.tenantWide) {
        values.push(scopes.studentIds, scopes.classIds);
        filters.push(`(student.id = ANY($${values.length - 1}::uuid[])
          OR student.class_id = ANY($${values.length}::uuid[]))`);
      }
      const where = filters.join(' AND ');
      const filterValues = [...values];
      const totalResult = await client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM production.students student WHERE ${where}`,
        filterValues
      );
      values.push(pageSize, offset);
      const result = await client.query<StudentRecord>(
        `SELECT student.id, student.tenant_id, student.school_id, student.class_id,
                student.admission_number, student.first_name, student.last_name,
                student.lifecycle_status, student.created_at, student.updated_at
         FROM production.students student
         WHERE ${where}
         ORDER BY student.created_at DESC, student.id DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
      );
      return { records: result.rows, page, pageSize, total: Number(totalResult.rows[0].total) };
    });
  }

  async createStudent(actor: AuthorizedPrincipal, input: CreateStudentInput): Promise<StudentRecord> {
    assertAuthorized(actor, PERMISSIONS.studentsCreate);
    const admissionNumber = normalizeText(input.admissionNumber, 100);
    const firstName = normalizeText(input.firstName, 100);
    const lastName = normalizeText(input.lastName, 100);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StudentRecord>(
        `INSERT INTO production.students
           (tenant_id, school_id, admission_number, first_name, last_name, lifecycle_status)
         VALUES ($1, $2, $3, $4, $5, 'applicant')
         RETURNING id, tenant_id, school_id, class_id, admission_number,
                   first_name, last_name, lifecycle_status, created_at, updated_at`,
        [actor.tenantId, input.schoolId, admissionNumber, firstName, lastName]
      );
      const student = result.rows[0];
      await this.recordEvent(client, actor, student, 'registered', null, 'applicant', null, null, {});
      return student;
    });
  }

  async createClass(actor: AuthorizedPrincipal, input: CreateClassInput): Promise<ClassRecord> {
    assertAuthorized(actor, PERMISSIONS.classesCreate);
    const name = normalizeText(input.name, 100);
    const academicYear = normalizeText(input.academicYear, 20);
    const section = normalizeText(input.section ?? 'General', 80);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<ClassRecord>(
        `INSERT INTO production.classes (tenant_id, school_id, name, academic_year, section)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id, school_id, name, academic_year, section,
                   status, class_teacher_staff_id, created_at`,
        [actor.tenantId, input.schoolId, name, academicYear, section]
      );
      return result.rows[0];
    });
  }

  async getStudent(actor: AuthorizedPrincipal, schoolId: string, studentId: string): Promise<StudentRecord> {
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id, class_id, admission_number, first_name,
                last_name, lifecycle_status, created_at, updated_at
         FROM production.students
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, studentId]
      );
      const student = result.rows[0];
      if (!student) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');
      assertStudentRead(actor, student.id, student.class_id);
      return student;
    });
  }

  async transitionStudent(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    transition: StudentTransition
  ): Promise<StudentRecord> {
    const permission = transition.type === 'admit' || transition.type === 'activate' ? PERMISSIONS.studentsAdmit
      : transition.type === 'external_transfer' ? PERMISSIONS.studentsTransfer
        : transition.type === 'graduate' ? PERMISSIONS.studentsGraduate
          : PERMISSIONS.studentsUpdate;
    assertResourceAuthorized(actor, PERMISSIONS.studentLifecycleManage, 'student', studentId);
    assertResourceAuthorized(actor, permission, 'student', studentId);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const current = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id, class_id, admission_number, first_name,
                last_name, lifecycle_status, created_at, updated_at
         FROM production.students
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, studentId]
      );
      const student = current.rows[0];
      if (!student) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');

      const transitionTable: Record<StudentTransition['type'], {
        allowedFrom: StudentLifecycleStatus[];
        to: StudentLifecycleStatus;
        event: string;
      }> = {
        admit: { allowedFrom: ['applicant'], to: 'admitted', event: 'admitted' },
        activate: { allowedFrom: ['admitted'], to: 'active', event: 'activated' },
        external_transfer: { allowedFrom: ['active'], to: 'transferred', event: 'external_transfer' },
        graduate: { allowedFrom: ['active'], to: 'graduated', event: 'graduated' },
        withdraw: { allowedFrom: ['admitted', 'active'], to: 'withdrawn', event: 'withdrawn' },
        reinstate: { allowedFrom: ['withdrawn'], to: 'active', event: 'reinstated' }
      };
      const target = transitionTable[transition.type];
      if (!target.allowedFrom.includes(student.lifecycle_status)) {
        throw new SchoolAdministrationError('INVALID_STUDENT_TRANSITION');
      }
      if (transition.type === 'external_transfer') normalizeText(transition.destination, 255);
      if (transition.type === 'withdraw' || transition.type === 'reinstate') {
        normalizeText(transition.reason, 500);
      }
      const details = transition.type === 'external_transfer'
        ? { destination: normalizeText(transition.destination, 255) }
        : transition.type === 'withdraw' || transition.type === 'reinstate'
          ? { reason: normalizeText(transition.reason, 500) }
          : {};
      const updated = await client.query<StudentRecord>(
        `UPDATE production.students SET lifecycle_status = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, class_id, admission_number,
                   first_name, last_name, lifecycle_status, created_at, updated_at`,
        [actor.tenantId, schoolId, studentId, target.to]
      );
      await this.recordEvent(
        client, actor, updated.rows[0], target.event,
        student.lifecycle_status, target.to, student.class_id, student.class_id, details
      );
      return updated.rows[0];
    });
  }

  async assignStudentToClass(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    classId: string,
    operation: 'assign' | 'promote' | 'internal_transfer' = 'assign'
  ): Promise<StudentRecord> {
    const permission = operation === 'promote' ? PERMISSIONS.studentsPromote
      : operation === 'internal_transfer' ? PERMISSIONS.studentsTransfer
        : PERMISSIONS.classesUpdate;
    assertResourceAuthorized(actor, permission, 'student', studentId);
    assertResourceAuthorized(actor, PERMISSIONS.classesUpdate, 'class', classId);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const current = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id, class_id, admission_number, first_name,
                last_name, lifecycle_status, created_at, updated_at
         FROM production.students
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, studentId]
      );
      const student = current.rows[0];
      if (!student) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');
      if (!['admitted', 'active'].includes(student.lifecycle_status)) {
        throw new SchoolAdministrationError('INVALID_STUDENT_TRANSITION');
      }
      const targetClass = await client.query(
        `SELECT 1 FROM production.classes
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
        [actor.tenantId, schoolId, classId]
      );
      if (targetClass.rowCount !== 1) throw new SchoolAdministrationError('CLASS_NOT_FOUND');
      if (student.class_id === classId) return student;

      await client.query(
        `UPDATE production.student_class_assignments
         SET ended_at = now(), ended_by = $4
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3 AND ended_at IS NULL`,
        [actor.tenantId, schoolId, studentId, actor.userId]
      );
      await client.query(
        `INSERT INTO production.student_class_assignments
           (tenant_id, school_id, student_id, class_id, assigned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [actor.tenantId, schoolId, studentId, classId, actor.userId]
      );
      const updated = await client.query<StudentRecord>(
        `UPDATE production.students SET class_id = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, class_id, admission_number,
                   first_name, last_name, lifecycle_status, created_at, updated_at`,
        [actor.tenantId, schoolId, studentId, classId]
      );
      const eventType = operation === 'promote' ? 'promoted'
        : operation === 'internal_transfer' ? 'internal_transfer'
          : student.class_id ? 'class_changed' : 'class_assigned';
      await this.recordEvent(
        client, actor, updated.rows[0], eventType,
        student.lifecycle_status, student.lifecycle_status, student.class_id, classId, {}
      );
      return updated.rows[0];
    });
  }

  async getStudentHistory(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<StudentHistoryRecord[]> {
    await this.getStudent(actor, schoolId, studentId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StudentHistoryRecord>(
        `SELECT id, event_type, from_status, to_status, from_class_id, to_class_id,
                actor_user_id, details, occurred_at
         FROM production.student_lifecycle_events
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3
         ORDER BY occurred_at DESC, id DESC`,
        [actor.tenantId, schoolId, studentId]
      );
      return result.rows;
    });
  }

  private async recordEvent(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    student: StudentRecord,
    eventType: string,
    fromStatus: string | null,
    toStatus: string | null,
    fromClassId: string | null,
    toClassId: string | null,
    details: Record<string, unknown>
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.student_lifecycle_events
         (tenant_id, school_id, student_id, event_type, from_status, to_status,
          from_class_id, to_class_id, actor_user_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        actor.tenantId, student.school_id, student.id, eventType, fromStatus, toStatus,
        fromClassId, toClassId, actor.userId, JSON.stringify(details)
      ]
    );
  }
}
