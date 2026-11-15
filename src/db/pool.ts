import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | undefined;
let migrationPool: Pool | undefined;

function getPool(url: string | undefined, purpose: string): Pool {
  if (!url) {
    throw new Error(`PostgreSQL is unavailable: ${purpose} is not configured.`);
  }
  return new Pool({ connectionString: url });
}

export function getDatabasePool(): Pool {
  pool ??= getPool(process.env.DATABASE_URL, 'DATABASE_URL');
  return pool;
}

export function getMigrationPool(): Pool {
  migrationPool ??= getPool(process.env.MIGRATION_DATABASE_URL, 'MIGRATION_DATABASE_URL');
  return migrationPool;
}

export async function withTenantTransaction<T>(
  tenantId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new Error('A valid authenticated tenant identity is required.');
  }

  const client = await getDatabasePool().connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const role = await client.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      owns_production_table: boolean;
    }>(
      `SELECT r.rolsuper, r.rolbypassrls,
              EXISTS (
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'production'
                  AND c.relkind IN ('r', 'p')
                  AND c.relowner = r.oid
              ) AS owns_production_table
       FROM pg_roles r
       WHERE r.rolname = current_user`
    );
    if (!role.rows[0] || role.rows[0].rolsuper || role.rows[0].rolbypassrls ||
        role.rows[0].owns_production_table) {
      throw new Error('PostgreSQL runtime role must not be a superuser, bypass RLS, or own production tables.');
    }

    await client.query(
      "SELECT set_config('app.tenant_id', $1, true)",
      [tenantId]
    );
    const authorizedTenant = await client.query(
      `SELECT id
       FROM production.tenants
       WHERE id = $1 AND status = 'approved'`,
      [tenantId]
    );
    if (authorizedTenant.rowCount !== 1) {
      throw new Error('Tenant is not approved or is unavailable.');
    }
    const result = await operation(client);
    await client.query('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'PostgreSQL transaction failed and rollback also failed.'
        );
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await getDatabasePool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
  if (migrationPool) {
    const currentPool = migrationPool;
    migrationPool = undefined;
    await currentPool.end();
  }
}

export type DatabaseQueryResult<T> = QueryResult<T>;
