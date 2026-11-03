import fs from 'fs';
import path from 'path';
import { 
  HomepageConfiguration, 
  HomepageVersionRecord, 
  HomepageAuditRecord, 
  HomepageTemplateDefinition,
  InstitutionPresetType,
  HomepageTemplateId
} from '../src/types/homepageEngine';
import { HOMEPAGE_TEMPLATES, createDefaultPresetConfiguration } from '../src/data/homepageTemplatesData';
import { serverSchoolManager } from './serverSchoolManager';
import { customerOnboardingManager } from './customerOnboardingManager';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';

const DATA_DIR = path.join(process.cwd(), 'data');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage_configurations.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'homepage_versions.json');
const AUDIT_FILE = path.join(DATA_DIR, 'homepage_audit_logs.json');

export class HomepageEngineManager {
  private static instance: HomepageEngineManager;
  private configurations: Map<string, HomepageConfiguration> = new Map();
  private drafts: Map<string, HomepageConfiguration> = new Map();
  private versions: HomepageVersionRecord[] = [];
  private auditLogs: HomepageAuditRecord[] = [];

  private constructor() {
    this.ensureDataDir();
    this.loadPersistence();
  }

  public static getInstance(): HomepageEngineManager {
    if (!HomepageEngineManager.instance) {
      HomepageEngineManager.instance = new HomepageEngineManager();
    }
    return HomepageEngineManager.instance;
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadPersistence(): void {
    try {
      if (fs.existsSync(HOMEPAGE_FILE)) {
        const raw: HomepageConfiguration[] = JSON.parse(fs.readFileSync(HOMEPAGE_FILE, 'utf8'));
        raw.forEach(cfg => {
          this.configurations.set(cfg.instanceId, cfg);
          // Draft defaults to published initially
          this.drafts.set(cfg.instanceId, JSON.parse(JSON.stringify(cfg)));
        });
      } else {
        this.seedInitialConfigurations();
      }

      if (fs.existsSync(VERSIONS_FILE)) {
        this.versions = JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8'));
      }

      if (fs.existsSync(AUDIT_FILE)) {
        this.auditLogs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('Error loading homepage persistence, falling back to seed:', err);
      this.seedInitialConfigurations();
    }
  }

  private seedInitialConfigurations(): void {
    // Seed initial provisioned tenants
    const initialInstances = [
      {
        instanceId: 'tenant-apex-01',
        tenantId: 'tenant-apex-01',
        schoolSlug: 'apex',
        name: 'Apex Comprehensive College, Ikeja',
        preset: 'secondary_school' as InstitutionPresetType,
        template: 'premium_academic' as HomepageTemplateId,
        domain: 'apexcollege.sch.ng'
      },
      {
        instanceId: 'tenant-greenfield-01',
        tenantId: 'tenant-greenfield-01',
        schoolSlug: 'greenfield',
        name: 'Greenfield International Academy, Abuja',
        preset: 'secondary_school' as InstitutionPresetType,
        template: 'vibrant_community' as HomepageTemplateId,
        domain: 'greenfield.sch.ng'
      },
      {
        instanceId: 'inst_cust_002',
        tenantId: 'cust_abeokuta_grammar',
        schoolSlug: 'ags',
        name: 'Abeokuta Grammar School (Est. 1908)',
        preset: 'secondary_school' as InstitutionPresetType,
        template: 'editorial_magazine' as HomepageTemplateId,
        domain: 'abeokutagrammar.sch.ng'
      },
      {
        instanceId: 'inst_cbt_003',
        tenantId: 'cust_waec_neco_cbt',
        schoolSlug: 'cbt-center',
        name: 'Federal Joint CBT Examination Center',
        preset: 'examination_org' as InstitutionPresetType,
        template: 'tech_driven' as HomepageTemplateId,
        domain: 'cbt.curriculumflow.com.ng'
      }
    ];

    initialInstances.forEach(item => {
      const cfg = createDefaultPresetConfiguration(
        item.instanceId,
        item.tenantId,
        item.schoolSlug,
        item.name,
        item.preset,
        item.template,
        item.domain
      );
      this.configurations.set(item.instanceId, cfg);
      this.drafts.set(item.instanceId, JSON.parse(JSON.stringify(cfg)));

      // Snapshot initial version
      this.versions.push({
        versionId: `ver_${item.instanceId}_1`,
        instanceId: item.instanceId,
        versionNumber: 1,
        configurationSnapshot: JSON.parse(JSON.stringify(cfg)),
        publishedBy: 'system_bootstrap',
        publishedAt: new Date().toISOString(),
        changelog: 'Initial baseline publication'
      });
    });

    this.saveConfigurations();
    this.saveVersions();
  }

  private saveConfigurations(): void {
    try {
      const arr = Array.from(this.configurations.values());
      fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save homepage configurations:', err);
    }
  }

  private saveVersions(): void {
    try {
      fs.writeFileSync(VERSIONS_FILE, JSON.stringify(this.versions, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save homepage versions:', err);
    }
  }

  private saveAuditLogs(): void {
    try {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.auditLogs, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save homepage audit logs:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC RESOLUTION (Strictly returns published, tenant-isolated configuration)
  // ---------------------------------------------------------------------------
  public resolveInstanceByDomain(hostname: string): string | null {
    const cleanHost = hostname.toLowerCase().trim().replace(/:\d+$/, ''); // strip port
    
    // Check custom domains & subdomains
    for (const [instanceId, cfg] of this.configurations.entries()) {
      if (cfg.domain && cfg.domain.toLowerCase() === cleanHost) {
        return instanceId;
      }
      if (cfg.schoolSlug && `${cfg.schoolSlug.toLowerCase()}.curriculumflow.com.ng` === cleanHost) {
        return instanceId;
      }
      if (cfg.schoolSlug && `${cfg.schoolSlug.toLowerCase()}.curriculumserver.com.ng` === cleanHost) {
        return instanceId;
      }
    }

    // Check registered school manager tenants
    const tenants = serverSchoolManager.getTenants();
    const match = tenants.find(t => 
      t.customDomain?.toLowerCase() === cleanHost ||
      t.subdomain?.toLowerCase() === cleanHost ||
      t.schoolSlug?.toLowerCase() === cleanHost ||
      `${t.schoolSlug?.toLowerCase()}.curriculumflow.com.ng` === cleanHost
    );

    return match ? match.id : null;
  }

  public getPublicHomepage(instanceIdOrDomain: string): HomepageConfiguration | null {
    let instanceId = instanceIdOrDomain;
    
    // Check if passed string is a domain
    if (instanceIdOrDomain.includes('.')) {
      const resolved = this.resolveInstanceByDomain(instanceIdOrDomain);
      if (resolved) instanceId = resolved;
    }

    // Try finding by instanceId or tenantId or schoolSlug
    let cfg = this.configurations.get(instanceId);
    if (!cfg) {
      for (const c of this.configurations.values()) {
        if (c.tenantId === instanceId || c.schoolSlug === instanceId || c.domain === instanceId) {
          cfg = c;
          break;
        }
      }
    }

    // If not found, check if tenant exists in serverSchoolManager and dynamically bootstrap
    if (!cfg) {
      const tenant = serverSchoolManager.getTenants().find(t => t.id === instanceId || t.schoolSlug === instanceId);
      if (tenant) {
        cfg = createDefaultPresetConfiguration(
          tenant.id,
          tenant.id,
          tenant.schoolSlug,
          tenant.schoolName,
          'secondary_school',
          'premium_academic',
          tenant.customDomain || tenant.subdomain
        );
        this.configurations.set(tenant.id, cfg);
        this.drafts.set(tenant.id, JSON.parse(JSON.stringify(cfg)));
        this.saveConfigurations();
      }
    }

    if (!cfg) return null;

    // Filter sections based on instance's enabled features!
    const filteredSections = this.filterSectionsByFeatureEntitlement(cfg.instanceId, cfg.sections);

    // Deep copy and sanitize (do NOT return draft content to public)
    const sanitized: HomepageConfiguration = {
      ...cfg,
      sections: filteredSections,
      status: 'published'
    };

    return sanitized;
  }

  private filterSectionsByFeatureEntitlement(instanceId: string, sections: any[]): any[] {
    // Check tenant features
    const tenant = serverSchoolManager.getTenants().find(t => t.id === instanceId) as any;
    const enabledFeatures: string[] = tenant?.enabledOptionalFeatures || tenant?.enabledFeatures || [
      'ai_curriculum_advisor',
      'biometric_rfid_gate',
      'spanner_audit_trail',
      'parent_ward_security_hub'
    ];

    return sections.filter(sec => {
      if (!sec.enabled) return false;
      if (!sec.requiredFeatureKey) return true;
      return enabledFeatures.includes(sec.requiredFeatureKey);
    });
  }

  // ---------------------------------------------------------------------------
  // ADMINISTRATIVE WORKFLOW (Drafts, Previews, Publishing & Rollback)
  // ---------------------------------------------------------------------------
  public getAdminHomepage(instanceId: string, actorContext?: { role: string; tenantId: string }): {
    published: HomepageConfiguration | null;
    draft: HomepageConfiguration | null;
    versions: HomepageVersionRecord[];
  } {
    // Enforce tenant isolation: actor must be super_admin or belong to instanceId
    if (actorContext && actorContext.role !== 'super_admin' && actorContext.tenantId !== instanceId) {
      throw new Error(`ACCESS_DENIED: Tenant '${actorContext.tenantId}' cannot access configuration of '${instanceId}'`);
    }

    const published = this.configurations.get(instanceId) || null;
    let draft = this.drafts.get(instanceId) || null;

    if (!draft && published) {
      draft = JSON.parse(JSON.stringify(published));
      this.drafts.set(instanceId, draft);
    }

    const instanceVersions = this.versions.filter(v => v.instanceId === instanceId);

    return {
      published,
      draft,
      versions: instanceVersions
    };
  }

  public saveDraft(
    instanceId: string, 
    draftData: Partial<HomepageConfiguration>, 
    actorEmail: string,
    actorContext?: { role: string; tenantId: string }
  ): HomepageConfiguration {
    // Enforce tenant isolation
    if (actorContext && actorContext.role !== 'super_admin' && actorContext.tenantId !== instanceId) {
      throw new Error(`ACCESS_DENIED: Tenant '${actorContext.tenantId}' cannot edit configuration of '${instanceId}'`);
    }

    let existingDraft = this.drafts.get(instanceId);
    if (!existingDraft) {
      const published = this.configurations.get(instanceId);
      if (published) {
        existingDraft = JSON.parse(JSON.stringify(published));
      } else {
        throw new Error(`INSTANCE_NOT_FOUND: No instance with ID '${instanceId}' exists`);
      }
    }

    const updatedDraft: HomepageConfiguration = {
      ...existingDraft!,
      ...draftData,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    this.drafts.set(instanceId, updatedDraft);

    // Audit log
    this.logAudit({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instanceId,
      action: 'draft_updated',
      actorEmail,
      actorRole: actorContext?.role || 'admin',
      timestamp: new Date().toISOString(),
      versionNumber: existingDraft!.versionNumber,
      notes: 'Draft updated in visual editor'
    });

    return updatedDraft;
  }

  public publishHomepage(
    instanceId: string, 
    actorEmail: string, 
    changelogNote: string = 'Published changes from Visual Editor',
    actorContext?: { role: string; tenantId: string }
  ): HomepageConfiguration {
    // Enforce tenant isolation
    if (actorContext && actorContext.role !== 'super_admin' && actorContext.tenantId !== instanceId) {
      throw new Error(`ACCESS_DENIED: Tenant '${actorContext.tenantId}' cannot publish configuration of '${instanceId}'`);
    }

    const draft = this.drafts.get(instanceId);
    if (!draft) {
      throw new Error(`NO_DRAFT_FOUND: No draft configuration found for instance '${instanceId}'`);
    }

    const currentPublished = this.configurations.get(instanceId);
    const nextVersionNumber = (currentPublished?.versionNumber || 0) + 1;

    const publishedConfig: HomepageConfiguration = {
      ...draft,
      status: 'published',
      versionNumber: nextVersionNumber,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    // Promote draft to published
    this.configurations.set(instanceId, publishedConfig);
    this.drafts.set(instanceId, JSON.parse(JSON.stringify(publishedConfig)));

    // Save snapshot in version history
    const versionRecord: HomepageVersionRecord = {
      versionId: `ver_${instanceId}_${nextVersionNumber}_${Date.now()}`,
      instanceId,
      versionNumber: nextVersionNumber,
      configurationSnapshot: JSON.parse(JSON.stringify(publishedConfig)),
      publishedBy: actorEmail,
      publishedAt: new Date().toISOString(),
      changelog: changelogNote
    };
    this.versions.push(versionRecord);

    this.saveConfigurations();
    this.saveVersions();

    // Tamper-evident platform audit ledger
    TamperEvidentAuditService.logPlatformAction({
      actor: actorEmail,
      actorRole: actorContext?.role || 'principal_admin',
      tenantId: instanceId,
      action: 'homepage_published',
      target: instanceId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Published homepage version v${nextVersionNumber} for instance ${instanceId}. Changelog: ${changelogNote}. Template: ${publishedConfig.templateId}, Title: ${publishedConfig.branding.institutionName}`
    });

    this.logAudit({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instanceId,
      action: 'published',
      actorEmail,
      actorRole: actorContext?.role || 'admin',
      timestamp: new Date().toISOString(),
      versionNumber: nextVersionNumber,
      notes: changelogNote
    });

    return publishedConfig;
  }

  public rollbackVersion(
    instanceId: string, 
    targetVersionNumber: number, 
    actorEmail: string,
    actorContext?: { role: string; tenantId: string }
  ): HomepageConfiguration {
    // Enforce tenant isolation
    if (actorContext && actorContext.role !== 'super_admin' && actorContext.tenantId !== instanceId) {
      throw new Error(`ACCESS_DENIED: Tenant '${actorContext.tenantId}' cannot roll back configuration of '${instanceId}'`);
    }

    const versionRecord = this.versions.find(
      v => v.instanceId === instanceId && v.versionNumber === targetVersionNumber
    );

    if (!versionRecord) {
      throw new Error(`VERSION_NOT_FOUND: Version ${targetVersionNumber} does not exist for instance '${instanceId}'`);
    }

    const restoredSnapshot = JSON.parse(JSON.stringify(versionRecord.configurationSnapshot));
    const nextVersionNumber = (this.configurations.get(instanceId)?.versionNumber || 0) + 1;

    const restoredConfig: HomepageConfiguration = {
      ...restoredSnapshot,
      status: 'published',
      versionNumber: nextVersionNumber,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    this.configurations.set(instanceId, restoredConfig);
    this.drafts.set(instanceId, JSON.parse(JSON.stringify(restoredConfig)));

    // Save snapshot of rollback
    this.versions.push({
      versionId: `ver_${instanceId}_${nextVersionNumber}_rb_${Date.now()}`,
      instanceId,
      versionNumber: nextVersionNumber,
      configurationSnapshot: JSON.parse(JSON.stringify(restoredConfig)),
      publishedBy: actorEmail,
      publishedAt: new Date().toISOString(),
      changelog: `Rollback to version v${targetVersionNumber}`
    });

    this.saveConfigurations();
    this.saveVersions();

    this.logAudit({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instanceId,
      action: 'rolled_back',
      actorEmail,
      actorRole: actorContext?.role || 'admin',
      timestamp: new Date().toISOString(),
      versionNumber: nextVersionNumber,
      notes: `Restored state of version v${targetVersionNumber}`
    });

    return restoredConfig;
  }

  public getTemplates(): HomepageTemplateDefinition[] {
    return HOMEPAGE_TEMPLATES;
  }

  private logAudit(record: HomepageAuditRecord): void {
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveAuditLogs();
  }
}

export const homepageEngineManager = HomepageEngineManager.getInstance();
