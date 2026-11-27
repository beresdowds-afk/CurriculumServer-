import { createHash, randomUUID } from 'node:crypto';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  createVerifiedTenantPrincipal,
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { validateNotificationRequest } from '../notifications/providers';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { validateNormalizedHeartbeat } from './adapterRegistry';
import {
  CanonicalGatewayAdapter,
  type AttendanceEventType,
  type NormalizedAttendanceEvent,
  verifyAttendanceDeviceRequest
} from './deviceAdapter';
import { AttendanceDeviceManagementError, resolveAuthorizedSchoolId } from './deviceManagementService';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;
const hhmmPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const tokenPattern = /^[A-Za-z0-9._:-]{1,256}$/;
const MAX_BATCH_SIZE = 200;

export class AttendanceIngestionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AttendanceIngestionError';
  }
}

export interface DeviceRequestAuthInput {
  deviceIdentity: string;
  timestamp: string;
  nonce: string;
  signature: string;
  method: string;
  path: string;
  rawBody: Buffer | string;
}

interface AuthenticatedDeviceContext {
  tenantId: string;
  schoolId: string;
  deviceId: string;
  deviceIdentity: string;
  deviceStatus: string;
  approvedLocation: string;
  locationId: string | null;
  permittedPopulation: 'students' | 'staff' | 'both';
  allowedEventTypes: string[];
  modalities: string[];
  lastSequenceNumber: number | null;
  lastEventAt: Date | null;
  degradedThresholdSeconds: number;
  offlineThresholdSeconds: number;
  capabilityStatus: string;
  applicationInstanceId: string | null;
  credentialVersion: number;
}

export interface SchoolAttendanceSchedulePolicy {
  timeZone: string;
  studentArrivalCutoffTime?: string;
  studentDepartureCutoffTime?: string;
  staffClockInCutoffTime?: string;
  staffClockOutCutoffTime?: string;
  graceMinutes: number;
  notifyGuardiansOn: Array<'arrival' | 'departure' | 'late_arrival' | 'early_departure'>;
}

export interface EventIngestionOutcome {
  httpStatus: number;
  success: boolean;
  eventId: string | null;
  deviceEventRecordId?: string;
  status: 'accepted' | 'duplicate' | 'rejected' | 'review_required';
  code: string;
  attendanceRecordId?: string;
  attendanceStatus?: string;
  reviewReason?: string | null;
  notificationIntents?: Array<{ guardianIdentity: string; eventType: string; status: string }>;
  idempotentReplay?: boolean;
}

export interface BatchIngestionOutcome {
  total: number;
  accepted: number;
  duplicate: number;
  rejected: number;
  reviewRequired: number;
  results: Array<{
    index: number;
    eventId: string | null;
    status: 'accepted' | 'duplicate' | 'rejected' | 'review_required';
    code: string;
    attendanceRecordId?: string;
    attendanceStatus?: string;
  }>;
}

function digestCredentialReference(reference: string): string {
  return createHash('sha256').update(reference.trim()).digest('hex');
}

function systemTenantPrincipal(tenantId: string, actorLabel = 'attendance-device-gateway'): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId,
      role: 'system_device_gateway',
      email: `${actorLabel}@attendance.internal`,
      appId: 'curriculum-flow',
      schoolName: 'School',
      subscriptionTier: 'system',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: '/attendance',
      issuer: 'attendance-device-ingestion',
      audience: 'tenant',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      tokenSignature: 'device-hmac-verified',
      permissions: []
    }
  });
}

function controlPlaneAuthPrincipal(): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'control-plane',
      role: 'super_admin',
      email: 'device-auth@control-plane.internal',
      appId: 'curriculum-flow',
      schoolName: 'Control Plane',
      subscriptionTier: 'system',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: '/control-plane',
      issuer: 'attendance-device-ingestion',
      audience: 'control-plane',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      tokenSignature: 'control-plane-device-lookup',
      permissions: []
    }
  });
}

function parseHhmmToMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = hhmmPattern.exec(value.trim());
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function validateTimeZone(tz: unknown): string | undefined {
  if (typeof tz !== 'string' || !tz.trim()) return undefined;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz.trim() }).format(new Date());
    return tz.trim();
  } catch {
    return undefined;
  }
}

function resolveSchoolSchedule(operationalPolicies: unknown): SchoolAttendanceSchedulePolicy | undefined {
  if (!operationalPolicies || typeof operationalPolicies !== 'object' || Array.isArray(operationalPolicies)) {
    return undefined;
  }
  const raw = (operationalPolicies as Record<string, unknown>).attendanceSchedule;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const timeZone = validateTimeZone(obj.timeZone);
  if (!timeZone) return undefined;

  const grace = typeof obj.graceMinutes === 'number' && Number.isFinite(obj.graceMinutes) &&
    obj.graceMinutes >= 0 && obj.graceMinutes <= 180
    ? Math.floor(obj.graceMinutes)
    : 0;

  const allowedNotify = new Set(['arrival', 'departure', 'late_arrival', 'early_departure']);
  const notifyGuardiansOn = Array.isArray(obj.notifyGuardiansOn)
    ? obj.notifyGuardiansOn.filter(
        (v): v is 'arrival' | 'departure' | 'late_arrival' | 'early_departure' =>
          typeof v === 'string' && allowedNotify.has(v)
      )
    : (['arrival', 'departure', 'late_arrival', 'early_departure'] as Array<'arrival' | 'departure' | 'late_arrival' | 'early_departure'>);

  return {
    timeZone,
    ...(typeof obj.studentArrivalCutoffTime === 'string' && parseHhmmToMinutes(obj.studentArrivalCutoffTime) !== undefined
      ? { studentArrivalCutoffTime: obj.studentArrivalCutoffTime.trim() }
      : {}),
    ...(typeof obj.studentDepartureCutoffTime === 'string' && parseHhmmToMinutes(obj.studentDepartureCutoffTime) !== undefined
      ? { studentDepartureCutoffTime: obj.studentDepartureCutoffTime.trim() }
      : {}),
    ...(typeof obj.staffClockInCutoffTime === 'string' && parseHhmmToMinutes(obj.staffClockInCutoffTime) !== undefined
      ? { staffClockInCutoffTime: obj.staffClockInCutoffTime.trim() }
      : {}),
    ...(typeof obj.staffClockOutCutoffTime === 'string' && parseHhmmToMinutes(obj.staffClockOutCutoffTime) !== undefined
      ? { staffClockOutCutoffTime: obj.staffClockOutCutoffTime.trim() }
      : {}),
    graceMinutes: grace,
    notifyGuardiansOn
  };
}

function formatInTimeZone(isoTimestamp: string, timeZone: string): { date: string; minutesOfDay: number } {
  const dt = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(dt);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const hour = Number(map.hour === '24' ? '0' : map.hour);
  const minute = Number(map.minute);
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    minutesOfDay: hour * 60 + minute
  };
}

function toAttendanceType(eventType: AttendanceEventType, population: 'student' | 'staff'): 'school' | 'classroom' | 'staff_shift' {
  if (eventType === 'classroom_arrival' || eventType === 'classroom_departure') return 'classroom';
  if (eventType === 'clock_in' || eventType === 'clock_out' || population === 'staff') return 'staff_shift';
  return 'school';
}

function mapNotificationEventType(
  eventType: AttendanceEventType,
  recordStatus: string
): 'arrival' | 'departure' | 'late_arrival' | 'early_departure' {
  if (eventType === 'school_departure' || eventType === 'classroom_departure' || eventType === 'clock_out') {
    return recordStatus === 'early_departure' ? 'early_departure' : 'departure';
  }
  return recordStatus === 'late' ? 'late_arrival' : 'arrival';
}

export class AttendanceDeviceIngestionService {
  private readonly gatewayAdapter = new CanonicalGatewayAdapter();

  constructor(
    private readonly pool: DatabasePool,
    private readonly onBeforeRecordMutationHook?: (context: { client: DatabaseClient; eventId: string }) => Promise<void>
  ) {}

  private async authenticateDeviceAndExecute<T>(
    auth: DeviceRequestAuthInput,
    options: { allowPendingForEnrollment?: boolean; requireActiveCapability?: boolean },
    fn: (client: DatabaseClient, device: AuthenticatedDeviceContext) => Promise<T>
  ): Promise<T> {
    if (!auth.deviceIdentity || !tokenPattern.test(auth.deviceIdentity) ||
        !auth.timestamp || !auth.nonce || !auth.signature) {
      throw new AttendanceIngestionError('DEVICE_AUTHENTICATION_REQUIRED', 'Signed device authentication headers are required.', 401);
    }

    const cpRow = await withControlPlaneTransaction(this.pool, controlPlaneAuthPrincipal(), async client => {
      const res = await client.query<{
        device_identity: string;
        tenant_id: string;
        school_id: string;
        device_id: string;
        encrypted_signing_key: string;
        credential_version: number;
        revoked_at: Date | null;
      }>(
        `SELECT device_identity, tenant_id, school_id, device_id,
                encrypted_signing_key, credential_version, revoked_at
         FROM control_plane.attendance_device_credentials
         WHERE device_identity = $1`,
        [auth.deviceIdentity]
      );
      return res.rows[0];
    });

    if (!cpRow) {
      throw new AttendanceIngestionError('UNKNOWN_DEVICE_CREDENTIAL', 'Unknown attendance device credential.', 401);
    }
    if (cpRow.revoked_at) {
      throw new AttendanceIngestionError('DEVICE_CREDENTIAL_REVOKED', 'Attendance device credential has been revoked.', 401);
    }

    let decryptedSecret = '';
    try {
      decryptedSecret = ServerSecretVault.decrypt(cpRow.encrypted_signing_key);
    } catch {
      throw new AttendanceIngestionError('DEVICE_CREDENTIAL_UNAVAILABLE', 'Device signing credential could not be verified.', 503);
    }

    const signatureValid = verifyAttendanceDeviceRequest({
      secret: decryptedSecret,
      method: auth.method,
      path: auth.path,
      timestamp: auth.timestamp,
      nonce: auth.nonce,
      body: auth.rawBody,
      signature: auth.signature
    });

    if (!signatureValid) {
      await withTenantTransaction(this.pool, systemTenantPrincipal(cpRow.tenant_id), async client => {
        await client.query(
          `INSERT INTO attendance.provisioning_audit_events
             (tenant_id, school_id, device_id, actor, action, reason, safe_details)
           VALUES ($1, $2, $3, $4, 'device_authentication_failed', 'INVALID_SIGNATURE_OR_EXPIRED_TIMESTAMP', $5::jsonb)`,
          [
            cpRow.tenant_id,
            cpRow.school_id,
            cpRow.device_id,
            `device:${cpRow.device_identity}`,
            JSON.stringify({ method: auth.method, path: auth.path })
          ]
        ).catch(() => {});
      }).catch(() => {});
      throw new AttendanceIngestionError('INVALID_DEVICE_SIGNATURE', 'Device request signature or timestamp is invalid.', 401);
    }

    return withTenantTransaction(this.pool, systemTenantPrincipal(cpRow.tenant_id), async client => {
      const devRes = await client.query<any>(
        `SELECT d.id, d.tenant_id, d.school_id, d.device_identity, d.status,
                d.approved_location, d.location_id, d.permitted_population,
                d.allowed_event_types, d.modalities, d.last_sequence_number,
                d.last_event_at, d.degraded_threshold_seconds, d.offline_threshold_seconds,
                cap.status AS capability_status,
                cap.application_instance_id
         FROM attendance.devices d
         LEFT JOIN attendance.school_capabilities cap
           ON cap.tenant_id = d.tenant_id AND cap.school_id = d.school_id
         WHERE d.tenant_id = $1 AND d.id = $2
         ORDER BY cap.updated_at DESC NULLS LAST
         LIMIT 1
         FOR UPDATE OF d`,
        [cpRow.tenant_id, cpRow.device_id]
      );
      const dev = devRes.rows[0];
      if (!dev) {
        throw new AttendanceIngestionError('DEVICE_NOT_FOUND', 'Attendance device record was not found.', 401);
      }
      if (dev.school_id !== cpRow.school_id || dev.device_identity !== cpRow.device_identity) {
        throw new AttendanceIngestionError('DEVICE_ASSIGNMENT_MISMATCH', 'Device assignment does not match verified credential.', 403);
      }

      const allowedStatuses = options.allowPendingForEnrollment
        ? ['pending', 'enrolled', 'active']
        : ['active'];
      if (!allowedStatuses.includes(dev.status)) {
        throw new AttendanceIngestionError(
          'DEVICE_NOT_ACTIVE',
          `Attendance device in status '${dev.status}' is not permitted to perform this operation.`,
          403
        );
      }

      if (options.requireActiveCapability !== false && dev.capability_status !== 'active') {
        throw new AttendanceIngestionError(
          'SCHOOL_ATTENDANCE_CAPABILITY_INACTIVE',
          'School attendance capability is not active.',
          403
        );
      }

      const nonceRes = await client.query(
        `INSERT INTO attendance.device_nonces (tenant_id, school_id, device_id, nonce)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, device_id, nonce) DO NOTHING
         RETURNING nonce`,
        [cpRow.tenant_id, cpRow.school_id, cpRow.device_id, auth.nonce]
      );
      if (nonceRes.rowCount === 0) {
        await client.query(
          `INSERT INTO attendance.provisioning_audit_events
             (tenant_id, school_id, device_id, actor, action, reason, safe_details)
           VALUES ($1, $2, $3, $4, 'device_nonce_replay_blocked', 'NONCE_REPLAY_DETECTED', $5::jsonb)`,
          [
            cpRow.tenant_id,
            cpRow.school_id,
            cpRow.device_id,
            `device:${cpRow.device_identity}`,
            JSON.stringify({ nonce: auth.nonce })
          ]
        );
        throw new AttendanceIngestionError('NONCE_REPLAY_DETECTED', 'Request nonce has already been used.', 401);
      }

      const ctx: AuthenticatedDeviceContext = {
        tenantId: dev.tenant_id,
        schoolId: dev.school_id,
        deviceId: dev.id,
        deviceIdentity: dev.device_identity,
        deviceStatus: dev.status,
        approvedLocation: dev.approved_location,
        locationId: dev.location_id ?? null,
        permittedPopulation: dev.permitted_population,
        allowedEventTypes: dev.allowed_event_types ?? [],
        modalities: dev.modalities ?? [],
        lastSequenceNumber: dev.last_sequence_number !== null ? Number(dev.last_sequence_number) : null,
        lastEventAt: dev.last_event_at ? new Date(dev.last_event_at) : null,
        degradedThresholdSeconds: Number(dev.degraded_threshold_seconds || 300),
        offlineThresholdSeconds: Number(dev.offline_threshold_seconds || 900),
        capabilityStatus: dev.capability_status ?? 'not_requested',
        applicationInstanceId: dev.application_instance_id ?? null,
        credentialVersion: Number(cpRow.credential_version)
      };

      return fn(client, ctx);
    });
  }

  private async persistRejectedRawOrAudit(
    client: DatabaseClient,
    device: AuthenticatedDeviceContext,
    rawPayload: unknown,
    code: string,
    httpStatus = 400
  ): Promise<EventIngestionOutcome> {
    const obj = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? rawPayload as Record<string, unknown>
      : {};
    const eventId = typeof obj.eventId === 'string' && uuid.test(obj.eventId) ? obj.eventId : null;
    const occurredMs = typeof obj.occurredAt === 'string' ? Date.parse(obj.occurredAt) : NaN;
    const sequenceNumber = typeof obj.sequenceNumber === 'number' && Number.isSafeInteger(obj.sequenceNumber) && obj.sequenceNumber >= 0
      ? obj.sequenceNumber
      : null;

    if (eventId && Number.isFinite(occurredMs)) {
      const safePayload = {
        eventId,
        deviceIdentity: typeof obj.deviceIdentity === 'string' ? obj.deviceIdentity : device.deviceIdentity,
        eventType: typeof obj.eventType === 'string' ? obj.eventType : 'unknown',
        location: typeof obj.location === 'string' ? obj.location : '',
        occurredAt: new Date(occurredMs).toISOString(),
        rejectedCode: code
      };
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO attendance.device_events
           (tenant_id, school_id, device_id, event_id, sequence_number, occurrence_at, payload)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
         ON CONFLICT (tenant_id, school_id, device_id, event_id) DO NOTHING
         RETURNING id`,
        [
          device.tenantId,
          device.schoolId,
          device.deviceId,
          eventId,
          sequenceNumber,
          new Date(occurredMs).toISOString(),
          JSON.stringify(safePayload)
        ]
      );
      let deviceEventRecordId = inserted.rows[0]?.id;
      if (!deviceEventRecordId) {
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM attendance.device_events
           WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3 AND event_id = $4`,
          [device.tenantId, device.schoolId, device.deviceId, eventId]
        );
        deviceEventRecordId = existing.rows[0].id;
        await client.query(
          `INSERT INTO attendance.event_processing
             (tenant_id, school_id, device_event_id, state, error_classification)
           VALUES ($1, $2, $3, 'duplicate', 'DUPLICATE_EVENT_ID')`,
          [device.tenantId, device.schoolId, deviceEventRecordId]
        );
        return {
          httpStatus: 200,
          success: true,
          eventId,
          deviceEventRecordId,
          status: 'duplicate',
          code: 'DUPLICATE_EVENT_ID',
          idempotentReplay: true
        };
      }
      await client.query(
        `INSERT INTO attendance.event_processing
           (tenant_id, school_id, device_event_id, state, error_classification)
         VALUES ($1, $2, $3, 'received', NULL),
                ($1, $2, $3, 'validating', NULL),
                ($1, $2, $3, 'rejected', $4)`,
        [device.tenantId, device.schoolId, deviceEventRecordId, code]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'device_event_rejected', $5, $6::jsonb)`,
        [
          device.tenantId,
          device.schoolId,
          device.deviceId,
          `device:${device.deviceIdentity}`,
          code,
          JSON.stringify({ eventId, deviceEventRecordId })
        ]
      );
      return {
        httpStatus,
        success: false,
        eventId,
        deviceEventRecordId,
        status: 'rejected',
        code
      };
    }

    await client.query(
      `INSERT INTO attendance.provisioning_audit_events
         (tenant_id, school_id, device_id, actor, action, reason, safe_details)
       VALUES ($1, $2, $3, $4, 'device_event_rejected', $5, $6::jsonb)`,
      [
        device.tenantId,
        device.schoolId,
        device.deviceId,
        `device:${device.deviceIdentity}`,
        code,
        JSON.stringify({ eventId: eventId ?? 'unparseable' })
      ]
    );
    return {
      httpStatus,
      success: false,
      eventId,
      status: 'rejected',
      code
    };
  }

  private async processNormalizedEvent(
    client: DatabaseClient,
    device: AuthenticatedDeviceContext,
    rawPayload: unknown
  ): Promise<EventIngestionOutcome> {
    let event: NormalizedAttendanceEvent;
    try {
      event = this.gatewayAdapter.normalize(rawPayload);
    } catch {
      return this.persistRejectedRawOrAudit(client, device, rawPayload, 'INVALID_ATTENDANCE_EVENT', 400);
    }

    if (event.deviceIdentity !== device.deviceIdentity) {
      return this.persistRejectedRawOrAudit(client, device, rawPayload, 'DEVICE_IDENTITY_MISMATCH', 403);
    }

    const occurredMs = Date.parse(event.occurredAt);
    if (occurredMs > Date.now() + 5 * 60_000) {
      return this.persistRejectedRawOrAudit(client, device, rawPayload, 'FUTURE_EVENT_TIMESTAMP', 400);
    }

    // Persist immutable raw event first (idempotent via unique constraint on tenant+school+device+event_id)
    const insertedEvent = await client.query<{ id: string }>(
      `INSERT INTO attendance.device_events
         (tenant_id, school_id, device_id, event_id, sequence_number, occurrence_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb)
       ON CONFLICT (tenant_id, school_id, device_id, event_id) DO NOTHING
       RETURNING id`,
      [
        device.tenantId,
        device.schoolId,
        device.deviceId,
        event.eventId,
        event.sequenceNumber ?? null,
        event.occurredAt,
        JSON.stringify(event)
      ]
    );

    if (!insertedEvent.rows[0]) {
      const existingEvent = await client.query<{ id: string }>(
        `SELECT id FROM attendance.device_events
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3 AND event_id = $4`,
        [device.tenantId, device.schoolId, device.deviceId, event.eventId]
      );
      const existingId = existingEvent.rows[0].id;
      await client.query(
        `INSERT INTO attendance.event_processing
           (tenant_id, school_id, device_event_id, state, error_classification)
         VALUES ($1, $2, $3, 'duplicate', 'DUPLICATE_EVENT_ID')`,
        [device.tenantId, device.schoolId, existingId]
      );
      const existingRecord = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM attendance.records
         WHERE tenant_id = $1 AND school_id = $2 AND (source_event_id = $3 OR last_source_event_id = $3)
         LIMIT 1`,
        [device.tenantId, device.schoolId, existingId]
      );
      return {
        httpStatus: 200,
        success: true,
        eventId: event.eventId,
        deviceEventRecordId: existingId,
        status: 'duplicate',
        code: 'DUPLICATE_EVENT_ID',
        attendanceRecordId: existingRecord.rows[0]?.id,
        attendanceStatus: existingRecord.rows[0]?.status,
        idempotentReplay: true
      };
    }

    const deviceEventRecordId = insertedEvent.rows[0].id;
    await client.query(
      `INSERT INTO attendance.event_processing (tenant_id, school_id, device_event_id, state)
       VALUES ($1, $2, $3, 'received'), ($1, $2, $3, 'validating')`,
      [device.tenantId, device.schoolId, deviceEventRecordId]
    );

    const failEvent = async (code: string, httpStatus: number): Promise<EventIngestionOutcome> => {
      await client.query(
        `INSERT INTO attendance.event_processing
           (tenant_id, school_id, device_event_id, state, error_classification)
         VALUES ($1, $2, $3, 'rejected', $4)`,
        [device.tenantId, device.schoolId, deviceEventRecordId, code]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'device_event_rejected', $5, $6::jsonb)`,
        [
          device.tenantId,
          device.schoolId,
          device.deviceId,
          `device:${device.deviceIdentity}`,
          code,
          JSON.stringify({ eventId: event.eventId, deviceEventRecordId })
        ]
      );
      return {
        httpStatus,
        success: false,
        eventId: event.eventId,
        deviceEventRecordId,
        status: 'rejected',
        code
      };
    };

    if (event.location.trim() !== device.approvedLocation.trim()) {
      return failEvent('LOCATION_MISMATCH', 422);
    }

    if (!device.allowedEventTypes.includes(event.eventType)) {
      return failEvent('UNSUPPORTED_EVENT_TYPE', 422);
    }

    if (!device.modalities.includes(event.verificationMethod)) {
      return failEvent('UNSUPPORTED_VERIFICATION_METHOD', 422);
    }

    if (event.verificationResult !== 'verified') {
      return failEvent('BIOMETRIC_VERIFICATION_FAILED', 422);
    }

    const digest = digestCredentialReference(event.credentialReference);
    const credRes = await client.query<{
      id: string;
      modality: string;
      student_id: string | null;
      staff_id: string | null;
      student_status: string | null;
      student_class_id: string | null;
      student_school_id: string | null;
      staff_status: string | null;
      staff_school_id: string | null;
    }>(
      `SELECT c.id, c.modality, c.student_id, c.staff_id,
              stu.lifecycle_status AS student_status, stu.class_id AS student_class_id, stu.school_id AS student_school_id,
              stf.status AS staff_status, stf.school_id AS staff_school_id
       FROM attendance.credentials c
       LEFT JOIN production.students stu
         ON stu.tenant_id = c.tenant_id AND stu.school_id = c.school_id AND stu.id = c.student_id
       LEFT JOIN production.staff stf
         ON stf.tenant_id = c.tenant_id AND stf.school_id = c.school_id AND stf.id = c.staff_id
       WHERE c.tenant_id = $1
         AND c.school_id = $2
         AND c.credential_digest = $3
         AND c.revoked_at IS NULL
         AND ($4 = 'combined' OR c.modality = $4)
       LIMIT 1`,
      [device.tenantId, device.schoolId, digest, event.verificationMethod]
    );

    const cred = credRes.rows[0];
    if (!cred) {
      return failEvent('CREDENTIAL_NOT_FOUND_OR_REVOKED', 422);
    }

    const population: 'student' | 'staff' = cred.student_id ? 'student' : 'staff';
    if (population === 'student') {
      if (cred.student_school_id !== device.schoolId) {
        return failEvent('PERSON_SCHOOL_MISMATCH', 403);
      }
      if (!['enrolled', 'active'].includes(cred.student_status || '')) {
        return failEvent('STUDENT_STATUS_INELIGIBLE', 422);
      }
      if (device.permittedPopulation === 'staff' ||
          event.eventType === 'clock_in' || event.eventType === 'clock_out') {
        return failEvent('POPULATION_MISMATCH', 422);
      }
    } else {
      if (cred.staff_school_id !== device.schoolId) {
        return failEvent('PERSON_SCHOOL_MISMATCH', 403);
      }
      if (cred.staff_status !== 'active') {
        return failEvent('STAFF_STATUS_INELIGIBLE', 422);
      }
      if (device.permittedPopulation === 'students') {
        return failEvent('POPULATION_MISMATCH', 422);
      }
    }

    // Check school operational attendance schedule
    const schoolRes = await client.query<{ operational_policies: unknown }>(
      `SELECT operational_policies FROM production.schools
       WHERE tenant_id = $1 AND id = $2`,
      [device.tenantId, device.schoolId]
    );
    const schedule = resolveSchoolSchedule(schoolRes.rows[0]?.operational_policies);
    const attendanceType = toAttendanceType(event.eventType, population);
    const classId = attendanceType === 'classroom' ? cred.student_class_id : null;

    let attendanceDate: string;
    let computedStatus: string = 'review_required';
    let reviewReason: string | null = null;

    if (!schedule) {
      attendanceDate = event.occurredAt.slice(0, 10);
      computedStatus = 'review_required';
      reviewReason = 'MISSING_SCHOOL_ATTENDANCE_SCHEDULE';
    } else {
      const local = formatInTimeZone(event.occurredAt, schedule.timeZone);
      attendanceDate = local.date;

      if (attendanceType === 'classroom' && !classId) {
        computedStatus = 'review_required';
        reviewReason = 'MISSING_STUDENT_CLASS_ASSIGNMENT';
      } else if (event.eventType === 'school_arrival' || event.eventType === 'classroom_arrival') {
        const cutoff = parseHhmmToMinutes(schedule.studentArrivalCutoffTime);
        if (cutoff === undefined) {
          computedStatus = 'review_required';
          reviewReason = 'MISSING_STUDENT_ARRIVAL_CUTOFF';
        } else {
          computedStatus = local.minutesOfDay <= cutoff + schedule.graceMinutes ? 'present' : 'late';
        }
      } else if (event.eventType === 'clock_in') {
        const cutoff = parseHhmmToMinutes(schedule.staffClockInCutoffTime);
        if (cutoff === undefined) {
          computedStatus = 'review_required';
          reviewReason = 'MISSING_STAFF_CLOCK_IN_CUTOFF';
        } else {
          computedStatus = local.minutesOfDay <= cutoff + schedule.graceMinutes ? 'present' : 'late';
        }
      } else if (event.eventType === 'school_departure' || event.eventType === 'classroom_departure') {
        const cutoff = parseHhmmToMinutes(schedule.studentDepartureCutoffTime);
        if (cutoff === undefined) {
          computedStatus = 'review_required';
          reviewReason = 'MISSING_STUDENT_DEPARTURE_CUTOFF';
        } else {
          computedStatus = local.minutesOfDay < cutoff ? 'early_departure' : 'present';
        }
      } else if (event.eventType === 'clock_out') {
        const cutoff = parseHhmmToMinutes(schedule.staffClockOutCutoffTime);
        if (cutoff === undefined) {
          computedStatus = 'review_required';
          reviewReason = 'MISSING_STAFF_CLOCK_OUT_CUTOFF';
        } else {
          computedStatus = local.minutesOfDay < cutoff ? 'early_departure' : 'present';
        }
      }
    }

    if (this.onBeforeRecordMutationHook) {
      await this.onBeforeRecordMutationHook({ client, eventId: event.eventId });
    }

    // Serialize concurrent events for the same person+date+context
    const subjectId = cred.student_id || cred.staff_id!;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`attendance-record:${device.tenantId}:${device.schoolId}:${population}:${subjectId}:${attendanceDate}:${attendanceType}:${classId ?? 'none'}`]
    );

    const existingRecRes = await client.query<{
      id: string;
      status: string;
      source_type: string;
      occurred_at: Date | null;
      first_event_at: Date | null;
      last_event_at: Date | null;
    }>(
      population === 'student'
        ? `SELECT id, status, source_type, occurred_at, first_event_at, last_event_at
           FROM attendance.records
           WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3
             AND attendance_date = $4::date AND attendance_type = $5
             AND COALESCE(class_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($6::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
           FOR UPDATE`
        : `SELECT id, status, source_type, occurred_at, first_event_at, last_event_at
           FROM attendance.records
           WHERE tenant_id = $1 AND school_id = $2 AND staff_id = $3
             AND attendance_date = $4::date AND attendance_type = $5
           FOR UPDATE`,
      population === 'student'
        ? [device.tenantId, device.schoolId, cred.student_id, attendanceDate, attendanceType, classId]
        : [device.tenantId, device.schoolId, cred.staff_id, attendanceDate, attendanceType]
    );

    let attendanceRecordId: string;
    let effectiveRecordStatus = computedStatus;

    const existingRec = existingRecRes.rows[0];
    if (!existingRec) {
      const createdRec = await client.query<{ id: string }>(
        `INSERT INTO attendance.records
           (tenant_id, school_id, population, student_id, staff_id, class_id,
            attendance_date, attendance_type, status, source_event_id, last_source_event_id,
            source_location, source_type, occurred_at, first_event_at, last_event_at, review_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $10, $11, 'device',
                 $12::timestamptz, $12::timestamptz, $12::timestamptz, $13)
         RETURNING id`,
        [
          device.tenantId,
          device.schoolId,
          population,
          cred.student_id,
          cred.staff_id,
          classId,
          attendanceDate,
          attendanceType,
          computedStatus,
          deviceEventRecordId,
          device.approvedLocation,
          event.occurredAt,
          reviewReason
        ]
      );
      attendanceRecordId = createdRec.rows[0].id;
    } else {
      attendanceRecordId = existingRec.id;
      const toMs = (val: Date | string | null): number => {
        if (!val) return 0;
        return val instanceof Date ? val.getTime() : Date.parse(String(val)) || 0;
      };
      const existingLastMs = existingRec.last_event_at
        ? toMs(existingRec.last_event_at)
        : toMs(existingRec.occurred_at);
      const isOutOfOrderOlder = occurredMs < existingLastMs;
      const manualLocked = existingRec.source_type === 'manual_correction';

      if (manualLocked || isOutOfOrderOlder) {
        // Never overwrite manual adjustments or newer attendance states with delayed/older events
        effectiveRecordStatus = existingRec.status;
        await client.query(
          `UPDATE attendance.records
           SET first_event_at = LEAST(COALESCE(first_event_at, $4::timestamptz), $4::timestamptz),
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [device.tenantId, device.schoolId, attendanceRecordId, event.occurredAt]
        );
      } else {
        // Newer event same day (e.g., departure after earlier arrival): preserve late arrival if departure is on time
        const isDeparture = event.eventType === 'school_departure' ||
          event.eventType === 'classroom_departure' ||
          event.eventType === 'clock_out';
        if (isDeparture && existingRec.status === 'late' && computedStatus === 'present') {
          effectiveRecordStatus = 'late';
        }
        await client.query(
          `UPDATE attendance.records
           SET status = $4,
               last_source_event_id = $5,
               last_event_at = GREATEST(COALESCE(last_event_at, $6::timestamptz), $6::timestamptz),
               occurred_at = $6::timestamptz,
               review_reason = $7,
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [
            device.tenantId,
            device.schoolId,
            attendanceRecordId,
            effectiveRecordStatus,
            deviceEventRecordId,
            event.occurredAt,
            reviewReason
          ]
        );
      }
    }

    // Update monotonic device watermarks without allowing older events to regress sequence numbers
    await client.query(
      `UPDATE attendance.devices
       SET last_event_at = GREATEST(COALESCE(last_event_at, $4::timestamptz), $4::timestamptz),
           last_sequence_number = CASE
             WHEN $5::bigint IS NULL THEN last_sequence_number
             ELSE GREATEST(COALESCE(last_sequence_number, -1), $5::bigint)
           END,
           updated_at = now()
       WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
      [device.tenantId, device.schoolId, device.deviceId, event.occurredAt, event.sequenceNumber ?? null]
    );

    const processingState = effectiveRecordStatus === 'review_required' ? 'review_required' : 'accepted';
    await client.query(
      `INSERT INTO attendance.event_processing
         (tenant_id, school_id, device_event_id, state, error_classification)
       VALUES ($1, $2, $3, 'processing', NULL),
              ($1, $2, $3, $4, $5)`,
      [device.tenantId, device.schoolId, deviceEventRecordId, processingState, reviewReason]
    );

    const notificationIntents: Array<{ guardianIdentity: string; eventType: string; status: string }> = [];
    if (population === 'student' && cred.student_id && schedule) {
      const notifType = mapNotificationEventType(event.eventType, effectiveRecordStatus);
      if (schedule.notifyGuardiansOn.includes(notifType)) {
        const intents = await this.enqueueVerifiedGuardianNotifications(client, {
          tenantId: device.tenantId,
          schoolId: device.schoolId,
          deviceEventRecordId,
          studentId: cred.student_id,
          notificationEventType: notifType,
          occurredAt: event.occurredAt,
          location: device.approvedLocation
        });
        notificationIntents.push(...intents);
      }
    }

    return {
      httpStatus: 201,
      success: true,
      eventId: event.eventId,
      deviceEventRecordId,
      status: processingState,
      code: processingState === 'review_required' ? (reviewReason || 'REVIEW_REQUIRED') : 'EVENT_ACCEPTED',
      attendanceRecordId,
      attendanceStatus: effectiveRecordStatus,
      reviewReason,
      ...(notificationIntents.length ? { notificationIntents } : {})
    };
  }

  private async enqueueVerifiedGuardianNotifications(
    client: DatabaseClient,
    input: {
      tenantId: string;
      schoolId: string;
      deviceEventRecordId: string;
      studentId: string;
      notificationEventType: 'arrival' | 'departure' | 'late_arrival' | 'early_departure';
      occurredAt: string;
      location: string;
    }
  ): Promise<Array<{ guardianIdentity: string; eventType: string; status: string }>> {
    const guardiansRes = await client.query<{
      guardian_id: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      student_name: string | null;
    }>(
      `SELECT g.id AS guardian_id, g.full_name, g.phone, g.email,
              TRIM(COALESCE(stu.first_name, '') || ' ' || COALESCE(stu.last_name, '')) AS student_name
       FROM production.student_guardians sg
       JOIN production.guardians g
         ON g.tenant_id = sg.tenant_id AND g.school_id = sg.school_id AND g.id = sg.guardian_id
       JOIN production.students stu
         ON stu.tenant_id = sg.tenant_id AND stu.school_id = sg.school_id AND stu.id = sg.student_id
       WHERE sg.tenant_id = $1
         AND sg.school_id = $2
         AND sg.student_id = $3
         AND sg.status = 'active'
         AND g.status = 'active'
         AND g.verification_status = 'verified'
       ORDER BY sg.is_primary DESC, g.created_at ASC
       LIMIT 3`,
      [input.tenantId, input.schoolId, input.studentId]
    );

    const results: Array<{ guardianIdentity: string; eventType: string; status: string }> = [];
    for (const guardian of guardiansRes.rows) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO attendance.notification_intents
           (tenant_id, school_id, event_id, guardian_identity, event_type, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT (tenant_id, event_id, guardian_identity, event_type) DO NOTHING
         RETURNING id`,
        [
          input.tenantId,
          input.schoolId,
          input.deviceEventRecordId,
          guardian.guardian_id,
          input.notificationEventType
        ]
      );
      if (!inserted.rows[0]) continue;
      const intentId = inserted.rows[0].id;

      const label = guardian.student_name || 'Student';
      const msg = `${label} attendance event (${input.notificationEventType.replace(/_/g, ' ')}) recorded at ${input.location} (${input.occurredAt}).`;

      let queuedOutboxId: string | null = null;
      let blockCode: string | null = null;

      const smsTarget = guardian.phone && /^\+[1-9]\d{7,14}$/.test(guardian.phone) ? guardian.phone : null;
      const emailTarget = guardian.email && guardian.email.includes('@') ? guardian.email : null;
      const channelRequest = smsTarget
        ? { channel: 'sms' as const, to: smsTarget, message: msg }
        : emailTarget
          ? { channel: 'email' as const, to: emailTarget, subject: 'Attendance Notification', text: msg }
          : null;

      if (!channelRequest) {
        blockCode = 'NO_VERIFIED_GUARDIAN_CONTACT';
      } else {
        try {
          validateNotificationRequest(channelRequest);
          const outboxId = randomUUID();
          const encrypted = ServerSecretVault.encrypt(
            JSON.stringify({ tenantId: input.tenantId, id: outboxId, kind: 'notification', data: channelRequest })
          );
          await client.query(
            `INSERT INTO production.notification_outbox
               (tenant_id, id, channel, encrypted_request, max_attempts)
             VALUES ($1, $2, $3, $4, 5)`,
            [input.tenantId, outboxId, channelRequest.channel, encrypted]
          );
          queuedOutboxId = outboxId;
        } catch {
          blockCode = 'OUTBOX_ENCRYPTION_UNAVAILABLE';
        }
      }

      const finalStatus = queuedOutboxId ? 'queued' : 'blocked';
      await client.query(
        `UPDATE attendance.notification_intents
         SET status = $2, notification_id = $3, error_code = $4, updated_at = now()
         WHERE tenant_id = $1 AND id = $5`,
        [input.tenantId, finalStatus, queuedOutboxId, blockCode, intentId]
      );
      results.push({
        guardianIdentity: guardian.guardian_id,
        eventType: input.notificationEventType,
        status: finalStatus
      });
    }
    return results;
  }

  async ingestSingleEvent(
    auth: DeviceRequestAuthInput,
    rawPayload: unknown
  ): Promise<EventIngestionOutcome> {
    return this.authenticateDeviceAndExecute(
      auth,
      { allowPendingForEnrollment: false, requireActiveCapability: true },
      (client, device) => this.processNormalizedEvent(client, device, rawPayload)
    );
  }

  async ingestBatchEvents(
    auth: DeviceRequestAuthInput,
    rawBody: unknown
  ): Promise<BatchIngestionOutcome> {
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) ||
        !Array.isArray((rawBody as { events?: unknown }).events)) {
      throw new AttendanceIngestionError('INVALID_ATTENDANCE_BATCH', 'A JSON object containing an events array is required.', 400);
    }
    const events = (rawBody as { events: unknown[] }).events;
    if (events.length === 0 || events.length > MAX_BATCH_SIZE) {
      throw new AttendanceIngestionError(
        'INVALID_BATCH_SIZE',
        `Batch must contain between 1 and ${MAX_BATCH_SIZE} events.`,
        400
      );
    }

    return this.authenticateDeviceAndExecute(
      auth,
      { allowPendingForEnrollment: false, requireActiveCapability: true },
      async (client, device) => {
        const results: BatchIngestionOutcome['results'] = [];
        let accepted = 0;
        let duplicate = 0;
        let rejected = 0;
        let reviewRequired = 0;

        for (let index = 0; index < events.length; index++) {
          const outcome = await this.processNormalizedEvent(client, device, events[index]);
          if (outcome.status === 'accepted') accepted++;
          else if (outcome.status === 'duplicate') duplicate++;
          else if (outcome.status === 'review_required') reviewRequired++;
          else rejected++;
          results.push({
            index,
            eventId: outcome.eventId,
            status: outcome.status,
            code: outcome.code,
            ...(outcome.attendanceRecordId ? { attendanceRecordId: outcome.attendanceRecordId } : {}),
            ...(outcome.attendanceStatus ? { attendanceStatus: outcome.attendanceStatus } : {})
          });
        }

        return {
          total: events.length,
          accepted,
          duplicate,
          rejected,
          reviewRequired,
          results
        };
      }
    );
  }

  async recordHeartbeat(
    auth: DeviceRequestAuthInput,
    rawPayload: unknown
  ) {
    return this.authenticateDeviceAndExecute(
      auth,
      { allowPendingForEnrollment: false, requireActiveCapability: true },
      async (client, device) => {
        let heartbeat;
        try {
          heartbeat = validateNormalizedHeartbeat(rawPayload);
        } catch {
          throw new AttendanceIngestionError('INVALID_HEARTBEAT_PAYLOAD', 'Heartbeat payload failed validation.', 400);
        }
        if (heartbeat.deviceIdentity !== device.deviceIdentity) {
          throw new AttendanceIngestionError('DEVICE_IDENTITY_MISMATCH', 'Heartbeat device identity mismatch.', 403);
        }

        const updatedDev = await client.query<{
          last_heartbeat_at: Date;
          firmware_version: string | null;
          last_sequence_number: number | null;
        }>(
          `UPDATE attendance.devices
           SET last_heartbeat_at = now(),
               connectivity_status = 'online',
               firmware_version = COALESCE($4, firmware_version),
               last_sequence_number = CASE
                 WHEN $5::bigint IS NULL THEN last_sequence_number
                 ELSE GREATEST(COALESCE(last_sequence_number, -1), $5::bigint)
               END,
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           RETURNING last_heartbeat_at, firmware_version, last_sequence_number`,
          [
            device.tenantId,
            device.schoolId,
            device.deviceId,
            heartbeat.firmwareVersion ?? null,
            heartbeat.sequenceNumber ?? null
          ]
        );

        const healthRes = await client.query<{ id: string; checked_at: Date }>(
          `INSERT INTO attendance.device_health_checks
             (tenant_id, school_id, device_id, connectivity_status,
              attendance_processing_status, configuration_sync_status,
              clock_drift_ms, pending_event_count, safe_details)
           VALUES ($1, $2, $3, 'online', 'healthy', $4, $5, $6, $7::jsonb)
           RETURNING id, checked_at`,
          [
            device.tenantId,
            device.schoolId,
            device.deviceId,
            heartbeat.configurationSyncStatus ?? 'synced',
            heartbeat.clockDriftMs ?? null,
            heartbeat.pendingEventCount ?? null,
            JSON.stringify({
              reportedAt: heartbeat.reportedAt,
              firmwareVersion: updatedDev.rows[0].firmware_version,
              safeMetrics: heartbeat.safeMetrics ?? {}
            })
          ]
        );

        return {
          deviceId: device.deviceId,
          deviceIdentity: device.deviceIdentity,
          connectivityStatus: 'online',
          lastHeartbeatAt: new Date(updatedDev.rows[0].last_heartbeat_at).toISOString(),
          firmwareVersion: updatedDev.rows[0].firmware_version,
          lastSequenceNumber: updatedDev.rows[0].last_sequence_number !== null
            ? Number(updatedDev.rows[0].last_sequence_number)
            : null,
          healthCheckId: healthRes.rows[0].id
        };
      }
    );
  }

  async acknowledgeDeviceEnrollmentByDevice(
    auth: DeviceRequestAuthInput,
    rawPayload: unknown
  ) {
    const body = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? rawPayload as Record<string, unknown>
      : {};
    const opRef = typeof body.adapterOperationReference === 'string' && tokenPattern.test(body.adapterOperationReference)
      ? body.adapterOperationReference
      : null;
    if (!opRef) {
      throw new AttendanceIngestionError('INVALID_ENROLLMENT_ACK', 'A valid adapterOperationReference is required.', 400);
    }
    const firmwareVersion = typeof body.firmwareVersion === 'string' && tokenPattern.test(body.firmwareVersion)
      ? body.firmwareVersion
      : null;

    return this.authenticateDeviceAndExecute(
      auth,
      { allowPendingForEnrollment: true, requireActiveCapability: false },
      async (client, device) => {
        const nextStatus = device.deviceStatus === 'pending' ? 'enrolled' : device.deviceStatus;
        const devUpdated = await client.query<{ status: string; enrollment_acknowledged_at: Date }>(
          `UPDATE attendance.devices
           SET status = $4,
               enrollment_acknowledged_at = COALESCE(enrollment_acknowledged_at, now()),
               firmware_version = COALESCE($5, firmware_version),
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           RETURNING status, enrollment_acknowledged_at`,
          [device.tenantId, device.schoolId, device.deviceId, nextStatus, firmwareVersion]
        );

        await client.query(
          `UPDATE attendance.device_allocations
           SET state = CASE WHEN state IN ('allocated', 'enrollment_pending') THEN 'enrolled' ELSE state END
           WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
             AND state NOT IN ('revoked', 'decommissioned')`,
          [device.tenantId, device.schoolId, device.deviceId]
        );

        await client.query(
          `INSERT INTO attendance.provisioning_audit_events
             (tenant_id, school_id, device_id, actor, action, previous_state, new_state, safe_details)
           VALUES ($1, $2, $3, $4, 'device_enrollment_acknowledged', $5, $6, $7::jsonb)`,
          [
            device.tenantId,
            device.schoolId,
            device.deviceId,
            `device:${device.deviceIdentity}`,
            device.deviceStatus,
            nextStatus,
            JSON.stringify({ adapterOperationReference: opRef, firmwareVersion })
          ]
        );

        return {
          deviceId: device.deviceId,
          deviceIdentity: device.deviceIdentity,
          status: devUpdated.rows[0].status,
          enrollmentAcknowledgedAt: new Date(devUpdated.rows[0].enrollment_acknowledged_at).toISOString(),
          adapterOperationReference: opRef
        };
      }
    );
  }

  async acknowledgeDeviceEnrollmentByUser(
    principal: AuthorizedPrincipal,
    input: { schoolId?: string; deviceId?: string; adapterOperationReference?: string; firmwareVersion?: string }
  ) {
    if (!input?.deviceId || !uuid.test(input.deviceId) ||
        typeof input.adapterOperationReference !== 'string' || !tokenPattern.test(input.adapterOperationReference)) {
      throw new AttendanceIngestionError('INVALID_ENROLLMENT_ACK', 'Valid deviceId and adapterOperationReference are required.', 400);
    }
    const firmwareVersion = typeof input.firmwareVersion === 'string' && tokenPattern.test(input.firmwareVersion)
      ? input.firmwareVersion
      : null;

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesManage,
        input.schoolId
      );
      const devRes = await client.query<{ id: string; device_identity: string; status: string }>(
        `SELECT id, device_identity, status FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [principal.tenant.tenantId, schoolId, input.deviceId]
      );
      const device = devRes.rows[0];
      if (!device) {
        throw new AttendanceIngestionError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (['revoked', 'decommissioned'].includes(device.status)) {
        throw new AttendanceIngestionError('INVALID_DEVICE_STATE_TRANSITION', 'Cannot acknowledge enrollment on a revoked or decommissioned device.', 409);
      }
      const nextStatus = device.status === 'pending' ? 'enrolled' : device.status;
      const updated = await client.query<{ status: string; enrollment_acknowledged_at: Date }>(
        `UPDATE attendance.devices
         SET status = $4,
             enrollment_acknowledged_at = COALESCE(enrollment_acknowledged_at, now()),
             firmware_version = COALESCE($5, firmware_version),
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         RETURNING status, enrollment_acknowledged_at`,
        [principal.tenant.tenantId, schoolId, device.id, nextStatus, firmwareVersion]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET state = CASE WHEN state IN ('allocated', 'enrollment_pending') THEN 'enrolled' ELSE state END
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')`,
        [principal.tenant.tenantId, schoolId, device.id]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, safe_details)
         VALUES ($1, $2, $3, $4, 'device_enrollment_acknowledged', $5, $6, $7::jsonb)`,
        [
          principal.tenant.tenantId,
          schoolId,
          device.id,
          principal.userId,
          device.status,
          nextStatus,
          JSON.stringify({ adapterOperationReference: input.adapterOperationReference, firmwareVersion })
        ]
      );
      return {
        deviceId: device.id,
        deviceIdentity: device.device_identity,
        status: updated.rows[0].status,
        enrollmentAcknowledgedAt: new Date(updated.rows[0].enrollment_acknowledged_at).toISOString(),
        adapterOperationReference: input.adapterOperationReference
      };
    });
  }

  async registerSchoolDeviceRequest(
    principal: AuthorizedPrincipal,
    input: {
      schoolId?: string;
      deviceIdentity?: string;
      displayName?: string;
      deviceType?: string;
      modalities?: string[];
      locationId?: string;
      approvedLocation?: string;
      allowedEventTypes?: string[];
      permittedPopulation?: string;
    }
  ) {
    if (!input || typeof input !== 'object' ||
        typeof input.deviceIdentity !== 'string' || !tokenPattern.test(input.deviceIdentity) ||
        !['rfid', 'fingerprint', 'facial', 'combined'].includes(String(input.deviceType)) ||
        !Array.isArray(input.modalities) || input.modalities.length === 0 ||
        !Array.isArray(input.allowedEventTypes) || input.allowedEventTypes.length === 0 ||
        !['students', 'staff', 'both'].includes(String(input.permittedPopulation))) {
      throw new AttendanceIngestionError('INVALID_DEVICE_REGISTRATION', 'Invalid school attendance device specification.', 400);
    }

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesManage,
        input.schoolId
      );
      let resolvedLocationName = typeof input.approvedLocation === 'string' ? input.approvedLocation.trim() : '';
      let resolvedLocationId: string | null = null;
      if (input.locationId) {
        if (!uuid.test(input.locationId)) {
          throw new AttendanceIngestionError('INVALID_LOCATION_ID', 'Invalid installation location ID.', 400);
        }
        const loc = await client.query<{ id: string; display_name: string }>(
          `SELECT id, display_name FROM attendance.installation_locations
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
          [principal.tenant.tenantId, schoolId, input.locationId]
        );
        if (!loc.rows[0]) {
          throw new AttendanceIngestionError('INSTALLATION_LOCATION_NOT_FOUND', 'Active installation location not found.', 404);
        }
        resolvedLocationId = loc.rows[0].id;
        resolvedLocationName = loc.rows[0].display_name;
      }
      if (!resolvedLocationName || resolvedLocationName.length > 200) {
        throw new AttendanceIngestionError('INVALID_LOCATION', 'A valid approvedLocation or locationId is required.', 400);
      }

      const inserted = await client.query<{
        id: string;
        device_identity: string;
        status: string;
        approved_location: string;
      }>(
        `INSERT INTO attendance.devices
           (tenant_id, school_id, device_identity, display_name, device_type, modalities,
            approved_location, location_id, allowed_event_types, permitted_population,
            status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
         RETURNING id, device_identity, status, approved_location`,
        [
          principal.tenant.tenantId,
          schoolId,
          input.deviceIdentity.trim(),
          input.displayName?.trim() || input.deviceIdentity.trim(),
          input.deviceType,
          input.modalities,
          resolvedLocationName,
          resolvedLocationId,
          input.allowedEventTypes,
          input.permittedPopulation,
          principal.userId
        ]
      );

      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, safe_details)
         VALUES ($1, $2, $3, $4, 'school_device_registered_pending', NULL, 'pending', $5::jsonb)`,
        [
          principal.tenant.tenantId,
          schoolId,
          inserted.rows[0].id,
          principal.userId,
          JSON.stringify({ deviceIdentity: inserted.rows[0].device_identity, approvedLocation: resolvedLocationName })
        ]
      );

      return {
        id: inserted.rows[0].id,
        deviceIdentity: inserted.rows[0].device_identity,
        status: inserted.rows[0].status,
        approvedLocation: inserted.rows[0].approved_location,
        schoolId
      };
    });
  }

  async enrollPersonCredential(
    principal: AuthorizedPrincipal,
    input: {
      schoolId?: string;
      modality?: string;
      credentialReference?: string;
      studentId?: string;
      staffId?: string;
      biometricReference?: string;
    }
  ) {
    if (!input || typeof input !== 'object' ||
        !['rfid', 'fingerprint', 'facial'].includes(String(input.modality)) ||
        typeof input.credentialReference !== 'string' || !tokenPattern.test(input.credentialReference) ||
        Boolean(input.studentId) === Boolean(input.staffId) ||
        (input.studentId && !uuid.test(input.studentId)) ||
        (input.staffId && !uuid.test(input.staffId)) ||
        (input.modality === 'facial' && (typeof input.biometricReference !== 'string' || !input.biometricReference.trim()))) {
      throw new AttendanceIngestionError('INVALID_CREDENTIAL_ENROLLMENT', 'Valid modality, credentialReference, and single studentId or staffId are required.', 400);
    }

    const digest = digestCredentialReference(input.credentialReference);

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceCredentialsManage,
        input.schoolId
      );

      if (input.studentId) {
        const stu = await client.query<{ lifecycle_status: string }>(
          `SELECT lifecycle_status FROM production.students
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [principal.tenant.tenantId, schoolId, input.studentId]
        );
        if (!stu.rows[0]) {
          throw new AttendanceIngestionError('STUDENT_NOT_FOUND', 'Student was not found in this school.', 404);
        }
        if (!['enrolled', 'active'].includes(stu.rows[0].lifecycle_status)) {
          throw new AttendanceIngestionError('STUDENT_STATUS_INELIGIBLE', 'Only enrolled or active students can receive attendance credentials.', 409);
        }
      } else if (input.staffId) {
        const stf = await client.query<{ status: string }>(
          `SELECT status FROM production.staff
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [principal.tenant.tenantId, schoolId, input.staffId]
        );
        if (!stf.rows[0]) {
          throw new AttendanceIngestionError('STAFF_NOT_FOUND', 'Staff member was not found in this school.', 404);
        }
        if (stf.rows[0].status !== 'active') {
          throw new AttendanceIngestionError('STAFF_STATUS_INELIGIBLE', 'Only active staff can receive attendance credentials.', 409);
        }
      }

      // Revoke prior active credential for the same person + modality
      await client.query(
        `UPDATE attendance.credentials
         SET revoked_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND modality = $3 AND revoked_at IS NULL
           AND (($4::uuid IS NOT NULL AND student_id = $4::uuid)
             OR ($5::uuid IS NOT NULL AND staff_id = $5::uuid))`,
        [
          principal.tenant.tenantId,
          schoolId,
          input.modality,
          input.studentId ?? null,
          input.staffId ?? null
        ]
      );

      let inserted;
      try {
        inserted = await client.query<{
          id: string;
          modality: string;
          enrolled_at: Date;
        }>(
          `INSERT INTO attendance.credentials
             (tenant_id, school_id, credential_digest, modality, student_id, staff_id, biometric_reference, enrolled_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, modality, enrolled_at`,
          [
            principal.tenant.tenantId,
            schoolId,
            digest,
            input.modality,
            input.studentId ?? null,
            input.staffId ?? null,
            input.biometricReference?.trim() ?? null,
            principal.userId
          ]
        );
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new AttendanceIngestionError(
            'CREDENTIAL_DIGEST_ALREADY_IN_USE',
            'This credential token is already assigned to another active member.',
            409
          );
        }
        throw err;
      }

      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, actor, action, safe_details)
         VALUES ($1, $2, $3, 'person_attendance_credential_enrolled', $4::jsonb)`,
        [
          principal.tenant.tenantId,
          schoolId,
          principal.userId,
          JSON.stringify({
            credentialId: inserted.rows[0].id,
            modality: inserted.rows[0].modality,
            studentId: input.studentId ?? null,
            staffId: input.staffId ?? null
          })
        ]
      );

      return {
        id: inserted.rows[0].id,
        schoolId,
        modality: inserted.rows[0].modality,
        studentId: input.studentId ?? null,
        staffId: input.staffId ?? null,
        enrolledAt: new Date(inserted.rows[0].enrolled_at).toISOString()
      };
    });
  }

  async getAttendanceRegister(
    principal: AuthorizedPrincipal,
    filters: {
      schoolId?: string;
      date?: string;
      classId?: string;
      population?: string;
      attendanceType?: string;
      status?: string;
    }
  ) {
    if (filters.date !== undefined && !isoDateOnly.test(filters.date)) {
      throw new AttendanceIngestionError('INVALID_DATE_FILTER', 'date must use YYYY-MM-DD format.', 400);
    }
    if (filters.classId !== undefined && !uuid.test(filters.classId)) {
      throw new AttendanceIngestionError('INVALID_CLASS_FILTER', 'Invalid classId filter.', 400);
    }
    if (filters.population !== undefined && !['student', 'staff'].includes(filters.population)) {
      throw new AttendanceIngestionError('INVALID_POPULATION_FILTER', 'Invalid population filter.', 400);
    }
    if (filters.attendanceType !== undefined && !['school', 'classroom', 'staff_shift'].includes(filters.attendanceType)) {
      throw new AttendanceIngestionError('INVALID_ATTENDANCE_TYPE_FILTER', 'Invalid attendanceType filter.', 400);
    }

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceRead,
        filters.schoolId
      );
      const res = await client.query<any>(
        `SELECT r.id, r.population, r.student_id, r.staff_id, r.class_id,
                r.attendance_date::text AS attendance_date,
                r.attendance_type, r.status, r.source_event_id, r.last_source_event_id,
                r.source_location, r.source_type, r.occurred_at, r.first_event_at,
                r.last_event_at, r.review_reason, r.created_at, r.updated_at,
                stu.admission_number,
                TRIM(COALESCE(stu.first_name, '') || ' ' || COALESCE(stu.last_name, '')) AS student_name,
                stf.staff_number,
                TRIM(COALESCE(stf.first_name, '') || ' ' || COALESCE(stf.last_name, '')) AS staff_name,
                cls.name AS class_name,
                (SELECT count(*)::int FROM attendance.adjustments adj
                 WHERE adj.tenant_id = r.tenant_id AND adj.school_id = r.school_id
                   AND adj.attendance_record_id = r.id) AS adjustment_count
         FROM attendance.records r
         LEFT JOIN production.students stu
           ON stu.tenant_id = r.tenant_id AND stu.school_id = r.school_id AND stu.id = r.student_id
         LEFT JOIN production.staff stf
           ON stf.tenant_id = r.tenant_id AND stf.school_id = r.school_id AND stf.id = r.staff_id
         LEFT JOIN production.classes cls
           ON cls.tenant_id = r.tenant_id AND cls.school_id = r.school_id AND cls.id = r.class_id
         WHERE r.tenant_id = $1
           AND r.school_id = $2
           AND ($3::date IS NULL OR r.attendance_date = $3::date)
           AND ($4::uuid IS NULL OR r.class_id = $4::uuid)
           AND ($5::text IS NULL OR r.population = $5::text)
           AND ($6::text IS NULL OR r.attendance_type = $6::text)
           AND ($7::text IS NULL OR r.status = $7::text)
         ORDER BY r.attendance_date DESC, r.occurred_at DESC NULLS LAST, r.created_at DESC
         LIMIT 500`,
        [
          principal.tenant.tenantId,
          schoolId,
          filters.date ?? null,
          filters.classId ?? null,
          filters.population ?? null,
          filters.attendanceType ?? null,
          filters.status ?? null
        ]
      );

      return res.rows.map(row => ({
        id: row.id,
        schoolId,
        population: row.population,
        studentId: row.student_id,
        staffId: row.staff_id,
        personName: row.population === 'student' ? (row.student_name || null) : (row.staff_name || null),
        personCode: row.population === 'student' ? (row.admission_number || null) : (row.staff_number || null),
        classId: row.class_id,
        className: row.class_name ?? null,
        attendanceDate: row.attendance_date,
        attendanceType: row.attendance_type,
        status: row.status,
        sourceEventId: row.source_event_id,
        lastSourceEventId: row.last_source_event_id,
        sourceLocation: row.source_location,
        sourceType: row.source_type,
        occurredAt: row.occurred_at ? new Date(row.occurred_at).toISOString() : null,
        firstEventAt: row.first_event_at ? new Date(row.first_event_at).toISOString() : null,
        lastEventAt: row.last_event_at ? new Date(row.last_event_at).toISOString() : null,
        reviewReason: row.review_reason ?? null,
        adjustmentCount: Number(row.adjustment_count || 0)
      }));
    });
  }

  async getSyncStatus(principal: AuthorizedPrincipal, requestedSchoolId?: string) {
    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceRead,
        requestedSchoolId
      );
      const [devicesRes, stateTotalsRes] = await Promise.all([
        client.query<any>(
          `SELECT id, device_identity, display_name, status, approved_location,
                  last_heartbeat_at, last_event_at, last_sequence_number,
                  degraded_threshold_seconds, offline_threshold_seconds
           FROM attendance.devices
           WHERE tenant_id = $1 AND school_id = $2
           ORDER BY created_at DESC`,
          [principal.tenant.tenantId, schoolId]
        ),
        client.query<{ state: string; count: string }>(
          `SELECT state, count(*)::text AS count
           FROM (
             SELECT DISTINCT ON (device_event_id) state
             FROM attendance.event_processing
             WHERE tenant_id = $1 AND school_id = $2
             ORDER BY device_event_id, (state = 'duplicate') ASC, occurred_at DESC
           ) latest
           GROUP BY state`,
          [principal.tenant.tenantId, schoolId]
        )
      ]);

      const eventCounts = Object.fromEntries(stateTotalsRes.rows.map(r => [r.state, Number(r.count)]));
      const nowMs = Date.now();

      return {
        schoolId,
        devices: devicesRes.rows.map(d => {
          const hbMs = d.last_heartbeat_at ? new Date(d.last_heartbeat_at).getTime() : null;
          const ageSec = hbMs ? Math.max(0, Math.floor((nowMs - hbMs) / 1000)) : null;
          const conn = ageSec === null
            ? 'unknown'
            : ageSec >= Number(d.offline_threshold_seconds || 900)
              ? 'offline'
              : ageSec >= Number(d.degraded_threshold_seconds || 300)
                ? 'degraded'
                : 'online';
          return {
            deviceId: d.id,
            deviceIdentity: d.device_identity,
            displayName: d.display_name || d.device_identity,
            status: d.status,
            approvedLocation: d.approved_location,
            connectivityStatus: conn,
            lastHeartbeatAt: d.last_heartbeat_at ? new Date(d.last_heartbeat_at).toISOString() : null,
            lastEventAt: d.last_event_at ? new Date(d.last_event_at).toISOString() : null,
            lastSequenceNumber: d.last_sequence_number !== null ? Number(d.last_sequence_number) : null
          };
        }),
        processingSummary: {
          accepted: eventCounts.accepted || 0,
          reviewRequired: eventCounts.review_required || 0,
          rejected: eventCounts.rejected || 0,
          duplicate: eventCounts.duplicate || 0,
          retryPending: eventCounts.retry_pending || 0
        }
      };
    });
  }

  async adjustAttendanceRecord(
    principal: AuthorizedPrincipal,
    recordId: string,
    input: { status?: unknown; reason?: unknown; schoolId?: string }
  ) {
    if (!uuid.test(recordId)) {
      throw new AttendanceIngestionError('INVALID_RECORD_ID', 'Invalid attendance record ID.', 400);
    }
    const validStatuses = ['present', 'late', 'absent', 'excused', 'early_departure', 'review_required'];
    if (typeof input?.status !== 'string' || !validStatuses.includes(input.status)) {
      throw new AttendanceIngestionError('INVALID_ATTENDANCE_STATUS', 'Valid target attendance status is required.', 400);
    }
    if (typeof input?.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 1000) {
      throw new AttendanceIngestionError('ADJUSTMENT_REASON_REQUIRED', 'A manual adjustment reason (1-1000 chars) is required.', 400);
    }
    const cleanReason = input.reason.trim();

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceAdjust,
        input.schoolId
      );

      const recRes = await client.query<{
        id: string;
        status: string;
        source_type: string;
        review_reason: string | null;
        source_event_id: string | null;
        occurred_at: Date | null;
      }>(
        `SELECT id, status, source_type, review_reason, source_event_id, occurred_at
         FROM attendance.records
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         FOR UPDATE`,
        [principal.tenant.tenantId, schoolId, recordId]
      );
      const record = recRes.rows[0];
      if (!record) {
        throw new AttendanceIngestionError('ATTENDANCE_RECORD_NOT_FOUND', 'Attendance record not found.', 404);
      }

      const previousState = {
        status: record.status,
        sourceType: record.source_type,
        reviewReason: record.review_reason
      };
      const newState = {
        status: input.status,
        sourceType: 'manual_correction',
        reviewReason: input.status === 'review_required' ? record.review_reason : null
      };

      const adjustment = await client.query<{ id: string; adjusted_at: Date }>(
        `INSERT INTO attendance.adjustments
           (tenant_id, school_id, attendance_record_id, previous_state, new_state, reason, actor_user_id)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
         RETURNING id, adjusted_at`,
        [
          principal.tenant.tenantId,
          schoolId,
          recordId,
          JSON.stringify(previousState),
          JSON.stringify(newState),
          cleanReason,
          principal.userId
        ]
      );

      await client.query(
        `UPDATE attendance.records
         SET status = $4,
             source_type = 'manual_correction',
             review_reason = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [
          principal.tenant.tenantId,
          schoolId,
          recordId,
          newState.status,
          newState.reviewReason
        ]
      );

      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, actor, action, previous_state, new_state, reason, safe_details)
         VALUES ($1, $2, $3, 'attendance_record_adjusted', $4, $5, $6, $7::jsonb)`,
        [
          principal.tenant.tenantId,
          schoolId,
          principal.userId,
          record.status,
          newState.status,
          cleanReason,
          JSON.stringify({
            attendanceRecordId: recordId,
            adjustmentId: adjustment.rows[0].id,
            sourceEventPreserved: record.source_event_id
          })
        ]
      );

      return {
        adjustmentId: adjustment.rows[0].id,
        attendanceRecordId: recordId,
        previousState,
        newState,
        reason: cleanReason,
        actorUserId: principal.userId,
        adjustedAt: new Date(adjustment.rows[0].adjusted_at).toISOString(),
        sourceEventId: record.source_event_id
      };
    });
  }
}

export function mapAttendanceError(req: { correlationId?: string }, error: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (error instanceof AttendanceIngestionError || error instanceof AttendanceDeviceManagementError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        code: error.code,
        error: error.message,
        correlationId: req.correlationId
      }
    };
  }
  console.error('Attendance ingestion service error.');
  return {
    status: 503,
    body: {
      success: false,
      code: 'ATTENDANCE_INGESTION_UNAVAILABLE',
      error: 'Attendance ingestion workflow is temporarily unavailable.',
      correlationId: req.correlationId
    }
  };
}
