import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type {
  CentralSharedServiceId,
  SharedServiceAuthorizationDecisionV1,
  SharedServiceAuthorizationRequestV1,
  SharedServiceEntitlementVerificationV1,
  SharedServiceHealthV1,
  SharedServiceOperation
} from '../../packages/shared-types/src/sharedServiceContracts';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, withTenantTransaction } from '../db/tenantContext';
import {
  getCentralSharedService,
  getSharedServicePermission
} from './registry';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SharedServiceAccessFailure =
  | 'INVALID_APPLICATION_INSTANCE'
  | 'APPLICATION_INSTANCE_INACTIVE'
  | 'APPLICATION_TYPE_UNSUPPORTED'
  | 'SERVICE_DEPENDENCY_NOT_DECLARED'
  | 'SERVICE_ENTITLEMENT_MISSING'
  | 'SERVICE_ENTITLEMENT_EXPIRED'
  | 'SERVICE_ENTITLEMENT_REVOKED'
  | 'SERVICE_ENTITLEMENT_SUSPENDED'
  | 'PERMISSION_DENIED'
  | 'SERVICE_NOT_READY'
  | 'UNKNOWN_SERVICE'
  | 'OPERATION_NOT_SUPPORTED';

export interface SharedServiceAccessDecision {
  allowed: boolean;
  reason?: SharedServiceAccessFailure;
  entitlementId?: string;
  expiresAt?: string;
}

export function authenticateSharedServiceCaller(
  req: Request,
  res: Response,
  next: NextFunction,
  dependencies: {
    tenantUser: RequestHandler;
    internalService: RequestHandler;
  }
): void {
  const authenticateTenantUser = () => dependencies.tenantUser(req, res, next);
  if (req.headers['x-internal-service-key'] !== undefined) {
    dependencies.internalService(req, res, authenticateTenantUser);
    return;
  }
  authenticateTenantUser();
}

export interface ApplicationEntitlementRow {
  application_id: string;
  application_status: string;
  service_dependencies: unknown;
  entitlement_id: string | null;
  entitlement_status: string | null;
  entitlement_expires_at: Date | null;
  entitlement_revoked_at: Date | null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function entitlementFailure(row: ApplicationEntitlementRow | undefined): SharedServiceAccessFailure | undefined {
  if (!row) return 'INVALID_APPLICATION_INSTANCE';
  if (row.application_status !== 'active') return 'APPLICATION_INSTANCE_INACTIVE';
  if (!row.entitlement_id) return 'SERVICE_ENTITLEMENT_MISSING';
  if (row.entitlement_status === 'revoked' || row.entitlement_revoked_at) return 'SERVICE_ENTITLEMENT_REVOKED';
  if (row.entitlement_status === 'suspended') return 'SERVICE_ENTITLEMENT_SUSPENDED';
  if (row.entitlement_status !== 'active' ||
      !row.entitlement_expires_at ||
      row.entitlement_expires_at.getTime() <= Date.now()) return 'SERVICE_ENTITLEMENT_EXPIRED';
  return undefined;
}

export function evaluateSharedServiceAccess(input: {
  serviceId: string;
  operation: SharedServiceOperation;
  requestedOperation?: string;
  applicationInstanceId: string;
  row?: ApplicationEntitlementRow;
  hasPermissions: (permissions: readonly string[]) => boolean;
}): SharedServiceAccessDecision {
  const service = getCentralSharedService(input.serviceId);
  if (!service) return { allowed: false, reason: 'UNKNOWN_SERVICE' };
  if (!['discover', 'authorize', 'health'].includes(input.operation)) {
    return { allowed: false, reason: 'OPERATION_NOT_SUPPORTED' };
  }
  if (!UUID.test(input.applicationInstanceId)) {
    return { allowed: false, reason: 'INVALID_APPLICATION_INSTANCE' };
  }
  const permission = getSharedServicePermission(service.id, input.operation);
  if (!permission || !input.hasPermissions([permission])) {
    return { allowed: false, reason: 'PERMISSION_DENIED' };
  }
  const row = input.row;
  if (!row) return { allowed: false, reason: 'INVALID_APPLICATION_INSTANCE' };
  if (!service.supportedApplicationTypes.includes(row.application_id)) {
    return { allowed: false, reason: 'APPLICATION_TYPE_UNSUPPORTED' };
  }
  const dependencies = isStringArray(row.service_dependencies) ? row.service_dependencies : [];
  if (!dependencies.includes(service.id)) {
    return { allowed: false, reason: 'SERVICE_DEPENDENCY_NOT_DECLARED' };
  }
  const entitlementProblem = entitlementFailure(row);
  if (entitlementProblem) return { allowed: false, reason: entitlementProblem };

  if (input.operation === 'authorize') {
    if (!input.requestedOperation || !service.operations.includes(input.requestedOperation)) {
      return { allowed: false, reason: 'OPERATION_NOT_SUPPORTED' };
    }
    const consumptionPermission = getSharedServicePermission(service.id, 'consume');
    if (!consumptionPermission || !input.hasPermissions([consumptionPermission])) {
      return { allowed: false, reason: 'PERMISSION_DENIED' };
    }
    if (service.availability !== 'available' ||
        service.provisioningStatus !== 'provisioned') {
      return {
        allowed: false,
        reason: 'SERVICE_NOT_READY',
        entitlementId: row.entitlement_id || undefined,
        expiresAt: row.entitlement_expires_at?.toISOString()
      };
    }
  }

  return {
    allowed: true,
    entitlementId: row.entitlement_id || undefined,
    expiresAt: row.entitlement_expires_at?.toISOString()
  };
}

export class SharedServiceAuthorizationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async evaluate(input: {
    tenant: VerifiedTenantPrincipal;
    principal: AuthorizedPrincipal;
    serviceId: string;
    operation: SharedServiceOperation;
    applicationInstanceId: string;
    requestedOperation?: string;
    callerKind?: 'tenant_user' | 'internal_service';
    correlationId?: string;
  }): Promise<SharedServiceAccessDecision> {
    const service = getCentralSharedService(input.serviceId);
    if (!service) return { allowed: false, reason: 'UNKNOWN_SERVICE' };
    return withTenantTransaction(this.pool, input.tenant, async client => {
      let row: ApplicationEntitlementRow | undefined;
      if (UUID.test(input.applicationInstanceId)) {
        const result = await client.query<ApplicationEntitlementRow>(
          `SELECT instance.application_id,
                  instance.status AS application_status,
                  configuration.configuration->'centralServiceDependencies' AS service_dependencies,
                  entitlement.id AS entitlement_id,
                  entitlement.status AS entitlement_status,
                  entitlement.expires_at AS entitlement_expires_at,
                  entitlement.revoked_at AS entitlement_revoked_at
           FROM production.application_instances instance
           LEFT JOIN LATERAL (
             SELECT configuration
             FROM production.application_instance_configurations
             WHERE tenant_id = instance.tenant_id
               AND application_instance_id = instance.id
             ORDER BY configuration_version DESC
             LIMIT 1
           ) configuration ON true
           LEFT JOIN LATERAL (
             SELECT id, status, expires_at, revoked_at, created_at
             FROM production.application_service_entitlements
             WHERE tenant_id = instance.tenant_id
               AND application_instance_id = instance.id
               AND service_id = $3
             ORDER BY created_at DESC, id DESC
             LIMIT 1
           ) entitlement ON true
           WHERE instance.tenant_id = $1 AND instance.id = $2`,
          [input.tenant.tenantId, input.applicationInstanceId, service.id]
        );
        row = result.rows[0];
      }

      const decision = evaluateSharedServiceAccess({
        serviceId: service.id,
        operation: input.operation,
        requestedOperation: input.requestedOperation,
        applicationInstanceId: input.applicationInstanceId,
        row,
        hasPermissions: permissions => permissions.every(permission => input.principal.hasPermission(permission))
      });

      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'shared_service_access_evaluated', $3::jsonb)`,
        [input.tenant.tenantId, input.principal.userId, JSON.stringify({
          serviceId: service.id,
          operation: input.operation,
          requestedOperation: input.requestedOperation,
          callerKind: input.callerKind || 'tenant_user',
          applicationInstanceId: input.applicationInstanceId,
          allowed: decision.allowed,
          reason: decision.reason || null,
          entitlementId: decision.entitlementId || null,
          correlationId: input.correlationId || null
        })]
      );
      return decision;
    });
  }

  async grantEntitlement(input: {
    actor: VerifiedTenantPrincipal;
    tenantId: string;
    applicationInstanceId: string;
    serviceId: string;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }> {
    if (!UUID.test(input.tenantId) || !UUID.test(input.applicationInstanceId)) {
      throw new Error('INVALID_APPLICATION_INSTANCE');
    }
    if (!getCentralSharedService(input.serviceId)) throw new Error('UNKNOWN_SERVICE');
    if (!(input.expiresAt instanceof Date) || input.expiresAt.getTime() <= Date.now()) {
      throw new Error('INVALID_ENTITLEMENT_EXPIRY');
    }
    return withControlPlaneTransaction(this.pool, input.actor, async client => {
      const instance = await client.query(
        `SELECT 1 FROM production.application_instances
         WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, input.applicationInstanceId]
      );
      if (instance.rowCount !== 1) throw new Error('INVALID_APPLICATION_INSTANCE');
      const entitlement = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.application_service_entitlements
           (tenant_id, application_instance_id, service_id, status, expires_at, created_by)
         VALUES ($1, $2, $3, 'active', $4, $5)
         RETURNING id, expires_at`,
        [input.tenantId, input.applicationInstanceId, input.serviceId, input.expiresAt,
          input.actor.email || input.actor.userId || 'platform_administrator']
      );
      await client.query(
        `INSERT INTO control_plane.audit_logs
           (actor_email, action, target_resource, metadata_json, tenant_id, actor_id, outcome)
         VALUES ($1, 'shared_service_entitlement_granted', $2, $3::jsonb, $4, $5, 'success')`,
        [input.actor.email || 'platform_administrator',
          `${input.serviceId}:${entitlement.rows[0].id}`,
          JSON.stringify({ applicationInstanceId: input.applicationInstanceId }),
          input.tenantId, input.actor.userId || null]
      );
      return { id: entitlement.rows[0].id, expiresAt: entitlement.rows[0].expires_at };
    });
  }

  async revokeEntitlement(input: {
    actor: VerifiedTenantPrincipal;
    entitlementId: string;
    reason: string;
  }): Promise<boolean> {
    if (!UUID.test(input.entitlementId)) throw new Error('INVALID_ENTITLEMENT_ID');
    return withControlPlaneTransaction(this.pool, input.actor, async client => {
      const revoked = await client.query<{
        tenant_id: string;
        application_instance_id: string;
        service_id: string;
      }>(
        `UPDATE production.application_service_entitlements
         SET status = 'revoked', revoked_at = now(), revoked_by = $2,
             revocation_reason = $3
         WHERE id = $1 AND revoked_at IS NULL
         RETURNING tenant_id, application_instance_id, service_id`,
        [input.entitlementId, input.actor.email || input.actor.userId || 'platform_administrator',
          input.reason]
      );
      if (revoked.rowCount === 0) return false;
      await client.query(
        `INSERT INTO control_plane.audit_logs
           (actor_email, action, target_resource, metadata_json, tenant_id, actor_id, outcome)
         VALUES ($1, 'shared_service_entitlement_revoked', $2, $3::jsonb, $4, $5, 'success')`,
        [input.actor.email || 'platform_administrator',
          `${revoked.rows[0].service_id}:${input.entitlementId}`,
          JSON.stringify({
            applicationInstanceId: revoked.rows[0].application_instance_id,
            reason: input.reason
          }),
          revoked.rows[0].tenant_id, input.actor.userId || null]
      );
      return true;
    });
  }
}

export function sharedServiceDiscovery(serviceId: string) {
  const service = getCentralSharedService(serviceId);
  if (!service) return undefined;
  return {
    contractVersion: 1 as const,
    service: {
      id: service.id,
      name: service.name,
      version: service.version,
      description: service.description,
      owner: service.owner,
      availability: service.availability,
      provisioningStatus: service.provisioningStatus,
      supportedApplicationTypes: service.supportedApplicationTypes,
      requiredPermissions: service.requiredPermissions,
      requiredDatabaseDependencies: service.requiredDatabaseDependencies,
      requiredConfiguration: service.requiredConfiguration,
      entitlementRequired: service.entitlementRequired,
      operations: service.operations
    }
  };
}

export function sharedServiceHealth(serviceId: string): SharedServiceHealthV1 | undefined {
  const service = getCentralSharedService(serviceId);
  if (!service) return undefined;
  const provisioned = service.availability === 'available' &&
    service.provisioningStatus === 'provisioned';
  return {
    contractVersion: 1,
    serviceId: service.id,
    status: provisioned ? 'healthy' : 'not_ready',
    checkedAt: new Date().toISOString(),
    checks: [{
      name: 'service_provisioning',
      status: provisioned ? 'passed' : 'not_ready',
      detail: provisioned ? 'Service provisioning is complete.' : 'The central service is not provisioned.'
    }]
  };
}

export function sharedServiceResponseDecision(
  serviceId: CentralSharedServiceId,
  operation: string,
  decision: SharedServiceAccessDecision
): SharedServiceAuthorizationDecisionV1 {
  return {
    contractVersion: 1,
    serviceId,
    operation,
    allowed: decision.allowed,
    ...(decision.reason ? { reason: decision.reason } : {}),
    ...(decision.entitlementId ? { entitlementId: decision.entitlementId } : {})
  };
}

export function sharedServiceEntitlementVerification(
  serviceId: CentralSharedServiceId,
  applicationInstanceId: string,
  decision: SharedServiceAccessDecision
): SharedServiceEntitlementVerificationV1 {
  return {
    contractVersion: 1,
    serviceId,
    applicationInstanceId,
    verified: decision.allowed || (decision.reason === 'SERVICE_NOT_READY' && Boolean(decision.entitlementId)),
    ...(decision.reason ? { reason: decision.reason } : {}),
    ...(decision.entitlementId ? { entitlementId: decision.entitlementId } : {}),
    ...(decision.expiresAt ? { expiresAt: decision.expiresAt } : {})
  };
}

export type SharedServiceAuthorizationRequest = SharedServiceAuthorizationRequestV1;
