import { TenantSchoolApp, OptionalFeatureKey, FeatureEntitlementState } from '../types';

export interface TenantStoragePathInfo {
  tenantId: string;
  baseStorageDirectory: string;
  lessonNotesBucket: string;
  examVaultBucket: string;
  studentRecordsBucket: string;
  bursaryInvoicesBucket: string;
}

export interface TenantDatabaseCredentials {
  tenantId: string;
  available: false;
  reason: 'DATABASE_CONFIGURATION_UNAVAILABLE';
}

export class TenantIsolationService {
  /**
   * Resolves storage isolation path for any given tenant.
   * Path traversal (e.g. '../') is strictly sanitized and blocked.
   */
  static getStorageNamespace(tenantId: string): TenantStoragePathInfo {
    const cleanTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
    const base = `/storage/tenants/${cleanTenantId}`;
    return {
      tenantId: cleanTenantId,
      baseStorageDirectory: base,
      lessonNotesBucket: `${base}/lesson-notes`,
      examVaultBucket: `${base}/exam-vault`,
      studentRecordsBucket: `${base}/student-records`,
      bursaryInvoicesBucket: `${base}/bursary-invoices`
    };
  }

  /** Does not invent tenant-specific database endpoints before a provider is configured. */
  static getDatabaseDescriptor(tenant: TenantSchoolApp): TenantDatabaseCredentials {
    return {
      tenantId: tenant.id,
      available: false,
      reason: 'DATABASE_CONFIGURATION_UNAVAILABLE'
    };
  }

  /**
   * Verifies if a specific tenant has the entitlement to execute a feature.
   * Enforces server-side feature flag checks.
   */
  static isFeatureEntitled(tenant: TenantSchoolApp, featureKey: OptionalFeatureKey): boolean {
    if (!tenant.enabledFeatures) return false;
    return Boolean(tenant.enabledFeatures[featureKey]);
  }

  /**
   * Evaluates if a request from tenantA attempting to access targetTenantId is legal.
   */
  static validateTenantContext(requestTenantId: string, targetTenantId: string): boolean {
    if (!requestTenantId || !targetTenantId) return false;
    return requestTenantId.trim().toLowerCase() === targetTenantId.trim().toLowerCase();
  }
}
