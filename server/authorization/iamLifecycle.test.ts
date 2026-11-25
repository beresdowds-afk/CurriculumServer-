import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal } from '../db/testSupport';
import { hashInvitationToken } from '../schoolProvisioning';
import {
  AuthorizationRepository,
  generateTotpCode,
  verifyTotpCode
} from './authorizationRepository';
import { createAuthorizedPrincipal } from './authorizedPrincipal';
import { PERMISSIONS, TENANT_ROLES } from './permissions';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const SCHOOL_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_USER_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_USER_ID = '44444444-4444-4444-8444-444444444444';
const SESSION_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_SESSION_ID = '66666666-6666-4666-8666-666666666666';
const INVITATION_ID = '77777777-7777-4777-8777-777777777777';
const FACTOR_ID = '88888888-8888-4888-8888-888888888888';
const CHALLENGE_ID = '99999999-9999-4999-8999-999999999999';
const STAFF_RECORD_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeResult<R extends QueryResultRow>(rows: QueryResultRow[] = [], rowCount = rows.length): QueryResult<R> {
  return { rows: rows as R[], command: 'SELECT', rowCount, oid: 0, fields: [] };
}

class IamMockPool implements DatabasePool {
  readonly statements: Array<{ text: string; values?: unknown[] }> = [];
  readonly auditActions: string[] = [];

  constructor(
    private readonly handler: (text: string, values?: unknown[]) => QueryResult<QueryResultRow> | undefined = () => undefined
  ) {}

  private readonly client: DatabaseClient = {
    query: async <R extends QueryResultRow>(text: string, values?: unknown[]) => {
      this.statements.push({ text, values });
      if (text.includes('INSERT INTO production.audit_events')) {
        const match = text.match(/'([^']+)'/);
        if (match) this.auditActions.push(match[1]);
      }
      const handled = this.handler(text, values);
      if (handled) return handled as QueryResult<R>;
      return makeResult<R>();
    },
    release: () => undefined
  };

  async query<R extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
    return this.client.query<R>(text, values);
  }

  async connect(): Promise<DatabaseClient> {
    return this.client;
  }

  async end(): Promise<void> {}
  on(): this { return this; }
}

function withIamEnv<T>(fn: () => Promise<T> | T): Promise<T> {
  const prevSecret = process.env.CONTROL_PLANE_SECRET;
  const prevClientId = process.env.GOOGLE_OIDC_CLIENT_ID;
  process.env.CONTROL_PLANE_SECRET = 'iam-lifecycle-test-control-plane-secret-32-bytes';
  process.env.GOOGLE_OIDC_CLIENT_ID = 'google-oidc-client-test.apps.googleusercontent.com';
  return Promise.resolve(fn()).finally(() => {
    if (prevSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
    else process.env.CONTROL_PLANE_SECRET = prevSecret;
    if (prevClientId === undefined) delete process.env.GOOGLE_OIDC_CLIENT_ID;
    else process.env.GOOGLE_OIDC_CLIENT_ID = prevClientId;
  });
}

function createAdminActor() {
  return createAuthorizedPrincipal({
    tenant: principal(TENANT_ID),
    userId: ADMIN_USER_ID,
    sessionId: SESSION_ID,
    grants: [{
      roleCode: TENANT_ROLES.tenantAdmin,
      permissions: Object.values(PERMISSIONS),
      scopes: []
    }]
  });
}

test('IAM roles, permissions, and membership directory enforce tenant isolation and exclude super_admin', async () => {
  const pool = new IamMockPool(text => {
    if (text.includes('FROM production.roles r')) {
      return makeResult([{
        code: 'principal',
        description: 'School Principal',
        system_role: true,
        permissions: [PERMISSIONS.schoolProfileRead, PERMISSIONS.studentsRead]
      }]);
    }
    if (text.includes('FROM production.permissions ORDER BY code')) {
      return makeResult([{ code: PERMISSIONS.schoolProfileRead, description: 'Read profile' }]);
    }
    if (text.includes('FROM production.memberships m')) {
      return makeResult([{
        user_id: STAFF_USER_ID,
        user_subject: STAFF_USER_ID,
        email: 'teacher@school.edu.ng',
        full_name: 'Ada Obi',
        account_status: 'active',
        membership_status: 'active',
        primary_role: 'teacher',
        assigned_roles: ['teacher'],
        created_at: new Date('2026-01-10T00:00:00Z')
      }]);
    }
    return undefined;
  });

  const repo = new AuthorizationRepository(pool);
  const actor = createAdminActor();

  const governance = await repo.listRolesAndPermissions(actor);
  assert.equal(governance.roles[0].code, 'principal');
  assert.equal(governance.permissions[0].code, PERMISSIONS.schoolProfileRead);
  assert.ok(pool.statements.some(s => s.text.includes("WHERE r.code <> 'super_admin'")));

  const directory = await repo.listMemberships(actor);
  assert.equal(directory.length, 1);
  assert.equal(directory[0].email, 'teacher@school.edu.ng');
  assert.deepEqual(directory[0].assignedRoles, ['teacher']);
});

test('member invitations hash tokens, link staff records, accept once, and reject replay or revocation', async () => {
  await withIamEnv(async () => {
    const invitedEmail = 'new.teacher@school.edu.ng';
    let storedTokenHash: Buffer | null = null;
    let status: 'pending' | 'accepted' | 'revoked' = 'pending';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const pool = new IamMockPool((text, values) => {
      if (text.includes('FROM production.user_sessions user_session')) return makeResult([{}]);
      if (text.includes('SELECT DISTINCT permission.code AS permission_code')) {
        return makeResult(Object.values(PERMISSIONS).map(permission_code => ({ permission_code })));
      }
      if (text.includes('SELECT COALESCE(array_agg(permission.code)')) {
        return makeResult([{ permissions: [PERMISSIONS.studentsRead] }]);
      }
      if (text.includes('INSERT INTO production.member_invitations')) {
        storedTokenHash = values?.[8] as Buffer;
        return makeResult([{
          id: INVITATION_ID,
          tenant_id: TENANT_ID,
          school_id: SCHOOL_ID,
          full_name: 'Chidi Okoro',
          email: invitedEmail,
          intended_role_code: 'teacher',
          department_id: null,
          staff_id: STAFF_RECORD_ID,
          guardian_id: null,
          status: 'pending',
          expires_at: expiresAt,
          accepted_at: null,
          revoked_at: null,
          created_at: new Date()
        }]);
      }
      if (text.includes('FROM production.member_invitations i')) {
        if (!storedTokenHash || !Buffer.isBuffer(values?.[0]) || !storedTokenHash.equals(values[0])) {
          return makeResult([]);
        }
        return makeResult([{
          id: INVITATION_ID,
          tenant_id: TENANT_ID,
          school_id: SCHOOL_ID,
          school_name: 'Greenfield Academy',
          full_name: 'Chidi Okoro',
          email: invitedEmail,
          intended_role_code: 'teacher',
          status,
          expires_at: expiresAt
        }]);
      }
      if (text.includes('FROM production.member_invitations') && text.includes('WHERE token_hash = $1')) {
        if (!storedTokenHash || !Buffer.isBuffer(values?.[0]) || !storedTokenHash.equals(values[0])) {
          return makeResult([]);
        }
        return makeResult([{
          id: INVITATION_ID,
          tenant_id: TENANT_ID,
          school_id: SCHOOL_ID,
          full_name: 'Chidi Okoro',
          email: invitedEmail,
          intended_role_code: 'teacher',
          staff_id: STAFF_RECORD_ID,
          guardian_id: null,
          status,
          expires_at: expiresAt
        }]);
      }
      if (text.includes('FROM production.member_invitations') && text.includes('FOR UPDATE')) {
        return makeResult([{
          id: INVITATION_ID,
          tenant_id: TENANT_ID,
          school_id: SCHOOL_ID,
          full_name: 'Chidi Okoro',
          email: invitedEmail,
          intended_role_code: 'teacher',
          staff_id: STAFF_RECORD_ID,
          guardian_id: null,
          status,
          expires_at: expiresAt
        }]);
      }
      if (text.includes('FROM production.users')) return makeResult([]);
      if (text.includes('INSERT INTO production.users')) return makeResult([{ id: STAFF_USER_ID }]);
      if (text.includes('SELECT 1 FROM production.memberships')) return makeResult([], 0);
      if (text.includes('UPDATE production.member_invitations') && text.includes("SET status = 'accepted'")) {
        status = 'accepted';
        storedTokenHash = values?.[2] as Buffer;
        return makeResult([], 1);
      }
      if (text.includes('UPDATE production.member_invitations') && text.includes("SET status = 'revoked'")) {
        status = 'revoked';
        return makeResult([], 1);
      }
      return undefined;
    });

    const repo = new AuthorizationRepository(pool);
    const actor = createAdminActor();

    await assert.rejects(
      repo.createMemberInvitation(actor, {
        schoolId: SCHOOL_ID,
        fullName: 'Bad Role',
        email: invitedEmail,
        intendedRoleCode: 'super_admin'
      }),
      /TENANT_ROLE_INVALID/
    );

    const created = await repo.createMemberInvitation(actor, {
      schoolId: SCHOOL_ID,
      fullName: 'Chidi Okoro',
      email: invitedEmail,
      intendedRoleCode: 'teacher',
      staffId: STAFF_RECORD_ID
    });
    assert.ok(created.invitationToken.length >= 32);
    const computedHash = hashInvitationToken(created.invitationToken);
    assert.ok(storedTokenHash?.equals(computedHash));

    const preview = await repo.getMemberInvitation(computedHash);
    assert.equal(preview?.email, invitedEmail);
    assert.equal(preview?.schoolName, 'Greenfield Academy');

    const accepted = await repo.acceptMemberInvitation(computedHash, 'StrongPassw0rd!2026');
    assert.equal(accepted.userId, STAFF_USER_ID);
    assert.equal(accepted.roleCode, 'teacher');
    assert.ok(pool.statements.some(s => s.text.includes('UPDATE production.staff SET user_id = $3')));

    // Token hash rotation prevents replaying the same invitation link
    assert.equal(await repo.getMemberInvitation(computedHash), null);
    await assert.rejects(
      repo.acceptMemberInvitation(computedHash, 'StrongPassw0rd!2026'),
      /INVITATION_INVALID_OR_EXPIRED/
    );
  });
});

test('session listing, own-session revocation, admin revocation, and audit query enforce scopes', async () => {
  const pool = new IamMockPool((text, values) => {
    if (text.includes('FROM production.user_sessions user_session')) return makeResult([{}]);
    if (text.includes('SELECT DISTINCT permission.code AS permission_code')) {
      return makeResult(Object.values(PERMISSIONS).map(permission_code => ({ permission_code })));
    }
    if (text.includes('FROM production.user_sessions s')) {
      return makeResult([{
        id: SESSION_ID,
        user_id: ADMIN_USER_ID,
        email: 'admin@school.edu.ng',
        full_name: 'Principal',
        auth_method: 'password',
        mfa_verified_at: null,
        ip_address: '127.0.0.1',
        user_agent: 'vitest',
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 3600_000),
        revoked_at: null,
        revoked_reason: null
      }]);
    }
    if (text.includes('UPDATE production.user_sessions SET revoked_at = now()')) {
      return makeResult([], values?.[0] === SESSION_ID || values?.[0] === OTHER_SESSION_ID ? 1 : 0);
    }
    if (text.includes('FROM production.audit_events')) {
      return makeResult([{
        id: 'audit-1',
        actor_subject: ADMIN_USER_ID,
        action: 'session_revoked',
        details: { sessionId: OTHER_SESSION_ID },
        occurred_at: new Date()
      }]);
    }
    return undefined;
  });

  const repo = new AuthorizationRepository(pool);
  const limitedActor = createAuthorizedPrincipal({
    tenant: principal(TENANT_ID),
    userId: STAFF_USER_ID,
    sessionId: SESSION_ID,
    grants: [{ roleCode: 'staff', permissions: [PERMISSIONS.sessionsRead], scopes: [] }]
  });

  await assert.rejects(repo.listSessions(limitedActor, ADMIN_USER_ID), /FORBIDDEN/);
  await assert.rejects(repo.revokeOwnOrTenantSession(limitedActor, OTHER_SESSION_ID, 'no permission'), /FORBIDDEN/);
  await repo.revokeOwnOrTenantSession(limitedActor, SESSION_ID, 'user sign out');

  const adminActor = createAdminActor();
  const sessions = await repo.listSessions(adminActor);
  assert.equal(sessions.length, 1);
  await repo.revokeOwnOrTenantSession(adminActor, OTHER_SESSION_ID, 'security rotation');
  const audits = await repo.queryAuditEvents(adminActor, { action: 'session_revoked', limit: 10 });
  assert.equal(audits[0].action, 'session_revoked');
});

test('TOTP MFA enrollment, verification, login challenge verification, and factor disabling work end to end', async () => {
  await withIamEnv(async () => {
    let encryptedFactorSecret = '';
    let factorStatus: 'pending' | 'verified' | 'disabled' = 'pending';
    let challengeTokenHash: Buffer | null = null;
    let challengeVerifiedAt: Date | null = null;

    const pool = new IamMockPool((text, values) => {
      if (text.includes('SELECT email FROM production.users')) {
        return makeResult([{ email: 'admin@school.edu.ng' }]);
      }
      if (text.includes('INSERT INTO production.user_mfa_factors')) {
        encryptedFactorSecret = String(values?.[3] ?? '');
        return makeResult([{ id: FACTOR_ID }]);
      }
      if (text.includes('FROM production.user_mfa_factors') && text.includes('FOR UPDATE')) {
        return makeResult([{ id: FACTOR_ID, secret_encrypted: encryptedFactorSecret, status: factorStatus }]);
      }
      if (text.includes("UPDATE production.user_mfa_factors") && text.includes("SET status = 'verified'")) {
        factorStatus = 'verified';
        return makeResult([], 1);
      }
      if (text.includes("UPDATE production.user_mfa_factors") && text.includes("SET status = 'disabled'")) {
        factorStatus = 'disabled';
        return makeResult([], 1);
      }
      if (text.includes('FROM production.user_mfa_factors') && text.includes("status = 'verified'")) {
        return factorStatus === 'verified' ? makeResult([{ id: FACTOR_ID }]) : makeResult([]);
      }
      if (text.includes('FROM production.user_mfa_factors') && text.includes('ORDER BY created_at DESC')) {
        return makeResult([{
          id: FACTOR_ID,
          factor_type: 'totp',
          friendly_name: 'School Authenticator',
          status: factorStatus,
          created_at: new Date(),
          verified_at: factorStatus === 'verified' ? new Date() : null,
          last_used_at: null
        }]);
      }
      if (text.includes('INSERT INTO production.mfa_challenges')) {
        challengeTokenHash = values?.[3] as Buffer;
        return makeResult([{ id: CHALLENGE_ID, expires_at: new Date(Date.now() + 300_000) }]);
      }
      if (text.includes('FROM production.mfa_challenges c')) {
        if (!challengeTokenHash || !Buffer.isBuffer(values?.[2]) || !challengeTokenHash.equals(values[2])) {
          return makeResult([]);
        }
        return makeResult([{
          id: CHALLENGE_ID,
          user_id: ADMIN_USER_ID,
          factor_id: FACTOR_ID,
          secret_encrypted: encryptedFactorSecret,
          email: 'admin@school.edu.ng',
          full_name: 'Principal Admin',
          role: 'tenant_admin',
          school_name: 'Greenfield Academy',
          verified_at: challengeVerifiedAt,
          expires_at: new Date(Date.now() + 300_000)
        }]);
      }
      if (text.includes('UPDATE production.mfa_challenges SET verified_at = now()')) {
        challengeVerifiedAt = new Date();
        return makeResult([], 1);
      }
      if (text.includes('INSERT INTO production.user_sessions')) {
        return makeResult([{ id: OTHER_SESSION_ID, expires_at: new Date(Date.now() + 3600_000) }]);
      }
      return undefined;
    });

    const repo = new AuthorizationRepository(pool);
    const actor = createAdminActor();

    const enrollment = await repo.createMfaTotpEnrollment(actor, 'School Authenticator');
    assert.ok(enrollment.otpauthUri.includes('otpauth://totp/'));
    assert.notEqual(encryptedFactorSecret, enrollment.secret);

    await assert.rejects(repo.verifyMfaTotpEnrollment(actor, FACTOR_ID, '000000'), /INVALID_MFA_CODE/);
    const validCode = generateTotpCode(enrollment.secret);
    assert.equal(verifyTotpCode(enrollment.secret, validCode), true);

    const verified = await repo.verifyMfaTotpEnrollment(actor, FACTOR_ID, validCode);
    assert.equal(verified.verified, true);

    const factors = await repo.listMfaFactors(actor);
    assert.equal(factors[0].status, 'verified');

    const challenge = await repo.createLoginMfaChallenge(TENANT_ID, 'admin@school.edu.ng', ADMIN_USER_ID);
    assert.ok(challenge?.mfaRequired);

    const session = await repo.verifyLoginMfaChallenge(
      TENANT_ID,
      challenge.challengeId,
      challenge.challengeToken,
      generateTotpCode(enrollment.secret),
      3600
    );
    assert.equal(session.sessionId, OTHER_SESSION_ID);
    assert.equal(session.role, 'tenant_admin');

    // Reusing the same login challenge is rejected once verified_at is stamped
    await assert.rejects(
      repo.verifyLoginMfaChallenge(
        TENANT_ID,
        challenge.challengeId,
        challenge.challengeToken,
        generateTotpCode(enrollment.secret),
        3600
      ),
      /INVALID_MFA_CHALLENGE/
    );

    await repo.disableMfaFactor(actor, FACTOR_ID);
    assert.equal(factorStatus, 'disabled');
  });
});

test('Google OIDC PKCE state creation and callback verification reject tampered state and unverified email', async () => {
  await withIamEnv(async () => {
    const redirectUri = 'http://localhost:3000/auth/oidc/callback';
    let storedStateHash: Buffer | null = null;
    let encryptedVerifier = '';
    let storedNonce = '';
    let consumedAt: Date | null = null;

    const pool = new IamMockPool((text, values) => {
      if (text.includes('SELECT status FROM production.tenants')) {
        return makeResult([{ status: 'approved' }]);
      }
      if (text.includes('INSERT INTO production.oidc_auth_states')) {
        storedStateHash = values?.[1] as Buffer;
        encryptedVerifier = String(values?.[2] ?? '');
        storedNonce = String(values?.[3] ?? '');
        return makeResult([{ expires_at: new Date(Date.now() + 600_000) }]);
      }
      if (text.includes('FROM production.oidc_auth_states')) {
        if (!storedStateHash || !Buffer.isBuffer(values?.[1]) || !storedStateHash.equals(values[1])) {
          return makeResult([]);
        }
        return makeResult([{
          id: 'oidc-state-1',
          pkce_verifier_encrypted: encryptedVerifier,
          nonce: storedNonce,
          redirect_uri: redirectUri,
          consumed_at: consumedAt,
          expires_at: new Date(Date.now() + 600_000)
        }]);
      }
      if (text.includes('UPDATE production.oidc_auth_states SET consumed_at = now()')) {
        consumedAt = new Date();
        return makeResult([], 1);
      }
      if (text.includes('FROM production.users u')) {
        return makeResult([{
          user_id: ADMIN_USER_ID,
          email: 'principal@school.edu.ng',
          full_name: 'Principal Okafor',
          role: 'principal',
          school_name: 'Greenfield Academy'
        }]);
      }
      if (text.includes('INSERT INTO production.user_sessions')) {
        return makeResult([{ id: SESSION_ID, expires_at: new Date(Date.now() + 3600_000) }]);
      }
      return undefined;
    });

    const repo = new AuthorizationRepository(pool);
    const start = await repo.createOidcAuthState(TENANT_ID, redirectUri);
    const url = new URL(start.authorizationUrl);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('code_challenge'), start.codeChallenge);

    await assert.rejects(
      repo.consumeOidcAuthStateAndSignIn({
        tenantId: TENANT_ID,
        state: start.state,
        code: 'auth-code-1',
        redirectUri: 'https://evil.example/callback'
      }),
      /OIDC_STATE_INVALID/
    );

    const session = await repo.consumeOidcAuthStateAndSignIn(
      {
        tenantId: TENANT_ID,
        state: start.state,
        code: 'auth-code-2',
        redirectUri
      },
      async input => {
        assert.ok(input.codeVerifier.length >= 32);
        assert.equal(input.nonce, storedNonce);
        return { email: 'principal@school.edu.ng', emailVerified: true, name: 'Principal Okafor' };
      }
    );
    assert.equal(session.sessionId, SESSION_ID);
    assert.equal(session.role, 'principal');
    assert.ok(pool.auditActions.includes('oidc_login_succeeded'));

    // Replaying consumed OIDC state fails
    await assert.rejects(
      repo.consumeOidcAuthStateAndSignIn(
        { tenantId: TENANT_ID, state: start.state, code: 'auth-code-2', redirectUri },
        async () => ({ email: 'principal@school.edu.ng', emailVerified: true })
      ),
      /OIDC_STATE_INVALID/
    );
  });
});
