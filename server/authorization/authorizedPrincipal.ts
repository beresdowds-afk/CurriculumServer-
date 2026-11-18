import type { VerifiedTenantPrincipal } from '../db/tenantContext';

const authorized = Symbol('database-authorized-principal');

export interface RoleGrant {
  roleCode: string;
  permissions: readonly string[];
  // Empty means the grant is tenant-wide.
  scopes: ReadonlyArray<{ resourceType: string; resourceId: string }>;
}

export interface AuthorizedPrincipal {
  readonly [authorized]: true;
  readonly tenant: VerifiedTenantPrincipal;
  readonly tenantId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly grants: readonly RoleGrant[];
  readonly roles: readonly string[];
  hasPermission(permission: string): boolean;
  hasPermissionFor(permission: string, resourceType: string, resourceId: string): boolean;
}

/**
 * Only the authorization repository calls this, after PostgreSQL has confirmed
 * the session, membership, roles and permissions.
 */
export function createAuthorizedPrincipal(input: {
  tenant: VerifiedTenantPrincipal;
  userId: string;
  sessionId: string;
  grants: readonly RoleGrant[];
}): AuthorizedPrincipal {
  const grants = Object.freeze(input.grants.map(grant => Object.freeze({
    roleCode: grant.roleCode,
    permissions: Object.freeze([...grant.permissions]),
    scopes: Object.freeze(grant.scopes.map(scope => Object.freeze({ ...scope })))
  })));
  return Object.freeze({
    [authorized]: true as const,
    tenant: input.tenant,
    tenantId: input.tenant.tenantId,
    userId: input.userId,
    sessionId: input.sessionId,
    grants,
    roles: Object.freeze([...new Set(grants.map(grant => grant.roleCode))]),
    hasPermission(permission: string) {
      return grants.some(grant => grant.scopes.length === 0 && grant.permissions.includes(permission));
    },
    hasPermissionFor(permission: string, resourceType: string, resourceId: string) {
      return grants.some(grant =>
        grant.permissions.includes(permission) &&
        (grant.scopes.length === 0 ||
          grant.scopes.some(scope => scope.resourceType === resourceType && scope.resourceId === resourceId))
      );
    }
  });
}

export function assertAuthorized(
  principal: AuthorizedPrincipal | undefined,
  permission: string
): asserts principal is AuthorizedPrincipal {
  if (!principal || principal[authorized] !== true || !principal.hasPermission(permission)) {
    throw new Error('FORBIDDEN');
  }
}

export function assertResourceAuthorized(
  principal: AuthorizedPrincipal | undefined,
  permission: string,
  resourceType: string,
  resourceId: string
): asserts principal is AuthorizedPrincipal {
  if (!principal || principal[authorized] !== true ||
      !principal.hasPermissionFor(permission, resourceType, resourceId)) {
    throw new Error('FORBIDDEN');
  }
}
