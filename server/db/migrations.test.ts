import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import {
  applyMigrations,
  discoverMigrations,
  inspectMigrations,
  type MigrationFile
} from './migrations';
import { DatabaseFailure, type DatabaseClient, type DatabasePool } from './postgres';

function result<R extends QueryResultRow>(rows: R[] = []): QueryResult<R> {
  return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] };
}

class MigrationMemoryPool implements DatabasePool {
  history = new Map<number, { name: string; checksum: string; status: string }>();
  executionCount = 0;
  historyExists = false;
  private lockTail: Promise<void> = Promise.resolve();

  async query<R extends QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<R>> {
    const sql = text.trim();
    if (sql.startsWith('CREATE SCHEMA')) return result<R>();
    if (sql.startsWith('CREATE TABLE IF NOT EXISTS control_plane.schema_migrations')) {
      this.historyExists = true;
      return result<R>();
    }
    if (sql.startsWith('SELECT to_regclass')) {
      return result([{ exists: this.historyExists } as unknown as R]);
    }
    if (sql.startsWith('SELECT version, checksum, status')) {
      return result([...this.history.entries()].map(([version, row]) =>
        ({ version, checksum: row.checksum, status: row.status } as unknown as R)
      ));
    }
    if (sql.startsWith('INSERT INTO control_plane.schema_migrations')) {
      const [version, name, checksum] = values as [number, string, string];
      this.history.set(version, { name, checksum, status: sql.includes("'failed'") ? 'failed' : 'running' });
      return result<R>();
    }
    if (sql.startsWith('UPDATE control_plane.schema_migrations')) {
      const [version] = values as [number];
      const migration = this.history.get(version);
      if (migration) migration.status = 'applied';
      return result<R>();
    }
    return result<R>();
  }

  async connect(): Promise<DatabaseClient> {
    let unlock: (() => void) | undefined;
    let transactionSnapshot: Map<number, { name: string; checksum: string; status: string }> | undefined;
    return {
      query: async <R extends QueryResultRow>(text: string, values: unknown[] = []) => {
        const sql = text.trim();
        if (sql.startsWith('SELECT pg_advisory_lock')) {
          const previous = this.lockTail;
          this.lockTail = new Promise<void>(resolve => { unlock = resolve; });
          await previous;
          return result<R>();
        }
        if (sql.startsWith('SELECT pg_advisory_unlock')) {
          unlock?.();
          return result<R>();
        }
        if (sql === 'BEGIN') {
          transactionSnapshot = structuredClone(this.history);
          return result<R>();
        }
        if (sql === 'COMMIT') return result<R>();
        if (sql === 'ROLLBACK') {
          if (transactionSnapshot) this.history = transactionSnapshot;
          return result<R>();
        }
        if (sql.startsWith('INSERT INTO control_plane.schema_migrations') ||
            sql.startsWith('UPDATE control_plane.schema_migrations')) {
          return this.query<R>(sql, values);
        }
        if (sql === 'FAIL') throw new Error('driver message must not escape');
        if (sql.startsWith('SELECT') && sql.includes('MIGRATION_MARKER')) {
          this.executionCount += 1;
          return result<R>();
        }
        this.executionCount += 1;
        return this.query<R>(sql, values);
      },
      release: () => {}
    };
  }

  async end(): Promise<void> {}
  on(): this { return this; }
}

function migration(version: number, name: string, sql: string): MigrationFile {
  return {
    version,
    name,
    filePath: name,
    sql,
    checksum: createHash('sha256').update(sql).digest('hex')
  };
}

test('migration discovery recognizes the preserved initial migration and sorts versions', async () => {
  const root = process.cwd();
  const discovered = await discoverMigrations(path.join(root, 'src/db/migrations'));
  assert.ok(discovered.length >= 26);
  assert.deepEqual(discovered.map(item => item.version), Array.from({ length: discovered.length }, (_, index) => index + 1));
  assert.equal(discovered[0].name, '001_initial_control_plane.sql');
  assert.equal(discovered[1].name, '002_durable_control_plane.sql');
  assert.equal(discovered[2].name, '003_tenant_relationship_integrity.sql');
  assert.equal(discovered[3].name, '004_historical_record_provenance.sql');
  assert.equal(discovered[4].name, '005_production_tenant_boundary.sql');
  assert.equal(discovered[5].name, '006_school_instance_provisioning.sql');
  assert.equal(discovered[6].name, '007_durable_school_application_provisioning.sql');
  assert.equal(discovered[8].name, '009_school_administration_domain.sql');
  assert.equal(discovered[9].name, '010_verified_database_authorization_context.sql');
  assert.equal(discovered[10].name, '011_campus_logistics_foundation.sql');
  assert.equal(discovered[11].name, '012_logistics_capacity_and_gate_idempotency.sql');
  assert.equal(discovered[12].name, '013_logistics_operational_workflows.sql');
  assert.equal(discovered[13].name, '014_central_shared_services_foundation.sql');
  assert.equal(discovered[14].name, '015_central_curriculum_and_textbooks.sql');
  assert.equal(discovered[15].name, '016_central_curriculum_and_textbook_domains.sql');
  assert.equal(discovered[16].name, '017_central_ai_gateway.sql');
  assert.equal(discovered[17].name, '018_invitation_role_and_assignment_lifecycle.sql');
  assert.equal(discovered.filter(item => item.version === 18).length, 1);
  assert.deepEqual(discovered.slice(18, 24).map(item => item.name), [
    '019_ai_gateway_execution_hardening.sql',
    '020_billing_payments_and_cloud_billing.sql',
    '021_tenant_database_storage_provisioning.sql',
    '022_tenant_provisioning_authorization.sql',
    '023_piam_verification_evidence.sql',
    '024_project_approval_notifications.sql'
  ]);
  assert.equal(discovered.filter(item => item.version === 25).length, 1);
  assert.equal(discovered[24].name, '025_teacher_academic_progress_authority.sql');
  assert.equal(discovered[25].name, '026_boarding_transport_workflows.sql');

  const directory = await mkdtemp(path.join(os.tmpdir(), 'migration-order-'));
  try {
    await writeFile(path.join(directory, '003_later.sql'), 'SELECT 3;');
    await writeFile(path.join(directory, '001_first.sql'), 'SELECT 1;');
    assert.deepEqual((await discoverMigrations(directory)).map(item => item.version), [1, 3]);
    await writeFile(path.join(directory, '001_duplicate.sql'), 'SELECT 1;');
    await assert.rejects(discoverMigrations(directory), /Duplicate migration version/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('migration runner rejects duplicate versions before executing or recording migrations', async () => {
  const pool = new MigrationMemoryPool();
  const duplicate = migration(25, '025_teacher_academic_progress_authority.sql', 'SELECT MIGRATION_MARKER;');
  await assert.rejects(applyMigrations(pool, [duplicate, duplicate]), /Duplicate migration version 25/);
  assert.equal(pool.executionCount, 0);
  assert.equal(pool.historyExists, false);
});

test('migration runner applies out-of-order input in numeric version order', async () => {
  const pool = new MigrationMemoryPool();
  await applyMigrations(pool, [
    migration(2, '002_second.sql', 'SELECT MIGRATION_MARKER;'),
    migration(1, '001_first.sql', 'SELECT MIGRATION_MARKER;')
  ]);
  assert.deepEqual([...pool.history.keys()], [1, 2]);
});

test('migration 025 executes once on a clean database and is skipped on rerun', async () => {
  const discovered = await discoverMigrations(path.join(process.cwd(), 'src/db/migrations'));
  const teacherAuthorityMigration = discovered.find(item => item.version === 25);
  assert.ok(teacherAuthorityMigration);
  const pool = new MigrationMemoryPool();

  await applyMigrations(pool, [teacherAuthorityMigration]);
  assert.equal(pool.executionCount, 1);
  assert.equal(pool.history.get(25)?.name, '025_teacher_academic_progress_authority.sql');
  assert.equal(pool.history.get(25)?.status, 'applied');

  await applyMigrations(pool, [teacherAuthorityMigration]);
  assert.equal(pool.executionCount, 1);
});

test('migration runner applies once, records status, and detects checksum changes', async () => {
  const pool = new MigrationMemoryPool();
  const first = migration(1, '001_first.sql', 'SELECT MIGRATION_MARKER;');
  assert.deepEqual(await applyMigrations(pool, [first]), [{
    version: 1, name: first.name, status: 'applied', checksum: first.checksum
  }]);
  await applyMigrations(pool, [first]);
  assert.equal(pool.executionCount, 1);
  assert.equal(pool.history.get(1)?.status, 'applied');

  const edited = migration(1, '001_first.sql', 'SELECT MIGRATION_MARKER; -- changed');
  await assert.rejects(applyMigrations(pool, [edited]), (error: unknown) =>
    error instanceof DatabaseFailure && /Checksum mismatch/.test(error.message)
  );
});

test('failed migrations roll back and remain explicitly failed', async () => {
  const pool = new MigrationMemoryPool();
  const failed = migration(2, '002_failure.sql', 'FAIL');
  await assert.rejects(applyMigrations(pool, [failed]), (error: unknown) =>
    error instanceof DatabaseFailure && error.kind === 'migration'
  );
  assert.equal(pool.history.get(2)?.status, 'failed');
  assert.doesNotMatch(pool.history.get(2)?.name || '', /secret|password/i);
});

test('concurrent migration runners serialize on the advisory lock', async () => {
  const pool = new MigrationMemoryPool();
  const item = migration(1, '001_first.sql', 'SELECT MIGRATION_MARKER;');
  await Promise.all([applyMigrations(pool, [item]), applyMigrations(pool, [item])]);
  assert.equal(pool.executionCount, 1);
});

test('migration status is read-only when history has not yet been created', async () => {
  const pool = new MigrationMemoryPool();
  const statuses = await inspectMigrations(pool, [migration(1, '001_first.sql', 'SELECT 1;')]);
  assert.equal(statuses[0].status, 'pending');
  assert.equal(pool.historyExists, false);
});
