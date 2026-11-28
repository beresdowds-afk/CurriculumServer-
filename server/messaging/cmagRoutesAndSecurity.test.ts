import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationResult, AuthorizationSource } from '../authorization/authorizationRepository';
import { createAuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { ServerTenantTokenService } from '../tenantTokenService';
import { CmagCommunicationEngine } from './communicationEngine';
import { CmagDeliveryEngine } from './deliveryEngine';
import { CmagOtpService } from './otpService';
import { MessagingProviderRegistry } from './providers';
import { createCmagRouters } from './routes';
import { buildPlatformPrincipal, createMockCmagPool } from './cmagTestHelpers';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const USER_ADMIN_A = '10000000-0000-4000-8000-000000000001';
const USER_TEACHER_A = '10000000-0000-4000-8000-000000000002';
const SESSION_ADMIN_A = '30000000-0000-4000-8000-000000000001';
const SESSION_TEACHER_A = '30000000-0000-4000-8000-000000000002';
const GUARDIAN_1 = '33333333-3333-4333-8333-333333333331';
const STUDENT_1 = '44444444-4444-4444-8444-444444444441';

function buildTestAuthSource(): AuthorizationSource {
  return {
    async authorize(tenant, userId, sessionId): Promise<AuthorizationResult> {
      if (tenant.tenantId === TENANT_A && userId === USER_ADMIN_A && sessionId === SESSION_ADMIN_A) {
        return {
          ok: true,
          principal: createAuthorizedPrincipal({
            tenant,
            userId: USER_ADMIN_A,
            sessionId: SESSION_ADMIN_A,
            grants: [{
              roleCode: 'principal',
              permissions: [
                PERMISSIONS.messagingConfigRead,
                PERMISSIONS.messagingConfigManage,
                PERMISSIONS.messagingTemplatesManage,
                PERMISSIONS.messagingPreferencesManage,
                PERMISSIONS.messagingSend,
                PERMISSIONS.messagingBroadcast,
                PERMISSIONS.messagingEmergency,
                PERMISSIONS.messagingRetry,
                PERMISSIONS.messagingReportsRead
              ],
              scopes: []
            }]
          })
        };
      }
      if (tenant.tenantId === TENANT_A && userId === USER_TEACHER_A && sessionId === SESSION_TEACHER_A) {
        return {
          ok: true,
          principal: createAuthorizedPrincipal({
            tenant,
            userId: USER_TEACHER_A,
            sessionId: SESSION_TEACHER_A,
            grants: [{
              roleCode: 'teacher',
              permissions: [PERMISSIONS.messagingConfigRead],
              scopes: []
            }]
          })
        };
      }
      return { ok: false, reason: 'MEMBERSHIP_INACTIVE' };
    }
  };
}

test('CMAG Express routes enforce capability gate, RBAC, platform/tenant OTP, webhook HMAC, secret redaction, and fail-closed DB guard', async () => {
  process.env.PLATFORM_ADMIN_EMAILS = 'platform@curriculum-server.test';
  process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
    'platform@curriculum-server.test': 'platform-test-admin-secret-key-32chars!'
  });
  const { pool, state } = createMockCmagPool();
  const registry = new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success', data: { message_id: 'sc_http_1' } }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  });
  const deliveryEngine = new CmagDeliveryEngine(pool, registry);
  const otpService = new CmagOtpService(pool, deliveryEngine);
  const commsEngine = new CmagCommunicationEngine(pool, deliveryEngine);

  let configured = true;
  const authMw = createAuthorizationMiddleware({
    verifyToken: token => ServerTenantTokenService.verifyTenantToken(token),
    signingConfigured: () => true,
    authorization: () => buildTestAuthSource(),
    platformAdministratorAllowed: email => email.toLowerCase() === 'platform@curriculum-server.test'
  });

  const cmag = createCmagRouters({
    getPool: () => pool,
    isConfigured: () => configured,
    authorizationMiddleware: authMw,
    requirePlatformAdmin: authMw.platformAdministrator,
    deliveryEngine,
    otpService,
    communicationEngine: commsEngine
  });

  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));
  app.use('/api', createApiCapabilityGateMiddleware());
  app.use('/api/v1', cmag.authOtpRouter);
  app.use('/api/v1', cmag.webhookRouter);
  app.use('/api/v1/platform/messaging', cmag.platformRouter);
  app.use('/api/v1/messaging', cmag.tenantRouter);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    const platform = buildPlatformPrincipal('platform@curriculum-server.test');
    await deliveryEngine.upsertProviderConfig(platform, 'sendchamp', {
      enabled: true,
      environment: 'production',
      credentials: {
        apiKey: 'sc_live_secret_http_123',
        webhookSecret: 'sc_wh_secret_http_123',
        smsSenderName: 'Curriculum',
        smsRoute: 'dnd',
        whatsappSender: '+2348090001122'
      }
    });

    const platformToken = ServerTenantTokenService.issuePlatformAdminToken('platform@curriculum-server.test');
    const principalToken = ServerTenantTokenService.issueTenantToken(
      { id: TENANT_A, appId: 'app_curriculum_flow', schoolName: 'Alpha High', subscriptionTier: 'standard', status: 'active' },
      'principal',
      3600,
      'principal@testschool.edu',
      USER_ADMIN_A,
      SESSION_ADMIN_A
    );
    const teacherToken = ServerTenantTokenService.issueTenantToken(
      { id: TENANT_A, appId: 'app_curriculum_flow', schoolName: 'Alpha High', subscriptionTier: 'standard', status: 'active' },
      'teacher',
      3600,
      'teacher@testschool.edu',
      USER_TEACHER_A,
      SESSION_TEACHER_A
    );

    // 1. Platform OTP works with ZERO schools seeded
    const platOtpReq = await fetch(`${baseUrl}/server/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'platform@curriculum-server.test',
        phone: '+2348012345678',
        purpose: 'platform_login'
      })
    });
    assert.equal(platOtpReq.status, 201);
    const platOtpJson = await platOtpReq.json() as any;
    const platOutbox = state.platformOutbox.find(o => o.id === platOtpJson.data.outboxId)!;
    const platOtpText = JSON.parse(ServerSecretVault.decrypt(platOutbox.encrypted_request)).data.request.message as string;
    const platCode = platOtpText.match(/(\d{6})/)![1];

    const platVerify = await fetch(`${baseUrl}/server/auth/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        challengeId: platOtpJson.data.challengeId,
        email: 'platform@curriculum-server.test',
        purpose: 'platform_login',
        code: platCode
      })
    });
    assert.equal(platVerify.status, 200);
    const platVerifyJson = await platVerify.json() as any;
    assert.ok(platVerifyJson.data.token);

    // 2. Non-platform user rejected on platform messaging admin routes (403); platform admin gets redacted providers (no secrets!)
    const forbiddenPlat = await fetch(`${baseUrl}/platform/messaging/providers`, {
      headers: { authorization: `Bearer ${principalToken}` }
    });
    assert.equal(forbiddenPlat.status, 403);

    const platProvidersRes = await fetch(`${baseUrl}/platform/messaging/providers`, {
      headers: { authorization: `Bearer ${platformToken}` }
    });
    assert.equal(platProvidersRes.status, 200);
    const platProvidersText = await platProvidersRes.text();
    assert.equal(platProvidersText.includes('sc_live_secret_http_123'), false);
    assert.equal(platProvidersText.includes('sc_wh_secret_http_123'), false);

    // 3. Seed approved school, user, guardian, student, and provision messaging
    state.tenants.set(TENANT_A, { id: TENANT_A, status: 'approved', schoolName: 'Alpha High' });
    state.users.push({ id: USER_ADMIN_A, email: 'principal@testschool.edu', full_name: 'Principal A', account_status: 'active' });
    state.memberships.push({ tenant_id: TENANT_A, user_id: USER_ADMIN_A, role: 'principal', status: 'active', revoked_at: null });
    state.guardians.push({ id: GUARDIAN_1, tenant_id: TENANT_A, phone: '+2348030009999', verification_status: 'verified' });
    state.students.push({ id: STUDENT_1, tenant_id: TENANT_A, class_id: null });
    state.studentGuardians.push({ tenant_id: TENANT_A, guardian_id: GUARDIAN_1, student_id: STUDENT_1, can_receive_notifications: true });

    const client = await pool.connect();
    await commsEngine.provisionTenantMessagingInTransaction(client, {
      tenantId: TENANT_A,
      applicationInstanceId: 'aaaa1111-1111-4111-8111-111111111111',
      applicationId: 'app_curriculum_flow',
      updatedBy: 'setup'
    });
    client.release();

    // 4. School / Flow OTP request & verify issues real tenant token
    const flowOtpReq = await fetch(`${baseUrl}/flow/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_A,
        email: 'principal@testschool.edu',
        phone: '+2348030001111',
        purpose: 'login_otp'
      })
    });
    assert.equal(flowOtpReq.status, 201);
    const flowOtpJson = await flowOtpReq.json() as any;
    const tenantOutbox = state.tenantOutbox.find(o => o.id === flowOtpJson.data.outboxId)!;
    const tenantOtpText = JSON.parse(ServerSecretVault.decrypt(tenantOutbox.encrypted_request)).data.request.message as string;
    const tenantCode = tenantOtpText.match(/(\d{6})/)![1];

    const flowVerifyRes = await fetch(`${baseUrl}/flow/auth/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_A,
        challengeId: flowOtpJson.data.challengeId,
        email: 'principal@testschool.edu',
        phone: '+2348030001111',
        purpose: 'login_otp',
        code: tenantCode
      })
    });
    assert.equal(flowVerifyRes.status, 200);
    const flowVerifyJson = await flowVerifyRes.json() as any;
    assert.ok(flowVerifyJson.data.token);
    assert.equal(flowVerifyJson.data.user.role, 'principal');

    // 5. RBAC enforcement on school routes: unauthenticated -> 401; teacher lacking messaging.send -> 403; principal -> 202
    const unauthSend = await fetch(`${baseUrl}/messaging/send`, { method: 'POST' });
    assert.equal(unauthSend.status, 401);

    const teacherSend = await fetch(`${baseUrl}/messaging/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${teacherToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'guardian',
        guardianId: GUARDIAN_1,
        studentId: STUDENT_1,
        classification: 'transactional',
        category: 'attendance',
        purpose: 'check_in',
        message: 'Student checked in'
      })
    });
    assert.equal(teacherSend.status, 403);

    const principalSend = await fetch(`${baseUrl}/messaging/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${principalToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        recipientType: 'guardian',
        recipientId: GUARDIAN_1,
        guardianId: GUARDIAN_1,
        studentId: STUDENT_1,
        channel: 'sms',
        classification: 'transactional',
        category: 'attendance',
        purpose: 'check_in',
        message: 'Student checked in safely'
      })
    });
    assert.equal(principalSend.status, 202);

    // 6. Dispatch queued message then test webhook HMAC validation + replay
    await deliveryEngine.dispatchOneTenant(platform);
    const ts = String(Math.floor(Date.now() / 1000));
    const whBody = JSON.stringify({
      event_id: 'evt_route_1',
      event: 'sms.delivered',
      data: { message_id: 'sc_http_1', status: 'delivered', channel: 'sms' }
    });
    const invalidWh = await fetch(`${baseUrl}/messaging/webhooks/sendchamp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sendchamp-signature': 'bad_sig', 'x-sendchamp-timestamp': ts },
      body: whBody
    });
    assert.equal(invalidWh.status, 401);

    const validSig = createHmac('sha256', 'sc_wh_secret_http_123').update(`${ts}.${whBody}`).digest('hex');
    const validWh = await fetch(`${baseUrl}/messaging/webhooks/sendchamp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sendchamp-signature': validSig, 'x-sendchamp-timestamp': ts },
      body: whBody
    });
    assert.equal(validWh.status, 200);
    const validWhJson = await validWh.json() as any;
    assert.equal(validWhJson.replay, false);

    // 7. DB unavailable fail-closed guard returns 503 DATABASE_UNAVAILABLE
    configured = false;
    const dbDown = await fetch(`${baseUrl}/messaging/overview`, {
      headers: { authorization: `Bearer ${principalToken}` }
    });
    assert.equal(dbDown.status, 503);
    const dbDownJson = await dbDown.json() as any;
    assert.equal(dbDownJson.code, 'DATABASE_UNAVAILABLE');
  } finally {
    server.close();
  }
});
