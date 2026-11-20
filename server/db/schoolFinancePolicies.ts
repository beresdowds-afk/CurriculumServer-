import { assertAuthorized, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from './postgres';
import { withTenantTransaction } from './tenantContext';
import type { FeePolicyInput, FeePolicyItem, FeePolicyRecord } from '../../packages/shared-types/src/schoolFinance';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = ['tuition', 'levy', 'sundry', 'elective'] as const;
const residenceTypes = ['all', 'day', 'boarding'] as const;

export class SchoolFinancePolicyError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'NOT_FOUND' | 'CONFLICT', message: string) {
    super(message);
  }
}

function invalid(message: string): never {
  throw new SchoolFinancePolicyError('INVALID_INPUT', message);
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    return invalid(`${label} is invalid.`);
  }
  return value.trim();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Invalid fee policy.');
  return value as Record<string, unknown>;
}

export function parseFeePolicy(value: unknown): FeePolicyInput {
  const input = record(value);
  const academicSession = text(input.academicSession, 'Academic session', 40);
  const term = text(input.term, 'Term', 40);
  const effectiveDate = text(input.effectiveDate, 'Effective date', 10);
  const date = new Date(`${effectiveDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || effectiveDate.startsWith('0000-') || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== effectiveDate) {
    return invalid('Effective date must be a valid calendar date.');
  }
  const currency = text(input.currency, 'Currency', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return invalid('Currency must be a three-letter code.');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    return invalid('A fee policy must contain between 1 and 100 items.');
  }
  const items = input.items.map((raw): FeePolicyItem => {
    const item = record(raw);
    const name = text(item.name, 'Fee name', 120);
    if (typeof item.category !== 'string' || !categories.some(category => category === item.category)) {
      return invalid('Fee category is invalid.');
    }
    if (!Number.isSafeInteger(item.amountMinor) || Number(item.amountMinor) <= 0 ||
        typeof item.compulsory !== 'boolean') {
      return invalid('Fee amount and compulsory status are invalid.');
    }
    if (item.category === 'tuition' && !item.compulsory) return invalid('Tuition must be compulsory.');
    const grade = item.grade == null || item.grade === '' ? null : text(item.grade, 'Grade', 80);
    const classId = item.classId == null || item.classId === '' ? null : text(item.classId, 'Class', 36);
    if (classId && !uuid.test(classId)) return invalid('Class ID is invalid.');
    if (typeof item.residence !== 'string' || !residenceTypes.some(type => type === item.residence)) {
      return invalid('Residence is invalid.');
    }
    return {
      name, category: item.category as FeePolicyItem['category'], amountMinor: Number(item.amountMinor),
      compulsory: item.compulsory, grade, classId, residence: item.residence as FeePolicyItem['residence']
    };
  });
  if (!Number.isSafeInteger(items.reduce((sum, item) => sum + item.amountMinor, 0))) {
    return invalid('Fee total exceeds the supported range.');
  }
  return { academicSession, term, effectiveDate, currency, items };
}

export async function assertActiveSchool(client: DatabaseClient, tenantId: string, schoolId: string): Promise<void> {
  if (!uuid.test(schoolId)) invalid('School ID is invalid.');
  const found = await client.query(
    `SELECT 1 FROM production.application_instances
     WHERE tenant_id = $1 AND school_id = $2 AND status IN ('ready_for_activation', 'active') LIMIT 1`,
    [tenantId, schoolId]
  );
  if (!found.rowCount) throw new SchoolFinancePolicyError('NOT_FOUND', 'School instance not found.');
}

export class SchoolFinancePolicies {
  constructor(private readonly pool: DatabasePool) {}

  async listSchools(actor: AuthorizedPrincipal): Promise<Array<{ id: string; name: string }>> {
    assertAuthorized(actor, PERMISSIONS.schoolFinancePoliciesRead);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      const result = await client.query<{ id: string; name: string }>(
        `SELECT school.id, school.name FROM production.schools school
         WHERE school.tenant_id = $1 AND EXISTS (
           SELECT 1 FROM production.application_instances instance
           WHERE instance.tenant_id = school.tenant_id AND instance.school_id = school.id
             AND instance.status IN ('ready_for_activation', 'active')
         ) ORDER BY school.name, school.id`,
        [actor.tenantId]
      );
      return result.rows;
    });
  }

  async list(actor: AuthorizedPrincipal, schoolId: string): Promise<FeePolicyRecord[]> {
    assertAuthorized(actor, PERMISSIONS.schoolFinancePoliciesRead);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<FeePolicyRecord>(
        `SELECT p.id, p.academic_session, p.term, p.version, p.effective_date::text,
                p.currency, p.items, p.created_by, p.created_at, a.approved_by, a.approved_at
         FROM school_finance.fee_policies p
         LEFT JOIN school_finance.fee_policy_approvals a
           ON a.tenant_id = p.tenant_id AND a.policy_id = p.id AND a.school_id = p.school_id
         WHERE p.tenant_id = $1 AND p.school_id = $2
         ORDER BY p.created_at DESC, p.id DESC LIMIT 200`,
        [actor.tenantId, schoolId]
      );
      return result.rows;
    });
  }

  async create(actor: AuthorizedPrincipal, schoolId: string, raw: unknown): Promise<string> {
    assertAuthorized(actor, PERMISSIONS.schoolFinancePoliciesCreate);
    const input = parseFeePolicy(raw);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const classIds = [...new Set(input.items.flatMap(item => item.classId ? [item.classId] : []))];
      if (classIds.length) {
        const classes = await client.query(
          `SELECT id FROM production.classes WHERE tenant_id = $1 AND school_id = $2 AND id = ANY($3::uuid[])`,
          [actor.tenantId, schoolId, classIds]
        );
        if (classes.rowCount !== classIds.length) invalid('A selected class is not in this school.');
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        JSON.stringify([actor.tenantId, schoolId, input.academicSession, input.term])
      ]);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO school_finance.fee_policies
           (tenant_id, school_id, academic_session, term, version, effective_date, currency, items, created_by)
         SELECT $1, $2, $3, $4, coalesce(max(version), 0) + 1, $5::date, $6, $7::jsonb, $8
         FROM school_finance.fee_policies
         WHERE tenant_id = $1 AND school_id = $2 AND academic_session = $3 AND term = $4
         RETURNING id`,
        [actor.tenantId, schoolId, input.academicSession, input.term, input.effectiveDate,
          input.currency, JSON.stringify(input.items), actor.userId]
      );
      return inserted.rows[0].id;
    });
  }

  async approve(actor: AuthorizedPrincipal, schoolId: string, policyId: string): Promise<void> {
    assertAuthorized(actor, PERMISSIONS.schoolFinancePoliciesApprove);
    if (!actor.grants.some(grant => grant.roleCode === 'principal_administrator' &&
        grant.scopes.length === 0 && grant.permissions.includes(PERMISSIONS.schoolFinancePoliciesApprove))) {
      throw new Error('FORBIDDEN');
    }
    if (!uuid.test(policyId)) invalid('Policy ID is invalid.');
    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query(
        `INSERT INTO school_finance.fee_policy_approvals (tenant_id, school_id, policy_id, approved_by)
         SELECT tenant_id, school_id, id, $4 FROM school_finance.fee_policies
         WHERE tenant_id = $1 AND school_id = $2 AND id = $3
         ON CONFLICT (tenant_id, policy_id) DO NOTHING RETURNING policy_id`,
        [actor.tenantId, schoolId, policyId, actor.userId]
      );
      if (!result.rowCount) {
        const exists = await client.query(
          'SELECT 1 FROM school_finance.fee_policies WHERE tenant_id = $1 AND school_id = $2 AND id = $3',
          [actor.tenantId, schoolId, policyId]
        );
        if (exists.rowCount) throw new SchoolFinancePolicyError('CONFLICT', 'Policy is already approved.');
        throw new SchoolFinancePolicyError('NOT_FOUND', 'Policy not found.');
      }
    });
  }
}
