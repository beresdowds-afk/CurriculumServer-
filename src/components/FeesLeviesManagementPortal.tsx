import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  ClassGrade, 
  Term, 
  FeeItem, 
  FeeSchedule, 
  FeeCategory, 
  SundryPaymentOrder,
  StudentInvoice,
  PaymentNotification,
  PaymentChannel,
  Student
} from '../types';
import { 
  numberToWordsNaira,
  generateVirtualNuban
} from '../data/bursaryAccountsData';
import { INITIAL_STUDENTS } from '../data/schoolManagementData';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Layers, 
  CreditCard, 
  Tag, 
  Sparkles, 
  FileText, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  Printer, 
  Download, 
  Eye, 
  QrCode, 
  Building2, 
  Calendar, 
  Smartphone, 
  Mail, 
  Users, 
  Check, 
  X, 
  ArrowRight, 
  Copy, 
  Sliders, 
  Award, 
  BookOpen, 
  Compass, 
  Bus, 
  GraduationCap, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  TrendingUp, 
  Lock,
  DollarSign,
  Briefcase,
  Share2
} from 'lucide-react';

interface FeesLeviesManagementPortalProps {
  currentUser: UserProfile;
  feeItems: FeeItem[];
  onUpdateFeeItems: (items: FeeItem[]) => void;
  feeSchedules: FeeSchedule[];
  onUpdateFeeSchedules: (schedules: FeeSchedule[]) => void;
  sundryPayments: SundryPaymentOrder[];
  onUpdateSundryPayments: (orders: SundryPaymentOrder[]) => void;
  invoices: StudentInvoice[];
  onUpdateInvoices: (invoices: StudentInvoice[]) => void;
  onDispatchNotification: (notif: PaymentNotification) => void;
  onOpenCheckoutForSundry?: (order: SundryPaymentOrder) => void;
  showToast: (msg: string) => void;
}

type PortalViewTab = 'fee_catalog' | 'class_schedules' | 'sundry_orders' | 'principal_audit' | 'fee_simulator';

const ALL_GRADES: ClassGrade[] = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

const CATEGORY_LABELS: Record<FeeCategory, { label: string; bg: string; text: string; border: string; icon: any }> = {
  tuition: { label: 'Tuition & Instruction', bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-700/50', icon: GraduationCap },
  science_lab: { label: 'Science & Robotics Lab', bg: 'bg-teal-950/70', text: 'text-teal-300', border: 'border-teal-700/50', icon: Sparkles },
  ict_lms: { label: 'ICT & Digital LMS', bg: 'bg-cyan-950/70', text: 'text-cyan-300', border: 'border-cyan-700/50', icon: Layers },
  development_levy: { label: 'Infrastructure & CapEx', bg: 'bg-indigo-950/70', text: 'text-indigo-300', border: 'border-indigo-700/50', icon: Building2 },
  uniform_boarding: { label: 'Hostel & Catering', bg: 'bg-blue-950/70', text: 'text-blue-300', border: 'border-blue-700/50', icon: Building2 },
  exam_fees: { label: 'WAEC / NECO / BECE Exams', bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-700/50', icon: Award },
  pta: { label: 'PTA Welfare Levy', bg: 'bg-purple-950/70', text: 'text-purple-300', border: 'border-purple-700/50', icon: Users },
  medical_insurance: { label: 'Medical & Clinic Retainer', bg: 'bg-rose-950/70', text: 'text-rose-300', border: 'border-rose-700/50', icon: ShieldCheck },
  transport: { label: 'Bus Transit Routes', bg: 'bg-yellow-950/70', text: 'text-yellow-300', border: 'border-yellow-700/50', icon: Bus },
  excursion: { label: 'Educational Excursions', bg: 'bg-fuchsia-950/70', text: 'text-fuchsia-300', border: 'border-fuchsia-700/50', icon: Compass },
  clubs_societies: { label: 'Clubs & Societies', bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-700/50', icon: BookOpen },
  sports_uniform: { label: 'Uniforms, Jerseys & Regalia', bg: 'bg-orange-950/70', text: 'text-orange-300', border: 'border-orange-700/50', icon: Tag },
  graduation_valedictory: { label: 'Valedictory & Gown Rental', bg: 'bg-violet-950/70', text: 'text-violet-300', border: 'border-violet-700/50', icon: GraduationCap },
  late_penalty: { label: 'Late Registration Penalty', bg: 'bg-red-950/70', text: 'text-red-300', border: 'border-red-700/50', icon: AlertTriangle },
  coaching_extramural: { label: 'Masterclass & Extramural', bg: 'bg-sky-950/70', text: 'text-sky-300', border: 'border-sky-700/50', icon: Briefcase },
  sundry_special: { label: 'Special Sundry Levy', bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700', icon: CreditCard }
};

export const FeesLeviesManagementPortal: React.FC<FeesLeviesManagementPortalProps> = ({
  currentUser,
  feeItems,
  onUpdateFeeItems,
  feeSchedules,
  onUpdateFeeSchedules,
  sundryPayments,
  onUpdateSundryPayments,
  invoices,
  onUpdateInvoices,
  onDispatchNotification,
  onOpenCheckoutForSundry,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<PortalViewTab>('fee_catalog');
  const [selectedAcademicSession, setSelectedAcademicSession] = useState<string>('2025/2026');
  const [selectedTerm, setSelectedTerm] = useState<Term>('Term 3');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedCompulsoryFilter, setSelectedCompulsoryFilter] = useState<string>('all');

  // Modals state
  const [isCreateFeeItemModalOpen, setIsCreateFeeItemModalOpen] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<FeeItem | null>(null);
  const [isScheduleBuilderModalOpen, setIsScheduleBuilderModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FeeSchedule | null>(null);
  const [isSundryOrderModalOpen, setIsSundryOrderModalOpen] = useState(false);
  const [selectedSundryPass, setSelectedSundryPass] = useState<SundryPaymentOrder | null>(null);
  const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState(false);
  const [isCloneSessionModalOpen, setIsCloneSessionModalOpen] = useState(false);

  // Fee Simulator State
  const [simulatedTuitionPercent, setSimulatedTuitionPercent] = useState<number>(0);
  const [simulatedEnrollmentGrowth, setSimulatedEnrollmentGrowth] = useState<number>(0);

  // -------------------------------------------------------------
  // Filtered Lists
  // -------------------------------------------------------------
  const filteredFeeItems = useMemo(() => {
    return feeItems.filter((item) => {
      const matchSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      
      const matchCat = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
      const matchGrade = selectedGradeFilter === 'all' || item.applicableGrades.includes(selectedGradeFilter as ClassGrade);
      const matchCompulsory = selectedCompulsoryFilter === 'all' || 
        (selectedCompulsoryFilter === 'compulsory' && item.isCompulsory) ||
        (selectedCompulsoryFilter === 'optional' && !item.isCompulsory);

      return matchSearch && matchCat && matchGrade && matchCompulsory;
    });
  }, [feeItems, searchQuery, selectedCategoryFilter, selectedGradeFilter, selectedCompulsoryFilter]);

  const filteredSchedules = useMemo(() => {
    return feeSchedules.filter((sched) => {
      const matchSearch = searchQuery === '' || sched.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = selectedGradeFilter === 'all' || sched.classGrade === selectedGradeFilter;
      return matchSearch && matchGrade;
    });
  }, [feeSchedules, searchQuery, selectedGradeFilter]);

  const filteredSundryPayments = useMemo(() => {
    return sundryPayments.filter((order) => {
      const matchSearch = searchQuery === '' || 
        order.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.feeItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategoryFilter === 'all' || order.category === selectedCategoryFilter;
      const matchGrade = selectedGradeFilter === 'all' || order.classGrade === selectedGradeFilter;
      return matchSearch && matchCat && matchGrade;
    });
  }, [sundryPayments, searchQuery, selectedCategoryFilter, selectedGradeFilter]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const totalFeeItemsCount = feeItems.length;
    const compulsoryCount = feeItems.filter(f => f.isCompulsory).length;
    const sundryCount = feeItems.filter(f => !f.isCompulsory).length;

    const ssDaySched = feeSchedules.find(s => s.classGrade === 'SS 2' && s.studentType === 'day') || feeSchedules[0];
    const ssBrdSched = feeSchedules.find(s => s.classGrade === 'SS 2' && s.studentType === 'boarding');
    const jssDaySched = feeSchedules.find(s => s.classGrade === 'JSS 2' && s.studentType === 'day');

    const totalSundryCollected = sundryPayments
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + s.amount, 0);

    const totalSundryPending = sundryPayments
      .filter(s => s.paymentStatus === 'pending')
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      totalFeeItemsCount,
      compulsoryCount,
      sundryCount,
      ssDayFee: ssDaySched ? ssDaySched.totalAmount : 173000,
      ssBrdFee: ssBrdSched ? ssBrdSched.totalAmount : 348000,
      jssDayFee: jssDaySched ? jssDaySched.totalAmount : 153000,
      totalSundryCollected,
      totalSundryPending,
      sundryOrdersCount: sundryPayments.length
    };
  }, [feeItems, feeSchedules, sundryPayments]);

  // -------------------------------------------------------------
  // HANDLERS: FEE ITEMS (CREATE, EDIT, DELETE, TOGGLE PUBLISH)
  // -------------------------------------------------------------
  const handleSaveFeeItem = (itemData: Partial<FeeItem>) => {
    if (editingFeeItem) {
      // Update
      const updated = feeItems.map(f => f.id === editingFeeItem.id ? { ...editingFeeItem, ...itemData } as FeeItem : f);
      onUpdateFeeItems(updated);
      showToast(`Fee item "${itemData.name}" updated successfully!`);
    } else {
      // Create new
      const newItem: FeeItem = {
        id: `fee-${Date.now().toString().slice(-6)}`,
        code: itemData.code || `FEE-${Math.floor(100 + Math.random() * 900)}`,
        name: itemData.name || 'New School Fee Component',
        category: itemData.category || 'sundry_special',
        amount: Number(itemData.amount) || 10000,
        isCompulsory: !!itemData.isCompulsory,
        applicableGrades: itemData.applicableGrades && itemData.applicableGrades.length > 0 ? itemData.applicableGrades : ALL_GRADES,
        description: itemData.description || 'Standard approved institutional levy.',
        frequency: itemData.frequency || 'per_term',
        targetAudience: itemData.targetAudience || 'all_students',
        approvalStatus: 'approved_published',
        approvedBy: `${currentUser.title || ''} ${currentUser.fullName} (${currentUser.role === 'principal_admin' ? 'Principal' : 'Administrator'})`.trim(),
        approvedAt: new Date().toISOString().split('T')[0],
        designatedAccount: itemData.designatedAccount || 'School Operations Account - Access Bank (0092817345)',
        installmentEligible: itemData.installmentEligible ?? true,
        dueDate: itemData.dueDate,
        tags: itemData.tags || ['Custom Levy']
      };
      onUpdateFeeItems([newItem, ...feeItems]);
      showToast(`New fee item "${newItem.name}" approved & added to catalog!`);
    }
    setIsCreateFeeItemModalOpen(false);
    setEditingFeeItem(null);
  };

  const handleDeleteFeeItem = (id: string) => {
    const target = feeItems.find(f => f.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to retire fee item "${target.name}"?`)) {
      onUpdateFeeItems(feeItems.filter(f => f.id !== id));
      showToast(`Fee item "${target.name}" removed from catalog.`);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: FEE SCHEDULES (CREATE, EDIT, BATCH SYNC TO INVOICES)
  // -------------------------------------------------------------
  const handleSaveSchedule = (scheduleData: Partial<FeeSchedule>) => {
    const selectedItems = feeItems.filter(f => (scheduleData.feeItems || []).some(fi => fi.id === f.id));
    const totalAmount = selectedItems.reduce((acc, curr) => acc + curr.amount, 0);

    if (editingSchedule) {
      const updated = feeSchedules.map(s => s.id === editingSchedule.id ? {
        ...editingSchedule,
        ...scheduleData,
        feeItems: selectedItems,
        totalAmount
      } as FeeSchedule : s);
      onUpdateFeeSchedules(updated);
      showToast(`Fee schedule "${scheduleData.name}" updated (₦${totalAmount.toLocaleString()})!`);
    } else {
      const newSched: FeeSchedule = {
        id: `sched-${Date.now().toString().slice(-6)}`,
        code: scheduleData.code || `SCHED-${scheduleData.classGrade?.replace(' ', '')}-${Date.now().toString().slice(-4)}`,
        name: scheduleData.name || `${scheduleData.classGrade} Term Schedule`,
        academicSession: selectedAcademicSession,
        term: selectedTerm,
        classGrade: scheduleData.classGrade || 'SS 2',
        studentType: scheduleData.studentType || 'day',
        feeItems: selectedItems,
        totalAmount,
        approvalStatus: 'approved_published',
        approvedBy: `${currentUser.fullName} (Principal)`,
        approvedAt: new Date().toISOString().split('T')[0],
        notes: scheduleData.notes || 'Authorized school fee schedule bundle.'
      };
      onUpdateFeeSchedules([newSched, ...feeSchedules]);
      showToast(`New schedule "${newSched.name}" published for ${newSched.classGrade}!`);
    }
    setIsScheduleBuilderModalOpen(false);
    setEditingSchedule(null);
  };

  // -------------------------------------------------------------
  // BATCH SYNC SCHEDULES TO STUDENT INVOICES
  // -------------------------------------------------------------
  const handleBatchSyncInvoices = () => {
    let syncedCount = 0;
    const updatedInvoices = invoices.map((inv) => {
      const matchingSchedule = feeSchedules.find(s => s.classGrade === inv.classGrade && s.studentType === 'day') || feeSchedules[0];
      if (matchingSchedule) {
        syncedCount++;
        const newLineItems = matchingSchedule.feeItems.map(item => ({
          feeItemId: item.id,
          name: item.name,
          category: item.category,
          amount: item.amount,
          discountAmount: 0,
          netAmount: item.amount
        }));
        const newTotal = newLineItems.reduce((acc, curr) => acc + curr.netAmount, 0);
        const newBalance = Math.max(0, newTotal - inv.amountPaid);
        return {
          ...inv,
          lineItems: newLineItems,
          totalAmount: newTotal,
          balanceDue: newBalance,
          status: newBalance === 0 ? 'paid' : (inv.amountPaid > 0 ? 'partially_paid' : 'unpaid')
        };
      }
      return inv;
    });

    onUpdateInvoices(updatedInvoices);
    setIsBatchSyncModalOpen(false);
    showToast(`Successfully synchronized ${syncedCount} active student invoices with current Principal fee schedules!`);

    // Dispatch broadcast notification
    const broadcastNotif: PaymentNotification = {
      id: `notif-batch-sync-${Date.now()}`,
      type: 'sms',
      recipient: '+234 800 000 0000',
      recipientName: 'All Parents & Guardians',
      studentName: 'School-Wide Student Body',
      title: 'Principal Approved Term Fee Schedule Published',
      message: `Dear Parent, the official fee schedule for ${selectedAcademicSession} ${selectedTerm} has been published by the Principal. Please check your student billing portal to review or settle dues.`,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    onDispatchNotification(broadcastNotif);
  };

  // -------------------------------------------------------------
  // HANDLERS: SUNDRY PAYMENTS (CREATE ORDER, DIRECT PAYMENT, PASS)
  // -------------------------------------------------------------
  const handleCreateSundryOrder = (orderData: Partial<SundryPaymentOrder>) => {
    const matchingFeeItem = feeItems.find(f => f.id === orderData.feeItemId);
    const matchingStudent = INITIAL_STUDENTS.find(s => s.id === orderData.studentId) || INITIAL_STUDENTS[0];

    const newOrder: SundryPaymentOrder = {
      id: `snd-${Date.now().toString().slice(-6)}`,
      orderNumber: `SND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      feeItemId: matchingFeeItem?.id || 'fee-excursion-space',
      feeItemName: matchingFeeItem?.name || 'Sundry Activity Levy',
      category: matchingFeeItem?.category || 'sundry_special',
      studentId: matchingStudent.id,
      studentName: matchingStudent.fullName,
      admissionNumber: matchingStudent.admissionNumber,
      classGrade: matchingStudent.classGrade,
      parentName: matchingStudent.parentName || 'Parent / Guardian',
      parentPhone: matchingStudent.parentPhone || '+234 800 123 4567',
      parentEmail: matchingStudent.parentEmail || 'parent@curriculumflow.edu.ng',
      amount: matchingFeeItem ? matchingFeeItem.amount : (Number(orderData.amount) || 15000),
      paymentStatus: 'pending',
      additionalDetails: orderData.additionalDetails || {},
      issuedAt: new Date().toISOString().split('T')[0],
      issuedBy: `${currentUser.fullName || currentUser.name || 'Principal'} (Principal Portal)`
    };

    onUpdateSundryPayments([newOrder, ...sundryPayments]);
    setIsSundryOrderModalOpen(false);
    showToast(`Payment order ${newOrder.orderNumber} created for ${newOrder.studentName}!`);

    // Notify Parent
    const notif: PaymentNotification = {
      id: `notif-sundry-${Date.now()}`,
      type: 'sms',
      recipient: newOrder.parentPhone,
      recipientName: newOrder.parentName,
      studentName: newOrder.studentName,
      title: `New Sundry Levy Invoice: ${newOrder.feeItemName}`,
      message: `Invoice for ${newOrder.feeItemName} (₦${newOrder.amount.toLocaleString()}) for ${newOrder.studentName} is generated. Ref: ${newOrder.orderNumber}.`,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    onDispatchNotification(notif);
  };

  const handleMarkSundryPaid = (order: SundryPaymentOrder, channel: PaymentChannel = 'paystack') => {
    const updated = sundryPayments.map(s => s.id === order.id ? {
      ...s,
      paymentStatus: 'paid' as const,
      paymentDate: new Date().toISOString().split('T')[0],
      receiptNumber: `REC-SND-${Date.now().toString().slice(-6)}`,
      transactionReference: `PSTK_SND_${Date.now().toString().slice(-6)}`,
      paymentChannel: channel
    } : s);
    onUpdateSundryPayments(updated);
    showToast(`Sundry order ${order.orderNumber} marked as fully paid!`);

    // Notify parent
    const notif: PaymentNotification = {
      id: `notif-snd-paid-${Date.now()}`,
      type: 'sms',
      recipient: order.parentPhone,
      recipientName: order.parentName,
      studentName: order.studentName,
      title: `Payment Received: ${order.feeItemName}`,
      message: `Payment of ₦${order.amount.toLocaleString()} for ${order.feeItemName} (${order.studentName}) confirmed. Receipt #${`REC-SND-${Date.now().toString().slice(-6)}`}.`,
      timestamp: new Date().toISOString(),
      status: 'delivered'
    };
    onDispatchNotification(notif);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. EXECUTIVE HEADER BANNER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700/60 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Principal Executive Authority</span>
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Statutory Fee Governance Active</span>
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800">
                Session: {selectedAcademicSession} • {selectedTerm}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <span>Fees & Levies Management Portal</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Institutional tuition fee setting engine, custom sundry levy generator, class bundle architecture, 
              and automated student ledger synchronization for Principal and Executive Administrators.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingFeeItem(null);
                setIsCreateFeeItemModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Fee / Levy</span>
            </button>

            <button
              onClick={() => {
                setEditingSchedule(null);
                setIsScheduleBuilderModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/50 flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>+ Build Class Schedule</span>
            </button>

            <button
              onClick={() => setIsBatchSyncModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Sync to Invoices</span>
            </button>

            <button
              onClick={() => setIsSundryOrderModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Sundry Payment</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* EXECUTIVE KPI SUMMARY CARDS */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Fee Catalog Items</span>
            <div className="text-lg font-black text-white font-mono mt-0.5">{stats.totalFeeItemsCount} Components</div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">{stats.compulsoryCount} Core • {stats.sundryCount} Sundry</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SS 2 Standard Day Fee</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">₦{stats.ssDayFee.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">6 Bundled Core Items</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">SS 2 Full Boarding Fee</span>
            <div className="text-lg font-black text-blue-400 font-mono mt-0.5">₦{stats.ssBrdFee.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Includes Hostel & Meals</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">JSS 2 Standard Day Fee</span>
            <div className="text-lg font-black text-teal-400 font-mono mt-0.5">₦{stats.jssDayFee.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Junior Base Package</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sundry Levies Collected</span>
            <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">₦{stats.totalSundryCollected.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">Excursions & Uniforms</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sundry Orders In Pipeline</span>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">₦{stats.totalSundryPending.toLocaleString()}</div>
            <span className="text-[10px] text-amber-400 mt-0.5 block">{stats.sundryOrdersCount} Total Invoices</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUB-PORTAL NAVIGATION TABS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('fee_catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'fee_catalog'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Master Fee & Sundry Catalog</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono">{feeItems.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('class_schedules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'class_schedules'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Class Fee Schedules & Bundles</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono">{feeSchedules.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('sundry_orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sundry_orders'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Sundry Payments & Event Passes</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono">{sundryPayments.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('principal_audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'principal_audit'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Principal Approval & Bank Ledgers</span>
          </button>

          <button
            onClick={() => setActiveTab('fee_simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'fee_simulator'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Revenue Impact Simulator</span>
          </button>
        </div>

        {/* Academic Session and Term selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAcademicSession}
            onChange={(e) => setSelectedAcademicSession(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="2025/2026">Session 2025/2026</option>
            <option value="2026/2027">Session 2026/2027 (Upcoming)</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value as Term)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="Term 1">Term 1 (Autumn)</option>
            <option value="Term 2">Term 2 (Lent)</option>
            <option value="Term 3">Term 3 (Trinity)</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEARCH AND FILTER CONTROLS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'fee_catalog' ? "Search fees, codes, tags..." :
              activeTab === 'class_schedules' ? "Search class schedules..." :
              "Search students, receipts, sundry orders..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {activeTab !== 'class_schedules' && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Fee Categories</option>
              <option value="tuition">Tuition & Instructional</option>
              <option value="science_lab">Science & Robotics Lab</option>
              <option value="ict_lms">ICT & Digital LMS</option>
              <option value="development_levy">Infrastructure Development</option>
              <option value="uniform_boarding">Hostel & Catering</option>
              <option value="exam_fees">Standardized Exams (WAEC/NECO)</option>
              <option value="pta">PTA Welfare Levy</option>
              <option value="medical_insurance">Medical & Health Clinic</option>
              <option value="transport">Bus Transit Route</option>
              <option value="excursion">Educational Excursion</option>
              <option value="clubs_societies">Clubs & Societies</option>
              <option value="sports_uniform">Uniforms & Athletic Kits</option>
              <option value="graduation_valedictory">Graduation & Regalia</option>
              <option value="coaching_extramural">Masterclasses & Extramural</option>
              <option value="late_penalty">Late Registration Penalties</option>
            </select>
          )}

          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Class Levels</option>
            {ALL_GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {activeTab === 'fee_catalog' && (
            <select
              value={selectedCompulsoryFilter}
              onChange={(e) => setSelectedCompulsoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="compulsory">Compulsory / Core</option>
              <option value="optional">Optional / Sundry</option>
            </select>
          )}

          {(searchQuery || selectedCategoryFilter !== 'all' || selectedGradeFilter !== 'all' || selectedCompulsoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
                setSelectedGradeFilter('all');
                setSelectedCompulsoryFilter('all');
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MASTER FEE CATALOG & SUNDRY LEVIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fee_catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeeItems.map((item) => {
              const catCfg = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.sundry_special;
              const CatIcon = catCfg.icon;

              return (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg relative group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Code, Category, Compulsory */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                          <CatIcon className="w-3 h-3" />
                          <span>{catCfg.label}</span>
                        </span>
                        {item.code && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                            {item.code}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        item.isCompulsory 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {item.isCompulsory ? 'Compulsory' : 'Sundry / Optional'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Key Attributes */}
                    <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Billing Frequency:</span>
                        <span className="font-semibold text-slate-200 capitalize">
                          {item.frequency ? item.frequency.replace(/_/g, ' ') : 'Per Term'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Target Audience:</span>
                        <span className="font-semibold text-slate-200 capitalize">
                          {item.targetAudience ? item.targetAudience.replace(/_/g, ' ') : 'All Students'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Applicable Grades:</span>
                        <span className="font-semibold text-emerald-400">
                          {item.applicableGrades.length === ALL_GRADES.length ? 'All (JSS 1 - SS 3)' : item.applicableGrades.join(', ')}
                        </span>
                      </div>

                      {item.designatedAccount && (
                        <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                          <span>Deposit Ledger:</span>
                          <span className="font-medium text-slate-300 truncate max-w-[170px]" title={item.designatedAccount}>
                            {item.designatedAccount.split('-')[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] text-slate-400 border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Amount & Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Fee Amount</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        ₦{item.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingFeeItem(item);
                          setIsCreateFeeItemModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Edit Fee Configuration"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          // Quick create sundry payment order for this item
                          setIsSundryOrderModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 transition cursor-pointer"
                        title="Create Direct Student Payment Link"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteFeeItem(item.id)}
                        className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 border border-rose-900/50 transition cursor-pointer"
                        title="Delete Fee Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFeeItems.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Tag className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No fee components match the active filter</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing your search terms or create a new fee item using the "+ Create Fee / Levy" button.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CLASS FEE SCHEDULES & BUNDLES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'class_schedules' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Standardized Academic Term Fee Schedules</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Class bundles automatically compile compulsory tuition, science laboratory, ICT LMS, and development levies into consolidated term invoices.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setIsScheduleBuilderModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Schedule Bundle</span>
              </button>

              <button
                onClick={() => setIsBatchSyncModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Apply to All Students</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSchedules.map((sched) => (
              <div
                key={sched.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                        {sched.classGrade}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800 uppercase">
                        {sched.studentType || 'Day'} Student
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Approved by Principal</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{sched.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{sched.notes || 'Official class fee bundle.'}</p>
                  </div>

                  {/* Bundled Items List */}
                  <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Bundled Components ({sched.feeItems.length} items):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {sched.feeItems.map((fi, idx) => (
                        <div key={`${fi.id}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                          <span className="text-slate-300 truncate max-w-[220px]">{fi.name}</span>
                          <span className="font-mono font-bold text-slate-200">₦{fi.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Base Invoice</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ₦{sched.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingSchedule(sched);
                        setIsScheduleBuilderModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Bundle</span>
                    </button>

                    <button
                      onClick={() => {
                        handleBatchSyncInvoices();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync {sched.classGrade}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SUNDRY PAYMENTS & EVENT PASSES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sundry_orders' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Sundry Payments, Excursions & Event Ingress Hub</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage non-tuition ad-hoc payments for excursions, club kits, WAEC registrations, sports kits, and issued event clearance passes.
              </p>
            </div>

            <button
              onClick={() => setIsSundryOrderModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>+ Generate Sundry Invoice</span>
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Order Ref & Date</th>
                    <th className="p-4">Student & Class</th>
                    <th className="p-4">Payment Item / Activity</th>
                    <th className="p-4 text-right">Amount (₦)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Receipt & Gateway</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredSundryPayments.map((order) => {
                    const catCfg = CATEGORY_LABELS[order.category] || CATEGORY_LABELS.sundry_special;

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <span className="font-mono font-bold text-white block">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{order.issuedAt}</span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-white block">{order.studentName}</span>
                          <span className="text-[10px] text-slate-400">{order.admissionNumber} • <strong className="text-emerald-400">{order.classGrade}</strong></span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                              {catCfg.label}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-200 block truncate max-w-[200px]">{order.feeItemName}</span>
                          {order.additionalDetails?.uniformSize && (
                            <span className="text-[10px] text-slate-400">Size: {order.additionalDetails.uniformSize}</span>
                          )}
                          {order.additionalDetails?.clubRole && (
                            <span className="text-[10px] text-slate-400">Role: {order.additionalDetails.clubRole}</span>
                          )}
                        </td>

                        <td className="p-4 text-right font-mono font-black text-sm text-emerald-400">
                          ₦{order.amount.toLocaleString()}
                        </td>

                        <td className="p-4 text-center">
                          {order.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>PAID</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>PENDING</span>
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {order.paymentStatus === 'paid' ? (
                            <div>
                              <span className="font-mono text-[10px] font-bold text-white block">{order.receiptNumber}</span>
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {order.paymentChannel?.replace('_', ' ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Awaiting Settlement</span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-1.5">
                          {order.paymentStatus === 'paid' ? (
                            <button
                              onClick={() => setSelectedSundryPass(order)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Event Pass</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  if (onOpenCheckoutForSundry) {
                                    onOpenCheckoutForSundry(order);
                                  } else {
                                    handleMarkSundryPaid(order, 'paystack');
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay Now</span>
                              </button>

                              <button
                                onClick={() => handleMarkSundryPaid(order, 'bank_transfer')}
                                className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                title="Mark as Paid via Bank Transfer"
                              >
                                <Check className="w-3 h-3 text-emerald-400" />
                              </button>
                            </>
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PRINCIPAL APPROVAL & BANK LEDGERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'principal_audit' && (
        <div className="space-y-6">
          {/* Institutional Statutory Stamp Certificate */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Principal Digital Fee Authorization Seal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cryptographically timestamped executive fee approvals for the current academic session.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
                Seal Hash: SEC-FEE-2026-T3-009A
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Executive Signatory</span>
                <div className="font-bold text-white text-sm">Dr. (Mrs.) Margaret Adebayo</div>
                <div className="text-xs text-emerald-400">Principal & Chief Executive Officer</div>
                <p className="text-[11px] text-slate-400 font-serif italic pt-1 border-t border-slate-800">
                  "Approved for enforcement across all JSS 1 - SS 3 branches for Academic Session 2025/2026."
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Enforcement Status</span>
                <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Published & Live in Parent Portal</span>
                </div>
                <div className="text-xs text-slate-400">Invoicing Synchronization: <strong className="text-white">Active</strong></div>
                <div className="text-xs text-slate-400">Discounts & Hardship Waivers: <strong className="text-white">Enabled</strong></div>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Designated Settlement Escrows</span>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between"><span>Operations (Tuition):</span><strong className="text-white font-mono">Access Bank</strong></div>
                  <div className="flex justify-between"><span>STEM & Lab практик:</span><strong className="text-white font-mono">Zenith Bank</strong></div>
                  <div className="flex justify-between"><span>CapEx Development:</span><strong className="text-white font-mono">First Bank</strong></div>
                  <div className="flex justify-between"><span>PTA Welfare Fund:</span><strong className="text-white font-mono">Zenith Bank</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: REVENUE IMPACT SIMULATOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fee_simulator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Principal Strategic Fee & Revenue Forecasting Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate the macroeconomic and operational revenue impact of fee adjustments, inflation subsidies, and student body growth before publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left Controls */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Policy Sliders</h4>

              {/* Tuition Adjustment Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-bold">Base Tuition Adjustment (%):</span>
                  <span className="font-mono font-black text-emerald-400">
                    {simulatedTuitionPercent > 0 ? `+${simulatedTuitionPercent}%` : `${simulatedTuitionPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  step="2"
                  value={simulatedTuitionPercent}
                  onChange={(e) => setSimulatedTuitionPercent(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-20% Concession</span>
                  <span>0% Current</span>
                  <span>+40% Escalation</span>
                </div>
              </div>

              {/* Enrollment Growth Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-bold">Projected Enrollment Intake (%):</span>
                  <span className="font-mono font-black text-teal-400">
                    {simulatedEnrollmentGrowth > 0 ? `+${simulatedEnrollmentGrowth}%` : `${simulatedEnrollmentGrowth}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="30"
                  step="5"
                  value={simulatedEnrollmentGrowth}
                  onChange={(e) => setSimulatedEnrollmentGrowth(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-10%</span>
                  <span>0% Current (380 Students)</span>
                  <span>+30%</span>
                </div>
              </div>
            </div>

            {/* Right Output Card */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Simulated Term Gross Ingress</span>
                {(() => {
                  const baseGross = 65740000;
                  const tuitionMultiplier = 1 + (simulatedTuitionPercent / 100);
                  const growthMultiplier = 1 + (simulatedEnrollmentGrowth / 100);
                  const simulatedGross = Math.round(baseGross * tuitionMultiplier * growthMultiplier);
                  const variance = simulatedGross - baseGross;

                  return (
                    <div className="space-y-3 mt-2">
                      <div className="text-3xl font-black text-emerald-300 font-mono">
                        ₦{simulatedGross.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Variance from Published Budget:</span>
                        <span className={`font-mono font-bold ${variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {variance >= 0 ? `+₦${variance.toLocaleString()}` : `-₦${Math.abs(variance).toLocaleString()}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                        Adjusting Senior Secondary base fees from ₦173,000 to approximately{' '}
                        <strong className="text-white font-mono">
                          ₦{Math.round(173000 * tuitionMultiplier).toLocaleString()}
                        </strong>{' '}
                        per term per student.
                      </p>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={() => {
                  setSimulatedTuitionPercent(0);
                  setSimulatedEnrollmentGrowth(0);
                  showToast('Simulation reset to baseline.');
                }}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition border border-slate-800 cursor-pointer"
              >
                Reset Simulation Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CREATE / EDIT FEE ITEM MODAL */}
      {/* ------------------------------------------------------------- */}
      {isCreateFeeItemModalOpen && (
        <FeeItemFormModal
          initialItem={editingFeeItem}
          onClose={() => {
            setIsCreateFeeItemModalOpen(false);
            setEditingFeeItem(null);
          }}
          onSave={handleSaveFeeItem}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: SCHEDULE BUILDER MODAL */}
      {/* ------------------------------------------------------------- */}
      {isScheduleBuilderModalOpen && (
        <ScheduleBuilderModal
          initialSchedule={editingSchedule}
          availableFeeItems={feeItems}
          onClose={() => {
            setIsScheduleBuilderModalOpen(false);
            setEditingSchedule(null);
          }}
          onSave={handleSaveSchedule}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: SUNDRY PAYMENT GENERATOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {isSundryOrderModalOpen && (
        <SundryOrderGeneratorModal
          feeItems={feeItems}
          students={INITIAL_STUDENTS}
          onClose={() => setIsSundryOrderModalOpen(false)}
          onSave={handleCreateSundryOrder}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: BATCH SYNC TO INVOICES MODAL */}
      {/* ------------------------------------------------------------- */}
      {isBatchSyncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Batch Apply Fee Schedules to Invoices</h3>
              </div>
              <button
                onClick={() => setIsBatchSyncModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will re-calculate all active student invoices for <strong className="text-white">{selectedAcademicSession} {selectedTerm}</strong> using the current Principal-approved class fee schedules.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Enrolled Invoices Affected:</span>
                <span className="font-bold text-white font-mono">{invoices.length} Student Invoices</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SS 2 Standard Invoice Target:</span>
                <span className="font-bold text-emerald-400 font-mono">₦{stats.ssDayFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>JSS 2 Standard Invoice Target:</span>
                <span className="font-bold text-teal-400 font-mono">₦{stats.jssDayFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Parent Notification Broadcast:</span>
                <span className="font-bold text-emerald-400">Automated SMS & Email</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBatchSyncModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSyncInvoices}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Apply School-Wide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: SUNDRY EVENT PASS / CLEARANCE SLIP */}
      {/* ------------------------------------------------------------- */}
      {selectedSundryPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                Official Event & Activity Pass
              </span>
              <button
                onClick={() => setSelectedSundryPass(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">{selectedSundryPass.feeItemName}</h3>
              <p className="text-xs text-slate-400">CurriculumFlow International College • Official Clearance Slip</p>
            </div>

            {/* QR and Details Card */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex justify-center py-2">
                <div className="p-3 bg-white rounded-2xl shadow-md">
                  <QrCode className="w-24 h-24 text-slate-950" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student Name:</span>
                  <strong className="text-white">{selectedSundryPass.studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admission Number:</span>
                  <span className="font-mono text-slate-200">{selectedSundryPass.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class Grade:</span>
                  <span className="font-bold text-emerald-400">{selectedSundryPass.classGrade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt Ref:</span>
                  <span className="font-mono font-bold text-white">{selectedSundryPass.receiptNumber || 'REC-SND-2026-01'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="font-mono font-bold text-emerald-400">₦{selectedSundryPass.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Gateway:</span>
                  <span className="capitalize text-slate-300">{selectedSundryPass.paymentChannel?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
              <button
                onClick={() => setSelectedSundryPass(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------
// SUBCOMPONENT: FEE ITEM FORM MODAL (CREATE / EDIT)
// -----------------------------------------------------------------
interface FeeItemFormModalProps {
  initialItem: FeeItem | null;
  onClose: () => void;
  onSave: (item: Partial<FeeItem>) => void;
}

const FeeItemFormModal: React.FC<FeeItemFormModalProps> = ({ initialItem, onClose, onSave }) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [code, setCode] = useState(initialItem?.code || '');
  const [category, setCategory] = useState<FeeCategory>(initialItem?.category || 'tuition');
  const [amount, setAmount] = useState<number>(initialItem?.amount || 15000);
  const [isCompulsory, setIsCompulsory] = useState<boolean>(initialItem?.isCompulsory ?? true);
  const [frequency, setFrequency] = useState(initialItem?.frequency || 'per_term');
  const [targetAudience, setTargetAudience] = useState(initialItem?.targetAudience || 'all_students');
  const [applicableGrades, setApplicableGrades] = useState<ClassGrade[]>(initialItem?.applicableGrades || ALL_GRADES);
  const [description, setDescription] = useState(initialItem?.description || '');
  const [designatedAccount, setDesignatedAccount] = useState(initialItem?.designatedAccount || 'School Operations Account - Access Bank (0092817345)');
  const [installmentEligible, setInstallmentEligible] = useState<boolean>(initialItem?.installmentEligible ?? true);
  const [dueDate, setDueDate] = useState(initialItem?.dueDate || '');
  const [tagsInput, setTagsInput] = useState((initialItem?.tags || []).join(', '));

  const toggleGrade = (g: ClassGrade) => {
    if (applicableGrades.includes(g)) {
      if (applicableGrades.length > 1) {
        setApplicableGrades(applicableGrades.filter(x => x !== g));
      }
    } else {
      setApplicableGrades([...applicableGrades, g]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave({
      name,
      code,
      category,
      amount,
      isCompulsory,
      frequency: frequency as any,
      targetAudience: targetAudience as any,
      applicableGrades,
      description,
      designatedAccount,
      installmentEligible,
      dueDate: dueDate || undefined,
      tags
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              {initialItem ? 'Edit Fee / Levy Component' : 'Create New Fee or Sundry Levy'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Name and Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-bold">Fee / Levy Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Secondary Tuition & Instruction"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Internal Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. TUI-SS-001"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 2: Category and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Fee Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeeCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="tuition">Tuition & Instructional Delivery</option>
                <option value="science_lab">Science, Robotics & Practical Lab</option>
                <option value="ict_lms">ICT, CBT Testing & Digital LMS</option>
                <option value="development_levy">Infrastructure & Facility CapEx</option>
                <option value="uniform_boarding">Hostel & Meal Catering Subscription</option>
                <option value="exam_fees">Standardized Exams (WAEC / NECO / BECE)</option>
                <option value="pta">PTA Welfare & Projects Levy</option>
                <option value="medical_insurance">Medical Clinic & Healthcare Retainer</option>
                <option value="transport">School Bus Transit Route</option>
                <option value="excursion">Educational Field Trip / Excursion</option>
                <option value="clubs_societies">Co-Curricular Clubs & Societies</option>
                <option value="sports_uniform">Uniforms, Blazers & Athletic Wear</option>
                <option value="graduation_valedictory">Valedictory & Gown Regalia</option>
                <option value="coaching_extramural">Evening Masterclasses & SAT/UTME</option>
                <option value="late_penalty">Late Registration Surcharge</option>
                <option value="sundry_special">General Special Sundry Levy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Fee Amount (₦ Naira) *</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-black text-emerald-400 text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 block font-serif italic">
                {numberToWordsNaira(amount)}
              </span>
            </div>
          </div>

          {/* Row 3: Compulsory Toggle & Billing Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="compulsoryCheck"
                checked={isCompulsory}
                onChange={(e) => setIsCompulsory(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="compulsoryCheck" className="text-slate-200 font-bold cursor-pointer">
                Compulsory Core Levy
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Recurrence</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
              >
                <option value="per_term">Per Term</option>
                <option value="annual_session">Annual Session</option>
                <option value="one_off_event">One-Off Event</option>
                <option value="on_demand">On-Demand / Ad-Hoc</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
              >
                <option value="all_students">All Students</option>
                <option value="day_only">Day Students Only</option>
                <option value="boarding_only">Boarding Students Only</option>
                <option value="specific_grades">Specific Grades</option>
                <option value="elective_club">Elective / Opt-in</option>
              </select>
            </div>
          </div>

          {/* Applicable Grades Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block">Applicable Class Levels</label>
            <div className="flex flex-wrap gap-2">
              {ALL_GRADES.map((g) => {
                const isSelected = applicableGrades.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Description & Line Item Justification</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the purpose of this fee component for parents and audit ledgers..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Settlement Account Ledger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Designated Revenue Escrow Account</label>
              <select
                value={designatedAccount}
                onChange={(e) => setDesignatedAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="School Operations Account - Access Bank (0092817345)">School Operations Account - Access Bank (0092817345)</option>
                <option value="STEM & Laboratories Escrow - Zenith Bank (1012938472)">STEM & Laboratories Escrow - Zenith Bank (1012938472)</option>
                <option value="Capital Development Fund - First Bank (2039485712)">Capital Development Fund - First Bank (2039485712)</option>
                <option value="PTA Executive Account - Zenith Bank (1019283746)">PTA Executive Account - Zenith Bank (1019283746)</option>
                <option value="National Examination Board Escrow - First Bank (2039485712)">National Examination Board Escrow - First Bank (2039485712)</option>
                <option value="Boarding & Catering Services - Zenith Bank (1012938472)">Boarding & Catering Services - Zenith Bank (1012938472)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Tags (Comma Separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. WAEC, Exam, Senior Secondary"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4" />
              <span>Save & Publish to Catalog</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// SUBCOMPONENT: SCHEDULE BUILDER MODAL
// -----------------------------------------------------------------
interface ScheduleBuilderModalProps {
  initialSchedule: FeeSchedule | null;
  availableFeeItems: FeeItem[];
  onClose: () => void;
  onSave: (sched: Partial<FeeSchedule>) => void;
}

const ScheduleBuilderModal: React.FC<ScheduleBuilderModalProps> = ({ initialSchedule, availableFeeItems, onClose, onSave }) => {
  const [name, setName] = useState(initialSchedule?.name || '');
  const [classGrade, setClassGrade] = useState<ClassGrade>(initialSchedule?.classGrade || 'SS 2');
  const [studentType, setStudentType] = useState<'day' | 'boarding' | 'all'>(initialSchedule?.studentType || 'day');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    initialSchedule?.feeItems.map(f => f.id) || availableFeeItems.filter(f => f.isCompulsory).map(f => f.id)
  );
  const [notes, setNotes] = useState(initialSchedule?.notes || '');

  const toggleItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(x => x !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const computedTotal = useMemo(() => {
    return availableFeeItems
      .filter(f => selectedItemIds.includes(f.id))
      .reduce((sum, f) => sum + f.amount, 0);
  }, [availableFeeItems, selectedItemIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalItems = availableFeeItems.filter(f => selectedItemIds.includes(f.id));
    onSave({
      name: name || `${classGrade} ${studentType === 'boarding' ? 'Boarding' : 'Standard Day'} Schedule`,
      classGrade,
      studentType,
      feeItems: finalItems,
      totalAmount: computedTotal,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              {initialSchedule ? 'Edit Class Fee Schedule Bundle' : 'Build New Class Fee Schedule'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-bold">Schedule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SS 2 Trinity Term Standard Day Schedule"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Target Grade</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value as ClassGrade)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {ALL_GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Student Residency Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="residency"
                  value="day"
                  checked={studentType === 'day'}
                  onChange={() => setStudentType('day')}
                  className="accent-indigo-500"
                />
                <span>Day Students Only</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="residency"
                  value="boarding"
                  checked={studentType === 'boarding'}
                  onChange={() => setStudentType('boarding')}
                  className="accent-indigo-500"
                />
                <span>Boarding Students (Includes Hostel/Meals)</span>
              </label>
            </div>
          </div>

          {/* Select Fee Components */}
          <div className="space-y-2">
            <label className="text-slate-300 font-bold block">Select Bundled Fee Components:</label>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 max-h-56 overflow-y-auto space-y-2 pr-1">
              {availableFeeItems.map((fi) => {
                const isSelected = selectedItemIds.includes(fi.id);
                return (
                  <div
                    key={fi.id}
                    onClick={() => toggleItem(fi.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-700/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded accent-indigo-500 pointer-events-none"
                      />
                      <div>
                        <span className="font-semibold block">{fi.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{fi.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">₦{fi.amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Preview */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Computed Term Base Fee:</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              ₦{computedTotal.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
            >
              <Check className="w-4 h-4" />
              <span>Save Fee Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// SUBCOMPONENT: SUNDRY ORDER GENERATOR MODAL
// -----------------------------------------------------------------
interface SundryOrderGeneratorModalProps {
  feeItems: FeeItem[];
  students: Student[];
  onClose: () => void;
  onSave: (order: Partial<SundryPaymentOrder>) => void;
}

const SundryOrderGeneratorModal: React.FC<SundryOrderGeneratorModalProps> = ({ feeItems, students, onClose, onSave }) => {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedFeeItemId, setSelectedFeeItemId] = useState(
    feeItems.find(f => !f.isCompulsory)?.id || feeItems[0]?.id || ''
  );
  const [customNote, setCustomNote] = useState('');
  const [uniformSize, setUniformSize] = useState('Medium (Standard)');

  const matchingFeeItem = feeItems.find(f => f.id === selectedFeeItemId);
  const matchingStudent = students.find(s => s.id === selectedStudentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedFeeItemId) return;

    onSave({
      studentId: selectedStudentId,
      feeItemId: selectedFeeItemId,
      additionalDetails: {
        uniformSize: matchingFeeItem?.category === 'sports_uniform' ? uniformSize : undefined,
        customNote: customNote || undefined
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Generate Student Sundry Invoice</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Pick Student */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Select Enrolled Student *</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.admissionNumber}) — {s.classGrade}
                </option>
              ))}
            </select>
          </div>

          {/* Pick Fee Item */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Select Payment / Activity Levy *</label>
            <select
              value={selectedFeeItemId}
              onChange={(e) => setSelectedFeeItemId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              {feeItems.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — ₦{f.amount.toLocaleString()} ({f.category.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic details */}
          {matchingFeeItem?.category === 'sports_uniform' && (
            <div className="space-y-1">
              <label className="text-slate-300 font-bold">Uniform / Kit Sizing</label>
              <select
                value={uniformSize}
                onChange={(e) => setUniformSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Small (Junior 12-14)">Small (Junior 12-14)</option>
                <option value="Medium (Standard)">Medium (Standard)</option>
                <option value="Large (Senior 16-18)">Large (Senior 16-18)</option>
                <option value="Extra Large (XL)">Extra Large (XL)</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-300 font-bold">Administrative Note / Remark</label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Registered for Space Center Science Excursion"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          {/* Total Card */}
          {matchingFeeItem && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Amount</span>
                <span className="text-xs text-slate-300">{matchingStudent?.fullName}</span>
              </div>
              <span className="text-lg font-black text-emerald-400 font-mono">
                ₦{matchingFeeItem.amount.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Create Order & Send Notice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
