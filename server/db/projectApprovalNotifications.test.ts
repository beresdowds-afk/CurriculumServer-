import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PostgresRuntime } from './postgres';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { acceptanceTestOptions, databaseUrl, principal } from './testSupport';
import {
  ProjectApprovalNotificationRepository,
  validateProjectApprovalNotification,
  type ProjectApprovalNotification
} from '../projectApprovalNotifications';

function notification(): ProjectApprovalNotification {
  return {
    requestId: randomUUID(),
    tenantId: randomUUID(),
    projectId: 'sample-project',
    operation: 'create_customer_project',
    contractHash: 'a'.repeat(64),
    authorityReference: 'example-authority',
    eventId: randomUUID(),
    claimedStatus: 'APPROVED',
    eventTimestamp: '2026-01-01T00:00:00.000Z'
  };
}

test('notification validation rejects malformed scope, statuses and timestamps', () => {
  const valid = notification();
  assert.deepEqual(validateProjectApprovalNotification(valid), valid);
  for (const invalid of [
    { ...valid, tenantId: 'not-a-uuid' },
    { ...valid, contractHash: 'bad' },
    { ...valid, operation: 'provision_database' },
    { ...valid, claimedStatus: 'VERIFIED' },
    { ...valid, eventTimestamp: '2026-01-01' },
    { ...valid, unexpected: true },
    { ...valid, authorityReference: undefined }
  ]) {
    assert.throws(() => validateProjectApprovalNotification(invalid));
  }
});

test('disposable PostgreSQL records scoped unverified notifications idempotently', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const admin = principal('notification-test-admin', 'super_admin');
  const event = notification();
  const repository = new ProjectApprovalNotificationRepository(pool, admin);
  const { eventId: _eventId, claimedStatus: _claimedStatus, eventTimestamp: _eventTimestamp, ...scope } = event;
  try {
    await withControlPlaneTransaction(pool, admin, client => client.query(
      `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by)
       VALUES ($1, $2, $3, $4)`,
      [event.tenantId, 'Notification test', `test-${event.tenantId}`, 'integration-test']
    ));
    assert.equal(await repository.register(scope), 'registered');
    assert.equal(await repository.register(scope), 'duplicate');
    await assert.rejects(repository.register({ ...scope, projectId: 'other-project' }), /REQUEST_CONFLICT/);
    const results = await Promise.all(Array.from({ length: 5 }, () => repository.record(event)));
    assert.equal(results.filter(result => result === 'recorded_unverified').length, 1);
    assert.equal(results.filter(result => result === 'duplicate').length, 4);
    await assert.rejects(repository.record({ ...event, claimedStatus: 'REVOKED' }), /EVENT_CONFLICT/);
    for (const changed of [
      { tenantId: randomUUID() }, { projectId: 'other-project' },
      { contractHash: 'b'.repeat(64) }, { authorityReference: 'other-authority' }
    ]) {
      await assert.rejects(repository.record({ ...event, eventId: randomUUID(), ...changed }), /SCOPE_MISMATCH/);
    }

    // Arrival order does not determine the current approval: all claims remain unverified.
    for (const claimedStatus of ['REVOKED', 'EXPIRED', 'APPROVED'] as const) {
      assert.equal(await repository.record({ ...event, eventId: randomUUID(), claimedStatus }), 'recorded_unverified');
    }
    const rows = await withControlPlaneTransaction(pool, admin, client => client.query(
      'SELECT claimed_status FROM production.project_approval_notifications WHERE request_id = $1',
      [event.requestId]
    ));
    assert.equal(rows.rowCount, 4);
    const tenantRows = await withTenantTransaction(pool, principal(event.tenantId), client => client.query(
      'SELECT * FROM production.project_approval_notifications WHERE request_id = $1',
      [event.requestId]
    ));
    assert.equal(tenantRows.rowCount, 0);
  } finally {
    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query('DELETE FROM production.project_approval_notifications WHERE request_id = $1', [event.requestId]);
      await client.query('DELETE FROM production.project_approval_requests WHERE request_id = $1', [event.requestId]);
      await client.query('DELETE FROM production.tenants WHERE id = $1', [event.tenantId]);
    });
    await runtime.close();
  }
});
