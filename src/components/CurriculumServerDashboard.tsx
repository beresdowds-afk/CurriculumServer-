import React, { useState, useEffect } from 'react';
import { 
  TenantSchoolApp, 
  CurriculumServerSaaSMetrics, 
  TenantBillingInvoice, 
  OptionalFeatureKey,
  BusinessModelType 
} from '../types';
import { customerOnboardingClient } from '../services/customerOnboardingClient';
import { UniversalInstanceRecord, UniversalInstanceType } from '../types/customerOnboarding';
import { 
  Server, 
  Building2, 
  CreditCard, 
  Key, 
  Sliders, 
  Award, 
  Sparkles, 
  TrendingUp, 
  Users, 
  HardDrive, 
  ShieldCheck, 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Globe, 
  Download, 
  RotateCw, 
  ChevronRight, 
  Activity, 
  DollarSign, 
  Eye, 
  Coins, 
  Calendar,
  Layers,
  ArrowUpRight,
  Database,
  Lock,
  Cpu,
  FileSpreadsheet,
  Check,
  Brain,
  ScanFace,
  Building,
  KeyRound,
  Play,
  Copy,
  Send,
  Radio,
  FileText,
  Table,
  LayoutGrid,
  CheckCheck,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { OPTIONAL_FEATURE_DEFINITIONS, INITIAL_SAAS_METRICS } from '../mockCurriculumServerData';
import { InstanceLifecycleCenter } from './InstanceLifecycleCenter';
import { ProductionHardeningDeck } from './ProductionHardeningDeck';

interface CurriculumServerDashboardProps {
  tenants: TenantSchoolApp[];
  metrics?: CurriculumServerSaaSMetrics;
  invoices?: TenantBillingInvoice[];
  onSelectTenantToLaunch?: (tenant: TenantSchoolApp) => void;
  onOpenProvisionModal?: () => void;
  onOpenCloneModal?: () => void;
  onOpenConnectModal?: () => void;
  onOpenCredentialsModal?: (tenant: TenantSchoolApp) => void;
  onOpenFeaturesModal?: (tenant: TenantSchoolApp) => void;
  onOpenLeaseTrackerModal?: (tenant: TenantSchoolApp) => void;
  onToggleTenantStatus?: (tenantId: string) => void;
  onNavigateToLanding?: () => void;
  onNavigateToDomainPortal?: () => void;
  onOpenUniversalWizard?: () => void;
}

export type SaaSActiveTab = 
  | 'master_overview'
  | 'provisioned_schools'
  | 'cloned_schools'
  | 'universal_requests'
  | 'instance_lifecycle'
  | 'production_hardening'
  | 'invoicing_ledger'
  | 'lease_contracts'
  | 'features_matrix'
  | 'security_vault';

export const CurriculumServerDashboard: React.FC<CurriculumServerDashboardProps> = ({
  tenants,
  metrics = INITIAL_SAAS_METRICS,
  invoices = [],
  onSelectTenantToLaunch = (_t) => {},
  onOpenProvisionModal = () => {},
  onOpenCloneModal = () => {},
  onOpenConnectModal = () => {},
  onOpenCredentialsModal = (_t) => {},
  onOpenFeaturesModal = (_t) => {},
  onOpenLeaseTrackerModal = (_t) => {},
  onToggleTenantStatus = (_id) => {},
  onNavigateToLanding = () => {},
  onNavigateToDomainPortal = () => {},
  onOpenUniversalWizard
}) => {
  const [activeTab, setActiveTab] = useState<SaaSActiveTab>('provisioned_schools');
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<'all' | BusinessModelType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<TenantBillingInvoice | null>(null);

  // Universal Onboarding State (Phase 8)
  const [universalRequests, setUniversalRequests] = useState<UniversalInstanceRecord[]>([]);
  const [universalTypeFilter, setUniversalTypeFilter] = useState<'all' | UniversalInstanceType>('all');
  const [universalStatusFilter, setUniversalStatusFilter] = useState<string>('all');
  const [reviewModalRequest, setReviewModalRequest] = useState<UniversalInstanceRecord | null>(null);
  const [reviewDecisionNotes, setReviewDecisionNotes] = useState<string>('Approved based on standard architecture profile & cloud security baseline.');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedbackMsg, setActionFeedbackMsg] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);
  const [activationModalData, setActivationModalData] = useState<{ url: string; token: string; expiresAt: string; instanceId: string } | null>(null);
  const [copiedActivationLink, setCopiedActivationLink] = useState(false);

  // Load universal onboarding requests on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRequests = async () => {
      try {
        await customerOnboardingClient.syncFromBackend();
        if (isMounted) {
          setUniversalRequests([...customerOnboardingClient.getInstances()]);
        }
      } catch (err) {
        console.warn('Failed to sync universal onboarding requests:', err);
      }
    };
    fetchRequests();
    return () => { isMounted = false; };
  }, []);

  const refreshUniversalRequests = async () => {
    try {
      await customerOnboardingClient.syncFromBackend();
      setUniversalRequests([...customerOnboardingClient.getInstances()]);
    } catch {}
  };

  // Webhook Simulator State
  const [simWebhookTenantId, setSimWebhookTenantId] = useState<string>(tenants[0]?.id || '');
  const [simWebhookEvent, setSimWebhookEvent] = useState<string>('bursary.fee_installment_paid');
  const [simWebhookStatus, setSimWebhookStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [simWebhookResponse, setSimWebhookResponse] = useState<string | null>(null);

  // Feature matrix local state for toggling
  const [tenantFeatureStates, setTenantFeatureStates] = useState<Record<string, Record<OptionalFeatureKey, boolean>>>(() => {
    const map: Record<string, Record<OptionalFeatureKey, boolean>> = {};
    tenants.forEach(t => {
      map[t.id] = { ...t.enabledFeatures };
    });
    return map;
  });

  const handleToggleMatrixFeature = (tenantId: string, featureKey: OptionalFeatureKey) => {
    setTenantFeatureStates(prev => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        [featureKey]: !prev[tenantId]?.[featureKey]
      }
    }));
  };

  // Revenue chart data
  const revenueTrendData = [
    { month: 'Mar 2026', mrr: 750000, arr: 9000000, leaseEquity: 4200000 },
    { month: 'Apr 2026', mrr: 880000, arr: 10560000, leaseEquity: 5600000 },
    { month: 'May 2026', mrr: 1050000, arr: 12600000, leaseEquity: 7000000 },
    { month: 'Jun 2026', mrr: 1180000, arr: 14160000, leaseEquity: 8200000 },
    { month: 'Jul 2026', mrr: 1250000, arr: 15000000, leaseEquity: 9100000 },
    { month: 'Aug 2026', mrr: metrics.monthlyRecurringRevenueNGN || 1340000, arr: metrics.annualRecurringRevenueNGN || 16080000, leaseEquity: metrics.totalLeaseEquityPoolNGN || 9850000 }
  ];

  // Distribution chart data
  const planDistributionData = [
    { name: 'Yearly Prepaid', value: tenants.filter(t => t.businessModel === 'yearly').length, color: '#10b981' },
    { name: 'Lease to Own', value: tenants.filter(t => t.businessModel === 'lease_to_own').length, color: '#a855f7' },
    { name: 'Monthly Recurring', value: tenants.filter(t => t.businessModel === 'monthly').length, color: '#0ea5e9' }
  ];

  // Capacity comparison chart
  const capacityData = tenants.map(t => ({
    name: t.brandProfile?.shortName || t.schoolName.substring(0, 10),
    active: t.activeStudentsCount,
    capacity: t.studentCapacity,
    utilization: Math.round((t.activeStudentsCount / t.studentCapacity) * 100)
  }));

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.appId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.locationState.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.principalName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModel = modelFilter === 'all' || t.businessModel === modelFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? t.status === 'active' : t.status === 'suspended');

    return matchesSearch && matchesModel && matchesStatus;
  });

  const handleTriggerWebhook = () => {
    setSimWebhookStatus('sending');
    const targetTenant = tenants.find(t => t.id === simWebhookTenantId) || tenants[0];

    setTimeout(() => {
      setSimWebhookStatus('success');
      setSimWebhookResponse(JSON.stringify({
        status: 200,
        statusText: 'OK',
        deliveryId: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantAppId: targetTenant?.appId,
        destinationUrl: targetTenant?.webhookUrl || `https://${targetTenant?.subdomain}/api/v1/webhook-receiver`,
        event: simWebhookEvent,
        signature: 'sha256:7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a',
        latencyMs: 38,
        deliveredAt: new Date().toISOString()
      }, null, 2));
    }, 600);
  };

  // Phase 8: Universal Onboarding Action Handlers
  const handleSimulatePayment = async (record: UniversalInstanceRecord) => {
    setActionLoadingId(record.instanceId);
    setActionFeedbackMsg(null);
    try {
      const pRef = `PSTK_LIVE_REF_${Date.now().toString(16).substring(2, 8)}`;
      const res = await customerOnboardingClient.verifyPayment(
        record.instanceId,
        pRef,
        record.payment?.provider || 'paystack',
        record.payment?.amountNGN || 150000
      );
      if (res.verified) {
        setActionFeedbackMsg({
          id: record.instanceId,
          type: 'success',
          message: `Official ${record.payment?.provider?.toUpperCase() || 'PSP'} payment verified successfully (Ref: ${res.reference}). Status updated to verified. Ready for IIAPE provisioning.`
        });
        await refreshUniversalRequests();
      } else {
        setActionFeedbackMsg({
          id: record.instanceId,
          type: 'error',
          message: (res as any).message || 'Payment verification failed at PSP gateway.'
        });
      }
    } catch (err: any) {
      setActionFeedbackMsg({
        id: record.instanceId,
        type: 'error',
        message: err.message || 'Payment verification failed.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteProvisioning = async (record: UniversalInstanceRecord) => {
    setActionLoadingId(record.instanceId);
    setActionFeedbackMsg(null);
    try {
      await customerOnboardingClient.provisionInstance(record.instanceId);
      setActionFeedbackMsg({
        id: record.instanceId,
        type: 'success',
        message: `IIAPE Architecture Profile executed successfully for ${record.organization.organizationName}. Database schema and storage bucket provisioned. Ready for final activation checks.`
      });
      await refreshUniversalRequests();
    } catch (err: any) {
      setActionFeedbackMsg({
        id: record.instanceId,
        type: 'error',
        message: err.message || 'Provisioning execution failed.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivateInstance = async (record: UniversalInstanceRecord) => {
    setActionLoadingId(record.instanceId);
    setActionFeedbackMsg(null);
    try {
      const res = await customerOnboardingClient.activateInstance(record.instanceId);
      if (res.success && res.activationUrl && res.activationToken && res.expiresAt) {
        setActivationModalData({
          url: res.activationUrl,
          token: res.activationToken,
          expiresAt: res.expiresAt,
          instanceId: record.instanceId
        });
        setActionFeedbackMsg({
          id: record.instanceId,
          type: 'success',
          message: `Mandatory 5-point verification passed. Secure 72-hour expiring activation link issued.`
        });
        await refreshUniversalRequests();
      } else {
        setActionFeedbackMsg({
          id: record.instanceId,
          type: 'error',
          message: (res as any).error || 'Mandatory verification checks failed. Ensure DB, storage, security and DNS are healthy.'
        });
      }
    } catch (err: any) {
      setActionFeedbackMsg({
        id: record.instanceId,
        type: 'error',
        message: err.message || 'Activation failed.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmitReviewDecision = async (approved: boolean) => {
    if (!reviewModalRequest) return;
    setActionLoadingId(reviewModalRequest.instanceId);
    try {
      await customerOnboardingClient.reviewInstanceRequest(
        reviewModalRequest.requestId,
        approved,
        reviewDecisionNotes
      );
      setActionFeedbackMsg({
        id: reviewModalRequest.instanceId,
        type: approved ? 'success' : 'error',
        message: approved 
          ? `Technical architecture approved for ${reviewModalRequest.organization.organizationName}. Gated deployment authorized.`
          : `Architecture request rejected with reviewer audit notes.`
      });
      setReviewModalRequest(null);
      await refreshUniversalRequests();
    } catch (err: any) {
      setActionFeedbackMsg({
        id: reviewModalRequest.instanceId,
        type: 'error',
        message: err.message || 'Review submission failed.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered universal onboarding requests
  const filteredUniversalRequests = universalRequests.filter(req => {
    if (universalTypeFilter !== 'all' && req.instanceType !== universalTypeFilter) return false;
    if (universalStatusFilter !== 'all' && req.provisioningStatus !== universalStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrg = req.organization?.organizationName?.toLowerCase().includes(q);
      const matchContact = req.organization?.contactPersonName?.toLowerCase().includes(q) || req.organization?.contactEmail?.toLowerCase().includes(q);
      const matchSub = req.subdomain?.toLowerCase().includes(q) || req.instanceId?.toLowerCase().includes(q);
      if (!matchOrg && !matchContact && !matchSub) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* SaaS Master Platform Hero & Control Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CURRICULUM SERVER • MASTER SAAS HUB
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                Multi-Tenant Core v3.0
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              School Instance Fleet & Multi-Tenant Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Provision, license, and govern isolated <strong className="text-emerald-300 font-semibold">CurriculumFlow</strong> instances. Manage Application IDs, 256-bit App Secrets, Lease-to-Own equity amortization, and modular add-on flags.
            </p>
          </div>

          {/* Master Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onNavigateToLanding && (
              <button
                onClick={onNavigateToLanding}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 text-xs font-bold border border-emerald-800/60 shadow-md flex items-center gap-2 transition-all"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Showcase Landing</span>
              </button>
            )}

            {onNavigateToDomainPortal && (
              <button
                onClick={onNavigateToDomainPortal}
                className="px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-xs font-bold border border-amber-700/70 shadow-md flex items-center gap-2 transition-all"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Domain Portal (.sch.ng)</span>
              </button>
            )}

            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow-md flex items-center gap-2 transition-all"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>Connect Provisioned App</span>
            </button>

            {onOpenUniversalWizard && (
              <button
                onClick={onOpenUniversalWizard}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Universal Onboarding (Phase 8)</span>
              </button>
            )}

            <button
              onClick={onOpenProvisionModal || onOpenCloneModal}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/60 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Provision New School</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 5 SaaS Business & Infrastructure Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* MRR */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Monthly Recurring</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">
            ₦{(metrics?.monthlyRecurringRevenueNGN ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14.2% MoM Growth</span>
          </div>
        </div>

        {/* ARR */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Annual Run-Rate (ARR)</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-black text-white">
            ₦{(metrics?.annualRecurringRevenueNGN ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Contracted annual revenue</span>
        </div>

        {/* Lease-to-Own Equity Pool */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-800/40 hover:border-purple-700 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-purple-300 text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Lease-to-Own Equity</span>
            <Coins className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-200">
            ₦{(metrics?.totalLeaseEquityPoolNGN ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-purple-400/80 block mt-1">{metrics?.leaseToOwnTenants ?? 0} active buyout contracts</span>
        </div>

        {/* Provisioned Schools */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Provisioned Instances</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-white">
            {metrics?.totalTenants ?? tenants?.length ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">Schools</span>
          </p>
          <span className="text-[10px] text-emerald-400 block mt-1">100% Shard Health</span>
        </div>

        {/* Total Managed Students */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Managed Students</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-white">
            {(metrics?.totalManagedStudents ?? (metrics as any)?.activeStudentsAcrossFleet ?? 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 block mt-1">Across 5 Isolated Schemas</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          {[
            { id: 'master_overview', label: 'Master SaaS Analytics', icon: TrendingUp },
            { id: 'provisioned_schools', label: 'Provisioned School Fleet', count: filteredTenants.length, icon: Building2 },
            { id: 'universal_requests', label: 'Universal Onboarding (Phase 8)', count: universalRequests.length, icon: Sparkles },
            { id: 'instance_lifecycle', label: 'Lifecycle & Migration (Phase 9)', icon: Server },
            { id: 'production_hardening', label: 'Hardening & Cost (Phase 10)', icon: ShieldCheck },
            { id: 'invoicing_ledger', label: 'Billing Invoices Ledger', count: invoices.length, icon: CreditCard },
            { id: 'lease_contracts', label: 'Lease-to-Own Buyouts', count: metrics.leaseToOwnTenants, icon: Award },
            { id: 'features_matrix', label: 'Feature Flags Matrix', count: OPTIONAL_FEATURE_DEFINITIONS.length, icon: Sliders },
            { id: 'security_vault', label: 'Security & Webhooks', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SaaSActiveTab)}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MASTER SAAS OVERVIEW & TELEMETRY */}
      {activeTab === 'master_overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Revenue & Growth Trend Area Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base">SaaS Revenue Growth & Equity Pool</h3>
                  <p className="text-xs text-slate-400">Monthly Recurring Revenue (MRR) vs Lease-to-Own Equity Pool</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>MRR</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Lease Equity</span>
                  </div>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, '']}
                    />
                    <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#mrrGrad)" name="Monthly MRR" />
                    <Area type="monotone" dataKey="leaseEquity" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#equityGrad)" name="Lease Equity Pool" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Distribution Pie Chart */}
            <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Business Model Share</h3>
                <p className="text-xs text-slate-400">Distribution across active institutional tenants</p>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(v) => [`${v} Schools`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {planDistributionData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white">{item.value} ({Math.round((item.value / tenants.length) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Capacity & Infrastructure Utilization */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Tenant Enrollment vs Capacity Utilization</h3>
              <p className="text-xs text-slate-400">Active student load per dedicated database shard</p>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="active" fill="#38bdf8" name="Active Students" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" fill="#334155" name="Licensed Capacity" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVISIONED SCHOOLS FLEET MANAGER */}
      {(activeTab === 'provisioned_schools' || activeTab === 'cloned_schools') && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by school, App ID, state, subdomain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Business Model Filter */}
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Models</option>
                <option value="yearly">Yearly Prepaid</option>
                <option value="lease_to_own">Lease to Own</option>
                <option value="monthly">Monthly Recurring</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Table View"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={onOpenProvisionModal || onOpenCloneModal}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Provision School</span>
              </button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map(tenant => {
                const primaryColor = tenant.brandProfile?.brandTheme?.primaryColor || '#059669';
                const capacityPercent = Math.min(100, Math.round((tenant.activeStudentsCount / tenant.studentCapacity) * 100));

                return (
                  <div
                    key={tenant.id}
                    className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl transition-all flex flex-col justify-between relative overflow-hidden group"
                  >
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5" 
                      style={{ backgroundColor: primaryColor }} 
                    />

                    <div className="space-y-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {tenant.schoolName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base leading-snug group-hover:text-emerald-300 transition-colors">
                              {tenant.schoolName}
                            </h4>
                            <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <span>{tenant.locationState}</span>
                              <span>•</span>
                              <span className="text-emerald-400">{tenant.subdomain}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          tenant.businessModel === 'lease_to_own'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : tenant.businessModel === 'yearly'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-sky-950 text-sky-300 border-sky-800'
                        }`}>
                          {tenant.businessModel.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Credentials & Shard Meta */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">App ID:</span>
                          <span className="text-slate-200 font-bold">{tenant.appId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Shard Node:</span>
                          <span className="text-emerald-400">{tenant.databaseShardId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Principal:</span>
                          <span className="text-slate-300 truncate max-w-[140px]">{tenant.principalName}</span>
                        </div>
                      </div>

                      {/* 4 Architecture Bundles Mini-Badges */}
                      <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold uppercase tracking-wider">Licensed Architecture Bundles</span>
                          <span className="text-emerald-400 font-bold">
                            {Object.values(tenant.licensedBundles || { administration: true, teaching: true, assessment: true, accounts_billing: true }).filter(Boolean).length}/4
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-center">
                          {[
                            { key: 'administration', label: 'Admin', activeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
                            { key: 'teaching', label: 'Teach', activeColor: 'bg-blue-950 text-blue-300 border-blue-700' },
                            { key: 'assessment', label: 'Assess', activeColor: 'bg-purple-950 text-purple-300 border-purple-700' },
                            { key: 'accounts_billing', label: 'Billing', activeColor: 'bg-amber-950 text-amber-300 border-amber-700' }
                          ].map(b => {
                            const isBundleActive = tenant.licensedBundles ? !!tenant.licensedBundles[b.key as any] : true;
                            return (
                              <span
                                key={b.key}
                                className={`py-0.5 px-1 rounded-md border truncate ${
                                  isBundleActive
                                    ? b.activeColor
                                    : 'bg-slate-900 text-slate-600 border-slate-800 line-through opacity-50'
                                }`}
                              >
                                {b.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Student Load:</span>
                          <span className="text-slate-200 font-mono font-bold">
                            {tenant.activeStudentsCount} / {tenant.studentCapacity} ({capacityPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${capacityPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${capacityPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <button
                          onClick={() => onOpenCredentialsModal(tenant)}
                          className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                          title="View App Secret & Credentials"
                        >
                          <Key className="w-3 h-3 text-amber-400" />
                          <span>Secret</span>
                        </button>

                        <button
                          onClick={() => onOpenFeaturesModal(tenant)}
                          className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                          title="Configure Modular Feature Flags"
                        >
                          <Sliders className="w-3 h-3 text-sky-400" />
                          <span>Features</span>
                        </button>

                        {tenant.businessModel === 'lease_to_own' ? (
                          <button
                            onClick={() => onOpenLeaseTrackerModal(tenant)}
                            className="py-1.5 px-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-[11px] font-semibold flex items-center justify-center gap-1 border border-purple-800 transition-colors"
                            title="View Lease-to-Own Equity Schedule"
                          >
                            <Award className="w-3 h-3 text-purple-400" />
                            <span>Equity</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onToggleTenantStatus(tenant.id)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 border transition-colors ${
                              tenant.status === 'active' 
                                ? 'bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border-slate-700'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            <Radio className="w-3 h-3" />
                            <span>{tenant.status === 'active' ? 'Active' : 'Resume'}</span>
                          </button>
                        )}
                      </div>

                      {/* Primary Launch Instance Button */}
                      <button
                        onClick={() => onSelectTenantToLaunch(tenant)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Launch School Portal</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3.5">School & Subdomain</th>
                      <th className="p-3.5">App ID</th>
                      <th className="p-3.5">Business Model</th>
                      <th className="p-3.5">Capacity</th>
                      <th className="p-3.5">Shard Node</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTenants.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{t.schoolName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{t.subdomain}</div>
                        </td>
                        <td className="p-3.5 font-mono text-emerald-400 font-bold">{t.appId}</td>
                        <td className="p-3.5">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-mono">
                            {t.businessModel.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono">
                          {t.activeStudentsCount} / {t.studentCapacity}
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{t.databaseShardId}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => onOpenCredentialsModal(t)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                            title="App Secret"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectTenantToLaunch(t)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Launch</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: UNIVERSAL ONBOARDING & INSTANCE REQUESTS (PHASE 8) */}
      {activeTab === 'universal_requests' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Universal Onboarding Banner & Control Bar */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    PHASE 8 • UNIVERSAL ONBOARDING ENGINE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                    Paystack & OPay Verified
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-xl tracking-tight">
                  Customer Instance Requests & Provisioning Queue
                </h3>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mt-1">
                  Generalised customer onboarding supporting <strong className="text-indigo-300 font-semibold">Full School Management</strong> (Secondary, Combined, Vocational), <strong className="text-amber-300 font-semibold">Custom Architecture</strong> (with strict technical review gates), and <strong className="text-purple-300 font-semibold">Feature Collections</strong> (with automated dependency validation).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={refreshUniversalRequests}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                  title="Refresh instance requests from backend"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Refresh</span>
                </button>

                {onOpenUniversalWizard && (
                  <button
                    onClick={onOpenUniversalWizard}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Launch 11-Stage Onboarding Wizard</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-KPI Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Total Requests</div>
                <div className="text-xl font-black text-white mt-0.5">{universalRequests.length}</div>
                <div className="text-[10px] text-slate-500">Across 3 Archetypes</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-indigo-400 uppercase">Full School ERP</div>
                <div className="text-xl font-black text-white mt-0.5">
                  {universalRequests.filter(r => r.instanceType === 'full_school_management').length}
                </div>
                <div className="text-[10px] text-indigo-400/80">Sec / Comb / Voc</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-amber-400 uppercase">Custom Architecture</div>
                <div className="text-xl font-black text-white mt-0.5">
                  {universalRequests.filter(r => r.instanceType === 'custom_architecture').length}
                </div>
                <div className="text-[10px] text-amber-400/80">
                  {universalRequests.filter(r => r.provisioningStatus === 'pending_review').length} Pending Review
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-emerald-400 uppercase">Active / Ready</div>
                <div className="text-xl font-black text-white mt-0.5">
                  {universalRequests.filter(r => r.provisioningStatus === 'active' || r.provisioningStatus === 'ready_for_activation').length}
                </div>
                <div className="text-[10px] text-emerald-400/80">5-Point Verified</div>
              </div>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedbackMsg && (
            <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-fadeIn ${
              actionFeedbackMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border-rose-800 text-rose-200'
            }`}>
              <div className="flex items-center gap-2.5 text-xs">
                {actionFeedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{actionFeedbackMsg.message}</span>
              </div>
              <button
                onClick={() => setActionFeedbackMsg(null)}
                className="text-slate-400 hover:text-slate-200 text-xs shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Archetype:</span>
              {[
                { id: 'all', label: 'All Archetypes' },
                { id: 'full_school_management', label: 'Full School Management' },
                { id: 'custom_architecture', label: 'Custom Architecture' },
                { id: 'feature_collection', label: 'Feature Collection' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setUniversalTypeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                    universalTypeFilter === f.id
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={universalStatusFilter}
                onChange={(e) => setUniversalStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review (Custom Arch)</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="provisioning">Provisioning / In Progress</option>
                <option value="ready_for_activation">Ready for Activation</option>
                <option value="active">Active & Verified</option>
              </select>
            </div>
          </div>

          {/* Instance Requests List */}
          {filteredUniversalRequests.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">No Instance Requests Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  No requests match the active archetype or status filters. Launch the 11-stage wizard to onboard a new customer instance.
                </p>
              </div>
              {onOpenUniversalWizard && (
                <button
                  onClick={onOpenUniversalWizard}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Customer Request</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredUniversalRequests.map(req => {
                const isCustom = req.instanceType === 'custom_architecture';
                const isFeature = req.instanceType === 'feature_collection';
                const isSchool = req.instanceType === 'full_school_management';
                const isLoading = actionLoadingId === req.instanceId;

                return (
                  <div
                    key={req.requestId || req.instanceId}
                    className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl space-y-5"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            isSchool
                              ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                              : isCustom
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-purple-950 text-purple-300 border-purple-800'
                          }`}>
                            {isSchool ? 'Full School Management' : isCustom ? 'Custom Architecture' : 'Feature Collection'}
                          </span>

                          {req.schoolCategory && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono capitalize border border-slate-700">
                              {req.schoolCategory.replace(/_/g, ' ')}
                            </span>
                          )}

                          <span className="text-slate-500 font-mono text-[11px]">•</span>
                          <span className="text-slate-400 font-mono text-[11px]">{req.organization.registrationNumber}</span>
                        </div>

                        <h4 className="text-lg font-bold text-white tracking-tight">
                          {req.organization.organizationName}
                        </h4>

                        <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Contact: <strong className="text-slate-200">{req.organization.contactPersonName}</strong></span>
                          <span>•</span>
                          <span className="font-mono text-slate-300">{req.organization.contactEmail}</span>
                          <span>•</span>
                          <span>{req.organization.contactPhone}</span>
                        </div>
                      </div>

                      {/* Status & Subdomain Pills */}
                      <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border flex items-center gap-1 ${
                            req.provisioningStatus === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : req.provisioningStatus === 'ready_for_activation'
                              ? 'bg-teal-950 text-teal-300 border-teal-800'
                              : req.provisioningStatus === 'pending_review'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : req.provisioningStatus === 'payment_pending'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                          }`}>
                            {req.provisioningStatus === 'active' && <CheckCircle2 className="w-3 h-3" />}
                            {req.provisioningStatus === 'pending_review' && <Clock className="w-3 h-3" />}
                            {req.provisioningStatus.replace(/_/g, ' ')}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                            ₦{(req.payment?.amountNGN || req.monthlyPriceNGN || 0).toLocaleString()} ({req.billingModel})
                          </span>
                        </div>

                        <div className="text-xs font-mono text-emerald-400">
                          {req.subdomain}
                        </div>
                      </div>
                    </div>

                    {/* Technical Specification Chips */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">Database & Shard</span>
                        <div className="text-slate-200 font-mono font-medium flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{req.databaseStrategy?.replace(/_/g, ' ') || 'PostgreSQL Isolated'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">Storage Provider</span>
                        <div className="text-slate-200 font-mono font-medium flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                          <span>{req.storageStrategy?.replace(/_/g, ' ') || 'Platform Storage'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">Payment Verification</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${
                            req.payment?.paymentStatus === 'verified'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {req.payment?.paymentStatus === 'verified' ? 'Verified Gateway' : 'Pending Gateway'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">({req.payment?.provider?.toUpperCase()})</span>
                        </div>
                      </div>
                    </div>

                    {/* Selected Modules & Feature Badges */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Selected Application Modules & Features ({req.selectedModules?.length || 0}):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {req.selectedModules?.map(mod => (
                          <span
                            key={mod}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700/80 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{mod.replace(/_/g, ' ')}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Custom Architecture Special Review Box */}
                    {isCustom && req.customArchitecture && (
                      <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Technical Review Gate Specifications:</span>
                          </span>
                          <span className="text-[10px] font-mono text-amber-400">
                            Components: {req.customArchitecture.applicationComponents?.length || 0}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                          <div><span className="text-slate-500">APIs:</span> {req.customArchitecture.apiRequirements || 'None specified'}</div>
                          <div><span className="text-slate-500">Existing Systems:</span> {req.customArchitecture.existingSystems || 'Greenfield'}</div>
                          <div><span className="text-slate-500">Authentication:</span> {req.customArchitecture.authenticationRequirements || 'Standard OAuth2'}</div>
                          <div><span className="text-slate-500">Networking:</span> {req.customArchitecture.networkingRequirements || 'Cloud NAT / VPC'}</div>
                        </div>
                        {req.customArchitecture.adminReviewNotes && (
                          <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-200">
                            <strong>Review Audit:</strong> {req.customArchitecture.adminReviewNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5-Point Verification Checklist Status */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-400 text-[11px]">5-Point Verification:</span>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className={`px-2 py-0.5 rounded border ${req.verification?.databaseConnected ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            DB: {req.verification?.databaseConnected ? 'Passed' : 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${req.verification?.storageReady ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            Storage: {req.verification?.storageReady ? 'Passed' : 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${req.verification?.securityProfileApplied ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            Security: {req.verification?.securityProfileApplied ? 'Passed' : 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${req.verification?.dnsProvisioned ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            DNS: {req.verification?.dnsProvisioned ? 'Passed' : 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${req.verification?.healthPingPassed ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            Health: {req.verification?.healthPingPassed ? 'Passed' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 1. Review Trigger for Custom Architecture */}
                        {isCustom && req.provisioningStatus === 'pending_review' && (
                          <button
                            onClick={() => setReviewModalRequest(req)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Technical Review</span>
                          </button>
                        )}

                        {/* 2. Official PSP Payment Simulation */}
                        {req.payment?.paymentStatus !== 'verified' && (
                          <button
                            onClick={() => handleSimulatePayment(req)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Verify {req.payment?.provider?.toUpperCase() || 'PSP'}</span>
                          </button>
                        )}

                        {/* 3. Execute Provisioning */}
                        {(req.provisioningStatus === 'payment_verified' || req.provisioningStatus === 'approved_awaiting_provisioning' || (req.payment?.paymentStatus === 'verified' && req.provisioningStatus !== 'active' && req.provisioningStatus !== 'ready_for_activation')) && (
                          <button
                            onClick={() => handleExecuteProvisioning(req)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Run IIAPE Provisioning</span>
                          </button>
                        )}

                        {/* 4. Subsystem Verification & Activation */}
                        {req.provisioningStatus === 'ready_for_activation' && (
                          <button
                            onClick={() => handleActivateInstance(req)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-950/40"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Verify & Activate (72h Link)</span>
                          </button>
                        )}

                        {/* 5. Active Details */}
                        {req.provisioningStatus === 'active' && (
                          <button
                            onClick={() => {
                              if (req.activationUrl && req.activationToken && req.activationExpiresAt) {
                                setActivationModalData({
                                  url: req.activationUrl,
                                  token: req.activationToken,
                                  expiresAt: req.activationExpiresAt,
                                  instanceId: req.instanceId
                                });
                              } else {
                                handleActivateInstance(req);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-800/60"
                          >
                            <Key className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Activation Token</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BILLING & INVOICING LEDGER */}
      {activeTab === 'invoicing_ledger' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-white text-lg">Tenant Invoicing & Billing Ledger</h3>
                <p className="text-xs text-slate-400">Track all SaaS subscriptions, VAT invoices, and automated Paystack/OPay gateway settlements</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Total Invoices: {invoices.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Tenant School</th>
                    <th className="p-3.5">Billing Period</th>
                    <th className="p-3.5">Amount (NGN)</th>
                    <th className="p-3.5">VAT (7.5%)</th>
                    <th className="p-3.5">Total Paid</th>
                    <th className="p-3.5">Gateway / PSP</th>
                    <th className="p-3.5 text-right">Receipt Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-emerald-400 font-bold">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-sans font-semibold text-white">{inv.tenantSchoolName}</td>
                      <td className="p-3.5 text-slate-300 font-sans">{inv.billingPeriod}</td>
                      <td className="p-3.5 text-slate-300">₦{(inv.amount ?? 0).toLocaleString()}</td>
                      <td className="p-3.5 text-slate-400">₦{(inv.taxVat ?? 0).toLocaleString()}</td>
                      <td className="p-3.5 text-emerald-400 font-bold">₦{(inv.totalAmount ?? 0).toLocaleString()}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px]">
                          {inv.pspChannel}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoiceForReceipt(inv)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-sans font-semibold inline-flex items-center gap-1 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt Preview Modal */}
          {selectedInvoiceForReceipt && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    <span className="font-mono font-bold text-white text-sm">CURRICULUM SERVER OFFICIAL VOUCHER</span>
                  </div>
                  <button
                    onClick={() => setSelectedInvoiceForReceipt(null)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 font-mono">
                    <div>
                      <span className="text-slate-500 block">Invoice Reference:</span>
                      <span className="text-emerald-400 font-bold">{selectedInvoiceForReceipt.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Settlement Date:</span>
                      <span className="text-slate-200">{selectedInvoiceForReceipt.paidDate}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Client Institution:</span>
                      <span className="text-white font-bold font-sans">{selectedInvoiceForReceipt.tenantSchoolName}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Base License Fee:</span>
                      <span className="text-slate-200">₦{(selectedInvoiceForReceipt.amount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">FIRS VAT (7.5%):</span>
                      <span className="text-slate-200">₦{(selectedInvoiceForReceipt.taxVat ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-800">
                      <span className="text-emerald-400 font-sans">Total Paid:</span>
                      <span className="text-emerald-400">₦{(selectedInvoiceForReceipt.totalAmount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {selectedInvoiceForReceipt.notes}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedInvoiceForReceipt(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Close Voucher
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LEASE-TO-OWN AMORTIZATION TRACKER */}
      {activeTab === 'lease_contracts' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-purple-800/40 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono font-bold uppercase">
                  Perpetual Ownership Engine
                </span>
                <h3 className="font-black text-white text-xl mt-2">Active Lease-to-Own Amortization Hub</h3>
                <p className="text-xs text-slate-400">Schools building direct equity toward 100% perpetual source-code buyout & escrow release</p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-800/80 text-right">
                <span className="text-xs text-purple-300 block">Total Accumulated Equity</span>
                <span className="text-2xl font-black text-white font-mono">₦{(metrics?.totalLeaseEquityPoolNGN ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tenants.filter(t => t.businessModel === 'lease_to_own' && t.leaseToOwnContract).map(tenant => {
                const contract = tenant.leaseToOwnContract!;
                const equityPct = Math.min(100, Math.round(((contract.totalEquityAccumulated ?? 0) / (contract.totalBuyoutPrice || 1)) * 100));

                return (
                  <div 
                    key={tenant.id}
                    className="p-6 rounded-3xl bg-slate-950/80 border border-purple-800/50 space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{tenant.schoolName}</h4>
                        <span className="text-xs text-purple-300 font-mono">{tenant.appId}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-700 text-xs font-mono font-bold">
                        {contract.monthsPaid} / {contract.amortizationPeriodMonths} Months Paid
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Equity Accumulated:</span>
                        <span className="text-purple-300 font-bold">{equityPct}% (₦{(contract.totalEquityAccumulated ?? 0).toLocaleString()})</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${equityPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>Start: {contract.startDate}</span>
                        <span>Target Handover: {contract.targetPerpetualHandoverDate}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Total Buyout Value:</span>
                        <span className="text-white font-bold">₦{(contract.totalBuyoutPrice ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Remaining Balance:</span>
                        <span className="text-amber-400 font-bold">₦{(contract.remainingBuyoutBalance ?? 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenLeaseTrackerModal(tenant)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950"
                    >
                      <Award className="w-4 h-4" />
                      <span>Manage Buyout & Escrow Release</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OPTIONAL FEATURES & ADD-ON MATRIX */}
      {activeTab === 'features_matrix' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div>
              <h3 className="font-bold text-white text-lg">Modular Add-ons & Feature Flags Matrix</h3>
              <p className="text-xs text-slate-400">Toggle modular enterprise capabilities per institution with instant rate adjustments</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5">Module Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Monthly Fee</th>
                    {tenants.map(t => (
                      <th key={t.id} className="p-3.5 text-center font-sans font-bold text-slate-200">
                        {t.brandProfile?.shortName || t.schoolName.substring(0, 8)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {OPTIONAL_FEATURE_DEFINITIONS.map(feat => (
                    <tr key={feat.key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{feat.name}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{feat.shortDesc}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400">
                          {feat.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">₦{(feat.monthlyPrice ?? 0).toLocaleString()}/mo</td>
                      {tenants.map(t => {
                        const isEnabled = tenantFeatureStates[t.id]?.[feat.key] ?? t.enabledFeatures[feat.key];

                        return (
                          <td key={`${t.id}-${feat.key}`} className="p-3.5 text-center">
                            <button
                              onClick={() => handleToggleMatrixFeature(t.id, feat.key)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                                isEnabled 
                                  ? 'bg-emerald-600 text-white shadow-md' 
                                  : 'bg-slate-950 text-slate-600 border border-slate-800 hover:text-slate-400'
                              }`}
                              title={isEnabled ? 'Enabled (Click to disable)' : 'Disabled (Click to enable)'}
                            >
                              {isEnabled ? <Check className="w-4 h-4" /> : <span className="text-xs">✕</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY VAULT & WEBHOOK TESTER */}
      {activeTab === 'security_vault' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Webhook Tester */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Inbound Webhook Dispatcher</span>
                </h3>
                <p className="text-xs text-slate-400">Send simulated signed HMAC webhook events to verify tenant webhook endpoints</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Select Target School Instance:</label>
                  <select
                    value={simWebhookTenantId}
                    onChange={(e) => setSimWebhookTenantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.schoolName} ({t.appId})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Webhook Event Type:</label>
                  <select
                    value={simWebhookEvent}
                    onChange={(e) => setSimWebhookEvent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  >
                    <option value="bursary.fee_installment_paid">bursary.fee_installment_paid</option>
                    <option value="attendance.turnstile_swipe">attendance.turnstile_swipe</option>
                    <option value="cbt.exam_submitted_auto_graded">cbt.exam_submitted_auto_graded</option>
                    <option value="student.admission_approved">student.admission_approved</option>
                  </select>
                </div>

                <button
                  onClick={handleTriggerWebhook}
                  disabled={simWebhookStatus === 'sending'}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {simWebhookStatus === 'sending' ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Event...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch HMAC Webhook Payload</span>
                    </>
                  )}
                </button>
              </div>

              {simWebhookResponse && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                    <span>Response: 200 OK</span>
                    <span>Latency: 38ms</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre">
                    {simWebhookResponse}
                  </pre>
                </div>
              )}
            </div>

            {/* Cryptographic Secrets & IAM Root */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>SaaS Master Key & Root Governance</span>
                </h3>
                <p className="text-xs text-slate-400">Platform-level cryptographic tokens & cross-tenant security</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Platform Root Secret</span>
                  <div className="flex items-center justify-between text-slate-200 mt-1">
                    <span>cf_root_sec_live_9981a7...</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">Active</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Multi-Tenant Isolation Protocol</span>
                  <span className="text-slate-300 block mt-1">PostgreSQL Isolated Sharding + HMAC-SHA256 Signatures</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>TRCN & NDPR Data Compliance</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  All biometric facial markers, CBT questions, and student grade ledgers are encrypted at rest with AES-256 and localized within Nigerian sovereign data partitions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INSTANCE LIFECYCLE & ARCHITECTURE MIGRATION (PHASE 9) */}
      {activeTab === 'instance_lifecycle' && (
        <InstanceLifecycleCenter />
      )}

      {/* TAB: PRODUCTION HARDENING, SECURITY & COST GOVERNANCE (PHASE 10) */}
      {activeTab === 'production_hardening' && (
        <ProductionHardeningDeck />
      )}

      {/* MODAL 1: TECHNICAL ARCHITECTURE REVIEW GATE */}
      {reviewModalRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono text-[10px] font-bold uppercase">
                    TECHNICAL REVIEW GATE
                  </span>
                  <span className="text-slate-400 font-mono text-xs">{reviewModalRequest.requestId}</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {reviewModalRequest.organization.organizationName}
                </h3>
                <p className="text-xs text-slate-400">
                  Contact: {reviewModalRequest.organization.contactPersonName} ({reviewModalRequest.organization.contactEmail})
                </p>
              </div>
              <button
                onClick={() => setReviewModalRequest(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Architecture Non-Negotiable Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Architectural Governance Directive:</strong> Complex custom requests must be formally reviewed. Arbitrary customer-supplied binary or container code must never be deployed automatically.
              </div>
            </div>

            {/* Specification breakdown */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Application Components</div>
                <div className="flex flex-wrap gap-1.5">
                  {reviewModalRequest.customArchitecture?.applicationComponents?.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      {c}
                    </span>
                  )) || <span className="text-slate-500">None specified</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">API Requirements</div>
                  <div className="text-slate-200 mt-1">{reviewModalRequest.customArchitecture?.apiRequirements || 'Standard REST APIs'}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Existing Systems</div>
                  <div className="text-slate-200 mt-1">{reviewModalRequest.customArchitecture?.existingSystems || 'Greenfield'}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Authentication</div>
                  <div className="text-slate-200 mt-1">{reviewModalRequest.customArchitecture?.authenticationRequirements || 'OAuth2 / SAML'}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Networking & VPC</div>
                  <div className="text-slate-200 mt-1">{reviewModalRequest.customArchitecture?.networkingRequirements || 'Cloud NAT / VPC Peering'}</div>
                </div>
              </div>
            </div>

            {/* Review Decision Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Lead Architect Review Audit Notes:
              </label>
              <textarea
                value={reviewDecisionNotes}
                onChange={(e) => setReviewDecisionNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Enter audit rationale for approval or rejection..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReviewModalRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitReviewDecision(false)}
                disabled={actionLoadingId === reviewModalRequest.instanceId}
                className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-colors"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleSubmitReviewDecision(true)}
                disabled={actionLoadingId === reviewModalRequest.instanceId}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Approve Architecture Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 72-HOUR ACTIVATION LINK MODAL */}
      {activationModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Instance Verified & Activated
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mandatory 5-point subsystem checks passed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivationModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Checklist summary */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-emerald-400">
                <span>Database Connection (PostgreSQL Shard):</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passed</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Storage Bucket & Permissions:</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passed</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Security Profile & HMAC Cryptographic Keys:</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passed</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Subdomain Routing & DNS:</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passed</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Subsystem Health Ping:</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passed</span>
              </div>
            </div>

            {/* Expiring activation URL display */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Secure 72-Hour Expiring Activation Link:
              </label>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between gap-2">
                <span>{activationModalData.url}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Expires: {new Date(activationModalData.expiresAt).toLocaleString()}</span>
                <span>Role: administrator_invitee</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activationModalData.url);
                  setCopiedActivationLink(true);
                  setTimeout(() => setCopiedActivationLink(false), 2500);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
              >
                {copiedActivationLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Activation Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setActivationModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
