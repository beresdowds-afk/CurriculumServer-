import { AppVersionCatalogItem } from '../types';

export const APP_VERSION_CATALOG: AppVersionCatalogItem[] = [
  {
    version: 'v1.5.0-rc1',
    dockerImageTag: 'curriculumflow-app:1.5.0-rc1',
    dbSchemaVersion: 'db_schema_v15',
    releasedAt: '2026-08-16T18:00:00Z',
    isStable: false,
    isCanary: true,
    releaseNotes: [
      'Introduced real-time WebSocket broadsheet live syncing',
      'Enhanced CBT biometric facial verification during exams',
      'Optimized NERDC theme querying speed by 45%'
    ],
    minimumCompatibleVersion: 'v1.4.0'
  },
  {
    version: 'v1.4.2',
    dockerImageTag: 'curriculumflow-app:1.4.2',
    dbSchemaVersion: 'db_schema_v14',
    releasedAt: '2026-08-01T12:00:00Z',
    isStable: true,
    isCanary: false,
    releaseNotes: [
      'Full Multi-Tenant SaaS Control Plane compatibility',
      'Isolated PostgreSQL database per tenant schema migration runner',
      'NiRA .sch.ng and .edu.ng sovereign domain verification engine'
    ],
    minimumCompatibleVersion: 'v1.3.0'
  },
  {
    version: 'v1.4.1',
    dockerImageTag: 'curriculumflow-app:1.4.1',
    dbSchemaVersion: 'db_schema_v14',
    releasedAt: '2026-07-15T09:30:00Z',
    isStable: true,
    isCanary: false,
    releaseNotes: [
      'Bursary automated NUBAN reconciliation for Paystack / OPay',
      'Supervised Parents DB with cryptographic ward pickup authorization'
    ],
    minimumCompatibleVersion: 'v1.2.0'
  }
];

export class VersionRolloutManager {
  private versions: AppVersionCatalogItem[] = [...APP_VERSION_CATALOG];

  getVersions(): AppVersionCatalogItem[] {
    return this.versions;
  }

  getStableVersion(): AppVersionCatalogItem {
    return this.versions.find(v => v.isStable) || this.versions[1];
  }

  getCanaryVersion(): AppVersionCatalogItem | undefined {
    return this.versions.find(v => v.isCanary);
  }
}

export const globalVersionManager = new VersionRolloutManager();
