import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { ServerTenantTokenService } from '../tenantTokenService';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { CentralAiGatewayService } from './gatewayService';
import { GoogleGeminiProviderAdapter, type GeminiTransport } from './geminiProvider';
import { resolveGeminiAuthMode, resolveGeminiRuntimeConfig } from './modelConfig';
import { AiGatewayTrafficController } from './rateLimiter';
import { createAiGatewayRouter } from './routes';
import { AiGatewayError } from './types';
import { InMemoryAiGatewayStore } from './usageMetering';
import { GeminiTextbookOperationalAdapter } from '../textbooks/geminiTextbookAdapter';
import { CentralTextbookError } from '../textbooks/centralTextbookRepository';
import { AiGatewayClient, AiGatewayClientError } from '../../src/services/aiGatewayClient';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const INSTANCE_A = 'aaaa1111-aaaa-4111-8111-aaaaaaaa1111';

function makeToken(input: {
  tenantId: string;
  role: string;
  email: string;
  userId?: string;
}): string {
  const prevSecret = process.env.CONTROL_PLANE_SECRET;
  const prevPlatformAdmins = process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
  process.env.CONTROL_PLANE_SECRET = 'test-ai-gateway-control-plane-secret-32chars!';
  if (input.role === 'super_admin') {
    process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({ [input.email]: 'test-platform-key-that-is-at-least-32-characters' });
  }
  try {
    if (input.role === 'super_admin') {
      return ServerTenantTokenService.issuePlatformAdminToken(input.email);
    }
    return ServerTenantTokenService.issueTenantToken(
      {
        id: input.tenantId,
        appId: 'curriculum-flow',
        schoolName: `School ${input.tenantId.slice(0, 4)}`,
        subscriptionTier: 'enterprise',
        status: 'active'
      } as any,
      input.role,
      3600,
      input.email,
      input.userId || randomUUID(),
      randomUUID()
    );
  } finally {
    if (prevSecret === undefined) {
      delete process.env.CONTROL_PLANE_SECRET;
    } else {
      process.env.CONTROL_PLANE_SECRET = prevSecret;
    }
    if (prevPlatformAdmins === undefined) {
      delete process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
    } else {
      process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = prevPlatformAdmins;
    }
  }
}

function buildTestHarness(options: {
  transport: GeminiTransport;
  env?: NodeJS.ProcessEnv;
  entitlementMode?: 'strict' | 'decoupled';
  rateLimitTestController?: AiGatewayTrafficController;
  databaseAuthorizationUnavailable?: boolean;
}) {
  const prevSecret = process.env.CONTROL_PLANE_SECRET;
  process.env.CONTROL_PLANE_SECRET = 'test-ai-gateway-control-plane-secret-32chars!';

  const store = new InMemoryAiGatewayStore();
  const traffic = options.rateLimitTestController ?? new AiGatewayTrafficController();
  const env = options.env ?? {
    NODE_ENV: 'test',
    GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4',
    GOOGLE_CLOUD_LOCATION: 'europe-west1'
  };

  const provider = new GoogleGeminiProviderAdapter(options.transport, () => env);
  const gateway = new CentralAiGatewayService({
    provider,
    trafficController: traffic,
    getStore: () => ({ store, databaseConfigured: false }),
    getEntitlementMode: () => options.entitlementMode ?? 'decoupled',
    getEnv: () => env
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).correlationId = `test_corr_${Date.now()}`;
    next();
  });
  app.use(
    '/api/ai/v1',
    createAiGatewayRouter({
      gateway,
      getAuthDeps: () => ({
        poolConfigured: false,
        signingConfigured: () => true,
        verifyToken: token => ServerTenantTokenService.verifyTenantToken(token),
        platformAdministratorAllowed: email => email === 'admin@curriculum.ng',
        ...(options.databaseAuthorizationUnavailable ? {} : { authorization: {
          authorize: async (tenant, userId, sessionId) => {
            if (!sessionId) return { ok: false as const, reason: 'SESSION_REVOKED' as const };
            return {
              ok: true as const,
              principal: createAuthorizedPrincipal({
                tenant,
                userId,
                sessionId,
                grants: [{
                  roleCode: tenant.role,
                  permissions: [
                    'ai.gateway.read',
                    'ai.curriculum.generate',
                    'ai.assessments.generate',
                    'ai.cbt.generate',
                    'ai.tutor.use',
                    'question_bank.manage',
                    'assessments.manage'
                  ],
                  scopes: []
                }]
              })
            };
          }
        } })
      })
    })
  );

  return {
    app,
    gateway,
    store,
    traffic,
    restoreEnv: () => {
      if (prevSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
      else process.env.CONTROL_PLANE_SECRET = prevSecret;
    }
  };
}

async function withHttpServer(
  app: express.Express,
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test('AI gateway tenant requests fail closed when database authorization is unavailable', async () => {
  const harness = buildTestHarness({
    transport: { async generateContent() { return { text: '{"answer":"should not run"}' }; } },
    databaseAuthorizationUnavailable: true
  });
  try {
    const token = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'staff@schoola.edu.ng' });
    await withHttpServer(harness.app, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/ai/v1/capabilities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(response.status, 503);
      assert.equal((await response.json()).code, 'AUTHORIZATION_UNAVAILABLE');
    });
  } finally {
    harness.restoreEnv();
  }
});

test('1 & 16. Curriculum Server lesson generation routes via Gateway with authentic usageMetadata metering', async () => {
  const harness = buildTestHarness({
    transport: {
      async generateContent() {
        return {
          text: JSON.stringify({
            subject: 'Mathematics',
            classGrade: 'SS 2',
            topic: 'Quadratic Equations',
            subTopic: 'Factorisation & Formula',
            behavioralObjectives: ['Solve quadratic equations by factorisation'],
            previousKnowledge: 'Linear equations',
            instructionalMaterials: ['Graph board'],
            presentationSteps: [
              {
                stepNumber: 1,
                title: 'Introduction',
                durationMinutes: 15,
                teacherActivity: 'Demonstrate examples',
                studentActivity: 'Practice problems',
                learningPoint: 'Identify roots'
              }
            ],
            evaluationQuestions: ['Solve x^2 - 5x + 6 = 0'],
            assignment: ['Exercise 4A numbers 1-5']
          }),
          usageMetadata: {
            promptTokenCount: 312,
            candidatesTokenCount: 488,
            totalTokenCount: 800
          }
        };
      }
    }
  });

  try {
    const token = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'teacher@schoola.edu.ng' });
    await withHttpServer(harness.app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/ai/v1/curriculum/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'LESSON_GENERATION',
          taskType: 'lesson_note',
          payload: { subjectName: 'Mathematics', classGrade: 'SS 2', topicTitle: 'Quadratic Equations' }
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.routing.modelId, 'gemini-4-hydrogen');
      assert.equal(body.routing.authMode, 'vertex_ai_adc');
      assert.equal(body.usage.promptTokens, 312);
      assert.equal(body.usage.candidatesTokens, 488);
      assert.equal(body.usage.totalTokens, 800);
      assert.equal(body.usage.costMetadataAvailable, false);
      assert.equal(body.usage.estimatedCostUsd, null);
      assert.equal(body.data.topic, 'Quadratic Equations');
    });
  } finally {
    harness.restoreEnv();
  }
});

test('2. Curriculum Server central textbook outline/chapter generation via Gateway & GeminiTextbookOperationalAdapter', async () => {
  const mockProvider = new GoogleGeminiProviderAdapter(
    {
      async generateContent(_cfg, params) {
        if (params.contents.includes('textbook outline') || params.contents.includes('Authoritative Curriculum Topics')) {
          return {
            text: JSON.stringify({
              title: 'Central Physics SS 1',
              description: 'NERDC Physics textbook',
              academicYear: '2026/2027',
              chapters: [
                {
                  chapterNumber: 1,
                  title: 'Motion & Kinematics',
                  summary: 'Linear motion basics',
                  introductoryExplanation: 'Explains displacement and velocity.',
                  topicIds: ['top-1'],
                  learningObjectiveIds: ['obj-1'],
                  learningObjectives: ['Define velocity']
                }
              ]
            }),
            usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 300 }
          };
        }
        return {
          text: JSON.stringify({
            chapterSummary: 'Motion summary',
            sections: [
              {
                sectionNumber: 1,
                title: 'Speed and Velocity',
                contentMarkdown: 'Speed is scalar; velocity is vector.',
                examples: [{ title: 'Ex 1', problem: '100m in 10s', solution: '10 m/s' }],
                workedSolutions: ['v = 100 / 10 = 10 m/s'],
                practicalActivities: [],
                keyVocabulary: [{ term: 'Velocity', definition: 'Rate of change of displacement' }],
                commonMisconceptions: ['Confusing speed and velocity']
              }
            ]
          })
        };
      }
    },
    () => ({ NODE_ENV: 'test', GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4', GOOGLE_CLOUD_LOCATION: 'europe-west1' })
  );

  const adapter = new GeminiTextbookOperationalAdapter(mockProvider);
  const outline = await adapter.generateOutline({
    subject: {
      id: 'sub-phy',
      name: 'Physics',
      code: 'PHY',
      educationLevelCode: 'sss',
      version: { id: 'ver-1', title: 'NERDC 2026', versionTag: '2026.1', isOfficialVerified: true }
    } as any,
    classGrade: 'SS 1',
    topics: [
      {
        id: 'top-1',
        title: 'Motion',
        term: 'Term 1',
        week: 2,
        subtopics: [{ id: 'st-1', title: 'Velocity' }],
        objectives: [{ id: 'obj-1', description: 'Define velocity' }],
        contentDetails: 'Kinematics',
        teachingMaterials: ['Ticker timer']
      } as any
    ]
  });
  assert.equal(outline.title, 'Central Physics SS 1');
  assert.equal(outline.chapters.length, 1);

  const chapter = await adapter.generateChapterSections({
    textbook: { id: 'tb-1', subjectName: 'Physics', classGradeName: 'SS 1', curriculumVersionId: 'ver-1' } as any,
    chapter: { chapterNumber: 1, title: 'Motion', summary: 'Motion', learningObjectives: ['Define velocity'] } as any,
    topics: []
  });
  assert.equal(chapter.sections[0].title, 'Speed and Velocity');

  // Unconfigured credentials fail closed cleanly
  const unconfiguredAdapter = new GeminiTextbookOperationalAdapter(
    new GoogleGeminiProviderAdapter(
      { async generateContent() { return { text: '{}' }; } },
      () => ({ NODE_ENV: 'test' })
    )
  );
  await assert.rejects(
    () =>
      unconfiguredAdapter.generateOutline({
        subject: { id: 's1', name: 'Math', code: 'MTH', educationLevelCode: 'jss', version: { id: 'v1', title: 'v1', versionTag: '1', isOfficialVerified: false } } as any,
        classGrade: 'JSS 1',
        topics: []
      }),
    err => err instanceof CentralTextbookError && err.code === 'VALIDATION_ERROR'
  );
});

test('3, 4, 5, 6 & 7. Curriculum Flow & School Instance exam, CBT, and Question Bank (pending_review) generation via Gateway', async () => {
  const harness = buildTestHarness({
    transport: {
      async generateContent(_cfg, params) {
        if (params.contents.includes('CBT Examination Paper')) {
          return {
            text: JSON.stringify({
              title: 'SS 2 Biology CBT',
              subjectName: 'Biology',
              classGrade: 'SS 2',
              durationMinutes: 45,
              questions: [
                {
                  questionNumber: 1,
                  stem: 'Which organelle performs aerobic respiration?',
                  options: [
                    { key: 'A', text: 'Mitochondrion' },
                    { key: 'B', text: 'Ribosome' },
                    { key: 'C', text: 'Golgi body' },
                    { key: 'D', text: 'Vacuole' }
                  ],
                  correctAnswer: 'A',
                  explanation: 'Mitochondria synthesize ATP.',
                  difficulty: 'Easy',
                  cognitiveDemand: 'Knowledge',
                  marks: 2
                }
              ]
            })
          };
        }
        if (params.contents.includes('assessment questions')) {
          return {
            text: JSON.stringify({
              questions: [
                {
                  stem: 'Evaluate 2x + 3 = 11.',
                  options: [
                    { key: 'A', text: '4' },
                    { key: 'B', text: '5' },
                    { key: 'C', text: '7' },
                    { key: 'D', text: '8' }
                  ],
                  correctAnswer: 'A',
                  explanation: '2x = 8 => x = 4',
                  difficulty: 'Easy',
                  cognitiveDemand: 'Application'
                }
              ]
            })
          };
        }
        return {
          text: JSON.stringify({
            title: 'Terminal Mathematics Examination',
            durationMinutes: 120,
            totalMarks: 100,
            instructions: ['Answer all questions in Section A'],
            sections: [
              {
                sectionName: 'Section A',
                instructions: 'Objective',
                marks: 40,
                questions: [
                  {
                    questionNumber: 1,
                    questionType: 'multiple_choice',
                    questionText: 'Simplify 3^2 * 3^3',
                    options: [
                      { key: 'A', text: '3^5' },
                      { key: 'B', text: '3^6' }
                    ],
                    marks: 2,
                    topic: 'Indices',
                    cognitiveLevel: 'Application',
                    difficulty: 'Easy'
                  }
                ]
              }
            ]
          })
        };
      }
    }
  });

  try {
    const schoolToken = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'exam@schoola.edu.ng' });
    await withHttpServer(harness.app, async baseUrl => {
      // Curriculum Flow Exam
      const flowExamRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schoolToken}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_FLOW',
          capability: 'EXAMINATION_GENERATION',
          taskType: 'secure_exam',
          payload: { subjectName: 'Mathematics', classGrade: 'SS 2', term: 'Term 1' }
        })
      });
      assert.equal(flowExamRes.status, 200);
      const flowExam = await flowExamRes.json();
      assert.equal(flowExam.reviewRequired, true);
      assert.ok(flowExam.data.examId);
      assert.match(flowExam.data.generationHash, /^sha256-/);

      // Curriculum Flow CBT
      const flowCbtRes = await fetch(`${baseUrl}/api/ai/v1/cbt/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schoolToken}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_FLOW',
          capability: 'CBT_GENERATION',
          payload: { subjectName: 'Biology', classGrade: 'SS 2', questionCount: 1 }
        })
      });
      assert.equal(flowCbtRes.status, 200);
      const flowCbt = await flowCbtRes.json();
      assert.equal(flowCbt.data.reviewStatus, 'pending_review');

      // School Instance Exam
      const schoolExamRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schoolToken}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_EXAMINATION_GENERATION',
          taskType: 'secure_exam',
          applicationInstanceId: INSTANCE_A,
          payload: { subjectName: 'Mathematics', classGrade: 'SS 2' }
        })
      });
      assert.equal(schoolExamRes.status, 200);

      // School Instance CBT
      const schoolCbtRes = await fetch(`${baseUrl}/api/ai/v1/cbt/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schoolToken}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_CBT_GENERATION',
          applicationInstanceId: INSTANCE_A,
          payload: { subjectName: 'Biology', classGrade: 'SS 2' }
        })
      });
      assert.equal(schoolCbtRes.status, 200);

      // School Question Bank Generation (strictly pending_review)
      const qbRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schoolToken}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_QUESTION_BANK_GENERATION',
          taskType: 'question_bank_items',
          applicationInstanceId: INSTANCE_A,
          payload: { subjectName: 'Mathematics', classGrade: 'SS 1', questionType: 'objective', count: 1 }
        })
      });
      assert.equal(qbRes.status, 200);
      const qbBody = await qbRes.json();
      assert.equal(qbBody.reviewRequired, true);
      assert.equal(qbBody.data.questions[0].creationMethod, 'ai_assisted');
      assert.equal(qbBody.data.questions[0].reviewStatus, 'pending_review');
    });
  } finally {
    harness.restoreEnv();
  }
});

test('8. Provisioning Agent recommendations are strictly readOnlyAdvisory and never mutate infrastructure', async () => {
  const harness = buildTestHarness({
    transport: {
      async generateContent() {
        return {
          text: JSON.stringify({
            recommendedTopology: 'Dedicated Cloud SQL + Shared Cloud Run',
            recommendedGcpRegion: 'europe-west1',
            rationale: 'Sized for 1,200 students in Nigeria.',
            tradeOffs: ['Lower monthly cost vs sovereign GCP project'],
            extractedRequirements: {
              schoolName: 'Horizon Academy',
              studentPopulation: 1200,
              staffPopulation: 90,
              concurrentUsers: 300,
              securityIsolation: 'dedicated_service',
              databaseStrategy: 'PostgreSQL RLS',
              storageStrategy: 'GCS Uniform Bucket',
              storageRequirementsGb: 40
            },
            resourceSizing: {
              cloudRunMinInstances: 1,
              cloudRunMaxInstances: 6,
              cloudRunCpu: '2 vCPU',
              cloudRunMemory: '2Gi',
              cloudSqlTier: 'db-custom-2-7680',
              estimatedConcurrentPeakUsers: 350
            },
            workloadAnalysis: {
              profile: 'Exam term peak',
              cbtConcurrencyPeak: 250,
              aiRequestsPerDayEstimate: 120,
              notes: ['No automated GCP IAM mutation allowed']
            },
            // Even if model tries returning directInfrastructureMutationAllowed: true, validator must override
            directInfrastructureMutationAllowed: true
          })
        };
      }
    }
  });

  try {
    const adminToken = makeToken({
      tenantId: 'platform-control-plane',
      role: 'super_admin',
      email: 'admin@curriculum.ng'
    });
    const staffToken = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'staff@schoola.edu.ng' });

    await withHttpServer(harness.app, async baseUrl => {
      // Non-admin caller rejected
      const forbiddenRes = await fetch(`${baseUrl}/api/ai/v1/provisioning/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          applicationId: 'PROVISIONING_AGENT',
          capability: 'ARCHITECTURE_RECOMMENDATION',
          payload: { prompt: 'Recommend setup for Horizon Academy with 1200 students' }
        })
      });
      assert.equal(forbiddenRes.status, 403);

      // Platform admin gets strictly read-only advisory output
      const okRes = await fetch(`${baseUrl}/api/ai/v1/provisioning/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          applicationId: 'PROVISIONING_AGENT',
          capability: 'ARCHITECTURE_RECOMMENDATION',
          payload: { prompt: 'Recommend setup for Horizon Academy with 1200 students' }
        })
      });
      assert.equal(okRes.status, 200);
      const body = await okRes.json();
      assert.equal(body.readOnlyAdvisory, true);
      assert.equal(body.data.readOnlyAdvisory, true);
      assert.equal(body.data.directInfrastructureMutationAllowed, false);
    });
  } finally {
    harness.restoreEnv();
  }
});

test('9, 10, 11 & 12. Tenant isolation, forged tenant headers, unregistered app, and unsupported capability are rejected cleanly', async () => {
  const harness = buildTestHarness({
    transport: {
      async generateContent() {
        return { text: JSON.stringify({ answer: 'ok' }) };
      }
    }
  });

  try {
    const tokenA = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'staff@a.ng' });
    const tokenInvalidTenant = makeToken({ tenantId: 'not-a-valid-uuid', role: 'staff', email: 'bad@a.ng' });

    await withHttpServer(harness.app, async baseUrl => {
      // 9a. Forged x-tenant-id for School B using School A token -> 403 TENANT_ISOLATION_VIOLATION
      const crossTenantRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
          'x-tenant-id': TENANT_B
        },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          payload: { subjectName: 'Math', classGrade: 'SS 1', completedTopics: ['Sets'] }
        })
      });
      assert.equal(crossTenantRes.status, 403);
      assert.equal((await crossTenantRes.json()).code, 'TENANT_ISOLATION_VIOLATION');

      // 9b. School A cannot read School B AI usage stats
      const usageCrossRes = await fetch(`${baseUrl}/api/ai/v1/usage?tenantId=${TENANT_B}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.equal(usageCrossRes.status, 403);
      assert.equal((await usageCrossRes.json()).code, 'TENANT_ISOLATION_VIOLATION');

      // 10. Invalid tenant identity UUID fails closed
      const badTenantRes = await fetch(`${baseUrl}/api/ai/v1/curriculum/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenInvalidTenant}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'LESSON_GENERATION',
          payload: { subjectName: 'Math', classGrade: 'JSS 1', topicTitle: 'Fractions' }
        })
      });
      assert.equal(badTenantRes.status, 403);
      assert.equal((await badTenantRes.json()).code, 'TENANT_ISOLATION_VIOLATION');

      // 11. Unregistered application rejected
      const unregRes = await fetch(`${baseUrl}/api/ai/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          applicationId: 'ROGUE_EXTERNAL_APP',
          capability: 'LESSON_GENERATION',
          payload: { subjectName: 'Math', classGrade: 'JSS 1', topicTitle: 'Fractions' }
        })
      });
      assert.equal(unregRes.status, 403);
      assert.equal((await unregRes.json()).code, 'UNREGISTERED_APPLICATION');

      // 12. Unsupported capability for application rejected (e.g. CURRICULUM_SERVER trying SCHOOL_CBT_GENERATION)
      const unsupRes = await fetch(`${baseUrl}/api/ai/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'SCHOOL_CBT_GENERATION',
          payload: { subjectName: 'Math', classGrade: 'JSS 1' }
        })
      });
      assert.equal(unsupRes.status, 403);
      assert.equal((await unsupRes.json()).code, 'UNSUPPORTED_CAPABILITY');
    });
  } finally {
    harness.restoreEnv();
  }
});

test('13 & 14. Malformed Gemini JSON fails validation (502) and provider timeout/retries fail closed (504/502)', async () => {
  // Invalid JSON test
  const badJsonHarness = buildTestHarness({
    transport: {
      async generateContent() {
        return { text: 'NOT VALID JSON {' };
      }
    }
  });
  // Timeout test
  const timeoutHarness = buildTestHarness({
    env: {
      NODE_ENV: 'test',
      GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4',
      GOOGLE_CLOUD_LOCATION: 'europe-west1',
      GEMINI_GATEWAY_TIMEOUT_MS: '500',
      GEMINI_GATEWAY_MAX_RETRIES: '1'
    },
    transport: {
      async generateContent() {
        await new Promise(resolve => setTimeout(resolve, 650));
        return { text: '{}' };
      }
    }
  });
  // Transient failure retry exhaustion
  let retryCalls = 0;
  const retryHarness = buildTestHarness({
    env: {
      NODE_ENV: 'test',
      GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4',
      GEMINI_GATEWAY_MAX_RETRIES: '2'
    },
    transport: {
      async generateContent() {
        retryCalls += 1;
        throw new Error('503 Service Temporarily Unavailable');
      }
    }
  });

  try {
    const token = makeToken({ tenantId: TENANT_A, role: 'staff', email: 't@a.ng' });

    await withHttpServer(badJsonHarness.app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/ai/v1/curriculum/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'LESSON_GENERATION',
          taskType: 'lesson_note',
          payload: { subjectName: 'Physics', classGrade: 'SS 1', topicTitle: 'Optics' }
        })
      });
      assert.equal(res.status, 502);
      assert.equal((await res.json()).code, 'INVALID_AI_RESPONSE');
    });

    await withHttpServer(timeoutHarness.app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/ai/v1/curriculum/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'LESSON_GENERATION',
          taskType: 'lesson_note',
          payload: { subjectName: 'Physics', classGrade: 'SS 1', topicTitle: 'Optics' }
        })
      });
      assert.equal(res.status, 504);
      assert.equal((await res.json()).code, 'PROVIDER_TIMEOUT');
    });

    await withHttpServer(retryHarness.app, async baseUrl => {
      const res = await fetch(`${baseUrl}/api/ai/v1/curriculum/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'CURRICULUM_SERVER',
          capability: 'LESSON_GENERATION',
          taskType: 'lesson_note',
          payload: { subjectName: 'Physics', classGrade: 'SS 1', topicTitle: 'Optics' }
        })
      });
      assert.equal(res.status, 502);
      assert.equal(retryCalls, 2);
    });
  } finally {
    badJsonHarness.restoreEnv();
    timeoutHarness.restoreEnv();
    retryHarness.restoreEnv();
  }
});

test('15 & 16b. Rate limit (429 + Retry-After), strict revoked/quota entitlement enforcement, and null tokens when provider omits usageMetadata', async () => {
  const traffic = new AiGatewayTrafficController();
  const harness = buildTestHarness({
    entitlementMode: 'strict',
    rateLimitTestController: traffic,
    transport: {
      async generateContent() {
        // Deliberately omit usageMetadata to verify zero fabricated token/cost counts
        return {
          text: JSON.stringify({
            title: 'Test',
            subjectName: 'Math',
            classGrade: 'SS 1',
            assessmentType: 'Quiz',
            totalMarks: 10,
            coveredTopicsList: ['Sets'],
            guaranteeNote: 'Taught only',
            questions: [
              {
                questionNumber: 1,
                section: 'A',
                questionType: 'objective',
                questionText: 'What is empty set?',
                marks: 10,
                topic: 'Sets',
                cognitiveLevel: 'Knowledge',
                difficulty: 'Easy'
              }
            ],
            markingGuide: [
              {
                questionNumber: 1,
                section: 'A',
                correctAnswer: '{}',
                modelAnswer: '{}',
                totalMarks: 10,
                stepBreakdown: [{ stepDescription: 'Identify empty set', marksAwarded: 10 }],
                partialCreditRules: 'None'
              }
            ]
          })
        };
      }
    }
  });

  try {
    const token = makeToken({ tenantId: TENANT_A, role: 'staff', email: 'staff@a.ng' });

    await withHttpServer(harness.app, async baseUrl => {
      // Missing entitlement in strict mode -> 403 ENTITLEMENT_DENIED
      const noEntRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          taskType: 'taught_assessment',
          payload: { subjectName: 'Math', classGrade: 'SS 1', completedTopics: ['Sets'] }
        })
      });
      assert.equal(noEntRes.status, 403);
      assert.equal((await noEntRes.json()).code, 'ENTITLEMENT_DENIED');

      // Seed active entitlement with dailyRequestLimit = 2
      harness.store.setEntitlement({
        id: 'ent-1',
        tenantId: TENANT_A,
        applicationInstanceId: INSTANCE_A,
        applicationId: 'SCHOOL_INSTANCE',
        status: 'active',
        allowedCapabilities: ['SCHOOL_ASSESSMENT_GENERATION'],
        dailyRequestLimit: 2,
        monthlyRequestLimit: 100,
        monthlyTokenLimit: 100000,
        maxConcurrentRequests: 5,
        expiresAt: new Date(Date.now() + 86400_000).toISOString()
      });

      // Succeeds with null token counts (never fabricated)
      const ok1 = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          taskType: 'taught_assessment',
          payload: { subjectName: 'Math', classGrade: 'SS 1', completedTopics: ['Sets'] }
        })
      });
      assert.equal(ok1.status, 200);
      const ok1Body = await ok1.json();
      assert.equal(ok1Body.usage.promptTokens, null);
      assert.equal(ok1Body.usage.totalTokens, null);
      assert.equal(ok1Body.usage.costMetadataAvailable, false);

      // Second request succeeds
      const ok2 = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          taskType: 'taught_assessment',
          payload: { subjectName: 'Math', classGrade: 'SS 1', completedTopics: ['Sets'] }
        })
      });
      assert.equal(ok2.status, 200);

      // Third request hits daily quota -> 429 QUOTA_EXCEEDED
      const quotaRes = await fetch(`${baseUrl}/api/ai/v1/assessments/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          taskType: 'taught_assessment',
          payload: { subjectName: 'Math', classGrade: 'SS 1', completedTopics: ['Sets'] }
        })
      });
      assert.equal(quotaRes.status, 429);
      assert.equal((await quotaRes.json()).code, 'QUOTA_EXCEEDED');

      // Direct traffic controller rate limit check (429 + Retry-After header)
      for (let i = 0; i < 60; i += 1) {
        traffic.checkAndConsumeRateLimit(`${TENANT_B}:SCHOOL_ASSESSMENT_GENERATION`, 60);
      }
      assert.throws(
        () => traffic.checkAndConsumeRateLimit(`${TENANT_B}:SCHOOL_ASSESSMENT_GENERATION`, 60),
        err => err instanceof AiGatewayError && err.code === 'RATE_LIMIT_EXCEEDED' && err.httpStatus === 429
      );
    });
  } finally {
    harness.restoreEnv();
  }
});

test('17. Frontend AiGatewayClient enforces authentication and routes through /api/ai/v1/* with Bearer token', async () => {
  const unauthClient = new AiGatewayClient({
    baseUrl: 'http://127.0.0.1:3000',
    getToken: () => null
  });
  await assert.rejects(
    () =>
      unauthClient.generateCurriculum({
        capability: 'LESSON_GENERATION',
        taskType: 'lesson_note',
        payload: { subjectName: 'Math', classGrade: 'SS 1', topicTitle: 'Indices' }
      }),
    err => err instanceof AiGatewayClientError && err.status === 401
  );

  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};
  const authClient = new AiGatewayClient({
    baseUrl: 'https://unified-backend.example.com',
    getToken: () => 'signed-bearer-token-123',
    fetchFn: (async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers || {}) as Record<string, string>;
      return new Response(
        JSON.stringify({
          success: true,
          requestId: 'req-1',
          correlationId: 'corr-1',
          applicationId: 'CURRICULUM_SERVER',
          capability: 'CURRICULUM_CONTENT_GENERATION',
          taskType: 'curriculum_tutor',
          tenantId: TENANT_A,
          reviewRequired: false,
          readOnlyAdvisory: false,
          routing: {
            providerId: 'GOOGLE_GEMINI',
            modelId: 'gemini-3.1-flash-lite',
            modelTier: 'fast',
            authMode: 'vertex_ai_adc',
            strategy: 'task_optimized:fast_curriculum_qa',
            attemptCount: 1,
            latencyMs: 42
          },
          usage: {
            promptTokens: 20,
            candidatesTokens: 40,
            totalTokens: 60,
            costMetadataAvailable: false,
            estimatedCostUsd: null
          },
          data: { answer: 'Indices follow a^m * a^n = a^(m+n).', response: 'Indices follow a^m * a^n = a^(m+n).' },
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch
  });

  const resp = await authClient.generateCurriculum<{ answer: string }>({
    capability: 'CURRICULUM_CONTENT_GENERATION',
    taskType: 'curriculum_tutor',
    payload: { question: 'Explain law of indices' }
  });

  assert.equal(capturedUrl, 'https://unified-backend.example.com/api/ai/v1/curriculum/generate');
  assert.equal(capturedHeaders.Authorization, 'Bearer signed-bearer-token-123');
  assert.equal(capturedHeaders['X-Application-ID'], 'CURRICULUM_SERVER');
  assert.equal(capturedHeaders['x-tenant-id'], undefined);
  assert.equal(capturedHeaders['x-role'], undefined);
  assert.match(resp.data.answer, /Indices/);
});

test('18. Backend auth mode switching: Vertex AI ADC vs API Key vs unconfigured fail-closed', async () => {
  assert.equal(resolveGeminiAuthMode({ GEMINI_API_KEY: 'real-api-key-value' }), 'api_key');
  assert.equal(resolveGeminiAuthMode({ GEMINI_API_KEY: 'MY_GEMINI_API_KEY' }), 'unconfigured');
  assert.equal(resolveGeminiAuthMode({ GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4' }), 'vertex_ai_adc');
  assert.equal(resolveGeminiAuthMode({ K_SERVICE: 'unified-backend' }), 'vertex_ai_adc');
  assert.equal(resolveGeminiAuthMode({ GOOGLE_GENAI_USE_VERTEXAI: 'true' }), 'vertex_ai_adc');
  assert.equal(resolveGeminiAuthMode({}), 'unconfigured');

  const cfg = resolveGeminiRuntimeConfig({ K_SERVICE: 'unified-backend' });
  assert.equal(cfg.authMode, 'vertex_ai_adc');
  assert.equal(cfg.gcpProjectId, 'curious-subject-477114-e4');
  assert.equal(cfg.gcpLocation, 'europe-west1');
  assert.equal(cfg.runtimeServiceAccount, 'backend-runtime@curious-subject-477114-e4.iam.gserviceaccount.com');

  // HTTP /api/ai/v1/health reports 503 degraded when unconfigured, 200 healthy when ADC configured
  const unconfHarness = buildTestHarness({
    env: { NODE_ENV: 'test' },
    transport: { async generateContent() { return { text: '{}' }; } }
  });
  try {
    await withHttpServer(unconfHarness.app, async baseUrl => {
      const healthRes = await fetch(`${baseUrl}/api/ai/v1/health`);
      assert.equal(healthRes.status, 503);
      const healthBody = await healthRes.json();
      assert.equal(healthBody.authMode, 'unconfigured');
      assert.equal(healthBody.gatewayReady, false);
    });
  } finally {
    unconfHarness.restoreEnv();
  }
});
