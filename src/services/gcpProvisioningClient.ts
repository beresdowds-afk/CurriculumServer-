import { 
  ProvisioningJob, 
  ProvisioningResourceRecord, 
  GCPResourceType 
} from '../types/gcpProvisioning';

const INITIAL_JOBS: ProvisioningJob[] = [
  {
    jobId: 'job_prov_001',
    instanceId: 'inst_reg_001',
    profileVersion: 1,
    adaptersToExecute: [
      'gcp_project',
      'postgresql_database',
      'cloud_run_service',
      'cloud_storage_bucket',
      'secret_manager_secret',
      'dns_managed_zone',
      'ssl_certificate'
    ],
    state: 'verified',
    startTime: '2025-02-10T08:05:00Z',
    completionTime: '2025-02-10T08:06:45Z',
    retryCount: 0,
    resourceIdentifiers: {
      projectId: 'curriculum-tenant-apex-ng',
      cloudRunService: 'srv-curriculum-apex-prod',
      database: 'apex_db',
      bucket: 'apex-storage-vault-euw2',
      secret: 'apex-vault-encryption-key',
      dnsZone: 'apexcollege-sch-ng',
      certificate: 'cert-apex-ssl-managed'
    },
    verificationStatus: true
  }
];

const INITIAL_RESOURCES: ProvisioningResourceRecord[] = [
  {
    resourceId: 'res_db_001',
    instanceId: 'inst_reg_001',
    resourceType: 'postgresql_database',
    gcpResourceName: 'projects/curriculum-server-prod/instances/postgres-apex-shard-01/databases/apex_db',
    region: 'europe-west2',
    ownerCustomerId: 'cust_apex_college',
    tags: { environment: 'production', tier: 'pro', app: 'curriculum-flow' },
    costAttributionLabel: 'cost-center-apex-college',
    deploymentVersion: 'v2.4.0',
    healthStatus: 'healthy',
    verified: true,
    createdAt: '2025-02-10T08:05:30Z',
    updatedAt: '2025-02-10T08:06:00Z'
  },
  {
    resourceId: 'res_run_001',
    instanceId: 'inst_reg_001',
    resourceType: 'cloud_run_service',
    gcpResourceName: 'projects/curriculum-server-prod/locations/europe-west2/services/srv-curriculum-apex-prod',
    region: 'europe-west2',
    ownerCustomerId: 'cust_apex_college',
    tags: { environment: 'production', tier: 'pro', role: 'flow-runtime' },
    costAttributionLabel: 'cost-center-apex-college',
    deploymentVersion: 'v2.4.0',
    healthStatus: 'healthy',
    verified: true,
    createdAt: '2025-02-10T08:05:45Z',
    updatedAt: '2025-02-10T08:06:20Z'
  }
];

export class GCPProvisioningClient {
  private static instance: GCPProvisioningClient;
  private jobs: ProvisioningJob[] = [...INITIAL_JOBS];
  private resources: ProvisioningResourceRecord[] = [...INITIAL_RESOURCES];

  private constructor() {
    this.syncFromBackend();
  }

  public static getInstance(): GCPProvisioningClient {
    if (!GCPProvisioningClient.instance) {
      GCPProvisioningClient.instance = new GCPProvisioningClient();
    }
    return GCPProvisioningClient.instance;
  }

  public async syncFromBackend(): Promise<void> {
    try {
      const res = await fetch('/api/v1/server/infrastructure/jobs');
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.jobs = json.data;
        }
      }
    } catch {
      // Offline or local dev fallback
    }
  }

  public getJobs(): ProvisioningJob[] {
    return this.jobs;
  }

  public getResources(): ProvisioningResourceRecord[] {
    return this.resources;
  }

  public async executeProvisioningOrchestration(
    instanceId: string, 
    profileVersion: number, 
    adapters: GCPResourceType[], 
    customerId: string
  ): Promise<ProvisioningJob> {
    const randomHex = Math.random().toString(16).substring(2, 8);
    const jobId = `job_${Date.now()}_${randomHex}`;
    const newJob: ProvisioningJob = {
      jobId,
      instanceId,
      profileVersion,
      adaptersToExecute: adapters,
      state: 'running',
      startTime: new Date().toISOString(),
      retryCount: 0,
      resourceIdentifiers: {},
      verificationStatus: false
    };

    this.jobs.unshift(newJob);

    // Simulate async verified completion
    await new Promise(resolve => setTimeout(resolve, 800));

    newJob.state = 'verified';
    newJob.completionTime = new Date().toISOString();
    newJob.verificationStatus = true;
    newJob.resourceIdentifiers = {
      projectId: `curriculum-tenant-${instanceId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      cloudRunService: `srv-${instanceId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-europe-west2`,
      database: `db_${instanceId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_prod`,
      storageBucket: `bucket-${instanceId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-vault`
    };

    this.resources.push({
      resourceId: `res_${Date.now()}_${randomHex}`,
      instanceId,
      resourceType: 'postgresql_database',
      gcpResourceName: `projects/prod/instances/db-shard/databases/${instanceId}_db`,
      region: 'europe-west2',
      ownerCustomerId: customerId,
      tags: { environment: 'production', managedBy: 'iiap-engine' },
      costAttributionLabel: `cost-${customerId}`,
      deploymentVersion: 'v2.4.0',
      healthStatus: 'healthy',
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return newJob;
  }

  public decommissionResource(resourceId: string, _decommissionToken: string): void {
    this.resources = this.resources.filter(r => r.resourceId !== resourceId);
  }
}

export const gcpProvisioningClient = GCPProvisioningClient.getInstance();
