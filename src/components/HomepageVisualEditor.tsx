import React, { useState, useEffect } from 'react';
import { 
  HomepageConfiguration, 
  HomepageTemplateDefinition, 
  HomepageVersionRecord, 
  HomepageSectionConfig,
  HomepageTemplateId,
  InstitutionPresetType,
  TypographyFace
} from '../types/homepageEngine';
import { HOMEPAGE_TEMPLATES, createDefaultPresetConfiguration } from '../data/homepageTemplatesData';
import { InstanceBrandedHomepage } from './InstanceBrandedHomepage';
import { 
  Sparkles, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Save, 
  UploadCloud, 
  RotateCcw, 
  Eye, 
  Layers, 
  Palette, 
  Type, 
  Layout, 
  KeyRound, 
  Phone, 
  Clock, 
  Check, 
  X, 
  ChevronRight, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { homepageClient } from '../services/homepageClient';

interface HomepageVisualEditorProps {
  instanceId: string;
  onClose: () => void;
  onEnterWorkspace: () => void;
}

export const HomepageVisualEditor: React.FC<HomepageVisualEditorProps> = ({
  instanceId,
  onClose,
  onEnterWorkspace
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'branding' | 'hero' | 'sections' | 'auth' | 'contact' | 'versions'>('templates');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Configuration State
  const [publishedConfig, setPublishedConfig] = useState<HomepageConfiguration | null>(null);
  const [draftConfig, setDraftConfig] = useState<HomepageConfiguration | null>(null);
  const [versions, setVersions] = useState<HomepageVersionRecord[]>([]);

  useEffect(() => {
    loadEditorData();
  }, [instanceId]);

  const loadEditorData = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await homepageClient.getAdminHomepage(instanceId);
      setPublishedConfig(res.published);
      setDraftConfig(res.draft || res.published);
      setVersions(res.versions || []);
    } catch (err: any) {
      // Fallback: create fresh draft from default preset
      const fallback = createDefaultPresetConfiguration(
        instanceId,
        instanceId,
        instanceId.replace('tenant-', ''),
        'Apex Comprehensive College',
        'secondary_school',
        'premium_academic'
      );
      setPublishedConfig(fallback);
      setDraftConfig(fallback);
      setFeedbackMsg({ text: `Using local draft: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftConfig) return;
    setSavingDraft(true);
    setFeedbackMsg(null);
    try {
      const updated = await homepageClient.saveDraft(instanceId, draftConfig);
      setDraftConfig(updated);
      setFeedbackMsg({ text: 'Draft saved successfully. (Not visible to public visitors)', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: `Failed to save draft: ${err.message}`, type: 'error' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!draftConfig) return;
    const confirmPub = window.confirm('Publish these changes to the live public homepage? Public visitors will immediately see the updated design.');
    if (!confirmPub) return;

    setPublishing(true);
    setFeedbackMsg(null);
    try {
      const published = await homepageClient.publishHomepage(
        instanceId, 
        `Updated template '${draftConfig.templateId}' with ${draftConfig.sections.length} active sections`
      );
      setPublishedConfig(published);
      setDraftConfig(JSON.parse(JSON.stringify(published)));
      setFeedbackMsg({ text: `Version v${published.versionNumber} successfully published to public domain!`, type: 'success' });
      await loadEditorData();
    } catch (err: any) {
      setFeedbackMsg({ text: `Failed to publish: ${err.message}`, type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (versionNum: number) => {
    const confirmRoll = window.confirm(`Roll back the live homepage to Version v${versionNum}?`);
    if (!confirmRoll) return;

    setPublishing(true);
    setFeedbackMsg(null);
    try {
      const restored = await homepageClient.rollbackVersion(instanceId, versionNum);
      setPublishedConfig(restored);
      setDraftConfig(JSON.parse(JSON.stringify(restored)));
      setFeedbackMsg({ text: `Successfully rolled back to Version v${versionNum}`, type: 'success' });
      await loadEditorData();
    } catch (err: any) {
      setFeedbackMsg({ text: `Rollback failed: ${err.message}`, type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleApplyTemplate = (tplId: HomepageTemplateId) => {
    if (!draftConfig) return;
    const tpl = HOMEPAGE_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;

    setDraftConfig({
      ...draftConfig,
      templateId: tplId,
      branding: {
        ...draftConfig.branding,
        primaryColor: tpl.previewColorPrimary,
        secondaryColor: tpl.previewColorSecondary,
        typographyFace: tpl.typographySuggestion,
        borderRadius: tpl.defaultBorderRadius
      }
    });
  };

  const handleApplyPreset = (preset: InstitutionPresetType) => {
    if (!draftConfig) return;
    const fresh = createDefaultPresetConfiguration(
      draftConfig.instanceId,
      draftConfig.tenantId,
      draftConfig.schoolSlug,
      draftConfig.branding.institutionName,
      preset,
      draftConfig.templateId,
      draftConfig.domain
    );
    setDraftConfig({
      ...fresh,
      versionNumber: draftConfig.versionNumber
    });
    setFeedbackMsg({ text: `Preset applied: ${preset.replace(/_/g, ' ')}`, type: 'success' });
  };

  const toggleSection = (secId: string) => {
    if (!draftConfig) return;
    setDraftConfig({
      ...draftConfig,
      sections: draftConfig.sections.map(s => s.id === secId ? { ...s, enabled: !s.enabled } : s)
    });
  };

  const moveSection = (secId: string, direction: 'up' | 'down') => {
    if (!draftConfig) return;
    const secs = [...draftConfig.sections].sort((a, b) => a.order - b.order);
    const idx = secs.findIndex(s => s.id === secId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = secs[idx].order;
      secs[idx].order = secs[idx - 1].order;
      secs[idx - 1].order = temp;
    } else if (direction === 'down' && idx < secs.length - 1) {
      const temp = secs[idx].order;
      secs[idx].order = secs[idx + 1].order;
      secs[idx + 1].order = temp;
    }

    setDraftConfig({
      ...draftConfig,
      sections: secs
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070A0F] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading Homepage Visual Editor...</p>
        </div>
      </div>
    );
  }

  const previewWidthClass = 
    previewDevice === 'mobile' ? 'max-w-[390px] shadow-2xl border-x border-slate-700' :
    previewDevice === 'tablet' ? 'max-w-[768px] shadow-2xl border-x border-slate-700' : 'w-full';

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F17] flex flex-col text-slate-100 antialiased overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP TOOLBAR                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="h-16 px-6 bg-[#070A0F] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Homepage Visual Editor</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300">
                Instance: {draftConfig?.schoolSlug}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live Draft vs Published (Current Live: v{publishedConfig?.versionNumber || 1})
            </p>
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Desktop View (1440px)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewDevice('tablet')}
            className={`p-2 rounded-lg transition-all ${previewDevice === 'tablet' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-950/50 transition-all flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{publishing ? 'Publishing...' : 'Publish to Live Domain'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN SPLIT INTERFACE: CONTROLS & LIVE PREVIEW             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Controls Drawer */}
        <aside className="w-80 md:w-96 bg-[#090D14] border-r border-slate-800 flex flex-col shrink-0">
          {/* Subtabs */}
          <div className="p-2 border-b border-slate-800 grid grid-cols-4 gap-1 text-[11px] font-bold">
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'templates' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveSubTab('branding')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'branding' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveSubTab('hero')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'hero' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hero
            </button>
            <button
              onClick={() => setActiveSubTab('sections')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'sections' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sections
            </button>
          </div>

          <div className="p-2 border-b border-slate-800 grid grid-cols-3 gap-1 text-[11px] font-bold">
            <button
              onClick={() => setActiveSubTab('auth')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'auth' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auth Setup
            </button>
            <button
              onClick={() => setActiveSubTab('contact')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'contact' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Contact
            </button>
            <button
              onClick={() => setActiveSubTab('versions')}
              className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                activeSubTab === 'versions' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              History ({versions.length})
            </button>
          </div>

          {/* Subtab Content Form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {/* SUBTAB: TEMPLATES & PRESETS */}
            {activeSubTab === 'templates' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-bold text-white mb-2">Institution Presets</h4>
                  <p className="text-slate-400 text-[11px] mb-2.5">Quick starting layouts tailored to institution type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'secondary_school', label: 'Secondary School' },
                      { key: 'primary_school', label: 'Primary School' },
                      { key: 'university', label: 'University / Poly' },
                      { key: 'vocational', label: 'Vocational Tech' },
                      { key: 'examination_org', label: 'CBT Examination' },
                      { key: 'custom_org', label: 'Custom Org' }
                    ].map(p => (
                      <button
                        key={p.key}
                        onClick={() => handleApplyPreset(p.key as any)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          draftConfig?.presetType === p.key
                            ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold block">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-2">Design Template Library</h4>
                  <div className="space-y-3">
                    {HOMEPAGE_TEMPLATES.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          draftConfig?.templateId === tpl.id
                            ? 'bg-purple-950/40 border-purple-500 shadow-md'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{tpl.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: tpl.previewColorPrimary }}
                            />
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20"
                              style={{ backgroundColor: tpl.previewColorSecondary }}
                            />
                          </div>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1.5">{tpl.description}</p>
                        <div className="mt-2 text-[10px] text-purple-400 font-mono">
                          Font: {tpl.typographySuggestion} · Radius: {tpl.defaultBorderRadius}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: BRANDING */}
            {activeSubTab === 'branding' && draftConfig && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Institution Full Name</label>
                  <input
                    type="text"
                    value={draftConfig.branding.institutionName}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      branding: { ...draftConfig.branding, institutionName: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    value={draftConfig.branding.shortName}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      branding: { ...draftConfig.branding, shortName: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Institutional Motto / Tagline</label>
                  <input
                    type="text"
                    value={draftConfig.branding.tagline}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      branding: { ...draftConfig.branding, tagline: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={draftConfig.branding.primaryColor}
                        onChange={e => setDraftConfig({
                          ...draftConfig,
                          branding: { ...draftConfig.branding, primaryColor: e.target.value }
                        })}
                        className="w-8 h-8 rounded border border-slate-700 cursor-pointer"
                      />
                      <span className="font-mono text-xs">{draftConfig.branding.primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Accent Gold/Tone</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={draftConfig.branding.accentColor}
                        onChange={e => setDraftConfig({
                          ...draftConfig,
                          branding: { ...draftConfig.branding, accentColor: e.target.value }
                        })}
                        className="w-8 h-8 rounded border border-slate-700 cursor-pointer"
                      />
                      <span className="font-mono text-xs">{draftConfig.branding.accentColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Typography Family</label>
                  <select
                    value={draftConfig.branding.typographyFace}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      branding: { ...draftConfig.branding, typographyFace: e.target.value as any }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                    <option value="Outfit">Outfit (Approachable Geometric)</option>
                    <option value="DM Sans">DM Sans (Corporate Authority)</option>
                    <option value="Playfair Display">Playfair Display (Academic Serif)</option>
                    <option value="Cinzel">Cinzel (Classical University)</option>
                    <option value="Manrope">Manrope (Tech & STEM)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Border Radius Style</label>
                  <select
                    value={draftConfig.branding.borderRadius}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      branding: { ...draftConfig.branding, borderRadius: e.target.value as any }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="none">Sharp Edges (None)</option>
                    <option value="sm">Subtle (SM)</option>
                    <option value="md">Standard (MD)</option>
                    <option value="lg">Curved (LG)</option>
                    <option value="xl">Pill Smooth (XL)</option>
                    <option value="2xl">Max Rounded (2XL)</option>
                  </select>
                </div>
              </div>
            )}

            {/* SUBTAB: HERO SECTION */}
            {activeSubTab === 'hero' && draftConfig && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hero Headline</label>
                  <textarea
                    rows={2}
                    value={draftConfig.hero.headline}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      hero: { ...draftConfig.hero, headline: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Subheadline Description</label>
                  <textarea
                    rows={3}
                    value={draftConfig.hero.subheadline}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      hero: { ...draftConfig.hero, subheadline: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kicker Badge Text</label>
                  <input
                    type="text"
                    value={draftConfig.hero.badgeText || ''}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      hero: { ...draftConfig.hero, badgeText: e.target.value }
                    })}
                    placeholder="NERDC 2026 Aligned & Fully Accredited"
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Primary CTA Label</label>
                    <input
                      type="text"
                      value={draftConfig.hero.ctaPrimaryText}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        hero: { ...draftConfig.hero, ctaPrimaryText: e.target.value }
                      })}
                      className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Secondary CTA Label</label>
                    <input
                      type="text"
                      value={draftConfig.hero.ctaSecondaryText || ''}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        hero: { ...draftConfig.hero, ctaSecondaryText: e.target.value }
                      })}
                      className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftConfig.hero.showQuickAuthBox}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        hero: { ...draftConfig.hero, showQuickAuthBox: e.target.checked }
                      })}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span className="font-semibold text-slate-200">Show Quick Portal Login in Hero</span>
                  </label>
                </div>
              </div>
            )}

            {/* SUBTAB: SECTIONS */}
            {activeSubTab === 'sections' && draftConfig && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Homepage Sections</span>
                  <span className="text-[11px] text-slate-400">Toggle & Reorder</span>
                </div>

                {draftConfig.sections.sort((a, b) => a.order - b.order).map((sec, idx) => (
                  <div key={sec.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sec.enabled}
                          onChange={() => toggleSection(sec.id)}
                          className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0"
                        />
                        <span className="font-bold text-white text-xs">{sec.title}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSection(sec.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveSection(sec.id, 'down')}
                          disabled={idx === draftConfig.sections.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={sec.title}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        sections: draftConfig.sections.map(s => s.id === sec.id ? { ...s, title: e.target.value } : s)
                      })}
                      className="w-full bg-[#070A0F] border border-slate-800 rounded p-1.5 text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* SUBTAB: AUTHENTICATION SETTINGS */}
            {activeSubTab === 'auth' && draftConfig && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Welcome Login Heading</label>
                  <input
                    type="text"
                    value={draftConfig.authPresentation.welcomeHeading}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      authPresentation: { ...draftConfig.authPresentation, welcomeHeading: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Welcome Subtext / Help</label>
                  <textarea
                    rows={2}
                    value={draftConfig.authPresentation.welcomeSubtext}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      authPresentation: { ...draftConfig.authPresentation, welcomeSubtext: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-2">Permitted User Groups on Login</label>
                  <div className="space-y-1.5">
                    {(['admin', 'teacher', 'staff', 'student', 'parent'] as const).map(grp => {
                      const isChecked = draftConfig.authPresentation.enabledUserGroups.includes(grp);
                      return (
                        <label key={grp} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = draftConfig.authPresentation.enabledUserGroups;
                              const next = isChecked ? current.filter(g => g !== grp) : [...current, grp];
                              if (next.length > 0) {
                                setDraftConfig({
                                  ...draftConfig,
                                  authPresentation: { ...draftConfig.authPresentation, enabledUserGroups: next }
                                });
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                          />
                          <span className="capitalize font-medium text-slate-300">{grp} Portal</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: CONTACT */}
            {activeSubTab === 'contact' && draftConfig && (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Campus Physical Address</label>
                  <input
                    type="text"
                    value={draftConfig.contact.addressText}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      contact: { ...draftConfig.contact, addressText: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      value={draftConfig.contact.city}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        contact: { ...draftConfig.contact, city: e.target.value }
                      })}
                      className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">State</label>
                    <input
                      type="text"
                      value={draftConfig.contact.state}
                      onChange={e => setDraftConfig({
                        ...draftConfig,
                        contact: { ...draftConfig.contact, state: e.target.value }
                      })}
                      className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={draftConfig.contact.primaryEmail}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      contact: { ...draftConfig.contact, primaryEmail: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Helpline Phone</label>
                  <input
                    type="text"
                    value={draftConfig.contact.primaryPhone}
                    onChange={e => setDraftConfig({
                      ...draftConfig,
                      contact: { ...draftConfig.contact, primaryPhone: e.target.value }
                    })}
                    className="w-full bg-[#070A0F] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            )}

            {/* SUBTAB: VERSION HISTORY & ROLLBACK */}
            {activeSubTab === 'versions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Snapshot Version History</span>
                  <span className="text-[11px] text-slate-400">PostgreSQL Immutable Log</span>
                </div>

                {versions.length === 0 ? (
                  <p className="text-slate-400 text-xs">No version history recorded yet.</p>
                ) : (
                  versions.slice().reverse().map(ver => (
                    <div key={ver.versionId} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">Version v{ver.versionNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ver.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{ver.changelog}</p>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">By: {ver.publishedBy}</span>
                        <button
                          onClick={() => handleRollback(ver.versionNumber)}
                          className="px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-[10px] font-bold transition-all"
                        >
                          Rollback
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Live Responsive Preview Canvas */}
        <main className="flex-1 bg-slate-950/80 overflow-y-auto flex justify-center p-4">
          <div className={`${previewWidthClass} transition-all duration-300`}>
            {draftConfig ? (
              <InstanceBrandedHomepage
                config={draftConfig}
                onEnterWorkspace={onEnterWorkspace}
                isAdminUser={false}
              />
            ) : (
              <div className="p-12 text-center text-slate-500">No preview available</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
