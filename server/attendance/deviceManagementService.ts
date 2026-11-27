import { randomBytes } from 'node:crypto';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  createVerifiedTenantPrincipal,
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { REQUIRED_ACTIVATION_STEPS, type AttendanceProvisioningStep } from './provisioningWorkflow';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AttendanceDeviceManagementError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AttendanceDeviceManagementError';
  }
}

export interface SchoolAttendanceCapabilityView {
  tenantId: string;
  schoolId: string;
  applicationInstanceId: string | null;
  status: string;
  blockedReason: string | null;
  requestedConfiguration: Record<string, unknown>;
  heartbeatThresholds: { degradedSeconds: number; offlineSeconds: number };
  requestedAt: string | null;
  activatedAt: string | null;
  summary: {
    totalDevices: number;
    activeDevices: number;
    suspendedDevices: number;
    revokedDevices: number;
  };
}

export interface SchoolAttendanceDeviceView {
  id: string;
  deviceIdentity: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  deviceType: string;
  modalities: string[];
  approvedLocation: string;
  locationId: string | null;
  schoolId: string;
  applicationInstanceId: string | null;
  permittedPopulation: string;
  allowedEventTypes: string[];
  status: string;
  statusReason: string | null;
  firmwareVersion: string | null;
  adapterId: string | null;
  adapterVersion: string | null;
  integrationStatus: string;
  lastHeartbeatAt: string | null;
  lastEventAt: string | null;
  lastSequenceNumber: number | null;
  connectivityStatus: 'online' | 'degraded' | 'offline' | 'unknown';
  connectivityNote: string;
  credentialStatus: 'active' | 'revoked' | 'not_issued';
  credentialVersion: number | null;
  enrollmentAcknowledgedAt: string | null;
  revokedAt: string | null;
  decommissionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolAttendanceDeviceDetailView extends SchoolAttendanceDeviceView {
  healthChecks: Array<{
    id: string;
    connectivityStatus: string;
    attendanceProcessingStatus: string;
    configurationSyncStatus: string;
    clockDriftMs: number | null;
    pendingEventCount: number | null;
    checkedAt: string;
    safeDetails: Record<string, unknown>;
  }>;
  auditHistory: Array<{
    id: string;
    actor: string;
    action: string;
    previousState: string | null;
    newState: string | null;
    reason: string | null;
    occurredAt: string;
  }>;
}

function actorIdentifier(principal: AuthorizedPrincipal): string {
  return principal.userId || principal.tenant.email || 'authorized-actor';
}

function controlPlanePrincipalFor(principal: AuthorizedPrincipal): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'control-plane',
      role: 'super_admin',
      userId: principal.userId,
      email: principal.tenant.email || `${principal.userId}@tenant.internal`,
      appId: 'curriculum-flow',
      schoolName: 'School',
      subscriptionTier: 'system',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: '/attendance',
      issuer: 'attendance-device-management',
      audience: 'control-plane',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      tokenSignature: 'internal-control-plane-op',
      permissions: []
    }
  });
}

function evaluateConnectivity(row: {
  last_heartbeat_at: Date | string | null;
  degraded_threshold_seconds?: number | null;
  offline_threshold_seconds?: number | null;
  connectivity_status?: string | null;
}): { status: 'online' | 'degraded' | 'offline' | 'unknown'; note: string } {
  if (!row.last_heartbeat_at) {
    return { status: 'unknown', note: 'no_heartbeat_received' };
  }
  const heartbeatMs = row.last_heartbeat_at instanceof Date
    ? row.last_heartbeat_at.getTime()
    : Date.parse(String(row.last_heartbeat_at));
  if (!Number.isFinite(heartbeatMs)) {
    return { status: 'unknown', note: 'invalid_heartbeat_timestamp' };
  }
  const ageSeconds = Math.max(0, Math.floor((Date.now() - heartbeatMs) / 1000));
  const degradedThreshold = Number(row.degraded_threshold_seconds || 300);
  const offlineThreshold = Number(row.offline_threshold_seconds || 900);
  if (ageSeconds >= offlineThreshold) {
    return { status: 'offline', note: 'heartbeat_threshold_exceeded_without_disconnect_proof' };
  }
  if (ageSeconds >= degradedThreshold) {
    return { status: 'degraded', note: 'heartbeat_degraded_threshold_exceeded' };
  }
  return { status: 'online', note: 'within_heartbeat_threshold' };
}

function requireReason(reason: unknown, code = 'REASON_REQUIRED'): string {
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    throw new AttendanceDeviceManagementError(code, 'A valid operational reason (1-500 chars) is required.', 400);
  }
  return reason.trim();
}

export async function resolveAuthorizedSchoolId(
  client: DatabaseClient,
  principal: AuthorizedPrincipal,
  permission: string,
  requestedSchoolId?: string
): Promise<{ schoolId: string; applicationInstanceId: string | null }> {
  if (requestedSchoolId !== undefined && !uuid.test(requestedSchoolId)) {
    throw new AttendanceDeviceManagementError('INVALID_SCHOOL_ID', 'Requested school ID is invalid.', 400);
  }

  const schoolsRes = await client.query<{ school_id: string; application_instance_id: string | null }>(
    `SELECT s.id AS school_id,
            (SELECT ai.id FROM production.application_instances ai
             WHERE ai.tenant_id = s.tenant_id AND ai.school_id = s.id
             ORDER BY ai.created_at DESC LIMIT 1) AS application_instance_id
     FROM production.schools s
     WHERE s.tenant_id = $1
     ORDER BY s.created_at ASC`,
    [principal.tenant.tenantId]
  );

  const ownedSchools = schoolsRes.rows;
  if (ownedSchools.length === 0) {
    throw new AttendanceDeviceManagementError('SCHOOL_NOT_FOUND', 'No school exists for this tenant.', 404);
  }

  if (requestedSchoolId) {
    const matched = ownedSchools.find(row => row.school_id === requestedSchoolId);
    if (!matched) {
      throw new AttendanceDeviceManagementError('FORBIDDEN', 'You do not have access to this school.', 403);
    }
    if (!principal.hasPermissionFor(permission, 'school', matched.school_id)) {
      throw new AttendanceDeviceManagementError('FORBIDDEN', 'Permission denied for this school.', 403);
    }
    return {
      schoolId: matched.school_id,
      applicationInstanceId: matched.application_instance_id
    };
  }

  const permitted = ownedSchools.filter(row => principal.hasPermissionFor(permission, 'school', row.school_id));
  if (permitted.length === 0) {
    throw new AttendanceDeviceManagementError('FORBIDDEN', 'Permission denied.', 403);
  }
  if (permitted.length > 1) {
    throw new AttendanceDeviceManagementError(
      'SCHOOL_SELECTION_REQUIRED',
      'Multiple schools exist under this tenant; specify schoolId.',
      400
    );
  }
  return {
    schoolId: permitted[0].school_id,
    applicationInstanceId: permitted[0].application_instance_id
  };
}

export class AttendanceDeviceManagementService {
  constructor(private readonly pool: DatabasePool) {}

  private async fetchControlPlaneCredentialStatuses(
    principal: AuthorizedPrincipal,
    deviceIdentities: string[]
  ): Promise<Map<string, { credentialVersion: number; revokedAt: string | null }>> {
    const map = new Map<string, { credentialVersion: number; revokedAt: string | null }>();
    if (deviceIdentities.length === 0) return map;

    const cpRes = await withControlPlaneTransaction(this.pool, controlPlanePrincipalFor(principal), async client => {
      return client.query<{
        device_identity: string;
        credential_version: number;
        revoked_at: Date | null;
      }>(
        `SELECT device_identity, credential_version, revoked_at
         FROM control_plane.attendance_device_credentials
         WHERE tenant_id = $1 AND device_identity = ANY($2::text[])`,
        [principal.tenant.tenantId, deviceIdentities]
      );
    });
    for (const row of cpRes.rows) {
      map.set(row.device_identity, {
        credentialVersion: Number(row.credential_version),
        revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null
      });
    }
    return map;
  }

  async getCapability(
    principal: AuthorizedPrincipal,
    requestedSchoolId?: string
  ): Promise<SchoolAttendanceCapabilityView> {
    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId, applicationInstanceId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceRead,
        requestedSchoolId
      );

      const [capRes, countsRes] = await Promise.all([
        client.query<any>(
          `SELECT application_instance_id, status, blocked_reason, requested_configuration,
                  heartbeat_thresholds, requested_at, activated_at
           FROM attendance.school_capabilities
           WHERE tenant_id = $1 AND school_id = $2
           ORDER BY updated_at DESC LIMIT 1`,
          [principal.tenant.tenantId, schoolId]
        ),
        client.query<{
          total: string;
          active: string;
          suspended: string;
          revoked: string;
        }>(
          `SELECT count(*)::text AS total,
                  count(*) FILTER (WHERE status = 'active')::text AS active,
                  count(*) FILTER (WHERE status = 'suspended')::text AS suspended,
                  count(*) FILTER (WHERE status IN ('revoked', 'decommissioned'))::text AS revoked
           FROM attendance.devices
           WHERE tenant_id = $1 AND school_id = $2`,
          [principal.tenant.tenantId, schoolId]
        )
      ]);

      const cap = capRes.rows[0];
      const counts = countsRes.rows[0] || { total: '0', active: '0', suspended: '0', revoked: '0' };
      const thresholds = cap?.heartbeat_thresholds || {};

      return {
        tenantId: principal.tenant.tenantId,
        schoolId,
        applicationInstanceId: cap?.application_instance_id ?? applicationInstanceId,
        status: cap?.status ?? 'not_requested',
        blockedReason: cap?.blocked_reason ?? null,
        requestedConfiguration: cap?.requested_configuration ?? {},
        heartbeatThresholds: {
          degradedSeconds: Number(thresholds.degradedSeconds || 300),
          offlineSeconds: Number(thresholds.offlineSeconds || 900)
        },
        requestedAt: cap?.requested_at ? new Date(cap.requested_at).toISOString() : null,
        activatedAt: cap?.activated_at ? new Date(cap.activated_at).toISOString() : null,
        summary: {
          totalDevices: Number(counts.total),
          activeDevices: Number(counts.active),
          suspendedDevices: Number(counts.suspended),
          revokedDevices: Number(counts.revoked)
        }
      };
    });
  }

  private mapDeviceRow(
    row: any,
    credMap: Map<string, { credentialVersion: number; revokedAt: string | null }>
  ): SchoolAttendanceDeviceView {
    const conn = evaluateConnectivity(row);
    const cred = credMap.get(row.device_identity);
    return {
      id: row.id,
      deviceIdentity: row.device_identity,
      displayName: row.display_name || row.device_identity,
      manufacturer: row.manufacturer ?? null,
      model: row.model ?? null,
      deviceType: row.device_type,
      modalities: row.modalities ?? [],
      approvedLocation: row.approved_location,
      locationId: row.location_id ?? null,
      schoolId: row.school_id,
      applicationInstanceId: row.application_instance_id ?? null,
      permittedPopulation: row.permitted_population,
      allowedEventTypes: row.allowed_event_types ?? [],
      status: row.status,
      statusReason: row.status_reason ?? null,
      firmwareVersion: row.firmware_version ?? null,
      adapterId: row.adapter_id ?? null,
      adapterVersion: row.adapter_version ?? null,
      integrationStatus: row.adapter_verification_status ?? row.catalogue_verification_status ?? 'unverified',
      lastHeartbeatAt: row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : null,
      lastEventAt: row.last_event_at ? new Date(row.last_event_at).toISOString() : null,
      lastSequenceNumber: row.last_sequence_number !== null && row.last_sequence_number !== undefined
        ? Number(row.last_sequence_number)
        : null,
      connectivityStatus: conn.status,
      connectivityNote: conn.note,
      credentialStatus: !cred ? 'not_issued' : cred.revokedAt ? 'revoked' : 'active',
      credentialVersion: cred?.credentialVersion ?? null,
      enrollmentAcknowledgedAt: row.enrollment_acknowledged_at
        ? new Date(row.enrollment_acknowledged_at).toISOString()
        : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      decommissionedAt: row.decommissioned_at ? new Date(row.decommissioned_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  async listDevices(
    principal: AuthorizedPrincipal,
    requestedSchoolId?: string
  ): Promise<SchoolAttendanceDeviceView[]> {
    const rows = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceRead,
        requestedSchoolId
      );
      const res = await client.query(
        `SELECT d.*,
                c.manufacturer,
                c.model,
                c.verification_status AS catalogue_verification_status,
                da.verification_status AS adapter_verification_status,
                alloc.application_instance_id
         FROM attendance.devices d
         LEFT JOIN attendance.device_catalogue c ON c.id = d.catalogue_model_id
         LEFT JOIN attendance.device_adapters da
           ON da.adapter_id = d.adapter_id AND da.adapter_version = d.adapter_version
         LEFT JOIN LATERAL (
           SELECT a.application_instance_id
           FROM attendance.device_allocations a
           WHERE a.tenant_id = d.tenant_id AND a.school_id = d.school_id AND a.device_id = d.id
           ORDER BY a.allocated_at DESC LIMIT 1
         ) alloc ON true
         WHERE d.tenant_id = $1 AND d.school_id = $2
         ORDER BY d.created_at DESC`,
        [principal.tenant.tenantId, schoolId]
      );
      return res.rows;
    });

    const credMap = await this.fetchControlPlaneCredentialStatuses(
      principal,
      rows.map(r => String(r.device_identity))
    );
    return rows.map(row => this.mapDeviceRow(row, credMap));
  }

  async getDeviceDetail(
    principal: AuthorizedPrincipal,
    deviceId: string,
    requestedSchoolId?: string
  ): Promise<SchoolAttendanceDeviceDetailView> {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }

    const detail = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceRead,
        requestedSchoolId
      );
      const devRes = await client.query(
        `SELECT d.*,
                c.manufacturer,
                c.model,
                c.verification_status AS catalogue_verification_status,
                da.verification_status AS adapter_verification_status,
                alloc.application_instance_id
         FROM attendance.devices d
         LEFT JOIN attendance.device_catalogue c ON c.id = d.catalogue_model_id
         LEFT JOIN attendance.device_adapters da
           ON da.adapter_id = d.adapter_id AND da.adapter_version = d.adapter_version
         LEFT JOIN LATERAL (
           SELECT a.application_instance_id
           FROM attendance.device_allocations a
           WHERE a.tenant_id = d.tenant_id AND a.school_id = d.school_id AND a.device_id = d.id
           ORDER BY a.allocated_at DESC LIMIT 1
         ) alloc ON true
         WHERE d.tenant_id = $1 AND d.school_id = $2 AND d.id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      const device = devRes.rows[0];
      if (!device) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }

      const [healthRes, auditRes] = await Promise.all([
        client.query(
          `SELECT id, connectivity_status, attendance_processing_status,
                  configuration_sync_status, clock_drift_ms, pending_event_count,
                  checked_at, safe_details
           FROM attendance.device_health_checks
           WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           ORDER BY checked_at DESC LIMIT 20`,
          [principal.tenant.tenantId, schoolId, deviceId]
        ),
        client.query(
          `SELECT id, actor, action, previous_state, new_state, reason, occurred_at
           FROM attendance.provisioning_audit_events
           WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           ORDER BY occurred_at DESC LIMIT 30`,
          [principal.tenant.tenantId, schoolId, deviceId]
        )
      ]);
      return {
        device,
        healthChecks: healthRes.rows,
        auditHistory: auditRes.rows
      };
    });

    const credMap = await this.fetchControlPlaneCredentialStatuses(principal, [detail.device.device_identity]);
    return {
      ...this.mapDeviceRow(detail.device, credMap),
      healthChecks: detail.healthChecks.map(h => ({
        id: h.id,
        connectivityStatus: h.connectivity_status,
        attendanceProcessingStatus: h.attendance_processing_status,
        configurationSyncStatus: h.configuration_sync_status,
        clockDriftMs: h.clock_drift_ms !== null ? Number(h.clock_drift_ms) : null,
        pendingEventCount: h.pending_event_count !== null ? Number(h.pending_event_count) : null,
        checkedAt: new Date(h.checked_at).toISOString(),
        safeDetails: h.safe_details ?? {}
      })),
      auditHistory: detail.auditHistory.map(a => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        previousState: a.previous_state,
        newState: a.new_state,
        reason: a.reason,
        occurredAt: new Date(a.occurred_at).toISOString()
      }))
    };
  }

  async testDeviceConnectivity(
    principal: AuthorizedPrincipal,
    deviceId: string,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }

    const deviceLookup = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesManage,
        requestedSchoolId
      );
      const res = await client.query<any>(
        `SELECT d.*, da.verification_status AS adapter_verification_status, da.enabled AS adapter_enabled
         FROM attendance.devices d
         LEFT JOIN attendance.device_adapters da
           ON da.adapter_id = d.adapter_id AND da.adapter_version = d.adapter_version
         WHERE d.tenant_id = $1 AND d.school_id = $2 AND d.id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      if (!res.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      return { schoolId, device: res.rows[0] };
    });

    const credMap = await this.fetchControlPlaneCredentialStatuses(principal, [deviceLookup.device.device_identity]);
    const cred = credMap.get(deviceLookup.device.device_identity);
    const hasActiveCredential = Boolean(cred && !cred.revokedAt);
    const conn = evaluateConnectivity(deviceLookup.device);
    const adapterReady = deviceLookup.device.adapter_verification_status === 'implemented_tested' &&
      Boolean(deviceLookup.device.adapter_enabled);

    const processingStatus = !hasActiveCredential || ['revoked', 'decommissioned', 'suspended'].includes(deviceLookup.device.status)
      ? 'failed'
      : conn.status === 'online' && adapterReady
        ? 'healthy'
        : 'degraded';

    const syncStatus = !deviceLookup.device.enrollment_acknowledged_at
      ? 'pending'
      : hasActiveCredential ? 'synced' : 'failed';

    const safeDetails = {
      credentialStatus: hasActiveCredential ? 'active' : 'missing_or_revoked',
      adapterVerified: adapterReady,
      connectivityNote: conn.note,
      deviceStatus: deviceLookup.device.status,
      hardwarePingPerformed: false
    };

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const inserted = await client.query<{ id: string; checked_at: Date }>(
        `INSERT INTO attendance.device_health_checks
           (tenant_id, school_id, device_id, connectivity_status,
            attendance_processing_status, configuration_sync_status, safe_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         RETURNING id, checked_at`,
        [
          principal.tenant.tenantId,
          deviceLookup.schoolId,
          deviceId,
          conn.status,
          processingStatus,
          syncStatus,
          JSON.stringify(safeDetails)
        ]
      );
      await client.query(
        `UPDATE attendance.devices
         SET connectivity_status = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, deviceLookup.schoolId, deviceId, conn.status]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, safe_details)
         VALUES ($1, $2, $3, $4, 'device_connectivity_tested', $5, $5, $6::jsonb)`,
        [
          principal.tenant.tenantId,
          deviceLookup.schoolId,
          deviceId,
          actorIdentifier(principal),
          deviceLookup.device.status,
          JSON.stringify(safeDetails)
        ]
      );
      return {
        healthCheckId: inserted.rows[0].id,
        deviceId,
        connectivityStatus: conn.status,
        attendanceProcessingStatus: processingStatus,
        configurationSyncStatus: syncStatus,
        checkedAt: new Date(inserted.rows[0].checked_at).toISOString(),
        safeDetails
      };
    });
  }

  async suspendDevice(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesSuspend,
        requestedSchoolId
      );
      const currentRes = await client.query<{ status: string; device_identity: string }>(
        `SELECT status, device_identity FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      const device = currentRes.rows[0];
      if (!device) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (!['active', 'degraded', 'offline', 'enrolled'].includes(device.status)) {
        throw new AttendanceDeviceManagementError(
          'INVALID_DEVICE_STATE_TRANSITION',
          `Cannot suspend device in status '${device.status}'.`,
          409
        );
      }
      await client.query(
        `UPDATE attendance.devices
         SET status = 'suspended', status_reason = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId, cleanReason]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET state = 'suspended'
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, reason)
         VALUES ($1, $2, $3, $4, 'device_suspended', $5, 'suspended', $6)`,
        [principal.tenant.tenantId, schoolId, deviceId, actorIdentifier(principal), device.status, cleanReason]
      );
      return { deviceId, deviceIdentity: device.device_identity, status: 'suspended', reason: cleanReason };
    });
  }

  async reactivateDevice(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    const check = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesActivate,
        requestedSchoolId
      );
      const currentRes = await client.query<any>(
        `SELECT d.*, da.verification_status AS adapter_verification_status, da.enabled AS adapter_enabled
         FROM attendance.devices d
         LEFT JOIN attendance.device_adapters da
           ON da.adapter_id = d.adapter_id AND da.adapter_version = d.adapter_version
         WHERE d.tenant_id = $1 AND d.school_id = $2 AND d.id = $3 FOR UPDATE`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      const device = currentRes.rows[0];
      if (!device) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (device.status !== 'suspended') {
        throw new AttendanceDeviceManagementError(
          'INVALID_DEVICE_STATE_TRANSITION',
          `Device in status '${device.status}' cannot be reactivated.`,
          409
        );
      }

      const allocRes = await client.query<{
        application_instance_id: string;
        provisioning_request_id: string | null;
      }>(
        `SELECT application_instance_id, provisioning_request_id
         FROM attendance.device_allocations
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')
         LIMIT 1`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      const alloc = allocRes.rows[0];
      if (!alloc) {
        throw new AttendanceDeviceManagementError('REACTIVATION_PREREQUISITES_UNMET', 'Device has no active allocation.', 409);
      }

      const capRes = await client.query<{ status: string }>(
        `SELECT status FROM attendance.school_capabilities
         WHERE tenant_id = $1 AND school_id = $2 AND application_instance_id = $3`,
        [principal.tenant.tenantId, schoolId, alloc.application_instance_id]
      );
      if (capRes.rows[0]?.status !== 'active') {
        throw new AttendanceDeviceManagementError('REACTIVATION_PREREQUISITES_UNMET', 'School attendance capability is not active.', 409);
      }

      if (device.adapter_verification_status !== 'implemented_tested' || !device.adapter_enabled) {
        throw new AttendanceDeviceManagementError('REACTIVATION_PREREQUISITES_UNMET', 'Verified enabled hardware adapter is required.', 409);
      }

      if (alloc.provisioning_request_id) {
        const stepsRes = await client.query<{ step_name: AttendanceProvisioningStep }>(
          `SELECT DISTINCT step_name FROM attendance.provisioning_steps
           WHERE tenant_id = $1 AND request_id = $2 AND status = 'succeeded'`,
          [principal.tenant.tenantId, alloc.provisioning_request_id]
        );
        const passed = new Set(stepsRes.rows.map(r => r.step_name));
        if (!REQUIRED_ACTIVATION_STEPS.every(step => passed.has(step))) {
          throw new AttendanceDeviceManagementError('REACTIVATION_PREREQUISITES_UNMET', 'Required activation verification steps are incomplete.', 409);
        }
      }
      return { schoolId, device };
    });

    const credMap = await this.fetchControlPlaneCredentialStatuses(principal, [check.device.device_identity]);
    const cred = credMap.get(check.device.device_identity);
    if (!cred || cred.revokedAt) {
      throw new AttendanceDeviceManagementError(
        'REACTIVATION_PREREQUISITES_UNMET',
        'Device has no active unrevoked signing credential.',
        409
      );
    }

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      await client.query(
        `UPDATE attendance.devices
         SET status = 'active', status_reason = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, check.schoolId, deviceId, cleanReason]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET state = 'active'
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')`,
        [principal.tenant.tenantId, check.schoolId, deviceId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, reason)
         VALUES ($1, $2, $3, $4, 'device_reactivated', 'suspended', 'active', $5)`,
        [principal.tenant.tenantId, check.schoolId, deviceId, actorIdentifier(principal), cleanReason]
      );
      return { deviceId, deviceIdentity: check.device.device_identity, status: 'active', reason: cleanReason };
    });
  }

  async revokeDevice(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    const target = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesRevoke,
        requestedSchoolId
      );
      const res = await client.query<{ status: string; device_identity: string }>(
        `SELECT status, device_identity FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      if (!res.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (['revoked', 'decommissioned'].includes(res.rows[0].status)) {
        throw new AttendanceDeviceManagementError(
          'INVALID_DEVICE_STATE_TRANSITION',
          `Device is already '${res.rows[0].status}'.`,
          409
        );
      }
      return { schoolId, device: res.rows[0] };
    });

    // Fail-closed: revoke control-plane signing credential first so device cannot authenticate
    await withControlPlaneTransaction(this.pool, controlPlanePrincipalFor(principal), async client => {
      const revoked = await client.query<{ credential_version: number }>(
        `UPDATE control_plane.attendance_device_credentials
         SET revoked_at = COALESCE(revoked_at, now()),
             revocation_reason = $5
         WHERE device_identity = $1 AND tenant_id = $2 AND school_id = $3 AND device_id = $4
         RETURNING credential_version`,
        [target.device.device_identity, principal.tenant.tenantId, target.schoolId, deviceId, cleanReason]
      );
      if (revoked.rows[0]) {
        await client.query(
          `INSERT INTO control_plane.attendance_device_credential_history
             (device_identity, tenant_id, school_id, device_id, credential_version, event_type, actor, reason)
           VALUES ($1, $2, $3, $4, $5, 'revoked', $6, $7)`,
          [
            target.device.device_identity,
            principal.tenant.tenantId,
            target.schoolId,
            deviceId,
            Number(revoked.rows[0].credential_version),
            actorIdentifier(principal),
            cleanReason
          ]
        );
      }
    });

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      await client.query(
        `UPDATE attendance.devices
         SET status = 'revoked', revoked_at = now(), status_reason = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, target.schoolId, deviceId, cleanReason]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET state = 'revoked', released_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')`,
        [principal.tenant.tenantId, target.schoolId, deviceId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, reason)
         VALUES ($1, $2, $3, $4, 'device_revoked', $5, 'revoked', $6)`,
        [
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          actorIdentifier(principal),
          target.device.status,
          cleanReason
        ]
      );
      return { deviceId, deviceIdentity: target.device.device_identity, status: 'revoked', reason: cleanReason };
    });
  }

  async decommissionDevice(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    const target = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesRevoke,
        requestedSchoolId
      );
      const res = await client.query<{ status: string; device_identity: string }>(
        `SELECT status, device_identity FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      if (!res.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (!['revoked', 'suspended', 'pending', 'offline'].includes(res.rows[0].status)) {
        throw new AttendanceDeviceManagementError(
          'INVALID_DEVICE_STATE_TRANSITION',
          'Active device must be suspended or revoked before decommissioning.',
          409
        );
      }
      return { schoolId, device: res.rows[0] };
    });

    await withControlPlaneTransaction(this.pool, controlPlanePrincipalFor(principal), async client => {
      const revoked = await client.query<{ credential_version: number }>(
        `UPDATE control_plane.attendance_device_credentials
         SET revoked_at = COALESCE(revoked_at, now()),
             revocation_reason = COALESCE(revocation_reason, $5)
         WHERE device_identity = $1 AND tenant_id = $2 AND school_id = $3 AND device_id = $4
           AND revoked_at IS NULL
         RETURNING credential_version`,
        [target.device.device_identity, principal.tenant.tenantId, target.schoolId, deviceId, cleanReason]
      );
      if (revoked.rows[0]) {
        await client.query(
          `INSERT INTO control_plane.attendance_device_credential_history
             (device_identity, tenant_id, school_id, device_id, credential_version, event_type, actor, reason)
           VALUES ($1, $2, $3, $4, $5, 'revoked', $6, $7)`,
          [
            target.device.device_identity,
            principal.tenant.tenantId,
            target.schoolId,
            deviceId,
            Number(revoked.rows[0].credential_version),
            actorIdentifier(principal),
            cleanReason
          ]
        );
      }
    });

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      await client.query(
        `UPDATE attendance.devices
         SET status = 'decommissioned', decommissioned_at = now(), status_reason = $4, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, target.schoolId, deviceId, cleanReason]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET state = 'decommissioned', released_at = COALESCE(released_at, now())
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state <> 'decommissioned'`,
        [principal.tenant.tenantId, target.schoolId, deviceId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, previous_state, new_state, reason)
         VALUES ($1, $2, $3, $4, 'device_decommissioned', $5, 'decommissioned', $6)`,
        [
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          actorIdentifier(principal),
          target.device.status,
          cleanReason
        ]
      );
      return { deviceId, deviceIdentity: target.device.device_identity, status: 'decommissioned', reason: cleanReason };
    });
  }

  async reassignDeviceLocation(
    principal: AuthorizedPrincipal,
    deviceId: string,
    input: { locationId?: string; reason: unknown },
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId) || !input?.locationId || !uuid.test(input.locationId)) {
      throw new AttendanceDeviceManagementError('INVALID_LOCATION_REASSIGNMENT', 'Valid deviceId and locationId are required.', 400);
    }
    const cleanReason = requireReason(input.reason);

    return withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceDevicesManage,
        requestedSchoolId
      );
      const [devRes, locRes] = await Promise.all([
        client.query<{ status: string; approved_location: string; location_id: string | null }>(
          `SELECT status, approved_location, location_id FROM attendance.devices
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
          [principal.tenant.tenantId, schoolId, deviceId]
        ),
        client.query<{ id: string; display_name: string; status: string }>(
          `SELECT id, display_name, status FROM attendance.installation_locations
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [principal.tenant.tenantId, schoolId, input.locationId]
        )
      ]);
      const device = devRes.rows[0];
      const location = locRes.rows[0];
      if (!device) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (['revoked', 'decommissioned'].includes(device.status)) {
        throw new AttendanceDeviceManagementError('INVALID_DEVICE_STATE_TRANSITION', 'Cannot reassign revoked or decommissioned device.', 409);
      }
      if (!location || location.status !== 'active') {
        throw new AttendanceDeviceManagementError('INSTALLATION_LOCATION_NOT_FOUND', 'Active installation location not found in school.', 404);
      }

      await client.query(
        `UPDATE attendance.devices
         SET location_id = $4, approved_location = $5, updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId, location.id, location.display_name]
      );
      await client.query(
        `UPDATE attendance.device_allocations
         SET location_id = $4
         WHERE tenant_id = $1 AND school_id = $2 AND device_id = $3
           AND state NOT IN ('revoked', 'decommissioned')`,
        [principal.tenant.tenantId, schoolId, deviceId, location.id]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'device_location_reassigned', $5, $6::jsonb)`,
        [
          principal.tenant.tenantId,
          schoolId,
          deviceId,
          actorIdentifier(principal),
          cleanReason,
          JSON.stringify({
            previousLocation: device.approved_location,
            newLocationId: location.id,
            newLocation: location.display_name
          })
        ]
      );
      return {
        deviceId,
        locationId: location.id,
        approvedLocation: location.display_name,
        reason: cleanReason
      };
    });
  }

  async rotateDeviceCredential(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    const target = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceCredentialsManage,
        requestedSchoolId
      );
      const res = await client.query<{ status: string; device_identity: string }>(
        `SELECT status, device_identity FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      if (!res.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      if (['revoked', 'decommissioned'].includes(res.rows[0].status)) {
        throw new AttendanceDeviceManagementError(
          'INVALID_DEVICE_STATE_TRANSITION',
          'Cannot rotate credential for a revoked or decommissioned device.',
          409
        );
      }
      return { schoolId, device: res.rows[0] };
    });

    const newSecret = randomBytes(32).toString('hex');
    const encryptedSigningKey = ServerSecretVault.encrypt(newSecret);

    const cpResult = await withControlPlaneTransaction(this.pool, controlPlanePrincipalFor(principal), async client => {
      const updated = await client.query<{ credential_version: number; rotated_at: Date }>(
        `UPDATE control_plane.attendance_device_credentials
         SET encrypted_signing_key = $5,
             credential_version = credential_version + 1,
             revoked_at = NULL,
             revocation_reason = NULL,
             rotated_at = now()
         WHERE device_identity = $1 AND tenant_id = $2 AND school_id = $3 AND device_id = $4
         RETURNING credential_version, rotated_at`,
        [target.device.device_identity, principal.tenant.tenantId, target.schoolId, deviceId, encryptedSigningKey]
      );
      if (!updated.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_CREDENTIAL_NOT_FOUND', 'No control-plane credential record exists for this device.', 404);
      }
      const nextVersion = Number(updated.rows[0].credential_version);
      await client.query(
        `INSERT INTO control_plane.attendance_device_credential_history
           (device_identity, tenant_id, school_id, device_id, credential_version, event_type, actor, reason)
         VALUES ($1, $2, $3, $4, $5, 'rotated', $6, $7)`,
        [
          target.device.device_identity,
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          nextVersion,
          actorIdentifier(principal),
          cleanReason
        ]
      );
      return {
        credentialVersion: nextVersion,
        rotatedAt: new Date(updated.rows[0].rotated_at).toISOString()
      };
    });

    await withTenantTransaction(this.pool, principal.tenant, async client => {
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'device_credential_rotated', $5, $6::jsonb)`,
        [
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          actorIdentifier(principal),
          cleanReason,
          JSON.stringify({ credentialVersion: cpResult.credentialVersion })
        ]
      );
    });

    return {
      deviceId,
      deviceIdentity: target.device.device_identity,
      credentialVersion: cpResult.credentialVersion,
      rotatedAt: cpResult.rotatedAt
    };
  }

  async revokeDeviceCredential(
    principal: AuthorizedPrincipal,
    deviceId: string,
    reason: unknown,
    requestedSchoolId?: string
  ) {
    if (!uuid.test(deviceId)) {
      throw new AttendanceDeviceManagementError('INVALID_DEVICE_ID', 'Invalid device ID.', 400);
    }
    const cleanReason = requireReason(reason);

    const target = await withTenantTransaction(this.pool, principal.tenant, async client => {
      const { schoolId } = await resolveAuthorizedSchoolId(
        client,
        principal,
        PERMISSIONS.attendanceCredentialsManage,
        requestedSchoolId
      );
      const res = await client.query<{ status: string; device_identity: string }>(
        `SELECT status, device_identity FROM attendance.devices
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [principal.tenant.tenantId, schoolId, deviceId]
      );
      if (!res.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_NOT_FOUND', 'Attendance device not found.', 404);
      }
      return { schoolId, device: res.rows[0] };
    });

    const cpResult = await withControlPlaneTransaction(this.pool, controlPlanePrincipalFor(principal), async client => {
      const updated = await client.query<{ credential_version: number }>(
        `UPDATE control_plane.attendance_device_credentials
         SET revoked_at = COALESCE(revoked_at, now()),
             revocation_reason = $5
         WHERE device_identity = $1 AND tenant_id = $2 AND school_id = $3 AND device_id = $4
           AND revoked_at IS NULL
         RETURNING credential_version`,
        [target.device.device_identity, principal.tenant.tenantId, target.schoolId, deviceId, cleanReason]
      );
      if (!updated.rows[0]) {
        throw new AttendanceDeviceManagementError('DEVICE_CREDENTIAL_ALREADY_REVOKED', 'Active device credential was not found or is already revoked.', 409);
      }
      const version = Number(updated.rows[0].credential_version);
      await client.query(
        `INSERT INTO control_plane.attendance_device_credential_history
           (device_identity, tenant_id, school_id, device_id, credential_version, event_type, actor, reason)
         VALUES ($1, $2, $3, $4, $5, 'revoked', $6, $7)`,
        [
          target.device.device_identity,
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          version,
          actorIdentifier(principal),
          cleanReason
        ]
      );
      return { credentialVersion: version };
    });

    await withTenantTransaction(this.pool, principal.tenant, async client => {
      if (target.device.status === 'active') {
        await client.query(
          `UPDATE attendance.devices
           SET status = 'suspended', status_reason = $4, updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [principal.tenant.tenantId, target.schoolId, deviceId, `credential_revoked: ${cleanReason}`]
        );
      }
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, device_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'device_credential_revoked', $5, $6::jsonb)`,
        [
          principal.tenant.tenantId,
          target.schoolId,
          deviceId,
          actorIdentifier(principal),
          cleanReason,
          JSON.stringify({ credentialVersion: cpResult.credentialVersion })
        ]
      );
    });

    return {
      deviceId,
      deviceIdentity: target.device.device_identity,
      credentialStatus: 'revoked',
      credentialVersion: cpResult.credentialVersion
    };
  }
}
