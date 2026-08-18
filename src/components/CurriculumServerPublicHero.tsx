import React, { useState } from 'react';
import { 
  BusinessModelType, 
  OptionalFeatureKey, 
  TenantSchoolApp,
  TldPricingPlan,
  SchoolBrandProfile
} from '../types';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';
import { INITIAL_SCHOOL_BRAND } from '../data/brandManagementData';
import { 
  Sparkles, 
  ShieldCheck, 
  Server, 
  CreditCard, 
  Check, 
  Globe, 
  Building2, 
  Cpu, 
  Award, 
  ArrowRight, 
  Terminal, 
  Play, 
  HelpCircle,
  Database,
  Lock,
  ChevronRight,
  Zap,
  Activity,
  Layers
} from 'lucide-react';

interface CurriculumServerPublicHeroProps {
  onStartProvisioning: (tenantDraft: Partial<TenantSchoolApp>) => void;
  onEnterControlPlane: () => void;
  onEnterSelfService: () => void;
  onOpenIsolationTests: () => void;
}

export const CurriculumServerPublicHero: React.FC<CurriculumServerPublicHeroProps> = ({
  onStartProvisioning,
  onEnterControlPlane,
  onEnterSelfService,
  onOpenIsolationTests
}) => {
  const [selectedTier, setSelectedTier] = useState<'Starter Academy' | 'Pro College' | 'Apex Enterprise' | 'Bespoke Lease-to-Own'>('Pro College');
  const [billingCycle, setBillingCycle] = useState<BusinessModelType>('yearly');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<OptionalFeatureKey, boolean>>({
    ai_curriculum_advisor: true,
    adaptive_remedial_engine: true,
    biometric_rfid_gate: false,
    secure_cbt_lockdown: true,
    bursary_psp_multi_split: false,
    parent_ward_security_hub: false,
    custom_domain_whitelabel: true,
    hybrid_offline_sync: false,
    whatsapp_sms_broadcast: false,
    spanner_audit_trail: false
  });

  // School Profile Form State
  const [schoolName, setSchoolName] = useState('Grange International School');
  const [locationState, setLocationState] = useState('Lagos State');
  const [address, setAddress] = useState('Harold Shodipo Crescent, GRA Ikeja');
  const [principalName, setPrincipalName] = useState('Mrs. Abigail O. Alabi');
  const [principalEmail, setPrincipalEmail] = useState('principal@grangeschool.sch.ng');
  const [principalPhone, setPrincipalPhone] = useState('+234 803 219 4488');
  const [ictAdminName, setIctAdminName] = useState('Mr. Femi Adeyemi');
  const [ictAdminEmail, setIctAdminEmail] = useState('ict.admin@grangeschool.sch.ng');

  // Domain selection
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom_nira'>('subdomain');
  const [subdomainSlug, setSubdomainSlug] = useState('grangeschool');
  const [customDomainName, setCustomDomainName] = useState('portal.grangeschool.sch.ng');

  // Base tier pricing calculation
  const getTierBasePrice = () => {
    switch (selectedTier) {
      case 'Starter Academy': return billingCycle === 'yearly' ? 1800000 : 180000;
      case 'Pro College': return billingCycle === 'yearly' ? 3200000 : 320000;
      case 'Apex Enterprise': return billingCycle === 'yearly' ? 5500000 : 550000;
      case 'Bespoke Lease-to-Own': return billingCycle === 'yearly' ? 4200000 : 350000;
    }
  };

  const getFeaturesTotal = () => {
    let total = 0;
    for (const feat of OPTIONAL_FEATURE_DEFINITIONS) {
      if (selectedFeatures[feat.key]) {
        total += billingCycle === 'yearly' ? feat.yearlyPrice : feat.monthlyPrice;
      }
    }
    return total;
  };

  const totalCalculated = getTierBasePrice() + getFeaturesTotal();

  const handleToggleFeature = (key: OptionalFeatureKey) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLaunchPurchase = () => {
    const slug = subdomainSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'myschool';
    const draft: Partial<TenantSchoolApp> = {
      id: `tenant-${slug}-${Date.now().toString().slice(-4)}`,
      appId: `CF-2026-${slug.toUpperCase().substring(0, 6)}-${Math.floor(100 + Math.random() * 900)}`,
      schoolName,
      schoolSlug: slug,
      subdomain: `${slug}.curriculumflow.com`,
      customDomain: domainMode === 'custom_nira' ? customDomainName : undefined,
      customDomainStatus: domainMode === 'custom_nira' ? 'dns_pending' : 'verified_active',
      locationState,
      country: 'Nigeria',
      address,
      principalName,
      principalEmail,
      principalPhone,
      ictAdminName,
      ictAdminEmail,
      businessModel: billingCycle,
      subscriptionTier: selectedTier,
      subscriptionPricePerMonth: billingCycle === 'monthly' ? totalCalculated : Math.round(totalCalculated / 12),
      subscriptionPricePerYear: billingCycle === 'yearly' ? totalCalculated : totalCalculated * 12,
      currency: 'NGN',
      status: 'active',
      gracePeriodDays: 14,
      autoRenew: true,
      studentCapacity: selectedTier === 'Apex Enterprise' ? 3000 : selectedTier === 'Pro College' ? 1500 : 500,
      activeStudentsCount: 420,
      facultyCount: 38,
      storageUsageMb: 24,
      maxStorageMb: selectedTier === 'Apex Enterprise' ? 20480 : 10240,
      uptimePercent90Days: 99.98,
      lastActiveTimestamp: new Date().toISOString(),
      databaseShardId: `db_${slug}`,
      databaseIsolationType: 'isolated_tenant_schema',
      clonedFromTemplateVersion: '1.4.2',
      enabledFeatures: selectedFeatures,
      rateLimitReqPerMin: 1200,
      createdAt: new Date().toISOString(),
      clonedByAdmin: 'Self-Service Proprietor Engine',
      licenseHash: Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      auditLogsCount: 1,
      publishableKey: `cf_pub_live_${Math.random().toString(36).substring(2, 12)}`,
      appSecret: `cf_sec_live_${Math.random().toString(36).substring(2, 20)}`,
      brandProfile: {
        ...INITIAL_SCHOOL_BRAND,
        schoolName,
        motto: 'Excellence in Education and Character',
        establishedYear: 2008,
        contact: {
          ...INITIAL_SCHOOL_BRAND.contact,
          primaryEmail: principalEmail,
          primaryPhone: principalPhone,
          officialWebsite: `https://${slug}.curriculumflow.com`
        }
      }
    };

    onStartProvisioning(draft);
  };

  return (
    <div className="space-y-16 animate-fadeIn pb-20">
      
      {/* HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-8 sm:p-14 text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CurriculumFlow Multi-Tenant SaaS Control Plane</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight">
          Sovereign Educational Infrastructure for Nigerian Schools
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Provision completely isolated Docker containers, dedicated PostgreSQL databases, NiRA <code className="text-emerald-400 font-mono">.sch.ng</code> domains, and official NERDC curriculum compliance in seconds.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="#provision-engine"
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-emerald-950/50 flex items-center gap-2 cursor-pointer"
          >
            <span>Provision School Instance</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <button
            onClick={onEnterControlPlane}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Admin Control Plane Cockpit</span>
          </button>

          <button
            onClick={onOpenIsolationTests}
            className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Run Isolation Tests (Section 34)</span>
          </button>
        </div>

        {/* Value Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-4xl mx-auto text-left">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Database className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-100">Isolated PostgreSQL</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Zero cross-tenant data leakage. Dedicated schema per school.</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Cpu className="w-5 h-5 text-teal-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-100">Docker Per Tenant</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Isolated worker threads & noisy neighbor quota throttling.</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Globe className="w-5 h-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-100">NiRA .sch.ng Domains</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated TLS 1.3 certificates & Anycast edge DNS routing.</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Award className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-100">Lease-to-Own Option</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">24-month equity path to perpetual source-code buyout.</p>
          </div>
        </div>
      </section>

      {/* PROVISIONING CUSTOMER JOURNEY WIZARD */}
      <section id="provision-engine" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-10 shadow-2xl">
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Interactive Provisioning Wizard</span>
            <h2 className="text-2xl font-black text-slate-100 mt-1">Configure & Instant-Provision School Campus</h2>
            <p className="text-xs text-slate-400 mt-1">Select plan tier, modular features, domain name, and school contact profile.</p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${billingCycle === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <span>Annual Prepaid</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-400 text-slate-950 font-bold">SAVE 25%</span>
            </button>
            <button
              onClick={() => setBillingCycle('lease_to_own')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${billingCycle === 'lease_to_own' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Lease-to-Own (24 mo)
            </button>
          </div>
        </div>

        {/* STEP 1: SELECT PLAN TIER */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
            <span>Select Core Subscription Tier</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                tier: 'Starter Academy',
                desc: 'For growing primary & junior secondary schools.',
                capacity: '500 Students',
                monthly: '₦180,000 / mo',
                yearly: '₦1,800,000 / yr'
              },
              {
                tier: 'Pro College',
                desc: 'Full K-12 secondary schools with CBT & lesson notes.',
                capacity: '1,500 Students',
                monthly: '₦320,000 / mo',
                yearly: '₦3,200,000 / yr',
                popular: true
              },
              {
                tier: 'Apex Enterprise',
                desc: 'Multi-campus institutions with dedicated Redis & SLA.',
                capacity: '3,000+ Students',
                monthly: '₦550,000 / mo',
                yearly: '₦5,500,000 / yr'
              },
              {
                tier: 'Bespoke Lease-to-Own',
                desc: 'Build equity each month towards perpetual ownership.',
                capacity: '2,000 Students',
                monthly: '₦350,000 / mo',
                yearly: '₦4,200,000 / yr'
              }
            ].map(plan => {
              const isSelected = selectedTier === plan.tier;
              return (
                <div
                  key={plan.tier}
                  onClick={() => setSelectedTier(plan.tier as any)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/30' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow">
                      MOST POPULAR
                    </span>
                  )}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-100 text-base">{plan.tier}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{plan.desc}</p>
                    <span className="inline-block px-2 py-0.5 bg-slate-900 text-emerald-400 rounded text-[10px] font-semibold">
                      Cap: {plan.capacity}
                    </span>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/80">
                    <p className="text-base font-mono font-bold text-emerald-400">
                      {billingCycle === 'yearly' ? plan.yearly : plan.monthly}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 2: MODULAR FEATURE ADD-ONS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>Modular Optional Feature Selection</span>
            </h3>
            <span className="text-xs text-slate-400">
              {Object.values(selectedFeatures).filter(Boolean).length} features enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPTIONAL_FEATURE_DEFINITIONS.map(feat => {
              const isEnabled = Boolean(selectedFeatures[feat.key]);
              return (
                <div
                  key={feat.key}
                  onClick={() => handleToggleFeature(feat.key)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isEnabled ? 'bg-slate-950 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">{feat.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono bg-slate-800 text-slate-300">
                        {feat.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{feat.shortDesc}</p>
                    <span className="text-[11px] text-emerald-400 font-mono font-medium">
                      +₦{(billingCycle === 'yearly' ? feat.yearlyPrice : feat.monthlyPrice).toLocaleString()} / {billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>

                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isEnabled ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-800'}`}>
                    {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 3: SCHOOL INFO & DOMAIN */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
            <span>School Institutional Profile & Custom Domain</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">School Legal Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">State / Territory</label>
              <input
                type="text"
                value={locationState}
                onChange={e => setLocationState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Principal / Head of School</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Principal Email (Admin Ingress)</label>
              <input
                type="email"
                value={principalEmail}
                onChange={e => setPrincipalEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">ICT Admin / Director Name</label>
              <input
                type="text"
                value={ictAdminName}
                onChange={e => setIctAdminName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">ICT Admin Email</label>
              <input
                type="email"
                value={ictAdminEmail}
                onChange={e => setIctAdminEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Domain Picker */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="domainMode"
                  checked={domainMode === 'subdomain'}
                  onChange={() => setDomainMode('subdomain')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold">Free Platform Subdomain</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="domainMode"
                  checked={domainMode === 'custom_nira'}
                  onChange={() => setDomainMode('custom_nira')}
                  className="accent-emerald-500"
                />
                <span className="font-semibold">NiRA Sovereign .sch.ng / Custom Domain</span>
              </label>
            </div>

            {domainMode === 'subdomain' ? (
              <div className="flex items-center max-w-md bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={subdomainSlug}
                  onChange={e => setSubdomainSlug(e.target.value)}
                  className="bg-transparent text-slate-100 text-xs focus:outline-none flex-1 font-mono"
                  placeholder="myschool"
                />
                <span className="text-slate-400 font-mono">.curriculumflow.com</span>
              </div>
            ) : (
              <div className="flex items-center max-w-md bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={customDomainName}
                  onChange={e => setCustomDomainName(e.target.value)}
                  className="bg-transparent text-slate-100 text-xs focus:outline-none flex-1 font-mono"
                  placeholder="portal.myschool.sch.ng"
                />
              </div>
            )}
          </div>
        </div>

        {/* ORDER SUMMARY & PROVISION BUTTON */}
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-inner">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Calculated Investment</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                ₦{totalCalculated.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">
                / {billingCycle === 'yearly' ? 'year (prepaid)' : billingCycle === 'monthly' ? 'month' : 'month (Lease-to-Own)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Includes isolated PostgreSQL schema, Docker stack, Let's Encrypt TLS 1.3, and automatic daily snapshots.
            </p>
          </div>

          <button
            onClick={handleLaunchPurchase}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Terminal className="w-5 h-5" />
            <span>Pay & Trigger 12-Step Provisioning</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </section>

    </div>
  );
};
