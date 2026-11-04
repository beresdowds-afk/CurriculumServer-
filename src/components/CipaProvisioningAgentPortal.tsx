import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  ArrowRight, 
  RotateCw, 
  Check, 
  X, 
  FileText, 
  Play,
  Building2,
  Users,
  HardDrive
} from 'lucide-react';
import { CipaProvisioningRequestRecord } from '../../server/cipaAgentService';

export const CipaProvisioningAgentPortal: React.FC = () => {
  const [requests, setRequests] = useState<CipaProvisioningRequestRecord[]>([]);
  const [selectedReq, setSelectedReq] = useState<CipaProvisioningRequestRecord | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/agent/requests');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
        if (!selectedReq && json.data.length > 0) {
          setSelectedReq(json.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch CIPA requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch('/api/v1/agent/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newPrompt.trim() })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNewPrompt('');
        await fetchRequests();
        setSelectedReq(json.data);
        setFeedback('Provisioning request successfully analyzed and classified by CIPA.');
      } else {
        setFeedback(json.error || 'Failed to create request');
      }
    } catch (err: any) {
      setFeedback(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePiamAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/v1/agent/requests/${requestId}/piam-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: `PIAM authorized by Super Admin via CIPA portal.` })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedReq(json.data);
        await fetchRequests();
      }
    } catch (err) {
      console.error('PIAM action failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* CIPA Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>Autonomous Infrastructure Agent</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Curriculum Infrastructure Provisioning Agent (CIPA)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Intelligent infrastructure coordination agent evaluating school provisioning requests, IIAPE recommendations, PIAM human authorisations, and orchestrating execution workflows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Agent State</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Request Submission Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Submit Natural-Language Provisioning Request</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Describe the school, student population, staff count, storage needs, and domain requirements in plain English.
        </p>

        <form onSubmit={handleCreateRequest} className="space-y-4">
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            placeholder="e.g., Provision a fully equipped school management platform for St. Jude College, with 1,500 students, 120 staff, independent PostgreSQL database and stjude.edu.ng domain."
            className="w-full bg-[#0B0F17] border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Runtime Identity: <code className="text-purple-400 font-mono">curriculum-provisioning-agent-runtime</code>
            </span>
            <button
              type="submit"
              disabled={submitting || !newPrompt.trim()}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>CIPA Analyzing & Evaluating...</span>
              ) : (
                <>
                  <span>Dispatch to CIPA Agent</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          {feedback && (
            <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-300">
              {feedback}
            </div>
          )}
        </form>
      </div>

      {/* Requests & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Provisioning Requests ({requests.length})</h3>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {requests.map(req => {
              const isSelected = selectedReq?.requestId === req.requestId;
              return (
                <div
                  key={req.requestId}
                  onClick={() => setSelectedReq(req)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-purple-950/30 border-purple-500/60 shadow-lg' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{req.requirements.schoolName}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.lifecycleState === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      req.lifecycleState === 'Approved' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {req.lifecycleState}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mb-3">{req.rawPrompt}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                    <span>{req.classification}</span>
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Inspector */}
        <div className="lg:col-span-7">
          {selectedReq ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-mono text-purple-400">{selectedReq.requestId}</span>
                  <h3 className="text-lg font-bold text-white">{selectedReq.requirements.schoolName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-300 block">{selectedReq.classification}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Correlation ID: {selectedReq.correlationId}</span>
                </div>
              </div>

              {/* Requirements & IIAPE Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Extracted Requirements</span>
                  </h4>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p><span className="text-slate-500">Students:</span> {selectedReq.requirements.studentPopulation.toLocaleString()}</p>
                    <p><span className="text-slate-500">Staff:</span> {selectedReq.requirements.staffPopulation}</p>
                    <p><span className="text-slate-500">Domain:</span> {selectedReq.requirements.domainRequirements}</p>
                    <p><span className="text-slate-500">Database:</span> {selectedReq.requirements.databaseRequirements}</p>
                    <p><span className="text-slate-500">Isolation:</span> {selectedReq.requirements.securityIsolation}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>IIAPE Recommendation</span>
                  </h4>
                  {selectedReq.recommendation ? (
                    <div className="space-y-1 text-xs text-slate-300">
                      <p><span className="text-slate-500">Topology:</span> {selectedReq.recommendation.recommendedTopology}</p>
                      <p><span className="text-slate-500">Est. Monthly:</span> ₦{selectedReq.recommendation.estimatedMonthlyCostNgn.toLocaleString()}</p>
                      <p><span className="text-slate-500">Database:</span> {selectedReq.recommendation.databaseStrategy}</p>
                      <p><span className="text-slate-500">Region:</span> {selectedReq.recommendation.recommendedGcpRegion}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Awaiting IIAPE evaluation...</p>
                  )}
                </div>
              </div>

              {/* PIAM Approval Box */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-900/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>PIAM Human Authorisation Gate</span>
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    selectedReq.piamApprovalStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    selectedReq.piamApprovalStatus === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedReq.piamApprovalStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Privileged infrastructure actions (GCP project creation, billing association) require verified human authorization.
                </p>
                {selectedReq.piamApprovalStatus === 'pending_approval' && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handlePiamAction(selectedReq.requestId, 'approve')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Authorise</span>
                    </button>
                    <button
                      onClick={() => handlePiamAction(selectedReq.requestId, 'reject')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Request</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Provisioning Plan Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ordered Provisioning Plan</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedReq.plan.map(step => (
                    <div key={step.stepNumber} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center font-mono text-slate-400 text-[11px]">{step.stepNumber}</span>
                        <div>
                          <p className="font-bold text-white">{step.stepName}</p>
                          <p className="text-[11px] text-slate-400">{step.description}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        step.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {step.component}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              Select a provisioning request to inspect IIAPE analysis, PIAM authorization, and execution steps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
