import crypto from 'node:crypto';
import type {
  AiApplicationId,
  AiCapabilityId,
  AiProviderId,
  AiTaskType,
  AiTokenUsageSummary
} from '../../packages/shared-types/src/aiGatewayContracts';
import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, withTenantTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { TamperEvidentAuditService } from '../../src/services/tamperEvidentAuditService';
import { AiGatewayError, type AiUsageAggregateRecord, type TenantAiEntitlementRecord } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiRequestStartInput {
  id: string;
  correlationId: string;
  idempotencyKey?: string;
  tenantId: string | null;
  applicationInstanceId: string | null;
  applicationId: AiApplicationId;
  capability: AiCapabilityId;
  taskType: AiTaskType;
  actorUserId: string;
  actorRole: string;
  providerId: AiProviderId;
  modelId: string;
  routingStrategy: string;
  requestMetadata?: Record<string, unknown>;
}

export interface AiRequestFinishInput {
  requestId: string;
  tenantId: string | null;
  applicationInstanceId: string | null;
  applicationId: AiApplicationId;
  capability: AiCapabilityId;
  actorUserId: string;
  providerId: AiProviderId;
  modelId: string;
  status: 'completed' | 'rejected' | 'failed' | 'timed_out';
  attemptCount: number;
  latencyMs: number;
  httpStatus: number;
  usage: AiTokenUsageSummary;
  errorCode?: string;
  errorMessage?: string;
  principal: VerifiedTenantPrincipal;
}

export interface AiAuditRecordInput {
  correlationId: string;
  requestId?: string;
  tenantId: string | null;
  applicationInstanceId: string | null;
  applicationId: AiApplicationId;
  capability: AiCapabilityId;
  actorUserId: string;
  actorRole: string;
  decision: 'allowed' | 'denied' | 'rate_limited' | 'quota_exceeded' | 'validation_failed' | 'provider_error';
  reasonCode?: string;
  details?: Record<string, unknown>;
  principal?: VerifiedTenantPrincipal;
}

export interface AiGatewayPersistenceStore {
  isCapabilityEnabled(
    principal: VerifiedTenantPrincipal,
    capability: AiCapabilityId
  ): Promise<boolean>;
  resolveApplicationInstance(
    principal: VerifiedTenantPrincipal,
    tenantId: string,
    supportedApplicationIds: readonly string[],
    requestedInstanceId?: string
  ): Promise<string>;
  getTenantEntitlement(
    principal: VerifiedTenantPrincipal,
    tenantId: string,
    applicationId: AiApplicationId,
    applicationInstanceId?: string | null
  ): Promise<TenantAiEntitlementRecord | undefined>;
  countTenantRequestsToday(principal: VerifiedTenantPrincipal, tenantId: string): Promise<number>;
  countTenantRequestsThisMonth(principal: VerifiedTenantPrincipal, tenantId: string): Promise<number>;
  recordRequestStart(principal: VerifiedTenantPrincipal, input: AiRequestStartInput): Promise<void>;
  recordRequestFinish(input: AiRequestFinishInput): Promise<void>;
  recordAudit(input: AiAuditRecordInput): Promise<void>;
  getUsageAggregate(
    principal: VerifiedTenantPrincipal,
    filter: { tenantId: string | null; limit?: number }
  ): Promise<AiUsageAggregateRecord>;
}

function runWithPrincipal<T>(
  pool: DatabasePool,
  principal: VerifiedTenantPrincipal,
  fn: (client: any) => Promise<T>
): Promise<T> {
  if (principal.role === 'super_admin') {
    return withControlPlaneTransaction(pool, principal, fn);
  }
  return withTenantTransaction(pool, principal, fn);
}

/**
 * PostgreSQL-backed Central AI Gateway metering, entitlement & audit store with Forced RLS.
 */
export class PostgresAiGatewayStore implements AiGatewayPersistenceStore {
  constructor(private readonly pool: DatabasePool) {}

  async isCapabilityEnabled(
    principal: VerifiedTenantPrincipal,
    capability: AiCapabilityId
  ): Promise<boolean> {
    return runWithPrincipal(this.pool, principal, async client => {
      const { rows } = await client.query(
        `SELECT is_enabled
         FROM production.ai_gateway_capabilities
         WHERE capability_id = $1`,
        [capability]
      );
      return rows.length === 1 && rows[0].is_enabled === true;
    });
  }

  async resolveApplicationInstance(
    principal: VerifiedTenantPrincipal,
    tenantId: string,
    supportedApplicationIds: readonly string[],
    requestedInstanceId?: string
  ): Promise<string> {
    if (!supportedApplicationIds.length) {
      throw new AiGatewayError('FORBIDDEN', 'This AI capability is not available to school instances.', 403);
    }
    if (requestedInstanceId && !UUID.test(requestedInstanceId)) {
      throw new AiGatewayError('FORBIDDEN', 'The requested application instance is invalid.', 403);
    }

    return runWithPrincipal(this.pool, principal, async client => {
      const { rows } = await client.query(
        `SELECT id
         FROM production.application_instances
         WHERE tenant_id = $1
           AND status = 'active'
           AND application_id = ANY($2::text[])
           AND ($3::uuid IS NULL OR id = $3::uuid)
         ORDER BY created_at DESC
         LIMIT 2`,
        [tenantId, supportedApplicationIds, requestedInstanceId || null]
      );
      if (rows.length === 0) {
        throw new AiGatewayError('FORBIDDEN', 'No active authorized application instance was found.', 403);
      }
      if (rows.length > 1) {
        throw new AiGatewayError(
          'VALIDATION_ERROR',
          'An application-instance ID is required when multiple eligible instances exist.',
          400
        );
      }
      return rows[0].id;
    });
  }

  async getTenantEntitlement(
    principal: VerifiedTenantPrincipal,
    tenantId: string,
    applicationId: AiApplicationId,
    applicationInstanceId?: string | null
  ): Promise<TenantAiEntitlementRecord | undefined> {
    return runWithPrincipal(this.pool, principal, async client => {
      const params: unknown[] = [tenantId, applicationId];
      let instanceClause = '';
      if (applicationInstanceId && UUID.test(applicationInstanceId)) {
        params.push(applicationInstanceId);
        instanceClause = `AND application_instance_id = $${params.length}`;
      }
      const { rows } = await client.query(
        `SELECT id, tenant_id, application_instance_id, application_id, status,
                allowed_capabilities, daily_request_limit, monthly_request_limit,
                monthly_token_limit, max_concurrent_requests, expires_at
         FROM production.tenant_ai_entitlements
         WHERE tenant_id = $1
           AND application_id = $2
           ${instanceClause}
         ORDER BY created_at DESC
         LIMIT 1`,
        params
      );
      if (rows.length === 0) return undefined;
      const r = rows[0];
      return {
        id: r.id,
        tenantId: r.tenant_id,
        applicationInstanceId: r.application_instance_id,
        applicationId: r.application_id,
        status: r.status,
        allowedCapabilities: Array.isArray(r.allowed_capabilities) ? r.allowed_capabilities : [],
        dailyRequestLimit: Number(r.daily_request_limit),
        monthlyRequestLimit: Number(r.monthly_request_limit),
        monthlyTokenLimit: Number(r.monthly_token_limit),
        maxConcurrentRequests: Number(r.max_concurrent_requests),
        expiresAt: r.expires_at instanceof Date ? r.expires_at.toISOString() : String(r.expires_at)
      };
    });
  }

  async countTenantRequestsToday(principal: VerifiedTenantPrincipal, tenantId: string): Promise<number> {
    return runWithPrincipal(this.pool, principal, async client => {
      const { rows } = await client.query(
        `SELECT count(*)::int AS cnt
         FROM production.ai_gateway_requests
         WHERE tenant_id = $1
           AND created_at >= date_trunc('day', now())
           AND status IN ('executing', 'completed')`,
        [tenantId]
      );
      return Number(rows[0]?.cnt ?? 0);
    });
  }

  async countTenantRequestsThisMonth(principal: VerifiedTenantPrincipal, tenantId: string): Promise<number> {
    return runWithPrincipal(this.pool, principal, async client => {
      const { rows } = await client.query(
        `SELECT count(*)::int AS cnt
         FROM production.ai_gateway_requests
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', now())`,
        [tenantId]
      );
      return Number(rows[0]?.cnt ?? 0);
    });
  }

  async recordRequestStart(principal: VerifiedTenantPrincipal, input: AiRequestStartInput): Promise<void> {
    await runWithPrincipal(this.pool, principal, async client => {
      await client.query(
        `INSERT INTO production.ai_gateway_requests (
          id, correlation_id, idempotency_key, tenant_id, application_instance_id,
          calling_application, capability_id, task_type, actor_user_id, actor_role,
          provider_id, model_id, routing_strategy, status, request_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'executing', $14::jsonb)`,
        [
          input.id,
          input.correlationId,
          input.idempotencyKey || null,
          input.tenantId && UUID.test(input.tenantId) ? input.tenantId : null,
          input.applicationInstanceId && UUID.test(input.applicationInstanceId) ? input.applicationInstanceId : null,
          input.applicationId,
          input.capability,
          input.taskType,
          input.actorUserId,
          input.actorRole,
          input.providerId,
          input.modelId,
          input.routingStrategy,
          JSON.stringify(input.requestMetadata || {})
        ]
      );
    });
  }

  async recordRequestFinish(input: AiRequestFinishInput): Promise<void> {
    await runWithPrincipal(this.pool, input.principal, async client => {
      await client.query(
        `UPDATE production.ai_gateway_requests
         SET status = $2,
             attempt_count = $3,
             latency_ms = $4,
             error_code = $5,
             error_message = $6,
             completed_at = now()
         WHERE id = $1`,
        [
          input.requestId,
          input.status,
          input.attemptCount,
          input.latencyMs,
          input.errorCode || null,
          input.errorMessage || null
        ]
      );
      await client.query(
        `INSERT INTO production.ai_gateway_usage_metrics (
          request_id, tenant_id, application_instance_id, calling_application,
          capability_id, actor_user_id, provider_id, model_id,
          prompt_tokens, candidates_tokens, total_tokens,
          cost_metadata_available, estimated_cost_usd, http_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          input.requestId,
          input.tenantId && UUID.test(input.tenantId) ? input.tenantId : null,
          input.applicationInstanceId && UUID.test(input.applicationInstanceId) ? input.applicationInstanceId : null,
          input.applicationId,
          input.capability,
          input.actorUserId,
          input.providerId,
          input.modelId,
          input.usage.promptTokens,
          input.usage.candidatesTokens,
          input.usage.totalTokens,
          input.usage.costMetadataAvailable,
          input.usage.estimatedCostUsd,
          input.httpStatus
        ]
      );
    });
  }

  async recordAudit(input: AiAuditRecordInput): Promise<void> {
    TamperEvidentAuditService.logPlatformAction({
      actor: input.actorUserId,
      actorRole: input.actorRole,
      tenantId: input.tenantId || 'platform_control_plane',
      action: `ai_gateway_${input.decision}`,
      target: `${input.applicationId}:${input.capability}`,
      result: input.decision === 'allowed' ? 'SUCCESS' : 'BLOCKED',
      outcome: input.decision === 'allowed' ? 'SUCCESS' : 'BLOCKED',
      reason: input.reasonCode,
      resourceType: 'ai_gateway',
      resourceId: input.requestId || input.correlationId,
      details: JSON.stringify(input.details || {})
    });

    if (!input.principal) return;
    await runWithPrincipal(this.pool, input.principal, async client => {
      await client.query(
        `INSERT INTO production.ai_gateway_audit_events (
          correlation_id, request_id, tenant_id, application_instance_id,
          calling_application, capability_id, actor_user_id, actor_role,
          decision, reason_code, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [
          input.correlationId,
          input.requestId && UUID.test(input.requestId) ? input.requestId : null,
          input.tenantId && UUID.test(input.tenantId) ? input.tenantId : null,
          input.applicationInstanceId && UUID.test(input.applicationInstanceId) ? input.applicationInstanceId : null,
          input.applicationId,
          input.capability,
          input.actorUserId,
          input.actorRole,
          input.decision,
          input.reasonCode || null,
          JSON.stringify(input.details || {})
        ]
      );
    });
  }

  async getUsageAggregate(
    principal: VerifiedTenantPrincipal,
    filter: { tenantId: string | null; limit?: number }
  ): Promise<AiUsageAggregateRecord> {
    const limit = Math.max(1, Math.min(100, filter.limit || 25));
    return runWithPrincipal(this.pool, principal, async client => {
      const params: unknown[] = [];
      let where = '';
      if (filter.tenantId && UUID.test(filter.tenantId)) {
        params.push(filter.tenantId);
        where = `WHERE r.tenant_id = $1`;
      }

      const { rows } = await client.query(
        `SELECT r.id AS request_id, r.correlation_id, r.calling_application, r.capability_id,
                r.task_type, r.model_id, r.status, r.latency_ms, r.created_at,
                u.prompt_tokens, u.candidates_tokens, u.total_tokens
         FROM production.ai_gateway_requests r
         LEFT JOIN production.ai_gateway_usage_metrics u ON u.request_id = r.id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT ${limit}`,
        params
      );

      const { rows: summaryRows } = await client.query(
        `SELECT count(*)::int AS total_requests,
                count(*) FILTER (WHERE r.status = 'completed')::int AS completed_requests,
                count(*) FILTER (WHERE r.status IN ('failed', 'timed_out', 'rejected'))::int AS failed_requests,
                sum(u.prompt_tokens)::bigint AS prompt_tokens,
                sum(u.candidates_tokens)::bigint AS candidates_tokens,
                sum(u.total_tokens)::bigint AS total_tokens
         FROM production.ai_gateway_requests r
         LEFT JOIN production.ai_gateway_usage_metrics u ON u.request_id = r.id
         ${where}`,
        params
      );

      const s = summaryRows[0] || {};
      const byApplication: Record<string, number> = {};
      const byCapability: Record<string, number> = {};
      const byModel: Record<string, number> = {};
      for (const r of rows) {
        byApplication[r.calling_application] = (byApplication[r.calling_application] || 0) + 1;
        byCapability[r.capability_id] = (byCapability[r.capability_id] || 0) + 1;
        byModel[r.model_id] = (byModel[r.model_id] || 0) + 1;
      }

      return {
        tenantId: filter.tenantId,
        totalRequests: Number(s.total_requests ?? 0),
        completedRequests: Number(s.completed_requests ?? 0),
        failedRequests: Number(s.failed_requests ?? 0),
        totalPromptTokens: s.prompt_tokens !== null && s.prompt_tokens !== undefined ? Number(s.prompt_tokens) : null,
        totalCandidatesTokens: s.candidates_tokens !== null && s.candidates_tokens !== undefined ? Number(s.candidates_tokens) : null,
        totalTokens: s.total_tokens !== null && s.total_tokens !== undefined ? Number(s.total_tokens) : null,
        byApplication,
        byCapability,
        byModel,
        recentRequests: rows.map((r: any) => ({
          requestId: r.request_id,
          correlationId: r.correlation_id,
          applicationId: r.calling_application,
          capability: r.capability_id,
          taskType: r.task_type,
          modelId: r.model_id,
          status: r.status,
          promptTokens: r.prompt_tokens !== null ? Number(r.prompt_tokens) : null,
          candidatesTokens: r.candidates_tokens !== null ? Number(r.candidates_tokens) : null,
          totalTokens: r.total_tokens !== null ? Number(r.total_tokens) : null,
          latencyMs: r.latency_ms !== null ? Number(r.latency_ms) : null,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
        }))
      };
    });
  }
}

/**
 * In-process AI Gateway metering & audit store for isolated unit tests and non-DB preview mode.
 */
export class InMemoryAiGatewayStore implements AiGatewayPersistenceStore {
  readonly entitlements = new Map<string, TenantAiEntitlementRecord>();
  readonly applicationInstances = new Map<string, { tenantId: string; applicationId: string; status: string }>();
  readonly capabilityEnabled = new Map<AiCapabilityId, boolean>();
  readonly requests = new Map<string, AiRequestStartInput & {
    status: string;
    attemptCount: number;
    latencyMs: number | null;
    usage?: AiTokenUsageSummary;
    createdAt: string;
  }>();
  readonly audits: Array<AiAuditRecordInput & { id: string; createdAt: string }> = [];

  async isCapabilityEnabled(
    _principal: VerifiedTenantPrincipal,
    capability: AiCapabilityId
  ): Promise<boolean> {
    return this.capabilityEnabled.get(capability) ?? true;
  }

  registerApplicationInstance(input: {
    id: string;
    tenantId: string;
    applicationId: string;
    status?: string;
  }): void {
    this.applicationInstances.set(input.id, {
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      status: input.status || 'active'
    });
  }

  async resolveApplicationInstance(
    _principal: VerifiedTenantPrincipal,
    tenantId: string,
    supportedApplicationIds: readonly string[],
    requestedInstanceId?: string
  ): Promise<string> {
    const matches = [...this.applicationInstances.entries()]
      .filter(([id, instance]) =>
        instance.tenantId === tenantId &&
        instance.status === 'active' &&
        supportedApplicationIds.includes(instance.applicationId) &&
        (!requestedInstanceId || id === requestedInstanceId)
      );
    if (matches.length === 0) {
      throw new AiGatewayError('FORBIDDEN', 'No active authorized application instance was found.', 403);
    }
    if (matches.length > 1) {
      throw new AiGatewayError(
        'VALIDATION_ERROR',
        'An application-instance ID is required when multiple eligible instances exist.',
        400
      );
    }
    return matches[0][0];
  }

  setEntitlement(entitlement: TenantAiEntitlementRecord): void {
    this.entitlements.set(
      `${entitlement.tenantId}:${entitlement.applicationId}:${entitlement.applicationInstanceId}`,
      entitlement
    );
  }

  async getTenantEntitlement(
    _principal: VerifiedTenantPrincipal,
    tenantId: string,
    applicationId: AiApplicationId,
    applicationInstanceId?: string | null
  ): Promise<TenantAiEntitlementRecord | undefined> {
    return this.entitlements.get(`${tenantId}:${applicationId}:${applicationInstanceId || ''}`) ||
      [...this.entitlements.values()].find(entitlement =>
        entitlement.tenantId === tenantId &&
        entitlement.applicationId === applicationId &&
        (!applicationInstanceId || entitlement.applicationInstanceId === applicationInstanceId)
      );
  }

  async countTenantRequestsToday(_principal: VerifiedTenantPrincipal, tenantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    let count = 0;
    for (const req of this.requests.values()) {
      if (
        req.tenantId === tenantId &&
        new Date(req.createdAt).getTime() >= startOfDay.getTime() &&
        (req.status === 'executing' || req.status === 'completed')
      ) {
        count += 1;
      }
    }
    return count;
  }

  async countTenantRequestsThisMonth(_principal: VerifiedTenantPrincipal, tenantId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    let count = 0;
    for (const req of this.requests.values()) {
      if (req.tenantId === tenantId && new Date(req.createdAt).getTime() >= startOfMonth) {
        count += 1;
      }
    }
    return count;
  }

  async recordRequestStart(_principal: VerifiedTenantPrincipal, input: AiRequestStartInput): Promise<void> {
    if (input.idempotencyKey && [...this.requests.values()].some(request =>
      request.applicationId === input.applicationId &&
      request.capability === input.capability &&
      request.idempotencyKey === input.idempotencyKey
    )) {
      throw Object.assign(new Error('Duplicate AI request idempotency key.'), { code: '23505' });
    }
    this.requests.set(input.id, {
      ...input,
      status: 'executing',
      attemptCount: 1,
      latencyMs: null,
      createdAt: new Date().toISOString()
    });
  }

  async recordRequestFinish(input: AiRequestFinishInput): Promise<void> {
    const existing = this.requests.get(input.requestId);
    if (existing) {
      existing.status = input.status;
      existing.attemptCount = input.attemptCount;
      existing.latencyMs = input.latencyMs;
      existing.usage = input.usage;
    }
  }

  async recordAudit(input: AiAuditRecordInput): Promise<void> {
    TamperEvidentAuditService.logPlatformAction({
      actor: input.actorUserId,
      actorRole: input.actorRole,
      tenantId: input.tenantId || 'platform_control_plane',
      action: `ai_gateway_${input.decision}`,
      target: `${input.applicationId}:${input.capability}`,
      result: input.decision === 'allowed' ? 'SUCCESS' : 'BLOCKED',
      outcome: input.decision === 'allowed' ? 'SUCCESS' : 'BLOCKED',
      reason: input.reasonCode,
      resourceType: 'ai_gateway',
      resourceId: input.requestId || input.correlationId,
      details: JSON.stringify(input.details || {})
    });
    this.audits.push({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    });
  }

  async getUsageAggregate(
    _principal: VerifiedTenantPrincipal,
    filter: { tenantId: string | null; limit?: number }
  ): Promise<AiUsageAggregateRecord> {
    const all = Array.from(this.requests.values())
      .filter(r => !filter.tenantId || r.tenantId === filter.tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const sliced = all.slice(0, filter.limit || 25);

    let promptSum = 0;
    let candSum = 0;
    let totalSum = 0;
    let hasTokens = false;
    const byApplication: Record<string, number> = {};
    const byCapability: Record<string, number> = {};
    const byModel: Record<string, number> = {};

    for (const r of all) {
      byApplication[r.applicationId] = (byApplication[r.applicationId] || 0) + 1;
      byCapability[r.capability] = (byCapability[r.capability] || 0) + 1;
      byModel[r.modelId] = (byModel[r.modelId] || 0) + 1;
      if (r.usage?.promptTokens !== null && r.usage?.promptTokens !== undefined) {
        promptSum += r.usage.promptTokens;
        hasTokens = true;
      }
      if (r.usage?.candidatesTokens !== null && r.usage?.candidatesTokens !== undefined) {
        candSum += r.usage.candidatesTokens;
        hasTokens = true;
      }
      if (r.usage?.totalTokens !== null && r.usage?.totalTokens !== undefined) {
        totalSum += r.usage.totalTokens;
        hasTokens = true;
      }
    }

    return {
      tenantId: filter.tenantId,
      totalRequests: all.length,
      completedRequests: all.filter(r => r.status === 'completed').length,
      failedRequests: all.filter(r => ['failed', 'timed_out', 'rejected'].includes(r.status)).length,
      totalPromptTokens: hasTokens ? promptSum : null,
      totalCandidatesTokens: hasTokens ? candSum : null,
      totalTokens: hasTokens ? totalSum : null,
      byApplication,
      byCapability,
      byModel,
      recentRequests: sliced.map(r => ({
        requestId: r.id,
        correlationId: r.correlationId,
        applicationId: r.applicationId,
        capability: r.capability,
        taskType: r.taskType,
        modelId: r.modelId,
        status: r.status,
        promptTokens: r.usage?.promptTokens ?? null,
        candidatesTokens: r.usage?.candidatesTokens ?? null,
        totalTokens: r.usage?.totalTokens ?? null,
        latencyMs: r.latencyMs,
        createdAt: r.createdAt
      }))
    };
  }
}
