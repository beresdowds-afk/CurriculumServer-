import 'dotenv/config';
import { Pool } from 'pg';
import type { PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';

export type DatabaseFailureKind =
  | 'configuration_missing'
  | 'configuration_malformed'
  | 'unavailable'
  | 'authentication'
  | 'timeout'
  | 'migration'
  | 'query';

export class DatabaseFailure extends Error {
  constructor(
    public readonly kind: DatabaseFailureKind,
    message: string
  ) {
    super(message);
    this.name = 'DatabaseFailure';
  }
}

export type PostgreSqlConfig = PoolConfig;

export interface DatabasePool {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
  connect(): Promise<DatabaseClient>;
  end(): Promise<void>;
  on(event: 'error', listener: (error: Error) => void): this;
}

export interface DatabaseClient {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
  release(): void;
}

export type PoolConstructor = new (config: PostgreSqlConfig) => DatabasePool;

export interface DatabaseHealth {
  configured: boolean;
  connectionVerified: boolean;
  error?: DatabaseFailureKind;
}

const SSL_MODES = new Set(['disable', 'require', 'verify-ca', 'verify-full']);

function configError(kind: 'configuration_missing' | 'configuration_malformed'): DatabaseFailure {
  return new DatabaseFailure(
    kind,
    kind === 'configuration_missing'
      ? 'PostgreSQL configuration is missing.'
      : 'PostgreSQL configuration is malformed.'
  );
}

export function readPostgresConfig(
  env: NodeJS.ProcessEnv = process.env
): PostgreSqlConfig {
  const databaseUrl = env.DATABASE_URL?.trim();
  const explicitNames = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const explicitValues = explicitNames.map(name => env[name]?.trim());
  const hasExplicit = explicitValues.some(Boolean);
  let sslMode = env.PGSSLMODE?.trim().toLowerCase();
  if (sslMode && !SSL_MODES.has(sslMode)) {
    throw configError('configuration_malformed');
  }
  if (databaseUrl && hasExplicit) {
    throw configError('configuration_malformed');
  }

  let host: string;
  let port: number;
  let database: string;
  let user: string;
  let password: string;

  if (databaseUrl) {
    let url: URL;
    try {
      url = new URL(databaseUrl);
    } catch {
      throw configError('configuration_malformed');
    }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
        !url.hostname || !url.username || !url.password ||
        !url.pathname || url.pathname === '/') {
      throw configError('configuration_malformed');
    }
    const urlSslMode = url.searchParams.get('sslmode');
    if (urlSslMode && (!SSL_MODES.has(urlSslMode) || (sslMode && urlSslMode !== sslMode))) {
      throw configError('configuration_malformed');
    }
    sslMode = sslMode || urlSslMode || 'verify-full';
    host = url.hostname;
    port = url.port ? Number(url.port) : 5432;
    try {
      database = decodeURIComponent(url.pathname.slice(1));
      user = decodeURIComponent(url.username);
      password = decodeURIComponent(url.password);
    } catch {
      throw configError('configuration_malformed');
    }
  } else {
    if (!hasExplicit) {
      throw configError('configuration_missing');
    }
    if (explicitValues.some(value => !value)) {
      throw configError('configuration_malformed');
    }
    host = env.PGHOST!.trim();
    database = env.PGDATABASE!.trim();
    user = env.PGUSER!.trim();
    password = env.PGPASSWORD!;
    port = env.PGPORT?.trim() ? Number(env.PGPORT) : 5432;
    sslMode = sslMode || 'verify-full';
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535 ||
      !host || !database || !user || !password ||
      /[\u0000-\u001f]/.test(host + database + user)) {
    throw configError('configuration_malformed');
  }
  const isUnixSocket = host.startsWith('/');
  if (sslMode === 'disable' && env.NODE_ENV === 'production' && !isUnixSocket) {
    throw configError('configuration_malformed');
  }

  const ssl = sslMode === 'disable' || isUnixSocket
    ? false
    : { rejectUnauthorized: true };

  return {
    host,
    port,
    database,
    user,
    password,
    ssl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    keepAlive: true,
    application_name: 'curriculum-server'
  };
}

export function classifyDatabaseError(error: unknown): DatabaseFailureKind {
  const candidate = error as { code?: string; message?: string };
  if (candidate?.code === '28P01' || candidate?.code === '28000') {
    return 'authentication';
  }
  if (candidate?.code === 'ETIMEDOUT' || candidate?.code === 'CONNECTION_TIMEOUT' ||
      /timeout/i.test(candidate?.message || '')) {
    return 'timeout';
  }
  if (candidate?.code?.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND'].includes(candidate?.code || '')) {
    return 'unavailable';
  }
  return 'query';
}

export class PostgresRuntime {
  private readonly pool?: DatabasePool;
  private readonly configurationFailure?: DatabaseFailure;

  constructor(
    env: NodeJS.ProcessEnv = process.env,
    PoolType: PoolConstructor = Pool
  ) {
    try {
      this.pool = new PoolType(readPostgresConfig(env));
      this.pool.on('error', error => {
        const kind = classifyDatabaseError(error);
        console.error(`PostgreSQL pool error (${kind}).`);
      });
    } catch (error) {
      if (!(error instanceof DatabaseFailure)) throw error;
      this.configurationFailure = error;
    }
  }

  get configured(): boolean {
    return Boolean(this.pool);
  }

  get configurationFailureKind(): DatabaseFailureKind | undefined {
    return this.configurationFailure?.kind;
  }

  getPool(): DatabasePool {
    if (!this.pool) {
      throw this.configurationFailure || configError('configuration_missing');
    }
    return this.pool;
  }

  async healthCheck(): Promise<DatabaseHealth> {
    if (!this.pool) {
      return {
        configured: false,
        connectionVerified: false,
        error: this.configurationFailure?.kind || 'configuration_missing'
      };
    }
    try {
      await this.pool.query('SELECT 1');
      return { configured: true, connectionVerified: true };
    } catch (error) {
      return {
        configured: true,
        connectionVerified: false,
        error: classifyDatabaseError(error)
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.end();
  }

  async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> {
    try {
      return await this.getPool().query<R>(text, values);
    } catch (error) {
      if (error instanceof DatabaseFailure) throw error;
      const kind = classifyDatabaseError(error);
      throw new DatabaseFailure(kind, kind === 'authentication'
        ? 'PostgreSQL authentication failed.'
        : kind === 'timeout'
          ? 'PostgreSQL connection or query timed out.'
          : kind === 'unavailable'
            ? 'PostgreSQL is unavailable.'
            : 'PostgreSQL query failed.');
    }
  }
}

export const postgresRuntime = new PostgresRuntime();

export async function inTransaction<T>(
  pool: DatabasePool,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  const client: PoolClient | DatabaseClient = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const result = await operation(client);
    await client.query('COMMIT');
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {
        throw new DatabaseFailure('query', 'PostgreSQL transaction rollback failed.');
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
