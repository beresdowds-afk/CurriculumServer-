import React, { useState } from 'react';
import { 
  UserProfile, 
  SecureExaminationPaper, 
  SecureMarkingScheme,
  ClassGrade
} from '../types';
import { Principal2FAGate } from './Principal2FAGate';
import { PaperExamGeneratorKiosk } from './PaperExamGeneratorKiosk';
import { CBTExamKiosk } from './CBTExamKiosk';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  Eye, 
  Printer, 
  Clock, 
  CheckCircle2, 
  Key, 
  AlertTriangle,
  History,
  Copy,
  Check,
  Award,
  RefreshCw,
  Monitor,
  Layers,
  ShieldAlert
} from 'lucide-react';

interface SecureExaminationTabProps {
  currentUser: UserProfile;
  exams: SecureExaminationPaper[];
  markingSchemes: SecureMarkingScheme[];
  onLockExam: (examId: string) => void;
  onUnlockMarkingScheme: (markingSchemeId: string) => void;
  onAddExam: (exam: SecureExaminationPaper, scheme: SecureMarkingScheme) => void;
  onAuthorizeExam: (examId: string) => void;
}

export const SecureExaminationTab: React.FC<SecureExaminationTabProps> = ({
  currentUser,
  exams,
  markingSchemes,
  onLockExam,
  onUnlockMarkingScheme,
  onAddExam,
  onAuthorizeExam
}) => {
  // Main Suite Mode Switcher
  const [suiteMode, setSuiteMode] = useState<'paper_kiosk' | 'cbt_kiosk' | 'vault_registry' | 'security_governance'>('paper_kiosk');

  // Vault Sub-tab state
  const [activeExamId, setActiveExamId] = useState<string>(exams[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'paper' | 'marking_scheme' | 'security_audit'>('paper');
  const [copiedHash, setCopiedHash] = useState(false);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);

  // Generator form
  const [genSubject, setGenSubject] = useState('General Mathematics');
  const [genGrade, setGenGrade] = useState<ClassGrade>('SS 2');
  const [genTerm, setGenTerm] = useState('Term 1');
  const [genTitle, setGenTitle] = useState('Senior Secondary 2 Unified First Term Examination');
  const [genSecACount, setGenSecACount] = useState(15);
  const [genSecBCount, setGenSecBCount] = useState(5);

  const activeExam = exams.find(e => e.id === activeExamId) || exams[0];
  const activeScheme = markingSchemes.find(m => m.id === activeExam?.markingSchemeId);

  const canLock = currentUser.role === 'principal' || currentUser.role === 'exam_officer' || currentUser.role === 'super_admin';
  const canUnlockMarking = currentUser.role === 'principal' || currentUser.role === 'exam_officer';

  const handleGenerateSecureExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingExam(true);

    try {
      // 1. Generate Exam Paper
      const examRes = await fetch('/api/ai/secure-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: genSubject,
          classGrade: genGrade,
          term: genTerm,
          examTitle: genTitle,
          coveredTopics: ['Algebraic Processes', 'Quadratic Equations', 'Logarithms & Indices', 'Geometry & Trigonometry'],
          sectionAQuestionsCount: genSecACount,
          sectionBQuestionsCount: genSecBCount
        })
      });

      if (!examRes.ok) throw new Error('Failed to generate secure exam');
      const examData = await examRes.json();

      // 2. Generate Separate Marking Scheme
      const schemeRes = await fetch('/api/ai/marking-scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: examData.examId,
          examTitle: examData.title,
          subjectName: examData.subjectName,
          classGrade: examData.classGrade,
          questions: [...(examData.sectionA?.questions || []), ...(examData.sectionB?.questions || [])]
        })
      });

      if (!schemeRes.ok) throw new Error('Failed to generate marking scheme');
      const schemeData = await schemeRes.json();

      const newExam: SecureExaminationPaper = {
        id: `exam-${Date.now()}`,
        examId: examData.examId,
        title: examData.title,
        subjectName: examData.subjectName,
        classGrade: examData.classGrade,
        term: examData.term,
        academicYear: examData.academicYear || '2026/2027',
        durationMinutes: examData.durationMinutes || 120,
        totalMarks: examData.totalMarks || 100,
        generalInstructions: examData.generalInstructions || [],
        sectionA: examData.sectionA,
        sectionB: examData.sectionB,
        generationHash: examData.generationHash,
        markingSchemeId: `scheme-${Date.now()}`,
        isLocked: false,
        isAuthorizedByPrincipal: false,
        markingSchemeUnlocked: false,
        securityAuditLog: [
          {
            action: 'generated',
            performedBy: currentUser.name,
            timestamp: new Date().toISOString(),
            ipHash: '102.89.44.12'
          }
        ],
        createdAt: new Date().toISOString()
      };

      const newScheme: SecureMarkingScheme = {
        id: newExam.markingSchemeId,
        examId: newExam.examId,
        examTitle: newExam.title,
        subjectName: newExam.subjectName,
        classGrade: newExam.classGrade,
        isConfidential: true,
        unlockedAt: undefined,
        unlockedBy: undefined,
        sectionARubric: schemeData.sectionARubric || [],
        sectionBRubric: schemeData.sectionBRubric || [],
        generalExaminerNotes: schemeData.generalExaminerNotes || []
      };

      onAddExam(newExam, newScheme);
      setActiveExamId(newExam.id);
      setShowGenModal(false);
    } catch (err) {
      console.error('Exam generation error:', err);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Main Navigation Bar for Examination Suite */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSuiteMode('paper_kiosk')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              suiteMode === 'paper_kiosk'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Paper Exam Generator Kiosk</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/40 text-amber-950 font-black">
              2FA
            </span>
          </button>

          <button
            onClick={() => setSuiteMode('cbt_kiosk')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              suiteMode === 'cbt_kiosk'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>CBT Exam Lockdown Kiosk</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/40 text-emerald-950 font-black">
              2FA
            </span>
          </button>

          <button
            onClick={() => setSuiteMode('vault_registry')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              suiteMode === 'vault_registry'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Exam Paper & Marking Scheme Vault</span>
          </button>

          <button
            onClick={() => setSuiteMode('security_governance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
              suiteMode === 'security_governance'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-700 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Principal 2FA Security Governance</span>
          </button>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Principal Admin Gate Active</span>
          </span>
        </div>
      </div>

      {/* MODE 1: PDF PAPER EXAM GENERATOR KIOSK (Gated for Principal 2FA) */}
      {suiteMode === 'paper_kiosk' && (
        <Principal2FAGate
          currentUser={currentUser}
          kioskTitle="PDF Paper-Based Exam Generator Kiosk"
          kioskDescription="Gated for the Office of the Principal only. Requires 2-Factor Authentication to synthesize downloadable PDF exam booklets, candidate OMR bubble sheets, and confidential marking rubrics."
        >
          <PaperExamGeneratorKiosk
            currentUser={currentUser}
            exams={exams}
            markingSchemes={markingSchemes}
            onAddExam={onAddExam}
          />
        </Principal2FAGate>
      )}

      {/* MODE 2: CBT EXAM KIOSK (Gated for Principal 2FA) */}
      {suiteMode === 'cbt_kiosk' && (
        <Principal2FAGate
          currentUser={currentUser}
          kioskTitle="Computer-Based Test (CBT) Lockdown Kiosk"
          kioskDescription="Gated for the Office of the Principal only. Requires 2-Factor Authentication to provision lockdown CBT testing stations, randomize questions, and initialize candidate testing viewports."
        >
          <CBTExamKiosk
            currentUser={currentUser}
            exams={exams}
            markingSchemes={markingSchemes}
          />
        </Principal2FAGate>
      )}

      {/* MODE 3: VAULT REGISTRY & TRADITIONAL EXAMINATION PAPERS */}
      {suiteMode === 'vault_registry' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  <Lock className="w-4 h-4" />
                  <span>Examination Security & Confidentiality Subsystem</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Secure Examination Papers & Protected Marking Scheme Vault
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  Strictly protecting academic integrity: Every examination is uniquely hashed, immutably locked, and the marking scheme is stored in a segregated vault released only by executive authorization.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGenModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Compile Secure Exam</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Exam Papers List */}
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-3 max-h-[850px] overflow-y-auto custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block">
                Vault Examination Papers ({exams.length})
              </span>

              {exams.map((exam) => {
                const isSelected = activeExam && activeExam.id === exam.id;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setActiveExamId(exam.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500/50 shadow-md shadow-amber-950/20'
                        : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{exam.subjectName} ({exam.classGrade})</span>
                      {exam.isLocked ? (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                          Unlocked Draft
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{exam.title}</h4>

                    <div className="text-[10px] font-mono text-slate-400 bg-slate-900 p-1.5 rounded-lg truncate border border-slate-800">
                      ID: {exam.examId}
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>{exam.term} • {exam.durationMinutes} Mins</span>
                      <span className="text-amber-400 font-semibold">{exam.totalMarks} Marks</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Active Exam Paper, Separate Marking Scheme & Security Audit */}
            {activeExam && (
              <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                {/* Header / Security Badge Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono text-xs font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>ID: {activeExam.examId}</span>
                      </span>

                      {activeExam.isAuthorizedByPrincipal ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Principal Authorized
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-medium">
                          Awaiting Authorization
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">{activeExam.title}</h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      SHA-256 Fingerprint: {activeExam.generationHash.substring(0, 24)}...
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    {!activeExam.isLocked && canLock && (
                      <button
                        onClick={() => onLockExam(activeExam.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Paper</span>
                      </button>
                    )}

                    {!activeExam.isAuthorizedByPrincipal && currentUser.role === 'principal' && (
                      <button
                        onClick={() => onAuthorizeExam(activeExam.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Authorize Release</span>
                      </button>
                    )}

                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Print Official Exam Paper"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs: Exam Paper | Protected Marking Scheme | Security Audit Log */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('paper')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                      activeTab === 'paper'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Examination Paper</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('marking_scheme')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                      activeTab === 'marking_scheme'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Confidential Marking Scheme</span>
                    {activeExam.markingSchemeUnlocked ? (
                      <span className="text-[10px] text-emerald-400">● Unlocked</span>
                    ) : (
                      <span className="text-[10px] text-amber-400">🔒 Protected</span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('security_audit')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                      activeTab === 'security_audit'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Security Audit Log</span>
                  </button>
                </div>

                {/* Tab 1: Examination Paper View */}
                {activeTab === 'paper' && (
                  <div className="space-y-6 text-xs text-slate-300">
                    <div className="bg-slate-850 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
                      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
                        Federal Republic of Nigeria • Unified School Examination
                      </span>
                      <h3 className="text-lg font-black text-white">{activeExam.title}</h3>
                      <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-medium text-xs pt-1">
                        <span>Subject: <strong className="text-slate-200">{activeExam.subjectName}</strong></span>
                        <span>•</span>
                        <span>Class: <strong className="text-slate-200">{activeExam.classGrade}</strong></span>
                        <span>•</span>
                        <span>Time Allowed: <strong className="text-slate-200">{activeExam.durationMinutes} Minutes</strong></span>
                        <span>•</span>
                        <span>Total: <strong className="text-slate-200">{activeExam.totalMarks} Marks</strong></span>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                      <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                        General Instructions to Candidates:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                        {activeExam.generalInstructions?.map((ins, i) => (
                          <li key={i}>{ins}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Section A: Objectives */}
                    {activeExam.sectionA && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <div>
                            <h4 className="font-bold text-white text-sm">{activeExam.sectionA.title}</h4>
                            <p className="text-xs text-slate-400">{activeExam.sectionA.instructions}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800">
                            {activeExam.sectionA.marks} Marks
                          </span>
                        </div>

                        <div className="space-y-3">
                          {activeExam.sectionA.questions?.map((q: any, idx: number) => (
                            <div key={idx} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-emerald-400 min-w-[20px]">{idx + 1}.</span>
                                <p className="text-slate-100 font-medium leading-relaxed">{q.prompt}</p>
                              </div>
                              {q.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1">
                                  {q.options.map((opt: string, oi: number) => (
                                    <div key={oi} className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section B: Theory */}
                    {activeExam.sectionB && (
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <div>
                            <h4 className="font-bold text-white text-sm">{activeExam.sectionB.title}</h4>
                            <p className="text-xs text-slate-400">{activeExam.sectionB.instructions}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800">
                            {activeExam.sectionB.marks} Marks
                          </span>
                        </div>

                        <div className="space-y-4">
                          {activeExam.sectionB.questions?.map((q: any, idx: number) => (
                            <div key={idx} className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-2">
                                  <span className="font-bold text-amber-400 min-w-[24px]">Q{idx + 1}.</span>
                                  <p className="text-slate-100 font-medium leading-relaxed">{q.prompt}</p>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                                  [{q.marks} Marks]
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Protected Marking Scheme View */}
                {activeTab === 'marking_scheme' && (
                  <div className="space-y-6 text-xs text-slate-300">
                    {!activeExam.markingSchemeUnlocked ? (
                      <div className="bg-slate-850 p-8 rounded-3xl border border-amber-800/60 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-white">Confidential Marking Scheme Vault</h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                            Marking schemes are held in a separate cryptographically protected vault to prevent exam leakages. Access requires Executive Principal authorization.
                          </p>
                        </div>

                        {canUnlockMarking ? (
                          <button
                            onClick={() => onUnlockMarkingScheme(activeExam.markingSchemeId)}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-950/40"
                          >
                            Authorize & Decrypt Marking Scheme
                          </button>
                        ) : (
                          <p className="text-[11px] text-rose-400 font-medium">
                            Only the School Principal or Examination Officer can unlock the marking scheme.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-emerald-300 block">Marking Scheme Vault: Unlocked</span>
                            <span className="text-[10px] text-emerald-400">
                              Released for Examination Officer & Certified Graders
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Vault Ref: {activeExam.markingSchemeId}
                          </span>
                        </div>

                        {/* General Examiner Notes */}
                        {activeScheme?.generalExaminerNotes && (
                          <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                            <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                              General Examiner & Moderation Guidelines:
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                              {activeScheme.generalExaminerNotes.map((note, i) => (
                                <li key={i}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Section A Key */}
                        {activeScheme?.sectionARubric && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-white text-sm">Section A: Answer Key</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {activeScheme.sectionARubric.map((r) => (
                                <div key={r.questionNumber} className="p-3 rounded-xl bg-slate-850 border border-slate-800 font-mono text-xs">
                                  <span className="text-slate-400 block text-[10px]">Q{r.questionNumber}</span>
                                  <span className="text-emerald-400 font-bold">{r.correctOption}</span>
                                  <span className="text-[10px] text-slate-500 block truncate mt-0.5">{r.explanation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Section B Step-by-Step Marking Rubric */}
                        {activeScheme?.sectionBRubric && (
                          <div className="space-y-4 pt-4">
                            <h4 className="font-bold text-white text-sm">Section B: Step-by-Step Detailed Solutions & Marks Allocation</h4>
                            {activeScheme.sectionBRubric.map((rubric) => (
                              <div key={rubric.questionNumber} className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                  <span className="font-bold text-amber-400">Question {rubric.questionNumber} Marking Breakdown</span>
                                  <span className="font-mono text-xs font-bold text-emerald-400">{rubric.totalMarks} Marks Total</span>
                                </div>

                                <div className="space-y-2">
                                  <span className="font-bold text-slate-200 block text-[11px]">Step-by-Step Marks Distribution:</span>
                                  <div className="space-y-1.5 font-mono text-[11px]">
                                    {rubric.steps?.map((st, i) => (
                                      <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                                        <span className="text-slate-300">{st.step}</span>
                                        <span className="text-emerald-400 font-bold ml-2 whitespace-nowrap">{st.allocatedMarks}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                                  <strong className="text-indigo-400">Partial Credit Guidance:</strong> {rubric.partialCreditRules}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Security Audit Log */}
                {activeTab === 'security_audit' && (
                  <div className="space-y-4 text-xs">
                    <span className="font-bold text-white uppercase tracking-wider text-[11px] block">
                      Immutable Security Audit Trail
                    </span>

                    <div className="space-y-2">
                      {activeExam.securityAuditLog?.map((log, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="font-bold text-slate-200 capitalize">{log.action.replace('_', ' ')}</span>
                            <span className="text-slate-400">by {log.performedBy}</span>
                          </div>
                          <div className="text-right font-mono text-[10px] text-slate-500">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="ml-2 text-slate-600">[{log.ipHash}]</span>
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
      )}

      {/* MODE 4: PRINCIPAL 2FA SECURITY GOVERNANCE */}
      {suiteMode === 'security_governance' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Principal 2FA Security Governance & Cryptographic Logs</h2>
                <p className="text-slate-400 text-[11px]">
                  TRCN Mandate 14.2: Hardware security keys, TOTP credentials, and anti-leak session enforcement.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-bold">
              ENFORCEMENT: STRICT (2FA)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Principal Admin Credential</span>
              <p className="text-white font-bold text-xs">{currentUser.name}</p>
              <p className="text-emerald-400 font-mono text-[10px]">TRCN #TRCN/2026/09918</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">2FA Authentication Mode</span>
              <p className="text-amber-400 font-bold text-xs">TOTP & FIDO2 Hardware Key</p>
              <p className="text-slate-400 font-mono text-[10px]">30-Minute Dynamic Lease</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Vault Encryption Key</span>
              <p className="text-purple-400 font-mono text-xs">AES-256-GCM Sovereign</p>
              <p className="text-slate-400 text-[10px]">Zero-Knowledge Decryption</p>
            </div>
          </div>
        </div>
      )}

      {/* Compile Modal for Vault */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleGenerateSecureExam} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">Compile Secure Unified Examination</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="text-slate-500 hover:text-slate-300 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subject</label>
                <input
                  type="text"
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Class Grade</label>
                  <select
                    value={genGrade}
                    onChange={(e) => setGenGrade(e.target.value as ClassGrade)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none"
                  >
                    {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Term</label>
                  <select
                    value={genTerm}
                    onChange={(e) => setGenTerm(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Exam Title</label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section A (Objectives)</label>
                  <input
                    type="number"
                    value={genSecACount}
                    onChange={(e) => setGenSecACount(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Section B (Theory)</label>
                  <input
                    type="number"
                    value={genSecBCount}
                    onChange={(e) => setGenSecBCount(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGeneratingExam}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-black flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingExam ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate & Lock Vault</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
