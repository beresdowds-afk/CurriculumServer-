import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { inTransaction } from '../db/postgres';
import {
  createVerifiedTenantPrincipal,
  setInvitationTenantContext,
  setInvitationTokenContext,
  withTenantLoginTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import {
  assertAuthorized,
  createAuthorizedPrincipal,
  type AuthorizedPrincipal,
  type RoleGrant
} from './authorizedPrincipal';
import { PERMISSIONS, PLATFORM_ADMIN_ROLE, SCHOOL_ROLE_CODES, TENANT_ROLES } from './permissions';
import {
  createInvitationToken,
  hashPassword,
  isValidEmail,
  normalizeEmail
} from '../schoolProvisioning';

export type AuthorizationFailure =
  | 'SESSION_REVOKED'
  | 'MEMBERSHIP_INACTIVE'
  | 'IDENTITY_INCONSISTENT';

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

export interface SessionCreationOptions {
  authMethod?: 'password' | 'google_oidc' | 'invitation' | 'mfa_verified';
  mfaVerified?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface RoleDefinitionRecord {
  code: string;
  description: string;
  systemRole: boolean;
  permissions: string[];
}

export interface MembershipDirectoryRecord {
  userId: string;
  userSubject: string;
  email: string;
  fullName: string;
  accountStatus: string;
  membershipStatus: string;
  primaryRole: string;
  assignedRoles: string[];
  createdAt: Date;
}

export interface MemberInvitationRecord {
  id: string;
  tenantId: string;
  schoolId: string;
  fullName: string;
  email: string;
  intendedRoleCode: string;
  departmentId: string | null;
  staffId: string | null;
  guardianId: string | null;
  status: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  authMethod: string;
  mfaVerifiedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}

export interface AuditEventRecord {
  id: string;
  actorSubject: string;
  action: string;
  details: Record<string, unknown>;
  occurredAt: Date;
}

export interface MfaFactorRecord {
  id: string;
  factorType: 'totp';
  friendlyName: string;
  status: 'pending' | 'verified' | 'disabled';
  createdAt: Date;
  verifiedAt: Date | null;
  lastUsedAt: Date | null;
}

export interface OidcExchangeVerifier {
  (input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    nonce: string;
  }): Promise<{ email: string; emailVerified: boolean; name?: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCHOOL_ROLE_SET = new Set<string>(SCHOOL_ROLE_CODES);
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function deriveEncryptionKey(): Buffer {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (secret.length < 32 ||
      secret === 'default_insecure_secret' ||
      secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
    throw new Error('AUTH_ENCRYPTION_UNAVAILABLE');
  }
  return createHash('sha256').update(`iam-vault:${secret}`).digest();
}

function encryptSecret(plaintext: string): string {
  const key = deriveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(ciphertext: string): string {
  const [ivPart, tagPart, dataPart] = ciphertext.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('INVALID_ENCRYPTED_SECRET');
  const key = deriveEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secretBase32: string, timestampMs = Date.now(), stepOffset = 0): string {
  const counter = Math.floor(timestampMs / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', decodeBase32(secretBase32)).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secretBase32: string, code: string, timestampMs = Date.now()): boolean {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  const supplied = Buffer.from(normalized);
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(generateTotpCode(secretBase32, timestampMs, offset));
    if (expected.length === supplied.length && timingSafeEqual(supplied, expected)) {
      return true;
    }
  }
  return false;
}

async function exchangeGoogleOidcCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  nonce: string;
}): Promise<{ email: string; emailVerified: boolean; name?: string }> {
  const clientId = process.env.GOOGLE_OIDC_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_OIDC_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    throw new Error('OIDC_NOT_CONFIGURED');
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: input.codeVerifier
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!tokenRes.ok) throw new Error('OIDC_TOKEN_EXCHANGE_FAILED');
  const tokenBody = await tokenRes.json() as { id_token?: string; access_token?: string };
  if (!tokenBody.id_token) throw new Error('OIDC_ID_TOKEN_MISSING');

  // Verify Google id_token claims via Google's tokeninfo endpoint + nonce & aud check.
  const verifyUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
  verifyUrl.searchParams.set('id_token', tokenBody.id_token);
  const infoRes = await fetch(verifyUrl.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!infoRes.ok) throw new Error('OIDC_ID_TOKEN_INVALID');
  const claims = await infoRes.json() as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    nonce?: string;
    name?: string;
  };
  if (claims.aud !== clientId || claims.nonce !== input.nonce || !claims.email) {
    throw new Error('OIDC_CLAIMS_MISMATCH');
  }
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  return { email: claims.email, emailVerified, name: claims.name };
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
    if (!UUID_PATTERN.test(tenant.tenantId) || !UUID_PATTERN.test(userId)) {
      return { ok: false, reason: 'IDENTITY_INCONSISTENT' };
    }
    if (!sessionId || !UUID_PATTERN.test(sessionId)) return { ok: false, reason: 'SESSION_REVOKED' };
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
           AND membership.status = 'active' AND membership.revoked_at IS NULL
           AND tenant_record.status = 'approved'
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
                COALESCE(array_agg(DISTINCT permission.code)
                  FILTER (WHERE permission.code IS NOT NULL), '{}') AS permissions,
                COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                    'resourceType', scope.resource_type, 'resourceId', scope.resource_id))
                  FROM production.role_assignment_scopes scope
                  WHERE scope.tenant_id = assignment.tenant_id AND scope.assignment_id = assignment.id
                ), '[]'::jsonb) AS scopes
         FROM production.membership_role_assignments assignment
         JOIN production.roles role_record ON role_record.code = assignment.role_code
         LEFT JOIN production.role_permissions role_permission ON role_permission.role_code = role_record.code
         LEFT JOIN production.permissions permission ON permission.code = role_permission.permission_code
         WHERE assignment.tenant_id = $1 AND assignment.user_subject = $2
           AND assignment.revoked_at IS NULL
         GROUP BY assignment.id, assignment.role_code, assignment.tenant_id`,
        [tenant.tenantId, membership.rows[0].user_subject]
      );
      if (rows.rowCount === 0 || rows.rows.some(row =>
        !row.role_code || row.role_code === PLATFORM_ADMIN_ROLE ||
        !Array.isArray(row.permissions) ||
        !Array.isArray(row.scopes) ||
        row.scopes.some(scope => !scope || typeof scope.resourceType !== 'string' ||
          !/^[a-z_]+$/.test(scope.resourceType) ||
          typeof scope.resourceId !== 'string' || !UUID_PATTERN.test(scope.resourceId))
      )) {
        return { ok: false as const, reason: 'IDENTITY_INCONSISTENT' as const };
      }
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
    ttlSeconds: number,
    options: SessionCreationOptions = {}
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    return withTenantTransaction(this.pool, tenant, async client => {
      const membership = await client.query(
        `SELECT 1
         FROM production.memberships membership
         JOIN production.users user_record ON user_record.id = membership.user_id
         JOIN production.tenants tenant_record ON tenant_record.id = membership.tenant_id
         WHERE membership.tenant_id = $1 AND membership.user_id = $2
           AND membership.status = 'active' AND membership.revoked_at IS NULL
           AND user_record.account_status = 'active'
           AND tenant_record.status = 'approved'
         FOR UPDATE OF membership`,
        [tenant.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_INACTIVE');

      const authMethod = options.authMethod ?? 'password';
      const hasRichOptions = options.authMethod !== undefined || options.mfaVerified !== undefined ||
        options.ipAddress !== undefined || options.userAgent !== undefined;
      const result = hasRichOptions
        ? await client.query<{ id: string; expires_at: Date }>(
            `INSERT INTO production.user_sessions
               (tenant_id, user_id, expires_at, auth_method, mfa_verified_at, ip_address, user_agent)
             VALUES ($1, $2, now() + make_interval(secs => $3), $4, CASE WHEN $5 THEN now() ELSE NULL END, $6, $7)
             RETURNING id, expires_at`,
            [
              tenant.tenantId,
              userId,
              ttlSeconds,
              authMethod,
              Boolean(options.mfaVerified),
              options.ipAddress?.slice(0, 120) ?? null,
              options.userAgent?.slice(0, 255) ?? null
            ]
          )
        : await client.query<{ id: string; expires_at: Date }>(
            `INSERT INTO production.user_sessions (tenant_id, user_id, expires_at)
             VALUES ($1, $2, now() + make_interval(secs => $3))
             RETURNING id, expires_at`,
            [tenant.tenantId, userId, ttlSeconds]
          );
      return { sessionId: result.rows[0].id, expiresAt: result.rows[0].expires_at };
    });
  }

  async suspendMembership(actor: AuthorizedPrincipal, userId: string, reason: string): Promise<void> {
    if (!reason.trim()) throw new Error('INVALID_MEMBERSHIP_SUSPENSION');
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.membershipRolesAssign);
      const membership = await client.query(
        `UPDATE production.memberships
         SET status = 'suspended', status_changed_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND revoked_at IS NULL
         RETURNING user_subject`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('INVALID_MEMBERSHIP_TRANSITION');

      await client.query(
        `UPDATE production.user_sessions SET revoked_at = now(), revoked_reason = $3
         WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [actor.tenantId, userId, reason]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_suspended', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, reason })]
      );
    });
  }

  async reactivateMembership(actor: AuthorizedPrincipal, userId: string, reason: string): Promise<void> {
    if (!reason.trim()) throw new Error('INVALID_MEMBERSHIP_REACTIVATION');
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.membershipRolesAssign);
      const membership = await client.query(
        `UPDATE production.memberships
         SET status = 'active', status_changed_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'suspended' AND revoked_at IS NULL
         RETURNING user_subject`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('INVALID_MEMBERSHIP_TRANSITION');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_reactivated', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, reason })]
      );
    });
  }

  async revokeSession(
    actor: AuthorizedPrincipal,
    sessionId: string,
    reason: string
  ): Promise<void> {
    if (!sessionId || !reason.trim()) throw new Error('INVALID_SESSION_REVOCATION');
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.membershipRolesAssign);
      const revoked = await client.query(
        `UPDATE production.user_sessions SET revoked_at = now(), revoked_reason = $3
         WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL`,
        [sessionId, actor.tenantId, reason]
      );
      if (revoked.rowCount !== 1) throw new Error('SESSION_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'session_revoked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ sessionId, reason })]
      );
    });
  }

  async revokeOwnOrTenantSession(
    actor: AuthorizedPrincipal,
    sessionId: string,
    reason: string
  ): Promise<void> {
    if (!UUID_PATTERN.test(sessionId) || !reason.trim()) {
      throw new Error('INVALID_SESSION_REVOCATION');
    }
    const isOwnSession = sessionId === actor.sessionId;
    if (!isOwnSession) {
      assertAuthorized(actor, PERMISSIONS.identitySessionsManage);
    }
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      if (!isOwnSession) {
        await this.assertCurrentPrincipal(client, actor, PERMISSIONS.identitySessionsManage);
      }
      const revoked = await client.query(
        `UPDATE production.user_sessions SET revoked_at = now(), revoked_reason = $3
         WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL
           AND ($4::boolean = true OR user_id = $5)`,
        [sessionId, actor.tenantId, reason.trim().slice(0, 200), !isOwnSession, actor.userId]
      );
      if (revoked.rowCount !== 1) throw new Error('SESSION_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'session_revoked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ sessionId, reason: reason.trim().slice(0, 200), self: isOwnSession })]
      );
    });
  }

  async listSessions(
    actor: AuthorizedPrincipal,
    userIdFilter?: string
  ): Promise<SessionRecord[]> {
    const canManageAll = actor.hasPermission(PERMISSIONS.identitySessionsManage) ||
      actor.hasPermission(PERMISSIONS.membershipRolesAssign);
    if (userIdFilter && userIdFilter !== actor.userId && !canManageAll) {
      throw new Error('FORBIDDEN');
    }
    if (!canManageAll) {
      assertAuthorized(actor, PERMISSIONS.sessionsRead);
    }
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const targetUser = canManageAll ? (userIdFilter ?? null) : actor.userId;
      const values: unknown[] = [actor.tenantId];
      let userClause = '';
      if (targetUser) {
        values.push(targetUser);
        userClause = `AND s.user_id = $${values.length}`;
      }
      const result = await client.query<{
        id: string;
        user_id: string;
        email: string;
        full_name: string;
        auth_method: string;
        mfa_verified_at: Date | null;
        ip_address: string | null;
        user_agent: string | null;
        created_at: Date;
        last_seen_at: Date;
        expires_at: Date;
        revoked_at: Date | null;
        revoked_reason: string | null;
      }>(
        `SELECT s.id, s.user_id, u.email, u.full_name,
                COALESCE(s.auth_method, 'password') AS auth_method,
                s.mfa_verified_at, s.ip_address, s.user_agent,
                s.created_at, COALESCE(s.last_seen_at, s.created_at) AS last_seen_at,
                s.expires_at, s.revoked_at, s.revoked_reason
         FROM production.user_sessions s
         JOIN production.users u ON u.id = s.user_id
         WHERE s.tenant_id = $1 ${userClause}
         ORDER BY s.created_at DESC
         LIMIT 100`,
        values
      );
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        authMethod: row.auth_method,
        mfaVerifiedAt: row.mfa_verified_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        revokedReason: row.revoked_reason
      }));
    });
  }

  /** Revokes the membership, its role assignments, and all of the user's sessions. */
  async revokeMembership(actor: AuthorizedPrincipal, userId: string, reason: string): Promise<void> {
    if (!reason.trim()) throw new Error('INVALID_MEMBERSHIP_REVOCATION');
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.membershipRolesAssign);
      const membership = await client.query<{ user_subject: string }>(
        `UPDATE production.memberships
         SET status = 'revoked', revoked_at = now(), status_changed_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND status <> 'revoked'
         RETURNING user_subject`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_NOT_FOUND');
      const revokedAssignments = await client.query<{ role_code: string }>(
        `UPDATE production.membership_role_assignments
         SET revoked_at = now(), revoked_by = $3
        WHERE tenant_id = $1 AND user_subject = $2 AND revoked_at IS NULL
        RETURNING role_code`,
        [actor.tenantId, membership.rows[0].user_subject, actor.userId]
      );
      for (const assignment of revokedAssignments.rows) {
        await client.query(
          `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
           VALUES ($1, $2, 'membership_role_revoked', $3::jsonb)`,
          [actor.tenantId, actor.userId,
            JSON.stringify({ userId, roleCode: assignment.role_code, reason, membershipRevoked: true })]
        );
      }
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
      const actorPermissions = await this.assertCurrentPrincipal(
        client, actor, PERMISSIONS.membershipRolesAssign
      );
      if (!SCHOOL_ROLE_SET.has(roleCode) || roleCode === PLATFORM_ADMIN_ROLE) {
        throw new Error('TENANT_ROLE_INVALID');
      }
      const role = await client.query<{ permissions: string[] }>(
        `SELECT COALESCE(array_agg(permission.code), '{}') AS permissions
         FROM production.roles role_record
         LEFT JOIN production.role_permissions role_permission ON role_permission.role_code = role_record.code
         LEFT JOIN production.permissions permission ON permission.code = role_permission.permission_code
         WHERE role_record.code = $1
         GROUP BY role_record.code`,
        [roleCode]
      );
      if (!role.rows[0]) throw new Error('ROLE_NOT_FOUND');
      if (!role.rows[0].permissions.every(permission => actorPermissions.has(permission))) {
        throw new Error('FORBIDDEN');
      }
      const membership = await client.query<{ user_subject: string }>(
        `SELECT user_subject FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
           AND revoked_at IS NULL FOR UPDATE`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_NOT_FOUND');
      const assignment = await client.query<{ id: string }>(
        `INSERT INTO production.membership_role_assignments
           (tenant_id, user_subject, role_code, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, user_subject, role_code) WHERE revoked_at IS NULL DO NOTHING`,
        [actor.tenantId, membership.rows[0].user_subject, roleCode, actor.userId]
      );
      if (assignment.rowCount !== 1) throw new Error('ROLE_ALREADY_ASSIGNED');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_role_assigned', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, roleCode })]
      );
    });
  }

  async revokeRole(
    actor: AuthorizedPrincipal,
    userId: string,
    roleCode: string,
    reason: string
  ): Promise<void> {
    if (!reason.trim()) throw new Error('INVALID_ROLE_REVOCATION');
    assertAuthorized(actor, PERMISSIONS.membershipRolesAssign);
    if (!SCHOOL_ROLE_SET.has(roleCode) || roleCode === PLATFORM_ADMIN_ROLE) {
      throw new Error('TENANT_ROLE_INVALID');
    }
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.membershipRolesAssign);
      const membership = await client.query<{ user_subject: string }>(
        `SELECT user_subject FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
           AND revoked_at IS NULL FOR UPDATE`,
        [actor.tenantId, userId]
      );
      if (membership.rowCount !== 1) throw new Error('MEMBERSHIP_NOT_FOUND');
      const assignment = await client.query<{ id: string }>(
        `UPDATE production.membership_role_assignments
         SET revoked_at = now(), revoked_by = $4
         WHERE tenant_id = $1 AND user_subject = $2 AND role_code = $3
           AND revoked_at IS NULL
         RETURNING id`,
        [actor.tenantId, membership.rows[0].user_subject, roleCode, actor.userId]
      );
      if (assignment.rowCount !== 1) throw new Error('ROLE_ASSIGNMENT_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_role_revoked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ userId, roleCode, reason })]
      );
    });
  }

  async listRolesAndPermissions(actor: AuthorizedPrincipal): Promise<{
    roles: RoleDefinitionRecord[];
    permissions: Array<{ code: string; description: string }>;
  }> {
    assertAuthorized(actor, PERMISSIONS.membershipRead);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const rolesResult = await client.query<{
        code: string;
        description: string;
        system_role: boolean;
        permissions: string[];
      }>(
        `SELECT r.code, r.description, COALESCE(r.system_role, true) AS system_role,
                COALESCE(array_agg(DISTINCT rp.permission_code)
                  FILTER (WHERE rp.permission_code IS NOT NULL), '{}') AS permissions
         FROM production.roles r
         LEFT JOIN production.role_permissions rp ON rp.role_code = r.code
         WHERE r.code <> 'super_admin'
         GROUP BY r.code, r.description, r.system_role
         ORDER BY r.code`
      );
      const permissionsResult = await client.query<{ code: string; description: string }>(
        `SELECT code, description FROM production.permissions ORDER BY code`
      );
      return {
        roles: rolesResult.rows.map(row => ({
          code: row.code,
          description: row.description,
          systemRole: row.system_role,
          permissions: row.permissions
        })),
        permissions: permissionsResult.rows
      };
    });
  }

  async listMemberships(actor: AuthorizedPrincipal): Promise<MembershipDirectoryRecord[]> {
    assertAuthorized(actor, PERMISSIONS.membershipRead);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<{
        user_id: string;
        user_subject: string;
        email: string;
        full_name: string;
        account_status: string;
        membership_status: string;
        primary_role: string;
        assigned_roles: string[];
        created_at: Date;
      }>(
        `SELECT m.user_id, m.user_subject, u.email, u.full_name, u.account_status,
                m.status AS membership_status, m.role AS primary_role,
                COALESCE(array_agg(DISTINCT mra.role_code)
                  FILTER (WHERE mra.role_code IS NOT NULL), '{}') AS assigned_roles,
                m.created_at
         FROM production.memberships m
         JOIN production.users u ON u.id = m.user_id
         LEFT JOIN production.membership_role_assignments mra
           ON mra.tenant_id = m.tenant_id
          AND mra.user_subject = m.user_subject
          AND mra.revoked_at IS NULL
         WHERE m.tenant_id = $1
         GROUP BY m.user_id, m.user_subject, u.email, u.full_name, u.account_status,
                  m.status, m.role, m.created_at
         ORDER BY lower(u.full_name), m.created_at DESC`,
        [actor.tenantId]
      );
      return result.rows.map(row => ({
        userId: row.user_id,
        userSubject: row.user_subject,
        email: row.email,
        fullName: row.full_name,
        accountStatus: row.account_status,
        membershipStatus: row.membership_status,
        primaryRole: row.primary_role,
        assignedRoles: row.assigned_roles,
        createdAt: row.created_at
      }));
    });
  }

  async listInvitations(actor: AuthorizedPrincipal, schoolId: string): Promise<MemberInvitationRecord[]> {
    assertAuthorized(actor, PERMISSIONS.identityInvite);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<{
        id: string;
        tenant_id: string;
        school_id: string;
        full_name: string;
        email: string;
        intended_role_code: string;
        department_id: string | null;
        staff_id: string | null;
        guardian_id: string | null;
        status: string;
        expires_at: Date;
        accepted_at: Date | null;
        revoked_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, tenant_id, school_id, full_name, email, intended_role_code,
                department_id, staff_id, guardian_id, status, expires_at,
                accepted_at, revoked_at, created_at
         FROM production.member_invitations
         WHERE tenant_id = $1 AND school_id = $2
         ORDER BY created_at DESC`,
        [actor.tenantId, schoolId]
      );
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        schoolId: row.school_id,
        fullName: row.full_name,
        email: row.email,
        intendedRoleCode: row.intended_role_code,
        departmentId: row.department_id,
        staffId: row.staff_id,
        guardianId: row.guardian_id,
        status: row.status,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at,
        createdAt: row.created_at
      }));
    });
  }

  async createMemberInvitation(
    actor: AuthorizedPrincipal,
    input: {
      schoolId: string;
      fullName: string;
      email: string;
      intendedRoleCode: string;
      departmentId?: string | null;
      staffId?: string | null;
      guardianId?: string | null;
      expiresInHours?: number;
    }
  ): Promise<{ invitation: MemberInvitationRecord; invitationToken: string }> {
    assertAuthorized(actor, PERMISSIONS.identityInvite);
    const fullName = input.fullName?.trim().replace(/\s+/g, ' ');
    const email = normalizeEmail(input.email || '');
    if (!fullName || fullName.length > 160) throw new Error('INVALID_INVITATION_NAME');
    if (!isValidEmail(email)) throw new Error('INVALID_INVITATION_EMAIL');
    if (!SCHOOL_ROLE_SET.has(input.intendedRoleCode) || input.intendedRoleCode === PLATFORM_ADMIN_ROLE) {
      throw new Error('TENANT_ROLE_INVALID');
    }
    const ttlHours = Math.min(168, Math.max(1, Math.floor(input.expiresInHours ?? 72)));
    const { token, tokenHash } = createInvitationToken();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const actorPermissions = await this.assertCurrentPrincipal(client, actor, PERMISSIONS.identityInvite);
      const role = await client.query<{ permissions: string[] }>(
        `SELECT COALESCE(array_agg(permission.code), '{}') AS permissions
         FROM production.roles r
         LEFT JOIN production.role_permissions rp ON rp.role_code = r.code
         LEFT JOIN production.permissions permission ON permission.code = rp.permission_code
         WHERE r.code = $1
         GROUP BY r.code`,
        [input.intendedRoleCode]
      );
      if (!role.rows[0]) throw new Error('ROLE_NOT_FOUND');
      if (!role.rows[0].permissions.every(p => actorPermissions.has(p))) {
        throw new Error('FORBIDDEN');
      }

      const inserted = await client.query<{
        id: string;
        tenant_id: string;
        school_id: string;
        full_name: string;
        email: string;
        intended_role_code: string;
        department_id: string | null;
        staff_id: string | null;
        guardian_id: string | null;
        status: string;
        expires_at: Date;
        accepted_at: Date | null;
        revoked_at: Date | null;
        created_at: Date;
      }>(
        `INSERT INTO production.member_invitations
           (tenant_id, school_id, full_name, email, intended_role_code,
            department_id, staff_id, guardian_id, token_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, tenant_id, school_id, full_name, email, intended_role_code,
                   department_id, staff_id, guardian_id, status, expires_at,
                   accepted_at, revoked_at, created_at`,
        [
          actor.tenantId,
          input.schoolId,
          fullName,
          email,
          input.intendedRoleCode,
          input.departmentId ?? null,
          input.staffId ?? null,
          input.guardianId ?? null,
          tokenHash,
          expiresAt,
          actor.userId
        ]
      );
      const row = inserted.rows[0];
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'member_invitation_created', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({
          invitationId: row.id,
          schoolId: row.school_id,
          roleCode: row.intended_role_code
        })]
      );
      return {
        invitation: {
          id: row.id,
          tenantId: row.tenant_id,
          schoolId: row.school_id,
          fullName: row.full_name,
          email: row.email,
          intendedRoleCode: row.intended_role_code,
          departmentId: row.department_id,
          staffId: row.staff_id,
          guardianId: row.guardian_id,
          status: row.status,
          expiresAt: row.expires_at,
          acceptedAt: row.accepted_at,
          revokedAt: row.revoked_at,
          createdAt: row.created_at
        },
        invitationToken: token
      };
    });
  }

  async revokeMemberInvitation(
    actor: AuthorizedPrincipal,
    invitationId: string,
    reason: string
  ): Promise<void> {
    if (!UUID_PATTERN.test(invitationId) || !reason.trim()) {
      throw new Error('INVALID_INVITATION_REVOCATION');
    }
    assertAuthorized(actor, PERMISSIONS.identityInvite);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await this.assertCurrentPrincipal(client, actor, PERMISSIONS.identityInvite);
      const result = await client.query(
        `UPDATE production.member_invitations
         SET status = 'revoked', revoked_at = now(), revoked_reason = $3,
             token_hash = $4, token_version = token_version + 1, updated_at = now()
         WHERE id = $1 AND tenant_id = $2 AND status = 'pending'`,
        [invitationId, actor.tenantId, reason.trim().slice(0, 300), randomBytes(32)]
      );
      if (result.rowCount !== 1) throw new Error('INVITATION_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'member_invitation_revoked', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ invitationId, reason: reason.trim().slice(0, 300) })]
      );
    });
  }

  async getMemberInvitation(tokenHash: Buffer): Promise<{
    id: string;
    tenantId: string;
    schoolId: string;
    schoolName: string;
    fullName: string;
    email: string;
    intendedRoleCode: string;
    status: string;
    expiresAt: Date;
  } | null> {
    return inTransaction(this.pool, async client => {
      await setInvitationTokenContext(client, tokenHash);
      const result = await client.query<{
        id: string;
        tenant_id: string;
        school_id: string;
        school_name: string;
        full_name: string;
        email: string;
        intended_role_code: string;
        status: string;
        expires_at: Date;
      }>(
        `SELECT i.id, i.tenant_id, i.school_id,
                COALESCE(org.name, 'School') AS school_name,
                i.full_name, i.email, i.intended_role_code, i.status, i.expires_at
         FROM production.member_invitations i
         LEFT JOIN production.organizations org ON org.tenant_id = i.tenant_id
         WHERE i.token_hash = $1`,
        [tokenHash]
      );
      const row = result.rows[0];
      if (!row || row.status !== 'pending' || row.expires_at.getTime() <= Date.now()) {
        return null;
      }
      return {
        id: row.id,
        tenantId: row.tenant_id,
        schoolId: row.school_id,
        schoolName: row.school_name,
        fullName: row.full_name,
        email: row.email,
        intendedRoleCode: row.intended_role_code,
        status: row.status,
        expiresAt: row.expires_at
      };
    });
  }

  async acceptMemberInvitation(
    tokenHash: Buffer,
    password: string
  ): Promise<{ tenantId: string; schoolId: string; userId: string; roleCode: string; email: string; fullName: string }> {
    const passwordHash = await hashPassword(password);
    return inTransaction(this.pool, async client => {
      await setInvitationTokenContext(client, tokenHash);
      const lookup = await client.query<{
        id: string;
        tenant_id: string;
        school_id: string;
        full_name: string;
        email: string;
        intended_role_code: string;
        staff_id: string | null;
        guardian_id: string | null;
        status: string;
        expires_at: Date;
      }>(
        `SELECT id, tenant_id, school_id, full_name, email, intended_role_code,
                staff_id, guardian_id, status, expires_at
         FROM production.member_invitations
         WHERE token_hash = $1`,
        [tokenHash]
      );
      const candidate = lookup.rows[0];
      if (!candidate) throw new Error('INVITATION_INVALID_OR_EXPIRED');

      await setInvitationTenantContext(client, candidate.tenant_id, tokenHash);
      const locked = await client.query<typeof candidate>(
        `SELECT id, tenant_id, school_id, full_name, email, intended_role_code,
                staff_id, guardian_id, status, expires_at
         FROM production.member_invitations
         WHERE id = $1 AND token_hash = $2
         FOR UPDATE`,
        [candidate.id, tokenHash]
      );
      const invitation = locked.rows[0];
      if (!invitation || invitation.status !== 'pending' ||
          invitation.expires_at.getTime() <= Date.now() ||
          !SCHOOL_ROLE_SET.has(invitation.intended_role_code) ||
          invitation.intended_role_code === PLATFORM_ADMIN_ROLE) {
        throw new Error('INVITATION_INVALID_OR_EXPIRED');
      }

      const existingUser = await client.query<{ id: string; account_status: string }>(
        `SELECT id, account_status FROM production.users
         WHERE lower(email) = lower($1) FOR UPDATE`,
        [invitation.email]
      );
      let userId: string;
      if (existingUser.rows[0]) {
        if (existingUser.rows[0].account_status !== 'active') {
          throw new Error('ACCOUNT_INACTIVE');
        }
        userId = existingUser.rows[0].id;
      } else {
        const created = await client.query<{ id: string }>(
          `INSERT INTO production.users (email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, now())
           RETURNING id`,
          [invitation.email, invitation.full_name, passwordHash]
        );
        userId = created.rows[0].id;
      }

      const existingMembership = await client.query(
        `SELECT 1 FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2`,
        [invitation.tenant_id, userId]
      );
      if (existingMembership.rowCount === 0) {
        await client.query(
          `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role, status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [invitation.tenant_id, userId, userId, invitation.intended_role_code]
        );
      }
      await client.query(
        `INSERT INTO production.membership_role_assignments
           (tenant_id, user_subject, role_code, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, user_subject, role_code) WHERE revoked_at IS NULL DO NOTHING`,
        [invitation.tenant_id, userId, invitation.intended_role_code, `invitation:${invitation.id}`]
      );
      if (invitation.staff_id) {
        await client.query(
          `UPDATE production.staff SET user_id = $3, updated_at = now()
           WHERE tenant_id = $1 AND id = $2 AND user_id IS NULL`,
          [invitation.tenant_id, invitation.staff_id, userId]
        );
      }
      if (invitation.guardian_id) {
        await client.query(
          `UPDATE production.guardians SET user_id = $3, updated_at = now()
           WHERE tenant_id = $1 AND id = $2 AND user_id IS NULL`,
          [invitation.tenant_id, invitation.guardian_id, userId]
        );
      }
      const rotated = randomBytes(32);
      const updated = await client.query(
        `UPDATE production.member_invitations
         SET status = 'accepted', accepted_at = now(), accepted_user_id = $2,
             token_hash = $3, updated_at = now()
         WHERE id = $1 AND tenant_id = $4 AND token_hash = $5 AND status = 'pending'`,
        [invitation.id, userId, rotated, invitation.tenant_id, tokenHash]
      );
      if (updated.rowCount !== 1) throw new Error('INVITATION_INVALID_OR_EXPIRED');

      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'member_invitation_accepted', $3::jsonb)`,
        [invitation.tenant_id, userId, JSON.stringify({
          invitationId: invitation.id,
          roleCode: invitation.intended_role_code
        })]
      );
      return {
        tenantId: invitation.tenant_id,
        schoolId: invitation.school_id,
        userId,
        roleCode: invitation.intended_role_code,
        email: invitation.email,
        fullName: invitation.full_name
      };
    });
  }

  async queryAuditEvents(
    actor: AuthorizedPrincipal,
    options: { action?: string; limit?: number } = {}
  ): Promise<AuditEventRecord[]> {
    assertAuthorized(actor, PERMISSIONS.auditRead);
    const limit = Math.min(200, Math.max(1, Math.floor(options.limit ?? 50)));
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const values: unknown[] = [actor.tenantId];
      let actionClause = '';
      if (options.action?.trim()) {
        values.push(options.action.trim());
        actionClause = `AND action = $${values.length}`;
      }
      values.push(limit);
      const result = await client.query<{
        id: string;
        actor_subject: string;
        action: string;
        details: Record<string, unknown>;
        occurred_at: Date;
      }>(
        `SELECT id, actor_subject, action, details, occurred_at
         FROM production.audit_events
         WHERE tenant_id = $1 ${actionClause}
         ORDER BY occurred_at DESC
         LIMIT $${values.length}`,
        values
      );
      return result.rows.map(row => ({
        id: row.id,
        actorSubject: row.actor_subject,
        action: row.action,
        details: row.details,
        occurredAt: row.occurred_at
      }));
    });
  }

  async listMfaFactors(actor: AuthorizedPrincipal): Promise<MfaFactorRecord[]> {
    assertAuthorized(actor, PERMISSIONS.identityMfaManage);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<{
        id: string;
        factor_type: 'totp';
        friendly_name: string;
        status: 'pending' | 'verified' | 'disabled';
        created_at: Date;
        verified_at: Date | null;
        last_used_at: Date | null;
      }>(
        `SELECT id, factor_type, friendly_name, status, created_at, verified_at, last_used_at
         FROM production.user_mfa_factors
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [actor.tenantId, actor.userId]
      );
      return result.rows.map(row => ({
        id: row.id,
        factorType: row.factor_type,
        friendlyName: row.friendly_name,
        status: row.status,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
        lastUsedAt: row.last_used_at
      }));
    });
  }

  async createMfaTotpEnrollment(
    actor: AuthorizedPrincipal,
    friendlyName = 'Authenticator App'
  ): Promise<{ factorId: string; secret: string; otpauthUri: string }> {
    assertAuthorized(actor, PERMISSIONS.identityMfaManage);
    const label = friendlyName.trim().slice(0, 80) || 'Authenticator App';
    const rawSecret = randomBytes(20);
    const secretBase32 = encodeBase32(rawSecret);
    const encrypted = encryptSecret(secretBase32);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const userRow = await client.query<{ email: string }>(
        `SELECT email FROM production.users WHERE id = $1`,
        [actor.userId]
      );
      const email = userRow.rows[0]?.email || actor.userId;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO production.user_mfa_factors
           (tenant_id, user_id, factor_type, friendly_name, secret_encrypted, status)
         VALUES ($1, $2, 'totp', $3, $4, 'pending')
         RETURNING id`,
        [actor.tenantId, actor.userId, label, encrypted]
      );
      const otpauthUri =
        `otpauth://totp/${encodeURIComponent(`CurriculumServer:${email}`)}?secret=${secretBase32}&issuer=${encodeURIComponent('CurriculumServer')}`;
      return {
        factorId: inserted.rows[0].id,
        secret: secretBase32,
        otpauthUri
      };
    });
  }

  async verifyMfaTotpEnrollment(
    actor: AuthorizedPrincipal,
    factorId: string,
    code: string
  ): Promise<{ verified: true; factorId: string }> {
    assertAuthorized(actor, PERMISSIONS.identityMfaManage);
    if (!UUID_PATTERN.test(factorId)) throw new Error('MFA_FACTOR_NOT_FOUND');
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const factor = await client.query<{ id: string; secret_encrypted: string; status: string }>(
        `SELECT id, secret_encrypted, status
         FROM production.user_mfa_factors
         WHERE tenant_id = $1 AND user_id = $2 AND id = $3
         FOR UPDATE`,
        [actor.tenantId, actor.userId, factorId]
      );
      const row = factor.rows[0];
      if (!row || row.status === 'disabled') throw new Error('MFA_FACTOR_NOT_FOUND');
      const secret = decryptSecret(row.secret_encrypted);
      if (!verifyTotpCode(secret, code)) {
        throw new Error('INVALID_MFA_CODE');
      }
      await client.query(
        `UPDATE production.user_mfa_factors
         SET status = 'verified', verified_at = COALESCE(verified_at, now()), last_used_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, factorId]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'mfa_factor_verified', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ factorId, factorType: 'totp' })]
      );
      return { verified: true as const, factorId };
    });
  }

  async disableMfaFactor(actor: AuthorizedPrincipal, factorId: string): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.identityMfaManage);
    if (!UUID_PATTERN.test(factorId)) throw new Error('MFA_FACTOR_NOT_FOUND');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      const updated = await client.query(
        `UPDATE production.user_mfa_factors
         SET status = 'disabled', disabled_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND id = $3 AND status <> 'disabled'`,
        [actor.tenantId, actor.userId, factorId]
      );
      if (updated.rowCount !== 1) throw new Error('MFA_FACTOR_NOT_FOUND');
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'mfa_factor_disabled', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ factorId })]
      );
    });
  }

  async createLoginMfaChallenge(
    tenantId: string,
    email: string,
    userId: string
  ): Promise<{ mfaRequired: true; challengeId: string; challengeToken: string; expiresAt: Date } | null> {
    return withTenantLoginTransaction(this.pool, tenantId, email, async client => {
      const factor = await client.query<{ id: string }>(
        `SELECT id FROM production.user_mfa_factors
         WHERE tenant_id = $1 AND user_id = $2 AND factor_type = 'totp' AND status = 'verified'
         LIMIT 1`,
        [tenantId, userId]
      );
      if (!factor.rows[0]) return null;
      const challengeToken = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(challengeToken).digest();
      const inserted = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.mfa_challenges
           (tenant_id, user_id, factor_id, challenge_purpose, token_hash, expires_at)
         VALUES ($1, $2, $3, 'login', $4, now() + interval '5 minutes')
         RETURNING id, expires_at`,
        [tenantId, userId, factor.rows[0].id, tokenHash]
      );
      return {
        mfaRequired: true as const,
        challengeId: inserted.rows[0].id,
        challengeToken,
        expiresAt: inserted.rows[0].expires_at
      };
    });
  }

  async verifyLoginMfaChallenge(
    tenantId: string,
    challengeId: string,
    challengeToken: string,
    code: string,
    ttlSeconds: number,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<{
    sessionId: string;
    expiresAt: Date;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    schoolName: string;
  }> {
    if (!UUID_PATTERN.test(tenantId) || !UUID_PATTERN.test(challengeId) || !challengeToken) {
      throw new Error('INVALID_MFA_CHALLENGE');
    }
    const tokenHash = createHash('sha256').update(challengeToken).digest();
    const tenantPrincipal = createVerifiedTenantPrincipal({
      valid: true,
      context: {
        tenantId,
        role: 'login',
        appId: 'curriculum-flow',
        schoolName: 'School',
        subscriptionTier: 'standard',
        status: 'ACTIVE',
        databaseName: '',
        storageNamespace: '',
        issuer: 'CurriculumServer-ControlPlane',
        audience: tenantId,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
        tokenSignature: 'verified-mfa-login',
        permissions: []
      }
    });
    return withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const challenge = await client.query<{
        id: string;
        user_id: string;
        factor_id: string;
        secret_encrypted: string;
        email: string;
        full_name: string;
        role: string;
        school_name: string;
        verified_at: Date | null;
        expires_at: Date;
      }>(
        `SELECT c.id, c.user_id, c.factor_id, f.secret_encrypted,
                u.email, u.full_name, m.role, org.name AS school_name,
                c.verified_at, c.expires_at
         FROM production.mfa_challenges c
         JOIN production.user_mfa_factors f
           ON f.tenant_id = c.tenant_id AND f.user_id = c.user_id AND f.id = c.factor_id
         JOIN production.users u ON u.id = c.user_id
         JOIN production.memberships m ON m.tenant_id = c.tenant_id AND m.user_id = c.user_id
         JOIN production.tenants t ON t.id = c.tenant_id
         JOIN production.organizations org ON org.tenant_id = t.id
         WHERE c.tenant_id = $1 AND c.id = $2 AND c.token_hash = $3
           AND f.status = 'verified' AND m.status = 'active' AND m.revoked_at IS NULL
           AND u.account_status = 'active' AND t.status = 'approved'
         FOR UPDATE OF c`,
        [tenantId, challengeId, tokenHash]
      );
      const row = challenge.rows[0];
      if (!row || row.verified_at || row.expires_at.getTime() <= Date.now()) {
        throw new Error('INVALID_MFA_CHALLENGE');
      }
      const secret = decryptSecret(row.secret_encrypted);
      if (!verifyTotpCode(secret, code)) {
        throw new Error('INVALID_MFA_CODE');
      }
      await client.query(
        `UPDATE production.mfa_challenges SET verified_at = now() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, challengeId]
      );
      await client.query(
        `UPDATE production.user_mfa_factors SET last_used_at = now() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, row.factor_id]
      );
      const session = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.user_sessions
           (tenant_id, user_id, expires_at, auth_method, mfa_verified_at, ip_address, user_agent)
         VALUES ($1, $2, now() + make_interval(secs => $3), 'mfa_verified', now(), $4, $5)
         RETURNING id, expires_at`,
        [tenantId, row.user_id, ttlSeconds, meta.ipAddress?.slice(0, 120) ?? null, meta.userAgent?.slice(0, 255) ?? null]
      );
      return {
        sessionId: session.rows[0].id,
        expiresAt: session.rows[0].expires_at,
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        schoolName: row.school_name
      };
    });
  }

  async createOidcAuthState(
    tenantId: string,
    redirectUri: string
  ): Promise<{ state: string; codeChallenge: string; authorizationUrl: string; expiresAt: Date }> {
    const clientId = process.env.GOOGLE_OIDC_CLIENT_ID || '';
    if (!clientId) throw new Error('OIDC_NOT_CONFIGURED');
    if (!UUID_PATTERN.test(tenantId)) throw new Error('TENANT_NOT_FOUND');
    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUri);
      if (!['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])].includes(parsedRedirect.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error('INVALID_REDIRECT_URI');
    }

    const state = randomBytes(32).toString('base64url');
    const stateHash = createHash('sha256').update(state).digest();
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const nonce = randomBytes(24).toString('base64url');
    const encryptedVerifier = encryptSecret(codeVerifier);

    const tenantPrincipal = createVerifiedTenantPrincipal({
      valid: true,
      context: {
        tenantId,
        role: 'login',
        appId: 'curriculum-flow',
        schoolName: 'School',
        subscriptionTier: 'standard',
        status: 'ACTIVE',
        databaseName: '',
        storageNamespace: '',
        issuer: 'CurriculumServer-ControlPlane',
        audience: tenantId,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        tokenSignature: 'verified-oidc-start',
        permissions: []
      }
    });

    const inserted = await withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const tenantCheck = await client.query<{ status: string }>(
        `SELECT status FROM production.tenants WHERE id = $1`,
        [tenantId]
      );
      if (tenantCheck.rows[0]?.status !== 'approved') throw new Error('TENANT_NOT_FOUND');
      const result = await client.query<{ expires_at: Date }>(
        `INSERT INTO production.oidc_auth_states
           (tenant_id, provider, state_hash, pkce_verifier_encrypted, nonce, redirect_uri, expires_at)
         VALUES ($1, 'google', $2, $3, $4, $5, now() + interval '10 minutes')
         RETURNING expires_at`,
        [tenantId, stateHash, encryptedVerifier, nonce, parsedRedirect.toString()]
      );
      return result.rows[0];
    });

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', parsedRedirect.toString());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    return {
      state,
      codeChallenge,
      authorizationUrl: authUrl.toString(),
      expiresAt: inserted.expires_at
    };
  }

  async consumeOidcAuthStateAndSignIn(
    input: {
      tenantId: string;
      state: string;
      code: string;
      redirectUri: string;
      ttlSeconds?: number;
      ipAddress?: string;
      userAgent?: string;
    },
    exchangeCode: OidcExchangeVerifier = exchangeGoogleOidcCode
  ): Promise<{
    sessionId: string;
    expiresAt: Date;
    userId: string;
    email: string;
    fullName: string;
    role: string;
    schoolName: string;
  }> {
    if (!UUID_PATTERN.test(input.tenantId) || !input.state || !input.code) {
      throw new Error('OIDC_STATE_INVALID');
    }
    const stateHash = createHash('sha256').update(input.state).digest();
    const ttlSeconds = Math.min(86400, Math.max(300, Math.floor(input.ttlSeconds ?? 3600)));
    const tenantPrincipal = createVerifiedTenantPrincipal({
      valid: true,
      context: {
        tenantId: input.tenantId,
        role: 'login',
        appId: 'curriculum-flow',
        schoolName: 'School',
        subscriptionTier: 'standard',
        status: 'ACTIVE',
        databaseName: '',
        storageNamespace: '',
        issuer: 'CurriculumServer-ControlPlane',
        audience: input.tenantId,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
        tokenSignature: 'verified-oidc-callback',
        permissions: []
      }
    });

    const stateRecord = await withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const result = await client.query<{
        id: string;
        pkce_verifier_encrypted: string;
        nonce: string;
        redirect_uri: string;
        consumed_at: Date | null;
        expires_at: Date;
      }>(
        `SELECT id, pkce_verifier_encrypted, nonce, redirect_uri, consumed_at, expires_at
         FROM production.oidc_auth_states
         WHERE tenant_id = $1 AND state_hash = $2
         FOR UPDATE`,
        [input.tenantId, stateHash]
      );
      const row = result.rows[0];
      if (!row || row.consumed_at || row.expires_at.getTime() <= Date.now() ||
          row.redirect_uri !== input.redirectUri) {
        throw new Error('OIDC_STATE_INVALID');
      }
      await client.query(
        `UPDATE production.oidc_auth_states SET consumed_at = now() WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, row.id]
      );
      return {
        codeVerifier: decryptSecret(row.pkce_verifier_encrypted),
        nonce: row.nonce,
        redirectUri: row.redirect_uri
      };
    });

    const verified = await exchangeCode({
      code: input.code,
      codeVerifier: stateRecord.codeVerifier,
      redirectUri: stateRecord.redirectUri,
      nonce: stateRecord.nonce
    });
    if (!verified.emailVerified || !isValidEmail(verified.email)) {
      throw new Error('OIDC_EMAIL_UNVERIFIED');
    }

    return withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const account = await client.query<{
        user_id: string;
        email: string;
        full_name: string;
        role: string;
        school_name: string;
      }>(
        `SELECT u.id AS user_id, u.email, u.full_name, m.role, org.name AS school_name
         FROM production.users u
         JOIN production.memberships m ON m.user_id = u.id
         JOIN production.tenants t ON t.id = m.tenant_id
         JOIN production.organizations org ON org.tenant_id = t.id
         WHERE m.tenant_id = $1 AND lower(u.email) = lower($2)
           AND u.account_status = 'active'
           AND m.status = 'active' AND m.revoked_at IS NULL
           AND t.status = 'approved'
         LIMIT 1`,
        [input.tenantId, verified.email]
      );
      const row = account.rows[0];
      if (!row) throw new Error('MEMBERSHIP_INACTIVE');
      const session = await client.query<{ id: string; expires_at: Date }>(
        `INSERT INTO production.user_sessions
           (tenant_id, user_id, expires_at, auth_method, ip_address, user_agent)
         VALUES ($1, $2, now() + make_interval(secs => $3), 'google_oidc', $4, $5)
         RETURNING id, expires_at`,
        [
          input.tenantId,
          row.user_id,
          ttlSeconds,
          input.ipAddress?.slice(0, 120) ?? null,
          input.userAgent?.slice(0, 255) ?? null
        ]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'oidc_login_succeeded', $3::jsonb)`,
        [input.tenantId, row.user_id, JSON.stringify({ provider: 'google', sessionId: session.rows[0].id })]
      );
      return {
        sessionId: session.rows[0].id,
        expiresAt: session.rows[0].expires_at,
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        schoolName: row.school_name
      };
    });
  }

  private async assertCurrentPrincipal(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    permission: string
  ): Promise<Set<string>> {
    const identity = await client.query(
      `SELECT 1
       FROM production.user_sessions user_session
       JOIN production.memberships membership
         ON membership.tenant_id = user_session.tenant_id AND membership.user_id = user_session.user_id
       JOIN production.users user_record ON user_record.id = user_session.user_id
       JOIN production.tenants tenant_record ON tenant_record.id = membership.tenant_id
       WHERE user_session.id = $1 AND user_session.tenant_id = $2 AND user_session.user_id = $3
         AND user_session.revoked_at IS NULL AND user_session.expires_at > now()
         AND membership.status = 'active' AND membership.revoked_at IS NULL
         AND user_record.account_status = 'active'
         AND tenant_record.status = 'approved'`,
      [actor.sessionId, actor.tenantId, actor.userId]
    );
    if (identity.rowCount !== 1) throw new Error('FORBIDDEN');

    const currentPermissions = await client.query<{ permission_code: string }>(
      `SELECT DISTINCT permission.code AS permission_code
       FROM production.membership_role_assignments assignment
       JOIN production.role_permissions role_permission ON role_permission.role_code = assignment.role_code
       JOIN production.permissions permission ON permission.code = role_permission.permission_code
       WHERE assignment.tenant_id = $1 AND assignment.user_subject = (
         SELECT user_subject FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
           AND revoked_at IS NULL
       ) AND assignment.revoked_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM production.role_assignment_scopes scope
           WHERE scope.tenant_id = assignment.tenant_id AND scope.assignment_id = assignment.id
         )`,
      [actor.tenantId, actor.userId]
    );
    if (!currentPermissions.rows.some(row => row.permission_code === permission)) {
      throw new Error('FORBIDDEN');
    }
    return new Set(currentPermissions.rows.map(row => row.permission_code));
  }
}
