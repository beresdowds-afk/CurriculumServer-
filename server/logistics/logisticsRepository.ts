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

function keyedFingerprint(scope: string, value: unknown): Buffer {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (secret.length < 32 ||
      secret === 'default_insecure_secret' ||
      secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
    throw new Error('Secure logistics idempotency signing is not configured.');
  }
  return createHmac('sha256', secret)
    .update(`${scope}\0${JSON.stringify(value)}`)
    .digest();
}

function fingerprintGateScan(input: {
  token: string;
  pin?: string;
  gateLocationId: string;
  direction: 'entry' | 'exit';
}): Buffer {
  return keyedFingerprint('logistics-gate-scan-v1', [
      input.token,
      input.pin ?? null,
      input.gateLocationId,
      input.direction
  ]);
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

function parsePage(page: number | undefined, pageSize: number | undefined): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const resolvedPage = page ?? 1;
  const resolvedSize = pageSize ?? 50;
  if (!Number.isInteger(resolvedPage) || resolvedPage < 1 ||
      !Number.isInteger(resolvedSize) || resolvedSize < 1 || resolvedSize > 100) {
    throw new LogisticsError('INVALID_INPUT', 'Pagination requires page >= 1 and pageSize between 1 and 100.');
  }
  return { page: resolvedPage, pageSize: resolvedSize, offset: (resolvedPage - 1) * resolvedSize };
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new LogisticsError('INVALID_INPUT', `${field} must be a valid ISO date-time.`);
  }
  return date;
}

export class LogisticsRepository {
  constructor(private readonly pool: DatabasePool) {}

  private readonly featureForCapability: Record<string, string> = {
    gate_security: 'feat_logistics_gate_security',
    guardian_pickup: 'feat_logistics_gate_security',
    hostel_management: 'feat_logistics_boarding_house',
    exeat_management: 'feat_logistics_boarding_house',
    student_movement: 'feat_logistics_gate_security',
    dining_management: 'feat_logistics_boarding_house',
    school_transport: 'feat_logistics_transportation',
    digital_library: 'feat_logistics_elibrary'
  };

  private requirePermission(actor: AuthorizedPrincipal, permission: string): void {
    if (!actor.hasPermission(permission)) throw new LogisticsError('FORBIDDEN');
  }

  private async inSchool<T>(
    actor: AuthorizedPrincipal,
    capability: string,
    permissions: string[],
    operation: (client: DatabaseClient, schoolId: string) => Promise<T>
  ): Promise<T> {
    if (!permissions.some(permission => actor.hasPermission(permission))) {
      throw new LogisticsError('FORBIDDEN');
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const schoolId = await this.schoolContext(client, actor, capability);
      return operation(client, schoolId);
    });
  }

  private async guardianForStudent(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<string> {
    const result = await client.query<{ guardian_id: string }>(
      `SELECT guardian.id AS guardian_id
       FROM production.logistics_guardians guardian
       JOIN production.logistics_guardian_students relationship
         ON relationship.tenant_id = guardian.tenant_id
        AND relationship.school_id = guardian.school_id
        AND relationship.guardian_id = guardian.id
       WHERE guardian.tenant_id = $1 AND guardian.school_id = $2
         AND guardian.user_id = $3 AND guardian.verification_status = 'verified'
         AND relationship.student_id = $4 AND relationship.status = 'active'
         AND relationship.verified_at IS NOT NULL
         AND relationship.starts_at <= now()
         AND (relationship.ends_at IS NULL OR relationship.ends_at > now())
       LIMIT 1`,
      [actor.tenantId, schoolId, actor.userId, studentId]
    );
    if (!result.rows[0]) throw new LogisticsError('FORBIDDEN', 'A verified guardian relationship to this student is required.');
    return result.rows[0].guardian_id;
  }

  private async assertGuardianCanSeeStudent(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<void> {
    if (actor.roles.includes('parent')) {
      await this.guardianForStudent(client, actor, schoolId, studentId);
    }
  }

  private async assertHousemasterCanAccessStudent(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    studentId: string
  ): Promise<void> {
    if (!actor.roles.includes('housemaster') ||
        actor.roles.includes('principal') || actor.roles.includes('tenant_admin')) return;
    const assigned = await client.query(
      `SELECT 1
       FROM production.logistics_bed_allocations allocation
       JOIN production.logistics_hostel_beds bed
         ON bed.tenant_id = allocation.tenant_id AND bed.school_id = allocation.school_id
        AND bed.id = allocation.bed_id
       JOIN production.logistics_hostel_rooms room
         ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
        AND room.id = bed.room_id
       JOIN production.logistics_hostel_assignments assignment
         ON assignment.tenant_id = room.tenant_id AND assignment.school_id = room.school_id
        AND assignment.building_id = room.building_id
       WHERE allocation.tenant_id = $1 AND allocation.school_id = $2
         AND allocation.student_id = $3 AND allocation.ended_at IS NULL
         AND assignment.user_id = $4 AND assignment.assignment_role = 'housemaster'
         AND assignment.revoked_at IS NULL AND assignment.starts_at <= now()
         AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
       LIMIT 1`,
      [actor.tenantId, schoolId, studentId, actor.userId]
    );
    if (!assigned.rowCount) throw new LogisticsError('FORBIDDEN', 'Housemaster is not assigned to this student hostel.');
  }

  async createExeat(actor: AuthorizedPrincipal, input: {
    studentId: string;
    destination: string;
    reason: string;
    departureDueAt: string;
    returnDueAt: string;
    idempotencyKey: string;
  }): Promise<{ id: string; status: string; departureDueAt: Date; returnDueAt: Date }> {
    const studentId = validateUuid(input.studentId);
    const destination = input.destination.trim();
    const reason = input.reason.trim();
    const departureDueAt = parseDate(input.departureDueAt, 'departureDueAt');
    const returnDueAt = parseDate(input.returnDueAt, 'returnDueAt');
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    if (!destination || destination.length > 500 || !reason || reason.length > 1000 ||
        departureDueAt <= new Date() || returnDueAt <= departureDueAt) {
      throw new LogisticsError('INVALID_INPUT', 'Exeat destination, reason, and future departure/return times are required.');
    }
    const requestFingerprint = keyedFingerprint('logistics-exeat-request-v1', [
      studentId, destination, reason, departureDueAt.toISOString(), returnDueAt.toISOString()
    ]);

    return this.inSchool(
      actor, 'exeat_management', ['logistics.exeat.request', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        const guardianId = actor.roles.includes('parent')
          ? await this.guardianForStudent(client, actor, schoolId, studentId)
          : null;
        const student = await client.query<{ id: string }>(
          `SELECT id FROM production.students
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
             AND lifecycle_status IN ('admitted', 'active')
           FOR UPDATE`,
          [actor.tenantId, schoolId, studentId]
        );
        if (!student.rowCount) throw new LogisticsError('NOT_FOUND', 'Active school student not found.');

        const duplicate = await client.query<{
          id: string; requested_by: string; requested_by_guardian_id: string | null;
          request_fingerprint: Buffer | null; status: string;
          departure_due_at: Date; return_due_at: Date;
        }>(
          `SELECT id, requested_by, requested_by_guardian_id, request_fingerprint,
                  status, departure_due_at, return_due_at
           FROM production.logistics_exeats
           WHERE tenant_id = $1 AND school_id = $2 AND request_idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (duplicate.rows[0]) {
          const previous = duplicate.rows[0];
          if (!previous.request_fingerprint ||
              !timingSafeEqual(previous.request_fingerprint, requestFingerprint) ||
              (guardianId
                ? previous.requested_by_guardian_id !== guardianId
                : previous.requested_by !== actor.userId)) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different exeat request.');
          }
          return {
            id: previous.id,
            status: previous.status,
            departureDueAt: previous.departure_due_at,
            returnDueAt: previous.return_due_at
          };
        }

        const overlapping = await client.query(
          `SELECT 1 FROM production.logistics_exeats
           WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3
             AND status IN ('pending_housemaster', 'pending_principal', 'approved',
                            'departure_authorized', 'departed', 'overdue')
             AND departure_due_at < $5 AND return_due_at > $4
           LIMIT 1`,
          [actor.tenantId, schoolId, studentId, departureDueAt, returnDueAt]
        );
        if (overlapping.rowCount) throw new LogisticsError('CONFLICT', 'The student already has an overlapping active exeat.');

        const result = await client.query<{
          id: string; status: string; departureDueAt: Date; returnDueAt: Date;
        }>(
          `INSERT INTO production.logistics_exeats
             (tenant_id, school_id, student_id, requested_by, requested_by_guardian_id,
              destination, reason, departure_due_at, return_due_at,
             request_idempotency_key, request_fingerprint, guardian_consent_verified_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                  CASE WHEN $5::uuid IS NOT NULL THEN now() END)
           RETURNING id, status, departure_due_at AS "departureDueAt",
                     return_due_at AS "returnDueAt"`,
          [actor.tenantId, schoolId, studentId, actor.userId, guardianId,
            destination, reason, departureDueAt, returnDueAt, idempotencyKey, requestFingerprint]
        );
        await this.audit(client, actor, schoolId, 'exeat_requested', 'exeat', result.rows[0].id, {
          studentId, departureDueAt: departureDueAt.toISOString(), returnDueAt: returnDueAt.toISOString()
        });
        return result.rows[0];
      }
    );
  }

  async authorizeExeatDeparture(actor: AuthorizedPrincipal, exeatId: string): Promise<{ id: string; status: string }> {
    const id = validateUuid(exeatId);
    return this.inSchool(
      actor, 'exeat_management', ['logistics.exeat.approve', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        const exeat = await client.query<{ status: string; student_id: string; requested_by: string }>(
          `SELECT status, student_id, requested_by
           FROM production.logistics_exeats
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, id]
        );
        const row = exeat.rows[0];
        if (!row) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
        if (row.requested_by === actor.userId) throw new LogisticsError('FORBIDDEN', 'Requesters cannot authorize their own exeat.');
        if (!actor.roles.includes('housemaster') && !actor.roles.includes('principal')) {
          throw new LogisticsError('FORBIDDEN', 'Only a housemaster or principal may authorize departure.');
        }
        if (row.status === 'departure_authorized') return { id, status: row.status };
        if (row.status !== 'approved') throw new LogisticsError('CONFLICT', 'Only an approved exeat can be authorized for departure.');
        if (actor.roles.includes('housemaster') && !actor.roles.includes('principal')) {
          const assigned = await client.query(
            `SELECT 1
             FROM production.logistics_bed_allocations allocation
             JOIN production.logistics_hostel_beds bed
               ON bed.tenant_id = allocation.tenant_id AND bed.school_id = allocation.school_id
              AND bed.id = allocation.bed_id
             JOIN production.logistics_hostel_rooms room
               ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
              AND room.id = bed.room_id
             JOIN production.logistics_hostel_assignments assignment
               ON assignment.tenant_id = room.tenant_id AND assignment.school_id = room.school_id
              AND assignment.building_id = room.building_id
             WHERE allocation.tenant_id = $1 AND allocation.school_id = $2
               AND allocation.student_id = $3 AND allocation.ended_at IS NULL
               AND assignment.user_id = $4 AND assignment.assignment_role = 'housemaster'
               AND assignment.revoked_at IS NULL AND assignment.starts_at <= now()
               AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
             LIMIT 1`,
            [actor.tenantId, schoolId, row.student_id, actor.userId]
          );
          if (!assigned.rowCount) throw new LogisticsError('FORBIDDEN', 'Housemaster is not assigned to this student hostel.');
        }
        await client.query(
          `UPDATE production.logistics_exeats SET status = 'departure_authorized'
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, id]
        );
        await this.audit(client, actor, schoolId, 'exeat_departure_authorized', 'exeat', id, {});
        return { id, status: 'departure_authorized' };
      }
    );
  }

  async recordExeatGateMovement(actor: AuthorizedPrincipal, input: {
    exeatId: string;
    gateLocationId: string;
    direction: 'departure' | 'return';
    idempotencyKey: string;
  }): Promise<{ movementId: string; status: string; occurredAt: Date }> {
    const exeatId = validateUuid(input.exeatId);
    const gateLocationId = validateUuid(input.gateLocationId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    if (input.direction !== 'departure' && input.direction !== 'return') {
      throw new LogisticsError('INVALID_INPUT', 'Movement direction must be departure or return.');
    }
    return this.inSchool(
      actor, 'exeat_management', ['logistics.gate.manage', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        const replay = await client.query<{
          id: string; exeat_id: string; movement_type: string; recorded_by: string; occurred_at: Date;
        }>(
          `SELECT id, exeat_id, movement_type, recorded_by, occurred_at
           FROM production.logistics_student_movements
           WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (replay.rows[0]) {
          const movement = replay.rows[0];
          const expected = input.direction === 'departure' ? 'exeat_departure' : 'exeat_return';
          if (movement.exeat_id !== exeatId || movement.movement_type !== expected ||
              movement.recorded_by !== actor.userId) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different movement.');
          }
          const current = await client.query<{ status: string }>(
            `SELECT status FROM production.logistics_exeats
             WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
            [actor.tenantId, schoolId, exeatId]
          );
          if (!current.rows[0]) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
          return { movementId: movement.id, status: current.rows[0].status, occurredAt: movement.occurred_at };
        }

        const assigned = await client.query(
          `SELECT 1 FROM production.logistics_gate_officer_assignments assignment
           JOIN production.logistics_gate_locations gate
             ON gate.tenant_id = assignment.tenant_id AND gate.school_id = assignment.school_id
            AND gate.id = assignment.gate_location_id
           WHERE assignment.tenant_id = $1 AND assignment.school_id = $2
             AND assignment.gate_location_id = $3 AND assignment.user_id = $4
             AND assignment.revoked_at IS NULL AND assignment.starts_at <= now()
             AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
             AND gate.status = 'active'
           FOR UPDATE`,
          [actor.tenantId, schoolId, gateLocationId, actor.userId]
        );
        if (!assigned.rowCount) throw new LogisticsError('FORBIDDEN', 'Officer is not assigned to this gate.');

        const exeat = await client.query<{ id: string; student_id: string; status: string }>(
          `SELECT id, student_id, status FROM production.logistics_exeats
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, exeatId]
        );
        const row = exeat.rows[0];
        if (!row) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
        const expectedStatus = input.direction === 'departure' ? 'departure_authorized' : null;
        if ((expectedStatus && row.status !== expectedStatus) ||
            (input.direction === 'return' && row.status !== 'departed' && row.status !== 'overdue')) {
          throw new LogisticsError('CONFLICT', `Exeat is not eligible for ${input.direction} recording.`);
        }
        const nextStatus = input.direction === 'departure' ? 'departed' : 'returned';
        const movementType = input.direction === 'departure' ? 'exeat_departure' : 'exeat_return';
        await client.query(
          `UPDATE production.logistics_exeats
           SET status = $4,
               departed_at = CASE WHEN $4 = 'departed' THEN now() ELSE departed_at END,
               returned_at = CASE WHEN $4 = 'returned' THEN now() ELSE returned_at END,
               departure_gate_location_id = CASE WHEN $4 = 'departed' THEN $5 ELSE departure_gate_location_id END,
               return_gate_location_id = CASE WHEN $4 = 'returned' THEN $5 ELSE return_gate_location_id END,
               departure_recorded_by = CASE WHEN $4 = 'departed' THEN $6 ELSE departure_recorded_by END,
               return_recorded_by = CASE WHEN $4 = 'returned' THEN $6 ELSE return_recorded_by END
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, exeatId, nextStatus, gateLocationId, actor.userId]
        );
        const movement = await client.query<{ id: string; occurred_at: Date }>(
          `INSERT INTO production.logistics_student_movements
             (tenant_id, school_id, student_id, movement_type, exeat_id, gate_location_id,
              recorded_by, idempotency_key, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           RETURNING id, occurred_at`,
          [actor.tenantId, schoolId, row.student_id, movementType, exeatId, gateLocationId,
            actor.userId, idempotencyKey, JSON.stringify({ source: 'gate_operation' })]
        );
        await client.query(
          `INSERT INTO production.logistics_gate_events
             (tenant_id, school_id, gate_location_id, student_id, actor_user_id,
              direction, outcome, reason_code, correlation_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'authorized', $7, $8)`,
          [actor.tenantId, schoolId, gateLocationId, row.student_id, actor.userId,
            input.direction === 'departure' ? 'exit' : 'entry', 'exeat_verified', randomBytes(18).toString('hex')]
        );
        await this.audit(client, actor, schoolId, `exeat_${input.direction}_recorded`, 'exeat', exeatId, {
          movementId: movement.rows[0].id, gateLocationId
        });
        return { movementId: movement.rows[0].id, status: nextStatus, occurredAt: movement.rows[0].occurred_at };
      }
    );
  }

  async listDiningMeals(actor: AuthorizedPrincipal, input: {
    serviceDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ page: number; pageSize: number; total: number; data: Record<string, unknown>[] }> {
    const pagination = parsePage(input.page, input.pageSize);
    const serviceDate = input.serviceDate || null;
    if (serviceDate && !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      throw new LogisticsError('INVALID_INPUT', 'serviceDate must use YYYY-MM-DD format.');
    }
    return this.inSchool(
      actor, 'dining_management', ['logistics.dining.read', 'logistics.dining.manage', 'logistics.dining.attendance.record'],
      async (client, schoolId) => {
        const values = [actor.tenantId, schoolId, serviceDate];
        const where = `WHERE tenant_id = $1 AND school_id = $2 AND ($3::date IS NULL OR service_date = $3::date)`;
        const count = await client.query<{ total: string }>(
          `SELECT count(*)::text AS total FROM production.logistics_dining_meals ${where}`,
          values
        );
        const rows = await client.query<Record<string, unknown>>(
          `SELECT meal.id, dining_hall AS "diningHall", service_date AS "serviceDate",
                  service_period AS "servicePeriod", menu, starts_at AS "startsAt",
                  ends_at AS "endsAt",
                  (SELECT count(*) FROM production.logistics_dining_attendance attendance
                   WHERE attendance.tenant_id = meal.tenant_id
                     AND attendance.school_id = meal.school_id
                     AND attendance.meal_id = meal.id) AS "attendanceCount"
           FROM production.logistics_dining_meals meal ${where}
           ORDER BY service_date DESC, starts_at DESC
           LIMIT $4 OFFSET $5`,
          [...values, pagination.pageSize, pagination.offset]
        );
        return {
          page: pagination.page, pageSize: pagination.pageSize,
          total: Number(count.rows[0]?.total || 0),
          data: rows.rows.map(row => ({ ...row, attendanceCount: Number(row.attendanceCount) }))
        };
      }
    );
  }

  async recordDiningAttendance(actor: AuthorizedPrincipal, input: {
    mealId: string;
    studentId: string;
    idempotencyKey: string;
    overrideReason?: string;
  }): Promise<{ id: string; mealId: string; studentId: string; servedAt: Date; replayed: boolean }> {
    const mealId = validateUuid(input.mealId);
    const studentId = validateUuid(input.studentId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const overrideReason = input.overrideReason?.trim() || null;
    if (overrideReason && overrideReason.length > 500) {
      throw new LogisticsError('INVALID_INPUT', 'Dining exception reason is too long.');
    }
    return this.inSchool(
      actor, 'dining_management',
      ['logistics.dining.attendance.record', 'logistics.dining.manage'],
      async (client, schoolId) => {
        const replay = await client.query<{
          id: string; meal_id: string; student_id: string; served_at: Date; served_by: string;
        }>(
          `SELECT id, meal_id, student_id, served_at, served_by
           FROM production.logistics_dining_attendance
           WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (replay.rows[0]) {
          const previous = replay.rows[0];
          if (previous.meal_id !== mealId || previous.student_id !== studentId ||
              previous.served_by !== actor.userId) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different attendance record.');
          }
          return {
            id: previous.id, mealId, studentId, servedAt: previous.served_at, replayed: true
          };
        }

        const meal = await client.query<{ service_date: string; service_period: string }>(
          `SELECT service_date::text, service_period
           FROM production.logistics_dining_meals
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, mealId]
        );
        const service = meal.rows[0];
        if (!service) throw new LogisticsError('NOT_FOUND', 'Dining meal not found.');
        const student = await client.query<{ id: string }>(
          `SELECT id FROM production.students
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
             AND lifecycle_status IN ('admitted', 'active')
           FOR UPDATE`,
          [actor.tenantId, schoolId, studentId]
        );
        if (!student.rowCount) throw new LogisticsError('NOT_FOUND', 'Active school student not found.');

        const entitlement = await client.query(
          `SELECT 1 FROM production.logistics_dining_entitlements
           WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3
             AND status = 'active' AND starts_on <= $4::date
             AND (ends_on IS NULL OR ends_on >= $4::date)
             AND $5 = ANY(meal_periods)
           LIMIT 1`,
          [actor.tenantId, schoolId, studentId, service.service_date, service.service_period]
        );
        if (!entitlement.rowCount) {
          if (!overrideReason || !actor.hasPermission('logistics.dining.entitlement.manage')) {
            throw new LogisticsError('FORBIDDEN', 'An active meal entitlement or authorized override is required.');
          }
          await client.query(
            `INSERT INTO production.logistics_dining_exceptions
               (tenant_id, school_id, meal_id, student_id, exception_type,
                reason, idempotency_key, authorized_by)
             VALUES ($1, $2, $3, $4, 'entitlement_override', $5, $6, $7)`,
            [actor.tenantId, schoolId, mealId, studentId, overrideReason, idempotencyKey, actor.userId]
          );
        }
        const duplicate = await client.query(
          `SELECT 1 FROM production.logistics_dining_attendance
           WHERE tenant_id = $1 AND school_id = $2 AND meal_id = $3 AND student_id = $4`,
          [actor.tenantId, schoolId, mealId, studentId]
        );
        if (duplicate.rowCount) throw new LogisticsError('CONFLICT', 'Student attendance is already recorded for this meal.');
        const result = await client.query<{ id: string; served_at: Date }>(
          `INSERT INTO production.logistics_dining_attendance
             (tenant_id, school_id, meal_id, student_id, served_by, diet_fulfilled, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, false, $6)
           RETURNING id, served_at`,
          [actor.tenantId, schoolId, mealId, studentId, actor.userId, idempotencyKey]
        );
        await this.audit(client, actor, schoolId, 'dining_attendance_recorded', 'dining_attendance', result.rows[0].id, {
          mealId, studentId, exception: !!overrideReason
        });
        return {
          id: result.rows[0].id, mealId, studentId, servedAt: result.rows[0].served_at, replayed: false
        };
      }
    );
  }

  async recordTripPassengerEvent(actor: AuthorizedPrincipal, input: {
    tripId: string;
    studentId: string;
    eventType: 'boarded' | 'dropped_off';
    idempotencyKey: string;
  }): Promise<{ eventId: string; occurredAt: Date; replayed: boolean }> {
    const tripId = validateUuid(input.tripId);
    const studentId = validateUuid(input.studentId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    if (input.eventType !== 'boarded' && input.eventType !== 'dropped_off') {
      throw new LogisticsError('INVALID_INPUT', 'Passenger event type is invalid.');
    }
    return this.inSchool(
      actor, 'school_transport', ['logistics.transport.passengers.manage', 'logistics.transport.manage'],
      async (client, schoolId) => {
        const replay = await client.query<{
          id: string; trip_id: string; student_id: string; event_type: string;
          recorded_by: string; occurred_at: Date;
        }>(
          `SELECT id, trip_id, student_id, event_type, recorded_by, occurred_at
           FROM production.logistics_trip_passenger_events
           WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (replay.rows[0]) {
          const previous = replay.rows[0];
          if (previous.trip_id !== tripId || previous.student_id !== studentId ||
              previous.event_type !== input.eventType || previous.recorded_by !== actor.userId) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different passenger event.');
          }
          return { eventId: previous.id, occurredAt: previous.occurred_at, replayed: true };
        }

        const tripResult = await client.query<{
          route_id: string; trip_date: string; status: string; vehicle_id: string | null;
        }>(
          `SELECT trip.route_id, trip.trip_date::text, trip.status, trip.vehicle_id
           FROM production.logistics_trips trip
           WHERE trip.tenant_id = $1 AND trip.school_id = $2 AND trip.id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, tripId]
        );
        const trip = tripResult.rows[0];
        if (!trip) throw new LogisticsError('NOT_FOUND', 'Transport trip not found.');
        if (!['started', 'in_progress'].includes(trip.status)) {
          throw new LogisticsError('CONFLICT', 'Passengers can only be recorded on an active trip.');
        }
        const vehicle = await client.query<{ capacity: number }>(
          `SELECT capacity FROM production.logistics_vehicles
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
             AND approved = true AND status = 'active'
             AND (inspection_valid_until IS NULL OR inspection_valid_until >= CURRENT_DATE)
           FOR UPDATE`,
          [actor.tenantId, schoolId, trip.vehicle_id]
        );
        if (!vehicle.rowCount) throw new LogisticsError('CONFLICT', 'Trip vehicle is not approved, active, or inspection-valid.');

        const routeAssignment = await client.query(
          `SELECT 1 FROM production.logistics_student_routes
           WHERE tenant_id = $1 AND school_id = $2 AND student_id = $3 AND route_id = $4
             AND starts_at <= $5::date AND (ends_at IS NULL OR ends_at >= $5::date)
           LIMIT 1`,
          [actor.tenantId, schoolId, studentId, trip.route_id, trip.trip_date]
        );
        if (!routeAssignment.rowCount) throw new LogisticsError('FORBIDDEN', 'Student is not assigned to this trip route.');

        const passenger = await client.query<{
          id: string; boarded_at: Date | null; dropped_off_at: Date | null;
        }>(
          `SELECT id, boarded_at, dropped_off_at
           FROM production.logistics_trip_passengers
           WHERE tenant_id = $1 AND school_id = $2 AND trip_id = $3 AND student_id = $4
           FOR UPDATE`,
          [actor.tenantId, schoolId, tripId, studentId]
        );
        if (input.eventType === 'boarded') {
          if (passenger.rows[0]?.boarded_at) throw new LogisticsError('CONFLICT', 'Student is already recorded as boarded.');
          const occupied = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM production.logistics_trip_passengers
             WHERE tenant_id = $1 AND school_id = $2 AND trip_id = $3
               AND boarded_at IS NOT NULL AND dropped_off_at IS NULL`,
            [actor.tenantId, schoolId, tripId]
          );
          if (Number(occupied.rows[0]?.count || 0) >= vehicle.rows[0].capacity) {
            throw new LogisticsError('CONFLICT', 'Vehicle passenger capacity has been reached.');
          }
          if (passenger.rows[0]) {
            await client.query(
              `UPDATE production.logistics_trip_passengers
               SET boarded_at = now(), boarded_by = $5, dropped_off_at = NULL, dropped_off_by = NULL
               WHERE tenant_id = $1 AND school_id = $2 AND trip_id = $3 AND student_id = $4`,
              [actor.tenantId, schoolId, tripId, studentId, actor.userId]
            );
          } else {
            await client.query(
              `INSERT INTO production.logistics_trip_passengers
                 (tenant_id, school_id, trip_id, student_id, boarded_at, boarded_by)
               VALUES ($1, $2, $3, $4, now(), $5)`,
              [actor.tenantId, schoolId, tripId, studentId, actor.userId]
            );
          }
        } else {
          if (!passenger.rows[0]?.boarded_at || passenger.rows[0]?.dropped_off_at) {
            throw new LogisticsError('CONFLICT', 'Student must be currently boarded before drop-off.');
          }
          await client.query(
            `UPDATE production.logistics_trip_passengers
             SET dropped_off_at = now(), dropped_off_by = $5
             WHERE tenant_id = $1 AND school_id = $2 AND trip_id = $3 AND student_id = $4`,
            [actor.tenantId, schoolId, tripId, studentId, actor.userId]
          );
        }
        const event = await client.query<{ id: string; occurred_at: Date }>(
          `INSERT INTO production.logistics_trip_passenger_events
             (tenant_id, school_id, trip_id, student_id, event_type, idempotency_key, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, occurred_at`,
          [actor.tenantId, schoolId, tripId, studentId, input.eventType, idempotencyKey, actor.userId]
        );
        await this.audit(client, actor, schoolId, `trip_passenger_${input.eventType}`, 'trip', tripId, {
          studentId, eventId: event.rows[0].id
        });
        return { eventId: event.rows[0].id, occurredAt: event.rows[0].occurred_at, replayed: false };
      }
    );
  }

  async assignTrip(actor: AuthorizedPrincipal, input: {
    tripId: string;
    driverId: string;
    vehicleId: string;
  }): Promise<{ id: string; status: string }> {
    const tripId = validateUuid(input.tripId);
    const driverId = validateUuid(input.driverId);
    const vehicleId = validateUuid(input.vehicleId);
    return this.inSchool(
      actor, 'school_transport', ['logistics.transport.manage'],
      async (client, schoolId) => {
        const tripResult = await client.query<{
          route_id: string; trip_date: string; status: string;
          driver_id: string | null; vehicle_id: string | null;
        }>(
          `SELECT route_id, trip_date::text, status, driver_id, vehicle_id
           FROM production.logistics_trips
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, tripId]
        );
        const trip = tripResult.rows[0];
        if (!trip) throw new LogisticsError('NOT_FOUND', 'Transport trip not found.');
        if (trip.status === 'vehicle_assigned' &&
            trip.driver_id === driverId && trip.vehicle_id === vehicleId) {
          return { id: tripId, status: trip.status };
        }
        if (trip.status !== 'scheduled') throw new LogisticsError('CONFLICT', 'Only scheduled trips can be assigned.');
        const route = await client.query(
          `SELECT 1 FROM production.logistics_routes
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
          [actor.tenantId, schoolId, trip.route_id]
        );
        if (!route.rowCount) throw new LogisticsError('CONFLICT', 'Trip route is not active.');
        const driver = await client.query(
          `SELECT 1 FROM production.logistics_drivers
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
             AND qualified = true AND status = 'active' AND licence_valid_until >= $4::date
           FOR UPDATE`,
          [actor.tenantId, schoolId, driverId, trip.trip_date]
        );
        if (!driver.rowCount) throw new LogisticsError('CONFLICT', 'Driver is not qualified, active, or licence-valid for this trip.');
        const vehicle = await client.query<{ capacity: number }>(
          `SELECT capacity FROM production.logistics_vehicles
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
             AND approved = true AND status = 'active' AND inspection_valid_until >= $4::date
           FOR UPDATE`,
          [actor.tenantId, schoolId, vehicleId, trip.trip_date]
        );
        if (!vehicle.rowCount) throw new LogisticsError('CONFLICT', 'Vehicle is not approved, active, or inspection-valid for this trip.');
        const assignmentCount = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM production.logistics_student_routes
           WHERE tenant_id = $1 AND school_id = $2 AND route_id = $3
             AND starts_at <= $4::date AND (ends_at IS NULL OR ends_at >= $4::date)`,
          [actor.tenantId, schoolId, trip.route_id, trip.trip_date]
        );
        if (Number(assignmentCount.rows[0]?.count || 0) > vehicle.rows[0].capacity) {
          throw new LogisticsError('CONFLICT', 'Vehicle capacity is below the number of students assigned to this route.');
        }
        const collision = await client.query(
          `SELECT 1 FROM production.logistics_trips
           WHERE tenant_id = $1 AND school_id = $2 AND trip_date = $3::date
             AND id <> $4
             AND status IN ('vehicle_assigned', 'started', 'in_progress', 'emergency')
             AND (driver_id = $5 OR vehicle_id = $6)
           LIMIT 1`,
          [actor.tenantId, schoolId, trip.trip_date, tripId, driverId, vehicleId]
        );
        if (collision.rowCount) throw new LogisticsError('CONFLICT', 'Driver or vehicle is already assigned to another trip on this date.');
        await client.query(
          `UPDATE production.logistics_trips
           SET driver_id = $4, vehicle_id = $5, status = 'vehicle_assigned'
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, tripId, driverId, vehicleId]
        );
        await this.audit(client, actor, schoolId, 'transport_trip_assigned', 'trip', tripId, {
          driverId, vehicleId
        });
        return { id: tripId, status: 'vehicle_assigned' };
      }
    );
  }

  async startTrip(actor: AuthorizedPrincipal, tripId: string): Promise<{ id: string; status: string; startedAt: Date }> {
    const id = validateUuid(tripId);
    return this.inSchool(
      actor, 'school_transport', ['logistics.transport.manage'],
      async (client, schoolId) => {
        const result = await client.query<{
          status: string; route_id: string; trip_date: string; driver_id: string | null;
          vehicle_id: string | null; started_at: Date | null;
        }>(
          `SELECT status, route_id, trip_date::text, driver_id, vehicle_id, started_at
           FROM production.logistics_trips
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, id]
        );
        const trip = result.rows[0];
        if (!trip) throw new LogisticsError('NOT_FOUND', 'Transport trip not found.');
        if ((trip.status === 'started' || trip.status === 'in_progress') && trip.started_at) {
          return { id, status: trip.status, startedAt: trip.started_at };
        }
        if (trip.status !== 'vehicle_assigned' || !trip.driver_id || !trip.vehicle_id) {
          throw new LogisticsError('CONFLICT', 'Trip requires an eligible driver and vehicle assignment before starting.');
        }
        const authorized = await client.query(
          `SELECT 1
           FROM production.logistics_drivers driver
           JOIN production.logistics_vehicles vehicle
             ON vehicle.tenant_id = driver.tenant_id AND vehicle.school_id = driver.school_id
           JOIN production.logistics_routes route
             ON route.tenant_id = driver.tenant_id AND route.school_id = driver.school_id
           WHERE driver.tenant_id = $1 AND driver.school_id = $2
             AND driver.id = $3 AND vehicle.id = $4 AND route.id = $5
             AND driver.qualified = true AND driver.status = 'active'
             AND driver.licence_valid_until >= $6::date
             AND vehicle.approved = true AND vehicle.status = 'active'
             AND vehicle.inspection_valid_until >= $6::date
             AND route.status = 'active'
           FOR UPDATE OF driver, vehicle, route`,
          [actor.tenantId, schoolId, trip.driver_id, trip.vehicle_id, trip.route_id, trip.trip_date]
        );
        if (!authorized.rowCount) throw new LogisticsError('CONFLICT', 'Assigned trip resources are no longer authorized.');
        const update = await client.query<{ started_at: Date }>(
          `UPDATE production.logistics_trips
           SET status = 'started', started_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           RETURNING started_at`,
          [actor.tenantId, schoolId, id]
        );
        await this.audit(client, actor, schoolId, 'transport_trip_started', 'trip', id, {});
        return { id, status: 'started', startedAt: update.rows[0].started_at };
      }
    );
  }

  async listLibraryResources(actor: AuthorizedPrincipal, input: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ page: number; pageSize: number; total: number; data: Record<string, unknown>[] }> {
    const pagination = parsePage(input.page, input.pageSize);
    const search = input.search?.trim().slice(0, 100) || null;
    return this.inSchool(
      actor, 'digital_library', ['logistics.library.read', 'logistics.library.manage'],
      async (client, schoolId) => {
        const canManage = actor.hasPermission('logistics.library.manage');
        const values = [actor.tenantId, schoolId, canManage, search];
        const where = `WHERE tenant_id = $1 AND school_id = $2
          AND ($3::boolean OR publication_status = 'published')
          AND ($4::text IS NULL OR title ILIKE '%' || $4 || '%')`;
        const count = await client.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM production.logistics_library_resources ${where}`,
          values
        );
        const resources = await client.query<Record<string, unknown>>(
          `SELECT id, title, subject_id AS "subjectId", class_id AS "classId",
                  description, owner_user_id AS "ownerUserId",
                  publication_status AS "publicationStatus",
                  current_version AS "currentVersion", created_at AS "createdAt"
           FROM production.logistics_library_resources ${where}
           ORDER BY created_at DESC, id
           LIMIT $5 OFFSET $6`,
          [...values, pagination.pageSize, pagination.offset]
        );
        return {
          page: pagination.page, pageSize: pagination.pageSize,
          total: Number(count.rows[0]?.total || 0), data: resources.rows
        };
      }
    );
  }

  async createLibraryResourceMetadata(actor: AuthorizedPrincipal, input: {
    title: string;
    subjectId?: string;
    classId?: string;
    description?: string;
    idempotencyKey: string;
  }): Promise<{ id: string; publicationStatus: string; createdAt: Date }> {
    const title = input.title.trim();
    const subjectId = input.subjectId?.trim() || null;
    const classId = input.classId ? validateUuid(input.classId) : null;
    const description = input.description?.trim() || '';
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    if (!title || title.length > 300 || description.length > 2000 ||
        (subjectId && subjectId.length > 120)) {
      throw new LogisticsError('INVALID_INPUT', 'Library resource metadata is invalid.');
    }
    const fingerprint = keyedFingerprint('logistics-library-resource-v1', [
      title, subjectId, classId, description
    ]);
    return this.inSchool(
      actor, 'digital_library', ['logistics.library.manage'],
      async (client, schoolId) => {
        const replay = await client.query<{
          id: string; owner_user_id: string; request_fingerprint: Buffer | null;
          publication_status: string; created_at: Date;
        }>(
          `SELECT id, owner_user_id, request_fingerprint, publication_status, created_at
           FROM production.logistics_library_resources
           WHERE tenant_id = $1 AND school_id = $2 AND request_idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (replay.rows[0]) {
          const previous = replay.rows[0];
          if (previous.owner_user_id !== actor.userId || !previous.request_fingerprint ||
              !timingSafeEqual(previous.request_fingerprint, fingerprint)) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for different library metadata.');
          }
          return {
            id: previous.id, publicationStatus: previous.publication_status,
            createdAt: previous.created_at
          };
        }
        if (classId) {
          const schoolClass = await client.query(
            `SELECT 1 FROM production.classes
             WHERE tenant_id = $1 AND school_id = $2 AND id = $3 AND status = 'active'`,
            [actor.tenantId, schoolId, classId]
          );
          if (!schoolClass.rowCount) throw new LogisticsError('NOT_FOUND', 'Active school class not found.');
        }
        const result = await client.query<{ id: string; publication_status: string; created_at: Date }>(
          `INSERT INTO production.logistics_library_resources
             (tenant_id, school_id, title, subject_id, class_id, description,
              owner_user_id, request_idempotency_key, request_fingerprint)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, publication_status, created_at`,
          [actor.tenantId, schoolId, title, subjectId, classId, description,
            actor.userId, idempotencyKey, fingerprint]
        );
        await this.audit(client, actor, schoolId, 'library_resource_metadata_created', 'library_resource', result.rows[0].id, {
          title, subjectId, classId
        });
        return {
          id: result.rows[0].id,
          publicationStatus: result.rows[0].publication_status,
          createdAt: result.rows[0].created_at
        };
      }
    );
  }

  async listExeats(actor: AuthorizedPrincipal, input: {
    page?: number;
    pageSize?: number;
    status?: string;
    studentId?: string;
  }): Promise<{ page: number; pageSize: number; total: number; data: Record<string, unknown>[] }> {
    const pagination = parsePage(input.page, input.pageSize);
    const status = input.status?.trim() || null;
    const studentId = input.studentId ? validateUuid(input.studentId) : null;
    const validStatuses = new Set([
      'pending_housemaster', 'pending_principal', 'approved', 'departure_authorized',
      'departed', 'returned', 'rejected', 'cancelled', 'expired', 'overdue'
    ]);
    if (status && !validStatuses.has(status)) throw new LogisticsError('INVALID_INPUT', 'Unsupported exeat status filter.');
    return this.inSchool(
      actor, 'exeat_management', ['logistics.exeat.read', 'logistics.exeat.approve', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        if (actor.roles.includes('parent') && studentId) {
          await this.assertGuardianCanSeeStudent(client, actor, schoolId, studentId);
        }
        const housemasterScoped = actor.roles.includes('housemaster') &&
          !actor.roles.includes('principal') && !actor.roles.includes('tenant_admin');
        const values = [
          actor.tenantId, schoolId, actor.roles.includes('parent'), actor.userId, status,
          studentId, housemasterScoped, actor.userId
        ];
        const where = `WHERE exeat.tenant_id = $1 AND exeat.school_id = $2
          AND (NOT $3::boolean OR EXISTS (
            SELECT 1 FROM production.logistics_guardian_students relationship
            JOIN production.logistics_guardians guardian
              ON guardian.tenant_id = relationship.tenant_id
             AND guardian.school_id = relationship.school_id
             AND guardian.id = relationship.guardian_id
            WHERE relationship.tenant_id = exeat.tenant_id
              AND relationship.school_id = exeat.school_id
              AND relationship.student_id = exeat.student_id
              AND relationship.status = 'active' AND relationship.verified_at IS NOT NULL
              AND relationship.starts_at <= now()
              AND (relationship.ends_at IS NULL OR relationship.ends_at > now())
              AND guardian.user_id = $4 AND guardian.verification_status = 'verified'
          ))
          AND ($5::text IS NULL OR exeat.status = $5)
          AND ($6::uuid IS NULL OR exeat.student_id = $6)
          AND (NOT $7::boolean OR EXISTS (
            SELECT 1
            FROM production.logistics_bed_allocations allocation
            JOIN production.logistics_hostel_beds bed
              ON bed.tenant_id = allocation.tenant_id AND bed.school_id = allocation.school_id
             AND bed.id = allocation.bed_id
            JOIN production.logistics_hostel_rooms room
              ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
             AND room.id = bed.room_id
            JOIN production.logistics_hostel_assignments assignment
              ON assignment.tenant_id = room.tenant_id AND assignment.school_id = room.school_id
             AND assignment.building_id = room.building_id
            WHERE allocation.tenant_id = exeat.tenant_id AND allocation.school_id = exeat.school_id
              AND allocation.student_id = exeat.student_id AND allocation.ended_at IS NULL
              AND assignment.user_id = $8 AND assignment.assignment_role = 'housemaster'
              AND assignment.revoked_at IS NULL AND assignment.starts_at <= now()
              AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
          ))`;
        const count = await client.query<{ total: string }>(
          `SELECT count(*)::text AS total FROM production.logistics_exeats exeat ${where}`,
          values
        );
        const rows = await client.query<Record<string, unknown>>(
          `SELECT exeat.id, exeat.student_id AS "studentId", exeat.requested_by AS "requestedBy",
                  exeat.destination, exeat.reason, exeat.status,
                  exeat.departure_due_at AS "departureDueAt",
                  exeat.return_due_at AS "returnDueAt",
                  exeat.departed_at AS "departedAt", exeat.returned_at AS "returnedAt",
                  exeat.created_at AS "createdAt"
           FROM production.logistics_exeats exeat ${where}
           ORDER BY exeat.departure_due_at DESC, exeat.id
           LIMIT $9 OFFSET $10`,
          [...values, pagination.pageSize, pagination.offset]
        );
        return {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: Number(count.rows[0]?.total || 0),
          data: rows.rows
        };
      }
    );
  }

  async getExeat(actor: AuthorizedPrincipal, exeatId: string): Promise<Record<string, unknown>> {
    const id = validateUuid(exeatId);
    return this.inSchool(
      actor, 'exeat_management', ['logistics.exeat.read', 'logistics.exeat.approve', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        const result = await client.query<Record<string, unknown> & { studentId: string }>(
          `SELECT exeat.id, exeat.student_id AS "studentId", exeat.requested_by AS "requestedBy",
                  exeat.requested_by_guardian_id AS "requestedByGuardianId",
                  exeat.destination, exeat.reason, exeat.status,
                  exeat.departure_due_at AS "departureDueAt",
                  exeat.return_due_at AS "returnDueAt",
                  exeat.departed_at AS "departedAt", exeat.returned_at AS "returnedAt",
                  exeat.created_at AS "createdAt"
           FROM production.logistics_exeats exeat
           WHERE exeat.tenant_id = $1 AND exeat.school_id = $2 AND exeat.id = $3`,
          [actor.tenantId, schoolId, id]
        );
        const exeat = result.rows[0];
        if (!exeat) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
        await this.assertGuardianCanSeeStudent(client, actor, schoolId, exeat.studentId);
        await this.assertHousemasterCanAccessStudent(client, actor, schoolId, exeat.studentId);
        const approvals = await client.query<Record<string, unknown>>(
          `SELECT id, decision, approval_stage AS "approvalStage",
                  rationale, approver_id AS "approverId", decided_at AS "decidedAt"
           FROM production.logistics_exeat_approvals
           WHERE tenant_id = $1 AND school_id = $2 AND exeat_id = $3
           ORDER BY decided_at, id`,
          [actor.tenantId, schoolId, id]
        );
        return { ...exeat, approvals: approvals.rows };
      }
    );
  }

  async decideExeat(actor: AuthorizedPrincipal, input: {
    exeatId: string;
    decision: 'approved' | 'rejected';
    rationale?: string;
    idempotencyKey: string;
  }): Promise<{ id: string; status: string }> {
    const exeatId = validateUuid(input.exeatId);
    const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
    const rationale = input.rationale?.trim() || null;
    if (rationale && rationale.length > 1000) throw new LogisticsError('INVALID_INPUT', 'Rationale is too long.');
    if (input.decision !== 'approved' && input.decision !== 'rejected') {
      throw new LogisticsError('INVALID_INPUT', 'Decision must be approved or rejected.');
    }
    const fingerprint = keyedFingerprint('logistics-exeat-decision-v1', [
      exeatId, input.decision, rationale
    ]);
    return this.inSchool(
      actor, 'exeat_management', ['logistics.exeat.approve', 'logistics.exeat.manage'],
      async (client, schoolId) => {
        const replay = await client.query<{
          exeat_id: string; approver_id: string; decision: string; request_fingerprint: Buffer | null;
        }>(
          `SELECT exeat_id, approver_id, decision, request_fingerprint
           FROM production.logistics_exeat_approvals
           WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, idempotencyKey]
        );
        if (replay.rows[0]) {
          const prior = replay.rows[0];
          if (prior.approver_id !== actor.userId || prior.exeat_id !== exeatId ||
              prior.decision !== input.decision || !prior.request_fingerprint ||
              !timingSafeEqual(prior.request_fingerprint, fingerprint)) {
            throw new LogisticsError('CONFLICT', 'This idempotency key was already used for a different decision.');
          }
          const current = await client.query<{ status: string }>(
            `SELECT status FROM production.logistics_exeats
             WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
            [actor.tenantId, schoolId, exeatId]
          );
          if (!current.rows[0]) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
          return { id: exeatId, status: current.rows[0].status };
        }

        const result = await client.query<{
          id: string; status: string; student_id: string; requested_by: string;
          guardian_consent_verified_at: Date | null;
        }>(
          `SELECT id, status, student_id, requested_by, guardian_consent_verified_at
           FROM production.logistics_exeats
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3
           FOR UPDATE`,
          [actor.tenantId, schoolId, exeatId]
        );
        const exeat = result.rows[0];
        if (!exeat) throw new LogisticsError('NOT_FOUND', 'Exeat request not found.');
        if (exeat.requested_by === actor.userId) throw new LogisticsError('FORBIDDEN', 'Requesters cannot approve their own exeat.');
        if (!exeat.guardian_consent_verified_at) {
          throw new LogisticsError('CONFLICT', 'Verified guardian consent is required before approval.');
        }

        const config = await client.query<{ hierarchy: unknown }>(
          `SELECT settings -> 'exeatApprovalHierarchy' AS hierarchy
           FROM production.logistics_feature_configurations
           WHERE tenant_id = $1 AND school_id = $2`,
          [actor.tenantId, schoolId]
        );
        const configuredHierarchy = Array.isArray(config.rows[0]?.hierarchy)
          ? config.rows[0].hierarchy.filter((value): value is string =>
              value === 'housemaster' || value === 'principal')
          : [];
        const hierarchy = configuredHierarchy.length ? configuredHierarchy : ['housemaster', 'principal'];
        const stage = exeat.status === 'pending_housemaster'
          ? hierarchy.includes('housemaster') ? 'housemaster' : 'principal'
          : exeat.status === 'pending_principal' ? 'principal' : null;
        if (!stage || !hierarchy.includes(stage)) {
          throw new LogisticsError('CONFLICT', `Exeat cannot be decided while ${exeat.status}.`);
        }
        if (stage === 'housemaster') {
          if (!actor.roles.includes('housemaster') && !actor.roles.includes('principal')) {
            throw new LogisticsError('FORBIDDEN', 'Only an assigned housemaster or principal may review this stage.');
          }
          if (actor.roles.includes('housemaster') && !actor.roles.includes('principal')) {
            const assigned = await client.query(
              `SELECT 1
               FROM production.logistics_bed_allocations allocation
               JOIN production.logistics_hostel_beds bed
                 ON bed.tenant_id = allocation.tenant_id AND bed.school_id = allocation.school_id
                AND bed.id = allocation.bed_id
               JOIN production.logistics_hostel_rooms room
                 ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
                AND room.id = bed.room_id
               JOIN production.logistics_hostel_assignments assignment
                 ON assignment.tenant_id = room.tenant_id AND assignment.school_id = room.school_id
                AND assignment.building_id = room.building_id
               WHERE allocation.tenant_id = $1 AND allocation.school_id = $2
                 AND allocation.student_id = $3 AND allocation.ended_at IS NULL
                 AND assignment.user_id = $4 AND assignment.assignment_role = 'housemaster'
                 AND assignment.revoked_at IS NULL AND assignment.starts_at <= now()
                 AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
               LIMIT 1`,
              [actor.tenantId, schoolId, exeat.student_id, actor.userId]
            );
            if (!assigned.rowCount)             throw new LogisticsError('FORBIDDEN', 'Housemaster is not assigned to this student hostel.');
          }
        } else if (!actor.roles.includes('principal')) {
          throw new LogisticsError('FORBIDDEN', 'Only a principal may review the principal approval stage.');
        }

        const nextStatus = input.decision === 'rejected'
          ? 'rejected'
          : stage === 'housemaster' && hierarchy.includes('principal')
            ? 'pending_principal'
            : 'approved';
        await client.query(
          `INSERT INTO production.logistics_exeat_approvals
             (tenant_id, school_id, exeat_id, approver_id, decision, approval_stage,
              rationale, idempotency_key, request_fingerprint)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [actor.tenantId, schoolId, exeatId, actor.userId, input.decision, stage,
            rationale, idempotencyKey, fingerprint]
        );
        await client.query(
          `UPDATE production.logistics_exeats SET status = $4
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, exeatId, nextStatus]
        );
        await this.audit(client, actor, schoolId, `exeat_${input.decision}`, 'exeat', exeatId, {
          stage, rationale, nextStatus
        });
        return { id: exeatId, status: nextStatus };
      }
    );
  }

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
