import { discoverMigrations, applyMigrations, inspectMigrations } from './migrations';
import { postgresRuntime } from './postgres';

async function main(): Promise<void> {
  const command = process.argv[2] || 'status';
  const dryRun = process.argv.includes('--dry-run');
  const pool = postgresRuntime.getPool();
  const migrations = await discoverMigrations(
    process.env.MIGRATIONS_DIR || `${process.cwd()}/src/db/migrations`
  );

  if (command === 'up') {
    const status = await applyMigrations(pool, migrations, { dryRun });
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
  .finally(async () => postgresRuntime.close());
