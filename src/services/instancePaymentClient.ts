/**
 * Instance Payment Client Service
 * Connects frontend UI to backend production payment engines for
 * both Curriculum Server platform and provisioned tenant instances.
 */

export interface InstancePaymentInitParams {
  feeCategory: 'tuition' | 'admissions_application' | 'cbt_exam_pass' | 'development_levy' | 'custom_levy';
  amountNGN: number;
  payerEmail: string;
  payerName: string;
  payerPhone?: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  applicantId?: string;
  targetClass?: string;
  cbtExamCode?: string;
  provider: 'paystack' | 'opay' | 'flutterwave' | 'bank_wire';
  term?: string;
  notes?: string;
}

export interface InstancePaymentVerificationParams {
  reference: string;
  provider: 'paystack' | 'opay' | 'flutterwave' | 'bank_wire';
  amountNGN: number;
  feeCategory?: string;
  payerName?: string;
  payerEmail?: string;
  studentName?: string;
  admissionNumber?: string;
  applicantId?: string;
  targetClass?: string;
  cbtExamCode?: string;
}

export class InstancePaymentClient {
  private static instance: InstancePaymentClient;

  private constructor() {}

  public static getInstance(): InstancePaymentClient {
    if (!InstancePaymentClient.instance) {
      InstancePaymentClient.instance = new InstancePaymentClient();
    }
    return InstancePaymentClient.instance;
  }

  public async getInstanceProfile(instanceId: string): Promise<any> {
    const res = await fetch(`/api/v1/instances/${instanceId}/payments/profile`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load instance payment profile');
    return data.data;
  }

  public async initializePayment(instanceId: string, params: InstancePaymentInitParams): Promise<any> {
    const res = await fetch(`/api/v1/instances/${instanceId}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Payment initialization failed');
    return data.data;
  }

  public async verifyPayment(instanceId: string, params: InstancePaymentVerificationParams): Promise<any> {
    const res = await fetch(`/api/v1/instances/${instanceId}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Payment verification failed');
    return data.data;
  }

  public async getReceipt(instanceId: string, receiptNumber: string): Promise<any> {
    const res = await fetch(`/api/v1/instances/${instanceId}/receipts/${receiptNumber}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Receipt lookup failed');
    return data.data;
  }

  public async getTransactions(instanceId: string): Promise<any[]> {
    const res = await fetch(`/api/v1/instances/${instanceId}/payments/transactions`);
    const data = await res.json();
    if (!data.success) return [];
    return data.data || [];
  }

  public async getProductionReadinessReport(): Promise<any> {
    const res = await fetch('/api/v1/server/payments/readiness-report');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch readiness report');
    return data.data;
  }

  public async runReadinessTests(): Promise<any> {
    const res = await fetch('/api/v1/server/payments/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to run readiness tests');
    return data.data;
  }
}

export const instancePaymentClient = InstancePaymentClient.getInstance();
