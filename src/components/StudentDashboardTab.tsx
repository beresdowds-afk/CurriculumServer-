import React, { useState } from 'react';
import {
  UserProfile,
  SchoolBrandProfile,
  TenantSchoolApp,
  StudentAssignmentItem,
  StudentPerformanceEntry,
  StudentTimetableSlot,
  PortalMessageItem,
  PortalAnnouncementItem,
  StudentStudyResourceItem,
  StudentExamScheduleItem
} from '../types';
import {
  INITIAL_STUDENT_TIMETABLE,
  INITIAL_STUDENT_ASSIGNMENTS,
  INITIAL_STUDENT_PERFORMANCE,
  INITIAL_PORTAL_ANNOUNCEMENTS,
  INITIAL_PORTAL_MESSAGES,
  INITIAL_STUDY_RESOURCES,
  INITIAL_STUDENT_EXAMS
} from '../data/studentParentPortalData';
import {
  AssignmentSubmissionModal,
  AskTeacherModal
} from './StudentParentModals';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  FileText,
  FileCheck2,
  BarChart3,
  FolderOpen,
  MessageSquare,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Award,
  Clock,
  Send,
  HelpCircle,
  Sparkles,
  Download,
  CheckCircle2,
  Building2,
  GraduationCap,
  ExternalLink,
  Search,
  BookMarked,
  ShieldCheck
} from 'lucide-react';

interface StudentDashboardTabProps {
  currentUser: UserProfile;
  brandProfile: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onNavigateTab: (tab: any) => void;
}

export const StudentDashboardTab: React.FC<StudentDashboardTabProps> = ({
  currentUser,
  brandProfile,
  activeTenant,
  onNavigateTab
}) => {
  // Navigation active tab inside student portal
  const [activeNav, setActiveNav] = useState<'dashboard' | 'timetable' | 'subjects' | 'assignments' | 'exams' | 'results' | 'resources' | 'messages' | 'announcements' | 'profile'>('dashboard');

  // Interactive state
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>(INITIAL_STUDENT_ASSIGNMENTS);
  const [timetable, setTimetable] = useState<StudentTimetableSlot[]>(INITIAL_STUDENT_TIMETABLE);
  const [performance, setPerformance] = useState<StudentPerformanceEntry[]>(INITIAL_STUDENT_PERFORMANCE);
  const [announcements, setAnnouncements] = useState<PortalAnnouncementItem[]>(INITIAL_PORTAL_ANNOUNCEMENTS);
  const [messages, setMessages] = useState<PortalMessageItem[]>(INITIAL_PORTAL_MESSAGES);
  const [resources, setResources] = useState<StudentStudyResourceItem[]>(INITIAL_STUDY_RESOURCES);
  const [exams, setExams] = useState<StudentExamScheduleItem[]>(INITIAL_STUDENT_EXAMS);

  // Selected date dropdown
  const [selectedTerm, setSelectedTerm] = useState('This Term');
  const [selectedDate, setSelectedDate] = useState('Today, May 20, 2026');

  // Modals state
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<StudentAssignmentItem | null>(null);
  const [isAskTeacherOpen, setIsAskTeacherOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAssignmentSubmit = (asgId: string, answerText: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.id === asgId) {
        return {
          ...a,
          status: 'submitted',
          submissionDate: new Date().toISOString().split('T')[0],
          formattedDue: 'Submitted Today'
        };
      }
      return a;
    }));
    showToast('Assignment submitted successfully to subject teacher!');
  };

  const handleSendTeacherQuery = (teacher: string, subject: string, question: string) => {
    const newMsg: PortalMessageItem = {
      id: `msg-${Date.now()}`,
      senderName: 'You (Student David K.)',
      senderRole: 'Student (JSS 2A)',
      senderAvatar: 'DK',
      recipientId: teacher,
      subject,
      preview: question.substring(0, 60) + '...',
      fullMessage: question,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      isRead: true
    };
    setMessages(prev => [newMsg, ...prev]);
    showToast(`Query sent directly to ${teacher}.`);
  };

  return (
    <div className="min-h-screen bg-[#F4F8F7] flex font-sans text-slate-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B3B3C] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-teal-400/50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-teal-300" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          LEFT SIDEBAR: DARK DEEP-FOREST TEAL (#0B3B3C)
         ========================================================================= */}
      <aside className="w-64 bg-[#0B3B3C] text-white flex flex-col justify-between flex-shrink-0 min-h-screen shadow-xl border-r border-[#07292A] hidden md:flex">
        <div>
          {/* School Brand / Crest */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-[#0B3B3C] rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-xs tracking-wider uppercase text-white leading-tight">
                {brandProfile.schoolName || 'Greenfield Academy'}
              </h1>
              <p className="text-[10px] text-teal-300 font-semibold tracking-wide uppercase">
                Student Learning OS
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'timetable', label: 'My Timetable', icon: Calendar },
              { id: 'subjects', label: 'My Subjects', icon: BookOpen },
              { id: 'assignments', label: 'Assignments', icon: FileText, badge: assignments.filter(a => a.status === 'pending').length },
              { id: 'exams', label: 'Examinations', icon: FileCheck2 },
              { id: 'results', label: 'Results', icon: BarChart3 },
              { id: 'resources', label: 'Resources', icon: FolderOpen },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: messages.filter(m => !m.isRead).length },
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'profile', label: 'Profile', icon: User }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#135454] text-white shadow-sm font-bold ring-1 ring-teal-400/30'
                      : 'text-teal-100/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-teal-300/70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-400 text-[#0B3B3C]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Student Profile Card */}
        <div className="p-4 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer"
               onClick={() => setActiveNav('profile')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 border-2 border-teal-300 flex items-center justify-center font-bold text-xs text-white shadow-inner">
                DK
              </div>
              <div className="text-left">
                <p className="text-[10px] text-teal-300 uppercase tracking-wider font-semibold">Student</p>
                <h4 className="font-bold text-xs text-white leading-tight">David K.</h4>
                <p className="text-[10px] text-slate-300 font-medium">JSS 2A • Roll #14</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-teal-300" />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CANVAS CONTENT
         ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        
        {/* TOP BAR / HEADER */}
        <header className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Good morning, David! <span className="text-2xl">👋</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Stay focused and keep learning.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Selector Dropdown */}
            <div className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer hover:border-teal-500 transition-colors">
              <span>{selectedDate}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveNav('announcements')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#0B3B3C] hover:border-teal-400 relative transition-all shadow-sm"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </header>

        {/* DASHBOARD BODY CONTAINER */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">

          {/* =========================================================================
              ROW 1: 5 CORE KPI METRIC CARDS (Matches Screenshot)
             ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: My Classes Today */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">My Classes Today</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">4</h3>
            </div>

            {/* Card 2: Assignments Due */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Assignments Due</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">3</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">This week</p>
            </div>

            {/* Card 3: Average Score */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Average Score</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">82%</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">This Term</p>
            </div>

            {/* Card 4: Attendance */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Attendance</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">96%</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">↑ 4% vs last week</p>
            </div>

            {/* Card 5: Position in Class */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Position in Class</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                5 <span className="text-base text-slate-400 font-semibold">/ 32</span>
              </h3>
            </div>
          </div>

          {/* =========================================================================
              ROW 2: 3-COLUMN MIDDLE GRID (Timetable, Recent Assignments, My Performance)
             ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Card 1: Today's Timetable */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-4">Today's Timetable</h4>
                <div className="space-y-3">
                  {timetable.slice(0, 4).map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="px-2.5 py-1 rounded-lg bg-[#E6F4F1] text-[#0A6B68] text-[11px] font-bold tracking-tight min-w-[72px] text-center">
                        {slot.time}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {slot.subject}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Recent Assignments */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Recent Assignments</h4>
                  <button
                    onClick={() => setActiveNav('assignments')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3.5">
                  {assignments.slice(0, 3).map((asg, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedAssignmentForSubmission(asg)}
                      className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-teal-50/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0A6B68] group-hover:text-white transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{asg.subject} - {asg.title.split('—')[0]}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap ml-2">
                        {asg.formattedDue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: My Performance (Horizontal Bar Chart) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">My Performance</h4>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg px-2 py-0.5 cursor-pointer">
                    <span>{selectedTerm}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* Progress bars for top subjects */}
                <div className="space-y-3">
                  {performance.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium text-[11px]">{p.subject}</span>
                        <span className="font-bold text-slate-800 text-[11px]">{p.score}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0A6B68] rounded-full transition-all duration-500"
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 0%, 50%, 100% axis labels */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-semibold">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              ROW 3: 3-COLUMN BOTTOM GRID (Announcements, Messages, Quick Links)
             ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Announcements */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Announcements</h4>
                  <button
                    onClick={() => setActiveNav('announcements')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3.5">
                  {announcements.slice(0, 2).map((ann, idx) => (
                    <div key={idx} className="flex items-start justify-between text-xs gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bell className="w-3 h-3" />
                        </div>
                        <p className="font-semibold text-slate-800 leading-snug">{ann.title}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{ann.timeAgo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Messages */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Messages</h4>
                  <button
                    onClick={() => setActiveNav('messages')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3.5">
                  {messages.slice(0, 2).map((msg, idx) => (
                    <div key={idx} className="flex items-start justify-between text-xs gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-snug">
                            <span className="text-slate-500 font-normal">From:</span> {msg.senderName} — {msg.preview}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{msg.timeAgo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3: Quick Links (Matches Screenshot 4 Icons) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Quick Links</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                
                {/* 1. Study Materials */}
                <button
                  onClick={() => {
                    setActiveNav('resources');
                    showToast('Study Materials & Lesson Notes loaded.');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Study Materials</span>
                </button>

                {/* 2. Past Questions */}
                <button
                  onClick={() => {
                    setActiveNav('resources');
                    showToast('WAEC & BECE Past Questions Repository loaded.');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Past Questions</span>
                </button>

                {/* 3. E-Library */}
                <button
                  onClick={() => {
                    setActiveNav('resources');
                    showToast('Digital E-Library collection opened.');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">E-Library</span>
                </button>

                {/* 4. Ask Teacher */}
                <button
                  onClick={() => setIsAskTeacherOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Ask Teacher</span>
                </button>

              </div>
            </div>

          </div>

        </div>
      </main>

      {/* MODALS */}
      <AssignmentSubmissionModal
        isOpen={!!selectedAssignmentForSubmission}
        onClose={() => setSelectedAssignmentForSubmission(null)}
        assignment={selectedAssignmentForSubmission}
        onSubmit={handleAssignmentSubmit}
      />

      <AskTeacherModal
        isOpen={isAskTeacherOpen}
        onClose={() => setIsAskTeacherOpen(false)}
        onSendQuery={handleSendTeacherQuery}
      />
    </div>
  );
};
