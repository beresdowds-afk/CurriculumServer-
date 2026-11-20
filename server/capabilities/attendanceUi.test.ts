import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BiometricAttendanceTab } from '../../src/components/BiometricAttendanceTab';

test('attendance screen does not present simulated activity as operational', () => {
  const html = renderToStaticMarkup(React.createElement(BiometricAttendanceTab));
  assert.match(html, /attendance unavailable/i);
  assert.match(html, /not yet operational/i);
  assert.match(html, /No attendance events or notifications/);
  assert.doesNotMatch(html, /simulate|heartbeat|scan count/i);
});
