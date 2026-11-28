import { randomUUID } from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { CmagDeliveryEngine } from './deliveryEngine';
import { currentDeploymentEnvironment } from './providers';
import type {
  AuthChannelPolicy,
  DeploymentEnvironment,
  GatewayChannel,
  MessageClassification,
  MessageLifecycleState,
  ProviderReadinessStatus
} from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const SENSITIVE_CATEGORIES = new Set(['medical', 'disciplinary', 'fees', 'financial', 'safeguarding']);

export interface TenantMessagingProvisioningOptions {
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  authDeliveryEnabled?: boolean;
  schoolCommsEnabled?: boolean;
  preferredChannel?: GatewayChannel;
  authChannelPolicy?: AuthChannelPolicy;
  fallbackEnabled?: boolean;
  permittedChannels?: GatewayChannel[];
  defaultLocale?: string;
  jurisdiction?: string;
  enabledCategories?: string[];
  dailyQuota?: number;
  monthlyQuota?: number;
  smsSenderName?: string;
  whatsappSenderNumber?: string;
  shareTenantConfig?: boolean;
}

export interface SendTargetedMessageInput {
  applicationId?: string;
  applicationInstanceId?: string;
  recipientType: 'admin' | 'staff' | 'guardian' | 'student' | 'user';
  recipientId?: string;
  toPhone?: string;
  toEmail?: string;
  studentId?: string;
  guardianId?: string;
  channel?: GatewayChannel;
  classification: Exclude<MessageClassification, 'authentication'>;
  category: string;
  purpose: string;
  templateKey?: string;
  locale?: string;
  variables?: Record<string, string>;
  subject?: string;
  message?: string;
  scheduledFor?: Date;
  idempotencyKey?: string;
  correlationId?: string;
  actorSubject: string;
}

export interface BroadcastCampaignInput {
  applicationId?: string;
  applicationInstanceId?: string;
  title: string;
  classification: 'broadcast' | 'emergency' | 'transactional' | 'marketing';
  category: string;
  targetMode: 'one_to_one' | 'group' | 'role' | 'class' | 'guardians' | 'staff' | 'students' | 'school_wide';
  targetFilter?: {
    roleCodes?: string[];
    classId?: string;
    recipientIds?: string[];
    phones?: string[];
    verifiedOnly?: boolean;
  };
  channel: 'sms' | 'whatsapp' | 'auto';
  templateKey?: string;
  locale?: string;
  variables?: Record<string, string>;
  messageBody?: string;
  scheduledFor?: Date;
  actorSubject: string;
}

export class CmagCommunicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'CmagCommunicationError';
  }
}

export const DEFAULT_LOCALIZED_TEMPLATES: ReadonlyArray<{
  templateKey: string;
  locale: string;
  channel: 'sms' | 'whatsapp';
  classification: MessageClassification;
  category: string;
  title: string;
  bodyTemplate: string;
  whatsappTemplateName?: string;
  sensitiveDataPolicy: 'standard' | 'restricted_guardian_verified' | 'auth_only';
}> = [
  {
    templateKey: 'auth_otp',
    locale: 'en',
    channel: 'sms',
    classification: 'authentication',
    category: 'authentication',
    title: 'Verification Code (EN)',
    bodyTemplate: 'Your {{schoolName}} verification code is {{code}}. Expires in 5 minutes.',
    sensitiveDataPolicy: 'auth_only'
  },
  {
    templateKey: 'auth_otp',
    locale: 'yo',
    channel: 'sms',
    classification: 'authentication',
    category: 'authentication',
    title: 'Àmì Ìdánimọ̀ (YO)',
    bodyTemplate: 'Àmì ìdánimọ̀ rẹ fún {{schoolName}} ni {{code}}. Yóò parí láàrin ìṣẹ́jú 5.',
    sensitiveDataPolicy: 'auth_only'
  },
  {
    templateKey: 'attendance_alert',
    locale: 'en',
    channel: 'sms',
    classification: 'transactional',
    category: 'attendance',
    title: 'Attendance Check-In / Out',
    bodyTemplate: '{{schoolName}}: {{studentName}} attendance recorded ({{status}}) at {{timestamp}}.',
    whatsappTemplateName: 'school_attendance_alert',
    sensitiveDataPolicy: 'restricted_guardian_verified'
  },
  {
    templateKey: 'fee_reminder',
    locale: 'en',
    channel: 'whatsapp',
    classification: 'transactional',
    category: 'fees',
    title: 'Approved Fee Schedule Notice',
    bodyTemplate: '{{schoolName}}: Updated fee schedule {{policyName}} ({{session}}) is now active.',
    whatsappTemplateName: 'school_fee_policy_notice',
    sensitiveDataPolicy: 'restricted_guardian_verified'
  },
  {
    templateKey: 'admission_update',
    locale: 'en',
    channel: 'sms',
    classification: 'transactional',
    category: 'admissions',
    title: 'Admission Status Notice',
    bodyTemplate: '{{schoolName}}: Admission update for {{applicantName}} — status is now {{status}}.',
    whatsappTemplateName: 'school_admission_status',
    sensitiveDataPolicy: 'restricted_guardian_verified'
  },
  {
    templateKey: 'logistics_alert',
    locale: 'en',
    channel: 'sms',
    classification: 'transactional',
    category: 'logistics',
    title: 'Campus Security & Gate Alert',
    bodyTemplate: '{{schoolName}}: {{summary}}',
    whatsappTemplateName: 'school_logistics_notice',
    sensitiveDataPolicy: 'restricted_guardian_verified'
  },
  {
    templateKey: 'emergency_broadcast',
    locale: 'en',
    channel: 'sms',
    classification: 'emergency',
    category: 'emergency',
    title: 'Emergency School Broadcast',
    bodyTemplate: 'URGENT {{schoolName}}: {{summary}}',
    whatsappTemplateName: 'school_emergency_alert',
    sensitiveDataPolicy: 'standard'
  }
];

function renderTemplateText(template: string, variables: Record<string, string> = {}): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const val = variables[key];
    return typeof val === 'string' ? val.replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').slice(0, 500) : '';
  }).trim();
}

export class CmagCommunicationEngine {
  constructor(
    private readonly pool: DatabasePool,
    private readonly deliveryEngine: CmagDeliveryEngine
  ) {}

  async provisionTenantMessagingInTransaction(
    client: DatabaseClient,
    params: {
      tenantId: string;
      applicationInstanceId: string;
      applicationId: string;
      updatedBy: string;
      options?: TenantMessagingProvisioningOptions;
    }
  ): Promise<{ provisioned: true; readinessStatus: ProviderReadinessStatus }> {
    const opts = params.options ?? {};
    const smsEnabled = opts.smsEnabled ?? true;
    const whatsappEnabled = opts.whatsappEnabled ?? false;
    const authDeliveryEnabled = opts.authDeliveryEnabled ?? true;
    const schoolCommsEnabled = opts.schoolCommsEnabled ?? true;
    const preferredChannel: GatewayChannel = opts.preferredChannel ?? (smsEnabled ? 'sms' : whatsappEnabled ? 'whatsapp' : 'email');
    const authChannelPolicy: AuthChannelPolicy = opts.authChannelPolicy ?? (smsEnabled && whatsappEnabled ? 'sms_then_whatsapp' : smsEnabled ? 'sms_only' : 'whatsapp_only');
    const permittedChannels = opts.permittedChannels && opts.permittedChannels.length > 0
      ? opts.permittedChannels
      : ([...(smsEnabled ? ['sms'] : []), ...(whatsappEnabled ? ['whatsapp'] : []), 'email'] as GatewayChannel[]);

    await client.query(
      `INSERT INTO production.cmag_tenant_configs (
         tenant_id, feature_enabled, provisioning_status,
         sms_enabled, whatsapp_enabled, auth_delivery_enabled, school_comms_enabled,
         preferred_channel, auth_channel_policy, fallback_enabled,
         sms_sender_name, whatsapp_sender_number, default_locale, jurisdiction,
         enabled_categories, daily_quota, monthly_quota, updated_by, updated_at
       ) VALUES (
         $1, true, 'provisioned',
         $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11, $12,
         $13, $14, $15, $16, now()
       )
       ON CONFLICT (tenant_id) DO UPDATE SET
         feature_enabled = true,
         provisioning_status = 'provisioned',
         sms_enabled = EXCLUDED.sms_enabled,
         whatsapp_enabled = EXCLUDED.whatsapp_enabled,
         auth_delivery_enabled = EXCLUDED.auth_delivery_enabled,
         school_comms_enabled = EXCLUDED.school_comms_enabled,
         preferred_channel = EXCLUDED.preferred_channel,
         auth_channel_policy = EXCLUDED.auth_channel_policy,
         fallback_enabled = EXCLUDED.fallback_enabled,
         sms_sender_name = COALESCE(EXCLUDED.sms_sender_name, production.cmag_tenant_configs.sms_sender_name),
         whatsapp_sender_number = COALESCE(EXCLUDED.whatsapp_sender_number, production.cmag_tenant_configs.whatsapp_sender_number),
         default_locale = EXCLUDED.default_locale,
         jurisdiction = EXCLUDED.jurisdiction,
         enabled_categories = EXCLUDED.enabled_categories,
         daily_quota = EXCLUDED.daily_quota,
         monthly_quota = EXCLUDED.monthly_quota,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()`,
      [
        params.tenantId,
        smsEnabled,
        whatsappEnabled,
        authDeliveryEnabled,
        schoolCommsEnabled,
        preferredChannel,
        authChannelPolicy,
        opts.fallbackEnabled ?? (smsEnabled && whatsappEnabled),
        opts.smsSenderName ?? null,
        opts.whatsappSenderNumber ?? null,
        opts.defaultLocale ?? 'en',
        opts.jurisdiction ?? 'NG',
        opts.enabledCategories ?? ['authentication', 'attendance', 'fees', 'admissions', 'academics', 'emergency', 'logistics'],
        opts.dailyQuota ?? 500,
        opts.monthlyQuota ?? 15000,
        params.updatedBy
      ]
    );

    const { providers, platformConfig } = await this.deliveryEngine.resolveRuntimeProviders(client);
    const registry = this.deliveryEngine.getProviderRegistry();
    const runtimeEnv = currentDeploymentEnvironment();
    const smsReady = providers.some(p =>
      p.supportedChannels.includes('sms') &&
      registry.getAdapter(p.id)?.validateConfig(p, runtimeEnv).valid &&
      p.credentials.smsSenderName
    ) && platformConfig.smsEnabled;
    const waReady = providers.some(p =>
      p.supportedChannels.includes('whatsapp') &&
      registry.getAdapter(p.id)?.validateConfig(p, runtimeEnv).valid &&
      (p.credentials.whatsappSender || p.credentials.phoneNumberId)
    ) && platformConfig.whatsappEnabled;

    const readinessStatus: ProviderReadinessStatus =
      (smsEnabled && smsReady) || (whatsappEnabled && waReady)
        ? 'operational'
        : 'credentials_missing';

    await client.query(
      `INSERT INTO production.cmag_application_configs (
         tenant_id, application_instance_id, application_id,
         share_tenant_config, entitlement_status,
         sms_enabled, whatsapp_enabled, auth_delivery_enabled, comms_enabled,
         auth_channel_policy, permitted_channels, daily_quota,
         readiness_status, last_readiness_check_at, updated_at
       ) VALUES (
         $1, $2, $3,
         $4, 'active',
         $5, $6, $7, $8,
         $9, $10, $11,
         $12, now(), now()
       )
       ON CONFLICT (tenant_id, application_instance_id) DO UPDATE SET
         share_tenant_config = EXCLUDED.share_tenant_config,
         entitlement_status = 'active',
         sms_enabled = EXCLUDED.sms_enabled,
         whatsapp_enabled = EXCLUDED.whatsapp_enabled,
         auth_delivery_enabled = EXCLUDED.auth_delivery_enabled,
         comms_enabled = EXCLUDED.comms_enabled,
         auth_channel_policy = EXCLUDED.auth_channel_policy,
         permitted_channels = EXCLUDED.permitted_channels,
         readiness_status = EXCLUDED.readiness_status,
         last_readiness_check_at = now(),
         updated_at = now()`,
      [
        params.tenantId,
        params.applicationInstanceId,
        params.applicationId,
        opts.shareTenantConfig ?? true,
        smsEnabled,
        whatsappEnabled,
        authDeliveryEnabled,
        schoolCommsEnabled,
        authChannelPolicy,
        permittedChannels,
        Math.min(opts.dailyQuota ?? 500, 5000),
        readinessStatus
      ]
    );

    await client.query(
      `INSERT INTO production.application_service_entitlements (
         tenant_id, application_instance_id, service_id, status,
         allowed_operations, granted_by
       ) VALUES ($1, $2, 'central_messaging', 'active', $3, $4)
       ON CONFLICT (tenant_id, application_instance_id, service_id) DO UPDATE SET
         status = 'active',
         revoked_at = NULL`,
      [
        params.tenantId,
        params.applicationInstanceId,
        [
          'messaging.auth.otp',
          'messaging.transactional.send',
          'messaging.broadcast.send',
          'messaging.reports.read'
        ],
        params.updatedBy
      ]
    );

    for (const tpl of DEFAULT_LOCALIZED_TEMPLATES) {
      await client.query(
        `INSERT INTO production.cmag_message_templates (
           tenant_id, application_id, template_key, locale, channel,
           classification, category, title, body_template, whatsapp_template_name,
           approval_status, sensitive_data_policy, is_active, created_by
         ) VALUES ($1, '', $2, $3, $4, $5, $6, $7, $8, $9, 'approved', $10, true, $11)
         ON CONFLICT (tenant_id, COALESCE(application_id, ''), template_key, locale, channel) DO NOTHING`,
        [
          params.tenantId,
          tpl.templateKey,
          tpl.locale,
          tpl.channel,
          tpl.classification,
          tpl.category,
          tpl.title,
          tpl.bodyTemplate,
          tpl.whatsappTemplateName ?? null,
          tpl.sensitiveDataPolicy,
          params.updatedBy
        ]
      );
    }

    await client.query(
      `INSERT INTO production.cmag_audit_events (
         tenant_id, application_id, application_instance_id, actor_subject,
         action, target_type, target_id, outcome, safe_details
       ) VALUES ($1, $2, $3, $4, 'tenant_messaging_provisioned', 'application_instance', $3::text, 'success', $5::jsonb)`,
      [
        params.tenantId,
        params.applicationId,
        params.applicationInstanceId,
        params.updatedBy,
        JSON.stringify({ smsEnabled, whatsappEnabled, authDeliveryEnabled, readinessStatus })
      ]
    );

    return { provisioned: true, readinessStatus };
  }

  async getPlatformOverview(principal: VerifiedTenantPrincipal) {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const cfgRes = await client.query(`SELECT * FROM control_plane.cmag_platform_config WHERE id = 'default'`);
      const sendersRes = await client.query(`SELECT * FROM control_plane.cmag_sender_identities ORDER BY created_at DESC LIMIT 100`);
      const templatesRes = await client.query(`SELECT * FROM control_plane.cmag_whatsapp_templates ORDER BY created_at DESC LIMIT 100`);
      const tenantsRes = await client.query(
        `SELECT tc.*, org.name AS school_name
         FROM production.cmag_tenant_configs tc
         LEFT JOIN production.organizations org ON org.tenant_id = tc.tenant_id
         ORDER BY tc.updated_at DESC LIMIT 100`
      );
      const auditRes = await client.query(
        `SELECT id, actor_subject, action, target_type, target_id, outcome, safe_details, occurred_at
         FROM control_plane.cmag_platform_audit_events
         ORDER BY occurred_at DESC LIMIT 100`
      );
      const recentOutboxRes = await client.query(
        `SELECT id, channel, classification, category, purpose, provider_id, status,
                attempt_count, max_attempts, last_error_code, cost_minor, currency,
                created_at, sent_at, delivered_at, dead_lettered_at
         FROM control_plane.cmag_platform_outbox
         ORDER BY created_at DESC LIMIT 50`
      );

      return {
        config: cfgRes.rows[0] ?? null,
        senders: sendersRes.rows,
        whatsappTemplates: templatesRes.rows,
        tenantConfigs: tenantsRes.rows,
        auditEvents: auditRes.rows,
        recentMessages: recentOutboxRes.rows
      };
    });
  }

  async updatePlatformConfig(
    principal: VerifiedTenantPrincipal,
    patch: Partial<{
      environment: DeploymentEnvironment;
      smsEnabled: boolean;
      whatsappEnabled: boolean;
      preferredChannel: GatewayChannel;
      authChannelPolicy: AuthChannelPolicy;
      fallbackEnabled: boolean;
      defaultSmsProvider: string;
      defaultWhatsappProvider: string;
      failoverSmsProvider: string | null;
      failoverWhatsappProvider: string | null;
      dailySmsLimit: number;
      dailyWhatsappLimit: number;
      monthlyBudgetMinor: number | null;
      retentionDays: number;
      suspendedChannels: string[];
    }>
  ) {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const updated = await client.query(
        `UPDATE control_plane.cmag_platform_config SET
           environment = COALESCE($1, environment),
           sms_enabled = COALESCE($2, sms_enabled),
           whatsapp_enabled = COALESCE($3, whatsapp_enabled),
           preferred_channel = COALESCE($4, preferred_channel),
           auth_channel_policy = COALESCE($5, auth_channel_policy),
           fallback_enabled = COALESCE($6, fallback_enabled),
           default_sms_provider = COALESCE($7, default_sms_provider),
           default_whatsapp_provider = COALESCE($8, default_whatsapp_provider),
           failover_sms_provider = COALESCE($9, failover_sms_provider),
           failover_whatsapp_provider = COALESCE($10, failover_whatsapp_provider),
           daily_sms_limit = COALESCE($11, daily_sms_limit),
           daily_whatsapp_limit = COALESCE($12, daily_whatsapp_limit),
           monthly_budget_minor = COALESCE($13, monthly_budget_minor),
           retention_days = COALESCE($14, retention_days),
           suspended_channels = COALESCE($15, suspended_channels),
           updated_by = $16,
           updated_at = now()
         WHERE id = 'default'
         RETURNING *`,
        [
          patch.environment ?? null,
          patch.smsEnabled ?? null,
          patch.whatsappEnabled ?? null,
          patch.preferredChannel ?? null,
          patch.authChannelPolicy ?? null,
          patch.fallbackEnabled ?? null,
          patch.defaultSmsProvider ?? null,
          patch.defaultWhatsappProvider ?? null,
          patch.failoverSmsProvider ?? null,
          patch.failoverWhatsappProvider ?? null,
          patch.dailySmsLimit ?? null,
          patch.dailyWhatsappLimit ?? null,
          patch.monthlyBudgetMinor ?? null,
          patch.retentionDays ?? null,
          patch.suspendedChannels ?? null,
          principal.email || 'platform_admin'
        ]
      );
      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, 'platform_config_updated', 'platform_config', 'default', 'success', $2::jsonb)`,
        [principal.email || 'platform_admin', JSON.stringify(patch)]
      );
      return updated.rows[0];
    });
  }

  async suspendOrResumeTenant(
    principal: VerifiedTenantPrincipal,
    tenantId: string,
    suspended: boolean,
    reason?: string
  ) {
    if (!UUID_REGEX.test(tenantId)) throw new CmagCommunicationError('INVALID_TENANT_ID', 'Invalid tenant ID.', 400);
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const updated = await client.query(
        `UPDATE production.cmag_tenant_configs
         SET suspended = $2,
             suspension_reason = $3,
             provisioning_status = CASE WHEN $2 THEN 'suspended' ELSE 'provisioned' END,
             updated_by = $4,
             updated_at = now()
         WHERE tenant_id = $1
         RETURNING *`,
        [tenantId, suspended, suspended ? (reason || 'Suspended by platform admin') : null, principal.email || 'platform_admin']
      );
      if (updated.rowCount !== 1) throw new CmagCommunicationError('TENANT_CONFIG_NOT_FOUND', 'Tenant messaging config not found.', 404);
      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, $2, 'tenant', $3, 'success', $4::jsonb)`,
        [
          principal.email || 'platform_admin',
          suspended ? 'tenant_messaging_suspended' : 'tenant_messaging_resumed',
          tenantId,
          JSON.stringify({ reason: reason || null })
        ]
      );
      return updated.rows[0];
    });
  }

  async registerSenderIdentity(
    principal: VerifiedTenantPrincipal,
    input: {
      scope: 'platform' | 'school';
      tenantId?: string | null;
      providerId: string;
      channel: 'sms' | 'whatsapp';
      senderValue: string;
      smsRoute?: 'dnd' | 'non_dnd' | 'international';
      wabaId?: string;
      approvalStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'suspended';
    }
  ) {
    const adapter = this.deliveryEngine.getProviderRegistry().getAdapter(input.providerId);
    if (!adapter) throw new CmagCommunicationError('UNKNOWN_PROVIDER', 'Provider not found.', 404);
    const runtimeEnv = currentDeploymentEnvironment();
    const check = adapter.validateSenderIdentity(input.senderValue, input.channel, runtimeEnv);
    if (!check.valid) throw new CmagCommunicationError('INVALID_SENDER_IDENTITY', check.reason || 'Invalid sender ID.', 400);

    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO control_plane.cmag_sender_identities (
           scope, tenant_id, provider_id, channel, sender_value, sms_route, waba_id,
           environment, approval_status, approved_by, approved_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          input.scope,
          input.scope === 'platform' ? null : input.tenantId ?? null,
          input.providerId,
          input.channel,
          input.senderValue.trim(),
          input.smsRoute ?? null,
          input.wabaId ?? null,
          runtimeEnv,
          input.approvalStatus || 'pending',
          input.approvalStatus === 'approved' ? (principal.email || 'platform_admin') : null,
          input.approvalStatus === 'approved' ? new Date() : null,
          principal.email || 'platform_admin'
        ]
      );
      return res.rows[0];
    });
  }

  async registerWhatsAppTemplate(
    principal: VerifiedTenantPrincipal,
    input: {
      scope: 'platform' | 'school';
      tenantId?: string | null;
      providerId: string;
      templateKey: string;
      providerTemplateName: string;
      providerTemplateId?: string;
      locale?: string;
      category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
      bodyPreview: string;
      approvalStatus?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paused';
    }
  ) {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO control_plane.cmag_whatsapp_templates (
           scope, tenant_id, provider_id, template_key, provider_template_name,
           provider_template_id, locale, category, body_preview, approval_status,
           environment, approved_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          input.scope,
          input.scope === 'platform' ? null : input.tenantId ?? null,
          input.providerId,
          input.templateKey,
          input.providerTemplateName,
          input.providerTemplateId ?? null,
          input.locale || 'en',
          input.category,
          input.bodyPreview,
          input.approvalStatus || 'draft',
          currentDeploymentEnvironment(),
          input.approvalStatus === 'approved' ? new Date() : null,
          principal.email || 'platform_admin'
        ]
      );
      return res.rows[0];
    });
  }

  async getTenantMessagingOverview(principal: VerifiedTenantPrincipal) {
    return withTenantTransaction(this.pool, principal, async client => {
      const cfg = await client.query(`SELECT * FROM production.cmag_tenant_configs WHERE tenant_id = $1`, [principal.tenantId]);
      const apps = await client.query(`SELECT * FROM production.cmag_application_configs WHERE tenant_id = $1 ORDER BY application_id`, [principal.tenantId]);
      const templates = await client.query(`SELECT * FROM production.cmag_message_templates WHERE tenant_id = $1 ORDER BY template_key, locale, channel`, [principal.tenantId]);
      const preferences = await client.query(`SELECT * FROM production.cmag_recipient_preferences WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT 200`, [principal.tenantId]);
      const campaigns = await client.query(`SELECT * FROM production.cmag_broadcast_campaigns WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`, [principal.tenantId]);
      const messages = await client.query(
        `SELECT id, scope, application_id, application_instance_id, channel, classification, category,
                purpose, status, attempt_count, max_attempts, provider_id, provider_message_id,
                last_error_code, cost_minor, currency, created_at, sent_at, delivered_at, read_at, dead_lettered_at
         FROM production.notification_outbox
         WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT 100`,
        [principal.tenantId]
      );
      const usage = await client.query(
        `SELECT usage_date, application_id, channel, classification, sent_count, delivered_count, failed_count, cost_minor, currency
         FROM production.cmag_usage_records
         WHERE tenant_id = $1 AND usage_date >= CURRENT_DATE - interval '30 days'
         ORDER BY usage_date DESC`,
        [principal.tenantId]
      );
      const audits = await client.query(
        `SELECT id, application_id, actor_subject, action, target_type, target_id, outcome, safe_details, occurred_at
         FROM production.cmag_audit_events
         WHERE tenant_id = $1
         ORDER BY occurred_at DESC LIMIT 100`,
        [principal.tenantId]
      );

      return {
        config: cfg.rows[0] ?? null,
        applicationConfigs: apps.rows,
        templates: templates.rows,
        preferences: preferences.rows,
        campaigns: campaigns.rows,
        messages: messages.rows,
        usage: usage.rows,
        auditEvents: audits.rows
      };
    });
  }

  async updateTenantConfig(
    principal: VerifiedTenantPrincipal,
    patch: Partial<{
      smsEnabled: boolean;
      whatsappEnabled: boolean;
      authDeliveryEnabled: boolean;
      schoolCommsEnabled: boolean;
      preferredChannel: GatewayChannel;
      authChannelPolicy: AuthChannelPolicy;
      fallbackEnabled: boolean;
      defaultLocale: string;
      enabledCategories: string[];
      applicationInstanceId: string;
      shareTenantConfig: boolean;
      permittedChannels: GatewayChannel[];
    }>
  ) {
    return withTenantTransaction(this.pool, principal, async client => {
      const updated = await client.query(
        `UPDATE production.cmag_tenant_configs SET
           sms_enabled = COALESCE($2, sms_enabled),
           whatsapp_enabled = COALESCE($3, whatsapp_enabled),
           auth_delivery_enabled = COALESCE($4, auth_delivery_enabled),
           school_comms_enabled = COALESCE($5, school_comms_enabled),
           preferred_channel = COALESCE($6, preferred_channel),
           auth_channel_policy = COALESCE($7, auth_channel_policy),
           fallback_enabled = COALESCE($8, fallback_enabled),
           default_locale = COALESCE($9, default_locale),
           enabled_categories = COALESCE($10, enabled_categories),
           updated_by = $11,
           updated_at = now()
         WHERE tenant_id = $1
         RETURNING *`,
        [
          principal.tenantId,
          patch.smsEnabled ?? null,
          patch.whatsappEnabled ?? null,
          patch.authDeliveryEnabled ?? null,
          patch.schoolCommsEnabled ?? null,
          patch.preferredChannel ?? null,
          patch.authChannelPolicy ?? null,
          patch.fallbackEnabled ?? null,
          patch.defaultLocale ?? null,
          patch.enabledCategories ?? null,
          principal.userId || principal.email || 'tenant_admin'
        ]
      );
      if (patch.applicationInstanceId && UUID_REGEX.test(patch.applicationInstanceId)) {
        await client.query(
          `UPDATE production.cmag_application_configs SET
             share_tenant_config = COALESCE($3, share_tenant_config),
             sms_enabled = COALESCE($4, sms_enabled),
             whatsapp_enabled = COALESCE($5, whatsapp_enabled),
             auth_delivery_enabled = COALESCE($6, auth_delivery_enabled),
             comms_enabled = COALESCE($7, comms_enabled),
             auth_channel_policy = COALESCE($8, auth_channel_policy),
             permitted_channels = COALESCE($9, permitted_channels),
             updated_at = now()
           WHERE tenant_id = $1 AND application_instance_id = $2`,
          [
            principal.tenantId,
            patch.applicationInstanceId,
            patch.shareTenantConfig ?? null,
            patch.smsEnabled ?? null,
            patch.whatsappEnabled ?? null,
            patch.authDeliveryEnabled ?? null,
            patch.schoolCommsEnabled ?? null,
            patch.authChannelPolicy ?? null,
            patch.permittedChannels ?? null
          ]
        );
      }
      await client.query(
        `INSERT INTO production.cmag_audit_events (
           tenant_id, actor_subject, action, target_type, target_id, outcome, safe_details
         ) VALUES ($1, $2, 'tenant_messaging_config_updated', 'tenant_config', $1::text, 'success', $3::jsonb)`,
        [principal.tenantId, principal.userId || principal.email || 'tenant_admin', JSON.stringify(patch)]
      );
      return updated.rows[0] ?? null;
    });
  }

  async upsertRecipientPreference(
    principal: VerifiedTenantPrincipal,
    input: {
      recipientType: 'admin' | 'staff' | 'guardian' | 'student';
      recipientId: string;
      phoneE164?: string;
      phoneVerified?: boolean;
      whatsappCapable?: boolean;
      preferredChannel?: GatewayChannel;
      preferredLocale?: string;
      marketingOptIn?: boolean;
      transactionalOptOut?: boolean;
      optedOutCategories?: string[];
      dailyFrequencyCap?: number;
      consentCategory?: string;
      consentSource?: string;
    }
  ) {
    if (input.phoneE164 && !E164_REGEX.test(input.phoneE164)) {
      throw new CmagCommunicationError('INVALID_PHONE_NUMBER', 'Phone number must be E.164 formatted.', 400);
    }
    return withTenantTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO production.cmag_recipient_preferences (
           tenant_id, recipient_type, recipient_id, phone_e164, phone_verified,
           whatsapp_capable, preferred_channel, preferred_locale,
           marketing_opt_in, transactional_opt_out, opted_out_categories,
           daily_frequency_cap, updated_by, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()
         )
         ON CONFLICT (tenant_id, recipient_type, recipient_id) DO UPDATE SET
           phone_e164 = COALESCE(EXCLUDED.phone_e164, production.cmag_recipient_preferences.phone_e164),
           phone_verified = COALESCE($5, production.cmag_recipient_preferences.phone_verified),
           whatsapp_capable = COALESCE($6, production.cmag_recipient_preferences.whatsapp_capable),
           preferred_channel = COALESCE($7, production.cmag_recipient_preferences.preferred_channel),
           preferred_locale = COALESCE($8, production.cmag_recipient_preferences.preferred_locale),
           marketing_opt_in = COALESCE($9, production.cmag_recipient_preferences.marketing_opt_in),
           transactional_opt_out = COALESCE($10, production.cmag_recipient_preferences.transactional_opt_out),
           opted_out_categories = COALESCE($11, production.cmag_recipient_preferences.opted_out_categories),
           daily_frequency_cap = COALESCE($12, production.cmag_recipient_preferences.daily_frequency_cap),
           updated_by = EXCLUDED.updated_by,
           updated_at = now()
         RETURNING *`,
        [
          principal.tenantId,
          input.recipientType,
          input.recipientId,
          input.phoneE164 ?? null,
          input.phoneVerified ?? false,
          input.whatsappCapable ?? false,
          input.preferredChannel ?? 'sms',
          input.preferredLocale ?? 'en',
          input.marketingOptIn ?? false,
          input.transactionalOptOut ?? false,
          input.optedOutCategories ?? [],
          input.dailyFrequencyCap ?? 10,
          principal.userId || principal.email || 'tenant_admin'
        ]
      );

      if (input.consentCategory) {
        const channel = input.preferredChannel ?? 'sms';
        const withdrawn = Boolean(input.transactionalOptOut) || (input.consentCategory === 'marketing' && !input.marketingOptIn);
        await client.query(
          `INSERT INTO production.cmag_consent_records (
             tenant_id, recipient_type, recipient_id, channel, category,
             consent_status, source, recorded_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            principal.tenantId,
            input.recipientType,
            input.recipientId,
            channel,
            input.consentCategory,
            withdrawn ? 'withdrawn' : 'granted',
            input.consentSource || 'admin_portal',
            principal.userId || principal.email || 'tenant_admin'
          ]
        );
      }

      return res.rows[0];
    });
  }

  async upsertMessageTemplate(
    principal: VerifiedTenantPrincipal,
    input: {
      applicationId?: string;
      templateKey: string;
      locale: string;
      channel: GatewayChannel;
      classification: MessageClassification;
      category: string;
      title: string;
      bodyTemplate: string;
      whatsappTemplateName?: string;
      sensitiveDataPolicy?: 'standard' | 'restricted_guardian_verified' | 'auth_only';
    }
  ) {
    return withTenantTransaction(this.pool, principal, async client => {
      const res = await client.query(
        `INSERT INTO production.cmag_message_templates (
           tenant_id, application_id, template_key, locale, channel,
           classification, category, title, body_template, whatsapp_template_name,
           approval_status, sensitive_data_policy, is_active, created_by, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', $11, true, $12, now())
         ON CONFLICT (tenant_id, COALESCE(application_id, ''), template_key, locale, channel) DO UPDATE SET
           classification = EXCLUDED.classification,
           category = EXCLUDED.category,
           title = EXCLUDED.title,
           body_template = EXCLUDED.body_template,
           whatsapp_template_name = EXCLUDED.whatsapp_template_name,
           sensitive_data_policy = EXCLUDED.sensitive_data_policy,
           updated_at = now()
         RETURNING *`,
        [
          principal.tenantId,
          input.applicationId || '',
          input.templateKey.trim(),
          input.locale.trim(),
          input.channel,
          input.classification,
          input.category.trim(),
          input.title.trim(),
          input.bodyTemplate.trim(),
          input.whatsappTemplateName ?? null,
          input.sensitiveDataPolicy ?? 'standard',
          principal.userId || principal.email || 'tenant_admin'
        ]
      );
      return res.rows[0];
    });
  }

  async sendTargetedMessage(
    principal: VerifiedTenantPrincipal,
    input: SendTargetedMessageInput
  ): Promise<{ outboxId: string; status: MessageLifecycleState; channel: GatewayChannel; correlationId: string }> {
    const applicationId = input.applicationId || 'app_curriculum_flow';
    const isEmergency = input.classification === 'emergency';

    const resolved = await withTenantTransaction(this.pool, principal, async client => {
      const tCfg = await client.query<{
        feature_enabled: boolean;
        suspended: boolean;
        sms_enabled: boolean;
        whatsapp_enabled: boolean;
        school_comms_enabled: boolean;
        preferred_channel: GatewayChannel;
        default_locale: string;
        sms_sender_name: string | null;
        whatsapp_sender_number: string | null;
      }>(`SELECT * FROM production.cmag_tenant_configs WHERE tenant_id = $1`, [principal.tenantId]);
      const cfg = tCfg.rows[0];
      if (cfg?.suspended) {
        throw new CmagCommunicationError('CMAG_TENANT_SUSPENDED', 'Messaging gateway is suspended for this school.', 403);
      }
      if (cfg && !cfg.school_comms_enabled && !isEmergency) {
        throw new CmagCommunicationError('CMAG_COMMS_DISABLED', 'School communication delivery is disabled for this school.', 403);
      }

      // Guardian-student link verification when both studentId and guardianId are specified
      if (input.guardianId && input.studentId) {
        if (!UUID_REGEX.test(input.guardianId) || !UUID_REGEX.test(input.studentId)) {
          throw new CmagCommunicationError('INVALID_GUARDIAN_OR_STUDENT_ID', 'Invalid guardian or student identifier.', 400);
        }
        const link = await client.query<{ verification_status: string; can_receive_notifications: boolean; phone: string | null }>(
          `SELECT g.verification_status, sg.can_receive_notifications, g.phone
           FROM production.student_guardians sg
           JOIN production.guardians g ON g.tenant_id = sg.tenant_id AND g.id = sg.guardian_id
           WHERE sg.tenant_id = $1 AND sg.guardian_id = $2 AND sg.student_id = $3
           LIMIT 1`,
          [principal.tenantId, input.guardianId, input.studentId]
        );
        const rel = link.rows[0];
        if (!rel || rel.verification_status !== 'verified' || !rel.can_receive_notifications) {
          throw new CmagCommunicationError(
            'GUARDIAN_NOT_VERIFIED_FOR_STUDENT',
            'Guardian relationship must be verified and authorized for notifications before sending student communications.',
            403
          );
        }
        if (!input.toPhone && rel.phone) {
          input.toPhone = rel.phone;
        }
      } else if (SENSITIVE_CATEGORIES.has(input.category) && input.recipientType === 'guardian' && !input.guardianId) {
        throw new CmagCommunicationError(
          'SENSITIVE_GUARDIAN_VERIFICATION_REQUIRED',
          'Sensitive guardian communications require a verified guardianId reference.',
          403
        );
      }

      let pref: {
        phone_e164: string | null;
        preferred_channel: GatewayChannel;
        preferred_locale: string;
        marketing_opt_in: boolean;
        transactional_opt_out: boolean;
        opted_out_categories: string[];
        daily_frequency_cap: number;
      } | undefined;
      if (input.recipientId) {
        const prefRes = await client.query<NonNullable<typeof pref>>(
          `SELECT phone_e164, preferred_channel, preferred_locale, marketing_opt_in,
                  transactional_opt_out, opted_out_categories, daily_frequency_cap
           FROM production.cmag_recipient_preferences
           WHERE tenant_id = $1 AND recipient_type = $2 AND recipient_id = $3
           LIMIT 1`,
          [principal.tenantId, input.recipientType, input.recipientId]
        );
        pref = prefRes.rows[0];
      }

      // Consent, opt-out & frequency cap checks (emergency exempt)
      if (!isEmergency && pref) {
        if (input.classification === 'marketing' && !pref.marketing_opt_in) {
          throw new CmagCommunicationError('RECIPIENT_OPTED_OUT', 'Recipient has not opted in to marketing messages.', 403);
        }
        if (pref.transactional_opt_out || pref.opted_out_categories.includes(input.category)) {
          throw new CmagCommunicationError('RECIPIENT_OPTED_OUT', `Recipient opted out of '${input.category}' notifications.`, 403);
        }
        if (input.recipientId) {
          const sentTodayRes = await client.query<{ cnt: number }>(
            `SELECT count(*)::int AS cnt FROM production.notification_outbox
             WHERE tenant_id = $1 AND recipient_ref = $2 AND created_at >= date_trunc('day', now())`,
            [principal.tenantId, input.recipientId]
          );
          if ((sentTodayRes.rows[0]?.cnt ?? 0) >= pref.daily_frequency_cap) {
            throw new CmagCommunicationError('RECIPIENT_FREQUENCY_CAP_EXCEEDED', 'Daily notification frequency cap reached for recipient.', 429);
          }
        }
      }

      const chosenChannel: GatewayChannel = input.channel
        || pref?.preferred_channel
        || cfg?.preferred_channel
        || 'sms';
      const locale = input.locale || pref?.preferred_locale || cfg?.default_locale || 'en';
      const destinationPhone = input.toPhone || pref?.phone_e164 || '';

      if ((chosenChannel === 'sms' || chosenChannel === 'whatsapp') && !E164_REGEX.test(destinationPhone)) {
        throw new CmagCommunicationError('INVALID_PHONE_NUMBER', 'A valid E.164 recipient phone number is required.', 400);
      }
      if (chosenChannel === 'email' && !input.toEmail) {
        throw new CmagCommunicationError('INVALID_EMAIL', 'A valid recipient email address is required.', 400);
      }

      let renderedBody = input.message || '';
      let whatsappTemplateName: string | undefined;
      if (input.templateKey) {
        const tplRes = await client.query<{ body_template: string; whatsapp_template_name: string | null }>(
          `SELECT body_template, whatsapp_template_name
           FROM production.cmag_message_templates
           WHERE tenant_id = $1 AND template_key = $2 AND channel = $3 AND is_active = true
           ORDER BY (locale = $4) DESC, (locale = 'en') DESC
           LIMIT 1`,
          [principal.tenantId, input.templateKey, chosenChannel === 'email' ? 'sms' : chosenChannel, locale]
        );
        if (tplRes.rows[0]) {
          renderedBody = renderTemplateText(tplRes.rows[0].body_template, input.variables);
          whatsappTemplateName = tplRes.rows[0].whatsapp_template_name ?? undefined;
        }
      }
      if (!renderedBody.trim()) {
        throw new CmagCommunicationError('MESSAGE_BODY_REQUIRED', 'Message content or valid template is required.', 400);
      }

      await client.query(
        `INSERT INTO production.cmag_audit_events (
           tenant_id, application_id, application_instance_id, actor_subject,
           action, target_type, target_id, outcome, safe_details
         ) VALUES ($1, $2, $3, $4, 'targeted_message_enqueued', $5, $6, 'success', $7::jsonb)`,
        [
          principal.tenantId,
          applicationId,
          input.applicationInstanceId ?? null,
          input.actorSubject,
          input.recipientType,
          input.recipientId || input.guardianId || 'direct',
          JSON.stringify({ channel: chosenChannel, classification: input.classification, category: input.category })
        ]
      );

      return {
        chosenChannel,
        locale,
        destinationPhone,
        renderedBody,
        whatsappTemplateName,
        smsSender: cfg?.sms_sender_name ?? undefined,
        waSender: cfg?.whatsapp_sender_number ?? undefined
      };
    });

    const enqueued = await this.deliveryEngine.enqueueTenantMessage(principal, {
      scope: input.applicationInstanceId ? 'application' : 'school',
      tenantId: principal.tenantId,
      applicationId,
      applicationInstanceId: input.applicationInstanceId,
      environment: currentDeploymentEnvironment(),
      classification: input.classification,
      category: input.category,
      purpose: input.purpose,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      templateKey: input.templateKey,
      locale: resolved.locale,
      recipientType: input.recipientType,
      recipientRef: input.recipientId,
      studentId: input.studentId,
      guardianId: input.guardianId,
      scheduledFor: input.scheduledFor,
      request: resolved.chosenChannel === 'email'
        ? {
            channel: 'email',
            to: input.toEmail!,
            subject: input.subject || 'School Notification',
            text: resolved.renderedBody
          }
        : resolved.chosenChannel === 'sms'
          ? {
              channel: 'sms',
              to: resolved.destinationPhone,
              message: resolved.renderedBody,
              senderName: resolved.smsSender
            }
          : {
              channel: 'whatsapp',
              to: resolved.destinationPhone,
              message: resolved.renderedBody,
              senderNumber: resolved.waSender,
              ...(resolved.whatsappTemplateName
                ? {
                    template: {
                      name: resolved.whatsappTemplateName,
                      locale: resolved.locale,
                      variables: input.variables,
                      approved: true
                    }
                  }
                : {})
            }
    });

    return {
      outboxId: enqueued.outboxId,
      status: enqueued.status,
      channel: resolved.chosenChannel,
      correlationId: enqueued.correlationId
    };
  }

  async createAndDispatchBroadcast(
    principal: VerifiedTenantPrincipal,
    input: BroadcastCampaignInput
  ): Promise<{ campaignId: string; recipientCount: number; queuedCount: number; status: string }> {
    const applicationId = input.applicationId || 'app_curriculum_flow';
    const isEmergency = input.classification === 'emergency';

    const prepared = await withTenantTransaction(this.pool, principal, async client => {
      const cfg = await client.query<{
        suspended: boolean;
        school_comms_enabled: boolean;
        sms_enabled: boolean;
        whatsapp_enabled: boolean;
        default_locale: string;
        sms_sender_name: string | null;
        whatsapp_sender_number: string | null;
      }>(`SELECT * FROM production.cmag_tenant_configs WHERE tenant_id = $1`, [principal.tenantId]);
      const tCfg = cfg.rows[0];
      if (tCfg?.suspended) {
        throw new CmagCommunicationError('CMAG_TENANT_SUSPENDED', 'Messaging gateway is suspended.', 403);
      }

      const targets: Array<{
        recipientType: 'guardian' | 'staff' | 'student' | 'user';
        recipientId: string;
        phone: string;
        guardianId?: string;
        locale: string;
        preferredChannel: 'sms' | 'whatsapp';
      }> = [];

      if (input.targetFilter?.phones && input.targetFilter.phones.length > 0) {
        for (const p of input.targetFilter.phones) {
          if (E164_REGEX.test(p)) {
            targets.push({
              recipientType: 'user',
              recipientId: p,
              phone: p,
              locale: input.locale || tCfg?.default_locale || 'en',
              preferredChannel: input.channel === 'whatsapp' ? 'whatsapp' : 'sms'
            });
          }
        }
      }

      if (['guardians', 'school_wide', 'class'].includes(input.targetMode)) {
        const gRes = await client.query<{
          id: string;
          phone: string | null;
          verification_status: string;
        }>(
          `SELECT DISTINCT g.id, g.phone, g.verification_status
           FROM production.guardians g
           LEFT JOIN production.student_guardians sg ON sg.tenant_id = g.tenant_id AND sg.guardian_id = g.id
           LEFT JOIN production.students s ON s.tenant_id = sg.tenant_id AND s.id = sg.student_id
           WHERE g.tenant_id = $1
             AND g.phone IS NOT NULL
             AND ($2::boolean = false OR g.verification_status = 'verified')
             AND ($3::uuid IS NULL OR s.class_id = $3::uuid)`,
          [
            principal.tenantId,
            !isEmergency || Boolean(input.targetFilter?.verifiedOnly),
            input.targetFilter?.classId && UUID_REGEX.test(input.targetFilter.classId)
              ? input.targetFilter.classId
              : null
          ]
        );
        for (const row of gRes.rows) {
          if (row.phone && E164_REGEX.test(row.phone)) {
            targets.push({
              recipientType: 'guardian',
              recipientId: row.id,
              guardianId: row.id,
              phone: row.phone,
              locale: input.locale || tCfg?.default_locale || 'en',
              preferredChannel: input.channel === 'whatsapp' ? 'whatsapp' : 'sms'
            });
          }
        }
      }

      if (['staff', 'role', 'school_wide'].includes(input.targetMode)) {
        const sRes = await client.query<{ id: string; phone: string | null }>(
          `SELECT id, phone FROM production.staff
           WHERE tenant_id = $1 AND status = 'active' AND phone IS NOT NULL`,
          [principal.tenantId]
        );
        for (const row of sRes.rows) {
          if (row.phone && E164_REGEX.test(row.phone)) {
            targets.push({
              recipientType: 'staff',
              recipientId: row.id,
              phone: row.phone,
              locale: input.locale || tCfg?.default_locale || 'en',
              preferredChannel: input.channel === 'whatsapp' ? 'whatsapp' : 'sms'
            });
          }
        }
      }

      // Deduplicate by phone number while applying opt-out filters
      const deduped = new Map<string, (typeof targets)[number]>();
      for (const item of targets) {
        if (!deduped.has(item.phone)) deduped.set(item.phone, item);
      }

      const eligible: Array<(typeof targets)[number]> = [];
      for (const target of deduped.values()) {
        if (!isEmergency) {
          const prefRes = await client.query<{
            marketing_opt_in: boolean;
            transactional_opt_out: boolean;
            opted_out_categories: string[];
            preferred_channel: string;
            preferred_locale: string;
          }>(
            `SELECT marketing_opt_in, transactional_opt_out, opted_out_categories,
                    preferred_channel, preferred_locale
             FROM production.cmag_recipient_preferences
             WHERE tenant_id = $1 AND recipient_type = $2 AND recipient_id = $3
             LIMIT 1`,
            [principal.tenantId, target.recipientType, target.recipientId]
          );
          const p = prefRes.rows[0];
          if (p) {
            if (input.classification === 'marketing' && !p.marketing_opt_in) continue;
            if (p.transactional_opt_out || p.opted_out_categories.includes(input.category)) continue;
            if (input.channel === 'auto' && (p.preferred_channel === 'sms' || p.preferred_channel === 'whatsapp')) {
              target.preferredChannel = p.preferred_channel;
            }
            if (p.preferred_locale) target.locale = p.preferred_locale;
          }
        }
        eligible.push(target);
      }

      let messageBody = input.messageBody || '';
      if (!messageBody && input.templateKey) {
        const tplRes = await client.query<{ body_template: string }>(
          `SELECT body_template FROM production.cmag_message_templates
           WHERE tenant_id = $1 AND template_key = $2 AND is_active = true LIMIT 1`,
          [principal.tenantId, input.templateKey]
        );
        if (tplRes.rows[0]) messageBody = renderTemplateText(tplRes.rows[0].body_template, input.variables);
      }
      if (!messageBody.trim()) {
        throw new CmagCommunicationError('MESSAGE_BODY_REQUIRED', 'Broadcast message body or template is required.', 400);
      }

      const campaignId = randomUUID();
      const status = input.scheduledFor && input.scheduledFor.getTime() > Date.now() ? 'scheduled' : 'queued';

      await client.query(
        `INSERT INTO production.cmag_broadcast_campaigns (
           tenant_id, id, application_id, application_instance_id, title,
           classification, category, target_mode, target_filter, channel,
           template_key, locale, message_body, scheduled_for, status,
           recipient_count, queued_count, created_by
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9::jsonb, $10,
           $11, $12, $13, $14, $15,
           $16, $16, $17
         )`,
        [
          principal.tenantId,
          campaignId,
          applicationId,
          input.applicationInstanceId ?? null,
          input.title.trim(),
          input.classification,
          input.category,
          input.targetMode,
          JSON.stringify(input.targetFilter ?? {}),
          input.channel,
          input.templateKey ?? null,
          input.locale ?? 'en',
          messageBody,
          input.scheduledFor ?? null,
          status,
          eligible.length,
          input.actorSubject
        ]
      );

      await client.query(
        `INSERT INTO production.cmag_audit_events (
           tenant_id, application_id, application_instance_id, actor_subject,
           action, target_type, target_id, outcome, safe_details
         ) VALUES ($1, $2, $3, $4, 'broadcast_campaign_created', 'campaign', $5, 'success', $6::jsonb)`,
        [
          principal.tenantId,
          applicationId,
          input.applicationInstanceId ?? null,
          input.actorSubject,
          campaignId,
          JSON.stringify({
            classification: input.classification,
            targetMode: input.targetMode,
            recipientCount: eligible.length
          })
        ]
      );

      return {
        campaignId,
        status,
        eligible,
        messageBody,
        smsSender: tCfg?.sms_sender_name ?? undefined,
        waSender: tCfg?.whatsapp_sender_number ?? undefined
      };
    });

    let queuedCount = 0;
    for (const target of prepared.eligible) {
      await this.deliveryEngine.enqueueTenantMessage(principal, {
        scope: input.applicationInstanceId ? 'application' : 'school',
        tenantId: principal.tenantId,
        applicationId,
        applicationInstanceId: input.applicationInstanceId,
        environment: currentDeploymentEnvironment(),
        classification: input.classification,
        category: input.category,
        purpose: 'broadcast_campaign',
        idempotencyKey: `campaign:${prepared.campaignId}:${target.recipientId}:${target.phone}`,
        templateKey: input.templateKey,
        locale: target.locale,
        recipientType: target.recipientType,
        recipientRef: target.recipientId,
        guardianId: target.guardianId,
        broadcastCampaignId: prepared.campaignId,
        scheduledFor: input.scheduledFor,
        request: target.preferredChannel === 'sms'
          ? { channel: 'sms', to: target.phone, message: prepared.messageBody, senderName: prepared.smsSender }
          : { channel: 'whatsapp', to: target.phone, message: prepared.messageBody, senderNumber: prepared.waSender }
      });
      queuedCount += 1;
    }

    return {
      campaignId: prepared.campaignId,
      recipientCount: prepared.eligible.length,
      queuedCount,
      status: prepared.status
    };
  }
}
