import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFeePolicy } from './schoolFinancePolicies';

const policy = {
  academicSession: '2026/2027',
  term: 'First term',
  effectiveDate: '2026-09-01',
  currency: 'ngn',
  items: [{
    name: 'Tuition', category: 'tuition', amountMinor: 1250000, compulsory: true,
    grade: null, classId: null, residence: 'all'
  }]
};

test('fee policy validation preserves exact minor units and targeting', () => {
  assert.deepEqual(parseFeePolicy(policy), { ...policy, currency: 'NGN' });
  const parsed = parseFeePolicy({ ...policy, items: [
    { ...policy.items[0], category: 'levy', compulsory: false, grade: 'JSS 1', residence: 'boarding' }
  ] });
  assert.equal(parsed.items[0].grade, 'JSS 1');
  assert.equal(parsed.items[0].residence, 'boarding');
  assert.equal(parsed.items[0].compulsory, false);
});

test('fee policies reject invalid dates, money, targeting and optional tuition', () => {
  for (const invalid of [
    { ...policy, effectiveDate: '2026-02-29' },
    { ...policy, effectiveDate: '0000-01-01' },
    { ...policy, items: [] },
    { ...policy, items: [{ ...policy.items[0], amountMinor: 0.1 }] },
    { ...policy, items: [{ ...policy.items[0], amountMinor: Number.MAX_SAFE_INTEGER + 1 }] },
    { ...policy, items: [{ ...policy.items[0], compulsory: false }] },
    { ...policy, items: [{ ...policy.items[0], classId: 'not-a-uuid' }] },
    { ...policy, items: [{ ...policy.items[0], residence: 'unknown' }] }
  ]) {
    assert.throws(() => parseFeePolicy(invalid), /invalid|valid|must|supported/i);
  }
});
