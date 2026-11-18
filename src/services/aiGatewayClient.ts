import type {
  AiApplicationId,
  AiCapabilityId,
  AiGatewayCapabilityDescriptor,
  AiGatewayHealthStatus,
  AiGatewayRequestEnvelope,
  AiGatewayResponseEnvelope,
  AiProvisioningRecommendationPayload,
  AiTaskType
} from '../../packages/shared-types/src/aiGatewayContracts';
import { unifiedApiClient } from './unifiedApiClient';

export class AiGatewayClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly correlationId?: string | null
  ) {
    super(message);
    this.name = 'AiGatewayClientError';
  }
}

export interface AiGatewayClientOptions {
  baseUrl?: string;
  getToken?: () => string | null;
  fetchFn?: typeof fetch;
}

/**
 * Unified Frontend Central AI Gateway Client.
 * Routes all Curriculum Server, Curriculum Flow, School Instance, and Provisioning Agent
 * AI requests exclusively through authenticated Unified Backend `/api/ai/v1/*` endpoints.
 * Never embeds Gemini SDKs, API keys, or client-spoofed identity headers.
 */
export class AiGatewayClient {
  private readonly customBaseUrl?: string;
  private readonly getTokenFn: () => string | null;
  private readonly fetchFn: typeof fetch;

  constructor(options: AiGatewayClientOptions = {}) {
    this.customBaseUrl = options.baseUrl;
    this.getTokenFn = options.getToken ?? (() => unifiedApiClient.getActiveToken());
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  private resolveBaseUrl(): string {
    if (this.customBaseUrl) return this.customBaseUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      return (metaEnv?.VITE_API_URL || window.location.origin).replace(/\/$/, '');
    }
    return '';
  }

  private buildHeaders(applicationId?: AiApplicationId, idempotencyKey?: string): Record<string, string> {
    const token = this.getTokenFn();
    if (!token) {
      throw new AiGatewayClientError(
        'Authentication required. Please sign in to access Unified Backend AI Gateway services.',
        401,
        'UNAUTHENTICATED'
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    if (applicationId) {
      headers['X-Application-ID'] = applicationId;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  }

  private async postGateway<TData>(
    path: string,
    envelope: AiGatewayRequestEnvelope
  ): Promise<AiGatewayResponseEnvelope<TData>> {
    const url = `${this.resolveBaseUrl()}${path}`;
    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: this.buildHeaders(envelope.applicationId, envelope.idempotencyKey),
      body: JSON.stringify(envelope)
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok || !body?.success) {
      throw new AiGatewayClientError(
        body?.error || `Central AI Gateway request failed (${res.status}).`,
        res.status,
        body?.code,
        body?.correlationId ?? null
      );
    }

    return body as AiGatewayResponseEnvelope<TData>;
  }

  async generate<TData = unknown>(
    envelope: AiGatewayRequestEnvelope
  ): Promise<AiGatewayResponseEnvelope<TData>> {
    return this.postGateway<TData>('/api/ai/v1/generate', envelope);
  }

  async generateCurriculum<TData = unknown>(input: {
    capability: Extract<AiCapabilityId, 'LESSON_GENERATION' | 'TEXTBOOK_GENERATION' | 'CURRICULUM_CONTENT_GENERATION'>;
    taskType?: AiTaskType;
    payload: Record<string, unknown>;
    applicationId?: AiApplicationId;
    tenantId?: string;
    modelOverride?: string;
  }): Promise<AiGatewayResponseEnvelope<TData>> {
    return this.postGateway<TData>('/api/ai/v1/curriculum/generate', {
      applicationId: input.applicationId || 'CURRICULUM_SERVER',
      capability: input.capability,
      taskType: input.taskType,
      tenantId: input.tenantId,
      modelOverride: input.modelOverride,
      payload: input.payload
    });
  }

  async generateAssessment<TData = unknown>(input: {
    capability: Extract<
      AiCapabilityId,
      | 'EXAMINATION_GENERATION'
      | 'QUESTION_BANK_GENERATION'
      | 'ASSESSMENT_SUPPORT'
      | 'MARKING_ASSISTANCE'
      | 'SCHOOL_EXAMINATION_GENERATION'
      | 'SCHOOL_QUESTION_BANK_GENERATION'
      | 'SCHOOL_ASSESSMENT_GENERATION'
    >;
    taskType?: AiTaskType;
    payload: Record<string, unknown>;
    applicationId?: AiApplicationId;
    tenantId?: string;
    applicationInstanceId?: string;
    modelOverride?: string;
  }): Promise<AiGatewayResponseEnvelope<TData>> {
    const activeTenant = input.tenantId ?? unifiedApiClient.getActiveTenantId() ?? undefined;
    return this.postGateway<TData>('/api/ai/v1/assessments/generate', {
      applicationId: input.applicationId || (activeTenant ? 'CURRICULUM_FLOW' : 'CURRICULUM_FLOW'),
      capability: input.capability,
      taskType: input.taskType,
      tenantId: activeTenant,
      applicationInstanceId: input.applicationInstanceId,
      modelOverride: input.modelOverride,
      payload: input.payload
    });
  }

  async generateCbt<TData = unknown>(input: {
    capability?: Extract<AiCapabilityId, 'CBT_GENERATION' | 'SCHOOL_CBT_GENERATION'>;
    payload: Record<string, unknown>;
    applicationId?: Extract<AiApplicationId, 'CURRICULUM_FLOW' | 'SCHOOL_INSTANCE'>;
    tenantId?: string;
    applicationInstanceId?: string;
  }): Promise<AiGatewayResponseEnvelope<TData>> {
    const activeTenant = input.tenantId ?? unifiedApiClient.getActiveTenantId() ?? undefined;
    return this.postGateway<TData>('/api/ai/v1/cbt/generate', {
      applicationId: input.applicationId || 'CURRICULUM_FLOW',
      capability: input.capability || 'CBT_GENERATION',
      taskType: 'cbt_paper',
      tenantId: activeTenant,
      applicationInstanceId: input.applicationInstanceId,
      payload: input.payload
    });
  }

  async recommendProvisioning(input: {
    capability?: Extract<
      AiCapabilityId,
      | 'SCHOOL_REQUIREMENTS_ANALYSIS'
      | 'ARCHITECTURE_RECOMMENDATION'
      | 'RESOURCE_SIZING_RECOMMENDATION'
      | 'WORKLOAD_ANALYSIS'
    >;
    prompt: string;
  }): Promise<AiGatewayResponseEnvelope<AiProvisioningRecommendationPayload>> {
    return this.postGateway<AiProvisioningRecommendationPayload>('/api/ai/v1/provisioning/recommend', {
      applicationId: 'PROVISIONING_AGENT',
      capability: input.capability || 'ARCHITECTURE_RECOMMENDATION',
      taskType: 'provisioning_recommend',
      payload: { prompt: input.prompt }
    });
  }

  async listCapabilities(applicationId?: AiApplicationId): Promise<AiGatewayCapabilityDescriptor[]> {
    const query = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : '';
    const res = await this.fetchFn(`${this.resolveBaseUrl()}/api/ai/v1/capabilities${query}`, {
      method: 'GET',
      headers: this.buildHeaders(applicationId)
    });
    const body = await res.json();
    if (!res.ok || !body?.success) {
      throw new AiGatewayClientError(body?.error || 'Failed to load AI capabilities', res.status, body?.code);
    }
    return body.capabilities || [];
  }

  async getUsage(tenantId?: string): Promise<Record<string, unknown>> {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const res = await this.fetchFn(`${this.resolveBaseUrl()}/api/ai/v1/usage${query}`, {
      method: 'GET',
      headers: this.buildHeaders()
    });
    const body = await res.json();
    if (!res.ok || !body?.success) {
      throw new AiGatewayClientError(body?.error || 'Failed to load AI usage metrics', res.status, body?.code);
    }
    return body.usage || {};
  }

  async getHealth(): Promise<AiGatewayHealthStatus> {
    const res = await this.fetchFn(`${this.resolveBaseUrl()}/api/ai/v1/health`, { method: 'GET' });
    return (await res.json()) as AiGatewayHealthStatus;
  }
}

export const aiGatewayClient = new AiGatewayClient();
