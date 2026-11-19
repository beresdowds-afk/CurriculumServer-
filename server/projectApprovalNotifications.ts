import { createHash } from 'node:crypto';
import type { DatabasePool } from './db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from './db/tenantContext';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const projectId = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const hash = /^[0-9a-f]{64}$/;
const reference = /^[A-Za-z0-9._:/-]{1,256}$/;
const statuses = ['REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED', 'FAILED'] as const;

export interface ProjectApprovalRequest {
  requestId: string;
  tenantId: string;
  projectId: string;
  operation: 'create_customer_project';
  contractHash: string;
  authorityReference: string;
}

export interface ProjectApprovalNotification extends ProjectApprovalRequest {
  eventId: string;
  claimedStatus: typeof statuses[number];
  eventTimestamp: string;
}

function assertRequest(request: ProjectApprovalRequest): void {
  if (!request || typeof request.requestId !== 'string' || typeof request.tenantId !== 'string' ||
      typeof request.projectId !== 'string' || typeof request.contractHash !== 'string' ||
      typeof request.authorityReference !== 'string' ||
      !uuid.test(request.requestId) || !uuid.test(request.tenantId) ||
      !projectId.test(request.projectId) || request.operation !== 'create_customer_project' ||
      !hash.test(request.contractHash) || !reference.test(request.authorityReference)) {
    throw new Error('INVALID_PROJECT_APPROVAL_SCOPE');
  }
}

export function validateProjectApprovalNotification(value: unknown): ProjectApprovalNotification {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('INVALID_PROJECT_APPROVAL_NOTIFICATION');
  }
  const record = value as Record<string, unknown>;
  const keys = [
    'requestId', 'tenantId', 'projectId', 'operation', 'contractHash', 'authorityReference',
    'eventId', 'claimedStatus', 'eventTimestamp'
  ];
  if (Object.keys(record).length !== keys.length ||
      keys.some(key => typeof record[key] !== 'string')) {
    throw new Error('INVALID_PROJECT_APPROVAL_NOTIFICATION');
  }
  const notification = {
    requestId: record.requestId as string,
    tenantId: record.tenantId as string,
    projectId: record.projectId as string,
    operation: record.operation as ProjectApprovalRequest['operation'],
    contractHash: record.contractHash as string,
    authorityReference: record.authorityReference as string,
    eventId: record.eventId as string,
    claimedStatus: record.claimedStatus as ProjectApprovalNotification['claimedStatus'],
    eventTimestamp: record.eventTimestamp as string
  };
  assertRequest(notification);
  const time = Date.parse(notification.eventTimestamp);
  if (!uuid.test(notification.eventId) ||
      !statuses.includes(notification.claimedStatus) ||
      !Number.isFinite(time) ||
      new Date(time).toISOString() !== notification.eventTimestamp) {
    throw new Error('INVALID_PROJECT_APPROVAL_NOTIFICATION');
  }
  return notification;
}

function sameScope(left: ProjectApprovalRequest, right: ProjectApprovalRequest): boolean {
  return left.requestId === right.requestId && left.tenantId === right.tenantId &&
    left.projectId === right.projectId && left.operation === right.operation &&
    left.contractHash === right.contractHash && left.authorityReference === right.authorityReference;
}

function notificationHash(value: ProjectApprovalNotification): string {
  return createHash('sha256').update(JSON.stringify([
    value.requestId, value.tenantId, value.projectId, value.operation, value.contractHash,
    value.authorityReference, value.eventId, value.claimedStatus, value.eventTimestamp
  ])).digest('hex');
}

type RequestRow = {
  request_id: string;
  tenant_id: string;
  project_id: string;
  operation: 'create_customer_project';
  contract_hash: string;
  authority_reference: string;
};

function fromRow(row: RequestRow): ProjectApprovalRequest {
  return {
    requestId: row.request_id, tenantId: row.tenant_id, projectId: row.project_id,
    operation: row.operation, contractHash: row.contract_hash, authorityReference: row.authority_reference
  };
}

/**
 * Stores unverified notifications only. Neither registration nor a notification
 * authorizes provisioning or establishes the authenticity of a PIAM decision.
 */
export class ProjectApprovalNotificationRepository {
  constructor(private readonly pool: DatabasePool, private readonly principal: VerifiedTenantPrincipal) {}

  async register(request: ProjectApprovalRequest): Promise<'registered' | 'duplicate'> {
    assertRequest(request);
    return withControlPlaneTransaction(this.pool, this.principal, async client => {
      const inserted = await client.query(
        `INSERT INTO production.project_approval_requests
           (request_id, tenant_id, project_id, operation, contract_hash, authority_reference)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (request_id) DO NOTHING`,
        [request.requestId, request.tenantId, request.projectId, request.operation,
          request.contractHash, request.authorityReference]
      );
      if (inserted.rowCount === 1) return 'registered';
      const existing = await client.query<RequestRow>(
        'SELECT * FROM production.project_approval_requests WHERE request_id = $1',
        [request.requestId]
      );
      if (!existing.rows[0] || !sameScope(fromRow(existing.rows[0]), request)) {
        throw new Error('PROJECT_APPROVAL_REQUEST_CONFLICT');
      }
      return 'duplicate';
    });
  }

  async record(value: unknown): Promise<'recorded_unverified' | 'duplicate'> {
    const notification = validateProjectApprovalNotification(value);
    const digest = notificationHash(notification);
    return withControlPlaneTransaction(this.pool, this.principal, async client => {
      const request = await client.query<RequestRow>(
        'SELECT * FROM production.project_approval_requests WHERE request_id = $1 FOR UPDATE',
        [notification.requestId]
      );
      if (!request.rows[0] || !sameScope(fromRow(request.rows[0]), notification)) {
        throw new Error('PROJECT_APPROVAL_SCOPE_MISMATCH');
      }
      const inserted = await client.query(
        `INSERT INTO production.project_approval_notifications
           (event_id, request_id, tenant_id, claimed_status, event_timestamp, notification_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (event_id) DO NOTHING`,
        [notification.eventId, notification.requestId, notification.tenantId,
          notification.claimedStatus, notification.eventTimestamp, digest]
      );
      if (inserted.rowCount === 1) return 'recorded_unverified';
      const existing = await client.query<{ notification_hash: string }>(
        'SELECT notification_hash FROM production.project_approval_notifications WHERE event_id = $1',
        [notification.eventId]
      );
      if (existing.rows[0]?.notification_hash !== digest) {
        throw new Error('PROJECT_APPROVAL_EVENT_CONFLICT');
      }
      return 'duplicate';
    });
  }
}
