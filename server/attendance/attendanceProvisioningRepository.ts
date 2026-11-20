import { createHash } from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import {
  assertAttendanceProvisioningTransition,
  isReadyToActivateDevice,
  MAX_PROVISIONING_ATTEMPTS,
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
    requiredCapabilities: [...(input.requiredCapabilities ?? [])].sort()
  })).digest('hex');
}

function actor(principal: VerifiedTenantPrincipal): string {
  const identity = principal.userId || principal.email;
  if (!identity) throw new Error('VERIFIED_ACTOR_ID_REQUIRED');
  return identity;
}

export class AttendanceProvisioningRepository {
  constructor(private readonly pool: DatabasePool) {}

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
                adapter_id, adapter_version, verification_status, operational_limitations
         FROM attendance.device_catalogue
         WHERE ($1::uuid IS NULL OR id = $1::uuid)
         ORDER BY manufacturer, model`,
        [modelId ?? null]
      );
      return result.rows;
    });
  }

  async getRequest(principal: VerifiedTenantPrincipal, requestId: string) {
    if (!uuid.test(requestId)) throw new Error('INVALID_PROVISIONING_REQUEST_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query<AttendanceProvisioningRequestRecord>(
        `SELECT id, tenant_id, school_id, application_instance_id, device_category,
                device_model_id, quantity, state, retryable, attempt_count, created_at, updated_at
         FROM attendance.provisioning_requests WHERE id = $1`,
        [requestId]
      );
      return result.rows[0];
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
