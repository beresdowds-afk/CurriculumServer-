import React from 'react';

// =========================================================================
// BRAND COLOR PALETTES & TOKENS
// =========================================================================
export const BRAND_COLORS = {
  curriculumServer: {
    indigo: '#4F46E5',
    purple: '#7C3AED',
    blue: '#2563EB',
    cyan: '#06B6D4',
    darkBg: '#090D16',
    surfaceBg: '#111827'
  },
  curriculumFlow: {
    teal: '#0F766E',
    green: '#10B981',
    blue: '#3B82F6',
    amber: '#F59E0B',
    darkBg: '#064E3B',
    surfaceBg: '#0F766E'
  }
};

// =========================================================================
// 1. CURRICULUM SERVER ASSETS (SaaS Infrastructure & Control Plane)
// =========================================================================

/**
 * 3D Multi-tier Server Stack with Graduation Cap and Cloud Halo
 */
export const CurriculumServerIcon: React.FC<{
  className?: string;
  size?: number;
  variant?: 'color' | 'monochrome' | 'white';
}> = ({ className = 'w-10 h-10', size, variant = 'color' }) => {
  const isMono = variant === 'monochrome';
  const isWhite = variant === 'white';

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Cloud Glow Gradient */}
        <linearGradient id="csCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* Server Layer Top Gradients */}
        <linearGradient id="csServerTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Server Layer Left Side */}
        <linearGradient id="csServerLeft" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        {/* Server Layer Right Side */}
        <linearGradient id="csServerRight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Mortarboard Cap Gradient */}
        <linearGradient id="csCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      {/* Cloud Halo in Background */}
      <path
        d="M75 32C73 24 66 18 57 18C48.5 18 41.5 23.5 39 31C34.5 31.5 31 35.5 31 40.5C31 46 35.5 50.5 41 50.5H76C81 50.5 85 46.5 85 41.5C85 36.5 80.5 32.5 75 32Z"
        fill="none"
        stroke={isMono ? '#000' : isWhite ? '#FFF' : 'url(#csCloudGrad)'}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isMono ? '0.3' : isWhite ? '0.4' : '0.85'}
      />

      {/* Server Blade 3 (Bottom) */}
      <g>
        {/* Left facet */}
        <path
          d="M20 86L58 104V113L20 95V86Z"
          fill={isMono ? '#333' : isWhite ? '#BBB' : 'url(#csServerLeft)'}
        />
        {/* Right facet */}
        <path
          d="M58 104L98 86V95L58 113V104Z"
          fill={isMono ? '#111' : isWhite ? '#999' : 'url(#csServerRight)'}
        />
        {/* Top facet */}
        <path
          d="M20 86L58 68L98 86L58 104L20 86Z"
          fill={isMono ? '#555' : isWhite ? '#DDD' : 'url(#csServerTop)'}
        />
        {/* LED Glow Dots */}
        <circle cx="28" cy="91" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#38BDF8'} />
        <circle cx="34" cy="94" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#4ADE80'} />
      </g>

      {/* Server Blade 2 (Middle) */}
      <g>
        {/* Left facet */}
        <path
          d="M20 68L58 86V95L20 77V68Z"
          fill={isMono ? '#444' : isWhite ? '#CCC' : 'url(#csServerLeft)'}
        />
        {/* Right facet */}
        <path
          d="M58 86L98 68V77L58 95V86Z"
          fill={isMono ? '#222' : isWhite ? '#AAA' : 'url(#csServerRight)'}
        />
        {/* Top facet */}
        <path
          d="M20 68L58 50L98 68L58 86L20 68Z"
          fill={isMono ? '#666' : isWhite ? '#EEE' : 'url(#csServerTop)'}
        />
        {/* LED Glow Dots */}
        <circle cx="28" cy="73" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#38BDF8'} />
        <circle cx="34" cy="76" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#A855F7'} />
      </g>

      {/* Server Blade 1 (Top Tier) */}
      <g>
        {/* Left facet */}
        <path
          d="M20 50L58 68V77L20 59V50Z"
          fill={isMono ? '#555' : isWhite ? '#DDD' : 'url(#csServerLeft)'}
        />
        {/* Right facet */}
        <path
          d="M58 68L98 50V59L58 77V68Z"
          fill={isMono ? '#333' : isWhite ? '#BBB' : 'url(#csServerRight)'}
        />
        {/* Top facet */}
        <path
          d="M20 50L58 32L98 50L58 68L20 50Z"
          fill={isMono ? '#777' : isWhite ? '#FFF' : 'url(#csServerTop)'}
        />
        {/* LED Glow Dots */}
        <circle cx="28" cy="55" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#06B6D4'} />
        <circle cx="34" cy="58" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#38BDF8'} />
      </g>

      {/* Graduation Cap Mortarboard atop Server */}
      <g>
        {/* Cap diamond */}
        <path
          d="M58 18L84 31L58 44L32 31L58 18Z"
          fill={isMono ? '#000' : isWhite ? '#FFF' : 'url(#csCapGrad)'}
          stroke={isMono ? '#FFF' : isWhite ? '#000' : '#C7D2FE'}
          strokeWidth="1.5"
        />
        {/* Cap skull base */}
        <path
          d="M44 37V46C44 49 50 52 58 52C66 52 72 49 72 46V37L58 44L44 37Z"
          fill={isMono ? '#222' : isWhite ? '#CCC' : '#3730A3'}
        />
        {/* Tassel Button & String */}
        <circle cx="58" cy="31" r="2.5" fill={isMono ? '#FFF' : isWhite ? '#000' : '#FBBF24'} />
        <path
          d="M58 31C64 33 74 38 76 45"
          stroke={isMono ? '#FFF' : isWhite ? '#000' : '#FBBF24'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="76" cy="46" r="2" fill={isMono ? '#FFF' : isWhite ? '#000' : '#F59E0B'} />
      </g>
    </svg>
  );
};

/**
 * Curriculum Server Full Wordmark & Logo Header
 */
export const CurriculumServerLogo: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'monochrome';
  showPill?: boolean;
}> = ({ className = 'h-12', theme = 'dark', showPill = true }) => {
  const isLight = theme === 'light';
  const isMono = theme === 'monochrome';

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      <CurriculumServerIcon
        className="w-11 h-11 shrink-0 drop-shadow-md"
        variant={isMono ? 'monochrome' : isLight ? 'color' : 'color'}
      />
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-black text-lg sm:text-xl tracking-tight uppercase ${
              isMono
                ? 'text-black'
                : isLight
                ? 'text-slate-900'
                : 'text-white'
            }`}
            style={{ letterSpacing: '-0.02em' }}
          >
            CURRICULUM
          </span>
          <span
            className={`font-black text-lg sm:text-xl tracking-tight uppercase ${
              isMono
                ? 'text-black'
                : 'text-indigo-500'
            }`}
            style={{ letterSpacing: '-0.02em' }}
          >
            SERVER
          </span>
        </div>

        {/* Subtitle letterspacing */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[9px] font-bold tracking-[0.25em] uppercase ${
              isMono
                ? 'text-slate-600'
                : isLight
                ? 'text-slate-500'
                : 'text-indigo-300'
            }`}
          >
            SAAS PLATFORM
          </span>
        </div>

        {/* Tagline Pill: PROVISION • MANAGE • SCALE */}
        {showPill && (
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase transition-all ${
                isMono
                  ? 'bg-black text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
              }`}
            >
              PROVISION • MANAGE • SCALE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Technology Endorsement Banner: "Powered by CURRICULUM SERVER"
 */
export const PoweredByCurriculumServer: React.FC<{
  className?: string;
  theme?: 'dark' | 'light';
}> = ({ className = '', theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${
        isLight
          ? 'bg-indigo-50/80 border-indigo-200 text-slate-900 shadow-sm'
          : 'bg-slate-950/90 border-indigo-900/60 text-slate-100 shadow-lg shadow-indigo-950/50'
      } ${className}`}
    >
      <CurriculumServerIcon className="w-8 h-8 shrink-0" />
      <div>
        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">
          Powered by
        </div>
        <div className="text-xs font-black tracking-tight flex items-center gap-1 mt-0.5">
          <span className={isLight ? 'text-slate-900' : 'text-white'}>CURRICULUM</span>
          <span className="text-indigo-400">SERVER</span>
        </div>
        <div className="text-[9px] text-slate-400 font-medium">
          The Engine Behind Curriculum Flow
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. CURRICULUM FLOW ASSETS (School Education & Learning OS)
// =========================================================================

/**
 * Blooming Open Book with Student Figure and Graduation Cap
 */
export const CurriculumFlowIcon: React.FC<{
  className?: string;
  size?: number;
  variant?: 'color' | 'monochrome' | 'white';
}> = ({ className = 'w-10 h-10', size, variant = 'color' }) => {
  const isMono = variant === 'monochrome';
  const isWhite = variant === 'white';

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Blue Leaf Ray Gradient */}
        <linearGradient id="cfBlueLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Teal Leaf Ray Gradient */}
        <linearGradient id="cfTealLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Green Leaf Ray Gradient */}
        <linearGradient id="cfGreenLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Amber Sunburst Ray Gradient */}
        <linearGradient id="cfAmberLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>

        {/* Student Figure Gradient */}
        <linearGradient id="cfStudentGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>
      </defs>

      {/* Left Wing / Pages (Blue & Teal Rays) */}
      <g>
        {/* Bottom deep blue leaf */}
        <path
          d="M60 88C42 88 22 75 14 62C24 64 42 70 60 88Z"
          fill={isMono ? '#444' : isWhite ? '#CCC' : 'url(#cfBlueLeaf)'}
        />
        {/* Mid cyan-blue leaf */}
        <path
          d="M60 88C45 80 28 62 20 45C32 49 48 60 60 88Z"
          fill={isMono ? '#333' : isWhite ? '#DDD' : '#0284C7'}
        />
        {/* Upper teal leaf */}
        <path
          d="M60 88C48 72 36 48 32 30C44 36 54 54 60 88Z"
          fill={isMono ? '#222' : isWhite ? '#EEE' : 'url(#cfTealLeaf)'}
        />
      </g>

      {/* Right Wing / Pages (Green & Amber Rays) */}
      <g>
        {/* Upper vibrant emerald green leaf */}
        <path
          d="M60 88C66 54 76 36 88 30C84 48 72 72 60 88Z"
          fill={isMono ? '#333' : isWhite ? '#DDD' : 'url(#cfGreenLeaf)'}
        />
        {/* Mid lime-green leaf */}
        <path
          d="M60 88C72 60 88 49 100 45C92 62 75 80 60 88Z"
          fill={isMono ? '#444' : isWhite ? '#CCC' : '#10B981'}
        />
        {/* Bottom radiant amber ray */}
        <path
          d="M60 88C78 70 96 64 106 62C98 75 78 88 60 88Z"
          fill={isMono ? '#555' : isWhite ? '#BBB' : 'url(#cfAmberLeaf)'}
        />
      </g>

      {/* Open Book Base Spine Arc */}
      <path
        d="M14 62C32 80 50 90 60 92C70 90 88 80 106 62C88 86 68 96 60 96C52 96 32 86 14 62Z"
        fill={isMono ? '#000' : isWhite ? '#FFF' : '#0F172A'}
      />

      {/* Center Rising Student Figure */}
      <g>
        {/* Body / Torso reaching upward */}
        <path
          d="M54 84C54 70 56 60 60 52C64 60 66 70 66 84C63 86 57 86 54 84Z"
          fill={isMono ? '#000' : isWhite ? '#FFF' : 'url(#cfStudentGrad)'}
        />
        {/* Student Head */}
        <circle cx="60" cy="44" r="5" fill={isMono ? '#000' : isWhite ? '#FFF' : '#115E59'} />
      </g>

      {/* Graduation Cap Mortarboard atop Blossom */}
      <g>
        {/* Diamond top */}
        <path
          d="M60 14L78 23L60 32L42 23L60 14Z"
          fill={isMono ? '#000' : isWhite ? '#FFF' : '#0F172A'}
          stroke={isMono ? '#FFF' : isWhite ? '#000' : '#10B981'}
          strokeWidth="1.5"
        />
        {/* Skull base */}
        <path
          d="M50 27V33C50 35 54 37 60 37C66 37 70 35 70 33V27L60 32L50 27Z"
          fill={isMono ? '#222' : isWhite ? '#CCC' : '#042F2E'}
        />
        {/* Tassel */}
        <circle cx="60" cy="23" r="1.5" fill={isMono ? '#FFF' : isWhite ? '#000' : '#F59E0B'} />
        <path
          d="M60 23C64 25 71 28 72 34"
          stroke={isMono ? '#FFF' : isWhite ? '#000' : '#F59E0B'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="72" cy="35" r="1.5" fill={isMono ? '#FFF' : isWhite ? '#000' : '#F59E0B'} />
      </g>
    </svg>
  );
};

/**
 * Curriculum Flow Full Wordmark & Logo Header
 */
export const CurriculumFlowLogo: React.FC<{
  className?: string;
  theme?: 'dark' | 'light' | 'monochrome';
  variant?: 'primary' | 'alternative';
}> = ({ className = 'h-12', theme = 'light', variant = 'primary' }) => {
  const isLight = theme === 'light';
  const isMono = theme === 'monochrome';

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      <CurriculumFlowIcon
        className="w-12 h-12 shrink-0 drop-shadow-sm"
        variant={isMono ? 'monochrome' : 'color'}
      />
      <div className="flex flex-col justify-center">
        {variant === 'alternative' && (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Your School. Your Curriculum.
          </span>
        )}

        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-black text-lg sm:text-2xl tracking-tight uppercase ${
              isMono
                ? 'text-black'
                : isLight
                ? 'text-slate-900'
                : 'text-white'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            CURRICULUM
          </span>
          <span
            className={`font-black text-lg sm:text-2xl tracking-tight uppercase flex items-baseline ${
              isMono
                ? 'text-black'
                : 'text-teal-600'
            }`}
            style={{ letterSpacing: '-0.03em' }}
          >
            FLOW
            <span className="text-[9px] font-bold align-super ml-0.5">TM</span>
          </span>
        </div>

        {/* Motto / Subtitle */}
        <div className="mt-0.5">
          <span
            className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase ${
              isMono
                ? 'text-slate-600'
                : isLight
                ? 'text-slate-600'
                : 'text-teal-300'
            }`}
          >
            {variant === 'alternative'
              ? 'Learn • Teach • Assess • Achieve'
              : 'FROM CURRICULUM TO CLASSROOM TO RESULTS'}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Discreet Tenant School Footer Pill: "Powered by CURRICULUM FLOW"
 */
export const PoweredByCurriculumFlowPill: React.FC<{
  className?: string;
  theme?: 'dark' | 'light';
}> = ({ className = '', theme = 'light' }) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${
        isLight
          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm'
          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 shadow-sm'
      } ${className}`}
    >
      <CurriculumFlowIcon className="w-4 h-4 shrink-0" />
      <span>
        Powered by <strong className="text-teal-600 font-black">CURRICULUM FLOW</strong>
      </span>
    </div>
  );
};

// =========================================================================
// 3. APP SQUIRCLE ICONS (512x512 Master Previews & Favicons)
// =========================================================================

export const BrandAppIconSquircle: React.FC<{
  brand: 'curriculum_server' | 'curriculum_flow';
  mode?: 'dark' | 'light';
  size?: number;
}> = ({ brand, mode = 'dark', size = 96 }) => {
  const isServer = brand === 'curriculum_server';
  const isDark = mode === 'dark';

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-3xl p-4 flex items-center justify-center shadow-xl transition-transform hover:scale-105 border ${
        isServer
          ? isDark
            ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-indigo-700/50 shadow-indigo-950/50 ring-1 ring-indigo-500/30'
            : 'bg-white border-slate-200 shadow-slate-200 ring-1 ring-indigo-100'
          : isDark
          ? 'bg-gradient-to-br from-slate-950 via-teal-950 to-emerald-950 border-teal-700/50 shadow-teal-950/50 ring-1 ring-teal-500/30'
          : 'bg-white border-slate-200 shadow-slate-200 ring-1 ring-teal-100'
      }`}
    >
      {isServer ? (
        <CurriculumServerIcon className="w-full h-full drop-shadow-md" />
      ) : (
        <CurriculumFlowIcon className="w-full h-full drop-shadow-md" />
      )}
    </div>
  );
};
