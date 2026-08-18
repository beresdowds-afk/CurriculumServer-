import React, { useState, useEffect } from 'react';
import { SubjectCurriculum, CurriculumTopic, ExamQuestion, ClassGrade } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  Printer, 
  Copy, 
  Check, 
  Loader2, 
  Award,
  AlertCircle
} from 'lucide-react';

interface ExamBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: SubjectCurriculum | null;
  initialTopic?: CurriculumTopic | null;
}

export const ExamBuilderModal: React.FC<ExamBuilderModalProps> = ({
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
  const [targetExam, setTargetExam] = useState<'WAEC' | 'NECO' | 'BECE' | 'JAMB'>(
    activeSubject.level === 'jss' ? 'BECE' : 'WAEC'
  );
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'theory' | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qNum: number]: string }>({});
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubject) {
      setSelectedSubjectId(initialSubject.id);
      setClassGrade(initialTopic?.classGrade || initialSubject.targetGrades[0]);
      setTargetExam(initialSubject.level === 'jss' ? 'BECE' : 'WAEC');
    }
    if (initialTopic) {
      setTopicTitle(initialTopic.title);
      setClassGrade(initialTopic.classGrade);
    }
  }, [initialSubject, initialTopic]);

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setError('Please provide a Topic Title.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});
    setShowAnswers(false);

    try {
      const res = await fetch('/api/ai/exam-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeSubject.name,
          classGrade,
          topicTitle,
          targetExam,
          count: questionCount,
          questionType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate questions');
      }

      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (qNum: number, optionKey: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qNum]: optionKey }));
  };

  const handleCopy = () => {
    if (!questions) return;
    const text = `
${targetExam} EXAMINATION QUESTIONS - ${activeSubject.name.toUpperCase()}
TOPIC: ${topicTitle} | CLASS: ${classGrade}
============================================================

${questions
  .map(
    (q) => `
Q${q.questionNumber}. (${q.questionType.toUpperCase()} - ${q.difficulty})
${q.questionText}
${
  q.options
    ? q.options.map((opt) => `  [${opt.key}] ${opt.text}`).join('\n')
    : ''
}

ANSWER / MARKING SCHEME:
Correct: ${q.correctAnswer}
Explanation / Scheme: ${q.markingScheme || q.explanation}
------------------------------------------------------------`
  )
  .join('\n')}
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="exam-builder-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>WAEC / NECO / BECE / JAMB Question Builder</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Curriculum Aligned
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generates authentic exam-standard multiple choice & theory questions with full marking guides.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Configuration Form */}
          <form
            onSubmit={handleGenerateQuestions}
            className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const sub = NERDC_SUBJECTS_DATABASE.find((s) => s.id === e.target.value);
                  if (sub) {
                    setClassGrade(sub.targetGrades[0]);
                    setTargetExam(sub.level === 'jss' ? 'BECE' : 'WAEC');
                    const fTop = sub.themes[0]?.topics[0];
                    if (fTop) setTopicTitle(fTop.title);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
              >
                {NERDC_SUBJECTS_DATABASE.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.level.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Class</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
              >
                {activeSubject.targetGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Exam Body</label>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
              >
                <option value="WAEC">WAEC (WASSCE)</option>
                <option value="NECO">NECO (SSCE)</option>
                <option value="BECE">BECE (Junior WAEC)</option>
                <option value="JAMB">JAMB (UTME)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
              >
                <option value="mixed">Mixed (Objective & Theory)</option>
                <option value="multiple_choice">Multiple Choice Only</option>
                <option value="theory">Theory / Essay Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Curriculum Topic</label>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g. Projectile Motion, Surds, Osmosis..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Questions</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Questions Display */}
          {questions ? (
            <div className="space-y-4">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-850 p-4 rounded-xl border border-slate-700/80">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {targetExam} Standard Exam: {activeSubject.name} — {topicTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {questions.length} Questions Generated • {classGrade} Standard
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      showAnswers
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {showAnswers ? 'Hide Marking Guide' : 'Reveal Answers & Scheme'}
                  </button>

                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Question Items List */}
              <div className="space-y-4">
                {questions.map((q) => (
                  <div
                    key={q.questionNumber}
                    className="bg-slate-850 border border-slate-700/80 rounded-xl p-5 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                          {q.questionNumber}
                        </span>
                        <span>Question {q.questionNumber}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                          {q.questionType}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            q.difficulty === 'Hard'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : q.difficulty === 'Medium'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-200 leading-relaxed pl-8">
                      {q.questionText}
                    </p>

                    {/* Options if Multiple Choice */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 pt-2">
                        {q.options.map((opt) => {
                          const isSelected = selectedAnswers[q.questionNumber] === opt.key;
                          const isCorrect = showAnswers && opt.key === q.correctAnswer;
                          const isWrong = showAnswers && isSelected && !isCorrect;

                          return (
                            <button
                              key={opt.key}
                              onClick={() => handleSelectOption(q.questionNumber, opt.key)}
                              className={`p-2.5 rounded-lg text-left transition-all flex items-start gap-2 border ${
                                isCorrect
                                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-100 font-semibold'
                                  : isWrong
                                  ? 'bg-rose-600/20 border-rose-500 text-rose-200'
                                  : isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-purple-100'
                                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="font-bold text-xs text-purple-400">[{opt.key}]</span>
                              <span className="text-xs">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Marking Scheme and Explanation */}
                    {showAnswers && (
                      <div className="mt-3 ml-8 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct Answer / Solution: {q.correctAnswer}</span>
                        </div>
                        {q.markingScheme && (
                          <div className="text-slate-300">
                            <strong className="text-slate-400">Examiner's Marking Scheme:</strong>{' '}
                            {q.markingScheme}
                          </div>
                        )}
                        {q.explanation && (
                          <div className="text-slate-400">
                            <strong className="text-slate-300">Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-850 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center min-h-[300px]">
              <Award className="w-12 h-12 text-slate-600" />
              <h4 className="text-base font-bold text-slate-200">
                WAEC / NECO / BECE / JAMB Question Generator
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Configure your subject, target exam body, and topic above to generate official standard examination questions and marking guides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
