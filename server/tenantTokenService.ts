import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TenantSecurityContext } from '../src/services/tenantSecurityContext';
import { isPlatformAdminEmail } from './schoolProvisioning';
import { TENANT_ROLES } from './authorization/permissions';

const TENANT_ROLE_CODES = new Set<string>(Object.values(TENANT_ROLES));
const PLATFORM_TENANT_ID = 'platform-control-plane';
const PLATFORM_TOKEN_TTL_SECONDS = 3600;

export function isPlatformAdminTokenContext(context: TenantSecurityContext): boolean {
  return context.role === 'super_admin' &&
    context.tenantId === 'platform-control-plane' &&
    context.issuer === 'CurriculumServer-ControlPlane' &&
    context.audience === 'platform-control-plane' &&
    typeof context.email === 'string' &&
    context.email.length > 0;
}

function getSigningSecret(): string {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (secret.length < 32 ||
      secret === 'default_insecure_secret' ||
      secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
    throw new Error('Secure tenant token signing is not configured.');
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', getSigningSecret()).update(encodedPayload).digest('hex');
}

export class ServerTenantTokenService {
  static issueTenantToken(
    tenant: { id: string; appId: string; schoolName: string; subscriptionTier: string; status: string },
    role = 'tenant_admin',
    ttlSeconds = 86400,
    email?: string,
    userId?: string,
    sessionId?: string
  ): string {
    if (!TENANT_ROLE_CODES.has(role) || tenant.id === PLATFORM_TENANT_ID) {
      throw new Error('Tenant tokens require a tenant role and tenant identity.');
    }
    if (!Number.isInteger(ttlSeconds) || ttlSeconds > 86400) {
      throw new Error('Tenant token lifetime is invalid.');
    }
    return this.issueToken(tenant, role, ttlSeconds, email, userId, sessionId);
  }

  static issuePlatformAdminToken(email: string, ttlSeconds = PLATFORM_TOKEN_TTL_SECONDS): string {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || !isPlatformAdminEmail(normalizedEmail)) {
      throw new Error('Platform administrator is not allowlisted.');
    }
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > PLATFORM_TOKEN_TTL_SECONDS) {
      throw new Error('Platform token lifetime is invalid.');
    }
    return this.issueToken({
      id: PLATFORM_TENANT_ID,
      appId: 'curriculum-server-control-plane',
      schoolName: 'Curriculum Server Control Plane',
      subscriptionTier: 'platform',
      status: 'active'
    }, 'super_admin', ttlSeconds, normalizedEmail);
  }

  private static issueToken(
    tenant: { id: string; appId: string; schoolName: string; subscriptionTier: string; status: string },
    role: string,
    ttlSeconds: number,
    email?: string,
    userId?: string,
    sessionId?: string
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      tenantId: tenant.id,
      appId: tenant.appId || `CF-${tenant.id}`,
      schoolName: tenant.schoolName,
      subscriptionTier: tenant.subscriptionTier,
      status: tenant.status === 'active' ? 'ACTIVE' : tenant.status === 'suspended' ? 'SUSPENDED' : 'PENDING',
      databaseName: `db_${tenant.id.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      storageNamespace: `/storage/tenants/${tenant.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      issuer: 'CurriculumServer-ControlPlane',
      audience: tenant.id,
      role,
      email,
      userId,
      sessionId,
      issuedAt: now,
      expiresAt: now + ttlSeconds
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${encoded}.${sign(encoded)}`;
  }

  static verifyTenantToken(token: string): {
    valid: boolean;
    context?: TenantSecurityContext;
    error?: string;
  } {
    if (typeof token !== 'string') return { valid: false, error: 'Malformed tenant security token.' };
    const [encoded, suppliedSignature, extra] = token.split('.');
    if (!encoded || !suppliedSignature || extra !== undefined || !/^[a-f0-9]{64}$/i.test(suppliedSignature)) {
      return { valid: false, error: 'Malformed tenant security token.' };
    }

    try {
      const expectedSignature = Buffer.from(sign(encoded), 'hex');
      const supplied = Buffer.from(suppliedSignature, 'hex');
      if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) {
        return { valid: false, error: 'Invalid tenant security token.' };
      }

      const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      if (!payload || typeof payload.tenantId !== 'string' || !payload.tenantId ||
          typeof payload.role !== 'string' ||
          typeof payload.expiresAt !== 'number' || payload.expiresAt <= now) {
        return { valid: false, error: 'Invalid or expired tenant security token.' };
      }
      if (payload.role === 'super_admin') {
        if (payload.tenantId !== PLATFORM_TENANT_ID ||
            payload.issuer !== 'CurriculumServer-ControlPlane' ||
            payload.audience !== PLATFORM_TENANT_ID ||
            typeof payload.email !== 'string' ||
            !Number.isInteger(payload.issuedAt) ||
            payload.issuedAt > now + 60 ||
            payload.expiresAt - payload.issuedAt > PLATFORM_TOKEN_TTL_SECONDS) {
          return { valid: false, error: 'Invalid platform administrator token context.' };
        }
      } else if (!TENANT_ROLE_CODES.has(payload.role) ||
          payload.tenantId === PLATFORM_TENANT_ID ||
          payload.audience !== payload.tenantId ||
          payload.issuer !== 'CurriculumServer-ControlPlane') {
        return { valid: false, error: 'Invalid tenant token role or context.' };
      }
      if (payload.status === 'SUSPENDED') {
        return { valid: false, error: 'Tenant application is suspended.' };
      }

      return {
        valid: true,
        context: {
          ...payload,
          tokenSignature: suppliedSignature,
          permissions: payload.role === 'super_admin'
            ? ['read', 'write', 'super_admin', 'control_plane']
            : ['read', 'write', 'execute_ai', 'exam_generation']
        }
      };
    } catch {
      return { valid: false, error: 'Tenant token verification is unavailable.' };
    }
  }
}
