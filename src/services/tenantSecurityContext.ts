export interface TenantSecurityContext {
  tenantId: string;
  appId: string;
  schoolName: string;
  subscriptionTier: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PENDING' | 'DECOMMISSIONED';
  databaseName: string;
  storageNamespace: string;
  issuer: string;
  audience: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  tokenSignature: string;
  permissions: string[];
  email?: string;
  userId?: string;
}

export interface SecurityViolationEvent {
  id: string;
  timestamp: string;
  violationType:
    | 'CROSS_TENANT_ACCESS_ATTEMPT'
    | 'PATH_TRAVERSAL_ATTEMPT'
    | 'EXPIRED_TOKEN'
    | 'INVALID_SIGNATURE'
    | 'SUSPENDED_TENANT_ACCESS'
    | 'UNAUTHORIZED_FEATURE_ACCESS'
    | 'HEADER_SPOOFING_ATTEMPT';
  sourceTenantId: string;
  targetTenantId?: string;
  actorIp: string;
  endpoint: string;
  payloadSummary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blocked: boolean;
}

const MEMORY_VIOLATIONS: SecurityViolationEvent[] = [];

export class TenantSecurityContextManager {
  static assertTenantBoundary(
    context: TenantSecurityContext,
    resourceTenantId: string,
    endpoint = ''
  ): boolean {
    if (!context?.tenantId || context.tenantId.trim().toLowerCase() !== resourceTenantId.trim().toLowerCase()) {
      this.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: context?.tenantId || 'ANONYMOUS',
        targetTenantId: resourceTenantId,
        actorIp: '127.0.0.1',
        endpoint,
        payloadSummary: 'Tenant boundary check failed.',
        severity: 'CRITICAL',
        blocked: true
      });
      return false;
    }
    return true;
  }

  static sanitizeAndResolveStoragePath(
    context: TenantSecurityContext,
    relativePath: string
  ): { safe: boolean; fullPath?: string; error?: string } {
    if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) {
      this.recordViolation({
        violationType: 'PATH_TRAVERSAL_ATTEMPT',
        sourceTenantId: context.tenantId,
        actorIp: '127.0.0.1',
        endpoint: '/api/v1/storage/*',
        payloadSummary: 'Unsafe storage path was blocked.',
        severity: 'CRITICAL',
        blocked: true
      });
      return { safe: false, error: 'Directory path traversal attempt detected and blocked.' };
    }
    return {
      safe: true,
      fullPath: `${context.storageNamespace}/${relativePath.replace(/^[\/\\]+/, '')}`
    };
  }

  static recordViolation(
    violation: Omit<SecurityViolationEvent, 'id' | 'timestamp'>
  ): SecurityViolationEvent {
    const event: SecurityViolationEvent = {
      ...violation,
      id: `sec_viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    MEMORY_VIOLATIONS.unshift(event);
    if (MEMORY_VIOLATIONS.length > 500) MEMORY_VIOLATIONS.pop();
    console.warn(`[SECURITY VIOLATION BLOCKED] ${event.violationType}: ${event.sourceTenantId} -> ${event.endpoint}`);
    return event;
  }

  static getSecurityViolations(): SecurityViolationEvent[] {
    return [...MEMORY_VIOLATIONS];
  }

  static clearViolations(): void {
    MEMORY_VIOLATIONS.length = 0;
  }
}
