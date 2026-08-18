import React, { useState } from 'react';
import { SubjectCurriculum, ClassGrade, Term, SchemeOfWorkItem } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { 
  X, 
  Layers, 
  Sparkles, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Calendar, 
  BookOpen, 
  AlertCircle 
} from 'lucide-react';

interface SchemeOfWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: SubjectCurriculum | null;
}

export const SchemeOfWorkModal: React.FC<SchemeOfWorkModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
}) => {
  if (!isOpen) return null;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubject?.id || NERDC_SUBJECTS_DATABASE[0].id
  );

  const activeSubject = NERDC_SUBJECTS_DATABASE.find((s) => s.id === selectedSubjectId) || NERDC_SUBJECTS_DATABASE[0];

  const [classGrade, setClassGrade] = useState<ClassGrade>(
    activeSubject.targetGrades[0] || 'SS 1'
  );
  const [term, setTerm] = useState<Term>('Term 1');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [schemeData, setSchemeData] = useState<{
    subject: string;
    classGrade: string;
    term: string;
    weeks: SchemeOfWorkItem[];
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/scheme-of-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: activeSubject.name,
          classGrade,
          term,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate scheme of work');
      }

      const data = await res.json();
      setSchemeData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the scheme of work.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!schemeData) return;
    const text = `
FEDERAL REPUBLIC OF NIGERIA - NERDC SCHEME OF WORK
===================================================
SUBJECT: ${schemeData.subject}
CLASS: ${schemeData.classGrade} | TERM: ${schemeData.term}
WEEKS: 12 Weeks

${schemeData.weeks
  .map(
    (w) => `
Week ${w.week}: ${w.topic}
Sub-Topics: ${w.subTopics.join(', ')}
Objectives: ${w.objectives.join('; ')}
Teacher Activity: ${w.teacherActivities}
Student Activity: ${w.studentActivities}
Teaching Materials: ${w.materials.join(', ')}
Evaluation: ${w.evaluation}
---------------------------------------------------`
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
        id="scheme-of-work-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>12-Week Scheme of Work Builder</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  NERDC Termly Structure
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generates a complete 12-week teaching syllabus breakdown with mid-term assessments and exam weeks.
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
          {/* Top Controls Bar */}
          <form
            onSubmit={handleGenerateScheme}
            className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 flex flex-wrap items-end justify-between gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-[300px]">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const s = NERDC_SUBJECTS_DATABASE.find((sub) => sub.id === e.target.value);
                    if (s) setClassGrade(s.targetGrades[0]);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {NERDC_SUBJECTS_DATABASE.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.level.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class Level</label>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
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
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Term 1">First Term (12 Weeks)</option>
                  <option value="Term 2">Second Term (12 Weeks)</option>
                  <option value="Term 3">Third Term (12 Weeks)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling 12-Week Scheme...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Scheme of Work</span>
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

          {/* Scheme Content Table */}
          {schemeData ? (
            <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-6 space-y-4 shadow-md">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {schemeData.subject} — {schemeData.classGrade} ({schemeData.term})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Official NERDC Scheme of Work • 12 Teaching Weeks
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Scheme</span>
                  </button>
                </div>
              </div>

              {/* Weekly Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-700/80 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 border-b border-slate-700 w-16 text-center">Week</th>
                      <th className="p-2.5 border-b border-slate-700 w-44">Topic</th>
                      <th className="p-2.5 border-b border-slate-700 w-48">Sub-Topics / Content</th>
                      <th className="p-2.5 border-b border-slate-700">Objectives & Pedagogical Activities</th>
                      <th className="p-2.5 border-b border-slate-700 w-36">Teaching Materials</th>
                      <th className="p-2.5 border-b border-slate-700 w-36">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/80">
                    {schemeData.weeks.map((item) => (
                      <tr
                        key={item.week}
                        className={`hover:bg-slate-850 transition-colors ${
                          item.week === 6 || item.week === 7
                            ? 'bg-amber-950/20'
                            : item.week === 12
                            ? 'bg-blue-950/20'
                            : ''
                        }`}
                      >
                        <td className="p-2.5 text-center font-bold text-blue-400 align-top">
                          Wk {item.week}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-100 align-top">
                          {item.topic}
                        </td>
                        <td className="p-2.5 text-slate-300 align-top">
                          <ul className="list-disc list-inside space-y-0.5">
                            {item.subTopics.map((st, idx) => (
                              <li key={idx} className="line-clamp-2">
                                {st}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-2.5 text-slate-300 align-top space-y-1">
                          <div className="font-medium text-emerald-300">
                            <strong>Objectives:</strong> {item.objectives.join('; ')}
                          </div>
                          <div className="text-slate-400">
                            <strong>Teacher:</strong> {item.teacherActivities}
                          </div>
                          <div className="text-slate-400">
                            <strong>Students:</strong> {item.studentActivities}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-300 align-top">
                          {item.materials.join(', ')}
                        </td>
                        <td className="p-2.5 text-slate-400 align-top font-medium">
                          {item.evaluation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-850 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center min-h-[300px]">
              <Calendar className="w-12 h-12 text-slate-600" />
              <h4 className="text-base font-bold text-slate-200">
                12-Week Scheme of Work Generator
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Select your desired subject, class, and term above, then click <strong>Generate Scheme of Work</strong> to create a termly teaching guide formatted according to NERDC requirements.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
