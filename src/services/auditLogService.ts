import { PlatformAuditRecord } from '../types';

export const INITIAL_PLATFORM_AUDIT_LOGS: PlatformAuditRecord[] = [
  {
    id: 'audit_8812',
    timestamp: '2026-08-17T05:20:12Z',
    actor: 'admin@curriculumserver.ng',
    actorRole: 'Super SaaS Platform Architect',
    tenantId: 'tenant-kings-college',
    tenantSchoolName: "King's College Lagos",
    action: 'feature_enabled',
    target: 'secure_cbt_lockdown',
    result: 'SUCCESS',
    ipAddress: '102.89.23.14 (Lagos, NG)',
    deviceMetadata: 'Chrome 128 / macOS ARM64',
    details: 'Provisioned Secure CBT lockdown module & synchronized cryptographic encryption keys.'
  },
  {
    id: 'audit_8811',
    timestamp: '2026-08-17T04:45:00Z',
    actor: 'system.provisioning_engine',
    actorRole: 'Provisioning Daemon',
    tenantId: 'tenant-atlantic-crest',
    tenantSchoolName: 'Atlantic Crest Academy',
    action: 'tenant_provisioning_completed',
    target: 'Docker Stack / Postgres db_tenant_atlantic_crest',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1 (Control Plane Ingress)',
    deviceMetadata: 'CurriculumServer Provisioner v1.4.2',
    details: 'Completed 12-step automated provisioning pipeline in 18.4s.'
  },
  {
    id: 'audit_8810',
    timestamp: '2026-08-17T03:10:00Z',
    actor: 'bursar@coronaschools.sch.ng',
    actorRole: 'School Bursar Admin',
    tenantId: 'tenant-corona-schools',
    tenantSchoolName: 'Corona Secondary School Agbara',
    action: 'subscription_upgraded',
    target: 'Pro College -> Apex Enterprise Plan',
    result: 'SUCCESS',
    ipAddress: '105.112.98.44 (Ogun, NG)',
    deviceMetadata: 'Firefox 129 / Windows 11',
    details: 'Upgraded tenant tier to Apex Enterprise with 3,000 student capacity and 10GB storage.'
  },
  {
    id: 'audit_8809',
    timestamp: '2026-08-17T02:00:19Z',
    actor: 'system.backup_daemon',
    actorRole: 'Disaster Recovery Service',
    tenantId: 'tenant-kings-college',
    tenantSchoolName: "King's College Lagos",
    action: 'backup_created',
    target: 'snap_kings_20260817_0100',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1 (Internal Cluster)',
    deviceMetadata: 'Automated Snapshot Service',
    details: 'Completed nightly database & storage snapshot (184.6 MB, 48 tables).'
  },
  {
    id: 'audit_8808',
    timestamp: '2026-08-16T22:30:10Z',
    actor: 'admin@curriculumserver.ng',
    actorRole: 'Super SaaS Platform Architect',
    tenantId: 'tenant-loyola-jesuit',
    tenantSchoolName: 'Loyola Jesuit College Abuja',
    action: 'domain_added',
    target: 'portal.loyolajesuit.edu.ng',
    result: 'SUCCESS',
    ipAddress: '102.89.23.14 (Lagos, NG)',
    deviceMetadata: 'Chrome 128 / macOS ARM64',
    details: 'Verified sovereign NiRA educational domain and configured Anycast CNAME.'
  }
];

export class PlatformAuditService {
  private logs: PlatformAuditRecord[] = [...INITIAL_PLATFORM_AUDIT_LOGS];

  getLogs(filter?: { tenantId?: string; action?: string }): PlatformAuditRecord[] {
    let result = [...this.logs];
    if (filter?.tenantId) {
      result = result.filter(l => l.tenantId === filter.tenantId);
    }
    if (filter?.action) {
      result = result.filter(l => l.action === filter.action);
    }
    return result;
  }

  logEvent(record: Omit<PlatformAuditRecord, 'id' | 'timestamp'>): PlatformAuditRecord {
    const newRecord: PlatformAuditRecord = {
      ...record,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(newRecord);
    return newRecord;
  }
}

export const globalAuditLogService = new PlatformAuditService();
