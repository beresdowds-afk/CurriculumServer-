import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomUUID } from 'node:crypto';
import { createVerifiedTenantPrincipal } from '../db/tenantContext';
import type { DatabasePool } from '../db/postgres';
import { NotificationService } from './notificationService';
import type { ProviderRequest, ProviderResult } from './providers';

process.env.CONTROL_PLANE_SECRET ||= 'test-only-control-plane-context-key-32-chars';
process.env.STORAGE_VAULT_ACTIVE_KEY_ID = 'test';
process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });

const tenant = randomUUID();
const userId = randomUUID();
const principal = createVerifiedTenantPrincipal({ valid: true, context: { tenantId: tenant, role: 'tenant_admin', userId } as any });

// A narrow database double tests service transitions without pretending to test PostgreSQL RLS.
class FakeDatabase {
  outbox: any;
  subscription: any;
  attempts: any[] = [];
  async query(sql: string, values: any[] = []): Promise<any> {
    const text = sql.replace(/\s+/g, ' ').trim();
    const result = (rows: any[] = [], rowCount = rows.length) => ({ rows, rowCount });
    if (/^(BEGIN|COMMIT|ROLLBACK|SELECT set_config)/.test(text)) return result();
    if (text.startsWith('INSERT INTO production.notification_subscriptions')) {
      this.subscription = { tenant_id: values[0], id: values[1], owner_id: values[2], encrypted_subscription: values[3], revoked_at: null };
      return result([], 1);
    }
    if (text.startsWith('UPDATE production.notification_subscriptions')) {
      if (!this.subscription || this.subscription.id !== values[1] || this.subscription.owner_id !== values[2] || this.subscription.revoked_at) return result();
      this.subscription.revoked_at = new Date();
      return result([], 1);
    }
    if (text.startsWith('SELECT id FROM production.notification_subscriptions') || text.startsWith('SELECT encrypted_subscription FROM production.notification_subscriptions')) {
      return result(this.subscription && this.subscription.tenant_id === values[0] && this.subscription.id === values[1] && !this.subscription.revoked_at ? [this.subscription] : []);
    }
    if (text.startsWith('INSERT INTO production.notification_outbox')) {
      this.outbox = { tenant_id: values[0], id: values[1], channel: values[2], encrypted_request: values[3], max_attempts: values[4], status: 'queued', attempt_count: 0, lease_token: null, lease_until: null };
      return result([], 1);
    }
    if (text.startsWith('SELECT * FROM production.notification_outbox')) {
      return result(this.outbox?.tenant_id === values[0] && this.outbox.status === 'queued' ? [{ ...this.outbox }] : []);
    }
    if (text.startsWith('UPDATE production.notification_outbox SET attempt_count')) {
      Object.assign(this.outbox, { attempt_count: values[2], lease_token: values[3], lease_until: new Date(Date.now() + 60_000) });
      return result([], 1);
    }
    if (text.startsWith('INSERT INTO production.notification_attempts')) {
      this.attempts.push({ tenant_id: values[0], notification_id: values[1], attempt_number: values[2], lease_token: values[3], status: 'pending' });
      return result([], 1);
    }
    if (text.startsWith('UPDATE production.notification_outbox SET status = $4')) {
      if (this.outbox.lease_token !== values[2]) return result();
      Object.assign(this.outbox, { status: values[3], provider_message_id: values[4], last_error_code: values[5], lease_token: null, lease_until: null, delay: values[6] });
      return result([], 1);
    }
    if (text.startsWith('UPDATE production.notification_attempts SET status = $4')) {
      const attempt = this.attempts.find(a => a.lease_token === values[2] && a.status === 'pending');
      Object.assign(attempt, { status: values[3], error_code: values[4], provider_message_id: values[5] });
      return result([], 1);
    }
    if (text.startsWith('UPDATE production.notification_attempts SET status = \'failed\'')) {
      const attempt = this.attempts.find(a => a.lease_token === values[2] && a.status === 'pending');
      if (attempt) Object.assign(attempt, { status: 'failed', error_code: 'lease_expired' });
      return result([], attempt ? 1 : 0);
    }
    if (text.startsWith('UPDATE production.notification_outbox SET status = \'failed\'')) {
      Object.assign(this.outbox, { status: 'failed', last_error_code: 'lease_expired', lease_token: null, lease_until: null });
      return result([], 1);
    }
    throw new Error(`Unexpected SQL: ${text}`);
  }
  async connect(): Promise<any> { return { query: this.query.bind(this), release() {} }; }
}

test('outbox encrypts messages and records retries then provider acceptance', async () => {
  const db = new FakeDatabase();
  const requests: ProviderRequest[] = [];
  const results: ProviderResult[] = [
    { status: 'failed', errorCode: 'transport_error', retryable: true },
    { status: 'accepted', providerMessageId: 'message-1' }
  ];
  const service = new NotificationService(db as unknown as DatabasePool, principal, { send: async request => { requests.push(request); return results.shift()!; } });
  const queued = await service.enqueue({ channel: 'sms', to: '+2348012345678', message: 'private message' });
  assert.equal(queued.status, 'queued');
  assert.ok(!db.outbox.encrypted_request.includes('private message'));
  assert.deepEqual(await service.dispatchOne(), { id: queued.id, status: 'queued' });
  assert.equal(db.outbox.delay, 30);
  assert.equal(db.attempts[0].status, 'failed');
  assert.deepEqual(await service.dispatchOne(), { id: queued.id, status: 'accepted' });
  assert.equal(db.attempts[1].status, 'accepted');
  assert.equal(db.outbox.provider_message_id, 'message-1');
  assert.equal(requests.length, 2);
  assert.equal(await service.dispatchOne(), null);
});

test('subscriptions are encrypted, owner-revocable and expired leases are bounded', async () => {
  const db = new FakeDatabase();
  const service = new NotificationService(db as unknown as DatabasePool, principal, { send: async () => { throw new Error('must not send'); } });
  const key = createECDH('prime256v1'); key.generateKeys();
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/private-token',
    keys: { p256dh: key.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } };
  const saved = await service.subscribe(subscription);
  assert.ok(!db.subscription.encrypted_subscription.includes('private-token'));
  const otherPrincipal = createVerifiedTenantPrincipal({ valid: true, context: { tenantId: tenant, role: 'tenant_admin', userId: randomUUID() } as any });
  const otherService = new NotificationService(db as unknown as DatabasePool, otherPrincipal);
  assert.equal(await otherService.revokeSubscription(saved.id), false);
  const item = await service.enqueue({ channel: 'web_push', subscriptionId: saved.id, message: 'hello' }, { maxAttempts: 1 });
  assert.equal(await service.revokeSubscription(saved.id), true);
  assert.deepEqual(await service.dispatchOne(), { id: item.id, status: 'failed' });
  assert.equal(db.outbox.last_error_code, 'subscription_not_found');

  const other = await service.enqueue({ channel: 'email', to: 'a@example.test', subject: 'Hi', text: 'Hi' }, { maxAttempts: 1 });
  db.outbox.attempt_count = 1;
  db.outbox.lease_token = randomUUID();
  db.attempts.push({ notification_id: other.id, lease_token: db.outbox.lease_token, status: 'pending' });
  assert.deepEqual(await service.dispatchOne(), { id: other.id, status: 'failed' });
  assert.equal(db.attempts.at(-1).error_code, 'lease_expired');
});

test('transient errors exhaust the retry limit and stale workers cannot finalize', async () => {
  const db = new FakeDatabase();
  const retrying = new NotificationService(db as unknown as DatabasePool, principal, {
    send: async () => ({ status: 'failed', errorCode: 'transport_error', retryable: true })
  });
  const first = await retrying.enqueue({ channel: 'sms', to: '+2348012345678', message: 'Hi' }, { maxAttempts: 2 });
  assert.equal((await retrying.dispatchOne())?.status, 'queued');
  assert.deepEqual(await retrying.dispatchOne(), { id: first.id, status: 'failed' });
  assert.equal(db.attempts.filter(a => a.notification_id === first.id).length, 2);

  const stale = new NotificationService(db as unknown as DatabasePool, principal, {
    send: async () => {
      db.outbox.lease_token = randomUUID();
      return { status: 'accepted' };
    }
  });
  await stale.enqueue({ channel: 'sms', to: '+2348012345678', message: 'Hi' });
  await assert.rejects(stale.dispatchOne(), /NOTIFICATION_LEASE_LOST/);
  assert.equal(db.outbox.status, 'queued');
  assert.equal(db.attempts.at(-1).status, 'pending');
});
