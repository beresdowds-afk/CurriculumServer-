import React, { useState } from 'react';
import { 
  UserProfile, 
  AdaptiveRemedialUnit, 
  ClassGrade 
} from '../types';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  TrendingDown,
  BookOpen
} from 'lucide-react';

interface AdaptiveRemedialTabProps {
  currentUser: UserProfile;
  remedials: AdaptiveRemedialUnit[];
  onAddRemedial: (unit: AdaptiveRemedialUnit) => void;
  onScheduleRemedialToTimetable: (unitId: string) => void;
}

export const AdaptiveRemedialTab: React.FC<AdaptiveRemedialTabProps> = ({
  currentUser,
  remedials,
  onAddRemedial,
  onScheduleRemedialToTimetable
}) => {
  const [activeRemedialId, setActiveRemedialId] = useState<string>(remedials[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generator form
  const [genSubject, setGenSubject] = useState('General Mathematics');
  const [genGrade, setGenGrade] = useState<ClassGrade>('SS 2');
  const [genTopic, setGenTopic] = useState('Algebraic Processes: Quadratic Equations');
  const [genComment, setGenComment] = useState('Students struggled with factorising quadratic equations when leading coefficient a > 1.');
  const [genUnderstanding, setGenUnderstanding] = useState('Poor (45% Class Mastery)');

  const activeRemedial = remedials.find(r => r.id === activeRemedialId) || remedials[0];

  const handleGenerateRemedial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/adaptive-remedial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: genSubject,
          classGrade: genGrade,
          topicTitle: genTopic,
          teacherComment: genComment,
          understandingLevel: genUnderstanding
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate adaptive remedial');
      }

      const data = await response.json();
      const newUnit: AdaptiveRemedialUnit = {
        id: `rem-${Date.now()}`,
        originalLessonId: `ln-auto-${Date.now()}`,
        subjectName: genSubject,
        classGrade: genGrade,
        topicTitle: data.topicTitle || `Adaptive Remedial: ${genTopic}`,
        weaknessIdentified: data.weaknessIdentified || genComment,
        masteryScore: data.masteryScoreEstimate || 52,
        remedialObjectives: data.remedialObjectives || [],
        remedialStrategies: data.remedialStrategies || [],
        simplifiedExplanation: data.simplifiedExplanation || '',
        scaffoldedPracticeExercises: data.scaffoldedPracticeExercises || [],
        reassessmentQuestions: data.reassessmentQuestions || [],
        status: 'recommended',
        createdAt: new Date().toISOString()
      };

      onAddRemedial(newUnit);
      setActiveRemedialId(newUnit.id);
    } catch (err) {
      console.error('Remedial generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Adaptive Curriculum Delivery & Mastery Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Targeted Remedial Interventions & Scaffolded Reassessment
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Instead of blindly advancing the calendar when students fail to grasp a concept, CurriculumFlow pauses to inject targeted remedial scaffolding before unlocking subsequent syllabus topics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-950 text-amber-300 border border-amber-800 font-mono font-medium">
              {remedials.length} Active Remedial Interventions
            </span>
          </div>
        </div>

        {/* Adaptive Progression Flow Visualizer */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Adaptive Learning Progression Model
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <div className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              Week 4: Lesson 4 Delivered
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              Formative Exit Assessment
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="px-3 py-2 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Poor Mastery Detected (54%)</span>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <div className="px-3 py-2 rounded-xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5 shadow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Adaptive Remedial Session</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              Targeted Reassessment
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unlock Lesson 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Remedial Units List + Detailed Scaffold & Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Remedial Units & AI Generator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Remedial Units List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block">
              Remedial Units ({remedials.length})
            </span>

            {remedials.map((rem) => {
              const isSelected = activeRemedial && activeRemedial.id === rem.id;
              return (
                <button
                  key={rem.id}
                  onClick={() => setActiveRemedialId(rem.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{rem.subjectName} ({rem.classGrade})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-800/50">
                      Mastery: {rem.masteryScore}%
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-amber-300">{rem.topicTitle}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{rem.weaknessIdentified}</p>
                </button>
              );
            })}
          </div>

          {/* AI Remedial Generator Form */}
          <form onSubmit={handleGenerateRemedial} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Generate Custom Remedial Unit with AI</h3>
            </div>
            <p className="text-slate-400 text-[11px]">
              Grounded in the NERDC curriculum. AI creates an alternative pedagogical strategy with 3 scaffolded exercise tiers.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Subject:</label>
                <input
                  type="text"
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Class Grade:</label>
                <select
                  value={genGrade}
                  onChange={(e) => setGenGrade(e.target.value as ClassGrade)}
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

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Topic Title:</label>
              <input
                type="text"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Student Difficulty / Teacher Observation:</label>
              <textarea
                rows={2}
                value={genComment}
                onChange={(e) => setGenComment(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Remedial Strategies...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Remedial Intervention</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Full Remedial Scaffolding & Exercises */}
        {activeRemedial && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono text-xs font-bold">
                    Adaptive Intervention Unit
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                    Mastery: {activeRemedial.masteryScore}%
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{activeRemedial.topicTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{activeRemedial.subjectName} • {activeRemedial.classGrade}</p>
              </div>

              <button
                onClick={() => onScheduleRemedialToTimetable(activeRemedial.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow self-start"
              >
                Schedule to Timetable
              </button>
            </div>

            {/* Weakness Analysis */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Diagnostic Weakness Analysis</span>
              </span>
              <p className="text-slate-300 leading-relaxed">{activeRemedial.weaknessIdentified}</p>
            </div>

            {/* Simplified Alternative Explanation */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Deconstructed Concept & Simplified Approach</span>
              </span>
              <p className="text-slate-300 leading-relaxed font-sans">{activeRemedial.simplifiedExplanation}</p>
            </div>

            {/* Remedial Strategies & Objectives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400">Target Remedial Objectives:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {activeRemedial.remedialObjectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-indigo-400">Pedagogical Strategies:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {activeRemedial.remedialStrategies.map((strat, i) => (
                    <li key={i}>{strat}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3-Tier Scaffolded Exercises */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                3-Tier Scaffolded Practice Exercises
              </span>

              <div className="space-y-3">
                {activeRemedial.scaffoldedPracticeExercises.map((ex, idx) => (
                  <div key={idx} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ex.level === 'Basic' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        ex.level === 'Intermediate' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}>
                        Tier {idx + 1}: {ex.level} Level
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200">{ex.prompt}</p>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-amber-300">
                      <strong>Guidance & Hint:</strong> {ex.guidanceHint}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassessment Questions */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-teal-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Reassessment & Mastery Check (Confirm before Lesson 5)</span>
              </span>
              <ol className="list-decimal list-inside space-y-2 text-slate-200">
                {activeRemedial.reassessmentQuestions.map((rq, i) => (
                  <li key={i} className="leading-relaxed">{rq}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
