import React, { useState } from 'react';
import { 
  SchoolCustomDomain, 
  DnsPropagationStatus, 
  DnsRecordType,
  DnsPropagationCheckSummary 
} from '../types';
import { runDnsPropagationCheck } from '../mockDomainRegistrarData';
import { 
  Radio, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Globe, 
  Activity, 
  ExternalLink 
} from 'lucide-react';

interface DnsPropagationStatusIndicatorProps {
  domain: SchoolCustomDomain;
  recordType?: DnsRecordType;
  variant?: 'badge' | 'card' | 'row';
  onOpenInspectorModal?: (domain: SchoolCustomDomain) => void;
}

export const DnsPropagationStatusIndicator: React.FC<DnsPropagationStatusIndicatorProps> = ({
  domain,
  recordType = 'CNAME',
  variant = 'badge',
  onOpenInspectorModal
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [summary, setSummary] = useState<DnsPropagationCheckSummary>(() => 
    runDnsPropagationCheck(domain, recordType as DnsRecordType)
  );

  const handleQuickRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    setTimeout(() => {
      setSummary(runDnsPropagationCheck(domain, recordType as DnsRecordType));
      setIsChecking(false);
    }, 450);
  };

  const isFull = summary.propagationScore === 100;
  const isPartial = summary.propagationScore >= 70 && !isFull;

  if (variant === 'badge') {
    return (
      <div 
        onClick={() => onOpenInspectorModal && onOpenInspectorModal(domain)}
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[11px] font-mono font-bold transition-all cursor-pointer select-none ${
          isFull
            ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-700'
            : isPartial
              ? 'bg-amber-950/70 border-amber-800/80 text-amber-300 hover:bg-amber-900/60 hover:border-amber-700'
              : 'bg-rose-950/70 border-rose-800/80 text-rose-300 hover:bg-rose-900/60 hover:border-rose-700'
        }`}
        title="Click to view live global DNS propagation status & node resolution"
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isFull ? 'bg-emerald-400' : isPartial ? 'bg-amber-400' : 'bg-rose-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isFull ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
        </span>

        <span>
          {isFull && `DNS Propagated (100%)`}
          {isPartial && `Propagating (${summary.propagationScore}%)`}
          {!isFull && !isPartial && `DNS Unresolved (0%)`}
        </span>

        <span className="text-[10px] text-purple-300 flex items-center gap-0.5 border-l border-slate-700/60 pl-1.5 ml-0.5">
          <Zap className="w-2.5 h-2.5 text-purple-400" />
          {summary.averageLatencyMs}ms
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-2xl border transition-all ${
        isFull
          ? 'bg-slate-950/90 border-emerald-800/70 shadow-lg shadow-emerald-950/20'
          : isPartial
            ? 'bg-slate-950/90 border-amber-800/70 shadow-lg shadow-amber-950/20'
            : 'bg-slate-950/90 border-rose-800/70 shadow-lg shadow-rose-950/20'
      }`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${
              isFull ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400'
            } ${isChecking ? 'animate-spin' : ''}`} />
            <span className="font-bold text-white text-xs font-mono">{domain.domainName}</span>
          </div>

          <button
            onClick={handleQuickRefresh}
            disabled={isChecking}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Re-check DNS propagation"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isFull ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${summary.propagationScore}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{summary.healthyNodes}/{summary.totalNodes} Nodes Matched</span>
          <span className="text-purple-300 font-bold">{summary.averageLatencyMs}ms avg</span>
        </div>

        {onOpenInspectorModal && (
          <button
            onClick={() => onOpenInspectorModal(domain)}
            className="w-full mt-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-xs font-bold font-sans border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Activity className="w-3 h-3 text-sky-400" />
            <span>Open Propagation Inspector</span>
          </button>
        )}
      </div>
    );
  }

  // variant === 'row'
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-xl border ${
          isFull ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-amber-950 border-amber-800 text-amber-400'
        }`}>
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-bold text-white block">{domain.domainName}</span>
          <span className="text-[10px] text-slate-400">{domain.tenantSchoolName}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className={`font-bold block ${isFull ? 'text-emerald-400' : 'text-amber-400'}`}>
            {summary.propagationScore}% Propagated
          </span>
          <span className="text-[10px] text-slate-500">{summary.healthyNodes}/{summary.totalNodes} POP Nodes</span>
        </div>

        {onOpenInspectorModal && (
          <button
            onClick={() => onOpenInspectorModal(domain)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold transition-colors"
          >
            Inspect
          </button>
        )}
      </div>
    </div>
  );
};
