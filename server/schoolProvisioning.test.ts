import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SchoolProvisioningRequest } from '../packages/shared-types/src/apiContracts';
import {
  createIdempotencyKey,
  createInvitationToken,
  hashInvitationToken,
  hashPassword,
  validateSchoolProvisioningRequest,
  verifyPassword
} from './schoolProvisioning';

const request: SchoolProvisioningRequest = {
  school: {
    name: 'North School',
    displayName: 'North School',
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
  applicationId: 'app_curriculum_flow'
};

test('school provisioning validation normalizes input and accepts configurable calendars', () => {
  const validated = validateSchoolProvisioningRequest(request);
  assert.equal(validated.administrator.email, 'admin@north.example');
  assert.equal(validated.school.officialContactEmail, 'contact@north.example');
  assert.equal(validated.configuration.currency, 'GHS');
  assert.deepEqual(validated.configuration.academicTermStructure, request.configuration.academicTermStructure);
});

test('school provisioning rejects invalid contact data, types, and duplicate terms', () => {
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    school: { ...request.school, officialContactEmail: 'not-an-email' }
  }), /valid official school/);
  assert.throws(() => validateSchoolProvisioningRequest({
    ...request,
    school: { ...request.school, schoolType: 'university-ish' }
  }), /supported school type/);
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
