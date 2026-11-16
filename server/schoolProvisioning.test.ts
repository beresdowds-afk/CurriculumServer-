import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SchoolProvisioningRequest } from '../packages/shared-types/src/apiContracts';
import { APPLICATION_TEMPLATE_REGISTRY, buildApplicationInstanceConfiguration } from '../src/data/applicationInstanceConfiguration';
import { INITIAL_REGISTERED_FEATURES } from '../src/data/applicationRegistryData';
import {
  createIdempotencyKey,
  createInvitationToken,
  hashInvitationToken,
  hashPassword,
  hashProvisioningRequest,
  validateSchoolProvisioningRequest,
  verifyPassword
} from './schoolProvisioning';

const request: SchoolProvisioningRequest = {
  school: {
    name: 'North School',
    displayName: 'North School',
    shortName: 'North',
    slug: 'north-school',
    schoolType: 'primary',
    country: 'Ghana',
    stateProvince: 'Greater Accra',
    city: 'Accra',
    physicalAddress: '1 Main Street',
    officialContactEmail: 'contact@north.example',
    telephone: '+233 20 000 0000'
  },
  configuration: {
    timeZone: 'Africa/Accra',
    currency: 'GHS',
    language: 'en',
    academicSession: '2025-2026',
    academicTermStructure: [{ name: 'Semester 1', startMonth: 9, endMonth: 1 }],
    educationLevels: ['Primary'],
    gradingConfiguration: { maximumScore: 100 }
  },
  administrator: { fullName: 'School Administrator', email: 'ADMIN@north.example' },
  applicationId: 'app_curriculum_flow',
  architecture: 'shared_database',
  templateId: 'school-standard',
  templateVersion: '1',
  enabledFeatures: ['feat_school_administration_identity'],
  commercial: {
    commercialModel: 'annual',
    planReference: 'school-standard-annual',
    priceReference: 'price-pending-review',
    currency: 'GHS',
    billingInterval: 'year'
  },
  deployment: {}
};

test('school provisioning validation normalizes input and accepts configurable calendars', () => {
  const validated = validateSchoolProvisioningRequest(request);
  assert.equal(validated.administrator.email, 'admin@north.example');
  assert.equal(validated.school.officialContactEmail, 'contact@north.example');
  assert.equal(validated.configuration.currency, 'GHS');
  assert.deepEqual(validated.configuration.academicTermStructure, request.configuration.academicTermStructure);
});

test('school identity is not a mandatory application feature', () => {
  const registration = INITIAL_REGISTERED_FEATURES.find(feature => feature.featureId === 'feat_student_registration')!;
  const previousReadiness = registration.readiness;
  registration.readiness = [
    'designed', 'implemented', 'database_migrated', 'api_operational',
    'authorization_verified', 'acceptance_tested', 'provisionable', 'production_approved'
  ];
  try {
    const validated = validateSchoolProvisioningRequest({
      ...request,
      enabledFeatures: ['feat_student_registration']
    });
    assert.deepEqual(validated.enabledFeatures, ['feat_student_registration']);
  } finally {
    if (previousReadiness) registration.readiness = previousReadiness;
    else delete registration.readiness;
  }
});

test('school administration template is discoverable but draft configurations cannot be provisioned', () => {
  const template = APPLICATION_TEMPLATE_REGISTRY.find(
    item => item.templateId === 'school_administration_identity'
  );
  assert.ok(template);
  assert.equal(template.status, 'draft');
  assert.equal(template.provisionable, false);
  assert.ok(template.capabilities.includes('school_identity'));
  assert.throws(() => buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: template.templateId,
    templateVersion: template.versions[0],
    enabledCapabilities: ['feat_school_administration_identity'],
    deploymentArchitecture: 'shared_database'
  }), /registered but not provisionable/);
});

test('validated Application Builder configurations preserve the selected configuration version', () => {
  const applicationConfiguration = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    configurationVersion: 4,
    deploymentArchitecture: 'shared_database'
  });
  const validated = validateSchoolProvisioningRequest({
    ...request,
    applicationConfiguration
  });
  assert.equal(validated.applicationConfiguration?.configurationVersion, 4);
  assert.equal(hashProvisioningRequest({
    ...request,
    applicationConfiguration: {
      ...applicationConfiguration,
      validationEvidence: {
        ...applicationConfiguration.validationEvidence,
        validatedAt: '2026-11-16T00:00:00.000Z'
      }
    }
  }), hashProvisioningRequest({
    ...request,
    applicationConfiguration: {
      ...applicationConfiguration,
      validationEvidence: {
        ...applicationConfiguration.validationEvidence,
        validatedAt: '2026-11-16T01:00:00.000Z'
      }
    }
  }), 'validation timestamps do not break retry idempotency');
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    enabledFeatures: [],
    applicationConfiguration
  }), /at least one production-approved/);
});

test('school provisioning rejects invalid contact data, slugs, unregistered features, and duplicate terms', () => {
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    school: { ...request.school, officialContactEmail: 'not-an-email' }
  }), /valid official school/);
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    school: { ...request.school, slug: 'Invalid School Slug' }
  }), /slug must contain/);
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    enabledFeatures: ['unknown-feature']
  }), /Unknown feature/);
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    configuration: {
      ...request.configuration,
      academicTermStructure: [{ name: 'Term' }, { name: ' term ' }]
    }
  }), /term names must be unique/);
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    configuration: { ...request.configuration, timeZone: 'Not/A_Timezone' }
  }), /valid IANA time zone/);
});

test('administrator passwords are scrypt-hashed and checked without storing plaintext', async () => {
  const encoded = await hashPassword('a-long-administrator-password');
  assert.match(encoded, /^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.equal(await verifyPassword('a-long-administrator-password', encoded), true);
  assert.equal(await verifyPassword('incorrect-password', encoded), false);
  await assert.rejects(hashPassword('short'), /12 and 256 characters/);
});

test('invitation and idempotency credentials are high entropy and only hashes are persisted', () => {
  const invitation = createInvitationToken();
  assert.match(invitation.token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(hashInvitationToken(invitation.token), invitation.tokenHash);
  assert.notEqual(invitation.tokenHash.toString('base64url'), invitation.token);
  assert.notEqual(createIdempotencyKey(), createIdempotencyKey());
});
