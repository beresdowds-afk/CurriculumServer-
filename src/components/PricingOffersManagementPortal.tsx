import React, { useState, useMemo } from 'react';
import { 
  SubscriptionPlanOffer, 
  CurriculumFlowBundle, 
  OptionalFeatureDefinition, 
  TldPricingPlan, 
  PromoDiscountOffer, 
  PricingChangeAuditLog,
  TenantSchoolApp,
  UserProfile,
  CurriculumFlowBundleKey
} from '../types';
import { 
  Tag, 
  BadgePercent, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  Users, 
  Building2, 
  Server, 
  Lock, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  Copy, 
  Eye, 
  HardDrive,
  Cpu,
  Zap,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  Sliders,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export type PricingManagementTab = 
  | 'plans' 
  | 'bundles' 
  | 'addons' 
  | 'domains' 
  | 'promos' 
  | 'audit_simulator';

interface PricingOffersManagementPortalProps {
  currentUser: UserProfile;
  tenants: TenantSchoolApp[];
  subscriptionPlans: SubscriptionPlanOffer[];
  optionalFeatures: OptionalFeatureDefinition[];
  flowBundles: CurriculumFlowBundle[];
  tldPlans: TldPricingPlan[];
  promoOffers: PromoDiscountOffer[];
  auditLogs: PricingChangeAuditLog[];
  onUpdateSubscriptionPlans: (plans: SubscriptionPlanOffer[]) => void;
  onUpdateOptionalFeatures: (features: OptionalFeatureDefinition[]) => void;
  onUpdateFlowBundles: (bundles: CurriculumFlowBundle[]) => void;
  onUpdateTldPlans: (plans: TldPricingPlan[]) => void;
  onUpdatePromoOffers: (offers: PromoDiscountOffer[]) => void;
  onAddAuditLog: (log: Omit<PricingChangeAuditLog, 'id' | 'timestamp'>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PricingOffersManagementPortal: React.FC<PricingOffersManagementPortalProps> = ({
  currentUser,
  tenants,
  subscriptionPlans,
  optionalFeatures,
  flowBundles,
  tldPlans,
  promoOffers,
  auditLogs,
  onUpdateSubscriptionPlans,
  onUpdateOptionalFeatures,
  onUpdateFlowBundles,
  onUpdateTldPlans,
  onUpdatePromoOffers,
  onAddAuditLog,
  onNavigateToTab
}) => {
  const [activeTab, setActiveTab] = useState<PricingManagementTab>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currencyView, setCurrencyView] = useState<'NGN' | 'USD'>('NGN');
  const USD_EXCHANGE_RATE = 1550; // ₦1,550 / $1 benchmark

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanOffer | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const [editingAddon, setEditingAddon] = useState<OptionalFeatureDefinition | null>(null);
  const [isCreatingAddon, setIsCreatingAddon] = useState(false);

  const [editingBundle, setEditingBundle] = useState<CurriculumFlowBundle | null>(null);

  const [editingTld, setEditingTld] = useState<TldPricingPlan | null>(null);
  const [isCreatingTld, setIsCreatingTld] = useState(false);

  const [editingPromo, setEditingPromo] = useState<PromoDiscountOffer | null>(null);
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'plan' | 'addon' | 'tld' | 'promo';
    id: string;
    name: string;
  } | null>(null);

  // Revenue simulation calculations
  const revenueSimulation = useMemo(() => {
    let projectedMRR_NGN = 0;
    let projectedARR_NGN = 0;

    tenants.forEach(tenant => {
      // Find matching plan
      const plan = subscriptionPlans.find(p => p.name.toLowerCase() === tenant.subscriptionTier.toLowerCase());
      if (plan) {
        if (tenant.businessModel === 'monthly') {
          projectedMRR_NGN += plan.monthlyPriceNGN;
          projectedARR_NGN += plan.monthlyPriceNGN * 12;
        } else if (tenant.businessModel === 'yearly') {
          projectedMRR_NGN += Math.round(plan.yearlyPriceNGN / 12);
          projectedARR_NGN += plan.yearlyPriceNGN;
        } else if (tenant.businessModel === 'lease_to_own') {
          projectedMRR_NGN += plan.leaseToOwnMonthlyNGN || 350000;
          projectedARR_NGN += (plan.leaseToOwnMonthlyNGN || 350000) * 12;
        }
      } else {
        projectedMRR_NGN += tenant.subscriptionPricePerMonth || 200000;
        projectedARR_NGN += tenant.subscriptionPricePerYear || 2400000;
      }
    });

    return {
      activeTenantsCount: tenants.length,
      projectedMRR_NGN,
      projectedARR_NGN,
      avgRevenuePerSchool: tenants.length > 0 ? Math.round(projectedARR_NGN / tenants.length) : 0
    };
  }, [tenants, subscriptionPlans]);

  // Format currency helpers
  const formatPrice = (amountNgn: number) => {
    if (currencyView === 'USD') {
      const usd = Math.round(amountNgn / USD_EXCHANGE_RATE);
      return `$${usd.toLocaleString()}`;
    }
    return `₦${amountNgn.toLocaleString()}`;
  };

  // -------------------------------------------------------------
  // PLAN CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSavePlan = (plan: SubscriptionPlanOffer) => {
    const isNew = !subscriptionPlans.some(p => p.id === plan.id);
    let updated: SubscriptionPlanOffer[];
    if (isNew) {
      updated = [...subscriptionPlans, { ...plan, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'subscription_plan',
        targetId: plan.id,
        targetName: plan.name,
        action: 'offer_created',
        newValueSummary: `Created Plan ${plan.name} at ₦${plan.monthlyPriceNGN.toLocaleString()}/mo, ₦${plan.yearlyPriceNGN.toLocaleString()}/yr`
      });
      showToast(`Successfully created subscription tier "${plan.name}"`);
    } else {
      updated = subscriptionPlans.map(p => p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p);
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'subscription_plan',
        targetId: plan.id,
        targetName: plan.name,
        action: 'price_updated',
        newValueSummary: `Updated prices to ₦${plan.monthlyPriceNGN.toLocaleString()}/mo, ₦${plan.yearlyPriceNGN.toLocaleString()}/yr (Cap: ${plan.studentCapacity} students)`
      });
      showToast(`Updated pricing parameters for "${plan.name}"`);
    }
    onUpdateSubscriptionPlans(updated);
    setEditingPlan(null);
    setIsCreatingPlan(false);
  };

  const handleDeletePlan = (id: string, name: string) => {
    const updated = subscriptionPlans.filter(p => p.id !== id);
    onUpdateSubscriptionPlans(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'subscription_plan',
      targetId: id,
      targetName: name,
      action: 'offer_deleted',
      newValueSummary: `Deleted/archived plan offer ${name}`
    });
    setDeleteTarget(null);
    showToast(`Deleted plan offer "${name}"`);
  };

  const handleTogglePlanActive = (id: string) => {
    const plan = subscriptionPlans.find(p => p.id === id);
    if (!plan) return;
    const nextState = !plan.isActive;
    const updated = subscriptionPlans.map(p => p.id === id ? { ...p, isActive: nextState } : p);
    onUpdateSubscriptionPlans(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'subscription_plan',
      targetId: id,
      targetName: plan.name,
      action: 'status_toggled',
      newValueSummary: `Changed status to ${nextState ? 'ACTIVE' : 'INACTIVE/PAUSED'}`
    });
    showToast(`${plan.name} is now ${nextState ? 'active in catalog' : 'hidden from catalog'}`);
  };

  // -------------------------------------------------------------
  // ADD-ON CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveAddon = (addon: OptionalFeatureDefinition) => {
    const isNew = !optionalFeatures.some(f => f.key === addon.key);
    let updated: OptionalFeatureDefinition[];
    if (isNew) {
      updated = [...optionalFeatures, { ...addon, isActive: addon.isActive ?? true, isCustom: true }];
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'add_on_feature',
        targetId: String(addon.key),
        targetName: addon.name,
        action: 'offer_created',
        newValueSummary: `Created add-on feature ${addon.name} at ₦${addon.monthlyPrice.toLocaleString()}/mo`
      });
      showToast(`Created add-on module "${addon.name}"`);
    } else {
      updated = optionalFeatures.map(f => f.key === addon.key ? addon : f);
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'add_on_feature',
        targetId: String(addon.key),
        targetName: addon.name,
        action: 'price_updated',
        newValueSummary: `Updated price to ₦${addon.monthlyPrice.toLocaleString()}/mo, ₦${addon.yearlyPrice.toLocaleString()}/yr`
      });
      showToast(`Updated add-on module "${addon.name}"`);
    }
    onUpdateOptionalFeatures(updated);
    setEditingAddon(null);
    setIsCreatingAddon(false);
  };

  const handleDeleteAddon = (key: string, name: string) => {
    const updated = optionalFeatures.filter(f => f.key !== key);
    onUpdateOptionalFeatures(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'add_on_feature',
      targetId: key,
      targetName: name,
      action: 'offer_deleted',
      newValueSummary: `Deleted feature module ${name}`
    });
    setDeleteTarget(null);
    showToast(`Deleted add-on module "${name}"`);
  };

  // -------------------------------------------------------------
  // BUNDLE CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveBundle = (bundle: CurriculumFlowBundle) => {
    const updated = flowBundles.map(b => b.key === bundle.key ? bundle : b);
    onUpdateFlowBundles(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'bundle',
      targetId: bundle.key,
      targetName: bundle.name,
      action: 'price_updated',
      newValueSummary: `Updated bundle price to ₦${bundle.monthlyPriceNGN.toLocaleString()}/mo, ₦${bundle.yearlyPriceNGN.toLocaleString()}/yr`
    });
    setEditingBundle(null);
    showToast(`Updated bundle suite "${bundle.name}"`);
  };

  // -------------------------------------------------------------
  // DOMAIN TLD CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveTld = (tld: TldPricingPlan) => {
    const isNew = !tldPlans.some(t => t.tld === tld.tld);
    let updated: TldPricingPlan[];
    if (isNew) {
      updated = [...tldPlans, { ...tld, isActive: true, isCustom: true }];
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'domain_tld',
        targetId: tld.tld,
        targetName: `${tld.tld} Domain Extension`,
        action: 'offer_created',
        newValueSummary: `Added TLD ${tld.tld} at ₦${tld.priceNGN.toLocaleString()}/yr`
      });
      showToast(`Added new domain extension "${tld.tld}"`);
    } else {
      updated = tldPlans.map(t => t.tld === tld.tld ? tld : t);
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'domain_tld',
        targetId: tld.tld,
        targetName: `${tld.tld} Domain Extension`,
        action: 'price_updated',
        newValueSummary: `Registration: ₦${tld.priceNGN.toLocaleString()}, Renewal: ₦${tld.renewPriceNGN.toLocaleString()}`
      });
      showToast(`Updated pricing for "${tld.tld}"`);
    }
    onUpdateTldPlans(updated);
    setEditingTld(null);
    setIsCreatingTld(false);
  };

  const handleDeleteTld = (tld: string) => {
    const updated = tldPlans.filter(t => t.tld !== tld);
    onUpdateTldPlans(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'domain_tld',
      targetId: tld,
      targetName: tld,
      action: 'offer_deleted',
      newValueSummary: `Removed domain extension ${tld}`
    });
    setDeleteTarget(null);
    showToast(`Removed domain extension "${tld}"`);
  };

  // -------------------------------------------------------------
  // PROMO CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSavePromo = (promo: PromoDiscountOffer) => {
    const isNew = !promoOffers.some(p => p.id === promo.id);
    let updated: PromoDiscountOffer[];
    if (isNew) {
      updated = [...promoOffers, { ...promo, createdAt: new Date().toISOString(), usedCount: 0, isActive: true }];
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'promo_offer',
        targetId: promo.id,
        targetName: promo.code,
        action: 'offer_created',
        newValueSummary: `Created Promo Code [${promo.code}] (${promo.discountValue}${promo.discountType === 'percentage' ? '%' : ' NGN'} off)`
      });
      showToast(`Launched promotional offer "${promo.code}"`);
    } else {
      updated = promoOffers.map(p => p.id === promo.id ? promo : p);
      onAddAuditLog({
        adminName: currentUser.name,
        adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
        targetType: 'promo_offer',
        targetId: promo.id,
        targetName: promo.code,
        action: 'price_updated',
        newValueSummary: `Updated discount terms for ${promo.code}`
      });
      showToast(`Updated promotional offer "${promo.code}"`);
    }
    onUpdatePromoOffers(updated);
    setEditingPromo(null);
    setIsCreatingPromo(false);
  };

  const handleDeletePromo = (id: string, code: string) => {
    const updated = promoOffers.filter(p => p.id !== id);
    onUpdatePromoOffers(updated);
    onAddAuditLog({
      adminName: currentUser.name,
      adminEmail: currentUser.email || 'superadmin@curriculumserver.com.ng',
      targetType: 'promo_offer',
      targetId: id,
      targetName: code,
      action: 'offer_deleted',
      newValueSummary: `Removed promotional campaign ${code}`
    });
    setDeleteTarget(null);
    showToast(`Deleted promo campaign "${code}"`);
  };

  // -------------------------------------------------------------
  // CATALOG EXPORT & RESET
  // -------------------------------------------------------------
  const handleExportCatalogJson = () => {
    const catalogData = {
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      subscriptionPlans,
      flowBundles,
      optionalFeatures,
      tldPlans,
      promoOffers
    };
    const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculum_server_pricing_catalog_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Pricing catalog exported successfully');
  };

  return (
    <div id="pricing-management-portal" className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-700/60 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/40 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BadgePercent className="w-3.5 h-3.5 text-indigo-400" />
                SUPER ADMIN PRICING GOVERNANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono">
                Live Shard Sync
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-3">
              <span>Product Offers & Pricing Management</span>
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Create, edit, and orchestrate all SaaS subscription tiers, 4+1 modular bundles, feature add-ons, NiRA domain registry fees, and promotional campaigns in real time across the platform.
            </p>
          </div>

          {/* Quick Action CTAs & Currency Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Currency switcher */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setCurrencyView('NGN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currencyView === 'NGN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                ₦ NGN
              </button>
              <button
                onClick={() => setCurrencyView('USD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currencyView === 'USD' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                $ USD
              </button>
            </div>

            {/* Export catalog */}
            <button
              onClick={handleExportCatalogJson}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              title="Export complete pricing and offers catalog to JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Catalog</span>
            </button>

            {/* Create Offer CTA based on active tab */}
            {activeTab === 'plans' && (
              <button
                onClick={() => {
                  setEditingPlan({
                    id: `plan_custom_${Date.now().toString(36)}`,
                    name: 'New Custom Tier',
                    tierKey: 'custom',
                    tagline: 'Customized institutional package',
                    description: 'Full institutional suite configured with bespoke student capacity and add-ons.',
                    monthlyPriceNGN: 200000,
                    yearlyPriceNGN: 2000000,
                    setupFeeNGN: 50000,
                    currency: 'NGN',
                    studentCapacity: 1500,
                    facultyLimit: 80,
                    storageLimitMb: 25000,
                    trialDays: 14,
                    gracePeriodDays: 14,
                    isPopular: false,
                    isFeatured: false,
                    isActive: true,
                    status: 'published',
                    includedBundles: ['administration', 'teaching', 'assessment'],
                    includedFeatures: ['ai_curriculum_advisor', 'parent_ward_security_hub'],
                    colorScheme: 'from-blue-700 to-indigo-900',
                    iconName: 'School',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  setIsCreatingPlan(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Subscription Plan</span>
              </button>
            )}

            {activeTab === 'addons' && (
              <button
                onClick={() => {
                  setEditingAddon({
                    id: `addon_${Date.now().toString(36)}`,
                    key: `custom_addon_${Date.now().toString(36)}`,
                    name: 'New Add-On Module',
                    shortDesc: 'Custom modular feature designed for institutional operations.',
                    category: 'ai',
                    monthlyPrice: 30000,
                    yearlyPrice: 300000,
                    isCoreDefault: false,
                    requiredTier: 'Pro',
                    iconName: 'Sparkles',
                    isActive: true,
                    isCustom: true
                  });
                  setIsCreatingAddon(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Feature Add-On</span>
              </button>
            )}

            {activeTab === 'domains' && (
              <button
                onClick={() => {
                  setEditingTld({
                    id: `tld_${Date.now().toString(36)}`,
                    tld: '.ng',
                    category: 'Sovereign ccTLD',
                    priceNGN: 15000,
                    renewPriceNGN: 15000,
                    wholesaleCostNGN: 10000,
                    marginPercent: 33,
                    popular: false,
                    requiresVerification: false,
                    accreditationBody: 'NiRA Accredited Registry',
                    description: 'Custom top level domain extension.',
                    isActive: true,
                    isCustom: true
                  });
                  setIsCreatingTld(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add TLD Extension</span>
              </button>
            )}

            {activeTab === 'promos' && (
              <button
                onClick={() => {
                  setEditingPromo({
                    id: `promo_${Date.now().toString(36)}`,
                    code: 'DISCOUNT2026',
                    title: 'New Promotional Campaign',
                    description: 'Special seasonal discount on subscriptions.',
                    discountType: 'percentage',
                    discountValue: 15,
                    applicableCategory: 'subscription_plans',
                    startDate: new Date().toISOString(),
                    expiryDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
                    usageLimit: 100,
                    usedCount: 0,
                    isActive: true,
                    createdAt: new Date().toISOString()
                  });
                  setIsCreatingPromo(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Promo Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Revenue Metrics Banner */}
        <div className="max-w-7xl mx-auto mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Projected ARR</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
              {formatPrice(revenueSimulation.projectedARR_NGN)}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1">Across {revenueSimulation.activeTenantsCount} active schools</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Projected MRR</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
              {formatPrice(revenueSimulation.projectedMRR_NGN)}
            </div>
            <div className="text-[11px] text-indigo-300 font-mono mt-1">Monthly Recurring Base</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Published Plans</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
              {subscriptionPlans.filter(p => p.isActive).length} Tiers
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{optionalFeatures.length} Add-on Modules</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Active Coupons</span>
              <Tag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
              {promoOffers.filter(p => p.isActive).length} Active
            </div>
            <div className="text-[11px] text-amber-400/90 font-mono mt-1">{promoOffers.reduce((acc, p) => acc + p.usedCount, 0)} Redemptions</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'plans', label: 'Subscription Plans & Tiers', count: subscriptionPlans.length, icon: Layers },
              { id: 'bundles', label: 'Modular 4+1 Bundles', count: flowBundles.length, icon: Building2 },
              { id: 'addons', label: 'Add-On Feature Modules', count: optionalFeatures.length, icon: Zap },
              { id: 'domains', label: 'Domain & TLD Rates', count: tldPlans.length, icon: Globe },
              { id: 'promos', label: 'Promotions & Coupons', count: promoOffers.length, icon: Tag },
              { id: 'audit_simulator', label: 'Audit Ledger & Simulator', count: auditLogs.length, icon: BarChart3 }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as PricingManagementTab);
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-indigo-900/80 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Filter input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search offer, key, code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* TAB 1: SUBSCRIPTION PLANS & TIERS */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">SaaS Subscription Packages</h3>
                <p className="text-xs text-slate-400">Institutional base pricing, quotas, storage caps, and lease-to-own terms.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionPlans
                .filter(plan => plan.name.toLowerCase().includes(searchQuery.toLowerCase()) || plan.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(plan => (
                  <div 
                    key={plan.id}
                    className={`relative p-6 rounded-3xl bg-[#0f172a] border flex flex-col justify-between space-y-6 transition-all ${
                      plan.isPopular 
                        ? 'border-indigo-500/80 shadow-2xl shadow-indigo-950/60' 
                        : 'border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {plan.badgeText && (
                      <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        {plan.badgeText}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                            {plan.tierKey.toUpperCase()}
                          </div>
                          <h4 className="text-xl font-bold text-white mt-0.5">{plan.name}</h4>
                        </div>

                        {/* Status badge */}
                        <button
                          onClick={() => handleTogglePlanActive(plan.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono transition-colors ${
                            plan.isActive 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                          title="Click to toggle catalog visibility"
                        >
                          {plan.isActive ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2">{plan.tagline}</p>

                      {/* Pricing block */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-400 font-medium">Monthly:</span>
                          <span className="text-lg font-black text-white font-mono">{formatPrice(plan.monthlyPriceNGN)}<span className="text-xs font-normal text-slate-400 font-sans">/mo</span></span>
                        </div>
                        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-xs text-slate-400 font-medium">Yearly (Upfront):</span>
                          <span className="text-lg font-black text-emerald-400 font-mono">{formatPrice(plan.yearlyPriceNGN)}<span className="text-xs font-normal text-slate-400 font-sans">/yr</span></span>
                        </div>
                        {plan.leaseToOwnMonthlyNGN && (
                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                            <span className="text-purple-300 font-medium">Lease-to-Own:</span>
                            <span className="font-bold text-purple-200 font-mono">{formatPrice(plan.leaseToOwnMonthlyNGN)}/mo (24 Mo)</span>
                          </div>
                        )}
                      </div>

                      {/* Capacity specifications */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Students</div>
                          <div className="font-bold text-white font-mono mt-0.5">{plan.studentCapacity.toLocaleString()}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Staff Limit</div>
                          <div className="font-bold text-white font-mono mt-0.5">{plan.facultyLimit}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Storage</div>
                          <div className="font-bold text-white font-mono mt-0.5">{(plan.storageLimitMb / 1000).toFixed(0)} GB</div>
                        </div>
                      </div>

                      {/* Bundles included */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          Included Bundles ({plan.includedBundles.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.includedBundles.map(bKey => (
                            <span key={bKey} className="px-2 py-0.5 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[10px] font-medium">
                              {bKey.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsCreatingPlan(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Pricing</span>
                      </button>

                      <button
                        onClick={() => setDeleteTarget({ type: 'plan', id: plan.id, name: plan.name })}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                        title="Delete plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: MODULAR 4+1 BUNDLES */}
        {activeTab === 'bundles' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">4+1 Modular CurriculumFlow Bundles</h3>
                <p className="text-xs text-slate-400">Configure standalone suite pricing for modular multi-tenant school licensing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flowBundles
                .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(bundle => (
                  <div 
                    key={bundle.key}
                    className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">{bundle.name}</h4>
                            <div className="text-xs text-indigo-400 font-mono font-medium">{bundle.tagline}</div>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                          {bundle.features.length} Features
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{bundle.description}</p>

                      {/* Pricing grid */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Monthly Rate</div>
                          <div className="text-lg font-black text-white font-mono mt-0.5">{formatPrice(bundle.monthlyPriceNGN)}<span className="text-xs font-normal text-slate-400">/mo</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Annual Upfront</div>
                          <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{formatPrice(bundle.yearlyPriceNGN)}<span className="text-xs font-normal text-slate-400">/yr</span></div>
                        </div>
                      </div>

                      {/* Feature pills */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">Suite Capabilities:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {bundle.features.map(feat => (
                            <div key={feat.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="truncate">{feat.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingBundle(bundle)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit Bundle Pricing & Terms</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: ADD-ON FEATURE MODULES */}
        {activeTab === 'addons' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Modular Feature Add-Ons</h3>
                <p className="text-xs text-slate-400">Granular à la carte feature pricing, AI engine tokens, and biometric hardware integrations.</p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['all', 'ai', 'security', 'fintech', 'infrastructure', 'communication'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase font-mono transition-colors ${
                      filterCategory === cat 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {optionalFeatures
                .filter(addon => {
                  const matchSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase()) || addon.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchCat = filterCategory === 'all' || addon.category === filterCategory;
                  return matchSearch && matchCat;
                })
                .map(addon => (
                  <div 
                    key={String(addon.key)}
                    className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                              {addon.category}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1 leading-snug">{addon.name}</h4>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{addon.shortDesc}</p>

                      {/* Pricing summary */}
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">Monthly</div>
                          <div className="text-sm font-black text-white font-mono">{formatPrice(addon.monthlyPrice)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-mono">Yearly</div>
                          <div className="text-sm font-black text-emerald-400 font-mono">{formatPrice(addon.yearlyPrice)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                        <span>Required Tier: <strong className="text-slate-200">{addon.requiredTier || 'Starter'}</strong></span>
                        {addon.isCoreDefault && <span className="text-amber-400 font-bold">Core Default</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setEditingAddon(addon);
                          setIsCreatingAddon(false);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Rate</span>
                      </button>

                      <button
                        onClick={() => setDeleteTarget({ type: 'addon', id: String(addon.key), name: addon.name })}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                        title="Delete Add-On"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: DOMAIN & TLD REGISTRY RATES */}
        {activeTab === 'domains' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">NiRA & Sovereign TLD Registry Pricing</h3>
                <p className="text-xs text-slate-400">Manage registration tariffs, renewal fees, and wholesale registry margins for school domains.</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0f172a] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Extension (TLD)</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Registration Fee (Annual)</th>
                      <th className="py-3.5 px-4">Renewal Fee</th>
                      <th className="py-3.5 px-4">Registry Body</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {tldPlans
                      .filter(t => t.tld.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(tld => (
                        <tr key={tld.tld} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white text-sm flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-400" />
                            <span>{tld.tld}</span>
                            {tld.popular && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-sans font-bold">
                                Popular
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{tld.category}</td>
                          <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                            {formatPrice(tld.priceNGN)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {formatPrice(tld.renewPriceNGN)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">{tld.accreditationBody || 'NiRA Registry'}</td>
                          <td className="py-3.5 px-4">
                            {tld.requiresVerification ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                                MoE Required
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                                Instant
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingTld(tld);
                                  setIsCreatingTld(false);
                                }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                                title="Edit TLD tariff"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'tld', id: tld.tld, name: tld.tld })}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                                title="Delete extension"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROMOTIONAL CAMPAIGNS & COUPONS */}
        {activeTab === 'promos' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Promotions, Coupons & Seasonal Grants</h3>
                <p className="text-xs text-slate-400">Launch discount voucher codes, state EdTech subsidies, and track redemption limits.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {promoOffers
                .filter(p => p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(promo => (
                  <div 
                    key={promo.id}
                    className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="px-3 py-1 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-black tracking-widest">
                          {promo.code}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          promo.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {promo.isActive ? 'Active' : 'Expired'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white">{promo.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{promo.description}</p>

                      {/* Discount value pill */}
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Discount:</span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `₦${promo.discountValue.toLocaleString()} REBATE`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Usage: {promo.usedCount} / {promo.usageLimit}</span>
                          <span>{Math.round((promo.usedCount / promo.usageLimit) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, (promo.usedCount / promo.usageLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setEditingPromo(promo);
                          setIsCreatingPromo(false);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Edit Promo</span>
                      </button>

                      <button
                        onClick={() => handleDeletePromo(promo.id, promo.code)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                        title="Delete promo code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LEDGER & SIMULATOR */}
        {activeTab === 'audit_simulator' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Immutable Price Adjustment Ledger</h3>
                <p className="text-xs text-slate-400">Cryptographically verifiable log of all price changes, tariff updates, and offer modifications.</p>
              </div>
            </div>

            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-bold text-white">{log.targetName}</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono">{log.newValueSummary}</p>
                    {log.notes && <p className="text-[11px] text-slate-400">{log.notes}</p>}
                  </div>

                  <div className="text-right text-xs text-slate-400 shrink-0">
                    <div className="font-medium text-slate-200">{log.adminName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EDIT / CREATE SUBSCRIPTION PLAN                      */}
      {/* ------------------------------------------------------------- */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  {isCreatingPlan ? 'Create New Plan Offer' : 'Edit Plan Offer Parameters'}
                </span>
                <h3 className="text-xl font-bold text-white">{editingPlan.name}</h3>
              </div>
              <button 
                onClick={() => setEditingPlan(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tier Key</label>
                <select
                  value={editingPlan.tierKey}
                  onChange={e => setEditingPlan({ ...editingPlan, tierKey: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="lease_to_own">Lease-to-Own</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={editingPlan.tagline}
                  onChange={e => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Monthly Price (₦ NGN)</label>
                <input
                  type="number"
                  value={editingPlan.monthlyPriceNGN}
                  onChange={e => setEditingPlan({ ...editingPlan, monthlyPriceNGN: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Yearly Price (₦ NGN)</label>
                <input
                  type="number"
                  value={editingPlan.yearlyPriceNGN}
                  onChange={e => setEditingPlan({ ...editingPlan, yearlyPriceNGN: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Student Capacity</label>
                <input
                  type="number"
                  value={editingPlan.studentCapacity}
                  onChange={e => setEditingPlan({ ...editingPlan, studentCapacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Storage Limit (MB)</label>
                <input
                  type="number"
                  value={editingPlan.storageLimitMb}
                  onChange={e => setEditingPlan({ ...editingPlan, storageLimitMb: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Trial Days</label>
                <input
                  type="number"
                  value={editingPlan.trialDays}
                  onChange={e => setEditingPlan({ ...editingPlan, trialDays: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Badge Label</label>
                <input
                  type="text"
                  placeholder="e.g. Most Popular"
                  value={editingPlan.badgeText || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, badgeText: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePlan(editingPlan)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Plan Offer</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIT / CREATE ADD-ON FEATURE MODULE                  */}
      {/* ------------------------------------------------------------- */}
      {editingAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  {isCreatingAddon ? 'Create Feature Add-On' : 'Edit Add-On Rate'}
                </span>
                <h3 className="text-xl font-bold text-white">{editingAddon.name}</h3>
              </div>
              <button 
                onClick={() => setEditingAddon(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Feature Name</label>
                <input
                  type="text"
                  value={editingAddon.name}
                  onChange={e => setEditingAddon({ ...editingAddon, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Monthly Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={editingAddon.monthlyPrice}
                    onChange={e => setEditingAddon({ ...editingAddon, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Yearly Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={editingAddon.yearlyPrice}
                    onChange={e => setEditingAddon({ ...editingAddon, yearlyPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Short Description</label>
                <textarea
                  rows={3}
                  value={editingAddon.shortDesc}
                  onChange={e => setEditingAddon({ ...editingAddon, shortDesc: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingAddon(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveAddon(editingAddon)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Add-On</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: EDIT BUNDLE SUITE                                    */}
      {/* ------------------------------------------------------------- */}
      {editingBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  Edit Modular Bundle Pricing
                </span>
                <h3 className="text-xl font-bold text-white">{editingBundle.name}</h3>
              </div>
              <button 
                onClick={() => setEditingBundle(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Monthly Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={editingBundle.monthlyPriceNGN}
                    onChange={e => setEditingBundle({ ...editingBundle, monthlyPriceNGN: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Yearly Price (₦ NGN)</label>
                  <input
                    type="number"
                    value={editingBundle.yearlyPriceNGN}
                    onChange={e => setEditingBundle({ ...editingBundle, yearlyPriceNGN: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={editingBundle.description}
                  onChange={e => setEditingBundle({ ...editingBundle, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingBundle(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBundle(editingBundle)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Bundle Rate</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: EDIT / CREATE TLD EXTENSION                          */}
      {/* ------------------------------------------------------------- */}
      {editingTld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  {isCreatingTld ? 'Add Domain Extension' : 'Edit Domain Tariff'}
                </span>
                <h3 className="text-xl font-bold text-white">{editingTld.tld}</h3>
              </div>
              <button 
                onClick={() => setEditingTld(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Registration Fee (₦/yr)</label>
                  <input
                    type="number"
                    value={editingTld.priceNGN}
                    onChange={e => setEditingTld({ ...editingTld, priceNGN: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Renewal Fee (₦/yr)</label>
                  <input
                    type="number"
                    value={editingTld.renewPriceNGN}
                    onChange={e => setEditingTld({ ...editingTld, renewPriceNGN: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Registry Accreditation Body</label>
                <input
                  type="text"
                  value={editingTld.accreditationBody || ''}
                  onChange={e => setEditingTld({ ...editingTld, accreditationBody: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingTld(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveTld(editingTld)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save TLD Rate</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EDIT / CREATE PROMO DISCOUNT CODE                    */}
      {/* ------------------------------------------------------------- */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  {isCreatingPromo ? 'Create Promotional Campaign' : 'Edit Coupon Terms'}
                </span>
                <h3 className="text-xl font-bold text-white">{editingPromo.code}</h3>
              </div>
              <button 
                onClick={() => setEditingPromo(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Coupon Code</label>
                  <input
                    type="text"
                    value={editingPromo.code}
                    onChange={e => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Discount Value</label>
                  <input
                    type="number"
                    value={editingPromo.discountValue}
                    onChange={e => setEditingPromo({ ...editingPromo, discountValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Campaign Title</label>
                <input
                  type="text"
                  value={editingPromo.title}
                  onChange={e => setEditingPromo({ ...editingPromo, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Usage Limit</label>
                <input
                  type="number"
                  value={editingPromo.usageLimit}
                  onChange={e => setEditingPromo({ ...editingPromo, usageLimit: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setEditingPromo(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePromo(editingPromo)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Promo Code</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION DIALOG                                    */}
      {/* ------------------------------------------------------------- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Delete Offer Confirmation</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to delete <strong className="text-white font-mono">"{deleteTarget.name}"</strong>? This will remove it from the public pricing catalog.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget.type === 'plan') handleDeletePlan(deleteTarget.id, deleteTarget.name);
                  else if (deleteTarget.type === 'addon') handleDeleteAddon(deleteTarget.id, deleteTarget.name);
                  else if (deleteTarget.type === 'tld') handleDeleteTld(deleteTarget.id);
                  else if (deleteTarget.type === 'promo') handleDeletePromo(deleteTarget.id, deleteTarget.name);
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
