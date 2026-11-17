import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';
import {
  DatabaseFailure,
  PostgresRuntime,
  classifyDatabaseError,
  inTransaction,
  readPostgresConfig,
  type DatabaseClient,
  type DatabasePool,
  type PoolConstructor
} from './postgres';
import { createVerifiedTenantPrincipal, withTenantTransaction } from './tenantContext';

process.env.CONTROL_PLANE_SECRET ||= 'unit-test-only-context-key-32-characters';

function fakeResult<R extends QueryResultRow>(rows: R[] = []): QueryResult<R> {
  return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
}

class FakePool implements DatabasePool {
  ended = false;
  released = 0;
  queries: string[] = [];
  queryError?: Error;
  connection: DatabaseClient = {
    query: async <R extends QueryResultRow>(text: string) => {
      this.queries.push(text);
      if (this.queryError) throw this.queryError;
      return fakeResult<R>();
    },
    release: () => { this.released += 1; }
  };

  constructor(public readonly config: PoolConfig) {}

  async query<R extends QueryResultRow>(text: string): Promise<QueryResult<R>> {
    this.queries.push(text);
    if (this.queryError) throw this.queryError;
    return fakeResult<R>();
  }

  async connect(): Promise<DatabaseClient> {
    return this.connection;
  }

  async end(): Promise<void> {
    this.ended = true;
  }

  on(): this {
    return this;
  }
}

test('database configuration distinguishes missing and malformed settings', async () => {
  const missing = new PostgresRuntime({}, FakePool as PoolConstructor);
  assert.deepEqual(await missing.healthCheck(), {
    configured: false,
    connectionVerified: false,
    error: 'configuration_missing'
  });
  assert.throws(() => readPostgresConfig({ PGPORT: '5432' }), (error: unknown) =>
    error instanceof DatabaseFailure && error.kind === 'configuration_missing'
  );
  assert.throws(() => readPostgresConfig({ PGHOST: 'localhost' }), (error: unknown) =>
    error instanceof DatabaseFailure && error.kind === 'configuration_malformed'
  );
  assert.throws(() => readPostgresConfig({ DATABASE_URL: 'https://example.test/db' }), (error: unknown) =>
    error instanceof DatabaseFailure && error.kind === 'configuration_malformed'
  );
  assert.throws(() => readPostgresConfig({
    PGHOST: 'localhost', PGDATABASE: 'db', PGUSER: 'user', PGPASSWORD: 'password',
    DATABASE_URL: 'postgres://user:password@localhost/db'
  }), (error: unknown) => error instanceof DatabaseFailure && error.kind === 'configuration_malformed');
});

test('valid PostgreSQL URLs configure bounded secure pools and graceful shutdown', async () => {
  let created: FakePool | undefined;
  const constructor = class extends FakePool {
    constructor(config: PoolConfig) {
      super(config);
      created = this;
    }
  } as PoolConstructor;
  const runtime = new PostgresRuntime({
    DATABASE_URL: 'postgresql://dbuser:secret%40pass@localhost:5432/curriculum_platform',
    PGSSLMODE: 'verify-full',
    NODE_ENV: 'test'
  }, constructor);
  assert.equal((await runtime.healthCheck()).connectionVerified, true);
  assert.equal(created?.config.max, 10);
  assert.equal(created?.config.connectionTimeoutMillis, 5000);
  assert.deepEqual(created?.config.ssl, { rejectUnauthorized: true });
  assert.equal(created?.config.password, 'secret@pass');
  await runtime.close();
  assert.equal(created?.ended, true);
});

test('PostgreSQL connection errors are classified without returning secret-bearing messages', async () => {
  assert.equal(classifyDatabaseError({ code: '28P01' }), 'authentication');
  assert.equal(classifyDatabaseError({ code: 'ETIMEDOUT' }), 'timeout');
  assert.equal(classifyDatabaseError({ code: 'ECONNREFUSED' }), 'unavailable');

  let created: FakePool | undefined;
  const constructor = class extends FakePool {
    constructor(config: PoolConfig) {
      super(config);
      created = this;
      this.queryError = Object.assign(new Error('secret must not escape'), { code: '28P01' });
    }
  } as PoolConstructor;
  const runtime = new PostgresRuntime({
    PGHOST: 'localhost', PGDATABASE: 'db', PGUSER: 'user', PGPASSWORD: 'secret',
    PGSSLMODE: 'disable'
  }, constructor);
  assert.deepEqual(await runtime.healthCheck(), {
    configured: true,
    connectionVerified: false,
    error: 'authentication'
  });
  await assert.rejects(runtime.query('SELECT 1'), error =>
    error instanceof DatabaseFailure &&
    error.kind === 'authentication' &&
    !error.message.includes('secret')
  );
  await runtime.close();
  assert.equal(created?.ended, true);
});

test('connection refusal and timeout remain distinct health failures', async () => {
  for (const [code, expected] of [['ECONNREFUSED', 'unavailable'], ['ETIMEDOUT', 'timeout']] as const) {
    const constructor = class extends FakePool {
      constructor(config: PoolConfig) {
        super(config);
        this.queryError = Object.assign(new Error('connection failed'), { code });
      }
    } as PoolConstructor;
    const runtime = new PostgresRuntime({
      PGHOST: 'localhost', PGDATABASE: 'db', PGUSER: 'user', PGPASSWORD: 'password',
      PGSSLMODE: 'disable'
    }, constructor);
    assert.deepEqual(await runtime.healthCheck(), {
      configured: true,
      connectionVerified: false,
      error: expected
    });
    await runtime.close();
  }
});

test('transactions roll back and always release their connection', async () => {
  const pool = new FakePool({});
  await assert.rejects(
    inTransaction(pool, async client => {
      await client.query('SELECT 1');
      throw new Error('operation failed');
    }),
    /operation failed/
  );
  assert.deepEqual(pool.queries, ['BEGIN', 'SELECT 1', 'ROLLBACK']);
  assert.equal(pool.released, 1);
});

test('tenant transactions require verified context and set a signed scope locally', async () => {
  const pool = new FakePool({});
  const missing = { valid: false };
  assert.throws(() => createVerifiedTenantPrincipal(missing), /verified tenant security context/);
  const principal = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'tenant-a',
      role: 'tenant_admin',
      appId: 'curriculum-flow',
      schoolName: 'Tenant A',
      subscriptionTier: 'standard',
      status: 'ACTIVE',
      databaseName: 'curriculum_platform',
      storageNamespace: '/tenant-a',
      issuer: 'test',
      audience: 'tenant-a',
      issuedAt: 1,
      expiresAt: 2,
      tokenSignature: 'verified',
      permissions: []
    }
  });
  await withTenantTransaction(pool, principal, async client => {
    await client.query('SELECT 1');
  });
  assert.equal(pool.queries[0], 'BEGIN');
  assert.match(pool.queries[1], /set_config\('app\.authorization_context_signature', \$3, true\)/);
  assert.deepEqual(pool.queries.slice(2), ['SELECT 1', 'COMMIT']);
  assert.equal(pool.released, 1);
  await assert.rejects(withTenantTransaction(pool, undefined as never, async () => undefined));
});
