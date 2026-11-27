import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import {
  AttendanceAdapterRegistry,
  CANDIDATE_HARDWARE_MODELS,
  SimulatorAttendanceAdapter,
  VendorNeutralGatewayAdapter
} from './adapterRegistry';
import { AttendanceProvisioningRepository } from './attendanceProvisioningRepository';
import { createAttendanceProvisioningRouter } from './provisioningRoutes';

process.env.CONTROL_PLANE_SECRET ||= 'test-control-plane-secret-at-least-32-chars';
process.env.STORAGE_VAULT_ACTIVE_KEY_ID ||= 'test-vault-k1';
process.env.STORAGE_VAULT_KEYS ||= JSON.stringify({
  [process.env.STORAGE_VAULT_ACTIVE_KEY_ID]: randomBytes(32).toString('base64')
});

function platformPrincipal(email = 'platform-admin@curriculum.internal') {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'control-plane',
      role: 'super_admin',
      userId: randomUUID(),
      email,
      appId: 'curriculum-flow',
      schoolName: 'Platform Control Plane',
      subscriptionTier: 'enterprise',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: '/control-plane',
      issuer: 'test',
      audience: 'control-plane',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'sig',
      permissions: ['attendance.devices.provision']
    }
  });
}

function ok<R extends QueryResultRow>(rows: R[] = []): QueryResult<R> {
  return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
}

function createProvisioningMemoryPool() {
  const tenantId = randomUUID();
  const schoolId = randomUUID();
  const instanceId = randomUUID();
  const memberUserId = randomUUID();

  const state = {
    tenantId,
    schoolId,
    instanceId,
    memberUserId,
    capabilityStatus: 'requested',
    catalogue: [] as any[],
    adapters: [] as any[],
    requests: [] as any[],
    steps: [] as any[],
    locations: [] as any[],
    devices: [] as any[],
    allocations: [] as any[],
    credentials: [] as any[],
    credentialHistory: [] as any[],
    auditEvents: [] as any[],
    catalogueAuditEvents: [] as any[]
  };

  const client: DatabaseClient = {
    async query<R = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<R>> {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK' || s.startsWith('SELECT set_config(') || s.startsWith('SELECT pg_advisory_xact_lock(')) {
        return ok<R>();
      }

      // 1. Instance + capability lookup
      if (s.includes('FROM production.application_instances instance')) {
        if (params[0] === state.instanceId) {
          return ok([{
            tenant_id: state.tenantId,
            school_id: state.schoolId,
            capability_status: state.capabilityStatus
          } as unknown as R]);
        }
        return ok<R>();
      }

      if (s.includes('FROM attendance.school_capabilities')) {
        return ok([{ status: state.capabilityStatus } as unknown as R]);
      }

      if (s.includes('FROM production.memberships')) {
        return ok([{ user_id: state.memberUserId } as unknown as R]);
      }

      // 2. Catalogue
      if (s.includes('FROM attendance.device_catalogue c') && s.includes('LEFT JOIN attendance.device_adapters a')) {
        const model = state.catalogue.find(m => m.id === params[0]);
        if (!model) return ok<R>();
        const adapter = state.adapters.find(a => a.adapter_id === model.adapter_id && a.adapter_version === model.adapter_version);
        return ok([{
          ...model,
          adapter_enabled: adapter?.enabled ?? null,
          adapter_verification_status: adapter?.verification_status ?? null
        } as unknown as R]);
      }
      if (s.startsWith('SELECT category FROM attendance.device_catalogue')) {
        const model = state.catalogue.find(m => m.id === params[0]);
        return ok((model ? [{ category: model.category }] : []) as unknown as R[]);
      }
      if (s.startsWith('SELECT * FROM attendance.device_catalogue WHERE id = $1')) {
        const model = state.catalogue.find(m => m.id === params[0]);
        return ok((model ? [model] : []) as unknown as R[]);
      }
      if (s.includes('FROM attendance.device_catalogue')) {
        const rows = params[0] ? state.catalogue.filter(m => m.id === params[0]) : state.catalogue;
        return ok(rows as unknown as R[]);
      }
      if (s.startsWith('INSERT INTO attendance.device_catalogue')) {
        const row = {
          id: randomUUID(),
          manufacturer: params[0],
          model: params[1],
          category: params[2],
          modalities: params[3],
          communication_protocols: params[4],
          integration_method: params[5],
          firmware_compatibility: JSON.parse(String(params[6])),
          supported_event_types: params[7],
          offline_sync: params[8],
          credential_management: params[9],
          configuration_capabilities: params[10],
          adapter_id: params[11],
          adapter_version: params[12],
          verification_status: params[13],
          verification_evidence: JSON.parse(String(params[14])),
          operational_limitations: params[15],
          enabled: params[16],
          updated_by: params[17],
          created_at: new Date(),
          updated_at: new Date()
        };
        state.catalogue.push(row);
        return ok([row as unknown as R]);
      }
      if (s.startsWith('UPDATE attendance.device_catalogue SET enabled =')) {
        const model = state.catalogue.find(m => m.id === params[0]);
        if (!model) return ok<R>();
        model.enabled = params[1];
        model.updated_by = params[2];
        model.updated_at = new Date();
        return ok([model as unknown as R]);
      }
      if (s.startsWith('UPDATE attendance.device_catalogue SET communication_protocols =')) {
        const model = state.catalogue.find(m => m.id === params[0]);
        if (!model) return ok<R>();
        Object.assign(model, {
          communication_protocols: params[1],
          integration_method: params[2],
          firmware_compatibility: JSON.parse(String(params[3])),
          supported_event_types: params[4],
          offline_sync: params[5],
          credential_management: params[6],
          configuration_capabilities: params[7],
          adapter_id: params[8],
          adapter_version: params[9],
          verification_status: params[10],
          verification_evidence: JSON.parse(String(params[11])),
          operational_limitations: params[12],
          modalities: params[13],
          enabled: params[14],
          updated_by: params[15],
          updated_at: new Date()
        });
        return ok([model as unknown as R]);
      }

      // 3. Adapters
      if (s.includes('FROM attendance.device_adapters WHERE adapter_id = $1 AND adapter_version = $2')) {
        const a = state.adapters.find(x => x.adapter_id === params[0] && x.adapter_version === params[1]);
        return ok((a ? [a] : []) as unknown as R[]);
      }
      if (s.startsWith('INSERT INTO attendance.device_adapters')) {
        const existing = state.adapters.find(x => x.adapter_id === params[0] && x.adapter_version === params[1]);
        const row = {
          id: existing?.id ?? randomUUID(),
          adapter_id: params[0],
          adapter_version: params[1],
          manufacturer: params[2],
          supported_models: params[3],
          capability_manifest: JSON.parse(String(params[4])),
          verification_status: params[5],
          enabled: params[6],
          verified_at: params[5] === 'implemented_tested' ? new Date() : null,
          verified_by: params[5] === 'implemented_tested' ? params[7] : null,
          verification_evidence: JSON.parse(String(params[8])),
          updated_at: new Date()
        };
        if (existing) Object.assign(existing, row);
        else state.adapters.push(row);
        return ok([row as unknown as R]);
      }
      if (s.startsWith('UPDATE attendance.device_adapters')) {
        const a = state.adapters.find(x => x.adapter_id === params[0] && x.adapter_version === params[1]);
        if (!a) return ok<R>();
        a.verification_status = params[2];
        a.enabled = Boolean(params[3]);
        a.verification_evidence = JSON.parse(String(params[4]));
        a.verified_by = params[2] === 'implemented_tested' ? params[5] : null;
        a.verified_at = params[2] === 'implemented_tested' ? new Date() : null;
        return ok([a as unknown as R]);
      }

      // 4. Requests
      if (s.includes('FROM attendance.provisioning_requests') && s.includes('idempotency_key = $3')) {
        const reqRow = state.requests.find(r => r.tenant_id === params[0] && r.school_id === params[1] && r.idempotency_key === params[2]);
        return ok((reqRow ? [reqRow] : []) as unknown as R[]);
      }
      if (s.startsWith('SELECT * FROM attendance.provisioning_requests WHERE id = $1')) {
        const reqRow = state.requests.find(r => r.id === params[0]);
        return ok((reqRow ? [reqRow] : []) as unknown as R[]);
      }
      if (s.includes('FROM attendance.provisioning_requests WHERE id = $1')) {
        const reqRow = state.requests.find(r => r.id === params[0]);
        return ok((reqRow ? [reqRow] : []) as unknown as R[]);
      }
      if (s.startsWith('INSERT INTO attendance.provisioning_requests')) {
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          application_instance_id: params[2],
          idempotency_key: params[3],
          request_hash: params[4],
          device_category: params[5],
          device_model_id: params[6],
          quantity: params[7],
          intended_locations: JSON.parse(String(params[8])),
          intended_population: params[9],
          attendance_use_cases: params[10],
          preferred_integration_method: params[11],
          required_capabilities: params[12],
          requested_by: params[13],
          state: 'requested',
          retryable: false,
          attempt_count: 0,
          error_code: null,
          created_at: new Date(),
          updated_at: new Date()
        };
        state.requests.push(row);
        return ok([row as unknown as R]);
      }
      if (s.startsWith('UPDATE attendance.provisioning_requests SET state =')) {
        const reqRow = state.requests.find(r => r.id === params[params.length - 1]);
        if (!reqRow) return ok<R>();
        if (s.includes('error_code = $3')) {
          reqRow.state = params[1];
          reqRow.retryable = false;
          reqRow.error_code = params[2];
        } else if (s.includes("state = 'enrollment_pending'")) {
          reqRow.state = 'enrollment_pending';
        } else if (s.includes("state = 'configuration_pending'")) {
          reqRow.state = 'configuration_pending';
        } else if (s.includes("state = 'connection_verification'")) {
          reqRow.state = 'connection_verification';
        } else if (s.includes("state = 'integration_verification'")) {
          reqRow.state = 'integration_verification';
        } else if (s.includes("state = 'activation_pending'")) {
          reqRow.state = 'activation_pending';
        } else if (s.includes("state = 'active'")) {
          reqRow.state = 'active';
        } else if (s.includes('attempt_count = $3')) {
          reqRow.state = params[1];
          reqRow.attempt_count = params[2];
          reqRow.retryable = false;
        }
        reqRow.updated_at = new Date();
        return ok([reqRow as unknown as R]);
      }

      // 5. Locations, Devices, Credentials, Allocations
      if (s.startsWith('INSERT INTO attendance.installation_locations')) {
        let loc = state.locations.find(l => l.tenant_id === params[0] && l.school_id === params[1] && l.location_key === params[3]);
        if (!loc) {
          loc = { id: randomUUID(), tenant_id: params[0], school_id: params[1], location_key: params[3], display_name: params[4] };
          state.locations.push(loc);
        }
        return ok([loc as unknown as R]);
      }
      if (s.startsWith('INSERT INTO attendance.devices')) {
        const dev = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          device_identity: params[2],
          display_name: params[3],
          device_type: params[4],
          modalities: params[5],
          approved_location: params[6],
          location_id: params[7],
          allowed_event_types: params[8],
          permitted_population: params[9],
          catalogue_model_id: params[10],
          adapter_id: params[11],
          adapter_version: params[12],
          status: 'pending',
          enrollment_acknowledged_at: null,
          last_heartbeat_at: null
        };
        state.devices.push(dev);
        return ok([dev as unknown as R]);
      }
      if (s.startsWith('UPDATE attendance.devices SET enrollment_acknowledged_at =')) {
        const dev = state.devices.find(d => d.device_identity === params[1]);
        if (dev) {
          dev.enrollment_acknowledged_at = new Date();
          dev.status = 'enrolled';
        }
        return ok<R>();
      }
      if (s.startsWith('UPDATE attendance.devices SET status = \'active\'') || s.startsWith('UPDATE attendance.devices d SET status = \'active\'')) {
        if (s.includes('FROM attendance.device_allocations a')) {
          const allocDeviceIds = new Set(state.allocations.filter(a => a.provisioning_request_id === params[1]).map(a => a.device_id));
          for (const dev of state.devices) {
            if (allocDeviceIds.has(dev.id)) {
              dev.status = 'active';
              dev.last_heartbeat_at = new Date();
            }
          }
        } else {
          const dev = state.devices.find(d => d.id === params[1]);
          if (dev) {
            dev.status = 'active';
            dev.last_heartbeat_at = new Date();
          }
        }
        return ok<R>();
      }
      if (s.startsWith('UPDATE attendance.school_capabilities SET status = \'active\'')) {
        state.capabilityStatus = 'active';
        return ok<R>();
      }
      if (s.startsWith('INSERT INTO control_plane.attendance_device_credentials')) {
        state.credentials.push({
          device_identity: params[0],
          tenant_id: params[1],
          school_id: params[2],
          device_id: params[3],
          encrypted_signing_key: params[4],
          credential_version: 1,
          issued_by: params[5],
          revoked_at: null
        });
        return ok<R>();
      }
      if (s.startsWith('INSERT INTO control_plane.attendance_device_credential_history')) {
        state.credentialHistory.push({ device_identity: params[0], event_type: 'issued' });
        return ok<R>();
      }
      if (s.startsWith('INSERT INTO attendance.device_allocations')) {
        state.allocations.push({
          tenant_id: params[0],
          school_id: params[1],
          application_instance_id: params[2],
          device_id: params[3],
          provisioning_request_id: params[4],
          location_id: params[6],
          state: 'enrollment_pending'
        });
        return ok<R>();
      }
      if (s.startsWith('UPDATE attendance.device_allocations')) {
        const nextState = s.includes("SET state = 'enrolled'")
          ? 'enrolled'
          : s.includes("SET state = 'configured'")
            ? 'configured'
            : s.includes("SET state = 'active'")
              ? 'active'
              : null;
        if (nextState) {
          for (const a of state.allocations) {
            if (a.provisioning_request_id === params[1]) {
              a.state = nextState;
            }
          }
        }
        return ok<R>();
      }
      if (s.includes('SELECT count(*)::text AS count FROM attendance.device_allocations')) {
        const cnt = state.allocations.filter(a => a.provisioning_request_id === params[2] && a.state === 'active').length;
        return ok([{ count: String(cnt) } as unknown as R]);
      }
      if (s.includes('FROM attendance.device_allocations a JOIN attendance.devices d')) {
        if (s.includes('enrollment_acknowledged_at')) {
          const rows = state.allocations
            .filter(a => a.provisioning_request_id === params[1])
            .map(a => {
              const d = state.devices.find(dev => dev.id === a.device_id)!;
              return { device_identity: d.device_identity, enrollment_acknowledged_at: d.enrollment_acknowledged_at };
            });
          return ok(rows as unknown as R[]);
        }
        const rows = state.allocations
          .filter(a => a.provisioning_request_id === params[1])
          .map(a => {
            const d = state.devices.find(dev => dev.id === a.device_id)!;
            const c = state.credentials.find(cr => cr.device_identity === d.device_identity);
            return {
              device_id: d.id,
              device_identity: d.device_identity,
              location_id: a.location_id,
              approved_location: d.approved_location,
              credential_version: c?.credential_version ?? 1,
              status: d.status
            };
          });
        return ok(rows as unknown as R[]);
      }

      // 6. Steps & Audits
      if (s.startsWith('INSERT INTO attendance.provisioning_steps')) {
        const stepMatch = s.match(/'(compatibility|allocation|enrollment|configuration|connection_test|time_sync|event_delivery_test|attendance_acceptance_test)'/);
        const stepName = stepMatch ? stepMatch[1] : String(params[3]);
        const attemptNumber = stepMatch ? Number(params[3]) : Number(params[4]);
        const key = `${params[2]}:${stepName}:${attemptNumber}`;
        const existing = state.steps.find(x => `${x.request_id}:${x.step_name}:${x.attempt_number}` === key);
        const stepRow = {
          request_id: params[2],
          step_name: stepName,
          attempt_number: attemptNumber,
          status: s.includes("'succeeded'") ? 'succeeded' : s.includes("'pending'") ? 'pending' : String(params[4])
        };
        if (existing) Object.assign(existing, stepRow);
        else state.steps.push(stepRow);
        return ok<R>();
      }
      if (s.includes('FROM attendance.provisioning_steps')) {
        const rows = state.steps.filter(x => x.request_id === params[1] && x.status === 'succeeded');
        return ok(rows as unknown as R[]);
      }
      if (s.includes('FROM attendance.provisioning_audit_events WHERE request_id = $1 AND idempotency_key = $2')) {
        const match = state.auditEvents.find(a => a.request_id === params[0] && a.idempotency_key === params[1]);
        return ok((match ? [match] : []) as unknown as R[]);
      }
      if (s.startsWith('INSERT INTO attendance.provisioning_audit_events')) {
        state.auditEvents.push({
          request_id: params[2],
          action: params[3] || 'audit',
          new_state: params[5] || null,
          idempotency_key: params[6] || null,
          safe_details: typeof params[params.length - 1] === 'string' && String(params[params.length - 1]).startsWith('{')
            ? JSON.parse(String(params[params.length - 1]))
            : {}
        });
        return ok<R>();
      }
      if (s.startsWith('INSERT INTO attendance.catalogue_audit_events')) {
        state.catalogueAuditEvents.push({
          catalogue_model_id: params[0],
          action: s
        });
        return ok<R>();
      }
      if (s.includes('FROM attendance.provisioning_audit_events')) {
        return ok(state.auditEvents.filter(a => a.request_id === params[0]) as unknown as R[]);
      }

      return ok<R>();
    },
    release() {}
  };

  const pool: DatabasePool = {
    query: client.query,
    connect: async () => client,
    end: async () => {},
    on() { return this; }
  };

  return { pool, state };
}

class HardwareVerifiedTestAdapter extends VendorNeutralGatewayAdapter {
  override readonly verifiedHardware = true;
  override readonly verificationStatus = 'implemented_tested' as const;
  override readonly supportedFirmware = ['2.4.0'];
}

test('adapter registry blocks simulator adapters from production verification and preserves honest candidate catalogue', () => {
  const registry = new AttendanceAdapterRegistry();
  const sim = new SimulatorAttendanceAdapter();
  registry.register(sim);
  assert.throws(
    () => registry.assertProductionVerificationEligible(sim.adapterId, sim.adapterVersion, { testSuiteRunId: 'run-1', verifiedBy: 'admin' }),
    /SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED/
  );
  assert.ok(CANDIDATE_HARDWARE_MODELS.every(m => Boolean(m.manufacturer && m.model)));

  // VendorNeutralGatewayAdapter itself is NOT hardware-verified
  const gateway = new VendorNeutralGatewayAdapter('signed-gateway', '1.0.0');
  registry.register(gateway);
  assert.throws(
    () => registry.assertProductionVerificationEligible('signed-gateway', '1.0.0', {
      testSuiteRunId: 'ci-hardware-bench-01',
      verifiedBy: 'hardware-qa@curriculum.internal'
    }),
    /UNVERIFIED_HARDWARE_ADAPTER/
  );

  // Explicit hardware-verified adapter requires real verification evidence
  const verifiedAdapter = new HardwareVerifiedTestAdapter('verified-hw-gateway', '1.0.0');
  registry.register(verifiedAdapter);
  assert.throws(
    () => registry.assertProductionVerificationEligible('verified-hw-gateway', '1.0.0', {}),
    /ADAPTER_VERIFICATION_EVIDENCE_REQUIRED/
  );
  assert.doesNotThrow(() =>
    registry.assertProductionVerificationEligible('verified-hw-gateway', '1.0.0', {
      testSuiteRunId: 'ci-hardware-bench-01',
      verifiedBy: 'hardware-qa@curriculum.internal'
    })
  );
});

test('catalogue administration, adapter verification, compatibility validation, credential issuance, and step-gated execution work via HTTP router', async () => {
  const { pool, state } = createProvisioningMemoryPool();
  const registry = new AttendanceAdapterRegistry();
  registry.register(new HardwareVerifiedTestAdapter('verified-vendor-gw', '1.0.0'));
  registry.register(new SimulatorAttendanceAdapter());

  const repo = new AttendanceProvisioningRepository(pool, registry);
  const platform = platformPrincipal();

  const app = express();
  app.use(express.json());
  app.use('/platform/attendance', createAttendanceProvisioningRouter((req, res, next) => {
    if (req.get('Authorization') !== 'Bearer valid-platform-admin') {
      res.status(403).json({ success: false, code: 'FORBIDDEN' });
      return;
    }
    Object.assign(req, { trustedTenantContext: platform });
    next();
  }, () => repo));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/platform/attendance`;
  const headers = {
    Authorization: 'Bearer valid-platform-admin',
    'Content-Type': 'application/json'
  };

  try {
    // 1. Unauthenticated caller is rejected
    const anon = await fetch(`${base}/device-catalogue`);
    assert.equal(anon.status, 403);

    // 2. Simulator cannot be registered as implemented_tested
    const simRes = await fetch(`${base}/adapters`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        adapterId: 'attendance-simulator',
        adapterVersion: '1.0.0',
        manufacturer: 'Curriculum Internal',
        supportedModels: ['Sim-1'],
        capabilityManifest: { isSimulator: true },
        verificationStatus: 'implemented_tested',
        enabled: true,
        verificationEvidence: { testSuiteRunId: 'sim-1', verifiedBy: 'dev' }
      })
    });
    assert.equal(simRes.status, 400);
    assert.equal((await simRes.json()).code, 'SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');

    // 3. Register and verify production-eligible adapter
    const adapterRes = await fetch(`${base}/adapters`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        adapterId: 'verified-vendor-gw',
        adapterVersion: '1.0.0',
        manufacturer: 'VendorCorp',
        supportedModels: ['VC-RFID-200'],
        capabilityManifest: { offlineSync: true },
        verificationStatus: 'vendor_supported_not_integrated',
        enabled: false
      })
    });
    assert.equal(adapterRes.status, 201);

    const verifyRes = await fetch(`${base}/adapters/verified-vendor-gw/versions/1.0.0/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        verificationStatus: 'implemented_tested',
        enabled: true,
        verificationEvidence: { testSuiteRunId: 'bench-2026-11', verifiedBy: 'qa-lead@curriculum.internal' }
      })
    });
    assert.equal(verifyRes.status, 200);

    // 4. Create catalogue model + disable & re-enable
    const modelRes = await fetch(`${base}/device-catalogue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        manufacturer: 'VendorCorp',
        model: 'VC-RFID-200',
        category: 'rfid',
        modalities: ['rfid'],
        integrationMethod: 'signed_http',
        firmwareCompatibility: { supportedVersions: ['2.4.0'] },
        supportedEventTypes: ['school_arrival', 'school_departure'],
        offlineSync: true,
        credentialManagement: true,
        adapterId: 'verified-vendor-gw',
        adapterVersion: '1.0.0',
        verificationStatus: 'implemented_tested',
        verificationEvidence: { testSuiteRunId: 'bench-2026-11', verifiedBy: 'qa-lead@curriculum.internal' }
      })
    });
    assert.equal(modelRes.status, 201);
    const model = (await modelRes.json()).data;

    // 5. Create request while model disabled -> validate rejects cleanly
    await fetch(`${base}/device-catalogue/${model.id}/disable`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Recall check' })
    });
    const reqCreate1 = await fetch(`${base}/provisioning-requests`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'req-disabled-01' },
      body: JSON.stringify({
        applicationInstanceId: state.instanceId,
        request: {
          deviceCategory: 'rfid',
          deviceModelId: model.id,
          quantity: 1,
          intendedLocations: ['Main Gate'],
          intendedPopulation: 'students',
          attendanceUseCases: ['school_arrival'],
          preferredIntegrationMethod: 'signed_http'
        }
      })
    });
    assert.equal(reqCreate1.status, 200);
    const req1 = (await reqCreate1.json()).data;

    const val1 = await fetch(`${base}/provisioning-requests/${req1.id}/validate`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'val-disabled-01' },
      body: JSON.stringify({})
    });
    assert.equal(val1.status, 200);
    const val1Json = await val1.json();
    assert.equal(val1Json.data.compatible, false);
    assert.ok(val1Json.data.reasons.includes('MODEL_DISABLED'));

    // 6. Re-enable model, create request, validate, and execute without enrollment ack -> pauses honestly at enrollment step
    await fetch(`${base}/device-catalogue/${model.id}/enable`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Recall cleared' })
    });

    const reqCreate2 = await fetch(`${base}/provisioning-requests`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'req-active-0002' },
      body: JSON.stringify({
        applicationInstanceId: state.instanceId,
        request: {
          deviceCategory: 'rfid',
          deviceModelId: model.id,
          quantity: 1,
          intendedLocations: ['North Gate'],
          intendedPopulation: 'students',
          attendanceUseCases: ['school_arrival'],
          preferredIntegrationMethod: 'signed_http',
          requiredCapabilities: ['offline_sync']
        }
      })
    });
    const req2 = (await reqCreate2.json()).data;

    const val2 = await fetch(`${base}/provisioning-requests/${req2.id}/validate`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'val-active-0002' },
      body: JSON.stringify({ firmwareVersion: '2.4.0' })
    });
    assert.equal((await val2.json()).data.compatible, true);

    const execPaused = await fetch(`${base}/provisioning-requests/${req2.id}/execute`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'exec-step-1-only' },
      body: JSON.stringify({})
    });
    assert.equal(execPaused.status, 200);
    const execPausedJson = await execPaused.json();
    assert.equal(execPausedJson.data.blocked, true);
    assert.equal(execPausedJson.data.pendingStep, 'enrollment');
    assert.equal(execPausedJson.data.allocatedDevices.length, 1);
    assert.equal(state.credentials.length, 1);
    assert.ok(String(state.credentials[0].encrypted_signing_key).startsWith('v1.'));
    assert.equal(String(state.credentials[0].encrypted_signing_key).split('.').length, 5);

    const allocatedIdentity = execPausedJson.data.allocatedDevices[0].deviceIdentity;

    // 7. Activate school capability and provide real step evidence for all REQUIRED_ACTIVATION_STEPS -> device becomes active
    state.capabilityStatus = 'active';
    const execComplete = await fetch(`${base}/provisioning-requests/${req2.id}/execute`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'exec-step-complete' },
      body: JSON.stringify({
        evidence: {
          enrollmentAcknowledgedByDevices: {
            [allocatedIdentity]: { operationReference: 'enr-ref-1', acknowledgedAt: new Date().toISOString() }
          },
          configurationApplied: { operationReference: 'cfg-ref-1', configuredAt: new Date().toISOString() },
          connectionTestPassed: { operationReference: 'conn-ref-1', latencyMs: 14 },
          timeSyncPassed: { operationReference: 'ntp-ref-1', clockDriftMs: 18 },
          eventDeliveryTestPassed: { operationReference: 'evt-ref-1', testEventId: randomUUID() },
          attendanceAcceptanceTestPassed: { operationReference: 'uat-ref-1', scenarioCount: 3 }
        }
      })
    });
    assert.equal(execComplete.status, 200);
    const execCompleteJson = await execComplete.json();
    assert.equal(execCompleteJson.data.blocked, false);
    assert.equal(execCompleteJson.data.request.state, 'active');
    assert.ok(state.catalogueAuditEvents.length >= 3);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
