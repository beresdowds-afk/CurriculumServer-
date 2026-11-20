export const ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE = {
  templateId: 'attendance-device-provisioning',
  templateVersion: '1.0.0',
  featureId: 'feat_biometric_attendance',
  status: 'draft',
  provisionable: false,
  productionReadiness: 'blocked_pending_iam_ingestion_and_verified_adapter',
  dependencies: ['feat_school_administration_identity', 'feat_student_registration'],
  requiredBackendCapabilities: ['attendance_device_ingestion', 'attendance_device_provisioning'],
  requiredDatabaseMigrations: [31, 32, 33],
  requiredPermissions: [
    'attendance.read',
    'attendance.devices.manage',
    'attendance.devices.activate',
    'attendance.devices.revoke'
  ],
  deviceCategories: ['rfid', 'fingerprint', 'facial', 'combined'],
  adapterVerificationStatuses: [
    'implemented_tested',
    'vendor_supported_not_integrated',
    'planned',
    'test_simulator'
  ]
} as const;

export type AttendanceDeviceCategory =
  (typeof ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.deviceCategories)[number];

export interface AttendanceCapabilityRequestSettings {
  requestCapability: boolean;
  deviceCategories?: AttendanceDeviceCategory[];
  intendedPopulation?: 'students' | 'staff' | 'both';
  intendedLocations?: string[];
}

export function validateAttendanceCapabilityRequest(
  input: unknown
): { valid: boolean; errors: string[]; settings?: AttendanceCapabilityRequestSettings } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Attendance capability request settings must be an object.'] };
  }
  const value = input as Partial<AttendanceCapabilityRequestSettings>;
  const errors: string[] = [];
  const allowedKeys = new Set([
    'requestCapability', 'deviceCategories', 'intendedPopulation', 'intendedLocations'
  ]);
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    errors.push('Attendance capability request contains unsupported settings.');
  }
  if (typeof value.requestCapability !== 'boolean') {
    errors.push('requestCapability must be explicitly true or false.');
  }
  if (value.deviceCategories !== undefined &&
      (!Array.isArray(value.deviceCategories) ||
       new Set(value.deviceCategories).size !== value.deviceCategories.length ||
       value.deviceCategories.some(category =>
         !ATTENDANCE_DEVICE_PROVISIONING_TEMPLATE.deviceCategories.includes(category as AttendanceDeviceCategory)))) {
    errors.push('deviceCategories must contain unique supported categories.');
  }
  if (value.intendedPopulation !== undefined &&
      !['students', 'staff', 'both'].includes(value.intendedPopulation)) {
    errors.push('intendedPopulation must be students, staff, or both.');
  }
  if (value.intendedLocations !== undefined &&
      (!Array.isArray(value.intendedLocations) ||
       value.intendedLocations.length > 100 ||
       value.intendedLocations.some(location =>
         typeof location !== 'string' || !location.trim() || location.trim().length > 200) ||
       new Set(value.intendedLocations.map(location => location.trim().toLowerCase())).size !==
         value.intendedLocations.length)) {
    errors.push('intendedLocations must contain unique non-empty location names.');
  }
  if (value.requestCapability && (!value.deviceCategories?.length || !value.intendedPopulation)) {
    errors.push('A capability request requires device categories and an intended population.');
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    settings: {
      requestCapability: value.requestCapability!,
      ...(value.deviceCategories ? { deviceCategories: [...value.deviceCategories] } : {}),
      ...(value.intendedPopulation ? { intendedPopulation: value.intendedPopulation } : {}),
      ...(value.intendedLocations ? { intendedLocations: value.intendedLocations.map(location => location.trim()) } : {})
    }
  };
}
