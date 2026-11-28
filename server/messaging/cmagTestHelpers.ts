import { randomUUID } from 'node:crypto';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { createVerifiedTenantPrincipal, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { TEST_CONTROL_PLANE_SECRET } from '../db/testSupport';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;
process.env.STORAGE_VAULT_ACTIVE_KEY_ID ||= 'test';
process.env.STORAGE_VAULT_KEYS ||= JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') });

export interface MockCmagState {
  platformConfig: Record<string, any>;
  providerConfigs: Map<string, Record<string, any>>;
  providerHealth: Map<string, Record<string, any>>;
  senderIdentities: Array<Record<string, any>>;
  whatsappTemplates: Array<Record<string, any>>;
  platformOutbox: Array<Record<string, any>>;
  platformAttempts: Array<Record<string, any>>;
  platformAuditEvents: Array<Record<string, any>>;
  platformOtpChallenges: Array<Record<string, any>>;
  webhookEvents: Array<Record<string, any>>;
  tenants: Map<string, { id: string; status: string; schoolName: string }>;
  users: Array<{ id: string; email: string; full_name: string; account_status: string }>;
  memberships: Array<{ tenant_id: string; user_id: string; role: string; status: string; revoked_at: Date | null }>;
  userSessions: Array<Record<string, any>>;
  tenantConfigs: Map<string, Record<string, any>>;
  appConfigs: Array<Record<string, any>>;
  serviceEntitlements: Array<Record<string, any>>;
  templates: Array<Record<string, any>>;
  preferences: Array<Record<string, any>>;
  consentRecords: Array<Record<string, any>>;
  tenantOutbox: Array<Record<string, any>>;
  tenantAttempts: Array<Record<string, any>>;
  deliveryReceipts: Array<Record<string, any>>;
  usageRecords: Array<Record<string, any>>;
  campaigns: Array<Record<string, any>>;
  tenantAuditEvents: Array<Record<string, any>>;
  tenantOtpChallenges: Array<Record<string, any>>;
  guardians: Array<{ id: string; tenant_id: string; phone: string | null; verification_status: string }>;
  studentGuardians: Array<{ tenant_id: string; guardian_id: string; student_id: string; can_receive_notifications: boolean }>;
  students: Array<{ id: string; tenant_id: string; class_id: string | null }>;
  staff: Array<{ id: string; tenant_id: string; status: string; phone: string | null }>;
  setConfigs: Array<{ tenantId: string }>;
}

export function buildPlatformPrincipal(email = 'owner@curriculum-server.test'): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'platform-control-plane',
      role: 'super_admin',
      appId: 'curriculum-server-control-plane',
      schoolName: 'Curriculum Server Control Plane',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: 'platform-control-plane',
      email,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'test-platform-sig',
      permissions: ['super_admin']
    }
  });
}

export function buildTenantPrincipal(
  tenantId: string,
  userId = '10000000-0000-4000-8000-000000000001',
  role = 'principal'
): VerifiedTenantPrincipal {
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId,
      role,
      appId: 'app_curriculum_flow',
      schoolName: 'Test School',
      subscriptionTier: 'standard',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: tenantId,
      userId,
      email: 'admin@testschool.edu',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenSignature: 'test-tenant-sig',
      permissions: []
    }
  });
}

export function createMockCmagPool(): { pool: DatabasePool; state: MockCmagState } {
  const state: MockCmagState = {
    platformConfig: {
      id: 'default',
      environment: 'production',
      sms_enabled: true,
      whatsapp_enabled: true,
      preferred_channel: 'sms',
      auth_channel_policy: 'sms_only',
      fallback_enabled: true,
      default_sms_provider: 'sendchamp',
      default_whatsapp_provider: 'sendchamp',
      failover_sms_provider: 'termii_sms',
      failover_whatsapp_provider: 'meta_whatsapp',
      daily_sms_limit: 5000,
      daily_whatsapp_limit: 5000,
      monthly_budget_minor: null,
      currency: 'NGN',
      retention_days: 90,
      suspended_channels: []
    },
    providerConfigs: new Map([
      ['sendchamp', {
        id: 'sendchamp',
        display_name: 'Sendchamp Multi-Channel Gateway',
        provider_type: 'multi',
        supported_channels: ['sms', 'whatsapp'],
        environment: 'production',
        enabled: true,
        suspended: false,
        suspended_reason: null,
        priority: 10,
        base_url: 'https://api.sendchamp.com',
        encrypted_credentials: null,
        encrypted_webhook_secret: null,
        readiness_status: 'not_configured',
        last_verified_at: null,
        options: {}
      }],
      ['meta_whatsapp', {
        id: 'meta_whatsapp',
        display_name: 'Meta WhatsApp Business Cloud API',
        provider_type: 'whatsapp',
        supported_channels: ['whatsapp'],
        environment: 'production',
        enabled: false,
        suspended: false,
        suspended_reason: null,
        priority: 20,
        base_url: 'https://graph.facebook.com',
        encrypted_credentials: null,
        encrypted_webhook_secret: null,
        readiness_status: 'not_configured',
        last_verified_at: null,
        options: {}
      }],
      ['termii_sms', {
        id: 'termii_sms',
        display_name: 'Termii Regional SMS Gateway',
        provider_type: 'sms',
        supported_channels: ['sms'],
        environment: 'production',
        enabled: false,
        suspended: false,
        suspended_reason: null,
        priority: 30,
        base_url: 'https://v3.api.termii.com',
        encrypted_credentials: null,
        encrypted_webhook_secret: null,
        readiness_status: 'not_configured',
        last_verified_at: null,
        options: {}
      }]
    ]),
    providerHealth: new Map(),
    senderIdentities: [],
    whatsappTemplates: [],
    platformOutbox: [],
    platformAttempts: [],
    platformAuditEvents: [],
    platformOtpChallenges: [],
    webhookEvents: [],
    tenants: new Map(),
    users: [],
    memberships: [],
    userSessions: [],
    tenantConfigs: new Map(),
    appConfigs: [],
    serviceEntitlements: [],
    templates: [],
    preferences: [],
    consentRecords: [],
    tenantOutbox: [],
    tenantAttempts: [],
    deliveryReceipts: [],
    usageRecords: [],
    campaigns: [],
    tenantAuditEvents: [],
    tenantOtpChallenges: [],
    guardians: [],
    studentGuardians: [],
    students: [],
    staff: [],
    setConfigs: []
  };

  const qr = <R extends QueryResultRow>(rows: R[], command = 'SELECT', rowCount = rows.length): QueryResult<R> => ({
    rows,
    rowCount,
    command,
    oid: 0,
    fields: []
  });

  const query = async <R extends QueryResultRow = QueryResultRow>(
    rawSql: string,
    values: unknown[] = []
  ): Promise<QueryResult<R>> => {
    const sql = rawSql.replace(/\s+/g, ' ').trim();

    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return qr<R>([], sql, 0);
    }
    if (sql.startsWith("SELECT set_config('app.tenant_id'")) {
      state.setConfigs.push({ tenantId: String(values[0] || '') });
      return qr<R>([], 'SELECT', 1);
    }

    // ---- Platform config & providers ----
    if (sql.includes('FROM control_plane.cmag_platform_config')) {
      return qr<R>([state.platformConfig as unknown as R]);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_config SET')) {
      const cols = [
        'environment', 'sms_enabled', 'whatsapp_enabled', 'preferred_channel', 'auth_channel_policy',
        'fallback_enabled', 'default_sms_provider', 'default_whatsapp_provider', 'failover_sms_provider',
        'failover_whatsapp_provider', 'daily_sms_limit', 'daily_whatsapp_limit', 'monthly_budget_minor',
        'retention_days', 'suspended_channels'
      ];
      cols.forEach((col, i) => {
        if (values[i] !== null && values[i] !== undefined) state.platformConfig[col] = values[i];
      });
      state.platformConfig.updated_by = values[15];
      state.platformConfig.updated_at = new Date();
      return qr<R>([state.platformConfig as unknown as R], 'UPDATE');
    }
    if (sql.includes('SELECT id, readiness_status, last_verified_at FROM control_plane.cmag_provider_configs')) {
      const rows = [...state.providerConfigs.values()].map(p => ({
        id: p.id,
        readiness_status: p.readiness_status,
        last_verified_at: p.last_verified_at
      }));
      return qr<R>(rows as unknown as R[]);
    }
    if (sql.includes('FROM control_plane.cmag_provider_configs')) {
      const rows = [...state.providerConfigs.values()].sort((a, b) => a.priority - b.priority);
      return qr<R>(rows as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_provider_configs')) {
      const existing = state.providerConfigs.get(String(values[0]));
      const rec = {
        id: values[0],
        display_name: values[1],
        provider_type: values[2],
        supported_channels: values[3],
        environment: values[4],
        enabled: values[5],
        suspended: existing?.suspended ?? false,
        suspended_reason: existing?.suspended_reason ?? null,
        priority: values[6],
        base_url: values[7],
        encrypted_credentials: values[8] ?? existing?.encrypted_credentials ?? null,
        encrypted_webhook_secret: values[9] ?? existing?.encrypted_webhook_secret ?? null,
        options: JSON.parse(String(values[10] || '{}')),
        readiness_status: values[11],
        last_verified_at: values[12] ?? existing?.last_verified_at ?? null,
        updated_by: values[13],
        updated_at: new Date()
      };
      state.providerConfigs.set(String(values[0]), rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_provider_configs SET suspended =')) {
      const existing = state.providerConfigs.get(String(values[0]));
      if (!existing) return qr<R>([], 'UPDATE', 0);
      existing.suspended = Boolean(values[1]);
      existing.suspended_reason = values[2];
      if (existing.suspended) existing.readiness_status = 'channel_disabled';
      existing.updated_by = values[3];
      return qr<R>([existing as unknown as R], 'UPDATE', 1);
    }

    // ---- Circuit health ----
    if (sql.includes('FROM control_plane.cmag_provider_health')) {
      return qr<R>([...state.providerHealth.values()] as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_provider_health')) {
      const key = `${values[0]}:${values[1]}`;
      const existing = state.providerHealth.get(key);
      if (sql.includes("'closed', 0, NULL")) {
        const rec = {
          provider_id: values[0],
          channel: values[1],
          circuit_state: 'closed',
          consecutive_failures: 0,
          opened_at: null,
          next_probe_at: null,
          last_success_at: new Date(),
          last_failure_at: existing?.last_failure_at ?? null,
          last_error_code: existing?.last_error_code ?? null,
          rate_limit_remaining: values[2] ?? existing?.rate_limit_remaining ?? null,
          rate_limit_reset_at: values[3] ?? existing?.rate_limit_reset_at ?? null
        };
        state.providerHealth.set(key, rec);
      } else {
        const prevFailures = existing?.consecutive_failures ?? 0;
        const nextFailures = prevFailures + 1;
        const threshold = Number(values[3] || 5);
        const openSec = Number(values[4] || 60);
        const opened = nextFailures >= threshold;
        const rec = {
          provider_id: values[0],
          channel: values[1],
          circuit_state: opened ? 'open' : (existing?.circuit_state ?? 'closed'),
          consecutive_failures: nextFailures,
          opened_at: opened ? new Date() : (existing?.opened_at ?? null),
          next_probe_at: opened ? new Date(Date.now() + openSec * 1000) : (existing?.next_probe_at ?? null),
          last_success_at: existing?.last_success_at ?? null,
          last_failure_at: new Date(),
          last_error_code: values[2],
          rate_limit_remaining: existing?.rate_limit_remaining ?? null,
          rate_limit_reset_at: existing?.rate_limit_reset_at ?? null
        };
        state.providerHealth.set(key, rec);
      }
      return qr<R>([], 'INSERT', 1);
    }

    // ---- Senders & WA templates ----
    if (sql.startsWith('INSERT INTO control_plane.cmag_sender_identities')) {
      const rec = {
        id: randomUUID(),
        scope: values[0],
        tenant_id: values[1],
        provider_id: values[2],
        channel: values[3],
        sender_value: values[4],
        sms_route: values[5],
        waba_id: values[6],
        environment: values[7],
        approval_status: values[8],
        approved_by: values[9],
        approved_at: values[10],
        created_by: values[11],
        created_at: new Date()
      };
      state.senderIdentities.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM control_plane.cmag_sender_identities')) {
      return qr<R>(state.senderIdentities as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_whatsapp_templates')) {
      const rec = {
        id: randomUUID(),
        scope: values[0],
        tenant_id: values[1],
        provider_id: values[2],
        template_key: values[3],
        provider_template_name: values[4],
        provider_template_id: values[5],
        locale: values[6],
        category: values[7],
        body_preview: values[8],
        approval_status: values[9],
        environment: values[10],
        approved_at: values[11],
        created_by: values[12],
        created_at: new Date()
      };
      state.whatsappTemplates.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM control_plane.cmag_whatsapp_templates')) {
      return qr<R>(state.whatsappTemplates as unknown as R[]);
    }

    // ---- Audit tables ----
    if (sql.startsWith('INSERT INTO control_plane.cmag_platform_audit_events')) {
      const rec = {
        id: randomUUID(),
        actor_subject: values[0],
        action: values[1],
        target_type: values[2],
        target_id: values[3],
        outcome: values[4],
        safe_details: values[5] ? JSON.parse(String(values[5])) : {},
        occurred_at: new Date()
      };
      state.platformAuditEvents.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM control_plane.cmag_platform_audit_events')) {
      return qr<R>(state.platformAuditEvents as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.cmag_audit_events')) {
      const rec = {
        id: randomUUID(),
        tenant_id: values[0],
        application_id: values.length >= 7 ? values[1] : null,
        actor_subject: values.length >= 7 ? values[3] : values[1],
        action: values.length >= 7 ? values[4] : values[2],
        target_type: values.length >= 7 ? values[5] : values[3],
        target_id: values.length >= 7 ? values[6] : values[4],
        outcome: values.length >= 7 ? values[7] : values[5],
        safe_details: values.length >= 7 && values[8] ? JSON.parse(String(values[8])) : {},
        occurred_at: new Date()
      };
      state.tenantAuditEvents.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.cmag_audit_events')) {
      return qr<R>(state.tenantAuditEvents.filter(e => e.tenant_id === values[0]) as unknown as R[]);
    }

    // ---- Platform OTP ----
    if (sql.includes('FROM control_plane.cmag_auth_otp_challenges WHERE lower(subject_email)')) {
      const email = String(values[0] || '').toLowerCase();
      const purpose = String(values[1] || '');
      const matches = state.platformOtpChallenges
        .filter(c => c.subject_email.toLowerCase() === email && c.purpose === purpose && !c.verified_at && !c.invalidated_at && c.expires_at > new Date())
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return qr<R>(matches.slice(0, 1) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_auth_otp_challenges SET invalidated_at = now()')) {
      const email = String(values[0] || '').toLowerCase();
      const purpose = String(values[1] || '');
      state.platformOtpChallenges.forEach(c => {
        if (c.subject_email.toLowerCase() === email && c.purpose === purpose && !c.verified_at && !c.invalidated_at) {
          c.invalidated_at = new Date();
        }
      });
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_auth_otp_challenges')) {
      const rec = {
        id: randomUUID(),
        subject_email: values[0],
        recipient_hash: values[1],
        channel: values[2],
        purpose: values[3],
        otp_hash: values[4],
        attempt_count: 0,
        max_attempts: values[5],
        resend_count: values[6],
        expires_at: values[7],
        request_ip: values[8],
        last_sent_at: new Date(),
        created_at: new Date(),
        verified_at: null as Date | null,
        invalidated_at: null as Date | null
      };
      state.platformOtpChallenges.push(rec);
      return qr<R>([{ id: rec.id } as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM control_plane.cmag_auth_otp_challenges WHERE id = $1')) {
      const row = state.platformOtpChallenges.find(
        c => c.id === values[0] && c.subject_email.toLowerCase() === String(values[1]).toLowerCase() && c.purpose === values[2]
      );
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_auth_otp_challenges SET attempt_count =')) {
      const row = state.platformOtpChallenges.find(c => c.id === values[0]);
      if (row) {
        row.attempt_count = Number(values[1]);
        if (values[2]) row.invalidated_at = new Date();
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_auth_otp_challenges SET verified_at = now()')) {
      const row = state.platformOtpChallenges.find(c => c.id === values[0]);
      if (row) row.verified_at = new Date();
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }

    // ---- Tenant OTP ----
    if (sql.includes('FROM production.tenants WHERE id = $1')) {
      const t = state.tenants.get(String(values[0]));
      return qr<R>((t ? [{ status: t.status }] : []) as unknown as R[]);
    }
    if (sql.includes('FROM production.cmag_auth_otp_challenges WHERE tenant_id = $1 AND application_id = $2')) {
      const matches = state.tenantOtpChallenges
        .filter(c =>
          c.tenant_id === values[0] &&
          c.application_id === values[1] &&
          c.recipient_hash === values[2] &&
          c.purpose === values[3] &&
          !c.verified_at &&
          !c.invalidated_at &&
          c.expires_at > new Date()
        )
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return qr<R>(matches.slice(0, 1) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE production.cmag_auth_otp_challenges SET invalidated_at = now()')) {
      state.tenantOtpChallenges.forEach(c => {
        if (c.tenant_id === values[0] && c.application_id === values[1] && c.recipient_hash === values[2] && c.purpose === values[3] && !c.verified_at && !c.invalidated_at) {
          c.invalidated_at = new Date();
        }
      });
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('INSERT INTO production.cmag_auth_otp_challenges')) {
      const rec = {
        id: randomUUID(),
        tenant_id: values[0],
        application_id: values[1],
        application_instance_id: values[2],
        user_id: values[3],
        recipient_type: values[4],
        recipient_ref: values[5],
        recipient_hash: values[6],
        channel: values[7],
        purpose: values[8],
        otp_hash: values[9],
        attempt_count: 0,
        max_attempts: values[10],
        resend_count: values[11],
        expires_at: values[12],
        request_ip: values[13],
        last_sent_at: new Date(),
        created_at: new Date(),
        verified_at: null as Date | null,
        invalidated_at: null as Date | null
      };
      state.tenantOtpChallenges.push(rec);
      return qr<R>([{ id: rec.id } as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.cmag_auth_otp_challenges WHERE tenant_id = $1 AND id = $2')) {
      const row = state.tenantOtpChallenges.find(
        c => c.tenant_id === values[0] && c.id === values[1] && c.application_id === values[2] && c.recipient_hash === values[3] && c.purpose === values[4]
      );
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE production.cmag_auth_otp_challenges SET attempt_count =')) {
      const row = state.tenantOtpChallenges.find(c => c.tenant_id === values[0] && c.id === values[1]);
      if (row) {
        row.attempt_count = Number(values[2]);
        if (values[3]) row.invalidated_at = new Date();
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.startsWith('UPDATE production.cmag_auth_otp_challenges SET verified_at = now()')) {
      const row = state.tenantOtpChallenges.find(c => c.tenant_id === values[0] && c.id === values[1]);
      if (row) row.verified_at = new Date();
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.includes('FROM production.users u JOIN production.memberships m')) {
      const tenantId = String(values[0]);
      const userId = values[1] ? String(values[1]) : null;
      const email = values[2] ? String(values[2]).toLowerCase() : null;
      const tenant = state.tenants.get(tenantId);
      if (!tenant || tenant.status !== 'approved') return qr<R>([]);
      const mem = state.memberships.find(m => m.tenant_id === tenantId && m.status === 'active' && !m.revoked_at);
      if (!mem) return qr<R>([]);
      const user = state.users.find(u =>
        u.id === mem.user_id &&
        u.account_status === 'active' &&
        ((userId && u.id === userId) || (email && u.email.toLowerCase() === email))
      );
      if (!user) return qr<R>([]);
      return qr<R>([{
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: mem.role,
        school_name: tenant.schoolName
      } as unknown as R]);
    }
    if (sql.startsWith('INSERT INTO production.user_sessions')) {
      const sess = {
        id: randomUUID(),
        tenant_id: values[0],
        user_id: values[1],
        expires_at: new Date(Date.now() + Number(values[2]) * 1000),
        auth_method: values[3],
        ip_address: values[4],
        user_agent: values[5]
      };
      state.userSessions.push(sess);
      return qr<R>([{ id: sess.id, expires_at: sess.expires_at } as unknown as R], 'INSERT', 1);
    }

    // ---- Tenant & application messaging config ----
    if (sql.includes('FROM production.cmag_tenant_configs WHERE tenant_id = $1')) {
      const rec = state.tenantConfigs.get(String(values[0]));
      return qr<R>((rec ? [rec] : []) as unknown as R[]);
    }
    if (sql.includes('FROM production.cmag_tenant_configs tc')) {
      const rows = [...state.tenantConfigs.values()].map(tc => ({
        ...tc,
        school_name: state.tenants.get(tc.tenant_id)?.schoolName ?? 'School'
      }));
      return qr<R>(rows as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.cmag_tenant_configs')) {
      const existing = state.tenantConfigs.get(String(values[0]));
      const rec = {
        tenant_id: values[0],
        feature_enabled: true,
        provisioning_status: 'provisioned',
        suspended: existing?.suspended ?? false,
        suspension_reason: existing?.suspension_reason ?? null,
        sms_enabled: values[1],
        whatsapp_enabled: values[2],
        auth_delivery_enabled: values[3],
        school_comms_enabled: values[4],
        preferred_channel: values[5],
        auth_channel_policy: values[6],
        fallback_enabled: values[7],
        sms_sender_name: values[8] ?? existing?.sms_sender_name ?? null,
        whatsapp_sender_number: values[9] ?? existing?.whatsapp_sender_number ?? null,
        default_locale: values[10],
        jurisdiction: values[11],
        enabled_categories: values[12],
        daily_quota: values[13],
        monthly_quota: values[14],
        monthly_budget_minor: existing?.monthly_budget_minor ?? null,
        updated_by: values[15],
        updated_at: new Date()
      };
      state.tenantConfigs.set(String(values[0]), rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.startsWith('UPDATE production.cmag_tenant_configs SET suspended =')) {
      const existing = state.tenantConfigs.get(String(values[0]));
      if (!existing) return qr<R>([], 'UPDATE', 0);
      existing.suspended = Boolean(values[1]);
      existing.suspension_reason = values[2];
      existing.provisioning_status = existing.suspended ? 'suspended' : 'provisioned';
      existing.updated_by = values[3];
      return qr<R>([existing as unknown as R], 'UPDATE', 1);
    }
    if (sql.startsWith('UPDATE production.cmag_tenant_configs SET sms_enabled =')) {
      const existing = state.tenantConfigs.get(String(values[0]));
      if (!existing) return qr<R>([], 'UPDATE', 0);
      const map: Record<string, unknown> = {
        sms_enabled: values[1],
        whatsapp_enabled: values[2],
        auth_delivery_enabled: values[3],
        school_comms_enabled: values[4],
        preferred_channel: values[5],
        auth_channel_policy: values[6],
        fallback_enabled: values[7],
        default_locale: values[8],
        enabled_categories: values[9]
      };
      for (const [k, v] of Object.entries(map)) {
        if (v !== null && v !== undefined) existing[k] = v;
      }
      existing.updated_by = values[10];
      existing.updated_at = new Date();
      return qr<R>([existing as unknown as R], 'UPDATE', 1);
    }

    if (sql.includes('FROM production.cmag_application_configs WHERE tenant_id = $1 AND application_instance_id = $2')) {
      const rec = state.appConfigs.find(a => a.tenant_id === values[0] && a.application_instance_id === values[1]);
      return qr<R>((rec ? [rec] : []) as unknown as R[]);
    }
    if (sql.includes('FROM production.cmag_application_configs WHERE tenant_id = $1')) {
      return qr<R>(state.appConfigs.filter(a => a.tenant_id === values[0]) as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.cmag_application_configs')) {
      const idx = state.appConfigs.findIndex(a => a.tenant_id === values[0] && a.application_instance_id === values[1]);
      const rec = {
        tenant_id: values[0],
        application_instance_id: values[1],
        application_id: values[2],
        share_tenant_config: values[3],
        entitlement_status: 'active',
        sms_enabled: values[4],
        whatsapp_enabled: values[5],
        auth_delivery_enabled: values[6],
        comms_enabled: values[7],
        auth_channel_policy: values[8],
        permitted_channels: values[9],
        daily_quota: values[10],
        readiness_status: values[11]
      };
      if (idx >= 0) state.appConfigs[idx] = rec;
      else state.appConfigs.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.startsWith('UPDATE production.cmag_application_configs SET')) {
      const rec = state.appConfigs.find(a => a.tenant_id === values[0] && a.application_instance_id === values[1]);
      if (rec) {
        if (values[2] !== null) rec.share_tenant_config = values[2];
        if (values[3] !== null) rec.sms_enabled = values[3];
        if (values[4] !== null) rec.whatsapp_enabled = values[4];
        if (values[5] !== null) rec.auth_delivery_enabled = values[5];
        if (values[6] !== null) rec.comms_enabled = values[6];
        if (values[7] !== null) rec.auth_channel_policy = values[7];
        if (values[8] !== null) rec.permitted_channels = values[8];
      }
      return qr<R>([], 'UPDATE', rec ? 1 : 0);
    }

    if (sql.startsWith('INSERT INTO production.application_service_entitlements')) {
      const idx = state.serviceEntitlements.findIndex(
        e => e.tenant_id === values[0] && e.application_instance_id === values[1] && e.service_id === 'central_messaging'
      );
      const rec = {
        tenant_id: values[0],
        application_instance_id: values[1],
        service_id: 'central_messaging',
        status: 'active',
        allowed_operations: values[2],
        granted_by: values[3],
        revoked_at: null
      };
      if (idx >= 0) state.serviceEntitlements[idx] = rec;
      else state.serviceEntitlements.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }

    // ---- Templates ----
    if (sql.startsWith('INSERT INTO production.cmag_message_templates')) {
      const hasAppIdParam = sql.includes('VALUES ($1, $2, $3');
      const tenantId = values[0];
      const appId = hasAppIdParam ? values[1] : '';
      const templateKey = hasAppIdParam ? values[2] : values[1];
      const locale = hasAppIdParam ? values[3] : values[2];
      const channel = hasAppIdParam ? values[4] : values[3];
      const idx = state.templates.findIndex(
        t => t.tenant_id === tenantId && (t.application_id || '') === appId && t.template_key === templateKey && t.locale === locale && t.channel === channel
      );
      const rec = hasAppIdParam
        ? {
            id: idx >= 0 ? state.templates[idx].id : randomUUID(),
            tenant_id: tenantId,
            application_id: appId,
            template_key: templateKey,
            locale,
            channel,
            classification: values[5],
            category: values[6],
            title: values[7],
            body_template: values[8],
            whatsapp_template_name: values[9],
            approval_status: 'approved',
            sensitive_data_policy: values[10],
            is_active: true,
            created_by: values[11]
          }
        : {
            id: idx >= 0 ? state.templates[idx].id : randomUUID(),
            tenant_id: tenantId,
            application_id: '',
            template_key: templateKey,
            locale,
            channel,
            classification: values[4],
            category: values[5],
            title: values[6],
            body_template: values[7],
            whatsapp_template_name: values[8],
            approval_status: 'approved',
            sensitive_data_policy: values[9],
            is_active: true,
            created_by: values[10]
          };
      if (idx === -1) state.templates.push(rec);
      else if (sql.includes('DO UPDATE')) state.templates[idx] = rec;
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.cmag_message_templates WHERE tenant_id = $1 AND template_key = $2')) {
      const hasChannel = sql.includes('AND channel = $3');
      const rows = state.templates.filter(t =>
        t.tenant_id === values[0] &&
        t.template_key === values[1] &&
        t.is_active &&
        (!hasChannel || t.channel === values[2])
      );
      return qr<R>(rows as unknown as R[]);
    }
    if (sql.includes('FROM production.cmag_message_templates WHERE tenant_id = $1')) {
      return qr<R>(state.templates.filter(t => t.tenant_id === values[0]) as unknown as R[]);
    }

    // ---- Preferences & consents ----
    if (sql.startsWith('INSERT INTO production.cmag_recipient_preferences')) {
      const idx = state.preferences.findIndex(
        p => p.tenant_id === values[0] && p.recipient_type === values[1] && p.recipient_id === values[2]
      );
      const rec = {
        tenant_id: values[0],
        recipient_type: values[1],
        recipient_id: values[2],
        phone_e164: values[3],
        phone_verified: values[4],
        whatsapp_capable: values[5],
        preferred_channel: values[6],
        preferred_locale: values[7],
        marketing_opt_in: values[8],
        transactional_opt_out: values[9],
        opted_out_categories: values[10],
        daily_frequency_cap: values[11],
        updated_by: values[12],
        updated_at: new Date()
      };
      if (idx >= 0) state.preferences[idx] = rec;
      else state.preferences.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.cmag_recipient_preferences WHERE tenant_id = $1 AND recipient_type = $2')) {
      const p = state.preferences.find(
        row => row.tenant_id === values[0] && row.recipient_type === values[1] && row.recipient_id === values[2]
      );
      return qr<R>((p ? [p] : []) as unknown as R[]);
    }
    if (sql.includes('FROM production.cmag_recipient_preferences WHERE tenant_id = $1')) {
      return qr<R>(state.preferences.filter(p => p.tenant_id === values[0]) as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.cmag_consent_records')) {
      const rec = {
        id: randomUUID(),
        tenant_id: values[0],
        recipient_type: values[1],
        recipient_id: values[2],
        channel: values[3],
        category: values[4],
        consent_status: values[5],
        source: values[6],
        recorded_by: values[7]
      };
      state.consentRecords.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }

    // ---- Guardian / Student / Staff queries ----
    if (sql.includes('FROM production.student_guardians sg JOIN production.guardians g')) {
      const link = state.studentGuardians.find(
        sg => sg.tenant_id === values[0] && sg.guardian_id === values[1] && sg.student_id === values[2]
      );
      if (!link) return qr<R>([]);
      const g = state.guardians.find(x => x.tenant_id === values[0] && x.id === values[1]);
      if (!g) return qr<R>([]);
      return qr<R>([{
        verification_status: g.verification_status,
        can_receive_notifications: link.can_receive_notifications,
        phone: g.phone
      } as unknown as R]);
    }
    if (sql.includes('FROM production.guardians g')) {
      const tenantId = String(values[0]);
      const verifiedOnly = Boolean(values[1]);
      const classId = values[2] ? String(values[2]) : null;
      const rows = state.guardians.filter(g => {
        if (g.tenant_id !== tenantId || !g.phone) return false;
        if (verifiedOnly && g.verification_status !== 'verified') return false;
        if (classId) {
          const links = state.studentGuardians.filter(sg => sg.tenant_id === tenantId && sg.guardian_id === g.id);
          return links.some(sg => state.students.some(s => s.tenant_id === tenantId && s.id === sg.student_id && s.class_id === classId));
        }
        return true;
      });
      return qr<R>(rows as unknown as R[]);
    }
    if (sql.includes('FROM production.staff WHERE tenant_id = $1')) {
      const rows = state.staff.filter(s => s.tenant_id === values[0] && s.status === 'active' && s.phone);
      return qr<R>(rows as unknown as R[]);
    }

    // ---- Campaigns ----
    if (sql.startsWith('INSERT INTO production.cmag_broadcast_campaigns')) {
      const rec = {
        tenant_id: values[0],
        id: values[1],
        application_id: values[2],
        application_instance_id: values[3],
        title: values[4],
        classification: values[5],
        category: values[6],
        target_mode: values[7],
        target_filter: JSON.parse(String(values[8] || '{}')),
        channel: values[9],
        template_key: values[10],
        locale: values[11],
        message_body: values[12],
        scheduled_for: values[13],
        status: values[14],
        recipient_count: values[15],
        queued_count: values[15],
        created_by: values[16],
        created_at: new Date()
      };
      state.campaigns.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.cmag_broadcast_campaigns WHERE tenant_id = $1')) {
      return qr<R>(state.campaigns.filter(c => c.tenant_id === values[0]) as unknown as R[]);
    }

    // ---- Platform outbox ----
    if (sql.includes('FROM control_plane.cmag_platform_outbox WHERE idempotency_key = $1')) {
      const row = state.platformOutbox.find(o => o.idempotency_key === values[0]);
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.includes('SELECT count(*)::int AS cnt FROM control_plane.cmag_platform_outbox')) {
      const cnt = state.platformOutbox.filter(o => o.channel === values[0]).length;
      return qr<R>([{ cnt } as unknown as R]);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_platform_outbox')) {
      const rec = {
        id: values[0],
        channel: values[1],
        classification: values[2],
        category: values[3],
        purpose: values[4],
        environment: values[5],
        correlation_id: values[6],
        idempotency_key: values[7],
        template_key: values[8],
        locale: values[9],
        provider_id: values[10],
        provider_message_id: null as string | null,
        recipient_ref: values[11],
        encrypted_request: values[12],
        status: values[13],
        attempt_count: 0,
        max_attempts: values[14],
        next_attempt_at: values[15] instanceof Date ? values[15] : new Date(String(values[15])),
        lease_token: null as string | null,
        lease_until: null as Date | null,
        last_error_code: null as string | null,
        last_error_message: null as string | null,
        sent_at: null as Date | null,
        delivered_at: null as Date | null,
        read_at: null as Date | null,
        dead_lettered_at: null as Date | null,
        cost_minor: 0,
        currency: 'NGN',
        created_at: new Date(),
        updated_at: new Date()
      };
      state.platformOutbox.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM control_plane.cmag_platform_outbox WHERE status IN')) {
      const now = new Date();
      const row = state.platformOutbox.find(
        o => ['queued', 'retry_scheduled'].includes(o.status) &&
          o.next_attempt_at <= now &&
          (!o.lease_until || o.lease_until <= now)
      );
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_outbox SET status = \'processing\'')) {
      const row = state.platformOutbox.find(o => o.id === values[0]);
      if (row) {
        row.status = 'processing';
        row.attempt_count = Number(values[1]);
        row.lease_token = values[2];
        row.lease_until = new Date(Date.now() + 60_000);
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_outbox SET status = \'queued\'')) {
      const row = state.platformOutbox.find(o => o.id === values[0] && ['failed', 'retry_scheduled', 'expired'].includes(o.status));
      if (!row) return qr<R>([], 'UPDATE', 0);
      row.status = 'queued';
      row.max_attempts = Math.max(row.max_attempts, row.attempt_count + 1);
      row.next_attempt_at = new Date();
      row.dead_lettered_at = null;
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_outbox SET status = $3')) {
      const row = state.platformOutbox.find(o => o.id === values[0] && o.lease_token === values[1]);
      if (!row) return qr<R>([], 'UPDATE', 0);
      row.status = values[2];
      row.provider_id = values[3];
      if (values[4]) row.provider_message_id = values[4];
      row.last_error_code = values[5];
      row.last_error_message = values[6];
      if (values[2] === 'retry_scheduled') row.next_attempt_at = new Date(Date.now() + Number(values[7]) * 1000);
      if (values[8]) row.sent_at = row.sent_at || new Date();
      if (values[2] === 'failed') row.dead_lettered_at = row.dead_lettered_at || new Date();
      if (values[9] !== null) row.cost_minor = values[9];
      row.lease_token = null;
      row.lease_until = null;
      row.updated_at = new Date();
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_outbox SET status = $2')) {
      const row = state.platformOutbox.find(o => o.id === values[0]);
      if (row) {
        row.status = values[1];
        if (values[2]) row.last_error_code = values[2];
        if (['delivered', 'read'].includes(String(values[1]))) row.delivered_at = row.delivered_at || values[3];
        if (values[1] === 'read') row.read_at = row.read_at || values[3];
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.includes('FROM control_plane.cmag_platform_outbox WHERE provider_message_id = $1')) {
      const row = state.platformOutbox.find(o => o.provider_message_id === values[0]);
      return qr<R>((row ? [{ id: row.id, status: row.status }] : []) as unknown as R[]);
    }
    if (sql.includes('FROM control_plane.cmag_platform_outbox') && sql.includes('queued_count')) {
      const rows = state.platformOutbox;
      return qr<R>([{
        queued_count: rows.filter(r => r.status === 'queued').length,
        retry_scheduled_count: rows.filter(r => r.status === 'retry_scheduled').length,
        processing_count: rows.filter(r => r.status === 'processing').length,
        dead_letter_count: rows.filter(r => Boolean(r.dead_lettered_at)).length,
        sent_or_accepted_count: rows.filter(r => ['submitted', 'provider_accepted', 'accepted', 'sent'].includes(r.status)).length,
        delivered_count: rows.filter(r => ['delivered', 'read'].includes(r.status)).length,
        failed_count: rows.filter(r => r.status === 'failed').length
      } as unknown as R]);
    }
    if (sql.includes('FROM control_plane.cmag_platform_outbox')) {
      return qr<R>(state.platformOutbox as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO control_plane.cmag_platform_attempts')) {
      state.platformAttempts.push({ outbox_id: values[0], attempt_number: values[1], lease_token: values[2], status: 'pending' });
      return qr<R>([], 'INSERT', 1);
    }
    if (sql.startsWith('UPDATE control_plane.cmag_platform_attempts SET provider_id =')) {
      const a = state.platformAttempts.find(x => x.outbox_id === values[0] && x.lease_token === values[1] && x.status === 'pending');
      if (a) {
        a.provider_id = values[2];
        a.failover_from_provider = values[3];
        a.status = values[4];
        a.error_code = values[5];
        a.provider_message_id = values[6];
        a.latency_ms = values[7];
      }
      return qr<R>([], 'UPDATE', a ? 1 : 0);
    }

    // ---- Tenant outbox ----
    if (sql.includes('FROM production.notification_outbox WHERE tenant_id = $1 AND idempotency_key = $2')) {
      const row = state.tenantOutbox.find(o => o.tenant_id === values[0] && o.idempotency_key === values[1]);
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.includes('SELECT count(*)::int AS cnt FROM production.notification_outbox')) {
      const cnt = state.tenantOutbox.filter(o => o.tenant_id === values[0] && o.recipient_ref === values[1]).length;
      return qr<R>([{ cnt } as unknown as R]);
    }
    if (sql.includes('FROM production.cmag_usage_records') && sql.includes('daily_sent')) {
      const rows = state.usageRecords.filter(u => u.tenant_id === values[0]);
      const daily_sent = rows.reduce((s, r) => s + Number(r.sent_count || 0), 0);
      const monthly_cost = rows.reduce((s, r) => s + Number(r.cost_minor || 0), 0);
      return qr<R>([{ daily_sent, monthly_sent: daily_sent, monthly_cost } as unknown as R]);
    }
    if (sql.includes('FROM production.cmag_usage_records WHERE tenant_id = $1')) {
      return qr<R>(state.usageRecords.filter(u => u.tenant_id === values[0]) as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.cmag_usage_records')) {
      const isDelivered = sql.includes('delivered_count) VALUES');
      const key = `${values[0]}:${values[1]}:${values[2] ?? values[3]}`;
      const existing = state.usageRecords.find(
        u => u.tenant_id === values[0] && u.application_id === values[1] &&
          (isDelivered ? u.channel === values[2] : u.channel === values[2])
      );
      if (!existing) {
        state.usageRecords.push({
          key,
          tenant_id: values[0],
          application_id: values[1],
          usage_date: new Date().toISOString().slice(0, 10),
          channel: values[2],
          classification: values[3],
          sent_count: isDelivered ? 0 : Number(values[4] || 0),
          delivered_count: isDelivered ? 1 : 0,
          failed_count: isDelivered ? 0 : Number(values[5] || 0),
          cost_minor: isDelivered ? 0 : Number(values[6] || 0),
          currency: isDelivered ? 'NGN' : (values[7] || 'NGN')
        });
      } else {
        if (isDelivered) existing.delivered_count += 1;
        else {
          existing.sent_count += Number(values[4] || 0);
          existing.failed_count += Number(values[5] || 0);
          existing.cost_minor += Number(values[6] || 0);
        }
      }
      return qr<R>([], 'INSERT', 1);
    }
    if (sql.startsWith('INSERT INTO production.notification_outbox')) {
      const rec = {
        tenant_id: values[0],
        id: values[1],
        channel: values[2],
        encrypted_request: values[3],
        status: 'queued',
        attempt_count: 0,
        max_attempts: values[4],
        next_attempt_at: values[5] instanceof Date ? values[5] : new Date(String(values[5])),
        scope: values[6],
        application_id: values[7],
        application_instance_id: values[8],
        environment: values[9],
        classification: values[10],
        category: values[11],
        purpose: values[12],
        correlation_id: values[13],
        idempotency_key: values[14],
        template_key: values[15],
        locale: values[16],
        provider_id: values[17],
        provider_message_id: null as string | null,
        recipient_ref: values[18],
        student_id: values[19],
        guardian_id: values[20],
        broadcast_campaign_id: values[21],
        scheduled_for: values[22],
        lease_token: null as string | null,
        lease_until: null as Date | null,
        last_error_code: null as string | null,
        last_error_message: null as string | null,
        sent_at: null as Date | null,
        delivered_at: null as Date | null,
        read_at: null as Date | null,
        dead_lettered_at: null as Date | null,
        cost_minor: 0,
        currency: 'NGN',
        created_at: new Date(),
        updated_at: new Date()
      };
      state.tenantOutbox.push(rec);
      return qr<R>([rec as unknown as R], 'INSERT', 1);
    }
    if (sql.includes('FROM production.notification_outbox WHERE status IN')) {
      const now = new Date();
      const tenantFilter = values[0] ? String(values[0]) : null;
      const row = state.tenantOutbox.find(
        o => ['queued', 'retry_scheduled'].includes(o.status) &&
          o.next_attempt_at <= now &&
          (!o.lease_until || o.lease_until <= now) &&
          (!tenantFilter || o.tenant_id === tenantFilter)
      );
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.startsWith('UPDATE production.notification_outbox SET status = \'processing\'')) {
      const row = state.tenantOutbox.find(o => o.tenant_id === values[0] && o.id === values[1]);
      if (row) {
        row.status = 'processing';
        row.attempt_count = Number(values[2]);
        row.lease_token = values[3];
        row.lease_until = new Date(Date.now() + 60_000);
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.startsWith('UPDATE production.notification_outbox SET status = \'queued\'')) {
      const row = state.tenantOutbox.find(o => o.tenant_id === values[0] && o.id === values[1] && ['failed', 'retry_scheduled', 'expired'].includes(o.status));
      if (!row) return qr<R>([], 'UPDATE', 0);
      row.status = 'queued';
      row.max_attempts = Math.max(row.max_attempts, row.attempt_count + 1);
      row.next_attempt_at = new Date();
      row.dead_lettered_at = null;
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('UPDATE production.notification_outbox SET status = $4')) {
      const row = state.tenantOutbox.find(o => o.tenant_id === values[0] && o.id === values[1] && o.lease_token === values[2]);
      if (!row) return qr<R>([], 'UPDATE', 0);
      row.status = values[3];
      row.provider_id = values[4];
      if (values[5]) row.provider_message_id = values[5];
      row.last_error_code = values[6];
      row.last_error_message = values[7];
      if (values[3] === 'retry_scheduled') row.next_attempt_at = new Date(Date.now() + Number(values[8]) * 1000);
      if (values[9]) row.sent_at = row.sent_at || new Date();
      if (values[3] === 'failed') row.dead_lettered_at = row.dead_lettered_at || new Date();
      if (values[10] !== null) row.cost_minor = values[10];
      row.lease_token = null;
      row.lease_until = null;
      return qr<R>([], 'UPDATE', 1);
    }
    if (sql.startsWith('UPDATE production.notification_outbox SET status = $3')) {
      const row = state.tenantOutbox.find(o => o.tenant_id === values[0] && o.id === values[1]);
      if (row) {
        row.status = values[2];
        if (values[3]) row.last_error_code = values[3];
        if (['delivered', 'read'].includes(String(values[2]))) row.delivered_at = row.delivered_at || values[4];
        if (values[2] === 'read') row.read_at = row.read_at || values[4];
      }
      return qr<R>([], 'UPDATE', row ? 1 : 0);
    }
    if (sql.includes('FROM production.notification_outbox WHERE provider_message_id = $1')) {
      const row = state.tenantOutbox.find(o => o.provider_message_id === values[0]);
      return qr<R>((row ? [row] : []) as unknown as R[]);
    }
    if (sql.includes('FROM production.notification_outbox WHERE tenant_id = $1') && sql.includes('queued_count')) {
      const rows = state.tenantOutbox.filter(o => o.tenant_id === values[0]);
      return qr<R>([{
        queued_count: rows.filter(r => r.status === 'queued').length,
        retry_scheduled_count: rows.filter(r => r.status === 'retry_scheduled').length,
        processing_count: rows.filter(r => r.status === 'processing').length,
        dead_letter_count: rows.filter(r => Boolean(r.dead_lettered_at)).length,
        sent_or_accepted_count: rows.filter(r => ['submitted', 'provider_accepted', 'accepted', 'sent'].includes(r.status)).length,
        delivered_count: rows.filter(r => ['delivered', 'read'].includes(r.status)).length,
        failed_count: rows.filter(r => r.status === 'failed').length
      } as unknown as R]);
    }
    if (sql.includes('FROM production.notification_outbox WHERE tenant_id = $1')) {
      return qr<R>(state.tenantOutbox.filter(o => o.tenant_id === values[0]) as unknown as R[]);
    }
    if (sql.startsWith('INSERT INTO production.notification_attempts')) {
      state.tenantAttempts.push({ tenant_id: values[0], notification_id: values[1], attempt_number: values[2], lease_token: values[3], status: 'pending' });
      return qr<R>([], 'INSERT', 1);
    }
    if (sql.startsWith('UPDATE production.notification_attempts SET provider_id =')) {
      const a = state.tenantAttempts.find(x => x.tenant_id === values[0] && x.notification_id === values[1] && x.lease_token === values[2] && x.status === 'pending');
      if (a) {
        a.provider_id = values[3];
        a.failover_from_provider = values[4];
        a.status = values[5];
        a.error_code = values[6];
        a.provider_message_id = values[7];
        a.latency_ms = values[8];
      }
      return qr<R>([], 'UPDATE', a ? 1 : 0);
    }

    // ---- Webhooks & receipts ----
    if (sql.startsWith('INSERT INTO control_plane.cmag_webhook_events')) {
      const dup = state.webhookEvents.some(w => w.provider_id === values[0] && w.provider_event_id === values[1]);
      if (dup) return qr<R>([], 'INSERT', 0);
      const rec = {
        id: randomUUID(),
        provider_id: values[0],
        provider_event_id: values[1],
        provider_message_id: values[2],
        signature_hash: values[3],
        event_timestamp: values[4],
        delivery_status: values[5],
        payload_summary: JSON.parse(String(values[6] || '{}'))
      };
      state.webhookEvents.push(rec);
      return qr<R>([{ id: rec.id } as unknown as R], 'INSERT', 1);
    }
    if (sql.startsWith('INSERT INTO production.cmag_delivery_receipts')) {
      const dup = state.deliveryReceipts.some(
        r => r.tenant_id === values[0] && r.provider_id === values[2] && r.provider_event_id === values[4]
      );
      if (dup) return qr<R>([], 'INSERT', 0);
      state.deliveryReceipts.push({
        tenant_id: values[0],
        outbox_id: values[1],
        provider_id: values[2],
        provider_message_id: values[3],
        provider_event_id: values[4],
        status: values[5],
        error_code: values[6],
        raw_summary: JSON.parse(String(values[7] || '{}')),
        occurred_at: values[8]
      });
      return qr<R>([], 'INSERT', 1);
    }

    return qr<R>([]);
  };

  const client: DatabaseClient = {
    query: query as DatabaseClient['query'],
    release: () => {}
  };

  const pool: DatabasePool = {
    connect: async () => client,
    query: query as DatabasePool['query'],
    end: async () => {},
    on: (() => pool) as DatabasePool['on']
  };

  return { pool, state };
}
