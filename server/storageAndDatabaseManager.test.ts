import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import {
  ServerSecretVault,
  StorageAndDatabaseManager
} from './storageAndDatabaseManager';
import { storageAndDatabaseClient } from '../src/services/storageAndDatabaseClient';
import { unifiedApiClient } from '../src/services/unifiedApiClient';
import { globalBackupService } from '../src/services/backupRestoreService';

function withVaultEnvironment<T>(environment: Record<string, string | undefined>, run: () => T): T {
  const previous = {
    keys: process.env.STORAGE_VAULT_KEYS,
    activeKeyId: process.env.STORAGE_VAULT_ACTIVE_KEY_ID
  };
  if (environment.keys === undefined) delete process.env.STORAGE_VAULT_KEYS;
  else process.env.STORAGE_VAULT_KEYS = environment.keys;
  if (environment.activeKeyId === undefined) delete process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
  else process.env.STORAGE_VAULT_ACTIVE_KEY_ID = environment.activeKeyId;
  try {
    return run();
  } finally {
    if (previous.keys === undefined) delete process.env.STORAGE_VAULT_KEYS;
    else process.env.STORAGE_VAULT_KEYS = previous.keys;
    if (previous.activeKeyId === undefined) delete process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
    else process.env.STORAGE_VAULT_ACTIVE_KEY_ID = previous.activeKeyId;
  }
}

function vaultConfig(keys: Record<string, Buffer>, activeKeyId: string): Record<string, string> {
  return {
    keys: JSON.stringify(Object.fromEntries(
      Object.entries(keys).map(([id, key]) => [id, key.toString('base64')])
    )),
    activeKeyId
  };
}

test('vault fails closed when key configuration is missing or malformed', () => {
  withVaultEnvironment({}, () => {
    assert.throws(() => ServerSecretVault.encrypt('credential'), /configuration is missing or invalid/);
    assert.throws(() => ServerSecretVault.decrypt('v1.key.aa.aa.aa'), /configuration is missing or invalid/);
  });

  withVaultEnvironment(vaultConfig({ short: Buffer.alloc(31) }, 'short'), () => {
    assert.throws(() => ServerSecretVault.encrypt('credential'), /configuration is invalid/);
  });
});

test('vault encrypts and decrypts with AES-GCM and supports controlled key rotation', () => {
  const previousKey = crypto.randomBytes(32);
  const activeKey = crypto.randomBytes(32);
  const oldEnvelope = withVaultEnvironment(vaultConfig({ previous: previousKey }, 'previous'), () =>
    ServerSecretVault.encrypt('private credential')
  );
  const activeEnvelope = withVaultEnvironment(
    vaultConfig({ previous: previousKey, active: activeKey }, 'active'),
    () => {
      const envelope = ServerSecretVault.encrypt('current credential');
      const secondEnvelope = ServerSecretVault.encrypt('current credential');
      assert.notEqual(envelope, secondEnvelope);
      assert.equal(Buffer.from(envelope.split('.')[2], 'base64url').length, 12);
      assert.equal(ServerSecretVault.decrypt(oldEnvelope), 'private credential');
      return envelope;
    }
  );

  assert.match(activeEnvelope, /^v1\.active\./);
  assert.equal(
    withVaultEnvironment(vaultConfig({ previous: previousKey, active: activeKey }, 'active'), () =>
      ServerSecretVault.decrypt(activeEnvelope)
    ),
    'current credential'
  );
});

test('vault rejects tampered ciphertext, unsupported versions, unknown keys, and legacy plaintext envelopes', () => {
  const key = crypto.randomBytes(32);
  const config = vaultConfig({ current: key }, 'current');
  const envelope = withVaultEnvironment(config, () => ServerSecretVault.encrypt('do not reveal'));
  const parts = envelope.split('.');
  parts[4] = `${parts[4].startsWith('A') ? 'B' : 'A'}${parts[4].slice(1)}`;

  withVaultEnvironment(config, () => {
    assert.throws(() => ServerSecretVault.decrypt(parts.join('.')), /Credential decryption failed/);
    assert.throws(() => ServerSecretVault.decrypt(envelope.replace(/^v1/, 'v2')), /Unsupported credential envelope version/);
    assert.throws(() => ServerSecretVault.decrypt(envelope.replace('.current.', '.retired.')), /unknown key/);
    assert.throws(() => ServerSecretVault.decrypt('enc_private%20credential'), /malformed/);
  });
});

test('database and storage configuration do not create fabricated resources', () => {
  assert.ok(StorageAndDatabaseManager.getDatabaseRecords().every(record =>
    record.evidenceStatus === 'unverified_fixture' && record.healthStatus === 'unknown'
  ));
  assert.ok(StorageAndDatabaseManager.getStorageConfigs().every(record =>
    record.evidenceStatus === 'unverified_fixture' &&
    record.connectionHealth === 'unknown' &&
    record.provisioningState === 'unverified'
  ));

  assert.ok(StorageAndDatabaseManager.getDatabaseRecords().every(record =>
    record.evidenceStatus === 'unverified_fixture' && record.healthStatus === 'unknown'
  ));
  assert.ok(StorageAndDatabaseManager.getStorageConfigs().every(record =>
    record.evidenceStatus === 'unverified_fixture' &&
    record.connectionHealth === 'unknown' &&
    record.provisioningState === 'unverified'
  ));

  const databaseCount = StorageAndDatabaseManager.getDatabaseRecords().length;
  const databaseResult = StorageAndDatabaseManager.configureDatabaseIsolation(
    'new-instance',
    'tenant-a',
    'Tenant A',
    'dedicated_database'
  );
  assert.equal(databaseResult.success, false);
  assert.equal(databaseResult.status, 'unavailable');
  assert.equal(StorageAndDatabaseManager.getDatabaseRecords().length, databaseCount);
  assert.equal(
    StorageAndDatabaseManager.getDatabaseRecords().some(record => record.instanceId === 'new-instance' && record.healthStatus === 'healthy'),
    false
  );

  const storageCount = StorageAndDatabaseManager.getStorageConfigs().length;
  const storageResult = StorageAndDatabaseManager.configureCustomerStorage(
    'new-instance',
    'tenant-a',
    'Tenant A',
    'platform_storage',
    'google_cloud_storage'
  );
  assert.equal(storageResult.success, false);
  assert.equal(storageResult.status, 'unavailable');
  assert.equal(StorageAndDatabaseManager.getStorageConfigs().length, storageCount);
  assert.equal(
    StorageAndDatabaseManager.getStorageConfigs().some(record => record.instanceId === 'new-instance'),
    false
  );
});

test('migration remains unavailable instead of creating a completed job', () => {
  const jobsBefore = StorageAndDatabaseManager.getMigrationJobs();
  const result = StorageAndDatabaseManager.startStorageMigration(
    'instance-a',
    'tenant-a',
    'google_cloud_storage',
    'google_drive'
  );
  assert.equal(result.success, false);
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(StorageAndDatabaseManager.getMigrationJobs(), jobsBefore);
  assert.equal(StorageAndDatabaseManager.runPhase7VerificationSuite().allTestsPassed, false);
});

test('backup fixtures are unverified and local create or restore cannot claim success', () => {
  const fixtures = globalBackupService.getSnapshots();
  assert.ok(fixtures.length > 0);
  assert.ok(fixtures.every(snapshot => snapshot.evidenceStatus === 'unverified_fixture'));
  assert.throws(
    () => globalBackupService.createManualSnapshot('tenant-a', 'Tenant A'),
    /unavailable/
  );
  const restore = globalBackupService.simulateRestoreSnapshot(fixtures[0].snapshotId);
  assert.equal(restore.success, false);
  assert.equal(restore.verifiedChecksum, false);
});

test('failed authenticated frontend requests do not create local success state', async () => {
  const originalFetch = globalThis.fetch;
  const now = Math.floor(Date.now() / 1000);
  const claims = Buffer.from(JSON.stringify({
    tenantId: 'tenant-a',
    role: 'super_admin',
    expiresAt: now + 60
  })).toString('base64');
  unifiedApiClient.setControlPlaneToken(`${claims}.test-signature`);
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    code: 'PROVIDER_UNAVAILABLE',
    error: 'Database provisioning is unavailable.',
    correlationId: 'request-test'
  }), { status: 503, headers: { 'Content-Type': 'application/json' } });

  try {
    await assert.rejects(
      storageAndDatabaseClient.configureDatabaseIsolation(
        'instance-a',
        'tenant-a',
        'Tenant A',
        'dedicated_database'
      ),
      (error: { status: number; code: string }) =>
        error.status === 503 && error.code === 'PROVIDER_UNAVAILABLE'
    );
    assert.equal(storageAndDatabaseClient.getDatabaseRecords().some(record => record.instanceId === 'instance-a'), false);
  } finally {
    globalThis.fetch = originalFetch;
    unifiedApiClient.clearTokens();
  }
});

test('tenant-scoped record reads exclude another tenant and fixtures remain explicitly unverified', () => {
  const tenantARecords = StorageAndDatabaseManager.getDatabaseRecords('cust_apex_college');
  assert.ok(tenantARecords.length > 0);
  assert.ok(tenantARecords.every(record => record.tenantId === 'cust_apex_college'));
  assert.equal(tenantARecords.some(record => record.tenantId === 'cust_greenwood_abuja'), false);
  assert.ok(tenantARecords.every(record => record.evidenceStatus === 'unverified_fixture'));

  const tenantAStorage = StorageAndDatabaseManager.getStorageConfigs('cust_apex_college');
  assert.ok(tenantAStorage.every(record => record.tenantId === 'cust_apex_college'));
  assert.equal(tenantAStorage.some(record => record.tenantId === 'cust_greenwood_abuja'), false);
  assert.ok(tenantAStorage.every(record => record.evidenceStatus === 'unverified_fixture'));
});
