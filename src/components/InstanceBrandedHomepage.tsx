

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
  Image as ImageIcon,
  GripVertical,
  Download,
  Share2,
  Settings,
  Edit3,
  Check,
  X,
  Play,
  QrCode,
  Printer,
  Loader2
} from 'lucide-react';
import { unifiedApiClient } from '../services/unifiedApiClient';
import { InstallShareModal } from './InstallShareModal';
import { instancePaymentClient } from '../services/instancePaymentClient';

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
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAdmissionsModalOpen, setIsAdmissionsModalOpen] = useState(false);
  const [isFeesModalOpen, setIsFeesModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCbtModalOpen, setIsCbtModalOpen] = useState(false);

  const [applicantName, setApplicantName] = useState('');
  const [applicantGrade, setApplicantGrade] = useState('JSS 1');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [admissionSuccessId, setAdmissionSuccessId] = useState<string | null>(null);

  // Payment Flow State for Instance Services
  const [selectedGateway, setSelectedGateway] = useState<'paystack' | 'opay' | 'flutterwave' | 'bank_wire'>('paystack');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [admissionReceipt, setAdmissionReceipt] = useState<any | null>(null);

  // Tuition Fee Checkout State
  const [feeStudentAdmNo, setFeeStudentAdmNo] = useState('ACC/2026/0142');
  const [feePayerName, setFeePayerName] = useState('Dr. Kunle Adebayo');
  const [feePayerEmail, setFeePayerEmail] = useState('adebayo.parent@gmail.com');
  const [feeTranche, setFeeTranche] = useState<'tranche_1' | 'full'>('tranche_1');
  const [tuitionReceipt, setTuitionReceipt] = useState<any | null>(null);
  const [isTuitionCheckoutMode, setIsTuitionCheckoutMode] = useState(false);

  // CBT Exam Pass Checkout State
  const [cbtCandidateName, setCbtCandidateName] = useState('Babajide Ogundimu');
  const [cbtCandidateEmail, setCbtCandidateEmail] = useState('candidate.waec@gmail.com');
  const [cbtPassReceipt, setCbtPassReceipt] = useState<any | null>(null);
  const [isCbtCheckoutMode, setIsCbtCheckoutMode] = useState(false);

  const [cbtAnswer, setCbtAnswer] = useState<string | null>(null);
  const [cbtSubmitted, setCbtSubmitted] = useState(false);

  // Feature Test Bench State
  const [activeFeatureTest, setActiveFeatureTest] = useState<'none' | 'exam_gen' | 'lesson_approval' | 'vault_storage' | 'attendance' | 'fees_payment'>('none');
  const [testSubject, setTestSubject] = useState('General Mathematics');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [isTestGenerating, setIsTestGenerating] = useState(false);
  const [lessonNoteStatus, setLessonNoteStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  const [vaultBackups, setVaultBackups] = useState([
    { id: 'bak_001', name: 'Sovereign_Database_Full_Snapshot.enc', size: '42.8 MB', timestamp: 'Today, 04:00 UTC', status: 'Encrypted & Verified' }
  ]);
  const [attendanceLogs, setAttendanceLogs] = useState([
    { name: 'Oluwaseun Adeleke (SS 2 Science)', time: '07:45 AM', gate: 'Gate A (Main RFID)', status: 'On Time' }
  ]);
  const [feeAmount, setFeeAmount] = useState('230000');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoPosterUrl, setEditVideoPosterUrl] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

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

  const handleReorderSections = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= mutableConfig.sections.length || targetIndex >= mutableConfig.sections.length) return;
    const newSecs = [...mutableConfig.sections];
    const [movedItem] = newSecs.splice(sourceIndex, 1);
    newSecs.splice(targetIndex, 0, movedItem);
    newSecs.forEach((s, idx) => { s.order = idx + 1; });
    handleUpdateSections(newSecs);
  };

  const handleToggleSection = (id: string) => {
    const newSecs = mutableConfig.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    handleUpdateSections(newSecs);
  };

  const handleDeleteSection = (id: string) => {
    const newSecs = mutableConfig.sections.filter(s => s.id !== id);
    newSecs.forEach((s, idx) => { s.order = idx + 1; });
    handleUpdateSections(newSecs);
    if (editingSectionId === id) {
      setEditingSectionId(null);
    }
  };

  const getEmbedVideoInfo = (rawUrl?: string): { isEmbed: boolean; url: string; platform: 'youtube' | 'vimeo' | 'direct' } | null => {
    if (!rawUrl || !rawUrl.trim()) return null;
    const trimmed = rawUrl.trim();
    // YouTube detection
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return { isEmbed: true, url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`, platform: 'youtube' };
    }
    // Vimeo detection
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch) {
      return { isEmbed: true, url: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`, platform: 'vimeo' };
    }
    return { isEmbed: false, url: trimmed, platform: 'direct' };
  };

  const handleStartEditSection = (sec: HomepageSectionConfig) => {
    if (editingSectionId === sec.id) {
      setEditingSectionId(null);
    } else {
      setEditingSectionId(sec.id);
      setEditTitle(sec.title);
      setEditSubtitle(sec.subtitle || '');
      setEditDescription(sec.content.description || '');
      setEditVideoUrl(sec.content.videoUrl || '');
      setEditVideoPosterUrl(sec.content.videoPosterUrl || '');
    }
  };

  const handleSaveSectionSettings = (id: string) => {
    const newSecs = mutableConfig.sections.map(s => {
      if (s.id === id) {
        return {
          ...s,
          title: editTitle.trim() || s.title,
          subtitle: editSubtitle.trim(),
          content: {
            ...s.content,
            description: editDescription.trim(),
            videoUrl: editVideoUrl.trim() || undefined,
            videoPosterUrl: editVideoPosterUrl.trim() || undefined
          }
        };
      }
      return s;
    });
    handleUpdateSections(newSecs);
    setEditingSectionId(null);
  };

  const handleAddPredefinedSection = (type: HomepageSectionType, title: string) => {
    const isVideo = type === 'video_hero';
    const newSec: HomepageSectionConfig = {
      id: `sec_${type}_${Date.now()}`,
      type,
      title,
      subtitle: isVideo ? 'Virtual Campus Showcase' : `New ${title} Module`,
      enabled: true,
      order: mutableConfig.sections.length + 1,
      content: {
        description: isVideo 
          ? 'Explore our modern academic facilities, laboratories, and campus grounds through this high-definition video walkthrough.'
          : `Configured description for institutional ${title}.`,
        videoUrl: isVideo ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' : undefined,
        videoPosterUrl: isVideo ? 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80' : undefined,
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

          <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-slate-300">
            <button onClick={() => setIsAdmissionsModalOpen(true)} className="hover:text-white transition-colors cursor-pointer text-emerald-400 font-bold">Admissions</button>
            <button onClick={() => setIsFeesModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">Fee Schedule</button>
            <button onClick={() => setIsCalendarModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">Calendar</button>
            <button onClick={() => setIsCbtModalOpen(true)} className="hover:text-white transition-colors cursor-pointer text-teal-400 font-bold">CBT Demo</button>
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

            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 rounded-xl transition-all cursor-pointer shadow-sm"
              title="Download Self-Installing PWA & Shareable Link"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App & Share</span>
            </button>

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
        {/* Optional Custom Hero Video Loop Banner */}
        {hero.backgroundVideoUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-25"
              src={hero.backgroundVideoUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/85 to-[#0a0e17]/60" />
          </div>
        )}

        <div 
          className="absolute inset-0 pointer-events-none opacity-20 z-0"
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

                <button
                  onClick={() => setIsInstallModalOpen(true)}
                  className={`px-6 py-3.5 text-sm font-semibold bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 ${borderRadiusClass} transition-all flex items-center gap-2 cursor-pointer shadow-lg`}
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Self-Installing PWA & Share Link</span>
                </button>
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
          const videoInfo = getEmbedVideoInfo(sec.content.videoUrl);
          const isPlaying = playingVideoId === sec.id;
          const displayVideoUrl = sec.content.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          const posterUrl = sec.content.videoPosterUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';

          return (
            <section key={sec.id} id={sec.id} className="py-20 border-b border-slate-800/80 bg-gradient-to-b from-[#0A0F1A] to-[#070A0F] relative">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{sec.subtitle || 'Virtual Campus Showcase'}</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{sec.title}</h2>
                {sec.content.description && (
                  <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">{sec.content.description}</p>
                )}

                {/* Video Player / Showcase Container */}
                <div className="max-w-4xl mx-auto aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center group">
                  {isPlaying && videoInfo ? (
                    videoInfo.isEmbed ? (
                      <iframe
                        src={videoInfo.url}
                        title={sec.title}
                        className="w-full h-full border-0 rounded-3xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover rounded-3xl"
                        poster={posterUrl}
                        src={videoInfo.url}
                      />
                    )
                  ) : (
                    <>
                      <img
                        src={posterUrl}
                        alt={sec.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-950/40 to-emerald-950/40" />
                      
                      <button
                        onClick={() => {
                          setPlayingVideoId(sec.id);
                        }}
                        className="relative z-10 w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-all scale-100 group-hover:scale-110 cursor-pointer"
                        title="Play Campus Tour Video"
                      >
                        <Play className="w-8 h-8 ml-1 fill-white" />
                      </button>

                      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono bg-slate-950/90 backdrop-blur px-4 py-3 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 truncate">
                          <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{branding.institutionName} — {sec.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-emerald-400 font-semibold">
                            {videoInfo?.platform === 'youtube' ? 'YouTube 4K' : videoInfo?.platform === 'vimeo' ? 'Vimeo HD' : 'HD 1080p MP4'}
                          </span>
                          {isAdminUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSectionManagerOpen(true);
                                handleStartEditSection(sec);
                              }}
                              className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-[10px] rounded-lg transition-all"
                            >
                              Edit Video URL
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Video URL Meta & Configuration Bar */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="text-[11px] font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-300 flex items-center gap-1.5">
                    <Video className="w-3 h-3 text-cyan-400" />
                    <span>Configured Video URL:</span>
                    <span className="text-cyan-300 font-medium truncate max-w-xs">{displayVideoUrl}</span>
                  </span>
                  {isAdminUser && (
                    <button
                      onClick={() => {
                        setIsSectionManagerOpen(true);
                        handleStartEditSection(sec);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                    >
                      Change Custom Video URL
                    </button>
                  )}
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Current Sections ({mutableConfig.sections.length})</span>
                <span className="text-[11px] text-slate-400">Drag & drop rows to reorder • Edit titles or remove sections</span>
              </div>
              {mutableConfig.sections.map((sec, idx) => {
                const isDragging = draggedSectionIndex === idx;
                const isOver = dragOverSectionIndex === idx && draggedSectionIndex !== idx;
                const isEditing = editingSectionId === sec.id;

                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl border transition-all ${
                      isDragging ? 'opacity-40 border-purple-500 scale-[0.99] bg-purple-950/20' :
                      isOver ? 'border-emerald-400 bg-emerald-950/25 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/50' :
                      'bg-slate-950 border-slate-800'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSectionIndex !== idx) {
                        setDragOverSectionIndex(idx);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverSectionIndex === idx) {
                        setDragOverSectionIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIdxStr = e.dataTransfer.getData('text/plain');
                      if (sourceIdxStr !== '') {
                        const sourceIdx = parseInt(sourceIdxStr, 10);
                        handleReorderSections(sourceIdx, idx);
                      }
                      setDraggedSectionIndex(null);
                      setDragOverSectionIndex(null);
                    }}
                  >
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', idx.toString());
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedSectionIndex(idx);
                          }}
                          onDragEnd={() => {
                            setDraggedSectionIndex(null);
                            setDragOverSectionIndex(null);
                          }}
                          className="text-slate-500 hover:text-slate-200 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Drag to reorder section"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-mono text-slate-400 border border-slate-800 shrink-0">
                          {sec.order}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{sec.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase font-mono">{sec.type}</span>
                          </div>
                          {sec.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{sec.subtitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Edit Settings Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditSection(sec)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            isEditing 
                              ? 'bg-purple-600 text-white shadow-sm' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                          title="Edit section title and subtitle"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isEditing ? 'Close' : 'Edit Settings'}</span>
                        </button>

                        {/* Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleSection(sec.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            sec.enabled 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title={sec.enabled ? 'Section is visible on homepage' : 'Section is hidden'}
                        >
                          {sec.enabled ? 'Enabled' : 'Disabled'}
                        </button>

                        {/* Move Up/Down buttons (fallback controls) */}
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Move Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'down')}
                          disabled={idx === mutableConfig.sections.length - 1}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Move Down"
                        >
                          ↓
                        </button>

                        {/* Delete (Trash) Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 hover:border-rose-700/60 border border-slate-700 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-menu for Updating Section Title and Subtitle */}
                    {isEditing && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/60 rounded-b-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Settings className="w-3 h-3" />
                            <span>Edit Section Settings</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {sec.id}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Section Title
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="e.g., Campus Photo Gallery"
                              className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Section Subtitle
                            </label>
                            <input
                              type="text"
                              value={editSubtitle}
                              onChange={(e) => setEditSubtitle(e.target.value)}
                              placeholder="e.g., Vibrant Learning Environments"
                              className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* VideoHero specific configuration fields */}
                        {sec.type === 'video_hero' && (
                          <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                              <Video className="w-3.5 h-3.5" />
                              <span>Custom Video Player Configuration</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                  Custom Video URL (YouTube, Vimeo, or direct MP4/WebM)
                                </label>
                                <input
                                  type="text"
                                  value={editVideoUrl}
                                  onChange={(e) => setEditVideoUrl(e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=... or .mp4 link"
                                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Supports YouTube watch/embed links, Vimeo links, and raw MP4 video streams.
                                </p>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                  Video Poster / Thumbnail Image URL
                                </label>
                                <input
                                  type="text"
                                  value={editVideoPosterUrl}
                                  onChange={(e) => setEditVideoPosterUrl(e.target.value)}
                                  placeholder="https://images.unsplash.com/... or thumbnail link"
                                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Displayed before playback begins or when video is paused.
                                </p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Section Description / Narrative
                              </label>
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={2}
                                placeholder="Describe what viewers will experience in this video showcase..."
                                className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSectionId(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSectionSettings(sec.id)}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Settings</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
      {/* 3B. VISITOR FEATURE TEST BENCH                                */}
      {/* ------------------------------------------------------------- */}
      <section className="py-20 border-b border-slate-800/80 bg-gradient-to-b from-[#070A0F] to-[#0A0F1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Functional Demonstration</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Test Core Workflows & Engines</h2>
            <p className="text-sm text-slate-300">
              Visitors can test exam question generation, vault storage backups, lesson note approval chains, biometric gate attendance, and bursary payment splits directly below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Exam Question Generation */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-emerald-500/40 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">AI Exam Question Generator</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test the Gemini AI question generation engine aligned with NERDC curriculum standards.
                </p>
              </div>
              <button
                onClick={() => setActiveFeatureTest('exam_gen')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Test Question Generator
              </button>
            </div>

            {/* 2. Lesson Note Approval Chain */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-indigo-500/40 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Lesson Note Approval Chain</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simulate teacher submission and principal review/approval workflow for instructional notes.
                </p>
              </div>
              <button
                onClick={() => setActiveFeatureTest('lesson_approval')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Test Approval Workflow
              </button>
            </div>

            {/* 3. Encrypted Vault Storage */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-purple-500/40 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Encrypted Vault Storage</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test sovereign backup snapshots, checksum verification, and disaster recovery storage vaults.
                </p>
              </div>
              <button
                onClick={() => setActiveFeatureTest('vault_storage')}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Test Vault Storage
              </button>
            </div>

            {/* 4. Biometric Attendance Gate */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-amber-500/40 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Biometric Attendance Logs</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simulate RFID gate check-ins and real-time student presence record keeping.
                </p>
              </div>
              <button
                onClick={() => setActiveFeatureTest('attendance')}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Test Attendance Gate
              </button>
            </div>

            {/* 5. Bursary Fee Split & Payment */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-teal-500/40 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Bursary Fee & Payment Flow</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test termly fee settlement and automated PSP multi-split distribution across accounts.
                </p>
              </div>
              <button
                onClick={() => setActiveFeatureTest('fees_payment')}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Test Payment Split
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Test Modals */}
      {activeFeatureTest === 'exam_gen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">AI Exam Question Generator Simulator</h3>
              </div>
              <button onClick={() => { setActiveFeatureTest('none'); setGeneratedQuestions(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Select Subject & Curriculum Topic</label>
                <select
                  value={testSubject}
                  onChange={e => setTestSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="General Mathematics">General Mathematics (Quadratic Equations)</option>
                  <option value="Civic Education">Civic Education (Fundamental Human Rights)</option>
                  <option value="Biology">Biology (Cellular Respiration & Enzymes)</option>
                  <option value="English Language">English Language (Lexis & Structure)</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  setIsTestGenerating(true);
                  try {
                    const res = await fetch('/api/v1/question-bank/generate-objective', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subjectName: testSubject, classGrade: 'SS 2', count: 2 })
                    });
                    const data = await res.json();
                    if (data.success && data.questions) {
                      setGeneratedQuestions(data.questions);
                    } else {
                      setGeneratedQuestions([
                        {
                          stem: `Which of the following is the primary NERDC curriculum objective for ${testSubject}?`,
                          options: { A: 'Mastery of fundamental principles', B: 'Rote memorization only', C: 'Tax evasion procedures', D: 'Manual typewriter operation' },
                          correctOption: 'A',
                          pedagogicalExplanation: 'Curriculum objective focuses on conceptual mastery and application.'
                        }
                      ]);
                    }
                  } catch {
                    setGeneratedQuestions([
                      {
                        stem: `Sample objective question for ${testSubject} under NERDC 2026 standards.`,
                        options: { A: 'Option Alpha', B: 'Option Beta', C: 'Option Gamma', D: 'Option Delta' },
                        correctOption: 'A',
                        pedagogicalExplanation: 'Verified correct option with pedagogical reasoning.'
                      }
                    ]);
                  } finally {
                    setIsTestGenerating(false);
                  }
                }}
                disabled={isTestGenerating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isTestGenerating ? <span>Generating AI Questions...</span> : <span>Generate AI Question Paper Now</span>}
              </button>

              {generatedQuestions && (
                <div className="space-y-3 pt-2">
                  <span className="font-bold text-emerald-400 block">Generated Questions ({generatedQuestions.length}):</span>
                  {generatedQuestions.map((q, i) => (
                    <div key={i} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <p className="font-semibold text-white">Q{i+1}: {q.stem}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        {Object.entries(q.options || {}).map(([k, v]) => (
                          <div key={k} className={`p-1.5 rounded-lg border ${k === q.correctOption ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800'}`}>
                            {k}: {String(v)}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Explanation: {q.pedagogicalExplanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeFeatureTest === 'lesson_approval' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Lesson Note Approval Simulator</h3>
              </div>
              <button onClick={() => setActiveFeatureTest('none')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between font-bold text-white">
                  <span>Subject: General Mathematics (SS 2)</span>
                  <span className={lessonNoteStatus === 'approved' ? 'text-emerald-400' : lessonNoteStatus === 'revision' ? 'text-rose-400' : 'text-amber-400'}>
                    Status: {lessonNoteStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-300">Topic: Factorization of Quadratic Expressions where coefficient a &gt; 1.</p>
                <p className="text-[11px] text-slate-400">Teacher: Mr. Babatunde Ogunlesi • Submitted for Principal Review</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLessonNoteStatus('approved')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  Approve Lesson Note
                </button>
                <button
                  onClick={() => setLessonNoteStatus('revision')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  Request Revision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFeatureTest === 'vault_storage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Sovereign Vault Storage & Backups</h3>
              </div>
              <button onClick={() => setActiveFeatureTest('none')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                {vaultBackups.map((bak, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white font-mono text-[11px]">{bak.name}</p>
                      <p className="text-[10px] text-slate-400">{bak.size} • {bak.timestamp}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 font-bold text-[10px]">
                      {bak.status}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const newBak = {
                    id: `bak_00${vaultBackups.length + 1}`,
                    name: `Sovereign_Snapshot_${new Date().toISOString().slice(0,10)}.enc`,
                    size: '43.1 MB',
                    timestamp: 'Just now',
                    status: 'Encrypted & Verified'
                  };
                  setVaultBackups([newBak, ...vaultBackups]);
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer"
              >
                Create Instant Encrypted Snapshot Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {activeFeatureTest === 'attendance' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Biometric & RFID Attendance Gate</h3>
              </div>
              <button onClick={() => setActiveFeatureTest('none')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {attendanceLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{log.name}</p>
                      <p className="text-[10px] text-slate-400">{log.gate} at {log.time}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const names = ['Amina Bello (SS 1 Arts)', 'Chinedu Okafor (JSS 3)', 'Fatima Garba (SS 3 Science)'];
                  const randomName = names[Math.floor(Math.random() * names.length)];
                  const newLog = { name: randomName, time: new Date().toLocaleTimeString(), gate: 'Gate B (Secondary Wing)', status: 'On Time' };
                  setAttendanceLogs([newLog, ...attendanceLogs]);
                }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl cursor-pointer"
              >
                Simulate RFID Check-In Tap
              </button>
            </div>
          </div>
        </div>
      )}

      {activeFeatureTest === 'fees_payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Bursary Fee & PSP Multi-Split</h3>
              </div>
              <button onClick={() => { setActiveFeatureTest('none'); setPaymentSuccess(false); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {paymentSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Payment Settled & Automated Multi-Split Successful!</h4>
                <p className="text-xs text-slate-300">₦{Number(feeAmount).toLocaleString()} successfully processed and distributed across Tuition, ICT, and Sports accounts.</p>
                <button
                  onClick={() => { setActiveFeatureTest('none'); setPaymentSuccess(false); }}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Termly Settlement Amount (₦)</label>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={e => setFeeAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                  <p className="font-bold text-white">Automated Split Rule:</p>
                  <p>• Tuition Account (70%): ₦{(Number(feeAmount) * 0.7).toLocaleString()}</p>
                  <p>• ICT Development (20%): ₦{(Number(feeAmount) * 0.2).toLocaleString()}</p>
                  <p>• Sports & Maintenance (10%): ₦{(Number(feeAmount) * 0.1).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setPaymentSuccess(true)}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Simulate Secure Payment & Split
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
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

      {/* Admissions Application Modal */}
      {isAdmissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Online Admissions Application</h3>
              </div>
              <button onClick={() => setIsAdmissionsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {admissionReceipt ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-800/40">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payment Verified & Application Received</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                      OFFICIAL E-RECEIPT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Receipt Number</span>
                      <strong className="text-white font-mono">{admissionReceipt.receiptNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Applicant Name</span>
                      <strong className="text-white">{admissionReceipt.payerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Class Applied</span>
                      <strong className="text-emerald-400">{admissionReceipt.targetClass || applicantGrade}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Amount Settled</span>
                      <strong className="text-white font-mono">₦{admissionReceipt.amountPaidNGN?.toLocaleString()}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">PSP Transaction Reference</span>
                      <strong className="text-slate-300 font-mono text-[10px] truncate block">{admissionReceipt.transactionReference}</strong>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tamper-Evident Security QR Code Hash</span>
                    </div>
                    <div className="font-mono text-[10px] text-cyan-300 break-all">
                      {admissionReceipt.qrVerificationCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setAdmissionReceipt(null); 
                      setAdmissionSuccessId(null); 
                      setIsAdmissionsModalOpen(false); 
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsProcessingPayment(true);
                try {
                  const instId = config.schoolSlug || 'apex_comp_college';
                  const init = await instancePaymentClient.initializePayment(instId, {
                    feeCategory: 'admissions_application',
                    amountNGN: 15000,
                    payerEmail: guardianEmail,
                    payerName: applicantName,
                    targetClass: applicantGrade,
                    provider: selectedGateway
                  });

                  const verify = await instancePaymentClient.verifyPayment(instId, {
                    reference: init.reference,
                    provider: selectedGateway,
                    amountNGN: 15000,
                    feeCategory: 'admissions_application',
                    payerName: applicantName,
                    payerEmail: guardianEmail,
                    targetClass: applicantGrade
                  });

                  setAdmissionReceipt(verify.transaction);
                  setAdmissionSuccessId(verify.transaction.receiptNumber);
                } catch (err: any) {
                  alert(`Payment error: ${err.message}`);
                } finally {
                  setIsProcessingPayment(false);
                }
              }} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Applicant Full Name</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={e => setApplicantName(e.target.value)}
                    placeholder="e.g., Oluwaseun Adeleke"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Class Grade</label>
                  <select
                    value={applicantGrade}
                    onChange={e => setApplicantGrade(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="JSS 1">JSS 1 (Basic 7)</option>
                    <option value="JSS 2">JSS 2 (Basic 8)</option>
                    <option value="JSS 3">JSS 3 (Basic 9)</option>
                    <option value="SS 1">SS 1 (Senior 1)</option>
                    <option value="SS 2">SS 2 (Senior 2)</option>
                    <option value="SS 3">SS 3 (Senior 3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Parent / Guardian Email</label>
                  <input
                    type="email"
                    required
                    value={guardianEmail}
                    onChange={e => setGuardianEmail(e.target.value)}
                    placeholder="guardian@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Integrated Payment Rail Selector */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Application Screening Fee</span>
                    <strong className="text-emerald-400 font-mono text-sm">₦15,000</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { id: 'paystack' as const, label: 'Paystack (Card/USSD)', sub: 'Instant' },
                      { id: 'opay' as const, label: 'OPay Virtual NUBAN', sub: 'Zero Fee' },
                      { id: 'flutterwave' as const, label: 'Flutterwave Switch', sub: 'Cards' },
                      { id: 'bank_wire' as const, label: 'Direct Bank Wire', sub: 'NIBSS Instant' }
                    ].map(g => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setSelectedGateway(g.id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedGateway === g.id
                            ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] leading-tight">{g.label}</div>
                        <div className="text-[9px] text-slate-500">{g.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment & Generating ID...</span>
                    </>
                  ) : (
                    <span>Pay ₦15,000 & Submit Application</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Fee Schedule & Online Settlement Modal */}
      {isFeesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">2026/2027 Term 1 Fee Schedule & Checkout</h3>
              </div>
              <button 
                onClick={() => { 
                  setIsFeesModalOpen(false); 
                  setIsTuitionCheckoutMode(false); 
                  setTuitionReceipt(null); 
                }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tuitionReceipt ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-800/40">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Term Tuition Settled & Verified</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                      OFFICIAL STUDENT E-RECEIPT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Receipt Number</span>
                      <strong className="text-white font-mono">{tuitionReceipt.receiptNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Student Admission No</span>
                      <strong className="text-emerald-400 font-mono">{tuitionReceipt.admissionNumber || feeStudentAdmNo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Payer Name</span>
                      <strong className="text-white">{tuitionReceipt.payerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Amount Settled</span>
                      <strong className="text-white font-mono">₦{tuitionReceipt.amountPaidNGN?.toLocaleString()}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Payment Rail</span>
                      <span className="text-slate-300 uppercase font-mono">{tuitionReceipt.provider} Gateway</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tamper-Evident Security Hash</span>
                    </div>
                    <div className="font-mono text-[10px] text-cyan-300 break-all">
                      {tuitionReceipt.qrVerificationCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setTuitionReceipt(null); 
                      setIsTuitionCheckoutMode(false); 
                      setIsFeesModalOpen(false); 
                    }}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : isTuitionCheckoutMode ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsProcessingPayment(true);
                try {
                  const instId = config.schoolSlug || 'apex_comp_college';
                  const amount = feeTranche === 'tranche_1' ? 115000 : 230000;
                  const init = await instancePaymentClient.initializePayment(instId, {
                    feeCategory: 'tuition',
                    amountNGN: amount,
                    payerEmail: feePayerEmail,
                    payerName: feePayerName,
                    admissionNumber: feeStudentAdmNo,
                    targetClass: 'SS 2',
                    provider: selectedGateway,
                    term: 'Term 1'
                  });

                  const verify = await instancePaymentClient.verifyPayment(instId, {
                    reference: init.reference,
                    provider: selectedGateway,
                    amountNGN: amount,
                    feeCategory: 'tuition',
                    payerName: feePayerName,
                    payerEmail: feePayerEmail,
                    admissionNumber: feeStudentAdmNo,
                    targetClass: 'SS 2'
                  });

                  setTuitionReceipt(verify.transaction);
                } catch (err: any) {
                  alert(`Payment error: ${err.message}`);
                } finally {
                  setIsProcessingPayment(false);
                }
              }} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Student Admission No</label>
                    <input
                      type="text"
                      required
                      value={feeStudentAdmNo}
                      onChange={e => setFeeStudentAdmNo(e.target.value)}
                      placeholder="e.g., ACC/2026/0142"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Payer Name</label>
                    <input
                      type="text"
                      required
                      value={feePayerName}
                      onChange={e => setFeePayerName(e.target.value)}
                      placeholder="Parent / Guardian Name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Parent Email for E-Receipt</label>
                  <input
                    type="email"
                    required
                    value={feePayerEmail}
                    onChange={e => setFeePayerEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Tranche Selection */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">Select Settlement Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeeTranche('tranche_1')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        feeTranche === 'tranche_1'
                          ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px]">Tranche 1 (50% Resumption)</div>
                      <div className="text-purple-400 font-mono font-bold text-sm mt-0.5">₦115,000</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeTranche('full')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        feeTranche === 'full'
                          ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px]">Full Term Settlement (100%)</div>
                      <div className="text-purple-400 font-mono font-bold text-sm mt-0.5">₦230,000</div>
                    </button>
                  </div>
                </div>

                {/* Payment Gateway Selector */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">Choose Payment Rail</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'paystack' as const, label: 'Paystack (Card/USSD)', sub: 'Instant Clearance' },
                      { id: 'opay' as const, label: 'OPay Dedicated NUBAN', sub: 'Zero Surcharge' },
                      { id: 'flutterwave' as const, label: 'Flutterwave Switch', sub: 'Mastercard/Visa' },
                      { id: 'bank_wire' as const, label: 'Direct Bank Wire', sub: 'Zenith Bank' }
                    ].map(g => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setSelectedGateway(g.id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedGateway === g.id
                            ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] leading-tight">{g.label}</div>
                        <div className="text-[9px] text-slate-500">{g.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTuitionCheckoutMode(false)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Clearing Payment & Issuing Receipt...</span>
                      </>
                    ) : (
                      <span>Pay ₦{feeTranche === 'tranche_1' ? '115,000' : '230,000'} Online Now</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>Tuition & Academic Development</span>
                    <strong className="text-white font-mono">₦125,000</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>ICT & Computer Laboratory Levy</span>
                    <strong className="text-white font-mono">₦25,000</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>Sports, Library & Extra-Curricular</span>
                    <strong className="text-white font-mono">₦15,000</strong>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>Boarding & Catering (Optional)</span>
                    <strong className="text-white font-mono">₦65,000</strong>
                  </div>
                  <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-indigo-800/60 flex items-center justify-between text-indigo-300 font-bold">
                    <span>Total Termly Settlement</span>
                    <strong className="font-mono text-white text-sm">₦230,000</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTuitionCheckoutMode(true)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Online (Installment / Full)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFeesModalOpen(false)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Academic Calendar Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Academic Calendar — 2026/2027</h3>
              </div>
              <button onClick={() => setIsCalendarModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Term 1 Resumption & Lectures</span>
                  <span className="text-emerald-400">Sep 14, 2026 - Dec 18, 2026</span>
                </div>
                <p className="text-[11px] text-slate-400">Includes mid-term break (Oct 26-30) and terminal examinations (Dec 7-16).</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Term 2 Resumption</span>
                  <span className="text-blue-400">Jan 11, 2027 - Apr 09, 2027</span>
                </div>
                <p className="text-[11px] text-slate-400">Sports festival, science fair, and continuous assessment tests.</p>
              </div>
            </div>
            <button
              onClick={() => setIsCalendarModalOpen(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close Calendar
            </button>
          </div>
        </div>
      )}

      {/* CBT Demo Test Modal */}
      {isCbtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">CBT Secure Exam Kiosk Demo</h3>
              </div>
              <button onClick={() => { setIsCbtModalOpen(false); setCbtSubmitted(false); setCbtAnswer(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {cbtPassReceipt ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-teal-950/40 border border-teal-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-teal-800/40">
                    <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CBT All-Access Pass Activated</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/60 text-teal-300">
                      EXAM PASS CERTIFIED
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-teal-500/30 text-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Your Candidate Kiosk Access Token</span>
                    <div className="text-lg font-mono font-bold text-teal-300 tracking-wider">
                      {cbtPassReceipt.cbtPassToken}
                    </div>
                    <p className="text-[10px] text-slate-400">Use this token to unlock WAEC, JAMB, NECO mock sessions on any CBT terminal.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Receipt Number</span>
                      <strong className="text-white font-mono">{cbtPassReceipt.receiptNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Candidate Name</span>
                      <strong className="text-white">{cbtPassReceipt.payerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Amount Settled</span>
                      <strong className="text-white font-mono">₦{cbtPassReceipt.amountPaidNGN?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rail</span>
                      <span className="text-teal-400 font-mono uppercase">{cbtPassReceipt.provider}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tamper-Evident Security Hash</span>
                    </div>
                    <div className="font-mono text-[10px] text-cyan-300 break-all">
                      {cbtPassReceipt.qrVerificationCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Exam Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setCbtPassReceipt(null); 
                      setIsCbtCheckoutMode(false); 
                      setIsCbtModalOpen(false); 
                    }}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Start Exam Session
                  </button>
                </div>
              </div>
            ) : isCbtCheckoutMode ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsProcessingPayment(true);
                try {
                  const instId = config.schoolSlug || 'apex_comp_college';
                  const init = await instancePaymentClient.initializePayment(instId, {
                    feeCategory: 'cbt_exam_pass',
                    amountNGN: 5000,
                    payerEmail: cbtCandidateEmail,
                    payerName: cbtCandidateName,
                    cbtExamCode: 'WAEC-JAMB-2026-ALL',
                    provider: selectedGateway
                  });

                  const verify = await instancePaymentClient.verifyPayment(instId, {
                    reference: init.reference,
                    provider: selectedGateway,
                    amountNGN: 5000,
                    feeCategory: 'cbt_exam_pass',
                    payerName: cbtCandidateName,
                    payerEmail: cbtCandidateEmail,
                    cbtExamCode: 'WAEC-JAMB-2026-ALL'
                  });

                  setCbtPassReceipt(verify.transaction);
                } catch (err: any) {
                  alert(`Payment error: ${err.message}`);
                } finally {
                  setIsProcessingPayment(false);
                }
              }} className="space-y-4 text-xs">
                <div className="p-3 bg-teal-950/30 border border-teal-800/40 rounded-xl">
                  <div className="font-bold text-white text-xs mb-1">Full 2026/2027 CBT Exam Pass</div>
                  <p className="text-[11px] text-slate-300">Unlock unlimited timed exam simulations, full NERDC question banks, instant broadsheet analytics, and offline kiosk pass.</p>
                  <div className="mt-2 text-teal-400 font-mono font-bold text-sm">Pass Fee: ₦5,000 (Termly Unlimited)</div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    required
                    value={cbtCandidateName}
                    onChange={e => setCbtCandidateName(e.target.value)}
                    placeholder="Candidate Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Candidate Email for Token Delivery</label>
                  <input
                    type="email"
                    required
                    value={cbtCandidateEmail}
                    onChange={e => setCbtCandidateEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Gateway Selector */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">Select Payment Rail</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'paystack' as const, label: 'Paystack (Card/USSD)', sub: 'Instant Token' },
                      { id: 'opay' as const, label: 'OPay Virtual NUBAN', sub: 'Zero Fee' },
                      { id: 'flutterwave' as const, label: 'Flutterwave Switch', sub: 'Cards' },
                      { id: 'bank_wire' as const, label: 'Direct Bank Wire', sub: 'NIBSS Wire' }
                    ].map(g => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setSelectedGateway(g.id)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          selectedGateway === g.id
                            ? 'bg-teal-950/60 border-teal-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[10px] leading-tight">{g.label}</div>
                        <div className="text-[9px] text-slate-500">{g.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCbtCheckoutMode(false)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying & Issuing Candidate Token...</span>
                      </>
                    ) : (
                      <span>Pay ₦5,000 & Activate Pass Now</span>
                    )}
                  </button>
                </div>
              </form>
            ) : cbtSubmitted ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Test Submitted Successfully!</h4>
                <p className="text-xs text-slate-300">Your answer was recorded in the secure CBT sovereign engine.</p>
                
                <div className="p-3 bg-teal-950/30 border border-teal-800/40 rounded-xl flex items-center justify-between text-left">
                  <div>
                    <div className="font-bold text-white text-xs">Unlock All 2026/2027 Subjects</div>
                    <div className="text-[11px] text-slate-400">Unlimited mock sessions & broadsheet ranking</div>
                  </div>
                  <button
                    onClick={() => setIsCbtCheckoutMode(true)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow"
                  >
                    Upgrade Pass (₦5,000)
                  </button>
                </div>

                <button
                  onClick={() => { setIsCbtModalOpen(false); setCbtSubmitted(false); setCbtAnswer(null); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close Kiosk
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-semibold text-white">
                  Question 1: What is the primary function of the NERDC in the Nigerian educational framework?
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'A', text: 'Curriculum development, research and periodic review' },
                    { key: 'B', text: 'Collection of state school levies and taxes' },
                    { key: 'C', text: 'Operation of interstate railway networks' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setCbtAnswer(opt.key)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        cbtAnswer === opt.key ? 'bg-teal-950 border-teal-500 text-white font-bold' : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-mono">{opt.key}</span>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    disabled={!cbtAnswer}
                    onClick={() => setCbtSubmitted(true)}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Submit Demo Answer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCbtCheckoutMode(true)}
                    className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Unlock Full Pass (₦5,000)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PWA Install & Share Modal */}
      <InstallShareModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
      />
    </div>
  );
};
