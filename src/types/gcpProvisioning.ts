export type ProvisioningJobState = 'pending' | 'running' | 'verified' | 'failed' | 'rolled_back';

export type GCPResourceType = 
  | 'gcp_project'
  | 'cloud_run_service'
  | 'cloud_run_job'
  | 'postgresql_database'
  | 'cloud_storage_bucket'
  | 'secret_manager_secret'
  | 'dns_managed_zone'
  | 'ssl_certificate';

export interface ProvisioningResourceRecord {
  resourceId: string;
  instanceId: string;
  resourceType: GCPResourceType;
  gcpResourceName: string;
  region: string;
  ownerCustomerId: string;
  tags: Record<string, string>;
  costAttributionLabel: string;
  deploymentVersion: string;
  healthStatus: 'healthy' | 'degraded' | 'provisioning' | 'unverified';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisioningStepResult {
  stepId: string;
  resourceType: GCPResourceType;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  resourceIdentifier?: string;
  message: string;
  durationMs: number;
  idempotencyKey: string;
  error?: string;
}

export interface ProvisioningJob {
  jobId: string;
  instanceId: string;
  profileVersion: number;
  adaptersToExecute: GCPResourceType[];
  state: ProvisioningJobState;
  startTime: string;
  completionTime?: string;
  retryCount: number;
  errorInfo?: string;
  resourceIdentifiers: Record<string, string>;
  verificationStatus: boolean;
}
