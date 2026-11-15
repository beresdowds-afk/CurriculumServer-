import assert from 'node:assert/strict';
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
    assert.equal(ServerTenantTokenService.verifyTenantToken(`${token.slice(0, -1)}0`).valid, false);

    const expired = ServerTenantTokenService.issueTenantToken(tenant, 'tenant_admin', -1);
    assert.match(ServerTenantTokenService.verifyTenantToken(expired).error || '', /expired/i);
  });
});
