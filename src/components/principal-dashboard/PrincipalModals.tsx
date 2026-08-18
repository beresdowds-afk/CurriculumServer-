import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  Calendar, 
  CreditCard, 
  Download, 
  Send, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  BookOpen, 
  ChevronRight,
  Printer,
  Sparkles
} from 'lucide-react';
import { MainTabType } from '../Navbar';

// Types for Principal Tasks & Approvals
export interface PendingApprovalItem {
  id: string;
  category: 'admission' | 'appraisal' | 'assessment' | 'fee_waiver' | 'lesson_plan';
  title: string;
  subtitle: string;
  applicantOrStaff: string;
  classOrDept: string;
  date: string;
  priority: 'high' | 'medium' | 'normal';
  details: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PrincipalModalsProps {
  // Modal states
  isApprovalsModalOpen: boolean;
  onCloseApprovalsModal: () => void;
  isDateFilterModalOpen: boolean;
  onCloseDateFilterModal: () => void;
  isReportsModalOpen: boolean;
  onCloseReportsModal: () => void;
  isDocumentCenterOpen: boolean;
  onCloseDocumentCenter: () => void;
  isBehaviourAlertsOpen: boolean;
  onCloseBehaviourAlerts: () => void;
  isStaffLeaveOpen: boolean;
  onCloseStaffLeave: () => void;
  isAnnouncementComposerOpen: boolean;
  onCloseAnnouncementComposer: () => void;

  // Selected date / term
  currentDateFilter: string;
  onSelectDateFilter: (filter: string) => void;

  // Navigation
  onNavigateTab: (tab: MainTabType) => void;
  onShowToast: (message: string) => void;
}

export const PrincipalModals: React.FC<PrincipalModalsProps> = ({
  isApprovalsModalOpen,
  onCloseApprovalsModal,
  isDateFilterModalOpen,
  onCloseDateFilterModal,
  isReportsModalOpen,
  onCloseReportsModal,
  isDocumentCenterOpen,
  onCloseDocumentCenter,
  isBehaviourAlertsOpen,
  onCloseBehaviourAlerts,
  isStaffLeaveOpen,
  onCloseStaffLeave,
  isAnnouncementComposerOpen,
  onCloseAnnouncementComposer,
  currentDateFilter,
  onSelectDateFilter,
  onNavigateTab,
  onShowToast
}) => {
  // Master Approvals State
  const [approvalsTab, setApprovalsTab] = useState<'all' | 'admission' | 'appraisal' | 'assessment' | 'fee_waiver'>('all');
  const [approvalsList, setApprovalsList] = useState<PendingApprovalItem[]>([
    {
      id: 'app-01',
      category: 'admission',
      title: 'New Admission Application: John Davies',
      subtitle: 'Class: SS 1 (Science Stream) • Score: 88% Entrance Exam',
      applicantOrStaff: 'John Davies (Guardian: Dr. Robert Davies)',
      classOrDept: 'SS 1 Science',
      date: '10 mins ago',
      priority: 'high',
      details: 'All prior academic transcripts from St. Gregory College verified. Bursary acceptance fee cleared.',
      status: 'pending'
    },
    {
      id: 'app-02',
      category: 'admission',
      title: 'New Admission Application: Chioma Nwosu',
      subtitle: 'Class: JSS 1 • Score: 94% Entrance Exam',
      applicantOrStaff: 'Chioma Nwosu (Guardian: Engr. Emeka Nwosu)',
      classOrDept: 'JSS 1 Gold',
      date: '45 mins ago',
      priority: 'high',
      details: 'Medical certification uploaded. Entrance scholarship qualifying score attained.',
      status: 'pending'
    },
    {
      id: 'app-03',
      category: 'admission',
      title: 'New Admission Application: Tunde Bakare',
      subtitle: 'Class: SS 2 (Commercial) • Score: 81%',
      applicantOrStaff: 'Tunde Bakare (Guardian: Mrs. Folake Bakare)',
      classOrDept: 'SS 2 Commercial',
      date: '2 hours ago',
      priority: 'normal',
      details: 'Transfer clearance letter and continuous assessment records attached.',
      status: 'pending'
    },
    {
      id: 'app-04',
      category: 'admission',
      title: 'New Admission Application: Amina Bello',
      subtitle: 'Class: JSS 2 • Score: 86%',
      applicantOrStaff: 'Amina Bello (Guardian: Alhaji S. Bello)',
      classOrDept: 'JSS 2 Diamond',
      date: '4 hours ago',
      priority: 'normal',
      details: 'Relocation transfer from Abuja branch. Direct placement recommended.',
      status: 'pending'
    },
    {
      id: 'app-05',
      category: 'admission',
      title: 'New Admission Application: David Adeleke',
      subtitle: 'Class: SS 1 (Arts & Humanities) • Score: 79%',
      applicantOrStaff: 'David Adeleke (Guardian: Chief D. Adeleke)',
      classOrDept: 'SS 1 Arts',
      date: 'Yesterday',
      priority: 'normal',
      details: 'Music and literature aptitude distinction on entrance evaluation.',
      status: 'pending'
    },
    {
      id: 'app-06',
      category: 'appraisal',
      title: 'Staff Appraisal: Mrs. O. Bello (Mathematics HOD)',
      subtitle: '98% Syllabus Coverage • Class Average: 84% • 5.0 Peer Review',
      applicantOrStaff: 'Mrs. Olufunke Bello (Senior Education Officer)',
      classOrDept: 'Mathematics & STEM Department',
      date: '1 hour ago',
      priority: 'high',
      details: 'Recommended for Senior Master Grade II promotion and annual merit bonus step.',
      status: 'pending'
    },
    {
      id: 'app-07',
      category: 'appraisal',
      title: 'Staff Appraisal: Mr. Kayode Alabi (Physics Teacher)',
      subtitle: '95% Attendance • Lab Safety Distinction • 4.8 Rating',
      applicantOrStaff: 'Mr. Kayode Alabi',
      classOrDept: 'Physical Sciences Dept',
      date: 'Yesterday',
      priority: 'normal',
      details: 'Completed WAEC practical invigilation workshop certification.',
      status: 'pending'
    },
    {
      id: 'app-08',
      category: 'appraisal',
      title: 'Staff Appraisal: Miss Zainab Ahmed (English Form Teacher)',
      subtitle: 'Inter-School Debate Championship Coach • 4.9 Rating',
      applicantOrStaff: 'Miss Zainab Ahmed',
      classOrDept: 'Languages & Arts Dept',
      date: '2 days ago',
      priority: 'normal',
      details: 'Submitted innovative digital literacy curriculum addendum for JSS 1-3.',
      status: 'pending'
    },
    {
      id: 'app-09',
      category: 'assessment',
      title: 'SS 3 Mock Examination Paper: Further Mathematics',
      subtitle: 'Moderated by External Examiner Dr. Ogundimu • 60 Items',
      applicantOrStaff: 'Submitted by STEM Exam Committee',
      classOrDept: 'SS 3 Senior Broadsheet',
      date: '3 hours ago',
      priority: 'high',
      details: 'Strictly aligned with 2026 NERDC & WAEC syllabus standard. Awaiting Principal encrypted seal.',
      status: 'pending'
    },
    {
      id: 'app-10',
      category: 'assessment',
      title: 'JSS 3 BECE Preparation Test: Basic Science & Tech',
      subtitle: 'CBT 50 Objective + 4 Practical questions',
      applicantOrStaff: 'Submitted by Basic Tech Unit',
      classOrDept: 'JSS 3 Emerald',
      date: '5 hours ago',
      priority: 'medium',
      details: 'Randomized answer keys verified for anti-tamper CBT delivery.',
      status: 'pending'
    },
    {
      id: 'app-11',
      category: 'assessment',
      title: 'SS 2 Chemistry Mid-Term Practical Assessment',
      subtitle: 'Volumetric Analysis & Qualitative Chemistry',
      applicantOrStaff: 'Mr. Emmanuel Okafor',
      classOrDept: 'SS 2 Science',
      date: '1 day ago',
      priority: 'normal',
      details: 'Lab reagents and safety protocols signed off by Head of Science.',
      status: 'pending'
    },
    {
      id: 'app-12',
      category: 'assessment',
      title: 'SS 1 Economics Continuous Assessment II',
      subtitle: 'National Income & Inflation Models',
      applicantOrStaff: 'Mrs. Tolulope Oladipo',
      classOrDept: 'SS 1 Commercial',
      date: '2 days ago',
      priority: 'normal',
      details: 'Marking guide and rubrics verified by HOD Social Sciences.',
      status: 'pending'
    },
    {
      id: 'app-13',
      category: 'assessment',
      title: 'Primary 6 / JSS 1 Placement Diagnostic Test',
      subtitle: 'Verbal & Quantitative Reasoning',
      applicantOrStaff: 'Admissions & Placement Board',
      classOrDept: 'Placement Desk',
      date: '2 days ago',
      priority: 'normal',
      details: 'Standardized entrance ranking algorithm calibrated.',
      status: 'pending'
    },
    {
      id: 'app-14',
      category: 'fee_waiver',
      title: 'Academic Scholarship Fee Waiver: Master Ifeanyi Eze',
      subtitle: 'SS 2 STEM National Olympiad Gold Medalist (50% Tuition Waiver)',
      applicantOrStaff: 'Master Ifeanyi Eze (Reg: GFA/2024/091)',
      classOrDept: 'SS 2 Science',
      date: 'Yesterday',
      priority: 'high',
      details: 'Recommended by Academic Board under the Greenfield Talent Merit Endowment Fund.',
      status: 'pending'
    },
    {
      id: 'app-15',
      category: 'fee_waiver',
      title: 'Sibling Concession Waiver: Hassan Twins (JSS 1)',
      subtitle: 'Family Enrollment Rebate (15% concession on 3rd sibling)',
      applicantOrStaff: 'Mr. & Mrs. Farouk Hassan',
      classOrDept: 'JSS 1 Emerald & Ruby',
      date: '3 days ago',
      priority: 'normal',
      details: 'Bursary verification of 3 actively enrolled wards confirmed.',
      status: 'pending'
    }
  ]);

  // Handle Approve Item
  const handleApprove = (id: string, name: string) => {
    setApprovalsList(prev => prev.map(item => item.id === id ? { ...item, status: 'approved' } : item));
    onShowToast(`Approved: "${name}" successfully!`);
  };

  // Handle Reject Item
  const handleReject = (id: string, name: string) => {
    setApprovalsList(prev => prev.map(item => item.id === id ? { ...item, status: 'rejected' } : item));
    onShowToast(`Rejected/Queried: "${name}".`);
  };

  // Filtered items
  const filteredApprovals = approvalsList.filter(item => {
    if (approvalsTab === 'all') return true;
    return item.category === approvalsTab;
  });

  const pendingCount = approvalsList.filter(i => i.status === 'pending').length;

  // Announcement form
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'parents' | 'teachers' | 'students'>('all');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [isSmsEnabled, setIsSmsEnabled] = useState(true);
  const [isWhatsAppEnabled, setIsWhatsAppEnabled] = useState(true);

  // Behaviour incidents list
  const [incidents, setIncidents] = useState([
    {
      id: 'inc-01',
      student: 'Samuel Adekunle',
      classArm: 'SS 1A',
      severity: 'Medium',
      time: '2 hours ago',
      issue: 'Classroom disruption during Physics lecture & unauthorized smartphone usage',
      reportedBy: 'Mr. Kayode Alabi (Physics Teacher)',
      status: 'Investigation Pending'
    },
    {
      id: 'inc-02',
      student: 'Favour Obi',
      classArm: 'JSS 3B',
      severity: 'Low',
      time: 'Today, 8:40 AM',
      issue: 'Repeated late arrival at morning devotion and assembly for 3 consecutive days',
      reportedBy: 'Mrs. N. Peters (Discipline Mistress)',
      status: 'Parent Notified'
    },
    {
      id: 'inc-03',
      student: 'Ibrahim Danjuma',
      classArm: 'SS 2C',
      severity: 'Medium',
      time: 'Yesterday',
      issue: 'Inter-house athletic track boundary dispute during sports rehearsal',
      reportedBy: 'Coach Johnson (Sports Director)',
      status: 'Resolved by Prefects'
    }
  ]);

  // Staff on Leave list
  const staffOnLeaveList = [
    { name: 'Mr. Babatunde Lawal', role: 'Chemistry Teacher', duration: 'May 19 - May 22', reason: 'WAEC Coordination Workshop', relief: 'Mr. Emmanuel Okafor' },
    { name: 'Mrs. Grace Okeke', role: 'Junior School Counselor', duration: 'May 20 - May 21', reason: 'Annual Guidance Conference', relief: 'Mrs. R. Daniel' },
    { name: 'Mr. Segun Oladimeji', role: 'Fine Arts Instructor', duration: 'Today', reason: 'Medical Checkup', relief: 'Miss Z. Ahmed' },
    { name: 'Mrs. Victoria Adebayo', role: 'Bursary Officer', duration: 'May 18 - May 22', reason: 'ICAN Continuing Education', relief: 'Mr. Paul Bassey' },
    { name: 'Dr. (Mrs.) C. Nwachukwu', role: 'Biology Coordinator', duration: 'Today', reason: 'NERDC Curriculum Review Panel', relief: 'Mrs. T. Oladipo' },
    { name: 'Mr. Musa Garba', role: 'Security Supervisor', duration: 'Today - Tomorrow', reason: 'Scheduled Off-Duty', relief: 'Mr. Sunday Idowu' }
  ];

  return (
    <>
      {/* ============================================================ */}
      {/* 1. MASTER PENDING APPROVALS HUB MODAL                        */}
      {/* ============================================================ */}
      {isApprovalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-[#032e22] text-white p-5 sm:p-6 flex items-center justify-between border-b border-emerald-800/80 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight font-serif">Principal's Approvals Desk</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 border border-rose-400 text-rose-200 text-xs font-bold font-mono">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Authorized executive sign-off for admissions, staff appraisals, term examinations and fee concessions.
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseApprovalsModal}
                className="w-8 h-8 rounded-full bg-emerald-900/80 text-emerald-200 hover:text-white flex items-center justify-center hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setApprovalsTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  approvalsTab === 'all'
                    ? 'bg-[#043b2c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                All Approvals ({approvalsList.length})
              </button>
              <button
                onClick={() => setApprovalsTab('admission')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  approvalsTab === 'admission'
                    ? 'bg-[#043b2c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Admissions (5)
              </button>
              <button
                onClick={() => setApprovalsTab('appraisal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  approvalsTab === 'appraisal'
                    ? 'bg-[#043b2c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Staff Appraisals (3)
              </button>
              <button
                onClick={() => setApprovalsTab('assessment')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  approvalsTab === 'assessment'
                    ? 'bg-[#043b2c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Term Assessments (5)
              </button>
              <button
                onClick={() => setApprovalsTab('fee_waiver')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  approvalsTab === 'fee_waiver'
                    ? 'bg-[#043b2c] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                Fee Waivers (2)
              </button>
            </div>

            {/* List of Items */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
              {filteredApprovals.map(item => (
                <div 
                  key={item.id}
                  className={`pt-3.5 first:pt-0 rounded-2xl p-4 transition-all ${
                    item.status === 'approved' 
                      ? 'bg-emerald-50/60 border border-emerald-200' 
                      : item.status === 'rejected'
                      ? 'bg-rose-50/60 border border-rose-200'
                      : 'bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          item.category === 'admission' ? 'bg-blue-100 text-blue-800' :
                          item.category === 'appraisal' ? 'bg-purple-100 text-purple-800' :
                          item.category === 'assessment' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.category.replace('_', ' ')}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900">{item.title}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">• {item.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{item.subtitle}</p>
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl mt-1.5 border border-slate-100">
                        {item.details}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleReject(item.id, item.title)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Query / Decline
                          </button>
                          <button
                            onClick={() => handleApprove(item.id, item.title)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Sign</span>
                          </button>
                        </>
                      ) : item.status === 'approved' ? (
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approved & Signed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-100 px-3 py-1.5 rounded-xl">
                          <AlertCircle className="w-4 h-4" />
                          <span>Declined / Queried</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Signed by Principal using 256-bit Executive Vault Certificate
              </span>
              <button
                onClick={onCloseApprovalsModal}
                className="px-5 py-2 rounded-xl bg-[#032e22] text-white font-bold text-xs hover:bg-emerald-950 transition-colors cursor-pointer"
              >
                Close Desk
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. DATE & ACADEMIC TERM SELECTOR MODAL                       */}
      {/* ============================================================ */}
      {isDateFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Select Dashboard Timeframe</h3>
              </div>
              <button
                onClick={onCloseDateFilterModal}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-slate-500 mb-2">Choose an academic period or day to filter dashboard analytics:</p>
              
              {[
                { label: 'Today, May 20, 2026 (Live Feed)', val: 'Today, May 20, 2026' },
                { label: 'Yesterday, May 19, 2026', val: 'Yesterday, May 19, 2026' },
                { label: 'This Academic Week (Week 8)', val: 'This Academic Week' },
                { label: 'Term 2 (Current Term 2025/2026)', val: 'Term 2 (2025/2026)' },
                { label: 'Term 1 (First Term 2025/2026)', val: 'Term 1 (2025/2026)' },
                { label: 'Full Session 2025/2026 Cumulative', val: 'Full Session 2025/2026' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => {
                    onSelectDateFilter(opt.val);
                    onCloseDateFilterModal();
                    onShowToast(`Dashboard filtered to: ${opt.val}`);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    currentDateFilter === opt.val
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentDateFilter === opt.val && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. REPORT GENERATOR MODAL                                    */}
      {/* ============================================================ */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Principal's Instant Report Generator</h3>
                  <p className="text-[10px] text-emerald-200">Export official PDF & Broadsheet records</p>
                </div>
              </div>
              <button
                onClick={onCloseReportsModal}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              
              <div 
                onClick={() => {
                  onCloseReportsModal();
                  onNavigateTab('academic_records');
                  onShowToast('Exporting Master Terminal Broadsheet (PDF)...');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Master Terminal Broadsheet</div>
                    <div className="text-[11px] text-slate-500">Comprehensive score rankings across all 42 classes</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-emerald-700" />
              </div>

              <div 
                onClick={() => {
                  onCloseReportsModal();
                  onNavigateTab('bursary_accounts');
                  onShowToast('Exporting Term 2 Financial & Fee Ledger...');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Fee Collection & Ledger Audit</div>
                    <div className="text-[11px] text-slate-500">₦12.4M collected breakdown by class and debt age</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-blue-700" />
              </div>

              <div 
                onClick={() => {
                  onCloseReportsModal();
                  onNavigateTab('biometric_attendance');
                  onShowToast('Exporting Biometric Attendance Summary...');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Biometric Attendance Analysis</div>
                    <div className="text-[11px] text-slate-500">94% daily student and faculty attendance log</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-amber-700" />
              </div>

              <div 
                onClick={() => {
                  onCloseReportsModal();
                  onNavigateTab('teacher_pool');
                  onShowToast('Exporting Faculty TRCN & Performance Audit...');
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Staff TRCN Compliance & Syllabus Roster</div>
                    <div className="text-[11px] text-slate-500">78 teaching staff appraisal and subject coverage ratings</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-purple-700" />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. INSTITUTIONAL DOCUMENT CENTER MODAL                       */}
      {/* ============================================================ */}
      {isDocumentCenterOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Institutional Document Center</h3>
                  <p className="text-[10px] text-emerald-200">Official syllabus manuals, ministry accreditations & certificates</p>
                </div>
              </div>
              <button
                onClick={onCloseDocumentCenter}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs flex-1">
              {[
                { title: '2026 NERDC National Curriculum Harmonized Framework (JSS 1 - SS 3)', size: '4.8 MB', type: 'PDF Manual', date: 'Jan 2026' },
                { title: 'Lagos State Ministry of Basic Education Quality Assurance Accreditation (Grade A+)', size: '1.2 MB', type: 'Certificate', date: 'Nov 2025' },
                { title: 'Greenfield Academy Staff Handbook & Code of Professional Conduct (2025/2026)', size: '2.1 MB', type: 'Policy Doc', date: 'Sept 2025' },
                { title: 'WAEC & NECO Approved Laboratory Safety Guidelines and Checklist', size: '3.4 MB', type: 'STEM Manual', date: 'Feb 2026' },
                { title: 'Term 2 2026 Approved Timetable & Teacher Period Allocation Matrix', size: '890 KB', type: 'Spreadsheet', date: 'April 2026' }
              ].map((doc, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-emerald-50/50 transition-all">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-xs">{doc.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{doc.type} • {doc.size} • {doc.date}</div>
                  </div>
                  <button
                    onClick={() => onShowToast(`Downloading: "${doc.title}"...`)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ml-3"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={onCloseDocumentCenter}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. BEHAVIOUR INCIDENTS & DISCIPLINE MODAL                    */}
      {/* ============================================================ */}
      {isBehaviourAlertsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm">Behaviour & Discipline Alerts (3 Pending)</h3>
              </div>
              <button
                onClick={onCloseBehaviourAlerts}
                className="w-7 h-7 rounded-full bg-rose-900 text-rose-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs max-h-[60vh] overflow-y-auto">
              {incidents.map(inc => (
                <div key={inc.id} className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-900">{inc.student} ({inc.classArm})</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">{inc.time}</span>
                  </div>
                  <p className="text-xs text-slate-700">{inc.issue}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>By: {inc.reportedBy}</span>
                    <button
                      onClick={() => onShowToast(`Counseling referral initiated for ${inc.student}`)}
                      className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                    >
                      Resolve / Call Parent ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. STAFF ON LEAVE TRACKER MODAL                              */}
      {/* ============================================================ */}
      {isStaffLeaveOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Staff on Approved Leave (12 Today)</h3>
              </div>
              <button
                onClick={onCloseStaffLeave}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              {staffOnLeaveList.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.role} • {s.duration}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Relief: {s.relief}</div>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-xl">
                    {s.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. ANNOUNCEMENT BROADCAST COMPOSER                           */}
      {/* ============================================================ */}
      {isAnnouncementComposerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#032e22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Send Official School Announcement</h3>
                  <p className="text-[10px] text-emerald-200">Multi-channel SMS, WhatsApp & Portal push</p>
                </div>
              </div>
              <button
                onClick={onCloseAnnouncementComposer}
                className="w-7 h-7 rounded-full bg-emerald-900 text-emerald-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Audience:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['all', 'parents', 'teachers', 'students'] as const).map(target => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setAnnouncementTarget(target)}
                      className={`py-2 rounded-xl text-center font-bold capitalize transition-all cursor-pointer ${
                        announcementTarget === target
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Announcement Heading:</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Term Assessment Schedule & Guidelines"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content:</label>
                <textarea
                  rows={4}
                  placeholder="Type official notification..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSmsEnabled}
                    onChange={(e) => setIsSmsEnabled(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold text-slate-700">Send Instant SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWhatsAppEnabled}
                    onChange={(e) => setIsWhatsAppEnabled(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold text-slate-700">WhatsApp Broadcast</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCloseAnnouncementComposer}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!announcementTitle.trim()) {
                      onShowToast('Please provide an announcement heading.');
                      return;
                    }
                    onShowToast(`Circular "${announcementTitle}" broadcasted to ${announcementTarget}!`);
                    setAnnouncementTitle('');
                    setAnnouncementMessage('');
                    onCloseAnnouncementComposer();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Circular</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
