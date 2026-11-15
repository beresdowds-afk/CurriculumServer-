export type DatabaseIsolationStrategy = 
  | 'shared_schema_isolated'
  | 'dedicated_database'
  | 'dedicated_customer_gcp_project';

export interface DatabaseInstanceRecord {
  databaseId: string;
  instanceId: string;
  tenantId: string;
  schoolName: string;
  strategy: DatabaseIsolationStrategy;
  engine: 'PostgreSQL 16 LTS' | 'PostgreSQL 15 LTS';
  host: string;
  port: number;
  databaseName: string;
  schemaName: string;
  connectionPoolSize: number;
  maxConnections: number;
  sslMode: 'require' | 'verify-full';
  encryptionAtRest: 'Google-Managed' | 'CMEK (Customer-Managed Encryption Keys)';
  isolationLevel: 'schema_namespace_isolation' | 'rls_policy_isolation' | 'hardware_project_isolation';
  activeConnections: number;
  storageUsageMb: number;
  storageLimitMb: number;
  healthStatus: 'healthy' | 'warning' | 'degraded' | 'unknown';
  reportedHealthStatus?: 'healthy' | 'warning' | 'degraded';
  backupSchedule: string;
  lastBackupTimestamp: string;
  verifiedAt: string;
  createdAt: string;
  evidenceStatus: 'unverified_fixture' | 'provider_verified';
}

export type StorageStrategyType = 'private_drive' | 'platform_storage' | 'hybrid';

export type StorageProviderType = 
  | 'google_drive' 
  | 'onedrive' 
  | 'dropbox' 
  | 'google_cloud_storage'
  | 'hybrid';

export type StorageContentCategory = 
  | 'sensitive_transcripts_legal'
  | 'financial_bursary_receipts'
  | 'student_cbt_recordings'
  | 'general_learning_media'
  | 'system_backups';

export interface StoragePlacementRule {
  id: string;
  category: StorageContentCategory;
  categoryLabel: string;
  targetProvider: 'private_drive' | 'platform_storage';
  encryptionRequired: boolean;
  retentionDays: number;
}

export interface StorageConfigRecord {
  configId: string;
  instanceId: string;
  tenantId: string;
  schoolName: string;
  strategy: StorageStrategyType;
  primaryProvider: StorageProviderType;
  secondaryProvider?: StorageProviderType;
  resourceIdentifier: string; // Folder ID or GCS Bucket Name
  resourceName: string;
  accessConfigRef?: string; // Server-only encrypted token reference
  oauthConnectedEmail?: string;
  oauthScopes?: string[];
  quotaGb: number;
  usedStorageGb: number;
  retentionPolicyDays: number;
  connectionHealth: 'healthy' | 'token_refresh_required' | 'quota_warning' | 'disconnected' | 'unknown';
  reportedConnectionHealth?: 'healthy' | 'token_refresh_required' | 'quota_warning' | 'disconnected';
  provisioningState: 'provisioned' | 'pending_auth' | 'verifying' | 'failed' | 'unverified';
  reportedProvisioningState?: 'provisioned' | 'pending_auth' | 'verifying' | 'failed';
  placementRules: StoragePlacementRule[];
  lastSyncTimestamp: string;
  createdAt: string;
  updatedAt: string;
  evidenceStatus: 'unverified_fixture' | 'provider_verified';
}

export interface StorageMigrationJob {
  jobId: string;
  instanceId: string;
  tenantId: string;
  sourceProvider: StorageProviderType;
  targetProvider: StorageProviderType;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  preserveMetadata: boolean;
  preserveAcls: boolean;
  startedAt: string;
  completedAt?: string;
  errorDetails?: string;
}
