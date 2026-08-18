import React, { useState, useEffect } from 'react';
import { 
  ProvisioningJobRun, 
  TenantSchoolApp,
  ProvisioningStepId 
} from '../types';
import { 
  executeNextProvisioningStep, 
  createInitialProvisioningJob 
} from '../services/tenantProvisioningEngine';
import { 
  Terminal, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCw, 
  X, 
  Server, 
  ShieldCheck, 
  Database, 
  Globe, 
  Cpu, 
  Sparkles,
  ExternalLink,
  Play
} from 'lucide-react';

interface ProvisioningTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantDraft: Partial<TenantSchoolApp> | null;
  onProvisioningComplete: (tenant: TenantSchoolApp) => void;
}

export const ProvisioningTerminalModal: React.FC<ProvisioningTerminalModalProps> = ({
  isOpen,
  onClose,
  tenantDraft,
  onProvisioningComplete
}) => {
  const [job, setJob] = useState<ProvisioningJobRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [simulateFailureStep, setSimulateFailureStep] = useState<ProvisioningStepId | undefined>(undefined);

  useEffect(() => {
    if (isOpen && tenantDraft) {
      const initialJob = createInitialProvisioningJob(tenantDraft, `PSTK_${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      setJob(initialJob);
      setIsRunning(true);
    } else {
      setJob(null);
      setIsRunning(false);
    }
  }, [isOpen, tenantDraft]);

  // Automated step-by-step runner with realistic delays
  useEffect(() => {
    if (!isOpen || !job || !isRunning || !autoPlay) return;

    if (job.currentState === 'ACTIVE' || job.currentState === 'FAILED') {
      setIsRunning(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!tenantDraft) return;
      const result = executeNextProvisioningStep(job, tenantDraft as TenantSchoolApp, simulateFailureStep);
      setJob(result.updatedJob);

      if (result.isComplete && result.provisionedTenant) {
        setIsRunning(false);
        onProvisioningComplete(result.provisionedTenant);
      } else if (result.isFailed) {
        setIsRunning(false);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [isOpen, job, isRunning, autoPlay, simulateFailureStep, tenantDraft]);

  if (!isOpen || !job) return null;

  const handleStepManual = () => {
    if (!tenantDraft || !job) return;
    const result = executeNextProvisioningStep(job, tenantDraft as TenantSchoolApp, simulateFailureStep);
    setJob(result.updatedJob);
    if (result.isComplete && result.provisionedTenant) {
      onProvisioningComplete(result.provisionedTenant);
    }
  };

  const handleRetryFailedStep = () => {
    if (!job) return;
    setSimulateFailureStep(undefined);
    const resetJob = { ...job, currentState: 'CONFIGURING' as any, canRetry: false };
    setJob(resetJob);
    setIsRunning(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Automated Tenant Provisioning Engine
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                  job.currentState === 'ACTIVE' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : job.currentState === 'FAILED'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}>
                  {job.currentState}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                School: <span className="text-slate-200 font-semibold">{job.schoolName}</span> • Tenant ID: <code className="text-emerald-400 font-mono">{job.tenantId}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Banner */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Provisioning Pipeline Execution</span>
              <span className="font-mono font-bold text-emerald-400">{job.overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${job.overallProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {job.canRetry && (
              <button
                onClick={handleRetryFailedStep}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Retry Failed Step</span>
              </button>
            )}
            {!autoPlay && job.currentState !== 'ACTIVE' && (
              <button
                onClick={handleStepManual}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Step Forward</span>
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Content Area */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: 12-Step Status List */}
          <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pipeline Stages (Idempotent 12 Steps)
            </h4>
            {job.steps.map((step, idx) => (
              <div 
                key={step.id}
                className={`p-3 rounded-xl border transition-all text-xs flex items-start gap-2.5 ${
                  step.status === 'completed'
                    ? 'bg-slate-900/90 border-emerald-900/40 text-slate-300'
                    : step.status === 'in_progress'
                    ? 'bg-amber-950/20 border-amber-700/60 text-amber-200 ring-1 ring-amber-500/30'
                    : step.status === 'failed'
                    ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {step.status === 'in_progress' && <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />}
                  {step.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  {step.status === 'pending' && <Clock className="w-4 h-4 text-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-200 truncate">
                      {idx + 1}. {step.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Live Terminal Log Console */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                stdout / provisioner.log
              </span>
              <span className="text-slate-500">Target Image: curriculumflow:1.4.2</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[420px] text-slate-300 pr-1">
              <div className="text-slate-500"># Initializing CurriculumServer Multi-Tenant Control Plane Engine...</div>
              <div className="text-slate-500"># Tenant Context: {job.tenantId} ({job.schoolName})</div>
              
              {job.steps.flatMap(s => s.logs).map((logLine, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span className={logLine.includes('ERROR') ? 'text-rose-400 font-bold' : logLine.includes('200 OK') || logLine.includes('ACTIVE') ? 'text-emerald-300' : 'text-slate-300'}>
                    {logLine}
                  </span>
                </div>
              ))}

              {job.currentState === 'ACTIVE' && (
                <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>TENANT SUCCESSFULLY ACTIVATED!</span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80">
                    Isolated database <code className="font-mono bg-emerald-950 px-1 py-0.5 rounded">db_{job.tenantId}</code> & storage namespace allocated.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Status: <strong className="text-slate-200">{job.currentState}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            {job.currentState === 'ACTIVE' ? (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                <span>Launch Provisioned School Instance</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
