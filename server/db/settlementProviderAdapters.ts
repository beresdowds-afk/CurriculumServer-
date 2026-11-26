import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  SchoolSettlementDetails,
  SchoolSettlementProvider
} from '../../packages/shared-types/src/schoolSettlementAccounts';

export interface ProviderVerificationInput {
  tenantId: string;
  schoolId: string;
  requestId: string;
  provider: SchoolSettlementProvider;
  details: SchoolSettlementDetails;
}

export interface ProviderVerificationSuccess {
  verified: true;
  verifiedAccountName: string;
  providerReference: string;
  providerStatus: string;
}

export class SettlementProviderError extends Error {
  constructor(
    public readonly code: 'PROVIDER_NOT_CONFIGURED' | 'PROVIDER_REJECTED' | 'PROVIDER_UNAVAILABLE' | 'ACCOUNT_NAME_MISMATCH',
    message: string
  ) {
    super(message);
    this.name = 'SettlementProviderError';
  }
}

export interface SettlementProviderAdapter {
  verifyAndRegister(input: ProviderVerificationInput): Promise<ProviderVerificationSuccess>;
  verifyCallbackSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean;
  normalizeCallback(payload: unknown): {
    verified: boolean;
    providerStatus: string;
    providerReference?: string;
    verifiedAccountName?: string;
    eventId: string;
  };
}

type FetchFn = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requiredEnv(name: string): string {
  const val = process.env[name]?.trim();
  if (!val) {
    throw new SettlementProviderError(
      'PROVIDER_NOT_CONFIGURED',
      `Provider credential ${name} is not configured on the server.`
    );
  }
  return val;
}

function normalizeNameTokens(value: string): string[] {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

export function accountNamesMatch(expectedName: string, resolvedName: string): boolean {
  const expectedTokens = normalizeNameTokens(expectedName);
  const resolvedTokens = normalizeNameTokens(resolvedName);
  if (expectedTokens.length === 0 || resolvedTokens.length === 0) return false;
  if (expectedTokens.join(' ') === resolvedTokens.join(' ')) return true;
  const resolvedSet = new Set(resolvedTokens);
  const overlapCount = expectedTokens.filter(t => resolvedSet.has(t)).length;
  return overlapCount === expectedTokens.length || overlapCount >= Math.min(2, Math.max(expectedTokens.length, resolvedTokens.length));
}

function constantTimeHexMatch(expected: string, supplied: string | undefined): boolean {
  if (!supplied || !/^[a-f0-9]+$/i.test(supplied) || supplied.length !== expected.length) return false;
  const expectedBytes = Buffer.from(expected, 'hex');
  const suppliedBytes = Buffer.from(supplied, 'hex');
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const raw = headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function fetchJson(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
  provider: string
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new SettlementProviderError('PROVIDER_UNAVAILABLE', `${provider} verification endpoint is unreachable.`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SettlementProviderError('PROVIDER_UNAVAILABLE', `${provider} returned a malformed response.`);
  }
  if (!response.ok || !isRecord(body)) {
    const providerMessage = isRecord(body) && typeof body.message === 'string'
      ? body.message
      : `${provider} rejected the verification request.`;
    throw new SettlementProviderError('PROVIDER_REJECTED', providerMessage);
  }
  return body;
}

export function createSettlementProviderAdapters(
  fetchFn: FetchFn = fetch
): Record<SchoolSettlementProvider, SettlementProviderAdapter> {
  const paystackAdapter: SettlementProviderAdapter = {
    async verifyAndRegister(input) {
      const secret = requiredEnv('PAYSTACK_SECRET_KEY');
      const resolveUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(input.details.accountNumber)}&bank_code=${encodeURIComponent(input.details.bankCode)}`;
      const resolved = await fetchJson(fetchFn, resolveUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` }
      }, 'Paystack');
      const data = isRecord(resolved.data) ? resolved.data : {};
      const resolvedName = typeof data.account_name === 'string' ? data.account_name.trim() : '';
      if (resolved.status !== true || !resolvedName) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Paystack failed to resolve bank account name.');
      }
      if (!accountNamesMatch(input.details.accountName, resolvedName)) {
        throw new SettlementProviderError(
          'ACCOUNT_NAME_MISMATCH',
          `Resolved Paystack account name '${resolvedName}' does not match requested account name.`
        );
      }

      const registered = await fetchJson(fetchFn, 'https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'nuban',
          name: resolvedName,
          account_number: input.details.accountNumber,
          bank_code: input.details.bankCode,
          currency: 'NGN',
          metadata: {
            tenantId: input.tenantId,
            schoolId: input.schoolId,
            requestId: input.requestId
          }
        })
      }, 'Paystack');
      const regData = isRecord(registered.data) ? registered.data : {};
      const recipientCode = typeof regData.recipient_code === 'string' ? regData.recipient_code.trim() : '';
      if (registered.status !== true || !recipientCode) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Paystack did not return a verified recipient reference.');
      }
      return {
        verified: true,
        verifiedAccountName: resolvedName,
        providerReference: recipientCode,
        providerStatus: 'verified'
      };
    },
    verifyCallbackSignature(rawBody, headers) {
      const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
      if (!secret) return false;
      const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
      return constantTimeHexMatch(expected, getHeader(headers, 'x-paystack-signature'));
    },
    normalizeCallback(payload) {
      if (!isRecord(payload)) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Invalid Paystack callback payload.');
      }
      const data = isRecord(payload.data) ? payload.data : payload;
      const status = String(data.status || payload.event || '').toLowerCase();
      const verified = status.includes('verified') || status === 'success' || status === 'active';
      const ref = typeof data.recipient_code === 'string'
        ? data.recipient_code
        : typeof data.subaccount_code === 'string'
          ? data.subaccount_code
          : undefined;
      return {
        verified,
        providerStatus: status || 'unknown',
        providerReference: ref,
        verifiedAccountName: typeof data.account_name === 'string' ? data.account_name : undefined,
        eventId: String(payload.id || data.id || data.recipient_code || Date.now())
      };
    }
  };

  const flutterwaveAdapter: SettlementProviderAdapter = {
    async verifyAndRegister(input) {
      const secret = requiredEnv('FLUTTERWAVE_SECRET_KEY');
      const resolved = await fetchJson(fetchFn, 'https://api.flutterwave.com/v3/accounts/resolve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: input.details.accountNumber,
          account_bank: input.details.bankCode
        })
      }, 'Flutterwave');
      const data = isRecord(resolved.data) ? resolved.data : {};
      const resolvedName = typeof data.account_name === 'string' ? data.account_name.trim() : '';
      if (resolved.status !== 'success' || !resolvedName) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Flutterwave failed to resolve bank account name.');
      }
      if (!accountNamesMatch(input.details.accountName, resolvedName)) {
        throw new SettlementProviderError(
          'ACCOUNT_NAME_MISMATCH',
          `Resolved Flutterwave account name '${resolvedName}' does not match requested account name.`
        );
      }

      const registered = await fetchJson(fetchFn, 'https://api.flutterwave.com/v3/beneficiaries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: input.details.accountNumber,
          account_bank: input.details.bankCode,
          beneficiary_name: resolvedName
        })
      }, 'Flutterwave');
      const regData = isRecord(registered.data) ? registered.data : {};
      const beneficiaryId = regData.id !== undefined ? String(regData.id).trim() : '';
      if (registered.status !== 'success' || !beneficiaryId) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Flutterwave did not return a beneficiary reference.');
      }
      return {
        verified: true,
        verifiedAccountName: resolvedName,
        providerReference: `flw_ben_${beneficiaryId}`,
        providerStatus: 'verified'
      };
    },
    verifyCallbackSignature(_rawBody, headers) {
      const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH?.trim();
      const supplied = getHeader(headers, 'verif-hash');
      if (!secret || !supplied) return false;
      const expectedBytes = Buffer.from(secret);
      const suppliedBytes = Buffer.from(supplied);
      return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
    },
    normalizeCallback(payload) {
      if (!isRecord(payload)) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Invalid Flutterwave callback payload.');
      }
      const data = isRecord(payload.data) ? payload.data : payload;
      const status = String(data.status || payload.event || '').toLowerCase();
      const verified = status === 'successful' || status === 'success' || status === 'verified' || status === 'active';
      const ref = data.id !== undefined ? `flw_ben_${String(data.id)}` : undefined;
      return {
        verified,
        providerStatus: status || 'unknown',
        providerReference: ref,
        verifiedAccountName: typeof data.full_name === 'string'
          ? data.full_name
          : typeof data.account_name === 'string'
            ? data.account_name
            : undefined,
        eventId: String(payload.id || data.id || Date.now())
      };
    }
  };

  const opayAdapter: SettlementProviderAdapter = {
    async verifyAndRegister(input) {
      const secret = requiredEnv('OPAY_SECRET_KEY');
      const merchantId = requiredEnv('OPAY_MERCHANT_ID');
      const baseUrl = (process.env.OPAY_API_BASE_URL?.trim() || 'https://cashierapi.opayweb.com').replace(/\/+$/, '');
      const payload = {
        bankAccountNumber: input.details.accountNumber,
        bankCode: input.details.bankCode,
        countryCode: 'NG'
      };
      const canonical = JSON.stringify(payload);
      const signature = createHmac('sha512', secret).update(canonical, 'utf8').digest('hex');

      const resolved = await fetchJson(fetchFn, `${baseUrl}/api/v3/transfer/bankAccountVerify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${signature}`,
          MerchantId: merchantId,
          'Content-Type': 'application/json'
        },
        body: canonical
      }, 'OPay');
      const data = isRecord(resolved.data) ? resolved.data : {};
      const resolvedName = typeof data.bankAccountName === 'string'
        ? data.bankAccountName.trim()
        : typeof data.accountName === 'string'
          ? data.accountName.trim()
          : '';
      if (resolved.code !== '00000' || !resolvedName) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'OPay failed to verify bank account details.');
      }
      if (!accountNamesMatch(input.details.accountName, resolvedName)) {
        throw new SettlementProviderError(
          'ACCOUNT_NAME_MISMATCH',
          `Resolved OPay account name '${resolvedName}' does not match requested account name.`
        );
      }

      const providerRef = typeof data.verificationId === 'string' && data.verificationId.trim()
        ? data.verificationId.trim()
        : `opay_verified_${input.requestId}`;

      return {
        verified: true,
        verifiedAccountName: resolvedName,
        providerReference: providerRef,
        providerStatus: 'verified'
      };
    },
    verifyCallbackSignature(rawBody, headers) {
      const secret = process.env.OPAY_SECRET_KEY?.trim();
      if (!secret) return false;
      const supplied = getHeader(headers, 'sha512');
      const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
      const expectedSha3 = createHmac('sha3-512', secret).update(rawBody).digest('hex');
      return constantTimeHexMatch(expected, supplied) || constantTimeHexMatch(expectedSha3, supplied);
    },
    normalizeCallback(payload) {
      if (!isRecord(payload)) {
        throw new SettlementProviderError('PROVIDER_REJECTED', 'Invalid OPay callback payload.');
      }
      const data = isRecord(payload.data) ? payload.data : payload;
      const code = String(payload.code || data.code || data.status || '').toUpperCase();
      const verified = code === '00000' || code === 'SUCCESS' || code === 'VERIFIED';
      return {
        verified,
        providerStatus: String(data.status || payload.code || 'unknown').toLowerCase(),
        providerReference: typeof data.verificationId === 'string' ? data.verificationId : undefined,
        verifiedAccountName: typeof data.bankAccountName === 'string'
          ? data.bankAccountName
          : typeof data.accountName === 'string'
            ? data.accountName
            : undefined,
        eventId: String(payload.id || data.verificationId || Date.now())
      };
    }
  };

  return {
    paystack: paystackAdapter,
    flutterwave: flutterwaveAdapter,
    opay: opayAdapter
  };
}
