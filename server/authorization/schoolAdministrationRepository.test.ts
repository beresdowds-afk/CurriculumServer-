import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { SchoolAdministrationRepository } from '../db/schoolAdministrationRepository';
import { principal } from '../db/testSupport';
import { createAuthorizedPrincipal } from './authorizedPrincipal';
import { PERMISSIONS } from './permissions';

const tenantId = '11111111-1111-4111-8111-111111111111';
const schoolId = '22222222-2222-4222-8222-222222222222';
const resourceId = '33333333-3333-4333-8333-333333333333';
const otherId = '44444444-4444-4444-8444-444444444444';

class TestPool implements DatabasePool {
  connections = 0;
  statements: Array<{ text: string; values?: unknown[] }> = [];
  async query<R extends QueryResultRow>(): Promise<QueryResult<R>> {
    return { rows: [], rowCount: 0, command: '', fields: [], oid: 0 };
  }
  async connect(): Promise<DatabaseClient> {
    this.connections++;
    return {
      query: async <R extends QueryResultRow>(text: string, values?: unknown[]) => {
        this.statements.push({ text, values });
        const rows: QueryResultRow[] = text.includes('UPDATE production.students SET')
          ? [{ id: resourceId, tenant_id: tenantId, school_id: schoolId }]
          : [];
        return { rows: rows as R[], rowCount: rows.length, command: '', fields: [], oid: 0 };
      },
      release: () => undefined
    };
  }
  async end(): Promise<void> {}
  on(): this { return this; }
}

test('privileged school repository methods enforce resource scopes independently of routes', async () => {
  const pool = new TestPool();
  const repository = new SchoolAdministrationRepository(pool);
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId),
    userId: resourceId,
    sessionId: otherId,
    grants: [{
      roleCode: 'staff',
      permissions: [
        PERMISSIONS.studentsUpdate,
        PERMISSIONS.classesUpdate,
        PERMISSIONS.staffRead,
        PERMISSIONS.staffUpdate,
        PERMISSIONS.studentsAdmit
      ],
      scopes: [
        { resourceType: 'student', resourceId },
        { resourceType: 'class', resourceId },
        { resourceType: 'staff', resourceId }
      ]
    }]
  });
  await assert.rejects(repository.updateStudent(actor, schoolId, otherId, { firstName: 'No' }), /FORBIDDEN/);
  await assert.rejects(repository.updateClass(actor, schoolId, otherId, { name: 'No' }), /FORBIDDEN/);
  await assert.rejects(repository.getStaff(actor, schoolId, otherId), /FORBIDDEN/);
  await assert.rejects(repository.updateStaff(actor, schoolId, otherId, { firstName: 'No' }), /FORBIDDEN/);
  await assert.rejects(repository.transitionStudent(actor, schoolId, resourceId, { type: 'admit' }), /FORBIDDEN/);
  assert.equal(pool.connections, 0);

  const updated = await repository.updateStudent(actor, schoolId, resourceId, { firstName: 'Allowed' });
  assert.equal(updated.id, resourceId);
  const update = pool.statements.find(statement => statement.text.includes('UPDATE production.students SET'));
  assert.deepEqual(update?.values?.slice(0, 3), [tenantId, schoolId, resourceId]);
});
