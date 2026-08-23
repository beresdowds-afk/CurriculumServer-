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
  databaseName: string;
  databaseHost: string;
  databasePort: number;
  databaseUser: string;
  schemaVersion: string;
  maxPoolConnections: number;
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

  /**
   * Generates or fetches dedicated database connection details.
   * The actual connection string is never exposed to browser clients.
   */
  static getDatabaseDescriptor(tenant: TenantSchoolApp): TenantDatabaseCredentials {
    const cleanId = tenant.id.replace(/[^a-zA-Z0-9_]/g, '_');
    return {
      tenantId: tenant.id,
      databaseName: `db_${cleanId}`,
      databaseHost: 'postgres.cluster.internal',
      databasePort: 5432,
      databaseUser: `usr_${cleanId.substring(0, 16)}`,
      schemaVersion: tenant.provisionedFromTemplateVersion || tenant.clonedFromTemplateVersion || 'v1.4.2',
      maxPoolConnections: tenant.subscriptionTier === 'Apex Enterprise' ? 50 : 20
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
