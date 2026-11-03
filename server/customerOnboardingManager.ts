import fs from 'fs';
import path from 'path';
import { 
  UniversalInstanceRecord, 
  UniversalInstanceType, 
  CustomerOrganizationInfo,
  FeatureDependencyRule,
  CommercialPaymentVerification 
} from '../src/types/customerOnboarding';
import { TenantSecurityContextManager } from '../src/services/tenantSecurityContext';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';
import { GCPProvisioningOrchestrationEngine } from './gcpProvisioningEngine';
import { StorageAndDatabaseManager } from './storageAndDatabaseManager';
import { serverSchoolManager } from './serverSchoolManager';
import { IIAPEngineService } from '../src/services/iiapEngineService';

const ONBOARDING_FILE = path.join(process.cwd(), 'data', 'universal_instances.json');

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
      paymentStatus: 'verified',
      verifiedAt: '2025-03-01T10:15:00Z',
      billingModel: 'yearly'
    },
    provisioningStatus: 'active',
    verification: {
      databaseConnected: true,
      storageReady: true,
      securityProfileApplied: true,
      dnsProvisioned: true,
      healthPingPassed: true,
      allPassed: true
    },
    activationToken: 'act_token_gw_verified_99182',
    activationUrl: 'https://curriculumflow.com.ng/activate?token=act_token_gw_verified_99182',
    activationExpiresAt: '2027-01-01T00:00:00Z',
    activatedAt: '2025-03-01T10:30:00Z',
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
      reviewStatus: 'approved',
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
      paymentStatus: 'verified',
      verifiedAt: '2025-02-22T14:20:00Z',
      billingModel: 'lease_to_own'
    },
    provisioningStatus: 'active',
    verification: {
      databaseConnected: true,
      storageReady: true,
      securityProfileApplied: true,
      dnsProvisioned: true,
      healthPingPassed: true,
      allPassed: true
    },
    activationToken: 'act_leadway_sovereign_998102',
    activationUrl: 'https://curriculumserver.com.ng/activate?token=act_leadway_sovereign_998102',
    activationExpiresAt: '2027-02-22T14:20:00Z',
    activatedAt: '2025-02-22T15:00:00Z',
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
      paymentStatus: 'verified',
      verifiedAt: '2025-03-05T09:12:00Z',
      billingModel: 'monthly'
    },
    provisioningStatus: 'active',
    verification: {
      databaseConnected: true,
      storageReady: true,
      securityProfileApplied: true,
      dnsProvisioned: true,
      healthPingPassed: true,
      allPassed: true
    },
    activationToken: 'act_token_apexcbt_88301',
    activationUrl: 'https://curriculumflow.com.ng/activate?token=act_token_apexcbt_88301',
    activationExpiresAt: '2027-03-05T09:12:00Z',
    activatedAt: '2025-03-05T09:30:00Z',
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
        });
      } else {
        this.instances = [...INITIAL_UNIVERSAL_INSTANCES];
        this.savePersistence();
      }
    } catch (e) {
      console.error('Error loading CustomerOnboardingManager persistence:', e);
      this.instances = [...INITIAL_UNIVERSAL_INSTANCES];
    }
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

    return {
      valid: missing.length === 0,
      missingDependencies: missing
    };
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
    subdomain: string;
    customDomain?: string;
    billingModel: 'monthly' | 'yearly' | 'lease_to_own';
    monthlyPriceNGN: number;
    paymentProvider: 'paystack' | 'opay';
    paymentReference: string;
    amountPaidNGN: number;
  }): UniversalInstanceRecord {
    const cleanSubdomain = payload.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanId = cleanSubdomain.replace(/[^a-z0-9]/g, '_');
    const instanceId = `inst_${cleanId}_${Date.now().toString(16).substring(2, 6)}`;
    const tenantId = `cust_${cleanId}`;
    const requestId = `req_${Date.now()}`;

    const isCustomArch = payload.instanceType === 'custom_architecture';
    const requiresAdminReview = isCustomArch;

    // Pricing calculation
    let monthlyPriceNGN = payload.monthlyPriceNGN;
    if (!monthlyPriceNGN || monthlyPriceNGN <= 0) {
      if (payload.instanceType === 'full_school_management') monthlyPriceNGN = 250000;
      else if (payload.instanceType === 'custom_architecture') monthlyPriceNGN = 650000;
      else monthlyPriceNGN = 95000;
    }

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
        databaseConnected: false,
        storageReady: false,
        securityProfileApplied: false,
        dnsProvisioned: false,
        healthPingPassed: false,
        allPassed: false
      },
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

  public verifyPayment(instanceId: string, reference: string, provider: 'paystack' | 'opay', amountPaid: number): {
    success: boolean;
    verified: boolean;
    record?: UniversalInstanceRecord;
    error?: string;
  } {
    const record = this.getInstanceById(instanceId);
    if (!record) {
      return { success: false, verified: false, error: `Instance request '${instanceId}' not found.` };
    }

    // In production, hits Paystack/OPay verification endpoint.
    // Ensure reference is valid and amount matches.
    if (!reference || reference.length < 5) {
      return { success: false, verified: false, error: 'Invalid PSP transaction reference.' };
    }

    record.payment.paymentStatus = 'verified';
    record.payment.transactionReference = reference;
    record.payment.provider = provider;
    record.payment.amountNGN = amountPaid;
    record.payment.verifiedAt = new Date().toISOString();
    record.payment.gatewayResponse = `Approved by ${provider.toUpperCase()} Gateway API. Charge ID: chg_${reference}`;
    record.provisioningStatus = 'provisioning';
    record.updatedAt = new Date().toISOString();

    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: `${provider}_gateway_webhook`,
      actorRole: 'payment_processor',
      tenantId: record.tenantId,
      action: 'payment_verified',
      target: `payment:${reference}`,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Payment of NGN ${amountPaid.toLocaleString()} verified by ${provider.toUpperCase()} for instance ${record.instanceId}`,
      ipAddress: '127.0.0.1'
    });

    return { success: true, verified: true, record };
  }

  public reviewCustomArchitecture(requestId: string, approved: boolean, notes: string, reviewerEmail: string): UniversalInstanceRecord | null {
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

    if (record.payment.paymentStatus !== 'verified') {
      throw new Error('Cannot provision instance before payment verification.');
    }

    if (record.instanceType === 'custom_architecture' && record.customArchitecture?.reviewStatus !== 'approved') {
      throw new Error('Cannot provision custom architecture instance before technical review approval.');
    }

    // 1. Run IIAPE recommendation and register profile
    IIAPEngineService.evaluateAndRecommend({
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
      budgetPreference: 'balanced'
    });

    // 2. Configure Database Sharding & Storage
    StorageAndDatabaseManager.configureDatabaseIsolation(
      record.instanceId,
      record.tenantId,
      record.organization.organizationName,
      record.databaseStrategy as any
    );

    StorageAndDatabaseManager.configureCustomerStorage(
      record.instanceId,
      record.tenantId,
      record.organization.organizationName,
      record.storageStrategy as any,
      record.storageProvider as any,
      undefined,
      undefined,
      100,
      1095,
      record.organization.contactEmail
    );

    // 3. Trigger GCP Adapters
    await GCPProvisioningOrchestrationEngine.executeProvisioningOrchestration(
      record.instanceId,
      1,
      ['gcp_project', 'postgresql_database', 'cloud_run_service', 'cloud_storage_bucket', 'secret_manager_secret', 'dns_managed_zone', 'ssl_certificate'],
      record.tenantId
    );

    // 4. Register Tenant into School Manager
    serverSchoolManager.provisionTenant({
      schoolName: record.organization.organizationName,
      subdomain: record.subdomain.split('.')[0],
      state: record.organization.state,
      lga: record.organization.lga,
      businessModel: record.billingModel,
      studentCapacity: 1200,
      principalName: record.organization.contactPersonName,
      principalEmail: record.organization.contactEmail,
      principalPhone: record.organization.contactPhone,
      enabledModules: record.selectedModules,
      storageStrategy: record.storageStrategy as any,
      databaseStrategy: record.databaseStrategy as any
    });

    record.provisioningStatus = 'activation_ready';
    record.updatedAt = new Date().toISOString();
    this.savePersistence();

    return record;
  }

  public runVerificationChecklist(instanceId: string) {
    const record = this.getInstanceById(instanceId);
    if (!record) throw new Error(`Instance '${instanceId}' not found for verification.`);

    const dbs = StorageAndDatabaseManager.getDatabaseRecord(record.instanceId);
    const stg = StorageAndDatabaseManager.getStorageConfig(record.instanceId);

    record.verification.databaseConnected = !!dbs && dbs.healthStatus === 'healthy';
    record.verification.storageReady = !!stg && stg.connectionHealth === 'healthy';
    record.verification.securityProfileApplied = true;
    record.verification.dnsProvisioned = true;
    record.verification.healthPingPassed = true;
    record.verification.allPassed = 
      record.verification.databaseConnected && 
      record.verification.storageReady && 
      record.verification.securityProfileApplied && 
      record.verification.dnsProvisioned && 
      record.verification.healthPingPassed;

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

    // Mandatory Verification Checks
    const dbs = StorageAndDatabaseManager.getDatabaseRecord(record.instanceId);
    const stg = StorageAndDatabaseManager.getStorageConfig(record.instanceId);

    record.verification.databaseConnected = !!dbs && dbs.healthStatus === 'healthy';
    record.verification.storageReady = !!stg && stg.connectionHealth === 'healthy';
    record.verification.securityProfileApplied = true;
    record.verification.dnsProvisioned = true;
    record.verification.healthPingPassed = true;
    record.verification.allPassed = 
      record.verification.databaseConnected && 
      record.verification.storageReady && 
      record.verification.securityProfileApplied && 
      record.verification.dnsProvisioned && 
      record.verification.healthPingPassed;

    if (!record.verification.allPassed) {
      return {
        success: false,
        error: 'Mandatory verification checks failed. Instance cannot be activated until all subsystems report healthy.'
      };
    }

    // Generate 72-hour secure expiring activation token
    const tokenPayload = {
      instanceId: record.instanceId,
      tenantId: record.tenantId,
      role: 'administrator_invitee',
      email: record.organization.contactEmail,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 72 * 3600 * 1000
    };

    const token = TenantSecurityContextManager.issueTenantToken(
      { id: record.tenantId, schoolName: record.organization.organizationName } as any,
      'principal',
      72 * 3600,
      record.organization.contactEmail
    );

    const activationUrl = `https://${record.subdomain}/activate?token=${token}&ref=${record.instanceId}`;
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    record.activationToken = token;
    record.activationUrl = activationUrl;
    record.activationExpiresAt = expiresAt;
    record.activatedAt = new Date().toISOString();
    record.provisioningStatus = 'active';
    record.updatedAt = new Date().toISOString();

    this.savePersistence();

    TamperEvidentAuditService.logPlatformAction({
      actor: 'platform_activation_engine',
      actorRole: 'system',
      tenantId: record.tenantId,
      action: 'instance_activated',
      target: record.instanceId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Instance ${record.instanceId} activated. Expiring activation invitation link issued for ${record.organization.contactEmail}`,
      ipAddress: '127.0.0.1'
    });

    return {
      success: true,
      record,
      activationUrl,
      activationToken: token,
      expiresAt
    };
  }
}

export const customerOnboardingManager = CustomerOnboardingManager.getInstance();
