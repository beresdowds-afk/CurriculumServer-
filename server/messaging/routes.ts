import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { DatabasePool } from '../db/postgres';
import { createVerifiedTenantPrincipal, type VerifiedTenantPrincipal } from '../db/tenantContext';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import { ServerTenantTokenService } from '../tenantTokenService';
import { createSlidingWindowRateLimiter } from '../sharedServices/rateLimiter';
import { CmagCommunicationEngine, CmagCommunicationError } from './communicationEngine';
import { CmagDeliveryEngine } from './deliveryEngine';
import { CmagOtpError, CmagOtpService } from './otpService';
import { currentDeploymentEnvironment } from './providers';

export interface CmagRouterDependencies {
  getPool: () => DatabasePool;
  isConfigured: () => boolean;
  authorizationMiddleware: AuthorizationMiddleware;
  requirePlatformAdmin: RequestHandler;
  otpService?: CmagOtpService;
  deliveryEngine?: CmagDeliveryEngine;
  communicationEngine?: CmagCommunicationEngine;
}

export function buildCmagSystemWorkerPrincipal(): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'platform-control-plane',
      role: 'super_admin',
      appId: 'curriculum-server-control-plane',
      schoolName: 'Curriculum Server Control Plane',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: 'platform-control-plane',
      email: 'cmag-system@curriculum-server.internal',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 300,
      tokenSignature: 'cmag-system-worker',
      permissions: ['super_admin']
    }
  });
}

function sendCmagError(req: Request, res: Response, error: unknown): void {
  const correlationId = (req as any).correlationId;
  if (error instanceof CmagOtpError || error instanceof CmagCommunicationError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      error: error.message,
      correlationId,
      timestamp: new Date().toISOString()
    });
    return;
  }
  const msg = error instanceof Error ? error.message : 'Messaging operation failed';
  const status = msg.includes('SUSPENDED') || msg.includes('UNAUTHORIZED') || msg.includes('MISMATCH')
    ? 403
    : msg.includes('QUOTA') || msg.includes('BUDGET')
      ? 429
      : msg.includes('NOT_FOUND')
        ? 404
        : msg.includes('INVALID_') || msg.includes('REQUIRED')
          ? 400
          : 503;
  res.status(status).json({
    success: false,
    code: /^[A-Z0-9_]{3,64}$/.test(msg) ? msg : 'CMAG_OPERATION_FAILED',
    error: status === 503 ? 'Messaging gateway persistence is currently unavailable.' : msg,
    correlationId,
    timestamp: new Date().toISOString()
  });
}

function ensureConfigured(req: Request, res: Response, deps: CmagRouterDependencies): boolean {
  if (!deps.isConfigured()) {
    res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      error: 'Messaging gateway requires an active PostgreSQL database connection.',
      correlationId: (req as any).correlationId,
      timestamp: new Date().toISOString()
    });
    return false;
  }
  return true;
}

export function createCmagRouters(deps: CmagRouterDependencies) {
  let cachedEngine: CmagDeliveryEngine | undefined = deps.deliveryEngine;
  let cachedOtp: CmagOtpService | undefined = deps.otpService;
  let cachedComms: CmagCommunicationEngine | undefined = deps.communicationEngine;

  const getDeliveryEngine = () => {
    cachedEngine ??= new CmagDeliveryEngine(deps.getPool());
    return cachedEngine;
  };
  const getOtpService = () => {
    cachedOtp ??= new CmagOtpService(deps.getPool(), getDeliveryEngine());
    return cachedOtp;
  };
  const getCommsEngine = () => {
    cachedComms ??= new CmagCommunicationEngine(deps.getPool(), getDeliveryEngine());
    return cachedComms;
  };

  const otpHttpLimiter = createSlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: Math.max(10, Number(process.env.CMAG_OTP_HTTP_RATE_LIMIT || 30)),
    serviceLabel: 'cmag-auth-otp'
  });

  const messagingApiLimiter = createSlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: Math.max(20, Number(process.env.CMAG_API_RATE_LIMIT || 180)),
    serviceLabel: 'cmag-messaging-api'
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication OTP Routes (Platform, School, & Curriculum Flow scopes)
  // ---------------------------------------------------------------------------
  const authOtpRouter = Router();

  authOtpRouter.post('/server/auth/otp/request', otpHttpLimiter, async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const receipt = await getOtpService().requestPlatformOtp(buildCmagSystemWorkerPrincipal(), {
        email: typeof req.body?.email === 'string' ? req.body.email : '',
        phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
        preferredChannel: req.body?.preferredChannel,
        purpose: req.body?.purpose || 'platform_login',
        ipAddress: req.ip,
        locale: typeof req.body?.locale === 'string' ? req.body.locale : undefined,
        correlationId: (req as any).correlationId
      });
      res.status(201).json({
        success: true,
        data: receipt,
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  authOtpRouter.post('/server/auth/otp/verify', otpHttpLimiter, async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const result = await getOtpService().verifyPlatformOtp(buildCmagSystemWorkerPrincipal(), {
        challengeId: typeof req.body?.challengeId === 'string' ? req.body.challengeId : '',
        email: typeof req.body?.email === 'string' ? req.body.email : '',
        purpose: req.body?.purpose || 'platform_login',
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        ipAddress: req.ip
      });
      const issueToken = result.purpose === 'platform_login' || result.purpose === 'platform_mfa';
      const token = issueToken
        ? ServerTenantTokenService.issuePlatformAdminToken(result.email)
        : undefined;
      res.json({
        success: true,
        data: {
          ...result,
          ...(token ? { token, expiresIn: 3600 } : {})
        },
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  const handleTenantOtpRequest = (defaultAppId: string) => async (req: Request, res: Response) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const receipt = await getOtpService().requestTenantOtp(buildCmagSystemWorkerPrincipal(), {
        tenantId: typeof req.body?.tenantId === 'string' ? req.body.tenantId : '',
        applicationId: typeof req.body?.applicationId === 'string' ? req.body.applicationId : defaultAppId,
        applicationInstanceId: typeof req.body?.applicationInstanceId === 'string' ? req.body.applicationInstanceId : undefined,
        recipientType: req.body?.recipientType,
        email: typeof req.body?.email === 'string' ? req.body.email : undefined,
        phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
        userId: typeof req.body?.userId === 'string' ? req.body.userId : undefined,
        preferredChannel: req.body?.preferredChannel,
        purpose: req.body?.purpose || 'login_otp',
        ipAddress: req.ip,
        locale: typeof req.body?.locale === 'string' ? req.body.locale : undefined,
        correlationId: (req as any).correlationId
      });
      res.status(201).json({
        success: true,
        data: receipt,
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  };

  const handleTenantOtpVerify = (defaultAppId: string) => async (req: Request, res: Response) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId : '';
      const issueSession = req.body?.issueSession !== false &&
        ['login_otp', 'mfa_verify'].includes(req.body?.purpose || 'login_otp');

      const result = await getOtpService().verifyTenantOtp({
        tenantId,
        applicationId: typeof req.body?.applicationId === 'string' ? req.body.applicationId : defaultAppId,
        applicationInstanceId: typeof req.body?.applicationInstanceId === 'string' ? req.body.applicationInstanceId : undefined,
        challengeId: typeof req.body?.challengeId === 'string' ? req.body.challengeId : '',
        email: typeof req.body?.email === 'string' ? req.body.email : undefined,
        phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
        purpose: req.body?.purpose || 'login_otp',
        code: typeof req.body?.code === 'string' ? req.body.code : '',
        issueSession,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      let token: string | undefined;
      if (result.sessionId && result.userId && result.email && result.role && result.schoolName) {
        token = ServerTenantTokenService.issueTenantToken({
          id: tenantId,
          appId: defaultAppId,
          schoolName: result.schoolName,
          subscriptionTier: 'standard',
          status: 'active'
        }, result.role, 12 * 60 * 60, result.email, result.userId, result.sessionId);
      }

      res.json({
        success: true,
        data: {
          verified: true,
          channel: result.channel,
          purpose: result.purpose,
          tenantId,
          ...(token
            ? {
                token,
                expiresIn: 12 * 60 * 60,
                schoolName: result.schoolName,
                user: {
                  id: result.userId,
                  name: result.fullName,
                  email: result.email,
                  role: result.role
                }
              }
            : {})
        },
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  };

  authOtpRouter.post('/schools/auth/otp/request', otpHttpLimiter, handleTenantOtpRequest('app_curriculum_flow'));
  authOtpRouter.post('/schools/auth/otp/verify', otpHttpLimiter, handleTenantOtpVerify('app_curriculum_flow'));
  authOtpRouter.post('/flow/auth/otp/request', otpHttpLimiter, handleTenantOtpRequest('app_curriculum_flow'));
  authOtpRouter.post('/flow/auth/otp/verify', otpHttpLimiter, handleTenantOtpVerify('app_curriculum_flow'));

  // ---------------------------------------------------------------------------
  // 2. Signed Provider Webhooks
  // ---------------------------------------------------------------------------
  const webhookRouter = Router();

  webhookRouter.post('/messaging/webhooks/:providerId', async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const rawBody = Buffer.isBuffer((req as any).rawBody)
        ? (req as any).rawBody.toString('utf8')
        : typeof (req as any).rawBody === 'string'
          ? (req as any).rawBody
          : JSON.stringify(req.body ?? {});

      const outcome = await getDeliveryEngine().processWebhook(
        buildCmagSystemWorkerPrincipal(),
        req.params.providerId,
        req.headers as Record<string, string | string[] | undefined>,
        rawBody
      );
      res.status(outcome.statusCode).json({
        success: outcome.accepted,
        code: outcome.code,
        replay: Boolean(outcome.replay),
        ...(outcome.event ? { status: outcome.event.lifecycleState, providerMessageId: outcome.event.providerMessageId } : {}),
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Platform Administrator Control-Plane Router
  // ---------------------------------------------------------------------------
  const platformRouter = Router();
  platformRouter.use(deps.requirePlatformAdmin, messagingApiLimiter, (req, res, next) => {
    if (!ensureConfigured(req, res, deps)) return;
    next();
  });

  platformRouter.get('/overview', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const [overview, providers, queue] = await Promise.all([
        getCommsEngine().getPlatformOverview(principal),
        getDeliveryEngine().listProviderConfigs(principal),
        getDeliveryEngine().getQueueMetrics(principal, 'platform')
      ]);
      res.json({
        success: true,
        data: {
          ...overview,
          providers,
          queue,
          workerHealth: getDeliveryEngine().getWorkerHealth()
        },
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.patch('/config', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().updatePlatformConfig(principal, req.body || {});
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.get('/providers', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const providers = await getDeliveryEngine().listProviderConfigs(principal);
      res.json({ success: true, data: providers, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.put('/providers/:providerId', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const result = await getDeliveryEngine().upsertProviderConfig(principal, req.params.providerId, req.body || {});
      res.json({ success: true, data: result, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/providers/:providerId/suspend', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      await getDeliveryEngine().suspendProvider(principal, req.params.providerId, true, req.body?.reason);
      res.json({ success: true, data: { suspended: true }, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/providers/:providerId/resume', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      await getDeliveryEngine().suspendProvider(principal, req.params.providerId, false);
      res.json({ success: true, data: { suspended: false }, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/senders', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const created = await getCommsEngine().registerSenderIdentity(principal, req.body || {});
      res.status(201).json({ success: true, data: created, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/whatsapp-templates', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const created = await getCommsEngine().registerWhatsAppTemplate(principal, req.body || {});
      res.status(201).json({ success: true, data: created, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/tenants/:tenantId/suspend', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().suspendOrResumeTenant(principal, req.params.tenantId, true, req.body?.reason);
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/tenants/:tenantId/resume', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().suspendOrResumeTenant(principal, req.params.tenantId, false);
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.get('/queue', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const metrics = await getDeliveryEngine().getQueueMetrics(principal, 'platform');
      res.json({
        success: true,
        data: { metrics, worker: getDeliveryEngine().getWorkerHealth() },
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/dispatch-now', async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.body?.limit || 10)));
      const result = await getDeliveryEngine().dispatchBatch(buildCmagSystemWorkerPrincipal(), limit);
      res.json({ success: true, data: result, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/messages/:outboxId/retry', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const retried = await getDeliveryEngine().retryPlatformMessage(principal, req.params.outboxId);
      res.json({ success: true, data: { retried }, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  platformRouter.post('/send', async (req, res) => {
    try {
      const principal = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const channel = req.body?.channel === 'whatsapp' ? 'whatsapp' : req.body?.channel === 'email' ? 'email' : 'sms';
      const queued = await getDeliveryEngine().enqueuePlatformMessage(principal, {
        applicationId: 'platform_control_plane',
        environment: currentDeploymentEnvironment(),
        classification: req.body?.classification || 'transactional',
        category: req.body?.category || 'platform_operations',
        purpose: req.body?.purpose || 'platform_alert',
        correlationId: (req as any).correlationId,
        idempotencyKey: typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined,
        recipientType: 'admin',
        request: channel === 'email'
          ? {
              channel: 'email',
              to: req.body?.to,
              subject: req.body?.subject || 'Curriculum Server Platform Alert',
              text: req.body?.message
            }
          : channel === 'sms'
            ? { channel: 'sms', to: req.body?.to, message: req.body?.message, senderName: req.body?.senderName }
            : { channel: 'whatsapp', to: req.body?.to, message: req.body?.message, senderNumber: req.body?.senderNumber }
      });
      res.status(202).json({ success: true, data: queued, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Tenant / School / Application Messaging Router
  // ---------------------------------------------------------------------------
  const tenantRouter = Router();
  const { requirePermission } = deps.authorizationMiddleware;
  tenantRouter.use(messagingApiLimiter);

  tenantRouter.get('/overview', requirePermission(PERMISSIONS.messagingConfigRead), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const [overview, queue] = await Promise.all([
        getCommsEngine().getTenantMessagingOverview(tenant),
        getDeliveryEngine().getQueueMetrics(tenant, 'school')
      ]);
      res.json({
        success: true,
        data: { ...overview, queue },
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.patch('/config', requirePermission(PERMISSIONS.messagingConfigManage), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().updateTenantConfig(tenant, req.body || {});
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.put('/templates', requirePermission(PERMISSIONS.messagingTemplatesManage), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().upsertMessageTemplate(tenant, req.body || {});
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.put('/preferences', requirePermission(PERMISSIONS.messagingPreferencesManage), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const updated = await getCommsEngine().upsertRecipientPreference(tenant, req.body || {});
      res.json({ success: true, data: updated, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.post('/send', requirePermission(PERMISSIONS.messagingSend), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const actor = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (req.body?.classification === 'emergency' && !actor.hasPermission(PERMISSIONS.messagingEmergency)) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'Emergency broadcast permission is required.',
          correlationId: (req as any).correlationId,
          timestamp: new Date().toISOString()
        });
        return;
      }
      const queued = await getCommsEngine().sendTargetedMessage(tenant, {
        ...(req.body || {}),
        scheduledFor: req.body?.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        correlationId: (req as any).correlationId,
        actorSubject: actor.userId
      });
      res.status(202).json({ success: true, data: queued, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.post('/broadcasts', requirePermission(PERMISSIONS.messagingBroadcast), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const actor = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (req.body?.classification === 'emergency' && !actor.hasPermission(PERMISSIONS.messagingEmergency)) {
        res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'Emergency broadcast permission is required.',
          correlationId: (req as any).correlationId,
          timestamp: new Date().toISOString()
        });
        return;
      }
      const result = await getCommsEngine().createAndDispatchBroadcast(tenant, {
        ...(req.body || {}),
        scheduledFor: req.body?.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        actorSubject: actor.userId
      });
      res.status(202).json({ success: true, data: result, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.post('/messages/:outboxId/retry', requirePermission(PERMISSIONS.messagingRetry), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const retried = await getDeliveryEngine().retryTenantMessage(tenant, req.params.outboxId);
      res.json({ success: true, data: { retried }, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  tenantRouter.get('/queue', requirePermission(PERMISSIONS.messagingReportsRead), async (req, res) => {
    if (!ensureConfigured(req, res, deps)) return;
    try {
      const tenant = (req as any).trustedTenantContext as VerifiedTenantPrincipal;
      const metrics = await getDeliveryEngine().getQueueMetrics(tenant, 'school');
      res.json({ success: true, data: metrics, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
    } catch (error) {
      sendCmagError(req, res, error);
    }
  });

  return {
    authOtpRouter,
    webhookRouter,
    platformRouter,
    tenantRouter,
    getDeliveryEngine,
    getOtpService,
    getCommsEngine
  };
}
