import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal, TEST_CONTROL_PLANE_SECRET } from '../db/testSupport';
import { InstanceQuestionBankError } from './instanceQuestionBankRepository';
import { InstanceQuestionBankService } from './instanceQuestionBankService';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const tenantA = '11111111-1111-4111-8111-111111111111';
const instanceA = 'aaaa1111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const instanceB = 'bbbb2222-2222-4222-8222-222222222222';

function createScopedPool() {
  const questions: Array<Record<string, any>> = [];
  const categories: Array<Record<string, any>> = [];
  const blueprints: Array<Record<string, any>> = [];
  const exams: Array<Record<string, any>> = [];
  const records: Array<Record<string, any>> = [];
  const queries: Array<{ sql: string; values?: unknown[] }> = [];

  const instanceOwners = new Map<string, string>([
    [instanceA, tenantA],
    [instanceB, tenantB]
  ]);
  const auditEvents: Array<{ tenantId: string; actorSubject: string; action: string; details: unknown }> = [];
  const query = async <R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> => {
    queries.push({ sql, values });

    if (sql.includes('FROM production.application_instances')) {
      const tenantId = String(values?.[0] || '');
      const instanceId = String(values?.[1] || '');
      const matches = instanceOwners.get(instanceId) === tenantId;
      return {
        rows: (matches ? [{ id: instanceId }] : []) as unknown as R[],
        rowCount: matches ? 1 : 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
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
        id: `33333333-3333-4333-8333-33333333333${categories.length + 1}`,
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
        id: hasCustomId ? values?.[0] : `44444444-4444-4444-8444-44444444440${questions.length + 1}`,
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
        id: '55555555-5555-4555-8555-555555555501',
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
        id: '66666666-6666-4666-8666-666666666601',
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
        id: '77777777-7777-4777-8777-777777777701',
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
  return { pool, queries, auditEvents };
}

test('InstanceQuestionBankService isolates questions, categories, blueprints, exams, and assessments strictly per school instance', async () => {
  const { pool } = createScopedPool();
  const service = new InstanceQuestionBankService(pool);

  const pA = principal(tenantA, 'tenant_admin');
  const pB = principal(tenantB, 'tenant_admin');

  const categoryA = await service.createCategory(pA, instanceA, {
    name: 'SSCE Mathematics Objective',
    subjectReferenceId: 'sub-math'
  });
  assert.equal(categoryA.tenantId, tenantA);
  assert.equal(categoryA.applicationInstanceId, instanceA);

  const qA = await service.createQuestion(pA, instanceA, {
    categoryId: categoryA.id,
    subjectReferenceId: 'sub-math',
    classGradeName: 'SS 3',
    questionType: 'objective',
    stem: 'Find x if 2^x = 16',
    correctAnswer: '4',
    difficulty: 'Easy'
  });
  assert.equal(qA.tenantId, tenantA);
  assert.equal(qA.applicationInstanceId, instanceA);

  // Tenant B cannot see or review Tenant A's Question Bank items
  assert.deepEqual(await service.listQuestions(pB, instanceB), []);
  await assert.rejects(
    () => service.reviewQuestion(pB, instanceB, qA.id, 'approved'),
    (err: unknown) => err instanceof InstanceQuestionBankError && err.code === 'NOT_FOUND'
  );

  // Blueprint -> Exam Configuration -> Assessment Record workflow stays strictly local
  const bp = await service.createBlueprint(pA, instanceA, {
    title: 'First Term SS 3 Mock',
    subjectReferenceId: 'sub-math',
    classGradeName: 'SS 3',
    term: 'First Term',
    curriculumVersionId: 'NERDC-SSEC-2024',
    assessmentType: 'exam',
    questionFormatsCount: { objective: 1 },
    totalMarks: 2,
    difficultyMix: { Easy: 100 }
  });
  const exam = await service.createExamConfiguration(pA, instanceA, {
    blueprintId: bp.id,
    examCode: 'MTH-SS3-MOCK-01',
    title: 'SS 3 Mathematics Mock',
    subjectReferenceId: 'sub-math',
    classGradeName: 'SS 3',
    term: 'First Term',
    selectedQuestionIds: [qA.id],
    generationHash: 'sha256-mock-hash'
  });
  const assessment = await service.recordAssessmentSubmission(pA, instanceA, {
    examConfigurationId: exam.id,
    studentIdentifier: 'STD-2026-001',
    scoreObtained: 2,
    maxScore: 2,
    responses: { [qA.id]: '4' }
  });

  assert.equal(assessment.tenantId, tenantA);
  assert.equal((await service.listAssessmentRecords(pA, instanceA)).length, 1);
  assert.equal((await service.listAssessmentRecords(pB, instanceB)).length, 0);
});

test('questions require separate review before approval, including starter imports', async () => {
  const { pool, queries } = createScopedPool();
  const service = new InstanceQuestionBankService(pool);
  const actor = principal(tenantA, 'teacher');
  const input = {
    subjectReferenceId: 'math',
    classGradeName: 'SS 3',
    questionType: 'objective' as const,
    stem: 'Calculate 2 + 2.',
    correctAnswer: '4'
  };

  await assert.rejects(
    () => service.createQuestion(actor, instanceA, { ...input, reviewStatus: 'approved' }),
    (err: unknown) => err instanceof InstanceQuestionBankError && err.code === 'VALIDATION_ERROR'
  );
  assert.equal(queries.some(q => q.sql.includes('INSERT INTO production.instance_question_bank_items')), false);

  const question = await service.createQuestion(actor, instanceA, input);
  assert.equal(question.reviewStatus, 'pending_review');
  const approved = await service.reviewQuestion(actor, instanceA, question.id, 'approved');
  assert.equal(approved.reviewStatus, 'approved');
  assert.ok(approved.approvalTimestamp);
  const rejected = await service.reviewQuestion(actor, instanceA, question.id, 'rejected');
  assert.equal(rejected.approvalTimestamp, null);
  await assert.rejects(
    () => service.reviewQuestion(actor, instanceA, question.id, 'invalid' as never),
    (err: unknown) => err instanceof InstanceQuestionBankError && err.code === 'VALIDATION_ERROR'
  );

  const seeded = [
    ...await service.seedStarterPastQuestions(actor, instanceA),
    ...await service.seedStarterTheoryQuestions(actor, instanceA),
    ...await service.seedStarterPracticalQuestions(actor, instanceA)
  ];
  assert.equal(seeded.length, 4);
  assert.ok(seeded.every(q => q.reviewStatus === 'pending_review'));
});

test('InstanceQuestionBankService rejects non-UUID tenant or application instance scopes and super_admin cross-tenant mixing', async () => {
  const { pool } = createScopedPool();
  const service = new InstanceQuestionBankService(pool);

  await assert.rejects(
    () => service.listQuestions(principal('control-plane', 'super_admin'), instanceA),
    (err: unknown) => err instanceof InstanceQuestionBankError && err.code === 'FORBIDDEN'
  );
  await assert.rejects(
    () => service.listQuestions(principal(tenantA), 'invalid-instance-id'),
    (err: unknown) => err instanceof InstanceQuestionBankError && err.code === 'VALIDATION_ERROR'
  );
});

test('Architectural separation: combined textbookQuestionBankService is deleted and zero circular dependencies remain', () => {
  const root = process.cwd();

  // 1. Legacy combined textbookDb module must not exist
  assert.equal(existsSync(path.join(root, 'src/services/textbookQuestionBankService.ts')), false);

  // 2. Instance Question Bank modules must not import Central Curriculum or Central Textbook services
  const qbRepoSrc = readFileSync(path.join(root, 'server/questionBank/instanceQuestionBankRepository.ts'), 'utf8');
  const qbSvcSrc = readFileSync(path.join(root, 'server/questionBank/instanceQuestionBankService.ts'), 'utf8');
  assert.doesNotMatch(qbRepoSrc + qbSvcSrc, /centralCurriculum|centralTextbook|textbookQuestionBank/i);

  // 3. Central Curriculum retrieval & Central Textbook services must not reference instance_question_bank or textbookDb
  const currRepoSrc = readFileSync(path.join(root, 'server/curriculum/centralCurriculumRepository.ts'), 'utf8');
  const currAdaptersSrc = readFileSync(path.join(root, 'server/curriculum/centralCurriculumAdapters.ts'), 'utf8');
  const currSvcSrc = readFileSync(path.join(root, 'server/curriculum/centralCurriculumService.ts'), 'utf8');
  const tbRepoSrc = readFileSync(path.join(root, 'server/textbooks/centralTextbookRepository.ts'), 'utf8');
  const tbCovSrc = readFileSync(path.join(root, 'server/textbooks/centralTextbookCoverageService.ts'), 'utf8');
  const tbGenSrc = readFileSync(path.join(root, 'server/textbooks/centralTextbookGenerationService.ts'), 'utf8');
  const tbGeminiSrc = readFileSync(path.join(root, 'server/textbooks/geminiTextbookAdapter.ts'), 'utf8');
  const tbValSrc = readFileSync(path.join(root, 'server/textbooks/textbookValidationAdapter.ts'), 'utf8');
  const currFacadeSrc = readFileSync(path.join(root, 'src/services/curriculumRetrievalService.ts'), 'utf8');
  const tbEngineSrc = readFileSync(path.join(root, 'src/services/textbookGenerationEngine.ts'), 'utf8');

  for (const src of [
    currRepoSrc,
    currAdaptersSrc,
    currSvcSrc,
    tbRepoSrc,
    tbCovSrc,
    tbGenSrc,
    tbGeminiSrc,
    tbValSrc,
    currFacadeSrc,
    tbEngineSrc
  ]) {
    assert.doesNotMatch(src, /textbookQuestionBankService|textbookDb|instance_question_bank/);
  }
  assert.doesNotMatch(currFacadeSrc, /textbookGenerationEngine|CentralTextbook/);
  // Central Curriculum services/adapters must never import or query Central Textbook tables
  assert.doesNotMatch(currRepoSrc + currAdaptersSrc + currSvcSrc, /central_textbook|textbook_glossaries|textbook_illustrations/);
  // Central Textbook services must never run direct SQL against curriculum_topics or curriculum_learning_objectives
  assert.doesNotMatch(tbCovSrc + tbGenSrc + tbGeminiSrc + tbValSrc, /FROM\s+production\.curriculum_|JOIN\s+production\.curriculum_|FROM\s+central_curriculum\./i);

  // Question Bank reads & scoped writes are ready; CBT execution, exam vaults, marking, results publication, and adaptive remedial remain blocked.
  assert.equal(evaluateProductionCapabilityGate('GET', '/question-bank').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/question-bank').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('PATCH', '/question-bank/categories/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/question-bank/items/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/review').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/question-bank/items/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/archive').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('DELETE', '/question-bank/items/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessment-blueprints').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/exams').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/records').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/cbt/sessions').allowed, false);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/vault/seal').allowed, false);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/marking/scripts').allowed, false);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/results/publish').allowed, false);
  assert.equal(evaluateProductionCapabilityGate('POST', '/assessments/remedial/plans').allowed, false);
});
