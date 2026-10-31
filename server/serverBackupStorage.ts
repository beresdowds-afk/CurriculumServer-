import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageArtifactMetadata {
  storageLocation: string;
  bytesWritten: number;
  sizeMb: number;
  checksumSha256: string;
  createdAt: string;
  provider: 'local_durable' | 'gcs_encrypted' | 's3_encrypted';
}

export interface IBackupStorageProvider {
  writeArtifact(tenantId: string, snapshotId: string, dataBuffer: Buffer): Promise<StorageArtifactMetadata>;
  readArtifact(storageLocationOrSnapshotId: string): Promise<Buffer>;
  deleteArtifact(storageLocation: string): Promise<boolean>;
  verifyArtifact(storageLocation: string, expectedChecksum: string): Promise<{ valid: boolean; actualChecksum: string; sizeBytes: number }>;
  listArtifacts(tenantId?: string): Promise<string[]>;
}

export class DurableDiskBackupStorageProvider implements IBackupStorageProvider {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || process.env.BACKUP_STORAGE_DIR || path.join(process.cwd(), 'data', 'backups', 'artifacts');
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    }
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private getTenantArtifactDir(tenantId: string): string {
    const cleanTenant = this.sanitizeId(tenantId);
    const dir = path.join(this.baseDir, cleanTenant);
    this.ensureDirectory(dir);
    return dir;
  }

  private resolveArtifactPath(locationOrId: string): string {
    if (locationOrId.includes('/') || locationOrId.includes('\\')) {
      const normalized = path.normalize(locationOrId.replace(/^s3:\/\/|^gcs:\/\/|^file:\/\//, ''));
      if (normalized.startsWith(this.baseDir)) {
        return normalized;
      }
      const candidate = path.join(this.baseDir, normalized);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      return locationOrId;
    }

    if (fs.existsSync(this.baseDir)) {
      const subdirs = fs.readdirSync(this.baseDir);
      for (const subdir of subdirs) {
        const fullSubdir = path.join(this.baseDir, subdir);
        if (fs.statSync(fullSubdir).isDirectory()) {
          const files = fs.readdirSync(fullSubdir);
          for (const file of files) {
            if (file.includes(this.sanitizeId(locationOrId))) {
              return path.join(fullSubdir, file);
            }
          }
        }
      }
    }
    return path.join(this.baseDir, `${this.sanitizeId(locationOrId)}.tar.gz.enc`);
  }

  async writeArtifact(tenantId: string, snapshotId: string, dataBuffer: Buffer): Promise<StorageArtifactMetadata> {
    const tenantDir = this.getTenantArtifactDir(tenantId);
    const fileName = `${this.sanitizeId(snapshotId)}.tar.gz.enc`;
    const fullPath = path.join(tenantDir, fileName);

    const checksumSha256 = crypto.createHash('sha256').update(dataBuffer).digest('hex');
    
    // Atomic temp write and rename to prevent partial writes
    const tempPath = `${fullPath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, dataBuffer, { mode: 0o600 });
    fs.renameSync(tempPath, fullPath);

    const stats = fs.statSync(fullPath);
    const bytesWritten = stats.size;
    const sizeMb = Number((bytesWritten / (1024 * 1024)).toFixed(3));

    return {
      storageLocation: fullPath,
      bytesWritten,
      sizeMb: Math.max(0.01, sizeMb),
      checksumSha256,
      createdAt: new Date().toISOString(),
      provider: 'local_durable'
    };
  }

  async readArtifact(storageLocationOrSnapshotId: string): Promise<Buffer> {
    const fullPath = this.resolveArtifactPath(storageLocationOrSnapshotId);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup artifact not found on durable storage: ${fullPath}`);
    }
    return fs.readFileSync(fullPath);
  }

  async deleteArtifact(storageLocation: string): Promise<boolean> {
    const fullPath = this.resolveArtifactPath(storageLocation);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  async verifyArtifact(storageLocation: string, expectedChecksum: string): Promise<{ valid: boolean; actualChecksum: string; sizeBytes: number }> {
    const fullPath = this.resolveArtifactPath(storageLocation);
    if (!fs.existsSync(fullPath)) {
      return { valid: false, actualChecksum: '', sizeBytes: 0 };
    }
    const data = fs.readFileSync(fullPath);
    const actualChecksum = crypto.createHash('sha256').update(data).digest('hex');
    const valid = actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();
    return {
      valid,
      actualChecksum,
      sizeBytes: data.length
    };
  }

  async listArtifacts(tenantId?: string): Promise<string[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    if (tenantId) {
      const tenantDir = path.join(this.baseDir, this.sanitizeId(tenantId));
      if (!fs.existsSync(tenantDir)) return [];
      return fs.readdirSync(tenantDir).map(f => path.join(tenantDir, f));
    }
    const results: string[] = [];
    const entries = fs.readdirSync(this.baseDir);
    for (const entry of entries) {
      const full = path.join(this.baseDir, entry);
      if (fs.statSync(full).isDirectory()) {
        const files = fs.readdirSync(full);
        for (const file of files) {
          results.push(path.join(full, file));
        }
      } else {
        results.push(full);
      }
    }
    return results;
  }
}

export const defaultBackupStorageProvider = new DurableDiskBackupStorageProvider();
