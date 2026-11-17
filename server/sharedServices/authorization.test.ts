import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { createAuthorizationMiddleware } from '../authorization/middleware';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { principal } from '../db/testSupport';
import {
  SharedServiceAuthorizationRepository,
  authenticateSharedServiceCaller,
  evaluateSharedServiceAccess,
  type ApplicationEntitlementRow
} from './authorization';

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';
const instanceId = '44444444-4444-4444-8444-444444444444';
const permission = 'shared.curriculum.discover';

function application(overrides: Partial<ApplicationEntitlementRow> = {}): ApplicationEntitlementRow {
  return {
    application_id: 'app_curriculum_flow',
    application_status: 'active',
    service_dependencies: ['central_curriculum'],
    entitlement_id: '55555555-5555-4555-8555-555555555555',
    entitlement_status: 'active',
    entitlement_expires_at: new Date(Date.now() + 60_000),
    entitlement_revoked_at: null,
    ...overrides
  };
}

function evaluate(overrides: {
  row?: Partial<ApplicationEntitlementRow>;
  permissions?: string[];
  applicationInstanceId?: string;
} = {}) {
  return evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'discover',
    applicationInstanceId: overrides.applicationInstanceId ?? instanceId,
    row: application(overrides.row),
    hasPermissions: requested => requested.every(item => (overrides.permissions ?? [permission]).includes(item))
  });
}

function fakePool(
  onQuery: (text: string, values?: unknown[]) => { rows?: unknown[]; rowCount?: number } | Error
): DatabasePool {
  const query = async <R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> => {
    const result = onQuery(text, values);
    if (result instanceof Error) throw result;
    return { rows: result.rows ?? [], rowCount: result.rowCount ?? result.rows?.length ?? 0 } as QueryResult<R>;
  };
  const client: DatabaseClient = {
    query,
    release() {}
  };
  return {
    query,
    async connect() { return client; },
    async end() {},
    on() { return this; }
  };
}

test('service permission is required even with an active tenant entitlement', () => {
  assert.deepEqual(evaluate({ permissions: [] }), { allowed: false, reason: 'PERMISSION_DENIED' });
});

test('valid tenant, application, permission and entitlement authorize service discovery', () => {
  const decision = evaluate();
  assert.equal(decision.allowed, true);
  assert.equal(decision.entitlementId, application().entitlement_id);
});

test('application instance must be valid, active, supported and dependency-declared', () => {
  assert.deepEqual(evaluate({ applicationInstanceId: 'not-a-uuid' }), {
    allowed: false,
    reason: 'INVALID_APPLICATION_INSTANCE'
  });
  assert.deepEqual(evaluate({ row: { application_status: 'suspended' } }), {
    allowed: false,
    reason: 'APPLICATION_INSTANCE_INACTIVE'
  });
  assert.deepEqual(evaluate({ row: { application_id: 'app_cbt_sovereign' } }).allowed, true);
  assert.deepEqual(evaluate({ row: { application_id: 'unknown_app' } }), {
    allowed: false,
    reason: 'APPLICATION_TYPE_UNSUPPORTED'
  });
  assert.deepEqual(evaluate({ row: { service_dependencies: [] } }), {
    allowed: false,
    reason: 'SERVICE_DEPENDENCY_NOT_DECLARED'
  });
});

test('expired and revoked service entitlements are denied immediately', () => {
  assert.deepEqual(evaluate({ row: { entitlement_expires_at: new Date(Date.now() - 1) } }), {
    allowed: false,
    reason: 'SERVICE_ENTITLEMENT_EXPIRED'
  });
  assert.deepEqual(evaluate({ row: { entitlement_status: 'revoked', entitlement_revoked_at: new Date() } }), {
    allowed: false,
    reason: 'SERVICE_ENTITLEMENT_REVOKED'
  });
  assert.deepEqual(evaluate({ row: { entitlement_status: 'suspended' } }), {
    allowed: false,
    reason: 'SERVICE_ENTITLEMENT_SUSPENDED'
  });
  assert.deepEqual(evaluate({ row: { entitlement_id: null } }), {
    allowed: false,
    reason: 'SERVICE_ENTITLEMENT_MISSING'
  });

  // When entitlement administration is decoupled and no entitlement row exists yet,
  // active, supported, dependency-declared instances with permission are allowed,
  // while revoked/suspended/expired entitlements remain denied.
  const decoupledAllowed = evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'consume',
    requestedOperation: 'curriculum.retrieve',
    applicationInstanceId: instanceId,
    row: application({ entitlement_id: null, entitlement_status: null, entitlement_expires_at: null }),
    hasPermissions: requested => requested.every(p => p === 'shared.curriculum.consume'),
    entitlementMode: 'decoupled'
  });
  assert.equal(decoupledAllowed.allowed, true);

  const decoupledRevoked = evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'consume',
    requestedOperation: 'curriculum.retrieve',
    applicationInstanceId: instanceId,
    row: application({ entitlement_status: 'revoked', entitlement_revoked_at: new Date() }),
    hasPermissions: requested => requested.every(p => p === 'shared.curriculum.consume'),
    entitlementMode: 'decoupled'
  });
  assert.deepEqual(decoupledRevoked, { allowed: false, reason: 'SERVICE_ENTITLEMENT_REVOKED' });
});

test('provisioned curriculum and textbook services authorize consumption while deferred services fail closed', () => {
  const curriculum = evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'authorize',
    requestedOperation: 'curriculum.retrieve',
    applicationInstanceId: instanceId,
    row: application(),
    hasPermissions: () => true
  });
  assert.deepEqual(curriculum, {
    allowed: true,
    entitlementId: application().entitlement_id,
    expiresAt: application().entitlement_expires_at.toISOString()
  });

  const consumeOk = evaluateSharedServiceAccess({
    serviceId: 'central_textbooks',
    operation: 'consume',
    requestedOperation: 'textbooks.read',
    applicationInstanceId: instanceId,
    row: application({ service_dependencies: ['central_textbooks'] }),
    hasPermissions: requested => requested.every(p => p === 'shared.textbooks.consume')
  });
  assert.equal(consumeOk.allowed, true);

  const missingConsume = evaluateSharedServiceAccess({
    serviceId: 'central_curriculum',
    operation: 'authorize',
    requestedOperation: 'curriculum.retrieve',
    applicationInstanceId: instanceId,
    row: application(),
    hasPermissions: requested => requested.every(p => p === 'shared.curriculum.authorize')
  });
  assert.deepEqual(missingConsume, { allowed: false, reason: 'PERMISSION_DENIED' });

  const result = evaluateSharedServiceAccess({
    serviceId: 'central_vehicle_tracking',
    operation: 'authorize',
    requestedOperation: 'vehicle.track',
    applicationInstanceId: instanceId,
    row: application({
      application_id: 'app_curriculum_flow',
      service_dependencies: ['central_vehicle_tracking']
    }),
    hasPermissions: () => true
  });
  assert.deepEqual(result, { allowed: false, reason: 'OPERATION_NOT_SUPPORTED' });
});

test('usage metering records tenant-scoped consumption in production.shared_service_usage_metrics', async () => {
  const tenantPrincipal = principal(tenantId);
  const authorized = createAuthorizedPrincipal({
    tenant: tenantPrincipal,
    userId,
    sessionId,
    grants: [{ roleCode: 'tenant_admin', permissions: ['shared.curriculum.consume'], scopes: [] }]
  });
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const pool = fakePool((text, values) => {
    queries.push({ text, values });
    return { rows: [], rowCount: 1 };
  });

  await new SharedServiceAuthorizationRepository(pool).recordUsage({
    tenant: tenantPrincipal,
    principal: authorized,
    serviceId: 'central_curriculum',
    applicationInstanceId: instanceId,
    entitlementId: application().entitlement_id!,
    operation: 'curriculum.subjects.list',
    endpoint: 'GET /api/v1/shared/curriculum/subjects',
    callerKind: 'tenant_user',
    httpStatus: 200,
    units: 1
  });

  const insert = queries.find(q => q.text.includes('INSERT INTO production.shared_service_usage_metrics'));
  assert.ok(insert);
  assert.equal(insert.values?.[0], tenantId);
  assert.equal(insert.values?.[1], instanceId);
  assert.equal(insert.values?.[3], 'central_curriculum');
  assert.equal(insert.values?.[9], 200);
});

test('cross-tenant application IDs cannot be resolved outside the signed tenant transaction', async () => {
  const tenantPrincipal = principal(tenantId);
  const authorized = createAuthorizedPrincipal({
    tenant: tenantPrincipal,
    userId,
    sessionId,
    grants: [{ roleCode: 'tenant_admin', permissions: [permission], scopes: [] }]
  });
  const seen: Array<{ text: string; values?: unknown[] }> = [];
  const pool = fakePool((text, values) => {
    seen.push({ text, values });
    if (text.includes('FROM production.application_instances instance')) return { rows: [] };
    return { rows: [], rowCount: 1 };
  });
  const decision = await new SharedServiceAuthorizationRepository(pool).evaluate({
    tenant: tenantPrincipal,
    principal: authorized,
    serviceId: 'central_curriculum',
    operation: 'discover',
    applicationInstanceId: instanceId
  });
  assert.deepEqual(decision, { allowed: false, reason: 'INVALID_APPLICATION_INSTANCE' });
  const lookup = seen.find(query => query.text.includes('FROM production.application_instances instance'));
  assert.equal(lookup?.values?.[0], tenantId);
  assert.match(lookup?.text || '', /WHERE instance\.tenant_id = \$1 AND instance\.id = \$2/);
  assert.ok(seen.some(query => query.text.includes("shared_service_access_evaluated")));
});

test('authorization fails closed when the tenant database is unavailable', async () => {
  const tenantPrincipal = principal(tenantId);
  const authorized = createAuthorizedPrincipal({
    tenant: tenantPrincipal,
    userId,
    sessionId,
    grants: [{ roleCode: 'tenant_admin', permissions: [permission], scopes: [] }]
  });
  const pool = fakePool(text => {
    if (text.includes('FROM production.application_instances instance')) {
      return new Error('database unavailable');
    }
    return { rows: [], rowCount: 1 };
  });
  await assert.rejects(() => new SharedServiceAuthorizationRepository(pool).evaluate({
    tenant: tenantPrincipal,
    principal: authorized,
    serviceId: 'central_curriculum',
    operation: 'discover',
    applicationInstanceId: instanceId
  }), /database unavailable/);
});

test('invalid signed tenant identity and internal service credentials fail closed', async () => {
  const middleware = createAuthorizationMiddleware({
    verifyToken: () => ({
      valid: true,
      context: {
        tenantId: 'not-a-tenant',
        userId,
        sessionId,
        role: 'tenant_admin'
      } as never
    }),
    signingConfigured: () => true,
    authorization: () => ({
      authorize: async () => { throw new Error('must not authorize invalid tenant'); }
    }),
    internalServiceKey: () => 'a-strong-internal-service-key-with-more-than-32-characters'
  });
  const response: { status?: number; nexted: boolean } = { nexted: false };
  const req = { headers: { authorization: 'Bearer token' } } as never;
  await new Promise<void>(resolve => {
    const responseWithDone = {
      status(code: number) { response.status = code; return this; },
      json() { resolve(); return this; }
    } as never;
    middleware.activeMembership(req, responseWithDone, () => {
      response.nexted = true;
      resolve();
    });
  });
  assert.equal(response.status, 403);
  assert.equal(response.nexted, false);

  const internal = middleware.internalService;
  const internalResponse: { status?: number; nexted: boolean } = { nexted: false };
  const internalReq = { headers: { 'x-internal-service-key': 'wrong' } } as never;
  const internalRes = {
    status(code: number) { internalResponse.status = code; return this; },
    json() { return this; }
  } as never;
  await new Promise<void>(resolve => {
    const responseWithDone = {
      status(code: number) { internalResponse.status = code; return this; },
      json() { resolve(); return this; }
    } as never;
    internal(internalReq, responseWithDone, () => {
      internalResponse.nexted = true;
      resolve();
    });
  });
  assert.equal(internalResponse.status, 401);
  assert.equal(internalResponse.nexted, false);

  const validKey = 'a-strong-internal-service-key-with-more-than-32-characters';
  const validResponse: { status?: number; nexted: boolean } = { nexted: false };
  await new Promise<void>(resolve => internal(
    { headers: { 'x-internal-service-key': validKey } } as never,
    {
      status(code: number) { validResponse.status = code; return this; },
      json() { resolve(); return this; }
    } as never,
    () => {
      validResponse.nexted = true;
      resolve();
    }
  ));
  assert.equal(validResponse.nexted, true);
});

test('internal shared-service callers must pass internal authentication and tenant authentication', () => {
  const calls: string[] = [];
  const req = { headers: { 'x-internal-service-key': 'configured-key' } } as never;
  const res = {} as never;
  authenticateSharedServiceCaller(req, res, () => calls.push('route'), {
    internalService: (_req, _res, next) => {
      calls.push('internal');
      next();
    },
    tenantUser: (_req, _res, next) => {
      calls.push('tenant');
      next();
    }
  });
  assert.deepEqual(calls, ['internal', 'tenant', 'route']);
});
