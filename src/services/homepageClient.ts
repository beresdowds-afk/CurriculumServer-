import { 
  HomepageConfiguration, 
  HomepageTemplateDefinition, 
  HomepageVersionRecord,
  LandingFooterAppKey,
  LandingFooterConfig,
  FooterEditableFields,
  ProvisionedInstanceSummary
} from '../types/homepageEngine';
import {
  createDefaultLandingFooter,
  createDefaultPresetConfiguration
} from '../data/homepageTemplatesData';
import { INITIAL_PROVISIONED_TENANTS, INITIAL_CLONED_TENANTS } from '../mockCurriculumServerData';
import { unifiedApiClient } from './unifiedApiClient';

const PLATFORM_FOOTER_STORAGE_PREFIX = 'cs_landing_footer_';
const INSTANCE_HOMEPAGE_OVERRIDE_PREFIX = 'cs_instance_homepage_override_';
const PLATFORM_FOOTER_EVENT = 'cs_landing_footer_updated';
const INSTANCE_FOOTER_EVENT = 'cs_instance_homepage_updated';

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors cleanly
  }
}

function emitBrowserEvent(name: string, detail: unknown): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // Safe fallback for restricted environments
  }
}

export function formatFooterAddress(contact?: { addressText?: string; city?: string; state?: string }): string {
  if (!contact) return '';
  return [contact.addressText, contact.city, contact.state]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function buildFallbackInstances(): ProvisionedInstanceSummary[] {
  const seen = new Set<string>();
  const combined = [...INITIAL_PROVISIONED_TENANTS, ...INITIAL_CLONED_TENANTS];
  const list: ProvisionedInstanceSummary[] = [];

  for (const tenant of combined) {
    if (!tenant.id || seen.has(tenant.id)) continue;
    seen.add(tenant.id);
    const override = readStorage<HomepageConfiguration>(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${tenant.id}`);
    const base = override || createDefaultPresetConfiguration(
      tenant.id,
      tenant.id,
      tenant.schoolSlug,
      tenant.schoolName,
      'secondary_school',
      'premium_academic',
      tenant.customDomain || tenant.subdomain
    );
    if (!override && tenant.principalEmail) base.contact.primaryEmail = tenant.principalEmail;
    if (!override && tenant.principalPhone) base.contact.primaryPhone = tenant.principalPhone;

    list.push({
      instanceId: base.instanceId,
      tenantId: base.tenantId,
      schoolSlug: base.schoolSlug,
      institutionName: base.branding.institutionName,
      domain: base.domain,
      templateId: base.templateId,
      presetType: base.presetType,
      status: base.status,
      versionNumber: base.versionNumber,
      updatedAt: base.updatedAt,
      copyrightText: base.contact.copyrightText || `© ${new Date().getFullYear()} ${base.branding.institutionName}. All rights reserved.`,
      institutionalAddress: formatFooterAddress(base.contact),
      email: base.contact.primaryEmail,
      phoneNumber: base.contact.primaryPhone
    });
  }

  return list;
}

export class HomepageClient {
  private static instance: HomepageClient;

  private constructor() {}

  public static getInstance(): HomepageClient {
    if (!HomepageClient.instance) {
      HomepageClient.instance = new HomepageClient();
    }
    return HomepageClient.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = unifiedApiClient.getActiveToken() ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('cs_tenant_token') : null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private hasActiveAuthToken(): boolean {
    const token = unifiedApiClient.getActiveToken() ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('cs_tenant_token') : null);
    return Boolean(token);
  }

  // ---------------------------------------------------------------------------
  // PLATFORM LANDING FOOTER (Curriculum Server & Curriculum Flow)
  // ---------------------------------------------------------------------------
  public getCachedPlatformFooter(appKey: LandingFooterAppKey): LandingFooterConfig {
    const cached = readStorage<LandingFooterConfig>(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`);
    return cached || createDefaultLandingFooter(appKey);
  }

  public async getPlatformFooter(appKey: LandingFooterAppKey): Promise<LandingFooterConfig> {
    const cached = readStorage<LandingFooterConfig>(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`);
    try {
      const res = await fetch(`/api/v1/landing-footer/${encodeURIComponent(appKey)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const serverCfg = json.data as LandingFooterConfig;
          if (!cached || Date.parse(serverCfg.updatedAt) >= Date.parse(cached.updatedAt)) {
            writeStorage(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`, serverCfg);
            return serverCfg;
          }
        }
      }
    } catch {
      // Fallback to cached/default when offline or during SSR
    }
    return cached || createDefaultLandingFooter(appKey);
  }

  public async updatePlatformFooter(
    appKey: LandingFooterAppKey,
    patch: FooterEditableFields
  ): Promise<{ config: LandingFooterConfig; syncedToServer: boolean }> {
    const nextLocal: LandingFooterConfig = {
      appKey,
      copyrightText: patch.copyrightText.trim(),
      institutionalAddress: patch.institutionalAddress.trim(),
      email: patch.email.trim(),
      phoneNumber: patch.phoneNumber.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: unifiedApiClient.getControlPlaneSession()?.email ||
        unifiedApiClient.getSchoolFlowSession()?.email ||
        'landing_editor'
    };

    writeStorage(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`, nextLocal);
    emitBrowserEvent(PLATFORM_FOOTER_EVENT, nextLocal);

    if (this.hasActiveAuthToken()) {
      try {
        const res = await fetch(`/api/v1/server/landing-footer/${encodeURIComponent(appKey)}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(patch)
        });
        if (res.status === 403) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Not authorized to update platform footer');
        }
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            writeStorage(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`, json.data);
            emitBrowserEvent(PLATFORM_FOOTER_EVENT, json.data);
            return { config: json.data as LandingFooterConfig, syncedToServer: true };
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('authorized')) {
          throw err;
        }
      }
    }

    return { config: nextLocal, syncedToServer: false };
  }

  public async resetPlatformFooter(appKey: LandingFooterAppKey): Promise<LandingFooterConfig> {
    const defaults = createDefaultLandingFooter(appKey);
    removeStorage(`${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}`);
    emitBrowserEvent(PLATFORM_FOOTER_EVENT, defaults);
    if (this.hasActiveAuthToken()) {
      try {
        const res = await this.updatePlatformFooter(appKey, {
          copyrightText: defaults.copyrightText,
          institutionalAddress: defaults.institutionalAddress,
          email: defaults.email,
          phoneNumber: defaults.phoneNumber
        });
        return res.config;
      } catch {
        // Return default cleanly
      }
    }
    return defaults;
  }

  public subscribePlatformFooter(
    appKey: LandingFooterAppKey,
    listener: (config: LandingFooterConfig) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<LandingFooterConfig>).detail;
      if (detail && detail.appKey === appKey) {
        listener(detail);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${PLATFORM_FOOTER_STORAGE_PREFIX}${appKey}` && e.newValue) {
        try {
          listener(JSON.parse(e.newValue) as LandingFooterConfig);
        } catch {
          // Ignore malformed external storage
        }
      }
    };
    window.addEventListener(PLATFORM_FOOTER_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PLATFORM_FOOTER_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }

  // ---------------------------------------------------------------------------
  // PUBLIC & GENERATOR INSTANCE ENDPOINTS
  // ---------------------------------------------------------------------------
  public async getTemplates(): Promise<HomepageTemplateDefinition[]> {
    const res = await fetch('/api/v1/homepage/templates');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load templates');
    return json.data;
  }

  public async resolveDomain(domain: string): Promise<string | null> {
    const res = await fetch(`/api/v1/homepage/resolve?domain=${encodeURIComponent(domain)}`);
    const json = await res.json();
    return json.data?.resolvedInstanceId || null;
  }

  public async getProvisionedInstances(): Promise<ProvisionedInstanceSummary[]> {
    const fallback = buildFallbackInstances();
    try {
      const res = await fetch('/api/v1/homepage/instances');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const map = new Map<string, ProvisionedInstanceSummary>();
          for (const item of json.data as ProvisionedInstanceSummary[]) {
            const override = readStorage<HomepageConfiguration>(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${item.instanceId}`);
            if (override && Date.parse(override.updatedAt) > Date.parse(item.updatedAt)) {
              map.set(item.instanceId, {
                ...item,
                templateId: override.templateId,
                versionNumber: override.versionNumber,
                updatedAt: override.updatedAt,
                copyrightText: override.contact.copyrightText || item.copyrightText,
                institutionalAddress: formatFooterAddress(override.contact) || item.institutionalAddress,
                email: override.contact.primaryEmail || item.email,
                phoneNumber: override.contact.primaryPhone || item.phoneNumber
              });
            } else {
              map.set(item.instanceId, item);
            }
          }
          for (const item of fallback) {
            if (!map.has(item.instanceId)) {
              map.set(item.instanceId, item);
            }
          }
          return Array.from(map.values());
        }
      }
    } catch {
      // Fallback to tenant registry list when backend is unavailable
    }
    return fallback;
  }

  public async getPublicHomepage(instanceIdOrDomain: string): Promise<HomepageConfiguration | null> {
    const localOverride = readStorage<HomepageConfiguration>(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceIdOrDomain}`);
    try {
      const res = await fetch(`/api/v1/homepage/instance/${encodeURIComponent(instanceIdOrDomain)}`);
      if (res.status === 404) {
        return localOverride;
      }
      const json = await res.json();
      if (json.success && json.data) {
        const remote = json.data as HomepageConfiguration;
        if (localOverride && Date.parse(localOverride.updatedAt) > Date.parse(remote.updatedAt)) {
          return localOverride;
        }
        return remote;
      }
    } catch {
      if (localOverride) return localOverride;
    }

    if (localOverride) return localOverride;
    const matchTenant = [...INITIAL_PROVISIONED_TENANTS, ...INITIAL_CLONED_TENANTS].find(
      t => t.id === instanceIdOrDomain || t.schoolSlug === instanceIdOrDomain || t.customDomain === instanceIdOrDomain || t.subdomain === instanceIdOrDomain
    );
    if (matchTenant) {
      return createDefaultPresetConfiguration(
        matchTenant.id,
        matchTenant.id,
        matchTenant.schoolSlug,
        matchTenant.schoolName,
        'secondary_school',
        'premium_academic',
        matchTenant.customDomain || matchTenant.subdomain
      );
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // ADMIN HOMEPAGE & DIRECT FOOTER EDITING
  // ---------------------------------------------------------------------------
  public async getAdminHomepage(instanceId: string): Promise<{
    published: HomepageConfiguration | null;
    draft: HomepageConfiguration | null;
    versions: HomepageVersionRecord[];
  }> {
    if (this.hasActiveAuthToken()) {
      const res = await unifiedApiClient.get<{
        published: HomepageConfiguration | null;
        draft: HomepageConfiguration | null;
        versions: HomepageVersionRecord[];
      }>(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}`, 'school_flow');

      if (res.success && res.data) return res.data;

      const cpRes = await unifiedApiClient.get<{
        published: HomepageConfiguration | null;
        draft: HomepageConfiguration | null;
        versions: HomepageVersionRecord[];
      }>(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}`, 'control_plane');
      if (cpRes.success && cpRes.data) return cpRes.data;
    }

    const publicConfig = await this.getPublicHomepage(instanceId);
    if (publicConfig) {
      const draftCopy: HomepageConfiguration = JSON.parse(JSON.stringify(publicConfig));
      return {
        published: publicConfig,
        draft: draftCopy,
        versions: [
          {
            versionId: `ver_${publicConfig.instanceId}_${publicConfig.versionNumber}`,
            instanceId: publicConfig.instanceId,
            versionNumber: publicConfig.versionNumber,
            configurationSnapshot: JSON.parse(JSON.stringify(publicConfig)),
            publishedBy: publicConfig.updatedBy || 'system_bootstrap',
            publishedAt: publicConfig.publishedAt || publicConfig.updatedAt,
            changelog: 'Active baseline configuration'
          }
        ]
      };
    }

    throw new Error('Failed to fetch homepage configuration');
  }

  public async saveDraft(instanceId: string, draftData: Partial<HomepageConfiguration>): Promise<HomepageConfiguration> {
    if (this.hasActiveAuthToken()) {
      const res = await fetch(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}/draft`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(draftData)
      });
      const json = await res.json();
      if (res.status === 403) {
        throw new Error(json.error || 'Not authorized to save homepage draft');
      }
      if (json.success && json.data) {
        writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, json.data);
        return json.data;
      }
    }

    const existing = await this.getPublicHomepage(instanceId);
    if (!existing) {
      throw new Error(`No instance found for '${instanceId}'`);
    }
    const localDraft: HomepageConfiguration = {
      ...existing,
      ...draftData,
      instanceId: existing.instanceId,
      tenantId: existing.tenantId,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: 'local_preview_editor'
    };
    writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, localDraft);
    emitBrowserEvent(INSTANCE_FOOTER_EVENT, localDraft);
    return localDraft;
  }

  public async updateInstanceFooter(
    instanceId: string,
    patch: FooterEditableFields
  ): Promise<{ config: HomepageConfiguration; syncedToServer: boolean }> {
    const cleanPatch: FooterEditableFields = {
      copyrightText: patch.copyrightText.trim(),
      institutionalAddress: patch.institutionalAddress.trim(),
      email: patch.email.trim(),
      phoneNumber: patch.phoneNumber.trim()
    };

    if (this.hasActiveAuthToken()) {
      const res = await fetch(`/api/v1/server/homepage/${encodeURIComponent(instanceId)}/footer`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(cleanPatch)
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error(json.error || 'Not authorized to update institutional footer');
      }
      if (res.ok && json.success && json.data) {
        writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, json.data);
        emitBrowserEvent(INSTANCE_FOOTER_EVENT, json.data);
        return { config: json.data as HomepageConfiguration, syncedToServer: true };
      }
    }

    const existing = (await this.getPublicHomepage(instanceId)) ||
      createDefaultPresetConfiguration(instanceId, instanceId, instanceId, instanceId, 'secondary_school', 'premium_academic');

    const updatedLocal: HomepageConfiguration = {
      ...existing,
      contact: {
        ...existing.contact,
        addressText: cleanPatch.institutionalAddress,
        city: '',
        state: '',
        primaryEmail: cleanPatch.email,
        primaryPhone: cleanPatch.phoneNumber,
        copyrightText: cleanPatch.copyrightText
      },
      status: 'published',
      versionNumber: (existing.versionNumber || 1) + 1,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'local_footer_editor'
    };

    writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, updatedLocal);
    emitBrowserEvent(INSTANCE_FOOTER_EVENT, updatedLocal);
    return { config: updatedLocal, syncedToServer: false };
  }

  public async publishHomepage(instanceId: string, changelog: string, draftSnapshot?: HomepageConfiguration): Promise<HomepageConfiguration> {
    if (this.hasActiveAuthToken()) {
      if (draftSnapshot) {
        await this.saveDraft(instanceId, draftSnapshot);
      }
      const res = await unifiedApiClient.post<HomepageConfiguration>(
        `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/publish`,
        { changelog },
        'school_flow'
      );
      if (res.data) {
        writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, res.data);
        emitBrowserEvent(INSTANCE_FOOTER_EVENT, res.data);
        return res.data;
      }
      const cpRes = await unifiedApiClient.post<HomepageConfiguration>(
        `/api/v1/server/homepage/${encodeURIComponent(instanceId)}/publish`,
        { changelog },
        'control_plane'
      );
      if (cpRes.data) {
        writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, cpRes.data);
        emitBrowserEvent(INSTANCE_FOOTER_EVENT, cpRes.data);
        return cpRes.data;
      }
    }

    const base = draftSnapshot || (await this.getPublicHomepage(instanceId));
    if (!base) {
      throw new Error('Failed to publish homepage');
    }
    const publishedLocal: HomepageConfiguration = {
      ...base,
      status: 'published',
      versionNumber: (base.versionNumber || 1) + 1,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'local_preview_editor'
    };
    writeStorage(`${INSTANCE_HOMEPAGE_OVERRIDE_PREFIX}${instanceId}`, publishedLocal);
    emitBrowserEvent(INSTANCE_FOOTER_EVENT, publishedLocal);
    return publishedLocal;
  }

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
