import { discoverMigrations, applyMigrations, inspectMigrations } from './migrations';
import { PostgresRuntime } from './postgres';

const migrationEnvironment: NodeJS.ProcessEnv = { ...process.env };
if (migrationEnvironment.MIGRATION_DATABASE_URL) {
  migrationEnvironment.DATABASE_URL = migrationEnvironment.MIGRATION_DATABASE_URL;
  for (const name of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSSLMODE']) {
    delete migrationEnvironment[name];
  }
}
const migrationRuntime = new PostgresRuntime(migrationEnvironment);

async function main(): Promise<void> {
  const command = process.argv[2] || 'status';
  const dryRun = process.argv.includes('--dry-run');
  const pool = migrationRuntime.getPool();
  const migrations = await discoverMigrations(
    process.env.MIGRATIONS_DIR || `${process.cwd()}/src/db/migrations`
  );

  if (command === 'up') {
    const status = await applyMigrations(pool, migrations, { dryRun });
    const contextKeyTable = await pool.query<{ exists: boolean }>(
      `SELECT to_regclass('control_plane.authorization_context_keys') IS NOT NULL AS exists`
    );
    const signingSecret = process.env.CONTROL_PLANE_SECRET || '';
    if (!dryRun && contextKeyTable.rows[0]?.exists && signingSecret.length >= 32 &&
        signingSecret !== 'default_insecure_secret' &&
        signingSecret !== 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
      await pool.query(
        `INSERT INTO control_plane.authorization_context_keys (key_name, key_value)
         VALUES ('authorization_context', $1)
         ON CONFLICT (key_name) DO UPDATE
         SET key_value = EXCLUDED.key_value, updated_at = now()`,
        [Buffer.from(signingSecret, 'utf8')]
      );
    } else if (!dryRun && contextKeyTable.rows[0]?.exists) {
      console.warn('Database authorization context key is not configured; protected readiness will remain unavailable.');
    }
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  if (command === 'status') {
    const status = await inspectMigrations(pool, migrations);
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  throw new Error('Supported migration commands are: up, status.');
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Database migration failed.');
    process.exitCode = 1;
  })
  .finally(async () => migrationRuntime.close());
