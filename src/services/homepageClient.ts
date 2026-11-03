import { 
  HomepageConfiguration, 
  HomepageTemplateDefinition, 
  HomepageVersionRecord 
} from '../types/homepageEngine';
import { unifiedApiClient } from './unifiedApiClient';

export class HomepageClient {
  private static instance: HomepageClient;

  private constructor() {}

  public static getInstance(): HomepageClient {
    if (!HomepageClient.instance) {
      HomepageClient.instance = new HomepageClient();
    }
    return HomepageClient.instance;
  }

  // Public: Get all templates
  public async getTemplates(): Promise<HomepageTemplateDefinition[]> {
    const res = await fetch('/api/v1/homepage/templates');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load templates');
    return json.data;
  }

  // Public: Resolve domain/hostname to instance ID
  public async resolveDomain(domain: string): Promise<string | null> {
    const res = await fetch(`/api/v1/homepage/resolve?domain=${encodeURIComponent(domain)}`);
    const json = await res.json();
    return json.data?.resolvedInstanceId || null;
  }

  // Public: Fetch published instance homepage configuration
  public async getPublicHomepage(instanceIdOrDomain: string): Promise<HomepageConfiguration | null> {
    const res = await fetch(`/api/v1/homepage/instance/${encodeURIComponent(instanceIdOrDomain)}`);
    if (res.status === 404) return null;
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch homepage');
    return json.data;
  }

  // Admin: Get draft, published, and version history
  public async getAdminHomepage(instanceId: string): Promise<{
    published: HomepageConfiguration | null;
    draft: HomepageConfiguration | null;
    versions: HomepageVersionRecord[];
  }> {
    const res = await unifiedApiClient.get<{
      published: HomepageConfiguration | null;
      draft: HomepageConfiguration | null;
      versions: HomepageVersionRecord[];
    }>(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}`, 'school_flow');

    if (!res.success || !res.data) {
      // Try control plane auth as fallback
      const cpRes = await unifiedApiClient.get<{
        published: HomepageConfiguration | null;
        draft: HomepageConfiguration | null;
        versions: HomepageVersionRecord[];
      }>(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}`, 'control_plane');
      if (cpRes.success && cpRes.data) return cpRes.data;
      throw new Error(res.error || cpRes.error || 'Failed to fetch homepage configuration');
    }
    return res.data;
  }

  // Admin: Save draft configuration
  public async saveDraft(instanceId: string, draftData: Partial<HomepageConfiguration>): Promise<HomepageConfiguration> {
    const token = unifiedApiClient.getActiveToken() || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('cs_tenant_token') : null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}/draft`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(draftData)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to save draft');
    return json.data;
  }

  // Admin: Publish draft configuration to live version
  public async publishHomepage(instanceId: string, changelog: string): Promise<HomepageConfiguration> {
    const res = await unifiedApiClient.post<HomepageConfiguration>(
      `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/publish`,
      { changelog },
      'school_flow'
    );
    if (res.data) return res.data;
    const cpRes = await unifiedApiClient.post<HomepageConfiguration>(
      `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/publish`,
      { changelog },
      'control_plane'
    );
    if (!cpRes.data) throw new Error(res.error || cpRes.error || 'Failed to publish homepage');
    return cpRes.data;
  }

  // Admin: Rollback to previous version
  public async rollbackVersion(instanceId: string, targetVersionNumber: number): Promise<HomepageConfiguration> {
    const res = await unifiedApiClient.post<HomepageConfiguration>(
      `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/rollback`,
      { targetVersionNumber },
      'school_flow'
    );
    if (res.data) return res.data;
    const cpRes = await unifiedApiClient.post<HomepageConfiguration>(
      `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/rollback`,
      { targetVersionNumber },
      'control_plane'
    );
    if (!cpRes.data) throw new Error(res.error || cpRes.error || 'Failed to rollback homepage');
    return cpRes.data;
  }
}

export const homepageClient = HomepageClient.getInstance();
