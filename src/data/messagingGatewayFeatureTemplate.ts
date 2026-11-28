export const MESSAGING_GATEWAY_FEATURE_TEMPLATE = {
  templateId: 'messaging-gateway',
  templateVersion: '1.0.0',
  featureId: 'whatsapp_sms_broadcast',
  applicationId: 'app_curriculum_flow',
  centralServiceId: 'central_messaging',
  displayName: 'SMS & WhatsApp Communication Gateway',
  status: 'published',
  provisionable: true,
  supportedChannels: ['sms', 'whatsapp', 'email'] as const,
  supportedAuthChannelPolicies: [
    'sms_only',
    'whatsapp_only',
    'sms_then_whatsapp',
    'whatsapp_then_sms',
    'user_selected',
    'email'
  ] as const,
  communicationCategories: [
    'admissions',
    'attendance',
    'academics',
    'fees',
    'logistics',
    'emergency',
    'announcements',
    'general'
  ] as const,
  dependencies: ['feat_school_administration_identity'],
  requiredDatabaseMigrations: [8, 10, 14, 27, 34, 40],
  requiredTables: [
    'production.notification_outbox',
    'production.notification_attempts',
    'production.notification_subscriptions',
    'production.cmag_tenant_configs',
    'production.cmag_application_configs',
    'production.cmag_sender_identities',
    'production.cmag_message_templates',
    'production.cmag_recipient_preferences',
    'production.cmag_auth_challenges',
    'production.cmag_broadcasts',
    'production.cmag_usage_daily',
    'production.cmag_delivery_receipts',
    'production.cmag_audit_events'
  ],
  requiredPermissions: [
    'shared.messaging.discover',
    'shared.messaging.authorize',
    'shared.messaging.health',
    'messaging.config.read',
    'messaging.config.manage',
    'messaging.templates.manage',
    'messaging.preferences.manage',
    'messaging.send',
    'messaging.broadcast',
    'messaging.emergency',
    'messaging.retry',
    'messaging.reports.read'
  ]
} as const;

export type MessagingGatewayChannel = (typeof MESSAGING_GATEWAY_FEATURE_TEMPLATE.supportedChannels)[number];
export type MessagingGatewayAuthPolicy =
  (typeof MESSAGING_GATEWAY_FEATURE_TEMPLATE.supportedAuthChannelPolicies)[number];

export interface MessagingGatewayTemplateSettings {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  authDeliveryEnabled: boolean;
  schoolCommsEnabled: boolean;
  permittedChannels: MessagingGatewayChannel[];
  preferredChannel: MessagingGatewayChannel;
  authChannelPolicy: MessagingGatewayAuthPolicy;
  fallbackEnabled: boolean;
  providerAllocation?: 'platform_shared' | 'dedicated_tenant';
  smsSenderName?: string;
  whatsappSenderNumber?: string;
  defaultLocale?: string;
  jurisdiction?: string;
  enabledCategories?: string[];
  dailyQuota?: number;
  monthlyQuota?: number;
  shareTenantConfigWithFlow?: boolean;
}

export function defaultMessagingGatewaySettings(): MessagingGatewayTemplateSettings {
  return {
    smsEnabled: true,
    whatsappEnabled: false,
    authDeliveryEnabled: true,
    schoolCommsEnabled: true,
    permittedChannels: ['sms', 'email'],
    preferredChannel: 'sms',
    authChannelPolicy: 'sms_only',
    fallbackEnabled: false,
    providerAllocation: 'platform_shared',
    defaultLocale: 'en',
    jurisdiction: 'NG',
    enabledCategories: ['admissions', 'attendance', 'academics', 'fees', 'logistics', 'emergency', 'announcements'],
    dailyQuota: 1000,
    monthlyQuota: 20000,
    shareTenantConfigWithFlow: true
  };
}

/**
 * Validates provisioning-wizard / application-builder settings for whatsapp_sms_broadcast.
 * Never permits API keys, webhook secrets, or provider credentials inside template settings.
 */
export function validateMessagingGatewaySettings(
  input: unknown
): { valid: boolean; errors: string[]; settings?: MessagingGatewayTemplateSettings } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['SMS & WhatsApp gateway settings must be an object.'] };
  }
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  const allowedKeys = new Set([
    'smsEnabled',
    'whatsappEnabled',
    'authDeliveryEnabled',
    'schoolCommsEnabled',
    'permittedChannels',
    'preferredChannel',
    'authChannelPolicy',
    'fallbackEnabled',
    'providerAllocation',
    'smsSenderName',
    'whatsappSenderNumber',
    'defaultLocale',
    'jurisdiction',
    'enabledCategories',
    'dailyQuota',
    'monthlyQuota',
    'shareTenantConfigWithFlow'
  ]);
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    errors.push('Messaging gateway settings contain unsupported fields; provider secrets are never permitted here.');
  }
  for (const flag of ['smsEnabled', 'whatsappEnabled', 'authDeliveryEnabled', 'schoolCommsEnabled'] as const) {
    if (typeof value[flag] !== 'boolean') {
      errors.push(`${flag} must be explicitly true or false.`);
    }
  }
  if (value.fallbackEnabled !== undefined && typeof value.fallbackEnabled !== 'boolean') {
    errors.push('fallbackEnabled must be a boolean.');
  }
  const supportedChannels: readonly string[] = MESSAGING_GATEWAY_FEATURE_TEMPLATE.supportedChannels;
  if (!Array.isArray(value.permittedChannels) ||
      value.permittedChannels.length === 0 ||
      value.permittedChannels.some(c => typeof c !== 'string' || !supportedChannels.includes(c)) ||
      new Set(value.permittedChannels).size !== value.permittedChannels.length) {
    errors.push('permittedChannels must contain unique supported channels (sms, whatsapp, email).');
  }
  if (typeof value.preferredChannel !== 'string' || !supportedChannels.includes(value.preferredChannel)) {
    errors.push('preferredChannel must be sms, whatsapp, or email.');
  } else if (Array.isArray(value.permittedChannels) && !value.permittedChannels.includes(value.preferredChannel)) {
    errors.push('preferredChannel must be included in permittedChannels.');
  }
  const supportedPolicies: readonly string[] = MESSAGING_GATEWAY_FEATURE_TEMPLATE.supportedAuthChannelPolicies;
  if (typeof value.authChannelPolicy !== 'string' || !supportedPolicies.includes(value.authChannelPolicy)) {
    errors.push('authChannelPolicy is not supported.');
  }
  if (value.providerAllocation !== undefined &&
      value.providerAllocation !== 'platform_shared' &&
      value.providerAllocation !== 'dedicated_tenant') {
    errors.push('providerAllocation must be platform_shared or dedicated_tenant.');
  }
  if (value.smsSenderName !== undefined && value.smsSenderName !== '') {
    if (typeof value.smsSenderName !== 'string' || !/^[A-Za-z0-9 .-]{3,11}$/.test(value.smsSenderName.trim())) {
      errors.push('smsSenderName must be 3-11 alphanumeric characters.');
    }
  }
  if (value.whatsappSenderNumber !== undefined && value.whatsappSenderNumber !== '') {
    if (typeof value.whatsappSenderNumber !== 'string' || !/^\+[1-9]\d{7,14}$/.test(value.whatsappSenderNumber.trim())) {
      errors.push('whatsappSenderNumber must be a valid E.164 phone number.');
    }
  }
  if (value.defaultLocale !== undefined &&
      (typeof value.defaultLocale !== 'string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(value.defaultLocale))) {
    errors.push('defaultLocale must be a valid BCP-47 language tag.');
  }
  if (value.jurisdiction !== undefined &&
      (typeof value.jurisdiction !== 'string' || !/^[A-Z]{2}$/.test(value.jurisdiction))) {
    errors.push('jurisdiction must be a two-letter ISO country code.');
  }
  const supportedCategories: readonly string[] = MESSAGING_GATEWAY_FEATURE_TEMPLATE.communicationCategories;
  if (value.enabledCategories !== undefined) {
    if (!Array.isArray(value.enabledCategories) ||
        value.enabledCategories.some(cat => typeof cat !== 'string' || !supportedCategories.includes(cat)) ||
        new Set(value.enabledCategories).size !== value.enabledCategories.length) {
      errors.push('enabledCategories must contain unique supported communication categories.');
    }
  }
  if (value.dailyQuota !== undefined && (!Number.isInteger(value.dailyQuota) || (value.dailyQuota as number) < 0 || (value.dailyQuota as number) > 1_000_000)) {
    errors.push('dailyQuota must be an integer between 0 and 1,000,000.');
  }
  if (value.monthlyQuota !== undefined && (!Number.isInteger(value.monthlyQuota) || (value.monthlyQuota as number) < 0 || (value.monthlyQuota as number) > 20_000_000)) {
    errors.push('monthlyQuota must be an integer between 0 and 20,000,000.');
  }
  if (typeof value.dailyQuota === 'number' && typeof value.monthlyQuota === 'number' && value.dailyQuota > value.monthlyQuota) {
    errors.push('dailyQuota cannot exceed monthlyQuota.');
  }
  if (value.shareTenantConfigWithFlow !== undefined && typeof value.shareTenantConfigWithFlow !== 'boolean') {
    errors.push('shareTenantConfigWithFlow must be a boolean.');
  }

  if (errors.length > 0) {
    return { valid: false, errors: [...new Set(errors)] };
  }

  return {
    valid: true,
    errors: [],
    settings: {
      smsEnabled: Boolean(value.smsEnabled),
      whatsappEnabled: Boolean(value.whatsappEnabled),
      authDeliveryEnabled: Boolean(value.authDeliveryEnabled),
      schoolCommsEnabled: Boolean(value.schoolCommsEnabled),
      permittedChannels: [...(value.permittedChannels as MessagingGatewayChannel[])],
      preferredChannel: value.preferredChannel as MessagingGatewayChannel,
      authChannelPolicy: value.authChannelPolicy as MessagingGatewayAuthPolicy,
      fallbackEnabled: value.fallbackEnabled === true,
      providerAllocation: (value.providerAllocation as 'platform_shared' | 'dedicated_tenant' | undefined) ?? 'platform_shared',
      ...(typeof value.smsSenderName === 'string' && value.smsSenderName.trim()
        ? { smsSenderName: value.smsSenderName.trim() }
        : {}),
      ...(typeof value.whatsappSenderNumber === 'string' && value.whatsappSenderNumber.trim()
        ? { whatsappSenderNumber: value.whatsappSenderNumber.trim() }
        : {}),
      defaultLocale: typeof value.defaultLocale === 'string' ? value.defaultLocale.trim().toLowerCase() : 'en',
      jurisdiction: typeof value.jurisdiction === 'string' ? value.jurisdiction.trim().toUpperCase() : 'NG',
      enabledCategories: Array.isArray(value.enabledCategories)
        ? [...(value.enabledCategories as string[])]
        : ['admissions', 'attendance', 'academics', 'fees', 'logistics', 'emergency', 'announcements'],
      dailyQuota: typeof value.dailyQuota === 'number' ? value.dailyQuota : 1000,
      monthlyQuota: typeof value.monthlyQuota === 'number' ? value.monthlyQuota : 20000,
      shareTenantConfigWithFlow: value.shareTenantConfigWithFlow !== false
    }
  };
}
