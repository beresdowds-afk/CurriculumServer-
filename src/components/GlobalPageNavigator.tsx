import React, { useState, useEffect, useMemo } from 'react';
import { MainTabType } from './Navbar';
import { UserProfile, SchoolBrandProfile, TenantSchoolApp } from '../types';
import {
  Search,
  Compass,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Command,
  Grid,
  Layers,
  Server,
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle2,
  Globe,
  FileCheck2,
  Calendar,
  Lock,
  BarChart3,
  CreditCard,
  UserCheck,
  Palette,
  ScanFace,
  ClipboardList,
  CalendarDays,
  Cpu,
  Code,
  Sliders,
  UserPlus
} from 'lucide-react';

export interface PageNavigationDomain {
  key: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  badgeColor: string;
  pages: {
    id: MainTabType;
    title: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    isCore?: boolean;
    allowedRoles?: string[];
  }[];
}

export const ALL_PROJECT_DOMAINS: PageNavigationDomain[] = [
  {
    key: 'saas_cloud',
    name: 'SaaS Cloud & Multi-Tenant Infrastructure',
    shortName: 'SaaS Cloud',
    icon: Server,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pages: [
      {
        id: 'curriculum_server_landing',
        title: 'Curriculum Server Showcase',
        description: 'Multi-tenant showcase landing, pricing calculator & deployment architecture',
        icon: Globe,
        isCore: true
      },
      {
        id: 'curriculum_server',
        title: 'Curriculum Server Master',
        description: 'Multi-tenant school cloning engine, tenant health & lease-to-own billing',
        icon: Server,
        isCore: true
      },
      {
        id: 'tenant_control_center',
        title: 'Control Plane Cockpit',
        description: 'Docker runtime clusters, Spanner schemas & resource allocation policies',
        icon: Cpu
      },
      {
        id: 'customer_self_service',
        title: 'Proprietor Self-Service Portal',
        description: 'Tenant self-service license tier upgrades, billing invoices & add-ons',
        icon: Building2
      },
      {
        id: 'domain_management',
        title: 'Domain Registrar & DNS Portal',
        description: 'NiRA .sch.ng / .edu.ng registration, SSL certificates & DNS zone editor',
        icon: Globe
      },
      {
        id: 'api_webhooks',
        title: 'REST API & Webhooks Gateway',
        description: 'REST v1 endpoints, cryptographic HMAC webhook events & embed widgets',
        icon: Code
      }
    ]
  },
  {
    key: 'governance',
    name: 'Executive Governance & Principal Command',
    shortName: 'Governance',
    icon: ShieldCheck,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    pages: [
      {
        id: 'command_center',
        title: 'School Command Center',
        description: 'Principal executive cockpit, NERDC velocity KPIs & institutional approvals',
        icon: ShieldCheck,
        isCore: true
      },
      {
        id: 'principal_governance',
        title: '4-Bundle Architecture Governance',
        description: 'Principal feature governance, module entitlements & enterprise licensing',
        icon: Sliders
      },
      {
        id: 'iam_governance',
        title: 'Office of Principal (IAM)',
        description: 'Principal identity governance, Google SSO, MFA & delegated permissions',
        icon: Lock
      },
      {
        id: 'user_onboarding',
        title: 'User & Student Onboarding Suite',
        description: 'Principal creation flows for faculty, students, parents & CSV ingestion',
        icon: UserPlus
      },
      {
        id: 'user_profiles',
        title: 'Institutional Directory Profiles',
        description: 'Faculty, student and administrative institutional credential profiles',
        icon: Users
      },
      {
        id: 'brand_management',
        title: 'School Brand & Whitelabel',
        description: 'School crest, theme colors, report card watermark & domain identity',
        icon: Palette
      }
    ]
  },
  {
    key: 'operations',
    name: 'Instructional & Administrative Operations',
    shortName: 'Operations',
    icon: Building2,
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    pages: [
      {
        id: 'teacher_dashboard',
        title: 'Teacher Command Dashboard',
        description: 'Class rosters, roll call, lesson notes submission & continuous assessment',
        icon: BookOpen,
        isCore: true
      },
      {
        id: 'admin_assistant_dashboard',
        title: 'Admin Assistant Registry Desk',
        description: 'Executive memos, front-office visitor passes, relief allocation & transcripts',
        icon: Building2,
        isCore: true
      },
      {
        id: 'teacher_pool',
        title: 'Faculty Pool & Teacher Allocation',
        description: 'Faculty workload capacity, subject specializations & period quotas',
        icon: Users
      },
      {
        id: 'class_groups',
        title: 'Class Groups Database',
        description: 'Class arms, student capacity, arm masters & class leadership dockets',
        icon: Layers
      },
      {
        id: 'school_timetable',
        title: 'School Master Timetable',
        description: 'Institutional master timetable, lab periods, clashes & bell schedules',
        icon: Calendar
      },
      {
        id: 'student_registers',
        title: 'Student & Class Registers',
        description: 'Daily roll call, RFID biometric gate sync & daily absence tracking',
        icon: ClipboardList
      },
      {
        id: 'academic_records',
        title: 'Academic Records & Broadsheets',
        description: 'Continuous assessment records, terminal broadsheets & WAEC credentials',
        icon: GraduationCap
      },
      {
        id: 'biometric_attendance',
        title: 'Biometric & Movement Gate Log',
        description: 'RFID smart-card tap records, movement permits & terminal arrival metrics',
        icon: ScanFace
      },
      {
        id: 'academic_calendar',
        title: 'Academic Calendar & Events',
        description: 'Term schedules, mid-term breaks, examination windows & public holidays',
        icon: CalendarDays
      }
    ]
  },
  {
    key: 'portals',
    name: 'Student & Parent Portals (RLS Guarded)',
    shortName: 'Student & Parent',
    icon: GraduationCap,
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    pages: [
      {
        id: 'student_dashboard',
        title: 'Student Learning OS Dashboard',
        description: 'Personal timetable, assignments due, live performance, e-library & queries',
        icon: GraduationCap,
        isCore: true
      },
      {
        id: 'parent_dashboard',
        title: 'Parent & Guardian Supervision Portal',
        description: 'Multi-ward switching, term broadsheets, online fee payment & gate QR passes',
        icon: Users,
        isCore: true
      },
      {
        id: 'parent_database',
        title: 'Supervised Parents DB & Ward Mapping',
        description: 'Principal-supervised parent records, emergency contacts & pickup verification',
        icon: UserCheck
      }
    ]
  },
  {
    key: 'curriculum',
    name: 'Curriculum Engine & Pedagogical Flow',
    shortName: 'Curriculum',
    icon: BookOpen,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pages: [
      {
        id: 'curriculum_source',
        title: 'Curriculum Authority (NERDC)',
        description: 'Standard national curriculum modules, behavioral objectives & themes',
        icon: BookOpen,
        isCore: true
      },
      {
        id: 'lesson_chain',
        title: 'Lesson Planning & Review Chain',
        description: 'AI lesson synthesis, coordinator review & principal approval workflow',
        icon: FileCheck2
      },
      {
        id: 'delivery_tracking',
        title: 'Teacher Delivery Tracker',
        description: 'Syllabus velocity tracking, classroom period completion & audit logs',
        icon: Calendar
      },
      {
        id: 'adaptive_remedial',
        title: 'Adaptive Remedial Engine',
        description: 'AI diagnostic gap analysis, personalized remedial exercises & re-assessment',
        icon: Sparkles
      }
    ]
  },
  {
    key: 'assessment',
    name: 'Assessment, CBT Exams & Analytics',
    shortName: 'Assessment',
    icon: Lock,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    pages: [
      {
        id: 'question_bank',
        title: 'Question Bank & Cognitive Variants',
        description: "Bloom's taxonomy questions, CBT variants & secure item repositories",
        icon: Layers
      },
      {
        id: 'secure_exams',
        title: 'Secure Exam Paper & Marking Vault',
        description: 'Encrypted exam papers, automated marking schemes & CBT proctoring',
        icon: Lock,
        isCore: true
      },
      {
        id: 'taught_assessment',
        title: 'Taught-Only Assessments Engine',
        description: 'Curriculum delivery validation ensuring tests only cover taught topics',
        icon: CheckCircle2
      },
      {
        id: 'academic_analytics',
        title: 'Academic Analytics & Mastery',
        description: 'Cohort performance distributions, teacher velocity & topic heatmaps',
        icon: BarChart3
      }
    ]
  },
  {
    key: 'finance',
    name: 'Bursary, Billing & Financial Operations',
    shortName: 'Bursary & Accounts',
    icon: CreditCard,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pages: [
      {
        id: 'bursary_accounts',
        title: 'Bursary, Accounts & PSP Settlement',
        description: 'Fee schedules, student ledgers, Paystack/Flutterwave split settlement & receipt ledger',
        icon: CreditCard,
        isCore: true
      }
    ]
  }
];

interface GlobalPageNavigatorProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
}

export const GlobalPageNavigator: React.FC<GlobalPageNavigatorProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  brandProfile,
  activeTenant
}) => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [historyTrail, setHistoryTrail] = useState<MainTabType[]>([activeTab]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync navigation history
  useEffect(() => {
    if (historyTrail[historyIndex] !== activeTab) {
      const newTrail = historyTrail.slice(0, historyIndex + 1);
      newTrail.push(activeTab);
      setHistoryTrail(newTrail);
      setHistoryIndex(newTrail.length - 1);
    }
    // Sync browser URL hash
    window.location.hash = `#/${activeTab}`;
  }, [activeTab]);

  // Global Keyboard shortcuts: Ctrl+K / Cmd+K for Command Palette, Alt+Left/Right for history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleHistoryBack();
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleHistoryForward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyTrail]);

  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const prevTab = historyTrail[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onSelectTab(prevTab);
    }
  };

  const handleHistoryForward = () => {
    if (historyIndex < historyTrail.length - 1) {
      const nextTab = historyTrail[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onSelectTab(nextTab);
    }
  };

  // Find active page & domain
  const activePageInfo = useMemo(() => {
    for (const domain of ALL_PROJECT_DOMAINS) {
      const page = domain.pages.find(p => p.id === activeTab);
      if (page) {
        return {
          domain,
          page
        };
      }
    }
    return {
      domain: ALL_PROJECT_DOMAINS[1],
      page: ALL_PROJECT_DOMAINS[1].pages[0]
    };
  }, [activeTab]);

  return (
    <>
      {/* =========================================================================
          UNIVERSAL SECONDARY SUB-HEADER / PAGE NAVIGATION BAR
         ========================================================================= */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 sticky top-14 z-20 shadow-md">
        
        {/* Left: History Prev/Next + Current Location Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {/* History Back/Forward */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={handleHistoryBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
              title="Navigate Back (Alt + Left)"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleHistoryForward}
              disabled={historyIndex >= historyTrail.length - 1}
              className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
              title="Navigate Forward (Alt + Right)"
              aria-label="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Breadcrumb Path Pill */}
          <div className="flex items-center gap-1.5 min-w-0 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-semibold hidden md:inline truncate">
              {activePageInfo.domain.name}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden md:inline shrink-0" />
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 truncate">
              <activePageInfo.page.icon className="w-3.5 h-3.5 shrink-0" />
              {activePageInfo.page.title}
            </span>
          </div>
        </div>

        {/* Middle / Right: Domain Quick Jump Chips & Global Search Palette Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Quick Domain Pills (Desktop View) */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            {ALL_PROJECT_DOMAINS.map(domain => {
              const Icon = domain.icon;
              const isDomainActive = domain.key === activePageInfo.domain.key;
              return (
                <button
                  key={domain.key}
                  onClick={() => onSelectTab(domain.pages[0].id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                    isDomainActive
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={`Jump to ${domain.name}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{domain.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Jump Search Palette Button (Ctrl+K) */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm group"
            title="Quick Jump / Omni Search (Ctrl+K or Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Jump to Page</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 font-bold">
              ⌘K
            </kbd>
          </button>

          {/* All Pages Route Map / Directory Modal Button */}
          <button
            onClick={() => setIsDirectoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Open Complete Project Site Map & Directory"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Site Map</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          COMMAND / QUICK JUMP SEARCH MODAL (Ctrl + K)
         ========================================================================= */}
      {isCommandOpen && (
        <CommandPaletteModal
          isOpen={isCommandOpen}
          onClose={() => setIsCommandOpen(false)}
          onSelectPage={(tab) => {
            onSelectTab(tab);
            setIsCommandOpen(false);
          }}
          activeTab={activeTab}
        />
      )}

      {/* =========================================================================
          ALL PAGES SITE MAP & DIRECTORY MODAL
         ========================================================================= */}
      {isDirectoryOpen && (
        <AllPagesDirectoryModal
          isOpen={isDirectoryOpen}
          onClose={() => setIsDirectoryOpen(false)}
          onSelectPage={(tab) => {
            onSelectTab(tab);
            setIsDirectoryOpen(false);
          }}
          activeTab={activeTab}
          currentUser={currentUser}
        />
      )}

      {/* =========================================================================
          MOBILE BOTTOM QUICK NAVIGATION BAR (Fixed at bottom on phones)
         ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-800 px-3 py-2 flex items-center justify-around text-slate-400 shadow-2xl backdrop-blur-lg">
        {[
          { id: 'command_center', label: 'Command', icon: ShieldCheck },
          { id: 'teacher_dashboard', label: 'Teacher', icon: BookOpen },
          { id: 'student_dashboard', label: 'Student', icon: GraduationCap },
          { id: 'parent_dashboard', label: 'Parent', icon: Users },
          { id: 'curriculum_server', label: 'SaaS Cloud', icon: Server }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as any)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                isActive
                  ? 'text-emerald-400 font-extrabold scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsDirectoryOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-300"
        >
          <Grid className="w-4 h-4 text-emerald-400" />
          <span>All Pages</span>
        </button>
      </div>
    </>
  );
};

// -------------------------------------------------------------
// COMMAND PALETTE SEARCH MODAL (Ctrl + K)
// -------------------------------------------------------------
interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (tab: MainTabType) => void;
  activeTab: MainTabType;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  activeTab
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  // Flatten all pages for fuzzy searching
  const allPages = ALL_PROJECT_DOMAINS.flatMap(d =>
    d.pages.map(p => ({
      ...p,
      domainName: d.name,
      domainBadgeColor: d.badgeColor
    }))
  );

  const filteredPages = allPages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.domainName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-md p-4 pt-16 sm:pt-24">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type page name, module, or keyword (e.g., student, timetable, exam, bursary)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400 font-bold shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredPages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching pages found for "{search}". Try searching for <span className="text-emerald-400">Teacher</span>, <span className="text-teal-400">Student</span>, <span className="text-purple-400">Governance</span>, or <span className="text-sky-400">Timetable</span>.
            </div>
          ) : (
            filteredPages.map(page => {
              const Icon = page.icon;
              const isActive = activeTab === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-emerald-950/90 border border-emerald-700/60 text-white font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{page.title}</span>
                        {page.isCore && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Core
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                        {page.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 bg-slate-950 rounded-md shrink-0 ml-2 hidden sm:inline">
                    {page.domainName.split(' ')[0]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with 1-click or arrows</span>
          <span>CurriculumFlow & SaaS Master Directory</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// ALL PAGES SITE MAP & DIRECTORY MODAL
// -------------------------------------------------------------
interface AllPagesDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (tab: MainTabType) => void;
  activeTab: MainTabType;
  currentUser: UserProfile;
}

export const AllPagesDirectoryModal: React.FC<AllPagesDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  activeTab,
  currentUser
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden text-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Universal Site Map & Page Directory</h2>
              <p className="text-xs text-slate-400">
                Explore and instantly navigate all 25+ functional modules across CurriculumFlow.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Grouped Domains */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {ALL_PROJECT_DOMAINS.map(domain => {
            const DomainIcon = domain.icon;
            return (
              <div key={domain.key} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <DomainIcon className="w-4 h-4 text-emerald-400" />
                  <span>{domain.name}</span>
                  <span className="text-[10px] text-slate-500 font-normal">({domain.pages.length} pages)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {domain.pages.map(page => {
                    const PageIcon = page.icon;
                    const isActive = activeTab === page.id;
                    return (
                      <div
                        key={page.id}
                        onClick={() => onSelectPage(page.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                          isActive
                            ? 'bg-emerald-950/80 border-emerald-600 ring-1 ring-emerald-500/50 shadow-lg text-white'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-xl ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-slate-800 text-emerald-400 group-hover:text-white group-hover:bg-emerald-600 transition-colors'}`}>
                              <PageIcon className="w-4 h-4" />
                            </div>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-slate-950">
                                Current Page
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                            {page.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1 font-medium">
                            {page.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{domain.shortName}</span>
                          <span className="text-emerald-400 font-bold group-hover:underline">Launch →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Logged in as: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
