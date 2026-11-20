export const SCHOOL_FINANCE_FEATURE_TEMPLATE = {
  templateId: 'school-finance',
  templateVersion: '0.1.0',
  featureId: 'feat_bursary_billing',
  applicationId: 'app_curriculum_flow',
  status: 'draft',
  provisionable: false,
  financialDomain: 'school',
  supportedProviders: ['opay', 'paystack', 'flutterwave'],
  requestedCapabilities: ['fee_collection', 'invoicing', 'accounting', 'payroll', 'reporting'],
  settlementAccountApproval: {
    proposalRole: 'principal',
    approvalRole: 'proprietor',
    proprietorApprovalRequired: true,
    providerVerificationRequired: true
  },
  provisioningRequirements: [
    'tenant_scoped_school_finance_storage_and_authorization',
    'principal_proposal_and_proprietor_approval_of_settlement_account',
    'verified_school_provider_accounts_and_tenant_specific_credentials',
    'verified_provider_webhooks_and_idempotent_settlement_reconciliation',
    'student_invoices_and_balanced_immutable_ledger',
    'authorized_payroll_and_disbursements',
    'reports_derived_from_persisted_financial_records',
    'provider_sandbox_and_end_to_end_financial_acceptance',
    'production_capability_gate_and_runtime_readiness'
  ]
} as const;

export interface SchoolFinanceTemplateSettings {
  requestedProviders: Array<(typeof SCHOOL_FINANCE_FEATURE_TEMPLATE.supportedProviders)[number]>;
  requestedCapabilities: Array<(typeof SCHOOL_FINANCE_FEATURE_TEMPLATE.requestedCapabilities)[number]>;
  proprietorApprovalRequired: true;
}

/**
 * Settings express intent only. Bank details and provider secrets are not
 * application configuration and must never be embedded in this template.
 */
export function validateSchoolFinanceTemplateSettings(
  input: unknown
): { valid: boolean; errors: string[]; settings?: SchoolFinanceTemplateSettings } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['School finance settings must be an object.'] };
  }
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  const allowed = ['requestedProviders', 'requestedCapabilities', 'proprietorApprovalRequired'];
  if (Object.keys(value).some(key => !allowed.includes(key))) {
    errors.push('School finance settings contain unsupported fields; account details and secrets are not permitted.');
  }
  const providers: readonly string[] = SCHOOL_FINANCE_FEATURE_TEMPLATE.supportedProviders;
  const capabilities: readonly string[] = SCHOOL_FINANCE_FEATURE_TEMPLATE.requestedCapabilities;
  if (!Array.isArray(value.requestedProviders) ||
      value.requestedProviders.some(item => typeof item !== 'string' || !providers.includes(item)) ||
      new Set(value.requestedProviders).size !== value.requestedProviders.length) {
    errors.push('Requested providers must be unique supported school payment providers.');
  }
  if (!Array.isArray(value.requestedCapabilities) ||
      value.requestedCapabilities.some(item => typeof item !== 'string' || !capabilities.includes(item)) ||
      new Set(value.requestedCapabilities).size !== value.requestedCapabilities.length) {
    errors.push('Requested capabilities must be unique supported school finance capabilities.');
  }
  if (value.proprietorApprovalRequired !== true) {
    errors.push('Proprietor approval is required for every school settlement account.');
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    settings: {
      requestedProviders: [...value.requestedProviders as SchoolFinanceTemplateSettings['requestedProviders']],
      requestedCapabilities: [...value.requestedCapabilities as SchoolFinanceTemplateSettings['requestedCapabilities']],
      proprietorApprovalRequired: true
    }
  };
}
