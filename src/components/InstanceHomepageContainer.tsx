import React, { useState, useEffect } from 'react';
import { HomepageConfiguration, ProvisionedInstanceSummary } from '../types/homepageEngine';
import { InstanceBrandedHomepage } from './InstanceBrandedHomepage';
import { HomepageVisualEditor } from './HomepageVisualEditor';
import { LandingPageGeneratorPanel } from './LandingPageGeneratorPanel';
import { homepageClient } from '../services/homepageClient';
import { getResolvedInstanceParam, setActiveApplication } from '../services/domainRouter';
import { INITIAL_PROVISIONED_TENANTS, INITIAL_CLONED_TENANTS } from '../mockCurriculumServerData';
import { School, Sparkles, ChevronDown, Layout, X } from 'lucide-react';

interface InstanceHomepageContainerProps {
  initialInstanceId?: string;
  onNavigateToFlowWorkspace?: () => void;
  initialGeneratorOpen?: boolean;
}

export const InstanceHomepageContainer: React.FC<InstanceHomepageContainerProps> = ({
  initialInstanceId,
  onNavigateToFlowWorkspace,
  initialGeneratorOpen = false
}) => {
  const [currentInstanceId, setCurrentInstanceId] = useState<string>(
    initialInstanceId || getResolvedInstanceParam()
  );
  const [config, setConfig] = useState<HomepageConfiguration | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(initialGeneratorOpen);
  const [instanceMenuOpen, setInstanceMenuOpen] = useState<boolean>(false);
  const [availableInstances, setAvailableInstances] = useState<ProvisionedInstanceSummary[]>(() => {
    const seen = new Set<string>();
    const combined = [...INITIAL_PROVISIONED_TENANTS, ...INITIAL_CLONED_TENANTS];
    return combined
      .filter(t => {
        if (!t.id || seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .map(t => ({
        instanceId: t.id,
        tenantId: t.id,
        schoolSlug: t.schoolSlug,
        institutionName: t.schoolName,
        domain: t.customDomain || t.subdomain,
        templateId: 'premium_academic' as const,
        presetType: 'secondary_school' as const,
        status: 'published' as const,
        versionNumber: 1,
        updatedAt: new Date().toISOString(),
        copyrightText: `© ${new Date().getFullYear()} ${t.schoolName}. All rights reserved.`,
        institutionalAddress: `${t.address ? `${t.address}, ` : ''}${t.locationState}, Nigeria`,
        email: t.principalEmail || `info@${t.schoolSlug}.sch.ng`,
        phoneNumber: t.principalPhone || '+234 803 555 0192'
      }));
  });

  useEffect(() => {
    void homepageClient.getProvisionedInstances().then(list => {
      if (list.length > 0) {
        setAvailableInstances(list);
      }
    });
  }, []);

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
          <p className="text-sm font-semibold text-slate-300">Resolving Instance Homepage &amp; Branding...</p>
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
      {/* Instance Switcher & Landing Page Generator Bar */}
      <div className="bg-[#0B0F17] border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
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
              <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                {availableInstances.map(inst => (
                  <button
                    key={inst.instanceId}
                    onClick={() => handleSwitchInstance(inst.instanceId)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                      currentInstanceId === inst.instanceId 
                        ? 'bg-emerald-950 text-emerald-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{inst.institutionName}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {inst.domain || inst.schoolSlug} · {inst.templateId.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsGeneratorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/20 text-purple-200 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg font-bold text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Landing Page Generator ({availableInstances.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg font-bold text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Landing Page Editor</span>
          </button>
        </div>
      </div>

      {/* Render The Active Instance Branded Homepage */}
      <InstanceBrandedHomepage
        config={config}
        onEnterWorkspace={handleEnterWorkspace}
        onOpenVisualEditor={() => setIsEditorOpen(true)}
        isAdminUser={true}
        onUpdateConfig={(updated) => setConfig(updated)}
      />

      {/* Homepage Visual Editor Modal */}
      {isEditorOpen && (
        <HomepageVisualEditor
          instanceId={config.instanceId}
          tenantMeta={{
            schoolName: config.branding.institutionName,
            schoolSlug: config.schoolSlug,
            domain: config.domain,
            copyrightText: config.contact.copyrightText,
            email: config.contact.primaryEmail,
            phoneNumber: config.contact.primaryPhone
          }}
          onClose={() => {
            setIsEditorOpen(false);
            void loadHomepage(config.instanceId);
          }}
          onEnterWorkspace={handleEnterWorkspace}
        />
      )}

      {/* Landing Page Generator Drawer/Modal for All Provisioned Instances */}
      {isGeneratorOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm overflow-y-auto p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Landing Page Generator"
        >
          <div className="max-w-7xl mx-auto bg-[#0B0F17] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">Landing Page Generator</h2>
                <p className="text-xs text-slate-400">
                  Manage landing page editors and live footers for every provisioned instance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGeneratorOpen(false);
                  void loadHomepage(currentInstanceId);
                }}
                aria-label="Close Landing Page Generator"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <LandingPageGeneratorPanel
              tenants={[...INITIAL_PROVISIONED_TENANTS, ...INITIAL_CLONED_TENANTS]}
              compactHeader={false}
              onPreviewInstance={(instId) => {
                setIsGeneratorOpen(false);
                handleSwitchInstance(instId);
              }}
              onEnterWorkspace={handleEnterWorkspace}
            />
          </div>
        </div>
      )}
    </div>
  );
};
