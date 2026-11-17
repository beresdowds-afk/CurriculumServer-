import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

/**
 * Mandatory PostgreSQL acceptance run. Requires explicit opt-in and a
 * disposable database; it never skips and fails if the database is unavailable.
 */
function fail(message: string): never {
  console.error(`postgres-acceptance: ${message}`);
  process.exit(1);
}

const env = process.env;
if (env.POSTGRES_ACCEPTANCE !== '1') fail('set POSTGRES_ACCEPTANCE=1 to opt in.');
if (env.DATABASE_TEST_DISPOSABLE !== '1') fail('set DATABASE_TEST_DISPOSABLE=1 to confirm the database is disposable.');
if (!env.TEST_DATABASE_URL) fail('TEST_DATABASE_URL (non-owner runtime role) is required.');
if (!env.MIGRATION_DATABASE_URL) fail('MIGRATION_DATABASE_URL (migration owner) is required.');
if (!env.CONTROL_PLANE_SECRET || env.CONTROL_PLANE_SECRET.length < 32 ||
    env.CONTROL_PLANE_SECRET === 'default_insecure_secret' ||
    env.CONTROL_PLANE_SECRET === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
  fail('a synthetic or managed CONTROL_PLANE_SECRET of at least 32 characters is required.');
}
if (env.NODE_ENV === 'production') fail('refusing to run with NODE_ENV=production.');

const hosts = [env.TEST_DATABASE_URL, env.MIGRATION_DATABASE_URL].map(value => new URL(value).hostname);
const local = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'postgres']);
if (env.POSTGRES_ACCEPTANCE_ALLOW_REMOTE !== '1' && hosts.some(host => !local.has(host))) {
  fail('database host is not local; set POSTGRES_ACCEPTANCE_ALLOW_REMOTE=1 only for a disposable remote database.');
}
if (env.TEST_DATABASE_URL === env.MIGRATION_DATABASE_URL) fail('runtime and migration URLs must use different roles.');

function run(command: string, args: string[], extra: NodeJS.ProcessEnv = {}) {
  return spawnSync(command, args, {
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
    env: { ...env, NODE_ENV: 'test', ...extra },
    shell: process.platform === 'win32'
  });
}

async function verifyRuntimeRole() {
  const client = new Client({
    connectionString: env.TEST_DATABASE_URL,
    ssl: env.TEST_DATABASE_SSLMODE === 'disable' ? false : undefined
  });
  try {
    await client.connect();
  } catch (error) {
    fail(`database unavailable: ${(error as Error).message}`);
  }
  try {
    const role = await client.query<{ rolsuper: boolean; rolbypassrls: boolean; owns: number }>(
      `SELECT r.rolsuper, r.rolbypassrls,
              (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'production' AND tableowner = current_user) AS owns
       FROM pg_roles r WHERE r.rolname = current_user`
    );
    const row = role.rows[0];
    if (row.rolsuper || row.rolbypassrls || row.owns > 0) {
      fail('runtime role must be non-owner, non-superuser and not BYPASSRLS.');
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const migrated = run('npm', ['run', 'db:migrate']);
  process.stdout.write(migrated.stdout || '');
  if (migrated.status !== 0) fail('migrations failed.');

  await verifyRuntimeRole();

  const result = run('npx', [
    'tsx', '--test',
    'server/db/postgres.integration.test.ts',
    'server/db/authorization.integration.test.ts',
    'server/db/schoolAdministration.integration.test.ts'
  ], {
    POSTGRES_ACCEPTANCE_REQUIRED: '1'
  });
  const output = result.stdout || '';
  process.stdout.write(output);
  if (result.status !== 0) fail('acceptance tests failed.');
  const count = (label: string) => Number(
    output.match(new RegExp(`(?:ℹ ${label} |# ${label} )(\\d+)`))?.[1] ?? NaN
  );
  if (count('tests') !== 3 || count('pass') !== 3 ||
      count('skipped') !== 0 || count('fail') !== 0) {
    fail('acceptance run was incomplete (tests skipped or missing).');
  }
}

main().catch(error => fail((error as Error).message));
