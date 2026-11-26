import { randomUUID } from 'node:crypto';
import type {
  SchoolSettlementDetails,
  SchoolSettlementEvent,
  SchoolSettlementLifecycleState,
  SchoolSettlementProvider,
  SchoolSettlementRequest
} from '../../packages/shared-types/src/schoolSettlementAccounts';
import { type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import type { DatabaseClient, DatabasePool } from './postgres';
import {
  assertActiveSchool,
  assertSchoolFinancePermission,
  hasSchoolFinancePermission,
  SchoolFinancePolicyError
} from './schoolFinancePolicies';
import {
  createSettlementProviderAdapters,
  SettlementProviderError,
  type SettlementProviderAdapter
} from './settlementProviderAdapters';
import { withTenantTransaction } from './tenantContext';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const providers: readonly string[] = ['opay', 'paystack', 'flutterwave'];
const PROPRIETOR_ROLES: readonly string[] = ['proprietor'];
const PRINCIPAL_ROLES: readonly string[] = ['principal', 'principal_administrator'];
const VERIFY_ROLES: readonly string[] = ['principal', 'principal_administrator', 'proprietor'];

function invalid(message: string): never {
  throw new SchoolFinancePolicyError('INVALID_INPUT', message);
}

function requiredText(value: unknown, label: string, max: number): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < 1 ||
    value.trim().length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    invalid(`${label} is invalid.`);
  }
  return value.trim();
}

function optionalReason(raw: unknown, label = 'Reason'): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    invalid(`${label} payload is invalid.`);
  }
  const value = raw as Record<string, unknown>;
  const reason = requiredText(value.reason, label, 500);
  if (reason.length < 3) invalid(`${label} must be at least 3 characters.`);
  return reason;
}

export function parseSettlementRequest(raw: unknown): {
  provider: SchoolSettlementProvider;
  details: SchoolSettlementDetails;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('Settlement account request is invalid.');
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some(key => !['provider', 'bankName', 'bankCode', 'accountName', 'accountNumber'].includes(key))) {
    invalid('Settlement account request contains unsupported fields.');
  }
  if (typeof value.provider !== 'string' || !providers.includes(value.provider)) invalid('Provider is invalid.');
  const accountNumber = requiredText(value.accountNumber, 'Account number', 10);
  if (!/^\d{10}$/.test(accountNumber)) invalid('Account number must be a 10-digit NUBAN.');
  return {
    provider: value.provider as SchoolSettlementProvider,
    details: {
      bankName: requiredText(value.bankName, 'Bank name', 120),
      bankCode: requiredText(value.bankCode, 'Bank code', 32),
      accountName: requiredText(value.accountName, 'Account name', 160),
      accountNumber
    }
  };
}

function assertId(id: string): void {
  if (!uuid.test(id)) invalid('Settlement account request ID is invalid.');
}

interface RawSettlementRow {
  id: string;
  provider: SchoolSettlementProvider;
  account_last_four: string;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  state: SchoolSettlementLifecycleState | null;
  is_default: boolean | null;
  replaced_by_request_id: string | null;
  verified_account_name: string | null;
  verification_provider_status: string | null;
  has_provider_reference: boolean | null;
  last_error_code: string | null;
  last_error_message: string | null;
  verified_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
  replaced_at: string | null;
}

function mapSettlementRow(row: RawSettlementRow): SchoolSettlementRequest {
  const derivedState: SchoolSettlementLifecycleState =
    row.state || (row.approved_at ? 'approved_awaiting_verification' : 'pending_proprietor_approval');
  return {
    id: row.id,
    provider: row.provider,
    account_last_four: row.account_last_four,
    requested_by: row.requested_by,
    requested_at: row.requested_at,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    state: derivedState,
    is_default: Boolean(row.is_default),
    replaced_by_request_id: row.replaced_by_request_id ?? null,
    verified_account_name: row.verified_account_name ?? null,
    verification_provider_status: row.verification_provider_status ?? null,
    has_provider_reference: Boolean(row.has_provider_reference),
    last_error_code: row.last_error_code ?? null,
    last_error_message: row.last_error_message ?? null,
    verified_at: row.verified_at ?? null,
    activated_at: row.activated_at ?? null,
    suspended_at: row.suspended_at ?? null,
    revoked_at: row.revoked_at ?? null,
    rejected_at: row.rejected_at ?? null,
    replaced_at: row.replaced_at ?? null
  };
}

const SETTLEMENT_SELECT_SQL = `
  SELECT r.id, r.provider, r.account_last_four, r.requested_by, r.requested_at,
         a.approved_by, a.approved_at,
         s.state, s.is_default, s.replaced_by_request_id,
         s.verified_account_name, s.verification_provider_status,
         (s.encrypted_provider_reference IS NOT NULL) AS has_provider_reference,
         s.last_error_code, s.last_error_message,
         s.verified_at, s.activated_at, s.suspended_at,
         s.revoked_at, s.rejected_at, s.replaced_at
  FROM school_finance.settlement_account_requests r
  LEFT JOIN school_finance.settlement_account_approvals a
    ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
  LEFT JOIN school_finance.settlement_account_states s
    ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
`;

async function appendSettlementEvent(
  client: DatabaseClient,
  params: {
    tenantId: string;
    schoolId: string;
    requestId: string;
    eventType: string;
    fromState: string | null;
    toState: string;
    actorId: string | null;
    idempotencyKey?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO school_finance.settlement_account_events
       (tenant_id, school_id, request_id, event_type, from_state, to_state, actor_id, idempotency_key, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      params.tenantId,
      params.schoolId,
      params.requestId,
      params.eventType,
      params.fromState,
      params.toState,
      params.actorId,
      params.idempotencyKey ?? null,
      JSON.stringify(params.details ?? {})
    ]
  );
}

async function appendAuditEvent(
  client: DatabaseClient,
  tenantId: string,
  actorSubject: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  await client.query(
    `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [tenantId, actorSubject, action, JSON.stringify(details)]
  );
}

function assertProprietorManage(actor: AuthorizedPrincipal, schoolId: string): void {
  const allowed =
    hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementManage, schoolId, PROPRIETOR_ROLES) ||
    hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementApprove, schoolId, PROPRIETOR_ROLES);
  if (!allowed) throw new Error('FORBIDDEN');
}

export class SettlementCallbackSignatureError extends Error {
  constructor(message = 'Verification callback signature is invalid.') {
    super(message);
    this.name = 'SettlementCallbackSignatureError';
  }
}

export class SchoolSettlementAccounts {
  private readonly adapters: Record<SchoolSettlementProvider, SettlementProviderAdapter>;

  constructor(
    private readonly pool: DatabasePool,
    adapters?: Record<SchoolSettlementProvider, SettlementProviderAdapter>
  ) {
    this.adapters = adapters ?? createSettlementProviderAdapters();
  }

  async list(actor: AuthorizedPrincipal, schoolId: string): Promise<SchoolSettlementRequest[]> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementRead, schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<RawSettlementRow>(
        `${SETTLEMENT_SELECT_SQL}
         WHERE r.tenant_id = $1 AND r.school_id = $2
         ORDER BY r.requested_at DESC, r.id DESC LIMIT 200`,
        [actor.tenantId, schoolId]
      );
      return result.rows.map(mapSettlementRow);
    });
  }

  async getActiveSettlementAccount(
    actor: AuthorizedPrincipal,
    schoolId: string
  ): Promise<SchoolSettlementRequest | null> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementRead, schoolId);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<RawSettlementRow>(
        `${SETTLEMENT_SELECT_SQL}
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND s.state = 'active' AND s.is_default = true
         LIMIT 1`,
        [actor.tenantId, schoolId]
      );
      return result.rows[0] ? mapSettlementRow(result.rows[0]) : null;
    });
  }

  async events(
    actor: AuthorizedPrincipal,
    schoolId: string,
    id: string
  ): Promise<SchoolSettlementEvent[]> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementRead, schoolId);
    assertId(id);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const found = await client.query(
        `SELECT 1 FROM school_finance.settlement_account_requests
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, id]
      );
      if (!found.rowCount) {
        throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      }
      const result = await client.query<SchoolSettlementEvent>(
        `SELECT id, request_id, event_type, from_state, to_state, actor_id, details, created_at
         FROM school_finance.settlement_account_events
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3
         ORDER BY created_at ASC, id ASC`,
        [actor.tenantId, schoolId, id]
      );
      return result.rows;
    });
  }

  async details(actor: AuthorizedPrincipal, schoolId: string, id: string): Promise<SchoolSettlementDetails> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementRead, schoolId);
    assertId(id);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<{ encrypted_details: string }>(
        `SELECT encrypted_details FROM school_finance.settlement_account_requests
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
        [actor.tenantId, schoolId, id]
      );
      if (!result.rows[0]) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      const envelope: unknown = JSON.parse(ServerSecretVault.decrypt(result.rows[0].encrypted_details));
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
        throw new Error('INVALID_SETTLEMENT_ENVELOPE');
      }
      const value = envelope as Record<string, unknown>;
      if (value.tenantId !== actor.tenantId || value.schoolId !== schoolId || value.id !== id) {
        throw new Error('INVALID_SETTLEMENT_ENVELOPE');
      }
      const parsed = parseSettlementRequest(value.request);
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_details_read', {
        schoolId,
        requestId: id
      });
      return parsed.details;
    });
  }

  async request(actor: AuthorizedPrincipal, schoolId: string, raw: unknown): Promise<string> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementRequest, schoolId, PRINCIPAL_ROLES);
    const parsed = parseSettlementRequest(raw);
    const id = randomUUID();
    const lastFour = parsed.details.accountNumber.slice(-4);
    const encrypted = ServerSecretVault.encrypt(
      JSON.stringify({
        tenantId: actor.tenantId,
        schoolId,
        id,
        request: { provider: parsed.provider, ...parsed.details }
      })
    );
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      await client.query(
        `INSERT INTO school_finance.settlement_account_requests
           (tenant_id, school_id, id, provider, encrypted_details, account_last_four, requested_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [actor.tenantId, schoolId, id, parsed.provider, encrypted, lastFour, actor.userId]
      );
      await client.query(
        `INSERT INTO school_finance.settlement_account_states
           (tenant_id, school_id, request_id, state, is_default, updated_by)
         VALUES ($1, $2, $3, 'pending_proprietor_approval', false, $4)`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'requested',
        fromState: null,
        toState: 'pending_proprietor_approval',
        actorId: actor.userId,
        details: { provider: parsed.provider, bankCode: parsed.details.bankCode, accountLastFour: lastFour }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_requested', {
        schoolId,
        requestId: id,
        provider: parsed.provider,
        accountLastFour: lastFour
      });
      return id;
    });
  }

  async approve(actor: AuthorizedPrincipal, schoolId: string, id: string): Promise<void> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementApprove, schoolId, PROPRIETOR_ROLES);
    assertId(id);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const currentRes = await client.query<{ state: string | null }>(
        `SELECT s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      if (!currentRes.rowCount) {
        throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      }
      const currentState = currentRes.rows[0].state;
      if (currentState && ['rejected', 'revoked', 'replaced'].includes(currentState)) {
        throw new SchoolFinancePolicyError('CONFLICT', `Cannot approve settlement account in state '${currentState}'.`);
      }

      const result = await client.query(
        `INSERT INTO school_finance.settlement_account_approvals (tenant_id, school_id, request_id, approved_by)
         SELECT tenant_id, school_id, id, $4 FROM school_finance.settlement_account_requests
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         ON CONFLICT (tenant_id, request_id) DO NOTHING RETURNING request_id`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      if (!result.rowCount) {
        throw new SchoolFinancePolicyError('CONFLICT', 'Settlement account request is already approved.');
      }

      await client.query(
        `INSERT INTO school_finance.settlement_account_states
           (tenant_id, school_id, request_id, state, is_default, updated_by, updated_at)
         VALUES ($1, $2, $3, 'approved_awaiting_verification', false, $4, now())
         ON CONFLICT (tenant_id, request_id)
         DO UPDATE SET state = 'approved_awaiting_verification', updated_by = $4, updated_at = now()`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'approved',
        fromState: currentState || 'pending_proprietor_approval',
        toState: 'approved_awaiting_verification',
        actorId: actor.userId
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_approved', {
        schoolId,
        requestId: id
      });
    });
  }

  async reject(actor: AuthorizedPrincipal, schoolId: string, id: string, raw: unknown): Promise<void> {
    assertProprietorManage(actor, schoolId);
    assertId(id);
    const reason = optionalReason(raw, 'Rejection reason');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const current = await client.query<{
        approved_at: Date | null;
        state: SchoolSettlementLifecycleState | null;
      }>(
        `SELECT a.approved_at, s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_approvals a
           ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      if (!current.rowCount) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      const fromState: SchoolSettlementLifecycleState =
        current.rows[0].state ||
        (current.rows[0].approved_at ? 'approved_awaiting_verification' : 'pending_proprietor_approval');
      if (fromState !== 'pending_proprietor_approval' && fromState !== 'approved_awaiting_verification') {
        throw new SchoolFinancePolicyError('CONFLICT', `Cannot reject settlement account in state '${fromState}'.`);
      }

      await client.query(
        `INSERT INTO school_finance.settlement_account_states
           (tenant_id, school_id, request_id, state, is_default, rejected_at, last_error_message, updated_by, updated_at)
         VALUES ($1, $2, $3, 'rejected', false, now(), $4, $5, now())
         ON CONFLICT (tenant_id, request_id)
         DO UPDATE SET state = 'rejected', is_default = false, rejected_at = now(),
                       last_error_message = $4, updated_by = $5, updated_at = now()`,
        [actor.tenantId, schoolId, id, reason, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'rejected',
        fromState,
        toState: 'rejected',
        actorId: actor.userId,
        details: { reason }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_rejected', {
        schoolId,
        requestId: id,
        reason
      });
    });
  }

  async verify(
    actor: AuthorizedPrincipal,
    schoolId: string,
    id: string,
    idempotencyKey?: string
  ): Promise<SchoolSettlementRequest> {
    const canVerify =
      hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementVerify, schoolId, VERIFY_ROLES) ||
      hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementApprove, schoolId, PROPRIETOR_ROLES);
    if (!canVerify) throw new Error('FORBIDDEN');
    assertId(id);

    const normalizedKey = typeof idempotencyKey === 'string' && idempotencyKey.trim()
      ? requiredText(idempotencyKey, 'Idempotency key', 120)
      : undefined;

    const prepared = await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      if (normalizedKey) {
        const dup = await client.query(
          `SELECT 1 FROM school_finance.settlement_account_events
           WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3`,
          [actor.tenantId, schoolId, normalizedKey]
        );
        if (dup.rowCount) {
          const existing = await client.query<RawSettlementRow>(
            `${SETTLEMENT_SELECT_SQL} WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3`,
            [actor.tenantId, schoolId, id]
          );
          if (!existing.rows[0]) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
          return { alreadyCompleted: true as const, record: mapSettlementRow(existing.rows[0]) };
        }
      }

      const current = await client.query<{
        provider: SchoolSettlementProvider;
        encrypted_details: string;
        account_last_four: string;
        approved_at: Date | null;
        state: SchoolSettlementLifecycleState | null;
      }>(
        `SELECT r.provider, r.encrypted_details, r.account_last_four, a.approved_at, s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_approvals a
           ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      const row = current.rows[0];
      if (!row) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      if (!row.approved_at) {
        invalid('Proprietor approval is required before provider verification.');
      }
      const fromState: SchoolSettlementLifecycleState = row.state || 'approved_awaiting_verification';
      if (fromState !== 'approved_awaiting_verification') {
        throw new SchoolFinancePolicyError(
          'CONFLICT',
          `Settlement account cannot be verified from state '${fromState}'.`
        );
      }

      const envelope = JSON.parse(ServerSecretVault.decrypt(row.encrypted_details)) as Record<string, unknown>;
      if (envelope.tenantId !== actor.tenantId || envelope.schoolId !== schoolId || envelope.id !== id) {
        throw new Error('INVALID_SETTLEMENT_ENVELOPE');
      }
      const parsed = parseSettlementRequest(envelope.request);

      await client.query(
        `INSERT INTO school_finance.settlement_account_states
           (tenant_id, school_id, request_id, state, is_default, last_error_code, last_error_message, updated_by, updated_at)
         VALUES ($1, $2, $3, 'verification_in_progress', false, NULL, NULL, $4, now())
         ON CONFLICT (tenant_id, request_id)
         DO UPDATE SET state = 'verification_in_progress', last_error_code = NULL, last_error_message = NULL,
                       updated_by = $4, updated_at = now()`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'verification_started',
        fromState,
        toState: 'verification_in_progress',
        actorId: actor.userId,
        idempotencyKey: normalizedKey,
        details: { provider: parsed.provider, accountLastFour: row.account_last_four }
      });

      return {
        alreadyCompleted: false as const,
        provider: parsed.provider,
        details: parsed.details,
        accountLastFour: row.account_last_four
      };
    });

    if (prepared.alreadyCompleted) {
      return prepared.record;
    }

    const adapter = this.adapters[prepared.provider];
    try {
      const outcome = await adapter.verifyAndRegister({
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        provider: prepared.provider,
        details: prepared.details
      });
      const encryptedProviderRef = ServerSecretVault.encrypt(
        JSON.stringify({
          tenantId: actor.tenantId,
          schoolId,
          requestId: id,
          provider: prepared.provider,
          providerReference: outcome.providerReference
        })
      );
      return await withTenantTransaction(this.pool, actor.tenant, async client => {
        await client.query(
          `UPDATE school_finance.settlement_account_states
           SET state = 'verified',
               encrypted_provider_reference = $4,
               verified_account_name = $5,
               verification_provider_status = $6,
               last_error_code = NULL,
               last_error_message = NULL,
               verified_at = now(),
               updated_by = $7,
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
          [
            actor.tenantId,
            schoolId,
            id,
            encryptedProviderRef,
            outcome.verifiedAccountName,
            outcome.providerStatus,
            actor.userId
          ]
        );
        await appendSettlementEvent(client, {
          tenantId: actor.tenantId,
          schoolId,
          requestId: id,
          eventType: 'verification_succeeded',
          fromState: 'verification_in_progress',
          toState: 'verified',
          actorId: actor.userId,
          details: {
            provider: prepared.provider,
            verifiedAccountName: outcome.verifiedAccountName,
            providerStatus: outcome.providerStatus
          }
        });
        await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_verified', {
          schoolId,
          requestId: id,
          provider: prepared.provider,
          accountLastFour: prepared.accountLastFour,
          verifiedAccountName: outcome.verifiedAccountName
        });
        const updated = await client.query<RawSettlementRow>(
          `${SETTLEMENT_SELECT_SQL} WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3`,
          [actor.tenantId, schoolId, id]
        );
        return mapSettlementRow(updated.rows[0]);
      });
    } catch (err) {
      const errorCode = err instanceof SettlementProviderError ? err.code : 'PROVIDER_UNAVAILABLE';
      const errorMessage = err instanceof Error ? err.message : 'Settlement verification failed.';
      await withTenantTransaction(this.pool, actor.tenant, async client => {
        await client.query(
          `UPDATE school_finance.settlement_account_states
           SET state = 'approved_awaiting_verification',
               last_error_code = $4,
               last_error_message = $5,
               updated_by = $6,
               updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
          [actor.tenantId, schoolId, id, errorCode, errorMessage.slice(0, 400), actor.userId]
        );
        await appendSettlementEvent(client, {
          tenantId: actor.tenantId,
          schoolId,
          requestId: id,
          eventType: 'verification_failed',
          fromState: 'verification_in_progress',
          toState: 'approved_awaiting_verification',
          actorId: actor.userId,
          details: { provider: prepared.provider, errorCode, errorMessage: errorMessage.slice(0, 400) }
        });
        await appendAuditEvent(
          client,
          actor.tenantId,
          actor.userId,
          'school_settlement_account_verification_failed',
          {
            schoolId,
            requestId: id,
            provider: prepared.provider,
            accountLastFour: prepared.accountLastFour,
            errorCode
          }
        );
      });
      if (err instanceof SettlementProviderError) throw err;
      throw new SettlementProviderError('PROVIDER_UNAVAILABLE', errorMessage);
    }
  }

  async activate(actor: AuthorizedPrincipal, schoolId: string, id: string): Promise<void> {
    assertProprietorManage(actor, schoolId);
    assertId(id);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const current = await client.query<{
        state: SchoolSettlementLifecycleState | null;
        verified_at: Date | null;
      }>(
        `SELECT s.state, s.verified_at
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      if (!current.rowCount) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      const fromState = current.rows[0].state;
      if (fromState !== 'verified' && fromState !== 'suspended') {
        throw new SchoolFinancePolicyError(
          'CONFLICT',
          `Only verified or suspended settlement accounts can be activated (current state: '${fromState || 'unverified'}').`
        );
      }
      if (!current.rows[0].verified_at) {
        invalid('Settlement account must complete provider verification before activation.');
      }

      const previousActive = await client.query<{ request_id: string }>(
        `UPDATE school_finance.settlement_account_states
         SET state = 'replaced',
             is_default = false,
             replaced_by_request_id = $3,
             replaced_at = now(),
             updated_by = $4,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND state = 'active' AND is_default = true AND request_id <> $3
         RETURNING request_id`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      for (const prev of previousActive.rows) {
        await appendSettlementEvent(client, {
          tenantId: actor.tenantId,
          schoolId,
          requestId: prev.request_id,
          eventType: 'replaced',
          fromState: 'active',
          toState: 'replaced',
          actorId: actor.userId,
          details: { replacedByRequestId: id }
        });
      }

      await client.query(
        `UPDATE school_finance.settlement_account_states
         SET state = 'active',
             is_default = true,
             activated_at = now(),
             updated_by = $4,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'activated',
        fromState,
        toState: 'active',
        actorId: actor.userId,
        details: { isDefault: true, replacedRequestIds: previousActive.rows.map(r => r.request_id) }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_activated', {
        schoolId,
        requestId: id,
        replacedRequestIds: previousActive.rows.map(r => r.request_id)
      });
    });
  }

  async suspend(actor: AuthorizedPrincipal, schoolId: string, id: string, raw: unknown): Promise<void> {
    assertProprietorManage(actor, schoolId);
    assertId(id);
    const reason = optionalReason(raw, 'Suspension reason');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const current = await client.query<{ state: SchoolSettlementLifecycleState | null }>(
        `SELECT s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      if (!current.rowCount) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      if (current.rows[0].state !== 'active') {
        throw new SchoolFinancePolicyError('CONFLICT', 'Only active settlement accounts can be suspended.');
      }
      await client.query(
        `UPDATE school_finance.settlement_account_states
         SET state = 'suspended',
             is_default = false,
             suspended_at = now(),
             last_error_message = $4,
             updated_by = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
        [actor.tenantId, schoolId, id, reason, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'suspended',
        fromState: 'active',
        toState: 'suspended',
        actorId: actor.userId,
        details: { reason }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_suspended', {
        schoolId,
        requestId: id,
        reason
      });
    });
  }

  async revoke(actor: AuthorizedPrincipal, schoolId: string, id: string, raw: unknown): Promise<void> {
    assertProprietorManage(actor, schoolId);
    assertId(id);
    const reason = optionalReason(raw, 'Revocation reason');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const current = await client.query<{
        approved_at: Date | null;
        state: SchoolSettlementLifecycleState | null;
      }>(
        `SELECT a.approved_at, s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_approvals a
           ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      if (!current.rowCount) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      const fromState: SchoolSettlementLifecycleState =
        current.rows[0].state ||
        (current.rows[0].approved_at ? 'approved_awaiting_verification' : 'pending_proprietor_approval');
      if (fromState === 'revoked' || fromState === 'rejected' || fromState === 'replaced') {
        throw new SchoolFinancePolicyError('CONFLICT', `Settlement account is already in terminal state '${fromState}'.`);
      }

      await client.query(
        `INSERT INTO school_finance.settlement_account_states
           (tenant_id, school_id, request_id, state, is_default, revoked_at, last_error_message, updated_by, updated_at)
         VALUES ($1, $2, $3, 'revoked', false, now(), $4, $5, now())
         ON CONFLICT (tenant_id, request_id)
         DO UPDATE SET state = 'revoked', is_default = false, revoked_at = now(),
                       last_error_message = $4, updated_by = $5, updated_at = now()`,
        [actor.tenantId, schoolId, id, reason, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'revoked',
        fromState,
        toState: 'revoked',
        actorId: actor.userId,
        details: { reason }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_revoked', {
        schoolId,
        requestId: id,
        reason
      });
    });
  }

  async replace(
    actor: AuthorizedPrincipal,
    schoolId: string,
    currentId: string,
    raw: unknown
  ): Promise<void> {
    assertProprietorManage(actor, schoolId);
    assertId(currentId);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('Replacement payload is invalid.');
    const body = raw as Record<string, unknown>;
    const replacementRequestId = requiredText(body.replacementRequestId, 'Replacement request ID', 36);
    assertId(replacementRequestId);
    if (replacementRequestId.toLowerCase() === currentId.toLowerCase()) {
      invalid('A settlement account cannot replace itself.');
    }
    const reason = body.reason !== undefined ? optionalReason(body, 'Replacement reason') : 'Replaced by proprietor';

    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const rows = await client.query<{
        request_id: string;
        state: SchoolSettlementLifecycleState | null;
        verified_at: Date | null;
      }>(
        `SELECT r.id AS request_id, s.state, s.verified_at
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = ANY($3::uuid[])
         FOR UPDATE`,
        [actor.tenantId, schoolId, [currentId, replacementRequestId]]
      );
      const currentRow = rows.rows.find(r => r.request_id.toLowerCase() === currentId.toLowerCase());
      const replacementRow = rows.rows.find(r => r.request_id.toLowerCase() === replacementRequestId.toLowerCase());
      if (!currentRow) throw new SchoolFinancePolicyError('NOT_FOUND', 'Current settlement account not found.');
      if (!replacementRow) throw new SchoolFinancePolicyError('NOT_FOUND', 'Replacement settlement account not found.');
      if (currentRow.state !== 'active' && currentRow.state !== 'suspended' && currentRow.state !== 'verified') {
        throw new SchoolFinancePolicyError('CONFLICT', `Cannot replace settlement account in state '${currentRow.state}'.`);
      }
      if (replacementRow.state !== 'verified' && replacementRow.state !== 'suspended') {
        throw new SchoolFinancePolicyError('CONFLICT', 'Replacement settlement account must be verified first.');
      }
      if (!replacementRow.verified_at) {
        invalid('Replacement settlement account has not completed provider verification.');
      }

      await client.query(
        `UPDATE school_finance.settlement_account_states
         SET state = 'replaced',
             is_default = false,
             replaced_by_request_id = $4,
             replaced_at = now(),
             updated_by = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
        [actor.tenantId, schoolId, currentId, replacementRequestId, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: currentId,
        eventType: 'replaced',
        fromState: currentRow.state,
        toState: 'replaced',
        actorId: actor.userId,
        details: { replacedByRequestId: replacementRequestId, reason }
      });

      await client.query(
        `UPDATE school_finance.settlement_account_states
         SET state = 'active',
             is_default = true,
             activated_at = now(),
             updated_by = $4,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
        [actor.tenantId, schoolId, replacementRequestId, actor.userId]
      );
      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: replacementRequestId,
        eventType: 'activated',
        fromState: replacementRow.state,
        toState: 'active',
        actorId: actor.userId,
        details: { replacedRequestId: currentId, isDefault: true, reason }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_account_replaced', {
        schoolId,
        previousRequestId: currentId,
        replacementRequestId,
        reason
      });
    });
  }

  async handleVerificationCallback(
    actor: AuthorizedPrincipal,
    schoolId: string,
    id: string,
    input: {
      provider?: SchoolSettlementProvider;
      rawBody: Buffer;
      headers: Record<string, string | string[] | undefined>;
      payload: unknown;
      idempotencyKey?: string;
    }
  ): Promise<{ deduplicated: boolean; state: SchoolSettlementLifecycleState }> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinanceSettlementVerify, schoolId, VERIFY_ROLES);
    assertId(id);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const current = await client.query<{
        provider: SchoolSettlementProvider;
        approved_at: Date | null;
        state: SchoolSettlementLifecycleState | null;
      }>(
        `SELECT r.provider, a.approved_at, s.state
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_approvals a
           ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
         LEFT JOIN school_finance.settlement_account_states s
           ON s.tenant_id = r.tenant_id AND s.school_id = r.school_id AND s.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3
         FOR UPDATE`,
        [actor.tenantId, schoolId, id]
      );
      const row = current.rows[0];
      if (!row) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      if (input.provider && input.provider !== row.provider) {
        invalid('Callback provider does not match settlement account request provider.');
      }

      const adapter = this.adapters[row.provider];
      if (!adapter.verifyCallbackSignature(input.rawBody, input.headers)) {
        await appendAuditEvent(
          client,
          actor.tenantId,
          actor.userId,
          'school_settlement_callback_signature_rejected',
          { schoolId, requestId: id, provider: row.provider }
        );
        throw new SettlementCallbackSignatureError();
      }

      const normalized = adapter.normalizeCallback(input.payload);
      const dedupeKey = input.idempotencyKey || `${row.provider}:${normalized.eventId}`;
      const existingEvent = await client.query(
        `SELECT 1 FROM school_finance.settlement_account_events
         WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3`,
        [actor.tenantId, schoolId, dedupeKey]
      );
      if (existingEvent.rowCount) {
        return {
          deduplicated: true,
          state: row.state || 'approved_awaiting_verification'
        };
      }

      if (!row.approved_at) {
        invalid('Proprietor approval is required before verification callbacks can finalize.');
      }
      const fromState: SchoolSettlementLifecycleState = row.state || 'approved_awaiting_verification';
      if (['rejected', 'revoked', 'replaced'].includes(fromState)) {
        throw new SchoolFinancePolicyError('CONFLICT', `Cannot apply callback to terminal state '${fromState}'.`);
      }

      const nextState: SchoolSettlementLifecycleState = normalized.verified
        ? fromState === 'active'
          ? 'active'
          : 'verified'
        : 'approved_awaiting_verification';

      const encryptedProviderRef = normalized.providerReference
        ? ServerSecretVault.encrypt(
            JSON.stringify({
              tenantId: actor.tenantId,
              schoolId,
              requestId: id,
              provider: row.provider,
              providerReference: normalized.providerReference
            })
          )
        : null;

      await client.query(
        `UPDATE school_finance.settlement_account_states
         SET state = $4,
             encrypted_provider_reference = COALESCE($5, encrypted_provider_reference),
             verified_account_name = COALESCE($6, verified_account_name),
             verification_provider_status = $7,
             verified_at = CASE WHEN $8 THEN COALESCE(verified_at, now()) ELSE verified_at END,
             last_error_code = CASE WHEN $8 THEN NULL ELSE 'PROVIDER_REJECTED' END,
             last_error_message = CASE WHEN $8 THEN NULL ELSE $9 END,
             updated_by = $10,
             updated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3`,
        [
          actor.tenantId,
          schoolId,
          id,
          nextState,
          encryptedProviderRef,
          normalized.verifiedAccountName ?? null,
          normalized.providerStatus,
          normalized.verified,
          normalized.verified ? null : `Provider callback status: ${normalized.providerStatus}`,
          actor.userId
        ]
      );

      await appendSettlementEvent(client, {
        tenantId: actor.tenantId,
        schoolId,
        requestId: id,
        eventType: 'verification_callback',
        fromState,
        toState: nextState,
        actorId: actor.userId,
        idempotencyKey: dedupeKey,
        details: {
          provider: row.provider,
          providerStatus: normalized.providerStatus,
          verified: normalized.verified
        }
      });
      await appendAuditEvent(client, actor.tenantId, actor.userId, 'school_settlement_callback_processed', {
        schoolId,
        requestId: id,
        provider: row.provider,
        providerStatus: normalized.providerStatus,
        verified: normalized.verified,
        nextState
      });

      return { deduplicated: false, state: nextState };
    });
  }
}
