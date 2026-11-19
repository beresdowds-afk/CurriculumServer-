import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import {
  createExecutionReport,
  renderReviewSummary,
  referenceLookupPath,
  validateRequest,
  verifyEnvironmentProtection,
  verifyPreflight
} from './governance.mjs';

function requestFromEnv() {
  return validateRequest({
    requestId: process.env.REQUEST_ID,
    tenantId: process.env.TENANT_ID,
    operation: process.env.REQUESTED_OPERATION,
    targetEnvironment: process.env.TARGET_ENVIRONMENT,
    remediationMode: process.env.REMEDIATION_MODE,
    reference: process.env.REQUEST_REFERENCE,
    targetProjectId: process.env.TARGET_PROJECT_ID,
    repository: process.env.GITHUB_REPOSITORY
  });
}

function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const content = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  appendFileSync(process.env.GITHUB_OUTPUT, content, 'utf8');
}

function summary(content) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${content}\n`, 'utf8');
  }
}

const command = process.argv[2];
if (command === 'validate-request') {
  const request = requestFromEnv();
  output({
    request_id: request.requestId,
    tenant_id: request.tenantId,
    operation: request.operation,
    target_environment: request.targetEnvironment,
    remediation_mode: request.remediationMode,
    target_project_id: request.targetProjectId,
    requested_at: new Date().toISOString()
  });
  summary([
    renderReviewSummary(request),
    '',
    `Workflow run: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    `Initiated by: ${process.env.GITHUB_ACTOR || 'unknown'}`
  ].join('\n'));
} else if (command === 'verify-preflight') {
  const request = requestFromEnv();
  const repositoryState = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    encoding: 'utf8'
  }).trim() ? 'dirty' : 'clean';
  const result = verifyPreflight({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    refProtected: process.env.GITHUB_REF_PROTECTED,
    repositoryState
  });
  output({ status: result.status });
  summary(`Preflight: **passed** on \`${result.branch}\`; issue/approval reference was format-checked only.`);
} else if (command === 'verify-environments') {
  const request = requestFromEnv();
  const names = ['piam-review'];
  if (request.remediationMode === 'infrastructure') {
    names.push(`provisioning-${request.targetEnvironment}`);
  }
  for (const name of names) {
    const raw = execFileSync('gh', ['api', `repos/${request.repository}/environments/${name}`], {
      encoding: 'utf8'
    });
    verifyEnvironmentProtection(JSON.parse(raw), name);
  }
  summary(`GitHub Environment protection verified for: ${names.join(', ')}.`);
} else if (command === 'verify-reference') {
  const request = requestFromEnv();
  const path = referenceLookupPath(request.reference, request.repository);
  const record = JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }));
  if (!Number.isSafeInteger(record?.number) || record.number <= 0 ||
      !record.html_url?.startsWith(`https://github.com/${request.repository}/`)) {
    throw new Error('Referenced GitHub issue or pull request could not be verified.');
  }
  output({ status: record.pull_request ? 'verified_pull_request' : 'verified_issue' });
  summary(`Request reference verified as an existing same-repository ${record.pull_request ? 'pull request' : 'issue'}.`);
} else if (command === 'piam-status') {
  output({ status: 'PIAM_UNAVAILABLE' });
  summary('PIAM verification: **PIAM_UNAVAILABLE**. No external approval API or verifier is configured.');
} else if (command === 'write-report') {
  const report = createExecutionReport({
    repository: process.env.GITHUB_REPOSITORY || 'unknown',
    commitSha: process.env.GITHUB_SHA || 'unknown',
    workflowRunId: process.env.GITHUB_RUN_ID || 'unknown',
    workflowRunUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    initiator: process.env.GITHUB_ACTOR || 'unknown',
    requestId: process.env.REQUEST_ID || 'unavailable',
    tenantId: process.env.TENANT_ID || 'unavailable',
    targetProjectId: process.env.TARGET_PROJECT_ID || '',
    targetEnvironment: process.env.TARGET_ENVIRONMENT || 'unavailable',
    operation: process.env.REQUESTED_OPERATION || 'unavailable',
    remediationMode: process.env.REMEDIATION_MODE || 'unavailable',
    reference: process.env.REQUEST_REFERENCE || 'unavailable',
    referenceVerification: process.env.REFERENCE_VERIFICATION || 'not_verified',
    preflightResult: process.env.PREFLIGHT_RESULT || 'not_run',
    humanReviewResult: process.env.HUMAN_REVIEW_RESULT || 'not_run',
    repositoryRemediationResult: process.env.REPOSITORY_REMEDIATION_RESULT || 'not_run',
    startedAt: process.env.REQUESTED_AT || new Date().toISOString(),
    completedAt: new Date().toISOString()
  });
  writeFileSync('piam-governance-report.json', `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  summary([
    '## PIAM governance execution report',
    '',
    `- Final state: **${report.state}**`,
    `- PIAM: **${report.piamVerification}**`,
    `- GitHub human authorization: **${report.githubHumanAuthorization}**`,
    `- Repository checks: **${report.repositoryChecks}**`,
    `- Infrastructure changes: **none**`,
    '- Reviewer identity: available in the GitHub deployment audit record, not exposed to the job.',
    '',
    ...report.failureReasons.map(reason => `- Blocker: ${reason}`)
  ].join('\n'));
} else if (command === 'assert-final') {
  const failures = [];
  if (process.env.PREFLIGHT_RESULT !== 'success') failures.push('Preflight did not succeed.');
  if (process.env.HUMAN_REVIEW_RESULT !== 'success') failures.push('Required GitHub Environment review did not complete successfully.');
  if (process.env.REMEDIATION_MODE === 'infrastructure') {
    failures.push('Infrastructure provisioning remains disabled; PIAM is unavailable.');
  }
  if (process.env.REMEDIATION_MODE === 'repository' &&
      process.env.REPOSITORY_REMEDIATION_RESULT !== 'success') {
    failures.push('Repository validation after human review did not succeed.');
  }
  if (failures.length) {
    throw new Error(failures.join(' '));
  }
} else {
  throw new Error('Unsupported governance command.');
}
