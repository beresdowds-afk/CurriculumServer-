import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PostgresRuntime } from '../db/postgres';
import { withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import { acceptanceTestOptions, principal } from '../db/testSupport';
import { LogisticsError, LogisticsRepository } from './logisticsRepository';

const hostelPermissions = ['logistics.configuration.manage', 'logistics.hostel.manage', 'logistics.hostel.read'];

async function rejectionCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof LogisticsError ? error.code : `UNEXPECTED:${(error as Error).message}`;
  }
  return 'NO_ERROR';
}

test('hostel bed allocation enforces capacity, transactional transfers and tenant isolation', acceptanceTestOptions, async () => {
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
  const studentIds = Array.from({ length: 6 }, () => randomUUID());
  const platform = principal(randomUUID(), 'super_admin');
  const actors = tenantIds.map((tenantId, index) =>
    createAuthorizedPrincipal({
      tenant: principal(tenantId),
      userId: userIds[index],
      sessionId: randomUUID(),
      grants: [{ roleCode: 'tenant_admin', permissions: hostelPermissions, scopes: [] }]
    })
  );
  const readOnly = createAuthorizedPrincipal({
    tenant: principal(tenantIds[0]),
    userId: userIds[0],
    sessionId: randomUUID(),
    grants: [{ roleCode: 'staff', permissions: ['logistics.hostel.read'], scopes: [] }]
  });

  try {
    await withControlPlaneTransaction(pool, platform, async client => {
      for (let index = 0; index < 2; index += 1) {
        const tenantId = tenantIds[index];
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, $2, $3, 'hostel-acceptance', 'approved')`,
          [tenantId, `Hostel ${index}`, `hostel-${tenantId}`]
        );
        const organization = await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id`,
          [tenantId, `Hostel organization ${index}`]
        );
        await client.query(
          `INSERT INTO production.schools
             (tenant_id, organization_id, id, name, short_name, school_slug, official_contact_email)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, organization.rows[0].id, schoolIds[index], `Hostel School ${index}`,
            `Hostel School ${index}`, `hostel-school-${tenantId}`, `hostel-${tenantId}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, 'Hostel Admin', 'acceptance-test-hash', now())`,
          [userIds[index], `hostel-${tenantId}@test.invalid`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
           VALUES ($1, $2, $3, 'tenant_admin')`,
          [tenantId, userIds[index], userIds[index]]
        );
        await client.query(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, configuration_version, status,
              enabled_features, deployment_architecture, architecture, template_id,
              template_version, provisioning_status, activated_at)
           VALUES ($1, $2, 'app_curriculum_flow', '1', 'active',
                   ARRAY['feat_logistics_boarding_house'], 'shared_database',
                   'shared_database', 'school-standard', '1', 'ready', now())`,
          [tenantId, schoolIds[index]]
        );
      }
    });
    for (let index = 0; index < 2; index += 1) {
      await repository.updateConfiguration(actors[index], { capabilities: { hostel_management: true }, settings: {} });
    }
    await withTenantTransaction(pool, actors[0].tenant, async client => {
      for (const [index, studentId] of studentIds.entries()) {
        await client.query(
          `INSERT INTO production.students
             (tenant_id, school_id, id, admission_number, first_name, last_name, lifecycle_status)
           VALUES ($1, $2, $3, $4, 'Hostel', 'Student', 'active')`,
          [tenantIds[0], schoolIds[0], studentId, `HOS-${index}-${studentId}`]
        );
      }
    });

    const building = await repository.createHostelBuilding(actors[0], { name: 'Block A', approvedCapacity: 3 });
    const room = await repository.createHostelRoom(actors[0], { buildingId: building.id, roomNumber: '1', capacity: 2 });
    const otherRoom = await repository.createHostelRoom(actors[0], { buildingId: building.id, roomNumber: '2', capacity: 2 });
    const bedA = await repository.createHostelBed(actors[0], { roomId: room.id, bedNumber: 'A' });
    const bedB = await repository.createHostelBed(actors[0], { roomId: room.id, bedNumber: 'B' });
    const bedC = await repository.createHostelBed(actors[0], { roomId: otherRoom.id, bedNumber: 'C' });

    // Room capacity (2) and building approved capacity (3) cannot be exceeded.
    assert.equal(await rejectionCode(repository.createHostelBed(actors[0], { roomId: room.id, bedNumber: 'X' })), 'CONFLICT');
    assert.equal(await rejectionCode(repository.createHostelBed(actors[0], { roomId: otherRoom.id, bedNumber: 'Y' })), 'CONFLICT');
    assert.equal(await rejectionCode(repository.allocateBed(readOnly, { studentId: studentIds[0], bedId: bedA.id })), 'FORBIDDEN');

    // Concurrent allocation of one bed to many students: exactly one wins.
    const race = await Promise.allSettled(studentIds.slice(0, 5).map(studentId =>
      repository.allocateBed(actors[0], { studentId, bedId: bedA.id })));
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    for (const result of race) {
      if (result.status === 'rejected') assert.equal((result.reason as LogisticsError).code, 'CONFLICT');
    }
    const winner = race.findIndex(result => result.status === 'fulfilled');
    const winnerStudent = studentIds[winner];
    const winnerAllocation = (race[winner] as PromiseFulfilledResult<{ allocationId: string }>).value.allocationId;

    // Concurrent allocation of one student to several beds: exactly one active allocation.
    const spare = studentIds[5];
    const multi = await Promise.allSettled([bedB.id, bedC.id].map(bedId =>
      repository.allocateBed(actors[0], { studentId: spare, bedId })));
    assert.equal(multi.filter(result => result.status === 'fulfilled').length, 1);

    // A failed transfer to an occupied bed keeps the existing allocation untouched.
    const active = await repository.listBedAllocations(actors[0], { status: 'active' });
    const occupiedBedId = active.items.find(item => item.studentId === spare)!.bedId as string;
    assert.equal(await rejectionCode(repository.transferStudent(actors[0], {
      studentId: winnerStudent, toBedId: occupiedBedId
    })), 'CONFLICT');
    assert.equal(active.items.length, 2);
    assert.ok(active.items.some(item => item.id === winnerAllocation && item.endedAt === null));

    // Transfer to a free bed is atomic and preserves history.
    const freeBed = [bedB.id, bedC.id].find(id => !active.items.some(item => item.bedId === id))!;
    const moved = await repository.transferStudent(actors[0], { studentId: winnerStudent, toBedId: freeBed });
    assert.equal(moved.previousAllocationId, winnerAllocation);
    const history = await repository.listBedAllocations(actors[0], { studentId: winnerStudent });
    assert.equal(history.items.length, 2);
    assert.equal(history.items.filter(item => item.endedAt === null).length, 1);

    // Vacate, then the bed is reusable and a second vacate conflicts.
    await repository.vacateAllocation(actors[0], moved.allocationId);
    assert.equal(await rejectionCode(repository.vacateAllocation(actors[0], moved.allocationId)), 'CONFLICT');

    // Cross-tenant direct-ID attacks are indistinguishable from missing records.
    assert.equal(await rejectionCode(repository.allocateBed(actors[1], { studentId: winnerStudent, bedId: bedA.id })), 'NOT_FOUND');
    assert.equal(await rejectionCode(repository.vacateAllocation(actors[1], winnerAllocation)), 'NOT_FOUND');
    assert.equal(await rejectionCode(repository.createHostelBed(actors[1], { roomId: room.id, bedNumber: 'Z' })), 'NOT_FOUND');
    assert.equal((await repository.listBedAllocations(actors[1], {})).items.length, 0);

    // Every mutation produced a durable audit event.
    const audit = await withTenantTransaction(pool, actors[0].tenant, client => client.query(
      `SELECT action FROM production.logistics_audit_events WHERE tenant_id = $1 AND action LIKE 'hostel_%'`,
      [tenantIds[0]]
    ));
    const actions = new Set(audit.rows.map(row => row.action));
    for (const action of ['hostel_building_created', 'hostel_room_created', 'hostel_bed_created',
      'hostel_bed_allocated', 'hostel_student_transferred', 'hostel_allocation_vacated']) {
      assert.ok(actions.has(action), `missing audit ${action}`);
    }
  } finally {
    await runtime.close();
  }
});
