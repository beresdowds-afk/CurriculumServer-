import { 
  TenantSchoolApp, 
  OptionalFeatureKey, 
  FeatureEntitlementState, 
  TenantResourcePolicy,
  CurriculumFlowBundleKey 
} from '../types';
import { TenantSecurityContextManager } from './tenantSecurityContext';

export interface EntitlementCheckResult {
  allowed: boolean;
  featureKey?: string;
  reason?: string;
  planRequired?: string;
  upgradeRequired: boolean;
  currentUsage?: number;
  quotaLimit?: number;
  softCapWarning?: boolean;
}

export interface TenantUsageTracker {
  tenantId: string;
  currentCycleStart: string;
  aiTokensUsed: number;
  aiExamsGeneratedCount: number;
  activeStudentsCount: number;
  activeTeachersCount: number;
  storageUsedMb: number;
  backgroundJobsQueuedToday: number;
  apiRequestsThisMinute: number;
  lastRequestTimestamp: number;
}

// In-memory tenant usage ledger for real-time quota guard
const TENANT_USAGE_LEDGER = new Map<string, TenantUsageTracker>();

// Default tier resource policies
export const DEFAULT_PLAN_POLICIES: Record<string, TenantResourcePolicy> = {
  Starter: {
    cpuLimitCores: 1,
    memoryLimitMb: 1024,
    storageQuotaMb: 5120, // 5 GB
    rateLimitReqPerMin: 120,
    maxConcurrentBackgroundJobs: 2,
    aiMonthlyTokenLimit: 250000,
    aiTokensUsedCurrentCycle: 0,
    aiExamsGeneratedCount: 0,
    maxStudentsLimit: 300,
    maxTeachersLimit: 25,
  },
  Pro: {
    cpuLimitCores: 2,
    memoryLimitMb: 2048,
    storageQuotaMb: 20480, // 20 GB
    rateLimitReqPerMin: 300,
    maxConcurrentBackgroundJobs: 5,
    aiMonthlyTokenLimit: 1000000,
    aiTokensUsedCurrentCycle: 0,
    aiExamsGeneratedCount: 0,
    maxStudentsLimit: 1200,
    maxTeachersLimit: 80,
  },
  Enterprise: {
    cpuLimitCores: 4,
    memoryLimitMb: 4096,
    storageQuotaMb: 102400, // 100 GB
    rateLimitReqPerMin: 600,
    maxConcurrentBackgroundJobs: 12,
    aiMonthlyTokenLimit: 5000000,
    aiTokensUsedCurrentCycle: 0,
    aiExamsGeneratedCount: 0,
    maxStudentsLimit: 5000,
    maxTeachersLimit: 300,
  },
  'Apex Enterprise': {
    cpuLimitCores: 8,
    memoryLimitMb: 8192,
    storageQuotaMb: 512000, // 500 GB
    rateLimitReqPerMin: 1500,
    maxConcurrentBackgroundJobs: 30,
    aiMonthlyTokenLimit: 20000000,
    aiTokensUsedCurrentCycle: 0,
    aiExamsGeneratedCount: 0,
    maxStudentsLimit: 20000,
    maxTeachersLimit: 1500,
  }
};

export class EntitlementEnforcementService {
  /**
   * Initializes or returns the usage tracker for a given tenant
   */
  static getUsageTracker(tenantId: string): TenantUsageTracker {
    if (!TENANT_USAGE_LEDGER.has(tenantId)) {
      TENANT_USAGE_LEDGER.set(tenantId, {
        tenantId,
        currentCycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        aiTokensUsed: Math.floor(Math.random() * 45000) + 12000,
        aiExamsGeneratedCount: Math.floor(Math.random() * 12) + 2,
        activeStudentsCount: 650,
        activeTeachersCount: 42,
        storageUsedMb: 1840,
        backgroundJobsQueuedToday: 8,
        apiRequestsThisMinute: 0,
        lastRequestTimestamp: Date.now()
      });
    }
    return TENANT_USAGE_LEDGER.get(tenantId)!;
  }

  /**
   * Validates if a tenant is entitled to use an optional or core feature
   */
  static checkFeatureEntitlement(
    tenant: TenantSchoolApp,
    featureKey: OptionalFeatureKey
  ): EntitlementCheckResult {
    // 1. Check tenant active status
    if (tenant.status !== 'active') {
      return {
        allowed: false,
        featureKey,
        reason: `Tenant is ${tenant.status}. Features are locked.`,
        upgradeRequired: false
      };
    }

    // 2. Check feature state
    const isExplicitlyEnabled = Boolean(tenant.enabledFeatures && tenant.enabledFeatures[featureKey]);
    
    // Core features always allowed for active tenants
    const coreDefaultFeatures: OptionalFeatureKey[] = [
      'ai_curriculum_advisor',
      'bursary_psp_multi_split',
      'parent_ward_security_hub'
    ];

    if (coreDefaultFeatures.includes(featureKey) || isExplicitlyEnabled) {
      return {
        allowed: true,
        featureKey,
        upgradeRequired: false
      };
    }

    // Determine required tier for helpful upgrade prompt
    let requiredPlan = 'Pro';
    if (featureKey === 'custom_domain_whitelabel' || featureKey === 'hybrid_offline_sync') {
      requiredPlan = 'Enterprise';
    }

    TenantSecurityContextManager.recordViolation({
      violationType: 'UNAUTHORIZED_FEATURE_ACCESS',
      sourceTenantId: tenant.id,
      actorIp: '127.0.0.1',
      endpoint: `/api/v1/feature/${featureKey}`,
      payloadSummary: `Tenant ${tenant.schoolName} attempted to invoke unlicensed feature: ${featureKey}`,
      severity: 'MEDIUM',
      blocked: true
    });

    return {
      allowed: false,
      featureKey,
      reason: `Feature '${featureKey}' is not included in your current subscription tier (${tenant.subscriptionTier}).`,
      planRequired: requiredPlan,
      upgradeRequired: true
    };
  }

  /**
   * Quota Guard: Enforces AI Token Consumption limits per subscription cycle
   */
  static checkAiTokenQuota(tenant: TenantSchoolApp, requestedTokens: number = 2000): EntitlementCheckResult {
    const policy = DEFAULT_PLAN_POLICIES[tenant.subscriptionTier] || DEFAULT_PLAN_POLICIES.Starter;
    const usage = this.getUsageTracker(tenant.id);

    const projectedUsage = usage.aiTokensUsed + requestedTokens;
    const limit = policy.aiMonthlyTokenLimit;

    if (projectedUsage > limit) {
      return {
        allowed: false,
        reason: `Monthly AI token quota exceeded (${usage.aiTokensUsed.toLocaleString()} / ${limit.toLocaleString()} tokens). Please upgrade your plan or purchase an AI capacity boost.`,
        upgradeRequired: true,
        currentUsage: usage.aiTokensUsed,
        quotaLimit: limit
      };
    }

    // Check soft-cap warning (85% usage threshold)
    const isSoftCapped = projectedUsage >= (limit * 0.85);

    return {
      allowed: true,
      currentUsage: usage.aiTokensUsed,
      quotaLimit: limit,
      softCapWarning: isSoftCapped,
      upgradeRequired: false
    };
  }

  /**
   * Helper checkQuotaGuard for isolation tests and verification suites
   */
  static checkQuotaGuard(tenantId: string, tier: string, tokensRequested: number = 500): { allowed: boolean; isSoftCapped: boolean; plan: string; monthlyQuota: number } {
    const policy = DEFAULT_PLAN_POLICIES[tier] || DEFAULT_PLAN_POLICIES['Starter Academy'] || DEFAULT_PLAN_POLICIES.Starter;
    const usage = this.getUsageTracker(tenantId);
    const projected = usage.aiTokensUsed + tokensRequested;
    const allowed = projected <= policy.aiMonthlyTokenLimit;
    const isSoftCapped = projected >= (policy.aiMonthlyTokenLimit * 0.8);
    return {
      allowed,
      isSoftCapped,
      plan: tier,
      monthlyQuota: policy.aiMonthlyTokenLimit
    };
  }

  /**
   * Records AI token consumption upon successful completion of a generation request
   */
  static recordAiTokenUsage(tenantId: string, tokensConsumed: number): void {
    const usage = this.getUsageTracker(tenantId);
    usage.aiTokensUsed += tokensConsumed;
  }

  /**
   * Quota Guard: Enforces student enrollment capacity limits
   */
  static checkStudentCapacityQuota(tenant: TenantSchoolApp, newStudentCount: number): EntitlementCheckResult {
    const policy = DEFAULT_PLAN_POLICIES[tenant.subscriptionTier] || DEFAULT_PLAN_POLICIES.Starter;
    const usage = this.getUsageTracker(tenant.id);

    const projectedTotal = (tenant.activeStudentsCount || usage.activeStudentsCount) + newStudentCount;
    if (projectedTotal > policy.maxStudentsLimit) {
      return {
        allowed: false,
        reason: `School student enrollment limit reached (${projectedTotal} / ${policy.maxStudentsLimit} students on ${tenant.subscriptionTier} tier).`,
        upgradeRequired: true,
        currentUsage: tenant.activeStudentsCount || usage.activeStudentsCount,
        quotaLimit: policy.maxStudentsLimit
      };
    }

    return {
      allowed: true,
      currentUsage: tenant.activeStudentsCount || usage.activeStudentsCount,
      quotaLimit: policy.maxStudentsLimit,
      upgradeRequired: false
    };
  }

  /**
   * Rate Limiter: Protects against noisy neighbor request floods per minute
   */
  static checkRateLimit(tenantId: string, tier: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
    const policy = DEFAULT_PLAN_POLICIES[tier] || DEFAULT_PLAN_POLICIES.Starter;
    const usage = this.getUsageTracker(tenantId);
    const now = Date.now();

    // Reset window every 60 seconds
    if (now - usage.lastRequestTimestamp > 60000) {
      usage.apiRequestsThisMinute = 0;
      usage.lastRequestTimestamp = now;
    }

    usage.apiRequestsThisMinute++;

    const maxLimit = policy.rateLimitReqPerMin;
    const remaining = Math.max(0, maxLimit - usage.apiRequestsThisMinute);
    const resetInSeconds = Math.ceil((60000 - (now - usage.lastRequestTimestamp)) / 1000);

    if (usage.apiRequestsThisMinute > maxLimit) {
      return { allowed: false, remaining: 0, resetInSeconds };
    }

    return { allowed: true, remaining, resetInSeconds };
  }
}
