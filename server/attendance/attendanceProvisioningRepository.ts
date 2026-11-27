import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import {
  AttendanceAdapterRegistry,
  defaultAttendanceAdapterRegistry,
  type AdapterIntegrationMethod,
  type AdapterVerificationStatus
} from './adapterRegistry';
import {
  assertAttendanceProvisioningTransition,
  isReadyToActivateDevice,
  MAX_PROVISIONING_ATTEMPTS,
  validateCatalogueCompatibility,
  type AttendanceProvisioningState,
  type AttendanceProvisioningStep
} from './provisioningWorkflow';
import type { AttendanceDeviceCategory } from '../../src/data/attendanceDeviceProvisioningTemplate';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKeyPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const eventTypes = new Set([
  'school_arrival', 'school_departure', 'classroom_arrival', 'classroom_departure',
  'clock_in', 'clock_out'
]);
const modalitiesSet = new Set(['rfid', 'fingerprint', 'facial', 'combined']);
const integrationMethods = new Set([
  'signed_http', 'mutual_tls', 'vendor_gateway', 'local_gateway', 'unknown'
]);

export interface CreateAttendanceProvisioningRequest {
  deviceCategory: AttendanceDeviceCategory;
  deviceModelId?: string;
  quantity: number;
  intendedLocations: string[];
  intendedPopulation: 'students' | 'staff' | 'both';
  attendanceUseCases: string[];
  preferredIntegrationMethod: 'signed_http' | 'mutual_tls' | 'vendor_gateway' | 'local_gateway' | 'unknown';
  requiredCapabilities?: string[];
  firmwareVersion?: string;
}

export interface AttendanceProvisioningRequestRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  application_instance_id: string;
  device_category: AttendanceDeviceCategory;
  device_model_id: string | null;
  quantity: number;
  state: AttendanceProvisioningState;
  retryable: boolean;
  attempt_count: number;
  created_at: Date;
  updated_at: Date;
  error_code?: string | null;
}

export interface DeviceCatalogueModelInput {
  manufacturer: string;
  model: string;
  category: AttendanceDeviceCategory;
  modalities: string[];
  communicationProtocols?: string[];
  integrationMethod: AdapterIntegrationMethod;
  firmwareCompatibility?: { supportedVersions?: string[]; [key: string]: unknown };
  supportedEventTypes: string[];
  offlineSync: boolean;
  credentialManagement: boolean;
  configurationCapabilities?: string[];
  adapterId?: string | null;
  adapterVersion?: string | null;
  verificationStatus?: AdapterVerificationStatus;
  verificationEvidence?: Record<string, unknown>;
  operationalLimitations?: string[];
  enabled?: boolean;
}

export interface RegisterAdapterInput {
  adapterId: string;
  adapterVersion: string;
  manufacturer: string;
  supportedModels: string[];
  capabilityManifest: Record<string, unknown>;
  verificationStatus: AdapterVerificationStatus;
  enabled: boolean;
  verificationEvidence?: Record<string, unknown>;
}

export interface ProvisioningValidationOutcome {
  request: AttendanceProvisioningRequestRecord;
  compatible: boolean;
  reasons: string[];
}

export interface ProvisioningExecutionStepEvidence {
  enrollmentAcknowledgedByDevices?: Record<string, { operationReference: string; acknowledgedAt: string }>;
  configurationApplied?: { operationReference: string; configuredAt: string };
  connectionTestPassed?: { operationReference: string; latencyMs?: number };
  timeSyncPassed?: { operationReference: string; clockDriftMs: number };
  eventDeliveryTestPassed?: { operationReference: string; testEventId: string };
  attendanceAcceptanceTestPassed?: { operationReference: string; scenarioCount: number };
}

export interface ProvisioningExecutionResult {
  request: AttendanceProvisioningRequestRecord;
  allocatedDevices: Array<{
    deviceId: string;
    deviceIdentity: string;
    locationId: string;
    approvedLocation: string;
    credentialVersion: number;
    status: string;
  }>;
  blocked: boolean;
  pendingStep?: AttendanceProvisioningStep;
  blockedReason?: string;
}

function validateRequest(input: CreateAttendanceProvisioningRequest): CreateAttendanceProvisioningRequest {
  if (!input || typeof input !== 'object' ||
      !['rfid', 'fingerprint', 'facial', 'combined'].includes(input.deviceCategory) ||
      (input.deviceModelId !== undefined && !uuid.test(input.deviceModelId)) ||
      !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 1000 ||
      !Array.isArray(input.intendedLocations) || !input.intendedLocations.length ||
      input.intendedLocations.length > 100 ||
      input.intendedLocations.some(location => typeof location !== 'string' ||
        !location.trim() || location.trim().length > 200) ||
      new Set(input.intendedLocations.map(location => location.trim().toLowerCase())).size !==
        input.intendedLocations.length ||
      !['students', 'staff', 'both'].includes(input.intendedPopulation) ||
      !Array.isArray(input.attendanceUseCases) || !input.attendanceUseCases.length ||
      input.attendanceUseCases.some(useCase => !eventTypes.has(useCase)) ||
      new Set(input.attendanceUseCases).size !== input.attendanceUseCases.length ||
      !integrationMethods.has(input.preferredIntegrationMethod) ||
      (input.firmwareVersion !== undefined &&
        (typeof input.firmwareVersion !== 'string' || !/^[A-Za-z0-9._:-]{1,64}$/.test(input.firmwareVersion))) ||
      (input.requiredCapabilities !== undefined &&
        (!Array.isArray(input.requiredCapabilities) ||
         input.requiredCapabilities.length > 32 ||
         input.requiredCapabilities.some(capability =>
           typeof capability !== 'string' || !/^[a-z][a-z0-9_.-]{0,127}$/.test(capability))))) {
    throw new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST');
  }
  return {
    ...input,
    intendedLocations: input.intendedLocations.map(location => location.trim()),
    attendanceUseCases: [...input.attendanceUseCases].sort(),
    requiredCapabilities: [...new Set(input.requiredCapabilities ?? [])].sort()
  };
}

function requestHash(instanceId: string, input: CreateAttendanceProvisioningRequest): string {
  return createHash('sha256').update(JSON.stringify({
    instanceId,
    deviceCategory: input.deviceCategory,
    deviceModelId: input.deviceModelId ?? null,
    quantity: input.quantity,
    intendedLocations: [...input.intendedLocations].sort((a, b) => a.localeCompare(b)),
    intendedPopulation: input.intendedPopulation,
    attendanceUseCases: [...input.attendanceUseCases].sort(),
    preferredIntegrationMethod: input.preferredIntegrationMethod,
    requiredCapabilities: [...(input.requiredCapabilities ?? [])].sort(),
    firmwareVersion: input.firmwareVersion ?? null
  })).digest('hex');
}

function actor(principal: VerifiedTenantPrincipal): string {
  const identity = principal.userId || principal.email;
  if (!identity) throw new Error('VERIFIED_ACTOR_ID_REQUIRED');
  return identity;
}

function slugLocationKey(label: string): string {
  const cleaned = label.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '');
  const base = cleaned || 'location';
  return base.slice(0, 120);
}

function extractSupportedFirmware(firmwareCompatibility: unknown): string[] {
  if (!firmwareCompatibility || typeof firmwareCompatibility !== 'object' || Array.isArray(firmwareCompatibility)) {
    return [];
  }
  const raw = (firmwareCompatibility as { supportedVersions?: unknown; versions?: unknown });
  const list = Array.isArray(raw.supportedVersions) ? raw.supportedVersions
    : Array.isArray(raw.versions) ? raw.versions : [];
  return list.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapCategoryModalities(category: AttendanceDeviceCategory, modelModalities?: string[]): string[] {
  if (modelModalities && modelModalities.length > 0) return modelModalities;
  return category === 'combined' ? ['rfid', 'fingerprint', 'facial'] : [category];
}

export class AttendanceProvisioningRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly adapterRegistry: AttendanceAdapterRegistry = defaultAttendanceAdapterRegistry
  ) {}

  async createRequest(
    principal: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    rawInput: CreateAttendanceProvisioningRequest,
    idempotencyKey: string
  ): Promise<AttendanceProvisioningRequestRecord> {
    if (!uuid.test(applicationInstanceId) || !idempotencyKeyPattern.test(idempotencyKey)) {
      throw new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST');
    }
    const input = validateRequest(rawInput);
    const digest = requestHash(applicationInstanceId, input);
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const instance = await client.query<{
        tenant_id: string;
        school_id: string;
        capability_status: string | null;
      }>(
        `SELECT instance.tenant_id, instance.school_id, capability.status AS capability_status
         FROM production.application_instances instance
         LEFT JOIN attendance.school_capabilities capability
           ON capability.tenant_id = instance.tenant_id
          AND capability.school_id = instance.school_id
          AND capability.application_instance_id = instance.id
         WHERE instance.id = $1 AND instance.status IN ('ready_for_activation', 'active')`,
        [applicationInstanceId]
      );
      const owner = instance.rows[0];
      if (!owner || !['requested', 'provisioning', 'provisioned', 'active'].includes(owner.capability_status || '')) {
        throw new Error('ATTENDANCE_CAPABILITY_NOT_REQUESTED');
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`attendance-provisioning:${owner.tenant_id}:${owner.school_id}:${idempotencyKey}`]);

      if (input.deviceModelId) {
        const model = await client.query<{ category: string }>(
          'SELECT category FROM attendance.device_catalogue WHERE id = $1',
          [input.deviceModelId]
        );
        if (!model.rows[0] || model.rows[0].category !== input.deviceCategory) {
          throw new Error('DEVICE_MODEL_NOT_CATALOGUED_FOR_CATEGORY');
        }
      }

      const existing = await client.query<AttendanceProvisioningRequestRecord & { request_hash: string }>(
        `SELECT id, tenant_id, school_id, application_instance_id, device_category,
                device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at, request_hash
         FROM attendance.provisioning_requests
         WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3
         FOR UPDATE`,
        [owner.tenant_id, owner.school_id, idempotencyKey]
      );
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== digest) throw new Error('IDEMPOTENCY_CONFLICT');
        const { request_hash: _hash, ...record } = existing.rows[0];
        return record;
      }

      const inserted = await client.query<AttendanceProvisioningRequestRecord>(
        `INSERT INTO attendance.provisioning_requests
           (tenant_id, school_id, application_instance_id, idempotency_key, request_hash,
            device_category, device_model_id, quantity, intended_locations,
            intended_population, attendance_use_cases, preferred_integration_method,
            required_capabilities, requested_by, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::text[],
                 $12, $13::text[], $14, 'requested')
         RETURNING id, tenant_id, school_id, application_instance_id, device_category,
                   device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at`,
        [owner.tenant_id, owner.school_id, applicationInstanceId, idempotencyKey, digest,
          input.deviceCategory, input.deviceModelId ?? null, input.quantity,
          JSON.stringify(input.intendedLocations), input.intendedPopulation,
          input.attendanceUseCases, input.preferredIntegrationMethod,
          input.requiredCapabilities, actor(principal)]
      );
      const request = inserted.rows[0];
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, new_state, idempotency_key)
         VALUES ($1, $2, $3, $4, 'provisioning_request_created', 'requested', $5)`,
        [owner.tenant_id, owner.school_id, request.id, actor(principal), idempotencyKey]
      );
      return request;
    });
  }

  async listCatalogue(principal: VerifiedTenantPrincipal, modelId?: string) {
    if (modelId !== undefined && !uuid.test(modelId)) throw new Error('INVALID_DEVICE_MODEL_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query(
        `SELECT id, manufacturer, model, category, modalities, communication_protocols,
                integration_method, firmware_compatibility, supported_event_types,
                offline_sync, credential_management, configuration_capabilities,
                adapter_id, adapter_version, verification_status, verification_evidence,
                operational_limitations, enabled, updated_by, created_at, updated_at
         FROM attendance.device_catalogue
         WHERE ($1::uuid IS NULL OR id = $1::uuid)
         ORDER BY manufacturer, model`,
        [modelId ?? null]
      );
      return result.rows;
    });
  }

  async createCatalogueModel(principal: VerifiedTenantPrincipal, input: DeviceCatalogueModelInput) {
    if (!input || !input.manufacturer?.trim() || !input.model?.trim() ||
        !['rfid', 'fingerprint', 'facial', 'combined'].includes(input.category) ||
        !Array.isArray(input.modalities) || input.modalities.length === 0 ||
        input.modalities.some(m => !modalitiesSet.has(m)) ||
        !integrationMethods.has(input.integrationMethod) ||
        !Array.isArray(input.supportedEventTypes) ||
        input.supportedEventTypes.some(e => !eventTypes.has(e))) {
      throw new Error('INVALID_CATALOGUE_MODEL_INPUT');
    }
    const status: AdapterVerificationStatus = input.verificationStatus ?? 'planned';
    if (!['implemented_tested', 'vendor_supported_not_integrated', 'planned', 'test_simulator'].includes(status)) {
      throw new Error('INVALID_VERIFICATION_STATUS');
    }
    if (status === 'implemented_tested') {
      if (!input.adapterId || !input.adapterVersion) {
        throw new Error('ADAPTER_VERIFICATION_EVIDENCE_REQUIRED');
      }
      if (input.adapterId.toLowerCase().includes('simulator')) {
        throw new Error('SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');
      }
      this.adapterRegistry.assertProductionVerificationEligible(
        input.adapterId,
        input.adapterVersion,
        input.verificationEvidence ?? {}
      );
    }

    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO attendance.device_catalogue
           (manufacturer, model, category, modalities, communication_protocols,
            integration_method, firmware_compatibility, supported_event_types,
            offline_sync, credential_management, configuration_capabilities,
            adapter_id, adapter_version, verification_status, verification_evidence,
            operational_limitations, enabled, updated_by)
         VALUES ($1, $2, $3, $4::text[], $5::text[], $6, $7::jsonb, $8::text[],
                 $9, $10, $11::text[], $12, $13, $14, $15::jsonb, $16::text[], $17, $18)
         RETURNING *`,
        [
          input.manufacturer.trim(),
          input.model.trim(),
          input.category,
          input.modalities,
          input.communicationProtocols ?? [],
          input.integrationMethod,
          JSON.stringify(input.firmwareCompatibility ?? {}),
          input.supportedEventTypes,
          Boolean(input.offlineSync),
          Boolean(input.credentialManagement),
          input.configurationCapabilities ?? [],
          input.adapterId ?? null,
          input.adapterVersion ?? null,
          status,
          JSON.stringify(input.verificationEvidence ?? {}),
          input.operationalLimitations ?? [],
          input.enabled ?? true,
          actor(principal)
        ]
      );
      const model = res.rows[0];
      await client.query(
        `INSERT INTO attendance.catalogue_audit_events
           (catalogue_model_id, adapter_id, adapter_version, actor, action, safe_details)
         VALUES ($1, $2, $3, $4, 'catalogue_model_created', $5::jsonb)`,
        [
          model.id,
          input.adapterId ?? null,
          input.adapterVersion ?? null,
          actor(principal),
          JSON.stringify({ manufacturer: input.manufacturer.trim(), model: input.model.trim(), verificationStatus: status })
        ]
      );
      return model;
    });
  }

  async updateCatalogueModel(
    principal: VerifiedTenantPrincipal,
    modelId: string,
    patch: Partial<DeviceCatalogueModelInput> & { reason?: string }
  ) {
    if (!uuid.test(modelId)) throw new Error('INVALID_DEVICE_MODEL_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const existing = await client.query<any>(
        'SELECT * FROM attendance.device_catalogue WHERE id = $1 FOR UPDATE',
        [modelId]
      );
      const current = existing.rows[0];
      if (!current) throw new Error('DEVICE_MODEL_NOT_FOUND');

      const nextStatus: AdapterVerificationStatus = patch.verificationStatus ?? current.verification_status;
      const nextAdapterId = patch.adapterId !== undefined ? patch.adapterId : current.adapter_id;
      const nextAdapterVersion = patch.adapterVersion !== undefined ? patch.adapterVersion : current.adapter_version;
      const nextEvidence = patch.verificationEvidence ?? current.verification_evidence ?? {};

      if (nextStatus === 'implemented_tested') {
        if (!nextAdapterId || !nextAdapterVersion) {
          throw new Error('ADAPTER_VERIFICATION_EVIDENCE_REQUIRED');
        }
        this.adapterRegistry.assertProductionVerificationEligible(
          nextAdapterId,
          nextAdapterVersion,
          nextEvidence
        );
        const adapterRow = await client.query<{ verification_status: string; enabled: boolean }>(
          `SELECT verification_status, enabled FROM attendance.device_adapters
           WHERE adapter_id = $1 AND adapter_version = $2`,
          [nextAdapterId, nextAdapterVersion]
        );
        if (!adapterRow.rows[0] || !adapterRow.rows[0].enabled || adapterRow.rows[0].verification_status !== 'implemented_tested') {
          throw new Error('ADAPTER_NOT_VERIFIED');
        }
      }

      const nextModalities = patch.modalities ?? current.modalities;
      const nextEventTypes = patch.supportedEventTypes ?? current.supported_event_types;
      const nextIntegrationMethod = patch.integrationMethod ?? current.integration_method;
      if (!Array.isArray(nextModalities) || nextModalities.length === 0 || nextModalities.some(m => !modalitiesSet.has(m)) ||
          !Array.isArray(nextEventTypes) || nextEventTypes.some(e => !eventTypes.has(e)) ||
          !integrationMethods.has(nextIntegrationMethod)) {
        throw new Error('INVALID_CATALOGUE_MODEL_INPUT');
      }

      const updated = await client.query(
        `UPDATE attendance.device_catalogue
         SET communication_protocols = $2::text[],
             integration_method = $3,
             firmware_compatibility = $4::jsonb,
             supported_event_types = $5::text[],
             offline_sync = $6,
             credential_management = $7,
             configuration_capabilities = $8::text[],
             adapter_id = $9,
             adapter_version = $10,
             verification_status = $11,
             verification_evidence = $12::jsonb,
             operational_limitations = $13::text[],
             modalities = $14::text[],
             enabled = $15,
             updated_by = $16,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          modelId,
          patch.communicationProtocols ?? current.communication_protocols,
          nextIntegrationMethod,
          JSON.stringify(patch.firmwareCompatibility ?? current.firmware_compatibility ?? {}),
          nextEventTypes,
          patch.offlineSync ?? current.offline_sync,
          patch.credentialManagement ?? current.credential_management,
          patch.configurationCapabilities ?? current.configuration_capabilities,
          nextAdapterId,
          nextAdapterVersion,
          nextStatus,
          JSON.stringify(nextEvidence),
          patch.operationalLimitations ?? current.operational_limitations,
          nextModalities,
          patch.enabled ?? current.enabled,
          actor(principal)
        ]
      );
      await client.query(
        `INSERT INTO attendance.catalogue_audit_events
           (catalogue_model_id, adapter_id, adapter_version, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'catalogue_model_updated', $5, $6::jsonb)`,
        [
          modelId,
          nextAdapterId,
          nextAdapterVersion,
          actor(principal),
          patch.reason ?? null,
          JSON.stringify({ verificationStatus: nextStatus, enabled: patch.enabled ?? current.enabled })
        ]
      );
      return updated.rows[0];
    });
  }

  async setCatalogueModelEnabled(
    principal: VerifiedTenantPrincipal,
    modelId: string,
    enabled: boolean,
    reason?: string
  ) {
    if (!uuid.test(modelId)) throw new Error('INVALID_DEVICE_MODEL_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `UPDATE attendance.device_catalogue
         SET enabled = $2, updated_by = $3, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [modelId, enabled, actor(principal)]
      );
      if (!res.rows[0]) throw new Error('DEVICE_MODEL_NOT_FOUND');
      await client.query(
        `INSERT INTO attendance.catalogue_audit_events
           (catalogue_model_id, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          modelId,
          actor(principal),
          enabled ? 'catalogue_model_enabled' : 'catalogue_model_disabled',
          reason ?? null,
          JSON.stringify({ enabled })
        ]
      );
      return res.rows[0];
    });
  }

  async registerAdapter(principal: VerifiedTenantPrincipal, input: RegisterAdapterInput) {
    if (!input || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(input.adapterId) ||
        !/^[A-Za-z0-9.+_-]{1,64}$/.test(input.adapterVersion) ||
        !input.manufacturer?.trim()) {
      throw new Error('INVALID_ADAPTER_REGISTRATION');
    }
    const isSimulatorInput = input.capabilityManifest?.isSimulator === true ||
      input.adapterId.toLowerCase().includes('simulator') ||
      input.verificationStatus === 'test_simulator';
    if (isSimulatorInput && input.verificationStatus === 'implemented_tested') {
      throw new Error('SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');
    }
    if (input.verificationStatus === 'implemented_tested') {
      this.adapterRegistry.assertProductionVerificationEligible(
        input.adapterId,
        input.adapterVersion,
        input.verificationEvidence ?? {}
      );
    }
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO attendance.device_adapters
           (adapter_id, adapter_version, manufacturer, supported_models, capability_manifest,
            verification_status, enabled, verified_at, verified_by, verification_evidence, updated_at)
         VALUES ($1, $2, $3, $4::text[], $5::jsonb, $6, $7,
                 CASE WHEN $6 = 'implemented_tested' THEN now() ELSE NULL END,
                 CASE WHEN $6 = 'implemented_tested' THEN $8 ELSE NULL END,
                 $9::jsonb, now())
         ON CONFLICT (adapter_id, adapter_version)
         DO UPDATE SET
           manufacturer = EXCLUDED.manufacturer,
           supported_models = EXCLUDED.supported_models,
           capability_manifest = EXCLUDED.capability_manifest,
           verification_status = EXCLUDED.verification_status,
           enabled = EXCLUDED.enabled,
           verified_at = EXCLUDED.verified_at,
           verified_by = EXCLUDED.verified_by,
           verification_evidence = EXCLUDED.verification_evidence,
           updated_at = now()
         RETURNING *`,
        [
          input.adapterId,
          input.adapterVersion,
          input.manufacturer.trim(),
          input.supportedModels ?? [],
          JSON.stringify(input.capabilityManifest ?? {}),
          input.verificationStatus,
          Boolean(input.enabled),
          actor(principal),
          JSON.stringify(input.verificationEvidence ?? {})
        ]
      );
      await client.query(
        `INSERT INTO attendance.catalogue_audit_events
           (adapter_id, adapter_version, actor, action, safe_details)
         VALUES ($1, $2, $3, 'adapter_registered', $4::jsonb)`,
        [
          input.adapterId,
          input.adapterVersion,
          actor(principal),
          JSON.stringify({ verificationStatus: input.verificationStatus, enabled: Boolean(input.enabled) })
        ]
      );
      return res.rows[0];
    });
  }

  async verifyAdapter(
    principal: VerifiedTenantPrincipal,
    adapterId: string,
    adapterVersion: string,
    input: {
      verificationStatus: AdapterVerificationStatus;
      verificationEvidence: Record<string, unknown>;
      enabled: boolean;
      reason?: string;
    }
  ) {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(adapterId) ||
        !/^[A-Za-z0-9.+_-]{1,64}$/.test(adapterVersion)) {
      throw new Error('INVALID_ADAPTER_IDENTIFIER');
    }
    if (input.verificationStatus === 'implemented_tested') {
      if (adapterId.toLowerCase().includes('simulator')) {
        throw new Error('SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED');
      }
      this.adapterRegistry.assertProductionVerificationEligible(
        adapterId,
        adapterVersion,
        input.verificationEvidence
      );
    }
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `UPDATE attendance.device_adapters
         SET verification_status = $3,
             enabled = $4,
             verification_evidence = $5::jsonb,
             verified_at = CASE WHEN $3 = 'implemented_tested' THEN now() ELSE NULL END,
             verified_by = CASE WHEN $3 = 'implemented_tested' THEN $6 ELSE NULL END,
             updated_at = now()
         WHERE adapter_id = $1 AND adapter_version = $2
         RETURNING *`,
        [
          adapterId,
          adapterVersion,
          input.verificationStatus,
          Boolean(input.enabled),
          JSON.stringify(input.verificationEvidence ?? {}),
          actor(principal)
        ]
      );
      if (!res.rows[0]) throw new Error('ADAPTER_NOT_FOUND');
      await client.query(
        `INSERT INTO attendance.catalogue_audit_events
           (adapter_id, adapter_version, actor, action, reason, safe_details)
         VALUES ($1, $2, $3, 'adapter_verification_updated', $4, $5::jsonb)`,
        [
          adapterId,
          adapterVersion,
          actor(principal),
          input.reason ?? null,
          JSON.stringify({ verificationStatus: input.verificationStatus, enabled: Boolean(input.enabled) })
        ]
      );
      return res.rows[0];
    });
  }

  async getRequest(principal: VerifiedTenantPrincipal, requestId: string) {
    if (!uuid.test(requestId)) throw new Error('INVALID_PROVISIONING_REQUEST_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query<AttendanceProvisioningRequestRecord>(
        `SELECT id, tenant_id, school_id, application_instance_id, device_category,
                device_model_id, quantity, state, retryable, attempt_count,
                error_code, created_at, updated_at
         FROM attendance.provisioning_requests WHERE id = $1`,
        [requestId]
      );
      return result.rows[0];
    });
  }

  async getRequestDetails(principal: VerifiedTenantPrincipal, requestId: string) {
    if (!uuid.test(requestId)) throw new Error('INVALID_PROVISIONING_REQUEST_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const reqRes = await client.query(
        'SELECT * FROM attendance.provisioning_requests WHERE id = $1',
        [requestId]
      );
      const request = reqRes.rows[0];
      if (!request) return undefined;
      const [steps, allocations, audit] = await Promise.all([
        client.query(
          `SELECT step_id, step_name, attempt_number, status, adapter_operation_reference,
                  safe_result, error_code, started_at, completed_at
           FROM attendance.provisioning_steps
           WHERE tenant_id = $1 AND request_id = $2
           ORDER BY started_at ASC`,
          [request.tenant_id, requestId]
        ),
        client.query(
          `SELECT a.id, a.device_id, d.device_identity, a.location_id, d.approved_location,
                  a.state, d.status AS device_status, a.allocated_at
           FROM attendance.device_allocations a
           JOIN attendance.devices d
             ON d.tenant_id = a.tenant_id AND d.school_id = a.school_id AND d.id = a.device_id
           WHERE a.tenant_id = $1 AND a.provisioning_request_id = $2
           ORDER BY a.allocated_at ASC`,
          [request.tenant_id, requestId]
        ),
        client.query(
          `SELECT id, actor, action, previous_state, new_state, reason, safe_details, occurred_at
           FROM attendance.provisioning_audit_events
           WHERE tenant_id = $1 AND request_id = $2
           ORDER BY occurred_at DESC`,
          [request.tenant_id, requestId]
        )
      ]);
      return {
        request,
        steps: steps.rows,
        allocations: allocations.rows,
        auditEvents: audit.rows
      };
    });
  }

  async validateProvisioningRequest(
    principal: VerifiedTenantPrincipal,
    requestId: string,
    idempotencyKey: string,
    firmwareVersion?: string
  ): Promise<ProvisioningValidationOutcome> {
    if (!uuid.test(requestId) || !idempotencyKeyPattern.test(idempotencyKey)) {
      throw new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST');
    }
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const duplicate = await client.query<{ new_state: string }>(
        `SELECT new_state FROM attendance.provisioning_audit_events
         WHERE request_id = $1 AND idempotency_key = $2`,
        [requestId, idempotencyKey]
      );
      const current = await client.query<any>(
        'SELECT * FROM attendance.provisioning_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      const request = current.rows[0];
      if (!request) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');

      if (duplicate.rows[0]) {
        if (duplicate.rows[0].new_state !== request.state) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        return {
          request,
          compatible: request.state === 'allocation_pending',
          reasons: request.error_code ? String(request.error_code).split(',') : []
        };
      }

      if (!['requested', 'compatibility_check', 'retry_pending'].includes(request.state)) {
        throw new Error('ATTENDANCE_PROVISIONING_STATE_CONFLICT');
      }

      const attemptNumber = Math.min(MAX_PROVISIONING_ATTEMPTS, (request.attempt_count || 0) + 1);
      if (request.state === 'requested') {
        assertAttendanceProvisioningTransition('requested', 'compatibility_check');
      } else if (request.state === 'retry_pending') {
        assertAttendanceProvisioningTransition('retry_pending', 'compatibility_check');
      }

      let modelRow: any;
      if (request.device_model_id) {
        const modelRes = await client.query(
          `SELECT c.*, a.enabled AS adapter_enabled, a.verification_status AS adapter_verification_status
           FROM attendance.device_catalogue c
           LEFT JOIN attendance.device_adapters a
             ON a.adapter_id = c.adapter_id AND a.adapter_version = c.adapter_version
           WHERE c.id = $1`,
          [request.device_model_id]
        );
        modelRow = modelRes.rows[0];
      }

      const requiresOfflineSync = Array.isArray(request.required_capabilities) &&
        request.required_capabilities.includes('offline_sync');
      const compatibility = validateCatalogueCompatibility(
        {
          category: request.device_category,
          requiredEventTypes: request.attendance_use_cases,
          firmwareVersion,
          requiresOfflineSync,
          preferredIntegrationMethod: request.preferred_integration_method,
          requiredCapabilities: request.required_capabilities ?? [],
          intendedLocations: Array.isArray(request.intended_locations) ? request.intended_locations : [],
          quantity: request.quantity
        },
        modelRow ? {
          category: modelRow.category,
          verificationStatus: modelRow.verification_status,
          supportedEventTypes: modelRow.supported_event_types ?? [],
          offlineSync: Boolean(modelRow.offline_sync),
          supportedFirmware: extractSupportedFirmware(modelRow.firmware_compatibility),
          enabledAdapter: Boolean(modelRow.adapter_enabled) &&
            modelRow.adapter_verification_status === 'implemented_tested',
          enabled: modelRow.enabled !== false,
          modalities: modelRow.modalities ?? [],
          integrationMethod: modelRow.integration_method,
          credentialManagement: Boolean(modelRow.credential_management),
          configurationCapabilities: modelRow.configuration_capabilities ?? []
        } : undefined
      );

      if (compatibility.compatible && modelRow?.adapter_id) {
        const adapterCompat = this.adapterRegistry.checkCompatibility({
          adapterId: modelRow.adapter_id,
          adapterVersion: modelRow.adapter_version ?? undefined,
          integrationMethod: request.preferred_integration_method,
          eventTypes: request.attendance_use_cases,
          modalities: modelRow.modalities ?? [],
          firmwareVersion,
          requiresOfflineSync
        });
        if (!adapterCompat.compatible) {
          compatibility.compatible = false;
          for (const reason of adapterCompat.reasons) {
            if (!compatibility.reasons.includes(reason)) compatibility.reasons.push(reason);
          }
        }
      }

      const nextState: AttendanceProvisioningState = compatibility.compatible ? 'allocation_pending' : 'rejected';
      const errorCode = compatibility.compatible ? null : compatibility.reasons.join(',').slice(0, 200);

      await client.query(
        `INSERT INTO attendance.provisioning_steps
           (tenant_id, school_id, request_id, step_name, attempt_number, status, safe_result, error_code, completed_at)
         VALUES ($1, $2, $3, 'compatibility', $4, $5, $6::jsonb, $7, now())
         ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
         SET status = EXCLUDED.status, safe_result = EXCLUDED.safe_result, error_code = EXCLUDED.error_code, completed_at = now()`,
        [
          request.tenant_id,
          request.school_id,
          requestId,
          attemptNumber,
          compatibility.compatible ? 'succeeded' : 'failed',
          JSON.stringify({ reasons: compatibility.reasons }),
          compatibility.compatible ? null : compatibility.reasons[0] ?? 'INCOMPATIBLE_DEVICE'
        ]
      );

      const updated = await client.query<AttendanceProvisioningRequestRecord>(
        `UPDATE attendance.provisioning_requests
         SET state = $2,
             retryable = false,
             error_code = $3,
             completed_at = CASE WHEN $2 = 'rejected' THEN now() ELSE NULL END,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $4
         RETURNING id, tenant_id, school_id, application_instance_id, device_category,
                   device_model_id, quantity, state, retryable, attempt_count,
                   error_code, created_at, updated_at`,
        [request.tenant_id, nextState, errorCode, requestId]
      );

      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, previous_state, new_state, idempotency_key, reason, safe_details)
         VALUES ($1, $2, $3, $4, 'provisioning_validation_completed', $5, $6, $7, $8, $9::jsonb)`,
        [
          request.tenant_id,
          request.school_id,
          requestId,
          actor(principal),
          request.state,
          nextState,
          idempotencyKey,
          errorCode,
          JSON.stringify({ compatible: compatibility.compatible, reasons: compatibility.reasons })
        ]
      );

      return {
        request: updated.rows[0],
        compatible: compatibility.compatible,
        reasons: compatibility.reasons
      };
    });
  }

  async executeProvisioningRequest(
    principal: VerifiedTenantPrincipal,
    requestId: string,
    evidence: ProvisioningExecutionStepEvidence,
    idempotencyKey: string
  ): Promise<ProvisioningExecutionResult> {
    if (!uuid.test(requestId) || !idempotencyKeyPattern.test(idempotencyKey)) {
      throw new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST');
    }
    const executor = actor(principal);
    const membershipCheck = uuid.test(principal.userId || '');

    return withControlPlaneTransaction(this.pool, principal, async client => {
      const duplicate = await client.query<{ new_state: string; safe_details: any }>(
        `SELECT new_state, safe_details FROM attendance.provisioning_audit_events
         WHERE request_id = $1 AND idempotency_key = $2`,
        [requestId, idempotencyKey]
      );
      const currentRes = await client.query<any>(
        'SELECT * FROM attendance.provisioning_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      let request = currentRes.rows[0];
      if (!request) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');

      if (duplicate.rows[0]) {
        const allocRows = await client.query<any>(
          `SELECT a.device_id, d.device_identity, a.location_id, d.approved_location,
                  COALESCE(c.credential_version, 1) AS credential_version, d.status
           FROM attendance.device_allocations a
           JOIN attendance.devices d
             ON d.tenant_id = a.tenant_id AND d.school_id = a.school_id AND d.id = a.device_id
           LEFT JOIN control_plane.attendance_device_credentials c
             ON c.device_identity = d.device_identity
           WHERE a.tenant_id = $1 AND a.provisioning_request_id = $2
           ORDER BY a.allocated_at ASC`,
          [request.tenant_id, requestId]
        );
        const details = duplicate.rows[0].safe_details || {};
        return {
          request,
          allocatedDevices: allocRows.rows.map(r => ({
            deviceId: r.device_id,
            deviceIdentity: r.device_identity,
            locationId: r.location_id,
            approvedLocation: r.approved_location,
            credentialVersion: Number(r.credential_version),
            status: r.status
          })),
          blocked: Boolean(details.blocked),
          pendingStep: details.pendingStep,
          blockedReason: details.blockedReason
        };
      }

      if (['rejected', 'revoked'].includes(request.state)) {
        throw new Error('ATTENDANCE_PROVISIONING_TERMINAL_STATE');
      }

      // 1. Validate first if still in 'requested'
      if (request.state === 'requested') {
        throw new Error('PROVISIONING_COMPATIBILITY_CHECK_REQUIRED');
      }

      const attemptNumber = Math.max(1, Math.min(MAX_PROVISIONING_ATTEMPTS, (request.attempt_count || 0) + 1));

      // Verify school capability and model before allocation
      const capabilityRes = await client.query<{ status: string }>(
        `SELECT status FROM attendance.school_capabilities
         WHERE tenant_id = $1 AND school_id = $2 AND application_instance_id = $3`,
        [request.tenant_id, request.school_id, request.application_instance_id]
      );
      const capabilityStatus = capabilityRes.rows[0]?.status ?? 'not_requested';
      if (!['requested', 'provisioning', 'provisioned', 'active'].includes(capabilityStatus)) {
        throw new Error('ATTENDANCE_CAPABILITY_NOT_REQUESTED');
      }

      let modelRow: any;
      if (request.device_model_id) {
        const modelRes = await client.query(
          `SELECT c.*, a.enabled AS adapter_enabled, a.verification_status AS adapter_verification_status
           FROM attendance.device_catalogue c
           LEFT JOIN attendance.device_adapters a
             ON a.adapter_id = c.adapter_id AND a.adapter_version = c.adapter_version
           WHERE c.id = $1`,
          [request.device_model_id]
        );
        modelRow = modelRes.rows[0];
      }
      if (!modelRow || modelRow.verification_status !== 'implemented_tested' || !modelRow.adapter_enabled || modelRow.enabled === false) {
        throw new Error('ADAPTER_NOT_VERIFIED');
      }

      // Resolve created_by UUID for attendance.devices FK (must exist in production.memberships)
      let createdByUserId: string | undefined = membershipCheck ? principal.userId : undefined;
      if (createdByUserId) {
        const memberExists = await client.query<{ user_id: string }>(
          'SELECT user_id FROM production.memberships WHERE tenant_id = $1 AND user_id = $2',
          [request.tenant_id, createdByUserId]
        );
        if (!memberExists.rows[0]) createdByUserId = undefined;
      }
      if (!createdByUserId) {
        const fallbackMember = await client.query<{ user_id: string }>(
          'SELECT user_id FROM production.memberships WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1',
          [request.tenant_id]
        );
        createdByUserId = fallbackMember.rows[0]?.user_id;
      }
      if (!createdByUserId) {
        throw new Error('TENANT_MEMBERSHIP_REQUIRED_FOR_DEVICE_OWNERSHIP');
      }

      const allocatedDevices: ProvisioningExecutionResult['allocatedDevices'] = [];
      const existingAllocations = await client.query<any>(
        `SELECT a.device_id, d.device_identity, a.location_id, d.approved_location,
                COALESCE(c.credential_version, 1) AS credential_version, d.status
         FROM attendance.device_allocations a
         JOIN attendance.devices d
           ON d.tenant_id = a.tenant_id AND d.school_id = a.school_id AND d.id = a.device_id
         LEFT JOIN control_plane.attendance_device_credentials c
           ON c.device_identity = d.device_identity
         WHERE a.tenant_id = $1 AND a.provisioning_request_id = $2
         ORDER BY a.allocated_at ASC`,
        [request.tenant_id, requestId]
      );
      for (const row of existingAllocations.rows) {
        allocatedDevices.push({
          deviceId: row.device_id,
          deviceIdentity: row.device_identity,
          locationId: row.location_id,
          approvedLocation: row.approved_location,
          credentialVersion: Number(row.credential_version),
          status: row.status
        });
      }

      // 2. Perform device allocation and ServerSecretVault credential issuance
      if (request.state === 'allocation_pending') {
        const intendedLocations: string[] = Array.isArray(request.intended_locations)
          ? request.intended_locations
          : ['Main Entrance'];
        const remaining = Math.max(0, request.quantity - allocatedDevices.length);
        const modalities = mapCategoryModalities(request.device_category, modelRow.modalities);
        const allowedEvents: string[] = request.attendance_use_cases;

        for (let i = 0; i < remaining; i++) {
          const locationName = intendedLocations[(allocatedDevices.length) % intendedLocations.length];
          const locKey = slugLocationKey(locationName);
          const locRes = await client.query<{ id: string }>(
            `INSERT INTO attendance.installation_locations
               (tenant_id, school_id, application_instance_id, location_key, display_name, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             ON CONFLICT (tenant_id, school_id, location_key) DO UPDATE
               SET display_name = EXCLUDED.display_name
             RETURNING id`,
            [request.tenant_id, request.school_id, request.application_instance_id, locKey, locationName]
          );
          const locationId = locRes.rows[0].id;
          const deviceIdentity = `dev-${request.school_id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
          const devRes = await client.query<{ id: string }>(
            `INSERT INTO attendance.devices
               (tenant_id, school_id, device_identity, display_name, device_type, modalities,
                approved_location, location_id, allowed_event_types, permitted_population,
                catalogue_model_id, adapter_id, adapter_version, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9::text[], $10, $11, $12, $13, 'pending', $14)
             RETURNING id`,
            [
              request.tenant_id,
              request.school_id,
              deviceIdentity,
              `${modelRow.manufacturer} ${modelRow.model} (${locationName})`,
              request.device_category,
              modalities,
              locationName,
              locationId,
              allowedEvents,
              request.intended_population,
              modelRow.id,
              modelRow.adapter_id,
              modelRow.adapter_version,
              createdByUserId
            ]
          );
          const deviceId = devRes.rows[0].id;

          // Provision HMAC signing secret encrypted through ServerSecretVault
          const rawSecret = randomBytes(32).toString('hex');
          const encryptedSigningKey = ServerSecretVault.encrypt(rawSecret);

          await client.query(
            `INSERT INTO control_plane.attendance_device_credentials
               (device_identity, tenant_id, school_id, device_id, encrypted_signing_key, credential_version, issued_by)
             VALUES ($1, $2, $3, $4, $5, 1, $6)`,
            [deviceIdentity, request.tenant_id, request.school_id, deviceId, encryptedSigningKey, executor]
          );
          await client.query(
            `INSERT INTO control_plane.attendance_device_credential_history
               (device_identity, tenant_id, school_id, device_id, credential_version, event_type, actor, reason)
             VALUES ($1, $2, $3, $4, 1, 'issued', $5, 'initial_provisioning')`,
            [deviceIdentity, request.tenant_id, request.school_id, deviceId, executor]
          );
          await client.query(
            `INSERT INTO attendance.device_allocations
               (tenant_id, school_id, application_instance_id, device_id, provisioning_request_id,
                catalogue_model_id, location_id, adapter_id, adapter_version, state)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'enrollment_pending')`,
            [
              request.tenant_id,
              request.school_id,
              request.application_instance_id,
              deviceId,
              requestId,
              modelRow.id,
              locationId,
              modelRow.adapter_id,
              modelRow.adapter_version
            ]
          );
          allocatedDevices.push({
            deviceId,
            deviceIdentity,
            locationId,
            approvedLocation: locationName,
            credentialVersion: 1,
            status: 'pending'
          });
        }

        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, safe_result, completed_at)
           VALUES ($1, $2, $3, 'allocation', $4, 'succeeded', $5::jsonb, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', safe_result = EXCLUDED.safe_result, completed_at = now()`,
          [
            request.tenant_id,
            request.school_id,
            requestId,
            attemptNumber,
            JSON.stringify({ allocatedCount: allocatedDevices.length })
          ]
        );

        assertAttendanceProvisioningTransition('allocation_pending', 'allocated');
        assertAttendanceProvisioningTransition('allocated', 'enrollment_pending');
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'enrollment_pending', updated_at = now()
           WHERE tenant_id = $1 AND id = $2
           RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      // Helper to record blocked/pending step honestly without fabricating hardware verification
      const haltPending = async (
        step: AttendanceProvisioningStep,
        reason: string,
        currentState: AttendanceProvisioningState
      ): Promise<ProvisioningExecutionResult> => {
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, safe_result, error_code)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb, $7)
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'pending', safe_result = EXCLUDED.safe_result, error_code = EXCLUDED.error_code`,
          [
            request.tenant_id,
            request.school_id,
            requestId,
            step,
            attemptNumber,
            JSON.stringify({ blockedReason: reason }),
            reason
          ]
        );
        await client.query(
          `INSERT INTO attendance.provisioning_audit_events
             (tenant_id, school_id, request_id, actor, action, previous_state, new_state, idempotency_key, reason, safe_details)
           VALUES ($1, $2, $3, $4, 'provisioning_execution_paused', $5, $5, $6, $7, $8::jsonb)`,
          [
            request.tenant_id,
            request.school_id,
            requestId,
            executor,
            currentState,
            idempotencyKey,
            reason,
            JSON.stringify({ blocked: true, pendingStep: step, blockedReason: reason })
          ]
        );
        return {
          request,
          allocatedDevices,
          blocked: true,
          pendingStep: step,
          blockedReason: reason
        };
      };

      // 3. Enrollment check — only advances with real device enrollment acknowledgements
      if (request.state === 'enrollment_pending' || request.state === 'allocated') {
        const acks = evidence.enrollmentAcknowledgedByDevices ?? {};
        const ackCheck = await client.query<{ device_identity: string; enrollment_acknowledged_at: Date | null }>(
          `SELECT d.device_identity, d.enrollment_acknowledged_at
           FROM attendance.device_allocations a
           JOIN attendance.devices d
             ON d.tenant_id = a.tenant_id AND d.school_id = a.school_id AND d.id = a.device_id
           WHERE a.tenant_id = $1 AND a.provisioning_request_id = $2`,
          [request.tenant_id, requestId]
        );
        const allEnrolled = ackCheck.rows.length >= request.quantity &&
          ackCheck.rows.every(d => d.enrollment_acknowledged_at !== null || Boolean(acks[d.device_identity]?.operationReference));
        if (!allEnrolled) {
          return haltPending('enrollment', 'PHYSICAL_DEVICE_ENROLLMENT_REQUIRED', request.state);
        }
        for (const d of ackCheck.rows) {
          if (!d.enrollment_acknowledged_at && acks[d.device_identity]) {
            await client.query(
              `UPDATE attendance.devices
               SET enrollment_acknowledged_at = now(), status = 'enrolled', updated_at = now()
               WHERE tenant_id = $1 AND device_identity = $2 AND status = 'pending'`,
              [request.tenant_id, d.device_identity]
            );
          }
        }
        await client.query(
          `UPDATE attendance.device_allocations
           SET state = 'enrolled'
           WHERE tenant_id = $1 AND provisioning_request_id = $2 AND state IN ('allocated', 'enrollment_pending')`,
          [request.tenant_id, requestId]
        );
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, completed_at)
           VALUES ($1, $2, $3, 'enrollment', $4, 'succeeded', $5, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber,
            Object.values(acks)[0]?.operationReference ?? 'device_enrollment_ack']
        );
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'configuration_pending', updated_at = now()
           WHERE tenant_id = $1 AND id = $2 RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      // 4. Configuration check — requires real configuration evidence
      if (request.state === 'configuration_pending' || request.state === 'enrolled') {
        if (!evidence.configurationApplied?.operationReference) {
          return haltPending('configuration', 'DEVICE_CONFIGURATION_EVIDENCE_REQUIRED', request.state);
        }
        await client.query(
          `UPDATE attendance.device_allocations
           SET state = 'configured'
           WHERE tenant_id = $1 AND provisioning_request_id = $2 AND state = 'enrolled'`,
          [request.tenant_id, requestId]
        );
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, completed_at)
           VALUES ($1, $2, $3, 'configuration', $4, 'succeeded', $5, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber, evidence.configurationApplied.operationReference]
        );
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'connection_verification', updated_at = now()
           WHERE tenant_id = $1 AND id = $2 RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      // 5. Connection & time sync verification — requires real device check evidence
      if (request.state === 'connection_verification' || request.state === 'configured') {
        if (!evidence.connectionTestPassed?.operationReference) {
          return haltPending('connection_test', 'LIVE_CONNECTION_TEST_REQUIRED', request.state);
        }
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, completed_at)
           VALUES ($1, $2, $3, 'connection_test', $4, 'succeeded', $5, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber, evidence.connectionTestPassed.operationReference]
        );
        if (!evidence.timeSyncPassed?.operationReference) {
          return haltPending('time_sync', 'CLOCK_SYNC_VERIFICATION_REQUIRED', request.state);
        }
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, safe_result, completed_at)
           VALUES ($1, $2, $3, 'time_sync', $4, 'succeeded', $5, $6::jsonb, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, safe_result = EXCLUDED.safe_result, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber,
            evidence.timeSyncPassed.operationReference, JSON.stringify({ clockDriftMs: evidence.timeSyncPassed.clockDriftMs })]
        );
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'integration_verification', updated_at = now()
           WHERE tenant_id = $1 AND id = $2 RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      // 6. Integration verification (event delivery & acceptance)
      if (request.state === 'integration_verification') {
        if (!evidence.eventDeliveryTestPassed?.operationReference) {
          return haltPending('event_delivery_test', 'EVENT_DELIVERY_TEST_REQUIRED', request.state);
        }
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, safe_result, completed_at)
           VALUES ($1, $2, $3, 'event_delivery_test', $4, 'succeeded', $5, $6::jsonb, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber,
            evidence.eventDeliveryTestPassed.operationReference, JSON.stringify({ testEventId: evidence.eventDeliveryTestPassed.testEventId })]
        );
        if (!evidence.attendanceAcceptanceTestPassed?.operationReference) {
          return haltPending('attendance_acceptance_test', 'ATTENDANCE_ACCEPTANCE_TEST_REQUIRED', request.state);
        }
        await client.query(
          `INSERT INTO attendance.provisioning_steps
             (tenant_id, school_id, request_id, step_name, attempt_number, status, adapter_operation_reference, safe_result, completed_at)
           VALUES ($1, $2, $3, 'attendance_acceptance_test', $4, 'succeeded', $5, $6::jsonb, now())
           ON CONFLICT (tenant_id, request_id, step_name, attempt_number) DO UPDATE
           SET status = 'succeeded', adapter_operation_reference = EXCLUDED.adapter_operation_reference, completed_at = now()`,
          [request.tenant_id, request.school_id, requestId, attemptNumber,
            evidence.attendanceAcceptanceTestPassed.operationReference, JSON.stringify({ scenarioCount: evidence.attendanceAcceptanceTestPassed.scenarioCount })]
        );
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'activation_pending', updated_at = now()
           WHERE tenant_id = $1 AND id = $2 RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      // 7. Final activation gate — requires active school capability and all 8 REQUIRED_ACTIVATION_STEPS
      if (request.state === 'activation_pending') {
        if (capabilityStatus !== 'active') {
          return haltPending('attendance_acceptance_test', 'SCHOOL_CAPABILITY_NOT_ACTIVE', request.state);
        }
        await client.query(
          `UPDATE attendance.device_allocations
           SET state = 'active'
           WHERE tenant_id = $1 AND provisioning_request_id = $2 AND state = 'configured'`,
          [request.tenant_id, requestId]
        );
        await this.assertActivationReady(client, request);
        await client.query(
          `UPDATE attendance.devices d
           SET status = 'active', updated_at = now()
           FROM attendance.device_allocations a
           WHERE a.tenant_id = d.tenant_id AND a.school_id = d.school_id AND a.device_id = d.id
             AND a.tenant_id = $1 AND a.provisioning_request_id = $2`,
          [request.tenant_id, requestId]
        );
        const upd = await client.query<AttendanceProvisioningRequestRecord>(
          `UPDATE attendance.provisioning_requests
           SET state = 'active', completed_at = now(), updated_at = now()
           WHERE tenant_id = $1 AND id = $2 RETURNING *`,
          [request.tenant_id, requestId]
        );
        request = upd.rows[0];
      }

      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, new_state, idempotency_key, safe_details)
         VALUES ($1, $2, $3, $4, 'provisioning_executed', $5, $6, $7::jsonb)`,
        [
          request.tenant_id,
          request.school_id,
          requestId,
          executor,
          request.state,
          idempotencyKey,
          JSON.stringify({ blocked: false, allocatedCount: allocatedDevices.length })
        ]
      );

      const refreshed = allocatedDevices.map(d => ({
        ...d,
        status: request.state === 'active' ? 'active' : d.status
      }));

      return {
        request,
        allocatedDevices: refreshed,
        blocked: false
      };
    });
  }

  async retryProvisioningRequest(
    principal: VerifiedTenantPrincipal,
    requestId: string,
    targetState: AttendanceProvisioningState,
    idempotencyKey: string
  ): Promise<AttendanceProvisioningRequestRecord> {
    if (!uuid.test(requestId) || !idempotencyKeyPattern.test(idempotencyKey)) {
      throw new Error('INVALID_ATTENDANCE_PROVISIONING_TRANSITION');
    }
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const current = await client.query<AttendanceProvisioningRequestRecord>(
        'SELECT * FROM attendance.provisioning_requests WHERE id = $1 FOR UPDATE',
        [requestId]
      );
      const request = current.rows[0];
      if (!request) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');
      if (request.state !== 'failed') {
        throw new Error('ATTENDANCE_PROVISIONING_STATE_CONFLICT');
      }
      assertAttendanceProvisioningTransition('failed', 'retry_pending');
      assertAttendanceProvisioningTransition('retry_pending', targetState);
      const nextAttempt = request.attempt_count + 1;
      if (nextAttempt > MAX_PROVISIONING_ATTEMPTS) {
        throw new Error('PROVISIONING_RETRY_LIMIT_EXCEEDED');
      }
      const updated = await client.query<AttendanceProvisioningRequestRecord>(
        `UPDATE attendance.provisioning_requests
         SET state = $2, retryable = false, attempt_count = $3, updated_at = now()
         WHERE tenant_id = $1 AND id = $4
         RETURNING id, tenant_id, school_id, application_instance_id, device_category,
                   device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at`,
        [request.tenant_id, targetState, nextAttempt, requestId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, previous_state, new_state, idempotency_key)
         VALUES ($1, $2, $3, $4, 'provisioning_retried', 'failed', $5, $6)`,
        [request.tenant_id, request.school_id, requestId, actor(principal), targetState, idempotencyKey]
      );
      return updated.rows[0];
    });
  }

  async recordStepResult(
    principal: VerifiedTenantPrincipal,
    requestId: string,
    step: AttendanceProvisioningStep,
    attemptNumber: number,
    result: { passed: boolean; operationReference?: string; errorCode?: string }
  ): Promise<void> {
    if (!uuid.test(requestId) || !Number.isInteger(attemptNumber) ||
        attemptNumber < 1 || attemptNumber > MAX_PROVISIONING_ATTEMPTS ||
        !['compatibility', 'allocation', 'enrollment', 'configuration',
          'connection_test', 'time_sync', 'event_delivery_test',
          'attendance_acceptance_test'].includes(step) ||
        typeof result?.passed !== 'boolean' ||
        (result.operationReference !== undefined &&
          !/^[A-Za-z0-9._:-]{1,256}$/.test(result.operationReference)) ||
        (result.errorCode !== undefined && !/^[A-Z0-9_]{1,80}$/.test(result.errorCode))) {
      throw new Error('INVALID_PROVISIONING_STEP_RESULT');
    }
    await withControlPlaneTransaction(this.pool, principal, async client => {
      const request = await client.query<{ tenant_id: string; school_id: string; state: AttendanceProvisioningState }>(
        `SELECT tenant_id, school_id, state FROM attendance.provisioning_requests
         WHERE id = $1 FOR UPDATE`,
        [requestId]
      );
      const current = request.rows[0];
      if (!current) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');
      const stepStates: Record<AttendanceProvisioningStep, AttendanceProvisioningState[]> = {
        compatibility: ['compatibility_check'],
        allocation: ['allocation_pending'],
        enrollment: ['enrollment_pending'],
        configuration: ['configuration_pending'],
        connection_test: ['connection_verification'],
        time_sync: ['connection_verification'],
        event_delivery_test: ['integration_verification'],
        attendance_acceptance_test: ['integration_verification']
      };
      if (!stepStates[step].includes(current.state)) {
        throw new Error('PROVISIONING_STEP_OUT_OF_ORDER');
      }
      const status = result.passed ? 'succeeded' : 'failed';
      await client.query(
        `INSERT INTO attendance.provisioning_steps
           (tenant_id, school_id, request_id, step_name, attempt_number, status,
            adapter_operation_reference, error_code, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [current.tenant_id, current.school_id, requestId, step, attemptNumber, status,
          result.operationReference ?? null, result.passed ? null : result.errorCode ?? 'STEP_FAILED']
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, previous_state, new_state, reason)
         VALUES ($1, $2, $3, $4, 'provisioning_step_recorded', $5, $5, $6)`,
        [current.tenant_id, current.school_id, requestId, actor(principal), current.state,
          result.passed ? `${step}_succeeded` : result.errorCode ?? `${step}_failed`]
      );
    });
  }

  async transitionRequest(
    principal: VerifiedTenantPrincipal,
    requestId: string,
    expectedState: AttendanceProvisioningState,
    nextState: AttendanceProvisioningState,
    idempotencyKey: string,
    retryable = false
  ): Promise<AttendanceProvisioningRequestRecord> {
    if (!uuid.test(requestId) || !idempotencyKeyPattern.test(idempotencyKey)) {
      throw new Error('INVALID_ATTENDANCE_PROVISIONING_TRANSITION');
    }
    assertAttendanceProvisioningTransition(expectedState, nextState);
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const duplicate = await client.query<{ new_state: string }>(
        `SELECT new_state FROM attendance.provisioning_audit_events
         WHERE request_id = $1 AND idempotency_key = $2`,
        [requestId, idempotencyKey]
      );
      if (duplicate.rows[0]) {
        if (duplicate.rows[0].new_state !== nextState) throw new Error('IDEMPOTENCY_CONFLICT');
        const current = await client.query<AttendanceProvisioningRequestRecord>(
          `SELECT id, tenant_id, school_id, application_instance_id, device_category,
                  device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at
           FROM attendance.provisioning_requests WHERE id = $1`,
          [requestId]
        );
        if (!current.rows[0]) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');
        return current.rows[0];
      }

      const current = await client.query<AttendanceProvisioningRequestRecord>(
        `SELECT id, tenant_id, school_id, application_instance_id, device_category,
                device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at
         FROM attendance.provisioning_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );
      const request = current.rows[0];
      if (!request) throw new Error('ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND');
      if (request.state !== expectedState) throw new Error('ATTENDANCE_PROVISIONING_STATE_CONFLICT');

      let nextAttempt = request.attempt_count;
      if (expectedState === 'retry_pending') {
        nextAttempt += 1;
        if (nextAttempt > MAX_PROVISIONING_ATTEMPTS) throw new Error('PROVISIONING_RETRY_LIMIT_EXCEEDED');
      }
      if (nextState === 'retry_pending' && !retryable) {
        throw new Error('NON_RETRYABLE_PROVISIONING_FAILURE');
      }
      if (nextState === 'active') await this.assertActivationReady(client, request);

      const updated = await client.query<AttendanceProvisioningRequestRecord>(
        `UPDATE attendance.provisioning_requests
         SET state = $2, retryable = $3, attempt_count = $4,
             completed_at = CASE WHEN $2 IN ('active', 'rejected', 'revoked') THEN now() ELSE NULL END,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $5
         RETURNING id, tenant_id, school_id, application_instance_id, device_category,
                   device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at`,
        [request.tenant_id, nextState, retryable, nextAttempt, requestId]
      );
      await client.query(
        `INSERT INTO attendance.provisioning_audit_events
           (tenant_id, school_id, request_id, actor, action, previous_state, new_state, idempotency_key)
         VALUES ($1, $2, $3, $4, 'provisioning_state_transition', $5, $6, $7)`,
        [request.tenant_id, request.school_id, requestId, actor(principal),
          expectedState, nextState, idempotencyKey]
      );
      return updated.rows[0];
    });
  }

  private async assertActivationReady(
    client: DatabaseClient,
    request: AttendanceProvisioningRequestRecord
  ): Promise<void> {
    const [capability, steps, allocations] = await Promise.all([
      client.query<{ status: string }>(
        `SELECT status FROM attendance.school_capabilities
         WHERE tenant_id = $1 AND school_id = $2 AND application_instance_id = $3`,
        [request.tenant_id, request.school_id, request.application_instance_id]
      ),
      client.query<{ step_name: AttendanceProvisioningStep }>(
        `SELECT step_name FROM (
           SELECT DISTINCT ON (step_name) step_name, status
           FROM attendance.provisioning_steps
           WHERE tenant_id = $1 AND request_id = $2
           ORDER BY step_name, attempt_number DESC
         ) latest
         WHERE status = 'succeeded'`,
        [request.tenant_id, request.id]
      ),
      client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM attendance.device_allocations
         WHERE tenant_id = $1 AND school_id = $2 AND provisioning_request_id = $3 AND state = 'active'`,
        [request.tenant_id, request.school_id, request.id]
      )
    ]);
    const ready = isReadyToActivateDevice({
      schoolCapabilityState: capability.rows[0]?.status || '',
      deviceState: request.state,
      successfulSteps: steps.rows.map(row => row.step_name)
    });
    if (!ready || Number(allocations.rows[0]?.count || 0) < request.quantity) {
      throw new Error('ATTENDANCE_DEVICE_ACTIVATION_PREREQUISITES_UNMET');
    }
  }
}
