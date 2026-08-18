import React, { useState } from 'react';
import { 
  UserProfile, 
  TenantSchoolApp, 
  CurriculumFlowBundleKey,
  CurriculumFlowBundle
} from '../types';
import { 
  CURRICULUM_FLOW_BUNDLES, 
  calculateBundlePricing 
} from '../data/bundleArchitectureData';
import { 
  Layers, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Award, 
  Building2, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  Lock, 
  Sliders, 
  Check, 
  X, 
  ArrowRight, 
  ArrowDown,
  Info, 
  AlertCircle, 
  RotateCw, 
  Save, 
  Tag, 
  CreditCard, 
  FileCheck2, 
  CalendarCheck2, 
  ScanFace, 
  GraduationCap,
  Receipt,
  DollarSign,
  TrendingUp,
  UserCheck,
  ClipboardList
} from 'lucide-react';

interface PrincipalFeatureGovernanceTabProps {
  currentUser: UserProfile;
  activeTenant?: TenantSchoolApp;
  tenant?: TenantSchoolApp;
  onUpdateTenantFeatures?: (updatedTenant: TenantSchoolApp) => void;
  onUpdateTenant?: (updatedTenant: TenantSchoolApp) => void;
  onRequestBundleUpgrade?: (bundleKey: CurriculumFlowBundleKey) => void;
  onNavigateTab?: (tab: any) => void;
}

export const PrincipalFeatureGovernanceTab: React.FC<PrincipalFeatureGovernanceTabProps> = ({
  currentUser,
  activeTenant: propActiveTenant,
  tenant: propTenant,
  onUpdateTenantFeatures,
  onUpdateTenant,
  onRequestBundleUpgrade,
  onNavigateTab
}) => {
  const activeTenant = propActiveTenant || propTenant || {
    id: 'ten-001',
    appId: 'CF-GRN-2026',
    schoolName: 'Greenfield Academy',
    principalEmail: 'principal@greenfieldacademy.edu.ng',
    licensedBundles: {
      administration: true,
      teaching: true,
      assessment: true,
      accounts_billing: true
    },
    inAppFeatureOverrides: {}
  } as any;

  const handleUpdate = (updated: TenantSchoolApp) => {
    if (onUpdateTenantFeatures) onUpdateTenantFeatures(updated);
    if (onUpdateTenant) onUpdateTenant(updated);
  };
  const [selectedBundleTab, setSelectedBundleTab] = useState<CurriculumFlowBundleKey | 'all_architecture'>('all_architecture');
  const [inAppOverrides, setInAppOverrides] = useState<Record<string, boolean>>(() => {
    return activeTenant.inAppFeatureOverrides || {
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
    };
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [upgradeModalBundle, setUpgradeModalBundle] = useState<CurriculumFlowBundle | null>(null);
  const [upgradeRequestSent, setUpgradeRequestSent] = useState(false);

  const isPrincipalOrSuperAdmin = 
    currentUser.role === 'principal' || 
    currentUser.role === 'principal_admin' || 
    currentUser.role === 'super_admin' || 
    currentUser.isSystemRoot;

  const toggleSubFeature = (featureKey: string, bundleKey: CurriculumFlowBundleKey) => {
    if (!isPrincipalOrSuperAdmin) return;
    if (!activeTenant.licensedBundles[bundleKey]) return;

    setInAppOverrides(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey]
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    const updated: TenantSchoolApp = {
      ...activeTenant,
      inAppFeatureOverrides: inAppOverrides
    };
    handleUpdate(updated);
    setHasUnsavedChanges(false);
    setSaveSuccessMessage('School feature governance configuration saved successfully!');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleSendUpgradeRequest = (bundle: CurriculumFlowBundle) => {
    if (onRequestBundleUpgrade) {
      onRequestBundleUpgrade(bundle.key);
    }
    setUpgradeRequestSent(true);
    setTimeout(() => {
      setUpgradeRequestSent(false);
      setUpgradeModalBundle(null);
    }, 2000);
  };

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'UserCheck': return UserCheck;
      case 'ClipboardList': return ClipboardList;
      case 'ScanFace': return ScanFace;
      case 'BookOpen': return BookOpen;
      case 'FileCheck2': return FileCheck2;
      case 'CalendarCheck2': return CalendarCheck2;
      case 'Activity': return Activity;
      case 'Sparkles': return Sparkles;
      case 'Award': return Award;
      case 'Layers': return Layers;
      case 'CheckCircle2': return CheckCircle2;
      case 'Lock': return Lock;
      case 'GraduationCap': return GraduationCap;
      case 'Building2': return Building2;
      case 'Tag': return Tag;
      case 'CreditCard': return CreditCard;
      case 'Receipt': return Receipt;
      case 'DollarSign': return DollarSign;
      case 'TrendingUp': return TrendingUp;
      default: return Layers;
    }
  };

  const licensedBundlesCount = Object.values(activeTenant.licensedBundles || {}).filter(Boolean).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fadeIn pb-16">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Office of the Principal • Feature Governance
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {licensedBundlesCount} of 4 Bundles Licensed
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                Instance: {activeTenant.appId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Curriculum Flow 4-Bundle Architecture & Control
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Curriculum Flow is structured into four core bundles: <strong className="text-indigo-300">Administration</strong>, <strong className="text-emerald-300">Teaching</strong>, <strong className="text-amber-300">Assessment</strong>, and <strong className="text-sky-300">Accounts & Billing</strong>. 
              As Principal Admin, you can enable or disable specific detailed features for <strong className="text-white">{activeTenant.schoolName}</strong> within your licensed suites.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveChanges}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Active Sub-Features</p>
                <p className="text-lg font-black text-white">
                  {Object.values(inAppOverrides).filter(Boolean).length} Active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {saveSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            {saveSuccessMessage}
          </div>
        )}

        {/* Quick Launch to User & Student/Parent Onboarding Suite */}
        {onNavigateTab && (
          <div className="mt-5 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-white">Principal Onboarding & User Creation Suite</div>
                <div className="text-[11px] text-slate-300">
                  Provision new faculty, admit students, link parents with gate security PINs, or process bulk CSV spreadsheets.
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('user_onboarding')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md"
            >
              <span>Open Onboarding Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setSelectedBundleTab('all_architecture')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
            selectedBundleTab === 'all_architecture'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Architectural Blueprint & Flow
        </button>

        {CURRICULUM_FLOW_BUNDLES.map(bundle => {
          const isLicensed = activeTenant.licensedBundles?.[bundle.key];
          return (
            <button
              key={bundle.key}
              onClick={() => setSelectedBundleTab(bundle.key)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                selectedBundleTab === bundle.key
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{bundle.shortName}</span>
              {isLicensed ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: ARCHITECTURAL FLOW DIAGRAM */}
      {(selectedBundleTab === 'all_architecture') && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  End-to-End Curriculum Flow Architecture
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Visual representation of how national standards flow through intelligence into four operational bundles and synthesize into institutional analytics.
                </p>
              </div>
              <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
                Principal Supervision Mode Active
              </div>
            </div>

            {/* Visual Node Diagram */}
            <div className="flex flex-col items-center space-y-6">
              
              {/* TOP: CURRICULUM */}
              <div className="w-full max-w-md p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border border-indigo-500/40 shadow-lg text-center">
                <div className="flex items-center justify-center gap-2 text-indigo-300 text-xs font-bold tracking-widest uppercase mb-1">
                  <BookOpen className="w-4 h-4" />
                  Source of Truth
                </div>
                <h4 className="text-lg font-black text-white tracking-wider">CURRICULUM</h4>
                <p className="text-xs text-indigo-200 mt-1">
                  NERDC National Benchmark & WAEC/NECO/BECE Standards Database
                </p>
              </div>

              <div className="flex flex-col items-center text-slate-500">
                <div className="w-0.5 h-6 bg-indigo-500/50"></div>
                <ArrowDown className="w-4 h-4 text-indigo-400 -mt-1" />
              </div>

              {/* STEP 2: CURRICULUM INTELLIGENCE */}
              <div className="w-full max-w-lg p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 shadow-xl text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-xs"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                    <Sparkles className="w-4 h-4" />
                    AI Pedagogy & Diagnostics
                  </div>
                  <h4 className="text-xl font-black text-white tracking-wide">CURRICULUM INTELLIGENCE</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Bloom’s Cognitive Alignment • Adaptive Remedial Engine • Taught-Only Verification
                  </p>
                </div>
              </div>

              {/* SPLIT TO 4 BUNDLES */}
              <div className="w-full relative py-2">
                <div className="hidden lg:block absolute top-0 left-[12%] right-[12%] h-0.5 bg-slate-700"></div>
                <div className="hidden lg:flex justify-between px-[12%] -mt-1.5 text-slate-500">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                </div>
              </div>

              {/* 4 BUNDLE PILLARS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {CURRICULUM_FLOW_BUNDLES.map(bundle => {
                  const isLicensed = activeTenant.licensedBundles?.[bundle.key];
                  return (
                    <div 
                      key={bundle.key}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isLicensed
                          ? `${bundle.bgColor} ${bundle.borderColor} shadow-lg`
                          : 'bg-slate-950/60 border-slate-800 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${bundle.badgeColor}`}>
                            {bundle.shortName}
                          </span>
                          {isLicensed ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => setUpgradeModalBundle(bundle)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              Upgrade
                            </button>
                          )}
                        </div>

                        <h5 className="text-base font-black text-white mb-3 flex items-center gap-2">
                          {bundle.name}
                        </h5>

                        <div className="space-y-2 mb-4">
                          {bundle.features.map(feat => {
                            const isSubActive = inAppOverrides[feat.key] !== false;
                            return (
                              <div 
                                key={feat.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                  isLicensed
                                    ? isSubActive
                                      ? 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                                      : 'bg-slate-950/40 border-slate-800/80 text-slate-500 line-through'
                                    : 'bg-slate-950/60 border-slate-800/40 text-slate-500'
                                }`}
                              >
                                <span className="font-semibold flex items-center gap-1.5">
                                  {feat.name}
                                </span>
                                {isLicensed && (
                                  <button
                                    onClick={() => toggleSubFeature(feat.key, bundle.key)}
                                    disabled={!isPrincipalOrSuperAdmin}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                                      isSubActive
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                    title={isSubActive ? 'Click to disable' : 'Click to enable'}
                                  >
                                    {isSubActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Pricing:</span>
                        <span className="font-bold text-slate-200">
                          ₦{bundle.monthlyPriceNGN.toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CONVERGE TO SCHOOL ANALYTICS */}
              <div className="w-full relative py-2">
                <div className="hidden lg:block absolute top-0 left-[12%] right-[12%] h-0.5 bg-slate-700"></div>
                <div className="flex justify-center -mt-2">
                  <div className="w-0.5 h-6 bg-slate-600"></div>
                </div>
                <div className="flex justify-center -mt-1">
                  <ArrowDown className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* BOTTOM: SCHOOL ANALYTICS */}
              <div className="w-full max-w-2xl p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/40 shadow-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                  <Activity className="w-4 h-4" />
                  Institutional Synthesis Layer
                </div>
                <h4 className="text-xl font-black text-white tracking-wider">SCHOOL ANALYTICS</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-lg mx-auto">
                  Consolidates Student & Staff Registry, Syllabus Delivery Velocity, Taught-Only Mastery, and Bursary Cashflow into Executive Dashboards & Broadsheets.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: INDIVIDUAL BUNDLE DEEP DIVE & GRANULAR TOGGLES */}
      {CURRICULUM_FLOW_BUNDLES.filter(b => selectedBundleTab === 'all_architecture' || selectedBundleTab === b.key).map(bundle => {
        const isLicensed = activeTenant.licensedBundles?.[bundle.key];

        return (
          <div 
            key={bundle.key}
            className={`border rounded-3xl p-6 sm:p-8 transition-all ${
              isLicensed
                ? 'bg-slate-900/90 border-slate-800 shadow-xl'
                : 'bg-slate-950/80 border-slate-800/80 opacity-90'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${bundle.badgeColor}`}>
                    {bundle.shortName} Bundle
                  </span>
                  {isLicensed ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Licensed & Provisioned
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Not Licensed on Server
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {bundle.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                  {bundle.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isLicensed ? (
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Bundle Price</p>
                    <p className="text-base font-black text-slate-100">
                      ₦{bundle.monthlyPriceNGN.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mo</span>
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setUpgradeModalBundle(bundle)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-950/50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Request Bundle Upgrade (₦{bundle.monthlyPriceNGN.toLocaleString()}/mo)
                  </button>
                )}
              </div>
            </div>

            {/* Granular Sub-Features Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {bundle.features.map(feat => {
                const IconComponent = getFeatureIcon(feat.iconName);
                const isEnabled = isLicensed && (inAppOverrides[feat.key] !== false);

                return (
                  <div
                    key={feat.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isLicensed
                        ? isEnabled
                          ? 'bg-slate-950/70 border-slate-700/80 shadow-md'
                          : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                        : 'bg-slate-950/30 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${
                            isEnabled
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{feat.name}</span>
                              {feat.isCore && (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  Core
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {feat.description}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        {isLicensed ? (
                          <button
                            onClick={() => toggleSubFeature(feat.key, bundle.key)}
                            disabled={!isPrincipalOrSuperAdmin}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                              isEnabled ? 'bg-emerald-600' : 'bg-slate-800'
                            }`}
                          >
                            <span 
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        ) : (
                          <Lock className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      {/* Sub-items check list */}
                      <div className="pt-2 space-y-1">
                        {feat.subItems.map((sub, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Status in {activeTenant.schoolSlug}:</span>
                      <span className={`font-semibold ${
                        isLicensed
                          ? isEnabled ? 'text-emerald-400' : 'text-slate-500'
                          : 'text-amber-400'
                      }`}>
                        {isLicensed
                          ? isEnabled ? 'Active & Available to Staff' : 'Disabled by Principal'
                          : 'Unlicensed on Curriculum Server'
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* MODAL: REQUEST BUNDLE UPGRADE */}
      {upgradeModalBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Request Bundle Upgrade
                  </h3>
                  <p className="text-xs text-slate-400">
                    License {upgradeModalBundle.name} for {activeTenant.schoolName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradeModalBundle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Requested Bundle:</span>
                  <span className="text-xs font-bold text-white">{upgradeModalBundle.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Monthly Add-on Rate:</span>
                  <span className="text-xs font-bold text-emerald-400">₦{upgradeModalBundle.monthlyPriceNGN.toLocaleString()} / mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Yearly Prepaid Rate:</span>
                  <span className="text-xs font-bold text-slate-200">₦{upgradeModalBundle.yearlyPriceNGN.toLocaleString()} / yr</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">Features Included:</p>
                <div className="grid grid-cols-2 gap-2">
                  {upgradeModalBundle.features.map(f => (
                    <div key={f.id} className="p-2 rounded-lg bg-slate-950 text-xs text-slate-300 flex items-center gap-1.5 border border-slate-800">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                This will submit an automated upgrade request to the Curriculum Server SaaS Control Plane. Once confirmed or paid via Bursary PSP, all bundle modules will be instantly activated.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUpgradeModalBundle(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendUpgradeRequest(upgradeModalBundle)}
                disabled={upgradeRequestSent}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer"
              >
                {upgradeRequestSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Request Sent!
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Submit Upgrade Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
