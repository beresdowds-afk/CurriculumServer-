import React from 'react';
import { 
  BookMarked, 
  ShieldCheck, 
  Sparkles, 
  FileCheck2, 
  Award, 
  ExternalLink 
} from 'lucide-react';
import { NERDC_STATS } from '../data/nerdcDatabase';

interface StatsBannerProps {
  onOpenLessonPlanModal: () => void;
  onOpenAssistantModal: () => void;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  onOpenLessonPlanModal,
  onOpenAssistantModal,
}) => {
  return (
    <div id="stats-banner" className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/70 border-b border-slate-800 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top official banner */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sourced Directly from Official NERDC Nigerian National Curriculum Repositories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
              Federal Ministry of Education / NERDC Curriculum Portal
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Official standardized syllabus database for Universal Basic Education (JSS 1, JSS 2, JSS 3) and New Senior Secondary Education (SSS 1, SSS 2, SSS 3). Complete with themes, weekly topics, behavioral performance objectives, teacher/student activities, teaching & learning aids, evaluation guides, and WAEC / NECO / BECE / JAMB alignment.
            </p>
          </div>

          {/* Quick AI Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              id="hero-lesson-plan-cta"
              onClick={onOpenLessonPlanModal}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Generate Lesson Plan</span>
            </button>
            <button
              id="hero-ai-tutor-cta"
              onClick={onOpenAssistantModal}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Ask Curriculum AI</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">{NERDC_STATS.totalSubjectsInDb}</div>
              <div className="text-xs text-slate-400">Curriculum Syllabi in DB</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">JSS 1 – SSS 3</div>
              <div className="text-xs text-slate-400">Universal Coverage</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">100%</div>
              <div className="text-xs text-slate-400">WAEC / BECE Aligned</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">AI Powered</div>
              <div className="text-xs text-slate-400">Lesson Plans & Schemes</div>
            </div>
          </div>
        </div>

        {/* Direct Source Citations Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Official Database Citations:</span>
            <span>Nigerian Educational Research and Development Council (NERDC), Sheda, Abuja</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.nerdc.gov.ng/content_manager/jss1-3.html"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Source 1: NERDC JSS1-3 Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.nerdc.gov.ng/content_manager/new_senior_curriculum_home.html"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Source 2: NERDC New Senior Secondary Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
