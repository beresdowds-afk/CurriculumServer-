import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { GooglePlatformAccessTokenProvider } from './googlePlatformAccessTokenProvider';

const tenantId = '9f41d0eb-4bc4-4f82-a72f-951b8a8bbfb8';
const schoolId = 'c63f1b3d-6914-4c98-aa1e-a7f94af617da';

test('service-account credentials mint a cached Google Storage token without logging key material', async () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  let requests = 0;
  const provider = new GooglePlatformAccessTokenProvider({
    GOOGLE_STORAGE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      type: 'service_account',
      client_email: 'storage@example.iam.gserviceaccount.com',
      private_key: privateKey,
      token_uri: 'https://oauth2.googleapis.com/token'
    })
  }, async (url, init) => {
    requests += 1;
    assert.equal(String(url), 'https://oauth2.googleapis.com/token');
    assert.equal(init?.method, 'POST');
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    assert.equal(body.get('assertion')?.split('.').length, 3);
    return Response.json({ access_token: 'verified-access-token', expires_in: 3600 });
  });

  const first = await provider.getAccessToken({ tenantId, schoolId, provider: 'google_cloud_storage' });
  const second = await provider.getAccessToken({ tenantId, schoolId, provider: 'google_cloud_storage' });
  assert.equal(first, 'verified-access-token');
  assert.equal(second, first);
  assert.equal(requests, 1);
});

test('provider rejects drive requests and malformed service-account credentials', async () => {
  const fetcher = async () => {
    throw new Error('must not fetch');
  };
  const provider = new GooglePlatformAccessTokenProvider({
    GOOGLE_STORAGE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account' })
  }, fetcher);

  await assert.rejects(
    provider.getAccessToken({ tenantId, schoolId, provider: 'google_drive' }),
    /PLATFORM_CREDENTIALS_UNAVAILABLE/
  );
  await assert.rejects(
    provider.getAccessToken({ tenantId, schoolId, provider: 'google_cloud_storage' }),
    /PLATFORM_CREDENTIALS_UNAVAILABLE/
  );
});
