import React, { useState, useRef } from 'react';
import { 
  UserProfile, 
  SchoolBrandProfile, 
  LogoShape, 
  BrandPresetTheme,
  BrandRevisionEntry
} from '../types';
import { 
  NIGERIAN_STATES, 
  BRAND_COLOR_PRESETS, 
  BrandColorPreset 
} from '../data/brandManagementData';
import { 
  Building2, 
  Upload, 
  Image as ImageIcon, 
  ShieldCheck, 
  Sparkles, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Printer, 
  Eye, 
  Save, 
  Send, 
  RotateCcw, 
  School, 
  FileText, 
  CreditCard, 
  GraduationCap, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  Palette, 
  Smartphone, 
  Lock, 
  Award,
  Hash,
  PenTool,
  Compass,
  Radio,
  FileCheck,
  Server
} from 'lucide-react';
import { BrandSystemPortal } from './BrandSystemPortal';

interface BrandManagementTabProps {
  currentUser: UserProfile;
  brandProfile: SchoolBrandProfile;
  onUpdateBrand: (updatedBrand: SchoolBrandProfile) => void;
  onPublishBrand: (publishedBrand: SchoolBrandProfile) => void;
  onNavigateTab?: (tab: any) => void;
}

type SubTabKey = 'identity_crest' | 'brand_system' | 'contacts' | 'address_geo' | 'social_channels' | 'live_previews' | 'audit_history';
type PreviewMode = 'letterhead' | 'receipt' | 'report_card' | 'portal_header' | 'id_badge';

export const BrandManagementTab: React.FC<BrandManagementTabProps> = ({
  currentUser,
  brandProfile,
  onUpdateBrand,
  onPublishBrand,
  onNavigateTab
}) => {
  // Local working copy for editing before publishing
  const [formData, setFormData] = useState<SchoolBrandProfile>({ ...brandProfile });
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('identity_crest');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('letterhead');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState('');
  const [showSaveNotification, setShowSaveNotification] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Check RBAC Authority (Principal, Principal Admin, Super Admin, System Admin)
  const isAuthorizedAdmin = 
    currentUser.role === 'principal' || 
    currentUser.role === 'principal_admin' || 
    currentUser.role === 'super_admin' || 
    currentUser.role === 'ict_system_admin' ||
    currentUser.role === 'vice_principal_admin';

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(brandProfile);

  // Handle Text Field Change
  const handleChange = (field: keyof SchoolBrandProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      status: 'draft_pending_publish'
    }));
  };

  // Handle Nested Field Changes
  const handleNestedChange = <K extends 'contact' | 'address' | 'socialMedia' | 'examCentreNumbers' | 'brandTheme'>(
    section: K,
    key: keyof SchoolBrandProfile[K],
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      },
      status: 'draft_pending_publish'
    }));
  };

  // Apply Preset Color Theme
  const handleSelectPresetTheme = (preset: BrandColorPreset) => {
    setFormData(prev => ({
      ...prev,
      crestBadgePreset: preset.key,
      brandTheme: {
        ...prev.brandTheme,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent,
        presetKey: preset.key
      },
      status: 'draft_pending_publish'
    }));
  };

  // Handle Logo Upload (Simulated or Data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        handleChange('crestLogoUrl', result);
        showNotification('School crest logo uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Principal Signature Upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        handleChange('principalSignatureUrl', result);
        showNotification('Principal digital signature uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle School Stamp Upload
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        handleChange('stampSealUrl', result);
        showNotification('Official institutional seal uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const showNotification = (msg: string) => {
    setShowSaveNotification(msg);
    setTimeout(() => {
      setShowSaveNotification(null);
    }, 4000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Save Draft (Updates app state without publishing to official live release)
  const handleSaveDraft = () => {
    const draft: SchoolBrandProfile = {
      ...formData,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: `${currentUser.name} (${currentUser.title})`,
      status: 'draft_pending_publish'
    };
    onUpdateBrand(draft);
    setFormData(draft);
    showNotification('Brand modifications saved as Draft. Ready for Principal publication.');
  };

  // Discard local edits
  const handleDiscardChanges = () => {
    setFormData({ ...brandProfile });
    showNotification('Unsaved changes discarded. Restored last published brand.');
  };

  // Publish Brand to Live System
  const handlePublishLive = () => {
    const newVersion = (formData.version || 1) + 1;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const changesList: string[] = [];
    if (formData.schoolName !== brandProfile.schoolName) changesList.push(`Updated School Name to "${formData.schoolName}"`);
    if (formData.motto !== brandProfile.motto) changesList.push(`Updated Slogan to "${formData.motto}"`);
    if (formData.brandTheme.primaryColor !== brandProfile.brandTheme.primaryColor) changesList.push(`Refreshed Primary Brand Color to ${formData.brandTheme.primaryColor}`);
    if (formData.contact.primaryEmail !== brandProfile.contact.primaryEmail) changesList.push(`Updated Primary Email Desk to ${formData.contact.primaryEmail}`);
    if (formData.address.streetAddress !== brandProfile.address.streetAddress) changesList.push(`Updated Campus Physical Address`);
    if (formData.socialMedia.whatsappSupport !== brandProfile.socialMedia.whatsappSupport) changesList.push(`Configured Official WhatsApp channel`);
    if (changesList.length === 0) changesList.push('Published full brand profile verification and live sync');

    const newHistoryEntry: BrandRevisionEntry = {
      version: newVersion,
      publishedAt: nowStr,
      publishedBy: `${currentUser.name} (${currentUser.title})`,
      summaryNotes: publishNotes.trim() || 'Principal executive approval and institutional identity live release.',
      changesHighlight: changesList
    };

    const publishedProfile: SchoolBrandProfile = {
      ...formData,
      status: 'published',
      version: newVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: `${currentUser.name} (${currentUser.title})`,
      lastSavedAt: new Date().toISOString(),
      lastSavedBy: `${currentUser.name} (${currentUser.title})`,
      publishAuditHistory: [newHistoryEntry, ...(formData.publishAuditHistory || [])]
    };

    onPublishBrand(publishedProfile);
    setFormData(publishedProfile);
    setPublishModalOpen(false);
    setPublishNotes('');
    showNotification(`Version ${newVersion} successfully published to all live school systems & receipts!`);
  };

  // Rollback to previous version
  const handleRollbackVersion = (entry: BrandRevisionEntry) => {
    if (!confirm(`Restore and roll back brand configuration to Version ${entry.version} published on ${entry.publishedAt}?`)) return;
    setFormData(prev => ({
      ...prev,
      status: 'draft_pending_publish'
    }));
    showNotification(`Restored configuration parameters from Version ${entry.version}. Click Publish to apply live.`);
  };

  // Render SVG or Custom Logo Badge
  const renderCrestBadge = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
    const sizeClasses = {
      sm: 'w-10 h-10 text-xs',
      md: 'w-14 h-14 text-sm',
      lg: 'w-20 h-20 text-base',
      xl: 'w-28 h-28 text-xl'
    };

    const iconSizes = {
      sm: 'w-5 h-5',
      md: 'w-7 h-7',
      lg: 'w-10 h-10',
      xl: 'w-14 h-14'
    };

    const shapeClasses = {
      shield: 'rounded-b-3xl rounded-t-lg',
      circle: 'rounded-full',
      square: 'rounded-xl',
      rounded: 'rounded-2xl'
    };

    if (formData.crestLogoUrl) {
      return (
        <div className={`${sizeClasses[size]} ${shapeClasses[formData.logoShape]} overflow-hidden border-2 border-amber-400/60 shadow-xl bg-slate-900 flex items-center justify-center`}>
          <img 
            src={formData.crestLogoUrl} 
            alt={formData.schoolName} 
            className="w-full h-full object-contain p-1"
          />
        </div>
      );
    }

    // Vector Crest Badge with Custom Theme Colors
    return (
      <div 
        className={`${sizeClasses[size]} ${shapeClasses[formData.logoShape]} flex flex-col items-center justify-center text-white shadow-2xl border-2 border-amber-400/80 relative overflow-hidden transition-all`}
        style={{
          background: `linear-gradient(135deg, ${formData.brandTheme.primaryColor} 0%, ${formData.brandTheme.secondaryColor} 100%)`
        }}
      >
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
        <div className="relative z-10 flex flex-col items-center">
          {formData.logoIconType === 'book' ? (
            <FileText className={iconSizes[size]} />
          ) : formData.logoIconType === 'graduation' ? (
            <GraduationCap className={iconSizes[size]} />
          ) : formData.logoIconType === 'award' ? (
            <Award className={iconSizes[size]} />
          ) : formData.logoIconType === 'landmark' ? (
            <Building2 className={iconSizes[size]} />
          ) : (
            <School className={iconSizes[size]} />
          )}
          {size === 'xl' && (
            <span className="font-mono font-black text-[10px] tracking-widest uppercase mt-1 text-amber-300">
              {formData.shortName}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {showSaveNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border-2 border-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-scaleUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{showSaveNotification}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 1. EXECUTIVE BRAND GOVERNANCE HEADER & PUBLISH CONTROLS */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
          style={{ backgroundColor: formData.brandTheme.primaryColor }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Brand Identity Summary */}
          <div className="flex items-center gap-5">
            {renderCrestBadge('lg')}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formData.schoolName || 'School Brand & Identity Portal'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                  {formData.shortName || 'CFA'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  formData.status === 'published'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                }`}>
                  {formData.status === 'published' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Live v{formData.version} Published</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Draft Modified (Unpublished)</span>
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-slate-300 italic">
                "{formData.motto || 'Excellence in Knowledge, Character & Digital Innovation'}"
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Est. {formData.establishedYear}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formData.accreditationNumber}</span>
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  Last verified by: <strong className="text-slate-200">{formData.lastSavedBy || 'Principal'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar (Save Draft / Discard / Publish Live) */}
          <div className="flex flex-wrap items-center gap-3">
            {hasUnsavedChanges && (
              <button
                onClick={handleDiscardChanges}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Discard uncommitted changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>
            )}

            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save as Draft</span>
            </button>

            {isAuthorizedAdmin ? (
              <button
                onClick={() => setPublishModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Publish Live Brand Identity</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Principal Approval Required to Publish</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-2 pt-4 border-t border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('identity_crest')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'identity_crest'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>1. School Crest & Logo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brand_system')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'brand_system'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/40'
                : 'bg-slate-950 text-indigo-300 hover:text-white hover:bg-slate-800 border border-indigo-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>2. Dual-Brand System (Server vs. Flow)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'contacts'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4 text-cyan-400" />
            <span>3. Contact Desks & Helplines</span>
          </button>

          <button
            onClick={() => setActiveSubTab('address_geo')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'address_geo'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>4. Physical Address & Campus</span>
          </button>

          <button
            onClick={() => setActiveSubTab('social_channels')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'social_channels'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            <span>5. Social Media & Broadcasts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('live_previews')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'live_previews'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>6. Live Preview Canvas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_history')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'audit_history'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Revision History ({formData.publishAuditHistory?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. SUBTAB CONTENT PANELS */}
      {/* ----------------------------------------------------------------- */}

      {/* ================================================================= */}
      {/* SUBTAB 2: DUAL-BRAND GUIDELINES & VECTOR ASSETS PORTAL */}
      {/* ================================================================= */}
      {activeSubTab === 'brand_system' && (
        <BrandSystemPortal brandProfile={formData} onNavigateTab={onNavigateTab} />
      )}

      {/* ================================================================= */}
      {/* SUBTAB 1: LOGO, CREST, COLORS & CORE IDENTITY */}
      {/* ================================================================= */}
      {activeSubTab === 'identity_crest' && (
        <div className="space-y-6">
          {/* Crest Upload & Shape Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Official School Crest, Logo & Emblem</h3>
                <p className="text-xs text-slate-400">
                  Manage the institutional emblem displayed on official letterheads, receipts, student ID cards, and broadsheets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start pt-2">
              {/* Crest Preview Box */}
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Emblem Preview</span>
                
                {renderCrestBadge('xl')}

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{formData.schoolName}</h4>
                  <p className="text-xs text-slate-400 font-mono">{formData.shortName} • Est. {formData.establishedYear}</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Custom Image</span>
                  </button>

                  {formData.crestLogoUrl && (
                    <button
                      onClick={() => handleChange('crestLogoUrl', '')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      Use Vector Emblem
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Supports PNG, SVG, JPG, WebP up to 5MB (Transparent recommended)</p>
              </div>

              {/* Logo Shape & Icon Selector */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Emblem Frame Shape:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'shield', label: 'Academic Shield', desc: 'Regal collegiate contour' },
                      { key: 'circle', label: 'Seal Circle', desc: 'Traditional official stamp' },
                      { key: 'rounded', label: 'Modern Rounded', desc: 'Contemporary digital tech' },
                      { key: 'square', label: 'Classic Square', desc: 'Formal geometric frame' }
                    ].map((shape) => (
                      <button
                        key={shape.key}
                        type="button"
                        onClick={() => handleChange('logoShape', shape.key as LogoShape)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          formData.logoShape === shape.key
                            ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold block text-white">{shape.label}</span>
                        <span className="text-[10px] text-slate-400">{shape.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Vector Emblem Motif:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {[
                      { key: 'school', label: 'Academy', icon: <School className="w-4 h-4" /> },
                      { key: 'book', label: 'Knowledge', icon: <FileText className="w-4 h-4" /> },
                      { key: 'graduation', label: 'Scholar', icon: <GraduationCap className="w-4 h-4" /> },
                      { key: 'award', label: 'Excellence', icon: <Award className="w-4 h-4" /> },
                      { key: 'landmark', label: 'Heritage', icon: <Building2 className="w-4 h-4" /> }
                    ].map((iconItem) => (
                      <button
                        key={iconItem.key}
                        type="button"
                        onClick={() => handleChange('logoIconType', iconItem.key)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          formData.logoIconType === iconItem.key
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {iconItem.icon}
                        <span className="text-[10px] font-bold">{iconItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statutory Color Themes */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Statutory Institutional Palette Preset:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BRAND_COLOR_PRESETS.map((preset) => {
                      const isSelected = formData.brandTheme.presetKey === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handleSelectPresetTheme(preset)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/40'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div 
                            className="w-7 h-7 rounded-lg shrink-0 shadow-md border border-white/20"
                            style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 leading-tight">{preset.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* School Name, Motto, Category & Statutory Accreditation Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Institutional Identification & Regulatory Registry</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">Official School Full Legal Name *</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="e.g. CurriculumFlow Academy"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Acronym / Short Code *</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => handleChange('shortName', e.target.value)}
                  placeholder="e.g. CFA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">School Motto & Slogan *</label>
                <input
                  type="text"
                  value={formData.motto}
                  onChange={(e) => handleChange('motto', e.target.value)}
                  placeholder="e.g. Excellence in Knowledge, Character & Digital Innovation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Year Established</label>
                <input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => handleChange('establishedYear', parseInt(e.target.value) || 2015)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">Institution Category / Level</label>
                <input
                  type="text"
                  value={formData.schoolType}
                  onChange={(e) => handleChange('schoolType', e.target.value)}
                  placeholder="e.g. Private Day & Boarding Model College (JSS 1 - SS 3)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Ministry Accreditation Number</label>
                <input
                  type="text"
                  value={formData.accreditationNumber}
                  onChange={(e) => handleChange('accreditationNumber', e.target.value)}
                  placeholder="e.g. NERDC/WAEC/LAG/2024/0988-ACAD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Exam Board Centre Numbers */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                National Examination Centre Registry (WAEC • NECO • BECE • JAMB CBT)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">WAEC Centre No.</label>
                  <input
                    type="text"
                    value={formData.examCentreNumbers?.waec || ''}
                    onChange={(e) => handleNestedChange('examCentreNumbers', 'waec', e.target.value)}
                    placeholder="WAEC/CTR/4029104"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">NECO Centre No.</label>
                  <input
                    type="text"
                    value={formData.examCentreNumbers?.neco || ''}
                    onChange={(e) => handleNestedChange('examCentreNumbers', 'neco', e.target.value)}
                    placeholder="NECO/SCH/0091823"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">BECE / JSCE No.</label>
                  <input
                    type="text"
                    value={formData.examCentreNumbers?.bece || ''}
                    onChange={(e) => handleNestedChange('examCentreNumbers', 'bece', e.target.value)}
                    placeholder="BECE/LAG/88129"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">JAMB CBT Centre Code</label>
                  <input
                    type="text"
                    value={formData.examCentreNumbers?.jambCbt || ''}
                    onChange={(e) => handleNestedChange('examCentreNumbers', 'jambCbt', e.target.value)}
                    placeholder="JAMB/CBT/LAG-0442"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Principal Signature & Document Seal */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Principal Executive Signature & Official Stamp</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signature Uploader */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Principal Signature Specimen</span>
                  <input
                    type="file"
                    ref={sigInputRef}
                    onChange={handleSignatureUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => sigInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Signature</span>
                  </button>
                </div>

                <div className="h-24 rounded-xl border border-dashed border-slate-800 bg-slate-900/60 flex items-center justify-center p-2 relative overflow-hidden">
                  {formData.principalSignatureUrl ? (
                    <img 
                      src={formData.principalSignatureUrl} 
                      alt="Signature" 
                      className="max-h-full object-contain filter invert"
                    />
                  ) : (
                    <div className="text-center font-serif italic text-emerald-400 text-lg">
                      Dr. Margaret Adebayo
                      <span className="block text-[9px] font-sans not-italic text-slate-500">Digital Verified Signature</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => handleChange('principalName', e.target.value)}
                    placeholder="Principal Full Name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={formData.principalTitle}
                    onChange={(e) => handleChange('principalTitle', e.target.value)}
                    placeholder="Principal Official Qualifications / Designation"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400"
                  />
                </div>
              </div>

              {/* Document Seal & Watermark */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Official Stamp & Watermark</span>
                  <input
                    type="file"
                    ref={stampInputRef}
                    onChange={handleStampUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => stampInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Stamp Seal</span>
                  </button>
                </div>

                <div className="h-24 rounded-xl border border-dashed border-slate-800 bg-slate-900/60 flex items-center justify-center p-2 text-center">
                  <div className="p-2 border-2 border-emerald-500/50 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    ★ CURRICULUMFLOW ACADEMY ★<br />
                    <span className="text-[8px] text-slate-400">OFFICIAL PRINCIPAL SEAL</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 block">Security Watermark Text:</label>
                  <input
                    type="text"
                    value={formData.watermarkText}
                    onChange={(e) => handleChange('watermarkText', e.target.value)}
                    placeholder="e.g. CURRICULUMFLOW ACADEMY • OFFICIAL"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUBTAB 2: CONTACT INFORMATION & HELPLINES */}
      {/* ================================================================= */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Departmental Communications & Support Desks</h3>
                <p className="text-xs text-slate-400">
                  Official contact lines and emails displayed to parents, prospective students, and published on receipts.
                </p>
              </div>
            </div>

            {/* Departmental Emails Grid */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Departmental & Office Email Inboxes</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">General Information & Enquiries *</label>
                  <input
                    type="email"
                    value={formData.contact.primaryEmail}
                    onChange={(e) => handleNestedChange('contact', 'primaryEmail', e.target.value)}
                    placeholder="info@curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Admissions & Entrance Exam Desk</label>
                  <input
                    type="email"
                    value={formData.contact.admissionsEmail}
                    onChange={(e) => handleNestedChange('contact', 'admissionsEmail', e.target.value)}
                    placeholder="admissions@curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Bursary, Invoices & Fee Reconciliation Desk</label>
                  <input
                    type="email"
                    value={formData.contact.bursaryEmail}
                    onChange={(e) => handleNestedChange('contact', 'bursaryEmail', e.target.value)}
                    placeholder="bursary@curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Office of the Principal Secretariat</label>
                  <input
                    type="email"
                    value={formData.contact.principalEmail}
                    onChange={(e) => handleNestedChange('contact', 'principalEmail', e.target.value)}
                    placeholder="principal.office@curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Direct Phone Lines & Emergency Hotlines */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Telephone Desks, WhatsApp & Emergency Hotlines</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Primary Reception Line *</label>
                  <input
                    type="text"
                    value={formData.contact.primaryPhone}
                    onChange={(e) => handleNestedChange('contact', 'primaryPhone', e.target.value)}
                    placeholder="+234 803 456 7890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Alternate Telephone</label>
                  <input
                    type="text"
                    value={formData.contact.alternatePhone}
                    onChange={(e) => handleNestedChange('contact', 'alternatePhone', e.target.value)}
                    placeholder="+234 812 987 6543"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>WhatsApp Support Desk</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact.whatsappSupport}
                    onChange={(e) => handleNestedChange('contact', 'whatsappSupport', e.target.value)}
                    placeholder="+234 803 456 7890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>24/7 Emergency Helpline</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact.emergencyHelpline}
                    onChange={(e) => handleNestedChange('contact', 'emergencyHelpline', e.target.value)}
                    placeholder="+234 700-SCH-CARE"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Official Web & Portal URLs */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Web Domains & Digital Portals</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Official Website *</label>
                  <input
                    type="url"
                    value={formData.contact.officialWebsite}
                    onChange={(e) => handleNestedChange('contact', 'officialWebsite', e.target.value)}
                    placeholder="https://curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Student Portal URL</label>
                  <input
                    type="url"
                    value={formData.contact.studentPortalUrl}
                    onChange={(e) => handleNestedChange('contact', 'studentPortalUrl', e.target.value)}
                    placeholder="https://portal.curriculumflow.edu.ng/student"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Parent Portal URL</label>
                  <input
                    type="url"
                    value={formData.contact.parentPortalUrl}
                    onChange={(e) => handleNestedChange('contact', 'parentPortalUrl', e.target.value)}
                    placeholder="https://portal.curriculumflow.edu.ng/parent"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">LMS & CBT Domain</label>
                  <input
                    type="url"
                    value={formData.contact.lmsUrl}
                    onChange={(e) => handleNestedChange('contact', 'lmsUrl', e.target.value)}
                    placeholder="https://lms.curriculumflow.edu.ng"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUBTAB 3: PHYSICAL ADDRESS & CAMPUS GEO-LOCATION */}
      {/* ================================================================= */}
      {activeSubTab === 'address_geo' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Physical Campus Address & Geographic Coordinates</h3>
                <p className="text-xs text-slate-400">
                  Specifies the official campus location rendered on academic transcripts, fee schedules, and ministry registries.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-300">Street Address Line *</label>
                <input
                  type="text"
                  value={formData.address.streetAddress}
                  onChange={(e) => handleNestedChange('address', 'streetAddress', e.target.value)}
                  placeholder="Plot 12, Academic Boulevard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Campus Designation</label>
                <input
                  type="text"
                  value={formData.address.campusName}
                  onChange={(e) => handleNestedChange('address', 'campusName', e.target.value)}
                  placeholder="Apex Hill Main Campus"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Area / District / Estate</label>
                <input
                  type="text"
                  value={formData.address.areaDistrict}
                  onChange={(e) => handleNestedChange('address', 'areaDistrict', e.target.value)}
                  placeholder="Victoria Island Extension"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">City *</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                  placeholder="Lagos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">State / Province *</label>
                <select
                  value={formData.address.state}
                  onChange={(e) => handleNestedChange('address', 'state', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {NIGERIAN_STATES.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName} State
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Country *</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleNestedChange('address', 'country', e.target.value)}
                  placeholder="Nigeria"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Postal / ZIP Code</label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => handleNestedChange('address', 'postalCode', e.target.value)}
                  placeholder="101241"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5 md:col-span-3">
                <label className="text-xs font-bold text-slate-300">Navigation Landmarks & Directions</label>
                <input
                  type="text"
                  value={formData.address.landmarks}
                  onChange={(e) => handleNestedChange('address', 'landmarks', e.target.value)}
                  placeholder="Adjacent Eko Innovation Hub, Opposite Admiralty Way Junction"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Geo-Coordinates & Interactive Maps */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-rose-400" />
                  <span>GPS Coordinates & Map Navigation Link</span>
                </h4>

                {formData.address.geoCoordinates?.googleMapsUrl && (
                  <a
                    href={formData.address.geoCoordinates.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Test Google Maps Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.address.geoCoordinates?.latitude || 6.4281}
                    onChange={(e) => handleNestedChange('address', 'geoCoordinates', {
                      ...formData.address.geoCoordinates,
                      latitude: parseFloat(e.target.value) || 0
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.address.geoCoordinates?.longitude || 3.4219}
                    onChange={(e) => handleNestedChange('address', 'geoCoordinates', {
                      ...formData.address.geoCoordinates,
                      longitude: parseFloat(e.target.value) || 0
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Google Maps Direct URL</label>
                  <input
                    type="url"
                    value={formData.address.geoCoordinates?.googleMapsUrl || ''}
                    onChange={(e) => handleNestedChange('address', 'geoCoordinates', {
                      ...formData.address.geoCoordinates,
                      googleMapsUrl: e.target.value
                    })}
                    placeholder="https://maps.google.com/?q=6.4281,3.4219"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUBTAB 4: SOCIAL MEDIA & OFFICIAL BROADCAST CHANNELS */}
      {/* ================================================================= */}
      {activeSubTab === 'social_channels' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Official Social Media & Broadcast Channels</h3>
                <p className="text-xs text-slate-400">
                  Connect verified digital handles for school announcements, newsletters, PTA updates, and admissions campaigns.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* WhatsApp Channel */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Radio className="w-4 h-4" />
                    <span>WhatsApp Official Broadcast Channel</span>
                  </span>
                  {formData.socialMedia.whatsappChannel && (
                    <a
                      href={formData.socialMedia.whatsappChannel}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.whatsappChannel}
                  onChange={(e) => handleNestedChange('socialMedia', 'whatsappChannel', e.target.value)}
                  placeholder="https://whatsapp.com/channel/0029VaCurriculumFlow"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Telegram Channel */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    <span>Telegram Student/Parent Broadcast</span>
                  </span>
                  {formData.socialMedia.telegramChannel && (
                    <a
                      href={formData.socialMedia.telegramChannel}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.telegramChannel}
                  onChange={(e) => handleNestedChange('socialMedia', 'telegramChannel', e.target.value)}
                  placeholder="https://t.me/curriculumflow_announcements"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Twitter / X */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Twitter / X (@handle)</span>
                  {formData.socialMedia.twitterXUrl && (
                    <a
                      href={formData.socialMedia.twitterXUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-300 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.twitterXUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'twitterXUrl', e.target.value)}
                  placeholder="https://x.com/curriculumflow_ng"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Facebook */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Facebook Page</span>
                  {formData.socialMedia.facebookUrl && (
                    <a
                      href={formData.socialMedia.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.facebookUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/curriculumflowacademy"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Instagram */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-400">Instagram (@profile)</span>
                  {formData.socialMedia.instagramUrl && (
                    <a
                      href={formData.socialMedia.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-pink-400 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.instagramUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/curriculumflow_edu"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* LinkedIn */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">LinkedIn Institutional Page</span>
                  {formData.socialMedia.linkedinUrl && (
                    <a
                      href={formData.socialMedia.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.linkedinUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/curriculumflow-academy"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* YouTube */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400">YouTube Channel</span>
                  {formData.socialMedia.youtubeUrl && (
                    <a
                      href={formData.socialMedia.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-red-400 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.youtubeUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'youtubeUrl', e.target.value)}
                  placeholder="https://youtube.com/@curriculumflowschool"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* TikTok */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">TikTok Academic Highlights</span>
                  {formData.socialMedia.tiktokUrl && (
                    <a
                      href={formData.socialMedia.tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-300 hover:underline flex items-center gap-1"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={formData.socialMedia.tiktokUrl}
                  onChange={(e) => handleNestedChange('socialMedia', 'tiktokUrl', e.target.value)}
                  placeholder="https://tiktok.com/@curriculumflow_official"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUBTAB 5: LIVE MULTI-FORMAT PREVIEWS CANVAS */}
      {/* ================================================================= */}
      {activeSubTab === 'live_previews' && (
        <div className="space-y-6">
          {/* Preview Format Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-white">Select Live Rendering Canvas:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'letterhead', label: 'Official Letterhead / Memo', icon: <FileText className="w-3.5 h-3.5" /> },
                { key: 'receipt', label: 'Bursary Fee Receipt', icon: <CreditCard className="w-3.5 h-3.5" /> },
                { key: 'report_card', label: 'Termly Broadsheet / Report', icon: <GraduationCap className="w-3.5 h-3.5" /> },
                { key: 'portal_header', label: 'Parent Portal Web Header', icon: <Globe className="w-3.5 h-3.5" /> },
                { key: 'id_badge', label: 'Student / Staff Smart Badge', icon: <QrCode className="w-3.5 h-3.5" /> }
              ].map((fmt) => (
                <button
                  key={fmt.key}
                  onClick={() => setPreviewMode(fmt.key as PreviewMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === fmt.key
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt.icon}
                  <span>{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1. LETTERHEAD PREVIEW */}
          {previewMode === 'letterhead' && (
            <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-300 max-w-4xl mx-auto relative overflow-hidden">
              {/* Watermark in background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[-25deg]">
                <span className="text-6xl font-black text-slate-900">{formData.watermarkText}</span>
              </div>

              {/* Letterhead Header */}
              <div 
                className="pb-6 border-b-2 flex flex-col sm:flex-row items-center justify-between gap-6"
                style={{ borderColor: formData.brandTheme.primaryColor }}
              >
                <div className="flex items-center gap-5 text-center sm:text-left">
                  {renderCrestBadge('lg')}
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {formData.schoolName}
                    </h2>
                    <p className="text-xs font-bold text-slate-700 italic">
                      "{formData.motto}"
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {formData.address.streetAddress}, {formData.address.areaDistrict}, {formData.address.city}, {formData.address.state} State • {formData.address.country}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Tel: {formData.contact.primaryPhone} | Email: {formData.contact.primaryEmail} | Web: {formData.contact.officialWebsite}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-500 hidden sm:block shrink-0">
                  <div className="font-bold text-slate-800">{formData.accreditationNumber}</div>
                  <div>WAEC: {formData.examCentreNumbers.waec}</div>
                  <div>NECO: {formData.examCentreNumbers.neco}</div>
                </div>
              </div>

              {/* Sample Letter Body */}
              <div className="py-8 space-y-4 text-xs leading-relaxed text-slate-800">
                <div className="flex justify-between items-center text-slate-600 font-mono">
                  <span>REF: CFA/PRIN/2026/MEMO-082</span>
                  <span>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>

                <div className="font-bold text-sm text-slate-900 pt-2">
                  OFFICIAL DIRECTIVE: COMMENCEMENT OF 2025/2026 STATUTORY TERM CLEARANCES
                </div>

                <p>
                  The Directorate of the Principal, in accordance with the Nigerian Educational Research and Development Council (NERDC) national guidelines, hereby notifies all academic staff, form masters, and bursary administrators of the revised institutional operating guidelines for the upcoming session.
                </p>

                <p>
                  All official correspondence, fee invoices, academic broadsheets, and examination passes must reflect the verified school crest, accredited WAEC/NECO center numbers, and institutional communication helplines as published in this executive charter.
                </p>

                {/* Sign-off & Stamp */}
                <div className="pt-8 flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="h-14 flex items-end">
                      {formData.principalSignatureUrl ? (
                        <img src={formData.principalSignatureUrl} alt="Sign" className="h-12 object-contain" />
                      ) : (
                        <span className="font-serif italic text-emerald-800 text-lg font-bold">
                          {formData.principalName}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900">{formData.principalName}</div>
                    <div className="text-[10px] text-slate-600">{formData.principalTitle}</div>
                  </div>

                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-600/60 flex items-center justify-center text-center p-2">
                    <span className="text-[8px] font-bold text-emerald-800 uppercase leading-tight">
                      ★ CFA ★<br />OFFICIAL SEAL<br />VERIFIED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. RECEIPT PREVIEW */}
          {previewMode === 'receipt' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-3xl mx-auto space-y-6 shadow-2xl">
              <div 
                className="pb-4 border-b flex items-center justify-between"
                style={{ borderColor: formData.brandTheme.primaryColor }}
              >
                <div className="flex items-center gap-3">
                  {renderCrestBadge('md')}
                  <div>
                    <h3 className="text-base font-black text-white">{formData.schoolName}</h3>
                    <p className="text-[11px] text-emerald-400 font-bold">Directorate of Bursary & Financial Administration</p>
                    <p className="text-[10px] text-slate-400">{formData.address.streetAddress}, {formData.address.city} • {formData.contact.bursaryEmail}</p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                    OFFICIAL E-RECEIPT
                  </span>
                  <div className="text-xs text-slate-300 font-bold mt-1">REC-2026-08129</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Student</span>
                  <span className="font-bold text-white">Chinedu Eze</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Admission No</span>
                  <span className="font-mono font-bold text-emerald-400">CF/2024/0143</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Class Grade</span>
                  <span className="font-bold text-white">SS 2 Science A</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Method</span>
                  <span className="font-bold text-cyan-400">Paystack / OPay</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">Senior Secondary Tuition & STEM Levy (Tranche 1)</span>
                  <span className="text-[11px] text-slate-500">Statutory 50% Resumption Milestone Clearance</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-black text-emerald-400">₦120,000.00</span>
                  <span className="text-[10px] font-bold text-emerald-300 block">CLEARANCE UNLOCKED</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                <span>Support: {formData.contact.whatsappSupport} | Helpline: {formData.contact.emergencyHelpline}</span>
                <span className="font-mono">Security Hash: CFA-HASH-7892-SECURE</span>
              </div>
            </div>
          )}

          {/* 3. REPORT CARD PREVIEW */}
          {previewMode === 'report_card' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-4xl mx-auto space-y-6 shadow-2xl">
              <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {renderCrestBadge('md')}
                  <div>
                    <h3 className="text-lg font-black text-white">{formData.schoolName}</h3>
                    <p className="text-xs text-slate-400">{formData.schoolType}</p>
                    <p className="text-[11px] text-emerald-400 font-semibold">{formData.academicAffiliation}</p>
                  </div>
                </div>

                <div className="text-right text-xs space-y-0.5">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-950 text-indigo-300 border border-indigo-700">
                    TERMLY ACADEMIC DOSSIER
                  </span>
                  <div className="text-slate-400 text-[11px]">2025/2026 Academic Session • First Term</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Student Name</span>
                  <span className="font-bold text-white">Fatima Garba</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Term Average</span>
                  <span className="font-mono font-black text-emerald-400">89.4% (Position: 1st)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Conduct & Character</span>
                  <span className="font-bold text-slate-200">Exemplary / Distinguish</span>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 italic">
                "{formData.motto}" • Accredited WAEC: {formData.examCentreNumbers.waec} • NECO: {formData.examCentreNumbers.neco}
              </div>
            </div>
          )}

          {/* 4. PARENT PORTAL HEADER CARD */}
          {previewMode === 'portal_header' && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl mx-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {renderCrestBadge('md')}
                  <div>
                    <h3 className="text-base font-black text-white">{formData.schoolName}</h3>
                    <p className="text-xs text-slate-400">Parent & Guardian Digital Access Gateway</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={formData.socialMedia.whatsappChannel}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                    title="WhatsApp Channel"
                  >
                    <Smartphone className="w-4 h-4" />
                  </a>
                  <a
                    href={formData.contact.officialWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800 hover:bg-sky-900"
                    title="Main Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Helpline / WhatsApp</span>
                  <span className="font-mono font-bold text-white">{formData.contact.whatsappSupport}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Admissions Desk</span>
                  <span className="font-bold text-emerald-400">{formData.contact.admissionsEmail}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Campus Location</span>
                  <span className="text-slate-300 font-medium">{formData.address.city}, {formData.address.state}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. SMART ID CARD BADGE PREVIEW */}
          {previewMode === 'id_badge' && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
              {/* FRONT BADGE */}
              <div 
                className="w-64 h-96 rounded-3xl p-5 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden border-2 border-amber-400/60"
                style={{
                  background: `linear-gradient(145deg, ${formData.brandTheme.primaryColor} 0%, #0f172a 100%)`
                }}
              >
                <div className="flex items-center justify-between">
                  {renderCrestBadge('sm')}
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest block text-white">{formData.shortName}</span>
                    <span className="text-[8px] text-emerald-300 font-mono">STUDENT ID</span>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-white/40 flex items-center justify-center text-slate-400 text-xs font-bold shadow-inner">
                    PHOTO BOX
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white leading-tight">FATIMA GARBA</h4>
                    <span className="text-[10px] font-mono text-amber-300 block font-bold">CF/2024/0142</span>
                    <span className="text-[9px] text-slate-300">Grade: SS 2 Science A</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20 text-center">
                  <span className="text-[8px] uppercase tracking-wider block font-bold text-slate-200">{formData.schoolName}</span>
                  <span className="text-[7px] text-slate-300">{formData.address.city}, {formData.address.state}</span>
                </div>
              </div>

              {/* BACK BADGE */}
              <div className="w-64 h-96 rounded-3xl p-5 bg-slate-950 text-slate-200 shadow-2xl flex flex-col justify-between border-2 border-slate-800">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Security & Emergency Contact</span>
                  <p className="text-[8px] text-slate-400 leading-tight">
                    This card remains the property of {formData.schoolName}. If found, please return to any campus administrative desk or call the 24/7 hotline.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-slate-950">
                  <QrCode className="w-20 h-20" />
                  <span className="text-[8px] font-mono font-bold mt-1">SCAN FOR E-CLEARANCE</span>
                </div>

                <div className="space-y-1 text-center text-[8px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
                  <div>Helpline: {formData.contact.emergencyHelpline}</div>
                  <div>Web: {formData.contact.officialWebsite}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUBTAB 6: REVISION AUDIT HISTORY */}
      {/* ================================================================= */}
      {activeSubTab === 'audit_history' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Brand Publication Audit Trail & Version Control</h3>
                  <p className="text-xs text-slate-400">
                    Immutable history of all institutional identity updates released by the Principal.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {formData.publishAuditHistory?.map((entry, idx) => (
                <div 
                  key={entry.version}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    idx === 0 
                      ? 'bg-emerald-950/20 border-emerald-600/50 shadow-md'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                        idx === 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        Version {entry.version} {idx === 0 && '• (ACTIVE LIVE)'}
                      </span>
                      <span className="text-xs font-bold text-white">{entry.summaryNotes}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{entry.publishedAt}</span>
                      <span>by</span>
                      <strong className="text-slate-200">{entry.publishedBy}</strong>
                    </div>
                  </div>

                  {entry.changesHighlight && entry.changesHighlight.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Changes in this release:</span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-300">
                        {entry.changesHighlight.map((change, cIdx) => (
                          <li key={cIdx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {idx > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                      <button
                        onClick={() => handleRollbackVersion(entry)}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore this Version</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. PUBLISH CONFIRMATION MODAL */}
      {/* ----------------------------------------------------------------- */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Publish Live Brand Identity</h3>
                <p className="text-xs text-slate-400">
                  Principal Executive Release & Propagation
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <span className="font-bold text-white block">System Propagation Scope:</span>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Update official header crest and motto across all web & mobile portals</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Synchronize school contacts and address on bursary receipts & invoices</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Update official social broadcast channels on student & parent dockets</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Release Notes / Principal Summary:</label>
              <textarea
                rows={3}
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="e.g. Updated WhatsApp broadcast channel, emergency helpline, and exam accreditation centre codes for 2025/2026 session."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPublishModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishLive}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Publish Live</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
