import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal, TEST_CONTROL_PLANE_SECRET } from '../db/testSupport';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import { CentralTextbookStorageProvider } from './centralTextbookStorage';
import { CentralTextbookError, CentralTextbookRepository } from './centralTextbookRepository';
import { CentralTextbookCoverageService } from './centralTextbookCoverageService';
import { CentralTextbookEditorialService } from './centralTextbookEditorialService';
import { CentralTextbookPublishingService } from './centralTextbookPublishingService';
import { CentralTextbookGenerationService, type TextbookAiAdapter } from './centralTextbookGenerationService';
import { GeminiTextbookOperationalAdapter } from './geminiTextbookAdapter';
import { TextbookContentValidationAdapter } from './textbookValidationAdapter';
import { CentralTextbookService } from './centralTextbookService';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const tenantId = '11111111-1111-4111-8111-111111111111';
const adminPrincipal = () => principal('control-plane', 'super_admin');
const schoolPrincipal = () => principal(tenantId, 'tenant_admin');

function createPool(
  handler: (sql: string, values?: unknown[]) => { rows?: unknown[]; rowCount?: number } | Error
): { pool: DatabasePool; queries: Array<{ sql: string; values?: unknown[] }> } {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const query = async <R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> => {
    queries.push({ sql: text, values });
    const res = handler(text, values);
    if (res instanceof Error) throw res;
    return {
      rows: (res.rows ?? []) as R[],
      rowCount: res.rowCount ?? res.rows?.length ?? 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    };
  };
  const client: DatabaseClient = { query, release() {} };
  return {
    queries,
    pool: {
      query,
      async connect() { return client; },
      async end() {},
      on() { return this; }
    }
  };
}

function makeFakeTextbookRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-11-17T00:00:00Z');
  return {
    id: 'tb-mth-jss1-1',
    framework_id: 'fw-nerdc-9yr-basic',
    curriculum_version_id: 'NERDC-9YEAR-BASIC-2024',
    education_level_id: 'lvl-jss',
    subject_id: 'sub-math',
    class_grade_id: 'fw-nerdc-9yr-basic:grade-jss-1',
    class_grade_name: 'JSS 1',
    subject_name: 'Mathematics',
    publisher_id: 'pub-central-editorial',
    publisher_name: 'Curriculum Server Central Press',
    title: 'JSS 1 Mathematics Core Textbook',
    subtitle: null,
    description: 'Central edition',
    current_version: '1.0.0',
    publication_status: 'draft',
    editorial_approval_status: 'pending',
    approved_by: null,
    approved_at: null,
    published_by: null,
    published_at: null,
    copyright_holder: 'Curriculum Server Editorial Board',
    license_type: 'PROPRIETARY_INSTITUTIONAL',
    license_metadata: {},
    provenance_kind: 'ai_generated',
    is_verified_authoritative: false,
    created_by: 'editor@central.invalid',
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

test('CentralTextbookGenerationService retries transient failures, persists job checkpoints, and never marks generated books as published', async () => {
  const state = {
    jobs: new Map<string, any>(),
    textbooks: new Map<string, any>(),
    chapters: new Map<string, any[]>()
  };

  const { pool } = createPool((sql, values) => {
    if (sql.includes('INSERT INTO production.central_textbook_generation_jobs')) {
      const id = `job-${state.jobs.size + 1}`;
      const row = {
        id,
        textbook_id: values?.[0] ?? null,
        curriculum_version_id: values?.[1],
        subject_id: values?.[2],
        class_grade_name: values?.[3],
        job_type: values?.[4],
        status: 'queued',
        progress_percent: 0,
        current_step: 'Queued',
        attempt_count: 0,
        max_attempts: values?.[5],
        last_error: null,
        payload: JSON.parse(String(values?.[6] || '{}')),
        checkpoint_data: {},
        initiated_by: values?.[7],
        started_at: new Date(),
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      state.jobs.set(id, row);
      return { rows: [row] };
    }
    if (sql.includes('SELECT * FROM production.central_textbook_generation_jobs WHERE id = $1')) {
      const row = state.jobs.get(String(values?.[0]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.includes('UPDATE production.central_textbook_generation_jobs')) {
      const row = state.jobs.get(String(values?.[0]));
      if (!row) return { rows: [], rowCount: 0 };
      if (values?.[1]) row.textbook_id = values[1];
      if (values?.[2]) row.status = values[2];
      if (values?.[3] !== null && values?.[3] !== undefined) row.progress_percent = values[3];
      if (values?.[4]) row.current_step = values[4];
      if (values?.[5] !== null && values?.[5] !== undefined) row.attempt_count = values[5];
      row.last_error = values?.[6] ?? null;
      if (values?.[7]) row.checkpoint_data = JSON.parse(String(values[7]));
      if (values?.[8]) row.completed_at = new Date();
      row.updated_at = new Date();
      return { rows: [row] };
    }
    if (sql.includes('INSERT INTO production.central_textbooks')) {
      const row = makeFakeTextbookRow({
        id: values?.[0],
        title: values?.[9],
        description: values?.[10]
      });
      state.textbooks.set(String(values?.[0]), row);
      return { rows: [row] };
    }
    if (sql.includes('INSERT INTO production.central_textbook_chapters')) {
      const tbId = String(values?.[1]);
      const list = state.chapters.get(tbId) || [];
      list.push({
        id: values?.[0],
        textbook_id: tbId,
        chapter_number: values?.[2],
        title: values?.[3],
        summary: values?.[4],
        topic_ids: JSON.parse(String(values?.[5] || '[]')),
        learning_objective_ids: JSON.parse(String(values?.[6] || '[]')),
        learning_objectives: JSON.parse(String(values?.[7] || '[]')),
        status: 'draft'
      });
      state.chapters.set(tbId, list);
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('FROM production.central_textbooks tb') && sql.includes('WHERE tb.id = $1')) {
      const row = state.textbooks.get(String(values?.[0]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.includes('SELECT * FROM production.central_textbook_chapters')) {
      return { rows: state.chapters.get(String(values?.[0])) || [] };
    }
    if (sql.includes('SELECT id, curriculum_version_id, subject_id, class_grade_name') && sql.includes('FROM production.central_textbooks')) {
      const row = state.textbooks.get(String(values?.[0]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.includes('INSERT INTO production.central_textbook_coverage_manifests')) {
      return {
        rows: [{
          textbook_id: values?.[0],
          curriculum_version_id: values?.[1],
          subject_id: values?.[2],
          class_grade_name: values?.[3],
          total_required_topics: values?.[4],
          topics_included_in_outline: values?.[5],
          topics_covered_by_sections: values?.[6],
          total_learning_objectives: values?.[7],
          objectives_mapped_to_content: values?.[8],
          coverage_percentage: values?.[9],
          missing_requirements: JSON.parse(String(values?.[10] || '[]')),
          sections_awaiting_review: values?.[11],
          approved_content_count: values?.[12],
          rejected_content_count: values?.[13],
          last_evaluated_at: new Date()
        }]
      };
    }
    if (sql.includes('SELECT count(*)::text AS total_topics')) return { rows: [{ total_topics: '2' }] };
    if (sql.includes('SELECT count(*)::text AS total_objectives')) return { rows: [{ total_objectives: '2' }] };
    if (sql.includes('SELECT count(DISTINCT chapter_id)')) {
      return { rows: [{ chapter_count_with_sections: '0', awaiting_review: '0', approved_count: '0', rejected_count: '0' }] };
    }
    if (sql.includes('SELECT count(DISTINCT learning_objective_id)')) {
      return { rows: [{ mapped_objectives: '2', covered_topics: '2' }] };
    }
    return { rows: [], rowCount: 0 };
  });

  const fakeCurriculumRepo = {
    getSubjectDetail: async () => ({
      id: 'sub-math',
      frameworkId: 'fw-nerdc-9yr-basic',
      educationLevelId: 'lvl-jss',
      educationLevelCode: 'jss',
      classificationId: 'cls-core',
      classificationCode: 'core',
      classificationName: 'Core',
      code: 'MTH',
      name: 'Mathematics',
      description: 'Core Math',
      isCompulsory: true,
      recommendedPeriodsPerWeek: 5,
      officialSourceUrl: '',
      targetGrades: ['JSS 1'],
      generalObjectives: [],
      recommendedTextbooks: [],
      equipmentRequirements: [],
      status: 'active' as const,
      curriculumVersionId: 'NERDC-9YEAR-BASIC-2024',
      curriculumVersionStatus: 'published' as const,
      isOfficialVerified: false,
      topicCount: 1,
      objectiveCount: 1,
      version: {
        id: 'NERDC-9YEAR-BASIC-2024',
        frameworkId: 'fw-nerdc-9yr-basic',
        versionTag: '2024.1',
        title: 'Baseline',
        academicApplicability: {},
        releaseDate: new Date().toISOString(),
        effectiveFrom: null,
        effectiveTo: null,
        supersedesVersionId: null,
        supersededByVersionId: null,
        isSuperseded: false,
        status: 'published' as const,
        editorialApprovalStatus: 'approved' as const,
        approvedBy: 'admin',
        approvedAt: new Date().toISOString(),
        isOfficialVerified: false,
        sourceProvenance: {},
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      themes: [{
        id: 'th-1',
        sourceThemeId: 'th-1',
        themeNumber: 1,
        title: 'Number & Numeration',
        description: '',
        topics: [{
          id: 'top-1',
          sourceTopicId: 'top-1',
          curriculumVersionId: 'NERDC-9YEAR-BASIC-2024',
          subjectId: 'sub-math',
          themeId: 'th-1',
          classGradeId: 'fw-nerdc-9yr-basic:grade-jss-1',
          classGradeName: 'JSS 1',
          term: 'First Term' as const,
          week: 1,
          title: 'Whole Numbers',
          contentDetails: [],
          teacherActivities: [],
          studentActivities: [],
          teachingMaterials: [],
          evaluationGuide: [],
          practicalWorkshopNotes: null,
          competencyDomain: null,
          examRelevance: {},
          subtopics: [],
          objectives: [{
            id: 'obj-1',
            curriculumVersionId: 'NERDC-9YEAR-BASIC-2024',
            topicId: 'top-1',
            subtopicId: null,
            objectiveType: 'performance' as const,
            sortOrder: 1,
            description: 'Count whole numbers up to millions',
            bloomLevel: null
          }]
        }]
      }],
      standards: []
    }),
    listGrades: async () => ({
      items: [{
        id: 'fw-nerdc-9yr-basic:grade-jss-1',
        frameworkId: 'fw-nerdc-9yr-basic',
        educationLevelId: 'lvl-jss',
        educationLevelCode: 'jss',
        educationLevelName: 'JSS',
        code: 'JSS1',
        name: 'JSS 1',
        sortOrder: 1
      }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    }),
    listCompetencies: async () => ({ items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } }),
    listSourceDocuments: async () => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } })
  } as unknown as CentralCurriculumRepository;

  let aiCalls = 0;
  const flakyAiAdapter: TextbookAiAdapter = {
    async generateOutline() {
      aiCalls += 1;
      if (aiCalls === 1) throw new Error('Transient model timeout');
      return {
        title: 'NERDC JSS 1 Mathematics Draft',
        description: 'Structured draft aligned to whole numbers',
        chapters: [{
          chapterNumber: 1,
          title: 'Whole Numbers & Place Value',
          summary: 'Covers counting and place value',
          topicIds: ['top-1'],
          learningObjectiveIds: ['obj-1'],
          learningObjectives: ['Count whole numbers up to millions']
        }]
      };
    },
    async generateChapterSections() {
      return { sections: [] };
    }
  };

  const repo = new CentralTextbookRepository(pool);
  const coverage = new CentralTextbookCoverageService(pool);
  const service = new CentralTextbookGenerationService(pool, fakeCurriculumRepo, repo, coverage, flakyAiAdapter);

  const result = await service.generateTextbookOutline(adminPrincipal(), {
    subjectIdOrCode: 'sub-math',
    classGrade: 'JSS 1',
    maxAttempts: 2
  });

  assert.equal(aiCalls, 2);
  assert.equal(result.job.status, 'completed');
  assert.equal(result.job.attemptCount, 2);
  // Generated textbook MUST stay draft/pending — never auto-published!
  assert.equal(result.textbook.publicationStatus, 'draft');
  assert.equal(result.textbook.editorialApprovalStatus, 'pending');
  assert.equal(result.textbook.isVerifiedAuthoritative, false);
});

test('restart recovery transitions interrupted running/queued generation jobs to paused_for_recovery', async () => {
  const { pool, queries } = createPool(sql => {
    if (sql.includes("SET status = 'paused_for_recovery'")) {
      return {
        rows: [{
          id: 'job-interrupted-1',
          textbook_id: null,
          curriculum_version_id: 'NERDC-9YEAR-BASIC-2024',
          subject_id: 'sub-math',
          class_grade_name: 'JSS 1',
          job_type: 'outline',
          status: 'paused_for_recovery',
          progress_percent: 25,
          current_step: 'Interrupted before completion; queued for recovery',
          attempt_count: 1,
          max_attempts: 3,
          last_error: null,
          payload: {},
          checkpoint_data: {},
          initiated_by: 'admin',
          started_at: new Date(),
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
    }
    return { rows: [] };
  });
  const genService = new CentralTextbookGenerationService(pool);
  const recovered = await genService.recoverInterruptedJobs(adminPrincipal());
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].status, 'paused_for_recovery');
  assert.ok(queries.some(q => q.sql.includes("WHERE status IN ('queued', 'running')")));
});

test('CentralTextbookPublishingService enforces editorial approval before publishing and creates checksummed version', async () => {
  const unapprovedPool = createPool(sql => {
    if (sql.includes('FROM production.central_textbooks tb')) {
      return { rows: [makeFakeTextbookRow({ publication_status: 'draft', editorial_approval_status: 'pending' })] };
    }
    return { rows: [] };
  }).pool;

  await assert.rejects(
    () => new CentralTextbookPublishingService(unapprovedPool).publishTextbook(adminPrincipal(), 'tb-mth-jss1-1'),
    (err: unknown) => err instanceof CentralTextbookError && err.code === 'APPROVAL_REQUIRED'
  );

  // Also reject non-super_admin publishing attempts
  await assert.rejects(
    () => new CentralTextbookPublishingService(unapprovedPool).publishTextbook(schoolPrincipal(), 'tb-mth-jss1-1'),
    (err: unknown) => err instanceof CentralTextbookError && err.code === 'FORBIDDEN'
  );

  let currentStatus = 'approved';
  const { pool: approvedPool, queries } = createPool((sql, values) => {
    if (sql.includes('FROM production.central_textbooks')) {
      return {
        rows: [makeFakeTextbookRow({
          publication_status: currentStatus,
          editorial_approval_status: 'approved',
          approved_by: 'chief-editor@central.invalid',
          approved_at: new Date('2026-11-17T01:00:00Z'),
          published_by: currentStatus === 'published' ? 'chief-editor@central.invalid' : null,
          published_at: currentStatus === 'published' ? new Date('2026-11-17T02:00:00Z') : null
        })]
      };
    }
    if (sql.includes('FROM production.central_textbook_chapters')) {
      return { rows: [{ id: 'ch-1', textbook_id: 'tb-mth-jss1-1', chapter_number: 1, title: 'Ch 1', summary: '', topic_ids: [], learning_objective_ids: [], learning_objectives: [], status: 'approved' }] };
    }
    if (sql.includes('SELECT * FROM production.central_textbook_sections')) {
      return { rows: [{ id: 'sec-1', textbook_id: 'tb-mth-jss1-1', chapter_id: 'ch-1', section_number: 1, title: 'Sec 1', content_markdown: 'Body', examples: [], worked_solutions: [], practical_activities: [], key_vocabulary: [], common_misconceptions: [], review_status: 'approved', updated_at: new Date() }] };
    }
    if (sql.includes('UPDATE production.central_textbooks') && sql.includes("publication_status = 'published'")) {
      currentStatus = 'published';
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO production.central_textbook_coverage_manifests')) {
      return {
        rows: [{
          textbook_id: 'tb-mth-jss1-1',
          curriculum_version_id: 'NERDC-9YEAR-BASIC-2024',
          subject_id: 'sub-math',
          class_grade_name: 'JSS 1',
          total_required_topics: 1,
          topics_included_in_outline: 1,
          topics_covered_by_sections: 1,
          total_learning_objectives: 1,
          objectives_mapped_to_content: 1,
          coverage_percentage: 100,
          missing_requirements: [],
          sections_awaiting_review: 0,
          approved_content_count: 1,
          rejected_content_count: 0,
          last_evaluated_at: new Date()
        }]
      };
    }
    if (sql.includes('SELECT count')) return { rows: [{ total_topics: '1', total_objectives: '1', chapter_count_with_sections: '1', awaiting_review: '0', approved_count: '1', rejected_count: '0', mapped_objectives: '1', covered_topics: '1' }] };
    return { rows: [], rowCount: 0 };
  });

  const published = await new CentralTextbookPublishingService(approvedPool).publishTextbook(
    adminPrincipal(),
    'tb-mth-jss1-1',
    { versionNumber: '1.0.0', changelog: 'First approved release' }
  );
  assert.equal(published.publicationStatus, 'published');
  const verInsert = queries.find(q => q.sql.includes('INSERT INTO production.central_textbook_versions'));
  assert.ok(verInsert);
  assert.match(String(verInsert.values?.[4] || ''), /^[a-f0-9]{64}$/);
});

test('CentralTextbookEditorialService blocks empty approvals and requires central editorial admin role', async () => {
  const { pool } = createPool(sql => {
    if (sql.includes('SELECT publication_status FROM production.central_textbooks')) {
      return { rows: [{ publication_status: 'in_review' }] };
    }
    if (sql.includes('FROM production.central_textbook_sections')) {
      return { rows: [{ total: '0', rejected: '0' }] };
    }
    return { rows: [], rowCount: 0 };
  });
  const editorial = new CentralTextbookEditorialService(pool);

  await assert.rejects(
    () => editorial.approveTextbook(schoolPrincipal(), 'tb-1'),
    (err: unknown) => err instanceof CentralTextbookError && err.code === 'FORBIDDEN'
  );
  await assert.rejects(
    () => editorial.approveTextbook(adminPrincipal(), 'tb-1'),
    (err: unknown) => err instanceof CentralTextbookError && err.code === 'VALIDATION_ERROR'
  );
});

test('tenant consumption filters strictly to published textbooks and entitled_private media assets', async () => {
  const { pool, queries } = createPool(() => ({ rows: [], rowCount: 0 }));
  const repo = new CentralTextbookRepository(pool);

  await repo.listTextbooks(schoolPrincipal(), { subjectId: 'sub-math' });
  const tenantListQuery = queries.find(q => q.sql.includes('FROM production.central_textbooks tb') && q.sql.includes('LIMIT'));
  assert.ok(tenantListQuery);
  assert.match(tenantListQuery.sql, /tb\.publication_status = 'published'/);

  await repo.getMediaAsset(schoolPrincipal(), 'tb-1', '11111111-1111-4111-8111-111111111111');
  const mediaQuery = queries.find(q => q.sql.includes('FROM production.central_textbook_media_assets'));
  assert.ok(mediaQuery);
  assert.match(mediaQuery.sql, /access_scope = 'entitled_private'/);
  assert.match(mediaQuery.sql, /publication_status = 'published'/);
});

test('CentralTextbookStorageProvider stores private media atomically, verifies SHA-256, and rejects path traversal', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'central-tb-storage-'));
  try {
    const storage = new CentralTextbookStorageProvider(tempRoot);
    const payload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8"/></svg>');
    const artifact = await storage.writeMedia('tb-math-jss1', 'diagram.svg', payload);

    assert.equal(artifact.storageProvider, 'local_durable');
    assert.equal(artifact.bytesSize, payload.length);

    const readBack = await storage.readMedia(artifact.storageKey, artifact.checksumSha256);
    assert.deepEqual(readBack, payload);

    await assert.rejects(
      () => storage.readMedia(artifact.storageKey, '0'.repeat(64)),
      /TEXTBOOK_MEDIA_CHECKSUM_MISMATCH/
    );
    await assert.rejects(
      () => storage.readMedia('../../etc/passwd'),
      /INVALID_STORAGE_KEY|STORAGE_PATH_TRAVERSAL_REJECTED/
    );

    assert.equal(await storage.deleteMedia(artifact.storageKey), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('CentralTextbookService has zero Question Bank queries in coverage computation and tenant media upload rejects school actors', async () => {
  const { pool } = createPool(() => ({ rows: [] }));
  const service = new CentralTextbookService(pool);

  await assert.rejects(
    () => service.uploadPrivateMedia(schoolPrincipal(), {
      textbookId: 'tb-1',
      assetType: 'diagram',
      title: 'Test',
      mimeType: 'image/svg+xml',
      fileName: 'a.svg',
      content: Buffer.from('x')
    }),
    (err: unknown) => err instanceof CentralTextbookError && err.code === 'FORBIDDEN'
  );

  assert.equal(evaluateProductionCapabilityGate('GET', '/shared/textbooks').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('GET', '/shared/textbooks/tb-1/coverage').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('GET', '/shared/textbooks/tb-1/chapters/ch-1').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/platform/shared/textbooks/generate-full').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/platform/shared/textbooks/tb-1/validate').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/platform/shared/textbooks/tb-1/supersede').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/shared/textbooks/tb-1/publish').capabilityId, 'central_shared_content_write_protection');
});

test('GeminiTextbookOperationalAdapter fails explicitly when GEMINI_API_KEY is absent (zero mock textbook output)', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const adapter = new GeminiTextbookOperationalAdapter();
    await assert.rejects(
      () => adapter.generateOutline({
        actor: {
          tenantId: 'platform-control-plane',
          role: 'super_admin',
          email: 'admin@curriculum.ng',
          userId: 'platform-editorial-admin'
        } as any,
        subject: { id: 'sub-math', name: 'Mathematics', code: 'MTH', educationLevelCode: 'jss', version: { id: 'V1', title: 'V1', versionTag: '1', isOfficialVerified: false } } as any,
        classGrade: 'JSS 1',
        topics: []
      }),
      (err: unknown) => err instanceof CentralTextbookError && err.code === 'VALIDATION_ERROR' && /GEMINI_API_KEY/.test(err.message)
    );
  } finally {
    if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
  }
});

test('TextbookContentValidationAdapter detects duplicate chapters, short explanations, missing required topics, and passes complete drafts', () => {
  const validator = new TextbookContentValidationAdapter();
  const baseBook = {
    ...makeFakeTextbookRow(),
    id: 'tb-val-1',
    frameworkId: 'fw-nerdc',
    curriculumVersionId: 'VER-1',
    educationLevelId: 'lvl-jss',
    subjectId: 'sub-math',
    classGradeId: 'gr-jss1',
    classGradeName: 'JSS 1',
    subjectName: 'Mathematics',
    currentVersion: '1.0.0',
    publicationStatus: 'draft' as const,
    editorialApprovalStatus: 'pending' as const,
    copyrightHolder: 'Board',
    licenseType: 'PROPRIETARY_INSTITUTIONAL',
    licenseMetadata: {},
    provenanceKind: 'ai_generated' as const,
    isVerifiedAuthoritative: false,
    academicYear: '2026',
    validationPassed: false,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contributors: [],
    mediaAssets: [],
    citations: [{ id: 'c1', textbookId: 'tb-val-1', citationKey: 'NERDC', authorOrSource: 'NERDC', title: 'JSS1 Syllabus' }],
    illustrations: [],
    glossaries: [],
    validationReports: [],
    revisions: [],
    versions: [],
    reviews: [],
    objectiveMappings: [{ id: 'map-1', textbookId: 'tb-val-1', chapterId: 'ch-1', sectionId: 'sec-1', topicId: 'top-1', learningObjectiveId: 'obj-1', mappingStrength: 'primary' as const }],
    chapters: [{
      id: 'ch-1',
      textbookId: 'tb-val-1',
      chapterNumber: 1,
      title: 'Whole Numbers',
      summary: 'Counting',
      topicIds: ['top-1'],
      learningObjectiveIds: ['obj-1'],
      learningObjectives: ['Count numbers'],
      status: 'draft' as const,
      sections: [{
        id: 'sec-1',
        textbookId: 'tb-val-1',
        chapterId: 'ch-1',
        sectionNumber: 1,
        title: 'Short Section',
        contentMarkdown: 'Too brief.',
        examples: [],
        workedSolutions: [],
        practicalActivities: [],
        instructionalTables: [],
        illustrationSpecs: [],
        keyVocabulary: [],
        commonMisconceptions: [],
        contentBlocks: [],
        reviewStatus: 'pending' as const,
        updatedAt: new Date().toISOString()
      }]
    }]
  };

  const requiredTopics: any[] = [
    { id: 'top-1', objectives: [{ id: 'obj-1', description: 'Obj 1' }] },
    { id: 'top-2', objectives: [{ id: 'obj-2', description: 'Obj 2' }] }
  ];

  const badResult = validator.validate(baseBook, requiredTopics);
  assert.equal(badResult.overallPassed, false);
  assert.ok(badResult.findings.some(f => f.code === 'SECTION_EXPLANATION_TOO_SHORT'));
  assert.ok(badResult.findings.some(f => f.code === 'MISSING_CURRICULUM_TOPICS'));

  // Fix issues
  baseBook.chapters[0].topicIds = ['top-1', 'top-2'];
  baseBook.chapters[0].learningObjectiveIds = ['obj-1', 'obj-2'];
  baseBook.chapters[0].sections[0].contentMarkdown =
    'Whole numbers begin at zero and extend indefinitely. Students apply place value to compare and order numbers up to millions in everyday commerce and measurement.';
  baseBook.chapters[0].sections[0].examples = [{ title: 'Place Value', problem: 'Find place value of 5 in 5,200', solution: 'Five thousand' }];
  baseBook.chapters[0].sections[0].keyVocabulary = [{ term: 'Integer', definition: 'A whole number without fractional parts.' }];

  const goodResult = validator.validate(baseBook, requiredTopics);
  assert.equal(goodResult.overallPassed, true);
  assert.equal(goodResult.summary.errorCount, 0);
});

test('CentralTextbookPublishingService supersedes published textbooks with withdrawal timestamp and audit trail', async () => {
  const { pool, queries } = createPool(sql => {
    if (sql.includes('FROM production.central_textbooks WHERE id = $1')) {
      return { rows: [{ current_version: '1.0.0', publication_status: 'published' }] };
    }
    if (sql.includes('FROM production.central_textbooks tb')) {
      return { rows: [makeFakeTextbookRow({ id: 'tb-old', publication_status: 'superseded', superseded_by_textbook_id: 'tb-new', withdrawal_at: new Date() })] };
    }
    if (sql.startsWith('UPDATE') || sql.startsWith('INSERT') || sql.includes('INSERT INTO')) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });

  const updated = await new CentralTextbookPublishingService(pool).supersedeTextbook(
    adminPrincipal(),
    'tb-old',
    'tb-new',
    'Updated for 2026 NERDC curriculum revision'
  );
  assert.equal(updated.publicationStatus, 'superseded');
  assert.ok(queries.some(q => q.sql.includes("SET publication_status = 'superseded'") && q.values?.[1] === 'tb-new'));
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO central_textbooks.textbook_revisions')));
});
