import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  signTenantProvisioningContract,
  TenantDatabaseProvisioningService,
  TenantProvisioningError,
  verifyTenantProvisioningContract,
  type ApprovedProvisioningDecision,
  type ProvisioningRepository,
  type SignedTenantProvisioningContract,
  type TenantProvisioningContract,
  type TenantProvisioningProviders
} from './tenantDatabaseProvisioner';
import type {
  PiamVerificationAdapter,
  PiamVerificationRequest,
  PiamVerificationResult
} from './piamVerificationAdapter';

const signingKey = 'test-only-contract-signing-key-with-at-least-thirty-two-characters';
const issuer = 'cipa@curriculumserver.example';
const issuedAt = new Date(Date.now() - 1_000).toISOString();
const expiresAt = new Date(Date.now() + 60_000).toISOString();

function contract(overrides: Partial<TenantProvisioningContract> = {}): TenantProvisioningContract {
  return {
    version: 1,
    contractId: '01234567-89ab-4cde-8fab-0123456789ab',
    approvalId: '11234567-89ab-4cde-8fab-0123456789ab',
    tenantId: '21234567-89ab-4cde-8fab-0123456789ab',
    applicationInstanceId: '31234567-89ab-4cde-8fab-0123456789ab',
    issuer,
    audience: 'curriculum-tenant-database-provisioner',
    issuedAt,
    expiresAt,
    databaseStrategy: 'shared_schema_isolated',
    storageStrategy: 'hybrid',
    region: 'europe-west1',
    ...overrides
  };
}

function signed(payload: TenantProvisioningContract): SignedTenantProvisioningContract {
  return { payload, signature: signTenantProvisioningContract(payload, signingKey) };
}

class TestRepository implements ProvisioningRepository {
  approved = true;
  existingStatus: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready' = 'pending';
  attemptNumber = 1;
  attempts: Array<{ stage: string; status: string }> = [];
  databaseRecords = 0;
  storageRecords = 0;
  verificationRecords = 0;
  piamVerifications: Array<{
    status: string;
    contractHash: string;
    evidenceHash?: string;
    approverIdentity?: string;
  }> = [];
  completed = 0;
  requestHashes: string[] = [];
  failure?: { code: string; retryable: boolean };

  async findApprovedDecision(input: TenantProvisioningContract): Promise<ApprovedProvisioningDecision | undefined> {
    if (!this.approved) return undefined;
    return {
      approvalId: input.approvalId,
      tenantId: input.tenantId,
      applicationInstanceId: input.applicationInstanceId,
      approvalSubject: issuer,
      decision: 'approved',
      databaseStrategy: input.databaseStrategy,
      storageStrategy: input.storageStrategy,
      region: input.region,
      customerProjectId: input.customerProjectId ?? null
    };
  }

  async begin(_input: TenantProvisioningContract, requestHash: string) {
    this.requestHashes.push(requestHash);
    const claimed = this.existingStatus === 'pending' || this.existingStatus === 'retryable_failure';
    if (this.existingStatus === 'pending') this.existingStatus = 'running';
    if (this.existingStatus === 'retryable_failure') {
      this.existingStatus = 'running';
      this.attemptNumber += 1;
    }
    return {
      operationId: '41234567-89ab-4cde-8fab-0123456789ab',
      attemptNumber: this.attemptNumber,
      status: this.existingStatus,
      claimed
    };
  }

  async recordAttempt(input: { stage: string; status: string }) {
    this.attempts.push(input);
  }

  async recordPiamVerification(input: {
    status: string;
    contractHash: string;
    evidenceHash?: string;
    approverIdentity?: string;
  }) {
    this.piamVerifications.push(input);
  }

  async recordDatabaseResource() { this.databaseRecords += 1; }
  async recordStorageResource() { this.storageRecords += 1; }
  async recordVerificationEvidence() { this.verificationRecords += 1; }
  async complete() { this.completed += 1; this.existingStatus = 'ready'; }
  async fail(_contract: TenantProvisioningContract, _id: string, code: string, retryable: boolean) {
    this.failure = { code, retryable };
    this.existingStatus = retryable ? 'retryable_failure' : 'failed';
  }
}

class MockPiamVerificationAdapter implements PiamVerificationAdapter {
  constructor(private readonly result?: Partial<PiamVerificationResult>) {}

  async verifyAndConsume(request: PiamVerificationRequest): Promise<PiamVerificationResult> {
    return {
      status: 'verified',
      verifier: 'mock-piam-adapter',
      approvalId: request.approvalId,
      contractHash: request.contractHash,
      tenantId: request.contract.tenantId,
      applicationInstanceId: request.contract.applicationInstanceId,
      operation: request.operation,
      targetProjectId: request.contract.customerProjectId ?? null,
      approverIdentity: 'test-approver@example.invalid',
      authenticationAssurance: 'mfa_verified',
      requesterApproverSeparated: true,
      consumed: true,
      evidenceReference: 'test-evidence-reference',
      evidenceHash: 'a'.repeat(64),
      ...this.result
    };
  }
}

function providers(overrides: Partial<TenantProvisioningProviders> = {}): TenantProvisioningProviders {
  return {
    provisionDatabase: async ({ contract: input }) => ({
      providerResourceId: `database-${input.databaseStrategy}`,
      host: 'db.staging.example',
      port: 5432,
      databaseName: 'curriculum_staging',
      schemaName: 'tenant_21234567',
      runtimeRoleName: 'tenant_runtime',
      secretManagerReference: 'projects/staging-123/secrets/tenant-db/versions/latest',
      evidence: { providerOperation: 'confirmed' }
    }),
    provisionStorage: async ({ contract: input }) => ({
      providerConfiguration: {
        strategy: input.storageStrategy,
        gcsBucket: 'tenant-staging-bucket',
        oauthCredentialReference: 'projects/staging-123/secrets/drive-oauth/versions/latest'
      },
      evidence: { private: true, uniformBucketLevelAccess: true }
    }),
    runMigrations: async () => ({ migrationVersions: [20], evidence: { runner: 'controlled-migration-runner' } }),
    verifyDatabase: async ({ resource }) => ({
      providerResourceId: resource.providerResourceId,
      verifier: 'staging-provider-probe',
      checks: {
        connected: true, postgresql16: true, runtimeNonOwner: true,
        runtimeNoSuperuser: true, runtimeNoBypassRls: true, rlsEnforced: true
      }
    }),
    verifyStorage: async () => ({
      providerResourceId: 'storage-staging-resource',
      verifier: 'staging-provider-probe',
      checks: {
        bucketAccessible: true, regionApproved: true, private: true,
        uniformBucketLevelAccess: true, publicAccessPrevention: true,
        encryption: true, retention: true, runtimePermissions: true,
        delegatedAuthorization: true, providerAccessible: true
      }
    }),
    ...overrides
  };
}

function service(
  repository: TestRepository,
  providerOverrides: Partial<TenantProvisioningProviders> = {},
  piam: PiamVerificationAdapter = new MockPiamVerificationAdapter()
): TenantDatabaseProvisioningService {
  return new TenantDatabaseProvisioningService(repository, providers(providerOverrides), {
    signingKey, expectedIssuer: issuer
  }, piam);
}

test('signed contracts validate all approved isolation strategies and require a project ID', () => {
  const strategies: TenantProvisioningContract['databaseStrategy'][] = [
    'shared_schema_isolated', 'dedicated_database', 'dedicated_customer_gcp_project'
  ];
  for (const databaseStrategy of strategies) {
    const payload = contract({
      databaseStrategy,
      ...(databaseStrategy === 'dedicated_customer_gcp_project'
        ? { customerProjectId: 'school-staging-12345' }
        : {})
    });
    assert.deepEqual(
      verifyTenantProvisioningContract(signed(payload), { signingKey, expectedIssuer: issuer }),
      payload
    );
  }
  assert.throws(
    () => verifyTenantProvisioningContract(signed(contract({
      databaseStrategy: 'dedicated_customer_gcp_project'
    })), { signingKey, expectedIssuer: issuer }),
    (error: unknown) => error instanceof TenantProvisioningError && error.code === 'INVALID_CONTRACT'
  );
});

test('contracts reject tampering, an unexpected issuer, and expired approval envelopes', () => {
  const envelope = signed(contract());
  assert.throws(() => verifyTenantProvisioningContract({
    ...envelope, payload: { ...envelope.payload, tenantId: '99999999-89ab-4cde-8fab-0123456789ab' }
  }, { signingKey, expectedIssuer: issuer }), /signature is invalid/);
  assert.throws(() => verifyTenantProvisioningContract(envelope, {
    signingKey, expectedIssuer: 'untrusted@example.org'
  }), /claims are invalid or expired/);
  const expired = contract({ expiresAt: new Date(Date.now() - 10_000).toISOString() });
  assert.throws(() => verifyTenantProvisioningContract(signed(expired), {
    signingKey, expectedIssuer: issuer
  }), /claims are invalid or expired/);
});

test('provider results, migration, and resource verification are required before ready state', async () => {
  for (const databaseStrategy of [
    'shared_schema_isolated', 'dedicated_database', 'dedicated_customer_gcp_project'
  ] as const) {
    const repository = new TestRepository();
    const result = await service(repository).execute(signed(contract({
      databaseStrategy,
      ...(databaseStrategy === 'dedicated_customer_gcp_project'
        ? { customerProjectId: 'school-staging-12345' }
        : {})
    })));
    assert.equal(result.status, 'ready');
    assert.equal(repository.databaseRecords, 1);
    assert.equal(repository.storageRecords, 1);
    assert.equal(repository.verificationRecords, 2);
    assert.equal(repository.completed, 1);
    assert.equal(repository.piamVerifications[0]?.status, 'verified');
    assert.equal(repository.piamVerifications[0]?.evidenceHash, 'a'.repeat(64));
    assert.equal(repository.piamVerifications[0]?.approverIdentity, 'test-approver@example.invalid');
  }

  const failedRepository = new TestRepository();
  const migrationFailure = await service(failedRepository, {
    runMigrations: async () => { throw new TenantProvisioningError('MIGRATION_FAILED', 'migration unavailable', true); }
  }).execute(signed(contract()));
  assert.equal(migrationFailure.status, 'retryable_failure');
  assert.equal(failedRepository.completed, 0);
  assert.deepEqual(failedRepository.failure, { code: 'MIGRATION_FAILED', retryable: true });

  const unverifiedRepository = new TestRepository();
  const unverified = await service(unverifiedRepository, {
    verifyStorage: async () => ({ providerResourceId: '', verifier: '', checks: {} })
  }).execute(signed(contract()));
  assert.equal(unverified.status, 'failed');
  assert.equal(unverifiedRepository.completed, 0);

  const failedChecksRepository = new TestRepository();
  const failedChecks = await service(failedChecksRepository, {
    verifyDatabase: async ({ resource }) => ({
      providerResourceId: resource.providerResourceId,
      verifier: 'staging-provider-probe',
      checks: {
        connected: true, postgresql16: true, runtimeNonOwner: true,
        runtimeNoSuperuser: true, runtimeNoBypassRls: true, rlsEnforced: false
      }
    })
  }).execute(signed(contract()));
  assert.equal(failedChecks.status, 'failed');
  assert.equal(failedChecksRepository.completed, 0);
});

test('verification must match the allocated database and confirm runtime storage permissions', async () => {
  const mismatchedDatabase = new TestRepository();
  const mismatch = await service(mismatchedDatabase, {
    verifyDatabase: async () => ({
      providerResourceId: 'another-database',
      verifier: 'mock-verifier',
      checks: {
        connected: true, postgresql16: true, runtimeNonOwner: true,
        runtimeNoSuperuser: true, runtimeNoBypassRls: true, rlsEnforced: true
      }
    })
  }).execute(signed(contract()));
  assert.equal(mismatch.status, 'failed');
  assert.equal(mismatchedDatabase.completed, 0);

  const missingPermissions = new TestRepository();
  const unverified = await service(missingPermissions, {
    verifyStorage: async () => ({
      providerResourceId: 'mock-bucket',
      verifier: 'mock-verifier',
      checks: {
        bucketAccessible: true, regionApproved: true, private: true,
        uniformBucketLevelAccess: true, publicAccessPrevention: true,
        encryption: true, retention: true, delegatedAuthorization: true, providerAccessible: true
      }
    })
  }).execute(signed(contract()));
  assert.equal(unverified.status, 'failed');
  assert.equal(missingPermissions.completed, 0);
});

test('unclassified provider failures require reconciliation rather than an automatic retry', async () => {
  const repository = new TestRepository();
  const result = await service(repository, {
    provisionDatabase: async () => { throw new Error('ambiguous provider response'); }
  }).execute(signed(contract()));
  assert.equal(result.status, 'failed');
  assert.deepEqual(repository.failure, { code: 'PROVIDER_OPERATION_FAILED', retryable: false });
});

test('the default PIAM adapter fails closed and records unavailable authorization before provisioning', async () => {
  const repository = new TestRepository();
  const defaultService = new TenantDatabaseProvisioningService(repository, providers(), {
    signingKey, expectedIssuer: issuer
  });
  await assert.rejects(defaultService.execute(signed(contract())), (error: unknown) =>
    error instanceof TenantProvisioningError && error.code === 'PIAM_UNAVAILABLE'
  );
  assert.equal(repository.piamVerifications.length, 1);
  assert.equal(repository.piamVerifications[0].status, 'unavailable');
  assert.equal(repository.databaseRecords, 0);
});

test('PIAM rejects reused, expired, revoked, rejected, and scope-mismatched approvals', async () => {
  for (const status of ['reused', 'expired', 'revoked', 'rejected'] as const) {
    const repository = new TestRepository();
    await assert.rejects(
      service(repository, {}, new MockPiamVerificationAdapter({ status })).execute(signed(contract())),
      (error: unknown) => error instanceof TenantProvisioningError &&
        error.code === `PIAM_APPROVAL_${status.toUpperCase()}`
    );
    assert.equal(repository.piamVerifications[0].status, status);
    assert.equal(repository.databaseRecords, 0);
  }

  const repository = new TestRepository();
  for (const mismatch of [
    { tenantId: '99999999-89ab-4cde-8fab-0123456789ab' },
    { targetProjectId: 'unapproved-project-123' },
    { contractHash: '0'.repeat(64) },
    { approverIdentity: '' },
    { authenticationAssurance: undefined },
    { requesterApproverSeparated: false },
    { consumed: false },
    { evidenceHash: 'not-a-digest' }
  ]) {
    const mismatchRepository = new TestRepository();
    await assert.rejects(service(
      mismatchRepository, {}, new MockPiamVerificationAdapter(mismatch)
    ).execute(signed(contract())), (error: unknown) =>
      error instanceof TenantProvisioningError && error.code === 'PIAM_APPROVAL_INVALID'
    );
    assert.equal(mismatchRepository.piamVerifications[0].status, 'invalid');
    assert.equal(mismatchRepository.databaseRecords, 0);
  }
});

test('approval mismatch, concurrent duplicate, and credential-bearing OAuth results fail closed', async () => {
  const notApproved = new TestRepository();
  notApproved.approved = false;
  await assert.rejects(service(notApproved).execute(signed(contract())), /server-verified provisioning approval/);

  const inFlight = new TestRepository();
  inFlight.existingStatus = 'running';
  await assert.rejects(service(inFlight).execute(signed(contract())), /already running/);

  const credentialLeak = new TestRepository();
  const leaked = await service(credentialLeak, {
    provisionStorage: async () => ({
      providerConfiguration: { provider: 'google_drive', access_token: 'must-not-persist' },
      evidence: { verified: true }
    })
  }).execute(signed(contract()));
  assert.equal(leaked.status, 'failed');
  assert.equal(credentialLeak.storageRecords, 0);
  assert.equal(credentialLeak.completed, 0);
});

test('retry claims a durable retryable operation with the next attempt number', async () => {
  const repository = new TestRepository();
  repository.existingStatus = 'retryable_failure';
  repository.attemptNumber = 1;
  const result = await service(repository).execute(signed(contract()));
  assert.equal(result.status, 'ready');
  assert.equal(result.attemptNumber, 2);
});

test('reissued contracts retain idempotency without ignoring changes to approved claims', async () => {
  const repository = new TestRepository();
  const payload = contract();
  await service(repository).execute(signed(payload));
  await service(repository).execute(signed({
    ...payload,
    issuedAt: new Date(Date.now() - 2_000).toISOString(),
    expiresAt: new Date(Date.now() + 120_000).toISOString()
  }));
  await service(repository).execute(signed({ ...payload, region: 'us-central1' }));
  assert.equal(repository.requestHashes[0], repository.requestHashes[1]);
  assert.notEqual(repository.requestHashes[1], repository.requestHashes[2]);
});
