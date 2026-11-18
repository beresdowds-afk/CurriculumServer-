import type { AiApplicationId, AiCapabilityId, AiTaskType } from '../../packages/shared-types/src/aiGatewayContracts';
import { PERMISSIONS } from '../authorization/permissions';
import { AiGatewayError, type AiCapabilityPolicy } from './types';

export const REGISTERED_AI_APPLICATIONS: readonly AiApplicationId[] = [
  'CURRICULUM_SERVER',
  'CURRICULUM_FLOW',
  'SCHOOL_INSTANCE',
  'PROVISIONING_AGENT'
];

export const AI_CAPABILITY_POLICIES: readonly AiCapabilityPolicy[] = [
  // 1. CURRICULUM_SERVER
  {
    capability: 'LESSON_GENERATION',
    applicationId: 'CURRICULUM_SERVER',
    allowedApplications: ['CURRICULUM_SERVER', 'CURRICULUM_FLOW', 'SCHOOL_INSTANCE'],
    description: 'NERDC-aligned lesson notes, schemes of work, and adaptive remedial design',
    supportedTasks: ['lesson_note', 'scheme_of_work', 'adaptive_remedial'],
    defaultTask: 'lesson_note',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.4,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [PERMISSIONS.aiCurriculumGenerate],
    rateLimitPerMinute: 60,
    maxConcurrency: 10,
    enabled: true
  },
  {
    capability: 'TEXTBOOK_GENERATION',
    applicationId: 'CURRICULUM_SERVER',
    allowedApplications: ['CURRICULUM_SERVER'],
    description: 'Central authoritative textbook outline and chapter generation grounded in approved curriculum',
    supportedTasks: ['textbook_outline', 'textbook_chapter'],
    defaultTask: 'textbook_outline',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.3,
    requiresTenantContext: false,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [PERMISSIONS.aiCurriculumGenerate],
    rateLimitPerMinute: 30,
    maxConcurrency: 5,
    enabled: true
  },
  {
    capability: 'CURRICULUM_CONTENT_GENERATION',
    applicationId: 'CURRICULUM_SERVER',
    allowedApplications: ['CURRICULUM_SERVER', 'CURRICULUM_FLOW', 'SCHOOL_INSTANCE'],
    description: 'Pedagogical curriculum advisor, syllabus guidance, and instructional content generation',
    supportedTasks: ['curriculum_tutor', 'lesson_note', 'scheme_of_work'],
    defaultTask: 'curriculum_tutor',
    defaultModelTier: 'fast',
    defaultModelId: 'gemini-3.1-flash-lite',
    temperature: 0.5,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [PERMISSIONS.aiTutorUse],
    rateLimitPerMinute: 90,
    maxConcurrency: 15,
    enabled: true
  },

  // 2. CURRICULUM_FLOW
  {
    capability: 'EXAMINATION_GENERATION',
    applicationId: 'CURRICULUM_FLOW',
    allowedApplications: ['CURRICULUM_FLOW'],
    description: 'Curriculum Flow school-scoped examination paper assembly and builder',
    supportedTasks: ['secure_exam', 'exam_builder'],
    defaultTask: 'secure_exam',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.35,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 45,
    maxConcurrency: 8,
    enabled: true
  },
  {
    capability: 'CBT_GENERATION',
    applicationId: 'CURRICULUM_FLOW',
    allowedApplications: ['CURRICULUM_FLOW'],
    description: 'Curriculum Flow computer-based test (CBT) question paper generation',
    supportedTasks: ['cbt_paper', 'exam_builder'],
    defaultTask: 'cbt_paper',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.3,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiCbtGenerate],
    rateLimitPerMinute: 45,
    maxConcurrency: 8,
    enabled: true
  },
  {
    capability: 'QUESTION_BANK_GENERATION',
    applicationId: 'CURRICULUM_FLOW',
    allowedApplications: ['CURRICULUM_FLOW'],
    description: 'Curriculum Flow school-owned question bank drafting & parameterized variants (pending review)',
    supportedTasks: ['question_bank_items', 'variable_questions'],
    defaultTask: 'question_bank_items',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.4,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 60,
    maxConcurrency: 10,
    enabled: true
  },
  {
    capability: 'ASSESSMENT_SUPPORT',
    applicationId: 'CURRICULUM_FLOW',
    allowedApplications: ['CURRICULUM_FLOW'],
    description: 'Taught-only classroom tests, lesson-aligned drills, and adaptive remedial support',
    supportedTasks: ['taught_assessment', 'adaptive_remedial', 'lesson_note', 'scheme_of_work', 'curriculum_tutor'],
    defaultTask: 'taught_assessment',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.35,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 60,
    maxConcurrency: 10,
    enabled: true
  },
  {
    capability: 'MARKING_ASSISTANCE',
    applicationId: 'CURRICULUM_FLOW',
    allowedApplications: ['CURRICULUM_FLOW', 'SCHOOL_INSTANCE'],
    description: 'Confidential marking schemes, rubrics, and examiner scoring guides',
    supportedTasks: ['marking_scheme'],
    defaultTask: 'marking_scheme',
    defaultModelTier: 'reasoning',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.25,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 45,
    maxConcurrency: 8,
    enabled: true
  },

  // 3. SCHOOL_INSTANCE
  {
    capability: 'SCHOOL_EXAMINATION_GENERATION',
    applicationId: 'SCHOOL_INSTANCE',
    allowedApplications: ['SCHOOL_INSTANCE'],
    description: 'Dedicated school instance examination assembly with tenant isolation',
    supportedTasks: ['secure_exam', 'exam_builder', 'marking_scheme'],
    defaultTask: 'secure_exam',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.35,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 45,
    maxConcurrency: 8,
    enabled: true
  },
  {
    capability: 'SCHOOL_CBT_GENERATION',
    applicationId: 'SCHOOL_INSTANCE',
    allowedApplications: ['SCHOOL_INSTANCE'],
    description: 'Dedicated school instance CBT examination generation scoped to instance syllabus',
    supportedTasks: ['cbt_paper', 'exam_builder'],
    defaultTask: 'cbt_paper',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.3,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiCbtGenerate],
    rateLimitPerMinute: 45,
    maxConcurrency: 8,
    enabled: true
  },
  {
    capability: 'SCHOOL_QUESTION_BANK_GENERATION',
    applicationId: 'SCHOOL_INSTANCE',
    allowedApplications: ['SCHOOL_INSTANCE'],
    description: 'School-owned Question Bank objective/theory/practical/variant drafting (pending teacher review)',
    supportedTasks: ['question_bank_items', 'variable_questions'],
    defaultTask: 'question_bank_items',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.4,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate, PERMISSIONS.questionBankManage],
    rateLimitPerMinute: 60,
    maxConcurrency: 10,
    enabled: true
  },
  {
    capability: 'SCHOOL_ASSESSMENT_GENERATION',
    applicationId: 'SCHOOL_INSTANCE',
    allowedApplications: ['SCHOOL_INSTANCE'],
    description: 'School instance taught-only assessment, adaptive remedial, and lesson planning',
    supportedTasks: ['taught_assessment', 'adaptive_remedial', 'lesson_note', 'scheme_of_work'],
    defaultTask: 'taught_assessment',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.35,
    requiresTenantContext: true,
    requiresTeacherReview: true,
    readOnlyAdvisory: false,
    allowPlatformAdminOverride: false,
    requiresEntitlementCheck: true,
    requiredPermissions: [PERMISSIONS.aiAssessmentsGenerate],
    rateLimitPerMinute: 60,
    maxConcurrency: 10,
    enabled: true
  },

  // 4. PROVISIONING_AGENT (strictly read-only advisory)
  {
    capability: 'SCHOOL_REQUIREMENTS_ANALYSIS',
    applicationId: 'PROVISIONING_AGENT',
    allowedApplications: ['PROVISIONING_AGENT'],
    description: 'Extract structured school onboarding requirements from prompt (read-only advisory)',
    supportedTasks: ['provisioning_recommend'],
    defaultTask: 'provisioning_recommend',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.2,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: true,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [],
    rateLimitPerMinute: 30,
    maxConcurrency: 5,
    enabled: true
  },
  {
    capability: 'ARCHITECTURE_RECOMMENDATION',
    applicationId: 'PROVISIONING_AGENT',
    allowedApplications: ['PROVISIONING_AGENT'],
    description: 'Recommend Cloud Run / Cloud SQL / isolation topology and trade-offs (never provisions directly)',
    supportedTasks: ['provisioning_recommend'],
    defaultTask: 'provisioning_recommend',
    defaultModelTier: 'reasoning',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.2,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: true,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [],
    rateLimitPerMinute: 30,
    maxConcurrency: 5,
    enabled: true
  },
  {
    capability: 'RESOURCE_SIZING_RECOMMENDATION',
    applicationId: 'PROVISIONING_AGENT',
    allowedApplications: ['PROVISIONING_AGENT'],
    description: 'Recommend Cloud Run CPU/memory & Cloud SQL tier sizing based on capacity (read-only advisory)',
    supportedTasks: ['provisioning_recommend'],
    defaultTask: 'provisioning_recommend',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.2,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: true,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [],
    rateLimitPerMinute: 30,
    maxConcurrency: 5,
    enabled: true
  },
  {
    capability: 'WORKLOAD_ANALYSIS',
    applicationId: 'PROVISIONING_AGENT',
    allowedApplications: ['PROVISIONING_AGENT'],
    description: 'Analyze CBT surge concurrency & term-time AI/ERP load (read-only advisory)',
    supportedTasks: ['provisioning_recommend'],
    defaultTask: 'provisioning_recommend',
    defaultModelTier: 'standard',
    defaultModelId: 'gemini-4-hydrogen',
    temperature: 0.2,
    requiresTenantContext: false,
    requiresTeacherReview: false,
    readOnlyAdvisory: true,
    allowPlatformAdminOverride: true,
    requiresEntitlementCheck: false,
    requiredPermissions: [],
    rateLimitPerMinute: 30,
    maxConcurrency: 5,
    enabled: true
  }
];

const POLICY_BY_CAPABILITY = new Map<AiCapabilityId, AiCapabilityPolicy>(
  AI_CAPABILITY_POLICIES.map(policy => [policy.capability, policy])
);

export function isRegisteredApplication(appId: string): appId is AiApplicationId {
  return (REGISTERED_AI_APPLICATIONS as readonly string[]).includes(appId);
}

export function resolveCapabilityPolicy(
  applicationId: string,
  capabilityId: string,
  requestedTask?: AiTaskType
): AiCapabilityPolicy {
  if (!isRegisteredApplication(applicationId)) {
    throw new AiGatewayError(
      'UNREGISTERED_APPLICATION',
      `Application '${applicationId || 'unknown'}' is not registered with the Central AI Gateway.`,
      403,
      { applicationId }
    );
  }

  const policy = POLICY_BY_CAPABILITY.get(capabilityId as AiCapabilityId);
  if (!policy || !policy.enabled) {
    throw new AiGatewayError(
      'UNSUPPORTED_CAPABILITY',
      `AI capability '${capabilityId || 'unknown'}' is not supported or disabled.`,
      403,
      { applicationId, capabilityId }
    );
  }

  if (!policy.allowedApplications.includes(applicationId)) {
    throw new AiGatewayError(
      'UNSUPPORTED_CAPABILITY',
      `Application '${applicationId}' is not authorized to invoke capability '${capabilityId}'.`,
      403,
      { applicationId, capabilityId }
    );
  }

  if (requestedTask && !policy.supportedTasks.includes(requestedTask)) {
    throw new AiGatewayError(
      'UNSUPPORTED_CAPABILITY',
      `Task type '${requestedTask}' is not supported under capability '${capabilityId}'.`,
      400,
      { applicationId, capabilityId, requestedTask }
    );
  }

  return policy;
}

export function listCapabilitiesForApplication(applicationId?: AiApplicationId): AiCapabilityPolicy[] {
  if (!applicationId) return [...AI_CAPABILITY_POLICIES];
  return AI_CAPABILITY_POLICIES.filter(p => p.allowedApplications.includes(applicationId));
}
