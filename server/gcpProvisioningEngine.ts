import { 
  ProvisioningJobState, 
  GCPResourceType, 
  ProvisioningResourceRecord, 
  ProvisioningJob 
} from '../src/types/gcpProvisioning';

export type { 
  ProvisioningJobState, 
  GCPResourceType, 
  ProvisioningResourceRecord, 
  ProvisioningJob 
};

export class GCPProvisioningOrchestrationEngine {
  static getJobs(): ProvisioningJob[] {
    throw new Error('PROVISIONING_PERSISTENCE_UNAVAILABLE: Job inventory is not backed by a durable store.');
  }

  static getResources(): ProvisioningResourceRecord[] {
    throw new Error('PROVISIONING_PERSISTENCE_UNAVAILABLE: Resource inventory is not backed by a durable store.');
  }

  static async executeProvisioningOrchestration(
    _instanceId: string,
    _profileVersion: number,
    _adapters: GCPResourceType[],
    _customerId: string
  ): Promise<ProvisioningJob> {
    throw new Error('PROVISIONING_EXECUTION_UNAVAILABLE: No authenticated server-side Cloud Run Job or Workflows adapter is configured.');
  }

  static decommissionResource(_resourceId: string): never {
    throw new Error('DECOMMISSION_UNAVAILABLE: Durable resource inventory and independent PIAM authorization are not configured.');
  }
}
