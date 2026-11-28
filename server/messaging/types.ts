import type { NotificationChannel, ProviderTransport } from '../notifications/providers';

export type MessagingScope = 'platform' | 'school' | 'application';

export type MessagingChannel = NotificationChannel; // 'sms' | 'whatsapp' | 'email' | 'web_push'
export type GatewayChannel = 'sms' | 'whatsapp' | 'email';

export type MessageClassification =
  | 'authentication'
  | 'transactional'
  | 'broadcast'
  | 'emergency'
  | 'marketing';

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export type MessageLifecycleState =
  | 'created'
  | 'queued'
  | 'processing'
  | 'submitted'
  | 'provider_accepted'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'retry_scheduled';

export type ProviderReadinessStatus =
  | 'not_configured'
  | 'credentials_missing'
  | 'credentials_invalid'
  | 'sender_not_approved'
  | 'template_not_approved'
  | 'unavailable'
  | 'operational'
  | 'degraded'
  | 'channel_disabled'
  | 'tenant_unauthorized';

export type AuthChannelPolicy =
  | 'sms_only'
  | 'whatsapp_only'
  | 'sms_then_whatsapp'
  | 'whatsapp_then_sms'
  | 'user_selected'
  | 'email';

export type OtpPurpose =
  | 'platform_login'
  | 'platform_mfa'
  | 'platform_recovery'
  | 'security_verify'
  | 'login_otp'
  | 'mfa_verify'
  | 'account_verify'
  | 'password_recovery'
  | 'sensitive_action'
  | 'device_verify'
  | 'registration_verify';

export type ProviderFailureCategory =
  | 'invalid_request'
  | 'credentials_invalid'
  | 'sender_unapproved'
  | 'template_unapproved'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'network_timeout'
  | 'recipient_unreachable'
  | 'provider_rejected'
  | 'channel_disabled';

export interface ProviderCredentials {
  apiKey?: string;
  webhookSecret?: string;
  wabaId?: string;
  phoneNumberId?: string;
  smsSenderName?: string;
  smsRoute?: 'dnd' | 'non_dnd' | 'international';
  whatsappSender?: string;
  environment?: DeploymentEnvironment;
  baseUrl?: string;
  allowTestMode?: boolean;
}

export interface ProviderConfigRecord {
  id: string;
  displayName: string;
  providerType: 'sms' | 'whatsapp' | 'multi';
  supportedChannels: readonly ('sms' | 'whatsapp')[];
  environment: DeploymentEnvironment;
  enabled: boolean;
  suspended: boolean;
  suspendedReason?: string | null;
  priority: number;
  baseUrl: string;
  credentials: ProviderCredentials;
  options: Record<string, unknown>;
}

export interface SmsDispatchRequest {
  channel: 'sms';
  to: string; // E.164
  message: string;
  senderName?: string;
  route?: 'dnd' | 'non_dnd' | 'international';
  correlationId?: string;
  idempotencyKey?: string;
}

export interface WhatsAppTemplatePayload {
  name: string;
  locale: string;
  providerTemplateId?: string;
  variables?: Record<string, string>;
  approved?: boolean;
}

export interface WhatsAppDispatchRequest {
  channel: 'whatsapp';
  to: string; // E.164
  message: string;
  senderNumber?: string;
  template?: WhatsAppTemplatePayload;
  attachmentUrl?: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export interface EmailDispatchRequest {
  channel: 'email';
  to: string;
  subject: string;
  text: string;
  correlationId?: string;
  idempotencyKey?: string;
}

export type GatewayDispatchRequest =
  | SmsDispatchRequest
  | WhatsAppDispatchRequest
  | EmailDispatchRequest;

export interface ProviderDispatchOutcome {
  accepted: boolean;
  lifecycleState: 'submitted' | 'provider_accepted' | 'failed';
  providerId: string;
  providerMessageId?: string;
  providerResponseCode?: string;
  errorCode?: string;
  errorMessage?: string;
  failureCategory?: ProviderFailureCategory;
  retryable: boolean;
  estimatedCostMinor?: number;
  currency?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
}

export interface ProviderStatusOutcome {
  providerId: string;
  providerMessageId: string;
  lifecycleState: MessageLifecycleState;
  errorCode?: string;
  occurredAt: Date;
}

export interface NormalizedWebhookEvent {
  providerId: string;
  providerEventId: string;
  providerMessageId: string;
  channel?: 'sms' | 'whatsapp';
  lifecycleState: MessageLifecycleState;
  errorCode?: string;
  occurredAt: Date;
  summary: Record<string, unknown>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  signatureHash?: string;
  eventTimestamp?: Date;
}

export interface ProviderHealthCheckResult {
  providerId: string;
  channel: 'sms' | 'whatsapp';
  readinessStatus: ProviderReadinessStatus;
  healthy: boolean;
  reason?: string;
  checkedAt: string;
}

export interface MessagingProviderAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly supportedChannels: readonly ('sms' | 'whatsapp')[];

  validateConfig(config: ProviderConfigRecord, runtimeEnv: DeploymentEnvironment): {
    valid: boolean;
    readinessStatus: ProviderReadinessStatus;
    errors: string[];
  };
  verifyCredentials(
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<{ valid: boolean; readinessStatus: ProviderReadinessStatus; reason?: string }>;
  validateSenderIdentity(
    sender: string,
    channel: 'sms' | 'whatsapp',
    runtimeEnv: DeploymentEnvironment
  ): { valid: boolean; reason?: string };
  sendSms(
    request: SmsDispatchRequest,
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<ProviderDispatchOutcome>;
  sendWhatsApp(
    request: WhatsAppDispatchRequest,
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<ProviderDispatchOutcome>;
  validateTemplate(
    template: WhatsAppTemplatePayload,
    config: ProviderConfigRecord
  ): { valid: boolean; reason?: string };
  getDeliveryStatus(
    providerMessageId: string,
    channel: 'sms' | 'whatsapp',
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<ProviderStatusOutcome | null>;
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    webhookSecret: string,
    nowMs?: number
  ): WebhookVerificationResult;
  normalizeWebhookEvent(payload: unknown): NormalizedWebhookEvent | null;
  classifyFailure(errorCode: string, httpStatus?: number): {
    category: ProviderFailureCategory;
    retryable: boolean;
  };
  isRetryable(errorCode: string, httpStatus?: number): boolean;
  checkHealth(
    channel: 'sms' | 'whatsapp',
    config: ProviderConfigRecord,
    transport?: ProviderTransport
  ): Promise<ProviderHealthCheckResult>;
  getUsageAndCost(channel: 'sms' | 'whatsapp', messageCount: number): {
    estimatedCostMinor: number;
    currency: string;
  };
  getRateLimitInfo(headers: Record<string, string | string[] | undefined>): {
    remaining?: number;
    resetAt?: Date;
  };
}

export interface CmagMessageEnvelope {
  scope: MessagingScope;
  tenantId: string | null;
  applicationId: string;
  applicationInstanceId?: string | null;
  environment: DeploymentEnvironment;
  classification: MessageClassification;
  category: string;
  purpose: string;
  correlationId?: string;
  idempotencyKey?: string;
  templateKey?: string;
  locale?: string;
  preferredProviderId?: string;
  failoverProviderId?: string;
  recipientType?: 'admin' | 'staff' | 'guardian' | 'student' | 'user';
  recipientRef?: string;
  studentId?: string;
  guardianId?: string;
  broadcastCampaignId?: string;
  scheduledFor?: Date;
  maxAttempts?: number;
  request: GatewayDispatchRequest;
  metadata?: Record<string, unknown>;
}
