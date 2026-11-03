import { 
  GovernedInstanceRecord, 
  GovernedLifecycleState, 
  ArchitectureDeploymentTier, 
  VersionManifest, 
  InstanceMonitoringTelemetry, 
  ArchitectureMigrationJob, 
  CustomerSelfServiceRequest 
} from '../types/instanceLifecycle';
import { unifiedApiClient } from './unifiedApiClient';

export class InstanceLifecycleClient {
  private static instance: InstanceLifecycleClient;

  public static getInstance(): InstanceLifecycleClient {
    if (!InstanceLifecycleClient.instance) {
      InstanceLifecycleClient.instance = new InstanceLifecycleClient();
    }
    return InstanceLifecycleClient.instance;
  }

  public async getGovernedInstances(): Promise<GovernedInstanceRecord[]> {
    const res = await unifiedApiClient.get<GovernedInstanceRecord[]>('/api/v1/server/instances/governed');
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch governed instances');
    }
    return res.data;
  }

  public async getGovernedInstance(instanceId: string): Promise<GovernedInstanceRecord> {
    const res = await unifiedApiClient.get<GovernedInstanceRecord>(`/api/v1/server/instances/${instanceId}/governed`);
    if (!res.success || !res.data) {
      throw new Error(res.error || `Failed to fetch instance ${instanceId}`);
    }
    return res.data;
  }

  public async transitionLifecycleState(
    instanceId: string, 
    toState: GovernedLifecycleState, 
    reason: string
  ): Promise<GovernedInstanceRecord> {
    const res = await unifiedApiClient.post<GovernedInstanceRecord>(
      `/api/v1/server/instances/${instanceId}/lifecycle/transition`,
      { toState, reason }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || `Failed to transition state to ${toState}`);
    }
    return res.data;
  }

  public async upgradeVersion(
    instanceId: string, 
    updates: {
      applicationVersion?: string;
      databaseSchemaVersion?: string;
      architectureProfileVersion?: number;
      featureVersion?: string;
      changelogNotes: string;
    }
  ): Promise<GovernedInstanceRecord> {
    const res = await unifiedApiClient.post<GovernedInstanceRecord>(
      `/api/v1/server/instances/${instanceId}/versions/upgrade`,
      updates
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to deploy version upgrade');
    }
    return res.data;
  }

  public async rollbackVersion(instanceId: string): Promise<GovernedInstanceRecord> {
    const res = await unifiedApiClient.post<GovernedInstanceRecord>(
      `/api/v1/server/instances/${instanceId}/versions/rollback`,
      {}
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to execute version rollback');
    }
    return res.data;
  }

  public async planMigration(
    instanceId: string, 
    targetTier: ArchitectureDeploymentTier
  ): Promise<ArchitectureMigrationJob> {
    const res = await unifiedApiClient.post<ArchitectureMigrationJob>(
      `/api/v1/server/instances/${instanceId}/migration/plan`,
      { targetTier }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to plan architecture migration');
    }
    return res.data;
  }

  public async executeMigration(migrationId: string): Promise<ArchitectureMigrationJob> {
    const res = await unifiedApiClient.post<ArchitectureMigrationJob>(
      `/api/v1/server/instances/${migrationId}/migration/execute`,
      {}
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to execute architecture migration cutover');
    }
    return res.data;
  }

  public async rollbackMigration(migrationId: string, reason: string): Promise<ArchitectureMigrationJob> {
    const res = await unifiedApiClient.post<ArchitectureMigrationJob>(
      `/api/v1/server/instances/${migrationId}/migration/rollback`,
      { reason }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to roll back architecture migration');
    }
    return res.data;
  }

  public async getMonitoringTelemetry(instanceId: string): Promise<InstanceMonitoringTelemetry> {
    const res = await unifiedApiClient.get<InstanceMonitoringTelemetry>(
      `/api/v1/server/instances/${instanceId}/monitoring`
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch monitoring telemetry');
    }
    return res.data;
  }

  public async submitCustomerRequest(payload: {
    instanceId: string;
    requestType: CustomerSelfServiceRequest['requestType'];
    title: string;
    description: string;
    requestedParameters?: Record<string, any>;
  }): Promise<CustomerSelfServiceRequest> {
    const res = await unifiedApiClient.post<CustomerSelfServiceRequest>(
      '/api/v1/flow/customer/self-service/request',
      payload
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to submit customer self-service request');
    }
    return res.data;
  }

  public async getCustomerRequests(instanceId?: string): Promise<CustomerSelfServiceRequest[]> {
    const query = instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : '';
    const res = await unifiedApiClient.get<CustomerSelfServiceRequest[]>(
      `/api/v1/flow/customer/self-service/requests${query}`
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch customer self-service requests');
    }
    return res.data;
  }

  public async resolveCustomerRequest(
    requestId: string, 
    approved: boolean, 
    reviewerNotes: string
  ): Promise<CustomerSelfServiceRequest> {
    const res = await unifiedApiClient.post<CustomerSelfServiceRequest>(
      `/api/v1/server/customer/self-service/requests/${requestId}/resolve`,
      { approved, reviewerNotes }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to resolve customer request');
    }
    return res.data;
  }
}

export const instanceLifecycleClient = InstanceLifecycleClient.getInstance();
