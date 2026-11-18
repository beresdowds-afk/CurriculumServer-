import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { principal } from '../db/testSupport';
import { createAuthorizedPrincipal, type RoleGrant } from './authorizedPrincipal';
import { createAuthorizationMiddleware } from './middleware';
import { createSchoolAdministrationGuards } from './schoolAdministrationGuards';
import { PERMISSIONS } from './permissions';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';

const tenantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';
const studentId = '44444444-4444-4444-8444-444444444444';
const otherId = '55555555-5555-4555-8555-555555555555';
const classId = '66666666-6666-4666-8666-666666666666';

async function withServer(app: express.Express, run: (url: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP listener unavailable');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('school routes enforce current permissions and exact resource scopes', async () => {
  const grantMap: Record<string, RoleGrant[]> = {
    read: [{ roleCode: 'staff', permissions: [PERMISSIONS.studentsRead], scopes: [] }],
    scoped: [{
      roleCode: 'staff', permissions: [PERMISSIONS.studentsUpdate],
      scopes: [{ resourceType: 'student', resourceId: studentId }]
    }],
    lifecycle: [{
      roleCode: 'staff', permissions: [PERMISSIONS.studentLifecycleManage, PERMISSIONS.studentsAdmit],
      scopes: [{ resourceType: 'student', resourceId: studentId }]
    }],
    promote: [
      { roleCode: 'staff', permissions: [PERMISSIONS.studentsPromote], scopes: [{ resourceType: 'student', resourceId: studentId }] },
      { roleCode: 'staff', permissions: [PERMISSIONS.classesUpdate], scopes: [{ resourceType: 'class', resourceId: classId }] }
    ],
    scopedRead: [{ roleCode: 'staff', permissions: [PERMISSIONS.studentsRead], scopes: [{ resourceType: 'student', resourceId: studentId }] }],
    staff: [{ roleCode: 'staff', permissions: [PERMISSIONS.staffRead, PERMISSIONS.staffUpdate], scopes: [{ resourceType: 'staff', resourceId: studentId }] }]
  };
  let token = '';
  const auth = createAuthorizationMiddleware({
    signingConfigured: () => true,
    verifyToken: value => {
      token = value;
      return {
        valid: true,
        context: {
          tenantId, userId, sessionId, role: 'tenant_admin', appId: 'test', schoolName: 'test',
          subscriptionTier: 'test', status: 'ACTIVE', databaseName: 'test', storageNamespace: '/test',
          issuer: 'test', audience: tenantId, issuedAt: 1, expiresAt: 2, tokenSignature: 'test',
          permissions: []
        }
      };
    },
    authorization: () => ({
      authorize: async tenant => ({
        ok: true,
        principal: createAuthorizedPrincipal({ tenant, userId, sessionId, grants: grantMap[token] || [] })
      })
    })
  });
  const guards = createSchoolAdministrationGuards(auth);
  const app = express();
  app.use(express.json());
  app.get('/students', guards.studentRead, (_req, res) => res.sendStatus(204));
  app.get('/students/:studentId', guards.studentRecordRead, (_req, res) => res.sendStatus(204));
  app.post('/students', guards.studentCreate, (_req, res) => res.sendStatus(204));
  app.patch('/students/:studentId', guards.studentUpdate, (_req, res) => res.sendStatus(204));
  app.post('/students/:studentId/lifecycle', guards.lifecycle, (_req, res) => res.sendStatus(204));
  app.post('/students/:studentId/class', guards.assignClass, (_req, res) => res.sendStatus(204));
  app.patch('/classes/:classId', guards.classUpdate, (_req, res) => res.sendStatus(204));
  app.get('/staff/:staffId', guards.staffRecordRead, (_req, res) => res.sendStatus(204));
  app.patch('/staff/:staffId', guards.staffUpdate, (_req, res) => res.sendStatus(204));

  await withServer(app, async base => {
    const request = async (path: string, method: string, credential?: string, body?: object) =>
      (await fetch(`${base}${path}`, {
        method,
        headers: {
          ...(credential ? { authorization: `Bearer ${credential}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      })).status;
    assert.equal(await request('/students', 'GET'), 401);
    assert.equal(await request('/students', 'GET', 'read'), 204);
    assert.equal(await request('/students', 'POST', 'read'), 403);
    assert.equal(await request(`/students/${studentId}`, 'GET', 'scopedRead'), 204);
    assert.equal(await request(`/students/${otherId}`, 'GET', 'scopedRead'), 403);
    assert.equal(await request(`/students/${studentId}`, 'PATCH', 'scoped'), 204);
    assert.equal(await request(`/students/${otherId}`, 'PATCH', 'scoped'), 403);
    assert.equal(await request(`/students/${studentId}/lifecycle`, 'POST', 'lifecycle', { type: 'admit' }), 204);
    assert.equal(await request(`/students/${studentId}/lifecycle`, 'POST', 'lifecycle', { type: 'graduate' }), 403);
    assert.equal(await request(`/students/${studentId}/class`, 'POST', 'promote', { operation: 'promote', classId }), 204);
    assert.equal(await request(`/students/${studentId}/class`, 'POST', 'promote', { operation: 'promote', classId: otherId }), 403);
    assert.equal(await request(`/classes/${classId}`, 'PATCH', 'read'), 403);
    assert.equal(await request(`/staff/${studentId}`, 'GET', 'read'), 403);
    assert.equal(await request(`/staff/${studentId}`, 'GET', 'staff'), 204);
    assert.equal(await request(`/staff/${otherId}`, 'PATCH', 'staff'), 403);
  });
});

test('capability gate precedes versioned, legacy, and AI route handlers', async () => {
  const app = express();
  app.use('/api', createApiCapabilityGateMiddleware());
  app.get('/api/health', (_req, res) => res.sendStatus(204));
  app.get('/api/v1/schools/me/staff', (_req, res) => res.sendStatus(204));
  app.get('/api/ai/v1/capabilities', (_req, res) => res.sendStatus(204));
  app.get('/api/shared/curriculum/discovery', (_req, res) => res.sendStatus(204));
  app.get('/api/v1/legacy/health', (_req, res) => res.sendStatus(204));
  await withServer(app, async base => {
    assert.equal((await fetch(`${base}/api/health`)).status, 204);
    for (const path of ['/api/v1/schools/me/staff', '/api/ai/v1/capabilities', '/api/shared/curriculum/discovery', '/api/v1/legacy/health']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 503, path);
      assert.equal((await response.json()).code, 'PRODUCTION_PERSISTENCE_UNAVAILABLE');
    }
  });
});
