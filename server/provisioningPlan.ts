import { InstanceArchitectureProfile } from '../src/types/iiapEngine';

export interface ProvisioningExecutionPlan {
  deploymentTarget: InstanceArchitectureProfile['deploymentTarget'];
  operations: string[];
  requiresProjectCreationApproval: boolean;
}

export function createProvisioningExecutionPlan(profile: InstanceArchitectureProfile): ProvisioningExecutionPlan {
  if (profile.deploymentTarget === 'dedicated_gcp_project' && !profile.createProject) {
    throw new Error('PROJECT_CREATION_EXPLICIT_CONSENT_REQUIRED: This architecture requires explicit createProject authorization.');
  }
  if (profile.createProject && profile.deploymentTarget !== 'dedicated_gcp_project') {
    throw new Error('PROJECT_CREATION_TARGET_MISMATCH: Project creation is not valid for this architecture.');
  }
  if (profile.deploymentTarget === 'gke_future_cluster') {
    throw new Error('PROVISIONING_TARGET_UNAVAILABLE: GKE is a future target and has no execution adapter.');
  }

  const operationsByTarget: Record<InstanceArchitectureProfile['deploymentTarget'], string[]> = {
    shared_application_infrastructure: ['shared_tenant_configuration', 'verify_shared_resources'],
    dedicated_cloud_run_service: ['cloud_run_service', 'verify_deployment'],
    dedicated_gcp_project: ['gcp_project', 'project_baseline', 'cloud_run_service', 'verify_deployment'],
    multiple_cloud_run_services: ['multiple_cloud_run_services', 'verify_deployment'],
    container_workloads: ['container_workloads', 'verify_deployment'],
    gke_future_cluster: ['unsupported_gke_cluster']
  };
  const operations = [...operationsByTarget[profile.deploymentTarget]];
  if (profile.databaseStrategy !== 'shared_schema_multitenant') operations.push('database');
  if (profile.storageStrategy !== 'shared_bucket_partition') operations.push('storage');
  if (profile.domainStrategy !== 'subdomain_multitenant') operations.push('domain_configuration', 'certificate_verification');
  if (profile.networkingRequirements.vpcConnector) operations.push('network_configuration');

  return {
    deploymentTarget: profile.deploymentTarget,
    operations,
    requiresProjectCreationApproval: profile.createProject
  };
}

export function getMissingAdapterDescription(plan: ProvisioningExecutionPlan): string {
  return `Required authenticated adapters are not configured: ${plan.operations.join(', ')}.`;
}
