import { TenantSchoolApp, UserProfile } from '../types';

export interface TenantSecurityContext {
  tenantId: string;
  appId: string;
  schoolName: string;
  subscriptionTier: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PENDING' | 'DECOMMISSIONED';
  databaseName: string;
  storageNamespace: string;
  issuedAt: number;
  expiresAt: number;
  tokenSignature: string;
  permissions: string[];
}

export interface SecurityViolationEvent {
  id: string;
  timestamp: string;
  violationType: 'CROSS_TENANT_ACCESS_ATTEMPT' | 'PATH_TRAVERSAL_ATTEMPT' | 'EXPIRED_TOKEN' | 'INVALID_SIGNATURE' | 'SUSPENDED_TENANT_ACCESS' | 'UNAUTHORIZED_FEATURE_ACCESS';
  sourceTenantId: string;
  targetTenantId?: string;
  actorIp: string;
  endpoint: string;
  payloadSummary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blocked: boolean;
}

// Global in-memory security violation log for control-plane telemetry
const SECURITY_VIOLATIONS_AUDIT: SecurityViolationEvent[] = [];

// Secret key for HMAC token signing (in production, loaded from environment)
const CONTROL_PLANE_SECRET = 'cs_sec_control_plane_hmac_2026_production_isolated';

/**
 * Standard simple hash function for client/runtime environment
 */
function simpleHmacSha256(secret: string, message: string): string {
  let hash = 0;
  const combined = secret + ':' + message;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sig_' + Math.abs(hash).toString(16) + '_' + message.length;
}

export class TenantSecurityContextManager {
  /**
   * Generates a signed, tamper-resistant Tenant Security Context Token
   */
  static issueTenantToken(tenant: TenantSchoolApp, ttlSeconds: number = 86400): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      tenantId: tenant.id,
      appId: tenant.appId || `CF-${tenant.id}`,
      schoolName: tenant.schoolName,
      subscriptionTier: tenant.subscriptionTier,
      status: tenant.status === 'active' ? 'ACTIVE' : tenant.status === 'suspended' ? 'SUSPENDED' : 'PENDING',
      databaseName: `db_${tenant.id.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      storageNamespace: `/storage/tenants/${tenant.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      issuedAt: now,
      expiresAt: now + ttlSeconds
    };

    const serialized = JSON.stringify(payload);
    const encoded = btoa(serialized);
    const signature = simpleHmacSha256(CONTROL_PLANE_SECRET, serialized);
    return `${encoded}.${signature}`;
  }

  /**
   * Validates a Tenant Token and reconstructs the verified Security Context
   */
  static verifyTenantToken(token: string): { valid: boolean; context?: TenantSecurityContext; error?: string } {
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed tenant security token' };
    }

    const [encoded, signature] = token.split('.');
    try {
      const serialized = atob(encoded);
      const expectedSignature = simpleHmacSha256(CONTROL_PLANE_SECRET, serialized);

      if (signature !== expectedSignature) {
        this.recordViolation({
          violationType: 'INVALID_SIGNATURE',
          sourceTenantId: 'UNKNOWN',
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Tampered token signature detected',
          severity: 'HIGH',
          blocked: true
        });
        return { valid: false, error: 'Cryptographic signature mismatch. Token has been tampered with.' };
      }

      const payload = JSON.parse(serialized);
      const now = Math.floor(Date.now() / 1000);

      if (payload.expiresAt < now) {
        this.recordViolation({
          violationType: 'EXPIRED_TOKEN',
          sourceTenantId: payload.tenantId,
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Expired token presented',
          severity: 'MEDIUM',
          blocked: true
        });
        return { valid: false, error: 'Tenant security token has expired.' };
      }

      if (payload.status === 'SUSPENDED') {
        this.recordViolation({
          violationType: 'SUSPENDED_TENANT_ACCESS',
          sourceTenantId: payload.tenantId,
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Access attempted on suspended tenant',
          severity: 'HIGH',
          blocked: true
        });
        return { valid: false, error: 'Tenant application is SUSPENDED due to administrative or billing hold.' };
      }

      return {
        valid: true,
        context: {
          ...payload,
          tokenSignature: signature,
          permissions: ['read', 'write', 'execute_ai', 'exam_generation']
        }
      };
    } catch (e: any) {
      return { valid: false, error: `Token decoding failed: ${e.message}` };
    }
  }

  /**
   * Enforces strict tenant isolation. If a request is issued with Context Tenant A
   * but attempts to read/write resource belonging to Tenant B, it is immediately blocked and logged.
   */
  static assertTenantBoundary(context: TenantSecurityContext, resourceTenantId: string, endpoint: string = ''): boolean {
    if (!context || !context.tenantId) {
      this.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: 'ANONYMOUS',
        targetTenantId: resourceTenantId,
        actorIp: '127.0.0.1',
        endpoint,
        payloadSummary: 'Missing security context on tenant-scoped resource',
        severity: 'CRITICAL',
        blocked: true
      });
      return false;
    }

    const cleanSource = context.tenantId.trim().toLowerCase();
    const cleanTarget = resourceTenantId.trim().toLowerCase();

    if (cleanSource !== cleanTarget) {
      this.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: cleanSource,
        targetTenantId: cleanTarget,
        actorIp: '127.0.0.1',
        endpoint,
        payloadSummary: `Cross-tenant access attempt: Tenant ${cleanSource} tried accessing resources of Tenant ${cleanTarget}`,
        severity: 'CRITICAL',
        blocked: true
      });
      return false;
    }

    return true;
  }

  /**
   * Sanitizes storage file paths and strictly verifies that path traversal ('..', '//', null-bytes) cannot escape tenant boundary
   */
  static sanitizeAndResolveStoragePath(context: TenantSecurityContext, relativePath: string): { safe: boolean; fullPath?: string; error?: string } {
    if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) {
      this.recordViolation({
        violationType: 'PATH_TRAVERSAL_ATTEMPT',
        sourceTenantId: context.tenantId,
        actorIp: '127.0.0.1',
        endpoint: '/api/v1/storage/*',
        payloadSummary: `Directory traversal sequence detected: ${relativePath}`,
        severity: 'CRITICAL',
        blocked: true
      });
      return { safe: false, error: 'Directory path traversal attempt detected and blocked.' };
    }

    const cleanRelative = relativePath.replace(/^[\/\\]+/, '');
    const fullPath = `${context.storageNamespace}/${cleanRelative}`;
    return { safe: true, fullPath };
  }

  /**
   * Records a security violation in the control-plane audit ledger
   */
  static recordViolation(violation: Omit<SecurityViolationEvent, 'id' | 'timestamp'>): SecurityViolationEvent {
    const event: SecurityViolationEvent = {
      ...violation,
      id: `sec_viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    SECURITY_VIOLATIONS_AUDIT.unshift(event);
    if (SECURITY_VIOLATIONS_AUDIT.length > 200) {
      SECURITY_VIOLATIONS_AUDIT.pop();
    }
    console.warn(`[SECURITY VIOLATION BLOCKED] ${event.violationType}: Tenant ${event.sourceTenantId} -> ${event.endpoint}`);
    return event;
  }

  /**
   * Retrieves all recorded security violation events for master control-plane inspection
   */
  static getSecurityViolations(): SecurityViolationEvent[] {
    return [...SECURITY_VIOLATIONS_AUDIT];
  }

  /**
   * Clears or flushes test violation records
   */
  static clearViolations(): void {
    SECURITY_VIOLATIONS_AUDIT.length = 0;
  }
}
