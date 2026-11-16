export type LifecycleStatus = 'published' | 'beta' | 'deprecated' | 'disabled';

export type AvailabilityStatus = 'available' | 'beta' | 'deprecated' | 'experimental';

export type ImplementationHonestyStatus = 'fully_implemented' | 'simulated_ui' | 'partial_stub';
export type FeatureReadinessStage =
  | 'designed'
  | 'implemented'
  | 'database_migrated'
  | 'api_operational'
  | 'authorization_verified'
  | 'acceptance_tested'
  | 'provisionable'
  | 'production_approved';

export interface RegisteredApplication {
  appId: string;
  name: string;
  family: string;
  description: string;
  version: string;
  containerImageRef: string;
  supportedDeploymentTargets: ('cloud_run' | 'kubernetes' | 'bare_metal_edge')[];
  requiredRuntimeDependencies: string[];
  databaseRequirements: {
    engine: 'postgresql';
    minVersion: string;
    requiresIsolatedSchema: boolean;
  };
  storageRequirements: {
    minStorageMb: number;
    requiresBucket: boolean;
  };
  authRequirements: {
    oauthSupported: boolean;
    jwtBearerRequired: boolean;
    rbacModel: string;
  };
  requiredInfrastructurePermissions: string[];
  healthCheckConfig: {
    endpoint: string;
    intervalSeconds: number;
    timeoutSeconds: number;
  };
  lifecycleStatus: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredFeature {
  featureId: string;
  name: string;
  description: string;
  applicationAssociation: string; // appId
  dependencies: string[]; // required featureIds
  requiredPermissions: string[];
  apiDependencies: string[];
  databaseRequirements: string[];
  storageRequirements: string[];
  configOptions: Record<string, any>;
  version: string;
  availabilityStatus: AvailabilityStatus;
  honestyStatus: ImplementationHonestyStatus;
  readiness?: FeatureReadinessStage[];
}

export interface ApplicationComposition {
  compositionId: string;
  instanceName: string;
  appId: string;
  enabledFeatureIds: string[];
  customModules?: string[];
  configurationOverrides?: Record<string, any>;
  createdAt: string;
}
