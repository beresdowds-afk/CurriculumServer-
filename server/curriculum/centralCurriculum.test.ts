import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal, TEST_CONTROL_PLANE_SECRET } from '../db/testSupport';
import { NERDC_SUBJECTS_DATABASE } from '../../src/data/nerdcDatabase';
import { migrateNerdcDatasetsToPostgres } from './nerdcMigrationLoader';
import { CentralCurriculumError, CentralCurriculumRepository } from './centralCurriculumRepository';
import { CurriculumRetrievalAdapter } from './centralCurriculumAdapters';
import { CentralCurriculumService } from './centralCurriculumService';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';
import { curriculumRetrievalService } from '../../src/services/curriculumRetrievalService';
import { runNerdcUpdateTestSuite } from '../serverNerdcUpdateTests';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const tenantId = '11111111-1111-4111-8111-111111111111';
const adminPrincipal = () => principal('control-plane', 'super_admin');
const schoolPrincipal = () => principal(tenantId, 'tenant_admin');

function createRecordedPool(
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
  const client: DatabaseClient = {
    query,
    release() {}
  };
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

test('NERDC TypeScript dataset migration persists all subjects/topics/objectives with non-official-verified provenance', async () => {
  const { pool, queries } = createRecordedPool(() => ({ rows: [], rowCount: 1 }));
  const report = await migrateNerdcDatasetsToPostgres(pool, adminPrincipal(), NERDC_SUBJECTS_DATABASE);

  assert.equal(report.subjectsMigrated, NERDC_SUBJECTS_DATABASE.length);
  assert.ok(report.themesMigrated > 0);
  assert.ok(report.topicsMigrated > 0);
  assert.ok(report.objectivesMigrated > 0);
  assert.equal(report.isOfficialVerified, false);
  assert.equal(report.provenanceOrigin, 'nerdc_typescript_baseline_migration');

  // Verify every subject ID from NERDC_SUBJECTS_DATABASE was migrated preserving its identifier
  const subjectInserts = queries.filter(q => q.sql.includes('INSERT INTO production.curriculum_subjects'));
  assert.equal(subjectInserts.length, NERDC_SUBJECTS_DATABASE.length);
  for (const subject of NERDC_SUBJECTS_DATABASE) {
    assert.ok(subjectInserts.some(q => q.values?.[0] === subject.id && q.values?.[4] === subject.code));
  }

  // Verify curriculum versions explicitly keep is_official_verified = false
  const versionInserts = queries.filter(q => q.sql.includes('INSERT INTO production.curriculum_versions'));
  assert.equal(versionInserts.length, 2);
  for (const ins of versionInserts) {
    assert.match(ins.sql, /is_official_verified[\s\S]*false/);
  }

  // Verify source documents and curriculum competencies are populated idempotently in central_curriculum schema
  const docInserts = queries.filter(q => q.sql.includes('INSERT INTO central_curriculum.curriculum_source_documents'));
  assert.equal(docInserts.length, 2);
  const compInserts = queries.filter(q => q.sql.includes('INSERT INTO central_curriculum.curriculum_competencies'));
  assert.ok(compInserts.length >= NERDC_SUBJECTS_DATABASE.length);
});

test('non-super-admin school principals cannot execute central curriculum migrations or mutations', async () => {
  const { pool } = createRecordedPool(() => ({ rows: [], rowCount: 1 }));
  await assert.rejects(
    () => migrateNerdcDatasetsToPostgres(pool, schoolPrincipal(), NERDC_SUBJECTS_DATABASE),
    /Privileged control-plane authorization is required/
  );

  const repo = new CentralCurriculumRepository(pool);
  await assert.rejects(
    () => repo.createVersion(schoolPrincipal(), {
      id: 'VER-2026',
      frameworkId: 'fw-nerdc-9yr-basic',
      versionTag: '2026.1',
      title: 'Unauthorized Version'
    }),
    /Privileged control-plane authorization is required/
  );
  await assert.rejects(
    () => repo.approveVersion(schoolPrincipal(), 'VER-2026'),
    /Privileged control-plane authorization is required/
  );
  await assert.rejects(
    () => repo.publishVersion(schoolPrincipal(), 'VER-2026'),
    /Privileged control-plane authorization is required/
  );
});

test('multi-country curriculum frameworks (e.g. Ghana NaCCA / UK) register without Nigeria-only hardcoding', async () => {
  const { pool, queries } = createRecordedPool(() => ({ rows: [], rowCount: 1 }));
  const repo = new CentralCurriculumRepository(pool);

  const result = await repo.registerFrameworkHierarchy(adminPrincipal(), {
    country: { id: 'country-gh', isoCode: 'GH', name: 'Ghana', jurisdictionType: 'country', region: 'West Africa' },
    authority: { id: 'auth-nacca', code: 'NaCCA', name: 'National Council for Curriculum and Assessment', authorityType: 'national' },
    framework: { id: 'fw-gh-ccp', code: 'GH-CCP', name: 'Common Core Programme (JHS 1-3)' },
    levels: [{ id: 'lvl-gh-jhs', code: 'jhs', name: 'Junior High School', sortOrder: 1 }],
    grades: [{ id: 'fw-gh-ccp:grade-jhs-1', educationLevelId: 'lvl-gh-jhs', code: 'JHS1', name: 'Basic 7 (JHS 1)', sortOrder: 1 }]
  });

  assert.equal(result.frameworkId, 'fw-gh-ccp');
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO production.curriculum_countries') && q.values?.[1] === 'GH'));
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO production.curriculum_education_authorities') && q.values?.[2] === 'NaCCA'));
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO production.curriculum_frameworks') && q.values?.[3] === 'GH-CCP'));
});

test('curriculum versioning workflow enforces approval before publish and supersedes prior version cleanly', async () => {
  const { pool: unapprovedPool } = createRecordedPool(sql => {
    if (sql.includes('SELECT * FROM production.curriculum_versions WHERE id = $1')) {
      return {
        rows: [{
          id: 'NERDC-9YEAR-BASIC-2026',
          editorial_approval_status: 'pending',
          supersedes_version_id: 'NERDC-9YEAR-BASIC-2024'
        }]
      };
    }
    return { rows: [], rowCount: 1 };
  });
  const unapprovedRepo = new CentralCurriculumRepository(unapprovedPool);
  await assert.rejects(
    () => unapprovedRepo.publishVersion(adminPrincipal(), 'NERDC-9YEAR-BASIC-2026'),
    (err: unknown) => err instanceof CentralCurriculumError && err.code === 'VALIDATION_ERROR'
  );

  const { pool: approvedPool, queries } = createRecordedPool(sql => {
    if (sql.includes('SELECT * FROM production.curriculum_versions WHERE id = $1')) {
      return {
        rows: [{
          id: 'NERDC-9YEAR-BASIC-2026',
          framework_id: 'fw-nerdc-9yr-basic',
          version_tag: '2026.1',
          title: 'NERDC 2026 Revision',
          editorial_approval_status: 'approved',
          supersedes_version_id: 'NERDC-9YEAR-BASIC-2024',
          release_date: new Date('2026-01-01T00:00:00Z'),
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
    }
    if (sql.includes('UPDATE production.curriculum_versions') && sql.includes('RETURNING *')) {
      return {
        rows: [{
          id: 'NERDC-9YEAR-BASIC-2026',
          framework_id: 'fw-nerdc-9yr-basic',
          version_tag: '2026.1',
          title: 'NERDC 2026 Revision',
          status: 'published',
          editorial_approval_status: 'approved',
          supersedes_version_id: 'NERDC-9YEAR-BASIC-2024',
          release_date: new Date('2026-01-01T00:00:00Z'),
          is_official_verified: true,
          source_provenance: { origin: 'official_gazette' },
          created_by: 'admin',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
    }
    return { rows: [], rowCount: 1 };
  });

  const published = await new CentralCurriculumRepository(approvedPool).publishVersion(
    adminPrincipal(),
    'NERDC-9YEAR-BASIC-2026'
  );
  assert.equal(published.status, 'published');
  assert.ok(queries.some(q =>
    q.sql.includes("SET status = 'superseded'") &&
    q.values?.[0] === 'NERDC-9YEAR-BASIC-2024' &&
    q.values?.[1] === 'NERDC-9YEAR-BASIC-2026'
  ));
  assert.ok(queries.filter(q => q.sql.includes('INSERT INTO production.curriculum_change_history')).length === 2);
});

test('central curriculum retrieval API queries are version-aware, paginated, filtered, and exclude Question Bank tables', async () => {
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('count(*)::text AS count')) return { rows: [{ count: '1' }] };
    if (sql.includes('FROM production.curriculum_version_subjects vs') && sql.includes('LIMIT')) {
      return {
        rows: [{
          id: 'sub-math',
          framework_id: 'fw-nerdc-9yr-basic',
          education_level_id: 'lvl-jss',
          level_code: 'jss',
          classification_id: 'cls-core',
          classification_code: 'core',
          classification_name: 'Core Compulsory Subjects',
          code: 'MTH',
          name: 'Mathematics',
          description: 'Core Mathematics',
          is_compulsory: true,
          recommended_periods_per_week: 5,
          official_source_url: 'https://www.nerdc.gov.ng',
          target_grades: ['JSS 1', 'JSS 2', 'JSS 3'],
          general_objectives: [],
          recommended_textbooks: [],
          equipment_requirements: [],
          status: 'active',
          resolved_version_id: 'NERDC-9YEAR-BASIC-2024',
          resolved_version_status: 'published',
          is_official_verified: false,
          topic_count: 12,
          objective_count: 34
        }]
      };
    }
    return { rows: [], rowCount: 0 };
  });

  const repo = new CentralCurriculumRepository(pool);
  const subjects = await repo.listSubjects(schoolPrincipal(), {
    countryId: 'country-ng',
    levelCode: 'jss',
    page: 1,
    limit: 10
  });

  assert.equal(subjects.items.length, 1);
  assert.equal(subjects.items[0].id, 'sub-math');
  assert.equal(subjects.items[0].isOfficialVerified, false);
  assert.equal(subjects.pagination.total, 1);

  // Confirm SQL uses tenant transaction context for school principal and zero Question Bank tables
  assert.ok(queries.some(q => q.sql.includes("set_config('app.tenant_id'") && q.values?.[0] === tenantId));
  assert.equal(queries.some(q => q.sql.toLowerCase().includes('question_bank')), false);
});

test('capability registry allows tenant curriculum retrieval GETs and maps mutations to write-protection gate', () => {
  for (const path of [
    '/shared/curriculum/countries',
    '/shared/curriculum/authorities',
    '/shared/curriculum/frameworks',
    '/shared/curriculum/grades',
    '/shared/curriculum/subjects',
    '/shared/curriculum/subjects/sub-math',
    '/shared/curriculum/topics',
    '/shared/curriculum/objectives',
    '/shared/curriculum/competencies',
    '/shared/curriculum/source-documents',
    '/shared/curriculum/versions',
    '/shared/curriculum/coverage'
  ]) {
    assert.equal(evaluateProductionCapabilityGate('GET', path).allowed, true, path);
  }
  assert.equal(evaluateProductionCapabilityGate('POST', '/platform/shared/curriculum/versions/VER-1/submit-review').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('POST', '/platform/shared/curriculum/versions/VER-1/supersede').allowed, true);
  const writeGate = evaluateProductionCapabilityGate('POST', '/shared/curriculum/versions');
  assert.equal(writeGate.allowed, true);
  if (writeGate.allowed) {
    assert.equal(writeGate.capabilityId, 'central_shared_content_write_protection');
  }
});

test('curriculumRetrievalService validation facade preserves NERDC curriculum discovery with zero textbook/QB dependencies', () => {
  const sample = NERDC_SUBJECTS_DATABASE[0];
  const result = curriculumRetrievalService.retrieveCurriculumContext({
    subjectIdOrCode: sample.id,
    classGrade: sample.targetGrades[0]
  });
  assert.equal(result.isValid, true);
  assert.ok(result.totalTopics > 0);
  assert.ok(result.totalPerformanceObjectives > 0);
});

test('NERDC curriculum update and downstream impact regression suite passes without combined textbookDb', async () => {
  const results = await runNerdcUpdateTestSuite();
  assert.ok(results.length >= 10);
  for (const r of results) {
    assert.equal(r.passed, true, `${r.testId}: ${r.details}`);
  }
});

test('CentralCurriculumService rejects draft/unapproved curriculum for textbook generation and supports submit-review + supersede without cross-domain textbook SQL', async () => {
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('UPDATE production.curriculum_versions') && sql.includes('RETURNING *')) {
      return {
        rows: [{
          id: 'VER-2026',
          framework_id: 'fw-nerdc-9yr-basic',
          version_tag: '2026.2',
          title: '2026 Revision',
          status: sql.includes("SET status = 'under_review'") ? 'under_review' : 'superseded',
          editorial_approval_status: 'pending',
          is_official_verified: false,
          source_provenance: {},
          created_by: 'admin',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
    }
    return { rows: [], rowCount: 1 };
  });

  const service = new CentralCurriculumService(pool);
  const reviewed = await service.submitVersionForReview(adminPrincipal(), 'VER-2026', 'Ready for board check');
  assert.equal(reviewed.status, 'under_review');
  const superseded = await service.supersedeVersion(adminPrincipal(), 'VER-2026', 'VER-2027', 'Replaced by 2027 syllabus');
  assert.equal(superseded.status, 'superseded');

  // Verify zero direct SQL references to central_textbooks or question_bank in CentralCurriculumRepository queries
  for (const q of queries) {
    assert.doesNotMatch(q.sql.toLowerCase(), /central_textbook|question_bank/);
  }

  // Verify CurriculumRetrievalAdapter blocks unapproved / non-published curriculum versions
  const draftRepo = {
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
      description: 'Draft Math',
      isCompulsory: true,
      recommendedPeriodsPerWeek: 5,
      officialSourceUrl: '',
      targetGrades: ['JSS 1'],
      generalObjectives: [],
      recommendedTextbooks: [],
      equipmentRequirements: [],
      status: 'active',
      curriculumVersionId: 'VER-DRAFT',
      curriculumVersionStatus: 'draft',
      isOfficialVerified: false,
      version: {
        id: 'VER-DRAFT',
        frameworkId: 'fw-nerdc-9yr-basic',
        versionTag: '2026-draft',
        title: 'Unapproved Draft',
        academicApplicability: {},
        releaseDate: new Date().toISOString(),
        effectiveFrom: null,
        effectiveTo: null,
        supersedesVersionId: null,
        supersededByVersionId: null,
        isSuperseded: false,
        status: 'draft',
        editorialApprovalStatus: 'pending',
        approvedBy: null,
        approvedAt: null,
        isOfficialVerified: false,
        sourceProvenance: {},
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      themes: [],
      standards: []
    })
  } as unknown as CentralCurriculumRepository;

  const adapter = new CurriculumRetrievalAdapter(draftRepo);
  await assert.rejects(
    () => adapter.getSubjectForApprovedPublishedCurriculum(adminPrincipal(), 'sub-math', { classGrade: 'JSS 1' }),
    /must be both 'approved' and 'published'/
  );
});
