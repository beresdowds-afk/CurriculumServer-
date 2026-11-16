import assert from 'node:assert/strict';
import test from 'node:test';
import { LIFECYCLE_STAGES, assertLifecycleTransition } from './applicationLifecycle';
import {
  buildApplicationInstanceConfiguration, validateApplicationInstanceConfiguration
} from '../../src/data/applicationInstanceConfiguration';

test('lifecycle only advances one stage at a time and never backwards', () => {
  for (let i = 0; i < LIFECYCLE_STAGES.length - 1; i++) {
    assertLifecycleTransition(LIFECYCLE_STAGES[i], LIFECYCLE_STAGES[i + 1]);
  }
  assert.throws(() => assertLifecycleTransition('admin_invited', 'application_activated'));
  assert.throws(() => assertLifecycleTransition('membership_active', 'admin_invited'));
  assert.throws(() => assertLifecycleTransition('bogus', 'admin_invited'));
});

test('administrator activation precedes and is distinct from application activation', () => {
  const stages = [...LIFECYCLE_STAGES] as string[];
  assert.ok(stages.indexOf('membership_active') < stages.indexOf('configuration_completed'));
  assert.ok(stages.indexOf('configuration_completed') < stages.indexOf('application_activated'));
  assert.throws(() => assertLifecycleTransition('membership_active', 'application_activated'));
});

const base = {
  applicationId: 'app_curriculum_flow', templateId: 'school-standard', templateVersion: '1',
  deploymentArchitecture: 'shared_database', enabledCapabilities: ['feat_school_administration_identity']
} as any;

test('application configuration contract rejects unsupported templates and architectures', () => {
  assert.throws(() => buildApplicationInstanceConfiguration({ ...base, templateVersion: '99' }), /INVALID_APPLICATION_CONFIGURATION/);
  assert.throws(() => buildApplicationInstanceConfiguration({ ...base, templateId: 'nope' }), /INVALID_APPLICATION_CONFIGURATION/);
  assert.throws(() => buildApplicationInstanceConfiguration({ ...base, deploymentArchitecture: 'dedicated_infrastructure' }), /INVALID_APPLICATION_CONFIGURATION/);
  assert.throws(() => buildApplicationInstanceConfiguration({ ...base, enabledCapabilities: ['not_a_feature'] }), /INVALID_APPLICATION_CONFIGURATION/);
  assert.throws(() => buildApplicationInstanceConfiguration({ ...base, enabledCapabilities: [] }), /INVALID_APPLICATION_CONFIGURATION/);
});

test('application configuration contract accepts a supported configuration', () => {
  const config = buildApplicationInstanceConfiguration(base);
  assert.deepEqual(validateApplicationInstanceConfiguration(config), { valid: true, errors: [] });
  assert.equal(validateApplicationInstanceConfiguration({ ...config, contractVersion: 999 }).valid, false);
});
