import assert from 'node:assert/strict';
import { generateKeyPairSync, sign as signBytes } from 'node:crypto';
import test from 'node:test';
import { verifyGoogleServiceIdentityToken } from './googleServiceIdentity';

test('Google service identity tokens require Google signature, configured audience, and live verified claims', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  const kid = `test-${Date.now()}`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    keys: [{ kid, kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256' }]
  }), { headers: { 'cache-control': 'public, max-age=300' } });

  const makeToken = (overrides: Record<string, unknown> = {}) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: 'https://curriculum.example/internal',
      exp: Math.floor(Date.now() / 1000) + 60,
      iat: Math.floor(Date.now() / 1000),
      sub: 'service-subject',
      email: 'worker@project.iam.gserviceaccount.com',
      email_verified: true,
      ...overrides
    })).toString('base64url');
    const input = `${header}.${claims}`;
    return `${input}.${signBytes('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  };

  try {
    const verified = await verifyGoogleServiceIdentityToken(makeToken(), 'https://curriculum.example/internal');
    assert.deepEqual(verified, {
      email: 'worker@project.iam.gserviceaccount.com',
      audience: 'https://curriculum.example/internal',
      subject: 'service-subject'
    });
    assert.equal(await verifyGoogleServiceIdentityToken(makeToken(), 'https://other.example/internal'), undefined);
    assert.equal(await verifyGoogleServiceIdentityToken(makeToken({ exp: 1 }), 'https://curriculum.example/internal'), undefined);
    const [header, claims, signature] = makeToken().split('.');
    assert.equal(
      await verifyGoogleServiceIdentityToken(
        `${header}.${claims}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`,
        'https://curriculum.example/internal'
      ),
      undefined
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
