import type { AttendanceDeviceCategory } from '../../src/data/attendanceDeviceProvisioningTemplate';

export type AttendanceProvisioningState =
  | 'requested'
  | 'compatibility_check'
  | 'allocation_pending'
  | 'allocated'
  | 'enrollment_pending'
  | 'enrolled'
  | 'configuration_pending'
  | 'configured'
  | 'connection_verification'
  | 'integration_verification'
  | 'activation_pending'
  | 'active'
  | 'rejected'
  | 'failed'
  | 'retry_pending'
  | 'suspended'
  | 'revocation_pending'
  | 'revoked';

export type AttendanceProvisioningStep =
  | 'compatibility'
  | 'allocation'
  | 'enrollment'
  | 'configuration'
  | 'connection_test'
  | 'time_sync'
  | 'event_delivery_test'
  | 'attendance_acceptance_test';

export interface CatalogueCompatibilityDescriptor {
  category: AttendanceDeviceCategory;
  verificationStatus:
    | 'implemented_tested'
    | 'vendor_supported_not_integrated'
    | 'planned'
    | 'test_simulator';
  supportedEventTypes: readonly string[];
  offlineSync: boolean;
  supportedFirmware: readonly string[];
  enabledAdapter: boolean;
}

export interface AttendanceProvisioningRequestDescriptor {
  category: AttendanceDeviceCategory;
  requiredEventTypes: readonly string[];
  firmwareVersion?: string;
  requiresOfflineSync: boolean;
}

export const MAX_PROVISIONING_ATTEMPTS = 5;
export const REQUIRED_ACTIVATION_STEPS: readonly AttendanceProvisioningStep[] = [
  'compatibility',
  'allocation',
  'enrollment',
  'configuration',
  'connection_test',
  'time_sync',
  'event_delivery_test',
  'attendance_acceptance_test'
];

const transitions: Readonly<Record<AttendanceProvisioningState, readonly AttendanceProvisioningState[]>> = {
  requested: ['compatibility_check', 'rejected'],
  compatibility_check: ['allocation_pending', 'rejected', 'retry_pending'],
  allocation_pending: ['allocated', 'failed', 'retry_pending'],
  allocated: ['enrollment_pending', 'revocation_pending'],
  enrollment_pending: ['enrolled', 'failed', 'retry_pending', 'revocation_pending'],
  enrolled: ['configuration_pending', 'revocation_pending'],
  configuration_pending: ['configured', 'failed', 'retry_pending', 'revocation_pending'],
  configured: ['connection_verification', 'revocation_pending'],
  connection_verification: ['integration_verification', 'failed', 'retry_pending', 'revocation_pending'],
  integration_verification: ['activation_pending', 'failed', 'retry_pending', 'revocation_pending'],
  activation_pending: ['active', 'failed', 'retry_pending', 'revocation_pending'],
  active: ['suspended', 'revocation_pending'],
  rejected: [],
  failed: ['retry_pending', 'revocation_pending'],
  retry_pending: ['compatibility_check', 'allocation_pending', 'enrollment_pending', 'configuration_pending', 'connection_verification', 'integration_verification', 'activation_pending', 'revocation_pending'],
  suspended: ['active', 'revocation_pending'],
  revocation_pending: ['revoked', 'retry_pending'],
  revoked: []
};

export function assertAttendanceProvisioningTransition(
  from: AttendanceProvisioningState,
  to: AttendanceProvisioningState
): void {
  if (!transitions[from].includes(to)) throw new Error('INVALID_ATTENDANCE_PROVISIONING_TRANSITION');
}

export function validateCatalogueCompatibility(
  request: AttendanceProvisioningRequestDescriptor,
  catalogue: CatalogueCompatibilityDescriptor | undefined
): { compatible: boolean; reasons: string[] } {
  if (!catalogue) return { compatible: false, reasons: ['MODEL_NOT_CATALOGUED'] };
  const reasons: string[] = [];
  if (catalogue.verificationStatus !== 'implemented_tested' || !catalogue.enabledAdapter) {
    reasons.push('ADAPTER_NOT_VERIFIED');
  }
  if (catalogue.category !== request.category) reasons.push('DEVICE_CATEGORY_MISMATCH');
  if (request.requiredEventTypes.some(type => !catalogue.supportedEventTypes.includes(type))) {
    reasons.push('REQUIRED_EVENT_TYPE_UNSUPPORTED');
  }
  if (request.requiresOfflineSync && !catalogue.offlineSync) reasons.push('OFFLINE_SYNC_UNSUPPORTED');
  if (request.firmwareVersion && catalogue.supportedFirmware.length > 0 &&
      !catalogue.supportedFirmware.includes(request.firmwareVersion)) {
    reasons.push('FIRMWARE_UNVERIFIED');
  }
  if (request.firmwareVersion && catalogue.supportedFirmware.length === 0) {
    reasons.push('FIRMWARE_COMPATIBILITY_UNKNOWN');
  }
  return { compatible: reasons.length === 0, reasons };
}

export function isReadyToActivateDevice(input: {
  schoolCapabilityState: string;
  deviceState: string;
  successfulSteps: readonly AttendanceProvisioningStep[];
}): boolean {
  if (input.schoolCapabilityState !== 'active' || input.deviceState !== 'activation_pending') return false;
  const completed = new Set(input.successfulSteps);
  return REQUIRED_ACTIVATION_STEPS.every(step => completed.has(step));
}

export function retryDelayMs(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > MAX_PROVISIONING_ATTEMPTS) {
    throw new Error('PROVISIONING_RETRY_LIMIT_EXCEEDED');
  }
  return Math.min(60 * 60_000, 30_000 * 2 ** (attempt - 1));
}
