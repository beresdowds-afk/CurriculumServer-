import React, { useState, useEffect } from 'react';
import { SubjectCurriculum, CurriculumTopic, LessonPlanResponse, ClassGrade, Term } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { aiGatewayClient } from '../services/aiGatewayClient';
import { unifiedApiClient } from '../services/unifiedApiClient';
import {
  teachingEvidenceApiClient,
  type TeacherSubjectAssignmentDto,
  type ResolvedCurriculumTopicDto,
  type LessonNoteRecordDto
} from '../services/teachingEvidenceApiClient';
import {
  X,
  Sparkles,
  Printer,
  Copy,
  Check,
  FileText,
  GraduationCap,
  Loader2,
  AlertCircle,
  BookmarkCheck,
  Info
} from 'lucide-react';

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: SubjectCurriculum | null;
  initialTopic?: CurriculumTopic | null;
  initialAssignmentId?: string;
  onLessonNoteSaved?: (note: LessonNoteRecordDto) => void;
}

export const LessonPlanModal: React.FC<LessonPlanModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
  initialTopic,
  initialAssignmentId,
  onLessonNoteSaved
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubject?.id || NERDC_SUBJECTS_DATABASE[0].id
  );

  const activeSubject = NERDC_SUBJECTS_DATABASE.find((s) => s.id === selectedSubjectId) || NERDC_SUBJECTS_DATABASE[0];

  const [classGrade, setClassGrade] = useState<ClassGrade>(
    initialTopic?.classGrade || activeSubject.targetGrades[0] || 'SS 1'
  );
  const [topicTitle, setTopicTitle] = useState<string>(
    initialTopic?.title || activeSubject.themes[0]?.topics[0]?.title || ''
  );
  const [subTopic, setSubTopic] = useState<string>(
    initialTopic?.subTopics?.join(', ') || ''
  );
  const [term, setTerm] = useState<Term>(initialTopic?.term || 'Term 1');
  const [duration, setDuration] = useState<number>(40);
  const [contextNotes, setContextNotes] = useState<string>(
    'Emphasize hands-on student involvement, everyday Nigerian illustrations, and Bloom taxonomy action verbs.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanResponse | null>(null);
  const [lastGatewayRequestId, setLastGatewayRequestId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Authoritative assignment & curriculum resolution context
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [assignments, setAssignments] = useState<TeacherSubjectAssignmentDto[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || '');
  const [assignmentTopics, setAssignmentTopics] = useState<ResolvedCurriculumTopicDto[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    let active = true;
    setIsLoadingAssignments(true);
    teachingEvidenceApiClient
      .listAssignments({ status: 'active' })
      .then((list) => {
        if (!active) return;
        setAssignments(list);
        if (initialAssignmentId && list.some((a) => a.id === initialAssignmentId)) {
          setSelectedAssignmentId(initialAssignmentId);
        } else if (list.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(list[0].id);
        }
      })
      .catch(() => {
        if (active) setAssignments([]);
      })
      .finally(() => {
        if (active) setIsLoadingAssignments(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isAuthenticated, initialAssignmentId]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !selectedAssignmentId) {
      setAssignmentTopics([]);
      return;
    }
    let active = true;
    const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId);
    if (activeAssignment) {
      setClassGrade((activeAssignment.classGradeName as ClassGrade) || classGrade);
      setTerm((activeAssignment.term as Term) || term);
    }

    teachingEvidenceApiClient
      .listCurriculumTopicsForAssignment(selectedAssignmentId)
      .then((topics) => {
        if (!active) return;
        setAssignmentTopics(topics);
        if (topics.length > 0) {
          setSelectedTopicId(topics[0].topicId);
          setTopicTitle(topics[0].topicTitle);
          setSubTopic(topics[0].subtopics.map((s) => s.title).join(', '));
          setSelectedObjectiveIds(topics[0].objectives.map((o) => o.id));
        } else {
          setSelectedTopicId('');
          setSelectedObjectiveIds([]);
        }
      })
      .catch(() => {
        if (active) setAssignmentTopics([]);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isAuthenticated, selectedAssignmentId, assignments]);

  useEffect(() => {
    if (initialSubject) {
      setSelectedSubjectId(initialSubject.id);
      setClassGrade(initialTopic?.classGrade || initialSubject.targetGrades[0]);
    }
    if (initialTopic) {
      setTopicTitle(initialTopic.title);
      setSubTopic(initialTopic.subTopics.join(', '));
      setTerm(initialTopic.term);
      setClassGrade(initialTopic.classGrade);
    }
  }, [initialSubject, initialTopic]);

  if (!isOpen) return null;

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null;
  const activeResolvedTopic = assignmentTopics.find((t) => t.topicId === selectedTopicId) || null;

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    const sub = NERDC_SUBJECTS_DATABASE.find((s) => s.id === newSubjectId);
    if (sub) {
      setClassGrade(sub.targetGrades[0]);
      const firstTop = sub.themes[0]?.topics[0];
      if (firstTop) {
        setTopicTitle(firstTop.title);
        setSubTopic(firstTop.subTopics.join(', '));
        setTerm(firstTop.term);
      }
    }
  };

  const handleAssignmentTopicChange = (newTopicId: string) => {
    setSelectedTopicId(newTopicId);
    const found = assignmentTopics.find((t) => t.topicId === newTopicId);
    if (found) {
      setTopicTitle(found.topicTitle);
      setSubTopic(found.subtopics.map((s) => s.title).join(', '));
      setSelectedObjectiveIds(found.objectives.map((o) => o.id));
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setError('Please provide a Topic Title.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSavedNotice(null);
    setSaveError(null);

    try {
      const subjectName = activeAssignment?.subjectName || activeSubject.name;
      const result = await aiGatewayClient.generateCurriculum<LessonPlanResponse>({
        capability: 'LESSON_GENERATION',
        taskType: 'lesson_note',
        payload: {
          subjectName,
          classGrade: activeAssignment?.classGradeName || classGrade,
          topicTitle,
          subTopic,
          durationMinutes: duration,
          term: activeAssignment?.term || term,
          contextNotes
        }
      });

      setLessonPlan(result.data);
      setLastGatewayRequestId(result.requestId || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the lesson plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToAssignment = async () => {
    if (!lessonPlan || !selectedAssignmentId) return;
    setIsSavingNote(true);
    setSaveError(null);
    setSavedNotice(null);
    try {
      const res = await teachingEvidenceApiClient.createLessonNote({
        assignmentId: selectedAssignmentId,
        topicId: selectedTopicId || null,
        topicTitle: lessonPlan.topic || topicTitle,
        objectiveIds: selectedObjectiveIds,
        title: `${lessonPlan.subject || activeAssignment?.subjectName || 'Lesson'}: ${lessonPlan.topic || topicTitle}`,
        noteContent: lessonPlan as unknown as Record<string, unknown>,
        generationSource: lastGatewayRequestId ? 'ai_gateway' : 'teacher_authored',
        aiGatewayRequestId: lastGatewayRequestId
      });
      setSavedNotice(
        `${res.notice} (Record ID: ${res.lessonNote.id}, countsAsTaught=${String(res.countsAsTaught)})`
      );
      if (onLessonNoteSaved) {
        onLessonNoteSaved(res.lessonNote);
      }
    } catch (err: any) {
      setSaveError(err?.error || err?.message || 'Failed to save lesson note to assignment.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCopy = () => {
    if (!lessonPlan) return;
    const formatted = `
FEDERAL REPUBLIC OF NIGERIA - NERDC LESSON PLAN
=====================================================
SUBJECT: ${lessonPlan.subject}
CLASS: ${lessonPlan.classGrade} | TERM: ${lessonPlan.term} | DURATION: ${lessonPlan.duration}
TOPIC: ${lessonPlan.topic}
SUB-TOPIC: ${lessonPlan.subTopic}
AVERAGE AGE: ${lessonPlan.averageAge}

BEHAVIORAL OBJECTIVES:
${lessonPlan.behavioralObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

PREVIOUS KNOWLEDGE:
${lessonPlan.previousKnowledge}

INSTRUCTIONAL MATERIALS:
${lessonPlan.instructionalMaterials.map((m) => `• ${m}`).join('\n')}

REFERENCE BOOKS:
${lessonPlan.referenceBooks?.map((b) => `• ${b}`).join('\n')}

INTRODUCTION (${lessonPlan.introduction?.duration}):
${lessonPlan.introduction?.activity}

PRESENTATION STEPS:
${lessonPlan.presentationSteps
  .map(
    (s) => `
Step ${s.stepNumber}: ${s.title} (${s.durationMinutes} mins)
- Teacher Activity: ${s.teacherActivity}
- Student Activity: ${s.studentActivity}
- Learning Point: ${s.learningPoint}`
  )
  .join('\n')}

EVALUATION QUESTIONS:
${lessonPlan.evaluationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

SUMMARY & CONCLUSION:
${lessonPlan.summaryAndConclusion}

ASSIGNMENT / HOMEWORK:
${lessonPlan.assignment.map((a, i) => `${i + 1}. ${a}`).join('\n')}

TEACHER'S REMARKS:
${lessonPlan.teacherRemarks || 'Lesson preparation draft.'}
    `;

    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="lesson-plan-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Official NERDC Lesson Plan Generator</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Preparation Artifact Only
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generates structured Nigerian lesson plans. Saving or viewing a lesson note does not mark the topic as taught.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-Evidence Authority Notice */}
        <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-800/40 text-[11px] text-amber-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Strict Evidence Separation:</strong> Lesson note generation and saving create preparation records with <code className="font-mono text-amber-300">countsAsTaught = false</code>. Teachers must confirm actual classroom teaching in the Delivery Tracker before topics appear in progress or assessments.
          </span>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form Column */}
            <form
              onSubmit={handleGenerate}
              className="lg:col-span-4 bg-slate-850 p-5 rounded-xl border border-slate-700/80 space-y-4 shadow-sm"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Lesson Parameters
              </h3>

              {/* Active Teaching Assignment Picker (Authenticated Session) */}
              {isAuthenticated && (
                <div className="space-y-1.5 bg-slate-900/70 p-3 rounded-lg border border-slate-700/70">
                  <label className="block text-[11px] font-semibold text-emerald-300">
                    Active Teaching Assignment
                  </label>
                  {isLoadingAssignments ? (
                    <div className="text-[11px] text-slate-400">Loading active assignments...</div>
                  ) : assignments.length > 0 ? (
                    <select
                      value={selectedAssignmentId}
                      onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      {assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.subjectName} — {a.classGradeName} {a.section} ({a.term}, {a.academicSession})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-amber-300">
                      No active teacher subject assignments found. Preview parameters remain editable below.
                    </div>
                  )}

                  {activeAssignment && (
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Curriculum Version: {activeAssignment.curriculumVersionId}
                    </div>
                  )}

                  {assignmentTopics.length > 0 && (
                    <div className="pt-1.5">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        NERDC Topic (Version-Pinned)
                      </label>
                      <select
                        value={selectedTopicId}
                        onChange={(e) => handleAssignmentTopicChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs"
                      >
                        {assignmentTopics.map((t) => (
                          <option key={t.topicId} value={t.topicId}>
                            Wk {t.week}: {t.topicTitle}
                          </option>
                        ))}
                      </select>
                      {activeResolvedTopic && activeResolvedTopic.objectives.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          {selectedObjectiveIds.length} curriculum learning objectives linked
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fallback Subject Selection when no active assignment */}
              {!activeAssignment && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    {NERDC_SUBJECTS_DATABASE.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.level.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class Grade & Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Class</label>
                  <select
                    value={activeAssignment?.classGradeName || classGrade}
                    disabled={Boolean(activeAssignment)}
                    onChange={(e) => setClassGrade(e.target.value as ClassGrade)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                  >
                    {activeSubject.targetGrades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Term</label>
                  <select
                    value={activeAssignment?.term || term}
                    disabled={Boolean(activeAssignment)}
                    onChange={(e) => setTerm(e.target.value as Term)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 disabled:opacity-70"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={40}>Single Period (40 mins)</option>
                  <option value={80}>Double Period (80 mins)</option>
                </select>
              </div>

              {/* Topic Title */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic Title</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. Surds and Radicals"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Sub-Topics */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sub-Topics</label>
                <input
                  type="text"
                  value={subTopic}
                  onChange={(e) => setSubTopic(e.target.value)}
                  placeholder="e.g. Conjugate surds, Rationalisation"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Context notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teaching Focus</label>
                <textarea
                  rows={2}
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Structuring Nigerian Lesson Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Lesson Plan</span>
                  </>
                )}
              </button>
            </form>

            {/* Output Display Column */}
            <div className="lg:col-span-8">
              {lessonPlan ? (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-6 space-y-6 text-slate-200 shadow-lg print:text-black print:bg-white">
                  {/* Top Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Generated Official NERDC Lesson Plan
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isAuthenticated && selectedAssignmentId && (
                        <button
                          type="button"
                          onClick={handleSaveToAssignment}
                          disabled={isSavingNote}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          {isSavingNote ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Save Lesson Note (Not Taught)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrint}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>

                  {savedNotice && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs">
                      {savedNotice}
                    </div>
                  )}
                  {saveError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/60 text-rose-200 text-xs">
                      {saveError}
                    </div>
                  )}

                  {/* Lesson Note Formal Table Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Subject</span>
                      <span className="font-bold text-slate-100">{lessonPlan.subject}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Class & Term</span>
                      <span className="font-bold text-slate-100">{lessonPlan.classGrade} • {lessonPlan.term}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                      <span className="font-bold text-slate-100">{lessonPlan.duration}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Average Age</span>
                      <span className="font-bold text-slate-100">{lessonPlan.averageAge}</span>
                    </div>
                  </div>

                  {/* Topic & Subtopic */}
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/40">
                    <h4 className="text-base font-extrabold text-emerald-300">
                      TOPIC: {lessonPlan.topic}
                    </h4>
                    {lessonPlan.subTopic && (
                      <p className="text-xs text-slate-300 mt-1">
                        <strong className="text-slate-400">SUB-TOPIC:</strong> {lessonPlan.subTopic}
                      </p>
                    )}
                  </div>

                  {/* Behavioral Objectives */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      1. Behavioral Objectives
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      By the end of the lesson, the students should be able to:
                    </p>
                    <ul className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                      {lessonPlan.behavioralObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">{idx + 1}.</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Previous Knowledge & Instructional Materials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <h5 className="font-bold text-blue-300 uppercase tracking-wide">
                        2. Previous Knowledge / Entry Behavior
                      </h5>
                      <p className="text-slate-300">{lessonPlan.previousKnowledge}</p>
                    </div>

                    <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <h5 className="font-bold text-purple-300 uppercase tracking-wide">
                        3. Instructional Materials
                      </h5>
                      <ul className="space-y-1 text-slate-300">
                        {lessonPlan.instructionalMaterials.map((mat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="text-purple-400">•</span>
                            <span>{mat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Presentation Steps Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      4. Step-by-Step Presentation
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-700/80 rounded-xl overflow-hidden">
                        <thead className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5 border-b border-slate-700">Step</th>
                            <th className="p-2.5 border-b border-slate-700">Duration</th>
                            <th className="p-2.5 border-b border-slate-700">Teacher's Activities</th>
                            <th className="p-2.5 border-b border-slate-700">Students' Activities</th>
                            <th className="p-2.5 border-b border-slate-700">Learning Point</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/80">
                          {lessonPlan.presentationSteps.map((step) => (
                            <tr key={step.stepNumber} className="hover:bg-slate-850">
                              <td className="p-2.5 font-bold text-emerald-400 align-top">
                                Step {step.stepNumber}
                              </td>
                              <td className="p-2.5 text-slate-400 align-top">
                                {step.durationMinutes} mins
                              </td>
                              <td className="p-2.5 text-slate-200 align-top">
                                {step.teacherActivity}
                              </td>
                              <td className="p-2.5 text-slate-300 align-top">
                                {step.studentActivity}
                              </td>
                              <td className="p-2.5 text-slate-400 align-top font-medium">
                                {step.learningPoint}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formative Evaluation */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                      5. Evaluation Questions (Class Assessment)
                    </h4>
                    <ul className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                      {lessonPlan.evaluationQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold">{idx + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Homework Assignment */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                      6. Homework / Take-Home Assignment
                    </h4>
                    <ul className="space-y-1.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                      {lessonPlan.assignment.map((a, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Remarks */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div>
                      <strong>Teacher's Remarks:</strong> {lessonPlan.teacherRemarks || 'Lesson plan drafted for preparation.'}
                    </div>
                    <div className="font-mono">countsAsTaught = false</div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center min-h-[400px]">
                  <GraduationCap className="w-12 h-12 text-slate-600" />
                  <h4 className="text-base font-bold text-slate-200">
                    Ready to Generate Official Lesson Note
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    Select your active teaching assignment or subject, class level, and curriculum topic from the left panel, then click <strong>Generate Lesson Plan</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
