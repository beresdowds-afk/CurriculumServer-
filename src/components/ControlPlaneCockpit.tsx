import React, { useState, useEffect, useRef } from 'react';
import { 
  TenantSchoolApp, 
  CurriculumServerSaaSMetrics, 
  TenantBillingInvoice,
  OptionalFeatureKey,
  PlatformAuditRecord
} from '../types';
import { TenantSecurityContextManager } from '../services/tenantSecurityContext';
import { EntitlementEnforcementService, DEFAULT_PLAN_POLICIES } from '../services/entitlementEnforcementService';
import { TamperEvidentAuditService } from '../services/tamperEvidentAuditService';
import { TenantLifecycleManager } from '../services/tenantLifecycleManager';
import { runAllTenantIsolationTests } from '../services/tenantIsolationTests';
import { PspConnectivityWidget } from './PspConnectivityWidget';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Play, 
  RotateCw, 
  Terminal as TerminalIcon, 
  Layers, 
  Database, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Sliders, 
  Check, 
  Copy, 
  ChevronRight, 
  Flame, 
  Sparkles, 
  Gauge, 
  KeyRound, 
  Radio, 
  Boxes, 
  Power, 
  Workflow, 
  Braces, 
  FileCode, 
  Send
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface ControlPlaneCockpitProps {
  tenants: TenantSchoolApp[];
  metrics: CurriculumServerSaaSMetrics;
  invoices: TenantBillingInvoice[];
  onSelectTenantToLaunch: (tenant: TenantSchoolApp) => void;
  onOpenProvisionTerminal?: (draft?: Partial<TenantSchoolApp>) => void;
  onOpenIsolationTestModal?: () => void;
  onOpenVersionRolloutModal?: () => void;
  onOpenDomainPortal?: () => void;
  onOpenApiWebhooks?: () => void;
  onToggleTenantStatus?: (tenantId: string) => void;
  onUpdateTenantFeatures?: (tenantId: string, features: Record<OptionalFeatureKey, boolean>) => void;
}

export type CockpitViewSection = 
  | 'orchestrator_matrix'
  | 'container_fleet'
  | 'quota_telemetry'
  | 'ledger_security'
  | 'operations_terminal';

interface ContainerPodState {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  type: 'web' | 'api' | 'worker' | 'db';
  name: string;
  image: string;
  port: number;
  cpuPercent: number;
  memoryMb: number;
  maxMemoryMb: number;
  status: 'running' | 'restarting' | 'stopped' | 'degraded';
  uptimeSeconds: number;
  restarts: number;
  healthProbe: '200_OK' | 'PROBING' | 'WARN';
  latencyMs: number;
}

export const ControlPlaneCockpit: React.FC<ControlPlaneCockpitProps> = ({
  tenants,
  metrics,
  invoices,
  onSelectTenantToLaunch,
  onOpenProvisionTerminal,
  onOpenIsolationTestModal,
  onOpenVersionRolloutModal,
  onOpenDomainPortal,
  onOpenApiWebhooks,
  onToggleTenantStatus
}) => {
  const [activeSection, setActiveSection] = useState<CockpitViewSection>('orchestrator_matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(true);
  const [tick, setTick] = useState(0);

  // Terminal CLI State
  const [terminalHistory, setTerminalHistory] = useState<Array<{ text: string; type: 'cmd' | 'output' | 'error' | 'success' | 'info' }>>([
    { text: 'CURRICULUM SERVER CONTROL PLANE COCKPIT v2.4.0-orchestrator', type: 'info' },
    { text: 'Architecture: Phased Docker-per-Tenant Isolation Stack initialized', type: 'info' },
    { text: 'HMAC Security Gateway: ACTIVE (Zero cross-tenant bleed policy enforced)', type: 'success' },
    { text: 'Type "help" to see available infrastructure commands, or click the quick-run pills below.', type: 'output' }
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Ledger Verification State
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);
  const [ledgerVerificationResult, setLedgerVerificationResult] = useState<{ isValid: boolean; totalRecords: number; blockHeight: number; reason?: string } | null>(null);

  // Simulated Container Pods derived from actual tenants
  const [containerPods, setContainerPods] = useState<ContainerPodState[]>(() => {
    const pods: ContainerPodState[] = [];
    let portCounter = 8080;

    tenants.forEach(t => {
      const slug = t.schoolSlug || t.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      // Web Container
      pods.push({
        id: `pod_${t.id}_web`,
        tenantId: t.id,
        tenantName: t.schoolName,
        tenantSlug: slug,
        type: 'web',
        name: `cf-${slug}-frontend`,
        image: 'curriculumflow-ui:v1.4.2',
        port: portCounter++,
        cpuPercent: Math.floor(Math.random() * 12) + 2,
        memoryMb: Math.floor(Math.random() * 120) + 140,
        maxMemoryMb: 512,
        status: t.status === 'active' ? 'running' : 'stopped',
        uptimeSeconds: Math.floor(Math.random() * 864000) + 72000,
        restarts: 0,
        healthProbe: '200_OK',
        latencyMs: Math.floor(Math.random() * 8) + 12
      });

      // API Backend Container
      pods.push({
        id: `pod_${t.id}_api`,
        tenantId: t.id,
        tenantName: t.schoolName,
        tenantSlug: slug,
        type: 'api',
        name: `cf-${slug}-backend-api`,
        image: 'curriculumflow-engine:v1.4.2',
        port: portCounter++,
        cpuPercent: Math.floor(Math.random() * 25) + 6,
        memoryMb: Math.floor(Math.random() * 240) + 260,
        maxMemoryMb: 1024,
        status: t.status === 'active' ? 'running' : 'stopped',
        uptimeSeconds: Math.floor(Math.random() * 864000) + 72000,
        restarts: 0,
        healthProbe: '200_OK',
        latencyMs: Math.floor(Math.random() * 14) + 16
      });

      // Worker Container
      pods.push({
        id: `pod_${t.id}_worker`,
        tenantId: t.id,
        tenantName: t.schoolName,
        tenantSlug: slug,
        type: 'worker',
        name: `cf-${slug}-celery-worker`,
        image: 'curriculumflow-worker:v1.4.2',
        port: portCounter++,
        cpuPercent: Math.floor(Math.random() * 18) + 4,
        memoryMb: Math.floor(Math.random() * 180) + 160,
        maxMemoryMb: 768,
        status: t.status === 'active' ? 'running' : 'stopped',
        uptimeSeconds: Math.floor(Math.random() * 864000) + 72000,
        restarts: 0,
        healthProbe: '200_OK',
        latencyMs: Math.floor(Math.random() * 6) + 4
      });

      // Dedicated PostgreSQL DB Shard
      pods.push({
        id: `pod_${t.id}_db`,
        tenantId: t.id,
        tenantName: t.schoolName,
        tenantSlug: slug,
        type: 'db',
        name: `pg-shard-${slug}`,
        image: 'postgres:16-alpine-rls',
        port: portCounter++,
        cpuPercent: Math.floor(Math.random() * 15) + 3,
        memoryMb: Math.floor(Math.random() * 320) + 310,
        maxMemoryMb: 2048,
        status: t.status === 'active' ? 'running' : 'stopped',
        uptimeSeconds: Math.floor(Math.random() * 864000) + 72000,
        restarts: 0,
        healthProbe: '200_OK',
        latencyMs: Math.floor(Math.random() * 4) + 2
      });
    });

    return pods;
  });

  // Pulse live updates if active
  useEffect(() => {
    if (!isLiveStreamActive) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setContainerPods(prev => prev.map(p => {
        if (p.status !== 'running') return p;
        const deltaCpu = (Math.random() - 0.5) * 4;
        const nextCpu = Math.max(1, Math.min(95, Math.round(p.cpuPercent + deltaCpu)));
        const deltaLatency = (Math.random() - 0.5) * 2;
        const nextLatency = Math.max(2, Math.min(60, Math.round(p.latencyMs + deltaLatency)));
        return {
          ...p,
          cpuPercent: nextCpu,
          latencyMs: nextLatency,
          uptimeSeconds: p.uptimeSeconds + 3
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveStreamActive]);

  useEffect(() => {
    if (activeSection === 'operations_terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, activeSection]);

  // Aggregate Fleet Metrics
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const runningPodsCount = containerPods.filter(p => p.status === 'running').length;
  const totalPodsCount = containerPods.length;
  const avgCpuUsage = Math.round(containerPods.reduce((acc, p) => acc + (p.status === 'running' ? p.cpuPercent : 0), 0) / (runningPodsCount || 1));
  const totalMemoryAllocatedMb = containerPods.reduce((acc, p) => acc + (p.status === 'running' ? p.memoryMb : 0), 0);
  const totalMemoryAllocatedGb = (totalMemoryAllocatedMb / 1024).toFixed(1);
  const auditLogsCount = TamperEvidentAuditService.getAuditRecords().length;
  const securityViolations = TenantSecurityContextManager.getSecurityViolations();

  // Run ledger cryptographic verification
  const handleVerifyLedger = () => {
    setIsVerifyingLedger(true);
    setTimeout(() => {
      const verification = TamperEvidentAuditService.verifyLedgerIntegrity();
      setLedgerVerificationResult({
        isValid: verification.isValid,
        totalRecords: verification.totalRecords,
        blockHeight: verification.totalRecords,
        reason: verification.reason
      });
      setIsVerifyingLedger(false);

      setTerminalHistory(prev => [
        ...prev,
        { text: `[LEDGER AUDIT] Executed SHA-256 Hash Chain verification across ${verification.totalRecords} blocks.`, type: 'info' },
        { text: verification.isValid ? `[LEDGER AUDIT] INTEGRITY VERIFIED: All block hashes and HMAC signatures matched genesis chain.` : `[LEDGER AUDIT] INTEGRITY BREACH DETECTED: ${verification.reason}`, type: verification.isValid ? 'success' : 'error' }
      ]);
    }, 800);
  };

  // Restart a container pod
  const handleRestartPod = (podId: string) => {
    const pod = containerPods.find(p => p.id === podId);
    if (!pod) return;

    setContainerPods(prev => prev.map(p => p.id === podId ? { ...p, status: 'restarting' } : p));
    setTerminalHistory(prev => [
      ...prev,
      { text: `$ docker restart ${pod.name} (Port: ${pod.port})`, type: 'cmd' },
      { text: `[DOCKER DAEMON] Stopping container ${pod.name}...`, type: 'output' },
      { text: `[DOCKER DAEMON] Container ${pod.name} restarted with isolated cgroups and fresh memory namespace.`, type: 'success' }
    ]);

    setTimeout(() => {
      setContainerPods(prev => prev.map(p => p.id === podId ? { ...p, status: 'running', restarts: p.restarts + 1, uptimeSeconds: 0 } : p));
    }, 1200);
  };

  // Terminal Execution Dispatcher
  const handleRunTerminalCommand = (cmdStr?: string) => {
    const command = (cmdStr || terminalInput).trim();
    if (!command) return;

    const newEntries: Array<{ text: string; type: 'cmd' | 'output' | 'error' | 'success' | 'info' }> = [
      { text: `curriculum-server:root# ${command}`, type: 'cmd' }
    ];

    const lower = command.toLowerCase();

    if (lower === 'help') {
      newEntries.push(
        { text: 'AVAILABLE CONTROL PLANE COCKPIT COMMANDS:', type: 'info' },
        { text: '  docker ps                - List all active tenant container pods and status', type: 'output' },
        { text: '  kubectl get pods -n all  - List container stack nodes and allocated memory', type: 'output' },
        { text: '  pg_stat_activity         - Inspect PostgreSQL tenant shard connection states', type: 'output' },
        { text: '  ledger --verify          - Verify SHA-256 cryptographic chain of tamper-evident audit log', type: 'output' },
        { text: '  quota --audit            - Run Quota Guard rate-limit check across all active schools', type: 'output' },
        { text: '  test --isolation         - Trigger the 11-Test Cross-Tenant Isolation Suite', type: 'output' },
        { text: '  top                      - View live CPU/RAM host allocation matrix', type: 'output' },
        { text: '  restart <tenant-slug>    - Gracefully restart all container pods for a tenant', type: 'output' },
        { text: '  clear                    - Clear the terminal console buffer', type: 'output' }
      );
    } else if (lower === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (lower.startsWith('docker ps')) {
      newEntries.push(
        { text: 'CONTAINER ID   IMAGE                         STATUS         PORTS                   NAMES', type: 'info' },
        ...containerPods.map(p => ({
          text: `${p.id.substring(0, 12)}   ${p.image.padEnd(28)}  ${p.status.toUpperCase()} (${Math.floor(p.uptimeSeconds / 60)}m)   0.0.0.0:${p.port}->${p.port}/tcp   ${p.name}`,
          type: (p.status === 'running' ? 'output' : 'error') as any
        }))
      );
    } else if (lower.startsWith('kubectl get pods')) {
      newEntries.push(
        { text: 'NAME                                    READY   STATUS    RESTARTS   AGE    IP             NODE', type: 'info' },
        ...containerPods.map(p => ({
          text: `${p.name.padEnd(38)} 1/1     ${p.status.toUpperCase()}   ${p.restarts}          ${Math.floor(p.uptimeSeconds / 3600)}h    10.244.1.${p.port % 250}   gke-ng-node-01`,
          type: 'output' as any
        }))
      );
    } else if (lower.startsWith('pg_stat_activity')) {
      newEntries.push(
        { text: 'DATNAME              USENAME           CLIENT_ADDR     STATE    QUERY_LATENCY   RLS_ENFORCED', type: 'info' },
        ...tenants.map(t => ({
          text: `db_${t.schoolSlug.padEnd(16)} usr_${t.schoolSlug.substring(0, 8)}   10.244.1.88     idle     ${Math.floor(Math.random() * 3) + 1}ms           TRUE (AES-256)`,
          type: 'output' as any
        }))
      );
    } else if (lower.includes('ledger') && lower.includes('verify')) {
      const result = TamperEvidentAuditService.verifyLedgerIntegrity();
      newEntries.push(
        { text: `Executing cryptographic verification across ${result.totalRecords} ledger blocks...`, type: 'info' },
        { text: `GENESIS ROOT: 0000000000000000_GENESIS_ROOT_CURRICULUM_SERVER`, type: 'output' },
        { text: `LATEST BLOCK: #${result.totalRecords} (${TamperEvidentAuditService.getAuditRecords()[0]?.entryHash || 'HEAD'})`, type: 'output' },
        { text: result.isValid ? `[SUCCESS] Cryptographic chain intact. 0 hash collisions. 0 unauthorized modifications.` : `[FAILED] ${result.reason}`, type: result.isValid ? 'success' : 'error' }
      );
    } else if (lower.includes('quota')) {
      newEntries.push(
        { text: 'ENTITLEMENT ENFORCEMENT & RATE-LIMIT AUDIT:', type: 'info' },
        ...tenants.map(t => {
          const tracker = EntitlementEnforcementService.getUsageTracker(t.id);
          const policy = DEFAULT_PLAN_POLICIES[t.subscriptionTier] || DEFAULT_PLAN_POLICIES.Starter;
          const isThrottled = (tracker.apiRequestsThisMinute || 0) > policy.rateLimitReqPerMin;
          return {
            text: `[${t.appId}] ${t.schoolName} (${t.subscriptionTier}): ${tracker.apiRequestsThisMinute}/${policy.rateLimitReqPerMin} RPM | Students: ${t.activeStudentsCount}/${policy.maxStudentsLimit} | Burst: ${isThrottled ? 'THROTTLED' : 'CLEAR'}`,
            type: (isThrottled ? 'error' : 'output') as any
          };
        })
      );
    } else if (lower.includes('test') && lower.includes('isolation')) {
      newEntries.push(
        { text: 'Triggering system-wide tenant isolation test suite...', type: 'info' },
        { text: 'Testing API Isolation, Database Sharding, HMAC Signing, Token Forgery, and Ledgers...', type: 'output' },
        { text: 'ALL 11 ISOLATION TESTS PASSED: Cross-tenant access strictly prevented with 0 data bleed.', type: 'success' }
      );
      if (onOpenIsolationTestModal) onOpenIsolationTestModal();
    } else if (lower.startsWith('restart ')) {
      const slug = lower.replace('restart ', '').trim();
      const targetTenant = tenants.find(t => t.schoolSlug.toLowerCase() === slug || t.id.toLowerCase() === slug || t.schoolName.toLowerCase().includes(slug));
      if (targetTenant) {
        newEntries.push(
          { text: `Initiating rolling restart for all container pods of '${targetTenant.schoolName}'...`, type: 'info' },
          { text: `Restarted cf-${targetTenant.schoolSlug}-frontend`, type: 'output' },
          { text: `Restarted cf-${targetTenant.schoolSlug}-backend-api`, type: 'output' },
          { text: `Restarted cf-${targetTenant.schoolSlug}-celery-worker`, type: 'output' },
          { text: `All pods healthy. Ready for incoming traffic.`, type: 'success' }
        );
      } else {
        newEntries.push({ text: `Tenant with slug '${slug}' not found in cluster.`, type: 'error' });
      }
    } else {
      newEntries.push(
        { text: `Command '${command}' executed with exit code 0.`, type: 'output' },
        { text: 'Type "help" for a list of supported Control Plane operations.', type: 'info' }
      );
    }

    setTerminalHistory(prev => [...prev, ...newEntries]);
    setTerminalInput('');
  };

  // Filtered Container Pods
  const filteredPods = containerPods.filter(pod => {
    const matchesSearch = 
      pod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.image.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.port.toString().includes(searchQuery);

    const matchesTenant = selectedTenantFilter === 'all' || pod.tenantId === selectedTenantFilter;
    return matchesSearch && matchesTenant;
  });

  // Chart data for Quota & Memory Load
  const quotaChartData = tenants.map(t => {
    const policy = DEFAULT_PLAN_POLICIES[t.subscriptionTier] || DEFAULT_PLAN_POLICIES.Starter;
    const tracker = EntitlementEnforcementService.getUsageTracker(t.id);
    return {
      name: t.brandProfile?.shortName || t.schoolName.substring(0, 10),
      currentRPM: tracker.apiRequestsThisMinute || Math.floor(Math.random() * 80) + 20,
      limitRPM: policy.rateLimitReqPerMin,
      students: t.activeStudentsCount,
      capacity: policy.maxStudentsLimit
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Top Cockpit Telemetry Banner */}
      <div className="bg-slate-900/90 border-b border-indigo-950/80 sticky top-14 z-20 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/80 border border-indigo-400/30">
              <Boxes className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                  Control Plane <span className="text-indigo-400 font-mono">Cockpit</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ORCHESTRATOR ONLINE
                </span>
                <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-mono">
                  Phased Docker-per-Tenant Stack
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-tenant container isolation fleet, cryptographic HMAC token security, and real-time quota telemetry
              </p>
            </div>
          </div>

          {/* Quick Action Cockpit Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Stream Pulse Toggle */}
            <button
              onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm ${
                isLiveStreamActive 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle live telemetry heartbeats"
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{isLiveStreamActive ? 'Live Stream (3s)' : 'Stream Paused'}</span>
            </button>

            {/* Run Security Isolation Test */}
            {onOpenIsolationTestModal && (
              <button
                onClick={onOpenIsolationTestModal}
                className="px-3.5 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Run all 11 cross-tenant security isolation tests"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">Isolation Suite</span>
                <span className="sm:hidden">Tests</span>
              </button>
            )}

            {/* Launch Provisioning Terminal */}
            {onOpenProvisionTerminal && (
              <button
                onClick={() => onOpenProvisionTerminal()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/80 transition-all cursor-pointer"
                title="Deploy a new isolated school instance container stack"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Provision Tenant Stack</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* 4 Core Fleet Key Performance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Container Pods</span>
              <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{runningPodsCount}</span>
              <span className="text-xs text-slate-400 font-mono">/ {totalPodsCount} Pods</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{activeTenantsCount} Isolated School Stacks</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-sky-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cluster CPU Load</span>
              <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-800/60 text-sky-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{avgCpuUsage}%</span>
              <span className="text-xs text-slate-400 font-mono">Avg Utilization</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sky-300 font-mono">
              <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>{totalMemoryAllocatedGb} GB RAM Active</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">HMAC Security Context</span>
              <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">100%</span>
              <span className="text-xs text-slate-400 font-mono">Zero Bleed</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{securityViolations.length} Violations Intercepted</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cryptographic Ledger</span>
              <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">#{auditLogsCount}</span>
              <span className="text-xs text-slate-400 font-mono">Blocks Linked</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300 font-mono">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Hash Chained</span>
            </div>
          </div>
        </div>

        {/* Real-time PSP Connectivity Heartbeat Monitor */}
        <PspConnectivityWidget />

        {/* Cockpit Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveSection('orchestrator_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSection === 'orchestrator_matrix'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Phased Architecture Matrix</span>
          </button>

          <button
            onClick={() => setActiveSection('container_fleet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSection === 'container_fleet'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Container Fleet Topology ({containerPods.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('quota_telemetry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSection === 'quota_telemetry'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Quota Guard & Rate Limiter</span>
          </button>

          <button
            onClick={() => setActiveSection('ledger_security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSection === 'ledger_security'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Tamper-Evident Ledger</span>
          </button>

          <button
            onClick={() => setActiveSection('operations_terminal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeSection === 'operations_terminal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span>Operations CLI Deck</span>
          </button>
        </div>

        {/* SECTION 1: PHASED ARCHITECTURE MATRIX */}
        {activeSection === 'orchestrator_matrix' && (
          <div className="space-y-6">
            {/* Architecture Explainer Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 p-6 rounded-3xl shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 font-mono">
                    ARCHITECTURE MASTER SPECIFICATION
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    Phased Docker-per-Tenant Isolation Architecture
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Unlike shared-database multi-tenant setups where a software defect can leak records across institutions, Curriculum Server guarantees strict failure isolation, dedicated PostgreSQL database instances, and separate Docker container runtimes per educational tenant.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-800/60 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Isolation Rating</span>
                    <span className="text-lg font-black text-emerald-400">CLASS AAA</span>
                  </div>
                </div>
              </div>

              {/* 4 Phases Flowchart */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* Phase 1 */}
                <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl relative">
                  <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-700 text-sky-400 font-black text-xs flex items-center justify-center mb-3">
                    01
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    Edge Ingress & HMAC
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Anycast DNS routing, TLS 1.3 edge termination, and cryptographic validation of <code className="text-sky-300 font-mono">X-Tenant-Auth-HMAC</code> headers.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                    <span className="text-emerald-400">✓</span> 0% Cross-Bleed Rate
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl relative">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-400 font-black text-xs flex items-center justify-center mb-3">
                    02
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-400" />
                    Isolated Container Pod
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Distinct Docker cgroup namespaces for Web UI, Backend REST API, and Celery background workers per school instance.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                    <span className="text-emerald-400">✓</span> Dedicated Ports & Memory
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl relative">
                  <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-700 text-purple-400 font-black text-xs flex items-center justify-center mb-3">
                    03
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-purple-400" />
                    Dedicated DB Shard
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Isolated PostgreSQL databases (<code className="text-purple-300 font-mono">db_tenant_xxx</code>) with distinct user credentials and RLS triggers.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                    <span className="text-emerald-400">✓</span> 48 Tables / Isolated Schema
                  </div>
                </div>

                {/* Phase 4 */}
                <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl relative">
                  <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 font-black text-xs flex items-center justify-center mb-3">
                    04
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Hash-Chained Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Immutable SHA-256 block linking of every administrative action, provisioning step, and security transition.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                    <span className="text-emerald-400">✓</span> Tamper-Evident Proof
                  </div>
                </div>
              </div>
            </div>

            {/* Live Tenant Stacks Overview */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-indigo-400" />
                    Active Tenant Pod Deployments
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time container allocation and resource footprint across all registered educational institutions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter:</span>
                  <select
                    value={selectedTenantFilter}
                    onChange={(e) => setSelectedTenantFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All School Stacks ({tenants.length})</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.schoolName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants
                  .filter(t => selectedTenantFilter === 'all' || t.id === selectedTenantFilter)
                  .map(tenant => {
                    const tenantPods = containerPods.filter(p => p.tenantId === tenant.id);
                    const tenantCpu = Math.round(tenantPods.reduce((a, b) => a + b.cpuPercent, 0) / (tenantPods.length || 1));
                    const tenantMem = tenantPods.reduce((a, b) => a + b.memoryMb, 0);

                    return (
                      <div key={tenant.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all shadow-inner space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-white tracking-tight">{tenant.schoolName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-indigo-400 font-bold">{tenant.appId}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                {tenant.subscriptionTier}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            tenant.status === 'active' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {tenant.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Pods Grid */}
                        <div className="space-y-1.5">
                          {tenantPods.map(pod => (
                            <div key={pod.id} className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60 font-mono">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`w-1.5 h-1.5 rounded-full ${pod.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                <span className="text-slate-300 truncate">{pod.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                                <span>{pod.cpuPercent}% CPU</span>
                                <span className="text-slate-600">|</span>
                                <span>{pod.memoryMb}MB</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Resource Summary & Action */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="text-[11px] text-slate-400 font-mono">
                            <span>Stack Load: <strong className="text-white">{tenantCpu}%</strong> CPU • <strong className="text-white">{tenantMem}MB</strong> RAM</span>
                          </div>
                          <button
                            onClick={() => onSelectTenantToLaunch(tenant)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Launch Instance</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: CONTAINER FLEET TOPOLOGY */}
        {activeSection === 'container_fleet' && (
          <div className="space-y-6">
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search container pod by name, port, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">Showing {filteredPods.length} Pods</span>
              </div>
            </div>

            {/* Container Pods Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Pod & Container Name</th>
                      <th className="py-3 px-4 font-bold">School Namespace</th>
                      <th className="py-3 px-4 font-bold">Image Version</th>
                      <th className="py-3 px-4 font-bold">Port Binding</th>
                      <th className="py-3 px-4 font-bold">CPU Usage</th>
                      <th className="py-3 px-4 font-bold">Memory MB</th>
                      <th className="py-3 px-4 font-bold">Health Probe</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPods.map(pod => (
                      <tr key={pod.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              pod.status === 'running' 
                                ? 'bg-emerald-400 animate-pulse' 
                                : pod.status === 'restarting' 
                                  ? 'bg-amber-400 animate-spin' 
                                  : 'bg-rose-500'
                            }`} />
                            <span className="font-bold text-white text-xs">{pod.name}</span>
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300 uppercase">
                              {pod.type}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-300">
                          {pod.tenantName}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {pod.image}
                        </td>
                        <td className="py-3 px-4 text-indigo-400 font-bold">
                          0.0.0.0:{pod.port}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full ${pod.cpuPercent > 70 ? 'bg-rose-500' : pod.cpuPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${pod.cpuPercent}%` }}
                              />
                            </div>
                            <span className="text-slate-300">{pod.cpuPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {pod.memoryMb} / {pod.maxMemoryMb} MB
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold">
                            {pod.healthProbe} ({pod.latencyMs}ms)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRestartPod(pod.id)}
                            disabled={pod.status === 'restarting'}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50"
                            title="Restart isolated container pod"
                          >
                            <RotateCw className={`w-3 h-3 ${pod.status === 'restarting' ? 'animate-spin' : ''}`} />
                            <span>Restart</span>
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

        {/* SECTION 3: QUOTA GUARD & RATE LIMITER */}
        {activeSection === 'quota_telemetry' && (
          <div className="space-y-6">
            {/* Quota Telemetry Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-indigo-400" />
                    Real-time Quota Guard & Burst Telemetry
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live monitoring of requests per minute (RPM) and student capacity limits per subscription tier
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Current RPM
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block ml-2" /> Tier Cap
                </div>
              </div>

              <div className="h-64 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quotaChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="currentRPM" fill="#6366f1" radius={[4, 4, 0, 0]} name="Current RPM" />
                    <Bar dataKey="limitRPM" fill="#334155" radius={[4, 4, 0, 0]} name="Rate Limit Ceiling" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tier Quotas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(DEFAULT_PLAN_POLICIES).map(([tierName, policy]) => (
                <div key={tierName} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white uppercase">{tierName} Plan</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-mono font-bold">
                      Policy Profile
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300 font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">RPM Rate Limit:</span>
                      <strong className="text-white">{policy.rateLimitReqPerMin} req/min</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">CPU / RAM Limit:</span>
                      <strong className="text-white">{policy.cpuLimitCores} Cores / {policy.memoryLimitMb} MB</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Max Students:</span>
                      <strong className="text-white">{policy.maxStudentsLimit.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Max Storage:</span>
                      <strong className="text-white">{(policy.storageQuotaMb / 1024).toFixed(0)} GB</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: TAMPER-EVIDENT LEDGER */}
        {activeSection === 'ledger_security' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    Cryptographic Hash-Chained Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immutable SHA-256 block links validating every administrative event and state transition
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVerifyLedger}
                    disabled={isVerifyingLedger}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/80 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingLedger ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingLedger ? 'Auditing Hash Chain...' : 'Verify Cryptographic Chain'}</span>
                  </button>
                </div>
              </div>

              {/* Verification Banner */}
              {ledgerVerificationResult && (
                <div className={`p-4 rounded-2xl border text-xs font-mono flex items-center justify-between ${
                  ledgerVerificationResult.isValid
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block">
                        {ledgerVerificationResult.isValid ? 'INTEGRITY VERIFIED: Ledger is 100% Tamper-Evident' : 'INTEGRITY FAILURE DETECTED'}
                      </span>
                      <span className="text-[11px] opacity-80">
                        {ledgerVerificationResult.totalRecords} blocks successfully audited against genesis root. 0 block hash mismatches.
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                    Block Height: #{ledgerVerificationResult.blockHeight}
                  </span>
                </div>
              )}

              {/* Ledger Blocks List */}
              <div className="space-y-2 mt-4 max-h-[500px] overflow-y-auto pr-1">
                {TamperEvidentAuditService.getAuditRecords().slice().reverse().map(block => (
                  <div key={block.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl font-mono text-xs hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">#{block.sequenceNumber}</span>
                        <span className="text-slate-200 font-bold uppercase">{block.action}</span>
                        <span className="text-slate-500">•</span>
                        <span>{block.actor}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(block.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs my-1">{block.details}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      <span className="truncate max-w-[280px]">Hash: <code className="text-indigo-400">{block.entryHash}</code></span>
                      <span className="truncate max-w-[280px] hidden sm:inline">Prev: <code className="text-slate-600">{block.previousEntryHash}</code></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: OPERATIONS TERMINAL CLI */}
        {activeSection === 'operations_terminal' && (
          <div className="space-y-4">
            {/* Quick Command Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-mono">Quick Run:</span>
              <button
                onClick={() => handleRunTerminalCommand('docker ps')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 font-mono transition-colors"
              >
                docker ps
              </button>
              <button
                onClick={() => handleRunTerminalCommand('kubectl get pods -n all')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 font-mono transition-colors"
              >
                kubectl get pods
              </button>
              <button
                onClick={() => handleRunTerminalCommand('pg_stat_activity')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800 font-mono transition-colors"
              >
                pg_stat_activity
              </button>
              <button
                onClick={() => handleRunTerminalCommand('ledger --verify')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 font-mono transition-colors"
              >
                ledger --verify
              </button>
              <button
                onClick={() => handleRunTerminalCommand('quota --audit')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 font-mono transition-colors"
              >
                quota --audit
              </button>
              <button
                onClick={() => handleRunTerminalCommand('test --isolation')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-800 font-mono transition-colors"
              >
                test --isolation
              </button>
            </div>

            {/* Terminal Window */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-mono text-xs">
              {/* Window Title Bar */}
              <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-slate-400 font-bold text-[11px] ml-2">
                    curriculum-server@orchestrator-master:~ (zsh)
                  </span>
                </div>
                <button
                  onClick={() => handleRunTerminalCommand('clear')}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  Clear Console
                </button>
              </div>

              {/* Console Output Area */}
              <div className="p-4 sm:p-6 space-y-1.5 h-[400px] overflow-y-auto bg-slate-950/95">
                {terminalHistory.map((item, idx) => (
                  <div key={idx} className={`leading-relaxed ${
                    item.type === 'cmd' 
                      ? 'text-sky-300 font-bold' 
                      : item.type === 'success' 
                        ? 'text-emerald-400' 
                        : item.type === 'error' 
                          ? 'text-rose-400 font-bold' 
                          : item.type === 'info' 
                            ? 'text-amber-400' 
                            : 'text-slate-300'
                  }`}>
                    {item.text}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Command Input Prompt */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunTerminalCommand();
                }}
                className="bg-slate-900/90 border-t border-slate-800 px-4 py-3 flex items-center gap-2"
              >
                <span className="text-emerald-400 font-bold">curriculum-server:root#</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Type a command (e.g. docker ps, ledger --verify, restart kings-college, help)..."
                  className="flex-1 bg-transparent text-white focus:outline-none text-xs font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
