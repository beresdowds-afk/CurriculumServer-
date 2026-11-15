import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ControlPlaneRepository } from './controlPlaneRepository';
import { PostgresRuntime } from './postgres';
import { inspectPlatformReadiness } from './readiness';
import { createVerifiedTenantPrincipal, withControlPlaneTransaction, withTenantTransaction } from './tenantContext';

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled = process.env.DATABASE_TEST_DISPOSABLE === '1' && Boolean(databaseUrl);

function principal(tenantId: string, role = 'tenant_admin') {
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

test('disposable PostgreSQL persists lifecycle records and enforces tenant RLS', { skip: !enabled }, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const repository = new ControlPlaneRepository(pool);
  const tenantA = `test-a-${randomUUID()}`;
  const tenantB = `test-b-${randomUUID()}`;
  const admin = principal('integration-test-admin', 'super_admin');

  try {
    const readiness = await inspectPlatformReadiness(pool, true);
    assert.equal(readiness.ready, false, 'tenant-sensitive readiness must stay blocked without a trusted identity verifier');
    assert.equal(readiness.database.rlsPoliciesAvailable, true);
    assert.equal(readiness.database.trustedTenantContextAvailable, false);
    assert.equal(readiness.database.tenantSecurityAvailable, false);
    const role = await pool.query<{ rolbypassrls: boolean }>(
      'SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user'
    );
    assert.equal(role.rows[0]?.rolbypassrls, false, 'runtime identity must not have BYPASSRLS');

    const tenantAPrincipal = principal(tenantA);
    const tenantBPrincipal = principal(tenantB);
    await withTenantTransaction(pool, tenantAPrincipal, client =>
      client.query(
        `INSERT INTO curriculum_flow.students (tenant_id, admission_number, first_name, last_name, class_group, record_origin)
         VALUES ($1, $2, 'Student', 'A', 'Grade 7', 'application')`,
        [tenantA, `adm-${randomUUID()}`]
      )
    );
    await withTenantTransaction(pool, tenantBPrincipal, client =>
      client.query(
        `INSERT INTO curriculum_flow.students (tenant_id, admission_number, first_name, last_name, class_group, record_origin)
         VALUES ($1, $2, 'Student', 'B', 'Grade 7', 'application')`,
        [tenantB, `adm-${randomUUID()}`]
      )
    );
    const flowStudents = await repository.listFlowStudents(tenantAPrincipal);
    assert.equal(flowStudents.length, 1);
    assert.equal(flowStudents[0].fullName, 'Student A');
    assert.equal(flowStudents[0].tenantId, tenantA);

    const customerA = await repository.createCustomer(tenantAPrincipal, {
      name: 'Tenant A', email: `${tenantA}@test.invalid`
    });
    const customerB = await repository.createCustomer(tenantBPrincipal, {
      name: 'Tenant B', email: `${tenantB}@test.invalid`
    });
    const organisationA = await repository.createOrganisation(tenantAPrincipal, {
      customerId: customerA.id, name: 'Tenant A School'
    });
    const instanceA = await repository.createInstance(tenantAPrincipal, {
      organisationId: organisationA.id, name: 'Tenant A Flow', tenantSlug: tenantA
    });

    const request = await repository.createProvisioningRequest(tenantAPrincipal, {
      idempotencyKey: `request-${tenantA}`,
      requestedBy: 'test-actor',
      correlationId: `correlation-${tenantA}`,
      payload: { requestedTier: 'pro', architecture: { strategy: 'shared' }, tenantId: tenantB }
    });
    const replay = await repository.createProvisioningRequest(tenantAPrincipal, {
      idempotencyKey: `request-${tenantA}`,
      requestedBy: 'test-actor',
      correlationId: `different-correlation-${tenantA}`,
      payload: { architecture: { strategy: 'shared' }, tenantId: tenantB, requestedTier: 'pro' }
    });
    assert.equal(replay.id, request.id);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(request.tenant_id, tenantA, 'request body tenant identifiers cannot override verified context');

    const job = await repository.createProvisioningJob(tenantAPrincipal, {
      instanceId: instanceA.id,
      jobType: 'integration-test',
      idempotencyKey: `job-${tenantA}`,
      correlationId: `job-correlation-${tenantA}`,
      payload: { requested: true }
    });
    const changedJob = await repository.transitionProvisioningJob(
      tenantAPrincipal, job.id, Number(job.version), 'running'
    );
    assert.equal(Number(changedJob.version), Number(job.version) + 1);
    await repository.appendAuditEvent(tenantAPrincipal, {
      actorEmail: 'integration@test.invalid',
      action: 'integration_test',
      correlationId: `audit-${tenantA}`,
      outcome: 'success'
    });

    assert.equal(await repository.getCustomer(tenantAPrincipal, customerB.id), undefined);
    const crossTenantUpdate = await withTenantTransaction(pool, tenantAPrincipal, client =>
      client.query('UPDATE control_plane.customers SET name = $1 WHERE id = $2 RETURNING id', ['tampered', customerB.id])
    );
    assert.equal(crossTenantUpdate.rowCount, 0);
    await assert.rejects(withTenantTransaction(pool, tenantAPrincipal, client =>
      client.query(
        `INSERT INTO control_plane.customers (tenant_id, name, email)
         VALUES ($1, 'Cross Tenant', $2)`,
        [tenantB, `forbidden-${randomUUID()}@test.invalid`]
      )
    ), /row-level security policy/);

    const tenantSetting = await pool.query<{ tenant_id: string | null }>(
      "SELECT current_setting('app.tenant_id', true) AS tenant_id"
    );
    assert.ok(!tenantSetting.rows[0]?.tenant_id, 'transaction-scoped tenant context must not leak to a reused connection');

    await assert.rejects(withTenantTransaction(pool, tenantAPrincipal, async client => {
      await client.query('UPDATE control_plane.customers SET name = $1 WHERE id = $2', ['Rolled back', customerA.id]);
      throw new Error('test rollback');
    }), /test rollback/);
    const rollbackProbe = await withControlPlaneTransaction(pool, admin, client =>
      client.query('SELECT name FROM control_plane.customers WHERE id = $1', [customerA.id])
    );
    assert.equal(rollbackProbe.rows[0]?.name, 'Tenant A');

    await assert.rejects(
      withTenantTransaction(pool, undefined as never, async () => undefined),
      /verified tenant security context/
    );
  } finally {
    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query('DELETE FROM curriculum_flow.students WHERE tenant_id = $1', [tenantA]);
      await client.query('DELETE FROM curriculum_flow.students WHERE tenant_id = $1', [tenantB]);
      for (const table of [
        'resource_verification_evidence',
        'resource_configurations',
        'approval_records',
        'piam_authorizations',
        'provisioning_requests',
        'provisioning_job_attempts',
        'provisioning_jobs',
        'audit_logs',
        'instances',
        'organisations',
        'customers'
      ]) {
        await client.query(`DELETE FROM control_plane.${table} WHERE tenant_id = $1`, [tenantA]);
        await client.query(`DELETE FROM control_plane.${table} WHERE tenant_id = $1`, [tenantB]);
      }
    }).finally(() => runtime.close());
  }
});
