import type { AiTaskType } from '../../packages/shared-types/src/aiGatewayContracts';
import {
  resolveGeminiRuntimeConfig,
  resolveModelForTier
} from './modelConfig';
import { AiGatewayError, type AiCapabilityPolicy, type AiRoutingDecision } from './types';

export interface RouteRequestInput {
  policy: AiCapabilityPolicy;
  requestedTask?: AiTaskType;
  modelOverride?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Policy-driven Intelligent AI Request Router.
 * Selects provider, tier, model, response format, retry/timeout budget, and governance flags
 * from registered capability policies rather than brittle inline conditional trees.
 */
export class IntelligentAiRequestRouter {
  route(input: RouteRequestInput): AiRoutingDecision {
    const env = input.env || process.env;
    const cfg = resolveGeminiRuntimeConfig(env);
    const taskType = input.requestedTask || input.policy.defaultTask;

    let selectedModel = resolveModelForTier(input.policy.defaultModelTier, env);
    let strategy = `policy_tier:${input.policy.defaultModelTier}`;

    if (taskType === 'curriculum_tutor') {
      // Lightweight academic Q&A defaults to fast tier unless explicit override
      selectedModel = resolveModelForTier('fast', env);
      strategy = 'task_optimized:fast_curriculum_qa';
    } else if (
      taskType === 'textbook_outline' ||
      taskType === 'textbook_chapter' ||
      taskType === 'secure_exam' ||
      taskType === 'marking_scheme' ||
      taskType === 'cbt_paper' ||
      taskType === 'provisioning_recommend'
    ) {
      selectedModel = resolveModelForTier('standard', env);
      strategy = `high_rigor_structured:${input.policy.capability.toLowerCase()}`;
    }

    if (input.modelOverride && input.modelOverride.trim()) {
      throw new AiGatewayError(
        'VALIDATION_ERROR',
        'Model selection is controlled by backend AI policy.',
        400
      );
    }

    return {
      providerId: 'GOOGLE_GEMINI',
      modelId: selectedModel,
      modelTier: input.policy.defaultModelTier,
      authMode: cfg.authMode,
      strategy,
      timeoutMs: cfg.timeoutMs,
      maxRetries: cfg.maxRetries,
      temperature: input.policy.temperature,
      responseMimeType: taskType === 'curriculum_tutor' ? 'text/plain' : 'application/json',
      taskType,
      requiresTenantContext: input.policy.requiresTenantContext,
      requiresTeacherReview: input.policy.requiresTeacherReview,
      readOnlyAdvisory: input.policy.readOnlyAdvisory
    };
  }
}

export const defaultAiRequestRouter = new IntelligentAiRequestRouter();
