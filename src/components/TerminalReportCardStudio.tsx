import React, { useState, useRef } from 'react';
import { 
  TerminalReportCard, 
  MultiYearTranscriptRecord, 
  UserProfile, 
  SchoolBrandProfile, 
  TenantSchoolApp 
} from '../types';
import { INITIAL_REPORT_CARDS, INITIAL_TRANSCRIPTS } from '../data/reportCardMockData';
import { 
  Printer, 
  Download, 
  QrCode, 
  Award, 
  FileText, 
  GraduationCap, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface TerminalReportCardStudioProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
}

export const TerminalReportCardStudio: React.FC<TerminalReportCardStudioProps> = ({
  currentUser,
  brandProfile,
  activeTenant
}) => {
  const [reportCards, setReportCards] = useState<TerminalReportCard[]>(INITIAL_REPORT_CARDS);
  const [transcripts] = useState<MultiYearTranscriptRecord[]>(INITIAL_TRANSCRIPTS);
  const [selectedReportId, setSelectedReportId] = useState<string>(INITIAL_REPORT_CARDS[0].id);
  const [activeViewMode, setActiveViewMode] = useState<'single_report' | 'batch_summary' | 'multi_year_transcript'>('single_report');
  const [selectedClassArm, setSelectedClassArm] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 2');
  const [selectedSession, setSelectedSession] = useState<string>('2025/2026');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAiRemarkGenerating, setIsAiRemarkGenerating] = useState<boolean>(false);
  const [stampVerified, setStampVerified] = useState<boolean>(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const currentReport = reportCards.find(r => r.id === selectedReportId) || reportCards[0];
  const currentTranscript = transcripts.find(t => t.studentId === currentReport.studentId);

  const filteredReports = reportCards.filter(r => {
    const matchesArm = selectedClassArm === 'all' || r.classArm === selectedClassArm;
    const matchesTerm = r.term === selectedTerm;
    const matchesSession = r.academicSession === selectedSession;
    const matchesSearch = searchQuery === '' || 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArm && matchesTerm && matchesSession && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateAiRemark = () => {
    setIsAiRemarkGenerating(true);
    setTimeout(() => {
      setReportCards(prev => prev.map(r => {
        if (r.id === currentReport.id) {
          return {
            ...r,
            principalRemark: `Academic board review: ${r.studentName} demonstrated commendable scholastic rigor in ${r.term}, maintaining an overall average of ${r.averagePercentage}%. Commended for exceptional character, discipline, and participation.`
          };
        }
        return r;
      }));
      setIsAiRemarkGenerating(false);
    }, 600);
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'A1': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'B2': 
      case 'B3': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'C4':
      case 'C5':
      case 'C6': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'D7':
      case 'E8': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Official Examination Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">NERDC Broadsheet Compliant</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Terminal Report Card & Transcript Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Generate, customize, and batch-print official academic terminal report sheets with psychomotor grids, affective domain ratings, cumulative GPAs, and cryptographic authenticity seals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveViewMode('single_report')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeViewMode === 'single_report'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Report Sheet
            </button>
            <button
              onClick={() => setActiveViewMode('batch_summary')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeViewMode === 'batch_summary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Batch Summary
            </button>
            <button
              onClick={() => setActiveViewMode('multi_year_transcript')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeViewMode === 'multi_year_transcript'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Transcript
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter Selector Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="text-slate-400 font-semibold mb-1 block">Class Arm</label>
          <select
            value={selectedClassArm}
            onChange={(e) => setSelectedClassArm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Class Arms</option>
            <option value="SS 2 Alpha">SS 2 Alpha (Science)</option>
            <option value="SS 2 Beta">SS 2 Beta (Commercial)</option>
            <option value="SS 2 Gamma">SS 2 Gamma (Arts)</option>
            <option value="JSS 1 Alpha">JSS 1 Alpha</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 font-semibold mb-1 block">Academic Session</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="2025/2026">2025/2026 Academic Year</option>
            <option value="2024/2025">2024/2025 Academic Year</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 font-semibold mb-1 block">Term Period</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="Term 1">Term 1 (First Term)</option>
            <option value="Term 2">Term 2 (Second Term)</option>
            <option value="Term 3">Term 3 (Promotion Term)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 font-semibold mb-1 block">Search Student</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Name or Admission No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      {activeViewMode === 'single_report' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Student Quick Roster */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Students ({filteredReports.length})
              </span>
              <span className="text-xs text-emerald-400 font-mono">Rank Order</span>
            </div>

            <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredReports.map((report) => {
                const isSelected = report.id === selectedReportId;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                        {report.avatarUrl ? (
                          <img src={report.avatarUrl} alt={report.studentName} className="w-full h-full object-cover" />
                        ) : (
                          report.studentName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-100 block text-xs truncate">
                          {report.studentName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {report.admissionNumber}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono text-emerald-400 block">
                        {report.averagePercentage}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Pos: {report.classPosition}/{report.totalStudentsInClass}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: High Fidelity Printable Report Card Sheet */}
          <div className="lg:col-span-3 space-y-4">
            {/* Quick Actions Panel */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3.5 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Security Stamp:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {currentReport.qrSecurityVerificationCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAiRemark}
                  disabled={isAiRemarkGenerating}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAiRemarkGenerating ? 'Formulating Remark...' : 'AI Principal Remark'}</span>
                </button>

                <button
                  onClick={() => setStampVerified(!stampVerified)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    stampVerified
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {stampVerified ? '✓ Stamp Verified' : 'Stamp Unverified'}
                </button>
              </div>
            </div>

            {/* Official Report Sheet Canvas (Print-Friendly Structure) */}
            <div 
              ref={printAreaRef}
              className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-300 shadow-2xl space-y-6 printable-report-card relative overflow-hidden"
              style={{ minHeight: '960px' }}
            >
              {/* Watermark Crest */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <GraduationCap className="w-96 h-96 text-slate-950" />
              </div>

              {/* School Official Letterhead */}
              <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-slate-900 gap-4 text-center sm:text-left">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black text-2xl shadow">
                    {brandProfile?.schoolName ? brandProfile.schoolName.substring(0, 2).toUpperCase() : 'CF'}
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                      {brandProfile?.schoolName || activeTenant?.name || "KING'S COLLEGE LAGOS"}
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold">
                      {brandProfile?.tagline || "Excellence, Character & National Service • Founded 1909"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      3 Catholic Mission Street, Lagos Island, Lagos State, Nigeria • accredited by WAEC & NECO
                    </p>
                  </div>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <span className="px-3 py-1 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-lg inline-block mb-1">
                    Continuous Assessment & Terminal Report
                  </span>
                  <div className="text-xs font-bold text-slate-700">
                    <span>Session: </span><strong className="text-slate-950">{currentReport.academicSession}</strong> | 
                    <span> Term: </span><strong className="text-slate-950">{currentReport.term}</strong>
                  </div>
                </div>
              </div>

              {/* Student Bio-Data & Attendance Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Student Full Name</span>
                  <strong className="text-slate-900 font-black text-sm">{currentReport.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Admission Number</span>
                  <strong className="text-slate-900 font-mono font-bold">{currentReport.admissionNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Class / Stream</span>
                  <strong className="text-slate-900 font-bold">{currentReport.classArm}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Term Attendance</span>
                  <strong className="text-emerald-700 font-bold font-mono">
                    {currentReport.timesPresent} / {currentReport.timesSchoolOpened} Days (98.3%)
                  </strong>
                </div>
              </div>

              {/* Academic Subjects Broadsheet Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5 text-center">1st CA (20)</th>
                      <th className="p-2.5 text-center">2nd CA (20)</th>
                      <th className="p-2.5 text-center">Exam (60)</th>
                      <th className="p-2.5 text-center">Total (100)</th>
                      <th className="p-2.5 text-center">Grade</th>
                      <th className="p-2.5 text-center">Class Avg</th>
                      <th className="p-2.5 text-center">High / Low</th>
                      <th className="p-2.5 text-center">Pos</th>
                      <th className="p-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {currentReport.subjectScores.map((score, index) => (
                      <tr key={score.subjectId} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2.5 font-bold text-slate-950">
                          {score.subjectName}
                          <span className="text-[10px] text-slate-400 block font-mono font-normal">
                            {score.subjectCode} • {score.subjectTeacherName}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{score.ca1Score}</td>
                        <td className="p-2.5 text-center font-mono">{score.ca2Score}</td>
                        <td className="p-2.5 text-center font-mono font-semibold">{score.examScore}</td>
                        <td className="p-2.5 text-center font-mono font-black text-slate-950 text-sm">
                          {score.totalScore}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-black font-mono text-xs border ${getGradeBadgeClass(score.grade)}`}>
                            {score.grade}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{score.classAverage}</td>
                        <td className="p-2.5 text-center font-mono text-[10px] text-slate-500">
                          {score.classHighest} / {score.classLowest}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900 font-mono">{score.positionInSubject}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{score.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Performance Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-950">
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Total Marks</span>
                  <strong className="font-mono text-base font-black">
                    {currentReport.totalMarksObtained} / {currentReport.totalMarksPossible}
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Terminal Average</span>
                  <strong className="font-mono text-base font-black text-emerald-800">
                    {currentReport.averagePercentage}%
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Cumulative GPA</span>
                  <strong className="font-mono text-base font-black">
                    {currentReport.gpa} / 5.0
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Class Position</span>
                  <strong className="font-mono text-base font-black">
                    {currentReport.classPosition} of {currentReport.totalStudentsInClass}
                  </strong>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Cohort Rank</span>
                  <strong className="font-mono text-base font-black">
                    {currentReport.cohortPosition} of {currentReport.totalStudentsInCohort}
                  </strong>
                </div>
              </div>

              {/* Affective & Psychomotor Behavioral Domain Rating Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Affective Domain */}
                <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-black text-slate-950 uppercase tracking-wide">
                      A. Affective Domain (Character & Values)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Scale: 5 (High) - 1 (Low)</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {currentReport.affectiveRatings.map(item => (
                      <div key={item.trait} className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-700 font-medium">{item.trait}</span>
                        <div className="flex items-center gap-1 font-mono">
                          {[1, 2, 3, 4, 5].map(score => (
                            <span 
                              key={score}
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                item.rating === score 
                                  ? 'bg-slate-950 text-white' 
                                  : 'bg-white border border-slate-300 text-slate-400'
                              }`}
                            >
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Psychomotor Domain */}
                <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-black text-slate-950 uppercase tracking-wide">
                      B. Psychomotor Domain (Skills & Physical)
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">Scale: 5 (High) - 1 (Low)</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {currentReport.psychomotorRatings.map(item => (
                      <div key={item.skill} className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-700 font-medium">{item.skill}</span>
                        <div className="flex items-center gap-1 font-mono">
                          {[1, 2, 3, 4, 5].map(score => (
                            <span 
                              key={score}
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                item.rating === score 
                                  ? 'bg-slate-950 text-white' 
                                  : 'bg-white border border-slate-300 text-slate-400'
                              }`}
                            >
                              {score}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Master & Principal Remarks */}
              <div className="space-y-3 text-xs">
                <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Form Teacher's Evaluation & Recommendation:
                  </span>
                  <p className="text-slate-900 font-serif italic text-sm mt-1">
                    "{currentReport.formTeacherRemark}"
                  </p>
                  <span className="text-slate-600 block text-[11px] font-bold mt-2">
                    Signed: {currentReport.formTeacherName}
                  </span>
                </div>

                <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 relative">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Principal's Final Remark & Seal:
                  </span>
                  <p className="text-slate-900 font-serif italic text-sm mt-1">
                    "{currentReport.principalRemark}"
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-3 border-t border-slate-200 gap-4">
                    <div>
                      <span className="text-slate-600 block text-[11px] font-bold">
                        {currentReport.principalName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Date Issued: {currentReport.issueDate}
                      </span>
                    </div>

                    {/* Official Stamp Simulation */}
                    {stampVerified && (
                      <div className="border-2 border-emerald-800 rounded-xl px-3 py-1.5 text-center text-emerald-900 font-serif uppercase tracking-widest font-black text-[10px] rotate-[-2deg] bg-emerald-50/50 shadow-sm shrink-0">
                        <span>★ KING'S COLLEGE ACADEMIC REGISTRY ★</span>
                        <div className="text-[8px] font-mono lowercase">verified official stamp</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Term Transition & Verification QR Seal */}
              <div className="pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="text-slate-900 font-bold">
                    <span>Next Term Resumption Date: </span>
                    <strong className="text-slate-950 font-black">{currentReport.nextTermBeginsDate}</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Next Term Billable Fees: <strong>₦{currentReport.nextTermFeesNGN.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Cryptographic Verification Code</span>
                    <strong className="text-[11px] font-mono text-slate-900">{currentReport.qrSecurityVerificationCode}</strong>
                  </div>
                  <div className="w-12 h-12 bg-slate-950 text-white rounded-lg flex items-center justify-center p-1 shadow">
                    <QrCode className="w-9 h-9 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: Multi-Year Transcript Record */}
      {activeViewMode === 'multi_year_transcript' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Cumulative Secondary School Transcript
              </span>
              <h3 className="text-2xl font-black text-white mt-1">
                {currentTranscript?.studentName || currentReport.studentName}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Admission No: {currentTranscript?.admissionNumber || currentReport.admissionNumber} • Expected Class of {currentTranscript?.graduationYear || '2027'}
              </span>
            </div>

            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Cumulative GPA</span>
                <span className="text-2xl font-black font-mono text-emerald-400">{currentTranscript?.cumulativeGPA || '4.82'}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Class Percentile</span>
                <span className="text-2xl font-black font-mono text-sky-400">{currentTranscript?.classRankPercentile || '98.2'}%</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Academic Session</th>
                  <th className="p-3">Term</th>
                  <th className="p-3">Grade Level</th>
                  <th className="p-3 text-center">Term Average</th>
                  <th className="p-3 text-center">Term GPA</th>
                  <th className="p-3 text-center">Class Position</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {currentTranscript?.termlySummaries.map((summary, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-slate-100">{summary.session}</td>
                    <td className="p-3 font-semibold text-slate-200">{summary.term}</td>
                    <td className="p-3 font-bold text-emerald-400">{summary.classGrade}</td>
                    <td className="p-3 text-center font-mono font-black text-slate-100">{summary.termAverage}%</td>
                    <td className="p-3 text-center font-mono text-emerald-400 font-bold">{summary.gpa}</td>
                    <td className="p-3 text-center font-mono">{summary.position} of {summary.totalStudents}</td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                        {summary.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: Batch Summary & Broad Broadsheet */}
      {activeViewMode === 'batch_summary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-black text-white">
                Class Arm Broadsheet Master List ({selectedClassArm === 'all' ? 'All Classes' : selectedClassArm})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Session: {selectedSession} • {selectedTerm} • Official Class Ranking
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Batch Print Class Sheets</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Rank</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3">Class Arm</th>
                  <th className="p-3 text-center">Total Marks</th>
                  <th className="p-3 text-center">Average %</th>
                  <th className="p-3 text-center">GPA</th>
                  <th className="p-3 text-center">Attendance</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-black text-emerald-400">#{report.classPosition}</td>
                    <td className="p-3 font-mono text-slate-400">{report.admissionNumber}</td>
                    <td className="p-3 font-bold text-slate-100">{report.studentName}</td>
                    <td className="p-3 text-slate-300">{report.classArm}</td>
                    <td className="p-3 text-center font-mono">{report.totalMarksObtained} / {report.totalMarksPossible}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-400">{report.averagePercentage}%</td>
                    <td className="p-3 text-center font-mono">{report.gpa}</td>
                    <td className="p-3 text-center font-mono">{report.timesPresent}/{report.timesSchoolOpened}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedReportId(report.id);
                          setActiveViewMode('single_report');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] cursor-pointer"
                      >
                        Inspect Sheet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
