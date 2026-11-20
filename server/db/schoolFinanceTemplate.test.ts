import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SCHOOL_FINANCE_FEATURE_TEMPLATE as template,
  validateSchoolFinanceTemplateSettings
} from '../../src/data/schoolFinanceFeatureTemplate';
import {
  APPLICATION_FEATURE_TEMPLATE_REGISTRY,
  buildApplicationInstanceConfiguration,
  validateApplicationInstanceConfiguration
} from '../../src/data/applicationInstanceConfiguration';
import { validateProvisionableFeatures } from '../../src/data/applicationRegistryData';

const settings = {
  requestedProviders: ['opay', 'paystack', 'flutterwave'],
  requestedCapabilities: ['fee_collection', 'invoicing', 'accounting', 'payroll', 'reporting'],
  proprietorApprovalRequired: true
};

test('school finance template records intent and requires proprietor and provider approval', () => {
  assert.equal(template.status, 'draft');
  assert.equal(template.provisionable, false);
  assert.deepEqual(template.settlementAccountApproval, {
    proposalRole: 'principal',
    approvalRole: 'proprietor',
    proprietorApprovalRequired: true,
    providerVerificationRequired: true
  });
  assert.deepEqual(validateSchoolFinanceTemplateSettings(settings), { valid: true, errors: [], settings });
  assert.ok(APPLICATION_FEATURE_TEMPLATE_REGISTRY.some(entry =>
    entry.featureId === template.featureId && entry.templateId === template.templateId && !entry.provisionable
  ));
});

test('template settings reject bypasses, unsupported providers and embedded bank credentials', () => {
  for (const invalid of [
    { ...settings, proprietorApprovalRequired: false },
    { ...settings, proprietorApprovalRequired: undefined },
    { ...settings, requestedProviders: ['paystack', 'paystack'] },
    { ...settings, requestedProviders: ['unknown'] },
    { ...settings, requestedCapabilities: ['subscription_billing'] },
    { ...settings, accountNumber: '1234567890' },
    { ...settings, credentials: { secret: 'example' } },
    { ...settings, requestedProviders: [null] }
  ]) {
    const result = validateSchoolFinanceTemplateSettings(invalid);
    assert.equal(result.valid, false);
    assert.equal(result.settings, undefined);
    assert.ok(!JSON.stringify(result.errors).includes('1234567890'));
  }
});

test('unfinished finance feature and even valid intent settings cannot enter provisioning', () => {
  assert.equal(validateProvisionableFeatures('app_curriculum_flow', [
    'feat_student_registration', template.featureId
  ]).valid, false);
  const baseline = buildApplicationInstanceConfiguration({
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    templateVersion: '1',
    enabledCapabilities: ['feat_school_administration_identity'],
    deploymentArchitecture: 'shared_database'
  });
  const config = {
    ...baseline,
    featureConfigurations: {
      [template.featureId]: {
        templateId: template.templateId,
        templateVersion: template.templateVersion,
        settings
      }
    }
  };
  const result = validateApplicationInstanceConfiguration(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('School finance template is registered but not provisionable.'));
});
