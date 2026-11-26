import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from './postgres';
import { withTenantTransaction } from './tenantContext';
import type {
  EffectiveFeePolicyResolution,
  FeePolicyInput,
  FeePolicyItem,
  FeePolicyRecord,
  FeePolicySupersessionInput
} from '../../packages/shared-types/src/schoolFinance';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = ['tuition', 'levy', 'sundry', 'elective'] as const;
const residenceTypes = ['all', 'day', 'boarding'] as const;
const PRINCIPAL_APPROVAL_ROLES: readonly string[] = ['principal_administrator', 'principal'];

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

export function parseCalendarDate(value: unknown, label = 'Date'): string {
  const iso = text(value, label, 10);
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.startsWith('0000-') || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== iso) {
    return invalid(`${label} must be a valid calendar date.`);
  }
  return iso;
}

export function hasSchoolFinancePermission(
  actor: AuthorizedPrincipal | undefined,
  permission: string,
  schoolId: string,
  allowedRoles?: readonly string[]
): boolean {
  if (!actor) return false;
  const normalizedSchoolId = schoolId.toLowerCase();
  return actor.grants.some(grant => {
    if (!grant.permissions.includes(permission)) return false;
    if (allowedRoles && !allowedRoles.includes(grant.roleCode)) return false;
    if (grant.scopes.length === 0) return true;
    return grant.scopes.some(scope =>
      (scope.resourceType === 'school' || scope.resourceType === 'application_instance') &&
      scope.resourceId.toLowerCase() === normalizedSchoolId
    );
  });
}

export function assertSchoolFinancePermission(
  actor: AuthorizedPrincipal | undefined,
  permission: string,
  schoolId: string,
  allowedRoles?: readonly string[]
): asserts actor is AuthorizedPrincipal {
  if (!hasSchoolFinancePermission(actor, permission, schoolId, allowedRoles)) {
    throw new Error('FORBIDDEN');
  }
}

export function listScopedSchoolIds(actor: AuthorizedPrincipal, permission: string): string[] | null {
  const grants = actor.grants.filter(g => g.permissions.includes(permission));
  if (grants.length === 0) throw new Error('FORBIDDEN');
  if (grants.some(g => g.scopes.length === 0)) return null;
  const ids = new Set<string>();
  for (const grant of grants) {
    for (const scope of grant.scopes) {
      if ((scope.resourceType === 'school' || scope.resourceType === 'application_instance') &&
          uuid.test(scope.resourceId)) {
        ids.add(scope.resourceId.toLowerCase());
      }
    }
  }
  return [...ids];
}

export function parseFeePolicy(value: unknown): FeePolicyInput {
  const input = record(value);
  const academicSession = text(input.academicSession, 'Academic session', 40);
  const term = text(input.term, 'Term', 40);
  const effectiveDate = parseCalendarDate(input.effectiveDate, 'Effective date');
  const currency = text(input.currency, 'Currency', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return invalid('Currency must be a three-letter code.');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    return invalid('A fee policy must contain between 1 and 100 items.');
  }
  const seenKeys = new Set<string>();
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
    const dedupKey = `${name.toLowerCase()}|${item.category}|${(grade || '').toLowerCase()}|${(classId || '').toLowerCase()}|${item.residence}`;
    if (seenKeys.has(dedupKey)) {
      return invalid(`Duplicate fee item '${name}' for the same targeting scope is not allowed.`);
    }
    seenKeys.add(dedupKey);
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

export function selectEffectivePolicyId(
  policies: readonly FeePolicyRecord[],
  academicSession: string,
  term: string,
  asOfDate: string
): FeePolicyRecord | null {
  const candidates = policies.filter(policy =>
    policy.academic_session === academicSession &&
    policy.term === term &&
    Boolean(policy.approved_at) &&
    !policy.superseded_at &&
    policy.effective_date.slice(0, 10) <= asOfDate
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const dateCmp = b.effective_date.slice(0, 10).localeCompare(a.effective_date.slice(0, 10));
    if (dateCmp !== 0) return dateCmp;
    return b.version - a.version;
  });
  return candidates[0];
}

function annotatePolicies(rows: FeePolicyRecord[], todayIso: string): FeePolicyRecord[] {
  const effectiveByTermKey = new Map<string, string>();
  const terms = new Set(rows.map(r => `${r.academic_session}\0${r.term}`));
  for (const key of terms) {
    const [session, term] = key.split('\0');
    const selected = selectEffectivePolicyId(rows, session, term, todayIso);
    if (selected) effectiveByTermKey.set(key, selected.id);
  }
  return rows.map(row => {
    const key = `${row.academic_session}\0${row.term}`;
    return {
      ...row,
      approval_status: row.approved_at ? 'approved' : 'pending_approval',
      superseded_at: row.superseded_at ?? null,
      superseded_by: row.superseded_by ?? null,
      superseded_by_policy_id: row.superseded_by_policy_id ?? null,
      supersession_action: row.supersession_action ?? null,
      supersession_reason: row.supersession_reason ?? null,
      is_currently_effective: effectiveByTermKey.get(key) === row.id
    };
  });
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
    const allowedIds = listScopedSchoolIds(actor, PERMISSIONS.schoolFinancePoliciesRead);
    if (allowedIds && allowedIds.length === 0) return [];
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      if (allowedIds) {
        const result = await client.query<{ id: string; name: string }>(
          `SELECT school.id, school.name FROM production.schools school
           WHERE school.tenant_id = $1
             AND (
               school.id = ANY($2::uuid[])
               OR EXISTS (
                 SELECT 1 FROM production.application_instances instance
                 WHERE instance.tenant_id = school.tenant_id AND instance.school_id = school.id
                   AND instance.status IN ('ready_for_activation', 'active')
                   AND instance.id = ANY($2::uuid[])
               )
             )
             AND EXISTS (
               SELECT 1 FROM production.application_instances instance
               WHERE instance.tenant_id = school.tenant_id AND instance.school_id = school.id
                 AND instance.status IN ('ready_for_activation', 'active')
             )
           ORDER BY school.name, school.id`,
          [actor.tenantId, allowedIds]
        );
        return result.rows;
      }
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

  async list(actor: AuthorizedPrincipal, schoolId: string, asOfDate?: string): Promise<FeePolicyRecord[]> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesRead, schoolId);
    const todayIso = asOfDate ? parseCalendarDate(asOfDate, 'Effective resolution date') : new Date().toISOString().slice(0, 10);
    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<FeePolicyRecord>(
        `SELECT p.id, p.academic_session, p.term, p.version, p.effective_date::text,
                p.currency, p.items, p.created_by, p.created_at, a.approved_by, a.approved_at,
                s.acted_at AS superseded_at, s.acted_by AS superseded_by,
                s.superseded_by_policy_id, s.action AS supersession_action, s.reason AS supersession_reason
         FROM school_finance.fee_policies p
         LEFT JOIN school_finance.fee_policy_approvals a
           ON a.tenant_id = p.tenant_id AND a.policy_id = p.id AND a.school_id = p.school_id
         LEFT JOIN school_finance.fee_policy_supersessions s
           ON s.tenant_id = p.tenant_id AND s.policy_id = p.id AND s.school_id = p.school_id
         WHERE p.tenant_id = $1 AND p.school_id = $2
         ORDER BY p.created_at DESC, p.id DESC LIMIT 200`,
        [actor.tenantId, schoolId]
      );
      return annotatePolicies(result.rows, todayIso);
    });
  }

  async resolveEffectivePolicy(
    actor: AuthorizedPrincipal,
    schoolId: string,
    query: { academicSession: unknown; term: unknown; asOfDate?: unknown }
  ): Promise<EffectiveFeePolicyResolution> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesRead, schoolId);
    const academicSession = text(query.academicSession, 'Academic session', 40);
    const term = text(query.term, 'Term', 40);
    const asOfDate = query.asOfDate !== undefined && query.asOfDate !== ''
      ? parseCalendarDate(query.asOfDate, 'Effective resolution date')
      : new Date().toISOString().slice(0, 10);

    return withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const result = await client.query<FeePolicyRecord>(
        `SELECT p.id, p.academic_session, p.term, p.version, p.effective_date::text,
                p.currency, p.items, p.created_by, p.created_at, a.approved_by, a.approved_at,
                NULL::timestamptz AS superseded_at, NULL::uuid AS superseded_by,
                NULL::uuid AS superseded_by_policy_id, NULL::text AS supersession_action,
                NULL::text AS supersession_reason
         FROM school_finance.fee_policies p
         INNER JOIN school_finance.fee_policy_approvals a
           ON a.tenant_id = p.tenant_id AND a.policy_id = p.id AND a.school_id = p.school_id
         LEFT JOIN school_finance.fee_policy_supersessions s
           ON s.tenant_id = p.tenant_id AND s.policy_id = p.id AND s.school_id = p.school_id
         WHERE p.tenant_id = $1
           AND p.school_id = $2
           AND p.academic_session = $3
           AND p.term = $4
           AND s.policy_id IS NULL
           AND p.effective_date <= $5::date
         ORDER BY p.effective_date DESC, p.version DESC
         LIMIT 1`,
        [actor.tenantId, schoolId, academicSession, term, asOfDate]
      );
      const row = result.rows[0];
      if (!row) {
        return {
          schoolId,
          academicSession,
          term,
          asOfDate,
          status: 'NO_EFFECTIVE_APPROVED_POLICY',
          effectivePolicy: null
        };
      }
      return {
        schoolId,
        academicSession,
        term,
        asOfDate,
        status: 'EFFECTIVE_POLICY_FOUND',
        effectivePolicy: {
          ...row,
          approval_status: 'approved',
          superseded_at: null,
          superseded_by: null,
          superseded_by_policy_id: null,
          supersession_action: null,
          supersession_reason: null,
          is_currently_effective: true
        }
      };
    });
  }

  async create(actor: AuthorizedPrincipal, schoolId: string, raw: unknown): Promise<string> {
    assertSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesCreate, schoolId);
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
      const inserted = await client.query<{ id: string; version: number }>(
        `INSERT INTO school_finance.fee_policies
           (tenant_id, school_id, academic_session, term, version, effective_date, currency, items, created_by)
         SELECT $1, $2, $3, $4, coalesce(max(version), 0) + 1, $5::date, $6, $7::jsonb, $8
         FROM school_finance.fee_policies
         WHERE tenant_id = $1 AND school_id = $2 AND academic_session = $3 AND term = $4
         RETURNING id, version`,
        [actor.tenantId, schoolId, input.academicSession, input.term, input.effectiveDate,
          input.currency, JSON.stringify(input.items), actor.userId]
      );
      const created = inserted.rows[0];
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_fee_policy_created', $3::jsonb)`,
        [
          actor.tenantId,
          actor.userId,
          JSON.stringify({
            schoolId,
            policyId: created.id,
            academicSession: input.academicSession,
            term: input.term,
            version: created.version,
            effectiveDate: input.effectiveDate,
            currency: input.currency,
            itemCount: input.items.length
          })
        ]
      );
      return created.id;
    });
  }

  async approve(actor: AuthorizedPrincipal, schoolId: string, policyId: string): Promise<void> {
    assertSchoolFinancePermission(
      actor,
      PERMISSIONS.schoolFinancePoliciesApprove,
      schoolId,
      PRINCIPAL_APPROVAL_ROLES
    );
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
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_fee_policy_approved', $3::jsonb)`,
        [actor.tenantId, actor.userId, JSON.stringify({ schoolId, policyId })]
      );
    });
  }

  async supersede(
    actor: AuthorizedPrincipal,
    schoolId: string,
    policyId: string,
    raw: unknown
  ): Promise<void> {
    const canSupersede =
      hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesApprove, schoolId, PRINCIPAL_APPROVAL_ROLES) ||
      hasSchoolFinancePermission(actor, PERMISSIONS.schoolFinancePoliciesSupersede, schoolId, PRINCIPAL_APPROVAL_ROLES);
    if (!canSupersede) throw new Error('FORBIDDEN');
    if (!uuid.test(policyId)) invalid('Policy ID is invalid.');
    const body = record(raw);
    const action = body.action;
    if (action !== 'superseded' && action !== 'retired') {
      invalid('Supersession action must be superseded or retired.');
    }
    const reason = text(body.reason, 'Supersession reason', 500);
    if (reason.length < 3) invalid('Supersession reason must be at least 3 characters.');
    const supersededByPolicyId = action === 'superseded'
      ? text(body.supersededByPolicyId, 'Replacement policy ID', 36)
      : null;
    if (supersededByPolicyId !== null) {
      if (!uuid.test(supersededByPolicyId)) invalid('Replacement policy ID is invalid.');
      if (supersededByPolicyId.toLowerCase() === policyId.toLowerCase()) {
        invalid('A fee policy cannot supersede itself.');
      }
    }

    await withTenantTransaction(this.pool, actor.tenant, async client => {
      await assertActiveSchool(client, actor.tenantId, schoolId);
      const targetRes = await client.query<{
        id: string;
        academic_session: string;
        term: string;
        approved_at: Date | null;
        superseded_at: Date | null;
      }>(
        `SELECT p.id, p.academic_session, p.term, a.approved_at, s.acted_at AS superseded_at
         FROM school_finance.fee_policies p
         LEFT JOIN school_finance.fee_policy_approvals a
           ON a.tenant_id = p.tenant_id AND a.policy_id = p.id AND a.school_id = p.school_id
         LEFT JOIN school_finance.fee_policy_supersessions s
           ON s.tenant_id = p.tenant_id AND s.policy_id = p.id AND s.school_id = p.school_id
         WHERE p.tenant_id = $1 AND p.school_id = $2 AND p.id = $3`,
        [actor.tenantId, schoolId, policyId]
      );
      const target = targetRes.rows[0];
      if (!target) throw new SchoolFinancePolicyError('NOT_FOUND', 'Policy not found.');
      if (!target.approved_at) {
        invalid('Only approved fee policies can be superseded or retired.');
      }
      if (target.superseded_at) {
        throw new SchoolFinancePolicyError('CONFLICT', 'Policy has already been superseded or retired.');
      }

      if (supersededByPolicyId) {
        const replacementRes = await client.query<{
          id: string;
          academic_session: string;
          term: string;
          approved_at: Date | null;
          superseded_at: Date | null;
        }>(
          `SELECT p.id, p.academic_session, p.term, a.approved_at, s.acted_at AS superseded_at
           FROM school_finance.fee_policies p
           LEFT JOIN school_finance.fee_policy_approvals a
             ON a.tenant_id = p.tenant_id AND a.policy_id = p.id AND a.school_id = p.school_id
           LEFT JOIN school_finance.fee_policy_supersessions s
             ON s.tenant_id = p.tenant_id AND s.policy_id = p.id AND s.school_id = p.school_id
           WHERE p.tenant_id = $1 AND p.school_id = $2 AND p.id = $3`,
          [actor.tenantId, schoolId, supersededByPolicyId]
        );
        const replacement = replacementRes.rows[0];
        if (!replacement) {
          throw new SchoolFinancePolicyError('NOT_FOUND', 'Replacement policy not found in this school.');
        }
        if (replacement.academic_session !== target.academic_session || replacement.term !== target.term) {
          invalid('Replacement policy must belong to the same academic session and term.');
        }
        if (!replacement.approved_at) {
          invalid('Replacement policy must be approved before superseding an active policy.');
        }
        if (replacement.superseded_at) {
          throw new SchoolFinancePolicyError('CONFLICT', 'Replacement policy is already superseded or retired.');
        }
      }

      const inserted = await client.query(
        `INSERT INTO school_finance.fee_policy_supersessions
           (tenant_id, school_id, policy_id, superseded_by_policy_id, action, reason, acted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, policy_id) DO NOTHING
         RETURNING id`,
        [actor.tenantId, schoolId, policyId, supersededByPolicyId, action, reason, actor.userId]
      );
      if (!inserted.rowCount) {
        throw new SchoolFinancePolicyError('CONFLICT', 'Policy has already been superseded or retired.');
      }

      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_fee_policy_superseded', $3::jsonb)`,
        [
          actor.tenantId,
          actor.userId,
          JSON.stringify({
            schoolId,
            policyId,
            action,
            supersededByPolicyId,
            reason
          })
        ]
      );
    });
  }
}

export type FeePolicySupersessionPayload = FeePolicySupersessionInput;
