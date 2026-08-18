import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  TenantBillingInvoice,
  OptionalFeatureKey,
  CurriculumFlowBundleKey
} from '../types';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';
import { 
  CURRICULUM_FLOW_BUNDLES, 
  calculateBundlePricing 
} from '../data/bundleArchitectureData';
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
  AlertCircle
} from 'lucide-react';

interface CustomerSelfServicePortalProps {
  tenants: TenantSchoolApp[];
  invoices: TenantBillingInvoice[];
  onLaunchTenant: (tenant: TenantSchoolApp) => void;
  onUpdateTenant: (updated: TenantSchoolApp) => void;
  onBackToAdmin?: () => void;
}

export const CustomerSelfServicePortal: React.FC<CustomerSelfServicePortalProps> = ({
  tenants,
  invoices,
  onLaunchTenant,
  onUpdateTenant,
  onBackToAdmin
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'bundles' | 'plan' | 'features' | 'invoices' | 'domain' | 'health'>('bundles');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedUpgradeBundle, setSelectedUpgradeBundle] = useState<CurriculumFlowBundleKey | null>(null);

  const currentTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];
  const tenantInvoices = invoices.filter(i => i.tenantAppId === currentTenant?.id || i.tenantSchoolName === currentTenant?.schoolName);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleBundle = (bundleKey: CurriculumFlowBundleKey) => {
    if (!currentTenant) return;
    setIsUpdating(true);

    const currentLicensed = currentTenant.licensedBundles || {
      administration: true,
      teaching: true,
      assessment: true,
      accounts_billing: true
    };

    const isCurrentlyActive = !!currentLicensed[bundleKey];
    const newLicensed = {
      ...currentLicensed,
      [bundleKey]: !isCurrentlyActive
    };

    // Calculate new price
    const newPricing = calculateBundlePricing(newLicensed, currentTenant.businessModel === 'yearly');

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
            monthlyPriceImpactNGN: isCurrentlyActive ? -CURRICULUM_FLOW_BUNDLES.find(b => b.key === bundleKey)!.monthlyPriceNGN : CURRICULUM_FLOW_BUNDLES.find(b => b.key === bundleKey)!.monthlyPriceNGN,
            notes: `Self-service portal ${isCurrentlyActive ? 'deactivation' : 'activation'} request applied.`
          }
        ]
      };

      onUpdateTenant(updated);
      setIsUpdating(false);
      showToast(`${isCurrentlyActive ? 'Deactivated' : 'Activated'} ${bundleKey.replace('_', ' ').toUpperCase()} bundle for ${currentTenant.schoolName}`);
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
          [key]: !currentTenant.enabledFeatures[key]
        }
      };
      onUpdateTenant(updated);
      setIsUpdating(false);
      showToast(`Feature status updated for ${currentTenant.schoolName}`);
    }, 400);
  };

  const currentBundles = currentTenant?.licensedBundles || {
    administration: true,
    teaching: true,
    assessment: true,
    accounts_billing: true
  };

  const pricingCalc = calculateBundlePricing(currentBundles, currentTenant?.businessModel === 'yearly');
  const licensedBundlesCount = Object.values(currentBundles).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      
      {/* Top Proprietor Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              School Proprietor Self-Service Portal
            </span>
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Back to Master Console
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
            {currentTenant.schoolName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your school’s 4-bundle architecture (Administration, Teaching, Assessment, Accounts & Billing), subscription billing, and domain routing.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Tenant Switcher for Multi-Campus Proprietors */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.schoolName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onLaunchTenant(currentTenant)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
          >
            <span>Open Academic App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-lg animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'bundles', label: '4-Bundle Architecture & Upgrades', icon: Layers },
          { id: 'plan', label: 'Subscription & Tier', icon: CreditCard },
          { id: 'features', label: 'Supplementary Add-ons', icon: Sliders },
          { id: 'invoices', label: 'Invoices & Receipts', icon: FileSpreadsheet },
          { id: 'domain', label: 'School Domain & DNS', icon: Globe },
          { id: 'health', label: 'Platform Health & Status', icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: 4 BUNDLE ARCHITECTURE & UPGRADES */}
      {activeTab === 'bundles' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Self-Service Bundle Provisioning
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  Active Educational & Business Suites
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select any combination of bundles. Add or remove suites dynamically; multi-bundle discounts update instantly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                <span className="text-xs text-slate-400">Total Bundle Subtotal</span>
                <p className="text-xl font-black text-emerald-400">
                  ₦{pricingCalc.discountedMonthlyPriceNGN.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mo</span>
                </p>
                {pricingCalc.discountPercent > 0 && (
                  <p className="text-[10px] text-emerald-300 font-bold mt-0.5">
                    {pricingCalc.discountPercent}% Multi-Bundle Savings Active
                  </p>
                )}
              </div>
            </div>

            {/* 4 Bundle Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                const isLicensed = !!currentBundles[bundle.key];

                return (
                  <div
                    key={bundle.key}
                    className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                      isLicensed
                        ? `${bundle.bgColor} ${bundle.borderColor} shadow-lg ring-1 ring-emerald-500/30`
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${bundle.badgeColor}`}>
                          {bundle.shortName} Suite
                        </span>
                        
                        <button
                          onClick={() => handleToggleBundle(bundle.key)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isLicensed
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
                              <span>Upgrade to Enable</span>
                            </>
                          )}
                        </button>
                      </div>

                      <h4 className="text-base font-black text-white mb-1">
                        {bundle.name}
                      </h4>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4">
                        {bundle.description}
                      </p>

                      {/* Included Features */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Included Modules:
                        </p>
                        {bundle.features.map(feat => (
                          <div key={feat.id} className="flex items-center gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{feat.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Rate:</span>
                      <span className="font-bold text-slate-200">
                        ₦{bundle.monthlyPriceNGN.toLocaleString()} / mo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade Request Audit Logs */}
          {(currentTenant.bundleUpgradeRequests && currentTenant.bundleUpgradeRequests.length > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <span>Recent Bundle Upgrade & Modification Requests</span>
              </h4>
              <div className="space-y-2">
                {currentTenant.bundleUpgradeRequests.map(req => (
                  <div key={req.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white capitalize">{req.requestedBundle.replace('_', ' & ')}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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

      {/* TAB 2: PLAN */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Active Tier</span>
                <h3 className="text-2xl font-black text-slate-100 mt-1">{currentTenant.subscriptionTier}</h3>
                <p className="text-xs text-slate-400 mt-1">Capacity: Up to {currentTenant.studentCapacity.toLocaleString()} students • {currentTenant.facultyCount} Teachers</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
                ACTIVE
              </span>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Billing Cycle & Price</span>
                <p className="text-lg font-bold text-slate-100 mt-0.5">
                  ₦{(currentTenant.subscriptionPricePerYear || currentTenant.subscriptionPricePerMonth * 12).toLocaleString()} / year
                </p>
                <p className="text-[11px] text-slate-400">Next renewal date: {currentTenant.subscriptionRenewDate || '2027-08-31'}</p>
              </div>
              <button 
                onClick={() => showToast('Upgrade request dispatched to platform billing manager.')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Change Plan
              </button>
            </div>

            {currentTenant.leaseToOwnContract && (
              <div className="p-5 bg-amber-950/20 border border-amber-800/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Lease-to-Own Equity Pool
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {currentTenant.leaseToOwnContract.monthsPaid} of {currentTenant.leaseToOwnContract.amortizationPeriodMonths} Months Paid
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full" 
                    style={{ width: `${(currentTenant.leaseToOwnContract.monthsPaid / currentTenant.leaseToOwnContract.amortizationPeriodMonths) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1">
                  <span>Accumulated Equity: <strong className="text-slate-200">₦{currentTenant.leaseToOwnContract.totalEquityAccumulated.toLocaleString()}</strong></span>
                  <span>Target Handover: <strong className="text-slate-200">{currentTenant.leaseToOwnContract.targetPerpetualHandoverDate}</strong></span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>School Administrators</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Principal</span>
                <p className="font-semibold text-slate-200 mt-0.5">{currentTenant.principalName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{currentTenant.principalEmail}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">ICT Director</span>
                <p className="font-semibold text-slate-200 mt-0.5">{currentTenant.ictAdminName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{currentTenant.ictAdminEmail}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODULAR FEATURES */}
      {activeTab === 'features' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Supplementary Add-on Features</h3>
            <p className="text-xs text-slate-400 mt-1">Enable or disable supplementary infrastructure & AI modules for your school campus.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPTIONAL_FEATURE_DEFINITIONS.map(feat => {
              const isEnabled = Boolean(currentTenant.enabledFeatures?.[feat.key]);
              return (
                <div 
                  key={feat.key}
                  className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    isEnabled ? 'bg-slate-950 border-emerald-500/40 text-slate-200' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{feat.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-300">
                        {feat.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{feat.shortDesc}</p>
                    <p className="text-emerald-400 font-mono font-semibold pt-1">
                      ₦{feat.monthlyPrice.toLocaleString()}/month
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

      {/* TAB 4: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Bursary & Subscription Invoices</h3>
              <p className="text-xs text-slate-400 mt-1">Official receipts, billing statements, and tax invoices.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Invoice No.</th>
                  <th className="p-3.5">Period / Plan</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {tenantInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-100">{inv.invoiceNumber}</td>
                    <td className="p-3.5">{inv.billingPeriod}</td>
                    <td className="p-3.5 font-bold text-slate-100">₦{inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3.5">{inv.pspChannel || 'Direct Bank Wire'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button 
                        onClick={() => showToast(`Receipt ${inv.invoiceNumber} downloaded.`)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DOMAIN */}
      {activeTab === 'domain' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Custom Domain Configuration</h3>
            <p className="text-xs text-slate-400 mt-1">Route your institutional web domain (e.g. portal.yourschool.edu.ng) to your CurriculumFlow cloud instance.</p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-medium">Default Subdomain Endpoint</span>
                <p className="text-sm font-mono text-emerald-400 mt-0.5">https://{currentTenant.subdomain}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 self-start">
                SSL Active (Auto-Managed)
              </span>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Whitelabel Custom Domain</span>
              <div className="flex items-center gap-3 mt-2">
                <input 
                  type="text" 
                  defaultValue={currentTenant.customDomain || `portal.${currentTenant.schoolSlug}.edu.ng`}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-100 w-full max-w-md focus:outline-none focus:border-emerald-500"
                />
                <button 
                  onClick={() => showToast('CNAME record verification initiated with Cloudflare Edge DNS.')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Verify CNAME
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HEALTH */}
      {activeTab === 'health' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Instance Telemetry & Health</h3>
            <p className="text-xs text-slate-400 mt-1">Real-time health status of your isolated cloud container and database shard.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">90-Day Uptime SLA</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{currentTenant.uptimePercent90Days || 99.98}%</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Cloud Storage Used</span>
              <p className="text-xl font-bold text-slate-100 mt-1">{currentTenant.storageUsageMb} MB / {currentTenant.maxStorageMb} MB</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400">Active Students Online</span>
              <p className="text-xl font-bold text-indigo-400 mt-1">{currentTenant.activeStudentsCount} Active</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
