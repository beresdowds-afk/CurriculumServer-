export type SchoolAdministrationCapability =
  | 'school_identity'
  | 'student_register'
  | 'class_groups'
  | 'staff_records'
  | 'administrative_organization'
  | 'accounts_and_memberships'
  | 'student_lifecycle';

export interface SchoolAdministrationConfiguration {
  studentGenderPolicy: 'optional' | 'required' | 'not_collected';
}

export interface SchoolAdministrationTemplateManifest {
  readonly templateId: 'school_administration_identity';
  readonly templateVersion: string;
  readonly displayName: string;
  readonly description: string;
  readonly status: 'draft';
  readonly provisionable: false;
  readonly capabilities: readonly SchoolAdministrationCapability[];
  readonly requiredPlatformCapabilities: readonly string[];
  readonly migrationDependencies: readonly string[];
  readonly deploymentArchitectures: ReadonlyArray<{
    readonly architecture: 'shared_database' | 'dedicated_database' | 'dedicated_infrastructure';
    readonly support: 'planned';
  }>;
  readonly featureDependencies: readonly string[];
  readonly optionalCapabilities: readonly string[];
  readonly apiContractVersion: 'unreleased';
  readonly configurationSchema: {
    readonly $schema: string;
    readonly type: 'object';
    readonly additionalProperties: false;
    readonly required: readonly ['studentGenderPolicy'];
    readonly properties: {
      readonly studentGenderPolicy: {
        readonly type: 'string';
        readonly enum: readonly SchoolAdministrationConfiguration['studentGenderPolicy'][];
      };
    };
  };
  readonly defaultConfiguration: Readonly<SchoolAdministrationConfiguration>;
  readonly upgradeCompatibility: {
    readonly compatibleFrom: readonly string[];
    readonly notes: string;
  };
  readonly provisioningRequirements: readonly string[];
}

/**
 * Draft contract only: no builder or provisioning path may treat this as an
 * implemented application until the listed requirements have been completed.
 */
export const SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE = {
  templateId: 'school_administration_identity',
  templateVersion: '0.1.0',
  displayName: 'School Administration & Identity',
  description: 'Reusable school administration, identity, and student lifecycle foundation.',
  status: 'draft',
  provisionable: false,
  capabilities: [
    'school_identity',
    'student_register',
    'class_groups',
    'staff_records',
    'administrative_organization',
    'accounts_and_memberships',
    'student_lifecycle'
  ],
  requiredPlatformCapabilities: [
    'postgresql',
    'verified_tenant_context',
    'separate_runtime_and_control_plane_identities',
    'tenant_isolation',
    'durable_audit'
  ],
  migrationDependencies: [
    '005_production_tenant_boundary.sql',
    '006_school_instance_provisioning.sql'
  ],
  deploymentArchitectures: [
    { architecture: 'shared_database', support: 'planned' },
    { architecture: 'dedicated_database', support: 'planned' },
    { architecture: 'dedicated_infrastructure', support: 'planned' }
  ],
  featureDependencies: [],
  optionalCapabilities: [],
  apiContractVersion: 'unreleased',
  configurationSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    required: ['studentGenderPolicy'],
    properties: {
      studentGenderPolicy: {
        type: 'string',
        enum: ['optional', 'required', 'not_collected']
      }
    }
  },
  defaultConfiguration: { studentGenderPolicy: 'optional' },
  upgradeCompatibility: {
    compatibleFrom: [],
    notes: 'Initial draft; no released version or upgrade path exists.'
  },
  provisioningRequirements: [
    'Complete and verify the administration domain migrations and repositories.',
    'Separate privileged control-plane and tenant runtime database identities.',
    'Verify transactional lifecycle and tenant isolation with disposable PostgreSQL.',
    'Publish an API contract and authorize provisioning explicitly.'
  ]
} as const satisfies SchoolAdministrationTemplateManifest;
