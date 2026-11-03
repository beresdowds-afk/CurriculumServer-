import React, { useState } from 'react';
import { 
  ProvisioningJob, 
  ProvisioningResourceRecord, 
  GCPResourceType 
} from '../types/gcpProvisioning';
import { gcpProvisioningClient } from '../services/gcpProvisioningClient';
import { 
  Cloud, 
  Server, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  Globe, 
  Lock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Trash2, 
  Plus, 
  Check, 
  Terminal 
} from 'lucide-react';

export const GCPProvisioningOrchestrationConsole: React.FC = () => {
  const [jobs, setJobs] = useState<ProvisioningJob[]>(gcpProvisioningClient.getJobs());
  const [resources, setResources] = useState<ProvisioningResourceRecord[]>(gcpProvisioningClient.getResources());
  const [activeTab, setActiveTab] = useState<'jobs' | 'inventory'>('jobs');

  // New Provisioning Job Form State
  const [targetInstanceId, setTargetInstanceId] = useState('inst_demo_school_01');
  const [targetCustomerId, setTargetCustomerId] = useState('cust_greenwood_abuja');
  const [selectedAdapters, setSelectedAdapters] = useState<GCPResourceType[]>([
    'gcp_project', 
    'postgresql_database', 
    'cloud_run_service', 
    'cloud_storage_bucket', 
    'secret_manager_secret', 
    'dns_managed_zone', 
    'ssl_certificate'
  ]);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Decommission Modal State
  const [resourceToDecommission, setResourceToDecommission] = useState<string | null>(null);
  const [decommissionToken, setDecommissionToken] = useState('');

  const handleTriggerProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);

    await gcpProvisioningClient.executeProvisioningOrchestration(
      targetInstanceId,
      1,
      selectedAdapters,
      targetCustomerId
    );

    setJobs([...gcpProvisioningClient.getJobs()]);
    setResources([...gcpProvisioningClient.getResources()]);
    setIsProvisioning(false);
  };

  const handleConfirmDecommission = (resourceId: string) => {
    try {
      gcpProvisioningClient.decommissionResource(resourceId, decommissionToken);
      setResources([...gcpProvisioningClient.getResources()]);
      setResourceToDecommission(null);
      setDecommissionToken('');
    } catch (err: any) {
      console.error(err.message || 'Decommissioning failed');
    }
  };

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
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                10 GCP Adapters Active
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Google Cloud Infrastructure Provisioning Adapters</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Execute verifiable Google Cloud operations across projects, Cloud Run services, PostgreSQL databases, GCS buckets, Secret Manager, and DNS certificates with Workload Identity security.
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
          {/* Left: Trigger Provisioning Job Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>Trigger GCP Provisioning Job</span>
            </h2>

            <form onSubmit={handleTriggerProvisioning} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Instance ID</label>
                <input
                  type="text"
                  required
                  value={targetInstanceId}
                  onChange={(e) => setTargetInstanceId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Customer / Tenant ID</label>
                <input
                  type="text"
                  required
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Selected Infrastructure Adapters</label>
                <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> 1. Google Cloud Project</div>
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> 2. Cloud Run Service & Job</div>
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> 3. PostgreSQL Database Schema</div>
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> 4. Cloud Storage Regional Bucket</div>
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> 5. Secret Manager & SSL Certs</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProvisioning}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-950/50 transition-all flex items-center justify-center gap-2"
              >
                {isProvisioning ? (
                  <span>Executing GCP Adapters...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Execute Verifiable Provisioning</span>
                  </>
                )}
              </button>
            </form>
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
              Track resource ownership, cost attribution labels, and health status across provisioned tenant infrastructure.
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

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setResourceToDecommission(res.resourceId)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Decommission</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decommission Modal */}
      {resourceToDecommission && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Controlled Resource Decommissioning</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Decommissioning customer GCP infrastructure requires explicit administrative authorization and ownership verification.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Enter Decommissioning Approval Token</label>
              <input
                type="text"
                placeholder="Type ADMIN_SECURE_DECOMMISSION_APPROVED"
                value={decommissionToken}
                onChange={(e) => setDecommissionToken(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setResourceToDecommission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDecommission(resourceToDecommission)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
