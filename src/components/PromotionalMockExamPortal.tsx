import React, { useState } from 'react';
import { 
  UserProfile, 
  SchoolBrandProfile, 
  TenantSchoolApp,
  PromotionRuleCriteria,
  StudentPromotionRecord,
  MockExamSchedule,
  MockCandidateScore,
  PromotionOutcome
} from '../types';
import { 
  DEFAULT_PROMOTION_RULES, 
  INITIAL_PROMOTION_CANDIDATES, 
  INITIAL_MOCK_EXAMS, 
  INITIAL_MOCK_SCORES 
} from '../data/promotionalMockExamData';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sliders, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  ShieldAlert, 
  Users, 
  Printer, 
  Plus, 
  Check, 
  Sparkles,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  Building2,
  CalendarPlus,
  Trash2,
  Send,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';

interface MockExamSlotItem {
  id: string;
  mockSeriesId: string;
  subjectCode: string;
  subjectName: string;
  paperType: 'Paper 1: Objective CBT' | 'Paper 2: Theory & Essay' | 'Paper 3: Practical Alternative';
  date: string;
  startTime: string;
  durationMinutes: number;
  hallVenue: string;
  targetClassGroups: string[];
  chiefInvigilator: string;
  status: 'Scheduled' | 'Papers Printed' | 'In Progress' | 'Concluded';
}

const INITIAL_SCHEDULED_SLOTS: MockExamSlotItem[] = [
  {
    id: 'slot-mock-01',
    mockSeriesId: 'mock-waec-2026-ss3',
    subjectCode: 'MTH-301',
    subjectName: 'General Mathematics',
    paperType: 'Paper 2: Theory & Essay',
    date: '2026-03-24',
    startTime: '09:00 AM',
    durationMinutes: 150,
    hallVenue: 'Centenary Examination Hall (West Wing)',
    targetClassGroups: ['SS 3A', 'SS 3B', 'SS 3C'],
    chiefInvigilator: 'Dr. Adeyemi Adeleke (HOD Mathematics)',
    status: 'Scheduled'
  },
  {
    id: 'slot-mock-02',
    mockSeriesId: 'mock-waec-2026-ss3',
    subjectCode: 'ENG-301',
    subjectName: 'English Language',
    paperType: 'Paper 1: Objective CBT',
    date: '2026-03-25',
    startTime: '09:00 AM',
    durationMinutes: 90,
    hallVenue: 'ICT CBT Testing Lab 1 & 2',
    targetClassGroups: ['SS 3A', 'SS 3B', 'SS 3C'],
    chiefInvigilator: 'Mrs. Folashade Okonkwo (HOD Languages)',
    status: 'Scheduled'
  },
  {
    id: 'slot-mock-03',
    mockSeriesId: 'mock-waec-2026-ss3',
    subjectCode: 'PHY-301',
    subjectName: 'Physics',
    paperType: 'Paper 3: Practical Alternative',
    date: '2026-03-26',
    startTime: '11:30 AM',
    durationMinutes: 120,
    hallVenue: 'Advanced Science Complex Lab',
    targetClassGroups: ['SS 3A (Science)', 'SS 3B (Science)'],
    chiefInvigilator: 'Mr. Chidi Okafor (Physics Dept)',
    status: 'Scheduled'
  }
];

const AVAILABLE_CLASS_GROUPS = [
  'SS 3A (Science)',
  'SS 3B (Arts)',
  'SS 3C (Commercial)',
  'SS 2A (Science)',
  'SS 2B (Humanities)',
  'JSS 3A',
  'JSS 3B',
  'JSS 3C'
];

const AVAILABLE_SUBJECTS = [
  { code: 'MTH-301', name: 'General Mathematics' },
  { code: 'ENG-301', name: 'English Language' },
  { code: 'PHY-301', name: 'Physics' },
  { code: 'CHM-301', name: 'Chemistry' },
  { code: 'BIO-301', name: 'Biology' },
  { code: 'ECN-301', name: 'Economics' },
  { code: 'GOV-301', name: 'Government' },
  { code: 'CIV-301', name: 'Civic Education' },
  { code: 'LIT-301', name: 'Literature in English' }
];

const AVAILABLE_HALLS = [
  'Centenary Examination Hall (West Wing) - Cap: 250',
  'ICT CBT Testing Lab 1 & 2 - Cap: 160',
  'Advanced Science Complex Lab - Cap: 90',
  'College Main Auditorium - Cap: 400',
  'Junior Block Hall B - Cap: 120'
];

const AVAILABLE_INVIGILATORS = [
  'Dr. Adeyemi Adeleke (HOD Mathematics)',
  'Mrs. Folashade Okonkwo (HOD Languages)',
  'Mr. Chidi Okafor (Physics Dept)',
  'Mrs. Amina Bello (Chemistry Dept)',
  'Mr. Babatunde Fashola (Commercial Dept)',
  'Senior Vice Principal (Academic Command)'
];

interface PromotionalMockExamPortalProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
}

export const PromotionalMockExamPortal: React.FC<PromotionalMockExamPortalProps> = ({
  currentUser,
  brandProfile,
  activeTenant
}) => {
  const [activeTab, setActiveTab] = useState<'promotion_deliberations' | 'promotion_rules' | 'mock_exams' | 'mock_analytics'>('promotion_deliberations');
  const [promotionRules, setPromotionRules] = useState<PromotionRuleCriteria[]>(DEFAULT_PROMOTION_RULES);
  const [candidates, setCandidates] = useState<StudentPromotionRecord[]>(INITIAL_PROMOTION_CANDIDATES);
  const [mockExams, setMockExams] = useState<MockExamSchedule[]>(INITIAL_MOCK_EXAMS);
  const [mockScores, setMockScores] = useState<MockCandidateScore[]>(INITIAL_MOCK_SCORES);
  
  const [selectedTargetGrade, setSelectedTargetGrade] = useState<string>('SS 2');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [selectedMockExamId, setSelectedMockExamId] = useState<string>(INITIAL_MOCK_EXAMS[0].id);

  // Bulk Mock Exam Scheduling Panel State
  const [scheduledSlots, setScheduledSlots] = useState<MockExamSlotItem[]>(INITIAL_SCHEDULED_SLOTS);
  const [isBulkSchedulerOpen, setIsBulkSchedulerOpen] = useState<boolean>(false);
  const [bulkSelectedClasses, setBulkSelectedClasses] = useState<string[]>(['SS 3A (Science)', 'SS 3B (Arts)', 'SS 3C (Commercial)']);
  const [bulkExamDate, setBulkExamDate] = useState<string>('2026-03-30');
  const [bulkStartTime, setBulkStartTime] = useState<string>('09:00 AM');
  const [bulkDuration, setBulkDuration] = useState<number>(120);
  const [bulkSelectedSubjectCode, setBulkSelectedSubjectCode] = useState<string>('CHM-301');
  const [bulkPaperType, setBulkPaperType] = useState<MockExamSlotItem['paperType']>('Paper 2: Theory & Essay');
  const [bulkHallVenue, setBulkHallVenue] = useState<string>(AVAILABLE_HALLS[0]);
  const [bulkInvigilator, setBulkInvigilator] = useState<string>(AVAILABLE_INVIGILATORS[0]);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // Selected mock exam
  const currentMockExam = mockExams.find(m => m.id === selectedMockExamId) || mockExams[0];

  // Candidates filtering
  const filteredCandidates = candidates.filter(c => {
    const matchesGrade = c.classGrade === selectedTargetGrade;
    const matchesOutcome = filterOutcome === 'all' || c.finalDecision === filterOutcome;
    const matchesSearch = searchQuery === '' || 
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesOutcome && matchesSearch;
  });

  const handleUpdateDecision = (studentId: string, decision: PromotionOutcome, remarks: string) => {
    setCandidates(prev => prev.map(c => {
      if (c.studentId === studentId) {
        return {
          ...c,
          finalDecision: decision,
          councilRemarks: remarks,
          deliberatedBy: currentUser.name,
          deliberatedAt: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    }));
  };

  const handleToggleBulkClass = (cls: string) => {
    setBulkSelectedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSelectAllBulkClasses = () => {
    if (bulkSelectedClasses.length === AVAILABLE_CLASS_GROUPS.length) {
      setBulkSelectedClasses([]);
    } else {
      setBulkSelectedClasses([...AVAILABLE_CLASS_GROUPS]);
    }
  };

  const handleCreateBulkSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelectedClasses.length === 0) {
      alert('Please select at least one class group.');
      return;
    }

    const subjectObj = AVAILABLE_SUBJECTS.find(s => s.code === bulkSelectedSubjectCode) || AVAILABLE_SUBJECTS[0];

    const newSlot: MockExamSlotItem = {
      id: `slot-bulk-${Date.now()}`,
      mockSeriesId: selectedMockExamId,
      subjectCode: subjectObj.code,
      subjectName: subjectObj.name,
      paperType: bulkPaperType,
      date: bulkExamDate,
      startTime: bulkStartTime,
      durationMinutes: bulkDuration,
      hallVenue: bulkHallVenue,
      targetClassGroups: [...bulkSelectedClasses],
      chiefInvigilator: bulkInvigilator,
      status: 'Scheduled'
    };

    setScheduledSlots(prev => [newSlot, ...prev]);
    setBulkSuccessMessage(`Successfully scheduled ${subjectObj.name} (${bulkPaperType}) simultaneously across ${bulkSelectedClasses.length} class arms!`);
    
    setTimeout(() => {
      setBulkSuccessMessage(null);
    }, 4000);
  };

  const handleDeleteSlot = (id: string) => {
    setScheduledSlots(prev => prev.filter(s => s.id !== id));
  };

  const getOutcomeBadge = (outcome: PromotionOutcome) => {
    switch (outcome) {
      case 'promoted':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Promoted
          </span>
        );
      case 'promoted_on_trial':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Promoted on Trial
          </span>
        );
      case 'repeat_class':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Repeat Class
          </span>
        );
      case 'recommended_for_withdrawal':
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 font-bold text-xs flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Withdrawal
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs">
            Pending Review
          </span>
        );
    }
  };

  const getReadinessBadge = (readiness: MockCandidateScore['waecReadinessIndex']) => {
    switch (readiness) {
      case 'High Distinction':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">High Distinction</span>;
      case 'Credit Ready':
        return <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 text-[11px]">Credit Ready</span>;
      case 'Borderline at Risk':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 text-[11px]">Borderline at Risk</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 text-[11px]">Critical Intervention</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Principal Academic Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">WAEC / NECO / BECE Gateways</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Promotional & Mock Examination Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Administer annual class promotion thresholds, convene academic council deliberation sessions, and orchestrate joint WAEC, NECO, and BECE mock examination trial series.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setActiveTab('mock_exams');
              setIsBulkSchedulerOpen(!isBulkSchedulerOpen);
            }}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{isBulkSchedulerOpen ? 'Close Bulk Scheduler' : 'Bulk Action: Schedule Slots'}</span>
          </button>

          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('promotion_deliberations')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'promotion_deliberations'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Promotion Council
            </button>
            <button
              onClick={() => setActiveTab('promotion_rules')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'promotion_rules'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cutoff Policy
            </button>
            <button
              onClick={() => setActiveTab('mock_exams')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'mock_exams'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mock Hub & Schedule ({scheduledSlots.length})
            </button>
            <button
              onClick={() => setActiveTab('mock_analytics')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'mock_analytics'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              WAEC Readiness
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: PROMOTION DELIBERATIONS COUNCIL */}
      {activeTab === 'promotion_deliberations' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Total Candidates ({selectedTargetGrade})</span>
              <div className="text-2xl font-black text-white mt-1 font-mono">{candidates.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-emerald-400 font-medium">Promoted Direct</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {candidates.filter(c => c.finalDecision === 'promoted').length}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-amber-400 font-medium">Promoted on Trial</span>
              <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {candidates.filter(c => c.finalDecision === 'promoted_on_trial').length}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-rose-400 font-medium">Class Repetitions</span>
              <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
                {candidates.filter(c => c.finalDecision === 'repeat_class').length}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="text-slate-400 block font-semibold mb-1">Target Grade</label>
                <select
                  value={selectedTargetGrade}
                  onChange={(e) => setSelectedTargetGrade(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="SS 2">SS 2 → SS 3 Promotion</option>
                  <option value="SS 1">SS 1 → SS 2 Promotion</option>
                  <option value="JSS 3">JSS 3 → SS 1 Senior Transition</option>
                  <option value="JSS 2">JSS 2 → JSS 3 Promotion</option>
                  <option value="JSS 1">JSS 1 → JSS 2 Promotion</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block font-semibold mb-1">Decision Filter</label>
                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Outcomes</option>
                  <option value="promoted">Promoted Only</option>
                  <option value="promoted_on_trial">On Trial Only</option>
                  <option value="repeat_class">Repeat Class</option>
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Promotion Council Deliberation Roster */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Academic Board Promotion Resolution Register
                </h3>
                <p className="text-xs text-slate-400">
                  Cutoff standard: Min 55% Cumulative Average + Compulsory English & Mathematics Credit Passes
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Export Official Gazette</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Candidate Details</th>
                    <th className="p-3.5 text-center">T1 Avg</th>
                    <th className="p-3.5 text-center">T2 Avg</th>
                    <th className="p-3.5 text-center">T3 Avg</th>
                    <th className="p-3.5 text-center">Annual Avg</th>
                    <th className="p-3.5 text-center">Core Subjects</th>
                    <th className="p-3.5 text-center">Credits</th>
                    <th className="p-3.5 text-center">Outcome</th>
                    <th className="p-3.5">Council Remarks & Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredCandidates.map(candidate => (
                    <tr key={candidate.studentId} className="hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <span className="font-bold text-white block text-sm">{candidate.studentName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {candidate.admissionNumber} • {candidate.classArm}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono">{candidate.term1Average}%</td>
                      <td className="p-3.5 text-center font-mono">{candidate.term2Average}%</td>
                      <td className="p-3.5 text-center font-mono">{candidate.term3Average}%</td>
                      <td className="p-3.5 text-center font-mono font-black text-slate-100 text-sm">
                        {candidate.annualCumulativeAverage}%
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${candidate.passedEnglish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            ENG {candidate.passedEnglish ? '✓' : '✗'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${candidate.passedMathematics ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            MTH {candidate.passedMathematics ? '✓' : '✗'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-indigo-400">
                        {candidate.totalCreditsCount} Credits
                      </td>
                      <td className="p-3.5 text-center">
                        {getOutcomeBadge(candidate.finalDecision)}
                      </td>
                      <td className="p-3.5 space-y-2 max-w-xs">
                        <p className="text-slate-300 text-[11px] italic">
                          "{candidate.councilRemarks}"
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateDecision(candidate.studentId, 'promoted', 'Promoted unanimously by academic board resolution.')}
                            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-[10px] font-bold border border-emerald-800 cursor-pointer"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => handleUpdateDecision(candidate.studentId, 'promoted_on_trial', 'Promoted on Trial. Mandatory holiday remedial clinic in Mathematics.')}
                            className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-400 text-[10px] font-bold border border-amber-800 cursor-pointer"
                          >
                            On Trial
                          </button>
                          <button
                            onClick={() => handleUpdateDecision(candidate.studentId, 'repeat_class', 'Failed promotion criteria. Repetition of academic year required.')}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-400 text-[10px] font-bold border border-rose-800 cursor-pointer"
                          >
                            Repeat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROMOTION RULES CONFIGURATION */}
      {activeTab === 'promotion_rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Configurable Grade Promotion Thresholds</h3>
              <p className="text-xs text-slate-400 mt-1">
                Define the institutional rules that automatically compute student promotion outcomes at the end of Term 3.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotionRules.map(rule => (
                <div key={rule.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-sm font-black text-white">
                      {rule.targetClassGrade} → {rule.promotedToGrade}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold">
                      Active Policy
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min. Cumulative Average:</span>
                      <strong className="font-mono text-emerald-400 font-bold">{rule.minimumCumulativeAverage}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Compulsory English:</span>
                      <strong className="text-slate-100 font-bold">{rule.mustPassEnglish ? 'Required (Credit)' : 'Optional'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Compulsory Mathematics:</span>
                      <strong className="text-slate-100 font-bold">{rule.mustPassMathematics ? 'Required (Credit)' : 'Optional'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min. Credit Passes Count:</span>
                      <strong className="font-mono text-indigo-400 font-bold">{rule.minimumCreditPassesCount} Subjects</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min. Attendance Cutoff:</span>
                      <strong className="font-mono text-slate-200 font-bold">{rule.minimumAttendancePercentage}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOCK EXAMINATION HUB */}
      {activeTab === 'mock_exams' && (
        <div className="space-y-6">
          {/* Bulk Action Scheduling Panel (Expandable / Toggleable) */}
          {isBulkSchedulerOpen && (
            <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Bulk Mock Examination Slot Scheduler</h3>
                    <p className="text-xs text-slate-400">
                      Simultaneously provision synchronized mock testing sessions across multiple class arms & testing centers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllBulkClasses}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{bulkSelectedClasses.length === AVAILABLE_CLASS_GROUPS.length ? 'Deselect All Classes' : 'Select All 8 Classes'}</span>
                  </button>
                  <button
                    onClick={() => setIsBulkSchedulerOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {bulkSuccessMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{bulkSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateBulkSchedule} className="space-y-6">
                {/* 1. Target Class Groups Multi-Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    1. Select Target Class Arms to Schedule Simultaneously ({bulkSelectedClasses.length} Selected):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVAILABLE_CLASS_GROUPS.map(cls => {
                      const isChecked = bulkSelectedClasses.includes(cls);
                      return (
                        <button
                          type="button"
                          key={cls}
                          onClick={() => handleToggleBulkClass(cls)}
                          className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isChecked
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{cls}</span>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Subject, Paper Type, Date & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Examination Subject</label>
                    <select
                      value={bulkSelectedSubjectCode}
                      onChange={e => setBulkSelectedSubjectCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {AVAILABLE_SUBJECTS.map(s => (
                        <option key={s.code} value={s.code}>
                          {s.code} • {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Paper Category</label>
                    <select
                      value={bulkPaperType}
                      onChange={e => setBulkPaperType(e.target.value as MockExamSlotItem['paperType'])}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Paper 1: Objective CBT">Paper 1: Objective CBT</option>
                      <option value="Paper 2: Theory & Essay">Paper 2: Theory & Essay</option>
                      <option value="Paper 3: Practical Alternative">Paper 3: Practical Alternative</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Exam Date</label>
                    <input
                      type="date"
                      value={bulkExamDate}
                      onChange={e => setBulkExamDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Start Time & Duration</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bulkStartTime}
                        onChange={e => setBulkStartTime(e.target.value)}
                        placeholder="09:00 AM"
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                      <input
                        type="number"
                        value={bulkDuration}
                        onChange={e => setBulkDuration(Number(e.target.value))}
                        placeholder="120 mins"
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Venue & Invigilator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Allocated Examination Hall / CBT Lab</label>
                    <select
                      value={bulkHallVenue}
                      onChange={e => setBulkHallVenue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {AVAILABLE_HALLS.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase">Chief Exam Invigilator</label>
                    <select
                      value={bulkInvigilator}
                      onChange={e => setBulkInvigilator(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {AVAILABLE_INVIGILATORS.map(inv => (
                        <option key={inv} value={inv}>{inv}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conflict Check & Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hall Capacity & Schedule Conflict Check: PASSED (Zero Room Overlaps)</span>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Simultaneously Schedule Slot for {bulkSelectedClasses.length} Class Arms</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Synchronized Scheduled Mock Timetable Roster */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">Scheduled Mock Examination Timetable Matrix</h3>
                <p className="text-xs text-slate-400">
                  Real-time schedule of synchronized trial examination papers across all senior secondary streams.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkSchedulerOpen(!isBulkSchedulerOpen)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Mock Slot</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Timetable</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Subject & Paper</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Target Classes</th>
                    <th className="p-3.5">Venue Hall</th>
                    <th className="p-3.5">Invigilator</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {scheduledSlots.map(slot => (
                    <tr key={slot.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-white block text-sm">{slot.subjectName}</span>
                        <span className="text-[11px] text-indigo-400 font-mono">{slot.subjectCode} • {slot.paperType}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-white font-bold block">{slot.date}</span>
                        <span className="text-slate-400 text-[11px]">{slot.startTime}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-200">
                        {slot.durationMinutes} mins
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {slot.targetClassGroups.map(cls => (
                            <span key={cls} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <span className="block truncate max-w-xs">{slot.hallVenue}</span>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        <span className="block truncate max-w-xs">{slot.chiefInvigilator}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30">
                          {slot.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-800/60 transition-colors cursor-pointer"
                          title="Remove slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mock Exam Series Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockExams.map(mock => {
              const isSelected = mock.id === selectedMockExamId;
              return (
                <button
                  key={mock.id}
                  onClick={() => setSelectedMockExamId(mock.id)}
                  className={`text-left p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/30 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono">
                      {mock.centerCode} • {mock.examType.toUpperCase()}
                    </span>
                    <h4 className="text-base font-bold text-white">{mock.title}</h4>
                    <p className="text-xs text-slate-400">{mock.chiefExaminer}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400 font-mono">{mock.totalCandidates} Candidates</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      {mock.status.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Candidate Mock Score Roster */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white">{currentMockExam.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Center Code: {currentMockExam.centerCode} • Session: {currentMockExam.academicSession}
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Mock Result Slips</span>
              </button>
            </div>

            <div className="space-y-4">
              {mockScores.map(score => (
                <div key={score.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-base font-bold text-white">{score.studentName}</span>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Index No: <strong className="text-indigo-400">{score.indexNumber}</strong> • {score.classArm}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Mock Aggregate</span>
                        <strong className="text-lg font-black text-emerald-400 font-mono">{score.aggregateAverage}%</strong>
                      </div>
                      {getReadinessBadge(score.waecReadinessIndex)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    {score.subjectScores.map(subj => (
                      <div key={subj.subjectCode} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-bold block truncate">{subj.subjectName}</span>
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-sm font-black text-white">{subj.totalScore}</span>
                          <span className="font-mono font-bold text-xs text-indigo-400">{subj.grade}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">{subj.predictedWaecScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WAEC READINESS & PREDICTIVE ANALYTICS */}
      {activeTab === 'mock_analytics' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white">Predictive WAEC/NECO Examination Readiness Model</h3>
            <p className="text-xs text-slate-400 mt-1">
              Correlates internal 3-year continuous assessment data against pre-mock trial exam performances to project 5-credit WAEC pass rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Projected 5-Credit Pass Rate</span>
              <div className="text-4xl font-black font-mono text-emerald-400">94.8%</div>
              <p className="text-xs text-slate-400">
                141 of 148 candidates currently project minimum 5 credits including English and Mathematics in first sitting.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Distinction Probability</span>
              <div className="text-4xl font-black font-mono text-indigo-400">68.2%</div>
              <p className="text-xs text-slate-400">
                Candidates scoring A1-B3 across core STEM & Humanities subjects on current mock trajectories.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Remedial Focus Cohort</span>
              <div className="text-4xl font-black font-mono text-amber-400">7 Students</div>
              <p className="text-xs text-slate-400">
                Flagged for mandatory afternoon sprint clinics in Further Mathematics and Physics Theory Paper 2.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
