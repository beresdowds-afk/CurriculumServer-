import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { AuthorizationRepository } from '../authorization/authorizationRepository';
import { createAuthorizationMiddleware } from '../authorization/middleware';
import { createSchoolAdministrationGuards } from '../authorization/schoolAdministrationGuards';
import { PERMISSIONS } from '../authorization/permissions';
import { ServerTenantTokenService } from '../tenantTokenService';
import { PostgresRuntime } from './postgres';
import { SchoolAdministrationError, SchoolAdministrationRepository } from './schoolAdministrationRepository';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { acceptanceTestOptions, databaseUrl, principal } from './testSupport';

test('signed HTTP identity, live permissions and RLS enforce tenant and resource isolation', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl, PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable', NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const authz = new AuthorizationRepository(pool);
  const schools = new SchoolAdministrationRepository(pool);
  const platform = principal('regression-platform', 'super_admin');
  const tenants: string[] = [randomUUID(), randomUUID()];
  const schoolIds = [randomUUID(), randomUUID()];
  const students = [randomUUID(), randomUUID(), randomUUID()];
  const users = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const emails = users.map(id => `${id}@test.invalid`);
  const roles = ['tenant_admin', 'staff', 'read_only', 'tenant_admin'];
  let server: ReturnType<typeof express.application.listen> | undefined;

  try {
    await withControlPlaneTransaction(pool, platform, async client => {
      for (let i = 0; i < 2; i++) {
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, $2, $3, 'security-test', 'approved')`,
          [tenants[i], `Security tenant ${i}`, `security-${tenants[i]}`]
        );
        const organization = await client.query<{ id: string }>(
          'INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id',
          [tenants[i], `Organization ${i}`]
        );
        await client.query(
          `INSERT INTO production.schools
           (tenant_id, organization_id, id, name, short_name, school_slug, official_contact_email)
           VALUES ($1, $2, $3, 'Security School', 'Security', $4, $5)`,
          [tenants[i], organization.rows[0].id, schoolIds[i], `school-${tenants[i]}`, emails[i]]
        );
      }
      for (let i = 0; i < users.length; i++) {
        const tenant = tenants[i === 3 ? 1 : 0];
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, 'Security User', 'test-hash', now())`, [users[i], emails[i]]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role, status)
           VALUES ($1, $2::text, $2::uuid, $3, 'active')`, [tenant, users[i], roles[i]]
        );
        await client.query(
          `INSERT INTO production.membership_role_assignments
           (tenant_id, user_subject, role_code, assigned_by) VALUES ($1, $2, $3, 'security-test')`,
          [tenant, users[i], roles[i]]
        );
      }
      for (let i = 0; i < students.length; i++) {
        const tenantIndex = i === 2 ? 1 : 0;
        await client.query(
          `INSERT INTO production.students
           (tenant_id, school_id, id, admission_number, first_name, last_name)
           VALUES ($1, $2, $3, $4, $5, 'Original')`,
          [tenants[tenantIndex], schoolIds[tenantIndex], students[i], `SEC-${i}`, `Student${i}`]
        );
      }
      await client.query(
        `INSERT INTO production.role_assignment_scopes (tenant_id, assignment_id, resource_type, resource_id)
         SELECT tenant_id, id, 'student', $3 FROM production.membership_role_assignments
         WHERE tenant_id = $1 AND user_subject = $2 AND role_code = 'staff'`,
        [tenants[0], users[1], students[0]]
      );
    });

    const sessions = await Promise.all(users.map((user, i) =>
      authz.createSession(principal(tenants[i === 3 ? 1 : 0]), user, 3600)
    ));
    const token = (tenantId: string, userId: string, sessionId: string, role = 'tenant_admin', ttl = 3600) =>
      ServerTenantTokenService.issueTenantToken({
        id: tenantId, appId: 'regression', schoolName: 'Security School',
        subscriptionTier: 'test', status: 'active'
      }, role, ttl, undefined, userId, sessionId);
    const tokens = users.map((user, i) =>
      token(tenants[i === 3 ? 1 : 0], user, sessions[i].sessionId)
    );
    const auth = createAuthorizationMiddleware({
      verifyToken: ServerTenantTokenService.verifyTenantToken,
      signingConfigured: () => true,
      authorization: () => authz,
      platformAdministratorAllowed: email => email === 'platform@test.invalid'
    });
    const guards = createSchoolAdministrationGuards(auth);
    const app = express();
    app.use(express.json());
    app.use('/api', createApiCapabilityGateMiddleware());
    app.get('/api/v1/schools/me/staff', (_req, res) => res.sendStatus(204));
    app.get('/regression/admin', auth.tenantAdministrator, (_req, res) => res.sendStatus(204));
    app.get('/regression/platform', auth.platformAdministrator, (_req, res) => res.sendStatus(204));
    app.get('/regression/students/:studentId', guards.studentRecordRead, async (req, res) => {
      const actor = (req as typeof req & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      try {
        const record = await schools.getStudent(actor, schoolIds[tenants.indexOf(actor.tenantId)], req.params.studentId);
        res.json({ id: record.id, tenantId: record.tenant_id, firstName: record.first_name });
      } catch (error) {
        if (error instanceof SchoolAdministrationError && error.code === 'STUDENT_NOT_FOUND') {
          res.sendStatus(404);
          return;
        }
        res.sendStatus(500);
      }
    });
    app.patch('/regression/students/:studentId', guards.studentUpdate, async (req, res) => {
      const actor = (req as typeof req & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      try {
        const record = await schools.updateStudent(actor, schoolIds[tenants.indexOf(actor.tenantId)], req.params.studentId, {
          firstName: req.body.firstName
        });
        res.json({ id: record.id, tenantId: record.tenant_id });
      } catch (error) {
        if (error instanceof SchoolAdministrationError && error.code === 'STUDENT_NOT_FOUND') {
          res.sendStatus(404);
          return;
        }
        res.sendStatus(500);
      }
    });
    app.post('/regression/roles/:userId', auth.requirePermission(PERMISSIONS.membershipRolesAssign), async (req, res) => {
      const actor = (req as typeof req & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      try {
        await authz.assignRole(actor, req.params.userId, req.body.role);
        res.sendStatus(204);
      } catch (error) {
        if (error instanceof Error && ['TENANT_ROLE_INVALID', 'MEMBERSHIP_NOT_FOUND', 'FORBIDDEN'].includes(error.message)) {
          res.status(403).json({ code: error.message });
          return;
        }
        res.sendStatus(500);
      }
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP listener unavailable');
    const base = `http://127.0.0.1:${address.port}`;
    const request = (path: string, credential?: string, init: RequestInit = {}) =>
      fetch(`${base}${path}`, {
        ...init,
        headers: {
          ...(credential ? { authorization: `Bearer ${credential}` } : {}),
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers
        }
      });

    assert.equal((await request('/regression/admin')).status, 401, 'missing bearer token');
    assert.equal((await request('/regression/admin', token(tenants[0], users[0], sessions[0].sessionId, 'tenant_admin', -1))).status, 401, 'expired token');
    assert.equal((await request('/regression/admin', `${tokens[0]}x`)).status, 401, 'tampered signature');
    assert.equal((await request('/regression/admin', tokens[0])).status, 204, 'database administrator');
    assert.equal((await request('/regression/admin', tokens[1])).status, 403, 'staff token claiming administrator');
    assert.equal((await request('/regression/admin', tokens[2])).status, 403, 'read-only token claiming administrator');
    assert.equal((await request('/regression/platform', tokens[0])).status, 403, 'tenant user is not platform administrator');
    const platformToken = ServerTenantTokenService.issueTenantToken({
      id: 'platform-control-plane', appId: 'control', schoolName: 'Platform',
      subscriptionTier: 'platform', status: 'active'
    }, 'super_admin', 3600, 'platform@test.invalid');
    assert.equal((await request('/regression/platform', platformToken)).status, 204, 'configured platform administrator');
    assert.equal((await request('/regression/admin', platformToken)).status, 403, 'platform identity is not a tenant session');
    assert.equal((await request('/regression/admin', token(tenants[1], users[0], sessions[0].sessionId))).status, 403, 'signed tenant substitution');
    assert.equal((await request('/regression/admin', token(tenants[0], users[3], sessions[0].sessionId))).status, 403, 'signed user substitution');

    const ownRead = await request(`/regression/students/${students[0]}?tenantId=${tenants[1]}&userId=${users[3]}&role=super_admin&studentId=${students[2]}`, tokens[1], {
      headers: { 'x-tenant-id': tenants[1], 'x-user-id': users[3], 'x-role': 'super_admin' }
    });
    assert.equal(ownRead.status, 200, 'scoped staff can read assigned student');
    assert.deepEqual(await ownRead.json(), { id: students[0], tenantId: tenants[0], firstName: 'Student0' });
    assert.equal((await request(`/regression/students/${students[1]}`, tokens[1])).status, 403, 'staff cannot substitute another resource');
    assert.equal((await request(`/regression/students/${students[2]}`, tokens[3])).status, 200, 'tenant B can read its own student');
    assert.equal((await request(`/regression/students/${students[0]}`, tokens[3])).status, 404, 'tenant B cannot read tenant A');
    assert.equal((await request(`/regression/students/${students[2]}`, tokens[0])).status, 404, 'administrator cannot read another tenant');
    assert.equal((await request(`/regression/students/${students[2]}`, tokens[0], {
      method: 'PATCH', body: JSON.stringify({ firstName: 'Attack', tenantId: tenants[1], userId: users[3], role: 'super_admin', studentId: students[0] })
    })).status, 404, 'administrator cannot modify another tenant');
    assert.equal((await request(`/regression/students/${students[0]}`, tokens[2], {
      method: 'PATCH', body: JSON.stringify({ firstName: 'Attack', role: 'tenant_admin' })
    })).status, 403, 'read-only cannot write with a forged body role');
    assert.equal((await request(`/regression/students/${students[0]}`, tokens[0], {
      method: 'PATCH', body: JSON.stringify({ firstName: 'Allowed', tenantId: tenants[1] })
    })).status, 200, 'administrator can update own student');
    assert.equal((await request(`/regression/roles/${users[3]}?tenantId=${tenants[1]}`, tokens[0], {
      method: 'POST', headers: { 'x-tenant-id': tenants[1] }, body: JSON.stringify({ role: 'staff', tenantId: tenants[1] })
    })).status, 403, 'cross-tenant role assignment is denied');
    assert.equal((await request(`/regression/roles/${users[1]}`, tokens[0], {
      method: 'POST', body: JSON.stringify({ role: 'super_admin' })
    })).status, 403, 'platform role cannot be assigned to tenant membership');
    assert.equal((await request(`/regression/roles/${users[2]}`, tokens[1], {
      method: 'POST', body: JSON.stringify({ role: 'tenant_admin' })
    })).status, 403, 'staff cannot assign roles');
    await withControlPlaneTransaction(pool, platform, client =>
      client.query(
        `INSERT INTO production.membership_role_assignments
         (tenant_id, user_subject, role_code, assigned_by) VALUES ($1, $2, 'principal', 'security-test')`,
        [tenants[0], users[2]]
      )
    );
    const escalation = await request(`/regression/roles/${users[1]}`, tokens[2], {
      method: 'POST', body: JSON.stringify({ role: 'tenant_admin' })
    });
    assert.equal(escalation.status, 403, 'principal cannot grant permissions not held');
    assert.equal((await escalation.json()).code, 'FORBIDDEN');
    assert.equal((await request(`/regression/roles/${users[2]}`, tokens[0], {
      method: 'POST', body: JSON.stringify({ role: 'staff' })
    })).status, 204, 'administrator can assign a permitted role');
    const unready = await request('/api/v1/schools/me/staff', tokens[0]);
    assert.equal(unready.status, 503, 'unready capability cannot reach route');
    assert.equal((await unready.json()).code, 'PRODUCTION_PERSISTENCE_UNAVAILABLE');

    const tenantBRecord = await withTenantTransaction(pool, principal(tenants[1]), client =>
      client.query<{ first_name: string }>('SELECT first_name FROM production.students WHERE tenant_id = $1 AND id = $2', [tenants[1], students[2]])
    );
    assert.equal(tenantBRecord.rows[0].first_name, 'Student2', 'cross-tenant write had no effect');

    await withTenantTransaction(pool, principal(tenants[0]), async client => {
      assert.equal((await client.query('SELECT id FROM production.students WHERE tenant_id = $1 AND id = $2', [tenants[1], students[2]])).rowCount, 0, 'signed tenant A cannot read tenant B');
      assert.equal((await client.query("UPDATE production.students SET first_name = 'Attack' WHERE tenant_id = $1 AND id = $2", [tenants[1], students[2]])).rowCount, 0, 'signed tenant A cannot update tenant B');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenants[1]]);
      assert.equal((await client.query('SELECT id FROM production.students WHERE tenant_id = $1 AND id = $2', [tenants[1], students[2]])).rowCount, 0, 'changing tenant GUC invalidates signature');
    });
    assert.equal((await pool.query('SELECT id FROM production.students WHERE tenant_id = $1 AND id = $2', [tenants[1], students[2]])).rowCount, 0, 'missing signed context fails closed');
    await assert.rejects(withTenantTransaction(pool, principal(tenants[0]), client =>
      client.query(
        `INSERT INTO production.students (tenant_id, school_id, admission_number, first_name, last_name)
         VALUES ($1, $2, 'ATTACK', 'Attack', 'Attack')`,
        [tenants[1], schoolIds[1]]
      )
    ), /row-level security/i, 'RLS rejects cross-tenant insertion');

    const adminResult = await authz.authorize(principal(tenants[0]), users[0], sessions[0].sessionId);
    assert.ok(adminResult.ok);
    await authz.revokeSession(adminResult.principal, sessions[1].sessionId, 'security regression');
    assert.equal((await request(`/regression/students/${students[0]}`, tokens[1])).status, 403, 'revoked session rejected on next request');
    await authz.revokeMembership(adminResult.principal, users[2], 'security regression');
    assert.equal((await request(`/regression/students/${students[0]}`, tokens[2])).status, 403, 'revoked membership rejected on next request');
  } finally {
    if (server) {
      server.close();
      await once(server, 'close');
    }
    await withControlPlaneTransaction(pool, platform, async client => {
      await client.query('DELETE FROM production.tenants WHERE id = ANY($1::uuid[])', [tenants]);
      await client.query('DELETE FROM production.users WHERE id = ANY($1::uuid[])', [users]);
    }).finally(() => runtime.close());
  }
});
