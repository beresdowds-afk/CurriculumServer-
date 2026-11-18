import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import type { TenantSchoolApp } from '../src/types';
import { ServerTenantTokenService } from './tenantTokenService';

const tenant = {
  id: 'tenant-test',
  appId: 'app_curriculum_flow',
  schoolName: 'Token Test School',
  subscriptionTier: 'standard',
  status: 'active'
} as unknown as TenantSchoolApp;

function withSecret<T>(secret: string, operation: () => T): T {
  const previous = process.env.CONTROL_PLANE_SECRET;
  process.env.CONTROL_PLANE_SECRET = secret;
  try {
    return operation();
  } finally {
    if (previous === undefined) delete process.env.CONTROL_PLANE_SECRET;
    else process.env.CONTROL_PLANE_SECRET = previous;
  }
}

test('server tenant tokens require a configured secret and verify signature and expiry', () => {
  assert.throws(() => withSecret('dev_insecure_fallback_secret_curriculum_server_2026_secure', () =>
    ServerTenantTokenService.issueTenantToken(tenant)
  ), /not configured/);

  withSecret('server-token-test-secret-at-least-32-characters', () => {
    const token = ServerTenantTokenService.issueTenantToken(tenant, 'tenant_admin', 3600, 'admin@test.invalid', 'user-1');
    const verified = ServerTenantTokenService.verifyTenantToken(token);
    assert.equal(verified.valid, true);
    assert.equal(verified.context?.tenantId, tenant.id);
    assert.equal(verified.context?.role, 'tenant_admin');
    assert.equal(verified.context?.userId, 'user-1');
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
    assert.equal(ServerTenantTokenService.verifyTenantToken(tamperedToken).valid, false);

    const expired = ServerTenantTokenService.issueTenantToken(tenant, 'tenant_admin', -1);
    assert.match(ServerTenantTokenService.verifyTenantToken(expired).error || '', /expired/i);
  });
});

test('platform tokens are allowlisted, canonical, short-lived, and separate from tenant roles', () => {
  const previousSecret = process.env.CONTROL_PLANE_SECRET;
  const previousAdmins = process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
  const secret = 'platform-token-test-secret-at-least-32-characters';
  const email = 'admin@test.invalid';
  process.env.CONTROL_PLANE_SECRET = secret;
  process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
    [email]: 'platform-login-key-at-least-32-characters-long'
  });
  try {
    assert.throws(() => ServerTenantTokenService.issueTenantToken(tenant, 'super_admin'), /tenant role and tenant identity/i);
    assert.throws(() => ServerTenantTokenService.issueTenantToken(tenant, 'principal'), /tenant role and tenant identity/i);
    assert.throws(() => ServerTenantTokenService.issueTenantToken({
      ...tenant,
      id: 'platform-control-plane'
    }), /tenant role and tenant identity/i);

    const token = ServerTenantTokenService.issuePlatformAdminToken(email);
    const verified = ServerTenantTokenService.verifyTenantToken(token);
    assert.equal(verified.valid, true);
    assert.equal(verified.context?.tenantId, 'platform-control-plane');
    assert.equal(verified.context?.role, 'super_admin');
    assert.equal(verified.context?.audience, 'platform-control-plane');

    const now = Date.now;
    Date.now = () => now() + 3601 * 1000;
    try {
      assert.match(ServerTenantTokenService.verifyTenantToken(token).error || '', /expired/i);
    } finally {
      Date.now = now;
    }

    process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = '{}';
    assert.equal(ServerTenantTokenService.verifyTenantToken(token).valid, true, 'signature verification is distinct from current allowlist authorization');
    assert.throws(() => ServerTenantTokenService.issuePlatformAdminToken(email), /not allowlisted/i);
    process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = JSON.stringify({
      [email]: 'platform-login-key-at-least-32-characters-long'
    });

    const forgedTenantPayload = Buffer.from(JSON.stringify({
      tenantId: tenant.id,
      audience: tenant.id,
      issuer: 'CurriculumServer-ControlPlane',
      role: 'super_admin',
      email,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60
    })).toString('base64');
    const signature = createHmac('sha256', secret).update(forgedTenantPayload).digest('hex');
    const forgedTenantPlatformToken = `${forgedTenantPayload}.${signature}`;
    assert.equal(ServerTenantTokenService.verifyTenantToken(forgedTenantPlatformToken).valid, false);
  } finally {
    if (previousSecret === undefined) delete process.env.CONTROL_PLANE_SECRET;
    else process.env.CONTROL_PLANE_SECRET = previousSecret;
    if (previousAdmins === undefined) delete process.env.PLATFORM_ADMIN_CREDENTIALS_JSON;
    else process.env.PLATFORM_ADMIN_CREDENTIALS_JSON = previousAdmins;
  }
});
