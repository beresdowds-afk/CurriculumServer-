import React, { useState } from 'react';
import { 
  InstanceArchitectureProfile, 
  IIAPEAssessmentRequest, 
  InstanceRequestType 
} from '../types/iiapEngine';
import { IIAPEngineService } from '../services/iiapEngineService';
import { 
  Cpu, 
  Server, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  Zap, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  History,
  Check
} from 'lucide-react';

export const IIAPEControlPortal: React.FC = () => {
  const [profiles, setProfiles] = useState<InstanceArchitectureProfile[]>(IIAPEngineService.getProfiles());
  const [selectedProfile, setSelectedProfile] = useState<InstanceArchitectureProfile | null>(profiles[0] || null);

  // Assessment Form State
  const [customerName, setCustomerName] = useState('Greenwood High School, Abuja');
  const [instanceType, setInstanceType] = useState<InstanceRequestType>('full_school_management');
  const [expectedStudents, setExpectedStudents] = useState(1500);
  const [expectedFaculty, setExpectedFaculty] = useState(90);
  const [expectedConcurrentUsers, setExpectedConcurrentUsers] = useState(250);
  const [dataVolumeGb, setDataVolumeGb] = useState(25);
  const [availabilitySla, setAvailabilitySla] = useState<'99.5' | '99.9' | '99.99'>('99.9');
  const [requiresDedicatedDb, setRequiresDedicatedDb] = useState(true);
  const [requiresCustomDomain, setRequiresCustomDomain] = useState(true);
  const [securityTier, setSecurityTier] = useState<'standard' | 'strict' | 'sovereign'>('strict');
  const [budgetPreference, setBudgetPreference] = useState<'economy' | 'balanced' | 'performance_unbounded'>('balanced');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRunAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const assessmentReq: IIAPEAssessmentRequest = {
        customerId: `cust_${Date.now()}`,
        customerName,
        instanceType,
        expectedStudents,
        expectedFaculty,
        expectedConcurrentUsers,
        dataVolumeGb,
        availabilitySla,
        requiresDedicatedDatabase: requiresDedicatedDb,
        requiresCustomDomain,
        securityTier,
        budgetPreference
      };

      const recommended = IIAPEngineService.evaluateAndRecommend(assessmentReq);
      setProfiles(IIAPEngineService.getProfiles());
      setSelectedProfile(recommended);
      setIsGenerating(false);
    }, 600);
  };

  const handleApprove = (profileId: string) => {
    const updated = IIAPEngineService.approveProfile(profileId);
    setProfiles([...IIAPEngineService.getProfiles()]);
    setSelectedProfile(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                Phase 5 Control Plane
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                IIAPE Engine v1.5
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Intelligent Instance Architecture & Provisioning Engine</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Evaluate school institutional parameters and generate explainable, versioned infrastructure architecture profiles prior to container provisioning.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Assessment Input Form */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>IIAPE Requirements Assessment</span>
            </h2>
          </div>

          <form onSubmit={handleRunAssessment} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Institution Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Instance Request Type</label>
              <select
                value={instanceType}
                onChange={(e) => setInstanceType(e.target.value as InstanceRequestType)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="full_school_management">1. Full School Management Instance</option>
                <option value="custom_architecture">2. Custom Architecture Instance</option>
                <option value="feature_collection">3. Feature Collection Instance</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Expected Students</label>
                <input
                  type="number"
                  value={expectedStudents}
                  onChange={(e) => setExpectedStudents(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Concurrent Users</label>
                <input
                  type="number"
                  value={expectedConcurrentUsers}
                  onChange={(e) => setExpectedConcurrentUsers(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Data Volume (GB)</label>
                <input
                  type="number"
                  value={dataVolumeGb}
                  onChange={(e) => setDataVolumeGb(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Security Tier</label>
                <select
                  value={securityTier}
                  onChange={(e) => setSecurityTier(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="standard">Standard SaaS</option>
                  <option value="strict">Strict (PCI / ISO)</option>
                  <option value="sovereign">Sovereign Air-Gapped</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <span>Analyzing Workload & Generating Profile...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Run IIAPE Decision Engine</span>
                </>
              )}
            </button>
          </form>

          {/* Profile History List */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Profiles ({profiles.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {profiles.map(p => (
                <div
                  key={p.profileId}
                  onClick={() => setSelectedProfile(p)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedProfile?.profileId === p.profileId
                      ? 'bg-purple-950/40 border-purple-700/60 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{p.customerName}</p>
                    <p className="text-[10px] font-mono text-slate-500">{p.deploymentTarget}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase ${
                    p.lifecycleState === 'admin_approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {p.lifecycleState}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Architecture Profile Inspector & Explainability */}
        <div className="lg:col-span-7 space-y-6">
          {selectedProfile ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono text-[10px] font-bold uppercase">
                      Version {selectedProfile.profileVersion}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                      selectedProfile.lifecycleState === 'admin_approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {selectedProfile.lifecycleState}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedProfile.customerName}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedProfile.architectureProfileName}</p>
                </div>

                {selectedProfile.lifecycleState !== 'admin_approved' && (
                  <button
                    onClick={() => handleApprove(selectedProfile.profileId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Architecture</span>
                  </button>
                )}
              </div>

              {/* Rationale & Explainability Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>IIAPE Explainability Rationale</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProfile.rationale}
                </p>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deployment Target</span>
                  <p className="text-xs font-bold text-white font-mono truncate">{selectedProfile.deploymentTarget}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Database Strategy</span>
                  <p className="text-xs font-bold text-emerald-400 font-mono truncate">{selectedProfile.databaseStrategy}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resource Allocation</span>
                  <p className="text-xs font-bold text-indigo-300 font-mono">{selectedProfile.resourceAllocation.cpu} / {selectedProfile.resourceAllocation.memory}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Profile</span>
                  <p className="text-xs font-bold text-amber-300 font-mono">{selectedProfile.securityProfile}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Domain Strategy</span>
                  <p className="text-xs font-bold text-sky-300 font-mono">{selectedProfile.domainStrategy}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Monthly Cost</span>
                  <p className="text-xs font-bold text-emerald-300 font-mono">₦{selectedProfile.estimatedMonthlyCostNGN.toLocaleString()}</p>
                </div>
              </div>

              {/* Alternatives Considered */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alternatives Considered & Rejected</h3>
                <div className="space-y-2">
                  {selectedProfile.alternativesConsidered.map((alt, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">{alt.target}</span>
                      <span className="text-slate-400 text-[11px] max-w-xs text-right">{alt.reasonRejected}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400">
              Select or generate an architecture profile to inspect specifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
