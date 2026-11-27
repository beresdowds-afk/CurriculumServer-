import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { PostgresRuntime } from '../db/postgres';
import { createVerifiedTenantPrincipal, withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { acceptanceTestOptions, databaseUrl, principal } from '../db/testSupport';
import { AttendanceAdapterRegistry, VendorNeutralGatewayAdapter } from './adapterRegistry';
import { AttendanceProvisioningRepository } from './attendanceProvisioningRepository';
import { signAttendanceDeviceRequest } from './deviceAdapter';
import { AttendanceDeviceIngestionService } from './deviceIngestionService';
import { AttendanceDeviceManagementService } from './deviceManagementService';

test('live PostgreSQL attendance lifecycle enforces RLS, immutable evidence triggers, credential custody, and signed ingestion end to end', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();

  const platform = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'control-plane',
      role: 'super_admin',
      email: 'platform-integration@test.invalid',
      appId: 'curriculum-flow',
      schoolName: 'Control Plane',
      subscriptionTier: 'enterprise',
      status: 'ACTIVE',
      databaseName: 'test',
      storageNamespace: '/test',
      issuer: 'integration-test',
      audience: 'control-plane',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'sig',
      permissions: [PERMISSIONS.attendanceDevicesProvision]
    }
  });

  try {
    // 1. Seed two isolated tenants/schools/students
    const seeded = await withControlPlaneTransaction(pool, platform, async client => {
      const pairs: Array<{
        tenantId: string;
        schoolId: string;
        instanceId: string;
        userId: string;
        studentId: string;
        classId: string;
      }> = [];
      for (let i = 0; i < 2; i++) {
        const key = randomUUID();
        const tenantId = (await client.query<{ id: string }>(
          `INSERT INTO production.tenants (display_name, tenant_slug, created_by)
           VALUES ($1, $2, 'test') RETURNING id`,
          [`Attendance Int ${key}`, key]
        )).rows[0].id;
        const orgId = (await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id`,
          [tenantId, `Org ${key}`]
        )).rows[0].id;
        const schoolId = (await client.query<{ id: string }>(
          `INSERT INTO production.schools (tenant_id, organization_id, name, short_name, school_slug, operational_policies)
           VALUES ($1, $2, $3::text, $3::text, $4, $5::jsonb) RETURNING id`,
          [
            tenantId,
            orgId,
            `School ${key}`,
            key,
            JSON.stringify({
              attendanceSchedule: {
                timeZone: 'UTC',
                studentArrivalCutoffTime: '08:00',
                studentDepartureCutoffTime: '14:00',
                graceMinutes: 10,
                notifyGuardiansOn: ['arrival', 'late_arrival']
              }
            })
          ]
        )).rows[0].id;
        const instanceId = (await client.query<{ id: string }>(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, configuration_version, status)
           VALUES ($1, $2, 'app_curriculum_flow', '1', 'active') RETURNING id`,
          [tenantId, schoolId]
        )).rows[0].id;
        await client.query(
          `INSERT INTO attendance.school_capabilities
             (tenant_id, school_id, application_instance_id, status, requested_at)
           VALUES ($1, $2, $3, 'requested', now())`,
          [tenantId, schoolId, instanceId]
        );
        const userId = (await client.query<{ id: string }>(
          `INSERT INTO production.users (email, full_name, password_hash, status)
           VALUES ($1, 'School Admin', 'hash', 'active') RETURNING id`,
          [`admin-${key}@test.invalid`]
        )).rows[0].id;
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_id, status)
           VALUES ($1, $2, 'active')`,
          [tenantId, userId]
        );
        const classId = (await client.query<{ id: string }>(
          `INSERT INTO production.classes (tenant_id, school_id, name, grade_level, academic_session)
           VALUES ($1, $2, 'JSS 1A', 'JSS1', '2026-2027') RETURNING id`,
          [tenantId, schoolId]
        )).rows[0].id;
        const studentId = (await client.query<{ id: string }>(
          `INSERT INTO production.students
             (tenant_id, school_id, admission_number, first_name, last_name, class_id, lifecycle_status)
           VALUES ($1, $2, $3, 'Student', 'Test', $4, 'active') RETURNING id`,
          [tenantId, schoolId, `ADM-${key.slice(0, 6)}`, classId]
        )).rows[0].id;
        pairs.push({ tenantId, schoolId, instanceId, userId, studentId, classId });
      }
      return pairs;
    });

    // 2. RLS blocks tenant session from reading control_plane.attendance_device_credentials
    await assert.rejects(
      withTenantTransaction(pool, principal(seeded[0].tenantId), async client => {
        const res = await client.query('SELECT count(*)::int AS cnt FROM control_plane.attendance_device_credentials');
        if (Number(res.rows[0]?.cnt ?? 0) === 0) throw new Error('RLS_HIDDEN_EMPTY');
      })
    );

    // 3. Register verified adapter + catalogue model + provision device cleanly
    class VerifiedPgTestAdapter extends VendorNeutralGatewayAdapter {
      override readonly verifiedHardware = true;
      override readonly verificationStatus = 'implemented_tested' as const;
      override readonly supportedFirmware = ['1.0.0'];
    }
    const registry = new AttendanceAdapterRegistry();
    registry.register(new VerifiedPgTestAdapter('pg-test-gw', '1.0.0'));
    const provisioningRepo = new AttendanceProvisioningRepository(pool, registry);

    await provisioningRepo.registerAdapter(platform, {
      adapterId: 'pg-test-gw',
      adapterVersion: '1.0.0',
      manufacturer: 'VendorCorp',
      supportedModels: ['PG-RFID-1'],
      capabilityManifest: { offlineSync: true },
      verificationStatus: 'implemented_tested',
      enabled: true,
      verificationEvidence: { testSuiteRunId: 'pg-int-1', verifiedBy: 'qa' }
    });
    const model = await provisioningRepo.createCatalogueModel(platform, {
      manufacturer: 'VendorCorp',
      model: 'PG-RFID-1',
      category: 'rfid',
      modalities: ['rfid'],
      integrationMethod: 'signed_http',
      firmwareCompatibility: { supportedVersions: ['1.0.0'] },
      supportedEventTypes: ['school_arrival', 'school_departure'],
      offlineSync: true,
      credentialManagement: true,
      adapterId: 'pg-test-gw',
      adapterVersion: '1.0.0',
      verificationStatus: 'implemented_tested',
      verificationEvidence: { testSuiteRunId: 'pg-int-1', verifiedBy: 'qa' }
    });

    const provReq = await provisioningRepo.createRequest(
      platform,
      seeded[0].instanceId,
      {
        deviceCategory: 'rfid',
        deviceModelId: model.id,
        quantity: 1,
        intendedLocations: ['Main Gate'],
        intendedPopulation: 'students',
        attendanceUseCases: ['school_arrival'],
        preferredIntegrationMethod: 'signed_http'
      },
      'pg-req-key-01'
    );
    await provisioningRepo.validateProvisioningRequest(platform, provReq.id, 'pg-val-key-01', '1.0.0');
    const paused = await provisioningRepo.executeProvisioningRequest(platform, provReq.id, {}, 'pg-exec-key-01');
    assert.equal(paused.blocked, true);
    const devIdentity = paused.allocatedDevices[0].deviceIdentity;
    const devId = paused.allocatedDevices[0].deviceId;

    await withControlPlaneTransaction(pool, platform, client =>
      client.query(
        `UPDATE attendance.school_capabilities SET status = 'active', updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND application_instance_id = $3`,
        [seeded[0].tenantId, seeded[0].schoolId, seeded[0].instanceId]
      )
    );

    const completed = await provisioningRepo.executeProvisioningRequest(
      platform,
      provReq.id,
      {
        enrollmentAcknowledgedByDevices: {
          [devIdentity]: { operationReference: 'enr-1', acknowledgedAt: new Date().toISOString() }
        },
        configurationApplied: { operationReference: 'cfg-1', configuredAt: new Date().toISOString() },
        connectionTestPassed: { operationReference: 'conn-1', latencyMs: 10 },
        timeSyncPassed: { operationReference: 'ntp-1', clockDriftMs: 5 },
        eventDeliveryTestPassed: { operationReference: 'evt-1', testEventId: randomUUID() },
        attendanceAcceptanceTestPassed: { operationReference: 'uat-1', scenarioCount: 1 }
      },
      'pg-exec-key-02'
    );
    assert.equal(completed.blocked, false);
    assert.equal(completed.request.state, 'active');

    // 4. Tenant B cannot see Tenant A's device via RLS
    const tenantBVisible = await withTenantTransaction(pool, principal(seeded[1].tenantId), client =>
      client.query('SELECT id FROM attendance.devices WHERE id = $1', [devId])
    );
    assert.equal(tenantBVisible.rowCount, 0);

    // 5. School management & credential enrollment + signed ingestion + immutable raw event verification
    const schoolAdminPrincipal = createAuthorizedPrincipal({
      tenant: principal(seeded[0].tenantId),
      userId: seeded[0].userId,
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'school_admin',
        permissions: [
          PERMISSIONS.attendanceRead,
          PERMISSIONS.attendanceDevicesManage,
          PERMISSIONS.attendanceCredentialsManage,
          PERMISSIONS.attendanceAdjust
        ],
        scopes: [{ resourceType: 'school', resourceId: seeded[0].schoolId }]
      }]
    });

    const mgmt = new AttendanceDeviceManagementService(pool);
    const list = await mgmt.listDevices(schoolAdminPrincipal, seeded[0].schoolId);
    assert.equal(list.length, 1);

    const ingestion = new AttendanceDeviceIngestionService(pool);
    await ingestion.enrollPersonCredential(schoolAdminPrincipal, {
      schoolId: seeded[0].schoolId,
      modality: 'rfid',
      credentialReference: 'PG-RFID-BADGE-01',
      studentId: seeded[0].studentId
    });

    // Fetch raw secret strictly inside control plane test harness to sign an authentic device payload
    const encryptedRow = await withControlPlaneTransaction(pool, platform, client =>
      client.query<{ encrypted_signing_key: string }>(
        'SELECT encrypted_signing_key FROM control_plane.attendance_device_credentials WHERE device_identity = $1',
        [devIdentity]
      )
    );
    const { ServerSecretVault } = await import('../storageAndDatabaseManager');
    const rawSecret = ServerSecretVault.decrypt(encryptedRow.rows[0].encrypted_signing_key);

    const eventDay = new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10);
    const payload = {
      eventId: randomUUID(),
      sequenceNumber: 1,
      deviceIdentity: devIdentity,
      credentialReference: 'PG-RFID-BADGE-01',
      verificationMethod: 'rfid' as const,
      verificationResult: 'verified' as const,
      eventType: 'school_arrival' as const,
      location: 'Main Gate',
      occurredAt: `${eventDay}T08:05:00.000Z`,
      payloadVersion: '1.0'
    };
    const rawBody = JSON.stringify(payload);
    const ts = String(Date.now());
    const nonce = randomUUID();
    const sig = signAttendanceDeviceRequest(rawSecret, {
      method: 'POST',
      path: '/api/v1/attendance/device-events',
      timestamp: ts,
      nonce,
      body: rawBody
    });

    const ingested = await ingestion.ingestSingleEvent(
      {
        deviceIdentity: devIdentity,
        timestamp: ts,
        nonce,
        signature: sig,
        method: 'POST',
        path: '/api/v1/attendance/device-events',
        rawBody
      },
      payload
    );
    assert.equal(ingested.status, 'accepted');
    assert.equal(ingested.attendanceStatus, 'present');

    // Verify raw event cannot be deleted/mutated (immutable trigger)
    await assert.rejects(
      withTenantTransaction(pool, principal(seeded[0].tenantId), client =>
        client.query('DELETE FROM attendance.device_events WHERE id = $1', [ingested.deviceEventRecordId])
      ),
      /immutable/i
    );
  } finally {
    await runtime.close();
  }
});
