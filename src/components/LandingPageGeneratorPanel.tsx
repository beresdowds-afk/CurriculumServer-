import React, { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Pencil,
  Sparkles,
  ExternalLink,
  Search,
  MapPin,
  Mail,
  Phone,
  Globe,
  Copyright
} from 'lucide-react';
import type { TenantSchoolApp } from '../types';
import type {
  FooterEditableFields,
  LandingFooterAppKey,
  LandingFooterConfig,
  ProvisionedInstanceSummary
} from '../types/homepageEngine';
import { homepageClient } from '../services/homepageClient';
import { createDefaultLandingFooter, createDefaultPresetConfiguration } from '../data/homepageTemplatesData';
import { EditFooterModal } from './EditFooterModal';
import { HomepageVisualEditor } from './HomepageVisualEditor';

export interface LandingPageGeneratorPanelProps {
  tenants?: TenantSchoolApp[];
  onPreviewInstance?: (instanceId: string) => void;
  onEnterWorkspace?: () => void;
  compactHeader?: boolean;
}

export const LandingPageGeneratorPanel: React.FC<LandingPageGeneratorPanelProps> = ({
  tenants = [],
  onPreviewInstance,
  onEnterWorkspace = () => {},
  compactHeader = false
}) => {
  const [instances, setInstances] = useState<ProvisionedInstanceSummary[]>(() => {
    return tenants.map(t => {
      const preset = createDefaultPresetConfiguration(
        t.id,
        t.id,
        t.schoolSlug,
        t.schoolName,
        'secondary_school',
        'premium_academic',
        t.customDomain || t.subdomain
      );
      return {
        instanceId: t.id,
        tenantId: t.id,
        schoolSlug: t.schoolSlug,
        institutionName: t.schoolName,
        domain: t.customDomain || t.subdomain,
        templateId: preset.templateId,
        presetType: preset.presetType,
        status: 'published',
        versionNumber: 1,
        updatedAt: preset.updatedAt,
        copyrightText: preset.contact.copyrightText || `© ${new Date().getFullYear()} ${t.schoolName}. All rights reserved.`,
        institutionalAddress: [preset.contact.addressText, preset.contact.city, preset.contact.state].filter(Boolean).join(', '),
        email: t.principalEmail || preset.contact.primaryEmail,
        phoneNumber: t.principalPhone || preset.contact.primaryPhone
      };
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [footerTargetInstance, setFooterTargetInstance] = useState<ProvisionedInstanceSummary | null>(null);
  const [platformFooterKey, setPlatformFooterKey] = useState<LandingFooterAppKey | null>(null);
  const [serverFooter, setServerFooter] = useState<LandingFooterConfig>(() =>
    homepageClient.getCachedPlatformFooter('curriculum_server')
  );
  const [flowFooter, setFlowFooter] = useState<LandingFooterConfig>(() =>
    homepageClient.getCachedPlatformFooter('curriculum_flow')
  );

  const loadInstances = async () => {
    const serverList = await homepageClient.getProvisionedInstances();
    const map = new Map<string, ProvisionedInstanceSummary>();
    for (const item of serverList) {
      map.set(item.instanceId, item);
    }
    for (const t of tenants) {
      if (!map.has(t.id)) {
        const preset = createDefaultPresetConfiguration(
          t.id,
          t.id,
          t.schoolSlug,
          t.schoolName,
          'secondary_school',
          'premium_academic',
          t.customDomain || t.subdomain
        );
        map.set(t.id, {
          instanceId: t.id,
          tenantId: t.id,
          schoolSlug: t.schoolSlug,
          institutionName: t.schoolName,
          domain: t.customDomain || t.subdomain,
          templateId: preset.templateId,
          presetType: preset.presetType,
          status: 'published',
          versionNumber: 1,
          updatedAt: preset.updatedAt,
          copyrightText: preset.contact.copyrightText || `© ${new Date().getFullYear()} ${t.schoolName}. All rights reserved.`,
          institutionalAddress: [preset.contact.addressText, preset.contact.city, preset.contact.state].filter(Boolean).join(', '),
          email: t.principalEmail || preset.contact.primaryEmail,
          phoneNumber: t.principalPhone || preset.contact.primaryPhone
        });
      }
    }
    setInstances(Array.from(map.values()));
  };

  useEffect(() => {
    void loadInstances();
    void homepageClient.getPlatformFooter('curriculum_server').then(setServerFooter);
    void homepageClient.getPlatformFooter('curriculum_flow').then(setFlowFooter);
    const unsubServer = homepageClient.subscribePlatformFooter('curriculum_server', setServerFooter);
    const unsubFlow = homepageClient.subscribePlatformFooter('curriculum_flow', setFlowFooter);
    return () => {
      unsubServer();
      unsubFlow();
    };
  }, [tenants.length]);

  const filteredInstances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return instances;
    return instances.filter(item =>
      item.institutionName.toLowerCase().includes(q) ||
      item.schoolSlug.toLowerCase().includes(q) ||
      (item.domain || '').toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q)
    );
  }, [instances, searchQuery]);

  const activeEditorMeta = useMemo(() => {
    if (!editingInstanceId) return undefined;
    const match = instances.find(i => i.instanceId === editingInstanceId);
    if (!match) return undefined;
    return {
      schoolName: match.institutionName,
      schoolSlug: match.schoolSlug,
      domain: match.domain,
      copyrightText: match.copyrightText,
      institutionalAddress: match.institutionalAddress,
      email: match.email,
      phoneNumber: match.phoneNumber
    };
  }, [editingInstanceId, instances]);

  const handleLiveInstanceFooter = (instanceId: string, values: FooterEditableFields) => {
    setInstances(prev =>
      prev.map(item =>
        item.instanceId === instanceId
          ? {
              ...item,
              copyrightText: values.copyrightText,
              institutionalAddress: values.institutionalAddress,
              email: values.email,
              phoneNumber: values.phoneNumber
            }
          : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {!compactHeader && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
              <Layout className="w-4 h-4 text-purple-400" />
              <span>Landing Page Generator &amp; Footer Manager</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Provisioned Instance Landing Page Editors
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Generate, customize, and publish individual landing pages for every provisioned school instance, or directly update copyright text, institutional address, email, and phone details across platform and tenant footers.
            </p>
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search provisioned instances..."
              className="w-full bg-[#070A0F] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* Platform Landing Pages Footer Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'curriculum_server' as LandingFooterAppKey, label: 'Curriculum Server Landing Page', data: serverFooter, tone: 'purple' as const },
          { key: 'curriculum_flow' as LandingFooterAppKey, label: 'Curriculum Flow Landing Page', data: flowFooter, tone: 'emerald' as const }
        ].map(item => (
          <div
            key={item.key}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white">{item.label}</h3>
                <button
                  type="button"
                  onClick={() => setPlatformFooterKey(item.key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    item.tone === 'purple'
                      ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border-purple-500/40'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border-emerald-500/40'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Footer</span>
                </button>
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <p className="flex items-center gap-1.5 text-slate-400">
                  <Copyright className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.data.copyrightText}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.data.institutionalAddress}</span>
                </p>
                <div className="flex flex-wrap items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.data.email}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.data.phoneNumber}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Provisioned Instances Generator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredInstances.map(instance => (
          <div
            key={instance.instanceId}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{instance.institutionName}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                    <Globe className="w-3 h-3 shrink-0 text-slate-500" />
                    <span className="truncate">{instance.domain || `${instance.schoolSlug}.curriculumflow.com.ng`}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 shrink-0">
                  v{instance.versionNumber}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#070A0F] border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/80">
                  <span>Template</span>
                  <span className="font-mono text-slate-200">{instance.templateId.replace(/_/g, ' ')}</span>
                </div>
                <p className="flex items-start gap-1.5 text-slate-300 pt-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                  <span className="line-clamp-1">{instance.institutionalAddress}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-300">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">{instance.email}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-300">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span>{instance.phoneNumber}</span>
                </p>
                <p className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                  <Copyright className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                  <span className="line-clamp-1">{instance.copyrightText}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingInstanceId(instance.instanceId)}
                className="flex-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Landing Page Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setFooterTargetInstance(instance)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Footer</span>
              </button>

              {onPreviewInstance && (
                <button
                  type="button"
                  onClick={() => onPreviewInstance(instance.instanceId)}
                  aria-label={`Preview ${instance.institutionName} landing page`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
                  title="Preview Live Instance Landing Page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Per-Instance Landing Page Visual Editor */}
      {editingInstanceId && (
        <HomepageVisualEditor
          instanceId={editingInstanceId}
          tenantMeta={activeEditorMeta}
          onClose={() => {
            setEditingInstanceId(null);
            void loadInstances();
          }}
          onEnterWorkspace={onEnterWorkspace}
        />
      )}

      {/* Direct Edit Footer Modal for Provisioned Instance */}
      {footerTargetInstance && (
        <EditFooterModal
          isOpen={Boolean(footerTargetInstance)}
          title={`Edit Footer — ${footerTargetInstance.institutionName}`}
          subtitle="Directly update copyright text, institutional address, email, and phone number for this provisioned instance."
          accentTone="amber"
          initialValues={{
            copyrightText: footerTargetInstance.copyrightText,
            institutionalAddress: footerTargetInstance.institutionalAddress,
            email: footerTargetInstance.email,
            phoneNumber: footerTargetInstance.phoneNumber
          }}
          onLiveChange={(vals) => handleLiveInstanceFooter(footerTargetInstance.instanceId, vals)}
          onSave={async (vals) => {
            const res = await homepageClient.updateInstanceFooter(footerTargetInstance.instanceId, vals);
            handleLiveInstanceFooter(footerTargetInstance.instanceId, {
              copyrightText: res.config.contact.copyrightText || vals.copyrightText,
              institutionalAddress: vals.institutionalAddress,
              email: res.config.contact.primaryEmail,
              phoneNumber: res.config.contact.primaryPhone
            });
            setFooterTargetInstance(null);
            await loadInstances();
          }}
          onCancel={() => setFooterTargetInstance(null)}
        />
      )}

      {/* Direct Edit Footer Modal for Platform Landing Pages */}
      {platformFooterKey && (
        <EditFooterModal
          isOpen={Boolean(platformFooterKey)}
          title={`Edit Footer — ${platformFooterKey === 'curriculum_server' ? 'Curriculum Server' : 'Curriculum Flow'}`}
          accentTone={platformFooterKey === 'curriculum_server' ? 'purple' : 'emerald'}
          initialValues={{
            copyrightText: (platformFooterKey === 'curriculum_server' ? serverFooter : flowFooter).copyrightText,
            institutionalAddress: (platformFooterKey === 'curriculum_server' ? serverFooter : flowFooter).institutionalAddress,
            email: (platformFooterKey === 'curriculum_server' ? serverFooter : flowFooter).email,
            phoneNumber: (platformFooterKey === 'curriculum_server' ? serverFooter : flowFooter).phoneNumber
          }}
          defaultValues={createDefaultLandingFooter(platformFooterKey)}
          onLiveChange={(vals) => {
            if (platformFooterKey === 'curriculum_server') {
              setServerFooter(prev => ({ ...prev, ...vals }));
            } else {
              setFlowFooter(prev => ({ ...prev, ...vals }));
            }
          }}
          onSave={async (vals) => {
            const res = await homepageClient.updatePlatformFooter(platformFooterKey, vals);
            if (platformFooterKey === 'curriculum_server') {
              setServerFooter(res.config);
            } else {
              setFlowFooter(res.config);
            }
            setPlatformFooterKey(null);
          }}
          onCancel={() => setPlatformFooterKey(null)}
        />
      )}
    </div>
  );
};
