import React, { useState } from 'react';
import {
  CurriculumServerLogo,
  CurriculumServerIcon,
  PoweredByCurriculumServer,
  CurriculumFlowLogo,
  CurriculumFlowIcon,
  PoweredByCurriculumFlowPill,
  BrandAppIconSquircle,
  BRAND_COLORS
} from './brand/BrandAssets';
import { 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Globe, 
  Server, 
  Building2, 
  BookOpen, 
  ExternalLink,
  Code,
  Palette,
  Eye,
  Sliders,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { SchoolBrandProfile } from '../types';

interface BrandSystemPortalProps {
  brandProfile?: SchoolBrandProfile;
  onNavigateTab?: (tab: any) => void;
}

export const BrandSystemPortal: React.FC<BrandSystemPortalProps> = ({
  brandProfile,
  onNavigateTab
}) => {
  const [activeBrandTab, setActiveBrandTab] = useState<'both' | 'server' | 'flow'>('both');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id.startsWith('hex-')) {
      setCopiedHex(text);
      setTimeout(() => setCopiedHex(null), 2000);
    } else {
      setCopiedCodeSnippet(id);
      setTimeout(() => setCopiedCodeSnippet(null), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* =========================================================================
          HERO BANNER & DUAL-BRAND STRATEGY SUMMARY
         ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Dual-Brand Identity & Vector Design System
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Curriculum Server <span className="text-indigo-400">&amp;</span> Curriculum Flow
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            A unified, scalable brand architecture built upon the parent-child principle:{' '}
            <strong className="text-indigo-300">CURRICULUM SERVER</strong> powers the B2B SaaS control plane, while{' '}
            <strong className="text-teal-300">CURRICULUM FLOW</strong> delivers the school-facing education operating system.
          </p>

          {/* Tab Filter Controls */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {[
              { id: 'both', label: 'Complete Brand Board (Both)', icon: Layers },
              { id: 'server', label: 'Curriculum Server (SaaS)', icon: Server },
              { id: 'flow', label: 'Curriculum Flow (Education)', icon: BookOpen }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeBrandTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveBrandTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: CURRICULUM SERVER (B2B SaaS / CONTROL PLANE)
         ========================================================================= */}
      {(activeBrandTab === 'both' || activeBrandTab === 'server') && (
        <div className="bg-slate-900/70 border border-indigo-900/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  1. CURRICULUM SERVER
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                    B2B SaaS / Control Plane
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Target: Platform Administrators, Resellers, DevOps, Billing, and Domain/DNS Managers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-800/40">
              <span>Motto: PROVISION • MANAGE • SCALE</span>
            </div>
          </div>

          {/* Master Logo Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Dark Background Logo */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Full Logo + Wordmark (Dark Theme)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumServerLogo theme="dark" showPill={true} />
              </div>
              <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                <span>Usage: SaaS Master Header, Portals</span>
                <span className="text-indigo-400 font-bold">Vector SVG</span>
              </div>
            </div>

            {/* Light Background Logo */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Full Logo (Light Theme / Business Docs)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumServerLogo theme="light" showPill={true} />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Usage: Invoices, Proposals, Contracts</span>
                <span className="text-indigo-600 font-bold">Vector SVG</span>
              </div>
            </div>

            {/* Monochrome / Black & White */}
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Monochrome Logo (Legal & Stamp)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumServerLogo theme="monochrome" showPill={true} />
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span>Usage: B&amp;W Print, Embossed Seals</span>
                <span className="text-black font-bold">Vector SVG</span>
              </div>
            </div>
          </div>

          {/* Icons, Favicons & Endorsement Badge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Primary Server Icon & App Squircle */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-300">App Icons (512×512 Squircle)</span>
              <div className="flex items-center justify-around py-3">
                <div className="text-center space-y-1.5">
                  <BrandAppIconSquircle brand="curriculum_server" mode="dark" size={64} />
                  <span className="text-[10px] text-slate-400 font-medium">Dark Icon</span>
                </div>
                <div className="text-center space-y-1.5">
                  <BrandAppIconSquircle brand="curriculum_server" mode="light" size={64} />
                  <span className="text-[10px] text-slate-400 font-medium">Light Icon</span>
                </div>
              </div>
            </div>

            {/* Favicons (32px & 16px) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-300">Favicon Scale Tuning</span>
              <div className="flex items-center justify-around py-4">
                <div className="text-center space-y-1.5">
                  <div className="w-8 h-8 mx-auto p-1 bg-indigo-950/80 rounded-lg border border-indigo-700/50 flex items-center justify-center">
                    <CurriculumServerIcon size={24} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">32×32 px</span>
                </div>
                <div className="text-center space-y-1.5">
                  <div className="w-6 h-6 mx-auto p-0.5 bg-indigo-950/80 rounded-md border border-indigo-700/50 flex items-center justify-center">
                    <CurriculumServerIcon size={16} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">16×16 px</span>
                </div>
              </div>
            </div>

            {/* "Powered by Curriculum Server" Endorsement Badge */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-300">Technology Endorsement Badge</span>
              <div className="py-2 flex items-center justify-center">
                <PoweredByCurriculumServer theme="dark" />
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Used on provisioning screens &amp; infrastructure docs
              </p>
            </div>
          </div>

          {/* Curriculum Server Color Palette */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Curriculum Server Color Palette (Technology &amp; Infrastructure)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Indigo', hex: '#4F46E5', desc: 'Primary Core' },
                { name: 'Purple', hex: '#7C3AED', desc: 'SaaS Accent' },
                { name: 'Blue', hex: '#2563EB', desc: 'Infrastructure' },
                { name: 'Cyan', hex: '#06B6D4', desc: 'Cloud Beacon' }
              ].map(color => (
                <div
                  key={color.hex}
                  onClick={() => handleCopy(color.hex, `hex-${color.hex}`)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all cursor-pointer group"
                >
                  <div
                    className="w-full h-10 rounded-lg mb-2 shadow-inner group-hover:scale-102 transition-transform"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{color.name}</span>
                    <span className="text-[10px] font-mono text-indigo-400 font-semibold flex items-center gap-1">
                      {copiedHex === color.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                      {color.hex}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">{color.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CURRICULUM FLOW (SCHOOL-FACING EDUCATION PRODUCT)
         ========================================================================= */}
      {(activeBrandTab === 'both' || activeBrandTab === 'flow') && (
        <div className="bg-slate-900/70 border border-teal-900/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  2. CURRICULUM FLOW
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold uppercase">
                    School-Facing Education Product
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Target: Proprietors, Principals, Teachers, Students, and Parents.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-800/40">
              <span>Motto: FROM CURRICULUM TO CLASSROOM TO RESULTS</span>
            </div>
          </div>

          {/* Master Logo Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Light Background Logo */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Full Logo + Wordmark (Light Theme)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumFlowLogo theme="light" variant="primary" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Usage: Student/Teacher Portals, Reports</span>
                <span className="text-teal-600 font-bold">Vector SVG</span>
              </div>
            </div>

            {/* Alternative Motto Logo */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Alternative Logo (Dark Theme / Campaign)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumFlowLogo theme="dark" variant="alternative" />
              </div>
              <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                <span>Usage: School Campaigns, Yearbooks</span>
                <span className="text-teal-400 font-bold">Vector SVG</span>
              </div>
            </div>

            {/* Monochrome Logo */}
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Monochrome Logo (Official Academic Broadsheets)
              </span>
              <div className="py-4 flex items-center justify-center">
                <CurriculumFlowLogo theme="monochrome" variant="primary" />
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span>Usage: Transcripts, Official WAEC Dossiers</span>
                <span className="text-black font-bold">Vector SVG</span>
              </div>
            </div>
          </div>

          {/* Icons, Favicons & Discreet Footer Pill */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Primary Flow Icon & App Squircle */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-300">App Icons (512×512 Squircle)</span>
              <div className="flex items-center justify-around py-3">
                <div className="text-center space-y-1.5">
                  <BrandAppIconSquircle brand="curriculum_flow" mode="dark" size={64} />
                  <span className="text-[10px] text-slate-400 font-medium">Dark Icon</span>
                </div>
                <div className="text-center space-y-1.5">
                  <BrandAppIconSquircle brand="curriculum_flow" mode="light" size={64} />
                  <span className="text-[10px] text-slate-400 font-medium">Light Icon</span>
                </div>
              </div>
            </div>

            {/* Favicons (32px & 16px) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-300">Favicon Scale Tuning</span>
              <div className="flex items-center justify-around py-4">
                <div className="text-center space-y-1.5">
                  <div className="w-8 h-8 mx-auto p-1 bg-teal-950/80 rounded-lg border border-teal-700/50 flex items-center justify-center">
                    <CurriculumFlowIcon size={24} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">32×32 px</span>
                </div>
                <div className="text-center space-y-1.5">
                  <div className="w-6 h-6 mx-auto p-0.5 bg-teal-950/80 rounded-md border border-teal-700/50 flex items-center justify-center">
                    <CurriculumFlowIcon size={16} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">16×16 px</span>
                </div>
              </div>
            </div>

            {/* Discreet School Footer Pill */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-300">Discreet Tenant Footer Pill</span>
              <div className="py-2 flex items-center justify-center">
                <PoweredByCurriculumFlowPill theme="dark" />
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Discreetly placed in school dashboard footers
              </p>
            </div>
          </div>

          {/* Curriculum Flow Color Palette */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Curriculum Flow Color Palette (Education, Growth &amp; Achievement)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Teal', hex: '#0F766E', desc: 'Primary Depth' },
                { name: 'Green', hex: '#10B981', desc: 'Growth & Blossom' },
                { name: 'Blue', hex: '#3B82F6', desc: 'Knowledge Ray' },
                { name: 'Amber', hex: '#F59E0B', desc: 'Achievement Sunburst' }
              ].map(color => (
                <div
                  key={color.hex}
                  onClick={() => handleCopy(color.hex, `hex-${color.hex}`)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all cursor-pointer group"
                >
                  <div
                    className="w-full h-10 rounded-lg mb-2 shadow-inner group-hover:scale-102 transition-transform"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{color.name}</span>
                    <span className="text-[10px] font-mono text-teal-400 font-semibold flex items-center gap-1">
                      {copiedHex === color.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                      {color.hex}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">{color.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: BROWSER TAB SIMULATION & TENANT WHITE-LABEL INTEGRATION
         ========================================================================= */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Browser Tab Favicon &amp; White-Label Integration</h3>
            <p className="text-xs text-slate-400">
              Clear distinction between SaaS administration and school-facing tenant instances.
            </p>
          </div>
        </div>

        {/* Browser Tabs Simulator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SaaS Tab */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-indigo-300">Curriculum Server (Platform Admin Tab)</span>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700/80 max-w-sm">
                <CurriculumServerIcon size={18} />
                <span className="text-xs font-bold text-slate-200 truncate">
                  Curriculum Server – SaaS Platform
                </span>
                <span className="text-slate-500 text-xs ml-auto font-bold">✕</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Address: <code className="text-indigo-400">https://curriculumserver.com.ng/admin</code>
              </p>
            </div>
          </div>

          {/* School Tab */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-teal-300">Curriculum Flow (Tenant School Tab)</span>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700/80 max-w-sm">
                <CurriculumFlowIcon size={18} />
                <span className="text-xs font-bold text-slate-200 truncate">
                  Greenfield Academy – Student Portal
                </span>
                <span className="text-slate-500 text-xs ml-auto font-bold">✕</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Address: <code className="text-teal-400">https://greenfield.curriculumflow.com.ng</code>
              </p>
            </div>
          </div>
        </div>

        {/* School White-Label Hierarchy Visualizer */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Tenant Customization &amp; White-Label Rule
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-md">
              School Identity First
            </span>
          </div>

          <div className="bg-white text-slate-900 rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white font-black flex items-center justify-center text-sm shadow">
                  GA
                </div>
                <div>
                  <h4 className="text-base font-black tracking-tight text-slate-900">
                    GREENFIELD ACADEMY
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Excellence • Character • Impact
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Dashboard</span>
                <span>•</span>
                <span>Classes</span>
                <span>•</span>
                <span>Results</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
              <span>Term: 2nd Term 2025/2026</span>
              <PoweredByCurriculumFlowPill theme="light" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM BANNER: TWO PRODUCTS. ONE VISION.
         ========================================================================= */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-2 shadow-xl">
        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Two Products. One Vision.
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 font-bold tracking-widest uppercase text-emerald-400">
          BETTER SCHOOLS. BRIGHTER FUTURES.
        </p>
      </div>
    </div>
  );
};
