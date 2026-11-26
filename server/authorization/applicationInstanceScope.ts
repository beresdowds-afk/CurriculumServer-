import type { Request, RequestHandler } from 'express';
import type { AuthorizedPrincipal } from './authorizedPrincipal';
import type { createAuthorizationMiddleware } from './middleware';
import { TamperEvidentAuditService } from '../../src/services/tamperEvidentAuditService';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApplicationInstanceScopeResolution =
  | { ok: true; applicationInstanceId: string }
  | { ok: false; code: 'APPLICATION_INSTANCE_CONFLICT' | 'INVALID_APPLICATION_INSTANCE'; message: string };

function normalizeSingleSource(raw: unknown): { present: boolean; validType: boolean; value: string } {
  if (raw === undefined || raw === null) {
    return { present: false, validType: true, value: '' };
  }
  if (typeof raw !== 'string') {
    return { present: true, validType: false, value: '' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { present: false, validType: true, value: '' };
  }
  return { present: true, validType: true, value: trimmed };
}

/**
 * Resolves the target application instance from header (`x-application-instance-id`),
 * query (`applicationInstanceId`), and JSON body (`applicationInstanceId`).
 * Rejects any mismatch across provided sources or malformed non-string/array inputs.
 */
export function resolveApplicationInstanceScope(req: Request): ApplicationInstanceScopeResolution {
  const header = normalizeSingleSource(req.headers['x-application-instance-id']);
  const query = normalizeSingleSource(req.query?.applicationInstanceId);
  const bodyObj = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : undefined;
  const body = normalizeSingleSource(bodyObj?.applicationInstanceId);

  if (!header.validType || !query.validType || !body.validType) {
    return {
      ok: false,
      code: 'APPLICATION_INSTANCE_CONFLICT',
      message: 'Multiple or non-string applicationInstanceId values were supplied.'
    };
  }

  const candidates = [header, query, body].filter(entry => entry.present).map(entry => entry.value);
  if (candidates.length === 0) {
    return { ok: true, applicationInstanceId: '' };
  }

  const normalizedDistinct = new Set(candidates.map(value => value.toLowerCase()));
  if (normalizedDistinct.size > 1) {
    return {
      ok: false,
      code: 'APPLICATION_INSTANCE_CONFLICT',
      message: 'Conflicting applicationInstanceId values provided across header, query, or body.'
    };
  }

  const resolved = candidates[0];
  if (!UUID.test(resolved)) {
    return {
      ok: false,
      code: 'INVALID_APPLICATION_INSTANCE',
      message: 'applicationInstanceId must be a valid UUID.'
    };
  }

  return { ok: true, applicationInstanceId: resolved.toLowerCase() };
}

export function extractApplicationInstanceId(req: Request): string {
  const scope = resolveApplicationInstanceScope(req);
  return scope.ok ? scope.applicationInstanceId : '';
}

export function createApplicationInstancePermissionGuard(
  auth: ReturnType<typeof createAuthorizationMiddleware>,
  permission: string
): RequestHandler {
  return (req, res, next) => {
    auth.activeMembership(req, res, () => {
      const scope = resolveApplicationInstanceScope(req);
      const principal = (req as Request & { authorizedPrincipal?: AuthorizedPrincipal }).authorizedPrincipal;
      const correlationId = (req as any).correlationId;

      if ('code' in scope) {
        TamperEvidentAuditService.logPlatformAction({
          actor: principal?.userId || 'unknown',
          actorRole: principal?.roles[0] || 'unknown',
          tenantId: principal?.tenantId || 'unknown',
          action: 'application_instance_scope_conflict',
          target: req.originalUrl || req.path,
          result: 'FAILURE',
          outcome: 'BLOCKED',
          resourceType: 'application_instance',
          resourceId: 'conflict',
          details: scope.message,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(400).json({
          success: false,
          error: scope.message,
          code: scope.code,
          correlationId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const resourceId = scope.applicationInstanceId;
      const hasCaseNormalizedPermission = Boolean(
        resourceId &&
        principal &&
        principal.grants.some(grant =>
          grant.permissions.includes(permission) &&
          (grant.scopes.length === 0 ||
            grant.scopes.some(s =>
              s.resourceType === 'application_instance' && s.resourceId.toLowerCase() === resourceId
            ))
        )
      );

      if (!hasCaseNormalizedPermission) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this resource.',
          code: 'FORBIDDEN',
          correlationId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      (req as any).applicationInstanceId = resourceId;
      next();
    });
  };
}
