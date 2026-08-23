import React, { useState, useEffect } from 'react';
import { 
  TenantSchoolApp, 
  OptionalFeatureKey,
  CurriculumFlowBundleKey 
} from '../types';
import { 
  X, 
  Sliders, 
  Sparkles, 
  Brain, 
  ScanFace, 
  Lock, 
  Building2, 
  UserCheck, 
  Globe, 
  Server, 
  MessageSquare, 
  ShieldCheck, 
  Check, 
  Save,
  Zap,
  Info,
  DollarSign,
  AlertCircle,
  Layers,
  CheckCircle2,
  BookOpen,
  Receipt,
  Users,
  Award
} from 'lucide-react';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';
import { CURRICULUM_FLOW_BUNDLES, calculateBundlePricing } from '../data/bundleArchitectureData';

interface TenantFeaturesModalProps {
  tenant: TenantSchoolApp | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveFeatures: (
    tenantId: string, 
    updatedFeatures: Record<OptionalFeatureKey, boolean>,
    updatedBundles?: Record<CurriculumFlowBundleKey, boolean>,
    updatedOverrides?: Record<string, boolean>
  ) => void;
}

export const TenantFeaturesModal: React.FC<TenantFeaturesModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSaveFeatures
}) => {
  const [activeTab, setActiveTab] = useState<'bundles' | 'modules'>('bundles');
  const [licensedBundles, setLicensedBundles] = useState<Record<CurriculumFlowBundleKey, boolean>>({
    administration: true,
    teaching: true,
    assessment: true,
    accounts_billing: true,
    logistics_support: true
  });
  const [inAppOverrides, setInAppOverrides] = useState<Record<string, boolean>>({});
  const [features, setFeatures] = useState<Record<OptionalFeatureKey, boolean>>({} as Record<OptionalFeatureKey, boolean>);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (tenant) {
      setLicensedBundles(tenant.licensedBundles || {
        administration: true,
        teaching: true,
        assessment: true,
        accounts_billing: true,
        logistics_support: true
      });
      setInAppOverrides(tenant.inAppFeatureOverrides || {});
      setFeatures(tenant.enabledFeatures || {} as Record<OptionalFeatureKey, boolean>);
    }
  }, [tenant]);

  if (!isOpen || !tenant) return null;

  const toggleBundle = (bundleKey: CurriculumFlowBundleKey) => {
    setLicensedBundles(prev => {
      const next = { ...prev, [bundleKey]: !prev[bundleKey] };
      return next;
    });
  };

  const toggleSubFeature = (featureKey: string) => {
    setInAppOverrides(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey]
    }));
  };

  const toggleLegacyFeature = (key: OptionalFeatureKey) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const bundlePricing = calculateBundlePricing(licensedBundles, tenant.businessModel === 'yearly');

  const handleSave = () => {
    onSaveFeatures(tenant.id, features, licensedBundles, inAppOverrides);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const licensedBundlesCount = Object.values(licensedBundles).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>4-Bundle Provisioning & Governance</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {licensedBundlesCount} of 4 Bundles Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Manage bundle licensing & feature enablement for <strong className="text-slate-200">{tenant.schoolName}</strong> ({tenant.appId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('bundles')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'bundles'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              4 Core Bundles (Architectural Model)
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'modules'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Infrastructure & Add-On Modules
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Billable Subtotal: <strong className="text-emerald-400">₦{bundlePricing.discountedMonthlyPriceNGN.toLocaleString()}/mo</strong>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
          {activeTab === 'bundles' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                  const isLicensed = !!licensedBundles[bundle.key];

                  return (
                    <div
                      key={bundle.key}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isLicensed
                          ? `${bundle.bgColor} ${bundle.borderColor} shadow-lg ring-1 ring-emerald-500/30`
                          : 'bg-slate-950/60 border-slate-800 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${bundle.badgeColor}`}>
                            {bundle.shortName} Bundle
                          </span>
                          
                          {/* Bundle Toggle Button */}
                          <button
                            onClick={() => toggleBundle(bundle.key)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isLicensed
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {isLicensed ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Licensed</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </div>

                        <h4 className="text-sm font-black text-white mb-1">
                          {bundle.name}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-2 mb-4">
                          {bundle.description}
                        </p>

                        {/* Detailed Sub-Features */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Detailed Sub-Features ({bundle.features.length})
                          </p>
                          {bundle.features.map(feat => {
                            const isFeatActive = isLicensed && (inAppOverrides[feat.key] !== false);
                            return (
                              <div
                                key={feat.id}
                                className={`p-2 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                                  isLicensed
                                    ? isFeatActive
                                      ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                                      : 'bg-slate-950/40 border-slate-800 text-slate-500 line-through'
                                    : 'bg-slate-950/30 border-slate-800/40 text-slate-600'
                                }`}
                              >
                                <span className="font-semibold">{feat.name}</span>
                                {isLicensed && (
                                  <button
                                    onClick={() => toggleSubFeature(feat.key)}
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                      isFeatActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isFeatActive ? 'Enabled' : 'Disabled'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span>List Price:</span>
                        <span className="font-bold text-slate-200">
                          ₦{bundle.monthlyPriceNGN.toLocaleString()} / mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {OPTIONAL_FEATURE_DEFINITIONS.map(def => {
                const isEnabled = !!features[def.key];
                return (
                  <div
                    key={def.key}
                    onClick={() => toggleLegacyFeature(def.key)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isEnabled
                        ? 'bg-slate-800/90 border-emerald-500/50 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-white">{def.name}</h4>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isEnabled ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isEnabled && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{def.shortDesc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Multi-bundle discount ({bundlePricing.discountPercent}%) automatically applied.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Configuration Applied!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Bundle Provisioning</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
