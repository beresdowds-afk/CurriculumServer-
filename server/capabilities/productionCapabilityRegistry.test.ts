import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_CAPABILITIES, capabilityActivationProblems, evaluateProductionCapabilityGate
} from './productionCapabilityRegistry';

const notReady = [
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
    ['POST', '/schools/me/classes', 'class_administration'],
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
  for (const capability of PRODUCTION_CAPABILITIES.filter(item => item.state === 'ready')) {
    assert.deepEqual(capabilityActivationProblems(capability), [], capability.id);
    for (const file of capability.acceptanceTests) assert.ok(existsSync(file), `${capability.id}: ${file}`);
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
