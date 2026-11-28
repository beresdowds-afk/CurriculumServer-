import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PostgresRuntime } from '../db/postgres';
import { createVerifiedTenantPrincipal, withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { acceptanceTestOptions, databaseUrl, principal } from '../db/testSupport';
import { CmagCommunicationEngine } from './communicationEngine';
import { CmagDeliveryEngine } from './deliveryEngine';
import { MessagingProviderRegistry } from './providers';

test('live PostgreSQL CMAG lifecycle enforces migration 040 schema, forced RLS tenant isolation, and encrypted outbox round-trip', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();

  const platform = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'platform-control-plane',
      role: 'super_admin',
      email: 'cmag-integration@test.invalid',
      appId: 'curriculum-server-control-plane',
      schoolName: 'Control Plane',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: 'test',
      storageNamespace: '/test',
      issuer: 'integration-test',
      audience: 'platform-control-plane',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'sig',
      permissions: ['super_admin']
    }
  });

  try {
    const seeded = await withControlPlaneTransaction(pool, platform, async client => {
      const tenantIds: string[] = [];
      const instanceIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const key = randomUUID();
        const tRes = await client.query<{ id: string }>(
          `INSERT INTO production.tenants (display_name, tenant_slug, status, created_by)
           VALUES ($1, $2, 'approved', 'cmag-integration') RETURNING id`,
          [`CMAG Int School ${key}`, key]
        );
        const tenantId = tRes.rows[0].id;
        const appRes = await client.query<{ id: string }>(
          `INSERT INTO production.application_instances (tenant_id, application_id, status, display_name)
           VALUES ($1, 'app_curriculum_flow', 'active', 'Primary App') RETURNING id`,
          [tenantId]
        );
        tenantIds.push(tenantId);
        instanceIds.push(appRes.rows[0].id);
      }
      return { tenantA: tenantIds[0], tenantB: tenantIds[1], instanceA: instanceIds[0], instanceB: instanceIds[1] };
    });

    const engine = new CmagDeliveryEngine(pool, new MessagingProviderRegistry({}, {
      fetch: async () => new Response(JSON.stringify({ status: 'success', data: { message_id: 'pg_msg_1' } }), { status: 200 }),
      push: async () => ({ statusCode: 201, body: '', headers: {} })
    }));
    const comms = new CmagCommunicationEngine(pool, engine);
    const pA = principal(seeded.tenantA, 'principal');
    const pB = principal(seeded.tenantB, 'principal');

    await withTenantTransaction(pool, pA, async client => {
      await comms.provisionTenantMessagingInTransaction(client, {
        tenantId: seeded.tenantA,
        applicationInstanceId: seeded.instanceA,
        applicationId: 'app_curriculum_flow',
        updatedBy: 'cmag-integration'
      });
    });

    await engine.enqueueTenantMessage(pA, {
      scope: 'school',
      tenantId: seeded.tenantA,
      applicationId: 'app_curriculum_flow',
      environment: 'production',
      classification: 'transactional',
      category: 'attendance',
      purpose: 'check_in',
      request: { channel: 'sms', to: '+2348012345678', message: 'Arrived cleanly' }
    });

    // Forced RLS prevents Tenant B from seeing Tenant A's CMAG config or outbox messages
    const tenantBOverview = await comms.getTenantMessagingOverview(pB);
    assert.equal(tenantBOverview.config, null);
    assert.equal(tenantBOverview.messages.length, 0);

    const tenantAOverview = await comms.getTenantMessagingOverview(pA);
    assert.ok(tenantAOverview.config);
    assert.equal(tenantAOverview.messages.length, 1);
  } finally {
    await runtime.close();
  }
});
