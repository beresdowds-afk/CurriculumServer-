import assert from 'node:assert/strict';
import test from 'node:test';
import { TraccarGpsAdapter, TraccarGpsError } from './traccarGpsAdapter';

const now = new Date('2026-11-20T12:00:00.000Z');
const configuration = {
  baseUrl: 'https://tracking.example.test',
  apiToken: 'provider-api-token',
  maxTelemetryAgeSeconds: 300
};

test('Traccar configuration requires HTTPS and a configured provider token', () => {
  assert.throws(() => new TraccarGpsAdapter({ ...configuration, baseUrl: 'http://tracking.example.test' }),
    (error: unknown) => error instanceof TraccarGpsError && error.code === 'INVALID_PROVIDER_CONFIGURATION');
  assert.throws(() => new TraccarGpsAdapter({ ...configuration, apiToken: '' }),
    (error: unknown) => error instanceof TraccarGpsError && error.code === 'PROVIDER_NOT_CONFIGURED');
});

test('Traccar device verification binds provider id to the configured device identity', async () => {
  const adapter = new TraccarGpsAdapter(configuration, async (input, init) => {
    assert.equal(new URL(String(input)).pathname, '/api/devices/42');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer provider-api-token');
    return Response.json({ id: 42, uniqueId: 'IMEI-00042', disabled: false });
  }, () => now);
  assert.deepEqual(await adapter.verifyDevice(42, 'IMEI-00042'), {
    id: 42, uniqueId: 'IMEI-00042', disabled: false
  });
  await assert.rejects(adapter.verifyDevice(42, 'different-device'),
    (error: unknown) => error instanceof TraccarGpsError && error.code === 'DEVICE_NOT_VERIFIED');
});

test('Traccar returns only fresh, valid provider telemetry for the verified device', async () => {
  const adapter = new TraccarGpsAdapter(configuration, async input => {
    assert.match(String(input), /\/api\/positions\?deviceId=42$/);
    return Response.json([
      {
        id: 1, deviceId: 7, latitude: 0, longitude: 0, valid: true,
        fixTime: now.toISOString(), serverTime: now.toISOString()
      },
      {
        id: 2, deviceId: 42, latitude: 6.45, longitude: 3.39, valid: true,
        fixTime: new Date(now.getTime() - 10_000).toISOString(),
        serverTime: now.toISOString(), speed: 0
      }
    ]);
  }, () => now);
  const position = await adapter.latestPosition(42);
  assert.equal(position.deviceId, 42);
  assert.equal(position.latitude, 6.45);
  assert.equal(position.longitude, 3.39);
  assert.equal(position.speed, 0);

  const noFix = new TraccarGpsAdapter(configuration, async () =>
    Response.json([{ id: 3, deviceId: 42, latitude: 0, longitude: 0, valid: false,
      fixTime: now.toISOString(), serverTime: now.toISOString() }]), () => now);
  await assert.rejects(noFix.latestPosition(42),
    (error: unknown) => error instanceof TraccarGpsError && error.code === 'NO_VERIFIED_TELEMETRY');

  const stale = new TraccarGpsAdapter(configuration, async () =>
    Response.json([{ id: 4, deviceId: 42, latitude: 6.45, longitude: 3.39, valid: true,
      fixTime: new Date(now.getTime() - 301_000).toISOString(), serverTime: now.toISOString() }]), () => now);
  await assert.rejects(stale.latestPosition(42),
    (error: unknown) => error instanceof TraccarGpsError && error.code === 'STALE_TELEMETRY');
});
