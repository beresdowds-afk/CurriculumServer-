import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOGISTICS_FEATURE_TEMPLATE,
  validateLogisticsFeatureConfiguration
} from '../../src/data/logisticsFeatureTemplate';

function configuration() {
  return {
    schoolType: 'day',
    campusCount: 1,
    gateCount: 1,
    boardingSchool: false,
    hostelCapacity: 0,
    studentCategories: ['day'],
    transportOwnership: 'school_owned',
    vehicleCount: 1,
    routeCount: 1,
    parentNotifications: { sms: false, email: false, push: false },
    pickupRequiresPin: true,
    pickupReusablePasses: false,
    exeatApprovalHierarchy: ['principal'],
    diningSchedules: [{ name: 'lunch', startsAt: '12:00', endsAt: '13:00' }],
    timeZone: 'Africa/Lagos',
    languages: ['en'],
    branding: {},
    capabilities: Object.fromEntries(
      LOGISTICS_FEATURE_TEMPLATE.configurableCapabilities.map(capability => [capability, false])
    )
  };
}

test('GPS geofencing requires school transport but can be enabled after provider readiness checks', () => {
  const withoutTransport = configuration();
  withoutTransport.capabilities.gps_geofencing = true;
  assert.ok(validateLogisticsFeatureConfiguration(withoutTransport).errors.includes(
    'GPS geofencing requires school transport to be enabled.'
  ));

  const withTransport = configuration();
  withTransport.capabilities.school_transport = true;
  withTransport.capabilities.gps_geofencing = true;
  assert.equal(validateLogisticsFeatureConfiguration(withTransport).valid, true);
});
