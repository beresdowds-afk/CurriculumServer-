import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { SchoolProvisioningRequest } from '../../packages/shared-types/src/apiContracts';
import { createVerifiedTenantPrincipal } from './tenantContext';

export const databaseUrl = process.env.TEST_DATABASE_URL;
export const acceptanceEnabled = process.env.DATABASE_TEST_DISPOSABLE === '1' && Boolean(databaseUrl);
// Set by `npm run test:postgres:acceptance`; mandatory runs may never skip.
export const acceptanceRequired = process.env.POSTGRES_ACCEPTANCE_REQUIRED === '1';
export const acceptanceTestOptions = { skip: acceptanceRequired ? false : !acceptanceEnabled };

if (acceptanceRequired && !acceptanceEnabled) {
  test('required PostgreSQL acceptance database is configured', () => {
    throw new Error('TEST_DATABASE_URL and DATABASE_TEST_DISPOSABLE=1 are required for acceptance tests.');
  });
}

export function principal(tenantId: string, role = 'tenant_admin') {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId,
      role,
      appId: 'curriculum-flow',
      schoolName: 'Integration test',
      subscriptionTier: 'test',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: `/storage/${tenantId}`,
      issuer: 'integration-test',
      audience: tenantId,
      issuedAt: 1,
      expiresAt: 2,
      tokenSignature: 'test-signature',
      permissions: []
    }
  });
}

export function buildSchoolRequest(name: string, email: string): SchoolProvisioningRequest {
  return {
    school: {
      name,
      displayName: name,
      shortName: name.slice(0, 40),
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60),
      schoolType: 'primary',
      country: 'Ghana',
      stateProvince: 'Greater Accra',
      city: 'Accra',
      physicalAddress: '1 Test Road',
      officialContactEmail: `contact-${randomUUID()}@test.invalid`,
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
    administrator: { fullName: 'Test Administrator', email },
    applicationId: 'app_curriculum_flow',
    architecture: 'shared_database',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledFeatures: ['feat_school_administration_identity'],
    commercial: {
      commercialModel: 'annual',
      planReference: 'test-annual',
      priceReference: 'unverified-test-price',
      currency: 'GHS',
      billingInterval: 'year'
    },
    deployment: {}
  };
}
