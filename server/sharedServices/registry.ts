import type {
  CentralSharedServiceId,
  SharedServiceAvailability,
  SharedServiceOperation,
  SharedServiceProvisioningStatus
} from '../../packages/shared-types/src/sharedServiceContracts';

export interface CentralSharedServiceRegistration {
  id: CentralSharedServiceId;
  name: string;
  version: string;
  description: string;
  owner: string;
  boundary: 'central_shared';
  availability: SharedServiceAvailability;
  provisioningStatus: SharedServiceProvisioningStatus;
  requiredPermissions: Readonly<Record<SharedServiceOperation, string>>;
  supportedApplicationTypes: readonly string[];
  requiredDatabaseDependencies: readonly string[];
  requiredConfiguration: readonly string[];
  entitlementRequired: true;
  operations: readonly string[];
  healthCheck: {
    method: 'GET';
    path: string;
    check: 'service_provisioning';
  };
}

const curriculumPermission = (operation: SharedServiceOperation) => `shared.curriculum.${operation}`;
const textbookPermission = (operation: SharedServiceOperation) => `shared.textbooks.${operation}`;
const vehiclePermission = (operation: SharedServiceOperation) => `shared.vehicle_tracking.${operation}`;

export const CENTRAL_SHARED_SERVICE_REGISTRY: readonly CentralSharedServiceRegistration[] = [
  {
    id: 'central_curriculum',
    name: 'Central Curriculum Retrieval',
    version: '2.0.0',
    description: 'Centrally owned PostgreSQL curriculum database and retrieval service supporting multi-country frameworks, versions, topics, objectives, and coverage.',
    owner: 'Curriculum Server Platform',
    boundary: 'central_shared',
    availability: 'available',
    provisioningStatus: 'provisioned',
    requiredPermissions: {
      discover: curriculumPermission('discover'),
      authorize: curriculumPermission('authorize'),
      health: curriculumPermission('health'),
      consume: curriculumPermission('consume')
    },
    supportedApplicationTypes: ['app_curriculum_flow', 'app_cbt_sovereign', 'app_research_analytics'],
    requiredDatabaseDependencies: ['central_curriculum_database'],
    requiredConfiguration: ['centralServiceDependencies'],
    entitlementRequired: true,
    operations: [
      'curriculum.retrieve',
      'curriculum.frameworks.list',
      'curriculum.subjects.list',
      'curriculum.topics.list',
      'curriculum.objectives.list',
      'curriculum.versions.list',
      'curriculum.coverage.read'
    ],
    healthCheck: {
      method: 'GET',
      path: '/api/v1/shared/curriculum/health',
      check: 'service_provisioning'
    }
  },
  {
    id: 'central_textbooks',
    name: 'Central Textbook Generation',
    version: '2.0.0',
    description: 'Centrally owned PostgreSQL textbook repository, generation engine, editorial approval, publishing, coverage, and private media storage service.',
    owner: 'Curriculum Server Platform',
    boundary: 'central_shared',
    availability: 'available',
    provisioningStatus: 'provisioned',
    requiredPermissions: {
      discover: textbookPermission('discover'),
      authorize: textbookPermission('authorize'),
      health: textbookPermission('health'),
      consume: textbookPermission('consume')
    },
    supportedApplicationTypes: ['app_curriculum_flow', 'app_cbt_sovereign'],
    requiredDatabaseDependencies: ['central_textbook_database'],
    requiredConfiguration: ['centralServiceDependencies'],
    entitlementRequired: true,
    operations: [
      'textbooks.read',
      'textbooks.coverage.read',
      'textbooks.versions.read',
      'textbooks.media.read',
      'textbooks.generate',
      'textbooks.publish'
    ],
    healthCheck: {
      method: 'GET',
      path: '/api/v1/shared/textbooks/health',
      check: 'service_provisioning'
    }
  },
  {
    id: 'central_vehicle_tracking',
    name: 'Central Vehicle Tracking, GPS and Telemetry',
    version: '1.0.0',
    description: 'Planned central vehicle tracking service. GPS ingestion, telemetry and tracking are deferred.',
    owner: 'Curriculum Server Platform',
    boundary: 'central_shared',
    availability: 'planned',
    provisioningStatus: 'deferred',
    requiredPermissions: {
      discover: vehiclePermission('discover'),
      authorize: vehiclePermission('authorize'),
      health: vehiclePermission('health'),
      consume: vehiclePermission('consume')
    },
    supportedApplicationTypes: ['app_curriculum_flow'],
    requiredDatabaseDependencies: ['central_vehicle_telemetry_store'],
    requiredConfiguration: ['centralServiceDependencies'],
    entitlementRequired: true,
    operations: [],
    healthCheck: {
      method: 'GET',
      path: '/api/v1/shared/vehicle-tracking/health',
      check: 'service_provisioning'
    }
  }
];

export const ARCHITECTURE_BOUNDARIES = {
  central_shared_services: [
    'central_curriculum',
    'central_textbooks',
    'central_vehicle_tracking'
  ],
  school_instance_services: [
    'question_bank',
    'examinations',
    'assessment',
    'cbt'
  ],
  platform_administration_services: ['platform_administration'],
  application_provisioning_services: ['application_provisioning']
} as const;

export function getCentralSharedService(
  serviceId: string
): CentralSharedServiceRegistration | undefined {
  return CENTRAL_SHARED_SERVICE_REGISTRY.find(service => service.id === serviceId);
}

export function getSharedServicePermission(
  serviceId: string,
  operation: SharedServiceOperation
): string | undefined {
  return getCentralSharedService(serviceId)?.requiredPermissions[operation];
}
