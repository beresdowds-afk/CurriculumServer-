import React from 'react';

// =========================================================================
// BRAND COLOR PALETTES & COLOR TOKENS
// =========================================================================
export const BRAND_COLORS = {
  // Common Ribbon Infinity Identity (Matching official uploaded master branding)
  infinityRibbon: {
    orangeStart: '#EA580C',
    orangeMid: '#F97316',
    orangeLight: '#FB923C',
    amberHighlight: '#FDBA74',
    cobaltCenter: '#0369A1',
    blueMid: '#0284C7',
    cyanBright: '#06B6D4',
    tealMid: '#0D9488',
    emeraldEnd: '#10B981',
    emeraldGlow: '#34D399'
  },
  curriculumServer: {
    navyText: '#1E293B',
    accentText: '#06B6D4',
    indigo: '#4F46E5',
    purple: '#7C3AED',
    blue: '#0284C7',
    cyan: '#06B6D4',
    darkBg: '#090D16',
    surfaceBg: '#111827'
  },
  curriculumFlow: {
    navyText: '#1E293B',
    accentText: '#06B6D4',
    teal: '#0D9488',
    green: '#10B981',
    cyan: '#06B6D4',
    orange: '#F97316',
    darkBg: '#064E3B',
    surfaceBg: '#0F766E'
  }
};

// =========================================================================
// 1. MASTER 3D INFINITY RIBBON ICON (Common to both Server & Flow)
// =========================================================================

/**
 * Precision 3D Continuous Infinity Ribbon Mark
 * Left Loop: Warm Amber/Orange gradient (#EA580C -> #F97316 -> #FB923C)
 * Center Twist: Oceanic Cobalt/Teal depth (#0369A1 -> #0284C7)
 * Right Loop: Vivid Cyan/Teal/Emerald gradient (#06B6D4 -> #0D9488 -> #10B981)
 */
export const CurriculumInfinityIcon: React.FC<{
  className?: string;
  size?: number;
  variant?: 'color' | 'monochrome' | 'white' | 'gold';
  idPrefix?: string;
}> = ({ className = 'w-10 h-10', size, variant = 'color', idPrefix = 'ribbon' }) => {
  const isMono = variant === 'monochrome';
  const isWhite = variant === 'white';
  const isGold = variant === 'gold';

  const p = idPrefix;

  return (
    <svg
      viewBox="0 0 600 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Curriculum Infinity Loop Ribbon Logo Mark"
    >
      <defs>
        {/* Left Orange Ribbon */}
        <linearGradient id={`${p}_orange`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isMono ? '#475569' : isWhite ? '#E2E8F0' : isGold ? '#D97706' : '#EA580C'} />
          <stop offset="35%" stopColor={isMono ? '#334155' : isWhite ? '#CBD5E1' : isGold ? '#F59E0B' : '#F97316'} />
          <stop offset="70%" stopColor={isMono ? '#1E293B' : isWhite ? '#94A3B8' : isGold ? '#FBBF24' : '#FB923C'} />
          <stop offset="100%" stopColor={isMono ? '#0F172A' : isWhite ? '#64748B' : isGold ? '#FDE68A' : '#FDBA74'} />
        </linearGradient>

        {/* Center Twist & Oceanic Transition */}
        <linearGradient id={`${p}_center`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isMono ? '#334155' : isWhite ? '#CBD5E1' : isGold ? '#B45309' : '#0369A1'} />
          <stop offset="40%" stopColor={isMono ? '#1E293B' : isWhite ? '#94A3B8' : isGold ? '#D97706' : '#0284C7'} />
          <stop offset="75%" stopColor={isMono ? '#0F172A' : isWhite ? '#64748B' : isGold ? '#F59E0B' : '#06B6D4'} />
          <stop offset="100%" stopColor={isMono ? '#020617' : isWhite ? '#475569' : isGold ? '#FBBF24' : '#0D9488'} />
        </linearGradient>

        {/* Right Cyan-Emerald Ribbon */}
        <linearGradient id={`${p}_cyanEmerald`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isMono ? '#1E293B' : isWhite ? '#94A3B8' : isGold ? '#D97706' : '#0284C7'} />
          <stop offset="35%" stopColor={isMono ? '#334155' : isWhite ? '#CBD5E1' : isGold ? '#F59E0B' : '#06B6D4'} />
          <stop offset="70%" stopColor={isMono ? '#475569' : isWhite ? '#E2E8F0' : isGold ? '#FBBF24' : '#0D9488'} />
          <stop offset="100%" stopColor={isMono ? '#64748B' : isWhite ? '#F8FAFC' : isGold ? '#FDE68A' : '#10B981'} />
        </linearGradient>

        {/* Outer Soft Glow */}
        <filter id={`${p}_glow`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0284C7" floodOpacity={isMono || isWhite ? 0.1 : 0.25} />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#F97316" floodOpacity={isMono || isWhite ? 0.1 : 0.18} />
        </filter>
      </defs>

      <g filter={`url(#${p}_glow)`}>
        {/* Layer 1: Left Back Loop Arch */}
        <path
          d="M 300 200 C 230 110 170 80 110 80 C 49 80 0 134 0 200 C 0 266 49 320 110 320 C 170 320 230 290 300 200 Z"
          fill={`url(#${p}_orange)`}
        />

        {/* Layer 2: Right Loop Arch */}
        <path
          d="M 300 200 C 370 110 430 80 490 80 C 551 80 600 134 600 200 C 600 266 551 320 490 320 C 430 320 370 290 300 200 Z"
          fill={`url(#${p}_cyanEmerald)`}
        />

        {/* Layer 3: Overlapping Flow Ribbon (Smooth Moebius bridge across center) */}
        <path
          d="M 110 80 C 170 80 230 110 300 200 C 370 290 430 320 490 320 C 525 320 555 304 574 278 C 530 294 480 270 430 220 C 370 160 310 110 240 85 C 195 68 150 72 110 80 Z"
          fill={`url(#${p}_center)`}
        />

        {/* Layer 4: Left Inner Core Cutout */}
        <path
          d="M 110 135 C 145 135 185 155 235 200 C 185 245 145 265 110 265 C 74 265 45 236 45 200 C 45 164 74 135 110 135 Z"
          fill={isWhite ? '#0F172A' : '#FFFFFF'}
          className={isWhite ? 'fill-slate-950' : 'fill-white dark:fill-slate-950'}
        />

        {/* Layer 5: Right Inner Core Cutout */}
        <path
          d="M 490 135 C 526 135 555 164 555 200 C 555 236 526 265 490 265 C 455 265 415 245 365 200 C 415 155 455 135 490 135 Z"
          fill={isWhite ? '#0F172A' : '#FFFFFF'}
          className={isWhite ? 'fill-slate-950' : 'fill-white dark:fill-slate-950'}
        />

        {/* Layer 6: 3D Bevel Lighting & Specular Highlights */}
        <path
          d="M 110 80 C 49 80 0 134 0 200 C 0 206 1 212 2 218 C 8 160 54 115 110 115 C 165 115 215 145 275 210 L 290 195 C 230 115 170 80 110 80 Z"
          fill="#FFFFFF"
          opacity={isMono ? 0.15 : isWhite ? 0.25 : 0.35}
        />

        <path
          d="M 490 80 C 551 80 600 134 600 200 C 600 206 599 212 598 218 C 592 160 546 115 490 115 C 435 115 385 145 325 210 L 310 195 C 370 115 430 80 490 80 Z"
          fill="#FFFFFF"
          opacity={isMono ? 0.12 : isWhite ? 0.2 : 0.3}
        />

        {/* Layer 7: Internal Crease Depth Shadow */}
        <path
          d="M 235 200 C 265 235 300 270 340 290 C 315 275 285 245 260 215 Z"
          fill="#000000"
          opacity={isMono ? 0.2 : isWhite ? 0.15 : 0.35}
        />
      </g>
    </svg>
  );
};

// Aliases for compatibility
export const CurriculumFlowIcon = CurriculumInfinityIcon;
export const CurriculumServerIcon = CurriculumInfinityIcon;

// =========================================================================
// 2. CURRICULUM FLOW FULL LOGO & WORDMARK
// =========================================================================

/**
 * Curriculum Flow Master Logo (Matching CF_og_banner_1200x630.png)
 * Features the 3D Ribbon Infinity Loop + "CurriculumFlow" dual-tone typography
 */
export const CurriculumFlowLogo: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'monochrome' | 'auto';
  variant?: 'primary' | 'alternative' | 'stacked' | 'horizontal';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({
  className = '',
  theme = 'auto',
  variant = 'horizontal',
  showTagline = false,
  size = 'md'
}) => {
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isMono = theme === 'monochrome';

  // Size scaling
  const iconSizes = {
    sm: 'w-7 h-5 sm:w-8 sm:h-5',
    md: 'w-9 h-6 sm:w-11 sm:h-7',
    lg: 'w-12 h-8 sm:w-16 sm:h-10',
    xl: 'w-20 h-13 sm:w-28 sm:h-18'
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl',
    xl: 'text-4xl sm:text-5xl md:text-6xl'
  };

  const isStacked = variant === 'stacked';

  return (
    <div
      className={`inline-flex ${isStacked ? 'flex-col items-center text-center' : 'items-center'} gap-2.5 sm:gap-3 select-none ${className}`}
      aria-label="CurriculumFlow Logo"
    >
      {/* 3D Infinity Ribbon Logo Mark */}
      <CurriculumInfinityIcon
        className={`${iconSizes[size]} shrink-0 drop-shadow-sm transition-transform duration-200 hover:scale-105`}
        variant={isMono ? 'monochrome' : 'color'}
        idPrefix="cf_logo"
      />

      {/* Typography: "CurriculumFlow" */}
      <div className={`flex flex-col justify-center ${isStacked ? 'items-center' : ''}`}>
        <div className={`flex items-baseline font-extrabold tracking-tight leading-none ${textSizes[size]}`}>
          <span
            className={`${
              isMono
                ? 'text-slate-900 dark:text-white'
                : isDark
                ? 'text-white'
                : isLight
                ? 'text-slate-900'
                : 'text-slate-900 dark:text-white'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            Curriculum
          </span>
          <span
            className={`${
              isMono
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-cyan-500 hover:text-cyan-400 transition-colors'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            Flow
          </span>
        </div>

        {showTagline && (
          <span
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1 ${
              isMono
                ? 'text-slate-500'
                : isDark
                ? 'text-teal-300/90'
                : isLight
                ? 'text-slate-500'
                : 'text-slate-500 dark:text-teal-300/80'
            }`}
          >
            {variant === 'alternative'
              ? 'Your School • Your Curriculum'
              : 'School Operating & Learning OS'}
          </span>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 3. CURRICULUM SERVER FULL LOGO & WORDMARK
// =========================================================================

/**
 * Curriculum Server Master Logo (Matching 782975611_1017854521247521_7249598803877810028_n.webp)
 * Features the 3D Ribbon Infinity Loop + "CurriculumServer" dual-tone typography
 */
export const CurriculumServerLogo: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'monochrome' | 'auto';
  variant?: 'primary' | 'alternative' | 'stacked' | 'horizontal';
  showPill?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({
  className = '',
  theme = 'auto',
  variant = 'horizontal',
  showPill = false,
  size = 'md'
}) => {
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isMono = theme === 'monochrome';

  const iconSizes = {
    sm: 'w-7 h-5 sm:w-8 sm:h-5',
    md: 'w-9 h-6 sm:w-11 sm:h-7',
    lg: 'w-12 h-8 sm:w-16 sm:h-10',
    xl: 'w-20 h-13 sm:w-28 sm:h-18'
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl',
    xl: 'text-4xl sm:text-5xl md:text-6xl'
  };

  const isStacked = variant === 'stacked';

  return (
    <div
      className={`inline-flex ${isStacked ? 'flex-col items-center text-center' : 'items-center'} gap-2.5 sm:gap-3 select-none ${className}`}
      aria-label="CurriculumServer Logo"
    >
      {/* 3D Infinity Ribbon Logo Mark */}
      <CurriculumInfinityIcon
        className={`${iconSizes[size]} shrink-0 drop-shadow-sm transition-transform duration-200 hover:scale-105`}
        variant={isMono ? 'monochrome' : 'color'}
        idPrefix="cs_logo"
      />

      {/* Typography: "CurriculumServer" */}
      <div className={`flex flex-col justify-center ${isStacked ? 'items-center' : ''}`}>
        <div className={`flex items-baseline font-extrabold tracking-tight leading-none ${textSizes[size]}`}>
          <span
            className={`${
              isMono
                ? 'text-slate-900 dark:text-white'
                : isDark
                ? 'text-white'
                : isLight
                ? 'text-slate-900'
                : 'text-slate-900 dark:text-white'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            Curriculum
          </span>
          <span
            className={`${
              isMono
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-cyan-500 hover:text-cyan-400 transition-colors'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            Server
          </span>
        </div>

        {/* Tagline Pill: PROVISION • MANAGE • SCALE */}
        {showPill && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-extrabold tracking-wider uppercase">
              SaaS Control Plane
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 4. POWERED BY BADGES & FOOTER PILLS
// =========================================================================

export const PoweredByCurriculumFlowPill: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  showLink?: boolean;
  onClick?: () => void;
}> = ({ className = '', theme = 'auto', onClick }) => {
  const isLight = theme === 'light';
  const isDark = theme === 'dark';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all ${
        onClick ? 'cursor-pointer hover:scale-102' : ''
      } ${
        isLight
          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
          : isDark
          ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200 shadow-sm'
          : 'bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm'
      } ${className}`}
      title="Powered by CurriculumFlow School Operating System"
    >
      <CurriculumInfinityIcon className="w-4 h-3 shrink-0" idPrefix="pbf_pill" />
      <span>
        Powered by <strong className="font-extrabold text-slate-900 dark:text-white">Curriculum</strong>
        <strong className="font-extrabold text-cyan-500">Flow</strong>
      </span>
    </div>
  );
};

export const PoweredByCurriculumServer: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
}> = ({ className = '', theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${
        isLight
          ? 'bg-cyan-50/80 border-cyan-200 text-slate-900 shadow-sm'
          : 'bg-slate-950/90 border-cyan-900/60 text-slate-100 shadow-lg shadow-cyan-950/50'
      } ${className}`}
    >
      <CurriculumInfinityIcon className="w-8 h-6 shrink-0" idPrefix="pbs_pill" />
      <div>
        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest leading-none">
          Powered by
        </div>
        <div className="text-xs font-black tracking-tight flex items-center gap-1 mt-0.5">
          <span className={isLight ? 'text-slate-900' : 'text-white'}>Curriculum</span>
          <span className="text-cyan-400">Server</span>
        </div>
        <div className="text-[9px] text-slate-400 font-medium">
          Multi-Tenant Provisioning &amp; SaaS Cloud Engine
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 5. APP SQUIRCLE ICONS (Favicon Previews & PWA Launcher Tiles)
// =========================================================================

export const BrandAppIconSquircle: React.FC<{
  brand: 'curriculum_server' | 'curriculum_flow';
  mode?: 'dark' | 'light';
  size?: number;
}> = ({ brand, mode = 'dark', size = 96 }) => {
  const isDark = mode === 'dark';

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-3xl p-4 flex items-center justify-center shadow-xl transition-transform hover:scale-105 border ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-cyan-700/50 shadow-cyan-950/50 ring-1 ring-cyan-500/30'
          : 'bg-white border-slate-200 shadow-slate-200 ring-1 ring-cyan-100'
      }`}
      aria-label={`${brand} app icon`}
    >
      <CurriculumInfinityIcon className="w-full h-full drop-shadow-md" idPrefix={`squircle_${brand}`} />
    </div>
  );
};

// =========================================================================
// 6. MASTER HIGH-RESOLUTION BANNER HEROES (1200x630 OpenGraph Banner)
// =========================================================================

export const CurriculumBrandBanner: React.FC<{
  type: 'flow' | 'server';
  theme?: 'light' | 'dark';
  className?: string;
}> = ({ type, theme = 'light', className = '' }) => {
  const isFlow = type === 'flow';
  const isLight = theme === 'light';

  return (
    <div
      className={`relative w-full aspect-[1200/630] rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 sm:p-14 border ${
        isLight
          ? 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-200 text-slate-900'
          : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-slate-800 text-white'
      } ${className}`}
    >
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Infinity Ribbon & Typography */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl">
        <CurriculumInfinityIcon
          className="w-40 h-28 sm:w-60 sm:h-40 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          idPrefix={`banner_${type}`}
        />

        <div className="flex items-baseline font-black tracking-tight text-4xl sm:text-6xl md:text-7xl leading-none">
          <span className={isLight ? 'text-slate-900' : 'text-white'}>Curriculum</span>
          <span className="text-cyan-500">{isFlow ? 'Flow' : 'Server'}</span>
        </div>

        <p className="text-xs sm:text-base md:text-lg font-medium text-slate-500 dark:text-slate-400 max-w-lg">
          {isFlow
            ? 'Unified School Operating System • Academic Records • Biometrics • NERDC Standards'
            : 'Enterprise Multi-Tenant SaaS Engine • Tenant Provisioning • Isolated School Clusters'}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-bold shadow-md">
          <span>Official Identity • Vector Master Asset</span>
        </div>
      </div>
    </div>
  );
};
