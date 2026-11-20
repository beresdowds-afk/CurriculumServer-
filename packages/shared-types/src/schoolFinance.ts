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
}
