import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentSuiteUnavailable } from './AssessmentSuiteUnavailable';

test('assessment workspace does not present prototypes as operational', () => {
  const html = renderToStaticMarkup(<AssessmentSuiteUnavailable />);
  assert.match(html, /secure CBT unavailable/);
  assert.match(html, /not yet available/);
  assert.match(html, /stronger lockdown requires a managed kiosk/);
  assert.doesNotMatch(html, /Start Test|Schedule to Timetable|Marking Scheme/);
});
