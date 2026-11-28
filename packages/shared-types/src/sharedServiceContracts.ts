export const CENTRAL_SHARED_SERVICE_IDS = [
  'central_curriculum',
  'central_textbooks',
  'central_vehicle_tracking',
  'central_messaging'
] as const;

export type CentralSharedServiceId = typeof CENTRAL_SHARED_SERVICE_IDS[number];
export type SharedServiceOperation = 'discover' | 'authorize' | 'health' | 'consume';
export type SharedServiceHealthStatus = 'healthy' | 'degraded' | 'not_ready';
export type SharedServiceAvailability = 'available' | 'degraded' | 'unavailable' | 'planned';
export type SharedServiceProvisioningStatus = 'provisioned' | 'not_provisioned' | 'deferred';

export interface SharedServiceDiscoveryV1 {
  contractVersion: 1;
  service: {
    id: CentralSharedServiceId;
    name: string;
    version: string;
    description: string;
    owner: string;
    availability: SharedServiceAvailability;
    provisioningStatus: SharedServiceProvisioningStatus;
    supportedApplicationTypes: readonly string[];
    requiredPermissions: Readonly<Record<SharedServiceOperation, string>>;
    requiredDatabaseDependencies: readonly string[];
    requiredConfiguration: readonly string[];
    entitlementRequired: true;
    operations: readonly string[];
  };
}

export interface SharedServiceAuthorizationRequestV1 {
  contractVersion: 1;
  applicationInstanceId: string;
  operation: string;
}

export interface SharedServiceAuthorizationDecisionV1 {
  contractVersion: 1;
  serviceId: CentralSharedServiceId;
  operation: string;
  allowed: boolean;
  reason?: string;
  entitlementId?: string;
}

export interface SharedServiceHealthV1 {
  contractVersion: 1;
  serviceId: CentralSharedServiceId;
  status: SharedServiceHealthStatus;
  checkedAt: string;
  checks: ReadonlyArray<{
    name: string;
    status: 'passed' | 'not_ready';
    detail: string;
  }>;
}

export interface SharedServiceEntitlementVerificationV1 {
  contractVersion: 1;
  serviceId: CentralSharedServiceId;
  applicationInstanceId: string;
  verified: boolean;
  reason?: string;
  entitlementId?: string;
  expiresAt?: string;
}

export interface SharedServiceConsumptionContextV1 {
  contractVersion: 1;
  serviceId: CentralSharedServiceId;
  operation: string;
  tenantId: string;
  applicationInstanceId: string;
  userId: string;
  entitlementId: string;
}
