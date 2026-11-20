import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { PostgresRuntime } from './postgres';
import { SchoolFinancePolicies } from './schoolFinancePolicies';
import { SchoolSettlementAccounts } from './schoolSettlementAccounts';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { acceptanceTestOptions, principal } from './testSupport';

test('fee policy versions persist, require principal approval, and isolate tenants', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const tenantIds = [randomUUID(), randomUUID()];
  const schoolIds = [randomUUID(), randomUUID()];
  const classIds = [randomUUID(), randomUUID()];
  const users = [randomUUID(), randomUUID()];
  const service = new SchoolFinancePolicies(pool);
  const settlement = new SchoolSettlementAccounts(pool);
  const grants = [PERMISSIONS.schoolFinancePoliciesRead, PERMISSIONS.schoolFinancePoliciesCreate];
  const actor = (index: number, role: string, permissions: string[]) => createAuthorizedPrincipal({
    tenant: principal(tenantIds[index]), userId: users[index], sessionId: randomUUID(),
    grants: [{ roleCode: role, permissions, scopes: [] }]
  });
  const bursarA = actor(0, 'bursar', grants);
  const principalA = actor(0, 'principal_administrator', [...grants, PERMISSIONS.schoolFinancePoliciesApprove]);
  const bursarB = actor(1, 'bursar', grants);
  const input = {
    academicSession: '2026/2027', term: 'First term', effectiveDate: '2026-09-01', currency: 'NGN',
    items: [{ name: 'Tuition', category: 'tuition', amountMinor: 1250000, compulsory: true,
      grade: 'JSS 1', classId: classIds[0], residence: 'all' }]
  };
  const originalVaultKeys = process.env.STORAGE_VAULT_KEYS;
  const originalVaultKeyId = process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
  process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });
  process.env.STORAGE_VAULT_ACTIVE_KEY_ID = 'test';
  try {
    const role = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
    );
    assert.equal(role.rows[0].rolsuper, false);
    assert.equal(role.rows[0].rolbypassrls, false);
    await withControlPlaneTransaction(pool, principal(randomUUID(), 'super_admin'), async client => {
      for (let i = 0; i < tenantIds.length; i++) {
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, 'Finance test', $2, 'acceptance-test', 'approved')`,
          [tenantIds[i], `finance-${tenantIds[i]}`]
        );
        const org = await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, 'Finance test') RETURNING id`, [tenantIds[i]]
        );
        await client.query(
          `INSERT INTO production.schools
            (tenant_id, organization_id, id, name, short_name, school_slug, official_contact_email)
           VALUES ($1, $2, $3, 'Finance test', 'Finance', $4, $5)`,
          [tenantIds[i], org.rows[0].id, schoolIds[i], `finance-${schoolIds[i]}`, `${schoolIds[i]}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, configuration_version, status)
           VALUES ($1, $2, 'finance-test', '1', 'active')`, [tenantIds[i], schoolIds[i]]
        );
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, 'Finance user', 'test-hash', now())`, [users[i], `${users[i]}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
           VALUES ($1, $2, $3, 'staff')`, [tenantIds[i], users[i], users[i]]
        );
        await client.query(
          `INSERT INTO production.classes (tenant_id, school_id, id, name, academic_year)
           VALUES ($1, $2, $3, 'Test class', '2026/2027')`, [tenantIds[i], schoolIds[i], classIds[i]]
        );
      }
    });

    assert.deepEqual((await service.listSchools(bursarA)).map(school => school.id), [schoolIds[0]]);
    const [first, second] = await Promise.all([
      service.create(bursarA, schoolIds[0], input),
      service.create(bursarA, schoolIds[0], { ...input, items: [{ ...input.items[0], amountMinor: 2000000 }] })
    ]);
    assert.notEqual(first, second);
    const versions = await service.list(bursarA, schoolIds[0]);
    assert.deepEqual(versions.map(p => p.version).sort(), [1, 2]);
    assert.deepEqual(versions.map(p => p.items[0].amountMinor).sort((a, b) => a - b), [1250000, 2000000]);
    await assert.rejects(service.approve(bursarA, schoolIds[0], first), /FORBIDDEN/);
    await assert.rejects(service.approve(
      actor(0, 'tenant_admin', [PERMISSIONS.schoolFinancePoliciesApprove]), schoolIds[0], first
    ), /FORBIDDEN/);
    await service.approve(principalA, schoolIds[0], first);
    await assert.rejects(service.approve(principalA, schoolIds[0], first), /already approved/);
    assert.equal((await service.list(bursarA, schoolIds[0])).find(p => p.id === first)?.approved_by, users[0]);
    await assert.rejects(service.list(bursarB, schoolIds[0]), /not found/);
    await assert.rejects(service.create(bursarA, schoolIds[0], {
      ...input, items: [{ ...input.items[0], classId: classIds[1] }]
    }), /not in this school/);
    await assert.rejects(withTenantTransaction(pool, bursarA.tenant, client =>
      client.query(`UPDATE school_finance.fee_policies SET currency = 'USD' WHERE id = $1`, [first])
    ), /immutable/);
    await assert.rejects(withTenantTransaction(pool, bursarA.tenant, client =>
      client.query(`DELETE FROM school_finance.fee_policy_approvals WHERE policy_id = $1`, [first])
    ), /immutable/);
    const unscoped = await pool.query('SELECT id FROM school_finance.fee_policies');
    assert.equal(unscoped.rowCount, 0);
    const otherTenant = await withTenantTransaction(pool, bursarB.tenant, client =>
      client.query('SELECT id FROM school_finance.fee_policies WHERE id = $1', [first])
    );
    assert.equal(otherTenant.rowCount, 0);

    const principalActor = actor(0, 'principal', [
      PERMISSIONS.schoolFinanceSettlementRead, PERMISSIONS.schoolFinanceSettlementRequest
    ]);
    const proprietor = actor(0, 'proprietor', [
      PERMISSIONS.schoolFinanceSettlementRead, PERMISSIONS.schoolFinanceSettlementApprove
    ]);
    const bank = {
      provider: 'paystack', bankName: 'Test bank', bankCode: '999', accountName: 'Test School',
      accountNumber: '1234567890'
    };
    await assert.rejects(settlement.request(bursarA, schoolIds[0], bank), /FORBIDDEN/);
    delete process.env.STORAGE_VAULT_KEYS;
    await assert.rejects(settlement.request(principalActor, schoolIds[0], bank), /vault key configuration/i);
    assert.equal((await settlement.list(proprietor, schoolIds[0])).length, 0);
    process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });
    const requestId = await settlement.request(principalActor, schoolIds[0], bank);
    const pending = await settlement.list(proprietor, schoolIds[0]);
    assert.equal(pending[0].approved_at, null);
    assert.equal(pending[0].account_last_four, '7890');
    assert.ok(!JSON.stringify(pending).includes(bank.accountNumber));
    const stored = await withTenantTransaction(pool, principalActor.tenant, client =>
      client.query<{ encrypted_details: string }>(
        'SELECT encrypted_details FROM school_finance.settlement_account_requests WHERE id = $1', [requestId]
      )
    );
    assert.ok(!stored.rows[0].encrypted_details.includes(bank.accountNumber));
    await assert.rejects(settlement.details(bursarA, schoolIds[0], requestId), /FORBIDDEN/);
    assert.deepEqual(await settlement.details(proprietor, schoolIds[0], requestId), {
      bankName: bank.bankName, bankCode: bank.bankCode, accountName: bank.accountName, accountNumber: bank.accountNumber
    });
    await assert.rejects(settlement.approve(principalActor, schoolIds[0], requestId), /FORBIDDEN/);
    await settlement.approve(proprietor, schoolIds[0], requestId);
    assert.equal((await settlement.list(proprietor, schoolIds[0]))[0].approved_by, users[0]);
    await assert.rejects(settlement.approve(proprietor, schoolIds[0], requestId), /already approved/);
    await assert.rejects(withTenantTransaction(pool, principalActor.tenant, client =>
      client.query('UPDATE school_finance.settlement_account_requests SET provider = $2 WHERE id = $1', [requestId, 'opay'])
    ), /immutable/);
    await assert.rejects(withTenantTransaction(pool, principalActor.tenant, client =>
      client.query('DELETE FROM school_finance.settlement_account_approvals WHERE request_id = $1', [requestId])
    ), /immutable/);
    const otherPrincipal = actor(1, 'principal', [PERMISSIONS.schoolFinanceSettlementRead]);
    await assert.rejects(settlement.details(otherPrincipal, schoolIds[0], requestId), /not found/);
    const readAudit = await withTenantTransaction(pool, principalActor.tenant, client =>
      client.query<{ details: Record<string, unknown> }>(
        `SELECT details FROM production.audit_events WHERE tenant_id = $1
         AND action = 'school_settlement_account_details_read' AND details->>'requestId' = $2`,
        [tenantIds[0], requestId]
      )
    );
    assert.equal(readAudit.rowCount, 1);
    assert.ok(!JSON.stringify(readAudit.rows).includes(bank.accountNumber));
  } finally {
    // The test requires a disposable database: policy and approval rows are immutable.
    await runtime.close();
    if (originalVaultKeys === undefined) delete process.env.STORAGE_VAULT_KEYS;
    else process.env.STORAGE_VAULT_KEYS = originalVaultKeys;
    if (originalVaultKeyId === undefined) delete process.env.STORAGE_VAULT_ACTIVE_KEY_ID;
    else process.env.STORAGE_VAULT_ACTIVE_KEY_ID = originalVaultKeyId;
  }
});
