import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { PostgresRuntime } from '../db/postgres';
import { acceptanceTestOptions, databaseUrl, principal } from '../db/testSupport';
import { createVerifiedTenantPrincipal, withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { AttendanceProvisioningRepository } from './attendanceProvisioningRepository';
import { createAttendanceProvisioningRouter } from './provisioningRoutes';

test('attendance provisioning requests are durable, idempotent and tenant isolated', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const platform = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'control-plane', role: 'super_admin', email: 'attendance-admin@test.invalid',
      appId: 'curriculum-flow', schoolName: 'Test', subscriptionTier: 'test',
      status: 'ACTIVE', databaseName: 'test', storageNamespace: '/test',
      issuer: 'integration-test', audience: 'test', issuedAt: 1, expiresAt: 2,
      tokenSignature: 'test-signature', permissions: []
    }
  });
  const repository = new AttendanceProvisioningRepository(pool);
  try {
    const instances = await withControlPlaneTransaction(pool, platform, async client => {
      const results: Array<{ tenant: string; school: string; instance: string }> = [];
      for (let index = 0; index < 2; index++) {
        const key = randomUUID();
        const tenant = (await client.query<{ id: string }>(
          `INSERT INTO production.tenants (display_name, tenant_slug, created_by)
           VALUES ($1, $2, 'test') RETURNING id`, [`School ${key}`, key]
        )).rows[0].id;
        const organization = (await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id`,
          [tenant, `School ${key}`]
        )).rows[0].id;
        const school = (await client.query<{ id: string }>(
          `INSERT INTO production.schools (tenant_id, organization_id, name, short_name, school_slug)
           VALUES ($1, $2, $3::text, $3::text, $4) RETURNING id`, [tenant, organization, `School ${key}`, key]
        )).rows[0].id;
        const instance = (await client.query<{ id: string }>(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, configuration_version, status)
           VALUES ($1, $2, 'app_curriculum_flow', '1', 'ready_for_activation') RETURNING id`,
          [tenant, school]
        )).rows[0].id;
        await client.query(
          `INSERT INTO attendance.school_capabilities
             (tenant_id, school_id, application_instance_id, status, requested_at)
           VALUES ($1, $2, $3, 'requested', now())`, [tenant, school, instance]
        );
        results.push({ tenant, school, instance });
      }
      return results;
    });

    const catalogue = await repository.listCatalogue(platform);
    assert.equal(catalogue.length, 8);
    assert.ok(catalogue.every(model => model.verification_status === 'planned' && model.adapter_id === null));
    const model = catalogue.find(entry => entry.model === 'SpeedFace-V5L');
    assert.ok(model);
    const request = {
      deviceCategory: 'combined' as const,
      deviceModelId: model.id as string,
      quantity: 1,
      intendedLocations: ['Main gate'],
      intendedPopulation: 'students' as const,
      attendanceUseCases: ['school_arrival'],
      preferredIntegrationMethod: 'unknown' as const
    };
    const [first, replay] = await Promise.all([
      repository.createRequest(platform, instances[0].instance, request, 'request-key-123'),
      repository.createRequest(platform, instances[0].instance, request, 'request-key-123')
    ]);
    assert.equal(first.id, replay.id);
    assert.equal(first.state, 'requested');
    assert.deepEqual(first, replay);
    assert.equal((await repository.getRequest(platform, first.id))?.id, first.id);
    await assert.rejects(
      repository.createRequest(platform, instances[0].instance, { ...request, quantity: 2 }, 'request-key-123'),
      /IDEMPOTENCY_CONFLICT/
    );
    const other = await repository.createRequest(platform, instances[1].instance, request, 'request-key-123');
    assert.notEqual(other.id, first.id);
    const anotherSchool = await withControlPlaneTransaction(pool, platform, async client => {
      const key = randomUUID();
      const organization = (await client.query<{ id: string }>(
        `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id`,
        [instances[0].tenant, `School ${key}`]
      )).rows[0].id;
      return (await client.query<{ id: string }>(
        `INSERT INTO production.schools (tenant_id, organization_id, name, short_name, school_slug)
         VALUES ($1, $2, $3::text, $3::text, $4) RETURNING id`,
        [instances[0].tenant, organization, `School ${key}`, key]
      )).rows[0].id;
    });
    await assert.rejects(withControlPlaneTransaction(pool, platform, client =>
      client.query(
        `INSERT INTO attendance.school_capabilities
           (tenant_id, school_id, application_instance_id, status)
         VALUES ($1, $2, $3, 'not_requested')`,
        [instances[0].tenant, anotherSchool, instances[0].instance]
      )
    ), /foreign key constraint/);
    const visible = await withTenantTransaction(pool, principal(instances[0].tenant), client =>
      client.query<{ id: string }>('SELECT id FROM attendance.provisioning_requests')
    );
    assert.deepEqual(visible.rows.map(row => row.id), [first.id]);
    const counts = await withControlPlaneTransaction(pool, platform, client =>
      client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM attendance.provisioning_audit_events
         WHERE request_id = $1 AND action = 'provisioning_request_created'`, [first.id]
      )
    );
    assert.equal(counts.rows[0].count, '1');
    const app = express();
    app.use(express.json());
    app.use('/platform/attendance', createAttendanceProvisioningRouter((req, res, next) => {
      if (req.get('Authorization') !== 'test-platform-session') {
        res.status(403).json({ success: false });
        return;
      }
      Object.assign(req, { trustedTenantContext: platform });
      next();
    }, () => repository));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/platform/attendance`;
      assert.equal((await fetch(`${base}/device-catalogue`)).status, 403);
      const headers = { Authorization: 'test-platform-session' };
      const models = await fetch(`${base}/device-catalogue`, { headers });
      assert.equal(models.status, 200);
      assert.equal((await models.json()).data.length, 8);
      const httpRequest = await fetch(`${base}/provisioning-requests`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Idempotency-Key': 'request-key-123' },
        body: JSON.stringify({ applicationInstanceId: instances[0].instance, request })
      });
      assert.equal(httpRequest.status, 200);
      assert.equal((await httpRequest.json()).data.id, first.id);
      const loaded = await fetch(`${base}/provisioning-requests/${first.id}`, { headers });
      assert.equal((await loaded.json()).data.id, first.id);
      const invalid = await fetch(`${base}/provisioning-requests`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationInstanceId: instances[0].instance, request })
      });
      assert.equal(invalid.status, 400);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    await runtime.close();
  }
});
