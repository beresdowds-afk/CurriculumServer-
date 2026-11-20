import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApplicationInstanceConfiguration, isCapabilityEnabled } from '../../src/data/applicationInstanceConfiguration';
import {
  assertAttendanceProvisioningTransition,
  isReadyToActivateDevice,
  retryDelayMs,
  validateCatalogueCompatibility,
  type AttendanceProvisioningStep
} from './provisioningWorkflow';

test('provisioning state transitions reject skipped verification stages', () => {
  assert.doesNotThrow(() => assertAttendanceProvisioningTransition('requested', 'compatibility_check'));
  assert.throws(() => assertAttendanceProvisioningTransition('requested', 'active'));
  assert.throws(() => assertAttendanceProvisioningTransition('revoked', 'active'));
});

test('only a verified, compatible catalogue adapter passes compatibility checks', () => {
  const request = {
    category: 'rfid' as const,
    requiredEventTypes: ['school_arrival'],
    firmwareVersion: '1.0',
    requiresOfflineSync: true
  };
  const planned = validateCatalogueCompatibility(request, {
    category: 'rfid',
    verificationStatus: 'planned',
    supportedEventTypes: ['school_arrival'],
    offlineSync: true,
    supportedFirmware: ['1.0'],
    enabledAdapter: false
  });
  assert.equal(planned.compatible, false);
  assert.ok(planned.reasons.includes('ADAPTER_NOT_VERIFIED'));
  assert.equal(validateCatalogueCompatibility(request, {
    category: 'rfid',
    verificationStatus: 'implemented_tested',
    supportedEventTypes: ['school_arrival'],
    offlineSync: true,
    supportedFirmware: ['1.0'],
    enabledAdapter: true
  }).compatible, true);
});

test('activation requires an active school capability and every verified step', () => {
  const successfulSteps: AttendanceProvisioningStep[] = [
    'compatibility', 'allocation', 'enrollment', 'configuration',
    'connection_test', 'time_sync', 'event_delivery_test'
  ];
  assert.equal(isReadyToActivateDevice({
    schoolCapabilityState: 'active',
    deviceState: 'activation_pending',
    successfulSteps
  }), false);
  assert.equal(isReadyToActivateDevice({
    schoolCapabilityState: 'active',
    deviceState: 'activation_pending',
    successfulSteps: [...successfulSteps, 'attendance_acceptance_test']
  }), true);
  assert.equal(isReadyToActivateDevice({
    schoolCapabilityState: 'requested',
    deviceState: 'activation_pending',
    successfulSteps: [...successfulSteps, 'attendance_acceptance_test']
  }), false);
});

test('retry delays are bounded and attempts cannot retry indefinitely', () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(5), 480_000);
  assert.throws(() => retryDelayMs(6), /PROVISIONING_RETRY_LIMIT_EXCEEDED/);
});

test('school provisioning can persist an attendance request without enabling production attendance', () => {
  const configuration = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    deploymentArchitecture: 'shared_database',
    featureConfigurations: {
      feat_biometric_attendance: {
        templateId: 'attendance-device-provisioning',
        templateVersion: '1.0.0',
        settings: {
          requestCapability: true,
          deviceCategories: ['rfid'],
          intendedPopulation: 'students',
          intendedLocations: ['Main gate']
        }
      }
    }
  });
  assert.equal(isCapabilityEnabled(configuration, 'feat_biometric_attendance'), false);
  assert.throws(() => buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity', 'feat_biometric_attendance'],
    deploymentArchitecture: 'shared_database'
  }), /not approved for production provisioning/);
});
