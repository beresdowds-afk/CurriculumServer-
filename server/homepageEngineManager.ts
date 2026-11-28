import fs from 'fs';
import path from 'path';
import { lazySingleton } from './lazySingleton';
import { 
  HomepageConfiguration, 
  HomepageVersionRecord, 
  HomepageAuditRecord, 
  HomepageTemplateDefinition,
  InstitutionPresetType,
  HomepageTemplateId,
  LandingFooterAppKey,
  LandingFooterConfig,
  FooterEditableFields,
  ProvisionedInstanceSummary
} from '../src/types/homepageEngine';
import {
  HOMEPAGE_TEMPLATES,
  createDefaultPresetConfiguration,
  createDefaultLandingFooter
} from '../src/data/homepageTemplatesData';
import { serverSchoolManager } from './serverSchoolManager';
import { customerOnboardingManager } from './customerOnboardingManager';
import { TamperEvidentAuditService } from '../src/services/tamperEvidentAuditService';

const DATA_DIR = path.join(process.cwd(), 'data');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage_configurations.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'homepage_versions.json');
const AUDIT_FILE = path.join(DATA_DIR, 'homepage_audit_logs.json');
const PLATFORM_FOOTERS_FILE = path.join(DATA_DIR, 'platform_footers.json');

const HOMEPAGE_ADMIN_ROLES = new Set([
  'super_admin',
  'tenant_admin',
  'principal',
  'principal_administrator',
  'proprietor',
  'ict_system_administrator',
  'vice_principal_administration',
  'admin'
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function formatContactAddress(contact?: { addressText?: string; city?: string; state?: string }): string {
  if (!contact) return '';
  return [contact.addressText, contact.city, contact.state]
    .map(part => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

export class HomepageEngineManager {
  private static instance: HomepageEngineManager;
  private configurations: Map<string, HomepageConfiguration> = new Map();
  private drafts: Map<string, HomepageConfiguration> = new Map();
  private versions: HomepageVersionRecord[] = [];
  private auditLogs: HomepageAuditRecord[] = [];
  private platformFooters: Map<LandingFooterAppKey, LandingFooterConfig> = new Map();

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

      this.platformFooters.set('curriculum_server', createDefaultLandingFooter('curriculum_server'));
      this.platformFooters.set('curriculum_flow', createDefaultLandingFooter('curriculum_flow'));
      if (fs.existsSync(PLATFORM_FOOTERS_FILE)) {
        const rawFooters: LandingFooterConfig[] = JSON.parse(fs.readFileSync(PLATFORM_FOOTERS_FILE, 'utf8'));
        rawFooters.forEach(footer => {
          if (footer && (footer.appKey === 'curriculum_server' || footer.appKey === 'curriculum_flow')) {
            this.platformFooters.set(footer.appKey, footer);
          }
        });
      } else {
        this.savePlatformFooters();
      }
    } catch (err) {
      console.error('Error loading homepage persistence, falling back to seed:', err);
      this.seedInitialConfigurations();
      this.platformFooters.set('curriculum_server', createDefaultLandingFooter('curriculum_server'));
      this.platformFooters.set('curriculum_flow', createDefaultLandingFooter('curriculum_flow'));
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

  private savePlatformFooters(): void {
    try {
      const arr = Array.from(this.platformFooters.values());
      fs.writeFileSync(PLATFORM_FOOTERS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save platform footers:', err);
    }
  }

  private validateFooterFields(patch: Partial<FooterEditableFields>): FooterEditableFields {
    const copyrightText = typeof patch.copyrightText === 'string' ? patch.copyrightText.trim() : '';
    const institutionalAddress = typeof patch.institutionalAddress === 'string' ? patch.institutionalAddress.trim() : '';
    const email = typeof patch.email === 'string' ? patch.email.trim() : '';
    const phoneNumber = typeof patch.phoneNumber === 'string' ? patch.phoneNumber.trim() : '';

    if (!copyrightText) {
      throw new Error('VALIDATION_ERROR: Copyright text is required');
    }
    if (!institutionalAddress) {
      throw new Error('VALIDATION_ERROR: Institutional address is required');
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      throw new Error('VALIDATION_ERROR: A valid institutional email address is required');
    }
    if (!phoneNumber || phoneNumber.length < 5) {
      throw new Error('VALIDATION_ERROR: A valid institutional phone number is required');
    }

    return {
      copyrightText: copyrightText.slice(0, 320),
      institutionalAddress: institutionalAddress.slice(0, 360),
      email: email.slice(0, 180),
      phoneNumber: phoneNumber.slice(0, 64)
    };
  }

  private assertAdminAccess(
    instanceId: string,
    actorContext?: { role: string; tenantId: string }
  ): void {
    if (!actorContext) return;
    if (!HOMEPAGE_ADMIN_ROLES.has(actorContext.role)) {
      throw new Error(`ACCESS_DENIED: Role '${actorContext.role}' is not authorized to manage homepage configurations`);
    }
    if (actorContext.role !== 'super_admin' && actorContext.tenantId !== instanceId) {
      const existing = this.configurations.get(instanceId);
      if (!existing || existing.tenantId !== actorContext.tenantId) {
        throw new Error(`ACCESS_DENIED: Tenant '${actorContext.tenantId}' cannot access configuration of '${instanceId}'`);
      }
    }
  }

  private bootstrapInstanceIfRegistered(instanceIdOrSlug: string): HomepageConfiguration | null {
    let cfg = this.configurations.get(instanceIdOrSlug);
    if (!cfg) {
      for (const c of this.configurations.values()) {
        if (c.tenantId === instanceIdOrSlug || c.schoolSlug === instanceIdOrSlug || c.domain === instanceIdOrSlug) {
          cfg = c;
          break;
        }
      }
    }

    if (!cfg) {
      const tenant = serverSchoolManager.getTenants().find(
        t => t.id === instanceIdOrSlug || t.schoolSlug === instanceIdOrSlug
      );
      if (tenant) {
        cfg = createDefaultPresetConfiguration(
          tenant.id,
          tenant.id,
          tenant.schoolSlug || tenant.id,
          tenant.schoolName || tenant.id,
          'secondary_school',
          'premium_academic',
          tenant.customDomain || tenant.subdomain
        );
        if (tenant.principalEmail) {
          cfg.contact.primaryEmail = tenant.principalEmail;
        }
        if (tenant.principalPhone) {
          cfg.contact.primaryPhone = tenant.principalPhone;
        }
        if (tenant.address) {
          cfg.contact.addressText = tenant.address;
          cfg.contact.city = '';
          cfg.contact.state = tenant.locationState || '';
        }
        this.configurations.set(tenant.id, cfg);
        this.drafts.set(tenant.id, JSON.parse(JSON.stringify(cfg)));
        this.versions.push({
          versionId: `ver_${tenant.id}_1_${Date.now()}`,
          instanceId: tenant.id,
          versionNumber: 1,
          configurationSnapshot: JSON.parse(JSON.stringify(cfg)),
          publishedBy: 'system_auto_bootstrap',
          publishedAt: new Date().toISOString(),
          changelog: 'Auto-bootstrapped from provisioned tenant registry'
        });
        this.saveConfigurations();
        this.saveVersions();
      } else {
        const onboardingInstances = customerOnboardingManager.getInstances();
        const onboarding = onboardingInstances.find(
          inst => inst.instanceId === instanceIdOrSlug || inst.tenantId === instanceIdOrSlug || inst.subdomain === instanceIdOrSlug
        );
        if (onboarding) {
          const derivedSlug = (onboarding.subdomain || onboarding.instanceId).split('.')[0] || onboarding.instanceId;
          cfg = createDefaultPresetConfiguration(
            onboarding.instanceId,
            onboarding.tenantId || onboarding.instanceId,
            derivedSlug,
            onboarding.organization?.organizationName || derivedSlug,
            'secondary_school',
            'premium_academic',
            onboarding.customDomain || onboarding.subdomain
          );
          if (onboarding.organization?.contactEmail) {
            cfg.contact.primaryEmail = onboarding.organization.contactEmail;
          }
          if (onboarding.organization?.contactPhone) {
            cfg.contact.primaryPhone = onboarding.organization.contactPhone;
          }
          if (onboarding.organization?.address) {
            cfg.contact.addressText = onboarding.organization.address;
            cfg.contact.city = onboarding.organization.lga || '';
            cfg.contact.state = onboarding.organization.state || '';
          }
          this.configurations.set(onboarding.instanceId, cfg);
          this.drafts.set(onboarding.instanceId, JSON.parse(JSON.stringify(cfg)));
          this.versions.push({
            versionId: `ver_${onboarding.instanceId}_1_${Date.now()}`,
            instanceId: onboarding.instanceId,
            versionNumber: 1,
            configurationSnapshot: JSON.parse(JSON.stringify(cfg)),
            publishedBy: 'system_auto_bootstrap',
            publishedAt: new Date().toISOString(),
            changelog: 'Auto-bootstrapped from universal onboarding instance'
          });
          this.saveConfigurations();
          this.saveVersions();
        }
      }
    }

    return cfg || null;
  }

  // ---------------------------------------------------------------------------
  // PLATFORM LANDING FOOTER MANAGEMENT (Curriculum Server & Curriculum Flow)
  // ---------------------------------------------------------------------------
  public getPlatformFooter(appKey: LandingFooterAppKey): LandingFooterConfig {
    if (appKey !== 'curriculum_server' && appKey !== 'curriculum_flow') {
      throw new Error(`INVALID_APP_KEY: Unknown landing page key '${appKey}'`);
    }
    const existing = this.platformFooters.get(appKey) || createDefaultLandingFooter(appKey);
    return { ...existing };
  }

  public updatePlatformFooter(
    appKey: LandingFooterAppKey,
    patch: Partial<FooterEditableFields>,
    actorEmail: string,
    actorContext?: { role: string; tenantId: string }
  ): LandingFooterConfig {
    if (appKey !== 'curriculum_server' && appKey !== 'curriculum_flow') {
      throw new Error(`INVALID_APP_KEY: Unknown landing page key '${appKey}'`);
    }

    if (actorContext) {
      if (appKey === 'curriculum_server' && actorContext.role !== 'super_admin') {
        throw new Error(`ACCESS_DENIED: Role '${actorContext.role}' cannot modify the Curriculum Server platform footer`);
      }
      if (!HOMEPAGE_ADMIN_ROLES.has(actorContext.role)) {
        throw new Error(`ACCESS_DENIED: Role '${actorContext.role}' cannot modify landing page footer`);
      }
    }

    const validated = this.validateFooterFields(patch);
    const updated: LandingFooterConfig = {
      appKey,
      ...validated,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    this.platformFooters.set(appKey, updated);
    this.savePlatformFooters();

    TamperEvidentAuditService.logPlatformAction({
      actor: actorEmail,
      actorRole: actorContext?.role || 'super_admin',
      tenantId: actorContext?.tenantId || 'platform_control_plane',
      action: 'landing_footer_updated',
      target: appKey,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Updated footer for ${appKey}. Email: ${updated.email}, Phone: ${updated.phoneNumber}`
    });

    this.logAudit({
      id: `aud_ftr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instanceId: `platform:${appKey}`,
      action: 'published',
      actorEmail,
      actorRole: actorContext?.role || 'super_admin',
      timestamp: updated.updatedAt,
      versionNumber: 1,
      notes: `Updated ${appKey} landing footer`
    });

    return { ...updated };
  }

  // ---------------------------------------------------------------------------
  // PROVISIONED INSTANCE FLEET LISTING FOR LANDING PAGE GENERATOR
  // ---------------------------------------------------------------------------
  public listProvisionedInstances(): ProvisionedInstanceSummary[] {
    for (const tenant of serverSchoolManager.getTenants()) {
      this.bootstrapInstanceIfRegistered(tenant.id);
    }
    for (const inst of customerOnboardingManager.getInstances()) {
      if (
        inst.provisioningStatus === 'active' ||
        inst.provisioningStatus === 'provisioned' ||
        inst.provisioningStatus === 'verified' ||
        inst.provisioningStatus === 'activation_ready'
      ) {
        this.bootstrapInstanceIfRegistered(inst.instanceId);
      }
    }

    const summaries: ProvisionedInstanceSummary[] = [];
    for (const cfg of this.configurations.values()) {
      summaries.push({
        instanceId: cfg.instanceId,
        tenantId: cfg.tenantId,
        schoolSlug: cfg.schoolSlug,
        institutionName: cfg.branding.institutionName,
        domain: cfg.domain,
        templateId: cfg.templateId,
        presetType: cfg.presetType,
        status: cfg.status,
        versionNumber: cfg.versionNumber,
        updatedAt: cfg.updatedAt,
        copyrightText: cfg.contact.copyrightText || `© ${new Date().getFullYear()} ${cfg.branding.institutionName}. All rights reserved.`,
        institutionalAddress: formatContactAddress(cfg.contact),
        email: cfg.contact.primaryEmail,
        phoneNumber: cfg.contact.primaryPhone
      });
    }
    return summaries;
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

    const cfg = this.bootstrapInstanceIfRegistered(instanceId);
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
    this.assertAdminAccess(instanceId, actorContext);

    const published = this.bootstrapInstanceIfRegistered(instanceId);
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
    this.assertAdminAccess(instanceId, actorContext);

    let existingDraft = this.drafts.get(instanceId);
    if (!existingDraft) {
      const published = this.bootstrapInstanceIfRegistered(instanceId);
      if (published) {
        existingDraft = JSON.parse(JSON.stringify(published));
      } else {
        throw new Error(`INSTANCE_NOT_FOUND: No instance with ID '${instanceId}' exists`);
      }
    }

    const updatedDraft: HomepageConfiguration = {
      ...existingDraft!,
      ...draftData,
      instanceId: existingDraft!.instanceId,
      tenantId: existingDraft!.tenantId,
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

  public updateInstanceFooter(
    instanceId: string,
    patch: Partial<FooterEditableFields>,
    actorEmail: string,
    actorContext?: { role: string; tenantId: string }
  ): HomepageConfiguration {
    this.assertAdminAccess(instanceId, actorContext);

    const currentPublished = this.bootstrapInstanceIfRegistered(instanceId);
    if (!currentPublished) {
      throw new Error(`INSTANCE_NOT_FOUND: No instance with ID '${instanceId}' exists`);
    }

    const validated = this.validateFooterFields(patch);
    const existingDraft = this.drafts.get(instanceId) || JSON.parse(JSON.stringify(currentPublished));

    const updatedContact = {
      ...currentPublished.contact,
      addressText: validated.institutionalAddress,
      city: '',
      state: '',
      primaryEmail: validated.email,
      primaryPhone: validated.phoneNumber,
      copyrightText: validated.copyrightText
    };

    const nextVersionNumber = (currentPublished.versionNumber || 0) + 1;
    const now = new Date().toISOString();

    const updatedPublished: HomepageConfiguration = {
      ...currentPublished,
      contact: updatedContact,
      status: 'published',
      versionNumber: nextVersionNumber,
      publishedAt: now,
      updatedAt: now,
      updatedBy: actorEmail
    };

    const updatedDraft: HomepageConfiguration = {
      ...existingDraft,
      contact: {
        ...existingDraft.contact,
        ...updatedContact
      },
      versionNumber: nextVersionNumber,
      updatedAt: now,
      updatedBy: actorEmail
    };

    this.configurations.set(instanceId, updatedPublished);
    this.drafts.set(instanceId, updatedDraft);

    this.versions.push({
      versionId: `ver_${instanceId}_${nextVersionNumber}_${Date.now()}`,
      instanceId,
      versionNumber: nextVersionNumber,
      configurationSnapshot: JSON.parse(JSON.stringify(updatedPublished)),
      publishedBy: actorEmail,
      publishedAt: now,
      changelog: 'Updated institutional footer copyright, address, email, and phone'
    });

    this.saveConfigurations();
    this.saveVersions();

    TamperEvidentAuditService.logPlatformAction({
      actor: actorEmail,
      actorRole: actorContext?.role || 'principal_admin',
      tenantId: updatedPublished.tenantId,
      action: 'instance_footer_updated',
      target: instanceId,
      result: 'SUCCESS',
      outcome: 'SUCCESS',
      details: `Updated footer for ${updatedPublished.branding.institutionName} (${instanceId}) v${nextVersionNumber}`
    });

    this.logAudit({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instanceId,
      action: 'published',
      actorEmail,
      actorRole: actorContext?.role || 'admin',
      timestamp: now,
      versionNumber: nextVersionNumber,
      notes: 'Direct institutional footer update'
    });

    return updatedPublished;
  }

  public publishHomepage(
    instanceId: string, 
    actorEmail: string, 
    changelogNote: string = 'Published changes from Visual Editor',
    actorContext?: { role: string; tenantId: string }
  ): HomepageConfiguration {
    this.assertAdminAccess(instanceId, actorContext);

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
    this.assertAdminAccess(instanceId, actorContext);

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

  public getAuditLogs(instanceId?: string): HomepageAuditRecord[] {
    if (!instanceId) return [...this.auditLogs];
    return this.auditLogs.filter(a => a.instanceId === instanceId);
  }

  private logAudit(record: HomepageAuditRecord): void {
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveAuditLogs();
  }
}

export const homepageEngineManager = lazySingleton(() => HomepageEngineManager.getInstance());

