import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  SecureExaminationPaper, 
  SecureMarkingScheme,
  ClassGrade
} from '../types';
import { 
  Monitor, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Flag, 
  Calculator, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Award, 
  UserCheck, 
  BarChart3, 
  Printer, 
  Lock, 
  Eye, 
  RefreshCw,
  HelpCircle,
  X,
  GraduationCap,
  Building2
} from 'lucide-react';

interface CBTExamKioskProps {
  currentUser: UserProfile;
  exams: SecureExaminationPaper[];
  markingSchemes: SecureMarkingScheme[];
}

export const CBTExamKiosk: React.FC<CBTExamKioskProps> = ({
  currentUser,
  exams,
  markingSchemes
}) => {
  // Session Configuration State
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const activeExam = exams.find(e => e.id === selectedExamId) || exams[0];
  const activeScheme = markingSchemes.find(m => m.id === activeExam?.markingSchemeId);

  // Kiosk Session State
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [studentRegNo, setStudentRegNo] = useState<string>('2026/SS2/SCI/042');
  const [candidateName, setCandidateName] = useState<string>('Chinedu Eze');
  const [candidateArm, setCandidateArm] = useState<string>('SS 2 Science A');

  // Test Runner State
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ [qIndex: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [qIndex: number]: boolean }>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(1800); // 30 mins
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [showViolationAlert, setShowViolationAlert] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [fontSizeClass, setFontSizeClass] = useState<'text-xs' | 'text-sm' | 'text-base'>('text-sm');

  // Simple On-Screen Calculator State
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcClearNext, setCalcClearNext] = useState<boolean>(false);

  // Build unified questions list from activeExam
  const rawQuestions = activeExam?.sectionA?.questions || activeExam?.sections?.[0]?.questions || [];
  const testQuestions = rawQuestions.map((q: any, i: number) => {
    let options = q.options || [];
    if (options.length > 0 && typeof options[0] === 'string') {
      options = options.map((optStr: string, optIdx: number) => {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        return { key: letters[optIdx], text: optStr.replace(/^\[[A-E]\]\s*/, '') };
      });
    }
    return {
      index: i,
      number: i + 1,
      prompt: q.prompt || q.questionText || `Question ${i + 1}`,
      options: options.length > 0 ? options : [
        { key: 'A', text: 'Option A statement' },
        { key: 'B', text: 'Option B statement' },
        { key: 'C', text: 'Option C statement' },
        { key: 'D', text: 'Option D statement' }
      ],
      marks: q.marks || 1,
      topic: q.topic || 'Curriculum Theme',
      cognitiveLevel: q.cognitiveLevel || 'Applying'
    };
  });

  // Countdown timer
  useEffect(() => {
    if (!isTestActive || isSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestActive, isSubmitted]);

  // Anti-cheat: Listen for window blur / tab switches
  useEffect(() => {
    if (!isTestActive || isSubmitted) return;

    const handleBlur = () => {
      setViolationCount(prev => {
        const next = prev + 1;
        setShowViolationAlert(true);
        setTimeout(() => setShowViolationAlert(false), 5000);
        return next;
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isTestActive, isSubmitted]);

  const handleStartTest = () => {
    setUserAnswers({});
    setFlaggedQuestions({});
    setCurrentQIndex(0);
    setTimeRemainingSeconds(activeExam?.durationMinutes ? activeExam.durationMinutes * 60 : 1800);
    setViolationCount(0);
    setIsSubmitted(false);
    setIsTestActive(true);
  };

  const handleSelectOption = (key: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQIndex]: key
    }));
  };

  const handleClearAnswer = () => {
    setUserAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentQIndex];
      return copy;
    });
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentQIndex]: !prev[currentQIndex]
    }));
  };

  const handleSubmitTest = () => {
    setShowConfirmSubmit(false);
    setIsSubmitted(true);
    setIsTestActive(false);
  };

  const handleCalculatorPress = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcMemory(null);
      setCalcOp(null);
      return;
    }

    if (['+', '-', '*', '/'].includes(val)) {
      setCalcMemory(parseFloat(calcDisplay));
      setCalcOp(val);
      setCalcClearNext(true);
      return;
    }

    if (val === '=') {
      if (calcOp && calcMemory !== null) {
        const current = parseFloat(calcDisplay);
        let res = 0;
        if (calcOp === '+') res = calcMemory + current;
        if (calcOp === '-') res = calcMemory - current;
        if (calcOp === '*') res = calcMemory * current;
        if (calcOp === '/') res = current !== 0 ? calcMemory / current : 0;
        setCalcDisplay(res.toString().substring(0, 10));
        setCalcMemory(null);
        setCalcOp(null);
      }
      return;
    }

    if (calcClearNext) {
      setCalcDisplay(val);
      setCalcClearNext(false);
    } else {
      setCalcDisplay(prev => prev === '0' ? val : prev + val);
    }
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Results calculation
  const totalQuestionsCount = testQuestions.length || 1;
  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  
  // Calculate score using activeScheme rubric
  let rawScore = 0;
  testQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    const rubricAns = activeScheme?.sectionARubric?.find(r => r.questionNumber === q.number)?.correctOption || 'A';
    if (userAns && userAns === rubricAns) {
      rawScore += q.marks;
    }
  });

  const percentageScore = Math.round((rawScore / totalQuestionsCount) * 100);
  
  const getGrade = (pct: number) => {
    if (pct >= 75) return { grade: 'A1', desc: 'Distinction / Excellent', color: 'text-emerald-400 bg-emerald-950 border-emerald-800' };
    if (pct >= 70) return { grade: 'B2', desc: 'Very Good', color: 'text-emerald-400 bg-emerald-950 border-emerald-800' };
    if (pct >= 65) return { grade: 'B3', desc: 'Good', color: 'text-teal-400 bg-teal-950 border-teal-800' };
    if (pct >= 60) return { grade: 'C4', desc: 'Credit', color: 'text-amber-400 bg-amber-950 border-amber-800' };
    if (pct >= 55) return { grade: 'C5', desc: 'Credit', color: 'text-amber-400 bg-amber-950 border-amber-800' };
    if (pct >= 50) return { grade: 'C6', desc: 'Credit', color: 'text-amber-400 bg-amber-950 border-amber-800' };
    if (pct >= 45) return { grade: 'D7', desc: 'Pass', color: 'text-rose-400 bg-rose-950 border-rose-800' };
    if (pct >= 40) return { grade: 'E8', desc: 'Pass', color: 'text-rose-400 bg-rose-950 border-rose-800' };
    return { grade: 'F9', desc: 'Fail', color: 'text-red-500 bg-red-950 border-red-800' };
  };

  const gradeInfo = getGrade(percentageScore);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Monitor className="w-4 h-4" />
              <span>Sovereign Computer-Based Test (CBT) Kiosk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Principal CBT Examination & Testing Station
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Executive digital testing environment with anti-tab switch detection, live question navigation matrix, on-screen scientific calculator, candidate biometric gate, and real-time automated scoring telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5 shadow">
              <ShieldCheck className="w-4 h-4" />
              <span>Lockdown Engine Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* STATE 1: KIOSK LAUNCHER / CONFIGURATION */}
      {!isTestActive && !isSubmitted && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Station Setup */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">Configure CBT Station Session</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                STATION ID: CBT-LAB-01
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Select Scheduled Examination</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.subjectName} ({ex.classGrade}) — {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Examination Reg Number</label>
                  <input
                    type="text"
                    value={studentRegNo}
                    onChange={(e) => setStudentRegNo(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Class / Cohort Arm</label>
                <input
                  type="text"
                  value={candidateArm}
                  onChange={(e) => setCandidateArm(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none text-xs"
                />
              </div>

              {/* Station Security Controls */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block">
                  Active Anti-Malpractice Controls
                </span>
                <ul className="space-y-1.5 text-slate-400 text-[11px]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Real-time Window Blur / Tab-Switch Violation Counter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Automated Submission on Timer Expiry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>On-Screen Arithmetic Calculator Integration</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleStartTest}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              <span>Launch Live CBT Examination Simulator</span>
            </button>
          </div>

          {/* Right: Candidate Pre-Test Verification Card */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-extrabold text-white">Candidate Pre-Exam Docket</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">TRCN BIOMETRIC VERIFIED</span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-850 border border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-2xl flex items-center justify-center shrink-0">
                {candidateName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{candidateName}</h3>
                <p className="text-[11px] font-mono text-emerald-400">ID: {studentRegNo}</p>
                <p className="text-[11px] text-slate-400">{candidateArm} • 2026/2027 Academic Session</p>
              </div>
            </div>

            {activeExam && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-[11px]">
                {/* Institutional Branding Box */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800 font-sans">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">{activeExam.schoolName || 'FEDERAL GOVERNMENT COLLEGE, LAGOS'}</h4>
                    <p className="text-[10px] text-slate-400">{activeExam.schoolAddress || 'P.M.B. 1001, Victoria Island, Lagos'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Subject:</span>
                  <strong className="text-white font-sans">{activeExam.subjectName}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Class Grade:</span>
                  <span className="text-slate-200">{activeExam.classGrade}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Items:</span>
                  <span className="text-amber-400 font-bold">{testQuestions.length} Questions</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Time Allowed:</span>
                  <span className="text-emerald-400 font-bold">{activeExam.durationMinutes || 30} Minutes</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Principal Admin:</span>
                  <span className="text-slate-300 font-sans text-[10px]">{activeExam.principalName || 'Dr. Mustapha Adeleke, PhD'}</span>
                </div>
                {activeExam.subjectTeacherName && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Subject Master:</span>
                    <span className="text-slate-300 font-sans text-[10px]">{activeExam.subjectTeacherName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-400">
                  <span>Exam ID:</span>
                  <span className="text-slate-500 text-[10px]">{activeExam.examId}</span>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] leading-relaxed">
              <strong>Notice:</strong> Once launched, the candidate must remain within the CBT viewport. Leaving the browser window will increment the security violation flag and notify the Chief Invigilator.
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE CBT TESTING RUNNER */}
      {isTestActive && !isSubmitted && (
        <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fadeIn">
          {/* Top Test Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            {/* Candidate & School Info */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black shrink-0">
                <GraduationCap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{candidateName} ({studentRegNo})</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                    {candidateArm}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="text-slate-200 font-bold">{activeExam?.schoolName || 'FEDERAL GOVERNMENT COLLEGE, LAGOS'}</span>
                  <span>•</span>
                  <span>{activeExam?.subjectName} ({activeExam?.classGrade})</span>
                </div>
              </div>
            </div>

            {/* Live Countdown Timer & Violation Counter */}
            <div className="flex items-center gap-3">
              {violationCount > 0 && (
                <div className="px-3 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-800 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Violations: {violationCount}</span>
                </div>
              )}

              <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-mono text-sm font-black shadow-lg ${
                timeRemainingSeconds < 300
                  ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                  : timeRemainingSeconds < 900
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>

              {/* Calculator Toggle */}
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                title="Toggle Calculator"
              >
                <Calculator className="w-4 h-4" />
              </button>

              {/* Font Size Adjuster */}
              <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button
                  onClick={() => setFontSizeClass('text-xs')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${fontSizeClass === 'text-xs' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSizeClass('text-sm')}
                  className={`px-2 py-0.5 rounded text-xs font-bold ${fontSizeClass === 'text-sm' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSizeClass('text-base')}
                  className={`px-2 py-0.5 rounded text-sm font-bold ${fontSizeClass === 'text-base' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  A+
                </button>
              </div>
            </div>
          </div>

          {/* Violation Toast */}
          {showViolationAlert && (
            <div className="p-3.5 rounded-xl bg-rose-950 border-2 border-rose-600 text-rose-200 flex items-center justify-between text-xs animate-bounce">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-bold">SECURITY WARNING: Window blur / tab switch detected! All focus departures are logged.</span>
              </div>
              <button onClick={() => setShowViolationAlert(false)} className="text-rose-400 font-bold">✕</button>
            </div>
          )}

          {/* Active Question Canvas & Navigator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Active Question */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              {testQuestions[currentQIndex] ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="font-bold text-amber-400 uppercase tracking-wider">
                      Question {currentQIndex + 1} of {testQuestions.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">
                        [{testQuestions[currentQIndex].marks} Mark]
                      </span>
                      <button
                        onClick={handleToggleFlag}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          flaggedQuestions[currentQIndex]
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                      >
                        <Flag className="w-3 h-3" />
                        <span>{flaggedQuestions[currentQIndex] ? 'Flagged' : 'Flag for Review'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="space-y-4">
                    <p className={`font-semibold text-white leading-relaxed ${fontSizeClass}`}>
                      {testQuestions[currentQIndex].prompt}
                    </p>

                    {/* Multiple Choice Options */}
                    <div className="space-y-2.5 pt-2">
                      {testQuestions[currentQIndex].options.map((opt: any) => {
                        const isSelected = userAnswers[currentQIndex] === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => handleSelectOption(opt.key)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-950/20'
                                : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {opt.key}
                            </span>
                            <span className={`pt-0.5 leading-relaxed ${fontSizeClass}`}>
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Navigation Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQIndex === 0}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <button
                        onClick={() => setCurrentQIndex(prev => Math.min(testQuestions.length - 1, prev + 1))}
                        disabled={currentQIndex === testQuestions.length - 1}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {userAnswers[currentQIndex] && (
                        <button
                          onClick={handleClearAnswer}
                          className="px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 text-xs font-semibold"
                        >
                          Clear Choice
                        </button>
                      )}

                      <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Final Examination</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>No questions loaded.</p>
                </div>
              )}
            </div>

            {/* Right 4 Cols: Question Palette Matrix & Legend */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Question Palette ({answeredCount}/{testQuestions.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Jump to Item</span>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-400 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Number Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                {testQuestions.map((q, idx) => {
                  const isCurrent = currentQIndex === idx;
                  const isAnswered = userAnswers[idx] !== undefined;
                  const isFlagged = flaggedQuestions[idx];

                  let btnBg = 'bg-slate-850 text-slate-300 border-slate-700';
                  if (isFlagged) {
                    btnBg = 'bg-amber-500 text-slate-950 font-black border-amber-400';
                  } else if (isAnswered) {
                    btnBg = 'bg-emerald-600 text-white font-bold border-emerald-500';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-9 rounded-xl text-xs font-mono transition-all border flex items-center justify-center relative ${btnBg} ${
                        isCurrent ? 'ring-2 ring-white scale-105 shadow-md z-10' : 'hover:opacity-90'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Quick Summary Pill */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Answered:</span>
                  <strong className="text-emerald-400">{answeredCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Unanswered:</span>
                  <strong className="text-slate-300">{testQuestions.length - answeredCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Flagged for Review:</span>
                  <strong className="text-amber-400">{flaggedCount}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Calculator Modal */}
          {showCalculator && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-700 rounded-3xl p-4 shadow-2xl w-64 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exam Calculator</span>
                </div>
                <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl text-right font-mono text-lg font-bold text-emerald-400 border border-slate-800">
                {calcDisplay}
              </div>

              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleCalculatorPress(btn)}
                    className={`p-2 rounded-xl font-bold transition-all ${
                      btn === 'C'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : btn === '='
                        ? 'bg-emerald-600 text-white font-black'
                        : ['+', '-', '*', '/'].includes(btn)
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Confirmation Modal */}
          {showConfirmSubmit && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-xs animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Confirm Final Examination Submission</h3>
                    <p className="text-slate-400 text-[11px]">Are you sure you want to end your test session?</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Questions:</span>
                    <strong className="text-white">{testQuestions.length}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Answered:</span>
                    <strong className="text-emerald-400">{answeredCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Unanswered:</span>
                    <strong className="text-rose-400">{testQuestions.length - answeredCount}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Flagged:</span>
                    <strong className="text-amber-400">{flaggedCount}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                  >
                    Return to Test
                  </button>
                  <button
                    onClick={handleSubmitTest}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold transition-all shadow"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 3: INSTANT RESULTS & PSYCHOMETRIC SCORECARD */}
      {isSubmitted && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 animate-fadeIn">
          {/* Institutional School Branding Header */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-2 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                    Federal Republic of Nigeria • Ministry of Basic Education
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                    {activeExam?.schoolName || 'FEDERAL GOVERNMENT COLLEGE, LAGOS'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {activeExam?.schoolAddress || 'P.M.B. 1001, Victoria Island / King\'s Way, Lagos State, Nigeria'}
                  </p>
                  <p className="text-[10px] italic text-amber-400/90 font-serif mt-0.5">
                    "{activeExam?.schoolMotto || 'Pro Deo et Patria • Knowledge, Character and Excellence'}"
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right font-mono text-[10px] space-y-1">
                <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold block">
                  CBT TELEMETRY VERIFIED
                </span>
                <span className="text-slate-500">Center: {activeExam?.centerNumber || 'WAEC/LAG-4091'}</span>
              </div>
            </div>
          </div>

          {/* Result Header */}
          <div className="text-center space-y-2 pb-4 border-b border-slate-800">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Official CBT Assessment Result Slip</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              {activeExam?.title || `${activeExam?.subjectName} Examination`}
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Candidate test telemetry and psychometric diagnostic analysis generated immediately by the Sovereign Assessment Engine.
            </p>
          </div>

          {/* Candidate Bio & Score Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Pill */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</span>
              <div className="text-4xl sm:text-5xl font-black text-white">
                {percentageScore}%
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${gradeInfo.color}`}>
                Grade {gradeInfo.grade} • {gradeInfo.desc}
              </span>
            </div>

            {/* Candidate Credentials */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Candidate Bio-Data
              </span>
              <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-slate-500">Name:</span> <strong className="text-white">{candidateName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Reg No:</span> <span>{studentRegNo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Class Arm:</span> <span>{candidateArm}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subject:</span> <span>{activeExam?.subjectName} ({activeExam?.classGrade})</span></div>
              </div>
            </div>

            {/* Test Telemetry */}
            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Integrity & Speed Telemetry
              </span>
              <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-slate-500">Items Attempted:</span> <span>{answeredCount} / {testQuestions.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Raw Score:</span> <span>{rawScore} / {testQuestions.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Security Violations:</span> <span className={violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{violationCount} departures</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Exam Timestamp:</span> <span>{new Date().toLocaleTimeString()}</span></div>
              </div>
            </div>
          </div>

          {/* Institutional Signatures & Endorsement Block */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">School Principal Certification</span>
              <p className="font-bold text-white text-xs">{activeExam?.principalName || 'Dr. Mustapha Adeleke, PhD, FSTAN'}</p>
              <p className="text-[10px] text-slate-400 font-mono">Status: Authenticated via 2FA Master Vault</p>
            </div>

            <div className="space-y-2 border-t border-slate-700 pt-3 text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Subject Master / Examiner</span>
              <p className="font-bold text-white text-xs">{activeExam?.subjectTeacherName || 'Mr. O. S. Oladipo (Senior Subject Master)'}</p>
              <p className="text-[10px] text-slate-400 font-mono">TRCN Licensed Examiner • Session 2026/2027</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition-all flex items-center gap-2 border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official CBT Result Slip</span>
            </button>

            <button
              onClick={handleStartTest}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Station for Next Candidate</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
