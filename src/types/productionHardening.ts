/**
 * Phase 10: Production Hardening, Security, and Failure Recovery Types
 * Strictly conforms to docs/architecture/UNIFIED_BACKEND_CONNECTIVITY_CONTRACT.md
 */

export type ReadinessHonestyStatus = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'SIMULATED' | 'UNIMPLEMENTED';

export interface SecurityAuditDimension {
  id: string;
  category: 
    | 'authentication'
    | 'authorization'
    | 'tenant_isolation'
    | 'instance_isolation'
    | 'service_to_service'
    | 'secret_management'
    | 'database_permissions'
    | 'storage_permissions'
    | 'api_security'
    | 'administrative_privileges'
    | 'audit_integrity'
    | 'infrastructure_provisioning';
  name: string;
  description: string;
  complianceLevel: 'ENFORCED' | 'PARTIAL' | 'AUDITED_WARN';
  implementationNotes: string;
  verifiedAt: string;
}

export interface SecurityAuditReport {
  timestamp: string;
  overallStatus: 'SECURE' | 'WARNING' | 'CRITICAL';
  dimensionsAudited: SecurityAuditDimension[];
  zeroClientPrivilegeEscalation: boolean;
  cryptographicStandardVerified: string; // "HMAC-SHA256 & AES-256-GCM"
  hardcodedSecretsDetected: number; // 0
  inMemorySecurityRecordsReplacedWithPostgres: boolean;
  totalChecksPassed: number;
  totalChecks: number;
}

export interface ProvisioningSecurityPolicy {
  requireApprovalGateForCustomArchitecture: boolean;
  leastPrivilegeServiceAccounts: boolean;
  resourceOwnershipValidation: boolean;
  idempotencyEnforced: boolean;
  maxRetryLimit: number;
  rateLimitPerMinute: number;
  tamperEvidentAuditLogging: boolean;
  automatedRollbackOnFailure: boolean;
}

export interface FailureRecoveryDrillResult {
  drillId: string;
  scenario: 
    | 'partial_provisioning_failure'
    | 'idempotent_duplicate_request'
    | 'interrupted_provisioning_job'
    | 'database_connection_failure'
    | 'storage_connection_failure'
    | 'invalid_architecture_profile'
    | 'deployment_version_rollback'
    | 'failed_migration_rollback'
    | 'customer_suspension_isolation'
    | 'instance_restoration_verification';
  name: string;
  passed: boolean;
  recoveryActionTaken: string;
  recoveryDurationMs: number;
  preservationVerified: boolean;
  logs: string[];
}

export interface ProductionReadinessCriterion {
  number: number;
  name: string;
  status: ReadinessHonestyStatus;
  description: string;
  evidenceReference: string;
}

export interface FinalProductionReadinessReport {
  generatedAt: string;
  version: string;
  overallReadinessScorePercent: number;
  summary: string;
  criteria: ProductionReadinessCriterion[];
  breakdown: {
    completedCount: number;
    partiallyCompletedCount: number;
    simulatedCount: number;
    unimplementedCount: number;
  };
}
