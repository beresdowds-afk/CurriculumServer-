import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TenantSchoolApp } from '../src/types';
import type { TenantSecurityContext } from '../src/services/tenantSecurityContext';

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
    tenant: TenantSchoolApp,
    role = 'tenant_admin',
    ttlSeconds = 86400,
    email?: string,
    userId?: string
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
          typeof payload.role !== 'string' || !payload.role ||
          typeof payload.expiresAt !== 'number' || payload.expiresAt <= now) {
        return { valid: false, error: 'Invalid or expired tenant security token.' };
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
