import crypto from 'node:crypto';
import type {
  AiApplicationId,
  AiCapabilityId,
  AiGatewayCapabilityDescriptor,
  AiGatewayHealthStatus,
  AiGatewayRequestEnvelope,
  AiGatewayResponseEnvelope,
  AiTaskType,
  AiTokenUsageSummary
} from '../../packages/shared-types/src/aiGatewayContracts';
import type { DatabasePool } from '../db/postgres';
import { withTenantTransaction } from '../db/tenantContext';
import { PLATFORM_ADMIN_ROLE } from '../authorization/permissions';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import { InstanceQuestionBankRepository } from '../questionBank/instanceQuestionBankRepository';
import { enforceAiAuthorizationAndEntitlement, resolveAiEntitlementMode } from './authAndEntitlement';
import {
  listCapabilitiesForApplication,
  REGISTERED_AI_APPLICATIONS,
  resolveCapabilityPolicy
} from './capabilityRegistry';
import { GoogleGeminiProviderAdapter } from './geminiProvider';
import { PLATFORM_GCP_ENVIRONMENT, resolveGeminiRuntimeConfig } from './modelConfig';
import { buildOrchestratedPrompt } from './promptOrchestrator';
import { AiGatewayTrafficController, defaultAiTrafficController } from './rateLimiter';
import { validateAiResponse } from './responseValidator';
import { defaultAiRequestRouter, IntelligentAiRequestRouter } from './router';
import {
  AiGatewayError,
  type AiProviderAdapter,
  type AiUsageAggregateRecord,
  type AuthenticatedAiCaller
} from './types';
import { InMemoryAiGatewayStore, PostgresAiGatewayStore, type AiGatewayPersistenceStore } from './usageMetering';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ZERO_USAGE: AiTokenUsageSummary = {
  promptTokens: null,
  candidatesTokens: null,
  totalTokens: null,
  costMetadataAvailable: false,
  estimatedCostUsd: null
};

export interface CentralAiGatewayDependencies {
  provider?: AiProviderAdapter;
  router?: IntelligentAiRequestRouter;
  trafficController?: AiGatewayTrafficController;
  getStore?: () => { store: AiGatewayPersistenceStore; databaseConfigured: boolean; pool?: DatabasePool };
  getEntitlementMode?: () => 'strict' | 'decoupled';
  getEnv?: () => NodeJS.ProcessEnv;
}

export interface ExecuteAiRequestInput {
  caller: AuthenticatedAiCaller;
  envelope: AiGatewayRequestEnvelope;
  headerTenantId?: string;
  headerCorrelationId?: string;
}

function generateExamCode(classGrade: string, subjectName: string, term: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const cleanGrade = (classGrade || 'SS2').replace(/\s+/g, '').slice(0, 8);
  const cleanSubj = (subjectName || 'GEN').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'GEN';
  const cleanTerm = (term || 'T1').replace(/\s+/g, '').slice(0, 6).toUpperCase();
  return `CF-EXAM-${cleanGrade}-${cleanSubj}-${cleanTerm}-${rand}`;
}

export class CentralAiGatewayService {
  private readonly provider: AiProviderAdapter;
  private readonly router: IntelligentAiRequestRouter;
  private readonly traffic: AiGatewayTrafficController;
  private readonly fallbackStore = new InMemoryAiGatewayStore();
  private readonly getStoreFn: () => { store: AiGatewayPersistenceStore; databaseConfigured: boolean; pool?: DatabasePool };
  private readonly getEntitlementModeFn: () => 'strict' | 'decoupled';
  private readonly getEnvFn: () => NodeJS.ProcessEnv;

  constructor(deps: CentralAiGatewayDependencies = {}) {
    this.getEnvFn = deps.getEnv ?? (() => process.env);
    this.provider = deps.provider ?? new GoogleGeminiProviderAdapter(undefined, this.getEnvFn);
    this.router = deps.router ?? defaultAiRequestRouter;
    this.traffic = deps.trafficController ?? defaultAiTrafficController;
    this.getStoreFn =
      deps.getStore ??
      (() => ({
        store: this.fallbackStore,
        databaseConfigured: false
      }));
    this.getEntitlementModeFn = deps.getEntitlementMode ?? resolveAiEntitlementMode;
  }

  static withPostgresPool(
    getPoolState: () => { configured: boolean; getPool: () => DatabasePool },
    deps: Omit<CentralAiGatewayDependencies, 'getStore'> = {}
  ): CentralAiGatewayService {
    const inMemoryFallback = new InMemoryAiGatewayStore();
    return new CentralAiGatewayService({
      ...deps,
      getStore: () => {
        const state = getPoolState();
        if (state.configured) {
          const pool = state.getPool();
          return {
            store: new PostgresAiGatewayStore(pool),
            databaseConfigured: true,
            pool
          };
        }
        return {
          store: inMemoryFallback,
          databaseConfigured: false
        };
      }
    });
  }

  getInMemoryStore(): InMemoryAiGatewayStore {
    return this.getStoreFn().store as InMemoryAiGatewayStore;
  }

  getHealth(): AiGatewayHealthStatus {
    const env = this.getEnvFn();
    const cfg = resolveGeminiRuntimeConfig(env);
    const { databaseConfigured } = this.getStoreFn();
    const authMode = this.provider.getAuthMode();
    return {
      status: authMode === 'unconfigured' ? 'degraded' : 'healthy',
      gatewayReady: authMode !== 'unconfigured',
      providerId: 'GOOGLE_GEMINI',
      authMode,
      gcpProjectId: cfg.gcpProjectId,
      gcpRegion: cfg.gcpLocation || PLATFORM_GCP_ENVIRONMENT.region,
      runtimeServiceAccount: cfg.runtimeServiceAccount,
      defaultModels: { ...cfg.defaultModels },
      registeredApplications: [...REGISTERED_AI_APPLICATIONS],
      registeredCapabilitiesCount: listCapabilitiesForApplication().length,
      databasePersistenceConfigured: databaseConfigured,
      timestamp: new Date().toISOString()
    };
  }

  listCapabilities(applicationId?: AiApplicationId): AiGatewayCapabilityDescriptor[] {
    return listCapabilitiesForApplication(applicationId).map(policy => ({
      capability: policy.capability,
      applicationId: policy.applicationId,
      description: policy.description,
      supportedTasks: [...policy.supportedTasks],
      defaultModelTier: policy.defaultModelTier,
      defaultModelId: policy.defaultModelId,
      requiresTenantContext: policy.requiresTenantContext,
      requiresTeacherReview: policy.requiresTeacherReview,
      readOnlyAdvisory: policy.readOnlyAdvisory,
      requiredPermissions: [...policy.requiredPermissions],
      rateLimitPerMinute: policy.rateLimitPerMinute,
      maxConcurrency: policy.maxConcurrency,
      enabled: policy.enabled
    }));
  }

  async getUsageStats(
    caller: AuthenticatedAiCaller,
    requestedTenantId?: string,
    limit = 25
  ): Promise<AiUsageAggregateRecord> {
    const isPlatformAdmin = caller.role === PLATFORM_ADMIN_ROLE;
    if (requestedTenantId && requestedTenantId.trim()) {
      const target = requestedTenantId.trim();
      if (!isPlatformAdmin && (!caller.tenantId || caller.tenantId.toLowerCase() !== target.toLowerCase())) {
        throw new AiGatewayError(
          'TENANT_ISOLATION_VIOLATION',
          `Cross-tenant AI usage lookup denied for tenant '${target}'.`,
          403
        );
      }
    }

    const effectiveTenantId = isPlatformAdmin
      ? (requestedTenantId?.trim() || null)
      : caller.tenantId;

    const { store } = this.getStoreFn();
    return store.getUsageAggregate(caller.verifiedPrincipal, {
      tenantId: effectiveTenantId,
      limit
    });
  }

  private async loadSchoolScopedContext(
    pool: DatabasePool | undefined,
    caller: AuthenticatedAiCaller,
    effectiveTenantId: string | null,
    applicationInstanceId: string | null,
    payload: Record<string, unknown>,
    taskType: AiTaskType
  ): Promise<{
    tenantId?: string | null;
    schoolName?: string;
    curriculumTopicsSummary?: string;
    questionBankSummary?: string;
  } | undefined> {
    if (!pool || !effectiveTenantId || !UUID.test(effectiveTenantId)) {
      return undefined;
    }

    // Never attempt context enrichment for textbook tasks (they carry explicit grounded curriculum payload)
    if (taskType === 'textbook_outline' || taskType === 'textbook_chapter' || taskType === 'provisioning_recommend') {
      return undefined;
    }

    const context: {
      tenantId: string;
      schoolName?: string;
      curriculumTopicsSummary?: string;
      questionBankSummary?: string;
    } = { tenantId: effectiveTenantId };

    try {
      await withTenantTransaction(pool, caller.verifiedPrincipal, async client => {
        const res = await client.query<{ name: string }>(
          `SELECT name FROM production.schools WHERE tenant_id = $1 LIMIT 1`,
          [effectiveTenantId]
        );
        if (res.rows[0]?.name) {
          context.schoolName = res.rows[0].name;
        }
      });
    } catch {
      // School row might not be populated yet in partial DB state; continue safely without failing open on tenant check
    }

    const subjectName = typeof payload.subjectName === 'string' ? payload.subjectName.trim() : '';
    const classGrade = typeof payload.classGrade === 'string' ? payload.classGrade.trim() : '';

    if (subjectName) {
      try {
        const curriculumRepo = new CentralCurriculumRepository(pool);
        const subjects = await curriculumRepo.listSubjects(caller.verifiedPrincipal, {
          search: subjectName,
          page: 1,
          limit: 3
        });
        if (subjects.items.length > 0) {
          const detail = await curriculumRepo.getSubjectDetail(caller.verifiedPrincipal, subjects.items[0].id);
          const matchingThemes = detail.themes
            .slice(0, 3)
            .map(th => `${th.title}: ${th.topics.slice(0, 4).map(tp => tp.title).join(', ')}`)
            .join(' | ');
          if (matchingThemes) {
            context.curriculumTopicsSummary = `${detail.name} (${detail.version.versionTag}): ${matchingThemes}`;
          }
        }
      } catch {
        // Approved central curriculum summary enrichment is advisory; prompt validation already runs strictly
      }
    }

    if (
      applicationInstanceId &&
      UUID.test(applicationInstanceId) &&
      (taskType === 'secure_exam' || taskType === 'cbt_paper' || taskType === 'taught_assessment')
    ) {
      try {
        const qbRepo = new InstanceQuestionBankRepository(pool);
        const items = await qbRepo.listQuestions(caller.verifiedPrincipal, applicationInstanceId, {
          ...(subjectName ? { subjectReferenceId: subjectName } : {}),
          ...(classGrade ? { classGradeName: classGrade } : {}),
          reviewStatus: 'approved'
        });
        if (items.length > 0) {
          context.questionBankSummary = `School Question Bank contains ${items.length} teacher-approved items for ${subjectName || 'selected subject'}. Align terminology without duplicating exact stems.`;
        }
      } catch {
        // Optional QB alignment summary
      }
    }

    return context;
  }

  private postProcessOutput(
    taskType: AiTaskType,
    validated: unknown,
    payload: Record<string, unknown>,
    caller: AuthenticatedAiCaller
  ): unknown {
    if (taskType === 'secure_exam' && validated && typeof validated === 'object' && !Array.isArray(validated)) {
      const obj = validated as Record<string, unknown>;
      const subjectName = typeof payload.subjectName === 'string' ? payload.subjectName : 'General';
      const classGrade = typeof payload.classGrade === 'string' ? payload.classGrade : 'SS2';
      const term = typeof payload.term === 'string' ? payload.term : 'Term 1';
      const examId = generateExamCode(classGrade, subjectName, term);
      const hash = crypto.createHash('sha256').update(`${examId}-${Date.now()}-${crypto.randomUUID()}`).digest('hex');
      return {
        ...obj,
        examId,
        generationHash: `sha256-${hash}`,
        subjectName,
        classGrade,
        term,
        academicSession: '2026/2027 Session',
        isLocked: false,
        releaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isReleasedForPrinting: false,
        authorizedByPrincipal: false,
        markingSchemeId: `ms-${examId.toLowerCase()}`,
        markingSchemeUnlocked: false,
        reviewStatus: 'pending_review',
        auditTrail: [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: caller.userId,
            userName: caller.email,
            userRole: caller.role,
            action: 'generated',
            notes: `Generated randomized examination paper under Exam ID ${examId} via Central AI Gateway`
          }
        ]
      };
    }

    if (taskType === 'marking_scheme' && validated && typeof validated === 'object' && !Array.isArray(validated)) {
      const obj = validated as Record<string, unknown>;
      return {
        ...obj,
        examId: typeof payload.examId === 'string' && payload.examId.trim() ? payload.examId.trim() : 'CF-EXAM-2026',
        subjectName: payload.subjectName,
        classGrade: payload.classGrade,
        term: typeof payload.term === 'string' ? payload.term : 'Term 1',
        createdAt: new Date().toISOString(),
        isReleasedToTeachers: false,
        reviewStatus: 'pending_review'
      };
    }

    if (taskType === 'question_bank_items' && validated && typeof validated === 'object' && !Array.isArray(validated)) {
      const obj = validated as Record<string, unknown>;
      const items = Array.isArray(obj.questions) ? obj.questions : [];
      return {
        ...obj,
        questions: items.map(item =>
          item && typeof item === 'object'
            ? {
                ...(item as Record<string, unknown>),
                creationMethod: 'ai_assisted',
                reviewStatus: 'pending_review',
                reviewRequired: true
              }
            : item
        )
      };
    }

    if (taskType === 'variable_questions' && Array.isArray(validated)) {
      return {
        variants: validated.map(v =>
          v && typeof v === 'object'
            ? {
                ...(v as Record<string, unknown>),
                creationMethod: 'ai_assisted',
                reviewStatus: 'pending_review',
                reviewRequired: true
              }
            : v
        ),
        subject: payload.subjectName,
        topic: payload.topicTitle
      };
    }

    if (taskType === 'cbt_paper' && validated && typeof validated === 'object' && !Array.isArray(validated)) {
      const obj = validated as Record<string, unknown>;
      return {
        ...obj,
        reviewStatus: 'pending_review',
        reviewRequired: true
      };
    }

    return validated;
  }

  async execute<TData = unknown>(input: ExecuteAiRequestInput): Promise<AiGatewayResponseEnvelope<TData>> {
    const { caller, envelope } = input;
    if (!envelope || typeof envelope !== 'object' || !envelope.payload || typeof envelope.payload !== 'object') {
      throw new AiGatewayError('VALIDATION_ERROR', 'AI Gateway request requires a structured payload object.', 400);
    }

    const requestId = crypto.randomUUID();
    const correlationId =
      envelope.correlationId ||
      input.headerCorrelationId ||
      `ai_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const policy = resolveCapabilityPolicy(envelope.applicationId, envelope.capability, envelope.taskType);
    const { store, pool } = this.getStoreFn();

    const { effectiveTenantId, maxConcurrency } = await enforceAiAuthorizationAndEntitlement({
      caller,
      applicationId: envelope.applicationId,
      policy,
      requestedTenantId: envelope.tenantId,
      headerTenantId: input.headerTenantId,
      requestedApplicationInstanceId: envelope.applicationInstanceId,
      store,
      entitlementMode: this.getEntitlementModeFn(),
      correlationId
    });

    const trafficKey = `${effectiveTenantId || 'platform'}:${policy.capability}`;
    this.traffic.checkAndConsumeRateLimit(trafficKey, policy.rateLimitPerMinute);
    const releaseSlot = this.traffic.acquireConcurrencySlot(trafficKey, maxConcurrency);

    const effectiveInstanceId = envelope.applicationInstanceId || caller.applicationInstanceId || null;

    try {
      const routing = this.router.route({
        policy,
        requestedTask: envelope.taskType,
        modelOverride: envelope.modelOverride,
        env: this.getEnvFn()
      });

      if (routing.authMode === 'unconfigured') {
        throw new AiGatewayError(
          'PROVIDER_UNAVAILABLE',
          'Gemini AI credentials are not configured on Unified Backend (set GEMINI_API_KEY or Vertex AI ADC environment).',
          503,
          { authMode: routing.authMode }
        );
      }

      const schoolContext = await this.loadSchoolScopedContext(
        pool,
        caller,
        effectiveTenantId,
        effectiveInstanceId,
        envelope.payload,
        routing.taskType
      );

      const orchestrated = buildOrchestratedPrompt(routing.taskType, envelope.payload, schoolContext);

      await store.recordRequestStart(caller.verifiedPrincipal, {
        id: requestId,
        correlationId,
        idempotencyKey: envelope.idempotencyKey,
        tenantId: effectiveTenantId,
        applicationInstanceId: effectiveInstanceId,
        applicationId: envelope.applicationId,
        capability: policy.capability,
        taskType: routing.taskType,
        actorUserId: caller.userId,
        actorRole: caller.role,
        providerId: routing.providerId,
        modelId: routing.modelId,
        routingStrategy: routing.strategy,
        requestMetadata: {
          subjectName: envelope.payload.subjectName ?? null,
          classGrade: envelope.payload.classGrade ?? null
        }
      });

      try {
        const providerResult = await this.provider.generate({
          modelId: routing.modelId,
          contents: orchestrated.contents,
          systemInstruction: orchestrated.systemInstruction,
          responseMimeType: routing.responseMimeType,
          responseSchema: orchestrated.responseSchema,
          temperature: routing.temperature,
          timeoutMs: routing.timeoutMs,
          maxRetries: routing.maxRetries,
          correlationId,
          label: `${envelope.applicationId}:${policy.capability}:${routing.taskType}`
        });

        const validated = validateAiResponse(routing.taskType, providerResult.rawText);
        const processed = this.postProcessOutput(routing.taskType, validated, envelope.payload, caller);

        await store.recordRequestFinish({
          requestId,
          tenantId: effectiveTenantId,
          applicationInstanceId: effectiveInstanceId,
          applicationId: envelope.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          providerId: routing.providerId,
          modelId: providerResult.modelId,
          status: 'completed',
          attemptCount: providerResult.attemptCount,
          latencyMs: providerResult.latencyMs,
          httpStatus: 200,
          usage: providerResult.usage,
          principal: caller.verifiedPrincipal
        });

        await store.recordAudit({
          correlationId,
          requestId,
          tenantId: effectiveTenantId,
          applicationInstanceId: effectiveInstanceId,
          applicationId: envelope.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'allowed',
          details: {
            modelId: providerResult.modelId,
            strategy: routing.strategy,
            attemptCount: providerResult.attemptCount,
            latencyMs: providerResult.latencyMs
          },
          principal: caller.verifiedPrincipal
        });

        return {
          success: true,
          requestId,
          correlationId,
          applicationId: envelope.applicationId,
          capability: policy.capability,
          taskType: routing.taskType,
          tenantId: effectiveTenantId,
          reviewRequired: routing.requiresTeacherReview,
          readOnlyAdvisory: routing.readOnlyAdvisory,
          routing: {
            providerId: routing.providerId,
            modelId: providerResult.modelId,
            modelTier: routing.modelTier,
            authMode: providerResult.authMode,
            strategy: routing.strategy,
            attemptCount: providerResult.attemptCount,
            latencyMs: providerResult.latencyMs
          },
          usage: providerResult.usage,
          data: processed as TData,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        const gwErr =
          err instanceof AiGatewayError
            ? err
            : new AiGatewayError('PROVIDER_UNAVAILABLE', err instanceof Error ? err.message : 'AI generation failed', 502);

        const finishStatus: 'timed_out' | 'rejected' | 'failed' =
          gwErr.code === 'PROVIDER_TIMEOUT'
            ? 'timed_out'
            : gwErr.code === 'VALIDATION_ERROR' || gwErr.code === 'INVALID_AI_RESPONSE'
            ? 'rejected'
            : 'failed';

        await store.recordRequestFinish({
          requestId,
          tenantId: effectiveTenantId,
          applicationInstanceId: effectiveInstanceId,
          applicationId: envelope.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          providerId: routing.providerId,
          modelId: routing.modelId,
          status: finishStatus,
          attemptCount: Number(gwErr.details?.attemptCount ?? 1),
          latencyMs: 0,
          httpStatus: gwErr.httpStatus,
          usage: ZERO_USAGE,
          errorCode: gwErr.code,
          errorMessage: gwErr.message,
          principal: caller.verifiedPrincipal
        });

        await store.recordAudit({
          correlationId,
          requestId,
          tenantId: effectiveTenantId,
          applicationInstanceId: effectiveInstanceId,
          applicationId: envelope.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: gwErr.code === 'INVALID_AI_RESPONSE' ? 'validation_failed' : 'provider_error',
          reasonCode: gwErr.code,
          details: { error: gwErr.message },
          principal: caller.verifiedPrincipal
        });

        throw gwErr;
      }
    } finally {
      releaseSlot();
    }
  }
}
