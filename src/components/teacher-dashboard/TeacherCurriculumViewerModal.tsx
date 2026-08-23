import React, { useState, useMemo } from 'react';
import { 
  SubjectCurriculum, 
  CurriculumTopic, 
  CurriculumTheme, 
  Term, 
  ClassGrade,
  UserProfile 
} from '../../types';
import { NERDC_SUBJECTS_DATABASE } from '../../data/nerdcDatabase';
import { 
  X, 
  BookOpen, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  Layers, 
  Award, 
  Calendar, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Tag,
  Share2,
  FileCheck2
} from 'lucide-react';

interface TeacherCurriculumViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  assignedSubjectNames?: string[];
  onOpenLessonPlanWithTopic?: (subject: SubjectCurriculum, topic: CurriculumTopic) => void;
}

export const TeacherCurriculumViewerModal: React.FC<TeacherCurriculumViewerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  assignedSubjectNames = [],
  onOpenLessonPlanWithTopic
}) => {
  // Determine default active subject from teacher's assigned subjects
  const defaultSubjectId = useMemo(() => {
    if (assignedSubjectNames.length > 0) {
      const match = NERDC_SUBJECTS_DATABASE.find(s => 
        assignedSubjectNames.some(name => s.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.name.toLowerCase()))
      );
      if (match) return match.id;
    }
    return NERDC_SUBJECTS_DATABASE[0]?.id || 'jss-english-studies';
  }, [assignedSubjectNames]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId);
  const [selectedTerm, setSelectedTerm] = useState<Term | 'all'>('all');
  const [selectedGrade, setSelectedGrade] = useState<ClassGrade | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'scheme' | 'objectives' | 'textbooks' | 'gazette_updates'>('scheme');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Active Subject
  const activeSubject = useMemo(() => {
    return NERDC_SUBJECTS_DATABASE.find(s => s.id === selectedSubjectId) || NERDC_SUBJECTS_DATABASE[0];
  }, [selectedSubjectId]);

  // List of subjects available for this teacher: highlight their assigned ones
  const teacherAssignedSubjects = useMemo(() => {
    if (!assignedSubjectNames || assignedSubjectNames.length === 0) {
      return NERDC_SUBJECTS_DATABASE.slice(0, 3);
    }
    return NERDC_SUBJECTS_DATABASE.filter(s => 
      assignedSubjectNames.some(name => s.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.name.toLowerCase()))
    );
  }, [assignedSubjectNames]);

  // Filtered topics within active subject
  const filteredThemes = useMemo(() => {
    if (!activeSubject) return [];
    return activeSubject.themes.map(theme => {
      const matchingTopics = theme.topics.filter(topic => {
        if (selectedTerm !== 'all' && topic.term !== selectedTerm) return false;
        if (selectedGrade !== 'all' && topic.classGrade !== selectedGrade) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = topic.title.toLowerCase().includes(q);
          const matchSub = topic.subTopics.some(st => st.toLowerCase().includes(q));
          const matchObj = topic.performanceObjectives.some(po => po.toLowerCase().includes(q));
          if (!matchTitle && !matchSub && !matchObj) return false;
        }
        return true;
      });
      return {
        ...theme,
        topics: matchingTopics
      };
    }).filter(theme => theme.topics.length > 0);
  }, [activeSubject, selectedTerm, selectedGrade, searchQuery]);

  if (!isOpen) return null;

  const handlePrintScheme = () => {
    window.print();
  };

  const handleDownloadSchemeJSON = () => {
    if (!activeSubject) return;
    const payload = JSON.stringify(activeSubject, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NERDC-Curriculum-${activeSubject.code}-${activeSubject.level.toUpperCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadNotice(`Downloaded full ${activeSubject.name} curriculum package successfully.`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  const handleDownloadSchemeMarkdown = () => {
    if (!activeSubject) return;
    let md = `# OFFICIAL NERDC CURRICULUM & SCHEME OF WORK\n`;
    md += `**Subject:** ${activeSubject.name} (${activeSubject.code})\n`;
    md += `**Level:** ${activeSubject.level === 'jss' ? 'Universal Basic Education (JSS 1-3)' : 'Senior Secondary (SSS 1-3)'}\n`;
    md += `**Field:** ${activeSubject.field.toUpperCase()}\n`;
    md += `**Recommended Periods/Week:** ${activeSubject.recommendedPeriodsPerWeek} periods\n`;
    md += `**Official Gazette Source:** ${activeSubject.officialSourceUrl}\n\n`;
    md += `## General Learning Objectives\n`;
    activeSubject.generalObjectives.forEach(obj => {
      md += `- ${obj}\n`;
    });
    md += `\n---\n\n## 12-Week Term Schemes & Curricular Progression\n\n`;

    activeSubject.themes.forEach(theme => {
      md += `### Theme ${theme.themeNumber}: ${theme.title}\n`;
      md += `${theme.description}\n\n`;
      theme.topics.forEach(topic => {
        md += `#### Week ${topic.week} (${topic.term} • ${topic.classGrade}): ${topic.title}\n`;
        md += `**Subtopics:**\n`;
        topic.subTopics.forEach(st => md += `  - ${st}\n`);
        md += `**Performance Objectives:**\n`;
        topic.performanceObjectives.forEach(po => md += `  - ${po}\n`);
        md += `**Teacher Activities:**\n`;
        topic.teacherActivities.forEach(ta => md += `  - ${ta}\n`);
        md += `**Teaching Materials:**\n`;
        topic.teachingMaterials.forEach(tm => md += `  - ${tm}\n`);
        md += `**Evaluation Guide:**\n`;
        topic.evaluationGuide.forEach(eg => md += `  - ${eg}\n`);
        if (topic.examRelevance) {
          md += `**Exam Relevance:** ${JSON.stringify(topic.examRelevance)}\n`;
        }
        md += `\n`;
      });
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NERDC-Scheme-${activeSubject.name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadNotice(`Downloaded printable markdown syllabus for ${activeSubject.name}.`);
    setTimeout(() => setDownloadNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Teacher Curriculum & Scheme of Work Studio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Authoritative NERDC 2025/2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Federal Ministry of Education curriculum, 12-week Schemes of Work, and printable syllabus packages.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadNotice && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadNotice}</span>
          </div>
        )}

        {/* Modal Body: Left Subject Selector Sidebar & Right Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: Assigned Subjects & All Subjects */}
          <div className="w-full md:w-72 bg-slate-950/70 border-r border-slate-800 p-4 flex flex-col overflow-y-auto space-y-4">
            
            {/* Assigned to You Quick Filter */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>My Assigned Subjects ({teacherAssignedSubjects.length})</span>
              </div>
              <div className="space-y-1.5">
                {teacherAssignedSubjects.map(sub => {
                  const isSelected = sub.id === selectedSubjectId;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40' 
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <span className="block truncate">{sub.name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {sub.level === 'jss' ? 'Universal Basic' : 'Senior Secondary'}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {sub.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Browse All School Subjects */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>All 34 NERDC Subjects</span>
                <span className="font-mono text-[10px]">{NERDC_SUBJECTS_DATABASE.length}</span>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {NERDC_SUBJECTS_DATABASE.map(sub => {
                  const isSelected = sub.id === selectedSubjectId;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      <span className="text-[9px] text-slate-500 uppercase">{sub.level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-900/60 p-5 sm:p-6 space-y-5">
            
            {/* Subject Profile Header */}
            {activeSubject && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {activeSubject.level === 'jss' ? 'Universal Basic Education (JSS 1-3)' : 'Senior Secondary (SSS 1-3)'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {activeSubject.field.replace('_', ' ')}
                      </span>
                      {activeSubject.isCompulsory && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          National Compulsory Core
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        {activeSubject.code}
                      </span>
                    </div>

                    <h1 className="text-xl font-black text-white tracking-tight">
                      {activeSubject.name}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      {activeSubject.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>Periods/Week: <strong className="text-white">{activeSubject.recommendedPeriodsPerWeek} periods</strong></span>
                      <span>Target Grades: <strong className="text-white">{activeSubject.targetGrades.join(', ')}</strong></span>
                      <span>Themes: <strong className="text-white">{activeSubject.themes.length}</strong></span>
                      <span>Topics: <strong className="text-white">{activeSubject.themes.reduce((sum, t) => sum + t.topics.length, 0)}</strong></span>
                    </div>
                  </div>

                  {/* Download & Export Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <button
                      onClick={handleDownloadSchemeMarkdown}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/30"
                      title="Download clean printable Scheme of Work document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Scheme (Doc)</span>
                    </button>

                    <button
                      onClick={handleDownloadSchemeJSON}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      title="Export full syllabus data as JSON"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Export JSON</span>
                    </button>

                    <button
                      onClick={handlePrintScheme}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      title="Print Scheme of Work"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Sub-view navigation */}
                <div className="flex border-t border-slate-800/80 mt-4 pt-3 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveViewMode('scheme')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeViewMode === 'scheme'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    12-Week Scheme of Work
                  </button>

                  <button
                    onClick={() => setActiveViewMode('objectives')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeViewMode === 'objectives'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    National Objectives & Standards
                  </button>

                  <button
                    onClick={() => setActiveViewMode('textbooks')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeViewMode === 'textbooks'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Approved Textbooks & Lab Gear
                  </button>
                </div>
              </div>
            )}

            {/* Scheme of Work Tab Content */}
            {activeViewMode === 'scheme' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search syllabus topics & objectives..."
                      className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value as any)}
                      className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs"
                    >
                      <option value="all">All Terms (Term 1, 2, 3)</option>
                      <option value="Term 1">Term 1 (Autumn / Harmattan)</option>
                      <option value="Term 2">Term 2 (Spring / Lent)</option>
                      <option value="Term 3">Term 3 (Summer / Trinity)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as any)}
                      className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs"
                    >
                      <option value="all">All Target Grades</option>
                      {activeSubject?.targetGrades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Themes and Topics List */}
                <div className="space-y-4">
                  {filteredThemes.map(theme => (
                    <div 
                      key={theme.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                    >
                      {/* Theme Header */}
                      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                            {theme.themeNumber}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{theme.title}</h3>
                            <p className="text-[11px] text-slate-400">{theme.description}</p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
                          {theme.topics.length} Topic{theme.topics.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Topics Table / Cards */}
                      <div className="divide-y divide-slate-800/80">
                        {theme.topics.map(topic => {
                          const isExpanded = expandedTopicId === topic.id;

                          return (
                            <div key={topic.id} className="p-4 hover:bg-slate-900/40 transition-colors">
                              <div 
                                onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700 font-mono flex-shrink-0">
                                    Wk {topic.week}
                                  </span>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                                        {topic.title}
                                      </h4>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                        {topic.classGrade} • {topic.term}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {topic.subTopics.slice(0, 2).join('; ')}
                                      {topic.subTopics.length > 2 && '...'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {onOpenLessonPlanWithTopic && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenLessonPlanWithTopic(activeSubject, topic);
                                        onClose();
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                                      title="Generate official NERDC lesson note for this topic"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>Generate Note</span>
                                    </button>
                                  )}
                                  <span className="text-xs text-slate-500">
                                    {isExpanded ? '▲' : '▼'}
                                  </span>
                                </div>
                              </div>

                              {/* Expanded Topic Details */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs animate-fadeIn">
                                  {/* Subtopics */}
                                  <div>
                                    <span className="font-bold text-slate-300 block mb-1">Subtopics & Content Points:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                                      {topic.subTopics.map((st, i) => (
                                        <li key={i}>{st}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Objectives */}
                                  <div>
                                    <span className="font-bold text-emerald-400 block mb-1">Performance Objectives (Bloom's Taxonomy):</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                                      {topic.performanceObjectives.map((po, i) => (
                                        <li key={i}>{po}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Teaching Materials & Activities */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="font-bold text-slate-300 block mb-1">Teacher & Student Activities:</span>
                                      <p className="text-slate-400 leading-relaxed">
                                        {topic.teacherActivities.join(' ')}
                                      </p>
                                    </div>

                                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="font-bold text-slate-300 block mb-1">Instructional Materials & Aids:</span>
                                      <p className="text-slate-400 leading-relaxed">
                                        {topic.teachingMaterials.join(', ')}
                                      </p>
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
            )}

            {/* Objectives View */}
            {activeViewMode === 'objectives' && activeSubject && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>General Curricular Objectives (National Standards)</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {activeSubject.generalObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Textbooks and Lab Requirements View */}
            {activeViewMode === 'textbooks' && activeSubject && (
              <div className="space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Ministry Approved Textbooks & References</span>
                  </h3>
                  {activeSubject.recommendedTextbooks && activeSubject.recommendedTextbooks.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-300">
                      {activeSubject.recommendedTextbooks.map((tb, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <span>{tb}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Official NERDC/STAN approved textbooks: Standard National Curriculum Series (1st - 3rd Edition).
                    </p>
                  )}
                </div>

                {activeSubject.equipmentAndLabRequirements && activeSubject.equipmentAndLabRequirements.length > 0 && (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Laboratory & Workshop Equipment Requirements</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeSubject.equipmentAndLabRequirements.map((eq, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                          <span>{eq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
