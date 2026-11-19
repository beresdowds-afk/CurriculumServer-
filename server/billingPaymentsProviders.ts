import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type BillingPaymentProvider =
  | 'paystack'
  | 'flutterwave'
  | 'opay'
  | 'interswitch'
  | 'bank_transfer';

export interface PaymentInitialization {
  reference: string;
  amountMinor: number;
  currency: string;
  email: string;
  description: string;
  tenantId: string;
  invoiceNumber: string;
  callbackUrl: string;
}

export interface ProviderCheckout {
  authorizationUrl: string;
  providerTransactionId?: string;
}

export interface VerifiedProviderPayment {
  reference: string;
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  status: 'settled' | 'failed' | 'pending';
  providerStatus: string;
  settlementId: string;
}

export interface VerifiedWebhook {
  eventId: string;
  reference: string;
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  status: 'settled' | 'failed' | 'pending';
  providerStatus: string;
  settlementId: string;
}

export class ProviderIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: 'PROVIDER_NOT_CONFIGURED' | 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'ProviderIntegrationError';
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ProviderIntegrationError(
      `The ${name} Secret Manager value is not configured.`,
      'PROVIDER_NOT_CONFIGURED'
    );
  }
  return value;
}

function requirePaymentsEnabled(): void {
  if (process.env.BILLING_PAYMENTS_ENABLED !== 'true') {
    throw new ProviderIntegrationError(
      'Live payment initialization and refunds are disabled until staging verification is approved.',
      'PROVIDER_NOT_CONFIGURED'
    );
  }
}

function webhookUrl(provider: BillingPaymentProvider): string {
  const base = requiredEnv('BILLING_PAYMENTS_PUBLIC_WEBHOOK_BASE_URL').replace(/\/+$/, '');
  const url = new URL(`${base}/api/v1/server/payments/webhook/${provider}`);
  if (url.protocol !== 'https:') {
    throw new ProviderIntegrationError('Provider callbacks require an HTTPS URL.', 'PROVIDER_NOT_CONFIGURED');
  }
  return url.toString();
}

async function requestJson(
  url: string,
  init: RequestInit,
  provider: BillingPaymentProvider
): Promise<JsonRecord> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ProviderIntegrationError(`${provider} is temporarily unavailable.`, 'PROVIDER_UNAVAILABLE');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ProviderIntegrationError(`${provider} returned an invalid response.`, 'PROVIDER_UNAVAILABLE');
  }
  if (!response.ok || !isRecord(body)) {
    throw new ProviderIntegrationError(`${provider} rejected the payment request.`, 'PROVIDER_REJECTED');
  }
  return body;
}

function amountMinor(value: unknown, provider: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ProviderIntegrationError(`${provider} returned an invalid amount.`, 'PROVIDER_REJECTED');
  }
  return parsed;
}

function constantTimeHexMatch(expected: string, supplied: string | undefined): boolean {
  if (!supplied || !/^[a-f0-9]+$/i.test(supplied) || supplied.length !== expected.length) return false;
  const expectedBytes = Buffer.from(expected, 'hex');
  const suppliedBytes = Buffer.from(supplied, 'hex');
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function hmacHex(algorithm: string, key: string, value: string): string {
  return createHmac(algorithm, key).update(value, 'utf8').digest('hex');
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${sortedJson(value[key])}`
  ).join(',')}}`;
}

function eventStatus(value: unknown): 'settled' | 'failed' | 'pending' {
  const status = String(value || '').toLowerCase();
  if (['success', 'successful', 'completed', 'paid'].includes(status)) return 'settled';
  if (['failed', 'failure', 'declined', 'cancelled', 'canceled'].includes(status)) return 'failed';
  return 'pending';
}

export function verifyProviderWebhookSignature(
  provider: BillingPaymentProvider,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): boolean {
  const header = (name: string) => {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };
  const body = rawBody.toString('utf8');

  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    return Boolean(secret && constantTimeHexMatch(
      hmacHex('sha512', secret, body),
      header('x-paystack-signature')
    ));
  }
  if (provider === 'flutterwave') {
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    const supplied = header('verif-hash');
    if (!secret || !supplied) return false;
    const expectedBytes = Buffer.from(secret);
    const suppliedBytes = Buffer.from(supplied);
    return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
  }
  if (provider === 'opay') {
    const secret = process.env.OPAY_SECRET_KEY;
    const supplied = header('sha512');
    return Boolean(secret && constantTimeHexMatch(
      hmacHex('sha3-512', secret, body),
      supplied
    ));
  }
  if (provider === 'interswitch') {
    const secret = process.env.INTERSWITCH_WEBHOOK_SECRET;
    return Boolean(secret && constantTimeHexMatch(
      hmacHex('sha512', secret, body),
      header('x-interswitch-signature')
    ));
  }
  const secret = process.env.BANK_TRANSFER_WEBHOOK_SECRET;
  return Boolean(secret && constantTimeHexMatch(
    hmacHex('sha256', secret, body),
    header('x-bank-transfer-signature')
  ));
}

export function normalizeProviderWebhook(
  provider: BillingPaymentProvider,
  payload: unknown
): VerifiedWebhook {
  if (!isRecord(payload)) throw new ProviderIntegrationError('Invalid provider callback.', 'PROVIDER_REJECTED');
  const data = isRecord(payload.data) ? payload.data : payload;
  const metadata = isRecord(data.metadata) ? data.metadata : {};
  const reference = String(
    provider === 'flutterwave'
      ? data.tx_ref || data.reference || ''
      : data.reference || data.txn_ref || data.merchantReference || ''
  );
  const providerTransactionId = String(
    data.id || data.transactionId || data.paymentId || data.orderNo || reference
  );
  const currency = String(data.currency || data.currencyCode || 'NGN').toUpperCase();
  const rawAmount = data.amount ?? (isRecord(data.amount) ? data.amount.total : undefined);
  const amount = Number(rawAmount);
  const amountInMinor = provider === 'flutterwave'
    ? amountMinor(Math.round(amount * 100), provider)
    : amountMinor(amount, provider);
  const eventId = String(
    payload.id || data.eventId || data.event_id || data.paymentId ||
    `${provider}:${providerTransactionId}:${String(data.status || '')}`
  );
  void metadata;
  return {
    eventId,
    reference,
    providerTransactionId,
    amountMinor: amountInMinor,
    currency,
    status: eventStatus(data.status || data.responseCode),
    providerStatus: String(data.status || data.responseCode || 'unknown'),
    settlementId: providerTransactionId
  };
}

export async function initializeProviderPayment(
  provider: BillingPaymentProvider,
  payment: PaymentInitialization
): Promise<ProviderCheckout> {
  requirePaymentsEnabled();
  const callback = webhookUrl(provider);
  if (provider === 'paystack') {
    const body = await requestJson('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: payment.email,
        amount: payment.amountMinor,
        currency: payment.currency,
        reference: payment.reference,
        callback_url: payment.callbackUrl,
        metadata: { tenantId: payment.tenantId, invoiceNumber: payment.invoiceNumber },
        channels: ['card', 'bank', 'ussd', 'bank_transfer']
      })
    }, provider);
    const data = isRecord(body.data) ? body.data : {};
    if (body.status !== true || typeof data.authorization_url !== 'string') {
      throw new ProviderIntegrationError('Paystack did not return a checkout URL.', 'PROVIDER_REJECTED');
    }
    return {
      authorizationUrl: data.authorization_url,
      providerTransactionId: String(data.reference || payment.reference)
    };
  }
  if (provider === 'flutterwave') {
    const body = await requestJson('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('FLUTTERWAVE_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: payment.reference,
        amount: (payment.amountMinor / 100).toFixed(2),
        currency: payment.currency,
        redirect_url: payment.callbackUrl,
        customer: { email: payment.email },
        customizations: { title: 'Curriculum Server', description: payment.description },
        meta: { tenantId: payment.tenantId, invoiceNumber: payment.invoiceNumber },
        webhook_url: callback
      })
    }, provider);
    const data = isRecord(body.data) ? body.data : {};
    if (body.status !== 'success' || typeof data.link !== 'string') {
      throw new ProviderIntegrationError('Flutterwave did not return a checkout URL.', 'PROVIDER_REJECTED');
    }
    return { authorizationUrl: data.link };
  }
  if (provider === 'opay') {
    const secret = requiredEnv('OPAY_SECRET_KEY');
    const merchantId = requiredEnv('OPAY_MERCHANT_ID');
    const payload = {
      amount: { currency: payment.currency, total: payment.amountMinor },
      callbackUrl: callback,
      country: 'NG',
      payMethod: 'BankCard',
      product: { name: 'Curriculum Server', description: payment.description },
      reference: payment.reference,
      returnUrl: payment.callbackUrl,
      userInfo: { userEmail: payment.email, userId: payment.tenantId }
    };
    const body = await requestJson('https://cashierapi.opayweb.com/api/v3/cashier/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hmacHex('sha512', secret, sortedJson(payload))}`,
        MerchantId: merchantId,
        'Content-Type': 'application/json',
        RequestTimestamp: new Date().toISOString()
      },
      body: JSON.stringify(payload)
    }, provider);
    const data = isRecord(body.data) ? body.data : {};
    if (body.code !== '00000' || typeof data.cashierUrl !== 'string') {
      throw new ProviderIntegrationError('OPay did not return a checkout URL.', 'PROVIDER_REJECTED');
    }
    return {
      authorizationUrl: data.cashierUrl,
      providerTransactionId: String(data.orderNo || payment.reference)
    };
  }
  if (provider === 'interswitch') {
    const clientId = requiredEnv('INTERSWITCH_CLIENT_ID');
    const clientSecret = requiredEnv('INTERSWITCH_CLIENT_SECRET');
    const merchantCode = requiredEnv('INTERSWITCH_MERCHANT_CODE');
    const payItemId = requiredEnv('INTERSWITCH_PAY_ITEM_ID');
    const tokenBody = await requestJson(
      'https://passport.interswitchng.com/passport/oauth/token?grant_type=client_credentials',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: ''
      },
      provider
    );
    const accessToken = typeof tokenBody.access_token === 'string' ? tokenBody.access_token : '';
    if (!accessToken) throw new ProviderIntegrationError('Interswitch did not issue an access token.', 'PROVIDER_REJECTED');
    const checkout = new URL('https://webpay.interswitchng.com/collections/w/pay');
    checkout.searchParams.set('merchant_code', merchantCode);
    checkout.searchParams.set('pay_item_id', payItemId);
    checkout.searchParams.set('txn_ref', payment.reference);
    checkout.searchParams.set('amount', String(payment.amountMinor));
    checkout.searchParams.set('currency', payment.currency === 'NGN' ? '566' : payment.currency);
    checkout.searchParams.set('cust_email', payment.email);
    checkout.searchParams.set('pay_item_name', payment.description);
    checkout.searchParams.set('site_redirect_url', payment.callbackUrl);
    checkout.searchParams.set('access_token', accessToken);
    return { authorizationUrl: checkout.toString() };
  }
  throw new ProviderIntegrationError(
    'No approved bank-transfer API integration has been configured; no account details were generated.',
    'PROVIDER_NOT_CONFIGURED'
  );
}

export async function verifyProviderPayment(
  provider: BillingPaymentProvider,
  reference: string,
  amountExpectedMinor: number,
  providerTransactionId?: string
): Promise<VerifiedProviderPayment> {
  if (provider === 'paystack') {
    const body = await requestJson(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${requiredEnv('PAYSTACK_SECRET_KEY')}` }
      },
      provider
    );
    const data = isRecord(body.data) ? body.data : {};
    return {
      reference: String(data.reference || ''),
      providerTransactionId: String(data.id || ''),
      amountMinor: amountMinor(data.amount, provider),
      currency: String(data.currency || '').toUpperCase(),
      status: eventStatus(data.status),
      providerStatus: String(data.status || 'unknown'),
      settlementId: String(data.id || '')
    };
  }
  if (provider === 'flutterwave') {
    if (!providerTransactionId || !/^\d+$/.test(providerTransactionId)) {
      throw new ProviderIntegrationError('A Flutterwave transaction ID is required for verification.', 'PROVIDER_REJECTED');
    }
    const body = await requestJson(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(providerTransactionId)}/verify`,
      { headers: { Authorization: `Bearer ${requiredEnv('FLUTTERWAVE_SECRET_KEY')}` } },
      provider
    );
    const data = isRecord(body.data) ? body.data : {};
    return {
      reference: String(data.tx_ref || ''),
      providerTransactionId: String(data.id || ''),
      amountMinor: amountMinor(Math.round(Number(data.amount) * 100), provider),
      currency: String(data.currency || '').toUpperCase(),
      status: eventStatus(data.status),
      providerStatus: String(data.status || 'unknown'),
      settlementId: String(data.id || '')
    };
  }
  if (provider === 'opay') {
    const merchantId = requiredEnv('OPAY_MERCHANT_ID');
    const payload = { reference };
    const body = await requestJson('https://cashierapi.opayweb.com/api/v3/cashier/status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('OPAY_PUBLIC_KEY')}`,
        MerchantId: merchantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, provider);
    const data = isRecord(body.data) ? body.data : {};
    const result = normalizeProviderWebhook(provider, data);
    return { ...result, settlementId: result.providerTransactionId };
  }
  if (provider === 'interswitch') {
    const clientId = requiredEnv('INTERSWITCH_CLIENT_ID');
    const clientSecret = requiredEnv('INTERSWITCH_CLIENT_SECRET');
    const merchantCode = requiredEnv('INTERSWITCH_MERCHANT_CODE');
    const tokenBody = await requestJson(
      'https://passport.interswitchng.com/passport/oauth/token?grant_type=client_credentials',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: ''
      },
      provider
    );
    const accessToken = typeof tokenBody.access_token === 'string' ? tokenBody.access_token : '';
    if (!accessToken) throw new ProviderIntegrationError('Interswitch did not issue an access token.', 'PROVIDER_REJECTED');
    const query = new URLSearchParams({
      merchantcode: merchantCode,
      transactionreference: reference,
      amount: String(amountExpectedMinor)
    });
    const body = await requestJson(
      `https://webpay.interswitchng.com/collections/api/v1/gettransaction.json?${query}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      provider
    );
    const responseCode = String(body.ResponseCode || body.responseCode || '');
    return {
      reference: String(body.MerchantReference || body.merchantReference || reference),
      providerTransactionId: String(body.PaymentId || body.paymentId || reference),
      amountMinor: amountMinor(body.Amount ?? body.amount, provider),
      currency: String(body.CurrencyCode || body.currency || '566') === '566' ? 'NGN' : String(body.currency || ''),
      status: responseCode === '00' ? 'settled' : eventStatus(responseCode),
      providerStatus: responseCode,
      settlementId: String(body.PaymentId || body.paymentId || reference)
    };
  }
  throw new ProviderIntegrationError(
    'No approved bank-transfer API integration has been configured.',
    'PROVIDER_NOT_CONFIGURED'
  );
}

export async function refundProviderPayment(
  provider: BillingPaymentProvider,
  providerTransactionId: string,
  amountMinor: number,
  currency: string,
  reason: string
): Promise<{ providerRefundId: string }> {
  requirePaymentsEnabled();
  if (provider === 'paystack') {
    const body = await requestJson('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transaction: providerTransactionId, amount: amountMinor, currency, customer_note: reason })
    }, provider);
    const data = isRecord(body.data) ? body.data : {};
    if (body.status !== true || data.id === undefined) {
      throw new ProviderIntegrationError('Paystack did not accept the refund.', 'PROVIDER_REJECTED');
    }
    return { providerRefundId: String(data.id) };
  }
  throw new ProviderIntegrationError(
    `Refund processing is not configured for ${provider}.`,
    'PROVIDER_NOT_CONFIGURED'
  );
}

export function createPaymentReference(): string {
  return `cs_${randomUUID().replace(/-/g, '')}`;
}
