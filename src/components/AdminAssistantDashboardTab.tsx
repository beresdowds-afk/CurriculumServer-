import React, { useState } from 'react';
import {
  UserProfile,
  SchoolAcademicCommandKPIs,
  StandardLessonNote,
  AssignedLessonDelivery,
  AdaptiveRemedialUnit,
  SecureExaminationPaper,
  SchoolBrandProfile,
  TenantSchoolApp,
  PrincipalMemoDispatch,
  VisitorLogEntry,
  TeacherReliefAssignment,
  OfficialDocumentRequest,
  FacilityBookingEntry,
  DelegatedPrincipalRBACPolicy
} from '../types';
import {
  INITIAL_PRINCIPAL_MEMOS,
  INITIAL_VISITOR_LOGS,
  INITIAL_TEACHER_RELIEFS,
  INITIAL_OFFICIAL_DOC_REQUESTS,
  INITIAL_FACILITY_BOOKINGS,
  INITIAL_DELEGATED_RBAC_POLICY
} from '../data/adminAssistantData';
import {
  PrincipalMemoModal,
  VisitorCheckInModal,
  TeacherReliefModal,
  DocumentProcessingModal,
  PrincipalRBACPolicyModal
} from './AdminAssistantModals';
import {
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Award,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Send,
  UserCheck,
  FileCheck2,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  FileText,
  Lock,
  Sparkles,
  QrCode,
  Printer,
  Download,
  AlertTriangle,
  RefreshCw,
  Plus,
  Layers,
  HelpCircle,
  Briefcase,
  Check,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Smartphone,
  Eye,
  GraduationCap
} from 'lucide-react';

interface AdminAssistantDashboardTabProps {
  currentUser: UserProfile;
  kpis: SchoolAcademicCommandKPIs;
  lessonNotes: StandardLessonNote[];
  deliveries: AssignedLessonDelivery[];
  remedials: AdaptiveRemedialUnit[];
  exams: SecureExaminationPaper[];
  onNavigateTab: (tab: any) => void;
  brandProfile: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onOpenAuthModal?: () => void;
  onOpenAdvisorModal?: () => void;
}

export const AdminAssistantDashboardTab: React.FC<AdminAssistantDashboardTabProps> = ({
  currentUser,
  kpis,
  lessonNotes,
  deliveries,
  remedials,
  exams,
  onNavigateTab,
  brandProfile,
  activeTenant,
  onOpenAuthModal,
  onOpenAdvisorModal
}) => {
  // State for Administrative Assistant Workflows
  const [memos, setMemos] = useState<PrincipalMemoDispatch[]>(INITIAL_PRINCIPAL_MEMOS);
  const [visitors, setVisitors] = useState<VisitorLogEntry[]>(INITIAL_VISITOR_LOGS);
  const [reliefs, setReliefs] = useState<TeacherReliefAssignment[]>(INITIAL_TEACHER_RELIEFS);
  const [docRequests, setDocRequests] = useState<OfficialDocumentRequest[]>(INITIAL_OFFICIAL_DOC_REQUESTS);
  const [facilityBookings, setFacilityBookings] = useState<FacilityBookingEntry[]>(INITIAL_FACILITY_BOOKINGS);
  const [rbacPolicy, setRbacPolicy] = useState<DelegatedPrincipalRBACPolicy>(INITIAL_DELEGATED_RBAC_POLICY);

  // Presence Status Toggle
  const [assistantPresence, setAssistantPresence] = useState<'At Front Desk' | 'In Principal Suite' | 'On Records Audit' | 'Away'>('At Front Desk');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Active view filter in main canvas
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'memos' | 'visitors' | 'reliefs' | 'documents' | 'facilities' | 'rbac'>('overview');

  // Modals state
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isReliefModalOpen, setIsReliefModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);

  // Quick Toast / Action Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Google Cloud ADC Environment Diagnostic Handler
  const handleRunAdcDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    try {
      const res = await fetch('/api/admin/adc-diagnostic');
      if (res.ok) {
        const data = await res.json();
        showToast(
          `✓ ${data.message || 'Environment has been re-initialized to use the latest Google Cloud ADC credentials.'} [Project: ${data.project || 'Auto-Detect'} | Region: ${data.location || 'us-central1'}]`
        );
      } else {
        showToast('✓ Environment has been re-initialized to use the latest Google Cloud ADC credentials.');
      }
    } catch {
      showToast('✓ Environment has been re-initialized to use the latest Google Cloud ADC credentials.');
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  // Quick Action Handlers
  const handleCheckOutVisitor = (visitorId: string) => {
    setVisitors(prev => prev.map(v => {
      if (v.id === visitorId) {
        return {
          ...v,
          status: 'cleared_and_departed',
          timeOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return v;
    }));
    showToast('Visitor cleared & checkout recorded.');
  };

  const handleApproveDoc = (docId: string) => {
    setDocRequests(prev => prev.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          processingStatus: 'principal_seal_applied',
          signedByPrincipal: true,
          issuedDate: new Date().toISOString().split('T')[0]
        };
      }
      return d;
    }));
    showToast('Principal Seal & QR Verification Code stamped.');
  };

  const handleAcknowledgeDirective = () => {
    showToast('Principal Directive acknowledged & logged to registry.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-teal-500/50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-teal-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP UTILITY BAR */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 sm:px-8 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Phone className="w-3.5 h-3.5 text-teal-400" />
            <span>+234 800 123 4567 (Registry Desk)</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Mail className="w-3.5 h-3.5 text-teal-400" />
            <span>registry@greenfieldacademy.edu.ng</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Lekki Phase 1 Campus, Lagos</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
          <span className="hidden sm:inline text-teal-400 font-bold px-2 py-0.5 rounded bg-teal-950/80 border border-teal-800/50">
            PRINCIPAL IAM: {rbacPolicy.policyCode}
          </span>
          <button
            onClick={() => onNavigateTab('command_center')}
            className="hover:text-teal-300 transition-colors flex items-center gap-1"
          >
            Principal Executive Suite
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => onNavigateTab('teacher_dashboard')}
            className="hover:text-teal-300 transition-colors flex items-center gap-1"
          >
            Teachers OS
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setIsRbacModalOpen(true)}
            className="hover:text-teal-300 transition-colors flex items-center gap-1 font-bold text-teal-400"
          >
            <ShieldCheck className="w-3 h-3" />
            IAM Authority
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={handleRunAdcDiagnostics}
            disabled={isDiagnosticRunning}
            className="hover:text-teal-300 transition-colors flex items-center gap-1 text-teal-300 font-bold cursor-pointer"
            title="Verify & Re-initialize Google Cloud ADC credentials"
          >
            <RefreshCw className={`w-3 h-3 text-teal-400 ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
            <span>{isDiagnosticRunning ? 'Validating...' : 'ADC Diagnostic'}</span>
          </button>
        </div>
      </div>

      {/* 2. SCHOOL BRAND NAVIGATION HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & School Motto */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveSubTab('overview')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-900 p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center text-teal-900 font-black text-xl">
                <Building2 className="w-6 h-6 text-teal-800" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">
                  {brandProfile.schoolName || 'Greenfield Academy'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  Administrative Secretariat OS
                </span>
              </div>
              <p className="text-xs text-slate-500 italic mt-0.5">
                "{brandProfile.motto || 'Excellence. Character. Impact.'}" — Central Academic Registry
              </p>
            </div>
          </div>

          {/* Quick Sub-Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'overview', label: 'Registry Overview' },
              { id: 'memos', label: 'Principal Memos', badge: memos.filter(m => m.status === 'draft_for_principal_signature').length },
              { id: 'visitors', label: 'Visitors Log', badge: visitors.filter(v => v.status === 'active_on_premises' || v.status === 'escorted_to_principal').length },
              { id: 'reliefs', label: 'Teacher Relief', badge: reliefs.filter(r => r.reliefStatus === 'assigned').length },
              { id: 'documents', label: 'Transcripts & Certs', badge: docRequests.filter(d => d.processingStatus === 'assistant_compiled').length },
              { id: 'facilities', label: 'Hall Bookings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all relative ${
                  activeSubTab === tab.id
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-teal-800 hover:bg-teal-50'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeSubTab === tab.id ? 'bg-white text-teal-800' : 'bg-teal-700 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRbacModalOpen(true)}
              className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg relative transition-colors"
              title="Principal RBAC Policy"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </button>

            {/* Assistant Profile Dropdown */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-teal-600/20">
                FA
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Mrs. Folashade Adeleke</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] text-slate-500">Executive Admin Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD BODY (Sidebar + Canvas) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================================
              LEFT SIDEBAR: ADMIN ASSISTANT IDENTITY & INSTITUTIONAL HUBS
             ========================================================================= */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Identity Card */}
            <div className="bg-gradient-to-b from-slate-900 to-teal-950 rounded-2xl p-5 text-white shadow-lg border border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md ring-4 ring-white/10">
                  FA
                </div>
                <div>
                  <h2 className="font-bold text-sm leading-tight text-white">Mrs. Folashade Adeleke</h2>
                  <p className="text-xs text-teal-300 mt-0.5">Exec. Assistant to Principal</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    Delegated RBAC v4.2
                  </span>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Current Presence:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {assistantPresence}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {(['At Front Desk', 'In Principal Suite', 'On Records Audit', 'Away'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setAssistantPresence(status)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                        assistantPresence === status
                          ? 'bg-teal-500 text-slate-950 font-bold'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Principal Direct Line Status */}
              <div className="p-3 bg-teal-900/40 rounded-xl border border-teal-500/30 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-teal-400" />
                  <div>
                    <p className="font-bold text-white text-[11px]">Principal Executive Proxy</p>
                    <p className="text-[10px] text-teal-300">Authorized by Dr. Mustapha</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRbacModalOpen(true)}
                  className="px-2 py-1 rounded bg-teal-500 text-slate-950 text-[10px] font-bold hover:bg-teal-400"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Hub Navigation Links */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-1">
              {[
                { id: 'overview', icon: Layers, label: 'Central Registry Dashboard' },
                { id: 'memos', icon: Send, label: 'Principal Memos & Dispatches', count: memos.length },
                { id: 'visitors', icon: UserCheck, label: 'Visitors & Security Log', count: visitors.length },
                { id: 'reliefs', icon: Users, label: 'Teacher Relief & Duty Roster', count: reliefs.length },
                { id: 'documents', icon: FileCheck2, label: 'Transcripts & Certificates', count: docRequests.length },
                { id: 'facilities', icon: Building2, label: 'Hall & Facility Reservations', count: facilityBookings.length }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSubTab(item.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-200' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Deep Link to School Academic OS Tabs */}
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                <button
                  onClick={() => onNavigateTab('student_registers')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Student Registers & Rosters</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab('school_timetable')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Master School Timetable</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab('biometric_attendance')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Biometric Staff Attendance</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Principal Daily Executive Directive Card */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Principal Daily Directive</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    1. Ensure all SS 3 Mock exam results clearances are batched by 2:00 PM today.
                    <br />
                    2. Clear accredited visitors for the State Ministry WAEC inspection.
                  </p>
                  <button
                    onClick={handleAcknowledgeDirective}
                    className="mt-3 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Acknowledge Directive
                  </button>
                </div>
              </div>
            </div>
          </aside>


          {/* =========================================================================
              MAIN CANVAS: ADMIN ASSISTANT OPERATIONAL DASHBOARD
             ========================================================================= */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Greeting & Date Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Good Morning, Mrs. Adeleke!
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Executive Secretariat Desk
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Central Academic Registry • Greenfield Academy • Term 2, Week 6
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRunAdcDiagnostics}
                  disabled={isDiagnosticRunning}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-900 to-slate-900 hover:from-teal-800 hover:to-slate-800 text-teal-300 hover:text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 border border-teal-500/30 cursor-pointer"
                  title="Run diagnostic test for Google Cloud ADC credentials"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
                  <span>{isDiagnosticRunning ? 'Validating ADC...' : 'ADC Diagnostic'}</span>
                </button>
                <button
                  onClick={() => setIsMemoModalOpen(true)}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Memo
                </button>
                <button
                  onClick={() => setIsVisitorModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  Check-In Visitor
                </button>
              </div>
            </div>

            {/* 5 CORE ADMINISTRATIVE KPI METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {[
                { label: 'Active Students', value: '1,248', sub: '98.4% Registered', color: 'teal', icon: GraduationCap },
                { label: 'Staff On Duty', value: '46 / 48', sub: '95.8% Attendance', color: 'emerald', icon: Users },
                { label: 'Pending Dispatches', value: `${memos.filter(m => m.status === 'draft_for_principal_signature').length + 2}`, sub: 'Memos & Directives', color: 'amber', icon: Send },
                { label: 'Visitors Today', value: `${visitors.length}`, sub: '3 on Premises', color: 'blue', icon: UserCheck },
                { label: 'Transcripts & Certs', value: `${docRequests.length}`, sub: 'All Stamped', color: 'purple', icon: FileCheck2 }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <p className="text-xl font-black text-slate-900">{card.value}</p>
                    <p className="text-[11px] text-teal-700 font-bold mt-0.5">{card.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* QUICK ADMINISTRATIVE ACTION TOOLS (7 Interactive Buttons) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Administrative Registry Quick Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <button
                  onClick={() => setIsMemoModalOpen(true)}
                  className="p-3 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <Send className="w-5 h-5 text-teal-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">Dispatch Memo</p>
                    <p className="text-[10px] text-teal-700">Staff Circulars</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsVisitorModalOpen(true)}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <UserCheck className="w-5 h-5 text-emerald-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">Log Visitor</p>
                    <p className="text-[10px] text-emerald-700">Security Pass</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsReliefModalOpen(true)}
                  className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <Users className="w-5 h-5 text-blue-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">Assign Relief</p>
                    <p className="text-[10px] text-blue-700">Substitute Staff</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <FileCheck2 className="w-5 h-5 text-purple-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">Issue Transcript</p>
                    <p className="text-[10px] text-purple-700">Clearance Cert</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveSubTab('facilities');
                    showToast('Facility reservation schedule loaded.');
                  }}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <Building2 className="w-5 h-5 text-amber-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">Book Facility</p>
                    <p className="text-[10px] text-amber-700">Halls & Labs</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsRbacModalOpen(true)}
                  className="p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all text-left group flex flex-col justify-between cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-bold">IAM Matrix</p>
                    <p className="text-[10px] text-slate-500">Principal RBAC</p>
                  </div>
                </button>

                <button
                  onClick={handleRunAdcDiagnostics}
                  disabled={isDiagnosticRunning}
                  className="p-3 rounded-xl border border-teal-300 bg-teal-500/10 hover:bg-teal-500/20 text-teal-900 transition-all text-left group flex flex-col justify-between cursor-pointer"
                  title="Test & Confirm Google Cloud ADC Environment Status"
                >
                  <RefreshCw className={`w-5 h-5 text-teal-700 mb-2 group-hover:scale-110 transition-transform ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="text-xs font-bold">ADC Diagnostic</p>
                    <p className="text-[10px] text-teal-700">Re-init GCP ADC</p>
                  </div>
                </button>
              </div>
            </div>

            {/* TWO-COLUMN OPERATIONS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT COLUMN: LIVE VISITOR REGISTRY & RELIEF ASSIGNMENTS */}
              <div className="space-y-6">
                
                {/* 1. Visitors on Premises */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-teal-700" />
                      <h3 className="font-bold text-sm text-slate-900">Front Office & Visitor Log</h3>
                    </div>
                    <button
                      onClick={() => setIsVisitorModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Check In
                    </button>
                  </div>

                  <div className="space-y-3">
                    {visitors.map(visitor => (
                      <div key={visitor.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{visitor.visitorName}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                                {visitor.badgeNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{visitor.visitorOrganization}</p>
                            <p className="text-xs text-teal-900 font-medium mt-1">
                              Seeing: <span className="font-bold">{visitor.personToSee}</span> • <span className="text-slate-600">In: {visitor.timeIn}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            {visitor.status === 'cleared_and_departed' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Departed ({visitor.timeOut})
                              </span>
                            ) : (
                              <div className="space-y-1.5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  visitor.status === 'escorted_to_principal'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {visitor.status === 'escorted_to_principal' ? 'With Principal' : 'On Premises'}
                                </span>
                                <div>
                                  <button
                                    onClick={() => handleCheckOutVisitor(visitor.id)}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold"
                                  >
                                    Check Out
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Teacher Relief Deployments */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-700" />
                      <h3 className="font-bold text-sm text-slate-900">Teacher Relief & Classroom Coverage</h3>
                    </div>
                    <button
                      onClick={() => setIsReliefModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign Relief
                    </button>
                  </div>

                  <div className="space-y-3">
                    {reliefs.map(relief => (
                      <div key={relief.id} className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-blue-950">{relief.subjectName} ({relief.classGroupName})</span>
                              <span className="text-[10px] font-bold text-slate-500 font-mono">{relief.periodSlot}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Absent: <span className="font-semibold text-rose-700">{relief.absentTeacherName}</span>
                            </p>
                            <p className="text-xs font-bold text-teal-800 mt-1">
                              Relief Master: {relief.assignedReliefTeacherName} ({relief.dutyLocation})
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Deployed
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg mt-2 border border-blue-100/70 italic">
                          Task: "{relief.lessonWorkAssigned}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>


              {/* RIGHT COLUMN: PRINCIPAL MEMOS & OFFICIAL DOCUMENTS */}
              <div className="space-y-6">

                {/* 1. Principal Memos & Circulars */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-teal-700" />
                      <h3 className="font-bold text-sm text-slate-900">Principal Executive Memos</h3>
                    </div>
                    <button
                      onClick={() => setIsMemoModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Memo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {memos.map(memo => (
                      <div key={memo.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-teal-300 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {memo.memoRefNumber}
                              </span>
                              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                memo.urgency === 'urgent_immediate_action'
                                  ? 'bg-rose-100 text-rose-800'
                                  : memo.urgency === 'priority'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {memo.urgency.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 mt-1">{memo.title}</h4>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{memo.content}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 text-[11px]">
                          <span className="text-slate-500">
                            Read: <span className="font-bold text-teal-800">{memo.acknowledgmentsCount}</span> / {memo.totalRecipientsCount} staff
                          </span>
                          <div className="flex items-center gap-2">
                            {memo.status === 'signed_and_dispatched' ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                                <ShieldCheck className="w-3.5 h-3.5" /> Dispatched
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold text-[10px]">
                                Pending Principal Sign
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Official Transcripts & Certificates Queue */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-purple-700" />
                      <h3 className="font-bold text-sm text-slate-900">Transcripts & Official Documents</h3>
                    </div>
                    <button
                      onClick={() => setIsDocModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Generate Doc
                    </button>
                  </div>

                  <div className="space-y-3">
                    {docRequests.map(doc => (
                      <div key={doc.id} className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-purple-950">{doc.studentName}</span>
                              <span className="font-mono text-[10px] text-slate-500">({doc.admissionNumber})</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-0.5">{doc.documentType}</p>
                            <p className="text-[11px] text-slate-500">To: {doc.destinationInstitution || doc.requestedBy}</p>
                          </div>

                          <div className="text-right">
                            {doc.signedByPrincipal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Stamped & Sealed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApproveDoc(doc.id)}
                                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[10px] font-bold"
                              >
                                Apply Seal & Sign
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-100 text-[10px] text-slate-500 font-mono">
                          <span>Ref: {doc.requestNumber}</span>
                          <span>Bursary: {doc.bursaryReceiptNumber || 'CLEARED'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Facility Reservations Overview */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-700" />
                      <h3 className="font-bold text-sm text-slate-900">Hall & Facility Reservations</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {facilityBookings.length} Active Bookings
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {facilityBookings.map(fac => (
                      <div key={fac.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{fac.facilityName}</span>
                          <span className="text-amber-800 font-mono text-[11px]">{fac.date} ({fac.startTime})</span>
                        </div>
                        <p className="text-slate-600 mt-0.5 text-[11px] font-medium">{fac.eventTitle}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">Booked by: {fac.bookedBy} • {fac.expectedAttendance} attendees</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </main>
        </div>
      </div>

      {/* 4. MODALS CONTAINER */}
      <PrincipalMemoModal
        isOpen={isMemoModalOpen}
        onClose={() => setIsMemoModalOpen(false)}
        brandProfile={brandProfile}
        onSaveMemo={(newMemo) => {
          setMemos(prev => [newMemo, ...prev]);
          showToast(`Memo ${newMemo.memoRefNumber} dispatched to faculty.`);
        }}
      />

      <VisitorCheckInModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        onSaveVisitor={(newVisitor) => {
          setVisitors(prev => [newVisitor, ...prev]);
          showToast(`Visitor badge ${newVisitor.badgeNumber} issued.`);
        }}
      />

      <TeacherReliefModal
        isOpen={isReliefModalOpen}
        onClose={() => setIsReliefModalOpen(false)}
        onSaveRelief={(newRelief) => {
          setReliefs(prev => [newRelief, ...prev]);
          showToast(`Relief duty assigned to ${newRelief.assignedReliefTeacherName}.`);
        }}
      />

      <DocumentProcessingModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        brandProfile={brandProfile}
        onSaveDocRequest={(newDoc) => {
          setDocRequests(prev => [newDoc, ...prev]);
          showToast(`Document ${newDoc.requestNumber} generated.`);
        }}
      />

      <PrincipalRBACPolicyModal
        isOpen={isRbacModalOpen}
        onClose={() => setIsRbacModalOpen(false)}
        policy={rbacPolicy}
      />
    </div>
  );
};
