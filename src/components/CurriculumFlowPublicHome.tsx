import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare, 
  ScanFace, 
  Laptop, 
  KeyRound, 
  School, 
  Award, 
  ChevronRight, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface CurriculumFlowPublicHomeProps {
  onEnterSchoolWorkspace: () => void;
  onSelectRoleLogin: (role: UserRole) => void;
  onOpenUniversalOnboarding?: () => void;
  onSwitchToServer: () => void;
}

export const CurriculumFlowPublicHome: React.FC<CurriculumFlowPublicHomeProps> = ({
  onEnterSchoolWorkspace,
  onSelectRoleLogin,
  onOpenUniversalOnboarding,
  onSwitchToServer
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('principal');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const handleRoleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      // Default email based on selected role
      let email = loginEmail.trim();
      if (!email) {
        if (selectedRole === 'principal') email = 'principal@curriculumflow.edu.ng';
        else if (selectedRole === 'teacher') email = 'teacher@curriculumflow.edu.ng';
        else if (selectedRole === 'bursar_finance') email = 'bursar@curriculumflow.edu.ng';
        else if (selectedRole === 'student') email = 'student@curriculumflow.edu.ng';
        else if (selectedRole === 'parent') email = 'parent@curriculumflow.edu.ng';
        else email = 'admin@curriculumflow.edu.ng';
      }

      // Authenticate with server-side validation
      await unifiedApiClient.loginSchool('tenant-apex-01', email, undefined, selectedRole);
      onEnterSchoolWorkspace();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const faqItems = [
    {
      q: 'How does Curriculum Flow support the statutory 2026 NERDC curriculum?',
      a: 'Curriculum Flow includes the entire preloaded NERDC basic and senior secondary curriculum database—encompassing performance objectives, teaching aids, teacher and student activities, and evaluation guides for every subject across all 3 terms.'
    },
    {
      q: 'Can Curriculum Flow operate offline during internet outages?',
      a: 'Yes. Curriculum Flow features a resilient hybrid offline engine. Teachers can mark roll calls, review lesson plans, and administer computer-based tests locally on the campus LAN. Data synchronizes automatically with the central cloud instance once connectivity is restored.'
    },
    {
      q: 'How are report cards and terminal examination broadsheets generated?',
      a: 'The assessment engine automatically calculates continuous assessment scores (first test, second test, assignment, midterm) and examination marks, computing weighted percentiles, subject positions, class averages, and automated principal remarks with QR-code verifiable report cards.'
    },
    {
      q: 'What payment options are supported for school fee settlement?',
      a: 'Curriculum Flow integrates directly with verified Nigerian payment gateways including Paystack and OPay. School fees can be settled via debit cards, USSD, or dedicated dynamic virtual bank transfer accounts with instant automated reconciliation.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. ACADEMIC HEADER                                            */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-emerald-950/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>CURRICULUM FLOW</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-400">Connected Institutional Education Operating System</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#about" className="hover:text-emerald-400 transition-colors">About</a>
            <a href="#academics" className="hover:text-emerald-400 transition-colors">Academics</a>
            <a href="#teaching" className="hover:text-emerald-400 transition-colors">Teaching & CBT</a>
            <a href="#finance" className="hover:text-emerald-400 transition-colors">Finance & Bursary</a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">Security</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToServer}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <span>Platform SaaS</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            </button>
            <a
              href="#portal-login"
              className="px-4 py-2 text-sm font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 rounded-xl transition-all"
            >
              Sign In
            </a>
            <button
              onClick={onEnterSchoolWorkspace}
              className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-1.5"
            >
              <span>Open Campus Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs text-emerald-300 font-semibold tracking-wide">
                <span>EDUCATION OPERATING SYSTEM</span>
                <span aria-hidden="true">·</span>
                <span>NERDC 2026 GAZETTED</span>
                <span aria-hidden="true">·</span>
                <span>OFFLINE LAN SYNC</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
                Transforming Education. Connecting Every Possibility.
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                An intelligent, configurable education management platform that brings school administration, academic operations, teaching, assessment, communication and institutional management into one connected experience.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={onEnterSchoolWorkspace}
                  className="px-6 py-3.5 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xl shadow-emerald-950/40 transition-all flex items-center gap-2"
                >
                  <span>Launch Campus Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#portal-login"
                  className="px-6 py-3.5 text-base font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl transition-all"
                >
                  Institutional Sign In
                </a>
                {onOpenUniversalOnboarding && (
                  <button
                    onClick={onOpenUniversalOnboarding}
                    className="px-6 py-3.5 text-base font-semibold bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/70 text-teal-300 rounded-xl transition-all flex items-center gap-2"
                  >
                    <School className="w-4 h-4" />
                    <span>Onboard Your School</span>
                  </button>
                )}
              </div>

              {/* Verified Capability Metrics */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-6 text-xs text-slate-400">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">48 Subjects</p>
                  <p className="mt-1">NERDC Syllabi Preloaded</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">10,000+</p>
                  <p className="mt-1">Verified CBT Item Bank</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">Instant</p>
                  <p className="mt-1">RFID Gate Notification</p>
                </div>
              </div>
            </div>

            {/* Context-Aware School Stakeholder Authentication Card */}
            <div id="portal-login" className="lg:col-span-5">
              <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Institutional Portal Login</h3>
                      <p className="text-[11px] text-slate-400">Role-aware entrance for campus users</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    Server Enforced
                  </span>
                </div>

                <form onSubmit={handleRoleQuickLogin} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Select User Category
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0F17] rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('principal')}
                        className={`py-2 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          selectedRole === 'principal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Principal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('ict_system_admin')}
                        className={`py-2 px-3 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          selectedRole === 'ict_system_admin' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>ICT Admin</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Institutional Identity / Email
                    </label>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder={
                        selectedRole === 'principal' ? 'principal@curriculumflow.edu.ng' :
                        selectedRole === 'teacher' ? 'teacher@curriculumflow.edu.ng' :
                        selectedRole === 'bursar_finance' ? 'bursar@curriculumflow.edu.ng' :
                        selectedRole === 'student' ? 'student@curriculumflow.edu.ng' :
                        selectedRole === 'parent' ? 'parent@curriculumflow.edu.ng' :
                        'admin@curriculumflow.edu.ng'
                      }
                      className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
                  >
                    {loginLoading ? (
                      <span>Validating Institutional Role...</span>
                    ) : (
                      <>
                        <span>Sign In as {selectedRole.replace(/_/g, ' ').toUpperCase()}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {loginError && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 text-center">
                      {loginError}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center pt-2">
                    Permissions are strictly resolved and validated by the backend. User cannot escalate privileges by selecting an unauthorized role.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. ABOUT CURRICULUM FLOW                                      */}
      {/* ------------------------------------------------------------- */}
      <section id="about" className="py-20 border-b border-slate-800 bg-[#090D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Academic Excellence</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              An Unified Operating System for Modern Educational Institutions
            </h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Designed from the ground up for Nigerian and West African basic, secondary, and model colleges, Curriculum Flow coordinates academic compliance, daily pedagogy delivery, continuous assessment, and bursary accounting.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-5">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Full NERDC Syllabus Alignment</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                National educational requirements built directly into schemes of work. Teachers follow Bloom-taxonomy aligned performance objectives and approved teaching aids.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-700/60 flex items-center justify-center text-teal-400 mb-5">
                <ScanFace className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Biometric Turnstile Attendance</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Automated gate RFID card swipe and facial recognition turnstile tracking. Instant push SMS and WhatsApp arrival notifications sent to registered parents.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400 mb-5">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Tamper-Proof Bursary & Split PSP</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Automated fee collection via Paystack & OPay with dynamic account number generation, immediate bank split payouts, and cryptographic QR receipt verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. ACADEMIC & TEACHING SUITE                                  */}
      {/* ------------------------------------------------------------- */}
      <section id="academics" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Pedagogy & Assessment</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              From Curriculum Design to CBT Examination Kiosks
            </h2>
            <p className="mt-3 text-base text-slate-300">
              Curriculum Flow equips educators with the tools needed to plan, deliver, evaluate, and remediate learning at institutional scale.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Lesson Approval Chain</h4>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Structured HOD review workflows. Teachers submit lesson notes, receiving actionable feedback before classroom delivery.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-4">
                <Laptop className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Lockdown CBT Kiosks</h4>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Secure computer-based testing with anti-cheat browser lockdown, randomized question order, and instant scoring broadsheets.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Adaptive Remedial Engine</h4>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Diagnoses student topic deficiencies and automatically generates customized remedial practice sets aligned with exam boards.
              </p>
            </div>

            <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Terminal Broadsheet Studio</h4>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Automated continuous assessment calculation, class positioning, principal remarks, and verifiable PDF report cards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. SECURITY & INSTITUTIONAL DATA PROTECTION                   */}
      {/* ------------------------------------------------------------- */}
      <section id="security" className="py-20 border-b border-slate-800 bg-[#090D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Compliance & Privacy</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Institutional Data Protection, FERPA & NDPR Sovereign Security
              </h2>
              <p className="text-base text-slate-300 leading-relaxed">
                Student academic records and biometric attendance logs represent highly sensitive institutional data. Curriculum Flow enforces strict role boundaries, schema isolation, and cryptographic auditability.
              </p>

              <div className="space-y-3 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>TRCN credential verification and multi-factor authentication for academic personnel</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Immutable audit logs recording every grade adjustment, attendance change, and bursary entry</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Encrypted customer-managed storage ensuring institutions retain 100% legal custody of records</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-mono text-emerald-400">INSTITUTIONAL_ROLE_AUTHORIZATION</span>
                <span className="text-xs text-slate-400">Enforced Server-Side</span>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-[#0B0F17] rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-white">Principal / Head of School</span>
                  <span className="text-emerald-400 font-mono">Full Academic & Staff Approvals</span>
                </div>
                <div className="p-3 bg-[#0B0F17] rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-white">Subject Specialist Teacher</span>
                  <span className="text-emerald-400 font-mono">Class Marks & Delivery Logs Only</span>
                </div>
                <div className="p-3 bg-[#0B0F17] rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-white">Bursar & Finance Office</span>
                  <span className="text-emerald-400 font-mono">Billing & Invoicing (No Grade Editing)</span>
                </div>
                <div className="p-3 bg-[#0B0F17] rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-white">Student & Parent Portal</span>
                  <span className="text-emerald-400 font-mono">Read-Only Assigned Ward Records</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. FREQUENTLY ASKED QUESTIONS                                  */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-20 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Questions & Answers</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions About Curriculum Flow
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqItems.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(prev => prev === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-base font-bold text-white"
                >
                  <span>{item.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-emerald-400 shrink-0" />
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
      {/* 7. FINAL CALL-TO-ACTION                                       */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 border-b border-slate-800 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance">
            Elevate Your Institution's Academic Standards Today
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Experience the modern educational platform built for teachers, students, parents, and academic administrators.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onEnterSchoolWorkspace}
              className="px-8 py-3.5 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xl shadow-emerald-950/40 transition-all flex items-center gap-2"
            >
              <span>Launch Campus Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#portal-login"
              className="px-8 py-3.5 text-base font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl transition-all"
            >
              Institutional Login
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. ACADEMIC FOOTER                                            */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-[#05070B] py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>CURRICULUM FLOW</span>
            </div>
            <p className="mt-3 leading-relaxed">
              Institutional academic operations, curriculum governance, biometric attendance, continuous assessments, and bursary accounting.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Academic Modules</h4>
            <ul className="space-y-2">
              <li><span>NERDC 2026 Curriculum</span></li>
              <li><span>Lesson Approval Chain</span></li>
              <li><span>Lockdown CBT Kiosks</span></li>
              <li><span>Adaptive Remedials</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Administrative Tools</h4>
            <ul className="space-y-2">
              <li><span>Biometric RFID Attendance</span></li>
              <li><span>Paystack/OPay Bursary</span></li>
              <li><span>Parent Portal Sync</span></li>
              <li><span>SMS/WhatsApp Broadcast</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Curriculum Platform</h4>
            <ul className="space-y-2">
              <li><button onClick={onSwitchToServer} className="hover:text-white transition-colors">Curriculum Server SaaS</button></li>
              <li><span>Sovereign Instance Deployment</span></li>
              <li><span>Customer-Selectable Cloud</span></li>
              <li><span>Privacy & NDPR Compliance</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Curriculum Flow Academic OS. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Powered by Curriculum Server</span>
            <span aria-hidden="true">·</span>
            <span>Independent Frontend Deployments</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
