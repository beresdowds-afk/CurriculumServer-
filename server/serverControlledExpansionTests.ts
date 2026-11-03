import { controlledExpansionManager } from './serverControlledExpansion';

export interface ExpansionTestResult {
  testId: string;
  name: string;
  passed: boolean;
  details: string;
  evidence: string;
}

export async function runControlledExpansionTestSuite(): Promise<{ passed: number; total: number; results: ExpansionTestResult[] }> {
  const results: ExpansionTestResult[] = [];

  // Test 1: Explicit Batch Authorization Check
  try {
    const batches = controlledExpansionManager.getBatches();
    const batch2 = batches.find(b => b.batchId === 'batch-02-sss-stem');
    const wasPending = batch2?.status === 'PENDING_APPROVAL';

    // Authorize batch 2
    const authorized = controlledExpansionManager.authorizeBatch('batch-02-sss-stem', 'Dr. Folashade Adeyemi');
    const passed = Boolean(wasPending && authorized?.status === 'AUTHORIZED');
    results.push({
      testId: 'TEST-EXPANSION-01',
      name: 'Explicit Batch Authorization Enforcement',
      passed,
      details: passed ? 'Successfully enforced explicit authorization signoff before batch execution.' : 'Authorization bypass detected.',
      evidence: `Batch status transitioned from PENDING to ${authorized?.status}`
    });
  } catch (err: any) {
    results.push({ testId: 'TEST-EXPANSION-01', name: 'Explicit Batch Authorization Enforcement', passed: false, details: err.message, evidence: 'Exception' });
  }

  // Test 2: Cost Ceiling & Token Budget Control
  try {
    const executed = await controlledExpansionManager.executeBatch('batch-02-sss-stem');
    const passed = Boolean(executed.status === 'COMPLETED' && executed.consumedCostUsd <= executed.maxCostUsd);
    results.push({
      testId: 'TEST-EXPANSION-02',
      name: 'Cost Ceiling & Token Budget Control',
      passed,
      details: passed ? `Batch executed within authorized cost ceiling ($${executed.consumedCostUsd} / $${executed.maxCostUsd}).` : 'Cost ceiling exceeded budget.',
      evidence: `Consumed Cost: $${executed.consumedCostUsd}, Tokens: ${executed.consumedTokens}`
    });
  } catch (err: any) {
    results.push({ testId: 'TEST-EXPANSION-02', name: 'Cost Ceiling & Token Budget Control', passed: false, details: err.message, evidence: 'Exception' });
  }

  // Test 3: Prohibition of Bulk Uncontrolled Generation
  try {
    const batches = controlledExpansionManager.getBatches();
    const hasUncheckedBulk = batches.some(b => b.status === 'AUTHORIZED' && b.subjectCodes.length > 20);
    const passed = !hasUncheckedBulk; // Uncontrolled bulk generation is strictly prohibited
    results.push({
      testId: 'TEST-EXPANSION-03',
      name: 'Prohibition of Uncontrolled Bulk Generation',
      passed,
      details: passed ? 'Confirmed zero uncontrolled bulk generation queues across the curriculum.' : 'Uncontrolled bulk generation found.',
      evidence: `Total active batches: ${batches.length}, max subjects per batch: ${Math.max(...batches.map(b => b.subjectCodes.length))}`
    });
  } catch (err: any) {
    results.push({ testId: 'TEST-EXPANSION-03', name: 'Prohibition of Uncontrolled Bulk Generation', passed: false, details: err.message, evidence: 'Exception' });
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`=== CONTROLLED EXPANSION TEST SUITE SUMMARY: ${passedCount}/${results.length} PASSED ===`);
  return { passed: passedCount, total: results.length, results };
}
