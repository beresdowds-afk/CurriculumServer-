import React, { useState, useEffect } from 'react';
import { SubjectCurriculum, CurriculumTopic, LessonPlanResponse, ClassGrade, Term } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { 
  X, 
  Sparkles, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface LessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: SubjectCurriculum | null;
  initialTopic?: CurriculumTopic | null;
}

export const LessonPlanModal: React.FC<LessonPlanModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
  initialTopic,
}) => {
  if (!isOpen) return null;

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
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state when initial props change
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

  // When subject changes in dropdown, update available topics
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setError('Please provide a Topic Title.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeSubject.name,
          classGrade,
          topicTitle,
          subTopic,
          durationMinutes: duration,
          term,
          contextNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate lesson plan');
      }

      const data: LessonPlanResponse = await res.json();
      setLessonPlan(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the lesson plan.');
    } finally {
      setIsLoading(false);
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
${lessonPlan.teacherRemarks || 'Lesson successfully delivered.'}
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
                  Nigerian Standard
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generates complete, structured Nigerian lesson plans with Behavioral Objectives, Entry Behavior, Steps & Evaluation.
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

              {/* Subject Selection */}
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

              {/* Class Grade & Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Class</label>
                  <select
                    value={classGrade}
                    onChange={(e) => setClassGrade(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
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
                    value={term}
                    onChange={(e) => setTerm(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
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
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Generated Official NERDC Lesson Plan
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={handlePrint}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>

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
                      <strong>Teacher's Remarks:</strong> {lessonPlan.teacherRemarks || 'Lesson taught successfully.'}
                    </div>
                    <div className="font-mono">NERDC Approved Format</div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center min-h-[400px]">
                  <GraduationCap className="w-12 h-12 text-slate-600" />
                  <h4 className="text-base font-bold text-slate-200">
                    Ready to Generate Official Lesson Note
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    Select your subject, class level, and curriculum topic from the left panel, then click <strong>Generate Lesson Plan</strong> to produce a ready-to-teach Nigerian educational lesson note.
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
