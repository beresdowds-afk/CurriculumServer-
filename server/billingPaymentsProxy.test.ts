import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mock, test } from 'node:test';
import express from 'express';
import { proxyBillingPaymentsRequest } from './billingPaymentsProxy';

test('proxy sends raw webhook and signature through authenticated Cloud Run invocation', async () => {
  const previous = process.env.BILLING_PAYMENTS_SERVICE_URL;
  process.env.BILLING_PAYMENTS_SERVICE_URL = 'https://billing.example.test';
  const fetchMock = mock.method(globalThis, 'fetch', async (input, init) => {
    if (String(input).startsWith('http://metadata.google.internal/')) {
      return new Response('identity-token');
    }
    assert.equal(String(input), 'https://billing.example.test/api/v1/server/payments/webhook/paystack');
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers['X-Serverless-Authorization'], 'Bearer identity-token');
    assert.equal(headers['x-paystack-signature'], 'signature');
    assert.equal(headers['X-Correlation-ID'], 'safe-id');
    assert.equal(headers['x-unrelated-secret'], undefined);
    assert.deepEqual(init?.body, Buffer.from('{ "data": 1 }'));
    assert.equal(init?.redirect, 'error');
    return new Response('{"received":true}', { status: 200 });
  });
  const app = express();
  app.use(express.raw({ type: 'application/json' }));
  app.post('/webhook', (req, res) => {
    Object.assign(req, { correlationId: 'safe-id' });
    void proxyBillingPaymentsRequest(req, res, '/api/v1/server/payments/webhook/paystack', req.body);
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const status = await new Promise<number>((resolve, reject) => {
      const request = http.request({
        host: '127.0.0.1', port: address.port, path: '/webhook', method: 'POST',
        headers: {
          'content-type': 'application/json', 'x-paystack-signature': 'signature',
          'x-unrelated-secret': 'must-not-forward'
        }
      }, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode || 0));
      });
      request.on('error', reject);
      request.end('{ "data": 1 }');
    });
    assert.equal(status, 200);
    assert.equal(fetchMock.mock.callCount(), 2);
  } finally {
    server.close();
    fetchMock.mock.restore();
    if (previous === undefined) delete process.env.BILLING_PAYMENTS_SERVICE_URL;
    else process.env.BILLING_PAYMENTS_SERVICE_URL = previous;
  }
});
