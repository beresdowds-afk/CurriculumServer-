import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseClient, DatabasePool } from './postgres';
import { DatabaseFailure, inTransaction } from './postgres';

const ADVISORY_LOCK_KEY = 1_940_861_112;
const HISTORY_TABLE = 'control_plane.schema_migrations';
const MIGRATION_PATTERN = /^(\d{3,})_[a-z0-9_]+\.sql$/;

export interface MigrationFile {
  version: number;
  name: string;
  filePath: string;
  checksum: string;
  sql: string;
}

export interface MigrationStatus {
  version: number;
  name: string;
  status: 'pending' | 'applied' | 'failed';
  checksum: string;
}

export async function discoverMigrations(directory: string): Promise<MigrationFile[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && MIGRATION_PATTERN.test(entry.name))
    .map(entry => {
      const match = MIGRATION_PATTERN.exec(entry.name)!;
      return { version: Number(match[1]), name: entry.name, filePath: path.join(directory, entry.name) };
    })
    .sort((left, right) => left.version - right.version);

  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].version === entries[index].version) {
      throw new DatabaseFailure('migration', `Duplicate migration version ${entries[index].version}.`);
    }
  }
  return Promise.all(entries.map(async entry => {
    const sql = await readFile(entry.filePath, 'utf8');
    return {
      ...entry,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex')
    };
  }));
}

async function ensureHistoryTable(pool: DatabasePool): Promise<void> {
  await pool.query('CREATE SCHEMA IF NOT EXISTS control_plane');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
      version BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum CHAR(64) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('running', 'applied', 'failed')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      executed_at TIMESTAMPTZ,
      duration_ms BIGINT,
      error_message TEXT
    )
  `);
}

async function readHistory(pool: DatabasePool): Promise<Map<number, { checksum: string; status: string }>> {
  const result = await pool.query<{ version: string; checksum: string; status: string }>(
    `SELECT version, checksum, status FROM ${HISTORY_TABLE}`
  );
  return new Map(result.rows.map(row => [
    Number(row.version),
    { checksum: row.checksum.trim(), status: row.status }
  ]));
}

export async function inspectMigrations(
  pool: DatabasePool,
  migrations: MigrationFile[]
): Promise<MigrationStatus[]> {
  const historyExists = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('${HISTORY_TABLE}') IS NOT NULL AS exists`
  );
  const history = historyExists.rows[0]?.exists ? await readHistory(pool) : new Map();
  return migrations.map(migration => {
    const applied = history.get(migration.version);
    if (applied?.status === 'applied' && applied.checksum !== migration.checksum) {
      throw new DatabaseFailure('migration', `Checksum mismatch for applied migration ${migration.name}.`);
    }
    return {
      version: migration.version,
      name: migration.name,
      status: applied?.status === 'applied' ? 'applied' : applied?.status === 'failed' ? 'failed' : 'pending',
      checksum: migration.checksum
    };
  });
}

export async function applyMigrations(
  pool: DatabasePool,
  migrations: MigrationFile[],
  options: { dryRun?: boolean } = {}
): Promise<MigrationStatus[]> {
  if (options.dryRun) return inspectMigrations(pool, migrations);
  const lockClient: DatabaseClient = await pool.connect();
  let locked = false;
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    locked = true;
    await ensureHistoryTable(pool);
    let history = await readHistory(pool);
    for (const migration of migrations) {
      const applied = history.get(migration.version);
      if (applied?.status === 'applied') {
        if (applied.checksum !== migration.checksum) {
          throw new DatabaseFailure('migration', `Checksum mismatch for applied migration ${migration.name}.`);
        }
        continue;
      }

      const startedAt = Date.now();
      try {
        await inTransaction(pool, async client => {
          await client.query(
            `INSERT INTO ${HISTORY_TABLE} (version, name, checksum, status, started_at, executed_at, duration_ms, error_message)
             VALUES ($1, $2, $3, 'running', now(), NULL, NULL, NULL)
             ON CONFLICT (version) DO UPDATE SET
               name = EXCLUDED.name, checksum = EXCLUDED.checksum, status = 'running',
               started_at = now(), executed_at = NULL, duration_ms = NULL, error_message = NULL`,
            [migration.version, migration.name, migration.checksum]
          );
          await client.query(migration.sql);
          await client.query(
            `UPDATE ${HISTORY_TABLE}
             SET status = 'applied', executed_at = now(), duration_ms = $2
             WHERE version = $1`,
            [migration.version, Date.now() - startedAt]
          );
        });
      } catch {
        const safeMessage = `Migration ${migration.name} failed; inspect PostgreSQL migration logs without exposing credentials.`;
        try {
          await pool.query(
            `INSERT INTO ${HISTORY_TABLE} (version, name, checksum, status, started_at, executed_at, duration_ms, error_message)
             VALUES ($1, $2, $3, 'failed', $4, now(), $5, $6)
             ON CONFLICT (version) DO UPDATE SET status = 'failed', started_at = EXCLUDED.started_at,
               executed_at = now(), duration_ms = EXCLUDED.duration_ms, error_message = EXCLUDED.error_message`,
            [migration.version, migration.name, migration.checksum, new Date(startedAt),
              Date.now() - startedAt, safeMessage]
          );
        } catch {
          // Preserve the migration failure as the primary error.
        }
        throw new DatabaseFailure('migration', safeMessage);
      }
      history.set(migration.version, { checksum: migration.checksum, status: 'applied' });
    }
    return inspectMigrations(pool, migrations);
  } finally {
    if (locked) {
      try {
        await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
      } finally {
        lockClient.release();
      }
    } else {
      lockClient.release();
    }
  }
}
