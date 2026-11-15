import type { DatabaseClient, DatabasePool } from './postgres';
import type { QueryResultRow } from 'pg';
import { DatabaseFailure, inTransaction } from './postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from './tenantContext';

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  billingAddress?: string;
}

export interface OrganisationInput {
  customerId: string;
  name: string;
  region?: string;
}

export interface InstanceInput {
  organisationId: string;
  name: string;
  tenantSlug: string;
  tier?: string;
  status?: string;
}

export interface ProvisioningRequestInput {
  idempotencyKey: string;
  requestedBy: string;
  correlationId: string;
  architectureProfileId?: string;
  payload: Record<string, unknown>;
}

export interface ProvisioningJobInput {
  instanceId: string;
  jobType: string;
  idempotencyKey: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface AuditEventInput {
  actorId?: string;
  actorEmail: string;
  action: string;
  targetResource?: string;
  correlationId: string;
  outcome: 'success' | 'failure' | 'blocked' | 'historical_unverified';
  metadata?: Record<string, unknown>;
}

export interface FlowStudentRecord extends QueryResultRow {
  id: string;
  tenant_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_group: string | null;
}

interface ProvisioningRequestRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  idempotency_key: string;
  request_status: string;
  requested_by: string;
  correlation_id: string;
  request_payload: Record<string, unknown>;
  created_at: Date;
  version: number;
}

interface ProvisioningJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  instance_id: string;
  job_type: string;
  status: string;
  idempotency_key: string;
  payload_json: Record<string, unknown>;
  correlation_id: string;
  created_at: Date;
  version: number;
}

function assertText(value: string, label: string): void {
  if (!value || !value.trim()) throw new Error(`${label} is required.`);
}

function sanitizeQueryError(): DatabaseFailure {
  return new DatabaseFailure('query', 'Control-plane database operation failed.');
}

function preserveSafeFailure(error: unknown): never {
  if (error instanceof DatabaseFailure) throw error;
  throw sanitizeQueryError();
}

export class ControlPlaneRepository {
  constructor(private readonly pool: DatabasePool) {}

  async createCustomer(principal: VerifiedTenantPrincipal, input: CustomerInput) {
    assertText(input.name, 'Customer name');
    assertText(input.email, 'Customer email');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `INSERT INTO control_plane.customers (tenant_id, name, email, phone, billing_address, lifecycle_status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           RETURNING id, tenant_id, name, email, phone, billing_address, lifecycle_status, created_at`,
          [principal.tenantId, input.name.trim(), input.email.trim(), input.phone ?? null, input.billingAddress ?? null]
        );
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async getCustomer(principal: VerifiedTenantPrincipal, customerId: string) {
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `SELECT id, tenant_id, name, email, phone, billing_address, lifecycle_status, created_at
           FROM control_plane.customers WHERE id = $1`,
          [customerId]
        );
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async createOrganisation(principal: VerifiedTenantPrincipal, input: OrganisationInput) {
    assertText(input.name, 'Organisation name');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `INSERT INTO control_plane.organisations (tenant_id, customer_id, org_name, region, lifecycle_status)
           SELECT $1, customer.id, $3, COALESCE($4, 'europe-west1'), 'pending'
           FROM control_plane.customers customer
           WHERE customer.id = $2 AND customer.tenant_id = $1
           RETURNING id, tenant_id, customer_id, org_name, region, lifecycle_status, created_at`,
          [principal.tenantId, input.customerId, input.name.trim(), input.region ?? null]
        );
        if (!result.rows[0]) throw new Error('Parent customer not found.');
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async getOrganisation(principal: VerifiedTenantPrincipal, organisationId: string) {
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `SELECT id, tenant_id, customer_id, org_name, region, lifecycle_status, created_at
           FROM control_plane.organisations WHERE id = $1`,
          [organisationId]
        );
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async createInstance(principal: VerifiedTenantPrincipal, input: InstanceInput) {
    assertText(input.name, 'Instance name');
    assertText(input.tenantSlug, 'Tenant slug');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `INSERT INTO control_plane.instances (tenant_id, org_id, instance_name, tenant_slug, tier, status, lifecycle_status)
           SELECT $1, organisation.id, $3, $4, COALESCE($5, 'pro'), COALESCE($6, 'requested'), 'requested'
           FROM control_plane.organisations organisation
           WHERE organisation.id = $2 AND organisation.tenant_id = $1
           RETURNING id, tenant_id, org_id, instance_name, tenant_slug, tier, status, lifecycle_status, created_at, version`,
          [principal.tenantId, input.organisationId, input.name.trim(), input.tenantSlug.trim(), input.tier ?? null, input.status ?? null]
        );
        if (!result.rows[0]) throw new Error('Parent organisation not found.');
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async getInstance(principal: VerifiedTenantPrincipal, instanceId: string) {
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `SELECT id, tenant_id, org_id, instance_name, tenant_slug, tier, status, lifecycle_status, created_at, version
           FROM control_plane.instances WHERE id = $1`,
          [instanceId]
        );
        return result.rows[0];
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async createProvisioningRequest(principal: VerifiedTenantPrincipal, input: ProvisioningRequestInput) {
    assertText(input.idempotencyKey, 'Idempotency key');
    assertText(input.requestedBy, 'Request actor');
    assertText(input.correlationId, 'Correlation ID');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const inserted = await client.query<ProvisioningRequestRow>(
          `INSERT INTO control_plane.provisioning_requests
             (tenant_id, idempotency_key, requested_by, correlation_id, architecture_profile_id, request_payload)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)
           ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
           RETURNING id, tenant_id, idempotency_key, request_status, requested_by, correlation_id, request_payload, created_at, version`,
          [principal.tenantId, input.idempotencyKey, input.requestedBy, input.correlationId,
            input.architectureProfileId ?? null, JSON.stringify(input.payload)]
        );
        if (inserted.rows[0]) return { ...inserted.rows[0], idempotentReplay: false };
        const existing = await client.query<ProvisioningRequestRow>(
          `SELECT id, tenant_id, idempotency_key, request_status, requested_by, correlation_id, request_payload, created_at, version
           FROM control_plane.provisioning_requests
           WHERE tenant_id = $1 AND idempotency_key = $2
             AND requested_by = $3 AND request_payload = $4::jsonb
           FOR UPDATE`,
          [principal.tenantId, input.idempotencyKey, input.requestedBy, JSON.stringify(input.payload)]
        );
        const row = existing.rows[0];
        if (!row) {
          throw new Error('Idempotency key was reused with a different request.');
        }
        return { ...row, idempotentReplay: true };
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async createProvisioningJob(principal: VerifiedTenantPrincipal, input: ProvisioningJobInput) {
    assertText(input.idempotencyKey, 'Idempotency key');
    assertText(input.correlationId, 'Correlation ID');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const inserted = await client.query<ProvisioningJobRow>(
          `INSERT INTO control_plane.provisioning_jobs
             (tenant_id, instance_id, job_type, idempotency_key, payload_json, correlation_id, record_origin)
           SELECT $1, instance.id, $3, $4, $5::jsonb, $6, 'application'
           FROM control_plane.instances instance
           WHERE instance.id = $2 AND instance.tenant_id = $1
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id, tenant_id, instance_id, job_type, status, idempotency_key, payload_json, correlation_id, created_at, version`,
          [principal.tenantId, input.instanceId, input.jobType, input.idempotencyKey,
            JSON.stringify(input.payload), input.correlationId]
        );
        if (inserted.rows[0]) return { ...inserted.rows[0], idempotentReplay: false };
        const existing = await client.query<ProvisioningJobRow>(
          `SELECT id, tenant_id, instance_id, job_type, status, idempotency_key, payload_json, correlation_id, created_at, version
           FROM control_plane.provisioning_jobs
           WHERE idempotency_key = $1 AND tenant_id = $2 AND instance_id = $3
             AND job_type = $4 AND payload_json = $5::jsonb
           FOR UPDATE`,
          [input.idempotencyKey, principal.tenantId, input.instanceId, input.jobType, JSON.stringify(input.payload)]
        );
        const row = existing.rows[0];
        if (!row) {
          throw new Error('Idempotency key conflicts with an existing job.');
        }
        return { ...row, idempotentReplay: true };
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async transitionProvisioningJob(
    principal: VerifiedTenantPrincipal,
    jobId: string,
    expectedVersion: number,
    status: 'pending' | 'running' | 'failed' | 'cancelled',
    sanitizedError?: string
  ) {
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `UPDATE control_plane.provisioning_jobs
           SET status = $4, error_message = $5, updated_at = now(), version = version + 1
           WHERE id = $1 AND tenant_id = $2 AND version = $3
           RETURNING id, tenant_id, status, updated_at, version`,
          [jobId, principal.tenantId, expectedVersion, status, sanitizedError ?? null]
        );
        if (!result.rows[0]) throw new Error('Job was not found or was concurrently updated.');
        return result.rows[0];
      });
    } catch {
      throw sanitizeQueryError();
    }
  }

  async appendAuditEvent(principal: VerifiedTenantPrincipal, event: AuditEventInput) {
    assertText(event.actorEmail, 'Audit actor');
    assertText(event.action, 'Audit action');
    assertText(event.correlationId, 'Correlation ID');
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query(
          `INSERT INTO control_plane.audit_logs
             (tenant_id, actor_id, actor_email, action, target_resource, correlation_id, outcome, metadata_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           RETURNING id, tenant_id, actor_id, actor_email, action, target_resource, correlation_id, outcome, timestamp`,
          [principal.tenantId, event.actorId ?? null, event.actorEmail, event.action,
            event.targetResource ?? null, event.correlationId, event.outcome,
            JSON.stringify(event.metadata ?? {})]
        );
        return result.rows[0];
      });
    } catch {
      throw sanitizeQueryError();
    }
  }

  async listResourceConfigurations(
    principal: VerifiedTenantPrincipal,
    resourceType: 'database' | 'storage'
  ) {
    const operation = async (client: DatabaseClient) => {
      const result = await client.query(
        `SELECT id, tenant_id, instance_id, resource_type, configuration_status,
                provider_resource_id, configuration, created_at, updated_at
         FROM control_plane.resource_configurations
         WHERE resource_type = $1 ORDER BY created_at DESC`,
        [resourceType]
      );
      return result.rows;
    };
    try {
      if (principal.role === 'super_admin') {
        return await withControlPlaneTransaction(this.pool, principal, operation);
      }
      return await withTenantTransaction(this.pool, principal, operation);
    } catch (error) {
      preserveSafeFailure(error);
    }
  }

  async listFlowStudents(principal: VerifiedTenantPrincipal) {
    try {
      return await withTenantTransaction(this.pool, principal, async client => {
        const result = await client.query<FlowStudentRecord>(
          `SELECT id, tenant_id, admission_number, first_name, last_name, class_group
           FROM curriculum_flow.students
           WHERE record_origin = 'application'
           ORDER BY class_group NULLS LAST, admission_number`
        );
        return result.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          admissionNumber: row.admission_number,
          fullName: `${row.first_name} ${row.last_name}`,
          classGroup: row.class_group
        }));
      });
    } catch (error) {
      preserveSafeFailure(error);
    }
  }
}
