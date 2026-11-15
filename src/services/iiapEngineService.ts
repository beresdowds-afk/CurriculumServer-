import { 
  InstanceArchitectureProfile, 
  IIAPEAssessmentRequest, 
  DeploymentTargetOption 
} from '../types/iiapEngine';

export function validateProjectCreationRequest(request: Pick<
  IIAPEAssessmentRequest,
  'requestedDeploymentTarget' | 'createProject' | 'projectId' | 'parentOrganizationId' | 'parentFolderId'
>): void {
  if (request.requestedDeploymentTarget === 'dedicated_gcp_project' && request.createProject !== true) {
    throw new Error('PROJECT_CREATION_EXPLICIT_CONSENT_REQUIRED: Set createProject to true for a dedicated GCP project.');
  }
  if (request.createProject === true && request.requestedDeploymentTarget !== 'dedicated_gcp_project') {
    throw new Error('PROJECT_CREATION_TARGET_MISMATCH: Project creation is only valid for a dedicated GCP project architecture.');
  }
  if (request.createProject === true) {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(request.projectId || '')) {
      throw new Error('PROJECT_ID_INVALID: A valid 6-30 character GCP project ID is required.');
    }
    const hasOrganization = Boolean(request.parentOrganizationId);
    const hasFolder = Boolean(request.parentFolderId);
    if (hasOrganization === hasFolder || !/^\d+$/.test(request.parentOrganizationId || request.parentFolderId || '')) {
      throw new Error('PROJECT_PARENT_INVALID: Provide exactly one numeric parent organization or folder ID.');
    }
  }
}

export class IIAPEngineService {
  private static profiles: InstanceArchitectureProfile[] = [
    {
      profileId: 'prof_init_001',
      instanceId: 'inst_reg_001',
      customerId: 'cust_apex_college',
      customerName: 'Apex Comprehensive College, Ikeja',
      instanceType: 'full_school_management',
      applicationFamily: 'app_curriculum_flow',
      enabledApplications: ['app_curriculum_flow'],
      enabledFeatures: ['feat_student_registration', 'feat_exam_management', 'feat_results_processing', 'feat_bursary_billing', 'feat_ai_curriculum_advisor'],
      deploymentTarget: 'dedicated_cloud_run_service',
      createProject: false,
      architectureProfileName: 'Dedicated Secure Cloud Run Node with Isolated PostgreSQL Schema',
      databaseStrategy: 'dedicated_postgres_schema',
      storageStrategy: 'dedicated_regional_bucket',
      authModel: 'oauth_sso_federation',
      domainStrategy: 'custom_sch_ng_domain',
      resourceAllocation: { cpu: '2 vCPU', memory: '4 GiB', minInstances: 1, maxInstances: 10 },
      securityProfile: 'strict_pci_dss_iso27001',
      billingModel: 'yearly_prepaid',
      networkingRequirements: { vpcConnector: true, staticIp: false, privateServiceConnect: true },
      lifecycleState: 'admin_approved',
      profileVersion: 1,
      rationale: 'High student volume (1,800 students) and strict financial reconciliation requirements mandate an isolated PostgreSQL schema on dedicated Cloud Run scaling compute with private VPC connector.',
      alternativesConsidered: [
        { target: 'shared_application_infrastructure', reasonRejected: 'Insufficient isolation for high-density student records and bursary payment splits.' },
        { target: 'dedicated_gcp_project', reasonRejected: 'Overkill for single campus operational scale; dedicated Cloud Run container shard provides optimal cost-to-performance ratio.' }
      ],
      estimatedMonthlyCostNGN: 320000,
      createdAt: '2025-02-10T08:00:00Z',
      updatedAt: '2025-02-10T08:00:00Z'
    }
  ];

  static getProfiles(): InstanceArchitectureProfile[] {
    return this.profiles;
  }

  static evaluateAndRecommend(request: IIAPEAssessmentRequest): InstanceArchitectureProfile {
    validateProjectCreationRequest(request);
    // Decision logic based on concurrent users, data volume, and security tier
    let deploymentTarget: DeploymentTargetOption = 'shared_application_infrastructure';
    let dbStrategy: InstanceArchitectureProfile['databaseStrategy'] = 'shared_schema_multitenant';
    let cpu = '1 vCPU';
    let memory = '2 GiB';
    let estimatedCost = 120000;
    let rationale = 'Standard shared application container with multitenant schema isolation. Ideal for emerging community schools.';

    if (request.securityTier === 'sovereign' || request.expectedStudents > 4000) {
      deploymentTarget = 'dedicated_gcp_project';
      dbStrategy = 'sovereign_spanner_cluster';
      cpu = '4 vCPU';
      memory = '16 GiB';
      estimatedCost = 850000;
      rationale = 'Enterprise sovereign scale and high concurrency (over 4,000 students) require dedicated GCP project isolation and sovereign spanner replication for 99.99% availability.';
    } else if (request.requiresDedicatedDatabase || request.expectedConcurrentUsers > 150) {
      deploymentTarget = 'dedicated_cloud_run_service';
      dbStrategy = 'dedicated_postgres_schema';
      cpu = '2 vCPU';
      memory = '8 GiB';
      estimatedCost = 350000;
      rationale = 'Moderate-to-high concurrent workload demands dedicated Cloud Run container service and an isolated PostgreSQL schema for high-throughput continuous assessments and bursary processing.';
    }

    if (request.requestedDeploymentTarget) {
      deploymentTarget = request.requestedDeploymentTarget;
      rationale = `The customer-selected ${deploymentTarget.replace(/_/g, ' ')} target is preserved. Workload sizing does not silently change the requested deployment target.`;
    }

    const newProfile: InstanceArchitectureProfile = {
      profileId: `prof_${Date.now()}`,
      instanceId: `inst_${Math.random().toString(36).substring(2, 8)}`,
      customerId: request.customerId,
      customerName: request.customerName,
      instanceType: request.instanceType,
      applicationFamily: 'app_curriculum_flow',
      enabledApplications: ['app_curriculum_flow'],
      enabledFeatures: ['feat_student_registration', 'feat_exam_management', 'feat_results_processing', 'feat_bursary_billing'],
      deploymentTarget,
      createProject: request.createProject === true,
      projectId: request.projectId,
      parentOrganizationId: request.parentOrganizationId,
      parentFolderId: request.parentFolderId,
      architectureProfileName: `IIAPE Recommended: ${deploymentTarget.replace(/_/g, ' ').toUpperCase()}`,
      databaseStrategy: dbStrategy,
      storageStrategy: request.dataVolumeGb > 50 ? 'dedicated_regional_bucket' : 'shared_bucket_partition',
      authModel: 'unified_iam_jwt',
      domainStrategy: request.requiresCustomDomain ? 'custom_sch_ng_domain' : 'subdomain_multitenant',
      resourceAllocation: { cpu, memory, minInstances: 1, maxInstances: 5 },
      securityProfile: request.securityTier === 'strict' ? 'strict_pci_dss_iso27001' : 'standard_saas_tls',
      billingModel: request.budgetPreference === 'economy' ? 'monthly_recurring' : 'yearly_prepaid',
      networkingRequirements: { vpcConnector: request.securityTier !== 'standard', staticIp: false, privateServiceConnect: request.securityTier === 'sovereign' },
      lifecycleState: 'system_recommended',
      profileVersion: 1,
      rationale,
      alternativesConsidered: [
        { target: 'shared_application_infrastructure', reasonRejected: 'Evaluated against workload sizing; might cause resource contention during examination week.' },
        { target: 'dedicated_cloud_run_service', reasonRejected: 'Standard recommended tier for balanced performance and cost efficiency.' }
      ],
      estimatedMonthlyCostNGN: estimatedCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.profiles.unshift(newProfile);
    return newProfile;
  }

  static reviseProfile(profileId: string, updates: Partial<InstanceArchitectureProfile>): InstanceArchitectureProfile {
    const idx = this.profiles.findIndex(p => p.profileId === profileId);
    if (idx === -1) throw new Error('Architecture profile not found');

    const current = this.profiles[idx];
    const revised: InstanceArchitectureProfile = {
      ...current,
      ...updates,
      profileVersion: current.profileVersion + 1,
      lifecycleState: 'revised',
      updatedAt: new Date().toISOString()
    };

    this.profiles[idx] = revised;
    return revised;
  }

  static approveProfile(profileId: string): InstanceArchitectureProfile {
    const idx = this.profiles.findIndex(p => p.profileId === profileId);
    if (idx === -1) throw new Error('Architecture profile not found');

    this.profiles[idx] = {
      ...this.profiles[idx],
      lifecycleState: 'admin_approved',
      updatedAt: new Date().toISOString()
    };
    return this.profiles[idx];
  }
}
