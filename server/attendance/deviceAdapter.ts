import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type AttendanceDeviceType = 'rfid' | 'fingerprint' | 'facial' | 'combined';
export type AttendanceVerificationMethod = 'rfid' | 'fingerprint' | 'facial' | 'combined';
export type AttendanceEventType =
  | 'school_arrival'
  | 'school_departure'
  | 'classroom_arrival'
  | 'classroom_departure'
  | 'clock_in'
  | 'clock_out';

export interface NormalizedAttendanceEvent {
  eventId: string;
  sequenceNumber?: number;
  deviceIdentity: string;
  credentialReference: string;
  verificationMethod: AttendanceVerificationMethod;
  verificationResult: 'verified' | 'failed';
  eventType: AttendanceEventType;
  location: string;
  occurredAt: string;
  payloadVersion: string;
  firmwareVersion?: string;
}

export interface AttendanceDeviceAdapter<Payload = unknown> {
  readonly vendorNeutral: true;
  readonly verifiedHardware: false;
  normalize(payload: Payload): NormalizedAttendanceEvent;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token = /^[A-Za-z0-9._:-]{1,256}$/;
const eventTypes = new Set<AttendanceEventType>([
  'school_arrival', 'school_departure', 'classroom_arrival',
  'classroom_departure', 'clock_in', 'clock_out'
]);
const methods = new Set<AttendanceVerificationMethod>(['rfid', 'fingerprint', 'facial', 'combined']);
const eventFields = new Set([
  'eventId', 'sequenceNumber', 'deviceIdentity', 'credentialReference', 'verificationMethod',
  'verificationResult', 'eventType', 'location', 'occurredAt', 'payloadVersion', 'firmwareVersion'
]);

export class CanonicalGatewayAdapter implements AttendanceDeviceAdapter {
  readonly vendorNeutral = true;
  readonly verifiedHardware = false;

  normalize(payload: unknown): NormalizedAttendanceEvent {
    return validateNormalizedAttendanceEvent(payload);
  }
}

export function validateNormalizedAttendanceEvent(value: unknown): NormalizedAttendanceEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('INVALID_ATTENDANCE_EVENT');
  }
  const event = value as Partial<NormalizedAttendanceEvent>;
  if (Object.keys(value).some(key => !eventFields.has(key)) ||
      typeof event.eventId !== 'string' || !uuid.test(event.eventId) ||
      typeof event.deviceIdentity !== 'string' || !token.test(event.deviceIdentity) ||
      typeof event.credentialReference !== 'string' ||
      !token.test(event.credentialReference || '') || !methods.has(event.verificationMethod as AttendanceVerificationMethod) ||
      !eventTypes.has(event.eventType as AttendanceEventType) ||
      !['verified', 'failed'].includes(event.verificationResult || '') ||
      typeof event.location !== 'string' || !event.location.trim() || event.location.length > 200 ||
      typeof event.payloadVersion !== 'string' || !token.test(event.payloadVersion) ||
      (event.sequenceNumber !== undefined &&
        (!Number.isSafeInteger(event.sequenceNumber) || event.sequenceNumber < 0)) ||
      (event.firmwareVersion !== undefined &&
        (typeof event.firmwareVersion !== 'string' || !token.test(event.firmwareVersion)))) {
    throw new Error('INVALID_ATTENDANCE_EVENT');
  }
  const timestamp = typeof event.occurredAt === 'string'
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(event.occurredAt)
    : null;
  if (!timestamp) {
    throw new Error('INVALID_ATTENDANCE_EVENT');
  }
  const [, year, month, day, hour, minute, second] = timestamp.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (year < 1970 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour ||
      calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second) {
    throw new Error('INVALID_ATTENDANCE_EVENT');
  }
  const occurredAt = Date.parse(event.occurredAt);
  if (!Number.isFinite(occurredAt)) throw new Error('INVALID_ATTENDANCE_EVENT');
  return { ...event, occurredAt: new Date(occurredAt).toISOString() } as NormalizedAttendanceEvent;
}

export function attendanceRequestSigningMessage(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: Buffer | string;
}): string {
  const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
  return [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    createHash('sha256').update(body).digest('hex')
  ].join('\n');
}

export function signAttendanceDeviceRequest(
  secret: string,
  input: Parameters<typeof attendanceRequestSigningMessage>[0]
): string {
  return createHmac('sha256', secret).update(attendanceRequestSigningMessage(input)).digest('hex');
}

export function verifyAttendanceDeviceRequest(input: {
  secret: string;
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: Buffer | string;
  signature: string;
  now?: number;
  maximumClockDriftMs?: number;
}): boolean {
  const timestamp = Number(input.timestamp);
  const drift = input.maximumClockDriftMs ?? 5 * 60_000;
  if (!Number.isSafeInteger(timestamp) || Math.abs((input.now ?? Date.now()) - timestamp) > drift ||
      !uuid.test(input.nonce) || !/^[0-9a-f]{64}$/.test(input.signature) ||
      typeof input.secret !== 'string' || input.secret.length < 32) return false;
  const expected = Buffer.from(signAttendanceDeviceRequest(input.secret, input));
  const supplied = Buffer.from(input.signature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
