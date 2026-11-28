import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_CAPABILITIES, capabilityActivationProblems, evaluateProductionCapabilityGate
} from './productionCapabilityRegistry';
import { createProductionCapabilityGateMiddleware } from './productionCapabilityMiddleware';

const notReady = [
  'attendance_device_ingestion',
  'attendance_platform_device_provisioning',
  'attendance_school_device_management'
];

const readyPrompt1Capabilities = [
  'central_iam',
  'school_provisioning',
  'school_identity',
  'student_administration',
  'class_administration',
  'staff_administration',
  'administrative_permissions',
  'student_lifecycle',
  'application_template_discovery'
] as const;

test('central IAM and Prompt 1 school administration endpoints pass the production capability gate', () => {
  for (const id of readyPrompt1Capabilities) {
    const capability = PRODUCTION_CAPABILITIES.find(item => item.id === id);
    assert.ok(capability, id);
    assert.equal(capability.state, 'ready', id);
    assert.deepEqual(capabilityActivationProblems(capability), [], id);
  }
  const allowedRoutes: Array<[string, string, string]> = [
    ['POST', '/server/auth/login', 'central_iam'],
    ['POST', '/server/auth/verify', 'central_iam'],
    ['POST', '/schools/auth/login', 'central_iam'],
    ['POST', '/flow/auth/login', 'central_iam'],
    ['GET', '/schools/auth/oidc/google/start', 'central_iam'],
    ['POST', '/schools/auth/mfa/verify', 'central_iam'],
    ['GET', '/schools/invitations/preview', 'central_iam'],
    ['POST', '/schools/invitations/accept', 'central_iam'],
    ['POST', '/schools/provision', 'school_provisioning'],
    ['GET', '/schools/provision/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/steps', 'school_provisioning'],
    ['GET', '/schools/me', 'school_identity'],
    ['PUT', '/schools/me/config', 'school_identity'],
    ['GET', '/schools/me/departments', 'school_identity'],
    ['GET', '/schools/me/academic-sessions', 'school_identity'],
    ['GET', '/schools/me/students', 'student_administration'],
    ['POST', '/schools/me/students', 'student_administration'],
    ['GET', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'student_administration'],
    ['PATCH', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'student_administration'],
    ['GET', '/schools/me/admissions', 'student_administration'],
    ['GET', '/schools/me/guardians', 'student_administration'],
    ['GET', '/schools/me/classes', 'class_administration'],
    ['POST', '/schools/me/classes', 'class_administration'],
    ['PATCH', '/schools/me/classes/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'class_administration'],
    ['POST', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/class', 'class_administration'],
    ['POST', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/lifecycle', 'student_lifecycle'],
    ['GET', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/history', 'student_lifecycle'],
    ['GET', '/schools/me/staff', 'staff_administration'],
    ['POST', '/schools/me/staff', 'staff_administration'],
    ['GET', '/schools/me/staff/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'staff_administration'],
    ['PATCH', '/schools/me/staff/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'staff_administration'],
    ['GET', '/schools/me/roles', 'administrative_permissions'],
    ['GET', '/schools/me/memberships', 'administrative_permissions'],
    ['GET', '/schools/me/mfa/totp', 'administrative_permissions'],
    ['GET', '/application-templates', 'application_template_discovery']
  ];
  for (const [method, path, capabilityId] of allowedRoutes) {
    const decision = evaluateProductionCapabilityGate(method, path);
    assert.equal(decision.allowed, true, `${method} ${path}`);
    assert.equal(decision.capabilityId, capabilityId, `${method} ${path}`);
  }
});

test('database-backed capabilities remain blocked until operational readiness is evidenced', () => {
  for (const id of notReady) {
    const capability = PRODUCTION_CAPABILITIES.find(item => item.id === id);
    assert.ok(capability, id);
    assert.notEqual(capability.state, 'ready');
    assert.ok(capabilityActivationProblems(capability).length > 0);
  }
});

test('school finance fee policies and settlement account routes pass while wider payments stay blocked', () => {
  const sampleId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
  for (const [method, path, capabilityId] of [
    ['GET', '/school-finance/schools', 'school_finance_fee_policies'],
    ['GET', `/school-finance/schools/${sampleId}/fee-policies`, 'school_finance_fee_policies'],
    ['GET', `/school-finance/schools/${sampleId}/fee-policies/effective`, 'school_finance_fee_policies'],
    ['POST', `/school-finance/schools/${sampleId}/fee-policies`, 'school_finance_fee_policies'],
    ['POST', `/school-finance/schools/${sampleId}/fee-policies/${sampleId}/approve`, 'school_finance_fee_policies'],
    ['POST', `/school-finance/schools/${sampleId}/fee-policies/${sampleId}/supersede`, 'school_finance_fee_policies'],
    ['GET', `/school-finance/schools/${sampleId}/settlement-accounts`, 'school_finance_settlement_account_requests'],
    ['GET', `/school-finance/schools/${sampleId}/settlement-accounts/active`, 'school_finance_settlement_account_requests'],
    ['GET', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}`, 'school_finance_settlement_account_requests'],
    ['GET', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/events`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/approve`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/reject`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/verify`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/activate`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/suspend`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/revoke`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/replace`, 'school_finance_settlement_account_requests'],
    ['POST', `/school-finance/schools/${sampleId}/settlement-accounts/${sampleId}/verification-callback`, 'school_finance_settlement_account_requests']
  ] as const) {
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: true,
      capabilityId
    }, `${method} ${path}`);
  }
  for (const [method, path] of [
    ['POST', `/school-finance/schools/${sampleId}/invoices`],
    ['POST', `/school-finance/schools/${sampleId}/payments`],
    ['GET', `/school-finance/schools/${sampleId}/payroll`],
    ['GET', `/school-finance/schools/${sampleId}/reports`]
  ] as const) {
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: false,
      reason: 'unknown_route'
    });
  }
});

test('campus_logistics handlers pass the production capability gate while unimplemented logistics device routes remain blocked', () => {
  const sampleId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
  const cases = [
    ['GET', '/logistics/guardians', 'campus_logistics'],
    ['POST', '/logistics/guardians', 'campus_logistics'],
    ['POST', `/logistics/guardians/${sampleId}/verify`, 'campus_logistics'],
    ['POST', `/logistics/guardians/${sampleId}/students`, 'campus_logistics'],
    ['POST', `/logistics/guardian-students/${sampleId}/pickup-authorizations`, 'campus_logistics'],
    ['GET', '/logistics/pickup-passes', 'campus_logistics'],
    ['POST', '/logistics/pickup-passes', 'campus_logistics'],
    ['POST', `/logistics/pickup-passes/${sampleId}/revoke`, 'campus_logistics'],
    ['GET', '/logistics/gate/locations', 'campus_logistics'],
    ['POST', '/logistics/gate/locations', 'campus_logistics'],
    ['POST', `/logistics/gate/locations/${sampleId}/officers`, 'campus_logistics'],
    ['GET', '/logistics/gate/events', 'campus_logistics'],
    ['GET', '/logistics/gate/incidents', 'campus_logistics'],
    ['POST', '/logistics/gate/incidents', 'campus_logistics'],
    ['GET', '/logistics/hostel/register', 'campus_logistics'],
    ['POST', '/logistics/hostel/register', 'campus_logistics'],
    ['POST', '/logistics/hostel/assignments', 'campus_logistics'],
    ['GET', '/logistics/exeats', 'campus_logistics'],
    ['POST', '/logistics/exeats', 'campus_logistics'],
    ['POST', `/logistics/exeats/${sampleId}/decisions`, 'campus_logistics'],
    ['POST', `/logistics/exeats/${sampleId}/cancel`, 'campus_logistics'],
    ['POST', '/logistics/exeats/evaluate-overdue', 'campus_logistics'],
    ['POST', `/logistics/dining/meals/${sampleId}/attendance`, 'campus_logistics'],
    ['POST', '/logistics/dining/meals', 'campus_logistics'],
    ['GET', '/logistics/dining/entitlements', 'campus_logistics'],
    ['POST', '/logistics/dining/entitlements', 'campus_logistics'],
    ['POST', `/logistics/dining/entitlements/${sampleId}/revoke`, 'campus_logistics'],
    ['POST', '/logistics/dining/dietary-restrictions', 'campus_logistics'],
    ['GET', '/logistics/dining/dietary-restrictions', 'campus_logistics'],
    ['POST', `/logistics/transport/trips/${sampleId}/passenger-events`, 'campus_logistics'],
    ['GET', `/logistics/transport/trips/${sampleId}/passengers`, 'campus_logistics'],
    ['PATCH', `/logistics/transport/trips/${sampleId}/assignment`, 'campus_logistics'],
    ['POST', `/logistics/transport/trips/${sampleId}/start`, 'campus_logistics'],
    ['POST', `/logistics/transport/trips/${sampleId}/cancel`, 'campus_logistics'],
    ['GET', '/logistics/transport/routes', 'campus_logistics'],
    ['POST', '/logistics/transport/routes', 'campus_logistics'],
    ['GET', '/logistics/transport/drivers', 'campus_logistics'],
    ['POST', '/logistics/transport/drivers', 'campus_logistics'],
    ['GET', '/logistics/transport/vehicles', 'campus_logistics'],
    ['POST', '/logistics/transport/vehicles', 'campus_logistics'],
    ['GET', '/logistics/transport/trips', 'campus_logistics'],
    ['POST', '/logistics/transport/trips', 'campus_logistics'],
    ['POST', `/logistics/transport/trips/${sampleId}/complete`, 'campus_logistics'],
    ['POST', `/logistics/transport/vehicles/${sampleId}/gps-device`, 'campus_logistics'],
    ['GET', `/logistics/transport/vehicles/${sampleId}/telemetry`, 'campus_logistics'],
    ['POST', `/logistics/transport/vehicles/${sampleId}/telemetry/sync`, 'campus_logistics'],
    ['POST', `/logistics/transport/gps-device-bindings/${sampleId}/revoke`, 'campus_logistics'],
    ['GET', '/logistics/library/resources', 'campus_logistics'],
    ['POST', '/logistics/library/resources', 'campus_logistics'],
    ['GET', '/logistics/library/storage', 'campus_logistics'],
    ['PUT', '/logistics/library/storage', 'campus_logistics'],
    ['PUT', `/logistics/library/resources/${sampleId}/file`, 'campus_logistics'],
    ['GET', `/logistics/library/resources/${sampleId}/download`, 'campus_logistics'],
    ['GET', `/logistics/library/resources/${sampleId}/usage`, 'campus_logistics'],
    ['POST', `/logistics/library/resources/${sampleId}/visibility`, 'campus_logistics'],
    ['POST', `/logistics/library/resources/${sampleId}/publication`, 'campus_logistics'],
    ['GET', '/logistics/audit', 'campus_logistics']
  ] as const;
  for (const [method, path, capabilityId] of cases) {
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: true,
      capabilityId
    }, `${method} ${path}`);
  }
  assert.deepEqual(evaluateProductionCapabilityGate('POST', '/logistics/device-management'), {
    allowed: false,
    reason: 'unknown_route'
  });
});

test('attendance provisioning, school device-management, and ingestion routes remain blocked without overlap', () => {
  const sampleId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
  const expected: Array<[string, string, string]> = [
    ['POST', '/attendance/devices', 'attendance_device_ingestion'],
    ['POST', '/attendance/credentials', 'attendance_device_ingestion'],
    ['POST', '/attendance/device-events', 'attendance_device_ingestion'],
    ['POST', '/attendance/device-events/batch', 'attendance_device_ingestion'],
    ['POST', '/attendance/heartbeat', 'attendance_device_ingestion'],
    ['GET', '/attendance/sync-status', 'attendance_device_ingestion'],
    ['POST', '/attendance/enrollment-ack', 'attendance_device_ingestion'],
    ['GET', '/attendance/register', 'attendance_device_ingestion'],
    ['PATCH', `/attendance/records/${sampleId}/adjustments`, 'attendance_device_ingestion'],
    ['GET', '/platform/attendance/device-catalogue', 'attendance_platform_device_provisioning'],
    ['POST', '/platform/attendance/device-catalogue', 'attendance_platform_device_provisioning'],
    ['GET', `/platform/attendance/device-catalogue/${sampleId}`, 'attendance_platform_device_provisioning'],
    ['PATCH', `/platform/attendance/device-catalogue/${sampleId}`, 'attendance_platform_device_provisioning'],
    ['POST', `/platform/attendance/device-catalogue/${sampleId}/enable`, 'attendance_platform_device_provisioning'],
    ['POST', `/platform/attendance/device-catalogue/${sampleId}/disable`, 'attendance_platform_device_provisioning'],
    ['POST', '/platform/attendance/adapters', 'attendance_platform_device_provisioning'],
    ['POST', '/platform/attendance/adapters/signed-gw/versions/1.0.0/verify', 'attendance_platform_device_provisioning'],
    ['POST', '/platform/attendance/provisioning-requests', 'attendance_platform_device_provisioning'],
    ['GET', `/platform/attendance/provisioning-requests/${sampleId}`, 'attendance_platform_device_provisioning'],
    ['POST', `/platform/attendance/provisioning-requests/${sampleId}/validate`, 'attendance_platform_device_provisioning'],
    ['POST', `/platform/attendance/provisioning-requests/${sampleId}/execute`, 'attendance_platform_device_provisioning'],
    ['POST', `/platform/attendance/provisioning-requests/${sampleId}/retry`, 'attendance_platform_device_provisioning'],
    ['GET', '/schools/me/attendance/capability', 'attendance_school_device_management'],
    ['GET', '/schools/me/attendance/devices', 'attendance_school_device_management'],
    ['GET', `/schools/me/attendance/devices/${sampleId}`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/test`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/suspend`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/reactivate`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/revoke`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/decommission`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/reassign-location`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/credentials/rotate`, 'attendance_school_device_management'],
    ['POST', `/schools/me/attendance/devices/${sampleId}/credentials/revoke`, 'attendance_school_device_management']
  ];

  for (const [method, path, capabilityId] of expected) {
    const matches = PRODUCTION_CAPABILITIES.filter(cap =>
      cap.routes.some(route => route.method === method && route.path.test(path))
    );
    assert.equal(matches.length, 1, `Expected single registration for ${method} ${path}`);
    const decision = evaluateProductionCapabilityGate(method, path);
    assert.equal(decision.allowed, false, `${method} ${path}`);
    assert.equal(decision.reason, 'capability_not_ready');
    assert.equal(decision.capabilityId, capabilityId);
  }
});

test('question bank read and write capabilities have no route overlap and do not expose CBT/vault/marking/results/remedial', () => {
  const sampleId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
  const expected: Array<[string, string, string]> = [
    ['GET', '/question-bank', 'instance_question_bank_and_assessments'],
    ['GET', '/question-bank/categories', 'instance_question_bank_and_assessments'],
    ['GET', '/assessment-blueprints', 'instance_question_bank_and_assessments'],
    ['GET', '/assessments/exams', 'instance_question_bank_and_assessments'],
    ['GET', '/assessments/records', 'instance_question_bank_and_assessments'],
    ['POST', '/question-bank', 'question_bank_scoped_writes'],
    ['POST', '/question-bank/categories', 'question_bank_scoped_writes'],
    ['PATCH', `/question-bank/categories/${sampleId}`, 'question_bank_scoped_writes'],
    ['POST', `/question-bank/items/${sampleId}/submit`, 'question_bank_scoped_writes'],
    ['POST', `/question-bank/items/${sampleId}/review`, 'question_bank_scoped_writes'],
    ['POST', `/question-bank/items/${sampleId}/archive`, 'question_bank_scoped_writes'],
    ['DELETE', `/question-bank/items/${sampleId}`, 'question_bank_scoped_writes'],
    ['POST', '/assessment-blueprints', 'question_bank_scoped_writes'],
    ['POST', '/assessments/exams', 'question_bank_scoped_writes'],
    ['POST', '/assessments/records', 'question_bank_scoped_writes']
  ];
  for (const [method, path, expectedId] of expected) {
    const matches = PRODUCTION_CAPABILITIES.filter(cap =>
      cap.routes.some(route => route.method === method && route.path.test(path))
    );
    assert.equal(matches.length, 1, `Expected single non-overlapping capability for ${method} ${path}`);
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: true,
      capabilityId: expectedId
    });
  }

  for (const [method, path] of [
    ['POST', '/assessments/cbt/sessions'],
    ['POST', '/assessments/vault/seal'],
    ['POST', '/assessments/marking/scripts'],
    ['POST', '/assessments/results/publish'],
    ['POST', '/assessments/remedial/plans']
  ] as const) {
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: false,
      reason: 'unknown_route'
    });
  }
});

test('unknown routes remain blocked and do not inherit an unrelated capability', () => {
  assert.deepEqual(evaluateProductionCapabilityGate('GET', '/students'), {
    allowed: false,
    reason: 'unknown_route'
  });
  assert.equal(evaluateProductionCapabilityGate('POST', '/nonexistent').allowed, false);
});

test('shared-service foundation routes are capability-gated without exposing unfinished operations', () => {
  for (const [method, path] of [
    ['GET', '/shared/curriculum/discovery'],
    ['POST', '/shared/curriculum/authorization'],
    ['GET', '/shared/textbooks/health'],
    ['GET', '/shared/vehicle-tracking/discovery'],
    ['POST', '/platform/shared-services/entitlements'],
    ['POST', '/platform/shared-services/entitlements/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/revoke']
  ]) {
    assert.equal(evaluateProductionCapabilityGate(method, path).allowed, true, `${method} ${path}`);
  }
  assert.equal(evaluateProductionCapabilityGate('GET', '/shared/curriculum/records').allowed, false);
  assert.equal(evaluateProductionCapabilityGate('POST', '/shared/vehicle-tracking/ingest').allowed, false);
});

test('a configured or disabled capability cannot bypass the registry', () => {
  for (const state of ['configured', 'degraded', 'disabled'] as const) {
    const unavailable = {
      ...PRODUCTION_CAPABILITIES.find(item => item.id === 'student_administration')!,
      state,
      readinessEvidence: ['database_connected', 'route_exists'],
      acceptanceTests: ['server/db/schoolAdministration.integration.test.ts']
    };
    assert.equal(
      evaluateProductionCapabilityGate('GET', '/schools/me/students', [unavailable]).allowed,
      false,
      state
    );
  }
});

test('ready capabilities have evidence, no activation problems, and acceptance tests', () => {
  const migrationNumbers = new Set(
    readdirSync('src/db/migrations')
      .map(file => Number(file.slice(0, 3)))
      .filter(Number.isInteger)
  );
  for (const capability of PRODUCTION_CAPABILITIES.filter(item => item.state === 'ready')) {
    assert.deepEqual(capabilityActivationProblems(capability), [], capability.id);
    for (const file of capability.acceptanceTests) assert.ok(existsSync(file), `${capability.id}: ${file}`);
    for (const migration of capability.requiredMigrations) {
      assert.ok(migrationNumbers.has(migration), `${capability.id}: migration ${migration}`);
    }
  }
});

test('teacher academic progress capability requires migration 025', () => {
  const capability = PRODUCTION_CAPABILITIES.find(item => item.id === 'teacher_academic_progress_authority');
  assert.ok(capability);
  assert.deepEqual(capability.requiredMigrations, [25]);
  assert.ok(existsSync('src/db/migrations/025_teacher_academic_progress_authority.sql'));
});

test('an incomplete feature cannot bypass the lockdown by being marked ready', () => {
  const incomplete = {
    ...PRODUCTION_CAPABILITIES.find(item => item.id === 'student_administration')!,
    state: 'ready' as const,
    acceptanceTests: [],
    readinessEvidence: [],
    routes: [{ method: 'GET' as const, path: /^\/schools\/me\/students$/ }]
  };
  const decision = evaluateProductionCapabilityGate('GET', '/schools/me/students', [incomplete]);
  assert.equal(decision.allowed, false);
});

test('authenticated capabilities require repository, migration, permission, and readiness evidence', () => {
  const capability = PRODUCTION_CAPABILITIES.find(item => item.id === 'central_shared_service_foundation')!;
  const incomplete = {
    ...capability,
    requiredRepositories: [],
    requiredMigrations: [],
    readinessEvidence: [],
    authorization: { ...capability.authorization, permissions: [] }
  };
  const problems = capabilityActivationProblems(incomplete);
  assert.ok(problems.includes('authenticated capability declares no required repositories'));
  assert.ok(problems.includes('authenticated capability declares no required migrations'));
  assert.ok(problems.includes('operational readiness evidence is missing'));
  assert.ok(problems.includes('tenant capability lacks tenant-context transaction or permissions'));
});

test('an overlapping unready capability prevents a ready route from being served', () => {
  const base = PRODUCTION_CAPABILITIES.find(item => item.id === 'central_shared_service_foundation')!;
  const ready = {
    ...base,
    id: 'ready-overlap',
    routes: [{ method: 'GET' as const, path: /^\/overlap$/ }]
  };
  const unready = {
    ...base,
    id: 'unready-overlap',
    state: 'implemented' as const,
    routes: [{ method: 'GET' as const, path: /^\/overlap$/ }]
  };
  const decision = evaluateProductionCapabilityGate('GET', '/overlap', [ready, unready]);
  assert.equal(decision.allowed, false);
  assert.equal(decision.capabilityId, 'unready-overlap');
});

test('unready routes return the established unavailable response', () => {
  const middleware = createProductionCapabilityGateMiddleware();
  const output: { status?: number; body?: Record<string, unknown> } = {};
  const req = {
    method: 'GET',
    path: '/attendance/register',
    correlationId: 'capability-test'
  };
  const res = {
    status(code: number) { output.status = code; return this; },
    json(body: Record<string, unknown>) { output.body = body; return this; }
  };
  middleware(req as never, res as never, () => {
    throw new Error('an unready capability must not reach its route');
  });
  assert.equal(output.status, 503);
  assert.equal(output.body?.code, 'PRODUCTION_PERSISTENCE_UNAVAILABLE');
  assert.equal(output.body?.capabilityId, 'attendance_device_ingestion');
});

test('the capability gate is mounted before API route registrations', () => {
  const source = readFileSync('server.ts', 'utf8');
  const gate = source.indexOf("app.use('/api', createApiCapabilityGateMiddleware())");
  assert.notEqual(gate, -1);
  assert.doesNotMatch(
    source.slice(0, gate),
    /app\.(?:get|post|put|patch|delete|all|use)\(\s*['"]\/api(?:\/|['"])/i
  );
});

test('CMAG central messaging, OTP, webhook, platform, and school messaging routes pass without overlap', () => {
  const sampleId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
  const expected: Array<[string, string, string]> = [
    ['POST', '/server/auth/otp/request', 'cmag_auth_otp'],
    ['POST', '/server/auth/otp/verify', 'cmag_auth_otp'],
    ['POST', '/schools/auth/otp/request', 'cmag_auth_otp'],
    ['POST', '/schools/auth/otp/verify', 'cmag_auth_otp'],
    ['POST', '/flow/auth/otp/request', 'cmag_auth_otp'],
    ['POST', '/flow/auth/otp/verify', 'cmag_auth_otp'],
    ['POST', '/messaging/webhooks/sendchamp_sms', 'cmag_webhooks'],
    ['POST', '/messaging/webhooks/meta_whatsapp', 'cmag_webhooks'],
    ['GET', '/platform/messaging/overview', 'cmag_platform_administration'],
    ['PATCH', '/platform/messaging/config', 'cmag_platform_administration'],
    ['GET', '/platform/messaging/providers', 'cmag_platform_administration'],
    ['PUT', '/platform/messaging/providers/sendchamp_sms', 'cmag_platform_administration'],
    ['POST', '/platform/messaging/providers/sendchamp_sms/suspend', 'cmag_platform_administration'],
    ['POST', '/platform/messaging/providers/sendchamp_sms/resume', 'cmag_platform_administration'],
    ['POST', '/platform/messaging/senders', 'cmag_platform_administration'],
    ['POST', '/platform/messaging/whatsapp-templates', 'cmag_platform_administration'],
    ['POST', `/platform/messaging/tenants/${sampleId}/suspend`, 'cmag_platform_administration'],
    ['POST', `/platform/messaging/tenants/${sampleId}/resume`, 'cmag_platform_administration'],
    ['GET', '/platform/messaging/queue', 'cmag_platform_administration'],
    ['POST', '/platform/messaging/dispatch-now', 'cmag_platform_administration'],
    ['POST', `/platform/messaging/messages/${sampleId}/retry`, 'cmag_platform_administration'],
    ['POST', '/platform/messaging/send', 'cmag_platform_administration'],
    ['GET', '/messaging/overview', 'cmag_school_messaging'],
    ['PATCH', '/messaging/config', 'cmag_school_messaging'],
    ['PUT', '/messaging/templates', 'cmag_school_messaging'],
    ['PUT', '/messaging/preferences', 'cmag_school_messaging'],
    ['POST', '/messaging/send', 'cmag_school_messaging'],
    ['POST', '/messaging/broadcasts', 'cmag_school_messaging'],
    ['POST', `/messaging/messages/${sampleId}/retry`, 'cmag_school_messaging'],
    ['GET', '/messaging/queue', 'cmag_school_messaging'],
    ['GET', '/shared/messaging/discovery', 'central_shared_service_foundation'],
    ['POST', '/shared/messaging/authorization', 'central_shared_service_foundation'],
    ['GET', '/shared/messaging/health', 'central_shared_service_foundation']
  ];

  for (const [method, path, capabilityId] of expected) {
    const matches = PRODUCTION_CAPABILITIES.filter(cap =>
      cap.routes.some(route => route.method === method && route.path.test(path))
    );
    assert.equal(matches.length, 1, `Expected single capability match for ${method} ${path}`);
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: true,
      capabilityId
    }, `${method} ${path}`);
  }
});
