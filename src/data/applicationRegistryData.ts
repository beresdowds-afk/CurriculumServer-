import { RegisteredApplication, RegisteredFeature } from '../types/applicationRegistry';

export const INITIAL_REGISTERED_APPLICATIONS: RegisteredApplication[] = [
  {
    appId: 'app_curriculum_flow',
    name: 'Curriculum Flow School ERP',
    family: 'Academic Administration',
    description: 'Comprehensive K-12 school management, student records, continuous assessment, NERDC syllabus mapping, CBT exam lockdown, and terminal report card studio.',
    version: '2.4.0',
    containerImageRef: 'gcr.io/curriculum-server/curriculum-flow:v2.4.0',
    supportedDeploymentTargets: ['cloud_run', 'kubernetes', 'bare_metal_edge'],
    requiredRuntimeDependencies: ['Node.js 20 LTS', 'PostgreSQL 15+'],
    databaseRequirements: {
      engine: 'postgresql',
      minVersion: '15.0',
      requiresIsolatedSchema: true
    },
    storageRequirements: {
      minStorageMb: 10000,
      requiresBucket: true
    },
    authRequirements: {
      oauthSupported: true,
      jwtBearerRequired: true,
      rbacModel: 'Multi-Role RBAC (Principal, Teacher, Bursar, Student, Parent)'
    },
    requiredInfrastructurePermissions: ['cloudsql.client', 'storage.objectAdmin'],
    healthCheckConfig: {
      endpoint: '/api/health',
      intervalSeconds: 30,
      timeoutSeconds: 5
    },
    lifecycleStatus: 'published',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z'
  },
  {
    appId: 'app_research_analytics',
    name: 'Curriculum Research & Policy Analytics',
    family: 'Government & Board Intelligence',
    description: 'National curriculum telemetry, learning outcome correlation analytics, and NERDC policy simulation engine for state education ministries.',
    version: '1.1.0',
    containerImageRef: 'gcr.io/curriculum-server/research-analytics:v1.1.0',
    supportedDeploymentTargets: ['cloud_run', 'kubernetes'],
    requiredRuntimeDependencies: ['Node.js 20 LTS', 'Python 3.11 (Analytics Worker)'],
    databaseRequirements: {
      engine: 'postgresql',
      minVersion: '15.0',
      requiresIsolatedSchema: false
    },
    storageRequirements: {
      minStorageMb: 5000,
      requiresBucket: false
    },
    authRequirements: {
      oauthSupported: true,
      jwtBearerRequired: true,
      rbacModel: 'Ministry Official & Researcher'
    },
    requiredInfrastructurePermissions: ['bigquery.admin'],
    healthCheckConfig: {
      endpoint: '/api/analytics/health',
      intervalSeconds: 60,
      timeoutSeconds: 10
    },
    lifecycleStatus: 'beta',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z'
  },
  {
    appId: 'app_cbt_sovereign',
    name: 'Examinations Hub & CBT Sovereign Engine',
    family: 'Testing & Certification Engines',
    description: 'National examination kiosk, high-concurrency CBT exam lockdown browser, WAEC/JAMB simulator, and instant terminal score calculation.',
    version: '3.1.0',
    containerImageRef: 'gcr.io/curriculum-server/cbt-sovereign-engine:v3.1.0',
    supportedDeploymentTargets: ['cloud_run', 'kubernetes', 'bare_metal_edge'],
    requiredRuntimeDependencies: ['Node.js 20 LTS', 'PostgreSQL 16+', 'WebSockets (Realtime Exam Sync)'],
    databaseRequirements: {
      engine: 'postgresql',
      minVersion: '16.0',
      requiresIsolatedSchema: true
    },
    storageRequirements: {
      minStorageMb: 25000,
      requiresBucket: true
    },
    authRequirements: {
      oauthSupported: true,
      jwtBearerRequired: true,
      rbacModel: 'Exam Supervisor, Invigilator, Candidate'
    },
    requiredInfrastructurePermissions: ['cloudsql.client', 'storage.objectAdmin'],
    healthCheckConfig: {
      endpoint: '/api/v1/cbt/health',
      intervalSeconds: 15,
      timeoutSeconds: 3
    },
    lifecycleStatus: 'published',
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z'
  }
];

export const INITIAL_REGISTERED_FEATURES: RegisteredFeature[] = [
  {
    featureId: 'feat_student_registration',
    name: 'Student & Guardian Registration',
    description: 'Enrolment records, guardian contact linkage, medical records, and demography tracking.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: [],
    requiredPermissions: ['manage_students'],
    apiDependencies: ['/api/v1/flow/students'],
    databaseRequirements: ['students_table', 'guardians_table'],
    storageRequirements: ['student_avatars_bucket'],
    configOptions: { maxStudentsPerClass: 60, enableBiometricSync: true },
    version: '2.1.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_exam_management',
    name: 'Examination & Assessment Management',
    description: 'CBT question bank, secure exam kiosk, automated grading, and question provenance tracing.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: ['feat_student_registration'],
    requiredPermissions: ['manage_exams'],
    apiDependencies: ['/api/v1/flow/exams/generate', '/api/curriculum/subjects'],
    databaseRequirements: ['exam_questions_table', 'exam_sessions_table'],
    storageRequirements: ['exam_attachments_bucket'],
    configOptions: { lockdownBrowserRequired: true, randomizeQuestionOrder: true },
    version: '2.3.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_results_processing',
    name: 'Results Processing & Terminal Grading',
    description: 'Continuous assessment aggregation, psychomotor scoring, affective rating, and cumulative GPA calculation.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: ['feat_student_registration', 'feat_exam_management'],
    requiredPermissions: ['process_results'],
    apiDependencies: ['/api/v1/flow/grades'],
    databaseRequirements: ['term_results_table', 'cumulative_transcripts_table'],
    storageRequirements: ['pdf_report_cards_bucket'],
    configOptions: { gradingSystem: 'nigerian_waec_scale', includeQrVerification: true },
    version: '2.4.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_bursary_billing',
    name: 'Bursary & Fee Installment Management',
    description: 'Invoice generation, PSP multi-gateway payment splits, installment tracking, and digital receipts.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: ['feat_student_registration'],
    requiredPermissions: ['manage_bursary'],
    apiDependencies: ['/api/v1/bursary/invoices'],
    databaseRequirements: ['invoices_table', 'transactions_table'],
    storageRequirements: ['receipt_pdf_bucket'],
    configOptions: { defaultCurrency: 'NGN', gateway: 'paystack_flutterwave' },
    version: '2.0.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_biometric_attendance',
    name: 'Biometric RFID Attendance & Gate Sync',
    description: 'Real-time school gate attendance logging, RFID card check-in, and instant parent SMS/WhatsApp alert dispatch.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: ['feat_student_registration'],
    requiredPermissions: ['view_attendance'],
    apiDependencies: ['/api/v1/attendance/log'],
    databaseRequirements: ['attendance_logs_table'],
    storageRequirements: [],
    configOptions: { autoNotifyParentsOnArrival: true },
    version: '1.5.0',
    availabilityStatus: 'beta',
    honestyStatus: 'simulated_ui'
  },
  {
    featureId: 'feat_ai_curriculum_advisor',
    name: 'AI Curriculum Advisor & Lesson Generator',
    description: 'Gemini-powered NERDC scheme of work generator, lesson plan assistant, and adaptive remedial tutor.',
    applicationAssociation: 'app_curriculum_flow',
    dependencies: [],
    requiredPermissions: ['use_ai_tools'],
    apiDependencies: ['/api/curriculum/subjects', 'Gemini AI API'],
    databaseRequirements: ['ai_prompts_audit_table'],
    storageRequirements: [],
    configOptions: { model: 'gemini-2.5-flash', temperature: 0.7 },
    version: '3.0.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_cbt_item_bank',
    name: 'CBT Item Bank & Question Blueprints',
    description: 'National curriculum-mapped question banking with psychometric difficulty ratings and diagram support.',
    applicationAssociation: 'app_cbt_sovereign',
    dependencies: [],
    requiredPermissions: ['manage_exams'],
    apiDependencies: ['/api/v1/cbt/items'],
    databaseRequirements: ['cbt_items_table'],
    storageRequirements: ['cbt_diagrams_bucket'],
    configOptions: { latexMathSupported: true },
    version: '3.1.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_cbt_concurrency_lockdown',
    name: 'High-Concurrency Lock-Down Engine',
    description: 'Anti-cheat lockdown browser engine, offline terminal caching, and automated websocket reconnect.',
    applicationAssociation: 'app_cbt_sovereign',
    dependencies: ['feat_cbt_item_bank'],
    requiredPermissions: ['administer_cbt'],
    apiDependencies: ['/api/v1/cbt/lockdown'],
    databaseRequirements: ['cbt_candidate_sessions_table'],
    storageRequirements: [],
    configOptions: { fullscreenLockdown: true, multiWindowBlocked: true },
    version: '3.1.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  },
  {
    featureId: 'feat_cbt_instant_broadsheet',
    name: 'Instant Broadsheet & WAEC Score Export',
    description: 'Real-time psychometric broadsheet grading, percentile rank generation, and verifiable QR result slips.',
    applicationAssociation: 'app_cbt_sovereign',
    dependencies: ['feat_cbt_item_bank', 'feat_cbt_concurrency_lockdown'],
    requiredPermissions: ['export_cbt_scores'],
    apiDependencies: ['/api/v1/cbt/broadsheet'],
    databaseRequirements: ['cbt_broadsheets_table'],
    storageRequirements: ['cbt_score_slips_bucket'],
    configOptions: { exportFormat: 'csv_and_pdf' },
    version: '3.1.0',
    availabilityStatus: 'available',
    honestyStatus: 'fully_implemented'
  }
];

export function validateFeatureDependencies(selectedFeatureIds: string[]): { valid: boolean; missingDependencies: string[] } {
  const missing: string[] = [];
  const featureMap = new Map(INITIAL_REGISTERED_FEATURES.map(f => [f.featureId, f]));

  for (const fid of selectedFeatureIds) {
    const feat = featureMap.get(fid);
    if (feat) {
      for (const depId of feat.dependencies) {
        if (!selectedFeatureIds.includes(depId)) {
          const depFeature = featureMap.get(depId);
          missing.push(depFeature ? depFeature.name : depId);
        }
      }
    }
  }

  return {
    valid: missing.length === 0,
    missingDependencies: Array.from(new Set(missing))
  };
}
