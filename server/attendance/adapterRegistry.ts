import {
  CanonicalGatewayAdapter,
  type AttendanceDeviceAdapter,
  type AttendanceEventType,
  type AttendanceVerificationMethod,
  type NormalizedAttendanceEvent,
  validateNormalizedAttendanceEvent
} from './deviceAdapter';

export type AdapterVerificationStatus =
  | 'implemented_tested'
  | 'vendor_supported_not_integrated'
  | 'planned'
  | 'test_simulator';

export type AdapterIntegrationMethod =
  | 'signed_http'
  | 'mutual_tls'
  | 'vendor_gateway'
  | 'local_gateway'
  | 'unknown';

export type AdapterAuthenticationRequirement =
  | 'hmac_sha256_signed_http'
  | 'test_simulator_only'
  | 'unverified_vendor_protocol';

export interface NormalizedDeviceHeartbeat {
  deviceIdentity: string;
  firmwareVersion?: string;
  sequenceNumber?: number;
  clockDriftMs?: number;
  pendingEventCount?: number;
  configurationSyncStatus?: 'synced' | 'pending' | 'failed' | 'unknown';
  reportedAt: string;
  safeMetrics?: {
    uptimeSeconds?: number;
    queueDepth?: number;
  };
}

export interface AttendanceAdapterContract<Payload = unknown> {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly manufacturer: string;
  readonly vendorNeutral: boolean;
  readonly verifiedHardware: boolean;
  readonly isSimulator: boolean;
  readonly verificationStatus: AdapterVerificationStatus;
  readonly authenticationRequirement: AdapterAuthenticationRequirement;
  readonly supportedIntegrationMethods: readonly AdapterIntegrationMethod[];
  readonly supportedModalities: readonly AttendanceVerificationMethod[];
  readonly supportedEventTypes: readonly AttendanceEventType[];
  readonly supportedFirmware: readonly string[];
  readonly offlineSyncSupported: boolean;
  readonly credentialManagementSupported: boolean;
  readonly configCapabilities: readonly string[];
  readonly healthReportingSupported: boolean;
  normalize(payload: Payload): NormalizedAttendanceEvent;
  normalizeHeartbeat(payload: unknown): NormalizedDeviceHeartbeat;
}

const ALL_EVENT_TYPES: readonly AttendanceEventType[] = [
  'school_arrival',
  'school_departure',
  'classroom_arrival',
  'classroom_departure',
  'clock_in',
  'clock_out'
];

const ALL_MODALITIES: readonly AttendanceVerificationMethod[] = [
  'rfid',
  'fingerprint',
  'facial',
  'combined'
];

const tokenPattern = /^[A-Za-z0-9._:-]{1,256}$/;

export const CANDIDATE_HARDWARE_MODELS = Object.freeze([
  { manufacturer: 'ZKTeco', model: 'SpeedFace-V5L' },
  { manufacturer: 'ZKTeco', model: 'uFace800 Plus' },
  { manufacturer: 'Hikvision', model: 'DS-K1T342MFWX-E1' },
  { manufacturer: 'Hikvision', model: 'DS-K1T671MF-L' },
  { manufacturer: 'Anviz', model: 'FaceDeep 5' },
  { manufacturer: 'Anviz', model: 'W2 Pro' },
  { manufacturer: 'Suprema', model: 'BioStation 3' },
  { manufacturer: 'Suprema', model: 'BioStation 2a' }
] as const);

export function validateNormalizedHeartbeat(payload: unknown): NormalizedDeviceHeartbeat {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  const allowed = new Set([
    'deviceIdentity',
    'firmwareVersion',
    'sequenceNumber',
    'clockDriftMs',
    'pendingEventCount',
    'configurationSyncStatus',
    'reportedAt',
    'safeMetrics'
  ]);
  const raw = payload as Record<string, unknown>;
  if (Object.keys(raw).some(key => !allowed.has(key))) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (typeof raw.deviceIdentity !== 'string' || !tokenPattern.test(raw.deviceIdentity)) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (raw.firmwareVersion !== undefined &&
      (typeof raw.firmwareVersion !== 'string' || !tokenPattern.test(raw.firmwareVersion))) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (raw.sequenceNumber !== undefined &&
      (typeof raw.sequenceNumber !== 'number' || !Number.isSafeInteger(raw.sequenceNumber) || raw.sequenceNumber < 0)) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (raw.clockDriftMs !== undefined &&
      (typeof raw.clockDriftMs !== 'number' || !Number.isSafeInteger(raw.clockDriftMs) || Math.abs(raw.clockDriftMs) > 86_400_000)) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (raw.pendingEventCount !== undefined &&
      (typeof raw.pendingEventCount !== 'number' || !Number.isSafeInteger(raw.pendingEventCount) || raw.pendingEventCount < 0 || raw.pendingEventCount > 1_000_000)) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }
  if (raw.configurationSyncStatus !== undefined &&
      !['synced', 'pending', 'failed', 'unknown'].includes(String(raw.configurationSyncStatus))) {
    throw new Error('INVALID_HEARTBEAT_PAYLOAD');
  }

  let reportedAt = new Date().toISOString();
  if (raw.reportedAt !== undefined) {
    if (typeof raw.reportedAt !== 'string' || !Number.isFinite(Date.parse(raw.reportedAt))) {
      throw new Error('INVALID_HEARTBEAT_PAYLOAD');
    }
    reportedAt = new Date(Date.parse(raw.reportedAt)).toISOString();
  }

  let safeMetrics: NormalizedDeviceHeartbeat['safeMetrics'];
  if (raw.safeMetrics !== undefined) {
    if (!raw.safeMetrics || typeof raw.safeMetrics !== 'object' || Array.isArray(raw.safeMetrics)) {
      throw new Error('INVALID_HEARTBEAT_PAYLOAD');
    }
    const metrics = raw.safeMetrics as Record<string, unknown>;
    if (Object.keys(metrics).some(k => !['uptimeSeconds', 'queueDepth'].includes(k))) {
      throw new Error('INVALID_HEARTBEAT_PAYLOAD');
    }
    if (metrics.uptimeSeconds !== undefined &&
        (typeof metrics.uptimeSeconds !== 'number' || !Number.isSafeInteger(metrics.uptimeSeconds) || metrics.uptimeSeconds < 0)) {
      throw new Error('INVALID_HEARTBEAT_PAYLOAD');
    }
    if (metrics.queueDepth !== undefined &&
        (typeof metrics.queueDepth !== 'number' || !Number.isSafeInteger(metrics.queueDepth) || metrics.queueDepth < 0)) {
      throw new Error('INVALID_HEARTBEAT_PAYLOAD');
    }
    safeMetrics = {
      ...(typeof metrics.uptimeSeconds === 'number' ? { uptimeSeconds: metrics.uptimeSeconds } : {}),
      ...(typeof metrics.queueDepth === 'number' ? { queueDepth: metrics.queueDepth } : {})
    };
  }

  return {
    deviceIdentity: raw.deviceIdentity as string,
    ...(typeof raw.firmwareVersion === 'string' ? { firmwareVersion: raw.firmwareVersion } : {}),
    ...(typeof raw.sequenceNumber === 'number' ? { sequenceNumber: raw.sequenceNumber } : {}),
    ...(typeof raw.clockDriftMs === 'number' ? { clockDriftMs: raw.clockDriftMs } : {}),
    ...(typeof raw.pendingEventCount === 'number' ? { pendingEventCount: raw.pendingEventCount } : {}),
    ...(typeof raw.configurationSyncStatus === 'string'
      ? { configurationSyncStatus: raw.configurationSyncStatus as NormalizedDeviceHeartbeat['configurationSyncStatus'] }
      : {}),
    reportedAt,
    ...(safeMetrics ? { safeMetrics } : {})
  };
}

/**
 * Vendor-neutral canonical signed-HTTP gateway adapter.
 * Supports normalized payloads only; does not represent physical hardware verification.
 */
export class VendorNeutralGatewayAdapter implements AttendanceAdapterContract {
  readonly manufacturer = 'Vendor-Neutral Gateway';
  readonly vendorNeutral = true;
  readonly verifiedHardware: boolean = false;
  readonly isSimulator = false;

  constructor(
    readonly adapterId: string = 'canonical-gateway',
    readonly adapterVersion: string = '1.0.0'
  ) {}
  readonly verificationStatus: AdapterVerificationStatus = 'vendor_supported_not_integrated';
  readonly authenticationRequirement: AdapterAuthenticationRequirement = 'hmac_sha256_signed_http';
  readonly supportedIntegrationMethods: readonly AdapterIntegrationMethod[] = ['signed_http'];
  readonly supportedModalities = ALL_MODALITIES;
  readonly supportedEventTypes = ALL_EVENT_TYPES;
  readonly supportedFirmware: readonly string[] = [];
  readonly offlineSyncSupported = true;
  readonly credentialManagementSupported = true;
  readonly configCapabilities = ['timezone_sync', 'offline_queue_replay', 'heartbeat_interval'];
  readonly healthReportingSupported = true;
  private readonly gateway: AttendanceDeviceAdapter = new CanonicalGatewayAdapter();

  normalize(payload: unknown): NormalizedAttendanceEvent {
    return this.gateway.normalize(payload);
  }

  normalizeHeartbeat(payload: unknown): NormalizedDeviceHeartbeat {
    return validateNormalizedHeartbeat(payload);
  }
}

/**
 * Non-production simulator fixture strictly segregated from production hardware adapters.
 */
export class SimulatorAttendanceAdapter implements AttendanceAdapterContract {
  readonly adapterId = 'test-simulator';
  readonly adapterVersion = '1.0.0';
  readonly manufacturer = 'Test Simulator Fixture';
  readonly vendorNeutral = true;
  readonly verifiedHardware = false;
  readonly isSimulator = true;
  readonly verificationStatus: AdapterVerificationStatus = 'test_simulator';
  readonly authenticationRequirement: AdapterAuthenticationRequirement = 'test_simulator_only';
  readonly supportedIntegrationMethods: readonly AdapterIntegrationMethod[] = ['signed_http'];
  readonly supportedModalities = ALL_MODALITIES;
  readonly supportedEventTypes = ALL_EVENT_TYPES;
  readonly supportedFirmware: readonly string[] = ['sim-1.0.0'];
  readonly offlineSyncSupported = true;
  readonly credentialManagementSupported = false;
  readonly configCapabilities = ['test_only'];
  readonly healthReportingSupported = true;

  normalize(payload: unknown): NormalizedAttendanceEvent {
    return validateNormalizedAttendanceEvent(payload);
  }

  normalizeHeartbeat(payload: unknown): NormalizedDeviceHeartbeat {
    return validateNormalizedHeartbeat(payload);
  }
}

export class AttendanceAdapterRegistry {
  private readonly adapters = new Map<string, AttendanceAdapterContract>();

  constructor(initialAdapters: readonly AttendanceAdapterContract[] = [
    new VendorNeutralGatewayAdapter(),
    new SimulatorAttendanceAdapter()
  ]) {
    for (const adapter of initialAdapters) {
      this.register(adapter);
    }
  }

  private key(adapterId: string, adapterVersion: string): string {
    return `${adapterId}@${adapterVersion}`;
  }

  register(adapter: AttendanceAdapterContract): void {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(adapter.adapterId) ||
        !/^[A-Za-z0-9.+_-]{1,64}$/.test(adapter.adapterVersion)) {
      throw new Error('INVALID_ADAPTER_IDENTIFIER');
    }
    if (adapter.isSimulator && adapter.verificationStatus === 'implemented_tested') {
      throw new Error('SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');
    }
    if (adapter.verificationStatus === 'implemented_tested' && !adapter.verifiedHardware) {
      throw new Error('UNVERIFIED_HARDWARE_ADAPTER');
    }
    this.adapters.set(this.key(adapter.adapterId, adapter.adapterVersion), adapter);
  }

  get(adapterId: string, adapterVersion?: string): AttendanceAdapterContract | undefined {
    if (adapterVersion) {
      return this.adapters.get(this.key(adapterId, adapterVersion));
    }
    return [...this.adapters.values()].find(item => item.adapterId === adapterId);
  }

  list(): AttendanceAdapterContract[] {
    return [...this.adapters.values()];
  }

  assertProductionVerificationEligible(
    adapterId: string,
    adapterVersion: string,
    verificationEvidence: Record<string, unknown>
  ): AttendanceAdapterContract {
    const adapter = this.get(adapterId, adapterVersion);
    if (!adapter) {
      throw new Error('ADAPTER_NOT_REGISTERED');
    }
    if (adapter.isSimulator || adapter.verificationStatus === 'test_simulator') {
      throw new Error('SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');
    }
    if (!adapter.verifiedHardware) {
      throw new Error('UNVERIFIED_HARDWARE_ADAPTER');
    }
    const runId = typeof verificationEvidence?.testRunId === 'string' && verificationEvidence.testRunId.trim()
      ? verificationEvidence.testRunId
      : typeof verificationEvidence?.testSuiteRunId === 'string' && verificationEvidence.testSuiteRunId.trim()
        ? verificationEvidence.testSuiteRunId
        : '';
    const signerOrTime = (typeof verificationEvidence?.protocolVerifiedAt === 'string' && verificationEvidence.protocolVerifiedAt.trim()) ||
      (typeof verificationEvidence?.verifiedBy === 'string' && verificationEvidence.verifiedBy.trim());
    if (!verificationEvidence || !runId || !signerOrTime) {
      throw new Error('ADAPTER_VERIFICATION_EVIDENCE_REQUIRED');
    }
    return adapter;
  }

  checkCompatibility(input: {
    adapterId: string;
    adapterVersion?: string;
    integrationMethod: AdapterIntegrationMethod;
    eventTypes: readonly AttendanceEventType[];
    modalities: readonly AttendanceVerificationMethod[];
    firmwareVersion?: string;
    requiresOfflineSync?: boolean;
    requiresCredentialManagement?: boolean;
  }): { compatible: boolean; reasons: string[] } {
    const adapter = this.get(input.adapterId, input.adapterVersion);
    if (!adapter) return { compatible: false, reasons: ['ADAPTER_NOT_REGISTERED'] };
    const reasons: string[] = [];
    if (adapter.isSimulator || adapter.verificationStatus === 'test_simulator') {
      reasons.push('SIMULATOR_ADAPTER_NOT_PRODUCTION_ELIGIBLE');
    }
    if (adapter.verificationStatus !== 'implemented_tested' || !adapter.verifiedHardware) {
      reasons.push('ADAPTER_NOT_HARDWARE_VERIFIED');
    }
    if (!adapter.supportedIntegrationMethods.includes(input.integrationMethod)) {
      reasons.push('INTEGRATION_METHOD_UNSUPPORTED');
    }
    if (input.eventTypes.some(t => !adapter.supportedEventTypes.includes(t))) {
      reasons.push('REQUIRED_EVENT_TYPE_UNSUPPORTED');
    }
    if (input.modalities.some(m => !adapter.supportedModalities.includes(m))) {
      reasons.push('MODALITY_UNSUPPORTED');
    }
    if (input.requiresOfflineSync && !adapter.offlineSyncSupported) {
      reasons.push('OFFLINE_SYNC_UNSUPPORTED');
    }
    if (input.requiresCredentialManagement && !adapter.credentialManagementSupported) {
      reasons.push('CREDENTIAL_MANAGEMENT_UNSUPPORTED');
    }
    if (input.firmwareVersion) {
      if (adapter.supportedFirmware.length === 0) {
        reasons.push('FIRMWARE_COMPATIBILITY_UNKNOWN');
      } else if (!adapter.supportedFirmware.includes(input.firmwareVersion)) {
        reasons.push('FIRMWARE_UNVERIFIED');
      }
    }
    return { compatible: reasons.length === 0, reasons };
  }
}

export const defaultAttendanceAdapterRegistry = new AttendanceAdapterRegistry();
