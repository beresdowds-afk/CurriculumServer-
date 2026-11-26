import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationResult, AuthorizationSource } from '../authorization/authorizationRepository';
import { createAuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import { createSlidingWindowRateLimiter } from '../sharedServices/rateLimiter';
import { ServerTenantTokenService } from '../tenantTokenService';
import { acceptanceTestOptions, databaseUrl, principal, TEST_CONTROL_PLANE_SECRET } from '../db/testSupport';
import { PostgresRuntime } from '../db/postgres';
import { AuthorizationRepository } from '../authorization/authorizationRepository';
import { withControlPlaneTransaction } from '../db/tenantContext';
import { InstanceQuestionBankService } from './instanceQuestionBankService';
import { createQuestionBankRouter } from './routes';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const INSTANCE_A1 = 'aaaa1111-1111-4111-8111-111111111111';
const INSTANCE_A2 = 'aaaa2222-2222-4222-8222-222222222222';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const INSTANCE_B1 = 'bbbb1111-1111-4111-8111-111111111111';

const USER_ADMIN_A = '10000000-0000-4000-8000-000000000001';
const USER_TEACHER_A = '10000000-0000-4000-8000-000000000002';
const USER_REVIEWER_A = '10000000-0000-4000-8000-000000000003';
const USER_UNAUTH_A = '10000000-0000-4000-8000-000000000004';
const USER_SCOPED_A1 = '10000000-0000-4000-8000-000000000005';
const USER_ADMIN_B = '20000000-0000-4000-8000-000000000001';

const SESSION_A_ADMIN = '30000000-0000-4000-8000-000000000001';
const SESSION_A_TEACHER = '30000000-0000-4000-8000-000000000002';
const SESSION_A_REVIEWER = '30000000-0000-4000-8000-000000000003';
const SESSION_A_UNAUTH = '30000000-0000-4000-8000-000000000004';
const SESSION_A_SCOPED = '30000000-0000-4000-8000-000000000005';
const SESSION_B_ADMIN = '40000000-0000-4000-8000-000000000001';

interface StatefulQbPool {
  pool: DatabasePool;
  auditEvents: Array<{ tenantId: string; actorSubject: string; action: string; details: Record<string, unknown> }>;
  categories: Array<Record<string, any>>;
  questions: Array<Record<string, any>>;
  blueprints: Array<Record<string, any>>;
  exams: Array<Record<string, any>>;
  records: Array<Record<string, any>>;
}

function createStatefulQbPool(): StatefulQbPool {
  const instances = new Map<string, string>([
    [INSTANCE_A1, TENANT_A],
    [INSTANCE_A2, TENANT_A],
    [INSTANCE_B1, TENANT_B]
  ]);
  const teacherAssignments = [
    {
      id: randomUUID(),
      tenant_id: TENANT_A,
      application_instance_id: INSTANCE_A1,
      teacher_user_id: USER_TEACHER_A,
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      class_grade_name: 'SS 3',
      status: 'active'
    }
  ];
  const categories: Array<Record<string, any>> = [];
  const questions: Array<Record<string, any>> = [];
  const blueprints: Array<Record<string, any>> = [];
  const exams: Array<Record<string, any>> = [];
  const records: Array<Record<string, any>> = [];
  const auditEvents: StatefulQbPool['auditEvents'] = [];

  const query = async <R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> => {
    if (sql.includes('FROM production.application_instances')) {
      const tenantId = String(values?.[0] || '');
      const instanceId = String(values?.[1] || '');
      const owned = instances.get(instanceId) === tenantId;
      return { rows: (owned ? [{ id: instanceId }] : []) as unknown as R[], rowCount: owned ? 1 : 0, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.teacher_subject_assignments')) {
      const tenantId = String(values?.[0] || '');
      const instanceId = String(values?.[1] || '');
      const teacherUserId = String(values?.[2] || '');
      const subjectRef = String(values?.[3] || '').toLowerCase();
      const grade = values?.[4] ? String(values[4]).toLowerCase() : undefined;
      const matches = teacherAssignments.filter(a =>
        a.tenant_id === tenantId &&
        a.application_instance_id === instanceId &&
        a.teacher_user_id === teacherUserId &&
        a.status === 'active' &&
        (a.subject_id.toLowerCase() === subjectRef || a.subject_name.toLowerCase() === subjectRef) &&
        (!grade || a.class_grade_name.toLowerCase() === grade)
      );
      return { rows: matches as unknown as R[], rowCount: matches.length, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.audit_events')) {
      auditEvents.push({
        tenantId: String(values?.[0] || ''),
        actorSubject: String(values?.[1] || ''),
        action: String(values?.[2] || ''),
        details: JSON.parse(String(values?.[3] || '{}'))
      });
      return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.instance_question_categories')) {
      const existingIdx = categories.findIndex(
        c => c.tenant_id === values?.[0] && c.application_instance_id === values?.[1] && c.name === values?.[2]
      );
      if (existingIdx !== -1) {
        categories[existingIdx].description = values?.[3];
        categories[existingIdx].subject_reference_id = values?.[4] ?? categories[existingIdx].subject_reference_id;
        categories[existingIdx].updated_at = new Date();
        return { rows: [categories[existingIdx] as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
      }
      const row = {
        id: randomUUID(),
        tenant_id: values?.[0],
        application_instance_id: values?.[1],
        name: values?.[2],
        description: values?.[3],
        subject_reference_id: values?.[4],
        created_by: values?.[5],
        created_at: new Date(),
        updated_at: new Date()
      };
      categories.push(row);
      return { rows: [row as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('UPDATE production.instance_question_categories')) {
      const idx = categories.findIndex(
        c => c.tenant_id === values?.[0] && c.application_instance_id === values?.[1] && c.id === values?.[2]
      );
      if (idx === -1) return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
      if (values?.[3] !== null && values?.[3] !== undefined) categories[idx].name = values[3];
      if (values?.[4] !== null && values?.[4] !== undefined) categories[idx].description = values[4];
      if (values?.[5]) categories[idx].subject_reference_id = values[6];
      categories[idx].updated_at = new Date();
      return { rows: [categories[idx] as unknown as R], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.instance_question_categories')) {
      const hasIdFilter = sql.includes('id = $3');
      const filtered = categories.filter(c =>
        c.tenant_id === values?.[0] &&
        c.application_instance_id === values?.[1] &&
        (!hasIdFilter || c.id === values?.[2])
      );
      return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.instance_question_bank_items')) {
      const hasCustomId = sql.includes('(id, tenant_id');
      const offset = hasCustomId ? 1 : 0;
      const row = {
        id: hasCustomId ? values?.[0] : randomUUID(),
        tenant_id: values?.[offset + 0],
        application_instance_id: values?.[offset + 1],
        category_id: values?.[offset + 2],
        subject_reference_id: values?.[offset + 3],
        class_grade_name: values?.[offset + 4],
        curriculum_version_id: values?.[offset + 5],
        topic_reference_id: values?.[offset + 6],
        learning_objective_ids: JSON.parse(String(values?.[offset + 7] || '[]')),
        question_type: values?.[offset + 8],
        stem: values?.[offset + 9],
        options: values?.[offset + 10] ? JSON.parse(String(values[offset + 10])) : null,
        correct_answer: values?.[offset + 11],
        explanation: values?.[offset + 12],
        marking_rubric: values?.[offset + 13] ? JSON.parse(String(values[offset + 13])) : null,
        marks: values?.[offset + 14],
        difficulty: values?.[offset + 15],
        cognitive_demand: values?.[offset + 16],
        source_type: values?.[offset + 17],
        source_reference: values?.[offset + 18],
        version: 1,
        creation_method: values?.[offset + 19],
        review_status: values?.[offset + 20],
        reviewer_id: null,
        approval_timestamp: null,
        exposure_count: 0,
        archived_at: null,
        archived_by: null,
        archive_reason: null,
        metadata: JSON.parse(String(values?.[offset + 21] || '{}')),
        created_by: values?.[offset + 22],
        created_at: new Date(),
        updated_at: new Date()
      };
      questions.push(row);
      return { rows: [row as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('UPDATE production.instance_question_bank_items')) {
      const idx = questions.findIndex(
        q => q.tenant_id === values?.[0] && q.application_instance_id === values?.[1] && q.id === values?.[2]
      );
      if (idx === -1) return { rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] };
      if (sql.includes("review_status = 'pending_review'")) {
        questions[idx].review_status = 'pending_review';
        questions[idx].approval_timestamp = null;
      } else if (sql.includes('archived_at = now()')) {
        questions[idx].archived_at = new Date();
        questions[idx].archived_by = values?.[3];
        questions[idx].archive_reason = values?.[4];
      } else {
        questions[idx].review_status = values?.[3];
        questions[idx].reviewer_id = values?.[4];
        questions[idx].approval_timestamp = values?.[3] === 'approved' ? new Date() : null;
      }
      questions[idx].updated_at = new Date();
      return { rows: [questions[idx] as unknown as R], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
    }
    if (sql.includes('DELETE FROM production.instance_question_bank_items')) {
      const idx = questions.findIndex(
        q => q.tenant_id === values?.[0] && q.application_instance_id === values?.[1] && q.id === values?.[2]
      );
      if (idx === -1) return { rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] };
      questions.splice(idx, 1);
      return { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] };
    }
    if (sql.includes('AS referenced')) {
      const tenantId = values?.[0];
      const instanceId = values?.[1];
      const questionId = String(values?.[2] || '');
      const inExam = exams.some(
        e => e.tenant_id === tenantId && e.application_instance_id === instanceId && (e.selected_question_ids || []).includes(questionId)
      );
      const inRecord = records.some(
        r => r.tenant_id === tenantId && r.application_instance_id === instanceId && Object.prototype.hasOwnProperty.call(r.responses || {}, questionId)
      );
      return { rows: [{ referenced: inExam || inRecord } as unknown as R], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.instance_question_bank_items')) {
      if (sql.includes('id = ANY($3::uuid[])')) {
        const ids = Array.isArray(values?.[2]) ? (values?.[2] as string[]) : [];
        const filtered = questions.filter(
          q => q.tenant_id === values?.[0] && q.application_instance_id === values?.[1] && ids.includes(q.id)
        );
        return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
      }
      if (sql.includes('id = $3')) {
        const filtered = questions.filter(
          q => q.tenant_id === values?.[0] && q.application_instance_id === values?.[1] && q.id === values?.[2]
        );
        return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
      }
      const includeArchived = !sql.includes('archived_at IS NULL');
      const filtered = questions.filter(
        q => q.tenant_id === values?.[0] && q.application_instance_id === values?.[1] && (includeArchived || !q.archived_at)
      );
      return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.instance_assessment_blueprints')) {
      const row = {
        id: randomUUID(),
        tenant_id: values?.[0],
        application_instance_id: values?.[1],
        title: values?.[2],
        subject_reference_id: values?.[3],
        class_grade_name: values?.[4],
        term: values?.[5],
        curriculum_version_id: values?.[6],
        assessment_type: values?.[7],
        question_formats_count: JSON.parse(String(values?.[8] || '{}')),
        total_marks: values?.[9],
        difficulty_mix: JSON.parse(String(values?.[10] || '{}')),
        time_allowance_minutes: values?.[11],
        allow_verified_past_questions: values?.[12],
        allow_ai_practice_questions: values?.[13],
        completed_topics_only: values?.[14],
        selected_topic_ids: JSON.parse(String(values?.[15] || '[]')),
        status: 'draft',
        created_by: values?.[16],
        created_at: new Date(),
        updated_at: new Date()
      };
      blueprints.push(row);
      return { rows: [row as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.instance_assessment_blueprints')) {
      const hasIdFilter = sql.includes('id = $3');
      const filtered = blueprints.filter(
        b => b.tenant_id === values?.[0] && b.application_instance_id === values?.[1] && (!hasIdFilter || b.id === values?.[2])
      );
      return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.instance_exam_configurations')) {
      const row = {
        id: randomUUID(),
        tenant_id: values?.[0],
        application_instance_id: values?.[1],
        blueprint_id: values?.[2],
        exam_code: values?.[3],
        title: values?.[4],
        subject_reference_id: values?.[5],
        class_grade_name: values?.[6],
        term: values?.[7],
        academic_session: values?.[8],
        duration_minutes: values?.[9],
        total_marks: values?.[10],
        instructions: JSON.parse(String(values?.[11] || '[]')),
        selected_question_ids: JSON.parse(String(values?.[12] || '[]')),
        generation_hash: values?.[13],
        is_locked: false,
        authorized_by_principal: false,
        authorized_by: null,
        authorized_at: null,
        marking_scheme_unlocked: false,
        metadata: JSON.parse(String(values?.[14] || '{}')),
        created_by: values?.[15],
        created_at: new Date(),
        updated_at: new Date()
      };
      exams.push(row);
      return { rows: [row as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.instance_exam_configurations')) {
      const hasIdFilter = sql.includes('id = $3');
      const filtered = exams.filter(
        e => e.tenant_id === values?.[0] && e.application_instance_id === values?.[1] && (!hasIdFilter || e.id === values?.[2])
      );
      return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
    }
    if (sql.includes('INSERT INTO production.instance_assessment_records')) {
      const row = {
        id: randomUUID(),
        tenant_id: values?.[0],
        application_instance_id: values?.[1],
        exam_configuration_id: values?.[2],
        student_id: values?.[3],
        student_identifier: values?.[4],
        score_obtained: values?.[5],
        max_score: values?.[6],
        responses: JSON.parse(String(values?.[7] || '{}')),
        graded_by: values?.[8],
        graded_at: new Date(),
        status: values?.[9],
        created_at: new Date()
      };
      records.push(row);
      return { rows: [row as unknown as R], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }
    if (sql.includes('FROM production.instance_assessment_records')) {
      const filtered = records.filter(r => r.tenant_id === values?.[0] && r.application_instance_id === values?.[1]);
      return { rows: filtered as unknown as R[], rowCount: filtered.length, command: 'SELECT', oid: 0, fields: [] };
    }
    return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
  };

  const client: DatabaseClient = { query, release() {} };
  const pool: DatabasePool = {
    query,
    async connect() { return client; },
    async end() {},
    on() { return this; }
  };
  return { pool, auditEvents, categories, questions, blueprints, exams, records };
}

function buildPrincipals(): Map<string, AuthorizedPrincipal> {
  const map = new Map<string, AuthorizedPrincipal>();
  map.set(`${TENANT_A}:${USER_ADMIN_A}:${SESSION_A_ADMIN}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_A, 'tenant_admin'),
    userId: USER_ADMIN_A,
    sessionId: SESSION_A_ADMIN,
    grants: [{
      roleCode: 'tenant_admin',
      permissions: [
        PERMISSIONS.questionBankRead,
        PERMISSIONS.questionBankManage,
        PERMISSIONS.questionBankReview,
        PERMISSIONS.assessmentsRead,
        PERMISSIONS.assessmentsManage
      ],
      scopes: []
    }]
  }));
  map.set(`${TENANT_A}:${USER_TEACHER_A}:${SESSION_A_TEACHER}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_A, 'teacher'),
    userId: USER_TEACHER_A,
    sessionId: SESSION_A_TEACHER,
    grants: [{
      roleCode: 'teacher',
      permissions: [
        PERMISSIONS.questionBankRead,
        PERMISSIONS.questionBankManage,
        PERMISSIONS.assessmentsRead,
        PERMISSIONS.assessmentsManage
      ],
      scopes: []
    }]
  }));
  map.set(`${TENANT_A}:${USER_REVIEWER_A}:${SESSION_A_REVIEWER}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_A, 'department_head'),
    userId: USER_REVIEWER_A,
    sessionId: SESSION_A_REVIEWER,
    grants: [{
      roleCode: 'department_head',
      permissions: [PERMISSIONS.questionBankRead, PERMISSIONS.questionBankReview],
      scopes: []
    }]
  }));
  map.set(`${TENANT_A}:${USER_UNAUTH_A}:${SESSION_A_UNAUTH}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_A, 'read_only'),
    userId: USER_UNAUTH_A,
    sessionId: SESSION_A_UNAUTH,
    grants: [{
      roleCode: 'read_only',
      permissions: [PERMISSIONS.questionBankRead],
      scopes: []
    }]
  }));
  map.set(`${TENANT_A}:${USER_SCOPED_A1}:${SESSION_A_SCOPED}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_A, 'examination_officer'),
    userId: USER_SCOPED_A1,
    sessionId: SESSION_A_SCOPED,
    grants: [{
      roleCode: 'examination_officer',
      permissions: [
        PERMISSIONS.questionBankRead,
        PERMISSIONS.questionBankManage,
        PERMISSIONS.assessmentsRead,
        PERMISSIONS.assessmentsManage
      ],
      scopes: [{ resourceType: 'application_instance', resourceId: INSTANCE_A1 }]
    }]
  }));
  map.set(`${TENANT_B}:${USER_ADMIN_B}:${SESSION_B_ADMIN}`, createAuthorizedPrincipal({
    tenant: principal(TENANT_B, 'tenant_admin'),
    userId: USER_ADMIN_B,
    sessionId: SESSION_B_ADMIN,
    grants: [{
      roleCode: 'tenant_admin',
      permissions: [
        PERMISSIONS.questionBankRead,
        PERMISSIONS.questionBankManage,
        PERMISSIONS.questionBankReview,
        PERMISSIONS.assessmentsRead,
        PERMISSIONS.assessmentsManage
      ],
      scopes: []
    }]
  }));
  return map;
}

function issueUserToken(tenantId: string, userId: string, sessionId: string, role: string): string {
  return ServerTenantTokenService.issueTenantToken({
    id: tenantId,
    appId: 'qb-acceptance',
    schoolName: 'Acceptance School',
    subscriptionTier: 'enterprise',
    status: 'active'
  }, role, 3600, undefined, userId, sessionId);
}

async function startTestApp(rateLimitMax = 200) {
  const db = createStatefulQbPool();
  const principals = buildPrincipals();
  const authSource: AuthorizationSource = {
    async authorize(tenant: VerifiedTenantPrincipal, userId: string, sessionId: string): Promise<AuthorizationResult> {
      const found = principals.get(`${tenant.tenantId}:${userId}:${sessionId}`);
      if (!found) return { ok: false, reason: 'SESSION_REVOKED' };
      return { ok: true, principal: found };
    }
  };
  const auth = createAuthorizationMiddleware({
    verifyToken: ServerTenantTokenService.verifyTenantToken,
    signingConfigured: () => true,
    authorization: () => authSource
  });
  const app = express();
  app.use(express.json());
  app.use('/api', createApiCapabilityGateMiddleware());
  app.use('/api/v1', createQuestionBankRouter({
    getService: () => new InstanceQuestionBankService(db.pool),
    auth,
    rateLimiter: createSlidingWindowRateLimiter({
      windowMs: 60_000,
      maxRequests: rateLimitMax,
      serviceLabel: 'qb-acceptance-test'
    })
  }));
  const server = app.listen(0);
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    db,
    close: () => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
  };
}

async function apiRequest(
  baseUrl: string,
  method: string,
  routePath: string,
  token: string,
  instanceId?: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(instanceId ? { 'X-Application-Instance-Id': instanceId } : {}),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...extraHeaders
  };
  const res = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, body: payload as Record<string, any> };
}

test('Prompt 1 Acceptance: end-to-end Question Bank & Assessment write routes enforce gate, isolation, review, archival, and audit', async () => {
  const { baseUrl, db, close } = await startTestApp(200);
  try {
    const adminAToken = issueUserToken(TENANT_A, USER_ADMIN_A, SESSION_A_ADMIN, 'tenant_admin');
    const teacherAToken = issueUserToken(TENANT_A, USER_TEACHER_A, SESSION_A_TEACHER, 'teacher');
    const reviewerAToken = issueUserToken(TENANT_A, USER_REVIEWER_A, SESSION_A_REVIEWER, 'department_head');
    const unauthAToken = issueUserToken(TENANT_A, USER_UNAUTH_A, SESSION_A_UNAUTH, 'read_only');
    const scopedA1Token = issueUserToken(TENANT_A, USER_SCOPED_A1, SESSION_A_SCOPED, 'examination_officer');
    const adminBToken = issueUserToken(TENANT_B, USER_ADMIN_B, SESSION_B_ADMIN, 'tenant_admin');

    // 15. Production capability gate decisions for write routes & non-enabled assessment routes
    for (const [method, p] of [
      ['POST', '/question-bank'],
      ['POST', '/question-bank/categories'],
      ['PATCH', `/question-bank/categories/${randomUUID()}`],
      ['POST', `/question-bank/items/${randomUUID()}/submit`],
      ['POST', `/question-bank/items/${randomUUID()}/review`],
      ['POST', `/question-bank/items/${randomUUID()}/archive`],
      ['DELETE', `/question-bank/items/${randomUUID()}`],
      ['POST', '/assessment-blueprints'],
      ['POST', '/assessments/exams'],
      ['POST', '/assessments/records']
    ]) {
      assert.equal(evaluateProductionCapabilityGate(method, p).allowed, true, `${method} ${p}`);
    }
    const cbtRes = await apiRequest(baseUrl, 'POST', '/api/v1/assessments/cbt/sessions', adminAToken, INSTANCE_A1, {});
    assert.equal(cbtRes.status, 503);

    // 6. Category creation and updates
    const createCat = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank/categories', adminAToken, INSTANCE_A1, {
      name: 'WAEC Mathematics Objective',
      description: 'Algebra & Logarithms',
      subjectReferenceId: 'sub-math'
    });
    assert.equal(createCat.status, 201);
    const categoryId = createCat.body.category.id as string;

    const patchCat = await apiRequest(baseUrl, 'PATCH', `/api/v1/question-bank/categories/${categoryId}`, adminAToken, INSTANCE_A1, {
      description: 'Algebra, Indices & Logarithms'
    });
    assert.equal(patchCat.status, 200);
    assert.equal(patchCat.body.category.description, 'Algebra, Indices & Logarithms');

    // Conflicting header & body applicationInstanceId is rejected 400
    const conflictRes = await apiRequest(
      baseUrl,
      'POST',
      '/api/v1/question-bank/categories',
      adminAToken,
      INSTANCE_A1,
      { name: 'Conflicting Cat', applicationInstanceId: INSTANCE_A2 }
    );
    assert.equal(conflictRes.status, 400);
    assert.equal(conflictRes.body.code, 'APPLICATION_INSTANCE_CONFLICT');

    // 2. Unauthorized user rejection (read_only user lacks question_bank.manage)
    const unauthCreate = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', unauthAToken, INSTANCE_A1, {
      categoryId,
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'Evaluate 2 + 3.',
      correctAnswer: '5'
    });
    assert.equal(unauthCreate.status, 403);

    // Teacher cannot write to an unassigned subject (Physics instead of sub-math / SS 3)
    const unassignedSubject = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', teacherAToken, INSTANCE_A1, {
      subjectReferenceId: 'sub-physics',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'Define velocity.',
      correctAnswer: 'Rate of change of displacement'
    });
    assert.equal(unassignedSubject.status, 403);

    // Creator cannot bypass review by submitting approved status
    const bypassReview = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', teacherAToken, INSTANCE_A1, {
      categoryId,
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'What is 3^2?',
      options: [{ key: 'A', text: '6' }, { key: 'B', text: '9' }],
      correctAnswer: 'B',
      marks: 2,
      reviewStatus: 'approved'
    });
    assert.equal(bypassReview.status, 400);

    // Invalid question marks / options rejected
    const invalidMarks = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', teacherAToken, INSTANCE_A1, {
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'Invalid marks',
      correctAnswer: '1',
      marks: 0
    });
    assert.equal(invalidMarks.status, 400);

    // 1. Successful question creation by authorized teacher in assigned subject/class
    const createdQ1 = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', teacherAToken, INSTANCE_A1, {
      categoryId,
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'Solve for x: 2x = 18.',
      options: [{ key: 'A', text: '8' }, { key: 'B', text: '9' }],
      correctAnswer: 'B',
      marks: 2,
      reviewStatus: 'draft'
    });
    assert.equal(createdQ1.status, 201);
    const q1Id = createdQ1.body.question.id as string;
    assert.equal(createdQ1.body.question.reviewStatus, 'draft');

    // Submit draft for review
    const submitted = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/submit`, teacherAToken, INSTANCE_A1, {});
    assert.equal(submitted.status, 200);
    assert.equal(submitted.body.question.reviewStatus, 'pending_review');

    // Teacher without question_bank.review cannot self-approve
    const selfApprove = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/review`, teacherAToken, INSTANCE_A1, {
      reviewStatus: 'approved'
    });
    assert.equal(selfApprove.status, 403);

    // 8. Rejection and subsequent review transition (pending_review -> rejected -> draft/pending_review -> approved)
    const rejectQ = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/review`, reviewerAToken, INSTANCE_A1, {
      reviewStatus: 'rejected',
      reason: 'Clarify units'
    });
    assert.equal(rejectQ.status, 200);
    assert.equal(rejectQ.body.question.reviewStatus, 'rejected');

    // Cannot approve directly from rejected without resubmitting for review
    const directApprove = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/review`, reviewerAToken, INSTANCE_A1, {
      reviewStatus: 'approved'
    });
    assert.equal(directApprove.status, 400);

    // Resubmit then approve (7. Question review and approval)
    const resubmit = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/submit`, teacherAToken, INSTANCE_A1, {});
    assert.equal(resubmit.status, 200);
    const approveQ = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/review`, reviewerAToken, INSTANCE_A1, {
      reviewStatus: 'approved'
    });
    assert.equal(approveQ.status, 200);
    assert.equal(approveQ.body.question.reviewStatus, 'approved');
    assert.ok(approveQ.body.question.approvalTimestamp);

    // 5. Instance-scoped role grants (scoped to INSTANCE_A1 allowed, INSTANCE_A2 rejected 403)
    const scopedAllowed = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', scopedA1Token, INSTANCE_A1, {
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'theory',
      stem: 'State Pythagoras theorem.',
      correctAnswer: 'a^2 + b^2 = c^2',
      marks: 4
    });
    assert.equal(scopedAllowed.status, 201);
    const q2Id = scopedAllowed.body.question.id as string;

    // 4. Cross-application-instance isolation (INSTANCE_A2 denied for INSTANCE_A1-scoped user & foreign instance item inaccessible)
    const scopedOtherInstance = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', scopedA1Token, INSTANCE_A2, {
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'theory',
      stem: 'Blocked write to second instance.',
      correctAnswer: 'none'
    });
    assert.equal(scopedOtherInstance.status, 403);

    // 3. Cross-tenant isolation (Tenant B admin cannot access Tenant A's INSTANCE_A1 or items)
    const crossTenantWrite = await apiRequest(baseUrl, 'POST', '/api/v1/question-bank', adminBToken, INSTANCE_A1, {
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'Cross tenant attack',
      correctAnswer: 'X'
    });
    assert.equal(crossTenantWrite.status, 403);
    const crossTenantReview = await apiRequest(baseUrl, 'POST', `/api/v1/question-bank/items/${q1Id}/review`, adminBToken, INSTANCE_B1, {
      reviewStatus: 'rejected'
    });
    assert.equal(crossTenantReview.status, 404);

    // 10. Assessment blueprint creation
    const createBp = await apiRequest(baseUrl, 'POST', '/api/v1/assessment-blueprints', adminAToken, INSTANCE_A1, {
      title: 'SS 3 First Term Mock',
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      term: 'First Term',
      curriculumVersionId: 'NERDC-SSEC-2024',
      assessmentType: 'exam',
      questionFormatsCount: { objective: 1 },
      totalMarks: 20,
      difficultyMix: { Medium: 100 }
    });
    assert.equal(createBp.status, 201);
    const blueprintId = createBp.body.blueprint.id as string;

    // 11. Examination configuration creation
    const createExam = await apiRequest(baseUrl, 'POST', '/api/v1/assessments/exams', adminAToken, INSTANCE_A1, {
      blueprintId,
      examCode: 'MTH-SS3-2026-01',
      title: 'Mathematics Mock Exam',
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      term: 'First Term',
      selectedQuestionIds: [q1Id],
      generationHash: 'sha256-test-hash'
    });
    assert.equal(createExam.status, 201);
    const examId = createExam.body.exam.id as string;

    // 12. Assessment submission & retrieval (rejecting foreign-school examConfigurationId)
    const crossSchoolRecord = await apiRequest(baseUrl, 'POST', '/api/v1/assessments/records', adminBToken, INSTANCE_B1, {
      examConfigurationId: examId,
      studentIdentifier: 'STD-B-01',
      scoreObtained: 10,
      maxScore: 20,
      responses: {}
    });
    assert.equal(crossSchoolRecord.status, 403);

    const submitRecord = await apiRequest(baseUrl, 'POST', '/api/v1/assessments/records', adminAToken, INSTANCE_A1, {
      examConfigurationId: examId,
      studentIdentifier: 'STD-A-01',
      scoreObtained: 18,
      maxScore: 20,
      responses: { [q1Id]: 'B' }
    });
    assert.equal(submitRecord.status, 201);

    const listRecords = await apiRequest(baseUrl, 'GET', '/api/v1/assessments/records', adminAToken, INSTANCE_A1);
    assert.equal(listRecords.status, 200);
    assert.equal(listRecords.body.records.length, 1);

    // 9. Question deletion vs archival preservation:
    // Referenced approved q1 is archived (not destroyed), preserving exam/assessment audit history; unreferenced q2 is deleted.
    const deleteReferenced = await apiRequest(baseUrl, 'DELETE', `/api/v1/question-bank/items/${q1Id}`, adminAToken, INSTANCE_A1, {
      reason: 'Retired after mock exam'
    });
    assert.equal(deleteReferenced.status, 200);
    assert.equal(deleteReferenced.body.archived, true);
    assert.equal(deleteReferenced.body.deleted, false);
    assert.ok(db.questions.some(q => q.id === q1Id && q.archived_at));

    const listActiveAfterArchive = await apiRequest(baseUrl, 'GET', '/api/v1/question-bank', adminAToken, INSTANCE_A1);
    assert.equal(listActiveAfterArchive.body.questions.some((q: any) => q.id === q1Id), false);

    const deleteUnreferenced = await apiRequest(baseUrl, 'DELETE', `/api/v1/question-bank/items/${q2Id}`, adminAToken, INSTANCE_A1);
    assert.equal(deleteUnreferenced.status, 200);
    assert.equal(deleteUnreferenced.body.deleted, true);
    assert.equal(deleteUnreferenced.body.archived, false);

    // 14. Audit evidence recorded for mutations
    const actions = new Set(db.auditEvents.map(event => event.action));
    for (const expectedAction of [
      'question_bank_category_created',
      'question_bank_category_updated',
      'question_bank_item_created',
      'question_bank_item_submitted_for_review',
      'question_bank_item_rejected',
      'question_bank_item_approved',
      'assessment_blueprint_created',
      'exam_configuration_created',
      'assessment_record_submitted',
      'question_bank_item_archived',
      'question_bank_item_deleted'
    ]) {
      assert.ok(actions.has(expectedAction), `Missing audit action ${expectedAction}`);
    }
  } finally {
    await close();
  }
});

test('Prompt 1 Acceptance: Question Bank router enforces rate limiting (HTTP 429)', async () => {
  const { baseUrl, close } = await startTestApp(2);
  try {
    const adminAToken = issueUserToken(TENANT_A, USER_ADMIN_A, SESSION_A_ADMIN, 'tenant_admin');
    const r1 = await apiRequest(baseUrl, 'GET', '/api/v1/question-bank/categories', adminAToken, INSTANCE_A1);
    const r2 = await apiRequest(baseUrl, 'GET', '/api/v1/question-bank/categories', adminAToken, INSTANCE_A1);
    const r3 = await apiRequest(baseUrl, 'GET', '/api/v1/question-bank/categories', adminAToken, INSTANCE_A1);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
  } finally {
    await close();
  }
});

test('Prompt 1 PostgreSQL Acceptance: real database RLS and transactional isolation verify Question Bank writes', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const authz = new AuthorizationRepository(pool);
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const instanceA = randomUUID();
  const instanceB = randomUUID();
  const userA = randomUUID();
  const reviewerA = randomUUID();
  const userB = randomUUID();
  let server: ReturnType<typeof express.application.listen> | undefined;

  try {
    await withControlPlaneTransaction(pool, {
      tenantId: 'acceptance-control-plane',
      userId: 'acceptance-runner',
      email: 'runner@test.invalid',
      role: 'super_admin'
    } as any, async client => {
      for (const [tId, iId, slug, name] of [
        [tenantA, instanceA, `qb-a-${tenantA.slice(0, 8)}`, 'QB School A'],
        [tenantB, instanceB, `qb-b-${tenantB.slice(0, 8)}`, 'QB School B']
      ]) {
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, $2, $3, 'qb-test', 'approved')`,
          [tId, name, slug]
        );
        await client.query(
          `INSERT INTO production.application_instances
             (id, tenant_id, application_id, application_name, template_id, template_version, status)
           VALUES ($1, $2, 'app_curriculum_flow', $3, 'school-standard', '1', 'active')`,
          [iId, tId, name]
        );
      }

      for (const [uId, tId, roleCode] of [
        [userA, tenantA, 'teacher'],
        [reviewerA, tenantA, 'department_head'],
        [userB, tenantB, 'tenant_admin']
      ]) {
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, 'QB User', 'hash', now())`,
          [uId, `${uId}@qb.invalid`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role, status)
           VALUES ($1, $2::text, $2::uuid, $3, 'active')`,
          [tId, uId, roleCode]
        );
        await client.query(
          `INSERT INTO production.membership_role_assignments (tenant_id, user_subject, role_code, assigned_by)
           VALUES ($1, $2, $3, 'qb-test')`,
          [tId, uId, roleCode]
        );
      }
      await client.query(
        `INSERT INTO production.teacher_subject_assignments
           (tenant_id, application_instance_id, teacher_user_id, subject_id, subject_name, class_grade_name, status)
         VALUES ($1, $2, $3, 'sub-math', 'Mathematics', 'SS 3', 'active')`,
        [tenantA, instanceA, userA]
      );
    });

    const sA = await authz.createSession({ tenantId: tenantA, userId: userA, email: `${userA}@qb.invalid`, role: 'teacher' } as any, userA, 3600);
    const sRev = await authz.createSession({ tenantId: tenantA, userId: reviewerA, email: `${reviewerA}@qb.invalid`, role: 'department_head' } as any, reviewerA, 3600);
    const tokenTeacher = issueUserToken(tenantA, userA, sA.sessionId, 'teacher');
    const tokenReviewer = issueUserToken(tenantA, reviewerA, sRev.sessionId, 'department_head');

    const auth = createAuthorizationMiddleware({
      verifyToken: ServerTenantTokenService.verifyTenantToken,
      signingConfigured: () => true,
      authorization: () => authz
    });
    const app = express();
    app.use(express.json());
    app.use('/api', createApiCapabilityGateMiddleware());
    app.use('/api/v1', createQuestionBankRouter({
      getService: () => new InstanceQuestionBankService(pool),
      auth,
      rateLimiter: createSlidingWindowRateLimiter({ windowMs: 60_000, maxRequests: 100, serviceLabel: 'qb-pg-test' })
    }));
    server = app.listen(0);
    await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const qRes = await apiRequest(url, 'POST', '/api/v1/question-bank', tokenTeacher, instanceA, {
      subjectReferenceId: 'sub-math',
      classGradeName: 'SS 3',
      questionType: 'objective',
      stem: 'DB-backed test question',
      options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }],
      correctAnswer: 'A'
    });
    assert.equal(qRes.status, 201);
    const revRes = await apiRequest(url, 'POST', `/api/v1/question-bank/items/${qRes.body.question.id}/review`, tokenReviewer, instanceA, {
      reviewStatus: 'approved'
    });
    assert.equal(revRes.status, 200);
    assert.equal(revRes.body.question.reviewStatus, 'approved');
  } finally {
    if (server) await new Promise<void>(resolve => server?.close(() => resolve()));
    await runtime.close().catch(() => {});
  }
});
