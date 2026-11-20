import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PostgresRuntime } from '../db/postgres';
import { withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { acceptanceTestOptions, principal } from '../db/testSupport';
import { LogisticsError, LogisticsRepository } from './logisticsRepository';

const permissions = [
  'logistics.configuration.manage',
  'logistics.gate.manage',
  'logistics.exeat.read',
  'logistics.exeat.request',
  'logistics.exeat.approve',
  'logistics.dining.read',
  'logistics.dining.attendance.record',
  'logistics.dining.entitlement.manage',
  'logistics.library.read',
  'logistics.library.manage',
  'logistics.transport.manage',
  'logistics.transport.passengers.manage'
];

test('logistics exeats and dining attendance are durable, idempotent and school isolated', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({
    DATABASE_URL: process.env.TEST_DATABASE_URL!,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const repository = new LogisticsRepository(pool);
  const tenantIds = [randomUUID(), randomUUID()];
  const schoolIds = [randomUUID(), randomUUID()];
  const userIds = [randomUUID(), randomUUID()];
  const workflowUserIds = [randomUUID(), randomUUID(), randomUUID()];
  const studentIds = [randomUUID(), randomUUID()];
  const platform = principal(randomUUID(), 'super_admin');
  const actors = tenantIds.map((tenantId, index) =>
    createAuthorizedPrincipal({
      tenant: principal(tenantId),
      userId: userIds[index],
      sessionId: randomUUID(),
      grants: [{ roleCode: 'tenant_admin', permissions, scopes: [] }]
    })
  );
  const parentActor = createAuthorizedPrincipal({
    tenant: principal(tenantIds[0]),
    userId: workflowUserIds[0],
    sessionId: randomUUID(),
    grants: [{ roleCode: 'parent', permissions: ['logistics.exeat.read', 'logistics.exeat.request'], scopes: [] }]
  });
  const principalActor = createAuthorizedPrincipal({
    tenant: principal(tenantIds[0]),
    userId: workflowUserIds[1],
    sessionId: randomUUID(),
    grants: [{ roleCode: 'principal', permissions: ['logistics.exeat.read', 'logistics.exeat.approve'], scopes: [] }]
  });
  const gateActor = createAuthorizedPrincipal({
    tenant: principal(tenantIds[0]),
    userId: workflowUserIds[2],
    sessionId: randomUUID(),
    grants: [{ roleCode: 'security_officer', permissions: ['logistics.gate.manage'], scopes: [] }]
  });

  try {
    await withControlPlaneTransaction(pool, platform, async client => {
      for (let index = 0; index < tenantIds.length; index += 1) {
        const tenantId = tenantIds[index];
        const schoolId = schoolIds[index];
        const userId = userIds[index];
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, $2, $3, 'logistics-acceptance', 'approved')`,
          [tenantId, `Logistics ${index}`, `logistics-${tenantId}`]
        );
        const organization = await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name)
           VALUES ($1, $2) RETURNING id`,
          [tenantId, `Logistics organization ${index}`]
        );
        await client.query(
          `INSERT INTO production.schools
             (tenant_id, organization_id, id, name, short_name, school_slug, official_contact_email)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, organization.rows[0].id, schoolId, `Logistics School ${index}`,
              `Logistics School ${index}`, `logistics-school-${tenantId}`,
              `logistics-${tenantId}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, 'acceptance-test-hash', now())`,
          [userId, `logistics-${tenantId}@test.invalid`, `Logistics Admin ${index}`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
           VALUES ($1, $2, $3, 'tenant_admin')`,
          [tenantId, userId, userId]
        );
        if (index === 0) {
          for (const [workflowIndex, role] of ['parent', 'principal', 'security_officer'].entries()) {
            const workflowUserId = workflowUserIds[workflowIndex];
            await client.query(
              `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
               VALUES ($1, $2, $3, 'acceptance-test-hash', now())`,
              [workflowUserId, `logistics-${role}-${tenantId}@test.invalid`, `Logistics ${role}`]
            );
            await client.query(
              `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
               VALUES ($1, $2, $3, 'staff')`,
              [tenantId, workflowUserId, workflowUserId]
            );
          }
        }
        await client.query(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, configuration_version, status,
              enabled_features, deployment_architecture, architecture, template_id,
              template_version, provisioning_status, activated_at)
           VALUES ($1, $2, 'app_curriculum_flow', '1', 'active',
                   ARRAY['feat_logistics_gate_security', 'feat_logistics_boarding_house', 'feat_logistics_elibrary', 'feat_logistics_transportation'], 'shared_database',
                   'shared_database', 'school-standard', '1', 'ready', now())`,
          [tenantId, schoolId]
        );
      }
    });

    for (let index = 0; index < tenantIds.length; index += 1) {
      await repository.updateConfiguration(actors[index], {
        capabilities: {
          gate_security: true, exeat_management: true, dining_management: true, digital_library: true,
          school_transport: true
        },
        settings: {}
      });
      await withTenantTransaction(pool, actors[index].tenant, async client => {
        await client.query(
          `INSERT INTO production.students
             (tenant_id, school_id, id, admission_number, first_name, last_name, lifecycle_status)
           VALUES ($1, $2, $3, $4, 'Test', 'Student', 'active')`,
          [tenantIds[index], schoolIds[index], studentIds[index], `LOG-${index}-${studentIds[index]}`]
        );
      });
    }

    let guardianId = '';
    const gateLocationId = randomUUID();
    await withTenantTransaction(pool, actors[0].tenant, async client => {
      const guardian = await client.query<{ id: string }>(
        `INSERT INTO production.logistics_guardians
           (tenant_id, school_id, user_id, full_name, phone, verification_status, verified_at, verified_by)
         VALUES ($1, $2, $3, 'Verified Guardian', '+233200000001', 'verified', now(), $4)
         RETURNING id`,
        [tenantIds[0], schoolIds[0], workflowUserIds[0], userIds[0]]
      );
      guardianId = guardian.rows[0].id;
      await client.query(
        `INSERT INTO production.logistics_guardian_students
           (tenant_id, school_id, guardian_id, student_id, relationship, status, verified_at, verified_by)
         VALUES ($1, $2, $3, $4, 'parent', 'active', now(), $5)`,
        [tenantIds[0], schoolIds[0], guardianId, studentIds[0], userIds[0]]
      );
      await client.query(
        `INSERT INTO production.logistics_gate_locations (tenant_id, school_id, id, name)
         VALUES ($1, $2, $3, 'Main Gate')`,
        [tenantIds[0], schoolIds[0], gateLocationId]
      );
      await client.query(
        `INSERT INTO production.logistics_gate_officer_assignments
           (tenant_id, school_id, gate_location_id, user_id, assigned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantIds[0], schoolIds[0], gateLocationId, workflowUserIds[2], userIds[0]]
      );
    });

    const request = {
      studentId: studentIds[0],
      destination: 'Approved family residence',
      reason: 'Scheduled family visit',
      departureDueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      returnDueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      idempotencyKey: `exeat-${randomUUID()}`
    };
    const created = await repository.createExeat(parentActor, request);
    const replay = await repository.createExeat(parentActor, request);
    assert.equal(replay.id, created.id);
    assert.equal(replay.status, 'pending_housemaster');
    assert.equal((await repository.listExeats(parentActor, {})).total, 1);
    assert.equal((await repository.listExeats(actors[1], {})).total, 0);
    await assert.rejects(repository.getExeat(actors[1], created.id), (error: unknown) =>
      error instanceof LogisticsError && error.code === 'NOT_FOUND');
    const approvalKey = `approval-${randomUUID()}`;
    assert.equal((await repository.decideExeat(principalActor, {
      exeatId: created.id,
      decision: 'approved',
      idempotencyKey: approvalKey
    })).status, 'pending_principal');
    assert.equal((await repository.decideExeat(principalActor, {
      exeatId: created.id,
      decision: 'approved',
      idempotencyKey: approvalKey
    })).status, 'pending_principal');
    assert.equal((await repository.decideExeat(principalActor, {
      exeatId: created.id,
      decision: 'approved',
      idempotencyKey: `approval-${randomUUID()}`
    })).status, 'approved');
    assert.equal((await repository.authorizeExeatDeparture(principalActor, created.id)).status, 'departure_authorized');
    assert.equal((await repository.recordExeatGateMovement(gateActor, {
      exeatId: created.id, gateLocationId, direction: 'departure',
      idempotencyKey: `movement-${randomUUID()}`
    })).status, 'departed');
    assert.equal((await repository.recordExeatGateMovement(gateActor, {
      exeatId: created.id, gateLocationId, direction: 'return',
      idempotencyKey: `movement-${randomUUID()}`
    })).status, 'returned');
    const gateHistory = await repository.listGateEvents(actors[0], { pageSize: 10 });
    assert.equal(gateHistory.total, 2);
    assert.equal(gateHistory.data[0].operatorId, workflowUserIds[2]);
    assert.equal(gateHistory.data[0].gateName, 'Main Gate');
    assert.deepEqual(gateHistory.data.map(event => String(event.direction)).sort(), ['entry', 'exit']);
    assert.equal((await repository.listGateEvents(actors[0], { direction: 'exit' })).total, 1);
    assert.equal((await repository.listGateEvents(actors[1], {})).total, 0);
    await assert.rejects(repository.listGateEvents(parentActor, {}), (error: unknown) =>
      error instanceof LogisticsError && error.code === 'FORBIDDEN');

    const mealId = randomUUID();
    await withTenantTransaction(pool, actors[0].tenant, async client => {
      await client.query(
        `INSERT INTO production.logistics_dining_meals
           (tenant_id, school_id, id, dining_hall, service_date, service_period, menu, starts_at, ends_at)
         VALUES ($1, $2, $3, 'Main Hall', CURRENT_DATE, 'lunch', '[]'::jsonb, now() - interval '1 hour', now() + interval '1 hour')`,
        [tenantIds[0], schoolIds[0], mealId]
      );
      await client.query(
        `INSERT INTO production.logistics_dining_entitlements
           (tenant_id, school_id, student_id, meal_periods, starts_on, created_by)
         VALUES ($1, $2, $3, ARRAY['lunch'], CURRENT_DATE, $4)`,
        [tenantIds[0], schoolIds[0], studentIds[0], userIds[0]]
      );
    });
    const attendanceRequest = {
      mealId, studentId: studentIds[0], idempotencyKey: `attendance-${randomUUID()}`
    };
    const attendance = await repository.recordDiningAttendance(actors[0], attendanceRequest);
    const attendanceReplay = await repository.recordDiningAttendance(actors[0], attendanceRequest);
    assert.equal(attendanceReplay.id, attendance.id);
    assert.equal(attendanceReplay.replayed, true);
    await assert.rejects(
      repository.recordDiningAttendance(actors[0], {
        ...attendanceRequest,
        idempotencyKey: `attendance-${randomUUID()}`
      }),
      (error: unknown) => error instanceof LogisticsError && error.code === 'CONFLICT'
    );
    assert.equal((await repository.listDiningMeals(actors[0], {})).data[0]?.attendanceCount, 1);

    const metadata = {
      title: 'School Science Handbook',
      subjectId: 'SCIENCE',
      description: 'Catalog metadata only.',
      idempotencyKey: `library-${randomUUID()}`
    };
    const resource = await repository.createLibraryResourceMetadata(actors[0], metadata);
    const resourceReplay = await repository.createLibraryResourceMetadata(actors[0], metadata);
    assert.equal(resourceReplay.id, resource.id);
    assert.equal(resource.publicationStatus, 'draft');
    assert.equal((await repository.listLibraryResources(actors[0], {})).total, 1);
    assert.equal((await repository.listLibraryResources(actors[1], {})).total, 0);

    const routeId = randomUUID();
    const driverId = randomUUID();
    const vehicleId = randomUUID();
    const tripId = randomUUID();
    await withTenantTransaction(pool, actors[0].tenant, async client => {
      await client.query(
        `INSERT INTO production.logistics_routes (tenant_id, school_id, id, route_name)
         VALUES ($1, $2, $3, 'Acceptance route')`,
        [tenantIds[0], schoolIds[0], routeId]
      );
      await client.query(
        `INSERT INTO production.logistics_drivers
           (tenant_id, school_id, id, full_name, licence_hash, licence_valid_until, qualified)
         VALUES ($1, $2, $3, 'Qualified Driver', $4, CURRENT_DATE + 30, true)`,
        [tenantIds[0], schoolIds[0], driverId, Buffer.from('test-licence-hash')]
      );
      await client.query(
        `INSERT INTO production.logistics_vehicles
           (tenant_id, school_id, id, registration, operator_type, approved, capacity, inspection_valid_until)
         VALUES ($1, $2, $3, 'LOG-TEST-1', 'school_owned', true, 1, CURRENT_DATE + 30)`,
        [tenantIds[0], schoolIds[0], vehicleId]
      );
      await client.query(
        `INSERT INTO production.logistics_student_routes
           (tenant_id, school_id, student_id, route_id, assigned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantIds[0], schoolIds[0], studentIds[0], routeId, userIds[0]]
      );
      await client.query(
        `INSERT INTO production.logistics_trips
           (tenant_id, school_id, id, route_id, trip_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
        [tenantIds[0], schoolIds[0], tripId, routeId]
      );
    });
    assert.deepEqual(await repository.assignTrip(actors[0], { tripId, driverId, vehicleId }), {
      id: tripId, status: 'vehicle_assigned'
    });
    assert.equal((await repository.assignTrip(actors[0], { tripId, driverId, vehicleId })).status, 'vehicle_assigned');
    assert.equal((await repository.startTrip(actors[0], tripId)).status, 'started');
    assert.equal((await repository.startTrip(actors[0], tripId)).status, 'started');
    const passengerEvent = {
      tripId, studentId: studentIds[0], eventType: 'boarded' as const,
      idempotencyKey: `trip-event-${randomUUID()}`
    };
    const boarded = await repository.recordTripPassengerEvent(actors[0], passengerEvent);
    const boardedReplay = await repository.recordTripPassengerEvent(actors[0], passengerEvent);
    assert.equal(boardedReplay.eventId, boarded.eventId);
    assert.equal(boardedReplay.replayed, true);
  } finally {
    await runtime.close();
  }
});
