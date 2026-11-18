import type { AiAuthMode, AiModelTier } from '../../packages/shared-types/src/aiGatewayContracts';

export const PLATFORM_GCP_ENVIRONMENT = {
  projectId: 'curious-subject-477114-e4',
  projectNumber: '797788066041',
  region: 'europe-west1',
  runtimeServiceAccount: 'backend-runtime@curious-subject-477114-e4.iam.gserviceaccount.com',
  cloudRunServices: [
    'curriculum-server',
    'curriculum-flow',
    'unified-backend',
    'curriculum-provisioning-agent'
  ] as const
} as const;

export const ALLOWED_GEMINI_MODELS = new Set<string>([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite'
]);

const LEGACY_MODEL_UPGRADE_MAP: Record<string, string> = {
  'gemini-3.7-flash': 'gemini-4-hydrogen',
  'gemini-2.5-flash': 'gemini-4-hydrogen',
  'gemini-2.0-flash': 'gemini-4-hydrogen',
  'gemini-1.5-flash': 'gemini-3.1-flash-lite'
};

export interface GeminiRuntimeConfig {
  authMode: AiAuthMode;
  apiKey?: string;
  gcpProjectId: string;
  gcpLocation: string;
  runtimeServiceAccount: string;
  defaultModels: {
    fast: string;
    standard: string;
    reasoning: string;
  };
  timeoutMs: number;
  maxRetries: number;
  maxPromptChars: number;
}

export function normalizeGeminiModelId(candidate: string | undefined, fallback = 'gemini-4-hydrogen'): string {
  const trimmed = (candidate || '').trim();
  if (!trimmed) return fallback;
  if (ALLOWED_GEMINI_MODELS.has(trimmed)) return trimmed;
  if (LEGACY_MODEL_UPGRADE_MAP[trimmed]) return LEGACY_MODEL_UPGRADE_MAP[trimmed];
  return fallback;
}

export function resolveGeminiAuthMode(env: NodeJS.ProcessEnv = process.env): AiAuthMode {
  const apiKey = (env.GEMINI_API_KEY || '').trim();
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    return 'api_key';
  }

  const explicitVertex = (env.GOOGLE_GENAI_USE_VERTEXAI || '').trim().toLowerCase() === 'true';
  const hasGcpProjectEnv = Boolean(
    (env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT || env.PROJECT_ID || '').trim()
  );
  const runningOnCloudRun = Boolean((env.K_SERVICE || '').trim());

  if (explicitVertex || hasGcpProjectEnv || runningOnCloudRun) {
    return 'vertex_ai_adc';
  }

  return 'unconfigured';
}

export function resolveGeminiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): GeminiRuntimeConfig {
  const authMode = resolveGeminiAuthMode(env);
  const apiKey = authMode === 'api_key' ? (env.GEMINI_API_KEY || '').trim() : undefined;
  const gcpProjectId = (
    env.GOOGLE_CLOUD_PROJECT ||
    env.GCP_PROJECT ||
    env.PROJECT_ID ||
    PLATFORM_GCP_ENVIRONMENT.projectId
  ).trim();
  const gcpLocation = (
    env.GOOGLE_CLOUD_LOCATION ||
    env.GCP_LOCATION ||
    PLATFORM_GCP_ENVIRONMENT.region
  ).trim();

  const standardModel = normalizeGeminiModelId(
    env.GEMINI_DEFAULT_MODEL || env.GEMINI_TEXTBOOK_MODEL,
    'gemini-4-hydrogen'
  );
  const fastModel = normalizeGeminiModelId(env.GEMINI_FAST_MODEL, 'gemini-3.1-flash-lite');
  const reasoningModel = normalizeGeminiModelId(env.GEMINI_REASONING_MODEL, 'gemini-4-hydrogen');

  const parsedTimeout = Number(env.GEMINI_GATEWAY_TIMEOUT_MS || env.GEMINI_TEXTBOOK_TIMEOUT_MS || 45000);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 500 && parsedTimeout <= 180000
    ? parsedTimeout
    : 45000;

  const parsedRetries = Number(env.GEMINI_GATEWAY_MAX_RETRIES || env.GEMINI_TEXTBOOK_MAX_RETRIES || 3);
  const maxRetries = Number.isInteger(parsedRetries) && parsedRetries >= 1 && parsedRetries <= 5
    ? parsedRetries
    : 3;

  const parsedMaxPrompt = Number(env.AI_GATEWAY_MAX_PROMPT_CHARS || 48000);
  const maxPromptChars = Number.isFinite(parsedMaxPrompt) && parsedMaxPrompt >= 1000
    ? parsedMaxPrompt
    : 48000;

  return {
    authMode,
    ...(apiKey ? { apiKey } : {}),
    gcpProjectId,
    gcpLocation,
    runtimeServiceAccount: (env.AI_RUNTIME_SERVICE_ACCOUNT || PLATFORM_GCP_ENVIRONMENT.runtimeServiceAccount).trim(),
    defaultModels: {
      fast: fastModel,
      standard: standardModel,
      reasoning: reasoningModel
    },
    timeoutMs,
    maxRetries,
    maxPromptChars
  };
}

export function resolveModelForTier(tier: AiModelTier, env: NodeJS.ProcessEnv = process.env): string {
  const cfg = resolveGeminiRuntimeConfig(env);
  return cfg.defaultModels[tier];
}
