import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  EnterpriseAuditEvent,
  AuditLogOptions,
  AuditLedgerIntegrityResult,
  IServerAuditBackend,
  canonicalDeterministicStringify,
  redactSensitiveMetadata,
  getAuditSigningKey
} from '../src/services/tamperEvidentAuditService';

export interface AuditCheckpoint {
  checkpointId: string;
  startSequence: number;
  endSequence: number;
  eventCount: number;
  chainedRootHash: string;
  timestamp: string;
  signedBy: string;
  signature: string;
}

const LEDGER_BASE_DIR = path.join(process.cwd(), 'data', 'audit_ledger');
const LEDGER_STREAM_FILE = path.join(LEDGER_BASE_DIR, 'ledger.jsonl');
const CHECKPOINTS_DIR = path.join(LEDGER_BASE_DIR, 'checkpoints');
const ARCHIVE_DIR = path.join(LEDGER_BASE_DIR, 'archive');

const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CHECKPOINT_INTERVAL = 10;

export class ServerAuditLedger implements IServerAuditBackend {
  private inMemoryCache: EnterpriseAuditEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.ensureStorageDirectories();
    this.initializeLedger();
  }

  private ensureStorageDirectories(): void {
    if (!fs.existsSync(LEDGER_BASE_DIR)) fs.mkdirSync(LEDGER_BASE_DIR, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(CHECKPOINTS_DIR)) fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true, mode: 0o700 });
  }

  private computeSha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private computeHmac(secret: string, content: string): string {
    return crypto.createHmac('sha256', secret).update(content, 'utf8').digest('hex');
  }

  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  public initializeLedger(): void {
    if (this.isInitialized) return;
    this.ensureStorageDirectories();

    this.inMemoryCache = [];
    if (fs.existsSync(LEDGER_STREAM_FILE)) {
      const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry: EnterpriseAuditEvent = JSON.parse(line);
          this.inMemoryCache.push(entry);
        } catch (e) {
          console.error('Corrupted line in ledger.jsonl skipped:', e);
        }
      }
    }

    // Genesis event creation if ledger is fresh
    if (this.inMemoryCache.length === 0) {
      const now = new Date().toISOString();
      const genesisPayload = {
        sequenceNumber: 1,
        previousEntryHash: GENESIS_PREV_HASH,
        timestamp: now,
        actor: 'system.genesis_orchestrator',
        actorRole: 'system_root',
        action: 'audit_ledger_initialized',
        target: 'curriculumserver:audit_ledger',
        result: 'SUCCESS',
        details: 'Enterprise tamper-evident audit ledger genesis root established.',
        tenantId: 'platform_control_plane',
        outcome: 'SUCCESS',
        redactedMetadata: { genesis: true, platform: 'CurriculumServer-3.2' }
      };

      const canonicalStr = canonicalDeterministicStringify(genesisPayload);
      const entryHash = this.computeSha256(canonicalStr);
      const secret = getAuditSigningKey();
      const signature = this.computeHmac(secret, entryHash);

      const genesisEntry: EnterpriseAuditEvent = {
        id: `evt_aud_genesis_${Date.now()}`,
        sequenceNumber: 1,
        timestamp: now,
        actor: 'system.genesis_orchestrator',
        actorRole: 'system_root',
        action: 'audit_ledger_initialized',
        target: 'curriculumserver:audit_ledger',
        result: 'SUCCESS',
        details: 'Enterprise tamper-evident audit ledger genesis root established.',
        tenantId: 'platform_control_plane',
        actorId: 'system_root',
        resourceType: 'system',
        resourceId: 'curriculumserver:audit_ledger',
        outcome: 'SUCCESS',
        reason: 'Initial platform genesis bootstrap',
        correlationId: 'corr_genesis_001',
        redactedMetadata: { genesis: true, platform: 'CurriculumServer-3.2' },
        previousEntryHash: GENESIS_PREV_HASH,
        entryHash,
        signature,
        ipAddress: '127.0.0.1',
        deviceMetadata: 'System Kernel'
      };

      this.inMemoryCache.push(genesisEntry);
      fs.writeFileSync(LEDGER_STREAM_FILE, JSON.stringify(genesisEntry) + '\n', { mode: 0o600 });
      this.createSignedCheckpoint(1, 1, entryHash);
    }

    this.isInitialized = true;
  }

  private createSignedCheckpoint(startSeq: number, endSeq: number, rootHash: string): AuditCheckpoint {
    const now = new Date().toISOString();
    const count = endSeq - startSeq + 1;
    const checkpointId = `chk_seq_${String(endSeq).padStart(6, '0')}_${Date.now()}`;
    const secret = getAuditSigningKey();

    const manifestToSign = canonicalDeterministicStringify({
      checkpointId,
      startSequence: startSeq,
      endSequence: endSeq,
      eventCount: count,
      chainedRootHash: rootHash,
      timestamp: now,
      signedBy: 'CurriculumServer Audit Authority (HMAC-SHA256)'
    });

    const signature = this.computeHmac(secret, manifestToSign);

    const checkpoint: AuditCheckpoint = {
      checkpointId,
      startSequence: startSeq,
      endSequence: endSeq,
      eventCount: count,
      chainedRootHash: rootHash,
      timestamp: now,
      signedBy: 'CurriculumServer Audit Authority (HMAC-SHA256)',
      signature
    };

    const checkpointPath = path.join(CHECKPOINTS_DIR, `${checkpointId}.json`);
    const archivePath = path.join(ARCHIVE_DIR, `${checkpointId}.archive.json`);
    const jsonStr = JSON.stringify(checkpoint, null, 2);

    fs.writeFileSync(checkpointPath, jsonStr, { mode: 0o600 });
    fs.writeFileSync(archivePath, jsonStr, { mode: 0o600 });

    return checkpoint;
  }

  public logPlatformAction(record: AuditLogOptions): EnterpriseAuditEvent {
    if (!this.isInitialized) this.initializeLedger();

    const now = new Date().toISOString();
    const id = `evt_aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const seq = this.inMemoryCache.length + 1;
    const prevHash = this.inMemoryCache.length > 0 
      ? this.inMemoryCache[this.inMemoryCache.length - 1].entryHash 
      : GENESIS_PREV_HASH;

    const safeMetadata = redactSensitiveMetadata(record.metadata || {});

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
      outcome: record.outcome || (record.result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE'),
      redactedMetadata: safeMetadata
    };

    const canonicalStr = canonicalDeterministicStringify(canonicalPayload);
    const entryHash = this.computeSha256(canonicalStr);
    const secret = getAuditSigningKey();
    const signature = this.computeHmac(secret, entryHash);

    const entry: EnterpriseAuditEvent = {
      ...record,
      id,
      timestamp: now,
      sequenceNumber: seq,
      previousEntryHash: prevHash,
      entryHash,
      signature,
      actorId: record.actorId || record.actor,
      resourceType: record.resourceType || 'general',
      resourceId: record.resourceId || record.target,
      outcome: record.outcome || (record.result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE'),
      reason: record.reason || record.details,
      correlationId: record.correlationId || `corr_${id}`,
      redactedMetadata: safeMetadata,
      ipAddress: record.ipAddress || '127.0.0.1',
      deviceMetadata: record.deviceMetadata || 'Node Express Server'
    };

    // 1. Append-only write to durable disk file
    fs.appendFileSync(LEDGER_STREAM_FILE, JSON.stringify(entry) + '\n', { mode: 0o600 });

    // 2. Add to in-memory verified cache
    this.inMemoryCache.push(entry);

    // 3. Periodic checkpoint creation (every CHECKPOINT_INTERVAL events)
    if (seq % CHECKPOINT_INTERVAL === 0) {
      const start = seq - CHECKPOINT_INTERVAL + 1;
      this.createSignedCheckpoint(start, seq, entryHash);
    }

    return entry;
  }

  public getAuditRecords(tenantId?: string): EnterpriseAuditEvent[] {
    if (!this.isInitialized) this.initializeLedger();
    const list = [...this.inMemoryCache].reverse();
    if (tenantId) {
      return list.filter(r => r.tenantId?.toLowerCase() === tenantId.toLowerCase());
    }
    return list;
  }

  public queryAuditEvents(filters: {
    tenantId?: string;
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): EnterpriseAuditEvent[] {
    if (!this.isInitialized) this.initializeLedger();
    let results = [...this.inMemoryCache].reverse();

    if (filters.tenantId) {
      results = results.filter(r => r.tenantId?.toLowerCase() === filters.tenantId!.toLowerCase());
    }
    if (filters.actor) {
      const q = filters.actor.toLowerCase();
      results = results.filter(r => r.actor.toLowerCase().includes(q) || (r.actorId && r.actorId.toLowerCase().includes(q)));
    }
    if (filters.action) {
      results = results.filter(r => r.action === filters.action);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      results = results.filter(r => new Date(r.timestamp).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      results = results.filter(r => new Date(r.timestamp).getTime() <= end);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  public verifyLedgerIntegrity(): AuditLedgerIntegrityResult {
    this.initializeLedger();

    if (!fs.existsSync(LEDGER_STREAM_FILE)) {
      return { isValid: true, totalRecords: 0 };
    }

    const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
    if (lines.length === 0) {
      return { isValid: true, totalRecords: 0 };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;
    const secret = getAuditSigningKey();

    for (let i = 0; i < lines.length; i++) {
      let entry: EnterpriseAuditEvent;
      try {
        entry = JSON.parse(lines[i]);
      } catch (err: any) {
        return {
          isValid: false,
          totalRecords: lines.length,
          corruptedAtSequence: i + 1,
          reason: `Unparseable JSON entry at line ${i + 1}: ${err.message}`
        };
      }

      // Check 1: Sequence number progression
      if (entry.sequenceNumber !== i + 1) {
        return {
          isValid: false,
          totalRecords: lines.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Broken sequence ordering at record ${i + 1}. Expected sequence ${i + 1} but found ${entry.sequenceNumber}. (Record deletion or reordering detected)`
        };
      }

      // Check 2: Hash pointer continuity
      if (entry.previousEntryHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalRecords: lines.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Hash pointer mismatch at sequence ${entry.sequenceNumber}. Stored previousEntryHash does not match computed preceding block hash.`
        };
      }

      // Check 3: Cryptographic SHA-256 payload integrity
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

      const calculatedHash = this.computeSha256(canonicalDeterministicStringify(canonicalPayload));
      if (calculatedHash !== entry.entryHash) {
        return {
          isValid: false,
          totalRecords: lines.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Payload tamper detected at sequence ${entry.sequenceNumber}. Recalculated SHA-256 (${calculatedHash}) does not match stored hash (${entry.entryHash}).`
        };
      }

      // Check 4: HMAC Signature verification
      const expectedSignature = this.computeHmac(secret, entry.entryHash);
      if (!this.safeCompare(entry.signature, expectedSignature)) {
        return {
          isValid: false,
          totalRecords: lines.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Cryptographic HMAC-SHA256 signature verification failed at sequence ${entry.sequenceNumber}. Unauthorized entry signature forgery detected.`
        };
      }

      expectedPrevHash = entry.entryHash;
    }

    return {
      isValid: true,
      totalRecords: lines.length,
      lastVerifiedHash: expectedPrevHash,
      lastCheckpointSequence: Math.floor(lines.length / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL
    };
  }

  public getCheckpoints(): AuditCheckpoint[] {
    const list: AuditCheckpoint[] = [];
    if (!fs.existsSync(CHECKPOINTS_DIR)) return list;
    const files = fs.readdirSync(CHECKPOINTS_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(CHECKPOINTS_DIR, f), 'utf8');
        list.push(JSON.parse(raw));
      } catch {
        // ignore malformed
      }
    }
    return list.sort((a, b) => b.endSequence - a.endSequence);
  }

  public exportAuditReport(tenantId?: string, format: 'json' | 'csv' = 'json'): string {
    const events = this.queryAuditEvents({ tenantId });
    const integrity = this.verifyLedgerIntegrity();

    if (format === 'csv') {
      const headers = ['Sequence', 'ID', 'Timestamp', 'Actor', 'Role', 'Tenant', 'Action', 'Target', 'Result', 'Outcome', 'SHA256_Hash', 'Signature'];
      const rows = events.map(e => [
        e.sequenceNumber,
        `"${e.id}"`,
        `"${e.timestamp}"`,
        `"${(e.actor || '').replace(/"/g, '""')}"`,
        `"${e.actorRole || ''}"`,
        `"${e.tenantId || ''}"`,
        `"${e.action}"`,
        `"${(e.target || '').replace(/"/g, '""')}"`,
        `"${e.result}"`,
        `"${e.outcome || ''}"`,
        `"${e.entryHash}"`,
        `"${e.signature}"`
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    }

    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      tenantScope: tenantId || 'ALL_TENANTS',
      totalRecords: events.length,
      cryptographicChainIntegrity: integrity,
      records: events
    }, null, 2);
  }

  /**
   * For automated testing only: drops ledger and checkpoints
   */
  public resetLedgerForTesting(): void {
    try {
      if (fs.existsSync(LEDGER_STREAM_FILE)) fs.unlinkSync(LEDGER_STREAM_FILE);
      if (fs.existsSync(CHECKPOINTS_DIR)) {
        const files = fs.readdirSync(CHECKPOINTS_DIR);
        for (const f of files) fs.unlinkSync(path.join(CHECKPOINTS_DIR, f));
      }
      if (fs.existsSync(ARCHIVE_DIR)) {
        const files = fs.readdirSync(ARCHIVE_DIR);
        for (const f of files) fs.unlinkSync(path.join(ARCHIVE_DIR, f));
      }
    } catch {
      // ignore
    }
    this.inMemoryCache = [];
    this.isInitialized = false;
    this.initializeLedger();
  }
}

export const serverAuditLedger = new ServerAuditLedger();
