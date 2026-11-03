/**
 * Phase 9: Instance Lifecycle, Monitoring, Versioning, and Architecture Migration Types
 * Strictly conforms to docs/architecture/UNIFIED_BACKEND_CONNECTIVITY_CONTRACT.md
 */

export type GovernedLifecycleState = 
  | 'requested'
  | 'pending_approval'
  | 'approved'
  | 'provisioning'
  | 'provisioning_failed'
  | 'active'
  | 'degraded'
  | 'suspended'
  | 'migration_pending'
  | 'migrating'
  | 'archived'
  | 'decommissioning'
  | 'decommissioned';

export type ArchitectureDeploymentTier = 
  | 'shared_infrastructure'
  | 'dedicated_cloud_run_service'
  | 'dedicated_gcp_project'
  | 'multiple_service_deployments';

export interface VersionManifest {
  applicationVersion: string; // e.g. "v3.2.0"
  deploymentVersion: string;  // e.g. "dep_2026_03_01_01"
  databaseSchemaVersion: string; // e.g. "pg_schema_v14_2"
  architectureProfileVersion: number; // e.g. 2
  featureVersion: string; // e.g. "feat_v2.4"
  releaseDate: string;
  changelogNotes: string;
  previousVersion?: {
    applicationVersion: string;
    databaseSchemaVersion: string;
    architectureProfileVersion: number;
    snapshotId: string;
  };
}

export interface InstanceResourceAllocation {
  cpuCores: number;
  memoryGiB: number;
  minInstances: number;
  maxInstances: number;
  cloudRunServiceUrl?: string;
  cloudRunRegion: string;
  databaseConnectionsLimit: number;
  storageQuotaGb: number;
  currentStorageUsedGb: number;
}

export interface InstanceMonitoringTelemetry {
  instanceId: string;
  timestamp: string;
  applicationHealth: 'healthy' | 'degraded' | 'critical' | 'offline';
  uptimePercentage: number;
  averageLatencyMs: number;
  cloudRunHealth: {
    status: 'healthy' | 'throttling' | 'scaling_error' | 'idle';
    cpuUtilizationPercent: number;
    memoryUtilizationPercent: number;
    activeContainerCount: number;
  };
  databaseAvailability: {
    engine: string;
    status: 'online' | 'degraded' | 'read_only' | 'offline';
    connectionPoolUtilizationPercent: number;
    activeConnections: number;
    queryLatencyMs: number;
  };
  storageConnectivity: {
    provider: string;
    status: 'connected' | 'rate_limited' | 'disconnected';
    bandwidthUsageMbps: number;
    readLatencyMs: number;
  };
  apiAvailability: {
    httpSuccessRatePercent: number;
    requestsPerMinute: number;
    p95ResponseTimeMs: number;
    active5xxErrors: number;
  };
  recentSecurityEventsCount: number;
  provisioningFailuresCount: number;
}

export interface ArchitectureMigrationJob {
  migrationId: string;
  instanceId: string;
  tenantId: string;
  customerName: string;
  sourceTier: ArchitectureDeploymentTier;
  targetTier: ArchitectureDeploymentTier;
  status: 'planned' | 'preflight_passed' | 'backup_created' | 'migrating' | 'cutover_complete' | 'verified' | 'rolled_back' | 'failed';
  preflightChecks: {
    instanceIdentityPreserved: boolean;
    customerIdentityPreserved: boolean;
    userAccountsValidated: boolean;
    operationalDataChecksumVerified: boolean;
    domainSslTransferred: boolean;
    storageReferencesIntact: boolean;
    auditHistoryContinuous: boolean;
    subscriptionHistoryPreserved: boolean;
  };
  backupSnapshotId: string;
  backupChecksumSha256: string;
  targetCloudRunUrl?: string;
  targetDatabaseShardId?: string;
  targetStorageBucket?: string;
  scheduledCutoverTime: string;
  startedAt?: string;
  completedAt?: string;
  rollbackReason?: string;
  logs: string[];
}

export interface CustomerSelfServiceRequest {
  requestId: string;
  instanceId: string;
  tenantId: string;
  requestType: 
    | 'feature_upgrade'
    | 'architecture_migration'
    | 'storage_connection_change'
    | 'integration_addition'
    | 'domain_change'
    | 'data_export_backup';
  title: string;
  description: string;
  requestedParameters: Record<string, any>;
  status: 'pending' | 'reviewing' | 'approved' | 'executing' | 'fulfilled' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  resolvedAt?: string;
  reviewerNotes?: string;
  resultPayload?: Record<string, any>;
}

export interface GovernedInstanceRecord {
  instanceId: string;
  tenantId: string;
  organizationName: string;
  subdomain: string;
  customDomain?: string;
  lifecycleState: GovernedLifecycleState;
  deploymentTier: ArchitectureDeploymentTier;
  versionManifest: VersionManifest;
  resources: InstanceResourceAllocation;
  monitoring: InstanceMonitoringTelemetry;
  databaseShardId: string;
  storageStrategy: string;
  storageProvider: string;
  billingModel: 'monthly' | 'yearly' | 'lease_to_own';
  monthlyPriceNGN: number;
  activeStudents: number;
  createdAt: string;
  updatedAt: string;
  lastStateTransitionAt: string;
  stateTransitionReason?: string;
  previousLifecycleState?: GovernedLifecycleState;
  activeMigrationId?: string;
  history: {
    timestamp: string;
    fromState: GovernedLifecycleState;
    toState: GovernedLifecycleState;
    actor: string;
    reason: string;
  }[];
}
