import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { principal } from './testSupport';
import type { FeePolicyRecord } from '../../packages/shared-types/src/schoolFinance';
import {
  hasSchoolFinancePermission,
  listScopedSchoolIds,
  parseFeePolicy,
  selectEffectivePolicyId
} from './schoolFinancePolicies';

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

test('fee policies reject invalid dates, money, targeting, optional tuition, and duplicate items', () => {
  for (const invalid of [
    { ...policy, effectiveDate: '2026-02-29' },
    { ...policy, effectiveDate: '0000-01-01' },
    { ...policy, items: [] },
    { ...policy, items: [{ ...policy.items[0], amountMinor: 0.1 }] },
    { ...policy, items: [{ ...policy.items[0], amountMinor: Number.MAX_SAFE_INTEGER + 1 }] },
    { ...policy, items: [{ ...policy.items[0], compulsory: false }] },
    { ...policy, items: [{ ...policy.items[0], classId: 'not-a-uuid' }] },
    { ...policy, items: [{ ...policy.items[0], residence: 'unknown' }] },
    { ...policy, items: [policy.items[0], { ...policy.items[0], name: ' tuition ' }] }
  ]) {
    assert.throws(() => parseFeePolicy(invalid), /invalid|valid|must|supported|Duplicate/i);
  }
});

test('selectEffectivePolicyId excludes unapproved, future-dated, and superseded/retired policies', () => {
  const base: Omit<FeePolicyRecord, 'id' | 'version' | 'effective_date' | 'approved_at'> = {
    academic_session: '2026/2027',
    term: 'First term',
    currency: 'NGN',
    items: [policy.items[0] as any],
    created_by: randomUUID(),
    created_at: '2026-08-01T00:00:00Z',
    approved_by: null
  };
  const v1Superseded: FeePolicyRecord = {
    ...base, id: 'p1', version: 1, effective_date: '2026-09-01', approved_by: 'u1', approved_at: '2026-08-10T00:00:00Z',
    superseded_at: '2026-09-05T00:00:00Z'
  };
  const v2ApprovedEffective: FeePolicyRecord = {
    ...base, id: 'p2', version: 2, effective_date: '2026-09-01', approved_by: 'u1', approved_at: '2026-08-15T00:00:00Z'
  };
  const v3FutureApproved: FeePolicyRecord = {
    ...base, id: 'p3', version: 3, effective_date: '2026-10-01', approved_by: 'u1', approved_at: '2026-08-20T00:00:00Z'
  };
  const v4Unapproved: FeePolicyRecord = {
    ...base, id: 'p4', version: 4, effective_date: '2026-09-02', approved_by: null, approved_at: null
  };

  assert.equal(selectEffectivePolicyId([v4Unapproved], '2026/2027', 'First term', '2026-09-15'), null);
  assert.equal(selectEffectivePolicyId([v1Superseded], '2026/2027', 'First term', '2026-09-15'), null);
  assert.equal(
    selectEffectivePolicyId([v1Superseded, v2ApprovedEffective, v3FutureApproved, v4Unapproved], '2026/2027', 'First term', '2026-09-15')?.id,
    'p2'
  );
  assert.equal(
    selectEffectivePolicyId([v1Superseded, v2ApprovedEffective, v3FutureApproved, v4Unapproved], '2026/2027', 'First term', '2026-10-01')?.id,
    'p3'
  );
  assert.equal(
    selectEffectivePolicyId([v2ApprovedEffective], '2026/2027', 'First term', '2026-08-31'),
    null
  );
});

test('school-scoped finance grants isolate schools within the same tenant', () => {
  const tenantId = randomUUID();
  const schoolA = randomUUID();
  const schoolB = randomUUID();
  const actor = createAuthorizedPrincipal({
    tenant: principal(tenantId, 'principal'),
    userId: randomUUID(),
    sessionId: randomUUID(),
    grants: [{
      roleCode: 'principal',
      permissions: [PERMISSIONS.schoolFinancePoliciesRead, PERMISSIONS.schoolFinancePoliciesApprove],
      scopes: [{ resourceType: 'school', resourceId: schoolA }]
    }]
  });

  assert.equal(hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesApprove, schoolA, ['principal']), true);
  assert.equal(hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesApprove, schoolB, ['principal']), false);
  assert.deepEqual(listScopedSchoolIds(actor, PERMISSIONS.schoolFinancePoliciesRead), [schoolA.toLowerCase()]);
});
