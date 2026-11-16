import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE as template } from '../../packages/shared-types/src/schoolAdministrationTemplate';

test('draft school administration template cannot be provisioned or enable unrelated features', () => {
  assert.equal(template.templateId, 'school_administration_identity');
  assert.equal(template.provisionable, false);
  assert.equal(template.status, 'draft');
  assert.deepEqual(template.featureDependencies, []);
  assert.deepEqual(template.optionalCapabilities, []);
  assert.ok(template.deploymentArchitectures.every(item => item.support === 'planned'));
});

test('default configuration conforms to the declared student gender policy', () => {
  const schema = template.configurationSchema;
  assert.deepEqual(Object.keys(template.defaultConfiguration), [...schema.required]);
  assert.ok(
    (schema.properties.studentGenderPolicy.enum as readonly string[])
      .includes(template.defaultConfiguration.studentGenderPolicy)
  );
  assert.equal(schema.additionalProperties, false);
});
