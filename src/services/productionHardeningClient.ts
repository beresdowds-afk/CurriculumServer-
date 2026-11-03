import { 
  SecurityAuditReport, 
  FailureRecoveryDrillResult, 
  FinalProductionReadinessReport 
} from '../types/productionHardening';
import { 
  InstanceResourceConsumption, 
  PlatformCostGovernanceSummary 
} from '../types/costGovernance';
import { unifiedApiClient } from './unifiedApiClient';

export class ProductionHardeningClient {
  private static instance: ProductionHardeningClient;

  public static getInstance(): ProductionHardeningClient {
    if (!ProductionHardeningClient.instance) {
      ProductionHardeningClient.instance = new ProductionHardeningClient();
    }
    return ProductionHardeningClient.instance;
  }

  public async getSecurityAudit(): Promise<SecurityAuditReport> {
    const res = await unifiedApiClient.get<SecurityAuditReport>('/api/v1/server/security/audit');
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch security audit');
    return res.data;
  }

  public async runFailureDrills(): Promise<{
    timestamp: string;
    totalDrills: number;
    passedDrills: number;
    allPassed: boolean;
    results: FailureRecoveryDrillResult[];
  }> {
    const res = await unifiedApiClient.post<{
      timestamp: string;
      totalDrills: number;
      passedDrills: number;
      allPassed: boolean;
      results: FailureRecoveryDrillResult[];
    }>('/api/v1/server/security/drills/run', {});
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to run failure and recovery drills');
    return res.data;
  }

  public async getCostSummary(): Promise<PlatformCostGovernanceSummary> {
    const res = await unifiedApiClient.get<PlatformCostGovernanceSummary>('/api/v1/server/cost-governance/summary');
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch cost summary');
    return res.data;
  }

  public async getCostRecords(): Promise<InstanceResourceConsumption[]> {
    const res = await unifiedApiClient.get<InstanceResourceConsumption[]>('/api/v1/server/cost-governance/records');
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch cost records');
    return res.data;
  }

  public async updateBudgetQuota(instanceId: string, monthlyBudgetCapNGN: number, maxInstances: number): Promise<InstanceResourceConsumption> {
    const res = await unifiedApiClient.post<InstanceResourceConsumption>(
      `/api/v1/server/cost-governance/instances/${instanceId}/quota`,
      { monthlyBudgetCapNGN, maxInstances }
    );
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to update budget quota');
    return res.data;
  }

  public async getProductionReadinessReport(): Promise<FinalProductionReadinessReport> {
    const res = await unifiedApiClient.get<FinalProductionReadinessReport>('/api/v1/server/production-readiness');
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to generate production readiness report');
    return res.data;
  }

  public async checkCbtEngineHealth(): Promise<{ status: string; appId: string; lockdownKioskReady: boolean }> {
    const res = await unifiedApiClient.get<{ status: string; appId: string; lockdownKioskReady: boolean }>('/api/v1/cbt/health', 'none');
    if (!res.success || !res.data) throw new Error(res.error || 'CBT engine health check failed');
    return res.data;
  }
}

export const productionHardeningClient = ProductionHardeningClient.getInstance();
