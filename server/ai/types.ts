import type {
  AiApplicationId,
  AiAuthMode,
  AiCapabilityId,
  AiGatewayCapabilityDescriptor,
  AiModelTier,
  AiProviderId,
  AiTaskType,
  AiTokenUsageSummary
} from '../../packages/shared-types/src/aiGatewayContracts';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';

export type AiGatewayErrorCode =
  | 'UNAUTHENTICATED'
  | 'AUTHORIZATION_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'TENANT_ISOLATION_VIOLATION'
  | 'UNREGISTERED_APPLICATION'
  | 'UNSUPPORTED_CAPABILITY'
  | 'ENTITLEMENT_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'CONCURRENCY_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'INVALID_AI_RESPONSE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE';

export class AiGatewayError extends Error {
  constructor(
    public readonly code: AiGatewayErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

export interface AuthenticatedAiCaller {
  callerType: 'tenant_user' | 'platform_admin' | 'internal_service';
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
  applicationInstanceId: string | null;
  verifiedPrincipal: VerifiedTenantPrincipal;
  authorizedPrincipal?: AuthorizedPrincipal;
  permissions: string[];
}

export interface AiCapabilityPolicy extends AiGatewayCapabilityDescriptor {
  allowedApplications: AiApplicationId[];
  defaultTask: AiTaskType;
  temperature: number;
  allowPlatformAdminOverride: boolean;
  requiresEntitlementCheck: boolean;
}

export interface AiRoutingDecision {
  providerId: AiProviderId;
  modelId: string;
  modelTier: AiModelTier;
  authMode: AiAuthMode;
  strategy: string;
  timeoutMs: number;
  maxRetries: number;
  temperature: number;
  responseMimeType: 'application/json' | 'text/plain';
  taskType: AiTaskType;
  requiresTenantContext: boolean;
  requiresTeacherReview: boolean;
  readOnlyAdvisory: boolean;
}

export interface AiProviderGenerateInput {
  modelId: string;
  contents: string;
  systemInstruction: string;
  responseMimeType: 'application/json' | 'text/plain';
  responseSchema?: unknown;
  temperature: number;
  timeoutMs: number;
  maxRetries: number;
  correlationId: string;
  label: string;
}

export interface AiProviderGenerateResult {
  rawText: string;
  modelId: string;
  authMode: AiAuthMode;
  attemptCount: number;
  latencyMs: number;
  usage: AiTokenUsageSummary;
}

export interface AiProviderAdapter {
  readonly providerId: AiProviderId;
  getAuthMode(): AiAuthMode;
  generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateResult>;
}

export interface TenantAiEntitlementRecord {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  applicationId: AiApplicationId;
  status: 'active' | 'suspended' | 'revoked';
  allowedCapabilities: AiCapabilityId[];
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  maxConcurrentRequests: number;
  expiresAt: string;
}

export interface AiUsageAggregateRecord {
  tenantId: string | null;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalPromptTokens: number | null;
  totalCandidatesTokens: number | null;
  totalTokens: number | null;
  byApplication: Record<string, number>;
  byCapability: Record<string, number>;
  byModel: Record<string, number>;
  recentRequests: Array<{
    requestId: string;
    correlationId: string;
    applicationId: string;
    capability: string;
    taskType: string;
    modelId: string;
    status: string;
    promptTokens: number | null;
    candidatesTokens: number | null;
    totalTokens: number | null;
    latencyMs: number | null;
    createdAt: string;
  }>;
}
