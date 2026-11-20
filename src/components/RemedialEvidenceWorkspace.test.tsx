import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadRemedialEvidence, RemedialEvidenceList, RemedialEvidenceWorkspace } from './RemedialEvidenceWorkspace';
import type { TeacherSubjectAssignmentDto, TeachingDeliveryRecordDto } from '../services/teachingEvidenceApiClient';
import { unifiedApiClient } from '../services/unifiedApiClient';

const delivery: TeachingDeliveryRecordDto = {
  id: 'delivery-1', tenantId: 'tenant', applicationInstanceId: 'instance', assignmentId: 'assignment',
  schoolId: 'school', academicSession: '2025/2026', term: 'Term 1', classId: 'class',
  classGradeName: 'SS 1', section: 'A', subjectId: 'math', curriculumVersionId: 'version',
  topicId: 'topic', topicTitleInput: 'Fractions', resolvedTopicTitle: 'Fractions',
  resolutionStatus: 'resolved', resolutionNotes: null, lessonNoteId: null, weekNumber: 1,
  scheduledDate: '2025-09-01', status: 'completed', receivedAt: null, openedAt: null,
  acknowledgedAt: null, taughtAt: null, completedAt: null, completionConfirmedByTeacher: true,
  completionTeacherUserId: 'teacher', completionIdempotencyKey: null, coverageMode: 'partial',
  coveredObjectiveIds: [], uncoveredObjectiveIds: [], understandingLevel: 'poor',
  studentEngagement: null, remedialNeeded: true, remedialTopic: 'Equivalent fractions',
  teacherComments: 'Some pupils need practice.', challengesNoted: null,
  verificationBasis: 'teacher_self_reported', adminVerificationStatus: 'unverified',
  adminVerifiedBy: null, adminVerifiedAt: null, recordVersion: 1, usedInAssessmentCount: 0,
  correctionReason: null, createdByUserId: 'teacher', updatedByUserId: 'teacher',
  createdAt: '2025-09-01T00:00:00Z', updatedAt: '2025-09-01T00:00:00Z'
};

test('remedial evidence uses authenticated instance and only confirmed flags', async () => {
  const originalRequest = unifiedApiClient.requestSchoolFlow;
  const calls: string[] = [];
  unifiedApiClient.requestSchoolFlow = async <T,>(endpoint: string, options?: RequestInit, instanceId?: string): Promise<T> => {
    calls.push(endpoint);
    assert.equal(instanceId, 'instance');
    assert.equal(options?.cache, 'no-store');
    if (endpoint.endsWith('/assignments')) {
      return { success: true, assignments: [] } as T;
    }
    return {
      success: true,
      deliveries: [delivery, { ...delivery, id: 'unconfirmed', completionConfirmedByTeacher: false },
        { ...delivery, id: 'unflagged', remedialNeeded: false }]
    } as T;
  };
  try {
    const result = await loadRemedialEvidence('instance');
    assert.deepEqual(result.deliveries.map(item => item.id), ['delivery-1']);
    assert.deepEqual(calls, ['/api/v1/teaching/assignments', '/api/v1/teaching/deliveries']);
  } finally {
    unifiedApiClient.requestSchoolFlow = originalRequest;
  }
});

test('remedial evidence surfaces service failures instead of returning empty data', async () => {
  const original = unifiedApiClient.requestSchoolFlow;
  unifiedApiClient.requestSchoolFlow = async () => { throw new Error('Access denied'); };
  try {
    await assert.rejects(loadRemedialEvidence('instance'), /Access denied/);
  } finally {
    unifiedApiClient.requestSchoolFlow = original;
  }
});

test('malformed teaching evidence is not treated as an empty result', async () => {
  const original = unifiedApiClient.requestSchoolFlow;
  unifiedApiClient.requestSchoolFlow = async <T,>(): Promise<T> => ({ success: true } as T);
  try {
    await assert.rejects(loadRemedialEvidence('instance'), /invalid response/);
  } finally {
    unifiedApiClient.requestSchoolFlow = original;
  }
});

test('class-level evidence is not represented as a student intervention', () => {
  const assignment = { id: 'assignment', subjectName: 'Mathematics' } as TeacherSubjectAssignmentDto;
  const html = renderToStaticMarkup(<RemedialEvidenceList evidence={{ assignments: [assignment], deliveries: [delivery] }} />);
  assert.match(html, /Mathematics/);
  assert.match(html, /teacher self reported/);
  assert.match(html, /unverified/);
  assert.doesNotMatch(html, /Mastery:|Assign intervention/);
  assert.match(renderToStaticMarkup(<RemedialEvidenceWorkspace />), /not individual student gaps or completed interventions/);
});
