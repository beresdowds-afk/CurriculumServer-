import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { parseSettlementRequest } from './schoolSettlementAccounts';
import {
  accountNamesMatch,
  createSettlementProviderAdapters,
  SettlementProviderError
} from './settlementProviderAdapters';

const request = {
  provider: 'opay', bankName: 'Example bank', bankCode: '999', accountName: 'Example school',
  accountNumber: '1234567890'
};

test('settlement account input rejects unsupported providers, credentials and malformed NUBANs', () => {
  assert.equal(parseSettlementRequest(request).details.accountNumber, request.accountNumber);
  for (const invalid of [
    { ...request, provider: 'bank_transfer' },
    { ...request, secret: 'must-not-be-accepted' },
    { ...request, accountNumber: '1234' },
    { ...request, accountNumber: 1234567890 },
    { ...request, bankName: ' \n ' }
  ]) {
    assert.throws(() => parseSettlementRequest(invalid), /invalid|unsupported|NUBAN/i);
  }
});

test('settlement provider adapters fail closed when credentials are missing', async () => {
  const savedPaystack = process.env.PAYSTACK_SECRET_KEY;
  const savedFlw = process.env.FLUTTERWAVE_SECRET_KEY;
  const savedOpayKey = process.env.OPAY_SECRET_KEY;
  const savedOpayMerchant = process.env.OPAY_MERCHANT_ID;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.FLUTTERWAVE_SECRET_KEY;
  delete process.env.OPAY_SECRET_KEY;
  delete process.env.OPAY_MERCHANT_ID;

  try {
    const adapters = createSettlementProviderAdapters();
    for (const provider of ['paystack', 'flutterwave', 'opay'] as const) {
      await assert.rejects(
        adapters[provider].verifyAndRegister({
          tenantId: randomUUID(),
          schoolId: randomUUID(),
          requestId: randomUUID(),
          provider,
          details: {
            bankName: 'First Bank',
            bankCode: '011',
            accountName: 'Bright Future Academy',
            accountNumber: '0123456789'
          }
        }),
        err => err instanceof SettlementProviderError && err.code === 'PROVIDER_NOT_CONFIGURED'
      );
    }
  } finally {
    if (savedPaystack !== undefined) process.env.PAYSTACK_SECRET_KEY = savedPaystack;
    if (savedFlw !== undefined) process.env.FLUTTERWAVE_SECRET_KEY = savedFlw;
    if (savedOpayKey !== undefined) process.env.OPAY_SECRET_KEY = savedOpayKey;
    if (savedOpayMerchant !== undefined) process.env.OPAY_MERCHANT_ID = savedOpayMerchant;
  }
});

test('Paystack, Flutterwave, and OPay adapters verify accounts, check account names, and verify signatures', async () => {
  const prevEnv = {
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    OPAY_SECRET_KEY: process.env.OPAY_SECRET_KEY,
    OPAY_MERCHANT_ID: process.env.OPAY_MERCHANT_ID
  };
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack_secret';
  process.env.FLUTTERWAVE_SECRET_KEY = 'flw_secret_test';
  process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = 'flw_hash_secret';
  process.env.OPAY_SECRET_KEY = 'opay_hmac_secret';
  process.env.OPAY_MERCHANT_ID = 'OPAY_MERCHANT_001';

  const calls: string[] = [];
  const fakeFetch: typeof fetch = (async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('api.paystack.co/bank/resolve')) {
      return new Response(JSON.stringify({ status: true, data: { account_name: 'BRIGHT FUTURE ACADEMY LTD' } }), { status: 200 });
    }
    if (url.includes('api.paystack.co/transferrecipient')) {
      return new Response(JSON.stringify({ status: true, data: { recipient_code: 'RCP_12345' } }), { status: 200 });
    }
    if (url.includes('api.flutterwave.com/v3/accounts/resolve')) {
      return new Response(JSON.stringify({ status: 'success', data: { account_name: 'BRIGHT FUTURE ACADEMY' } }), { status: 200 });
    }
    if (url.includes('api.flutterwave.com/v3/beneficiaries')) {
      return new Response(JSON.stringify({ status: 'success', data: { id: 9876 } }), { status: 200 });
    }
    if (url.includes('/api/v3/transfer/bankAccountVerify')) {
      return new Response(JSON.stringify({
        code: '00000',
        data: { bankAccountName: 'BRIGHT FUTURE ACADEMY', verificationId: 'opay_ver_555' }
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 404 });
  }) as typeof fetch;

  try {
    const adapters = createSettlementProviderAdapters(fakeFetch);
    const details = {
      bankName: 'First Bank',
      bankCode: '011',
      accountName: 'Bright Future Academy',
      accountNumber: '0123456789'
    };

    const pRes = await adapters.paystack.verifyAndRegister({
      tenantId: randomUUID(), schoolId: randomUUID(), requestId: randomUUID(), provider: 'paystack', details
    });
    assert.equal(pRes.providerReference, 'RCP_12345');

    const fRes = await adapters.flutterwave.verifyAndRegister({
      tenantId: randomUUID(), schoolId: randomUUID(), requestId: randomUUID(), provider: 'flutterwave', details
    });
    assert.equal(fRes.providerReference, 'flw_ben_9876');

    const oRes = await adapters.opay.verifyAndRegister({
      tenantId: randomUUID(), schoolId: randomUUID(), requestId: randomUUID(), provider: 'opay', details
    });
    assert.equal(oRes.providerReference, 'opay_ver_555');
    assert.equal(calls.length, 5);

    await assert.rejects(
      adapters.paystack.verifyAndRegister({
        tenantId: randomUUID(),
        schoolId: randomUUID(),
        requestId: randomUUID(),
        provider: 'paystack',
        details: { ...details, accountName: 'Completely Different Entity' }
      }),
      err => err instanceof SettlementProviderError && err.code === 'ACCOUNT_NAME_MISMATCH'
    );

    const payload = Buffer.from(JSON.stringify({ event: 'transferrecipient.verified', data: { status: 'verified' } }), 'utf8');
    const paystackSig = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(payload).digest('hex');
    assert.equal(adapters.paystack.verifyCallbackSignature(payload, { 'x-paystack-signature': paystackSig }), true);
    assert.equal(adapters.paystack.verifyCallbackSignature(payload, { 'x-paystack-signature': '00'.repeat(64) }), false);

    assert.equal(adapters.flutterwave.verifyCallbackSignature(payload, { 'verif-hash': 'flw_hash_secret' }), true);
    assert.equal(adapters.flutterwave.verifyCallbackSignature(payload, { 'verif-hash': 'wrong_secret' }), false);

    const opaySig = createHmac('sha512', process.env.OPAY_SECRET_KEY!).update(payload).digest('hex');
    assert.equal(adapters.opay.verifyCallbackSignature(payload, { sha512: opaySig }), true);
    assert.equal(adapters.opay.verifyCallbackSignature(payload, { sha512: 'deadbeef' }), false);
    assert.equal(accountNamesMatch('St. Mary School', 'ST MARY SCHOOL ABUJA'), true);
  } finally {
    for (const [key, val] of Object.entries(prevEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  }
});
