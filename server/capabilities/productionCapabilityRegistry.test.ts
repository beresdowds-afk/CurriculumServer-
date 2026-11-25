import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_CAPABILITIES, capabilityActivationProblems, evaluateProductionCapabilityGate
} from './productionCapabilityRegistry';
import { createProductionCapabilityGateMiddleware } from './productionCapabilityMiddleware';

const notReady = [
  'school_finance_fee_policies',
  'school_finance_settlement_account_requests',
  'attendance_device_ingestion',
  'attendance_platform_device_provisioning',
  'attendance_school_device_management',
  'campus_logistics',
  'question_bank_scoped_writes'
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

test('deferred handlers map to their canonical unready capability', () => {
  const cases = [
    ['GET', '/school-finance/schools', 'school_finance_fee_policies'],
    ['GET', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/fee-policies', 'school_finance_fee_policies'],
    ['POST', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/fee-policies', 'school_finance_fee_policies'],
    ['POST', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/fee-policies/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/approve', 'school_finance_fee_policies'],
    ['GET', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/settlement-accounts', 'school_finance_settlement_account_requests'],
    ['GET', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/settlement-accounts/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'school_finance_settlement_account_requests'],
    ['POST', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/settlement-accounts', 'school_finance_settlement_account_requests'],
    ['POST', '/school-finance/schools/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/settlement-accounts/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/approve', 'school_finance_settlement_account_requests'],
    ['POST', '/logistics/pickup-passes', 'campus_logistics'],
    ['GET', '/logistics/gate/events', 'campus_logistics'],
    ['GET', '/logistics/hostel/register', 'campus_logistics'],
    ['POST', '/logistics/hostel/register', 'campus_logistics'],
    ['POST', '/logistics/hostel/assignments', 'campus_logistics'],
    ['GET', '/logistics/exeats', 'campus_logistics'],
    ['POST', '/logistics/exeats', 'campus_logistics'],
    ['POST', '/logistics/exeats/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/decisions', 'campus_logistics'],
    ['POST', '/logistics/dining/meals/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/attendance', 'campus_logistics'],
    ['POST', '/logistics/dining/meals', 'campus_logistics'],
    ['POST', '/logistics/dining/dietary-restrictions', 'campus_logistics'],
    ['GET', '/logistics/dining/dietary-restrictions', 'campus_logistics'],
    ['POST', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/passenger-events', 'campus_logistics'],
    ['PATCH', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/assignment', 'campus_logistics'],
    ['POST', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/start', 'campus_logistics'],
    ['GET', '/logistics/transport/routes', 'campus_logistics'],
    ['POST', '/logistics/transport/routes', 'campus_logistics'],
    ['GET', '/logistics/transport/drivers', 'campus_logistics'],
    ['POST', '/logistics/transport/drivers', 'campus_logistics'],
    ['GET', '/logistics/transport/vehicles', 'campus_logistics'],
    ['POST', '/logistics/transport/vehicles', 'campus_logistics'],
    ['GET', '/logistics/transport/trips', 'campus_logistics'],
    ['POST', '/logistics/transport/trips', 'campus_logistics'],
    ['POST', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/complete', 'campus_logistics'],
    ['POST', '/logistics/transport/vehicles/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/gps-device', 'campus_logistics'],
    ['POST', '/logistics/transport/vehicles/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/telemetry/sync', 'campus_logistics'],
    ['POST', '/logistics/transport/gps-device-bindings/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/revoke', 'campus_logistics'],
    ['GET', '/logistics/library/resources', 'campus_logistics'],
    ['POST', '/logistics/library/resources', 'campus_logistics'],
    ['GET', '/logistics/library/storage', 'campus_logistics'],
    ['PUT', '/logistics/library/storage', 'campus_logistics'],
    ['PUT', '/logistics/library/resources/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/file', 'campus_logistics'],
    ['GET', '/logistics/library/resources/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/download', 'campus_logistics'],
    ['POST', '/logistics/library/resources/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/visibility', 'campus_logistics']
  ] as const;
  for (const [method, path, capabilityId] of cases) {
    assert.deepEqual(evaluateProductionCapabilityGate(method, path), {
      allowed: false,
      reason: 'capability_not_ready',
      capabilityId,
      problems: capabilityActivationProblems(
        PRODUCTION_CAPABILITIES.find(item => item.id === capabilityId)!
      )
    }, `${method} ${path}`);
  }
});

test('attendance ingestion and register routes stay blocked until end-to-end readiness is evidenced', () => {
  for (const [method, path] of [
    ['POST', '/attendance/devices'],
    ['POST', '/attendance/credentials'],
    ['POST', '/attendance/device-events'],
    ['POST', '/attendance/device-events/batch'],
    ['POST', '/attendance/heartbeat'],
    ['GET', '/attendance/sync-status'],
    ['POST', '/attendance/enrollment-ack'],
    ['GET', '/attendance/register'],
    ['PATCH', '/attendance/records/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/adjustments']
  ]) {
    const decision = evaluateProductionCapabilityGate(method, path);
    assert.equal(decision.allowed, false, `${method} ${path}`);
    assert.equal(decision.reason, 'capability_not_ready');
    assert.equal(decision.capabilityId, 'attendance_device_ingestion');
  }
});

test('attendance provisioning and school device-management routes remain blocked', () => {
  for (const [method, path, capabilityId] of [
    ['POST', '/platform/attendance/provisioning-requests', 'attendance_platform_device_provisioning'],
    ['GET', '/platform/attendance/device-catalogue', 'attendance_platform_device_provisioning'],
    ['POST', '/platform/attendance/provisioning-requests/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/execute', 'attendance_platform_device_provisioning'],
    ['GET', '/schools/me/attendance/devices', 'attendance_school_device_management'],
    ['GET', '/schools/me/attendance/capability', 'attendance_school_device_management'],
    ['POST', '/schools/me/attendance/devices/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/revoke', 'attendance_school_device_management']
  ]) {
    const decision = evaluateProductionCapabilityGate(method, path);
    assert.equal(decision.allowed, false, `${method} ${path}`);
    assert.equal(decision.reason, 'capability_not_ready');
    assert.equal(decision.capabilityId, capabilityId);
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
    path: '/logistics/gate/events',
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
  assert.equal(output.body?.capabilityId, 'campus_logistics');
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
