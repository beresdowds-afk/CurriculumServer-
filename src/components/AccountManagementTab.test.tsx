import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountManagementTab } from './AccountManagementTab';

test('school accounts disclose unavailable payment and accounting functionality', () => {
  const html = renderToStaticMarkup(<AccountManagementTab />);
  assert.match(html, /Student invoices, balances, payments, receipts, reconciliation, payroll and financial reports are not yet available/);
  assert.match(html, /separate from Curriculum Server subscription billing/);
  assert.doesNotMatch(html, /Pay now|Generate receipt|Reconcile deposit/);
  assert.doesNotMatch(html, /Emeka Nnamdi|CF\/2024\/SS2\/012|REC-2026/);
});
