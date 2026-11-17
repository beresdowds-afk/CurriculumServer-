import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { lazySingleton } from '../lazySingleton';

export interface StoredTextbookMediaArtifact {
  storageProvider: 'local_durable';
  storageKey: string;
  checksumSha256: string;
  bytesSize: number;
}

export class CentralTextbookStorageProvider {
  private readonly baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = path.resolve(
      customBaseDir || process.env.TEXTBOOK_STORAGE_DIR || path.join(process.cwd(), 'data', 'textbooks', 'media')
    );
    this.ensureDir(this.baseDir);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  private sanitizeSegment(segment: string): string {
    const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!cleaned || cleaned === '.' || cleaned === '..') {
      throw new Error('INVALID_STORAGE_KEY');
    }
    return cleaned;
  }

  private resolveSafePath(storageKey: string): string {
    const normalizedRel = path.posix.normalize(storageKey.replace(/\\/g, '/'));
    if (normalizedRel.startsWith('/') || normalizedRel.startsWith('..') || normalizedRel.includes('/../')) {
      throw new Error('INVALID_STORAGE_KEY');
    }
    const candidate = path.resolve(this.baseDir, normalizedRel);
    const baseWithSep = this.baseDir.endsWith(path.sep) ? this.baseDir : `${this.baseDir}${path.sep}`;
    if (!candidate.startsWith(baseWithSep)) {
      throw new Error('STORAGE_PATH_TRAVERSAL_REJECTED');
    }
    return candidate;
  }

  async writeMedia(
    textbookId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<StoredTextbookMediaArtifact> {
    const safeBookId = this.sanitizeSegment(textbookId);
    const safeFileName = this.sanitizeSegment(fileName);
    const storageKey = `${safeBookId}/${Date.now()}-${safeFileName}`;
    const fullPath = this.resolveSafePath(storageKey);
    this.ensureDir(path.dirname(fullPath));

    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const tempPath = `${fullPath}.tmp_${crypto.randomUUID()}`;
    fs.writeFileSync(tempPath, buffer, { mode: 0o600 });
    fs.renameSync(tempPath, fullPath);

    return {
      storageProvider: 'local_durable',
      storageKey,
      checksumSha256,
      bytesSize: buffer.length
    };
  }

  async readMedia(storageKey: string, expectedChecksum?: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`TEXTBOOK_MEDIA_NOT_FOUND: ${storageKey}`);
    }
    const buffer = fs.readFileSync(fullPath);
    if (expectedChecksum) {
      const actual = crypto.createHash('sha256').update(buffer).digest('hex');
      if (actual.toLowerCase() !== expectedChecksum.toLowerCase()) {
        throw new Error('TEXTBOOK_MEDIA_CHECKSUM_MISMATCH');
      }
    }
    return buffer;
  }

  async deleteMedia(storageKey: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  }
}

export const defaultTextbookStorageProvider = lazySingleton(() => new CentralTextbookStorageProvider());
