import React, { useState } from 'react';
import { 
  RegisteredApplication, 
  RegisteredFeature, 
  LifecycleStatus, 
  AvailabilityStatus, 
  ImplementationHonestyStatus 
} from '../types/applicationRegistry';
import { 
  INITIAL_REGISTERED_APPLICATIONS, 
  INITIAL_REGISTERED_FEATURES, 
  validateFeatureDependencies 
} from '../data/applicationRegistryData';
import { 
  Layers, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  ShieldCheck, 
  Server, 
  Box, 
  FileCode, 
  Check, 
  X, 
  Info,
  Sliders,
  ExternalLink,
  Edit3
} from 'lucide-react';

export const ApplicationRegistryPortal: React.FC = () => {
  const [applications, setApplications] = useState<RegisteredApplication[]>(INITIAL_REGISTERED_APPLICATIONS);
  const [features, setFeatures] = useState<RegisteredFeature[]>(INITIAL_REGISTERED_FEATURES);
  const [activeTab, setActiveTab] = useState<'applications' | 'features' | 'composition_sandbox'>('applications');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Composition Sandbox State
  const [selectedAppId, setSelectedAppId] = useState<string>('app_curriculum_flow');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>(
    INITIAL_REGISTERED_FEATURES.map(f => f.featureId)
  );
  const [compositionResult, setCompositionResult] = useState<{ valid: boolean; missingDependencies: string[] } | null>(null);

  // New App Modal State
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppFamily, setNewAppFamily] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppVersion, setNewAppVersion] = useState('1.0.0');

  const handleAddApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    const newApp: RegisteredApplication = {
      appId: `app_${Date.now()}`,
      name: newAppName,
      family: newAppFamily || 'Custom Family',
      description: newAppDesc || 'Newly registered application instance.',
      version: newAppVersion,
      containerImageRef: `gcr.io/curriculum-server/${newAppName.toLowerCase().replace(/\s+/g, '-')}:${newAppVersion}`,
      supportedDeploymentTargets: ['cloud_run', 'kubernetes'],
      requiredRuntimeDependencies: ['Node.js 20 LTS'],
      databaseRequirements: { engine: 'postgresql', minVersion: '15.0', requiresIsolatedSchema: true },
      storageRequirements: { minStorageMb: 5000, requiresBucket: true },
      authRequirements: { oauthSupported: true, jwtBearerRequired: true, rbacModel: 'Standard RBAC' },
      requiredInfrastructurePermissions: ['cloudsql.client'],
      healthCheckConfig: { endpoint: '/api/health', intervalSeconds: 30, timeoutSeconds: 5 },
      lifecycleStatus: 'beta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setApplications(prev => [newApp, ...prev]);
    setNewAppName('');
    setNewAppFamily('');
    setNewAppDesc('');
    setIsNewAppModalOpen(false);
  };

  const handleToggleFeatureSelection = (fid: string) => {
    setSelectedFeatureIds(prev => 
      prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]
    );
    setCompositionResult(null);
  };

  const handleValidateComposition = () => {
    const res = validateFeatureDependencies(selectedFeatureIds);
    setCompositionResult(res);
  };

  const filteredApps = applications.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFeatures = features.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.featureId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                Phase 4 Control Plane
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] font-bold uppercase tracking-wider">
                {applications.length} Registered Apps
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Application & Feature Registry</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Catalog, version, compose, and validate multi-tenant application families and modular features across cloud instances.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewAppModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Application</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'applications'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Application Registry ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'features'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Feature Registry ({features.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('composition_sandbox')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'composition_sandbox'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Application Composition Engine</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'applications' ? "Search registered applications by name, family or description..." : "Search registered features by name or ID..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Tab Content: Applications */}
      {activeTab === 'applications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredApps.map((app) => (
            <div key={app.appId} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-indigo-500/50 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                      {app.family}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                      app.lifecycleStatus === 'published' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      app.lifecycleStatus === 'beta' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {app.lifecycleStatus}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {app.name}
                    <span className="text-xs font-mono text-slate-400 font-normal">v{app.version}</span>
                  </h3>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-800 text-indigo-300">
                  <Server className="w-5 h-5" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {app.description}
              </p>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Container Image Ref:</span>
                  <span className="text-slate-200 truncate max-w-[240px]">{app.containerImageRef}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Database Engine:</span>
                  <span className="text-emerald-400">{app.databaseRequirements.engine} ({app.databaseRequirements.minVersion}+)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Deployment Targets:</span>
                  <span className="text-indigo-300">{app.supportedDeploymentTargets.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span>Health Check: <strong className="text-slate-200">{app.healthCheckConfig.endpoint}</strong></span>
                <span className="font-mono text-[10px]">Updated: {new Date(app.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Features */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feat) => (
            <div key={feat.featureId} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                    {feat.featureId}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    feat.honestyStatus === 'fully_implemented' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {feat.honestyStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{feat.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800 text-[11px]">
                {feat.dependencies.length > 0 && (
                  <div className="text-slate-400">
                    <span className="font-semibold text-slate-300">Prerequisites:</span>{' '}
                    <span className="font-mono text-indigo-300">{feat.dependencies.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                  <span>Version: v{feat.version}</span>
                  <span className="text-emerald-400 uppercase">{feat.availabilityStatus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Composition Sandbox */}
      {activeTab === 'composition_sandbox' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Application Composition & Dependency Engine</h2>
            <p className="text-xs text-slate-400">
              Compose custom tenant instances by selecting required modular features. The engine automatically validates prerequisite dependencies and resource requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: App & Feature Selector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Base Application Family</label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {applications.map(app => (
                    <option key={app.appId} value={app.appId}>{app.name} (v{app.version})</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Select Modular Features ({selectedFeatureIds.length} Selected)</label>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {features.map(feat => {
                    const isSelected = selectedFeatureIds.includes(feat.featureId);
                    return (
                      <div
                        key={feat.featureId}
                        onClick={() => handleToggleFeatureSelection(feat.featureId)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-indigo-950/40 border-indigo-700/60 text-white shadow-sm' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{feat.name}</p>
                            <p className="text-[11px] text-slate-400">{feat.description}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${feat.honestyStatus === 'fully_implemented' ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'}`}>
                          {feat.honestyStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Validation & Summary */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Composition Validation</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verifies that all selected feature dependencies and database schema requirements are fully satisfied.
                </p>

                {compositionResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    compositionResult.valid 
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                  }`}>
                    {compositionResult.valid ? (
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Composition is Valid & Ready to Provision</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Missing Required Prerequisite Features:</span>
                        </div>
                        <ul className="list-disc list-inside pl-2 text-[11px] text-rose-200 font-mono">
                          {compositionResult.missingDependencies.map((dep, idx) => (
                            <li key={idx}>{dep}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleValidateComposition}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Run Dependency & Compatibility Check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Application Modal */}
      {isNewAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Register New Application Family</span>
              </h2>
              <button onClick={() => setIsNewAppModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddApplication} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Application Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Curriculum University ERP"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Application Family</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Education"
                  value={newAppFamily}
                  onChange={(e) => setNewAppFamily(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe target academic or institutional scope..."
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Initial Version</label>
                <input
                  type="text"
                  value={newAppVersion}
                  onChange={(e) => setNewAppVersion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50"
                >
                  Register Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
