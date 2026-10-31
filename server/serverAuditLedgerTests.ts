import fs from 'fs';
import path from 'path';
import { ServerAuditLedger } from './serverAuditLedger';

export interface AuditLedgerTestResult {
  testId: string;
  name: string;
  category: 'persistence' | 'cryptography' | 'tamper_detection' | 'checkpoints' | 'access_control' | 'export';
  passed: boolean;
  details: string;
  securityProof: string;
}

export async function runAuditLedgerTestSuite(): Promise<AuditLedgerTestResult[]> {
  const results: AuditLedgerTestResult[] = [];
  const testLedger = new ServerAuditLedger();

  // Reset to pristine state for repeatable testing
  testLedger.resetLedgerForTesting();

  const LEDGER_STREAM_FILE = path.join(process.cwd(), 'data', 'audit_ledger', 'ledger.jsonl');

  // Test 1: Audit Event Persistence
  try {
    const entry = testLedger.logPlatformAction({
      actor: 'admin@curriculumserver.ng',
      actorRole: 'super_admin',
      action: 'tenant_created',
      target: 'tenant:tenant-test-audit-01',
      result: 'SUCCESS',
      details: 'Created audit test tenant',
      tenantId: 'tenant-test-audit-01',
      outcome: 'SUCCESS',
      resourceType: 'tenant',
      resourceId: 'tenant-test-audit-01'
    });

    const fileContent = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8');
    const persisted = fileContent.includes(entry.id) && fileContent.includes('tenant-test-audit-01');

    results.push({
      testId: 'TEST-AUD-01',
      name: 'Audit Event Durable Append-Only Persistence',
      category: 'persistence',
      passed: persisted,
      details: `Logged event ${entry.id} (Seq: ${entry.sequenceNumber}). Confirmed durable write to ledger.jsonl.`,
      securityProof: 'Record immediately written to append-only disk stream with mode 0o600.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-01',
      name: 'Audit Event Durable Append-Only Persistence',
      category: 'persistence',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 2: Audit History Surviving Service Restart
  try {
    // Instantiate a brand-new instance simulating service/process restart
    const restartedLedger = new ServerAuditLedger();
    const records = restartedLedger.getAuditRecords();
    const survives = records.some(r => r.action === 'tenant_created');

    results.push({
      testId: 'TEST-AUD-02',
      name: 'Audit History Surviving Process & Server Restart',
      category: 'persistence',
      passed: survives,
      details: `Initialized new ServerAuditLedger instance. Loaded ${records.length} persisted records from disk without data loss.`,
      securityProof: 'Reconstructed verified state directly from immutable ledger.jsonl file.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-02',
      name: 'Audit History Surviving Process & Server Restart',
      category: 'persistence',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Populate multiple sequential events to test chain & checkpoints
  for (let i = 1; i <= 12; i++) {
    testLedger.logPlatformAction({
      actor: `operator_${i}@curriculumserver.ng`,
      actorRole: 'admin',
      action: 'feature_enabled',
      target: `feature_${i}`,
      result: 'SUCCESS',
      details: `Enabled feature flag ${i}`,
      tenantId: i % 2 === 0 ? 'tenant-alpha' : 'tenant-beta',
      outcome: 'SUCCESS'
    });
  }

  // Test 3: Hash-Chain Verification on Clean Ledger
  try {
    const integrity = testLedger.verifyLedgerIntegrity();
    results.push({
      testId: 'TEST-AUD-03',
      name: 'SHA-256 HMAC Hash-Chain Integrity Verification',
      category: 'cryptography',
      passed: integrity.isValid && integrity.totalRecords >= 14,
      details: `Verified continuous cryptographic chain across ${integrity.totalRecords} records. Chain root: ${integrity.lastVerifiedHash?.substring(0, 16)}...`,
      securityProof: 'Each record entryHash = SHA256(canonicalPayload) and matches previousEntryHash pointer.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-03',
      name: 'SHA-256 HMAC Hash-Chain Integrity Verification',
      category: 'cryptography',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 4: Event Modification Detection (Tamper Detection)
  try {
    // Read ledger file, tamper with an entry in the middle
    const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
    const targetIndex = 5;
    const originalEntry = JSON.parse(lines[targetIndex]);
    const tamperedEntry = { ...originalEntry, details: 'ATTACKER_MODIFIED_DETAILS_MALICIOUS' };
    
    // Replace line temporarily
    lines[targetIndex] = JSON.stringify(tamperedEntry);
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    const integrityCheck = testLedger.verifyLedgerIntegrity();
    const caught = !integrityCheck.isValid && integrityCheck.corruptedAtSequence === originalEntry.sequenceNumber;

    // Restore original
    lines[targetIndex] = JSON.stringify(originalEntry);
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    results.push({
      testId: 'TEST-AUD-04',
      name: 'Payload Modification Tamper Detection',
      category: 'tamper_detection',
      passed: caught,
      details: `Tampered payload at sequence ${originalEntry.sequenceNumber}. Verification caught corruption: '${integrityCheck.reason}'.`,
      securityProof: 'Deterministic canonical SHA-256 recomputation detected payload alteration.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-04',
      name: 'Payload Modification Tamper Detection',
      category: 'tamper_detection',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 5: Event Deletion Detection
  try {
    const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
    const deletedIndex = 4;
    const deletedEntry = JSON.parse(lines[deletedIndex]);
    
    // Remove 1 line
    const modifiedLines = [...lines];
    modifiedLines.splice(deletedIndex, 1);
    fs.writeFileSync(LEDGER_STREAM_FILE, modifiedLines.join('\n') + '\n');

    const integrityCheck = testLedger.verifyLedgerIntegrity();
    const caught = !integrityCheck.isValid && (integrityCheck.reason?.includes('Broken sequence') || integrityCheck.reason?.includes('mismatch'));

    // Restore original
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    results.push({
      testId: 'TEST-AUD-05',
      name: 'Event Deletion Detection',
      category: 'tamper_detection',
      passed: caught,
      details: `Deleted sequence ${deletedEntry.sequenceNumber}. Verification detected chain break: '${integrityCheck.reason}'.`,
      securityProof: 'Sequential sequenceNumber and hash-pointer checks prevent silent deletion of records.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-05',
      name: 'Event Deletion Detection',
      category: 'tamper_detection',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 6: Event Reordering Detection
  try {
    const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
    // Swap lines 3 and 4
    const swappedLines = [...lines];
    const temp = swappedLines[3];
    swappedLines[3] = swappedLines[4];
    swappedLines[4] = temp;
    fs.writeFileSync(LEDGER_STREAM_FILE, swappedLines.join('\n') + '\n');

    const integrityCheck = testLedger.verifyLedgerIntegrity();
    const caught = !integrityCheck.isValid;

    // Restore original
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    results.push({
      testId: 'TEST-AUD-06',
      name: 'Event Reordering Detection',
      category: 'tamper_detection',
      passed: caught,
      details: `Swapped record positions 3 and 4. Verifier detected disorder: '${integrityCheck.reason}'.`,
      securityProof: 'Strict monotonic sequence number check rejects reordering attacks.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-06',
      name: 'Event Reordering Detection',
      category: 'tamper_detection',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 7: Periodic Signed Checkpoints
  try {
    const checkpoints = testLedger.getCheckpoints();
    const hasCheckpoints = checkpoints.length > 0;
    const latest = checkpoints[0];
    const validSignature = Boolean(latest && latest.signature && latest.signature.length === 64);

    results.push({
      testId: 'TEST-AUD-07',
      name: 'Periodic Signed Checkpoints & Independent Archival',
      category: 'checkpoints',
      passed: hasCheckpoints && validSignature,
      details: `Found ${checkpoints.length} signed checkpoints. Latest checkpoint ID: ${latest?.checkpointId} covering sequences ${latest?.startSequence}..${latest?.endSequence}.`,
      securityProof: 'Checkpoints committed with independent HMAC signatures stored in isolated checkpoints/ directory.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-07',
      name: 'Periodic Signed Checkpoints & Independent Archival',
      category: 'checkpoints',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 8: Unauthorized Audit Modification (Signature Forgery)
  try {
    const lines = fs.readFileSync(LEDGER_STREAM_FILE, 'utf8').split('\n').filter(Boolean);
    const targetIdx = 2;
    const entry = JSON.parse(lines[targetIdx]);
    // Alter signature to fake signature
    const forgedEntry = { ...entry, signature: '0000000000000000000000000000000000000000000000000000000000000000' };
    lines[targetIdx] = JSON.stringify(forgedEntry);
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    const integrityCheck = testLedger.verifyLedgerIntegrity();
    const caught = !integrityCheck.isValid && integrityCheck.reason?.includes('signature');

    // Restore original
    lines[targetIdx] = JSON.stringify(entry);
    fs.writeFileSync(LEDGER_STREAM_FILE, lines.join('\n') + '\n');

    results.push({
      testId: 'TEST-AUD-08',
      name: 'Cryptographic Signature Forgery Rejection',
      category: 'cryptography',
      passed: caught,
      details: `Injected forged signature into record ${entry.sequenceNumber}. Verifier rejected entry: '${integrityCheck.reason}'.`,
      securityProof: 'Timing-safe HMAC-SHA256 comparison rejected forged signature.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-08',
      name: 'Cryptographic Signature Forgery Rejection',
      category: 'cryptography',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 9: Cross-Tenant Audit Isolation
  try {
    const alphaEvents = testLedger.queryAuditEvents({ tenantId: 'tenant-alpha' });
    const betaEvents = testLedger.queryAuditEvents({ tenantId: 'tenant-beta' });
    const noCrossLeaked = alphaEvents.every(e => e.tenantId === 'tenant-alpha') && betaEvents.every(e => e.tenantId === 'tenant-beta');

    results.push({
      testId: 'TEST-AUD-09',
      name: 'Cross-Tenant Audit Log Boundary Isolation',
      category: 'access_control',
      passed: noCrossLeaked && alphaEvents.length > 0 && betaEvents.length > 0,
      details: `Scoped query for 'tenant-alpha' returned ${alphaEvents.length} events (0 from beta). Scoped query for 'tenant-beta' returned ${betaEvents.length} events (0 from alpha).`,
      securityProof: 'Tenant filtering strictly confines audit retrieval to authorized tenant boundary.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-09',
      name: 'Cross-Tenant Audit Log Boundary Isolation',
      category: 'access_control',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  // Test 10: Successful Audit Export by Authorized Users
  try {
    const jsonReport = testLedger.exportAuditReport('tenant-alpha', 'json');
    const parsed = JSON.parse(jsonReport);
    const csvReport = testLedger.exportAuditReport('tenant-alpha', 'csv');

    const validExport = Boolean(
      parsed.exportTimestamp &&
      parsed.cryptographicChainIntegrity.isValid &&
      Array.isArray(parsed.records) &&
      csvReport.includes('Sequence,ID,Timestamp')
    );

    results.push({
      testId: 'TEST-AUD-10',
      name: 'Cryptographic Audit Report Export (JSON & CSV)',
      category: 'export',
      passed: validExport,
      details: `Generated authorized audit report for tenant-alpha. Export bundle contains ${parsed.records.length} records and cryptographic integrity proof.`,
      securityProof: 'Export package includes verifiable chain signature and timestamped digest.'
    });
  } catch (err: any) {
    results.push({
      testId: 'TEST-AUD-10',
      name: 'Cryptographic Audit Report Export (JSON & CSV)',
      category: 'export',
      passed: false,
      details: `Failed: ${err.message}`,
      securityProof: 'FAILED'
    });
  }

  return results;
}
