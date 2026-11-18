import { createPublicKey, verify as verifySignature } from 'node:crypto';

interface GoogleSigningKey {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
}

interface GoogleTokenClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean;
}

export interface GoogleServiceIdentity {
  email: string;
  audience: string;
  subject: string;
}

let signingKeys: GoogleSigningKey[] = [];
let signingKeysExpireAt = 0;

async function loadGoogleSigningKeys(forceRefresh = false): Promise<GoogleSigningKey[]> {
  if (!forceRefresh && signingKeys.length > 0 && Date.now() < signingKeysExpireAt) {
    return signingKeys;
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) throw new Error('Google service identity keys are unavailable.');
  const body = await response.json() as { keys?: GoogleSigningKey[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error('Google service identity keys are invalid.');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] || 300);
  signingKeys = body.keys;
  signingKeysExpireAt = Date.now() + Math.max(60, Math.min(maxAge, 3600)) * 1000;
  return signingKeys;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

export async function verifyGoogleServiceIdentityToken(
  token: string,
  expectedAudience: string
): Promise<GoogleServiceIdentity | undefined> {
  if (!expectedAudience || token.length > 16_384) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !part)) return undefined;
  let header: { alg?: string; kid?: string };
  let claims: GoogleTokenClaims;
  try {
    header = decodeSegment(parts[0]);
    claims = decodeSegment(parts[1]);
  } catch {
    return undefined;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      typeof claims.sub !== 'string' || typeof claims.email !== 'string' ||
      claims.email_verified !== true ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss || '') ||
      claims.aud !== expectedAudience ||
      !Number.isInteger(claims.exp) || !Number.isInteger(claims.iat)) {
    return undefined;
  }
  const now = Math.floor(Date.now() / 1000);
  if ((claims.exp as number) <= now ||
      (claims.iat as number) > now + 60 ||
      (claims.exp as number) - (claims.iat as number) > 3600 ||
      (typeof claims.nbf === 'number' && claims.nbf > now + 60)) {
    return undefined;
  }

  let keys = await loadGoogleSigningKeys();
  let key = keys.find(candidate => candidate.kid === header.kid);
  if (!key) {
    keys = await loadGoogleSigningKeys(true);
    key = keys.find(candidate => candidate.kid === header.kid);
  }
  if (!key || key.kty !== 'RSA' || (key.alg && key.alg !== 'RS256') || !key.n || !key.e) {
    return undefined;
  }

  let signatureValid = false;
  try {
    const publicJwk = { kty: key.kty || 'RSA', n: key.n, e: key.e };
    signatureValid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key: publicJwk, format: 'jwk' }),
      Buffer.from(parts[2], 'base64url')
    );
  } catch {
    return undefined;
  }
  if (!signatureValid) return undefined;
  return { email: claims.email, audience: expectedAudience, subject: claims.sub };
}
