import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PostgresRuntime } from '../db/postgres';
import { withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { acceptanceTestOptions, principal } from '../db/testSupport';
import { LogisticsError, LogisticsRepository } from './logisticsRepository';

test('boarding and transport workflows enforce isolation, permissions, idempotency and concurrent capacity', acceptanceTestOptions, async () => {
  const runtime = new PostgresRuntime({ DATABASE_URL: process.env.TEST_DATABASE_URL!, PGSSLMODE: 'disable', NODE_ENV: 'test' });
  const pool = runtime.getPool();
  const repository = new LogisticsRepository(pool);
  const tenants = [randomUUID(), randomUUID()];
  const schools = [randomUUID(), randomUUID()];
  const users = [randomUUID(), randomUUID()];
  const students = [randomUUID(), randomUUID(), randomUUID()];
  const permissions = ['logistics.configuration.manage', 'logistics.hostel.manage', 'logistics.hostel.read',
    'logistics.dining.manage', 'logistics.dining.entitlement.manage', 'logistics.dietary.manage',
    'logistics.dietary.read', 'logistics.dietary.exception', 'logistics.transport.manage', 'logistics.transport.passengers.manage'];
  const actors = tenants.map((tenantId, index) => createAuthorizedPrincipal({
    tenant: principal(tenantId), userId: users[index], sessionId: randomUUID(),
    grants: [{ roleCode: 'tenant_admin', permissions, scopes: [] }]
  }));
  const limited = createAuthorizedPrincipal({
    tenant: principal(tenants[0]), userId: users[0], sessionId: randomUUID(),
    grants: [{ roleCode: 'dining_officer', permissions: ['logistics.dining.manage'], scopes: [] }]
  });
  const code = async (promise: Promise<unknown>) => {
    try { await promise; return 'NONE'; } catch (error) {
      if (!(error instanceof LogisticsError)) throw error;
      return error.code;
    }
  };
  try {
    await withControlPlaneTransaction(pool, principal(randomUUID(), 'super_admin'), async client => {
      for (let i = 0; i < 2; i++) {
        await client.query(`INSERT INTO production.tenants (id,display_name,tenant_slug,created_by,status)
          VALUES ($1,'Test',$2,'test','approved')`, [tenants[i], `bt-${tenants[i]}`]);
        const org = await client.query<{ id: string }>(`INSERT INTO production.organizations (tenant_id,name) VALUES ($1,'Test') RETURNING id`, [tenants[i]]);
        await client.query(`INSERT INTO production.schools (tenant_id,organization_id,id,name,short_name,school_slug,official_contact_email)
          VALUES ($1,$2,$3,'Test','Test',$4,$5)`, [tenants[i], org.rows[0].id, schools[i], `bt-${tenants[i]}`, `${tenants[i]}@test.invalid`]);
        await client.query(`INSERT INTO production.users (id,email,full_name,password_hash,email_verified_at)
          VALUES ($1,$2,'Test','test',now())`, [users[i], `${users[i]}@test.invalid`]);
        await client.query(`INSERT INTO production.memberships (tenant_id,user_subject,user_id,role) VALUES ($1,$2,$3,'tenant_admin')`, [tenants[i], users[i], users[i]]);
        await client.query(`INSERT INTO production.application_instances
          (tenant_id,school_id,application_id,configuration_version,status,enabled_features,deployment_architecture,architecture,template_id,template_version,provisioning_status,activated_at)
          VALUES ($1,$2,'app_curriculum_flow','1','active',ARRAY['feat_logistics_boarding_house','feat_logistics_transportation'],
          'shared_database','shared_database','school-standard','1','ready',now())`, [tenants[i], schools[i]]);
      }
    });
    for (const actor of actors) await repository.updateConfiguration(actor, {
      capabilities: { hostel_management: true, dining_management: true, school_transport: true }, settings: {}
    });
    await withTenantTransaction(pool, actors[0].tenant, async client => {
      for (const id of students) await client.query(
        `INSERT INTO production.students (tenant_id,school_id,id,admission_number,first_name,last_name,lifecycle_status)
         VALUES ($1,$2,$3,$4,'Test','Student','active')`, [tenants[0], schools[0], id, id]);
    });
    const building = await repository.createHostelBuilding(actors[0], { name: 'A', approvedCapacity: 2 });
    const room = await repository.createHostelRoom(actors[0], { buildingId: building.id, roomNumber: '1', capacity: 2 });
    const bed = await repository.createHostelBed(actors[0], { roomId: room.id, bedNumber: '1' });
    await repository.allocateBed(actors[0], { studentId: students[0], bedId: bed.id });
    const assignment = await repository.assignHostelStaff(actors[0], { buildingId: building.id, userId: users[0], role: 'assistant', idempotencyKey: 'assignment-1' });
    assert.equal((await repository.assignHostelStaff(actors[0], { buildingId: building.id, userId: users[0], role: 'assistant', idempotencyKey: 'assignment-1' })).replayed, true);
    await repository.revokeHostelStaff(actors[0], { assignmentId: assignment.id, idempotencyKey: 'revoke-assignment-1' });
    const assistant = createAuthorizedPrincipal({
      tenant: principal(tenants[0]), userId: users[0], sessionId: randomUUID(),
      grants: [{ roleCode: 'hostel_assistant', permissions: ['logistics.hostel.read', 'logistics.hostel.manage'], scopes: [] }]
    });
    assert.equal(await code(repository.recordBoardingRegister(assistant, { kind: 'evening', studentId: students[0], serviceDate: '2030-01-01', status: 'present', idempotencyKey: 'unassigned-staff' })), 'FORBIDDEN');
    assert.equal((await repository.listBoardingRegister(actors[0], { buildingId: building.id, kind: 'evening', serviceDate: '2030-01-01' }))[0].status, 'unaccounted');
    await repository.recordBoardingRegister(actors[0], { kind: 'evening', studentId: students[0], serviceDate: '2030-01-01', status: 'present', idempotencyKey: 'evening-1' });
    await repository.recordBoardingRegister(actors[0], { kind: 'curfew', studentId: students[0], serviceDate: '2030-01-01', status: 'unaccounted', idempotencyKey: 'curfew-1' });
    assert.equal((await repository.listBoardingRegister(actors[0], { buildingId: building.id, kind: 'curfew', serviceDate: '2030-01-01' }))[0].status, 'unaccounted');
    assert.equal(await code(repository.recordBoardingRegister(actors[1], { kind: 'evening', studentId: students[0], serviceDate: '2030-01-01', status: 'present', idempotencyKey: 'cross-tenant' })), 'NOT_FOUND');

    const meal = await repository.scheduleMeal(actors[0], { diningHall: 'Hall', serviceDate: '2030-01-01', servicePeriod: 'lunch', menu: [], startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T13:00:00Z', idempotencyKey: 'meal-key-1' });
    const restriction = await repository.authorizeDietaryRestriction(actors[0], { studentId: students[0], restriction: 'Allergen', startsOn: '2029-01-01', idempotencyKey: 'dietary-key-1' });
    assert.equal(await code(repository.listDietaryRestrictions(limited, students[0])), 'FORBIDDEN');
    assert.equal((await repository.listDietaryRestrictions(actors[1], students[0])).length, 0);
    assert.equal(await code(repository.recordDiningAttendance(limited, { mealId: meal.id, studentId: students[0], idempotencyKey: 'attendance-1', dietaryExceptionReason: 'unavailable' })), 'FORBIDDEN');
    const attendance = await repository.recordDiningAttendance(actors[0], { mealId: meal.id, studentId: students[0], idempotencyKey: 'attendance-2', overrideReason: 'approved', dietaryExceptionReason: 'approved alternative' });
    assert.equal((await repository.recordDiningAttendance(actors[0], { mealId: meal.id, studentId: students[0], idempotencyKey: 'attendance-2', overrideReason: 'approved', dietaryExceptionReason: 'approved alternative' })).id, attendance.id);
    assert.equal(await code(repository.recordDiningAttendance(actors[0], { mealId: meal.id, studentId: students[0], idempotencyKey: 'attendance-2', overrideReason: 'changed', dietaryExceptionReason: 'approved alternative' })), 'CONFLICT');
    await repository.revokeDietaryRestriction(actors[0], { restrictionId: restriction.id, idempotencyKey: 'dietary-revoke-1' });

    const route = await repository.createTransportRoute(actors[0], { name: 'Route', stops: ['A', 'B'], idempotencyKey: 'route-key-1' });
    assert.deepEqual(((await repository.listTransportRoutes(actors[0]))[0].stops as { name: string }[]).map(stop => stop.name), ['A', 'B']);
    assert.equal((await repository.listTransportRoutes(actors[1])).length, 0);
    const stops = await withTenantTransaction(pool, actors[0].tenant, client => client.query<{ id: string }>(
      `SELECT id FROM production.logistics_route_stops WHERE tenant_id=$1 AND route_id=$2 ORDER BY stop_order`, [tenants[0], route.id]));
    const subscription = (studentId: string, key: string) => repository.subscribeStudentRoute(actors[0], { studentId, routeId: route.id, pickupStopId: stops.rows[0].id, dropoffStopId: stops.rows[1].id, startsOn: '2029-01-01', idempotencyKey: key });
    await subscription(students[0], 'subscribe-1');
    const driver = await repository.registerTransportDriver(actors[0], { fullName: 'Driver', licenceNumber: 'ABC', licenceValidUntil: '2031-01-01', qualified: true, idempotencyKey: 'driver-key-1' });
    const vehicle = await repository.registerTransportVehicle(actors[0], { registration: 'ABC', operatorType: 'school_owned', capacity: 1, approved: true, inspectionValidUntil: '2031-01-01', insuranceValidUntil: '2031-01-01', idempotencyKey: 'vehicle-key-1' });
    assert.equal((await repository.listTransportVehicles(actors[0])).length, 1);
    assert.equal((await repository.listTransportDrivers(actors[0])).length, 1);
    const trip = (key: string) => repository.scheduleTrip(actors[0], { routeId: route.id, tripDate: '2030-01-01', departureAt: '2030-01-01T07:00:00Z', arrivalAt: '2030-01-01T08:00:00Z', idempotencyKey: key });
    const [tripA, tripB] = await Promise.all([trip('schedule-1'), trip('schedule-2')]);
    const race = await Promise.allSettled([tripA, tripB].map(item => repository.assignTrip(actors[0], { tripId: item.id, driverId: driver.id, vehicleId: vehicle.id })));
    assert.equal(race.filter(item => item.status === 'fulfilled').length, 1);
    const assigned = race[0].status === 'fulfilled' ? tripA : tripB;
    assert.equal(await code(subscription(students[1], 'subscribe-2')), 'CONFLICT');
    assert.equal(await code(repository.assignTrip(actors[1], { tripId: assigned.id, driverId: driver.id, vehicleId: vehicle.id })), 'NOT_FOUND');
    const maintenance = await repository.scheduleVehicleMaintenance(actors[0], { vehicleId: vehicle.id, description: 'Inspection', dueOn: '2030-01-01', idempotencyKey: 'maintenance-1' });
    assert.equal(await code(repository.startTrip(actors[0], assigned.id)), 'CONFLICT');
    await repository.completeVehicleMaintenance(actors[0], { maintenanceId: maintenance.id, idempotencyKey: 'maintenance-done' });
    await repository.updateTransportVehicleCompliance(actors[0], { vehicleId: vehicle.id, insuranceValidUntil: '2029-01-01', inspectionValidUntil: '2031-01-01', approved: true, status: 'active', idempotencyKey: 'insurance-expired' });
    assert.equal(await code(repository.startTrip(actors[0], assigned.id)), 'CONFLICT');
    await repository.updateTransportVehicleCompliance(actors[0], { vehicleId: vehicle.id, insuranceValidUntil: '2031-01-01', inspectionValidUntil: '2031-01-01', approved: true, status: 'active', idempotencyKey: 'insurance-renewed' });
    await repository.startTrip(actors[0], assigned.id);
    await repository.recordTransportIncident(actors[0], { tripId: assigned.id, studentId: students[0], type: 'missed_pickup', description: 'Absent at stop', idempotencyKey: 'missed-key-1' });
    const boardingInput = { tripId: assigned.id, studentId: students[0], eventType: 'boarded' as const, idempotencyKey: 'boarding-key-1' };
    const boarding = await Promise.all([repository.recordTripPassengerEvent(actors[0], boardingInput), repository.recordTripPassengerEvent(actors[0], boardingInput)]);
    assert.equal(boarding[0].eventId, boarding[1].eventId);
    assert.equal(boarding.filter(event => event.replayed).length, 1);
    assert.equal(await code(repository.completeTrip(actors[0], { tripId: assigned.id, idempotencyKey: 'premature-complete' })), 'CONFLICT');
    await repository.recordTripPassengerEvent(actors[0], { tripId: assigned.id, studentId: students[0], eventType: 'dropped_off', idempotencyKey: 'dropoff-key-1' });
    assert.equal((await repository.listTransportIncidents(actors[0], assigned.id)).length, 1);
    assert.equal((await repository.listVehicleMaintenance(actors[0], vehicle.id)).length, 1);
    assert.equal((await repository.listStudentRoutes(actors[0], students[0])).length, 1);
    assert.equal((await repository.listTransportTrips(actors[0], { tripDate: '2030-01-01' })).length, 2);
    await repository.completeTrip(actors[0], { tripId: assigned.id, idempotencyKey: 'complete-trip-1' });
    assert.equal(await code(repository.completeTrip(limited, { tripId: assigned.id, idempotencyKey: 'complete-trip-2' })), 'FORBIDDEN');
    const route2 = await repository.createTransportRoute(actors[0], { name: 'Other', stops: ['C'], idempotencyKey: 'route-key-2' });
    const stop2 = ((await repository.listTransportRoutes(actors[0])).find(item => item.id === route2.id)!.stops as { id: string }[])[0].id;
    const sub2 = (studentId: string, key: string) => repository.subscribeStudentRoute(actors[0], { studentId, routeId: route2.id, pickupStopId: stop2, dropoffStopId: stop2, startsOn: '2029-01-01', idempotencyKey: key });
    const baseSubscription = await sub2(students[1], 'base-subscription');
    const trip2 = await repository.scheduleTrip(actors[0], { routeId: route2.id, tripDate: '2030-01-02', departureAt: '2030-01-02T07:00:00Z', arrivalAt: '2030-01-02T08:00:00Z', idempotencyKey: 'other-trip' });
    const capacityRace = await Promise.allSettled([
      sub2(students[2], 'racing-subscription'),
      repository.assignTrip(actors[0], { tripId: trip2.id, driverId: driver.id, vehicleId: vehicle.id })
    ]);
    assert.equal(capacityRace.filter(item => item.status === 'fulfilled').length, 1);
    const rejected = capacityRace.find(item => item.status === 'rejected') as PromiseRejectedResult;
    assert.equal(rejected.reason.code, 'CONFLICT');
    await repository.endStudentRoute(actors[0], { subscriptionId: baseSubscription.id, endsOn: '2030-01-03', idempotencyKey: 'end-subscription' });
    await repository.updateConfiguration(actors[1], { capabilities: { school_transport: false }, settings: {} });
    assert.equal(await code(repository.listTransportRoutes(actors[1])), 'FEATURE_DISABLED');
  } finally {
    await runtime.close();
  }
});
