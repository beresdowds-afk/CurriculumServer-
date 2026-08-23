import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  BusinessModelType, 
  OptionalFeatureKey, 
  SchoolBrandProfile,
  CurriculumFlowBundleKey
} from '../types';
import { 
  X, 
  Sparkles, 
  Building2, 
  CreditCard, 
  Sliders, 
  CheckCircle2, 
  Key, 
  Globe, 
  Server, 
  ShieldCheck, 
  Terminal, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Cpu, 
  Check, 
  Copy,
  Coins,
  Calendar,
  Award,
  BookOpen,
  DollarSign,
  Tag
} from 'lucide-react';
import { 
  OPTIONAL_FEATURE_DEFINITIONS, 
  generateRandomAppId, 
  generateAppSecret, 
  generatePublishableKey, 
  generateLicenseHash 
} from '../mockCurriculumServerData';
import { 
  CURRICULUM_FLOW_BUNDLES, 
  calculateBundlePricing 
} from '../data/bundleArchitectureData';

interface ProvisionSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvisionSuccess: (newTenant: TenantSchoolApp) => void;
  onCloneSuccess?: (newTenant: TenantSchoolApp) => void;
}

export const ProvisionSchoolModal: React.FC<ProvisionSchoolModalProps> = ({
  isOpen,
  onClose,
  onProvisionSuccess,
  onCloneSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State - Step 1: School Identity
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [locationState, setLocationState] = useState('Lagos State');
  const [country, setCountry] = useState('Nigeria');
  const [address, setAddress] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [ictAdminName, setIctAdminName] = useState('');
  const [ictAdminEmail, setIctAdminEmail] = useState('');
  const [motto, setMotto] = useState('Knowledge, Integrity, and Excellence');
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [accentColor, setAccentColor] = useState('#059669');

  // Form State - Step 2: Business Model
  const [businessModel, setBusinessModel] = useState<BusinessModelType>('yearly');
  const [studentCapacity, setStudentCapacity] = useState<number>(1000);
  const [leaseAmortizationMonths, setLeaseAmortizationMonths] = useState<number>(24);
  const [leaseMonthlyAmount, setLeaseMonthlyAmount] = useState<number>(350000);

  // Form State - Step 3: 4-Bundle Licensing Model & Sub-Features
  const [selectedBundles, setSelectedBundles] = useState<Record<CurriculumFlowBundleKey, boolean>>({
    administration: true,
    teaching: true,
    assessment: true,
    accounts_billing: true,
    logistics_support: true
  });

  const [inAppFeatureOverrides, setInAppFeatureOverrides] = useState<Record<string, boolean>>({
    student_record: true,
    staff_record: true,
    attendance: true,
    punctuality: true,
    lesson_notes: true,
    delivery: true,
    monitoring: true,
    feedback: true,
    question_bank: true,
    tests: true,
    exams: true,
    results: true,
    fee_schedules: true,
    payments_psp: true,
    bursary_ledger: true,
    payroll_expenses: true,
    financial_analytics: true
  });

  // Legacy feature flags for compatibility
  const [enabledFeatures, setEnabledFeatures] = useState<Record<OptionalFeatureKey, boolean>>({
    ai_curriculum_advisor: true,
    adaptive_remedial_engine: true,
    biometric_rfid_gate: false,
    secure_cbt_lockdown: true,
    bursary_psp_multi_split: true,
    parent_ward_security_hub: true,
    custom_domain_whitelabel: false,
    hybrid_offline_sync: false,
    whatsapp_sms_broadcast: true,
    spanner_audit_trail: true
  });

  // Step 4: Provisioning Animation & Result State
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);
  const [createdTenant, setCreatedTenant] = useState<TenantSchoolApp | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleBundle = (bundleKey: CurriculumFlowBundleKey) => {
    setSelectedBundles(prev => {
      const next = { ...prev, [bundleKey]: !prev[bundleKey] };
      // Ensure at least 1 bundle is selected
      const activeCount = Object.values(next).filter(Boolean).length;
      if (activeCount === 0) return prev;
      return next;
    });
  };

  const selectAllBundles = () => {
    setSelectedBundles({
      administration: true,
      teaching: true,
      assessment: true,
      accounts_billing: true,
      logistics_support: true
    });
  };

  const toggleSubFeature = (featureKey: string) => {
    setInAppFeatureOverrides(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey]
    }));
  };

  const bundlePricingCalculation = calculateBundlePricing(selectedBundles, businessModel === 'yearly');

  const calculateSubscriptionPricing = () => {
    if (businessModel === 'lease_to_own') {
      return {
        monthly: leaseMonthlyAmount,
        yearly: leaseMonthlyAmount * 12,
        totalBuyout: leaseMonthlyAmount * leaseAmortizationMonths
      };
    }

    return {
      monthly: bundlePricingCalculation.discountedMonthlyPriceNGN,
      yearly: bundlePricingCalculation.discountedYearlyPriceNGN,
      totalBuyout: 0
    };
  };

  const pricing = calculateSubscriptionPricing();

  const handleStartProvisioning = () => {
    setIsProvisioning(true);
    setCurrentStep(4);
    setProvisioningLogs([
      '⚡ Initializing Curriculum Server Provisioning Engine v3.0...',
      `📦 Allocating isolated database shard for "${schoolName}"...`,
      '🔑 Generating cryptographically secure Application ID & App Secret...',
      `🧩 Licensing ${bundlePricingCalculation.selectedBundlesCount} architectural bundles (Discount: ${bundlePricingCalculation.discountPercent}%)...`,
      '📚 Seeding National NERDC Basic & Senior Secondary Academic Framework...',
      '💳 Setting up Bursary Virtual NUBAN Webhook routing (Paystack/OPay)...',
      '🛡️ Hardening TRCN IAM governance roles and principal audit ledger...',
      '🚀 Launching isolated Docker tenant container node...'
    ]);

    setTimeout(() => {
      const appId = generateRandomAppId(schoolName, locationState);
      const appSecret = generateAppSecret();
      const pubKey = generatePublishableKey();
      const slug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const subdomain = `${slug}.curriculumflow.com`;
      const shardId = `shard-${locationState.toLowerCase().replace(/[^a-z]/g, '')}-${slug.substring(0, 6)}`;
      const licenseHash = generateLicenseHash();

      const brandProfile: SchoolBrandProfile = {
        id: `brand-${slug}`,
        schoolName: schoolName || 'New Provisioned Institution',
        shortName: shortName || schoolName.substring(0, 15),
        motto: motto,
        establishedYear: 2026,
        schoolType: 'Comprehensive Secondary School (JSS 1 - SS 3)',
        accreditationNumber: `NERDC/${locationState.toUpperCase().substring(0, 3)}/2026/${Math.floor(1000 + Math.random() * 9000)}`,
        examCentreNumbers: {
          waec: `WAEC/${Math.floor(1000000 + Math.random() * 9000000)}`,
          neco: `NECO/${Math.floor(1000000 + Math.random() * 9000000)}`
        },
        crestLogoUrl: '',
        logoShape: 'shield',
        logoIconType: 'school',
        crestBadgePreset: 'emerald_prestige',
        principalSignatureUrl: '',
        principalName: principalName || 'Principal Administrator',
        principalTitle: 'Principal & Executive Academic Director',
        stampSealUrl: '',
        watermarkText: `${(schoolName || 'INSTITUTION').toUpperCase()} • OFFICIAL`,
        brandTheme: {
          primaryColor: primaryColor || '#059669',
          secondaryColor: '#0f766e',
          accentColor: accentColor || '#f59e0b',
          presetKey: 'emerald_prestige'
        },
        contact: {
          primaryEmail: principalEmail || 'admin@school.sch.ng',
          admissionsEmail: `admissions@${slug}.sch.ng`,
          bursaryEmail: `bursary@${slug}.sch.ng`,
          principalEmail: principalEmail || 'principal@school.sch.ng',
          primaryPhone: principalPhone || '+234 800 000 0000',
          alternatePhone: '+234 800 111 2222',
          whatsappSupport: principalPhone || '+234 800 000 0000',
          emergencyHelpline: '+234 800 999 0000',
          officialWebsite: `https://${subdomain}`,
          studentPortalUrl: `https://${subdomain}/student`,
          parentPortalUrl: `https://${subdomain}/parent`,
          lmsUrl: `https://${subdomain}/lms`
        },
        address: {
          streetAddress: address || 'Campus Boulevard',
          areaDistrict: locationState,
          city: locationState,
          state: locationState,
          country: country,
          postalCode: '100001',
          campusName: 'Main Campus',
          landmarks: 'Central Education District'
        },
        socialMedia: {
          facebookUrl: '',
          twitterXUrl: '',
          instagramUrl: '',
          linkedinUrl: '',
          youtubeUrl: '',
          tiktokUrl: '',
          telegramChannel: '',
          whatsappChannel: ''
        },
        academicAffiliation: 'Federal Ministry of Education / NERDC National Standard',
        status: 'published',
        publishedAt: new Date().toISOString(),
        publishedBy: 'SaaS Platform Superadmin',
        version: 1,
        lastSavedAt: new Date().toISOString(),
        lastSavedBy: 'SaaS Platform Superadmin',
        publishAuditHistory: []
      };

      const newTenant: TenantSchoolApp = {
        id: `tenant-${Date.now()}`,
        appId: appId,
        appSecret: appSecret,
        publishableKey: pubKey,
        schoolName: schoolName || 'New Institution',
        schoolSlug: slug,
        subdomain: subdomain,
        customDomain: undefined,
        locationState: locationState,
        country: country,
        address: address,
        principalName: principalName || 'Principal Administrator',
        principalEmail: principalEmail || 'principal@school.sch.ng',
        principalPhone: principalPhone || '+234 800 000 0000',
        ictAdminName: ictAdminName || 'Lead Systems Admin',
        ictAdminEmail: ictAdminEmail || 'ict@school.sch.ng',
        businessModel: businessModel,
        subscriptionTier: businessModel === 'lease_to_own' 
          ? 'Bespoke Lease-to-Own' 
          : bundlePricingCalculation.selectedBundlesCount === 4
            ? 'Apex Enterprise' 
            : bundlePricingCalculation.selectedBundlesCount >= 2 
              ? 'Pro College' 
              : 'Starter Academy',
        subscriptionPricePerMonth: pricing.monthly,
        subscriptionPricePerYear: pricing.yearly,
        currency: 'NGN',
        status: 'active',
        subscriptionRenewDate: businessModel === 'monthly' ? '2026-09-16' : '2027-08-16',
        gracePeriodDays: 14,
        autoRenew: true,
        leaseToOwnContract: businessModel === 'lease_to_own' ? {
          totalBuyoutPrice: pricing.totalBuyout,
          amortizationPeriodMonths: leaseAmortizationMonths,
          monthlyAmortizationInstallment: leaseMonthlyAmount,
          monthsPaid: 1,
          totalEquityAccumulated: leaseMonthlyAmount,
          remainingBuyoutBalance: pricing.totalBuyout - leaseMonthlyAmount,
          startDate: new Date().toISOString().split('T')[0],
          targetPerpetualHandoverDate: '2028-08-16',
          isPerpetualLicenseGranted: false,
          escrowSourceCodeReleaseStatus: 'locked_in_escrow',
          earlyBuyoutDiscountPercent: 10
        } : undefined,
        studentCapacity: studentCapacity,
        activeStudentsCount: 0,
        facultyCount: 0,
        storageUsageMb: 120,
        maxStorageMb: 15000,
        uptimePercent90Days: 100,
        lastActiveTimestamp: 'Just now',
        databaseShardId: shardId,
        databaseIsolationType: 'dedicated_shard',
        provisionedFromTemplateVersion: 'v3.0.0-Enterprise',
        clonedFromTemplateVersion: 'v3.0.0-Enterprise',
        brandProfile: brandProfile,
        licensedBundles: selectedBundles,
        inAppFeatureOverrides: inAppFeatureOverrides,
        bundleUpgradeRequests: [],
        enabledFeatures: enabledFeatures,
        rateLimitReqPerMin: 1000,
        createdAt: new Date().toISOString(),
        provisionedByAdmin: 'Curriculum Server Multi-Tenant Engine',
        clonedByAdmin: 'Curriculum Server Multi-Tenant Engine',
        licenseHash: licenseHash,
        auditLogsCount: 1
      };

      setCreatedTenant(newTenant);
      setIsProvisioning(false);
      if (onProvisionSuccess) {
        onProvisionSuccess(newTenant);
      } else if (onCloneSuccess) {
        onCloneSuccess(newTenant);
      }
    }, 1800);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Provision New School Instance</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Step {currentStep} of 4
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Deploy an isolated CurriculumFlow instance with custom credentials and subscription licensing.
              </p>
            </div>
          </div>
          {!isProvisioning && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Steps Indicator */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-4 gap-2 text-xs">
          {[
            { step: 1, title: '1. Identity & Profile' },
            { step: 2, title: '2. Business Model' },
            { step: 3, title: '3. Optional Modules' },
            { step: 4, title: '4. Provision & Keys' }
          ].map(s => (
            <div
              key={s.step}
              className={`text-center py-1.5 rounded-lg font-semibold transition-colors ${
                currentStep === s.step
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : currentStep > s.step
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-500 bg-slate-950/40'
              }`}
            >
              {s.title}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
          {/* STEP 1: School Identity */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Institutional Details & Admin Contacts
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official School Name *
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="e.g. Queen's College Lagos or St. Gregory's College"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short / Display Name
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={e => setShortName(e.target.value)}
                    placeholder="e.g. Queen's College"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    State / Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={locationState}
                    onChange={e => setLocationState(e.target.value)}
                    placeholder="e.g. Lagos State, Abuja FCT, Rivers"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Principal's Full Name
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={e => setPrincipalName(e.target.value)}
                    placeholder="e.g. Dr. A. O. Williams"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Principal Email
                  </label>
                  <input
                    type="email"
                    value={principalEmail}
                    onChange={e => setPrincipalEmail(e.target.value)}
                    placeholder="principal@school.sch.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ICT / System Admin Name
                  </label>
                  <input
                    type="text"
                    value={ictAdminName}
                    onChange={e => setIctAdminName(e.target.value)}
                    placeholder="e.g. Engr. Kayode Bello"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ICT Admin Email
                  </label>
                  <input
                    type="email"
                    value={ictAdminEmail}
                    onChange={e => setIctAdminEmail(e.target.value)}
                    placeholder="ict@school.sch.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Physical Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Yaba, Lagos Mainland, Lagos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business & Pricing Model */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Subscription or Lease-to-Own Business Model
              </h4>

              {/* 3 Business Model Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Monthly */}
                <div
                  onClick={() => setBusinessModel('monthly')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                    businessModel === 'monthly'
                      ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                        Recurring
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">Monthly Subscription</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Flexible month-to-month license with zero lock-in, automated card or virtual account debit.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-base font-extrabold text-emerald-400">₦120,000</span>
                    <span className="text-[10px] text-slate-400"> / month</span>
                  </div>
                </div>

                {/* Yearly */}
                <div
                  onClick={() => setBusinessModel('yearly')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none relative ${
                    businessModel === 'yearly'
                      ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
                    SAVE 20% (2 MO FREE)
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                        Annual Plan
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">Yearly Subscription</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Prepaid annual institutional contract with priority support and free custom domain setup.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-base font-extrabold text-emerald-400">₦1,152,000</span>
                    <span className="text-[10px] text-slate-400"> / year</span>
                  </div>
                </div>

                {/* Lease to Own */}
                <div
                  onClick={() => setBusinessModel('lease_to_own')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none relative ${
                    businessModel === 'lease_to_own'
                      ? 'bg-slate-800/90 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 bg-purple-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
                    PERPETUAL BUYOUT
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
                        <Award className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                        Amortization
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">Lease to Own</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Monthly installments build equity toward 100% on-premise perpetual license & source escrow.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-base font-extrabold text-purple-300">₦350,000</span>
                    <span className="text-[10px] text-slate-400"> / mo x 24 mo</span>
                  </div>
                </div>
              </div>

              {/* Specific Lease to Own Configuration */}
              {businessModel === 'lease_to_own' && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span>Lease-to-Own Contract Amortization Terms</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Amortization Period</label>
                      <select
                        value={leaseAmortizationMonths}
                        onChange={e => setLeaseAmortizationMonths(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      >
                        <option value={12}>12 Months Accelerated (₦450,000 / mo)</option>
                        <option value={24}>24 Months Standard (₦350,000 / mo)</option>
                        <option value={36}>36 Months Extended (₦260,000 / mo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Total Buyout Valuation</label>
                      <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-bold text-purple-300">
                        ₦{(leaseAmortizationMonths * (leaseAmortizationMonths === 12 ? 450000 : leaseAmortizationMonths === 24 ? 350000 : 260000)).toLocaleString()} Total
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Capacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Licensed Student Capacity</span>
                  <span className="font-bold text-emerald-400">{studentCapacity.toLocaleString()} Students</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="4000"
                  step="100"
                  value={studentCapacity}
                  onChange={e => setStudentCapacity(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>200 (Small Academy)</span>
                  <span>1,500 (Standard College)</span>
                  <span>4,000+ (Multi-Campus)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 4-Bundle Licensing Model */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Select Architectural Bundles for Provisioning
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Schools can select any combination of the modular suites. Multi-bundle discount applied automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={selectAllBundles}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    Select All (Max Savings)
                  </button>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {bundlePricingCalculation.selectedBundlesCount} of {CURRICULUM_FLOW_BUNDLES.length} Bundles
                  </span>
                </div>
              </div>

              {/* Bundles Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                  const isSelected = !!selectedBundles[bundle.key];
                  return (
                    <div
                      key={bundle.key}
                      onClick={() => toggleBundle(bundle.key)}
                      className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950/60 border-slate-800 opacity-60 hover:opacity-85'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${bundle.badgeColor}`}>
                            {bundle.shortName}
                          </span>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <h5 className="text-xs font-black text-white mb-1">
                          {bundle.name}
                        </h5>
                        <p className="text-[11px] text-slate-300 line-clamp-2 mb-3">
                          {bundle.description}
                        </p>

                        {/* Feature bullets */}
                        <div className="space-y-1 py-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                          {bundle.features.map(f => (
                            <div key={f.id} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Bundle Rate:</span>
                        <span className="font-bold text-slate-200">
                          ₦{bundle.monthlyPriceNGN.toLocaleString()} <span className="text-[9px] text-slate-400">/ mo</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Pricing Summary Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Bundle Subscription Subtotal:</span>
                    {bundlePricingCalculation.discountPercent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {bundlePricingCalculation.discountPercent}% Multi-Bundle Discount Applied
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {businessModel === 'yearly' ? 'Prepaid annual billing cycle (includes 20% annual term saving)' : 'Recurring monthly billing cycle'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">Calculated Billable Amount</p>
                  <p className="text-base font-black text-emerald-400">
                    {businessModel === 'yearly' 
                      ? `₦${bundlePricingCalculation.discountedYearlyPriceNGN.toLocaleString()} / yr`
                      : `₦${bundlePricingCalculation.discountedMonthlyPriceNGN.toLocaleString()} / mo`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Provisioning & Credentials Generation */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              {isProvisioning ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-spin">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Provisioning Isolated Cloud Instance...
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Generating credentials, dedicated schema, and container routes for {schoolName}
                    </p>
                  </div>

                  {/* Provisioning Terminal Output */}
                  <div className="text-left font-mono text-[11px] bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5 text-emerald-400 max-h-48 overflow-y-auto">
                    {provisioningLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : createdTenant ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-900/80 text-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Instance Successfully Provisioned & Deployed!
                      </h4>
                      <p className="text-xs text-emerald-300/90">
                        {createdTenant.schoolName} is ready to use with unique credentials below.
                      </p>
                    </div>
                  </div>

                  {/* Access Credentials Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Application ID (client_id)</span>
                      <div className="flex items-center justify-between text-emerald-400 mt-0.5">
                        <span>{createdTenant.appId}</span>
                        <button
                          onClick={() => copyToClipboard(createdTenant.appId, 'appId')}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {copiedKey === 'appId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">App Secret (client_secret)</span>
                      <div className="flex items-center justify-between text-amber-300 mt-0.5">
                        <span className="truncate mr-2">{createdTenant.appSecret}</span>
                        <button
                          onClick={() => copyToClipboard(createdTenant.appSecret, 'appSecret')}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {copiedKey === 'appSecret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Instance URL Endpoint</span>
                      <div className="flex items-center justify-between text-sky-300 mt-0.5">
                        <span>https://{createdTenant.subdomain}</span>
                        <button
                          onClick={() => copyToClipboard(`https://${createdTenant.subdomain}`, 'url')}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          {currentStep > 1 && currentStep < 4 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {currentStep === 1 && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 && (
            <button
              onClick={() => {
                if (!schoolName) {
                  alert('Please enter the school name first.');
                  return;
                }
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={handleStartProvisioning}
              className="ml-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Provision School Instance</span>
            </button>
          )}

          {currentStep === 4 && !isProvisioning && createdTenant && (
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all"
            >
              Finish & Return to Master Console
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export { ProvisionSchoolModal as CloneSchoolModal };
