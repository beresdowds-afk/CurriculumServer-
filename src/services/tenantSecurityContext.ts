import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const VIOLATIONS_FILE_PATH = path.join(process.cwd(), 'data', 'security_violations.json');

function loadPersistentViolations(): SecurityViolationEvent[] {
  try {
    if (fs.existsSync(VIOLATIONS_FILE_PATH)) {
      const content = fs.readFileSync(VIOLATIONS_FILE_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load persistent security violations:', e);
  }
  return [];
}

function savePersistentViolations(violations: SecurityViolationEvent[]): void {
  try {
    const dir = path.dirname(VIOLATIONS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const trimmed = violations.slice(0, 5000);
    fs.writeFileSync(VIOLATIONS_FILE_PATH, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save persistent security violations:', e);
  }
}

/**
  * Retrieves control plane secret from environment configuration.
  * Fails closed in production if mandatory secret is missing or insecure.
  */
function getControlPlaneSecret(): string {
  const secret = process.env.CONTROL_PLANE_SECRET || process.env.JWT_SECRET || process.env.APP_SECRET;
  if (!secret || secret.trim() === '' || secret === 'default_insecure_secret') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: CONTROL_PLANE_SECRET environment variable is missing or insecure in production mode. System failing closed.');
    }
    return 'dev_insecure_fallback_secret_curriculum_server_2026_secure';
  }
  return secret;
}

function hmacSha256(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export class TenantSecurityContextManager {
  /**
    * Issues a cryptographically signed, tamper-resistant Tenant Security Context Token using HMAC-SHA256.
    */
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
      role: role,
      issuedAt: now,
      expiresAt: now + ttlSeconds
    };

    const secret = getControlPlaneSecret();
    const serialized = JSON.stringify(payload);
    const encoded = Buffer.from(serialized).toString('base64');
    const signature = hmacSha256(secret, encoded);
    return `${encoded}.${signature}`;
  }

  /**
    * Validates a Tenant Token and reconstructs the verified Security Context using constant-time cryptographic verification.
    */
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

      const serialized = Buffer.from(encoded, 'base64').toString('utf8');
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

  /**
    * Enforces strict tenant isolation. If a request is issued with Context Tenant A
    * but attempts to read/write resource belonging to Tenant B, it is immediately blocked and logged.
    */
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

  /**
    * Sanitizes storage file paths and strictly verifies that path traversal ('..', '//', null-bytes) cannot escape tenant boundary
    */
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

  /**
    * Records a security violation in the durable control-plane audit ledger
    */
  static recordViolation(violation: Omit<SecurityViolationEvent, 'id' | 'timestamp'>): SecurityViolationEvent {
    const event: SecurityViolationEvent = {
      ...violation,
      id: `sec_viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    const violations = loadPersistentViolations();
    violations.unshift(event);
    savePersistentViolations(violations);

    console.warn(`[SECURITY VIOLATION BLOCKED] ${event.violationType}: Tenant ${event.sourceTenantId} -> ${event.endpoint} (${event.payloadSummary})`);
    return event;
  }

  /**
    * Retrieves all recorded security violation events from durable persistent storage
    */
  static getSecurityViolations(): SecurityViolationEvent[] {
    return loadPersistentViolations();
  }

  /**
    * Clears violation log (primarily for testing suites)
    */
  static clearViolations(): void {
    try {
      if (fs.existsSync(VIOLATIONS_FILE_PATH)) {
        fs.unlinkSync(VIOLATIONS_FILE_PATH);
      }
    } catch (e) {
      console.error('Failed to clear violations:', e);
    }
  }
}
