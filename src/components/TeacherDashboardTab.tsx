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
  Sliders,
  UploadCloud,
  Layers,
  BarChart3,
  Coffee,
  CheckSquare,
  FileCheck2,
  FileCode,
  Bookmark
} from 'lucide-react';
import { MainTabType } from './Navbar';
import { TeacherModals } from './teacher-dashboard/TeacherModals';
import { TeacherCurriculumViewerModal } from './teacher-dashboard/TeacherCurriculumViewerModal';

// High-fidelity mobile app mockup asset
import mobileAppImg from '../assets/images/flow_mobile_preview_1787052426217.jpg';

interface TeacherDashboardTabProps {
  currentUser: UserProfile;
  kpis: SchoolAcademicCommandKPIs;
  lessonNotes: StandardLessonNote[];
  deliveries: AssignedLessonDelivery[];
  remedials: AdaptiveRemedialUnit[];
  exams: SecureExaminationPaper[];
  onNavigateTab: (tab: MainTabType) => void;
  onLaunchLessonModal: () => void;
  onLaunchExamModal: () => void;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onOpenAuthModal?: () => void;
  onOpenAdvisorModal?: () => void;
}

export const TeacherDashboardTab: React.FC<TeacherDashboardTabProps> = ({
  currentUser,
  kpis,
  lessonNotes,
  deliveries,
  remedials,
  exams,
  onNavigateTab,
  onLaunchLessonModal,
  onLaunchExamModal,
  brandProfile,
  activeTenant,
  onOpenAuthModal,
  onOpenAdvisorModal
}) => {
  // Navigation & Sub-Menu States
  const [activeSidebarNav, setActiveSidebarNav] = useState<string>('dashboard');
  const [activeTopHeaderTab, setActiveTopHeaderTab] = useState<'dashboard' | 'classes' | 'lessons' | 'assessments' | 'students' | 'reports'>('dashboard');
  
  // Expandable sub-menus in sidebar
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState<boolean>(false);
  const [isAssessmentsExpanded, setIsAssessmentsExpanded] = useState<boolean>(false);
  const [isExamsExpanded, setIsExamsExpanded] = useState<boolean>(false);
  const [isStudentsExpanded, setIsStudentsExpanded] = useState<boolean>(false);

  // Status Presence
  const [teacherPresence, setTeacherPresence] = useState<'Online' | 'In Class' | 'On Break' | 'Offline'>('Online');
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);

  // Date Filter State
  const [currentDateFilter, setCurrentDateFilter] = useState('Today, May 20, 2026');

  // Interactive Modals State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLessonNoteModalOpen, setIsLessonNoteModalOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isResourceUploadModalOpen, setIsResourceUploadModalOpen] = useState(false);
  const [isClassDetailsModalOpen, setIsClassDetailsModalOpen] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<string>('JSS 2A Mathematics');
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isAllToolsModalOpen, setIsAllToolsModalOpen] = useState(false);
  const [isCurriculumViewerOpen, setIsCurriculumViewerOpen] = useState(false);
  const [isUserProfileMenuOpen, setIsUserProfileMenuOpen] = useState(false);
  const [isQuoteLiked, setIsQuoteLiked] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Dynamic School Brand & Teacher Identity
  const schoolName = brandProfile?.schoolName || activeTenant?.schoolName || 'Greenfield Academy';
  const schoolMotto = brandProfile?.motto || 'Excellence. Character. Impact.';
  const schoolPhone = brandProfile?.contactPhone || activeTenant?.principalPhone || '+234 800 123 4567';
  const schoolEmail = brandProfile?.contactEmail || activeTenant?.principalEmail || 'info@greenfieldacademy.edu.ng';
  const schoolAddress = brandProfile?.campusAddress || activeTenant?.address || '12 Excellence Drive, Lekki, Lagos';
  
  // Teacher Display Name
  const teacherName = currentUser.role === 'teacher' ? currentUser.name : 'Mr. Daniel Adeyemi';
  const teacherTitle = currentUser.title || 'Senior Mathematics & Further Maths Master';

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
            className="hover:text-white transition-colors cursor-pointer font-bold text-emerald-300"
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
            setActiveTopHeaderTab('dashboard');
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

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors uppercase">
                {schoolName}
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                TEACHER OS
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium tracking-wide">
              {schoolMotto}
            </span>
          </div>
        </div>

        {/* Center: Horizontal Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1.5 text-xs font-bold text-slate-600">
          
          <button
            onClick={() => {
              setActiveTopHeaderTab('dashboard');
              setActiveSidebarNav('dashboard');
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'dashboard'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTopHeaderTab('classes');
              setSelectedClassForDetails('JSS 2A Mathematics');
              setIsClassDetailsModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'classes'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>My Classes</span>
          </button>

          <button
            onClick={() => {
              setActiveTopHeaderTab('lessons');
              setIsLessonNoteModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'lessons'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Lesson Notes</span>
          </button>

          <button
            onClick={() => {
              setActiveTopHeaderTab('assessments');
              setIsGradingModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'assessments'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-slate-500" />
            <span>Assessments</span>
          </button>

          <button
            onClick={() => {
              setActiveTopHeaderTab('students');
              onNavigateTab('student_registers');
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'students'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Students</span>
          </button>

          <button
            onClick={() => {
              setActiveTopHeaderTab('reports');
              onNavigateTab('academic_records');
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTopHeaderTab === 'reports'
                ? 'bg-emerald-50 text-emerald-800 font-black border-b-2 border-emerald-700 shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>Reports</span>
          </button>

        </nav>

        {/* Right: Notification Bell & Teacher Profile Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4 relative">
          
          {/* Notification Bell with Badge 4 */}
          <button 
            onClick={() => setIsNotificationsModalOpen(true)}
            className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors cursor-pointer border border-slate-200"
            title="4 Pending Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-sm">
              4
            </span>
          </button>

          {/* Teacher Profile Chip */}
          <div className="relative">
            <button 
              onClick={() => setIsUserProfileMenuOpen(!isUserProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="w-9 h-9 rounded-2xl bg-emerald-950 text-emerald-300 font-black text-xs flex items-center justify-center border-2 border-emerald-500 shadow-sm">
                DA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-medium">Welcome,</span>
                <span className="text-xs font-extrabold text-slate-900 truncate max-w-[130px]">
                  Mr. Adeyemi
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
            </button>

            {/* Profile Dropdown Menu */}
            {isUserProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-100 space-y-0.5">
                  <div className="text-xs font-black text-slate-900">{teacherName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{teacherTitle}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">Science & Mathematics Faculty</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserProfileMenuOpen(false);
                      onNavigateTab('school_timetable');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>My Teaching Schedule</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserProfileMenuOpen(false);
                      onNavigateTab('lesson_chain');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Lesson Approvals Vault</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserProfileMenuOpen(false);
                      onNavigateTab('command_center');
                      showToast('Switching to Executive Command Center View');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-50 rounded-xl font-bold flex items-center gap-2 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Switch to Principal View</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsUserProfileMenuOpen(false);
                      if (onOpenAuthModal) onOpenAuthModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* ============================================================ */}
      {/* 3. MAIN DASHBOARD BODY (2-Column: Dark Sidebar + Canvas)      */}
      {/* ============================================================ */}
      <div className="flex flex-col lg:flex-row min-h-[900px] w-full">
        
        {/* ========================================================== */}
        {/* 3A. DEEP EMERALD LEFT SIDEBAR (Exact as screenshot)        */}
        {/* ========================================================== */}
        <aside className="w-full lg:w-72 bg-[#022c22] text-slate-200 p-4 sm:p-5 flex flex-col justify-between shrink-0 border-r border-emerald-950 shadow-inner">
          
          <div className="space-y-6">
            
            {/* Teacher Profile Card */}
            <div className="bg-[#033a2d] border border-emerald-700/40 rounded-2xl p-3.5 flex items-center gap-3 shadow-md relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0 shadow-inner">
                DA
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                  {teacherName}
                </h4>
                <div className="text-[10px] text-emerald-300/80 font-medium">Teacher</div>
                
                {/* Online Presence Status Toggle */}
                <div className="relative mt-1">
                  <button 
                    onClick={() => setIsPresenceMenuOpen(!isPresenceMenuOpen)}
                    className="flex items-center gap-1.5 text-[10px] text-emerald-200 hover:text-white font-semibold cursor-pointer bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/60"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      teacherPresence === 'Online' ? 'bg-emerald-400 animate-pulse' :
                      teacherPresence === 'In Class' ? 'bg-amber-400' :
                      teacherPresence === 'On Break' ? 'bg-blue-400' : 'bg-slate-400'
                    }`} />
                    <span>{teacherPresence}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                  </button>

                  {isPresenceMenuOpen && (
                    <div className="absolute left-0 top-6 w-32 bg-slate-900 border border-emerald-800/80 rounded-xl shadow-xl p-1 z-40">
                      {(['Online', 'In Class', 'On Break', 'Offline'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => {
                            setTeacherPresence(status);
                            setIsPresenceMenuOpen(false);
                            showToast(`Status updated to: ${status}`);
                          }}
                          className="w-full text-left px-2 py-1 text-[10px] text-slate-200 hover:bg-emerald-900/60 rounded-md font-semibold transition-colors"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Vertical Navigation Menu */}
            <nav className="space-y-1 text-xs font-semibold">
              
              {/* 1. Dashboard */}
              <button
                onClick={() => {
                  setActiveSidebarNav('dashboard');
                  setActiveTopHeaderTab('dashboard');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'dashboard'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Dashboard</span>
                </div>
              </button>

              {/* 2. My Classes */}
              <button
                onClick={() => {
                  setActiveSidebarNav('my_classes');
                  setSelectedClassForDetails('JSS 2A Mathematics');
                  setIsClassDetailsModalOpen(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'my_classes'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>My Classes</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-900/80 px-2 py-0.5 rounded-md text-emerald-300">4</span>
              </button>

              {/* 3. Assigned NERDC Curriculum */}
              <button
                onClick={() => {
                  setActiveSidebarNav('assigned_curriculum');
                  setIsCurriculumViewerOpen(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'assigned_curriculum'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Assigned Curriculum</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">NERDC</span>
              </button>

              {/* 4. Lesson Notes */}
              <button
                onClick={() => {
                  setActiveSidebarNav('lesson_notes');
                  setIsLessonNoteModalOpen(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'lesson_notes'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Lesson Notes</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-900/80 px-2 py-0.5 rounded-md text-emerald-300">3</span>
              </button>

              {/* 4. My Timetable */}
              <button
                onClick={() => {
                  setActiveSidebarNav('timetable');
                  onNavigateTab('school_timetable');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'timetable'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>My Timetable</span>
                </div>
              </button>

              {/* 5. Attendance (Expandable) */}
              <div>
                <button
                  onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Attendance</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isAttendanceExpanded ? 'rotate-90 text-emerald-300' : 'text-emerald-600'}`} />
                </button>

                {isAttendanceExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => setIsAttendanceModalOpen(true)}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Mark Roll-Call
                    </button>
                    <button
                      onClick={() => onNavigateTab('biometric_attendance')}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Biometric Sync Log
                    </button>
                  </div>
                )}
              </div>

              {/* 6. Assessments (Expandable) */}
              <div>
                <button
                  onClick={() => setIsAssessmentsExpanded(!isAssessmentsExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Assessments</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isAssessmentsExpanded ? 'rotate-90 text-emerald-300' : 'text-emerald-600'}`} />
                </button>

                {isAssessmentsExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => onLaunchExamModal()}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Create CA Assessment
                    </button>
                    <button
                      onClick={() => setIsGradingModalOpen(true)}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Grade Submissions (5)
                    </button>
                  </div>
                )}
              </div>

              {/* 7. Examinations (Expandable) */}
              <div>
                <button
                  onClick={() => setIsExamsExpanded(!isExamsExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Examinations</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExamsExpanded ? 'rotate-90 text-emerald-300' : 'text-emerald-600'}`} />
                </button>

                {isExamsExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => onNavigateTab('secure_exams')}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Terminal Exam Papers
                    </button>
                    <button
                      onClick={() => onNavigateTab('question_bank')}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Question Bank
                    </button>
                  </div>
                )}
              </div>

              {/* 8. Students (Expandable) */}
              <div>
                <button
                  onClick={() => setIsStudentsExpanded(!isStudentsExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Students</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isStudentsExpanded ? 'rotate-90 text-emerald-300' : 'text-emerald-600'}`} />
                </button>

                {isStudentsExpanded && (
                  <div className="pl-9 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => onNavigateTab('student_registers')}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Class Registers
                    </button>
                    <button
                      onClick={() => onNavigateTab('adaptive_remedial')}
                      className="w-full text-left py-1 text-[11px] text-emerald-300 hover:text-white font-medium cursor-pointer"
                    >
                      • Remedial Interventions
                    </button>
                  </div>
                )}
              </div>

              {/* 9. Gradebook */}
              <button
                onClick={() => {
                  setActiveSidebarNav('gradebook');
                  onNavigateTab('academic_records');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'gradebook'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Gradebook</span>
                </div>
              </button>

              {/* 10. Reports & Analytics */}
              <button
                onClick={() => {
                  setActiveSidebarNav('reports');
                  onNavigateTab('academic_analytics');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'reports'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Reports & Analytics</span>
                </div>
              </button>

              {/* 11. Resources */}
              <button
                onClick={() => {
                  setActiveSidebarNav('resources');
                  setIsResourceUploadModalOpen(true);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'resources'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <span>Resources</span>
                </div>
              </button>

              {/* 12. Messages */}
              <button
                onClick={() => {
                  setActiveSidebarNav('messages');
                  showToast('Opening Faculty Messaging & Parent Communication Channel');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'messages'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Messages</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                  3
                </span>
              </button>

              {/* 13. Settings */}
              <button
                onClick={() => {
                  setActiveSidebarNav('settings');
                  onNavigateTab('user_profiles');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeSidebarNav === 'settings'
                    ? 'bg-emerald-600/30 text-white font-extrabold border border-emerald-500/40 shadow-sm'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Settings</span>
                </div>
              </button>

            </nav>

          </div>

          {/* Inspirational Leadership Quote Card */}
          <div className="bg-[#033a2d]/80 border border-emerald-700/30 rounded-2xl p-4 mt-6 shadow-md relative group">
            <div className="text-2xl text-emerald-500/60 font-serif leading-none select-none">“</div>
            <p className="text-xs text-emerald-100/90 leading-relaxed italic font-medium -mt-2">
              A great teacher ignites curiosity, inspires learning and shapes futures.
            </p>
            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-emerald-800/40">
              <button 
                onClick={() => {
                  setIsQuoteLiked(!isQuoteLiked);
                  showToast(isQuoteLiked ? 'Quote unliked' : 'Quote saved to your favorites ❤️');
                }}
                className="text-emerald-300 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                title="Like Quote"
              >
                <Heart className={`w-3.5 h-3.5 ${isQuoteLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              <button 
                onClick={() => showToast('Quote shared with Science faculty')}
                className="text-emerald-300 hover:text-white transition-colors p-1 cursor-pointer"
                title="Share Quote"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </aside>

        {/* ========================================================== */}
        {/* 3B. MAIN TEACHER CANVAS (Exact Layout & Grid)              */}
        {/* ========================================================== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          
          {/* ======================================================== */}
          {/* ROW 1: GREETING & DATE FILTER BAR                        */}
          {/* ======================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{getGreeting()}, Mr. Adeyemi!</span>
                <span>👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Here's your teaching overview for today.
              </p>
            </div>

            {/* Date Selector Button */}
            <button
              onClick={() => setIsDateFilterModalOpen(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-500 hover:text-emerald-800 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>{currentDateFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          </div>

          {/* ======================================================== */}
          {/* ROW 2: TOP 5 TEACHER METRIC CARDS                        */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: My Classes */}
            <div 
              onClick={() => {
                setSelectedClassForDetails('JSS 2A Mathematics');
                setIsClassDetailsModalOpen(true);
              }}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">My Classes</span>
                <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">4</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:underline">
                <span>View classes</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 2: Students */}
            <div 
              onClick={() => onNavigateTab('student_registers')}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Students</span>
                <div className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">128</span>
              </div>
              <div className="text-[11px] font-bold text-blue-700 flex items-center gap-1 group-hover:underline">
                <span>View students</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 3: Lessons Today */}
            <div 
              onClick={() => onNavigateTab('school_timetable')}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Lessons Today</span>
                <div className="w-8 h-8 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">3</span>
              </div>
              <div className="text-[11px] font-bold text-purple-700 flex items-center gap-1 group-hover:underline">
                <span>View timetable</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 4: Assessments Pending */}
            <div 
              onClick={() => setIsGradingModalOpen(true)}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Assessments Pending</span>
                <div className="w-8 h-8 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">5</span>
              </div>
              <div className="text-[11px] font-bold text-orange-700 flex items-center gap-1 group-hover:underline">
                <span>To grade</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>

            {/* Card 5: Attendance Today */}
            <div 
              onClick={() => setIsAttendanceModalOpen(true)}
              className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Attendance Today</span>
                <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-slate-900">94%</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <span>↑ 6% vs yesterday</span>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 3 & 4: 2-COLUMN SPLIT (Timetable/Classes + Tools/Tasks) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ------------------------------------------------------ */}
            {/* LEFT 7 COLUMNS: Today's Timetable + My Classes         */}
            {/* ------------------------------------------------------ */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Block 1: Today's Timetable */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Today's Timetable</h3>
                  <button 
                    onClick={() => onNavigateTab('school_timetable')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View full timetable</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  
                  {/* Period 1: 8:00 AM JSS 2 */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('JSS 2A Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-extrabold text-xs text-slate-700 w-16 shrink-0">8:00 AM</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800">
                          JSS 2 Mathematics
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">Algebraic Expressions</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 text-[10px] font-black tracking-wide shrink-0">
                      JSS 2A
                    </span>
                  </div>

                  {/* Period 2: 10:00 AM SS 1 */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('SS 1B Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-extrabold text-xs text-slate-700 w-16 shrink-0">10:00 AM</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800">
                          SS 1 Mathematics
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">Linear Equations</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 text-[10px] font-black tracking-wide shrink-0">
                      SS 1B
                    </span>
                  </div>

                  {/* Period 3: 12:00 PM SS 1 Further Maths */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('SS 1A Further Maths');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-extrabold text-xs text-slate-700 w-16 shrink-0">12:00 PM</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800">
                          SS 1 Further Maths
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">Matrices</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 text-[10px] font-black tracking-wide shrink-0">
                      SS 1A
                    </span>
                  </div>

                  {/* Break: 1:00 PM */}
                  <div className="p-3 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex items-center justify-between gap-3 text-slate-500 text-xs">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-bold w-16 shrink-0">1:00 PM</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                      <div className="flex items-center gap-2 font-bold text-slate-600">
                        <span>Break</span>
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Staff Common Room</span>
                  </div>

                  {/* Period 4: 2:00 PM JSS 2 */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('JSS 2B Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-extrabold text-xs text-slate-700 w-16 shrink-0">2:00 PM</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800">
                          JSS 2 Mathematics
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">Word Problems</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 text-[10px] font-black tracking-wide shrink-0">
                      JSS 2B
                    </span>
                  </div>

                </div>
              </div>

              {/* Block 2: My Classes */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">My Classes</h3>
                  <button 
                    onClick={() => {
                      setSelectedClassForDetails('JSS 2A Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all classes</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  
                  {/* Class 1: JSS 2A */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('JSS 2A Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800 truncate">
                          JSS 2A Mathematics
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          28 Students • <span className="text-emerald-700 font-semibold">Next: Today, 8:00 AM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-emerald-600 flex items-center justify-center text-[10px] font-black text-emerald-800 bg-emerald-50">
                        75%
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Class 2: SS 1B */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('SS 1B Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center shrink-0">
                        x²
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-800 truncate">
                          SS 1B Mathematics
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          32 Students • <span className="text-blue-700 font-semibold">Next: Today, 10:00 AM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-blue-600 flex items-center justify-center text-[10px] font-black text-blue-800 bg-blue-50">
                        60%
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Class 3: SS 1A Further Maths */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('SS 1A Further Maths');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0">
                        fx
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-purple-800 truncate">
                          SS 1A Further Maths
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          30 Students • <span className="text-purple-700 font-semibold">Next: Today, 12:00 PM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-purple-600 flex items-center justify-center text-[10px] font-black text-purple-800 bg-purple-50">
                        80%
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Class 4: JSS 2B */}
                  <div 
                    onClick={() => {
                      setSelectedClassForDetails('JSS 2B Mathematics');
                      setIsClassDetailsModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-200 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
                        ∑
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-800 truncate">
                          JSS 2B Mathematics
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          26 Students • <span className="text-amber-700 font-semibold">Next: Today, 2:00 PM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-600 flex items-center justify-center text-[10px] font-black text-amber-800 bg-amber-50">
                        50%
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                </div>

                {/* View All Classes Button */}
                <button
                  onClick={() => {
                    setSelectedClassForDetails('JSS 2A Mathematics');
                    setIsClassDetailsModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  View All Classes
                </button>
              </div>

            </div>

            {/* ------------------------------------------------------ */}
            {/* RIGHT 5 COLUMNS: Quick Tools + Pending Tasks + Events  */}
            {/* ------------------------------------------------------ */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Block 1: Quick Tools (Grid of 6) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Quick Tools</h3>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  
                  {/* Tool 1: Create Lesson Note */}
                  <button
                    onClick={() => setIsLessonNoteModalOpen(true)}
                    className="p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">Create<br/>Lesson Note</span>
                  </button>

                  {/* Tool 2: Take Attendance */}
                  <button
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">Take<br/>Attendance</span>
                  </button>

                  {/* Tool 3: Create Assessment */}
                  <button
                    onClick={() => onLaunchExamModal()}
                    className="p-3 rounded-2xl bg-orange-50/60 hover:bg-orange-100/70 border border-orange-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">Create<br/>Assessment</span>
                  </button>

                  {/* Tool 4: Grade Assessments */}
                  <button
                    onClick={() => setIsGradingModalOpen(true)}
                    className="p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">Grade<br/>Assessments</span>
                  </button>

                  {/* Tool 5: View Timetable */}
                  <button
                    onClick={() => onNavigateTab('school_timetable')}
                    className="p-3 rounded-2xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">View<br/>Timetable</span>
                  </button>

                  {/* Tool 6: Upload Resources */}
                  <button
                    onClick={() => setIsResourceUploadModalOpen(true)}
                    className="p-3 rounded-2xl bg-sky-50/60 hover:bg-sky-100/70 border border-sky-200/80 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 leading-tight">Upload<br/>Resources</span>
                  </button>

                </div>

                {/* Assigned Curriculum Quick Banner */}
                <div 
                  onClick={() => setIsCurriculumViewerOpen(true)}
                  className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/90 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 group-hover:text-emerald-800">
                        Assigned NERDC Curriculum
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Download Scheme of Work & Learning Objectives
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* View All Tools Full-Width Button */}
                <button
                  onClick={() => setIsAllToolsModalOpen(true)}
                  className="w-full py-2.5 rounded-2xl bg-[#033a2d] hover:bg-[#022c22] text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-sm"
                >
                  View All Tools
                </button>
              </div>

              {/* Block 2: Pending Tasks */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Pending Tasks</h3>
                  <button 
                    onClick={() => setIsGradingModalOpen(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  
                  {/* Task 1 */}
                  <div 
                    onClick={() => setIsGradingModalOpen(true)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-purple-800">Grade 12 Assessments</div>
                        <div className="text-[10px] text-slate-500 font-medium">5 submissions</div>
                      </div>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div 
                    onClick={() => setIsAttendanceModalOpen(true)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">Check Attendance</div>
                        <div className="text-[10px] text-slate-500 font-medium">2 classes</div>
                      </div>
                    </div>
                  </div>

                  {/* Task 3 */}
                  <div 
                    onClick={() => setIsLessonNoteModalOpen(true)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-orange-800">Review Lesson Notes</div>
                        <div className="text-[10px] text-slate-500 font-medium">3 lessons</div>
                      </div>
                    </div>
                  </div>

                  {/* Task 4 */}
                  <div 
                    onClick={() => setIsResourceUploadModalOpen(true)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <UploadCloud className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-sky-800">Upload Resources</div>
                        <div className="text-[10px] text-slate-500 font-medium">2 pending</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Block 3: Upcoming Events */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Upcoming Events</h3>
                  <button 
                    onClick={() => onNavigateTab('academic_calendar')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View calendar</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3">
                  
                  {/* Event 1 */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-center flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="font-black text-xs text-slate-900 leading-none">21</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">MAY</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">Department Meeting</div>
                        <div className="text-[10px] text-slate-500">10:00 AM – 11:00 AM</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>

                  {/* Event 2 */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-center flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="font-black text-xs text-slate-900 leading-none">22</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">MAY</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">Mid-Term Assessments Begin</div>
                        <div className="text-[10px] text-slate-500">All Day</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  </div>

                  {/* Event 3 */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-center flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="font-black text-xs text-slate-900 leading-none">25</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">MAY</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">Teachers' Workshop</div>
                        <div className="text-[10px] text-slate-500">2:00 PM – 4:00 PM</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  </div>

                  {/* Event 4 */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-center flex flex-col items-center justify-center shrink-0 border border-slate-200">
                        <span className="font-black text-xs text-slate-900 leading-none">28</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mt-0.5">MAY</span>
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">PTA Meeting</div>
                        <div className="text-[10px] text-slate-500">11:00 AM – 12:00 PM</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 5: RECENT ACTIVITY & SCHOOL ANNOUNCEMENTS            */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Block 1: Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Recent Activity</h3>
                <button 
                  onClick={() => showToast('Opening complete audit log of teacher activities')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                
                {/* Item 1 */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">You created a lesson note for JSS 2A Mathematics</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">1 hour ago</span>
                </div>

                {/* Item 2 */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">You marked an assessment for SS 1B Mathematics</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">3 hours ago</span>
                </div>

                {/* Item 3 */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">You uploaded resources for SS 1A Further Maths</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">Yesterday</span>
                </div>

                {/* Item 4 */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Attendance recorded for JSS 2B Mathematics</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">Yesterday</span>
                </div>

              </div>
            </div>

            {/* Block 2: School Announcements */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">School Announcements</h3>
                <button 
                  onClick={() => setIsNotificationsModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                
                {/* Announcement 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">Mid-Term Assessments</h4>
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        Today <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Mid-term assessments begin on May 22nd. Please ensure all lesson notes are up to date.
                    </p>
                  </div>
                </div>

                {/* Announcement 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">Teachers' Workshop</h4>
                      <span className="text-[10px] font-semibold text-slate-400">2 days ago</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      A professional development workshop holds this Friday at 10:00 AM in the assembly hall.
                    </p>
                  </div>
                </div>

                {/* Announcement 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">New Curriculum Resources</h4>
                      <span className="text-[10px] font-semibold text-slate-400">4 days ago</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      New resources for Term 3 are now available in the Resources section.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* ROW 6: RESOURCES AT YOUR FINGERTIPS BANNER               */}
          {/* ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Resources at Your Fingertips</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Access curriculum guides, scheme of work, past questions and more.
                </p>
              </div>

              <button
                onClick={() => setIsResourceUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-[#033a2d] hover:bg-[#022c22] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                Explore Resources
              </button>
            </div>

            {/* 6 Quick Resource Filter Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              
              <button
                onClick={() => onNavigateTab('curriculum_source')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">Curriculum Guides</span>
              </button>

              <button
                onClick={() => onLaunchLessonModal()}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <FileCode className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">Scheme of Work</span>
              </button>

              <button
                onClick={() => onNavigateTab('question_bank')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">Past Questions</span>
              </button>

              <button
                onClick={() => onNavigateTab('secure_exams')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">Marking Schemes</span>
              </button>

              <button
                onClick={() => setIsResourceUploadModalOpen(true)}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">Teaching Resources</span>
              </button>

              <button
                onClick={() => showToast('Opening Greenfield e-Library Textbook Vault')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">e-Library</span>
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
                    onClick={() => showToast('Connecting to Teacher Support Concierge...')}
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
                  Join our teacher community and stay updated on best practices.
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
                    Take Curriculum Flow with you, anywhere.
                  </p>
                  
                  {/* Google Play and App Store Badges */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <div 
                      onClick={() => showToast('Opening Google Play Store package: com.curriculumflow.teacher')}
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
      {/* 4. MODALS HUB INTEGRATION (Attendance, Notes, Grading, Tools) */}
      {/* ============================================================ */}
      <TeacherModals
        isAttendanceModalOpen={isAttendanceModalOpen}
        onCloseAttendanceModal={() => setIsAttendanceModalOpen(false)}
        isLessonNoteModalOpen={isLessonNoteModalOpen}
        onCloseLessonNoteModal={() => setIsLessonNoteModalOpen(false)}
        isGradingModalOpen={isGradingModalOpen}
        onCloseGradingModal={() => setIsGradingModalOpen(false)}
        isResourceUploadModalOpen={isResourceUploadModalOpen}
        onCloseResourceUploadModal={() => setIsResourceUploadModalOpen(false)}
        isClassDetailsModalOpen={isClassDetailsModalOpen}
        onCloseClassDetailsModal={() => setIsClassDetailsModalOpen(false)}
        isDateFilterModalOpen={isDateFilterModalOpen}
        onCloseDateFilterModal={() => setIsDateFilterModalOpen(false)}
        isNotificationsModalOpen={isNotificationsModalOpen}
        onCloseNotificationsModal={() => setIsNotificationsModalOpen(false)}
        isAllToolsModalOpen={isAllToolsModalOpen}
        onCloseAllToolsModal={() => setIsAllToolsModalOpen(false)}
        selectedClassForDetails={selectedClassForDetails}
        currentDateFilter={currentDateFilter}
        onSelectDateFilter={setCurrentDateFilter}
        onNavigateTab={onNavigateTab}
        onShowToast={showToast}
        onOpenAdvisorModal={onOpenAdvisorModal}
      />

      {/* Teacher Assigned NERDC Curriculum Viewer & Scheme of Work Modal */}
      <TeacherCurriculumViewerModal
        isOpen={isCurriculumViewerOpen}
        onClose={() => setIsCurriculumViewerOpen(false)}
        assignedSubjects={['General Mathematics', 'Further Mathematics', 'Basic Science & Technology', 'English Language']}
        teacherName={teacherName}
        onOpenLessonPlanWithTopic={(subject, topic) => {
          setIsCurriculumViewerOpen(false);
          onLaunchLessonModal();
          showToast(`Opening AI Lesson Note Generator for ${subject.name} - ${topic.title}`);
        }}
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
