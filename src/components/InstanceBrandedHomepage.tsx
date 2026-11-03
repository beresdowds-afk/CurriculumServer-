

import React, { useState, useEffect } from 'react';
import { 
  HomepageConfiguration, 
  HomepageSectionConfig, 
  InstitutionPresetType,
  HomepageSectionType
} from '../types/homepageEngine';
import { 
  School, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Calendar, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink, 
  FileText, 
  CreditCard, 
  Sparkles, 
  KeyRound,
  ShieldCheck,
  ChevronRight,
  Clock,
  Sliders,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Trash2,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface InstanceBrandedHomepageProps {
  config: HomepageConfiguration;
  onEnterWorkspace: () => void;
  onOpenVisualEditor?: () => void;
  isAdminUser?: boolean;
  onUpdateConfig?: (newConfig: HomepageConfiguration) => void;
}

export const InstanceBrandedHomepage: React.FC<InstanceBrandedHomepageProps> = ({
  config,
  onEnterWorkspace,
  onOpenVisualEditor,
  isAdminUser = false,
  onUpdateConfig
}) => {
  const [mutableConfig, setMutableConfig] = useState<HomepageConfiguration>(config);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);

  useEffect(() => {
    setMutableConfig(config);
  }, [config]);

  const { branding, hero, sections, authPresentation, contact } = mutableConfig;
  const [selectedAuthGroup, setSelectedAuthGroup] = useState<string>(authPresentation.defaultGroup || 'student');
  const [authId, setAuthId] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Derive inline brand styling with strict fallback
  const primaryColor = branding.primaryColor || '#064e3b';
  const secondaryColor = branding.secondaryColor || '#0f766e';
  const accentColor = branding.accentColor || '#f59e0b';
  const borderRadiusClass = 
    branding.borderRadius === 'none' ? 'rounded-none' :
    branding.borderRadius === 'sm' ? 'rounded-md' :
    branding.borderRadius === 'lg' ? 'rounded-xl' :
    branding.borderRadius === 'xl' ? 'rounded-2xl' :
    branding.borderRadius === '2xl' ? 'rounded-3xl' : 'rounded-lg';

  const handleInstanceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const email = authId.trim() || `${selectedAuthGroup}@${config.schoolSlug}.sch.ng`;
      await unifiedApiClient.loginSchool(
        config.instanceId,
        email,
        undefined,
        selectedAuthGroup as any
      );
      onEnterWorkspace();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateSections = (newSections: HomepageSectionConfig[]) => {
    const updated = { ...mutableConfig, sections: newSections };
    setMutableConfig(updated);
    if (onUpdateConfig) onUpdateConfig(updated);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mutableConfig.sections.length) return;
    const newSecs = [...mutableConfig.sections];
    const temp = newSecs[index];
    newSecs[index] = newSecs[targetIndex];
    newSecs[targetIndex] = temp;
    newSecs.forEach((s, idx) => { s.order = idx + 1; });
    handleUpdateSections(newSecs);
  };

  const handleToggleSection = (id: string) => {
    const newSecs = mutableConfig.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    handleUpdateSections(newSecs);
  };

  const handleAddPredefinedSection = (type: HomepageSectionType, title: string) => {
    const newSec: HomepageSectionConfig = {
      id: `sec_${type}_${Date.now()}`,
      type,
      title,
      subtitle: `New ${title} Module`,
      enabled: true,
      order: mutableConfig.sections.length + 1,
      content: {
        description: `Configured description for institutional ${title}.`,
        bulletPoints: ['Standard curriculum objective 1', 'Standard curriculum objective 2'],
        items: [
          { title: `${title} Item 1`, description: 'Description for item 1' },
          { title: `${title} Item 2`, description: 'Description for item 2' }
        ]
      }
    };
    const newSecs = [...mutableConfig.sections, newSec];
    handleUpdateSections(newSecs);
  };

  const enabledSections = mutableConfig.sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div 
      className="min-h-screen text-slate-100 antialiased selection:text-white"
      style={{
        backgroundColor: branding.backgroundColor || '#0a0e17',
        fontFamily: branding.typographyFace ? `"${branding.typographyFace}", sans-serif` : 'inherit',
        selectionBackgroundColor: primaryColor
      }}
    >
      {/* ADMIN HOMEPAGE CONTROL BAR */}
      {isAdminUser && (
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/30 px-4 py-2.5 flex items-center justify-between text-xs shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold rounded-full">
              Admin Homepage Mode
            </span>
            <span className="hidden sm:inline text-slate-300">Reorder sections and add Gallery or VideoHero modules.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSectionManagerOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Section Reorder & Add Manager</span>
            </button>
            {onOpenVisualEditor && (
              <button
                onClick={onOpenVisualEditor}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Visual Editor
              </button>
            )}
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {/* 1. INSTANCE CUSTOMIZED HEADER                                 */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-[#070A0F]/95 backdrop-blur-xl border-b border-slate-800/80 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`w-10 h-10 ${borderRadiusClass} flex items-center justify-center text-white shadow-md`}
              style={{ backgroundColor: primaryColor }}
            >
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.institutionName} className="w-7 h-7 object-contain" />
              ) : (
                <School className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{branding.institutionName}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 max-w-sm truncate">
                {branding.tagline}
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            {enabledSections.map(sec => (
              <a 
                key={sec.id} 
                href={`#${sec.id}`}
                className="hover:text-white transition-colors capitalize"
              >
                {sec.title}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAdminUser && onOpenVisualEditor && (
              <button
                onClick={onOpenVisualEditor}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Edit Homepage</span>
              </button>
            )}

            <a
              href="#portal-login"
              className="px-4 py-2 text-xs font-bold text-white border border-slate-700/80 hover:bg-slate-800/80 rounded-xl transition-all"
            >
              Portal Login
            </a>

            <button
              onClick={onEnterWorkspace}
              className={`px-4 py-2 text-xs font-bold text-white ${borderRadiusClass} shadow-lg transition-all flex items-center gap-1.5`}
              style={{ backgroundColor: primaryColor }}
            >
              <span>Launch School OS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. CUSTOMIZED HERO SECTION                                    */}
      {/* ------------------------------------------------------------- */}
      <section className="relative pt-16 pb-20 lg:pt-20 lg:pb-28 overflow-hidden border-b border-slate-800/80">
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${primaryColor}, transparent)`
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className={`${hero.showQuickAuthBox ? 'lg:col-span-7' : 'lg:col-span-12 text-center'} space-y-6`}>
              {hero.badgeText && (
                <div 
                  className="inline-flex items-center gap-2 text-xs font-bold tracking-wide"
                  style={{ color: accentColor }}
                >
                  <Award className="w-4 h-4" />
                  <span>{hero.badgeText}</span>
                  <span aria-hidden="true">·</span>
                  <span>ACCREDITED INSTITUTION</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] text-balance">
                {hero.headline}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                {hero.subheadline}
              </p>

              <div className={`pt-2 flex flex-wrap items-center gap-4 ${hero.showQuickAuthBox ? '' : 'justify-center'}`}>
                <button
                  onClick={onEnterWorkspace}
                  className={`px-6 py-3.5 text-sm font-bold text-white ${borderRadiusClass} shadow-xl transition-all flex items-center gap-2`}
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{hero.ctaPrimaryText || 'Student & Staff Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {hero.ctaSecondaryText && (
                  <a
                    href={hero.ctaSecondaryLink || '#sec_admissions'}
                    className={`px-6 py-3.5 text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 ${borderRadiusClass} transition-all`}
                  >
                    {hero.ctaSecondaryText}
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stakeholder Authentication Box */}
            {hero.showQuickAuthBox && (
              <div id="portal-login" className="lg:col-span-5">
                <div className={`bg-slate-900/95 border border-slate-800 ${borderRadiusClass} p-6 shadow-2xl backdrop-blur-md relative`}>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={`w-8 h-8 ${borderRadiusClass} flex items-center justify-center text-white`}
                        style={{ backgroundColor: primaryColor }}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{authPresentation.welcomeHeading}</h3>
                        <p className="text-[11px] text-slate-400">Institutional authenticated entrance</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleInstanceLogin} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Portal User Role
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B0F17] rounded-xl border border-slate-800 text-xs">
                        {authPresentation.enabledUserGroups.map(grp => (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => setSelectedAuthGroup(grp)}
                            className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center capitalize ${
                              selectedAuthGroup === grp 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {grp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Institutional ID / Student Number / Email
                      </label>
                      <input
                        type="text"
                        value={authId}
                        onChange={e => setAuthId(e.target.value)}
                        placeholder={`${selectedAuthGroup}@${config.schoolSlug}.sch.ng`}
                        className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className={`w-full py-2.5 text-white font-bold text-sm ${borderRadiusClass} shadow-lg transition-all flex items-center justify-center gap-2`}
                      style={{ backgroundColor: primaryColor }}
                    >
                      {authLoading ? (
                        <span>Validating Credentials...</span>
                      ) : (
                        <>
                          <span>Access {selectedAuthGroup.toUpperCase()} Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {authError && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 text-center">
                        {authError}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 text-center pt-2">
                      {authPresentation.welcomeSubtext}
                    </p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. DYNAMICALLY RENDERED SECTIONS                              */}
      {/* ------------------------------------------------------------- */}
      {enabledSections.map(sec => {
        if (sec.type === 'about') {
          return (
            <section key={sec.id} id={sec.id} className="py-16 border-b border-slate-800/80 bg-[#080C13]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                  {sec.content.description && (
                    <p className="mt-4 text-base text-slate-300 leading-relaxed">{sec.content.description}</p>
                  )}
                </div>

                {sec.content.bulletPoints && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {sec.content.bulletPoints.map((pt, idx) => (
                      <div key={idx} className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: accentColor }} />
                        <span className="text-sm text-slate-300">{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (sec.type === 'statistics') {
          return (
            <section key={sec.id} id={sec.id} className="py-14 border-b border-slate-800/80 bg-[#0A0F1A]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {sec.content.items?.map((st, idx) => (
                    <div key={idx} className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl text-center">
                      <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">{st.statValue}</p>
                      <p className="text-xs text-slate-400 mt-1">{st.statLabel || st.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'academics') {
          return (
            <section key={sec.id} id={sec.id} className="py-16 border-b border-slate-800/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sec.content.items?.map((item, idx) => (
                    <div key={idx} className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        {item.badge && (
                          <span 
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                            style={{ 
                              color: accentColor, 
                              borderColor: `${accentColor}40`,
                              backgroundColor: `${accentColor}10` 
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                        <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.description}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span>NERDC Aligned</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'admissions') {
          return (
            <section key={sec.id} id={sec.id} className="py-16 border-b border-slate-800/80 bg-[#080C13]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                  {sec.content.description && (
                    <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">{sec.content.description}</p>
                  )}
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sec.content.items?.map((step, idx) => (
                    <div key={idx} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white mb-4"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {idx + 1}
                      </div>
                      <h4 className="text-base font-bold text-white">{step.title}</h4>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'announcements') {
          return (
            <section key={sec.id} id={sec.id} className="py-16 border-b border-slate-800/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sec.content.items?.map((notice, idx) => (
                    <div key={idx} className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-white">{notice.badge || 'Official Notice'}</span>
                        <span>{notice.date}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{notice.title}</h4>
                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">{notice.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'portal_access') {
          return (
            <section key={sec.id} id={sec.id} className="py-16 border-b border-slate-800/80 bg-[#0A0F1A]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {sec.content.items?.map((portal, idx) => (
                    <div key={idx} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <h4 className="text-base font-bold text-white">{portal.title}</h4>
                        <p className="mt-2 text-xs text-slate-300 leading-relaxed">{portal.description}</p>
                      </div>
                      <button
                        onClick={onEnterWorkspace}
                        className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-white hover:underline"
                        style={{ color: accentColor }}
                      >
                        <span>Open Service</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'video_hero') {
          return (
            <section key={sec.id} id={sec.id} className="py-20 border-b border-slate-800/80 bg-gradient-to-b from-[#0A0F1A] to-[#070A0F]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{sec.subtitle || 'Virtual Campus Showcase'}</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{sec.title}</h2>
                {sec.content.description && (
                  <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">{sec.content.description}</p>
                )}
                <div className="max-w-4xl mx-auto aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/60 to-slate-950/40" />
                  <div className="relative z-10 w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-all scale-100 group-hover:scale-110 cursor-pointer">
                    <span className="text-2xl ml-1 font-bold">▶</span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-950/80 backdrop-blur px-4 py-3 rounded-2xl border border-slate-800">
                    <span>{branding.institutionName} — Campus Walkthrough & Facilities</span>
                    <span className="text-emerald-400">HD 1080p • 60 FPS</span>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (sec.type === 'gallery') {
          return (
            <section key={sec.id} id={sec.id} className="py-20 border-b border-slate-800/80 bg-[#080C13]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mb-12">
                  {sec.subtitle && (
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      {sec.subtitle}
                    </p>
                  )}
                  <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">{sec.title}</h2>
                  {sec.content.description && (
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">{sec.content.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(sec.content.items || [
                    { title: 'Advanced Science Laboratory', description: 'Fully equipped physics, chemistry, and biology experimental stations.', imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80' },
                    { title: 'ICT & Computer Center', description: 'High-speed fiber connectivity with 120 dedicated student workstations.', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80' },
                    { title: 'Olympic Sports Pavilion', description: 'Football pitch, synthetic basketball courts, and athletics running track.', imageUrl: 'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?auto=format&fit=crop&w=600&q=80' },
                    { title: 'Digital Resource Library', description: 'Over 25,000 curriculum textbooks, journals, and quiet study carrels.', imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80' }
                  ]).map((gal, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden group shadow-lg">
                      <div className="aspect-video bg-slate-950 overflow-hidden relative">
                        <img 
                          src={gal.imageUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80'} 
                          alt={gal.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      </div>
                      <div className="p-4 space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{gal.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{gal.description || 'State-of-the-art campus facility supporting student excellence.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* ADMIN SECTION REORDER & ADD MODAL */}
      {isSectionManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Homepage Section Manager</h3>
                <p className="text-xs text-slate-400">Reorder sections, toggle visibility, or add predefined components ('Gallery', 'VideoHero').</p>
              </div>
              <button onClick={() => setIsSectionManagerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Current Sections</span>
              {mutableConfig.sections.map((sec, idx) => (
                <div key={sec.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-mono text-slate-400">{sec.order}</span>
                    <div>
                      <span className="text-xs font-bold text-white">{sec.title}</span>
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">{sec.type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSection(sec.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${sec.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {sec.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => handleMoveSection(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-xs cursor-pointer"
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveSection(idx, 'down')}
                      disabled={idx === mutableConfig.sections.length - 1}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-xs cursor-pointer"
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Add Predefined Section Type</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleAddPredefinedSection('gallery', 'Campus Photo Gallery')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>+ Gallery Grid</span>
                </button>
                <button
                  onClick={() => handleAddPredefinedSection('video_hero', 'Immersive Video Showcase')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-cyan-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>+ Video Hero</span>
                </button>
                <button
                  onClick={() => handleAddPredefinedSection('features', 'Key Institutional Features')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-indigo-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>+ Features Grid</span>
                </button>
                <button
                  onClick={() => handleAddPredefinedSection('events', 'Upcoming School Events')}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>+ Events Section</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsSectionManagerOpen(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Done & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. INSTANCE FOOTER                                            */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-[#05070B] py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <School className="w-4 h-4" style={{ color: accentColor }} />
              <span>{branding.institutionName}</span>
            </div>
            <p className="mt-3 leading-relaxed max-w-sm">
              {branding.tagline}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Provisioned Sovereign Academic Instance on Curriculum Server.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Institutional Contact</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{contact.addressText}, {contact.city}, {contact.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{contact.primaryEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{contact.primaryPhone}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Portal Services</h4>
            <ul className="space-y-2">
              <li><button onClick={onEnterWorkspace} className="hover:text-white transition-colors">Staff & Teacher Workspace</button></li>
              <li><button onClick={onEnterWorkspace} className="hover:text-white transition-colors">Student Broadsheet Terminal</button></li>
              <li><button onClick={onEnterWorkspace} className="hover:text-white transition-colors">Parent Fee Settlement</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>{contact.copyrightText || `© ${new Date().getFullYear()} ${branding.institutionName}. All rights reserved.`}</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Template: {config.templateId}</span>
            <span aria-hidden="true">·</span>
            <span>Version v{config.versionNumber}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
