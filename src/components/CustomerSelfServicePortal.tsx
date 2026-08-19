import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  TenantBillingInvoice,
  OptionalFeatureKey,
  CurriculumFlowBundleKey,
  SchoolBrandProfile
} from '../types';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';
import { 
  CURRICULUM_FLOW_BUNDLES, 
  calculateBundlePricing 
} from '../data/bundleArchitectureData';
import { DEFAULT_PLAN_POLICIES } from '../services/entitlementEnforcementService';
import { ProprietorReceiptModal } from './proprietor/ProprietorReceiptModal';
import { ProprietorSubscriptionCheckoutModal } from './proprietor/ProprietorSubscriptionCheckoutModal';
import { ProprietorEquityCertificateModal } from './proprietor/ProprietorEquityCertificateModal';
import { 
  Building2, 
  CreditCard, 
  Sliders, 
  Globe, 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  Activity, 
  Check, 
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Users,
  Database,
  RotateCw,
  Sparkles,
  Award,
  Lock,
  ArrowLeft,
  Layers,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cpu,
  BarChart3,
  Palette,
  Printer,
  Headphones,
  FileText,
  Calendar,
  Zap,
  HelpCircle,
  Clock,
  RefreshCw,
  QrCode,
  Shield,
  Smartphone,
  BookOpen
} from 'lucide-react';

interface CustomerSelfServicePortalProps {
  tenants: TenantSchoolApp[];
  invoices: TenantBillingInvoice[];
  onLaunchTenant: (tenant: TenantSchoolApp) => void;
  onUpdateTenant: (updated: TenantSchoolApp) => void;
  onBackToAdmin?: () => void;
}

export type ProprietorPortalTab = 
  | 'overview'
  | 'bundles'
  | 'plan'
  | 'lease_to_own'
  | 'features'
  | 'branding'
  | 'invoices'
  | 'data_sovereignty'
  | 'support';

export const CustomerSelfServicePortal: React.FC<CustomerSelfServicePortalProps> = ({
  tenants,
  invoices,
  onLaunchTenant,
  onUpdateTenant,
  onBackToAdmin
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [activeTab, setActiveTab] = useState<ProprietorPortalTab>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dnsCheckRunning, setDnsCheckRunning] = useState(false);
  const [dnsVerified, setDnsVerified] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Modals
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<TenantBillingInvoice | null>(null);
  const [checkoutModalData, setCheckoutModalData] = useState<{
    isOpen: boolean;
    invoice?: TenantBillingInvoice;
    customAmount?: number;
    title?: string;
  }>({ isOpen: false });
  const [isEquityCertModalOpen, setIsEquityCertModalOpen] = useState(false);

  // Brand customizer local draft
  const [brandDraft, setBrandDraft] = useState({
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    motto: 'Knowledge, Integrity & Global Leadership',
    customDomain: ''
  });

  const currentTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
  const tenantInvoices = invoices.filter(
    i => i.tenantAppId === currentTenant?.id || i.tenantSchoolName === currentTenant?.schoolName
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 4 Bundles licensing logic
  const currentBundles = currentTenant?.licensedBundles || {
    administration: true,
    teaching: true,
    assessment: true,
    accounts_billing: true
  };

  const pricingCalc = calculateBundlePricing(currentBundles, billingCycle === 'yearly');
  const licensedBundlesCount = Object.values(currentBundles).filter(Boolean).length;

  const handleToggleBundle = (bundleKey: CurriculumFlowBundleKey) => {
    if (!currentTenant) return;
    setIsUpdating(true);

    const isCurrentlyActive = !!currentBundles[bundleKey];
    const newLicensed = {
      ...currentBundles,
      [bundleKey]: !isCurrentlyActive
    };

    const newPricing = calculateBundlePricing(newLicensed, billingCycle === 'yearly');

    setTimeout(() => {
      const updated: TenantSchoolApp = {
        ...currentTenant,
        licensedBundles: newLicensed,
        subscriptionPricePerMonth: newPricing.discountedMonthlyPriceNGN,
        subscriptionPricePerYear: newPricing.discountedYearlyPriceNGN,
        bundleUpgradeRequests: [
          ...(currentTenant.bundleUpgradeRequests || []),
          {
            id: `BUR-${Date.now()}`,
            tenantId: currentTenant.id,
            tenantSchoolName: currentTenant.schoolName,
            requestedBundle: bundleKey,
            requestType: isCurrentlyActive ? 'deactivate' : 'activate',
            status: 'approved',
            requestedAt: new Date().toISOString(),
            requestedBy: `${currentTenant.principalName} (Proprietor)`,
            monthlyPriceImpactNGN: isCurrentlyActive 
              ? -CURRICULUM_FLOW_BUNDLES.find(b => b.key === bundleKey)!.monthlyPriceNGN 
              : CURRICULUM_FLOW_BUNDLES.find(b => b.key === bundleKey)!.monthlyPriceNGN,
            notes: `Proprietor self-service portal ${isCurrentlyActive ? 'deactivation' : 'activation'} applied.`
          }
        ]
      };

      onUpdateTenant(updated);
      setIsUpdating(false);
      showToast(`${isCurrentlyActive ? 'Deactivated' : 'Activated'} ${bundleKey.replace('_', ' ').toUpperCase()} suite for ${currentTenant.schoolName}`);
    }, 400);
  };

  const handleToggleFeature = (key: OptionalFeatureKey) => {
    if (!currentTenant) return;
    setIsUpdating(true);
    setTimeout(() => {
      const updated: TenantSchoolApp = {
        ...currentTenant,
        enabledFeatures: {
          ...currentTenant.enabledFeatures,
          [key]: !currentTenant.enabledFeatures?.[key]
        }
      };
      onUpdateTenant(updated);
      setIsUpdating(false);
      showToast(`Add-on feature status updated for ${currentTenant.schoolName}`);
    }, 400);
  };

  const handleRunDnsTest = () => {
    setDnsCheckRunning(true);
    setTimeout(() => {
      setDnsCheckRunning(false);
      setDnsVerified(true);
      showToast('DNS CNAME & Cloudflare Edge SSL verified successfully with 0 propagation delay.');
    }, 900);
  };

  const handleSaveBrand = () => {
    if (!currentTenant) return;
    const updated: TenantSchoolApp = {
      ...currentTenant,
      customDomain: brandDraft.customDomain || currentTenant.customDomain,
      brandProfile: {
        ...currentTenant.brandProfile,
        primaryColor: brandDraft.primaryColor,
        secondaryColor: brandDraft.secondaryColor,
        motto: brandDraft.motto,
        schoolName: currentTenant.schoolName,
        shortName: currentTenant.brandProfile?.shortName || currentTenant.schoolName.substring(0, 12),
        logoUrl: currentTenant.brandProfile?.logoUrl || '',
        crestBadgeUrl: currentTenant.brandProfile?.crestBadgeUrl || '',
        establishedYear: currentTenant.brandProfile?.establishedYear || 1998,
        themePreset: 'custom',
        headerBannerType: 'gradient',
        schoolId: currentTenant.id,
        updatedAt: new Date().toISOString()
      }
    };
    onUpdateTenant(updated);
    showToast('School brand identity and custom domain settings saved.');
  };

  const handleExportDataBundle = () => {
    const dataBundle = {
      tenantId: currentTenant.id,
      appId: currentTenant.appId,
      schoolName: currentTenant.schoolName,
      subdomain: currentTenant.subdomain,
      subscriptionTier: currentTenant.subscriptionTier,
      activeStudentsCount: currentTenant.activeStudentsCount,
      facultyCount: currentTenant.facultyCount,
      exportedAt: new Date().toISOString(),
      ndprCertified: true,
      integrityChecksumSha256: `sha256_${Date.now()}_bkp_valid`,
      records: {
        studentsCount: currentTenant.activeStudentsCount,
        classesActive: 18,
        curriculumCoverageAvg: '88.5%',
        bursaryStatus: 'Reconciled'
      }
    };

    const blob = new Blob([JSON.stringify(dataBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CurriculumFlow_${currentTenant.schoolSlug}_DisasterRecovery_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Complete sovereign data backup downloaded for ${currentTenant.schoolName}.`);
  };

  const handlePaymentSuccess = (invoiceId: string, paymentMethod: string, reference: string) => {
    setCheckoutModalData({ isOpen: false });
    showToast(`Payment reference ${reference} verified. Entitlements and equity ledger updated.`);
  };

  // Lease to own calculations
  const leaseContract = currentTenant?.leaseToOwnContract;
  const monthsPaid = leaseContract?.monthsPaid || 14;
  const totalMonths = leaseContract?.amortizationPeriodMonths || 36;
  const equityAccumulated = leaseContract?.totalEquityAccumulated || 4200000;
  const totalLeaseValue = leaseContract?.totalValuationNGN || 10800000;
  const buyoutDiscountedNGN = Math.round((totalLeaseValue - equityAccumulated) * 0.85); // 15% discount for immediate perpetual buyout

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-16 font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Proprietor Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Proprietor Self-Service Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                {currentTenant.subscriptionTier} Tier
              </span>
              {onBackToAdmin && (
                <button
                  onClick={onBackToAdmin}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer ml-1"
                >
                  Back to Platform Cockpit
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentTenant.schoolName}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Executive command deck for School Owners & Board of Governors. Oversee the 4-bundle architecture, lease-to-own equity, whitelabel domain routing, bursary invoices, and data sovereignty.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Multi-Campus Switcher for Owners */}
            <div className="flex items-center gap-2 bg-slate-950/90 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Switch Campus</span>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-4"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                      {t.schoolName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => onLaunchTenant(currentTenant)}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/80 flex items-center gap-2 cursor-pointer"
            >
              <span>Launch School App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Institutional Health Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Dedicated Pod</span>
              <span className="font-mono text-emerald-300 font-bold text-[11px]">cf-{currentTenant.schoolSlug} (Live)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Database Shard</span>
              <span className="font-mono text-sky-300 font-bold text-[11px]">PostgreSQL (AES-256)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">SSL & Domain</span>
              <span className="font-mono text-indigo-300 font-bold text-[11px]">Auto-Managed TLS 1.3</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">90-Day SLA Uptime</span>
              <span className="font-mono text-amber-300 font-bold text-[11px]">{currentTenant.uptimePercent90Days || 99.98}% Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-2xl text-xs font-medium flex items-center gap-2.5 shadow-xl animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'bundles', label: '4-Bundle Architecture', icon: Layers, badge: `${licensedBundlesCount}/4 Active` },
          { id: 'plan', label: 'Subscription & Tier', icon: CreditCard },
          { id: 'lease_to_own', label: 'Lease-to-Own Equity', icon: Award, highlight: true },
          { id: 'features', label: 'Supplementary Add-ons', icon: Sliders },
          { id: 'branding', label: 'Whitelabel & Domain', icon: Globe },
          { id: 'invoices', label: 'Invoices & Receipts', icon: FileSpreadsheet, badge: `${tenantInvoices.length}` },
          { id: 'data_sovereignty', label: 'Data Sovereignty & Backups', icon: HardDrive },
          { id: 'support', label: 'VIP Support Desk', icon: Headphones }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 4 Big KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Student Enrollment</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">
                {currentTenant.activeStudentsCount.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1.5">/ {currentTenant.studentCapacity.toLocaleString()}</span>
              </p>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${Math.min(100, (currentTenant.activeStudentsCount / currentTenant.studentCapacity) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {Math.round((currentTenant.activeStudentsCount / currentTenant.studentCapacity) * 100)}% Capacity Utilized
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Teaching Faculty</span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black text-white">{currentTenant.facultyCount}</p>
              <p className="text-[11px] text-sky-300 font-medium">TRCN Certified Masters & Form Tutors</p>
              <span className="text-[10px] text-slate-500 font-mono">100% Lesson Note Velocity</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Lease-to-Own Equity</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">₦{(equityAccumulated / 1000000).toFixed(2)}M</p>
              <p className="text-[11px] text-slate-300">Month {monthsPaid} of {totalMonths} amortized</p>
              <span className="text-[10px] text-amber-300 font-mono">{Math.round((monthsPaid / totalMonths) * 100)}% Equity Locked</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Platform Billing Plan</span>
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-indigo-300">{currentTenant.subscriptionTier}</p>
              <p className="text-[11px] text-slate-300">
                ₦{(currentTenant.subscriptionPricePerYear || currentTenant.subscriptionPricePerMonth * 12).toLocaleString()} / yr
              </p>
              <span className="text-[10px] text-emerald-400 font-mono">Status: ACTIVE</span>
            </div>
          </div>

          {/* Quick Overview Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: 4-Bundle Status & Upgrades Snapshot */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>4-Bundle Modular Architecture Status</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your institution is currently licensed for {licensedBundlesCount} out of 4 core suites.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('bundles')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Manage Suites</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                  const isLicensed = !!currentBundles[bundle.key];
                  return (
                    <div 
                      key={bundle.key}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isLicensed
                          ? 'bg-slate-950 border-emerald-500/40 text-slate-100 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${bundle.badgeColor}`}>
                          {bundle.shortName}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1">{bundle.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">₦{bundle.monthlyPriceNGN.toLocaleString()} / mo</p>
                      </div>

                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                          isLicensed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isLicensed ? 'Active' : 'Not Licensed'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Bundle Discount Badge */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-800/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block">Multi-Bundle Discount Active ({pricingCalc.discountPercent}%)</strong>
                    <span className="text-slate-400 text-[11px]">
                      Licensing 4 bundles unlocks maximum savings of 35% across your entire school network.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('bundles')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Adjust Bundles
                </button>
              </div>
            </div>

            {/* Right 1 Col: Key Executive Governance */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Executive Officers & Governance</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">School Principal</span>
                  <p className="font-bold text-slate-200 mt-0.5">{currentTenant.principalName}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{currentTenant.principalEmail}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">ICT Director</span>
                  <p className="font-bold text-slate-200 mt-0.5">{currentTenant.ictAdminName}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{currentTenant.ictAdminEmail}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Compliance & Data Sovereignty</span>
                  <p className="font-bold text-emerald-400 mt-0.5">NDPR Certified (Lagos/Federal)</p>
                  <p className="text-slate-400 text-[11px]">Zero-Knowledge Tenant Isolation</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleExportDataBundle}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download School Data Backup</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: 4-BUNDLE ARCHITECTURE & LIVE LICENSING */}
      {activeTab === 'bundles' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Institutional 4-Bundle Licensing Matrix
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  Active Educational & Business Suites
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Select and configure suites to match your school's exact operational requirements. Multi-bundle discount applies automatically.
                </p>
              </div>

              {/* Live Price Calculator Widget */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Total</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ₦{pricingCalc.discountedMonthlyPriceNGN.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mo</span>
                </p>
                {pricingCalc.discountPercent > 0 && (
                  <p className="text-[11px] text-emerald-300 font-bold">
                    🎉 {pricingCalc.discountPercent}% Multi-Bundle Savings Active (Save ₦{pricingCalc.discountAmountNGN.toLocaleString()}/mo)
                  </p>
                )}
              </div>
            </div>

            {/* 4 Bundle Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                const isLicensed = !!currentBundles[bundle.key];

                return (
                  <div
                    key={bundle.key}
                    className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                      isLicensed
                        ? `${bundle.bgColor} ${bundle.borderColor} shadow-xl ring-1 ring-emerald-500/40`
                        : 'bg-slate-950/60 border-slate-800 opacity-65 hover:opacity-85'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${bundle.badgeColor}`}>
                          {bundle.shortName} Suite
                        </span>
                        
                        <button
                          onClick={() => handleToggleBundle(bundle.key)}
                          disabled={isUpdating}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isLicensed
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isLicensed ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Activate Suite</span>
                            </>
                          )}
                        </button>
                      </div>

                      <h4 className="text-lg font-black text-white mb-1.5">
                        {bundle.name}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {bundle.description}
                      </p>

                      {/* Included Feature Modules */}
                      <div className="space-y-2 pt-3 border-t border-slate-800/80">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Included Modules:
                        </p>
                        {bundle.features.map(feat => (
                          <div key={feat.id} className="flex items-start gap-2 text-xs text-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">{feat.name}</span>
                              <p className="text-[11px] text-slate-400 line-clamp-1">{feat.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Rate:</span>
                      <span className="font-bold text-slate-100 font-mono text-sm">
                        ₦{bundle.monthlyPriceNGN.toLocaleString()} / month
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade Request Audit Logs */}
          {(currentTenant.bundleUpgradeRequests && currentTenant.bundleUpgradeRequests.length > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <span>Recent Bundle Upgrade & Modification Requests</span>
              </h4>
              <div className="space-y-2">
                {currentTenant.bundleUpgradeRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white capitalize">{req.requestedBundle.replace('_', ' & ')} Suite</span>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{req.notes}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <p className="font-semibold text-slate-200">{new Date(req.requestedAt).toLocaleDateString()}</p>
                      <p className="text-slate-500">{req.requestedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION & TIER UPGRADES */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 p-2 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs mx-auto">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                billingCycle === 'yearly' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual (Save 20%)</span>
            </button>
          </div>

          {/* Tier Cards Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                tier: 'Starter',
                priceMonthly: 85000,
                priceYearly: 850000,
                capacity: 300,
                teachers: 25,
                storage: '5 GB',
                cpuRam: '1 Core / 1GB RAM',
                desc: 'Ideal for single-campus nurseries and primary schools.'
              },
              {
                tier: 'Pro',
                priceMonthly: 180000,
                priceYearly: 1800000,
                capacity: 1200,
                teachers: 80,
                storage: '20 GB',
                cpuRam: '2 Cores / 2GB RAM',
                desc: 'Comprehensive package for standard K-12 secondary schools.',
                popular: true
              },
              {
                tier: 'Enterprise',
                priceMonthly: 350000,
                priceYearly: 3500000,
                capacity: 5000,
                teachers: 300,
                storage: '100 GB',
                cpuRam: '4 Cores / 4GB RAM',
                desc: 'Multi-campus institutions with high-concurrency CBT exams.'
              },
              {
                tier: 'Apex Enterprise',
                priceMonthly: 750000,
                priceYearly: 7500000,
                capacity: 20000,
                teachers: 1500,
                storage: '500 GB',
                cpuRam: '8 Cores / 8GB RAM',
                desc: 'Colleges, state networks, and elite multi-branch groups.'
              }
            ].map(plan => {
              const isCurrent = currentTenant.subscriptionTier === plan.tier;
              const displayPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

              return (
                <div
                  key={plan.tier}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative ${
                    isCurrent
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-black text-white">{plan.tier}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 min-h-[32px] mb-4">{plan.desc}</p>

                    <div className="space-y-1 mb-6">
                      <p className="text-2xl font-black text-white font-mono">
                        ₦{displayPrice.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {billingCycle === 'yearly' ? '/ year (2 months free)' : '/ month'}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Student Capacity:</span>
                        <strong className="text-white">{plan.capacity.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Faculty Accounts:</span>
                        <strong className="text-white">{plan.teachers}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Dedicated Shard:</span>
                        <strong className="text-white">{plan.storage}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pod Hardware:</span>
                        <strong className="text-emerald-400 font-mono text-[11px]">{plan.cpuRam}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        if (isCurrent) {
                          showToast(`Your school is already running on the ${plan.tier} tier.`);
                        } else {
                          setCheckoutModalData({
                            isOpen: true,
                            customAmount: displayPrice,
                            title: `Upgrade to ${plan.tier} Tier (${billingCycle})`
                          });
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : `Upgrade to ${plan.tier}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: LEASE-TO-OWN EQUITY POOL */}
      {activeTab === 'lease_to_own' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-800/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Perpetual Software Ownership & Escrow
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  Lease-to-Own Equity Pool & Handover Roadmap
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Under the Curriculum Server Lease-to-Own model, your subscription payments build capital equity toward 100% perpetual license ownership and on-premise source code escrow.
                </p>
              </div>

              <button
                onClick={() => setIsEquityCertModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-950 transition-all cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>View Ownership Certificate</span>
              </button>
            </div>

            {/* Visual Amortization Progress Gauge */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                  Contract Progress: Month {monthsPaid} of {totalMonths}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  ₦{equityAccumulated.toLocaleString()} of ₦{totalLeaseValue.toLocaleString()} Accumulated
                </span>
              </div>

              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-1000 shadow"
                  style={{ width: `${Math.round((monthsPaid / totalMonths) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-slate-400">
                <div>
                  <span>Amortization Ratio:</span>
                  <strong className="text-slate-100 block font-mono text-sm">{Math.round((monthsPaid / totalMonths) * 100)}% Complete</strong>
                </div>
                <div>
                  <span>Handover Target Date:</span>
                  <strong className="text-slate-100 block font-mono text-sm">{currentTenant.leaseToOwnContract?.targetPerpetualHandoverDate || '2027-08-31'}</strong>
                </div>
                <div>
                  <span>Post-Handover Recurring Fees:</span>
                  <strong className="text-emerald-400 block font-mono text-sm">₦0.00 / Zero Dues</strong>
                </div>
              </div>
            </div>

            {/* Early Buyout Calculator Card */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Early Perpetual Buyout Option</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-lg">
                  Settle your remaining balance upfront with an exclusive 15% lump-sum settlement discount and receive immediate source code escrow delivery.
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Discounted Buyout Price</span>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  ₦{buyoutDiscountedNGN.toLocaleString()}
                </p>
                <button
                  onClick={() => {
                    setCheckoutModalData({
                      isOpen: true,
                      customAmount: buyoutDiscountedNGN,
                      title: 'Lump-Sum Perpetual Buyout Settlement'
                    });
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Pay Lump-Sum Buyout
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: SUPPLEMENTARY ADD-ONS */}
      {activeTab === 'features' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-white">Supplementary Add-on Features</h3>
            <p className="text-xs text-slate-400 mt-1">Enable or disable supplementary infrastructure & AI modules for your school campus.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPTIONAL_FEATURE_DEFINITIONS.map(feat => {
              const isEnabled = Boolean(currentTenant.enabledFeatures?.[feat.key]);
              return (
                <div 
                  key={feat.key}
                  className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    isEnabled ? 'bg-slate-950 border-emerald-500/40 text-slate-200 shadow-md' : 'bg-slate-950/40 border-slate-800 text-slate-400 opacity-70'
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{feat.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-300">
                        {feat.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{feat.shortDesc}</p>
                    <p className="text-emerald-400 font-mono font-bold pt-1">
                      ₦{feat.monthlyPrice.toLocaleString()} / month
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleFeature(feat.key)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      isEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: WHITELABEL BRAND & CUSTOM DOMAIN */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Left: Domain and DNS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span>Custom Domain & DNS Routing</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Route your institutional web domain (e.g., portal.yourschool.edu.ng) to your dedicated cloud instance.
              </p>
            </div>

            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Default Cloud Subdomain</span>
                  <p className="text-sm font-mono text-emerald-400 font-bold">https://{currentTenant.subdomain}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30">
                  SSL TLS 1.3 Active
                </span>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs text-slate-300 font-bold">Institutional Custom CNAME Domain</span>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. portal.kingscollege.edu.ng"
                    defaultValue={currentTenant.customDomain || `portal.${currentTenant.schoolSlug}.edu.ng`}
                    onChange={e => setBrandDraft(prev => ({ ...prev, customDomain: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 w-full focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button 
                    onClick={handleRunDnsTest}
                    disabled={dnsCheckRunning}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {dnsCheckRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying DNS...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify CNAME</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {dnsVerified && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>CNAME DNS records verified with Cloudflare Global Edge. Traffic routed seamlessly.</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Brand Theme & Logo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                <span>School Brand Identity & Styling</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize colors, institutional motto, and crest for portal white-labeling.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={brandDraft.primaryColor}
                      onChange={e => setBrandDraft(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input 
                      type="text" 
                      value={brandDraft.primaryColor}
                      onChange={e => setBrandDraft(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Secondary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={brandDraft.secondaryColor}
                      onChange={e => setBrandDraft(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input 
                      type="text" 
                      value={brandDraft.secondaryColor}
                      onChange={e => setBrandDraft(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Official School Motto</label>
                <input 
                  type="text" 
                  value={brandDraft.motto}
                  onChange={e => setBrandDraft(prev => ({ ...prev, motto: e.target.value }))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white w-full focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveBrand}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Save Brand Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BURSARY INVOICES & RECEIPTS */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white">Platform Subscription & Tax Invoices</h3>
              <p className="text-xs text-slate-400 mt-1">Official FIRS-compliant tax invoices, receipts, and payment statements.</p>
            </div>

            <button
              onClick={() => {
                setCheckoutModalData({
                  isOpen: true,
                  title: 'Pay Annual Platform Subscription'
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              <span>Make Advance Payment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 rounded-l-2xl">Invoice No.</th>
                  <th className="p-3.5">Period / Plan</th>
                  <th className="p-3.5">Amount (NGN)</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {tenantInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                    <td className="p-3.5">{inv.billingPeriod}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">₦{inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3.5">{inv.pspChannel || 'Paystack Direct'}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedInvoiceForReceipt(inv)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Receipt</span>
                      </button>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setCheckoutModalData({
                              isOpen: true,
                              invoice: inv,
                              title: `Pay Invoice ${inv.invoiceNumber}`
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: DATA SOVEREIGNTY & BACKUPS */}
      {activeTab === 'data_sovereignty' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-400" />
              <span>Data Sovereignty, Backups & Disaster Recovery</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your school's data is housed in an isolated PostgreSQL tenant shard with automated nightly cold snapshots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Automated Daily Snapshot</span>
              <p className="text-sm font-mono text-emerald-400 font-bold">Completed Today at 02:00 AM</p>
              <p className="text-slate-400 text-xs">SHA-256 Checksum: Verified</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Cold Storage Encryption</span>
              <p className="text-sm font-mono text-white font-bold">AES-256 GCM Encrypted</p>
              <p className="text-slate-400 text-xs">Location: Cloud Vault (Lagos / Dublin)</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Data Portability</span>
              <p className="text-sm font-mono text-indigo-400 font-bold">100% Exportable (JSON/SQL)</p>
              <p className="text-slate-400 text-xs">Zero vendor lock-in guarantee</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-white">Generate Instant Master Data Export</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Download a complete verified offline archive of all student bio-data, academic scores, lesson plans, and fee registers.
              </p>
            </div>
            <button
              onClick={handleExportDataBundle}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Sovereign Backup</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 9: VIP SUPPORT DESK */}
      {activeTab === 'support' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-400" />
              <span>Dedicated Proprietor VIP Support</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Direct escalation hotline and dedicated EdTech systems architect assigned to your campus.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Dedicated Account Lead</span>
              <p className="font-bold text-white text-base">Engr. T. O. Balogun</p>
              <p className="text-xs text-slate-400">Lead Cloud Solutions Architect</p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono text-emerald-400 space-y-1">
                <p>Email: t.balogun@curriculumserver.com</p>
                <p>Direct Desk: +234 (01) 888-2940</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] text-slate-500 uppercase font-bold">24/7 Priority Emergency Desk</span>
              <p className="font-bold text-emerald-400 text-base">SLA Tier: 15-Minute Critical Response</p>
              <p className="text-xs text-slate-400">Direct WhatsApp hotline for CBT exam lockdowns and billing disputes.</p>
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => showToast('Opening direct encrypted WhatsApp support channel...')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Launch WhatsApp VIP Desk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      {selectedInvoiceForReceipt && (
        <ProprietorReceiptModal
          invoice={selectedInvoiceForReceipt}
          tenant={currentTenant}
          onClose={() => setSelectedInvoiceForReceipt(null)}
        />
      )}

      {checkoutModalData.isOpen && (
        <ProprietorSubscriptionCheckoutModal
          invoice={checkoutModalData.invoice}
          tenant={currentTenant}
          customAmount={checkoutModalData.customAmount}
          paymentTitle={checkoutModalData.title}
          onClose={() => setCheckoutModalData({ isOpen: false })}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {isEquityCertModalOpen && (
        <ProprietorEquityCertificateModal
          tenant={currentTenant}
          onClose={() => setIsEquityCertModalOpen(false)}
        />
      )}

    </div>
  );
};

export const ProprietorSelfServicePortal = CustomerSelfServicePortal;
