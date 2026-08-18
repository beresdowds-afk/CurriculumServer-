import { TenantBackupSnapshot } from '../types';

export const INITIAL_TENANT_SNAPSHOTS: TenantBackupSnapshot[] = [
  {
    snapshotId: 'snap_kings_20260817_0100',
    tenantId: 'tenant-kings-college',
    tenantSchoolName: "King's College Lagos",
    databaseName: 'db_tenant_kings_college',
    storageNamespace: '/storage/tenants/tenant-kings-college',
    createdAt: '2026-08-17T01:00:00Z',
    sizeMb: 184.6,
    databaseTablesCount: 48,
    filesCount: 1420,
    checksumSha256: '9f81a7b8e12c98d7f5a43b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e',
    storageLocation: 's3://curriculumserver-backups/tenant-kings-college/snap_kings_20260817_0100.tar.gz.enc',
    status: 'available',
    lastVerificationDate: '2026-08-17T01:05:00Z',
    isAutomatedNightly: true
  },
  {
    snapshotId: 'snap_atlantic_20260817_0130',
    tenantId: 'tenant-atlantic-crest',
    tenantSchoolName: 'Atlantic Crest Academy',
    databaseName: 'db_tenant_atlantic_crest',
    storageNamespace: '/storage/tenants/tenant-atlantic-crest',
    createdAt: '2026-08-17T01:30:00Z',
    sizeMb: 92.4,
    databaseTablesCount: 48,
    filesCount: 680,
    checksumSha256: '3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b',
    storageLocation: 's3://curriculumserver-backups/tenant-atlantic-crest/snap_atlantic_20260817_0130.tar.gz.enc',
    status: 'available',
    lastVerificationDate: '2026-08-17T01:33:00Z',
    isAutomatedNightly: true
  },
  {
    snapshotId: 'snap_corona_20260817_0200',
    tenantId: 'tenant-corona-schools',
    tenantSchoolName: 'Corona Secondary School Agbara',
    databaseName: 'db_tenant_corona_schools',
    storageNamespace: '/storage/tenants/tenant-corona-schools',
    createdAt: '2026-08-17T02:00:00Z',
    sizeMb: 142.1,
    databaseTablesCount: 48,
    filesCount: 1150,
    checksumSha256: '7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b',
    storageLocation: 's3://curriculumserver-backups/tenant-corona-schools/snap_corona_20260817_0200.tar.gz.enc',
    status: 'available',
    lastVerificationDate: '2026-08-17T02:04:00Z',
    isAutomatedNightly: true
  }
];

export class BackupRestoreService {
  private snapshots: TenantBackupSnapshot[] = [...INITIAL_TENANT_SNAPSHOTS];

  getSnapshots(tenantId?: string): TenantBackupSnapshot[] {
    if (tenantId) {
      return this.snapshots.filter(s => s.tenantId === tenantId);
    }
    return this.snapshots;
  }

  createManualSnapshot(tenantId: string, schoolName: string): TenantBackupSnapshot {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newSnapshot: TenantBackupSnapshot = {
      snapshotId: `snap_${tenantId.replace('tenant-', '')}_manual_${Date.now()}`,
      tenantId,
      tenantSchoolName: schoolName,
      databaseName: `db_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      storageNamespace: `/storage/tenants/${tenantId}`,
      createdAt: new Date().toISOString(),
      sizeMb: Math.round((80 + Math.random() * 120) * 10) / 10,
      databaseTablesCount: 48,
      filesCount: Math.round(500 + Math.random() * 1000),
      checksumSha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      storageLocation: `s3://curriculumserver-backups/${tenantId}/snap_manual_${timestamp}.tar.gz.enc`,
      status: 'available',
      lastVerificationDate: new Date().toISOString(),
      isAutomatedNightly: false
    };

    this.snapshots.unshift(newSnapshot);
    return newSnapshot;
  }

  simulateRestoreSnapshot(snapshotId: string): { success: boolean; message: string; verifiedChecksum: boolean } {
    const snapshot = this.snapshots.find(s => s.snapshotId === snapshotId);
    if (!snapshot) {
      return { success: false, message: 'Snapshot ID not found', verifiedChecksum: false };
    }

    snapshot.status = 'restoring';
    setTimeout(() => {
      snapshot.status = 'available';
      snapshot.lastVerificationDate = new Date().toISOString();
    }, 2000);

    return {
      success: true,
      message: `Tenant ${snapshot.tenantSchoolName} successfully restored from snapshot ${snapshotId}. Database consistency verified (48 tables, ${snapshot.filesCount} files).`,
      verifiedChecksum: true
    };
  }
}

export const globalBackupService = new BackupRestoreService();
