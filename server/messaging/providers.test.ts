import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { ProviderTransport } from '../notifications/providers';
import {
  buildEnvProviderConfigs,
  MetaWhatsAppProviderAdapter,
  MessagingProviderRegistry,
  SendchampProviderAdapter,
  TermiiSmsProviderAdapter
} from './providers';
import type { ProviderConfigRecord } from './types';

function makeSendchampConfig(overrides: Partial<ProviderConfigRecord> = {}): ProviderConfigRecord {
  return {
    id: 'sendchamp',
    displayName: 'Sendchamp Multi-Channel Gateway',
    providerType: 'multi',
    supportedChannels: ['sms', 'whatsapp'],
    environment: 'production',
    enabled: true,
    suspended: false,
    priority: 10,
    baseUrl: 'https://api.sendchamp.com',
    credentials: {
      apiKey: 'sendchamp_live_secret_key_123456',
      webhookSecret: 'sc_wh_secret_123456',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd',
      whatsappSender: '+2348090001122',
      environment: 'production'
    },
    options: {},
    ...overrides
  };
}

function makeMetaConfig(overrides: Partial<ProviderConfigRecord> = {}): ProviderConfigRecord {
  return {
    id: 'meta_whatsapp',
    displayName: 'Meta WhatsApp Business Cloud API',
    providerType: 'whatsapp',
    supportedChannels: ['whatsapp'],
    environment: 'production',
    enabled: true,
    suspended: false,
    priority: 20,
    baseUrl: 'https://graph.facebook.com',
    credentials: {
      apiKey: 'EAAG_live_meta_access_token_xyz',
      webhookSecret: 'meta_app_secret_xyz',
      wabaId: '104958203948102',
      phoneNumberId: '109283746501928',
      whatsappSender: '109283746501928',
      environment: 'production'
    },
    options: {},
    ...overrides
  };
}

function makeTermiiConfig(overrides: Partial<ProviderConfigRecord> = {}): ProviderConfigRecord {
  return {
    id: 'termii_sms',
    displayName: 'Termii Regional SMS Gateway',
    providerType: 'sms',
    supportedChannels: ['sms'],
    environment: 'production',
    enabled: true,
    suspended: false,
    priority: 30,
    baseUrl: 'https://v3.api.termii.com',
    credentials: {
      apiKey: 'TL_live_termii_api_key_xyz',
      webhookSecret: 'termii_wh_secret_xyz',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd',
      environment: 'production'
    },
    options: {},
    ...overrides
  };
}

function mockJsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

test('Sendchamp, Meta WhatsApp, and Termii config validation enforces credentials and rejects staging configs in production', () => {
  const sendchamp = new SendchampProviderAdapter();
  const meta = new MetaWhatsAppProviderAdapter();
  const termii = new TermiiSmsProviderAdapter();

  assert.equal(sendchamp.validateConfig(makeSendchampConfig(), 'production').valid, true);
  assert.equal(sendchamp.validateConfig(makeSendchampConfig({ enabled: false }), 'production').readinessStatus, 'channel_disabled');
  assert.equal(
    sendchamp.validateConfig(makeSendchampConfig({ credentials: { apiKey: '', environment: 'production' } }), 'production').readinessStatus,
    'credentials_missing'
  );
  assert.equal(
    sendchamp.validateConfig(makeSendchampConfig({ environment: 'staging' }), 'production').readinessStatus,
    'credentials_invalid'
  );
  assert.equal(
    sendchamp.validateSenderIdentity('test_school', 'sms', 'production').valid,
    false
  );
  assert.equal(sendchamp.validateSenderIdentity('EduNotice', 'sms', 'production').valid, true);
  assert.equal(sendchamp.validateSenderIdentity('TooLongSenderName123', 'sms', 'production').valid, false);
  assert.equal(sendchamp.validateSenderIdentity('+2348090001122', 'whatsapp', 'production').valid, true);

  assert.equal(meta.validateConfig(makeMetaConfig(), 'production').valid, true);
  assert.equal(
    meta.validateConfig(makeMetaConfig({ credentials: { apiKey: 'token' } }), 'production').readinessStatus,
    'sender_not_approved'
  );
  assert.equal(
    meta.validateTemplate({ name: 'school_attendance_alert', locale: 'en', approved: false }).valid,
    false
  );
  assert.equal(
    meta.validateTemplate({ name: 'school_attendance_alert', locale: 'en', approved: true }).valid,
    true
  );

  assert.equal(termii.validateConfig(makeTermiiConfig(), 'production').valid, true);
  assert.equal(termii.validateConfig(makeTermiiConfig({ environment: 'development' }), 'production').readinessStatus, 'credentials_invalid');
});

test('Sendchamp sendSms & sendWhatsApp handle success, rate limit headers, auth failures, and timeouts', async () => {
  const adapter = new SendchampProviderAdapter(250);
  const cfg = makeSendchampConfig();

  const okTransport: ProviderTransport = {
    fetch: async () => mockJsonResponse(
      200,
      { status: 'success', data: { message_id: 'sc_msg_101' } },
      { 'x-ratelimit-remaining': '98' }
    ),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  };
  const smsRes = await adapter.sendSms({
    channel: 'sms',
    to: '+2348012345678',
    message: 'Your code is 123456',
    idempotencyKey: 'idem-1'
  }, cfg, okTransport);
  assert.equal(smsRes.accepted, true);
  assert.equal(smsRes.lifecycleState, 'provider_accepted');
  assert.equal(smsRes.providerMessageId, 'sc_msg_101');
  assert.equal(smsRes.rateLimitRemaining, 98);
  assert.equal(smsRes.currency, 'NGN');

  const unapprovedWa = await adapter.sendWhatsApp({
    channel: 'whatsapp',
    to: '+2348012345678',
    message: 'Attendance alert',
    template: { name: 'unapproved_tpl', locale: 'en', approved: false }
  }, cfg, okTransport);
  assert.equal(unapprovedWa.accepted, false);
  assert.equal(unapprovedWa.errorCode, 'template_not_approved');
  assert.equal(unapprovedWa.retryable, false);

  const authFailTransport: ProviderTransport = {
    fetch: async () => mockJsonResponse(401, { status: 'error' }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  };
  const authRes = await adapter.sendSms({
    channel: 'sms',
    to: '+2348012345678',
    message: 'Test'
  }, cfg, authFailTransport);
  assert.equal(authRes.accepted, false);
  assert.equal(authRes.errorCode, 'credentials_invalid');
  assert.equal(authRes.retryable, false);

  const rateLimitTransport: ProviderTransport = {
    fetch: async () => mockJsonResponse(429, { status: 'error' }, { 'x-ratelimit-remaining': '0' }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  };
  const rateRes = await adapter.sendSms({
    channel: 'sms',
    to: '+2348012345678',
    message: 'Test'
  }, cfg, rateLimitTransport);
  assert.equal(rateRes.accepted, false);
  assert.equal(rateRes.errorCode, 'rate_limited');
  assert.equal(rateRes.retryable, true);
  assert.equal(rateRes.rateLimitRemaining, 0);

  const networkFailTransport: ProviderTransport = {
    fetch: async () => {
      throw new Error('ECONNRESET');
    },
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  };
  const netRes = await adapter.sendWhatsApp({
    channel: 'whatsapp',
    to: '+2348012345678',
    message: 'Hello parent',
    template: { name: 'school_attendance_alert', locale: 'en', approved: true }
  }, cfg, networkFailTransport);
  assert.equal(netRes.accepted, false);
  assert.equal(netRes.retryable, true);
  assert.equal(netRes.failureCategory, 'provider_unavailable');
});

test('Meta WhatsApp and Termii SMS adapters dispatch via mocked HTTP transports cleanly', async () => {
  const meta = new MetaWhatsAppProviderAdapter();
  const termii = new TermiiSmsProviderAdapter();

  const metaRes = await meta.sendWhatsApp({
    channel: 'whatsapp',
    to: '+2348012345678',
    message: 'Fee schedule approved',
    template: {
      name: 'school_fee_policy_notice',
      locale: 'en',
      variables: { policyName: '2026 Term 1' },
      approved: true
    }
  }, makeMetaConfig(), {
    fetch: async () => mockJsonResponse(200, { messages: [{ id: 'wamid.HBgLMjM0ODAx' }] }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  });
  assert.equal(metaRes.accepted, true);
  assert.equal(metaRes.providerMessageId, 'wamid.HBgLMjM0ODAx');

  const termiiRes = await termii.sendSms({
    channel: 'sms',
    to: '+2348012345678',
    message: 'Verification code: 445566'
  }, makeTermiiConfig(), {
    fetch: async () => mockJsonResponse(200, { message_id: 'trm_msg_991' }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  });
  assert.equal(termiiRes.accepted, true);
  assert.equal(termiiRes.providerMessageId, 'trm_msg_991');

  const metaSms = await meta.sendSms();
  assert.equal(metaSms.accepted, false);
  assert.equal(metaSms.errorCode, 'channel_not_supported');
  const termiiWa = await termii.sendWhatsApp();
  assert.equal(termiiWa.accepted, false);
  assert.equal(termiiWa.errorCode, 'channel_not_supported');
});

test('Provider webhook verification validates HMAC signatures, rejects tampering and stale timestamps, and normalizes delivery events', () => {
  const nowMs = 1_760_000_000_000;
  const nowSec = String(Math.floor(nowMs / 1000));

  const sendchamp = new SendchampProviderAdapter();
  const scSecret = 'sc_wh_secret_123456';
  const scPayload = JSON.stringify({
    event_id: 'evt_sc_1',
    event: 'sms.delivered',
    data: { message_id: 'sc_msg_101', status: 'delivered', channel: 'sms' }
  });
  const scSig = createHmac('sha256', scSecret).update(`${nowSec}.${scPayload}`).digest('hex');

  assert.equal(
    sendchamp.verifyWebhookSignature(
      { 'x-sendchamp-signature': scSig, 'x-sendchamp-timestamp': nowSec },
      scPayload,
      scSecret,
      nowMs
    ).valid,
    true
  );
  assert.equal(
    sendchamp.verifyWebhookSignature(
      { 'x-sendchamp-signature': scSig, 'x-sendchamp-timestamp': nowSec },
      `${scPayload} `,
      scSecret,
      nowMs
    ).reason,
    'INVALID_WEBHOOK_SIGNATURE'
  );
  assert.equal(
    sendchamp.verifyWebhookSignature(
      { 'x-sendchamp-signature': scSig, 'x-sendchamp-timestamp': String(Math.floor((nowMs - 600_000) / 1000)) },
      scPayload,
      scSecret,
      nowMs
    ).reason,
    'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW'
  );
  assert.equal(
    sendchamp.verifyWebhookSignature({}, scPayload, '', nowMs).reason,
    'WEBHOOK_SECRET_NOT_CONFIGURED'
  );

  const normalizedSc = sendchamp.normalizeWebhookEvent(JSON.parse(scPayload));
  assert.equal(normalizedSc?.providerMessageId, 'sc_msg_101');
  assert.equal(normalizedSc?.lifecycleState, 'delivered');

  const meta = new MetaWhatsAppProviderAdapter();
  const metaSecret = 'meta_app_secret_xyz';
  const metaBody = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: 'wamid.123', status: 'read', timestamp: nowSec }]
        }
      }]
    }]
  });
  const metaSig = `sha256=${createHmac('sha256', metaSecret).update(metaBody).digest('hex')}`;
  assert.equal(
    meta.verifyWebhookSignature({ 'x-hub-signature-256': metaSig }, metaBody, metaSecret, nowMs).valid,
    true
  );
  assert.equal(
    meta.verifyWebhookSignature({ 'x-hub-signature-256': 'sha256=deadbeef' }, metaBody, metaSecret, nowMs).valid,
    false
  );
  const normalizedMeta = meta.normalizeWebhookEvent(JSON.parse(metaBody));
  assert.equal(normalizedMeta?.lifecycleState, 'read');
  assert.equal(normalizedMeta?.providerMessageId, 'wamid.123');

  const termii = new TermiiSmsProviderAdapter();
  const termiiSecret = 'termii_wh_secret_xyz';
  const termiiBody = JSON.stringify({ message_id: 'trm_123', status: 'delivered', notify_id: 'n1' });
  const termiiSig = createHmac('sha512', termiiSecret).update(termiiBody).digest('hex');
  assert.equal(
    termii.verifyWebhookSignature({ 'x-termii-signature': termiiSig }, termiiBody, termiiSecret, nowMs).valid,
    true
  );
  assert.equal(
    termii.normalizeWebhookEvent(JSON.parse(termiiBody))?.lifecycleState,
    'delivered'
  );
});

test('MessagingProviderRegistry builds env configurations for all three providers without exposing secrets in metadata', () => {
  const configs = buildEnvProviderConfigs({
    NODE_ENV: 'production',
    NOTIFICATION_SMS_ENABLED: 'true',
    SENDCHAMP_API_KEY: 'live_key',
    SENDCHAMP_SMS_SENDER_NAME: 'Curriculum',
    SENDCHAMP_SMS_ROUTE: 'dnd',
    META_WHATSAPP_ENABLED: 'true',
    META_WHATSAPP_ACCESS_TOKEN: 'meta_tok',
    META_WHATSAPP_WABA_ID: '123456',
    META_WHATSAPP_PHONE_NUMBER_ID: '654321',
    TERMII_SMS_ENABLED: 'false'
  });
  assert.equal(configs.length, 3);
  assert.equal(configs.find(c => c.id === 'sendchamp')?.enabled, true);
  assert.equal(configs.find(c => c.id === 'meta_whatsapp')?.enabled, true);
  assert.equal(configs.find(c => c.id === 'termii_sms')?.enabled, false);

  const registry = new MessagingProviderRegistry();
  assert.ok(registry.getAdapter('sendchamp'));
  assert.ok(registry.getAdapter('meta_whatsapp'));
  assert.ok(registry.getAdapter('termii_sms'));
});

test(
  'live provider credential verification smoke test (runs only when RUN_LIVE_PROVIDER_TESTS=true)',
  { skip: process.env.RUN_LIVE_PROVIDER_TESTS !== 'true' },
  async () => {
    const registry = new MessagingProviderRegistry(process.env);
    const configs = registry.getEnvConfigs().filter(c => c.enabled);
    assert.ok(configs.length > 0, 'At least one live provider must be enabled when RUN_LIVE_PROVIDER_TESTS=true');
    for (const cfg of configs) {
      const adapter = registry.getAdapter(cfg.id);
      assert.ok(adapter);
      const res = await adapter.verifyCredentials(cfg, registry.getTransport());
      assert.equal(res.valid, true, `Expected live credentials for ${cfg.id} to verify cleanly: ${res.reason}`);
    }
  }
);
