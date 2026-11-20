import { createECDH, ECDH } from 'node:crypto';
import * as webPush from 'web-push';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'web_push';
export type PushSubscription = webPush.PushSubscription;
export type NotificationRequest =
  | { channel: 'email'; to: string; subject: string; text: string }
  | { channel: 'sms' | 'whatsapp'; to: string; message: string }
  | { channel: 'web_push'; subscriptionId: string; message: string };
export type ProviderRequest = Exclude<NotificationRequest, { channel: 'web_push' }> |
  { channel: 'web_push'; subscription: PushSubscription; message: string };
export type ProviderResult =
  | { status: 'accepted'; providerMessageId?: string }
  | { status: 'failed'; errorCode: string; retryable: boolean };

// Each provider is disabled unless NOTIFICATION_{EMAIL,SMS,WHATSAPP,WEB_PUSH}_ENABLED is "true".
// VAPID_SUBJECT (mailto: or https:), VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
// must be a matching P-256 key pair. Sendchamp requires SENDCHAMP_API_KEY,
// SENDCHAMP_SMS_SENDER_NAME, SENDCHAMP_SMS_ROUTE and SENDCHAMP_WHATSAPP_SENDER.
// Email reuses INVITATION_EMAIL_API_KEY and INVITATION_EMAIL_FROM.
export interface ProviderReadiness {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  web_push: boolean;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const phone = /^\+[1-9]\d{7,14}$/;
const safeText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const singleLine = (value: unknown, max: number): value is string =>
  safeText(value, max) && !/[\r\n]/.test(value);

function decodeKey(value: unknown, size: number): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('INVALID_PUSH_KEY');
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== size || decoded.toString('base64url') !== value) throw new Error('INVALID_PUSH_KEY');
  return decoded;
}

function validatePoint(value: unknown): Buffer {
  const key = decodeKey(value, 65);
  try { ECDH.convertKey(key, 'prime256v1'); } catch { throw new Error('INVALID_PUSH_KEY'); }
  return key;
}

export function validatePushSubscription(value: unknown): PushSubscription {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_PUSH_SUBSCRIPTION');
  const sub = value as PushSubscription;
  let url: URL;
  try { url = new URL(sub.endpoint); } catch { throw new Error('INVALID_PUSH_SUBSCRIPTION'); }
  // Restrict browser-controlled endpoints to known push services to avoid internal-network requests.
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
      !(host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
        host.endsWith('.push.apple.com')) || sub.endpoint.length > 2048) {
    throw new Error('INVALID_PUSH_SUBSCRIPTION');
  }
  if (!sub.keys || typeof sub.keys !== 'object') throw new Error('INVALID_PUSH_SUBSCRIPTION');
  validatePoint(sub.keys.p256dh);
  decodeKey(sub.keys.auth, 16);
  if (sub.expirationTime != null && (!Number.isFinite(sub.expirationTime) || sub.expirationTime <= Date.now())) {
    throw new Error('INVALID_PUSH_SUBSCRIPTION');
  }
  return { endpoint: url.href, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    ...(sub.expirationTime == null ? {} : { expirationTime: sub.expirationTime }) };
}

export function validateNotificationRequest(value: NotificationRequest): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_NOTIFICATION');
  const expected = value.channel === 'email' ? ['channel', 'to', 'subject', 'text'] :
    value.channel === 'sms' || value.channel === 'whatsapp' ? ['channel', 'to', 'message'] :
      value.channel === 'web_push' ? ['channel', 'subscriptionId', 'message'] : [];
  if (Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    throw new Error('INVALID_NOTIFICATION');
  }
  switch (value.channel) {
    case 'email':
      if (!singleLine(value.to, 254) || !email.test(value.to) || !singleLine(value.subject, 200) ||
          !safeText(value.text, 20000)) throw new Error('INVALID_NOTIFICATION');
      return;
    case 'sms': case 'whatsapp':
      if (typeof value.to !== 'string' || !phone.test(value.to) || !safeText(value.message, 4096)) throw new Error('INVALID_NOTIFICATION');
      return;
    case 'web_push':
      if (typeof value.subscriptionId !== 'string' || !uuid.test(value.subscriptionId) ||
          !safeText(value.message, 3000) || Buffer.byteLength(value.message) > 3000) throw new Error('INVALID_NOTIFICATION');
      return;
    default: throw new Error('INVALID_NOTIFICATION');
  }
}

function vapidDetails(env: NodeJS.ProcessEnv): { subject: string; publicKey: string; privateKey: string } | undefined {
  try {
    const subject = env.VAPID_SUBJECT || '';
    const url = new URL(subject);
    if (!singleLine(subject, 512) || !((url.protocol === 'mailto:' && email.test(url.pathname)) ||
        (url.protocol === 'https:' && url.hostname && !url.username && !url.password))) return;
    const publicKey = validatePoint(env.VAPID_PUBLIC_KEY);
    const privateKey = decodeKey(env.VAPID_PRIVATE_KEY, 32);
    const ecdh = createECDH('prime256v1');
    ecdh.setPrivateKey(privateKey);
    if (!ecdh.getPublicKey().equals(publicKey)) return;
    return { subject, publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY! };
  } catch { return; }
}

export function notificationProviderReadiness(env: NodeJS.ProcessEnv = process.env): ProviderReadiness {
  const key = (v: unknown) => singleLine(v, 1024) && !/\s/.test(v);
  const sender = (v: unknown) => singleLine(v, 128);
  const from = env.INVITATION_EMAIL_FROM;
  return {
    email: env.NOTIFICATION_EMAIL_ENABLED === 'true' && key(env.INVITATION_EMAIL_API_KEY) && singleLine(from, 320) &&
      (/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from) || /^[^<>\r\n]+ <[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/.test(from)),
    sms: env.NOTIFICATION_SMS_ENABLED === 'true' && key(env.SENDCHAMP_API_KEY) && sender(env.SENDCHAMP_SMS_SENDER_NAME) &&
      ['dnd', 'non_dnd', 'international'].includes(env.SENDCHAMP_SMS_ROUTE || ''),
    whatsapp: env.NOTIFICATION_WHATSAPP_ENABLED === 'true' && key(env.SENDCHAMP_API_KEY) &&
      /^\+?[1-9]\d{7,14}$/.test(env.SENDCHAMP_WHATSAPP_SENDER || ''),
    web_push: env.NOTIFICATION_WEB_PUSH_ENABLED === 'true' && !!vapidDetails(env)
  };
}

export interface ProviderTransport {
  fetch: typeof fetch;
  push: typeof webPush.sendNotification;
}

const failure = (errorCode: string, retryable: boolean): ProviderResult => ({ status: 'failed', errorCode, retryable });
const retryStatus = (status: number) => status === 408 || status === 429 || status >= 500;

export class NotificationProviders {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: ProviderTransport = { fetch: globalThis.fetch, push: webPush.sendNotification },
    private readonly timeoutMs = 10_000
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error('INVALID_PROVIDER_TIMEOUT');
  }

  readiness(): ProviderReadiness { return notificationProviderReadiness(this.env); }

  async send(request: ProviderRequest): Promise<ProviderResult> {
    try {
      if (request.channel === 'web_push') {
        validatePushSubscription(request.subscription);
        if (!safeText(request.message, 3000) || Buffer.byteLength(request.message) > 3000) throw new Error('INVALID_NOTIFICATION');
      } else validateNotificationRequest(request);
    } catch { return failure('invalid_request', false); }
    if (!this.readiness()[request.channel]) return failure('provider_not_configured', false);

    if (request.channel === 'web_push') {
      try {
        const result = await this.withTimeout(
          this.transport.push(request.subscription, request.message, {
            vapidDetails: vapidDetails(this.env)!, TTL: 60, timeout: this.timeoutMs
          })
        );
        return result.statusCode >= 200 && result.statusCode < 300 ? { status: 'accepted' } :
          failure('provider_rejected', retryStatus(result.statusCode));
      } catch (error) {
        const status = (error as { statusCode?: unknown })?.statusCode;
        return typeof status === 'number' ? failure('provider_rejected', retryStatus(status)) : failure('transport_error', true);
      }
    }

    const isEmail = request.channel === 'email';
    const url = isEmail ? 'https://api.resend.com/emails' : request.channel === 'sms' ?
      'https://api.sendchamp.com/api/v1/sms/send' : 'https://api.sendchamp.com/api/v1/whatsapp/message/send';
    const body = isEmail ? { from: this.env.INVITATION_EMAIL_FROM, to: [request.to], subject: request.subject, text: request.text } :
      request.channel === 'sms' ? { to: [request.to.slice(1)], message: request.message, sender_name: this.env.SENDCHAMP_SMS_SENDER_NAME, route: this.env.SENDCHAMP_SMS_ROUTE } :
        { message: request.message, type: 'text', sender: this.env.SENDCHAMP_WHATSAPP_SENDER!.replace(/^\+/, ''), recipient: [request.to.slice(1)] };
    const controller = new AbortController();
    try {
      const response = await this.withTimeout((async () => {
        const res = await this.transport.fetch(url, {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { Authorization: `Bearer ${isEmail ? this.env.INVITATION_EMAIL_API_KEY : this.env.SENDCHAMP_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) return failure('provider_rejected', retryStatus(res.status));
        let data: any;
        try { data = await res.json(); } catch { return failure('invalid_provider_response', true); }
        if (isEmail) {
          return singleLine(data?.id, 256) ? { status: 'accepted' as const, providerMessageId: data.id } :
            failure('invalid_provider_response', true);
        }
        if (data?.status !== 'success' && data?.status !== true) return failure('provider_rejected', false);
        const id = data?.data?.message_id ?? data?.data?.id;
        return singleLine(id, 256) ? { status: 'accepted' as const, providerMessageId: id } : { status: 'accepted' as const };
      })());
      return response;
    } catch { return failure('transport_error', true); }
    finally { controller.abort(); }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([promise, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), this.timeoutMs);
      })]);
    } finally { clearTimeout(timer!); }
  }
}
