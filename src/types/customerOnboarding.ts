import { DatabaseIsolationStrategy, StorageProviderType, StorageStrategyType } from './storageAndDatabase';
import { DeploymentTargetOption } from './iiapEngine';

export type UniversalInstanceType = 'full_school_management' | 'custom_architecture' | 'feature_collection';

export type SchoolCategory = 'secondary_school' | 'combined_school' | 'vocational_institution' | 'primary_basic';

export type ProvisionerRole = 'proprietor' | 'principal' | 'ict_technician';

export interface SchoolStaffAppointment {
  role: 'principal' | 'ict_technician';
  name: string;
  email: string;
  phone?: string;
  appointedByRole: 'proprietor' | 'principal';
  appointedByName: string;
  appointedAt: string;
  isAlsoIctTechnician?: boolean;
  status: 'active' | 'reassigned' | 'revoked';
  notes?: string;
}

export interface InstanceGovernanceHierarchy {
  provisionedByRole: 'proprietor' | 'principal';
  provisionerName: string;
  provisionerEmail: string;
  proprietor?: {
    name: string;
    email: string;
    phone?: string;
  };
  principal?: {
    name: string;
    email: string;
    phone?: string;
    appointedBy: 'proprietor' | 'self_provisioned';
    appointedAt: string;
    isAlsoIctTechnician: boolean;
  };
  ictTechnician?: {
    name: string;
    email: string;
    phone?: string;
    appointedBy: 'proprietor' | 'principal';
    appointedByName: string;
    appointedAt: string;
    isDualRoleWithPrincipal: boolean;
  };
  appointmentHistory: SchoolStaffAppointment[];
}

export interface CustomerOrganizationInfo {
  organizationName: string;
  registrationNumber: string; // CAC/RC
  organizationType: 'educational_institution' | 'training_center' | 'exam_body' | 'enterprise_consortium' | 'government_agency';
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  state: string;
  lga: string;
  country: string;
  website?: string;
  provisionerRole?: ProvisionerRole;
  proprietorName?: string;
  proprietorEmail?: string;
  proprietorPhone?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  isPrincipalAlsoIctTechnician?: boolean;
  ictTechnicianName?: string;
  ictTechnicianEmail?: string;
  ictTechnicianPhone?: string;
}

export interface CustomArchitectureSpec {
  applicationComponents: string[];
  existingSystems: string[];
  apiRequirements: {
    restEnabled: boolean;
    graphqlEnabled: boolean;
    webhooksEnabled: boolean;
    rateLimitTier: 'standard' | 'high_throughput' | 'unlimited';
  };
  databaseRequirements: {
    isolation: DatabaseIsolationStrategy;
    engine: 'PostgreSQL 16 LTS' | 'Cloud SQL Enterprise' | 'Customer Provided PostgreSQL';
    cmekRequired: boolean;
    pointInTimeRecovery: boolean;
  };
  authenticationRequirements: {
    authProvider: 'sovereign_jwt' | 'google_workspace_sso' | 'microsoft_entra_id' | 'saml2_federation';
    mfaEnforced: boolean;
  };
  storageRequirements: {
    strategy: StorageStrategyType;
    primaryProvider: StorageProviderType;
    retentionDays: number;
    encryptionAtRest: boolean;
  };
  networkingRequirements: {
    vpcPeering: boolean;
    staticEgressIp: boolean;
    cloudArmourDDoS: boolean;
  };
  domainRequirements: {
    domainType: 'subdomain' | 'custom_sch_ng' | 'custom_sovereign_tld';
    requestedDomain: string;
    sslManagedByPlatform: boolean;
  };
  integrationNotes?: string;
  requiresAdminReview: boolean;
  reviewStatus: 'pending_review' | 'approved' | 'changes_requested' | 'rejected';
  reviewNotes?: string;
}

export interface FeatureCollectionSpec {
  selectedFeatures: string[];
  primaryUseCase: 'examination_center' | 'tutorial_center' | 'learning_management' | 'student_registration' | 'reporting_analytics';
  dependencyValidation: {
    valid: boolean;
    missingDependencies: { feature: string; requires: string }[];
  };
}

export interface CommercialPaymentVerification {
  provider: 'paystack' | 'flutterwave' | 'opay' | 'interswitch' | 'bank_wire';
  transactionReference: string;
  amountNGN: number;
  paymentStatus: 'pending' | 'verified' | 'failed';
  verifiedAt?: string;
  gatewayResponse?: any;
  billingModel: 'monthly' | 'yearly' | 'lease_to_own';
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptNumber?: string;
}

export interface InstanceVerificationChecklist {
  databaseConnected: boolean;
  storageReady: boolean;
  securityProfileApplied: boolean;
  dnsProvisioned: boolean;
  healthPingPassed: boolean;
  allPassed: boolean;
}

export interface UniversalInstanceRecord {
  requestId: string;
  instanceId: string;
  tenantId: string;
  instanceType: UniversalInstanceType;
  organization: CustomerOrganizationInfo;
  applicationFamily: string;
  schoolCategory?: SchoolCategory;
  customArchitecture?: CustomArchitectureSpec;
  featureCollection?: FeatureCollectionSpec;
  architectureProfileId?: string;
  selectedModules: string[];
  databaseStrategy: DatabaseIsolationStrategy;
  storageStrategy: StorageStrategyType;
  storageProvider: StorageProviderType;
  subdomain: string;
  customDomain?: string;
  billingModel: 'monthly' | 'yearly' | 'lease_to_own';
  monthlyPriceNGN: number;
  payment: CommercialPaymentVerification;
  provisioningStatus: 'draft' | 'pending_review' | 'payment_pending' | 'provisioning' | 'provisioned' | 'activation_ready' | 'active' | 'rejected';
  verification: InstanceVerificationChecklist;
  activationToken?: string;
  activationUrl?: string;
  activationExpiresAt?: string;
  activatedAt?: string;
  governanceHierarchy?: InstanceGovernanceHierarchy;
  adminReviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureDependencyRule {
  key: string;
  name: string;
  category: string;
  requires: string[];
}
