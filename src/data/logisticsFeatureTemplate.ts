export const LOGISTICS_FEATURE_TEMPLATE = {
  templateId: 'campus-logistics-support',
  templateVersion: '1.0.0',
  featureId: 'feat_logistics_support',
  bundleKey: 'logistics_support',
  implementationStatus: 'partial',
  productionReadiness: 'blocked_pending_acceptance',
  dependencies: ['feat_school_administration_identity', 'feat_student_registration'],
  requiredDatabaseCapabilities: [
    'production.students',
    'production.schools',
    'production.logistics_feature_configurations',
    'production.logistics_guardians',
    'production.logistics_gate_events',
    'production.logistics_bed_allocations',
    'production.logistics_exeats',
    'production.logistics_dining_attendance',
    'production.logistics_trips',
    'production.logistics_library_resources',
    'production.logistics_night_curfew',
    'production.logistics_dietary_restrictions',
    'production.logistics_workflow_requests',
    'production.logistics_vehicle_maintenance',
    'production.logistics_transport_incidents',
    'production.logistics_gps_device_bindings',
    'production.logistics_gps_telemetry',
    'production.logistics_gps_events',
    'production.logistics_library_storage_configurations',
    'production.logistics_library_usage_events',
    'production.notification_subscriptions',
    'production.notification_outbox',
    'production.notification_attempts'
  ],
  requiredPermissions: [
    'logistics.configuration.read',
    'logistics.configuration.manage',
    'logistics.gate.manage',
    'logistics.guardians.manage',
    'logistics.hostel.manage',
    'logistics.exeat.approve',
    'logistics.dining.manage',
    'logistics.dietary.read',
    'logistics.dietary.manage',
    'logistics.dietary.exception',
    'logistics.transport.manage',
    'logistics.gps.read',
    'logistics.gps.manage',
    'logistics.library.manage',
    'logistics.library.storage.manage'
  ],
  apiCapabilities: [
    '/api/v1/logistics/configuration',
    '/api/v1/logistics/gate',
    '/api/v1/logistics/guardians',
    '/api/v1/logistics/pickup-passes',
    '/api/v1/logistics/hostel',
    '/api/v1/logistics/exeats',
    '/api/v1/logistics/dining',
    '/api/v1/logistics/transport',
    '/api/v1/logistics/vehicles',
    '/api/v1/logistics/drivers',
    '/api/v1/logistics/routes',
    '/api/v1/logistics/trips',
    '/api/v1/logistics/passengers',
    '/api/v1/logistics/library',
    '/api/v1/logistics/audit',
    '/api/v1/logistics/transport/vehicles/:vehicleId/gps-device',
    '/api/v1/logistics/transport/vehicles/:vehicleId/telemetry/sync'
  ],
  implementedApiCapabilities: [
    'GET /api/v1/logistics/configuration',
    'PATCH /api/v1/logistics/configuration',
    'GET /api/v1/logistics/occupancy',
    'GET /api/v1/logistics/gate/events',
    'GET /api/v1/logistics/hostel/allocations',
    'GET /api/v1/logistics/hostel/register',
    'POST /api/v1/logistics/hostel/register',
    'POST /api/v1/logistics/hostel/assignments',
    'POST /api/v1/logistics/dining/meals',
    'GET /api/v1/logistics/dining/dietary-restrictions',
    'POST /api/v1/logistics/dining/dietary-restrictions',
    'GET /api/v1/logistics/transport/routes',
    'POST /api/v1/logistics/transport/routes',
    'GET /api/v1/logistics/transport/drivers',
    'POST /api/v1/logistics/transport/drivers',
    'GET /api/v1/logistics/transport/vehicles',
    'POST /api/v1/logistics/transport/vehicles',
    'GET /api/v1/logistics/transport/trips',
    'POST /api/v1/logistics/transport/trips',
    'POST /api/v1/logistics/transport/vehicles/:vehicleId/gps-device',
    'POST /api/v1/logistics/transport/vehicles/:vehicleId/telemetry/sync',
    'POST /api/v1/logistics/pickup-passes',
    'POST /api/v1/logistics/gate/scans'
  ],
  uiComponents: [
    'LogisticsSupportSuiteTab',
    'BoardingHouseD3Dashboard'
  ],
  configurableCapabilities: [
    'gate_security',
    'guardian_pickup',
    'hostel_management',
    'exeat_management',
    'dining_management',
    'school_transport',
    'digital_library',
    'gps_geofencing',
    'device_management'
  ],
  integrationRequirements: [
    'authenticated_tenant_membership',
    'school_student_directory',
    'postgresql_rls',
    'audit_ledger',
    'storage_adapter_for_library_files',
    'notification_provider_for_parent_alerts'
  ],
  provisioningRequirements: [
    'tenant_school_identity',
    'migration_011_campus_logistics_foundation',
    'idempotent_application_instance_configuration'
  ],
  featureEnablementRules: [
    'hostel_management requires boarding_school=true',
    'school_transport may use school_owned, outsourced, or mixed operators',
    'gps_geofencing requires a verified Traccar device and an active route with coordinate-backed stops',
    'library metadata may be enabled without enabling file uploads'
  ]
} as const;

export interface LogisticsFeatureConfiguration {
  schoolType: 'day' | 'boarding' | 'mixed';
  campusCount: number;
  gateCount: number;
  boardingSchool: boolean;
  hostelCapacity: number;
  studentCategories: Array<'boarding' | 'day'>;
  transportOwnership: 'school_owned' | 'outsourced' | 'mixed' | 'none';
  vehicleCount: number;
  routeCount: number;
  parentNotifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  pickupRequiresPin: boolean;
  pickupReusablePasses: boolean;
  exeatApprovalHierarchy: Array<'housemaster' | 'principal'>;
  diningSchedules: Array<{ name: string; startsAt: string; endsAt: string }>;
  timeZone: string;
  languages: string[];
  branding: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
  capabilities: Record<(typeof LOGISTICS_FEATURE_TEMPLATE.configurableCapabilities)[number], boolean>;
}

export function validateLogisticsFeatureConfiguration(
  input: unknown
): { valid: boolean; errors: string[]; configuration?: LogisticsFeatureConfiguration } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Logistics configuration must be an object.'] };
  }
  const value = input as Partial<LogisticsFeatureConfiguration>;
  const errors: string[] = [];
  const integer = (candidate: unknown, min: number, max: number, field: string) => {
    if (!Number.isInteger(candidate) || (candidate as number) < min || (candidate as number) > max) {
      errors.push(`${field} must be an integer between ${min} and ${max}.`);
    }
  };
  if (!['day', 'boarding', 'mixed'].includes(value.schoolType as string)) {
    errors.push('schoolType must be day, boarding, or mixed.');
  }
  integer(value.campusCount, 1, 100, 'campusCount');
  integer(value.gateCount, 0, 1000, 'gateCount');
  integer(value.hostelCapacity, 0, 100000, 'hostelCapacity');
  integer(value.vehicleCount, 0, 10000, 'vehicleCount');
  integer(value.routeCount, 0, 10000, 'routeCount');
  if (value.schoolType === 'day' && (value.boardingSchool || (value.hostelCapacity ?? 0) > 0)) {
    errors.push('Day schools cannot enable boarding or hostel capacity.');
  }
  if (typeof value.boardingSchool !== 'boolean') errors.push('boardingSchool must be explicitly configured.');
  if (value.boardingSchool && value.schoolType === 'day') {
    errors.push('Boarding facilities require a boarding or mixed school.');
  }
  if (!Array.isArray(value.studentCategories) ||
      value.studentCategories.length === 0 ||
      new Set(value.studentCategories).size !== value.studentCategories.length ||
      value.studentCategories.some(category => !['boarding', 'day'].includes(category))) {
    errors.push('studentCategories must contain supported student categories.');
  }
  if (typeof value.pickupRequiresPin !== 'boolean' || typeof value.pickupReusablePasses !== 'boolean') {
    errors.push('Pickup PIN and reusable-pass policies must be explicitly configured.');
  }
  if (!['school_owned', 'outsourced', 'mixed', 'none'].includes(value.transportOwnership as string)) {
    errors.push('transportOwnership must be school_owned, outsourced, mixed, or none.');
  }
  if (value.transportOwnership === 'none' && ((value.vehicleCount ?? 0) > 0 || (value.routeCount ?? 0) > 0)) {
    errors.push('Vehicle and route counts require a transport operator.');
  }
  if (value.capabilities?.school_transport &&
      (value.transportOwnership === 'none' || (value.routeCount ?? 0) < 1)) {
    errors.push('Enabled school transport requires an operator and at least one route.');
  }
  if (!value.parentNotifications || typeof value.parentNotifications !== 'object' ||
      ['sms', 'email', 'push'].some(channel => typeof value.parentNotifications?.[channel as keyof typeof value.parentNotifications] !== 'boolean')) {
    errors.push('parentNotifications must configure sms, email, and push preferences.');
  }
  if (!Array.isArray(value.exeatApprovalHierarchy) ||
      value.exeatApprovalHierarchy.length === 0 ||
      value.exeatApprovalHierarchy.some(role => !['housemaster', 'principal'].includes(role))) {
    errors.push('exeatApprovalHierarchy must contain housemaster and/or principal.');
  }
  if (!Array.isArray(value.diningSchedules) ||
      value.diningSchedules.some(schedule =>
        !schedule || typeof schedule.name !== 'string' || !schedule.name.trim() ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.startsAt) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.endsAt))) {
    errors.push('diningSchedules must contain named schedules with valid local times.');
  }
  if (!value.timeZone || typeof value.timeZone !== 'string') {
    errors.push('timeZone is required.');
  } else {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value.timeZone });
    } catch {
      errors.push('timeZone must be a valid IANA time zone.');
    }
  }
  if (!Array.isArray(value.languages) ||
      value.languages.length === 0 ||
      value.languages.some(language => typeof language !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(language))) {
    errors.push('languages must contain valid language codes.');
  }
  const configuredCapabilities = LOGISTICS_FEATURE_TEMPLATE.configurableCapabilities;
  if (!value.capabilities || configuredCapabilities.some(key => typeof value.capabilities?.[key] !== 'boolean')) {
    errors.push('Every logistics capability must be explicitly enabled or disabled.');
  }
  if ((value.capabilities?.gate_security || value.capabilities?.guardian_pickup) &&
      (value.gateCount ?? 0) < 1) {
    errors.push('Gate security and guardian pickup require at least one configured gate.');
  }
  if (value.capabilities?.guardian_pickup && !value.capabilities.gate_security) {
    errors.push('Guardian pickup requires gate security.');
  }
  if (value.capabilities?.hostel_management && (!value.boardingSchool || (value.hostelCapacity ?? 0) < 1)) {
    errors.push('Hostel management requires boarding facilities and approved capacity.');
  }
  if (value.capabilities?.dining_management && !value.diningSchedules?.length) {
    errors.push('Dining management requires at least one meal schedule.');
  }
  if (!value.boardingSchool &&
      (value.capabilities?.hostel_management || value.capabilities?.exeat_management)) {
    errors.push('Hostel and exeat management require boarding facilities.');
  }
  if (value.transportOwnership === 'none' && value.capabilities?.school_transport) {
    errors.push('School transport requires an operator, including an outsourced operator.');
  }
  if (value.capabilities?.gps_geofencing && !value.capabilities.school_transport) {
    errors.push('GPS geofencing requires school transport to be enabled.');
  }
  if (value.capabilities?.device_management) {
    errors.push('Device management cannot be enabled until its enrollment and authentication adapter is provisioned.');
  }
  for (const [field, color] of Object.entries(value.branding ?? {})) {
    if (field !== 'logoUrl' && color && !/^#[0-9a-f]{6}$/i.test(color)) {
      errors.push(`${field} must be a six-digit hexadecimal color.`);
    }
  }
  if (value.branding?.logoUrl && !/^https:\/\//i.test(value.branding.logoUrl)) {
    errors.push('School branding logoUrl must use HTTPS.');
  }
  return errors.length
    ? { valid: false, errors }
    : { valid: true, errors: [], configuration: value as LogisticsFeatureConfiguration };
}
