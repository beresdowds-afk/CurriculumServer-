import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AiApplicationId } from '../../packages/shared-types/src/aiGatewayContracts';
import { ServerTenantTokenService, isPlatformAdminTokenContext } from '../tenantTokenService';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import type { DatabasePool } from '../db/postgres';
import { AuthorizationRepository, type AuthorizationSource } from '../authorization/authorizationRepository';
import { PLATFORM_ADMIN_ROLE } from '../authorization/permissions';
import { hasSecureControlPlaneSecret, isPlatformAdminEmail } from '../schoolProvisioning';
import {
  verifyGoogleServiceIdentityToken,
  type GoogleServiceIdentity
} from '../authorization/googleServiceIdentity';
import { TenantSecurityContextManager } from '../../src/services/tenantSecurityContext';
import { AiGatewayError, type AiCapabilityPolicy, type AuthenticatedAiCaller } from './types';
import type { AiGatewayPersistenceStore } from './usageMetering';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiEntitlementModeResolver {
  (): 'strict' | 'decoupled';
}

export function resolveAiEntitlementMode(): 'strict' | 'decoupled' {
  if (process.env.NODE_ENV === 'production') return 'strict';
  if (process.env.AI_ENTITLEMENT_MODE === 'strict') return 'strict';
  if (process.env.AI_ENTITLEMENT_MODE === 'decoupled') return 'decoupled';
  if (process.env.SHARED_SERVICE_ENTITLEMENT_MODE === 'strict') return 'strict';
  return 'decoupled';
}

export interface AuthenticateAiCallerDependencies {
  pool?: DatabasePool;
  poolConfigured: boolean;
  verifyToken?: typeof ServerTenantTokenService.verifyTenantToken;
  signingConfigured?: () => boolean;
  internalServiceKey?: () => string | undefined;
  internalServiceAudience?: string;
  authorizedInternalCallers?: readonly string[];
  verifyInternalServiceIdentity?: (
    token: string,
    audience: string
  ) => Promise<GoogleServiceIdentity | undefined>;
  platformAdministratorAllowed?: (email: string) => boolean;
  authorization?: AuthorizationSource;
}

/**
 * Authenticates callers from signed tenant/platform tokens and optional verified service identity.
 * Raw client-supplied headers (x-tenant-id, x-role, x-user-role) are NEVER trusted for identity.
 */
export async function authenticateAiRequest(
  req: Request,
  deps: AuthenticateAiCallerDependencies
): Promise<AuthenticatedAiCaller> {
  const signingConfigured = deps.signingConfigured ?? hasSecureControlPlaneSecret;
  if (!signingConfigured()) {
    throw new AiGatewayError(
      'UNAUTHENTICATED',
      'Server-side authentication signing is not configured.',
      503
    );
  }

  const authHeader = (req.headers.authorization || '').trim();
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const internalIdentityHeader = req.headers['x-serverless-authorization'];
  const internalIdentityToken = typeof internalIdentityHeader === 'string' &&
    internalIdentityHeader.startsWith('Bearer ')
    ? internalIdentityHeader.slice(7).trim()
    : '';
  let internalServiceVerified = false;
  if (internalIdentityToken) {
    const audience = deps.internalServiceAudience || '';
    const allowedCallers = deps.authorizedInternalCallers || [];
    if (!audience || allowedCallers.length === 0) {
      throw new AiGatewayError('UNAUTHENTICATED', 'Internal service identity is not configured.', 503);
    }
    let identity: GoogleServiceIdentity | undefined;
    try {
      identity = await (deps.verifyInternalServiceIdentity || verifyGoogleServiceIdentityToken)(
        internalIdentityToken,
        audience
      );
    } catch {
      throw new AiGatewayError('UNAUTHENTICATED', 'Internal service identity verification is unavailable.', 503);
    }
    if (!identity || typeof identity.email !== 'string' || !identity.email ||
        identity.audience !== audience ||
        !allowedCallers.some(caller => caller.toLowerCase() === identity.email.toLowerCase())) {
      throw new AiGatewayError('UNAUTHENTICATED', 'Internal service identity is invalid or unauthorized.', 401);
    }
    internalServiceVerified = true;
  }

  const internalKeyHeader = req.headers['x-internal-service-key'];
  const expectedInternalKey = deps.internalServiceKey?.() ?? process.env.INTERNAL_SERVICE_KEY;
  if (typeof internalKeyHeader === 'string' && internalKeyHeader.length > 0) {
    if (!expectedInternalKey || expectedInternalKey.length < 32) {
      throw new AiGatewayError('UNAUTHENTICATED', 'Internal service key verification unavailable.', 503);
    }
    const supplied = Buffer.from(internalKeyHeader);
    const wanted = Buffer.from(expectedInternalKey);
    if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) {
      throw new AiGatewayError('UNAUTHENTICATED', 'Invalid internal service key.', 401);
    }
    internalServiceVerified = true;
  }

  if (!bearerToken) {
    throw new AiGatewayError(
      'UNAUTHENTICATED',
      'Authentication required. Provide a valid Bearer token for AI Gateway access.',
      401
    );
  }

  const verify = deps.verifyToken ?? ServerTenantTokenService.verifyTenantToken.bind(ServerTenantTokenService);
  const verification = verify(bearerToken);
  if (!verification.valid || !verification.context) {
    throw new AiGatewayError(
      'UNAUTHENTICATED',
      verification.error || 'Authentication token is invalid or expired.',
      401
    );
  }

  const ctx = verification.context;
  const principal = createVerifiedTenantPrincipal(verification);
  const headerInstanceId = typeof req.headers['x-application-instance-id'] === 'string'
    ? req.headers['x-application-instance-id'].trim()
    : '';

  if (ctx.role === PLATFORM_ADMIN_ROLE) {
    let platformAdministratorAllowed = false;
    try {
      platformAdministratorAllowed = Boolean(
        isPlatformAdminTokenContext(ctx) &&
        (deps.platformAdministratorAllowed || isPlatformAdminEmail)(ctx.email || '')
      );
    } catch {
      platformAdministratorAllowed = false;
    }
    if (!platformAdministratorAllowed) {
      throw new AiGatewayError('FORBIDDEN', 'Platform administrator authorization is required.', 403);
    }
    return {
      callerType: internalServiceVerified ? 'internal_service' : 'platform_admin',
      userId: ctx.userId || ctx.email || 'platform_admin',
      email: ctx.email || 'platform_admin',
      role: PLATFORM_ADMIN_ROLE,
      tenantId: null,
      applicationInstanceId: headerInstanceId || null,
      verifiedPrincipal: principal,
      permissions: ['*']
    };
  }

  if (!UUID.test(ctx.tenantId)) {
    throw new AiGatewayError(
      'TENANT_ISOLATION_VIOLATION',
      'Token lacks a valid verified tenant identity.',
      403
    );
  }

  if (!ctx.userId || !UUID.test(ctx.userId) || !ctx.sessionId || !UUID.test(ctx.sessionId)) {
    throw new AiGatewayError('FORBIDDEN', 'A valid tenant user session is required.', 403);
  }
  let authRepo: AuthorizationSource;
  if (deps.authorization) {
    authRepo = deps.authorization;
  } else if (deps.poolConfigured && deps.pool) {
    authRepo = new AuthorizationRepository(deps.pool);
  } else {
    throw new AiGatewayError('AUTHORIZATION_UNAVAILABLE', 'Database authorization is unavailable.', 503);
  }
  let dbAuth;
  try {
    dbAuth = await authRepo.authorize(principal, ctx.userId, ctx.sessionId);
  } catch {
    throw new AiGatewayError('AUTHORIZATION_UNAVAILABLE', 'Database authorization is unavailable.', 503);
  }
  if (dbAuth.ok === false) {
    throw new AiGatewayError(
      'FORBIDDEN',
      dbAuth.reason === 'SESSION_REVOKED'
        ? 'Your session is no longer active.'
        : dbAuth.reason === 'MEMBERSHIP_INACTIVE'
          ? 'Tenant membership is not active.'
          : 'The tenant identity is inconsistent.',
      403,
      { reason: dbAuth.reason }
    );
  }
  const grantedPermissions: string[] = [
    ...new Set<string>(dbAuth.principal.grants
      .filter(grant => grant.scopes.length === 0)
      .flatMap(grant => grant.permissions))
  ];
  return {
    callerType: internalServiceVerified ? 'internal_service' : 'tenant_user',
    userId: ctx.userId,
    email: ctx.email || ctx.userId,
    role: dbAuth.principal.roles[0] || 'unauthorized',
    tenantId: principal.tenantId,
    applicationInstanceId: headerInstanceId || null,
    verifiedPrincipal: principal,
    authorizedPrincipal: dbAuth.principal,
    permissions: grantedPermissions
  };
}

/**
 * Enforces tenant isolation, permission checks, and tenant AI entitlements/quotas.
 */
export async function enforceAiAuthorizationAndEntitlement(input: {
  caller: AuthenticatedAiCaller;
  applicationId: AiApplicationId;
  policy: AiCapabilityPolicy;
  requestedTenantId?: string;
  headerTenantId?: string;
  requestedApplicationInstanceId?: string;
  store: AiGatewayPersistenceStore;
  entitlementMode?: 'strict' | 'decoupled';
  correlationId: string;
}): Promise<{ effectiveTenantId: string | null; dailyLimit: number; maxConcurrency: number }> {
  const { caller, policy, requestedTenantId, headerTenantId } = input;
  const isPlatformAdmin = caller.role === PLATFORM_ADMIN_ROLE;

  if (isPlatformAdmin && !policy.allowPlatformAdminOverride) {
    throw new AiGatewayError(
      'FORBIDDEN',
      `Platform administrators may not override authorization for '${policy.capability}'.`,
      403
    );
  }

  // Cross-tenant impersonation checks (payload or header tenantId must match token tenantId)
  const suppliedTenantCandidates = [requestedTenantId, headerTenantId].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );

  for (const suppliedTenant of suppliedTenantCandidates) {
    if (!isPlatformAdmin && (!caller.tenantId || caller.tenantId.toLowerCase() !== suppliedTenant.trim().toLowerCase())) {
      TenantSecurityContextManager.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: caller.tenantId || 'UNKNOWN',
        targetTenantId: suppliedTenant,
        actorIp: 'ai-gateway',
        endpoint: `/api/ai/v1/${policy.capability}`,
        payloadSummary: `Cross-tenant AI Gateway access blocked for capability ${policy.capability}`,
        severity: 'CRITICAL',
        blocked: true
      });
      await input.store.recordAudit({
        correlationId: input.correlationId,
        tenantId: caller.tenantId,
        applicationInstanceId: caller.applicationInstanceId,
        applicationId: input.applicationId,
        capability: policy.capability,
        actorUserId: caller.userId,
        actorRole: caller.role,
        decision: 'denied',
        reasonCode: 'TENANT_ISOLATION_VIOLATION',
        details: { attemptedTenantId: suppliedTenant },
        principal: caller.verifiedPrincipal
      });
      throw new AiGatewayError(
        'TENANT_ISOLATION_VIOLATION',
        `Cross-tenant access violation: caller tenant '${caller.tenantId}' cannot access AI context for tenant '${suppliedTenant}'.`,
        403
      );
    }
  }

  const effectiveTenantId = isPlatformAdmin
    ? (requestedTenantId || caller.tenantId)
    : caller.tenantId;

  if (policy.requiresTenantContext && !effectiveTenantId) {
    throw new AiGatewayError(
      'TENANT_ISOLATION_VIOLATION',
      `Capability '${policy.capability}' requires a verified school tenant identity.`,
      403
    );
  }

  if (input.applicationId === 'PROVISIONING_AGENT' && !isPlatformAdmin) {
    throw new AiGatewayError(
      'FORBIDDEN',
      'Provisioning agent AI capabilities require platform administrator authorization.',
      403
    );
  }

  if (policy.capability === 'TEXTBOOK_GENERATION' && !isPlatformAdmin) {
    throw new AiGatewayError(
      'FORBIDDEN',
      'Central authoritative textbook generation requires platform editorial administrator identity.',
      403
    );
  }

  // Tenant permission checks are resolved from the current database principal.
  if (!isPlatformAdmin && policy.requiredPermissions.length > 0) {
    const applicationInstanceId = input.requestedApplicationInstanceId || caller.applicationInstanceId;
    const missing = policy.requiredPermissions.filter(permission => {
      if (caller.authorizedPrincipal?.hasPermission(permission)) return false;
      return !applicationInstanceId || !caller.authorizedPrincipal?.hasPermissionFor(
        permission,
        'application_instance',
        applicationInstanceId
      );
    });
    if (missing.length > 0) {
      await input.store.recordAudit({
        correlationId: input.correlationId,
        tenantId: effectiveTenantId,
        applicationInstanceId: caller.applicationInstanceId,
        applicationId: input.applicationId,
        capability: policy.capability,
        actorUserId: caller.userId,
        actorRole: caller.role,
        decision: 'denied',
        reasonCode: 'PERMISSION_DENIED',
        details: { missingPermissions: missing },
        principal: caller.verifiedPrincipal
      });
      throw new AiGatewayError(
        'FORBIDDEN',
        `Missing required permissions for AI capability '${policy.capability}': ${missing.join(', ')}.`,
        403,
        { missingPermissions: missing }
      );
    }
  }

  // School entitlement & daily quota check
  let dailyLimit = 500;
  let maxConcurrency = policy.maxConcurrency;
  if (policy.requiresEntitlementCheck && effectiveTenantId && !isPlatformAdmin) {
    const mode = input.entitlementMode ?? resolveAiEntitlementMode();
    const entitlement = await input.store.getTenantEntitlement(
      caller.verifiedPrincipal,
      effectiveTenantId,
      input.applicationId,
      input.requestedApplicationInstanceId || caller.applicationInstanceId
    );
    if (!entitlement) {
      if (mode === 'strict') {
        await input.store.recordAudit({
          correlationId: input.correlationId,
          tenantId: effectiveTenantId,
          applicationInstanceId: caller.applicationInstanceId,
          applicationId: input.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'denied',
          reasonCode: 'ENTITLEMENT_DENIED',
          principal: caller.verifiedPrincipal
        });
        throw new AiGatewayError(
          'ENTITLEMENT_DENIED',
          `Tenant '${effectiveTenantId}' does not have an active AI entitlement for '${input.applicationId}'.`,
          403
        );
      }
    } else {
      if (entitlement.status !== 'active' || new Date(entitlement.expiresAt).getTime() <= Date.now()) {
        await input.store.recordAudit({
          correlationId: input.correlationId,
          tenantId: effectiveTenantId,
          applicationInstanceId: entitlement.applicationInstanceId,
          applicationId: input.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'denied',
          reasonCode: 'ENTITLEMENT_DENIED',
          details: { entitlementStatus: entitlement.status, expiresAt: entitlement.expiresAt },
          principal: caller.verifiedPrincipal
        });
        throw new AiGatewayError(
          'ENTITLEMENT_DENIED',
          `Tenant AI entitlement is ${entitlement.status} or expired.`,
          403
        );
      }
      if (!entitlement.allowedCapabilities.includes(policy.capability)) {
        await input.store.recordAudit({
          correlationId: input.correlationId,
          tenantId: effectiveTenantId,
          applicationInstanceId: entitlement.applicationInstanceId,
          applicationId: input.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'denied',
          reasonCode: 'ENTITLEMENT_DENIED',
          details: { entitlementId: entitlement.id },
          principal: caller.verifiedPrincipal
        });
        throw new AiGatewayError(
          'ENTITLEMENT_DENIED',
          `Tenant AI entitlement does not permit capability '${policy.capability}'.`,
          403
        );
      }
      dailyLimit = entitlement.dailyRequestLimit;
      maxConcurrency = Math.min(maxConcurrency, entitlement.maxConcurrentRequests);

      const usedToday = await input.store.countTenantRequestsToday(caller.verifiedPrincipal, effectiveTenantId);
      if (usedToday >= dailyLimit) {
        await input.store.recordAudit({
          correlationId: input.correlationId,
          tenantId: effectiveTenantId,
          applicationInstanceId: entitlement.applicationInstanceId,
          applicationId: input.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'quota_exceeded',
          reasonCode: 'QUOTA_EXCEEDED',
          details: { usedToday, dailyLimit },
          principal: caller.verifiedPrincipal
        });
        throw new AiGatewayError(
          'QUOTA_EXCEEDED',
          `Daily AI request quota (${dailyLimit}) reached for tenant '${effectiveTenantId}'.`,
          429,
          { usedToday, dailyLimit }
        );
      }

      const usedThisMonth = await input.store.countTenantRequestsThisMonth(
        caller.verifiedPrincipal,
        effectiveTenantId
      );
      if (usedThisMonth >= entitlement.monthlyRequestLimit) {
        await input.store.recordAudit({
          correlationId: input.correlationId,
          tenantId: effectiveTenantId,
          applicationInstanceId: entitlement.applicationInstanceId,
          applicationId: input.applicationId,
          capability: policy.capability,
          actorUserId: caller.userId,
          actorRole: caller.role,
          decision: 'quota_exceeded',
          reasonCode: 'QUOTA_EXCEEDED',
          details: {
            usedThisMonth,
            monthlyRequestLimit: entitlement.monthlyRequestLimit
          },
          principal: caller.verifiedPrincipal
        });
        throw new AiGatewayError(
          'QUOTA_EXCEEDED',
          `Monthly AI request quota (${entitlement.monthlyRequestLimit}) reached for tenant '${effectiveTenantId}'.`,
          429,
          { usedThisMonth, monthlyRequestLimit: entitlement.monthlyRequestLimit }
        );
      }
    }
  }

  return { effectiveTenantId, dailyLimit, maxConcurrency };
}
