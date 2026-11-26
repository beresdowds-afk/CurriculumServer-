import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express, { type RequestHandler } from 'express';
import { createAuthorizedPrincipal, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { createApiCapabilityGateMiddleware } from '../capabilities/productionCapabilityMiddleware';
import type { DatabaseClient, DatabasePool } from './postgres';
import { createSchoolFinanceRouter } from './schoolFinanceRoutes';
import { SchoolSettlementAccounts } from './schoolSettlementAccounts';
import { createSettlementProviderAdapters } from './settlementProviderAdapters';
import { principal } from './testSupport';

interface StoredPolicy {
  id: string;
  tenant_id: string;
  school_id: string;
  academic_session: string;
  term: string;
  version: number;
  effective_date: string;
  currency: string;
  items: unknown[];
  created_by: string;
  created_at: string;
}

interface StoredApproval {
  tenant_id: string;
  school_id: string;
  policy_id: string;
  approved_by: string;
  approved_at: string;
}

interface StoredSupersession {
  id: string;
  tenant_id: string;
  school_id: string;
  policy_id: string;
  superseded_by_policy_id: string | null;
  action: 'superseded' | 'retired';
  reason: string;
  acted_by: string;
  acted_at: string;
}

interface StoredSettlementRequest {
  id: string;
  tenant_id: string;
  school_id: string;
  provider: 'opay' | 'paystack' | 'flutterwave';
  encrypted_details: string;
  account_last_four: string;
  requested_by: string;
  requested_at: string;
}

interface StoredSettlementState {
  tenant_id: string;
  school_id: string;
  request_id: string;
  state: string;
  is_default: boolean;
  replaced_by_request_id: string | null;
  encrypted_provider_reference: string | null;
  verified_account_name: string | null;
  verification_provider_status: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  verified_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
  replaced_at: string | null;
  updated_by: string | null;
}

function createFinanceMockPool(seed: {
  tenants: string[];
  schools: Array<{ id: string; tenantId: string; name: string }>;
  classes: Array<{ id: string; tenantId: string; schoolId: string }>;
}): { pool: DatabasePool; auditEvents: Array<{ tenantId: string; actor: string; action: string; details: Record<string, unknown> }> } {
  const policies: StoredPolicy[] = [];
  const approvals: StoredApproval[] = [];
  const supersessions: StoredSupersession[] = [];
  const settlementRequests: StoredSettlementRequest[] = [];
  const settlementApprovals: Array<{ tenant_id: string; school_id: string; request_id: string; approved_by: string; approved_at: string }> = [];
  const settlementStates: StoredSettlementState[] = [];
  const settlementEvents: Array<{
    id: string; tenant_id: string; school_id: string; request_id: string;
    event_type: string; from_state: string | null; to_state: string;
    actor_id: string | null; idempotency_key: string | null; details: Record<string, unknown>; created_at: string;
  }> = [];
  const auditEvents: Array<{ tenantId: string; actor: string; action: string; details: Record<string, unknown> }> = [];

  const client = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: R[]; rowCount: number }> {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK' || normalized.startsWith('SELECT set_config(') || normalized.startsWith('SELECT pg_advisory_xact_lock(')) {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.includes('FROM production.schools school')) {
        const tenantId = params[0] as string;
        const allowedIds = params[1] as string[] | undefined;
        const rows = seed.schools
          .filter(s => s.tenantId === tenantId && (!allowedIds || allowedIds.includes(s.id.toLowerCase())))
          .map(s => ({ id: s.id, name: s.name }));
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM production.application_instances')) {
        const [tenantId, schoolId] = params as [string, string];
        const found = seed.schools.some(s => s.tenantId === tenantId && s.id === schoolId);
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM production.classes')) {
        const [tenantId, schoolId, classIds] = params as [string, string, string[]];
        const rows = seed.classes
          .filter(c => c.tenantId === tenantId && c.schoolId === schoolId && classIds.includes(c.id))
          .map(c => ({ id: c.id }));
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.startsWith('INSERT INTO production.audit_events')) {
        if (params.length === 4) {
          const [tenantId, actor, action, details] = params as [string, string, string, string];
          auditEvents.push({ tenantId, actor, action, details: JSON.parse(details) });
        } else {
          const [tenantId, actor, details] = params as [string, string, string];
          const actionMatch = normalized.match(/VALUES \(\$1, \$2, '([^']+)', \$3/);
          auditEvents.push({ tenantId, actor, action: actionMatch ? actionMatch[1] : 'unknown', details: JSON.parse(details) });
        }
        return { rows: [], rowCount: 1 };
      }

      // Fee policies queries
      if (normalized.startsWith('INSERT INTO school_finance.fee_policies')) {
        const [tenantId, schoolId, academicSession, term, effectiveDate, currency, itemsJson, createdBy] = params as [
          string, string, string, string, string, string, string, string
        ];
        const existingVersions = policies
          .filter(p => p.tenant_id === tenantId && p.school_id === schoolId && p.academic_session === academicSession && p.term === term)
          .map(p => p.version);
        const version = (existingVersions.length ? Math.max(...existingVersions) : 0) + 1;
        const id = randomUUID();
        policies.push({
          id, tenant_id: tenantId, school_id: schoolId, academic_session: academicSession, term,
          version, effective_date: effectiveDate, currency, items: JSON.parse(itemsJson),
          created_by: createdBy, created_at: new Date().toISOString()
        });
        return { rows: [{ id, version }] as R[], rowCount: 1 };
      }
      if (normalized.includes('INNER JOIN school_finance.fee_policy_approvals a') && normalized.includes('AND p.academic_session = $3')) {
        const [tenantId, schoolId, academicSession, term, asOfDate] = params as [string, string, string, string, string];
        const candidates = policies
          .filter(p => {
            if (p.tenant_id !== tenantId || p.school_id !== schoolId || p.academic_session !== academicSession || p.term !== term) return false;
            if (p.effective_date > asOfDate) return false;
            const app = approvals.find(a => a.tenant_id === tenantId && a.school_id === schoolId && a.policy_id === p.id);
            const sup = supersessions.find(s => s.tenant_id === tenantId && s.school_id === schoolId && s.policy_id === p.id);
            return Boolean(app) && !sup;
          })
          .sort((a, b) => b.effective_date.localeCompare(a.effective_date) || b.version - a.version);
        const chosen = candidates[0];
        if (!chosen) return { rows: [], rowCount: 0 };
        const app = approvals.find(a => a.policy_id === chosen.id)!;
        return {
          rows: [{ ...chosen, approved_by: app.approved_by, approved_at: app.approved_at }] as R[],
          rowCount: 1
        };
      }
      if (normalized.includes('FROM school_finance.fee_policies p') && normalized.includes('WHERE p.tenant_id = $1 AND p.school_id = $2 ORDER BY')) {
        const [tenantId, schoolId] = params as [string, string];
        const rows = policies
          .filter(p => p.tenant_id === tenantId && p.school_id === schoolId)
          .slice()
          .reverse()
          .map(p => {
            const app = approvals.find(a => a.tenant_id === tenantId && a.school_id === schoolId && a.policy_id === p.id);
            const sup = supersessions.find(s => s.tenant_id === tenantId && s.school_id === schoolId && s.policy_id === p.id);
            return {
              ...p,
              approved_by: app?.approved_by ?? null,
              approved_at: app?.approved_at ?? null,
              superseded_at: sup?.acted_at ?? null,
              superseded_by: sup?.acted_by ?? null,
              superseded_by_policy_id: sup?.superseded_by_policy_id ?? null,
              supersession_action: sup?.action ?? null,
              supersession_reason: sup?.reason ?? null
            };
          });
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.startsWith('INSERT INTO school_finance.fee_policy_approvals')) {
        const [tenantId, schoolId, policyId, approvedBy] = params as [string, string, string, string];
        const pol = policies.find(p => p.tenant_id === tenantId && p.school_id === schoolId && p.id === policyId);
        if (!pol || approvals.some(a => a.tenant_id === tenantId && a.policy_id === policyId)) {
          return { rows: [], rowCount: 0 };
        }
        approvals.push({ tenant_id: tenantId, school_id: schoolId, policy_id: policyId, approved_by: approvedBy, approved_at: new Date().toISOString() });
        return { rows: [{ policy_id: policyId }] as R[], rowCount: 1 };
      }
      if (normalized === 'SELECT 1 FROM school_finance.fee_policies WHERE tenant_id = $1 AND school_id = $2 AND id = $3') {
        const [tenantId, schoolId, policyId] = params as [string, string, string];
        const exists = policies.some(p => p.tenant_id === tenantId && p.school_id === schoolId && p.id === policyId);
        return { rows: (exists ? [{ '?column?': 1 }] : []) as R[], rowCount: exists ? 1 : 0 };
      }
      if (normalized.includes('FROM school_finance.fee_policies p') && normalized.includes('WHERE p.tenant_id = $1 AND p.school_id = $2 AND p.id = $3')) {
        const [tenantId, schoolId, policyId] = params as [string, string, string];
        const pol = policies.find(p => p.tenant_id === tenantId && p.school_id === schoolId && p.id === policyId);
        if (!pol) return { rows: [], rowCount: 0 };
        const app = approvals.find(a => a.tenant_id === tenantId && a.policy_id === pol.id);
        const sup = supersessions.find(s => s.tenant_id === tenantId && s.policy_id === pol.id);
        return {
          rows: [{
            id: pol.id,
            academic_session: pol.academic_session,
            term: pol.term,
            approved_at: app ? new Date(app.approved_at) : null,
            superseded_at: sup ? new Date(sup.acted_at) : null
          }] as R[],
          rowCount: 1
        };
      }
      if (normalized.startsWith('INSERT INTO school_finance.fee_policy_supersessions')) {
        const [tenantId, schoolId, policyId, supersededByPolicyId, action, reason, actedBy] = params as [
          string, string, string, string | null, 'superseded' | 'retired', string, string
        ];
        if (supersessions.some(s => s.tenant_id === tenantId && s.policy_id === policyId)) {
          return { rows: [], rowCount: 0 };
        }
        const id = randomUUID();
        supersessions.push({
          id, tenant_id: tenantId, school_id: schoolId, policy_id: policyId,
          superseded_by_policy_id: supersededByPolicyId, action, reason, acted_by: actedBy,
          acted_at: new Date().toISOString()
        });
        return { rows: [{ id }] as R[], rowCount: 1 };
      }

      // Settlement accounts queries
      if (normalized.startsWith('INSERT INTO school_finance.settlement_account_requests')) {
        const [tenantId, schoolId, id, provider, encryptedDetails, lastFour, requestedBy] = params as [
          string, string, string, 'opay' | 'paystack' | 'flutterwave', string, string, string
        ];
        settlementRequests.push({
          id, tenant_id: tenantId, school_id: schoolId, provider, encrypted_details: encryptedDetails,
          account_last_four: lastFour, requested_by: requestedBy, requested_at: new Date().toISOString()
        });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO school_finance.settlement_account_states') && normalized.includes("'pending_proprietor_approval'")) {
        const [tenantId, schoolId, requestId, updatedBy] = params as [string, string, string, string];
        settlementStates.push({
          tenant_id: tenantId, school_id: schoolId, request_id: requestId, state: 'pending_proprietor_approval',
          is_default: false, replaced_by_request_id: null, encrypted_provider_reference: null,
          verified_account_name: null, verification_provider_status: null, last_error_code: null,
          last_error_message: null, verified_at: null, activated_at: null, suspended_at: null,
          revoked_at: null, rejected_at: null, replaced_at: null, updated_by: updatedBy
        });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO school_finance.settlement_account_events')) {
        const [tenantId, schoolId, requestId, eventType, fromState, toState, actorId, idempotencyKey, detailsJson] = params as [
          string, string, string, string, string | null, string, string | null, string | null, string
        ];
        settlementEvents.push({
          id: randomUUID(), tenant_id: tenantId, school_id: schoolId, request_id: requestId,
          event_type: eventType, from_state: fromState, to_state: toState, actor_id: actorId,
          idempotency_key: idempotencyKey, details: JSON.parse(detailsJson), created_at: new Date().toISOString()
        });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.includes('FROM school_finance.settlement_account_requests r') && normalized.includes('WHERE r.tenant_id = $1 AND r.school_id = $2 ORDER BY')) {
        const [tenantId, schoolId] = params as [string, string];
        const rows = settlementRequests
          .filter(r => r.tenant_id === tenantId && r.school_id === schoolId)
          .slice().reverse()
          .map(r => {
            const app = settlementApprovals.find(a => a.tenant_id === tenantId && a.request_id === r.id);
            const st = settlementStates.find(s => s.tenant_id === tenantId && s.request_id === r.id);
            return {
              ...r,
              approved_by: app?.approved_by ?? null,
              approved_at: app?.approved_at ?? null,
              state: st?.state ?? null,
              is_default: st?.is_default ?? false,
              replaced_by_request_id: st?.replaced_by_request_id ?? null,
              verified_account_name: st?.verified_account_name ?? null,
              verification_provider_status: st?.verification_provider_status ?? null,
              has_provider_reference: Boolean(st?.encrypted_provider_reference),
              last_error_code: st?.last_error_code ?? null,
              last_error_message: st?.last_error_message ?? null,
              verified_at: st?.verified_at ?? null,
              activated_at: st?.activated_at ?? null,
              suspended_at: st?.suspended_at ?? null,
              revoked_at: st?.revoked_at ?? null,
              rejected_at: st?.rejected_at ?? null,
              replaced_at: st?.replaced_at ?? null
            };
          });
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes("WHERE r.tenant_id = $1 AND r.school_id = $2 AND s.state = 'active' AND s.is_default = true")) {
        const [tenantId, schoolId] = params as [string, string];
        const st = settlementStates.find(s => s.tenant_id === tenantId && s.school_id === schoolId && s.state === 'active' && s.is_default);
        if (!st) return { rows: [], rowCount: 0 };
        const reqRow = settlementRequests.find(r => r.id === st.request_id)!;
        const app = settlementApprovals.find(a => a.request_id === st.request_id);
        return {
          rows: [{
            ...reqRow, ...st, approved_by: app?.approved_by ?? null, approved_at: app?.approved_at ?? null,
            has_provider_reference: Boolean(st.encrypted_provider_reference)
          }] as R[],
          rowCount: 1
        };
      }
      if (normalized.includes('SELECT encrypted_details FROM school_finance.settlement_account_requests')) {
        const [tenantId, schoolId, id] = params as [string, string, string];
        const found = settlementRequests.find(r => r.tenant_id === tenantId && r.school_id === schoolId && r.id === id);
        return { rows: (found ? [{ encrypted_details: found.encrypted_details }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('SELECT 1 FROM school_finance.settlement_account_requests WHERE tenant_id = $1')) {
        const [tenantId, schoolId, id] = params as [string, string, string];
        const found = settlementRequests.some(r => r.tenant_id === tenantId && r.school_id === schoolId && r.id === id);
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM school_finance.settlement_account_events WHERE tenant_id = $1 AND school_id = $2 AND idempotency_key = $3')) {
        const [tenantId, schoolId, key] = params as [string, string, string];
        const found = settlementEvents.some(e => e.tenant_id === tenantId && e.school_id === schoolId && e.idempotency_key === key);
        return { rows: (found ? [{ '?column?': 1 }] : []) as R[], rowCount: found ? 1 : 0 };
      }
      if (normalized.includes('FROM school_finance.settlement_account_events WHERE tenant_id = $1 AND school_id = $2 AND request_id = $3')) {
        const [tenantId, schoolId, id] = params as [string, string, string];
        const rows = settlementEvents.filter(e => e.tenant_id === tenantId && e.school_id === schoolId && e.request_id === id);
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM school_finance.settlement_account_requests r') && normalized.includes('WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = ANY($3::uuid[])')) {
        const [tenantId, schoolId, ids] = params as [string, string, string[]];
        const rows = settlementRequests
          .filter(r => r.tenant_id === tenantId && r.school_id === schoolId && ids.includes(r.id))
          .map(r => {
            const st = settlementStates.find(s => s.request_id === r.id);
            return { request_id: r.id, state: st?.state ?? null, verified_at: st?.verified_at ? new Date(st.verified_at) : null };
          });
        return { rows: rows as R[], rowCount: rows.length };
      }
      if (normalized.includes('FROM school_finance.settlement_account_requests r') && normalized.includes('WHERE r.tenant_id = $1 AND r.school_id = $2 AND r.id = $3')) {
        const [tenantId, schoolId, id] = params as [string, string, string];
        const r = settlementRequests.find(item => item.tenant_id === tenantId && item.school_id === schoolId && item.id === id);
        if (!r) return { rows: [], rowCount: 0 };
        const app = settlementApprovals.find(a => a.request_id === r.id);
        const st = settlementStates.find(s => s.request_id === r.id);
        return {
          rows: [{
            ...r,
            approved_by: app?.approved_by ?? null,
            approved_at: app ? new Date(app.approved_at) : null,
            state: st?.state ?? null,
            is_default: st?.is_default ?? false,
            replaced_by_request_id: st?.replaced_by_request_id ?? null,
            verified_account_name: st?.verified_account_name ?? null,
            verification_provider_status: st?.verification_provider_status ?? null,
            has_provider_reference: Boolean(st?.encrypted_provider_reference),
            last_error_code: st?.last_error_code ?? null,
            last_error_message: st?.last_error_message ?? null,
            verified_at: st?.verified_at ? new Date(st.verified_at) : null,
            activated_at: st?.activated_at ?? null,
            suspended_at: st?.suspended_at ?? null,
            revoked_at: st?.revoked_at ?? null,
            rejected_at: st?.rejected_at ?? null,
            replaced_at: st?.replaced_at ?? null
          }] as R[],
          rowCount: 1
        };
      }
      if (normalized.startsWith('INSERT INTO school_finance.settlement_account_approvals')) {
        const [tenantId, schoolId, id, approvedBy] = params as [string, string, string, string];
        if (settlementApprovals.some(a => a.tenant_id === tenantId && a.request_id === id)) {
          return { rows: [], rowCount: 0 };
        }
        settlementApprovals.push({ tenant_id: tenantId, school_id: schoolId, request_id: id, approved_by: approvedBy, approved_at: new Date().toISOString() });
        return { rows: [{ request_id: id }] as R[], rowCount: 1 };
      }
      if (normalized.startsWith('INSERT INTO school_finance.settlement_account_states')) {
        const [tenantId, schoolId, id] = params as [string, string, string];
        let st = settlementStates.find(s => s.tenant_id === tenantId && s.request_id === id);
        if (!st) {
          st = {
            tenant_id: tenantId, school_id: schoolId, request_id: id, state: 'pending_proprietor_approval',
            is_default: false, replaced_by_request_id: null, encrypted_provider_reference: null,
            verified_account_name: null, verification_provider_status: null, last_error_code: null,
            last_error_message: null, verified_at: null, activated_at: null, suspended_at: null,
            revoked_at: null, rejected_at: null, replaced_at: null, updated_by: null
          };
          settlementStates.push(st);
        }
        if (normalized.includes("'approved_awaiting_verification'")) st.state = 'approved_awaiting_verification';
        else if (normalized.includes("'verification_in_progress'")) {
          st.state = 'verification_in_progress';
          st.last_error_code = null;
          st.last_error_message = null;
        } else if (normalized.includes("'rejected'")) {
          st.state = 'rejected';
          st.is_default = false;
          st.rejected_at = new Date().toISOString();
          st.last_error_message = params[3] as string;
        } else if (normalized.includes("'revoked'")) {
          st.state = 'revoked';
          st.is_default = false;
          st.revoked_at = new Date().toISOString();
          st.last_error_message = params[3] as string;
        }
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith('UPDATE school_finance.settlement_account_states')) {
        if (normalized.includes("WHERE tenant_id = $1 AND school_id = $2 AND state = 'active' AND is_default = true AND request_id <> $3")) {
          const [tenantId, schoolId, nextId, updatedBy] = params as [string, string, string, string];
          const replaced = settlementStates.filter(
            s => s.tenant_id === tenantId && s.school_id === schoolId && s.state === 'active' && s.is_default && s.request_id !== nextId
          );
          for (const st of replaced) {
            st.state = 'replaced';
            st.is_default = false;
            st.replaced_by_request_id = nextId;
            st.replaced_at = new Date().toISOString();
            st.updated_by = updatedBy;
          }
          return { rows: replaced.map(r => ({ request_id: r.request_id })) as R[], rowCount: replaced.length };
        }
        const [tenantId, schoolId, id] = params as [string, string, string];
        const st = settlementStates.find(s => s.tenant_id === tenantId && s.school_id === schoolId && s.request_id === id);
        if (!st) return { rows: [], rowCount: 0 };
        if (normalized.includes("SET state = 'verified'")) {
          st.state = 'verified';
          st.encrypted_provider_reference = params[3] as string;
          st.verified_account_name = params[4] as string;
          st.verification_provider_status = params[5] as string;
          st.last_error_code = null;
          st.last_error_message = null;
          st.verified_at = new Date().toISOString();
        } else if (normalized.includes("SET state = 'approved_awaiting_verification'")) {
          st.state = 'approved_awaiting_verification';
          st.last_error_code = params[3] as string;
          st.last_error_message = params[4] as string;
        } else if (normalized.includes("SET state = 'active'")) {
          st.state = 'active';
          st.is_default = true;
          st.activated_at = new Date().toISOString();
        } else if (normalized.includes("SET state = 'suspended'")) {
          st.state = 'suspended';
          st.is_default = false;
          st.suspended_at = new Date().toISOString();
          st.last_error_message = params[3] as string;
        } else if (normalized.includes("SET state = 'replaced'")) {
          st.state = 'replaced';
          st.is_default = false;
          st.replaced_by_request_id = params[3] as string;
          st.replaced_at = new Date().toISOString();
        } else if (normalized.includes('SET state = $4')) {
          st.state = params[3] as string;
          if (params[4]) st.encrypted_provider_reference = params[4] as string;
          if (params[5]) st.verified_account_name = params[5] as string;
          st.verification_provider_status = params[6] as string;
          if (params[7] === true && !st.verified_at) st.verified_at = new Date().toISOString();
          if (params[7] === false) {
            st.last_error_code = 'PROVIDER_REJECTED';
            st.last_error_message = params[8] as string;
          } else {
            st.last_error_code = null;
            st.last_error_message = null;
          }
        }
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unhandled query in finance mock pool: ${normalized}`);
    },
    release() {}
  } as unknown as DatabaseClient;

  const pool = {
    async connect() {
      return client;
    },
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      return client.query<R>(sql, params);
    },
    async end() {},
    on: () => pool
  } as unknown as DatabasePool;

  return { pool, auditEvents };
}

test('Prompt 2 & 3 HTTP routes enforce RBAC, versioning, effective resolution, verification adapters, callbacks, no-store, and capability gate boundaries', async () => {
  const prevEnv = {
    CONTROL_PLANE_SECRET: process.env.CONTROL_PLANE_SECRET,
    STORAGE_VAULT_KEYS: process.env.STORAGE_VAULT_KEYS,
    STORAGE_VAULT_ACTIVE_KEY_ID: process.env.STORAGE_VAULT_ACTIVE_KEY_ID,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    OPAY_SECRET_KEY: process.env.OPAY_SECRET_KEY,
    OPAY_MERCHANT_ID: process.env.OPAY_MERCHANT_ID
  };
  process.env.CONTROL_PLANE_SECRET = 'test_control_plane_signing_secret_32bytes_min';
  process.env.STORAGE_VAULT_KEYS = JSON.stringify({ test: Buffer.alloc(32, 9).toString('base64') });
  process.env.STORAGE_VAULT_ACTIVE_KEY_ID = 'test';
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack_route_secret';
  process.env.FLUTTERWAVE_SECRET_KEY = 'flw_route_secret';
  process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = 'flw_route_webhook_hash';
  process.env.OPAY_SECRET_KEY = 'opay_route_secret';
  process.env.OPAY_MERCHANT_ID = 'OPAY_MERCHANT_ROUTE';

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const schoolA1 = randomUUID();
  const schoolA2 = randomUUID();
  const classA1 = randomUUID();
  const classA2 = randomUUID();

  const actors: Record<string, AuthorizedPrincipal> = {
    bursarA1: createAuthorizedPrincipal({
      tenant: principal(tenantA),
      userId: randomUUID(),
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'bursar',
        permissions: [PERMISSIONS.schoolFinancePoliciesRead, PERMISSIONS.schoolFinancePoliciesCreate],
        scopes: [{ resourceType: 'school', resourceId: schoolA1 }]
      }]
    }),
    principalA1: createAuthorizedPrincipal({
      tenant: principal(tenantA),
      userId: randomUUID(),
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'principal',
        permissions: [
          PERMISSIONS.schoolFinancePoliciesRead,
          PERMISSIONS.schoolFinancePoliciesCreate,
          PERMISSIONS.schoolFinancePoliciesApprove,
          PERMISSIONS.schoolFinancePoliciesSupersede,
          PERMISSIONS.schoolFinanceSettlementRead,
          PERMISSIONS.schoolFinanceSettlementRequest,
          PERMISSIONS.schoolFinanceSettlementVerify
        ],
        scopes: [{ resourceType: 'school', resourceId: schoolA1 }]
      }]
    }),
    proprietorA: createAuthorizedPrincipal({
      tenant: principal(tenantA),
      userId: randomUUID(),
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'proprietor',
        permissions: [
          PERMISSIONS.schoolFinancePoliciesRead,
          PERMISSIONS.schoolFinanceSettlementRead,
          PERMISSIONS.schoolFinanceSettlementApprove,
          PERMISSIONS.schoolFinanceSettlementVerify,
          PERMISSIONS.schoolFinanceSettlementManage
        ],
        scopes: []
      }]
    }),
    bursarB: createAuthorizedPrincipal({
      tenant: principal(tenantB),
      userId: randomUUID(),
      sessionId: randomUUID(),
      grants: [{
        roleCode: 'bursar',
        permissions: [
          PERMISSIONS.schoolFinancePoliciesRead,
          PERMISSIONS.schoolFinancePoliciesCreate,
          PERMISSIONS.schoolFinanceSettlementRead
        ],
        scopes: []
      }]
    })
  };

  let failNextResolve = false;
  const fakeFetch: typeof fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (failNextResolve) {
      failNextResolve = false;
      return new Response(JSON.stringify({ status: false, message: 'Bank resolution timeout' }), { status: 502 });
    }
    if (url.includes('api.paystack.co/bank/resolve')) {
      return new Response(JSON.stringify({ status: true, data: { account_name: 'ALPHA SCHOOL NIGERIA' } }), { status: 200 });
    }
    if (url.includes('api.paystack.co/transferrecipient')) {
      return new Response(JSON.stringify({ status: true, data: { recipient_code: 'RCP_ROUTE_1' } }), { status: 200 });
    }
    if (url.includes('/api/v3/transfer/bankAccountVerify')) {
      return new Response(JSON.stringify({
        code: '00000',
        data: { bankAccountName: 'ALPHA SCHOOL NIGERIA', verificationId: 'opay_ver_route_2' }
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ status: 'success', data: { account_name: 'ALPHA SCHOOL NIGERIA', id: 101 } }), { status: 200 });
  }) as typeof fetch;

  const { pool, auditEvents } = createFinanceMockPool({
    tenants: [tenantA, tenantB],
    schools: [
      { id: schoolA1, tenantId: tenantA, name: 'Alpha Campus' },
      { id: schoolA2, tenantId: tenantA, name: 'Beta Campus' }
    ],
    classes: [
      { id: classA1, tenantId: tenantA, schoolId: schoolA1 },
      { id: classA2, tenantId: tenantA, schoolId: schoolA2 }
    ]
  });

  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));
  app.use('/api', createApiCapabilityGateMiddleware());

  const requirePermission = (perm: string): RequestHandler => (req, res, next) => {
    const actorKey = String(req.headers['x-test-actor'] || '');
    const actor = actors[actorKey];
    if (!actor || !actor.grants.some(g => g.permissions.includes(perm))) {
      res.status(403).json({ success: false, code: 'FORBIDDEN' });
      return;
    }
    (req as any).authorizedPrincipal = actor;
    next();
  };

  app.use('/api/v1', createSchoolFinanceRouter({
    getPool: () => pool,
    authorizationMiddleware: { requirePermission },
    createSettlementService: p => new SchoolSettlementAccounts(p, createSettlementProviderAdapters(fakeFetch))
  }));

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', () => resolve());
      server.once('error', reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

    async function api(method: string, path: string, actorKey: string, body?: unknown, headers?: Record<string, string>) {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'x-test-actor': actorKey,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(headers || {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      return { status: res.status, headers: res.headers, json: await res.json() as any };
    }
    // Multi-school scoped bursar only sees schoolA1
    const scopedSchools = await api('GET', '/school-finance/schools', 'bursarA1');
    assert.equal(scopedSchools.status, 200);
    assert.deepEqual(scopedSchools.json.data.map((s: any) => s.id), [schoolA1]);

    // Blocked from schoolA2
    assert.equal((await api('GET', `/school-finance/schools/${schoolA2}/fee-policies`, 'bursarA1')).status, 403);

    // Reject class belonging to schoolA2 when creating on schoolA1
    const wrongClass = await api('POST', `/school-finance/schools/${schoolA1}/fee-policies`, 'bursarA1', {
      academicSession: '2026/2027', term: 'First term', effectiveDate: '2026-09-01', currency: 'NGN',
      items: [{ name: 'Tuition', category: 'tuition', amountMinor: 500000, compulsory: true, grade: 'JSS 1', classId: classA2, residence: 'day' }]
    });
    assert.equal(wrongClass.status, 400);

    // Create two concurrent fee policy versions
    const [createV1, createV2] = await Promise.all([
      api('POST', `/school-finance/schools/${schoolA1}/fee-policies`, 'bursarA1', {
        academicSession: '2026/2027', term: 'First term', effectiveDate: '2026-09-01', currency: 'NGN',
        items: [{ name: 'Tuition', category: 'tuition', amountMinor: 500000, compulsory: true, grade: 'JSS 1', classId: classA1, residence: 'all' }]
      }),
      api('POST', `/school-finance/schools/${schoolA1}/fee-policies`, 'bursarA1', {
        academicSession: '2026/2027', term: 'First term', effectiveDate: '2026-09-15', currency: 'NGN',
        items: [{ name: 'Tuition', category: 'tuition', amountMinor: 650000, compulsory: true, grade: 'JSS 1', classId: classA1, residence: 'all' }]
      })
    ]);
    assert.equal(createV1.status, 201);
    assert.equal(createV2.status, 201);
    const v1Id = createV1.json.data.id;
    const v2Id = createV2.json.data.id;

    // Effective resolution before approval returns NO_EFFECTIVE_APPROVED_POLICY
    const noneEffective = await api('GET', `/school-finance/schools/${schoolA1}/fee-policies/effective?academicSession=2026%2F2027&term=First%20term&asOfDate=2026-09-20`, 'bursarA1');
    assert.equal(noneEffective.status, 200);
    assert.equal(noneEffective.json.data.status, 'NO_EFFECTIVE_APPROVED_POLICY');

    // Bursar cannot approve
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/fee-policies/${v1Id}/approve`, 'bursarA1')).status, 403);

    // Principal approves v1 and v2; resolution respects asOfDate; superseding v1 selects v2
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/fee-policies/${v1Id}/approve`, 'principalA1')).status, 200);
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/fee-policies/${v2Id}/approve`, 'principalA1')).status, 200);

    const effEarly = await api('GET', `/school-finance/schools/${schoolA1}/fee-policies/effective?academicSession=2026%2F2027&term=First%20term&asOfDate=2026-09-05`, 'bursarA1');
    assert.equal(effEarly.json.data.effectivePolicy.id, v1Id);

    const supRes = await api('POST', `/school-finance/schools/${schoolA1}/fee-policies/${v1Id}/supersede`, 'principalA1', {
      action: 'superseded',
      supersededByPolicyId: v2Id,
      reason: 'Updated tuition schedule effective mid-September'
    });
    assert.equal(supRes.status, 200);

    // On 2026-09-05, v1 is superseded and v2 is future-dated -> NO_EFFECTIVE_APPROVED_POLICY
    const effAfterSupEarly = await api('GET', `/school-finance/schools/${schoolA1}/fee-policies/effective?academicSession=2026%2F2027&term=First%20term&asOfDate=2026-09-05`, 'bursarA1');
    assert.equal(effAfterSupEarly.json.data.status, 'NO_EFFECTIVE_APPROVED_POLICY');

    const effMid = await api('GET', `/school-finance/schools/${schoolA1}/fee-policies/effective?academicSession=2026%2F2027&term=First%20term&asOfDate=2026-09-16`, 'bursarA1');
    assert.equal(effMid.json.data.effectivePolicy.id, v2Id);

    // Settlement accounts lifecycle + Cache-Control: no-store
    const setReq1 = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts`, 'principalA1', {
      provider: 'paystack', bankName: 'First Bank', bankCode: '011', accountName: 'Alpha School Nigeria', accountNumber: '0123456789'
    });
    assert.equal(setReq1.status, 201);
    assert.equal(setReq1.headers.get('cache-control'), 'no-store');
    const req1Id = setReq1.json.data.id;

    // Principal cannot verify unapproved account or approve as proprietor
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/approve`, 'principalA1')).status, 403);
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/verify`, 'principalA1')).status, 400);

    // Proprietor approves; verify fails once (persisting failure event), succeeds on retry
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/approve`, 'proprietorA')).status, 200);
    failNextResolve = true;
    const failedVerify = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/verify`, 'principalA1');
    assert.equal(failedVerify.status, 422);

    const retryVerify = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/verify`, 'principalA1', undefined, {
      'idempotency-key': 'verify-req1-attempt-2'
    });
    assert.equal(retryVerify.status, 200);
    assert.equal(retryVerify.json.data.state, 'verified');
    assert.equal(retryVerify.json.data.has_provider_reference, true);

    // Principal cannot activate; proprietor activates
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/activate`, 'principalA1')).status, 403);
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/activate`, 'proprietorA')).status, 200);

    const activeAccount = await api('GET', `/school-finance/schools/${schoolA1}/settlement-accounts/active`, 'proprietorA');
    assert.equal(activeAccount.status, 200);
    assert.equal(activeAccount.headers.get('cache-control'), 'no-store');
    assert.equal(activeAccount.json.data.id, req1Id);
    assert.equal(activeAccount.json.data.is_default, true);

    // Second OPay request + callback signature check + replacement
    const setReq2 = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts`, 'principalA1', {
      provider: 'opay', bankName: 'OPay Digital', bankCode: '999992', accountName: 'Alpha School Nigeria', accountNumber: '9876543210'
    });
    const req2Id = setReq2.json.data.id;
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req2Id}/approve`, 'proprietorA')).status, 200);

    const cbBodyObj = { id: 'evt_opay_1', code: '00000', data: { status: 'VERIFIED', verificationId: 'opay_cb_ref', accountName: 'ALPHA SCHOOL NIGERIA' } };
    const badCb = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req2Id}/verification-callback`, 'proprietorA', cbBodyObj, {
      sha512: '00'.repeat(64)
    });
    assert.equal(badCb.status, 401);

    const cbSig = createHmac('sha512', process.env.OPAY_SECRET_KEY!).update(JSON.stringify(cbBodyObj), 'utf8').digest('hex');
    const goodCb = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req2Id}/verification-callback`, 'proprietorA', cbBodyObj, {
      sha512: cbSig,
      'idempotency-key': 'cb-opay-1'
    });
    assert.equal(goodCb.status, 200);
    assert.equal(goodCb.json.data.state, 'verified');

    const dupCb = await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req2Id}/verification-callback`, 'proprietorA', cbBodyObj, {
      sha512: cbSig,
      'idempotency-key': 'cb-opay-1'
    });
    assert.equal(dupCb.status, 200);
    assert.equal(dupCb.json.data.deduplicated, true);

    // Activating req2 replaces req1 atomically
    assert.equal((await api('POST', `/school-finance/schools/${schoolA1}/settlement-accounts/${req2Id}/activate`, 'proprietorA')).status, 200);
    const listAfterReplace = await api('GET', `/school-finance/schools/${schoolA1}/settlement-accounts`, 'proprietorA');
    const r1 = listAfterReplace.json.data.find((x: any) => x.id === req1Id);
    const r2 = listAfterReplace.json.data.find((x: any) => x.id === req2Id);
    assert.equal(r1.state, 'replaced');
    assert.equal(r1.is_default, false);
    assert.equal(r2.state, 'active');
    assert.equal(r2.is_default, true);

    // Events timeline & no plaintext NUBAN in audit events
    const evRes = await api('GET', `/school-finance/schools/${schoolA1}/settlement-accounts/${req1Id}/events`, 'proprietorA');
    assert.equal(evRes.status, 200);
    assert.ok(evRes.json.data.some((e: any) => e.event_type === 'verification_failed'));
    assert.ok(evRes.json.data.some((e: any) => e.event_type === 'replaced'));
    assert.ok(!JSON.stringify(auditEvents).includes('0123456789'));
    assert.ok(!JSON.stringify(auditEvents).includes('9876543210'));

    // Unimplemented billing/payments/payroll/reports remain 503 blocked
    for (const [method, path] of [
      ['POST', `/school-finance/schools/${schoolA1}/invoices`],
      ['POST', `/school-finance/schools/${schoolA1}/payments`],
      ['GET', `/school-finance/schools/${schoolA1}/payroll`],
      ['GET', `/school-finance/schools/${schoolA1}/reports`]
    ]) {
      const blocked = await api(method, path, 'proprietorA');
      assert.equal(blocked.status, 503);
      assert.equal(blocked.json.code, 'PRODUCTION_PERSISTENCE_UNAVAILABLE');
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
