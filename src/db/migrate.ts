import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMigrationPool, closeDatabasePool } from './pool';

const MIGRATIONS_DIRECTORY = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function ensureMigrationTable(): Promise<void> {
  await getMigrationPool().query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function migrationStatus(): Promise<{ applied: string[]; pending: string[] }> {
  const files = (await fs.readdir(MIGRATIONS_DIRECTORY))
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();
  const migrationTable = await getMigrationPool().query<{ exists: boolean }>(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists"
  );
  const appliedResult = migrationTable.rows[0].exists
    ? await getMigrationPool().query<{ version: string }>(
      'SELECT version FROM public.schema_migrations ORDER BY version'
    )
    : { rows: [] };
  const applied = appliedResult.rows.map(row => row.version);
  return {
    applied,
    pending: files.filter(file => !applied.includes(file))
  };
}

export async function runMigrations(): Promise<void> {
  const pool = getMigrationPool();
  await ensureMigrationTable();
  const { pending } = await migrationStatus();
  for (const version of pending) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIRECTORY, version), 'utf8');
    const client = await pool.connect();
    let transactionStarted = false;
    try {
      await client.query('BEGIN');
      transactionStarted = true;
      await client.query(sql);
      await client.query(
        'INSERT INTO public.schema_migrations (version) VALUES ($1)',
        [version]
      );
      await client.query('COMMIT');
      transactionStarted = false;
      console.log(`Applied migration ${version}`);
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            `Migration ${version} failed and rollback also failed.`
          );
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command !== 'up' && command !== 'status') {
    console.error('Usage: tsx src/db/migrate.ts <up|status>');
    process.exitCode = 2;
  } else {
    (command === 'up' ? runMigrations() : migrationStatus().then(status => {
      console.log(`Applied: ${status.applied.join(', ') || 'none'}`);
      console.log(`Pending: ${status.pending.join(', ') || 'none'}`);
    })).catch(error => {
      console.error(`Migration ${command} failed:`, error);
      process.exitCode = 1;
    }).finally(async () => {
      await closeDatabasePool();
    });
  }
}
