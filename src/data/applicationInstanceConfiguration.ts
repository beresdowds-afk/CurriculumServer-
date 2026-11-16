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

export const SUPPORTED_APPLICATION_TEMPLATES: readonly SupportedApplicationTemplate[] = [
  { applicationId: 'app_curriculum_flow', templateId: 'school-standard', versions: ['1'] }
];

export interface ApplicationInstanceConfiguration {
  schemaVersion: 1;
  contractVersion: typeof APPLICATION_CONFIGURATION_CONTRACT_VERSION;
  applicationId: string;
  applicationVersion: string;
  templates: ApplicationTemplateReference[];
  enabledCapabilities: string[];
  capabilityDependencies: Record<string, string[]>;
  configurationVersion: number;
  deploymentArchitecture: DeploymentArchitecture;
  databaseStrategy: { engine: 'postgresql'; isolation: DeploymentArchitecture };
  validationEvidence: {
    validatedAt: string;
    validator: 'application-configuration-contract';
    capabilityVersions: Record<string, string>;
    checks: string[];
  };
}

export interface ApplicationConfigurationInput {
  applicationId: string;
  templateId: string;
  templateVersion: string;
  enabledCapabilities: string[];
  configurationVersion?: number;
  deploymentArchitecture: DeploymentArchitecture;
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
      const supported = SUPPORTED_APPLICATION_TEMPLATES.find(item =>
        item.applicationId === config.applicationId && item.templateId === template?.templateId
      );
      if (!supported) errors.push(`Unsupported template '${String(template?.templateId)}'.`);
      else if (!supported.versions.includes(template.templateVersion)) {
        errors.push(`Unsupported template version '${String(template.templateVersion)}' for '${template.templateId}'.`);
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
    }
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
