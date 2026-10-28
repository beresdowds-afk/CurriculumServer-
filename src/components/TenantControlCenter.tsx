import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  OptionalFeatureKey,
  FeatureEntitlementState,
  TenantBillingInvoice,
  PlatformAuditRecord,
  CurriculumServerSaaSMetrics
} from '../types';
import { OPTIONAL_FEATURE_DEFINITIONS, INITIAL_SAAS_METRICS, INITIAL_SAAS_INVOICES } from '../mockCurriculumServerData';
import { globalBackupService } from '../services/backupRestoreService';
import { globalAuditLogService } from '../services/auditLogService';
import { TenantSecurityContextManager } from '../services/tenantSecurityContext';
import { EntitlementEnforcementService, DEFAULT_PLAN_POLICIES } from '../services/entitlementEnforcementService';
import { TenantLifecycleManager } from '../services/tenantLifecycleManager';
import { TamperEvidentAuditService } from '../services/tamperEvidentAuditService';
import { ControlPlaneCockpit } from './ControlPlaneCockpit';
import { PspConnectivityWidget } from './PspConnectivityWidget';
import { PspTransactionSuccessRateChart } from './PspTransactionSuccessRateChart';
import { 
  Building2, 
  Server, 
  CreditCard, 
  ShieldCheck, 
  Sliders, 
  RotateCw, 
  ArrowLeft, 
  Database, 
  HardDrive, 
  Cpu, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Key, 
  Download, 
  Play, 
  Activity, 
  Sparkles, 
  ExternalLink,
  Layers,
  Terminal,
  FileSpreadsheet,
  Check,
  Zap,
  RefreshCw,
  Trash2,
  Copy,
  FileText,
  DollarSign,
  ShieldAlert,
  Gauge,
  TrendingUp,
  Radio,
  Send,
  AlertCircle,
  X
} from 'lucide-react';

interface TenantControlCenterProps {
  tenant?: TenantSchoolApp;
  tenants?: TenantSchoolApp[];
  metrics?: CurriculumServerSaaSMetrics;
  invoices?: TenantBillingInvoice[];
  onBack?: () => void;
  onUpdateTenant?: (updated: TenantSchoolApp) => void;
  onLaunchTenant?: (tenant: TenantSchoolApp) => void;
  onSelectTenantToLaunch?: (tenant: TenantSchoolApp) => void;
  onOpenProvisionTerminal?: (draft?: Partial<TenantSchoolApp>) => void;
  onOpenIsolationTestModal?: () => void;
  onOpenVersionRolloutModal?: () => void;
  onOpenDomainPortal?: () => void;
  onOpenApiWebhooks?: () => void;
  onOpenPricingPortal?: () => void;
  onToggleTenantStatus?: (tenantId: string) => void;
  onUpdateTenantFeatures?: (tenantId: string, features: Record<OptionalFeatureKey, boolean>) => void;
}

export type TenantInspectorTab = 
  | 'overview'
  | 'subscription'
  | 'psp_telemetry'
  | 'features'
  | 'application'
  | 'infrastructure'
  | 'domain_dns'
  | 'security'
  | 'backups';

export const TenantControlCenter: React.FC<TenantControlCenterProps> = ({
  tenant: initialTenant,
  tenants = [],
  metrics,
  invoices = [],
  onBack,
  onUpdateTenant,
  onLaunchTenant,
  onSelectTenantToLaunch,
  onOpenProvisionTerminal,
  onOpenIsolationTestModal,
  onOpenVersionRolloutModal,
  onOpenDomainPortal,
  onOpenApiWebhooks,
  onOpenPricingPortal,
  onToggleTenantStatus,
  onUpdateTenantFeatures
}) => {
  const [selectedTenant, setSelectedTenant] = useState<TenantSchoolApp | null>(initialTenant || null);
  const [activeTab, setActiveTab] = useState<TenantInspectorTab>('overview');

  // If no specific tenant is selected, render the fleet Control Plane Cockpit
  if (!selectedTenant) {
    return (
      <ControlPlaneCockpit
        tenants={tenants}
        metrics={metrics || INITIAL_SAAS_METRICS}
        invoices={invoices}
        onSelectTenantToLaunch={(t) => {
          if (onSelectTenantToLaunch) onSelectTenantToLaunch(t);
          else if (onLaunchTenant) onLaunchTenant(t);
        }}
        onOpenProvisionTerminal={onOpenProvisionTerminal}
        onOpenIsolationTestModal={onOpenIsolationTestModal}
        onOpenVersionRolloutModal={onOpenVersionRolloutModal}
        onOpenDomainPortal={onOpenDomainPortal}
        onOpenApiWebhooks={onOpenApiWebhooks}
        onOpenPricingPortal={onOpenPricingPortal}
        onToggleTenantStatus={onToggleTenantStatus}
        onUpdateTenantFeatures={onUpdateTenantFeatures}
      />
    );
  }

  const tenant = selectedTenant;
  const [snapshots, setSnapshots] = useState(globalBackupService.getSnapshots(tenant.id));
  const [isTakingBackup, setIsTakingBackup] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [featuresState, setFeaturesState] = useState<Record<OptionalFeatureKey, boolean>>(tenant.enabledFeatures);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [ledgerIntegrity, setLedgerIntegrity] = useState<{ isValid: boolean; totalRecords: number; reason?: string } | null>(null);
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);

  const [invoicesList, setInvoicesList] = useState<TenantBillingInvoice[]>(() => {
    const filtered = invoices.filter(inv => inv.tenantAppId === tenant.id || inv.tenantAppId === tenant.appId || inv.tenantSchoolName === tenant.schoolName);
    if (filtered.length > 0) return filtered;
    const fallbackMatching = INITIAL_SAAS_INVOICES.filter(inv => inv.tenantAppId === tenant.id || inv.tenantAppId === tenant.appId || inv.tenantSchoolName === tenant.schoolName);
    return fallbackMatching.length > 0 ? fallbackMatching : INITIAL_SAAS_INVOICES;
  });
  const [verifyingInvoiceId, setVerifyingInvoiceId] = useState<string | null>(null);
  const [activeSimulatingInvoice, setActiveSimulatingInvoice] = useState<TenantBillingInvoice | null>(null);
  const [gatewayToast, setGatewayToast] = useState<{ message: string; type: 'success' | 'failed' | 'info' } | null>(null);

  const tenantInvoices = invoicesList;
  const tenantAuditLogs = globalAuditLogService.getLogs({ tenantId: tenant.id });
  const tenantToken = TenantSecurityContextManager.issueTenantToken(tenant);
  const usageTracker = EntitlementEnforcementService.getUsageTracker(tenant.id);
  const planPolicy = DEFAULT_PLAN_POLICIES[tenant.subscriptionTier] || DEFAULT_PLAN_POLICIES.Starter;
  const leaseToOwnInfo = TenantLifecycleManager.calculateLeaseToOwnStatus(tenant);
  const securityViolations = TenantSecurityContextManager.getSecurityViolations().filter(v => v.sourceTenantId === tenant.id || v.targetTenantId === tenant.id);

  const handleSimulateWebhookResponse = (invoiceId: string, targetStatus: 'paid' | 'pending' | 'failed', responseCode: string, psp: 'Paystack' | 'OPay') => {
    const nowIso = new Date().toISOString();
    const updatedInvoices = invoicesList.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: targetStatus,
          gatewayResponseCode: responseCode,
          gatewayTransactionStatus: (targetStatus === 'paid' ? 'success' : targetStatus === 'pending' ? 'pending' : 'failed') as any,
          pspChannel: psp,
          lastWebhookTimestamp: nowIso,
          gatewayLatencyMs: psp === 'OPay' ? 24 : 42,
          authHeaderSignature: psp === 'OPay' ? 'hmac_sha512_canonical_verified' : 'bearer_secret_verified'
        };
      }
      return inv;
    });

    setInvoicesList(updatedInvoices);
    const updatedInvoice = updatedInvoices.find(i => i.id === invoiceId);

    globalAuditLogService.logEvent({
      actor: `${psp.toLowerCase()}-webhook@curriculumserver.ng`,
      actorRole: 'PSP Inbound Webhook',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: 'payment_received',
      target: updatedInvoice?.invoiceNumber || invoiceId,
      result: targetStatus === 'paid' ? 'SUCCESS' : targetStatus === 'pending' ? 'PENDING' : 'FAILED',
      ipAddress: psp === 'OPay' ? '102.89.44.12 (OPay Gateway)' : '52.214.18.99 (Paystack Relay)',
      deviceMetadata: `${psp} Payment Webhook Engine`,
      details: `Received ${psp} webhook for ${updatedInvoice?.invoiceNumber}. Status transitioned to [${targetStatus.toUpperCase()}] with Gateway Response Code: ${responseCode}`
    });

    setGatewayToast({
      message: `Updated ${updatedInvoice?.invoiceNumber} to ${targetStatus.toUpperCase()} via ${psp} response code [${responseCode}]`,
      type: targetStatus === 'paid' ? 'success' : targetStatus === 'pending' ? 'info' : 'failed'
    });
    setTimeout(() => setGatewayToast(null), 4500);
    setActiveSimulatingInvoice(null);
  };

  const handleVerifyInvoiceOnGateway = (inv: TenantBillingInvoice) => {
    setVerifyingInvoiceId(inv.id);
    setTimeout(() => {
      setVerifyingInvoiceId(null);
      setGatewayToast({
        message: `Verified ${inv.invoiceNumber} with ${inv.pspChannel || 'Paystack'} Gateway API. Response: ${inv.gatewayResponseCode || '200_OK'} (${inv.gatewayLatencyMs || 38}ms roundtrip)`,
        type: inv.status === 'paid' ? 'success' : 'info'
      });
      setTimeout(() => setGatewayToast(null), 4500);
    }, 700);
  };

  const handleExportInvoicesCsv = () => {
    if (!tenantInvoices || tenantInvoices.length === 0) {
      setGatewayToast({
        message: 'No invoices available to export.',
        type: 'info'
      });
      setTimeout(() => setGatewayToast(null), 3000);
      return;
    }

    const headers = [
      'Invoice Number',
      'School Name',
      'Billing Period',
      'Business Model',
      'Subtotal (NGN)',
      'Tax VAT (NGN)',
      'Total Amount (NGN)',
      'Status',
      'Gateway Response Code',
      'PSP Channel',
      'Due Date',
      'Paid Date',
      'Transaction Reference',
      'Lease Installment'
    ];

    const rows = tenantInvoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${tenant.schoolName.replace(/"/g, '""')}"`,
      `"${inv.billingPeriod}"`,
      `"${inv.businessModel || 'subscription'}"`,
      inv.subtotalNgn || inv.totalAmount,
      inv.taxVatNgn || 0,
      inv.totalAmount,
      `"${inv.status.toUpperCase()}"`,
      `"${inv.gatewayResponseCode || (inv.status === 'paid' ? '200_OK' : '01_PROCESSING')}"`,
      `"${inv.pspChannel || 'Paystack'}"`,
      `"${inv.dueDate || ''}"`,
      `"${inv.paidAt || (inv.status === 'paid' ? inv.dueDate : '')}"`,
      `"${inv.transactionReference || inv.invoiceNumber}"`,
      inv.leaseInstallmentNumber ? `"${inv.leaseInstallmentNumber}/${inv.totalLeaseInstallments || 24}"` : '"N/A"'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `invoices_${tenant.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setGatewayToast({
      message: `Exported ${tenantInvoices.length} invoices as CSV (${filename})`,
      type: 'success'
    });
    setTimeout(() => setGatewayToast(null), 4000);
  };

  const handleToggleFeature = (key: OptionalFeatureKey) => {
    setFeaturesState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(tenantToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleStateChange = (targetState: 'active' | 'suspended' | 'archived') => {
    const updated = TenantLifecycleManager.transitionTenantState(
      tenant,
      targetState,
      `Super admin manual state transition via Control Center`,
      'admin@curriculumserver.ng'
    );
    setSelectedTenant(updated);
    if (onUpdateTenant) onUpdateTenant(updated);
  };

  const handleVerifyLedger = () => {
    setIsVerifyingLedger(true);
    setTimeout(() => {
      const result = TamperEvidentAuditService.verifyLedgerIntegrity();
      setLedgerIntegrity(result);
      setIsVerifyingLedger(false);
    }, 600);
  };

  const handleSaveFeatures = () => {
    setIsSavingFeatures(true);
    setTimeout(() => {
      const updated: TenantSchoolApp = {
        ...tenant,
        enabledFeatures: featuresState
      };
      setSelectedTenant(updated);
      if (onUpdateTenant) onUpdateTenant(updated);
      globalAuditLogService.logEvent({
        actor: 'admin@curriculumserver.ng',
        actorRole: 'SaaS Platform Architect',
        tenantId: tenant.id,
        tenantSchoolName: tenant.schoolName,
        action: 'feature_enabled',
        target: 'Modular Feature Matrix Updated',
        result: 'SUCCESS',
        ipAddress: '102.89.23.14 (Lagos, NG)',
        deviceMetadata: 'Control Plane UI',
        details: `Updated active feature flags for ${tenant.schoolName}`
      });
      setIsSavingFeatures(false);
    }, 600);
  };

  const handleCreateBackup = () => {
    setIsTakingBackup(true);
    setTimeout(() => {
      const newSnap = globalBackupService.createManualSnapshot(tenant.id, tenant.schoolName);
      setSnapshots(globalBackupService.getSnapshots(tenant.id));
      globalAuditLogService.logEvent({
        actor: 'admin@curriculumserver.ng',
        actorRole: 'SaaS Platform Architect',
        tenantId: tenant.id,
        tenantSchoolName: tenant.schoolName,
        action: 'backup_created',
        target: newSnap.snapshotId,
        result: 'SUCCESS',
        ipAddress: '102.89.23.14 (Lagos, NG)',
        deviceMetadata: 'Control Plane UI',
        details: `Created manual backup snapshot (${newSnap.sizeMb} MB)`
      });
      setIsTakingBackup(false);
    }, 1000);
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    const res = globalBackupService.simulateRestoreSnapshot(snapshotId);
    setRestoreMessage(res.message);
    globalAuditLogService.logEvent({
      actor: 'admin@curriculumserver.ng',
      actorRole: 'SaaS Platform Architect',
      tenantId: tenant.id,
      tenantSchoolName: tenant.schoolName,
      action: 'backup_restored',
      target: snapshotId,
      result: 'SUCCESS',
      ipAddress: '102.89.23.14 (Lagos, NG)',
      deviceMetadata: 'Control Plane UI',
      details: res.message
    });
    setTimeout(() => setRestoreMessage(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Breadcrumb & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (tenants && tenants.length > 0) {
                setSelectedTenant(null);
              } else if (onBack) {
                onBack();
              }
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Return to Control Plane Cockpit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Cockpit</span>
          </button>
          
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-100">{tenant.schoolName}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                tenant.status === 'active' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {tenant.status}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                {tenant.appId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>Tenant ID: <code className="text-emerald-400 font-mono">{tenant.id}</code></span>
              <span>•</span>
              <span>Domain: <span className="text-slate-200">{tenant.customDomain || tenant.subdomain}</span></span>
              <span>•</span>
              <span>Tier: <strong className="text-amber-300">{tenant.subscriptionTier}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Lifecycle State Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => handleStateChange('active')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                tenant.status === 'active' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleStateChange('suspended')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                tenant.status === 'suspended' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suspend
            </button>
            <button
              onClick={() => handleStateChange('archived')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                tenant.status === 'archived' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archive
            </button>
          </div>

          <button
            onClick={() => {
              if (onLaunchTenant) onLaunchTenant(tenant);
              else if (onSelectTenantToLaunch) onSelectTenantToLaunch(tenant);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch School Instance</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Identity & Overview', icon: Building2 },
          { id: 'subscription', label: 'Subscription & Billing', icon: CreditCard },
          { id: 'psp_telemetry', label: 'PSP Telemetry & Success Rates', icon: TrendingUp },
          { id: 'features', label: 'Feature Entitlements', icon: Sliders },
          { id: 'application', label: 'App Version & Deploy', icon: Layers },
          { id: 'infrastructure', label: 'Container Telemetry', icon: Cpu },
          { id: 'domain_dns', label: 'Domain & Anycast DNS', icon: Globe },
          { id: 'security', label: 'Security & Audit Trail', icon: ShieldCheck },
          { id: 'backups', label: 'Backups & Recovery', icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TenantInspectorTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & IDENTITY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <PspConnectivityWidget />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>School Institutional Profile</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">School Name</span>
                  <p className="font-bold text-slate-100 text-sm mt-0.5">{tenant.schoolName}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Location & State</span>
                  <p className="font-bold text-slate-100 text-sm mt-0.5">{tenant.address}, {tenant.locationState}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">School Principal</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{tenant.principalName}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{tenant.principalEmail} • {tenant.principalPhone}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">ICT Director / Admin</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{tenant.ictAdminName}</p>
                  <p className="text-slate-400 font-mono text-[11px]">{tenant.ictAdminEmail}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">School Capacity & Demographics</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Active Students</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1">{tenant.activeStudentsCount.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-500">Cap: {tenant.studentCapacity.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Faculty Teachers</span>
                    <p className="text-lg font-bold text-teal-400 mt-1">{tenant.facultyCount}</p>
                    <span className="text-[10px] text-slate-500">Staff Accounts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-xs">Storage Usage</span>
                    <p className="text-lg font-bold text-indigo-400 mt-1">{tenant.storageUsageMb} MB</p>
                    <span className="text-[10px] text-slate-500">Quota: {tenant.maxStorageMb} MB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Identity & Security Keys</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Publishable Public Key</span>
                  <p className="font-mono text-emerald-400 text-[11px] mt-1 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {tenant.publishableKey}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Encrypted App Secret (Server-Only)</span>
                  <p className="font-mono text-slate-400 text-[11px] mt-1 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {tenant.appSecret.substring(0, 16)}••••••••••••••••••••
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Zero exposure to browser clients.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Cryptographic License Hash</span>
                  <p className="font-mono text-slate-300 text-[10px] mt-1 truncate">
                    {tenant.licenseHash}
                  </p>
                </div>

                {/* Signed Tenant Security Token */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Signed Security Token (HMAC-SHA256)</span>
                    </span>
                    <button
                      onClick={handleCopyToken}
                      className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedToken ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedToken ? 'Copied' : 'Copy JWT'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-emerald-300 break-all bg-slate-950/80 p-2 rounded border border-emerald-900/50 max-h-16 overflow-y-auto">
                    {tenantToken}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400/80">
                    <span>Zero Data Leakage Boundary: Enforced</span>
                    <span>Payload: {tenant.id} ({tenant.subscriptionTier})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION & BILLING */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Dynamic Toast for Gateway Updates */}
          {gatewayToast && (
            <div className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fadeIn ${
              gatewayToast.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
                : gatewayToast.type === 'failed'
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                  : 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
            }`}>
              <div className="flex items-center gap-2">
                {gatewayToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
                <span className="font-medium">{gatewayToast.message}</span>
              </div>
              <button onClick={() => setGatewayToast(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Current Subscription Plan</span>
              <p className="text-xl font-bold text-slate-100 mt-1">{tenant.subscriptionTier}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                <span>Model: <strong className="capitalize">{tenant.businessModel.replace('_', ' ')}</strong></span>
                <span className="text-emerald-400 font-mono font-bold">₦{tenant.subscriptionPricePerYear?.toLocaleString() || tenant.subscriptionPricePerMonth?.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Renewal & Grace Period</span>
              <p className="text-xl font-bold text-slate-100 mt-1">{tenant.subscriptionRenewDate || '2027-08-31'}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                <span>Auto-Renew: <strong>{tenant.autoRenew ? 'Enabled' : 'Manual'}</strong></span>
                <span>Grace: {tenant.gracePeriodDays} Days</span>
              </div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Lease-to-Own Equity Status</span>
              <p className="text-xl font-bold text-amber-400 mt-1">
                ₦{leaseToOwnInfo.equityAccruedNgn.toLocaleString()}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                <span>Equity: <strong>{leaseToOwnInfo.equityPercentage}%</strong></span>
                <span>Remaining: <strong>₦{leaseToOwnInfo.remainingBuyoutPriceNgn.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Lease to Own Amortization Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Lease-to-Own Buyout Amortization Schedule</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allows schools to acquire full intellectual property buyout & migrate to self-hosted on-premise infrastructure.
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                leaseToOwnInfo.isBuyoutEligible ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {leaseToOwnInfo.isBuyoutEligible ? 'Eligible for On-Premise Export' : `Accumulating (${leaseToOwnInfo.monthsPaid}/${leaseToOwnInfo.totalTermMonths} Months)`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Total Equity Accrued: ₦{leaseToOwnInfo.equityAccruedNgn.toLocaleString()}</span>
                <span>Total Contract Buyout: ₦{leaseToOwnInfo.totalContractPriceNgn.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, leaseToOwnInfo.equityPercentage))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-400">Monthly Contribution</span>
                <p className="font-bold text-slate-100 mt-0.5">₦{leaseToOwnInfo.monthlyPaymentNgn.toLocaleString()}/mo</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-400">Self-Hosted Export Status</span>
                <p className="font-bold text-emerald-400 mt-0.5">Automated Tarball Generator Ready</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-400">Perpetual Source License</span>
                <p className="font-bold text-teal-400 mt-0.5">Included upon 100% completion</p>
              </div>
            </div>
          </div>

          {/* Invoice Ledger & Dynamic Gateway Status Indicators */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Dynamic Invoice Ledger & Gateway Response Status</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual indicators update dynamically based on live PSP response codes (e.g. Paid, Pending, Failed) from OPay & Paystack.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportInvoicesCsv}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Export all tenant invoices as CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  {tenantInvoices.length} Invoices Tracked
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Amount (NGN)</th>
                    <th className="p-3">Visual Status Indicator</th>
                    <th className="p-3">Gateway Code</th>
                    <th className="p-3">Channel / Auth</th>
                    <th className="p-3 text-right">Actions & Simulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tenantInvoices.map(inv => {
                    const isVerifying = verifyingInvoiceId === inv.id;
                    const isPaid = inv.status === 'paid';
                    const isPending = inv.status === 'pending';
                    const isFailed = inv.status === 'failed' || inv.status === 'overdue';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-100 block">{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Due: {inv.dueDate}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-200">{inv.billingPeriod}</td>
                        <td className="p-3 font-mono font-bold text-slate-100 text-sm">
                          ₦{inv.totalAmount.toLocaleString()}
                        </td>
                        
                        {/* Visual Status Indicator */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {isPaid && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Paid</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span>Pending</span>
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Failed</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Gateway Response Code */}
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold inline-block ${
                              isPaid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              isPending ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>
                              {inv.gatewayResponseCode || (isPaid ? '200_OK' : isPending ? '01_PROCESSING' : '51_INSUFFICIENT')}
                            </span>
                            {inv.gatewayLatencyMs && (
                              <span className="text-[10px] text-slate-500 block font-mono">
                                Latency: {inv.gatewayLatencyMs}ms
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PSP Channel & Auth */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.pspChannel === 'OPay' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {inv.pspChannel || 'Paystack'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {inv.pspChannel === 'OPay' ? 'HMAC' : 'Bearer'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Verify Button */}
                            <button 
                              onClick={() => handleVerifyInvoiceOnGateway(inv)}
                              disabled={isVerifying}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Verify transaction status with Gateway API"
                            >
                              <RotateCw className={`w-3 h-3 ${isVerifying ? 'animate-spin text-emerald-400' : ''}`} />
                              <span className="hidden sm:inline">Verify</span>
                            </button>

                            {/* Simulate Webhook Button */}
                            <button
                              onClick={() => setActiveSimulatingInvoice(inv)}
                              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Simulate dynamic gateway response"
                            >
                              <Zap className="w-3 h-3 text-emerald-400" />
                              <span className="hidden sm:inline">Simulate</span>
                            </button>

                            {/* PDF Button */}
                            <button className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer" title="Download PDF">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhook Response Simulation Modal */}
          {activeSimulatingInvoice && (
            <div className="p-5 bg-slate-950 border border-emerald-600/50 rounded-2xl space-y-4 animate-fadeIn shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-100">
                    Simulate Gateway Webhook for <span className="font-mono text-emerald-400">{activeSimulatingInvoice.invoiceNumber}</span>
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveSimulatingInvoice(null)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Trigger a simulated signed inbound HTTP POST webhook from either OPay or Paystack to observe live status indicator transitions and ledger reconciliation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  onClick={() => handleSimulateWebhookResponse(activeSimulatingInvoice.id, 'paid', '00_APPROVED', 'OPay')}
                  className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900 text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">OPay: Success</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-800 text-white">00</span>
                  </div>
                  <p className="text-[10px] text-slate-400">HMAC-SHA512 valid • Instant settlement</p>
                </button>

                <button
                  onClick={() => handleSimulateWebhookResponse(activeSimulatingInvoice.id, 'paid', '200_OK', 'Paystack')}
                  className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800/80 hover:bg-cyan-900 text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Paystack: Paid</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-800 text-white">200</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Bearer verified • Charge success event</p>
                </button>

                <button
                  onClick={() => handleSimulateWebhookResponse(activeSimulatingInvoice.id, 'failed', '51_INSUFFICIENT_FUNDS', 'Paystack')}
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900 text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300">Failure: Code 51</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-800 text-white">51</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Declined • Triggers fallback to OPay</p>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PSP TELEMETRY & SUCCESS RATES (NEW SUB-TAB) */}
      {activeTab === 'psp_telemetry' && (
        <div className="space-y-6 animate-fadeIn">
          <PspConnectivityWidget />
          <PspTransactionSuccessRateChart />
        </div>
      )}

      {/* TAB 3: FEATURE ENTITLEMENTS */}
      {activeTab === 'features' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Feature Governance & Entitlement Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Toggle modular features. Changes are applied server-side with zero client-side bypass possible.
              </p>
            </div>
            <button
              onClick={handleSaveFeatures}
              disabled={isSavingFeatures}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              {isSavingFeatures ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Entitlements</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPTIONAL_FEATURE_DEFINITIONS.map(feat => {
              const isEnabled = Boolean(featuresState[feat.key]);
              return (
                <div 
                  key={feat.key}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    isEnabled 
                      ? 'bg-slate-950/80 border-emerald-500/40 text-slate-200' 
                      : 'bg-slate-950/30 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-xs">{feat.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                        {feat.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{feat.shortDesc}</p>
                    <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                      ₦{feat.monthlyPrice.toLocaleString()}/mo • ₦{feat.yearlyPrice.toLocaleString()}/yr
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleFeature(feat.key)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      isEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: APPLICATION & DEPLOYMENTS */}
      {activeTab === 'application' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Application Version & Runtime Build</span>
            </h3>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Currently Deployed Image Tag</span>
                <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                  curriculumflow-app:{tenant.provisionedFromTemplateVersion || tenant.clonedFromTemplateVersion || '1.4.2'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Database Schema: <code className="text-slate-300">db_schema_v14</code></p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">
                STABLE PRODUCTION
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 text-xs">
              <h4 className="font-semibold text-slate-200">Available Upgrade Targets</h4>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">v1.5.0-rc1</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">CANARY PREVIEW</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">Includes real-time broadsheet websocket sync & enhanced biometric CBT.</p>
                </div>
                <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
                  Deploy Staged Update
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Container Health Probes</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Frontend Container</span>
                  <p className="font-mono text-slate-200 text-xs">Port 3000 • HTTP/2</p>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Healthy (12ms)
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Backend API Container</span>
                  <p className="font-mono text-slate-200 text-xs">Port 3001 • Express</p>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Healthy (14ms)
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Background Worker</span>
                  <p className="font-mono text-slate-200 text-xs">Celery / Redis Queue</p>
                </div>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active (0 backlog)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INFRASTRUCTURE & CONTAINER TELEMETRY */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Database Instance</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-base font-mono font-bold text-slate-100">db_{tenant.id.replace(/[^a-zA-Z0-9_]/g, '_')}</p>
              <p className="text-[11px] text-slate-400">Isolated PostgreSQL 16 • 48 Tables</p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Storage Namespace</span>
                <HardDrive className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-base font-mono font-bold text-slate-100 truncate">/storage/tenants/{tenant.id}</p>
              <p className="text-[11px] text-slate-400">{tenant.storageUsageMb} MB / {tenant.maxStorageMb} MB ({Math.round((tenant.storageUsageMb / tenant.maxStorageMb) * 100)}% utilized)</p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>CPU Allocation</span>
                <Cpu className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-base font-mono font-bold text-teal-400">18.4% of 2.0 vCPU</p>
              <p className="text-[11px] text-slate-400">Throttling Limit: 2.0 Cores Max</p>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Memory RSS</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-base font-mono font-bold text-amber-400">412 MB / 4096 MB</p>
              <p className="text-[11px] text-slate-400">OOM Buffer: 3684 MB Available</p>
            </div>
          </div>

          {/* Quota Guard Real-Time Entitlement Policy */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Quota Guard™ Live Rate Limiting & Resource Consumption</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-slate-400 font-medium">Monthly AI Token Consumption</span>
                <p className="text-base font-bold text-emerald-400 font-mono">
                  {usageTracker.aiTokensUsed.toLocaleString()} / {planPolicy.aiMonthlyTokenLimit.toLocaleString()}
                </p>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(5, (usageTracker.aiTokensUsed / planPolicy.aiMonthlyTokenLimit) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">Soft warning threshold: 80% • Hard cut-off: 100%</p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-slate-400 font-medium">Student Capacity Ceiling</span>
                <p className="text-base font-bold text-indigo-400 font-mono">
                  {tenant.activeStudentsCount.toLocaleString()} / {planPolicy.maxStudentsLimit.toLocaleString()}
                </p>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(5, (tenant.activeStudentsCount / planPolicy.maxStudentsLimit) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">Capacity headroom: {planPolicy.maxStudentsLimit - tenant.activeStudentsCount} seats remaining</p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-slate-400 font-medium">API Ingress Rate Limiting</span>
                <p className="text-base font-bold text-teal-400 font-mono">
                  {planPolicy.rateLimitReqPerMin} req/min
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Concurrent Workers: {planPolicy.maxConcurrentBackgroundJobs}</span>
                  <span className="text-emerald-400 font-semibold">Leaky Bucket: Healthy</span>
                </div>
                <p className="text-[10px] text-slate-500">Enforced by Envoy Ingress Edge Filter</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DOMAIN & ANYCAST DNS */}
      {activeTab === 'domain_dns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Domain Routing, Anycast DNS & TLS Gateway</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary Host: <strong className="text-slate-200 font-mono">{tenant.customDomain || tenant.subdomain}</strong>
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SSL TLS 1.3 Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-slate-400 font-medium">Anycast Edge Ingress IP</span>
              <p className="font-mono text-emerald-400 font-bold text-sm">172.67.198.42 (Cloudflare Anycast Mesh)</p>
              <p className="text-[11px] text-slate-500">Latency to Lagos / Abuja: ~11ms</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-slate-400 font-medium">CNAME Target Record</span>
              <p className="font-mono text-slate-200 font-bold text-sm">ingress.curriculumserver.ng</p>
              <p className="text-[11px] text-slate-500">Automated multi-tenant SNI routing</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SECURITY & AUDIT TRAIL */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Immutable Platform Audit Trail for {tenant.schoolName}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically hash-chained (SHA-256 HMAC) ledger guaranteeing tamper-proof auditability.
              </p>
            </div>

            <button
              onClick={handleVerifyLedger}
              disabled={isVerifyingLedger}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isVerifyingLedger ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Verify Cryptographic Ledger</span>
            </button>
          </div>

          {ledgerIntegrity && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
              ledgerIntegrity.isValid 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}>
              {ledgerIntegrity.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
              <span>
                {ledgerIntegrity.isValid 
                  ? `Cryptographic Audit Ledger is 100% Intact. Verified ${ledgerIntegrity.totalRecords} consecutive HMAC hashes without discrepancy.` 
                  : `Integrity Alert: ${ledgerIntegrity.reason}`}
              </span>
            </div>
          )}

          {/* Cross-tenant Boundary Status */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cross-Tenant Boundary Isolation Matrix</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                ZERO LEAKAGE DETECTED
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              School database schema <code className="text-emerald-400 font-mono">db_{tenant.id.replace(/[^a-zA-Z0-9_]/g, '_')}</code> and storage bucket are strictly bound to signed tenant context. All unauthorized cross-tenant requests are dropped with HTTP 403 Forbidden.
            </p>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {tenantAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent security events recorded.</p>
            ) : (
              tenantAuditLogs.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">{log.action}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{log.details}</p>
                    <p className="text-slate-500 text-[10px]">Actor: {log.actor} ({log.actorRole}) • {log.ipAddress}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                    {log.result}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: BACKUPS & RECOVERY */}
      {activeTab === 'backups' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Automated Nightly Backups & Disaster Recovery</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full snapshots include PostgreSQL database tables and isolated storage buckets.
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={isTakingBackup}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              {isTakingBackup ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              <span>Create Instant Snapshot</span>
            </button>
          </div>

          {restoreMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{restoreMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            {snapshots.map(snap => (
              <div key={snap.snapshotId} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100">{snap.snapshotId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {snap.sizeMb} MB
                    </span>
                    {snap.isAutomatedNightly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                        Nightly Automated
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Created: {snap.createdAt} • Database: <code className="text-emerald-400">{snap.databaseName}</code> ({snap.databaseTablesCount} tables)
                  </p>
                  <p className="text-slate-500 font-mono text-[10px] truncate max-w-xl">
                    SHA256: {snap.checksumSha256}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreSnapshot(snap.snapshotId)}
                    className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verify & Restore</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
