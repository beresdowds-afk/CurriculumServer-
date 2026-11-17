import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { PostgresRuntime } from './postgres';
import { SchoolAdministrationRepository, SchoolAdministrationError } from './schoolAdministrationRepository';
import { withControlPlaneTransaction, withTenantTransaction } from './tenantContext';
import { acceptanceTestOptions, principal } from './testSupport';

test('school administration persists student lifecycle and enforces scoped tenant isolation', acceptanceTestOptions, async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL!;
  const runtime = new PostgresRuntime({
    DATABASE_URL: databaseUrl,
    PGSSLMODE: process.env.TEST_DATABASE_SSLMODE || 'disable',
    NODE_ENV: 'test'
  });
  const pool = runtime.getPool();
  const repository = new SchoolAdministrationRepository(pool);
  const tenantIds = [randomUUID(), randomUUID()];
  const schoolIds = [randomUUID(), randomUUID()];
  const classIds = [randomUUID(), randomUUID()];
  const userIds = [randomUUID(), randomUUID()];
  const emails = userIds.map(id => `identity-${id}@test.invalid`);
  const platform = principal(randomUUID(), 'super_admin');

  try {
    const roleMappings = await pool.query<{ scope: string; role_code: string | null }>(
      `SELECT scope, role_code FROM production.school_role_appointments
       WHERE legacy_role IN ('principal_admin', 'hod_sciences', 'super_admin')
       ORDER BY legacy_role`
    );
    assert.deepEqual(roleMappings.rows, [
      { scope: 'school', role_code: 'department_head' },
      { scope: 'school', role_code: 'principal_administrator' },
      { scope: 'platform', role_code: null }
    ]);
    const assistantPermissions = await pool.query<{ permission_code: string }>(
      `SELECT permission_code FROM production.role_permissions
       WHERE role_code = 'administrative_assistant'`
    );
    assert.ok(assistantPermissions.rows.some(row => row.permission_code === PERMISSIONS.studentsRead));
    assert.ok(!assistantPermissions.rows.some(row =>
      row.permission_code === PERMISSIONS.permissionsManage ||
      row.permission_code === PERMISSIONS.studentsGraduate
    ));

    await withControlPlaneTransaction(pool, platform, async client => {
      for (let index = 0; index < tenantIds.length; index += 1) {
        await client.query(
          `INSERT INTO production.tenants (id, display_name, tenant_slug, created_by, status)
           VALUES ($1, $2, $3, 'acceptance-test', 'approved')`,
          [tenantIds[index], `School ${index}`, `administration-${tenantIds[index]}`]
        );
        const organization = await client.query<{ id: string }>(
          `INSERT INTO production.organizations (tenant_id, name) VALUES ($1, $2) RETURNING id`,
          [tenantIds[index], `Organization ${index}`]
        );
        await client.query(
          `INSERT INTO production.schools
             (tenant_id, organization_id, id, name, short_name, school_slug, official_contact_email)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tenantIds[index], organization.rows[0].id, schoolIds[index],
            `School ${index}`, `School ${index}`, `school-${tenantIds[index]}`,
            `school-${tenantIds[index]}@test.invalid`
          ]
        );
        await client.query(
          `INSERT INTO production.users (id, email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, 'acceptance-test-hash', now())`,
          [userIds[index], emails[index], `Admin ${index}`]
        );
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
           VALUES ($1, $2, $3, 'tenant_admin')`,
          [tenantIds[index], userIds[index].toString(), userIds[index]]
        );
      }
    });
    for (let index = 0; index < tenantIds.length; index += 1) {
      await withTenantTransaction(pool, principal(tenantIds[index]), client =>
        client.query(
          `INSERT INTO production.classes (tenant_id, school_id, id, name, academic_year)
           VALUES ($1, $2, $3, 'Grade 1', '2026-2027')`,
          [tenantIds[index], schoolIds[index], classIds[index]]
        )
      );
    }

    const tenantActors = tenantIds.map((tenantId, index) =>
      createAuthorizedPrincipal({
        tenant: principal(tenantId),
        userId: userIds[index],
        sessionId: randomUUID(),
        grants: [{
          roleCode: 'tenant_admin',
          permissions: Object.values(PERMISSIONS),
          scopes: []
        }]
      })
    );
    const studentA = await repository.createStudent(tenantActors[0], {
      schoolId: schoolIds[0],
      admissionNumber: 'A-001',
      firstName: 'Ada',
      lastName: 'Test'
    });
    await assert.rejects(
      repository.createStudent(tenantActors[0], {
        schoolId: schoolIds[0],
        admissionNumber: 'A-001',
        firstName: 'Duplicate',
        lastName: 'Student'
      }),
      /duplicate key/i
    );
    const studentB = await repository.createStudent(tenantActors[1], {
      schoolId: schoolIds[1],
      admissionNumber: 'B-001',
      firstName: 'Tenant',
      lastName: 'B'
    });
    const staffB = await withTenantTransaction(pool, principal(tenantIds[1]), async client => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO production.staff
           (tenant_id, school_id, staff_number, first_name, last_name, designation)
         VALUES ($1, $2, 'B-STAFF-001', 'Staff', 'TenantB', 'Teacher')
         RETURNING id`,
        [tenantIds[1], schoolIds[1]]
      );
      return result.rows[0].id;
    });
    const forgedTenant = await pool.connect();
    try {
      await forgedTenant.query('BEGIN');
      await forgedTenant.query(
        `SELECT set_config('app.tenant_id', $1, true),
                set_config('app.control_plane_admin', 'true', true)`,
        [tenantIds[1]]
      );
      for (const [table, id] of [
        ['production.students', studentB.id],
        ['production.classes', classIds[1]],
        ['production.staff', staffB]
      ]) {
        const result = await forgedTenant.query(
          `SELECT id FROM ${table} WHERE tenant_id = $1 AND id = $2`,
          [tenantIds[1], id]
        );
        assert.equal(result.rowCount, 0, `forged PostgreSQL context must not read ${table}`);
      }
      assert.equal((await forgedTenant.query(
        'SELECT production.is_verified_control_plane_context() AS allowed'
      )).rows[0]?.allowed, false);
    } finally {
      await forgedTenant.query('ROLLBACK');
      forgedTenant.release();
    }
    await repository.transitionStudent(tenantActors[0], schoolIds[0], studentA.id, { type: 'admit' });
    await repository.assignStudentToClass(tenantActors[0], schoolIds[0], studentA.id, classIds[0]);
    await repository.transitionStudent(tenantActors[0], schoolIds[0], studentA.id, { type: 'reinstate', reason: 'invalid' })
      .then(() => assert.fail('invalid lifecycle transitions must be rejected'))
      .catch(error => assert.ok(error instanceof SchoolAdministrationError &&
        error.code === 'INVALID_STUDENT_TRANSITION'));
    await repository.transitionStudent(tenantActors[0], schoolIds[0], studentA.id, { type: 'activate' });

    const directStudent = await withTenantTransaction(pool, principal(tenantIds[0]), client =>
      client.query(
        'UPDATE production.students SET first_name = $1 WHERE tenant_id = $2 AND id = $3 RETURNING id',
        ['Updated', tenantIds[1], studentB.id]
      )
    );
    assert.equal(directStudent.rowCount, 0, 'Tenant A cannot update rows with Tenant B context');

    await assert.rejects(
      repository.getStudent(tenantActors[0], schoolIds[1], studentB.id),
      (error: unknown) => error instanceof SchoolAdministrationError && error.code === 'STUDENT_NOT_FOUND'
    );
    const secondClass = await repository.createClass(tenantActors[0], {
      schoolId: schoolIds[0],
      name: 'Grade 2',
      academicYear: '2026-2027',
      section: 'B'
    });
    const scopedStudent = await repository.createStudent(tenantActors[0], {
      schoolId: schoolIds[0],
      admissionNumber: 'A-002',
      firstName: 'Scoped',
      lastName: 'Student'
    });
    await repository.transitionStudent(tenantActors[0], schoolIds[0], scopedStudent.id, { type: 'admit' });
    await repository.assignStudentToClass(tenantActors[0], schoolIds[0], scopedStudent.id, secondClass.id);
    const classScopedActor = createAuthorizedPrincipal({
      tenant: principal(tenantIds[0]),
      userId: userIds[0],
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'teacher',
        permissions: [PERMISSIONS.studentsRead],
        scopes: [{ resourceType: 'class', resourceId: classIds[0] }]
      }]
    });
    const scopedPage = await repository.listStudents(classScopedActor, schoolIds[0]);
    assert.deepEqual(scopedPage.records.map(record => record.id), [studentA.id]);
    const history = await repository.getStudentHistory(tenantActors[0], schoolIds[0], studentA.id);
    assert.deepEqual(history.map(event => event.event_type), ['activated', 'class_assigned', 'admitted', 'registered']);
  } finally {
    for (const tenantId of tenantIds) {
      await withTenantTransaction(pool, principal(tenantId), client =>
        client.query('DELETE FROM production.students WHERE tenant_id = $1', [tenantId])
      );
    }
    await withControlPlaneTransaction(pool, platform, async client => {
      await client.query('DELETE FROM production.tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
      await client.query('DELETE FROM production.users WHERE lower(email) = ANY($1::text[])', [emails]);
    }).finally(() => runtime.close());
  }
});
