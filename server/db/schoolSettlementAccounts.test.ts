import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSettlementRequest } from './schoolSettlementAccounts';

const request = {
  provider: 'opay', bankName: 'Example bank', bankCode: '999', accountName: 'Example school',
  accountNumber: '1234567890'
};

test('settlement account input rejects unsupported providers, credentials and malformed NUBANs', () => {
  assert.equal(parseSettlementRequest(request).details.accountNumber, request.accountNumber);
  for (const invalid of [
    { ...request, provider: 'bank_transfer' },
    { ...request, secret: 'must-not-be-accepted' },
    { ...request, accountNumber: '1234' },
    { ...request, accountNumber: 1234567890 },
    { ...request, bankName: ' \n ' }
  ]) {
    assert.throws(() => parseSettlementRequest(invalid), /invalid|unsupported|NUBAN/i);
  }
});
