import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { assertAuthorized } from '../authorization/authorizedPrincipal';
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

export interface CreateStudentInput {
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
}

export interface CreateClassInput {
  schoolId: string;
  name: string;
  academicYear: string;
  section: string;
}

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
    const section = normalizeText(input.section, 80);
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
    assertAuthorized(actor, permission);

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
    assertAuthorized(actor, permission);

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
