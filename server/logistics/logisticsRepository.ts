import { createHash, createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withTenantTransaction } from '../db/tenantContext';

const MAX_PIN_FAILURES = 5;
const PIN_LOCKOUT_MINUTES = 15;

function scrypt(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, length, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export class LogisticsError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'SCHOOL_CONTEXT_UNAVAILABLE'
      | 'FEATURE_DISABLED'
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'CONFLICT',
    message: string = code
  ) {
    super(message);
    this.name = 'LogisticsError';
  }
}

export interface IssuedPickupPass {
  id: string;
  token: string;
  expiresAt: Date;
}

export interface GateScanResult {
  eventId: string;
  authorized: boolean;
  reason: string;
  occurredAt: Date;
}

export interface OccupancyRecord {
  id: string;
  name: string;
  totalCapacity: number;
  occupiedCount: number;
  availableBeds: number;
  occupancyRatePercent: number;
  houseMasterName: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  category: 'Junior Secondary' | 'Senior Secondary' | 'Mixed';
  houseMasterPhone: string;
  assistantHouseMasterName: string;
  rooms: [];
  prefectsCount: number;
  status: 'optimal' | 'near_capacity' | 'full' | 'maintenance';
  colorHex: string;
}

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function fingerprintGateScan(input: {
  token: string;
  pin?: string;
  gateLocationId: string;
  direction: 'entry' | 'exit';
}): Buffer {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (secret.length < 32 ||
      secret === 'default_insecure_secret' ||
      secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
    throw new Error('Secure gate-scan idempotency signing is not configured.');
  }
  return createHmac('sha256', secret)
    .update(JSON.stringify([
      'logistics-gate-scan-v1',
      input.token,
      input.pin ?? null,
      input.gateLocationId,
      input.direction
    ]))
    .digest();
}

function pinMatches(pin: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split('$');
  if (algorithm !== 'scrypt' || !/^[0-9a-f]{32}$/i.test(saltHex || '') ||
      !/^[0-9a-f]{128}$/i.test(hashHex || '') || !/^\d{4,12}$/.test(pin)) {
    return Promise.resolve(false);
  }
  return scrypt(pin, Buffer.from(saltHex, 'hex'), 64).then(derived => {
    const expected = Buffer.from(hashHex, 'hex');
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  });
}

async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4,12}$/.test(pin)) throw new LogisticsError('INVALID_INPUT', 'PIN must contain 4 to 12 digits.');
  const salt = randomBytes(16);
  const derived = await scrypt(pin, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function validateIdempotencyKey(value: string): string {
  const key = value.trim();
  if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new LogisticsError('INVALID_INPUT', 'A valid Idempotency-Key header is required.');
  }
  return key;
}

function validateUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new LogisticsError('INVALID_INPUT', 'A valid resource identifier is required.');
  }
  return value;
}

export class LogisticsRepository {
  constructor(private readonly pool: DatabasePool) {}

  private readonly featureForCapability: Record<string, string> = {
    gate_security: 'feat_logistics_gate_security',
    guardian_pickup: 'feat_logistics_gate_security',
    hostel_management: 'feat_logistics_boarding_house',
    exeat_management: 'feat_logistics_boarding_house',
    dining_management: 'feat_logistics_boarding_house',
    school_transport: 'feat_logistics_transportation',
    digital_library: 'feat_logistics_elibrary'
  };

  private async schoolContext(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    capability: string
  ): Promise<string> {
    const requiredFeature = this.featureForCapability[capability];
    if (!requiredFeature) throw new LogisticsError('FEATURE_DISABLED');
    const schools = await client.query<{ school_id: string; enabled_features: string[] }>(
      `SELECT school_id, enabled_features
       FROM production.application_instances
       WHERE tenant_id = $1 AND application_id = 'app_curriculum_flow'
         AND status = 'active' AND provisioning_status = 'ready'
       ORDER BY created_at DESC
       LIMIT 2`,
      [actor.tenantId]
    );
    if (schools.rowCount !== 1) {
      throw new LogisticsError('SCHOOL_CONTEXT_UNAVAILABLE');
    }
    if (!schools.rows[0].enabled_features.includes(requiredFeature)) {
      throw new LogisticsError('FEATURE_DISABLED');
    }
    const enabled = await client.query<{ enabled: boolean }>(
      `SELECT coalesce((configuration.capabilities ->> $3)::boolean, false) AS enabled
       FROM production.logistics_feature_configurations configuration
       WHERE configuration.tenant_id = $1 AND configuration.school_id = $2`,
      [actor.tenantId, schools.rows[0].school_id, capability]
    );
    if (!enabled.rows[0]?.enabled) throw new LogisticsError('FEATURE_DISABLED');
    return schools.rows[0].school_id;
  }

  async getConfiguration(actor: AuthorizedPrincipal): Promise<{
    capabilities: Record<string, boolean>;
    settings: Record<string, unknown>;
    configurationVersion: number;
  } | null> {
    if (!actor.hasPermission('logistics.configuration.read') &&
        !actor.hasPermission('logistics.configuration.manage')) {
      throw new LogisticsError('FORBIDDEN');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.resolveSchoolId(client, actor);
      const result = await client.query<{
        capabilities: Record<string, boolean>;
        settings: Record<string, unknown>;
        configuration_version: number;
      }>(
        `SELECT capabilities, settings, configuration_version
         FROM production.logistics_feature_configurations
         WHERE tenant_id = $1 AND school_id = $2`,
        [actor.tenantId, schoolId]
      );
      const row = result.rows[0];
      return row ? {
        capabilities: row.capabilities,
        settings: row.settings,
        configurationVersion: row.configuration_version
      } : null;
    });
  }

  private async resolveSchoolId(client: DatabaseClient, actor: AuthorizedPrincipal): Promise<string> {
    const result = await client.query<{ school_id: string }>(
      `SELECT school_id
       FROM production.application_instances
       WHERE tenant_id = $1 AND application_id = 'app_curriculum_flow'
         AND status = 'active' AND provisioning_status = 'ready'
       ORDER BY created_at DESC
       LIMIT 2`,
      [actor.tenantId]
    );
    if (result.rowCount !== 1) throw new LogisticsError('SCHOOL_CONTEXT_UNAVAILABLE');
    return result.rows[0].school_id;
  }

  async updateConfiguration(
    actor: AuthorizedPrincipal,
    configuration: { capabilities: Record<string, boolean>; settings: Record<string, unknown> }
  ): Promise<{ configurationVersion: number }> {
    if (!actor.hasPermission('logistics.configuration.manage')) throw new LogisticsError('FORBIDDEN');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.resolveSchoolId(client, actor);
      const enabled = await client.query<{ enabled_features: string[] }>(
        `SELECT enabled_features FROM production.application_instances
         WHERE tenant_id = $1 AND school_id = $2 AND application_id = 'app_curriculum_flow'
           AND status = 'active' AND provisioning_status = 'ready'`,
        [actor.tenantId, schoolId]
      );
      for (const [capability, value] of Object.entries(configuration.capabilities)) {
        if (value && (!this.featureForCapability[capability] ||
            !enabled.rows[0]?.enabled_features.includes(this.featureForCapability[capability]))) {
          throw new LogisticsError('FEATURE_DISABLED', `The ${capability} feature is not enabled for this application instance.`);
        }
      }
      const result = await client.query<{ configuration_version: number }>(
        `INSERT INTO production.logistics_feature_configurations
           (tenant_id, school_id, configuration_version, capabilities, settings, updated_by)
         VALUES ($1, $2, 1, $3::jsonb, $4::jsonb, $5)
         ON CONFLICT (tenant_id, school_id) DO UPDATE SET
           configuration_version = production.logistics_feature_configurations.configuration_version + 1,
           capabilities = EXCLUDED.capabilities,
           settings = EXCLUDED.settings,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()
         RETURNING configuration_version`,
        [actor.tenantId, schoolId, JSON.stringify(configuration.capabilities),
          JSON.stringify(configuration.settings), actor.userId]
      );
      await this.audit(client, actor, schoolId, 'logistics_configuration_updated', 'configuration', schoolId);
      return { configurationVersion: result.rows[0].configuration_version };
    });
  }

  async listOccupancy(actor: AuthorizedPrincipal): Promise<OccupancyRecord[]> {
    if (!actor.hasPermission('logistics.hostel.read') &&
        !actor.hasPermission('logistics.hostel.manage')) {
      throw new LogisticsError('FORBIDDEN');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, 'hostel_management');
      const result = await client.query<{
        id: string;
        name: string;
        capacity: string;
        occupied: string;
      }>(
        `SELECT building.id, building.name,
               count(DISTINCT bed.id) FILTER (WHERE bed.status = 'available')::text AS capacity,
                count(DISTINCT allocation.id)::text AS occupied
         FROM production.logistics_hostel_buildings building
         LEFT JOIN production.logistics_hostel_rooms room
           ON room.tenant_id = building.tenant_id AND room.school_id = building.school_id
          AND room.building_id = building.id
         LEFT JOIN production.logistics_hostel_beds bed
           ON bed.tenant_id = room.tenant_id AND bed.school_id = room.school_id
          AND bed.room_id = room.id
         LEFT JOIN production.logistics_bed_allocations allocation
           ON allocation.tenant_id = bed.tenant_id AND allocation.school_id = bed.school_id
          AND allocation.bed_id = bed.id AND allocation.ended_at IS NULL
         WHERE building.tenant_id = $1 AND building.school_id = $2 AND building.status = 'active'
           AND (
             $3::boolean OR EXISTS (
               SELECT 1 FROM production.logistics_hostel_assignments assignment
               WHERE assignment.tenant_id = building.tenant_id
                 AND assignment.school_id = building.school_id
                 AND assignment.building_id = building.id
                 AND assignment.user_id = $4
                 AND assignment.revoked_at IS NULL
                 AND assignment.starts_at <= now()
                 AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
             )
           )
         GROUP BY building.id, building.name, building.approved_capacity
         ORDER BY building.name`,
        [actor.tenantId, schoolId, actor.roles.includes('tenant_admin'), actor.userId]
      );
      return result.rows.map(row => {
        const totalCapacity = Number(row.capacity);
        const occupiedCount = Number(row.occupied);
        return {
          id: row.id,
          name: row.name,
          totalCapacity,
          occupiedCount,
          availableBeds: Math.max(0, totalCapacity - occupiedCount),
          occupancyRatePercent: totalCapacity
            ? Math.round((occupiedCount / totalCapacity) * 100)
            : 0,
          houseMasterName: '',
          gender: 'Mixed',
          category: 'Mixed',
          houseMasterPhone: '',
          assistantHouseMasterName: '',
          rooms: [],
          prefectsCount: 0,
          status: occupiedCount >= totalCapacity && totalCapacity > 0
            ? 'full'
            : totalCapacity > 0 && occupiedCount / totalCapacity >= 0.9 ? 'near_capacity' : 'optimal',
          colorHex: '#6366f1'
        };
      });
    });
  }

  async issuePickupPass(
    actor: AuthorizedPrincipal,
    input: {
      authorizationId: string;
      idempotencyKey: string;
      expiresAt: string;
      pin?: string;
      reusable?: boolean;
      maxUses?: number;
    }
  ): Promise<IssuedPickupPass> {
    if (!actor.hasPermission('logistics.guardians.manage')) throw new LogisticsError('FORBIDDEN');
    const authorizationId = validateUuid(input.authorizationId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const expiresAt = new Date(input.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date() ||
        expiresAt.getTime() > Date.now() + 31 * 24 * 60 * 60 * 1000) {
      throw new LogisticsError('INVALID_INPUT', 'Pass expiry must be within the next 31 days.');
    }
    const maxUses = input.reusable === true ? input.maxUses ?? 5 : 1;
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 20) {
      throw new LogisticsError('INVALID_INPUT', 'Reusable passes may authorize between 1 and 20 uses.');
    }
    const pinHash = input.pin ? await hashPin(input.pin) : null;
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, 'guardian_pickup');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${actor.tenantId}:${schoolId}:${idempotencyKey}`
      ]);
      const existing = await client.query<{ id: string; expires_at: Date }>(
        `SELECT id, expires_at FROM production.logistics_pickup_passes
         WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3`,
        [actor.tenantId, schoolId, idempotencyKey]
      );
      if (existing.rowCount) {
        throw new LogisticsError('CONFLICT', 'This pickup-pass request was already processed; plaintext credentials cannot be reissued.');
      }
      const authorization = await client.query(
        `SELECT 1
         FROM production.logistics_pickup_authorizations permission
         JOIN production.logistics_guardian_students relationship
           ON relationship.tenant_id = permission.tenant_id
          AND relationship.school_id = permission.school_id
          AND relationship.id = permission.guardian_student_id
         JOIN production.logistics_guardians guardian
           ON guardian.tenant_id = relationship.tenant_id
          AND guardian.school_id = relationship.school_id
          AND guardian.id = relationship.guardian_id
         WHERE permission.tenant_id = $1 AND permission.school_id = $2
           AND permission.id = $3 AND permission.status = 'active'
           AND permission.starts_at <= now() AND permission.ends_at > $4
           AND relationship.status = 'active' AND relationship.verified_at IS NOT NULL
           AND relationship.starts_at <= now()
           AND (relationship.ends_at IS NULL OR relationship.ends_at > now())
           AND guardian.verification_status = 'verified'
           AND (NOT permission.additional_approval_required OR permission.additional_approved_at IS NOT NULL)`,
        [actor.tenantId, schoolId, authorizationId, expiresAt]
      );
      if (authorization.rowCount !== 1) throw new LogisticsError('FORBIDDEN', 'Guardian pickup authorization is not valid for this pass period.');
      const result = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.logistics_pickup_passes
           (tenant_id, school_id, idempotency_key, pickup_authorization_id,
            token_hash, pin_hash, expires_at, max_uses, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, expires_at`,
        [actor.tenantId, schoolId, idempotencyKey, authorizationId,
          tokenHash, pinHash, expiresAt, maxUses, actor.userId]
      );
      await this.audit(client, actor, schoolId, 'pickup_pass_issued', 'pickup_pass', result.rows[0].id);
      return { id: result.rows[0].id, token, expiresAt: result.rows[0].expires_at };
    });
  }

  async scanPickupPass(
    actor: AuthorizedPrincipal,
    input: {
      token: string;
      pin?: string;
      gateLocationId: string;
      direction: 'entry' | 'exit';
      idempotencyKey: string;
    }
  ): Promise<GateScanResult> {
    if (!actor.hasPermission('logistics.gate.manage')) throw new LogisticsError('FORBIDDEN');
    const token = input.token.trim();
    if (token.length < 32 || token.length > 128) {
      throw new LogisticsError('INVALID_INPUT', 'A valid pickup-pass token is required.');
    }
    const locationId = validateUuid(input.gateLocationId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const requestFingerprint = fingerprintGateScan({
      token,
      pin: input.pin,
      gateLocationId: locationId,
      direction: input.direction
    });
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, 'gate_security');
      const gate = await client.query(
        `SELECT 1 FROM production.logistics_gate_locations
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
        [actor.tenantId, schoolId, locationId]
      );
      if (!gate.rowCount) throw new LogisticsError('NOT_FOUND', 'Active gate location not found.');
      if (!actor.roles.includes('tenant_admin')) {
        const assignment = await client.query(
          `SELECT 1 FROM production.logistics_gate_officer_assignments
           WHERE tenant_id = $1 AND school_id = $2 AND gate_location_id = $3
             AND user_id = $4 AND revoked_at IS NULL AND starts_at <= now()
             AND (ends_at IS NULL OR ends_at > now())`,
          [actor.tenantId, schoolId, locationId, actor.userId]
        );
        if (!assignment.rowCount) throw new LogisticsError('FORBIDDEN', 'Gate assignment is required for this operation.');
      }

      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${actor.tenantId}:${schoolId}:${idempotencyKey}`
      ]);
      const existingEvent = await client.query<GateScanResult & { requestFingerprint: Buffer | null }>(
        `SELECT id AS "eventId", (outcome = 'authorized') AS authorized,
                coalesce(reason_code, '') AS reason, occurred_at AS "occurredAt",
                request_fingerprint AS "requestFingerprint"
         FROM production.logistics_gate_events
         WHERE tenant_id = $1 AND school_id = $2 AND correlation_id = $3`,
        [actor.tenantId, schoolId, idempotencyKey]
      );
      if (existingEvent.rowCount) {
        const previous = existingEvent.rows[0];
        if (!Buffer.isBuffer(previous.requestFingerprint) ||
            previous.requestFingerprint.length !== requestFingerprint.length ||
            !timingSafeEqual(previous.requestFingerprint, requestFingerprint)) {
          throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different gate scan.');
        }
        return {
          eventId: previous.eventId,
          authorized: previous.authorized,
          reason: previous.reason,
          occurredAt: previous.occurredAt
        };
      }

      const passResult = await client.query<{
        id: string;
        pin_hash: string | null;
        expires_at: Date;
        revoked_at: Date | null;
        max_uses: number;
        use_count: number;
        failed_pin_attempts: number;
        locked_until: Date | null;
        authorization_status: string;
        authorization_starts_at: Date;
        authorization_ends_at: Date;
        requires_additional_approval: boolean;
        additional_approved_at: Date | null;
        relationship_status: string;
        relationship_verified_at: Date | null;
        guardian_status: string;
        guardian_id: string;
        student_id: string;
      }>(
        `SELECT pass.id, pass.pin_hash, pass.expires_at, pass.revoked_at,
                pass.max_uses, pass.use_count, pass.failed_pin_attempts, pass.locked_until,
                permission.status AS authorization_status, permission.starts_at AS authorization_starts_at,
                permission.ends_at AS authorization_ends_at,
                permission.additional_approval_required AS requires_additional_approval,
                permission.additional_approved_at,
                relationship.status AS relationship_status, relationship.verified_at AS relationship_verified_at,
                guardian.verification_status AS guardian_status, guardian.id AS guardian_id,
                relationship.student_id
         FROM production.logistics_pickup_passes pass
         JOIN production.logistics_pickup_authorizations permission
           ON permission.tenant_id = pass.tenant_id AND permission.school_id = pass.school_id
          AND permission.id = pass.pickup_authorization_id
         JOIN production.logistics_guardian_students relationship
           ON relationship.tenant_id = permission.tenant_id AND relationship.school_id = permission.school_id
          AND relationship.id = permission.guardian_student_id
         JOIN production.logistics_guardians guardian
           ON guardian.tenant_id = relationship.tenant_id AND guardian.school_id = relationship.school_id
          AND guardian.id = relationship.guardian_id
         WHERE pass.tenant_id = $1 AND pass.school_id = $2 AND pass.token_hash = $3
         FOR UPDATE OF pass`,
        [actor.tenantId, schoolId, hashToken(token)]
      );
      if (!passResult.rowCount) {
        return this.recordDeniedScan(
          client, actor, schoolId, locationId, input.direction, idempotencyKey,
          requestFingerprint, null, null, 'invalid_token'
        );
      }
      const pass = passResult.rows[0];
      let reason = '';
      if (pass.locked_until && pass.locked_until > new Date()) reason = 'pass_locked';
      else if (input.direction !== 'exit') reason = 'pickup_pass_exit_only';
      else if (pass.revoked_at) reason = 'pass_revoked';
      else if (pass.expires_at <= new Date()) reason = 'pass_expired';
      else if (pass.use_count >= pass.max_uses) reason = 'pass_already_used';
      else if (pass.authorization_status !== 'active' ||
          pass.authorization_starts_at > new Date() || pass.authorization_ends_at <= new Date()) reason = 'authorization_inactive';
      else if (pass.relationship_status !== 'active' || !pass.relationship_verified_at ||
          pass.guardian_status !== 'verified') reason = 'guardian_unverified';
      else if (pass.requires_additional_approval && !pass.additional_approved_at) reason = 'additional_approval_required';

      if (!reason && pass.pin_hash) {
        const pinValid = input.pin ? await pinMatches(input.pin, pass.pin_hash) : false;
        if (!pinValid) {
          const attempts = pass.failed_pin_attempts + 1;
          const lockout = attempts >= MAX_PIN_FAILURES;
          await client.query(
            `UPDATE production.logistics_pickup_passes
             SET failed_pin_attempts = $3,
                 locked_until = CASE WHEN $4 THEN now() + make_interval(mins => $5) ELSE locked_until END
             WHERE tenant_id = $1 AND id = $2`,
            [actor.tenantId, pass.id, attempts, lockout, PIN_LOCKOUT_MINUTES]
          );
          reason = lockout ? 'pin_lockout' : 'pin_mismatch';
        }
      }

      if (!reason && input.direction === 'exit') {
        const boarder = await client.query(
          `SELECT 1 FROM production.logistics_bed_allocations allocation
           WHERE allocation.tenant_id = $1 AND allocation.school_id = $2
             AND allocation.student_id = $3 AND allocation.ended_at IS NULL`,
          [actor.tenantId, schoolId, pass.student_id]
        );
        if (boarder.rowCount) {
          const approvedExeat = await client.query(
            `SELECT 1 FROM production.logistics_exeats exeat
             WHERE exeat.tenant_id = $1 AND exeat.school_id = $2
               AND exeat.student_id = $3
               AND exeat.status IN ('approved', 'departure_authorized')
               AND exeat.departure_due_at <= now() AND exeat.return_due_at > now()`,
            [actor.tenantId, schoolId, pass.student_id]
          );
          if (!approvedExeat.rowCount) reason = 'boarding_exeat_required';
        }
      }

      if (reason) {
        return this.recordDeniedScan(
          client, actor, schoolId, locationId, input.direction, idempotencyKey,
          requestFingerprint, pass.id, pass.student_id, reason, pass.guardian_id
        );
      }
      await client.query(
        `UPDATE production.logistics_pickup_passes
         SET use_count = use_count + 1, failed_pin_attempts = 0, locked_until = NULL
         WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, pass.id]
      );
      const result = await client.query<{ id: string; occurred_at: Date }>(
        `INSERT INTO production.logistics_gate_events
           (tenant_id, school_id, gate_location_id, student_id, guardian_id,
            pickup_pass_id, actor_user_id, direction, outcome, correlation_id, request_fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'authorized', $9, $10)
         RETURNING id, occurred_at`,
        [actor.tenantId, schoolId, locationId, pass.student_id, pass.guardian_id,
          pass.id, actor.userId, input.direction, idempotencyKey, requestFingerprint]
      );
      await this.audit(client, actor, schoolId, 'gate_scan_authorized', 'gate_event', result.rows[0].id);
      return {
        eventId: result.rows[0].id,
        authorized: true,
        reason: 'authorized',
        occurredAt: result.rows[0].occurred_at
      };
    });
  }

  private async recordDeniedScan(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    gateLocationId: string,
    direction: 'entry' | 'exit',
    idempotencyKey: string,
    requestFingerprint: Buffer,
    passId: string | null,
    studentId: string | null,
    reason: string,
    guardianId: string | null = null
  ): Promise<GateScanResult> {
    const result = await client.query<{ id: string; occurred_at: Date }>(
      `INSERT INTO production.logistics_gate_events
         (tenant_id, school_id, gate_location_id, student_id, guardian_id,
          pickup_pass_id, actor_user_id, direction, outcome, reason_code, correlation_id,
          request_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'denied', $9, $10, $11)
       ON CONFLICT (tenant_id, correlation_id) DO NOTHING
       RETURNING id, occurred_at`,
      [actor.tenantId, schoolId, gateLocationId, studentId, guardianId,
        passId, actor.userId, direction, reason, idempotencyKey, requestFingerprint]
    );
    if (!result.rowCount) {
      const previous = await client.query<GateScanResult>(
        `SELECT id AS "eventId", (outcome = 'authorized') AS authorized,
                coalesce(reason_code, '') AS reason, occurred_at AS "occurredAt"
         FROM production.logistics_gate_events
         WHERE tenant_id = $1 AND school_id = $2 AND correlation_id = $3`,
        [actor.tenantId, schoolId, idempotencyKey]
      );
      return previous.rows[0];
    }
    await this.audit(client, actor, schoolId, 'gate_scan_denied', 'gate_event', result.rows[0].id, { reason });
    return {
      eventId: result.rows[0].id,
      authorized: false,
      reason,
      occurredAt: result.rows[0].occurred_at
    };
  }

  private async audit(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.logistics_audit_events
         (tenant_id, school_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [actor.tenantId, schoolId, actor.userId, action, entityType, entityId, JSON.stringify(details)]
    );
  }
}

export const logisticsSecurity = Object.freeze({ hashToken, pinMatches, hashPin, fingerprintGateScan });
