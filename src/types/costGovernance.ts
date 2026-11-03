/**
 * Phase 10: Cost Governance, Quota Guard, and Billing Attribution Types
 * Strictly conforms to docs/architecture/UNIFIED_BACKEND_CONNECTIVITY_CONTRACT.md
 */

export interface InstanceResourceConsumption {
  instanceId: string;
  tenantId: string;
  organizationName: string;
  billingPeriod: string; // e.g. "2026-03"
  
  // Actual Measured Usage
  cloudRunVcpuSeconds: number;
  cloudRunRamGibHours: number;
  cloudSqlStorageGibMonths: number;
  cloudSqlIopsCount: number;
  cloudStorageStoredGib: number;
  cloudStorageEgressGib: number;
  apiRequestsCount: number;

  // Actual Incurred Provider Cost (Calculated from GCP Rate Card)
  actualProviderCostUSD: number;
  actualProviderCostNGN: number;

  // Architecture Estimate (from IIAPE engine at provisioning)
  estimatedArchitectureCostNGN: number;

  // Customer Invoiced Revenue (B2B SaaS Contract)
  customerInvoicedRevenueNGN: number;

  // Financial Reconciliation
  grossMarginNGN: number;
  grossMarginPercentage: number;
  costDiscrepancyPercentage: number; // Discrepancy between estimate and actual

  // Quotas & Budget Governance
  storageQuotaGib: number;
  storageUsagePercentage: number;
  monthlyBudgetCapNGN: number;
  budgetUtilizationPercentage: number;
  budgetAlertLevel: 'healthy' | 'warning_80' | 'critical_95' | 'throttled_100';

  // Scaling Limits
  minInstances: number;
  maxInstances: number;
  concurrencyLimit: number;
}

export interface PlatformCostGovernanceSummary {
  billingPeriod: string;
  exchangeRateUsdToNgn: number; // e.g. 1550
  totalActualProviderCostNGN: number;
  totalEstimatedArchitectureCostNGN: number;
  totalInvoicedRevenueNGN: number;
  platformGrossMarginNGN: number;
  platformGrossMarginPercentage: number;
  instancesTracked: number;
  instancesAtWarningBudget: number;
  instancesAtCriticalBudget: number;
  costByService: {
    cloudRunComputeNGN: number;
    cloudSqlDatabaseNGN: number;
    cloudStorageNGN: number;
    networkingEgressNGN: number;
    iamAndSecurityNGN: number;
  };
  reconciliationNotes: string;
}
