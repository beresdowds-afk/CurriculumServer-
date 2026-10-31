import { MainTabType } from '../components/Navbar';
import { UserProfile, UserRole, PlatformViewMode } from '../types';

export type RouteCategory = 
  | 'saas_cloud' 
  | 'governance' 
  | 'operations' 
  | 'curriculum' 
  | 'assessment';

export type SupportedDomain = 'curriculumserver.com.ng' | 'curriculumflow.com.ng';

export interface InternalRouteDefinition {
  id: MainTabType;
  path: string;
  aliases?: string[];
  title: string;
  shortTitle: string;
  category: RouteCategory;
  categoryTitle: string;
  description: string;
  breadcrumbs: string[];
  domainScope: 'curriculum_server' | 'curriculum_flow' | 'both';
  isSuperAdminOnly?: boolean;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
  iconName?: string;
}

// Complete Master Mapping Table for Internal Router
export const ROUTE_REGISTRY: InternalRouteDefinition[] = [
  // -------------------------------------------------------------
  // 1. CURRICULUM SERVER CONTROL PLANE (curriculumserver.com.ng)
  // -------------------------------------------------------------
  {
    id: 'curriculum_server_landing',
    path: '/showcase',
    aliases: ['/', '/curriculum-server-landing', '/landing'],
    title: 'Curriculum Server (Public Showcase)',
    shortTitle: 'Public Showcase',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Public showcase, multi-tenant pricing calculator, and SaaS cloning architecture',
    breadcrumbs: ['Curriculum Server', 'Public Showcase'],
    domainScope: 'curriculum_server',
    requiresAuth: false
  },
  {
    id: 'docker_orchestration',
    path: '/docker-orchestrator',
    aliases: ['/docker', '/shards', '/containers'],
    title: 'Docker Tenant Orchestrator & Shards',
    shortTitle: 'Docker Orchestrator',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Phased container runtime, cgroup v2 resource limits & live shard migrations (Super Admin only)',
    breadcrumbs: ['Curriculum Server', 'Control Plane', 'Docker Orchestrator & Shards'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'tenant_control_center',
    path: '/control-plane-cockpit',
    aliases: ['/control-plane', '/infrastructure', '/cockpit'],
    title: 'Control Plane & Infrastructure Cockpit',
    shortTitle: 'Control Plane Cockpit',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Multi-tenant Docker runtime, PostgreSQL schemas, background queues & security boundaries (Super Admin only)',
    breadcrumbs: ['Curriculum Server', 'Control Plane', 'Infrastructure Cockpit'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'curriculum_server',
    path: '/saas-master',
    aliases: ['/cloning-engine', '/tenants-master'],
    title: 'Curriculum Server (SaaS Master)',
    shortTitle: 'SaaS Master',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Multi-tenant school cloning, license management & SaaS subscriptions (Super Admin only)',
    breadcrumbs: ['Curriculum Server', 'Control Plane', 'SaaS Master & Cloning Engine'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'pricing_management',
    path: '/pricing-offers-manager',
    aliases: ['/pricing-manager', '/product-offers', '/pricing', '/catalog-manager'],
    title: 'Product Offers & Pricing Management',
    shortTitle: 'Pricing & Offers Manager',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'SaaS subscription tiers, modular 4+1 bundles, add-on features, domain TLD rates & promo codes (Super Admin only)',
    breadcrumbs: ['Curriculum Server', 'Control Plane', 'Product Offers & Pricing Management'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'api_webhooks',
    path: '/api-webhooks-gateway',
    aliases: ['/api', '/webhooks', '/api-gateway'],
    title: 'REST API v1 & Webhooks Gateway',
    shortTitle: 'REST API & Webhooks',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'API endpoints, HMAC signed events & embeddable school website widgets (Super Admin only)',
    breadcrumbs: ['Curriculum Server', 'Control Plane', 'REST API & Webhooks Gateway'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'quality_assurance',
    path: '/quality-assurance',
    aliases: ['/qa', '/testing-suite'],
    title: 'Phase 8 Quality Assurance & Testing Suite',
    shortTitle: 'Quality Assurance',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Automated verification of NERDC curriculum, question banks, textbook generation engine & security',
    breadcrumbs: ['Curriculum Server', 'Quality Assurance & Automated Testing Suite'],
    domainScope: 'curriculum_server',
    isSuperAdminOnly: true,
    allowedRoles: ['super_admin'],
    requiresAuth: true
  },
  {
    id: 'export_governance',
    path: '/export-governance',
    aliases: ['/export', '/publishing', '/exports'],
    title: 'Phase 11 Export Governance & Web Publishing',
    shortTitle: 'Export & Publishing',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'Approved web publishing, secure document generation, cryptographic watermarks & encrypted database backups',
    breadcrumbs: ['Curriculum Server', 'Export Governance & Approved Web Publishing'],
    domainScope: 'curriculum_server',
    requiresAuth: true
  },
  {
    id: 'pilot_validation',
    path: '/pilot-validation',
    aliases: ['/pilot', '/validation', '/phase12'],
    title: 'Phase 12 Pilot Validation & End-to-End Audit',
    shortTitle: 'Pilot Validation',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'End-to-end pilot for authorized subjects using actual stored curriculum data, quality, answers, coverage, cost and performance.',
    breadcrumbs: ['Curriculum Server', 'Phase 12 Pilot Validation & End-to-End Audit'],
    domainScope: 'curriculum_server',
    requiresAuth: true
  },
  {
    id: 'domain_management',
    path: '/domains',
    aliases: ['/dns', '/domain-registrar'],
    title: 'Domain Registrar & DNS Governance',
    shortTitle: 'Domain Portal',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'NiRA registrar .sch.ng/.edu.ng/.ng registration, custom domains & DNS zones',
    breadcrumbs: ['Curriculum Server', 'Domain Governance', 'DNS & Registrar'],
    domainScope: 'both',
    requiresAuth: false
  },
  {
    id: 'customer_self_service',
    path: '/proprietor-portal',
    aliases: ['/self-service', '/subscription-billing'],
    title: 'Proprietor Self-Service Portal',
    shortTitle: 'Proprietor Portal',
    category: 'saas_cloud',
    categoryTitle: 'CURRICULUM SERVER (Control Plane)',
    description: 'School subscription management, modular add-on toggles & billing invoices',
    breadcrumbs: ['Curriculum Server', 'Self-Service', 'Proprietor Portal'],
    domainScope: 'both',
    requiresAuth: false
  },

  // -------------------------------------------------------------
  // 2. CURRICULUM FLOW - EXECUTIVE & GOVERNANCE (*.curriculumflow.com.ng)
  // -------------------------------------------------------------
  {
    id: 'school_public_website',
    path: '/school-portal',
    aliases: ['/public-website', '/admissions', '/home'],
    title: 'School Public Website & Admissions',
    shortTitle: 'Public Website',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Official school homepage, prospectus, admissions & public calendar',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Public Website & Admissions'],
    domainScope: 'curriculum_flow',
    requiresAuth: false
  },
  {
    id: 'command_center',
    path: '/command-center',
    aliases: ['/principal-cockpit', '/dashboard'],
    title: 'School Command Center (Principal)',
    shortTitle: 'Command Center',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Principal executive cockpit, real-time KPI matrix & institutional velocity',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Command Center'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'promotional_mock_exams',
    path: '/promotional-mock-exams',
    aliases: ['/mock-exams', '/promotion-council'],
    title: 'Promotional & Mock Exams Governance',
    shortTitle: 'Promotional Exams',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Promotion council cutoff thresholds, WAEC/NECO/BECE mock series & readiness',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Promotional & Mock Exams'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'principal_governance',
    path: '/principal-governance',
    aliases: ['/bundle-governance', '/module-licensing'],
    title: '4-Bundle Architecture Governance',
    shortTitle: 'Bundle Governance',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Principal feature governance, module entitlements & enterprise licensing',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Bundle Governance'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'iam_governance',
    path: '/iam-governance',
    aliases: ['/iam', '/rbac', '/access-control'],
    title: 'IAM & RBAC Governance',
    shortTitle: 'IAM & RBAC',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Principal super-admin hierarchy, multi-factor authentication & security audit logs',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'IAM & RBAC Governance'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'brand_management',
    path: '/brand-management',
    aliases: ['/branding', '/school-crest'],
    title: 'Brand & Crest Customizer',
    shortTitle: 'School Branding',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'School crest, motto, signature color schemes & document headers',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Brand & Crest'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'bursary_accounts',
    path: '/bursary-accounts',
    aliases: ['/bursary', '/billing', '/fees'],
    title: 'Bursary & Billing Accounts',
    shortTitle: 'Bursary & Accounts',
    category: 'governance',
    categoryTitle: 'EXECUTIVE & GOVERNANCE',
    description: 'Fee item configurations, parent billing schedules, Paystack/Opay PSP reconciliation',
    breadcrumbs: ['Curriculum Flow', 'Executive & Governance', 'Bursary & Billing'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },

  // -------------------------------------------------------------
  // 3. CURRICULUM FLOW - SCHOOL OPERATIONS & REGISTRY
  // -------------------------------------------------------------
  {
    id: 'user_onboarding',
    path: '/user-onboarding',
    aliases: ['/onboarding', '/batch-import'],
    title: 'User Onboarding & Batch Roster',
    shortTitle: 'User Onboarding',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'CSV bulk importer, parent-ward linkage & self-service credential dispatch',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'User Onboarding'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'user_profiles',
    path: '/staff-profiles',
    aliases: ['/faculty', '/teachers-directory'],
    title: 'Staff & Faculty Profiles',
    shortTitle: 'Staff Directory',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'TRCN accreditation, academic qualifications & teaching workload limits',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Staff Profiles'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'parent_database',
    path: '/parent-database',
    aliases: ['/parents', '/guardians'],
    title: 'Parent Database & Security Pickups',
    shortTitle: 'Parent Database',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Principal-supervised guardian registry, biometric verification & emergency codes',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Parent Database'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'academic_calendar',
    path: '/academic-calendar',
    aliases: ['/calendar', '/events', '/term-dates'],
    title: 'Academic Calendar & Term Dates',
    shortTitle: 'Academic Calendar',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: '3-Term structure, public holidays, examination weeks & resumption dates',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Academic Calendar'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'teacher_pool',
    path: '/teacher-pool',
    aliases: ['/subject-allocation', '/teacher-assignments'],
    title: 'Teacher Allocation Pool',
    shortTitle: 'Teacher Allocation',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Subject-to-teacher mapping, max period caps & automated workload balancing',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Teacher Allocation Pool'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'class_groups',
    path: '/class-groups',
    aliases: ['/classes', '/streams'],
    title: 'Class Groups & Streams',
    shortTitle: 'Class Groups',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'JSS1-SS3 arm assignments, form teachers, classroom allocations & capacity',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Class Groups & Streams'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'school_timetable',
    path: '/school-timetable',
    aliases: ['/timetable', '/schedule'],
    title: 'School Master Timetable',
    shortTitle: 'Master Timetable',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Conflict-free algorithmic scheduling, room allocations & lab period management',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Master Timetable'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'student_registers',
    path: '/student-registers',
    aliases: ['/students', '/roll-call'],
    title: 'Student Registers & Roll Call',
    shortTitle: 'Student Registers',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Morning & afternoon attendance registers, house teams & student profiles',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Student Registers'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'biometric_attendance',
    path: '/biometric-attendance',
    aliases: ['/biometrics', '/clock-in'],
    title: 'Biometric Clock-In & Leaves',
    shortTitle: 'Biometrics & Passes',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Facial recognition / fingerprint hardware sync, geo-fenced mobile & movement passes',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Biometric Attendance'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'logistics_support',
    path: '/logistics-support',
    aliases: ['/logistics', '/hostel', '/boarding', '/buses'],
    title: 'Logistics, Boarding & School Bus Suite',
    shortTitle: 'Logistics & Boarding',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Hostel dormitories, exeat passes, dining register & live bus GPS fleet geofence tracker',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Logistics & Boarding'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'teacher_dashboard',
    path: '/teacher-dashboard',
    aliases: ['/my-classes', '/teaching-portal'],
    title: 'Teacher Teaching Portal',
    shortTitle: 'Teacher Portal',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Daily lesson delivery, quick CA scoring, attendance taking & scheme of work tracker',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Teacher Portal'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'admin_assistant_dashboard',
    path: '/admin-assistant-dashboard',
    aliases: ['/registry-desk', 'assistant-portal'],
    title: 'Administrative Assistant Registry',
    shortTitle: 'Admin Assistant',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Principal executive memos, visitor badge logs, transcript requests & relief teacher assignments',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Admin Assistant Registry'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'student_dashboard',
    path: '/student-dashboard',
    aliases: ['/student-portal', '/my-assignments'],
    title: 'Student Self-Service Portal',
    shortTitle: 'Student Portal',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Subject syllabus completion, homework submission, timetable & CBT quiz practice',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Student Portal'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'parent_dashboard',
    path: '/parent-dashboard',
    aliases: ['/parent-portal', '/my-wards'],
    title: 'Parent & Guardian Portal',
    shortTitle: 'Parent Portal',
    category: 'operations',
    categoryTitle: 'SCHOOL OPERATIONS & REGISTRY',
    description: 'Ward performance tracker, live attendance push alerts, fee invoices & pickup passes',
    breadcrumbs: ['Curriculum Flow', 'Operations & Registry', 'Parent Portal'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },

  // -------------------------------------------------------------
  // 4. CURRICULUM FLOW - CURRICULUM & PEDAGOGY
  // -------------------------------------------------------------
  {
    id: 'curriculum_source',
    path: '/curriculum-source',
    aliases: ['/nerdc-curriculum', '/schemes-of-work'],
    title: 'NERDC Curriculum Source of Truth',
    shortTitle: 'NERDC Curriculum',
    category: 'curriculum',
    categoryTitle: 'CURRICULUM & PEDAGOGY',
    description: 'Official Nigerian national curriculum database with bloom taxonomy & weekly themes',
    breadcrumbs: ['Curriculum Flow', 'Curriculum & Pedagogy', 'NERDC Source of Truth'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'lesson_chain',
    path: '/lesson-chain',
    aliases: ['/lesson-plans', '/approval-chain'],
    title: 'Lesson Plan Approval Chain',
    shortTitle: 'Lesson Plans',
    category: 'curriculum',
    categoryTitle: 'CURRICULUM & PEDAGOGY',
    description: 'Multi-stage workflow (Draft -> HOD -> VP Academic -> Principal) with auto-fill',
    breadcrumbs: ['Curriculum Flow', 'Curriculum & Pedagogy', 'Lesson Plan Approval Chain'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'delivery_tracking',
    path: '/delivery-tracking',
    aliases: ['/syllabus-coverage', '/teaching-tracker'],
    title: 'Teacher Delivery Tracker',
    shortTitle: 'Delivery Tracker',
    category: 'curriculum',
    categoryTitle: 'CURRICULUM & PEDAGOGY',
    description: 'Real-time syllabus completion pacing vs school calendar with delay alerts',
    breadcrumbs: ['Curriculum Flow', 'Curriculum & Pedagogy', 'Teacher Delivery Tracker'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'adaptive_remedial',
    path: '/adaptive-remedial',
    aliases: ['/remedials', '/interventions'],
    title: 'Adaptive Remedial Engine',
    shortTitle: 'Remedial Engine',
    category: 'curriculum',
    categoryTitle: 'CURRICULUM & PEDAGOGY',
    description: 'Targeted remediation plans triggered by assessment deficits with printable worksheets',
    breadcrumbs: ['Curriculum Flow', 'Curriculum & Pedagogy', 'Adaptive Remedial Engine'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },

  // -------------------------------------------------------------
  // 5. CURRICULUM FLOW - ASSESSMENT & ANALYTICS
  // -------------------------------------------------------------
  {
    id: 'question_bank',
    path: '/question-bank',
    aliases: ['/cbt-generator', '/questions'],
    title: 'Question Bank & CBT Generator',
    shortTitle: 'Question Bank',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'Curriculum-aligned question repository (WAEC, NECO, BECE, JAMB) with CBT generator',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Question Bank & CBT'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'secure_exams',
    path: '/secure-exams',
    aliases: ['/exam-lock', '/marking-schemes'],
    title: 'Secure Exam Management',
    shortTitle: 'Secure Exams',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'Cryptographic exam generation, separated marking schemes & principal lock',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Secure Exam Management'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'taught_assessment',
    path: '/taught-assessment',
    aliases: ['/taught-curriculum-quiz', '/fair-assessments'],
    title: 'Taught Assessment Engine',
    shortTitle: 'Taught Assessment',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'Ensures questions test strictly delivered and verified topics with zero leakage',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Taught Assessment Engine'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'academic_analytics',
    path: '/academic-analytics',
    aliases: ['/analytics', '/student-mastery', '/class-trends'],
    title: 'Academic Performance Analytics',
    shortTitle: 'Academic Analytics',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'Curriculum velocity, teacher completion rates, longitudinal class trends & student topic mastery',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Performance Analytics'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'academic_records',
    path: '/academic-records',
    aliases: ['/broadsheets', '/gradebooks', '/ca-scores'],
    title: 'Academic Records & Broadsheets',
    shortTitle: 'Broadsheets & CA',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'Continuous Assessment scoring, class broadsheets, principal endorsement & RLS security',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Broadsheets & Scores'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  },
  {
    id: 'report_card_studio',
    path: '/report-card-studio',
    aliases: ['/report-cards', '/term-results'],
    title: 'Terminal Report Card Studio',
    shortTitle: 'Report Cards',
    category: 'assessment',
    categoryTitle: 'ASSESSMENT & ANALYTICS',
    description: 'NERDC-compliant terminal report cards, affective & psychomotor ratings, principal signature seal & PDF export',
    breadcrumbs: ['Curriculum Flow', 'Assessment & Analytics', 'Report Card Studio'],
    domainScope: 'curriculum_flow',
    requiresAuth: true
  }
];

// Map lookup by Tab ID
export const ROUTE_BY_ID = new Map<MainTabType, InternalRouteDefinition>(
  ROUTE_REGISTRY.map(route => [route.id, route])
);

// Map lookup by Clean Normalized Path with robust hyphen/underscore and alias handling
export const ROUTE_BY_PATH = new Map<string, InternalRouteDefinition>();
ROUTE_REGISTRY.forEach(route => {
  ROUTE_BY_PATH.set(route.path.toLowerCase(), route);
  
  // Register route ID variations (underscores, hyphens, direct)
  const idStr = route.id.toLowerCase();
  const idHyphen = idStr.replace(/_/g, '-');
  const idUnderscore = idStr.replace(/-/g, '_');
  
  ROUTE_BY_PATH.set(`/${idStr}`, route);
  ROUTE_BY_PATH.set(`/${idHyphen}`, route);
  ROUTE_BY_PATH.set(`/${idUnderscore}`, route);

  if (route.aliases) {
    route.aliases.forEach(alias => {
      const cleanAlias = alias.toLowerCase();
      ROUTE_BY_PATH.set(cleanAlias, route);
      ROUTE_BY_PATH.set(cleanAlias.replace(/_/g, '-'), route);
      ROUTE_BY_PATH.set(cleanAlias.replace(/-/g, '_'), route);
    });
  }
});

// Helper: Normalize URL string
export function normalizePath(pathOrHash: string): string {
  let cleaned = pathOrHash.trim();
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('/#/')) {
    cleaned = cleaned.substring(2);
  }
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  // Strip trailing slash except root
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  // Strip query params if any
  const queryIndex = cleaned.indexOf('?');
  if (queryIndex !== -1) {
    cleaned = cleaned.substring(0, queryIndex);
  }
  return cleaned.toLowerCase();
}

/**
 * Resolve target tab from active URL hash or path with domain and RBAC enforcement
 */
export function resolveTabFromUrl(
  pathOrHash: string, 
  currentUser: UserProfile, 
  domain: SupportedDomain
): { targetTab: MainTabType; redirected: boolean; reason?: string } {
  const norm = normalizePath(pathOrHash);

  // Direct root path ('/' or empty) domain routing
  if (norm === '/' || norm === '') {
    if (domain === 'curriculumflow.com.ng') {
      return { targetTab: 'school_public_website', redirected: false };
    } else {
      return { 
        targetTab: currentUser.role === 'super_admin' ? 'tenant_control_center' : 'curriculum_server_landing', 
        redirected: false 
      };
    }
  }

  const matchedRoute = ROUTE_BY_PATH.get(norm);

  // Default fallback tab by domain
  const defaultTab: MainTabType = 
    domain === 'curriculumserver.com.ng' 
      ? (currentUser.role === 'super_admin' ? 'tenant_control_center' : 'curriculum_server_landing')
      : 'school_public_website';

  if (!matchedRoute) {
    return { targetTab: defaultTab, redirected: false };
  }

  // Domain access rule enforcement:
  // 1. If on curriculumflow.com.ng domain, cannot access pure curriculum_server control plane pages
  if (domain === 'curriculumflow.com.ng' && matchedRoute.domainScope === 'curriculum_server') {
    return { 
      targetTab: 'school_public_website', 
      redirected: true, 
      reason: 'Curriculum Server control plane is not accessible on school instances' 
    };
  }

  // 2. If on curriculumserver.com.ng domain and visitor is not super_admin, public visitors cannot access Curriculum Flow school pages
  if (domain === 'curriculumserver.com.ng' && currentUser.role !== 'super_admin' && matchedRoute.domainScope === 'curriculum_flow') {
    return {
      targetTab: 'curriculum_server_landing',
      redirected: true,
      reason: 'Curriculum Flow school instances require navigating via a school domain or signing in'
    };
  }

  // 3. Super Admin Only pages restriction
  if (matchedRoute.isSuperAdminOnly && currentUser.role !== 'super_admin') {
    return {
      targetTab: domain === 'curriculumserver.com.ng' ? 'curriculum_server_landing' : 'school_public_website',
      redirected: true,
      reason: 'This section is restricted to Platform Super Administrators'
    };
  }

  return { targetTab: matchedRoute.id, redirected: false };
}

/**
 * Check if the active user can access a given tab on the active domain
 */
export function canUserAccessTab(
  tab: MainTabType, 
  currentUser: UserProfile, 
  domain: SupportedDomain
): { allowed: boolean; reason?: string } {
  const route = ROUTE_BY_ID.get(tab);
  if (!route) return { allowed: true };

  if (route.isSuperAdminOnly && currentUser.role !== 'super_admin') {
    return { allowed: false, reason: 'Requires Super Admin privileges' };
  }

  if (domain === 'curriculumflow.com.ng' && route.domainScope === 'curriculum_server' && currentUser.role !== 'super_admin') {
    return { allowed: false, reason: 'Curriculum Server control plane is isolated from school instances' };
  }

  if (domain === 'curriculumserver.com.ng' && route.domainScope === 'curriculum_flow' && currentUser.role !== 'super_admin') {
    return { allowed: false, reason: 'Switch to a Curriculum Flow school domain to access operational modules' };
  }

  return { allowed: true };
}

/**
 * Get route URL string for a tab
 */
export function getRoutePathForTab(tab: MainTabType): string {
  const route = ROUTE_BY_ID.get(tab);
  return route ? route.path : '/';
}

/**
 * Navigate to tab with browser hash sync
 */
export function navigateToTab(tab: MainTabType, replace = false): void {
  const path = getRoutePathForTab(tab);
  const targetHash = `#${path}`;
  
  if (typeof window !== 'undefined') {
    if (replace) {
      window.history.replaceState(null, '', targetHash);
    } else if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
  }
}

/**
 * Normalizes and extracts clean hostname without port numbers
 */
export function normalizeHostname(rawHostname?: string): string {
  if (!rawHostname) return '';
  let cleaned = rawHostname.trim().toLowerCase();
  // Remove port if present (e.g. localhost:3000 -> localhost)
  const colonIndex = cleaned.indexOf(':');
  if (colonIndex !== -1) {
    cleaned = cleaned.substring(0, colonIndex);
  }
  return cleaned;
}

/**
 * Determines domain strictly using exact hostname matching.
 * - 'curriculumflow.com.ng' / 'www.curriculumflow.com.ng' -> 'curriculumflow.com.ng'
 * - 'curriculumserver.com.ng' / 'www.curriculumserver.com.ng' -> 'curriculumserver.com.ng'
 * - Fallback: preserves default/development behavior ('curriculumserver.com.ng')
 */
export function detectDomainFromHostname(hostname?: string): SupportedDomain {
  const raw = hostname ?? (typeof window !== 'undefined' ? window.location?.hostname : '');
  const clean = normalizeHostname(raw);

  if (
    clean === 'curriculumflow.com.ng' || 
    clean === 'www.curriculumflow.com.ng' ||
    clean.endsWith('.curriculumflow.com.ng') ||
    clean.endsWith('.curriculumflow.com')
  ) {
    return 'curriculumflow.com.ng';
  }

  if (
    clean === 'curriculumserver.com.ng' || 
    clean === 'www.curriculumserver.com.ng' ||
    clean.endsWith('.curriculumserver.com.ng') ||
    clean.endsWith('.curriculumserver.ng')
  ) {
    return 'curriculumserver.com.ng';
  }

  // Development / Preview fallback (e.g. localhost, cloud run, etc.)
  return 'curriculumserver.com.ng';
}

/**
 * Returns the matching initial PlatformViewMode based on domain
 */
export function getInitialPlatformMode(domain: SupportedDomain): PlatformViewMode {
  return domain === 'curriculumserver.com.ng' ? 'saas_master_console' : 'tenant_school_instance';
}

export interface DomainMetadataConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
}

export const DOMAIN_METADATA: Record<SupportedDomain, DomainMetadataConfig> = {
  'curriculumflow.com.ng': {
    title: 'CurriculumFlow - School & Academic Management System',
    description: 'Curriculum-driven AI academic management, lesson tracking, master timetable, student registers, secure exams, and biometric attendance.',
    canonicalUrl: 'https://curriculumflow.com.ng',
    ogTitle: 'CurriculumFlow - Academic & School Management',
    ogDescription: 'Curriculum-driven AI academic management, lesson delivery tracking, timetable, and biometric monitoring for schools.'
  },
  'curriculumserver.com.ng': {
    title: 'Curriculum Server - Sovereign Multi-Tenant Educational SaaS Platform',
    description: 'Multi-tenant educational SaaS control plane, Docker tenant orchestrator, sharded PostgreSQL schemas, and NERDC curriculum distribution for Nigerian institutions.',
    canonicalUrl: 'https://curriculumserver.com.ng',
    ogTitle: 'Curriculum Server - Multi-Tenant Educational Cloud',
    ogDescription: 'SaaS control plane, tenant provisioning engine, and automated curriculum distribution infrastructure.'
  }
};

/**
 * Updates DOM document title, canonical link, and meta description according to active domain
 */
export function updateDocumentMetadata(domain: SupportedDomain, activeTabTitle?: string): void {
  if (typeof document === 'undefined') return;

  const meta = DOMAIN_METADATA[domain] || DOMAIN_METADATA['curriculumserver.com.ng'];
  const fullTitle = activeTabTitle && activeTabTitle !== 'Public Showcase' && activeTabTitle !== 'School Public Website & Admissions'
    ? `${activeTabTitle} | ${domain === 'curriculumserver.com.ng' ? 'Curriculum Server' : 'CurriculumFlow'}`
    : meta.title;

  document.title = fullTitle;

  // Description meta
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', meta.description);
  }

  // Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', meta.canonicalUrl);

  // Open Graph Title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.ogTitle);

  // Open Graph Description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.ogDescription);

  // Open Graph URL
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', meta.canonicalUrl);
}

