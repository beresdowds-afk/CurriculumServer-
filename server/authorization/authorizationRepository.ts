import type { DatabasePool } from '../db/postgres';
import {
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import {
  assertAuthorized,
  createAuthorizedPrincipal,
  type AuthorizedPrincipal,
  type RoleGrant
} from './authorizedPrincipal';
import { PERMISSIONS } from './permissions';

export type AuthorizationFailure =
  | 'SESSION_REVOKED'
  | 'MEMBERSHIP_INACTIVE';

export type AuthorizationResult =
  | { ok: true; principal: AuthorizedPrincipal }
  | { ok: false; reason: AuthorizationFailure };

export interface AuthorizationSource {
  authorize(
    tenant: VerifiedTenantPrincipal,
    userId: string,
    sessionId: string | undefined
  ): Promise<AuthorizationResult>;
}

/**
 * PostgreSQL is the authority for current session, membership, roles and
 * permissions. Signed token claims only identify the caller and session.
 */
export class AuthorizationRepository implements AuthorizationSource {
  constructor(private readonly pool: DatabasePool) {}

  async authorize(
    tenant: VerifiedTenantPrincipal,
    userId: string,
    sessionId: string | undefined
  ): Promise<AuthorizationResult> {
    if (!sessionId) return { ok: false, reason: 'SESSION_REVOKED' };
    return withTenantTransaction(this.pool, tenant, async client => {
      const session = await client.query(
        `SELECT 1 FROM production.user_sessions
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3
           AND revoked_at IS NULL AND expires_at > now()`,
        [sessionId, tenant.tenantId, userId]
      );
      if (session.rowCount !== 1) return { ok: false as const, reason: 'SESSION_REVOKED' as const };

      const membership = await client.query<{ user_subject: string }>(
        `SELECT membership.user_subject
         FROM production.memberships membership
         JOIN production.tenants tenant_record ON tenant_record.id = membership.tenant_id
         JOIN production.users user_record ON user_record.id = membership.user_id
         WHERE membership.tenant_id = $1 AND membership.user_id = $2
           AND membership.status = 'active' AND tenant_record.status = 'approved'
           AND user_record.account_status = 'active'`,
        [tenant.tenantId, userId]
      );
      if (membership.rowCount !== 1) return { ok: false as const, reason: 'MEMBERSHIP_INACTIVE' as const };

      const rows = await client.query<{
        assignment_id: string;
        role_code: string;
        permissions: string[];
        scopes: Array<{ resourceType: string; resourceId: string }>;
      }>(
        `SELECT assignment.id AS assignment_id, assignment.role_code,
                COALESCE(array_agg(DISTINCT rp.permission_code)
                  FILTER (WHERE rp.permission_code IS NOT NULL), '{}') AS permissions,
                COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                    'resourceType', scope.resource_type, 'resourceId', scope.resource_id))
                  FROM production.role_assignment_scopes scope
                  WHERE scope.tenant_id = assignment.tenant_id AND scope.assignment_id = assignment.id
                ), '[]'::jsonb) AS scopes
         FROM production.membership_role_assignments assignment
         LEFT JOIN production.role_permissions rp ON rp.role_code = assignment.role_code
         WHERE assignment.tenant_id = $1 AND assignment.user_subject = $2
           AND assignment.revoked_at IS NULL
         GROUP BY assignment.id, assignment.role_code, assignment.tenant_id`,
        [tenant.tenantId, membership.rows[0].user_subject]
      );
      const grants: RoleGrant[] = rows.rows.map(row => ({
        roleCode: row.role_code,
        permissions: row.permissions,
        scopes: row.scopes
      }));
      return {
        ok: true as const,
        principal: createAuthorizedPrincipal({ tenant, userId, sessionId, grants })
      };
    });
  }

  async createSession(
    tenant: VerifiedTenantPrincipal,
    userId: string,
    ttlSeconds: number
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    return withTenantTransaction(this.pool, tenant, async client => {
      const result = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.user_sessions (tenant_id, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(secs => $3))
         RETURNING id, expires_at`,
        [tenant.tenantId, userId, ttlSeconds]
      );
      return { sessionId: result.rows[0].id, expiresAt: result.rows[0].expires_at };
    });
  }

  async revokeSession(
    tenant: VerifiedTenantPrincipal,
    sessionId: string,
    reason: string
  ): Promise<void> {
    await withTenantTransaction(this.pool, tenant, client =>
      client.query(
        `UPDATE production.user_sessions SET revoked_at = now(), revoked_reason = $3
         WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL`,
        [sessionId, tenant.tenantId, reason]
      )
    );
  }

  /** Revokes the membership, its role assignments, and all of the user's sessions. */
  async revokeMembership(actor: AuthorizedPrincipal, userId: string, reason: string): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      const membership = await client.query<{ user_subject: string }>(
        `UPDATE production.memberships
         SET status = 'revoked', revoked_at = now(), status_changed_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND status <> 'revoked'
         RETURNING user_subject`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_NOT_FOUND');
      await client.query(
        `UPDATE production.membership_role_assignments
         SET revoked_at = now(), revoked_by = $3
         WHERE tenant_id = $1 AND user_subject = $2 AND revoked_at IS NULL`,
        [actor.tenantId, membership.rows[0].user_subject, actor.userId]
      );
      await client.query(
        `UPDATE production.user_sessions SET revoked_at = now(), revoked_reason = $3
         WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [actor.tenantId, userId, reason]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_revoked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, reason })]
      );
    });
  }

  /**
   * Assigns a tenant role. The actor must hold membership.roles.assign and may
   * not grant permissions it does not itself hold (no privilege escalation).
   */
  async assignRole(
    actor: AuthorizedPrincipal,
    userId: string,
    roleCode: string
  ): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      const role = await client.query<{ permissions: string[] }>(
        `SELECT COALESCE(array_agg(rp.permission_code), '{}') AS permissions
         FROM production.roles role_record
         LEFT JOIN production.role_permissions rp ON rp.role_code = role_record.code
         WHERE role_record.code = $1
         GROUP BY role_record.code`,
        [roleCode]
      );
      if (!role.rows[0]) throw new Error('ROLE_NOT_FOUND');
      if (!role.rows[0].permissions.every(permission => actor.hasPermission(permission))) {
        throw new Error('FORBIDDEN');
      }
      const membership = await client.query<{ user_subject: string }>(
        `SELECT user_subject FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_NOT_FOUND');
      await client.query(
        `INSERT INTO production.membership_role_assignments
           (tenant_id, user_subject, role_code, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, user_subject, role_code) WHERE revoked_at IS NULL DO NOTHING`,
        [actor.tenantId, membership.rows[0].user_subject, roleCode, actor.userId]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_role_assigned', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, roleCode })]
      );
    });
  }
}
