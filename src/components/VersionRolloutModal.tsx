import React, { useState } from 'react';
import { AppVersionCatalogItem, TenantSchoolApp } from '../types';
import { APP_VERSION_CATALOG, globalVersionManager } from '../services/versionRolloutService';
import { 
  Layers, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';

interface VersionRolloutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: TenantSchoolApp[];
  onUpgradeTenants: (version: string, tenantIds: string[]) => void;
}

export const VersionRolloutModal: React.FC<VersionRolloutModalProps> = ({
  isOpen,
  onClose,
  tenants,
  onUpgradeTenants
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(APP_VERSION_CATALOG[0].version);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  if (!isOpen) return null;

  const versions = globalVersionManager.getVersions();
  const currentVersionObj = versions.find(v => v.version === selectedVersion) || versions[0];

  const handleSelectAll = () => {
    if (selectedTenantIds.length === tenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(tenants.map(t => t.id));
    }
  };

  const handleToggleTenant = (id: string) => {
    setSelectedTenantIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExecuteRollout = () => {
    if (selectedTenantIds.length === 0) return;
    setIsDeploying(true);
    setTimeout(() => {
      onUpgradeTenants(selectedVersion, selectedTenantIds);
      setIsDeploying(false);
      setDeploySuccess(true);
      setTimeout(() => {
        setDeploySuccess(false);
        onClose();
      }, 2000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Staged Canary Rollouts & Application Versioning
              </h3>
              <p className="text-xs text-slate-400">
                Deploy container image upgrades across selected tenant clusters with zero downtime.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Target Version Selector */}
          <div className="space-y-3">
            <label className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              Select Target Release Version:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {versions.map(ver => (
                <button
                  key={ver.version}
                  onClick={() => setSelectedVersion(ver.version)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedVersion === ver.version
                      ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-100 text-sm">{ver.version}</span>
                    {ver.isCanary ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">CANARY</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">STABLE</span>
                    )}
                  </div>
                  <p className="text-slate-400 font-mono text-[10px]">{ver.dockerImageTag}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Release Notes */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="font-semibold text-slate-200">Release Notes for {currentVersionObj.version}:</span>
            <ul className="space-y-1 text-slate-400 list-disc list-inside text-[11px]">
              {currentVersionObj.releaseNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>

          {/* Tenant Target Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                Select Target School Tenants ({selectedTenantIds.length}/{tenants.length}):
              </label>
              <button
                onClick={handleSelectAll}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                {selectedTenantIds.length === tenants.length ? 'Deselect All' : 'Select All Tenants'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {tenants.map(t => {
                const isSelected = selectedTenantIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTenant(t.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-950/30 border-emerald-500/50 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{t.schoolName}</p>
                      <p className="text-slate-500 font-mono text-[10px]">Current: v{t.provisionedFromTemplateVersion || t.clonedFromTemplateVersion || '1.4.2'}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="accent-emerald-500 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {deploySuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Staged rollout executed successfully across {selectedTenantIds.length} tenants!</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteRollout}
            disabled={isDeploying || selectedTenantIds.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 cursor-pointer"
          >
            {isDeploying ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Canary Deployment...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Deploy {selectedVersion} to {selectedTenantIds.length} Schools</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
