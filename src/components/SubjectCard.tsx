import React from 'react';
import { SubjectCurriculum } from '../types';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface SubjectCardProps {
  subject: SubjectCurriculum;
  onSelectSubject: (subject: SubjectCurriculum) => void;
  onOpenLessonPlan: (subject: SubjectCurriculum) => void;
  onOpenScheme: (subject: SubjectCurriculum) => void;
  onOpenExam: (subject: SubjectCurriculum) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onSelectSubject,
  onOpenLessonPlan,
  onOpenScheme,
  onOpenExam,
}) => {
  const totalTopics = subject.themes.reduce((acc, t) => acc + t.topics.length, 0);

  const getFieldColor = (field: string) => {
    switch (field) {
      case 'core':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'science_math':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'humanities':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'business':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'technology':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'trade_entrepreneurship':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'core':
        return 'Compulsory Core';
      case 'science_math':
        return 'Science & Math';
      case 'humanities':
        return 'Humanities';
      case 'business':
        return 'Business Studies';
      case 'technology':
        return 'Technology';
      case 'trade_entrepreneurship':
        return 'Trade / Entrepreneurship';
      default:
        return field;
    }
  };

  return (
    <div
      id={`subject-card-${subject.id}`}
      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-emerald-950/20 group"
    >
      <div>
        {/* Top Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
              {subject.code}
            </span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded border ${getFieldColor(
                subject.field
              )}`}
            >
              {getFieldLabel(subject.field)}
            </span>
            {subject.isCompulsory && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Compulsory
              </span>
            )}
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              subject.level === 'jss'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {subject.level === 'jss' ? 'JSS 1–3' : 'SSS 1–3'}
          </span>
        </div>

        {/* Subject Title */}
        <h3
          onClick={() => onSelectSubject(subject)}
          className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors cursor-pointer flex items-center justify-between"
        >
          <span>{subject.name}</span>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-400" />
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {subject.description}
        </p>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>{subject.themes.length} Themes ({totalTopics} Topics)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{subject.recommendedPeriodsPerWeek} Periods / Wk</span>
          </div>
        </div>

        {/* Target Grades Pills */}
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Classes:</span>
          {subject.targetGrades.map((g) => (
            <span
              key={g}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700"
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="mt-5 pt-3 border-t border-slate-700/80 flex flex-col gap-2">
        <button
          id={`view-syllabus-btn-${subject.id}`}
          onClick={() => onSelectSubject(subject)}
          className="w-full py-2 px-3 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold shadow flex items-center justify-center gap-1.5 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Explore Syllabus & Objectives</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onOpenLessonPlan(subject)}
            className="py-1.5 px-2 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-600/60 hover:border-emerald-500/40 flex items-center justify-center gap-1 transition-all"
            title="Generate official NERDC Lesson Plan"
          >
            <FileText className="w-3 h-3 text-emerald-400" />
            <span>Lesson Plan</span>
          </button>

          <button
            onClick={() => onOpenScheme(subject)}
            className="py-1.5 px-2 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-600/60 hover:border-blue-500/40 flex items-center justify-center gap-1 transition-all"
            title="Generate 12-Week Scheme of Work"
          >
            <Layers className="w-3 h-3 text-blue-400" />
            <span>Scheme</span>
          </button>

          <button
            onClick={() => onOpenExam(subject)}
            className="py-1.5 px-2 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-600/60 hover:border-purple-500/40 flex items-center justify-center gap-1 transition-all"
            title="Generate WAEC / BECE Quiz"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Quiz / Exam</span>
          </button>
        </div>
      </div>
    </div>
  );
};
