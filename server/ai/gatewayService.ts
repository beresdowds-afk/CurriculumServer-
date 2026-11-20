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
  resolveCapabilityPolicy,
  resolveSupportedInstanceApplicationIds
} from './capabilityRegistry';
import { GoogleGeminiProviderAdapter } from './geminiProvider';
import { PLATFORM_GCP_ENVIRONMENT, resolveGeminiRuntimeConfig } from './modelConfig';
import { buildOrchestratedPrompt } from './promptOrchestrator';
import { AiGatewayTrafficController, defaultAiTrafficController } from './rateLimiter';
import { validateAiResponse } from './responseValidator';
import { defaultAiRequestRouter, IntelligentAiRequestRouter } from './router';
import {
  AiGatewayError,
  type AiGatewayErrorCode,
  type AiProviderAdapter,
  type AiProviderGenerateResult,
  type AiUsageAggregateRecord,
  type AuthenticatedAiCaller
} from './types';
import { InMemoryAiGatewayStore, PostgresAiGatewayStore, type AiGatewayPersistenceStore } from './usageMetering';
import { TeachingEvidenceService } from '../teachingEvidence/teachingEvidenceService';
import { TeachingEvidenceError } from '../teachingEvidence/teachingEvidenceTypes';

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
    const persistenceReady = databaseConfigured || env.NODE_ENV !== 'production';
    const gatewayReady = authMode !== 'unconfigured' && persistenceReady;
    return {
      status: gatewayReady ? 'healthy' : 'degraded',
      gatewayReady,
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

  async listCapabilities(
    caller: AuthenticatedAiCaller,
    applicationId?: AiApplicationId
  ): Promise<AiGatewayCapabilityDescriptor[]> {
    const { store, databaseConfigured } = this.getStoreFn();
    const env = this.getEnvFn();
    const providerReady = this.provider.getAuthMode() !== 'unconfigured';
    const registryReady = databaseConfigured || env.NODE_ENV !== 'production';
    const policies = listCapabilitiesForApplication(applicationId);
    const enabled = await Promise.all(policies.map(async policy => {
      if (!policy.enabled || !providerReady || !registryReady) return false;
      try {
        return await store.isCapabilityEnabled(caller.verifiedPrincipal, policy.capability);
      } catch {
        return !databaseConfigured && policy.enabled;
      }
    }));
    return policies.map((policy, index) => ({
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
      enabled: enabled[index]
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

  private async prepareTaughtAssessmentPayload(
    pool: DatabasePool | undefined,
    caller: AuthenticatedAiCaller,
    effectiveInstanceId: string | null,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const scopeAuthorizationId =
      typeof payload.scopeAuthorizationId === 'string' ? payload.scopeAuthorizationId.trim() : '';
    const strictVerifiedEvidence = payload.strictVerifiedEvidence === true;

    // Allow legacy in-memory AI gateway harness tests (no Postgres pool and no strict flag/scopeId)
    // while strictly enforcing persisted teaching evidence in every backed environment or strict request.
    if (!pool && !strictVerifiedEvidence && !scopeAuthorizationId) {
      return payload;
    }

    if (!scopeAuthorizationId) {
      throw new AiGatewayError(
        'VALIDATION_ERROR',
        'A persisted teacher-authorized scopeAuthorizationId grounded in verified PostgreSQL teaching evidence is required for taught-only assessment generation. Client completedTopics are ignored.',
        403,
        { code: 'SCOPE_AUTHORIZATION_REQUIRED' }
      );
    }

    if (!pool) {
      throw new AiGatewayError(
        'AUTHORIZATION_UNAVAILABLE',
        'Teaching evidence repository is not configured to validate assessment scope authorization.',
        503
      );
    }

    const teachingService = new TeachingEvidenceService(pool);
    try {
      const evaluated = await teachingService.resolveAndValidateAuthorizedScopeForGeneration(
        {
          tenant: caller.verifiedPrincipal,
          applicationInstanceId: effectiveInstanceId || caller.applicationInstanceId || '',
          authorizedPrincipal: caller.authorizedPrincipal,
          userId: caller.userId,
          role: caller.role
        },
        scopeAuthorizationId,
        { requireCallerIsAuthorizingTeacher: true }
      );

      const allowedObjectiveSet = new Set(evaluated.scopedObjectiveIds);
      const cleanTopics = evaluated.scopedTopics.map(topic => ({
        topicId: topic.topicId,
        topicTitle: topic.topicTitle,
        weekNumber: topic.weekNumber,
        coverageMode: topic.coverageMode,
        coveredObjectives: topic.coveredObjectives
          .filter(obj => allowedObjectiveSet.has(obj.id))
          .map(obj => ({
            id: obj.id,
            description: obj.description,
            bloomLevel: obj.bloomLevel
          })),
        understandingLevel: topic.understandingLevel,
        remedialNeeded: topic.remedialNeeded,
        remedialTopic: topic.remedialTopic,
        adminVerificationStatus: topic.adminVerificationStatus
      }));

      // Strip any client-supplied completedTopics to guarantee untaught topics never enter prompts.
      const { completedTopics: _ignoredCompletedTopics, ...restPayload } = payload;
      return {
        ...restPayload,
        scopeAuthorizationId: evaluated.scopeAuthorization.id,
        subjectName: evaluated.evidenceBundle.subjectName,
        classGrade: evaluated.evidenceBundle.classGradeName,
        curriculumVersionId: evaluated.evidenceBundle.curriculumVersionId,
        verifiedEvidence: {
          assignmentId: evaluated.evidenceBundle.assignment.id,
          teacherUserId: evaluated.evidenceBundle.assignment.teacherUserId,
          subjectId: evaluated.evidenceBundle.subjectId,
          subjectName: evaluated.evidenceBundle.subjectName,
          classId: evaluated.evidenceBundle.classId,
          classGradeName: evaluated.evidenceBundle.classGradeName,
          section: evaluated.evidenceBundle.section,
          academicSession: evaluated.evidenceBundle.academicSession,
          term: evaluated.evidenceBundle.term,
          curriculumVersionId: evaluated.evidenceBundle.curriculumVersionId,
          topics: cleanTopics
        },
        authorizedScope: {
          scopeAuthorizationId: evaluated.scopeAuthorization.id,
          scopeVersion: evaluated.scopeAuthorization.scopeVersion,
          scopeHash: evaluated.scopeAuthorization.scopeHash,
          assessmentType: evaluated.scopeAuthorization.assessmentType,
          title: evaluated.scopeAuthorization.title,
          selectedTopicIds: evaluated.scopeAuthorization.selectedTopicIds,
          selectedObjectiveIds: evaluated.scopedObjectiveIds,
          sourceDeliveryIds: evaluated.scopeAuthorization.sourceDeliveryIds,
          questionCount: evaluated.scopeAuthorization.questionCount,
          questionTypesConfig: evaluated.scopeAuthorization.questionTypesConfig,
          objectiveTheoryBalance: evaluated.scopeAuthorization.objectiveTheoryBalance,
          totalMarks: evaluated.scopeAuthorization.totalMarks,
          difficultyMix: evaluated.scopeAuthorization.difficultyMix,
          durationMinutes: evaluated.scopeAuthorization.durationMinutes,
          instructions: evaluated.scopeAuthorization.instructions
        }
      };
    } catch (err) {
      if (err instanceof TeachingEvidenceError) {
        const mappedCode: AiGatewayErrorCode =
          err.code === 'FORBIDDEN' || err.code === 'UNAUTHENTICATED'
            ? 'TENANT_ISOLATION_VIOLATION'
            : err.httpStatus >= 400 && err.httpStatus < 500
            ? 'VALIDATION_ERROR'
            : 'PROVIDER_UNAVAILABLE';
        throw new AiGatewayError(mappedCode, err.message, err.httpStatus, {
          teachingErrorCode: err.code,
          ...(err.details || {})
        });
      }
      throw err;
    }
  }

  private postProcessOutput(
    taskType: AiTaskType,
    validated: unknown,
    payload: Record<string, unknown>,
    caller: AuthenticatedAiCaller
  ): unknown {
    if (taskType === 'taught_assessment' && validated && typeof validated === 'object' && !Array.isArray(validated)) {
      const obj = validated as Record<string, unknown>;
      const authorizedScope =
        payload.authorizedScope && typeof payload.authorizedScope === 'object'
          ? (payload.authorizedScope as Record<string, unknown>)
          : null;
      const verifiedEvidence =
        payload.verifiedEvidence && typeof payload.verifiedEvidence === 'object'
          ? (payload.verifiedEvidence as Record<string, unknown>)
          : null;
      return {
        ...obj,
        ...(authorizedScope
          ? {
              scopeAuthorizationId: authorizedScope.scopeAuthorizationId,
              scopeVersion: authorizedScope.scopeVersion,
              scopeHash: authorizedScope.scopeHash
            }
          : {}),
        ...(verifiedEvidence?.curriculumVersionId
          ? { curriculumVersionId: verifiedEvidence.curriculumVersionId }
          : {}),
        reviewStatus: 'pending_review',
        reviewRequired: true
      };
    }

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
    if (!envelope || typeof envelope !== 'object' || !envelope.payload ||
        typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) {
      throw new AiGatewayError('VALIDATION_ERROR', 'AI Gateway request requires a structured payload object.', 400);
    }
    if (
      caller.applicationInstanceId &&
      envelope.applicationInstanceId &&
      caller.applicationInstanceId !== envelope.applicationInstanceId
    ) {
      throw new AiGatewayError('VALIDATION_ERROR', 'Application-instance header and request body must match.', 400);
    }

    const requestId = crypto.randomUUID();
    const correlationId =
      envelope.correlationId ||
      input.headerCorrelationId ||
      `ai_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const policy = resolveCapabilityPolicy(envelope.applicationId, envelope.capability, envelope.taskType);
    const { store, pool, databaseConfigured } = this.getStoreFn();
    const env = this.getEnvFn();
    if (!databaseConfigured && env.NODE_ENV === 'production') {
      throw new AiGatewayError('AUTHORIZATION_UNAVAILABLE', 'AI capability registry is not available.', 503);
    }
    let capabilityEnabled = false;
    try {
      capabilityEnabled = await store.isCapabilityEnabled(caller.verifiedPrincipal, policy.capability);
    } catch {
      if (databaseConfigured) {
        throw new AiGatewayError('AUTHORIZATION_UNAVAILABLE', 'AI capability readiness is unavailable.', 503);
      }
      capabilityEnabled = env.NODE_ENV !== 'production' && policy.enabled;
    }
    if (!policy.enabled || !capabilityEnabled) {
      throw new AiGatewayError('UNSUPPORTED_CAPABILITY', 'The requested AI capability is disabled or not ready.', 403);
    }
    const cfg = resolveGeminiRuntimeConfig(env);
    const payloadJson = JSON.stringify(envelope.payload);
    if (Buffer.byteLength(payloadJson, 'utf8') > cfg.maxPromptChars) {
      throw new AiGatewayError(
        'VALIDATION_ERROR',
        `AI request payload exceeds the ${cfg.maxPromptChars}-character input limit.`,
        413
      );
    }
    if (envelope.idempotencyKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(envelope.idempotencyKey)) {
      throw new AiGatewayError('VALIDATION_ERROR', 'Idempotency key must be 8-128 safe characters.', 400);
    }

    if (env.NODE_ENV === 'production' && !databaseConfigured) {
      throw new AiGatewayError(
        'AUTHORIZATION_UNAVAILABLE',
        'Durable AI usage and audit persistence is not configured.',
        503
      );
    }

    const isPlatformAdmin = caller.role === PLATFORM_ADMIN_ROLE;
    const tenantForInstanceResolution = isPlatformAdmin
      ? envelope.tenantId
      : caller.tenantId || undefined;
    let effectiveInstanceId: string | null = null;
    if (tenantForInstanceResolution) {
      const requestedInstanceId = envelope.applicationInstanceId || caller.applicationInstanceId || undefined;
      effectiveInstanceId = await store.resolveApplicationInstance(
        caller.verifiedPrincipal,
        tenantForInstanceResolution,
        resolveSupportedInstanceApplicationIds(policy),
        requestedInstanceId
      );
    }

    const { effectiveTenantId, maxConcurrency } = await enforceAiAuthorizationAndEntitlement({
      caller,
      applicationId: envelope.applicationId,
      policy,
      requestedTenantId: envelope.tenantId,
      headerTenantId: input.headerTenantId,
      requestedApplicationInstanceId: effectiveInstanceId || envelope.applicationInstanceId,
      store,
      entitlementMode: this.getEntitlementModeFn(),
      correlationId
    });

    const trafficKey = `${effectiveTenantId || 'platform'}:${policy.capability}`;
    this.traffic.checkAndConsumeRateLimit(trafficKey, policy.rateLimitPerMinute);
    const releaseSlot = this.traffic.acquireConcurrencySlot(trafficKey, maxConcurrency);

    try {
      const routing = this.router.route({
        policy,
        requestedTask: envelope.taskType,
        modelOverride: envelope.modelOverride,
        env
      });

      if (routing.authMode === 'unconfigured') {
        throw new AiGatewayError(
          'PROVIDER_UNAVAILABLE',
          'Gemini AI credentials are not configured on Unified Backend (set GEMINI_API_KEY or Vertex AI ADC environment).',
          503,
          { authMode: routing.authMode }
        );
      }

      const effectivePayload =
        routing.taskType === 'taught_assessment'
          ? await this.prepareTaughtAssessmentPayload(pool, caller, effectiveInstanceId, envelope.payload)
          : envelope.payload;

      const schoolContext = await this.loadSchoolScopedContext(
        pool,
        caller,
        effectiveTenantId,
        effectiveInstanceId,
        effectivePayload,
        routing.taskType
      );

      const orchestrated = buildOrchestratedPrompt(routing.taskType, effectivePayload, schoolContext);
      if (orchestrated.contents.length > cfg.maxPromptChars) {
        throw new AiGatewayError(
          'VALIDATION_ERROR',
          `AI request exceeds the ${cfg.maxPromptChars}-character input limit.`,
          413
        );
      }

      try {
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
            subjectName: effectivePayload.subjectName ?? null,
            classGrade: effectivePayload.classGrade ?? null,
            scopeAuthorizationId: effectivePayload.scopeAuthorizationId ?? null
          }
        });
      } catch (err) {
        if ((err as { code?: string })?.code === '23505' && envelope.idempotencyKey) {
          throw new AiGatewayError(
            'IDEMPOTENCY_CONFLICT',
            'A request with this idempotency key has already been accepted.',
            409
          );
        }
        throw err;
      }

      let providerResult: AiProviderGenerateResult | undefined;
      try {
        providerResult = await this.provider.generate({
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
        if (providerResult.rawText.length > cfg.maxResponseChars) {
          throw new AiGatewayError(
            'INVALID_AI_RESPONSE',
            `AI provider response exceeds the ${cfg.maxResponseChars}-character output limit.`,
            502
          );
        }

        const validated = validateAiResponse(routing.taskType, providerResult.rawText);
        const processed = this.postProcessOutput(routing.taskType, validated, effectivePayload, caller);
        if (Buffer.byteLength(JSON.stringify(processed), 'utf8') > cfg.maxResponseChars) {
          throw new AiGatewayError(
            'INVALID_AI_RESPONSE',
            `AI response exceeds the ${cfg.maxResponseChars}-character output limit.`,
            502
          );
        }

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
          attemptCount: providerResult?.attemptCount ?? Number(gwErr.details?.attemptCount ?? 1),
          latencyMs: providerResult?.latencyMs ?? 0,
          httpStatus: gwErr.httpStatus,
          usage: providerResult?.usage ?? ZERO_USAGE,
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
