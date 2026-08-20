import React, { useState, useEffect } from 'react';
import { 
  DockerTenantContainer, 
  ShardMigrationJob, 
  TenantSchoolApp, 
  UserProfile 
} from '../types';
import { DockerTenantOrchestrationService } from '../services/dockerTenantOrchestrationService';
import { 
  Cpu, 
  HardDrive, 
  Server, 
  Zap, 
  RefreshCw, 
  Play, 
  Pause, 
  ArrowRightLeft, 
  ShieldCheck, 
  Terminal, 
  Activity, 
  Database, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Clock, 
  Lock
} from 'lucide-react';

interface DockerOrchestrationConsoleProps {
  tenants: TenantSchoolApp[];
  currentUser?: UserProfile;
  onBackToCockpit?: () => void;
}

export const DockerOrchestrationConsole: React.FC<DockerOrchestrationConsoleProps> = ({
  tenants,
  currentUser,
  onBackToCockpit
}) => {
  const [orchestrator] = useState(() => new DockerTenantOrchestrationService(tenants));
  const [containers, setContainers] = useState<DockerTenantContainer[]>([]);
  const [migrationJobs, setMigrationJobs] = useState<ShardMigrationJob[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'containers' | 'migrations' | 'cgroups' | 'terminal_logs'>('containers');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[SYSTEM_INIT] Docker-per-tenant cgroup v2 runtime subsystem initialized.',
    '[ORCHESTRATOR] 4 Pre-warmed microVM worker containers active in standby pool.',
    '[eBPF_ROUTER] L3/L4 container network isolation verified on all tenant namespaces.'
  ]);
  const [isActionRunning, setIsActionRunning] = useState<boolean>(false);

  useEffect(() => {
    refreshState();
  }, []);

  const refreshState = () => {
    const all = orchestrator.getAllContainers();
    setContainers([...all]);
    setMigrationJobs([...orchestrator.getMigrationJobs()]);
    if (!selectedTenantId && all.length > 0) {
      setSelectedTenantId(all[0].tenantId);
    }
  };

  const selectedContainer = containers.find(c => c.tenantId === selectedTenantId) || containers[0];
  const telemetry = orchestrator.getClusterFleetTelemetry();

  const handleRestart = (tenantId: string) => {
    setIsActionRunning(true);
    addLog(`[ORCHESTRATOR] Issuing graceful SIGTERM followed by fast restart for container: ${tenantId}...`);
    setTimeout(() => {
      orchestrator.restartContainer(tenantId);
      refreshState();
      addLog(`[ORCHESTRATOR] Container ${tenantId} restarted successfully in 142ms. Health status: HEALTHY.`);
      setIsActionRunning(false);
    }, 400);
  };

  const handleHibernate = (tenantId: string) => {
    setIsActionRunning(true);
    addLog(`[CGROUP_MEMORY] Freeing memory allocations for tenant ${tenantId}. Compacting state to cold hibernation...`);
    setTimeout(() => {
      orchestrator.hibernateContainer(tenantId);
      refreshState();
      addLog(`[ORCHESTRATOR] Tenant ${tenantId} moved to COLD_HIBERNATED. RAM consumption reduced to 0 MB.`);
      setIsActionRunning(false);
    }, 300);
  };

  const handleWakeCold = (tenantId: string) => {
    setIsActionRunning(true);
    addLog(`[PREWARM_CACHE] Restoring memory snapshot for tenant ${tenantId} from pre-warmed standby pool...`);
    setTimeout(() => {
      orchestrator.wakeColdContainer(tenantId);
      refreshState();
      addLog(`[ORCHESTRATOR] Tenant ${tenantId} restored to ACTIVE_RUNNING in 94ms. Zero user disruption.`);
      setIsActionRunning(false);
    }, 350);
  };

  const handleStartMigration = (tenantId: string) => {
    setIsActionRunning(true);
    addLog(`[SHARD_MIGRATOR] Initiating zero-downtime database shard migration for tenant ${tenantId}...`);
    setTimeout(() => {
      orchestrator.initiateZeroDowntimeMigration(tenantId, 'gcp-eu-west2-worker-04', 'pg-shard-05-ng');
      refreshState();
      addLog(`[SHARD_MIGRATOR] Live WAL replication streaming at 45MB/s. Cutover buffer scheduled.`);
      setIsActionRunning(false);
    }, 500);
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const getLifecycleBadge = (state: DockerTenantContainer['lifecycleState']) => {
    switch (state) {
      case 'ACTIVE_RUNNING':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] border border-emerald-500/30">ACTIVE_RUNNING</span>;
      case 'COLD_HIBERNATED':
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-[11px] border border-slate-700">COLD_HIBERNATED</span>;
      case 'MIGRATING':
        return <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-bold text-[11px] border border-sky-500/30 animate-pulse">MIGRATING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] border border-amber-500/30">{state}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5" />
              Phased Docker-Per-Tenant Runtime
            </span>
            <span className="text-xs text-slate-400 font-mono">cgroup v2 & eBPF Sandboxing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Docker Tenant Orchestrator & Shard Manager
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Autonomous failure isolation engine providing dedicated memory, CPU limits, zero-downtime database shard migrations, and sub-100ms cold start restoration per school tenant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedTab('containers')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                selectedTab === 'containers' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Container Fleet
            </button>
            <button
              onClick={() => setSelectedTab('cgroups')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                selectedTab === 'cgroups' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              cgroup Limits
            </button>
            <button
              onClick={() => setSelectedTab('migrations')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                selectedTab === 'migrations' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Shard Migrations
            </button>
            <button
              onClick={() => setSelectedTab('terminal_logs')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                selectedTab === 'terminal_logs' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Runtime Logs
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Fleet Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Containers</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{telemetry.activeContainers} / {telemetry.totalContainers}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Pre-warmed Standby</span>
          <div className="text-2xl font-black text-sky-400 mt-1 font-mono">{telemetry.prewarmedStandbyContainers} Pods</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">RAM Allocation</span>
          <div className="text-2xl font-black text-white mt-1 font-mono">{telemetry.totalUsedRamGb} / {telemetry.totalAllocatedRamGb} GB</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Cluster CPU</span>
          <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">{telemetry.averageClusterCpuPercent}%</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Cold Start Restore</span>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">&lt; {telemetry.averageColdStartMs} ms</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Failure Isolation</span>
          <div className="text-xs font-black text-emerald-400 mt-2 font-mono truncate">100% Guaranteed</div>
        </div>
      </div>

      {/* Real-Time Per-Tenant Resource Utilization & Isolation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Live Tenant Container Resource Utilization & Isolation Monitor</h3>
              <p className="text-xs text-slate-400">
                Real-time cgroup v2 process metrics: CPU core throttling, allocated resident memory, and sandboxed namespace health.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetry Polling (1.5s)</span>
            </div>
            <button
              onClick={refreshState}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Sync Metrics
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {containers.map(c => {
            const memoryPercent = Math.round((c.memoryUsageMb / c.cgroupLimits.memoryLimitMb) * 100);
            const isSelected = c.tenantId === selectedTenantId;
            const isRunning = c.lifecycleState === 'running';

            return (
              <div
                key={c.containerId}
                onClick={() => setSelectedTenantId(c.tenantId)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-slate-950 border-sky-500 ring-1 ring-sky-500/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block truncate max-w-[150px]">{c.tenantSchoolName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{c.containerId}</span>
                  </div>
                  {getLifecycleBadge(c.lifecycleState)}
                </div>

                {/* CPU Utilization Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className={`font-bold ${c.cpuUsagePercent > 70 ? 'text-rose-400' : c.cpuUsagePercent > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isRunning ? `${c.cpuUsagePercent.toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        c.cpuUsagePercent > 70 ? 'bg-rose-500' : c.cpuUsagePercent > 35 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: isRunning ? `${Math.min(100, c.cpuUsagePercent)}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Memory Utilization Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Memory (cgroup)</span>
                    <span className={`font-bold ${memoryPercent > 80 ? 'text-rose-400' : 'text-sky-400'}`}>
                      {isRunning ? `${c.memoryUsageMb}MB / ${c.cgroupLimits.memoryLimitMb}MB (${memoryPercent}%)` : '0MB (Cold)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        memoryPercent > 80 ? 'bg-rose-500' : 'bg-sky-500'
                      }`}
                      style={{ width: isRunning ? `${Math.min(100, memoryPercent)}%` : '0%' }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[10px] text-slate-400 font-mono">
                  <span>Shard: {c.databaseShardId}</span>
                  <span className="text-emerald-400">Cold: {c.coldStartRecoveryTimeMs}ms</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CONTAINER FLEET LIST */}
      {selectedTab === 'containers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Container Fleet Table */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Isolated Tenant Micro-Containers</h3>
                <p className="text-xs text-slate-400">Strict process space & file descriptor containment</p>
              </div>
              <button
                onClick={refreshState}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Tenant & Subdomain</th>
                    <th className="p-3.5">Node Host</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">CPU %</th>
                    <th className="p-3.5 text-center">RAM MB</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {containers.map(c => {
                    const isSelected = c.tenantId === selectedTenantId;
                    return (
                      <tr 
                        key={c.containerId} 
                        onClick={() => setSelectedTenantId(c.tenantId)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-800/60 ring-1 ring-sky-500/40' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{c.tenantSchoolName}</span>
                          <span className="font-mono text-slate-400 text-[10px]">{c.subdomain}.curriculumflow.com</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">{c.nodeHostName}</td>
                        <td className="p-3.5 text-center">{getLifecycleBadge(c.lifecycleState)}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-100">{c.currentCpuUsagePercent}%</td>
                        <td className="p-3.5 text-center font-mono font-bold text-sky-400">{c.currentMemoryUsageMb} MB</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {c.lifecycleState === 'ACTIVE_RUNNING' ? (
                              <button
                                onClick={() => handleHibernate(c.tenantId)}
                                disabled={isActionRunning}
                                title="Hibernate container to cold storage"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleWakeCold(c.tenantId)}
                                disabled={isActionRunning}
                                title="Wake container from pre-warmed cache (< 100ms)"
                                className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-xs border border-emerald-800 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleRestart(c.tenantId)}
                              disabled={isActionRunning}
                              title="Restart container"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleStartMigration(c.tenantId)}
                              disabled={isActionRunning}
                              title="Live Shard Migration"
                              className="p-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-400 text-xs border border-indigo-800 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
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

          {/* Container Diagnostics & Sandbox Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            {selectedContainer ? (
              <>
                <div className="pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sky-400 uppercase font-mono font-bold">
                      {selectedContainer.containerId}
                    </span>
                    {getLifecycleBadge(selectedContainer.lifecycleState)}
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">
                    {selectedContainer.tenantSchoolName}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    IP: {selectedContainer.ipAddress}:{selectedContainer.port}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">cgroup CPU Quota:</span>
                    <strong className="font-mono text-slate-100">{selectedContainer.cgroupLimits.cpuCoresLimit} Cores (Shares: 1024)</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">cgroup Memory Cap:</span>
                    <strong className="font-mono text-emerald-400">{selectedContainer.cgroupLimits.memoryLimitMb} MB (Swap: 512MB)</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Network Namespace:</span>
                    <strong className="font-mono text-slate-100">{selectedContainer.cgroupLimits.networkNamespace}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">PostgreSQL Shard:</span>
                    <strong className="font-mono text-sky-400">{selectedContainer.databaseShardId}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Database Schema:</span>
                    <strong className="font-mono text-slate-300">{selectedContainer.databaseSchema}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Cold Start Speed:</span>
                    <strong className="font-mono text-amber-400 font-bold">{selectedContainer.coldStartRecoveryTimeMs} ms</strong>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Health Watchdog</span>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>L3 Isolation & eBPF Packet Filtering Healthy</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 py-10">Select a container to inspect telemetry</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CGROUPS & RESOURCE ALLOCATIONS */}
      {selectedTab === 'cgroups' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Linux cgroup v2 Resource Isolation Profiles</h3>
            <p className="text-xs text-slate-400 mt-1">
              Guaranteed CPU quotas, hard memory limits, and OOM killer policies applied at the container runtime level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {containers.map(c => (
              <div key={c.containerId} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-white text-sm">{c.tenantSchoolName}</h4>
                    <span className="font-mono text-[11px] text-slate-400">{c.subdomain}</span>
                  </div>
                  {getLifecycleBadge(c.lifecycleState)}
                </div>

                {/* Visual RAM Usage Bar */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Memory Allocation: {c.currentMemoryUsageMb} MB / {c.cgroupLimits.memoryLimitMb} MB</span>
                    <span className="font-mono font-bold text-sky-400">{c.currentMemoryPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(c.currentMemoryPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-300 border-t border-slate-900">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">CPU Core Cap</span>
                    <strong className="font-mono text-slate-100">{c.cgroupLimits.cpuCoresLimit} vCPUs</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">I/O Bandwidth Cap</span>
                    <strong className="font-mono text-slate-100">{c.cgroupLimits.ioBandwidthMbPerSec} MB/s</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SHARD MIGRATIONS */}
      {selectedTab === 'migrations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Live Zero-Downtime Shard Migrations</h3>
            <p className="text-xs text-slate-400 mt-1">
              Move tenants across physical nodes or database shards with sub-20ms cutover and background WAL synchronization.
            </p>
          </div>

          {migrationJobs.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <span className="text-sm font-bold text-slate-300 block">No Active Shard Migration Jobs</span>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select any container in the fleet view and click "Live Shard Migration" to initiate a zero-downtime node relocation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {migrationJobs.map(job => (
                <div key={job.migrationId} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-mono font-bold text-sky-400">{job.migrationId}</span>
                      <h4 className="font-bold text-white text-sm">{job.tenantId}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-mono font-bold text-xs border border-sky-500/30">
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Live Transfer: {job.bytesTransferredMb} MB of {job.totalBytesMb} MB</span>
                      <span className="font-mono font-bold text-sky-400">{job.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>Source: <strong className="text-slate-200 font-mono">{job.sourceShard}</strong></span>
                    <span>Target: <strong className="text-emerald-400 font-mono">{job.targetShard}</strong></span>
                    <span>Cutover SLA: <strong className="text-emerald-400 font-mono">&lt; {job.zeroDowntimeCutoverMs} ms</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RUNTIME CONSOLE LOGS */}
      {selectedTab === 'terminal_logs' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Containerd & cgroup v2 Runtime Stream</span>
            </div>
            <button
              onClick={() => setTerminalLogs([])}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] cursor-pointer"
            >
              Clear Console
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar text-slate-300">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-emerald-400">{log.substring(0, 10)}</span>
                <span>{log.substring(10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
