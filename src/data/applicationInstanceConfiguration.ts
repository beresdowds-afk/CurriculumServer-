// Versioned application-instance configuration contract shared by the
// Application Builder, the backend validator, the provisioning engine, the
// PostgreSQL application-instance repository, and runtime feature
// authorization. It has no server-only dependencies.
import {
  canonicalFeatureId,
  deriveFeatureReadiness,
  INITIAL_REGISTERED_APPLICATIONS,
  INITIAL_REGISTERED_FEATURES,
  validateProvisionableFeatures
} from './applicationRegistryData';
import { SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE } from '../../packages/shared-types/src/schoolAdministrationTemplate';
import type { ApplicationBuilderConfigurationV1 } from '../../packages/shared-types/src/apiContracts';
import { CENTRAL_SHARED_SERVICE_IDS } from '../../packages/shared-types/src/sharedServiceContracts';
import {
  LOGISTICS_FEATURE_TEMPLATE,
  validateLogisticsFeatureConfiguration
} from './logisticsFeatureTemplate';
import {
  SCHOOL_FINANCE_FEATURE_TEMPLATE,
  validateSchoolFinanceTemplateSettings
} from './schoolFinanceFeatureTemplate';
import { ACADEMIC_RECORDS_FEATURE_TEMPLATE } from './academicRecordsFeatureTemplate';
import { ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE } from './adaptiveRemedialCbtFeatureTemplate';
import {
  ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE,
  validateAttendanceCapabilityRequest
} from './attendanceDeviceProvisioningTemplate';

export const APPLICATION_CONFIGURATION_CONTRACT_VERSION = 1;

export type DeploymentArchitecture = 'shared_database' | 'dedicated_database' | 'dedicated_infrastructure';

// Architectures the provisioning engine can currently execute.
export const PROVISIONABLE_ARCHITECTURES: readonly DeploymentArchitecture[] = ['shared_database'];

export interface ApplicationTemplateReference {
  templateId: string;
  templateVersion: string;
}

export interface SupportedApplicationTemplate {
  applicationId: string;
  templateId: string;
  versions: string[];
}

export interface ApplicationTemplateRegistration extends SupportedApplicationTemplate {
  status: 'published' | 'draft';
  provisionable: boolean;
  capabilities: readonly string[];
}

export const APPLICATION_TEMPLATE_REGISTRY: readonly ApplicationTemplateRegistration[] = [
  {
    applicationId: 'app_curriculum_flow',
    templateId: 'school-standard',
    versions: ['1'],
    status: 'published',
    provisionable: true,
    capabilities: ['school_identity', 'student_register', 'class_groups', 'staff_records']
  },
  {
    applicationId: 'app_curriculum_flow',
    templateId: SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE.templateId,
    versions: [SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE.templateVersion],
    status: 'draft',
    provisionable: false,
    capabilities: SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE.capabilities
  }
];

export interface ApplicationFeatureTemplateRegistration {
  applicationId: string;
  featureId: string;
  templateId: string;
  versions: string[];
  status: 'published' | 'draft';
  provisionable: boolean;
}

export const APPLICATION_FEATURE_TEMPLATE_REGISTRY: readonly ApplicationFeatureTemplateRegistration[] = [
  {
    applicationId: 'app_curriculum_flow',
    featureId: LOGISTICS_FEATURE_TEMPLATE.featureId,
    templateId: LOGISTICS_FEATURE_TEMPLATE.templateId,
    versions: [LOGISTICS_FEATURE_TEMPLATE.templateVersion],
    status: 'draft',
    provisionable: false
  },
  {
    applicationId: SCHOOL_FINANCE_FEATURE_TEMPLATE.applicationId,
    featureId: SCHOOL_FINANCE_FEATURE_TEMPLATE.featureId,
    templateId: SCHOOL_FINANCE_FEATURE_TEMPLATE.templateId,
    versions: [SCHOOL_FINANCE_FEATURE_TEMPLATE.templateVersion],
    status: SCHOOL_FINANCE_FEATURE_TEMPLATE.status,
    provisionable: SCHOOL_FINANCE_FEATURE_TEMPLATE.provisionable
  },
  {
    applicationId: ACADEMIC_RECORDS_FEATURE_TEMPLATE.applicationId,
    featureId: ACADEMIC_RECORDS_FEATURE_TEMPLATE.featureId,
    templateId: ACADEMIC_RECORDS_FEATURE_TEMPLATE.templateId,
    versions: [ACADEMIC_RECORDS_FEATURE_TEMPLATE.templateVersion],
    status: ACADEMIC_RECORDS_FEATURE_TEMPLATE.status,
    provisionable: ACADEMIC_RECORDS_FEATURE_TEMPLATE.provisionable
  },
  {
    applicationId: ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.applicationId,
    featureId: ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.featureId,
    templateId: ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.templateId,
    versions: [ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.templateVersion],
    status: ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.status,
    provisionable: ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.provisionable
  },
  {
    applicationId: 'app_curriculum_flow',
    featureId: ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.featureId,
    templateId: ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.templateId,
    versions: [ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.templateVersion],
    status: 'draft',
    provisionable: false
  }
];

export const SUPPORTED_APPLICATION_TEMPLATES: readonly SupportedApplicationTemplate[] =
  APPLICATION_TEMPLATE_REGISTRY.filter(template => template.provisionable);

export type ApplicationInstanceConfiguration = ApplicationBuilderConfigurationV1;

export interface ApplicationConfigurationInput {
  applicationId: string;
  templateId: string;
  templateVersion: string;
  enabledCapabilities: string[];
  centralServiceDependencies?: string[];
  configurationVersion?: number;
  deploymentArchitecture: DeploymentArchitecture;
  featureConfigurations?: ApplicationBuilderConfigurationV1['featureConfigurations'];
}

export function validateApplicationInstanceConfiguration(
  value: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = value as Partial<ApplicationInstanceConfiguration> | undefined;
  if (!config || typeof config !== 'object') return { valid: false, errors: ['Configuration is required.'] };
  if (config.contractVersion !== APPLICATION_CONFIGURATION_CONTRACT_VERSION) {
    errors.push(`Unsupported configuration contract version '${String(config.contractVersion)}'.`);
  }
  const application = INITIAL_REGISTERED_APPLICATIONS.find(item => item.appId === config.applicationId);
  if (!application || application.lifecycleStatus !== 'published') {
    errors.push('Application is not a published registry application.');
  } else if (config.applicationVersion !== application.version) {
    errors.push(`Application version '${String(config.applicationVersion)}' is not the registered version.`);
  }
  if (!Number.isInteger(config.configurationVersion) || (config.configurationVersion as number) < 1) {
    errors.push('Configuration version must be a positive integer.');
  }
  if (!config.deploymentArchitecture || !PROVISIONABLE_ARCHITECTURES.includes(config.deploymentArchitecture)) {
    errors.push('Deployment architecture is not provisionable.');
  } else if (config.databaseStrategy?.engine !== 'postgresql' ||
             config.databaseStrategy.isolation !== config.deploymentArchitecture) {
    errors.push('Database strategy does not match the deployment architecture.');
  }

  if (!Array.isArray(config.templates) || config.templates.length === 0) {
    errors.push('At least one template is required.');
  } else {
    for (const template of config.templates) {
      const registration = APPLICATION_TEMPLATE_REGISTRY.find(item =>
        item.applicationId === config.applicationId && item.templateId === template?.templateId
      );
      if (!registration) errors.push(`Unsupported template '${String(template?.templateId)}'.`);
      else if (!registration.versions.includes(template.templateVersion)) {
        errors.push(`Unsupported template version '${String(template.templateVersion)}' for '${template.templateId}'.`);
      } else if (!registration.provisionable || registration.status !== 'published') {
        errors.push(`Template '${template.templateId}' is registered but not provisionable.`);
      }
    }
  }

  if (!Array.isArray(config.enabledCapabilities) || config.enabledCapabilities.length === 0) {
    errors.push('At least one capability must be enabled.');
  } else {
    for (const id of config.enabledCapabilities) {
      const canonical = canonicalFeatureId(id);
      if (canonical !== id) errors.push(`Use canonical capability '${canonical}' instead of '${id}'.`);
    }
    const serviceDependencies = config.centralServiceDependencies;
    if (serviceDependencies !== undefined) {
      if (!Array.isArray(serviceDependencies) ||
          serviceDependencies.some(id => typeof id !== 'string' ||
            !CENTRAL_SHARED_SERVICE_IDS.includes(id as typeof CENTRAL_SHARED_SERVICE_IDS[number])) ||
          new Set(serviceDependencies).size !== serviceDependencies.length) {
        errors.push('Central service dependencies must be unique registered central service identifiers.');
      }
    }
    errors.push(...validateProvisionableFeatures(config.applicationId ?? '', config.enabledCapabilities).errors);
    // The identity capability must never depend on unrelated modules.
    const identity = INITIAL_REGISTERED_FEATURES.find(f => f.featureId === 'feat_school_administration_identity');
    if (identity && identity.dependencies.length > 0) {
      errors.push('School Administration & Identity must not depend on other capabilities.');
    }
    for (const id of config.enabledCapabilities) {
      const registered = INITIAL_REGISTERED_FEATURES.find(f => f.featureId === id);
      const declared = config.capabilityDependencies?.[id];
      if (registered && JSON.stringify([...(declared ?? [])].sort()) !== JSON.stringify([...registered.dependencies].sort())) {
        errors.push(`Declared dependencies for '${id}' do not match the registry.`);
      }
    }
  }
  const evidence = config.validationEvidence;
  if (!evidence || evidence.validator !== 'application-configuration-contract' ||
      !evidence.validatedAt || !Array.isArray(evidence.checks) || evidence.checks.length === 0) {
    errors.push('Validation evidence is required.');
  }
  const featureConfigurations = config.featureConfigurations;
  if (featureConfigurations !== undefined &&
      (!featureConfigurations || typeof featureConfigurations !== 'object' || Array.isArray(featureConfigurations))) {
    errors.push('Feature configurations must be an object keyed by feature identifier.');
  } else for (const [featureId, rawFeatureConfiguration] of Object.entries(featureConfigurations ?? {})) {
    if (!rawFeatureConfiguration || typeof rawFeatureConfiguration !== 'object' ||
        Array.isArray(rawFeatureConfiguration)) {
      errors.push(`Feature configuration '${featureId}' must be an object.`);
      continue;
    }
    const featureConfiguration = rawFeatureConfiguration;
    const featureTemplate = APPLICATION_FEATURE_TEMPLATE_REGISTRY.find(template =>
      template.applicationId === config.applicationId &&
      template.featureId === featureId &&
      template.templateId === featureConfiguration.templateId
    );
    if (!featureTemplate) {
      errors.push(`Unsupported feature configuration '${featureId}'.`);
      continue;
    }
    if (!featureTemplate.versions.includes(featureConfiguration.templateVersion)) {
      errors.push(`Unsupported version for feature configuration '${featureId}'.`);
    }
    if (featureId === SCHOOL_FINANCE_FEATURE_TEMPLATE.featureId) {
      errors.push(...validateSchoolFinanceTemplateSettings(featureConfiguration.settings).errors);
      if (!featureTemplate.provisionable || featureTemplate.status !== 'published') {
        errors.push('School finance template is registered but not provisionable.');
      }
      continue;
    }
    if (featureId === ACADEMIC_RECORDS_FEATURE_TEMPLATE.featureId) {
      errors.push('Academic records template is registered but not provisionable.');
      continue;
    }
    if (featureId === ADAPTIVE_REMEDIAL_CBT_FEATURE_TEMPLATE.featureId) {
      errors.push('Adaptive remedial and secure CBT template is registered but not provisionable.');
      continue;
    }
    if (featureId === ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.featureId) {
      errors.push(...validateAttendanceCapabilityRequest(featureConfiguration.settings).errors);
      continue;
    }
    const logistics = validateLogisticsFeatureConfiguration(featureConfiguration.settings);
    errors.push(...logistics.errors);
    if (logistics.configuration) {
      const featureForCapability: Record<string, string> = {
        gate_security: 'feat_logistics_gate_security',
        guardian_pickup: 'feat_logistics_gate_security',
        hostel_management: 'feat_logistics_boarding_house',
        exeat_management: 'feat_logistics_boarding_house',
        dining_management: 'feat_logistics_boarding_house',
        school_transport: 'feat_logistics_transportation',
        digital_library: 'feat_logistics_elibrary'
      };
      for (const [capability, enabled] of Object.entries(logistics.configuration.capabilities)) {
        if (enabled && !config.enabledCapabilities?.includes(featureForCapability[capability])) {
          errors.push(`Logistics capability '${capability}' must also be enabled in the application feature selection.`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

/**
 * Builds and validates a configuration from Application Builder selections.
 * Throws if the selection is not valid, so an invalid configuration can
 * never be persisted or provisioned.
 */
export function buildApplicationInstanceConfiguration(
  input: ApplicationConfigurationInput
): ApplicationInstanceConfiguration {
  const application = INITIAL_REGISTERED_APPLICATIONS.find(item => item.appId === input.applicationId);
  const selected = INITIAL_REGISTERED_FEATURES.filter(f => input.enabledCapabilities.includes(f.featureId));
  const configuration: ApplicationInstanceConfiguration = {
    schemaVersion: 1,
    contractVersion: APPLICATION_CONFIGURATION_CONTRACT_VERSION,
    applicationId: input.applicationId,
    applicationVersion: application?.version ?? '',
    templates: [{ templateId: input.templateId, templateVersion: input.templateVersion }],
    enabledCapabilities: [...input.enabledCapabilities].sort(),
    capabilityDependencies: Object.fromEntries(selected.map(f => [f.featureId, f.dependencies])),
    centralServiceDependencies: [...new Set(input.centralServiceDependencies ?? [])].sort(),
    configurationVersion: input.configurationVersion ?? 1,
    deploymentArchitecture: input.deploymentArchitecture,
    databaseStrategy: { engine: 'postgresql', isolation: input.deploymentArchitecture },
    validationEvidence: {
      validatedAt: new Date().toISOString(),
      validator: 'application-configuration-contract',
      capabilityVersions: Object.fromEntries(selected.map(f => [f.featureId, f.version])),
      checks: [
        'application_published',
        'template_supported',
        'capabilities_canonical',
        'capabilities_production_ready',
        'capability_dependencies_satisfied',
        'architecture_provisionable'
      ]
    },
    ...(input.featureConfigurations ? { featureConfigurations: input.featureConfigurations } : {})
  };
  const result = validateApplicationInstanceConfiguration(configuration);
  if (!result.valid) throw new Error(`INVALID_APPLICATION_CONFIGURATION: ${result.errors.join(' ')}`);
  return configuration;
}

/** Runtime feature authorization: only capabilities recorded in the validated configuration. */
export function isCapabilityEnabled(
  configuration: Pick<ApplicationInstanceConfiguration, 'enabledCapabilities'>,
  capabilityId: string
): boolean {
  return configuration.enabledCapabilities.includes(canonicalFeatureId(capabilityId)) &&
    deriveFeatureReadiness(
      INITIAL_REGISTERED_FEATURES.find(f => f.featureId === canonicalFeatureId(capabilityId))!
    ).productionReady;
}
