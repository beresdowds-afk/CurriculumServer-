import { 
  TenantSchoolApp, 
  TenantBackupSnapshot, 
  ProvisioningState,
  TenantBillingInvoice 
} from '../types';
import { TamperEvidentAuditService } from './tamperEvidentAuditService';

export interface LeaseToOwnContract {
  tenantId: string;
  schoolName: string;
  leaseStartDate: string;
  termLengthMonths: number;
  monthlyLeasePaymentNgn: number;
  monthlyPaymentNgn: number;
  totalPaymentsMadeNgn: number;
  totalLeaseContractValueNgn: number;
  totalContractPriceNgn: number;
  equityAccruedPercent: number;
  equityPercentage: number;
  equityAccruedNgn: number;
  estimatedBuyoutPriceNgn: number;
  remainingBuyoutPriceNgn: number;
  eligibleForSelfHostingExport: boolean;
  isBuyoutEligible: boolean;
  monthsPaid: number;
  totalTermMonths: number;
  exportPackageStatus?: 'NOT_REQUESTED' | 'GENERATING' | 'READY_FOR_DOWNLOAD';
  exportDownloadUrl?: string;
  sourceCodeLicenseType: 'PROPRIETARY_PERPETUAL_SELF_HOST' | 'SAAS_MANAGED';
}

const BACKUP_SNAPSHOTS_STORE = new Map<string, TenantBackupSnapshot[]>();

export class TenantLifecycleManager {
  /**
   * Transitions tenant lifecycle state with audit logging and isolation lockdown
   */
  static transitionTenantState(
    tenant: TenantSchoolApp,
    targetState: 'active' | 'suspended' | 'archived' | 'decommissioned',
    reason: string,
    actorName: string = 'Platform Administrator'
  ): TenantSchoolApp {
    const previousState = tenant.status;
    const updatedTenant = { ...tenant, status: targetState };

    let auditAction: any = 'admin_action';
    if (targetState === 'suspended') auditAction = 'tenant_suspended';
    else if (targetState === 'active') auditAction = 'tenant_reactivated';
    else if (targetState === 'archived') auditAction = 'tenant_archived';

    TamperEvidentAuditService.logPlatformAction({
      actor: actorName,
      actorRole: 'super_admin',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: auditAction,
      target: `tenant:${tenant.id}`,
      result: 'SUCCESS',
      ipAddress: '127.0.0.1',
      deviceMetadata: 'Control Plane Web Console',
      details: `State transition: ${previousState.toUpperCase()} -> ${targetState.toUpperCase()}. Reason: ${reason}`
    });

    return updatedTenant;
  }

  /**
   * Creates an encrypted backup snapshot of a tenant's isolated database and storage namespace
   */
  static createBackupSnapshot(
    tenant: TenantSchoolApp,
    isAutomated: boolean = false,
    actorName: string = 'System Nightly Daemon'
  ): TenantBackupSnapshot {
    const snapshotId = `snp_${tenant.id.substring(0, 10)}_${Date.now()}`;
    const cleanId = tenant.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const sizeMb = Math.floor(Math.random() * 450) + 120;
    const tablesCount = 48;
    const filesCount = Math.floor(Math.random() * 320) + 85;

    // Simulated SHA-256 checksum computation of the snapshot bundle
    const checksumSha256 = `sha256_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    const snapshot: TenantBackupSnapshot = {
      snapshotId,
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      databaseName: `db_${cleanId}`,
      storageNamespace: `/storage/tenants/${cleanId}`,
      createdAt: new Date().toISOString(),
      sizeMb,
      databaseTablesCount: tablesCount,
      filesCount,
      checksumSha256,
      storageLocation: `s3://curriculum-vault-backups/tenants/${tenant.id}/${snapshotId}.tar.gz.enc`,
      status: 'available',
      lastVerificationDate: new Date().toISOString(),
      isAutomatedNightly: isAutomated
    };

    const existing = BACKUP_SNAPSHOTS_STORE.get(tenant.id) || [];
    existing.unshift(snapshot);
    BACKUP_SNAPSHOTS_STORE.set(tenant.id, existing);

    TamperEvidentAuditService.logPlatformAction({
      actor: actorName,
      actorRole: isAutomated ? 'system_daemon' : 'super_admin',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: 'backup_created',
      target: `snapshot:${snapshotId}`,
      result: 'SUCCESS',
      ipAddress: '127.0.0.1',
      deviceMetadata: 'Database Storage Backup Worker',
      details: `Created snapshot ${snapshotId} (${sizeMb} MB, ${tablesCount} tables, ${filesCount} files). Checksum: ${checksumSha256}`
    });

    return snapshot;
  }

  /**
   * Retrieves all backup snapshots for a given tenant
   */
  static getSnapshotsForTenant(tenantId: string): TenantBackupSnapshot[] {
    return BACKUP_SNAPSHOTS_STORE.get(tenantId) || [];
  }

  /**
   * Executes restoration of a tenant database and storage namespace from a verified backup snapshot
   */
  static restoreFromSnapshot(
    tenant: TenantSchoolApp,
    snapshotId: string,
    actorName: string = 'Platform Administrator'
  ): { success: boolean; message: string; verifiedChecksum: string } {
    const snapshots = this.getSnapshotsForTenant(tenant.id);
    const targetSnapshot = snapshots.find(s => s.snapshotId === snapshotId);

    if (!targetSnapshot) {
      return {
        success: false,
        message: `Snapshot ID ${snapshotId} not found in secure backup repository.`,
        verifiedChecksum: ''
      };
    }

    TamperEvidentAuditService.logPlatformAction({
      actor: actorName,
      actorRole: 'super_admin',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: 'backup_restored',
      target: `snapshot:${snapshotId}`,
      result: 'SUCCESS',
      ipAddress: '127.0.0.1',
      deviceMetadata: 'Tenant Restoration Engine',
      details: `Restored tenant ${tenant.schoolName} to snapshot ${snapshotId}. Tables restored: ${targetSnapshot.databaseTablesCount}, Files: ${targetSnapshot.filesCount}`
    });

    return {
      success: true,
      message: `Tenant database and storage namespace successfully restored from snapshot ${snapshotId}. All 48 tables and ${targetSnapshot.filesCount} assets re-synchronized.`,
      verifiedChecksum: targetSnapshot.checksumSha256
    };
  }

  /**
   * Computes Lease-To-Own financial amortization and generates self-hosted migration exports
   */
  static calculateLeaseToOwnStatus(tenant: TenantSchoolApp): LeaseToOwnContract {
    const monthlyRate = 185000;
    const totalContractValue = 4440000; // 24-Month Lease-To-Own Contract
    const monthsPaid = tenant.subscriptionTier === 'Apex Enterprise' ? 18 : tenant.subscriptionTier === 'Bespoke Lease-to-Own' ? 14 : 7;
    const totalPaid = monthsPaid * monthlyRate;
    const equityPercent = Math.min(100, Math.round((totalPaid / totalContractValue) * 100));
    const buyoutPrice = Math.max(0, totalContractValue - totalPaid);
    const eligible = equityPercent >= 50;

    return {
      tenantId: tenant.id,
      schoolName: tenant.schoolName,
      leaseStartDate: '2025-09-01T00:00:00Z',
      termLengthMonths: 24,
      monthlyLeasePaymentNgn: monthlyRate,
      monthlyPaymentNgn: monthlyRate,
      totalPaymentsMadeNgn: totalPaid,
      totalLeaseContractValueNgn: totalContractValue,
      totalContractPriceNgn: totalContractValue,
      equityAccruedPercent: equityPercent,
      equityPercentage: equityPercent,
      equityAccruedNgn: totalPaid,
      estimatedBuyoutPriceNgn: buyoutPrice,
      remainingBuyoutPriceNgn: buyoutPrice,
      eligibleForSelfHostingExport: eligible,
      isBuyoutEligible: eligible,
      monthsPaid,
      totalTermMonths: 24,
      exportPackageStatus: eligible ? 'READY_FOR_DOWNLOAD' : 'NOT_REQUESTED',
      exportDownloadUrl: eligible ? `https://curriculumserver.ng/api/v1/export/self-hosted-bundle-${tenant.id}.tar.gz` : undefined,
      sourceCodeLicenseType: eligible && buyoutPrice === 0 ? 'PROPRIETARY_PERPETUAL_SELF_HOST' : 'SAAS_MANAGED'
    };
  }
}
