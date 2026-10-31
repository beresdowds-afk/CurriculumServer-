import { PlatformAuditRecord } from '../types';

export interface EnterpriseAuditEvent extends PlatformAuditRecord {
  sequenceNumber: number;
  previousEntryHash: string;
  entryHash: string;
  signature: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
  correlationId?: string;
  redactedMetadata?: Record<string, any>;
}

export type TamperEvidentAuditEntry = EnterpriseAuditEvent;

export interface AuditLedgerIntegrityResult {
  isValid: boolean;
  totalRecords: number;
  corruptedAtSequence?: number;
  reason?: string;
  lastVerifiedHash?: string;
  lastCheckpointSequence?: number;
}

export interface AuditLogOptions {
  actor: string;
  actorRole: string;
  action: PlatformAuditRecord['action'];
  target: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING' | 'BLOCKED' | (string & {});
  details: string;
  tenantId?: string;
  tenantSchoolName?: string;
  ipAddress?: string;
  deviceMetadata?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface IServerAuditBackend {
  logPlatformAction(record: AuditLogOptions): EnterpriseAuditEvent;
  getAuditRecords(tenantId?: string): EnterpriseAuditEvent[];
  verifyLedgerIntegrity(): AuditLedgerIntegrityResult;
  queryAuditEvents(filters: {
    tenantId?: string;
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): EnterpriseAuditEvent[];
  exportAuditReport(tenantId?: string, format?: 'json' | 'csv'): string;
}

// Global server backend delegate (set by server.ts on Node startup)
let SERVER_BACKEND: IServerAuditBackend | null = null;

// In-memory fallback for browser runtime
const IN_MEMORY_LEDGER: EnterpriseAuditEvent[] = [];

/**
 * Standard pure-TS SHA-256 implementation
 * Guarantees zero Node-only external module dependencies for browser bundle
 */
function sha256Bytes(ascii: string): number[] {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number, j: number;
  const result: number[] = [];

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeClearHex = ascii + '\x80';
  while (compositeClearHex.length % 64 - 56) compositeClearHex += '\x00';
  for (i = 0; i < compositeClearHex.length; i++) {
    j = compositeClearHex.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength | 0);

  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push(b);
    }
  }
  return result;
}

export function computeSha256Hex(ascii: string): string {
  return sha256Bytes(ascii).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function computeHmacSha256Hex(keyStr: string, message: string): string {
  const blockSize = 64;
  let keyBytes: number[] = [];
  for (let i = 0; i < keyStr.length; i++) {
    keyBytes.push(keyStr.charCodeAt(i) & 0xff);
  }

  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyStr);
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }

  const oPad: number[] = [];
  const iPad: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    oPad.push(keyBytes[i] ^ 0x5c);
    iPad.push(keyBytes[i] ^ 0x36);
  }

  const innerMsg = String.fromCharCode(...iPad) + message;
  const innerHash = sha256Bytes(innerMsg);
  const outerMsg = String.fromCharCode(...oPad) + String.fromCharCode(...innerHash);
  const outerHash = sha256Bytes(outerMsg);

  return outerHash.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deterministically serializes an object with sorted keys
 */
export function canonicalDeterministicStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalDeterministicStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonicalDeterministicStringify(obj[key])).join(',') + '}';
}

/**
 * Redacts sensitive credentials (passwords, tokens, secret keys)
 */
export function redactSensitiveMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata) return {};
  const sensitivePatterns = /password|secret|token|key|credential|authorization|bearer/i;
  const cleaned: Record<string, any> = {};

  for (const [k, v] of Object.entries(metadata)) {
    if (sensitivePatterns.test(k)) {
      cleaned[k] = '[REDACTED_SENSITIVE_FIELD]';
    } else if (typeof v === 'string' && (v.length > 32 && /[a-f0-9]{32,}/i.test(v))) {
      cleaned[k] = '[REDACTED_CRYPTO_TOKEN]';
    } else if (typeof v === 'object' && v !== null) {
      cleaned[k] = redactSensitiveMetadata(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export function getAuditSigningKey(): string {
  const envKey = typeof process !== 'undefined' && process.env ? (process.env.AUDIT_CHAIN_SECRET || process.env.CONTROL_PLANE_SECRET) : undefined;
  if (!envKey || envKey.trim() === '' || envKey === 'default_insecure_secret') {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: AUDIT_CHAIN_SECRET or CONTROL_PLANE_SECRET environment variable is missing in production mode. System failing closed.');
    }
    return 'dev_insecure_audit_chain_fallback_secret_curriculum_server_2026';
  }
  return envKey;
}

export class TamperEvidentAuditService {
  /**
   * Sets the authoritative server-side storage backend (called on Node startup)
   */
  static setServerBackend(backend: IServerAuditBackend): void {
    SERVER_BACKEND = backend;
  }

  static getServerBackend(): IServerAuditBackend | null {
    return SERVER_BACKEND;
  }

  /**
   * Appends an enterprise, cryptographically hash-chained audit record
   */
  static logPlatformAction(record: AuditLogOptions | Omit<PlatformAuditRecord, 'id' | 'timestamp'>): EnterpriseAuditEvent {
    if (SERVER_BACKEND) {
      return SERVER_BACKEND.logPlatformAction(record as any);
    }

    // In-memory fallback (client-side or when backend not wired)
    const now = new Date().toISOString();
    const id = `evt_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const seq = IN_MEMORY_LEDGER.length + 1;
    const prevHash = IN_MEMORY_LEDGER.length > 0 
      ? IN_MEMORY_LEDGER[IN_MEMORY_LEDGER.length - 1].entryHash 
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const safeMeta = redactSensitiveMetadata((record as any).metadata || {});
    const canonicalPayload = {
      sequenceNumber: seq,
      previousEntryHash: prevHash,
      timestamp: now,
      actor: record.actor,
      actorRole: record.actorRole,
      action: record.action,
      target: record.target,
      result: record.result,
      details: record.details,
      tenantId: record.tenantId || 'global',
      outcome: (record as any).outcome || (record.result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE'),
      redactedMetadata: safeMeta
    };

    const canonicalSerialized = canonicalDeterministicStringify(canonicalPayload);
    const entryHash = computeSha256Hex(canonicalSerialized);
    const secret = getAuditSigningKey();
    const signature = computeHmacSha256Hex(secret, entryHash);

    const entry: EnterpriseAuditEvent = {
      ...record,
      id,
      timestamp: now,
      sequenceNumber: seq,
      previousEntryHash: prevHash,
      entryHash,
      signature,
      ipAddress: record.ipAddress || '127.0.0.1',
      deviceMetadata: record.deviceMetadata || 'Browser Client Environment',
      actorId: (record as any).actorId || record.actor,
      resourceType: (record as any).resourceType || 'general',
      resourceId: (record as any).resourceId || record.target,
      outcome: (record as any).outcome || (record.result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE'),
      reason: (record as any).reason || record.details,
      correlationId: (record as any).correlationId || `corr_${id}`,
      redactedMetadata: safeMeta
    };

    IN_MEMORY_LEDGER.push(entry);
    return entry;
  }

  static getAuditRecords(tenantId?: string): EnterpriseAuditEvent[] {
    if (SERVER_BACKEND) {
      return SERVER_BACKEND.getAuditRecords(tenantId);
    }
    const list = [...IN_MEMORY_LEDGER].reverse();
    if (tenantId) {
      return list.filter(r => r.tenantId?.toLowerCase() === tenantId.toLowerCase());
    }
    return list;
  }

  static verifyLedgerIntegrity(): AuditLedgerIntegrityResult {
    if (SERVER_BACKEND) {
      return SERVER_BACKEND.verifyLedgerIntegrity();
    }

    if (IN_MEMORY_LEDGER.length === 0) {
      return { isValid: true, totalRecords: 0 };
    }

    let expectedPrevHash = IN_MEMORY_LEDGER[0].previousEntryHash;
    const secret = getAuditSigningKey();

    for (let i = 0; i < IN_MEMORY_LEDGER.length; i++) {
      const entry = IN_MEMORY_LEDGER[i];

      if (entry.sequenceNumber !== i + 1) {
        return {
          isValid: false,
          totalRecords: IN_MEMORY_LEDGER.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Broken sequence ordering at index ${i}. Expected sequence ${i + 1} but found ${entry.sequenceNumber}. (Possible deletion or reordering)`
        };
      }

      if (entry.previousEntryHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalRecords: IN_MEMORY_LEDGER.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Hash pointer mismatch at sequence ${entry.sequenceNumber}. Previous hash does not match preceding block.`
        };
      }

      const canonicalPayload = {
        sequenceNumber: entry.sequenceNumber,
        previousEntryHash: entry.previousEntryHash,
        timestamp: entry.timestamp,
        actor: entry.actor,
        actorRole: entry.actorRole,
        action: entry.action,
        target: entry.target,
        result: entry.result,
        details: entry.details,
        tenantId: entry.tenantId || 'global',
        outcome: entry.outcome || (entry.result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE'),
        redactedMetadata: entry.redactedMetadata || {}
      };

      const calculatedHash = computeSha256Hex(canonicalDeterministicStringify(canonicalPayload));
      if (calculatedHash !== entry.entryHash) {
        return {
          isValid: false,
          totalRecords: IN_MEMORY_LEDGER.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Payload tamper detected at sequence ${entry.sequenceNumber}. Calculated hash (${calculatedHash}) does not match entry hash (${entry.entryHash}).`
        };
      }

      const expectedSig = computeHmacSha256Hex(secret, entry.entryHash);
      if (entry.signature !== expectedSig) {
        return {
          isValid: false,
          totalRecords: IN_MEMORY_LEDGER.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Cryptographic signature mismatch at sequence ${entry.sequenceNumber}. HMAC forgery detected.`
        };
      }

      expectedPrevHash = entry.entryHash;
    }

    return {
      isValid: true,
      totalRecords: IN_MEMORY_LEDGER.length,
      lastVerifiedHash: IN_MEMORY_LEDGER[IN_MEMORY_LEDGER.length - 1].entryHash
    };
  }

  static clearLedger(): void {
    IN_MEMORY_LEDGER.length = 0;
  }
}
