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
  ParentFeeInvoice,
  ParentConsentSlip,
  ParentPickupPassData,
  StudentWardMapping
} from '../types';
import {
  INITIAL_STUDENT_TIMETABLE,
  INITIAL_STUDENT_ASSIGNMENTS,
  INITIAL_STUDENT_PERFORMANCE,
  INITIAL_PORTAL_ANNOUNCEMENTS,
  INITIAL_PORTAL_MESSAGES,
  INITIAL_PARENT_FEE_INVOICES,
  INITIAL_PARENT_CONSENT_SLIPS,
  INITIAL_PARENT_PICKUP_PASSES
} from '../data/studentParentPortalData';
import {
  ParentFeePaymentModal,
  PickupPassQRModal,
  AskTeacherModal
} from './StudentParentModals';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  FileText,
  FileCheck2,
  BarChart3,
  CreditCard,
  QrCode,
  ShieldCheck,
  MessageSquare,
  Bell,
  User,
  ChevronDown,
  Building2,
  CheckCircle2,
  Check,
  Award,
  Clock,
  Send,
  HelpCircle,
  Download,
  AlertCircle,
  FileSignature,
  Printer,
  Users
} from 'lucide-react';

interface ParentDashboardTabProps {
  currentUser: UserProfile;
  brandProfile: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onNavigateTab: (tab: any) => void;
}

export const ParentDashboardTab: React.FC<ParentDashboardTabProps> = ({
  currentUser,
  brandProfile,
  activeTenant,
  onNavigateTab
}) => {
  // Available wards linked under RLS policy
  const registeredWards: StudentWardMapping[] = [
    {
      studentId: 'usr-student-01',
      studentName: 'David K. Eze',
      admissionNumber: 'GA/2024/0142',
      classGroupName: 'JSS 2A',
      classGrade: 'JSS 2',
      relationship: 'Father',
      isPrimaryGuardian: true,
      isAuthorizedPickup: true,
      emergencyPriority: 1,
      canReceiveReportCards: true,
      canReceiveFeeInvoices: true,
      verifiedByPrincipal: true
    },
    {
      studentId: 'usr-student-02',
      studentName: 'Chinedu Eze',
      admissionNumber: 'GA/2023/0088',
      classGroupName: 'SS 2 Science A',
      classGrade: 'SS 2',
      relationship: 'Father',
      isPrimaryGuardian: true,
      isAuthorizedPickup: true,
      emergencyPriority: 1,
      canReceiveReportCards: true,
      canReceiveFeeInvoices: true,
      verifiedByPrincipal: true
    }
  ];

  // Active Ward Selection (Row-Level Security boundary)
  const [selectedWard, setSelectedWard] = useState<StudentWardMapping>(registeredWards[0]);

  // Parent navigation active tab
  const [activeNav, setActiveNav] = useState<'dashboard' | 'results' | 'fees' | 'timetable' | 'assignments' | 'security_pass' | 'consent' | 'messages' | 'circulars'>('dashboard');

  // Interactive state
  const [invoices, setInvoices] = useState<ParentFeeInvoice[]>(INITIAL_PARENT_FEE_INVOICES);
  const [consentSlips, setConsentSlips] = useState<ParentConsentSlip[]>(INITIAL_PARENT_CONSENT_SLIPS);
  const [pickupPasses, setPickupPasses] = useState<ParentPickupPassData[]>(INITIAL_PARENT_PICKUP_PASSES);
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>(INITIAL_STUDENT_ASSIGNMENTS);
  const [performance, setPerformance] = useState<StudentPerformanceEntry[]>(INITIAL_STUDENT_PERFORMANCE);
  const [timetable, setTimetable] = useState<StudentTimetableSlot[]>(INITIAL_STUDENT_TIMETABLE);
  const [announcements, setAnnouncements] = useState<PortalAnnouncementItem[]>(INITIAL_PORTAL_ANNOUNCEMENTS);
  const [messages, setMessages] = useState<PortalMessageItem[]>(INITIAL_PORTAL_MESSAGES);

  // Modals state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<ParentFeeInvoice | null>(null);
  const [selectedPassForQR, setSelectedPassForQR] = useState<ParentPickupPassData | null>(null);
  const [isAskTeacherOpen, setIsAskTeacherOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePaymentSuccess = (invoiceId: string, receiptNo: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: 'paid',
          amountPaid: inv.totalAmount,
          balanceDue: 0,
          receiptNumber: receiptNo
        };
      }
      return inv;
    }));
    showToast(`Payment confirmed! Official Bursary Receipt #${receiptNo} generated.`);
  };

  const handleApproveConsent = (slipId: string) => {
    setConsentSlips(prev => prev.map(slip => {
      if (slip.id === slipId) {
        return {
          ...slip,
          status: 'approved',
          approvedAt: new Date().toISOString()
        };
      }
      return slip;
    }));
    showToast('Digital excursion consent approved and transmitted to school administration.');
  };

  const handleSendTeacherQuery = (teacher: string, subject: string, question: string) => {
    const newMsg: PortalMessageItem = {
      id: `msg-${Date.now()}`,
      senderName: 'Chief O. Eze (Parent)',
      senderRole: 'Parent / Guardian',
      senderAvatar: 'OE',
      recipientId: teacher,
      subject: `[Ward: ${selectedWard.studentName}] ${subject}`,
      preview: question.substring(0, 60) + '...',
      fullMessage: question,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      isRead: true
    };
    setMessages(prev => [newMsg, ...prev]);
    showToast(`Inquiry sent to ${teacher}.`);
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
                Parent & Guardian Portal
              </p>
            </div>
          </div>

          {/* RLS Ward Selector in Sidebar */}
          <div className="p-4 border-b border-white/10 bg-black/10">
            <label className="block text-[10px] uppercase font-bold text-teal-300 tracking-wider mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> Select Active Ward
            </label>
            <div className="space-y-1">
              {registeredWards.map(w => (
                <button
                  key={w.studentId}
                  onClick={() => {
                    setSelectedWard(w);
                    showToast(`Active ward context switched to ${w.studentName} (${w.classGroupName}).`);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left ${
                    selectedWard.studentId === w.studentId
                      ? 'bg-teal-700/80 text-white font-bold ring-1 ring-teal-400/40'
                      : 'text-teal-200/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-800 border border-teal-400 flex items-center justify-center text-[10px] font-bold">
                      {w.studentName.split(' ')[0][0]}
                    </div>
                    <div>
                      <p className="leading-tight">{w.studentName}</p>
                      <p className="text-[10px] text-teal-300/80">{w.classGroupName}</p>
                    </div>
                  </div>
                  {selectedWard.studentId === w.studentId && (
                    <Check className="w-3.5 h-3.5 text-teal-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Child Dashboard', icon: LayoutDashboard },
              { id: 'results', label: 'Terminal Results', icon: BarChart3 },
              { id: 'fees', label: 'Bursary Fee Portal', icon: CreditCard, badge: invoices.filter(i => i.status === 'pending').length },
              { id: 'timetable', label: 'Class Timetable', icon: Calendar },
              { id: 'assignments', label: 'Homework Tracker', icon: FileText },
              { id: 'security_pass', label: 'Security & Pickup', icon: QrCode },
              { id: 'consent', label: 'Excursion Consent', icon: FileSignature, badge: consentSlips.filter(c => c.status === 'pending').length },
              { id: 'messages', label: 'Teacher Messages', icon: MessageSquare, badge: messages.filter(m => !m.isRead).length },
              { id: 'circulars', label: 'School Circulars', icon: Bell }
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
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-[#0B3B3C]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Parent Profile Card */}
        <div className="p-4 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 border-2 border-teal-300 flex items-center justify-center font-bold text-xs text-white shadow-inner">
                OE
              </div>
              <div className="text-left">
                <p className="text-[10px] text-teal-300 uppercase tracking-wider font-semibold">Parent & PTA Chairman</p>
                <h4 className="font-bold text-xs text-white leading-tight">Chief O. Eze</h4>
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Principal Verified
                </p>
              </div>
            </div>
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
              Good morning, Chief Eze! <span className="text-2xl">👋</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Supervising academic growth for <span className="font-bold text-teal-800">{selectedWard.studentName}</span> ({selectedWard.classGroupName}).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* RLS Active Ward Badge Pill */}
            <div className="px-3.5 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ward: {selectedWard.studentName}</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveNav('circulars')}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#0B3B3C] hover:border-teal-400 relative transition-all shadow-sm"
              title="Circulars & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </header>

        {/* DASHBOARD BODY CONTAINER */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">

          {/* =========================================================================
              ROW 1: 5 CORE KPI METRIC CARDS (Parent Scoped)
             ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Classes Today */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Ward Classes Today</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">4</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">In Attendance</p>
            </div>

            {/* Card 2: Assignments Due */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Homework Due</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">3</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">This week</p>
            </div>

            {/* Card 3: Average Score */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Academic Score</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">82%</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">Grade: A</p>
            </div>

            {/* Card 4: Attendance */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Biometric Attendance</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">96%</h3>
              <p className="text-xs font-bold text-teal-700 mt-1">↑ 4% vs last week</p>
            </div>

            {/* Card 5: Position in Class */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-slate-500">Class Position</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">
                5 <span className="text-base text-slate-400 font-semibold">/ 32</span>
              </h3>
            </div>
          </div>

          {/* =========================================================================
              ROW 2: 3-COLUMN MIDDLE GRID
             ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Card 1: Today's Class Schedule */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-4">Ward's Schedule Today</h4>
                <div className="space-y-3">
                  {timetable.slice(0, 4).map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="px-2.5 py-1 rounded-lg bg-[#E6F4F1] text-[#0A6B68] text-[11px] font-bold tracking-tight min-w-[72px] text-center">
                        {slot.time}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{slot.subject}</p>
                        <p className="text-[10px] text-slate-400">{slot.teacher}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Recent Homework & Submissions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Homework Tracker</h4>
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
                      className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{asg.subject} - {asg.title.split('—')[0]}</p>
                          <p className="text-[10px] text-slate-400">Teacher: {asg.teacherName}</p>
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

            {/* Card 3: Ward Performance & Progress */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Subject Performance</h4>
                  <span className="text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg px-2 py-0.5">
                    This Term
                  </span>
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

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-3 font-semibold">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              ROW 3: 3-COLUMN BOTTOM GRID (School Circulars, Messages, Parent Quick Actions)
             ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: School Circulars */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">School Circulars</h4>
                  <button
                    onClick={() => setActiveNav('circulars')}
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

            {/* Column 2: Teacher & Principal Messages */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900">Direct Messages</h4>
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

            {/* Column 3: Parent Quick Actions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Parent Actions</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                
                {/* 1. Pay School Fees */}
                <button
                  onClick={() => {
                    setSelectedInvoiceForPayment(invoices[1] || invoices[0]);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Pay Fees</span>
                </button>

                {/* 2. Pickup QR Pass */}
                <button
                  onClick={() => {
                    setSelectedPassForQR(pickupPasses[0]);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Gate QR Pass</span>
                </button>

                {/* 3. Sign Consent Slip */}
                <button
                  onClick={() => {
                    handleApproveConsent('cst-02');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Sign Consent</span>
                </button>

                {/* 4. Contact Teacher */}
                <button
                  onClick={() => setIsAskTeacherOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#0A6B68] transition-all group flex flex-col items-center justify-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0A6B68] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight">Message Teacher</span>
                </button>

              </div>
            </div>

          </div>

        </div>
      </main>

      {/* MODALS */}
      <ParentFeePaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <PickupPassQRModal
        isOpen={!!selectedPassForQR}
        onClose={() => setSelectedPassForQR(null)}
        pass={selectedPassForQR}
      />

      <AskTeacherModal
        isOpen={isAskTeacherOpen}
        onClose={() => setIsAskTeacherOpen(false)}
        onSendQuery={handleSendTeacherQuery}
      />
    </div>
  );
};
