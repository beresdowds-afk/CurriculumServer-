import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AiApplicationId } from '../../packages/shared-types/src/aiGatewayContracts';
import { ServerTenantTokenService } from '../tenantTokenService';
import { hasSecureControlPlaneSecret } from '../schoolProvisioning';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import type { DatabasePool } from '../db/postgres';
import { AuthorizationRepository } from '../authorization/authorizationRepository';
import { PLATFORM_ADMIN_ROLE } from '../authorization/permissions';
import { TenantSecurityContextManager } from '../../src/services/tenantSecurityContext';
import { AiGatewayError, type AiCapabilityPolicy, type AuthenticatedAiCaller } from './types';
import type { AiGatewayPersistenceStore } from './usageMetering';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiEntitlementModeResolver {
  (): 'strict' | 'decoupled';
}

export function resolveAiEntitlementMode(): 'strict' | 'decoupled' {
  if (process.env.AI_ENTITLEMENT_MODE === 'strict') return 'strict';
  if (process.env.AI_ENTITLEMENT_MODE === 'decoupled') return 'decoupled';
  if (process.env.SHARED_SERVICE_ENTITLEMENT_MODE === 'strict') return 'strict';
  return process.env.NODE_ENV === 'production' ? 'strict' : 'decoupled';
}

export interface AuthenticateAiCallerDependencies {
  pool?: DatabasePool;
  poolConfigured: boolean;
  verifyToken?: typeof ServerTenantTokenService.verifyTenantToken;
  signingConfigured?: () => boolean;
  internalServiceKey?: () => string | undefined;
}

/**
 * Authenticates the caller purely from cryptographic Bearer tokens (and optional internal service key).
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

  const internalKeyHeader = req.headers['x-internal-service-key'];
  const expectedInternalKey = deps.internalServiceKey?.() ?? process.env.INTERNAL_SERVICE_KEY;
  let internalServiceVerified = false;
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

  // If PostgreSQL & full session tracking are configured and token holds userId + sessionId, verify active DB membership
  if (deps.poolConfigured && deps.pool && ctx.userId && ctx.sessionId && UUID.test(ctx.userId)) {
    const authRepo = new AuthorizationRepository(deps.pool);
    const dbAuth = await authRepo.authorize(principal, ctx.userId, ctx.sessionId);
    if (dbAuth.ok === false) {
      throw new AiGatewayError(
        'FORBIDDEN',
        dbAuth.reason === 'SESSION_REVOKED'
          ? 'Your session has been revoked.'
          : 'Tenant membership is not active.',
        403,
        { reason: dbAuth.reason }
      );
    }
    const grantedPermissions = [
      ...new Set(dbAuth.principal.grants.flatMap(g => g.permissions))
    ];
    return {
      callerType: internalServiceVerified ? 'internal_service' : 'tenant_user',
      userId: ctx.userId,
      email: ctx.email || ctx.userId,
      role: dbAuth.principal.roles[0] || ctx.role,
      tenantId: principal.tenantId,
      applicationInstanceId: headerInstanceId || null,
      verifiedPrincipal: principal,
      authorizedPrincipal: dbAuth.principal,
      permissions: grantedPermissions
    };
  }

  // Verified signed tenant token fallback when session DB is absent in non-DB/test setups
  const derivedRolePermissions: Record<string, string[]> = {
    tenant_admin: [
      'ai.gateway.read',
      'ai.curriculum.generate',
      'ai.assessments.generate',
      'ai.cbt.generate',
      'ai.tutor.use',
      'question_bank.manage',
      'assessments.manage'
    ],
    staff: [
      'ai.gateway.read',
      'ai.curriculum.generate',
      'ai.assessments.generate',
      'ai.cbt.generate',
      'ai.tutor.use',
      'question_bank.manage'
    ],
    teacher: [
      'ai.gateway.read',
      'ai.curriculum.generate',
      'ai.assessments.generate',
      'ai.cbt.generate',
      'ai.tutor.use',
      'question_bank.manage'
    ],
    exam_officer: [
      'ai.gateway.read',
      'ai.assessments.generate',
      'ai.cbt.generate',
      'question_bank.manage'
    ],
    principal: [
      'ai.gateway.read',
      'ai.curriculum.generate',
      'ai.assessments.generate',
      'ai.cbt.generate',
      'ai.tutor.use',
      'question_bank.manage'
    ],
    read_only: ['ai.gateway.read']
  };

  return {
    callerType: internalServiceVerified ? 'internal_service' : 'tenant_user',
    userId: ctx.userId || ctx.email || `tenant:${ctx.tenantId}`,
    email: ctx.email || `tenant:${ctx.tenantId}`,
    role: ctx.role,
    tenantId: principal.tenantId,
    applicationInstanceId: headerInstanceId || null,
    verifiedPrincipal: principal,
    permissions: derivedRolePermissions[ctx.role] || []
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

  if (input.applicationId === 'PROVISIONING_AGENT' && !isPlatformAdmin && caller.callerType !== 'internal_service') {
    throw new AiGatewayError(
      'FORBIDDEN',
      'Provisioning agent AI capabilities require platform administrator or authorized internal service identity.',
      403
    );
  }

  if (policy.capability === 'TEXTBOOK_GENERATION' && !isPlatformAdmin && caller.callerType !== 'internal_service') {
    throw new AiGatewayError(
      'FORBIDDEN',
      'Central authoritative textbook generation requires platform editorial administrator identity.',
      403
    );
  }

  // Permission check (platform admin passes when allowed or platform-scoped)
  if (!isPlatformAdmin && policy.requiredPermissions.length > 0) {
    const missing = policy.requiredPermissions.filter(perm => !caller.permissions.includes(perm));
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
      if (
        entitlement.allowedCapabilities.length > 0 &&
        !entitlement.allowedCapabilities.includes(policy.capability)
      ) {
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
    }
  }

  return { effectiveTenantId, dailyLimit, maxConcurrency };
}
