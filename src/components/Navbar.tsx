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
  Globe,
  Radio,
  ExternalLink,
  Cpu,
  Boxes
} from 'lucide-react';
import { CurriculumServerIcon, CurriculumFlowIcon } from './brand/BrandAssets';

export type MainTabType = 
  | 'curriculum_server_landing'
  | 'school_public_website'
  | 'curriculum_server'
  | 'tenant_control_center'
  | 'pricing_management'
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
  | 'academic_analytics'
  | 'report_card_studio'
  | 'promotional_mock_exams'
  | 'logistics_support'
  | 'docker_orchestration';

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
  onOpenProvisionModal?: () => void;
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
  onOpenProvisionModal,
  onOpenCloneModal,
  onOpenConnectModal
}) => {
  const isTenantSchoolInstance = platformMode === 'tenant_school_instance';

  // Extract effective branding based on platformMode and activeTenant
  const effectiveBrand: SchoolBrandProfile | undefined = 
    isTenantSchoolInstance && activeTenant?.brandProfile
      ? activeTenant.brandProfile
      : brandProfile;

  // Dynamic School Brand Identity
  const primaryColor = effectiveBrand?.brandTheme?.primaryColor || '#059669';
  const secondaryColor = effectiveBrand?.brandTheme?.secondaryColor || '#0f766e';
  const accentColor = effectiveBrand?.brandTheme?.accentColor || '#10b981';
  const schoolName = effectiveBrand?.schoolName || activeTenant?.schoolName || 'CurriculumFlow';
  const schoolShortName = effectiveBrand?.shortName || activeTenant?.schoolSlug || 'School OS';
  const crestLogoUrl = effectiveBrand?.crestLogoUrl;
  const logoShape = effectiveBrand?.logoShape || 'rounded';
  const tenantAppId = activeTenant?.appId || 'CF-ROOT-INSTANCE';
  const tenantDomain = activeTenant?.customDomain || activeTenant?.subdomain || (activeTenant ? `${activeTenant.schoolSlug}.curriculumflow.com` : 'curriculumflow.com');

  const getLogoShapeClass = (shape: string) => {
    switch (shape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-none';
      case 'shield': return 'rounded-b-2xl rounded-t-lg';
      case 'rounded':
      default: return 'rounded-xl';
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Platform Super Admin', color: 'bg-indigo-900/80 text-indigo-200 border-indigo-500/60 font-bold' };
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
      case 'school_public_website':
        return { label: 'School Public Website & Admissions', category: 'Public School Portal', icon: School };
      case 'curriculum_server':
        return { label: 'Curriculum Server (SaaS Hub)', category: 'SaaS Cloud', icon: Server };
      case 'tenant_control_center':
        return { label: 'Control Plane Cockpit (Phased Docker-per-Tenant)', category: 'SaaS Cloud', icon: Boxes };
      case 'customer_self_service':
        return { label: 'Customer Self-Service Portal', category: 'SaaS Cloud', icon: ShieldCheck };
      case 'api_webhooks':
        return { label: 'API Keys & Webhooks Engine', category: 'SaaS Cloud', icon: KeyRound };
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
      case 'principal_governance':
        return { label: 'Principal Governance & Approvals', category: 'Governance', icon: ShieldCheck };
      case 'user_onboarding':
        return { label: 'User Provisioning & Onboarding Suite', category: 'IAM & Governance', icon: Users };
      case 'user_profiles':
        return { label: 'Institutional Profiles', category: 'Governance', icon: Users };
      case 'parent_database':
        return { label: 'Supervised Parents DB & Ward Mapping', category: 'Governance', icon: UserCheck };
      case 'brand_management':
        return { label: 'School Brand & Identity', category: 'Governance', icon: Palette };
      case 'bursary_accounts':
        return { label: 'Bursary, Accounts & PSP Payments', category: 'Governance', icon: Building2 };
      case 'iam_governance':
        return { label: 'Office of Principal (IAM)', category: 'Governance', icon: Lock };
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
        return { label: schoolName, category: 'Module', icon: School };
    }
  };

  const currentRoleBadge = getRoleBadge(currentUser.role);
  const activeTabInfo = getActiveTabDetails(activeTab);
  const TabIcon = activeTabInfo.icon;

  // Visitors on CurriculumFlow landing page OR Provisioned School Public Website do not see the internal app Navbar
  if (activeTab === 'curriculum_server_landing' || activeTab === 'school_public_website') {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl transition-colors duration-300">
      {/* Dynamic Top Brand Indicator Ribbon Line */}
      <div 
        className="h-1 w-full transition-all duration-500"
        style={{
          background: isTenantSchoolInstance 
            ? `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 50%, ${secondaryColor} 100%)`
            : 'linear-gradient(90deg, #4F46E5 0%, #06B6D4 50%, #2563EB 100%)'
        }}
      />

      {/* Top Universal SaaS Multi-Tenant Switcher Ribbon */}
      {/* ONLY visible in SaaS Master Console mode for super_admin - NEVER displayed on provisioned schools or to regular users/visitors */}
      {platformMode === 'saas_master_console' && currentUser.role === 'super_admin' && (
        <div className="w-full border-b px-3 sm:px-4 lg:px-6 py-1.5 flex items-center justify-between gap-3 text-xs transition-colors duration-300 bg-slate-950 border-indigo-950/80">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* SaaS Master vs Tenant View Pill */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => {
                  if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                  onSelectTab('curriculum_server_landing');
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'curriculum_server_landing' && !isTenantSchoolInstance
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
                  activeTab === 'curriculum_server' && !isTenantSchoolInstance
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-3 h-3 text-emerald-300" />
                <span>SaaS Hub</span>
              </button>

              <button
                onClick={() => {
                  if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                  onSelectTab('domain_management');
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'domain_management' && !isTenantSchoolInstance
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3 h-3 text-amber-300" />
                <span>Domain Portal</span>
              </button>

              <button
                onClick={() => {
                  if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                  onSelectTab('customer_self_service');
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'customer_self_service' && !isTenantSchoolInstance
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Proprietor Portal</span>
              </button>

              <button
                onClick={() => {
                  if (onSwitchPlatformMode) onSwitchPlatformMode('tenant_school_instance');
                  if (activeTab === 'curriculum_server' || activeTab === 'curriculum_server_landing' || activeTab === 'domain_management' || activeTab === 'tenant_control_center' || activeTab === 'customer_self_service' || activeTab === 'api_webhooks') {
                    onSelectTab('command_center');
                  }
                }}
                style={
                  isTenantSchoolInstance 
                    ? { backgroundColor: primaryColor, color: '#ffffff' }
                    : undefined
                }
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  isTenantSchoolInstance
                    ? 'shadow-sm text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <School className="w-3 h-3" />
                <span>School Instance View</span>
              </button>

              {currentUser.role === 'super_admin' && (
                <button
                  onClick={() => {
                    if (onSwitchPlatformMode) onSwitchPlatformMode('saas_master_console');
                    onSelectTab('tenant_control_center');
                  }}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    activeTab === 'tenant_control_center' && !isTenantSchoolInstance
                      ? 'bg-rose-700 text-white shadow-sm ring-1 ring-rose-400'
                      : 'text-rose-300/80 hover:text-rose-200 hover:bg-rose-950/40'
                  }`}
                >
                  <Boxes className="w-3 h-3 text-rose-300" />
                  <span>Control Plane Cockpit</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                    ROOT
                  </span>
                </button>
              )}
            </div>

            {/* Active Tenant App ID & White-Label Indicator Chip */}
            {activeTenant && isTenantSchoolInstance ? (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                <span className="text-slate-400 font-sans font-medium">School:</span>
                <span className="font-bold text-slate-100">{schoolName}</span>
                <span className="font-mono text-[10px]" style={{ color: accentColor }}>({tenantAppId})</span>
                <span 
                  className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ml-0.5"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    borderColor: `${primaryColor}50`,
                    color: primaryColor
                  }}
                >
                  {activeTenant.businessModel.replace(/_/g, ' ')}
                </span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-[11px] text-indigo-300 font-mono">
                <Server className="w-3 h-3 text-indigo-400" />
                <span>SaaS Control Plane:</span>
                <span className="font-bold text-white">Curriculum Server Core</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200 font-bold ml-1">MASTER ROOT</span>
              </div>
            )}
          </div>

          {/* Right SaaS Controls: Quick Switch Tenant + Connect + Provision */}
          <div className="flex items-center gap-2">
            {/* Quick Provisioned Tenant Dropdown */}
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
                      if (activeTab === 'curriculum_server' || activeTab === 'curriculum_server_landing' || activeTab === 'domain_management') {
                        onSelectTab('command_center');
                      }
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] transition-colors"
                  style={{ color: isTenantSchoolInstance ? accentColor : '#818CF8' }}
                  aria-label="Switch Active Provisioned School Instance"
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

            {(onOpenProvisionModal || onOpenCloneModal) && (
              <button
                onClick={onOpenProvisionModal || onOpenCloneModal}
                className="px-2.5 py-0.5 rounded-md text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                style={{
                  backgroundColor: isTenantSchoolInstance ? primaryColor : '#4F46E5',
                }}
                title="Provision and deploy a new CurriculumFlow school"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Provision School</span>
              </button>
            )}
          </div>
        </div>
      )}

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
              <Menu 
                className="w-5 h-5 transition-colors" 
                style={{ color: isTenantSchoolInstance ? accentColor : '#818CF8' }}
              />
            </button>

            {/* Desktop Panel Collapse Button (when drawer is visible) */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all shadow-sm"
                title={isDrawerCollapsed ? "Expand Drawer (Ctrl+B)" : "Collapse Drawer (Ctrl+B)"}
                aria-label={isDrawerCollapsed ? "Expand Drawer" : "Collapse Drawer"}
              >
                {isDrawerCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" style={{ color: isTenantSchoolInstance ? accentColor : '#818CF8' }} />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Dynamic Brand Logo & Identity Block */}
            {isTenantSchoolInstance ? (
              // WHITE-LABELED TENANT SCHOOL BRANDING
              <div className="hidden md:flex items-center gap-2.5 shrink-0 border-r border-slate-800/80 pr-3.5">
                <div 
                  className={`w-9 h-9 ${getLogoShapeClass(logoShape)} flex items-center justify-center text-white shadow-md border overflow-hidden p-0.5 transition-all`}
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    borderColor: `${accentColor}80`,
                    boxShadow: `0 4px 14px -2px ${primaryColor}40`
                  }}
                >
                  {crestLogoUrl ? (
                    <img 
                      src={crestLogoUrl} 
                      alt={`${schoolName} Logo`} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white tracking-tight leading-tight truncate max-w-[170px] lg:max-w-[220px]">
                      {schoolShortName || schoolName}
                    </span>
                    <span 
                      className="text-[8px] font-bold uppercase px-1 rounded"
                      style={{
                        backgroundColor: `${primaryColor}25`,
                        color: accentColor,
                        border: `1px solid ${primaryColor}40`
                      }}
                    >
                      School OS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate max-w-[170px] lg:max-w-[220px]">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    {tenantDomain}
                  </span>
                </div>
              </div>
            ) : (
              // CURRICULUM SERVER MASTER B2B SAAS BRANDING
              <div className="hidden md:flex items-center gap-2.5 shrink-0 border-r border-slate-800/80 pr-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-700 shadow-md shadow-indigo-950/60 border border-indigo-400/40 shrink-0">
                  <CurriculumServerIcon className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-white tracking-tight uppercase leading-tight">
                      CURRICULUM<span className="text-indigo-400 ml-1">SERVER</span>
                    </span>
                    <span className="text-[8px] font-black uppercase px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      CONTROL PLANE
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-300/80 font-medium tracking-wide truncate max-w-[240px]">
                    Guardrails for Quality Educational Delivery
                  </span>
                </div>
              </div>
            )}

            {/* Current Active Tab Breadcrumb Banner */}
            <div 
              className="flex items-center gap-2 min-w-0 bg-slate-900/60 border py-1 px-2.5 rounded-xl transition-all"
              style={{
                borderColor: isTenantSchoolInstance ? `${primaryColor}30` : 'rgba(51, 65, 85, 0.7)'
              }}
            >
              <div 
                className="p-1 rounded-md border shrink-0 transition-colors"
                style={{
                  backgroundColor: isTenantSchoolInstance ? `${primaryColor}20` : 'rgba(79, 70, 229, 0.2)',
                  borderColor: isTenantSchoolInstance ? `${primaryColor}60` : 'rgba(79, 70, 229, 0.5)',
                  color: isTenantSchoolInstance ? accentColor : '#A5B4FC'
                }}
              >
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

            {/* AI Advisor Button - Accented with Active Brand Tone */}
            <button
              onClick={onOpenAdvisorModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border"
              style={{
                backgroundColor: isTenantSchoolInstance ? `${primaryColor}20` : 'rgba(79, 70, 229, 0.2)',
                borderColor: isTenantSchoolInstance ? `${primaryColor}60` : 'rgba(99, 102, 241, 0.4)',
                color: isTenantSchoolInstance ? accentColor : '#C7D2FE'
              }}
              title="Open Curriculum & Pedagogical AI Advisor"
            >
              <Sparkles 
                className="w-4 h-4 animate-pulse" 
                style={{ color: isTenantSchoolInstance ? accentColor : '#818CF8' }}
              />
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
