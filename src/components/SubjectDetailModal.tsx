import React, { useState } from 'react';
import { SubjectCurriculum, CurriculumTopic, CurriculumTheme } from '../types';
import { 
  X, 
  BookOpen, 
  Layers, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Printer, 
  Bookmark, 
  HelpCircle,
  Clock,
  FlaskConical,
  Award
} from 'lucide-react';

interface SubjectDetailModalProps {
  subject: SubjectCurriculum | null;
  onClose: () => void;
  onLaunchLessonPlan: (subject: SubjectCurriculum, topic?: CurriculumTopic) => void;
  onLaunchScheme: (subject: SubjectCurriculum) => void;
  onLaunchExam: (subject: SubjectCurriculum, topic?: CurriculumTopic) => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  subject,
  onClose,
  onLaunchLessonPlan,
  onLaunchScheme,
  onLaunchExam,
}) => {
  if (!subject) return null;

  const [activeTab, setActiveTab] = useState<'syllabus' | 'scheme' | 'objectives' | 'textbooks'>('syllabus');
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(subject.themes[0]?.id || null);
  const [selectedTopic, setSelectedTopic] = useState<CurriculumTopic | null>(
    subject.themes[0]?.topics[0] || null
  );

  const toggleTheme = (themeId: string) => {
    setExpandedThemeId(expandedThemeId === themeId ? null : themeId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="subject-detail-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Top Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-sm">
              {subject.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{subject.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {subject.level === 'jss' ? 'Universal Basic Education (JSS)' : 'Senior Secondary (SSS)'}
                </span>
                {subject.isCompulsory && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Compulsory Core
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official NERDC Nigerian Curriculum Standard • {subject.targetGrades.join(', ')} • {subject.recommendedPeriodsPerWeek} Periods/Week
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={subject.officialSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-800 transition-colors"
              title="View on Official NERDC Portal"
            >
              <span>NERDC Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              id="close-subject-modal"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-900 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('syllabus')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'syllabus'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Syllabus Themes & Topics ({subject.themes.length})
            </button>

            <button
              onClick={() => setActiveTab('objectives')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'objectives'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Curriculum Objectives & Aims
            </button>

            <button
              onClick={() => setActiveTab('textbooks')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'textbooks'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Recommended Textbooks & Labs
            </button>
          </div>

          {/* Quick AI Launch Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLaunchLessonPlan(subject, selectedTopic || undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-medium transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Lesson Plan</span>
            </button>

            <button
              onClick={() => onLaunchScheme(subject)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 font-medium transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Scheme Builder</span>
            </button>

            <button
              onClick={() => onLaunchExam(subject, selectedTopic || undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Exam / Quiz</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'syllabus' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Theme & Topic Tree */}
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Curriculum Themes & Modules</span>
                  <span>{subject.themes.length} Themes</span>
                </div>

                <div className="space-y-3">
                  {subject.themes.map((theme) => {
                    const isExpanded = expandedThemeId === theme.id;
                    return (
                      <div
                        key={theme.id}
                        className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm"
                      >
                        {/* Theme Header */}
                        <button
                          onClick={() => toggleTheme(theme.id)}
                          className="w-full px-4 py-3 text-left flex items-start justify-between gap-3 bg-slate-800 hover:bg-slate-750 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {theme.themeNumber}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-100">{theme.title}</h4>
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {theme.description}
                              </p>
                            </div>
                          </div>
                          <span className="text-slate-400 mt-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </span>
                        </button>

                        {/* Topics List under theme */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-700/50 bg-slate-900/60 p-2 space-y-1">
                            {theme.topics.map((topic) => {
                              const isSelected = selectedTopic?.id === topic.id;
                              return (
                                <div
                                  key={topic.id}
                                  onClick={() => setSelectedTopic(topic)}
                                  className={`p-2.5 rounded-lg cursor-pointer transition-all flex flex-col gap-1 ${
                                    isSelected
                                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-200'
                                      : 'hover:bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-200">{topic.title}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                      {topic.classGrade} • {topic.term} • Wk {topic.week}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 line-clamp-1">
                                    Sub-topics: {topic.subTopics.join(', ')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed Topic Inspector */}
              <div className="lg:col-span-7">
                {selectedTopic ? (
                  <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-6 space-y-6 shadow-md">
                    {/* Topic Header */}
                    <div className="border-b border-slate-700/80 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {selectedTopic.classGrade} • {selectedTopic.term} • Week {selectedTopic.week}
                        </span>
                        {selectedTopic.examRelevance?.waec && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            WAEC Focus
                          </span>
                        )}
                        {selectedTopic.examRelevance?.bece && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            BECE Focus
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-extrabold text-white">{selectedTopic.title}</h3>
                    </div>

                    {/* Sub-Topics */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                        Sub-Topics & Key Concepts
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTopic.subTopics.map((sub, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Performance Objectives */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Behavioral Performance Objectives (Students should be able to):</span>
                      </h4>
                      <ul className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200">
                        {selectedTopic.performanceObjectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Content Details */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Curriculum Content Breakdown
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {selectedTopic.contentDetails.map((c, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-400 font-bold">▪</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pedagogical Activities (Teacher vs Student) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                          Teacher's Activities
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {selectedTopic.teacherActivities.map((act, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-blue-400">→</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                          Students' Activities
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {selectedTopic.studentActivities.map((act, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-400">→</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Teaching Materials & Evaluation Guide */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                          Teaching & Learning Materials (TLMs)
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {selectedTopic.teachingMaterials.map((mat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-purple-400">•</span>
                              <span>{mat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                          Evaluation & Assessment Guide
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {selectedTopic.evaluationGuide.map((evalG, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400">✓</span>
                              <span>{evalG}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Single Topic AI Action Bar */}
                    <div className="pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">
                        Generate instant educational materials for <strong className="text-white">{selectedTopic.title}</strong>:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onLaunchLessonPlan(subject, selectedTopic)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Lesson Plan</span>
                        </button>
                        <button
                          onClick={() => onLaunchExam(subject, selectedTopic)}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Build Exam Questions</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-850 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-500" />
                    <p className="text-sm">Select any topic from the themes list on the left to inspect detailed performance objectives and pedagogical guides.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <span>National Curriculum General Objectives for {subject.name}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As formulated by the Nigerian Educational Research and Development Council (NERDC), upon successful completion of the {subject.level === 'jss' ? 'Universal Basic Education' : 'Senior Secondary'} course in {subject.name}, learners should achieve the following overarching competences:
                </p>
                <div className="space-y-3 mt-4">
                  {subject.generalObjectives.map((obj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-sm"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'textbooks' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <span>NERDC & Ministry Approved Textbooks</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Standard curriculum textbooks recommended by the Federal Ministry of Education and NERDC:
                </p>
                <div className="space-y-2 mt-4">
                  {subject.recommendedTextbooks?.map((book, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-sm font-medium"
                    >
                      <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{book}</span>
                    </div>
                  )) || (
                    <p className="text-xs text-slate-400">Standard NERDC approved textbooks apply.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>NERDC Standard Database • Federal Republic of Nigeria</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
