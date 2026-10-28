import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  UserRole,
  SchoolBrandProfile 
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
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkle,
  Radio,
  Server,
  Globe,
  Cpu,
  Code,
  Sliders,
  Terminal,
  UserPlus,
  Printer,
  Award,
  FileText,
  Bus,
  Tag,
  BadgePercent
} from 'lucide-react';
import { MainTabType } from './Navbar';

export interface NavTabItem {
  id: MainTabType;
  label: string;
  shortLabel?: string;
  description: string;
  icon: React.ElementType;
  category: 'saas_cloud' | 'governance' | 'operations' | 'curriculum' | 'assessment';
  badgeCount?: number;
  badgeColor?: string;
  highlight?: boolean;
}

interface NavigationDrawerProps {
  currentUser: UserProfile;
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  isOpen: boolean; // For mobile overlay or desktop visibility
  isCollapsed: boolean; // For desktop collapsed icon rail mode
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  pendingApprovalsCount: number;
  pendingRemedialsCount: number;
  brandProfile?: SchoolBrandProfile;
  onOpenAdvisorModal: () => void;
  onOpenAuthModal?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  pendingApprovalsCount,
  pendingRemedialsCount,
  brandProfile,
  onOpenAdvisorModal,
  onOpenAuthModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  const navTabs: NavTabItem[] = useMemo(() => [
    // 0. CURRICULUM SERVER Control Plane (Public Showcase + 4 Super Admin Infrastructure Modules)
    {
      id: 'curriculum_server_landing',
      label: 'Curriculum Server (Public Showcase)',
      shortLabel: 'Public Showcase',
      description: 'Public showcase, pricing calculator, and SaaS architecture',
      icon: Globe,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'docker_orchestration',
      label: 'Docker Tenant Orchestrator & Shards',
      shortLabel: 'Docker Orchestrator',
      description: 'Phased container runtime, cgroup v2 resource limits & live shard migrations (Super Admin only)',
      icon: Server,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'tenant_control_center',
      label: 'Control Plane & Infrastructure Cockpit',
      shortLabel: 'Control Plane Cockpit',
      description: 'Multi-tenant Docker runtime, PostgreSQL schemas, background queues & security boundaries (Super Admin only)',
      icon: Cpu,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'curriculum_server',
      label: 'Curriculum Server (SaaS Master)',
      shortLabel: 'Curriculum Server',
      description: 'Multi-tenant school cloning, license management & SaaS subscriptions (Super Admin only)',
      icon: Server,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'pricing_management',
      label: 'Product Offers & Pricing Manager',
      shortLabel: 'Pricing & Offers',
      description: 'Super Admin pricing management, subscription tiers, 4+1 bundles, add-ons & promo codes',
      icon: BadgePercent,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'api_webhooks',
      label: 'REST API v1 & Webhooks Gateway',
      shortLabel: 'REST API & Webhooks',
      description: 'API endpoints, HMAC signed events & embeddable school website widgets (Super Admin only)',
      icon: Code,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'quality_assurance',
      label: 'Phase 8 Quality Assurance & Testing Suite',
      shortLabel: 'Quality Assurance',
      description: 'Automated verification of NERDC curriculum, question banks, textbook engine & security',
      icon: ShieldCheck,
      category: 'saas_cloud',
      highlight: true
    },
    {
      id: 'domain_management',
      label: 'Domain Registrar & DNS Governance',
      shortLabel: 'Domain Portal',
      description: 'NiRA registrar .sch.ng/.edu.ng/.ng registration, custom domains & DNS zones',
      icon: Globe,
      category: 'saas_cloud',
      highlight: false
    },
    {
      id: 'customer_self_service',
      label: 'Proprietor Self-Service Portal',
      shortLabel: 'Proprietor Portal',
      description: 'School subscription management, modular add-on toggles & billing invoices',
      icon: Building2,
      category: 'saas_cloud',
      highlight: false
    },

    // 1. EXECUTIVE & GOVERNANCE (CURRICULUM FLOW)
    {
      id: 'school_public_website',
      label: 'School Public Website & Admissions',
      shortLabel: 'Public Website',
      description: 'Official school homepage, prospectus, admissions & public calendar',
      icon: School,
      category: 'governance',
      highlight: true
    },
    {
      id: 'command_center',
      label: 'School Command Center (Principal)',
      shortLabel: 'Command Center',
      description: 'Executive KPIs, syllabus velocity & approvals',
      icon: Activity,
      category: 'governance',
      highlight: true
    },
    {
      id: 'teacher_dashboard',
      label: 'Teacher Command Dashboard',
      shortLabel: 'Teacher Dashboard',
      description: "Teacher's daily roll-call, lesson plans, class rosters & grading hub",
      icon: BookOpen,
      category: 'operations',
      highlight: true
    },
    {
      id: 'admin_assistant_dashboard',
      label: 'Administrative Assistant Registry Desk',
      shortLabel: 'Admin Assistant Desk',
      description: 'Principal executive memos, visitor passes, relief assignments & transcript registry',
      icon: Building2,
      category: 'operations',
      highlight: true
    },
    {
      id: 'student_dashboard',
      label: 'Student Learning OS Dashboard',
      shortLabel: 'Student Dashboard',
      description: 'Personal timetable, assignments due, live performance, e-library & teacher messaging',
      icon: GraduationCap,
      category: 'operations',
      highlight: true
    },
    {
      id: 'parent_dashboard',
      label: 'Parent & Guardian Supervision Portal',
      shortLabel: 'Parent Portal',
      description: 'Multi-ward switching, term report cards, online fee payment, pickup QR passes & consent slips',
      icon: Users,
      category: 'operations',
      highlight: true
    },
    {
      id: 'principal_governance',
      label: '4-Bundle Architecture & Feature Governance',
      shortLabel: 'Bundle Governance',
      description: 'Principal admin control for Administration, Teaching, Assessment & Billing suites',
      icon: Sliders,
      category: 'governance',
      highlight: true
    },
    {
      id: 'promotional_mock_exams',
      label: 'Promotional & Mock Exams Governance',
      shortLabel: 'Promotions & Mocks',
      description: 'Promotion council cutoff thresholds, WAEC/NECO/BECE mock series & readiness',
      icon: Award,
      category: 'governance',
      highlight: true
    },
    {
      id: 'user_onboarding',
      label: 'User & Student/Parent Onboarding Suite',
      shortLabel: 'Onboarding Suite',
      description: 'Principal admin creation flows for faculty, students, parents & bulk CSV ingestion',
      icon: UserPlus,
      category: 'governance',
      highlight: true
    },
    {
      id: 'bursary_accounts',
      label: 'Bursary, Accounts & PSP',
      shortLabel: 'Bursary & Accounts',
      description: 'Tuition fees, PSP gateways, settlements & ledgers',
      icon: Building2,
      category: 'governance'
    },
    {
      id: 'iam_governance',
      label: 'Office of Principal (IAM)',
      shortLabel: 'Principal IAM',
      description: 'Administrative hierarchy, roles, MFA & security',
      icon: ShieldCheck,
      category: 'governance'
    },
    {
      id: 'user_profiles',
      label: 'Institutional Profiles',
      shortLabel: 'User Profiles',
      description: 'Verified TRCN faculty, staff, students & digital ID cards',
      icon: Users,
      category: 'governance'
    },
    {
      id: 'parent_database',
      label: 'Supervised Parents DB & Ward Mapping',
      shortLabel: 'Parents DB',
      description: 'Guardian verification, multi-ward link & gate pickup security',
      icon: UserCheck,
      category: 'governance'
    },
    {
      id: 'brand_management',
      label: 'School Brand & Identity',
      shortLabel: 'Brand & Identity',
      description: 'Crest, color schemes, motto, letterhead & domains',
      icon: Palette,
      category: 'governance'
    },

    // 2. School Operations & Registry
    {
      id: 'academic_calendar',
      label: 'Academic Calendar',
      shortLabel: 'Calendar',
      description: 'Term dates, resumption, mid-term, exams & holidays',
      icon: CalendarDays,
      category: 'operations'
    },
    {
      id: 'teacher_pool',
      label: "Teacher's Pool & Faculty",
      shortLabel: 'Teacher Pool',
      description: 'Subject teacher mapping, periods & teaching loads',
      icon: Users,
      category: 'operations'
    },
    {
      id: 'class_groups',
      label: 'Class Groups DB',
      shortLabel: 'Class Groups',
      description: 'Arms, form masters, student rosters & capacities',
      icon: Layers,
      category: 'operations'
    },
    {
      id: 'school_timetable',
      label: 'School Timetable Portal',
      shortLabel: 'Timetable',
      description: 'Period schedules, clash detection & room allocations',
      icon: Calendar,
      category: 'operations'
    },
    {
      id: 'student_registers',
      label: 'Student & Class Registers',
      shortLabel: 'Registers',
      description: 'Daily roll call, session logs & term registers',
      icon: ClipboardList,
      category: 'operations'
    },
    {
      id: 'academic_records',
      label: 'Academic Records & Subject Portals',
      shortLabel: 'Academic Records',
      description: 'CA score entry, term grades & broadsheets',
      icon: GraduationCap,
      category: 'operations'
    },
    {
      id: 'biometric_attendance',
      label: 'Biometric & Movement Monitoring',
      shortLabel: 'Biometrics',
      description: 'RFID card clock-in, exit passes & live gate tracking',
      icon: ScanFace,
      category: 'operations'
    },
    {
      id: 'logistics_support',
      label: 'Logistics Support Management (Bundle 5)',
      shortLabel: 'Logistics & Hostels',
      description: 'Gate kiosk, E-Library repo, boarding hostels & bus tracking',
      icon: Bus,
      category: 'operations',
      highlight: true
    },

    // 3. Curriculum & Pedagogy
    {
      id: 'curriculum_source',
      label: 'Curriculum Authority',
      shortLabel: 'Curriculum',
      description: 'NERDC/WAEC national standards & schemes of work',
      icon: BookOpen,
      category: 'curriculum'
    },
    {
      id: 'lesson_chain',
      label: 'Lesson Planning & Review',
      shortLabel: 'Lesson Planning',
      description: '3-stage lesson notes, HOD review & Principal signoff',
      icon: FileCheck2,
      category: 'curriculum',
      badgeCount: pendingApprovalsCount,
      badgeColor: 'bg-amber-500 text-slate-950'
    },
    {
      id: 'delivery_tracking',
      label: 'Teacher Delivery Tracker',
      shortLabel: 'Delivery Tracker',
      description: 'Classroom verification, pacing & syllabus audit',
      icon: CalendarCheck2,
      category: 'curriculum'
    },
    {
      id: 'adaptive_remedial',
      label: 'Adaptive Remedial Engine',
      shortLabel: 'Remedial Engine',
      description: 'AI learning gap diagnosis & targeted reinforcement',
      icon: Sparkles,
      category: 'curriculum',
      badgeCount: pendingRemedialsCount,
      badgeColor: 'bg-rose-500 text-white'
    },

    // 4. Assessment & Analytics
    {
      id: 'question_bank',
      label: 'Question Bank & Variants',
      shortLabel: 'Question Bank',
      description: 'Curriculum-tagged item vault & CBT randomized variants',
      icon: Layers,
      category: 'assessment'
    },
    {
      id: 'past_questions_provenance',
      label: 'Past Questions & Provenance',
      shortLabel: 'Past Exams & Provenance',
      description: 'Authentic WAEC/NECO/BECE exam registry, provenance & copyright compliance',
      icon: ShieldCheck,
      category: 'assessment',
      highlight: true
    },
    {
      id: 'secure_exams',
      label: 'Secure Exams & Marking Vault',
      shortLabel: 'Secure Exams',
      description: 'Lockdown CBT, anti-leak vaults & automated grading',
      icon: Lock,
      category: 'assessment'
    },
    {
      id: 'taught_assessment',
      label: 'Taught-Only Assessments',
      shortLabel: 'Taught-Only Tests',
      description: 'Audited questions restricted to verified taught topics',
      icon: CheckCircle2,
      category: 'assessment'
    },
    {
      id: 'academic_analytics',
      label: 'Academic Analytics & Mastery',
      shortLabel: 'Analytics & Mastery',
      description: 'Cohort mastery index, subject trends & predictive grades',
      icon: ShieldCheck,
      category: 'assessment'
    },
    {
      id: 'report_card_studio',
      label: 'Terminal Report Card & Transcript Studio',
      shortLabel: 'Report Card Studio',
      description: 'Formal print-ready report sheets, psychomotor ratings, GPA & transcripts',
      icon: Printer,
      category: 'assessment',
      highlight: true
    },
    {
      id: 'promotional_mock_exams',
      label: 'Promotional & WAEC/NECO Mock Exam Council',
      shortLabel: 'Promotional Mock Exams',
      description: 'Annual promotion threshold engine, mock exam scoring, committee sign-off & certificates',
      icon: Award,
      category: 'assessment',
      highlight: true
    }
  ], [pendingApprovalsCount, pendingRemedialsCount]);

  const categories = [
    { key: 'saas_cloud', label: 'CURRICULUM SERVER (Control Plane)', color: 'text-indigo-400', border: 'border-indigo-800/40' },
    { key: 'governance', label: 'EXECUTIVE & GOVERNANCE', color: 'text-purple-400', border: 'border-purple-800/40' },
    { key: 'operations', label: 'School Operations & Registry', color: 'text-sky-400', border: 'border-sky-800/40' },
    { key: 'curriculum', label: 'Curriculum & Pedagogy', color: 'text-emerald-400', border: 'border-emerald-800/40' },
    { key: 'assessment', label: 'Assessment & Analytics', color: 'text-amber-400', border: 'border-amber-800/40' }
  ];

  const filteredTabs = useMemo(() => {
    let tabs = navTabs;
    // Super-admin only infrastructure tabs
    if (currentUser.role !== 'super_admin') {
      tabs = tabs.filter(tab => 
        tab.id !== 'tenant_control_center' && 
        tab.id !== 'docker_orchestration' &&
        tab.id !== 'curriculum_server' &&
        tab.id !== 'api_webhooks'
      );
    }
    if (!searchQuery.trim()) return tabs;
    const q = searchQuery.toLowerCase().trim();
    return tabs.filter(tab => 
      tab.label.toLowerCase().includes(q) ||
      tab.shortLabel?.toLowerCase().includes(q) ||
      tab.description.toLowerCase().includes(q) ||
      tab.id.toLowerCase().includes(q)
    );
  }, [navTabs, searchQuery, currentUser.role]);

  const handleTabClick = (tabId: MainTabType) => {
    onSelectTab(tabId);
    if (window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  if (activeTab === 'curriculum_server_landing' || activeTab === 'school_public_website') {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Side Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-950 border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'w-72 sm:w-80 lg:w-72'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-950/50 border border-emerald-400/30 shrink-0 overflow-hidden"
                style={{
                  background: brandProfile?.brandTheme?.primaryColor
                    ? `linear-gradient(135deg, ${brandProfile.brandTheme.primaryColor}, ${brandProfile.brandTheme.secondaryColor})`
                    : 'linear-gradient(135deg, #059669, #0f766e)'
                }}
              >
                {brandProfile?.crestLogoUrl ? (
                  <img src={brandProfile.crestLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <School className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm text-white tracking-tight truncate">
                  {brandProfile?.shortName || 'CurriculumFlow'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase truncate">
                  Academic OS • v2.6
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md border border-emerald-400/30 overflow-hidden"
                style={{
                  background: brandProfile?.brandTheme?.primaryColor
                    ? `linear-gradient(135deg, ${brandProfile.brandTheme.primaryColor}, ${brandProfile.brandTheme.secondaryColor})`
                    : 'linear-gradient(135deg, #059669, #0f766e)'
                }}
                title={brandProfile?.shortName || 'CurriculumFlow'}
              >
                <School className="w-5 h-5 text-white" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title={isCollapsed ? "Expand Navigation Drawer (Ctrl+B)" : "Collapse to Compact Rail (Ctrl+B)"}
              aria-label={isCollapsed ? "Expand Navigation Drawer" : "Collapse Navigation Drawer"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-emerald-400" /> : <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="flex lg:hidden items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar (Only in Expanded Mode) */}
        {!isCollapsed && (
          <div className="p-3 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules & features..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-4">
          {searchQuery.trim() ? (
            // Search Results View
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Modules</span>
                <span className="text-[10px] text-emerald-400">{filteredTabs.length} found</span>
              </div>

              {filteredTabs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No modules match "<span className="text-slate-300">{searchQuery}</span>"
                </div>
              ) : (
                filteredTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                          : 'text-slate-300 hover:bg-slate-900/90 hover:text-white border border-transparent hover:border-slate-800/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate">{tab.label}</span>
                          {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${tab.badgeColor || 'bg-emerald-500 text-slate-950'}`}>
                              {tab.badgeCount}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {tab.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // Categorized List
            categories.map(cat => {
              const catTabs = navTabs.filter(t => t.category === cat.key);
              const isCategoryCollapsed = !isCollapsed && collapsedCategories[cat.key];

              if (catTabs.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-1">
                  {/* Category Header */}
                  {!isCollapsed ? (
                    <button
                      onClick={() => toggleCategory(cat.key)}
                      className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-slate-400 hover:text-slate-200 transition-colors group"
                    >
                      <span className={`flex items-center gap-1.5 ${cat.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {cat.label}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                        isCategoryCollapsed ? '-rotate-90' : ''
                      }`} />
                    </button>
                  ) : (
                    <div className="w-full flex justify-center py-1">
                      <div className="w-6 h-[1px] bg-slate-800" />
                    </div>
                  )}

                  {/* Category Tabs */}
                  {(!isCategoryCollapsed || isCollapsed) && (
                    <div className="space-y-0.5">
                      {catTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        if (isCollapsed) {
                          // Compact Icon-Only Rail Mode
                          return (
                            <div key={tab.id} className="relative group flex justify-center">
                              <button
                                onClick={() => handleTabClick(tab.id)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                  isActive
                                    ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/40'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800'
                                }`}
                                aria-label={tab.label}
                              >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-emerald-400'}`} />
                                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
                                )}
                              </button>

                              {/* Floating Tooltip for Collapsed Mode */}
                              <div className="fixed left-20 ml-2 hidden group-hover:flex flex-col z-50 bg-slate-900 text-slate-100 text-xs rounded-lg p-2.5 shadow-2xl border border-slate-700 w-52 pointer-events-none transition-all">
                                <div className="flex items-center justify-between gap-1 font-bold text-white mb-0.5">
                                  <span>{tab.label}</span>
                                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white">
                                      {tab.badgeCount}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 leading-snug">
                                  {tab.description}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // Expanded Full-Item Mode
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all group ${
                              isActive
                                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent hover:border-slate-800/80'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                              isActive 
                                ? 'bg-white/20 text-white' 
                                : 'bg-slate-900 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-800'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold truncate">{tab.label}</span>
                                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${tab.badgeColor || 'bg-emerald-500 text-slate-950'}`}>
                                    {tab.badgeCount}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                {tab.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Bottom Actions & Advisor Shortcut */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-sm shrink-0 space-y-2">
          {!isCollapsed ? (
            <>
              {/* AI Curriculum Advisor Quick Button */}
              <button
                onClick={onOpenAdvisorModal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-950/70 to-teal-950/70 hover:from-emerald-900/80 hover:to-teal-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all shadow-md group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>AI Curriculum Advisor</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ask AI
                </span>
              </button>

              {/* Logged in User Bar */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.avatar}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {currentUser.title || currentUser.role}
                    </span>
                  </div>
                </div>
                {onOpenAuthModal && (
                  <button
                    onClick={onOpenAuthModal}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                    title="Open IAM & Security Portal"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onOpenAdvisorModal}
                className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center hover:bg-emerald-900/80 transition-colors"
                title="AI Curriculum Advisor"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
