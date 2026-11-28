import assert from 'node:assert/strict';
import test from 'node:test';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { CmagDeliveryEngine } from './deliveryEngine';
import { CmagOtpService } from './otpService';
import { MessagingProviderRegistry } from './providers';
import { buildPlatformPrincipal, createMockCmagPool } from './cmagTestHelpers';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const APP_INST_A1 = 'aaaa1111-1111-4111-8111-111111111111';
const APP_INST_A2 = 'aaaa2222-2222-4222-8222-222222222222';

function extractOtpFromOutboxCiphertext(scopeKey: string, outboxId: string, ciphertext: string): string {
  const opened = JSON.parse(ServerSecretVault.decrypt(ciphertext));
  assert.equal(opened.scopeKey, scopeKey);
  assert.equal(opened.outboxId, outboxId);
  const text = String(opened.data?.request?.message || opened.data?.request?.text || '');
  const match = text.match(/(\d{6})/);
  assert.ok(match, 'Expected 6-digit OTP inside sealed outbox payload');
  return match[1];
}

test('CmagOtpService issues and verifies platform OTPs with zero schools, hashes OTP codes, enforces cooldown and brute-force lockout', async () => {
  process.env.PLATFORM_ADMIN_EMAILS = 'founder@curriculum-server.test';
  process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
    'founder@curriculum-server.test': 'founder-test-admin-secret-key-32chars!'
  });
  let nowMs = Date.now();
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool, new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success', data: { message_id: 'sc_1' } }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  }));
  const platform = buildPlatformPrincipal('founder@curriculum-server.test');

  await engine.upsertProviderConfig(platform, 'sendchamp', {
    enabled: true,
    environment: 'production',
    credentials: {
      apiKey: 'sc_key_123456',
      webhookSecret: 'sc_wh_secret_123456',
      smsSenderName: 'Curriculum',
      smsRoute: 'dnd',
      whatsappSender: '+2348090001122'
    }
  });

  const otp = new CmagOtpService(pool, engine, {
    windowMs: 60_000,
    maxPerIp: 10,
    maxPerRecipient: 3,
    maxPerTenant: 20,
    maxPerApplication: 20
  }, () => nowMs);

  // Unallowlisted email fails closed
  await assert.rejects(
    otp.requestPlatformOtp(platform, {
      email: 'attacker@evil.invalid',
      phone: '+2348012345678',
      purpose: 'platform_login',
      ipAddress: '10.0.0.1'
    }),
    (err: any) => err?.code === 'PLATFORM_ADMIN_NOT_AUTHORIZED'
  );

  // Request works with zero schools in DB
  const receipt = await otp.requestPlatformOtp(platform, {
    email: 'founder@curriculum-server.test',
    phone: '+2348012345678',
    purpose: 'platform_login',
    ipAddress: '10.0.0.1'
  });
  assert.equal(receipt.channel, 'sms');
  assert.match(receipt.maskedDestination, /^\+234\*\*\*\*678$/);

  const outboxRow = state.platformOutbox.find(o => o.id === receipt.outboxId)!;
  const code = extractOtpFromOutboxCiphertext('platform', outboxRow.id, outboxRow.encrypted_request);
  const challengeRow = state.platformOtpChallenges.find(c => c.id === receipt.challengeId)!;
  assert.equal(Buffer.isBuffer(challengeRow.otp_hash), true);
  assert.equal(challengeRow.otp_hash.toString('utf8').includes(code), false);

  // Resend within cooldown rejected
  await assert.rejects(
    otp.requestPlatformOtp(platform, {
      email: 'founder@curriculum-server.test',
      phone: '+2348012345678',
      purpose: 'platform_login',
      ipAddress: '10.0.0.1'
    }),
    (err: any) => err?.code === 'OTP_RESEND_COOLDOWN'
  );

  // 5 wrong attempts lock challenge
  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(
      otp.verifyPlatformOtp(platform, {
        challengeId: receipt.challengeId,
        email: 'founder@curriculum-server.test',
        purpose: 'platform_login',
        code: code === '000000' ? '999999' : '000000'
      }),
      (err: any) => err?.code === (i < 4 ? 'INVALID_OTP_CODE' : 'OTP_ATTEMPTS_EXCEEDED')
    );
  }

  // After cooldown + 60s, resend succeeds and valid code verifies once
  nowMs += 60_000;
  const secondReceipt = await otp.requestPlatformOtp(platform, {
    email: 'founder@curriculum-server.test',
    phone: '+2348012345678',
    purpose: 'platform_login',
    ipAddress: '10.0.0.1'
  });
  const secondCode = extractOtpFromOutboxCiphertext(
    'platform',
    secondReceipt.outboxId,
    state.platformOutbox.find(o => o.id === secondReceipt.outboxId)!.encrypted_request
  );
  const verified = await otp.verifyPlatformOtp(platform, {
    challengeId: secondReceipt.challengeId,
    email: 'founder@curriculum-server.test',
    purpose: 'platform_login',
    code: secondCode
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.channel, 'sms');

  // Replay of already verified challenge fails closed
  await assert.rejects(
    otp.verifyPlatformOtp(platform, {
      challengeId: secondReceipt.challengeId,
      email: 'founder@curriculum-server.test',
      purpose: 'platform_login',
      code: secondCode
    }),
    (err: any) => err?.code === 'OTP_CHALLENGE_EXPIRED_OR_INVALID'
  );
});

test('CmagOtpService enforces tenant/application isolation, channel policy fallback, expiry, rate limits, and session issuance', async () => {
  let nowMs = Date.now();
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool, new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success', data: { message_id: 'sc_2' } }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  }));
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

  state.tenants.set(TENANT_A, { id: TENANT_A, status: 'approved', schoolName: 'Crestview Academy' });
  state.tenants.set(TENANT_B, { id: TENANT_B, status: 'approved', schoolName: 'Horizon College' });
  state.users.push({
    id: '10000000-0000-4000-8000-000000000010',
    email: 'bursar@crestview.edu',
    full_name: 'Ada Obi',
    account_status: 'active'
  });
  state.memberships.push({
    tenant_id: TENANT_A,
    user_id: '10000000-0000-4000-8000-000000000010',
    role: 'bursar',
    status: 'active',
    revoked_at: null
  });
  state.tenantConfigs.set(TENANT_A, {
    tenant_id: TENANT_A,
    feature_enabled: true,
    suspended: false,
    sms_enabled: false,
    whatsapp_enabled: true,
    auth_delivery_enabled: true,
    auth_channel_policy: 'sms_then_whatsapp',
    sms_sender_name: 'Crestview',
    whatsapp_sender_number: '+2348090001122'
  });
  state.appConfigs.push({
    tenant_id: TENANT_A,
    application_instance_id: APP_INST_A1,
    application_id: 'app_curriculum_flow',
    share_tenant_config: true,
    entitlement_status: 'active',
    sms_enabled: true,
    whatsapp_enabled: true,
    auth_delivery_enabled: true,
    auth_channel_policy: 'sms_then_whatsapp',
    permitted_channels: ['sms', 'whatsapp', 'email']
  });

  const otp = new CmagOtpService(pool, engine, {
    windowMs: 60_000,
    maxPerIp: 5,
    maxPerRecipient: 2,
    maxPerTenant: 20,
    maxPerApplication: 20
  }, () => nowMs);

  // Because SMS is disabled on tenant config and policy is sms_then_whatsapp, resolves cleanly to WhatsApp
  const req = await otp.requestTenantOtp(platform, {
    tenantId: TENANT_A,
    applicationId: 'app_curriculum_flow',
    applicationInstanceId: APP_INST_A1,
    userId: '10000000-0000-4000-8000-000000000010',
    phone: '+2348011112222',
    purpose: 'login_otp',
    ipAddress: '192.168.1.2'
  });
  assert.equal(req.channel, 'whatsapp');

  const outboxRow = state.tenantOutbox.find(o => o.id === req.outboxId)!;
  const code = extractOtpFromOutboxCiphertext(TENANT_A, outboxRow.id, outboxRow.encrypted_request);

  // Cross-tenant verify attempt fails closed
  await assert.rejects(
    otp.verifyTenantOtp({
      tenantId: TENANT_B,
      applicationId: 'app_curriculum_flow',
      challengeId: req.challengeId,
      phone: '+2348011112222',
      purpose: 'login_otp',
      code
    }),
    (err: any) => err?.code === 'OTP_CHALLENGE_EXPIRED_OR_INVALID'
  );

  // Cross-application verification fails closed
  await assert.rejects(
    otp.verifyTenantOtp({
      tenantId: TENANT_A,
      applicationId: 'app_cbt',
      challengeId: req.challengeId,
      phone: '+2348011112222',
      purpose: 'login_otp',
      code
    }),
    (err: any) => err?.code === 'OTP_CHALLENGE_EXPIRED_OR_INVALID'
  );

  // Cross-application-instance verification fails closed
  await assert.rejects(
    otp.verifyTenantOtp({
      tenantId: TENANT_A,
      applicationId: 'app_curriculum_flow',
      applicationInstanceId: APP_INST_A2,
      challengeId: req.challengeId,
      phone: '+2348011112222',
      purpose: 'login_otp',
      code
    }),
    (err: any) => err?.code === 'CMAG_APPLICATION_SCOPE_MISMATCH'
  );

  // Valid verify with issueSession creates tenant-bound session record
  const verified = await otp.verifyTenantOtp({
    tenantId: TENANT_A,
    applicationId: 'app_curriculum_flow',
    applicationInstanceId: APP_INST_A1,
    challengeId: req.challengeId,
    phone: '+2348011112222',
    purpose: 'login_otp',
    code,
    issueSession: true,
    ipAddress: '192.168.1.2',
    userAgent: 'TestSuite/1.0'
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.role, 'bursar');
  assert.ok(verified.sessionId);
  assert.equal(state.userSessions[0].auth_method, 'otp_whatsapp');

  // Expiry check + rate limit exhaustion (46s clears 45s cooldown while remaining inside 60s window)
  nowMs += 46_000;
  const req2 = await otp.requestTenantOtp(platform, {
    tenantId: TENANT_A,
    applicationId: 'app_curriculum_flow',
    phone: '+2348011112222',
    purpose: 'login_otp',
    ipAddress: '192.168.1.2'
  });
  await assert.rejects(
    otp.requestTenantOtp(platform, {
      tenantId: TENANT_A,
      applicationId: 'app_curriculum_flow',
      phone: '+2348011112222',
      purpose: 'login_otp',
      ipAddress: '192.168.1.2'
    }),
    (err: any) => err?.code === 'OTP_RATE_LIMITED'
  );

  const code2 = extractOtpFromOutboxCiphertext(
    TENANT_A,
    req2.outboxId,
    state.tenantOutbox.find(o => o.id === req2.outboxId)!.encrypted_request
  );
  nowMs += 6 * 60_000; // Beyond 5 minute TTL
  await assert.rejects(
    otp.verifyTenantOtp({
      tenantId: TENANT_A,
      applicationId: 'app_curriculum_flow',
      challengeId: req2.challengeId,
      phone: '+2348011112222',
      purpose: 'login_otp',
      code: code2
    }),
    (err: any) => err?.code === 'OTP_CHALLENGE_EXPIRED_OR_INVALID'
  );
});
