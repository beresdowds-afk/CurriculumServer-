import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express, { type RequestHandler } from 'express';
import type { QueryResult, QueryResultRow } from 'pg';
import { createAuthorizedPrincipal, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { createAttendanceDeviceManagementRouter } from './deviceManagementRoutes';

process.env.CONTROL_PLANE_SECRET ||= 'test-control-plane-secret-at-least-32-chars';
process.env.STORAGE_VAULT_ACTIVE_KEY_ID ||= 'test-vault-k1';
process.env.STORAGE_VAULT_KEYS ||= JSON.stringify({
  [process.env.STORAGE_VAULT_ACTIVE_KEY_ID]: randomBytes(32).toString('base64')
});

function ok<R extends QueryResultRow>(rows: R[] = []): QueryResult<R> {
  return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
}

function makePrincipal(input: {
  tenantId: string;
  userId?: string;
  permissions?: string[];
  schoolScopeIds?: string[];
}): AuthorizedPrincipal {
  const userId = input.userId ?? randomUUID();
  const tenant = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: input.tenantId,
      role: 'school_admin',
      userId,
      email: 'admin@school.test',
      appId: 'curriculum-flow',
      schoolName: 'Test School',
      subscriptionTier: 'standard',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: `/storage/${input.tenantId}`,
      issuer: 'test',
      audience: input.tenantId,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'sig',
      permissions: input.permissions ?? []
    }
  });
  return createAuthorizedPrincipal({
    tenant,
    userId,
    sessionId: randomUUID(),
    grants: [{
      roleCode: 'school_admin',
      permissions: input.permissions ?? [],
      scopes: input.schoolScopeIds ? [{ resourceType: 'school', resourceId: input.schoolScopeIds[0] }] : []
    }]
  });
}

function createManagementMemoryPool() {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const schoolA1 = randomUUID();
  const schoolA2 = randomUUID();
  const schoolB1 = randomUUID();
  const locA1Old = randomUUID();
  const locA1New = randomUUID();
  const deviceA1 = randomUUID();
  const deviceB1 = randomUUID();

  const initialSecret = randomBytes(32).toString('hex');

  const store = {
    tenantA,
    tenantB,
    schoolA1,
    schoolA2,
    schoolB1,
    locA1Old,
    locA1New,
    deviceA1,
    deviceB1,
    schools: [
      { id: schoolA1, tenant_id: tenantA, application_instance_id: randomUUID(), created_at: new Date(1000) },
      { id: schoolA2, tenant_id: tenantA, application_instance_id: randomUUID(), created_at: new Date(2000) },
      { id: schoolB1, tenant_id: tenantB, application_instance_id: randomUUID(), created_at: new Date(3000) }
    ],
    capabilities: [
      { tenant_id: tenantA, school_id: schoolA1, application_instance_id: null as string | null, status: 'active', blocked_reason: null, requested_configuration: { deviceCategories: ['rfid'] }, heartbeat_thresholds: { degradedSeconds: 300, offlineSeconds: 900 }, requested_at: new Date(), activated_at: new Date() },
      { tenant_id: tenantB, school_id: schoolB1, application_instance_id: null as string | null, status: 'active', blocked_reason: null, requested_configuration: { deviceCategories: ['rfid'] }, heartbeat_thresholds: { degradedSeconds: 300, offlineSeconds: 900 }, requested_at: new Date(), activated_at: new Date() }
    ],
    locations: [
      { id: locA1Old, tenant_id: tenantA, school_id: schoolA1, display_name: 'Main Gate', status: 'active' },
      { id: locA1New, tenant_id: tenantA, school_id: schoolA1, display_name: 'Science Wing', status: 'active' }
    ],
    devices: [
      {
        id: deviceA1,
        tenant_id: tenantA,
        school_id: schoolA1,
        application_instance_id: null,
        device_identity: 'dev-a1-001',
        display_name: 'Gate Terminal A1',
        manufacturer: 'ZKTeco',
        model: 'SpeedFace-V5L',
        device_type: 'rfid',
        modalities: ['rfid'],
        approved_location: 'Main Gate',
        location_id: locA1Old as string | null,
        permitted_population: 'students',
        allowed_event_types: ['school_arrival', 'school_departure'],
        status: 'active',
        status_reason: null as string | null,
        firmware_version: '1.2.0',
        adapter_id: 'verified-gw',
        adapter_version: '1.0.0',
        integration_status: 'verified_physical_hardware',
        last_heartbeat_at: new Date(),
        last_event_at: null as Date | null,
        last_sequence_number: 5,
        degraded_threshold_seconds: 300,
        offline_threshold_seconds: 900,
        connectivity_status: 'online',
        enrollment_acknowledged_at: new Date(),
        revoked_at: null as Date | null,
        decommissioned_at: null as Date | null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: deviceB1,
        tenant_id: tenantB,
        school_id: schoolB1,
        application_instance_id: null,
        device_identity: 'dev-b1-001',
        display_name: 'Tenant B Terminal',
        manufacturer: 'ZKTeco',
        model: 'SpeedFace-V5L',
        device_type: 'rfid',
        modalities: ['rfid'],
        approved_location: 'West Gate',
        location_id: null,
        permitted_population: 'students',
        allowed_event_types: ['school_arrival'],
        status: 'active',
        status_reason: null,
        firmware_version: '1.0.0',
        adapter_id: 'verified-gw',
        adapter_version: '1.0.0',
        integration_status: 'verified_physical_hardware',
        last_heartbeat_at: null,
        last_event_at: null,
        last_sequence_number: null,
        degraded_threshold_seconds: 300,
        offline_threshold_seconds: 900,
        connectivity_status: 'unknown',
        enrollment_acknowledged_at: new Date(),
        revoked_at: null,
        decommissioned_at: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ],
    credentials: [
      {
        device_identity: 'dev-a1-001',
        tenant_id: tenantA,
        school_id: schoolA1,
        device_id: deviceA1,
        encrypted_signing_key: ServerSecretVault.encrypt(initialSecret),
        credential_version: 1,
        revoked_at: null as Date | null
      }
    ],
    credentialHistory: [] as any[],
    healthChecks: [] as any[],
    auditEvents: [] as any[],
    allocations: [{
      tenant_id: tenantA,
      school_id: schoolA1,
      application_instance_id: null as string | null,
      device_id: deviceA1,
      provisioning_request_id: null as string | null,
      state: 'active'
    }]
  };

  const client: DatabaseClient = {
    async query<R = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<R>> {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK' || s.startsWith('SELECT set_config(')) {
        return ok<R>();
      }

      if (s.includes('FROM production.schools s WHERE s.tenant_id = $1')) {
        return ok(store.schools.filter(sc => sc.tenant_id === params[0]).map(sc => ({
          school_id: sc.id,
          application_instance_id: sc.application_instance_id
        })) as unknown as R[]);
      }

      if (s.includes('FROM attendance.school_capabilities')) {
        return ok(store.capabilities.filter(c => c.tenant_id === params[0] && c.school_id === params[1]) as unknown as R[]);
      }

      if (s.includes('count(*)::text AS total')) {
        const list = store.devices.filter(d => d.tenant_id === params[0] && d.school_id === params[1]);
        return ok([{
          total: String(list.length),
          active: String(list.filter(d => d.status === 'active').length),
          suspended: String(list.filter(d => d.status === 'suspended').length),
          revoked: String(list.filter(d => ['revoked', 'decommissioned'].includes(d.status)).length)
        } as unknown as R]);
      }

      if (s.includes('FROM control_plane.attendance_device_credentials')) {
        const identities = Array.isArray(params[1]) ? params[1] : [params[1]];
        return ok(
          store.credentials.filter(c => c.tenant_id === params[0] && identities.includes(c.device_identity)) as unknown as R[]
        );
      }

      if (s.includes('FROM attendance.devices d LEFT JOIN attendance.device_catalogue')) {
        const list = store.devices.filter(d =>
          d.tenant_id === params[0] &&
          d.school_id === params[1] &&
          (!params[2] || d.id === params[2])
        );
        return ok(list as unknown as R[]);
      }

      if (s.includes('FROM attendance.devices d LEFT JOIN attendance.device_adapters')) {
        const list = store.devices
          .filter(d => d.tenant_id === params[0] && d.school_id === params[1] && d.id === params[2])
          .map(d => ({
            ...d,
            adapter_verification_status: 'implemented_tested',
            adapter_enabled: true
          }));
        return ok(list as unknown as R[]);
      }

      if (s.includes('FROM attendance.devices WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
        return ok(store.devices.filter(d => d.tenant_id === params[0] && d.school_id === params[1] && d.id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.device_health_checks')) {
        return ok(store.healthChecks.filter(h => h.device_id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.provisioning_audit_events')) {
        return ok(store.auditEvents.filter(a => a.device_id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.installation_locations')) {
        return ok(store.locations.filter(l => l.tenant_id === params[0] && l.school_id === params[1] && l.id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.device_allocations')) {
        return ok(store.allocations.filter(a => a.tenant_id === params[0] && a.school_id === params[1] && a.device_id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.provisioning_steps')) {
        return ok([] as unknown as R[]);
      }

      if (s.startsWith('INSERT INTO attendance.device_health_checks')) {
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          device_id: params[2],
          connectivity_status: params[3],
          attendance_processing_status: params[4],
          configuration_sync_status: params[5],
          checked_at: new Date(),
          safe_details: {}
        };
        store.healthChecks.push(row);
        return ok([row as unknown as R]);
      }

      if (s.startsWith('UPDATE attendance.devices')) {
        const dev = store.devices.find(d => d.tenant_id === params[0] && d.school_id === params[1] && d.id === params[2]);
        if (!dev) return ok<R>();
        if (s.includes("SET connectivity_status =")) {
          dev.connectivity_status = String(params[3]);
        } else if (s.includes("SET status = 'suspended'")) {
          dev.status = 'suspended';
          dev.status_reason = String(params[3]);
        } else if (s.includes("SET status = 'active'")) {
          dev.status = 'active';
          dev.status_reason = String(params[3]);
        } else if (s.includes("SET status = 'revoked'")) {
          dev.status = 'revoked';
          dev.status_reason = String(params[3]);
          dev.revoked_at = new Date();
        } else if (s.includes("SET status = 'decommissioned'")) {
          dev.status = 'decommissioned';
          dev.status_reason = String(params[3]);
          dev.decommissioned_at = new Date();
        } else if (s.includes('SET location_id =')) {
          dev.location_id = String(params[3]);
          dev.approved_location = String(params[4]);
        }
        dev.updated_at = new Date();
        return ok([dev as unknown as R]);
      }

      if (s.startsWith('UPDATE control_plane.attendance_device_credentials')) {
        const cred = store.credentials.find(c => c.device_identity === params[0] && c.tenant_id === params[1]);
        if (!cred) return ok<R>();
        if (s.includes('encrypted_signing_key =')) {
          cred.encrypted_signing_key = String(params[4]);
          cred.credential_version = Number(cred.credential_version || 1) + 1;
          cred.revoked_at = null;
          (cred as any).rotated_at = new Date();
        } else if (s.includes('revoked_at = now()')) {
          cred.revoked_at = new Date();
        }
        return ok([cred as unknown as R]);
      }

      if (s.startsWith('INSERT INTO control_plane.attendance_device_credential_history')) {
        const eventType = s.includes("'rotated'")
          ? 'rotated'
          : s.includes("'revoked'")
            ? 'revoked'
            : 'issued';
        store.credentialHistory.push({ device_identity: params[0], version: params[4], event_type: eventType, reason: params[6] });
        return ok<R>();
      }

      if (s.startsWith('INSERT INTO attendance.provisioning_audit_events')) {
        store.auditEvents.push({
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          device_id: params[2],
          actor: params[3],
          action: s,
          previous_state: params[4] ?? null,
          new_state: params[5] ?? null,
          reason: params[6] ?? null,
          occurred_at: new Date()
        });
        return ok<R>();
      }

      return ok<R>();
    },
    release() {}
  };

  return {
    pool: {
      query: client.query,
      connect: async () => client,
      end: async () => {},
      on() { return this; }
    } satisfies DatabasePool,
    store
  };
}

test('school device management enforces school scoping, permission isolation, lifecycle rules, credential rotation/revocation, and zero secret exposure', async () => {
  const { pool, store } = createManagementMemoryPool();
  const activePrincipals = new Map<string, AuthorizedPrincipal>();

  const requirePermission = (permission: string): RequestHandler => (req, res, next) => {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    const principal = activePrincipals.get(token);
    if (!principal) {
      res.status(401).json({ success: false, code: 'UNAUTHENTICATED' });
      return;
    }
    if (!principal.hasPermission(permission)) {
      res.status(403).json({ success: false, code: 'FORBIDDEN' });
      return;
    }
    Object.assign(req, { authorizedPrincipal: principal });
    next();
  };

  const requirePermissionWithinScopes = (
    permission: string,
    resourceTypes: readonly string[]
  ): RequestHandler => (req, res, next) => {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    const principal = activePrincipals.get(token);
    if (!principal) {
      res.status(401).json({ success: false, code: 'UNAUTHENTICATED' });
      return;
    }
    if (!principal.hasPermission(permission) && !principal.grants.some(grant =>
      grant.permissions.includes(permission) &&
      grant.scopes.some(scope => resourceTypes.includes(scope.resourceType))
    )) {
      res.status(403).json({ success: false, code: 'FORBIDDEN' });
      return;
    }
    Object.assign(req, { authorizedPrincipal: principal });
    next();
  };

  const tokenFullA = 'token-full-a';
  const tokenReadOnlyA = 'token-read-a';
  const tokenFullB = 'token-full-b';

  activePrincipals.set(tokenFullA, makePrincipal({
    tenantId: store.tenantA,
    schoolScopeIds: [store.schoolA1],
    permissions: [
      PERMISSIONS.attendanceRead,
      PERMISSIONS.attendanceDevicesManage,
      PERMISSIONS.attendanceDevicesActivate,
      PERMISSIONS.attendanceDevicesSuspend,
      PERMISSIONS.attendanceDevicesRevoke,
      PERMISSIONS.attendanceCredentialsManage
    ]
  }));
  activePrincipals.set(tokenReadOnlyA, makePrincipal({
    tenantId: store.tenantA,
    schoolScopeIds: [store.schoolA1],
    permissions: [PERMISSIONS.attendanceRead]
  }));
  activePrincipals.set(tokenFullB, makePrincipal({
    tenantId: store.tenantB,
    schoolScopeIds: [store.schoolB1],
    permissions: [
      PERMISSIONS.attendanceRead,
      PERMISSIONS.attendanceDevicesManage,
      PERMISSIONS.attendanceDevicesRevoke
    ]
  }));

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createAttendanceDeviceManagementRouter({
    getPool: () => pool,
    authorizationMiddleware: { requirePermission, requirePermissionWithinScopes }
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/schools/me/attendance`;

  try {
    // 1. Cross-tenant access fails closed
    const crossTenant = await fetch(`${base}/devices/${store.deviceA1}`, {
      headers: { Authorization: `Bearer ${tokenFullB}` }
    });
    assert.equal(crossTenant.status, 404);

    // 2. Conflicting schoolId between query and header fails 400
    const conflictScope = await fetch(`${base}/devices?schoolId=${store.schoolA1}`, {
      headers: { Authorization: `Bearer ${tokenFullA}`, 'X-School-ID': store.schoolA2 }
    });
    assert.equal(conflictScope.status, 400);
    assert.equal((await conflictScope.json()).code, 'CONFLICTING_SCHOOL_SCOPE');

    // 3. List & Detail return status/credentialVersion WITHOUT signing keys or secrets
    const listRes = await fetch(`${base}/devices?schoolId=${store.schoolA1}`, {
      headers: { Authorization: `Bearer ${tokenReadOnlyA}` }
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.data[0].credentialVersion, 1);
    const serialized = JSON.stringify(listBody);
    assert.doesNotMatch(serialized, /encrypted_signing_key|signingKey|rawSecret/i);

    // 4. Read-only principal cannot suspend/revoke/rotate
    const denySuspend = await fetch(`${base}/devices/${store.deviceA1}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenReadOnlyA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'unauthorized test' })
    });
    assert.equal(denySuspend.status, 403);

    // 5. Connectivity test, suspend -> reactivate, location reassignment, credential rotation -> credential revocation
    const testConn = await fetch(`${base}/devices/${store.deviceA1}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1 })
    });
    assert.equal(testConn.status, 200);
    assert.equal((await testConn.json()).data.connectivityStatus, 'online');

    const suspendRes = await fetch(`${base}/devices/${store.deviceA1}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Maintenance inspection' })
    });
    assert.equal(suspendRes.status, 200);
    assert.equal((await suspendRes.json()).data.status, 'suspended');

    const reactivateRes = await fetch(`${base}/devices/${store.deviceA1}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Maintenance complete' })
    });
    assert.equal(reactivateRes.status, 200);
    assert.equal((await reactivateRes.json()).data.status, 'active');

    const reassignRes = await fetch(`${base}/devices/${store.deviceA1}/reassign-location`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, locationId: store.locA1New, reason: 'Moved to science wing' })
    });
    assert.equal(reassignRes.status, 200);
    assert.equal((await reassignRes.json()).data.approvedLocation, 'Science Wing');

    const rotateRes = await fetch(`${base}/devices/${store.deviceA1}/credentials/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Quarterly key rotation' })
    });
    assert.equal(rotateRes.status, 200);
    const rotateJson = await rotateRes.json();
    assert.equal(rotateJson.data.credentialVersion, 2);
    assert.equal('signingKey' in rotateJson.data, false);
    assert.ok(store.credentialHistory.some(h => h.event_type === 'rotated' && h.version === 2));

    const revokeCredRes = await fetch(`${base}/devices/${store.deviceA1}/credentials/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Device tampered' })
    });
    assert.equal(revokeCredRes.status, 200);
    assert.equal((await revokeCredRes.json()).data.credentialStatus, 'revoked');

    // 6. Revoke -> Decommission; terminal decommission rejects reactivation
    const revokeDevRes = await fetch(`${base}/devices/${store.deviceA1}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Hardware retired' })
    });
    assert.equal(revokeDevRes.status, 200);
    assert.equal((await revokeDevRes.json()).data.status, 'revoked');

    const decommRes = await fetch(`${base}/devices/${store.deviceA1}/decommission`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Physically disposed' })
    });
    assert.equal(decommRes.status, 200);
    assert.equal((await decommRes.json()).data.status, 'decommissioned');

    const reactivateAfterDecomm = await fetch(`${base}/devices/${store.deviceA1}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: store.schoolA1, reason: 'Should fail' })
    });
    assert.equal(reactivateAfterDecomm.status, 409);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
