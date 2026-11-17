import { createHmac } from 'node:crypto';
import type { TenantSecurityContext } from '../../src/services/tenantSecurityContext';
import type { DatabaseClient, DatabasePool } from './postgres';
import { inTransaction } from './postgres';

const trustedContext = Symbol('trusted-tenant-context');
const CONTEXT_TTL_SECONDS = 120;

export interface VerifiedTenantPrincipal {
  readonly [trustedContext]: true;
  readonly tenantId: string;
  readonly role: string;
  readonly email?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

interface DatabaseContext {
  version: 1;
  kind: 'tenant' | 'control_plane' | 'login' | 'invitation';
  tenantId: string;
  actor: string;
  sessionId: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}

function signingSecret(): string {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (secret.length < 32 ||
      secret === 'default_insecure_secret' ||
      secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure') {
    throw new Error('Secure database authorization context signing is not configured.');
  }
  return secret;
}

function signedContext(context: Omit<DatabaseContext, 'version' | 'issuedAt' | 'expiresAt'>): {
  payload: string;
  signature: string;
} {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    version: 1,
    ...context,
    issuedAt,
    expiresAt: issuedAt + CONTEXT_TTL_SECONDS
  } satisfies DatabaseContext);
  return {
    payload,
    signature: createHmac('sha256', signingSecret()).update(payload).digest('hex')
  };
}

async function setTenantContext(
  client: DatabaseClient,
  context: Omit<DatabaseContext, 'version' | 'issuedAt' | 'expiresAt'>
): Promise<void> {
  const signed = signedContext(context);
  await client.query(
    `SELECT set_config('app.tenant_id', $1, true),
            set_config('app.authorization_context', $2, true),
            set_config('app.authorization_context_signature', $3, true)`,
    [context.tenantId, signed.payload, signed.signature]
  );
}

export function createVerifiedTenantPrincipal(
  verification: { valid: boolean; context?: TenantSecurityContext }
): VerifiedTenantPrincipal {
  if (!verification.valid || !verification.context?.tenantId ||
      typeof verification.context.role !== 'string') {
    throw new Error('A verified tenant security context is required.');
  }
  return Object.freeze({
    [trustedContext]: true as const,
    tenantId: verification.context.tenantId,
    role: verification.context.role,
    email: verification.context.email,
    userId: verification.context.userId,
    sessionId: verification.context.sessionId
  });
}

function assertVerifiedPrincipal(principal: VerifiedTenantPrincipal): void {
  if (!principal || principal[trustedContext] !== true || !principal.tenantId.trim()) {
    throw new Error('A verified tenant security context is required.');
  }
}

export async function withTenantTransaction<T>(
  pool: DatabasePool,
  principal: VerifiedTenantPrincipal,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  assertVerifiedPrincipal(principal);
  if (principal.role === 'super_admin') {
    throw new Error('Tenant-scoped operations require a tenant principal.');
  }
  return inTransaction(pool, async client => {
    await setTenantContext(client, {
      kind: 'tenant',
      tenantId: principal.tenantId,
      actor: principal.userId || principal.email || 'authenticated-tenant-user',
      sessionId: principal.sessionId || '',
      role: principal.role
    });
    return operation(client);
  });
}

export async function withControlPlaneTransaction<T>(
  pool: DatabasePool,
  principal: VerifiedTenantPrincipal,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  assertVerifiedPrincipal(principal);
  if (principal.role !== 'super_admin') {
    throw new Error('Privileged control-plane authorization is required.');
  }
  return inTransaction(pool, async client => {
    await setTenantContext(client, {
      kind: 'control_plane',
      tenantId: '',
      actor: principal.userId || principal.email || 'verified-platform-administrator',
      sessionId: principal.sessionId || '',
      role: principal.role
    });
    return operation(client);
  });
}

export async function withTenantLoginTransaction<T>(
  pool: DatabasePool,
  tenantId: string,
  email: string,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  return inTransaction(pool, async client => {
    await setTenantContext(client, {
      kind: 'login',
      tenantId,
      actor: email.trim().toLowerCase(),
      sessionId: '',
      role: 'login'
    });
    return operation(client);
  });
}

export async function setInvitationTokenContext(
  client: DatabaseClient,
  tokenHash: Buffer
): Promise<void> {
  const hash = tokenHash.toString('hex');
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    version: 1,
    tokenHash: hash,
    issuedAt,
    expiresAt: issuedAt + CONTEXT_TTL_SECONDS
  });
  const signature = createHmac('sha256', signingSecret()).update(payload).digest('hex');
  await client.query(
    `SELECT set_config('app.invitation_context', $1, true),
            set_config('app.invitation_context_signature', $2, true)`,
    [payload, signature]
  );
}

export async function setInvitationTenantContext(
  client: DatabaseClient,
  tenantId: string,
  tokenHash: Buffer
): Promise<void> {
  await setInvitationTokenContext(client, tokenHash);
  await setTenantContext(client, {
    kind: 'invitation',
    tenantId,
    actor: 'invitation-token',
    sessionId: '',
    role: 'invitation'
  });
}
