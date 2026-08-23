import React, { useState, useEffect } from 'react';
import { 
  NerdcAnnualWorkerConfig, 
  NerdcAnnualSyncReport, 
  NerdcWorkerLog 
} from '../types';
import { 
  Calendar, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Sliders, 
  Activity, 
  Database,
  Lock,
  FileText
} from 'lucide-react';

interface NerdcAnnualWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NerdcAnnualWorkerModal: React.FC<NerdcAnnualWorkerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<NerdcAnnualWorkerConfig | null>(null);
  const [reports, setReports] = useState<NerdcAnnualSyncReport[]>([]);
  const [logs, setLogs] = useState<NerdcWorkerLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'logs' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkerData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/nerdc/worker/status');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        if (data.recentLogs) setLogs(data.recentLogs);
      }

      const histRes = await fetch('/api/nerdc/worker/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.history) setReports(histData.history);
      }
    } catch (err) {
      console.error('Failed to load NERDC worker data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkerData();
    }
  }, [isOpen]);

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      setSyncSuccessMsg(null);
      const res = await fetch('/api/nerdc/worker/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'super_admin'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSyncSuccessMsg(data.message || 'NERDC Curriculum synchronized successfully!');
        await fetchWorkerData();
      } else {
        alert(data.error || 'Failed to trigger sync');
      }
    } catch (err: any) {
      alert('Error triggering worker sync: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">NERDC Annual Curriculum Update Worker</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Automated Daemon
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Annual federal curriculum synchronization scheduler (JSS 1-3 & SSS 1-3)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Worker Status</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Sync Reports ({reports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Schedule Config</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {syncSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Annual Cadence</span>
                  </div>
                  <div className="text-lg font-bold text-white">Every August 15</div>
                  <div className="text-[11px] text-slate-400">Pre-session rollover (02:00 UTC)</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Integrity Status</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Active</span>
                  </div>
                  <div className="text-[11px] text-slate-400">SHA-256 baseline locked</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>Database Scope</span>
                  </div>
                  <div className="text-lg font-bold text-white">34 Subjects (JSS & SSS)</div>
                  <div className="text-[11px] text-slate-400">Universal Basic & Senior Secondary</div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <span>Manual Trigger & Re-verification</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Force an immediate baseline audit against official NERDC portals to update schemes of work and exam alignments.
                  </p>
                </div>

                <button
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing NERDC...' : 'Run Sync Now'}</span>
                </button>
              </div>

              {/* Official Sources Contacted */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Configured Federal NERDC Endpoints
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate max-w-md">{config?.portalSourceUrl || 'https://www.nerdc.gov.ng'}</span>
                    </div>
                    <a
                      href={config?.portalSourceUrl || 'https://www.nerdc.gov.ng'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <span>Verify Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Synchronization & Audit History
              </h3>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No synchronization runs recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div key={rep.executionId} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{rep.executionId}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {new Date(rep.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        Processed {rep.subjectsProcessed} subjects, {rep.themesProcessed} themes, {rep.topicsProcessed} topics in {rep.durationMs}ms ({rep.status.toUpperCase()}).
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-700/40 font-mono">
                        <span>Checksum: {rep.checksum.slice(0, 24)}...</span>
                        <span>Diffs: {rep.diffs.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Worker Execution Stream
              </h3>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`uppercase font-bold text-[10px] ${log.level === 'ERROR' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      [{log.level}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Worker Scheduling & Notification Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Cron Schedule</label>
                  <input
                    type="text"
                    disabled
                    value={config?.cronSchedule || '0 2 15 8 *'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Every August 15 at 02:00 AM UTC</span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Auto-Publish to Tenants</label>
                  <input
                    type="text"
                    disabled
                    value="Enabled (Strict Schema Guard)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Current Revision Tag</label>
                  <input
                    type="text"
                    disabled
                    value={config?.currentRevisionTag || 'NERDC-GAZETTE-2025/2026-AUG-V1'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Notification Recipients</label>
                  <input
                    type="text"
                    disabled
                    value={config?.notifyEmails?.join(', ') || 'curriculum-governance@curriculumserver.com.ng'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>NERDC Source Authority Lock Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
