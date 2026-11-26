export type SchoolSettlementProvider = 'opay' | 'paystack' | 'flutterwave';

export type SchoolSettlementLifecycleState =
  | 'pending_proprietor_approval'
  | 'approved_awaiting_verification'
  | 'verification_in_progress'
  | 'verified'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'revoked'
  | 'replaced';

export interface SchoolSettlementDetails {
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
}

export interface SchoolSettlementRequest {
  id: string;
  provider: SchoolSettlementProvider;
  account_last_four: string;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  state?: SchoolSettlementLifecycleState;
  is_default?: boolean;
  replaced_by_request_id?: string | null;
  verified_account_name?: string | null;
  verification_provider_status?: string | null;
  has_provider_reference?: boolean;
  last_error_code?: string | null;
  last_error_message?: string | null;
  verified_at?: string | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  revoked_at?: string | null;
  rejected_at?: string | null;
  replaced_at?: string | null;
}

export interface SchoolSettlementEvent {
  id: string;
  request_id: string;
  event_type: string;
  from_state: string | null;
  to_state: string;
  actor_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
