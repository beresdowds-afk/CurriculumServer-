import React, { useState } from 'react';
import { 
  TenantSchoolApp, 
  OptionalFeatureKey,
  FeatureEntitlementState,
  TenantBillingInvoice,
  PlatformAuditRecord
} from '../types';
import { OPTIONAL_FEATURE_DEFINITIONS } from '../mockCurriculumServerData';
import { globalBackupService } from '../services/backupRestoreService';
import { globalAuditLogService } from '../services/auditLogService';
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
  Trash2
} from 'lucide-react';

interface TenantControlCenterProps {
  tenant: TenantSchoolApp;
  onBack: () => void;
  onUpdateTenant: (updated: TenantSchoolApp) => void;
  onLaunchTenant: (tenant: TenantSchoolApp) => void;
  invoices: TenantBillingInvoice[];
}

export type TenantInspectorTab = 
  | 'overview'
  | 'subscription'
  | 'features'
  | 'application'
  | 'infrastructure'
  | 'domain_dns'
  | 'security'
  | 'backups';

export const TenantControlCenter: React.FC<TenantControlCenterProps> = ({
  tenant,
  onBack,
  onUpdateTenant,
  onLaunchTenant,
  invoices
}) => {
  const [activeTab, setActiveTab] = useState<TenantInspectorTab>('overview');
  const [snapshots, setSnapshots] = useState(globalBackupService.getSnapshots(tenant.id));
  const [isTakingBackup, setIsTakingBackup] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [featuresState, setFeaturesState] = useState<Record<OptionalFeatureKey, boolean>>(tenant.enabledFeatures);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);

  const tenantInvoices = invoices.filter(inv => inv.tenantAppId === tenant.id || inv.tenantSchoolName === tenant.schoolName);
  const tenantAuditLogs = globalAuditLogService.getLogs({ tenantId: tenant.id });

  const handleToggleFeature = (key: OptionalFeatureKey) => {
    setFeaturesState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveFeatures = () => {
    setIsSavingFeatures(true);
    setTimeout(() => {
      const updated: TenantSchoolApp = {
        ...tenant,
        enabledFeatures: featuresState
      };
      onUpdateTenant(updated);
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
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Back to Tenants Cockpit"
          >
            <ArrowLeft className="w-5 h-5" />
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => onLaunchTenant(tenant)}
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
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION & BILLING */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
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
              <span className="text-xs text-slate-400 font-medium">Lease-to-Own Equity (If Applicable)</span>
              <p className="text-xl font-bold text-amber-400 mt-1">
                {tenant.leaseToOwnContract ? `₦${tenant.leaseToOwnContract.totalEquityAccumulated.toLocaleString()}` : 'N/A (Standard SaaS)'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
                <span>Target Buyout: {tenant.leaseToOwnContract ? `₦${tenant.leaseToOwnContract.totalBuyoutPrice.toLocaleString()}` : 'None'}</span>
                <span>{tenant.leaseToOwnContract ? `${tenant.leaseToOwnContract.monthsPaid}/${tenant.leaseToOwnContract.amortizationPeriodMonths} mo` : ''}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Invoice Ledger & Receipts</span>
              </span>
              <span className="text-xs font-normal text-slate-400">{tenantInvoices.length} Invoices Found</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Amount (NGN)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tenantInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-100">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.billingPeriod}</td>
                      <td className="p-3 font-mono font-semibold">₦{inv.totalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3">{inv.dueDate}</td>
                      <td className="p-3 text-slate-400">{inv.pspChannel || 'Paystack'}</td>
                      <td className="p-3 text-right">
                        <button className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer">
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                  curriculumflow-app:{tenant.clonedFromTemplateVersion || '1.4.2'}
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
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Immutable Platform Audit Trail for {tenant.schoolName}</span>
          </h3>

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
