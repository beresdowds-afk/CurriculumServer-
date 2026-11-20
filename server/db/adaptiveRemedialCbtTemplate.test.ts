import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE as template } from '../../src/data/adaptiveRemedialCbtFeatureTemplate';
import {
  APPLICATION_FEATURE_TEMPLATE_REGISTRY,
  buildApplicationInstanceConfiguration,
  validateApplicationInstanceConfiguration
} from '../../src/data/applicationInstanceConfiguration';
import { validateProvisionableFeatures } from '../../src/data/applicationRegistryData';

test('adaptive remedial and secure CBT is registered as an unprovisionable draft', () => {
  assert.equal(template.status, 'draft');
  assert.equal(template.provisionable, false);
  assert.ok(APPLICATION_FEATURE_TEMPLATE_REGISTRY.some(entry =>
    entry.applicationId === template.applicationId &&
    entry.featureId === template.featureId &&
    entry.templateId === template.templateId &&
    entry.versions.includes(template.templateVersion) &&
    !entry.provisionable
  ));
  assert.equal(validateProvisionableFeatures(template.applicationId, [
    'feat_student_registration', template.featureId
  ]).valid, false);
});

test('feature configuration cannot bypass the draft provisioning gate', () => {
  const baseline = buildApplicationInstanceConfiguration({
    applicationId: template.applicationId,
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
        settings: {}
      }
    }
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Adaptive remedial and secure CBT template is registered but not provisionable.'));
});
