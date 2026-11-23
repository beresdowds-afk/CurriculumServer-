import { createHash, randomBytes } from 'node:crypto';
import type {
  AllocateStaffSubjectRequest,
  CreateAcademicSessionRequest,
  CreateAcademicTermRequest,
  CreateDepartmentRequest,
  CreateGuardianRequest,
  CreateSchoolClassRequest,
  CreateSchoolStaffRequest,
  CreateSchoolStudentRequest,
  CreateStudentAdmissionRequest,
  EnrollAdmissionRequest,
  LinkStudentGuardianRequest,
  ReviewAdmissionRequest,
  SchoolInstitutionalStatus,
  SchoolOwnershipType,
  UpdateDepartmentRequest,
  UpdateGuardianRequest,
  UpdateSchoolClassRequest,
  UpdateSchoolProfileRequest,
  UpdateSchoolStaffRequest,
  UpdateSchoolStudentRequest,
  UpsertStudentMedicalProfileRequest
} from '../../packages/shared-types/src/apiContracts';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { assertAuthorized, assertResourceAuthorized } from '../authorization/authorizedPrincipal';
import { PERMISSIONS, PLATFORM_ADMIN_ROLE, SCHOOL_ROLE_CODES } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from './postgres';
import { withTenantTransaction } from './tenantContext';

export type StudentLifecycleStatus =
  | 'applicant'
  | 'admitted'
  | 'enrolled'
  | 'active'
  | 'suspended'
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
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  nationality?: string | null;
  state_of_origin?: string | null;
  lga_of_origin?: string | null;
  residential_address?: string | null;
  previous_school_history?: Array<Record<string, unknown>>;
  academic_history_summary?: Record<string, unknown>;
  emergency_contacts?: Array<Record<string, unknown>>;
  photo_url?: string | null;
  rfid_card_uid?: string | null;
  digital_id_code?: string | null;
  user_id?: string | null;
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
  status: 'active' | 'on_leave' | 'suspended' | 'retired' | 'departed';
  staff_category?: 'teaching' | 'administrative' | 'support' | 'executive';
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'visiting';
  phone?: string | null;
  photo_url?: string | null;
  qualification?: string | null;
  certifications?: string[];
  trcn_number?: string | null;
  trcn_verified?: boolean;
  biometric_id?: string | null;
  max_periods_per_week?: number;
  hire_date?: string | null;
  separated_at?: Date | null;
  separation_reason?: string | null;
  specialization_notes?: string | null;
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
  department_id?: string | null;
  academic_session_id?: string | null;
  grade_level?: string;
  arm?: string;
  room_number?: string;
  capacity?: number;
  created_at: Date;
  updated_at?: Date;
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
  | { type: 'enroll' }
  | { type: 'activate' }
  | { type: 'suspend'; reason: string }
  | { type: 'external_transfer'; destination: string }
  | { type: 'graduate' }
  | { type: 'withdraw'; reason: string }
  | { type: 'reinstate'; reason: string };

export interface SchoolProfileRecord {
  id: string;
  tenant_id: string;
  name: string;
  short_name: string;
  legal_name: string | null;
  registered_identity: string | null;
  school_type: string;
  ownership: SchoolOwnershipType;
  educational_classification: string;
  country: string;
  state_province: string;
  city: string;
  physical_address: string;
  administrative_address: string | null;
  postal_code: string | null;
  official_contact_email: string;
  telephone: string;
  website: string | null;
  motto: string | null;
  principal_name: string | null;
  principal_email: string | null;
  principal_phone: string | null;
  ict_administrator_name: string | null;
  ict_administrator_email: string | null;
  ict_administrator_phone: string | null;
  logo_url: string | null;
  primary_brand_color: string;
  accent_brand_color: string;
  operational_policies: Record<string, unknown>;
  institutional_status: SchoolInstitutionalStatus;
  activated_at: Date | null;
}

export interface SchoolStatusHistoryRow {
  id: string;
  tenant_id: string;
  school_id: string;
  from_status: string | null;
  to_status: SchoolInstitutionalStatus;
  reason: string;
  changed_by: string;
  evidence: Record<string, unknown>;
  occurred_at: Date;
}

export interface DepartmentRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  code: string | null;
  unit_type: 'academic' | 'administrative' | 'support' | 'faculty';
  parent_department_id: string | null;
  head_staff_id: string | null;
  description: string;
  status: 'active' | 'inactive';
  created_at: Date;
}

export interface AcademicTermRow {
  id: string;
  tenant_id: string;
  school_id: string;
  session_id: string;
  term_order: number;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed' | 'closed';
  created_at: Date;
  updated_at: Date;
}

export interface AcademicSessionRow {
  id: string;
  tenant_id: string;
  school_id: string;
  session_code: string;
  display_name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  terms: AcademicTermRow[];
}

export interface AdmissionRow {
  id: string;
  tenant_id: string;
  school_id: string;
  application_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  target_grade_level: string;
  target_class_id: string | null;
  academic_session_id: string | null;
  previous_school_name: string | null;
  previous_class: string | null;
  guardian_summary: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  review_notes: string | null;
  status: 'submitted' | 'under_review' | 'waitlisted' | 'approved' | 'rejected' | 'enrolled';
  reviewed_by: string | null;
  reviewed_at: Date | null;
  approved_by: string | null;
  approved_at: Date | null;
  enrolled_student_id: string | null;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MedicalProfileRow {
  tenant_id: string;
  school_id: string;
  student_id: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown' | null;
  genotype: 'AA' | 'AS' | 'SS' | 'AC' | 'SC' | 'unknown' | null;
  allergies: string[];
  chronic_conditions: string[];
  immunization_summary: Record<string, unknown>;
  dietary_restrictions: string[];
  physician_name: string | null;
  physician_phone: string | null;
  medical_notes: string | null;
  consent_for_emergency_care: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DigitalIdCardRow {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id: string;
  card_number: string;
  issued_by: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface GuardianRow {
  id: string;
  tenant_id: string;
  school_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  occupation: string | null;
  residential_address: string | null;
  identity_document_type: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  verified_by: string | null;
  verified_at: Date | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface StudentGuardianRow {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id: string;
  guardian_id: string;
  relationship_type: 'mother' | 'father' | 'legal_guardian' | 'sponsor' | 'sibling' | 'other';
  is_primary: boolean;
  is_financial_sponsor: boolean;
  is_emergency_contact: boolean;
  authorized_pickup: boolean;
  can_view_academic_records: boolean;
  can_view_medical_summary: boolean;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface StaffSubjectAllocationRow {
  id: string;
  tenant_id: string;
  school_id: string;
  staff_id: string;
  academic_session_id: string | null;
  subject_code: string;
  subject_name: string;
  class_id: string | null;
  periods_per_week: number;
  status: 'active' | 'ended';
  assigned_by: string | null;
  assigned_at: Date;
  ended_at: Date | null;
}

export class SchoolAdministrationError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'STUDENT_NOT_FOUND'
      | 'CLASS_NOT_FOUND'
      | 'STAFF_NOT_FOUND'
      | 'DEPARTMENT_NOT_FOUND'
      | 'SESSION_NOT_FOUND'
      | 'TERM_NOT_FOUND'
      | 'ADMISSION_NOT_FOUND'
      | 'GUARDIAN_NOT_FOUND'
      | 'MEDICAL_PROFILE_NOT_FOUND'
      | 'DIGITAL_ID_NOT_FOUND'
      | 'ALLOCATION_NOT_FOUND'
      | 'INVALID_STUDENT_TRANSITION'
      | 'INVALID_STATUS_TRANSITION'
      | 'INVALID_INPUT',
    message: string = code
  ) {
    super(message);
    this.name = 'SchoolAdministrationError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCHOOL_ROLE_SET = new Set<string>(SCHOOL_ROLE_CODES);

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

function normalizeOptionalText(value: string | null | undefined, maximumLength: number): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length > maximumLength) {
    throw new SchoolAdministrationError('INVALID_INPUT', 'Field exceeds maximum length.');
  }
  return trimmed;
}

function assertValidUuid(id: string | null | undefined, errorCode: SchoolAdministrationError['code'] = 'INVALID_INPUT'): void {
  if (!id || !UUID_PATTERN.test(id)) {
    throw new SchoolAdministrationError(errorCode);
  }
}

export class SchoolAdministrationRepository {
  constructor(private readonly pool: DatabasePool) {}

  // =========================================================================
  // INSTITUTIONAL IDENTITY, STATUS, DEPARTMENTS & ACADEMIC CALENDAR
  // =========================================================================

  async getSchoolIdentity(actor: AuthorizedPrincipal, schoolId: string): Promise<SchoolProfileRecord | null> {
    assertAuthorized(actor, PERMISSIONS.schoolRead);
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<SchoolProfileRecord>(
        `SELECT id, tenant_id, name, short_name, legal_name, registered_identity,
                school_type, ownership, educational_classification, country,
                state_province, city, physical_address, administrative_address,
                postal_code, official_contact_email, telephone, website, motto,
                principal_name, principal_email, principal_phone,
                ict_administrator_name, ict_administrator_email, ict_administrator_phone,
                logo_url, primary_brand_color, accent_brand_color,
                operational_policies, institutional_status, activated_at
         FROM production.schools
         WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, schoolId]
      );
      return result.rows[0] ?? null;
    });
  }

  async updateSchoolProfile(
    actor: AuthorizedPrincipal,
    schoolId: string,
    input: UpdateSchoolProfileRequest
  ): Promise<SchoolProfileRecord> {
    assertAuthorized(actor, PERMISSIONS.schoolConfigurationManage);
    assertValidUuid(schoolId);
    const fields: Array<[string, unknown, boolean?]> = [];
    if (input.name !== undefined) fields.push(['name', normalizeText(input.name, 255)]);
    if (input.shortName !== undefined) fields.push(['short_name', normalizeText(input.shortName, 100)]);
    if (input.legalName !== undefined) fields.push(['legal_name', normalizeOptionalText(input.legalName, 255)]);
    if (input.registeredIdentity !== undefined) fields.push(['registered_identity', normalizeOptionalText(input.registeredIdentity, 120)]);
    if (input.schoolType !== undefined) fields.push(['school_type', normalizeText(input.schoolType, 100)]);
    if (input.ownership !== undefined) {
      if (!['public', 'private', 'mission', 'federal', 'state', 'international', 'community'].includes(input.ownership)) {
        throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid ownership classification.');
      }
      fields.push(['ownership', input.ownership]);
    }
    if (input.educationalClassification !== undefined) {
      fields.push(['educational_classification', normalizeText(input.educationalClassification, 100)]);
    }
    if (input.country !== undefined) fields.push(['country', normalizeText(input.country, 100)]);
    if (input.stateProvince !== undefined) fields.push(['state_province', normalizeText(input.stateProvince, 100)]);
    if (input.city !== undefined) fields.push(['city', normalizeText(input.city, 100)]);
    if (input.physicalAddress !== undefined) fields.push(['physical_address', normalizeText(input.physicalAddress, 1000)]);
    if (input.administrativeAddress !== undefined) fields.push(['administrative_address', normalizeOptionalText(input.administrativeAddress, 1000)]);
    if (input.postalCode !== undefined) fields.push(['postal_code', normalizeOptionalText(input.postalCode, 40)]);
    if (input.officialContactEmail !== undefined) {
      const email = normalizeText(input.officialContactEmail, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid official email.');
      fields.push(['official_contact_email', email]);
    }
    if (input.telephone !== undefined) fields.push(['telephone', normalizeText(input.telephone, 50)]);
    if (input.website !== undefined) fields.push(['website', normalizeOptionalText(input.website, 255)]);
    if (input.motto !== undefined) fields.push(['motto', normalizeOptionalText(input.motto, 255)]);
    if (input.principalName !== undefined) fields.push(['principal_name', normalizeOptionalText(input.principalName, 160)]);
    if (input.principalEmail !== undefined) fields.push(['principal_email', normalizeOptionalText(input.principalEmail, 254)]);
    if (input.principalPhone !== undefined) fields.push(['principal_phone', normalizeOptionalText(input.principalPhone, 50)]);
    if (input.ictAdministratorName !== undefined) fields.push(['ict_administrator_name', normalizeOptionalText(input.ictAdministratorName, 160)]);
    if (input.ictAdministratorEmail !== undefined) fields.push(['ict_administrator_email', normalizeOptionalText(input.ictAdministratorEmail, 254)]);
    if (input.ictAdministratorPhone !== undefined) fields.push(['ict_administrator_phone', normalizeOptionalText(input.ictAdministratorPhone, 50)]);
    if (input.logoUrl !== undefined) fields.push(['logo_url', normalizeOptionalText(input.logoUrl, 500)]);
    if (input.primaryBrandColor !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(input.primaryBrandColor)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid hex brand color.');
      fields.push(['primary_brand_color', input.primaryBrandColor]);
    }
    if (input.accentBrandColor !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(input.accentBrandColor)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid hex accent color.');
      fields.push(['accent_brand_color', input.accentBrandColor]);
    }
    if (input.operationalPolicies !== undefined) {
      if (!input.operationalPolicies || typeof input.operationalPolicies !== 'object' || Array.isArray(input.operationalPolicies)) {
        throw new SchoolAdministrationError('INVALID_INPUT', 'Operational policies must be an object.');
      }
      fields.push(['operational_policies', JSON.stringify(input.operationalPolicies), true]);
    }
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one profile field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const sets = fields.map(([col, , isJson], i) => `${col} = $${i + 3}${isJson ? '::jsonb' : ''}`);
      const values = [actor.tenantId, schoolId, ...fields.map(([, val]) => val)];
      const result = await client.query<SchoolProfileRecord>(
        `UPDATE production.schools SET ${sets.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, name, short_name, legal_name, registered_identity,
                   school_type, ownership, educational_classification, country,
                   state_province, city, physical_address, administrative_address,
                   postal_code, official_contact_email, telephone, website, motto,
                   principal_name, principal_email, principal_phone,
                   ict_administrator_name, ict_administrator_email, ict_administrator_phone,
                   logo_url, primary_brand_color, accent_brand_color,
                   operational_policies, institutional_status, activated_at`,
        values
      );
      if (!result.rows[0]) throw new SchoolAdministrationError('INVALID_INPUT', 'School not found.');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_profile_updated', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, changedColumns: fields.map(f => f[0]) })]
      );
      return result.rows[0];
    });
  }

  async getSchoolStatusHistory(actor: AuthorizedPrincipal, schoolId: string): Promise<SchoolStatusHistoryRow[]> {
    assertAuthorized(actor, PERMISSIONS.schoolRead);
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<SchoolStatusHistoryRow>(
        `SELECT id, tenant_id, school_id, from_status, to_status, reason, changed_by, evidence, occurred_at
         FROM production.school_status_history
         WHERE tenant_id = $1 AND school_id = $2
         ORDER BY occurred_at DESC`,
        [actor.tenantId, schoolId]
      );
      return result.rows;
    });
  }

  async transitionSchoolStatus(
    actor: AuthorizedPrincipal,
    schoolId: string,
    toStatus: SchoolInstitutionalStatus,
    reason: string,
    evidence: Record<string, unknown> = {}
  ): Promise<SchoolProfileRecord> {
    assertAuthorized(actor, PERMISSIONS.schoolConfigurationManage);
    assertValidUuid(schoolId);
    const normalizedReason = normalizeText(reason, 500);
    const allowedTransitions: Record<SchoolInstitutionalStatus, SchoolInstitutionalStatus[]> = {
      pending_activation: ['active', 'decommissioned'],
      active: ['suspended', 'decommissioned'],
      suspended: ['active', 'decommissioned'],
      decommissioned: []
    };
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const current = await client.query<{ institutional_status: SchoolInstitutionalStatus }>(
        `SELECT institutional_status FROM production.schools WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
        [actor.tenantId, schoolId]
      );
      const row = current.rows[0];
      if (!row) throw new SchoolAdministrationError('INVALID_INPUT', 'School not found.');
      if (!allowedTransitions[row.institutional_status]?.includes(toStatus)) {
        throw new SchoolAdministrationError('INVALID_STATUS_TRANSITION', `Cannot transition school from ${row.institutional_status} to ${toStatus}.`);
      }
      const updated = await client.query<SchoolProfileRecord>(
        `UPDATE production.schools
         SET institutional_status = $3,
             activated_at = CASE WHEN $3 = 'active' AND activated_at IS NULL THEN now() ELSE activated_at END,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, name, short_name, legal_name, registered_identity,
                   school_type, ownership, educational_classification, country,
                   state_province, city, physical_address, administrative_address,
                   postal_code, official_contact_email, telephone, website, motto,
                   principal_name, principal_email, principal_phone,
                   ict_administrator_name, ict_administrator_email, ict_administrator_phone,
                   logo_url, primary_brand_color, accent_brand_color,
                   operational_policies, institutional_status, activated_at`,
        [actor.tenantId, schoolId, toStatus]
      );
      await client.query(
        `INSERT INTO production.school_status_history
           (tenant_id, school_id, from_status, to_status, reason, changed_by, evidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [actor.tenantId, schoolId, row.institutional_status, toStatus, normalizedReason, actor.userId, JSON.stringify(evidence)]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_institutional_status_changed', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, fromStatus: row.institutional_status, toStatus, reason: normalizedReason })]
      );
      return updated.rows[0];
    });
  }

  async listDepartments(actor: AuthorizedPrincipal, schoolId: string): Promise<DepartmentRecord[]> {
    assertAuthorized(actor, PERMISSIONS.departmentsRead);
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<DepartmentRecord>(
        `SELECT id, tenant_id, school_id, name, code, unit_type, parent_department_id,
                head_staff_id, description, status, created_at
         FROM production.school_departments
         WHERE tenant_id = $1 AND school_id = $2
         ORDER BY lower(name)`,
        [actor.tenantId, schoolId]
      );
      return result.rows;
    });
  }

  async createDepartment(
    actor: AuthorizedPrincipal,
    schoolId: string,
    input: CreateDepartmentRequest
  ): Promise<DepartmentRecord> {
    assertAuthorized(actor, PERMISSIONS.departmentsManage);
    assertValidUuid(schoolId);
    const name = normalizeText(input.name, 160);
    const code = normalizeOptionalText(input.code, 40);
    const unitType = input.unitType ?? 'academic';
    if (!['academic', 'administrative', 'support', 'faculty'].includes(unitType)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid unit type.');
    }
    if (input.parentDepartmentId) assertValidUuid(input.parentDepartmentId);
    if (input.headStaffId) assertValidUuid(input.headStaffId);
    const description = normalizeOptionalText(input.description, 500) ?? '';
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<DepartmentRecord>(
        `INSERT INTO production.school_departments
           (tenant_id, school_id, name, code, unit_type, parent_department_id, head_staff_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, tenant_id, school_id, name, code, unit_type, parent_department_id,
                   head_staff_id, description, status, created_at`,
        [
          actor.tenantId,
          schoolId,
          name,
          code,
          unitType,
          input.parentDepartmentId ?? null,
          input.headStaffId ?? null,
          description
        ]
      );
      return result.rows[0];
    });
  }

  async updateDepartment(
    actor: AuthorizedPrincipal,
    schoolId: string,
    departmentId: string,
    input: UpdateDepartmentRequest
  ): Promise<DepartmentRecord> {
    assertAuthorized(actor, PERMISSIONS.departmentsManage);
    assertValidUuid(schoolId);
    assertValidUuid(departmentId, 'DEPARTMENT_NOT_FOUND');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      if (input.parentDepartmentId !== undefined && input.parentDepartmentId !== null) {
        assertValidUuid(input.parentDepartmentId);
        if (input.parentDepartmentId === departmentId) {
          throw new SchoolAdministrationError('INVALID_INPUT', 'Department cannot be its own parent.');
        }
        // Detect hierarchy cycles by walking ancestors of proposed parent
        let cursor: string | null = input.parentDepartmentId;
        const visited = new Set<string>([departmentId]);
        while (cursor) {
          if (visited.has(cursor)) {
            throw new SchoolAdministrationError('INVALID_INPUT', 'Department hierarchy cycle detected.');
          }
          visited.add(cursor);
          const parentRow = await client.query<{ parent_department_id: string | null }>(
            `SELECT parent_department_id FROM production.school_departments
             WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
            [actor.tenantId, schoolId, cursor]
          );
          if (!parentRow.rows[0]) throw new SchoolAdministrationError('DEPARTMENT_NOT_FOUND');
          cursor = parentRow.rows[0].parent_department_id;
        }
      }

      const fields: Array<[string, unknown]> = [];
      if (input.name !== undefined) fields.push(['name', normalizeText(input.name, 160)]);
      if (input.code !== undefined) fields.push(['code', normalizeOptionalText(input.code, 40)]);
      if (input.unitType !== undefined) {
        if (!['academic', 'administrative', 'support', 'faculty'].includes(input.unitType)) {
          throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid unit type.');
        }
        fields.push(['unit_type', input.unitType]);
      }
      if (input.parentDepartmentId !== undefined) fields.push(['parent_department_id', input.parentDepartmentId]);
      if (input.headStaffId !== undefined) {
        if (input.headStaffId) assertValidUuid(input.headStaffId);
        fields.push(['head_staff_id', input.headStaffId]);
      }
      if (input.description !== undefined) fields.push(['description', normalizeOptionalText(input.description, 500) ?? '']);
      if (input.status !== undefined) {
        if (!['active', 'inactive'].includes(input.status)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid status.');
        fields.push(['status', input.status]);
      }
      if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one field is required.');

      const sets = fields.map(([col], i) => `${col} = $${i + 4}`);
      const result = await client.query<DepartmentRecord>(
        `UPDATE production.school_departments SET ${sets.join(', ')}
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, name, code, unit_type, parent_department_id,
                   head_staff_id, description, status, created_at`,
        [actor.tenantId, schoolId, departmentId, ...fields.map(f => f[1])]
      );
      if (!result.rows[0]) throw new SchoolAdministrationError('DEPARTMENT_NOT_FOUND');
      return result.rows[0];
    });
  }

  async listAcademicSessions(actor: AuthorizedPrincipal, schoolId: string): Promise<AcademicSessionRow[]> {
    assertAuthorized(actor, PERMISSIONS.sessionsRead);
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const sessions = await client.query<Omit<AcademicSessionRow, 'terms'>>(
        `SELECT id, tenant_id, school_id, session_code, display_name, starts_on::text,
                ends_on::text, is_current, status, created_by, created_at, updated_at
         FROM production.academic_sessions
         WHERE tenant_id = $1 AND school_id = $2
         ORDER BY starts_on DESC, created_at DESC`,
        [actor.tenantId, schoolId]
      );
      const terms = await client.query<AcademicTermRow>(
        `SELECT id, tenant_id, school_id, session_id, term_order, name,
                starts_on::text, ends_on::text, is_current, status, created_at, updated_at
         FROM production.academic_terms
         WHERE tenant_id = $1 AND school_id = $2
         ORDER BY term_order ASC`,
        [actor.tenantId, schoolId]
      );
      const termsBySession = new Map<string, AcademicTermRow[]>();
      for (const term of terms.rows) {
        const list = termsBySession.get(term.session_id) ?? [];
        list.push(term);
        termsBySession.set(term.session_id, list);
      }
      return sessions.rows.map(s => ({ ...s, terms: termsBySession.get(s.id) ?? [] }));
    });
  }

  async createAcademicSession(
    actor: AuthorizedPrincipal,
    schoolId: string,
    input: CreateAcademicSessionRequest
  ): Promise<AcademicSessionRow> {
    assertAuthorized(actor, PERMISSIONS.sessionsManage);
    assertValidUuid(schoolId);
    const sessionCode = normalizeText(input.sessionCode, 40);
    const displayName = normalizeText(input.displayName, 120);
    if (!input.startsOn || !input.endsOn || input.endsOn <= input.startsOn) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Session end date must be after start date.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<Omit<AcademicSessionRow, 'terms'>>(
        `INSERT INTO production.academic_sessions
           (tenant_id, school_id, session_code, display_name, starts_on, ends_on, created_by)
         VALUES ($1, $2, $3, $4, $5::date, $6::date, $7)
         RETURNING id, tenant_id, school_id, session_code, display_name, starts_on::text,
                   ends_on::text, is_current, status, created_by, created_at, updated_at`,
        [actor.tenantId, schoolId, sessionCode, displayName, input.startsOn, input.endsOn, actor.userId]
      );
      return { ...result.rows[0], terms: [] };
    });
  }

  async activateAcademicSession(
    actor: AuthorizedPrincipal,
    schoolId: string,
    sessionId: string
  ): Promise<AcademicSessionRow> {
    assertAuthorized(actor, PERMISSIONS.sessionsManage);
    assertValidUuid(schoolId);
    assertValidUuid(sessionId, 'SESSION_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const target = await client.query(
        `SELECT 1 FROM production.academic_sessions WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, sessionId]
      );
      if (target.rowCount !== 1) throw new SchoolAdministrationError('SESSION_NOT_FOUND');
      await client.query(
        `UPDATE production.academic_sessions SET is_current = false, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND is_current = true`,
        [actor.tenantId, schoolId]
      );
      const activated = await client.query<Omit<AcademicSessionRow, 'terms'>>(
        `UPDATE production.academic_sessions
         SET is_current = true, status = 'active', updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, session_code, display_name, starts_on::text,
                   ends_on::text, is_current, status, created_by, created_at, updated_at`,
        [actor.tenantId, schoolId, sessionId]
      );
      const terms = await client.query<AcademicTermRow>(
        `SELECT id, tenant_id, school_id, session_id, term_order, name,
                starts_on::text, ends_on::text, is_current, status, created_at, updated_at
         FROM production.academic_terms
         WHERE tenant_id = $1 AND school_id = $2 AND session_id = $3
         ORDER BY term_order ASC`,
        [actor.tenantId, schoolId, sessionId]
      );
      return { ...activated.rows[0], terms: terms.rows };
    });
  }

  async createAcademicTerm(
    actor: AuthorizedPrincipal,
    schoolId: string,
    sessionId: string,
    input: CreateAcademicTermRequest
  ): Promise<AcademicTermRow> {
    assertAuthorized(actor, PERMISSIONS.sessionsManage);
    assertValidUuid(schoolId);
    assertValidUuid(sessionId, 'SESSION_NOT_FOUND');
    const name = normalizeText(input.name, 80);
    if (!Number.isInteger(input.termOrder) || input.termOrder < 1 || input.termOrder > 6) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Term order must be between 1 and 6.');
    }
    if (!input.startsOn || !input.endsOn || input.endsOn <= input.startsOn) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Term end date must be after start date.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<AcademicTermRow>(
        `INSERT INTO production.academic_terms
           (tenant_id, school_id, session_id, term_order, name, starts_on, ends_on)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7::date)
         RETURNING id, tenant_id, school_id, session_id, term_order, name,
                   starts_on::text, ends_on::text, is_current, status, created_at, updated_at`,
        [actor.tenantId, schoolId, sessionId, input.termOrder, name, input.startsOn, input.endsOn]
      );
      return result.rows[0];
    });
  }

  async activateAcademicTerm(
    actor: AuthorizedPrincipal,
    schoolId: string,
    termId: string
  ): Promise<AcademicTermRow> {
    assertAuthorized(actor, PERMISSIONS.sessionsManage);
    assertValidUuid(schoolId);
    assertValidUuid(termId, 'TERM_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const target = await client.query(
        `SELECT 1 FROM production.academic_terms WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, termId]
      );
      if (target.rowCount !== 1) throw new SchoolAdministrationError('TERM_NOT_FOUND');
      await client.query(
        `UPDATE production.academic_terms SET is_current = false, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND is_current = true`,
        [actor.tenantId, schoolId]
      );
      const activated = await client.query<AcademicTermRow>(
        `UPDATE production.academic_terms
         SET is_current = true, status = 'active', updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, session_id, term_order, name,
                   starts_on::text, ends_on::text, is_current, status, created_at, updated_at`,
        [actor.tenantId, schoolId, termId]
      );
      return activated.rows[0];
    });
  }

  // =========================================================================
  // CLASSES & ORGANIZATIONAL STRUCTURE
  // =========================================================================

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
                class_teacher_staff_id, department_id, academic_session_id,
                grade_level, arm, room_number, capacity, created_at, updated_at
         FROM production.classes class_record WHERE ${where}
         ORDER BY academic_year DESC, lower(name), lower(section), id
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize]
      );
      return { records: records.rows, page, pageSize, total: Number(total.rows[0].total) };
    });
  }

  async createClass(actor: AuthorizedPrincipal, input: CreateClassInput): Promise<ClassRecord> {
    assertAuthorized(actor, PERMISSIONS.classesCreate);
    const name = normalizeText(input.name, 100);
    const academicYear = normalizeText(input.academicYear, 20);
    const section = normalizeText(input.section ?? 'General', 80);
    const gradeLevel = normalizeOptionalText(input.gradeLevel, 60) ?? 'General';
    const arm = normalizeOptionalText(input.arm, 40) ?? 'A';
    const roomNumber = normalizeOptionalText(input.roomNumber, 40) ?? '';
    const capacity = input.capacity !== undefined ? Math.min(500, Math.max(1, Math.floor(input.capacity))) : 40;
    const hasExtended = input.departmentId !== undefined || input.academicSessionId !== undefined ||
      input.gradeLevel !== undefined || input.arm !== undefined || input.roomNumber !== undefined ||
      input.capacity !== undefined || input.classTeacherStaffId !== undefined;

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = hasExtended
        ? await client.query<ClassRecord>(
            `INSERT INTO production.classes
               (tenant_id, school_id, name, academic_year, section, department_id,
                academic_session_id, grade_level, arm, room_number, capacity, class_teacher_staff_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, tenant_id, school_id, name, academic_year, section,
                       status, class_teacher_staff_id, department_id, academic_session_id,
                       grade_level, arm, room_number, capacity, created_at, updated_at`,
            [
              actor.tenantId, input.schoolId, name, academicYear, section,
              input.departmentId ?? null, input.academicSessionId ?? null,
              gradeLevel, arm, roomNumber, capacity, input.classTeacherStaffId ?? null
            ]
          )
        : await client.query<ClassRecord>(
            `INSERT INTO production.classes (tenant_id, school_id, name, academic_year, section)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, tenant_id, school_id, name, academic_year, section,
                       status, class_teacher_staff_id, created_at`,
            [actor.tenantId, input.schoolId, name, academicYear, section]
          );
      return result.rows[0];
    });
  }

  async updateClass(
    actor: AuthorizedPrincipal,
    schoolId: string,
    classId: string,
    input: UpdateClassInput
  ): Promise<ClassRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.classesUpdate, 'class', classId);
    const fields: Array<[keyof UpdateClassInput, string, unknown]> = [];
    if (input.name !== undefined) fields.push(['name', 'name', normalizeText(input.name, 100)]);
    if (input.academicYear !== undefined) fields.push(['academicYear', 'academic_year', normalizeText(input.academicYear, 20)]);
    if (input.section !== undefined) fields.push(['section', 'section', normalizeText(input.section, 80)]);
    if (input.departmentId !== undefined) fields.push(['departmentId', 'department_id', input.departmentId]);
    if (input.academicSessionId !== undefined) fields.push(['academicSessionId', 'academic_session_id', input.academicSessionId]);
    if (input.gradeLevel !== undefined) fields.push(['gradeLevel', 'grade_level', normalizeText(input.gradeLevel, 60)]);
    if (input.arm !== undefined) fields.push(['arm', 'arm', normalizeText(input.arm, 40)]);
    if (input.roomNumber !== undefined) fields.push(['roomNumber', 'room_number', normalizeOptionalText(input.roomNumber, 40) ?? '']);
    if (input.capacity !== undefined) {
      if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 500) {
        throw new SchoolAdministrationError('INVALID_INPUT', 'Capacity must be between 1 and 500.');
      }
      fields.push(['capacity', 'capacity', input.capacity]);
    }
    if (input.classTeacherStaffId !== undefined) fields.push(['classTeacherStaffId', 'class_teacher_staff_id', input.classTeacherStaffId]);
    if (input.status !== undefined) {
      if (!['active', 'archived'].includes(input.status)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid class status.');
      fields.push(['status', 'status', input.status]);
    }
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one class field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column], index) => `${column} = $${index + 4}`);
      const result = await client.query<ClassRecord>(
        `UPDATE production.classes SET ${assignments.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, name, academic_year, section,
                   status, class_teacher_staff_id, department_id, academic_session_id,
                   grade_level, arm, room_number, capacity, created_at, updated_at`,
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

  // =========================================================================
  // STAFF ADMINISTRATION, LINKING, APPOINTMENTS & ALLOCATIONS
  // =========================================================================

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
                staff.staff_category, staff.employment_type, staff.phone, staff.photo_url,
                staff.qualification, staff.certifications, staff.trcn_number, staff.trcn_verified,
                staff.biometric_id, staff.max_periods_per_week, staff.hire_date::text,
                staff.separated_at, staff.separation_reason, staff.specialization_notes,
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
                first_name, last_name, email, designation, status,
                staff_category, employment_type, phone, photo_url, qualification,
                certifications, trcn_number, trcn_verified, biometric_id,
                max_periods_per_week, hire_date::text, separated_at, separation_reason,
                specialization_notes, created_at, updated_at
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
    const staffCategory = input.staffCategory ?? 'teaching';
    const employmentType = input.employmentType ?? 'full_time';
    if (!['teaching', 'administrative', 'support', 'executive'].includes(staffCategory)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid staff category.');
    }
    if (!['full_time', 'part_time', 'contract', 'visiting'].includes(employmentType)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid employment type.');
    }
    const hasExtended = input.staffCategory !== undefined || input.employmentType !== undefined ||
      input.phone !== undefined || input.photoUrl !== undefined || input.qualification !== undefined ||
      input.certifications !== undefined || input.trcnNumber !== undefined || input.trcnVerified !== undefined ||
      input.biometricId !== undefined || input.maxPeriodsPerWeek !== undefined ||
      input.hireDate !== undefined || input.specializationNotes !== undefined;

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = hasExtended
        ? await client.query<StaffRecord>(
            `INSERT INTO production.staff
               (tenant_id, school_id, department_id, staff_number, first_name,
                last_name, email, designation, staff_category, employment_type,
                phone, photo_url, qualification, certifications, trcn_number,
                trcn_verified, biometric_id, max_periods_per_week, hire_date, specialization_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19::date, $20)
             RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                       first_name, last_name, email, designation, status,
                       staff_category, employment_type, phone, photo_url, qualification,
                       certifications, trcn_number, trcn_verified, biometric_id,
                       max_periods_per_week, hire_date::text, separated_at, separation_reason,
                       specialization_notes, created_at, updated_at`,
            [
              actor.tenantId, input.schoolId, input.departmentId ?? null,
              staffNumber, firstName, lastName, email, designation,
              staffCategory, employmentType,
              normalizeOptionalText(input.phone, 40),
              normalizeOptionalText(input.photoUrl, 500),
              normalizeOptionalText(input.qualification, 200),
              JSON.stringify(input.certifications ?? []),
              normalizeOptionalText(input.trcnNumber, 80),
              Boolean(input.trcnVerified),
              normalizeOptionalText(input.biometricId, 120),
              input.maxPeriodsPerWeek ?? 24,
              input.hireDate ?? null,
              normalizeOptionalText(input.specializationNotes, 500)
            ]
          )
        : await client.query<StaffRecord>(
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
    const fields: Array<[string, string, unknown, string?]> = [];
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
    if (input.staffCategory !== undefined) fields.push(['staffCategory', 'staff_category', input.staffCategory]);
    if (input.employmentType !== undefined) fields.push(['employmentType', 'employment_type', input.employmentType]);
    if (input.phone !== undefined) fields.push(['phone', 'phone', normalizeOptionalText(input.phone, 40)]);
    if (input.photoUrl !== undefined) fields.push(['photoUrl', 'photo_url', normalizeOptionalText(input.photoUrl, 500)]);
    if (input.qualification !== undefined) fields.push(['qualification', 'qualification', normalizeOptionalText(input.qualification, 200)]);
    if (input.certifications !== undefined) fields.push(['certifications', 'certifications', JSON.stringify(input.certifications), '::jsonb']);
    if (input.trcnNumber !== undefined) fields.push(['trcnNumber', 'trcn_number', normalizeOptionalText(input.trcnNumber, 80)]);
    if (input.trcnVerified !== undefined) fields.push(['trcnVerified', 'trcn_verified', Boolean(input.trcnVerified)]);
    if (input.biometricId !== undefined) fields.push(['biometricId', 'biometric_id', normalizeOptionalText(input.biometricId, 120)]);
    if (input.maxPeriodsPerWeek !== undefined) fields.push(['maxPeriodsPerWeek', 'max_periods_per_week', Math.min(60, Math.max(1, Math.floor(input.maxPeriodsPerWeek)))]);
    if (input.hireDate !== undefined) fields.push(['hireDate', 'hire_date', input.hireDate, '::date']);
    if (input.specializationNotes !== undefined) fields.push(['specializationNotes', 'specialization_notes', normalizeOptionalText(input.specializationNotes, 500)]);
    if (fields.length === 0) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one staff field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column, , cast], index) => `${column} = $${index + 4}${cast ?? ''}`);
      const result = await client.query<StaffRecord>(
        `UPDATE production.staff SET ${assignments.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status,
                   staff_category, employment_type, phone, photo_url, qualification,
                   certifications, trcn_number, trcn_verified, biometric_id,
                   max_periods_per_week, hire_date::text, separated_at, separation_reason,
                   specialization_notes, created_at, updated_at`,
        [actor.tenantId, schoolId, staffId, ...fields.map(([, , value]) => value)]
      );
      const staff = result.rows[0];
      if (!staff) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      await this.recordStaffAudit(client, actor, staff, 'staff_record_updated', fields.map(([key]) => key));
      return staff;
    });
  }

  async linkStaffUserAccount(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    userId: string
  ): Promise<StaffRecord> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    assertValidUuid(userId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const membership = await client.query(
        `SELECT 1 FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND revoked_at IS NULL`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new SchoolAdministrationError('INVALID_INPUT', 'Active tenant membership is required.');
      const updated = await client.query<StaffRecord>(
        `UPDATE production.staff SET user_id = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status, created_at, updated_at`,
        [actor.tenantId, schoolId, staffId, userId]
      );
      if (!updated.rows[0]) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      await this.recordStaffAudit(client, actor, updated.rows[0], 'staff_account_linked', ['userId']);
      return updated.rows[0];
    });
  }

  async unlinkStaffUserAccount(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    reason: string
  ): Promise<StaffRecord> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    const cleanReason = normalizeText(reason, 300);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const updated = await client.query<StaffRecord>(
        `UPDATE production.staff SET user_id = NULL, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status, created_at, updated_at`,
        [actor.tenantId, schoolId, staffId]
      );
      if (!updated.rows[0]) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'staff_account_unlinked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, staffId, reason: cleanReason })]
      );
      return updated.rows[0];
    });
  }

  async appointStaffRole(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    roleCode: string
  ): Promise<{ staffId: string; userId: string; roleCode: string }> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    if (!SCHOOL_ROLE_SET.has(roleCode) || roleCode === PLATFORM_ADMIN_ROLE) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid school role code.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const staffRes = await client.query<{ id: string; user_id: string | null }>(
        `SELECT id, user_id FROM production.staff WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, staffId]
      );
      const staff = staffRes.rows[0];
      if (!staff) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      if (!staff.user_id) throw new SchoolAdministrationError('INVALID_INPUT', 'Staff member does not have a linked user account.');

      const actorPermsRes = await client.query<{ permission_code: string }>(
        `SELECT DISTINCT rp.permission_code
         FROM production.membership_role_assignments mra
         JOIN production.memberships m
           ON m.tenant_id = mra.tenant_id AND m.user_subject = mra.user_subject
         JOIN production.role_permissions rp ON rp.role_code = mra.role_code
         WHERE m.tenant_id = $1 AND m.user_id = $2 AND m.status = 'active' AND m.revoked_at IS NULL
           AND mra.revoked_at IS NULL`,
        [actor.tenantId, actor.userId]
      );
      const actorPerms = new Set(actorPermsRes.rows.map(r => r.permission_code));
      const targetRole = await client.query<{ permissions: string[] }>(
        `SELECT COALESCE(array_agg(permission_code) FILTER (WHERE permission_code IS NOT NULL), '{}') AS permissions
         FROM production.role_permissions WHERE role_code = $1`,
        [roleCode]
      );
      if (!targetRole.rows[0].permissions.every(p => actorPerms.has(p))) {
        throw new SchoolAdministrationError('FORBIDDEN', 'Cannot appoint role exceeding actor permissions.');
      }
      const membership = await client.query<{ user_subject: string }>(
        `SELECT user_subject FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND revoked_at IS NULL`,
        [actor.tenantId, staff.user_id]
      );
      if (!membership.rows[0]) throw new SchoolAdministrationError('INVALID_INPUT', 'Linked membership is inactive.');
      await client.query(
        `INSERT INTO production.membership_role_assignments (tenant_id, user_subject, role_code, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, user_subject, role_code) WHERE revoked_at IS NULL DO NOTHING`,
        [actor.tenantId, membership.rows[0].user_subject, roleCode, actor.userId]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'staff_role_appointed', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, staffId, userId: staff.user_id, roleCode })]
      );
      return { staffId, userId: staff.user_id, roleCode };
    });
  }

  async listStaffSubjectAllocations(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId?: string
  ): Promise<StaffSubjectAllocationRow[]> {
    assertAuthorized(actor, PERMISSIONS.staffRead);
    assertValidUuid(schoolId);
    if (staffId) assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      let staffClause = '';
      if (staffId) {
        values.push(staffId);
        staffClause = `AND staff_id = $${values.length}`;
      }
      const result = await client.query<StaffSubjectAllocationRow>(
        `SELECT id, tenant_id, school_id, staff_id, academic_session_id, subject_code,
                subject_name, class_id, periods_per_week, status, assigned_by, assigned_at, ended_at
         FROM production.staff_subject_allocations
         WHERE tenant_id = $1 AND school_id = $2 ${staffClause}
         ORDER BY status ASC, lower(subject_name)`,
        values
      );
      return result.rows;
    });
  }

  async allocateStaffSubject(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    input: AllocateStaffSubjectRequest
  ): Promise<StaffSubjectAllocationRow> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    const subjectCode = normalizeText(input.subjectCode, 64);
    const subjectName = normalizeText(input.subjectName, 160);
    const periodsPerWeek = Math.min(40, Math.max(1, Math.floor(input.periodsPerWeek ?? 4)));
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const staff = await client.query(
        `SELECT 1 FROM production.staff WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, staffId]
      );
      if (staff.rowCount !== 1) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      const result = await client.query<StaffSubjectAllocationRow>(
        `INSERT INTO production.staff_subject_allocations
           (tenant_id, school_id, staff_id, academic_session_id, subject_code,
            subject_name, class_id, periods_per_week, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, tenant_id, school_id, staff_id, academic_session_id, subject_code,
                   subject_name, class_id, periods_per_week, status, assigned_by, assigned_at, ended_at`,
        [
          actor.tenantId, schoolId, staffId, input.academicSessionId ?? null,
          subjectCode, subjectName, input.classId ?? null, periodsPerWeek, actor.userId
        ]
      );
      return result.rows[0];
    });
  }

  async revokeStaffSubjectAllocation(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    allocationId: string
  ): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    assertValidUuid(allocationId, 'ALLOCATION_NOT_FOUND');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      const updated = await client.query(
        `UPDATE production.staff_subject_allocations
         SET status = 'ended', ended_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND staff_id = $3 AND id = $4 AND status = 'active'`,
        [actor.tenantId, schoolId, staffId, allocationId]
      );
      if (updated.rowCount !== 1) throw new SchoolAdministrationError('ALLOCATION_NOT_FOUND');
    });
  }

  async transitionStaffStatus(
    actor: AuthorizedPrincipal,
    schoolId: string,
    staffId: string,
    toStatus: StaffRecord['status'],
    reason: string
  ): Promise<StaffRecord> {
    assertAuthorized(actor, PERMISSIONS.staffUpdate);
    assertValidUuid(schoolId);
    assertValidUuid(staffId, 'STAFF_NOT_FOUND');
    if (!['active', 'on_leave', 'suspended', 'retired', 'departed'].includes(toStatus)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid staff status.');
    }
    const cleanReason = normalizeText(reason, 500);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const current = await client.query<{ status: StaffRecord['status'] }>(
        `SELECT status FROM production.staff WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, staffId]
      );
      if (!current.rows[0]) throw new SchoolAdministrationError('STAFF_NOT_FOUND');
      const fromStatus = current.rows[0].status;
      if (fromStatus === toStatus) {
        throw new SchoolAdministrationError('INVALID_STATUS_TRANSITION', 'Staff member already in target status.');
      }
      const isSeparated = toStatus === 'retired' || toStatus === 'departed';
      const updated = await client.query<StaffRecord>(
        `UPDATE production.staff
         SET status = $4,
             separated_at = CASE WHEN $5::boolean THEN now() ELSE NULL END,
             separation_reason = CASE WHEN $5::boolean THEN $6 ELSE NULL END,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, department_id, staff_number,
                   first_name, last_name, email, designation, status,
                   separated_at, separation_reason, created_at, updated_at`,
        [actor.tenantId, schoolId, staffId, toStatus, isSeparated, cleanReason]
      );
      await client.query(
        `INSERT INTO production.staff_separation_history
           (tenant_id, school_id, staff_id, from_status, to_status, reason, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [actor.tenantId, schoolId, staffId, fromStatus, toStatus, cleanReason, actor.userId]
      );
      await this.recordStaffAudit(client, actor, updated.rows[0], 'staff_status_transitioned', ['status']);
      return updated.rows[0];
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

  // =========================================================================
  // STUDENT ADMISSIONS, REGISTERS, MEDICAL, DIGITAL ID & LIFECYCLE
  // =========================================================================

  async listAdmissions(
    actor: AuthorizedPrincipal,
    schoolId: string,
    status?: AdmissionRow['status']
  ): Promise<AdmissionRow[]> {
    assertAuthorized(actor, PERMISSIONS.admissionsRead);
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      let statusClause = '';
      if (status) {
        values.push(status);
        statusClause = `AND status = $${values.length}`;
      }
      const result = await client.query<AdmissionRow>(
        `SELECT id, tenant_id, school_id, application_number, first_name, last_name,
                middle_name, date_of_birth::text, gender, target_grade_level, target_class_id,
                academic_session_id, previous_school_name, previous_class, guardian_summary,
                documents, review_notes, status, reviewed_by, reviewed_at, approved_by,
                approved_at, enrolled_student_id, submitted_at, created_at, updated_at
         FROM production.student_admissions
         WHERE tenant_id = $1 AND school_id = $2 ${statusClause}
         ORDER BY submitted_at DESC`,
        values
      );
      return result.rows;
    });
  }

  async createAdmissionApplication(
    actor: AuthorizedPrincipal,
    schoolId: string,
    input: CreateStudentAdmissionRequest
  ): Promise<AdmissionRow> {
    assertAuthorized(actor, PERMISSIONS.admissionsManage);
    assertValidUuid(schoolId);
    const applicationNumber = normalizeText(input.applicationNumber, 64);
    const firstName = normalizeText(input.firstName, 100);
    const lastName = normalizeText(input.lastName, 100);
    const targetGradeLevel = normalizeText(input.targetGradeLevel, 60);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<AdmissionRow>(
        `INSERT INTO production.student_admissions
           (tenant_id, school_id, application_number, first_name, last_name, middle_name,
            date_of_birth, gender, target_grade_level, target_class_id, academic_session_id,
            previous_school_name, previous_class, guardian_summary, documents)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb)
         RETURNING id, tenant_id, school_id, application_number, first_name, last_name,
                   middle_name, date_of_birth::text, gender, target_grade_level, target_class_id,
                   academic_session_id, previous_school_name, previous_class, guardian_summary,
                   documents, review_notes, status, reviewed_by, reviewed_at, approved_by,
                   approved_at, enrolled_student_id, submitted_at, created_at, updated_at`,
        [
          actor.tenantId,
          schoolId,
          applicationNumber,
          firstName,
          lastName,
          normalizeOptionalText(input.middleName, 100),
          input.dateOfBirth ?? null,
          input.gender ?? null,
          targetGradeLevel,
          input.targetClassId ?? null,
          input.academicSessionId ?? null,
          normalizeOptionalText(input.previousSchoolName, 160),
          normalizeOptionalText(input.previousClass, 80),
          JSON.stringify(input.guardianSummary ?? {}),
          JSON.stringify(input.documents ?? [])
        ]
      );
      return result.rows[0];
    });
  }

  async reviewAdmission(
    actor: AuthorizedPrincipal,
    schoolId: string,
    admissionId: string,
    input: ReviewAdmissionRequest
  ): Promise<AdmissionRow> {
    assertAuthorized(actor, PERMISSIONS.admissionsManage);
    assertValidUuid(schoolId);
    assertValidUuid(admissionId, 'ADMISSION_NOT_FOUND');
    if (!['under_review', 'waitlisted', 'approved', 'rejected'].includes(input.decision)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid review decision.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const current = await client.query<{ status: AdmissionRow['status'] }>(
        `SELECT status FROM production.student_admissions
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, admissionId]
      );
      if (!current.rows[0]) throw new SchoolAdministrationError('ADMISSION_NOT_FOUND');
      if (current.rows[0].status === 'enrolled') {
        throw new SchoolAdministrationError('INVALID_STATUS_TRANSITION', 'Enrolled applications cannot be re-reviewed.');
      }
      const isApproved = input.decision === 'approved';
      const result = await client.query<AdmissionRow>(
        `UPDATE production.student_admissions
         SET status = $4,
             review_notes = COALESCE($5, review_notes),
             reviewed_by = $6,
             reviewed_at = now(),
             approved_by = CASE WHEN $7::boolean THEN $6 ELSE approved_by END,
             approved_at = CASE WHEN $7::boolean THEN now() ELSE approved_at END,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, application_number, first_name, last_name,
                   middle_name, date_of_birth::text, gender, target_grade_level, target_class_id,
                   academic_session_id, previous_school_name, previous_class, guardian_summary,
                   documents, review_notes, status, reviewed_by, reviewed_at, approved_by,
                   approved_at, enrolled_student_id, submitted_at, created_at, updated_at`,
        [
          actor.tenantId,
          schoolId,
          admissionId,
          input.decision,
          normalizeOptionalText(input.reviewNotes, 1000),
          actor.userId,
          isApproved
        ]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'admission_reviewed', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, admissionId, decision: input.decision })]
      );
      return result.rows[0];
    });
  }

  async enrollAdmission(
    actor: AuthorizedPrincipal,
    schoolId: string,
    admissionId: string,
    input: EnrollAdmissionRequest
  ): Promise<{ admission: AdmissionRow; student: StudentRecord }> {
    assertAuthorized(actor, PERMISSIONS.admissionsManage);
    assertAuthorized(actor, PERMISSIONS.studentsAdmit);
    assertValidUuid(schoolId);
    assertValidUuid(admissionId, 'ADMISSION_NOT_FOUND');
    const admissionNumber = normalizeText(input.admissionNumber, 100);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const admRes = await client.query<AdmissionRow>(
        `SELECT id, tenant_id, school_id, application_number, first_name, last_name,
                date_of_birth::text, gender, target_class_id, status
         FROM production.student_admissions
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, admissionId]
      );
      const adm = admRes.rows[0];
      if (!adm) throw new SchoolAdministrationError('ADMISSION_NOT_FOUND');
      if (adm.status !== 'approved') {
        throw new SchoolAdministrationError('INVALID_STATUS_TRANSITION', 'Only approved admissions can be enrolled.');
      }
      const classId = input.classId ?? adm.target_class_id ?? null;
      if (classId) {
        const cls = await client.query(
          `SELECT 1 FROM production.classes WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
          [actor.tenantId, schoolId, classId]
        );
        if (cls.rowCount !== 1) throw new SchoolAdministrationError('CLASS_NOT_FOUND');
      }

      const studentRes = await client.query<StudentRecord>(
        `INSERT INTO production.students
           (tenant_id, school_id, class_id, admission_number, first_name, last_name,
            date_of_birth, gender, lifecycle_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, 'enrolled')
         RETURNING id, tenant_id, school_id, class_id, admission_number, first_name,
                   last_name, lifecycle_status, date_of_birth::text, gender, created_at, updated_at`,
        [actor.tenantId, schoolId, classId, admissionNumber, adm.first_name, adm.last_name, adm.date_of_birth, adm.gender]
      );
      const student = studentRes.rows[0];
      if (classId) {
        await client.query(
          `INSERT INTO production.student_class_assignments
             (tenant_id, school_id, student_id, class_id, assigned_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [actor.tenantId, schoolId, student.id, classId, actor.userId]
        );
      }
      const updatedAdm = await client.query<AdmissionRow>(
        `UPDATE production.student_admissions
         SET status = 'enrolled', enrolled_student_id = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, application_number, first_name, last_name,
                   middle_name, date_of_birth::text, gender, target_grade_level, target_class_id,
                   academic_session_id, previous_school_name, previous_class, guardian_summary,
                   documents, review_notes, status, reviewed_by, reviewed_at, approved_by,
                   approved_at, enrolled_student_id, submitted_at, created_at, updated_at`,
        [actor.tenantId, schoolId, admissionId, student.id]
      );
      await this.recordEvent(client, actor, student, 'enrolled', 'admitted', 'enrolled', null, classId, { admissionId });
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'admission_enrolled', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, admissionId, studentId: student.id })]
      );
      return { admission: updatedAdm.rows[0], student };
    });
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
                student.lifecycle_status, student.date_of_birth::text, student.gender,
                student.nationality, student.state_of_origin, student.lga_of_origin,
                student.residential_address, student.previous_school_history,
                student.academic_history_summary, student.emergency_contacts,
                student.photo_url, student.rfid_card_uid, student.digital_id_code,
                student.user_id, student.created_at, student.updated_at
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
    const hasExtended = input.dateOfBirth !== undefined || input.gender !== undefined ||
      input.nationality !== undefined || input.stateOfOrigin !== undefined ||
      input.lgaOfOrigin !== undefined || input.residentialAddress !== undefined ||
      input.previousSchoolHistory !== undefined || input.academicHistorySummary !== undefined ||
      input.emergencyContacts !== undefined || input.photoUrl !== undefined ||
      input.rfidCardUid !== undefined;

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = hasExtended
        ? await client.query<StudentRecord>(
            `INSERT INTO production.students
               (tenant_id, school_id, admission_number, first_name, last_name, lifecycle_status,
                date_of_birth, gender, nationality, state_of_origin, lga_of_origin,
                residential_address, previous_school_history, academic_history_summary,
                emergency_contacts, photo_url, rfid_card_uid)
             VALUES ($1, $2, $3, $4, $5, 'applicant', $6::date, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16)
             RETURNING id, tenant_id, school_id, class_id, admission_number, first_name, last_name,
                       lifecycle_status, date_of_birth::text, gender, nationality, state_of_origin,
                       lga_of_origin, residential_address, previous_school_history,
                       academic_history_summary, emergency_contacts, photo_url, rfid_card_uid,
                       digital_id_code, user_id, created_at, updated_at`,
            [
              actor.tenantId, input.schoolId, admissionNumber, firstName, lastName,
              input.dateOfBirth ?? null, input.gender ?? null,
              normalizeOptionalText(input.nationality, 100),
              normalizeOptionalText(input.stateOfOrigin, 100),
              normalizeOptionalText(input.lgaOfOrigin, 100),
              normalizeOptionalText(input.residentialAddress, 500),
              JSON.stringify(input.previousSchoolHistory ?? []),
              JSON.stringify(input.academicHistorySummary ?? {}),
              JSON.stringify(input.emergencyContacts ?? []),
              normalizeOptionalText(input.photoUrl, 500),
              normalizeOptionalText(input.rfidCardUid, 120)
            ]
          )
        : await client.query<StudentRecord>(
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

  async updateStudent(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    input: UpdateStudentInput
  ): Promise<StudentRecord> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsUpdate, 'student', studentId);
    const fields: Array<[string, string, unknown, string?]> = [];
    if (input.admissionNumber !== undefined) {
      fields.push(['admissionNumber', 'admission_number', normalizeText(input.admissionNumber, 100)]);
    }
    if (input.firstName !== undefined) fields.push(['firstName', 'first_name', normalizeText(input.firstName, 100)]);
    if (input.lastName !== undefined) fields.push(['lastName', 'last_name', normalizeText(input.lastName, 100)]);
    if (input.dateOfBirth !== undefined) fields.push(['dateOfBirth', 'date_of_birth', input.dateOfBirth, '::date']);
    if (input.gender !== undefined) fields.push(['gender', 'gender', input.gender]);
    if (input.nationality !== undefined) fields.push(['nationality', 'nationality', normalizeOptionalText(input.nationality, 100)]);
    if (input.stateOfOrigin !== undefined) fields.push(['stateOfOrigin', 'state_of_origin', normalizeOptionalText(input.stateOfOrigin, 100)]);
    if (input.lgaOfOrigin !== undefined) fields.push(['lgaOfOrigin', 'lga_of_origin', normalizeOptionalText(input.lgaOfOrigin, 100)]);
    if (input.residentialAddress !== undefined) fields.push(['residentialAddress', 'residential_address', normalizeOptionalText(input.residentialAddress, 500)]);
    if (input.previousSchoolHistory !== undefined) fields.push(['previousSchoolHistory', 'previous_school_history', JSON.stringify(input.previousSchoolHistory), '::jsonb']);
    if (input.academicHistorySummary !== undefined) fields.push(['academicHistorySummary', 'academic_history_summary', JSON.stringify(input.academicHistorySummary), '::jsonb']);
    if (input.emergencyContacts !== undefined) fields.push(['emergencyContacts', 'emergency_contacts', JSON.stringify(input.emergencyContacts), '::jsonb']);
    if (input.photoUrl !== undefined) fields.push(['photoUrl', 'photo_url', normalizeOptionalText(input.photoUrl, 500)]);
    if (input.rfidCardUid !== undefined) fields.push(['rfidCardUid', 'rfid_card_uid', normalizeOptionalText(input.rfidCardUid, 120)]);
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one student field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const assignments = fields.map(([, column, , cast], index) => `${column} = $${index + 4}${cast ?? ''}`);
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

  async getStudent(actor: AuthorizedPrincipal, schoolId: string, studentId: string): Promise<StudentRecord> {
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id, class_id, admission_number, first_name,
                last_name, lifecycle_status, date_of_birth::text, gender, nationality,
                state_of_origin, lga_of_origin, residential_address,
                previous_school_history, academic_history_summary, emergency_contacts,
                photo_url, rfid_card_uid, digital_id_code, user_id, created_at, updated_at
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
    const permission = transition.type === 'admit' || transition.type === 'enroll' || transition.type === 'activate'
      ? PERMISSIONS.studentsAdmit
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
        enroll: { allowedFrom: ['admitted'], to: 'enrolled', event: 'enrolled' },
        activate: { allowedFrom: ['admitted', 'enrolled'], to: 'active', event: 'activated' },
        suspend: { allowedFrom: ['enrolled', 'active'], to: 'suspended', event: 'suspended' },
        external_transfer: { allowedFrom: ['active', 'enrolled'], to: 'transferred', event: 'external_transfer' },
        graduate: { allowedFrom: ['active'], to: 'graduated', event: 'graduated' },
        withdraw: { allowedFrom: ['admitted', 'enrolled', 'active', 'suspended'], to: 'withdrawn', event: 'withdrawn' },
        reinstate: { allowedFrom: ['withdrawn', 'suspended'], to: 'active', event: 'reinstated' }
      };
      const target = transitionTable[transition.type];
      if (!target.allowedFrom.includes(student.lifecycle_status)) {
        throw new SchoolAdministrationError('INVALID_STUDENT_TRANSITION');
      }
      if (transition.type === 'external_transfer') normalizeText(transition.destination, 255);
      if (transition.type === 'withdraw' || transition.type === 'reinstate' || transition.type === 'suspend') {
        normalizeText(transition.reason, 500);
      }
      const details = transition.type === 'external_transfer'
        ? { destination: normalizeText(transition.destination, 255) }
        : transition.type === 'withdraw' || transition.type === 'reinstate' || transition.type === 'suspend'
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
      if (!['admitted', 'enrolled', 'active'].includes(student.lifecycle_status)) {
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

  async getStudentMedicalProfile(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<MedicalProfileRow | null> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsMedicalRead, 'student', studentId);
    assertValidUuid(schoolId);
    assertValidUuid(studentId, 'STUDENT_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<MedicalProfileRow>(
        `SELECT tenant_id, school_id, student_id, blood_group, genotype, allergies,
                chronic_conditions, immunization_summary, dietary_restrictions,
                physician_name, physician_phone, medical_notes,
                consent_for_emergency_care, updated_by, created_at, updated_at
         FROM production.student_medical_profiles
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3`,
        [actor.tenantId, schoolId, studentId]
      );
      return result.rows[0] ?? null;
    });
  }

  async upsertStudentMedicalProfile(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    input: UpsertStudentMedicalProfileRequest
  ): Promise<MedicalProfileRow> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsMedicalManage, 'student', studentId);
    assertValidUuid(schoolId);
    assertValidUuid(studentId, 'STUDENT_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const studentCheck = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id FROM production.students WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, studentId]
      );
      if (!studentCheck.rows[0]) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');

      const result = await client.query<MedicalProfileRow>(
        `INSERT INTO production.student_medical_profiles
           (tenant_id, school_id, student_id, blood_group, genotype, allergies,
            chronic_conditions, immunization_summary, dietary_restrictions,
            physician_name, physician_phone, medical_notes, consent_for_emergency_care, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14)
         ON CONFLICT (tenant_id, student_id) DO UPDATE SET
           blood_group = COALESCE($4, production.student_medical_profiles.blood_group),
           genotype = COALESCE($5, production.student_medical_profiles.genotype),
           allergies = $6::jsonb,
           chronic_conditions = $7::jsonb,
           immunization_summary = $8::jsonb,
           dietary_restrictions = $9::jsonb,
           physician_name = COALESCE($10, production.student_medical_profiles.physician_name),
           physician_phone = COALESCE($11, production.student_medical_profiles.physician_phone),
           medical_notes = COALESCE($12, production.student_medical_profiles.medical_notes),
           consent_for_emergency_care = $13,
           updated_by = $14,
           updated_at = now()
         RETURNING tenant_id, school_id, student_id, blood_group, genotype, allergies,
                   chronic_conditions, immunization_summary, dietary_restrictions,
                   physician_name, physician_phone, medical_notes,
                   consent_for_emergency_care, updated_by, created_at, updated_at`,
        [
          actor.tenantId,
          schoolId,
          studentId,
          input.bloodGroup ?? null,
          input.genotype ?? null,
          JSON.stringify(input.allergies ?? []),
          JSON.stringify(input.chronicConditions ?? []),
          JSON.stringify(input.immunizationSummary ?? {}),
          JSON.stringify(input.dietaryRestrictions ?? []),
          normalizeOptionalText(input.physicianName, 160),
          normalizeOptionalText(input.physicianPhone, 40),
          normalizeOptionalText(input.medicalNotes, 2000),
          Boolean(input.consentForEmergencyCare),
          actor.userId
        ]
      );
      await this.recordEvent(client, actor, studentCheck.rows[0], 'medical_updated', null, null, null, null, {});
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'student_medical_profile_updated', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, studentId })]
      );
      return result.rows[0];
    });
  }

  async getStudentDigitalIdCard(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<DigitalIdCardRow | null> {
    const student = await this.getStudent(actor, schoolId, studentId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<DigitalIdCardRow>(
        `SELECT id, tenant_id, school_id, student_id, card_number, issued_by,
                issued_at, expires_at, revoked_at, revoked_reason, status
         FROM production.student_digital_id_cards
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3
         ORDER BY issued_at DESC
         LIMIT 1`,
        [actor.tenantId, schoolId, student.id]
      );
      return result.rows[0] ?? null;
    });
  }

  async issueStudentDigitalIdCard(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    expiresInDays = 365
  ): Promise<{ card: DigitalIdCardRow; qrToken: string }> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsUpdate, 'student', studentId);
    assertValidUuid(schoolId);
    assertValidUuid(studentId, 'STUDENT_NOT_FOUND');
    const days = Math.min(1825, Math.max(30, Math.floor(expiresInDays)));
    const qrToken = randomBytes(24).toString('base64url');
    const qrTokenHash = createHash('sha256').update(qrToken).digest();
    const cardNumber = `ID-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const studentRes = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id FROM production.students WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [actor.tenantId, schoolId, studentId]
      );
      const student = studentRes.rows[0];
      if (!student) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');

      await client.query(
        `UPDATE production.student_digital_id_cards
         SET status = 'revoked', revoked_at = now(), revoked_reason = 'Superseded by new card'
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3 AND status = 'active'`,
        [actor.tenantId, schoolId, studentId]
      );
      const inserted = await client.query<DigitalIdCardRow>(
        `INSERT INTO production.student_digital_id_cards
           (tenant_id, school_id, student_id, card_number, qr_token_hash, issued_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(days => $7))
         RETURNING id, tenant_id, school_id, student_id, card_number, issued_by,
                   issued_at, expires_at, revoked_at, revoked_reason, status`,
        [actor.tenantId, schoolId, studentId, cardNumber, qrTokenHash, actor.userId, days]
      );
      await client.query(
        `UPDATE production.students SET digital_id_code = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, studentId, cardNumber]
      );
      await this.recordEvent(client, actor, student, 'id_card_issued', null, null, null, null, { cardNumber });
      return { card: inserted.rows[0], qrToken };
    });
  }

  async revokeStudentDigitalIdCard(
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string,
    reason: string
  ): Promise<DigitalIdCardRow> {
    assertResourceAuthorized(actor, PERMISSIONS.studentsUpdate, 'student', studentId);
    assertValidUuid(schoolId);
    assertValidUuid(studentId, 'STUDENT_NOT_FOUND');
    const cleanReason = normalizeText(reason, 300);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const updated = await client.query<DigitalIdCardRow>(
        `UPDATE production.student_digital_id_cards
         SET status = 'revoked', revoked_at = now(), revoked_reason = $4
         WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3 AND status = 'active'
         RETURNING id, tenant_id, school_id, student_id, card_number, issued_by,
                   issued_at, expires_at, revoked_at, revoked_reason, status`,
        [actor.tenantId, schoolId, studentId, cleanReason]
      );
      if (!updated.rows[0]) throw new SchoolAdministrationError('DIGITAL_ID_NOT_FOUND');
      return updated.rows[0];
    });
  }

  // =========================================================================
  // GUARDIAN & PARENT MANAGEMENT
  // =========================================================================

  async listGuardians(
    actor: AuthorizedPrincipal,
    schoolId: string,
    search?: string
  ): Promise<GuardianRow[]> {
    assertAuthorized(actor, PERMISSIONS.guardiansRead);
    assertValidUuid(schoolId);
    const term = search?.trim().slice(0, 100) || null;
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId, schoolId];
      let searchClause = '';
      if (term) {
        values.push(`%${term}%`);
        searchClause = `AND (full_name ILIKE $${values.length} OR phone ILIKE $${values.length} OR email ILIKE $${values.length})`;
      }
      const result = await client.query<GuardianRow>(
        `SELECT id, tenant_id, school_id, user_id, full_name, email, phone,
                alternate_phone, occupation, residential_address, identity_document_type,
                verification_status, verified_by, verified_at, status, created_at, updated_at
         FROM production.guardians
         WHERE tenant_id = $1 AND school_id = $2 ${searchClause}
         ORDER BY lower(full_name)`,
        values
      );
      return result.rows;
    });
  }

  async createGuardian(
    actor: AuthorizedPrincipal,
    schoolId: string,
    input: CreateGuardianRequest
  ): Promise<GuardianRow> {
    assertAuthorized(actor, PERMISSIONS.guardiansManage);
    assertValidUuid(schoolId);
    const fullName = normalizeText(input.fullName, 160);
    const phone = normalizeText(input.phone, 40);
    const email = normalizeOptionalText(input.email, 254)?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'A valid guardian email is required.');
    }
    if (input.userId) assertValidUuid(input.userId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<GuardianRow>(
        `INSERT INTO production.guardians
           (tenant_id, school_id, user_id, full_name, email, phone, alternate_phone,
            occupation, residential_address, identity_document_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, tenant_id, school_id, user_id, full_name, email, phone,
                   alternate_phone, occupation, residential_address, identity_document_type,
                   verification_status, verified_by, verified_at, status, created_at, updated_at`,
        [
          actor.tenantId,
          schoolId,
          input.userId ?? null,
          fullName,
          email,
          phone,
          normalizeOptionalText(input.alternatePhone, 40),
          normalizeOptionalText(input.occupation, 120),
          normalizeOptionalText(input.residentialAddress, 500),
          normalizeOptionalText(input.identityDocumentType, 80)
        ]
      );
      return result.rows[0];
    });
  }

  async updateGuardian(
    actor: AuthorizedPrincipal,
    schoolId: string,
    guardianId: string,
    input: UpdateGuardianRequest
  ): Promise<GuardianRow> {
    assertAuthorized(actor, PERMISSIONS.guardiansManage);
    assertValidUuid(schoolId);
    assertValidUuid(guardianId, 'GUARDIAN_NOT_FOUND');
    const fields: Array<[string, unknown]> = [];
    if (input.fullName !== undefined) fields.push(['full_name', normalizeText(input.fullName, 160)]);
    if (input.phone !== undefined) fields.push(['phone', normalizeText(input.phone, 40)]);
    if (input.email !== undefined) fields.push(['email', normalizeOptionalText(input.email, 254)?.toLowerCase() ?? null]);
    if (input.alternatePhone !== undefined) fields.push(['alternate_phone', normalizeOptionalText(input.alternatePhone, 40)]);
    if (input.occupation !== undefined) fields.push(['occupation', normalizeOptionalText(input.occupation, 120)]);
    if (input.residentialAddress !== undefined) fields.push(['residential_address', normalizeOptionalText(input.residentialAddress, 500)]);
    if (input.identityDocumentType !== undefined) fields.push(['identity_document_type', normalizeOptionalText(input.identityDocumentType, 80)]);
    if (input.userId !== undefined) {
      if (input.userId) assertValidUuid(input.userId);
      fields.push(['user_id', input.userId]);
    }
    if (input.status !== undefined) {
      if (!['active', 'inactive'].includes(input.status)) throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid status.');
      fields.push(['status', input.status]);
    }
    if (!fields.length) throw new SchoolAdministrationError('INVALID_INPUT', 'At least one field is required.');

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const sets = fields.map(([col], i) => `${col} = $${i + 4}`);
      const result = await client.query<GuardianRow>(
        `UPDATE production.guardians SET ${sets.join(', ')}, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, full_name, email, phone,
                   alternate_phone, occupation, residential_address, identity_document_type,
                   verification_status, verified_by, verified_at, status, created_at, updated_at`,
        [actor.tenantId, schoolId, guardianId, ...fields.map(f => f[1])]
      );
      if (!result.rows[0]) throw new SchoolAdministrationError('GUARDIAN_NOT_FOUND');
      return result.rows[0];
    });
  }

  async verifyGuardian(
    actor: AuthorizedPrincipal,
    schoolId: string,
    guardianId: string,
    status: 'verified' | 'rejected' | 'suspended'
  ): Promise<GuardianRow> {
    assertAuthorized(actor, PERMISSIONS.guardiansVerify);
    assertValidUuid(schoolId);
    assertValidUuid(guardianId, 'GUARDIAN_NOT_FOUND');
    if (!['verified', 'rejected', 'suspended'].includes(status)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid verification status.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<GuardianRow>(
        `UPDATE production.guardians
         SET verification_status = $4,
             verified_by = $5,
             verified_at = now(),
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING id, tenant_id, school_id, user_id, full_name, email, phone,
                   alternate_phone, occupation, residential_address, identity_document_type,
                   verification_status, verified_by, verified_at, status, created_at, updated_at`,
        [actor.tenantId, schoolId, guardianId, status, actor.userId]
      );
      if (!result.rows[0]) throw new SchoolAdministrationError('GUARDIAN_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'guardian_verification_updated', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, guardianId, verificationStatus: status })]
      );
      return result.rows[0];
    });
  }

  async linkStudentGuardian(
    actor: AuthorizedPrincipal,
    schoolId: string,
    guardianId: string,
    input: LinkStudentGuardianRequest
  ): Promise<StudentGuardianRow> {
    assertAuthorized(actor, PERMISSIONS.guardiansManage);
    assertValidUuid(schoolId);
    assertValidUuid(guardianId, 'GUARDIAN_NOT_FOUND');
    assertValidUuid(input.studentId, 'STUDENT_NOT_FOUND');
    if (!['mother', 'father', 'legal_guardian', 'sponsor', 'sibling', 'other'].includes(input.relationshipType)) {
      throw new SchoolAdministrationError('INVALID_INPUT', 'Invalid relationship type.');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const studentRes = await client.query<StudentRecord>(
        `SELECT id, tenant_id, school_id FROM production.students WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, input.studentId]
      );
      if (!studentRes.rows[0]) throw new SchoolAdministrationError('STUDENT_NOT_FOUND');
      const guardianRes = await client.query(
        `SELECT 1 FROM production.guardians WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, guardianId]
      );
      if (guardianRes.rowCount !== 1) throw new SchoolAdministrationError('GUARDIAN_NOT_FOUND');

      if (input.isPrimary) {
        await client.query(
          `UPDATE production.student_guardians
           SET is_primary = false, updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3 AND is_primary = true`,
          [actor.tenantId, schoolId, input.studentId]
        );
      }

      const result = await client.query<StudentGuardianRow>(
        `INSERT INTO production.student_guardians
           (tenant_id, school_id, student_id, guardian_id, relationship_type,
            is_primary, is_financial_sponsor, is_emergency_contact, authorized_pickup,
            can_view_academic_records, can_view_medical_summary, status, linked_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12)
         ON CONFLICT (tenant_id, school_id, student_id, guardian_id) DO UPDATE SET
           relationship_type = EXCLUDED.relationship_type,
           is_primary = EXCLUDED.is_primary,
           is_financial_sponsor = EXCLUDED.is_financial_sponsor,
           is_emergency_contact = EXCLUDED.is_emergency_contact,
           authorized_pickup = EXCLUDED.authorized_pickup,
           can_view_academic_records = EXCLUDED.can_view_academic_records,
           can_view_medical_summary = EXCLUDED.can_view_medical_summary,
           status = 'active',
           updated_at = now()
         RETURNING id, tenant_id, school_id, student_id, guardian_id, relationship_type,
                   is_primary, is_financial_sponsor, is_emergency_contact, authorized_pickup,
                   can_view_academic_records, can_view_medical_summary, status, created_at, updated_at`,
        [
          actor.tenantId,
          schoolId,
          input.studentId,
          guardianId,
          input.relationshipType,
          Boolean(input.isPrimary),
          Boolean(input.isFinancialSponsor),
          input.isEmergencyContact ?? true,
          input.authorizedPickup ?? true,
          input.canViewAcademicRecords ?? true,
          Boolean(input.canViewMedicalSummary),
          actor.userId
        ]
      );
      await this.recordEvent(
        client,
        actor,
        studentRes.rows[0],
        'guardian_linked',
        null,
        null,
        null,
        null,
        { guardianId, relationshipType: input.relationshipType, isPrimary: Boolean(input.isPrimary) }
      );
      return result.rows[0];
    });
  }

  async unlinkStudentGuardian(
    actor: AuthorizedPrincipal,
    schoolId: string,
    guardianId: string,
    studentId: string
  ): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.guardiansManage);
    assertValidUuid(schoolId);
    assertValidUuid(guardianId, 'GUARDIAN_NOT_FOUND');
    assertValidUuid(studentId, 'STUDENT_NOT_FOUND');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      const updated = await client.query(
        `UPDATE production.student_guardians
         SET status = 'inactive', is_primary = false, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND guardian_id = $3 AND student_id = $4 AND status = 'active'`,
        [actor.tenantId, schoolId, guardianId, studentId]
      );
      if (updated.rowCount !== 1) throw new SchoolAdministrationError('GUARDIAN_NOT_FOUND');
    });
  }

  async listMyWards(
    actor: AuthorizedPrincipal,
    schoolId: string
  ): Promise<Array<{
    student: StudentRecord;
    relationshipType: StudentGuardianRow['relationship_type'];
    isPrimary: boolean;
    canViewAcademicRecords: boolean;
    canViewMedicalSummary: boolean;
  }>> {
    if (!actor.hasPermission(PERMISSIONS.guardiansRead) && !actor.roles.includes('parent')) {
      throw new SchoolAdministrationError('FORBIDDEN');
    }
    assertValidUuid(schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const rows = await client.query<StudentRecord & {
        relationship_type: StudentGuardianRow['relationship_type'];
        is_primary: boolean;
        can_view_academic_records: boolean;
        can_view_medical_summary: boolean;
      }>(
        `SELECT s.id, s.tenant_id, s.school_id, s.class_id, s.admission_number,
                s.first_name, s.last_name, s.lifecycle_status, s.photo_url,
                s.created_at, s.updated_at,
                sg.relationship_type, sg.is_primary,
                sg.can_view_academic_records, sg.can_view_medical_summary
         FROM production.guardians g
         JOIN production.student_guardians sg
           ON sg.tenant_id = g.tenant_id AND sg.school_id = g.school_id AND sg.guardian_id = g.id
         JOIN production.students s
           ON s.tenant_id = sg.tenant_id AND s.school_id = sg.school_id AND s.id = sg.student_id
         WHERE g.tenant_id = $1 AND g.school_id = $2 AND g.user_id = $3
           AND g.status = 'active' AND g.verification_status = 'verified' AND sg.status = 'active'
         ORDER BY sg.is_primary DESC, lower(s.first_name)`,
        [actor.tenantId, schoolId, actor.userId]
      );
      return rows.rows.map(r => ({
        student: {
          id: r.id,
          tenant_id: r.tenant_id,
          school_id: r.school_id,
          class_id: r.class_id,
          admission_number: r.admission_number,
          first_name: r.first_name,
          last_name: r.last_name,
          lifecycle_status: r.lifecycle_status,
          photo_url: r.photo_url,
          created_at: r.created_at,
          updated_at: r.updated_at
        },
        relationshipType: r.relationship_type,
        isPrimary: r.is_primary,
        canViewAcademicRecords: r.can_view_academic_records,
        canViewMedicalSummary: r.can_view_medical_summary
      }));
    });
  }

  private async recordEvent(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    student: Pick<StudentRecord, 'id' | 'school_id'>,
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
