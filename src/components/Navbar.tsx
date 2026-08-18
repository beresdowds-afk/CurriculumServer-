import React from 'react';
import { 
  UserProfile, 
  UserRole,
  SchoolBrandProfile,
  TenantSchoolApp,
  PlatformViewMode
} from '../types';
import { 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  Layers, 
  Lock, 
  CheckCircle2, 
  FileCheck2,
  CalendarCheck2,
  Activity,
  Users,
  Calendar,
  CalendarDays,
  ClipboardList,
  ScanFace,
  Download,
  GraduationCap,
  Building2,
  Palette,
  School,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Server,
  KeyRound,
  Plus,
  ArrowRightLeft,
  ChevronDown,
  Globe
} from 'lucide-react';
import { CurriculumServerIcon, CurriculumFlowIcon } from './brand/BrandAssets';

export type MainTabType = 
  | 'curriculum_server_landing'
  | 'curriculum_server'
  | 'tenant_control_center'
  | 'customer_self_service'
  | 'api_webhooks'
  | 'domain_management'
  | 'command_center'
  | 'teacher_dashboard'
  | 'admin_assistant_dashboard'
  | 'student_dashboard'
  | 'parent_dashboard'
  | 'principal_governance'
  | 'user_onboarding'
  | 'user_profiles'
  | 'parent_database'
  | 'brand_management'
  | 'bursary_accounts'
  | 'iam_governance'
  | 'academic_calendar'
  | 'teacher_pool'
  | 'class_groups'
  | 'school_timetable'
  | 'student_registers'
  | 'academic_records'
  | 'biometric_attendance'
  | 'curriculum_source'
  | 'lesson_chain'
  | 'delivery_tracking'
  | 'adaptive_remedial'
  | 'question_bank'
  | 'secure_exams'
  | 'taught_assessment'
  | 'academic_analytics';

interface NavbarProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenAdvisorModal: () => void;
  onOpenInstallModal?: () => void;
  onOpenAuthModal?: () => void;
  pendingApprovalsCount: number;
  pendingRemedialsCount: number;
  brandProfile?: SchoolBrandProfile;
  onToggleDrawer: () => void;
  isDrawerCollapsed?: boolean;
  onToggleCollapse?: () => void;
  
  // Multi-Tenant SaaS Props
  platformMode: PlatformViewMode;
  activeTenant?: TenantSchoolApp;
  allTenants?: TenantSchoolApp[];
  onSelectTenant?: (tenant: TenantSchoolApp) => void;
  onSwitchPlatformMode?: (mode: PlatformViewMode) => void;
  onOpenCloneModal?: () => void;
  onOpenConnectModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  activeTab,
  onSelectTab,
  onOpenAdvisorModal,
  onOpenInstallModal,
  onOpenAuthModal,
  pendingApprovalsCount,
  pendingRemedialsCount,
  brandProfile,
  onToggleDrawer,
  isDrawerCollapsed,
  onToggleCollapse,
  platformMode,
  activeTenant,
  allTenants = [],
  onSelectTenant,
  onSwitchPlatformMode,
  onOpenCloneModal,
  onOpenConnectModal
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'principal_admin':
      case 'principal':
        return { label: 'Principal (Executive Root)', color: 'bg-purple-900/60 text-purple-200 border-purple-700/50' };
      case 'vice_principal_academic':
        return { label: 'VP Academics', color: 'bg-indigo-900/60 text-indigo-200 border-indigo-700/50' };
      case 'vice_principal_admin':
        return { label: 'VP Administration', color: 'bg-sky-900/60 text-sky-200 border-sky-700/50' };
      case 'admin_assistant':
      case 'administrative_assistant':
        return { label: 'Executive Admin Assistant', color: 'bg-teal-900/60 text-teal-200 border-teal-700/50' };
      case 'academic_coordinator':
        return { label: 'Academic Coordinator', color: 'bg-indigo-900/60 text-indigo-200 border-indigo-700/50' };
      case 'bursar_finance':
        return { label: 'Bursar & Finance', color: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50' };
      case 'dean_student_affairs':
        return { label: 'Dean of Students', color: 'bg-rose-900/60 text-rose-200 border-rose-700/50' };
      case 'ict_system_admin':
        return { label: 'ICT & Systems Admin', color: 'bg-teal-900/60 text-teal-200 border-teal-700/50' };
      case 'hod':
      case 'hod_sciences':
      case 'hod_arts':
        return { label: 'Head of Dept (HOD)', color: 'bg-blue-900/60 text-blue-200 border-blue-700/50' };
      case 'teacher':
        return { label: 'Class Teacher', color: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50' };
      case 'exam_officer':
        return { label: 'Examination Officer', color: 'bg-amber-900/60 text-amber-200 border-amber-700/50' };
      case 'student':
        return { label: 'Student', color: 'bg-teal-900/60 text-teal-200 border-teal-700/50' };
      case 'parent':
        return { label: 'Parent / Guardian', color: 'bg-rose-900/60 text-rose-200 border-rose-700/50' };
      default:
        return { label: 'Administrator', color: 'bg-slate-800 text-slate-200 border-slate-700' };
    }
  };

  const getActiveTabDetails = (tab: MainTabType) => {
    switch (tab) {
      case 'curriculum_server_landing':
        return { label: 'Curriculum Server (Public Showcase)', category: 'SaaS Cloud', icon: Globe };
      case 'curriculum_server':
        return { label: 'Curriculum Server (SaaS Master)', category: 'SaaS Cloud', icon: Server };
      case 'domain_management':
        return { label: 'Domain Registrar & DNS Governance', category: 'SaaS Cloud', icon: Globe };
      case 'command_center':
        return { label: 'School Command Center (Principal)', category: 'Governance', icon: Activity };
      case 'teacher_dashboard':
        return { label: 'Teacher Command Dashboard', category: 'Instructional Operations', icon: BookOpen };
      case 'admin_assistant_dashboard':
        return { label: 'Administrative Registry Desk', category: 'Executive Secretariat', icon: Building2 };
      case 'student_dashboard':
        return { label: 'Student Learning Dashboard', category: 'Student Portal', icon: GraduationCap };
      case 'parent_dashboard':
        return { label: 'Parent & Guardian Portal', category: 'Parent Hub', icon: Users };
      case 'bursary_accounts':
        return { label: 'Bursary, Accounts & PSP Payments', category: 'Governance', icon: Building2 };
      case 'iam_governance':
        return { label: 'Office of Principal (IAM)', category: 'Governance', icon: ShieldCheck };
      case 'user_profiles':
        return { label: 'Institutional Profiles', category: 'Governance', icon: Users };
      case 'parent_database':
        return { label: 'Supervised Parents DB & Ward Mapping', category: 'Governance', icon: UserCheck };
      case 'brand_management':
        return { label: 'School Brand & Identity', category: 'Governance', icon: Palette };
      case 'academic_calendar':
        return { label: 'Academic Calendar', category: 'Operations', icon: CalendarDays };
      case 'teacher_pool':
        return { label: "Teacher's Pool & Faculty", category: 'Operations', icon: Users };
      case 'class_groups':
        return { label: 'Class Groups DB', category: 'Operations', icon: Layers };
      case 'school_timetable':
        return { label: 'School Timetable Portal', category: 'Operations', icon: Calendar };
      case 'student_registers':
        return { label: 'Student & Class Registers', category: 'Operations', icon: ClipboardList };
      case 'academic_records':
        return { label: 'Academic Records & Subject Portals', category: 'Operations', icon: GraduationCap };
      case 'biometric_attendance':
        return { label: 'Biometric & Movement Monitoring', category: 'Operations', icon: ScanFace };
      case 'curriculum_source':
        return { label: 'Curriculum Authority', category: 'Curriculum', icon: BookOpen };
      case 'lesson_chain':
        return { label: 'Lesson Planning & Review', category: 'Curriculum', icon: FileCheck2 };
      case 'delivery_tracking':
        return { label: 'Teacher Delivery Tracker', category: 'Curriculum', icon: CalendarCheck2 };
      case 'adaptive_remedial':
        return { label: 'Adaptive Remedial Engine', category: 'Curriculum', icon: Sparkles };
      case 'question_bank':
        return { label: 'Question Bank & Variants', category: 'Assessment', icon: Layers };
      case 'secure_exams':
        return { label: 'Secure Exams & Marking Vault', category: 'Assessment', icon: Lock };
      case 'taught_assessment':
        return { label: 'Taught-Only Assessments', category: 'Assessment', icon: CheckCircle2 };
      case 'academic_analytics':
        return { label: 'Academic Analytics & Mastery', category: 'Assessment', icon: ShieldCheck };
      default:
        return { label: 'CurriculumFlow', category: 'Module', icon: School };
    }
  };

  const currentRoleBadge = getRoleBadge(currentUser.role);
  const activeTabInfo = getActiveTabDetails(activeTab);
  const TabIcon = activeTabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top Universal SaaS Multi-Tenant Switcher Ribbon */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-4 lg:px-6 py-1.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* SaaS Master vs Tenant View Pill */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                onSelectTab('curriculum_server_landing');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'curriculum_server_landing'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Showcase Landing</span>
            </button>

            <button
              onClick={() => {
                if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                onSelectTab('curriculum_server');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'curriculum_server'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>CURRICULUM SERVER (SaaS Hub)</span>
            </button>

            <button
              onClick={() => {
                if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                onSelectTab('domain_management');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'domain_management'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3 text-amber-300" />
              <span>Domain Portal</span>
            </button>

            <button
              onClick={() => {
                if (onSwitchPlatformMode) onSwitchPlatformMode('tenant_school_instance');
                if (activeTab === 'curriculum_server' || activeTab === 'curriculum_server_landing' || activeTab === 'domain_management') onSelectTab('command_center');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab !== 'curriculum_server' && activeTab !== 'curriculum_server_landing' && activeTab !== 'domain_management' && platformMode === 'tenant_school_instance'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <School className="w-3 h-3" />
              <span>School Instance View</span>
            </button>
          </div>

          {/* Active Tenant App ID Chip */}
          {activeTenant && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">Tenant:</span>
              <span className="font-bold text-slate-200">{activeTenant.schoolName}</span>
              <span className="text-emerald-400">({activeTenant.appId})</span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 ml-1">
                {activeTenant.businessModel.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Right SaaS Controls: Quick Switch Tenant + Connect + Clone */}
        <div className="flex items-center gap-2">
          {/* Quick Cloned Tenant Dropdown */}
          {allTenants.length > 0 && onSelectTenant && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 hidden xl:inline">Switch School:</span>
              <select
                value={activeTenant?.id || ''}
                onChange={(e) => {
                  const target = allTenants.find(t => t.id === e.target.value);
                  if (target) {
                    onSelectTenant(target);
                    if (onSwitchPlatformMode) onSwitchPlatformMode('tenant_school_instance');
                    if (activeTab === 'curriculum_server') onSelectTab('command_center');
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-emerald-300 font-semibold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px]"
                aria-label="Switch Active Cloned School Instance"
              >
                {allTenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.schoolName} ({t.appId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {onOpenConnectModal && (
            <button
              onClick={onOpenConnectModal}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
              title="Authenticate via App ID & App Secret"
            >
              <KeyRound className="w-3 h-3 text-sky-400" />
              <span className="hidden sm:inline">Connect App</span>
            </button>
          )}

          {onOpenCloneModal && (
            <button
              onClick={onOpenCloneModal}
              className="px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
              title="Clone and deploy a new CurriculumFlow school"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Clone School</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Header Row: Drawer Toggle + Brand + Breadcrumbs + Right Controls */}
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          
          {/* Left: Drawer Toggle Button & Active Section Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Mobile / Desktop Drawer Toggle Button */}
            <button
              onClick={onToggleDrawer}
              className="flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all shadow-sm group"
              title="Toggle Feature Navigation Drawer"
              aria-label="Toggle Feature Navigation Drawer"
            >
              <Menu className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Desktop Panel Collapse Button (when drawer is visible) */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-all shadow-sm"
                title={isDrawerCollapsed ? "Expand Drawer (Ctrl+B)" : "Collapse Drawer (Ctrl+B)"}
                aria-label={isDrawerCollapsed ? "Expand Drawer" : "Collapse Drawer"}
              >
                {isDrawerCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Brand Logo & Name (hidden on small mobile if breadcrumb takes space) */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0 border-r border-slate-800/80 pr-3.5">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-emerald-400/30 overflow-hidden"
                style={{
                  background: brandProfile?.brandTheme?.primaryColor
                    ? `linear-gradient(135deg, ${brandProfile.brandTheme.primaryColor}, ${brandProfile.brandTheme.secondaryColor})`
                    : 'linear-gradient(135deg, #059669, #0f766e)'
                }}
              >
                {brandProfile?.crestLogoUrl ? (
                  <img src={brandProfile.crestLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <School className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-white tracking-tight leading-tight">
                  {brandProfile?.shortName || activeTenant?.schoolName || 'CurriculumFlow'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeTenant?.appId || 'CF-ROOT-INSTANCE'}
                </span>
              </div>
            </div>

            {/* Current Active Tab Breadcrumb Banner */}
            <div className="flex items-center gap-2 min-w-0 bg-slate-900/60 border border-slate-800/70 py-1 px-2.5 rounded-xl">
              <div className="p-1 rounded-md bg-emerald-950 border border-emerald-700/50 text-emerald-400 shrink-0">
                <TabIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hidden sm:inline">
                  {activeTabInfo.category}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline shrink-0" />
                <span className="text-xs font-bold text-slate-100 truncate">
                  {activeTabInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right Area: Role Selector + Auth Portal + AI Advisor + Install App Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Auth & Security Portal Button */}
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Office of Principal Auth, Google SSO & Phone Verification Portal"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden xl:inline">Auth & IAM</span>
                <span className="xl:hidden text-[11px] font-bold">Auth</span>
              </button>
            )}

            {/* Install / Share App Button */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Download, share, and install CurriculumFlow on Android, iOS, or PC"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden lg:inline">Install & Share</span>
                <span className="lg:hidden text-[11px] font-bold">Install</span>
              </button>
            )}

            {/* AI Advisor Button */}
            <button
              onClick={onOpenAdvisorModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm"
              title="Open Curriculum & Pedagogical AI Advisor"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="hidden md:inline">AI Advisor</span>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="relative flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-inner">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
                {currentUser.avatar}
              </div>
              <div className="hidden xl:flex flex-col text-left mr-1">
                <span className="text-xs font-bold text-slate-200 truncate max-w-[110px] leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
                  {currentRoleBadge.label}
                </span>
              </div>

              {/* Selector */}
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const target = allUsers.find(u => u.id === e.target.value);
                  if (target) onSelectUser(target);
                }}
                aria-label="Switch User Persona & Role"
                className="bg-slate-800 text-slate-200 text-xs font-medium py-1 px-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[130px] sm:max-w-none"
              >
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({getRoleBadge(user.role).label})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


