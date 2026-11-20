import { randomUUID } from 'node:crypto';
import type {
  SchoolSettlementDetails, SchoolSettlementProvider, SchoolSettlementRequest
} from '../../packages/shared-types/src/schoolSettlementAccounts';
import { assertAuthorized, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import type { DatabasePool } from './postgres';
import { assertActiveSchool, SchoolFinancePolicyError } from './schoolFinancePolicies';
import { withTenantTransaction } from './tenantContext';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const providers: readonly string[] = ['opay', 'paystack', 'flutterwave'];

function invalid(message: string): never {
  throw new SchoolFinancePolicyError('INVALID_INPUT', message);
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > max ||
      /[\u0000-\u001f\u007f]/.test(value)) invalid(`${label} is invalid.`);
  return value.trim();
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

function assertRole(actor: AuthorizedPrincipal, permission: string, roles: readonly string[]): void {
  assertAuthorized(actor, permission);
  if (!actor.grants.some(grant =>
    grant.scopes.length === 0 && roles.includes(grant.roleCode) && grant.permissions.includes(permission)
  )) throw new Error('FORBIDDEN');
}

function assertId(id: string): void {
  if (!uuid.test(id)) invalid('Settlement account request ID is invalid.');
}

export class SchoolSettlementAccounts {
  constructor(private readonly pool: DatabasePool) {}

  async list(actor: AuthorizedPrincipal, schoolId: string): Promise<SchoolSettlementRequest[]> {
    assertAuthorized(actor, PERMISSIONS.schoolFinanceSettlementRead);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<SchoolSettlementRequest>(
        `SELECT r.id, r.provider, r.account_last_four, r.requested_by, r.requested_at,
                a.approved_by, a.approved_at
         FROM school_finance.settlement_account_requests r
         LEFT JOIN school_finance.settlement_account_approvals a
           ON a.tenant_id = r.tenant_id AND a.school_id = r.school_id AND a.request_id = r.id
         WHERE r.tenant_id = $1 AND r.school_id = $2
         ORDER BY r.requested_at DESC, r.id DESC LIMIT 200`,
        [actor.tenantId, schoolId]
      );
      return result.rows;
    });
  }

  async details(actor: AuthorizedPrincipal, schoolId: string, id: string): Promise<SchoolSettlementDetails> {
    assertAuthorized(actor, PERMISSIONS.schoolFinanceSettlementRead);
    assertId(id);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<{ encrypted_details: string }>(
        `SELECT encrypted_details FROM school_finance.settlement_account_requests
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3`, [actor.tenantId, schoolId, id]
      );
      if (!result.rows[0]) throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      const envelope: unknown = JSON.parse(ServerSecretVault.decrypt(result.rows[0].encrypted_details));
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('INVALID_SETTLEMENT_ENVELOPE');
      const value = envelope as Record<string, unknown>;
      if (value.tenantId !== actor.tenantId || value.schoolId !== schoolId || value.id !== id) {
        throw new Error('INVALID_SETTLEMENT_ENVELOPE');
      }
      const parsed = parseSettlementRequest(value.request);
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_settlement_account_details_read', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, requestId: id })]
      );
      return parsed.details;
    });
  }

  async request(actor: AuthorizedPrincipal, schoolId: string, raw: unknown): Promise<string> {
    assertRole(actor, PERMISSIONS.schoolFinanceSettlementRequest, ['principal', 'principal_administrator']);
    const parsed = parseSettlementRequest(raw);
    const id = randomUUID();
    const encrypted = ServerSecretVault.encrypt(JSON.stringify({
      tenantId: actor.tenantId, schoolId, id, request: { provider: parsed.provider, ...parsed.details }
    }));
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      await client.query(
        `INSERT INTO school_finance.settlement_account_requests
           (tenant_id, school_id, id, provider, encrypted_details, account_last_four, requested_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [actor.tenantId, schoolId, id, parsed.provider, encrypted, parsed.details.accountNumber.slice(-4), actor.userId]
      );
      return id;
    });
  }

  async approve(actor: AuthorizedPrincipal, schoolId: string, id: string): Promise<void> {
    assertRole(actor, PERMISSIONS.schoolFinanceSettlementApprove, ['proprietor']);
    assertId(id);
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query(
        `INSERT INTO school_finance.settlement_account_approvals (tenant_id, school_id, request_id, approved_by)
         SELECT tenant_id, school_id, id, $4 FROM school_finance.settlement_account_requests
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         ON CONFLICT (tenant_id, request_id) DO NOTHING RETURNING request_id`,
        [actor.tenantId, schoolId, id, actor.userId]
      );
      if (!result.rowCount) {
        const found = await client.query(
          `SELECT 1 FROM school_finance.settlement_account_requests WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, id]
        );
        if (found.rowCount) throw new SchoolFinancePolicyError('CONFLICT', 'Settlement account request is already approved.');
        throw new SchoolFinancePolicyError('NOT_FOUND', 'Settlement account request not found.');
      }
    });
  }
}
