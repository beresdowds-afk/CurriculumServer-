import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  createVerifiedTenantPrincipal,
  withControlPlaneTransaction,
  withTenantLoginTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { isPlatformAdminEmail, isValidEmail, normalizeEmail } from '../schoolProvisioning';
import { CmagDeliveryEngine } from './deliveryEngine';
import { currentDeploymentEnvironment } from './providers';
import type { AuthChannelPolicy, GatewayChannel, OtpPurpose } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_OTP_ATTEMPTS = 5;

export interface OtpRateLimitConfig {
  windowMs: number;
  maxPerIp: number;
  maxPerRecipient: number;
  maxPerTenant: number;
  maxPerApplication: number;
}

const DEFAULT_OTP_RATE_LIMIT: OtpRateLimitConfig = {
  windowMs: 15 * 60_000,
  maxPerIp: 25,
  maxPerRecipient: 5,
  maxPerTenant: 200,
  maxPerApplication: 300
};

export interface PlatformOtpRequestInput {
  email: string;
  phone?: string;
  preferredChannel?: GatewayChannel;
  purpose: 'platform_login' | 'platform_mfa' | 'platform_recovery' | 'security_verify';
  ipAddress?: string;
  locale?: string;
  correlationId?: string;
}

export interface PlatformOtpVerifyInput {
  challengeId: string;
  email: string;
  purpose: 'platform_login' | 'platform_mfa' | 'platform_recovery' | 'security_verify';
  code: string;
  ipAddress?: string;
}

export interface TenantOtpRequestInput {
  tenantId: string;
  applicationId: string;
  applicationInstanceId?: string;
  recipientType?: 'admin' | 'staff' | 'guardian' | 'student' | 'user';
  email?: string;
  phone?: string;
  userId?: string;
  preferredChannel?: GatewayChannel;
  purpose:
    | 'login_otp'
    | 'mfa_verify'
    | 'account_verify'
    | 'password_recovery'
    | 'sensitive_action'
    | 'device_verify'
    | 'registration_verify';
  ipAddress?: string;
  locale?: string;
  correlationId?: string;
}

export interface TenantOtpVerifyInput {
  tenantId: string;
  applicationId: string;
  applicationInstanceId?: string;
  challengeId: string;
  email?: string;
  phone?: string;
  purpose: TenantOtpRequestInput['purpose'];
  code: string;
  issueSession?: boolean;
  ttlSeconds?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface OtpDispatchReceipt {
  challengeId: string;
  outboxId: string;
  channel: GatewayChannel;
  purpose: OtpPurpose;
  expiresAt: string;
  resendAvailableAt: string;
  maskedDestination: string;
  correlationId: string;
}

export class CmagOtpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'CmagOtpError';
  }
}

function getOtpHmacKey(): string {
  const secret = process.env.CONTROL_PLANE_SECRET || '';
  if (
    secret.length < 32 ||
    secret === 'default_insecure_secret' ||
    secret === 'dev_insecure_fallback_secret_curriculum_server_2026_secure'
  ) {
    throw new CmagOtpError('OTP_SIGNING_UNAVAILABLE', 'OTP cryptographic configuration is unavailable.', 503);
  }
  return secret;
}

function hashOtpCode(challengeScope: string, code: string): Buffer {
  return createHmac('sha256', getOtpHmacKey())
    .update(`cmag-otp:${challengeScope}:${code}`)
    .digest();
}

function hashRecipient(identifier: string): string {
  return createHmac('sha256', getOtpHmacKey())
    .update(`cmag-recipient:${identifier.trim().toLowerCase()}`)
    .digest('hex');
}

function maskDestination(channel: GatewayChannel, dest: string): string {
  if (channel === 'email') {
    const [local, domain] = dest.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (dest.length <= 6) return '****';
  return `${dest.slice(0, 4)}****${dest.slice(-3)}`;
}

function generateNumericOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function constantTimeDigestEquals(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

class SlidingBucketLimiter {
  private readonly buckets = new Map<string, number[]>();

  consume(key: string, max: number, windowMs: number, nowMs: number): boolean {
    if (!key) return true;
    const cutoff = nowMs - windowMs;
    const list = (this.buckets.get(key) || []).filter(ts => ts > cutoff);
    if (list.length >= max) {
      this.buckets.set(key, list);
      return false;
    }
    list.push(nowMs);
    this.buckets.set(key, list);
    return true;
  }

  reset(): void {
    this.buckets.clear();
  }
}

export class CmagOtpService {
  private readonly rateLimiter = new SlidingBucketLimiter();

  constructor(
    private readonly pool: DatabasePool,
    private readonly deliveryEngine: CmagDeliveryEngine,
    private readonly rateConfig: OtpRateLimitConfig = DEFAULT_OTP_RATE_LIMIT,
    private readonly nowFn: () => number = () => Date.now()
  ) {}

  resetRateLimits(): void {
    this.rateLimiter.reset();
  }

  private enforceRequestRateLimits(dimensions: {
    ip?: string;
    recipientHash: string;
    tenantId?: string;
    applicationId: string;
  }): void {
    const now = this.nowFn();
    if (dimensions.ip && !this.rateLimiter.consume(`ip:${dimensions.ip}`, this.rateConfig.maxPerIp, this.rateConfig.windowMs, now)) {
      throw new CmagOtpError('OTP_RATE_LIMITED', 'Too many OTP requests from this IP address. Please wait before trying again.', 429);
    }
    if (!this.rateLimiter.consume(`rcpt:${dimensions.recipientHash}`, this.rateConfig.maxPerRecipient, this.rateConfig.windowMs, now)) {
      throw new CmagOtpError('OTP_RATE_LIMITED', 'Too many OTP requests for this destination. Please wait before trying again.', 429);
    }
    if (dimensions.tenantId && !this.rateLimiter.consume(`tenant:${dimensions.tenantId}`, this.rateConfig.maxPerTenant, this.rateConfig.windowMs, now)) {
      throw new CmagOtpError('OTP_RATE_LIMITED', 'Tenant OTP rate limit reached. Please retry shortly.', 429);
    }
    if (!this.rateLimiter.consume(`app:${dimensions.applicationId}`, this.rateConfig.maxPerApplication, this.rateConfig.windowMs, now)) {
      throw new CmagOtpError('OTP_RATE_LIMITED', 'Application OTP rate limit reached. Please retry shortly.', 429);
    }
  }

  resolveAuthChannel(params: {
    policy: AuthChannelPolicy;
    preferredChannel?: GatewayChannel;
    permittedChannels?: readonly string[];
    smsReady: boolean;
    whatsappReady: boolean;
    emailReady: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
  }): { channel: GatewayChannel; providerHint?: string } {
    const allowed = new Set(params.permittedChannels && params.permittedChannels.length > 0
      ? params.permittedChannels
      : ['sms', 'whatsapp', 'email']);

    const canUse = (ch: GatewayChannel): boolean => {
      if (!allowed.has(ch)) return false;
      if (ch === 'sms') return params.hasPhone && params.smsReady;
      if (ch === 'whatsapp') return params.hasPhone && params.whatsappReady;
      return params.hasEmail && params.emailReady;
    };

    switch (params.policy) {
      case 'sms_only':
        if (canUse('sms')) return { channel: 'sms' };
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'SMS authentication channel is currently unavailable.', 503);
      case 'whatsapp_only':
        if (canUse('whatsapp')) return { channel: 'whatsapp' };
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'WhatsApp authentication channel is currently unavailable.', 503);
      case 'email':
        if (canUse('email')) return { channel: 'email' };
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'Email authentication channel is currently unavailable.', 503);
      case 'sms_then_whatsapp':
        if (canUse('sms')) return { channel: 'sms' };
        if (canUse('whatsapp')) return { channel: 'whatsapp' };
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'Neither SMS nor WhatsApp authentication delivery is available.', 503);
      case 'whatsapp_then_sms':
        if (canUse('whatsapp')) return { channel: 'whatsapp' };
        if (canUse('sms')) return { channel: 'sms' };
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'Neither WhatsApp nor SMS authentication delivery is available.', 503);
      case 'user_selected': {
        const order: GatewayChannel[] = params.preferredChannel
          ? [params.preferredChannel, 'sms', 'whatsapp', 'email']
          : ['sms', 'whatsapp', 'email'];
        for (const candidate of order) {
          if (params.preferredChannel && candidate !== params.preferredChannel) {
            throw new CmagOtpError(
              'CMAG_AUTH_CHANNEL_UNAVAILABLE',
              `Requested ${params.preferredChannel.toUpperCase()} authentication channel is unavailable or not configured.`,
              503
            );
          }
          if (canUse(candidate)) return { channel: candidate };
        }
        throw new CmagOtpError('CMAG_AUTH_CHANNEL_UNAVAILABLE', 'No configured authentication channel is ready.', 503);
      }
    }
  }

  private async evaluateProviderChannelReadiness(client: DatabaseClient): Promise<{
    smsReady: boolean;
    whatsappReady: boolean;
    emailReady: boolean;
    policy: AuthChannelPolicy;
    smsProviderId: string;
    whatsappProviderId: string;
    smsSender?: string;
    whatsappSender?: string;
  }> {
    const { providers, platformConfig } = await this.deliveryEngine.resolveRuntimeProviders(client);
    const registry = this.deliveryEngine.getProviderRegistry();
    const runtimeEnv = currentDeploymentEnvironment();

    const smsProvider = providers.find(p => p.id === platformConfig.defaultSmsProvider)
      || providers.find(p => p.supportedChannels.includes('sms') && p.enabled);
    const waProvider = providers.find(p => p.id === platformConfig.defaultWhatsappProvider)
      || providers.find(p => p.supportedChannels.includes('whatsapp') && p.enabled);

    const smsAdapter = smsProvider ? registry.getAdapter(smsProvider.id) : undefined;
    const waAdapter = waProvider ? registry.getAdapter(waProvider.id) : undefined;

    const smsConfigOk = Boolean(
      platformConfig.smsEnabled &&
      !platformConfig.suspendedChannels.includes('sms') &&
      smsProvider &&
      smsAdapter?.validateConfig(smsProvider, runtimeEnv).valid &&
      smsProvider.credentials.smsSenderName &&
      smsAdapter.validateSenderIdentity(smsProvider.credentials.smsSenderName, 'sms', runtimeEnv).valid
    );

    const waConfigOk = Boolean(
      platformConfig.whatsappEnabled &&
      !platformConfig.suspendedChannels.includes('whatsapp') &&
      waProvider &&
      waAdapter?.validateConfig(waProvider, runtimeEnv).valid &&
      (waProvider.credentials.whatsappSender || waProvider.credentials.phoneNumberId)
    );

    const emailOk = registry.getEmailFallback().readiness().email;

    return {
      smsReady: smsConfigOk,
      whatsappReady: waConfigOk,
      emailReady: emailOk,
      policy: (platformConfig.authChannelPolicy as AuthChannelPolicy) || 'sms_only',
      smsProviderId: smsProvider?.id || 'sendchamp',
      whatsappProviderId: waProvider?.id || 'sendchamp',
      smsSender: smsProvider?.credentials.smsSenderName,
      whatsappSender: waProvider?.credentials.whatsappSender || waProvider?.credentials.phoneNumberId
    };
  }

  async requestPlatformOtp(
    platformPrincipal: VerifiedTenantPrincipal,
    input: PlatformOtpRequestInput
  ): Promise<OtpDispatchReceipt> {
    const email = normalizeEmail(input.email || '');
    if (!isValidEmail(email) || !isPlatformAdminEmail(email)) {
      throw new CmagOtpError('PLATFORM_ADMIN_NOT_AUTHORIZED', 'Platform administrator email is invalid or not allowlisted.', 403);
    }
    const phone = input.phone?.trim();
    if (phone && !E164_REGEX.test(phone)) {
      throw new CmagOtpError('INVALID_PHONE_NUMBER', 'Phone number must be in E.164 format (e.g. +2348012345678).', 400);
    }

    const recipientKey = phone || email;
    const recipientHash = hashRecipient(recipientKey);
    this.enforceRequestRateLimits({
      ip: input.ipAddress,
      recipientHash,
      applicationId: 'platform_control_plane'
    });

    const otpCode = generateNumericOtp();
    const nowMs = this.nowFn();
    const expiresAt = new Date(nowMs + OTP_TTL_SECONDS * 1000);
    const resendAvailableAt = new Date(nowMs + RESEND_COOLDOWN_SECONDS * 1000);

    const prepared = await withControlPlaneTransaction(this.pool, platformPrincipal, async client => {
      const readiness = await this.evaluateProviderChannelReadiness(client);
      const selected = this.resolveAuthChannel({
        policy: input.preferredChannel ? 'user_selected' : readiness.policy,
        preferredChannel: input.preferredChannel,
        smsReady: readiness.smsReady,
        whatsappReady: readiness.whatsappReady,
        emailReady: readiness.emailReady,
        hasPhone: Boolean(phone),
        hasEmail: true
      });

      // Enforce resend cooldown on active challenges
      const recent = await client.query<{ id: string; last_sent_at: Date; resend_count: number }>(
        `SELECT id, last_sent_at, resend_count
         FROM control_plane.cmag_auth_otp_challenges
         WHERE lower(subject_email) = lower($1) AND purpose = $2
           AND verified_at IS NULL AND invalidated_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [email, input.purpose]
      );
      if (recent.rows[0]) {
        const elapsedMs = nowMs - recent.rows[0].last_sent_at.getTime();
        if (elapsedMs < RESEND_COOLDOWN_SECONDS * 1000) {
          throw new CmagOtpError('OTP_RESEND_COOLDOWN', 'Please wait for the resend cooldown to elapse before requesting another code.', 429);
        }
        await client.query(
          `UPDATE control_plane.cmag_auth_otp_challenges SET invalidated_at = now()
           WHERE lower(subject_email) = lower($1) AND purpose = $2
             AND verified_at IS NULL AND invalidated_at IS NULL`,
          [email, input.purpose]
        );
      }

      const challengeScope = `platform:${email}:${input.purpose}`;
      const otpHash = hashOtpCode(challengeScope, otpCode);
      const challengeRes = await client.query<{ id: string }>(
        `INSERT INTO control_plane.cmag_auth_otp_challenges (
           subject_email, recipient_hash, channel, purpose, otp_hash,
           max_attempts, resend_count, expires_at, request_ip
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          email,
          recipientHash,
          selected.channel,
          input.purpose,
          otpHash,
          MAX_OTP_ATTEMPTS,
          recent.rows[0] ? recent.rows[0].resend_count + 1 : 0,
          expiresAt,
          input.ipAddress?.slice(0, 120) ?? null
        ]
      );

      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, 'platform_otp_requested', 'otp_challenge', $2, 'success', $3::jsonb)`,
        [
          email,
          challengeRes.rows[0].id,
          JSON.stringify({ channel: selected.channel, purpose: input.purpose })
        ]
      );

      return {
        challengeId: challengeRes.rows[0].id,
        channel: selected.channel,
        providerId: selected.channel === 'sms' ? readiness.smsProviderId : selected.channel === 'whatsapp' ? readiness.whatsappProviderId : undefined,
        smsSender: readiness.smsSender,
        whatsappSender: readiness.whatsappSender
      };
    });

    const destination = prepared.channel === 'email' ? email : phone!;
    const otpText = `Curriculum Server security verification code: ${otpCode}. Valid for 5 minutes. Do not share this code.`;

    const outbox = await this.deliveryEngine.enqueuePlatformMessage(platformPrincipal, {
      applicationId: 'platform_control_plane',
      environment: currentDeploymentEnvironment(),
      classification: 'authentication',
      category: 'authentication',
      purpose: input.purpose,
      correlationId: input.correlationId,
      idempotencyKey: `plat-otp:${prepared.challengeId}`,
      templateKey: 'auth_otp',
      locale: input.locale || 'en',
      preferredProviderId: prepared.providerId,
      recipientType: 'admin',
      recipientRef: recipientHash,
      maxAttempts: 3,
      request: prepared.channel === 'email'
        ? { channel: 'email', to: email, subject: 'Curriculum Server Security Code', text: otpText }
        : prepared.channel === 'sms'
          ? { channel: 'sms', to: destination, message: otpText, senderName: prepared.smsSender }
          : {
              channel: 'whatsapp',
              to: destination,
              message: otpText,
              senderNumber: prepared.whatsappSender,
              template: {
                name: 'platform_auth_otp',
                locale: input.locale || 'en',
                variables: { code: otpCode },
                approved: true
              }
            }
    });

    return {
      challengeId: prepared.challengeId,
      outboxId: outbox.outboxId,
      channel: prepared.channel,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
      maskedDestination: maskDestination(prepared.channel, destination),
      correlationId: outbox.correlationId
    };
  }

  async verifyPlatformOtp(
    platformPrincipal: VerifiedTenantPrincipal,
    input: PlatformOtpVerifyInput
  ): Promise<{ verified: true; email: string; channel: GatewayChannel; purpose: string }> {
    const email = normalizeEmail(input.email || '');
    const code = (input.code || '').trim();
    if (!UUID_REGEX.test(input.challengeId) || !isValidEmail(email) || !/^\d{6}$/.test(code)) {
      throw new CmagOtpError('INVALID_OTP_INPUT', 'Valid challenge ID, email, and 6-digit verification code are required.', 400);
    }

    return withControlPlaneTransaction(this.pool, platformPrincipal, async client => {
      const res = await client.query<{
        id: string;
        subject_email: string;
        channel: GatewayChannel;
        purpose: string;
        otp_hash: Buffer;
        attempt_count: number;
        max_attempts: number;
        expires_at: Date;
        verified_at: Date | null;
        invalidated_at: Date | null;
      }>(
        `SELECT id, subject_email, channel, purpose, otp_hash, attempt_count, max_attempts,
                expires_at, verified_at, invalidated_at
         FROM control_plane.cmag_auth_otp_challenges
         WHERE id = $1 AND lower(subject_email) = lower($2) AND purpose = $3
         FOR UPDATE`,
        [input.challengeId, email, input.purpose]
      );
      const row = res.rows[0];
      if (!row || row.verified_at || row.invalidated_at || row.expires_at.getTime() <= this.nowFn()) {
        throw new CmagOtpError('OTP_CHALLENGE_EXPIRED_OR_INVALID', 'OTP challenge is invalid, expired, or already used.', 401);
      }
      if (row.attempt_count >= row.max_attempts) {
        throw new CmagOtpError('OTP_ATTEMPTS_EXCEEDED', 'Maximum verification attempts exceeded. Request a new code.', 429);
      }

      const expected = hashOtpCode(`platform:${email}:${input.purpose}`, code);
      const matched = constantTimeDigestEquals(Buffer.from(row.otp_hash), expected);

      if (!matched) {
        const nextAttempts = row.attempt_count + 1;
        const exhausted = nextAttempts >= row.max_attempts;
        await client.query(
          `UPDATE control_plane.cmag_auth_otp_challenges
           SET attempt_count = $2,
               invalidated_at = CASE WHEN $3 THEN now() ELSE invalidated_at END
           WHERE id = $1`,
          [row.id, nextAttempts, exhausted]
        );
        await client.query(
          `INSERT INTO control_plane.cmag_platform_audit_events
             (actor_subject, action, target_type, target_id, outcome, safe_details)
           VALUES ($1, $2, 'otp_challenge', $3, 'failed', $4::jsonb)`,
          [
            email,
            exhausted ? 'platform_otp_bruteforce_locked' : 'platform_otp_verify_failed',
            row.id,
            JSON.stringify({ attempts: nextAttempts, ip: input.ipAddress ?? null })
          ]
        );
        throw new CmagOtpError(
          exhausted ? 'OTP_ATTEMPTS_EXCEEDED' : 'INVALID_OTP_CODE',
          exhausted ? 'Maximum verification attempts exceeded. Request a new code.' : 'Invalid verification code.',
          exhausted ? 429 : 401
        );
      }

      await client.query(
        `UPDATE control_plane.cmag_auth_otp_challenges SET verified_at = now() WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `INSERT INTO control_plane.cmag_platform_audit_events
           (actor_subject, action, target_type, target_id, outcome, safe_details)
         VALUES ($1, 'platform_otp_verified', 'otp_challenge', $2, 'success', $3::jsonb)`,
        [email, row.id, JSON.stringify({ channel: row.channel, purpose: row.purpose })]
      );

      return { verified: true as const, email, channel: row.channel, purpose: row.purpose };
    });
  }

  async requestTenantOtp(
    workerPrincipal: VerifiedTenantPrincipal,
    input: TenantOtpRequestInput
  ): Promise<OtpDispatchReceipt> {
    if (!UUID_REGEX.test(input.tenantId)) {
      throw new CmagOtpError('INVALID_TENANT_ID', 'Valid school tenant ID is required.', 400);
    }
    const email = input.email ? normalizeEmail(input.email) : undefined;
    if (email && !isValidEmail(email)) {
      throw new CmagOtpError('INVALID_EMAIL', 'Email address format is invalid.', 400);
    }
    const phone = input.phone?.trim();
    if (phone && !E164_REGEX.test(phone)) {
      throw new CmagOtpError('INVALID_PHONE_NUMBER', 'Phone number must be in E.164 format.', 400);
    }
    if (!email && !phone) {
      throw new CmagOtpError('DESTINATION_REQUIRED', 'A verified phone number or email address is required.', 400);
    }

    const recipientKey = phone || email!;
    const recipientHash = hashRecipient(`${input.tenantId}:${input.applicationId}:${recipientKey}`);
    this.enforceRequestRateLimits({
      ip: input.ipAddress,
      recipientHash,
      tenantId: input.tenantId,
      applicationId: input.applicationId
    });

    const otpCode = generateNumericOtp();
    const nowMs = this.nowFn();
    const expiresAt = new Date(nowMs + OTP_TTL_SECONDS * 1000);
    const resendAvailableAt = new Date(nowMs + RESEND_COOLDOWN_SECONDS * 1000);

    // Resolve platform provider readiness securely via control-plane context first
    const readiness = await withControlPlaneTransaction(this.pool, workerPrincipal, client =>
      this.evaluateProviderChannelReadiness(client)
    );

    const tenantPrincipal = createVerifiedTenantPrincipal({
      valid: true,
      context: {
        tenantId: input.tenantId,
        role: 'tenant_admin',
        appId: input.applicationId,
        schoolName: 'School',
        subscriptionTier: 'standard',
        status: 'ACTIVE',
        databaseName: '',
        storageNamespace: '',
        issuer: 'CurriculumServer-ControlPlane',
        audience: input.tenantId,
        issuedAt: Math.floor(nowMs / 1000),
        expiresAt: Math.floor(nowMs / 1000) + 300,
        tokenSignature: 'verified-cmag-otp',
        permissions: []
      }
    });

    const prepared = await withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const tenantCheck = await client.query<{ status: string }>(
        `SELECT status FROM production.tenants WHERE id = $1`,
        [input.tenantId]
      );
      if (tenantCheck.rows[0]?.status !== 'approved') {
        throw new CmagOtpError('TENANT_NOT_ACTIVE', 'School tenant is not active.', 403);
      }

      const cfgRes = await client.query<{
        feature_enabled: boolean;
        suspended: boolean;
        sms_enabled: boolean;
        whatsapp_enabled: boolean;
        auth_delivery_enabled: boolean;
        auth_channel_policy: AuthChannelPolicy;
        sms_sender_name: string | null;
        whatsapp_sender_number: string | null;
      }>(
        `SELECT feature_enabled, suspended, sms_enabled, whatsapp_enabled, auth_delivery_enabled,
                auth_channel_policy, sms_sender_name, whatsapp_sender_number
         FROM production.cmag_tenant_configs WHERE tenant_id = $1`,
        [input.tenantId]
      );
      const tCfg = cfgRes.rows[0];
      if (tCfg?.suspended) {
        throw new CmagOtpError('CMAG_TENANT_SUSPENDED', 'Messaging gateway is suspended for this school.', 403);
      }

      let appPolicy: AuthChannelPolicy = tCfg?.auth_channel_policy || readiness.policy;
      let permittedChannels: string[] = ['sms', 'whatsapp', 'email'];
      let smsEnabled = Boolean((tCfg ? tCfg.sms_enabled : true) && readiness.smsReady);
      let waEnabled = Boolean((tCfg ? tCfg.whatsapp_enabled : true) && readiness.whatsappReady);

      if (input.applicationInstanceId && UUID_REGEX.test(input.applicationInstanceId)) {
        const appRes = await client.query<{
          application_id: string;
          share_tenant_config: boolean;
          entitlement_status: string;
          sms_enabled: boolean;
          whatsapp_enabled: boolean;
          auth_delivery_enabled: boolean;
          auth_channel_policy: AuthChannelPolicy;
          permitted_channels: string[];
        }>(
          `SELECT application_id, share_tenant_config, entitlement_status, sms_enabled, whatsapp_enabled,
                  auth_delivery_enabled, auth_channel_policy, permitted_channels
           FROM production.cmag_application_configs
           WHERE tenant_id = $1 AND application_instance_id = $2`,
          [input.tenantId, input.applicationInstanceId]
        );
        const appCfg = appRes.rows[0];
        if (appCfg) {
          if (appCfg.application_id !== input.applicationId) {
            throw new CmagOtpError('CMAG_APPLICATION_SCOPE_MISMATCH', 'Application instance does not match requested application ID.', 403);
          }
          if (appCfg.entitlement_status !== 'active') {
            throw new CmagOtpError('CMAG_APPLICATION_UNAUTHORIZED', 'Messaging entitlement is not active for this application instance.', 403);
          }
          if (!appCfg.share_tenant_config) {
            if (!appCfg.auth_delivery_enabled) {
              throw new CmagOtpError('CMAG_AUTH_DELIVERY_DISABLED', 'Authentication delivery is disabled for this application.', 403);
            }
            appPolicy = appCfg.auth_channel_policy;
            permittedChannels = appCfg.permitted_channels;
            smsEnabled = appCfg.sms_enabled && readiness.smsReady;
            waEnabled = appCfg.whatsapp_enabled && readiness.whatsappReady;
          }
        }
      }

      if (tCfg && !tCfg.auth_delivery_enabled && !tCfg.feature_enabled) {
        throw new CmagOtpError('CMAG_AUTH_DELIVERY_DISABLED', 'SMS/WhatsApp authentication delivery is not enabled for this school.', 403);
      }

      const selected = this.resolveAuthChannel({
        policy: input.preferredChannel ? 'user_selected' : appPolicy,
        preferredChannel: input.preferredChannel,
        permittedChannels,
        smsReady: smsEnabled,
        whatsappReady: waEnabled,
        emailReady: readiness.emailReady,
        hasPhone: Boolean(phone),
        hasEmail: Boolean(email)
      });

      const recent = await client.query<{ id: string; last_sent_at: Date; resend_count: number }>(
        `SELECT id, last_sent_at, resend_count
         FROM production.cmag_auth_otp_challenges
         WHERE tenant_id = $1 AND application_id = $2 AND recipient_hash = $3 AND purpose = $4
           AND verified_at IS NULL AND invalidated_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [input.tenantId, input.applicationId, recipientHash, input.purpose]
      );
      if (recent.rows[0]) {
        const elapsedMs = nowMs - recent.rows[0].last_sent_at.getTime();
        if (elapsedMs < RESEND_COOLDOWN_SECONDS * 1000) {
          throw new CmagOtpError('OTP_RESEND_COOLDOWN', 'Please wait before requesting another verification code.', 429);
        }
        await client.query(
          `UPDATE production.cmag_auth_otp_challenges SET invalidated_at = now()
           WHERE tenant_id = $1 AND application_id = $2 AND recipient_hash = $3 AND purpose = $4
             AND verified_at IS NULL AND invalidated_at IS NULL`,
          [input.tenantId, input.applicationId, recipientHash, input.purpose]
        );
      }

      const challengeScope = `${input.tenantId}:${input.applicationId}:${input.purpose}:${recipientKey}`;
      const otpHash = hashOtpCode(challengeScope, otpCode);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO production.cmag_auth_otp_challenges (
           tenant_id, application_id, application_instance_id, user_id,
           recipient_type, recipient_ref, recipient_hash, channel, purpose,
           otp_hash, max_attempts, resend_count, expires_at, request_ip
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14
         ) RETURNING id`,
        [
          input.tenantId,
          input.applicationId,
          input.applicationInstanceId ?? null,
          input.userId ?? null,
          input.recipientType || 'user',
          maskDestination(selected.channel, recipientKey),
          recipientHash,
          selected.channel,
          input.purpose,
          otpHash,
          MAX_OTP_ATTEMPTS,
          recent.rows[0] ? recent.rows[0].resend_count + 1 : 0,
          expiresAt,
          input.ipAddress?.slice(0, 120) ?? null
        ]
      );

      await client.query(
        `INSERT INTO production.cmag_audit_events (
           tenant_id, application_id, application_instance_id, actor_subject,
           action, target_type, target_id, outcome, safe_details
         ) VALUES ($1, $2, $3, $4, 'tenant_otp_requested', 'otp_challenge', $5, 'success', $6::jsonb)`,
        [
          input.tenantId,
          input.applicationId,
          input.applicationInstanceId ?? null,
          input.userId || maskDestination(selected.channel, recipientKey),
          inserted.rows[0].id,
          JSON.stringify({ channel: selected.channel, purpose: input.purpose })
        ]
      );

      return {
        challengeId: inserted.rows[0].id,
        channel: selected.channel,
        smsSender: tCfg?.sms_sender_name || readiness.smsSender,
        whatsappSender: tCfg?.whatsapp_sender_number || readiness.whatsappSender,
        providerId: selected.channel === 'sms' ? readiness.smsProviderId : selected.channel === 'whatsapp' ? readiness.whatsappProviderId : undefined
      };
    });

    const dest = prepared.channel === 'email' ? email! : phone!;
    const otpText = `Your verification code is ${otpCode}. It expires in 5 minutes. Do not share this code with anyone.`;

    const outbox = await this.deliveryEngine.enqueueTenantMessage(tenantPrincipal, {
      scope: input.applicationInstanceId ? 'application' : 'school',
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      applicationInstanceId: input.applicationInstanceId,
      environment: currentDeploymentEnvironment(),
      classification: 'authentication',
      category: 'authentication',
      purpose: input.purpose,
      correlationId: input.correlationId,
      idempotencyKey: `tenant-otp:${prepared.challengeId}`,
      templateKey: 'auth_otp',
      locale: input.locale || 'en',
      preferredProviderId: prepared.providerId,
      recipientType: input.recipientType || 'user',
      recipientRef: recipientHash,
      maxAttempts: 3,
      request: prepared.channel === 'email'
        ? { channel: 'email', to: email!, subject: 'Verification Code', text: otpText }
        : prepared.channel === 'sms'
          ? { channel: 'sms', to: dest, message: otpText, senderName: prepared.smsSender }
          : {
              channel: 'whatsapp',
              to: dest,
              message: otpText,
              senderNumber: prepared.whatsappSender,
              template: {
                name: 'school_auth_otp',
                locale: input.locale || 'en',
                variables: { code: otpCode },
                approved: true
              }
            }
    });

    return {
      challengeId: prepared.challengeId,
      outboxId: outbox.outboxId,
      channel: prepared.channel,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
      maskedDestination: maskDestination(prepared.channel, dest),
      correlationId: outbox.correlationId
    };
  }

  async verifyTenantOtp(input: TenantOtpVerifyInput): Promise<{
    verified: true;
    channel: GatewayChannel;
    purpose: string;
    userId: string | null;
    email: string | null;
    fullName: string | null;
    role: string | null;
    schoolName: string | null;
    sessionId?: string;
    expiresAt?: Date;
  }> {
    if (!UUID_REGEX.test(input.tenantId) || !UUID_REGEX.test(input.challengeId)) {
      throw new CmagOtpError('INVALID_OTP_INPUT', 'Valid tenant ID and challenge ID are required.', 400);
    }
    const email = input.email ? normalizeEmail(input.email) : undefined;
    const phone = input.phone?.trim();
    const recipientKey = phone || email;
    const code = (input.code || '').trim();
    if (!recipientKey || !/^\d{6}$/.test(code)) {
      throw new CmagOtpError('INVALID_OTP_INPUT', 'Destination and 6-digit verification code are required.', 400);
    }

    const nowMs = this.nowFn();
    const recipientHash = hashRecipient(`${input.tenantId}:${input.applicationId}:${recipientKey}`);
    const tenantPrincipal = createVerifiedTenantPrincipal({
      valid: true,
      context: {
        tenantId: input.tenantId,
        role: 'tenant_admin',
        appId: input.applicationId,
        schoolName: 'School',
        subscriptionTier: 'standard',
        status: 'ACTIVE',
        databaseName: '',
        storageNamespace: '',
        issuer: 'CurriculumServer-ControlPlane',
        audience: input.tenantId,
        issuedAt: Math.floor(nowMs / 1000),
        expiresAt: Math.floor(nowMs / 1000) + 300,
        tokenSignature: 'verified-cmag-otp-verify',
        permissions: []
      }
    });

    return withTenantTransaction(this.pool, tenantPrincipal, async client => {
      const res = await client.query<{
        id: string;
        application_id: string;
        application_instance_id: string | null;
        user_id: string | null;
        channel: GatewayChannel;
        purpose: string;
        otp_hash: Buffer;
        attempt_count: number;
        max_attempts: number;
        expires_at: Date;
        verified_at: Date | null;
        invalidated_at: Date | null;
      }>(
        `SELECT id, application_id, application_instance_id, user_id, channel, purpose,
                otp_hash, attempt_count, max_attempts, expires_at, verified_at, invalidated_at
         FROM production.cmag_auth_otp_challenges
         WHERE tenant_id = $1 AND id = $2 AND application_id = $3
           AND recipient_hash = $4 AND purpose = $5
         FOR UPDATE`,
        [input.tenantId, input.challengeId, input.applicationId, recipientHash, input.purpose]
      );
      const row = res.rows[0];
      if (!row || row.verified_at || row.invalidated_at || row.expires_at.getTime() <= nowMs) {
        throw new CmagOtpError('OTP_CHALLENGE_EXPIRED_OR_INVALID', 'OTP challenge is invalid, expired, or already consumed.', 401);
      }
      if (input.applicationInstanceId && row.application_instance_id && row.application_instance_id !== input.applicationInstanceId) {
        throw new CmagOtpError('CMAG_APPLICATION_SCOPE_MISMATCH', 'OTP challenge does not belong to this application instance.', 403);
      }
      if (row.attempt_count >= row.max_attempts) {
        throw new CmagOtpError('OTP_ATTEMPTS_EXCEEDED', 'Maximum verification attempts exceeded. Request a new code.', 429);
      }

      const expected = hashOtpCode(`${input.tenantId}:${input.applicationId}:${input.purpose}:${recipientKey}`, code);
      if (!constantTimeDigestEquals(Buffer.from(row.otp_hash), expected)) {
        const nextAttempts = row.attempt_count + 1;
        const exhausted = nextAttempts >= row.max_attempts;
        await client.query(
          `UPDATE production.cmag_auth_otp_challenges
           SET attempt_count = $3,
               invalidated_at = CASE WHEN $4 THEN now() ELSE invalidated_at END
           WHERE tenant_id = $1 AND id = $2`,
          [input.tenantId, row.id, nextAttempts, exhausted]
        );
        await client.query(
          `INSERT INTO production.cmag_audit_events (
             tenant_id, application_id, application_instance_id, actor_subject,
             action, target_type, target_id, outcome, safe_details
           ) VALUES ($1, $2, $3, $4, $5, 'otp_challenge', $6, 'failed', $7::jsonb)`,
          [
            input.tenantId,
            input.applicationId,
            row.application_instance_id,
            row.user_id || 'anonymous',
            exhausted ? 'tenant_otp_bruteforce_locked' : 'tenant_otp_verify_failed',
            row.id,
            JSON.stringify({ attempts: nextAttempts })
          ]
        );
        throw new CmagOtpError(
          exhausted ? 'OTP_ATTEMPTS_EXCEEDED' : 'INVALID_OTP_CODE',
          exhausted ? 'Maximum verification attempts exceeded. Request a new code.' : 'Invalid verification code.',
          exhausted ? 429 : 401
        );
      }

      await client.query(
        `UPDATE production.cmag_auth_otp_challenges SET verified_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, row.id]
      );

      let resolvedUserId = row.user_id;
      let resolvedEmail: string | null = email ?? null;
      let resolvedName: string | null = null;
      let resolvedRole: string | null = null;
      let resolvedSchoolName: string | null = null;
      let sessionId: string | undefined;
      let sessionExpiresAt: Date | undefined;

      if (input.issueSession) {
        const accountRes = await client.query<{
          user_id: string;
          email: string;
          full_name: string;
          role: string;
          school_name: string;
        }>(
          `SELECT u.id AS user_id, u.email, u.full_name, m.role, org.name AS school_name
           FROM production.users u
           JOIN production.memberships m ON m.tenant_id = $1 AND m.user_id = u.id
           JOIN production.tenants t ON t.id = m.tenant_id
           JOIN production.organizations org ON org.tenant_id = t.id
           WHERE (
             ($2::uuid IS NOT NULL AND u.id = $2::uuid)
             OR ($3::text IS NOT NULL AND lower(u.email) = lower($3::text))
           )
             AND u.account_status = 'active'
             AND m.status = 'active' AND m.revoked_at IS NULL
             AND t.status = 'approved'
           LIMIT 1`,
          [input.tenantId, row.user_id, email ?? null]
        );
        const acct = accountRes.rows[0];
        if (!acct) {
          throw new CmagOtpError('MEMBERSHIP_INACTIVE', 'Verified OTP cannot issue a session without an active school membership.', 403);
        }
        resolvedUserId = acct.user_id;
        resolvedEmail = acct.email;
        resolvedName = acct.full_name;
        resolvedRole = acct.role;
        resolvedSchoolName = acct.school_name;
        const ttl = Math.min(86400, Math.max(300, Math.floor(input.ttlSeconds ?? 43200)));
        const authMethod = row.channel === 'sms' ? 'otp_sms' : row.channel === 'whatsapp' ? 'otp_whatsapp' : 'otp_email';
        const sess = await client.query<{ id: string; expires_at: Date }>(
          `INSERT INTO production.user_sessions
             (tenant_id, user_id, expires_at, auth_method, mfa_verified_at, ip_address, user_agent)
           VALUES ($1, $2, now() + make_interval(secs => $3), $4, now(), $5, $6)
           RETURNING id, expires_at`,
          [
            input.tenantId,
            acct.user_id,
            ttl,
            authMethod,
            input.ipAddress?.slice(0, 120) ?? null,
            input.userAgent?.slice(0, 255) ?? null
          ]
        );
        sessionId = sess.rows[0].id;
        sessionExpiresAt = sess.rows[0].expires_at;
      }

      await client.query(
        `INSERT INTO production.cmag_audit_events (
           tenant_id, application_id, application_instance_id, actor_subject,
           action, target_type, target_id, outcome, safe_details
         ) VALUES ($1, $2, $3, $4, 'tenant_otp_verified', 'otp_challenge', $5, 'success', $6::jsonb)`,
        [
          input.tenantId,
          input.applicationId,
          row.application_instance_id,
          resolvedUserId || resolvedEmail || 'verified_user',
          row.id,
          JSON.stringify({ channel: row.channel, purpose: row.purpose, issuedSession: Boolean(sessionId) })
        ]
      );

      return {
        verified: true as const,
        channel: row.channel,
        purpose: row.purpose,
        userId: resolvedUserId,
        email: resolvedEmail,
        fullName: resolvedName,
        role: resolvedRole,
        schoolName: resolvedSchoolName,
        ...(sessionId ? { sessionId, expiresAt: sessionExpiresAt } : {})
      };
    });
  }
}
