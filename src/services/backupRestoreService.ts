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
    databaseTablesCount: 7,
    filesCount: 14,
    checksumSha256: '9f81a7b8e12c98d7f5a43b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e',
    storageLocation: '/data/backups/artifacts/tenant-kings-college/snap_kings_20260817_0100.tar.gz.enc',
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
    databaseTablesCount: 7,
    filesCount: 12,
    checksumSha256: '3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b',
    storageLocation: '/data/backups/artifacts/tenant-atlantic-crest/snap_atlantic_20260817_0130.tar.gz.enc',
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
    databaseTablesCount: 7,
    filesCount: 18,
    checksumSha256: '7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b',
    storageLocation: '/data/backups/artifacts/tenant-corona-schools/snap_corona_20260817_0200.tar.gz.enc',
    status: 'available',
    lastVerificationDate: '2026-08-17T02:04:00Z',
    isAutomatedNightly: true
  }
];

export interface DisasterRecoveryPolicy {
  recoveryPointObjectiveHours: number;
  recoveryTimeObjectiveMinutes: number;
  retentionDays: number;
  autoNightlyEnabled: boolean;
  encryptionAlgorithm: string;
  storageProvider: string;
}

export const DEFAULT_DR_POLICY: DisasterRecoveryPolicy = {
  recoveryPointObjectiveHours: 24,
  recoveryTimeObjectiveMinutes: 5,
  retentionDays: 30,
  autoNightlyEnabled: true,
  encryptionAlgorithm: 'AES-256-GCM',
  storageProvider: 'local_durable'
};

export class BackupRestoreService {
  private snapshots: TenantBackupSnapshot[] = [...INITIAL_TENANT_SNAPSHOTS];
  private policy: DisasterRecoveryPolicy = { ...DEFAULT_DR_POLICY };

  public getPolicy(): DisasterRecoveryPolicy {
    return { ...this.policy };
  }

  public updatePolicy(newPolicy: Partial<DisasterRecoveryPolicy>): DisasterRecoveryPolicy {
    this.policy = { ...this.policy, ...newPolicy };
    return this.getPolicy();
  }

  public getSnapshots(tenantId?: string): TenantBackupSnapshot[] {
    if (tenantId) {
      return this.snapshots.filter(s => s.tenantId.toLowerCase() === tenantId.toLowerCase());
    }
    return [...this.snapshots];
  }

  public createManualSnapshot(tenantId: string, schoolName: string): TenantBackupSnapshot {
    const timestamp = new Date().toISOString();
    const cleanId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const snapshotId = `snp_${cleanId}_${Date.now()}`;

    const newSnapshot: TenantBackupSnapshot = {
      snapshotId,
      tenantId,
      tenantSchoolName: schoolName,
      databaseName: `db_${cleanId}`,
      storageNamespace: `/storage/tenants/${cleanId}`,
      createdAt: timestamp,
      sizeMb: 1.24,
      databaseTablesCount: 7,
      filesCount: 6,
      checksumSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      storageLocation: `/data/backups/artifacts/${cleanId}/${snapshotId}.tar.gz.enc`,
      status: 'available',
      lastVerificationDate: timestamp,
      isAutomatedNightly: false
    };

    this.snapshots.unshift(newSnapshot);
    return newSnapshot;
  }

  public simulateRestoreSnapshot(snapshotId: string): { success: boolean; message: string; verifiedChecksum: boolean } {
    const snapshot = this.snapshots.find(s => s.snapshotId === snapshotId);
    if (!snapshot) {
      return { success: false, message: `Snapshot ID '${snapshotId}' not found in disaster recovery repository`, verifiedChecksum: false };
    }

    snapshot.status = 'restoring';
    setTimeout(() => {
      snapshot.status = 'available';
      snapshot.lastVerificationDate = new Date().toISOString();
    }, 1500);

    return {
      success: true,
      message: `Tenant '${snapshot.tenantSchoolName}' successfully restored from snapshot ${snapshotId}. Database consistency and 7 tables re-synchronized.`,
      verifiedChecksum: true
    };
  }
}

export const globalBackupService = new BackupRestoreService();
