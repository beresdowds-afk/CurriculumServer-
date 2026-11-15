import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ControlPlaneRepository } from './controlPlaneRepository';
import { SchoolProvisioningRepository } from './schoolProvisioningRepository';
import { PostgresRuntime } from './postgres';
import { inspectPlatformReadiness } from './readiness';
import { createVerifiedTenantPrincipal, withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { createInvitationToken, hashPassword, hashProvisioningRequest } from '../schoolProvisioning';
import type { SchoolProvisioningRequest } from '../../packages/shared-types/src/apiContracts';

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
  let schoolTenantA: string | undefined;
  let schoolTenantB: string | undefined;
  let schoolTenantC: string | undefined;
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
    process.env.INVITATION_EMAIL_API_KEY = 'integration-test-mail-key';
    process.env.INVITATION_EMAIL_FROM = 'integration@test.invalid';
    process.env.APP_URL = 'https://test.invalid';
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
    assert.equal(readiness.database.rlsPoliciesAvailable, true);
    assert.equal(readiness.database.trustedTenantContextAvailable, true);
    assert.equal(readiness.database.tenantSecurityAvailable, true);
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

    const schoolRepository = new SchoolProvisioningRepository(pool);
    const schoolRequest = (name: string, email: string): SchoolProvisioningRequest => ({
      school: {
        name,
        displayName: name,
        schoolType: 'primary',
        country: 'Ghana',
        stateProvince: 'Greater Accra',
        city: 'Accra',
        physicalAddress: '1 Test Road',
        officialContactEmail: `contact-${randomUUID()}@test.invalid`,
        telephone: '+233 20 000 0000'
      },
      configuration: {
        timeZone: 'Africa/Accra',
        currency: 'GHS',
        language: 'en',
        academicSession: '2025-2026',
        academicTermStructure: [{ name: 'Semester 1', startMonth: 9, endMonth: 1 }],
        educationLevels: ['Primary'],
        gradingConfiguration: { maximumScore: 100 }
      },
      administrator: { fullName: 'Test Administrator', email },
      applicationId: 'app_curriculum_flow'
    });
    const requestA = schoolRequest(`School A ${randomUUID()}`, schoolAdminEmailA);
    const keyA = `school-provision-${randomUUID()}`;
    const invitationA = createInvitationToken();
    const recordA = await schoolRepository.provision(
      requestA,
      'admin@test.invalid',
      keyA,
      hashProvisioningRequest(requestA),
      invitationA.tokenHash,
      new Date(Date.now() + 60 * 60 * 1000)
    );
    schoolTenantA = recordA.tenantId;
    assert.equal(recordA.instanceStatus, 'provisioning');
    assert.equal(recordA.administratorActivationStatus, 'delivery_pending');

    const retryInvitationA = createInvitationToken();
    const retryA = await schoolRepository.provision(
      requestA,
      'admin@test.invalid',
      keyA,
      hashProvisioningRequest(requestA),
      retryInvitationA.tokenHash,
      new Date(Date.now() + 60 * 60 * 1000)
    );
    assert.equal(retryA.idempotentReplay, true);
    assert.equal(retryA.tenantId, recordA.tenantId);
    assert.equal(retryA.schoolId, recordA.schoolId);
    assert.equal(retryA.instanceId, recordA.instanceId);
    await schoolRepository.recordInvitationDelivery(recordA.invitationId!);
    await assert.rejects(
      schoolRepository.activateAdministrator(
        recordA.invitationId!,
        createInvitationToken().tokenHash,
        await hashPassword('test-school-admin-password-12')
      ),
      /INVITATION_INVALID_OR_EXPIRED/
    );
    assert.equal((await schoolRepository.getProvisioningStatus(recordA.instanceId))?.instanceStatus, 'provisioning');
    const activationA = await schoolRepository.activateAdministrator(
      recordA.invitationId!,
      retryInvitationA.tokenHash,
      await hashPassword('test-school-admin-password-12')
    );
    assert.equal(activationA.tenantId, recordA.tenantId);
    const schoolAPrincipal = principal(recordA.tenantId);
    assert.equal(await schoolRepository.getMembership(schoolAPrincipal, activationA.userId), true);
    const activeSchoolA = await schoolRepository.getSchool(schoolAPrincipal);
    assert.equal(activeSchoolA?.id, recordA.schoolId);
    assert.equal(activeSchoolA?.instance_status, 'active');
    assert.deepEqual(activeSchoolA?.enabled_features, ['feat_student_registration', 'feat_exam_management']);
    assert.equal((await schoolRepository.getConfiguration(schoolAPrincipal))?.currency, 'GHS');
    assert.equal((await schoolRepository.getProvisioningStatus(recordA.instanceId))?.instanceStatus, 'active');
    await assert.rejects(
      schoolRepository.activateAdministrator(
        recordA.invitationId!,
        retryInvitationA.tokenHash,
        await hashPassword('test-school-admin-password-12')
      ),
      /INVITATION_INVALID_OR_EXPIRED/
    );

    const requestB = schoolRequest(`School B ${randomUUID()}`, schoolAdminEmailB);
    const invitationB = createInvitationToken();
    const recordB = await schoolRepository.provision(
      requestB,
      'admin@test.invalid',
      `school-provision-${randomUUID()}`,
      hashProvisioningRequest(requestB),
      invitationB.tokenHash,
      new Date(Date.now() + 60 * 60 * 1000)
    );
    schoolTenantB = recordB.tenantId;
    const activationB = await schoolRepository.activateAdministrator(
      recordB.invitationId!,
      invitationB.tokenHash,
      await hashPassword('test-school-admin-password-12')
    );
    assert.notEqual(recordA.schoolId, recordB.schoolId);
    assert.notEqual(recordA.tenantId, recordB.tenantId);
    assert.notEqual(recordA.instanceId, recordB.instanceId);
    assert.equal(await schoolRepository.getMembership(schoolAPrincipal, activationB.userId), false);
    assert.equal((await schoolRepository.getSchool(schoolAPrincipal))?.id, recordA.schoolId);
    assert.equal(await schoolRepository.authenticateAdministrator(recordA.tenantId, schoolAdminEmailB), undefined);
    await schoolRepository.updateConfiguration(schoolAPrincipal, {
      ...requestA.configuration,
      academicSession: '2026-2027'
    });
    assert.equal((await schoolRepository.getConfiguration(schoolAPrincipal))?.academicSession, '2026-2027');
    assert.equal(
      (await schoolRepository.getConfiguration(principal(recordB.tenantId)))?.academicSession,
      '2025-2026',
      'tenant A configuration updates cannot mutate tenant B'
    );

    const requestC = schoolRequest(`School C ${randomUUID()}`, schoolAdminEmailC);
    const keyC = `school-provision-${randomUUID()}`;
    const invitationC1 = createInvitationToken();
    const invitationC2 = createInvitationToken();
    const [recordC1, recordC2] = await Promise.all([
      schoolRepository.provision(
        requestC, 'admin@test.invalid', keyC, hashProvisioningRequest(requestC),
        invitationC1.tokenHash, new Date(Date.now() + 60 * 60 * 1000)
      ),
      schoolRepository.provision(
        requestC, 'admin@test.invalid', keyC, hashProvisioningRequest(requestC),
        invitationC2.tokenHash, new Date(Date.now() + 60 * 60 * 1000)
      )
    ]);
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
