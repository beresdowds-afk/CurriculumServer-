import { 
  CurriculumFlowBundle, 
  CurriculumFlowBundleKey, 
  CurriculumFlowBundleFeature,
  BundleUpgradeRequest 
} from '../types';

export const CURRICULUM_FLOW_BUNDLES: CurriculumFlowBundle[] = [
  {
    key: 'administration',
    name: 'Administration Suite',
    shortName: 'Administration',
    tagline: 'Student, Staff, Attendance & Biometric Punctuality Operations',
    description: 'Comprehensive institutional administration engine managing student bio-data registers, TRCN staff credentials, daily roll calls, and hardware-synced biometric punctuality tracking.',
    monthlyPriceNGN: 75000,
    yearlyPriceNGN: 750000,
    color: 'from-indigo-600 to-blue-700',
    bgColor: 'bg-indigo-950/40',
    borderColor: 'border-indigo-500/30',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    iconName: 'Users',
    features: [
      {
        id: 'feat_admin_student_record',
        key: 'student_record',
        bundleKey: 'administration',
        name: 'Student Record',
        description: 'Complete student lifecycle registry, admissions bio-data, class rosters, digital student ID cards, and guardian ward mappings.',
        subItems: [
          'Unified Bio-data & Enrollment History',
          'Class Arm Roster & Capacity Tracking',
          'Supervised Parent & Guardian Linking',
          'Medical Profiles & Emergency Contacts',
          'Digital Student ID Card Generation'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Users'
      },
      {
        id: 'feat_admin_staff_record',
        key: 'staff_record',
        bundleKey: 'administration',
        name: 'Staff Record',
        description: 'Faculty and non-teaching personnel database, TRCN registration numbers, subject allocations, and IAM governance roles.',
        subItems: [
          'TRCN Certification & Qualifications',
          'Subject Teacher & Form Master Mapping',
          'Workload & Teaching Period Allocations',
          'Office of Principal IAM Administrative Roles',
          'MFA Security & Session Management'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'UserCheck'
      },
      {
        id: 'feat_admin_attendance',
        key: 'attendance',
        bundleKey: 'administration',
        name: 'Attendance',
        description: 'Class registers, morning roll call, subject-level session attendance, and termly aggregate attendance percentages.',
        subItems: [
          'Daily Morning & Afternoon Roll Calls',
          'Subject-by-Subject Session Logging',
          'Termly Aggregate Attendance % on Broadsheets',
          'Absence Reason & Medical Leave Approvals',
          'Parent Instant Attendance Notifications'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'ClipboardList'
      },
      {
        id: 'feat_admin_punctuality',
        key: 'punctuality',
        bundleKey: 'administration',
        name: 'Punctuality',
        description: 'Biometric and RFID turnstile clock-ins, late-arrival scorecards, movement gate passes, and perimeter security logs.',
        subItems: [
          'Biometric Facial & RFID Gate Time Tracking',
          'Late Arrival & Early Departure Scorecards',
          'Digital Gate Exit & Movement Passes',
          'Perimeter Gate Security & Pickup Authorization',
          'Staff & Student Punctuality Indices'
        ],
        defaultEnabled: true,
        isCore: false,
        iconName: 'ScanFace'
      }
    ]
  },
  {
    key: 'teaching',
    name: 'Teaching Suite',
    shortName: 'Teaching',
    tagline: 'Lesson Planning, Classroom Delivery, Monitoring & Feedback',
    description: 'Pedagogical execution engine empowering teachers with 3-stage NERDC lesson notes, AI lesson synthesizers, live delivery verification, syllabus audit, and feedback loops.',
    monthlyPriceNGN: 85000,
    yearlyPriceNGN: 850000,
    color: 'from-emerald-600 to-teal-700',
    bgColor: 'bg-emerald-950/40',
    borderColor: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    iconName: 'BookOpen',
    features: [
      {
        id: 'feat_teach_lesson_notes',
        key: 'lesson_notes',
        bundleKey: 'teaching',
        name: 'Lesson Notes',
        description: 'Structured 3-stage lesson notes aligned with NERDC schemes of work, Bloom’s taxonomy objectives, and HOD/Principal review signoffs.',
        subItems: [
          '3-Stage Lesson Note Formulation',
          'NERDC Scheme of Work Auto-Alignment',
          'AI Bloom’s Taxonomy Lesson Plan Synthesizer',
          'HOD & Principal Review & Approval Workflow',
          'Teaching Materials & Workshop Lab Guides'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'FileCheck2'
      },
      {
        id: 'feat_teach_delivery',
        key: 'delivery',
        bundleKey: 'teaching',
        name: 'Delivery',
        description: 'Classroom teaching logs, timetable execution synchronization, period verification, and syllabus pacing.',
        subItems: [
          'Live Classroom Period Execution Logging',
          'Timetable Synchronization & Period Clashes',
          'Taught Topic Verification & Timestamping',
          'Practical Workshop & Lab Activity Tracking',
          'Curriculum Coverage Milestones'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'CalendarCheck2'
      },
      {
        id: 'feat_teach_monitoring',
        key: 'monitoring',
        bundleKey: 'teaching',
        name: 'Monitoring',
        description: 'Academic coordinator and HOD supervisory observations, syllabus velocity audits, and delayed lesson alerts.',
        subItems: [
          'HOD & Coordinator Lesson Observation Notes',
          'Syllabus Velocity & Curriculum Pacing Index',
          'Delayed & Missed Lesson Real-Time Alerts',
          'Subject Department Compliance Audits',
          'Pedagogical Quality Assurance Scoring'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Activity'
      },
      {
        id: 'feat_teach_feedback',
        key: 'feedback',
        bundleKey: 'teaching',
        name: 'Feedback',
        description: 'Teacher self-reflection, student comprehension diagnostics, HOD supervisory feedback, and adaptive remedial triggers.',
        subItems: [
          'Teacher Post-Lesson Self-Reflections',
          'Student Comprehension & Difficulty Ratings',
          'HOD Constructive Feedback & Endorsements',
          'Adaptive Remedial Engine Triggering',
          'Personalized Student Learning Gap Notes'
        ],
        defaultEnabled: true,
        isCore: false,
        iconName: 'Sparkles'
      }
    ]
  },
  {
    key: 'assessment',
    name: 'Assessment Suite',
    shortName: 'Assessment',
    tagline: 'Question Banks, Continuous Tests, Secure Exams & Result Broadsheets',
    description: 'Full assessment lifecycle engine featuring cognitive-level question banking, anti-leak CBT exam vaults, taught-only testing barriers, and official broadsheets with QR verification.',
    monthlyPriceNGN: 90000,
    yearlyPriceNGN: 900000,
    color: 'from-amber-600 to-orange-700',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    iconName: 'Award',
    features: [
      {
        id: 'feat_assess_question_bank',
        key: 'question_bank',
        bundleKey: 'assessment',
        name: 'Question Bank',
        description: 'Curriculum-tagged item vault classified by Bloom’s cognitive taxonomy with AI question generator and variable options.',
        subItems: [
          'Bloom’s Taxonomy Tagged Items (6 Cognitive Levels)',
          'AI-Powered Variable Question Generator',
          'WAEC / NECO / BECE / JAMB Past Question Vault',
          'Randomized CBT Variant Distractor Sets',
          'Subject HOD Item Moderation & Approval'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Layers'
      },
      {
        id: 'feat_assess_tests',
        key: 'tests',
        bundleKey: 'assessment',
        name: 'Tests',
        description: 'Continuous Assessment (CA 1 & CA 2) creation with automated barrier enforcement ensuring only verified taught topics are tested.',
        subItems: [
          'Taught-Only Assessment Barrier Validation',
          'Continuous Assessment (CA 1, CA 2) Builder',
          'Weekly Diagnostic Quizzes & Class Tests',
          'Automated Objective Grading & Score Capture',
          'Remedial Re-assessment Worksheets'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'CheckCircle2'
      },
      {
        id: 'feat_assess_exams',
        key: 'exams',
        bundleKey: 'assessment',
        name: 'Exams',
        description: 'Secure terminal examination builder, encrypted question vaults, timed lockdown CBT sessions, and anti-leak marking schemes.',
        subItems: [
          'Secure Examination Paper & Time-lock Vaults',
          'Anti-Leak Encrypted Marking Scheme Vault',
          'Lockdown CBT Kiosk with Randomization',
          'Exam Centre & Seat Number Allocations',
          'Principal & Exam Officer Cryptographic Unlocks'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Lock'
      },
      {
        id: 'feat_assess_results',
        key: 'results',
        bundleKey: 'assessment',
        name: 'Results',
        description: 'Class broadsheet compilation, cumulative GPA/percentages, affective/psychomotor evaluation, and printable report cards with QR codes.',
        subItems: [
          'Automated Class Broadsheet Compilation',
          'Weighted CA (40%) + Exam (60%) Computation',
          'Affective & Psychomotor Behavioral Scoring',
          'Principal & Form Teacher Automated Remarks',
          'Official Printable Report Cards with QR Verification'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'GraduationCap'
      }
    ]
  },
  {
    key: 'accounts_billing',
    name: 'Accounts & Billing Suite',
    shortName: 'Accounts & Billing',
    tagline: 'Fee Schedules, Multi-PSP Payments, Bursary Ledgers & Payroll',
    description: 'Complete bursary and fintech platform supporting grade-specific fee schedules, automated Paystack/Flutterwave PSP reconciliation, student virtual NUBANs, installment agreements, and expense bookkeeping.',
    monthlyPriceNGN: 80000,
    yearlyPriceNGN: 800000,
    color: 'from-sky-600 to-cyan-700',
    bgColor: 'bg-sky-950/40',
    borderColor: 'border-sky-500/30',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    iconName: 'Building2',
    features: [
      {
        id: 'feat_acct_fee_schedules',
        key: 'fee_schedules',
        bundleKey: 'accounts_billing',
        name: 'Fee Schedules',
        description: 'Comprehensive fee matrix by class grade, day vs boarding status, compulsory tuition, levies, and sundry elective items.',
        subItems: [
          'Grade-Specific Termly Fee Structures',
          'Day vs. Boarding Student Differential Pricing',
          'Compulsory vs. Optional Sundry Levies',
          'Principal Approval Workflow for Fee Policies',
          'Sibling & Scholarship Discount Configurations'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Tag'
      },
      {
        id: 'feat_acct_payments_psp',
        key: 'payments_psp',
        bundleKey: 'accounts_billing',
        name: 'Payments & PSP',
        description: 'Multi-channel payment gateway integrations (Paystack, Flutterwave, Bank Transfer), automated settlement splits, and dedicated student virtual accounts.',
        subItems: [
          'Paystack, Flutterwave & Bank Wire Gateway',
          'Dedicated Student Virtual NUBAN Accounts',
          'Instant Automated Webhook Reconciliation',
          'Card, USSD, and Bank Transfer Checkout',
          'PTA & School Multi-Account Settlement Split'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'CreditCard'
      },
      {
        id: 'feat_acct_bursary_ledger',
        key: 'bursary_ledger',
        bundleKey: 'accounts_billing',
        name: 'Bursary & Ledger',
        description: 'Double-entry student accounting ledgers, itemized invoice generators, cryptographic receipts, and structured installment plans.',
        subItems: [
          'Itemized Student Invoices & Balance Tracking',
          'Digitally Signed Official Receipts with QR Verification',
          'Structured Installment Payment Agreements',
          'Arrears Recovery & Automated Reminder Triggers',
          'Bank Statement Reconciliation Audit Log'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Receipt'
      },
      {
        id: 'feat_acct_payroll_expenses',
        key: 'payroll_expenses',
        bundleKey: 'accounts_billing',
        name: 'Payroll & Expenses',
        description: 'Faculty salary allowances, operational expenditure tracking, vendor disbursements, and departmental budget allocations.',
        subItems: [
          'Staff Payroll & Allowance Calculations',
          'Operational & Administrative Expense Tracking',
          'Vendor Disbursements & Purchase Approvals',
          'Departmental Science & ICT Budget Controls',
          'Cash Flow & Net Institutional Bookkeeping'
        ],
        defaultEnabled: true,
        isCore: false,
        iconName: 'DollarSign'
      },
      {
        id: 'feat_acct_financial_analytics',
        key: 'financial_analytics',
        bundleKey: 'accounts_billing',
        name: 'Financial Analytics',
        description: 'Revenue collection dashboards, fee recovery velocity, payment channel breakdowns, and budgetary forecasts.',
        subItems: [
          'Real-time Revenue Collection & Recovery Velocity',
          'Class-by-Class Fee Clearance Matrices',
          'Payment Gateway Channel & Fee Split Visualizers',
          'Termly Budget Variance & Revenue Projections',
          'Exportable PDF & Excel Financial Ledgers'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'TrendingUp'
      }
    ]
  },
  {
    key: 'logistics_support',
    name: 'Logistics Support Management Suite',
    shortName: 'Logistics & Support',
    tagline: 'Gate Security, E-Library, Boarding Hostels & School Bus Management',
    description: 'Comprehensive campus logistics platform featuring Gate Security Kiosk & QR pickup scanner, Digital E-Library repository with staff upload, Boarding House management suite with D3 occupancy visualizer & mobile exeat workflows, and School Bus transport management with geofence parent alerts.',
    monthlyPriceNGN: 85000,
    yearlyPriceNGN: 850000,
    color: 'from-purple-600 to-pink-700',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    iconName: 'Boxes',
    features: [
      {
        id: 'feat_logistics_gate_security',
        key: 'gate_security_kiosk',
        bundleKey: 'logistics_support',
        name: 'Gate Security Kiosk & Pickup Scanner',
        description: 'Dedicated tablet-optimized gate scanner interface for security officers to verify guardian QR codes, authenticate PINs, and authorize student exit with instant parent alerts.',
        subItems: [
          'Tablet-Optimized Gate Security Kiosk UI',
          'Guardian QR Code & PIN Authenticator',
          'Live Guardian Photo & Identity Verification',
          'Boarding House Exeat Verification at Perimeter Gate',
          'Instant Parent SMS & WhatsApp Exit Dispatch'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'ShieldCheck'
      },
      {
        id: 'feat_logistics_elibrary',
        key: 'digital_elibrary',
        bundleKey: 'logistics_support',
        name: 'Digital E-Library & Curriculum Resource Repository',
        description: 'NERDC-approved textbook repository, past WAEC/NECO/JAMB past papers, downloadable audio/video courseware, and authorized staff upload portal for curriculum-aligned materials.',
        subItems: [
          'NERDC Approved Digital Textbooks & Readers',
          'WAEC / NECO / JAMB Past Question Vault with Solutions',
          'Downloadable MP3 Audio & MP4 Video Courseware',
          'Staff Upload Engine for PDF, Image & Audio Resources',
          'Subject & Grade-Level Aligned Search & Filter'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'BookOpen'
      },
      {
        id: 'feat_logistics_boarding_house',
        key: 'boarding_house_suite',
        bundleKey: 'logistics_support',
        name: 'Boarding House & Hostel Management Suite',
        description: 'Dormitory/room bed space allocations, D3.js occupancy visualizer, digital student exeat requests with mobile house master approval workflow, evening roll-calls, and dining hall registers.',
        subItems: [
          'D3.js Dormitory Occupancy & Bed Space Visualizer',
          'Digital Student Exeat Request & Mobile House Master Approval',
          'QR Verification Exeat Pass Generator',
          'Daily Evening Roll-Call & Night Curfew Register',
          'Dining Hall Meal Roster & Special Diet Tracking'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Building2'
      },
      {
        id: 'feat_logistics_transportation',
        key: 'bus_transportation',
        bundleKey: 'logistics_support',
        name: 'School Bus Transportation & Route Management',
        description: 'Bus routes, passenger check-in/drop-off logs, driver license tracking, maintenance schedules, and geofence proximity alerts notifying parents in real-time.',
        subItems: [
          'Bus Route & Pickup Stop Management',
          'Real-time Passenger Check-In & Drop-Off Manifest',
          'Driver Profile & License Expiry Tracking',
          'Vehicle Preventative Maintenance Schedules',
          'Geofenced Parent Portal Proximity Notifications'
        ],
        defaultEnabled: true,
        isCore: true,
        iconName: 'Truck'
      }
    ]
  }
];

// Helper to calculate total price for any combination of bundles
export function calculateBundlePricing(
  selectedBundleKeys: CurriculumFlowBundleKey[],
  billingCycleOrIsYearly: 'monthly' | 'yearly' | boolean = 'yearly'
): {
  subtotalNGN: number;
  discountPercent: number;
  discountAmountNGN: number;
  finalPriceNGN: number;
  discountedMonthlyPriceNGN: number;
  discountedYearlyPriceNGN: number;
  selectedBundlesCount: number;
  bundleNames: string[];
} {
  const isYearly = typeof billingCycleOrIsYearly === 'boolean' 
    ? billingCycleOrIsYearly 
    : billingCycleOrIsYearly === 'yearly';

  const selectedBundles = CURRICULUM_FLOW_BUNDLES.filter(b => selectedBundleKeys.includes(b.key));
  
  const subtotalMonthlyNGN = selectedBundles.reduce((sum, b) => sum + b.monthlyPriceNGN, 0);
  const subtotalYearlyNGN = selectedBundles.reduce((sum, b) => sum + b.yearlyPriceNGN, 0);
  const subtotalNGN = isYearly ? subtotalYearlyNGN : subtotalMonthlyNGN;

  // Multi-bundle discount incentives:
  // 1 bundle = 0% discount
  // 2 bundles = 10% discount
  // 3 bundles = 18% discount
  // 4 bundles = 25% discount
  // 5 bundles (All-in-One Master Logistics Suite) = 30% discount
  let discountPercent = 0;
  if (selectedBundles.length === 2) discountPercent = 10;
  else if (selectedBundles.length === 3) discountPercent = 18;
  else if (selectedBundles.length === 4) discountPercent = 25;
  else if (selectedBundles.length >= 5) discountPercent = 30;

  const discountAmountNGN = Math.round((subtotalNGN * discountPercent) / 100);
  const finalPriceNGN = subtotalNGN - discountAmountNGN;

  const discountedMonthlyPriceNGN = Math.round(subtotalMonthlyNGN * (1 - discountPercent / 100));
  const discountedYearlyPriceNGN = Math.round(subtotalYearlyNGN * (1 - discountPercent / 100));

  return {
    subtotalNGN,
    discountPercent,
    discountAmountNGN,
    finalPriceNGN,
    discountedMonthlyPriceNGN,
    discountedYearlyPriceNGN,
    selectedBundlesCount: selectedBundles.length,
    bundleNames: selectedBundles.map(b => b.shortName)
  };
}

// Sample bundle upgrade requests
export const INITIAL_BUNDLE_UPGRADE_REQUESTS: BundleUpgradeRequest[] = [
  {
    id: 'BUR-2026-001',
    tenantId: 'tenant_kings_lagos',
    tenantSchoolName: 'King’s College, Lagos',
    requestedBundle: 'accounts_billing',
    requestType: 'activate',
    status: 'approved',
    requestedAt: '2026-08-10T11:20:00Z',
    requestedBy: 'Principal Arc. A. B. Adeyemi',
    monthlyPriceImpactNGN: 80000,
    notes: 'School requested full bursary and online PSP Paystack gateway activation.'
  },
  {
    id: 'BUR-2026-002',
    tenantId: 'tenant_qpc_enugu',
    tenantSchoolName: 'Queen’s Premier College',
    requestedBundle: 'assessment',
    requestType: 'activate',
    status: 'pending',
    requestedAt: '2026-08-15T09:45:00Z',
    requestedBy: 'Dr. (Mrs.) C. N. Okonkwo',
    monthlyPriceImpactNGN: 90000,
    notes: 'Requesting CBT lockdown exams and automated WAEC question bank module for SS 3 cohort.'
  }
];
