export type SchoolSettlementProvider = 'opay' | 'paystack' | 'flutterwave';

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
}
