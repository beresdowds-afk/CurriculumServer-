import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  SchoolPaymentProvider,
  SchoolPaymentProviderProvisioningContract
} from '../packages/shared-types/src/apiContracts';

export type PaymentProviderCredentialBundle = Record<string, string>;

export interface ProviderOnboardingEvidence {
  providerResponseReference: string;
  merchantReference: string;
  accountReference: string;
  subaccountReference?: string;
  settlementAccountReference?: string;
  settlementAccountVerified: boolean;
  webhookRegistrationReference: string;
  webhookSignatureConfigured: boolean;
  verifiedCapabilities: string[];
  healthy: boolean;
  accountStatus: 'active' | 'suspended' | 'revoked';
}

export interface PaymentProviderAdapter {
  provision(
    request: SchoolPaymentProviderProvisioningContract,
    credentials: PaymentProviderCredentialBundle
  ): Promise<ProviderOnboardingEvidence>;
  rotateCredentials(
    request: SchoolPaymentProviderProvisioningContract,
    credentials: PaymentProviderCredentialBundle
  ): Promise<ProviderOnboardingEvidence>;
  healthCheck(
    request: SchoolPaymentProviderProvisioningContract,
    credentials: PaymentProviderCredentialBundle
  ): Promise<ProviderOnboardingEvidence>;
  suspend(
    request: SchoolPaymentProviderProvisioningContract,
    credentials: PaymentProviderCredentialBundle
  ): Promise<ProviderOnboardingEvidence>;
  revoke(
    request: SchoolPaymentProviderProvisioningContract,
    credentials: PaymentProviderCredentialBundle
  ): Promise<ProviderOnboardingEvidence>;
}

export type PaymentProviderAdapters = Record<SchoolPaymentProvider, PaymentProviderAdapter>;

export interface RuntimeTokenProvider {
  getAccessToken(): Promise<string>;
  getIdentityToken(audience: string): Promise<string>;
}

export interface SecretManager {
  readSecretVersion(resourceName: string): Promise<string>;
  addSecretVersion(secretName: string, value: string): Promise<string>;
}

export interface BillingPaymentsClient {
  synchronizeProviderAccount(input: {
    operationId: string;
    tenantId: string;
    schoolId: string;
    provider: SchoolPaymentProvider;
    operation: SchoolPaymentProviderProvisioningContract['operation'];
    providerAccount: ProviderOnboardingEvidence;
    credentialSecretVersion: string;
  }): Promise<void>;
}

export interface ProvisioningResult {
  operationId: string;
  tenantId: string;
  schoolId: string;
  provider: SchoolPaymentProvider;
  operation: SchoolPaymentProviderProvisioningContract['operation'];
  credentialSecretVersion: string;
  providerAccount: ProviderOnboardingEvidence;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_VERSION = /^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/secrets\/curriculum-payment-(?:intake-)?([0-9a-f-]{36})-(paystack|flutterwave|opay|interswitch|bank_transfer)(?:-[0-9a-f]{12})?\/versions\/[1-9][0-9]*$/;
const PROVIDERS: readonly SchoolPaymentProvider[] = [
  'paystack', 'flutterwave', 'opay', 'interswitch', 'bank_transfer'
];
const OPERATIONS = ['onboard', 'rotate_credentials', 'health_check', 'suspend', 'revoke'] as const;

function assertContract(
  request: SchoolPaymentProviderProvisioningContract,
  signature: string,
  signingKey: string
): void {
  if (signingKey.length < 32 || !/^[0-9a-f]{64}$/i.test(signature)) {
    throw new Error('PAYMENT_PROVIDER_CONTRACT_AUTHORIZATION_UNAVAILABLE');
  }
  const expected = createHmac('sha256', signingKey)
    .update(JSON.stringify(request), 'utf8')
    .digest();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('PAYMENT_PROVIDER_CONTRACT_SIGNATURE_INVALID');
  }
  if (request.schemaVersion !== 1 || !request.operationId.trim() ||
      !request.idempotencyKey.trim() || !UUID.test(request.tenantId) ||
      !UUID.test(request.schoolId) || !PROVIDERS.includes(request.provider) ||
      !OPERATIONS.includes(request.operation)) {
    throw new Error('INVALID_PAYMENT_PROVIDER_PROVISIONING_CONTRACT');
  }
  if (request.approval.status !== 'approved' || !request.approval.piamApprovalId.trim() ||
      !request.approval.approverIdentity.trim()) {
    throw new Error('PIAM_APPROVAL_REQUIRED');
  }
  const now = Date.now();
  const approvedAt = Date.parse(request.approval.approvedAt);
  const expiresAt = Date.parse(request.approval.expiresAt);
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) ||
      approvedAt > now || expiresAt <= now || expiresAt <= approvedAt) {
    throw new Error('PIAM_APPROVAL_EXPIRED_OR_INVALID');
  }
  if (!SECRET_VERSION.test(request.credentialSecretVersion)) {
    throw new Error('INVALID_CREDENTIAL_SECRET_REFERENCE');
  }
  const secretTenantId = SECRET_VERSION.exec(request.credentialSecretVersion)?.[1];
  const secretProvider = SECRET_VERSION.exec(request.credentialSecretVersion)?.[2];
  if (secretTenantId?.toLowerCase() !== request.tenantId.toLowerCase() ||
      secretProvider !== request.provider) {
    throw new Error('CROSS_TENANT_CREDENTIAL_REFERENCE');
  }
  if (!request.configuration.merchantName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.configuration.merchantEmail) ||
      new URL(request.configuration.webhookUrl).protocol !== 'https:' ||
      request.configuration.requestedCapabilities.length === 0 ||
      request.configuration.requestedCapabilities.some(capability => !capability.trim())) {
    throw new Error('INVALID_PROVIDER_CONFIGURATION');
  }
}

function parseCredentialBundle(value: string): PaymentProviderCredentialBundle {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_PROVIDER_CREDENTIAL_BUNDLE');
  }
  const entries = Object.entries(parsed);
  if (entries.length === 0 || entries.some(([key, secret]) =>
    !key.trim() || typeof secret !== 'string' || secret.length === 0
  )) {
    throw new Error('INVALID_PROVIDER_CREDENTIAL_BUNDLE');
  }
  return Object.fromEntries(entries) as PaymentProviderCredentialBundle;
}

function validateEvidence(
  request: SchoolPaymentProviderProvisioningContract,
  evidence: ProviderOnboardingEvidence
): void {
  const requiredReferences = [
    evidence.providerResponseReference,
    evidence.merchantReference,
    evidence.accountReference,
    evidence.webhookRegistrationReference
  ];
  if (requiredReferences.some(reference => !reference?.trim()) ||
      !evidence.settlementAccountVerified || !evidence.webhookSignatureConfigured ||
      !evidence.healthy ||
      !request.configuration.requestedCapabilities.every(capability =>
        evidence.verifiedCapabilities.includes(capability)
      )) {
    throw new Error('PROVIDER_VERIFICATION_INCOMPLETE');
  }
  if (request.configuration.requestedCapabilities.includes('subaccounts') &&
      !evidence.subaccountReference?.trim()) {
    throw new Error('PROVIDER_SUBACCOUNT_NOT_VERIFIED');
  }
  if ((request.configuration.providerAccountReference &&
       request.configuration.providerAccountReference !== evidence.accountReference) ||
      (request.configuration.settlementAccountReference &&
       request.configuration.settlementAccountReference !== evidence.settlementAccountReference)) {
    throw new Error('PROVIDER_ACCOUNT_REFERENCE_MISMATCH');
  }
  if (request.operation === 'suspend' && evidence.accountStatus !== 'suspended') {
    throw new Error('PROVIDER_SUSPENSION_NOT_VERIFIED');
  }
  if (request.operation === 'revoke' && evidence.accountStatus !== 'revoked') {
    throw new Error('PROVIDER_REVOCATION_NOT_VERIFIED');
  }
  if (request.operation !== 'suspend' && request.operation !== 'revoke' &&
      evidence.accountStatus !== 'active') {
    throw new Error('PROVIDER_ACCOUNT_NOT_ACTIVE');
  }
}

export class PaymentProviderProvisioningService {
  constructor(
    private readonly adapters: Partial<PaymentProviderAdapters>,
    private readonly secretManager: SecretManager,
    private readonly billingPayments: BillingPaymentsClient,
    private readonly contractSigningKey: string
  ) {}

  async execute(
    request: SchoolPaymentProviderProvisioningContract,
    signature: string
  ): Promise<ProvisioningResult> {
    assertContract(request, signature, this.contractSigningKey);
    const adapter = this.adapters[request.provider];
    if (!adapter) {
      throw new Error(`PROVIDER_ADAPTER_UNAVAILABLE:${request.provider}`);
    }

    const credentials = parseCredentialBundle(
      await this.secretManager.readSecretVersion(request.credentialSecretVersion)
    );
    const adapterOperation = {
      onboard: 'provision',
      rotate_credentials: 'rotateCredentials',
      health_check: 'healthCheck',
      suspend: 'suspend',
      revoke: 'revoke'
    } as const;
    const evidence = await adapter[adapterOperation[request.operation]](
      request,
      credentials
    );
    validateEvidence(request, evidence);

    let credentialSecretVersion = request.credentialSecretVersion;
    if (request.operation === 'onboard' || request.operation === 'rotate_credentials') {
      const projectId = request.credentialSecretVersion.split('/')[1];
      const secretName = paymentProviderSecretName(projectId, request.tenantId, request.provider);
      credentialSecretVersion = await this.secretManager.addSecretVersion(
        secretName,
        JSON.stringify(credentials)
      );
    }

    await this.billingPayments.synchronizeProviderAccount({
      operationId: request.operationId,
      tenantId: request.tenantId,
      schoolId: request.schoolId,
      provider: request.provider,
      operation: request.operation,
      providerAccount: evidence,
      credentialSecretVersion
    });

    return {
      operationId: request.operationId,
      tenantId: request.tenantId,
      schoolId: request.schoolId,
      provider: request.provider,
      operation: request.operation,
      credentialSecretVersion,
      providerAccount: evidence
    };
  }
}

export class GoogleRuntimeTokenProvider implements RuntimeTokenProvider {
  async getAccessToken(): Promise<string> {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );
    if (!response.ok) throw new Error('GOOGLE_RUNTIME_ACCESS_TOKEN_UNAVAILABLE');
    const result = await response.json() as { access_token?: string };
    if (!result.access_token) throw new Error('GOOGLE_RUNTIME_ACCESS_TOKEN_INVALID');
    return result.access_token;
  }

  async getIdentityToken(audience: string): Promise<string> {
    const url = new URL(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity'
    );
    url.searchParams.set('audience', audience);
    url.searchParams.set('format', 'full');
    const response = await fetch(url, { headers: { 'Metadata-Flavor': 'Google' } });
    if (!response.ok) throw new Error('GOOGLE_RUNTIME_IDENTITY_TOKEN_UNAVAILABLE');
    const token = (await response.text()).trim();
    if (!token) throw new Error('GOOGLE_RUNTIME_IDENTITY_TOKEN_INVALID');
    return token;
  }
}

export class GoogleSecretManager implements SecretManager {
  constructor(
    private readonly projectId: string,
    private readonly tokens: RuntimeTokenProvider
  ) {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
      throw new Error('SECRET_MANAGER_PROJECT_ID_INVALID');
    }
  }

  async readSecretVersion(resourceName: string): Promise<string> {
    if (!resourceName.startsWith(`projects/${this.projectId}/`)) {
      throw new Error('CROSS_PROJECT_SECRET_REFERENCE');
    }
    const response = await fetch(
      `https://secretmanager.googleapis.com/v1/${resourceName}:access`,
      { headers: { Authorization: `Bearer ${await this.tokens.getAccessToken()}` } }
    );
    if (!response.ok) throw new Error('SECRET_MANAGER_ACCESS_FAILED');
    const result = await response.json() as { payload?: { data?: string } };
    if (!result.payload?.data) throw new Error('SECRET_MANAGER_PAYLOAD_MISSING');
    return Buffer.from(result.payload.data, 'base64').toString('utf8');
  }

  async addSecretVersion(secretName: string, value: string): Promise<string> {
    if (!secretName.startsWith(`projects/${this.projectId}/secrets/curriculum-payment-`)) {
      throw new Error('INVALID_TENANT_SECRET_NAME');
    }
    const response = await fetch(
      `https://secretmanager.googleapis.com/v1/${secretName}:addVersion`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await this.tokens.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payload: { data: Buffer.from(value, 'utf8').toString('base64') } })
      }
    );
    if (!response.ok) throw new Error('SECRET_MANAGER_VERSION_WRITE_FAILED');
    const result = await response.json() as { name?: string };
    const versionPrefix = `${secretName}/versions/`;
    if (!result.name?.startsWith(versionPrefix) ||
        !/^[1-9][0-9]*$/.test(result.name.slice(versionPrefix.length))) {
      throw new Error('SECRET_MANAGER_VERSION_REFERENCE_INVALID');
    }
    return result.name;
  }
}

export class AuthenticatedBillingPaymentsClient implements BillingPaymentsClient {
  private readonly baseUrl: URL;

  constructor(
    baseUrl: string,
    private readonly audience: string,
    private readonly tokens: RuntimeTokenProvider
  ) {
    this.baseUrl = new URL(baseUrl);
    if (this.baseUrl.protocol !== 'https:' || !audience) {
      throw new Error('BILLING_PAYMENTS_SERVICE_CONFIGURATION_INVALID');
    }
  }

  async synchronizeProviderAccount(
    input: Parameters<BillingPaymentsClient['synchronizeProviderAccount']>[0]
  ): Promise<void> {
    const response = await fetch(new URL('/internal/v1/payment-provider-accounts', this.baseUrl), {
      method: 'POST',
      headers: {
        'X-Serverless-Authorization': `Bearer ${await this.tokens.getIdentityToken(this.audience)}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.operationId
      },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      throw new Error(`BILLING_PAYMENTS_SYNC_FAILED:${response.status}`);
    }
  }
}

export function paymentProviderSecretName(
  projectId: string,
  tenantId: string,
  provider: SchoolPaymentProvider
): string {
  if (!UUID.test(tenantId) || !PROVIDERS.includes(provider)) {
    throw new Error('INVALID_TENANT_PROVIDER_SECRET_SCOPE');
  }
  const digest = createHash('sha256').update(`${tenantId}:${provider}`).digest('hex').slice(0, 12);
  return `projects/${projectId}/secrets/curriculum-payment-${tenantId.toLowerCase()}-${provider}-${digest}`;
}
