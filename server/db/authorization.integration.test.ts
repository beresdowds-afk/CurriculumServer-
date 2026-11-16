import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AuthorizationRepository } from '../authorization/authorizationRepository';
import { PERMISSIONS } from '../authorization/permissions';
import { PostgresRuntime } from './postgres';
import { SchoolProvisioningRepository } from './schoolProvisioningRepository';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { hashInvitationToken, hashPassword, hashProvisioningRequest } from '../schoolProvisioning';
import { acceptanceTestOptions, buildSchoolRequest, databaseUrl, principal } from './testSupport';

test('PostgreSQL authorization, lifecycle separation and invitation durability', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl, PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable', NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const admin = principal('authz-integration-admin', 'super_admin');
  const schools = new SchoolProvisioningRepository(pool);
  const authz = new AuthorizationRepository(pool);
  const tenants: string[] = [];
  const operations: string[] = [];
  const emails: string[] = [];

  async function provision(label: string) {
    const email = `${label.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-${randomUUID()}@test.invalid`;
    emails.push(email);
    const request = buildSchoolRequest(`${label} ${randomUUID()}`, email);
    const record = await schools.provision(request, 'admin@test.invalid', `authz-${randomUUID()}`,
      hashProvisioningRequest(request), admin);
    tenants.push(record.tenantId);
    operations.push(record.operationId);
    return { record, request, email };
  }

  async function activate(record: Awaited<ReturnType<typeof provision>>['record']) {
    const delivery = await schools.prepareInvitationDelivery(record.invitationId!, admin);
    assert.ok(delivery);
    await schools.recordInvitationDelivery(delivery.invitationId, admin, delivery.attemptId, { providerMessageId: 'test' });
    const account = await schools.activateAdministrator(
      record.invitationId!, hashInvitationToken(delivery.token), await hashPassword('test-school-admin-password-12')
    );
    return { account, delivery };
  }

  const stage = async (instanceId: string) => (await withControlPlaneTransaction(pool, admin, c =>
    c.query<{ lifecycle_stage: string }>('SELECT lifecycle_stage FROM production.application_instances WHERE id = $1', [instanceId])
  )).rows[0].lifecycle_stage;

  try {
    // Runtime role restrictions.
    const role = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user');
    assert.equal(role.rows[0].rolsuper, false);
    assert.equal(role.rows[0].rolbypassrls, false);

    const a = await provision('Authz A');
    assert.equal(await stage(a.record.instanceId), 'template_verified');
    const activeA = await activate(a.record);
    const tenantA = principal(a.record.tenantId);

    // Invitation acceptance activates the account, never the application.
    assert.equal(await stage(a.record.instanceId), 'membership_active');
    assert.equal(await schools.getMembership(tenantA, activeA.account.userId), true);
    await assert.rejects(schools.activateApplication(a.record.instanceId, admin));
    // Token reuse is rejected.
    await assert.rejects(
      schools.activateAdministrator(a.record.invitationId!, hashInvitationToken(activeA.delivery.token),
        await hashPassword('test-school-admin-password-12')),
      /INVITATION_INVALID_OR_EXPIRED/);

    // DB-derived authorization.
    const session = await authz.createSession(tenantA, activeA.account.userId, 3600);
    const result = await authz.authorize(tenantA, activeA.account.userId, session.sessionId);
    assert.equal(result.ok, true);
    const adminPrincipal = (result as Extract<typeof result, { ok: true }>).principal;
    assert.ok(adminPrincipal.hasPermission(PERMISSIONS.schoolConfigurationManage));

    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query(
        `UPDATE production.users SET account_status = 'suspended', account_status_changed_at = now()
         WHERE id = $1`,
        [activeA.account.userId]
      );
    });
    assert.equal(await schools.authenticateAdministrator(a.record.tenantId, a.email), undefined);
    assert.deepEqual(await authz.authorize(tenantA, activeA.account.userId, session.sessionId),
      { ok: false, reason: 'SESSION_REVOKED' });
    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query(
        `UPDATE production.users SET account_status = 'active', account_status_changed_at = now()
         WHERE id = $1`,
        [activeA.account.userId]
      );
    });

    // Lifecycle trigger blocks skipped transitions even for direct SQL.
    await assert.rejects(withControlPlaneTransaction(pool, admin, c =>
      c.query("UPDATE production.application_instances SET lifecycle_stage = 'application_activated' WHERE id = $1",
        [a.record.instanceId])));
    // Configuration completion is a separate step.
    await schools.updateConfiguration(tenantA, a.request.configuration, adminPrincipal);
    assert.equal(await stage(a.record.instanceId), 'configuration_completed');

    // Cross-tenant: a session for tenant A is not valid in tenant B.
    const b = await provision('Authz B');
    const activeB = await activate(b.record);
    const tenantB = principal(b.record.tenantId);
    assert.equal((await authz.authorize(tenantB, activeA.account.userId, session.sessionId)).ok, false);
    assert.equal(await schools.getMembership(tenantB, activeA.account.userId), false);
    await withControlPlaneTransaction(pool, admin, client =>
      client.query(
        `INSERT INTO production.memberships (tenant_id, user_id, user_subject, role)
         VALUES ($1, $2, $3, 'staff')`,
        [b.record.tenantId, activeA.account.userId, `cross-school-${activeA.account.userId}`]
      )
    );
    const secondSchoolSession = await authz.createSession(tenantB, activeA.account.userId, 3600);
    assert.equal((await authz.authorize(tenantB, activeA.account.userId, secondSchoolSession.sessionId)).ok, true);

    // RLS on new tables.
    const seen = await withTenantTransaction(pool, tenantB, c =>
      c.query('SELECT count(*)::int AS n FROM production.user_sessions WHERE tenant_id = $1', [a.record.tenantId]));
    assert.equal(seen.rows[0].n, 0);

    // Reference tables are read-only for the runtime role.
    await assert.rejects(pool.query("INSERT INTO production.permissions (code, description) VALUES ('x.y','z')"));

    // Unauthorized role assignment: a staff member cannot assign roles.
    const staffEmail = `staff-${randomUUID()}@test.invalid`;
    emails.push(staffEmail);
    const staffUserId = randomUUID();
    await withControlPlaneTransaction(pool, admin, async c => {
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [a.record.tenantId]);
      await c.query('INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at) VALUES ($1, $2, $4, $3, now())',
        [staffUserId, staffEmail, await hashPassword('test-school-admin-password-12'), 'Staff Member']);
      await c.query(`INSERT INTO production.memberships (tenant_id, user_id, user_subject, role, status)
                     VALUES ($1, $2, $3, 'staff', 'active')`, [a.record.tenantId, staffUserId, staffEmail]);
      await c.query(`INSERT INTO production.membership_role_assignments (tenant_id, user_subject, role_code, assigned_by)
                     VALUES ($1, $2, 'staff', 'test-setup')`, [a.record.tenantId, staffEmail]);
    });
    const staffSession = await authz.createSession(tenantA, staffUserId, 3600);
    const staffAuth = await authz.authorize(tenantA, staffUserId, staffSession.sessionId);
    assert.equal(staffAuth.ok, true);
    const staffPrincipal = (staffAuth as Extract<typeof staffAuth, { ok: true }>).principal;
    await assert.rejects(authz.assignRole(staffPrincipal, staffUserId, 'tenant_admin'), /FORBIDDEN|permission/i);

    // Session revocation takes effect immediately.
    await authz.revokeSession(tenantA, staffSession.sessionId, 'test');
    assert.deepEqual(await authz.authorize(tenantA, staffUserId, staffSession.sessionId),
      { ok: false, reason: 'SESSION_REVOKED' });

    // Membership revocation takes effect immediately and kills sessions.
    const liveSession = await authz.createSession(tenantA, staffUserId, 3600);
    await authz.revokeMembership(adminPrincipal, staffUserId, 'test');
    const revoked = await authz.authorize(tenantA, staffUserId, liveSession.sessionId);
    assert.equal(revoked.ok, false);

    // Delivery durability: retries rotate token with audit, dead-letter at max attempts.
    const c = await provision('Authz C');
    let last: Awaited<ReturnType<typeof schools.prepareInvitationDelivery>>;
    const tokens = new Set<string>();
    for (let i = 0; i < 5; i++) {
      last = await schools.prepareInvitationDelivery(c.record.invitationId!, admin);
      assert.ok(last);
      assert.ok(!tokens.has(last.token), 'every delivery uses a new token version');
      tokens.add(last.token);
      await schools.recordInvitationDelivery(last.invitationId, admin, last.attemptId, { error: 'provider_down' });
    }
    const outbox = await withControlPlaneTransaction(pool, admin, cl =>
      cl.query<{ status: string }>('SELECT status FROM production.invitation_outbox WHERE invitation_id = $1', [c.record.invitationId]));
    assert.equal(outbox.rows[0].status, 'dead_letter');
    const audit = await withControlPlaneTransaction(pool, admin, cl =>
      cl.query("SELECT count(*)::int AS n FROM production.audit_events WHERE tenant_id = $1 AND action = 'school_admin_invitation_token_rotated'",
        [c.record.tenantId]));
    assert.ok(audit.rows[0].n >= 1);
    // No plaintext tokens persisted.
    const stored = await withControlPlaneTransaction(pool, admin, cl =>
      cl.query('SELECT count(*)::int AS n FROM production.school_admin_invitations WHERE id = $1 AND token_hash = $2',
        [c.record.invitationId, Buffer.from([...tokens][0])]));
    assert.equal(stored.rows[0].n, 0);

    // Invitation revocation.
    const d = await provision('Authz D');
    const dd = await schools.prepareInvitationDelivery(d.record.invitationId!, admin);
    assert.equal(await schools.revokeInvitation(d.record.invitationId!, admin, 'test'), true);
    await assert.rejects(
      schools.activateAdministrator(d.record.invitationId!, hashInvitationToken(dd!.token),
        await hashPassword('test-school-admin-password-12')),
      /INVITATION_INVALID_OR_EXPIRED/);
    void activeB;
  } finally {
    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query('DELETE FROM production.tenants WHERE id = ANY($1::uuid[])', [tenants]);
      await client.query('DELETE FROM production.school_provisioning_operations WHERE id = ANY($1::uuid[])', [operations]);
      await client.query('DELETE FROM production.users WHERE lower(email) = ANY($1::text[])', [emails.map(e => e.toLowerCase())]);
    }).finally(() => runtime.close());
  }
});
