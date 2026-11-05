import { 
  UniversalInstanceRecord, 
  UniversalInstanceType, 
  CustomerOrganizationInfo,
  CustomArchitectureSpec,
  FeatureCollectionSpec,
  SchoolCategory
} from '../types/customerOnboarding';
import { 
  FeatureDependencyValidationResponse, 
  PaymentInitializationResponse, 
  PaymentVerificationResponse, 
  InstanceActivationResponse 
} from '../../packages/shared-types/src/apiContracts';
import { getSuperAdminAuthHeader } from './controlPlaneToken';

export const CLIENT_FEATURE_DEPENDENCIES = [
  { key: 'cbt_examination', name: 'CBT Examination Engine', requires: ['question_bank'], requiresName: 'Question Bank & Item Authoring' },
  { key: 'remedial_hub', name: 'Adaptive Remedial Hub', requires: ['cbt_examination'], requiresName: 'CBT Examination Engine' },
  { key: 'biometric_attendance', name: 'Biometric Attendance & Kiosk', requires: ['student_registers'], requiresName: 'Student Registry' },
  { key: 'lesson_approval_chain', name: 'Lesson 3-Tier Approval Chain', requires: ['lesson_plans'], requiresName: 'Lesson Notes & Plans' },
  { key: 'broadsheet_analytics', name: 'WAEC Broadsheet Analytics', requires: ['cbt_examination', 'student_registers'], requiresName: 'CBT Examination & Student Registry' },
  { key: 'bursary_finance', name: 'Bursary Invoicing & VAT Hub', requires: ['student_registers'], requiresName: 'Student Registry' }
];

export class CustomerOnboardingClient {
  private static instance: CustomerOnboardingClient;
  private instances: UniversalInstanceRecord[] = [];

  private constructor() {
    this.syncFromBackend();
  }

  public static getInstance(): CustomerOnboardingClient {
    if (!CustomerOnboardingClient.instance) {
      CustomerOnboardingClient.instance = new CustomerOnboardingClient();
    }
    return CustomerOnboardingClient.instance;
  }

  public async syncFromBackend(): Promise<void> {
    try {
      const res = await fetch('/api/v1/server/onboarding/requests', {
        headers: {
          ...getSuperAdminAuthHeader()
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.instances = json.data;
        }
      }
    } catch {
      // In-memory fallback
    }
  }

  public getInstances(): UniversalInstanceRecord[] {
    return this.instances;
  }

  public validateFeatureDependenciesClient(selectedFeatures: string[]): FeatureDependencyValidationResponse {
    const missing: { feature: string; featureName: string; requires: string; requiredName: string }[] = [];
    const set = new Set(selectedFeatures);

    for (const rule of CLIENT_FEATURE_DEPENDENCIES) {
      if (set.has(rule.key)) {
        for (const req of rule.requires) {
          if (!set.has(req)) {
            missing.push({
              feature: rule.key,
              featureName: rule.name,
              requires: req,
              requiredName: rule.requiresName
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

  public async validateFeatureDependencies(selectedFeatures: string[]): Promise<FeatureDependencyValidationResponse> {
    try {
      const res = await fetch('/api/v1/server/onboarding/validate-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedFeatures })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {}
    return this.validateFeatureDependenciesClient(selectedFeatures);
  }

  public async submitInstanceRequest(payload: {
    instanceType: UniversalInstanceType;
    organization: CustomerOrganizationInfo;
    schoolCategory?: SchoolCategory;
    customArchitecture?: CustomArchitectureSpec;
    featureCollection?: FeatureCollectionSpec;
    selectedModules: string[];
    databaseStrategy?: string;
    storageStrategy?: string;
    storageProvider?: string;
    subdomain: string;
    customDomain?: string;
    billingModel: 'monthly' | 'yearly' | 'lease_to_own';
    monthlyPriceNGN: number;
    paymentProvider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire';
    paymentReference: string;
    amountPaidNGN: number;
  }): Promise<UniversalInstanceRecord> {
    try {
      const res = await fetch('/api/v1/server/onboarding/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSuperAdminAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        this.instances.unshift(json.data);
        return json.data;
      }
    } catch {}

    // Fallback local creation
    const cleanSubdomain = payload.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanId = cleanSubdomain.replace(/[^a-z0-9]/g, '_');
    const instanceId = `inst_${cleanId}_${Date.now().toString(16).substring(2, 6)}`;
    const newRecord: UniversalInstanceRecord = {
      requestId: `req_${Date.now()}`,
      instanceId,
      tenantId: `cust_${cleanId}`,
      instanceType: payload.instanceType,
      organization: payload.organization,
      applicationFamily: payload.instanceType === 'full_school_management' ? 'curriculum_flow_erp' : 'custom_curriculum_stack',
      schoolCategory: payload.schoolCategory,
      customArchitecture: payload.customArchitecture,
      featureCollection: payload.featureCollection,
      selectedModules: payload.selectedModules,
      databaseStrategy: (payload.databaseStrategy as any) || 'shared_schema_isolated',
      storageStrategy: (payload.storageStrategy as any) || 'platform_storage',
      storageProvider: (payload.storageProvider as any) || 'google_cloud_storage',
      subdomain: `${cleanSubdomain}.curriculumflow.com.ng`,
      customDomain: payload.customDomain,
      billingModel: payload.billingModel,
      monthlyPriceNGN: payload.monthlyPriceNGN,
      payment: {
        provider: payload.paymentProvider,
        transactionReference: payload.paymentReference,
        amountNGN: payload.amountPaidNGN,
        paymentStatus: 'pending',
        billingModel: payload.billingModel
      },
      provisioningStatus: payload.instanceType === 'custom_architecture' ? 'pending_review' : 'payment_pending',
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
    return newRecord;
  }

  public async initializePayment(
    provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire',
    amountNGN: number,
    customerEmail: string,
    customerName: string,
    instanceType: string,
    billingModel: 'monthly' | 'yearly' | 'lease_to_own'
  ): Promise<PaymentInitializationResponse> {
    const res = await fetch('/api/v1/server/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, amountNGN, customerEmail, customerName, instanceType, billingModel })
    });
    if (!res.ok) {
      throw new Error('Failed to initialize payment gateway checkout.');
    }
    const json = await res.json();
    return json.data;
  }

  public async verifyPayment(
    instanceId: string,
    reference: string,
    provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire',
    amountNGN: number
  ): Promise<PaymentVerificationResponse> {
    const res = await fetch('/api/v1/server/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSuperAdminAuthHeader()
      },
      body: JSON.stringify({ instanceId, reference, provider, amountNGN })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed at provider gateway.');
    }
    const json = await res.json();
    await this.syncFromBackend();
    return json.data;
  }

  public async reviewInstanceRequest(requestId: string, approved: boolean, notes: string): Promise<UniversalInstanceRecord> {
    const res = await fetch(`/api/v1/server/onboarding/requests/${requestId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSuperAdminAuthHeader()
      },
      body: JSON.stringify({ approved, adminNotes: notes, reviewerEmail: 'admin@curriculumserver.com.ng' })
    });
    if (!res.ok) {
      throw new Error('Failed to submit architecture review decision.');
    }
    const json = await res.json();
    await this.syncFromBackend();
    return json.data;
  }

  public async provisionInstance(instanceId: string): Promise<UniversalInstanceRecord> {
    const res = await fetch(`/api/v1/server/onboarding/requests/${instanceId}/provision`, {
      method: 'POST',
      headers: {
        ...getSuperAdminAuthHeader()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Provisioning execution failed.');
    }
    const json = await res.json();
    await this.syncFromBackend();
    return json.data;
  }

  public async activateInstance(instanceId: string): Promise<InstanceActivationResponse> {
    const res = await fetch(`/api/v1/server/onboarding/requests/${instanceId}/activate`, {
      method: 'POST',
      headers: {
        ...getSuperAdminAuthHeader()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Instance activation failed mandatory verification checks.');
    }
    const json = await res.json();
    await this.syncFromBackend();
    return json.data;
  }
}

export const customerOnboardingClient = CustomerOnboardingClient.getInstance();
