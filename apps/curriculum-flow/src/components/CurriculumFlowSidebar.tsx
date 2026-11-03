import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  Clock, 
  Sparkles, 
  FileText, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  Calendar, 
  Layers, 
  Award, 
  DollarSign, 
  CreditCard, 
  Home, 
  Truck, 
  Search, 
  Settings,
  ChevronRight,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { UserRole } from '@/src/types';

export type FlowNavTab = 
  | 'command_center'
  | 'curriculum_explorer'
  | 'lesson_approval_chain'
  | 'delivery_tracker'
  | 'question_bank'
  | 'secure_examination'
  | 'taught_assessment'
  | 'remedial_hub'
  | 'academic_records'
  | 'academic_analytics'
  | 'student_registers'
  | 'biometric_attendance'
  | 'account_management'
  | 'teacher_dashboard'
  | 'teacher_pool'
  | 'class_groups'
  | 'school_timetable'
  | 'academic_calendar'
  | 'student_dashboard'
  | 'parent_dashboard'
  | 'admin_assistant_dashboard'
  | 'logistics_suite'
  | 'quality_assurance';

interface CurriculumFlowSidebarProps {
  activeTab: FlowNavTab;
  onSelectTab: (tab: FlowNavTab) => void;
  userRole: UserRole;
  schoolName: string;
}

export const CurriculumFlowSidebar: React.FC<CurriculumFlowSidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  schoolName
}) => {
  // Determine permitted navigation sections based on role
  const isLeadership = ['principal', 'principal_admin', 'vice_principal_academic', 'vice_principal_admin', 'academic_coordinator', 'super_admin'].includes(userRole);
  const isTeacher = ['teacher', 'subject_teacher', 'hod', 'hod_sciences', 'hod_arts'].includes(userRole) || isLeadership;
  const isBursar = ['bursar_finance'].includes(userRole) || isLeadership;
  const isStudent = userRole === 'student';
  const isParent = userRole === 'parent';
  const isAdminAssistant = ['admin_assistant', 'administrative_assistant'].includes(userRole) || isLeadership;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen select-none shrink-0 text-slate-700 dark:text-slate-300">
      {/* School Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
            {schoolName}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
            Curriculum Flow ERP
          </div>
        </div>
      </div>

      {/* Role-Aware Navigation Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Leadership & Administration */}
        {isLeadership && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Leadership & Oversight
            </div>
            <button
              onClick={() => onSelectTab('command_center')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'command_center'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Command Center</span>
            </button>
            <button
              onClick={() => onSelectTab('lesson_approval_chain')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'lesson_approval_chain'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Lesson Plan Approvals</span>
            </button>
            <button
              onClick={() => onSelectTab('academic_records')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'academic_records'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Broadsheets & Grades</span>
            </button>
            <button
              onClick={() => onSelectTab('academic_analytics')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'academic_analytics'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Academic Analytics</span>
            </button>
          </div>
        )}

        {/* Teaching & Academics */}
        {(isTeacher || isLeadership) && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Academics & Pedagogy
            </div>
            {isTeacher && !isLeadership && (
              <button
                onClick={() => onSelectTab('teacher_dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'teacher_dashboard'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>My Faculty Dashboard</span>
              </button>
            )}
            <button
              onClick={() => onSelectTab('curriculum_explorer')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'curriculum_explorer'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>NERDC Syllabus Explorer</span>
            </button>
            <button
              onClick={() => onSelectTab('delivery_tracker')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'delivery_tracker'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Delivery Tracker</span>
            </button>
            <button
              onClick={() => onSelectTab('question_bank')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'question_bank'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Question Bank & Bloom's</span>
            </button>
            <button
              onClick={() => onSelectTab('secure_examination')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'secure_examination'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Examinations & CBT Kiosk</span>
            </button>
            <button
              onClick={() => onSelectTab('remedial_hub')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'remedial_hub'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Adaptive Remedial Hub</span>
            </button>
          </div>
        )}

        {/* Administration, Bursary & Logistics */}
        {(isAdminAssistant || isBursar || isLeadership) && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Operations & Bursary
            </div>
            {(isAdminAssistant || isLeadership) && (
              <button
                onClick={() => onSelectTab('student_registers')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'student_registers'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Student Registers & Arms</span>
              </button>
            )}
            {(isAdminAssistant || isLeadership) && (
              <button
                onClick={() => onSelectTab('biometric_attendance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'biometric_attendance'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Biometric Attendance</span>
              </button>
            )}
            {(isBursar || isLeadership) && (
              <button
                onClick={() => onSelectTab('account_management')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'account_management'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Bursary & Payment Splits</span>
              </button>
            )}
            {(isAdminAssistant || isLeadership) && (
              <button
                onClick={() => onSelectTab('logistics_suite')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'logistics_suite'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Transport & Library</span>
              </button>
            )}
          </div>
        )}

        {/* Student Portal */}
        {isStudent && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Student Workspace
            </div>
            <button
              onClick={() => onSelectTab('student_dashboard')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span>My Classes & Grades</span>
            </button>
            <button
              onClick={() => onSelectTab('secure_examination')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Computer-Based Tests</span>
            </button>
          </div>
        )}

        {/* Parent Portal */}
        {isParent && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Parent Portal
            </div>
            <button
              onClick={() => onSelectTab('parent_dashboard')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span>Wards & Academic Progress</span>
            </button>
          </div>
        )}
      </div>

      {/* School Term Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <span>Active Term</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">2026/2027 • Term 1</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          Role: <strong className="text-slate-800 dark:text-slate-200 uppercase">{userRole.replace(/_/g, ' ')}</strong>
        </div>
      </div>
    </aside>
  );
};
