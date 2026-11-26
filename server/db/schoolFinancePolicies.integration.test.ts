import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { PostgresRuntime } from './postgres';
import { SchoolFinancePolicies } from './schoolFinancePolicies';
import { SchoolSettlementAccounts } from './schoolSettlementAccounts';
import { createSettlementProviderAdapters } from './settlementProviderAdapters';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { acceptanceTestOptions, principal } from './testSupport';

test('fee policy versions, effective resolution, supersession, and settlement account lifecycle persist with RLS', acceptanceTestOptions, async () => {
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

  const prevEnv = {
    STORAGE_VAULT_KEYS: process.env.STORAGE_VAULT_KEYS,
    STORAGE_VAULT_ACTIVE_KEY_ID: process.env.STORAGE_VAULT_ACTIVE_KEY_ID,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
  };
  process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });
  process.env.STORAGE_VAULT_ACTIVE_KEY_ID = 'test';
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_pg_acceptance_secret';

  const fakeFetch: typeof fetch = (async (url: string | URL | Request) => {
    const target = String(url);
    if (target.includes('/bank/resolve')) {
      return new Response(JSON.stringify({ status: true, data: { account_name: 'TEST SCHOOL ACCOUNT' } }), { status: 200 });
    }
    if (target.includes('/transferrecipient')) {
      return new Response(JSON.stringify({ status: true, data: { recipient_code: 'RCP_PG_123' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ status: false, message: 'unexpected' }), { status: 400 });
  }) as typeof fetch;

  const settlement = new SchoolSettlementAccounts(pool, createSettlementProviderAdapters(fakeFetch));

  const grants = [PERMISSIONS.schoolFinancePoliciesRead, PERMISSIONS.schoolFinancePoliciesCreate];
  const actor = (index: number, role: string, permissions: string[], scopes: Array<{ resourceType: string; resourceId: string }> = []) =>
    createAuthorizedPrincipal({
      tenant: principal(tenantIds[index]),
      userId: users[index],
      sessionId: randomUUID(),
      grants: [{ roleCode: role, permissions, scopes }]
    });
  const bursarA = actor(0, 'bursar', grants);
  const principalA = actor(0, 'principal_administrator', [
    ...grants,
    PERMISSIONS.schoolFinancePoliciesApprove,
    PERMISSIONS.schoolFinancePoliciesSupersede
  ]);
  const bursarB = actor(1, 'bursar', grants);
  const input = {
    academicSession: '2026/2027',
    term: 'First term',
    effectiveDate: '2026-09-01',
    currency: 'NGN',
    items: [{
      name: 'Tuition',
      category: 'tuition',
      amountMinor: 1250000,
      compulsory: true,
      grade: 'JSS 1',
      classId: classIds[0],
      residence: 'all'
    }]
  };

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
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, 'Finance test') RETURNING id`,
          [tenantIds[i]]
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
           VALUES ($1, $2, 'finance-test', '1', 'active')`,
          [tenantIds[i], schoolIds[i]]
        );
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, 'Finance user', 'test-hash', now())`,
          [users[i], `${users[i]}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
           VALUES ($1, $2, $3, 'staff')`,
          [tenantIds[i], users[i], users[i]]
        );
        await client.query(
          `INSERT INTO production.classes (tenant_id, school_id, id, name, academic_year)
           VALUES ($1, $2, $3, 'Test class', '2026/2027')`,
          [tenantIds[i], schoolIds[i], classIds[i]]
        );
      }
    });

    assert.deepEqual((await service.listSchools(bursarA)).map(school => school.id), [schoolIds[0]]);
    const [first, second] = await Promise.all([
      service.create(bursarA, schoolIds[0], input),
      service.create(bursarA, schoolIds[0], { ...input, effectiveDate: '2026-09-15', items: [{ ...input.items[0], amountMinor: 2000000 }] })
    ]);
    assert.notEqual(first, second);
    const versions = await service.list(bursarA, schoolIds[0]);
    assert.deepEqual(versions.map(p => p.version).sort(), [1, 2]);
    assert.deepEqual(versions.map(p => p.items[0].amountMinor).sort((a, b) => a - b), [1250000, 2000000]);

    const noneBeforeApproval = await service.resolveEffectivePolicy(bursarA, schoolIds[0], {
      academicSession: '2026/2027', term: 'First term', asOfDate: '2026-09-20'
    });
    assert.equal(noneBeforeApproval.status, 'NO_EFFECTIVE_APPROVED_POLICY');

    await assert.rejects(service.approve(bursarA, schoolIds[0], first), /FORBIDDEN/);
    await assert.rejects(service.approve(
      actor(0, 'tenant_admin', [PERMISSIONS.schoolFinancePoliciesApprove]), schoolIds[0], first
    ), /FORBIDDEN/);

    await service.approve(principalA, schoolIds[0], first);
    await service.approve(principalA, schoolIds[0], second);
    await assert.rejects(service.approve(principalA, schoolIds[0], first), /already approved/);
    assert.equal((await service.list(bursarA, schoolIds[0])).find(p => p.id === first)?.approved_by, users[0]);

    const effectiveSept5 = await service.resolveEffectivePolicy(bursarA, schoolIds[0], {
      academicSession: '2026/2027', term: 'First term', asOfDate: '2026-09-05'
    });
    assert.equal(effectiveSept5.effectivePolicy?.id, first);

    await service.supersede(principalA, schoolIds[0], first, {
      action: 'superseded',
      supersededByPolicyId: second,
      reason: 'Superseded by mid-September fee update'
    });
    const effectiveSept20 = await service.resolveEffectivePolicy(bursarA, schoolIds[0], {
      academicSession: '2026/2027', term: 'First term', asOfDate: '2026-09-20'
    });
    assert.equal(effectiveSept20.effectivePolicy?.id, second);

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

    // Settlement workflow + lifecycle persistence
    const principalActor = actor(0, 'principal', [
      PERMISSIONS.schoolFinanceSettlementRead,
      PERMISSIONS.schoolFinanceSettlementRequest,
      PERMISSIONS.schoolFinanceSettlementVerify
    ]);
    const proprietor = actor(0, 'proprietor', [
      PERMISSIONS.schoolFinanceSettlementRead,
      PERMISSIONS.schoolFinanceSettlementApprove,
      PERMISSIONS.schoolFinanceSettlementVerify,
      PERMISSIONS.schoolFinanceSettlementManage
    ]);
    const bank = {
      provider: 'paystack', bankName: 'Test bank', bankCode: '999', accountName: 'Test School',
      accountNumber: '1234567890'
    };
    await assert.rejects(settlement.request(bursarA, schoolIds[0], bank), /FORBIDDEN/);
    delete process.env.STORAGE_VAULT_KEYS;
    await assert.rejects(settlement.request(principalActor, schoolIds[0], bank), /vault key configuration/i);
    process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });

    const requestId = await settlement.request(principalActor, schoolIds[0], bank);
    await settlement.approve(proprietor, schoolIds[0], requestId);
    const verified = await settlement.verify(principalActor, schoolIds[0], requestId, 'pg-verify-1');
    assert.equal(verified.state, 'verified');
    assert.equal(verified.has_provider_reference, true);

    await settlement.activate(proprietor, schoolIds[0], requestId);
    const active = await settlement.getActiveSettlementAccount(proprietor, schoolIds[0]);
    assert.equal(active?.id, requestId);
    assert.equal(active?.is_default, true);

    const request2Id = await settlement.request(principalActor, schoolIds[0], bank);
    await settlement.approve(proprietor, schoolIds[0], request2Id);
    const cbRaw = Buffer.from(JSON.stringify({ event: 'transferrecipient.verified', data: { status: 'verified', recipient_code: 'RCP_CB_2' } }), 'utf8');
    const cbSig = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(cbRaw).digest('hex');
    const cbResult = await settlement.handleVerificationCallback(proprietor, schoolIds[0], request2Id, {
      rawBody: cbRaw,
      headers: { 'x-paystack-signature': cbSig },
      payload: JSON.parse(cbRaw.toString('utf8')),
      idempotencyKey: 'pg-cb-2'
    });
    assert.equal(cbResult.state, 'verified');

    await settlement.replace(proprietor, schoolIds[0], requestId, { replacementRequestId: request2Id, reason: 'Rotating settlement account' });
    const allSettlements = await settlement.list(proprietor, schoolIds[0]);
    assert.equal(allSettlements.find(s => s.id === requestId)?.state, 'replaced');
    assert.equal(allSettlements.find(s => s.id === request2Id)?.state, 'active');

    await settlement.suspend(proprietor, schoolIds[0], request2Id, { reason: 'Temporary bank maintenance' });
    assert.equal((await settlement.list(proprietor, schoolIds[0])).find(s => s.id === request2Id)?.state, 'suspended');
    await settlement.revoke(proprietor, schoolIds[0], request2Id, { reason: 'Closed bank account' });
    assert.equal((await settlement.list(proprietor, schoolIds[0])).find(s => s.id === request2Id)?.state, 'revoked');

    const events = await settlement.events(proprietor, schoolIds[0], request2Id);
    assert.ok(events.length >= 5);
    assert.ok(!JSON.stringify(events).includes(bank.accountNumber));
  } finally {
    await runtime.close();
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
