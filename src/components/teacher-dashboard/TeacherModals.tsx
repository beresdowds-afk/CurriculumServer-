import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  Calendar, 
  Download, 
  Send, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  BookOpen, 
  ChevronRight, 
  Printer, 
  Sparkles,
  UploadCloud,
  Check,
  Award,
  Layers,
  GraduationCap,
  MessageSquare,
  HelpCircle,
  Search,
  Filter
} from 'lucide-react';
import { MainTabType } from '../Navbar';

// Data types for interactive Teacher Actions
export interface StudentAttendanceEntry {
  id: string;
  admissionNo: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remark?: string;
  avatar: string;
}

export interface PendingGradingItem {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  submissionCount: number;
  totalStudents: number;
  dueDate: string;
  maxScore: number;
  status: 'pending' | 'graded';
}

interface TeacherModalsProps {
  // Modal states
  isAttendanceModalOpen: boolean;
  onCloseAttendanceModal: () => void;
  isLessonNoteModalOpen: boolean;
  onCloseLessonNoteModal: () => void;
  isGradingModalOpen: boolean;
  onCloseGradingModal: () => void;
  isResourceUploadModalOpen: boolean;
  onCloseResourceUploadModal: () => void;
  isClassDetailsModalOpen: boolean;
  onCloseClassDetailsModal: () => void;
  isDateFilterModalOpen: boolean;
  onCloseDateFilterModal: () => void;
  isNotificationsModalOpen: boolean;
  onCloseNotificationsModal: () => void;
  isAllToolsModalOpen: boolean;
  onCloseAllToolsModal: () => void;

  // Selected contexts
  selectedClassForDetails?: string;
  currentDateFilter: string;
  onSelectDateFilter: (filter: string) => void;

  // Navigation & Toasts
  onNavigateTab: (tab: MainTabType) => void;
  onShowToast: (message: string) => void;
  onOpenAdvisorModal?: () => void;
}

export const TeacherModals: React.FC<TeacherModalsProps> = ({
  isAttendanceModalOpen,
  onCloseAttendanceModal,
  isLessonNoteModalOpen,
  onCloseLessonNoteModal,
  isGradingModalOpen,
  onCloseGradingModal,
  isResourceUploadModalOpen,
  onCloseResourceUploadModal,
  isClassDetailsModalOpen,
  onCloseClassDetailsModal,
  isDateFilterModalOpen,
  onCloseDateFilterModal,
  isNotificationsModalOpen,
  onCloseNotificationsModal,
  isAllToolsModalOpen,
  onCloseAllToolsModal,
  selectedClassForDetails = 'JSS 2A Mathematics',
  currentDateFilter,
  onSelectDateFilter,
  onNavigateTab,
  onShowToast,
  onOpenAdvisorModal
}) => {

  // -------------------------------------------------------------
  // 1. STATE: Interactive Attendance Register
  // -------------------------------------------------------------
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>('JSS 2A');
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendanceEntry[]>([
    { id: 'st-01', admissionNo: 'GFA/2024/042', name: 'Adeleke Oluwaseun', status: 'present', avatar: 'AO' },
    { id: 'st-02', admissionNo: 'GFA/2024/043', name: 'Bakare Fatima', status: 'present', avatar: 'BF' },
    { id: 'st-03', admissionNo: 'GFA/2024/044', name: 'Chukwuemeka David', status: 'present', avatar: 'CD' },
    { id: 'st-04', admissionNo: 'GFA/2024/045', name: 'Danjuma Ibrahim', status: 'late', remark: 'Arrived 8:15 AM (Traffic)', avatar: 'DI' },
    { id: 'st-05', admissionNo: 'GFA/2024/046', name: 'Ezekiel Praise', status: 'present', avatar: 'EP' },
    { id: 'st-06', admissionNo: 'GFA/2024/047', name: 'Fashola Samuel', status: 'absent', remark: 'Sick slip with nurse', avatar: 'FS' },
    { id: 'st-07', admissionNo: 'GFA/2024/048', name: 'Garba Zainab', status: 'present', avatar: 'GZ' },
    { id: 'st-08', admissionNo: 'GFA/2024/049', name: 'Hassan Maryam', status: 'present', avatar: 'HM' },
    { id: 'st-09', admissionNo: 'GFA/2024/050', name: 'Ibe Chibuike', status: 'present', avatar: 'IC' },
    { id: 'st-10', admissionNo: 'GFA/2024/051', name: 'Jimoh Quadri', status: 'excused', remark: 'School debate competition', avatar: 'JQ' }
  ]);

  const toggleStudentStatus = (id: string, newStatus: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentsAttendance(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const markAllPresent = () => {
    setStudentsAttendance(prev => prev.map(s => ({ ...s, status: 'present' })));
    onShowToast(`Marked all ${studentsAttendance.length} students as Present.`);
  };

  // -------------------------------------------------------------
  // 2. STATE: Interactive Lesson Plan Composer
  // -------------------------------------------------------------
  const [lessonSubject, setLessonSubject] = useState('General Mathematics');
  const [lessonClass, setLessonClass] = useState('JSS 2A');
  const [lessonWeek, setLessonWeek] = useState('Week 6');
  const [lessonTopic, setLessonTopic] = useState('Algebraic Expressions - Factorisation of Simple Binomials');
  const [lessonDuration, setLessonDuration] = useState('40 Minutes (Single Period)');
  const [behavioralObjectives, setBehavioralObjectives] = useState(
    'By the end of the 40-minute lesson, students should be able to:\n1. Identify common numerical and variable factors in algebraic binomials.\n2. Factorise expressions of the form ax + ay = a(x + y) with 90% accuracy.'
  );
  const [instructionalMaterials, setInstructionalMaterials] = useState('Algebra tiles, interactive whiteboard grapher, flashcards with binomial terms.');

  // -------------------------------------------------------------
  // 3. STATE: Pending Assessments to Grade
  // -------------------------------------------------------------
  const [pendingGradingList, setPendingGradingList] = useState<PendingGradingItem[]>([
    { id: 'g-01', title: 'JSS 2A Algebra Quiz 1', subject: 'General Mathematics', classGrade: 'JSS 2A', submissionCount: 28, totalStudents: 28, dueDate: 'Today, 8:00 AM', maxScore: 20, status: 'pending' },
    { id: 'g-02', title: 'SS 1B Linear Equations Homework', subject: 'General Mathematics', classGrade: 'SS 1B', submissionCount: 30, totalStudents: 32, dueDate: 'Yesterday', maxScore: 20, status: 'pending' },
    { id: 'g-03', title: 'SS 1A Matrices & Determinants Test', subject: 'Further Mathematics', classGrade: 'SS 1A', submissionCount: 30, totalStudents: 30, dueDate: 'May 18, 2026', maxScore: 30, status: 'pending' },
    { id: 'g-04', title: 'JSS 2B Word Problems Practice', subject: 'General Mathematics', classGrade: 'JSS 2B', submissionCount: 24, totalStudents: 26, dueDate: 'May 17, 2026', maxScore: 15, status: 'pending' },
    { id: 'g-05', title: 'SS 2 Further Maths Vectors CA', subject: 'Further Mathematics', classGrade: 'SS 2', submissionCount: 22, totalStudents: 22, dueDate: 'May 16, 2026', maxScore: 20, status: 'pending' }
  ]);

  // -------------------------------------------------------------
  // 4. STATE: Resource Upload
  // -------------------------------------------------------------
  const [resourceCategory, setResourceCategory] = useState<'scheme_of_work' | 'past_questions' | 'worksheet' | 'lesson_slides'>('worksheet');
  const [resourceTitle, setResourceTitle] = useState('JSS 2 Algebraic Expressions Practice Worksheet 04');
  const [resourceClass, setResourceClass] = useState('JSS 2');
  const [resourceSubject, setResourceSubject] = useState('General Mathematics');

  return (
    <>
      {/* ============================================================ */}
      {/* 1. QUICK ATTENDANCE REGISTER MODAL                           */}
      {/* ============================================================ */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-inner">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Daily Class Roll-Call & Attendance</h3>
                  <p className="text-xs text-emerald-200/80">Period 1 • {currentDateFilter} • Teacher: Mr. Daniel Adeyemi</p>
                </div>
              </div>
              <button 
                onClick={onCloseAttendanceModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Class Switcher & Quick Metrics */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Select Class:</span>
                {['JSS 2A', 'SS 1B', 'SS 1A', 'JSS 2B'].map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedAttendanceClass(cls)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      selectedAttendanceClass === cls
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={markAllPresent}
                  className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Mark All Present
                </button>
              </div>
            </div>

            {/* Attendance Roster List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                <span>Student Details ({studentsAttendance.length} students)</span>
                <span>Attendance Status</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {studentsAttendance.map((st) => (
                  <div key={st.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                        {st.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{st.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{st.admissionNo} {st.remark && <span className="text-amber-600 ml-1 font-sans">• {st.remark}</span>}</div>
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleStudentStatus(st.id, 'present')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          st.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => toggleStudentStatus(st.id, 'late')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          st.status === 'late'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Late
                      </button>
                      <button
                        onClick={() => toggleStudentStatus(st.id, 'absent')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          st.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => toggleStudentStatus(st.id, 'excused')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          st.status === 'excused'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Excused
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                Present: <strong className="text-emerald-700">{studentsAttendance.filter(s => s.status === 'present').length}</strong> | 
                Late: <strong className="text-amber-700">{studentsAttendance.filter(s => s.status === 'late').length}</strong> | 
                Absent: <strong className="text-rose-700">{studentsAttendance.filter(s => s.status === 'absent').length}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseAttendanceModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onShowToast(`Attendance for ${selectedAttendanceClass} recorded successfully! Biometric sync triggered.`);
                    onCloseAttendanceModal();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Register</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. QUICK LESSON NOTE GENERATOR MODAL                         */}
      {/* ============================================================ */}
      {isLessonNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-inner">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Create Standard Lesson Note (NERDC)</h3>
                  <p className="text-xs text-emerald-200/80">Structured 7-Stage Pedagogical Lesson Note</p>
                </div>
              </div>
              <button 
                onClick={onCloseLessonNoteModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* Row 1: Subject & Class */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <select 
                    value={lessonSubject}
                    onChange={(e) => setLessonSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="General Mathematics">General Mathematics</option>
                    <option value="Further Mathematics">Further Mathematics</option>
                    <option value="Basic Science">Basic Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class / Section</label>
                  <select 
                    value={lessonClass}
                    onChange={(e) => setLessonClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="JSS 2A">JSS 2A</option>
                    <option value="JSS 2B">JSS 2B</option>
                    <option value="SS 1A">SS 1A</option>
                    <option value="SS 1B">SS 1B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Week</label>
                  <select 
                    value={lessonWeek}
                    onChange={(e) => setLessonWeek(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Week 5">Week 5</option>
                    <option value="Week 6">Week 6 (Current)</option>
                    <option value="Week 7">Week 7</option>
                    <option value="Week 8">Week 8</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic & Sub-Topic</label>
                <input
                  type="text"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  placeholder="e.g. Algebraic Expressions - Factorisation"
                />
              </div>

              {/* Row 3: Behavioral Objectives */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Specific Behavioral Objectives</label>
                  {onOpenAdvisorModal && (
                    <button
                      onClick={onOpenAdvisorModal}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>AI NERDC Suggest</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={behavioralObjectives}
                  onChange={(e) => setBehavioralObjectives(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Row 4: Instructional Materials */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructional Resources & Apparatus</label>
                <input
                  type="text"
                  value={instructionalMaterials}
                  onChange={(e) => setInstructionalMaterials(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Auto-aligns with NERDC 9-Year Basic Curriculum</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseLessonNoteModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    onShowToast(`Lesson note for "${lessonTopic}" saved & submitted to HOD Sciences!`);
                    onCloseLessonNoteModal();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit to HOD</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ASSESSMENTS GRADING MODAL                                  */}
      {/* ============================================================ */}
      {isGradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Pending Assessments & Submissions</h3>
                  <p className="text-xs text-emerald-200/80">5 Continuous Assessment Papers to Grade</p>
                </div>
              </div>
              <button 
                onClick={onCloseGradingModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Assessments to Grade */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {pendingGradingList.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">{item.classGrade}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">{item.subject}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500">
                      Submissions: <strong className="text-emerald-700">{item.submissionCount} / {item.totalStudents}</strong> • Due: {item.dueDate} • Max: {item.maxScore} marks
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        onShowToast(`Auto-grading completed for ${item.title}. Scores synced with broadsheet.`);
                        setPendingGradingList(prev => prev.filter(p => p.id !== item.id));
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Auto-Grade CBT
                    </button>
                    <button
                      onClick={() => {
                        onNavigateTab('academic_records');
                        onCloseGradingModal();
                        onShowToast(`Opening gradebook & score sheet for ${item.title}`);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Grade Now</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Grades directly reflect on Terminal Broadsheets</span>
              <button
                onClick={onCloseGradingModal}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. RESOURCE UPLOADER MODAL                                   */}
      {/* ============================================================ */}
      {isResourceUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Upload Teaching Resources</h3>
                  <p className="text-xs text-emerald-200/80">Publish Worksheets, Schemes, & Past Papers</p>
                </div>
              </div>
              <button 
                onClick={onCloseResourceUploadModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resource Title</label>
                <input
                  type="text"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={resourceCategory}
                    onChange={(e) => setResourceCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="worksheet">Practice Worksheet</option>
                    <option value="scheme_of_work">Scheme of Work</option>
                    <option value="past_questions">Past WAEC/BECE Questions</option>
                    <option value="lesson_slides">Lesson Slide Deck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={resourceClass}
                    onChange={(e) => setResourceClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="JSS 2">JSS 2 (All Sections)</option>
                    <option value="SS 1">SS 1 (All Sections)</option>
                    <option value="SS 2">SS 2</option>
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-emerald-50/30 transition-all cursor-pointer space-y-2">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Click to browse or drag PDF, DOCX, or PPTX file</div>
                <div className="text-[10px] text-slate-400">Maximum file size: 25 MB</div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Students can download via Student Portal</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseResourceUploadModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onShowToast(`Uploaded "${resourceTitle}" successfully! Available to ${resourceClass}.`);
                    onCloseResourceUploadModal();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish Resource</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. CLASS DETAILS MODAL                                        */}
      {/* ============================================================ */}
      {isClassDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{selectedClassForDetails}</h3>
                  <p className="text-xs text-emerald-200/80">Class Management & Curriculum Coverage</p>
                </div>
              </div>
              <button 
                onClick={onCloseClassDetailsModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-xs text-slate-500 font-medium">Students</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">28</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700 font-medium">Attendance</div>
                  <div className="text-lg font-black text-emerald-800 mt-0.5">96%</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <div className="text-xs text-blue-700 font-medium">Coverage</div>
                  <div className="text-lg font-black text-blue-800 mt-0.5">75%</div>
                </div>
              </div>

              {/* Next Lesson Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">Next Scheduled Lesson</span>
                  <h4 className="font-extrabold text-sm text-slate-900 mt-1">Algebraic Expressions: Linear & Quadratic Models</h4>
                  <p className="text-xs text-slate-600">Today, 8:00 AM • Room 14 (Science Block)</p>
                </div>
                <button
                  onClick={() => {
                    onCloseClassDetailsModal();
                    onShowToast(`Starting lesson session for ${selectedClassForDetails}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Start Lesson
                </button>
              </div>

              {/* Fast Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    onCloseClassDetailsModal();
                    onNavigateTab('student_registers');
                  }}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>View Student Roster</span>
                </button>
                <button
                  onClick={() => {
                    onCloseClassDetailsModal();
                    onNavigateTab('academic_records');
                  }}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-purple-700" />
                  <span>View Score Broadsheet</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={onCloseClassDetailsModal}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TEACHER NOTIFICATIONS DRAWER / POPUP                       */}
      {/* ============================================================ */}
      {isNotificationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-[#032e22] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Teacher Notifications & Alerts</h3>
                  <p className="text-xs text-emerald-200/80">4 Unread Alerts for Mr. Daniel Adeyemi</p>
                </div>
              </div>
              <button 
                onClick={onCloseNotificationsModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-slate-900">Lesson Note Approved</div>
                  <p className="text-xs text-slate-600 mt-0.5">HOD Sciences approved your JSS 2A Mathematics Week 6 lesson plan.</p>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">1 hour ago</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-slate-900">Mid-Term Assessments Commence</div>
                  <p className="text-xs text-slate-600 mt-0.5">Mid-Term CBT and paper assessments begin on May 22nd. Please verify question bank items.</p>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Today, 7:30 AM</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-start gap-3">
                <Users className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-slate-900">Departmental Meeting Scheduled</div>
                  <p className="text-xs text-slate-600 mt-0.5">Science & Mathematics faculty meeting tomorrow at 10:00 AM in the Staff Room.</p>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Yesterday</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
                <FileText className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-slate-900">Student Assignment Submitted</div>
                  <p className="text-xs text-slate-600 mt-0.5">30 students in SS 1A have submitted their Further Maths Matrices assignment.</p>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Yesterday</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  onShowToast('All notifications marked as read.');
                  onCloseNotificationsModal();
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                Mark all as read
              </button>
              <button
                onClick={onCloseNotificationsModal}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. VIEW ALL TOOLS MODAL                                       */}
      {/* ============================================================ */}
      {isAllToolsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-inner">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">All Teacher Suite Tools</h3>
                  <p className="text-xs text-emerald-200/80">Complete Teacher Toolkit for CURRICULUM FLOW</p>
                </div>
              </div>
              <button 
                onClick={onCloseAllToolsModal}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('curriculum_source');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-emerald-700 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">NERDC Curriculum</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Explore syllabus & themes</div>
              </button>

              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('lesson_chain');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <FileText className="w-5 h-5 text-purple-700 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">Lesson Plans & Notes</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Weekly lesson approvals</div>
              </button>

              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('taught_assessment');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <Award className="w-5 h-5 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">CBT & Assessments</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Online quizzes & tests</div>
              </button>

              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('school_timetable');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <Calendar className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">Period Timetable</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Live teacher schedule</div>
              </button>

              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('biometric_attendance');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <UserCheck className="w-5 h-5 text-emerald-700 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">Biometric Attendance</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Movement & roll calls</div>
              </button>

              <button
                onClick={() => {
                  onCloseAllToolsModal();
                  onNavigateTab('adaptive_remedial');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-black text-slate-900">Adaptive Remedials</div>
                <div className="text-[10px] text-slate-500 mt-0.5">AI personalized clinics</div>
              </button>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={onCloseAllToolsModal}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. DATE FILTER MODAL                                          */}
      {/* ============================================================ */}
      {isDateFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            <div className="bg-[#032e22] text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white">Select Academic Date</h3>
              <button 
                onClick={onCloseDateFilterModal}
                className="w-7 h-7 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {[
                'Today, May 20, 2026',
                'Yesterday, May 19, 2026',
                'Monday, May 18, 2026',
                'Current Term 3 (2025/2026 Session)'
              ].map(dateOpt => (
                <button
                  key={dateOpt}
                  onClick={() => {
                    onSelectDateFilter(dateOpt);
                    onShowToast(`Date filter updated to: ${dateOpt}`);
                    onCloseDateFilterModal();
                  }}
                  className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    currentDateFilter === dateOpt
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {dateOpt}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
