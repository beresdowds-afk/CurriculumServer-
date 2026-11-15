import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import { inspectPlatformReadiness } from './readiness';
import type { DatabasePool } from './postgres';

test('database readiness never reports success when configuration is absent', async () => {
  const readiness = await inspectPlatformReadiness(undefined, false, 'configuration_missing');
  assert.equal(readiness.alive, true);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.database.configured, false);
  assert.equal(readiness.database.connectionVerified, false);
  assert.equal(readiness.database.error, 'configuration_missing');
  assert.equal(readiness.provisioning.executionAvailable, false);
});

test('database readiness preserves authentication failures without exposing driver text', async () => {
  const pool: DatabasePool = {
    query: async <R extends QueryResultRow>(): Promise<QueryResult<R>> => {
      throw Object.assign(new Error('password value must not escape'), { code: '28P01' });
    },
    connect: async () => { throw new Error('not used'); },
    end: async () => {},
    on() { return this; }
  };
  const readiness = await inspectPlatformReadiness(pool, true);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.database.configured, true);
  assert.equal(readiness.database.connectionVerified, false);
  assert.equal(readiness.database.error, 'authentication');
  assert.equal(JSON.stringify(readiness).includes('password value'), false);
});
