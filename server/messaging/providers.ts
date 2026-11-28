import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as webPush from 'web-push';
import {
  NotificationProviders,
  type ProviderTransport
} from '../notifications/providers';
import type {
  DeploymentEnvironment,
  MessageLifecycleState,
  MessagingProviderAdapter,
  NormalizedWebhookEvent,
  ProviderConfigRecord,
  ProviderDispatchOutcome,
  ProviderFailureCategory,
  ProviderHealthCheckResult,
  ProviderReadinessStatus,
  ProviderStatusOutcome,
  SmsDispatchRequest,
  WebhookVerificationResult,
  WhatsAppDispatchRequest,
  WhatsAppTemplatePayload
} from './types';

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const STAGING_SENDER_PATTERN = /(?:^|[_-])(test|sandbox|staging|demo|dev)(?:$|[_-])/i;
const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;

function singleLine(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}

function safeText(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  );
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) continue;
    if (Array.isArray(val)) return val[0];
    return val;
  }
  return undefined;
}

function parseTimestampMs(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{10}$/.test(trimmed)) return Number(trimmed) * 1000;
  if (/^\d{13}$/.test(trimmed)) return Number(trimmed);
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function verifyHmacHex(
  secret: string,
  payload: string,
  suppliedHex: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  if (!secret || !suppliedHex) return false;
  const normalized = suppliedHex.replace(/^sha(?:256|512)=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalized)) return false;
  const expected = createHmac(algorithm, secret).update(payload).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(normalized, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeProviderLifecycle(rawStatus: unknown): MessageLifecycleState {
  const s = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  if (s === 'read' || s === 'seen') return 'read';
  if (s === 'delivered' || s === 'dnd_delivered' || s === 'success') return 'delivered';
  if (s === 'sent' || s === 'dispatched') return 'sent';
  if (s === 'accepted' || s === 'queued' || s === 'provider_accepted') return 'provider_accepted';
  if (s === 'submitted') return 'submitted';
  if (s === 'expired') return 'expired';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'failed' || s === 'rejected' || s === 'undelivered' || s === 'dnd_rejected') return 'failed';
  return 'sent';
}

function defaultClassifyFailure(errorCode: string, httpStatus?: number): {
  category: ProviderFailureCategory;
  retryable: boolean;
} {
  if (httpStatus === 401 || httpStatus === 403 || errorCode === 'credentials_invalid') {
    return { category: 'credentials_invalid', retryable: false };
  }
  if (httpStatus === 429 || errorCode === 'rate_limited') {
    return { category: 'rate_limited', retryable: true };
  }
  if (httpStatus === 408 || (httpStatus !== undefined && httpStatus >= 500) ||
      errorCode === 'transport_error' || errorCode === 'provider_timeout') {
    return { category: httpStatus === 408 ? 'network_timeout' : 'provider_unavailable', retryable: true };
  }
  if (errorCode === 'sender_not_approved') {
    return { category: 'sender_unapproved', retryable: false };
  }
  if (errorCode === 'template_not_approved') {
    return { category: 'template_unapproved', retryable: false };
  }
  if (errorCode === 'invalid_request' || httpStatus === 400 || httpStatus === 422) {
    return { category: 'invalid_request', retryable: false };
  }
  return { category: 'provider_rejected', retryable: false };
}

function extractRateLimit(headers: Record<string, string | string[] | undefined>): {
  remaining?: number;
  resetAt?: Date;
} {
  const rem = headerValue(headers, 'x-ratelimit-remaining');
  const rst = headerValue(headers, 'x-ratelimit-reset');
  const remaining = rem !== undefined && /^\d+$/.test(rem.trim()) ? Number(rem.trim()) : undefined;
  const resetMs = parseTimestampMs(rst);
  return {
    ...(remaining !== undefined ? { remaining } : {}),
    ...(resetMs !== null ? { resetAt: new Date(resetMs) } : {})
  };
}

function headersObject(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers?.forEach?.((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

async function fetchWithTimeout(
  transport: ProviderTransport,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      transport.fetch(url, { ...init, redirect: 'error', signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('PROVIDER_TIMEOUT'));
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function currentDeploymentEnvironment(env: NodeJS.ProcessEnv = process.env): DeploymentEnvironment {
  const raw = (env.CMAG_ENVIRONMENT || env.NODE_ENV || 'development').trim().toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'staging') return 'staging';
  return 'development';
}

export class SendchampProviderAdapter implements MessagingProviderAdapter {
  readonly id = 'sendchamp';
  readonly displayName = 'Sendchamp Multi-Channel Gateway';
  readonly supportedChannels = ['sms', 'whatsapp'] as const;

  constructor(private readonly timeoutMs = 10_000) {}

  validateSenderIdentity(
    sender: string,
    channel: 'sms' | 'whatsapp',
    runtimeEnv: DeploymentEnvironment
  ): { valid: boolean; reason?: string } {
    if (!singleLine(sender, 128)) {
      return { valid: false, reason: 'Sender identity is missing or malformed.' };
    }
    if (runtimeEnv === 'production' && STAGING_SENDER_PATTERN.test(sender)) {
      return { valid: false, reason: 'Staging or test sender identities cannot be used in production.' };
    }
    if (channel === 'whatsapp' && !/^\+?[1-9]\d{7,14}$/.test(sender)) {
      return { valid: false, reason: 'Sendchamp WhatsApp sender must be a valid international phone number.' };
    }
    if (channel === 'sms' && !/^[A-Za-z0-9 ._-]{2,11}$/.test(sender.trim())) {
      return { valid: false, reason: 'SMS sender ID must be 2–11 alphanumeric characters.' };
    }
    return { valid: true };
  }

  validateTemplate(
    template: WhatsAppTemplatePayload,
    _config: ProviderConfigRecord
  ): { valid: boolean; reason?: string } {
    if (!singleLine(template.name, 128) || !singleLine(template.locale, 20)) {
      return { valid: false, reason: 'WhatsApp template name and locale are required.' };
    }
    if (template.approved !== true) {
      return { valid: false, reason: 'WhatsApp template has not been approved by provider.' };
    }
    return { valid: true };
  }

  validateConfig(config: ProviderConfigRecord, runtimeEnv: DeploymentEnvironment): {
    valid: boolean;
    readinessStatus: ProviderReadinessStatus;
    errors: string[];
  } {
    const errors: string[] = [];
    if (!config.enabled || config.suspended) {
      return { valid: false, readinessStatus: 'channel_disabled', errors: ['Provider is disabled or suspended.'] };
    }
    if (runtimeEnv === 'production' && (config.environment !== 'production' || config.credentials.allowTestMode)) {
      errors.push('Non-production provider configuration cannot run in production.');
      return { valid: false, readinessStatus: 'credentials_invalid', errors };
    }
    if (!singleLine(config.credentials.apiKey, 1024) || /\s/.test(config.credentials.apiKey)) {
      errors.push('SENDCHAMP_API_KEY is missing.');
      return { valid: false, readinessStatus: 'credentials_missing', errors };
    }
    const smsSender = config.credentials.smsSenderName;
    const smsRoute = config.credentials.smsRoute;
    const waSender = config.credentials.whatsappSender;
    if (smsSender && !this.validateSenderIdentity(smsSender, 'sms', runtimeEnv).valid) {
      errors.push('Sendchamp SMS sender identity is invalid for the active environment.');
    }
    if (smsRoute && !['dnd', 'non_dnd', 'international'].includes(smsRoute)) {
      errors.push('SENDCHAMP_SMS_ROUTE must be dnd, non_dnd, or international.');
    }
    if (waSender && !this.validateSenderIdentity(waSender, 'whatsapp', runtimeEnv).valid) {
      errors.push('Sendchamp WhatsApp sender identity is invalid.');
    }
    if (errors.length > 0) {
      return { valid: false, readinessStatus: 'sender_not_approved', errors };
    }
    return { valid: true, readinessStatus: 'operational', errors: [] };
  }

  async verifyCredentials(
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<{ valid: boolean; readinessStatus: ProviderReadinessStatus; reason?: string }> {
    if (!singleLine(config.credentials.apiKey, 1024)) {
      return { valid: false, readinessStatus: 'credentials_missing', reason: 'API key missing.' };
    }
    try {
      const base = config.baseUrl.replace(/\/+$/, '');
      const res = await fetchWithTimeout(transport, `${base}/api/v1/wallet/wallet_balance`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.credentials.apiKey}` }
      }, this.timeoutMs);
      if (res.status === 401 || res.status === 403) {
        return { valid: false, readinessStatus: 'credentials_invalid', reason: 'Sendchamp rejected API credentials.' };
      }
      if (!res.ok) {
        return { valid: false, readinessStatus: 'unavailable', reason: `Sendchamp health returned HTTP ${res.status}.` };
      }
      return { valid: true, readinessStatus: 'operational' };
    } catch {
      return { valid: false, readinessStatus: 'unavailable', reason: 'Sendchamp API unreachable.' };
    }
  }

  async sendSms(
    request: SmsDispatchRequest,
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<ProviderDispatchOutcome> {
    if (!E164_PHONE_REGEX.test(request.to) || !safeText(request.message, 1600)) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'invalid_request', errorMessage: 'Invalid E.164 recipient or SMS message.',
        failureCategory: 'invalid_request', retryable: false
      };
    }
    const senderName = request.senderName || config.credentials.smsSenderName;
    const route = request.route || config.credentials.smsRoute || 'dnd';
    if (!senderName || !this.validateSenderIdentity(senderName, 'sms', config.environment).valid) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'sender_not_approved', errorMessage: 'Approved SMS sender name is required.',
        failureCategory: 'sender_unapproved', retryable: false
      };
    }
    if (!singleLine(config.credentials.apiKey, 1024)) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'credentials_missing', errorMessage: 'Sendchamp API key is missing.',
        failureCategory: 'credentials_invalid', retryable: false
      };
    }

    const base = config.baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetchWithTimeout(transport, `${base}/api/v1/sms/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.credentials.apiKey}`,
          'Content-Type': 'application/json',
          ...(request.idempotencyKey ? { 'Idempotency-Key': request.idempotencyKey } : {})
        },
        body: JSON.stringify({
          to: [request.to.slice(1)],
          message: request.message,
          sender_name: senderName,
          route
        })
      }, this.timeoutMs);

      const rate = this.getRateLimitInfo(headersObject(res));
      if (!res.ok) {
        const errorCode = res.status === 401 || res.status === 403 ? 'credentials_invalid' :
          res.status === 429 ? 'rate_limited' : 'provider_rejected';
        const classified = this.classifyFailure(errorCode, res.status);
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          providerResponseCode: String(res.status),
          errorCode, failureCategory: classified.category, retryable: classified.retryable,
          ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
          ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
        };
      }

      const data = await res.json().catch(() => null) as Record<string, any> | null;
      if (!data || (data.status !== 'success' && data.status !== true)) {
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          errorCode: 'provider_rejected', failureCategory: 'provider_rejected', retryable: false,
          ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
          ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
        };
      }
      const id = data?.data?.message_id ?? data?.data?.id;
      const cost = this.getUsageAndCost('sms', Math.max(1, Math.ceil(request.message.length / 160)));
      return {
        accepted: true,
        lifecycleState: 'provider_accepted',
        providerId: this.id,
        ...(singleLine(id, 256) ? { providerMessageId: id } : {}),
        estimatedCostMinor: cost.estimatedCostMinor,
        currency: cost.currency,
        retryable: false,
        ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
        ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
      };
    } catch (error) {
      const timeout = (error as Error)?.message === 'PROVIDER_TIMEOUT';
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: timeout ? 'provider_timeout' : 'transport_error',
        failureCategory: timeout ? 'network_timeout' : 'provider_unavailable',
        retryable: true
      };
    }
  }

  async sendWhatsApp(
    request: WhatsAppDispatchRequest,
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<ProviderDispatchOutcome> {
    if (!E164_PHONE_REGEX.test(request.to) || (!request.template && !safeText(request.message, 4096))) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'invalid_request', errorMessage: 'Invalid WhatsApp recipient or payload.',
        failureCategory: 'invalid_request', retryable: false
      };
    }
    const sender = request.senderNumber || config.credentials.whatsappSender;
    if (!sender || !this.validateSenderIdentity(sender, 'whatsapp', config.environment).valid) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'sender_not_approved', errorMessage: 'Approved WhatsApp sender number is required.',
        failureCategory: 'sender_unapproved', retryable: false
      };
    }
    if (request.template) {
      const templateCheck = this.validateTemplate(request.template, config);
      if (!templateCheck.valid) {
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          errorCode: 'template_not_approved', errorMessage: templateCheck.reason,
          failureCategory: 'template_unapproved', retryable: false
        };
      }
    }
    if (!singleLine(config.credentials.apiKey, 1024)) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'credentials_missing', errorMessage: 'Sendchamp API key is missing.',
        failureCategory: 'credentials_invalid', retryable: false
      };
    }

    const base = config.baseUrl.replace(/\/+$/, '');
    const payload = request.template
      ? {
          sender: sender.replace(/^\+/, ''),
          recipient: [request.to.slice(1)],
          type: 'template',
          template_code: request.template.providerTemplateId || request.template.name,
          custom_data: request.template.variables || {}
        }
      : {
          sender: sender.replace(/^\+/, ''),
          recipient: [request.to.slice(1)],
          type: 'text',
          message: request.message
        };

    try {
      const res = await fetchWithTimeout(transport, `${base}/api/v1/whatsapp/message/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.credentials.apiKey}`,
          'Content-Type': 'application/json',
          ...(request.idempotencyKey ? { 'Idempotency-Key': request.idempotencyKey } : {})
        },
        body: JSON.stringify(payload)
      }, this.timeoutMs);

      const rate = this.getRateLimitInfo(headersObject(res));
      if (!res.ok) {
        const errorCode = res.status === 401 || res.status === 403 ? 'credentials_invalid' :
          res.status === 429 ? 'rate_limited' : 'provider_rejected';
        const classified = this.classifyFailure(errorCode, res.status);
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          providerResponseCode: String(res.status),
          errorCode, failureCategory: classified.category, retryable: classified.retryable,
          ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
          ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
        };
      }

      const data = await res.json().catch(() => null) as Record<string, any> | null;
      if (!data || (data.status !== 'success' && data.status !== true)) {
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          errorCode: 'provider_rejected', failureCategory: 'provider_rejected', retryable: false,
          ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
          ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
        };
      }
      const id = data?.data?.message_id ?? data?.data?.id;
      const cost = this.getUsageAndCost('whatsapp', 1);
      return {
        accepted: true,
        lifecycleState: 'provider_accepted',
        providerId: this.id,
        ...(singleLine(id, 256) ? { providerMessageId: id } : {}),
        estimatedCostMinor: cost.estimatedCostMinor,
        currency: cost.currency,
        retryable: false,
        ...(rate.remaining !== undefined ? { rateLimitRemaining: rate.remaining } : {}),
        ...(rate.resetAt ? { rateLimitResetAt: rate.resetAt } : {})
      };
    } catch (error) {
      const timeout = (error as Error)?.message === 'PROVIDER_TIMEOUT';
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: timeout ? 'provider_timeout' : 'transport_error',
        failureCategory: timeout ? 'network_timeout' : 'provider_unavailable',
        retryable: true
      };
    }
  }

  async getDeliveryStatus(
    providerMessageId: string,
    channel: 'sms' | 'whatsapp',
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<ProviderStatusOutcome | null> {
    if (!singleLine(providerMessageId, 256) || !singleLine(config.credentials.apiKey, 1024)) return null;
    const base = config.baseUrl.replace(/\/+$/, '');
    const path = channel === 'sms'
      ? `/api/v1/sms/status/${encodeURIComponent(providerMessageId)}`
      : `/api/v1/whatsapp/message/status/${encodeURIComponent(providerMessageId)}`;
    try {
      const res = await fetchWithTimeout(transport, `${base}${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.credentials.apiKey}` }
      }, this.timeoutMs);
      if (!res.ok) return null;
      const body = await res.json().catch(() => null) as Record<string, any> | null;
      const statusRaw = body?.data?.status ?? body?.status;
      if (!statusRaw) return null;
      return {
        providerId: this.id,
        providerMessageId,
        lifecycleState: normalizeProviderLifecycle(statusRaw),
        occurredAt: new Date()
      };
    } catch {
      return null;
    }
  }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    webhookSecret: string,
    nowMs = Date.now()
  ): WebhookVerificationResult {
    if (!webhookSecret) return { valid: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    const signature = headerValue(headers, 'x-sendchamp-signature') || headerValue(headers, 'x-webhook-signature');
    const tsRaw = headerValue(headers, 'x-sendchamp-timestamp') || headerValue(headers, 'x-webhook-timestamp');
    if (!signature) return { valid: false, reason: 'MISSING_WEBHOOK_SIGNATURE' };
    const tsMs = parseTimestampMs(tsRaw);
    if (tsRaw && tsMs === null) return { valid: false, reason: 'INVALID_WEBHOOK_TIMESTAMP' };
    if (tsMs !== null && Math.abs(nowMs - tsMs) > WEBHOOK_MAX_SKEW_MS) {
      return { valid: false, reason: 'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW' };
    }
    const signedPayload = tsRaw ? `${tsRaw}.${rawBody}` : rawBody;
    const matched = verifyHmacHex(webhookSecret, signedPayload, signature, 'sha256') ||
      (tsRaw ? verifyHmacHex(webhookSecret, rawBody, signature, 'sha256') : false);
    if (!matched) return { valid: false, reason: 'INVALID_WEBHOOK_SIGNATURE' };
    return {
      valid: true,
      signatureHash: createHash('sha256').update(signature).digest('hex'),
      ...(tsMs !== null ? { eventTimestamp: new Date(tsMs) } : {})
    };
  }

  normalizeWebhookEvent(payload: unknown): NormalizedWebhookEvent | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const obj = payload as Record<string, any>;
    const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, any>;
    const messageId = data.message_id || data.id || obj.message_id;
    const eventId = obj.event_id || data.event_id || `${messageId || 'evt'}:${data.status || obj.event || ''}:${obj.timestamp || data.updated_at || ''}`;
    if (!singleLine(messageId, 256) || !singleLine(eventId, 256)) return null;
    const status = normalizeProviderLifecycle(data.status ?? obj.status ?? obj.event);
    const tsMs = parseTimestampMs(typeof obj.timestamp === 'string' ? obj.timestamp : undefined);
    return {
      providerId: this.id,
      providerEventId: String(eventId),
      providerMessageId: String(messageId),
      ...(data.channel === 'sms' || data.channel === 'whatsapp' ? { channel: data.channel } : {}),
      lifecycleState: status,
      ...(typeof data.error_code === 'string' ? { errorCode: data.error_code } : {}),
      occurredAt: tsMs !== null ? new Date(tsMs) : new Date(),
      summary: {
        status,
        rawEvent: typeof obj.event === 'string' ? obj.event : undefined
      }
    };
  }

  classifyFailure = defaultClassifyFailure;
  isRetryable(errorCode: string, httpStatus?: number): boolean {
    return defaultClassifyFailure(errorCode, httpStatus).retryable;
  }

  async checkHealth(
    channel: 'sms' | 'whatsapp',
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<ProviderHealthCheckResult> {
    const cfgCheck = this.validateConfig(config, config.environment);
    if (!cfgCheck.valid) {
      return {
        providerId: this.id,
        channel,
        readinessStatus: cfgCheck.readinessStatus,
        healthy: false,
        reason: cfgCheck.errors.join(' '),
        checkedAt: new Date().toISOString()
      };
    }
    const sender = channel === 'sms' ? config.credentials.smsSenderName : config.credentials.whatsappSender;
    if (!sender) {
      return {
        providerId: this.id,
        channel,
        readinessStatus: 'sender_not_approved',
        healthy: false,
        reason: `No ${channel.toUpperCase()} sender configured.`,
        checkedAt: new Date().toISOString()
      };
    }
    const creds = await this.verifyCredentials(config, transport);
    return {
      providerId: this.id,
      channel,
      readinessStatus: creds.readinessStatus,
      healthy: creds.valid,
      ...(creds.reason ? { reason: creds.reason } : {}),
      checkedAt: new Date().toISOString()
    };
  }

  getUsageAndCost(channel: 'sms' | 'whatsapp', messageCount: number) {
    const unitMinor = channel === 'sms' ? 400 : 800; // NGN kobo estimate
    return { estimatedCostMinor: Math.max(0, messageCount) * unitMinor, currency: 'NGN' };
  }

  getRateLimitInfo = extractRateLimit;
}

export class MetaWhatsAppProviderAdapter implements MessagingProviderAdapter {
  readonly id = 'meta_whatsapp';
  readonly displayName = 'Meta WhatsApp Business Cloud API';
  readonly supportedChannels = ['whatsapp'] as const;

  constructor(private readonly timeoutMs = 10_000) {}

  validateSenderIdentity(
    sender: string,
    channel: 'sms' | 'whatsapp',
    runtimeEnv: DeploymentEnvironment
  ): { valid: boolean; reason?: string } {
    if (channel !== 'whatsapp') return { valid: false, reason: 'Meta adapter supports WhatsApp only.' };
    if (!singleLine(sender, 64) || !/^\+?[1-9]\d{6,18}$/.test(sender)) {
      return { valid: false, reason: 'Meta Phone Number ID or WhatsApp number is invalid.' };
    }
    if (runtimeEnv === 'production' && STAGING_SENDER_PATTERN.test(sender)) {
      return { valid: false, reason: 'Staging sender cannot run in production.' };
    }
    return { valid: true };
  }

  validateTemplate(template: WhatsAppTemplatePayload): { valid: boolean; reason?: string } {
    if (!singleLine(template.name, 512) || !singleLine(template.locale, 20) || template.approved !== true) {
      return { valid: false, reason: 'Approved Meta WhatsApp template name and locale are required.' };
    }
    return { valid: true };
  }

  validateConfig(config: ProviderConfigRecord, runtimeEnv: DeploymentEnvironment) {
    if (!config.enabled || config.suspended) {
      return { valid: false, readinessStatus: 'channel_disabled' as const, errors: ['Provider is disabled or suspended.'] };
    }
    if (runtimeEnv === 'production' && config.environment !== 'production') {
      return { valid: false, readinessStatus: 'credentials_invalid' as const, errors: ['Non-production config in production.'] };
    }
    if (!singleLine(config.credentials.apiKey, 2048)) {
      return { valid: false, readinessStatus: 'credentials_missing' as const, errors: ['Meta access token missing.'] };
    }
    if (!singleLine(config.credentials.wabaId, 64) || !singleLine(config.credentials.phoneNumberId, 64)) {
      return { valid: false, readinessStatus: 'sender_not_approved' as const, errors: ['WABA ID and Phone Number ID required.'] };
    }
    return { valid: true, readinessStatus: 'operational' as const, errors: [] };
  }

  async verifyCredentials(
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ) {
    const check = this.validateConfig(config, config.environment);
    if (!check.valid) return { valid: false, readinessStatus: check.readinessStatus, reason: check.errors[0] };
    try {
      const base = config.baseUrl.replace(/\/+$/, '');
      const res = await fetchWithTimeout(transport, `${base}/v19.0/${encodeURIComponent(config.credentials.phoneNumberId!)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.credentials.apiKey}` }
      }, this.timeoutMs);
      if (res.status === 401 || res.status === 403) {
        return { valid: false, readinessStatus: 'credentials_invalid' as const, reason: 'Meta Graph API rejected credentials.' };
      }
      if (!res.ok) return { valid: false, readinessStatus: 'unavailable' as const, reason: `HTTP ${res.status}` };
      return { valid: true, readinessStatus: 'operational' as const };
    } catch {
      return { valid: false, readinessStatus: 'unavailable' as const, reason: 'Meta Graph API unreachable.' };
    }
  }

  async sendSms(): Promise<ProviderDispatchOutcome> {
    return {
      accepted: false, lifecycleState: 'failed', providerId: this.id,
      errorCode: 'channel_not_supported', failureCategory: 'channel_disabled', retryable: false
    };
  }

  async sendWhatsApp(
    request: WhatsAppDispatchRequest,
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<ProviderDispatchOutcome> {
    const cfg = this.validateConfig(config, config.environment);
    if (!cfg.valid) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: cfg.readinessStatus, errorMessage: cfg.errors[0],
        failureCategory: cfg.readinessStatus === 'credentials_missing' ? 'credentials_invalid' : 'sender_unapproved',
        retryable: false
      };
    }
    if (!E164_PHONE_REGEX.test(request.to)) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'invalid_request', failureCategory: 'invalid_request', retryable: false
      };
    }
    if (request.template && !this.validateTemplate(request.template).valid) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'template_not_approved', failureCategory: 'template_unapproved', retryable: false
      };
    }
    const base = config.baseUrl.replace(/\/+$/, '');
    const body = request.template
      ? {
          messaging_product: 'whatsapp',
          to: request.to.slice(1),
          type: 'template',
          template: {
            name: request.template.name,
            language: { code: request.template.locale },
            ...(request.template.variables
              ? {
                  components: [{
                    type: 'body',
                    parameters: Object.values(request.template.variables).map(text => ({ type: 'text', text }))
                  }]
                }
              : {})
          }
        }
      : {
          messaging_product: 'whatsapp',
          to: request.to.slice(1),
          type: 'text',
          text: { body: request.message }
        };
    try {
      const res = await fetchWithTimeout(transport, `${base}/v19.0/${encodeURIComponent(config.credentials.phoneNumberId!)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, this.timeoutMs);
      if (!res.ok) {
        const classified = this.classifyFailure('provider_rejected', res.status);
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          providerResponseCode: String(res.status),
          errorCode: 'provider_rejected', failureCategory: classified.category, retryable: classified.retryable
        };
      }
      const data = await res.json().catch(() => null) as Record<string, any> | null;
      const msgId = data?.messages?.[0]?.id;
      return {
        accepted: true,
        lifecycleState: 'provider_accepted',
        providerId: this.id,
        ...(singleLine(msgId, 256) ? { providerMessageId: msgId } : {}),
        ...this.getUsageAndCost('whatsapp', 1),
        retryable: false
      };
    } catch {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'transport_error', failureCategory: 'provider_unavailable', retryable: true
      };
    }
  }

  async getDeliveryStatus(): Promise<ProviderStatusOutcome | null> { return null; }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    webhookSecret: string,
    nowMs = Date.now()
  ): WebhookVerificationResult {
    if (!webhookSecret) return { valid: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    const sig = headerValue(headers, 'x-hub-signature-256');
    if (!sig || !verifyHmacHex(webhookSecret, rawBody, sig, 'sha256')) {
      return { valid: false, reason: 'INVALID_WEBHOOK_SIGNATURE' };
    }
    const tsRaw = headerValue(headers, 'x-webhook-timestamp');
    const tsMs = parseTimestampMs(tsRaw);
    if (tsMs !== null && Math.abs(nowMs - tsMs) > WEBHOOK_MAX_SKEW_MS) {
      return { valid: false, reason: 'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW' };
    }
    return { valid: true, signatureHash: createHash('sha256').update(sig).digest('hex') };
  }

  normalizeWebhookEvent(payload: unknown): NormalizedWebhookEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, any>;
    const statusObj = obj?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (!statusObj || !singleLine(statusObj.id, 256)) return null;
    const lifecycleState = normalizeProviderLifecycle(statusObj.status);
    const tsMs = parseTimestampMs(statusObj.timestamp);
    return {
      providerId: this.id,
      providerEventId: `${statusObj.id}:${statusObj.status}:${statusObj.timestamp || ''}`,
      providerMessageId: String(statusObj.id),
      channel: 'whatsapp',
      lifecycleState,
      occurredAt: tsMs !== null ? new Date(tsMs) : new Date(),
      summary: { status: lifecycleState }
    };
  }

  classifyFailure = defaultClassifyFailure;
  isRetryable(errorCode: string, httpStatus?: number) {
    return defaultClassifyFailure(errorCode, httpStatus).retryable;
  }
  async checkHealth(channel: 'sms' | 'whatsapp', config: ProviderConfigRecord, transport?: ProviderTransport) {
    if (channel !== 'whatsapp') {
      return {
        providerId: this.id, channel, readinessStatus: 'channel_disabled' as const,
        healthy: false, reason: 'WhatsApp only', checkedAt: new Date().toISOString()
      };
    }
    const res = await this.verifyCredentials(config, transport);
    return {
      providerId: this.id, channel, readinessStatus: res.readinessStatus,
      healthy: res.valid, ...(res.reason ? { reason: res.reason } : {}), checkedAt: new Date().toISOString()
    };
  }
  getUsageAndCost(_channel: 'sms' | 'whatsapp', messageCount: number) {
    return { estimatedCostMinor: Math.max(0, messageCount) * 750, currency: 'NGN' };
  }
  getRateLimitInfo = extractRateLimit;
}

export class TermiiSmsProviderAdapter implements MessagingProviderAdapter {
  readonly id = 'termii_sms';
  readonly displayName = 'Termii Regional SMS Gateway';
  readonly supportedChannels = ['sms'] as const;

  constructor(private readonly timeoutMs = 10_000) {}

  validateSenderIdentity(sender: string, channel: 'sms' | 'whatsapp', runtimeEnv: DeploymentEnvironment) {
    if (channel !== 'sms') return { valid: false, reason: 'Termii adapter handles SMS channel.' };
    if (!singleLine(sender, 11) || !/^[A-Za-z0-9]{2,11}$/.test(sender.trim())) {
      return { valid: false, reason: 'Termii sender ID must be 2–11 alphanumeric characters.' };
    }
    if (runtimeEnv === 'production' && STAGING_SENDER_PATTERN.test(sender)) {
      return { valid: false, reason: 'Staging sender cannot run in production.' };
    }
    return { valid: true };
  }

  validateTemplate() {
    return { valid: false, reason: 'Termii SMS adapter does not handle WhatsApp templates.' };
  }

  validateConfig(config: ProviderConfigRecord, runtimeEnv: DeploymentEnvironment) {
    if (!config.enabled || config.suspended) {
      return { valid: false, readinessStatus: 'channel_disabled' as const, errors: ['Provider disabled or suspended.'] };
    }
    if (runtimeEnv === 'production' && config.environment !== 'production') {
      return { valid: false, readinessStatus: 'credentials_invalid' as const, errors: ['Non-production config in production.'] };
    }
    if (!singleLine(config.credentials.apiKey, 1024)) {
      return { valid: false, readinessStatus: 'credentials_missing' as const, errors: ['TERMII_API_KEY missing.'] };
    }
    if (!config.credentials.smsSenderName ||
        !this.validateSenderIdentity(config.credentials.smsSenderName, 'sms', runtimeEnv).valid) {
      return { valid: false, readinessStatus: 'sender_not_approved' as const, errors: ['Approved Termii SMS sender missing.'] };
    }
    return { valid: true, readinessStatus: 'operational' as const, errors: [] };
  }

  async verifyCredentials(
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ) {
    const check = this.validateConfig(config, config.environment);
    if (!check.valid) return { valid: false, readinessStatus: check.readinessStatus, reason: check.errors[0] };
    try {
      const base = config.baseUrl.replace(/\/+$/, '');
      const res = await fetchWithTimeout(transport, `${base}/api/get-balance?api_key=${encodeURIComponent(config.credentials.apiKey!)}`, {
        method: 'GET'
      }, this.timeoutMs);
      if (res.status === 401 || res.status === 403) {
        return { valid: false, readinessStatus: 'credentials_invalid' as const, reason: 'Termii rejected API key.' };
      }
      if (!res.ok) return { valid: false, readinessStatus: 'unavailable' as const, reason: `HTTP ${res.status}` };
      return { valid: true, readinessStatus: 'operational' as const };
    } catch {
      return { valid: false, readinessStatus: 'unavailable' as const, reason: 'Termii unreachable.' };
    }
  }

  async sendSms(
    request: SmsDispatchRequest,
    config: ProviderConfigRecord,
    transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification }
  ): Promise<ProviderDispatchOutcome> {
    const check = this.validateConfig(config, config.environment);
    if (!check.valid) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: check.readinessStatus, failureCategory: 'credentials_invalid', retryable: false
      };
    }
    if (!E164_PHONE_REGEX.test(request.to) || !safeText(request.message, 1600)) {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'invalid_request', failureCategory: 'invalid_request', retryable: false
      };
    }
    const base = config.baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetchWithTimeout(transport, `${base}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: request.to.slice(1),
          from: request.senderName || config.credentials.smsSenderName,
          sms: request.message,
          type: 'plain',
          channel: (request.route || config.credentials.smsRoute) === 'dnd' ? 'dnd' : 'generic',
          api_key: config.credentials.apiKey
        })
      }, this.timeoutMs);
      if (!res.ok) {
        const classified = this.classifyFailure('provider_rejected', res.status);
        return {
          accepted: false, lifecycleState: 'failed', providerId: this.id,
          providerResponseCode: String(res.status),
          errorCode: 'provider_rejected', failureCategory: classified.category, retryable: classified.retryable
        };
      }
      const data = await res.json().catch(() => null) as Record<string, any> | null;
      const msgId = data?.message_id || data?.message_id_str;
      return {
        accepted: true, lifecycleState: 'provider_accepted', providerId: this.id,
        ...(singleLine(msgId, 256) ? { providerMessageId: msgId } : {}),
        ...this.getUsageAndCost('sms', Math.max(1, Math.ceil(request.message.length / 160))),
        retryable: false
      };
    } catch {
      return {
        accepted: false, lifecycleState: 'failed', providerId: this.id,
        errorCode: 'transport_error', failureCategory: 'provider_unavailable', retryable: true
      };
    }
  }

  async sendWhatsApp(): Promise<ProviderDispatchOutcome> {
    return {
      accepted: false, lifecycleState: 'failed', providerId: this.id,
      errorCode: 'channel_not_supported', failureCategory: 'channel_disabled', retryable: false
    };
  }

  async getDeliveryStatus(): Promise<ProviderStatusOutcome | null> { return null; }

  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    webhookSecret: string,
    nowMs = Date.now()
  ): WebhookVerificationResult {
    if (!webhookSecret) return { valid: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    const sig = headerValue(headers, 'x-termii-signature');
    if (!sig || !verifyHmacHex(webhookSecret, rawBody, sig, 'sha512')) {
      return { valid: false, reason: 'INVALID_WEBHOOK_SIGNATURE' };
    }
    const tsRaw = headerValue(headers, 'x-webhook-timestamp');
    const tsMs = parseTimestampMs(tsRaw);
    if (tsMs !== null && Math.abs(nowMs - tsMs) > WEBHOOK_MAX_SKEW_MS) {
      return { valid: false, reason: 'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW' };
    }
    return { valid: true, signatureHash: createHash('sha256').update(sig).digest('hex') };
  }

  normalizeWebhookEvent(payload: unknown): NormalizedWebhookEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, any>;
    const messageId = obj.message_id || obj.id;
    if (!singleLine(messageId, 256)) return null;
    const lifecycleState = normalizeProviderLifecycle(obj.status);
    return {
      providerId: this.id,
      providerEventId: `${messageId}:${obj.status || ''}:${obj.notify_id || ''}`,
      providerMessageId: String(messageId),
      channel: 'sms',
      lifecycleState,
      occurredAt: new Date(),
      summary: { status: lifecycleState }
    };
  }

  classifyFailure = defaultClassifyFailure;
  isRetryable(errorCode: string, httpStatus?: number) {
    return defaultClassifyFailure(errorCode, httpStatus).retryable;
  }
  async checkHealth(channel: 'sms' | 'whatsapp', config: ProviderConfigRecord, transport?: ProviderTransport) {
    if (channel !== 'sms') {
      return {
        providerId: this.id, channel, readinessStatus: 'channel_disabled' as const,
        healthy: false, reason: 'SMS only', checkedAt: new Date().toISOString()
      };
    }
    const res = await this.verifyCredentials(config, transport);
    return {
      providerId: this.id, channel, readinessStatus: res.readinessStatus,
      healthy: res.valid, ...(res.reason ? { reason: res.reason } : {}), checkedAt: new Date().toISOString()
    };
  }
  getUsageAndCost(_channel: 'sms' | 'whatsapp', messageCount: number) {
    return { estimatedCostMinor: Math.max(0, messageCount) * 350, currency: 'NGN' };
  }
  getRateLimitInfo = extractRateLimit;
}

export function buildEnvProviderConfigs(env: NodeJS.ProcessEnv = process.env): ProviderConfigRecord[] {
  const runtimeEnv = currentDeploymentEnvironment(env);
  return [
    {
      id: 'sendchamp',
      displayName: 'Sendchamp Multi-Channel Gateway',
      providerType: 'multi',
      supportedChannels: ['sms', 'whatsapp'],
      environment: runtimeEnv,
      enabled: env.NOTIFICATION_SMS_ENABLED === 'true' || env.NOTIFICATION_WHATSAPP_ENABLED === 'true',
      suspended: false,
      priority: 10,
      baseUrl: env.SENDCHAMP_BASE_URL || 'https://api.sendchamp.com',
      credentials: {
        apiKey: env.SENDCHAMP_API_KEY,
        webhookSecret: env.SENDCHAMP_WEBHOOK_SECRET,
        smsSenderName: env.SENDCHAMP_SMS_SENDER_NAME,
        smsRoute: (['dnd', 'non_dnd', 'international'].includes(env.SENDCHAMP_SMS_ROUTE || '')
          ? env.SENDCHAMP_SMS_ROUTE
          : undefined) as 'dnd' | 'non_dnd' | 'international' | undefined,
        whatsappSender: env.SENDCHAMP_WHATSAPP_SENDER,
        environment: runtimeEnv
      },
      options: {
        smsEnabled: env.NOTIFICATION_SMS_ENABLED === 'true',
        whatsappEnabled: env.NOTIFICATION_WHATSAPP_ENABLED === 'true'
      }
    },
    {
      id: 'meta_whatsapp',
      displayName: 'Meta WhatsApp Business Cloud API',
      providerType: 'whatsapp',
      supportedChannels: ['whatsapp'],
      environment: runtimeEnv,
      enabled: env.META_WHATSAPP_ENABLED === 'true',
      suspended: false,
      priority: 20,
      baseUrl: env.META_WHATSAPP_BASE_URL || 'https://graph.facebook.com',
      credentials: {
        apiKey: env.META_WHATSAPP_ACCESS_TOKEN,
        webhookSecret: env.META_WHATSAPP_APP_SECRET,
        wabaId: env.META_WHATSAPP_WABA_ID,
        phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
        whatsappSender: env.META_WHATSAPP_PHONE_NUMBER_ID,
        environment: runtimeEnv
      },
      options: {}
    },
    {
      id: 'termii_sms',
      displayName: 'Termii Regional SMS Gateway',
      providerType: 'sms',
      supportedChannels: ['sms'],
      environment: runtimeEnv,
      enabled: env.TERMII_SMS_ENABLED === 'true',
      suspended: false,
      priority: 30,
      baseUrl: env.TERMII_BASE_URL || 'https://v3.api.termii.com',
      credentials: {
        apiKey: env.TERMII_API_KEY,
        webhookSecret: env.TERMII_WEBHOOK_SECRET,
        smsSenderName: env.TERMII_SMS_SENDER_ID,
        smsRoute: (['dnd', 'non_dnd'].includes(env.TERMII_SMS_CHANNEL || '') ? env.TERMII_SMS_CHANNEL : 'dnd') as 'dnd' | 'non_dnd',
        environment: runtimeEnv
      },
      options: {}
    }
  ];
}

export class MessagingProviderRegistry {
  private readonly adapters = new Map<string, MessagingProviderAdapter>();
  private readonly emailFallback: NotificationProviders;

  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification },
    adapters?: MessagingProviderAdapter[]
  ) {
    const defaults = adapters ?? [
      new SendchampProviderAdapter(),
      new MetaWhatsAppProviderAdapter(),
      new TermiiSmsProviderAdapter()
    ];
    for (const adapter of defaults) {
      this.adapters.set(adapter.id, adapter);
    }
    this.emailFallback = new NotificationProviders(env, transport);
  }

  register(adapter: MessagingProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(providerId: string): MessagingProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  listAdapters(): MessagingProviderAdapter[] {
    return [...this.adapters.values()];
  }

  getEmailFallback(): NotificationProviders {
    return this.emailFallback;
  }

  getTransport(): ProviderTransport {
    return this.transport;
  }

  getEnvConfigs(): ProviderConfigRecord[] {
    return buildEnvProviderConfigs(this.env);
  }
}
