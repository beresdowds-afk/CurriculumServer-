import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  InstallmentPolicy, 
  InstallmentTranche, 
  InstallmentPresetType, 
  StudentInstallmentAgreement, 
  CustomStudentTranche,
  StudentInvoice,
  ClassGrade
} from '../types';
import { 
  DEFAULT_INSTALLMENT_POLICY, 
  PRESET_TRANCHE_TEMPLATES, 
  INITIAL_STUDENT_AGREEMENTS,
  calculateInstallmentSplit,
  validatePolicyTranches,
  numberToWordsNaira
} from '../data/bursaryAccountsData';
import { 
  ShieldCheck, 
  Edit3, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles, 
  FileText, 
  Printer, 
  UserCheck, 
  Lock, 
  Unlock, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  Percent, 
  DollarSign, 
  Layers, 
  Send, 
  Eye, 
  Check, 
  ChevronRight, 
  Info,
  Building2,
  Award,
  Users,
  CreditCard,
  QrCode
} from 'lucide-react';

interface InstallmentPolicyManagerProps {
  currentUser: UserProfile;
  policy: InstallmentPolicy;
  onUpdatePolicy: (updatedPolicy: InstallmentPolicy) => void;
  agreements: StudentInstallmentAgreement[];
  onUpdateAgreements: (updatedAgreements: StudentInstallmentAgreement[]) => void;
  invoices: StudentInvoice[];
}

export const InstallmentPolicyManager: React.FC<InstallmentPolicyManagerProps> = ({
  currentUser,
  policy,
  onUpdatePolicy,
  agreements,
  onUpdateAgreements,
  invoices
}) => {
  // Principal Governance state
  const isActualPrincipal = currentUser.role === 'principal' || currentUser.role === 'principal_admin' || currentUser.role === 'super_admin';
  const [simulatedPrincipalMode, setSimulatedPrincipalMode] = useState<boolean>(isActualPrincipal);
  const canEdit = isActualPrincipal || simulatedPrincipalMode;

  // Active Sub-view
  const [activeTab, setActiveTab] = useState<'policy_editor' | 'student_agreements' | 'audit_trail' | 'circular_preview'>('policy_editor');

  // Draft Policy State for Editing
  const [draftPolicy, setDraftPolicy] = useState<InstallmentPolicy>(JSON.parse(JSON.stringify(policy)));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulation fee sandbox amount
  const [simulationFeeAmount, setSimulationFeeAmount] = useState<number>(173000);

  // New Hardship Agreement Modal State
  const [showNewAgreementModal, setShowNewAgreementModal] = useState<boolean>(false);
  const [selectedStudentForAgr, setSelectedStudentForAgr] = useState<string>('');
  const [agrStudentName, setAgrStudentName] = useState('');
  const [agrAdmNo, setAgrAdmNo] = useState('');
  const [agrClassGrade, setAgrClassGrade] = useState<ClassGrade>('SS 2');
  const [agrParentName, setAgrParentName] = useState('');
  const [agrParentPhone, setAgrParentPhone] = useState('');
  const [agrTotalAmount, setAgrTotalAmount] = useState<number>(183000);
  const [agrPlanType, setAgrPlanType] = useState<'custom_hardship_plan' | 'staff_concession'>('custom_hardship_plan');
  const [agrSpecialNotes, setAgrSpecialNotes] = useState('');
  const [agrTranches, setAgrTranches] = useState<{ name: string; percentage: number; dueDate: string; milestone: string }[]>([
    { name: 'Tranche 1: Resumption Hardship Deposit', percentage: 35, dueDate: '2026-05-15', milestone: 'Class Admission & LMS' },
    { name: 'Tranche 2: Mid-Term Hardship Tranche', percentage: 35, dueDate: '2026-06-19', milestone: 'Mid-Term CBT Docket' },
    { name: 'Tranche 3: Terminal Exam Liquidation', percentage: 30, dueDate: '2026-07-15', milestone: 'Terminal Exam & Broadsheet' }
  ]);

  // Validation
  const validation = useMemo(() => {
    return validatePolicyTranches(draftPolicy.tranches);
  }, [draftPolicy.tranches]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Preset Handler
  const handleApplyPreset = (presetKey: InstallmentPresetType) => {
    const template = PRESET_TRANCHE_TEMPLATES[presetKey];
    if (!template) return;

    const newTranches: InstallmentTranche[] = template.tranches.map((t, idx) => ({
      ...t,
      id: `tranche-${Date.now()}-${idx + 1}`
    }));

    setDraftPolicy(prev => ({
      ...prev,
      presetType: presetKey,
      minimumInitialDepositPercent: template.minDeposit,
      tranches: newTranches
    }));
    setHasUnsavedChanges(true);
    showToast(`Applied "${template.name}" template.`);
  };

  // Tranche CRUD
  const handleAddTranche = () => {
    const nextNumber = draftPolicy.tranches.length + 1;
    const newTranche: InstallmentTranche = {
      id: `tranche-custom-${Date.now()}`,
      trancheNumber: nextNumber,
      name: `Tranche ${nextNumber}: Milestone Assessment`,
      shortCode: `T${nextNumber}`,
      percentage: 20,
      deadlineWeek: `Week ${nextNumber * 3}`,
      dueDate: new Date(Date.now() + nextNumber * 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      academicClearanceScope: 'Examination & LMS Clearance Milestone',
      isCompulsoryForAdmission: false,
      latePenaltySurchargePercent: 5,
      description: 'Scheduled milestone installment tranche.'
    };

    setDraftPolicy(prev => ({
      ...prev,
      presetType: 'custom',
      tranches: [...prev.tranches, newTranche]
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateTranche = (id: string, updates: Partial<InstallmentTranche>) => {
    setDraftPolicy(prev => ({
      ...prev,
      presetType: 'custom',
      tranches: prev.tranches.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveTranche = (id: string) => {
    if (draftPolicy.tranches.length <= 1) {
      showToast('A policy must contain at least 1 tranche.');
      return;
    }
    setDraftPolicy(prev => ({
      ...prev,
      presetType: 'custom',
      tranches: prev.tranches.filter(t => t.id !== id).map((t, idx) => ({
        ...t,
        trancheNumber: idx + 1,
        shortCode: `T${idx + 1}`
      }))
    }));
    setHasUnsavedChanges(true);
  };

  // Save Policy Handler with Principal Digital Seal
  const handleSavePolicy = () => {
    if (!validation.isValid) {
      showToast(validation.error || 'Invalid tranche configuration.');
      return;
    }

    const timestamp = new Date().toISOString();
    const signatureHash = `SHA256:${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    const principalName = currentUser.name || 'Dr. (Mrs.) Folashade Adeleke, Ph.D';
    const principalId = currentUser.id || 'usr-principal-01';

    const newAuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp,
      modifiedBy: principalName,
      modifierRole: currentUser.role,
      changeSummary: `Principal updated installment policy to "${draftPolicy.presetType}" (${draftPolicy.tranches.map(t => `${t.percentage}%`).join(' - ')}). Grace period: ${draftPolicy.gracePeriodDays} days, Min Deposit: ${draftPolicy.minimumInitialDepositPercent}%.`,
      signatureHash
    };

    const finalizedPolicy: InstallmentPolicy = {
      ...draftPolicy,
      principalApproval: {
        principalName,
        principalId,
        approvedAt: timestamp,
        approvalStamp: `CURRICULUMFLOW-EXCO-AUTH-${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/INST`,
        digitalSignatureHash: signatureHash,
        remarks: draftPolicy.principalApproval.remarks || `Promulgated as official fee installment policy for ${draftPolicy.term}, ${draftPolicy.academicSession}.`
      },
      auditTrail: [newAuditEntry, ...draftPolicy.auditTrail]
    };

    onUpdatePolicy(finalizedPolicy);
    setDraftPolicy(finalizedPolicy);
    setHasUnsavedChanges(false);
    showToast('Principal Installment Policy successfully saved and promulgated!');
  };

  const handleResetDraft = () => {
    setDraftPolicy(JSON.parse(JSON.stringify(policy)));
    setHasUnsavedChanges(false);
    showToast('Draft changes discarded.');
  };

  // Create Special Student Agreement Handler
  const handleCreateAgreement = () => {
    const totalPercentage = agrTranches.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      showToast('Agreement tranche percentages must sum to 100%.');
      return;
    }
    if (!agrStudentName.trim() || !agrParentName.trim()) {
      showToast('Please provide student and parent details.');
      return;
    }

    const calculatedCustomTranches: CustomStudentTranche[] = agrTranches.map((t, idx) => {
      const trancheAmt = Math.round((agrTotalAmount * t.percentage) / 100);
      return {
        trancheNumber: idx + 1,
        name: t.name,
        amount: trancheAmt,
        percentage: t.percentage,
        dueDate: t.dueDate,
        status: 'due',
        paidAmount: 0,
        clearanceMilestone: t.milestone
      };
    });

    const newAgreement: StudentInstallmentAgreement = {
      id: `agr-cust-${Date.now()}`,
      studentId: selectedStudentForAgr || `std-cust-${Date.now()}`,
      studentName: agrStudentName,
      admissionNumber: agrAdmNo || `CF/2024/${agrClassGrade.replace(' ', '')}/099`,
      classGrade: agrClassGrade,
      invoiceId: `inv-cust-${Date.now()}`,
      invoiceNumber: `INV-2026-T3-${Math.floor(100 + Math.random() * 900)}`,
      parentName: agrParentName,
      parentPhone: agrParentPhone || '+234 800 000 0000',
      parentEmail: 'parent@curriculumflow.edu.ng',
      totalInvoiceAmount: agrTotalAmount,
      agreedPlanType: agrPlanType,
      customTranches: calculatedCustomTranches,
      principalApprovalStatus: 'approved',
      approvedByPrincipalName: currentUser.name || 'Dr. (Mrs.) Folashade Adeleke, Ph.D',
      approvedAt: new Date().toISOString(),
      specialNotes: agrSpecialNotes || 'Principal Hardship Concession approved in council.',
      createdAt: new Date().toISOString()
    };

    onUpdateAgreements([newAgreement, ...agreements]);
    setShowNewAgreementModal(false);
    showToast(`Special installment plan for ${agrStudentName} created and approved by Principal!`);
  };

  // Student selection for auto-fill
  const handleSelectStudentForAgr = (studentId: string) => {
    setSelectedStudentForAgr(studentId);
    const inv = invoices.find(i => i.studentId === studentId);
    if (inv) {
      setAgrStudentName(inv.studentName);
      setAgrAdmNo(inv.admissionNumber);
      setAgrClassGrade(inv.classGrade);
      setAgrParentName(inv.parentName);
      setAgrParentPhone(inv.parentPhone);
      setAgrTotalAmount(inv.totalAmount);
    }
  };

  return (
    <div id="installment-policy-manager-container" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-emerald-200 border border-emerald-500/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card: Principal Governance Authorization Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
          <ShieldCheck className="w-32 h-32 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Principal Executive Authority
              </span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-xs font-mono">
                Session: {draftPolicy.academicSession} • {draftPolicy.term}
              </span>
              {draftPolicy.isActive ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Policy Active & Enforced
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-xs font-medium">
                  Policy Suspended
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              School Fee Installment Payment Policy & Academic Clearance Framework
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Define statutory fee milestone splits, minimum resumption deposits, automated CBT/exam lockout gates, grace periods, and late surcharge rules promulgated by the Principal for institutional fee collections.
            </p>
          </div>

          {/* Principal Verification Stamp / Mode Controls */}
          <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-xl flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Policy Promulgator</div>
                  <div className="text-xs font-bold text-white">{policy.principalApproval.principalName}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  SEALED
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Digital Auth Hash:</span>
              <span className="font-mono text-amber-300 text-[10px] truncate max-w-[130px]" title={policy.principalApproval.digitalSignatureHash}>
                {policy.principalApproval.digitalSignatureHash.substring(0, 16)}...
              </span>
            </div>

            {/* Quick Toggle for Simulator if not actual Principal */}
            {!isActualPrincipal && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Principal Mode:</span>
                <button
                  onClick={() => {
                    setSimulatedPrincipalMode(!simulatedPrincipalMode);
                    showToast(simulatedPrincipalMode ? 'Switched to Read-Only Viewer mode' : 'Principal Governance Edit Mode enabled for preview');
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                    simulatedPrincipalMode
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  {simulatedPrincipalMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {simulatedPrincipalMode ? 'Editing as Principal' : 'Enable Edit Simulator'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('policy_editor')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'policy_editor'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Policy Parameters & Tranches</span>
          </button>

          <button
            onClick={() => setActiveTab('student_agreements')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'student_agreements'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Special Hardship Agreements ({agreements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('circular_preview')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'circular_preview'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Official Policy Circular & Notice</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_trail')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit_trail'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Revision Audit Trail ({policy.auditTrail.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. POLICY EDITOR VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'policy_editor' && (
        <div className="space-y-6">
          {/* Read-Only Warning if not in Edit Mode */}
          {!canEdit && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-xl flex items-center justify-between text-amber-200 text-sm">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  You are viewing the Principal's Installment Payment Policy in <strong>Read-Only Governance Mode</strong>. Only authorized Principals may commit policy changes.
                </span>
              </div>
              <button
                onClick={() => setSimulatedPrincipalMode(true)}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs hover:bg-amber-400 transition"
              >
                Enable Principal Mode
              </button>
            </div>
          )}

          {/* Preset Selection & Quick Setup */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Select Institutional Tranche Structure
                </h3>
                <p className="text-xs text-slate-400">
                  Switch between established academic split models or customize individual tranche percentages.
                </p>
              </div>

              {hasUnsavedChanges && canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDraft}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSavePolicy}
                    disabled={!validation.isValid}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition ${
                      validation.isValid
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Promulgate & Save Policy
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {(Object.keys(PRESET_TRANCHE_TEMPLATES) as InstallmentPresetType[]).map(presetKey => {
                const template = PRESET_TRANCHE_TEMPLATES[presetKey];
                const isSelected = draftPolicy.presetType === presetKey;
                return (
                  <button
                    key={presetKey}
                    disabled={!canEdit}
                    onClick={() => handleApplyPreset(presetKey)}
                    className={`p-4 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    } ${!canEdit ? 'opacity-80 cursor-default' : ''}`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                    <div className="font-bold text-sm text-white mb-1">{template.name}</div>
                    <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {template.description}
                    </div>
                    <div className="text-[11px] font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30 inline-block">
                      Min Deposit: {template.minDeposit}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Policy Rules & Threshold Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: General Parameters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg lg:col-span-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-amber-400" />
                Principal Governance Parameters & Timelines
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Policy Title / Official Code
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draftPolicy.policyTitle}
                    onChange={e => {
                      setDraftPolicy(p => ({ ...p, policyTitle: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Installment Option Status
                  </label>
                  <div className="flex items-center gap-3 h-[42px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={draftPolicy.allowInstallmentPayments}
                        onChange={e => {
                          setDraftPolicy(p => ({ ...p, allowInstallmentPayments: e.target.checked }));
                          setHasUnsavedChanges(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      <span className="ml-3 text-xs font-medium text-slate-300">
                        {draftPolicy.allowInstallmentPayments ? 'Parents Can Pay in Installments' : 'Full 100% Upfront Mandatory'}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Minimum Resumption Deposit (%)</span>
                    <span className="text-amber-400 font-mono font-bold">{draftPolicy.minimumInitialDepositPercent}%</span>
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    disabled={!canEdit}
                    value={draftPolicy.minimumInitialDepositPercent}
                    onChange={e => {
                      setDraftPolicy(p => ({ ...p, minimumInitialDepositPercent: Number(e.target.value) }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>20% (Concession)</span>
                    <span>50% (Standard)</span>
                    <span>100% (Strict)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Grace Period Post-Deadline</span>
                    <span className="text-amber-400 font-mono font-bold">{draftPolicy.gracePeriodDays} Days</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    disabled={!canEdit}
                    value={draftPolicy.gracePeriodDays}
                    onChange={e => {
                      setDraftPolicy(p => ({ ...p, gracePeriodDays: Number(e.target.value) }));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>0 Days (Immediate lock)</span>
                    <span>7 Days (Standard)</span>
                    <span>14+ Days</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Late Payment Administrative Surcharge
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="25"
                      disabled={!canEdit || !draftPolicy.enableLatePenalties}
                      value={draftPolicy.latePenaltyRatePercent}
                      onChange={e => {
                        setDraftPolicy(p => ({ ...p, latePenaltyRatePercent: Number(e.target.value) }));
                        setHasUnsavedChanges(true);
                      }}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                    <span className="text-xs text-slate-400">% surcharge applied past grace period</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Principal Discretion Hardship Override
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={draftPolicy.hardshipDiscretionAllowed}
                      onChange={e => {
                        setDraftPolicy(p => ({ ...p, hardshipDiscretionAllowed: e.target.checked }));
                        setHasUnsavedChanges(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    <span className="ml-3 text-xs font-medium text-slate-300">
                      Allow Custom Indigent Concessions
                    </span>
                  </label>
                </div>
              </div>

              {/* Automatic Academic Clearance Gate Thresholds */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Automated Academic Clearance Gate Thresholds
                  </div>
                  <span className="text-[11px] text-slate-400">Controls biometric & LMS test access</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-xs font-medium text-slate-300 mb-1">
                      Mid-Term CBT & CA Test Clearance Gate
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        disabled={!canEdit}
                        value={draftPolicy.midtermClearanceMinimumPercent}
                        onChange={e => {
                          setDraftPolicy(p => ({ ...p, midtermClearanceMinimumPercent: Number(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400">% cumulative payment required</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Students below {draftPolicy.midtermClearanceMinimumPercent}% trigger CA exam docket hold.
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-300 mb-1">
                      Terminal Exams & Broadsheet Result Gate
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="80"
                        max="100"
                        disabled={!canEdit}
                        value={draftPolicy.finalExamClearanceMinimumPercent}
                        onChange={e => {
                          setDraftPolicy(p => ({ ...p, finalExamClearanceMinimumPercent: Number(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-slate-400">% full settlement required</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Full 100% liquidation required for official report card publication.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Fee Calculation & Split Sandbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Live Tranche Split Calculator
                  </h3>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    REALTIME
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Simulate Total Term School Fees (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₦</span>
                    <input
                      type="number"
                      step="1000"
                      value={simulationFeeAmount}
                      onChange={e => setSimulationFeeAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSimulationFeeAmount(173000)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                    >
                      Senior Sec (₦173k)
                    </button>
                    <button
                      onClick={() => setSimulationFeeAmount(135000)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                    >
                      Junior Sec (₦135k)
                    </button>
                    <button
                      onClick={() => setSimulationFeeAmount(218000)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                    >
                      Boarding/WAEC (₦218k)
                    </button>
                  </div>
                </div>

                {/* Split Breakdown */}
                <div className="space-y-2 pt-2">
                  {calculateInstallmentSplit(simulationFeeAmount, draftPolicy.tranches).map((split, idx) => (
                    <div
                      key={split.tranche.id || idx}
                      className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          {split.tranche.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Due: {split.tranche.dueDate} ({split.tranche.deadlineWeek})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          ₦{split.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {split.percentage}% of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Percentage Status Bar */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Tranches Allocation:</span>
                  <span className={`font-mono font-bold ${validation.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {validation.sumPercentage}% / 100%
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      validation.isValid ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, validation.sumPercentage)}%` }}
                  />
                </div>

                {!validation.isValid && (
                  <div className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validation.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Editable Tranches Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Installment Tranches & Clearance Scope Editor
                </h3>
                <p className="text-xs text-slate-400">
                  Configure the precise milestone breakdown, due dates, and academic clearance unlocked for each installment tranche.
                </p>
              </div>

              {canEdit && (
                <button
                  onClick={handleAddTranche}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Tranche
                </button>
              )}
            </div>

            <div className="space-y-3">
              {draftPolicy.tranches.map((tranche, idx) => (
                <div
                  key={tranche.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Tranche Number & Name */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-bold flex items-center justify-center text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Tranche Title</label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={tranche.name}
                          onChange={e => handleUpdateTranche(tranche.id, { name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-medium focus:outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Percentage & Surcharge */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-28">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Split Ratio (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            disabled={!canEdit}
                            value={tranche.percentage}
                            onChange={e => handleUpdateTranche(tranche.id, { percentage: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 disabled:opacity-60 pr-7"
                          />
                          <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">%</span>
                        </div>
                      </div>

                      <div className="w-36">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Academic Week</label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={tranche.deadlineWeek}
                          onChange={e => handleUpdateTranche(tranche.id, { deadlineWeek: e.target.value })}
                          placeholder="e.g. Week 1"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      <div className="w-36">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Due Date</label>
                        <input
                          type="date"
                          disabled={!canEdit}
                          value={tranche.dueDate}
                          onChange={e => handleUpdateTranche(tranche.id, { dueDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      {canEdit && draftPolicy.tranches.length > 1 && (
                        <button
                          onClick={() => handleRemoveTranche(tranche.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition self-end lg:self-center"
                          title="Remove tranche"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Academic Clearance Unlocked & Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-400" />
                        Academic Clearance Unlocked with this Tranche
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={tranche.academicClearanceScope}
                        onChange={e => handleUpdateTranche(tranche.id, { academicClearanceScope: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
                        <Info className="w-3 h-3 text-blue-400" />
                        Bursary Enforcement Note
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={tranche.description}
                        onChange={e => handleUpdateTranche(tranche.id, { description: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Promulgation Bar */}
            {canEdit && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Saving will apply this installment framework to all future student bills and gateway invoices.</span>
                </div>

                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleResetDraft}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                    >
                      Reset Draft
                    </button>
                  )}
                  <button
                    onClick={handleSavePolicy}
                    disabled={!validation.isValid}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition ${
                      validation.isValid
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Promulgate & Authorize Policy (Principal Seal)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SPECIAL STUDENT HARDSHIP & CONCESSION AGREEMENTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'student_agreements' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Special Installment Agreements & Hardship Concessions
                </h3>
                <p className="text-xs text-slate-400">
                  Students with authorized individualized payment agreements approved directly under the Principal's executive discretion.
                </p>
              </div>

              {canEdit && (
                <button
                  onClick={() => setShowNewAgreementModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Hardship Agreement
                </button>
              )}
            </div>

            {/* Agreements Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {agreements.map(agr => (
                <div
                  key={agr.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-4 shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{agr.studentName}</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-mono rounded">
                          {agr.classGrade}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Adm: <span className="font-mono text-slate-300">{agr.admissionNumber}</span> • Parent: {agr.parentName}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Approved by Principal
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        Inv: {agr.invoiceNumber}
                      </div>
                    </div>
                  </div>

                  {/* Total Bill and Plan Type */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Agreement Type:</span>
                      <span className="font-bold text-amber-300">
                        {agr.agreedPlanType === 'custom_hardship_plan' ? 'Custom Hardship Plan' : 'Standard 3-Tranche Plan'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Total Billed:</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ₦{agr.totalInvoiceAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Tranches Progress */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Tranche Liquidation Milestones
                    </div>

                    <div className="space-y-2">
                      {agr.customTranches.map(t => (
                        <div
                          key={t.trancheNumber}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                            t.status === 'paid'
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold flex items-center gap-1.5">
                              {t.status === 'paid' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              {t.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Clearance: {t.clearanceMilestone}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold">
                              ₦{t.amount.toLocaleString()}
                            </div>
                            <div className="text-[10px]">
                              {t.status === 'paid' ? (
                                <span className="text-emerald-400 font-semibold">PAID ({t.paidDate})</span>
                              ) : (
                                <span className="text-amber-400">Due {t.dueDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Notes & Sign-off */}
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="italic text-slate-400 line-clamp-1 max-w-[280px]">
                      "{agr.specialNotes}"
                    </div>
                    <div className="text-[10px] font-mono text-amber-300">
                      Sign-off: {agr.approvedByPrincipalName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. OFFICIAL POLICY CIRCULAR & PARENT NOTICE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'circular_preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Official Fee Payment Circular & Policy Notice
              </h3>
              <p className="text-xs text-slate-400">
                Institutional memo for parents and guardians detailing installment dates, payment channels, and clearance rules.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Print Policy Memo
            </button>
          </div>

          {/* Printable Circular Card */}
          <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-xl max-w-4xl mx-auto border border-slate-200 font-sans space-y-6">
            {/* Header with Crest */}
            <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 mb-1 shadow-lg">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                CurriculumFlow Model College & International Academy
              </h1>
              <p className="text-xs text-slate-600 font-serif italic">
                Office of the Principal & Chief Administrator • Council of Governors
              </p>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-widest pt-1">
                MEMORANDUM & DIRECTIVE • REF: CF/PRIN/FIN/{new Date().getFullYear()}/04
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>TO:</strong> All Parents, Guardians & Sponsoring Organizations</div>
                <div><strong>FROM:</strong> The Principal / Chief Executive Officer</div>
                <div><strong>DATE:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div><strong>SESSION:</strong> {policy.academicSession} ({policy.term})</div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                SUBJECT: STATUTORY SCHOOL FEE INSTALLMENT PAYMENT POLICY & ACADEMIC CLEARANCE PROTOCOLS
              </div>
            </div>

            {/* Tranche Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Statutory Fee Installment Tranche Schedule ({policy.presetType.toUpperCase()})
              </h4>
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-2.5 border border-slate-700">Tranche</th>
                    <th className="p-2.5 border border-slate-700">Ratio (%)</th>
                    <th className="p-2.5 border border-slate-700">Due Week / Date</th>
                    <th className="p-2.5 border border-slate-700">Academic Clearance Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.tranches.map((t, idx) => (
                    <tr key={t.id} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="p-2.5 font-bold border border-slate-300">{t.name}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800 border border-slate-300">{t.percentage}%</td>
                      <td className="p-2.5 border border-slate-300">{t.deadlineWeek} ({t.dueDate})</td>
                      <td className="p-2.5 border border-slate-300">{t.academicClearanceScope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Institutional Clauses */}
            <div className="space-y-2 text-xs leading-relaxed text-slate-700">
              <h4 className="font-bold uppercase tracking-wider text-slate-800">
                2. Executive Governance & Enforcement Clauses
              </h4>
              <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px]">
                {policy.policyGuidelines}
              </div>
            </div>

            {/* Sign-off & Seal */}
            <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="font-serif italic text-base text-slate-900 font-bold">
                  {policy.principalApproval.principalName}
                </div>
                <div className="font-bold text-slate-800">Principal & Chief Administrator</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Authorization Stamp: {policy.principalApproval.approvalStamp}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="w-20 h-20 border-2 border-emerald-600 rounded-full inline-flex items-center justify-center p-2 text-center text-[8px] font-bold text-emerald-700 uppercase tracking-tighter transform -rotate-12">
                  OFFICIAL PRINCIPAL SEAL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. REVISION AUDIT TRAIL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit_trail' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Principal Installment Policy Revision History & Cryptographic Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Tamper-evident audit log of all financial policy updates, timeline extensions, and ratio adjustments.
            </p>
          </div>

          <div className="space-y-3">
            {policy.auditTrail.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-bold text-white text-xs">{entry.modifiedBy}</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-semibold uppercase">
                      {entry.modifierRole}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-4 border-l-2 border-amber-500/40">
                  {entry.changeSummary}
                </p>

                <div className="text-[10px] text-slate-500 font-mono pt-1 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Digital Signature:</span>
                  <span className="text-amber-400/80">{entry.signatureHash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE SPECIAL HARDSHIP AGREEMENT */}
      {/* ------------------------------------------------------------- */}
      {showNewAgreementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Custom Installment Agreement</h3>
                  <p className="text-xs text-slate-400">Principal Special Concession & Hardship Override</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewAgreementModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Student Selection */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Existing Enrolled Student / Invoice
                </label>
                <select
                  value={selectedStudentForAgr}
                  onChange={e => handleSelectStudentForAgr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Student or enter manually below --</option>
                  {invoices.map(inv => (
                    <option key={inv.studentId} value={inv.studentId}>
                      {inv.studentName} ({inv.classGrade}) - ₦{inv.totalAmount.toLocaleString()} - {inv.parentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    value={agrStudentName}
                    onChange={e => setAgrStudentName(e.target.value)}
                    placeholder="e.g. Ibrahim Yusuf"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={agrAdmNo}
                    onChange={e => setAgrAdmNo(e.target.value)}
                    placeholder="CF/2024/SS2/004"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Parent / Sponsor Name</label>
                  <input
                    type="text"
                    value={agrParentName}
                    onChange={e => setAgrParentName(e.target.value)}
                    placeholder="Hajiya Fatima Yusuf"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Phone Number</label>
                  <input
                    type="text"
                    value={agrParentPhone}
                    onChange={e => setAgrParentPhone(e.target.value)}
                    placeholder="+234 809 333 4455"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Total Fee Amount (₦)</label>
                  <input
                    type="number"
                    value={agrTotalAmount}
                    onChange={e => setAgrTotalAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Agreement Classification</label>
                  <select
                    value={agrPlanType}
                    onChange={e => setAgrPlanType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="custom_hardship_plan">Indigent Hardship Concession</option>
                    <option value="staff_concession">Faculty / Staff Ward Concession</option>
                  </select>
                </div>
              </div>

              {/* Custom Tranches Configuration */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Custom Tranches Breakdown</span>
                  <span className="font-mono text-amber-400">
                    Total: {agrTranches.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0)}% / 100%
                  </span>
                </div>

                <div className="space-y-2">
                  {agrTranches.map((t, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <input
                        type="text"
                        value={t.name}
                        onChange={e => {
                          const val = e.target.value;
                          setAgrTranches(tr => tr.map((item, i) => i === idx ? { ...item, name: val } : item));
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white sm:col-span-2"
                        placeholder="Tranche Name"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={t.percentage}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setAgrTranches(tr => tr.map((item, i) => i === idx ? { ...item, percentage: val } : item));
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-mono font-bold w-16"
                        />
                        <span className="text-slate-400 font-mono">%</span>
                      </div>
                      <input
                        type="date"
                        value={t.dueDate}
                        onChange={e => {
                          const val = e.target.value;
                          setAgrTranches(tr => tr.map((item, i) => i === idx ? { ...item, dueDate: val } : item));
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Principal Special Discretion Justification
                </label>
                <textarea
                  rows={2}
                  value={agrSpecialNotes}
                  onChange={e => setAgrSpecialNotes(e.target.value)}
                  placeholder="State reason for concession (e.g. Verified family medical emergency with staggered salary repayment commitment)."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowNewAgreementModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgreement}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Sign & Authorize Custom Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
