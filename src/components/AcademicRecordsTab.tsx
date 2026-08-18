import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  ClassGroup, 
  Teacher, 
  Student, 
  StudentSubjectScore, 
  ClassAcademicRecord, 
  StudentTermSummary, 
  ScoreGrade, 
  Term, 
  RLSPermissionEvaluation, 
  ScoreAuditRecord 
} from '../types';
import { 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Award, 
  TrendingUp, 
  Check, 
  X, 
  Edit3, 
  Eye, 
  Save, 
  Layers, 
  ShieldAlert, 
  Clock, 
  Star, 
  Calendar, 
  Send, 
  HelpCircle, 
  BarChart3, 
  Sliders, 
  GraduationCap,
  PieChart as PieChartIcon,
  ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { 
  evaluateRLSAccess, 
  calculateGradeAndPoints,
  SS2_SCIENCE_SUBJECTS,
  JSS2_ALPHA_SUBJECTS
} from '../data/academicRecordsData';

interface AcademicRecordsTabProps {
  currentUser: UserProfile;
  classGroups: ClassGroup[];
  teachers: Teacher[];
  students: Student[];
  subjectScores: StudentSubjectScore[];
  classRecords: ClassAcademicRecord[];
  onUpdateSubjectScore: (updatedScore: StudentSubjectScore) => void;
  onBatchUpdateScores: (updatedScores: StudentSubjectScore[]) => void;
  onUpdateStudentTermSummary: (classGroupId: string, summary: StudentTermSummary) => void;
  onLockSubjectScores: (subjectId: string, classGroupId: string) => void;
  onUnlockSubjectScores: (subjectId: string, classGroupId: string) => void;
  onApproveBroadsheet: (classRecordId: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const AcademicRecordsTab: React.FC<AcademicRecordsTabProps> = ({
  currentUser,
  classGroups,
  teachers,
  students,
  subjectScores,
  classRecords,
  onUpdateSubjectScore,
  onBatchUpdateScores,
  onUpdateStudentTermSummary,
  onLockSubjectScores,
  onUnlockSubjectScores,
  onApproveBroadsheet,
  onNavigateTab
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'subject_gradebook' | 'master_broadsheet' | 'grade_histogram' | 'report_cards' | 'rls_inspector'
  >('subject_gradebook');

  // Selected Class & Subject
  const [selectedClassId, setSelectedClassId] = useState<string>(classGroups[0]?.id || 'grp-ss2-scia');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('General Mathematics');
  const [selectedTerm, setSelectedTerm] = useState<Term>('Term 1');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Histogram view controls
  const [histogramSubjectMode, setHistogramSubjectMode] = useState<string>('all_broadsheet');
  const [selectedHistogramBracket, setSelectedHistogramBracket] = useState<string | null>(null);

  // Active Simulated Teacher for Subject Portal testing (Allows testing different subject teacher portals)
  const [activeTeacherActorId, setActiveTeacherActorId] = useState<string>(
    currentUser.role === 'teacher' ? (currentUser.id || teachers[0]?.id || '') : (teachers[0]?.id || '')
  );

  // Edit State for Gradebook
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
    comment: string;
  }>({ ca1: 0, ca2: 0, ca3: 0, exam: 0, comment: '' });

  // Affective & Psychomotor Modal for Form Teacher
  const [editingSummaryStudentId, setEditingSummaryStudentId] = useState<string | null>(null);
  const [summaryEditData, setSummaryEditData] = useState<StudentTermSummary | null>(null);

  // Quick Batch Fill Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<'fill_ca1' | 'fill_ca2' | 'fill_ca3' | 'curve_exam'>('fill_ca1');
  const [batchValue, setBatchValue] = useState<number>(12);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Resolve current active class group
  const currentClassGroup = useMemo(() => {
    return classGroups.find(cg => cg.id === selectedClassId) || classGroups[0];
  }, [classGroups, selectedClassId]);

  // Resolve active simulated user (For testing RLS across Teacher Portals vs Principal vs Student)
  const activeActorUser = useMemo(() => {
    if (currentUser.role === 'principal' || currentUser.role === 'academic_coordinator' || currentUser.role === 'exam_officer' || currentUser.role === 'student') {
      return currentUser;
    }
    const t = teachers.find(teach => teach.id === activeTeacherActorId);
    if (t) {
      return {
        id: t.id,
        name: t.fullName,
        title: `${t.qualification} - ${t.department}`,
        role: 'teacher' as const,
        avatar: t.avatar,
        assignedSubjects: t.subjects,
        assignedClasses: t.assignedClassGroupNames as any,
        department: t.department
      };
    }
    return currentUser;
  }, [currentUser, activeTeacherActorId, teachers]);

  // Available subjects for the active class group
  const availableSubjectsForClass = useMemo(() => {
    if (currentClassGroup?.grade?.includes('SS')) {
      return SS2_SCIENCE_SUBJECTS;
    }
    return JSS2_ALPHA_SUBJECTS;
  }, [currentClassGroup]);

  // RLS Access Evaluation for current actor in selected class and subject
  const rlsEvaluation: RLSPermissionEvaluation = useMemo(() => {
    return evaluateRLSAccess(activeActorUser, currentClassGroup, selectedSubjectId, teachers);
  }, [activeActorUser, currentClassGroup, selectedSubjectId, teachers]);

  // Filtered Subject Scores for active Gradebook view
  const currentGradebookScores = useMemo(() => {
    return subjectScores.filter(
      sc => sc.classGroupId === selectedClassId && 
            sc.subjectId === selectedSubjectId && 
            sc.term === selectedTerm
    );
  }, [subjectScores, selectedClassId, selectedSubjectId, selectedTerm]);

  // Enrolled students in active class
  const classStudents = useMemo(() => {
    return students.filter(s => s.classGroupId === selectedClassId);
  }, [students, selectedClassId]);

  // Current Compiled Class Broadsheet Record
  const currentClassRecord = useMemo(() => {
    return classRecords.find(r => r.classGroupId === selectedClassId && r.term === selectedTerm) || classRecords[0];
  }, [classRecords, selectedClassId, selectedTerm]);

  // Gradebook Subject Performance Statistics
  const subjectStats = useMemo(() => {
    if (currentGradebookScores.length === 0) {
      return { count: 0, average: 0, highest: 0, lowest: 0, passRate: 0, distinctions: 0, credits: 0, passes: 0, fails: 0 };
    }
    const totals = currentGradebookScores.map(s => s.totalScore);
    const sum = totals.reduce((a, b) => a + b, 0);
    const avg = Number((sum / totals.length).toFixed(1));
    const highest = Math.max(...totals);
    const lowest = Math.min(...totals);
    const passesCount = currentGradebookScores.filter(s => s.totalScore >= 50).length;
    const passRate = Math.round((passesCount / currentGradebookScores.length) * 100);

    const distinctions = currentGradebookScores.filter(s => ['A1', 'B2', 'B3'].includes(s.grade)).length;
    const credits = currentGradebookScores.filter(s => ['C4', 'C5', 'C6'].includes(s.grade)).length;
    const passes = currentGradebookScores.filter(s => ['D7', 'E8'].includes(s.grade)).length;
    const fails = currentGradebookScores.filter(s => s.grade === 'F9').length;

    return { count: currentGradebookScores.length, average: avg, highest, lowest, passRate, distinctions, credits, passes, fails };
  }, [currentGradebookScores]);

  // Grade Distribution Histogram Calculation for selected Class Group and Term
  const gradeDistributionData = useMemo(() => {
    interface ScoreSample {
      studentId: string;
      studentName: string;
      score: number;
      grade: string;
      subjectName: string;
    }

    const entries: ScoreSample[] = [];

    if (histogramSubjectMode === 'all_broadsheet') {
      // Calculate overall average for each student in current class
      classStudents.forEach(st => {
        const studentScoresForTerm = subjectScores.filter(
          s => s.studentId === st.id && s.classGroupId === selectedClassId && s.term === selectedTerm
        );
        if (studentScoresForTerm.length > 0) {
          const avg = studentScoresForTerm.reduce((acc, s) => acc + s.totalScore, 0) / studentScoresForTerm.length;
          const roundedAvg = Math.round(avg * 10) / 10;
          const { grade } = calculateGradeAndPoints(roundedAvg);
          entries.push({
            studentId: st.id,
            studentName: st.fullName,
            score: roundedAvg,
            grade,
            subjectName: 'Broadsheet Composite Average'
          });
        }
      });
    } else {
      // Specific subject scores
      const subjectScoresList = subjectScores.filter(
        s => s.classGroupId === selectedClassId && s.subjectId === histogramSubjectMode && s.term === selectedTerm
      );
      subjectScoresList.forEach(s => {
        entries.push({
          studentId: s.studentId,
          studentName: s.studentName,
          score: s.totalScore,
          grade: s.grade,
          subjectName: s.subjectName
        });
      });
    }

    const totalAssessed = entries.length || 1;

    // Standard Score Brackets: A, B, C, D, E, F
    const brackets = [
      {
        bracketKey: 'A',
        bracketLabel: 'Bracket A (75 - 100%)',
        shortLabel: 'A (75-100%)',
        gradeName: 'Distinction (A1)',
        range: '75 - 100',
        color: '#10b981', // Emerald
        students: entries.filter(e => e.score >= 75)
      },
      {
        bracketKey: 'B',
        bracketLabel: 'Bracket B (65 - 74%)',
        shortLabel: 'B (65-74%)',
        gradeName: 'Very Good / Good (B2, B3)',
        range: '65 - 74',
        color: '#06b6d4', // Cyan
        students: entries.filter(e => e.score >= 65 && e.score < 75)
      },
      {
        bracketKey: 'C',
        bracketLabel: 'Bracket C (50 - 64%)',
        shortLabel: 'C (50-64%)',
        gradeName: 'Credit Pass (C4 - C6)',
        range: '50 - 64',
        color: '#3b82f6', // Blue
        students: entries.filter(e => e.score >= 50 && e.score < 65)
      },
      {
        bracketKey: 'D',
        bracketLabel: 'Bracket D (45 - 49%)',
        shortLabel: 'D (45-49%)',
        gradeName: 'Pass (D7)',
        range: '45 - 49',
        color: '#f59e0b', // Amber
        students: entries.filter(e => e.score >= 45 && e.score < 50)
      },
      {
        bracketKey: 'E',
        bracketLabel: 'Bracket E (40 - 44%)',
        shortLabel: 'E (40-44%)',
        gradeName: 'Fair Pass (E8)',
        range: '40 - 44',
        color: '#f97316', // Orange
        students: entries.filter(e => e.score >= 40 && e.score < 45)
      },
      {
        bracketKey: 'F',
        bracketLabel: 'Bracket F (0 - 39%)',
        shortLabel: 'F (0-39%)',
        gradeName: 'Fail / Remedial (F9)',
        range: '0 - 39',
        color: '#f43f5e', // Rose
        students: entries.filter(e => e.score < 40)
      }
    ];

    const chartData = brackets.map(b => ({
      bracketKey: b.bracketKey,
      bracketLabel: b.bracketLabel,
      shortLabel: b.shortLabel,
      gradeName: b.gradeName,
      range: b.range,
      count: b.students.length,
      percentage: Math.round((b.students.length / totalAssessed) * 100),
      color: b.color,
      students: b.students
    }));

    const scores = entries.map(e => e.score);
    const meanScore = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const highestScore = scores.length ? Math.max(...scores) : 0;
    const lowestScore = scores.length ? Math.min(...scores) : 0;

    const creditPassCount = chartData.filter(b => ['A', 'B', 'C'].includes(b.bracketKey)).reduce((a, b) => a + b.count, 0);
    const creditPassRate = Math.round((creditPassCount / totalAssessed) * 100);
    const remedialCount = chartData.filter(b => ['D', 'E', 'F'].includes(b.bracketKey)).reduce((a, b) => a + b.count, 0);

    return {
      entries,
      totalAssessed: entries.length,
      chartData,
      meanScore,
      highestScore,
      lowestScore,
      creditPassCount,
      creditPassRate,
      remedialCount
    };
  }, [histogramSubjectMode, classStudents, subjectScores, selectedClassId, selectedTerm]);

  // Handle opening inline score editor with RLS verification
  const handleStartEditScore = (score: StudentSubjectScore) => {
    if (!rlsEvaluation.canEditSubjectScore) {
      showToast(`RLS Access Denied: You do not have write permissions for ${score.subjectName}.`, 'error');
      return;
    }
    if (score.isLocked && !rlsEvaluation.canUnlockSubjectScore) {
      showToast(`Score Sheet is Locked: Contact the Principal or Exam Officer to unlock.`, 'warning');
      return;
    }
    setEditingScoreId(score.id);
    setEditFormData({
      ca1: score.ca1Score,
      ca2: score.ca2Score,
      ca3: score.ca3Score,
      exam: score.examScore,
      comment: score.teacherComment
    });
  };

  // Handle saving modified score
  const handleSaveScore = (score: StudentSubjectScore) => {
    if (!rlsEvaluation.canEditSubjectScore) {
      showToast('RLS Access Denied: Unauthorized modification attempt logged in audit trail.', 'error');
      return;
    }

    const ca1 = Math.min(15, Math.max(0, Number(editFormData.ca1) || 0));
    const ca2 = Math.min(15, Math.max(0, Number(editFormData.ca2) || 0));
    const ca3 = Math.min(10, Math.max(0, Number(editFormData.ca3) || 0));
    const exam = Math.min(60, Math.max(0, Number(editFormData.exam) || 0));
    const newTotal = ca1 + ca2 + ca3 + exam;
    const { grade, points, remarks } = calculateGradeAndPoints(newTotal);

    const auditEntry: ScoreAuditRecord = {
      timestamp: new Date().toISOString(),
      actorId: activeActorUser.id,
      actorName: activeActorUser.name,
      actorRole: activeActorUser.role,
      fieldModified: 'Continuous Assessment & Exam Score Update',
      previousValue: score.totalScore,
      newValue: newTotal,
      reason: 'Subject Teacher Portal adjustment'
    };

    const updatedScore: StudentSubjectScore = {
      ...score,
      ca1Score: ca1,
      ca2Score: ca2,
      ca3Score: ca3,
      examScore: exam,
      totalScore: newTotal,
      grade,
      gradePoints: points,
      remarks,
      teacherComment: editFormData.comment || score.teacherComment,
      auditTrail: [auditEntry, ...(score.auditTrail || [])]
    };

    onUpdateSubjectScore(updatedScore);
    setEditingScoreId(null);
    showToast(`Saved score for ${score.studentName}: ${newTotal}/100 (${grade})`);
  };

  // Quick Batch Fill Action
  const handleExecuteBatchAction = () => {
    if (!rlsEvaluation.canEditSubjectScore) {
      showToast('RLS Access Denied: You cannot batch-edit this subject gradebook.', 'error');
      return;
    }

    const updated = currentGradebookScores.map(score => {
      let ca1 = score.ca1Score;
      let ca2 = score.ca2Score;
      let ca3 = score.ca3Score;
      let exam = score.examScore;

      if (batchActionType === 'fill_ca1') ca1 = Math.min(15, batchValue);
      if (batchActionType === 'fill_ca2') ca2 = Math.min(15, batchValue);
      if (batchActionType === 'fill_ca3') ca3 = Math.min(10, batchValue);
      if (batchActionType === 'curve_exam') exam = Math.min(60, Math.max(0, exam + batchValue));

      const newTotal = ca1 + ca2 + ca3 + exam;
      const { grade, points, remarks } = calculateGradeAndPoints(newTotal);

      return {
        ...score,
        ca1Score: ca1,
        ca2Score: ca2,
        ca3Score: ca3,
        examScore: exam,
        totalScore: newTotal,
        grade,
        gradePoints: points,
        remarks,
        auditTrail: [
          {
            timestamp: new Date().toISOString(),
            actorId: activeActorUser.id,
            actorName: activeActorUser.name,
            actorRole: activeActorUser.role,
            fieldModified: `Batch Action: ${batchActionType}`,
            previousValue: score.totalScore,
            newValue: newTotal,
            reason: `Batch calculation (${batchValue})`
          },
          ...(score.auditTrail || [])
        ]
      };
    });

    onBatchUpdateScores(updated);
    setIsBatchModalOpen(false);
    showToast(`Batch updated ${updated.length} student scores successfully!`);
  };

  // Toggle Subject Lock
  const handleToggleLock = () => {
    const isCurrentlyLocked = currentGradebookScores.some(s => s.isLocked);
    if (isCurrentlyLocked) {
      if (!rlsEvaluation.canUnlockSubjectScore) {
        showToast('RLS Violation: Only Principal or Exam Officer can unlock finalized score sheets.', 'error');
        return;
      }
      onUnlockSubjectScores(selectedSubjectId, selectedClassId);
      showToast(`Subject grade sheet unlocked by ${activeActorUser.name}.`);
    } else {
      onLockSubjectScores(selectedSubjectId, selectedClassId);
      showToast(`Subject grade sheet locked & digitally signed by ${activeActorUser.name}.`);
    }
  };

  // Open Affective & Psychomotor Domain Editor for Form Teacher
  const handleOpenSummaryModal = (summary: StudentTermSummary) => {
    if (!rlsEvaluation.canEditAffectiveAndPsychomotor) {
      showToast('RLS Access Denied: Only Form Master or Principal can edit student behavioral ratings.', 'error');
      return;
    }
    setEditingSummaryStudentId(summary.studentId);
    setSummaryEditData(JSON.parse(JSON.stringify(summary)));
  };

  // Save Form Teacher Behavioral & Remarks
  const handleSaveSummaryModal = () => {
    if (!summaryEditData) return;
    onUpdateStudentTermSummary(selectedClassId, summaryEditData);
    setEditingSummaryStudentId(null);
    setSummaryEditData(null);
    showToast(`Saved Form Master appraisal for ${summaryEditData.studentName}.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200'
            : notification.type === 'warning'
            ? 'bg-amber-950/95 border-amber-500/80 text-amber-200'
            : 'bg-rose-950/95 border-rose-500/80 text-rose-200'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
          {notification.type === 'error' && <ShieldAlert className="w-5 h-5 text-rose-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Academic Records Header & Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Academic Records & Continuous Assessment Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Class Group Broadsheets & Subject Teacher Portals
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strict Row-Level Security (RLS) continuous assessment management. Subject teachers manage dedicated subject gradebooks; Form masters consolidate broadsheets, affective domains, and report cards.
            </p>
          </div>

          {/* Teacher / Actor Switcher to demonstrate Subject Portals & RLS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Active Portal Identity</span>
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                {activeActorUser.name}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                {activeActorUser.role.toUpperCase()} • {activeActorUser.department || 'Academic'}
              </div>
            </div>

            {/* Quick Switch Dropdown */}
            <select
              value={activeTeacherActorId}
              onChange={(e) => setActiveTeacherActorId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <optgroup label="Subject Teachers">
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.subjects.slice(0, 2).join(', ')})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Live RLS Security Policy Banner */}
        <div className={`mt-6 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          rlsEvaluation.canEditSubjectScore
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-start sm:items-center gap-2.5">
            {rlsEvaluation.canEditSubjectScore ? (
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Unlock className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Lock className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>POLICY: {rlsEvaluation.activePolicyRule}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  rlsEvaluation.canEditSubjectScore ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {rlsEvaluation.canEditSubjectScore ? 'WRITE ALLOWED' : 'RESTRICTED / READ ONLY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {rlsEvaluation.policyDescription}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveSubTab('rls_inspector')}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold whitespace-nowrap"
          >
            Inspect RLS Rules
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center overflow-x-auto gap-2 pt-6 mt-6 border-t border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('subject_gradebook')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'subject_gradebook'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Subject Teacher Gradebook Portal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('master_broadsheet')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'master_broadsheet'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Class Master Broadsheet & Form Portal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('grade_histogram')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'grade_histogram'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Grade Distribution Histogram</span>
          </button>

          <button
            onClick={() => setActiveSubTab('report_cards')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'report_cards'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Student Terminal Report Cards</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rls_inspector')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'rls_inspector'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>RLS Security & Access Policy Matrix</span>
          </button>
        </div>
      </div>

      {/* Global Class Group & Term Filter Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class Group</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {classGroups.map(cg => (
                <option key={cg.id} value={cg.id}>
                  {cg.name} ({cg.grade} - Form: {cg.formTeacherName})
                </option>
              ))}
            </select>
          </div>

          {activeSubTab === 'subject_gradebook' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                {availableSubjectsForClass.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} (Taught by {sub.teacherName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as Term)}
              className="bg-slate-950 border border-slate-700 text-white font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="Term 1">Term 1 (Michaelmas)</option>
              <option value="Term 2">Term 2 (Lent)</option>
              <option value="Term 3">Term 3 (Trinity)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Enrolled Students:</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
            {classStudents.length} Students
          </span>
          <span className="text-xs text-slate-400 ml-2">Form Master:</span>
          <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {currentClassGroup?.formTeacherName}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBJECT TEACHER GRADEBOOK PORTAL */}
      {/* ========================================================================= */}
      {activeSubTab === 'subject_gradebook' && (
        <div className="space-y-6">
          {/* Gradebook Action Ribbon & KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Class Subject Average</div>
              <div className="text-xl font-black text-emerald-400">{subjectStats.average}%</div>
              <div className="text-[10px] text-slate-400">Target Benchmark: 65%</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Highest Score</div>
              <div className="text-xl font-black text-indigo-400">{subjectStats.highest}/100</div>
              <div className="text-[10px] text-emerald-400 font-medium">Distinction (A1)</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Lowest Score</div>
              <div className="text-xl font-black text-amber-400">{subjectStats.lowest}/100</div>
              <div className="text-[10px] text-slate-400">Remedial Flag &lt; 50%</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</div>
              <div className="text-xl font-black text-teal-400">{subjectStats.passRate}%</div>
              <div className="text-[10px] text-slate-400">{subjectStats.distinctions + subjectStats.credits} Passed</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Distinctions (A1-B3)</div>
              <div className="text-xl font-black text-amber-300">{subjectStats.distinctions}</div>
              <div className="text-[10px] text-slate-400">Scholastic Honors</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Credits / Passes</div>
              <div className="text-xl font-black text-sky-400">{subjectStats.credits + subjectStats.passes}</div>
              <div className="text-[10px] text-slate-400">Fails (F9): {subjectStats.fails}</div>
            </div>
          </div>

          {/* Toolbar: Batch Operations & Lock */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white">Subject Sheet Tools:</span>
              <button
                disabled={!rlsEvaluation.canEditSubjectScore}
                onClick={() => {
                  setBatchActionType('fill_ca1');
                  setBatchValue(12);
                  setIsBatchModalOpen(true);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  rlsEvaluation.canEditSubjectScore
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                    : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Batch Fill / Standardize CA</span>
              </button>

              <button
                onClick={handleToggleLock}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentGradebookScores.some(s => s.isLocked)
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                }`}
              >
                {currentGradebookScores.some(s => s.isLocked) ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Grade Sheet Finalized (Locked)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalize & Digitally Sign Sheet</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search student name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500 w-56 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Interactive Gradebook Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Admission No.</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3 text-center bg-slate-900/50">CA 1 (15m)</th>
                    <th className="py-3 px-3 text-center bg-slate-900/50">CA 2 (15m)</th>
                    <th className="py-3 px-3 text-center bg-slate-900/50">CA 3 / Project (10m)</th>
                    <th className="py-3 px-3 text-center bg-indigo-950/30 text-indigo-300">Exam (60m)</th>
                    <th className="py-3 px-3 text-center bg-emerald-950/40 text-emerald-300 font-black">Total (100)</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-3 text-center">Points</th>
                    <th className="py-3 px-4">Subject Teacher Qualitative Remarks</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentGradebookScores
                    .filter(s => searchQuery.trim() === '' || s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((score, index) => {
                      const isEditing = editingScoreId === score.id;
                      const calculatedCurrentTotal = isEditing 
                        ? (Number(editFormData.ca1) || 0) + (Number(editFormData.ca2) || 0) + (Number(editFormData.ca3) || 0) + (Number(editFormData.exam) || 0)
                        : score.totalScore;
                      const currentGradeCalc = calculateGradeAndPoints(calculatedCurrentTotal);

                      return (
                        <tr key={score.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-3 px-4 text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{score.admissionNumber}</td>
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                            {score.studentName}
                            <span className="text-[10px] text-slate-400 block font-normal font-sans">
                              {score.gender}
                            </span>
                          </td>

                          {/* CA 1 */}
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={15}
                                value={editFormData.ca1}
                                onChange={(e) => setEditFormData({ ...editFormData, ca1: Number(e.target.value) })}
                                className="w-14 text-center bg-slate-950 border border-emerald-500 text-white rounded-lg py-1 text-xs font-bold"
                              />
                            ) : (
                              <span className="font-semibold text-slate-200">{score.ca1Score}</span>
                            )}
                          </td>

                          {/* CA 2 */}
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={15}
                                value={editFormData.ca2}
                                onChange={(e) => setEditFormData({ ...editFormData, ca2: Number(e.target.value) })}
                                className="w-14 text-center bg-slate-950 border border-emerald-500 text-white rounded-lg py-1 text-xs font-bold"
                              />
                            ) : (
                              <span className="font-semibold text-slate-200">{score.ca2Score}</span>
                            )}
                          </td>

                          {/* CA 3 */}
                          <td className="py-2 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={editFormData.ca3}
                                onChange={(e) => setEditFormData({ ...editFormData, ca3: Number(e.target.value) })}
                                className="w-14 text-center bg-slate-950 border border-emerald-500 text-white rounded-lg py-1 text-xs font-bold"
                              />
                            ) : (
                              <span className="font-semibold text-slate-200">{score.ca3Score}</span>
                            )}
                          </td>

                          {/* Exam */}
                          <td className="py-2 px-3 text-center bg-indigo-950/10">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={editFormData.exam}
                                onChange={(e) => setEditFormData({ ...editFormData, exam: Number(e.target.value) })}
                                className="w-14 text-center bg-slate-950 border border-indigo-500 text-indigo-300 rounded-lg py-1 text-xs font-bold"
                              />
                            ) : (
                              <span className="font-bold text-indigo-300">{score.examScore}</span>
                            )}
                          </td>

                          {/* Total */}
                          <td className="py-3 px-3 text-center bg-emerald-950/20">
                            <span className="font-black text-sm text-emerald-400">
                              {calculatedCurrentTotal}
                            </span>
                          </td>

                          {/* Grade */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                              currentGradeCalc.grade === 'A1' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                              currentGradeCalc.grade === 'B2' || currentGradeCalc.grade === 'B3' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                              currentGradeCalc.grade.startsWith('C') ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                              currentGradeCalc.grade.startsWith('D') || currentGradeCalc.grade.startsWith('E') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {currentGradeCalc.grade}
                            </span>
                          </td>

                          {/* Points */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                            {currentGradeCalc.points}/9
                          </td>

                          {/* Teacher Qualitative Comment */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editFormData.comment}
                                onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
                                placeholder="Individual qualitative appraisal..."
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:border-emerald-500"
                              />
                            ) : (
                              <span className="text-xs text-slate-300 line-clamp-1 italic">
                                "{score.teacherComment}"
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveScore(score)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                                  title="Save Score"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingScoreId(null)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={!rlsEvaluation.canEditSubjectScore}
                                onClick={() => handleStartEditScore(score)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  rlsEvaluation.canEditSubjectScore
                                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 cursor-pointer'
                                    : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                                }`}
                                title={rlsEvaluation.canEditSubjectScore ? 'Edit CA/Exam Marks' : 'RLS Policy: Read-Only'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLASS MASTER BROADSHEET & FORM TEACHER PORTAL */}
      {/* ========================================================================= */}
      {activeSubTab === 'master_broadsheet' && (
        <div className="space-y-6">
          {/* Broadsheet Summary & Form Master Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" />
                <span>Form Master Consolidated Broadsheet</span>
              </div>
              <h2 className="text-xl font-black text-white">
                {currentClassGroup.name} Master Examination Broadsheet ({selectedTerm})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Supervisory consolidation of all subjects. Form masters enter terminal remarks, affective domain assessments, and calculate official class standings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (currentClassRecord) {
                    onApproveBroadsheet(currentClassRecord.id);
                    showToast('Broadsheet approved & certified by Principal!');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Principal Seal & Publish Results</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Broadsheet</span>
              </button>
            </div>
          </div>

          {/* Broadsheet KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Overall Class Average</div>
              <div className="text-2xl font-black text-emerald-400">
                {currentClassRecord?.classAveragePercentage || 74.6}%
              </div>
              <div className="text-[10px] text-slate-400">Highest: {currentClassRecord?.highestAveragePercentage || 88.5}%</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Class Pass Rate</div>
              <div className="text-2xl font-black text-teal-400">
                {currentClassRecord?.passRatePercentage || 100}%
              </div>
              <div className="text-[10px] text-emerald-400">All students &gt;= 50% pass mark</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Form Master</div>
              <div className="text-base font-bold text-white truncate">
                {currentClassGroup.formTeacherName}
              </div>
              <div className="text-[10px] text-slate-400">Room: {currentClassGroup.roomNumber}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Broadsheet Status</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-300 uppercase">
                  Approved & Certified
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Ready for report card dispatch</div>
            </div>
          </div>

          {/* Master Broadsheet Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-center">Pos</th>
                    <th className="py-3 px-4">Admission No.</th>
                    <th className="py-3 px-4">Student Name</th>
                    {availableSubjectsForClass.map(sub => (
                      <th key={sub.id} className="py-3 px-3 text-center whitespace-nowrap bg-slate-900/40">
                        {sub.name.split(' ')[0]}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center bg-indigo-950/40 text-indigo-300">Total Marks</th>
                    <th className="py-3 px-3 text-center bg-emerald-950/50 text-emerald-300 font-black">Average %</th>
                    <th className="py-3 px-3 text-center">GPA</th>
                    <th className="py-3 px-4">Form Master Appraisal</th>
                    <th className="py-3 px-3 text-center">Behavioral / Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentClassRecord?.studentSummaries.map((summary, idx) => (
                    <tr key={summary.studentId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-white">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${
                          idx === 0 ? 'bg-amber-500 text-slate-950 font-black' :
                          idx === 1 ? 'bg-slate-300 text-slate-950 font-black' :
                          idx === 2 ? 'bg-amber-700 text-white font-black' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{summary.admissionNumber}</td>
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {summary.studentName}
                      </td>

                      {/* Subject Scores */}
                      {availableSubjectsForClass.map(sub => {
                        const sc = summary.subjectScores.find(s => s.subjectId === sub.id);
                        const scoreVal = sc ? sc.totalScore : '-';
                        const scoreGrade = sc ? sc.grade : '';
                        return (
                          <td key={sub.id} className="py-3 px-3 text-center font-semibold">
                            {sc ? (
                              <span className={`text-xs ${
                                sc.totalScore >= 75 ? 'text-emerald-400 font-bold' :
                                sc.totalScore >= 60 ? 'text-teal-300' :
                                sc.totalScore >= 50 ? 'text-slate-300' :
                                'text-rose-400 font-bold'
                              }`}>
                                {scoreVal} <span className="text-[10px] text-slate-400">({scoreGrade})</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Obtained */}
                      <td className="py-3 px-3 text-center font-bold text-indigo-300 bg-indigo-950/20">
                        {summary.totalMarksObtained}
                      </td>

                      {/* Average */}
                      <td className="py-3 px-3 text-center font-black text-emerald-400 bg-emerald-950/30">
                        {summary.termAverage}%
                      </td>

                      {/* GPA */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                        {summary.gpa.toFixed(2)}
                      </td>

                      {/* Form Teacher Remark */}
                      <td className="py-3 px-4 text-xs text-slate-300 max-w-xs truncate italic">
                        "{summary.formTeacherRemarks}"
                      </td>

                      {/* Form Teacher Appraisal Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          disabled={!rlsEvaluation.canEditAffectiveAndPsychomotor}
                          onClick={() => handleOpenSummaryModal(summary)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                            rlsEvaluation.canEditAffectiveAndPsychomotor
                              ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-500/40 cursor-pointer'
                              : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
                          }`}
                        >
                          Appraise
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2.5. GRADE DISTRIBUTION HISTOGRAM VISUALIZATION (RECHARTS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'grade_histogram' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>Statistical Quality Control • Score Frequency Analytics</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Class Grade Distribution Histogram ({currentClassGroup.name})
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  Visualizing student academic score frequency across standardized performance brackets (A, B, C, D, E, F) to identify bell-curve skews, credit pass rates, and at-risk cohorts requiring adaptive remediation.
                </p>
              </div>

              {/* Subject Scope Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase px-2">Scope:</span>
                  <select
                    value={histogramSubjectMode}
                    onChange={(e) => {
                      setHistogramSubjectMode(e.target.value);
                      setSelectedHistogramBracket(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all_broadsheet">Class Consolidated Broadsheet (Overall Averages)</option>
                    <optgroup label="Individual Subjects">
                      {availableSubjectsForClass.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Taught by {s.teacherName})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export Histogram</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-850/80 border border-slate-700/70 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assessed Students</span>
                <div className="text-2xl font-black text-white">{gradeDistributionData.totalAssessed}</div>
                <span className="text-[10px] text-slate-400">100% evaluated in {selectedTerm}</span>
              </div>

              <div className="bg-slate-850/80 border border-slate-700/70 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Class Mean Score</span>
                <div className="text-2xl font-black text-emerald-400">{gradeDistributionData.meanScore}%</div>
                <span className="text-[10px] text-slate-400">High: {gradeDistributionData.highestScore}% | Low: {gradeDistributionData.lowestScore}%</span>
              </div>

              <div className="bg-slate-850/80 border border-slate-700/70 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Credit Pass Rate (A-C)</span>
                <div className="text-2xl font-black text-blue-400">{gradeDistributionData.creditPassRate}%</div>
                <span className="text-[10px] text-blue-400">{gradeDistributionData.creditPassCount} students ≥ 50%</span>
              </div>

              <div className="bg-slate-850/80 border border-slate-700/70 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">At-Risk / Remedials (D-F)</span>
                <div className="text-2xl font-black text-rose-400">{gradeDistributionData.remedialCount}</div>
                <span className="text-[10px] text-rose-400/90">{gradeDistributionData.remedialCount > 0 ? 'Remedial units recommended' : 'Zero at-risk students'}</span>
              </div>
            </div>
          </div>

          {/* Main Histogram Visual Canvas (Recharts) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Student Frequency Distribution Histogram</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                    {histogramSubjectMode === 'all_broadsheet' ? 'All Subjects Composite' : histogramSubjectMode}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hover over bars or click to inspect enrolled students in each grade bracket.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>A (Distinction)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-1"></span>
                <span>B-C (Pass)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ml-1"></span>
                <span>F (Fail)</span>
              </div>
            </div>

            {/* Recharts BarChart Container */}
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeDistributionData.chartData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const clickedKey = e.activePayload[0].payload.bracketKey;
                      setSelectedHistogramBracket(selectedHistogramBracket === clickedKey ? null : clickedKey);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="shortLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    allowDecimals={false}
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-2 max-w-xs">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-white">{data.bracketLabel}</span>
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono"
                                style={{ backgroundColor: `${data.color}20`, color: data.color }}
                              >
                                {data.gradeName}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between text-xs pt-1">
                              <span className="text-slate-400">Student Count:</span>
                              <span className="font-bold text-white text-sm">{data.count} Students ({data.percentage}%)</span>
                            </div>
                            {data.students.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Students in Bracket:</span>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar">
                                  {data.students.map((st: any, idx: number) => (
                                    <div key={idx} className="text-[11px] text-slate-300 flex justify-between">
                                      <span>{st.studentName}</span>
                                      <span className="font-mono font-bold" style={{ color: data.color }}>{st.score}% ({st.grade})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]}
                    className="cursor-pointer"
                  >
                    {gradeDistributionData.chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        opacity={selectedHistogramBracket === null || selectedHistogramBracket === entry.bracketKey ? 1 : 0.35}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Bracket Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {gradeDistributionData.chartData.map((bracket) => {
                const isSelected = selectedHistogramBracket === bracket.bracketKey;
                return (
                  <div
                    key={bracket.bracketKey}
                    onClick={() => setSelectedHistogramBracket(isSelected ? null : bracket.bracketKey)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-white/50 shadow-lg ring-2 ring-emerald-500/50'
                        : 'bg-slate-850/70 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{bracket.shortLabel}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: bracket.color }}
                      ></span>
                    </div>
                    <div className="text-lg font-black" style={{ color: bracket.color }}>
                      {bracket.count} <span className="text-xs font-normal text-slate-400">({bracket.percentage}%)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{bracket.gradeName}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Cohort Details Table for Selected or All Brackets */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {selectedHistogramBracket 
                    ? `Bracket ${selectedHistogramBracket} Student Roster (${
                        gradeDistributionData.chartData.find(b => b.bracketKey === selectedHistogramBracket)?.gradeName
                      })` 
                    : 'Complete Class Score Roster'
                  }
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedHistogramBracket ? 'Showing filtered student cohort in selected bracket.' : 'Showing all evaluated student marks sorted by score.'}
                </p>
              </div>

              {selectedHistogramBracket && (
                <button
                  onClick={() => setSelectedHistogramBracket(null)}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Clear Filter (Show All)
                </button>
              )}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-850 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Evaluation Subject</th>
                    <th className="p-3 text-center">Score / 100</th>
                    <th className="p-3 text-center">Grade Bracket</th>
                    <th className="p-3 text-center">Status / Policy</th>
                    <th className="p-3 text-right">Intervention Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {gradeDistributionData.entries
                    .filter(e => {
                      if (!selectedHistogramBracket) return true;
                      const bracket = gradeDistributionData.chartData.find(b => b.bracketKey === selectedHistogramBracket);
                      return bracket?.students.some(s => s.studentId === e.studentId);
                    })
                    .sort((a, b) => b.score - a.score)
                    .map((item, idx) => {
                      const { grade, remarks } = calculateGradeAndPoints(item.score);
                      const isDistinction = item.score >= 75;
                      const isPass = item.score >= 50;
                      const isAtRisk = item.score < 50;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-slate-400 font-mono">#{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{item.studentName}</td>
                          <td className="p-3 text-slate-400">{item.subjectName}</td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-bold text-sm text-white">{item.score}</span>
                            <span className="text-slate-500 text-[11px]">/100</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                              isDistinction ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                              isPass ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                              'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>
                              {grade} ({remarks})
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {isAtRisk ? (
                              <span className="text-[10px] text-rose-400 font-semibold flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Remedial Required</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Meets Standards</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isAtRisk ? (
                              <button
                                onClick={() => showToast(`Dispatched adaptive remedial trigger for ${item.studentName}`, 'warning')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-semibold transition-all"
                              >
                                Trigger Remedial
                              </button>
                            ) : (
                              <button
                                onClick={() => showToast(`Issued academic commendation certificate to ${item.studentName}`, 'success')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold transition-all"
                              >
                                Commend
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENT TERMINAL REPORT CARDS & TRANSCRIPT GENERATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'report_cards' && (
        <div className="space-y-6">
          {/* Student Selector Ribbon */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-300 uppercase">Select Student Report:</label>
              <select
                value={selectedStudentForReport || currentClassRecord?.studentSummaries[0]?.studentId || ''}
                onChange={(e) => setSelectedStudentForReport(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              >
                {currentClassRecord?.studentSummaries.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    #{s.classPosition} - {s.studentName} ({s.admissionNumber}) - {s.termAverage}%
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Report Card</span>
              </button>
            </div>
          </div>

          {/* Official Terminal Report Card Template */}
          {(() => {
            const activeReportStudent = currentClassRecord?.studentSummaries.find(
              s => s.studentId === (selectedStudentForReport || currentClassRecord.studentSummaries[0]?.studentId)
            ) || currentClassRecord?.studentSummaries[0];

            if (!activeReportStudent) return <div>No student selected.</div>;

            return (
              <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-300 max-w-4xl mx-auto space-y-8 font-serif print:p-0 print:border-none print:shadow-none">
                {/* School Crest & Header */}
                <div className="text-center border-b-2 border-slate-900 pb-6 space-y-1">
                  <div className="w-16 h-16 rounded-full bg-slate-950 text-white mx-auto flex items-center justify-center font-bold text-xl font-sans mb-2">
                    CF
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-950 font-sans">
                    CurriculumFlow Model College
                  </h1>
                  <p className="text-xs italic text-slate-700 font-sans">
                    Government Approved • Federal Ministry of Education & NERDC Standard Curriculum
                  </p>
                  <p className="text-xs text-slate-600 font-sans">
                    Victoria Island Campus, Lagos State, Nigeria • Phone: +234 1 800 287 7428
                  </p>
                  <div className="pt-2">
                    <span className="inline-block bg-slate-950 text-white font-sans text-xs font-black uppercase tracking-widest px-4 py-1 rounded">
                      Official Terminal Academic Continuous Assessment Report
                    </span>
                  </div>
                </div>

                {/* Student Biodata & Academic Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans border-b border-slate-200 pb-6">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Student Name</span>
                    <span className="font-bold text-slate-950 text-sm">{activeReportStudent.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Admission Number</span>
                    <span className="font-bold text-slate-950 font-mono text-sm">{activeReportStudent.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Class & Arm</span>
                    <span className="font-bold text-slate-950">{activeReportStudent.classGroupName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Term / Session</span>
                    <span className="font-bold text-slate-950">{activeReportStudent.term} • {activeReportStudent.academicSession}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Class Position</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {activeReportStudent.classPosition} of {activeReportStudent.totalStudentsInClass} Students
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Term Average</span>
                    <span className="font-black text-emerald-700 text-sm">{activeReportStudent.termAverage}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Attendance Record</span>
                    <span className="font-bold text-slate-950">
                      {activeReportStudent.daysPresent} / {activeReportStudent.totalSchoolDays} Days Present
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Next Term Resumption</span>
                    <span className="font-bold text-slate-950">{activeReportStudent.nextTermResumptionDate}</span>
                  </div>
                </div>

                {/* Academic Scores Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 font-sans">
                    I. Continuous Assessment & Examination Transcripts
                  </h3>
                  <table className="w-full text-left text-xs font-sans border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b border-slate-300">
                      <tr>
                        <th className="p-2 border border-slate-300">Subject</th>
                        <th className="p-2 text-center border border-slate-300">CA 1 (15)</th>
                        <th className="p-2 text-center border border-slate-300">CA 2 (15)</th>
                        <th className="p-2 text-center border border-slate-300">CA 3 (10)</th>
                        <th className="p-2 text-center border border-slate-300">Exam (60)</th>
                        <th className="p-2 text-center border border-slate-300 font-black">Total (100)</th>
                        <th className="p-2 text-center border border-slate-300">Grade</th>
                        <th className="p-2 border border-slate-300">Subject Teacher Qualitative Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {activeReportStudent.subjectScores.map(sc => (
                        <tr key={sc.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-950 border border-slate-300">{sc.subjectName}</td>
                          <td className="p-2 text-center border border-slate-300">{sc.ca1Score}</td>
                          <td className="p-2 text-center border border-slate-300">{sc.ca2Score}</td>
                          <td className="p-2 text-center border border-slate-300">{sc.ca3Score}</td>
                          <td className="p-2 text-center border border-slate-300 font-bold">{sc.examScore}</td>
                          <td className="p-2 text-center border border-slate-300 font-black text-slate-950 bg-slate-50">
                            {sc.totalScore}
                          </td>
                          <td className="p-2 text-center border border-slate-300 font-black">
                            {sc.grade}
                          </td>
                          <td className="p-2 text-[11px] text-slate-700 italic border border-slate-300">
                            "{sc.teacherComment}"
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Affective & Psychomotor Evaluation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-sans text-xs">
                  <div className="border border-slate-300 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-950 uppercase text-[11px] border-b border-slate-200 pb-1">
                      II. Affective Domain (Character & Conduct)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span>Punctuality:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Neatness:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Politeness:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leadership:</span>
                        <span className="font-bold font-mono">★★★★☆ (4/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attentiveness:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Honesty:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-950 uppercase text-[11px] border-b border-slate-200 pb-1">
                      III. Psychomotor Skills & Practical Development
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span>Handwriting:</span>
                        <span className="font-bold font-mono">★★★★☆ (4/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verbal Fluency:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sports & Games:</span>
                        <span className="font-bold font-mono">★★★★☆ (4/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Science Lab Tools:</span>
                        <span className="font-bold font-mono">★★★★★ (5/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Drawing & Crafts:</span>
                        <span className="font-bold font-mono">★★★★☆ (4/5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Musical & Drama:</span>
                        <span className="font-bold font-mono">★★★☆☆ (3/5)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Master & Principal Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-300 font-sans text-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Form Master's Remarks & Endorsement</span>
                    <p className="italic text-slate-800 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      "{activeReportStudent.formTeacherRemarks}"
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="font-bold">{currentClassGroup.formTeacherName}</span>
                      <span className="text-slate-500">Signature Date: {activeReportStudent.formTeacherSignatureDate}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Principal's Official Stamp & Seal</span>
                    <p className="italic text-slate-800 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      "{activeReportStudent.principalRemarks}"
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="font-bold">Dr. (Mrs.) Funke Adeyemi, Ph.D</span>
                      <span className="text-emerald-700 font-bold font-mono">[DIGITALLY CERTIFIED]</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RLS SECURITY & ACCESS POLICY INSPECTOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'rls_inspector' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Row-Level Security (RLS) Architecture & Authorization Matrix</span>
            </div>
            <h2 className="text-xl font-black text-white">
              Role-Based Database Isolation Engine
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              CurriculumFlow enforces database-level RLS policies to guarantee academic integrity. Subject teachers are isolated to their curriculum allocations; Form masters manage broadsheets; Principals maintain global verification authority; Students/Parents possess read-only scope.
            </p>
          </div>

          {/* Active Policies Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 font-mono">
                  POLICY: RLS_SUBJECT_TEACHER_ISOLATION
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Guarantees that a subject master can only write to rows where <code className="text-emerald-400 bg-slate-950 px-1 rounded font-mono">auth.uid = subject_allocation.teacher_id</code>. Modifying marks for unallocated subjects or classes triggers immediate access rejection.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div>• Write access: Own subject columns only</div>
                <div>• Read access: Assigned class groups only</div>
                <div>• Lock status: Immutable once submitted by teacher</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-400 font-mono">
                  POLICY: RLS_FORM_TEACHER_BROADSHEET_SCOPE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Authorizes the Form Master of a class group (<code className="text-indigo-400 bg-slate-950 px-1 rounded font-mono">auth.uid = class_group.form_teacher_id</code>) to view consolidated broadsheet marks and update affective/psychomotor domains.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div>• Read access: Full class consolidated broadsheet</div>
                <div>• Write access: Form teacher remarks & behavioral domains</div>
                <div>• Restrictions: Cannot tamper with subject marks directly</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 font-mono">
                  POLICY: RLS_ACADEMIC_ADMIN_FULL_ACCESS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  GOVERNANCE
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Granted to the Principal, Vice Principal, and Chief Examination Officer for institutional quality assurance, lock overriding, and final digital publication.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div>• Read/Write: Unrestricted across all classes & subjects</div>
                <div>• Authority: Lock/Unlock marksheets and approve broadsheets</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-sky-400 font-mono">
                  POLICY: RLS_STUDENT_PARENT_RESTRICTED_READ
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                  PRIVACY
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Restricts students and parents to viewing only their own individual terminal report cards once results have been formally promulgated by the Principal.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div>• Read access: <code className="text-sky-400 bg-slate-950 px-1 rounded font-mono">auth.uid = student.id</code></div>
                <div>• Write access: 0% (Strictly 403 Forbidden)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BATCH SCORE FILL & STANDARDIZATION */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sliders className="w-4 h-4" />
                <span>Batch Fill / Standardize CA Marks</span>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Select Action</label>
                <select
                  value={batchActionType}
                  onChange={(e) => setBatchActionType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 focus:border-emerald-500 font-medium"
                >
                  <option value="fill_ca1">Set CA 1 (1st Continuous Assessment) - Max 15</option>
                  <option value="fill_ca2">Set CA 2 (Mid-Term Assessment) - Max 15</option>
                  <option value="fill_ca3">Set CA 3 (Practical / Project) - Max 10</option>
                  <option value="curve_exam">Add Exam Curve / Standardization (+/-)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">Assigned Value</label>
                <input
                  type="number"
                  value={batchValue}
                  onChange={(e) => setBatchValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-white font-bold rounded-xl px-3 py-2 focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                This action will update all {currentGradebookScores.length} students in <strong>{selectedSubjectId} ({currentClassGroup.name})</strong> and automatically recalculate WAEC grades.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBatchAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
              >
                Apply Batch Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FORM MASTER BEHAVIORAL & APPRAISAL EDITOR */}
      {/* ========================================================================= */}
      {editingSummaryStudentId && summaryEditData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Form Master Appraisal</span>
                <h3 className="text-base font-bold text-white">
                  {summaryEditData.studentName} ({summaryEditData.admissionNumber})
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingSummaryStudentId(null);
                  setSummaryEditData(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Form Teacher Qualitative Remarks */}
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Form Teacher Terminal Qualitative Remark
                </label>
                <textarea
                  rows={3}
                  value={summaryEditData.formTeacherRemarks}
                  onChange={(e) => setSummaryEditData({ ...summaryEditData, formTeacherRemarks: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                  placeholder="Provide comprehensive qualitative evaluation of student's academic progress, effort, and demeanor..."
                />
              </div>

              {/* Affective Domain Ratings */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                  Affective Domain Evaluation (1 to 5 Stars)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Punctuality</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.punctuality}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, punctuality: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Neatness</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.neatness}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, neatness: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Honesty & Integrity</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.honesty}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, honesty: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Leadership</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.leadership}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, leadership: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Peer Relations</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.relationshipWithPeers}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, relationshipWithPeers: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Attentiveness</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryEditData.affectiveDomain.attentiveness}
                      onChange={(e) => setSummaryEditData({
                        ...summaryEditData,
                        affectiveDomain: { ...summaryEditData.affectiveDomain, attentiveness: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setEditingSummaryStudentId(null);
                  setSummaryEditData(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSummaryModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
              >
                Save Form Master Appraisal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
