import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  CanonicalGatewayAdapter,
  signAttendanceDeviceRequest,
  validateNormalizedAttendanceEvent,
  verifyAttendanceDeviceRequest
} from './deviceAdapter';

const request: { method: string; path: string; timestamp: string; nonce: string; body: string } = {
  method: 'POST',
  path: '/api/v1/attendance/device-events',
  timestamp: String(Date.now()),
  nonce: randomUUID(),
  body: JSON.stringify({ eventId: randomUUID() })
};
const secret = 'a'.repeat(48);

test('validates and canonicalizes normalized device events', () => {
  const event = validateNormalizedAttendanceEvent({
    eventId: randomUUID(),
    sequenceNumber: 7,
    deviceIdentity: 'school-gate-01',
    credentialReference: 'credential-hash-reference',
    verificationMethod: 'rfid',
    verificationResult: 'verified',
    eventType: 'school_arrival',
    location: 'north-gate',
    occurredAt: '2026-01-02T08:00:00+01:00',
    payloadVersion: '1',
    firmwareVersion: 'unknown'
  });
  assert.equal(event.occurredAt, '2026-01-02T07:00:00.000Z');
  assert.throws(() => validateNormalizedAttendanceEvent({ ...event, eventType: 'unknown' }));
  assert.throws(() => validateNormalizedAttendanceEvent({ ...event, photo: 'raw-biometric-image' }));
  assert.throws(() => validateNormalizedAttendanceEvent({ ...event, occurredAt: '2026-01-02T08:00:00' }));
  assert.throws(() => validateNormalizedAttendanceEvent({ ...event, occurredAt: '2026-02-30T08:00:00Z' }));
  assert.deepEqual(new CanonicalGatewayAdapter().normalize(event), event);
});

test('authenticates signed requests and rejects body changes, stale timestamps, and nonce errors', () => {
  const signature = signAttendanceDeviceRequest(secret, request);
  const verify = (overrides: Partial<typeof request & { signature: string }> = {}) =>
    verifyAttendanceDeviceRequest({ secret, ...request, signature, now: Number(request.timestamp), ...overrides });
  assert.equal(verify(), true);
  assert.equal(verify({ body: 'changed' }), false);
  assert.equal(verify({ timestamp: String(Number(request.timestamp) - 600_001) }), false);
  assert.equal(verify({ nonce: 'reused-nonce' }), false);
});
