import React, { useState, useEffect } from 'react';
import { HomepageConfiguration } from '../types/homepageEngine';
import { InstanceBrandedHomepage } from './InstanceBrandedHomepage';
import { HomepageVisualEditor } from './HomepageVisualEditor';
import { homepageClient } from '../services/homepageClient';
import { getResolvedInstanceParam, setActiveApplication } from '../services/domainRouter';
import { School, Sparkles, ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';

interface InstanceHomepageContainerProps {
  initialInstanceId?: string;
  onNavigateToFlowWorkspace?: () => void;
}

export const InstanceHomepageContainer: React.FC<InstanceHomepageContainerProps> = ({
  initialInstanceId,
  onNavigateToFlowWorkspace
}) => {
  const [currentInstanceId, setCurrentInstanceId] = useState<string>(
    initialInstanceId || getResolvedInstanceParam()
  );
  const [config, setConfig] = useState<HomepageConfiguration | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [instanceMenuOpen, setInstanceMenuOpen] = useState<boolean>(false);

  const availableInstances = [
    { id: 'tenant-apex-01', name: 'Apex Comprehensive College, Ikeja', archetype: 'Secondary (Academic)' },
    { id: 'tenant-greenfield-01', name: 'Greenfield International Academy, Abuja', archetype: 'Secondary (Community)' },
    { id: 'inst_cust_002', name: 'Abeokuta Grammar School (Est. 1908)', archetype: 'Heritage (Editorial)' },
    { id: 'inst_cbt_003', name: 'Federal Joint CBT Examination Center', archetype: 'Testing Org (Tech-Driven)' }
  ];

  useEffect(() => {
    loadHomepage(currentInstanceId);
  }, [currentInstanceId]);

  const loadHomepage = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await homepageClient.getPublicHomepage(id);
      if (data) {
        setConfig(data);
      } else {
        setError(`No published homepage found for '${id}'. Please verify domain configuration.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load instance homepage');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchInstance = (newInstanceId: string) => {
    setCurrentInstanceId(newInstanceId);
    setInstanceMenuOpen(false);
    setActiveApplication('instance_homepage', newInstanceId);
  };

  const handleEnterWorkspace = () => {
    if (onNavigateToFlowWorkspace) {
      onNavigateToFlowWorkspace();
    } else {
      setActiveApplication('curriculum_flow');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A0F] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Resolving Instance Homepage & Branding...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-[#070A0F] flex items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
            <School className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Instance Domain Resolution Error</h2>
          <p className="text-xs text-slate-400">{error || 'Configuration could not be loaded.'}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => handleSwitchInstance('tenant-apex-01')}
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
            >
              Load Apex College Default
            </button>
            <button
              onClick={() => setActiveApplication('curriculum_server')}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
            >
              Back to SaaS Control Plane
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Instance Switcher Bar (For Development & Demonstration of Multi-Tenant Archetypes) */}
      <div className="bg-[#0B0F17] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500">Resolved Instance:</span>
          <div className="relative">
            <button
              onClick={() => setInstanceMenuOpen(!instanceMenuOpen)}
              className="flex items-center gap-1.5 font-bold text-white hover:text-emerald-400 transition-colors"
            >
              <span>{config.branding.institutionName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {instanceMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                {availableInstances.map(inst => (
                  <button
                    key={inst.id}
                    onClick={() => handleSwitchInstance(inst.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                      currentInstanceId === inst.id 
                        ? 'bg-emerald-950 text-emerald-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="truncate font-semibold">{inst.name}</p>
                      <p className="text-[10px] text-slate-400">{inst.archetype}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg font-bold text-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize Homepage (Visual Editor)</span>
          </button>
        </div>
      </div>

      {/* Render The Active Instance Branded Homepage */}
      <InstanceBrandedHomepage
        config={config}
        onEnterWorkspace={handleEnterWorkspace}
        onOpenVisualEditor={() => setIsEditorOpen(true)}
        isAdminUser={true}
      />

      {/* Homepage Visual Editor Modal */}
      {isEditorOpen && (
        <HomepageVisualEditor
          instanceId={config.instanceId}
          onClose={() => {
            setIsEditorOpen(false);
            loadHomepage(config.instanceId);
          }}
          onEnterWorkspace={handleEnterWorkspace}
        />
      )}
    </div>
  );
};
