const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|cipa_req_[A-Za-z0-9_-]{1,80})$/i;
const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const OPERATIONS = new Set([
  'verify_only',
  'repository_remediation',
  'provision_database',
  'provision_storage',
  'create_customer_project',
  'deploy_application'
]);
const ENVIRONMENTS = new Set(['staging', 'production']);
const MODES = new Set(['repository', 'infrastructure']);

export const STATES = Object.freeze([
  'REQUESTED',
  'PREFLIGHT_RUNNING',
  'PREFLIGHT_FAILED',
  'PIAM_UNAVAILABLE',
  'PIAM_PENDING',
  'PIAM_REJECTED',
  'PIAM_VERIFIED',
  'HUMAN_REVIEW_PENDING',
  'HUMAN_APPROVED',
  'HUMAN_REJECTED',
  'REMEDIATION_RUNNING',
  'REMEDIATION_FAILED',
  'VALIDATION_RUNNING',
  'VALIDATION_FAILED',
  'READY_FOR_PROVISIONING',
  'PROVISIONING_BLOCKED',
  'COMPLETED'
]);

const TRANSITIONS = {
  REQUESTED: ['PREFLIGHT_RUNNING', 'PREFLIGHT_FAILED'],
  PREFLIGHT_RUNNING: ['PREFLIGHT_FAILED', 'PIAM_UNAVAILABLE', 'PIAM_PENDING'],
  PREFLIGHT_FAILED: [],
  PIAM_UNAVAILABLE: ['HUMAN_REVIEW_PENDING'],
  PIAM_PENDING: ['PIAM_VERIFIED', 'PIAM_REJECTED', 'PIAM_UNAVAILABLE'],
  PIAM_REJECTED: [],
  PIAM_VERIFIED: ['HUMAN_REVIEW_PENDING'],
  HUMAN_REVIEW_PENDING: ['HUMAN_APPROVED', 'HUMAN_REJECTED'],
  HUMAN_APPROVED: ['REMEDIATION_RUNNING', 'VALIDATION_RUNNING', 'PROVISIONING_BLOCKED'],
  HUMAN_REJECTED: [],
  REMEDIATION_RUNNING: ['REMEDIATION_FAILED', 'VALIDATION_RUNNING'],
  REMEDIATION_FAILED: [],
  VALIDATION_RUNNING: ['VALIDATION_FAILED', 'READY_FOR_PROVISIONING', 'COMPLETED'],
  VALIDATION_FAILED: [],
  READY_FOR_PROVISIONING: ['PROVISIONING_BLOCKED', 'COMPLETED'],
  PROVISIONING_BLOCKED: [],
  COMPLETED: []
};

function isSafeReference(reference, repository) {
  if (/^#\d{1,10}$/.test(reference) || /^approval:[A-Za-z0-9._:-]{1,120}$/.test(reference)) return true;
  const url = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(issues|pull)\/(\d{1,10})\/?$/.exec(reference);
  return Boolean(url && url[1].toLowerCase() === repository.toLowerCase());
}

export function referenceLookupPath(reference, repository) {
  if (/^#\d{1,10}$/.test(reference)) {
    return `repos/${repository}/issues/${reference.slice(1)}`;
  }
  const url = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(issues|pull)\/(\d{1,10})\/?$/.exec(reference);
  if (url && url[1].toLowerCase() === repository.toLowerCase()) {
    return `repos/${repository}/${url[2] === 'pull' ? 'pulls' : 'issues'}/${url[3]}`;
  }
  if (/^approval:[A-Za-z0-9._:-]{1,120}$/.test(reference)) {
    throw new Error('Approval-record references cannot be verified: no PIAM record lookup API is configured. Reference a same-repository issue or pull request.');
  }
  throw new Error('Reference is not a same-repository issue or pull request.');
}

export function validateRequest(input) {
  const values = {
    requestId: String(input.requestId ?? '').trim(),
    tenantId: String(input.tenantId ?? '').trim(),
    operation: String(input.operation ?? '').trim(),
    targetEnvironment: String(input.targetEnvironment ?? '').trim(),
    remediationMode: String(input.remediationMode ?? '').trim(),
    reference: String(input.reference ?? '').trim(),
    targetProjectId: String(input.targetProjectId ?? '').trim(),
    repository: String(input.repository ?? '').trim()
  };
  const errors = [];
  if (!REQUEST_ID.test(values.requestId)) errors.push('Invalid provisioning request ID.');
  if (!UUID.test(values.tenantId)) errors.push('Tenant/school ID must be a UUID.');
  if (!OPERATIONS.has(values.operation)) errors.push('Requested operation is not in the supported operation list.');
  if (!ENVIRONMENTS.has(values.targetEnvironment)) errors.push('Target environment must be staging or production.');
  if (!MODES.has(values.remediationMode)) errors.push('Remediation mode must be repository or infrastructure.');
  if (!values.repository || !isSafeReference(values.reference, values.repository)) {
    errors.push('Reference must identify an issue, pull request, or approval record in this repository; approval records require a configured PIAM lookup.');
  }
  const infrastructureOperations = new Set([
    'provision_database', 'provision_storage', 'create_customer_project', 'deploy_application'
  ]);
  if (values.remediationMode === 'infrastructure' && !infrastructureOperations.has(values.operation)) {
    errors.push('Infrastructure mode requires an explicitly listed infrastructure operation.');
  }
  if (values.remediationMode === 'repository' &&
      !['verify_only', 'repository_remediation'].includes(values.operation)) {
    errors.push('Repository mode cannot request an infrastructure operation.');
  }
  if (infrastructureOperations.has(values.operation) && !PROJECT_ID.test(values.targetProjectId)) {
    errors.push('Infrastructure requests require a valid target GCP project ID.');
  }
  if (values.targetProjectId && !PROJECT_ID.test(values.targetProjectId)) {
    errors.push('Target GCP project ID is malformed.');
  }
  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return values;
}

export function verifyPreflight(input) {
  const failures = [];
  if (input.eventName !== 'workflow_dispatch') failures.push('Only manual workflow_dispatch runs are permitted.');
  if (input.ref !== 'refs/heads/main') failures.push('The workflow must run from refs/heads/main.');
  if (input.refProtected !== 'true') failures.push('The selected branch is not reported as protected by GitHub.');
  if (input.repositoryState !== 'clean') failures.push('The checked-out repository state is not clean.');
  if (failures.length) {
    const error = new Error(failures.join(' '));
    error.code = 'PREFLIGHT_FAILED';
    throw error;
  }
  return { status: 'passed', branch: 'main', referenceVerified: 'format_only' };
}

export function verifyEnvironmentProtection(environment, expectedName) {
  const reviewerRule = Array.isArray(environment?.protection_rules)
    ? environment.protection_rules.find(rule => rule.type === 'required_reviewers')
    : undefined;
  const reviewers = reviewerRule?.reviewers;
  if (environment?.name !== expectedName ||
      !Array.isArray(reviewers) || reviewers.length === 0 ||
      reviewers.some(item => !['User', 'Team'].includes(item?.type) ||
        !Number.isSafeInteger(item?.reviewer?.id) || item.reviewer.id <= 0) ||
      reviewerRule.prevent_self_review !== true ||
      environment.deployment_branch_policy?.protected_branches !== true ||
      environment.deployment_branch_policy?.custom_branch_policies !== false) {
    throw new Error(`GitHub Environment ${expectedName} is missing required reviewers, self-review prevention, or protected-branch restrictions.`);
  }
  return { name: expectedName, requiredReviewers: reviewers.length, protectedBranches: true };
}

export function transitionState(from, to) {
  if (!STATES.includes(from) || !STATES.includes(to) || !TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid governance state transition: ${from} -> ${to}`);
  }
  return to;
}

function escapeMarkdown(value) {
  return String(value ?? 'not supplied').replace(/[|`\r\n]/g, ' ');
}

export function renderReviewSummary(request, piamStatus = 'PIAM_UNAVAILABLE') {
  return [
    '## PIAM governance request — human review',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Request ID | ${escapeMarkdown(request.requestId)} |`,
    `| Tenant/school | ${escapeMarkdown(request.tenantId)} |`,
    `| Operation | ${escapeMarkdown(request.operation)} |`,
    `| Target environment | ${escapeMarkdown(request.targetEnvironment)} |`,
    `| Target project | ${escapeMarkdown(request.targetProjectId || 'not configured')} |`,
    `| Remediation mode | ${escapeMarkdown(request.remediationMode)} |`,
    `| Reference | ${escapeMarkdown(request.reference)} |`,
    `| PIAM verification | ${escapeMarkdown(piamStatus)} |`,
    '| Approval evidence | unavailable; no PIAM adapter is configured |',
    '| Proposed change | repository validation only; infrastructure actions are disabled |',
    '| Validation | See preflight job results in this workflow run |',
    '| Outstanding risks | PIAM is unavailable; no independent approval evidence exists |',
    '| Human authorization | GitHub Environment reviewer decision; not PIAM approval |',
    '',
    'Approval of this GitHub Environment does not authorize or unblock infrastructure provisioning.'
  ].join('\n');
}

export function createExecutionReport(input) {
  const transitions = ['REQUESTED'];
  let state = transitionState(transitions.at(-1), 'PREFLIGHT_RUNNING');
  transitions.push(state);
  if (input.preflightResult !== 'success') {
    state = transitionState(state, 'PREFLIGHT_FAILED');
    transitions.push(state);
  } else {
    state = transitionState(state, 'PIAM_UNAVAILABLE');
    transitions.push(state);
    if (input.humanReviewResult === 'success') {
      state = transitionState(state, 'HUMAN_REVIEW_PENDING');
      transitions.push(state);
      state = transitionState(state, 'HUMAN_APPROVED');
      transitions.push(state);
      if (input.remediationMode === 'infrastructure') {
        state = transitionState(state, 'PROVISIONING_BLOCKED');
        transitions.push(state);
      } else {
        state = transitionState(state, 'VALIDATION_RUNNING');
        transitions.push(state);
        state = input.repositoryRemediationResult === 'success'
          ? transitionState(state, 'COMPLETED')
          : transitionState(state, 'VALIDATION_FAILED');
        transitions.push(state);
      }
    } else if (input.humanReviewResult === 'failure') {
      state = transitionState(state, 'HUMAN_REVIEW_PENDING');
      transitions.push(state);
      state = transitionState(state, 'HUMAN_REJECTED');
      transitions.push(state);
    }
  }
  return {
    schemaVersion: 1,
    repository: input.repository,
    commitSha: input.commitSha,
    workflowRunId: input.workflowRunId,
    workflowRunUrl: input.workflowRunUrl,
    initiatingGitHubIdentity: input.initiator,
    humanReviewerIdentity: 'Not exposed to workflow context; see GitHub deployment audit record.',
    requestId: input.requestId,
    tenantId: input.tenantId,
    targetProjectId: input.targetProjectId || null,
    targetEnvironment: input.targetEnvironment,
    operation: input.operation,
    remediationMode: input.remediationMode,
    reference: input.reference,
    referenceVerification: input.referenceVerification || 'not_verified',
    piamVerification: 'PIAM_UNAVAILABLE',
    approvalEvidenceStatus: 'unavailable',
    provisioningContract: {
      status: 'not supplied to workflow',
      version: null,
      sha256: null
    },
    githubHumanAuthorization: input.humanReviewResult === 'success'
      ? 'approved_by_environment_protection'
      : input.humanReviewResult === 'failure'
        ? 'rejected_or_cancelled'
        : 'not_completed',
    repositoryChecks: input.preflightResult === 'success' ? 'passed' : 'failed_or_not_run',
    testResults: {
      typescript: input.preflightResult === 'success' ? 'passed' : 'failed_or_not_run',
      unitAndPostgresIntegration: input.preflightResult === 'success' ? 'passed' : 'failed_or_not_run',
      mandatoryPostgresAcceptance: input.preflightResult === 'success' ? 'passed' : 'failed_or_not_run',
      productionBuild: input.preflightResult === 'success' ? 'passed' : 'failed_or_not_run',
      postReviewGovernanceTests: input.repositoryRemediationResult === 'success'
        ? 'passed'
        : 'failed_or_not_run'
    },
    remediationActions: input.remediationMode === 'repository'
      ? 'Validation only; no source files or branches were modified.'
      : 'None; infrastructure execution is disabled.',
    infrastructureChanges: [],
    outstandingRisks: [
      'PIAM_UNAVAILABLE: no independent approval evidence or verifier is configured.',
      'The workflow does not receive a signed provisioning contract or exact resource allocation evidence.'
    ],
    failureReasons: [
      ...(input.preflightResult === 'success' ? [] : ['Repository preflight did not succeed.']),
      ...(input.remediationMode === 'infrastructure'
        ? ['Infrastructure provisioning is blocked until independent PIAM verification and a separate deployment implementation exist.']
        : []),
      ...(input.humanReviewResult === 'failure' ? ['GitHub Environment review was rejected or cancelled.'] : []),
      ...(input.humanReviewResult !== 'success' && input.humanReviewResult !== 'failure'
        ? ['GitHub Environment review did not complete.']
        : [])
    ],
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    state,
    stateTransitions: transitions
  };
}
