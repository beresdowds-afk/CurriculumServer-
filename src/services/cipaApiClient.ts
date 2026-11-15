import { CipaProvisioningRequestRecord } from '../../server/cipaAgentService';
import { unifiedApiClient } from './unifiedApiClient';

export interface ControlPlaneRequester {
  requestAuthenticatedControlPlane<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
}

export function getCipaApiErrorMessage(error: unknown): string {
  const failure = error as { status?: number; error?: string; message?: string } | null;
  switch (failure?.status) {
    case 401:
      return 'Sign in with an authenticated control-plane session to access CIPA.';
    case 403:
      return 'Your account is not authorized to access this CIPA operation.';
    case 503:
      return failure.error || 'CIPA is unavailable because required control-plane dependencies are not configured.';
    case 0:
      return 'CIPA could not reach the server. Check your connection and try again.';
    default:
      return failure?.error || failure?.message || 'CIPA request failed.';
  }
}

export class CipaApiClient {
  constructor(private readonly requester: ControlPlaneRequester = unifiedApiClient) {}

  async getRequests(): Promise<CipaProvisioningRequestRecord[]> {
    const response = await this.requester.requestAuthenticatedControlPlane<ApiEnvelope<CipaProvisioningRequestRecord[]>>(
      '/api/v1/agent/requests',
      { method: 'GET' }
    );
    if (!response.success || !Array.isArray(response.data)) {
      throw new Error('CIPA returned an invalid request-list response.');
    }
    return response.data;
  }

  async createRequest(prompt: string): Promise<CipaProvisioningRequestRecord> {
    const response = await this.requester.requestAuthenticatedControlPlane<ApiEnvelope<CipaProvisioningRequestRecord>>(
      '/api/v1/agent/requests',
      { method: 'POST', body: JSON.stringify({ prompt }) }
    );
    if (!response.success || !response.data) {
      throw new Error('CIPA did not accept the request.');
    }
    return response.data;
  }
}

export const cipaApiClient = new CipaApiClient();
