import { TenantSchoolApp } from '../types';

export interface TenantSecurityContext {
  tenantId: string;
  appId: string;
  schoolName: string;
  subscriptionTier: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PENDING' | 'DECOMMISSIONED';
  databaseName: string;
  storageNamespace: string;
  issuer: string;
  audience: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  tokenSignature: string;
  permissions: string[];
  email?: string;
}

export interface SecurityViolationEvent {
  id: string;
  timestamp: string;
  violationType: 
    | 'CROSS_TENANT_ACCESS_ATTEMPT' 
    | 'PATH_TRAVERSAL_ATTEMPT' 
    | 'EXPIRED_TOKEN' 
    | 'INVALID_SIGNATURE' 
    | 'SUSPENDED_TENANT_ACCESS' 
    | 'UNAUTHORIZED_FEATURE_ACCESS'
    | 'HEADER_SPOOFING_ATTEMPT';
  sourceTenantId: string;
  targetTenantId?: string;
  actorIp: string;
  endpoint: string;
  payloadSummary: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blocked: boolean;
}

const MEMORY_VIOLATIONS: SecurityViolationEvent[] = [];

function getControlPlaneSecret(): string {
  const envSecret = typeof process !== 'undefined' && process.env ? (process.env.CONTROL_PLANE_SECRET || process.env.JWT_SECRET || process.env.APP_SECRET) : undefined;
  if (!envSecret || envSecret.trim() === '' || envSecret === 'default_insecure_secret') {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: CONTROL_PLANE_SECRET environment variable is missing or insecure in production mode. System failing closed.');
    }
    return 'dev_insecure_fallback_secret_curriculum_server_2026_secure';
  }
  return envSecret;
}

/**
 * Standard pure-TS SHA-256 and HMAC implementation
 * Works identically in browser and Node without importing externalized modules
 */
function sha256(ascii: string): number[] {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i: number, j: number;
  let result: number[] = [];

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

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
  while (compositeClearHex[lengthProperty] % 64 - 56) compositeClearHex += '\x00';
  for (i = 0; i < compositeClearHex[lengthProperty]; i++) {
    j = compositeClearHex.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);

  for (j = 0; j < words[lengthProperty];) {
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

function hmacSha256(keyStr: string, message: string): string {
  const blockSize = 64;
  let keyBytes: number[] = [];
  for (let i = 0; i < keyStr.length; i++) {
    keyBytes.push(keyStr.charCodeAt(i) & 0xff);
  }

  if (keyBytes.length > blockSize) {
    keyBytes = sha256(keyStr);
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
  const innerHash = sha256(innerMsg);
  const outerMsg = String.fromCharCode(...oPad) + String.fromCharCode(...innerHash);
  const outerHash = sha256(outerMsg);

  return outerHash.map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function encodeBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return Buffer.from(str, 'utf8').toString('base64');
}

function decodeBase64(str: string): string {
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(str)));
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

export class TenantSecurityContextManager {
  static issueTenantToken(tenant: TenantSchoolApp, role: string = 'tenant_admin', ttlSeconds: number = 86400): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      tenantId: tenant.id,
      appId: tenant.appId || `CF-${tenant.id}`,
      schoolName: tenant.schoolName,
      subscriptionTier: tenant.subscriptionTier,
      status: tenant.status === 'active' ? 'ACTIVE' : tenant.status === 'suspended' ? 'SUSPENDED' : 'PENDING',
      databaseName: `db_${tenant.id.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      storageNamespace: `/storage/tenants/${tenant.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      issuer: 'CurriculumServer-ControlPlane',
      audience: tenant.id,
      role,
      issuedAt: now,
      expiresAt: now + ttlSeconds
    };

    const secret = getControlPlaneSecret();
    const serialized = JSON.stringify(payload);
    const encoded = encodeBase64(serialized);
    const signature = hmacSha256(secret, encoded);
    return `${encoded}.${signature}`;
  }

  static verifyTenantToken(token: string): { valid: boolean; context?: TenantSecurityContext; error?: string } {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { valid: false, error: 'Malformed tenant security token structure' };
    }

    const [encoded, signature] = token.split('.');
    try {
      const secret = getControlPlaneSecret();
      const expectedSignature = hmacSha256(secret, encoded);

      if (!safeCompare(signature, expectedSignature)) {
        this.recordViolation({
          violationType: 'INVALID_SIGNATURE',
          sourceTenantId: 'UNKNOWN',
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Tampered token signature detected via cryptographic verification',
          severity: 'HIGH',
          blocked: true
        });
        return { valid: false, error: 'Cryptographic signature mismatch. Token has been tampered with or signed with invalid secret.' };
      }

      const serialized = decodeBase64(encoded);
      const payload = JSON.parse(serialized);
      const now = Math.floor(Date.now() / 1000);

      if (payload.expiresAt < now) {
        this.recordViolation({
          violationType: 'EXPIRED_TOKEN',
          sourceTenantId: payload.tenantId || 'UNKNOWN',
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Expired token presented',
          severity: 'MEDIUM',
          blocked: true
        });
        return { valid: false, error: 'Tenant security token has expired.' };
      }

      if (payload.status === 'SUSPENDED') {
        this.recordViolation({
          violationType: 'SUSPENDED_TENANT_ACCESS',
          sourceTenantId: payload.tenantId,
          actorIp: '127.0.0.1',
          endpoint: '/api/v1/*',
          payloadSummary: 'Access attempted on suspended tenant',
          severity: 'HIGH',
          blocked: true
        });
        return { valid: false, error: 'Tenant application is SUSPENDED due to administrative or billing hold.' };
      }

      return {
        valid: true,
        context: {
          ...payload,
          tokenSignature: signature,
          permissions: payload.role === 'super_admin' ? ['read', 'write', 'super_admin', 'control_plane'] : ['read', 'write', 'execute_ai', 'exam_generation']
        }
      };
    } catch (e: any) {
      return { valid: false, error: `Token decoding failed: ${e.message}` };
    }
  }

  static assertTenantBoundary(context: TenantSecurityContext, resourceTenantId: string, endpoint: string = ''): boolean {
    if (!context || !context.tenantId) {
      this.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: 'ANONYMOUS',
        targetTenantId: resourceTenantId,
        actorIp: '127.0.0.1',
        endpoint,
        payloadSummary: 'Missing security context on tenant-scoped resource',
        severity: 'CRITICAL',
        blocked: true
      });
      return false;
    }

    const cleanSource = context.tenantId.trim().toLowerCase();
    const cleanTarget = resourceTenantId.trim().toLowerCase();

    if (cleanSource !== cleanTarget) {
      this.recordViolation({
        violationType: 'CROSS_TENANT_ACCESS_ATTEMPT',
        sourceTenantId: cleanSource,
        targetTenantId: cleanTarget,
        actorIp: '127.0.0.1',
        endpoint,
        payloadSummary: `Cross-tenant access attempt: Tenant ${cleanSource} tried accessing resources of Tenant ${cleanTarget}`,
        severity: 'CRITICAL',
        blocked: true
      });
      return false;
    }

    return true;
  }

  static sanitizeAndResolveStoragePath(context: TenantSecurityContext, relativePath: string): { safe: boolean; fullPath?: string; error?: string } {
    if (!relativePath || relativePath.includes('..') || relativePath.includes('\0')) {
      this.recordViolation({
        violationType: 'PATH_TRAVERSAL_ATTEMPT',
        sourceTenantId: context.tenantId,
        actorIp: '127.0.0.1',
        endpoint: '/api/v1/storage/*',
        payloadSummary: `Directory traversal sequence detected: ${relativePath}`,
        severity: 'CRITICAL',
        blocked: true
      });
      return { safe: false, error: 'Directory path traversal attempt detected and blocked.' };
    }

    const cleanRelative = relativePath.replace(/^[\/\\]+/, '');
    const fullPath = `${context.storageNamespace}/${cleanRelative}`;
    return { safe: true, fullPath };
  }

  static recordViolation(violation: Omit<SecurityViolationEvent, 'id' | 'timestamp'>): SecurityViolationEvent {
    const event: SecurityViolationEvent = {
      ...violation,
      id: `sec_viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    MEMORY_VIOLATIONS.unshift(event);
    if (MEMORY_VIOLATIONS.length > 500) {
      MEMORY_VIOLATIONS.pop();
    }

    console.warn(`[SECURITY VIOLATION BLOCKED] ${event.violationType}: Tenant ${event.sourceTenantId} -> ${event.endpoint} (${event.payloadSummary})`);
    return event;
  }

  static getSecurityViolations(): SecurityViolationEvent[] {
    return [...MEMORY_VIOLATIONS];
  }

  static clearViolations(): void {
    MEMORY_VIOLATIONS.length = 0;
  }
}
