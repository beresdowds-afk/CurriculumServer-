import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TenantSecurityContext } from '../../src/services/tenantSecurityContext';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import type { AuthorizedPrincipal } from './authorizedPrincipal';
import type { AuthorizationSource } from './authorizationRepository';
import { PLATFORM_ADMIN_ROLE, TENANT_ROLES } from './permissions';
import { isPlatformAdminTokenContext } from '../tenantTokenService';
import {
  verifyGoogleServiceIdentityToken,
  type GoogleServiceIdentity
} from './googleServiceIdentity';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TokenVerifier {
  (token: string): { valid: boolean; context?: TenantSecurityContext; error?: string };
}

export interface AuthorizationMiddlewareDependencies {
  verifyToken: TokenVerifier;
  signingConfigured: () => boolean;
  authorization: () => AuthorizationSource;
  platformAdministratorAllowed?: (email: string) => boolean;
  internalServiceKey?: () => string | undefined;
  internalServiceAudience?: () => string | undefined;
  authorizedInternalCallers?: () => readonly string[];
  authorizedInternalOperations?: () => Readonly<Record<string, readonly string[]>>;
  verifyInternalServiceIdentity?: (
    token: string,
    audience: string
  ) => Promise<GoogleServiceIdentity | undefined>;
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

function internalServiceOperationForRequest(req: Request): string | undefined {
  const match = req.path.match(/^\/api\/v1\/shared\/(curriculum|textbooks|vehicle-tracking)(?:\/|$)/);
  if (!match) return undefined;
  const service = match[1].replace(/-/g, '_');
  if (req.method === 'GET' && req.path === `/api/v1/shared/${match[1]}/discovery`) {
    return `shared.${service}.discover`;
  }
  if (req.method === 'POST' && req.path === `/api/v1/shared/${match[1]}/authorization`) {
    return `shared.${service}.authorize`;
  }
  if (req.method === 'GET' && req.path === `/api/v1/shared/${match[1]}/health`) {
    return `shared.${service}.health`;
  }
  if (req.method === 'GET' && req.path.startsWith(`/api/v1/shared/${match[1]}/`)) {
    return `shared.${service}.consume`;
  }
  return undefined;
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
    if (!token) {
      reject(req, res, 401, 'UNAUTHENTICATED', 'Authentication is required.');
      return;
    }
    try {
      if (!deps.signingConfigured()) {
        reject(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Authentication is temporarily unavailable.');
        return;
      }
    } catch {
      reject(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Authentication is temporarily unavailable.');
      return;
    }
    let verification: ReturnType<TokenVerifier>;
    try {
      verification = deps.verifyToken(token);
    } catch {
      reject(req, res, 503, 'AUTHENTICATION_UNAVAILABLE', 'Authentication is temporarily unavailable.');
      return;
    }
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
          !UUID.test(context.tenantId) || !UUID.test(context.userId) || !UUID.test(context.sessionId)) {
        reject(req, res, 403, 'FORBIDDEN', 'A tenant user session is required.');
        return;
      }
      try {
        const tenant = createVerifiedTenantPrincipal((req as any).verifiedToken);
        const result = await deps.authorization().authorize(tenant, context.userId, context.sessionId);
        if (result.ok === false) {
          reject(req, res, 403, result.reason, result.reason === 'SESSION_REVOKED'
            ? 'The session is no longer active.'
            : result.reason === 'MEMBERSHIP_INACTIVE'
              ? 'Tenant membership is not active.'
              : 'The tenant identity is inconsistent.');
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

  // The repository must still filter or verify the actual resource against these scopes.
  const requirePermissionWithinScopes = (
    permission: string,
    resourceTypes: readonly string[]
  ): RequestHandler => (req, res, next) => {
    activeMembership(req, res, () => {
      const principal = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (!principal.hasPermission(permission) && !principal.grants.some(grant =>
        grant.permissions.includes(permission) &&
        grant.scopes.some(scope => resourceTypes.includes(scope.resourceType))
      )) {
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
      let resource: ResourceReference | undefined;
      try {
        resource = resolve(req);
      } catch {
        reject(req, res, 403, 'FORBIDDEN', 'You do not have access to this resource.');
        return;
      }
      if (!resource || !/^[a-z_]+$/.test(resource.resourceType) ||
          !UUID.test(resource.resourceId) ||
          !principal.hasPermissionFor(permission, resource.resourceType, resource.resourceId)) {
        reject(req, res, 403, 'FORBIDDEN', 'You do not have access to this resource.');
        return;
      }
      next();
    });
  };

  const tenantAdministrator: RequestHandler = (req, res, next) => {
    activeMembership(req, res, () => {
      const principal = (req as any).authorizedPrincipal as AuthorizedPrincipal;
      if (!principal.grants.some(grant =>
        grant.roleCode === TENANT_ROLES.tenantAdmin && grant.scopes.length === 0
      )) {
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
      const email = verification.context.email;
      let allowed = false;
      try {
        allowed = Boolean(email && isPlatformAdminTokenContext(verification.context) &&
          deps.platformAdministratorAllowed?.(email));
      } catch {
        allowed = false;
      }
      if (!allowed) {
        reject(req, res, 403, 'SUPER_ADMIN_REQUIRED', 'Platform administrator access is required.');
        return;
      }
      (req as any).trustedTenantContext = createVerifiedTenantPrincipal(verification);
      next();
    });
  };

  const internalService: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const identityTokenHeader = req.headers['x-serverless-authorization'];
    const identityToken = typeof identityTokenHeader === 'string' &&
      identityTokenHeader.startsWith('Bearer ')
      ? identityTokenHeader.slice(7).trim()
      : '';
    if (identityToken) {
      const audience = deps.internalServiceAudience?.() || '';
      const allowedCallers = deps.authorizedInternalCallers?.() || [];
      let operationPolicy: Readonly<Record<string, readonly string[]>>;
      try {
        operationPolicy = deps.authorizedInternalOperations?.() || {};
      } catch {
        reject(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Internal service operation policy is invalid.');
        return;
      }
      if (!audience || allowedCallers.length === 0 || !operationPolicy ||
          typeof operationPolicy !== 'object' || Array.isArray(operationPolicy) ||
          Object.keys(operationPolicy).length === 0 ||
          Object.values(operationPolicy).some(operations =>
            !Array.isArray(operations) || operations.some(operation => typeof operation !== 'string')
          )) {
        reject(req, res, 503, 'AUTH_CONFIGURATION_UNAVAILABLE', 'Internal service identity is not configured.');
        return;
      }
      try {
        const identity = await (deps.verifyInternalServiceIdentity || verifyGoogleServiceIdentityToken)(
          identityToken,
          audience
        );
        if (!identity || typeof identity.email !== 'string' || !identity.email ||
            identity.audience !== audience ||
            !allowedCallers.some(caller => caller.toLowerCase() === identity.email.toLowerCase())) {
          reject(req, res, 401, 'UNAUTHENTICATED', 'Internal service identity is invalid or unauthorized.');
          return;
        }
        const operation = internalServiceOperationForRequest(req);
        const allowedOperations = operationPolicy[identity.email.toLowerCase()] || [];
        if (!operation || !allowedOperations.includes(operation)) {
          reject(req, res, 403, 'FORBIDDEN', 'Internal service identity is not authorized for this operation.');
          return;
        }
        (req as any).internalServiceIdentity = Object.freeze({ ...identity });
        next();
      } catch {
        reject(req, res, 503, 'AUTH_DEPENDENCY_UNAVAILABLE', 'Internal service identity verification is unavailable.');
      }
      return;
    }

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
    (req as any).internalServiceIdentity = Object.freeze({ type: 'legacy_shared_key' });
    next();
  };

  return {
    authenticated,
    activeMembership,
    requirePermission,
    requirePermissionWithinScopes,
    requireResourcePermission,
    tenantAdministrator,
    platformAdministrator,
    internalService
  };
}
