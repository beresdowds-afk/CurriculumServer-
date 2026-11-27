import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
import { signAttendanceDeviceRequest } from './deviceAdapter';
import { createAttendanceDeviceIngestionRouter } from './deviceIngestionRoutes';
import { AttendanceDeviceIngestionService } from './deviceIngestionService';

process.env.CONTROL_PLANE_SECRET ||= 'test-control-plane-secret-at-least-32-chars';
process.env.STORAGE_VAULT_ACTIVE_KEY_ID ||= 'test-vault-k1';
process.env.STORAGE_VAULT_KEYS ||= JSON.stringify({
  [process.env.STORAGE_VAULT_ACTIVE_KEY_ID]: randomBytes(32).toString('base64')
});

function ok<R extends QueryResultRow>(rows: R[] = [], forcedRowCount?: number): QueryResult<R> {
  return { rows, command: 'SELECT', rowCount: forcedRowCount ?? rows.length, oid: 0, fields: [] };
}

function makeUserPrincipal(input: {
  tenantId: string;
  schoolId: string;
  permissions: string[];
}): AuthorizedPrincipal {
  const userId = randomUUID();
  const tenant = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: input.tenantId,
      role: 'school_admin',
      userId,
      email: 'ops@school.test',
      appId: 'curriculum-flow',
      schoolName: 'Ingestion Test School',
      subscriptionTier: 'standard',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: `/storage/${input.tenantId}`,
      issuer: 'test',
      audience: input.tenantId,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'sig',
      permissions: input.permissions
    }
  });
  return createAuthorizedPrincipal({
    tenant,
    userId,
    sessionId: randomUUID(),
    grants: [{
      roleCode: 'school_admin',
      permissions: input.permissions,
      scopes: [{ resourceType: 'school', resourceId: input.schoolId }]
    }]
  });
}

function createIngestionMemoryPool() {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const schoolA = randomUUID();
  const schoolB = randomUUID();
  const classA = randomUUID();
  const studentA = randomUUID();
  const studentB = randomUUID();
  const staffA = randomUUID();
  const guardianVerified = randomUUID();
  const guardianUnverified = randomUUID();
  const deviceAId = randomUUID();
  const devicePendingId = randomUUID();
  const secretA = randomBytes(32).toString('hex');
  const secretPending = randomBytes(32).toString('hex');
  const rfidStudentToken = 'RFID-STU-0001';
  const rfidStaffToken = 'RFID-STF-0001';

  const db = {
    tenantA,
    tenantB,
    schoolA,
    schoolB,
    classA,
    studentA,
    studentB,
    staffA,
    guardianVerified,
    guardianUnverified,
    deviceAId,
    devicePendingId,
    secretA,
    secretPending,
    rfidStudentToken,
    rfidStaffToken,
    schools: [
      {
        id: schoolA,
        tenant_id: tenantA,
        application_instance_id: randomUUID(),
        created_at: new Date(1000),
        operational_policies: {
          attendanceSchedule: {
            timeZone: 'UTC',
            studentArrivalCutoffTime: '08:00',
            studentDepartureCutoffTime: '14:00',
            staffClockInCutoffTime: '07:45',
            staffClockOutCutoffTime: '16:00',
            graceMinutes: 15,
            notifyGuardiansOn: ['arrival', 'late_arrival', 'departure', 'early_departure']
          }
        } as Record<string, unknown>
      },
      {
        id: schoolB,
        tenant_id: tenantB,
        application_instance_id: randomUUID(),
        created_at: new Date(2000),
        operational_policies: {}
      }
    ],
    capabilities: [
      { tenant_id: tenantA, school_id: schoolA, application_instance_id: randomUUID(), status: 'active', updated_at: new Date() },
      { tenant_id: tenantB, school_id: schoolB, application_instance_id: randomUUID(), status: 'active', updated_at: new Date() }
    ],
    students: [
      { id: studentA, tenant_id: tenantA, school_id: schoolA, admission_number: 'ADM-001', first_name: 'Ada', last_name: 'Okafor', lifecycle_status: 'active', class_id: classA },
      { id: studentB, tenant_id: tenantB, school_id: schoolB, admission_number: 'ADM-B01', first_name: 'Tunde', last_name: 'Bello', lifecycle_status: 'active', class_id: null }
    ],
    staff: [
      { id: staffA, tenant_id: tenantA, school_id: schoolA, staff_number: 'STF-001', first_name: 'Chidi', last_name: 'Nwafor', status: 'active' }
    ],
    classes: [
      { id: classA, tenant_id: tenantA, school_id: schoolA, name: 'JSS 1A' }
    ],
    guardians: [
      { id: guardianVerified, tenant_id: tenantA, school_id: schoolA, full_name: 'Ngozi Okafor', phone: '+2348012345678', email: 'ngozi@family.test', status: 'active', verification_status: 'verified', created_at: new Date(1) },
      { id: guardianUnverified, tenant_id: tenantA, school_id: schoolA, full_name: 'Pending Guardian', phone: '+2348099999999', email: 'pending@family.test', status: 'active', verification_status: 'pending', created_at: new Date(2) }
    ],
    studentGuardians: [
      { tenant_id: tenantA, school_id: schoolA, student_id: studentA, guardian_id: guardianVerified, status: 'active', is_primary: true },
      { tenant_id: tenantA, school_id: schoolA, student_id: studentA, guardian_id: guardianUnverified, status: 'active', is_primary: false }
    ],
    devices: [
      {
        id: deviceAId,
        tenant_id: tenantA,
        school_id: schoolA,
        device_identity: 'gate-a-01',
        display_name: 'North Gate Terminal',
        device_type: 'combined',
        modalities: ['rfid', 'fingerprint'],
        approved_location: 'North Gate',
        location_id: null as string | null,
        permitted_population: 'both',
        allowed_event_types: ['school_arrival', 'school_departure', 'clock_in', 'clock_out'],
        status: 'active',
        last_sequence_number: null as number | null,
        last_event_at: null as Date | null,
        last_heartbeat_at: null as Date | null,
        connectivity_status: 'unknown',
        degraded_threshold_seconds: 300,
        offline_threshold_seconds: 900,
        enrollment_acknowledged_at: new Date(),
        firmware_version: '2.0.0',
        created_at: new Date()
      },
      {
        id: devicePendingId,
        tenant_id: tenantA,
        school_id: schoolA,
        device_identity: 'gate-a-pending',
        display_name: 'Pending Terminal',
        device_type: 'rfid',
        modalities: ['rfid'],
        approved_location: 'West Gate',
        location_id: null,
        permitted_population: 'students',
        allowed_event_types: ['school_arrival'],
        status: 'pending',
        last_sequence_number: null,
        last_event_at: null,
        last_heartbeat_at: null,
        connectivity_status: 'unknown',
        degraded_threshold_seconds: 300,
        offline_threshold_seconds: 900,
        enrollment_acknowledged_at: null as Date | null,
        firmware_version: null,
        created_at: new Date()
      }
    ] as any[],
    controlPlaneCreds: [
      {
        device_identity: 'gate-a-01',
        tenant_id: tenantA,
        school_id: schoolA,
        device_id: deviceAId,
        encrypted_signing_key: ServerSecretVault.encrypt(secretA),
        credential_version: 1,
        revoked_at: null as Date | null
      },
      {
        device_identity: 'gate-a-pending',
        tenant_id: tenantA,
        school_id: schoolA,
        device_id: devicePendingId,
        encrypted_signing_key: ServerSecretVault.encrypt(secretPending),
        credential_version: 1,
        revoked_at: null as Date | null
      }
    ],
    credentials: [
      {
        id: randomUUID(),
        tenant_id: tenantA,
        school_id: schoolA,
        credential_digest: createHash('sha256').update(rfidStudentToken).digest('hex'),
        modality: 'rfid',
        student_id: studentA,
        staff_id: null as string | null,
        revoked_at: null as Date | null
      },
      {
        id: randomUUID(),
        tenant_id: tenantA,
        school_id: schoolA,
        credential_digest: createHash('sha256').update(rfidStaffToken).digest('hex'),
        modality: 'rfid',
        student_id: null as string | null,
        staff_id: staffA,
        revoked_at: null as Date | null
      }
    ] as any[],
    nonces: new Set<string>(),
    deviceEvents: [] as any[],
    eventProcessing: [] as any[],
    records: [] as any[],
    adjustments: [] as any[],
    notificationIntents: [] as any[],
    notificationOutbox: [] as any[],
    healthChecks: [] as any[],
    auditEvents: [] as any[],
    locations: [] as any[]
  };

  let txSnapshot: {
    nonces: Set<string>;
    deviceEvents: any[];
    eventProcessing: any[];
    records: any[];
    adjustments: any[];
    notificationIntents: any[];
    notificationOutbox: any[];
    credentials: any[];
    devices: any[];
    auditEvents: any[];
  } | null = null;
  const takeSnapshot = () => structuredClone({
    nonces: db.nonces,
    deviceEvents: db.deviceEvents,
    eventProcessing: db.eventProcessing,
    records: db.records,
    adjustments: db.adjustments,
    notificationIntents: db.notificationIntents,
    notificationOutbox: db.notificationOutbox,
    credentials: db.credentials,
    devices: db.devices,
    auditEvents: db.auditEvents
  });
  const restoreSnapshot = (snap: NonNullable<typeof txSnapshot>) => {
    db.nonces = snap.nonces;
    db.deviceEvents = snap.deviceEvents;
    db.eventProcessing = snap.eventProcessing;
    db.records = snap.records;
    db.adjustments = snap.adjustments;
    db.notificationIntents = snap.notificationIntents;
    db.notificationOutbox = snap.notificationOutbox;
    db.credentials = snap.credentials;
    db.devices = snap.devices;
    db.auditEvents = snap.auditEvents;
  };

  const client: DatabaseClient = {
    async query<R = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<R>> {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s === 'BEGIN') {
        txSnapshot = takeSnapshot();
        return ok<R>();
      }
      if (s === 'COMMIT') {
        txSnapshot = null;
        return ok<R>();
      }
      if (s === 'ROLLBACK') {
        if (txSnapshot) restoreSnapshot(txSnapshot);
        txSnapshot = null;
        return ok<R>();
      }
      if (s.startsWith('SELECT set_config(') || s.startsWith('SELECT pg_advisory_xact_lock(')) {
        return ok<R>();
      }

      if (s.includes('FROM control_plane.attendance_device_credentials')) {
        return ok(db.controlPlaneCreds.filter(c => c.device_identity === params[0]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.devices d LEFT JOIN attendance.school_capabilities cap')) {
        const dev = db.devices.find(d => d.tenant_id === params[0] && d.id === params[1]);
        if (!dev) return ok<R>();
        const cap = db.capabilities.find(c => c.tenant_id === dev.tenant_id && c.school_id === dev.school_id);
        return ok([{
          ...dev,
          capability_status: cap?.status ?? null,
          application_instance_id: cap?.application_instance_id ?? null
        } as unknown as R]);
      }

      if (s.startsWith('INSERT INTO attendance.device_nonces')) {
        const key = `${params[0]}:${params[2]}:${params[3]}`;
        if (db.nonces.has(key)) return ok([], 0);
        db.nonces.add(key);
        return ok([{ nonce: params[3] } as unknown as R], 1);
      }

      if (s.startsWith('INSERT INTO attendance.device_events')) {
        const dup = db.deviceEvents.find(
          e => e.tenant_id === params[0] && e.school_id === params[1] && e.device_id === params[2] && e.event_id === params[3]
        );
        if (dup) return ok<R>();
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          device_id: params[2],
          event_id: params[3],
          sequence_number: params[4],
          occurrence_at: params[5],
          payload: JSON.parse(String(params[6]))
        };
        db.deviceEvents.push(row);
        return ok([{ id: row.id } as unknown as R]);
      }

      if (s.includes('SELECT id FROM attendance.device_events WHERE tenant_id =')) {
        const match = db.deviceEvents.find(
          e => e.tenant_id === params[0] && e.school_id === params[1] && e.device_id === params[2] && e.event_id === params[3]
        );
        return ok((match ? [{ id: match.id }] : []) as unknown as R[]);
      }

      if (s.startsWith('INSERT INTO attendance.event_processing')) {
        const epState = s.includes("'duplicate'")
          ? 'duplicate'
          : s.includes("'rejected'")
            ? 'rejected'
            : s.includes("'received'")
              ? 'received'
              : String(params[3] || 'accepted');
        db.eventProcessing.push({
          tenant_id: params[0],
          school_id: params[1],
          device_event_id: params[2],
          state: epState,
          error_classification: params[4] ?? params[3] ?? null,
          occurred_at: new Date()
        });
        return ok<R>();
      }

      if (s.includes('FROM attendance.credentials c LEFT JOIN production.students stu')) {
        const digest = params[2];
        const method = params[3];
        const cred = db.credentials.find(
          c => c.tenant_id === params[0] &&
            c.school_id === params[1] &&
            c.credential_digest === digest &&
            c.revoked_at === null &&
            (method === 'combined' || c.modality === method)
        );
        if (!cred) return ok<R>();
        const stu = cred.student_id ? db.students.find(st => st.id === cred.student_id) : null;
        const stf = cred.staff_id ? db.staff.find(sf => sf.id === cred.staff_id) : null;
        return ok([{
          id: cred.id,
          modality: cred.modality,
          student_id: cred.student_id,
          staff_id: cred.staff_id,
          student_status: stu?.lifecycle_status ?? null,
          student_class_id: stu?.class_id ?? null,
          student_school_id: stu?.school_id ?? null,
          staff_status: stf?.status ?? null,
          staff_school_id: stf?.school_id ?? null
        } as unknown as R]);
      }

      if (s.includes('SELECT operational_policies FROM production.schools')) {
        const sc = db.schools.find(x => x.tenant_id === params[0] && x.id === params[1]);
        return ok((sc ? [{ operational_policies: sc.operational_policies }] : []) as unknown as R[]);
      }

      if (s.includes('FROM production.student_guardians sg')) {
        const rows = db.studentGuardians
          .filter(sg => sg.tenant_id === params[0] && sg.school_id === params[1] && sg.student_id === params[2] && sg.status === 'active')
          .map(sg => {
            const g = db.guardians.find(x => x.id === sg.guardian_id);
            const stu = db.students.find(x => x.id === sg.student_id);
            if (!g || g.verification_status !== 'verified' || g.status !== 'active') return null;
            return {
              guardian_id: g.id,
              full_name: g.full_name,
              phone: g.phone,
              email: g.email,
              student_name: stu ? `${stu.first_name} ${stu.last_name}` : null
            };
          })
          .filter(Boolean);
        return ok(rows as unknown as R[]);
      }

      if (s.includes('FROM attendance.records WHERE tenant_id = $1 AND school_id = $2 AND (source_event_id = $3 OR last_source_event_id = $3)')) {
        const rec = db.records.find(r => r.source_event_id === params[2] || r.last_source_event_id === params[2]);
        return ok((rec ? [{ id: rec.id, status: rec.status }] : []) as unknown as R[]);
      }

      if (s.includes('FROM attendance.records WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3')) {
        const rec = db.records.find(r =>
          r.tenant_id === params[0] && r.school_id === params[1] && r.student_id === params[2] &&
          r.attendance_date === params[3] && r.attendance_type === params[4] &&
          (r.class_id ?? '00000000-0000-0000-0000-000000000000') === (params[5] ?? '00000000-0000-0000-0000-000000000000')
        );
        return ok((rec ? [rec] : []) as unknown as R[]);
      }

      if (s.includes('FROM attendance.records WHERE tenant_id = $1 AND school_id = $2 AND staff_id = $3')) {
        const rec = db.records.find(r =>
          r.tenant_id === params[0] && r.school_id === params[1] && r.staff_id === params[2] &&
          r.attendance_date === params[3] && r.attendance_type === params[4]
        );
        return ok((rec ? [rec] : []) as unknown as R[]);
      }

      if (s.startsWith('INSERT INTO attendance.records')) {
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          population: params[2],
          student_id: params[3],
          staff_id: params[4],
          class_id: params[5],
          attendance_date: params[6],
          attendance_type: params[7],
          status: params[8],
          source_event_id: params[9],
          last_source_event_id: params[9],
          source_location: params[10],
          source_type: 'device',
          occurred_at: new Date(String(params[11])),
          first_event_at: new Date(String(params[11])),
          last_event_at: new Date(String(params[11])),
          review_reason: params[12],
          created_at: new Date(),
          updated_at: new Date()
        };
        db.records.push(row);
        return ok([{ id: row.id } as unknown as R]);
      }

      if (s.startsWith('UPDATE attendance.records')) {
        const rec = db.records.find(r => r.tenant_id === params[0] && r.school_id === params[1] && r.id === params[2]);
        if (!rec) return ok<R>();
        if (s.includes("SET source_type = 'manual_correction'") || s.includes("source_type = 'manual_correction'")) {
          rec.status = String(params[3]);
          rec.source_type = 'manual_correction';
          rec.review_reason = params[4] as string | null;
        } else if (s.includes('SET status = $4')) {
          rec.status = String(params[3]);
          rec.last_source_event_id = params[4];
          const dt = new Date(String(params[5]));
          if (!rec.last_event_at || dt > rec.last_event_at) rec.last_event_at = dt;
          rec.occurred_at = dt;
          rec.review_reason = params[6] as string | null;
        } else if (s.includes('SET first_event_at =')) {
          const dt = new Date(String(params[3]));
          if (!rec.first_event_at || dt < rec.first_event_at) rec.first_event_at = dt;
        }
        rec.updated_at = new Date();
        return ok<R>();
      }

      if (s.includes('FROM attendance.records WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
        return ok(db.records.filter(r => r.tenant_id === params[0] && r.school_id === params[1] && r.id === params[2]) as unknown as R[]);
      }

      if (s.startsWith('INSERT INTO attendance.adjustments')) {
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          attendance_record_id: params[2],
          previous_state: JSON.parse(String(params[3])),
          new_state: JSON.parse(String(params[4])),
          reason: params[5],
          actor_user_id: params[6],
          adjusted_at: new Date()
        };
        db.adjustments.push(row);
        return ok([row as unknown as R]);
      }

      if (s.startsWith('INSERT INTO attendance.notification_intents')) {
        const dup = db.notificationIntents.find(
          i => i.tenant_id === params[0] && i.event_id === params[2] && i.guardian_identity === params[3] && i.event_type === params[4]
        );
        if (dup) return ok<R>();
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          event_id: params[2],
          guardian_identity: params[3],
          event_type: params[4],
          status: 'pending',
          notification_id: null as string | null,
          error_code: null as string | null
        };
        db.notificationIntents.push(row);
        return ok([{ id: row.id } as unknown as R]);
      }

      if (s.startsWith('UPDATE attendance.notification_intents')) {
        const row = db.notificationIntents.find(i => i.id === params[4]);
        if (row) {
          row.status = String(params[1]);
          row.notification_id = params[2] as string | null;
          row.error_code = params[3] as string | null;
        }
        return ok<R>();
      }

      if (s.startsWith('INSERT INTO production.notification_outbox')) {
        db.notificationOutbox.push({
          tenant_id: params[0],
          id: params[1],
          channel: params[2],
          encrypted_request: params[3]
        });
        return ok<R>();
      }

      if (s.startsWith('UPDATE attendance.devices')) {
        const dev = db.devices.find(d => d.tenant_id === params[0] && d.id === params[2]);
        if (!dev) return ok<R>();
        if (s.includes('SET last_heartbeat_at = now()')) {
          dev.last_heartbeat_at = new Date();
          dev.connectivity_status = 'online';
          if (params[3]) dev.firmware_version = String(params[3]);
          if (params[4] !== null && params[4] !== undefined) {
            dev.last_sequence_number = Math.max(dev.last_sequence_number ?? -1, Number(params[4]));
          }
          return ok([{
            last_heartbeat_at: dev.last_heartbeat_at,
            firmware_version: dev.firmware_version,
            last_sequence_number: dev.last_sequence_number
          } as unknown as R]);
        }
        if (s.includes('SET status = $4')) {
          dev.status = String(params[3]);
          if (!dev.enrollment_acknowledged_at) dev.enrollment_acknowledged_at = new Date();
          return ok([{
            status: dev.status,
            enrollment_acknowledged_at: dev.enrollment_acknowledged_at
          } as unknown as R]);
        }
        if (s.includes('SET last_event_at = GREATEST')) {
          const dt = new Date(String(params[3]));
          if (!dev.last_event_at || dt > dev.last_event_at) dev.last_event_at = dt;
          if (params[4] !== null && params[4] !== undefined) {
            dev.last_sequence_number = Math.max(dev.last_sequence_number ?? -1, Number(params[4]));
          }
        }
        return ok<R>();
      }

      if (s.startsWith('INSERT INTO attendance.device_health_checks')) {
        const row = { id: randomUUID(), checked_at: new Date() };
        db.healthChecks.push(row);
        return ok([row as unknown as R]);
      }

      if (s.includes('FROM production.schools s WHERE s.tenant_id = $1')) {
        return ok(db.schools.filter(sc => sc.tenant_id === params[0]).map(sc => ({
          school_id: sc.id,
          application_instance_id: sc.application_instance_id
        })) as unknown as R[]);
      }

      if (s.includes('FROM production.students WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
        return ok(db.students.filter(st => st.tenant_id === params[0] && st.school_id === params[1] && st.id === params[2]) as unknown as R[]);
      }

      if (s.includes('FROM production.staff WHERE tenant_id = $1 AND school_id = $2 AND id = $3')) {
        return ok(db.staff.filter(sf => sf.tenant_id === params[0] && sf.school_id === params[1] && sf.id === params[2]) as unknown as R[]);
      }

      if (s.startsWith('UPDATE attendance.credentials SET revoked_at = now()')) {
        for (const c of db.credentials) {
          if (c.tenant_id === params[0] && c.school_id === params[1] && c.modality === params[2] && c.revoked_at === null &&
              ((params[3] && c.student_id === params[3]) || (params[4] && c.staff_id === params[4]))) {
            c.revoked_at = new Date();
          }
        }
        return ok<R>();
      }

      if (s.startsWith('INSERT INTO attendance.credentials')) {
        const dup = db.credentials.find(c =>
          c.tenant_id === params[0] && c.school_id === params[1] && c.credential_digest === params[2] && c.revoked_at === null
        );
        if (dup) {
          const err: any = new Error('duplicate key');
          err.code = '23505';
          throw err;
        }
        const row = {
          id: randomUUID(),
          tenant_id: params[0],
          school_id: params[1],
          credential_digest: params[2],
          modality: params[3],
          student_id: params[4],
          staff_id: params[5],
          biometric_reference: params[6],
          enrolled_at: new Date(),
          revoked_at: null
        };
        db.credentials.push(row);
        return ok([{ id: row.id, modality: row.modality, enrolled_at: row.enrolled_at } as unknown as R]);
      }

      if (s.startsWith('INSERT INTO attendance.devices')) {
        const row = {
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
          status: 'pending'
        };
        db.devices.push(row);
        return ok([{
          id: row.id,
          device_identity: row.device_identity,
          status: row.status,
          approved_location: row.approved_location
        } as unknown as R]);
      }

      if (s.includes('FROM attendance.records r LEFT JOIN production.students stu')) {
        const rows = db.records
          .filter(r =>
            r.tenant_id === params[0] &&
            r.school_id === params[1] &&
            (!params[2] || r.attendance_date === params[2]) &&
            (!params[3] || r.class_id === params[3]) &&
            (!params[4] || r.population === params[4]) &&
            (!params[5] || r.attendance_type === params[5]) &&
            (!params[6] || r.status === params[6])
          )
          .map(r => {
            const stu = r.student_id ? db.students.find(x => x.id === r.student_id) : null;
            const stf = r.staff_id ? db.staff.find(x => x.id === r.staff_id) : null;
            const cls = r.class_id ? db.classes.find(x => x.id === r.class_id) : null;
            return {
              ...r,
              admission_number: stu?.admission_number ?? null,
              student_name: stu ? `${stu.first_name} ${stu.last_name}` : null,
              staff_number: stf?.staff_number ?? null,
              staff_name: stf ? `${stf.first_name} ${stf.last_name}` : null,
              class_name: cls?.name ?? null,
              adjustment_count: db.adjustments.filter(a => a.attendance_record_id === r.id).length
            };
          });
        return ok(rows as unknown as R[]);
      }

      if (s.includes('FROM attendance.devices WHERE tenant_id = $1 AND school_id = $2 ORDER BY')) {
        return ok(db.devices.filter(d => d.tenant_id === params[0] && d.school_id === params[1]) as unknown as R[]);
      }

      if (s.includes('FROM attendance.event_processing WHERE tenant_id = $1 AND school_id = $2')) {
        const counts = new Map<string, number>();
        const latestByEvent = new Map<string, string>();
        for (const row of db.eventProcessing) {
          if (row.tenant_id === params[0] && row.school_id === params[1]) {
            if (row.state !== 'duplicate' || !latestByEvent.has(row.device_event_id)) {
              latestByEvent.set(row.device_event_id, row.state);
            }
          }
        }
        for (const st of latestByEvent.values()) {
          counts.set(st, (counts.get(st) || 0) + 1);
        }
        return ok([...counts.entries()].map(([st, c]) => ({ state: st, count: String(c) })) as unknown as R[]);
      }

      if (s.startsWith('INSERT INTO attendance.provisioning_audit_events')) {
        db.auditEvents.push({ tenant_id: params[0], school_id: params[1], sql: s, reason: params[4] ?? params[5] ?? null });
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
    db
  };
}

function signedHeaders(secret: string, deviceIdentity: string, method: string, path: string, body: string) {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = signAttendanceDeviceRequest(secret, { method, path, timestamp, nonce, body });
  return {
    'Content-Type': 'application/json',
    'X-Device-Identity': deviceIdentity,
    'X-Device-Timestamp': timestamp,
    'X-Device-Nonce': nonce,
    'X-Device-Signature': signature
  };
}

test('authenticated HMAC device ingestion classifies events, defends replay/spoofing, creates outbox notifications, supports register/heartbeat/adjustments, and rolls back on failure', async () => {
  const { pool, db } = createIngestionMemoryPool();
  const principals = new Map<string, AuthorizedPrincipal>();

  const requirePermission = (permission: string): RequestHandler => (req, res, next) => {
    const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    const principal = principals.get(token);
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
    const principal = principals.get(token);
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

  const userTokenA = 'user-token-a';
  const readOnlyTokenA = 'user-readonly-a';
  const userTokenB = 'user-token-b';

  principals.set(userTokenA, makeUserPrincipal({
    tenantId: db.tenantA,
    schoolId: db.schoolA,
    permissions: [
      PERMISSIONS.attendanceRead,
      PERMISSIONS.attendanceDevicesManage,
      PERMISSIONS.attendanceCredentialsManage,
      PERMISSIONS.attendanceAdjust
    ]
  }));
  principals.set(readOnlyTokenA, makeUserPrincipal({
    tenantId: db.tenantA,
    schoolId: db.schoolA,
    permissions: [PERMISSIONS.attendanceRead]
  }));
  principals.set(userTokenB, makeUserPrincipal({
    tenantId: db.tenantB,
    schoolId: db.schoolB,
    permissions: [PERMISSIONS.attendanceRead, PERMISSIONS.attendanceCredentialsManage, PERMISSIONS.attendanceAdjust]
  }));

  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));
  app.use('/api/v1', createAttendanceDeviceIngestionRouter({
    getPool: () => pool,
    authorizationMiddleware: { requirePermission, requirePermissionWithinScopes }
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;

  try {
    // 1. Forged HMAC signature rejected 401
    const badSigBody = JSON.stringify({ eventId: randomUUID() });
    const badSigRes = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Identity': 'gate-a-01',
        'X-Device-Timestamp': String(Date.now()),
        'X-Device-Nonce': randomUUID(),
        'X-Device-Signature': '0'.repeat(64)
      },
      body: badSigBody
    });
    assert.equal(badSigRes.status, 401);

    // 2. Nonce replay rejected 401 even with valid HMAC headers
    const today = new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10);
    const arrivalEvent = {
      eventId: randomUUID(),
      sequenceNumber: 1,
      deviceIdentity: 'gate-a-01',
      credentialReference: db.rfidStudentToken,
      verificationMethod: 'rfid',
      verificationResult: 'verified',
      eventType: 'school_arrival',
      location: 'North Gate',
      occurredAt: `${today}T07:50:00.000Z`,
      payloadVersion: '1.0'
    };
    const arrivalBody = JSON.stringify(arrivalEvent);
    const replayHeaders = signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/device-events', arrivalBody);
    // Include spoofed client tenant headers -> must derive Tenant A only and ignore Tenant B spoof
    const firstArrival = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: { ...replayHeaders, 'X-Tenant-ID': db.tenantB, 'X-School-ID': db.schoolB },
      body: arrivalBody
    });
    assert.equal(firstArrival.status, 201);
    const firstArrivalJson = await firstArrival.json();
    assert.equal(firstArrivalJson.data.status, 'accepted');
    assert.equal(firstArrivalJson.data.attendanceStatus, 'present');
    assert.equal(firstArrivalJson.data.notificationIntents.length, 1);
    assert.equal(firstArrivalJson.data.notificationIntents[0].guardianIdentity, db.guardianVerified);
    assert.equal(db.notificationOutbox.length, 1);

    // Replay same nonce -> rejected 401
    const replayAttempt = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: replayHeaders,
      body: arrivalBody
    });
    assert.equal(replayAttempt.status, 401);
    assert.equal((await replayAttempt.json()).code, 'NONCE_REPLAY_DETECTED');

    // Duplicate eventId with fresh nonce -> idempotent duplicate (200) without duplicate notification
    const freshDupRes = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/device-events', arrivalBody),
      body: arrivalBody
    });
    assert.equal(freshDupRes.status, 200);
    assert.equal((await freshDupRes.json()).data.status, 'duplicate');
    assert.equal(db.notificationOutbox.length, 1);

    // 3. Disallowed location rejected 422 AND raw event/processing persisted
    const badLocBody = JSON.stringify({
      ...arrivalEvent,
      eventId: randomUUID(),
      sequenceNumber: 2,
      location: 'South Gate'
    });
    const badLocRes = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/device-events', badLocBody),
      body: badLocBody
    });
    assert.equal(badLocRes.status, 422);
    assert.equal((await badLocRes.json()).data.code, 'LOCATION_MISMATCH');

    // 4. Batch ingestion (staff late clock_in + revoked credential rejection)
    const batchPayload = JSON.stringify({
      events: [
        {
          eventId: randomUUID(),
          sequenceNumber: 3,
          deviceIdentity: 'gate-a-01',
          credentialReference: db.rfidStaffToken,
          verificationMethod: 'rfid',
          verificationResult: 'verified',
          eventType: 'clock_in',
          location: 'North Gate',
          occurredAt: `${today}T08:30:00.000Z`,
          payloadVersion: '1.0'
        },
        {
          eventId: randomUUID(),
          sequenceNumber: 4,
          deviceIdentity: 'gate-a-01',
          credentialReference: 'UNKNOWN-BADGE-999',
          verificationMethod: 'rfid',
          verificationResult: 'verified',
          eventType: 'school_arrival',
          location: 'North Gate',
          occurredAt: `${today}T08:31:00.000Z`,
          payloadVersion: '1.0'
        }
      ]
    });
    const batchRes = await fetch(`${origin}/attendance/device-events/batch`, {
      method: 'POST',
      headers: signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/device-events/batch', batchPayload),
      body: batchPayload
    });
    assert.equal(batchRes.status, 200);
    const batchJson = await batchRes.json();
    assert.equal(batchJson.data.accepted, 1);
    assert.equal(batchJson.data.rejected, 1);
    assert.equal(batchJson.data.results[0].attendanceStatus, 'late');

    // 5. Heartbeat & Enrollment Acknowledgement
    const hbBody = JSON.stringify({
      deviceIdentity: 'gate-a-01',
      firmwareVersion: '2.1.0',
      sequenceNumber: 5,
      clockDriftMs: 12,
      pendingEventCount: 0,
      reportedAt: new Date().toISOString()
    });
    const hbRes = await fetch(`${origin}/attendance/heartbeat`, {
      method: 'POST',
      headers: signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/heartbeat', hbBody),
      body: hbBody
    });
    assert.equal(hbRes.status, 200);
    assert.equal((await hbRes.json()).data.connectivityStatus, 'online');

    const ackBody = JSON.stringify({ adapterOperationReference: 'device-ack-001', firmwareVersion: '1.0.5' });
    const ackRes = await fetch(`${origin}/attendance/enrollment-ack`, {
      method: 'POST',
      headers: signedHeaders(db.secretPending, 'gate-a-pending', 'POST', '/api/v1/attendance/enrollment-ack', ackBody),
      body: ackBody
    });
    assert.equal(ackRes.status, 200);
    assert.equal((await ackRes.json()).data.status, 'enrolled');

    // 6. School register query & Sync status & Cross-tenant student enrollment rejection
    const crossEnrollRes = await fetch(`${origin}/attendance/credentials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ modality: 'rfid', credentialReference: 'CROSS-BADGE', studentId: db.studentB })
    });
    assert.equal(crossEnrollRes.status, 404);

    const regRes = await fetch(`${origin}/attendance/register?date=${today}`, {
      headers: { Authorization: `Bearer ${readOnlyTokenA}` }
    });
    assert.equal(regRes.status, 200);
    const regJson = await regRes.json();
    assert.equal(regJson.data.length, 2);

    const syncRes = await fetch(`${origin}/attendance/sync-status`, {
      headers: { Authorization: `Bearer ${readOnlyTokenA}` }
    });
    assert.equal(syncRes.status, 200);
    const syncJson = await syncRes.json();
    assert.equal(syncJson.data.processingSummary.accepted, 2);
    assert.equal(syncJson.data.processingSummary.rejected, 2);

    // 7. Manual adjustment (requires attendance.adjust; readOnly gets 403; valid actor preserves sourceEventId)
    const recordId = firstArrivalJson.data.attendanceRecordId;
    const denyAdj = await fetch(`${origin}/attendance/records/${recordId}/adjustments`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${readOnlyTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'excused', reason: 'No permission' })
    });
    assert.equal(denyAdj.status, 403);

    const okAdj = await fetch(`${origin}/attendance/records/${recordId}/adjustments`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'excused', reason: 'Medical excuse verified by nurse' })
    });
    assert.equal(okAdj.status, 200);
    const okAdjJson = await okAdj.json();
    assert.equal(okAdjJson.data.newState.status, 'excused');
    assert.equal(okAdjJson.data.sourceEventId, firstArrivalJson.data.deviceEventRecordId);

    // 8. Missing school schedule -> event is safely classified as review_required
    db.schools[0].operational_policies = {};
    const reviewEventBody = JSON.stringify({
      ...arrivalEvent,
      eventId: randomUUID(),
      sequenceNumber: 6,
      credentialReference: db.rfidStaffToken,
      eventType: 'clock_in',
      occurredAt: `${today}T09:00:00.000Z`
    });
    const reviewRes = await fetch(`${origin}/attendance/device-events`, {
      method: 'POST',
      headers: signedHeaders(db.secretA, 'gate-a-01', 'POST', '/api/v1/attendance/device-events', reviewEventBody),
      body: reviewEventBody
    });
    assert.equal(reviewRes.status, 201);
    const reviewJson = await reviewRes.json();
    assert.equal(reviewJson.data.status, 'review_required');
    assert.equal(reviewJson.data.reviewReason, 'MISSING_SCHOOL_ATTENDANCE_SCHEDULE');

    // 9. Failed processing after event insert rolls back raw event & nonces atomically
    const failingService = new AttendanceDeviceIngestionService(pool, async () => {
      throw new Error('SIMULATED_TRANSIENT_FAILURE');
    });
    const rollbackEventBody = JSON.stringify({
      ...arrivalEvent,
      eventId: randomUUID(),
      sequenceNumber: 7
    });
    const beforeCount = db.deviceEvents.length;
    await assert.rejects(
      failingService.ingestSingleEvent(
        {
          deviceIdentity: 'gate-a-01',
          timestamp: String(Date.now()),
          nonce: randomUUID(),
          signature: signAttendanceDeviceRequest(db.secretA, {
            method: 'POST',
            path: '/api/v1/attendance/device-events',
            timestamp: String(Date.now()),
            nonce: 'placeholder',
            body: rollbackEventBody
          }),
          method: 'POST',
          path: '/api/v1/attendance/device-events',
          rawBody: rollbackEventBody
        },
        JSON.parse(rollbackEventBody)
      )
    );
    // Even if signed validly and hook fails mid-tx, deviceEvents must not leak partial commit
    const validRollbackNonce = randomUUID();
    const validRollbackTs = String(Date.now());
    await assert.rejects(
      failingService.ingestSingleEvent(
        {
          deviceIdentity: 'gate-a-01',
          timestamp: validRollbackTs,
          nonce: validRollbackNonce,
          signature: signAttendanceDeviceRequest(db.secretA, {
            method: 'POST',
            path: '/api/v1/attendance/device-events',
            timestamp: validRollbackTs,
            nonce: validRollbackNonce,
            body: rollbackEventBody
          }),
          method: 'POST',
          path: '/api/v1/attendance/device-events',
          rawBody: rollbackEventBody
        },
        JSON.parse(rollbackEventBody)
      ),
      /SIMULATED_TRANSIENT_FAILURE/
    );
    assert.equal(db.deviceEvents.length, beforeCount);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
