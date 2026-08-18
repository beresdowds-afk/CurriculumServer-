import React, { useState, useMemo } from 'react';
import { 
  SubjectCurriculum, 
  CurriculumTopic, 
  EducationLevel, 
  SubjectField, 
  ClassGrade 
} from '../types';
import { 
  BookOpen, 
  Search, 
  GraduationCap, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  Award,
  HelpCircle,
  Tag
} from 'lucide-react';

interface CurriculumExplorerTabProps {
  subjects: SubjectCurriculum[];
  onOpenLessonPlan: (subject: SubjectCurriculum, topic?: CurriculumTopic) => void;
  onOpenScheme: (subject: SubjectCurriculum) => void;
  onOpenVariableQuestions: (subject: SubjectCurriculum, topic?: CurriculumTopic) => void;
  onOpenTaughtAssessment: (subject: SubjectCurriculum) => void;
}

export const CurriculumExplorerTab: React.FC<CurriculumExplorerTabProps> = ({
  subjects,
  onOpenLessonPlan,
  onOpenScheme,
  onOpenVariableQuestions,
  onOpenTaughtAssessment,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('all');
  const [selectedField, setSelectedField] = useState<SubjectField | 'all'>('all');
  const [selectedGrade, setSelectedGrade] = useState<ClassGrade | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      if (selectedLevel !== 'all' && subject.level !== selectedLevel) return false;
      if (selectedField !== 'all' && subject.field !== selectedField) return false;
      if (selectedGrade !== 'all' && !subject.targetGrades.includes(selectedGrade)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = subject.name.toLowerCase().includes(q);
        const matchesCode = subject.code.toLowerCase().includes(q);
        const matchesDesc = subject.description.toLowerCase().includes(q);
        const matchesThemes = subject.themes.some(t => 
          t.title.toLowerCase().includes(q) ||
          t.topics.some(top => 
            top.title.toLowerCase().includes(q) ||
            top.subTopics.some(st => st.toLowerCase().includes(q)) ||
            top.performanceObjectives.some(po => po.toLowerCase().includes(q))
          )
        );
        if (!matchesName && !matchesCode && !matchesDesc && !matchesThemes) return false;
      }
      return true;
    });
  }, [subjects, selectedLevel, selectedField, selectedGrade, searchQuery]);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || filteredSubjects[0] || subjects[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              <span>National Academic Curriculum Repository (Source of Truth)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Official NERDC Curricular Structure & Learning Objectives
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strictly authoritative: The AI generates lesson notes, questions, and tests solely within these verified objectives, subtopics, and teaching guidelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-medium">
              {filteredSubjects.length} of {subjects.length} Subjects Loaded
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          {/* Level */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Education Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as EducationLevel)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Levels (JSS 1 - SSS 3)</option>
              <option value="jss">Universal Basic (JSS 1 - 3)</option>
              <option value="sss">Senior Secondary (SSS 1 - 3)</option>
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Target Class Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as ClassGrade | 'all')}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Grades</option>
              <option value="JSS 1">JSS 1 (Basic 7)</option>
              <option value="JSS 2">JSS 2 (Basic 8)</option>
              <option value="JSS 3">JSS 3 (Basic 9)</option>
              <option value="SS 1">SS 1 (Senior 1)</option>
              <option value="SS 2">SS 2 (Senior 2)</option>
              <option value="SS 3">SS 3 (Senior 3)</option>
            </select>
          </div>

          {/* Field */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Academic Field</label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value as SubjectField | 'all')}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Fields</option>
              <option value="core">Compulsory Core</option>
              <option value="science_math">Science & Mathematics</option>
              <option value="humanities">Humanities & Languages</option>
              <option value="business">Business Studies</option>
              <option value="technology">Technology & Technical</option>
              <option value="trade_entrepreneurship">Trade & Entrepreneurship (34 Subjects)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="text-slate-400 font-medium block mb-1">Search Syllabus Topics</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Quadratic, Photosynthesis..."
                className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Subject Selector Sidebar + Detailed Syllabus View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Subjects List */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[800px] overflow-y-auto custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Curriculum Subjects ({filteredSubjects.length})
          </span>

          {filteredSubjects.map((sub) => {
            const isSelected = activeSubject && activeSubject.id === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedSubjectId(sub.id);
                  setExpandedTopicId(null);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                    : 'bg-slate-850/50 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{sub.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {sub.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1">
                    <span className="capitalize">{sub.level.toUpperCase()}</span>
                    <span>•</span>
                    <span>{sub.themes.reduce((acc, t) => acc + t.topics.length, 0)} Topics</span>
                    {sub.isCompulsory && (
                      <span className="text-emerald-400 font-semibold">• Compulsory</span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 mt-1 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'}`} />
              </button>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No subjects found matching your active filter.
            </div>
          )}
        </div>

        {/* Right Area: Active Subject Detailed Syllabus & Themes */}
        {activeSubject && (
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Subject Overview Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-xs font-bold">
                    {activeSubject.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium capitalize">
                    {activeSubject.level === 'jss' ? 'Universal Basic Education' : 'Senior Secondary'}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">{activeSubject.name}</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">{activeSubject.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start">
                <button
                  onClick={() => onOpenLessonPlan(activeSubject)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Lesson</span>
                </button>

                <button
                  onClick={() => onOpenScheme(activeSubject)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>12-Wk Scheme</span>
                </button>

                <button
                  onClick={() => onOpenTaughtAssessment(activeSubject)}
                  className="px-3 py-1.5 rounded-xl bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-800 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Taught Test</span>
                </button>
              </div>
            </div>

            {/* Official Source & Recommended Textbooks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Official NERDC Curriculum Source</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Governing standard for WAEC, NECO, BECE and JAMB UTME.
                </p>
                <a
                  href={activeSubject.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
                >
                  <span>Verify at nerdc.gov.ng</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Approved Textbook Series</span>
                </span>
                <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                  {activeSubject.recommendedTextbooks?.map((tb, idx) => (
                    <li key={idx} className="truncate">{tb}</li>
                  )) || <li>Official Ministry of Education approved course books.</li>}
                </ul>
              </div>
            </div>

            {/* Themes & Topics Accordion */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                Curriculum Themes & Weekly Modules ({activeSubject.themes.length} Themes)
              </h3>

              <div className="space-y-4">
                {activeSubject.themes.map((theme) => (
                  <div key={theme.id} className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-xs">
                          {theme.themeNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{theme.title}</h4>
                          <p className="text-xs text-slate-400">{theme.description}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {theme.topics.length} Syllabus Units
                      </span>
                    </div>

                    {/* Topics inside theme */}
                    <div className="space-y-2 pt-2">
                      {theme.topics.map((topic) => {
                        const isExpanded = expandedTopicId === topic.id;
                        return (
                          <div
                            key={topic.id}
                            className="bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden transition-all"
                          >
                            <div
                              onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                                  Week {topic.week} • {topic.classGrade}
                                </span>
                                <span className="text-xs font-bold text-slate-200">{topic.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                  {topic.performanceObjectives.length} Objectives
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                              </div>
                            </div>

                            {/* Expanded Topic Details */}
                            {isExpanded && (
                              <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-4 text-xs animate-fadeIn">
                                {/* Subtopics & Objectives */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <span className="font-bold text-slate-300 block">Subtopics:</span>
                                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                                      {topic.subTopics.map((st, i) => (
                                        <li key={i}>{st}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="font-bold text-emerald-300 block">Performance Objectives (Bloom's Taxonomy):</span>
                                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                                      {topic.performanceObjectives.map((po, i) => (
                                        <li key={i}>{po}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* Teacher & Student Activities */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                                  <div className="space-y-1">
                                    <span className="font-bold text-blue-300 block">Teacher's Activities:</span>
                                    <p className="text-slate-400 text-[11px] leading-relaxed">
                                      {topic.teacherActivities.join(' ')}
                                    </p>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="font-bold text-purple-300 block">Student's Activities:</span>
                                    <p className="text-slate-400 text-[11px] leading-relaxed">
                                      {topic.studentActivities.join(' ')}
                                    </p>
                                  </div>
                                </div>

                                {/* Bottom Topic Action Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Exam Target: {topic.examRelevance?.waec ? 'WAEC WASSCE' : 'BECE Basic'}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onOpenLessonPlan(activeSubject, topic)}
                                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all"
                                    >
                                      Draft Lesson for Week {topic.week}
                                    </button>

                                    <button
                                      onClick={() => onOpenVariableQuestions(activeSubject, topic)}
                                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] transition-all"
                                    >
                                      Generate Variants
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
