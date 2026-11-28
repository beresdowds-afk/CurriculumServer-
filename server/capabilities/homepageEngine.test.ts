import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import express from 'express';
import type { TenantSchoolApp } from '../../src/types';
import { createApiCapabilityGateMiddleware } from './productionCapabilityMiddleware';
import { evaluateProductionCapabilityGate } from './productionCapabilityRegistry';
import { createHomepageRouter } from '../homepageRoutes';
import { homepageEngineManager } from '../homepageEngineManager';
import { ServerTenantTokenService } from '../tenantTokenService';
import { INITIAL_PROVISIONED_TENANTS } from '../../src/mockCurriculumServerData';

const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_FILES = [
  path.join(DATA_DIR, 'platform_footers.json'),
  path.join(DATA_DIR, 'homepage_configurations.json'),
  path.join(DATA_DIR, 'homepage_versions.json'),
  path.join(DATA_DIR, 'homepage_audit_logs.json')
];

const fileSnapshots = new Map<string, string | null>();
let previousSecret: string | undefined;
let previousAdmins: string | undefined;
let server: ReturnType<express.Express['listen']>;
let baseUrl = '';

const TEST_SECRET = 'homepage-engine-test-secret-at-least-32-chars';
const PLATFORM_ADMIN_EMAIL = 'platform-admin@curriculumserver.test';

const greenfieldTenant: TenantSchoolApp = INITIAL_PROVISIONED_TENANTS[0];
const otherTenant: TenantSchoolApp = INITIAL_PROVISIONED_TENANTS[1] || ({
  ...INITIAL_PROVISIONED_TENANTS[0],
  id: 'tenant_other_school',
  schoolSlug: 'other-school',
  schoolName: 'Other Academy'
} as TenantSchoolApp);

before(async () => {
  for (const filePath of SNAPSHOT_FILES) {
    fileSnapshots.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null);
  }
  previousSecret = process.env.CONTROL_PLANE_SECRET;
  previousAdmins = process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
  process.env.CONTROL_PLANE_SECRET = TEST_SECRET;
  process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
    [PLATFORM_ADMIN_EMAIL]: 'super-admin-password-at-least-32-characters'
  });

  const app = express();
  app.use(express.json());
  app.use('/api', createApiCapabilityGateMiddleware());
  app.use('/api/v1', createHomepageRouter({ manager: homepageEngineManager }));

  await new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  for (const [filePath, contents] of fileSnapshots.entries()) {
    if (contents === null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, contents, 'utf8');
    }
  }
  if (previousSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
  else process.env.CONTROL_PLANE_SECRET = previousSecret;
  if (previousAdmins === undefined) delete process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
  else process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = previousAdmins;
});

test('landing page discovery and administration routes pass capability gate cleanly without blocking', () => {
  const publicRoutes: Array<[string, string]> = [
    ['GET', '/homepage/templates'],
    ['GET', '/homepage/resolve'],
    ['GET', '/homepage/instances'],
    ['GET', `/homepage/instance/${greenfieldTenant.id}`],
    ['GET', '/landing-footer/curriculum_server'],
    ['GET', '/landing-footer/curriculum_flow']
  ];
  for (const [method, routePath] of publicRoutes) {
    const decision = evaluateProductionCapabilityGate(method, routePath);
    assert.equal(decision.allowed, true, `Expected ${method} ${routePath} to be allowed`);
    if (decision.allowed) {
      assert.equal(decision.capabilityId, 'landing_page_public_discovery');
    }
  }

  const adminRoutes: Array<[string, string]> = [
    ['GET', '/server/homepage-instances'],
    ['GET', `/server/homepage/${greenfieldTenant.id}`],
    ['PUT', `/server/homepage/${greenfieldTenant.id}/draft`],
    ['PATCH', `/server/homepage/${greenfieldTenant.id}/footer`],
    ['POST', `/server/homepage/${greenfieldTenant.id}/publish`],
    ['POST', `/server/homepage/${greenfieldTenant.id}/rollback`],
    ['PUT', '/server/landing-footer/curriculum_server'],
    ['PUT', '/server/landing-footer/curriculum_flow']
  ];
  for (const [method, routePath] of adminRoutes) {
    const decision = evaluateProductionCapabilityGate(method, routePath);
    assert.equal(decision.allowed, true, `Expected ${method} ${routePath} to be allowed`);
    if (decision.allowed) {
      assert.equal(decision.capabilityId, 'landing_page_and_footer_administration');
    }
  }

  const blocked = evaluateProductionCapabilityGate('DELETE', `/server/homepage/${greenfieldTenant.id}`);
  assert.equal(blocked.allowed, false);
});

test('Edit Footer updates Curriculum Server and Curriculum Flow landing footers with RBAC and validation', async () => {
  const superAdminToken = ServerTenantTokenService.issuePlatformAdminToken(PLATFORM_ADMIN_EMAIL);
  const principalToken = ServerTenantTokenService.issueTenantToken(greenfieldTenant, 'principal', 3600, 'principal@greenfield.edu.ng', 'usr-p');
  const studentToken = ServerTenantTokenService.issueTenantToken(greenfieldTenant, 'student', 3600, 'student@greenfield.edu.ng', 'usr-s');

  // Unauthenticated mutation fails closed
  const unauthRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_server`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      copyrightText: '© 2026 Hack',
      institutionalAddress: 'Nowhere',
      email: 'bad@example.com',
      phoneNumber: '+2348000000000'
    })
  });
  assert.equal(unauthRes.status, 401);

  // Principal cannot edit Curriculum Server platform footer
  const principalOnServerRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_server`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${principalToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2026 Test',
      institutionalAddress: '10 Marina Road, Lagos',
      email: 'ops@school.edu.ng',
      phoneNumber: '+2348012345678'
    })
  });
  assert.equal(principalOnServerRes.status, 403);

  // Super Admin updates Curriculum Server footer -> persisted and live on GET
  const serverUpdateRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_server`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2027 CURRICULUM SERVER Sovereign Cloud. All rights reserved.',
      institutionalAddress: 'Plot 88 Diplomatic Way, Central Business District, Abuja',
      email: 'sovereign@curriculumserver.ng',
      phoneNumber: '+234 909 555 0101'
    })
  });
  assert.equal(serverUpdateRes.status, 200);

  const serverGetRes = await fetch(`${baseUrl}/api/v1/landing-footer/curriculum_server`);
  assert.equal(serverGetRes.status, 200);
  const serverGetJson = await serverGetRes.json();
  assert.equal(serverGetJson.data.copyrightText, '© 2027 CURRICULUM SERVER Sovereign Cloud. All rights reserved.');
  assert.equal(serverGetJson.data.institutionalAddress, 'Plot 88 Diplomatic Way, Central Business District, Abuja');
  assert.equal(serverGetJson.data.email, 'sovereign@curriculumserver.ng');
  assert.equal(serverGetJson.data.phoneNumber, '+234 909 555 0101');

  // Student cannot edit Curriculum Flow footer
  const studentOnFlowRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_flow`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2026 Student',
      institutionalAddress: 'Campus',
      email: 'student@school.edu.ng',
      phoneNumber: '+2348011111111'
    })
  });
  assert.equal(studentOnFlowRes.status, 403);

  // Invalid email rejected
  const invalidEmailRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_flow`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${principalToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2026 Curriculum Flow',
      institutionalAddress: 'Lagos Campus',
      email: 'not-an-email',
      phoneNumber: '+2348011111111'
    })
  });
  assert.equal(invalidEmailRes.status, 400);

  // Principal updates Curriculum Flow footer -> live on GET
  const flowUpdateRes = await fetch(`${baseUrl}/api/v1/server/landing-footer/curriculum_flow`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${principalToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2027 CURRICULUM FLOW School OS. All rights reserved.',
      institutionalAddress: '25 Adeola Odeku Street, Victoria Island, Lagos',
      email: 'desk@curriculumflow.ng',
      phoneNumber: '+234 803 777 4400'
    })
  });
  assert.equal(flowUpdateRes.status, 200);

  const flowGetRes = await fetch(`${baseUrl}/api/v1/landing-footer/curriculum_flow`);
  const flowGetJson = await flowGetRes.json();
  assert.equal(flowGetJson.data.email, 'desk@curriculumflow.ng');
  assert.equal(flowGetJson.data.phoneNumber, '+234 803 777 4400');
});

test('Provisioned instances auto-bootstrap for landing page editor and enforce cross-tenant isolation on footer updates', async () => {
  const superAdminToken = ServerTenantTokenService.issuePlatformAdminToken(PLATFORM_ADMIN_EMAIL);
  const greenfieldAdminToken = ServerTenantTokenService.issueTenantToken(
    greenfieldTenant,
    'tenant_admin',
    3600,
    'admin@greenfield.edu.ng',
    'usr-gf-admin'
  );

  // Generator fleet endpoint returns all provisioned instances
  const fleetRes = await fetch(`${baseUrl}/api/v1/homepage/instances`);
  assert.equal(fleetRes.status, 200);
  const fleetJson = await fleetRes.json();
  assert.ok(Array.isArray(fleetJson.data));
  assert.ok(fleetJson.data.some((inst: any) => inst.instanceId === greenfieldTenant.id));
  assert.ok(fleetJson.data.some((inst: any) => inst.instanceId === otherTenant.id));

  // Admin homepage-instances scopes tenant_admin to own tenant, super_admin sees all
  const scopedAdminListRes = await fetch(`${baseUrl}/api/v1/server/homepage-instances`, {
    headers: { Authorization: `Bearer ${greenfieldAdminToken}` }
  });
  assert.equal(scopedAdminListRes.status, 200);
  const scopedAdminList = await scopedAdminListRes.json();
  assert.equal(scopedAdminList.data.length, 1);
  assert.equal(scopedAdminList.data[0].instanceId, greenfieldTenant.id);

  const superAdminListRes = await fetch(`${baseUrl}/api/v1/server/homepage-instances`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  const superAdminList = await superAdminListRes.json();
  assert.ok(superAdminList.data.length >= 2);

  // Cross-tenant edit fails closed
  const crossTenantRes = await fetch(`${baseUrl}/api/v1/server/homepage/${otherTenant.id}/footer`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${greenfieldAdminToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2027 Tamper',
      institutionalAddress: 'Cross Tenant Street',
      email: 'tamper@other.edu.ng',
      phoneNumber: '+2348099999999'
    })
  });
  assert.equal(crossTenantRes.status, 403);

  // Own tenant admin updates instance footer and changes go live immediately
  const patchRes = await fetch(`${baseUrl}/api/v1/server/homepage/${greenfieldTenant.id}/footer`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${greenfieldAdminToken}`
    },
    body: JSON.stringify({
      copyrightText: '© 2027 Greenfield Academy. Verified Live Copyright.',
      institutionalAddress: '12 Kingsway Road, Ikoyi, Lagos',
      email: 'live-desk@greenfield.edu.ng',
      phoneNumber: '+234 805 444 9090'
    })
  });
  assert.equal(patchRes.status, 200);

  const publicRes = await fetch(`${baseUrl}/api/v1/homepage/instance/${greenfieldTenant.id}`);
  assert.equal(publicRes.status, 200);
  const publicJson = await publicRes.json();
  assert.equal(publicJson.data.contact.copyrightText, '© 2027 Greenfield Academy. Verified Live Copyright.');
  assert.equal(publicJson.data.contact.addressText, '12 Kingsway Road, Ikoyi, Lagos');
  assert.equal(publicJson.data.contact.city, '');
  assert.equal(publicJson.data.contact.state, '');
  assert.equal(publicJson.data.contact.primaryEmail, 'live-desk@greenfield.edu.ng');
  assert.equal(publicJson.data.contact.primaryPhone, '+234 805 444 9090');
});
