import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { ApplicationTemplateRepository } from './applicationTemplateRepository';
import {
  SchoolAdministrationError,
  SchoolAdministrationRepository
} from './schoolAdministrationRepository';
import { SchoolProvisioningRepository } from './schoolProvisioningRepository';
import { principal } from './testSupport';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS, TENANT_ROLES } from '../authorization/permissions';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const SCHOOL_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_USER_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';
const DEPT_ID = '55555555-5555-4555-8555-555555555555';
const ACADEMIC_SESSION_ID = '66666666-6666-4666-8666-666666666666';
const ACADEMIC_TERM_ID = '77777777-7777-4777-8777-777777777777';
const CLASS_ID = '88888888-8888-4888-8888-888888888888';
const ADMISSION_ID = '99999999-9999-4999-8999-999999999999';
const STUDENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GUARDIAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STAFF_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ALLOCATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CARD_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function makeResult<R extends QueryResultRow>(rows: QueryResultRow[] = [], rowCount = rows.length): QueryResult<R> {
  return { rows: rows as R[], command: 'SELECT', rowCount, oid: 0, fields: [] };
}

class Prompt1MockPool implements DatabasePool {
  readonly statements: Array<{ text: string; values?: unknown[] }> = [];

  constructor(
    private readonly handler: (text: string, values?: unknown[]) => QueryResult<QueryResultRow> | undefined = () => undefined
  ) {}

  private readonly client: DatabaseClient = {
    query: async <R extends QueryResultRow>(text: string, values?: unknown[]) => {
      this.statements.push({ text, values });
      const handled = this.handler(text, values);
      if (handled) return handled as QueryResult<R>;
      return makeResult<R>();
    },
    release: () => undefined
  };

  async query<R extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
    return this.client.query<R>(text, values);
  }

  async connect(): Promise<DatabaseClient> {
    return this.client;
  }

  async end(): Promise<void> {}
  on(): this { return this; }
}

function adminPrincipal() {
  return createAuthorizedPrincipal({
    tenant: principal(TENANT_ID),
    userId: ADMIN_USER_ID,
    sessionId: SESSION_ID,
    grants: [{
      roleCode: TENANT_ROLES.tenantAdmin,
      permissions: Object.values(PERMISSIONS),
      scopes: []
    }]
  });
}

test('institutional identity, status transitions, department cycle protection, and academic session activation work cleanly', async () => {
  let institutionalStatus: 'pending_activation' | 'active' | 'suspended' | 'decommissioned' = 'pending_activation';
  const pool = new Prompt1MockPool((text, values) => {
    if (text.includes('SELECT id, tenant_id, name, short_name') && text.includes('FROM production.schools')) {
      return makeResult([{
        id: SCHOOL_ID,
        tenant_id: TENANT_ID,
        name: 'Greenfield International College',
        short_name: 'GIC',
        legal_name: 'Greenfield Educational Trust Ltd.',
        registered_identity: 'RC-998812',
        school_type: 'Secondary',
        ownership: 'private',
        educational_classification: 'Secondary (JSS/SSS)',
        country: 'Nigeria',
        state_province: 'Lagos',
        city: 'Ikeja',
        physical_address: '14 Unity Road',
        administrative_address: '14 Unity Road',
        postal_code: '100001',
        official_contact_email: 'office@greenfield.edu.ng',
        telephone: '+2348000000001',
        website: 'https://greenfield.edu.ng',
        motto: 'Excellence and Integrity',
        principal_name: 'Dr. Bello',
        principal_email: 'principal@greenfield.edu.ng',
        principal_phone: '+2348000000002',
        ict_administrator_name: 'Tunde Salami',
        ict_administrator_email: 'ict@greenfield.edu.ng',
        ict_administrator_phone: '+2348000000003',
        logo_url: null,
        primary_brand_color: '#1E3A8A',
        accent_brand_color: '#0D9488',
        operational_policies: { attendanceGraceMinutes: 15 },
        institutional_status: institutionalStatus,
        activated_at: institutionalStatus === 'active' ? new Date() : null
      }]);
    }
    if (text.includes('UPDATE production.schools')) {
      if (text.includes('SET institutional_status = $3')) {
        institutionalStatus = values?.[2] as typeof institutionalStatus;
      }
      return makeResult([{
        id: SCHOOL_ID,
        tenant_id: TENANT_ID,
        name: 'Greenfield College Updated',
        institutional_status: institutionalStatus,
        activated_at: new Date()
      }]);
    }
    if (text.includes('SELECT institutional_status FROM production.schools')) {
      return makeResult([{ institutional_status: institutionalStatus }]);
    }
    if (text.includes('FROM production.school_status_history')) {
      return makeResult([{
        id: 'hist-1',
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        from_status: 'pending_activation',
        to_status: 'active',
        reason: 'Verified launch checklist',
        changed_by: ADMIN_USER_ID,
        evidence: { verified: true },
        occurred_at: new Date()
      }]);
    }
    if (text.includes('INSERT INTO production.school_departments')) {
      return makeResult([{
        id: DEPT_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        name: 'Sciences',
        code: 'SCI',
        unit_type: 'academic',
        parent_department_id: null,
        head_staff_id: null,
        description: 'Natural sciences faculty',
        status: 'active',
        created_at: new Date()
      }]);
    }
    if (text.includes('INSERT INTO production.academic_sessions')) {
      return makeResult([{
        id: ACADEMIC_SESSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        session_code: '2026-2027',
        display_name: '2026/2027 Academic Session',
        starts_on: '2026-09-07',
        ends_on: '2027-07-16',
        is_current: false,
        status: 'planned',
        created_by: ADMIN_USER_ID,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.academic_sessions WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE')) {
      return makeResult([{}]);
    }
    if (text.includes('UPDATE production.academic_sessions') && text.includes('SET is_current = true')) {
      return makeResult([{
        id: ACADEMIC_SESSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        session_code: '2026-2027',
        display_name: '2026/2027 Academic Session',
        starts_on: '2026-09-07',
        ends_on: '2027-07-16',
        is_current: true,
        status: 'active',
        created_by: ADMIN_USER_ID,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('INSERT INTO production.academic_terms')) {
      return makeResult([{
        id: ACADEMIC_TERM_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        session_id: ACADEMIC_SESSION_ID,
        term_order: 1,
        name: 'First Term',
        starts_on: '2026-09-07',
        ends_on: '2026-12-18',
        is_current: false,
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.academic_terms WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE')) {
      return makeResult([{}]);
    }
    if (text.includes('UPDATE production.academic_terms') && text.includes('SET is_current = true')) {
      return makeResult([{
        id: ACADEMIC_TERM_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        session_id: ACADEMIC_SESSION_ID,
        term_order: 1,
        name: 'First Term',
        starts_on: '2026-09-07',
        ends_on: '2026-12-18',
        is_current: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    return undefined;
  });

  const repo = new SchoolAdministrationRepository(pool);
  const actor = adminPrincipal();

  const identity = await repo.getSchoolIdentity(actor, SCHOOL_ID);
  assert.equal(identity?.registered_identity, 'RC-998812');

  const updated = await repo.updateSchoolProfile(actor, SCHOOL_ID, { name: 'Greenfield College Updated' });
  assert.equal(updated.name, 'Greenfield College Updated');

  const active = await repo.transitionSchoolStatus(actor, SCHOOL_ID, 'active', 'Verified launch checklist');
  assert.equal(active.institutional_status, 'active');
  await repo.transitionSchoolStatus(actor, SCHOOL_ID, 'decommissioned', 'Closed');
  await assert.rejects(
    repo.transitionSchoolStatus(actor, SCHOOL_ID, 'active', 'Reopen'),
    err => err instanceof SchoolAdministrationError && err.code === 'INVALID_STATUS_TRANSITION'
  );
  const history = await repo.getSchoolStatusHistory(actor, SCHOOL_ID);
  assert.equal(history.length, 1);

  const dept = await repo.createDepartment(actor, SCHOOL_ID, { name: 'Sciences', code: 'SCI', unitType: 'academic' });
  assert.equal(dept.code, 'SCI');
  await assert.rejects(
    repo.updateDepartment(actor, SCHOOL_ID, DEPT_ID, { parentDepartmentId: DEPT_ID }),
    /Department cannot be its own parent/
  );

  const session = await repo.createAcademicSession(actor, SCHOOL_ID, {
    sessionCode: '2026-2027',
    displayName: '2026/2027 Academic Session',
    startsOn: '2026-09-07',
    endsOn: '2027-07-16'
  });
  assert.equal(session.session_code, '2026-2027');
  const activeSession = await repo.activateAcademicSession(actor, SCHOOL_ID, ACADEMIC_SESSION_ID);
  assert.equal(activeSession.is_current, true);

  const term = await repo.createAcademicTerm(actor, SCHOOL_ID, ACADEMIC_SESSION_ID, {
    termOrder: 1,
    name: 'First Term',
    startsOn: '2026-09-07',
    endsOn: '2026-12-18'
  });
  assert.equal(term.term_order, 1);
  const activeTerm = await repo.activateAcademicTerm(actor, SCHOOL_ID, ACADEMIC_TERM_ID);
  assert.equal(activeTerm.is_current, true);
});

test('admissions approval, enrollment, medical profile, digital ID card, and relationship-scoped guardians work cleanly', async () => {
  let admissionStatus: 'submitted' | 'approved' | 'enrolled' = 'submitted';
  const pool = new Prompt1MockPool((text, values) => {
    if (text.includes('INSERT INTO production.student_admissions')) {
      return makeResult([{
        id: ADMISSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        application_number: 'ADM-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        target_grade_level: 'JSS 1',
        target_class_id: CLASS_ID,
        status: admissionStatus,
        submitted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.student_admissions') && text.includes('FOR UPDATE')) {
      return makeResult([{
        id: ADMISSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        application_number: 'ADM-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        date_of_birth: '2014-05-12',
        gender: 'female',
        target_class_id: CLASS_ID,
        status: admissionStatus
      }]);
    }
    if (text.includes('UPDATE production.student_admissions')) {
      admissionStatus = values?.[3] === 'approved' ? 'approved' : 'enrolled';
      return makeResult([{
        id: ADMISSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        application_number: 'ADM-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        status: admissionStatus,
        enrolled_student_id: admissionStatus === 'enrolled' ? STUDENT_ID : null,
        submitted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.classes WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
      return makeResult([{}]);
    }
    if (text.includes('INSERT INTO production.students')) {
      return makeResult([{
        id: STUDENT_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        class_id: CLASS_ID,
        admission_number: 'STU-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        lifecycle_status: 'enrolled',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.students WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
      return makeResult([{
        id: STUDENT_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        class_id: CLASS_ID,
        admission_number: 'STU-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        lifecycle_status: 'enrolled'
      }]);
    }
    if (text.includes('INSERT INTO production.student_medical_profiles')) {
      return makeResult([{
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        student_id: STUDENT_ID,
        blood_group: 'O+',
        genotype: 'AA',
        allergies: ['Peanuts'],
        chronic_conditions: [],
        immunization_summary: { tetanus: 'current' },
        dietary_restrictions: ['Nut-free'],
        physician_name: 'Dr. Amina',
        physician_phone: '+2348000000010',
        medical_notes: 'Carry EpiPen',
        consent_for_emergency_care: true,
        updated_by: ADMIN_USER_ID,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('INSERT INTO production.student_digital_id_cards')) {
      return makeResult([{
        id: CARD_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        student_id: STUDENT_ID,
        card_number: String(values?.[3]),
        issued_by: ADMIN_USER_ID,
        issued_at: new Date(),
        expires_at: new Date(Date.now() + 365 * 86400_000),
        revoked_at: null,
        revoked_reason: null,
        status: 'active'
      }]);
    }
    if (text.includes('UPDATE production.student_digital_id_cards') && text.includes('RETURNING id')) {
      return makeResult([{
        id: CARD_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        student_id: STUDENT_ID,
        card_number: 'ID-TEST',
        issued_by: ADMIN_USER_ID,
        issued_at: new Date(),
        expires_at: new Date(),
        revoked_at: new Date(),
        revoked_reason: 'Lost card reported',
        status: 'revoked'
      }]);
    }
    if (text.includes('INSERT INTO production.guardians')) {
      return makeResult([{
        id: GUARDIAN_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        user_id: ADMIN_USER_ID,
        full_name: 'Alhaji Sule',
        email: 'sule@family.ng',
        phone: '+2348000000099',
        verification_status: 'pending',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('UPDATE production.guardians') && text.includes('SET verification_status')) {
      return makeResult([{
        id: GUARDIAN_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        user_id: ADMIN_USER_ID,
        full_name: 'Alhaji Sule',
        verification_status: 'verified',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('SELECT 1 FROM production.guardians')) return makeResult([{}]);
    if (text.includes('INSERT INTO production.student_guardians')) {
      return makeResult([{
        id: 'sg-1',
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        student_id: STUDENT_ID,
        guardian_id: GUARDIAN_ID,
        relationship_type: 'father',
        is_primary: true,
        is_financial_sponsor: true,
        is_emergency_contact: true,
        authorized_pickup: true,
        can_view_academic_records: true,
        can_view_medical_summary: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('FROM production.guardians g')) {
      return makeResult([{
        id: STUDENT_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        class_id: CLASS_ID,
        admission_number: 'STU-2026-001',
        first_name: 'Zainab',
        last_name: 'Sule',
        lifecycle_status: 'enrolled',
        photo_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        relationship_type: 'father',
        is_primary: true,
        can_view_academic_records: true,
        can_view_medical_summary: true
      }]);
    }
    return undefined;
  });

  const repo = new SchoolAdministrationRepository(pool);
  const actor = adminPrincipal();

  const admission = await repo.createAdmissionApplication(actor, SCHOOL_ID, {
    applicationNumber: 'ADM-2026-001',
    firstName: 'Zainab',
    lastName: 'Sule',
    targetGradeLevel: 'JSS 1',
    targetClassId: CLASS_ID
  });
  assert.equal(admission.status, 'submitted');

  await assert.rejects(
    repo.enrollAdmission(actor, SCHOOL_ID, ADMISSION_ID, { admissionNumber: 'STU-2026-001' }),
    /Only approved admissions/
  );

  const reviewed = await repo.reviewAdmission(actor, SCHOOL_ID, ADMISSION_ID, { decision: 'approved', reviewNotes: 'Passed screening' });
  assert.equal(reviewed.status, 'approved');

  const enrolled = await repo.enrollAdmission(actor, SCHOOL_ID, ADMISSION_ID, { admissionNumber: 'STU-2026-001' });
  assert.equal(enrolled.student.lifecycle_status, 'enrolled');
  assert.equal(enrolled.admission.status, 'enrolled');

  const medical = await repo.upsertStudentMedicalProfile(actor, SCHOOL_ID, STUDENT_ID, {
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: ['Peanuts'],
    consentForEmergencyCare: true
  });
  assert.equal(medical.blood_group, 'O+');

  const issuedId = await repo.issueStudentDigitalIdCard(actor, SCHOOL_ID, STUDENT_ID, 365);
  assert.equal(issuedId.card.status, 'active');
  assert.ok(issuedId.qrToken.length >= 24);
  const revokedId = await repo.revokeStudentDigitalIdCard(actor, SCHOOL_ID, STUDENT_ID, 'Lost card reported');
  assert.equal(revokedId.status, 'revoked');

  const guardian = await repo.createGuardian(actor, SCHOOL_ID, {
    fullName: 'Alhaji Sule',
    phone: '+2348000000099',
    email: 'sule@family.ng',
    userId: ADMIN_USER_ID
  });
  assert.equal(guardian.verification_status, 'pending');
  const verifiedGuardian = await repo.verifyGuardian(actor, SCHOOL_ID, GUARDIAN_ID, 'verified');
  assert.equal(verifiedGuardian.verification_status, 'verified');

  const link = await repo.linkStudentGuardian(actor, SCHOOL_ID, GUARDIAN_ID, {
    studentId: STUDENT_ID,
    relationshipType: 'father',
    isPrimary: true,
    canViewMedicalSummary: true
  });
  assert.equal(link.is_primary, true);

  const parentActor = createAuthorizedPrincipal({
    tenant: principal(TENANT_ID),
    userId: ADMIN_USER_ID,
    sessionId: SESSION_ID,
    grants: [{ roleCode: TENANT_ROLES.parent, permissions: [], scopes: [] }]
  });
  const wards = await repo.listMyWards(parentActor, SCHOOL_ID);
  assert.equal(wards.length, 1);
  assert.equal(wards[0].student.id, STUDENT_ID);
  assert.ok(pool.statements.some(s => s.text.includes('g.user_id = $3') && s.values?.[2] === ADMIN_USER_ID));
});

test('staff linking, role appointment escalation guard, subject allocation, and separation history work cleanly', async () => {
  const pool = new Prompt1MockPool((text, values) => {
    if (text.includes('FROM production.memberships') && text.includes('status = \'active\'')) {
      return makeResult([{ user_subject: ADMIN_USER_ID }]);
    }
    if (text.includes('UPDATE production.staff SET user_id =')) {
      return makeResult([{
        id: STAFF_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        user_id: text.includes('user_id = NULL') ? null : ADMIN_USER_ID,
        staff_number: 'STF-001',
        first_name: 'Kemi',
        last_name: 'Ade',
        designation: 'Senior Mathematics Teacher',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    if (text.includes('SELECT id, user_id FROM production.staff')) {
      return makeResult([{ id: STAFF_ID, user_id: ADMIN_USER_ID }]);
    }
    if (text.includes('SELECT DISTINCT rp.permission_code')) {
      return makeResult([{ permission_code: PERMISSIONS.staffRead }]);
    }
    if (text.includes('FROM production.role_permissions WHERE role_code = $1')) {
      return makeResult([{ permissions: [PERMISSIONS.studentsManage] }]);
    }
    if (text.includes('SELECT 1 FROM production.staff')) return makeResult([{}]);
    if (text.includes('INSERT INTO production.staff_subject_allocations')) {
      return makeResult([{
        id: ALLOCATION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        staff_id: STAFF_ID,
        academic_session_id: ACADEMIC_SESSION_ID,
        subject_code: 'MTH-101',
        subject_name: 'Mathematics',
        class_id: CLASS_ID,
        periods_per_week: 5,
        status: 'active',
        assigned_by: ADMIN_USER_ID,
        assigned_at: new Date(),
        ended_at: null
      }]);
    }
    if (text.includes('UPDATE production.staff_subject_allocations')) return makeResult([], 1);
    if (text.includes('SELECT status FROM production.staff')) return makeResult([{ status: 'active' }]);
    if (text.includes('UPDATE production.staff') && text.includes('SET status = $4')) {
      return makeResult([{
        id: STAFF_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        user_id: null,
        staff_number: 'STF-001',
        first_name: 'Kemi',
        last_name: 'Ade',
        designation: 'Senior Mathematics Teacher',
        status: values?.[3],
        separated_at: new Date(),
        separation_reason: values?.[5],
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
    return undefined;
  });

  const repo = new SchoolAdministrationRepository(pool);
  const actor = adminPrincipal();

  const linked = await repo.linkStaffUserAccount(actor, SCHOOL_ID, STAFF_ID, ADMIN_USER_ID);
  assert.equal(linked.user_id, ADMIN_USER_ID);

  await assert.rejects(
    repo.appointStaffRole(actor, SCHOOL_ID, STAFF_ID, TENANT_ROLES.principal),
    /Cannot appoint role exceeding actor permissions/
  );

  const allocation = await repo.allocateStaffSubject(actor, SCHOOL_ID, STAFF_ID, {
    subjectCode: 'MTH-101',
    subjectName: 'Mathematics',
    classId: CLASS_ID,
    academicSessionId: ACADEMIC_SESSION_ID,
    periodsPerWeek: 5
  });
  assert.equal(allocation.subject_code, 'MTH-101');
  await repo.revokeStaffSubjectAllocation(actor, SCHOOL_ID, STAFF_ID, ALLOCATION_ID);

  const separated = await repo.transitionStaffStatus(actor, SCHOOL_ID, STAFF_ID, 'retired', 'Completed tenure');
  assert.equal(separated.status, 'retired');
  assert.ok(pool.statements.some(s => s.text.includes('INSERT INTO production.staff_separation_history')));

  const unlinked = await repo.unlinkStaffUserAccount(actor, SCHOOL_ID, STAFF_ID, 'Retired from duty');
  assert.equal(unlinked.user_id, null);
});

test('application template discovery and provisioning workflow step repositories return typed records and Prompt 1 routes pass capability gates', async () => {
  const pool = new Prompt1MockPool(text => {
    if (text.includes('FROM production.application_templates')) {
      return makeResult([{
        template_id: 'curriculum_flow',
        template_version: '2.0.0',
        display_name: 'Curriculum Flow School Portal',
        description: 'Multi-role school learning and administration instance',
        category: 'school_portal',
        status: 'active',
        provisionable: true,
        capabilities: ['school_identity', 'student_administration'],
        default_features: ['lesson_notes', 'cbt'],
        configuration_schema: {},
        default_configuration: {},
        upgrade_compatibility: {},
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z')
      }]);
    }
    if (text.includes('FROM production.school_provisioning_workflow_steps')) {
      return makeResult([{
        id: 'step-1',
        operation_id: SESSION_ID,
        tenant_id: TENANT_ID,
        school_id: SCHOOL_ID,
        step_order: 1,
        step_code: 'tenant_created',
        step_name: 'Create Tenant & School Profile',
        status: 'completed',
        details: { schoolId: SCHOOL_ID },
        error_message: null,
        started_at: new Date('2026-01-01T00:00:00Z'),
        completed_at: new Date('2026-01-01T00:00:05Z'),
        updated_at: new Date('2026-01-01T00:00:05Z')
      }]);
    }
    return undefined;
  });

  const superAdmin = principal('platform-control-plane', 'super_admin');
  const templatesRepo = new ApplicationTemplateRepository(pool);
  const templates = await templatesRepo.listTemplates({ provisionableOnly: true }, superAdmin);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].templateId, 'curriculum_flow');
  const singleTemplate = await templatesRepo.getTemplate('curriculum_flow', '2.0.0', superAdmin);
  assert.equal(singleTemplate?.provisionable, true);

  const provRepo = new SchoolProvisioningRepository(pool);
  const steps = await provRepo.getProvisioningWorkflowSteps(SESSION_ID, superAdmin);
  assert.equal(steps[0].stepCode, 'tenant_created');
  assert.equal(steps[0].status, 'completed');

  for (const [method, path] of [
    ['GET', '/application-templates'],
    ['POST', '/schools/provision'],
    ['GET', `/schools/provision/${SESSION_ID}/steps`],
    ['GET', '/schools/me'],
    ['POST', '/schools/me/status'],
    ['GET', '/schools/me/departments'],
    ['GET', '/schools/me/academic-sessions'],
    ['GET', '/schools/me/admissions'],
    ['GET', '/schools/me/guardians'],
    ['GET', `/schools/me/students/${STUDENT_ID}/medical`],
    ['POST', `/schools/me/students/${STUDENT_ID}/digital-id`],
    ['POST', `/schools/me/students/${STUDENT_ID}/lifecycle`],
    ['GET', `/schools/me/students/${STUDENT_ID}/history`],
    ['GET', '/schools/me/roles'],
    ['POST', '/schools/me/invitations'],
    ['GET', '/schools/me/mfa/totp']
  ] as const) {
    assert.equal(evaluateProductionCapabilityGate(method, path).allowed, true, `${method} ${path}`);
  }
});
