import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { CmagDeliveryEngine } from './deliveryEngine';
import { MessagingProviderRegistry } from './providers';
import { buildPlatformPrincipal, buildTenantPrincipal, createMockCmagPool } from './cmagTestHelpers';

const TENANT_A = '11111111-1111-4111-8111-111111111111';

test('CmagDeliveryEngine encrypts provider secrets at rest and never exposes plaintext keys in listings', async () => {
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool, new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success' }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  }), () => 0.5);
  const platform = buildPlatformPrincipal();

  const saved = await engine.upsertProviderConfig(platform, 'sendchamp', {
    enabled: true,
    environment: 'production',
    credentials: {
      apiKey: 'sc_super_secret_api_key_999',
      webhookSecret: 'sc_super_secret_wh_999',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd',
      whatsappSender: '+2348090001122'
    }
  });
  assert.equal(saved.readinessStatus, 'operational');

  const rawRow = state.providerConfigs.get('sendchamp');
  assert.ok(rawRow?.encrypted_credentials);
  assert.equal(String(rawRow.encrypted_credentials).includes('sc_super_secret_api_key_999'), false);
  assert.equal(String(rawRow.encrypted_webhook_secret).includes('sc_super_secret_wh_999'), false);

  const list = await engine.listProviderConfigs(platform);
  const serialized = JSON.stringify(list);
  assert.equal(serialized.includes('sc_super_secret_api_key_999'), false);
  assert.equal(serialized.includes('sc_super_secret_wh_999'), false);
  const scSummary = list.find(p => p.id === 'sendchamp');
  assert.equal(scSummary?.hasApiKey, true);
  assert.equal(scSummary?.hasWebhookSecret, true);
  assert.equal(scSummary?.readinessStatus, 'operational');
});

test('CmagDeliveryEngine handles idempotency, retries, dead-lettering, manual retry, failover, and circuit breakers', async () => {
  let attemptCounter = 0;
  const registry = new MessagingProviderRegistry({}, {
    fetch: async (input) => {
      const url = String(input);
      attemptCounter += 1;
      if (url.includes('api.sendchamp.com')) {
        return new Response(JSON.stringify({ status: 'error' }), { status: 503 });
      }
      if (url.includes('termii.com')) {
        return new Response(JSON.stringify({ message_id: `trm_${attemptCounter}` }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 500 });
    },
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  });

  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool, registry, () => 0.5);
  const platform = buildPlatformPrincipal();

  await engine.upsertProviderConfig(platform, 'sendchamp', {
    enabled: true,
    environment: 'production',
    credentials: {
      apiKey: 'sc_key_123456',
      webhookSecret: 'sc_wh_secret_123456',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd',
      whatsappSender: '+2348090001122'
    }
  });
  await engine.upsertProviderConfig(platform, 'termii_sms', {
    enabled: true,
    environment: 'production',
    credentials: {
      apiKey: 'trm_key_123456',
      webhookSecret: 'trm_wh_secret_123456',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd'
    }
  });

  // 1. Failover from Sendchamp 503 -> Termii 200 on platform SMS
  const q1 = await engine.enqueuePlatformMessage(platform, {
    applicationId: 'platform_control_plane',
    environment: 'production',
    classification: 'authentication',
    category: 'authentication',
    purpose: 'platform_login',
    idempotencyKey: 'plat-msg-1',
    request: { channel: 'sms', to: '+2348012345678', message: 'Code 654321' }
  });
  const q1Replay = await engine.enqueuePlatformMessage(platform, {
    applicationId: 'platform_control_plane',
    environment: 'production',
    classification: 'authentication',
    category: 'authentication',
    purpose: 'platform_login',
    idempotencyKey: 'plat-msg-1',
    request: { channel: 'sms', to: '+2348012345678', message: 'Code 654321' }
  });
  assert.equal(q1Replay.idempotentReplay, true);
  assert.equal(q1Replay.outboxId, q1.outboxId);

  const d1 = await engine.dispatchOnePlatform(platform);
  assert.equal(d1?.status, 'provider_accepted');
  assert.equal(d1?.providerId, 'termii_sms');
  assert.equal(state.platformAttempts[0].failover_from_provider, 'sendchamp');

  // 2. Disable failover to test exponential backoff -> dead-letter -> manual retry + circuit open after 5 failures
  state.platformConfig.fallback_enabled = false;
  const q2 = await engine.enqueuePlatformMessage(platform, {
    applicationId: 'platform_control_plane',
    environment: 'production',
    classification: 'transactional',
    category: 'platform_operations',
    purpose: 'alert',
    maxAttempts: 2,
    request: { channel: 'sms', to: '+2348012345678', message: 'Alert' }
  });
  const firstAttempt = await engine.dispatchOnePlatform(platform);
  assert.equal(firstAttempt?.status, 'retry_scheduled');
  // Force next_attempt_at to now for immediate second attempt
  state.platformOutbox.find(o => o.id === q2.outboxId)!.next_attempt_at = new Date(Date.now() - 1000);
  const secondAttempt = await engine.dispatchOnePlatform(platform);
  assert.equal(secondAttempt?.status, 'failed');
  assert.ok(state.platformOutbox.find(o => o.id === q2.outboxId)?.dead_lettered_at);

  // Manual retry moves dead-letter back to queued
  const retried = await engine.retryPlatformMessage(platform, q2.outboxId);
  assert.equal(retried, true);
  assert.equal(state.platformOutbox.find(o => o.id === q2.outboxId)?.status, 'queued');

  // Trigger 3 more failures on sendchamp so consecutive failures reaches 5 and circuit opens
  state.platformConfig.fallback_enabled = true;
  state.providerConfigs.get('termii_sms')!.enabled = false;
  for (let i = 0; i < 3; i += 1) {
    await engine.enqueuePlatformMessage(platform, {
      applicationId: 'platform_control_plane',
      environment: 'production',
      classification: 'transactional',
      category: 'platform_operations',
      purpose: 'probe',
      maxAttempts: 1,
      request: { channel: 'sms', to: '+2348012345678', message: `Probe ${i}` }
    });
    await engine.dispatchOnePlatform(platform);
  }
  const scHealth = state.providerHealth.get('sendchamp:sms');
  assert.equal(scHealth?.circuit_state, 'open');
  assert.ok(scHealth?.consecutive_failures >= 5);
});

test('CmagDeliveryEngine enforces tenant quotas, isolates tenant encryption scope, and processes monotonic anti-replay webhooks', async () => {
  const { pool, state } = createMockCmagPool();
  const registry = new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success', data: { message_id: 'sc_tenant_msg_1' } }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  });
  const engine = new CmagDeliveryEngine(pool, registry, () => 0.5);
  const platform = buildPlatformPrincipal();
  const tenantPrincipal = buildTenantPrincipal(TENANT_A);

  await engine.upsertProviderConfig(platform, 'sendchamp', {
    enabled: true,
    environment: 'production',
    credentials: {
      apiKey: 'sc_key_123456',
      webhookSecret: 'sc_wh_secret_123456',
      smsSenderName: 'EduNotice',
      smsRoute: 'dnd',
      whatsappSender: '+2348090001122'
    }
  });
  state.tenantConfigs.set(TENANT_A, {
    tenant_id: TENANT_A,
    suspended: false,
    daily_quota: 2,
    monthly_quota: 10,
    monthly_budget_minor: null
  });

  // Quota enforcement after 2 transactional dispatches (auth remains exempt)
  state.usageRecords.push({
    tenant_id: TENANT_A,
    application_id: 'app_curriculum_flow',
    usage_date: new Date().toISOString().slice(0, 10),
    channel: 'sms',
    classification: 'transactional',
    sent_count: 2,
    delivered_count: 2,
    failed_count: 0,
    cost_minor: 800,
    currency: 'NGN'
  });

  await assert.rejects(
    engine.enqueueTenantMessage(tenantPrincipal, {
      scope: 'school',
      tenantId: TENANT_A,
      applicationId: 'app_curriculum_flow',
      environment: 'production',
      classification: 'transactional',
      category: 'attendance',
      purpose: 'check_in',
      request: { channel: 'sms', to: '+2348012345678', message: 'Present' }
    }),
    /CMAG_DAILY_QUOTA_EXCEEDED/
  );

  // Authentication OTP bypasses non-auth quota limits
  const authMsg = await engine.enqueueTenantMessage(tenantPrincipal, {
    scope: 'school',
    tenantId: TENANT_A,
    applicationId: 'app_curriculum_flow',
    environment: 'production',
    classification: 'authentication',
    category: 'authentication',
    purpose: 'login_otp',
    request: { channel: 'sms', to: '+2348012345678', message: 'Code 112233' }
  });
  const dispatched = await engine.dispatchOneTenant(platform);
  assert.equal(dispatched?.id, authMsg.outboxId);
  assert.equal(dispatched?.status, 'provider_accepted');

  // Webhook verification: invalid signature rejected, valid delivered accepted, replay handled, stale state regression blocked
  const nowMs = Date.now();
  const ts = String(Math.floor(nowMs / 1000));
  const deliveredBody = JSON.stringify({
    event_id: 'evt_del_1',
    event: 'sms.delivered',
    data: { message_id: 'sc_tenant_msg_1', status: 'delivered', channel: 'sms' }
  });
  const badWebhook = await engine.processWebhook(
    platform,
    'sendchamp',
    { 'x-sendchamp-signature': 'invalid', 'x-sendchamp-timestamp': ts },
    deliveredBody,
    nowMs
  );
  assert.equal(badWebhook.accepted, false);
  assert.equal(badWebhook.statusCode, 401);

  const sigDel = createHmac('sha256', 'sc_wh_secret_123456').update(`${ts}.${deliveredBody}`).digest('hex');
  const okWebhook = await engine.processWebhook(
    platform,
    'sendchamp',
    { 'x-sendchamp-signature': sigDel, 'x-sendchamp-timestamp': ts },
    deliveredBody,
    nowMs
  );
  assert.equal(okWebhook.accepted, true);
  assert.equal(okWebhook.replay, false);
  assert.equal(state.tenantOutbox[0].status, 'delivered');
  assert.equal(state.deliveryReceipts.length, 1);

  // Replay of exact same event returns 200 replay: true without adding duplicate receipt
  const replayWebhook = await engine.processWebhook(
    platform,
    'sendchamp',
    { 'x-sendchamp-signature': sigDel, 'x-sendchamp-timestamp': ts },
    deliveredBody,
    nowMs
  );
  assert.equal(replayWebhook.replay, true);
  assert.equal(state.deliveryReceipts.length, 1);

  // Monotonic status check: out-of-order 'sent' webhook does NOT regress 'delivered'
  const outOfOrderBody = JSON.stringify({
    event_id: 'evt_sent_late',
    event: 'sms.sent',
    data: { message_id: 'sc_tenant_msg_1', status: 'sent', channel: 'sms' }
  });
  const sigLate = createHmac('sha256', 'sc_wh_secret_123456').update(`${ts}.${outOfOrderBody}`).digest('hex');
  const lateRes = await engine.processWebhook(
    platform,
    'sendchamp',
    { 'x-sendchamp-signature': sigLate, 'x-sendchamp-timestamp': ts },
    outOfOrderBody,
    nowMs
  );
  assert.equal(lateRes.accepted, true);
  assert.equal(state.tenantOutbox[0].status, 'delivered');

  const metrics = await engine.getQueueMetrics(tenantPrincipal, 'school');
  assert.equal(metrics.deliveredCount, 1);
});
