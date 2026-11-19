import React, { useState, useEffect } from 'react';
import { 
  UniversalInstanceType, 
  SchoolCategory, 
  CustomerOrganizationInfo,
  CustomArchitectureSpec,
  FeatureCollectionSpec,
  UniversalInstanceRecord
} from '../types/customerOnboarding';
import { customerOnboardingClient, CLIENT_FEATURE_DEPENDENCIES } from '../services/customerOnboardingClient';
import { VerificationCheckStatus } from '../types/customerOnboarding';
import { DeploymentTargetOption } from '../types/iiapEngine';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  Layers, 
  Sliders, 
  Database, 
  HardDrive, 
  Globe, 
  CreditCard, 
  Cpu, 
  ShieldCheck, 
  Shield,
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  Lock, 
  DollarSign, 
  FileText, 
  RefreshCw,
  Zap,
  Info,
  Terminal,
  Server
} from 'lucide-react';

interface UniversalCustomerOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (instance: UniversalInstanceRecord) => void;
}

export const UniversalCustomerOnboardingWizard: React.FC<UniversalCustomerOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Current Stage (1 to 11)
  const [stage, setStage] = useState<number>(1);

  // Stage 1: Organization & Identity
  const [orgInfo, setOrgInfo] = useState<CustomerOrganizationInfo>({
    organizationName: 'Lekki Metropolitan High School',
    registrationNumber: 'RC-8849201',
    organizationType: 'educational_institution',
    contactPersonName: 'Chief (Dr.) Olusegun Bakare',
    contactEmail: 'proprietor@lekkimetroschool.sch.ng',
    contactPhone: '+234 803 555 7788',
    address: 'Plot 8 Admiralty Way, Lekki Phase 1',
    state: 'Lagos State',
    lga: 'Eti-Osa',
    country: 'Nigeria',
    website: 'https://lekkimetroschool.sch.ng',
    provisionerRole: 'proprietor',
    proprietorName: 'Chief (Dr.) Olusegun Bakare',
    proprietorEmail: 'proprietor@lekkimetroschool.sch.ng',
    proprietorPhone: '+234 803 555 7788',
    principalName: 'Dr. (Mrs.) Folashade Adeleke',
    principalEmail: 'principal@lekkimetroschool.sch.ng',
    principalPhone: '+234 802 111 4455',
    isPrincipalAlsoIctTechnician: false,
    ictTechnicianName: 'Engr. Dapo Alabi',
    ictTechnicianEmail: 'ict@lekkimetroschool.sch.ng',
    ictTechnicianPhone: '+234 809 222 3344'
  });

  // Stage 2: Instance Type
  const [instanceType, setInstanceType] = useState<UniversalInstanceType>('full_school_management');

  // Stage 3: Application Family & Category
  const [schoolCategory, setSchoolCategory] = useState<SchoolCategory>('secondary_school');
  const [appFamilyName, setAppFamilyName] = useState('Curriculum Flow Enterprise Suite');

  // Stage 4: Feature & Module Selection
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'curriculum_catalog',
    'lesson_plans',
    'lesson_approval_chain',
    'question_bank',
    'cbt_examination',
    'student_registers',
    'timetable_scheduling'
  ]);
  const [dependencyIssues, setDependencyIssues] = useState<{ feature: string; featureName: string; requires: string; requiredName: string }[]>([]);

  // Stage 5: Deployment & Architecture Requirements
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTargetOption>('dedicated_cloud_run_service');
  const [createProject, setCreateProject] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [parentResourceType, setParentResourceType] = useState<'organization' | 'folder'>('organization');
  const [parentResourceId, setParentResourceId] = useState('');
  const [cpuAllocation, setCpuAllocation] = useState('2.0 vCPU');
  const [memoryAllocation, setMemoryAllocation] = useState('4 GiB RAM');
  const [highAvailability, setHighAvailability] = useState(true);

  // Stage 6: Database & Storage Preferences (Phase 7 Compliant)
  const [databaseStrategy, setDatabaseStrategy] = useState<'shared_schema_isolated' | 'dedicated_database' | 'dedicated_customer_gcp_project'>('dedicated_database');
  const [storageStrategy, setStorageStrategy] = useState<'platform_storage' | 'private_drive' | 'hybrid'>('hybrid');
  const [storageProvider, setStorageProvider] = useState<'google_cloud_storage' | 'google_drive' | 'onedrive'>('google_drive');
  const [cmekEnabled, setCmekEnabled] = useState(true);

  // Stage 7: Domain & Integration Requirements
  const [subdomain, setSubdomain] = useState('lekkimetro');
  const [customDomain, setCustomDomain] = useState('portal.lekkimetroschool.sch.ng');
  const [sslManaged, setSslManaged] = useState(true);
  const [apiWebhooksEnabled, setApiWebhooksEnabled] = useState(true);

  // Stage 8: Architecture Recommendation & Cost Estimate (IIAPE)
  const [estimatedCostNGN, setEstimatedCostNGN] = useState<number>(250000);
  const [iiapeRationale, setIiapeRationale] = useState(
    'No backend architecture assessment has been received. The selected target is a request preference, not an approved or executable plan.'
  );

  // Stage 9: Commercial Agreement & Payment Verification
  const [billingModel, setBillingModel] = useState<'monthly' | 'yearly' | 'lease_to_own'>('yearly');
  const [paymentProvider, setPaymentProvider] = useState<'paystack' | 'opay'>('paystack');
  const [paymentReference, setPaymentReference] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Stage 10: Technical Approval & Provisioning
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningDone, setProvisioningDone] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [createdInstance, setCreatedInstance] = useState<UniversalInstanceRecord | null>(null);

  // Stage 11: Instance Verification & Activation
  const [isActivating, setIsActivating] = useState(false);
  const [activationData, setActivationData] = useState<{
    activationUrl: string;
    activationToken: string;
    expiresAt: string;
  } | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submissionKey] = useState(() => globalThis.crypto?.randomUUID?.() || `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Live dependency validation on feature selection change
  useEffect(() => {
    const res = customerOnboardingClient.validateFeatureDependenciesClient(selectedFeatures);
    setDependencyIssues(res.missingDependencies);
  }, [selectedFeatures]);

  // Dynamic cost calculation based on instance type and selections
  useEffect(() => {
    let base = 250000;
    if (instanceType === 'full_school_management') {
      base = billingModel === 'yearly' ? 200000 : billingModel === 'lease_to_own' ? 350000 : 250000;
    } else if (instanceType === 'custom_architecture') {
      base = 650000;
      if (databaseStrategy === 'dedicated_customer_gcp_project') base += 200000;
    } else {
      // Feature collection
      base = selectedFeatures.length * 25000;
    }
    setEstimatedCostNGN(base);

    setIiapeRationale('No backend architecture assessment has been received. The selected deployment target and configuration remain a customer request, not an approved or executable plan.');
  }, [instanceType, selectedFeatures, billingModel, databaseStrategy]);

  if (!isOpen) return null;

  const toggleFeature = (featKey: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featKey) ? prev.filter(k => k !== featKey) : [...prev, featKey]
    );
  };

  const autoFixDependencies = () => {
    const requiredToAdd = dependencyIssues.map(d => d.requires);
    setSelectedFeatures(prev => Array.from(new Set([...prev, ...requiredToAdd])));
  };

  const getErrorMessage = (error: unknown) => {
    const failure = error as { error?: string; message?: string; status?: number; correlationId?: string } | null;
    const message = failure?.error || failure?.message || 'The request could not be completed.';
    return `${failure?.status ? `HTTP ${failure.status}: ` : ''}${message}${failure?.correlationId ? ` (correlation ID: ${failure.correlationId})` : ''}`;
  };

  const getProvisioningStatusLabel = () => {
    if (activationData) return 'Instance activated';
    if (provisioningDone) return 'Provisioning verified';
    if (isProvisioning) return 'Provisioning in progress';
    if (createdInstance?.provisioningStatus === 'pending_review') return 'Awaiting approval';
    if (createdInstance?.provisioningStatus === 'blocked') return 'Provisioning blocked';
    if (createdInstance?.provisioningStatus === 'failed') return 'Provisioning failed';
    if (createdInstance) return 'Request received';
    return 'Request not submitted';
  };

  const createRequestPayload = () => ({
    instanceType,
    organization: orgInfo,
    schoolCategory: instanceType === 'full_school_management' ? schoolCategory : undefined,
    customArchitecture: instanceType === 'custom_architecture' ? {
      applicationComponents: ['Curriculum Core API', 'Custom LMS Shard', 'Parent Gateway'],
      existingSystems: ['Legacy SMS'],
      apiRequirements: { restEnabled: true, graphqlEnabled: true, webhooksEnabled: apiWebhooksEnabled, rateLimitTier: 'high_throughput' as const },
      databaseRequirements: { isolation: databaseStrategy, engine: 'PostgreSQL 16 LTS' as const, cmekRequired: cmekEnabled, pointInTimeRecovery: true },
      authenticationRequirements: { authProvider: 'sovereign_jwt' as const, mfaEnforced: true },
      storageRequirements: { strategy: storageStrategy, primaryProvider: storageProvider, retentionDays: 2555, encryptionAtRest: true },
      networkingRequirements: { vpcPeering: true, staticEgressIp: true, cloudArmourDDoS: true },
      domainRequirements: { domainType: customDomain ? 'custom_sch_ng' as const : 'subdomain' as const, requestedDomain: customDomain || `${subdomain}.curriculumflow.com.ng`, sslManagedByPlatform: sslManaged },
      requiresAdminReview: true,
      reviewStatus: 'pending_review' as const
    } : undefined,
    featureCollection: instanceType === 'feature_collection' ? {
      primaryUseCase: 'examination_center' as const,
      selectedFeatures,
      dependencyValidation: { valid: dependencyIssues.length === 0, missingDependencies: dependencyIssues }
    } : undefined,
    selectedModules: selectedFeatures,
    databaseStrategy,
    storageStrategy,
    storageProvider,
    deploymentTarget,
    createProject: deploymentTarget === 'dedicated_gcp_project' && createProject,
    projectId: deploymentTarget === 'dedicated_gcp_project' ? projectId : undefined,
    parentOrganizationId: deploymentTarget === 'dedicated_gcp_project' && parentResourceType === 'organization' ? parentResourceId : undefined,
    parentFolderId: deploymentTarget === 'dedicated_gcp_project' && parentResourceType === 'folder' ? parentResourceId : undefined,
    idempotencyKey: submissionKey,
    subdomain,
    customDomain,
    billingModel,
    monthlyPriceNGN: estimatedCostNGN,
    paymentProvider,
    paymentReference,
    amountPaidNGN: billingModel === 'yearly' ? estimatedCostNGN * 12 * 0.9 : estimatedCostNGN
  });

  const handleVerifyPayment = async () => {
    if (!paymentReference.trim()) {
      setPaymentError('Enter the transaction reference returned by your payment provider.');
      return;
    }
    if (deploymentTarget === 'dedicated_gcp_project' && (!createProject || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || !/^\d+$/.test(parentResourceId))) {
      setPaymentError('Dedicated project requests require explicit project-creation consent, a valid project ID, and a numeric organization or folder ID.');
      return;
    }
    setIsVerifyingPayment(true);
    setPaymentError(null);
    try {
      const request = createdInstance || await customerOnboardingClient.submitInstanceRequest(createRequestPayload());
      setCreatedInstance(request);
      const amountToPay = billingModel === 'yearly' ? estimatedCostNGN * 12 * 0.9 : estimatedCostNGN;
      const res = await customerOnboardingClient.verifyPayment(
        request.instanceId,
        paymentReference,
        paymentProvider,
        amountToPay
      );
      if (res.status === 'settled') {
        setPaymentVerified(true);
      } else {
        setPaymentError(`Payment is ${res.status}; provisioning remains blocked until provider settlement is verified.`);
      }
    } catch (error) {
      setPaymentError(getErrorMessage(error));
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleExecuteProvisioning = async () => {
    if (!createdInstance) {
      setProvisioningError('Submit the onboarding request before provisioning.');
      return;
    }
    setIsProvisioning(true);
    setProvisioningError(null);
    try {
      const record = await customerOnboardingClient.provisionInstance(createdInstance.instanceId);
      setCreatedInstance(record);
      setProvisioningDone(record.provisioningStatus === 'verified');
      if (record.provisioningStatus !== 'verified') {
        setProvisioningError(record.provisioningFailure?.message || 'Provisioning did not return independently verified infrastructure evidence.');
      }
    } catch (error) {
      setProvisioningError(getErrorMessage(error));
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleActivateInstance = async () => {
    setIsActivating(true);
    setActivationError(null);
    try {
      if (!createdInstance || !provisioningDone) {
        throw new Error('Activation is blocked until provisioning and independent verification succeed.');
      }
      const instId = createdInstance.instanceId;
      const res = await customerOnboardingClient.activateInstance(instId);
      if (res.success) {
        setActivationData({
          activationUrl: res.activationUrl,
          activationToken: res.activationToken,
          expiresAt: res.expiresAt
        });
        onSuccess?.(createdInstance);
      }
    } catch (error) {
      setActivationError(getErrorMessage(error));
    } finally {
      setIsActivating(false);
    }
  };

  const copyActivationLink = () => {
    if (activationData?.activationUrl) {
      navigator.clipboard.writeText(activationData.activationUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const verificationChecks: { label: string; status: VerificationCheckStatus }[] = [
    { label: 'PostgreSQL Relational Shard Ping', status: createdInstance?.verification.databaseConnected ?? 'unknown' },
    { label: 'Customer Storage Read/Write Readiness', status: createdInstance?.verification.storageReady ?? 'unknown' },
    { label: 'Security Profile', status: createdInstance?.verification.securityProfileApplied ?? 'unknown' },
    { label: 'Cloud DNS & Subdomain Routing', status: createdInstance?.verification.dnsProvisioned ?? 'unknown' },
    { label: 'Infrastructure Health Ping', status: createdInstance?.verification.healthPingPassed ?? 'unknown' }
  ];

  const STAGE_TITLES = [
    'Organization Identity',
    'Instance Type',
    'Application Family',
    'Features & Modules',
    'Deployment Architecture',
    'Database & Storage',
    'Domain & Integration',
    'Architecture Assessment',
    'Payment Verification',
    'Approval & Provisioning',
    'Verification & Activation'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-scaleUp">
        
        {/* Top Header Banner */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono text-[10px] font-bold uppercase tracking-wider">
                Phase 8 Architecture
              </span>
              <span className="text-xs text-slate-400">Universal Onboarding Wizard</span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Stage {stage} of 11: {STAGE_TITLES[stage - 1]}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="w-full bg-slate-950 h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(stage / 11) * 100}%` }}
          />
        </div>

        {/* Stage Content Container */}
        <div className="p-6 max-h-[68vh] overflow-y-auto no-scrollbar space-y-6 text-slate-200">

          {/* STAGE 1: ORGANIZATION & IDENTITY */}
          {stage === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Provide legal organization credentials. This establishes the sovereign customer identity and root tenancy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Organization / Institution Name</label>
                  <input
                    type="text"
                    value={orgInfo.organizationName}
                    onChange={(e) => setOrgInfo({ ...orgInfo, organizationName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CAC / RC / Registration Number</label>
                  <input
                    type="text"
                    value={orgInfo.registrationNumber}
                    onChange={(e) => setOrgInfo({ ...orgInfo, registrationNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Organization Entity Type</label>
                  <select
                    value={orgInfo.organizationType}
                    onChange={(e) => setOrgInfo({ ...orgInfo, organizationType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="educational_institution">Educational Institution (K-12 / College)</option>
                    <option value="training_center">Vocational / Technical Training Center</option>
                    <option value="exam_body">Testing / CBT Examination Body</option>
                    <option value="enterprise_consortium">Multi-Campus Education Consortium</option>
                    <option value="government_agency">State Ministry / Education Board</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Authorized Contact Officer Name</label>
                  <input
                    type="text"
                    value={orgInfo.contactPersonName}
                    onChange={(e) => setOrgInfo({ ...orgInfo, contactPersonName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Contact Email (Root Admin)</label>
                  <input
                    type="email"
                    value={orgInfo.contactEmail}
                    onChange={(e) => setOrgInfo({ ...orgInfo, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Telephone Number</label>
                  <input
                    type="text"
                    value={orgInfo.contactPhone}
                    onChange={(e) => setOrgInfo({ ...orgInfo, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={orgInfo.address}
                    onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={orgInfo.state}
                    onChange={(e) => setOrgInfo({ ...orgInfo, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">LGA</label>
                  <input
                    type="text"
                    value={orgInfo.lga}
                    onChange={(e) => setOrgInfo({ ...orgInfo, lga: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Institutional Governance & Provisioning Authority Hierarchy */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      Institutional Governance & Authority Hierarchy
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      School Proprietor &gt; School Principal &gt; ICT Technician. Provisioning must be requested by the Proprietor or Principal.
                    </p>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/30 font-medium">
                    Strict Governance
                  </span>
                </div>

                {/* Provisioner Role Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-2">
                    Who is initiating / requesting this school provisioning?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option: Proprietor */}
                    <button
                      type="button"
                      onClick={() => setOrgInfo({ ...orgInfo, provisionerRole: 'proprietor' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        orgInfo.provisionerRole === 'proprietor'
                          ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">School Proprietor</span>
                        {orgInfo.provisionerRole === 'proprietor' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Founder / Board Chair. Has authority over Principal & ICT Tech.</p>
                    </button>

                    {/* Option: Principal */}
                    <button
                      type="button"
                      onClick={() => setOrgInfo({ ...orgInfo, provisionerRole: 'principal' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        orgInfo.provisionerRole === 'principal'
                          ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">School Principal</span>
                        {orgInfo.provisionerRole === 'principal' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Academic Head. Has authority over ICT Tech. Can hold dual role.</p>
                    </button>

                    {/* Option: ICT Technician (Disabled Gatekeeper) */}
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-950/20 text-left opacity-75 cursor-not-allowed">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 line-through">ICT Technician</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/30">
                          Restricted
                        </span>
                      </div>
                      <p className="text-[10px] text-red-300/80 mt-1">
                        Cannot single-handedly make a school instance provisioning.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-branch: When Initiated by Proprietor */}
                {orgInfo.provisionerRole === 'proprietor' && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400">
                        Appoint or Assign School Principal
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Proprietor Authority Rule
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Principal Full Name</label>
                        <input
                          type="text"
                          value={orgInfo.principalName || ''}
                          onChange={(e) => setOrgInfo({ ...orgInfo, principalName: e.target.value })}
                          placeholder="e.g. Dr. (Mrs.) Folashade Adeleke"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Principal Email</label>
                        <input
                          type="email"
                          value={orgInfo.principalEmail || ''}
                          onChange={(e) => setOrgInfo({ ...orgInfo, principalEmail: e.target.value })}
                          placeholder="principal@school.sch.ng"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-branch: Dual-Role Technical Governance (Principal can hold both Principal and ICT Technician) */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(orgInfo.isPrincipalAlsoIctTechnician)}
                      onChange={(e) => setOrgInfo({ ...orgInfo, isPrincipalAlsoIctTechnician: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        School Principal holds both positions of Principal and ICT Technician
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Allowed by institutional governance rules. Grants the Principal dual administrative and technical management rights over this instance.
                      </p>
                    </div>
                  </label>

                  {/* If NOT dual role, prompt for ICT technician appointment */}
                  {!orgInfo.isPrincipalAlsoIctTechnician && (
                    <div className="pt-2 border-t border-slate-800/80 mt-2 space-y-2">
                      <span className="text-[11px] font-medium text-slate-300">
                        Appoint Dedicated ICT Technician (Managed by Principal / Proprietor):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={orgInfo.ictTechnicianName || ''}
                          onChange={(e) => setOrgInfo({ ...orgInfo, ictTechnicianName: e.target.value })}
                          placeholder="ICT Technician Name (e.g. Engr. Dapo Alabi)"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                        <input
                          type="email"
                          value={orgInfo.ictTechnicianEmail || ''}
                          onChange={(e) => setOrgInfo({ ...orgInfo, ictTechnicianEmail: e.target.value })}
                          placeholder="ict@school.sch.ng"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: INSTANCE TYPE SELECTION */}
          {stage === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Select the target operational architecture profile. Each instance type provisions dedicated computational and data resources.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Full School Management */}
                <div
                  onClick={() => setInstanceType('full_school_management')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    instanceType === 'full_school_management'
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-900/60 text-emerald-400 flex items-center justify-center mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base">Full School ERP</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    End-to-end academic institution management. Includes NERDC curriculum, student registers, timetables, lesson notes, and CBT exams.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Curriculum Flow App</span>
                  </div>
                </div>

                {/* Option 2: Custom Architecture */}
                <div
                  onClick={() => setInstanceType('custom_architecture')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    instanceType === 'custom_architecture'
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-900/60 text-purple-400 flex items-center justify-center mb-3">
                    <Server className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base">Custom Architecture</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Enterprise consortiums with bespoke integration needs, custom APIs, external LMS/ERP connectors, and dedicated GCP projects.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-purple-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Technical Review Gate</span>
                  </div>
                </div>

                {/* Option 3: Feature Collection */}
                <div
                  onClick={() => setInstanceType('feature_collection')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    instanceType === 'feature_collection'
                      ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/20 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-900/60 text-sky-400 flex items-center justify-center mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base">Feature Collection</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Standalone micro-apps. Ideal for examination centers, tutorial hubs, or specialized modules without full school overhead.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Modular Ala-Carte</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: APPLICATION FAMILY SELECTION */}
          {stage === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Specify the application family and organizational classification.
              </p>

              {instanceType === 'full_school_management' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">School Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'secondary_school', label: 'Secondary School (JSS 1 – SSS 3)', desc: 'Full junior & senior secondary with WAEC/NECO/JAMB matrix' },
                      { id: 'combined_school', label: 'Combined Basic & Secondary (Nursery – SSS 3)', desc: 'Unified multi-tier basic education and senior academy' },
                      { id: 'vocational_institution', label: 'Vocational / Technical Institution', desc: 'NABTEB technical modules, trade skills, and apprenticeships' },
                      { id: 'primary_basic', label: 'Primary & Basic School (Primary 1 – 6)', desc: 'Foundational literacy, numeracy, and continuous assessment' }
                    ].map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => setSchoolCategory(cat.id as any)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          schoolCategory === cat.id
                            ? 'bg-emerald-950/50 border-emerald-500'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <h5 className="font-bold text-white text-sm">{cat.label}</h5>
                        <p className="text-xs text-slate-400 mt-1">{cat.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {instanceType === 'custom_architecture' && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-3">
                  <h4 className="font-bold text-purple-200 text-sm">Enterprise Multi-Component Stack</h4>
                  <p className="text-xs text-slate-400">
                    Application components will be containerized on Google Cloud Run with VPC peering, custom API gateway endpoints, and enterprise single sign-on.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Architecture Family Codename</label>
                    <input
                      type="text"
                      value={appFamilyName}
                      onChange={(e) => setAppFamilyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {instanceType === 'feature_collection' && (
                <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-800/40 space-y-3">
                  <h4 className="font-bold text-sky-200 text-sm">Standalone Modular Micro-App</h4>
                  <p className="text-xs text-slate-400">
                    Selected feature modules will be bundled with isolated authentication and minimal database footprint.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STAGE 4: FEATURE & MODULE SELECTION WITH DEPENDENCY VALIDATION */}
          {stage === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Modular Features & Entitlements</h4>
                  <p className="text-xs text-slate-400">Enable features required for this customer instance.</p>
                </div>

                {dependencyIssues.length > 0 && (
                  <button
                    onClick={autoFixDependencies}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Resolve Dependencies</span>
                  </button>
                )}
              </div>

              {/* Dependency Warning Banner */}
              {dependencyIssues.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200 space-y-1">
                    <span className="font-bold block">Unsatisfied Feature Dependencies Detected:</span>
                    {dependencyIssues.map((issue, idx) => (
                      <p key={idx} className="text-[11px] text-amber-300">
                        • <strong>{issue.featureName}</strong> requires <em>{issue.requiredName}</em>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'curriculum_catalog', name: 'NERDC National Curriculum', desc: 'Standard national syllabi and subject matrices' },
                  { key: 'lesson_plans', name: 'Lesson Notes & Schemes', desc: 'Lesson planning and scheme of work authoring' },
                  { key: 'lesson_approval_chain', name: '3-Tier Lesson Approval Chain', desc: 'Supervisor approval before delivery' },
                  { key: 'question_bank', name: 'Question Bank & Item Authoring', desc: 'Taxonomy-classified questions' },
                  { key: 'cbt_examination', name: 'CBT Examination Engine', desc: 'Secure timed CBT exam delivery' },
                  { key: 'student_registers', name: 'Student Registry & Profiles', desc: 'Admission numbers, biodata, and classes' },
                  { key: 'biometric_attendance', name: 'Biometric Attendance & Kiosk', desc: 'Fingerprint & RFID automated attendance' },
                  { key: 'remedial_hub', name: 'Adaptive Remedial Hub', desc: 'Automated weak-topic remedial assignments' },
                  { key: 'broadsheet_analytics', name: 'WAEC Broadsheet Analytics', desc: 'End-of-term master broadsheets' },
                  { key: 'bursary_finance', name: 'Bursary Invoicing & VAT Hub', desc: 'Fee schedules, receipts, and VAT compliance' },
                  { key: 'timetable_scheduling', name: 'Master Timetable Engine', desc: 'Conflict-free classroom schedule builder' }
                ].map(feat => {
                  const isChecked = selectedFeatures.includes(feat.key);
                  return (
                    <div
                      key={feat.key}
                      onClick={() => toggleFeature(feat.key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-white">{feat.name}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-700'}`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{feat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 5: DEPLOYMENT & ARCHITECTURE REQUIREMENTS */}
          {stage === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Configure container workloads and compute infrastructure.
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Target Deployment Infrastructure</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { id: 'shared_application_infrastructure', label: 'Multi-Tenant Cloud Run', desc: 'Shared container fleet with auto-scaling to zero' },
                    { id: 'dedicated_cloud_run_service', label: 'Dedicated Cloud Run Service', desc: 'Isolated container instance with dedicated vCPU/RAM' },
                    { id: 'dedicated_gcp_project', label: 'Dedicated Sovereign Project', desc: 'Separate customer project; requires independent PIAM authorization' },
                    { id: 'multiple_cloud_run_services', label: 'Multiple Cloud Run Services', desc: 'Separate services for independently deployed components' },
                    { id: 'container_workloads', label: 'Container Workloads', desc: 'Container deployment target, not silently mapped to Cloud Run' }
                  ].map(target => (
                    <div
                      key={target.id}
                      onClick={() => setDeploymentTarget(target.id as DeploymentTargetOption)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        deploymentTarget === target.id
                          ? 'bg-indigo-950/50 border-indigo-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <h5 className="font-bold text-white text-xs">{target.label}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">{target.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {deploymentTarget === 'dedicated_gcp_project' && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/60 space-y-3">
                  <p className="text-xs text-amber-200">
                    Project creation is a separate privileged operation. It will remain blocked until an independent PIAM approval and Project Factory adapter are available.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-white">
                    <input type="checkbox" checked={createProject} onChange={(event) => setCreateProject(event.target.checked)} />
                    I explicitly request creation of a dedicated GCP project.
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs text-slate-300">
                      Requested project ID
                      <input value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
                    </label>
                    <label className="text-xs text-slate-300">
                      Parent scope
                      <select value={parentResourceType} onChange={(event) => setParentResourceType(event.target.value as 'organization' | 'folder')} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
                        <option value="organization">Organization ID</option>
                        <option value="folder">Folder ID</option>
                      </select>
                      <input aria-label="Parent organization or folder ID" value={parentResourceId} onChange={(event) => setParentResourceId(event.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Compute Resource Allocation</label>
                  <select
                    value={cpuAllocation}
                    onChange={(e) => setCpuAllocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="1.0 vCPU">1.0 vCPU (Standard Load - up to 500 students)</option>
                    <option value="2.0 vCPU">2.0 vCPU (Medium Load - up to 1,500 students)</option>
                    <option value="4.0 vCPU">4.0 vCPU (High Load - up to 5,000 students)</option>
                    <option value="8.0 vCPU">8.0 vCPU (Enterprise Consortium - 10,000+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Memory Allocation</label>
                  <select
                    value={memoryAllocation}
                    onChange={(e) => setMemoryAllocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="2 GiB RAM">2 GiB RAM</option>
                    <option value="4 GiB RAM">4 GiB RAM</option>
                    <option value="8 GiB RAM">8 GiB RAM</option>
                    <option value="16 GiB RAM">16 GiB RAM</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-xs">High Availability & Multi-Zone Failover</h5>
                  <p className="text-[11px] text-slate-400">Deploy across 3 Europe-West2 availability zones with automated health checks</p>
                </div>
                <input
                  type="checkbox"
                  checked={highAvailability}
                  onChange={(e) => setHighAvailability(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STAGE 6: DATABASE & STORAGE PREFERENCES (PHASE 7 COMPLIANT) */}
          {stage === 6 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Phase 7 Architecture Compliance: PostgreSQL 16 LTS relational authority and customer-selectable portable storage.
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Database Sharding & Isolation Strategy</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'shared_schema_isolated', label: 'Shared Cluster (RLS)', desc: 'PostgreSQL 16 with schema namespace & Row-Level Security' },
                    { id: 'dedicated_database', label: 'Dedicated Database Shard', desc: 'Isolated PostgreSQL database instance on private VPC' },
                    { id: 'dedicated_customer_gcp_project', label: 'Customer GCP Cloud SQL', desc: 'Hardware-isolated project database with CMEK encryption' }
                  ].map(db => (
                    <div
                      key={db.id}
                      onClick={() => setDatabaseStrategy(db.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        databaseStrategy === db.id
                          ? 'bg-emerald-950/50 border-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <h5 className="font-bold text-white text-xs">{db.label}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">{db.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-300">Customer Storage Strategy</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'platform_storage', label: 'Platform GCS', desc: 'Google Cloud Storage bucket in europe-west2' },
                    { id: 'private_drive', label: 'Customer Private Drive', desc: 'School-owned Google Drive or OneDrive via OAuth vault' },
                    { id: 'hybrid', label: 'Hybrid Routing Rules', desc: 'Sensitive transcripts to Private Drive; CBT video to GCS' }
                  ].map(stg => (
                    <div
                      key={stg.id}
                      onClick={() => setStorageStrategy(stg.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        storageStrategy === stg.id
                          ? 'bg-emerald-950/50 border-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <h5 className="font-bold text-white text-xs">{stg.label}</h5>
                      <p className="text-[11px] text-slate-400 mt-1">{stg.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {storageStrategy !== 'platform_storage' && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Primary Private Cloud Provider</label>
                  <select
                    value={storageProvider}
                    onChange={(e) => setStorageProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="google_drive">Google Drive (OAuth 2.0 Academic Vault)</option>
                    <option value="onedrive">Microsoft OneDrive / SharePoint Enterprise</option>
                    <option value="google_cloud_storage">Google Cloud Storage (Customer GCP Bucket)</option>
                  </select>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-xs">Customer-Managed Encryption Keys (CMEK)</h5>
                  <p className="text-[11px] text-slate-400">Encrypt all data at rest with Cloud KMS customer sovereign key</p>
                </div>
                <input
                  type="checkbox"
                  checked={cmekEnabled}
                  onChange={(e) => setCmekEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* STAGE 7: DOMAIN & INTEGRATION REQUIREMENTS */}
          {stage === 7 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Define the domain routing and API connectivity for the provisioned instance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Subdomain</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-3.5 py-2.5 rounded-l-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                    <span className="px-3.5 py-2.5 bg-slate-800 border border-l-0 border-slate-700 text-xs text-slate-300 rounded-r-xl font-mono">
                      .curriculumflow.com.ng
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Custom School Domain (Optional)</label>
                  <input
                    type="text"
                    value={customDomain}
                    placeholder="e.g. portal.myschool.sch.ng"
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white text-xs">Automated Managed SSL / TLS Certificate</h5>
                    <p className="text-[11px] text-slate-400">Issue and auto-renew Google-managed TLS certificate via Cloud DNS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sslManaged}
                    onChange={(e) => setSslManaged(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white text-xs">REST Webhooks & Event Notification Dispatch</h5>
                    <p className="text-[11px] text-slate-400">Stream academic events (attendance, grade submission, receipts) to school endpoints</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={apiWebhooksEnabled}
                    onChange={(e) => setApiWebhooksEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: ARCHITECTURE ASSESSMENT */}
          {stage === 8 && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-900 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                    IIAPE Assessment Unavailable
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    Indicative estimate (not a quote): ₦{estimatedCostNGN.toLocaleString()}/mo
                  </span>
                </div>

                <h4 className="font-black text-white text-base">
                  Requested Architecture: {deploymentTarget.replace(/_/g, ' ')}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {iiapeRationale}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">COMPUTE</span>
                    <span className="text-white font-bold">{cpuAllocation}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">MEMORY</span>
                    <span className="text-white font-bold">{memoryAllocation}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">DATABASE</span>
                    <span className="text-white font-bold">{databaseStrategy.substring(0, 15)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">STORAGE</span>
                    <span className="text-white font-bold">{storageStrategy}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 9: COMMERCIAL AGREEMENT & PAYMENT VERIFICATION */}
          {stage === 9 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Provide a real payment-provider reference. Payment verification is unavailable until a trusted server-side provider adapter is configured; a submitted request will remain unverified.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'monthly', label: 'Monthly Recurring', price: `₦${estimatedCostNGN.toLocaleString()}/mo`, desc: 'Standard monthly billing' },
                  { id: 'yearly', label: 'Yearly Prepaid', price: `₦${(estimatedCostNGN * 12 * 0.9).toLocaleString()}/yr`, desc: '10% Annual prepayment discount' },
                  { id: 'lease_to_own', label: 'Lease-to-Own Equity', price: `₦${(estimatedCostNGN * 1.4).toLocaleString()}/mo`, desc: 'Building equity toward 100% source code buyout' }
                ].map(model => (
                  <div
                    key={model.id}
                    onClick={() => setBillingModel(model.id as any)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      billingModel === model.id
                        ? 'bg-purple-950/50 border-purple-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <h5 className="font-bold text-white text-xs">{model.label}</h5>
                    <div className="text-sm font-black text-purple-300 font-mono my-1">{model.price}</div>
                    <p className="text-[10px] text-slate-400">{model.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Select Payment Service Provider (PSP)</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentProvider('paystack')}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                      paymentProvider === 'paystack'
                        ? 'bg-sky-950/50 border-sky-500 ring-1 ring-sky-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-xs text-white">Paystack API</span>
                    </div>
                    {paymentProvider === 'paystack' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </div>

                  <div
                    onClick={() => setPaymentProvider('opay')}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                      paymentProvider === 'opay'
                        ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-white">OPay Gateway (HMAC-SHA512)</span>
                    </div>
                    {paymentProvider === 'opay' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  <label className="flex-1">
                    <span className="text-slate-400 block text-[10px]">PAYMENT REFERENCE</span>
                    <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} aria-label="Payment provider transaction reference" className="w-full bg-transparent text-white font-bold outline-none" placeholder="Provider transaction reference" />
                  </label>

                  {paymentVerified ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified by Backend</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleVerifyPayment}
                      disabled={isVerifyingPayment || !paymentReference.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      {isVerifyingPayment && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>Verify Live Payment</span>
                    </button>
                  )}
                </div>
                {createdInstance && (
                  <p className="text-xs text-amber-300">Request received ({createdInstance.requestId}); payment status: {createdInstance.payment.paymentStatus}. No payment verification has been claimed.</p>
                )}
                {paymentError && <p role="alert" className="text-xs text-rose-300">{paymentError}</p>}
              </div>
            </div>
          )}

          {/* STAGE 10: APPROVAL & PROVISIONING */}
          {stage === 10 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Requests are not provisioning. Execution stays blocked until payment, architecture review, any required PIAM approval, and a real target-specific adapter are verified.
              </p>
              <p role="status" className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
                Current status: {getProvisioningStatusLabel()}. Provisioning adapters and independent infrastructure verification are unavailable.
              </p>

              {instanceType === 'custom_architecture' && createdInstance?.customArchitecture?.reviewStatus !== 'approved' && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Awaiting Independent Technical Review</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    This request cannot approve itself. A reviewer must act through the authenticated control plane.
                  </p>
                </div>
              )}

              {provisioningDone ? (
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-black text-white text-base">Provisioning Verified</h4>
                  <p className="text-xs text-slate-300">The execution and independent verification APIs reported success.</p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mx-auto">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{getProvisioningStatusLabel()}</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Target: {deploymentTarget.replace(/_/g, ' ')} | DB: {databaseStrategy} | Storage: {storageStrategy}
                    </p>
                    {createdInstance?.provisioningFailure && (
                      <p role="alert" className="text-xs text-rose-300 mt-2">
                        {createdInstance.provisioningFailure.message} (correlation ID: {createdInstance.provisioningFailure.correlationId})
                      </p>
                    )}
                    {provisioningError && <p role="alert" className="text-xs text-rose-300 mt-2">{provisioningError}</p>}
                  </div>
                  <button
                    onClick={handleExecuteProvisioning}
                    disabled={isProvisioning || !createdInstance || !paymentVerified || (instanceType === 'custom_architecture' && createdInstance.customArchitecture?.reviewStatus !== 'approved') || (deploymentTarget === 'dedicated_gcp_project' && !createProject)}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-indigo-950"
                  >
                    {isProvisioning && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{isProvisioning ? 'Provisioning in progress' : 'Execute provisioning'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAGE 11: INSTANCE VERIFICATION & ACTIVATION */}
          {stage === 11 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Activation requires successful execution and evidence-backed independent verification of every mandatory check. No activation token or URL is generated while any check is unknown or unavailable.
              </p>

              {/* Verification Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {verificationChecks.map((chk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-sans">{chk.label}</span>
                    <span className={`font-bold ${chk.status === 'passed' ? 'text-emerald-400' : chk.status === 'failed' ? 'text-rose-400' : 'text-amber-300'}`}>
                      {chk.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              {!activationData ? (
                <div className="text-center pt-2">
                  <button
                    onClick={handleActivateInstance}
                    disabled={isActivating || !createdInstance || !provisioningDone || !createdInstance.verification.allPassed}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-950"
                  >
                    {isActivating && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Issue Activation Invitation</span>
                  </button>
                  {activationError && <p role="alert" className="text-xs text-rose-300 mt-3">{activationError}</p>}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-800/60 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Instance Activated Successfully</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Expires: {new Date(activationData.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-mono block">SECURE ACTIVATION INVITATION LINK (72-HOUR TTL)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activationData.activationUrl}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 select-all"
                      />
                      <button
                        onClick={copyActivationLink}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                    <span className="text-slate-400">Invitee: {orgInfo.contactEmail}</span>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Complete & Finish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Bottom Navigation Buttons */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setStage(prev => Math.max(1, prev - 1))}
            disabled={stage === 1}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-semibold text-xs flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="text-xs text-slate-500 font-mono">
            {stage} / 11
          </div>

          <button
            onClick={() => {
              if (stage === 11) {
                onClose();
              } else {
                setStage(prev => Math.min(11, prev + 1));
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950"
          >
            <span>{stage === 11 ? 'Close' : 'Next Stage'}</span>
            {stage < 11 && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>
    </div>
  );
};
