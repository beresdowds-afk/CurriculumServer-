import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { SchoolPaymentProviderProvisioningContract } from '../packages/shared-types/src/apiContracts';
import {
  PaymentProviderProvisioningService,
  GoogleSecretManager,
  paymentProviderSecretName,
  type BillingPaymentsClient,
  type RuntimeTokenProvider,
  type SecretManager
} from './paymentProviderProvisioning';

const tenantId = 'c0a80101-0000-4000-8000-000000000001';
const schoolId = 'c0a80101-0000-4000-8000-000000000002';
const signingKey = 'test-only-contract-signing-key-with-at-least-32-characters';

function request(
  overrides: Partial<SchoolPaymentProviderProvisioningContract> = {}
): SchoolPaymentProviderProvisioningContract {
  return {
    schemaVersion: 1,
    operationId: 'operation-123',
    idempotencyKey: 'idempotency-123',
    tenantId,
    schoolId,
    provider: 'paystack',
    operation: 'onboard',
    credentialSecretVersion:
      `projects/curriculum-prod/secrets/curriculum-payment-intake-${tenantId}-paystack/versions/1`,
    approval: {
      status: 'approved',
      piamApprovalId: 'piam-approval-reference',
      approverIdentity: 'approver@school.example',
      approvedAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    },
    configuration: {
      merchantName: 'Example School',
      merchantEmail: 'finance@school.example',
      webhookUrl: 'https://school.example/webhooks/payments',
      requestedCapabilities: ['collections']
    },
    ...overrides
  };
}

function sign(contract: SchoolPaymentProviderProvisioningContract): string {
  return createHmac('sha256', signingKey).update(JSON.stringify(contract)).digest('hex');
}

function dependencies(): {
  secretManager: SecretManager;
  billingPayments: BillingPaymentsClient;
} {
  return {
    secretManager: {
      async readSecretVersion() {
        throw new Error('Secret access must not occur in this test.');
      },
      async addSecretVersion() {
        throw new Error('Secret writes must not occur in this test.');
      }
    },
    billingPayments: {
      async synchronizeProviderAccount() {
        throw new Error('Billing sync must not occur in this test.');
      }
    }
  };
}

test('rejects unsigned provisioning contracts before reading credentials', async () => {
  const deps = dependencies();
  const service = new PaymentProviderProvisioningService({}, deps.secretManager, deps.billingPayments, signingKey);

  await assert.rejects(
    service.execute(request(), '0'.repeat(64)),
    /PAYMENT_PROVIDER_CONTRACT_SIGNATURE_INVALID/
  );
});

test('rejects a credential secret reference belonging to another tenant', async () => {
  const deps = dependencies();
  const service = new PaymentProviderProvisioningService({}, deps.secretManager, deps.billingPayments, signingKey);
  const contract = request({
    credentialSecretVersion:
      'projects/curriculum-prod/secrets/curriculum-payment-intake-c0a80101-0000-4000-8000-000000000099-paystack/versions/1'
  });

  await assert.rejects(service.execute(contract, sign(contract)), /CROSS_TENANT_CREDENTIAL_REFERENCE/);
});

test('does not imply provider provisioning success when its adapter is absent', async () => {
  const deps = dependencies();
  const service = new PaymentProviderProvisioningService({}, deps.secretManager, deps.billingPayments, signingKey);
  const contract = request();

  await assert.rejects(service.execute(contract, sign(contract)), /PROVIDER_ADAPTER_UNAVAILABLE:paystack/);
});

test('derives distinct tenant and provider Secret Manager resources', () => {
  const first = paymentProviderSecretName('curriculum-prod', tenantId, 'paystack');
  const secondTenant = paymentProviderSecretName(
    'curriculum-prod',
    'c0a80101-0000-4000-8000-000000000099',
    'paystack'
  );
  const secondProvider = paymentProviderSecretName('curriculum-prod', tenantId, 'flutterwave');

  assert.notEqual(first, secondTenant);
  assert.notEqual(first, secondProvider);
});

test('reads and registers credentials through Secret Manager without exposing plaintext in request metadata', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    if (url.endsWith(':access')) {
      return new Response(JSON.stringify({
        payload: { data: Buffer.from('{"apiKey":"test-credential"}').toString('base64') }
      }), { status: 200 });
    }
    const secretName = new URL(url).pathname
      .replace(/^\/v1\//, '')
      .replace(/:addVersion$/, '');
    return new Response(JSON.stringify({
      name: `${secretName}/versions/1`
    }), { status: 200 });
  }) as typeof fetch;

  const tokens: RuntimeTokenProvider = {
    async getAccessToken() { return 'runtime-access-token'; },
    async getIdentityToken() { return 'runtime-identity-token'; }
  };
  const secretManager = new GoogleSecretManager('curriculum-prod', tokens);

  try {
    const secretName =
      'projects/curriculum-prod/secrets/curriculum-payment-c0a80101-0000-4000-8000-000000000001-paystack-0123456789ab';
    const value = await secretManager.readSecretVersion(`${secretName}/versions/1`);
    const registeredVersion = await secretManager.addSecretVersion(secretName, value);

    assert.equal(value, '{"apiKey":"test-credential"}');
    assert.equal(registeredVersion, `${secretName}/versions/1`);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call =>
      new Headers(call.init?.headers).get('authorization') === 'Bearer runtime-access-token'
    ));
    assert.equal(
      JSON.parse(String(calls[1].init?.body)).payload.data,
      Buffer.from(value).toString('base64')
    );
    assert.equal(calls[1].url.includes(value), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
