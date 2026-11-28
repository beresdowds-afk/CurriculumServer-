import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import { MessagingProviderRegistry, currentDeploymentEnvironment } from './providers';
import type {
  CmagMessageEnvelope,
  DeploymentEnvironment,
  GatewayChannel,
  MessageLifecycleState,
  NormalizedWebhookEvent,
  ProviderConfigRecord,
  ProviderCredentials,
  ProviderDispatchOutcome,
  ProviderReadinessStatus
} from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_SECONDS = 60;

const LIFECYCLE_RANK: Record<MessageLifecycleState, number> = {
  created: 0,
  queued: 1,
  retry_scheduled: 2,
  processing: 3,
  submitted: 4,
  provider_accepted: 5,
  accepted: 5,
  sent: 6,
  delivered: 7,
  read: 8,
  failed: 9,
  expired: 9,
  cancelled: 9
};

export interface EnqueueResult {
  outboxId: string;
  status: MessageLifecycleState;
  idempotentReplay: boolean;
  correlationId: string;
}

export interface RedactedProviderSummary {
  id: string;
  displayName: string;
  providerType: 'sms' | 'whatsapp' | 'multi';
  supportedChannels: string[];
  environment: DeploymentEnvironment;
  enabled: boolean;
  suspended: boolean;
  suspendedReason: string | null;
  priority: number;
  baseUrl: string;
  readinessStatus: ProviderReadinessStatus;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  smsSenderName: string | null;
  smsRoute: string | null;
  whatsappSender: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  lastVerifiedAt: string | null;
  circuitHealth: Array<{
    channel: string;
    circuitState: string;
    consecutiveFailures: number;
    lastErrorCode: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    rateLimitRemaining: number | null;
  }>;
}

export interface QueueHealthSummary {
  queuedCount: number;
  retryScheduledCount: number;
  processingCount: number;
  deadLetterCount: number;
  sentOrAcceptedCount: number;
  deliveredCount: number;
  failedCount: number;
}

function sealScopePayload(scopeKey: string, outboxId: string, data: unknown): string {
  return ServerSecretVault.encrypt(
    JSON.stringify({ v: 1, scopeKey, outboxId, data })
  );
}

function openScopePayload<T>(scopeKey: string, outboxId: string, ciphertext: string): T {
  const parsed = JSON.parse(ServerSecretVault.decrypt(ciphertext));
  if (!parsed || parsed.v !== 1 || parsed.scopeKey !== scopeKey || parsed.outboxId !== outboxId) {
    throw new Error('INVALID_CMAG_ENCRYPTED_SCOPE');
  }
  return parsed.data as T;
}

function computeBackoffSeconds(attempt: number, randomFn = Math.random): number {
  const base = 30 * 2 ** Math.max(0, attempt - 1);
  const jitterFactor = 0.85 + randomFn() * 0.3;
  return Math.min(3600, Math.max(15, Math.round(base * jitterFactor)));
}

function safeErrorCode(code: string | undefined): string {
  if (!code) return 'dispatch_error';
  return /^[a-z0-9_:-]{1,64}$/i.test(code) ? code : 'dispatch_error';
}

function safeErrorMessage(msg: string | undefined): string | null {
  if (!msg) return null;
  return msg.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 240);
}

function redactSecretFields(creds: ProviderCredentials): {
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  smsSenderName: string | null;
  smsRoute: string | null;
  whatsappSender: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
} {
  return {
    hasApiKey: Boolean(creds.apiKey && creds.apiKey.trim()),
    hasWebhookSecret: Boolean(creds.webhookSecret && creds.webhookSecret.trim()),
    smsSenderName: creds.smsSenderName ?? null,
    smsRoute: creds.smsRoute ?? null,
    whatsappSender: creds.whatsappSender ?? null,
    wabaId: creds.wabaId ?? null,
    phoneNumberId: creds.phoneNumberId ?? null
  };
}

export class CmagDeliveryEngine {
  private workerTimer: ReturnType<typeof setInterval> | null = null;
  private workerRunning = false;
  private workerInFlight = false;
  private lastTickAt: string | null = null;
  private lastTickProcessed = 0;
  private lastTickError: string | null = null;

  constructor(
    private readonly pool: DatabasePool,
    private readonly registry: MessagingProviderRegistry = new MessagingProviderRegistry(),
    private readonly randomFn: () => number = Math.random
  ) {}

  getProviderRegistry(): MessagingProviderRegistry {
    return this.registry;
  }

  getWorkerHealth() {
    return {
      running: this.workerRunning,
      inFlight: this.workerInFlight,
      lastTickAt: this.lastTickAt,
      lastTickProcessed: this.lastTickProcessed,
      lastTickError: this.lastTickError
    };
  }

  startWorker(workerPrincipal: VerifiedTenantPrincipal, intervalMs = 5_000): void {
    if (this.workerTimer) return;
    this.workerRunning = true;
    this.workerTimer = setInterval(() => {
      if (this.workerInFlight) return;
      this.workerInFlight = true;
      void this.dispatchBatch(workerPrincipal, 20)
        .then(res => {
          this.lastTickAt = new Date().toISOString();
          this.lastTickProcessed = res.processed;
          this.lastTickError = null;
        })
        .catch((err: unknown) => {
          this.lastTickAt = new Date().toISOString();
          this.lastTickError = err instanceof Error ? err.message : 'worker_tick_failed';
        })
        .finally(() => {
          this.workerInFlight = false;
        });
    }, Math.max(500, intervalMs));
    this.workerTimer.unref?.();
  }

  stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
    this.workerRunning = false;
  }

  async resolveRuntimeProviders(client: DatabaseClient): Promise<{
    providers: ProviderConfigRecord[];
    platformConfig: {
      environment: DeploymentEnvironment;
      smsEnabled: boolean;
      whatsappEnabled: boolean;
      preferredChannel: GatewayChannel;
      authChannelPolicy: string;
      fallbackEnabled: boolean;
      defaultSmsProvider: string;
      defaultWhatsappProvider: string;
      failoverSmsProvider: string | null;
      failoverWhatsappProvider: string | null;
      dailySmsLimit: number;
      dailyWhatsappLimit: number;
      monthlyBudgetMinor: number | null;
      currency: string;
      retentionDays: number;
      suspendedChannels: string[];
    };
  }> {
    const envProviders = this.registry.getEnvConfigs();
    const envById = new Map(envProviders.map(p => [p.id, p]));
    const runtimeEnv = currentDeploymentEnvironment();

    const cfgResult = await client.query<{
      environment: DeploymentEnvironment;
      sms_enabled: boolean;
      whatsapp_enabled: boolean;
      preferred_channel: GatewayChannel;
      auth_channel_policy: string;
      fallback_enabled: boolean;
      default_sms_provider: string;
      default_whatsapp_provider: string;
      failover_sms_provider: string | null;
      failover_whatsapp_provider: string | null;
      daily_sms_limit: number;
      daily_whatsapp_limit: number;
      monthly_budget_minor: number | null;
      currency: string;
      retention_days: number;
      suspended_channels: string[];
    }>(`SELECT * FROM control_plane.cmag_platform_config WHERE id = 'default' LIMIT 1`);

    const pRow = cfgResult.rows[0];
    const platformConfig = pRow
      ? {
          environment: pRow.environment,
          smsEnabled: pRow.sms_enabled,
          whatsappEnabled: pRow.whatsapp_enabled,
          preferredChannel: pRow.preferred_channel,
          authChannelPolicy: pRow.auth_channel_policy,
          fallbackEnabled: pRow.fallback_enabled,
          defaultSmsProvider: pRow.default_sms_provider,
          defaultWhatsappProvider: pRow.default_whatsapp_provider,
          failoverSmsProvider: pRow.failover_sms_provider,
          failoverWhatsappProvider: pRow.failover_whatsapp_provider,
          dailySmsLimit: pRow.daily_sms_limit,
          dailyWhatsappLimit: pRow.daily_whatsapp_limit,
          monthlyBudgetMinor: pRow.monthly_budget_minor,
          currency: pRow.currency,
          retentionDays: pRow.retention_days,
          suspendedChannels: pRow.suspended_channels ?? []
        }
      : {
          environment: runtimeEnv,
          smsEnabled: envProviders.some(p => p.enabled && p.supportedChannels.includes('sms')),
          whatsappEnabled: envProviders.some(p => p.enabled && p.supportedChannels.includes('whatsapp')),
          preferredChannel: 'sms' as GatewayChannel,
          authChannelPolicy: 'sms_only',
          fallbackEnabled: false,
          defaultSmsProvider: 'sendchamp',
          defaultWhatsappProvider: 'sendchamp',
          failoverSmsProvider: null,
          failoverWhatsappProvider: null,
          dailySmsLimit: 5000,
          dailyWhatsappLimit: 5000,
          monthlyBudgetMinor: null,
          currency: 'NGN',
          retentionDays: 90,
          suspendedChannels: []
        };

    const dbProvidersRes = await client.query<{
      id: string;
      display_name: string;
      provider_type: 'sms' | 'whatsapp' | 'multi';
      supported_channels: ('sms' | 'whatsapp')[];
      environment: DeploymentEnvironment;
      enabled: boolean;
      suspended: boolean;
      suspended_reason: string | null;
      priority: number;
      base_url: string;
      encrypted_credentials: string | null;
      encrypted_webhook_secret: string | null;
      readiness_status: ProviderReadinessStatus;
      options: Record<string, unknown>;
    }>(`SELECT * FROM control_plane.cmag_provider_configs ORDER BY priority ASC, id ASC`);

    const resolved: ProviderConfigRecord[] = [];
    for (const row of dbProvidersRes.rows) {
      const envFallback = envById.get(row.id);
      let creds: ProviderCredentials = { ...(envFallback?.credentials ?? {}) };
      if (row.encrypted_credentials) {
        try {
          const decoded = JSON.parse(ServerSecretVault.decrypt(row.encrypted_credentials)) as ProviderCredentials;
          creds = { ...creds, ...decoded };
        } catch {
          // Leave existing env fallback or mark invalid at validation time
        }
      }
      if (row.encrypted_webhook_secret) {
        try {
          creds.webhookSecret = ServerSecretVault.decrypt(row.encrypted_webhook_secret);
        } catch {
          // ignore
        }
      }
      resolved.push({
        id: row.id,
        displayName: row.display_name,
        providerType: row.provider_type,
        supportedChannels: row.supported_channels,
        environment: row.environment || envFallback?.environment || runtimeEnv,
        enabled: row.enabled || (row.readiness_status === 'not_configured' && !row.encrypted_credentials && Boolean(envFallback?.enabled)),
        suspended: row.suspended,
        suspendedReason: row.suspended_reason,
        priority: row.priority,
        baseUrl: row.base_url || envFallback?.baseUrl || '',
        credentials: { ...creds, environment: row.environment || runtimeEnv },
        options: { ...(envFallback?.options ?? {}), ...(row.options ?? {}) }
      });
    }

    // Merge env providers missing from DB rows (useful for unit tests with custom adapters)
    for (const envP of envProviders) {
      if (!resolved.some(r => r.id === envP.id)) {
        resolved.push(envP);
      }
    }

    return { providers: resolved, platformConfig };
  }

  async listProviderConfigs(principal: VerifiedTenantPrincipal): Promise<RedactedProviderSummary[]> {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const { providers, platformConfig } = await this.resolveRuntimeProviders(client);
      const dbMetaRes = await client.query<{
        id: string;
        readiness_status: ProviderReadinessStatus;
        last_verified_at: Date | null;
      }>(`SELECT id, readiness_status, last_verified_at FROM control_plane.cmag_provider_configs`);
      const metaById = new Map(dbMetaRes.rows.map(r => [r.id, r]));

      const healthRes = await client.query<{
        provider_id: string;
        channel: string;
        circuit_state: string;
        consecutive_failures: number;
        last_error_code: string | null;
        last_success_at: Date | null;
        last_failure_at: Date | null;
        rate_limit_remaining: number | null;
      }>(`SELECT * FROM control_plane.cmag_provider_health ORDER BY provider_id, channel`);

      return providers.map(provider => {
        const adapter = this.registry.getAdapter(provider.id);
        const validation = adapter
          ? adapter.validateConfig(provider, platformConfig.environment)
          : { valid: false, readinessStatus: 'not_configured' as ProviderReadinessStatus, errors: [] };
        const meta = metaById.get(provider.id);
        const redacted = redactSecretFields(provider.credentials);
        return {
          id: provider.id,
          displayName: provider.displayName,
          providerType: provider.providerType,
          supportedChannels: [...provider.supportedChannels],
          environment: provider.environment,
          enabled: provider.enabled,
          suspended: provider.suspended,
          suspendedReason: provider.suspendedReason ?? null,
          priority: provider.priority,
          baseUrl: provider.baseUrl,
          readinessStatus: provider.suspended
            ? 'channel_disabled'
            : validation.valid
              ? 'operational'
              : (meta?.readiness_status && meta.readiness_status !== 'not_configured'
                ? validation.readinessStatus
                : validation.readinessStatus),
          ...redacted,
          lastVerifiedAt: meta?.last_verified_at ? meta.last_verified_at.toISOString() : null,
          circuitHealth: healthRes.rows
            .filter(h => h.provider_id === provider.id)
            .map(h => ({
              channel: h.channel,
              circuitState: h.circuit_state,
              consecutiveFailures: h.consecutive_failures,
              lastErrorCode: h.last_error_code,
              lastSuccessAt: h.last_success_at ? h.last_success_at.toISOString() : null,
              lastFailureAt: h.last_failure_at ? h.last_failure_at.toISOString() : null,
              rateLimitRemaining: h.rate_limit_remaining
            }))
        };
      });
    });
  }

  async upsertProviderConfig(
    principal: VerifiedTenantPrincipal,
    providerId: string,
    input: {
      enabled?: boolean;
      priority?: number;
      environment?: DeploymentEnvironment;
      baseUrl?: string;
      credentials?: ProviderCredentials;
      options?: Record<string, unknown>;
      verifyLive?: boolean;
    }
  ): Promise<{ readinessStatus: ProviderReadinessStatus; errors: string[] }> {
    const adapter = this.registry.getAdapter(providerId);
    if (!adapter) throw new Error('CMAG_PROVIDER_NOT_FOUND');

    return withControlPlaneTransaction(this.pool, principal, async client => {
      const { providers, platformConfig } = await this.resolveRuntimeProviders(client);
      const existing = providers.find(p => p.id === providerId);
      const mergedCredentials: ProviderCredentials = {
        ...(existing?.credentials ?? {}),
        ...(input.credentials ?? {})
      };
      const webhookSecret = mergedCredentials.webhookSecret;
      const credsToEncrypt = { ...mergedCredentials };
      delete credsToEncrypt.webhookSecret;

      const candidate: ProviderConfigRecord = {
        id: providerId,
        displayName: existing?.displayName ?? adapter.displayName,
        providerType: existing?.providerType ?? (adapter.supportedChannels.length > 1 ? 'multi' : adapter.supportedChannels[0]),
        supportedChannels: existing?.supportedChannels ?? adapter.supportedChannels,
        environment: input.environment ?? existing?.environment ?? platformConfig.environment,
        enabled: input.enabled ?? existing?.enabled ?? false,
        suspended: existing?.suspended ?? false,
        suspendedReason: existing?.suspendedReason ?? null,
        priority: input.priority ?? existing?.priority ?? 50,
        baseUrl: input.baseUrl ?? existing?.baseUrl ?? '',
        credentials: mergedCredentials,
        options: { ...(existing?.options ?? {}), ...(input.options ?? {}) }
      };

      const validation = adapter.validateConfig(candidate, platformConfig.environment);
      let readinessStatus: ProviderReadinessStatus = validation.readinessStatus;
      const errors = [...validation.errors];
      let verifiedAt: Date | null = null;

      if (validation.valid && input.verifyLive) {
        const live = await adapter.verifyCredentials(candidate, this.registry.getTransport());
        readinessStatus = live.readinessStatus;
        if (!live.valid && live.reason) errors.push(live.reason);
        if (live.valid) verifiedAt = new Date();
      }

      const encryptedCreds = Object.keys(credsToEncrypt).length > 0
        ? ServerSecretVault.encrypt(JSON.stringify(credsToEncrypt))
        : null;
      const encryptedWebhookSecret = webhookSecret
        ? ServerSecretVault.encrypt(webhookSecret)
        : null;

      await client.query(
        `INSERT INTO control_plane.cmag_provider_configs (
           id, display_name, provider_type, supported_channels, environment, enabled,
           priority, base_url, encrypted_credentials, encrypted_webhook_secret,
           options, readiness_status, last_verified_at, updated_by, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, now())
         ON CONFLICT (id) DO UPDATE SET
           environment = EXCLUDED.environment,
           enabled = EXCLUDED.enabled,
           priority = EXCLUDED.priority,
           base_url = EXCLUDED.base_url,
           encrypted_credentials = COALESCE(EXCLUDED.encrypted_credentials, control_plane.cmag_provider_configs.encrypted_credentials),
           encrypted_webhook_secret = COALESCE(EXCLUDED.encrypted_webhook_secret, control_plane.cmag_provider_configs.encrypted_webhook_secret),
           options = EXCLUDED.options,
           readiness_status = EXCLUDED.readiness_status,
           last_verified_at = COALESCE(EXCLUDED.last_verified_at, control_plane.cmag_provider_configs.last_verified_at),
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [
          candidate.id,
          candidate.displayName,
          candidate.providerType,
          [...candidate.supportedChannels],
          candidate.environment,
          candidate.enabled,
          candidate.priority,
          candidate.baseUrl,
          encryptedCreds,
          encryptedWebhookSecret,
          JSON.stringify(candidate.options),
          readinessStatus,
          verifiedAt,
          principal.email || principal.userId || 'platform_admin'
        ]
      );

      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, 'provider_config_updated', 'provider', $2, 'success', $3::jsonb)`,
        [
          principal.email || principal.userId || 'platform_admin',
          providerId,
          JSON.stringify({
            enabled: candidate.enabled,
            environment: candidate.environment,
            readinessStatus,
            hasApiKey: Boolean(mergedCredentials.apiKey)
          })
        ]
      );

      return { readinessStatus, errors };
    });
  }

  async suspendProvider(
    principal: VerifiedTenantPrincipal,
    providerId: string,
    suspended: boolean,
    reason?: string
  ): Promise<void> {
    await withControlPlaneTransaction(this.pool, principal, async client => {
      const updated = await client.query(
        `UPDATE control_plane.cmag_provider_configs
         SET suspended = $2,
             suspended_reason = $3,
             readiness_status = CASE WHEN $2 THEN 'channel_disabled' ELSE readiness_status END,
             updated_by = $4,
             updated_at = now()
         WHERE id = $1`,
        [
          providerId,
          suspended,
          suspended ? (reason || 'Suspended by platform administrator').slice(0, 240) : null,
          principal.email || principal.userId || 'platform_admin'
        ]
      );
      if (updated.rowCount !== 1) throw new Error('CMAG_PROVIDER_NOT_FOUND');

      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, $2, 'provider', $3, 'success', $4::jsonb)`,
        [
          principal.email || principal.userId || 'platform_admin',
          suspended ? 'provider_suspended' : 'provider_resumed',
          providerId,
          JSON.stringify({ suspended, reason: reason || null })
        ]
      );
    });
  }

  async enqueuePlatformMessage(
    principal: VerifiedTenantPrincipal,
    envelope: Omit<CmagMessageEnvelope, 'scope' | 'tenantId'>
  ): Promise<EnqueueResult> {
    const outboxId = randomUUID();
    const correlationId = envelope.correlationId || `cmag_plat_${randomUUID()}`;
    const initialStatus: MessageLifecycleState =
      envelope.scheduledFor && envelope.scheduledFor.getTime() > Date.now()
        ? 'queued'
        : 'queued';

    return withControlPlaneTransaction(this.pool, principal, async client => {
      if (envelope.idempotencyKey) {
        const existing = await client.query<{ id: string; status: MessageLifecycleState; correlation_id: string | null }>(
          `SELECT id, status, correlation_id FROM control_plane.cmag_platform_outbox
           WHERE idempotency_key = $1 LIMIT 1`,
          [envelope.idempotencyKey]
        );
        if (existing.rows[0]) {
          return {
            outboxId: existing.rows[0].id,
            status: existing.rows[0].status,
            idempotentReplay: true,
            correlationId: existing.rows[0].correlation_id || correlationId
          };
        }
      }

      const { platformConfig } = await this.resolveRuntimeProviders(client);
      if (platformConfig.suspendedChannels.includes(envelope.request.channel)) {
        throw new Error('CMAG_CHANNEL_SUSPENDED');
      }

      if (envelope.classification !== 'authentication' && envelope.classification !== 'emergency') {
        const dailyLimit = envelope.request.channel === 'sms'
          ? platformConfig.dailySmsLimit
          : envelope.request.channel === 'whatsapp'
            ? platformConfig.dailyWhatsappLimit
            : 100_000;
        const countRes = await client.query<{ cnt: number }>(
          `SELECT count(*)::int AS cnt FROM control_plane.cmag_platform_outbox
           WHERE channel = $1 AND created_at >= date_trunc('day', now())`,
          [envelope.request.channel]
        );
        if ((countRes.rows[0]?.cnt ?? 0) >= dailyLimit) {
          throw new Error('CMAG_PLATFORM_QUOTA_EXCEEDED');
        }
      }

      const encrypted = sealScopePayload('platform', outboxId, {
        request: envelope.request,
        preferredProviderId: envelope.preferredProviderId,
        failoverProviderId: envelope.failoverProviderId
      });

      const recipientRef = envelope.recipientRef
        || createHash('sha256').update(String((envelope.request as any).to || '')).digest('hex').slice(0, 16);

      await client.query(
        `INSERT INTO control_plane.cmag_platform_outbox (
           id, channel, classification, category, purpose, environment,
           correlation_id, idempotency_key, template_key, locale, provider_id,
           recipient_ref, encrypted_request, status, max_attempts, next_attempt_at, metadata
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16, $17::jsonb
         )`,
        [
          outboxId,
          envelope.request.channel,
          envelope.classification,
          envelope.category,
          envelope.purpose,
          envelope.environment,
          correlationId,
          envelope.idempotencyKey ?? null,
          envelope.templateKey ?? null,
          envelope.locale ?? 'en',
          envelope.preferredProviderId ?? null,
          recipientRef,
          encrypted,
          initialStatus,
          envelope.maxAttempts ?? 5,
          envelope.scheduledFor ?? new Date(),
          JSON.stringify(envelope.metadata ?? {})
        ]
      );

      return { outboxId, status: initialStatus, idempotentReplay: false, correlationId };
    });
  }

  async enqueueTenantMessage(
    principal: VerifiedTenantPrincipal,
    envelope: CmagMessageEnvelope
  ): Promise<EnqueueResult> {
    if (!envelope.tenantId || envelope.tenantId !== principal.tenantId) {
      throw new Error('CMAG_TENANT_SCOPE_MISMATCH');
    }
    const outboxId = randomUUID();
    const correlationId = envelope.correlationId || `cmag_sch_${randomUUID()}`;
    const tenantId = principal.tenantId;

    return withTenantTransaction(this.pool, principal, async client => {
      if (envelope.idempotencyKey) {
        const existing = await client.query<{ id: string; status: MessageLifecycleState; correlation_id: string | null }>(
          `SELECT id, status, correlation_id FROM production.notification_outbox
           WHERE tenant_id = $1 AND idempotency_key = $2 LIMIT 1`,
          [tenantId, envelope.idempotencyKey]
        );
        if (existing.rows[0]) {
          return {
            outboxId: existing.rows[0].id,
            status: existing.rows[0].status,
            idempotentReplay: true,
            correlationId: existing.rows[0].correlation_id || correlationId
          };
        }
      }

      const tenantCfgRes = await client.query<{
        suspended: boolean;
        daily_quota: number;
        monthly_quota: number;
        monthly_budget_minor: number | null;
      }>(`SELECT suspended, daily_quota, monthly_quota, monthly_budget_minor
          FROM production.cmag_tenant_configs WHERE tenant_id = $1`, [tenantId]);
      const tenantCfg = tenantCfgRes.rows[0];
      if (tenantCfg?.suspended) {
        throw new Error('CMAG_TENANT_SUSPENDED');
      }

      if (envelope.classification !== 'authentication' && envelope.classification !== 'emergency' && tenantCfg) {
        const usageRes = await client.query<{ daily_sent: number; monthly_sent: number; monthly_cost: number }>(
          `SELECT
             COALESCE(SUM(CASE WHEN usage_date = CURRENT_DATE THEN sent_count ELSE 0 END), 0)::int AS daily_sent,
             COALESCE(SUM(sent_count), 0)::int AS monthly_sent,
             COALESCE(SUM(cost_minor), 0)::int AS monthly_cost
           FROM production.cmag_usage_records
           WHERE tenant_id = $1 AND usage_date >= date_trunc('month', CURRENT_DATE)::date`,
          [tenantId]
        );
        const usage = usageRes.rows[0];
        if ((usage?.daily_sent ?? 0) >= tenantCfg.daily_quota) {
          throw new Error('CMAG_DAILY_QUOTA_EXCEEDED');
        }
        if ((usage?.monthly_sent ?? 0) >= tenantCfg.monthly_quota) {
          throw new Error('CMAG_MONTHLY_QUOTA_EXCEEDED');
        }
        if (tenantCfg.monthly_budget_minor !== null && (usage?.monthly_cost ?? 0) >= tenantCfg.monthly_budget_minor) {
          throw new Error('CMAG_MONTHLY_BUDGET_EXCEEDED');
        }
      }

      const encrypted = sealScopePayload(tenantId, outboxId, {
        request: envelope.request,
        preferredProviderId: envelope.preferredProviderId,
        failoverProviderId: envelope.failoverProviderId
      });

      const recipientRef = envelope.recipientRef
        || createHash('sha256').update(String((envelope.request as any).to || '')).digest('hex').slice(0, 16);

      await client.query(
        `INSERT INTO production.notification_outbox (
           tenant_id, id, channel, encrypted_request, status, max_attempts, next_attempt_at,
           scope, application_id, application_instance_id, environment, classification, category,
           purpose, correlation_id, idempotency_key, template_key, locale, provider_id,
           recipient_ref, student_id, guardian_id, broadcast_campaign_id, scheduled_for, metadata
         ) VALUES (
           $1, $2, $3, $4, 'queued', $5, $6,
           $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18,
           $19, $20, $21, $22, $23, $24::jsonb
         )`,
        [
          tenantId,
          outboxId,
          envelope.request.channel,
          encrypted,
          envelope.maxAttempts ?? 5,
          envelope.scheduledFor ?? new Date(),
          envelope.scope,
          envelope.applicationId,
          envelope.applicationInstanceId ?? null,
          envelope.environment,
          envelope.classification,
          envelope.category,
          envelope.purpose,
          correlationId,
          envelope.idempotencyKey ?? null,
          envelope.templateKey ?? null,
          envelope.locale ?? 'en',
          envelope.preferredProviderId ?? null,
          recipientRef,
          envelope.studentId ?? null,
          envelope.guardianId ?? null,
          envelope.broadcastCampaignId ?? null,
          envelope.scheduledFor ?? null,
          JSON.stringify(envelope.metadata ?? {})
        ]
      );

      return { outboxId, status: 'queued', idempotentReplay: false, correlationId };
    });
  }

  private async dispatchChannelPayload(
    channel: CmagMessageEnvelope['request']['channel'],
    payload: {
      request: CmagMessageEnvelope['request'];
      preferredProviderId?: string;
      failoverProviderId?: string;
    },
    providers: ProviderConfigRecord[],
    platformConfig: {
      environment: DeploymentEnvironment;
      fallbackEnabled: boolean;
      defaultSmsProvider: string;
      defaultWhatsappProvider: string;
      failoverSmsProvider: string | null;
      failoverWhatsappProvider: string | null;
      suspendedChannels: string[];
    },
    circuitHealth: Map<string, { circuitState: string; nextProbeAt: Date | null }>,
    idempotencyKey?: string
  ): Promise<{
    outcome: ProviderDispatchOutcome;
    usedProviderId: string;
    failoverFromProvider?: string;
  }> {
    if (channel === 'email') {
      const req = payload.request as Extract<CmagMessageEnvelope['request'], { channel: 'email' }>;
      const res = await this.registry.getEmailFallback().send({
        channel: 'email',
        to: req.to,
        subject: req.subject,
        text: req.text
      });
      return {
        usedProviderId: 'resend_email',
        outcome: res.status === 'accepted'
          ? {
              accepted: true,
              lifecycleState: 'provider_accepted',
              providerId: 'resend_email',
              providerMessageId: res.providerMessageId,
              retryable: false
            }
          : {
              accepted: false,
              lifecycleState: 'failed',
              providerId: 'resend_email',
              errorCode: res.errorCode,
              retryable: res.retryable
            }
      };
    }

    if ((channel as string) === 'web_push') {
      return {
        usedProviderId: 'web_push',
        outcome: {
          accepted: false,
          lifecycleState: 'failed',
          providerId: 'web_push',
          errorCode: 'use_notification_service_for_web_push',
          retryable: false
        }
      };
    }

    if (platformConfig.suspendedChannels.includes(channel)) {
      return {
        usedProviderId: payload.preferredProviderId || 'none',
        outcome: {
          accepted: false,
          lifecycleState: 'failed',
          providerId: payload.preferredProviderId || 'none',
          errorCode: 'channel_suspended',
          failureCategory: 'channel_disabled',
          retryable: false
        }
      };
    }

    const primaryId = payload.preferredProviderId || (channel === 'sms'
      ? platformConfig.defaultSmsProvider
      : platformConfig.defaultWhatsappProvider);
    const failoverId = payload.failoverProviderId || (platformConfig.fallbackEnabled
      ? (channel === 'sms' ? platformConfig.failoverSmsProvider : platformConfig.failoverWhatsappProvider) ?? undefined
      : undefined);

    const orderedCandidateIds = [primaryId, ...(failoverId && failoverId !== primaryId ? [failoverId] : [])];
    const now = Date.now();
    let failoverFrom: string | undefined;
    let lastOutcome: ProviderDispatchOutcome = {
      accepted: false,
      lifecycleState: 'failed',
      providerId: primaryId,
      errorCode: 'provider_not_configured',
      failureCategory: 'channel_disabled',
      retryable: false
    };

    for (let i = 0; i < orderedCandidateIds.length; i += 1) {
      const candidateId = orderedCandidateIds[i];
      const adapter = this.registry.getAdapter(candidateId);
      const cfg = providers.find(p => p.id === candidateId);
      if (!adapter || !cfg || (i > 0 && (!cfg.enabled || cfg.suspended))) {
        if (i === 0) failoverFrom = candidateId;
        continue;
      }

      const health = circuitHealth.get(`${candidateId}:${channel}`);
      if (health && health.circuitState === 'open' && health.nextProbeAt && health.nextProbeAt.getTime() > now) {
        if (i === 0) {
          lastOutcome = {
            accepted: false,
            lifecycleState: 'failed',
            providerId: candidateId,
            errorCode: 'circuit_breaker_open',
            failureCategory: 'provider_unavailable',
            retryable: true
          };
          failoverFrom = candidateId;
        }
        continue;
      }

      const validation = adapter.validateConfig(cfg, platformConfig.environment);
      if (!validation.valid) {
        if (i > 0) {
          continue;
        }
        lastOutcome = {
          accepted: false,
          lifecycleState: 'failed',
          providerId: candidateId,
          errorCode: validation.readinessStatus,
          errorMessage: validation.errors.join(' '),
          failureCategory: validation.readinessStatus === 'credentials_missing' ? 'credentials_invalid' : 'sender_unapproved',
          retryable: false
        };
        if (validation.readinessStatus !== 'credentials_invalid') {
          failoverFrom = candidateId;
          continue;
        }
        return { outcome: lastOutcome, usedProviderId: candidateId, failoverFromProvider: failoverFrom };
      }

      const transport = this.registry.getTransport();
      const outcome = channel === 'sms'
        ? await adapter.sendSms({ ...(payload.request as any), idempotencyKey }, cfg, transport)
        : await adapter.sendWhatsApp({ ...(payload.request as any), idempotencyKey }, cfg, transport);

      if (outcome.accepted) {
        return {
          outcome,
          usedProviderId: candidateId,
          ...(i > 0 ? { failoverFromProvider: failoverFrom } : {})
        };
      }

      lastOutcome = outcome;
      if (i === 0 && (outcome.retryable || outcome.failureCategory === 'provider_unavailable')) {
        failoverFrom = candidateId;
        continue;
      }
      return { outcome, usedProviderId: candidateId, ...(i > 0 ? { failoverFromProvider: failoverFrom } : {}) };
    }

    return {
      outcome: lastOutcome,
      usedProviderId: primaryId,
      ...(failoverFrom ? { failoverFromProvider: failoverFrom } : {})
    };
  }

  private async updateCircuitHealth(
    client: DatabaseClient,
    providerId: string,
    channel: string,
    outcome: ProviderDispatchOutcome
  ): Promise<void> {
    if (!['sendchamp', 'meta_whatsapp', 'termii_sms'].includes(providerId)) return;
    if (outcome.accepted) {
      await client.query(
        `INSERT INTO control_plane.cmag_provider_health
           (provider_id, channel, circuit_state, consecutive_failures, opened_at, next_probe_at, last_success_at, rate_limit_remaining, rate_limit_reset_at, updated_at)
         VALUES ($1, $2, 'closed', 0, NULL, NULL, now(), $3, $4, now())
         ON CONFLICT (provider_id, channel) DO UPDATE SET
           circuit_state = 'closed',
           consecutive_failures = 0,
           opened_at = NULL,
           next_probe_at = NULL,
           last_success_at = now(),
           rate_limit_remaining = COALESCE(EXCLUDED.rate_limit_remaining, control_plane.cmag_provider_health.rate_limit_remaining),
           rate_limit_reset_at = COALESCE(EXCLUDED.rate_limit_reset_at, control_plane.cmag_provider_health.rate_limit_reset_at),
           updated_at = now()`,
        [providerId, channel, outcome.rateLimitRemaining ?? null, outcome.rateLimitResetAt ?? null]
      );
      return;
    }

    if (outcome.retryable || outcome.failureCategory === 'provider_unavailable' || outcome.failureCategory === 'network_timeout') {
      await client.query(
        `INSERT INTO control_plane.cmag_provider_health
           (provider_id, channel, circuit_state, consecutive_failures, last_failure_at, last_error_code, updated_at)
         VALUES ($1, $2, 'closed', 1, now(), $3, now())
         ON CONFLICT (provider_id, channel) DO UPDATE SET
           consecutive_failures = control_plane.cmag_provider_health.consecutive_failures + 1,
           circuit_state = CASE
             WHEN control_plane.cmag_provider_health.consecutive_failures + 1 >= $4 THEN 'open'
             ELSE control_plane.cmag_provider_health.circuit_state
           END,
           opened_at = CASE
             WHEN control_plane.cmag_provider_health.consecutive_failures + 1 >= $4 THEN now()
             ELSE control_plane.cmag_provider_health.opened_at
           END,
           next_probe_at = CASE
             WHEN control_plane.cmag_provider_health.consecutive_failures + 1 >= $4 THEN now() + make_interval(secs => $5)
             ELSE control_plane.cmag_provider_health.next_probe_at
           END,
           last_failure_at = now(),
           last_error_code = EXCLUDED.last_error_code,
           updated_at = now()`,
        [providerId, channel, safeErrorCode(outcome.errorCode), CIRCUIT_FAILURE_THRESHOLD, CIRCUIT_OPEN_SECONDS]
      );
    }
  }

  async dispatchOnePlatform(
    workerPrincipal: VerifiedTenantPrincipal
  ): Promise<{ id: string; status: MessageLifecycleState; providerId?: string } | null> {
    const claimed = await withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const res = await client.query<{
        id: string;
        channel: GatewayChannel;
        encrypted_request: string;
        attempt_count: number;
        max_attempts: number;
        lease_token: string | null;
        idempotency_key: string | null;
      }>(
        `SELECT id, channel, encrypted_request, attempt_count, max_attempts, lease_token, idempotency_key
         FROM control_plane.cmag_platform_outbox
         WHERE status IN ('queued', 'retry_scheduled')
           AND next_attempt_at <= now()
           AND (lease_until IS NULL OR lease_until <= now())
         ORDER BY next_attempt_at ASC, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`
      );
      const row = res.rows[0];
      if (!row) return null;

      if (row.lease_token) {
        await client.query(
          `UPDATE control_plane.cmag_platform_attempts
           SET status = 'failed', error_code = 'lease_expired', finished_at = now()
           WHERE outbox_id = $1 AND lease_token = $2 AND status = 'pending'`,
          [row.id, row.lease_token]
        );
        if (row.attempt_count >= row.max_attempts) {
          await client.query(
            `UPDATE control_plane.cmag_platform_outbox
             SET status = 'failed', last_error_code = 'lease_expired', dead_lettered_at = now(),
                 lease_token = NULL, lease_until = NULL, updated_at = now()
             WHERE id = $1`,
            [row.id]
          );
          return { exhausted: true as const, id: row.id };
        }
      }

      const token = randomUUID();
      const attempt = row.attempt_count + 1;
      await client.query(
        `UPDATE control_plane.cmag_platform_outbox
         SET status = 'processing', attempt_count = $2, lease_token = $3,
             lease_until = now() + interval '60 seconds', updated_at = now()
         WHERE id = $1`,
        [row.id, attempt, token]
      );
      await client.query(
        `INSERT INTO control_plane.cmag_platform_attempts (outbox_id, attempt_number, lease_token, status)
         VALUES ($1, $2, $3, 'pending')`,
        [row.id, attempt, token]
      );
      const runtime = await this.resolveRuntimeProviders(client);
      const healthRows = await client.query<{ provider_id: string; channel: string; circuit_state: string; next_probe_at: Date | null }>(
        `SELECT provider_id, channel, circuit_state, next_probe_at FROM control_plane.cmag_provider_health`
      );
      const healthMap = new Map(healthRows.rows.map(h => [
        `${h.provider_id}:${h.channel}`,
        { circuitState: h.circuit_state, nextProbeAt: h.next_probe_at }
      ]));

      return { exhausted: false as const, row, token, attempt, runtime, healthMap };
    });

    if (!claimed) return null;
    if (claimed.exhausted) return { id: claimed.id, status: 'failed' };

    const startMs = Date.now();
    let result: { outcome: ProviderDispatchOutcome; usedProviderId: string; failoverFromProvider?: string };
    try {
      const payload = openScopePayload<{
        request: CmagMessageEnvelope['request'];
        preferredProviderId?: string;
        failoverProviderId?: string;
      }>('platform', claimed.row.id, claimed.row.encrypted_request);
      result = await this.dispatchChannelPayload(
        claimed.row.channel,
        payload,
        claimed.runtime.providers,
        claimed.runtime.platformConfig,
        claimed.healthMap,
        claimed.row.idempotency_key ?? undefined
      );
    } catch {
      result = {
        usedProviderId: 'unknown',
        outcome: {
          accepted: false,
          lifecycleState: 'failed',
          providerId: 'unknown',
          errorCode: 'dispatch_error',
          retryable: true
        }
      };
    }

    const latencyMs = Math.max(0, Date.now() - startMs);
    const { outcome, usedProviderId, failoverFromProvider } = result;
    const errorCode = outcome.accepted ? null : safeErrorCode(outcome.errorCode);
    const errorMessage = outcome.accepted ? null : safeErrorMessage(outcome.errorMessage);
    const retryMore = !outcome.accepted && outcome.retryable && claimed.attempt < claimed.row.max_attempts;
    const nextStatus: MessageLifecycleState = outcome.accepted
      ? outcome.lifecycleState
      : retryMore
        ? 'retry_scheduled'
        : 'failed';
    const delaySeconds = computeBackoffSeconds(claimed.attempt, this.randomFn);

    const finalized = await withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const upd = await client.query(
        `UPDATE control_plane.cmag_platform_outbox
         SET status = $3,
             provider_id = $4,
             provider_message_id = COALESCE($5, provider_message_id),
             last_error_code = $6,
             last_error_message = $7,
             next_attempt_at = CASE WHEN $3 = 'retry_scheduled' THEN now() + $8 * interval '1 second' ELSE next_attempt_at END,
             sent_at = CASE WHEN $9 THEN COALESCE(sent_at, now()) ELSE sent_at END,
             dead_lettered_at = CASE WHEN $3 = 'failed' THEN COALESCE(dead_lettered_at, now()) ELSE dead_lettered_at END,
             cost_minor = COALESCE($10, cost_minor),
             currency = COALESCE($11, currency),
             lease_token = NULL,
             lease_until = NULL,
             updated_at = now()
         WHERE id = $1 AND lease_token = $2 AND lease_until > now()`,
        [
          claimed.row.id,
          claimed.token,
          nextStatus,
          usedProviderId,
          outcome.providerMessageId ?? null,
          errorCode,
          errorMessage,
          delaySeconds,
          outcome.accepted,
          outcome.estimatedCostMinor ?? null,
          outcome.currency ?? null
        ]
      );
      if (upd.rowCount !== 1) return false;

      await client.query(
        `UPDATE control_plane.cmag_platform_attempts
         SET provider_id = $3,
             failover_from_provider = $4,
             status = $5,
             error_code = $6,
             provider_message_id = $7,
             latency_ms = $8,
             finished_at = now()
         WHERE outbox_id = $1 AND lease_token = $2 AND status = 'pending'`,
        [
          claimed.row.id,
          claimed.token,
          usedProviderId,
          failoverFromProvider ?? null,
          outcome.accepted ? 'provider_accepted' : 'failed',
          errorCode,
          outcome.providerMessageId ?? null,
          latencyMs
        ]
      );

      await this.updateCircuitHealth(client, usedProviderId, claimed.row.channel, outcome);
      if (nextStatus === 'failed') {
        await client.query(
          `INSERT INTO control_plane.cmag_platform_audit_events
             (actor_subject, action, target_type, target_id, outcome, safe_details)
           VALUES ('cmag_worker', 'platform_message_dead_lettered', 'outbox', $1, 'failed', $2::jsonb)`,
          [claimed.row.id, JSON.stringify({ providerId: usedProviderId, errorCode, attempt: claimed.attempt })]
        );
      }
      return true;
    });

    if (!finalized) throw new Error('CMAG_PLATFORM_LEASE_LOST');
    return { id: claimed.row.id, status: nextStatus, providerId: usedProviderId };
  }

  async dispatchOneTenant(
    workerPrincipal: VerifiedTenantPrincipal,
    tenantFilter?: string
  ): Promise<{ id: string; tenantId: string; status: MessageLifecycleState; providerId?: string } | null> {
    if (tenantFilter && !UUID_REGEX.test(tenantFilter)) {
      throw new Error('INVALID_TENANT_ID');
    }

    const claimed = await withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const res = await client.query<{
        tenant_id: string;
        id: string;
        channel: CmagMessageEnvelope['request']['channel'];
        encrypted_request: string;
        attempt_count: number;
        max_attempts: number;
        lease_token: string | null;
        idempotency_key: string | null;
        application_id: string | null;
        classification: string | null;
      }>(
        `SELECT tenant_id, id, channel, encrypted_request, attempt_count, max_attempts, lease_token,
                idempotency_key, application_id, classification
         FROM production.notification_outbox
         WHERE status IN ('queued', 'retry_scheduled')
           AND next_attempt_at <= now()
           AND (lease_until IS NULL OR lease_until <= now())
           AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
         ORDER BY next_attempt_at ASC, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        [tenantFilter ?? null]
      );
      const row = res.rows[0];
      if (!row) return null;

      if (row.lease_token) {
        await client.query(
          `UPDATE production.notification_attempts
           SET status = 'failed', error_code = 'lease_expired', finished_at = now()
           WHERE tenant_id = $1 AND notification_id = $2 AND lease_token = $3 AND status = 'pending'`,
          [row.tenant_id, row.id, row.lease_token]
        );
        if (row.attempt_count >= row.max_attempts) {
          await client.query(
            `UPDATE production.notification_outbox
             SET status = 'failed', last_error_code = 'lease_expired', dead_lettered_at = now(),
                 lease_token = NULL, lease_until = NULL, updated_at = now()
             WHERE tenant_id = $1 AND id = $2`,
            [row.tenant_id, row.id]
          );
          return { exhausted: true as const, id: row.id, tenantId: row.tenant_id };
        }
      }

      const token = randomUUID();
      const attempt = row.attempt_count + 1;
      await client.query(
        `UPDATE production.notification_outbox
         SET status = 'processing', attempt_count = $3, lease_token = $4,
             lease_until = now() + interval '60 seconds', updated_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [row.tenant_id, row.id, attempt, token]
      );
      await client.query(
        `INSERT INTO production.notification_attempts
           (tenant_id, notification_id, attempt_number, lease_token, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [row.tenant_id, row.id, attempt, token]
      );

      const runtime = await this.resolveRuntimeProviders(client);
      const healthRows = await client.query<{ provider_id: string; channel: string; circuit_state: string; next_probe_at: Date | null }>(
        `SELECT provider_id, channel, circuit_state, next_probe_at FROM control_plane.cmag_provider_health`
      );
      const healthMap = new Map(healthRows.rows.map(h => [
        `${h.provider_id}:${h.channel}`,
        { circuitState: h.circuit_state, nextProbeAt: h.next_probe_at }
      ]));

      return { exhausted: false as const, row, token, attempt, runtime, healthMap };
    });

    if (!claimed) return null;
    if (claimed.exhausted) return { id: claimed.id, tenantId: claimed.tenantId, status: 'failed' };

    const tenantId = claimed.row.tenant_id;
    const startMs = Date.now();
    let result: { outcome: ProviderDispatchOutcome; usedProviderId: string; failoverFromProvider?: string };

    try {
      // Support both CMAG-sealed envelopes and legacy NotificationService-sealed envelopes cleanly
      let payload: { request: CmagMessageEnvelope['request']; preferredProviderId?: string; failoverProviderId?: string };
      try {
        payload = openScopePayload('tenant' === 'tenant' ? tenantId : tenantId, claimed.row.id, claimed.row.encrypted_request);
      } catch {
        const legacy = JSON.parse(ServerSecretVault.decrypt(claimed.row.encrypted_request));
        if (legacy?.tenantId !== tenantId || legacy?.id !== claimed.row.id || legacy?.kind !== 'notification') {
          throw new Error('INVALID_ENCRYPTED_SCOPE');
        }
        payload = { request: legacy.data };
      }

      if ((claimed.row.channel as string) === 'web_push') {
        const legacyRes = await withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
          const subRes = await client.query<{ encrypted_subscription: string }>(
            `SELECT encrypted_subscription FROM production.notification_subscriptions
             WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL`,
            [tenantId, (payload.request as any).subscriptionId]
          );
          return subRes.rows[0]?.encrypted_subscription ?? null;
        });
        if (!legacyRes) {
          result = {
            usedProviderId: 'web_push',
            outcome: { accepted: false, lifecycleState: 'failed', providerId: 'web_push', errorCode: 'subscription_not_found', retryable: false }
          };
        } else {
          const subObj = JSON.parse(ServerSecretVault.decrypt(legacyRes));
          const res = await this.registry.getEmailFallback().send({
            channel: 'web_push',
            subscription: subObj.data,
            message: (payload.request as any).message
          });
          result = {
            usedProviderId: 'web_push',
            outcome: res.status === 'accepted'
              ? { accepted: true, lifecycleState: 'provider_accepted', providerId: 'web_push', retryable: false }
              : { accepted: false, lifecycleState: 'failed', providerId: 'web_push', errorCode: res.errorCode, retryable: res.retryable }
          };
        }
      } else {
        result = await this.dispatchChannelPayload(
          claimed.row.channel,
          payload,
          claimed.runtime.providers,
          claimed.runtime.platformConfig,
          claimed.healthMap,
          claimed.row.idempotency_key ?? undefined
        );
      }
    } catch {
      result = {
        usedProviderId: 'unknown',
        outcome: { accepted: false, lifecycleState: 'failed', providerId: 'unknown', errorCode: 'dispatch_error', retryable: true }
      };
    }

    const latencyMs = Math.max(0, Date.now() - startMs);
    const { outcome, usedProviderId, failoverFromProvider } = result;
    const errorCode = outcome.accepted ? null : safeErrorCode(outcome.errorCode);
    const errorMessage = outcome.accepted ? null : safeErrorMessage(outcome.errorMessage);
    const retryMore = !outcome.accepted && outcome.retryable && claimed.attempt < claimed.row.max_attempts;
    const nextStatus: MessageLifecycleState = outcome.accepted
      ? outcome.lifecycleState
      : retryMore
        ? 'retry_scheduled'
        : 'failed';
    const delaySeconds = computeBackoffSeconds(claimed.attempt, this.randomFn);

    const finalized = await withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const upd = await client.query(
        `UPDATE production.notification_outbox
         SET status = $4,
             provider_id = $5,
             provider_message_id = COALESCE($6, provider_message_id),
             last_error_code = $7,
             last_error_message = $8,
             next_attempt_at = CASE WHEN $4 = 'retry_scheduled' THEN now() + $9 * interval '1 second' ELSE next_attempt_at END,
             sent_at = CASE WHEN $10 THEN COALESCE(sent_at, now()) ELSE sent_at END,
             dead_lettered_at = CASE WHEN $4 = 'failed' THEN COALESCE(dead_lettered_at, now()) ELSE dead_lettered_at END,
             cost_minor = COALESCE($11, cost_minor),
             currency = COALESCE($12, currency),
             lease_token = NULL,
             lease_until = NULL,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2 AND lease_token = $3 AND lease_until > now()`,
        [
          tenantId,
          claimed.row.id,
          claimed.token,
          nextStatus,
          usedProviderId,
          outcome.providerMessageId ?? null,
          errorCode,
          errorMessage,
          delaySeconds,
          outcome.accepted,
          outcome.estimatedCostMinor ?? null,
          outcome.currency ?? null
        ]
      );
      if (upd.rowCount !== 1) return false;

      await client.query(
        `UPDATE production.notification_attempts
         SET provider_id = $4,
             failover_from_provider = $5,
             status = $6,
             error_code = $7,
             provider_message_id = $8,
             latency_ms = $9,
             finished_at = now()
         WHERE tenant_id = $1 AND notification_id = $2 AND lease_token = $3 AND status = 'pending'`,
        [
          tenantId,
          claimed.row.id,
          claimed.token,
          usedProviderId,
          failoverFromProvider ?? null,
          outcome.accepted ? 'provider_accepted' : 'failed',
          errorCode,
          outcome.providerMessageId ?? null,
          latencyMs
        ]
      );

      await client.query(
        `INSERT INTO production.cmag_usage_records (
           tenant_id, application_id, usage_date, channel, classification,
           sent_count, failed_count, cost_minor, currency
         ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, application_id, usage_date, channel, classification) DO UPDATE SET
           sent_count = production.cmag_usage_records.sent_count + EXCLUDED.sent_count,
           failed_count = production.cmag_usage_records.failed_count + EXCLUDED.failed_count,
           cost_minor = production.cmag_usage_records.cost_minor + EXCLUDED.cost_minor,
           updated_at = now()`,
        [
          tenantId,
          claimed.row.application_id || 'app_curriculum_flow',
          claimed.row.channel,
          claimed.row.classification || 'transactional',
          outcome.accepted ? 1 : 0,
          nextStatus === 'failed' ? 1 : 0,
          outcome.estimatedCostMinor ?? 0,
          outcome.currency || 'NGN'
        ]
      );

      await this.updateCircuitHealth(client, usedProviderId, claimed.row.channel, outcome);

      if (nextStatus === 'failed') {
        await client.query(
          `INSERT INTO production.cmag_audit_events
             (tenant_id, application_id, actor_subject, action, target_type, target_id, outcome, safe_details)
           VALUES ($1, $2, 'cmag_worker', 'message_dead_lettered', 'outbox', $3, 'failed', $4::jsonb)`,
          [
            tenantId,
            claimed.row.application_id,
            claimed.row.id,
            JSON.stringify({ providerId: usedProviderId, errorCode, attempt: claimed.attempt })
          ]
        );
      }
      return true;
    });

    if (!finalized) throw new Error('CMAG_TENANT_LEASE_LOST');
    return { id: claimed.row.id, tenantId, status: nextStatus, providerId: usedProviderId };
  }

  async dispatchBatch(
    workerPrincipal: VerifiedTenantPrincipal,
    limit = 20
  ): Promise<{ processed: number; platformProcessed: number; tenantProcessed: number }> {
    let platformProcessed = 0;
    let tenantProcessed = 0;
    for (let i = 0; i < limit; i += 1) {
      const p = await this.dispatchOnePlatform(workerPrincipal);
      if (p) platformProcessed += 1;
      const t = await this.dispatchOneTenant(workerPrincipal);
      if (t) tenantProcessed += 1;
      if (!p && !t) break;
    }
    return { processed: platformProcessed + tenantProcessed, platformProcessed, tenantProcessed };
  }

  async retryPlatformMessage(principal: VerifiedTenantPrincipal, outboxId: string): Promise<boolean> {
    if (!UUID_REGEX.test(outboxId)) throw new Error('INVALID_MESSAGE_ID');
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `UPDATE control_plane.cmag_platform_outbox
         SET status = 'queued',
             max_attempts = GREATEST(max_attempts, attempt_count + 1),
             next_attempt_at = now(),
             dead_lettered_at = NULL,
             lease_token = NULL,
             lease_until = NULL,
             updated_at = now()
         WHERE id = $1 AND status IN ('failed', 'retry_scheduled', 'expired')`,
        [outboxId]
      );
      if (res.rowCount === 1) {
        await client.query(
          `INSERT INTO control_plane.cmag_platform_audit_events
             (actor_subject, action, target_type, target_id, outcome)
           VALUES ($1, 'platform_message_retried', 'outbox', $2, 'success')`,
          [principal.email || principal.userId || 'platform_admin', outboxId]
        );
        return true;
      }
      return false;
    });
  }

  async retryTenantMessage(principal: VerifiedTenantPrincipal, outboxId: string): Promise<boolean> {
    if (!UUID_REGEX.test(outboxId)) throw new Error('INVALID_MESSAGE_ID');
    return withTenantTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `UPDATE production.notification_outbox
         SET status = 'queued',
             max_attempts = GREATEST(max_attempts, attempt_count + 1),
             next_attempt_at = now(),
             dead_lettered_at = NULL,
             lease_token = NULL,
             lease_until = NULL,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2 AND status IN ('failed', 'retry_scheduled', 'expired')`,
        [principal.tenantId, outboxId]
      );
      if (res.rowCount === 1) {
        await client.query(
          `INSERT INTO production.cmag_audit_events
             (tenant_id, actor_subject, action, target_type, target_id, outcome)
           VALUES ($1, $2, 'tenant_message_retried', 'outbox', $3, 'success')`,
          [principal.tenantId, principal.userId || principal.email || 'tenant_admin', outboxId]
        );
        return true;
      }
      return false;
    });
  }

  async processWebhook(
    workerPrincipal: VerifiedTenantPrincipal,
    providerId: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    nowMs = Date.now()
  ): Promise<{
    accepted: boolean;
    replay?: boolean;
    statusCode: number;
    code: string;
    event?: NormalizedWebhookEvent;
  }> {
    const adapter = this.registry.getAdapter(providerId);
    if (!adapter) {
      return { accepted: false, statusCode: 404, code: 'UNKNOWN_MESSAGING_PROVIDER' };
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return { accepted: false, statusCode: 400, code: 'INVALID_WEBHOOK_PAYLOAD' };
    }

    return withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const { providers } = await this.resolveRuntimeProviders(client);
      const cfg = providers.find(p => p.id === providerId);
      const webhookSecret = cfg?.credentials.webhookSecret || '';
      const verification = adapter.verifyWebhookSignature(headers, rawBody, webhookSecret, nowMs);

      if (!verification.valid) {
        await client.query(
          `INSERT INTO control_plane.cmag_platform_audit_events
             (actor_subject, action, target_type, target_id, outcome, safe_details)
           VALUES ('webhook_gateway', 'webhook_signature_rejected', 'provider', $1, 'blocked', $2::jsonb)`,
          [providerId, JSON.stringify({ reason: verification.reason })]
        );
        const status = verification.reason === 'WEBHOOK_SECRET_NOT_CONFIGURED' ? 503 : 401;
        return { accepted: false, statusCode: status, code: verification.reason || 'INVALID_WEBHOOK_SIGNATURE' };
      }

      const event = adapter.normalizeWebhookEvent(parsedBody);
      if (!event) {
        return { accepted: false, statusCode: 400, code: 'UNRECOGNIZED_WEBHOOK_EVENT' };
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO control_plane.cmag_webhook_events (
           provider_id, provider_event_id, provider_message_id, signature_hash,
           event_timestamp, delivery_status, payload_summary
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (provider_id, provider_event_id) DO NOTHING
         RETURNING id`,
        [
          providerId,
          event.providerEventId,
          event.providerMessageId,
          verification.signatureHash || '',
          verification.eventTimestamp ?? event.occurredAt,
          event.lifecycleState,
          JSON.stringify(event.summary)
        ]
      );

      if (inserted.rowCount === 0) {
        return { accepted: true, replay: true, statusCode: 200, code: 'WEBHOOK_EVENT_ALREADY_PROCESSED', event };
      }

      // Apply monotonic status transition to platform outbox if matched
      const platOutbox = await client.query<{ id: string; status: MessageLifecycleState }>(
        `SELECT id, status FROM control_plane.cmag_platform_outbox
         WHERE provider_message_id = $1 LIMIT 1`,
        [event.providerMessageId]
      );
      if (platOutbox.rows[0]) {
        const currentRank = LIFECYCLE_RANK[platOutbox.rows[0].status] ?? 0;
        const nextRank = LIFECYCLE_RANK[event.lifecycleState] ?? 0;
        if (nextRank >= currentRank) {
          await client.query(
            `UPDATE control_plane.cmag_platform_outbox
             SET status = $2,
                 last_error_code = COALESCE($3, last_error_code),
                 delivered_at = CASE WHEN $2 IN ('delivered', 'read') THEN COALESCE(delivered_at, $4) ELSE delivered_at END,
                 read_at = CASE WHEN $2 = 'read' THEN COALESCE(read_at, $4) ELSE read_at END,
                 updated_at = now()
             WHERE id = $1`,
            [platOutbox.rows[0].id, event.lifecycleState, event.errorCode ?? null, event.occurredAt]
          );
        }
      }

      // Apply monotonic status transition to tenant outbox if matched
      const tenantOutbox = await client.query<{
        tenant_id: string;
        id: string;
        application_id: string | null;
        channel: string;
        classification: string | null;
        status: MessageLifecycleState;
      }>(
        `SELECT tenant_id, id, application_id, channel, classification, status
         FROM production.notification_outbox
         WHERE provider_message_id = $1 LIMIT 1`,
        [event.providerMessageId]
      );
      if (tenantOutbox.rows[0]) {
        const row = tenantOutbox.rows[0];
        await client.query(
          `INSERT INTO production.cmag_delivery_receipts (
             tenant_id, outbox_id, provider_id, provider_message_id,
             provider_event_id, status, error_code, raw_summary, occurred_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
           ON CONFLICT (tenant_id, provider_id, provider_event_id) DO NOTHING`,
          [
            row.tenant_id,
            row.id,
            providerId,
            event.providerMessageId,
            event.providerEventId,
            event.lifecycleState,
            event.errorCode ?? null,
            JSON.stringify(event.summary),
            event.occurredAt
          ]
        );
        const currentRank = LIFECYCLE_RANK[row.status] ?? 0;
        const nextRank = LIFECYCLE_RANK[event.lifecycleState] ?? 0;
        if (nextRank >= currentRank) {
          await client.query(
            `UPDATE production.notification_outbox
             SET status = $3,
                 last_error_code = COALESCE($4, last_error_code),
                 delivered_at = CASE WHEN $3 IN ('delivered', 'read') THEN COALESCE(delivered_at, $5) ELSE delivered_at END,
                 read_at = CASE WHEN $3 = 'read' THEN COALESCE(read_at, $5) ELSE read_at END,
                 updated_at = now()
             WHERE tenant_id = $1 AND id = $2`,
            [row.tenant_id, row.id, event.lifecycleState, event.errorCode ?? null, event.occurredAt]
          );
        }
        if (event.lifecycleState === 'delivered') {
          await client.query(
            `INSERT INTO production.cmag_usage_records (
               tenant_id, application_id, usage_date, channel, classification, delivered_count
             ) VALUES ($1, $2, CURRENT_DATE, $3, $4, 1)
             ON CONFLICT (tenant_id, application_id, usage_date, channel, classification) DO UPDATE SET
               delivered_count = production.cmag_usage_records.delivered_count + 1,
               updated_at = now()`,
            [row.tenant_id, row.application_id || 'app_curriculum_flow', row.channel, row.classification || 'transactional']
          );
        }
      }

      return { accepted: true, replay: false, statusCode: 200, code: 'WEBHOOK_PROCESSED', event };
    });
  }

  async getQueueMetrics(
    principal: VerifiedTenantPrincipal,
    scope: 'platform' | 'school'
  ): Promise<QueueHealthSummary> {
    if (scope === 'platform') {
      return withControlPlaneTransaction(this.pool, principal, async client => {
        const res = await client.query<{
          queued_count: number;
          retry_scheduled_count: number;
          processing_count: number;
          dead_letter_count: number;
          sent_or_accepted_count: number;
          delivered_count: number;
          failed_count: number;
        }>(
          `SELECT
             count(*) FILTER (WHERE status = 'queued')::int AS queued_count,
             count(*) FILTER (WHERE status = 'retry_scheduled')::int AS retry_scheduled_count,
             count(*) FILTER (WHERE status = 'processing')::int AS processing_count,
             count(*) FILTER (WHERE dead_lettered_at IS NOT NULL)::int AS dead_letter_count,
             count(*) FILTER (WHERE status IN ('submitted', 'provider_accepted', 'accepted', 'sent'))::int AS sent_or_accepted_count,
             count(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS delivered_count,
             count(*) FILTER (WHERE status = 'failed')::int AS failed_count
           FROM control_plane.cmag_platform_outbox`
        );
        const r = res.rows[0];
        return {
          queuedCount: r?.queued_count ?? 0,
          retryScheduledCount: r?.retry_scheduled_count ?? 0,
          processingCount: r?.processing_count ?? 0,
          deadLetterCount: r?.dead_letter_count ?? 0,
          sentOrAcceptedCount: r?.sent_or_accepted_count ?? 0,
          deliveredCount: r?.delivered_count ?? 0,
          failedCount: r?.failed_count ?? 0
        };
      });
    }

    return withTenantTransaction(this.pool, principal, async client => {
      const res = await client.query<{
        queued_count: number;
        retry_scheduled_count: number;
        processing_count: number;
        dead_letter_count: number;
        sent_or_accepted_count: number;
        delivered_count: number;
        failed_count: number;
      }>(
        `SELECT
           count(*) FILTER (WHERE status = 'queued')::int AS queued_count,
           count(*) FILTER (WHERE status = 'retry_scheduled')::int AS retry_scheduled_count,
           count(*) FILTER (WHERE status = 'processing')::int AS processing_count,
           count(*) FILTER (WHERE dead_lettered_at IS NOT NULL)::int AS dead_letter_count,
           count(*) FILTER (WHERE status IN ('submitted', 'provider_accepted', 'accepted', 'sent'))::int AS sent_or_accepted_count,
           count(*) FILTER (WHERE status IN ('delivered', 'read'))::int AS delivered_count,
           count(*) FILTER (WHERE status = 'failed')::int AS failed_count
         FROM production.notification_outbox
         WHERE tenant_id = $1`,
        [principal.tenantId]
      );
      const r = res.rows[0];
      return {
        queuedCount: r?.queued_count ?? 0,
        retryScheduledCount: r?.retry_scheduled_count ?? 0,
        processingCount: r?.processing_count ?? 0,
        deadLetterCount: r?.dead_letter_count ?? 0,
        sentOrAcceptedCount: r?.sent_or_accepted_count ?? 0,
        deliveredCount: r?.delivered_count ?? 0,
        failedCount: r?.failed_count ?? 0
      };
    });
  }

  async pruneExpiredRecords(workerPrincipal: VerifiedTenantPrincipal, retentionDays = 90): Promise<{ deletedPlatform: number; deletedTenant: number }> {
    const safeDays = Math.max(7, Math.min(3650, Math.floor(retentionDays)));
    return withControlPlaneTransaction(this.pool, workerPrincipal, async client => {
      const p = await client.query(
        `DELETE FROM control_plane.cmag_platform_outbox
         WHERE status IN ('delivered', 'read', 'failed', 'expired', 'cancelled')
           AND updated_at < now() - make_interval(days => $1)`,
        [safeDays]
      );
      const t = await client.query(
        `DELETE FROM production.notification_outbox
         WHERE status IN ('delivered', 'read', 'failed', 'expired', 'cancelled')
           AND updated_at < now() - make_interval(days => $1)`,
        [safeDays]
      );
      return { deletedPlatform: p.rowCount ?? 0, deletedTenant: t.rowCount ?? 0 };
    });
  }
}
