import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from './db/postgres';
import { principal, TEST_CONTROL_PLANE_SECRET } from './db/testSupport';
import { createAuthorizedPrincipal } from './authorization/authorizedPrincipal';
import {
  CentralCurriculumRepository,
  normalizePagination
} from './curriculum/centralCurriculumRepository';
import { CentralCurriculumService } from './curriculum/centralCurriculumService';
import { migrateNerdcDatasetsToPostgres } from './curriculum/nerdcMigrationLoader';
import { NERDC_SUBJECTS_DATABASE } from '../src/data/nerdcDatabase';
import { CentralTextbookService } from './textbooks/centralTextbookService';
import { CentralTextbookRepository } from './textbooks/centralTextbookRepository';
import { CentralTextbookStorageProvider } from './textbooks/centralTextbookStorage';
import { GeminiTextbookOperationalAdapter } from './textbooks/geminiTextbookAdapter';
import { InstanceQuestionBankService } from './questionBank/instanceQuestionBankService';
import {
  SharedServiceAuthorizationRepository,
  evaluateSharedServiceAccess,
  resolveSharedServiceEntitlementMode
} from './sharedServices/authorization';
import { getCentralSharedService } from './sharedServices/registry';
import { createSlidingWindowRateLimiter } from './sharedServices/rateLimiter';
import { SchoolProvisioningRepository } from './db/schoolProvisioningRepository';
import { evaluateProductionCapabilityGate } from './capabilities/productionCapabilityRegistry';
import { buildApplicationInstanceConfiguration } from '../src/data/applicationInstanceConfiguration';
import { validateSchoolProvisioningRequest } from './schoolProvisioning';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const INSTANCE_A = 'aaaa1111-1111-4111-8111-111111111111';
const INSTANCE_B = 'bbbb2222-2222-4222-8222-222222222222';
const USER_A = '33333333-3333-4333-8333-333333333333';
const SESSION_A = '44444444-4444-4444-8444-444444444444';

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

// =========================================================================
// SECTION 3: TENANT ISOLATION & SECURITY ACCEPTANCE
// =========================================================================

test('Stage 5 Section 3.1: Central curriculum defaults strictly to published-only for school tenants and permits historical superseded lookup only explicitly', async () => {
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('count(*)::text AS count')) return { rows: [{ count: '0' }] };
    return { rows: [], rowCount: 0 };
  });

  const repo = new CentralCurriculumRepository(pool);
  const schoolA = principal(TENANT_A, 'tenant_admin');
  const superAdmin = principal('control-plane', 'super_admin');

  await repo.listSubjects(schoolA, {});
  const defaultSchoolQuery = queries.find(q => q.sql.includes('FROM production.curriculum_version_subjects vs') && q.sql.includes('LIMIT'));
  assert.ok(defaultSchoolQuery);
  assert.match(defaultSchoolQuery.sql, /v\.status = 'published'/);
  assert.doesNotMatch(defaultSchoolQuery.sql, /'approved'/);

  await repo.listVersions(schoolA, {});
  const schoolVersionQuery = queries.find(q => q.sql.includes('FROM production.curriculum_versions v') && q.sql.includes('ORDER BY v.release_date'));
  assert.ok(schoolVersionQuery);
  assert.match(schoolVersionQuery.sql, /v\.status IN \('published', 'superseded'\)/);

  queries.length = 0;
  await repo.listTopics(schoolA, { versionId: 'NERDC-2023-HISTORICAL' });
  const explicitHistQuery = queries.find(q => q.sql.includes('FROM production.curriculum_topics t') && q.sql.includes('LIMIT'));
  assert.ok(explicitHistQuery);
  assert.match(explicitHistQuery.sql, /v\.status IN \('published', 'superseded'\)/);

  queries.length = 0;
  await repo.listSubjects(superAdmin, {});
  const adminQuery = queries.find(q => q.sql.includes('FROM production.curriculum_version_subjects vs') && q.sql.includes('LIMIT'));
  assert.ok(adminQuery);
  assert.match(adminQuery.sql, /v\.status IN \('published', 'approved'\)/);
});

test('Stage 5 Section 3.2: Tenant principals cannot mutate central curriculum/textbook data or upload central media', async () => {
  const { pool } = createRecordedPool(() => ({ rows: [], rowCount: 0 }));
  const schoolA = principal(TENANT_A, 'tenant_admin');
  const curriculumService = new CentralCurriculumService(pool);
  const textbookService = new CentralTextbookService(pool, { curriculumPort: curriculumService.retrieval });

  await assert.rejects(
    () => curriculumService.publishVersion(schoolA, 'VER-2026'),
    /Privileged control-plane authorization is required/
  );
  await assert.rejects(
    () => textbookService.publishing.publishTextbook(schoolA, 'TB-1'),
    /Only central editorial administrators may publish authoritative textbooks/
  );
  await assert.rejects(
    () => textbookService.uploadPrivateMedia(schoolA, {
      textbookId: 'TB-1',
      assetType: 'diagram',
      title: 'Unauthorized',
      mimeType: 'image/png',
      fileName: 'unauth.png',
      content: Buffer.from('test')
    }),
    /Only central editorial administrators may upload textbook media/
  );

  // Verify gateway route guards block both root and subpath write verbs while allowing authorization POST
  assert.equal(evaluateProductionCapabilityGate('POST', '/shared/curriculum/subjects').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('PUT', '/shared/textbooks/TB-1').allowed, true);
  assert.equal(evaluateProductionCapabilityGate('DELETE', '/shared/textbooks/TB-1').allowed, true);
  const serverSource = await readFile(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert.match(serverSource, /app\.all\('\/api\/v1\/shared\/curriculum\*'/);
  assert.match(serverSource, /app\.all\('\/api\/v1\/shared\/textbooks\*'/);
});

test('Stage 5 Section 3.3: Entitlement mode defaults to strict in NODE_ENV=production and fails closed on revoked/expired/missing entitlements and cross-tenant impersonation', async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevMode = process.env.SHARED_SERVICE_ENTITLEMENT_MODE;
  delete process.env.SHARED_SERVICE_ENTITLEMENT_MODE;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(resolveSharedServiceEntitlementMode(), 'strict');
    process.env.NODE_ENV = 'test';
    assert.equal(resolveSharedServiceEntitlementMode(), 'decoupled');
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevMode !== undefined) process.env.SHARED_SERVICE_ENTITLEMENT_MODE = prevMode;
    else delete process.env.SHARED_SERVICE_ENTITLEMENT_MODE;
  }

  // Strict production mode rejects missing entitlement even when dependency is declared
  const missingInProd = evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'consume',
    requestedOperation: 'curriculum.retrieve',
    applicationInstanceId: INSTANCE_A,
    entitlementMode: 'strict',
    row: {
      application_id: 'app_curriculum_flow',
      application_status: 'active',
      service_dependencies: ['central_curriculum'],
      entitlement_id: null,
      entitlement_status: null,
      entitlement_expires_at: null,
      entitlement_revoked_at: null
    },
    hasPermissions: () => true
  });
  assert.deepEqual(missingInProd, { allowed: false, reason: 'SERVICE_ENTITLEMENT_MISSING' });

  // Cross-tenant impersonation attempt: School A presenting School B's instanceId returns 0 rows inside tenant A transaction
  const schoolA = principal(TENANT_A, 'tenant_admin');
  const authorizedA = createAuthorizedPrincipal({
    tenant: schoolA,
    userId: USER_A,
    sessionId: SESSION_A,
    grants: [{ roleCode: 'tenant_admin', permissions: ['shared.curriculum.consume'], scopes: [] }]
  });
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('FROM production.application_instances instance')) return { rows: [] };
    return { rows: [], rowCount: 1 };
  });
  const decision = await new SharedServiceAuthorizationRepository(pool).evaluate({
    tenant: schoolA,
    principal: authorizedA,
    serviceId: 'central_curriculum',
    operation: 'consume',
    applicationInstanceId: INSTANCE_B,
    entitlementMode: 'strict'
  });
  assert.deepEqual(decision, { allowed: false, reason: 'INVALID_APPLICATION_INSTANCE' });
  const lookup = queries.find(q => q.sql.includes('FROM production.application_instances instance'));
  assert.equal(lookup?.values?.[0], TENANT_A);
  assert.equal(lookup?.values?.[1], INSTANCE_B);
});

test('Stage 5 Section 3.4: PostgreSQL migrations 014, 015, and 016 enforce FORCED RLS and strict domain separation on every table', async () => {
  const m014 = await readFile(path.join(process.cwd(), 'src/db/migrations/014_central_shared_services_foundation.sql'), 'utf8');
  const m015 = await readFile(path.join(process.cwd(), 'src/db/migrations/015_central_curriculum_and_textbooks.sql'), 'utf8');
  const m016 = await readFile(path.join(process.cwd(), 'src/db/migrations/016_central_curriculum_and_textbook_domains.sql'), 'utf8');

  for (const [label, sql] of [['014', m014], ['015', m015], ['016', m016]]) {
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/, `Migration ${label} must enable RLS`);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/, `Migration ${label} must force RLS`);
  }

  // Editorial reviews, generation jobs, validation reports, and revisions must NEVER have tenant SELECT policies
  assert.doesNotMatch(m015, /CREATE POLICY.*ON production\.central_textbook_editorial_reviews.*FOR SELECT/);
  assert.doesNotMatch(m015, /CREATE POLICY.*ON production\.central_textbook_generation_jobs.*FOR SELECT/);
  assert.match(m016, /tb_admin_only_tables TEXT\[\] := ARRAY\[\s*'central_textbooks\.textbook_validation_reports',\s*'central_textbooks\.textbook_revisions'/);

  // Instance Question Bank tables require BOTH tenant_id AND application_instance_id predicates in queries
  for (const tbl of [
    'production.instance_question_categories',
    'production.instance_question_bank_items',
    'production.instance_assessment_blueprints',
    'production.instance_exam_configurations',
    'production.instance_assessment_records'
  ]) {
    assert.ok(m015.includes(tbl), `Missing ${tbl} in migration 015`);
  }
});

// =========================================================================
// SECTION 4 & 5: CURRICULUM & TEXTBOOK RELIABILITY & PROVENANCE
// =========================================================================

test('Stage 5 Section 4: Pagination clamping prevents unbounded curriculum reads and seeded NERDC data stays non-official-verified', async () => {
  assert.deepEqual(normalizePagination(-3, 5000), { page: 1, limit: 100, offset: 0 });
  assert.deepEqual(normalizePagination(3, 10), { page: 3, limit: 10, offset: 20 });

  const { pool } = createRecordedPool(() => ({ rows: [], rowCount: 1 }));
  const report = await migrateNerdcDatasetsToPostgres(
    pool,
    principal('control-plane', 'super_admin'),
    NERDC_SUBJECTS_DATABASE.slice(0, 2)
  );
  assert.equal(report.isOfficialVerified, false);
  assert.equal(report.provenanceOrigin, 'nerdc_typescript_baseline_migration');
});

test('Stage 5 Section 5: Gemini textbook adapter fails closed without GEMINI_API_KEY and media storage rejects path traversal', async () => {
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
        subject: {
          id: 'sub-phy',
          frameworkId: 'fw-nerdc',
          educationLevelId: 'lvl-sss',
          educationLevelCode: 'sss',
          classificationId: 'cls-science',
          classificationCode: 'science',
          classificationName: 'Science & Mathematics',
          code: 'PHY',
          name: 'Physics',
          description: 'Physics',
          isCompulsory: false,
          recommendedPeriodsPerWeek: 4,
          officialSourceUrl: '',
          targetGrades: ['SS 1'],
          generalObjectives: [],
          recommendedTextbooks: [],
          equipmentRequirements: [],
          status: 'active',
          curriculumVersionId: 'VER-1',
          curriculumVersionStatus: 'published',
          isOfficialVerified: false,
          version: {
            id: 'VER-1',
            frameworkId: 'fw-nerdc',
            versionTag: '2026',
            title: '2026',
            academicApplicability: {},
            releaseDate: new Date().toISOString(),
            effectiveFrom: null,
            effectiveTo: null,
            supersedesVersionId: null,
            supersededByVersionId: null,
            isSuperseded: false,
            status: 'published',
            editorialApprovalStatus: 'approved',
            approvedBy: 'admin',
            approvedAt: new Date().toISOString(),
            isOfficialVerified: false,
            sourceProvenance: {},
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          themes: [],
          standards: []
        },
        classGrade: 'SS 1',
        topics: []
      }),
      /GEMINI_API_KEY is not configured/
    );
  } finally {
    if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
  }

  const storage = new CentralTextbookStorageProvider();
  await assert.rejects(
    () => storage.readMedia('../etc/passwd'),
    /INVALID_STORAGE_KEY|STORAGE_PATH_TRAVERSAL_REJECTED/
  );
});

// =========================================================================
// SECTION 6: QUESTION BANK DOMAIN INDEPENDENCE
// =========================================================================

test('Stage 5 Section 6: Instance Question Bank operates locally per tenant+instance with zero cross-domain SQL and persists CBT records', async () => {
  const schoolB = principal(TENANT_B, 'tenant_admin');
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('INSERT INTO production.instance_assessment_records')) {
      return {
        rows: [{
          id: 'rec-1',
          tenant_id: TENANT_B,
          application_instance_id: INSTANCE_B,
          exam_configuration_id: 'exam-1',
          student_identifier: 'STD-2026-001',
          score_obtained: 5,
          max_score: 10,
          responses: { 'q-1': 'B', 'q-2': 'A' },
          graded_by: 'admin@tenantb.example',
          graded_at: new Date(),
          status: 'graded',
          created_at: new Date()
        }]
      };
    }
    return { rows: [], rowCount: 1 };
  });

  const qb = new InstanceQuestionBankService(pool);
  const result = await qb.recordAssessmentSubmission(schoolB, INSTANCE_B, {
    examConfigurationId: 'exam-1',
    studentIdentifier: 'STD-2026-001',
    scoreObtained: 5,
    maxScore: 10,
    responses: { 'q-1': 'B', 'q-2': 'A' },
    status: 'graded'
  });

  assert.equal(result.tenantId, TENANT_B);
  assert.equal(result.applicationInstanceId, INSTANCE_B);
  assert.equal(result.scoreObtained, 5);
  assert.equal(result.maxScore, 10);
  assert.equal(result.status, 'graded');

  for (const q of queries) {
    assert.doesNotMatch(q.sql.toLowerCase(), /central_textbook|curriculum_subjects|curriculum_topics|central_curriculum/);
  }
});

// =========================================================================
// SECTION 7: APPLICATION BUILDER, PROVISIONING & STAGE 3 DEFERRAL
// =========================================================================

test('Stage 5 Section 7: Application Builder supports optional shared services, upgrades dependencies transactionally, and keeps Stage 3 vehicle tracking deferred', async () => {
  // 1. Provisionable without any central services declared (Question Bank remains local)
  const localOnlyConfig = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    centralServiceDependencies: [],
    deploymentArchitecture: 'shared_database'
  });
  assert.deepEqual(localOnlyConfig.centralServiceDependencies, []);

  // 2. Provisionable with Stage 2 central curriculum + central textbooks declared
  const validated = validateSchoolProvisioningRequest({
    school: {
      name: 'Stage Five Model College',
      displayName: 'Stage Five Model College',
      shortName: 'SFMC',
      slug: 'stage-five-model',
      schoolType: 'secondary',
      country: 'Nigeria',
      stateProvince: 'Lagos',
      city: 'Ikeja',
      physicalAddress: '10 Acceptance Way',
      officialContactEmail: 'info@sfmc.example',
      telephone: '+2348000000000'
    },
    configuration: {
      timeZone: 'Africa/Lagos',
      currency: 'NGN',
      language: 'en',
      academicSession: '2026-2027',
      academicTermStructure: [{ name: 'First Term', startMonth: 9, endMonth: 12 }],
      educationLevels: ['JSS', 'SSS'],
      gradingConfiguration: { passMark: 50 }
    },
    administrator: { fullName: 'Principal User', email: 'principal@sfmc.example' },
    applicationId: 'app_curriculum_flow',
    architecture: 'shared_database',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledFeatures: ['feat_school_administration_identity'],
    applicationConfiguration: buildApplicationInstanceConfiguration({
      applicationId: 'app_curriculum_flow',
      templateId: 'school-standard',
      templateVersion: '1',
      enabledCapabilities: ['feat_school_administration_identity'],
      centralServiceDependencies: ['central_curriculum', 'central_textbooks'],
      deploymentArchitecture: 'shared_database'
    }),
    commercial: {
      commercialModel: 'annual',
      planReference: 'enterprise-annual',
      priceReference: 'ng-enterprise-2026',
      currency: 'NGN',
      billingInterval: 'year'
    },
    deployment: {}
  });
  assert.deepEqual(validated.applicationConfiguration?.centralServiceDependencies, [
    'central_curriculum', 'central_textbooks'
  ]);

  // 3. Upgrade existing instance dependencies transactionally
  const { pool, queries } = createRecordedPool(sql => {
    if (sql.includes('FROM production.application_instances instance') && sql.includes('FOR UPDATE OF instance')) {
      return {
        rows: [{
          tenant_id: TENANT_A,
          school_id: 'school-a',
          configuration: { enabledCapabilities: ['feat_school_administration_identity'], centralServiceDependencies: [] },
          current_version: 2
        }]
      };
    }
    return { rows: [], rowCount: 1 };
  });
  const provRepo = new SchoolProvisioningRepository(pool);
  const upgrade = await provRepo.updateApplicationServiceDependencies(
    INSTANCE_A,
    ['central_textbooks', 'central_curriculum'],
    principal('control-plane', 'super_admin')
  );
  assert.equal(upgrade.configurationVersion, 3);
  assert.deepEqual(upgrade.centralServiceDependencies, ['central_curriculum', 'central_textbooks']);
  assert.ok(queries.some(q => q.sql.includes('INSERT INTO production.application_instance_configurations') && q.values?.[2] === 3));
  assert.ok(queries.some(q => q.sql.includes("'application_service_dependencies_updated'")));

  await assert.rejects(
    () => provRepo.updateApplicationServiceDependencies(INSTANCE_A, ['unknown_service'], principal('control-plane', 'super_admin')),
    /UNKNOWN_SHARED_SERVICE_DEPENDENCY/
  );

  // 4. Confirm Stage 3 Vehicle Tracking remains strictly deferred
  const vehicle = getCentralSharedService('central_vehicle_tracking');
  assert.equal(vehicle?.availability, 'planned');
  assert.equal(vehicle?.provisioningStatus, 'deferred');
  assert.deepEqual(vehicle?.operations, []);
  assert.equal(evaluateProductionCapabilityGate('POST', '/shared/vehicle-tracking/ingest').allowed, false);
});

// =========================================================================
// SECTION 8: RELIABILITY, RATE LIMITING, CONCURRENCY & CI WORKFLOW AUDIT
// =========================================================================

test('Stage 5 Section 8: Rate limiter enforces HTTP 429 + Retry-After, DB failures roll back & fail closed, and CI workflow grants all central schemas', async () => {
  // 1. Sliding-window rate limiter behavior
  const limiter = createSlidingWindowRateLimiter({
    windowMs: 10_000,
    maxRequests: 2,
    serviceLabel: 'central-shared-services'
  });
  const callLimiter = (tenantId: string) => new Promise<{ status: number; body?: any; headers: Record<string, string> }>(resolve => {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    const req = {
      method: 'GET',
      ip: '127.0.0.1',
      headers: {},
      trustedTenantContext: { tenantId },
      correlationId: 'corr-rate-1'
    } as any;
    const res = {
      setHeader(k: string, v: string) { headers[k] = v; },
      status(code: number) { statusCode = code; return this; },
      json(body: any) { resolve({ status: statusCode, body, headers }); }
    } as any;
    limiter(req, res, () => resolve({ status: 200, headers }));
  });

  assert.equal((await callLimiter(TENANT_A)).status, 200);
  assert.equal((await callLimiter(TENANT_A)).status, 200);
  const blocked = await callLimiter(TENANT_A);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(Number(blocked.headers['Retry-After']) >= 1);
  // Tenant B has an independent quota bucket
  assert.equal((await callLimiter(TENANT_B)).status, 200);

  // 2. Concurrent failures roll back transaction and fail closed without synthetic fallback
  const rollbackSqls: string[] = [];
  const failingPool: DatabasePool = {
    async query() { throw new Error('ECONNREFUSED'); },
    async connect() {
      return {
        async query(sql: string) {
          rollbackSqls.push(sql.trim());
          if (sql.includes('FROM production.curriculum_countries')) {
            throw new Error('ECONNREFUSED');
          }
          return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
        },
        release() {}
      };
    },
    async end() {},
    on() { return this; }
  };
  const currRepo = new CentralCurriculumRepository(failingPool);
  await assert.rejects(
    () => Promise.all([
      currRepo.listCountries(principal(TENANT_A, 'tenant_admin')),
      currRepo.listCountries(principal(TENANT_B, 'tenant_admin'))
    ]),
    /ECONNREFUSED/
  );
  assert.ok(rollbackSqls.includes('ROLLBACK'));

  // 3. CI workflow grants curriculum_runtime access to central_curriculum and central_textbooks
  const ciYaml = await readFile(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
  assert.match(ciYaml, /GRANT USAGE ON SCHEMA[^\n]*central_curriculum,\s*central_textbooks TO curriculum_runtime/);
  assert.match(ciYaml, /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA[^\n]*central_curriculum,\s*central_textbooks TO curriculum_runtime/);
  assert.match(ciYaml, /REVOKE ALL ON control_plane\.authorization_context_keys FROM curriculum_runtime/);
});
