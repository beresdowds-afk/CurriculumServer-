import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ControlPlaneRepository } from './controlPlaneRepository';
import { SchoolProvisioningRepository } from './schoolProvisioningRepository';
import { PostgresRuntime } from './postgres';
import { inspectPlatformReadiness } from './readiness';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import {
  createInvitationToken,
  hashInvitationToken,
  hashPassword,
  hashProvisioningRequest
} from '../schoolProvisioning';
import { AuthorizationRepository } from '../authorization/authorizationRepository';
import { acceptanceTestOptions, buildSchoolRequest, databaseUrl, principal } from './testSupport';
import { buildApplicationInstanceConfiguration } from '../../src/data/applicationInstanceConfiguration';

test('disposable PostgreSQL persists lifecycle records and enforces tenant RLS', acceptanceTestOptions, async () => {
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
  let schoolTenantA: string | undefined;
  let schoolTenantB: string | undefined;
  let schoolTenantC: string | undefined;
  const schoolOperationIds: string[] = [];
  const schoolAdminEmailA = `admin-a-${randomUUID()}@test.invalid`;
  const schoolAdminEmailB = `admin-b-${randomUUID()}@test.invalid`;
  const schoolAdminEmailC = `admin-c-${randomUUID()}@test.invalid`;
  let restartedRuntime: PostgresRuntime | undefined;

  try {
    const readinessEnv = [
      'CONTROL_PLANE_SECRET',
      'PLATFORM_ADMIN_CREDENTIALS_JSON',
      'INVITATION_EMAIL_API_KEY',
      'INVITATION_EMAIL_FROM',
      'APP_URL'
    ] as const;
    const previousEnv = Object.fromEntries(readinessEnv.map(name => [name, process.env[name]]));
    process.env.CONTROL_PLANE_SECRET = 'integration-test-secret-at-least-32-characters';
    process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
      'admin@test.invalid': 'integration-test-admin-key-at-least-32-chars'
    });
    delete process.env.INVITATION_EMAIL_API_KEY;
    delete process.env.INVITATION_EMAIL_FROM;
    delete process.env.APP_URL;
    let readiness: Awaited<ReturnType<typeof inspectPlatformReadiness>>;
    try {
      readiness = await inspectPlatformReadiness(pool, true);
    } finally {
      for (const name of readinessEnv) {
        if (previousEnv[name] === undefined) delete process.env[name];
        else process.env[name] = previousEnv[name];
      }
    }
    assert.equal(readiness.ready, true, JSON.stringify(readiness));
    assert.equal(readiness.provisioning.executionAvailable, true);
    assert.equal(readiness.provisioning.invitationDeliveryAvailable, false);
    assert.equal(readiness.database.rlsPoliciesAvailable, true);
    assert.equal(readiness.database.trustedTenantContextAvailable, true);
    assert.equal(readiness.database.tenantSecurityAvailable, true);
    assert.equal(readiness.capabilities.capabilityImplementation.ready, false);
    assert.equal(readiness.capabilities.capabilityConfiguration.ready, false);
    assert.equal(readiness.capabilities.runtimeDependencies.ready, false);
    assert.equal(readiness.capabilities.applicationReadiness.ready, false);
    assert.equal((await pool.query<{ can_access: boolean }>(
      `SELECT
         has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'SELECT')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'INSERT')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'UPDATE')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'DELETE')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRUNCATE')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'REFERENCES')
         OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRIGGER')
         AS can_access`
    )).rows[0]?.can_access, false, 'the runtime role must have no access to the context signing key');
    await assert.rejects(pool.query(
      'SELECT key_value FROM control_plane.authorization_context_keys'
    ), /permission denied/);
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

    const forgedContext = await pool.connect();
    try {
      await forgedContext.query('BEGIN');
      await forgedContext.query(
        `SELECT set_config('app.tenant_id', $1, true),
                set_config('app.control_plane_admin', 'true', true)`,
        [tenantB]
      );
      const forgedTenant = await forgedContext.query(
        'SELECT id FROM control_plane.customers WHERE id = $1',
        [customerB.id]
      );
      const forgedControlPlane = await forgedContext.query(
        'SELECT production.is_verified_control_plane_context() AS allowed'
      );
      assert.equal(forgedTenant.rowCount, 0, 'a forged tenant GUC must not grant cross-tenant access');
      assert.equal(forgedControlPlane.rows[0]?.allowed, false,
        'a forged control-plane GUC must not grant privileged access');
      await assert.rejects(forgedContext.query(
        `INSERT INTO control_plane.customers (tenant_id, name, email)
         VALUES ($1, 'Forged Control Plane', $2)`,
        [tenantB, `forged-${randomUUID()}@test.invalid`]
      ), /row-level security policy/);
    } finally {
      await forgedContext.query('ROLLBACK');
      forgedContext.release();
    }

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

    const schoolRepository = new SchoolProvisioningRepository(pool);
    const schoolRequest = buildSchoolRequest;
    const requestA = {
      ...schoolRequest(`School A ${randomUUID()}`, schoolAdminEmailA),
      applicationConfiguration: buildApplicationInstanceConfiguration({
        applicationId: 'app_curriculum_flow',
        templateId: 'school-standard',
        templateVersion: '1',
        enabledCapabilities: ['feat_school_administration_identity'],
        configurationVersion: 4,
        deploymentArchitecture: 'shared_database'
      })
    };
    const keyA = `school-provision-${randomUUID()}`;
    const recordA = await schoolRepository.provision(
      requestA,
      'admin@test.invalid',
      keyA,
      hashProvisioningRequest(requestA),
      admin
    );
    schoolOperationIds.push(recordA.operationId);
    schoolTenantA = recordA.tenantId;
    assert.equal(recordA.instanceStatus, 'ready_for_activation');
    assert.equal(recordA.provisioningStatus, 'ready');
    assert.equal(recordA.configurationReadiness, 'ready');
    assert.equal(recordA.applicationReadiness, 'pending');
    assert.equal(recordA.administratorActivationStatus, 'delivery_pending');
    const storedApplicationConfiguration = await withControlPlaneTransaction(pool, admin, client =>
      client.query<{ instance_version: string; snapshot_version: number; config_version: number }>(
        `SELECT instance.configuration_version AS instance_version,
                snapshot.configuration_version AS snapshot_version,
                (snapshot.configuration ->> 'configurationVersion')::int AS config_version
         FROM production.application_instances instance
         JOIN production.application_instance_configurations snapshot
           ON snapshot.tenant_id = instance.tenant_id
          AND snapshot.application_instance_id = instance.id
         WHERE instance.id = $1`,
        [recordA.instanceId]
      )
    );
    assert.deepEqual(storedApplicationConfiguration.rows[0], {
      instance_version: '4',
      snapshot_version: 4,
      config_version: 4
    });

    const retryA = await schoolRepository.provision(
      requestA,
      'admin@test.invalid',
      keyA,
      hashProvisioningRequest(requestA),
      admin
    );
    assert.equal(retryA.idempotentReplay, true);
    assert.equal(retryA.tenantId, recordA.tenantId);
    assert.equal(retryA.schoolId, recordA.schoolId);
    assert.equal(retryA.instanceId, recordA.instanceId);
    const firstDeliveryA = await schoolRepository.prepareInvitationDelivery(recordA.invitationId!, admin);
    assert.ok(firstDeliveryA);
    await schoolRepository.recordInvitationDelivery(
      firstDeliveryA.invitationId, admin, firstDeliveryA.attemptId, { error: 'test_provider_unavailable' }
    );
    const retryDeliveryA = await schoolRepository.prepareInvitationDelivery(recordA.invitationId!, admin);
    assert.ok(retryDeliveryA);
    assert.notEqual(retryDeliveryA.token, firstDeliveryA.token, 'retry rotates and invalidates the previous token');
    await assert.rejects(
      schoolRepository.activateAdministrator(
        recordA.invitationId!,
        createInvitationToken().tokenHash,
        await hashPassword('test-school-admin-password-12')
      ),
      /INVITATION_INVALID_OR_EXPIRED/
    );
    assert.equal((await schoolRepository.getProvisioningStatus(recordA.instanceId, admin))?.instanceStatus, 'ready_for_activation');
    const pendingInvitationA = await schoolRepository.getInvitation(hashInvitationToken(retryDeliveryA.token));
    assert.equal(pendingInvitationA?.id, recordA.invitationId);
    assert.equal(pendingInvitationA?.invitation_status, 'pending');
    const activationA = await schoolRepository.activateAdministrator(
      recordA.invitationId!,
      hashInvitationToken(retryDeliveryA.token),
      await hashPassword('test-school-admin-password-12')
    );
    assert.equal(activationA.tenantId, recordA.tenantId);
    const schoolAPrincipal = principal(recordA.tenantId);
    assert.equal(await schoolRepository.getMembership(schoolAPrincipal, activationA.userId), true);
    const activeSchoolA = await schoolRepository.getSchool(schoolAPrincipal);
    assert.equal(activeSchoolA?.id, recordA.schoolId);
    assert.equal(activeSchoolA?.instance_status, 'ready_for_activation');
    assert.deepEqual(activeSchoolA?.enabled_features, ['feat_school_administration_identity']);
    assert.equal((await schoolRepository.getConfiguration(schoolAPrincipal))?.currency, 'GHS');
    assert.equal((await schoolRepository.getProvisioningStatus(recordA.instanceId, admin))?.instanceStatus, 'ready_for_activation');
    await assert.rejects(
      schoolRepository.activateAdministrator(
        recordA.invitationId!,
        hashInvitationToken(retryDeliveryA.token),
        await hashPassword('test-school-admin-password-12')
      ),
      /INVITATION_INVALID_OR_EXPIRED/
    );

    const requestB = schoolRequest(`School B ${randomUUID()}`, schoolAdminEmailB);
    const recordB = await schoolRepository.provision(
      requestB,
      'admin@test.invalid',
      `school-provision-${randomUUID()}`,
      hashProvisioningRequest(requestB),
      admin
    );
    schoolOperationIds.push(recordB.operationId);
    schoolTenantB = recordB.tenantId;
    const crossTenantSchoolRead = await withTenantTransaction(pool, schoolAPrincipal, client =>
      client.query(
        'SELECT id FROM production.schools WHERE tenant_id = $1 AND id = $2',
        [recordB.tenantId, recordB.schoolId]
      )
    );
    assert.equal(crossTenantSchoolRead.rowCount, 0, 'tenant A cannot read tenant B school records');
    const crossTenantSchoolWrite = await withTenantTransaction(pool, schoolAPrincipal, client =>
      client.query(
        'UPDATE production.schools SET motto = $1 WHERE tenant_id = $2 AND id = $3 RETURNING id',
        ['cross-tenant write', recordB.tenantId, recordB.schoolId]
      )
    );
    assert.equal(crossTenantSchoolWrite.rowCount, 0, 'tenant A cannot update tenant B school records');
    await assert.rejects(withTenantTransaction(pool, schoolAPrincipal, client =>
      client.query(
        `INSERT INTO production.school_configuration_versions
           (tenant_id, school_id, configuration_version, configuration, created_by)
         VALUES ($1, $2, 99, '{}'::jsonb, 'cross-tenant-test')`,
        [recordB.tenantId, recordB.schoolId]
      )
    ), /row-level security policy/);
    const deliveryB = await schoolRepository.prepareInvitationDelivery(recordB.invitationId!, admin);
    assert.ok(deliveryB);
    const activationB = await schoolRepository.activateAdministrator(
      recordB.invitationId!,
      hashInvitationToken(deliveryB.token),
      await hashPassword('test-school-admin-password-12')
    );
    assert.notEqual(recordA.schoolId, recordB.schoolId);
    assert.notEqual(recordA.tenantId, recordB.tenantId);
    assert.notEqual(recordA.instanceId, recordB.instanceId);
    assert.equal(await schoolRepository.getMembership(schoolAPrincipal, activationB.userId), false);
    assert.equal((await schoolRepository.getSchool(schoolAPrincipal))?.id, recordA.schoolId);
    assert.equal(await schoolRepository.authenticateAdministrator(recordA.tenantId, schoolAdminEmailB), undefined);
    const authorizationRepository = new AuthorizationRepository(pool);
    const sessionA = await authorizationRepository.createSession(schoolAPrincipal, activationA.userId, 3600);
    const authorizationA = await authorizationRepository.authorize(
      schoolAPrincipal, activationA.userId, sessionA.sessionId
    );
    assert.equal(authorizationA.ok, true);
    await schoolRepository.updateConfiguration(schoolAPrincipal, {
      ...requestA.configuration,
      academicSession: '2026-2027'
    }, (authorizationA as Extract<typeof authorizationA, { ok: true }>).principal);
    assert.equal((await schoolRepository.getConfiguration(schoolAPrincipal))?.academicSession, '2026-2027');
    assert.equal(
      (await schoolRepository.getConfiguration(principal(recordB.tenantId)))?.academicSession,
      '2025-2026',
      'tenant A configuration updates cannot mutate tenant B'
    );

    const requestC = schoolRequest(`School C ${randomUUID()}`, schoolAdminEmailC);
    const keyC = `school-provision-${randomUUID()}`;
    const [recordC1, recordC2] = await Promise.all([
      schoolRepository.provision(
        requestC, 'admin@test.invalid', keyC, hashProvisioningRequest(requestC), admin
      ),
      schoolRepository.provision(
        requestC, 'admin@test.invalid', keyC, hashProvisioningRequest(requestC), admin
      )
    ]);
    schoolOperationIds.push(recordC1.operationId, recordC2.operationId);
    schoolTenantC = recordC1.tenantId;
    assert.equal(recordC1.tenantId, recordC2.tenantId);
    assert.equal(recordC1.schoolId, recordC2.schoolId);
    assert.equal([recordC1.idempotentReplay, recordC2.idempotentReplay].filter(Boolean).length, 1);

    restartedRuntime = new PostgresRuntime({
      DATABASE_URL: databaseUrl,
      PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
      NODE_ENV: 'test'
    });
    const restartedRepository = new SchoolProvisioningRepository(restartedRuntime.getPool());
    assert.equal((await restartedRepository.getSchool(schoolAPrincipal))?.id, recordA.schoolId);
    assert.equal((await restartedRepository.getConfiguration(schoolAPrincipal))?.academicSession, '2026-2027');
  } finally {
    await withControlPlaneTransaction(pool, admin, async client => {
      await client.query('DELETE FROM production.tenants WHERE id = ANY($1::uuid[])', [
        [schoolTenantA, schoolTenantB, schoolTenantC].filter(Boolean)
      ]);
      await client.query('DELETE FROM production.school_provisioning_operations WHERE id = ANY($1::uuid[])', [
        schoolOperationIds
      ]);
      await client.query('DELETE FROM production.users WHERE lower(email) = ANY($1::text[])', [
        [schoolAdminEmailA, schoolAdminEmailB, schoolAdminEmailC]
      ]);
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
    }).finally(async () => {
      await restartedRuntime?.close();
      await runtime.close();
    });
  }
});
