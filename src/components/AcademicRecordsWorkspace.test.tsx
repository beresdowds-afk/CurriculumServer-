import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcademicRecordsWorkspace, loadAcademicClasses, loadAcademicStudents } from './AcademicRecordsWorkspace';
import { unifiedApiClient } from '../services/unifiedApiClient';

test('academic records do not present simulated results as official', () => {
  const html = renderToStaticMarkup(<AcademicRecordsWorkspace />);
  assert.match(html, /Score capture, broadsheets, approvals, report cards, transcripts and promotion workflows are not yet available/);
  assert.doesNotMatch(html, /Emeka Nnamdi|Approve Broadsheet|Publish Report/);
});

test('class and student registers use authenticated school APIs and preserve errors', async () => {
  const original = unifiedApiClient.requestAuthenticatedSchoolFlow;
  const requests: string[] = [];
  unifiedApiClient.requestAuthenticatedSchoolFlow = async <T,>(endpoint: string, options?: RequestInit): Promise<T> => {
    requests.push(endpoint);
    assert.equal(options?.cache, 'no-store');
    if (endpoint.includes('/students')) throw { status: 403, error: 'Permission denied.' };
    return { data: { records: [], page: 2, pageSize: 25, total: 25 } } as T;
  };
  try {
    assert.equal((await loadAcademicClasses(2)).page, 2);
    await assert.rejects(loadAcademicStudents('class/1', 3), { status: 403, error: 'Permission denied.' });
    assert.deepEqual(requests, [
      '/api/v1/schools/me/classes?page=2&pageSize=25',
      '/api/v1/schools/me/students?classId=class%2F1&page=3&pageSize=25'
    ]);
  } finally {
    unifiedApiClient.requestAuthenticatedSchoolFlow = original;
  }
});
