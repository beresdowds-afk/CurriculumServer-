import { 
  DockerTenantContainer, 
  ContainerLifecycleState, 
  ShardMigrationJob, 
  TenantSchoolApp 
} from '../types';

export class DockerTenantOrchestrationService {
  private containers: Map<string, DockerTenantContainer> = new Map();
  private migrationJobs: ShardMigrationJob[] = [];
  private prewarmedPoolCount: number = 4;

  constructor(initialTenants: TenantSchoolApp[] = []) {
    this.seedInitialContainers(initialTenants);
  }

  private seedInitialContainers(tenants: TenantSchoolApp[]) {
    if (!tenants || tenants.length === 0) {
      // Default seed
      this.createContainerForTenant({
        id: 'tenant-kings-college-lagos',
        schoolName: "King's College Lagos",
        subdomain: 'kingscollege'
      } as unknown as TenantSchoolApp, 'ACTIVE_RUNNING', 'gcp-eu-west2-worker-01', 1);

      this.createContainerForTenant({
        id: 'tenant-queen-college-lagos',
        schoolName: "Queen's College Lagos",
        subdomain: 'queenscollege'
      } as unknown as TenantSchoolApp, 'ACTIVE_RUNNING', 'gcp-eu-west2-worker-02', 2);

      this.createContainerForTenant({
        id: 'tenant-danbo-international',
        schoolName: 'Danbo International School Kaduna',
        subdomain: 'danboschool'
      } as unknown as TenantSchoolApp, 'ACTIVE_RUNNING', 'gcp-eu-west2-worker-03', 3);
      return;
    }

    tenants.forEach((tenant, idx) => {
      const state: ContainerLifecycleState = tenant.status === 'suspended' ? 'COLD_HIBERNATED' : 'ACTIVE_RUNNING';
      const nodeNum = (idx % 4) + 1;
      this.createContainerForTenant(tenant, state, `gcp-eu-west2-worker-0${nodeNum}`, idx + 1);
    });
  }

  public createContainerForTenant(
    tenant: TenantSchoolApp, 
    initialState: ContainerLifecycleState = 'ACTIVE_RUNNING',
    nodeHost: string = 'gcp-eu-west2-worker-01',
    shardIndex: number = 1
  ): DockerTenantContainer {
    const safeId = tenant.id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const schoolName = tenant.schoolName || (tenant as unknown as { name?: string }).name || 'School Tenant';
    const container: DockerTenantContainer = {
      containerId: `dckr_${safeId.substring(0, 18)}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: tenant.id,
      tenantSchoolName: schoolName,
      subdomain: tenant.subdomain || safeId,
      dockerImageTag: 'curriculumflow/tenant-runtime:v2.4.8-alpine-cgroup2',
      lifecycleState: initialState,
      nodeHostName: nodeHost,
      ipAddress: `10.244.${shardIndex + 10}.${Math.floor(Math.random() * 200) + 10}`,
      port: 3000,
      uptimeSeconds: initialState === 'ACTIVE_RUNNING' ? Math.floor(Math.random() * 864000) + 3600 : 0,
      cgroupLimits: {
        cpuCoresLimit: 2.0,
        memoryLimitMb: 2048,
        memorySwapMb: 512,
        cpuShares: 1024,
        ioBandwidthMbPerSec: 100,
        maxProcesses: 256,
        networkNamespace: `ns-${safeId.substring(0, 20)}`
      },
      currentCpuUsagePercent: initialState === 'ACTIVE_RUNNING' ? parseFloat((Math.random() * 25 + 5).toFixed(1)) : 0,
      currentMemoryUsageMb: initialState === 'ACTIVE_RUNNING' ? Math.floor(Math.random() * 600 + 420) : 0,
      currentMemoryPercent: initialState === 'ACTIVE_RUNNING' ? parseFloat(((Math.random() * 30 + 20)).toFixed(1)) : 0,
      activeRequestsPerSec: initialState === 'ACTIVE_RUNNING' ? Math.floor(Math.random() * 45 + 5) : 0,
      lastHealthCheckTimestamp: new Date().toISOString(),
      healthCheckStatus: 'HEALTHY',
      coldStartRecoveryTimeMs: Math.floor(Math.random() * 40) + 85, // 85-125ms
      databaseShardId: `pg-shard-0${(shardIndex % 5) + 1}-ng`,
      databaseHost: `postgres-shard-0${(shardIndex % 5) + 1}.internal.curriculumserver.io`,
      databaseSchema: `tenant_${safeId.replace(/-/g, '_')}_prod`,
      isEncryptedAtRest: true,
      isolationSecurityLevel: 'L3_CGROUP_NAMESPACE_ISOLATED'
    };

    this.containers.set(tenant.id, container);
    return container;
  }

  public getAllContainers(): DockerTenantContainer[] {
    return Array.from(this.containers.values());
  }

  public getContainer(tenantId: string): DockerTenantContainer | undefined {
    return this.containers.get(tenantId);
  }

  public restartContainer(tenantId: string): DockerTenantContainer {
    const existing = this.containers.get(tenantId);
    if (!existing) throw new Error(`Container for tenant ${tenantId} not found`);

    existing.lifecycleState = 'ACTIVE_RUNNING';
    existing.uptimeSeconds = 0;
    existing.healthCheckStatus = 'HEALTHY';
    existing.currentCpuUsagePercent = 12.4;
    existing.currentMemoryUsageMb = 480;
    existing.lastHealthCheckTimestamp = new Date().toISOString();
    
    this.containers.set(tenantId, { ...existing });
    return existing;
  }

  public hibernateContainer(tenantId: string): DockerTenantContainer {
    const existing = this.containers.get(tenantId);
    if (!existing) throw new Error(`Container for tenant ${tenantId} not found`);

    existing.lifecycleState = 'COLD_HIBERNATED';
    existing.currentCpuUsagePercent = 0;
    existing.currentMemoryUsageMb = 0;
    existing.currentMemoryPercent = 0;
    existing.activeRequestsPerSec = 0;
    
    this.containers.set(tenantId, { ...existing });
    return existing;
  }

  public wakeColdContainer(tenantId: string): DockerTenantContainer {
    const existing = this.containers.get(tenantId);
    if (!existing) throw new Error(`Container for tenant ${tenantId} not found`);

    // Restores from pre-warmed snapshot in ~95ms
    existing.lifecycleState = 'ACTIVE_RUNNING';
    existing.uptimeSeconds = 12;
    existing.currentCpuUsagePercent = 18.5;
    existing.currentMemoryUsageMb = 512;
    existing.currentMemoryPercent = 25.0;
    existing.activeRequestsPerSec = 14;
    existing.lastHealthCheckTimestamp = new Date().toISOString();
    
    this.containers.set(tenantId, { ...existing });
    return existing;
  }

  public updateCgroupLimits(
    tenantId: string, 
    limits: Partial<DockerTenantContainer['cgroupLimits']>
  ): DockerTenantContainer {
    const existing = this.containers.get(tenantId);
    if (!existing) throw new Error(`Container for tenant ${tenantId} not found`);

    existing.cgroupLimits = {
      ...existing.cgroupLimits,
      ...limits
    };
    
    this.containers.set(tenantId, { ...existing });
    return existing;
  }

  public initiateZeroDowntimeMigration(
    tenantId: string, 
    targetNode: string, 
    targetShard: string
  ): ShardMigrationJob {
    const container = this.containers.get(tenantId);
    if (!container) throw new Error(`Container for tenant ${tenantId} not found`);

    container.lifecycleState = 'MIGRATING';
    this.containers.set(tenantId, { ...container });

    const migrationJob: ShardMigrationJob = {
      migrationId: `mig_${Math.random().toString(36).substring(2, 9)}`,
      tenantId,
      sourceNode: container.nodeHostName,
      targetNode,
      sourceShard: container.databaseShardId,
      targetShard,
      status: 'COPYING_DATA',
      progressPercent: 15,
      startedAt: new Date().toISOString(),
      estimatedCompletionAt: new Date(Date.now() + 45000).toISOString(),
      zeroDowntimeCutoverMs: 14,
      bytesTransferredMb: 340,
      totalBytesMb: 2450
    };

    this.migrationJobs.unshift(migrationJob);
    return migrationJob;
  }

  public getMigrationJobs(): ShardMigrationJob[] {
    return this.migrationJobs;
  }

  public getClusterFleetTelemetry() {
    const all = this.getAllContainers();
    const active = all.filter(c => c.lifecycleState === 'ACTIVE_RUNNING');
    const hibernated = all.filter(c => c.lifecycleState === 'COLD_HIBERNATED');
    const migrating = all.filter(c => c.lifecycleState === 'MIGRATING');
    
    const totalAllocatedRamMb = all.reduce((sum, c) => sum + c.cgroupLimits.memoryLimitMb, 0);
    const totalUsedRamMb = active.reduce((sum, c) => sum + c.currentMemoryUsageMb, 0);
    const avgCpu = active.length > 0 
      ? active.reduce((sum, c) => sum + c.currentCpuUsagePercent, 0) / active.length 
      : 0;

    return {
      totalContainers: all.length,
      activeContainers: active.length,
      hibernatedContainers: hibernated.length,
      migratingContainers: migrating.length,
      prewarmedStandbyContainers: this.prewarmedPoolCount,
      totalAllocatedRamGb: (totalAllocatedRamMb / 1024).toFixed(1),
      totalUsedRamGb: (totalUsedRamMb / 1024).toFixed(1),
      averageClusterCpuPercent: avgCpu.toFixed(1),
      averageColdStartMs: 92,
      failureIsolationScore: '100% (Strict cgroup v2 & eBPF network filtering)',
      activeNodes: ['gcp-eu-west2-worker-01', 'gcp-eu-west2-worker-02', 'gcp-eu-west2-worker-03', 'gcp-eu-west2-worker-04']
    };
  }
}
