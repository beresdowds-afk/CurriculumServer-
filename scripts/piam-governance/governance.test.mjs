import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createExecutionReport,
  referenceLookupPath,
  renderReviewSummary,
  transitionState,
  validateRequest,
  verifyEnvironmentProtection,
  verifyPreflight
} from './governance.mjs';

const request = {
  requestId: 'cipa_req_2026_test',
  tenantId: '21234567-89ab-4cde-8fab-0123456789ab',
  operation: 'repository_remediation',
  targetEnvironment: 'staging',
  remediationMode: 'repository',
  reference: '#123',
  targetProjectId: '',
  repository: 'beresdowds-afk/CurriculumServer-'
};

test('validates controlled request fields and rejects unsafe references or mismatched modes', () => {
  assert.deepEqual(validateRequest(request), request);
  assert.throws(() => validateRequest({ ...request, tenantId: 'not-a-tenant' }), /Tenant\/school ID/);
  assert.throws(() => validateRequest({ ...request, operation: 'run arbitrary shell' }), /supported operation list/);
  assert.throws(() => validateRequest({ ...request, reference: 'https://example.com/attacker' }), /Reference must identify/);
  assert.equal(referenceLookupPath('#123', request.repository), 'repos/beresdowds-afk/CurriculumServer-/issues/123');
  assert.equal(
    referenceLookupPath('https://github.com/beresdowds-afk/CurriculumServer-/pull/124', request.repository),
    'repos/beresdowds-afk/CurriculumServer-/pulls/124'
  );
  assert.throws(() => referenceLookupPath('approval:record-1', request.repository), /no PIAM record lookup API/);
  assert.throws(() => validateRequest({ ...request, operation: 'provision_database' }), /cannot request an infrastructure operation/);
  assert.throws(() => validateRequest({
    ...request, operation: 'provision_database', remediationMode: 'infrastructure'
  }), /require a valid target GCP project ID/);
});

test('requires a protected main-branch manual run and clean checkout', () => {
  const valid = {
    eventName: 'workflow_dispatch',
    ref: 'refs/heads/main',
    refProtected: 'true',
    repositoryState: 'clean'
  };
  assert.equal(verifyPreflight(valid).status, 'passed');
  for (const override of [
    { eventName: 'pull_request' },
    { ref: 'refs/heads/feature' },
    { refProtected: 'false' },
    { repositoryState: 'dirty' }
  ]) {
    assert.throws(() => verifyPreflight({ ...valid, ...override }));
  }
});

test('requires a required reviewer, self-review prevention, and protected-branch environment policy', () => {
  const configured = {
    name: 'piam-review',
    protection_rules: [{
      type: 'required_reviewers',
      reviewers: [{ type: 'Team', reviewer: { id: 123 } }],
      prevent_self_review: true
    }],
    deployment_branch_policy: { protected_branches: true, custom_branch_policies: false }
  };
  assert.equal(verifyEnvironmentProtection(configured, 'piam-review').requiredReviewers, 1);
  for (const change of [
    { protection_rules: [] },
    { protection_rules: [{ type: 'required_reviewers', reviewers: [], prevent_self_review: true }] },
    { protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'Admin', reviewer: { id: 1 } }], prevent_self_review: true }] },
    { protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: 0 } }], prevent_self_review: true }] },
    { protection_rules: [{ type: 'required_reviewers', reviewers: [{ id: 1 }], prevent_self_review: false }] },
    { deployment_branch_policy: null },
    { name: 'another-environment' }
  ]) {
    assert.throws(() => verifyEnvironmentProtection({ ...configured, ...change }, 'piam-review'));
  }
});

test('PIAM unavailable cannot transition to verified and GitHub approval does not change PIAM status', () => {
  assert.throws(() => transitionState('PIAM_UNAVAILABLE', 'PIAM_VERIFIED'), /Invalid governance state transition/);
  const summary = renderReviewSummary(request);
  assert.match(summary, /PIAM_UNAVAILABLE/);
  assert.match(summary, /not PIAM approval/i);
  const report = createExecutionReport({
    repository: request.repository,
    commitSha: 'a'.repeat(40),
    workflowRunId: '42',
    workflowRunUrl: 'https://github.com/beresdowds-afk/CurriculumServer-/actions/runs/42',
    initiator: 'requester',
    requestId: request.requestId,
    tenantId: request.tenantId,
    targetProjectId: '',
    targetEnvironment: 'staging',
    operation: request.operation,
    remediationMode: 'repository',
    reference: request.reference,
    preflightResult: 'success',
    humanReviewResult: 'success',
    repositoryRemediationResult: 'success',
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString()
  });
  assert.equal(report.piamVerification, 'PIAM_UNAVAILABLE');
  assert.equal(report.githubHumanAuthorization, 'approved_by_environment_protection');
  assert.equal(report.state, 'COMPLETED');
  assert.ok(report.stateTransitions.includes('PIAM_UNAVAILABLE'));
  assert.ok(!report.stateTransitions.includes('PIAM_VERIFIED'));
  assert.deepEqual(report.infrastructureChanges, []);
});

test('infrastructure requests remain blocked after GitHub human approval', () => {
  const report = createExecutionReport({
    repository: request.repository,
    commitSha: 'b'.repeat(40),
    workflowRunId: '43',
    workflowRunUrl: 'https://github.com/beresdowds-afk/CurriculumServer-/actions/runs/43',
    initiator: 'requester',
    requestId: request.requestId,
    tenantId: request.tenantId,
    targetProjectId: 'school-test-12345',
    targetEnvironment: 'production',
    operation: 'provision_database',
    remediationMode: 'infrastructure',
    reference: request.reference,
    preflightResult: 'success',
    humanReviewResult: 'success',
    repositoryRemediationResult: 'not_run',
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString()
  });
  assert.equal(report.state, 'PROVISIONING_BLOCKED');
  assert.equal(report.piamVerification, 'PIAM_UNAVAILABLE');
  assert.equal(report.infrastructureChanges.length, 0);
});
