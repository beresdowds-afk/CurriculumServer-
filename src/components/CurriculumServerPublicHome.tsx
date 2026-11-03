import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Database, 
  Cloud, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Sparkles, 
  GraduationCap, 
  BarChart3, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  FileCode, 
  Terminal, 
  HardDrive, 
  Users, 
  ExternalLink,
  Laptop
} from 'lucide-react';
import { TenantSecurityContextManager } from '../services/tenantSecurityContext';

interface CurriculumServerPublicHomeProps {
  onGetStarted: () => void;
  onExploreFlow: () => void;
  onOpenControlPlaneLogin: () => void;
  onOpenCustomerPortalLogin?: () => void;
  onNavigateToConsole?: () => void;
}

export const CurriculumServerPublicHome: React.FC<CurriculumServerPublicHomeProps> = ({
  onGetStarted,
  onExploreFlow,
  onOpenControlPlaneLogin,
  onOpenCustomerPortalLogin,
  onNavigateToConsole
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'yearly' | 'lease_to_own'>('yearly');
  const [authEmail, setAuthEmail] = useState('');
  const [authRole, setAuthRole] = useState<'super_admin' | 'platform_operator' | 'support_engineer'>('super_admin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(prev => prev === idx ? null : idx);
  };

  const handleQuickPlatformLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const email = authEmail.trim() || 'admin@curriculumserver.com.ng';
      const token = TenantSecurityContextManager.issueTenantToken(
        { id: 'platform-control-plane', appId: 'CF-CONTROL-PLANE-001', schoolName: 'Curriculum Server Control Plane', status: 'active' } as any,
        'super_admin',
        72 * 3600,
        email
      );

      // Verify token immediately
      const verified = TenantSecurityContextManager.verifyTenantToken(token);
      if (verified.valid) {
        setAuthMessage('Authentication successful. Redirecting to Master Control Plane...');
        setTimeout(() => {
          if (onNavigateToConsole) {
            onNavigateToConsole();
          } else {
            window.location.hash = '#/platform_overview';
            window.location.reload();
          }
        }, 600);
      } else {
        setAuthMessage('Authentication error: cryptographic signature invalid');
      }
    } catch (err: any) {
      setAuthMessage(`Authentication failed: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const faqItems = [
    {
      q: 'How does Curriculum Server differ from traditional school management software?',
      a: 'Traditional solutions are monolithic, multi-tenant databases where every school shares the same codebase and fixed database table. Curriculum Server is a multi-architecture SaaS provisioning platform: it deploys sovereign, isolated application instances with dedicated PostgreSQL schemas, customer-selected cloud storage (GCS or Google Drive), and automated NERDC curriculum updates.'
    },
    {
      q: 'Can our institution transition from shared infrastructure to dedicated cloud servers?',
      a: 'Yes. Through the Intelligent Instance Architecture & Provisioning Engine (IIAPE), you can start on shared Cloud Run containers and migrate at any time to dedicated containers, dedicated Cloud SQL instances, or a sovereign GCP project without losing any institutional data, domain configurations, or user credentials.'
    },
    {
      q: 'How are tenant isolation and institutional security guaranteed?',
      a: 'Curriculum Server enforces multi-tenant boundaries at the database engine level via isolated schema namespaces and dedicated connection pools. Authentication uses cryptographically signed SHA-256 HMAC tokens with zero trust of client-controlled headers, while all privileged actions are committed to an immutable audit ledger.'
    },
    {
      q: 'What is the Lease-to-Own commercial model?',
      a: 'Our Lease-to-Own plan allows forward-thinking institutions to amortize their software licensing fees over a 24-month period into permanent institutional equity. At month 24, full sovereign handover of the deployment artifacts and database ownership is executed.'
    },
    {
      q: 'Can we run applications other than Curriculum Flow on the platform?',
      a: 'Yes. Curriculum Server features an open Application Registry. Beyond Curriculum Flow for school ERP, the platform natively registers and provisions Research Analytics suites and CBT Sovereign Testing engines, complete with container image references and automated health checks.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. ENTERPRISE HEADER                                          */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-[#070A0F]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-950/40">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>CURRICULUM SERVER</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Multi-Architecture Educational SaaS Platform</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#overview" className="hover:text-white transition-colors">Overview</a>
            <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
            <a href="#iiape" className="hover:text-white transition-colors">IIAPE Engine</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenControlPlaneLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4 text-purple-400" />
              <span>Admin Login</span>
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(147,51,234,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs text-purple-300 font-semibold tracking-wide">
                <span>ENTERPRISE CONTROL PLANE</span>
                <span aria-hidden="true">·</span>
                <span>POSTGRESQL 16 AUTHORITATIVE</span>
                <span aria-hidden="true">·</span>
                <span>NERDC 2026 STANDARDS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
                One Intelligent Platform. Multiple Possibilities. Limitless Architecture.
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                Build, configure and deploy intelligent digital platforms for educational institutions and organisations. From complete school management systems to specialised applications, Curriculum Server adapts to the architecture your organisation needs.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="px-6 py-3.5 text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-purple-950/40 transition-all flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#overview"
                  className="px-6 py-3.5 text-base font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl transition-all"
                >
                  Explore the Platform
                </a>
                <button
                  onClick={onExploreFlow}
                  className="px-6 py-3.5 text-base font-semibold bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/70 text-indigo-300 rounded-xl transition-all flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Curriculum Flow ERP</span>
                </button>
              </div>

              {/* Verified Trust Indicators */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-6 text-xs text-slate-400">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">99.98%</p>
                  <p className="mt-1">Cloud Run SLA Uptime</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">100%</p>
                  <p className="mt-1">Schema Tenant Isolation</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">24 Mo.</p>
                  <p className="mt-1">Lease-to-Own Equity</p>
                </div>
              </div>
            </div>

            {/* Platform Authentication & Quick Console Access Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-900/50 border border-purple-700/60 flex items-center justify-center">
                      <KeyRound className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Platform Control Authentication</h3>
                      <p className="text-[11px] text-slate-400">Secure operator & administrative access</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    SHA-256 HMAC
                  </span>
                </div>

                <form onSubmit={handleQuickPlatformLogin} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Platform Identity / Email
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="admin@curriculumserver.com.ng"
                      className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Access Scope
                    </label>
                    <select
                      value={authRole}
                      onChange={e => setAuthRole(e.target.value as any)}
                      className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="super_admin">Super Administrator (Full Fleet Control)</option>
                      <option value="platform_operator">Platform Operator (Infrastructure & Quotas)</option>
                      <option value="support_engineer">Technical Support (Instance Diagnostics)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <span>Verifying Cryptographic Tokens...</span>
                    ) : (
                      <>
                        <span>Authenticate to Control Plane</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {authMessage && (
                    <div className="p-2.5 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-300 text-center">
                      {authMessage}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center pt-2">
                    Zero trust architecture. Client-supplied headers (x-user-role, x-tenant-id) are strictly ignored and recorded as security violations.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. PLATFORM OVERVIEW                                          */}
      {/* ------------------------------------------------------------- */}
      <section id="overview" className="py-20 border-b border-slate-800/80 bg-[#0A0E17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Architectural Foundation</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              An Authoritative Core for Modern Educational Infrastructure
            </h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Curriculum Server replaces fragile single-database SaaS platforms with an authoritative relational architecture, automated provisioning, and sovereign multi-tenancy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center text-purple-400 mb-5">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">PostgreSQL Authoritative Storage</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Relational schema governance with PostgreSQL 16 LTS. Dedicated schema namespaces per tenant prevent cross-tenant record leakage, maintaining statutory FERPA and NDPR compliance.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-5">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Customer-Selectable Storage</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Zero vendor lock-in. Institutions choose between platform-managed Google Cloud Storage, institutionally-owned Google Workspace Drive, or hybrid placement for student academic records.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-700/50 flex items-center justify-center text-cyan-400 mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Cryptographic Audit Integrity</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Every tenant change, curriculum update, result publication, and administrative action is committed to a tamper-evident SHA-256 hash-chained audit ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. MULTI-APPLICATION ECOSYSTEM                                */}
      {/* ------------------------------------------------------------- */}
      <section id="ecosystem" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Application Ecosystem</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Not a Monolith. An Expanding Suite of Educational Applications.
              </h2>
              <p className="mt-3 text-base text-slate-300">
                Curriculum Server registers and deploys independent application families across educational administration, government intelligence, and computer-based examinations.
              </p>
            </div>
            <button
              onClick={onExploreFlow}
              className="self-start md:self-auto px-4 py-2.5 text-sm font-semibold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 rounded-xl transition-all flex items-center gap-2"
            >
              <span>Explore Curriculum Flow</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* App 1: Curriculum Flow */}
            <div className="bg-gradient-to-b from-slate-900 to-[#0A0F1D] border border-indigo-900/60 rounded-2xl p-6 relative group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/80 flex items-center justify-center text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  Production Ready
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Curriculum Flow</h3>
              <p className="text-xs font-medium text-indigo-300 mt-0.5">Academic Administration & School ERP</p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Full-featured institutional operating system covering lesson plan approvals, NERDC national curriculum synchronization, attendance, student registers, broadsheet reports, and bursary billing.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Docker Image: v1.4.0-stable</span>
                <button onClick={onExploreFlow} className="text-indigo-400 font-bold hover:underline flex items-center gap-1">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* App 2: Research & Policy Analytics */}
            <div className="bg-gradient-to-b from-slate-900 to-[#0A0F1D] border border-cyan-900/60 rounded-2xl p-6 relative group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  Production Ready
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">Research & Policy Analytics</h3>
              <p className="text-xs font-medium text-cyan-300 mt-0.5">Government & Education Board Intelligence</p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                State-wide and regional school performance aggregators, NERDC gazette audit synchronizers, enrollment heatmaps, and longitudinal academic progress tracking.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Docker Image: v2.0.1-gov</span>
                <span className="text-slate-400">Registered</span>
              </div>
            </div>

            {/* App 3: Examinations Hub & CBT Sovereign Engine */}
            <div className="bg-gradient-to-b from-slate-900 to-[#0A0F1D] border border-purple-900/60 rounded-2xl p-6 relative group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/80 flex items-center justify-center text-purple-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  Production Ready
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">CBT Sovereign Engine</h3>
              <p className="text-xs font-medium text-purple-300 mt-0.5">Testing & Certification Authority</p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                High-concurrency offline/online examination delivery, browser lockdown kiosk enforcement, question item banking, and instantaneous broadsheet scoring.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Docker Image: v3.1.0-cbt</span>
                <span className="text-slate-400">Registered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. IIAPE PROVISIONING ENGINE                                  */}
      {/* ------------------------------------------------------------- */}
      <section id="iiape" className="py-20 border-b border-slate-800/80 bg-[#0A0E17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Intelligent Engine</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Intelligent Instance Architecture & Provisioning Engine (IIAPE)
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                IIAPE evaluates institutional requirements—student enrollment, concurrent exam candidates, security classifications, and storage sovereignty—to synthesize optimal GCP infrastructure topologies.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Algorithmic Capacity Sizing</h4>
                    <p className="text-xs text-slate-300">Calculates precise vCPU, RAM, Cloud SQL connection pool sizes, and network egress limits based on real student load.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">100% Automated Deployment Checks</h4>
                    <p className="text-xs text-slate-300">Generates Cloud Run services, provisioned Cloud SQL databases, and storage placement rules with zero manual configuration.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">GCP Provider Reconciliation</h4>
                    <p className="text-xs text-slate-300">Strictly separates upfront architectural cost estimates from actual provider billing telemetry.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onGetStarted}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2"
                >
                  <span>Launch Universal Onboarding Wizard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Architectural Profile Sizing Preview */}
            <div className="lg:col-span-6 bg-[#070A0F] border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-mono text-purple-400">IIAPE_ENGINE_RECOMMENDATION</span>
                <span className="text-xs text-slate-400">Live Synthesis</span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Institutional Archetype</p>
                    <p className="text-xs text-slate-400">Full School Management (Curriculum Flow)</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">Pro College Tier</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Cloud Run Containers</p>
                    <p className="text-sm font-bold text-white mt-1 tabular-nums">2 vCPU / 4 GiB RAM</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Database Engine</p>
                    <p className="text-sm font-bold text-white mt-1">PostgreSQL 16 LTS</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Storage Placement</p>
                    <p className="text-sm font-bold text-white mt-1">Customer Google Drive</p>
                  </div>
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Isolation Level</p>
                    <p className="text-sm font-bold text-emerald-400 mt-1">Schema Namespace</p>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-purple-200">Predicted Infrastructure Cost</p>
                    <p className="text-slate-400">Actual GCP Tier 1 rate-card estimation</p>
                  </div>
                  <p className="text-base font-bold text-white tabular-nums">₦73,600 / mo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. PRICING & SUBSCRIPTION INFORMATION                          */}
      {/* ------------------------------------------------------------- */}
      <section id="pricing" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Transparent Licensing</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Predictable Investment. Permanent Institutional Value.
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Select between flexible annual subscriptions or build long-term institutional equity through our innovative 24-Month Lease-to-Own program.
            </p>

            {/* Cycle Switcher */}
            <div className="mt-8 inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setPricingCycle('monthly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  pricingCycle === 'monthly' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPricingCycle('yearly')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  pricingCycle === 'yearly' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly (20% Off)
              </button>
              <button
                onClick={() => setPricingCycle('lease_to_own')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  pricingCycle === 'lease_to_own' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lease-to-Own Equity
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Academy */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Starter Academy</h3>
                <p className="text-xs text-slate-400 mt-1">For Single Day Schools & Growing Private Academies</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tabular-nums">
                    {pricingCycle === 'yearly' ? '₦150,000' : pricingCycle === 'lease_to_own' ? '₦220,000' : '₦180,000'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {pricingCycle === 'lease_to_own' ? '24 months to 100% institutional ownership' : 'Billed annually'}
                </p>

                <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 800 enrolled students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Preloaded NERDC 2026 syllabus</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Standard CBT exam kiosk</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Bursary billing & student receipts</div>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Select Starter Plan
              </button>
            </div>

            {/* Pro College */}
            <div className="bg-gradient-to-b from-purple-950/40 via-slate-900 to-[#0A0F1D] border-2 border-purple-500 rounded-2xl p-6 flex flex-col justify-between relative shadow-xl shadow-purple-950/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider">
                Most Popular
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Pro College</h3>
                <p className="text-xs text-slate-400 mt-1">For Premier Secondary Colleges & High-Density Campuses</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tabular-nums">
                    {pricingCycle === 'yearly' ? '₦266,000' : pricingCycle === 'lease_to_own' ? '₦380,000' : '₦320,000'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {pricingCycle === 'lease_to_own' ? '24 months to 100% institutional ownership' : 'Billed annually'}
                </p>

                <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Up to 2,000 enrolled students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dedicated custom .sch.ng domain + SSL</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Biometric RFID turnstile gate sync</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Paystack & OPay automated fee splits</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Adaptive remedial learning engine</div>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/40 transition-all"
              >
                Select Pro College
              </button>
            </div>

            {/* Sovereign Fleet / University */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Sovereign Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">For Multi-Campus Foundations, Universities & Exam Boards</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white tabular-nums">Custom</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Dedicated GCP project or on-premise cloud</p>

                <div className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited capacity & students</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dedicated Cloud SQL PostgreSQL instances</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Customer-Managed Encryption Keys (CMEK)</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full technical handover & source repository</div>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Request Architecture Review
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. FREQUENTLY ASKED QUESTIONS                                  */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20 border-b border-slate-800/80 bg-[#0A0E17]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Questions & Answers</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqItems.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-base font-bold text-white"
                >
                  <span>{item.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-purple-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. FINAL CALL-TO-ACTION                                       */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 border-b border-slate-800/80 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance">
            Deploy Your Educational Platform on Sovereign Cloud Infrastructure
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            From single-campus academies to national examination boards, Curriculum Server provides the authoritative foundation for intelligent educational transformation.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 text-base font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-xl shadow-purple-950/40 transition-all flex items-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExploreFlow}
              className="px-8 py-3.5 text-base font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition-all"
            >
              Experience Curriculum Flow
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. ENTERPRISE FOOTER                                          */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-[#05070B] py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Server className="w-4 h-4 text-purple-400" />
              <span>CURRICULUM SERVER</span>
            </div>
            <p className="mt-3 leading-relaxed">
              Authoritative multi-architecture educational SaaS platform providing sovereign instance provisioning, PostgreSQL relational storage, and NERDC curriculum management.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Applications</h4>
            <ul className="space-y-2">
              <li><button onClick={onExploreFlow} className="hover:text-white transition-colors">Curriculum Flow ERP</button></li>
              <li><span className="text-slate-500">Research & Policy Analytics</span></li>
              <li><span className="text-slate-500">CBT Sovereign Engine</span></li>
              <li><span className="text-slate-500">NERDC Annual Worker</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Architecture & Security</h4>
            <ul className="space-y-2">
              <li><a href="#iiape" className="hover:text-white transition-colors">IIAPE Engine</a></li>
              <li><a href="#overview" className="hover:text-white transition-colors">PostgreSQL 16 LTS</a></li>
              <li><a href="#overview" className="hover:text-white transition-colors">Customer Storage Choice</a></li>
              <li><span className="hover:text-white transition-colors">SHA-256 Tamper Ledger</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Governance</h4>
            <ul className="space-y-2">
              <li><button onClick={onOpenControlPlaneLogin} className="hover:text-white transition-colors">Platform Admin Access</button></li>
              <li><button onClick={onOpenCustomerPortalLogin} className="hover:text-white transition-colors">Customer Self-Service</button></li>
              <li><span>Statutory NERDC Alignment</span></li>
              <li><span>NDPR / FERPA Compliance</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Curriculum Server Enterprise. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Unified Architecture v1.4.0</span>
            <span aria-hidden="true">·</span>
            <span>Independent Frontend Deployments</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
