import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH } from 'node:crypto';
import { NotificationProviders, notificationProviderReadiness, validateNotificationRequest, validatePushSubscription } from './providers';
import type { ProviderTransport } from './providers';

function keys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: ecdh.getPublicKey().toString('base64url'), privateKey: ecdh.getPrivateKey().toString('base64url') };
}
const vapid = keys();
const browser = keys();
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/example',
  keys: { p256dh: browser.publicKey, auth: Buffer.alloc(16, 1).toString('base64url') }
};
const env = {
  NOTIFICATION_EMAIL_ENABLED: 'true', NOTIFICATION_SMS_ENABLED: 'true',
  NOTIFICATION_WHATSAPP_ENABLED: 'true', NOTIFICATION_WEB_PUSH_ENABLED: 'true',
  INVITATION_EMAIL_API_KEY: 'test-resend-key', INVITATION_EMAIL_FROM: 'Sender <sender@example.test>',
  SENDCHAMP_API_KEY: 'test-sendchamp-key', SENDCHAMP_SMS_SENDER_NAME: 'School',
  SENDCHAMP_SMS_ROUTE: 'dnd', SENDCHAMP_WHATSAPP_SENDER: '+2348012345678',
  VAPID_SUBJECT: 'mailto:sender@example.test', VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey
};

test('configured adapters use exact provider endpoints and report only acceptance', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let pushOptions: any;
  const transport: ProviderTransport = {
    fetch: async (url, init) => {
      calls.push({ url: String(url), init: init! });
      return Response.json(String(url).includes('resend') ? { id: 'email-1' } : { status: 'success', data: { id: 'msg-1' } });
    },
    push: async (_subscription, _payload, options) => {
      pushOptions = options;
      return { statusCode: 201, body: '', headers: {} };
    }
  };
  const providers = new NotificationProviders(env, transport);
  assert.deepEqual(providers.readiness(), { email: true, sms: true, whatsapp: true, web_push: true });
  assert.equal((await providers.send({ channel: 'email', to: 'recipient@example.test', subject: 'Subject', text: 'Hello' })).status, 'accepted');
  assert.equal((await providers.send({ channel: 'sms', to: '+2348012345678', message: 'Hello' })).status, 'accepted');
  assert.equal((await providers.send({ channel: 'whatsapp', to: '+2348012345678', message: 'Hello' })).status, 'accepted');
  assert.equal((await providers.send({ channel: 'web_push', subscription, message: 'Hello' })).status, 'accepted');
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { from: env.INVITATION_EMAIL_FROM, to: ['recipient@example.test'], subject: 'Subject', text: 'Hello' });
  assert.equal(calls[1].url, 'https://api.sendchamp.com/api/v1/sms/send');
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { to: ['2348012345678'], message: 'Hello', sender_name: 'School', route: 'dnd' });
  assert.equal(calls[2].url, 'https://api.sendchamp.com/api/v1/whatsapp/message/send');
  assert.deepEqual(JSON.parse(String(calls[2].init.body)), { message: 'Hello', type: 'text', sender: '2348012345678', recipient: ['2348012345678'] });
  assert.equal((calls[1].init.headers as Record<string, string>).Authorization, 'Bearer test-sendchamp-key');
  assert.equal(pushOptions.vapidDetails.publicKey, vapid.publicKey);
});

test('missing and invalid configuration fails closed without invoking transports', async () => {
  const transport: ProviderTransport = {
    fetch: async () => { throw new Error('must not call'); },
    push: async () => { throw new Error('must not call'); }
  };
  const providers = new NotificationProviders({}, transport);
  for (const request of [
    { channel: 'email' as const, to: 'a@example.test', subject: 'Hi', text: 'Hi' },
    { channel: 'sms' as const, to: '+2348012345678', message: 'Hi' },
    { channel: 'whatsapp' as const, to: '+2348012345678', message: 'Hi' },
    { channel: 'web_push' as const, subscription, message: 'Hi' }
  ]) assert.deepEqual(await providers.send(request), { status: 'failed', errorCode: 'provider_not_configured', retryable: false });
  assert.equal(notificationProviderReadiness({ ...env, VAPID_PRIVATE_KEY: keys().privateKey }).web_push, false);
  const disabled = new NotificationProviders({ ...env, NOTIFICATION_EMAIL_ENABLED: 'false' }, transport);
  assert.deepEqual(await disabled.send({ channel: 'email', to: 'a@example.test', subject: 'Hi', text: 'Hi' }),
    { status: 'failed', errorCode: 'provider_not_configured', retryable: false });
  assert.throws(() => validatePushSubscription({ ...subscription, endpoint: 'https://127.0.0.1/private' }), /INVALID_PUSH_SUBSCRIPTION/);
  assert.throws(() => validatePushSubscription({ ...subscription, keys: { ...subscription.keys, auth: 'bad' } }), /INVALID_PUSH_KEY/);
  assert.throws(() => validateNotificationRequest({ channel: 'sms', to: '+2348012345678', message: 'Hi', extra: 'unexpected' } as any), /INVALID_NOTIFICATION/);
});

test('rejects invalid requests, provider errors, ambiguous success and hung transport', async () => {
  const push: ProviderTransport['push'] = async () => { throw { statusCode: 410 }; };
  const response = (res: Response) => new NotificationProviders(env, { fetch: async () => res, push }, 10);
  assert.equal((await response(Response.json({})).send({ channel: 'email', to: 'a@example.test', subject: 'Hi', text: 'Hi' })).status, 'failed');
  assert.deepEqual(await response(Response.json({ status: 'error' })).send({ channel: 'sms', to: '+2348012345678', message: 'Hi' }),
    { status: 'failed', errorCode: 'provider_rejected', retryable: false });
  assert.deepEqual(await response(new Response('', { status: 429 })).send({ channel: 'sms', to: '+2348012345678', message: 'Hi' }),
    { status: 'failed', errorCode: 'provider_rejected', retryable: true });
  assert.deepEqual(await response(new Response()).send({ channel: 'web_push', subscription, message: 'Hi' }),
    { status: 'failed', errorCode: 'provider_rejected', retryable: false });
  assert.deepEqual(await response(new Response()).send({ channel: 'sms', to: 'not-a-phone', message: 'Hi' }),
    { status: 'failed', errorCode: 'invalid_request', retryable: false });
  const hung = new NotificationProviders(env, { fetch: async () => new Promise<Response>(() => {}), push }, 10);
  assert.deepEqual(await hung.send({ channel: 'sms', to: '+2348012345678', message: 'Hi' }),
    { status: 'failed', errorCode: 'transport_error', retryable: true });
});
