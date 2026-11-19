import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mock, test } from 'node:test';
import {
  initializeProviderPayment,
  normalizeProviderWebhook,
  ProviderIntegrationError,
  verifyProviderWebhookSignature
} from './billingPaymentsProviders';

const SECRET_NAMES = [
  'BILLING_PAYMENTS_ENABLED',
  'BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL',
  'PAYSTACK_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET_HASH',
  'OPAY_SECRET_KEY',
  'INTERSWITCH_WEBHOOK_SECRET',
  'BANK_TRANSFER_WEBHOOK_SECRET'
] as const;

function withEnv(values: Partial<Record<typeof SECRET_NAMES[number], string>>, operation: () => void | Promise<void>) {
  const previous = Object.fromEntries(SECRET_NAMES.map(name => [name, process.env[name]]));
  for (const name of SECRET_NAMES) delete process.env[name];
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  return Promise.resolve(operation()).finally(() => {
    for (const name of SECRET_NAMES) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
}

function signature(algorithm: string, key: string, body: Buffer): string {
  return createHmac(algorithm, key).update(body).digest('hex');
}

test('provider webhooks verify the exact raw payload using provider-specific authentication', async () => {
  const body = Buffer.from('{"event":"charge.success","data":{"reference":"cs_ref","amount":4500}}');
  await withEnv({
    PAYSTACK_SECRET_KEY: 'paystack-test-secret',
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: 'flutterwave-test-hash',
    OPAY_SECRET_KEY: 'opay-test-secret',
    INTERSWITCH_WEBHOOK_SECRET: 'interswitch-test-secret',
    BANK_TRANSFER_WEBHOOK_SECRET: 'approved-bank-test-secret'
  }, () => {
    assert.equal(verifyProviderWebhookSignature('paystack', body, {
      'x-paystack-signature': signature('sha512', 'paystack-test-secret', body)
    }), true);
    assert.equal(verifyProviderWebhookSignature('flutterwave', body, {
      'verif-hash': 'flutterwave-test-hash'
    }), true);
    assert.equal(verifyProviderWebhookSignature('opay', body, {
      sha512: signature('sha3-512', 'opay-test-secret', body)
    }), true);
    assert.equal(verifyProviderWebhookSignature('interswitch', body, {
      'x-interswitch-signature': signature('sha512', 'interswitch-test-secret', body)
    }), true);
    assert.equal(verifyProviderWebhookSignature('bank_transfer', body, {
      'x-bank-transfer-signature': signature('sha256', 'approved-bank-test-secret', body)
    }), true);
    assert.equal(verifyProviderWebhookSignature('paystack', Buffer.from(`${body.toString()} `), {
      'x-paystack-signature': signature('sha512', 'paystack-test-secret', body)
    }), false);
  });
});

test('provider callback amount units are normalized without inventing defaults', () => {
  const paystack = normalizeProviderWebhook('paystack', {
    event: 'charge.success',
    data: { id: 8, reference: 'cs_1', amount: 12500, currency: 'NGN', status: 'success' }
  });
  const flutterwave = normalizeProviderWebhook('flutterwave', {
    event: 'charge.completed',
    data: { id: 9, tx_ref: 'cs_2', amount: '125.00', currency: 'NGN', status: 'successful' }
  });
  assert.equal(paystack.amountMinor, 12500);
  assert.equal(flutterwave.amountMinor, 12500);
  assert.equal(paystack.status, 'settled');
  assert.equal(normalizeProviderWebhook('paystack', {
    data: { reference: 'cs_3', amount: 12500, status: 'failed' }
  }).status, 'failed');
  assert.throws(() => normalizeProviderWebhook('paystack', {
    data: { reference: 'cs_3', amount: 'not-money', status: 'success' }
  }), ProviderIntegrationError);
});

test('Paystack initialization calls the provider API and returns its real checkout URL', async () => {
  const previousFetch = globalThis.fetch;
  const fetchMock = mock.method(globalThis, 'fetch', async (input, init) => {
    assert.equal(String(input), 'https://api.paystack.co/transaction/initialize');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer paystack-test-secret');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.amount, 12500);
    assert.equal(body.reference, 'cs_ref_123');
    return new Response(JSON.stringify({
      status: true,
      data: { authorization_url: 'https://checkout.paystack.com/provider-response', reference: 'cs_ref_123' }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  try {
    await withEnv({
      BILLING_PAYMENTS_ENABLED: 'true',
      BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL: 'https://api.example.test',
      PAYSTACK_SECRET_KEY: 'paystack-test-secret'
    }, async () => {
      const checkout = await initializeProviderPayment('paystack', {
        reference: 'cs_ref_123',
        amountMinor: 12500,
        currency: 'NGN',
        email: 'payer@example.test',
        description: 'School subscription',
        tenantId: 'tenant-uuid',
        invoiceNumber: 'INV-1',
        callbackUrl: 'https://app.example.test/payment-return'
      });
      assert.equal(checkout.authorizationUrl, 'https://checkout.paystack.com/provider-response');
      assert.equal(fetchMock.mock.callCount(), 1);
    });
  } finally {
    fetchMock.mock.restore();
    globalThis.fetch = previousFetch;
  }
});

test('payment initialization remains disabled until staging approval is explicitly enabled', async () => {
  await withEnv({
    BILLING_PAYMENTS_ENABLED: 'false',
    BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL: 'https://api.example.test',
    PAYSTACK_SECRET_KEY: 'paystack-test-secret'
  }, async () => {
    await assert.rejects(
      initializeProviderPayment('paystack', {
        reference: 'cs_ref_123',
        amountMinor: 12500,
        currency: 'NGN',
        email: 'payer@example.test',
        description: 'School subscription',
        tenantId: 'tenant-uuid',
        invoiceNumber: 'INV-1',
        callbackUrl: 'https://app.example.test/payment-return'
      }),
      error => error instanceof ProviderIntegrationError && error.code === 'PROVIDER_NOT_CONFIGURED'
    );
  });
});
