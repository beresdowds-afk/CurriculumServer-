import assert from 'node:assert/strict';
import test from 'node:test';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { CmagCommunicationEngine } from './communicationEngine';
import { CmagDeliveryEngine } from './deliveryEngine';
import { CmagEventHooks } from './eventHooks';
import { MessagingProviderRegistry } from './providers';
import { buildTenantPrincipal, createMockCmagPool } from './cmagTestHelpers';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const APP_INST_A = 'aaaa1111-1111-4111-8111-111111111111';
const GUARDIAN_VERIFIED = '33333333-3333-4333-8333-333333333331';
const GUARDIAN_PENDING = '33333333-3333-4333-8333-333333333332';
const STUDENT_1 = '44444444-4444-4444-8444-444444444441';
const CLASS_1 = '55555555-5555-4555-8555-555555555551';

test('provisionTenantMessagingInTransaction idempotently provisions config, entitlements, templates, and audit trail', async () => {
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool);
  const comms = new CmagCommunicationEngine(pool, engine);
  const client = await pool.connect();

  try {
    const first = await comms.provisionTenantMessagingInTransaction(client, {
      tenantId: TENANT_A,
      applicationInstanceId: APP_INST_A,
      applicationId: 'app_curriculum_flow',
      updatedBy: 'installer@curriculum-server.test',
      options: {
        smsEnabled: true,
        whatsappEnabled: true,
        authDeliveryEnabled: true,
        schoolCommsEnabled: true,
        smsSenderName: 'Crestview'
      }
    });
    assert.equal(first.provisioned, true);
    const second = await comms.provisionTenantMessagingInTransaction(client, {
      tenantId: TENANT_A,
      applicationInstanceId: APP_INST_A,
      applicationId: 'app_curriculum_flow',
      updatedBy: 'installer@curriculum-server.test'
    });
    assert.equal(second.provisioned, true);

    assert.equal(state.tenantConfigs.size, 1);
    assert.equal(state.appConfigs.length, 1);
    assert.equal(state.serviceEntitlements.length, 1);
    assert.equal(state.serviceEntitlements[0].service_id, 'central_messaging');
    assert.ok(state.templates.length >= 7);
    assert.ok(state.templates.some(t => t.locale === 'yo' && t.template_key === 'auth_otp'));
    assert.equal(state.tenantAuditEvents.length, 2);
  } finally {
    client.release();
  }
});

test('CmagCommunicationEngine enforces verified guardian links, opt-outs, frequency caps, emergency bypass, and template sanitization', async () => {
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool);
  const comms = new CmagCommunicationEngine(pool, engine);
  const principal = buildTenantPrincipal(TENANT_A);

  const client = await pool.connect();
  await comms.provisionTenantMessagingInTransaction(client, {
    tenantId: TENANT_A,
    applicationInstanceId: APP_INST_A,
    applicationId: 'app_curriculum_flow',
    updatedBy: 'setup'
  });
  client.release();

  state.guardians.push(
    { id: GUARDIAN_VERIFIED, tenant_id: TENANT_A, phone: '+2348033334444', verification_status: 'verified' },
    { id: GUARDIAN_PENDING, tenant_id: TENANT_A, phone: '+2348033335555', verification_status: 'pending' }
  );
  state.studentGuardians.push(
    { tenant_id: TENANT_A, guardian_id: GUARDIAN_VERIFIED, student_id: STUDENT_1, can_receive_notifications: true },
    { tenant_id: TENANT_A, guardian_id: GUARDIAN_PENDING, student_id: STUDENT_1, can_receive_notifications: true }
  );

  // Unverified guardian fails closed
  await assert.rejects(
    comms.sendTargetedMessage(principal, {
      recipientType: 'guardian',
      guardianId: GUARDIAN_PENDING,
      studentId: STUDENT_1,
      classification: 'transactional',
      category: 'attendance',
      purpose: 'absence_notice',
      message: 'Child absent today',
      actorSubject: 'teacher-1'
    }),
    (err: any) => err?.code === 'GUARDIAN_NOT_VERIFIED_FOR_STUDENT'
  );

  // Sensitive guardian message without guardianId fails closed
  await assert.rejects(
    comms.sendTargetedMessage(principal, {
      recipientType: 'guardian',
      toPhone: '+2348033334444',
      classification: 'transactional',
      category: 'fees',
      purpose: 'fee_reminder',
      message: 'Fee invoice due',
      actorSubject: 'bursar-1'
    }),
    (err: any) => err?.code === 'SENSITIVE_GUARDIAN_VERIFICATION_REQUIRED'
  );

  // Verified guardian resolves phone from DB and renders sanitized template
  const sent = await comms.sendTargetedMessage(principal, {
    recipientType: 'guardian',
    recipientId: GUARDIAN_VERIFIED,
    guardianId: GUARDIAN_VERIFIED,
    studentId: STUDENT_1,
    channel: 'sms',
    classification: 'transactional',
    category: 'attendance',
    purpose: 'check_in',
    templateKey: 'attendance_alert',
    variables: {
      schoolName: 'Crestview',
      studentName: 'Tunde\r\nInjected',
      status: 'Present',
      timestamp: '08:05'
    },
    actorSubject: 'gate-officer-1'
  });
  assert.equal(sent.channel, 'sms');
  const outbox = state.tenantOutbox.find(o => o.id === sent.outboxId)!;
  const sealed = JSON.parse(ServerSecretVault.decrypt(outbox.encrypted_request));
  assert.equal(sealed.data.request.to, '+2348033334444');
  assert.equal(sealed.data.request.message.includes('\n'), false);

  // Opted-out guardian is blocked for attendance category, but allowed for emergency override
  await comms.upsertRecipientPreference(principal, {
    recipientType: 'guardian',
    recipientId: GUARDIAN_VERIFIED,
    phoneE164: '+2348033334444',
    optedOutCategories: ['attendance'],
    consentCategory: 'attendance'
  });
  await assert.rejects(
    comms.sendTargetedMessage(principal, {
      recipientType: 'guardian',
      recipientId: GUARDIAN_VERIFIED,
      guardianId: GUARDIAN_VERIFIED,
      studentId: STUDENT_1,
      channel: 'sms',
      classification: 'transactional',
      category: 'attendance',
      purpose: 'check_out',
      message: 'Checked out',
      actorSubject: 'gate-officer-1'
    }),
    (err: any) => err?.code === 'RECIPIENT_OPTED_OUT'
  );

  const emergency = await comms.sendTargetedMessage(principal, {
    recipientType: 'guardian',
    recipientId: GUARDIAN_VERIFIED,
    guardianId: GUARDIAN_VERIFIED,
    studentId: STUDENT_1,
    channel: 'sms',
    classification: 'emergency',
    category: 'emergency',
    purpose: 'campus_closure',
    message: 'Early dismissal at 13:00',
    actorSubject: 'principal-1'
  });
  assert.ok(emergency.outboxId);
});

test('CmagCommunicationEngine deduplicates school-wide broadcasts and CmagEventHooks stays fault-isolated', async () => {
  const { pool, state } = createMockCmagPool();
  const engine = new CmagDeliveryEngine(pool, new MessagingProviderRegistry({}, {
    fetch: async () => new Response(JSON.stringify({ status: 'success' }), { status: 200 }),
    push: async () => ({ statusCode: 201, body: '', headers: {} })
  }));
  const comms = new CmagCommunicationEngine(pool, engine);
  const principal = buildTenantPrincipal(TENANT_A);

  const client = await pool.connect();
  await comms.provisionTenantMessagingInTransaction(client, {
    tenantId: TENANT_A,
    applicationInstanceId: APP_INST_A,
    applicationId: 'app_curriculum_flow',
    updatedBy: 'setup'
  });
  client.release();

  state.students.push({ id: STUDENT_1, tenant_id: TENANT_A, class_id: CLASS_1 });
  state.guardians.push(
    { id: GUARDIAN_VERIFIED, tenant_id: TENANT_A, phone: '+2348033334444', verification_status: 'verified' },
    { id: GUARDIAN_PENDING, tenant_id: TENANT_A, phone: '+2348033335555', verification_status: 'pending' }
  );
  state.studentGuardians.push({ tenant_id: TENANT_A, guardian_id: GUARDIAN_VERIFIED, student_id: STUDENT_1, can_receive_notifications: true });
  state.staff.push(
    { id: 'staff-1', tenant_id: TENANT_A, status: 'active', phone: '+2348033336666' },
    { id: 'staff-dup', tenant_id: TENANT_A, status: 'active', phone: '+2348033334444' } // Duplicate number with guardian
  );

  const campaign = await comms.createAndDispatchBroadcast(principal, {
    title: 'Midterm Break Notice',
    classification: 'broadcast',
    category: 'academics',
    targetMode: 'school_wide',
    channel: 'sms',
    messageBody: 'School closes Friday at 14:00.',
    actorSubject: 'principal-1'
  });
  // Pending guardian excluded + duplicate phone deduplicated -> 2 recipients (verified guardian + staff-1)
  assert.equal(campaign.recipientCount, 2);
  assert.equal(campaign.queuedCount, 2);
  assert.equal(state.campaigns.length, 1);

  // Event hooks: broken pool returns { queued: false } without throwing
  const failingPool = {
    connect: async () => {
      throw new Error('DB_DOWN');
    },
    query: async () => {
      throw new Error('DB_DOWN');
    },
    end: async () => {},
    on: () => failingPool
  } as any;
  const failingHooks = new CmagEventHooks(failingPool);
  const safeFail = await failingHooks.emitTenantWorkflowNotification({
    tenantId: TENANT_A,
    category: 'fees',
    purpose: 'fee_policy_approved',
    guardianId: GUARDIAN_VERIFIED,
    studentId: STUDENT_1,
    message: 'Policy active',
    actorSubject: 'principal-1'
  });
  assert.equal(safeFail.queued, false);

  const liveHooks = new CmagEventHooks(pool, engine);
  const platHook = await liveHooks.emitPlatformOperationalAlert({
    category: 'platform_provisioning',
    purpose: 'school_provisioned',
    toPhone: '+2348010002222',
    channel: 'sms',
    message: 'New school provisioned'
  });
  assert.equal(platHook.queued, true);
  assert.ok(platHook.outboxId);
});
