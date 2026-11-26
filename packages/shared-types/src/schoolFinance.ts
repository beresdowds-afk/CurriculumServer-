export interface FeePolicyItem {
  name: string;
  category: 'tuition' | 'levy' | 'sundry' | 'elective';
  amountMinor: number;
  compulsory: boolean;
  grade: string | null;
  classId: string | null;
  residence: 'all' | 'day' | 'boarding';
}

export interface FeePolicyInput {
  academicSession: string;
  term: string;
  effectiveDate: string;
  currency: string;
  items: FeePolicyItem[];
}

export interface FeePolicyRecord {
  id: string;
  academic_session: string;
  term: string;
  version: number;
  effective_date: string;
  currency: string;
  items: FeePolicyItem[];
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_status?: 'pending_approval' | 'approved';
  superseded_at?: string | null;
  superseded_by?: string | null;
  superseded_by_policy_id?: string | null;
  supersession_action?: 'superseded' | 'retired' | null;
  supersession_reason?: string | null;
  is_currently_effective?: boolean;
}

export interface FeePolicySupersessionInput {
  action: 'superseded' | 'retired';
  supersededByPolicyId?: string | null;
  reason: string;
}

export interface EffectiveFeePolicyResolution {
  schoolId: string;
  academicSession: string;
  term: string;
  asOfDate: string;
  status: 'EFFECTIVE_POLICY_FOUND' | 'NO_EFFECTIVE_APPROVED_POLICY';
  effectivePolicy: FeePolicyRecord | null;
}
