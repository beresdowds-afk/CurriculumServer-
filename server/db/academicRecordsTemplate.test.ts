import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACADEMIC_RECORDS_FEATURE_TEMPLATE as template } from '../../src/data/academicRecordsFeatureTemplate';
import { DEFAULT_ASSESSMENT_COMPONENTS } from '../academicRecords/weightedScore';
import { APPLICATION_FEATURE_TEMPLATE_REGISTRY, buildApplicationInstanceConfiguration, validateApplicationInstanceConfiguration } from '../../src/data/applicationInstanceConfiguration';
import { validateProvisionableFeatures } from '../../src/data/applicationRegistryData';

test('academic records template specifies the score model and mandatory manual score safeguards', () => {
  assert.deepEqual(template.defaultAssessmentComponents, DEFAULT_ASSESSMENT_COMPONENTS);
  assert.deepEqual(template.manualScorePolicy, {
    teacherAssignmentRequired: true,
    taughtOnlyAuthorizationRequired: true,
    principalOrSupervisorApprovalRequired: true
  });
  assert.ok(APPLICATION_FEATURE_TEMPLATE_REGISTRY.some(entry =>
    entry.featureId === template.featureId && entry.templateId === template.templateId && !entry.provisionable
  ));
});

test('unfinished academic records cannot be provisioned or enabled through feature settings', () => {
  assert.equal(validateProvisionableFeatures('app_curriculum_flow', [
    'feat_student_registration', 'feat_exam_management', template.featureId
  ]).valid, false);
  const baseline = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    deploymentArchitecture: 'shared_database'
  });
  const result = validateApplicationInstanceConfiguration({
    ...baseline,
    featureConfigurations: {
      [template.featureId]: {
        templateId: template.templateId,
        templateVersion: template.templateVersion,
        settings: { principalOrSupervisorApprovalRequired: false }
      }
    }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Academic records template is registered but not provisionable.'));
});
