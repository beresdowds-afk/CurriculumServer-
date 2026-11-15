import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { runMigrations } from './migrate';
import { closeDatabasePool, getDatabasePool, withTenantTransaction } from './pool';
import { TenantInstanceRepository } from './tenantInstanceRepository';

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const runtimeUrl = process.env.TEST_DATABASE_URL;
let adminPool: Pool | undefined;

after(async () => {
  await closeDatabasePool();
  await adminPool?.query(
    `DELETE FROM production.tenants
     WHERE id = ANY($1::uuid[])`,
    [[
      'a0a00000-0000-4000-8000-000000000001',
      'b0b00000-0000-4000-8000-000000000002',
      'c0c00000-0000-4000-8000-000000000003'
    ]]
  );
  await adminPool?.end();
});

test('PostgreSQL tenant repositories persist data with transaction-local RLS isolation', {
  skip: !migrationUrl || !runtimeUrl
}, async () => {
  const migrationDatabase = new URL(migrationUrl!);
  const runtimeDatabase = new URL(runtimeUrl!);
  const databaseName = migrationDatabase.pathname.slice(1);
  if (!/(^|[_-])(test|testing|tmp)([_-]|$)/i.test(databaseName) ||
      migrationDatabase.hostname !== runtimeDatabase.hostname ||
      migrationDatabase.port !== runtimeDatabase.port ||
      migrationDatabase.pathname !== runtimeDatabase.pathname) {
    throw new Error('PostgreSQL integration tests require the same explicitly named disposable test database for both URLs.');
  }

  await runMigrations();
  adminPool = new Pool({ connectionString: migrationUrl });

  await adminPool.query(`
    GRANT USAGE ON SCHEMA production TO curriculum_runtime;
    GRANT SELECT ON production.tenants TO curriculum_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON production.instances TO curriculum_runtime
  `);

  const tenantA = 'a0a00000-0000-4000-8000-000000000001';
  const tenantB = 'b0b00000-0000-4000-8000-000000000002';
  const pendingTenant = 'c0c00000-0000-4000-8000-000000000003';
  const organizationA = 'a0a00000-0000-4000-8000-000000000011';
  const organizationB = 'b0b00000-0000-4000-8000-000000000022';
  await adminPool.query(
    'DELETE FROM production.tenants WHERE id = ANY($1::uuid[])',
    [[tenantA, tenantB, pendingTenant]]
  );
  await adminPool.query(
    `INSERT INTO production.tenants (id, display_name, status)
     VALUES ($1, 'Synthetic test tenant A', 'approved'),
            ($2, 'Synthetic test tenant B', 'approved'),
            ($3, 'Synthetic pending tenant', 'pending')
     ON CONFLICT (id) DO NOTHING`,
    [tenantA, tenantB, pendingTenant]
  );
  await adminPool.query(
    `INSERT INTO production.organizations (tenant_id, id, name)
     VALUES ($1, $2, 'Test org A'), ($3, $4, 'Test org B')
     ON CONFLICT (tenant_id, id) DO NOTHING`,
    [tenantA, organizationA, tenantB, organizationB]
  );

  process.env.DATABASE_URL = runtimeUrl;
  const repository = new TenantInstanceRepository();
  const instance = await repository.create(tenantA, {
    organizationId: organizationA,
    name: 'Synthetic instance'
  });
  const instanceB = await repository.create(tenantB, {
    organizationId: organizationB,
    name: 'Synthetic tenant B instance'
  });
  assert.equal(instance.tenantId, tenantA);
  assert.equal(instance.status, 'requested');
  await assert.rejects(withTenantTransaction(tenantA, client =>
    client.query(
      `INSERT INTO production.instances
         (tenant_id, organization_id, instance_name, record_origin)
       VALUES ($1, $2, 'Demo promotion attempt', 'demonstration')`,
      [tenantA, organizationA]
    )
  ));

  const statusUpdated = await repository.updateStatus(tenantA, instance.id, 'approved');
  assert.equal(statusUpdated?.status, 'approved');
  assert.equal(await repository.updateStatus(tenantA, instanceB.id, 'active'), undefined);
  assert.deepEqual((await repository.list(tenantB)).map(row => row.id), [instanceB.id]);

  const unfilteredRows = await withTenantTransaction(tenantA, client =>
    client.query('SELECT id FROM production.instances')
  );
  assert.deepEqual(unfilteredRows.rows.map(row => row.id), [instance.id]);

  await assert.rejects(
    repository.create(tenantA, { organizationId: organizationB, name: 'Cross-tenant reference' })
  );
  await assert.rejects(
    withTenantTransaction(tenantA, async client => {
      await client.query(
        `INSERT INTO production.instances (tenant_id, organization_id, instance_name)
         VALUES ($1, $2, 'Rolled back instance')`,
        [tenantA, organizationA]
      );
      throw new Error('forced rollback');
    }),
    /forced rollback/
  );
  assert.equal((await repository.list(tenantA)).length, 1);

  await assert.rejects(repository.list('not-a-tenant'), /valid authenticated tenant identity/);
  await assert.rejects(
    repository.list(pendingTenant),
    /not approved or is unavailable/
  );

  const transactionSetting = await withTenantTransaction(tenantA, async client => {
    const result = await client.query<{ tenant_id: string }>(
      "SELECT current_setting('app.tenant_id', true) AS tenant_id"
    );
    return result.rows[0].tenant_id;
  });
  assert.equal(transactionSetting, tenantA);
  const pooledSetting = await getDatabasePool().query<{ tenant_id: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS tenant_id"
  );
  assert.ok(!pooledSetting.rows[0].tenant_id);

  await closeDatabasePool();
  const afterRestart = new TenantInstanceRepository();
  assert.equal((await afterRestart.list(tenantA)).length, 1);
  assert.equal(await afterRestart.delete(tenantA, instance.id), true);
  assert.deepEqual(await afterRestart.list(tenantA), []);

  await closeDatabasePool();
  const configuredUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  await assert.rejects(afterRestart.list(tenantA), /DATABASE_URL is not configured/);

  process.env.DATABASE_URL = migrationUrl;
  await assert.rejects(
    afterRestart.list(tenantA),
    /must not be a superuser, bypass RLS, or own production tables/
  );
  await closeDatabasePool();
  process.env.DATABASE_URL = configuredUrl;
});
