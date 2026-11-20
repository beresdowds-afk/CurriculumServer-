import { createSign } from 'node:crypto';
import type { GoogleAccessTokenProvider } from './googleLogisticsStorageAdapters';

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type ServiceAccountCredentials = {
  type?: unknown;
  client_email?: unknown;
  private_key?: unknown;
  token_uri?: unknown;
};

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const METADATA_TOKEN_URI =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class GooglePlatformAccessTokenProvider implements GoogleAccessTokenProvider {
  private cached?: { token: string; expiresAt: number };

  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetcher: Fetch = fetch,
    private readonly now: () => number = Date.now
  ) {}

  async getAccessToken(input: {
    tenantId: string;
    schoolId: string;
    provider: 'google_drive' | 'google_cloud_storage';
  }): Promise<string> {
    if (input.provider !== 'google_cloud_storage' ||
        !UUID.test(input.tenantId) || !UUID.test(input.schoolId)) {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    if (this.cached && this.cached.expiresAt > this.now() + 60_000) {
      return this.cached.token;
    }

    const credentials = this.serviceAccount();
    const response = credentials
      ? await this.fetcher(TOKEN_URI, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: this.createAssertion(credentials)
          }),
          signal: AbortSignal.timeout(10_000)
        })
      : await this.fetcher(METADATA_TOKEN_URI, {
          headers: { 'Metadata-Flavor': 'Google' },
          signal: AbortSignal.timeout(5_000)
        });

    if (!response.ok) throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    const body = data as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== 'string' || !body.access_token.trim() ||
        !Number.isInteger(body.expires_in) || (body.expires_in as number) < 60 ||
        (body.expires_in as number) > 3600) {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    this.cached = {
      token: body.access_token,
      expiresAt: this.now() + (body.expires_in as number) * 1000
    };
    return this.cached.token;
  }

  private serviceAccount(): ServiceAccountCredentials | null {
    const raw = this.env.GOOGLE_STORAGE_SERVICE_ACCOUNT_JSON;
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    const credentials = parsed as ServiceAccountCredentials;
    if (credentials.type !== 'service_account' ||
        typeof credentials.client_email !== 'string' ||
        !/^[^\s@]+@[^\s@]+$/.test(credentials.client_email) ||
        typeof credentials.private_key !== 'string' ||
        !credentials.private_key.includes('-----BEGIN PRIVATE KEY-----') ||
        credentials.token_uri !== TOKEN_URI) {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
    return credentials;
  }

  private createAssertion(credentials: ServiceAccountCredentials): string {
    const issuedAt = Math.floor(this.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.full_control',
      aud: TOKEN_URI,
      iat: issuedAt,
      exp: issuedAt + 3600
    })).toString('base64url');
    const signingInput = `${header}.${payload}`;
    try {
      const signature = createSign('RSA-SHA256')
        .update(signingInput)
        .sign(credentials.private_key as string)
        .toString('base64url');
      return `${signingInput}.${signature}`;
    } catch {
      throw new Error('PLATFORM_CREDENTIALS_UNAVAILABLE');
    }
  }
}
