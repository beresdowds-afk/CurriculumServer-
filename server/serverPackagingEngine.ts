import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { TenantSchoolApp } from '../src/types';

export interface TenantStoredFileItem {
  relativePath: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  contentBase64: string;
}

export interface TenantBackupPayload {
  manifest: {
    formatVersion: 'v1.4.2';
    platform: 'CurriculumServer-Enterprise-DR';
    tenantId: string;
    tenantSchoolName: string;
    createdAt: string;
    databaseTablesCount: number;
    filesCount: number;
    databaseName: string;
    storageNamespace: string;
  };
  databaseRecords: {
    tenantProfile: TenantSchoolApp;
    students: any[];
    lessonNotes: any[];
    examinations: any[];
    invoices: any[];
    entitlementFeatures: Record<string, boolean>;
    auditLogs: any[];
  };
  storageFiles: TenantStoredFileItem[];
}

const MAGIC_HEADER = Buffer.from('CF_SEC_BKUP_V142');

function getMasterEncryptionKey(): string {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.CONTROL_PLANE_SECRET || process.env.APP_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: BACKUP_ENCRYPTION_KEY or CONTROL_PLANE_SECRET must be configured for backup operations in production.');
    }
    return 'dev_insecure_fallback_secret_curriculum_server_2026_secure';
  }
  return secret;
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

export class BackupPackagingEngine {
  private static getTenantStorageDir(tenantId: string): string {
    const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = path.join(process.cwd(), 'data', 'storage', 'tenants', cleanId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const sampleReadme = path.join(dir, 'TENANT_ROOT_MANIFEST.txt');
      if (!fs.existsSync(sampleReadme)) {
        fs.writeFileSync(sampleReadme, `Tenant Storage Namespace Root for ${tenantId}\nSecurity Boundary: Enforced\nCreated: ${new Date().toISOString()}\n`);
      }
      const certDir = path.join(dir, 'certificates');
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
        fs.writeFileSync(path.join(certDir, 'school_crest_verification.json'), JSON.stringify({ verified: true, tenantId, timestamp: new Date().toISOString() }, null, 2));
      }
    }
    return dir;
  }

  static scanTenantFiles(tenantId: string): TenantStoredFileItem[] {
    const rootDir = this.getTenantStorageDir(tenantId);
    const fileItems: TenantStoredFileItem[] = [];

    function traverse(currentDir: string, relativePrefix: string) {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const relPath = relativePrefix ? `${relativePrefix}/${entry}` : entry;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          traverse(fullPath, relPath);
        } else if (stat.isFile()) {
          const content = fs.readFileSync(fullPath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          fileItems.push({
            relativePath: relPath,
            sizeBytes: content.length,
            mimeType: entry.endsWith('.json') ? 'application/json' : entry.endsWith('.txt') ? 'text/plain' : 'application/octet-stream',
            sha256: hash,
            contentBase64: content.toString('base64')
          });
        }
      }
    }

    traverse(rootDir, '');
    return fileItems;
  }

  static restoreTenantFiles(tenantId: string, files: TenantStoredFileItem[]): { restoredCount: number; errors: string[] } {
    const rootDir = this.getTenantStorageDir(tenantId);
    let restoredCount = 0;
    const errors: string[] = [];

    for (const item of files) {
      if (item.relativePath.includes('..') || path.isAbsolute(item.relativePath) || item.relativePath.includes('\0')) {
        errors.push(`Blocked dangerous path traversal attempt in backup file: ${item.relativePath}`);
        continue;
      }

      const targetPath = path.join(rootDir, item.relativePath);
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
      }

      const buffer = Buffer.from(item.contentBase64, 'base64');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      if (hash.toLowerCase() !== item.sha256.toLowerCase()) {
        errors.push(`File checksum mismatch on ${item.relativePath}: expected ${item.sha256}, got ${hash}`);
        continue;
      }

      fs.writeFileSync(targetPath, buffer, { mode: 0o600 });
      restoredCount++;
    }

    return { restoredCount, errors };
  }

  static createEncryptedArchive(payload: TenantBackupPayload): Buffer {
    const rawJson = JSON.stringify(payload);
    const compressed = zlib.gzipSync(Buffer.from(rawJson, 'utf8'), { level: 9 });

    const secret = getMasterEncryptionKey();
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveKey(secret, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, encrypted]);
  }

  static unpackEncryptedArchive(encryptedBuffer: Buffer): TenantBackupPayload {
    if (encryptedBuffer.length < 60) {
      throw new Error('Backup artifact is truncated or corrupted (insufficient header size)');
    }

    const magic = encryptedBuffer.subarray(0, 16);
    if (!magic.equals(MAGIC_HEADER)) {
      throw new Error('Invalid backup artifact format: Magic signature mismatch');
    }

    const salt = encryptedBuffer.subarray(16, 32);
    const iv = encryptedBuffer.subarray(32, 44);
    const authTag = encryptedBuffer.subarray(44, 60);
    const ciphertext = encryptedBuffer.subarray(60);

    const secret = getMasterEncryptionKey();
    const key = deriveKey(secret, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decompressed: Buffer;
    try {
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      decompressed = zlib.gunzipSync(decrypted);
    } catch (err: any) {
      throw new Error(`AUTHENTICATED_DECRYPTION_FAILED: Cryptographic authentication tag or data integrity check failed (${err.message}). The backup artifact may have been tampered with or corrupted.`);
    }

    const payload: TenantBackupPayload = JSON.parse(decompressed.toString('utf8'));
    if (!payload.manifest || !payload.databaseRecords) {
      throw new Error('MALFORMED_BACKUP_SCHEMA: Missing required manifest or databaseRecords block in restored archive.');
    }

    return payload;
  }
}
