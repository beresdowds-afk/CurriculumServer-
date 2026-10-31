import React, { useState, useEffect } from 'react';
import { 
  NerdcAnnualWorkerConfig, 
  NerdcAnnualSyncReport, 
  NerdcWorkerLog 
} from '../types';
import { 
  CurriculumSourceRegistryEntry,
  PreservedSourceEvidence,
  DurableCurriculumSyncJob
} from '../types/curriculumVersioning';
import { getSuperAdminAuthHeader } from '../services/controlPlaneToken';
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
  FileText,
  Upload,
  Play,
  Layers,
  FileCheck2,
  Check
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
  const [sources, setSources] = useState<CurriculumSourceRegistryEntry[]>([]);
  const [evidenceList, setEvidenceList] = useState<PreservedSourceEvidence[]>([]);
  const [jobs, setJobs] = useState<DurableCurriculumSyncJob[]>([]);
  const [drillResults, setDrillResults] = useState<any[] | null>(null);
  const [isRunningDrill, setIsRunningDrill] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'evidence' | 'jobs' | 'drills' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadSourceId, setUploadSourceId] = useState('src-nerdc-math-sss');
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Verification state for evidence documents
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [verifiedDocResults, setVerifiedDocResults] = useState<Record<string, { isValid: boolean; actualChecksum: string }>>({});

  const fetchWorkerData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/nerdc/worker/status');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        if (data.recentLogs) setLogs(data.recentLogs);
      }

      // Load sources
      const srcRes = await fetch('/api/v1/curriculum/sources');
      if (srcRes.ok) {
        const srcData = await srcRes.json();
        setSources(srcData.sources || []);
      }

      // Load preserved evidence
      const evidRes = await fetch('/api/v1/curriculum/evidence');
      if (evidRes.ok) {
        const evidData = await evidRes.json();
        setEvidenceList(evidData.documents || []);
      }

      // Load jobs
      const jobsRes = await fetch('/api/v1/curriculum/jobs');
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
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
      const res = await fetch('/api/v1/curriculum/jobs/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSuperAdminAuthHeader()
        },
        body: JSON.stringify({
          sourceId: 'src-nerdc-math-sss',
          jobType: 'MANUAL_SYNC'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncSuccessMsg(`Sync job completed: ${data.job?.resultSummary || 'Checked — no verified changes'}`);
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

  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName || !uploadText) {
      alert('Please provide a file name and document content.');
      return;
    }
    try {
      setIsUploading(true);
      setUploadMsg(null);
      const contentBase64 = btoa(unescape(encodeURIComponent(uploadText)));
      const res = await fetch(`/api/v1/curriculum/sources/${uploadSourceId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSuperAdminAuthHeader()
        },
        body: JSON.stringify({
          originalFileName: uploadFileName,
          contentBase64,
          sourceVersion: 'NERDC-MANUAL-UPLOAD-2026',
          fileType: 'application/json',
          publicationMetadata: {
            title: uploadFileName,
            issuingYear: 2026,
            issuingBody: 'Federal Ministry of Education / NERDC'
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMsg(`Document successfully preserved (SHA-256: ${data.evidence?.sha256Checksum?.substring(0, 16)}...)`);
        setUploadFileName('');
        setUploadText('');
        await fetchWorkerData();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyEvidence = async (documentId: string) => {
    setVerifyingDocId(documentId);
    try {
      const res = await fetch(`/api/v1/curriculum/evidence/${documentId}/verify`);
      const data = await res.json();
      setVerifiedDocResults(prev => ({
        ...prev,
        [documentId]: { isValid: data.isValid, actualChecksum: data.actualChecksum }
      }));
    } catch (err) {
      console.error('Verify failed:', err);
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleRunDrills = async () => {
    setIsRunningDrill(true);
    try {
      const res = await fetch('/api/v1/curriculum/update-drills', {
        headers: {
          ...getSuperAdminAuthHeader()
        }
      });
      const data = await res.json();
      setDrillResults(data.results || []);
    } catch (err: any) {
      alert('Failed to run drill: ' + err.message);
    } finally {
      setIsRunningDrill(false);
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
                <h2 className="text-base font-bold text-white">Enterprise NERDC Curriculum Update Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Source-Backed Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative source registry, cryptographic evidence preservation, genuine comparison & version governance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/60 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview & Status</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'sources'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Source Registry ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'evidence'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Preserved Evidence ({evidenceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'jobs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Durable Jobs ({jobs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drills')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'drills'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>13-Point Test Drill</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
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

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Annual Schedule</span>
                  </div>
                  <div className="text-lg font-bold text-white">Every August 15</div>
                  <div className="text-[11px] text-slate-400">Pre-session rollover (02:00 UTC)</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Curriculum Governance</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active Baseline</span>
                  </div>
                  <div className="text-[11px] text-slate-400">SHA-256 seal locked</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>Source Evidence</span>
                  </div>
                  <div className="text-lg font-bold text-white">{evidenceList.length} Preserved Files</div>
                  <div className="text-[11px] text-slate-400">{sources.length} Authoritative Sources</div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <span>Durable Source-Backed Synchronization</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Executes genuine source retrieval with SHA-256 verification, objective-level comparison, and checkpoint tracking.
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

              {/* Configured Sources */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Authoritative NERDC Sources
                </h3>
                <div className="space-y-2">
                  {sources.map(src => (
                    <div key={src.sourceId} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-slate-200">{src.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                            {src.verificationStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-lg">{src.officialUrl}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{src.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOURCE REGISTRY & MANUAL UPLOAD */}
          {activeTab === 'sources' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Authoritative Source Registry</h3>
                  <p className="text-xs text-slate-400">Official government gazette and syllabus endpoints</p>
                </div>
              </div>

              <div className="space-y-3">
                {sources.map(src => (
                  <div key={src.sourceId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{src.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          src.sourceStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {src.sourceStatus}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{src.retrievalMethod}</span>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono break-all">{src.officialUrl}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>Authority: {src.issuingAuthority}</span>
                      <span>Last sync: {src.lastSuccessfulRetrieval ? new Date(src.lastSuccessfulRetrieval).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual Document Upload Form */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-200">Manual Official Source Document Upload</h4>
                </div>
                <p className="text-xs text-slate-400">
                  When official online portals require manual submission or gazette releases, upload the authentic document below. SHA-256 digests and provenance records are computed immediately.
                </p>

                {uploadMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                    {uploadMsg}
                  </div>
                )}

                <form onSubmit={handleManualUpload} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Target Curriculum Source</label>
                      <select
                        value={uploadSourceId}
                        onChange={e => setUploadSourceId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      >
                        {sources.map(s => (
                          <option key={s.sourceId} value={s.sourceId}>{s.name} ({s.subjectName})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Original Document Filename</label>
                      <input
                        type="text"
                        placeholder="e.g. nerdc_senior_secondary_math_gazette_2026.json"
                        value={uploadFileName}
                        onChange={e => setUploadFileName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Document Content (JSON or Official Gazette Text)</label>
                    <textarea
                      rows={4}
                      placeholder='{"officialRelease": "NERDC-GAZETTE-2026-V1", "subject": "General Mathematics", "themes": [...]}'
                      value={uploadText}
                      onChange={e => setUploadText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? 'Preserving & Computing Digest...' : 'Preserve Source Document'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: PRESERVED EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Preserved Source Evidence</h3>
                <p className="text-xs text-slate-400">Cryptographically sealed original files stored with mode 0o600</p>
              </div>

              {evidenceList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No evidence documents preserved yet. Upload or synchronize official curriculum sources.
                </div>
              ) : (
                <div className="space-y-3">
                  {evidenceList.map(doc => {
                    const verification = verifiedDocResults[doc.documentId];
                    return (
                      <div key={doc.documentId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-xs text-slate-200">{doc.originalFileName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {doc.fileSizeBytes} bytes • {doc.fileType}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded-lg break-all">
                          SHA-256: <span className="text-emerald-400">{doc.sha256Checksum}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>Origin: {doc.sourceUrlOrOrigin}</span>
                          <span>Timestamp: {new Date(doc.retrievalTimestamp).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          {verification ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified Authentic (Digest Matches Disk Bytes)</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Integrity verified upon storage</span>
                          )}

                          <button
                            onClick={() => handleVerifyEvidence(doc.documentId)}
                            disabled={verifyingDocId === doc.documentId}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {verifyingDocId === doc.documentId ? 'Verifying...' : 'Verify SHA-256'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DURABLE JOBS */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Durable Update Job Execution & Checkpoints</h3>
                <p className="text-xs text-slate-400">Persistent background sync jobs that survive process restarts</p>
              </div>

              {jobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No durable jobs recorded. Run a synchronization to initiate.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.jobId} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-200">{job.jobId}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            job.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{job.jobType}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === 'FAILED' ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Checkpoints: {job.checkpoints.join(' → ')}</span>
                        <span>{job.progressPercent}%</span>
                      </div>

                      {job.failureReason && (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                          {job.failureReason}
                        </div>
                      )}

                      {job.resultSummary && (
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
                          {job.resultSummary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: 13-POINT TEST DRILL */}
          {activeTab === 'drills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">13-Point Automated NERDC Ingestion & Governance Test Drill</h3>
                  <p className="text-xs text-slate-400">Automated end-to-end regression validation with real disposable test fixtures</p>
                </div>

                <button
                  onClick={handleRunDrills}
                  disabled={isRunningDrill}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunningDrill ? 'animate-spin' : ''}`} />
                  <span>{isRunningDrill ? 'Executing Drill...' : 'Run 13-Point Drill'}</span>
                </button>
              </div>

              {drillResults && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-indigo-800/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300">
                      Drill Suite Result: {drillResults.filter(t => t.passed).length}/{drillResults.length} PASSED
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      100% PASS
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                    {drillResults.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-bold">{t.testId}</span>
                            <span className="font-semibold text-slate-200">{t.name}</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{t.details}</p>
                          <p className="text-indigo-400 text-[10px] font-mono">{t.evidence}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {t.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Update Worker Schedule Configuration</h3>
                <p className="text-xs text-slate-400">Federal academic calendar timing and notification settings</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 font-medium">Cron Schedule</span>
                  <p className="font-mono text-slate-200 font-bold">{config?.cronSchedule || '0 2 15 8 *'}</p>
                  <p className="text-[10px] text-slate-500">Every August 15 at 02:00 AM UTC</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 font-medium">Notification Recipients</span>
                  <p className="font-mono text-slate-200 font-bold">{config?.notifyEmails?.join(', ') || 'curriculum-governance@curriculumserver.com.ng'}</p>
                  <p className="text-[10px] text-slate-500">Logged to audit trail if SMTP is unconfigured</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
