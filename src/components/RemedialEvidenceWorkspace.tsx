import React, { useEffect, useState } from 'react';
import { unifiedApiClient } from '../services/unifiedApiClient';
import type { TeacherSubjectAssignmentDto, TeachingDeliveryRecordDto } from '../services/teachingEvidenceApiClient';

export interface RemedialEvidence {
  assignments: TeacherSubjectAssignmentDto[];
  deliveries: TeachingDeliveryRecordDto[];
}

export async function loadRemedialEvidence(instanceId: string): Promise<RemedialEvidence> {
  if (!instanceId.trim()) throw new Error('A school application instance is required.');
  const [assignmentResponse, deliveryResponse] = await Promise.all([
    unifiedApiClient.requestSchoolFlow<{ success: boolean; assignments: TeacherSubjectAssignmentDto[] }>(
      '/api/v1/teaching/assignments', { method: 'GET', cache: 'no-store' }, instanceId
    ),
    unifiedApiClient.requestSchoolFlow<{ success: boolean; deliveries: TeachingDeliveryRecordDto[] }>(
      '/api/v1/teaching/deliveries', { method: 'GET', cache: 'no-store' }, instanceId
    )
  ]);
  if (!assignmentResponse.success || !Array.isArray(assignmentResponse.assignments) ||
      !deliveryResponse.success || !Array.isArray(deliveryResponse.deliveries)) {
    throw new Error('The teaching evidence service returned an invalid response.');
  }
  return {
    assignments: assignmentResponse.assignments,
    deliveries: deliveryResponse.deliveries.filter(delivery =>
      delivery.remedialNeeded === true &&
      delivery.completionConfirmedByTeacher === true &&
      (delivery.status === 'taught' || delivery.status === 'completed')
    )
  };
}

function messageFor(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('error' in error && typeof error.error === 'string') return error.error;
    if ('message' in error && typeof error.message === 'string') return error.message;
  }
  return 'Teaching evidence could not be loaded.';
}

export const RemedialEvidenceList: React.FC<{ evidence: RemedialEvidence }> = ({ evidence }) => {
  if (evidence.deliveries.length === 0) return <p>No teacher-confirmed remedial flags found.</p>;
  return (
    <ul className="space-y-3">
      {evidence.deliveries.map(delivery => {
        const assignment = evidence.assignments.find(item => item.id === delivery.assignmentId);
        return (
          <li key={delivery.id} className="rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold">{delivery.resolvedTopicTitle || delivery.topicTitleInput}</h3>
            <p className="text-sm">
              {assignment?.subjectName || delivery.subjectId} · {delivery.classGradeName} · {delivery.section}
              {' · '}{delivery.academicSession} · {delivery.term}
            </p>
            <p className="mt-2 text-sm">Curriculum version: {delivery.curriculumVersionId}</p>
            {delivery.remedialTopic && <p className="text-sm">Teacher's suggested topic: {delivery.remedialTopic}</p>}
            {delivery.teacherComments && <p className="text-sm">Teacher's comments: {delivery.teacherComments}</p>}
            <p className="mt-2 text-sm text-slate-400">
              Evidence: {delivery.verificationBasis.replaceAll('_', ' ')}; administrator review: {delivery.adminVerificationStatus}.
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export const RemedialEvidenceWorkspace: React.FC = () => {
  const [evidence, setEvidence] = useState<RemedialEvidence | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [instanceId, setInstanceId] = useState('');
  const [instanceInput, setInstanceInput] = useState('');
  const [instanceError, setInstanceError] = useState('');
  const [resolvingInstance, setResolvingInstance] = useState(true);

  useEffect(() => {
    let active = true;
    unifiedApiClient.getMySchool()
      .then(school => {
        if (!active) return;
        if (!school.instance?.id) {
          setInstanceError('The school application instance is unavailable.');
          return;
        }
        setInstanceInput(school.instance.id);
        setInstanceId(school.instance.id);
      })
      .catch(reason => { if (active) setInstanceError(messageFor(reason)); })
      .finally(() => { if (active) setResolvingInstance(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!instanceId) return;
    let active = true;
    setLoading(true);
    setError('');
    setEvidence(null);
    loadRemedialEvidence(instanceId)
      .then(result => { if (active) setEvidence(result); })
      .catch(reason => { if (active) setError(messageFor(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [instanceId, attempt]);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-200">
      <h1 className="text-xl font-bold text-white">Remedial teaching evidence</h1>
      <p className="text-sm">
        These are class-level flags from teaching delivery records, not individual student gaps or completed interventions.
        Student assignments, reassessment and progress tracking are not yet available.
      </p>
      {resolvingInstance && <p role="status">Loading school application instance...</p>}
      {instanceError && (
        <form onSubmit={event => {
          event.preventDefault();
          setEvidence(null);
          setInstanceId(instanceInput.trim());
          setAttempt(value => value + 1);
        }} className="space-y-2 text-sm">
          <p>Could not retrieve the school application instance: {instanceError}</p>
          <label className="block">
            Application instance ID
            <input required value={instanceInput} onChange={event => setInstanceInput(event.target.value)}
              className="ml-2 rounded border border-slate-600 bg-slate-800 p-2" />
          </label>
          <button type="submit" className="underline">Load evidence</button>
        </form>
      )}
      {loading && <p role="status">Loading teaching evidence...</p>}
      {error && (
        <div role="alert">
          <p>Unable to load teaching evidence: {error}</p>
          <button type="button" className="mt-2 underline" onClick={() => setAttempt(value => value + 1)}>Retry</button>
        </div>
      )}
      {evidence && <RemedialEvidenceList evidence={evidence} />}
    </section>
  );
};
