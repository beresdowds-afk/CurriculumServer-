import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthorizationMiddleware } from './middleware';
import { createAuthorizedPrincipal } from './authorizedPrincipal';
import { PERMISSIONS } from './permissions';
import { principal } from '../db/testSupport';

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';

function context(overrides: Record<string, unknown> = {}) {
  return {
    tenantId, userId, sessionId, role: 'tenant_admin', appId: 'curriculum-flow', schoolName: 'S',
    subscriptionTier: 't', status: 'ACTIVE', databaseName: 'd', storageNamespace: '/s',
    issuer: 'i', audience: tenantId, issuedAt: 1, expiresAt: 2, tokenSignature: 'x', permissions: [],
    ...overrides
  };
}

function build(options: {
  token?: { valid: boolean; context?: any };
  result?: any;
  key?: string;
} = {}) {
  return createAuthorizationMiddleware({
    verifyToken: () => options.token ?? { valid: true, context: context() },
    signingConfigured: () => true,
    authorization: () => ({
      authorize: async () => options.result ?? {
        ok: true,
        principal: createAuthorizedPrincipal({
          tenant: principal(tenantId), userId, sessionId,
          grants: [{ roleCode: 'staff', permissions: [PERMISSIONS.schoolProfileRead], scopes: [] }]
        })
      }
    }),
    internalServiceKey: () => options.key
  });
}

async function run(handler: any, headers: Record<string, string> = { authorization: 'Bearer t' }) {
  const out: { status?: number; body?: any; nexted: boolean } = { nexted: false };
  const req: any = { headers };
  const res: any = {
    status(code: number) { out.status = code; return this; },
    json(body: unknown) { out.body = body; return this; }
  };
  await new Promise<void>(resolve => {
    const done = () => resolve();
    res.json = (body: unknown) => { out.body = body; done(); return res; };
    handler(req, res, () => { out.nexted = true; done(); });
  });
  return out;
}

test('unauthenticated requests are rejected', async () => {
  const out = await run(build().authenticated, {});
  assert.equal(out.status, 401);
  assert.equal(out.nexted, false);
});

test('expired or invalid tokens are rejected', async () => {
  const out = await run(build({ token: { valid: false } }).activeMembership);
  assert.equal(out.status, 401);
});

test('revoked sessions are rejected even with a valid token', async () => {
  const out = await run(build({ result: { ok: false, reason: 'SESSION_REVOKED' } }).activeMembership);
  assert.equal(out.status, 403);
  assert.equal(out.body.code, 'SESSION_REVOKED');
});

test('revoked memberships are rejected', async () => {
  const out = await run(build({ result: { ok: false, reason: 'MEMBERSHIP_INACTIVE' } }).activeMembership);
  assert.equal(out.status, 403);
  assert.equal(out.body.code, 'MEMBERSHIP_INACTIVE');
});

test('token role claims are not the permission source', async () => {
  // Token claims tenant_admin but the database grants only read access.
  const claimed = build({ token: { valid: true, context: context({ permissions: [PERMISSIONS.schoolConfigurationManage] }) } });
  const denied = await run(claimed.requirePermission(PERMISSIONS.schoolConfigurationManage));
  assert.equal(denied.status, 403);
  const admin = await run(claimed.tenantAdministrator);
  assert.equal(admin.status, 403);
  const allowed = await run(claimed.requirePermission(PERMISSIONS.schoolProfileRead));
  assert.equal(allowed.nexted, true);
});

test('resource-scoped grants do not apply to other resources', async () => {
  const scoped = createAuthorizedPrincipal({
    tenant: principal(tenantId), userId, sessionId,
    grants: [{ roleCode: 'staff', permissions: [PERMISSIONS.schoolProfileRead], scopes: [{ resourceType: 'class', resourceId: 'a' }] }]
  });
  const mw = build({ result: { ok: true, principal: scoped } });
  const other = await run(mw.requireResourcePermission(PERMISSIONS.schoolProfileRead, () => ({ resourceType: 'class', resourceId: 'b' })));
  assert.equal(other.status, 403);
  const own = await run(mw.requireResourcePermission(PERMISSIONS.schoolProfileRead, () => ({ resourceType: 'class', resourceId: 'a' })));
  assert.equal(own.nexted, true);
  const wide = await run(mw.requirePermission(PERMISSIONS.schoolProfileRead));
  assert.equal(wide.status, 403, 'scoped grants are not tenant-wide');
});

test('platform administrators are not tenant users and tenant users are not platform administrators', async () => {
  const platform = build({ token: { valid: true, context: context({ role: 'super_admin', userId: undefined, sessionId: undefined }) } });
  assert.equal((await run(platform.activeMembership)).status, 403);
  assert.equal((await run(platform.platformAdministrator)).nexted, true);
  assert.equal((await run(build().platformAdministrator)).status, 403);
});

test('internal service authentication requires a strong configured key', async () => {
  assert.equal((await run(build().internalService)).status, 503);
  assert.equal((await run(build({ key: 'short' }).internalService)).status, 503);
  const key = 'k'.repeat(40);
  const mw = build({ key });
  assert.equal((await run(mw.internalService, { 'x-internal-service-key': 'wrong' })).status, 401);
  assert.equal((await run(mw.internalService, { 'x-internal-service-key': key })).nexted, true);
});
