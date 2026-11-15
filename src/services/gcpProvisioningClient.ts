import {
  ProvisioningJob,
  ProvisioningResourceRecord,
  GCPResourceType
} from '../types/gcpProvisioning';

export class GCPProvisioningClient {
  private static instance: GCPProvisioningClient;
  private jobs: ProvisioningJob[] = [];

  private constructor() {}

  public static getInstance(): GCPProvisioningClient {
    if (!GCPProvisioningClient.instance) {
      GCPProvisioningClient.instance = new GCPProvisioningClient();
    }
    return GCPProvisioningClient.instance;
  }

  public async syncFromBackend(): Promise<void> {
    const response = await fetch('/api/v1/server/infrastructure/jobs');
    if (!response.ok) {
      throw new Error(`Provisioning job inventory unavailable (HTTP ${response.status}).`);
    }

    const result = await response.json();
    if (!Array.isArray(result.data)) {
      throw new Error('Provisioning job inventory returned an invalid response.');
    }

    this.jobs = result.data;
  }

  public getJobs(): ProvisioningJob[] {
    return [...this.jobs];
  }

  public getResources(): ProvisioningResourceRecord[] {
    return [];
  }

  public async executeProvisioningOrchestration(
    _instanceId: string,
    _profileVersion: number,
    _adapters: GCPResourceType[],
    _customerId: string
  ): Promise<ProvisioningJob> {
    throw new Error('Provisioning is unavailable: no authenticated server-side execution adapter is configured.');
  }

  public decommissionResource(_resourceId: string): never {
    throw new Error('Decommissioning is unavailable: independent PIAM authorization and durable resource inventory are not configured.');
  }
}

export const gcpProvisioningClient = GCPProvisioningClient.getInstance();
