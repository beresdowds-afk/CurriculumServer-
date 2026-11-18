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
  readonly actions: string[] = [];
  readonly rolePermissions: string[];
  readonly currentPermissions: string[];
  readonly activeAssignmentInsertRowCount: number;
  readonly client: DatabaseClient = {
    query: async <R extends QueryResultRow>(text: string, values?: unknown[]) => {
      this.statements.push(text);
      if (text.includes('FROM production.user_sessions user_session')) {
        return result<R>([{} as R]);
      }
      if (text.includes('SELECT DISTINCT permission.code AS permission_code')) {
        return result<R>(this.currentPermissions.map(permission_code => ({ permission_code })));
      }
      if (text.includes('SELECT COALESCE(array_agg(permission.code)')) {
        return result<R>([{ permissions: values?.[0] === 'tenant_admin'
          ? [PERMISSIONS.studentsManage] : this.rolePermissions }]);
      }
      if (text.includes('FROM production.memberships') && text.includes('FOR UPDATE')) {
        return result<R>([{ user_subject: 'target-subject' }]);
      }
      if (text.includes('INSERT INTO production.membership_role_assignments')) {
        return { ...result<R>(), rowCount: this.activeAssignmentInsertRowCount };
      }
      if (text.includes('UPDATE production.membership_role_assignments')) {
        return result<R>([{ id: 'assignment-id', role_code: 'staff' }]);
      }
      if (text.includes('INSERT INTO production.audit_events')) {
        this.actions.push(text);
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

  constructor(options: {
    rolePermissions?: string[];
    currentPermissions?: string[];
    activeAssignmentInsertRowCount?: number;
  } = {}) {
    this.rolePermissions = options.rolePermissions ?? [];
    this.currentPermissions = options.currentPermissions ?? [PERMISSIONS.membershipRolesAssign];
    this.activeAssignmentInsertRowCount = options.activeAssignmentInsertRowCount ?? 1;
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

test('role assignment uses current database permissions rather than stale principal grants', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId),
    userId,
    sessionId: '33333333-3333-4333-8333-333333333333',
    grants: [{
      roleCode: 'stale_admin',
      permissions: [PERMISSIONS.membershipRolesAssign, PERMISSIONS.studentsManage],
      scopes: []
    }]
  });
  const repository = new AuthorizationRepository(new AuthorizationTestPool({
    rolePermissions: [PERMISSIONS.studentsManage]
  }));

  await assert.rejects(repository.assignRole(actor, userId, 'staff'), /FORBIDDEN/);
});

test('duplicate active role assignments fail without writing a success audit', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId),
    userId,
    sessionId: '33333333-3333-4333-8333-333333333333',
    grants: [{
      roleCode: 'tenant_admin',
      permissions: [PERMISSIONS.membershipRolesAssign],
      scopes: []
    }]
  });
  const pool = new AuthorizationTestPool({ activeAssignmentInsertRowCount: 0 });

  await assert.rejects(
    new AuthorizationRepository(pool).assignRole(actor, userId, 'staff'),
    /ROLE_ALREADY_ASSIGNED/
  );
  assert.equal(pool.actions.length, 0);
});

test('role revocation records an audit event and cannot silently revoke a missing assignment', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId),
    userId,
    sessionId: '33333333-3333-4333-8333-333333333333',
    grants: [{
      roleCode: 'tenant_admin',
      permissions: [PERMISSIONS.membershipRolesAssign],
      scopes: []
    }]
  });
  const pool = new AuthorizationTestPool();
  const repository = new AuthorizationRepository(pool);

  await repository.revokeRole(actor, userId, 'staff', 'role no longer needed');
  assert.ok(pool.statements.some(statement =>
    statement.includes('UPDATE production.membership_role_assignments') &&
    statement.includes('RETURNING id')));
  assert.ok(pool.actions.some(action => action.includes("'membership_role_revoked'")));

  const missingAssignmentPool = new AuthorizationTestPool();
  missingAssignmentPool.client.query = async <R extends QueryResultRow>(text: string) => {
    missingAssignmentPool.statements.push(text);
    if (text.includes('FROM production.user_sessions user_session')) return result<R>([{} as R]);
    if (text.includes('SELECT DISTINCT permission.code AS permission_code')) {
      return result<R>([{ permission_code: PERMISSIONS.membershipRolesAssign }]);
    }
    if (text.includes('FROM production.memberships') && text.includes('FOR UPDATE')) {
      return result<R>([{ user_subject: 'target-subject' }]);
    }
    if (text.includes('UPDATE production.membership_role_assignments')) return result<R>();
    return result<R>();
  };
  await assert.rejects(
    new AuthorizationRepository(missingAssignmentPool).revokeRole(actor, userId, 'staff', 'test'),
    /ROLE_ASSIGNMENT_NOT_FOUND/
  );
});
