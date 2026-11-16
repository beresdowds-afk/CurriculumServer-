import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TenantSecurityContext } from '../../src/services/tenantSecurityContext';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import type { AuthorizedPrincipal } from './authorizedPrincipal';
import type { AuthorizationSource } from './authorizationRepository';
import { PLATFORM_ADMIN_ROLE, TENANT_ROLES } from './permissions';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TokenVerifier {
  (token: string): { valid: boolean; context?: TenantSecurityContext; error?: string };
}

export interface AuthorizationMiddlewareDependencies {
  verifyToken: TokenVerifier;
  signingConfigured: () => boolean;
  authorization: () => AuthorizationSource;
  internalServiceKey?: () => string | undefined;
}

export interface ResourceReference {
  resourceType: string;
  resourceId: string;
}

function reject(req: Request, res: Response, status: number, code: string, error: string): void {
  res.status(status).json({
    success: false,
    error,
    code,
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

function bearer(req: Request): string {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/**
 * Reusable authentication and authorization middleware.
 *
 * Authentication (signed token) only establishes who the caller is and which
 * session they claim. Membership, roles, permissions and resource scopes are
 * always read from PostgreSQL on each request, so revocation is immediate.
 */
export function createAuthorizationMiddleware(deps: AuthorizationMiddlewareDependencies) {
  const authenticated: RequestHandler = (req, res, next) => {
    const token = bearer(req);
    if (!token || !deps.signingConfigured()) {
      reject(req, res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }
    const verification = deps.verifyToken(token);
    if (!verification.valid || !verification.context) {
      reject(req, res, 401, 'UNAUTHENTICATED', 'Authentication is invalid or expired.');
      return;
    }
    (req as any).tenantContext = verification.context;
    (req as any).verifiedToken = verification;
    next();
  };

  const activeMembership: RequestHandler = (req, res, next) => {
    authenticated(req, res, async () => {
      const context = (req as any).tenantContext as TenantSecurityContext;
      if (context.role === PLATFORM_ADMIN_ROLE || !context.userId || !context.sessionId ||
          !UUID.test(context.tenantId) || !UUID.test(context.userId)) {
        reject(req, res, 403, 'FORBIDDEN', 'A tenant user session is required.');
        return;
      }
      try {
        const tenant = createVerifiedTenantPrincipal((req as any).verifiedToken);
        const result = await deps.authorization().authorize(tenant, context.userId, context.sessionId);
        if (result.ok === false) {
          reject(req, res, 403, result.reason, result.reason === 'SESSION_REVOKED'
            ? 'The session is no longer active.'
            : 'Tenant membership is not active.');
          return;
        }
        (req as any).trustedTenantContext = tenant;
        (req as any).authorizedPrincipal = result.principal;
        next();
      } catch {
        reject(req, res, 503, 'DATABASE_UNAVAILABLE', 'Authorization is temporarily unavailable.');
      }
    });
  };

  const requirePermission = (permission: string): RequestHandler => (req, res, next) => {
    activeMembership(req, res, () => {
      const principal = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (!principal.hasPermission(permission)) {
        reject(req, res, 403, 'FORBIDDEN', 'You do not have permission to perform this operation.');
        return;
      }
      next();
    });
  };

  // Resource-scoped checks run after the DB-derived principal is established.
  const requireResourcePermission = (
    permission: string,
    resolve: (req: Request) => ResourceReference | undefined
  ): RequestHandler => (req, res, next) => {
    activeMembership(req, res, () => {
      const principal = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      const resource = resolve(req);
      if (!resource || !principal.hasPermissionFor(permission, resource.resourceType, resource.resourceId)) {
        reject(req, res, 403, 'FORBIDDEN', 'You do not have access to this resource.');
        return;
      }
      next();
    });
  };

  const tenantAdministrator: RequestHandler = (req, res, next) => {
    activeMembership(req, res, () => {
      const principal = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (!principal.roles.includes(TENANT_ROLES.tenantAdmin)) {
        reject(req, res, 403, 'FORBIDDEN', 'Tenant administrator access is required.');
        return;
      }
      next();
    });
  };

  // Platform administrators are never tenant users and never hold tenant roles.
  const platformAdministrator: RequestHandler = (req, res, next) => {
    authenticated(req, res, () => {
      const verification = (req as any).verifiedToken;
      if (verification.context.role !== PLATFORM_ADMIN_ROLE) {
        reject(req, res, 403, 'SUPER_ADMIN_REQUIRED', 'Platform administrator access is required.');
        return;
      }
      (req as any).trustedTenantContext = createVerifiedTenantPrincipal(verification);
      next();
    });
  };

  const internalService: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const expected = deps.internalServiceKey?.();
    if (!expected || expected.length < 32) {
      reject(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Internal service authentication is unavailable.');
      return;
    }
    const supplied = Buffer.from(String(req.headers['x-internal-service-key'] || ''));
    const wanted = Buffer.from(expected);
    if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) {
      reject(req, res, 401, 'UNAUTHENTICATED', 'Internal service authentication failed.');
      return;
    }
    next();
  };

  return {
    authenticated,
    activeMembership,
    requirePermission,
    requireResourcePermission,
    tenantAdministrator,
    platformAdministrator,
    internalService
  };
}
