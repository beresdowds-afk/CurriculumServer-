import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_CAPABILITIES, capabilityActivationProblems, evaluateProductionCapabilityGate
} from './productionCapabilityRegistry';
import { createProductionCapabilityGateMiddleware } from './productionCapabilityMiddleware';

const notReady = [
  'central_iam',
  'school_provisioning',
  'school_identity',
  'student_administration',
  'class_administration',
  'staff_administration',
  'administrative_permissions',
  'student_lifecycle',
  'campus_logistics',
  'application_template_discovery'
];

test('legacy authentication endpoints remain blocked by central IAM readiness', () => {
  for (const path of ['/server/auth/login', '/server/auth/verify', '/schools/auth/login', '/flow/auth/login']) {
    const decision = evaluateProductionCapabilityGate('POST', path);
    assert.equal(decision.allowed, false, path);
    assert.equal(decision.reason, 'capability_not_ready', path);
    assert.equal(decision.capabilityId, 'central_iam', path);
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

test('implemented administration handlers map to their canonical unready capability', () => {
  const cases = [
    ['GET', '/schools/me', 'school_identity'],
    ['PUT', '/schools/me/config', 'school_identity'],
    ['GET', '/schools/me/students', 'student_administration'],
    ['POST', '/schools/me/students', 'student_administration'],
    ['GET', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'student_administration'],
    ['PATCH', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'student_administration'],
    ['GET', '/schools/me/classes', 'class_administration'],
    ['POST', '/schools/me/classes', 'class_administration'],
    ['PATCH', '/schools/me/classes/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'class_administration'],
    ['POST', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/class', 'class_administration'],
    ['POST', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/lifecycle', 'student_lifecycle'],
    ['GET', '/schools/me/students/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/history', 'student_lifecycle'],
    ['POST', '/logistics/pickup-passes', 'campus_logistics'],
    ['GET', '/logistics/exeats', 'campus_logistics'],
    ['POST', '/logistics/exeats', 'campus_logistics'],
    ['POST', '/logistics/exeats/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/decisions', 'campus_logistics'],
    ['POST', '/logistics/dining/meals/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/attendance', 'campus_logistics'],
    ['POST', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/passenger-events', 'campus_logistics'],
    ['PATCH', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/assignment', 'campus_logistics'],
    ['POST', '/logistics/transport/trips/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8/start', 'campus_logistics'],
    ['GET', '/logistics/library/resources', 'campus_logistics'],
    ['POST', '/logistics/library/resources', 'campus_logistics'],
    ['GET', '/schools/me/staff', 'staff_administration'],
    ['POST', '/schools/me/staff', 'staff_administration'],
    ['GET', '/schools/me/staff/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'staff_administration'],
    ['PATCH', '/schools/me/staff/9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8', 'staff_administration'],
    ['GET', '/application-templates', 'application_template_discovery']
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
    path: '/schools/me/students',
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
  assert.equal(output.body?.capabilityId, 'student_administration');
});
