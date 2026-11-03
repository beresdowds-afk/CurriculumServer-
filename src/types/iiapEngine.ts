export type InstanceRequestType = 'full_school_management' | 'custom_architecture' | 'feature_collection';

export type DeploymentTargetOption = 
  | 'shared_application_infrastructure'
  | 'dedicated_cloud_run_service'
  | 'dedicated_gcp_project'
  | 'multiple_cloud_run_services'
  | 'container_workloads'
  | 'gke_future_cluster';

export type ArchitectureLifecycleState = 'draft' | 'system_recommended' | 'customer_requested' | 'admin_approved' | 'provisioned' | 'revised';

export interface InstanceArchitectureProfile {
  profileId: string;
  instanceId: string;
  customerId: string;
  customerName: string;
  instanceType: InstanceRequestType;
  applicationFamily: string;
  enabledApplications: string[];
  enabledFeatures: string[];
  deploymentTarget: DeploymentTargetOption;
  architectureProfileName: string;
  databaseStrategy: 'shared_schema_multitenant' | 'dedicated_postgres_schema' | 'dedicated_cloud_sql_instance' | 'sovereign_spanner_cluster';
  storageStrategy: 'shared_bucket_partition' | 'dedicated_regional_bucket' | 'encrypted_customer_managed_bucket';
  authModel: 'unified_iam_jwt' | 'oauth_sso_federation' | 'sovereign_keycloak_idp';
  domainStrategy: 'subdomain_multitenant' | 'custom_sch_ng_domain' | 'fully_sovereign_custom_tld';
  resourceAllocation: {
    cpu: string;
    memory: string;
    minInstances: number;
    maxInstances: number;
  };
  securityProfile: 'standard_saas_tls' | 'strict_pci_dss_iso27001' | 'sovereign_air_gapped';
  billingModel: 'monthly_recurring' | 'yearly_prepaid' | 'lease_to_own_equity';
  networkingRequirements: {
    vpcConnector: boolean;
    staticIp: boolean;
    privateServiceConnect: boolean;
  };
  lifecycleState: ArchitectureLifecycleState;
  profileVersion: number;
  rationale: string;
  alternativesConsidered: {
    target: DeploymentTargetOption;
    reasonRejected: string;
  }[];
  estimatedMonthlyCostNGN: number;
  createdAt: string;
  updatedAt: string;
}

export interface IIAPEAssessmentRequest {
  customerId: string;
  customerName: string;
  instanceType: InstanceRequestType;
  expectedStudents: number;
  expectedFaculty: number;
  expectedConcurrentUsers: number;
  dataVolumeGb: number;
  availabilitySla: '99.5' | '99.9' | '99.99';
  requiresDedicatedDatabase: boolean;
  requiresCustomDomain: boolean;
  securityTier: 'standard' | 'strict' | 'sovereign';
  budgetPreference: 'economy' | 'balanced' | 'performance_unbounded';
}
