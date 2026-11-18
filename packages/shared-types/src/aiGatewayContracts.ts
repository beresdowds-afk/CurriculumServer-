export type AiApplicationId =
  | 'CURRICULUM_SERVER'
  | 'CURRICULUM_FLOW'
  | 'SCHOOL_INSTANCE'
  | 'PROVISIONING_AGENT';

export type AiCapabilityId =
  // Curriculum Server
  | 'LESSON_GENERATION'
  | 'TEXTBOOK_GENERATION'
  | 'CURRICULUM_CONTENT_GENERATION'
  // Curriculum Flow
  | 'EXAMINATION_GENERATION'
  | 'CBT_GENERATION'
  | 'QUESTION_BANK_GENERATION'
  | 'ASSESSMENT_SUPPORT'
  | 'MARKING_ASSISTANCE'
  // School Instance
  | 'SCHOOL_EXAMINATION_GENERATION'
  | 'SCHOOL_CBT_GENERATION'
  | 'SCHOOL_QUESTION_BANK_GENERATION'
  | 'SCHOOL_ASSESSMENT_GENERATION'
  // Provisioning Agent (read-only recommendations)
  | 'SCHOOL_REQUIREMENTS_ANALYSIS'
  | 'ARCHITECTURE_RECOMMENDATION'
  | 'RESOURCE_SIZING_RECOMMENDATION'
  | 'WORKLOAD_ANALYSIS';

export type AiTaskType =
  | 'lesson_note'
  | 'scheme_of_work'
  | 'adaptive_remedial'
  | 'curriculum_tutor'
  | 'textbook_outline'
  | 'textbook_chapter'
  | 'secure_exam'
  | 'marking_scheme'
  | 'taught_assessment'
  | 'variable_questions'
  | 'exam_builder'
  | 'cbt_paper'
  | 'question_bank_items'
  | 'provisioning_recommend';

export type AiProviderId = 'GOOGLE_GEMINI';

export type AiModelTier = 'fast' | 'standard' | 'reasoning';

export type AiAuthMode = 'vertex_ai_adc' | 'api_key' | 'unconfigured';

export interface AiGatewayRequestEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  applicationId: AiApplicationId;
  capability: AiCapabilityId;
  taskType?: AiTaskType;
  tenantId?: string;
  applicationInstanceId?: string;
  payload: TPayload;
  modelOverride?: string;
  idempotencyKey?: string;
  correlationId?: string;
}

export interface AiRoutingDecisionSummary {
  providerId: AiProviderId;
  modelId: string;
  modelTier: AiModelTier;
  authMode: AiAuthMode;
  strategy: string;
  attemptCount: number;
  latencyMs: number;
}

export interface AiTokenUsageSummary {
  promptTokens: number | null;
  candidatesTokens: number | null;
  totalTokens: number | null;
  costMetadataAvailable: boolean;
  estimatedCostUsd: number | null;
}

export interface AiGatewayResponseEnvelope<TData = unknown> {
  success: true;
  requestId: string;
  correlationId: string;
  applicationId: AiApplicationId;
  capability: AiCapabilityId;
  taskType: AiTaskType;
  tenantId: string | null;
  reviewRequired: boolean;
  readOnlyAdvisory: boolean;
  routing: AiRoutingDecisionSummary;
  usage: AiTokenUsageSummary;
  data: TData;
  timestamp: string;
}

export interface AiGatewayCapabilityDescriptor {
  capability: AiCapabilityId;
  applicationId: AiApplicationId;
  description: string;
  supportedTasks: AiTaskType[];
  defaultModelTier: AiModelTier;
  defaultModelId: string;
  requiresTenantContext: boolean;
  requiresTeacherReview: boolean;
  readOnlyAdvisory: boolean;
  requiredPermissions: string[];
  rateLimitPerMinute: number;
  maxConcurrency: number;
  enabled: boolean;
}

export interface AiGatewayHealthStatus {
  status: 'healthy' | 'degraded';
  gatewayReady: boolean;
  providerId: AiProviderId;
  authMode: AiAuthMode;
  gcpProjectId: string;
  gcpRegion: string;
  runtimeServiceAccount: string;
  defaultModels: {
    fast: string;
    standard: string;
    reasoning: string;
  };
  registeredApplications: AiApplicationId[];
  registeredCapabilitiesCount: number;
  databasePersistenceConfigured: boolean;
  timestamp: string;
}

export interface AiProvisioningRecommendationPayload {
  readOnlyAdvisory: true;
  directInfrastructureMutationAllowed: false;
  recommendedTopology: string;
  recommendedGcpRegion: string;
  rationale: string;
  tradeOffs: string[];
  extractedRequirements: {
    schoolName: string;
    studentPopulation: number;
    staffPopulation: number;
    concurrentUsers: number;
    securityIsolation: string;
    databaseStrategy: string;
    storageStrategy: string;
    storageRequirementsGb: number;
  };
  resourceSizing: {
    cloudRunMinInstances: number;
    cloudRunMaxInstances: number;
    cloudRunCpu: string;
    cloudRunMemory: string;
    cloudSqlTier: string;
    estimatedConcurrentPeakUsers: number;
  };
  workloadAnalysis: {
    profile: string;
    cbtConcurrencyPeak: number;
    aiRequestsPerDayEstimate: number;
    notes: string[];
  };
}
