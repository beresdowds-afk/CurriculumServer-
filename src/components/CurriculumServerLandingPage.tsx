import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  CurriculumServerSaaSMetrics,
  BusinessModelType,
  OptionalFeatureKey
} from '../types';
import { 
  Layers, 
  Shield, 
  ShieldCheck, 
  Rocket, 
  BarChart3, 
  Building2, 
  GraduationCap, 
  Globe, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  Search, 
  Bell, 
  Database, 
  Cloud, 
  Lock, 
  Key, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  CreditCard, 
  Puzzle, 
  Laptop, 
  Award, 
  ExternalLink,
  Zap,
  BookOpen,
  Activity,
  Cpu,
  RefreshCw,
  Users,
  X,
  Radio,
  Sliders,
  Server,
  School
} from 'lucide-react';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';

interface CurriculumServerLandingPageProps {
  tenants: TenantSchoolApp[];
  metrics: CurriculumServerSaaSMetrics;
  onLaunchTenant: (tenant: TenantSchoolApp) => void;
  onOpenProvisionModal?: () => void;
  onOpenCloneModal?: () => void;
  onOpenConnectModal: () => void;
  onNavigateToMasterConsole: () => void;
  onNavigateToDomainPortal?: () => void;
  onNavigateToSaaSHub?: () => void;
  onNavigateToSchoolInstance?: () => void;
  onStartProvisioning?: (draft?: Partial<TenantSchoolApp>) => void;
  onOpenAuthModal?: () => void;
  onEnterSelfService?: () => void;
  onOpenIsolationTests?: () => void;
  onOpenApiWebhooks?: () => void;
}

export const CurriculumServerLandingPage: React.FC<CurriculumServerLandingPageProps> = ({
  tenants,
  metrics,
  onLaunchTenant,
  onOpenProvisionModal,
  onOpenCloneModal,
  onOpenConnectModal,
  onNavigateToMasterConsole,
  onNavigateToDomainPortal,
  onNavigateToSaaSHub,
  onNavigateToSchoolInstance,
  onStartProvisioning,
  onOpenAuthModal,
  onEnterSelfService,
  onOpenIsolationTests,
  onOpenApiWebhooks
}) => {
  // Navigation & Interactive UI state
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);
  const [isVideoDemoOpen, setIsVideoDemoOpen] = useState<boolean>(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  
  // Interactive Pricing & Calculator state
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'yearly' | 'lease_to_own'>('yearly');
  const [calcStudents, setCalcStudents] = useState<number>(1200);

  // Selected mock tenant for quick interactive preview
  const primaryMockTenants = tenants.slice(0, 5);
  const greenfieldTenant = tenants.find(t => t.schoolSlug.includes('greenfield')) || tenants[0];
  const royalTenant = tenants.find(t => t.schoolSlug.includes('royal')) || tenants[1] || tenants[0];
  const excellenceTenant = tenants.find(t => t.schoolSlug.includes('excel')) || tenants[2] || tenants[0];

  // Dynamic price calculation
  const getPlanPrice = (baseMonthly: number) => {
    if (pricingCycle === 'yearly') {
      const discountedYearly = baseMonthly * 12 * 0.80; // 20% annual discount
      return `₦${(discountedYearly / 1000000).toFixed(2)}M/yr`;
    }
    if (pricingCycle === 'lease_to_own') {
      const leaseMonthly = Math.round(baseMonthly * 1.35); // 24-month equity buyout
      return `₦${(leaseMonthly / 1000).toLocaleString()}k/mo`;
    }
    return `₦${(baseMonthly / 1000).toLocaleString()}k/mo`;
  };

  const handleStartTrial = (tier?: string) => {
    if (onStartProvisioning) {
      onStartProvisioning({
        subscriptionTier: (tier as any) || 'Apex Enterprise',
        businessModel: pricingCycle === 'yearly' ? 'yearly' : pricingCycle === 'lease_to_own' ? 'lease_to_own' : 'monthly'
      });
    } else if (onOpenProvisionModal) {
      onOpenProvisionModal();
    } else if (onOpenCloneModal) {
      onOpenCloneModal();
    }
  };

  const handleSignIn = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal();
    } else {
      onNavigateToMasterConsole();
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* ============================================================ */}
      {/* 1. TOP NAVIGATION BAR                                         */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-slate-800/70 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Hexagonal stacked 3D icon */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-[1.5px] shadow-lg shadow-indigo-900/40 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0a0e1a] rounded-[10px] flex items-center justify-center">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white font-display">CURRICULUM</span>
                <span className="text-xl font-extrabold tracking-tight text-indigo-400 font-display">SERVER</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">SaaS Multi-Tenant Cloud</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-300">
            {onNavigateToSaaSHub && (
              <button 
                onClick={onNavigateToSaaSHub}
                className="hover:text-emerald-400 text-slate-200 transition-colors cursor-pointer py-1 font-semibold flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>SaaS Hub</span>
              </button>
            )}

            {onNavigateToDomainPortal && (
              <button 
                onClick={onNavigateToDomainPortal}
                className="hover:text-amber-400 text-slate-200 transition-colors cursor-pointer py-1 font-semibold flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Domain Portal</span>
              </button>
            )}

            {onNavigateToSchoolInstance && (
              <button 
                onClick={onNavigateToSchoolInstance}
                className="hover:text-sky-400 text-slate-200 transition-colors cursor-pointer py-1 font-semibold flex items-center gap-1.5"
              >
                <School className="w-3.5 h-3.5 text-sky-400" />
                <span>School Instance View</span>
              </button>
            )}

            <button 
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              Pricing
            </button>

            {/* Resources Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
                onBlur={() => setTimeout(() => setResourcesDropdownOpen(false), 200)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1"
              >
                <span>Resources</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${resourcesDropdownOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`} />
              </button>

              {resourcesDropdownOpen && (
                <div className="absolute top-full mt-2 w-64 p-2 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button 
                    onClick={() => {
                      if (onOpenApiWebhooks) onOpenApiWebhooks();
                      setResourcesDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-xs flex items-center gap-3 transition-colors"
                  >
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="font-semibold text-white">Developer API & Webhooks</div>
                      <div className="text-[10px] text-slate-400">REST endpoints & event callbacks</div>
                    </div>
                  </button>

                  {onNavigateToDomainPortal && (
                    <button 
                      onClick={() => {
                        onNavigateToDomainPortal();
                        setResourcesDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-xs flex items-center gap-3 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-white">DNS Registry Portal (.sch.ng)</div>
                        <div className="text-[10px] text-slate-400">NIRA accredited domain manager</div>
                      </div>
                    </button>
                  )}

                  {onOpenIsolationTests && (
                    <button 
                      onClick={() => {
                        onOpenIsolationTests();
                        setResourcesDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-xs flex items-center gap-3 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold text-white">Isolation Verification Tests</div>
                        <div className="text-[10px] text-slate-400">Multi-tenant database boundary audit</div>
                      </div>
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      scrollToSection('faq');
                      setResourcesDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-xs flex items-center gap-3 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">SaaS Knowledge Base & FAQ</div>
                      <div className="text-[10px] text-slate-400">Answers to architecture questions</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => scrollToSection('about-us')}
              className="hover:text-white transition-colors cursor-pointer py-1"
            >
              About Us
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignIn}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() => handleStartTrial()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION (Dark Canvas with Dashboard Mockup)          */}
      {/* ============================================================ */}
      <section className="relative pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-12 left-1/4 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-24 right-1/4 translate-x-1/2 w-[650px] h-[380px] bg-purple-600/15 blur-[140px] pointer-events-none rounded-full" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines, Subtitle, CTAs & 4 Pillars */}
          <div className="lg:col-span-6 space-y-8 text-left">
            
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0f172a] border border-blue-500/30 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-bold text-blue-300 tracking-wider uppercase font-mono">
                THE PLATFORM THAT POWERS CURRICULUM FLOW
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-white leading-[1.12] font-display">
              Provision. Manage.<br />
              Scale.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">
                Empower.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              CURRICULUM SERVER is the all-in-one SaaS platform that helps you launch and manage unlimited CURRICULUM FLOW instances for schools – securely, automatically and at scale.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => handleStartTrial()}
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base flex items-center gap-2.5 shadow-xl shadow-indigo-950/70 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Start Your Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsVideoDemoOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-[#0d1322] hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-base flex items-center gap-2.5 transition-all shadow-md cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                  <Play className="w-3 h-3 text-indigo-400 fill-indigo-400 ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* 4 Feature Pillars Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              
              <div className="flex flex-col items-start gap-2 p-3 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">Multi-Tenant Architecture</span>
              </div>

              <div className="flex flex-col items-start gap-2 p-3 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">Isolated. Secure. Always Available.</span>
              </div>

              <div className="flex flex-col items-start gap-2 p-3 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">Auto Provisioning in Minutes</span>
              </div>

              <div className="flex flex-col items-start gap-2 p-3 rounded-xl bg-[#0f172a]/60 border border-slate-800/80">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 leading-snug">Powerful Analytics & Insights</span>
              </div>

            </div>

          </div>

          {/* Right Column: High-Fidelity Interactive Dashboard Mockup */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl bg-[#0c1222] border border-slate-800/90 shadow-2xl shadow-black/80 overflow-hidden">
              
              {/* Mockup Header */}
              <div className="bg-[#0f172a] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 ml-2">Dashboard</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    <Search className="w-3 h-3 text-slate-500" />
                    <span>Search schools, instances...</span>
                  </div>
                  <div className="relative">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0f172a]" />
                  </div>
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                      AD
                    </div>
                    <div className="hidden sm:block text-left text-[10px]">
                      <div className="font-bold text-slate-200 leading-tight">Admin</div>
                      <div className="text-slate-500 leading-tight">Super Administrator</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mockup Body with Left Sidebar + Content */}
              <div className="grid grid-cols-12 min-h-[440px]">
                
                {/* Left Mini Sidebar */}
                <div className="hidden sm:flex col-span-3 bg-[#0a0e1a]/95 border-r border-slate-800/80 p-2.5 flex-col justify-between text-[11px]">
                  <div className="space-y-1">
                    {/* Brand header */}
                    <div className="px-2 py-2 flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
                        <Layers className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-xs text-white">CURRICULUM SERVER</span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </div>
                    <div 
                      onClick={onNavigateToMasterConsole}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Tenants</span>
                    </div>
                    <div 
                      onClick={() => scrollToSection('pricing')}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Subscriptions</span>
                    </div>
                    <div 
                      onClick={() => handleStartTrial()}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Provisioning</span>
                    </div>
                    <div 
                      onClick={onNavigateToDomainPortal}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Domains & DNS</span>
                    </div>
                    <div 
                      onClick={onEnterSelfService}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Billing & Payments</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1">
                    <div 
                      onClick={onOpenIsolationTests}
                      className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-400 text-[10px] flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      <span>Isolation Audit</span>
                    </div>
                  </div>
                </div>

                {/* Right Main Mockup Content */}
                <div className="col-span-12 sm:col-span-9 p-3.5 sm:p-4 space-y-3.5 bg-[#0b101e]">
                  
                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Total Tenants</div>
                      <div className="text-base font-black text-white font-mono mt-0.5">324</div>
                      <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">▲ +12% this month</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Active Instances</div>
                      <div className="text-base font-black text-white font-mono mt-0.5">312</div>
                      <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">▲ +9% this month</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Subscriptions</div>
                      <div className="text-base font-black text-white font-mono mt-0.5">458</div>
                      <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">▲ +21% this month</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Revenue (This Month)</div>
                      <div className="text-base font-black text-indigo-300 font-mono mt-0.5">₦24.8M</div>
                      <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">▲ +18% this month</div>
                    </div>
                  </div>

                  {/* Provisioning Overview Chart */}
                  <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-200">Provisioning Overview</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">This Month ▾</span>
                    </div>

                    {/* Smooth SVG Area Line Chart */}
                    <div className="h-20 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path 
                          d="M 0,60 Q 50,45 100,55 T 200,30 T 300,40 T 400,10 L 400,80 L 0,80 Z" 
                          fill="url(#chartGrad)" 
                        />
                        <path 
                          d="M 0,60 Q 50,45 100,55 T 200,30 T 300,40 T 400,10" 
                          fill="none" 
                          stroke="#818cf8" 
                          strokeWidth="2.5" 
                        />
                        {/* Data Points */}
                        <circle cx="0" cy="60" r="3" fill="#818cf8" />
                        <circle cx="100" cy="55" r="3" fill="#818cf8" />
                        <circle cx="200" cy="30" r="3" fill="#818cf8" />
                        <circle cx="300" cy="40" r="3" fill="#818cf8" />
                        <circle cx="400" cy="10" r="4" fill="#a78bfa" className="animate-ping opacity-75" />
                        <circle cx="400" cy="10" r="3" fill="#ffffff" />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>May 1</span>
                      <span>May 8</span>
                      <span>May 15</span>
                      <span>May 22</span>
                      <span>May 29</span>
                    </div>
                  </div>

                  {/* Recent Tenants Table (Interactive) */}
                  <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-200">Recent Tenants</span>
                      <button 
                        onClick={onNavigateToMasterConsole}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {primaryMockTenants.map((t, idx) => (
                        <div 
                          key={t.id || idx}
                          onClick={() => onLaunchTenant(t)}
                          className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800/80 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {t.schoolName.substring(0, 1)}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                                {t.schoolName}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono">
                                {t.subdomain}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-bold">
                              Active
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Telemetry Status Bar */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-300 font-medium">System Status:</span>
                      <span className="text-emerald-400 font-bold">All Systems Operational</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Uptime: <strong className="text-white">99.99%</strong></span>
                      <span>Active Backups: <strong className="text-white">512</strong></span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        Protected
                      </span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

      </section>

      {/* ============================================================ */}
      {/* 3. SOCIAL PROOF / METRICS STRIP                               */}
      {/* ============================================================ */}
      <section className="bg-[#0c1222] border-y border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Trusted by forward-thinking education organizations
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-black text-white font-display">300+</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Schools Onboarded</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-black text-white font-display">500K+</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Students Impacted</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-black text-white font-display">99.99%</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Platform Uptime</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-black text-white font-display">24/7</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Monitoring & Support</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. "BUILT FOR SCALE" ARCHITECTURAL ISOLATION SECTION          */}
      {/* ============================================================ */}
      <section id="features" className="bg-slate-50 text-slate-900 py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Feature Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-xs font-black text-blue-600 uppercase tracking-widest font-mono">
              BUILT FOR SCALE
            </span>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight font-display">
              One Platform. Unlimited Schools. Limitless{' '}
              <span className="text-indigo-600">Possibilities.</span>
            </h2>

            <p className="text-slate-600 text-base leading-relaxed">
              CURRICULUM SERVER enables you to provision, manage and grow every CURRICULUM FLOW instance with ease. From subscription to domain, from payment to provisioning – everything is automated.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Automated subscription & billing',
                'Instant provisioning of school instances',
                'Custom domains & DNS management',
                'Feature management & add-ons',
                'Real-time analytics & performance monitoring',
                'Secure, isolated & reliable infrastructure'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button
                onClick={() => handleStartTrial()}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <span>Explore Features</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Architecture Sharding Diagram */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6">
              
              {/* Top Server Platform Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-base font-black tracking-tight">CURRICULUM SERVER</div>
                    <div className="text-xs text-indigo-300">SaaS Multi-Tenant Control Plane</div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-700 text-xs font-mono font-bold">
                  Active Master Node
                </span>
              </div>

              {/* Branching Tree Connectors */}
              <div className="flex justify-center -my-2">
                <div className="w-0.5 h-6 bg-indigo-300 border-l border-dashed border-indigo-400" />
              </div>

              {/* 3 Tenant Instances Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* School 1: Greenfield */}
                <div 
                  onClick={() => onLaunchTenant(greenfieldTenant)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                      G
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Isolated Env
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">
                    Greenfield Academy
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    greenfield.curriculumflow.com.ng
                  </p>

                  {/* Micro-preview thumbnail */}
                  <div className="mt-3 p-2 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="h-1.5 w-12 bg-slate-300 rounded" />
                    <div className="h-1.5 w-full bg-slate-200 rounded" />
                    <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                  </div>

                  {/* Micro Icons */}
                  <div className="flex items-center justify-between text-slate-400 text-xs mt-3 pt-2 border-t border-slate-200">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </div>

                {/* School 2: Royal Heritage */}
                <div 
                  onClick={() => onLaunchTenant(royalTenant)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                      R
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Isolated Env
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                    Royal Heritage School
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    royalheritage.curriculumflow.com.ng
                  </p>

                  {/* Micro-preview thumbnail */}
                  <div className="mt-3 p-2 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="h-1.5 w-12 bg-slate-300 rounded" />
                    <div className="h-1.5 w-full bg-slate-200 rounded" />
                    <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                  </div>

                  {/* Micro Icons */}
                  <div className="flex items-center justify-between text-slate-400 text-xs mt-3 pt-2 border-t border-slate-200">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </div>

                {/* School 3: Excellence College */}
                <div 
                  onClick={() => onLaunchTenant(excellenceTenant)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-400 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                      E
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Isolated Env
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-purple-700 transition-colors">
                    Excellence College
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    excellence.curriculumflow.com.ng
                  </p>

                  {/* Micro-preview thumbnail */}
                  <div className="mt-3 p-2 rounded-lg bg-white border border-slate-200 space-y-1.5">
                    <div className="h-1.5 w-12 bg-slate-300 rounded" />
                    <div className="h-1.5 w-full bg-slate-200 rounded" />
                    <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                  </div>

                  {/* Micro Icons */}
                  <div className="flex items-center justify-between text-slate-400 text-xs mt-3 pt-2 border-t border-slate-200">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </div>

              </div>

              {/* Bottom Security Guarantee Pill */}
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <p className="text-xs font-bold text-indigo-900 flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Secure • Isolated • Scalable</span>
                  <span className="text-indigo-400">•</span>
                  <span className="text-indigo-700 font-normal">Every school. Every data. Always protected.</span>
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. "FROM SUBSCRIPTION TO SCHOOL IN MINUTES" WORKFLOW BAR     */}
      {/* ============================================================ */}
      <section id="how-it-works" className="bg-[#0a0f1d] border-b border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/90 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Title */}
            <div className="lg:w-1/4">
              <h3 className="text-lg font-black text-white leading-snug font-display">
                From Subscription<br />to School in Minutes
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero dev ops required. Automated provisioning engine.
              </p>
            </div>

            {/* 5 Workflow Steps with arrows */}
            <div className="lg:w-3/4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 overflow-x-auto">
              
              {/* Step 1 */}
              <div 
                onClick={() => {
                  setActiveWorkflowStep(1);
                  scrollToSection('pricing');
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${activeWorkflowStep === 1 ? 'bg-indigo-950/60 border border-indigo-500' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">1. Choose Plan</span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />

              {/* Step 2 */}
              <div 
                onClick={() => {
                  setActiveWorkflowStep(2);
                  handleStartTrial();
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${activeWorkflowStep === 2 ? 'bg-indigo-950/60 border border-indigo-500' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Puzzle className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">2. Select Features</span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />

              {/* Step 3 */}
              <div 
                onClick={() => {
                  setActiveWorkflowStep(3);
                  if (onEnterSelfService) onEnterSelfService();
                  else scrollToSection('pricing');
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${activeWorkflowStep === 3 ? 'bg-indigo-950/60 border border-indigo-500' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">3. Make Payment</span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />

              {/* Step 4 */}
              <div 
                onClick={() => {
                  setActiveWorkflowStep(4);
                  handleStartTrial();
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${activeWorkflowStep === 4 ? 'bg-indigo-950/60 border border-indigo-500' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">4. Auto Provision</span>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />

              {/* Step 5 */}
              <div 
                onClick={() => {
                  setActiveWorkflowStep(5);
                  onLaunchTenant(greenfieldTenant);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer shrink-0 ${activeWorkflowStep === 5 ? 'bg-indigo-950/60 border border-indigo-500' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200">5. School is Live</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. TRANSPARENT PRICING & LEASE-TO-OWN CALCULATOR              */}
      {/* ============================================================ */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
          <span className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">
            INSTITUTIONAL PRICING
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            Predictable Pricing for Any School Scale
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            Choose between traditional annual licensing or our flexible <strong>Lease-to-Own</strong> path with 24-month equity buyout and perpetual license handover.
          </p>

          {/* Pricing Toggle */}
          <div className="inline-flex p-1.5 rounded-2xl bg-[#0f172a] border border-slate-800 mt-4">
            <button
              onClick={() => setPricingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${pricingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricingCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${pricingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <span>Yearly</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">Save 20%</span>
            </button>
            <button
              onClick={() => setPricingCycle('lease_to_own')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${pricingCycle === 'lease_to_own' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Lease-to-Own (24 Mo)</span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1: Starter */}
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">For Single Day Schools</div>
              <h3 className="text-xl font-bold text-white mt-1">Starter Academy</h3>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-mono">{getPlanPrice(180000)}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-sans">per instance</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Up to 800 students capacity with full NERDC core curriculum preloaded.</p>

              <div className="space-y-2.5 pt-6 border-t border-slate-800/80">
                {[
                  '1 Isolated Cloud Instance',
                  'NERDC 2026 Curriculum Pre-loaded',
                  'Standard CBT & Paper Exam Vault',
                  'Bursary Basic Invoicing',
                  'Subdomain (.curriculumflow.com.ng)',
                  'Standard Email Support'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartTrial('Starter Academy')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Select Starter Plan
            </button>
          </div>

          {/* Plan 2: Pro College (Most Popular) */}
          <div className="relative p-6 rounded-3xl bg-gradient-to-b from-indigo-950/60 to-[#0f172a] border-2 border-indigo-500 shadow-2xl shadow-indigo-950/80 flex flex-col justify-between space-y-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase">For Premier Colleges</div>
              <h3 className="text-xl font-bold text-white mt-1">Pro College</h3>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-mono">{getPlanPrice(320000)}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-sans">per instance</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Up to 2,000 students capacity with biometric turnstiles and custom domain.</p>

              <div className="space-y-2.5 pt-6 border-t border-slate-800/80">
                {[
                  'Dedicated Sharded Database',
                  'Custom .sch.ng Domain + SSL Included',
                  'AI Curriculum Advisor & Lesson Chain',
                  '2FA Principal Security Vault',
                  'Biometric RFID Turnstile Gate Sync',
                  'Bursary Paystack/OPay Automated Splits',
                  'Priority 24/7 SLA Support'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartTrial('Pro College')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 transition-all cursor-pointer"
            >
              Get Started with Pro
            </button>
          </div>

          {/* Plan 3: Apex Enterprise */}
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-bold text-purple-400 uppercase">For School Groups & Sovereign Boards</div>
              <h3 className="text-xl font-bold text-white mt-1">Apex Enterprise</h3>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-mono">{getPlanPrice(550000)}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-sans">per instance</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Unlimited students with on-prem Docker cache edge node and custom source escrow.</p>

              <div className="space-y-2.5 pt-6 border-t border-slate-800/80">
                {[
                  'Multi-Campus Clustered Deployment',
                  'Local Hybrid Edge Sync Node (Offline-Ready)',
                  'Full Source Code Escrow Agreement',
                  'REST Webhook API & Custom Integration',
                  'Dedicated DevOps Account Manager',
                  'Full Custom White-Label Brand Suite'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStartTrial('Apex Enterprise')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Talk to Enterprise Specialist
            </button>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FAQ ACCORDION SECTION                                      */}
      {/* ============================================================ */}
      <section id="faq" className="bg-[#090d18] border-t border-slate-800/80 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl font-black text-white font-display">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How fast is a new school instance provisioned?',
                a: 'Under 60 seconds. Our automated 12-step provisioning pipeline boots a sandboxed Docker container, seeds the official NERDC curriculum, registers dedicated database credentials, provisions SSL certificates, and generates cryptographically signed administrative credentials instantly.'
              },
              {
                q: 'Is student data isolated between different school tenants?',
                a: 'Yes, absolutely. CURRICULUM SERVER enforces strict multi-tenant database sharding. Each school instance operates on its own dedicated PostgreSQL schema or standalone cloud shard with zero cross-tenant leakage.'
              },
              {
                q: 'Can we connect our existing .sch.ng or .edu.ng domain?',
                a: 'Yes. Every school receives an instant SSL subdomain (e.g., greenfield.curriculumflow.com.ng) and can bind any custom root or sub-domain with automatic DNS verification via NIRA-accredited registrar protocols.'
              },
              {
                q: 'How does the Lease-to-Own model work?',
                a: 'Under our Lease-to-Own agreement, your monthly subscription builds equity over 24 months. At the conclusion of the lease period (or via early buyout), perpetual license rights and full self-hosted Docker deployment archives are transferred to your institution.'
              },
              {
                q: 'Does it work offline during power or network outages?',
                a: 'Yes. Our optional Hybrid Local Edge Node caches lessons, timetable registers, and biometric attendance locally, auto-syncing to the master cloud the moment connectivity is restored.'
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 transition-all"
              >
                <button
                  onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaqIndex === idx ? 'rotate-180 text-indigo-400' : ''}`} />
                </button>
                {activeFaqIndex === idx && (
                  <p className="text-xs text-slate-300 leading-relaxed mt-3 pt-3 border-t border-slate-800/80">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. PRE-FOOTER CONVERSION BANNER                               */}
      {/* ============================================================ */}
      <section id="about-us" className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 border border-indigo-500/40 p-8 sm:p-12 text-center shadow-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Join 300+ Forward-Thinking Schools</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight max-w-2xl mx-auto font-display">
            Ready to Launch Your School’s Sovereign Digital Infrastructure?
          </h2>

          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto">
            Experience the automated power of CURRICULUM SERVER today. Provision your first school instance in less than 60 seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleStartTrial()}
              className="px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-indigo-900 font-extrabold text-sm shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
            <button
              onClick={onNavigateToMasterConsole}
              className="px-6 py-4 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 text-white border border-indigo-400/40 font-bold text-sm transition-all cursor-pointer"
            >
              Enter SaaS Master Console
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. COMPREHENSIVE INSTITUTIONAL FOOTER                         */}
      {/* ============================================================ */}
      <footer className="bg-[#050811] border-t border-slate-900 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Column 1: Brand */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">CURRICULUM SERVER</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              The sovereign multi-tenant academic cloud engine powering CURRICULUM FLOW instances across Nigeria and Africa. Built for scale, verified security, and educational sovereignty.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (99.99% Uptime)</span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
            <ul className="space-y-2">
              <li><button onClick={() => handleStartTrial()} className="hover:text-white transition-colors cursor-pointer">Provisioning Engine</button></li>
              <li><button onClick={onNavigateToMasterConsole} className="hover:text-white transition-colors cursor-pointer">Multi-Tenant Console</button></li>
              <li><button onClick={onNavigateToDomainPortal} className="hover:text-white transition-colors cursor-pointer">DNS & .sch.ng Domains</button></li>
              <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">CBT Exam Lockdown</button></li>
              <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Biometric Hardware Gate</button></li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">Private K-12 Academies</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">Federal Unity Colleges</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">State Ministries of Education</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">Mission & Diocesan Boards</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">Lease-to-Own Sovereign</button></li>
            </ul>
          </div>

          {/* Column 4: Compliance & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security & Legal</h4>
            <ul className="space-y-2">
              <li><button onClick={onOpenIsolationTests} className="hover:text-white transition-colors cursor-pointer">Tenant Isolation Audit</button></li>
              <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">NDPR / NITDA Compliance</button></li>
              <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">NERDC 2026 Standard</button></li>
              <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">Terms of Service</button></li>
              <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">Privacy & Data Residency</button></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© 2026 CURRICULUM SERVER Inc. All rights reserved.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Back to top ↑
          </button>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 10. INTERACTIVE WATCH DEMO MODAL                              */}
      {/* ============================================================ */}
      {isVideoDemoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-[#0c1222] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 px-6 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">CURRICULUM SERVER Platform Walkthrough</h3>
                  <p className="text-[10px] text-slate-400">Interactive SaaS Provisioning & Multi-Tenant Tour</p>
                </div>
              </div>

              <button
                onClick={() => setIsVideoDemoOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Live Interactive Video Screen */}
            <div className="p-6 space-y-6">
              
              <div className="aspect-video w-full rounded-2xl bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE INTERACTIVE SIMULATION
                  </span>
                  <span className="text-xs text-slate-400 font-mono">01:45 / 03:00</span>
                </div>

                <div className="space-y-2 text-center max-w-md mx-auto">
                  <h4 className="text-xl font-bold text-white">Automated 12-Step School Sharding</h4>
                  <p className="text-xs text-slate-300">
                    Watch how Greenfield Academy was provisioned with dedicated database shards, 2FA Principal Vault, and NERDC syllabus in 48 seconds.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setIsVideoDemoOpen(false);
                      onLaunchTenant(greenfieldTenant);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Launch Greenfield Academy Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsVideoDemoOpen(false);
                      handleStartTrial();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Run Provisioning Terminal</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
