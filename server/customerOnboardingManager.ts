import fs from 'fs';
import path from 'path';
import { 
  UniversalInstanceRecord, 
  UniversalInstanceType, 
  CustomerOrganizationInfo,
  FeatureDependencyRule,
  CommercialPaymentVerification 
} from '../src/types/customerOnboarding';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';
import { GCPProvisioningOrchestrationEngine } from './gcpProvisioningEngine';
import { IIAPEngineService, validateProjectCreationRequest } from '../src/services/iiapEngineService';
import { schoolGovernanceManager } from './schoolGovernanceManager';
import { createProvisioningExecutionPlan, getMissingAdapterDescription } from './provisioningPlan';
import { DeploymentTargetOption } from '../src/types/iiapEngine';

const ONBOARDING_FILE = process.env.ONBOARDING_PERSISTENCE_FILE ||
  path.join(process.cwd(), 'data', 'demo', 'universal_instances.json');

export function validateFeatureDependencies(selectedFeatures: string[]): {
  valid: boolean;
  missingDependencies: { feature: string; featureName: string; requires: string; requiredName: string }[];
} {
  const missing: { feature: string; featureName: string; requires: string; requiredName: string }[] = [];
  const featureSet = new Set(selectedFeatures);

  for (const rule of FEATURE_DEPENDENCY_RULES) {
    if (featureSet.has(rule.key)) {
      for (const req of rule.requires) {
        if (!featureSet.has(req)) {
          const reqRule = FEATURE_DEPENDENCY_RULES.find(r => r.key === req);
          missing.push({
            feature: rule.key,
            featureName: rule.name,
            requires: req,
            requiredName: reqRule ? reqRule.name : req.replace(/_/g, ' ').toUpperCase()
          });
        }
      }
    }
  }

  return { valid: missing.length === 0, missingDependencies: missing };
}

export const FEATURE_DEPENDENCY_RULES: FeatureDependencyRule[] = [
  {
    key: 'cbt_examination',
    name: 'CBT Examination Engine',
    category: 'Assessment',
    requires: ['question_bank']
  },
  {
    key: 'remedial_hub',
    name: 'Adaptive Remedial Hub',
    category: 'Learning',
    requires: ['cbt_examination']
  },
  {
    key: 'biometric_attendance',
    name: 'Biometric Attendance & Kiosk',
    category: 'Operations',
    requires: ['student_registers']
  },
  {
    key: 'lesson_approval_chain',
    name: 'Lesson Plan 3-Tier Approval Chain',
    category: 'Curriculum',
    requires: ['lesson_plans']
  },
  {
    key: 'broadsheet_analytics',
    name: 'WAEC Master Broadsheet & Analytics',
    category: 'Assessment',
    requires: ['cbt_examination', 'student_registers']
  },
  {
    key: 'bursary_finance',
    name: 'Bursary Invoicing & FIRS VAT Hub',
    category: 'Finance',
    requires: ['student_registers']
  }
];

const INITIAL_UNIVERSAL_INSTANCES: UniversalInstanceRecord[] = [
  {
    requestId: 'req_inst_001',
    instanceId: 'inst_greenwood_002',
    tenantId: 'cust_greenwood_abuja',
    instanceType: 'full_school_management',
    schoolCategory: 'secondary_school',
    organization: {
      organizationName: 'Greenwood High School, Abuja',
      registrationNumber: 'RC-99882211',
      organizationType: 'educational_institution',
      contactPersonName: 'Alhaji Bashir Mohammed',
      contactEmail: 'principal@greenwood.sch.ng',
      contactPhone: '+234 802 333 4455',
      address: 'Plot 12 Ahmadu Bello Way, Maitama, Abuja',
      state: 'FCT Abuja',
      lga: 'Abuja Municipal',
      country: 'Nigeria',
      website: 'https://greenwood.sch.ng'
    },
    applicationFamily: 'curriculum_flow_erp',
    selectedModules: ['teaching', 'assessment', 'student_records', 'timetable', 'bursary'],
    databaseStrategy: 'shared_schema_isolated',
    storageStrategy: 'platform_storage',
    storageProvider: 'google_cloud_storage',
    subdomain: 'greenwood.curriculumflow.com.ng',
    customDomain: 'portal.greenwood.sch.ng',
    billingModel: 'yearly',
    monthlyPriceNGN: 180000,
    payment: {
      provider: 'paystack',
      transactionReference: 'pstk_ref_gw_882910',
      amountNGN: 2160000,
      paymentStatus: 'pending',
      billingModel: 'yearly'
    },
    provisioningStatus: 'blocked',
    verification: {
      databaseConnected: 'unknown',
      storageReady: 'unknown',
      securityProfileApplied: 'unknown',
      dnsProvisioned: 'unknown',
      healthPingPassed: 'unknown',
      allPassed: false
    },
    createdAt: '2025-03-01T09:00:00Z',
    updatedAt: '2025-03-01T10:30:00Z'
  },
  {
    requestId: 'req_inst_002',
    instanceId: 'inst_leadway_enterprise_001',
    tenantId: 'cust_leadway_consortium',
    instanceType: 'custom_architecture',
    organization: {
      organizationName: 'Leadway Education Consortium Nigeria',
      registrationNumber: 'RC-1049281',
      organizationType: 'enterprise_consortium',
      contactPersonName: 'Dr. Chidi Okafor',
      contactEmail: 'technology@leadwayeducation.org.ng',
      contactPhone: '+234 803 888 9900',
      address: 'Leadway House, 121 Herbert Macaulay Way, Yaba, Lagos',
      state: 'Lagos State',
      lga: 'Lagos Mainland',
      country: 'Nigeria',
      website: 'https://leadwayeducation.org.ng'
    },
    applicationFamily: 'custom_curriculum_stack',
    customArchitecture: {
      applicationComponents: ['Curriculum Core API', 'Custom LMS Shard', 'Parent Portal Gateway', 'Corporate Reporting Data Lake'],
      existingSystems: ['SAP Financials ERP', 'Active Directory LDAP', 'Canvas LMS'],
      apiRequirements: {
        restEnabled: true,
        graphqlEnabled: true,
        webhooksEnabled: true,
        rateLimitTier: 'high_throughput'
      },
      databaseRequirements: {
        isolation: 'dedicated_customer_gcp_project',
        engine: 'Cloud SQL Enterprise',
        cmekRequired: true,
        pointInTimeRecovery: true
      },
      authenticationRequirements: {
        authProvider: 'google_workspace_sso',
        mfaEnforced: true
      },
      storageRequirements: {
        strategy: 'hybrid',
        primaryProvider: 'google_drive',
        retentionDays: 3650,
        encryptionAtRest: true
      },
      networkingRequirements: {
        vpcPeering: true,
        staticEgressIp: true,
        cloudArmourDDoS: true
      },
      domainRequirements: {
        domainType: 'custom_sovereign_tld',
        requestedDomain: 'portal.leadwayschools.com.ng',
        sslManagedByPlatform: true
      },
      integrationNotes: 'Requires dedicated VPC connector with high-concurrency Cloud SQL proxy and SAP webhook endpoint.',
      requiresAdminReview: true,
      reviewStatus: 'pending_review',
      reviewNotes: 'Architecture approved by Principal Solutions Architect on 2025-02-20. Dedicated project budget allocated.'
    },
    selectedModules: ['curriculum_catalog', 'cbt_examination', 'broadsheet_analytics', 'bursary_finance'],
    databaseStrategy: 'dedicated_customer_gcp_project',
    storageStrategy: 'hybrid',
    storageProvider: 'google_drive',
    subdomain: 'leadway.curriculumserver.com.ng',
    customDomain: 'portal.leadwayschools.com.ng',
    billingModel: 'lease_to_own',
    monthlyPriceNGN: 650000,
    payment: {
      provider: 'opay',
      transactionReference: 'opay_txn_leadway_2026_01',
      amountNGN: 650000,
      paymentStatus: 'pending',
      billingModel: 'lease_to_own'
    },
    provisioningStatus: 'blocked',
    verification: {
      databaseConnected: 'unknown',
      storageReady: 'unknown',
      securityProfileApplied: 'unknown',
      dnsProvisioned: 'unknown',
      healthPingPassed: 'unknown',
      allPassed: false
    },
    createdAt: '2025-02-18T11:00:00Z',
    updatedAt: '2025-02-22T15:00:00Z'
  },
  {
    requestId: 'req_inst_003',
    instanceId: 'inst_cbt_tutorial_centre_002',
    tenantId: 'cust_apex_cbt_center',
    instanceType: 'feature_collection',
    organization: {
      organizationName: 'Apex JAMB & WAEC CBT Testing Centre',
      registrationNumber: 'BN-44881122',
      organizationType: 'exam_body',
      contactPersonName: 'Engr. Tunde Adeleke',
      contactEmail: 'admin@apexcbt.com.ng',
      contactPhone: '+234 805 222 1100',
      address: '22 Allen Avenue, Ikeja, Lagos',
      state: 'Lagos State',
      lga: 'Ikeja',
      country: 'Nigeria',
      website: 'https://apexcbt.com.ng'
    },
    applicationFamily: 'standalone_cbt_assessment',
    featureCollection: {
      primaryUseCase: 'examination_center',
      selectedFeatures: ['question_bank', 'cbt_examination', 'remedial_hub', 'broadsheet_analytics'],
      dependencyValidation: {
        valid: true,
        missingDependencies: []
      }
    },
    selectedModules: ['question_bank', 'cbt_examination', 'remedial_hub', 'broadsheet_analytics'],
    databaseStrategy: 'shared_schema_isolated',
    storageStrategy: 'platform_storage',
    storageProvider: 'google_cloud_storage',
    subdomain: 'apexcbt.curriculumflow.com.ng',
    billingModel: 'monthly',
    monthlyPriceNGN: 95000,
    payment: {
      provider: 'paystack',
      transactionReference: 'pstk_ref_apex_cbt_0981',
      amountNGN: 95000,
      paymentStatus: 'pending',
      billingModel: 'monthly'
    },
    provisioningStatus: 'blocked',
    verification: {
      databaseConnected: 'unknown',
      storageReady: 'unknown',
      securityProfileApplied: 'unknown',
      dnsProvisioned: 'unknown',
      healthPingPassed: 'unknown',
      allPassed: false
    },
    createdAt: '2025-03-05T08:30:00Z',
    updatedAt: '2025-03-05T09:30:00Z'
  }
];

export class CustomerOnboardingManager {
  private static instance: CustomerOnboardingManager;
  private instances: UniversalInstanceRecord[] = [];

  private constructor() {
    this.loadPersistence();
  }

  public static getInstance(): CustomerOnboardingManager {
    if (!CustomerOnboardingManager.instance) {
      CustomerOnboardingManager.instance = new CustomerOnboardingManager();
    }
    return CustomerOnboardingManager.instance;
  }

  private loadPersistence(): void {
    try {
      if (fs.existsSync(ONBOARDING_FILE)) {
        const fileContent = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'));
        const seen = new Set<string>();
        this.instances = fileContent.filter((inst: UniversalInstanceRecord) => {
          if (!inst.instanceId || seen.has(inst.instanceId)) return false;
          seen.add(inst.instanceId);
          return true;
        }).map((inst: UniversalInstanceRecord) => this.removeUnverifiedSuccess(inst));
        this.savePersistence();
      } else {
        this.instances = INITIAL_UNIVERSAL_INSTANCES.map(inst => this.removeUnverifiedSuccess(inst));
        this.savePersistence();
      }
    } catch (e) {
      console.error('Error loading CustomerOnboardingManager persistence:', e);
      this.instances = INITIAL_UNIVERSAL_INSTANCES.map(inst => this.removeUnverifiedSuccess(inst));
    }
  }

  private removeUnverifiedSuccess(record: UniversalInstanceRecord): UniversalInstanceRecord {
    if (record.payment?.paymentStatus === 'verified') {
      record.payment.paymentStatus = 'pending';
      delete record.payment.verifiedAt;
      delete record.payment.gatewayResponse;
      delete record.payment.receiptNumber;
      delete record.payment.invoiceNumber;
      delete record.payment.invoiceUrl;
    }
    if (['provisioning', 'provisioned', 'activation_ready', 'active', 'verified'].includes(record.provisioningStatus)) {
      record.provisioningStatus = 'blocked';
    }
    record.verification ||= {
      databaseConnected: 'unknown',
      storageReady: 'unknown',
      securityProfileApplied: 'unknown',
      dnsProvisioned: 'unknown',
      healthPingPassed: 'unknown',
      allPassed: false
    };
    record.verification.databaseConnected = 'unknown';
    record.verification.storageReady = 'unknown';
    record.verification.securityProfileApplied = 'unknown';
    record.verification.dnsProvisioned = 'unknown';
    record.verification.healthPingPassed = 'unknown';
    record.verification.allPassed = false;
    delete record.activationToken;
    delete record.activationUrl;
    delete record.activationExpiresAt;
    delete record.activatedAt;
    return record;
  }

  private savePersistence(): void {
    try {
      const dataDir = path.dirname(ONBOARDING_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(this.instances, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving CustomerOnboarding persistence:', e);
    }
  }

  public getInstances(): UniversalInstanceRecord[] {
    return this.instances;
  }

  public getInstanceRequests(): UniversalInstanceRecord[] {
    return this.instances;
  }

  public getInstanceById(id: string): UniversalInstanceRecord | undefined {
    return this.instances.find(i => i.instanceId === id || i.requestId === id || i.tenantId === id);
  }

  public validateFeatureDependencies(selectedFeatures: string[]): {
    valid: boolean;
    missingDependencies: { feature: string; featureName: string; requires: string; requiredName: string }[];
  } {
    return validateFeatureDependencies(selectedFeatures);
  }

  public createInstanceRequest(payload: {
    instanceType: UniversalInstanceType;
    organization: CustomerOrganizationInfo;
    schoolCategory?: any;
    customArchitecture?: any;
    featureCollection?: any;
    selectedModules: string[];
    databaseStrategy?: any;
    storageStrategy?: any;
    storageProvider?: any;
    deploymentTarget: DeploymentTargetOption;
    createProject?: boolean;
    projectId?: string;
    parentOrganizationId?: string;
    parentFolderId?: string;
    idempotencyKey?: string;
    subdomain: string;
    customDomain?: string;
    billingModel: 'monthly' | 'yearly' | 'lease_to_own';
    monthlyPriceNGN: number;
    paymentProvider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire';
    paymentReference: string;
    amountPaidNGN: number;
  }): UniversalInstanceRecord {
    if (payload.idempotencyKey) {
      const existing = this.instances.find(inst => inst.idempotencyKey === payload.idempotencyKey);
      if (existing) return existing;
    }

    const supportedTargets: DeploymentTargetOption[] = [
      'shared_application_infrastructure',
      'dedicated_cloud_run_service',
      'dedicated_gcp_project',
      'multiple_cloud_run_services',
      'container_workloads',
      'gke_future_cluster'
    ];
    if (!supportedTargets.includes(payload.deploymentTarget)) {
      throw new Error('DEPLOYMENT_TARGET_REQUIRED: Select a supported architecture target before submitting this request.');
    }
    validateProjectCreationRequest({
      requestedDeploymentTarget: payload.deploymentTarget,
      createProject: payload.createProject,
      projectId: payload.projectId,
      parentOrganizationId: payload.parentOrganizationId,
      parentFolderId: payload.parentFolderId
    });
    if (payload.databaseStrategy === 'dedicated_customer_gcp_project' && payload.deploymentTarget !== 'dedicated_gcp_project') {
      throw new Error('ARCHITECTURE_TARGET_MISMATCH: Dedicated customer-project storage cannot be silently mapped to another deployment target.');
    }
    if (payload.customArchitecture?.databaseRequirements?.isolation &&
      payload.customArchitecture.databaseRequirements.isolation !== payload.databaseStrategy) {
      throw new Error('DATABASE_STRATEGY_MISMATCH: Custom architecture and onboarding database strategies must match.');
    }

    // 1. Enforce Provisioning Role Hierarchy Gatekeeper
    // Rule: School proprietors or school principals are able to make or request school provisioning.
    // Rule: ICT technicians cannot single-handedly make a school instance provisioning.
    const provRole = payload.organization.provisionerRole || 'proprietor';
    const permCheck = schoolGovernanceManager.validateProvisioningPermission(provRole);
    if (!permCheck.allowed) {
      throw new Error(permCheck.reason || 'PERMISSION_DENIED: Unauthorized to provision school instance');
    }

    const cleanSubdomain = payload.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanId = cleanSubdomain.replace(/[^a-z0-9]/g, '_');
    const instanceId = `inst_${cleanId}_${Date.now().toString(16).substring(2, 6)}`;
    const tenantId = `cust_${cleanId}`;
    const requestId = `req_${Date.now()}`;

    const isCustomArch = payload.instanceType === 'custom_architecture';
    const requiresAdminReview = isCustomArch;
    if (payload.deploymentTarget === 'dedicated_gcp_project' && payload.createProject !== true) {
      throw new Error('PROJECT_CREATION_EXPLICIT_CONSENT_REQUIRED: Set createProject to true for standalone project creation.');
    }

    // Pricing calculation
    let monthlyPriceNGN = payload.monthlyPriceNGN;
    if (!monthlyPriceNGN || monthlyPriceNGN <= 0) {
      if (payload.instanceType === 'full_school_management') monthlyPriceNGN = 250000;
      else if (payload.instanceType === 'custom_architecture') monthlyPriceNGN = 650000;
      else monthlyPriceNGN = 95000;
    }

    // 2. Build Governance Hierarchy Model
    const isPrincipalDualRole = Boolean(payload.organization.isPrincipalAlsoIctTechnician);
    const governanceHierarchy = schoolGovernanceManager.getOrCreateHierarchy(instanceId, {
      provisionedByRole: provRole === 'principal' ? 'principal' : 'proprietor',
      provisionerName: payload.organization.contactPersonName,
      provisionerEmail: payload.organization.contactEmail,
      proprietor: provRole === 'proprietor' ? {
        name: payload.organization.proprietorName || payload.organization.contactPersonName,
        email: payload.organization.proprietorEmail || payload.organization.contactEmail,
        phone: payload.organization.proprietorPhone || payload.organization.contactPhone
      } : undefined,
      principal: {
        name: payload.organization.principalName || (provRole === 'principal' ? payload.organization.contactPersonName : 'Principal Administrator'),
        email: payload.organization.principalEmail || (provRole === 'principal' ? payload.organization.contactEmail : ''),
        phone: payload.organization.principalPhone || '',
        appointedBy: provRole === 'proprietor' ? 'proprietor' : 'self_provisioned',
        appointedAt: new Date().toISOString(),
        isAlsoIctTechnician: isPrincipalDualRole
      },
      ictTechnician: isPrincipalDualRole ? {
        name: payload.organization.principalName || payload.organization.contactPersonName,
        email: payload.organization.principalEmail || payload.organization.contactEmail,
        appointedBy: provRole === 'proprietor' ? 'proprietor' : 'principal',
        appointedByName: payload.organization.contactPersonName,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: true
      } : (payload.organization.ictTechnicianName ? {
        name: payload.organization.ictTechnicianName,
        email: payload.organization.ictTechnicianEmail || '',
        phone: payload.organization.ictTechnicianPhone,
        appointedBy: provRole === 'proprietor' ? 'proprietor' : 'principal',
        appointedByName: payload.organization.contactPersonName,
        appointedAt: new Date().toISOString(),
        isDualRoleWithPrincipal: false
      } : undefined)
    });

    const newRecord: UniversalInstanceRecord = {
      requestId,
      instanceId,
      tenantId,
      instanceType: payload.instanceType,
      organization: payload.organization,
      applicationFamily: payload.instanceType === 'full_school_management' 
        ? 'curriculum_flow_erp' 
        : payload.instanceType === 'custom_architecture' 
          ? 'custom_curriculum_stack' 
          : 'standalone_micro_apps',
      schoolCategory: payload.schoolCategory,
      customArchitecture: payload.customArchitecture ? {
        ...payload.customArchitecture,
        requiresAdminReview,
        reviewStatus: requiresAdminReview ? 'pending_review' : 'approved'
      } : undefined,
      featureCollection: payload.featureCollection,
      deploymentTarget: payload.deploymentTarget,
      createProject: payload.createProject === true,
      projectId: payload.projectId,
      parentOrganizationId: payload.parentOrganizationId,
      parentFolderId: payload.parentFolderId,
      selectedModules: payload.selectedModules || ['curriculum_catalog'],
      databaseStrategy: payload.databaseStrategy || (payload.instanceType === 'custom_architecture' ? 'dedicated_database' : 'shared_schema_isolated'),
      storageStrategy: payload.storageStrategy || 'platform_storage',
      storageProvider: payload.storageProvider || 'google_cloud_storage',
      subdomain: `${cleanSubdomain}.curriculumflow.com.ng`,
      customDomain: payload.customDomain,
      billingModel: payload.billingModel,
      monthlyPriceNGN,
      payment: {
        provider: payload.paymentProvider,
        transactionReference: payload.paymentReference,
        amountNGN: payload.amountPaidNGN,
        paymentStatus: 'pending',
        billingModel: payload.billingModel
      },
      provisioningStatus: requiresAdminReview ? 'pending_review' : 'payment_pending',
      verification: {
        databaseConnected: 'unknown',
        storageReady: 'unknown',
        securityProfileApplied: 'unknown',
        dnsProvisioned: 'unknown',
        healthPingPassed: 'unknown',
        allPassed: false
      },
      correlationId: requestId,
      idempotencyKey: payload.idempotencyKey,
      governanceHierarchy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.instances.unshift(newRecord);
    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: payload.organization.contactEmail,
      actorRole: 'customer_requester',
      tenantId,
      action: 'customer_instance_requested',
      target: instanceId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Created universal instance request for ${payload.organization.organizationName} (${payload.instanceType}). RequiresReview: ${requiresAdminReview}`,
      ipAddress: '127.0.0.1'
    });

    return newRecord;
  }

  public verifyPayment(
    instanceId: string, 
    reference: string, 
    provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire', 
    amountPaid: number
  ): {
    success: boolean;
    verified: boolean;
    record?: UniversalInstanceRecord;
    error?: string;
  } {
    void instanceId;
    void reference;
    void provider;
    void amountPaid;
    return {
      success: false,
      verified: false,
      error: 'PAYMENT_VERIFICATION_UNAVAILABLE: No trusted payment-provider verification adapter is configured.'
    };
  }

  public reviewCustomArchitecture(requestId: string, approved: boolean, notes: string, reviewerEmail: string): UniversalInstanceRecord | null {
    if (!reviewerEmail?.includes('@')) {
      throw new Error('AUTHENTICATED_REVIEWER_REQUIRED: Reviewer identity must come from the authenticated server session.');
    }
    const record = this.getInstanceById(requestId);
    if (!record || record.instanceType !== 'custom_architecture' || !record.customArchitecture) {
      return null;
    }

    record.customArchitecture.reviewStatus = approved ? 'approved' : 'rejected';
    record.customArchitecture.reviewNotes = notes;
    record.adminReviewNotes = notes;
    record.provisioningStatus = approved ? 'payment_pending' : 'rejected';
    record.updatedAt = new Date().toISOString();

    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: reviewerEmail,
      actorRole: 'super_admin',
      tenantId: record.tenantId,
      action: approved ? 'custom_architecture_approved' : 'custom_architecture_rejected',
      target: record.instanceId,
      result: approved ? 'SUCCESS' : 'BLOCKED',
      outcome: approved ? 'SUCCESS' : 'BLOCKED',
      details: `Technical review by ${reviewerEmail}: ${notes}`,
      ipAddress: '127.0.0.1'
    });

    return record;
  }

  public async executeProvisioning(instanceId: string): Promise<UniversalInstanceRecord | null> {
    const record = this.getInstanceById(instanceId);
    if (!record) return null;

    const correlationId = record.correlationId || record.requestId;
    record.provisioningStatus = 'provisioning';
    delete record.provisioningFailure;
    record.updatedAt = new Date().toISOString();
    this.savePersistence();

    try {
      if (record.payment.paymentStatus !== 'verified') {
        throw new Error('PAYMENT_NOT_VERIFIED: Cannot provision before trusted payment verification.');
      }

      if (record.instanceType === 'custom_architecture' && record.customArchitecture?.reviewStatus !== 'approved') {
        throw new Error('ARCHITECTURE_REVIEW_REQUIRED: Custom architecture requires an independent technical review.');
      }

      const profile = record.architectureProfileId
        ? IIAPEngineService.getProfiles().find(candidate => candidate.profileId === record.architectureProfileId)
        : undefined;
      const selectedProfile = profile || IIAPEngineService.evaluateAndRecommend({
        customerId: record.tenantId,
        customerName: record.organization.organizationName,
        instanceType: record.instanceType,
        expectedStudents: 1000,
        expectedFaculty: 50,
        expectedConcurrentUsers: 250,
        dataVolumeGb: 50,
        availabilitySla: '99.9',
        requiresDedicatedDatabase: record.databaseStrategy === 'dedicated_database',
        requiresCustomDomain: !!record.customDomain,
        securityTier: 'standard',
        budgetPreference: 'balanced',
        requestedDeploymentTarget: record.deploymentTarget,
        createProject: record.createProject,
        projectId: record.projectId,
        parentOrganizationId: record.parentOrganizationId,
        parentFolderId: record.parentFolderId
      });
      record.architectureProfileId = selectedProfile.profileId;

      const plan = createProvisioningExecutionPlan(selectedProfile);
      if (plan.requiresProjectCreationApproval) {
        throw new Error('PIAM_UNAVAILABLE: Independent durable approval for this exact project-creation operation is not configured.');
      }
      if (selectedProfile.deploymentTarget === 'shared_application_infrastructure') {
        throw new Error(`PROVISIONING_ADAPTER_UNAVAILABLE: ${getMissingAdapterDescription(plan)}`);
      }
      if (selectedProfile.deploymentTarget === 'multiple_cloud_run_services' || selectedProfile.deploymentTarget === 'container_workloads') {
        throw new Error(`PROVISIONING_ADAPTER_UNAVAILABLE: ${getMissingAdapterDescription(plan)}`);
      }

      const adapters = ['postgresql_database', 'cloud_run_service', 'cloud_storage_bucket'];
      if (selectedProfile.domainStrategy === 'custom_sch_ng_domain') {
        adapters.push('dns_managed_zone', 'ssl_certificate');
      }
      const provisioningJob = await GCPProvisioningOrchestrationEngine.executeProvisioningOrchestration(
        record.instanceId,
        selectedProfile.profileVersion,
        adapters as Array<'postgresql_database' | 'cloud_run_service' | 'cloud_storage_bucket' | 'dns_managed_zone' | 'ssl_certificate'>,
        record.tenantId
      );
      if (provisioningJob.state !== 'verified' || !provisioningJob.verificationStatus) {
        throw new Error('PROVISIONING_VERIFICATION_FAILED: The execution job did not return verified results.');
      }

      record.provisioningStatus = 'provisioned';
      const verification = this.runVerificationChecklist(record.instanceId);
      if (!verification.allPassed) {
        throw new Error('INDEPENDENT_VERIFICATION_UNAVAILABLE: Provisioning completed but independent infrastructure verification is not configured.');
      }
      record.provisioningStatus = 'verified';
      record.updatedAt = new Date().toISOString();
      this.savePersistence();
      return record;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provisioning failure';
      const code = message.split(':', 1)[0] || 'PROVISIONING_FAILED';
      record.provisioningStatus = /UNAVAILABLE|REQUIRED|NOT_VERIFIED/.test(code) ? 'blocked' : 'failed';
      record.provisioningFailure = {
        code,
        message,
        correlationId,
        occurredAt: new Date().toISOString()
      };
      record.updatedAt = new Date().toISOString();
      this.savePersistence();
      throw new Error(`${message} (correlationId: ${correlationId})`);
    }
  }

  public runVerificationChecklist(instanceId: string) {
    const record = this.getInstanceById(instanceId);
    if (!record) throw new Error(`Instance '${instanceId}' not found for verification.`);

    record.verification = {
      databaseConnected: 'unavailable',
      storageReady: 'unavailable',
      securityProfileApplied: 'unavailable',
      dnsProvisioned: 'unavailable',
      healthPingPassed: 'unavailable',
      allPassed: false
    };

    this.savePersistence();
    return record.verification;
  }

  public activateInstance(instanceId: string): {
    success: boolean;
    record?: UniversalInstanceRecord;
    activationUrl?: string;
    activationToken?: string;
    expiresAt?: string;
    error?: string;
  } {
    const record = this.getInstanceById(instanceId);
    if (!record) return { success: false, error: 'Instance not found.' };
    if (record.provisioningStatus !== 'verified' || !record.verification.allPassed) {
      return { success: false, error: 'Instance activation is blocked until provisioning has completed and infrastructure has been verified.' };
    }
    return {
      success: false,
      record,
      error: 'Activation invitation issuance is unavailable until a trusted activation service is configured.'
    };
  }
}

export const customerOnboardingManager = new Proxy({} as CustomerOnboardingManager, {
  get(_target, property) {
    const manager = CustomerOnboardingManager.getInstance();
    const value = Reflect.get(manager, property, manager) as unknown;
    return typeof value === 'function' ? value.bind(manager) : value;
  }
});
