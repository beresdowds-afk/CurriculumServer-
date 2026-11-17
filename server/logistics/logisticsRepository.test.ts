import assert from 'node:assert/strict';
import test from 'node:test';
import { LOGISTICS_FEATURE_TEMPLATE, validateLogisticsFeatureConfiguration } from '../../src/data/logisticsFeatureTemplate';
import {
  buildApplicationInstanceConfiguration,
  validateApplicationInstanceConfiguration
} from '../../src/data/applicationInstanceConfiguration';
import { logisticsSecurity } from './logisticsRepository';

const configuration = {
  schoolType: 'mixed',
  campusCount: 2,
  gateCount: 3,
  boardingSchool: true,
  hostelCapacity: 240,
  studentCategories: ['boarding', 'day'],
  transportOwnership: 'outsourced',
  vehicleCount: 0,
  routeCount: 4,
  parentNotifications: { sms: true, email: false, push: true },
  pickupRequiresPin: true,
  pickupReusablePasses: false,
  exeatApprovalHierarchy: ['housemaster', 'principal'],
  diningSchedules: [{ name: 'Breakfast', startsAt: '07:00', endsAt: '08:00' }],
  timeZone: 'Africa/Lagos',
  languages: ['en', 'yo'],
  branding: { primaryColor: '#1d4ed8', accentColor: '#0f766e' },
  capabilities: {
    gate_security: true,
    guardian_pickup: true,
    hostel_management: true,
    exeat_management: true,
    dining_management: true,
    school_transport: true,
    digital_library: true,
    gps_geofencing: false,
    device_management: false
  }
} as const;

test('logistics template explicitly permits day and outsourced-transport configurations', () => {
  assert.equal(LOGISTICS_FEATURE_TEMPLATE.templateId, 'campus-logistics-support');
  assert.equal(validateLogisticsFeatureConfiguration(configuration).valid, true);
  const daySchool = {
    ...configuration,
    schoolType: 'day' as const,
    boardingSchool: false,
    hostelCapacity: 0,
    studentCategories: ['day' as const],
    transportOwnership: 'none' as const,
    routeCount: 0,
    capabilities: {
      ...configuration.capabilities,
      hostel_management: false,
      exeat_management: false,
      school_transport: false
    }
  };
  assert.equal(validateLogisticsFeatureConfiguration(daySchool).valid, true);
});

test('logistics template rejects contradictory day-school hostel settings and invalid time zones', () => {
  const result = validateLogisticsFeatureConfiguration({
    ...configuration,
    schoolType: 'day',
    timeZone: 'Not/A_Timezone'
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('Day schools')));
  assert.ok(result.errors.some(error => error.includes('IANA time zone')));
});

test('application builder configuration carries the versioned logistics settings', () => {
  const configuredOnly = {
    ...configuration,
    capabilities: Object.fromEntries(
      Object.keys(configuration.capabilities).map(key => [key, false])
    )
  };
  const built = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    deploymentArchitecture: 'shared_database',
    featureConfigurations: {
      feat_logistics_support: {
        templateId: LOGISTICS_FEATURE_TEMPLATE.templateId,
        templateVersion: LOGISTICS_FEATURE_TEMPLATE.templateVersion,
        settings: configuredOnly
      }
    }
  });
  assert.equal(validateApplicationInstanceConfiguration(built).valid, true);
  assert.deepEqual(built.featureConfigurations?.feat_logistics_support.settings, configuredOnly);

  const invalid = {
    ...built,
    featureConfigurations: {
      feat_logistics_support: {
        ...built.featureConfigurations!.feat_logistics_support,
        settings: configuration
      }
    }
  };
  assert.equal(validateApplicationInstanceConfiguration(invalid).valid, false);
});

test('pickup tokens use unpredictable values and PINs are salted and checked without plaintext storage', async () => {
  const first = logisticsSecurity.hashToken('A'.repeat(43));
  const second = logisticsSecurity.hashToken('B'.repeat(43));
  assert.equal(first.length, 32);
  assert.notDeepEqual(first, second);

  const storedHash = await logisticsSecurity.hashPin('4729');
  assert.match(storedHash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(storedHash, '4729');
  assert.equal(await logisticsSecurity.pinMatches('4729', storedHash), true);
  assert.equal(await logisticsSecurity.pinMatches('4728', storedHash), false);
});

test('gate scan idempotency fingerprints bind credentials and gate context without storing them', () => {
  const previousSecret = process.env.CONTROL_PLANE_SECRET;
  process.env.CONTROL_PLANE_SECRET = 'gate-scan-idempotency-test-secret:32+';
  try {
    const scan = {
      token: 'unpredictable-pickup-token-value',
      pin: '4729',
      gateLocationId: '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8',
      direction: 'exit' as const
    };
    const fingerprint = logisticsSecurity.fingerprintGateScan(scan);
    assert.equal(fingerprint.length, 32);
    assert.deepEqual(logisticsSecurity.fingerprintGateScan(scan), fingerprint);
    assert.notDeepEqual(logisticsSecurity.fingerprintGateScan({ ...scan, pin: '4728' }), fingerprint);
    assert.notDeepEqual(logisticsSecurity.fingerprintGateScan({ ...scan, token: 'different-token-value' }), fingerprint);
    assert.notDeepEqual(logisticsSecurity.fingerprintGateScan({ ...scan, direction: 'entry' }), fingerprint);
  } finally {
    if (previousSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
    else process.env.CONTROL_PLANE_SECRET = previousSecret;
  }
});
