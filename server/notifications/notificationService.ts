import { randomUUID } from 'node:crypto';
import type { DatabasePool } from '../db/postgres';
import { withTenantTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import {
  NotificationProviders, validateNotificationRequest, validatePushSubscription,
  type NotificationChannel, type NotificationRequest, type ProviderRequest, type ProviderResult,
  type PushSubscription
} from './providers';

export type NotificationStatus = 'queued' | 'accepted' | 'failed';
export interface NotificationRecord {
  id: string; channel: NotificationChannel; status: NotificationStatus; attempt_count: number;
  max_attempts: number; next_attempt_at: Date; provider_message_id: string | null;
  last_error_code: string | null; created_at: Date; updated_at: Date;
}
export interface NotificationAttempt {
  attempt_number: number; status: 'pending' | 'accepted' | 'failed';
  error_code: string | null; provider_message_id: string | null; started_at: Date; finished_at: Date | null;
}
type OutboxRow = NotificationRecord & { encrypted_request: string; lease_token: string | null };
type Sender = { send(request: ProviderRequest): Promise<ProviderResult> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertId(id: string): void {
  if (typeof id !== 'string' || !uuid.test(id)) throw new Error('INVALID_NOTIFICATION_ID');
}
function seal(tenantId: string, id: string, kind: string, data: unknown): string {
  return ServerSecretVault.encrypt(JSON.stringify({ tenantId, id, kind, data }));
}
function open(tenantId: string, id: string, kind: string, ciphertext: string): any {
  const value = JSON.parse(ServerSecretVault.decrypt(ciphertext));
  if (value?.tenantId !== tenantId || value?.id !== id || value?.kind !== kind) throw new Error('INVALID_ENCRYPTED_SCOPE');
  return value.data;
}

/** Callers must authorize each operation before invoking this tenant-scoped service.
 * Dispatch is at-least-once: a crash or timeout after provider acceptance can cause duplicates.
 */
export class NotificationService {
  constructor(
    private readonly pool: DatabasePool,
    private readonly principal: VerifiedTenantPrincipal,
    private readonly providers: Sender = new NotificationProviders()
  ) {}

  async subscribe(subscription: PushSubscription): Promise<{ id: string }> {
    const owner = this.principal.userId;
    if (!owner || owner.length > 256) throw new Error('NOTIFICATION_OWNER_REQUIRED');
    const valid = validatePushSubscription(subscription);
    const id = randomUUID();
    const encrypted = seal(this.principal.tenantId, id, 'subscription', valid);
    await withTenantTransaction(this.pool, this.principal, client => client.query(
      `INSERT INTO production.notification_subscriptions (tenant_id, id, owner_id, encrypted_subscription)
       VALUES ($1, $2, $3, $4)`, [this.principal.tenantId, id, owner, encrypted]
    ));
    return { id };
  }

  async revokeSubscription(id: string): Promise<boolean> {
    assertId(id);
    const owner = this.principal.userId;
    if (!owner || owner.length > 256) throw new Error('NOTIFICATION_OWNER_REQUIRED');
    return withTenantTransaction(this.pool, this.principal, async client => {
      const result = await client.query(
        `UPDATE production.notification_subscriptions SET revoked_at = now()
         WHERE tenant_id = $1 AND id = $2 AND owner_id = $3 AND revoked_at IS NULL`,
        [this.principal.tenantId, id, owner]
      );
      return result.rowCount === 1;
    });
  }

  async enqueue(request: NotificationRequest, options: { maxAttempts?: number } = {}): Promise<{ id: string; status: 'queued' }> {
    validateNotificationRequest(request);
    const maxAttempts = options.maxAttempts ?? 5;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error('INVALID_MAX_ATTEMPTS');
    const id = randomUUID();
    const encrypted = seal(this.principal.tenantId, id, 'notification', request);
    await withTenantTransaction(this.pool, this.principal, async client => {
      if (request.channel === 'web_push') {
        const found = await client.query(
          `SELECT id FROM production.notification_subscriptions WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL`,
          [this.principal.tenantId, request.subscriptionId]
        );
        if (!found.rowCount) throw new Error('NOTIFICATION_SUBSCRIPTION_NOT_FOUND');
      }
      await client.query(
        `INSERT INTO production.notification_outbox (tenant_id, id, channel, encrypted_request, max_attempts)
         VALUES ($1, $2, $3, $4, $5)`,
        [this.principal.tenantId, id, request.channel, encrypted, maxAttempts]
      );
    });
    return { id, status: 'queued' };
  }

  async get(id: string): Promise<NotificationRecord | null> {
    assertId(id);
    return withTenantTransaction(this.pool, this.principal, async client => {
      const result = await client.query<NotificationRecord>(
        `SELECT id, channel, status, attempt_count, max_attempts, next_attempt_at, provider_message_id,
                last_error_code, created_at, updated_at
         FROM production.notification_outbox WHERE tenant_id = $1 AND id = $2`,
        [this.principal.tenantId, id]
      );
      return result.rows[0] ?? null;
    });
  }

  async attempts(id: string): Promise<NotificationAttempt[]> {
    assertId(id);
    return withTenantTransaction(this.pool, this.principal, async client => {
      const result = await client.query<NotificationAttempt>(
        `SELECT attempt_number, status, error_code, provider_message_id, started_at, finished_at
         FROM production.notification_attempts WHERE tenant_id = $1 AND notification_id = $2 ORDER BY attempt_number`,
        [this.principal.tenantId, id]
      );
      return result.rows;
    });
  }

  /** Process at most one due item. Concurrent workers use a fenced 60-second lease. */
  async dispatchOne(): Promise<{ id: string; status: NotificationStatus } | null> {
    const tenantId = this.principal.tenantId;
    const claimed = await withTenantTransaction(this.pool, this.principal, async client => {
      const result = await client.query<OutboxRow>(
        `SELECT * FROM production.notification_outbox
         WHERE tenant_id = $1 AND status = 'queued' AND next_attempt_at <= now()
           AND (lease_until IS NULL OR lease_until <= now())
         ORDER BY next_attempt_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1`, [tenantId]
      );
      const row = result.rows[0];
      if (!row) return null;
      if (row.lease_token) {
        await client.query(
          `UPDATE production.notification_attempts SET status = 'failed', error_code = 'lease_expired', finished_at = now()
           WHERE tenant_id = $1 AND notification_id = $2 AND lease_token = $3 AND status = 'pending'`,
          [tenantId, row.id, row.lease_token]
        );
        if (row.attempt_count >= row.max_attempts) {
          await client.query(
            `UPDATE production.notification_outbox SET status = 'failed', last_error_code = 'lease_expired',
             lease_token = NULL, lease_until = NULL, updated_at = now() WHERE tenant_id = $1 AND id = $2`,
            [tenantId, row.id]
          );
          return { exhausted: true as const, id: row.id };
        }
      }
      const token = randomUUID();
      const attempt = row.attempt_count + 1;
      await client.query(
        `UPDATE production.notification_outbox SET attempt_count = $3, lease_token = $4,
         lease_until = now() + interval '60 seconds', updated_at = now() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, row.id, attempt, token]
      );
      await client.query(
        `INSERT INTO production.notification_attempts (tenant_id, notification_id, attempt_number, lease_token, status)
         VALUES ($1, $2, $3, $4, 'pending')`, [tenantId, row.id, attempt, token]
      );
      return { exhausted: false as const, row, token, attempt };
    });
    if (!claimed) return null;
    if (claimed.exhausted) return { id: claimed.id, status: 'failed' };

    let outcome: ProviderResult;
    try {
      const request = open(tenantId, claimed.row.id, 'notification', claimed.row.encrypted_request) as NotificationRequest;
      validateNotificationRequest(request);
      if (request.channel !== claimed.row.channel) throw new Error('INVALID_ENCRYPTED_SCOPE');
      if (request.channel === 'web_push') {
        const subscription = await withTenantTransaction(this.pool, this.principal, async client => {
          const result = await client.query<{ encrypted_subscription: string }>(
            `SELECT encrypted_subscription FROM production.notification_subscriptions
             WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL`, [tenantId, request.subscriptionId]
          );
          return result.rows[0]?.encrypted_subscription;
        });
        if (!subscription) outcome = { status: 'failed', errorCode: 'subscription_not_found', retryable: false };
        else {
          const decoded = open(tenantId, request.subscriptionId, 'subscription', subscription);
          outcome = await this.providers.send({ channel: 'web_push', message: request.message, subscription: validatePushSubscription(decoded) });
        }
      } else outcome = await this.providers.send(request);
    } catch {
      outcome = { status: 'failed', errorCode: 'dispatch_error', retryable: true };
    }

    // Error codes are intentionally constrained so provider errors cannot persist credentials or payloads.
    const errorCode = outcome.status === 'failed' && /^[a-z_]{1,64}$/.test(outcome.errorCode) ? outcome.errorCode : 'dispatch_error';
    const providerId = outcome.status === 'accepted' && typeof outcome.providerMessageId === 'string' &&
      /^[A-Za-z0-9._:-]{1,256}$/.test(outcome.providerMessageId) ? outcome.providerMessageId : null;
    const status: NotificationStatus = outcome.status === 'accepted' ? 'accepted' :
      outcome.retryable && claimed.attempt < claimed.row.max_attempts ? 'queued' : 'failed';
    const delaySeconds = Math.min(3600, 30 * 2 ** (claimed.attempt - 1));
    const updated = await withTenantTransaction(this.pool, this.principal, async client => {
      const result = await client.query(
        `UPDATE production.notification_outbox SET status = $4, provider_message_id = $5, last_error_code = $6,
         next_attempt_at = CASE WHEN $4 = 'queued' THEN now() + $7 * interval '1 second' ELSE next_attempt_at END,
         lease_token = NULL, lease_until = NULL, updated_at = now()
         WHERE tenant_id = $1 AND id = $2 AND lease_token = $3 AND lease_until > now()`,
        [tenantId, claimed.row.id, claimed.token, status, providerId,
          outcome.status === 'failed' ? errorCode : null, delaySeconds]
      );
      if (result.rowCount !== 1) return false;
      await client.query(
        `UPDATE production.notification_attempts SET status = $4, error_code = $5, provider_message_id = $6, finished_at = now()
         WHERE tenant_id = $1 AND notification_id = $2 AND lease_token = $3 AND status = 'pending'`,
        [tenantId, claimed.row.id, claimed.token, outcome.status, outcome.status === 'failed' ? errorCode : null, providerId]
      );
      return true;
    });
    if (!updated) throw new Error('NOTIFICATION_LEASE_LOST');
    return { id: claimed.row.id, status };
  }
}
