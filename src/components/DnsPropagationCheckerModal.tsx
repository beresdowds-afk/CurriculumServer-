import React, { useState, useEffect } from 'react';
import { 
  SchoolCustomDomain, 
  DnsRecordType,
  DnsPropagationCheckSummary,
  DnsPropagationNodeResult 
} from '../types';
import { 
  runDnsPropagationCheck, 
  GLOBAL_DNS_POP_NODES 
} from '../mockDomainRegistrarData';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  RotateCw, 
  Zap, 
  Server, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  Radio, 
  Download, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Flame,
  Activity,
  Cpu
} from 'lucide-react';

interface DnsPropagationCheckerModalProps {
  domain: SchoolCustomDomain;
  isOpen: boolean;
  onClose: () => void;
}

export const DnsPropagationCheckerModal: React.FC<DnsPropagationCheckerModalProps> = ({
  domain,
  isOpen,
  onClose
}) => {
  const [selectedRecordType, setSelectedRecordType] = useState<DnsRecordType>('CNAME');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<DnsPropagationCheckSummary>(() => 
    runDnsPropagationCheck(domain, 'CNAME')
  );
  const [filterRegion, setFilterRegion] = useState<'all' | 'nigeria' | 'global' | 'issues'>('all');
  const [showTerminalTrace, setShowTerminalTrace] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [cachePurgedSuccess, setCachePurgedSuccess] = useState(false);

  // Trigger scan when modal opens or record type changes or domain changes
  useEffect(() => {
    if (isOpen) {
      handleTriggerLiveScan(selectedRecordType);
    }
  }, [isOpen, domain.id, selectedRecordType]);

  const handleTriggerLiveScan = (recType: DnsRecordType = selectedRecordType) => {
    setIsScanning(true);
    setCachePurgedSuccess(false);

    // Progressive node simulation
    setTimeout(() => {
      const summary = runDnsPropagationCheck(domain, recType);
      setScanSummary(summary);
      setIsScanning(false);
    }, 600);
  };

  const handlePurgeAnycastCache = () => {
    setIsPurgingCache(true);
    setTimeout(() => {
      setIsPurgingCache(false);
      setCachePurgedSuccess(true);
      handleTriggerLiveScan();
      setTimeout(() => setCachePurgedSuccess(false), 4000);
    }, 1000);
  };

  const handleCopyDiagnosticSummary = () => {
    const text = `DNS Propagation Report for ${domain.domainName}
Record: ${scanSummary.recordType} -> ${scanSummary.expectedTarget}
Status: ${scanSummary.status.toUpperCase()} (${scanSummary.propagationScore}%)
Healthy Nodes: ${scanSummary.healthyNodes}/${scanSummary.totalNodes}
Avg Anycast Latency: ${scanSummary.averageLatencyMs}ms
Checked At: ${scanSummary.checkedAt}
Registry: ${domain.registrar} | Tenant: ${domain.tenantSchoolName}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const filteredNodes = scanSummary.nodeResults.filter(node => {
    if (filterRegion === 'nigeria') {
      return node.location.includes('Nigeria') || node.countryCode === 'NG';
    }
    if (filterRegion === 'global') {
      return !node.location.includes('Nigeria');
    }
    if (filterRegion === 'issues') {
      return node.status !== 'matched';
    }
    return true;
  });

  if (!isOpen) return null;

  const isFull = scanSummary.propagationScore === 100;
  const isPartial = scanSummary.propagationScore >= 70 && !isFull;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/50 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isFull 
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
                : isPartial
                  ? 'bg-amber-950/70 border-amber-800 text-amber-400'
                  : 'bg-rose-950/70 border-rose-800 text-rose-400'
            }`}>
              <Radio className={`w-5 h-5 ${isScanning ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                  {domain.domainName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                  {domain.tenantSchoolName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Global Anycast & Nigerian IXPN DNS Propagation Status Indicator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerLiveScan()}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
              title="Refresh DNS queries across all nodes"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Probing...' : 'Re-probe'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Record Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold mr-1">Query Record:</span>
              {(['CNAME', 'A', 'TXT', 'MX', 'NS'] as DnsRecordType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedRecordType(type);
                    handleTriggerLiveScan(type);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                    selectedRecordType === type
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span>Expected:</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/60 truncate max-w-[220px]">
                {scanSummary.expectedTarget}
              </span>
            </div>
          </div>

          {/* Propagation Overview Hero Banner */}
          <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all ${
            isFull
              ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/80 shadow-lg shadow-emerald-950/30'
              : isPartial
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-800/80 shadow-lg shadow-amber-950/30'
                : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-800/80 shadow-lg shadow-rose-950/30'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left: Score & Status */}
              <div className="flex items-center gap-5">
                {/* Visual Gauge Meter */}
                <div className="relative flex items-center justify-center shrink-0">
                  <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-inner ${
                    isFull
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-emerald-900/50'
                      : isPartial
                        ? 'border-amber-500 bg-amber-950/60 text-amber-300 shadow-amber-900/50'
                        : 'border-rose-500 bg-rose-950/60 text-rose-300 shadow-rose-900/50'
                  }`}>
                    <span className="text-xl font-black font-mono leading-none">{scanSummary.propagationScore}%</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 mt-0.5">STATUS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isFull ? 'bg-emerald-400 animate-pulse' : isPartial ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <h4 className="text-lg font-black text-white">
                      {isFull && 'Fully Propagated Globally & Locally'}
                      {isPartial && 'DNS Propagation In Progress'}
                      {!isFull && !isPartial && 'DNS Resolution Pending / Unreachable'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 max-w-md">
                    {isFull && `All ${scanSummary.totalNodes} anycast nodes and sovereign Nigerian resolvers successfully returned the validated target record.`}
                    {isPartial && `${scanSummary.healthyNodes} of ${scanSummary.totalNodes} nodes resolved. Remote POPs may take up to standard TTL (300s) to update.`}
                    {!isFull && !isPartial && `Target record not detected at local registry nameservers. Please verify registrar CNAME/A configuration.`}
                  </p>
                </div>
              </div>

              {/* Right: Telemetry Chips & Purge button */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start md:items-end gap-3 shrink-0">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">HEALTHY NODES</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {scanSummary.healthyNodes} / {scanSummary.totalNodes}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">AVG LATENCY</span>
                    <span className="text-purple-300 font-bold text-sm">
                      {scanSummary.averageLatencyMs}ms
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePurgeAnycastCache}
                    disabled={isPurgingCache}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Purge DNS Cache across Anycast Edge"
                  >
                    <Flame className={`w-3.5 h-3.5 text-amber-400 ${isPurgingCache ? 'animate-bounce' : ''}`} />
                    <span>{isPurgingCache ? 'Purging Edge...' : 'Purge Edge Cache'}</span>
                  </button>
                </div>
              </div>
            </div>

            {cachePurgedSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anycast Edge DNS cache purged successfully across all Lagos MDXi & global nodes. Fresh cache TTL initiated.</span>
              </div>
            )}
          </div>

          {/* Node Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Filter:
              </span>
              {[
                { id: 'all', label: `All Nodes (${scanSummary.totalNodes})` },
                { id: 'nigeria', label: '🇳🇬 Nigerian POPs (4)' },
                { id: 'global', label: '🌐 Global POPs (8)' },
                { id: 'issues', label: `Issues (${scanSummary.totalNodes - scanSummary.healthyNodes})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterRegion(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterRegion === tab.id
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyDiagnosticSummary}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedSummary ? 'Copied Summary' : 'Copy Report'}</span>
              </button>

              <button
                onClick={() => setShowTerminalTrace(!showTerminalTrace)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                  showTerminalTrace
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Raw Dig Trace</span>
              </button>
            </div>
          </div>

          {/* Raw Terminal Trace (Collapsible) */}
          {showTerminalTrace && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2 animate-fadeIn shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-xs">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Terminal: dig +trace {domain.domainName} {selectedRecordType}</span>
                </span>
                <span className="text-emerald-400 font-bold">STATUS: NOERROR</span>
              </div>
              <pre className="text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`; <<>> DiG 9.18.28 <<>> +trace ${domain.domainName} ${selectedRecordType}
;; global options: +cmd
.                       518400  IN      NS      a.root-servers.net.
.                       518400  IN      NS      b.root-servers.net.
;; Received 525 bytes from 198.41.0.4#53(a.root-servers.net) in 12 ms

${domain.domainName.endsWith('.ng') ? `ng.                     172800  IN      NS      ns1.nic.net.ng.
ng.                     172800  IN      NS      ns2.nic.net.ng.
;; Received 288 bytes from 196.216.168.42#53(ns1.nic.net.ng) in 18 ms\n` : ''}
${domain.domainName}.   300     IN      ${selectedRecordType}   ${scanSummary.expectedTarget}
;; Query time: ${scanSummary.averageLatencyMs} msec
;; SERVER: 102.89.44.201#53(Anycast Edge MDXi Lagos)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 142`}
              </pre>
            </div>
          )}

          {/* POP Nodes Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5">POP Location & Provider</th>
                    <th className="p-3.5">DNS Resolver IP</th>
                    <th className="p-3.5">Resolved Answer</th>
                    <th className="p-3.5">Latency</th>
                    <th className="p-3.5 text-right">Propagation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No nodes matched the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredNodes.map(node => (
                      <tr key={node.nodeId} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{node.flag}</span>
                            <div>
                              <span className="font-bold text-white block font-sans">{node.location}</span>
                              <span className="text-[10px] text-slate-400 font-sans block">{node.dnsServer}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono">
                          {node.ip}
                        </td>
                        <td className="p-3.5">
                          <div className="max-w-[200px] truncate">
                            <span className={node.status === 'matched' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                              {node.resolvedValue}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-purple-300 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-400" />
                            {node.latencyMs}ms
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {node.status === 'matched' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>MATCHED</span>
                            </span>
                          )}
                          {node.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>PROPAGATING</span>
                            </span>
                          )}
                          {node.status === 'mismatched' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>MISMATCH</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic Note */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300 block">Nigerian Internet Exchange (IXPN) Local Caching Policy:</span>
              <span>
                Domains registered via Curriculum Server Anycast enjoy sub-15ms resolution across Nigerian networks (MTN, Airtel, Glo, Spectranet) through direct BGP peering at MDXi Lagos & Galaxy Backbone Abuja.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Last audited: {scanSummary.checkedAt}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors shadow-sm"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
