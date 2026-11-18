import express, { type Request, type Response, type Router } from 'express';
import type {
  AiApplicationId,
  AiCapabilityId,
  AiGatewayRequestEnvelope
} from '../../packages/shared-types/src/aiGatewayContracts';
import {
  authenticateAiRequest,
  type AuthenticateAiCallerDependencies
} from './authAndEntitlement';
import { CentralAiGatewayService } from './gatewayService';
import { AiGatewayError, type AuthenticatedAiCaller } from './types';

const CURRICULUM_CAPABILITIES = new Set<AiCapabilityId>([
  'LESSON_GENERATION',
  'TEXTBOOK_GENERATION',
  'CURRICULUM_CONTENT_GENERATION'
]);

const ASSESSMENT_CAPABILITIES = new Set<AiCapabilityId>([
  'EXAMINATION_GENERATION',
  'QUESTION_BANK_GENERATION',
  'ASSESSMENT_SUPPORT',
  'MARKING_ASSISTANCE',
  'SCHOOL_EXAMINATION_GENERATION',
  'SCHOOL_QUESTION_BANK_GENERATION',
  'SCHOOL_ASSESSMENT_GENERATION'
]);

const CBT_CAPABILITIES = new Set<AiCapabilityId>([
  'CBT_GENERATION',
  'SCHOOL_CBT_GENERATION'
]);

const PROVISIONING_CAPABILITIES = new Set<AiCapabilityId>([
  'SCHOOL_REQUIREMENTS_ANALYSIS',
  'ARCHITECTURE_RECOMMENDATION',
  'RESOURCE_SIZING_RECOMMENDATION',
  'WORKLOAD_ANALYSIS'
]);

export function sendAiGatewayError(res: Response, err: unknown, correlationId?: string): void {
  if (err instanceof AiGatewayError) {
    if (err.httpStatus === 429 && typeof err.details?.retryAfterSeconds === 'number') {
      res.setHeader('Retry-After', String(err.details.retryAfterSeconds));
    }
    res.status(err.httpStatus).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
      correlationId: correlationId || null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(502).json({
    success: false,
    error: 'Central AI Gateway execution failed.',
    code: 'PROVIDER_UNAVAILABLE',
    correlationId: correlationId || null,
    timestamp: new Date().toISOString()
  });
}

function normalizeRequestEnvelope(
  req: Request,
  forcedDefaults?: Partial<Pick<AiGatewayRequestEnvelope, 'applicationId' | 'capability' | 'taskType'>>
): AiGatewayRequestEnvelope {
  const body = (req.body || {}) as Partial<AiGatewayRequestEnvelope> & Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AiGatewayError('VALIDATION_ERROR', 'AI Gateway request body must be an object.', 400);
  }
  for (const field of ['applicationId', 'capability', 'taskType', 'tenantId', 'applicationInstanceId', 'modelOverride', 'idempotencyKey', 'correlationId']) {
    if (field in body && body[field] !== undefined && typeof body[field] !== 'string') {
      throw new AiGatewayError('VALIDATION_ERROR', `AI Gateway field '${field}' must be a string.`, 400);
    }
  }
  const headerAppId = typeof req.headers['x-application-id'] === 'string' ? req.headers['x-application-id'].trim() : '';
  const headerInstanceId =
    typeof req.headers['x-application-instance-id'] === 'string'
      ? req.headers['x-application-instance-id'].trim()
      : undefined;
  const idempotencyKey =
    typeof body.idempotencyKey === 'string'
      ? body.idempotencyKey
      : typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key']
      : undefined;
  const correlationId = typeof body.correlationId === 'string' ? body.correlationId : undefined;
  if (correlationId && !/^[A-Za-z0-9_-]{1,128}$/.test(correlationId)) {
    throw new AiGatewayError('VALIDATION_ERROR', 'Correlation ID has an invalid format.', 400);
  }

  if (body.applicationId && headerAppId && body.applicationId !== headerAppId) {
    throw new AiGatewayError('VALIDATION_ERROR', 'Application ID header and request body must match.', 400);
  }
  if (
    typeof body.applicationInstanceId === 'string' &&
    headerInstanceId &&
    body.applicationInstanceId !== headerInstanceId
  ) {
    throw new AiGatewayError(
      'VALIDATION_ERROR',
      'Application-instance header and request body must match.',
      400
    );
  }

  const applicationId = (body.applicationId || forcedDefaults?.applicationId || headerAppId) as AiApplicationId;
  const capability = (body.capability || forcedDefaults?.capability) as AiCapabilityId;
  const taskType = body.taskType || forcedDefaults?.taskType;

  // Support both { payload: {...} } and direct domain payload shapes on convenience endpoints
  let payload: Record<string, unknown>;
  if (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)) {
    payload = body.payload as Record<string, unknown>;
  } else {
    const {
      applicationId: _a,
      capability: _c,
      taskType: _t,
      tenantId: _tid,
      applicationInstanceId: _aid,
      modelOverride: _m,
      idempotencyKey: _ik,
      correlationId: _cid,
      ...rest
    } = body;
    payload = rest;
  }

  return {
    applicationId,
    capability,
    ...(taskType ? { taskType } : {}),
    ...(typeof body.tenantId === 'string' ? { tenantId: body.tenantId } : {}),
    ...(typeof body.applicationInstanceId === 'string'
      ? { applicationInstanceId: body.applicationInstanceId }
      : headerInstanceId
      ? { applicationInstanceId: headerInstanceId }
      : {}),
    payload,
    ...(typeof body.modelOverride === 'string' ? { modelOverride: body.modelOverride } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    ...(correlationId ? { correlationId } : {})
  };
}

export interface CreateAiGatewayRouterOptions {
  gateway: CentralAiGatewayService;
  getAuthDeps: () => AuthenticateAiCallerDependencies;
}

export function createAiGatewayRouter(options: CreateAiGatewayRouterOptions): Router {
  const router = express.Router();

  const authenticate = async (req: Request): Promise<AuthenticatedAiCaller> =>
    authenticateAiRequest(req, options.getAuthDeps());
  const requireGatewayRead = (caller: AuthenticatedAiCaller): void => {
    if (caller.role !== 'super_admin' && !caller.authorizedPrincipal?.hasPermission('ai.gateway.read')) {
      throw new AiGatewayError('FORBIDDEN', 'AI Gateway read permission is required.', 403);
    }
  };

  router.get('/health', (_req: Request, res: Response) => {
    const health = options.gateway.getHealth();
    res.status(health.gatewayReady ? 200 : 503).json({
      status: health.status,
      gatewayReady: health.gatewayReady,
      providerId: health.providerId,
      authMode: health.authMode,
      timestamp: health.timestamp
    });
  });

  router.get('/capabilities', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId as string | undefined;
    try {
      const caller = await authenticate(req);
      requireGatewayRead(caller);
      const appParam = typeof req.query.applicationId === 'string'
        ? (req.query.applicationId.trim() as AiApplicationId)
        : undefined;
      const capabilities = await options.gateway.listCapabilities(caller, appParam);
      res.json({
        success: true,
        capabilities,
        count: capabilities.length,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      sendAiGatewayError(res, err, correlationId);
    }
  });

  router.get('/usage', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId as string | undefined;
    try {
      const caller = await authenticate(req);
      requireGatewayRead(caller);
      const requestedTenantId =
        typeof req.query.tenantId === 'string'
          ? req.query.tenantId
          : typeof req.headers['x-tenant-id'] === 'string'
          ? req.headers['x-tenant-id']
          : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 25;
      const usage = await options.gateway.getUsageStats(caller, requestedTenantId, limit);
      res.json({
        success: true,
        usage,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      sendAiGatewayError(res, err, correlationId);
    }
  });

  const handleGenerate = async (
    req: Request,
    res: Response,
    allowedCapabilities?: Set<AiCapabilityId>,
    defaults?: Partial<Pick<AiGatewayRequestEnvelope, 'applicationId' | 'capability' | 'taskType'>>
  ) => {
    const correlationId = (req as any).correlationId as string | undefined;
    try {
      const caller = await authenticate(req);
      const envelope = normalizeRequestEnvelope(req, defaults);
      if (allowedCapabilities && !allowedCapabilities.has(envelope.capability)) {
        throw new AiGatewayError(
          'UNSUPPORTED_CAPABILITY',
          `Capability '${envelope.capability || 'unknown'}' is not valid for endpoint '${req.path}'.`,
          403,
          { capability: envelope.capability, endpoint: req.path }
        );
      }

      const headerTenantId = typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : undefined;
      const result = await options.gateway.execute({
        caller,
        envelope,
        headerTenantId,
        headerCorrelationId: correlationId
      });
      res.json(result);
    } catch (err) {
      sendAiGatewayError(res, err, correlationId);
    }
  };

  router.post('/generate', (req, res) => handleGenerate(req, res));

  router.post('/curriculum/generate', (req, res) =>
    handleGenerate(req, res, CURRICULUM_CAPABILITIES, {
      applicationId: 'CURRICULUM_SERVER',
      capability: 'LESSON_GENERATION'
    })
  );

  router.post('/assessments/generate', (req, res) =>
    handleGenerate(req, res, ASSESSMENT_CAPABILITIES, {
      applicationId: 'CURRICULUM_FLOW',
      capability: 'ASSESSMENT_SUPPORT'
    })
  );

  router.post('/cbt/generate', (req, res) =>
    handleGenerate(req, res, CBT_CAPABILITIES, {
      applicationId: 'CURRICULUM_FLOW',
      capability: 'CBT_GENERATION',
      taskType: 'cbt_paper'
    })
  );

  router.post('/provisioning/recommend', (req, res) =>
    handleGenerate(req, res, PROVISIONING_CAPABILITIES, {
      applicationId: 'PROVISIONING_AGENT',
      capability: 'ARCHITECTURE_RECOMMENDATION',
      taskType: 'provisioning_recommend'
    })
  );

  return router;
}
