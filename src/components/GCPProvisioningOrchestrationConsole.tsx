import React, { useEffect, useState } from 'react';
import { 
  ProvisioningJob, 
  ProvisioningResourceRecord
} from '../types/gcpProvisioning';
import { gcpProvisioningClient } from '../services/gcpProvisioningClient';
import { 
  Cloud, 
  Activity, 
  Terminal 
} from 'lucide-react';

export const GCPProvisioningOrchestrationConsole: React.FC = () => {
  const [jobs, setJobs] = useState<ProvisioningJob[]>(gcpProvisioningClient.getJobs());
  const [resources, setResources] = useState<ProvisioningResourceRecord[]>(gcpProvisioningClient.getResources());
  const [activeTab, setActiveTab] = useState<'jobs' | 'inventory'>('jobs');
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  useEffect(() => {
    gcpProvisioningClient.syncFromBackend()
      .then(() => setJobs(gcpProvisioningClient.getJobs()))
      .catch((error: unknown) => setInventoryError(error instanceof Error ? error.message : 'Provisioning inventory is unavailable.'));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                Phase 6 Control Plane
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                Execution unavailable
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Google Cloud Infrastructure Provisioning Adapters</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              The execution adapters and durable inventory are not configured. This console will not simulate resource creation or deletion.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'jobs'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Orchestration Jobs ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'inventory'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Resource Inventory & Attribution ({resources.length})</span>
        </button>
      </div>

      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>Provisioning execution</span>
            </h2>
            <p className="text-sm text-amber-300">
              No authenticated Cloud Run Job or Workflows adapter is available. Provisioning is blocked until the server-side execution and PIAM controls are operational.
            </p>
            {inventoryError && <p className="text-xs text-rose-300">{inventoryError}</p>}
          </div>

          {/* Right: Job List */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold text-white mb-2">Durable Provisioning Job Execution Log</h2>
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job.jobId} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{job.jobId}</span>
                      <span className="text-xs text-slate-400">Instance: <strong className="text-slate-200">{job.instanceId}</strong></span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                      job.state === 'verified' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      job.state === 'running' ? 'bg-sky-950 text-sky-300 border border-sky-800 animate-pulse' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {job.state}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                    <div className="text-slate-400">Resource Identifiers:</div>
                    {Object.entries(job.resourceIdentifiers).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-slate-300 pl-2">
                        <span className="text-slate-500">{k}:</span>
                        <span className="text-sky-300 truncate max-w-[280px]">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Started: {new Date(job.startTime).toLocaleTimeString()}</span>
                    <span>Retries: {job.retryCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1">GCP Resource Inventory & Cost Attribution</h2>
            <p className="text-xs text-slate-400">
              Durable resource inventory is unavailable because its PostgreSQL-backed endpoint is not configured.
            </p>
          </div>

          <div className="space-y-3">
            {resources.map(res => (
              <div key={res.resourceId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">{res.resourceType}</span>
                    <span className="text-xs font-mono text-emerald-400">{res.healthStatus}</span>
                  </div>
                  <p className="text-xs font-mono text-white">{res.gcpResourceName}</p>
                  <p className="text-[11px] text-slate-400">Owner Customer: <strong className="text-slate-300">{res.ownerCustomerId}</strong> | Cost Label: <strong className="text-sky-300">{res.costAttributionLabel}</strong></p>
                </div>

              </div>
            ))}
          </div>
          {inventoryError && <p className="text-xs text-rose-300">{inventoryError}</p>}
        </div>
      )}
    </div>
  );
};
