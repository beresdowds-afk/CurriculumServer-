import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_CAPABILITIES, capabilityActivationProblems, evaluateProductionCapabilityGate
} from './productionCapabilityRegistry';

const stage2 = ['school_identity', 'student_administration', 'class_administration',
  'staff_administration', 'administrative_permissions', 'student_lifecycle'];

test('Stage 2 capabilities are registered but not enabled', () => {
  for (const id of stage2) {
    const capability = PRODUCTION_CAPABILITIES.find(item => item.id === id);
    assert.ok(capability, id);
    assert.notEqual(capability.readiness, 'enabled');
    assert.ok(capabilityActivationProblems(capability).length > 0);
  }
});

test('unknown and unimplemented operations stay blocked', () => {
  assert.deepEqual(evaluateProductionCapabilityGate('GET', '/api/v1/students'), { allowed: false, reason: 'unknown_route' });
  assert.equal(evaluateProductionCapabilityGate('POST', '/api/v1/nonexistent').allowed, false);
});

test('an incomplete feature cannot bypass the lockdown by being marked enabled', () => {
  const incomplete = {
    ...PRODUCTION_CAPABILITIES.find(item => item.id === 'student_administration')!,
    readiness: 'enabled' as const,
    acceptanceTests: [],
    routes: [{ method: 'GET' as const, path: /^\/api\/v1\/students$/ }]
  };
  const decision = evaluateProductionCapabilityGate('GET', '/api/v1/students', [incomplete]);
  assert.equal(decision.allowed, false);
});

test('enabled capabilities have no activation problems and existing acceptance test files', () => {
  for (const capability of PRODUCTION_CAPABILITIES.filter(item => item.readiness === 'enabled')) {
    assert.deepEqual(capabilityActivationProblems(capability), [], capability.id);
    for (const file of capability.acceptanceTests) assert.ok(existsSync(file), `${capability.id}: ${file}`);
  }
});
