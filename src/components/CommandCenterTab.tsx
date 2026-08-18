import React, { useState } from 'react';
import { 
  UserProfile, 
  SchoolAcademicCommandKPIs, 
  StandardLessonNote, 
  AssignedLessonDelivery, 
  AdaptiveRemedialUnit,
  SecureExaminationPaper,
  SchoolBrandProfile,
  TenantSchoolApp
} from '../types';
import { 
  Phone,
  Mail,
  MapPin,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  Users,
  User,
  TrendingUp,
  GraduationCap,
  Building2,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  FileText,
  Lock,
  Headphones,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Share2,
  Download,
  UserPlus,
  Heart,
  Award,
  DollarSign,
  Briefcase,
  AlertTriangle,
  FolderOpen,
  UserCheck,
  Send,
  Printer,
  Sliders
} from 'lucide-react';
import { MainTabType } from './Navbar';
import { PrincipalModals } from './principal-dashboard/PrincipalModals';

// High-fidelity mobile app mockup asset
import mobileAppImg from '../assets/images/flow_mobile_preview_1787052426217.jpg';

interface CommandCenterTabProps {
  currentUser: UserProfile;
  kpis: SchoolAcademicCommandKPIs;
  lessonNotes: StandardLessonNote[];
  deliveries: AssignedLessonDelivery[];
  remedials: AdaptiveRemedialUnit[];
  exams: SecureExaminationPaper[];
  onNavigateTab: (tab: MainTabType) => void;
  onApproveLesson: (lessonId: string) => void;
  onLaunchLessonModal: () => void;
  onLaunchExamModal: () => void;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onOpenAuthModal?: () => void;
}

export const CommandCenterTab: React.FC<CommandCenterTabProps> = ({
  currentUser,
  kpis,
  lessonNotes,
  deliveries,
  remedials,
  exams,
  onNavigateTab,
  onApproveLesson,
  onLaunchLessonModal,
  onLaunchExamModal,
  brandProfile,
  activeTenant,
  onOpenAuthModal
}) => {
  // Active Sidebar Nav Key
  const [activeSidebarNav, setActiveSidebarNav] = useState<string>('dashboard');
  
  // Date & Filter States
  const [currentDateFilter, setCurrentDateFilter] = useState('Today, May 20, 2026');
  const [attendanceTimeframe, setAttendanceTimeframe] = useState<'week' | 'month' | 'term'>('week');
  const [performanceTimeframe, setPerformanceTimeframe] = useState<'term' | 'last_term' | 'session'>('term');
  const [feeTimeframe, setFeeTimeframe] = useState<'month' | 'term' | 'session'>('month');

  // Interactive Modals State
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isDocumentCenterOpen, setIsDocumentCenterOpen] = useState(false);
  const [isBehaviourAlertsOpen, setIsBehaviourAlertsOpen] = useState(false);
  const [isStaffLeaveOpen, setIsStaffLeaveOpen] = useState(false);
  const [isAnnouncementComposerOpen, setIsAnnouncementComposerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isQuoteLiked, setIsQuoteLiked] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Dynamic School Brand Identity
  const schoolName = brandProfile?.schoolName || activeTenant?.schoolName || 'Greenfield Academy';
  const schoolMotto = brandProfile?.motto || 'Excellence. Character. Impact.';
  const schoolPhone = brandProfile?.contactPhone || activeTenant?.principalPhone || '+234 800 123 4567';
  const schoolEmail = brandProfile?.contactEmail || activeTenant?.principalEmail || 'info@greenfieldacademy.edu.ng';
  const schoolAddress = brandProfile?.campusAddress || activeTenant?.address || '12 Excellence Drive, Lekki, Lagos';

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Attendance chart points based on timeframe
  const attendanceData = {
    week: [
      { day: 'Mon 14', rate: 50 },
      { day: 'Tue 15', rate: 65 },
      { day: 'Wed 16', rate: 70 },
      { day: 'Thu 17', rate: 65 },
      { day: 'Fri 18', rate: 96, highlight: true },
      { day: 'Today', rate: 94 }
    ],
    month: [
      { day: 'Wk 1', rate: 88 },
      { day: 'Wk 2', rate: 91 },
      { day: 'Wk 3', rate: 94 },
      { day: 'Wk 4', rate: 96, highlight: true }
    ],
    term: [
      { day: 'Month 1', rate: 89 },
      { day: 'Month 2', rate: 93 },
      { day: 'Month 3', rate: 95, highlight: true }
    ]
  };

  const currentAttendancePoints = attendanceData[attendanceTimeframe];

  // Helper for line chart SVG coordinate calculation
  const getChartPath = (points: { day: string; rate: number }[]) => {
    if (!points || points.length === 0) return '';
    const width = 360;
    const height = 140;
    const paddingX = 30;
    const paddingY = 20;
    const step = (width - paddingX * 2) / (points.length - 1);

    const coords = points.map((p, i) => {
      const x = paddingX + i * step;
      // y from 0% (height - paddingY) to 100% (paddingY)
      const y = height - paddingY - ((p.rate / 100) * (height - paddingY * 2));
      return { x, y };
    });

    return coords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-800 font-sans antialiased selection:bg-emerald-600 selection:text-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
      
      {/* ============================================================ */}
      {/* 1. TOP UTILITY CONTACT & PORTAL BAR (Exact as screenshot)    */}
      {/* ============================================================ */}
      <div className="bg-[#032e22] text-emerald-100 text-[11px] sm:text-xs py-2 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/60">
        
        {/* Contact Information */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-emerald-200/90 font-medium">
          <a href={`tel:${schoolPhone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>{schoolPhone}</span>
          </a>
          <span className="text-emerald-800 hidden sm:inline">|</span>
          <a href={`mailto:${schoolEmail}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>{schoolEmail}</span>
          </a>
          <span className="text-emerald-800 hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1.5 text-emerald-300/80">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-xs">{schoolAddress}</span>
          </div>
        </div>

        {/* Portals & Logout Quick Links */}
        <div className="flex items-center gap-3 sm:gap-4 font-semibold text-emerald-200 text-[11px]">
          <button 
            onClick={() => onNavigateTab('parent_database')} 
            className="hover:text-white transition-colors cursor-pointer"
          >
            Parents Portal
          </button>
          <span className="text-emerald-800">|</span>
          <button 
            onClick={() => onNavigateTab('student_registers')} 
            className="hover:text-white transition-colors cursor-pointer"
          >
            Students Portal
          </button>
          <span className="text-emerald-800">|</span>
          <button 
            onClick={() => onNavigateTab('teacher_pool')} 
            className="hover:text-white transition-colors cursor-pointer"
          >
            Staff Portal
          </button>
          <span className="text-emerald-800">|</span>
          <button 
            onClick={onOpenAuthModal} 
            className="hover:text-amber-300 transition-colors cursor-pointer font-bold"
          >
            Log out
          </button>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. SCHOOL BRAND NAVIGATION HEADER (Exact as screenshot)       */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        
        {/* Left: School Crest & Title */}
        <div 
          onClick={() => {
            setActiveSidebarNav('dashboard');
            onNavigateTab('command_center');
          }}
          className="flex items-center gap-3.5 cursor-pointer group"
        >
          {/* Custom Greenfield School Shield Crest */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-800 via-[#043b2c] to-green-950 p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full border border-amber-400/60 rounded-xl flex flex-col items-center justify-center bg-[#022c22]">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="text-[6.5px] font-black text-white tracking-widest uppercase mt-0.5">VERITAS</span>
            </div>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-[#043b2c] tracking-tight font-serif uppercase">
              {schoolName}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide">
              {schoolMotto}
            </p>
          </div>
        </div>

        {/* Center: Main Horizontal Nav Bar with active green indicator */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-bold text-slate-700">
          
          {/* 1. Dashboard (Active) */}
          <button
            onClick={() => {
              setActiveSidebarNav('dashboard');
              onNavigateTab('command_center');
            }}
            className="px-3.5 py-2 rounded-xl text-emerald-800 font-black flex flex-col items-center gap-0.5 border-b-2 border-emerald-600 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-emerald-600" />
              <span>Dashboard</span>
            </div>
          </button>

          {/* 2. School Overview */}
          <button
            onClick={() => {
              setActiveSidebarNav('overview');
              showToast('Navigating to School Overview...');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>School Overview</span>
          </button>

          {/* 3. Academics */}
          <button
            onClick={() => {
              setActiveSidebarNav('academics');
              onNavigateTab('curriculum_source');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Academics</span>
          </button>

          {/* 4. Students */}
          <button
            onClick={() => {
              setActiveSidebarNav('students');
              onNavigateTab('student_registers');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Students</span>
          </button>

          {/* 5. Staff */}
          <button
            onClick={() => {
              setActiveSidebarNav('staff');
              onNavigateTab('teacher_pool');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Staff</span>
          </button>

          {/* 6. Finance */}
          <button
            onClick={() => {
              setActiveSidebarNav('finance');
              onNavigateTab('bursary_accounts');
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span>Finance</span>
          </button>

          {/* 7. Reports */}
          <button
            onClick={() => {
              setActiveSidebarNav('reports');
              setIsReportsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>Reports</span>
          </button>

        </nav>

        {/* Right: Notifications & Principal Profile Badge */}
        <div className="flex items-center gap-3">
          
          {/* Notification Bell with red badge 3 */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer relative"
              title="Official Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white">
                3
              </span>
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-900">Notifications & Circulars</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  <div 
                    onClick={() => {
                      setIsNotificationOpen(false);
                      setIsApprovalsModalOpen(true);
                    }}
                    className="p-2.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900">5 New Admission Requests</div>
                    <p className="text-[10px] text-slate-600 mt-0.5">SS 1 Science and JSS 1 entrance candidates awaiting approval.</p>
                    <span className="text-[9px] text-emerald-700 font-bold mt-1 inline-block">10 mins ago • Admissions Desk</span>
                  </div>

                  <div 
                    onClick={() => {
                      setIsNotificationOpen(false);
                      setIsBehaviourAlertsOpen(true);
                    }}
                    className="p-2.5 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900">Behaviour Alert: SS 1A</div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Incident reported by Physics faculty during morning practicals.</p>
                    <span className="text-[9px] text-amber-700 font-bold mt-1 inline-block">2 hours ago • Discipline Desk</span>
                  </div>

                  <div 
                    onClick={() => {
                      setIsNotificationOpen(false);
                      onNavigateTab('academic_calendar');
                    }}
                    className="p-2.5 rounded-2xl bg-blue-50/60 hover:bg-blue-100/70 cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900">Mid-Term Assessments Commencement</div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Assessments commence Friday, May 22nd in all classrooms.</p>
                    <span className="text-[9px] text-blue-700 font-bold mt-1 inline-block">Today • Academic Board</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Principal Profile Badge */}
          <div 
            onClick={onOpenAuthModal}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-800 cursor-pointer transition-all border border-slate-200"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-800 to-teal-900 text-amber-300 font-black text-xs flex items-center justify-center shadow-md border border-amber-400/40">
                MA
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-medium leading-none">Welcome,</span>
              <span className="text-xs font-black text-slate-900 leading-tight">
                {currentUser.name || 'Mr. Adeyemi'}
              </span>
              <span className="text-[9px] text-emerald-700 font-bold leading-none mt-0.5">
                Principal ⌵
              </span>
            </div>
          </div>

        </div>

      </header>

      {/* ============================================================ */}
      {/* 3. MAIN DASHBOARD BODY (Sidebar + Rich Main Content)         */}
      {/* ============================================================ */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)]">
        
        {/* ========================================================== */}
        {/* LEFT SIDEBAR (Deep Dark Emerald Green bg-[#042f24])        */}
        {/* ========================================================== */}
        <aside className="w-full lg:w-64 xl:w-72 bg-[#042f24] text-white p-5 flex flex-col justify-between shrink-0 border-r border-emerald-900/60 space-y-6">
          
          <div className="space-y-6">
            
            {/* Principal Profile Card in Sidebar */}
            <div className="p-3.5 rounded-2xl bg-[#02241b] border border-emerald-900/80 flex items-center gap-3 shadow-inner">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-amber-300 font-black text-sm flex items-center justify-center shadow-md border border-amber-400/40">
                  MA
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#02241b]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-white truncate">
                  {currentUser.name || 'Mr. Adeyemi'}
                </div>
                <div className="text-xs text-emerald-300 font-medium">Principal</div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Online ⌵</span>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1 text-xs font-semibold">
              
              {/* 1. Dashboard (Active Highlight) */}
              <button
                onClick={() => {
                  setActiveSidebarNav('dashboard');
                  onNavigateTab('command_center');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'dashboard'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-emerald-300" />
                <span>Dashboard</span>
              </button>

              {/* 2. School Overview */}
              <button
                onClick={() => {
                  setActiveSidebarNav('overview');
                  showToast('Viewing Greenfield Academy institutional profile...');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'overview'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-300" />
                <span>School Overview</span>
              </button>

              {/* 3. Academics */}
              <button
                onClick={() => {
                  setActiveSidebarNav('academics');
                  onNavigateTab('curriculum_source');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'academics'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <span>Academics</span>
              </button>

              {/* 4. Students */}
              <button
                onClick={() => {
                  setActiveSidebarNav('students');
                  onNavigateTab('student_registers');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'students'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-300" />
                <span>Students</span>
              </button>

              {/* 5. Staff Management */}
              <button
                onClick={() => {
                  setActiveSidebarNav('staff');
                  onNavigateTab('teacher_pool');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'staff'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-300" />
                <span>Staff Management</span>
              </button>

              {/* 6. Finance & Fees */}
              <button
                onClick={() => {
                  setActiveSidebarNav('finance');
                  onNavigateTab('bursary_accounts');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'finance'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <span>Finance & Fees</span>
              </button>

              {/* 7. Admissions */}
              <button
                onClick={() => {
                  setActiveSidebarNav('admissions');
                  setIsApprovalsModalOpen(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'admissions'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 text-emerald-300" />
                  <span>Admissions</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  5
                </span>
              </button>

              {/* 8. Communication */}
              <button
                onClick={() => {
                  setActiveSidebarNav('communication');
                  setIsAnnouncementComposerOpen(true);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'communication'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>Communication</span>
              </button>

              {/* 9. Reports & Analytics */}
              <button
                onClick={() => {
                  setActiveSidebarNav('reports');
                  onNavigateTab('academic_analytics');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'reports'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                <span>Reports & Analytics</span>
              </button>

              {/* 10. Calendar */}
              <button
                onClick={() => {
                  setActiveSidebarNav('calendar');
                  onNavigateTab('academic_calendar');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'calendar'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-300" />
                <span>Calendar</span>
              </button>

              {/* 11. Documents */}
              <button
                onClick={() => {
                  setActiveSidebarNav('documents');
                  setIsDocumentCenterOpen(true);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'documents'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-300" />
                <span>Documents</span>
              </button>

              {/* 12. Settings */}
              <button
                onClick={() => {
                  setActiveSidebarNav('settings');
                  onNavigateTab('principal_governance');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'settings'
                    ? 'bg-[#0c4e3b] text-white font-extrabold shadow-md border border-emerald-600/40'
                    : 'text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4 text-emerald-300" />
                <span>Settings</span>
              </button>

            </nav>

          </div>

          {/* Inspirational Leadership Quote Box at bottom of sidebar */}
          <div className="p-4 rounded-2xl bg-[#02241b]/90 border border-emerald-800/60 shadow-lg text-emerald-100 space-y-2 relative">
            <div className="text-2xl font-serif text-amber-400 leading-none">“</div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90 font-medium">
              Leadership is not about being in charge. It is about taking care of those in your charge and setting them up for success.
            </p>
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => {
                  setIsQuoteLiked(!isQuoteLiked);
                  showToast(isQuoteLiked ? 'Quote unpinned.' : 'Quote pinned to Principal highlights!');
                }}
                className="text-emerald-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Save Quote"
              >
                <Heart className={`w-4 h-4 ${isQuoteLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

        </aside>

        {/* ========================================================== */}
        {/* MAIN CANVAS (Light Slate Canvas #f8fafc)                    */}
        {/* ========================================================== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
          
          {/* Top Greeting Row & Date Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{getGreeting()}, {currentUser.name || 'Mr. Adeyemi'}!</span>
                <span className="text-2xl animate-bounce">👋</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Here's what's happening at {schoolName} today.
              </p>
            </div>

            {/* Date Selector Button */}
            <button
              onClick={() => setIsDateFilterModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-800 text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{currentDateFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* ======================================================== */}
          {/* ROW 1: TOP 5 STAT CARDS (Exact match to screenshot)      */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Total Students */}
            <div 
              onClick={() => onNavigateTab('student_registers')}
              className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-500">Total Students</div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">1,248</div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                <span>↑ 18 this month</span>
              </div>
            </div>

            {/* 2. Teaching Staff */}
            <div 
              onClick={() => onNavigateTab('teacher_pool')}
              className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-500">Teaching Staff</div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">78</div>
              <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                <span>↑ 3 this month</span>
              </div>
            </div>

            {/* 3. Academic Classes */}
            <div 
              onClick={() => onNavigateTab('class_groups')}
              className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-500">Academic Classes</div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">42</div>
              <div className="text-[11px] text-purple-600 font-bold flex items-center gap-1 mt-1">
                <span>↑ 4 this month</span>
              </div>
            </div>

            {/* 4. Attendance Today */}
            <div 
              onClick={() => onNavigateTab('biometric_attendance')}
              className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-500">Attendance Today</div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">94%</div>
              <div className="text-[11px] text-orange-600 font-bold flex items-center gap-1 mt-1">
                <span>↑ 6% vs yesterday</span>
              </div>
            </div>

            {/* 5. Pending Approvals (Interactive Master Approvals Hub) */}
            <div 
              onClick={() => setIsApprovalsModalOpen(true)}
              className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-500">Pending Approvals</div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">15</div>
              </div>
              <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1 hover:underline">
                <span>View all ➔</span>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 2: 3 ANALYTICS CARDS (Attendance, Performance, Fees) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Card 1: Student Attendance Overview (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Student Attendance Overview</h3>
                <select
                  value={attendanceTimeframe}
                  onChange={(e) => setAttendanceTimeframe(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="term">This Term</option>
                </select>
              </div>

              {/* Responsive SVG Line Chart */}
              <div className="relative pt-2">
                <div className="h-44 w-full">
                  <svg className="w-full h-full" viewBox="0 0 360 140" preserveAspectRatio="none">
                    {/* Grid horizontal dashed lines */}
                    <line x1="20" y1="20" x2="340" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="20" y1="50" x2="340" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="20" y1="80" x2="340" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="20" y1="110" x2="340" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Y Axis percentage markers */}
                    <text x="5" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace">100%</text>
                    <text x="5" y="54" fill="#94a3b8" fontSize="8" fontFamily="monospace">75%</text>
                    <text x="5" y="84" fill="#94a3b8" fontSize="8" fontFamily="monospace">50%</text>
                    <text x="5" y="114" fill="#94a3b8" fontSize="8" fontFamily="monospace">25%</text>
                    <text x="10" y="138" fill="#94a3b8" fontSize="8" fontFamily="monospace">0%</text>

                    {/* Line Chart Path */}
                    <path
                      d={getChartPath(currentAttendancePoints)}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Node points on the line */}
                    {currentAttendancePoints.map((p, i) => {
                      const width = 360;
                      const height = 140;
                      const paddingX = 30;
                      const paddingY = 20;
                      const step = (width - paddingX * 2) / (currentAttendancePoints.length - 1);
                      const cx = paddingX + i * step;
                      const cy = height - paddingY - ((p.rate / 100) * (height - paddingY * 2));

                      return (
                        <g key={i}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={p.highlight ? "4.5" : "3"}
                            fill={p.highlight ? "#059669" : "#ffffff"}
                            stroke="#059669"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Highlight Tooltip for Friday Attendance */}
                <div className="absolute top-8 right-16 sm:right-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-lg text-[10px] space-y-0.5 pointer-events-none">
                  <div className="font-bold text-slate-800">Friday, May 18</div>
                  <div className="text-emerald-700 font-extrabold">Attendance: 96%</div>
                </div>

                {/* X Axis Day Labels */}
                <div className="flex justify-between px-6 pt-1 text-[10px] text-slate-400 font-mono">
                  {currentAttendancePoints.map((p, idx) => (
                    <span key={idx}>{p.day}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Academic Performance Summary (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Academic Performance Summary</h3>
                <select
                  value={performanceTimeframe}
                  onChange={(e) => setPerformanceTimeframe(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="term">This Term</option>
                  <option value="last_term">Last Term</option>
                  <option value="session">Cumulative</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                {/* SVG Donut Chart with Center 78% */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    {/* Background Ring */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                    {/* Excellent (32%) - Emerald */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="11" strokeDasharray="238.7" strokeDashoffset="0" strokeLinecap="round" />
                    {/* Good (36%) - Blue */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="11" strokeDasharray="238.7" strokeDashoffset="76.3" strokeLinecap="round" />
                    {/* Average (20%) - Amber */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" strokeWidth="11" strokeDasharray="238.7" strokeDashoffset="162.3" strokeLinecap="round" />
                    {/* Needs Improvement (12%) - Rose */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f43f5e" strokeWidth="11" strokeDasharray="238.7" strokeDashoffset="210" strokeLinecap="round" />
                  </svg>
                  
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-900 font-mono leading-none">78%</span>
                    <span className="text-[9px] text-slate-500 font-bold leading-tight mt-0.5">Overall<br />Performance</span>
                  </div>
                </div>

                {/* Legend List with colored dots */}
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[11px] font-semibold">Excellent (80-100%)</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900 font-mono">32%</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-[11px] font-semibold">Good (60-79%)</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900 font-mono">36%</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[11px] font-semibold">Average (40-59%)</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900 font-mono">20%</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-[11px] font-semibold">Needs Improvement (&lt;40%)</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900 font-mono">12%</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 3: Fee Collection Overview (3 cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Fee Collection Overview</h3>
                <select
                  value={feeTimeframe}
                  onChange={(e) => setFeeTimeframe(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="month">This Month</option>
                  <option value="term">Term 2</option>
                  <option value="session">Session</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <div className="text-[11px] text-slate-500 font-semibold">Collected</div>
                <div className="text-3xl font-black text-slate-900 font-mono">₦12.4M</div>
                <div className="text-xs font-bold text-emerald-600">75% of target</div>
                
                {/* Dual-color progress bar */}
                <div className="pt-1">
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                    <div className="bg-emerald-700 h-full rounded-full" style={{ width: '75%' }} />
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-1.5">
                    Target: ₦16.5M
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('bursary_accounts')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start cursor-pointer hover:underline pt-2"
              >
                <span>View full report ➔</span>
              </button>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 3: QUICK INSIGHTS & PRINCIPAL'S TASKS                */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Quick Insights (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900">Quick Insights</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* 1. New Admissions */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono leading-none">5</div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1">New Admissions</div>
                  <div className="text-[10px] text-slate-400 font-medium">This month</div>
                </div>

                {/* 2. Behaviour Alerts */}
                <div 
                  onClick={() => setIsBehaviourAlertsOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/50 border border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono leading-none">3</div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1">Behaviour Alerts</div>
                  <div className="text-[10px] text-rose-600 font-semibold">Require attention</div>
                </div>

                {/* 3. Staff on Leave */}
                <div 
                  onClick={() => setIsStaffLeaveOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono leading-none">12</div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1">Staff on Leave</div>
                  <div className="text-[10px] text-slate-400 font-medium">Today</div>
                </div>

                {/* 4. Events This Month */}
                <div 
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono leading-none">8</div>
                  <div className="text-[11px] font-bold text-slate-700 mt-1">Events This Month</div>
                  <div className="text-[10px] text-emerald-600 font-bold group-hover:underline">View calendar</div>
                </div>

              </div>
            </div>

            {/* Principal's Tasks (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Principal's Tasks</h3>
                <button
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View all ➔
                </button>
              </div>

              <div className="space-y-2.5">
                
                {/* Task 1 */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Approve new admissions</span>
                  </div>
                  <span className="text-xs font-bold text-purple-700 font-mono">5 pending</span>
                </div>

                {/* Task 2 */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Review staff appraisals</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 font-mono">3 pending</span>
                </div>

                {/* Task 3 */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Review term assessments</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 font-mono">7 pending</span>
                </div>

                {/* Task 4 */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Approve fee waivers</span>
                  </div>
                  <span className="text-xs font-bold text-blue-700 font-mono">2 pending</span>
                </div>

              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 4: SCHOOL OVERVIEW, KEY HIGHLIGHTS, UPCOMING EVENTS  */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* School Overview (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900">School Overview</h3>

              <div className="space-y-3.5 text-xs">
                
                {/* Vision */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Vision: </span>
                    <span className="text-slate-600">To raise a generation of leaders who will transform their world with knowledge and character.</span>
                  </div>
                </div>

                {/* Mission */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Mission: </span>
                    <span className="text-slate-600">To provide excellent and holistic education in a safe, nurturing and innovative learning environment.</span>
                  </div>
                </div>

                {/* Core Values */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Core Values: </span>
                    <span className="text-slate-600">Excellence • Integrity • Respect • Responsibility • Compassion</span>
                  </div>
                </div>

                {/* Motto */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Motto: </span>
                    <span className="text-slate-600 font-semibold">{schoolMotto}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Key Highlights (3.5 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Key Highlights</h3>
                <button
                  onClick={() => onNavigateTab('academic_analytics')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View report ➔
                </button>
              </div>

              <div className="space-y-3">
                
                {/* Highlight 1 */}
                <div 
                  onClick={() => onNavigateTab('academic_records')}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Best Performing Class</div>
                    <div className="text-[11px] text-slate-500">SS 2A (92% average)</div>
                  </div>
                </div>

                {/* Highlight 2 */}
                <div 
                  onClick={() => onNavigateTab('curriculum_source')}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Most Improved Subject</div>
                    <div className="text-[11px] text-slate-500">Mathematics (+15%)</div>
                  </div>
                </div>

                {/* Highlight 3 */}
                <div 
                  onClick={() => onNavigateTab('biometric_attendance')}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Perfect Attendance</div>
                    <div className="text-[11px] text-slate-500">SS 1B (98%)</div>
                  </div>
                </div>

                {/* Highlight 4 */}
                <div 
                  onClick={() => onNavigateTab('teacher_pool')}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Teacher of the Month</div>
                    <div className="text-[11px] text-slate-500">Mrs. T. Oladipo</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Upcoming Events (3 cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Upcoming Events</h3>
                <button
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View calendar ➔
                </button>
              </div>

              <div className="space-y-3">
                
                {/* Event 1 */}
                <div 
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="flex items-start gap-2.5 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="text-center w-9 py-1 bg-amber-50 rounded-xl border border-amber-200/80 font-mono shrink-0">
                    <div className="text-xs font-black text-amber-900">22</div>
                    <div className="text-[8px] font-bold text-amber-700 uppercase">MAY</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Mid-Term Assessments Begin</div>
                    <div className="text-[10px] text-slate-400">All Day</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                </div>

                {/* Event 2 */}
                <div 
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="flex items-start gap-2.5 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="text-center w-9 py-1 bg-purple-50 rounded-xl border border-purple-200/80 font-mono shrink-0">
                    <div className="text-xs font-black text-purple-900">24</div>
                    <div className="text-[8px] font-bold text-purple-700 uppercase">MAY</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Parents' Forum</div>
                    <div className="text-[10px] text-slate-400">10:00 AM – 12:00 PM</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                </div>

                {/* Event 3 */}
                <div 
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="flex items-start gap-2.5 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="text-center w-9 py-1 bg-blue-50 rounded-xl border border-blue-200/80 font-mono shrink-0">
                    <div className="text-xs font-black text-blue-900">27</div>
                    <div className="text-[8px] font-bold text-blue-700 uppercase">MAY</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Staff Training</div>
                    <div className="text-[10px] text-slate-400">9:00 AM – 2:00 PM</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                </div>

                {/* Event 4 */}
                <div 
                  onClick={() => onNavigateTab('academic_calendar')}
                  className="flex items-start gap-2.5 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="text-center w-9 py-1 bg-emerald-50 rounded-xl border border-emerald-200/80 font-mono shrink-0">
                    <div className="text-xs font-black text-emerald-900">30</div>
                    <div className="text-[8px] font-bold text-emerald-700 uppercase">MAY</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Career Day</div>
                    <div className="text-[10px] text-slate-400">9:00 AM – 1:00 PM</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                </div>

              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 5: RECENT ACTIVITIES, ANNOUNCEMENTS, REPORTS AT GLANCE*/}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Recent Activities (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Recent Activities</h3>
                <button
                  onClick={() => onNavigateTab('lesson_chain')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View all ➔
                </button>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* 1. New admission request */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">New admission request from John D.</div>
                    <div className="text-[10px] text-slate-400">10 minutes ago</div>
                  </div>
                </div>

                {/* 2. Fee payment */}
                <div 
                  onClick={() => onNavigateTab('bursary_accounts')}
                  className="flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">Fee payment of ₦250,000 received</div>
                    <div className="text-[10px] text-slate-400">30 minutes ago</div>
                  </div>
                </div>

                {/* 3. Staff appraisal */}
                <div 
                  onClick={() => setIsApprovalsModalOpen(true)}
                  className="flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">Staff appraisal submitted by Mrs. Bello</div>
                    <div className="text-[10px] text-slate-400">1 hour ago</div>
                  </div>
                </div>

                {/* 4. Behaviour incident */}
                <div 
                  onClick={() => setIsBehaviourAlertsOpen(true)}
                  className="flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">Behaviour incident reported in SS 1A</div>
                    <div className="text-[10px] text-slate-400">2 hours ago</div>
                  </div>
                </div>

                {/* 5. Lesson plan review */}
                <div 
                  onClick={onLaunchLessonModal}
                  className="flex items-start gap-3 p-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">Lesson plan review completed</div>
                    <div className="text-[10px] text-slate-400">3 hours ago</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Announcements (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Announcements</h3>
                <button
                  onClick={() => setIsAnnouncementComposerOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View all ➔
                </button>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Circular 1 */}
                <div 
                  onClick={() => setIsAnnouncementComposerOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-extrabold text-slate-900">Mid-Term Assessments</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      Today <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Mid-term assessments begin on May 22nd. Please ensure all lesson notes are up to date.
                  </p>
                </div>

                {/* Circular 2 */}
                <div 
                  onClick={() => setIsAnnouncementComposerOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-extrabold text-slate-900">Teachers' Workshop</span>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      2 days ago <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    A professional development workshop holds this Friday at 10:00 AM in the assembly hall.
                  </p>
                </div>

                {/* Circular 3 */}
                <div 
                  onClick={() => setIsAnnouncementComposerOpen(true)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-extrabold text-slate-900">New Library Resources</span>
                    </div>
                    <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                      4 days ago <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    New books and digital resources are now available in the school library.
                  </p>
                </div>

              </div>
            </div>

            {/* Reports at a Glance (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Reports at a Glance</h3>
                <button
                  onClick={() => setIsReportsModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  View all reports ➔
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                
                {/* Report 1: Academic Report */}
                <div 
                  onClick={() => onNavigateTab('academic_analytics')}
                  className="p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs">Academic Report</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">View performance and results</div>
                  </div>
                </div>

                {/* Report 2: Finance Report */}
                <div 
                  onClick={() => onNavigateTab('bursary_accounts')}
                  className="p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs">Finance Report</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">View income, expenses & more</div>
                  </div>
                </div>

                {/* Report 3: Attendance Report */}
                <div 
                  onClick={() => onNavigateTab('biometric_attendance')}
                  className="p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/80 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs">Attendance Report</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">View attendance analytics</div>
                  </div>
                </div>

                {/* Report 4: Staff Report */}
                <div 
                  onClick={() => onNavigateTab('teacher_pool')}
                  className="p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xs">Staff Report</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">View staff performance</div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 6: SHORTCUTS BAR (Exact 7 shortcuts from screenshot) */}
          {/* ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">Shortcuts</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              
              {/* Shortcut 1 */}
              <button
                onClick={() => setIsApprovalsModalOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <UserPlus className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Approve Admissions</span>
              </button>

              {/* Shortcut 2 */}
              <button
                onClick={() => onNavigateTab('school_timetable')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <Calendar className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">View Timetable</span>
              </button>

              {/* Shortcut 3 */}
              <button
                onClick={() => onNavigateTab('bursary_accounts')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <DollarSign className="w-4 h-4 text-cyan-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Fee Dashboard</span>
              </button>

              {/* Shortcut 4 */}
              <button
                onClick={() => setIsReportsModalOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <FileText className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Generate Report</span>
              </button>

              {/* Shortcut 5 */}
              <button
                onClick={() => onNavigateTab('academic_calendar')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <Calendar className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">School Calendar</span>
              </button>

              {/* Shortcut 6 */}
              <button
                onClick={() => setIsAnnouncementComposerOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <Send className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Send Announcement</span>
              </button>

              {/* Shortcut 7 */}
              <button
                onClick={() => setIsDocumentCenterOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group text-center"
              >
                <BookOpen className="w-4 h-4 text-teal-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">Document Center</span>
              </button>

            </div>
          </div>

          {/* ======================================================== */}
          {/* ROW 7: INSTITUTIONAL FOOTER & MOBILE APP BANNER          */}
          {/* ======================================================== */}
          <footer className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-slate-600 text-xs space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-slate-200">
              
              {/* Column 1: Need Help? */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900">Need Help?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Our support team is ready to help you succeed.
                  </p>
                  <button
                    onClick={() => showToast('Connecting to 24/7 Principal Concierge Desk...')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Get Support
                  </button>
                </div>
              </div>

              {/* Column 2: Stay Connected */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900">Stay Connected</h4>
                <p className="text-xs text-slate-500">
                  Join our school community and stay updated on important updates.
                </p>
                <div className="flex items-center gap-2.5">
                  <a href="#facebook" onClick={(e) => { e.preventDefault(); showToast('Opening Greenfield Academy Facebook portal...'); }} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 flex items-center justify-center transition-colors font-bold">
                    f
                  </a>
                  <a href="#twitter" onClick={(e) => { e.preventDefault(); showToast('Opening Greenfield Academy X portal...'); }} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 flex items-center justify-center transition-colors font-bold">
                    𝕏
                  </a>
                  <a href="#instagram" onClick={(e) => { e.preventDefault(); showToast('Opening Greenfield Academy Instagram portal...'); }} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 flex items-center justify-center transition-colors font-bold">
                    ig
                  </a>
                  <a href="#linkedin" onClick={(e) => { e.preventDefault(); showToast('Opening Greenfield Academy LinkedIn portal...'); }} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 flex items-center justify-center transition-colors font-bold">
                    in
                  </a>
                </div>
              </div>

              {/* Column 3: Get the Mobile App */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-900">Get the Mobile App</h4>
                  <p className="text-xs text-slate-500">
                    Take Curriculum Flow with you, anywhere, anytime.
                  </p>
                  
                  {/* Google Play and App Store Badges */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <div 
                      onClick={() => showToast('Opening Google Play Store package: com.curriculumflow.school')}
                      className="px-3 py-1.5 rounded-xl bg-black text-white text-[10px] font-medium flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <div className="text-left leading-tight">
                        <div className="text-[7.5px] text-slate-400 uppercase">Get it on</div>
                        <div className="font-bold">Google Play</div>
                      </div>
                    </div>
                    <div 
                      onClick={() => showToast('Opening Apple App Store package: id6479102834')}
                      className="px-3 py-1.5 rounded-xl bg-black text-white text-[10px] font-medium flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <div className="text-left leading-tight">
                        <div className="text-[7.5px] text-slate-400 uppercase">Download on the</div>
                        <div className="font-bold">App Store</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Mockup Preview Thumbnail */}
                <div className="hidden sm:block w-20 h-28 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md shrink-0 bg-slate-100">
                  <img 
                    src={mobileAppImg} 
                    alt="Curriculum Flow Mobile App" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Copyright & Powered by Curriculum Flow */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
              <p>© 2026 {schoolName}. All rights reserved.</p>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span>Powered by</span>
                <span className="font-extrabold text-[#043b2c]">Curriculum Flow</span>
                <span className="text-amber-500">⊞</span>
                <span className="font-black text-slate-900">FLOW</span>
              </div>
            </div>
          </footer>

        </main>

      </div>

      {/* ============================================================ */}
      {/* 4. MODALS HUB INTEGRATION (Approvals, Date, Reports, Docs)   */}
      {/* ============================================================ */}
      <PrincipalModals
        isApprovalsModalOpen={isApprovalsModalOpen}
        onCloseApprovalsModal={() => setIsApprovalsModalOpen(false)}
        isDateFilterModalOpen={isDateFilterModalOpen}
        onCloseDateFilterModal={() => setIsDateFilterModalOpen(false)}
        isReportsModalOpen={isReportsModalOpen}
        onCloseReportsModal={() => setIsReportsModalOpen(false)}
        isDocumentCenterOpen={isDocumentCenterOpen}
        onCloseDocumentCenter={() => setIsDocumentCenterOpen(false)}
        isBehaviourAlertsOpen={isBehaviourAlertsOpen}
        onCloseBehaviourAlerts={() => setIsBehaviourAlertsOpen(false)}
        isStaffLeaveOpen={isStaffLeaveOpen}
        onCloseStaffLeave={() => setIsStaffLeaveOpen(false)}
        isAnnouncementComposerOpen={isAnnouncementComposerOpen}
        onCloseAnnouncementComposer={() => setIsAnnouncementComposerOpen(false)}
        currentDateFilter={currentDateFilter}
        onSelectDateFilter={setCurrentDateFilter}
        onNavigateTab={onNavigateTab}
        onShowToast={showToast}
      />

      {/* Live Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
