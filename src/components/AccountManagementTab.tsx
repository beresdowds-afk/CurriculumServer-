import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  ClassGrade,
  Term,
  StudentInvoice,
  PaymentTransaction,
  OfficialReceipt,
  ReconciliationRecord,
  PaymentNotification,
  StudentAccountSummary,
  FeeItem,
  FeeSchedule,
  InvoiceStatus,
  PaymentChannel,
  InstallmentPolicy,
  StudentInstallmentAgreement,
  MonthlyRevenueBudgetData,
  AcademicTermBudgetSummary,
  SundryPaymentOrder
} from '../types';
import { 
  INITIAL_FEE_ITEMS,
  INITIAL_FEE_SCHEDULES,
  INITIAL_STUDENT_INVOICES,
  INITIAL_PAYMENT_TRANSACTIONS,
  INITIAL_OFFICIAL_RECEIPTS,
  INITIAL_RECONCILIATION_RECORDS,
  INITIAL_PAYMENT_NOTIFICATIONS,
  DEFAULT_INSTALLMENT_POLICY,
  INITIAL_STUDENT_AGREEMENTS,
  INITIAL_MONTHLY_REVENUE_BUDGET_DATA,
  INITIAL_ACADEMIC_TERM_BUDGET_SUMMARIES,
  INITIAL_SUNDRY_PAYMENTS,
  compileStudentAccountSummaries,
  generateVirtualNuban,
  numberToWordsNaira
} from '../data/bursaryAccountsData';
import { OfficialReceiptModal } from './OfficialReceiptModal';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';
import { InstallmentPolicyManager } from './InstallmentPolicyManager';
import { RevenueBudgetDashboard } from './RevenueBudgetDashboard';
import { FeesLeviesManagementPortal } from './FeesLeviesManagementPortal';
import { StudentPaymentHistoryView } from './StudentPaymentHistoryView';
import { 
  Building2, 
  CreditCard, 
  Smartphone, 
  FileText, 
  Receipt, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Printer, 
  Send, 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  Layers, 
  RefreshCw, 
  Check, 
  Copy, 
  DollarSign, 
  Tag, 
  Sliders, 
  Sparkles,
  QrCode,
  Eye,
  Mail,
  MessageSquare,
  AlertCircle,
  History
} from 'lucide-react';

interface AccountManagementTabProps {
  currentUser: UserProfile;
}

type BursarySubTab = 'revenue_budget' | 'ledgers' | 'student_payment_history' | 'invoices' | 'receipts' | 'installment_policy' | 'reconciliation' | 'notifications' | 'fee_schedules';

export const AccountManagementTab: React.FC<AccountManagementTabProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<BursarySubTab>('revenue_budget');
  const [selectedStudentIdForHistory, setSelectedStudentIdForHistory] = useState<string>('std-ss2-01');
  
  // Data State
  const [feeItems, setFeeItems] = useState<FeeItem[]>(INITIAL_FEE_ITEMS);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>(INITIAL_FEE_SCHEDULES);
  const [sundryPayments, setSundryPayments] = useState<SundryPaymentOrder[]>(INITIAL_SUNDRY_PAYMENTS);
  const [invoices, setInvoices] = useState<StudentInvoice[]>(INITIAL_STUDENT_INVOICES);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(INITIAL_PAYMENT_TRANSACTIONS);
  const [receipts, setReceipts] = useState<OfficialReceipt[]>(INITIAL_OFFICIAL_RECEIPTS);
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>(INITIAL_RECONCILIATION_RECORDS);
  const [notifications, setNotifications] = useState<PaymentNotification[]>(INITIAL_PAYMENT_NOTIFICATIONS);
  const [installmentPolicy, setInstallmentPolicy] = useState<InstallmentPolicy>(DEFAULT_INSTALLMENT_POLICY);
  const [agreements, setAgreements] = useState<StudentInstallmentAgreement[]>(INITIAL_STUDENT_AGREEMENTS);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyRevenueBudgetData[]>(INITIAL_MONTHLY_REVENUE_BUDGET_DATA);
  const [termSummaries, setTermSummaries] = useState<AcademicTermBudgetSummary[]>(INITIAL_ACADEMIC_TERM_BUDGET_SUMMARIES);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('ALL');

  // Active Modals
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<OfficialReceipt | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<StudentInvoice | null>(null);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState<boolean>(false);
  const [showReconcileMatchModal, setShowReconcileMatchModal] = useState<ReconciliationRecord | null>(null);
  const [showBroadcastNoticeModal, setShowBroadcastNoticeModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Invoice Form State
  const [newInvStudentName, setNewInvStudentName] = useState('Emeka Nnamdi');
  const [newInvAdmNo, setNewInvAdmNo] = useState('CF/2024/SS2/012');
  const [newInvClassGrade, setNewInvClassGrade] = useState<ClassGrade>('SS 2');
  const [newInvClassGroup, setNewInvClassGroup] = useState('SS 2 Science A');
  const [newInvParentName, setNewInvParentName] = useState('Dr. C. Nnamdi');
  const [newInvParentPhone, setNewInvParentPhone] = useState('+234 803 999 1122');
  const [newInvParentEmail, setNewInvParentEmail] = useState('c.nnamdi@gmail.com');
  const [newInvDiscount, setNewInvDiscount] = useState<number>(0);

  // Broadcast Notice Form State
  const [broadcastTarget, setBroadcastTarget] = useState<'all_debtors' | 'partially_paid' | 'all_parents'>('all_debtors');
  const [broadcastChannel, setBroadcastChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [broadcastMsg, setBroadcastMsg] = useState(
    'Dear Parent, this is a gentle reminder from CurriculumFlow Bursary regarding outstanding Term 3 school fees. Kindly settle before examination broadsheet clearance closes. Thank you.'
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compile student account summaries from invoices, transactions, and installment policy / agreements
  const studentAccounts = useMemo(() => {
    return compileStudentAccountSummaries(invoices, transactions, installmentPolicy, agreements);
  }, [invoices, transactions, installmentPolicy, agreements]);

  // Executive KPI Calculations
  const kpis = useMemo(() => {
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.totalDiscount), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    const paystackVol = transactions
      .filter(t => t.paymentChannel === 'paystack' && t.status === 'successful')
      .reduce((sum, t) => sum + t.amountPaid, 0);

    const opayVol = transactions
      .filter(t => t.paymentChannel === 'opay' && t.status === 'successful')
      .reduce((sum, t) => sum + t.amountPaid, 0);

    const bankTransferVol = transactions
      .filter(t => t.paymentChannel === 'bank_transfer' && t.status === 'successful')
      .reduce((sum, t) => sum + t.amountPaid, 0);

    const unallocatedCount = reconciliations.filter(r => r.status === 'unallocated_deposit').length;

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      paystackVol,
      opayVol,
      bankTransferVol,
      unallocatedCount
    };
  }, [invoices, transactions, reconciliations]);

  // Payment Success Handler from Checkout Modal
  const handlePaymentSuccess = (
    updatedInvoice: StudentInvoice,
    transaction: PaymentTransaction,
    receipt: OfficialReceipt,
    notification: PaymentNotification
  ) => {
    // 1. Update Invoices
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

    // 1b. Update Sundry Orders if applicable
    setSundryPayments(prev => prev.map(order => {
      if (order.orderNumber === updatedInvoice.invoiceNumber || updatedInvoice.id === `inv-sundry-${order.id}`) {
        return {
          ...order,
          paymentStatus: 'paid',
          paymentDate: transaction.paymentDate,
          receiptNumber: receipt.receiptNumber,
          transactionReference: transaction.transactionReference,
          paymentChannel: transaction.paymentChannel
        };
      }
      return order;
    }));

    // 2. Add Transaction
    setTransactions(prev => [transaction, ...prev]);

    // 3. Add Receipt
    setReceipts(prev => [receipt, ...prev]);

    // 4. Add Notification
    setNotifications(prev => [notification, ...prev]);

    // 5. Add Reconciliation entry
    const newRec: ReconciliationRecord = {
      id: `rec-rec-${Date.now()}`,
      settlementBatchId: `${transaction.paymentChannel.toUpperCase()}-BATCH-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      channel: transaction.paymentChannel,
      externalTransactionRef: transaction.transactionReference,
      studentId: transaction.studentId,
      studentName: transaction.studentName,
      admissionNumber: transaction.admissionNumber,
      invoiceId: transaction.invoiceId,
      invoiceNumber: transaction.invoiceNumber,
      grossAmount: transaction.amountPaid,
      processingFee: transaction.gatewayFee,
      netSettlementAmount: transaction.netAmount,
      status: 'auto_matched',
      bankSettlementRef: `AUTO-${transaction.transactionReference.slice(0, 12)}`,
      notes: `Instant ${transaction.paymentChannel.toUpperCase()} settlement reconciled to student ledger.`
    };
    setReconciliations(prev => [newRec, ...prev]);

    showToast(`Payment of ₦${transaction.amountPaid.toLocaleString()} confirmed! Receipt #${receipt.receiptNumber} generated.`);
  };

  // Open Checkout for Sundry Payment Order
  const handleOpenCheckoutForSundry = (order: SundryPaymentOrder) => {
    const sundryInvoice: StudentInvoice = {
      id: `inv-sundry-${order.id}`,
      invoiceNumber: order.orderNumber,
      studentId: order.studentId,
      studentName: order.studentName,
      admissionNumber: order.admissionNumber,
      classGrade: order.classGrade,
      classGroupId: `grp-${order.classGrade.toLowerCase().replace(/\s+/g, '')}`,
      classGroupName: `${order.classGrade} General`,
      parentName: order.parentName,
      parentPhone: order.parentPhone,
      parentEmail: order.parentEmail,
      academicSession: '2025/2026',
      term: 'Term 3',
      issueDate: order.issuedAt,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      lineItems: [
        {
          feeItemId: order.feeItemId,
          name: order.feeItemName,
          category: order.category,
          amount: order.amount,
          discountAmount: 0,
          netAmount: order.amount
        }
      ],
      totalAmount: order.amount,
      totalDiscount: 0,
      amountPaid: 0,
      balanceDue: order.amount,
      status: 'unpaid',
      qrCodeHash: `CF-${order.orderNumber}-SUNDRY-AUTH`,
      createdAt: order.issuedAt
    };
    setSelectedInvoiceForPayment(sundryInvoice);
  };

  // Create Single Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const activeSchedule = feeSchedules.find(s => s.classGrade === newInvClassGrade) || feeSchedules[0];
    const baseAmount = activeSchedule ? activeSchedule.totalAmount : 173000;
    const netAmount = Math.max(0, baseAmount - newInvDiscount);
    const invNum = `INV-2026-T3-${String(invoices.length + 1).padStart(3, '0')}`;

    const newInv: StudentInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      studentId: `std-custom-${Date.now()}`,
      studentName: newInvStudentName,
      admissionNumber: newInvAdmNo,
      classGrade: newInvClassGrade,
      classGroupId: `grp-${newInvClassGrade.toLowerCase().replace(/\s+/g, '')}`,
      classGroupName: newInvClassGroup,
      parentName: newInvParentName,
      parentEmail: newInvParentEmail,
      parentPhone: newInvParentPhone,
      term: 'Term 3',
      academicSession: '2025/2026',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '2026-05-30',
      lineItems: activeSchedule ? activeSchedule.feeItems.map(f => ({
        feeItemId: f.id,
        name: f.name,
        category: f.category,
        amount: f.amount,
        discountAmount: 0,
        netAmount: f.amount
      })) : [],
      totalAmount: baseAmount,
      totalDiscount: newInvDiscount,
      amountPaid: 0,
      balanceDue: netAmount,
      status: 'unpaid',
      qrCodeHash: `CF-${invNum}-AUTH-${Math.floor(1000 + Math.random() * 9000)}-UNPAID`,
      createdAt: new Date().toISOString()
    };

    setInvoices(prev => [newInv, ...prev]);
    setShowNewInvoiceModal(false);
    showToast(`New invoice #${invNum} generated for ${newInvStudentName}.`);
  };

  // Match Unallocated Deposit
  const handleMatchUnallocatedDeposit = (invoiceId: string) => {
    if (!showReconcileMatchModal) return;
    const targetInv = invoices.find(i => i.id === invoiceId);
    if (!targetInv) return;

    const amountToApply = Math.min(showReconcileMatchModal.grossAmount, targetInv.balanceDue);
    const newPaid = targetInv.amountPaid + amountToApply;
    const newBal = Math.max(0, targetInv.balanceDue - amountToApply);

    // Update invoice
    setInvoices(prev => prev.map(inv => {
      if (inv.id === targetInv.id) {
        return {
          ...inv,
          amountPaid: newPaid,
          balanceDue: newBal,
          status: newBal === 0 ? 'paid' : 'partially_paid',
          notes: `Unallocated bank deposit (${showReconcileMatchModal.externalTransactionRef}) matched by Bursar.`
        };
      }
      return inv;
    }));

    // Update reconciliation record
    setReconciliations(prev => prev.map(r => {
      if (r.id === showReconcileMatchModal.id) {
        return {
          ...r,
          status: 'manual_matched',
          studentId: targetInv.studentId,
          studentName: targetInv.studentName,
          admissionNumber: targetInv.admissionNumber,
          invoiceId: targetInv.id,
          invoiceNumber: targetInv.invoiceNumber,
          resolvedAt: new Date().toISOString(),
          resolvedBy: currentUser.name,
          notes: `Manually matched and applied to ${targetInv.studentName} (${targetInv.invoiceNumber}).`
        };
      }
      return r;
    }));

    // Generate Official Receipt
    const receiptNum = `REC-2026-T3-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReceipt: OfficialReceipt = {
      id: `rec-${Date.now()}`,
      receiptNumber: receiptNum,
      transactionId: `tx-${Date.now()}`,
      transactionReference: showReconcileMatchModal.externalTransactionRef,
      invoiceId: targetInv.id,
      invoiceNumber: targetInv.invoiceNumber,
      studentId: targetInv.studentId,
      studentName: targetInv.studentName,
      admissionNumber: targetInv.admissionNumber,
      classGrade: targetInv.classGrade,
      parentName: targetInv.parentName,
      parentPhone: targetInv.parentPhone,
      parentEmail: targetInv.parentEmail,
      amountInFigures: amountToApply,
      amountInWords: numberToWordsNaira(amountToApply),
      paymentChannel: showReconcileMatchModal.channel,
      paymentDate: showReconcileMatchModal.date,
      totalInvoiceAmount: targetInv.totalAmount,
      amountPaidThisTransaction: amountToApply,
      totalCumulativePaid: newPaid,
      balanceRemaining: newBal,
      authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
      qrVerificationCode: `CF-${receiptNum}-RECON-VERIFIED`,
      generatedAt: new Date().toISOString()
    };
    setReceipts(prev => [newReceipt, ...prev]);

    setShowReconcileMatchModal(null);
    showToast(`Unallocated deposit successfully reconciled to ${targetInv.studentName}!`);
  };

  // Broadcast Notice Handler
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    const targetedInvoices = invoices.filter(inv => {
      if (broadcastTarget === 'all_debtors') return inv.balanceDue > 0;
      if (broadcastTarget === 'partially_paid') return inv.status === 'partially_paid';
      return true;
    });

    const newNotifs: PaymentNotification[] = targetedInvoices.map((inv, idx) => ({
      id: `notif-bulk-${Date.now()}-${idx}`,
      type: broadcastChannel === 'both' ? 'sms' : broadcastChannel,
      recipient: broadcastChannel === 'email' ? inv.parentEmail : inv.parentPhone,
      recipientName: inv.parentName,
      studentName: `${inv.studentName} (${inv.classGrade})`,
      title: 'Fee Payment & Academic Clearance Reminder',
      message: `Dear ${inv.parentName}, outstanding balance for ${inv.studentName} is ₦${inv.balanceDue.toLocaleString()}. Please settle via Paystack/OPay virtual account (${generateVirtualNuban(inv.admissionNumber).accountNumber}).`,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      relatedInvoiceNumber: inv.invoiceNumber
    }));

    setNotifications(prev => [...newNotifs, ...prev]);
    setShowBroadcastNoticeModal(false);
    showToast(`Broadcast fee reminder sent to ${targetedInvoices.length} parents via ${broadcastChannel.toUpperCase()}!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Bursary Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Directorate of Bursary & Financial Administration</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">2025/2026 Session • Term 3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              School Billing, Accounts & PSP Payment Gateway
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Centralized financial operations managing fee schedules, student billing invoices, live Paystack & OPay payment channels, bank reconciliations, and instant e-receipt issuance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowBroadcastNoticeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Broadcast Fee Reminder</span>
            </button>

            <button
              onClick={() => setShowNewInvoiceModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Student Invoice</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          {/* Total Billed */}
          <div 
            onClick={() => setActiveSubTab('invoices')}
            className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Invoiced</span>
            <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
              ₦{kpis.totalBilled.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Term 3 Gross Billing</span>
          </div>

          {/* Total Collected */}
          <div 
            onClick={() => setActiveSubTab('revenue_budget')}
            className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 hover:border-emerald-500/60 cursor-pointer transition group"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
              <span>Total Revenue Collected</span>
              <TrendingUp className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-300 font-mono mt-0.5">
              ₦{kpis.totalCollected.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5 font-bold">{kpis.collectionRate}% • View Charts</span>
          </div>

          {/* Outstanding Balance */}
          <div 
            onClick={() => setActiveSubTab('ledgers')}
            className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 hover:border-rose-700 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Outstanding Receivables</span>
            <div className="text-base sm:text-lg font-black text-rose-300 font-mono mt-0.5">
              ₦{kpis.totalOutstanding.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-400/70 block mt-0.5">Pending Debtors</span>
          </div>

          {/* Paystack Ingress */}
          <div 
            onClick={() => setActiveSubTab('receipts')}
            className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 hover:border-cyan-700 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Paystack Online
            </span>
            <div className="text-base sm:text-lg font-black text-cyan-300 font-mono mt-0.5">
              ₦{kpis.paystackVol.toLocaleString()}
            </div>
            <span className="text-[10px] text-cyan-400/80 block mt-0.5">Card & USSD Ingress</span>
          </div>

          {/* OPay Ingress */}
          <div 
            onClick={() => setActiveSubTab('receipts')}
            className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-700/50 hover:border-emerald-600 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> OPay Business
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-300 font-mono mt-0.5">
              ₦{kpis.opayVol.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">Virtual Transfer & Wallet</span>
          </div>

          {/* Direct Bank Transfers */}
          <div 
            onClick={() => setActiveSubTab('receipts')}
            className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 hover:border-blue-700 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Bank Transfers
            </span>
            <div className="text-base sm:text-lg font-black text-blue-300 font-mono mt-0.5">
              ₦{kpis.bankTransferVol.toLocaleString()}
            </div>
            <span className="text-[10px] text-blue-400/80 block mt-0.5">Zenith / NIP Tellers</span>
          </div>

          {/* Unallocated Reconciliations */}
          <div 
            onClick={() => setActiveSubTab('reconciliation')}
            className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 hover:border-amber-700 cursor-pointer transition"
          >
            <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Unallocated Tellers
            </span>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono mt-0.5">
              {kpis.unallocatedCount} Deposit{kpis.unallocatedCount === 1 ? '' : 's'}
            </div>
            <span className="text-[10px] text-amber-400/80 block mt-0.5">Needs Bursar Match</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('revenue_budget')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'revenue_budget'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
              : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Revenue vs. Budget Recharts Dashboard</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            activeSubTab === 'revenue_budget'
              ? 'bg-slate-950 text-emerald-300'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            Live Charts
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledgers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'ledgers'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student Account Ledgers & Clearances ({studentAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('student_payment_history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'student_payment_history'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
              : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Student Payment History</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            activeSubTab === 'student_payment_history'
              ? 'bg-slate-950 text-emerald-300'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            Chronological Ledger
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>School Billing & Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'receipts'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Payment Transactions & Receipts ({receipts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('installment_policy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'installment_policy'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black ring-2 ring-amber-400'
              : 'bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 border border-amber-500/30'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Installment Policy & Hardship</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            activeSubTab === 'installment_policy'
              ? 'bg-slate-950 text-amber-300'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {installmentPolicy.tranches.length} Tranches
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'reconciliation'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Bank & PSP Reconciliation ({reconciliations.length})</span>
          {kpis.unallocatedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'notifications'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Payment Notifications ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fee_schedules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'fee_schedules'
              ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400'
              : 'bg-slate-900 text-emerald-400 hover:text-white hover:bg-slate-800 border border-emerald-500/30'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Principal Fees & Levies Portal</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            activeSubTab === 'fee_schedules'
              ? 'bg-slate-950 text-emerald-300'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {feeItems.length} Fees • {sundryPayments.length} Sundry
          </span>
        </button>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 0: VISUAL REVENUE COLLECTIONS VS PROJECTED BUDGET (RECHARTS) */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'revenue_budget' && (
        <RevenueBudgetDashboard
          currentUser={currentUser}
          monthlyRecords={monthlyRevenueData}
          termSummaries={termSummaries}
          onUpdateRecord={(updatedRec) => {
            setMonthlyRevenueData(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
            showToast('Monthly financial record updated!');
          }}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 1: STUDENT ACCOUNT LEDGERS & CLEARANCES */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'ledgers' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, admission number, or parent contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                aria-label="Filter by Class Grade"
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Class Grades</option>
                <option value="SS 2">SS 2</option>
                <option value="JSS 2">JSS 2</option>
                <option value="SS 3">SS 3</option>
                <option value="JSS 3">JSS 3</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                aria-label="Filter by Clearance Status"
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Clearance Statuses</option>
                <option value="fully_cleared">Fully Cleared (100%)</option>
                <option value="provisional_cleared">Provisional Clearance</option>
                <option value="blocked_debtor">Blocked Debtor</option>
              </select>
            </div>
          </div>

          {/* Student Ledgers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Student & Admission</th>
                    <th className="py-3.5 px-4">Class Group</th>
                    <th className="py-3.5 px-4">Parent & Contact</th>
                    <th className="py-3.5 px-4 text-right">Total Billed</th>
                    <th className="py-3.5 px-4 text-right">Total Paid</th>
                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                    <th className="py-3.5 px-4 text-center">Installment Plan & Next Due</th>
                    <th className="py-3.5 px-4 text-center">Academic Clearance</th>
                    <th className="py-3.5 px-4">Dedicated Virtual NUBAN</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {studentAccounts
                    .filter(acc => {
                      if (selectedGradeFilter !== 'ALL' && acc.classGrade !== selectedGradeFilter) return false;
                      if (selectedStatusFilter !== 'ALL' && acc.clearanceStatus !== selectedStatusFilter) return false;
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        return (
                          acc.studentName.toLowerCase().includes(q) ||
                          acc.admissionNumber.toLowerCase().includes(q) ||
                          acc.parentName.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((acc) => {
                      const activeInv = invoices.find(i => i.studentId === acc.studentId && i.balanceDue > 0);
                      const latestRec = receipts.find(r => r.studentId === acc.studentId);
                      const plan = acc.activeInstallmentPlan;

                      return (
                        <tr key={acc.studentId} className="hover:bg-slate-800/40 transition-all">
                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-xs">{acc.studentName}</div>
                            <span className="font-mono text-[11px] text-emerald-400">{acc.admissionNumber}</span>
                          </td>

                          {/* Class Group */}
                          <td className="py-3.5 px-4 font-semibold text-slate-300">
                            {acc.classGroupName}
                          </td>

                          {/* Parent Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">{acc.parentName}</div>
                            <span className="font-mono text-[10px] text-slate-400">{acc.parentPhone}</span>
                          </td>

                          {/* Total Billed */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            ₦{acc.totalBilled.toLocaleString()}
                          </td>

                          {/* Total Paid */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            ₦{acc.totalPaid.toLocaleString()}
                          </td>

                          {/* Balance Due */}
                          <td className="py-3.5 px-4 text-right font-mono font-black">
                            {acc.currentBalance === 0 ? (
                              <span className="text-emerald-400">₦0.00</span>
                            ) : (
                              <span className="text-rose-400">₦{acc.currentBalance.toLocaleString()}</span>
                            )}
                          </td>

                          {/* Installment Plan & Tranches */}
                          <td className="py-3.5 px-4 text-center">
                            {acc.currentBalance === 0 ? (
                              <span className="text-[10px] text-emerald-400 font-medium">All Tranches Settled</span>
                            ) : plan ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    plan.planType === 'custom_hardship_agreement'
                                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                      : 'bg-slate-800 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {plan.planType === 'custom_hardship_agreement' ? 'Hardship Plan' : 'Standard Policy'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    T{plan.completedTranches}/{plan.totalTranches}
                                  </span>
                                </div>
                                {plan.nextTrancheDueAmount > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    Next: <span className="text-amber-400 font-mono font-bold">₦{plan.nextTrancheDueAmount.toLocaleString()}</span> ({plan.nextTrancheDueDate})
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Lump Sum</span>
                            )}
                          </td>

                          {/* Academic Clearance Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {acc.clearanceStatus === 'fully_cleared' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>CLEARED (100%)</span>
                              </span>
                            )}
                            {acc.clearanceStatus === 'provisional_cleared' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>PROVISIONAL</span>
                              </span>
                            )}
                            {acc.clearanceStatus === 'blocked_debtor' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>DEBTOR BLOCKED</span>
                              </span>
                            )}
                          </td>

                          {/* Virtual NUBAN */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-bold text-white">{acc.virtualNubanAccount.accountNumber}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block">OPay / Wema Auto-Credit</span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedStudentIdForHistory(acc.studentId);
                                  setActiveSubTab('student_payment_history');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white font-bold text-[11px] transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                                title="View detailed chronological payment history, gateway transaction IDs, and pending balances"
                              >
                                <History className="w-3 h-3 text-emerald-400" />
                                <span>History</span>
                              </button>

                              {acc.currentBalance > 0 && activeInv ? (
                                <button
                                  onClick={() => setSelectedInvoiceForPayment(activeInv)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Pay online via Paystack, OPay, or Bank Transfer"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay</span>
                                </button>
                              ) : latestRec ? (
                                <button
                                  onClick={() => setSelectedReceiptForView(latestRec)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                                  title="View Official Receipt"
                                >
                                  <Receipt className="w-3 h-3 text-slate-400" />
                                  <span>Receipt</span>
                                </button>
                              ) : null}
                            </div>
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

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 1B: DETAILED STUDENT PAYMENT HISTORY & CHRONOLOGICAL LEDGER */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'student_payment_history' && (
        <StudentPaymentHistoryView
          currentUser={currentUser}
          studentAccounts={studentAccounts}
          invoices={invoices}
          transactions={transactions}
          receipts={receipts}
          sundryPayments={sundryPayments}
          agreements={agreements}
          installmentPolicy={installmentPolicy}
          initialSelectedStudentId={selectedStudentIdForHistory}
          onOpenReceipt={(rec) => setSelectedReceiptForView(rec)}
          onOpenCheckout={(inv) => setSelectedInvoiceForPayment(inv)}
          onDispatchNotification={(notif) => {
            setNotifications(prev => [notif, ...prev]);
          }}
          showToast={showToast}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 2: SCHOOL BILLING & INVOICES */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoices by invoice number, student, or parent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                aria-label="Filter Invoices by Status"
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Invoice Statuses</option>
                <option value="paid">Paid in Full</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid / Pending</option>
              </select>

              <button
                onClick={() => setShowNewInvoiceModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Invoice</span>
              </button>
            </div>
          </div>

          {/* Invoices List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices
              .filter(inv => {
                if (selectedStatusFilter !== 'ALL' && inv.status !== selectedStatusFilter) return false;
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  return (
                    inv.invoiceNumber.toLowerCase().includes(q) ||
                    inv.studentName.toLowerCase().includes(q) ||
                    inv.parentName.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map((inv) => {
                const isPaid = inv.status === 'paid';
                const isPartial = inv.status === 'partially_paid';

                return (
                  <div 
                    key={inv.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                  >
                    <div className="space-y-3">
                      {/* Invoice Top Header */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          {inv.invoiceNumber}
                        </span>

                        {isPaid && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            PAID IN FULL
                          </span>
                        )}
                        {isPartial && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-700">
                            PARTIALLY PAID
                          </span>
                        )}
                        {inv.status === 'unpaid' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-700">
                            UNPAID
                          </span>
                        )}
                      </div>

                      {/* Student & Parent Info */}
                      <div>
                        <h4 className="font-bold text-white text-sm">{inv.studentName}</h4>
                        <span className="text-xs text-slate-400">{inv.admissionNumber} • {inv.classGroupName}</span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Parent: <span className="text-slate-300 font-medium">{inv.parentName}</span> ({inv.parentPhone})
                        </div>
                      </div>

                      {/* Financial Figures Box */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Total Billed:</span>
                          <span className="text-slate-200">₦{inv.totalAmount.toLocaleString()}</span>
                        </div>
                        {inv.totalDiscount > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Scholarship / Discount:</span>
                            <span>-₦{inv.totalDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Amount Settled:</span>
                          <span className="text-emerald-400 font-bold">₦{inv.amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-sm font-black">
                          <span className="text-slate-300">Balance Due:</span>
                          <span className={inv.balanceDue === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            ₦{inv.balanceDue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Line Items Preview */}
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <span className="font-semibold text-slate-300 block">Line Items Breakdown:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                          {inv.lineItems.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="truncate">
                              {item.name}: ₦{item.amount.toLocaleString()}
                            </li>
                          ))}
                          {inv.lineItems.length > 3 && (
                            <li className="text-slate-500">+{inv.lineItems.length - 3} other items</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500">Due: {inv.dueDate}</span>

                      <div className="flex items-center gap-1.5">
                        {inv.balanceDue > 0 ? (
                          <button
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-md shadow-emerald-950/40 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay via PSP</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const rec = receipts.find(r => r.invoiceId === inv.id);
                              if (rec) setSelectedReceiptForView(rec);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 3: PAYMENT TRANSACTIONS & OFFICIAL RECEIPTS */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by receipt number, reference, or student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedChannelFilter}
              onChange={(e) => setSelectedChannelFilter(e.target.value)}
              aria-label="Filter Receipts by Payment Channel"
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Payment Channels</option>
              <option value="paystack">Paystack Gateway</option>
              <option value="opay">OPay Business</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
            </select>
          </div>

          {/* Receipts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Receipt #</th>
                    <th className="py-3.5 px-4">Student & Class</th>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Channel & Gateway</th>
                    <th className="py-3.5 px-4">Transaction Ref</th>
                    <th className="py-3.5 px-4 text-right">Amount Paid</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-center">Official Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {receipts
                    .filter(rec => {
                      if (selectedChannelFilter !== 'ALL' && rec.paymentChannel !== selectedChannelFilter) return false;
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        return (
                          rec.receiptNumber.toLowerCase().includes(q) ||
                          rec.transactionReference.toLowerCase().includes(q) ||
                          rec.studentName.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/50">
                            {rec.receiptNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{rec.studentName}</div>
                          <span className="text-[10px] text-slate-400">{rec.admissionNumber} • {rec.classGrade}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {rec.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          {rec.paymentChannel === 'paystack' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 w-fit">
                              <CreditCard className="w-3 h-3" /> Paystack
                            </span>
                          )}
                          {rec.paymentChannel === 'opay' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                              <Smartphone className="w-3 h-3" /> OPay Virtual
                            </span>
                          )}
                          {rec.paymentChannel === 'bank_transfer' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 w-fit">
                              <Building2 className="w-3 h-3" /> Bank Transfer
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[150px]" title={rec.transactionReference}>
                          {rec.transactionReference}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400">
                          ₦{rec.amountPaidThisTransaction.toLocaleString()}.00
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          {new Date(rec.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedReceiptForView(rec)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700 mx-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Print / View</span>
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

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 4: BANK & PSP RECONCILIATION AUDIT */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Automated Bank Settlement & Gateway Reconciliation Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically matches external bank settlements from Paystack, OPay, and Zenith NIP with school invoice ledgers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Reconciliation Accuracy:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                98.4% Matched
              </span>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Settlement Batch</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">External Ref</th>
                    <th className="py-3.5 px-4">Allocated Student</th>
                    <th className="py-3.5 px-4 text-right">Gross Amount</th>
                    <th className="py-3.5 px-4 text-right">Gateway Fee</th>
                    <th className="py-3.5 px-4 text-right">Net Settlement</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {reconciliations.map((rec) => {
                    const isUnallocated = rec.status === 'unallocated_deposit';

                    return (
                      <tr key={rec.id} className={`hover:bg-slate-800/40 transition-all ${isUnallocated ? 'bg-amber-950/20' : ''}`}>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {rec.settlementBatchId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{rec.date}</td>
                        <td className="py-3.5 px-4 font-semibold uppercase text-[11px]">
                          {rec.channel}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={rec.externalTransactionRef}>
                          {rec.externalTransactionRef}
                        </td>
                        <td className="py-3.5 px-4">
                          {rec.studentName ? (
                            <div>
                              <span className="font-bold text-white">{rec.studentName}</span>
                              <span className="text-[10px] text-emerald-400 block">{rec.invoiceNumber}</span>
                            </div>
                          ) : (
                            <span className="text-amber-400 font-bold italic">Unallocated Deposit</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                          ₦{rec.grossAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                          -₦{rec.processingFee.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400">
                          ₦{rec.netSettlementAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {rec.status === 'auto_matched' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              AUTO MATCHED
                            </span>
                          )}
                          {rec.status === 'manual_matched' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700">
                              MANUAL MATCHED
                            </span>
                          )}
                          {rec.status === 'unallocated_deposit' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                              UNALLOCATED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isUnallocated ? (
                            <button
                              onClick={() => setShowReconcileMatchModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Match Student</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Reconciled</span>
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

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 5: PAYMENT NOTIFICATIONS DISPATCH LOG */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Multi-Channel Parent Payment & Receipt Notification Tracker</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time delivery logs for SMS payment receipts, automated PDF email statements, and fee debt reminders.
              </p>
            </div>

            <button
              onClick={() => setShowBroadcastNoticeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send New Broadcast</span>
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    notif.type === 'sms' 
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' 
                      : 'bg-blue-950/80 text-blue-400 border-blue-800'
                  }`}>
                    {notif.type === 'sms' ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {notif.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Recipient: <strong className="text-slate-200">{notif.recipientName}</strong> ({notif.recipient}) • Student: {notif.studentName}
                    </div>
                    <p className="text-slate-300 italic pt-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 font-serif">
                      "{notif.message}"
                    </p>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-1 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>DELIVERED</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(notif.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB 6: PRINCIPAL FEES & LEVIES MANAGEMENT PORTAL */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'fee_schedules' && (
        <FeesLeviesManagementPortal
          currentUser={currentUser}
          feeItems={feeItems}
          onUpdateFeeItems={(items) => {
            setFeeItems(items);
            showToast('School fee catalog updated and published!');
          }}
          feeSchedules={feeSchedules}
          onUpdateFeeSchedules={(scheds) => {
            setFeeSchedules(scheds);
            showToast('Class fee schedules updated!');
          }}
          sundryPayments={sundryPayments}
          onUpdateSundryPayments={(orders) => {
            setSundryPayments(orders);
            showToast('Sundry payments registry updated!');
          }}
          invoices={invoices}
          onUpdateInvoices={(invs) => {
            setInvoices(invs);
            showToast('Student billing invoices updated!');
          }}
          onDispatchNotification={(notif) => {
            setNotifications(prev => [notif, ...prev]);
          }}
          onOpenCheckoutForSundry={handleOpenCheckoutForSundry}
          showToast={showToast}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* SUBTAB: PRINCIPAL INSTALLMENT PAYMENT POLICY & CONCESSIONS */}
      {/* --------------------------------------------------------------- */}
      {activeSubTab === 'installment_policy' && (
        <InstallmentPolicyManager
          currentUser={currentUser}
          policy={installmentPolicy}
          onUpdatePolicy={(newPolicy) => {
            setInstallmentPolicy(newPolicy);
            showToast('Principal Installment Payment Policy updated school-wide!');
          }}
          agreements={agreements}
          onUpdateAgreements={(newAgreements) => {
            setAgreements(newAgreements);
            showToast('Student installment hardship agreements updated!');
          }}
          invoices={invoices}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 1: OFFICIAL PRINTABLE RECEIPT MODAL */}
      {/* --------------------------------------------------------------- */}
      {selectedReceiptForView && (
        <OfficialReceiptModal
          receipt={selectedReceiptForView}
          onClose={() => setSelectedReceiptForView(null)}
          onShareNotification={(rec) => {
            const newNotif: PaymentNotification = {
              id: `notif-share-${Date.now()}`,
              type: 'sms',
              recipient: rec.parentPhone,
              recipientName: rec.parentName,
              studentName: `${rec.studentName} (${rec.classGrade})`,
              title: 'Official School E-Receipt Re-dispatched',
              message: `Official Receipt #${rec.receiptNumber} for ${rec.studentName} (₦${rec.amountPaidThisTransaction.toLocaleString()}) has been sent. Balance: ₦${rec.balanceRemaining.toLocaleString()}.`,
              timestamp: new Date().toISOString(),
              status: 'delivered',
              relatedReceiptNumber: rec.receiptNumber,
              relatedInvoiceNumber: rec.invoiceNumber
            };
            setNotifications(prev => [newNotif, ...prev]);
            showToast(`Official Receipt #${rec.receiptNumber} dispatched to parent via SMS!`);
          }}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 2: PAYMENT CHECKOUT MODAL (PAYSTACK / OPAY / BANK) */}
      {/* --------------------------------------------------------------- */}
      {selectedInvoiceForPayment && (
        <PaymentCheckoutModal
          invoice={selectedInvoiceForPayment}
          installmentPolicy={installmentPolicy}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onPaymentSuccess={(updatedInv, tx, rec, notif) => {
            handlePaymentSuccess(updatedInv, tx, rec, notif);
          }}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 3: GENERATE NEW STUDENT INVOICE */}
      {/* --------------------------------------------------------------- */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Generate Student Term Billing Invoice</span>
              </h3>
              <button 
                onClick={() => setShowNewInvoiceModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newInvStudentName}
                  onChange={(e) => setNewInvStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Admission Number</label>
                  <input
                    type="text"
                    required
                    value={newInvAdmNo}
                    onChange={(e) => setNewInvAdmNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Class Grade</label>
                  <select
                    value={newInvClassGrade}
                    onChange={(e) => setNewInvClassGrade(e.target.value as ClassGrade)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="SS 1">SS 1</option>
                    <option value="SS 2">SS 2</option>
                    <option value="SS 3">SS 3</option>
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={newInvParentName}
                    onChange={(e) => setNewInvParentName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Parent Phone</label>
                  <input
                    type="text"
                    required
                    value={newInvParentPhone}
                    onChange={(e) => setNewInvParentPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Scholarship / Bursary Waiver (₦)</label>
                <input
                  type="number"
                  value={newInvDiscount}
                  onChange={(e) => setNewInvDiscount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Create & Dispatch Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 4: MATCH UNALLOCATED BANK DEPOSIT */}
      {/* --------------------------------------------------------------- */}
      {showReconcileMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Reconcile & Allocate Bank Deposit to Student</span>
              </h3>
              <button 
                onClick={() => setShowReconcileMatchModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs space-y-1">
              <span className="font-bold text-amber-300 block">Unallocated Deposit Reference:</span>
              <div className="font-mono text-white font-black text-sm">
                ₦{showReconcileMatchModal.grossAmount.toLocaleString()}.00 • {showReconcileMatchModal.externalTransactionRef}
              </div>
              <p className="text-slate-400 text-[11px]">{showReconcileMatchModal.notes}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Select Pending Student Invoice to Match:
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-2 bg-slate-950">
                {invoices
                  .filter(inv => inv.balanceDue > 0)
                  .map((inv) => (
                    <div 
                      key={inv.id}
                      onClick={() => handleMatchUnallocatedDeposit(inv.id)}
                      className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{inv.studentName} ({inv.admissionNumber})</div>
                        <span className="text-[10px] text-slate-400">{inv.classGroupName} • Invoice {inv.invoiceNumber}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 block">Outstanding Due:</span>
                        <span className="font-black text-rose-400 text-xs">₦{inv.balanceDue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowReconcileMatchModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL 5: BROADCAST FEE REMINDER SMS / EMAIL */}
      {/* --------------------------------------------------------------- */}
      {showBroadcastNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Broadcast Parent Fee Clearance Reminder</span>
              </h3>
              <button 
                onClick={() => setShowBroadcastNoticeModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Recipient Group</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="all_debtors">All Students with Pending Balances (Debtors)</option>
                  <option value="partially_paid">Partially Paid Students Only</option>
                  <option value="all_parents">All Enrolled Parents & Guardians</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Dispatch Channel</label>
                <select
                  value={broadcastChannel}
                  onChange={(e) => setBroadcastChannel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="sms">SMS Text Alert to Parent Mobile</option>
                  <option value="email">Email Notification with PDF Invoice Link</option>
                  <option value="both">Both SMS and Email Channels</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notice Template</label>
                <textarea
                  rows={4}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-serif"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBroadcastNoticeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Dispatch Notifications Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
