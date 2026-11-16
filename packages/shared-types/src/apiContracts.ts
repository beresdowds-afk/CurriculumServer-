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

export interface ApplicationInstanceConfigurationV1 {
  schemaVersion: 1;
  applicationId: string;
  applicationVersion: string;
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
  configurationVersion: number;
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
  provider: 'paystack' | 'opay';
  reference: string;
  authorizationUrl: string;
  amountNGN: number;
  checkoutParameters: Record<string, string>;
}

export interface PaymentVerificationRequest {
  provider: 'paystack' | 'opay';
  reference: string;
  amountNGN: number;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  provider: 'paystack' | 'opay';
  reference: string;
  amountNGN: number;
  paidAt: string;
  channel: string;
  gatewayResponse: string;
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

