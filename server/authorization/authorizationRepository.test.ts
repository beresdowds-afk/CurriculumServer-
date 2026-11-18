import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal } from '../db/testSupport';
import { AuthorizationRepository } from './authorizationRepository';
import { createAuthorizedPrincipal } from './authorizedPrincipal';
import { PERMISSIONS } from './permissions';

function result<R extends QueryResultRow>(rows: QueryResultRow[] = []): QueryResult<R> {
  return { rows: rows as R[], command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
}

class AuthorizationTestPool implements DatabasePool {
  readonly statements: string[] = [];
  readonly client: DatabaseClient = {
    query: async <R extends QueryResultRow>(text: string) => {
      this.statements.push(text);
      if (text.includes('FROM production.user_sessions user_session')) {
        return result<R>([{} as R]);
      }
      if (text.includes('SELECT DISTINCT permission.code AS permission_code')) {
        return result<R>([{ permission_code: PERMISSIONS.membershipRolesAssign }]);
      }
      if (text.includes('SELECT COALESCE(array_agg(permission.code)')) {
        return result<R>([{ permissions: [PERMISSIONS.studentsManage] }]);
      }
      return result<R>();
    },
    release: () => undefined
  };

  async query<R extends QueryResultRow>(): Promise<QueryResult<R>> {
    return result<R>();
  }

  async connect(): Promise<DatabaseClient> {
    return this.client;
  }

  async end(): Promise<void> {}

  on(): this {
    return this;
  }
}

test('role assignment rejects privileges the current actor does not hold', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId),
    userId,
    sessionId,
    grants: [{
      roleCode: 'limited_admin',
      permissions: [PERMISSIONS.membershipRolesAssign],
      scopes: []
    }]
  });
  const pool = new AuthorizationTestPool();
  const repository = new AuthorizationRepository(pool);

  await assert.rejects(
    repository.assignRole(actor, userId, 'tenant_admin'),
    /FORBIDDEN/
  );
  assert.equal(
    pool.statements.some(statement => statement.includes('INSERT INTO production.membership_role_assignments')),
    false
  );
});
