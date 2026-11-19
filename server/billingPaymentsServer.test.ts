import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { test } from 'node:test';

test('service remains live but unavailable when the database is not configured', async () => {
  for (const key of ['DATABASE_URL', 'PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
    delete process.env[key];
  }
  const { createBillingPaymentsApp } = await import('./billingPaymentsServer');
  const server = createBillingPaymentsApp().listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const get = (path: string) => new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: address.port, path }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode || 0, body: JSON.parse(body) }));
      }).on('error', reject);
    });
    assert.equal((await get('/healthz')).status, 200);
    const readiness = await get('/readyz');
    assert.equal(readiness.status, 503);
    assert.equal(readiness.body.financialReadiness, 'unverified');
    const request = await get('/api/v1/server/payments/transactions');
    assert.equal(request.status, 503);
    assert.equal(request.body.code, 'BILLING_PAYMENTS_UNAVAILABLE');
  } finally {
    server.close();
  }
});
