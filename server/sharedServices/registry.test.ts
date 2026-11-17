import assert from 'node:assert/strict';
import test from 'node:test';
import { validateApplicationInstanceConfiguration, buildApplicationInstanceConfiguration } from '../../src/data/applicationInstanceConfiguration';
import { CENTRAL_SHARED_SERVICE_IDS } from '../../packages/shared-types/src/sharedServiceContracts';
import {
  ARCHITECTURE_BOUNDARIES,
  CENTRAL_SHARED_SERVICE_REGISTRY,
  getCentralSharedService
} from './registry';
import { evaluateSharedServiceAccess } from './authorization';

test('central registry contains exactly the stable curriculum, textbook and deferred vehicle services', () => {
  assert.deepEqual(CENTRAL_SHARED_SERVICE_REGISTRY.map(service => service.id), CENTRAL_SHARED_SERVICE_IDS);
  assert.equal(getCentralSharedService('central_curriculum')?.availability, 'unavailable');
  assert.equal(getCentralSharedService('central_textbooks')?.availability, 'unavailable');
  assert.equal(getCentralSharedService('central_vehicle_tracking')?.availability, 'planned');
  assert.equal(getCentralSharedService('central_vehicle_tracking')?.provisioningStatus, 'deferred');
  assert.deepEqual(getCentralSharedService('central_vehicle_tracking')?.operations, []);
  for (const service of CENTRAL_SHARED_SERVICE_REGISTRY) {
    assert.equal(service.boundary, 'central_shared');
    assert.equal(service.entitlementRequired, true);
    assert.ok(Object.values(service.requiredPermissions).every(Boolean));
    assert.ok(service.healthCheck.path.startsWith('/api/v1/shared/'));
  }
});

test('Question Bank and examination services remain school-instance owned', () => {
  assert.ok(ARCHITECTURE_BOUNDARIES.school_instance_services.includes('question_bank'));
  assert.ok(ARCHITECTURE_BOUNDARIES.school_instance_services.includes('examinations'));
  assert.deepEqual(ARCHITECTURE_BOUNDARIES.central_shared_services, [
    'central_curriculum', 'central_textbooks', 'central_vehicle_tracking'
  ]);
});

test('unknown shared services are rejected rather than inheriting generic access', () => {
  const result = evaluateSharedServiceAccess({
    serviceId: 'unregistered_service',
    operation: 'discover',
    applicationInstanceId: '33333333-3333-4333-8333-333333333333',
    hasPermissions: () => true
  });
  assert.deepEqual(result, { allowed: false, reason: 'UNKNOWN_SERVICE' });
});

test('central service dependencies are independent from locally enabled capabilities', () => {
  const configuration = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    centralServiceDependencies: ['central_curriculum', 'central_textbooks'],
    deploymentArchitecture: 'shared_database'
  });
  assert.deepEqual(configuration.enabledCapabilities, ['feat_school_administration_identity']);
  assert.deepEqual(configuration.centralServiceDependencies, ['central_curriculum', 'central_textbooks']);
  assert.equal(validateApplicationInstanceConfiguration(configuration).valid, true);
  assert.equal(validateApplicationInstanceConfiguration({
    ...configuration,
    centralServiceDependencies: ['central_curriculum', 'unknown']
  }).valid, false);
});
