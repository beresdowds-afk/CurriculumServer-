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
import { unifiedApiClient } from './unifiedApiClient';
import { DeploymentTargetOption } from '../types/iiapEngine';

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
  }

  public static getInstance(): CustomerOnboardingClient {
    if (!CustomerOnboardingClient.instance) {
      CustomerOnboardingClient.instance = new CustomerOnboardingClient();
    }
    return CustomerOnboardingClient.instance;
  }

  public async syncFromBackend(): Promise<void> {
    const json = await unifiedApiClient.requestAuthenticatedControlPlane<{ success: boolean; data: UniversalInstanceRecord[] }>(
      '/api/v1/server/onboarding/requests',
      { method: 'GET' }
    );
    if (Array.isArray(json.data)) {
      this.instances = json.data;
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
  }): Promise<UniversalInstanceRecord> {
    const json = await unifiedApiClient.requestAuthenticatedControlPlane<{ success: boolean; data: UniversalInstanceRecord }>(
      '/api/v1/server/onboarding/request',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    this.instances.unshift(json.data);
    return json.data;
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
      },
      body: JSON.stringify({ instanceId, reference, provider, amountNGN })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.error || 'Payment verification failed at provider gateway.'), {
        status: res.status,
        correlationId: err.correlationId
      });
    }
    const json = await res.json();
    return json.data;
  }

  public async reviewInstanceRequest(requestId: string, approved: boolean, notes: string): Promise<UniversalInstanceRecord> {
    const json = await unifiedApiClient.requestAuthenticatedControlPlane<{ success: boolean; data: UniversalInstanceRecord }>(
      `/api/v1/server/onboarding/requests/${requestId}/review`,
      { method: 'POST', body: JSON.stringify({ approved, adminNotes: notes }) }
    );
    await this.syncFromBackend();
    return json.data;
  }

  public async provisionInstance(instanceId: string): Promise<UniversalInstanceRecord> {
    const json = await unifiedApiClient.requestAuthenticatedControlPlane<{ success: boolean; data: UniversalInstanceRecord }>(
      `/api/v1/server/onboarding/requests/${instanceId}/provision`,
      { method: 'POST' }
    );
    await this.syncFromBackend();
    return json.data;
  }

  public async activateInstance(instanceId: string): Promise<InstanceActivationResponse> {
    const json = await unifiedApiClient.requestAuthenticatedControlPlane<{ success: boolean; data: InstanceActivationResponse }>(
      `/api/v1/server/onboarding/requests/${instanceId}/activate`,
      { method: 'POST' }
    );
    await this.syncFromBackend();
    return json.data;
  }
}

export const customerOnboardingClient = CustomerOnboardingClient.getInstance();
