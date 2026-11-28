import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import type { TenantSecurityContext } from '../src/services/tenantSecurityContext';
import { ServerTenantTokenService } from './tenantTokenService';
import { hasSecureControlPlaneSecret } from './schoolProvisioning';
import { homepageEngineManager, type HomepageEngineManager } from './homepageEngineManager';
import type { LandingFooterAppKey } from '../src/types/homepageEngine';

export interface HomepageRouterDeps {
  manager?: HomepageEngineManager;
  verifyToken?: (token: string) => { valid: boolean; context?: TenantSecurityContext; error?: string };
  signingConfigured?: () => boolean;
}

function sendError(req: Request, res: Response, status: number, code: string, error: string): void {
  res.status(status).json({
    success: false,
    error,
    code,
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

function mapManagerErrorStatus(err: unknown): { status: number; code: string; message: string } {
  const message = err instanceof Error ? err.message : 'Operation failed';
  if (message.startsWith('ACCESS_DENIED')) {
    return { status: 403, code: 'ACCESS_DENIED', message };
  }
  if (message.startsWith('INSTANCE_NOT_FOUND') || message.startsWith('VERSION_NOT_FOUND') || message.startsWith('NO_DRAFT_FOUND')) {
    return { status: 404, code: 'NOT_FOUND', message };
  }
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

export function createHomepageRouter(deps: HomepageRouterDeps = {}): Router {
  const router = express.Router();
  const manager = deps.manager ?? homepageEngineManager;
  const verifyToken = deps.verifyToken ?? ((token: string) => ServerTenantTokenService.verifyTenantToken(token));
  const signingConfigured = deps.signingConfigured ?? hasSecureControlPlaneSecret;

  const requireAdminToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = (req.headers.authorization || '') as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      sendError(req, res, 401, 'UNAUTHENTICATED', 'Valid cryptographic Bearer token is required.');
      return;
    }

    let configured = false;
    try {
      configured = signingConfigured();
    } catch {
      configured = false;
    }
    if (!configured) {
      sendError(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Token verification is unavailable.');
      return;
    }

    const verification = verifyToken(token);
    if (!verification.valid || !verification.context) {
      sendError(req, res, 401, 'UNAUTHENTICATED', verification.error || 'Invalid or expired security token.');
      return;
    }

    (req as any).tenantContext = verification.context;
    next();
  };

  // Public: Available homepage templates
  router.get('/homepage/templates', (_req: Request, res: Response) => {
    res.json({ success: true, data: manager.getTemplates() });
  });

  // Public: Domain to instance resolution
  router.get('/homepage/resolve', (req: Request, res: Response) => {
    const domain = req.query.domain as string;
    if (!domain) {
      res.status(400).json({ success: false, error: 'Domain query parameter is required' });
      return;
    }
    const resolvedInstanceId = manager.resolveInstanceByDomain(domain);
    res.json({
      success: true,
      data: {
        domain,
        resolvedInstanceId,
        isResolved: !!resolvedInstanceId
      }
    });
  });

  // Public: List provisioned instances for landing page generator switcher
  router.get('/homepage/instances', (_req: Request, res: Response) => {
    res.json({ success: true, data: manager.listProvisionedInstances() });
  });

  // Public: Published homepage configuration for an instance or domain
  router.get('/homepage/instance/:idOrDomain', (req: Request, res: Response) => {
    const config = manager.getPublicHomepage(req.params.idOrDomain);
    if (!config) {
      res.status(404).json({
        success: false,
        error: `No published homepage configuration found for instance or domain '${req.params.idOrDomain}'`
      });
      return;
    }
    res.json({ success: true, data: config });
  });

  // Public: Get platform landing page footer (Curriculum Server or Curriculum Flow)
  router.get('/landing-footer/:appKey', (req: Request, res: Response) => {
    const appKey = req.params.appKey as LandingFooterAppKey;
    if (appKey !== 'curriculum_server' && appKey !== 'curriculum_flow') {
      res.status(404).json({ success: false, error: `Unknown landing footer key '${req.params.appKey}'` });
      return;
    }
    res.json({ success: true, data: manager.getPlatformFooter(appKey) });
  });

  // Admin: Update platform landing page footer (Curriculum Server or Curriculum Flow)
  router.put('/server/landing-footer/:appKey', requireAdminToken, (req: Request, res: Response) => {
    const appKey = req.params.appKey as LandingFooterAppKey;
    if (appKey !== 'curriculum_server' && appKey !== 'curriculum_flow') {
      res.status(404).json({ success: false, error: `Unknown landing footer key '${req.params.appKey}'` });
      return;
    }
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const actorEmail = actorContext.email || `${actorContext.role}@${actorContext.tenantId}`;
      const updated = manager.updatePlatformFooter(appKey, req.body || {}, actorEmail, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  // Admin: List all provisioned instances with editorial metadata
  router.get('/server/homepage-instances', requireAdminToken, (req: Request, res: Response) => {
    const actorContext = (req as any).tenantContext as TenantSecurityContext;
    const all = manager.listProvisionedInstances();
    const scoped = actorContext.role === 'super_admin'
      ? all
      : all.filter(item => item.tenantId === actorContext.tenantId || item.instanceId === actorContext.tenantId);
    res.json({ success: true, data: scoped });
  });

  // Admin: Get full homepage configuration (draft, published, versions)
  router.get('/server/homepage/:instanceId', requireAdminToken, (req: Request, res: Response) => {
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const data = manager.getAdminHomepage(req.params.instanceId, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  // Admin: Save draft configuration
  router.put('/server/homepage/:instanceId/draft', requireAdminToken, (req: Request, res: Response) => {
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const actorEmail = actorContext.email || 'admin@school.sch.ng';
      const updatedDraft = manager.saveDraft(req.params.instanceId, req.body || {}, actorEmail, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data: updatedDraft });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  // Admin: Directly update institutional footer (copyright, address, email, phone) & live publish
  router.patch('/server/homepage/:instanceId/footer', requireAdminToken, (req: Request, res: Response) => {
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const actorEmail = actorContext.email || 'admin@school.sch.ng';
      const updated = manager.updateInstanceFooter(req.params.instanceId, req.body || {}, actorEmail, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  // Admin: Publish draft configuration to live version
  router.post('/server/homepage/:instanceId/publish', requireAdminToken, (req: Request, res: Response) => {
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const actorEmail = actorContext.email || 'admin@school.sch.ng';
      const changelog = req.body?.changelog || 'Published homepage updates from visual editor';
      const published = manager.publishHomepage(req.params.instanceId, actorEmail, changelog, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data: published });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  // Admin: Rollback to previous version snapshot
  router.post('/server/homepage/:instanceId/rollback', requireAdminToken, (req: Request, res: Response) => {
    try {
      const actorContext = (req as any).tenantContext as TenantSecurityContext;
      const actorEmail = actorContext.email || 'admin@school.sch.ng';
      const targetVersion = Number(req.body?.targetVersionNumber);
      if (!targetVersion) {
        res.status(400).json({ success: false, error: 'targetVersionNumber is required' });
        return;
      }
      const restored = manager.rollbackVersion(req.params.instanceId, targetVersion, actorEmail, {
        role: actorContext.role,
        tenantId: actorContext.tenantId
      });
      res.json({ success: true, data: restored });
    } catch (err) {
      const mapped = mapManagerErrorStatus(err);
      sendError(req, res, mapped.status, mapped.code, mapped.message);
    }
  });

  return router;
}
