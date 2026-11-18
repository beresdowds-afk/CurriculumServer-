import { GoogleGenAI } from '@google/genai';
import type { AiAuthMode, AiProviderId, AiTokenUsageSummary } from '../../packages/shared-types/src/aiGatewayContracts';
import { resolveGeminiRuntimeConfig, type GeminiRuntimeConfig } from './modelConfig';
import { AiGatewayError, type AiProviderAdapter, type AiProviderGenerateInput, type AiProviderGenerateResult } from './types';

export interface GeminiRawResponse {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GeminiTransport {
  generateContent(
    config: GeminiRuntimeConfig,
    params: {
      model: string;
      contents: string;
      config: {
        systemInstruction: string;
        temperature: number;
        responseMimeType?: string;
        responseSchema?: unknown;
      };
    }
  ): Promise<GeminiRawResponse>;
}

const defaultGeminiTransport: GeminiTransport = {
  async generateContent(runtimeCfg, params) {
    if (runtimeCfg.authMode === 'unconfigured') {
      throw new AiGatewayError(
        'PROVIDER_UNAVAILABLE',
        'GEMINI_API_KEY is not configured and Google Cloud Vertex AI ADC environment is not configured.',
        503,
        { authMode: runtimeCfg.authMode }
      );
    }

    const client = runtimeCfg.authMode === 'api_key'
      ? new GoogleGenAI({
          apiKey: runtimeCfg.apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        })
      : new GoogleGenAI({
          vertexai: true,
          project: runtimeCfg.gcpProjectId,
          location: runtimeCfg.gcpLocation,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

    const response = await client.models.generateContent({
      model: params.model,
      contents: params.contents,
      config: {
        systemInstruction: params.config.systemInstruction,
        temperature: params.config.temperature,
        ...(params.config.responseMimeType ? { responseMimeType: params.config.responseMimeType } : {}),
        ...(params.config.responseSchema ? { responseSchema: params.config.responseSchema } : {})
      }
    });

    return {
      text: response.text,
      usageMetadata: response.usageMetadata as GeminiRawResponse['usageMetadata']
    };
  }
};

function isNonRetryableProviderError(err: unknown): boolean {
  if (err instanceof AiGatewayError) {
    return err.code === 'VALIDATION_ERROR' || err.code === 'PROVIDER_UNAVAILABLE' && err.details?.authMode === 'unconfigured';
  }
  const message = err instanceof Error ? err.message : String(err);
  return /API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|400 Bad Request|401 Unauthorized|403 Forbidden|GEMINI_API_KEY is not configured/i.test(message);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new AiGatewayError(
              'PROVIDER_TIMEOUT',
              `Google Gemini provider timed out after ${timeoutMs}ms (${label}).`,
              504,
              { timeoutMs, label }
            )
          );
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function extractAuthenticUsage(meta?: GeminiRawResponse['usageMetadata']): AiTokenUsageSummary {
  if (!meta) {
    return {
      promptTokens: null,
      candidatesTokens: null,
      totalTokens: null,
      costMetadataAvailable: false,
      estimatedCostUsd: null
    };
  }
  const promptTokens = typeof meta.promptTokenCount === 'number' ? meta.promptTokenCount : null;
  const candidatesTokens = typeof meta.candidatesTokenCount === 'number' ? meta.candidatesTokenCount : null;
  const totalTokens = typeof meta.totalTokenCount === 'number'
    ? meta.totalTokenCount
    : (promptTokens !== null && candidatesTokens !== null ? promptTokens + candidatesTokens : null);

  return {
    promptTokens,
    candidatesTokens,
    totalTokens,
    costMetadataAvailable: false,
    estimatedCostUsd: null
  };
}

export class GoogleGeminiProviderAdapter implements AiProviderAdapter {
  readonly providerId: AiProviderId = 'GOOGLE_GEMINI';

  constructor(
    private readonly transport: GeminiTransport = defaultGeminiTransport,
    private readonly getEnv: () => NodeJS.ProcessEnv = () => process.env
  ) {}

  getAuthMode(): AiAuthMode {
    return resolveGeminiRuntimeConfig(this.getEnv()).authMode;
  }

  async generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateResult> {
    const runtimeCfg = resolveGeminiRuntimeConfig(this.getEnv());
    if (runtimeCfg.authMode === 'unconfigured') {
      throw new AiGatewayError(
        'PROVIDER_UNAVAILABLE',
        'GEMINI_API_KEY is not configured and Google Cloud Vertex AI ADC environment is not configured.',
        503,
        { authMode: 'unconfigured' }
      );
    }

    const startedAt = Date.now();
    let lastError: unknown;
    const maxAttempts = Math.max(1, Math.min(5, input.maxRetries));

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const raw = await withTimeout(
          this.transport.generateContent(runtimeCfg, {
            model: input.modelId,
            contents: input.contents,
            config: {
              systemInstruction: input.systemInstruction,
              temperature: input.temperature,
              ...(input.responseMimeType === 'application/json'
                ? {
                    responseMimeType: 'application/json',
                    ...(input.responseSchema ? { responseSchema: input.responseSchema } : {})
                  }
                : {})
            }
          }),
          input.timeoutMs,
          `${input.label}:attempt_${attempt}`
        );

        const rawText = (raw?.text || '').trim();
        if (!rawText) {
          throw new AiGatewayError(
            'INVALID_AI_RESPONSE',
            `Google Gemini returned an empty response for ${input.label}.`,
            502
          );
        }

        return {
          rawText,
          modelId: input.modelId,
          authMode: runtimeCfg.authMode,
          attemptCount: attempt,
          latencyMs: Math.max(1, Date.now() - startedAt),
          usage: extractAuthenticUsage(raw.usageMetadata)
        };
      } catch (err) {
        lastError = err;
        if (isNonRetryableProviderError(err) || attempt === maxAttempts) {
          if (err instanceof AiGatewayError) throw err;
          throw new AiGatewayError(
            'PROVIDER_UNAVAILABLE',
            err instanceof Error ? err.message : 'Google Gemini provider request failed.',
            502,
            { attemptCount: attempt }
          );
        }
        const backoffMs = Math.min(3000, 150 * Math.pow(2, attempt - 1));
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError instanceof AiGatewayError
      ? lastError
      : new AiGatewayError('PROVIDER_UNAVAILABLE', 'Google Gemini provider failed.', 502);
  }
}
