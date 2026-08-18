import React, { useState } from 'react';
import { 
  UserProfile, 
  SubjectCurriculum, 
  ClassGrade 
} from '../types';
import { 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Layers, 
  HelpCircle,
  Award,
  BookOpen
} from 'lucide-react';

interface TaughtAssessmentTabProps {
  currentUser: UserProfile;
  subjects: SubjectCurriculum[];
}

export const TaughtAssessmentTab: React.FC<TaughtAssessmentTabProps> = ({
  currentUser,
  subjects
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedGrade, setSelectedGrade] = useState<ClassGrade>('SS 2');
  const [assessmentType, setAssessmentType] = useState('Mid-Term Continuous Assessment (CA 1)');
  const [totalMarks, setTotalMarks] = useState(40);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  // Extract all topics from active subject
  const allTopics = activeSubject ? activeSubject.themes.flatMap(t => t.topics) : [];
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(allTopics.slice(0, 3).map(t => t.id));

  const toggleTopic = (id: string) => {
    if (completedTopicIds.includes(id)) {
      setCompletedTopicIds(completedTopicIds.filter(tid => tid !== id));
    } else {
      setCompletedTopicIds([...completedTopicIds, id]);
    }
  };

  const handleGenerateTaughtAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completedTopicIds.length === 0) return;

    setIsGenerating(true);
    setGeneratedAssessment(null);

    const selectedTopicsList = allTopics.filter(t => completedTopicIds.includes(t.id));

    try {
      const response = await fetch('/api/ai/taught-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeSubject.name,
          classGrade: selectedGrade,
          assessmentTitle: `${activeSubject.name} ${assessmentType}`,
          completedTopics: selectedTopicsList.map(t => ({
            title: t.title,
            completionPercentage: 100
          })),
          totalMarks: totalMarks
        })
      });

      if (!response.ok) throw new Error('Failed to generate taught assessment');
      const data = await response.json();
      setGeneratedAssessment(data);
    } catch (err) {
      console.error('Taught assessment error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Curriculum-Grounded Assessment Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Taught-Only Classroom Tests & Mid-Term Assessments
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strictly enforcing fair testing: Teachers select only topics that have been taught and logged in the digital delivery record. AI restricts every question to those verified objectives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 font-mono font-medium">
              Fair Testing Enforcement Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Topic Checklist + Generated Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Topic Checklist */}
        <form onSubmit={handleGenerateTaughtAssessment} className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
            1. Select Scope of Completed Curriculum
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const sub = subjects.find(s => s.id === e.target.value);
                  if (sub) {
                    const top = sub.themes.flatMap(t => t.topics);
                    setCompletedTopicIds(top.slice(0, 2).map(t => t.id));
                  }
                }}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Class Grade:</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as ClassGrade)}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              >
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
                <option value="SS 1">SS 1</option>
                <option value="SS 2">SS 2</option>
                <option value="SS 3">SS 3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Assessment Type:</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              >
                <option value="Continuous Assessment Test 1 (CA 1)">CA Test 1</option>
                <option value="Continuous Assessment Test 2 (CA 2)">CA Test 2</option>
                <option value="Mid-Term Unified Test">Mid-Term Unified Test</option>
                <option value="Weekly Formative Quiz">Weekly Formative Quiz</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Total Marks:</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Topics Checklist */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold block">
                Select Verified Taught Topics ({completedTopicIds.length} Selected):
              </label>
              <button
                type="button"
                onClick={() => setCompletedTopicIds(allTopics.map(t => t.id))}
                className="text-[10px] text-teal-400 hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar p-2 bg-slate-850 rounded-2xl border border-slate-800">
              {allTopics.map((topic) => {
                const isChecked = completedTopicIds.includes(topic.id);
                return (
                  <div
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-slate-800 border-teal-500/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container
                        className="rounded bg-slate-800 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-xs truncate max-w-[240px]">{topic.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Wk {topic.week}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating || completedTopicIds.length === 0}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Compiling Taught Assessment...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Taught-Only Assessment</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: Generated Taught Assessment */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          {generatedAssessment ? (
            <div className="space-y-6 text-xs text-slate-300 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono text-xs font-bold">
                      Strictly Grounded Test
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                      {generatedAssessment.totalMarks || totalMarks} Marks
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">{generatedAssessment.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{generatedAssessment.subjectName} • {generatedAssessment.classGrade}</p>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={() => handleCopy(JSON.stringify(generatedAssessment, null, 2))}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Test</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-teal-400 text-[11px] uppercase tracking-wider">
                  Test Instructions:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {generatedAssessment.instructions?.map((ins: string, i: number) => (
                    <li key={i}>{ins}</li>
                  )) || <li>Answer all questions in the space provided. Time allowed: 45 minutes.</li>}
                </ul>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <h4 className="font-bold text-white text-sm">Assessment Questions</h4>

                {generatedAssessment.questions?.map((q: any, idx: number) => (
                  <div key={idx} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-teal-400 min-w-[20px]">{idx + 1}.</span>
                        <p className="text-slate-100 font-medium leading-relaxed">{q.prompt}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                        [{q.marks} Marks]
                      </span>
                    </div>

                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        {q.options.map((opt: string, oi: number) => (
                          <div key={oi} className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                      <strong className="text-teal-400">Solution / Marking Guide:</strong> {q.markingGuide || q.correctAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-850 text-slate-600 flex items-center justify-center mx-auto border border-slate-800">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs max-w-sm mx-auto">
                Select your completed topics on the left and click "Generate Taught-Only Assessment" to compile an official continuous assessment test.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
