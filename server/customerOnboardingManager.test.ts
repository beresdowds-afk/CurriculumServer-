import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ServerTenantTokenService } from './tenantTokenService';
import { IIAPEngineService } from '../src/services/iiapEngineService';
import { createProvisioningExecutionPlan } from './provisioningPlan';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'curriculum-onboarding-test-'));
process.env.ONBOARDING_PERSISTENCE_FILE = path.join(tempDir, 'instances.json');
const originalCwd = process.cwd();
process.chdir(tempDir);
const { customerOnboardingManager } = await import('./customerOnboardingManager');
process.chdir(originalCwd);

after(() => {
  delete process.env.ONBOARDING_PERSISTENCE_FILE;
  rmSync(tempDir, { recursive: true, force: true });
});

let fixtureNumber = 0;
function createRequest(overrides: Record<string, unknown> = {}) {
  fixtureNumber += 1;
  return customerOnboardingManager.createInstanceRequest({
    instanceType: 'full_school_management',
    organization: {
      organizationName: `Test School ${fixtureNumber}`,
      registrationNumber: `TEST-${fixtureNumber}`,
      organizationType: 'educational_institution',
      contactPersonName: 'Test Requester',
      contactEmail: 'requester@example.test',
      contactPhone: '+10000000000',
      address: 'Test address',
      state: 'Test state',
      lga: 'Test district',
      country: 'Test country',
      provisionerRole: 'proprietor'
    },
    selectedModules: [],
    databaseStrategy: 'shared_schema_isolated',
    storageStrategy: 'platform_storage',
    storageProvider: 'google_cloud_storage',
    deploymentTarget: 'shared_application_infrastructure',
    subdomain: `test-school-${fixtureNumber}`,
    billingModel: 'monthly',
    monthlyPriceNGN: 100,
    paymentProvider: 'paystack',
    paymentReference: 'test-reference',
    amountPaidNGN: 100,
    idempotencyKey: `test-key-${fixtureNumber}`,
    ...overrides
  });
}

describe('customer onboarding fail-closed behavior', () => {
  it('does not mark payment verified from a reference without provider evidence', () => {
    const record = createRequest();
    const result = customerOnboardingManager.verifyPayment(record.instanceId, 'fake-reference', 'paystack', 100);
    assert.equal(result.verified, false);
    assert.equal(record.payment.paymentStatus, 'pending');
    assert.equal(record.provisioningStatus, 'payment_pending');
  });

  it('uses the same request for retries with the same idempotency key', () => {
    const payload = {
      instanceType: 'full_school_management' as const,
      organization: {
        organizationName: 'Idempotent School',
        registrationNumber: 'IDEMPOTENT',
        organizationType: 'educational_institution' as const,
        contactPersonName: 'Test Requester',
        contactEmail: 'requester@example.test',
        contactPhone: '+10000000000',
        address: 'Test address',
        state: 'Test state',
        lga: 'Test district',
        country: 'Test country',
        provisionerRole: 'proprietor' as const
      },
      selectedModules: [],
      deploymentTarget: 'shared_application_infrastructure' as const,
      subdomain: 'idempotent-school',
      billingModel: 'monthly' as const,
      monthlyPriceNGN: 100,
      paymentProvider: 'paystack' as const,
      paymentReference: 'test-reference',
      amountPaidNGN: 100,
      idempotencyKey: 'same-request-key'
    };
    const first = customerOnboardingManager.createInstanceRequest(payload);
    const retry = customerOnboardingManager.createInstanceRequest(payload);
    assert.equal(retry.instanceId, first.instanceId);
  });

  it('keeps unverified checks unavailable and blocks activation without verified execution', () => {
    const record = createRequest();
    const checks = customerOnboardingManager.runVerificationChecklist(record.instanceId);
    assert.equal(checks.allPassed, false);
    assert.deepEqual([
      checks.databaseConnected,
      checks.storageReady,
      checks.securityProfileApplied,
      checks.dnsProvisioned,
      checks.healthPingPassed
    ], ['unavailable', 'unavailable', 'unavailable', 'unavailable', 'unavailable']);

    const activation = customerOnboardingManager.activateInstance(record.instanceId);
    assert.equal(activation.success, false);
    assert.equal(activation.activationToken, undefined);
    assert.equal(activation.activationUrl, undefined);
    assert.equal(record.activationToken, undefined);
    assert.equal(record.activationUrl, undefined);
  });

  it('does not turn shared onboarding into customer project creation and blocks for the missing adapter', async () => {
    const record = createRequest();
    record.payment.paymentStatus = 'verified';
    await assert.rejects(
      customerOnboardingManager.executeProvisioning(record.instanceId),
      /PROVISIONING_ADAPTER_UNAVAILABLE/
    );
    assert.equal(record.deploymentTarget, 'shared_application_infrastructure');
    assert.equal(record.createProject, false);
    assert.equal(record.provisioningStatus, 'blocked');
    assert.equal(record.provisioningFailure?.code, 'PROVISIONING_ADAPTER_UNAVAILABLE');
    assert.match(record.provisioningFailure?.message || '', /shared_tenant_configuration/);
    assert.notEqual(record.provisioningStatus, 'verified');
    const profile = IIAPEngineService.getProfiles().find(item => item.profileId === record.architectureProfileId);
    assert.ok(profile);
    assert.ok(!createProvisioningExecutionPlan(profile).operations.includes('gcp_project'));
  });

  it('requires explicit project creation consent and separate PIAM approval', async () => {
    assert.throws(() => IIAPEngineService.evaluateAndRecommend({
      customerId: 'customer-test',
      customerName: 'Test School',
      instanceType: 'full_school_management',
      expectedStudents: 1000,
      expectedFaculty: 50,
      expectedConcurrentUsers: 100,
      dataVolumeGb: 10,
      availabilitySla: '99.9',
      requiresDedicatedDatabase: false,
      requiresCustomDomain: false,
      securityTier: 'standard',
      budgetPreference: 'balanced',
      requestedDeploymentTarget: 'dedicated_gcp_project',
      createProject: false
    }), /PROJECT_CREATION_EXPLICIT_CONSENT_REQUIRED/);
    assert.throws(() => createRequest({
      deploymentTarget: 'dedicated_gcp_project',
      createProject: true,
      projectId: 'bad',
      parentOrganizationId: '123456789012'
    }), /PROJECT_ID_INVALID/);

    const record = createRequest({
      deploymentTarget: 'dedicated_gcp_project',
      createProject: true,
      projectId: 'customer-test-123',
      parentOrganizationId: '123456789012'
    });
    record.payment.paymentStatus = 'verified';
    await assert.rejects(customerOnboardingManager.executeProvisioning(record.instanceId), /PIAM_UNAVAILABLE/);
    assert.equal(record.provisioningStatus, 'blocked');
    assert.equal(record.provisioningFailure?.code, 'PIAM_UNAVAILABLE');
  });

  it('preserves dedicated service, multi-service and container deployment targets', () => {
    const targets = [
      'dedicated_cloud_run_service',
      'multiple_cloud_run_services',
      'container_workloads'
    ] as const;
    for (const target of targets) {
      const profile = IIAPEngineService.evaluateAndRecommend({
        customerId: 'customer-test',
        customerName: 'Test School',
        instanceType: 'full_school_management',
        expectedStudents: 1000,
        expectedFaculty: 50,
        expectedConcurrentUsers: 100,
        dataVolumeGb: 10,
        availabilitySla: '99.9',
        requiresDedicatedDatabase: false,
        requiresCustomDomain: false,
        securityTier: 'standard',
        budgetPreference: 'balanced',
        requestedDeploymentTarget: target
      });
      assert.equal(profile.deploymentTarget, target);
    }
  });

  it('does not infer billing-association approval from project-creation approval', () => {
    const profile = IIAPEngineService.evaluateAndRecommend({
      customerId: 'customer-test',
      customerName: 'Test School',
      instanceType: 'full_school_management',
      expectedStudents: 1000,
      expectedFaculty: 50,
      expectedConcurrentUsers: 100,
      dataVolumeGb: 10,
      availabilitySla: '99.9',
      requiresDedicatedDatabase: false,
      requiresCustomDomain: false,
      securityTier: 'standard',
      budgetPreference: 'balanced',
      requestedDeploymentTarget: 'dedicated_gcp_project',
      createProject: true,
      projectId: 'customer-test-456',
      parentOrganizationId: '123456789012'
    });
    const plan = createProvisioningExecutionPlan(profile);
    assert.equal(plan.requiresProjectCreationApproval, true);
    assert.ok(plan.operations.includes('gcp_project'));
    assert.ok(!plan.operations.includes('billing_association'));
  });

  it('preserves tenant identity from the authenticated token claims', () => {
    const originalSecret = process.env.CONTROL_PLANE_SECRET;
    process.env.CONTROL_PLANE_SECRET = 'customer-onboarding-test-secret-32-characters';
    try {
      const token = ServerTenantTokenService.issueTenantToken({
        id: 'tenant-a',
        appId: 'app-a',
        schoolName: 'Tenant A',
        subscriptionTier: 'standard',
        status: 'active'
      } as any, 'tenant_admin');
      const verified = ServerTenantTokenService.verifyTenantToken(token);
      assert.equal(verified.valid, true);
      assert.equal(verified.context?.tenantId, 'tenant-a');
    } finally {
      if (originalSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
      else process.env.CONTROL_PLANE_SECRET = originalSecret;
    }
  });
});
