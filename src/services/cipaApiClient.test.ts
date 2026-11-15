import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CipaApiClient, getCipaApiErrorMessage } from './cipaApiClient';
import { unifiedApiClient } from './unifiedApiClient';
import { customerOnboardingClient } from './customerOnboardingClient';
import { cipaAgentService } from '../../server/cipaAgentService';

describe('CIPA control-plane client', () => {
  it('rejects unauthenticated control-plane requests before calling the network', async () => {
    unifiedApiClient.clearTokens();
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    }) as typeof fetch;
    try {
      await assert.rejects(
        new CipaApiClient().getRequests(),
        (error: { status?: number }) => error.status === 401
      );
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not create a local onboarding success record when the API is unavailable', async () => {
    unifiedApiClient.clearTokens();
    const before = customerOnboardingClient.getInstances().length;
    await assert.rejects(
      customerOnboardingClient.submitInstanceRequest({
        instanceType: 'full_school_management',
        organization: {
          organizationName: 'Unavailable School',
          registrationNumber: 'UNAVAILABLE',
          organizationType: 'educational_institution',
          contactPersonName: 'Test',
          contactEmail: 'requester@example.test',
          contactPhone: '+10000000000',
          address: 'Test',
          state: 'Test',
          lga: 'Test',
          country: 'Test'
        },
        selectedModules: [],
        deploymentTarget: 'shared_application_infrastructure',
        subdomain: 'unavailable-school',
        billingModel: 'monthly',
        monthlyPriceNGN: 100,
        paymentProvider: 'paystack',
        paymentReference: 'test-reference',
        amountPaidNGN: 100
      }),
      (error: { status?: number }) => error.status === 401
    );
    assert.equal(customerOnboardingClient.getInstances().length, before);
  });

  it('surfaces 401, 403, 503 and network failures to the UI', () => {
    assert.match(getCipaApiErrorMessage({ status: 401 }), /Sign in/);
    assert.match(getCipaApiErrorMessage({ status: 403 }), /not authorized/);
    assert.match(getCipaApiErrorMessage({ status: 503, error: 'PIAM is unavailable.' }), /PIAM is unavailable/);
    assert.match(getCipaApiErrorMessage({ status: 0 }), /could not reach the server/);
  });

  it('does not expose an approval method or accept client approver identity', async () => {
    const request = cipaAgentService.getAllRequests()[0];
    assert.ok(request);
    const before = request.piamApprovalStatus;
    assert.throws(
      () => cipaAgentService.piamApprovalAction(request.requestId, 'approve', 'attacker@example.test', 'approve'),
      /PIAM_UNAVAILABLE/
    );
    assert.equal(request.piamApprovalStatus, before);
    assert.equal(request.approverEmail, undefined);
  });

  it('submits only a request prompt and never an approver identity', async () => {
    let sentBody = '';
    const requester = {
      async requestAuthenticatedControlPlane<T>(_endpoint: string, options: RequestInit = {}): Promise<T> {
        sentBody = String(options.body);
        return { success: true, data: {} } as T;
      }
    };
    const client = new CipaApiClient(requester);
    await client.createRequest('Review this customer request');
    assert.deepEqual(JSON.parse(sentBody), { prompt: 'Review this customer request' });
  });

  it('strips client-controlled tenant and role headers from authenticated requests', async () => {
    const tokenPayload = Buffer.from(JSON.stringify({
      tenantId: 'tenant-a',
      role: 'super_admin',
      expiresAt: Math.floor(Date.now() / 1000) + 60
    })).toString('base64url');
    unifiedApiClient.setControlPlaneToken(`${tokenPayload}.test-signature`);
    const originalFetch = globalThis.fetch;
    let capturedHeaders: Headers | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch;
    try {
      await unifiedApiClient.requestAuthenticatedControlPlane('/api/v1/agent/requests', {
        method: 'GET',
        headers: { 'X-Tenant-ID': 'tenant-b', 'X-User-Role': 'super_admin' }
      });
      assert.equal(capturedHeaders?.get('X-Tenant-ID'), null);
      assert.equal(capturedHeaders?.get('X-User-Role'), null);
      assert.equal(capturedHeaders?.get('Authorization'), `Bearer ${tokenPayload}.test-signature`);
    } finally {
      unifiedApiClient.clearTokens();
      globalThis.fetch = originalFetch;
    }
  });
});
