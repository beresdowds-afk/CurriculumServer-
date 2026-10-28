import React, { useState } from 'react';
import { 
  UserProfile, 
  QuestionBankItem, 
  QuestionCognitiveLevel, 
  QuestionType,
  ClassGrade
} from '../types';
import { 
  Layers, 
  Sparkles, 
  Search, 
  Plus, 
  CheckCircle2, 
  Copy, 
  Check, 
  RefreshCw, 
  Filter, 
  BookOpen, 
  HelpCircle,
  Award,
  FlaskConical
} from 'lucide-react';

interface QuestionBankTabProps {
  currentUser: UserProfile;
  questionBank: QuestionBankItem[];
  onAddQuestion: (item: QuestionBankItem) => void;
}

export const QuestionBankTab: React.FC<QuestionBankTabProps> = ({
  currentUser,
  questionBank,
  onAddQuestion
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCognitive, setSelectedCognitive] = useState<string>('all');
  const [activeQuestionId, setActiveQuestionId] = useState<string>(questionBank[0]?.id || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Variable Question Engine Modal/State
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<any[] | null>(null);

  const filteredQuestions = questionBank.filter((q) => {
    const subj = q.subjectName || q.subject;
    const cog = q.cognitiveLevel || q.bloomsLevel;
    const promptText = q.prompt || q.questionText;
    const topicText = q.topicTitle || q.topic;
    const objText = q.learningObjective || q.curriculumObjective;

    if (selectedSubject !== 'all' && subj !== selectedSubject) return false;
    if (selectedCognitive !== 'all' && cog !== selectedCognitive) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesPrompt = promptText.toLowerCase().includes(query);
      const matchesTopic = topicText.toLowerCase().includes(query);
      const matchesObjective = objText.toLowerCase().includes(query);
      if (!matchesPrompt && !matchesTopic && !matchesObjective) return false;
    }
    return true;
  });

  const activeQuestion = questionBank.find(q => q.id === activeQuestionId) || filteredQuestions[0] || questionBank[0];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateVariations = async (item: QuestionBankItem) => {
    setIsGeneratingVariants(true);
    setGeneratedVariants(null);

    const subj = item.subjectName || item.subject;
    const topic = item.topicTitle || item.topic;
    const obj = item.learningObjective || item.curriculumObjective;
    const promptText = item.prompt || item.questionText;
    const qType = item.type || item.questionType;

    try {
      const response = await fetch('/api/ai/variable-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subj,
          classGrade: item.classGrade,
          topicTitle: topic,
          learningObjective: obj,
          baseQuestionPrompt: promptText,
          questionType: qType,
          variantCount: 3
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate question variations');
      }

      const data = await response.json();
      setGeneratedVariants(data.variations || []);
    } catch (err) {
      console.error('Variable question error:', err);
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Syllabus-Aligned Question Bank & Item Repository</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Curricular Question Bank & Variable Question Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strictly tagged to NERDC learning objectives and Bloom's taxonomy. The <strong className="text-slate-200">Variable Question Engine</strong> generates parallel forms for continuous assessment, mock tests, and exams without leak risk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-medium">
              {questionBank.length} Standardized Items
            </span>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/v1/question-bank/seed-theory-questions', { method: 'POST' });
                  const data = await res.json();
                  if (data.success && data.questions) {
                    data.questions.forEach((q: any) => onAddQuestion(q));
                    alert(`Successfully seeded ${data.questions.length} WAEC/NECO theory and practical questions!`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('Failed to seed theory questions');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-800/60 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed WAEC Theory Bank</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/v1/question-bank/seed-practical-questions', { method: 'POST' });
                  const data = await res.json();
                  if (data.success && data.questions) {
                    data.questions.forEach((q: any) => onAddQuestion(q));
                    alert(`Successfully seeded ${data.questions.length} WAEC/NECO practical questions!`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('Failed to seed practical questions');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-800/60 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Seed WAEC Practical Bank</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Subjects</option>
              <option value="General Mathematics">General Mathematics</option>
              <option value="English Studies">English Studies</option>
              <option value="English Language">English Language</option>
              <option value="Basic Science">Basic Science</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Question Type</label>
            <select
              value={(selectedCognitive as any)}
              onChange={(e) => setSelectedCognitive(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Formats (Objective & Theory)</option>
              <option value="objective">Objective (MCQ)</option>
              <option value="theory">Theory & Structured</option>
              <option value="practical">Practical & Alternatives</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Cognitive Level</label>
            <select
              value={selectedCognitive}
              onChange={(e) => setSelectedCognitive(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Cognitive Levels</option>
              <option value="Remembering">Remembering</option>
              <option value="Understanding">Understanding</option>
              <option value="Applying">Applying</option>
              <option value="Analyzing">Analyzing</option>
              <option value="Evaluating">Evaluating</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Search Questions</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt, topic..."
                className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Questions List */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[850px] overflow-y-auto custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Question Bank Items ({filteredQuestions.length})
          </span>

          {filteredQuestions.map((q) => {
            const isSelected = activeQuestion && activeQuestion.id === q.id;
            const promptText = q.prompt || q.questionText;
            const subj = q.subjectName || q.subject;
            const topic = q.topicTitle || q.topic;
            const cog = q.cognitiveLevel || q.bloomsLevel;
            const marks = q.marks || q.markAllocation;

            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionId(q.id);
                  setGeneratedVariants(null);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                    : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{subj} ({q.classGrade})</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {cog}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-relaxed">{promptText}</p>

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="truncate max-w-[200px]">{topic}</span>
                  <span className="font-semibold text-emerald-400">{marks} Marks</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Question Details & Variable Generator */}
        {activeQuestion && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold capitalize">
                    {(activeQuestion.type || activeQuestion.questionType).replace('_', ' ')} • {activeQuestion.cognitiveLevel || activeQuestion.bloomsLevel}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    {activeQuestion.marks || activeQuestion.markAllocation} Marks
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {activeQuestion.subjectName || activeQuestion.subject} ({activeQuestion.classGrade})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeQuestion.topicTitle || activeQuestion.topic}</p>
              </div>

              {/* Variable Question Trigger Button */}
              <button
                onClick={() => handleGenerateVariations(activeQuestion)}
                disabled={isGeneratingVariants}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 self-start"
              >
                {isGeneratingVariants ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Computing Variations...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Parallel Variations</span>
                  </>
                )}
              </button>
            </div>

            {/* Targeted Learning Objective */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Target NERDC Learning Objective:
              </span>
              <p className="text-slate-200 font-semibold">
                {activeQuestion.learningObjective || activeQuestion.curriculumObjective}
              </p>
            </div>

            {/* Prompt & Options */}
            <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] block">
                Primary Question Prompt
              </span>
              <p className="text-base text-slate-100 font-medium leading-relaxed font-sans">
                {activeQuestion.prompt || activeQuestion.questionText}
              </p>

              {activeQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {activeQuestion.options.map((opt, i) => {
                    const optText = typeof opt === 'string' ? opt : `${opt.key}. ${opt.text}`;
                    const isCorrect = typeof opt === 'string' 
                      ? opt === activeQuestion.expectedAnswer || opt === activeQuestion.correctAnswer
                      : opt.key === activeQuestion.expectedAnswer || opt.text === activeQuestion.expectedAnswer;

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span>{optText}</span>
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400">✓ Correct</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step-by-step Solution & Marking Rubric */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 pt-3">
                <span className="font-bold text-emerald-400 text-xs block">Model Answer & Marking Scheme:</span>
                <p className="text-slate-300 font-mono text-[11px] whitespace-pre-line leading-relaxed">
                  {activeQuestion.correctAnswer || activeQuestion.stepByStepSolution || activeQuestion.solution}
                </p>

                {activeQuestion.markingRubric && activeQuestion.markingRubric.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                      Step-by-Step Marking Rubric ({activeQuestion.markingRubric.reduce((s, r) => s + (r.marksAwarded || 0), 0)} Marks Total):
                    </span>
                    <div className="space-y-1.5">
                      {activeQuestion.markingRubric.map((step, si) => (
                        <div key={si} className="flex items-center justify-between p-2 rounded-lg bg-slate-850 border border-slate-800 text-[11px] font-mono">
                          <span className="text-slate-300">Step {si + 1}: {step.stepDescription}</span>
                          <span className="text-emerald-400 font-bold whitespace-nowrap ml-2">+{step.marksAwarded} Marks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Variations Container */}
            {generatedVariants && (
              <div className="bg-slate-850 p-6 rounded-2xl border border-emerald-800/60 space-y-4 text-xs animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">
                      Generated Parallel Variations ({generatedVariants.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Difficulty Preserved
                  </span>
                </div>

                <div className="space-y-4">
                  {generatedVariants.map((v, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">Variation {idx + 1}</span>
                        <button
                          onClick={() => handleCopyText(v.prompt || v.questionText, `var-${idx}`)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {copiedId === `var-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === `var-${idx}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <p className="text-slate-200 font-medium text-xs leading-relaxed">{v.prompt || v.questionText}</p>

                      {v.options && (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {v.options.map((opt: any, oi: number) => {
                            const optStr = typeof opt === 'string' ? opt : `${opt.key}. ${opt.text}`;
                            const isCorr = typeof opt === 'string' ? opt === v.correctAnswer : opt.key === v.correctAnswer;
                            return (
                              <div
                                key={oi}
                                className={`p-2 rounded-lg border font-mono ${
                                  isCorr
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold'
                                    : 'bg-slate-850 text-slate-400 border-slate-800'
                                }`}
                              >
                                {optStr}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
                        <strong className="text-emerald-400">Step-by-step Solution:</strong> {v.stepByStepSolution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
