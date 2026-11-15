import type { TenantSecurityContext } from '../../src/services/tenantSecurityContext';
import type { DatabaseClient, DatabasePool } from './postgres';
import { inTransaction } from './postgres';

const trustedContext = Symbol('trusted-tenant-context');

export interface VerifiedTenantPrincipal {
  readonly [trustedContext]: true;
  readonly tenantId: string;
  readonly role: string;
  readonly email?: string;
}

export function createVerifiedTenantPrincipal(
  verification: { valid: boolean; context?: TenantSecurityContext }
): VerifiedTenantPrincipal {
  if (!verification.valid || !verification.context?.tenantId ||
      typeof verification.context.role !== 'string') {
    throw new Error('A verified tenant security context is required.');
  }
  return Object.freeze({
    [trustedContext]: true as const,
    tenantId: verification.context.tenantId,
    role: verification.context.role,
    email: verification.context.email
  });
}

function assertVerifiedPrincipal(principal: VerifiedTenantPrincipal): void {
  if (!principal || principal[trustedContext] !== true || !principal.tenantId.trim()) {
    throw new Error('A verified tenant security context is required.');
  }
}

export async function withTenantTransaction<T>(
  pool: DatabasePool,
  principal: VerifiedTenantPrincipal,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  assertVerifiedPrincipal(principal);
  if (principal.role === 'super_admin') {
    throw new Error('Tenant-scoped operations require a tenant principal.');
  }
  return inTransaction(pool, async client => {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [principal.tenantId]);
    return operation(client);
  });
}

export async function withControlPlaneTransaction<T>(
  pool: DatabasePool,
  principal: VerifiedTenantPrincipal,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  assertVerifiedPrincipal(principal);
  if (principal.role !== 'super_admin') {
    throw new Error('Privileged control-plane authorization is required.');
  }
  return inTransaction(pool, async client => {
    await client.query("SELECT set_config('app.control_plane_admin', 'true', true)");
    return operation(client);
  });
}
