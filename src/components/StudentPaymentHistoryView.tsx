import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  StudentInvoice, 
  PaymentTransaction, 
  OfficialReceipt, 
  StudentAccountSummary,
  SundryPaymentOrder,
  StudentInstallmentAgreement,
  InstallmentPolicy,
  ClassGrade,
  PaymentNotification
} from '../types';
import { 
  numberToWordsNaira, 
  generateVirtualNuban,
  DEFAULT_INSTALLMENT_POLICY
} from '../data/bursaryAccountsData';
import { INITIAL_STUDENTS } from '../data/schoolManagementData';
import { 
  Search, 
  Filter, 
  CreditCard, 
  Receipt, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Download, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  QrCode, 
  Eye, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Layers, 
  Tag, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Sparkles, 
  ChevronRight,
  BookOpen,
  Sliders,
  Plus,
  FileCheck,
  AlertCircle,
  Lock,
  Unlock,
  ArrowRight,
  Percent,
  Award
} from 'lucide-react';

interface StudentPaymentHistoryViewProps {
  currentUser: UserProfile;
  studentAccounts: StudentAccountSummary[];
  invoices: StudentInvoice[];
  transactions: PaymentTransaction[];
  receipts: OfficialReceipt[];
  sundryPayments: SundryPaymentOrder[];
  agreements: StudentInstallmentAgreement[];
  installmentPolicy: InstallmentPolicy;
  initialSelectedStudentId?: string;
  onOpenReceipt: (receipt: OfficialReceipt) => void;
  onOpenCheckout: (invoice: StudentInvoice) => void;
  onDispatchNotification: (notif: PaymentNotification) => void;
  showToast: (msg: string) => void;
}

// Unified Ledger Entry Interface
export interface UnifiedLedgerItem {
  id: string;
  type: 'invoice_billed' | 'payment_received' | 'sundry_order' | 'discount_applied' | 'penalty_surcharge';
  date: string;
  title: string;
  category: string;
  session: string;
  term: string;
  debitAmount: number; // Amount billed / added
  creditAmount: number; // Amount paid / deducted
  runningBalance: number; // Balance after this entry
  paymentStatus: 'successful' | 'partially_paid' | 'pending' | 'overdue';
  paymentChannel?: string;
  transactionReference?: string;
  gatewayPspReference?: string;
  receiptNumber?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  qrCodeHash?: string;
  sourceInvoiceId?: string;
  sourceTransactionId?: string;
  sourceReceiptId?: string;
  sourceSundryId?: string;
}

export const StudentPaymentHistoryView: React.FC<StudentPaymentHistoryViewProps> = ({
  currentUser,
  studentAccounts,
  invoices,
  transactions,
  receipts,
  sundryPayments,
  agreements,
  installmentPolicy,
  initialSelectedStudentId,
  onOpenReceipt,
  onOpenCheckout,
  onDispatchNotification,
  showToast
}) => {
  // 1. Selected Student State
  const defaultStudentId = initialSelectedStudentId || (studentAccounts.length > 0 ? studentAccounts[0].studentId : 'std-ss2-01');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedClearanceFilter, setSelectedClearanceFilter] = useState<string>('ALL');

  // 2. Ledger View Filters
  const [historyTab, setHistoryTab] = useState<'all_ledger' | 'installments' | 'sundry_levies' | 'printable_statement'>('all_ledger');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('ALL');
  const [termFilter, setTermFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Copy feedback state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Send statement modal state
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [sendChannel, setSendChannel] = useState<'sms' | 'email' | 'both'>('both');
  const [customMessage, setCustomMessage] = useState('');

  // Handle copy reference
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  // Resolve All Available Students (merging accounts with school management students)
  const allStudentsList = useMemo(() => {
    const studentMap = new Map<string, {
      id: string;
      name: string;
      admissionNumber: string;
      classGrade: ClassGrade;
      classGroupName: string;
      parentName: string;
      parentPhone: string;
      parentEmail: string;
      clearanceStatus?: string;
      balance?: number;
    }>();

    // Add from student accounts
    studentAccounts.forEach(acc => {
      studentMap.set(acc.studentId, {
        id: acc.studentId,
        name: acc.studentName,
        admissionNumber: acc.admissionNumber,
        classGrade: acc.classGrade,
        classGroupName: acc.classGroupName,
        parentName: acc.parentName,
        parentPhone: acc.parentPhone,
        parentEmail: acc.parentEmail,
        clearanceStatus: acc.clearanceStatus,
        balance: acc.currentBalance
      });
    });

    // Add from INITIAL_STUDENTS if not present
    INITIAL_STUDENTS.forEach(stu => {
      if (!studentMap.has(stu.id)) {
        studentMap.set(stu.id, {
          id: stu.id,
          name: stu.fullName,
          admissionNumber: stu.admissionNumber,
          classGrade: stu.classGrade,
          classGroupName: stu.classGroupName,
          parentName: stu.parentName,
          parentPhone: stu.parentPhone,
          parentEmail: stu.parentEmail,
          clearanceStatus: 'blocked_debtor',
          balance: 0
        });
      }
    });

    return Array.from(studentMap.values());
  }, [studentAccounts]);

  // Filtered Students for the Search / Selection dropdown
  const filteredStudents = useMemo(() => {
    return allStudentsList.filter(stu => {
      if (selectedGradeFilter !== 'ALL' && stu.classGrade !== selectedGradeFilter) return false;
      if (selectedClearanceFilter !== 'ALL' && stu.clearanceStatus !== selectedClearanceFilter) return false;
      if (searchStudentQuery) {
        const q = searchStudentQuery.toLowerCase();
        return (
          stu.name.toLowerCase().includes(q) ||
          stu.admissionNumber.toLowerCase().includes(q) ||
          stu.parentName.toLowerCase().includes(q) ||
          stu.classGroupName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allStudentsList, selectedGradeFilter, selectedClearanceFilter, searchStudentQuery]);

  // Currently Selected Student Data
  const currentStudent = useMemo(() => {
    const found = allStudentsList.find(s => s.id === selectedStudentId);
    if (found) return found;
    return allStudentsList[0] || {
      id: 'std-ss2-01',
      name: 'Chinedu Eze',
      admissionNumber: 'CF/2024/SS2/001',
      classGrade: 'SS 2' as ClassGrade,
      classGroupName: 'SS 2 Science A',
      parentName: 'Chief O. Eze',
      parentPhone: '+234 807 444 5566',
      parentEmail: 'bursar@curriculumflow.edu.ng',
      clearanceStatus: 'fully_cleared',
      balance: 0
    };
  }, [allStudentsList, selectedStudentId]);

  // Student Account Summary
  const currentAccountSummary = useMemo(() => {
    return studentAccounts.find(a => a.studentId === currentStudent.id || a.admissionNumber === currentStudent.admissionNumber);
  }, [studentAccounts, currentStudent]);

  // Virtual NUBAN Account
  const studentVirtualNuban = useMemo(() => {
    if (currentAccountSummary?.virtualNubanAccount) {
      return currentAccountSummary.virtualNubanAccount;
    }
    return generateVirtualNuban(currentStudent.admissionNumber);
  }, [currentAccountSummary, currentStudent]);

  // Student's Invoices
  const studentInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.studentId === currentStudent.id || 
      inv.admissionNumber === currentStudent.admissionNumber ||
      inv.studentName.toLowerCase() === currentStudent.name.toLowerCase()
    );
  }, [invoices, currentStudent]);

  // Student's Payment Transactions
  const studentTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.studentId === currentStudent.id || 
      tx.admissionNumber === currentStudent.admissionNumber ||
      tx.studentName.toLowerCase() === currentStudent.name.toLowerCase()
    );
  }, [transactions, currentStudent]);

  // Student's Official Receipts
  const studentReceipts = useMemo(() => {
    return receipts.filter(rc => 
      rc.studentId === currentStudent.id || 
      rc.admissionNumber === currentStudent.admissionNumber ||
      rc.studentName.toLowerCase() === currentStudent.name.toLowerCase()
    );
  }, [receipts, currentStudent]);

  // Student's Sundry Payments
  const studentSundryOrders = useMemo(() => {
    return sundryPayments.filter(sn => 
      sn.studentId === currentStudent.id || 
      sn.admissionNumber === currentStudent.admissionNumber ||
      sn.studentName.toLowerCase() === currentStudent.name.toLowerCase()
    );
  }, [sundryPayments, currentStudent]);

  // Student's Installment Agreement (if any)
  const studentAgreement = useMemo(() => {
    return agreements.find(ag => 
      ag.studentId === currentStudent.id || 
      ag.admissionNumber === currentStudent.admissionNumber ||
      ag.studentName.toLowerCase() === currentStudent.name.toLowerCase()
    );
  }, [agreements, currentStudent]);

  // Build Comprehensive Chronological Unified Ledger
  const rawLedgerItems = useMemo(() => {
    const items: UnifiedLedgerItem[] = [];

    // 1. Add Invoices as Debit Entries
    studentInvoices.forEach(inv => {
      // Main invoice summary
      items.push({
        id: `bill-${inv.id}`,
        type: 'invoice_billed',
        date: inv.issueDate || inv.createdAt.split('T')[0],
        title: `Term Bill: ${inv.classGroupName} (${inv.term} - ${inv.academicSession})`,
        category: 'Term Fees & Tuition Bundle',
        session: inv.academicSession,
        term: inv.term,
        debitAmount: inv.totalAmount,
        creditAmount: 0,
        runningBalance: 0, // Will be computed after sorting
        paymentStatus: inv.status === 'paid' ? 'successful' : inv.status === 'partially_paid' ? 'partially_paid' : 'pending',
        notes: inv.notes || `Invoice #${inv.invoiceNumber} covering tuition, ICT LMS, and laboratories.`,
        qrCodeHash: inv.qrCodeHash,
        sourceInvoiceId: inv.id
      });

      // If discount exists
      if (inv.totalDiscount > 0) {
        items.push({
          id: `disc-${inv.id}`,
          type: 'discount_applied',
          date: inv.issueDate || inv.createdAt.split('T')[0],
          title: `Approved Scholarship / Merit Tuition Rebate (${inv.invoiceNumber})`,
          category: 'Institutional Discount / Concession',
          session: inv.academicSession,
          term: inv.term,
          debitAmount: 0,
          creditAmount: inv.totalDiscount,
          runningBalance: 0,
          paymentStatus: 'successful',
          notes: `Principal Academic Concession applied on Invoice #${inv.invoiceNumber}.`,
          sourceInvoiceId: inv.id
        });
      }
    });

    // 2. Add Payment Transactions as Credit Entries
    studentTransactions.forEach(tx => {
      items.push({
        id: `pay-${tx.id}`,
        type: 'payment_received',
        date: tx.paymentDate.split('T')[0],
        title: `Payment Received: ${tx.invoiceNumber} (${tx.paymentChannel.toUpperCase()})`,
        category: 'Fee Payment Settlement',
        session: '2025/2026',
        term: 'Term 3',
        debitAmount: 0,
        creditAmount: tx.amountPaid,
        runningBalance: 0,
        paymentStatus: tx.status === 'successful' ? 'successful' : 'pending',
        paymentChannel: tx.paymentChannel,
        transactionReference: tx.transactionReference,
        gatewayPspReference: tx.channelDetails.pspReference || tx.channelDetails.tellerNumber || tx.channelDetails.virtualAccountNumber,
        receiptNumber: tx.receiptNumber,
        verifiedBy: tx.verifiedBy,
        verifiedAt: tx.verifiedAt,
        notes: tx.notes || `Processed via ${tx.paymentChannel}. Verified reference: ${tx.transactionReference}.`,
        sourceTransactionId: tx.id,
        sourceReceiptId: tx.receiptNumber
      });
    });

    // 3. Add Sundry Orders
    studentSundryOrders.forEach(snd => {
      const isPaid = snd.paymentStatus === 'paid';
      items.push({
        id: `snd-${snd.id}`,
        type: 'sundry_order',
        date: snd.issuedAt,
        title: `Sundry Levy: ${snd.feeItemName}`,
        category: snd.category.replace('_', ' ').toUpperCase(),
        session: '2025/2026',
        term: 'Term 3',
        debitAmount: snd.amount,
        creditAmount: isPaid ? snd.amount : 0,
        runningBalance: 0,
        paymentStatus: isPaid ? 'successful' : 'pending',
        paymentChannel: snd.paymentChannel,
        transactionReference: snd.transactionReference,
        receiptNumber: snd.receiptNumber,
        notes: `Issued by ${snd.issuedBy}. Order #${snd.orderNumber}. ${snd.additionalDetails?.customNote || ''}`,
        sourceSundryId: snd.id
      });
    });

    // Sort chronologically ascending to compute running balances correctly
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    items.forEach(item => {
      running += (item.debitAmount - item.creditAmount);
      item.runningBalance = Math.max(0, running);
    });

    return items;
  }, [studentInvoices, studentTransactions, studentSundryOrders]);

  // Filtered & Sorted Ledger Items
  const displayedLedgerItems = useMemo(() => {
    let result = [...rawLedgerItems];

    if (sessionFilter !== 'ALL') {
      result = result.filter(item => item.session === sessionFilter);
    }
    if (termFilter !== 'ALL') {
      result = result.filter(item => item.term === termFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(item => item.paymentStatus === statusFilter);
    }
    if (channelFilter !== 'ALL') {
      result = result.filter(item => item.paymentChannel === channelFilter);
    }
    if (ledgerSearchQuery) {
      const q = ledgerSearchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.transactionReference && item.transactionReference.toLowerCase().includes(q)) ||
        (item.gatewayPspReference && item.gatewayPspReference.toLowerCase().includes(q)) ||
        (item.receiptNumber && item.receiptNumber.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [rawLedgerItems, sessionFilter, termFilter, statusFilter, channelFilter, ledgerSearchQuery, sortOrder]);

  // Executive KPI Computations
  const totalBilledLifetime = useMemo(() => {
    return rawLedgerItems.reduce((acc, it) => acc + it.debitAmount, 0);
  }, [rawLedgerItems]);

  const totalPaidLifetime = useMemo(() => {
    return rawLedgerItems.reduce((acc, it) => acc + it.creditAmount, 0);
  }, [rawLedgerItems]);

  const currentOutstandingBalance = useMemo(() => {
    return Math.max(0, totalBilledLifetime - totalPaidLifetime);
  }, [totalBilledLifetime, totalPaidLifetime]);

  const collectionRatePercent = useMemo(() => {
    if (totalBilledLifetime === 0) return 100;
    return Math.min(100, Math.round((totalPaidLifetime / totalBilledLifetime) * 100));
  }, [totalBilledLifetime, totalPaidLifetime]);

  const mostRecentTransaction = useMemo(() => {
    if (studentTransactions.length === 0) return null;
    const sorted = [...studentTransactions].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return sorted[0];
  }, [studentTransactions]);

  // Detailed Installment Tranche Calculations & Progress Tracker
  const installmentProgressData = useMemo(() => {
    // Determine active plan name
    const planName = studentAgreement?.agreedPlanType === 'custom_hardship_plan' 
      ? 'Principal Approved Hardship Concession Plan'
      : installmentPolicy.policyName || 'Standard 50-30-20 Termly Installment Plan';

    const tranches = installmentPolicy.tranches || [];
    let runningRequired = 0;

    const computedTranches = tranches.map((tranche, idx) => {
      const trancheTargetAmount = Math.round((totalBilledLifetime * tranche.percentage) / 100);
      const startPercent = runningRequired;
      const endPercent = runningRequired + tranche.percentage;
      const startAmount = Math.round((totalBilledLifetime * startPercent) / 100);
      const endAmount = Math.round((totalBilledLifetime * endPercent) / 100);
      runningRequired = endPercent;

      // How much has been paid towards this specific tranche?
      let paidForTranche = 0;
      if (totalPaidLifetime >= endAmount) {
        paidForTranche = trancheTargetAmount;
      } else if (totalPaidLifetime > startAmount) {
        paidForTranche = totalPaidLifetime - startAmount;
      } else {
        paidForTranche = 0;
      }

      const balanceForTranche = Math.max(0, trancheTargetAmount - paidForTranche);
      const trancheProgressPercent = trancheTargetAmount > 0 
        ? Math.min(100, Math.round((paidForTranche / trancheTargetAmount) * 100))
        : 100;

      const isFullySettled = paidForTranche >= trancheTargetAmount;
      const isPartiallyPaid = paidForTranche > 0 && !isFullySettled;
      const isNextDue = !isFullySettled && (idx === 0 || totalPaidLifetime >= startAmount);
      const isLocked = !isFullySettled && !isPartiallyPaid && !isNextDue;

      return {
        ...tranche,
        idx,
        trancheTargetAmount,
        startPercent,
        endPercent,
        startAmount,
        endAmount,
        paidForTranche,
        balanceForTranche,
        trancheProgressPercent,
        isFullySettled,
        isPartiallyPaid,
        isNextDue,
        isLocked
      };
    });

    const completedTranchesCount = computedTranches.filter(t => t.isFullySettled).length;
    const nextDueTranche = computedTranches.find(t => !t.isFullySettled);

    return {
      planName,
      tranches: computedTranches,
      completedTranchesCount,
      totalTranchesCount: tranches.length,
      nextDueTranche
    };
  }, [studentAgreement, installmentPolicy, totalBilledLifetime, totalPaidLifetime]);

  // Handle Find Receipt to View
  const handleViewReceiptByNumber = (recNo?: string) => {
    if (!recNo) return;
    const found = receipts.find(r => r.receiptNumber === recNo);
    if (found) {
      onOpenReceipt(found);
    } else {
      // Create synthetic receipt from transaction if found
      const tx = transactions.find(t => t.receiptNumber === recNo);
      if (tx) {
        const syntheticReceipt: OfficialReceipt = {
          id: `rec-syn-${tx.id}`,
          receiptNumber: tx.receiptNumber,
          transactionId: tx.id,
          transactionReference: tx.transactionReference,
          invoiceId: tx.invoiceId,
          invoiceNumber: tx.invoiceNumber,
          studentId: tx.studentId,
          studentName: tx.studentName,
          admissionNumber: tx.admissionNumber,
          classGrade: tx.classGrade,
          parentName: currentStudent.parentName,
          parentPhone: currentStudent.parentPhone,
          parentEmail: currentStudent.parentEmail,
          amountInFigures: tx.amountPaid,
          amountInWords: numberToWordsNaira(tx.amountPaid),
          paymentChannel: tx.paymentChannel,
          paymentDate: tx.paymentDate,
          totalInvoiceAmount: tx.amountPaid,
          amountPaidThisTransaction: tx.amountPaid,
          totalCumulativePaid: tx.amountPaid,
          balanceRemaining: 0,
          authorizedBursarName: 'Chief O. Eze (Bursar & Financial Controller)',
          qrVerificationCode: `CF-${tx.receiptNumber}-SEC-VERIFIED`,
          generatedAt: tx.paymentDate
        };
        onOpenReceipt(syntheticReceipt);
      } else {
        showToast(`Receipt #${recNo} details retrieved.`);
      }
    }
  };

  // Handle Open Checkout for Unpaid Balance
  const handleOpenCheckoutForStudent = () => {
    // Find active unpaid invoice
    const unpaidInv = studentInvoices.find(i => i.balanceDue > 0);
    if (unpaidInv) {
      onOpenCheckout(unpaidInv);
      return;
    }

    // Otherwise create synthetic invoice for pending balance
    if (currentOutstandingBalance > 0) {
      const synInv: StudentInvoice = {
        id: `inv-settle-${currentStudent.id}-${Date.now()}`,
        invoiceNumber: `INV-BAL-${currentStudent.admissionNumber.replace(/\//g, '-')}`,
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        admissionNumber: currentStudent.admissionNumber,
        classGrade: currentStudent.classGrade,
        classGroupId: `grp-${currentStudent.classGrade.toLowerCase().replace(/\s+/g, '')}`,
        classGroupName: currentStudent.classGroupName,
        parentName: currentStudent.parentName,
        parentPhone: currentStudent.parentPhone,
        parentEmail: currentStudent.parentEmail,
        academicSession: '2025/2026',
        term: 'Term 3',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        lineItems: [
          {
            feeItemId: 'fee-outstanding-balance',
            name: 'Outstanding Cumulative Academic Fees & Levies Balance',
            category: 'tuition',
            amount: currentOutstandingBalance,
            discountAmount: 0,
            netAmount: currentOutstandingBalance
          }
        ],
        totalAmount: currentOutstandingBalance,
        totalDiscount: 0,
        amountPaid: 0,
        balanceDue: currentOutstandingBalance,
        status: 'unpaid',
        qrCodeHash: `CF-BAL-AUTH-${currentStudent.admissionNumber}-2026`,
        createdAt: new Date().toISOString()
      };
      onOpenCheckout(synInv);
    } else {
      showToast('Student account is already 100% fully settled! No pending balance.');
    }
  };

  // Handle Dispatch Statement Notification to Parent
  const handleSendStatementNotice = () => {
    const newNotif: PaymentNotification = {
      id: `notif-stmt-${Date.now()}`,
      type: sendChannel === 'sms' ? 'sms' : sendChannel === 'email' ? 'email' : 'sms',
      recipient: sendChannel === 'email' ? currentStudent.parentEmail : currentStudent.parentPhone,
      recipientName: currentStudent.parentName,
      studentName: `${currentStudent.name} (${currentStudent.classGrade})`,
      title: 'Official Statement of Account Dispatched',
      message: customMessage || `Dear ${currentStudent.parentName}, the updated financial ledger for ${currentStudent.name} (${currentStudent.admissionNumber}) has been generated. Total Paid: ₦${totalPaidLifetime.toLocaleString()}, Outstanding Balance: ₦${currentOutstandingBalance.toLocaleString()}. Dedicated NUBAN: ${studentVirtualNuban.accountNumber} (${studentVirtualNuban.bankName}). Thank you.`,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      channelIcon: sendChannel === 'sms' ? 'MessageSquare' : 'Mail'
    };

    onDispatchNotification(newNotif);
    setShowSendModal(false);
    showToast(`Statement of account sent to ${currentStudent.parentName} via ${sendChannel.toUpperCase()}!`);
  };

  // Print Statement of Account
  const handlePrintStatement = () => {
    window.print();
  };

  // Helper for Payment Gateway badge
  const renderGatewayBadge = (channel?: string, ref?: string) => {
    if (!channel) return null;
    switch (channel.toLowerCase()) {
      case 'paystack':
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-[11px] text-cyan-300 font-mono">
            <CreditCard className="w-3 h-3 text-cyan-400" />
            <span className="font-bold">Paystack Gateway</span>
            {ref && <span className="text-slate-400 truncate max-w-[140px]">({ref})</span>}
          </div>
        );
      case 'opay':
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-[11px] text-emerald-300 font-mono">
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">OPay Direct Transfer</span>
            {ref && <span className="text-slate-400 truncate max-w-[140px]">({ref})</span>}
          </div>
        );
      case 'bank_transfer':
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-[11px] text-indigo-300 font-mono">
            <Building2 className="w-3 h-3 text-indigo-400" />
            <span className="font-bold">Direct Bank NIP</span>
            {ref && <span className="text-slate-400 truncate max-w-[140px]">({ref})</span>}
          </div>
        );
      case 'pos_terminal':
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-700/60 text-[11px] text-amber-300 font-mono">
            <CreditCard className="w-3 h-3 text-amber-400" />
            <span className="font-bold">POS Terminal</span>
            {ref && <span className="text-slate-400 truncate max-w-[140px]">({ref})</span>}
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono">
            <DollarSign className="w-3 h-3 text-slate-400" />
            <span className="font-bold">Cash / Bursary Counter</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP BAR: STUDENT SELECTOR & SEARCH CONTROLS */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Student Fee Payment History & Ledger</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Principal & Bursary Audit View
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete chronological statement of all invoices, Paystack/OPay gateway transaction IDs, and clearance milestones.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handlePrintStatement}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print Ledger</span>
            </button>

            <button
              onClick={() => setShowSendModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Statement SMS/Email</span>
            </button>

            {currentOutstandingBalance > 0 && (
              <button
                onClick={handleOpenCheckoutForStudent}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Balance (₦{currentOutstandingBalance.toLocaleString()})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Student Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student by name, admission no (e.g. CF/2024/SS2/001), or parent name..."
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              aria-label="Filter by Grade"
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Class Cohorts</option>
              <option value="SS 2">SS 2 Cohort</option>
              <option value="SS 3">SS 3 Cohort</option>
              <option value="JSS 2">JSS 2 Cohort</option>
              <option value="JSS 3">JSS 3 Cohort</option>
              <option value="SS 1">SS 1 Cohort</option>
              <option value="JSS 1">JSS 1 Cohort</option>
            </select>
          </div>

          <div>
            <select
              value={selectedClearanceFilter}
              onChange={(e) => setSelectedClearanceFilter(e.target.value)}
              aria-label="Filter by Clearance"
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Clearance States</option>
              <option value="fully_cleared">Fully Cleared (100%)</option>
              <option value="provisional_cleared">Provisional Clearance</option>
              <option value="blocked_debtor">Blocked Debtor</option>
            </select>
          </div>
        </div>

        {/* Horizontal Quick-Select Student Cards Carousel */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Select Student Ledger ({filteredStudents.length} Students Available):
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredStudents.map(stu => {
              const isSelected = stu.id === currentStudent.id;
              const hasBalance = stu.balance && stu.balance > 0;

              return (
                <button
                  key={stu.id}
                  onClick={() => setSelectedStudentId(stu.id)}
                  className={`px-3.5 py-2 rounded-2xl text-left transition-all shrink-0 flex items-center gap-3 cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-950 to-slate-900 border-emerald-500 text-white shadow-md shadow-emerald-950/60 ring-2 ring-emerald-500/40'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {stu.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>{stu.name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{stu.admissionNumber}</span>
                      <span>•</span>
                      <span>{stu.classGrade}</span>
                      {hasBalance ? (
                        <span className="text-rose-400 font-bold">₦{stu.balance?.toLocaleString()} due</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Cleared</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. STUDENT BURSARY PASSPORT CARD & EXECUTIVE SCORECARDS */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Student Passport & Dedicated Virtual NUBAN (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/30">
                {currentStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{currentStudent.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {currentStudent.admissionNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {currentStudent.classGroupName}
                  </span>
                </div>
              </div>
            </div>

            {/* Clearance Status Badge */}
            <div>
              {currentOutstandingBalance === 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CLEARED (100%)</span>
                </div>
              ) : currentStudent.clearanceStatus === 'provisional_cleared' || collectionRatePercent >= 50 ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-xs font-black">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>PROVISIONAL CLEARANCE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-700 text-rose-300 text-xs font-black">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>BLOCKED DEBTOR</span>
                </div>
              )}
            </div>
          </div>

          {/* Parent / Sponsor Details */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Parent & Sponsor Registry Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-white truncate">{currentStudent.parentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-300 truncate">{currentStudent.parentPhone}</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 font-mono truncate">{currentStudent.parentEmail}</span>
              </div>
            </div>
          </div>

          {/* Dedicated Virtual NUBAN Account Card */}
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 rounded-2xl p-4 border border-emerald-700/50 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Dedicated Virtual Ingress NUBAN</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-semibold">
                Auto-Credit Reconciled
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-mono font-black text-lg text-white tracking-widest">
                  {studentVirtualNuban.accountNumber}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {studentVirtualNuban.bankName} • <span className="font-medium text-emerald-300">{studentVirtualNuban.accountName}</span>
                </div>
              </div>

              <button
                onClick={() => handleCopy(studentVirtualNuban.accountNumber, 'Virtual NUBAN Account')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                title="Copy Account Number"
              >
                {copiedRef === studentVirtualNuban.accountNumber ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Active Installment Policy Status */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Installment Policy Framework</span>
              </span>
              <span className="text-[10px] font-bold text-amber-300">
                {studentAgreement?.agreedPlanType === 'custom_hardship_plan' ? 'Principal Hardship Plan' : 'Standard 50-30-20 Policy'}
              </span>
            </div>

            {/* Tranche Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Tranches Settled:</span>
                <span className="font-bold text-white">
                  {currentAccountSummary?.activeInstallmentPlan?.completedTranches || (collectionRatePercent === 100 ? 3 : collectionRatePercent >= 50 ? 1 : 0)} of {installmentPolicy.tranches.length} Tranches
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${collectionRatePercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Executive Financial Scorecards & Progress (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Billed */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Total Billed (Lifetime)
              </span>
              <div className="font-mono font-black text-xl text-white">
                ₦{totalBilledLifetime.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Across {studentInvoices.length} invoices & {studentSundryOrders.length} sundry levies
              </span>
            </div>

            {/* Total Paid */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                Total Verified Paid
              </span>
              <div className="font-mono font-black text-xl text-emerald-400">
                ₦{totalPaidLifetime.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-500/80 font-bold block">
                {collectionRatePercent}% Settled to School Bank
              </span>
            </div>

            {/* Outstanding Balance */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Outstanding Balance
              </span>
              <div className={`font-mono font-black text-xl ${
                currentOutstandingBalance === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ₦{currentOutstandingBalance.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {currentOutstandingBalance === 0 ? 'No arrears due' : 'Actionable recovery'}
              </span>
            </div>
          </div>

          {/* Recent Transaction Banner */}
          {mostRecentTransaction ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Latest Gateway Settlement Activity</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(mostRecentTransaction.paymentDate).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {renderGatewayBadge(mostRecentTransaction.paymentChannel, mostRecentTransaction.transactionReference)}
                    <span className="font-mono text-xs font-bold text-white">
                      Receipt #{mostRecentTransaction.receiptNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Verified By: <span className="text-slate-300 font-medium">{mostRecentTransaction.verifiedBy}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-base text-emerald-400">
                    +₦{mostRecentTransaction.amountPaid.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleViewReceiptByNumber(mostRecentTransaction.receiptNumber)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center text-slate-400 text-xs shadow-lg">
              No recorded payment transactions yet for this student.
            </div>
          )}

          {/* Quick Subtab Navigation for History Detail Views */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
            <button
              onClick={() => setHistoryTab('all_ledger')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                historyTab === 'all_ledger'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chronological Ledger ({rawLedgerItems.length})</span>
            </button>

            <button
              onClick={() => setHistoryTab('installments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                historyTab === 'installments'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Installment Milestones</span>
            </button>

            <button
              onClick={() => setHistoryTab('sundry_levies')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                historyTab === 'sundry_levies'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Sundry & Excursions ({studentSundryOrders.length})</span>
            </button>

            <button
              onClick={() => setHistoryTab('printable_statement')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                historyTab === 'printable_statement'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printable Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2.5 VISUAL PROGRESS BAR & INSTALLMENT PLAN MILESTONES TRACKER */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl relative overflow-hidden">
        {/* Header & Milestone Status */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Termly Fee Installment Progress Tracker</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                    {installmentProgressData.planName}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tracking cumulative payments for {currentStudent.name} against approved statutory term milestones.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Term Clearance</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-mono font-black text-lg text-emerald-400">{collectionRatePercent}%</span>
                <span className="text-xs text-slate-400 font-medium">({installmentProgressData.completedTranchesCount} of {installmentProgressData.totalTranchesCount} Milestones)</span>
              </div>
            </div>

            {collectionRatePercent === 100 ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% FULLY CLEARED</span>
              </div>
            ) : currentOutstandingBalance > 0 ? (
              <button
                onClick={handleOpenCheckoutForStudent}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Tranche Balance</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Master Multi-Segment Visual Progress Bar */}
        <div className="space-y-2 bg-slate-950/90 rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Cumulative Fee Progress:</span>
              <span className="font-mono text-emerald-400 font-bold">₦{totalPaidLifetime.toLocaleString()} Paid</span>
              <span className="text-slate-500">/</span>
              <span className="font-mono text-slate-300">₦{totalBilledLifetime.toLocaleString()} Total Term Billed</span>
            </div>
            <div className="flex items-center gap-2">
              {currentOutstandingBalance > 0 ? (
                <span className="text-rose-400 font-mono font-bold">₦{currentOutstandingBalance.toLocaleString()} Remaining Arrears</span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> All Tranches Settled
                </span>
              )}
            </div>
          </div>

          {/* Main Visual Progress Track with Tranche Cutoffs */}
          <div className="relative pt-2 pb-6">
            {/* Background Track */}
            <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex shadow-inner relative">
              {/* Dynamic Fill Bar */}
              <div 
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full transition-all duration-700 rounded-full relative shadow-lg shadow-emerald-500/20" 
                style={{ width: `${collectionRatePercent}%` }}
              >
                <div className="absolute inset-0 bg-white/15 animate-pulse rounded-full"></div>
              </div>
            </div>

            {/* Tranche Milestone Markers & Labels */}
            <div className="relative w-full mt-1.5 flex justify-between">
              {installmentProgressData.tranches.map((tranche, idx) => {
                const isPassed = collectionRatePercent >= tranche.endPercent;
                const isCurrent = !isPassed && collectionRatePercent >= tranche.startPercent;

                return (
                  <div 
                    key={tranche.id}
                    className="flex flex-col items-center text-center"
                    style={{ width: `${tranche.percentage}%` }}
                  >
                    <div className="flex items-center justify-center w-full relative">
                      <div className={`w-3 h-3 rounded-full border-2 -mt-3.5 z-10 transition-all ${
                        isPassed 
                          ? 'bg-emerald-500 border-slate-950 ring-2 ring-emerald-400' 
                          : isCurrent 
                          ? 'bg-amber-400 border-slate-950 ring-2 ring-amber-400 animate-ping-slow' 
                          : 'bg-slate-700 border-slate-950'
                      }`} />
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <span className={`text-[11px] font-bold block ${
                        isPassed ? 'text-emerald-400' : isCurrent ? 'text-amber-300' : 'text-slate-400'
                      }`}>
                        {tranche.shortCode} ({tranche.percentage}%)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        ₦{tranche.trancheTargetAmount.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        {tranche.deadlineWeek}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Segmented Tranche Milestone Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {installmentProgressData.tranches.map((tranche, idx) => {
            const isComplete = tranche.isFullySettled;
            const isPartial = tranche.isPartiallyPaid;
            const isActive = tranche.isNextDue;
            const isLocked = tranche.isLocked;

            return (
              <div 
                key={tranche.id}
                className={`rounded-2xl p-4.5 border transition-all space-y-3.5 flex flex-col justify-between ${
                  isComplete
                    ? 'bg-emerald-950/20 border-emerald-600/50 shadow-md shadow-emerald-950/30'
                    : isPartial || isActive
                    ? 'bg-amber-950/25 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800 opacity-80'
                }`}
              >
                {/* Tranche Card Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isComplete
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : isPartial || isActive
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        TRANCHE {idx + 1} ({tranche.percentage}%)
                      </span>
                    </div>

                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>SETTLED (100%)</span>
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>PARTIAL ({tranche.trancheProgressPercent}%)</span>
                      </span>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>ACTIONABLE DUE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>{tranche.name}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{tranche.description}</p>
                  </div>
                </div>

                {/* Progress Mini Meter & Numbers */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Paid / Target:</span>
                    <div className="text-right">
                      <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-white font-bold'}>
                        ₦{tranche.paidForTranche.toLocaleString()}
                      </span>
                      <span className="text-slate-500"> / ₦{tranche.trancheTargetAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Mini Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                      style={{ width: `${tranche.trancheProgressPercent}%` }}
                    />
                  </div>

                  {/* Remaining for this tranche */}
                  {!isComplete && (
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Tranche Arrears:</span>
                      <span className="text-rose-400 font-bold">₦{tranche.balanceForTranche.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Due Date & Academic Week */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Target Date:</span>
                    <span className="text-slate-300 font-mono font-medium">{tranche.dueDate} ({tranche.deadlineWeek})</span>
                  </div>

                  {/* Academic Clearance Privilege */}
                  <div className={`p-2.5 rounded-xl text-[11px] border ${
                    isComplete 
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200' 
                      : isPartial || isActive
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-start gap-1.5">
                      {isComplete ? (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider block opacity-75">Clearance Gate:</span>
                        <span className="font-semibold leading-tight">{tranche.academicClearanceScope}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button for Tranche */}
                  {!isComplete && tranche.balanceForTranche > 0 && (
                    <button
                      onClick={handleOpenCheckoutForStudent}
                      className="w-full mt-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Settle Tranche Arrears (₦{tranche.balanceForTranche.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Clearance Summary Advice Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Active Academic Standing: </strong>
              {collectionRatePercent === 100 ? (
                <span className="text-emerald-400 font-semibold">100% Full Academic & Examination Clearance. Student is cleared for all tests, LMS dockets, CBT portals, and End-of-Term report sheets.</span>
              ) : collectionRatePercent >= 80 ? (
                <span className="text-teal-300 font-semibold">Tranches 1 & 2 Cleared. Student is permitted in classrooms, lab practicals, and Continuous Assessment CBT tests. Tranche 3 required before final exam week.</span>
              ) : collectionRatePercent >= 50 ? (
                <span className="text-amber-300 font-semibold">Tranche 1 Cleared (Provisional Classroom Clearance). Student is permitted for regular school attendance. Mid-Term Tranche 2 due by Week 6.</span>
              ) : (
                <span className="text-rose-400 font-semibold">Non-Compliant Debtor. Minimum 50% Resumption Tranche (₦{(totalBilledLifetime * 0.5).toLocaleString()}) required for statutory classroom admission.</span>
              )}
            </span>
          </div>

          <button
            onClick={() => setHistoryTab('installments')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0 border border-slate-800 cursor-pointer"
          >
            <span>View Full Policy Details</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. SUBTAB DETAIL VIEWS */}
      {/* ----------------------------------------------------------------- */}

      {/* VIEW A: CHRONOLOGICAL UNIFIED FINANCIAL LEDGER */}
      {historyTab === 'all_ledger' && (
        <div className="space-y-4">
          {/* Ledger Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter entries by gateway reference, transaction ID, receipt #, or fee name..."
                value={ledgerSearchQuery}
                onChange={(e) => setLedgerSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                aria-label="Filter by Term"
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Academic Terms</option>
                <option value="Term 3">Term 3 (Trinity)</option>
                <option value="Term 2">Term 2 (Lent)</option>
                <option value="Term 1">Term 1 (Michaelmas)</option>
              </select>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                aria-label="Filter by Payment Channel"
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Payment Channels</option>
                <option value="paystack">Paystack Gateway</option>
                <option value="opay">OPay Direct</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="pos_terminal">POS Terminal</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1.5 cursor-pointer"
                title="Toggle Date Order"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>

          {/* Chronological Unified Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Chronological Financial Journal ({displayedLedgerItems.length} Entries)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every bill issued, Paystack/OPay payment captured, receipt generated, and resulting running balance.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Description & Category</th>
                    <th className="py-3.5 px-4">Payment Gateway & Transaction Reference</th>
                    <th className="py-3.5 px-4 text-right">Debit (Billed)</th>
                    <th className="py-3.5 px-4 text-right">Credit (Paid)</th>
                    <th className="py-3.5 px-4 text-right">Running Balance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Receipt & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {displayedLedgerItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No financial entries matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedLedgerItems.map((item) => {
                      const isCredit = item.creditAmount > 0;
                      const isDebit = item.debitAmount > 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                          {/* Date */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                            <div className="font-bold text-white">{item.date}</div>
                            <span className="text-[10px] text-slate-400">{item.term}</span>
                          </td>

                          {/* Description & Category */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-xs">{item.title}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/80 uppercase font-semibold">
                                {item.category}
                              </span>
                              {item.notes && (
                                <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Gateway & Transaction ID */}
                          <td className="py-3.5 px-4">
                            {item.transactionReference ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  {renderGatewayBadge(item.paymentChannel, item.transactionReference)}
                                  <button
                                    onClick={() => handleCopy(item.transactionReference!, 'Transaction ID')}
                                    className="text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                                    title="Copy Transaction Reference"
                                  >
                                    {copiedRef === item.transactionReference ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                {item.gatewayPspReference && (
                                  <div className="font-mono text-[10px] text-slate-400">
                                    PSP Ref: <span className="text-slate-300 font-semibold">{item.gatewayPspReference}</span>
                                  </div>
                                )}
                                {item.verifiedBy && (
                                  <div className="text-[9px] text-slate-400">
                                    Auth: <span className="text-slate-300">{item.verifiedBy}</span>
                                  </div>
                                )}
                              </div>
                            ) : item.type === 'invoice_billed' ? (
                              <span className="font-mono text-[11px] text-slate-400">
                                Term Bill Issued
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Institutional Adjustment</span>
                            )}
                          </td>

                          {/* Debit */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {isDebit ? `₦${item.debitAmount.toLocaleString()}` : '—'}
                          </td>

                          {/* Credit */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            {isCredit ? `₦${item.creditAmount.toLocaleString()}` : '—'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3.5 px-4 text-right font-mono font-black">
                            {item.runningBalance === 0 ? (
                              <span className="text-emerald-400">₦0.00</span>
                            ) : (
                              <span className="text-amber-400">₦{item.runningBalance.toLocaleString()}</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {item.paymentStatus === 'successful' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>SETTLED</span>
                              </span>
                            ) : item.paymentStatus === 'partially_paid' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>PARTIAL</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>PENDING</span>
                              </span>
                            )}
                          </td>

                          {/* Actions & Receipt Link */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.receiptNumber ? (
                                <button
                                  onClick={() => handleViewReceiptByNumber(item.receiptNumber)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                                  title={`View Official Receipt #${item.receiptNumber}`}
                                >
                                  <Receipt className="w-3 h-3 text-emerald-400" />
                                  <span>{item.receiptNumber}</span>
                                </button>
                              ) : isDebit && item.paymentStatus !== 'successful' ? (
                                <button
                                  onClick={handleOpenCheckoutForStudent}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Pay balance via Paystack / OPay"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Now</span>
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: INSTALLMENT POLICY & TRANCHE MILESTONES */}
      {historyTab === 'installments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Statutory Installment Agreement & Tranche Clearance Docket</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Principal approved milestone split breakdown for {currentStudent.name} ({currentStudent.admissionNumber}) for 2025/2026 Academic Session.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                Plan Structure: <span className="text-amber-400 font-mono">{installmentProgressData.planName}</span>
              </span>
            </div>
          </div>

          {/* Agreement Metadata Card */}
          {studentAgreement && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Agreement Reference</span>
                <span className="font-mono font-bold text-white">{studentAgreement.id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Parent / Sponsor Guarantor</span>
                <span className="font-bold text-emerald-400">{studentAgreement.parentName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Agreement Status</span>
                <span className="font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Principal Approved & Active</span>
                </span>
              </div>
            </div>
          )}

          {/* Tranche Cards Detailed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {installmentProgressData.tranches.map((tranche, idx) => {
              const isComplete = tranche.isFullySettled;
              const isPartial = tranche.isPartiallyPaid;
              const isActive = tranche.isNextDue;
              const isLocked = tranche.isLocked;

              return (
                <div 
                  key={tranche.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                    isComplete
                      ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : isPartial || isActive
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isComplete
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isPartial || isActive
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        TRANCHE {idx + 1} ({tranche.percentage}%)
                      </span>

                      {isComplete ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PAID IN FULL</span>
                        </span>
                      ) : isPartial ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>PARTIAL ({tranche.trancheProgressPercent}%)</span>
                        </span>
                      ) : isActive ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ACTIONABLE DUE</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <Lock className="w-3.5 h-3.5" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{tranche.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{tranche.description}</p>
                    </div>

                    {/* Mini Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Progress:</span>
                        <span className="font-bold text-white">{tranche.trancheProgressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-400' : 'bg-slate-700'}`}
                          style={{ width: `${tranche.trancheProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Tranche Target:</span>
                      <span className="font-bold text-white">₦{tranche.trancheTargetAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Amount Paid:</span>
                      <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-slate-200 font-bold'}>
                        ₦{tranche.paidForTranche.toLocaleString()}
                      </span>
                    </div>

                    {!isComplete && (
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Remaining Balance:</span>
                        <span className="text-rose-400 font-bold">₦{tranche.balanceForTranche.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Statutory Deadline:</span>
                      <span className="font-bold text-amber-400">{tranche.dueDate} ({tranche.deadlineWeek})</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <div className="flex items-start gap-1.5">
                        {isComplete ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">Academic Clearance Unlocked:</span>
                          <span className="leading-tight">{tranche.academicClearanceScope}</span>
                        </div>
                      </div>
                    </div>

                    {!isComplete && tranche.balanceForTranche > 0 && (
                      <button
                        onClick={handleOpenCheckoutForStudent}
                        className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Tranche Balance (₦{tranche.balanceForTranche.toLocaleString()})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW C: SUNDRY & EXCURSIONS */}
      {historyTab === 'sundry_levies' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Sundry, Excursions & Non-Tuition Activities</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Special educational tours, athletics uniforms, graduation packages, and extramural masterclasses for {currentStudent.name}.
              </p>
            </div>
          </div>

          {studentSundryOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No sundry payment orders registered for this student.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentSundryOrders.map(order => (
                <div key={order.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {order.category.replace('_', ' ')}
                      </span>
                      {order.paymentStatus === 'paid' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                          PAID
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-700">
                          PENDING PAYMENT
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm mt-2">{order.feeItemName}</h4>
                    <span className="font-mono text-xs text-slate-400 block mt-1">Order #{order.orderNumber}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="font-mono font-black text-base text-emerald-400">
                      ₦{order.amount.toLocaleString()}
                    </span>
                    {order.receiptNumber ? (
                      <button
                        onClick={() => handleViewReceiptByNumber(order.receiptNumber)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Receipt #{order.receiptNumber}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenCheckoutForStudent}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Online</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW D: OFFICIAL PRINTABLE STATEMENT OF ACCOUNT */}
      {historyTab === 'printable_statement' && (
        <div className="bg-white text-slate-900 rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-300">
          {/* Header with School Crest & Information */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                  CF
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">CurriculumFlow International College</h1>
                  <p className="text-xs text-slate-600 font-medium">Bursary & Financial Controller's Office • Official Financial Ledger</p>
                </div>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <div className="font-mono font-bold text-slate-900">STATEMENT OF ACCOUNT</div>
              <div className="text-slate-600">Generated: {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</div>
              <div className="text-[10px] font-mono text-slate-500">REF: STMT-CF-{currentStudent.admissionNumber.replace(/\D/g, '')}</div>
            </div>
          </div>

          {/* Student & Sponsor Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-xl text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Student Name:</span>
              <span className="font-black text-slate-900 text-sm">{currentStudent.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Admission Number:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{currentStudent.admissionNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Class Cohort:</span>
              <span className="font-bold text-slate-900">{currentStudent.classGroupName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Parent / Sponsor:</span>
              <span className="font-bold text-slate-900">{currentStudent.parentName}</span>
            </div>
          </div>

          {/* Financial Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-200 text-slate-800 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 border border-slate-300">Date</th>
                  <th className="py-2.5 px-3 border border-slate-300">Description & Category</th>
                  <th className="py-2.5 px-3 border border-slate-300">Gateway Ref / Receipt</th>
                  <th className="py-2.5 px-3 text-right border border-slate-300">Debit (₦)</th>
                  <th className="py-2.5 px-3 text-right border border-slate-300">Credit (₦)</th>
                  <th className="py-2.5 px-3 text-right border border-slate-300">Balance (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rawLedgerItems.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-2 px-3 font-mono border border-slate-200">{item.date}</td>
                    <td className="py-2 px-3 font-medium border border-slate-200">{item.title}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 border border-slate-200">
                      {item.transactionReference || item.receiptNumber || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold border border-slate-200">
                      {item.debitAmount > 0 ? item.debitAmount.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 border border-slate-200">
                      {item.creditAmount > 0 ? item.creditAmount.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black border border-slate-200">
                      {item.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-right uppercase text-slate-800">Total Summaries:</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900">₦{totalBilledLifetime.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">₦{totalPaidLifetime.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-rose-700">₦{currentOutstandingBalance.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Sign-off & Seal */}
          <div className="pt-6 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-900">Chief O. Eze</div>
              <div className="text-slate-600">Bursar & Financial Controller</div>
              <div className="font-mono text-[10px] text-slate-500">DIGITAL SEAL: CF-SEC-FIN-2026-AUTH</div>
            </div>

            <div className="text-center sm:text-right">
              <div className="inline-block p-3 rounded-xl border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase tracking-widest">
                {currentOutstandingBalance === 0 ? 'STATUS: ACCOUNT FULLY CLEARED' : `OUTSTANDING: ₦${currentOutstandingBalance.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. MODAL: DISPATCH STATEMENT SMS/EMAIL TO PARENT */}
      {/* ----------------------------------------------------------------- */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dispatch Statement of Account</h3>
                  <p className="text-xs text-slate-400">Transmit real-time financial ledger summary to parent.</p>
                </div>
              </div>

              <button
                onClick={() => setShowSendModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student:</span>
                  <span className="font-bold text-white">{currentStudent.name} ({currentStudent.admissionNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Parent / Guardian:</span>
                  <span className="font-semibold text-slate-200">{currentStudent.parentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipient Mobile / Email:</span>
                  <span className="font-mono text-emerald-400">{currentStudent.parentPhone} • {currentStudent.parentEmail}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-400">₦{currentOutstandingBalance.toLocaleString()}</span>
                </div>
              </div>

              {/* Delivery Channel Radio */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Delivery Channel:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['both', 'sms', 'email'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSendChannel(ch)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        sendChannel === ch
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Statement Message Preview / Custom Remarks:</label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Dear ${currentStudent.parentName}, please find the updated fee ledger for ${currentStudent.name}. Total Paid: ₦${totalPaidLifetime.toLocaleString()}, Outstanding Balance: ₦${currentOutstandingBalance.toLocaleString()}. Dedicated NUBAN: ${studentVirtualNuban.accountNumber} (${studentVirtualNuban.bankName}). Thank you.`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendStatementNotice}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-950/60 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
