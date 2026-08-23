import React from 'react';
import { School, Sparkles, KeyRound, ExternalLink, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { TenantSchoolApp } from '../types';

interface SampleSchoolDemoBannerProps {
  tenant: TenantSchoolApp;
  onOpenAuthModal: () => void;
  onOpenProvisionModal: () => void;
  onNavigateToLanding: () => void;
}

export const SampleSchoolDemoBanner: React.FC<SampleSchoolDemoBannerProps> = ({
  tenant,
  onOpenAuthModal,
  onOpenProvisionModal,
  onNavigateToLanding
}) => {
  return (
    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border-b border-indigo-500/30 text-white px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
            <School className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">
                Interactive Showcase Environment
              </span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                Sample School: {tenant.schoolName}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Experience the full CurriculumFlow School Operating System. Real school data is completely isolated under tenant cryptographic security boundaries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAuthModal}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            <span>Sign In to School</span>
          </button>

          <button
            onClick={onOpenProvisionModal}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Provision Your School</span>
          </button>
        </div>
      </div>
    </div>
  );
};
