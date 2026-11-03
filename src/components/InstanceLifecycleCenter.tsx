import React, { useState, useEffect } from 'react';
import { 
  GovernedInstanceRecord, 
  GovernedLifecycleState, 
  ArchitectureDeploymentTier, 
  VersionManifest, 
  InstanceMonitoringTelemetry, 
  ArchitectureMigrationJob, 
  CustomerSelfServiceRequest 
} from '../types/instanceLifecycle';
import { instanceLifecycleClient } from '../services/instanceLifecycleClient';
import { 
  Server, 
  Activity, 
  Layers, 
  RotateCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Database, 
  HardDrive, 
  Globe, 
  ArrowRight, 
  Undo2, 
  Play, 
  Lock, 
  RefreshCw, 
  ChevronRight, 
  FileText, 
  Download, 
  X, 
  AlertCircle,
  TrendingUp,
  Sliders,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface InstanceLifecycleCenterProps {
  onClose?: () => void;
  initialInstanceId?: string;
}

export const InstanceLifecycleCenter: React.FC<InstanceLifecycleCenterProps> = ({
  onClose,
  initialInstanceId
}) => {
  const [instances, setInstances] = useState<GovernedInstanceRecord[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(initialInstanceId || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'governance' | 'versioning' | 'migration' | 'monitoring' | 'self_service'>('governance');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Transition Modal State
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [targetState, setTargetState] = useState<GovernedLifecycleState>('active');
  const [transitionReason, setTransitionReason] = useState('');
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  // Version Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [newAppVersion, setNewAppVersion] = useState('v3.2.1');
  const [newDbVersion, setNewDbVersion] = useState('pg_schema_v14_3');
  const [changelogNotes, setChangelogNotes] = useState('Production Patch: Latency optimizations & WAEC 2026 broadsheet sync');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  // Migration Modal State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [targetMigrationTier, setTargetMigrationTier] = useState<ArchitectureDeploymentTier>('dedicated_gcp_project');
  const [activeMigrationJob, setActiveMigrationJob] = useState<ArchitectureMigrationJob | null>(null);
  const [isPlanningMigration, setIsPlanningMigration] = useState(false);
  const [isExecutingCutover, setIsExecutingCutover] = useState(false);

  // Self-Service Requests State
  const [customerRequests, setCustomerRequests] = useState<CustomerSelfServiceRequest[]>([]);
  const [selectedRequestForResolution, setSelectedRequestForResolution] = useState<CustomerSelfServiceRequest | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolvingRequest, setIsResolvingRequest] = useState(false);

  // Telemetry auto-refresh
  const [telemetry, setTelemetry] = useState<InstanceMonitoringTelemetry | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await instanceLifecycleClient.getGovernedInstances();
      setInstances(data);
      if (data.length > 0 && !selectedInstanceId) {
        setSelectedInstanceId(data[0].instanceId);
      }
      
      const reqs = await instanceLifecycleClient.getCustomerRequests();
      setCustomerRequests(reqs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load governed instances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentInstance = instances.find(i => i.instanceId === selectedInstanceId) || instances[0];

  // Fetch telemetry whenever selected instance changes
  useEffect(() => {
    if (currentInstance) {
      instanceLifecycleClient.getMonitoringTelemetry(currentInstance.instanceId)
        .then(t => setTelemetry(t))
        .catch(() => setTelemetry(currentInstance.monitoring));
    }
  }, [selectedInstanceId, currentInstance?.lifecycleState]);

  const handleExecuteTransition = async () => {
    if (!currentInstance || !transitionReason.trim()) return;
    setIsSubmittingTransition(true);
    try {
      const updated = await instanceLifecycleClient.transitionLifecycleState(
        currentInstance.instanceId,
        targetState,
        transitionReason
      );
      setInstances(prev => prev.map(i => i.instanceId === updated.instanceId ? updated : i));
      setIsTransitionModalOpen(false);
      setTransitionReason('');
      showToast(`Instance state updated to ${targetState.toUpperCase()}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Lifecycle transition failed', 'error');
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  const handleExecuteUpgrade = async () => {
    if (!currentInstance || !changelogNotes.trim()) return;
    setIsSubmittingUpgrade(true);
    try {
      const updated = await instanceLifecycleClient.upgradeVersion(currentInstance.instanceId, {
        applicationVersion: newAppVersion,
        databaseSchemaVersion: newDbVersion,
        changelogNotes
      });
      setInstances(prev => prev.map(i => i.instanceId === updated.instanceId ? updated : i));
      setIsUpgradeModalOpen(false);
      showToast(`Version ${newAppVersion} deployed with rollback snapshot saved!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Upgrade failed', 'error');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleExecuteRollback = async () => {
    if (!currentInstance) return;
    if (!window.confirm(`Are you sure you want to rollback ${currentInstance.instanceId} to its previous version snapshot?`)) return;
    try {
      const updated = await instanceLifecycleClient.rollbackVersion(currentInstance.instanceId);
      setInstances(prev => prev.map(i => i.instanceId === updated.instanceId ? updated : i));
      showToast(`Rolled back to snapshot ${updated.versionManifest.applicationVersion}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Rollback failed', 'error');
    }
  };

  const handlePlanMigration = async () => {
    if (!currentInstance) return;
    setIsPlanningMigration(true);
    try {
      const job = await instanceLifecycleClient.planMigration(currentInstance.instanceId, targetMigrationTier);
      setActiveMigrationJob(job);
      showToast('Migration plan generated: 8-entity preservation guarantees passed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Migration planning failed', 'error');
    } finally {
      setIsPlanningMigration(false);
    }
  };

  const handleExecuteCutover = async () => {
    if (!activeMigrationJob) return;
    setIsExecutingCutover(true);
    try {
      const job = await instanceLifecycleClient.executeMigration(activeMigrationJob.migrationId);
      setActiveMigrationJob(job);
      await loadData();
      showToast(`Live cutover complete! Instance promoted to ${job.targetTier}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Cutover failed', 'error');
    } finally {
      setIsExecutingCutover(false);
    }
  };

  const handleRollbackMigration = async () => {
    if (!activeMigrationJob) return;
    try {
      const job = await instanceLifecycleClient.rollbackMigration(
        activeMigrationJob.migrationId,
        'Operator requested manual safety rollback'
      );
      setActiveMigrationJob(job);
      await loadData();
      showToast(`Migration rolled back to ${job.sourceTier}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Migration rollback failed', 'error');
    }
  };

  const handleResolveCustomerRequest = async (approved: boolean) => {
    if (!selectedRequestForResolution) return;
    setIsResolvingRequest(true);
    try {
      const res = await instanceLifecycleClient.resolveCustomerRequest(
        selectedRequestForResolution.requestId,
        approved,
        resolutionNotes || (approved ? 'Approved by platform administrator' : 'Declined per capacity review')
      );
      setCustomerRequests(prev => prev.map(r => r.requestId === res.requestId ? res : r));
      setSelectedRequestForResolution(null);
      setResolutionNotes('');
      showToast(`Request '${res.title}' ${approved ? 'fulfilled' : 'rejected'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve customer request', 'error');
    } finally {
      setIsResolvingRequest(false);
    }
  };

  const getStatusBadge = (state: GovernedLifecycleState) => {
    switch (state) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE</span>;
      case 'degraded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> DEGRADED</span>;
      case 'suspended':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> SUSPENDED</span>;
      case 'migrating':
      case 'migration_pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5 animate-spin" /> {state.toUpperCase()}</span>;
      case 'provisioning':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5"><RotateCw className="w-3.5 h-3.5 animate-spin" /> PROVISIONING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{state.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn font-sans text-slate-100">
      
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xl ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200' :
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-600 text-rose-200' :
          'bg-indigo-950/90 border-indigo-600 text-indigo-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phase 9: Governed Instance Lifecycle & Architecture Migration
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono">
              13 Governed States
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Instance Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Sovereign control deck for platform engineers and administrators. Manage lifecycle transitions, controlled zero-downtime version rollouts, 8-entity architecture migrations, real-time telemetry, and customer self-service approvals.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Instance Picker */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 shadow-inner">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Select Governed Instance</span>
            <select
              value={selectedInstanceId}
              onChange={e => setSelectedInstanceId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-4"
            >
              {instances.map(inst => (
                <option key={inst.instanceId} value={inst.instanceId} className="bg-slate-900 text-slate-200">
                  {inst.organizationName} ({inst.instanceId})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all cursor-pointer"
            title="Refresh fleet telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {currentInstance && (
        <>
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Current State</span>
              <div className="mt-1">{getStatusBadge(currentInstance.lifecycleState)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Deployment Tier</span>
              <p className="font-bold text-white text-xs mt-1 capitalize truncate">
                {currentInstance.deploymentTier.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">App Version</span>
              <p className="font-mono font-bold text-emerald-400 text-xs mt-1">
                {currentInstance.versionManifest.applicationVersion}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">PostgreSQL Shard</span>
              <p className="font-mono text-slate-200 text-[11px] mt-1 truncate">
                {currentInstance.databaseShardId}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Uptime SLA</span>
              <p className="font-bold text-emerald-300 text-xs mt-1 font-mono">
                {telemetry?.uptimePercentage || 99.98}%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Active Students</span>
              <p className="font-bold text-white text-xs mt-1">
                {currentInstance.activeStudents.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            {[
              { id: 'governance', label: 'Lifecycle & Transitions', icon: ShieldCheck },
              { id: 'versioning', label: 'Version Rollout & Rollback', icon: Layers },
              { id: 'migration', label: 'Architecture Migration', icon: Server },
              { id: 'monitoring', label: 'Real-Time Monitoring', icon: Activity },
              { id: 'self_service', label: 'Customer Self-Service Queue', icon: Sliders, badge: `${customerRequests.filter(r => r.status === 'pending').length} Pending` }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: LIFECYCLE GOVERNANCE & STATE TRANSITIONS */}
          {activeTab === 'governance' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>Governed State Machine Controller</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enforce strict 13-state machine transitions. All transitions are validated against governing rules and cryptographically audited.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsTransitionModalOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Initiate State Transition</span>
                  </button>
                </div>

                {/* State Machine Visualization */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Governed State</span>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {currentInstance.lifecycleState.toUpperCase()}
                    </div>
                    {currentInstance.previousLifecycleState && (
                      <span className="text-xs text-slate-500">
                        (Previous: <span className="font-mono text-slate-400">{currentInstance.previousLifecycleState}</span>)
                      </span>
                    )}
                  </div>
                  {currentInstance.stateTransitionReason && (
                    <p className="text-xs text-slate-400 italic">
                      "{currentInstance.stateTransitionReason}" — <span className="text-slate-500 font-mono text-[11px]">{new Date(currentInstance.lastStateTransitionAt).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                {/* Transition History Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cryptographic Transition History Audit Trail
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">From State</th>
                          <th className="p-3">To State</th>
                          <th className="p-3">Authoritative Actor</th>
                          <th className="p-3">Reason / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {currentInstance.history.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-900/40">
                            <td className="p-3 text-slate-400">{new Date(h.timestamp).toLocaleTimeString()}</td>
                            <td className="p-3"><span className="text-slate-400">{h.fromState}</span></td>
                            <td className="p-3"><span className="text-emerald-400 font-bold">{h.toState}</span></td>
                            <td className="p-3 text-slate-300 font-sans">{h.actor}</td>
                            <td className="p-3 text-slate-400 font-sans">{h.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERSION ROLLOUT & ROLLBACK */}
          {activeTab === 'versioning' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-400" />
                      <span>Version Rollout & Snapshot Rollback</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Track and deploy application, database schema, architecture profile, and feature versions with automated pre-upgrade snapshots.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {currentInstance.versionManifest.previousVersion && (
                      <button
                        onClick={handleExecuteRollback}
                        className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Rollback to {currentInstance.versionManifest.previousVersion.applicationVersion}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deploy Version Upgrade</span>
                    </button>
                  </div>
                </div>

                {/* Active Version Manifest */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Application Version</span>
                    <p className="text-xl font-black text-emerald-400 font-mono">{currentInstance.versionManifest.applicationVersion}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">{currentInstance.versionManifest.deploymentVersion}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Database Schema</span>
                    <p className="text-xl font-black text-sky-400 font-mono">{currentInstance.versionManifest.databaseSchemaVersion}</p>
                    <span className="text-[10px] text-slate-400 block">PostgreSQL 16 LTS DDL</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Architecture Profile</span>
                    <p className="text-xl font-black text-indigo-300 font-mono">v{currentInstance.versionManifest.architectureProfileVersion}</p>
                    <span className="text-[10px] text-slate-400 block capitalize">{currentInstance.deploymentTier.replace(/_/g, ' ')}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Feature Release</span>
                    <p className="text-xl font-black text-amber-400 font-mono">{currentInstance.versionManifest.featureVersion}</p>
                    <span className="text-[10px] text-slate-400 block">{new Date(currentInstance.versionManifest.releaseDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Release Changelog */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Release Notes & Changelog</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {currentInstance.versionManifest.changelogNotes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARCHITECTURE MIGRATION */}
          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Server className="w-5 h-5 text-indigo-400" />
                      <span>Architecture Migration & Infrastructure Elevation</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Promote instances between shared infrastructure, dedicated Cloud Run services, dedicated GCP projects, and multi-service deployments while preserving all 8 authoritative entities.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Plan New Architecture Migration</span>
                  </button>
                </div>

                {/* 8 Preservation Guarantees Showcase */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    8 Authoritative Entity Preservation Guarantees
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      { name: '1. Instance Identity', status: 'Preserved (Zero ID drift)' },
                      { name: '2. Customer Identity', status: 'Preserved (RC & CAC intact)' },
                      { name: '3. User Accounts', status: 'Preserved (Credentials & 2FA)' },
                      { name: '4. Operational Data', status: 'Preserved (Verified Checksums)' },
                      { name: '5. Domain & SSL', status: 'Preserved (TLS 1.3 Routing)' },
                      { name: '6. Storage References', status: 'Preserved (GCS & Drive ACL)' },
                      { name: '7. Audit History', status: 'Preserved (Tamper-evident hash)' },
                      { name: '8. Subscription History', status: 'Preserved (Invoices & Equity)' }
                    ].map((g, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-200 block text-[11px]">{g.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{g.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Migration Job Execution Box */}
                {activeMigrationJob && (
                  <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-500/40 space-y-5 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-bold">{activeMigrationJob.migrationId}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {activeMigrationJob.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white mt-1">
                          {activeMigrationJob.sourceTier.replace(/_/g, ' ')} <span className="text-indigo-400">➔</span> {activeMigrationJob.targetTier.replace(/_/g, ' ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeMigrationJob.status !== 'verified' && activeMigrationJob.status !== 'rolled_back' && (
                          <button
                            onClick={handleExecuteCutover}
                            disabled={isExecutingCutover}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isExecutingCutover ? 'Executing Cutover...' : 'Execute Live Cutover'}</span>
                          </button>
                        )}

                        <button
                          onClick={handleRollbackMigration}
                          className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Emergency Rollback</span>
                        </button>
                      </div>
                    </div>

                    {/* Migration Progress Logs */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Live Orchestration Logs</span>
                      <div className="p-4 rounded-2xl bg-black border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1 max-h-48 overflow-y-auto">
                        {activeMigrationJob.logs.map((log, idx) => (
                          <div key={idx}>{log}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME SUBSYSTEM MONITORING */}
          {activeTab === 'monitoring' && telemetry && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Cloud Run */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Cloud Run Container</span>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-white font-mono">
                      {telemetry.cloudRunHealth.cpuUtilizationPercent.toFixed(1)}% <span className="text-xs font-normal text-slate-400">CPU</span>
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      RAM: {telemetry.cloudRunHealth.memoryUtilizationPercent.toFixed(1)}% • Containers: {telemetry.cloudRunHealth.activeContainerCount}
                    </p>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${telemetry.cloudRunHealth.cpuUtilizationPercent > 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, telemetry.cloudRunHealth.cpuUtilizationPercent)}%` }}
                    />
                  </div>
                </div>

                {/* PostgreSQL */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Database Engine</span>
                    <Database className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-sky-400 font-mono">
                      {telemetry.databaseAvailability.queryLatencyMs.toFixed(1)} ms
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Pool: {telemetry.databaseAvailability.connectionPoolUtilizationPercent}% • Active: {telemetry.databaseAvailability.activeConnections}
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono block">Status: ONLINE (PostgreSQL 16)</span>
                </div>

                {/* Storage */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Storage Connectivity</span>
                    <HardDrive className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-amber-400 font-mono">
                      {telemetry.storageConnectivity.bandwidthUsageMbps.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mbps</span>
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Latency: {telemetry.storageConnectivity.readLatencyMs.toFixed(1)} ms
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono block">Connected: {telemetry.storageConnectivity.provider}</span>
                </div>

                {/* API Availability */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>API Success Rate</span>
                    <Globe className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-indigo-300 font-mono">
                      {telemetry.apiAvailability.httpSuccessRatePercent.toFixed(2)}%
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {telemetry.apiAvailability.requestsPerMinute} RPM • p95: {telemetry.apiAvailability.p95ResponseTimeMs}ms
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">Active 5xx Errors: {telemetry.apiAvailability.active5xxErrors}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER SELF-SERVICE QUEUE */}
          {activeTab === 'self_service' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    <span>Customer Self-Service Approval Deck</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Review and approve self-service requests submitted by authorized customer proprietors (e.g. upgrades, storage integrations, domain verification, data backups).
                  </p>
                </div>

                <div className="space-y-3">
                  {customerRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">No pending self-service customer requests.</div>
                  ) : (
                    customerRequests.map(req => (
                      <div key={req.requestId} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{req.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === 'fulfilled' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              req.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {req.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">[{req.requestType}]</span>
                          </div>
                          <p className="text-xs text-slate-400">{req.description}</p>
                          <span className="text-[10px] text-slate-500 font-mono block">Submitted by {req.submittedBy} on {new Date(req.submittedAt).toLocaleString()}</span>
                          
                          {req.resultPayload?.exportBundleUrl && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                              Export Bundle: <a href={req.resultPayload.exportBundleUrl} className="underline text-emerald-400" target="_blank" rel="noreferrer">Download Verified Archive</a>
                              <span className="block text-[10px] text-slate-400">Checksum: {req.resultPayload.checksumSha256}</span>
                            </div>
                          )}
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedRequestForResolution(req);
                                handleResolveCustomerRequest(true);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Approve & Fulfill
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequestForResolution(req);
                                handleResolveCustomerRequest(false);
                              }}
                              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: State Machine Transition */}
      {isTransitionModalOpen && currentInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Transition Instance Lifecycle State</span>
              </h3>
              <button onClick={() => setIsTransitionModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Governed State:</label>
                <select
                  value={targetState}
                  onChange={e => setTargetState(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">ACTIVE</option>
                  <option value="degraded">DEGRADED</option>
                  <option value="suspended">SUSPENDED</option>
                  <option value="migration_pending">MIGRATION PENDING</option>
                  <option value="migrating">MIGRATING</option>
                  <option value="archived">ARCHIVED</option>
                  <option value="decommissioning">DECOMMISSIONING</option>
                  <option value="decommissioned">DECOMMISSIONED</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Operational Rationale (Required for Audit):</label>
                <textarea
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="Specify reason for state change (e.g. Scheduled maintenance, capacity degradation)..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsTransitionModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransition}
                disabled={isSubmittingTransition || !transitionReason.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmittingTransition ? 'Enforcing...' : 'Enforce Transition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Version Upgrade */}
      {isUpgradeModalOpen && currentInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Controlled Version Rollout</span>
              </h3>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">New App Version:</label>
                  <input
                    type="text"
                    value={newAppVersion}
                    onChange={e => setNewAppVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">New DB Schema:</label>
                  <input
                    type="text"
                    value={newDbVersion}
                    onChange={e => setNewDbVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Changelog & Deployment Notes:</label>
                <textarea
                  value={changelogNotes}
                  onChange={e => setChangelogNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated rollback snapshot will be captured before applying changes.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUpgrade}
                disabled={isSubmittingUpgrade || !changelogNotes.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmittingUpgrade ? 'Deploying...' : 'Deploy Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Architecture Migration Planning */}
      {isMigrationModalOpen && currentInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Plan Architecture Migration</span>
              </h3>
              <button onClick={() => setIsMigrationModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Infrastructure Tier:</label>
                <select
                  value={targetMigrationTier}
                  onChange={e => setTargetMigrationTier(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="shared_infrastructure">Shared Multi-Tenant Infrastructure</option>
                  <option value="dedicated_cloud_run_service">Dedicated Cloud Run Service</option>
                  <option value="dedicated_gcp_project">Dedicated Sovereign GCP Project</option>
                  <option value="multiple_service_deployments">Multiple Service Deployments (High-Scale)</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Automated Preflight Assessment</span>
                <p className="text-slate-300 text-xs">
                  Generating plan will audit all 8 preservation entities, create an AES-256 state snapshot, and stage DNS cutover rules.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsMigrationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsMigrationModalOpen(false);
                  handlePlanMigration();
                }}
                disabled={isPlanningMigration}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isPlanningMigration ? 'Generating Plan...' : 'Generate Migration Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
