/**
 * UNIFIED BACKEND CONNECTIVITY AND INTEGRATION CONTRACT (UBCIC)
 * Standard API contracts, Request/Response payloads, Error schemas, and Role contexts.
 */

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'SUPER_ADMIN_REQUIRED'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_SUSPENDED'
  | 'CROSS_TENANT_VIOLATION'
  | 'FEATURE_NOT_ENTITLED'
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface StandardApiErrorResponse {
  success: false;
  error: string;
  code: ApiErrorCode;
  status?: number;
  correlationId: string;
  timestamp: string;
  details?: any;
}

export interface StandardApiSuccessResponse<T> {
  success: true;
  data: T;
  correlationId: string;
  timestamp: string;
}

export type ApiResponse<T> = StandardApiSuccessResponse<T> | StandardApiErrorResponse;

// -------------------------------------------------------------
// CURRICULUM SERVER (CONTROL PLANE) CONTRACTS
// -------------------------------------------------------------

export interface ControlPlaneAuthLoginRequest {
  email: string;
  securityKey?: string;
}

export interface ControlPlaneAuthLoginResponse {
  token: string;
  expiresIn: number;
  user: {
    email: string;
    role: 'super_admin';
    name: string;
    permissions: string[];
  };
}

export interface PlatformOverviewMetricsResponse {
  monthlyRecurringRevenueNGN: number;
  annualRecurringRevenueNGN: number;
  totalProvisionedTenants: number;
  activeStudentsAcrossFleet: number;
  totalLeaseEquityPoolNGN: number;
  databaseHealth: 'healthy' | 'warning' | 'degraded';
  storageHealth: 'healthy' | 'warning' | 'degraded';
  activeInstances: {
    active: number;
    suspended: number;
    pending: number;
  };
  totalTenants?: number;
  activeTenants?: number;
  trialingTenants?: number;
  leaseToOwnTenants?: number;
  totalManagedStudents?: number;
  totalManagedFaculty?: number;
  globalUptimePercent?: number;
  platformVersion?: string;
}

export interface ProvisionInstanceApiRequest {
  schoolName: string;
  subdomain: string;
  state: string;
  lga: string;
  businessModel: 'monthly' | 'yearly' | 'lease_to_own';
  studentCapacity: number;
  principalName: string;
  principalEmail: string;
  principalPhone: string;
  enabledModules: string[];
  storageStrategy?: 'private_drive' | 'platform_storage' | 'hybrid';
  databaseStrategy?: 'shared_schema_isolated' | 'dedicated_database' | 'dedicated_customer_gcp_project';
}

export type ApplicationDeploymentArchitecture =
  | 'shared_database'
  | 'dedicated_database'
  | 'dedicated_infrastructure';

export interface ApplicationBuilderConfigurationV1 {
  schemaVersion: 1;
  contractVersion: 1;
  applicationId: string;
  applicationVersion: string;
  templates: Array<{ templateId: string; templateVersion: string }>;
  enabledCapabilities: string[];
  capabilityDependencies: Record<string, string[]>;
  centralServiceDependencies?: string[];
  configurationVersion: number;
  deploymentArchitecture: ApplicationDeploymentArchitecture;
  databaseStrategy: {
    engine: 'postgresql';
    isolation: ApplicationDeploymentArchitecture;
  };
  validationEvidence: {
    validatedAt: string;
    validator: 'application-configuration-contract';
    capabilityVersions: Record<string, string>;
    checks: string[];
  };
  featureConfigurations?: Record<string, {
    templateId: string;
    templateVersion: string;
    settings: Record<string, unknown>;
  }>;
}

export interface SchoolProvisioningRequest {
  school: {
    name: string;
    displayName: string;
    shortName: string;
    slug: string;
    schoolType: string;
    country: string;
    stateProvince: string;
    city: string;
    physicalAddress: string;
    officialContactEmail: string;
    telephone: string;
    website?: string;
    motto?: string;
    principalName?: string;
    principalEmail?: string;
    principalPhone?: string;
    ictAdministratorName?: string;
    ictAdministratorEmail?: string;
    ictAdministratorPhone?: string;
    logoUrl?: string;
    primaryBrandColor?: string;
    accentBrandColor?: string;
  };
  configuration: {
    timeZone: string;
    currency: string;
    language: string;
    academicSession: string;
    academicTermStructure: Array<{ name: string; startMonth?: number; endMonth?: number }>;
    educationLevels: string[];
    gradingConfiguration?: Record<string, unknown>;
  };
  administrator: {
    fullName: string;
    email: string;
  };
  applicationId: string;
  architecture: 'shared_database';
  templateId: string;
  templateVersion: string;
  enabledFeatures: string[];
  applicationConfiguration?: ApplicationBuilderConfigurationV1;
  featureOverrides?: Record<string, Record<string, unknown>>;
  commercial: {
    commercialModel: 'monthly' | 'annual' | 'lease_to_own';
    planReference: string;
    priceReference: string;
    currency: string;
    billingInterval: 'month' | 'year' | 'lease';
    agreedAmountMinor?: number;
  };
  deployment: {
    requestedSubdomain?: string;
    requestedCustomDomain?: string;
    applicationUrl?: string;
  };
}

export interface ApplicationInstanceConfigurationV1 extends ApplicationBuilderConfigurationV1 {
  tenantId: string;
  architecture: 'shared_database';
  template: { id: string; version: string };
  enabledFeatureIds: string[];
  featureDependencies: Record<string, string[]>;
  featureOverrides: Record<string, Record<string, unknown>>;
  schoolConfiguration: SchoolProvisioningRequest['configuration'];
  branding: {
    logoUrl?: string;
    primaryColor: string;
    accentColor: string;
  };
  deployment: SchoolProvisioningRequest['deployment'];
  provisioningStatus: 'ready' | 'pending';
}

export interface SchoolProvisioningConfirmation {
  operationId: string;
  schoolId: string;
  tenantId: string;
  instanceId: string;
  schoolName: string;
  instanceStatus:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'provisioning'
    | 'provisioning_failed'
    | 'provisioned'
    | 'configuration_pending'
    | 'ready_for_activation'
    | 'active'
    | 'suspended'
    | 'decommissioning'
    | 'decommissioned'
    | 'failed';
  provisioningStatus: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
  configurationReadiness: 'pending' | 'ready' | 'failed';
  applicationReadiness: 'pending' | 'ready' | 'failed';
  administratorActivationStatus:
    | 'invitation_sent'
    | 'delivery_pending'
    | 'activated'
    | 'expired'
    | 'revoked';
  invitationDeliveryStatus: 'pending' | 'sending' | 'delivered' | 'retryable_failure' | 'failed';
  deploymentStatus: 'not_required' | 'pending' | 'manual_action_required' | 'verified' | 'failed';
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  error?: { code: string; message: string; retryable: boolean };
}

export interface SchoolProvisioningOperationResponse {
  operationId: string;
  status: 'pending' | 'running' | 'retryable_failure' | 'failed' | 'ready';
  retryable: boolean;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error?: { code: string; message: string; retryable: boolean };
  provisioning?: SchoolProvisioningConfirmation;
}

export type SchoolPaymentProvider =
  | 'paystack'
  | 'flutterwave'
  | 'opay'
  | 'interswitch'
  | 'bank_transfer';

export type SchoolPaymentProviderOperation =
  | 'onboard'
  | 'rotate_credentials'
  | 'health_check'
  | 'suspend'
  | 'revoke';

/**
 * CIPA's approved, tenant-scoped handoff to the payment-provider job.
 * Provider secrets are referenced by Secret Manager resource name and are
 * never included in the provisioning contract.
 */
export interface SchoolPaymentProviderProvisioningContract {
  schemaVersion: 1;
  operationId: string;
  idempotencyKey: string;
  tenantId: string;
  schoolId: string;
  provider: SchoolPaymentProvider;
  operation: SchoolPaymentProviderOperation;
  credentialSecretVersion: string;
  approval: {
    status: 'approved';
    piamApprovalId: string;
    approverIdentity: string;
    approvedAt: string;
    expiresAt: string;
  };
  configuration: {
    merchantName: string;
    merchantEmail: string;
    webhookUrl: string;
    requestedCapabilities: string[];
    settlementAccountReference?: string;
    providerAccountReference?: string;
  };
}

export interface SchoolAdministratorLoginResponse {
  token: string;
  tenantId: string;
  schoolName: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'tenant_admin';
  };
}

export interface SchoolDetailsResponse {
  schoolId: string;
  tenantId: string;
  slug: string;
  name: string;
  shortName: string;
  displayName: string;
  schoolType: string;
  country: string;
  stateProvince: string;
  city: string;
  physicalAddress: string;
  officialContactEmail: string;
  telephone: string;
  website: string | null;
  motto: string | null;
  principalName: string | null;
  principalEmail: string | null;
  principalPhone: string | null;
  ictAdministratorName: string | null;
  ictAdministratorEmail: string | null;
  ictAdministratorPhone: string | null;
  logoUrl: string | null;
  primaryBrandColor: string;
  accentBrandColor: string;
  timeZone: string;
  currency: string;
  language: string;
  instance: {
    id: string;
    applicationId: string;
    applicationVersion: string | null;
    status: string;
    enabledFeatures: string[];
    createdAt: string;
    activatedAt: string | null;
  };
}

export interface SchoolMembershipResponse {
  tenantId: string;
  userId: string;
  email: string;
  role: 'tenant_admin';
  status: 'active';
}

export interface SchoolConfigurationResponse {
  timeZone: string;
  currency: string;
  language: string;
  academicSession: string;
  academicTermStructure: Array<{ name: string; startMonth?: number; endMonth?: number }>;
  educationLevels: string[];
  gradingConfiguration: Record<string, unknown>;
}

export interface SchoolStaffRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  user_id: string | null;
  department_id: string | null;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  designation: string;
  status: 'active' | 'on_leave' | 'suspended' | 'retired' | 'departed';
  staff_category?: 'teaching' | 'administrative' | 'support' | 'executive';
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'visiting';
  phone?: string | null;
  photo_url?: string | null;
  qualification?: string | null;
  certifications?: string[];
  trcn_number?: string | null;
  trcn_verified?: boolean;
  biometric_id?: string | null;
  max_periods_per_week?: number;
  hire_date?: string | null;
  separated_at?: string | null;
  separation_reason?: string | null;
  specialization_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolStaffPage {
  records: SchoolStaffRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreateSchoolStaffRequest {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  designation: string;
  departmentId?: string | null;
  staffCategory?: 'teaching' | 'administrative' | 'support' | 'executive';
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'visiting';
  phone?: string | null;
  photoUrl?: string | null;
  qualification?: string | null;
  certifications?: string[];
  trcnNumber?: string | null;
  trcnVerified?: boolean;
  biometricId?: string | null;
  maxPeriodsPerWeek?: number;
  hireDate?: string | null;
  specializationNotes?: string | null;
}

export type UpdateSchoolStaffRequest = Partial<CreateSchoolStaffRequest>;

export interface SchoolAdministrationStudent {
  id: string;
  tenant_id: string;
  school_id: string;
  class_id: string | null;
  admission_number: string;
  first_name: string;
  last_name: string;
  lifecycle_status:
    | 'applicant'
    | 'admitted'
    | 'enrolled'
    | 'active'
    | 'suspended'
    | 'transferred'
    | 'graduated'
    | 'withdrawn'
    | 'legacy_unverified';
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  nationality?: string | null;
  state_of_origin?: string | null;
  lga_of_origin?: string | null;
  residential_address?: string | null;
  previous_school_history?: Array<Record<string, unknown>>;
  academic_history_summary?: Record<string, unknown>;
  emergency_contacts?: Array<Record<string, unknown>>;
  photo_url?: string | null;
  rfid_card_uid?: string | null;
  digital_id_code?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSchoolStudentRequest {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  nationality?: string | null;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  residentialAddress?: string | null;
  previousSchoolHistory?: Array<Record<string, unknown>>;
  academicHistorySummary?: Record<string, unknown>;
  emergencyContacts?: Array<Record<string, unknown>>;
  photoUrl?: string | null;
  rfidCardUid?: string | null;
}

export type UpdateSchoolStudentRequest = Partial<CreateSchoolStudentRequest>;

export interface SchoolAdministrationClass {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  academic_year: string;
  section: string;
  status: 'active' | 'archived';
  class_teacher_staff_id: string | null;
  department_id?: string | null;
  academic_session_id?: string | null;
  grade_level?: string;
  arm?: string;
  room_number?: string;
  capacity?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateSchoolClassRequest {
  name: string;
  academicYear: string;
  section?: string;
  departmentId?: string | null;
  academicSessionId?: string | null;
  gradeLevel?: string;
  arm?: string;
  roomNumber?: string;
  capacity?: number;
  classTeacherStaffId?: string | null;
}

export type UpdateSchoolClassRequest = Partial<CreateSchoolClassRequest> & {
  status?: 'active' | 'archived';
};

// -------------------------------------------------------------
// CURRICULUM FLOW (SCHOOL ERP) CONTRACTS
// -------------------------------------------------------------

export interface SchoolFlowAuthLoginRequest {
  tenantId: string;
  usernameOrEmail: string;
  password?: string;
  roleHint?: string;
}

export interface SchoolFlowAuthLoginResponse {
  token: string;
  tenantId: string;
  schoolName: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    title: string;
    avatar: string;
    permissions: string[];
  };
  entitlements: {
    features: string[];
    studentCapacity: number;
    planTier: string;
    status: 'ACTIVE' | 'SUSPENDED';
  };
}

export interface SchoolInstanceProfileResponse {
  tenantId: string;
  appId: string;
  schoolName: string;
  tagline: string;
  subdomain: string;
  domain: string;
  principalName: string;
  studentCapacity: number;
  enrolledStudentsCount: number;
  facultyCount: number;
  enabledFeatures: Record<string, boolean>;
  storageStrategy: string;
  databaseIsolation: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SchoolStudentSummary {
  id: string;
  tenantId: string;
  admissionNumber: string;
  fullName?: string;
  classGrade?: string;
  classGroup?: string | null;
  gender?: string;
  parentName?: string;
  parentPhone?: string;
  status?: 'Active' | 'Withdrawn' | 'Graduated';
  feeStatus?: 'Paid' | 'Partial' | 'Pending';
}

export interface SchoolAttendanceRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  classGrade: string;
  date: string;
  status: 'Present' | 'Late' | 'Absent';
  method: 'RFID_GATE' | 'MANUAL_ROLLCALL' | 'BIOMETRIC_KIOSK';
  timestamp: string;
}

// -------------------------------------------------------------
// SHARED COMMON CONTRACTS
// -------------------------------------------------------------

export interface SystemHealthCheckResponse {
  status: 'ok' | 'degraded';
  platform: string;
  version: string;
  database: 'connected_postgresql';
  storage: 'operational';
  auth: 'active';
  timestamp: string;
}

// -------------------------------------------------------------
// PHASE 8: UNIVERSAL ONBOARDING & PAYMENT VERIFICATION CONTRACTS
// -------------------------------------------------------------

export interface FeatureDependencyValidationRequest {
  selectedFeatures: string[];
}

export interface FeatureDependencyValidationResponse {
  valid: boolean;
  missingDependencies: {
    feature: string;
    featureName: string;
    requires: string;
    requiredName: string;
  }[];
}

export interface PaymentInitializationRequest {
  provider: 'paystack' | 'opay';
  amountNGN: number;
  customerEmail: string;
  customerName: string;
  instanceType: string;
  billingModel: 'monthly' | 'yearly' | 'lease_to_own';
}

export interface PaymentInitializationResponse {
  provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch';
  reference: string;
  authorizationUrl: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  status: 'pending';
}

export interface PaymentVerificationRequest {
  provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch';
  reference: string;
  providerTransactionId?: string;
}

export interface PaymentVerificationResponse {
  status: 'settled' | 'failed' | 'pending';
  alreadyProcessed?: boolean;
  receiptNumber?: string;
  auditReference?: string;
}

export interface InstanceActivationResponse {
  success: boolean;
  instanceId: string;
  tenantId: string;
  status: 'active';
  activationUrl: string;
  activationToken: string;
  expiresAt: string;
  verificationReport: {
    databaseConnected: boolean;
    storageReady: boolean;
    securityProfileApplied: boolean;
    dnsProvisioned: boolean;
    healthPingPassed: boolean;
    allPassed: boolean;
  };
}

export interface ReviewInstanceRequestPayload {
  approved: boolean;
  adminNotes: string;
  reviewerEmail: string;
}

// -------------------------------------------------------------
// PROMPT 1: SCHOOL ADMINISTRATION, IDENTITY, STUDENT LIFECYCLE,
// GUARDIANS, CENTRAL IAM & PROVISIONING CONTRACTS
// -------------------------------------------------------------

export type SchoolOwnershipType =
  | 'public'
  | 'private'
  | 'mission'
  | 'federal'
  | 'state'
  | 'international'
  | 'community';

export type SchoolInstitutionalStatus =
  | 'pending_activation'
  | 'active'
  | 'suspended'
  | 'decommissioned';

export interface SchoolInstitutionalIdentity extends SchoolDetailsResponse {
  legalName: string;
  registeredIdentity: string | null;
  ownership: SchoolOwnershipType;
  educationalClassification: string;
  administrativeAddress: string | null;
  postalCode: string | null;
  operationalPolicies: Record<string, unknown>;
  institutionalStatus: SchoolInstitutionalStatus;
  activatedAt: string | null;
}

export interface UpdateSchoolProfileRequest {
  name?: string;
  shortName?: string;
  legalName?: string;
  registeredIdentity?: string | null;
  schoolType?: string;
  ownership?: SchoolOwnershipType;
  educationalClassification?: string;
  country?: string;
  stateProvince?: string;
  city?: string;
  physicalAddress?: string;
  administrativeAddress?: string | null;
  postalCode?: string | null;
  officialContactEmail?: string;
  telephone?: string;
  website?: string | null;
  motto?: string | null;
  principalName?: string | null;
  principalEmail?: string | null;
  principalPhone?: string | null;
  ictAdministratorName?: string | null;
  ictAdministratorEmail?: string | null;
  ictAdministratorPhone?: string | null;
  logoUrl?: string | null;
  primaryBrandColor?: string;
  accentBrandColor?: string;
  operationalPolicies?: Record<string, unknown>;
}

export interface SchoolStatusTransitionRequest {
  toStatus: SchoolInstitutionalStatus;
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface SchoolStatusHistoryRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  from_status: string | null;
  to_status: SchoolInstitutionalStatus;
  reason: string;
  changed_by: string;
  evidence: Record<string, unknown>;
  occurred_at: string;
}

export interface SchoolDepartmentRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  name: string;
  code: string | null;
  unit_type: 'academic' | 'administrative' | 'support' | 'faculty';
  parent_department_id: string | null;
  head_staff_id: string | null;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code?: string | null;
  unitType?: 'academic' | 'administrative' | 'support' | 'faculty';
  parentDepartmentId?: string | null;
  headStaffId?: string | null;
  description?: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest> & {
  status?: 'active' | 'inactive';
};

export interface AcademicTermRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  session_id: string;
  term_order: number;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface AcademicSessionRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  session_code: string;
  display_name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  terms: AcademicTermRecord[];
}

export interface CreateAcademicSessionRequest {
  sessionCode: string;
  displayName: string;
  startsOn: string;
  endsOn: string;
}

export interface CreateAcademicTermRequest {
  termOrder: number;
  name: string;
  startsOn: string;
  endsOn: string;
}

export type AdmissionApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'waitlisted'
  | 'approved'
  | 'rejected'
  | 'enrolled';

export interface StudentAdmissionRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  application_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  target_grade_level: string;
  target_class_id: string | null;
  academic_session_id: string | null;
  previous_school_name: string | null;
  previous_class: string | null;
  guardian_summary: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  review_notes: string | null;
  status: AdmissionApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  enrolled_student_id: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentAdmissionRequest {
  applicationNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  targetGradeLevel: string;
  targetClassId?: string | null;
  academicSessionId?: string | null;
  previousSchoolName?: string | null;
  previousClass?: string | null;
  guardianSummary?: Record<string, unknown>;
  documents?: Array<Record<string, unknown>>;
}

export interface ReviewAdmissionRequest {
  decision: 'under_review' | 'waitlisted' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface EnrollAdmissionRequest {
  admissionNumber: string;
  classId?: string | null;
}

export interface StudentMedicalProfileRecord {
  tenant_id: string;
  school_id: string;
  student_id: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown' | null;
  genotype: 'AA' | 'AS' | 'SS' | 'AC' | 'SC' | 'unknown' | null;
  allergies: string[];
  chronic_conditions: string[];
  immunization_summary: Record<string, unknown>;
  dietary_restrictions: string[];
  physician_name: string | null;
  physician_phone: string | null;
  medical_notes: string | null;
  consent_for_emergency_care: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertStudentMedicalProfileRequest {
  bloodGroup?: StudentMedicalProfileRecord['blood_group'];
  genotype?: StudentMedicalProfileRecord['genotype'];
  allergies?: string[];
  chronicConditions?: string[];
  immunizationSummary?: Record<string, unknown>;
  dietaryRestrictions?: string[];
  physicianName?: string | null;
  physicianPhone?: string | null;
  medicalNotes?: string | null;
  consentForEmergencyCare?: boolean;
}

export interface StudentDigitalIdCardRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id: string;
  card_number: string;
  issued_by: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface IssueDigitalIdCardResponse {
  card: StudentDigitalIdCardRecord;
  qrToken: string;
}

export interface GuardianRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  occupation: string | null;
  residential_address: string | null;
  identity_document_type: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  verified_by: string | null;
  verified_at: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface StudentGuardianLinkRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  student_id: string;
  guardian_id: string;
  relationship_type: 'mother' | 'father' | 'legal_guardian' | 'sponsor' | 'sibling' | 'other';
  is_primary: boolean;
  is_financial_sponsor: boolean;
  is_emergency_contact: boolean;
  authorized_pickup: boolean;
  can_view_academic_records: boolean;
  can_view_medical_summary: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateGuardianRequest {
  fullName: string;
  phone: string;
  email?: string | null;
  alternatePhone?: string | null;
  occupation?: string | null;
  residentialAddress?: string | null;
  identityDocumentType?: string | null;
  userId?: string | null;
}

export type UpdateGuardianRequest = Partial<CreateGuardianRequest> & {
  status?: 'active' | 'inactive';
};

export interface LinkStudentGuardianRequest {
  studentId: string;
  relationshipType: StudentGuardianLinkRecord['relationship_type'];
  isPrimary?: boolean;
  isFinancialSponsor?: boolean;
  isEmergencyContact?: boolean;
  authorizedPickup?: boolean;
  canViewAcademicRecords?: boolean;
  canViewMedicalSummary?: boolean;
}

export interface GuardianWardSummary {
  student: SchoolAdministrationStudent;
  relationshipType: StudentGuardianLinkRecord['relationship_type'];
  isPrimary: boolean;
  canViewAcademicRecords: boolean;
  canViewMedicalSummary: boolean;
}

export interface StaffSubjectAllocationRecord {
  id: string;
  tenant_id: string;
  school_id: string;
  staff_id: string;
  academic_session_id: string | null;
  subject_code: string;
  subject_name: string;
  class_id: string | null;
  periods_per_week: number;
  status: 'active' | 'ended';
  assigned_by: string | null;
  assigned_at: string;
  ended_at: string | null;
}

export interface AllocateStaffSubjectRequest {
  subjectCode: string;
  subjectName: string;
  classId?: string | null;
  academicSessionId?: string | null;
  periodsPerWeek?: number;
}

export interface StaffStatusTransitionRequest {
  toStatus: 'active' | 'on_leave' | 'suspended' | 'retired' | 'departed';
  reason: string;
}

export interface IamRoleDefinition {
  code: string;
  description: string;
  systemRole: boolean;
  permissions: string[];
}

export interface IamMembershipRecord {
  userId: string;
  userSubject: string;
  email: string;
  fullName: string;
  accountStatus: string;
  membershipStatus: string;
  primaryRole: string;
  assignedRoles: string[];
  createdAt: string;
}

export interface IamMemberInvitationRecord {
  id: string;
  tenantId: string;
  schoolId: string;
  fullName: string;
  email: string;
  intendedRoleCode: string;
  departmentId: string | null;
  staffId: string | null;
  guardianId: string | null;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateMemberInvitationRequest {
  fullName: string;
  email: string;
  intendedRoleCode: string;
  departmentId?: string | null;
  staffId?: string | null;
  guardianId?: string | null;
  expiresInHours?: number;
}

export interface IamSessionRecord {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  authMethod: string;
  mfaVerifiedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface IamAuditEventRecord {
  id: string;
  actorSubject: string;
  action: string;
  details: Record<string, unknown>;
  occurredAt: string;
}

export interface MfaFactorSummary {
  id: string;
  factorType: 'totp';
  friendlyName: string;
  status: 'pending' | 'verified' | 'disabled';
  createdAt: string;
  verifiedAt: string | null;
  lastUsedAt: string | null;
}

export interface ProvisioningWorkflowStepRecord {
  id: string;
  operationId: string;
  tenantId: string | null;
  schoolId: string | null;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  details: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ApplicationTemplateRecord {
  templateId: string;
  templateVersion: string;
  displayName: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'deprecated';
  provisionable: boolean;
  capabilities: string[];
  defaultFeatures: string[];
  configurationSchema: Record<string, unknown>;
  defaultConfiguration: Record<string, unknown>;
  upgradeCompatibility: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolMfaChallengeResponse {
  mfaRequired: true;
  challengeId: string;
  challengeToken: string;
  expiresAt: string;
  tenantId: string;
  schoolName: string;
}

export interface MemberInvitationPreviewResponse {
  id: string;
  tenantId: string;
  schoolId: string;
  schoolName: string;
  fullName: string;
  email: string;
  intendedRoleCode: string;
  status: string;
  expiresAt: string;
}

export interface AcceptMemberInvitationResponse {
  tenantId: string;
  schoolId: string;
  userId: string;
  email: string;
  roleCode: string;
  status: 'active';
}
