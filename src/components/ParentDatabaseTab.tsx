import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  ParentGuardianProfile, 
  StudentWardMapping, 
  ParentRelationshipType, 
  PrincipalVerificationStatus,
  ParentAuditLog,
  SchoolBrandProfile
} from '../types';
import { 
  INITIAL_PARENTS_DATABASE, 
  INITIAL_PARENT_AUDIT_LOGS 
} from '../data/parentDatabaseData';
import { 
  INITIAL_STUDENT_INSTITUTIONAL_PROFILES 
} from '../data/userProfilesData';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserPlus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Unlock, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Printer, 
  Download, 
  QrCode, 
  ScanFace, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  X, 
  Check, 
  Save, 
  FileText, 
  MessageSquare, 
  Send,
  Building2,
  KeyRound,
  IdCard,
  History,
  ShieldAlert
} from 'lucide-react';

interface ParentDatabaseTabProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  initialSelectedParentId?: string;
  onNavigateTab: (tab: any) => void;
}

export const ParentDatabaseTab: React.FC<ParentDatabaseTabProps> = ({
  currentUser,
  brandProfile,
  initialSelectedParentId,
  onNavigateTab
}) => {
  // State
  const [parents, setParents] = useState<ParentGuardianProfile[]>(INITIAL_PARENTS_DATABASE);
  const [auditLogs, setAuditLogs] = useState<ParentAuditLog[]>(INITIAL_PARENT_AUDIT_LOGS);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerificationFilter, setSelectedVerificationFilter] = useState<string>('all');
  const [selectedPtaFilter, setSelectedPtaFilter] = useState<string>('all');
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState<string>('all');

  // Modals
  const [selectedParentForDetails, setSelectedParentForDetails] = useState<ParentGuardianProfile | null>(null);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentGuardianProfile | null>(null);
  const [showLinkWardModal, setShowLinkWardModal] = useState<ParentGuardianProfile | null>(null);
  const [showPickupVerifyModal, setShowPickupVerifyModal] = useState(false);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [pickupVerifyResult, setPickupVerifyResult] = useState<ParentGuardianProfile | null | 'not_found'>(null);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Parent Form State
  const [newParentTitle, setNewParentTitle] = useState('Mr.');
  const [newParentName, setNewParentName] = useState('');
  const [newParentGender, setNewParentGender] = useState<'Male' | 'Female'>('Male');
  const [newParentOccupation, setNewParentOccupation] = useState('');
  const [newParentEmployer, setNewParentEmployer] = useState('');
  const [newParentAddress, setNewParentAddress] = useState('');
  const [newParentStateOfOrigin, setNewParentStateOfOrigin] = useState('Lagos State');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentAltPhone, setNewParentAltPhone] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentContactChannel, setNewParentContactChannel] = useState<'whatsapp' | 'sms' | 'email' | 'phone_call'>('whatsapp');
  const [newParentMaritalStatus, setNewParentMaritalStatus] = useState<'Married' | 'Single' | 'Widowed' | 'Divorced'>('Married');
  const [newParentPtaRole, setNewParentPtaRole] = useState<'General Member' | 'PTA Executive (Chairman)' | 'PTA Executive (Treasurer)' | 'PTA Committee Member' | 'Patron'>('General Member');
  const [newParentNotes, setNewParentNotes] = useState('');

  // Link Ward Form State
  const [selectedStudentIdToLink, setSelectedStudentIdToLink] = useState('stu-ss2-001');
  const [wardRelationship, setWardRelationship] = useState<ParentRelationshipType>('Father');
  const [wardIsPrimary, setWardIsPrimary] = useState(true);
  const [wardHasPickup, setWardHasPickup] = useState(true);
  const [wardEmergencyPriority, setWardEmergencyPriority] = useState<1 | 2 | 3>(1);
  const [wardReceiveReports, setWardReceiveReports] = useState(true);
  const [wardReceiveInvoices, setWardReceiveInvoices] = useState(true);
  const [wardNotes, setWardNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Parents
  const filteredParents = useMemo(() => {
    return parents.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = p.fullName.toLowerCase().includes(q) ||
        p.parentCode.toLowerCase().includes(q) ||
        p.primaryPhone.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.occupation.toLowerCase().includes(q) ||
        p.wards.some(w => w.studentName.toLowerCase().includes(q) || w.admissionNumber.toLowerCase().includes(q));

      const matchesVerification = selectedVerificationFilter === 'all' || p.supervisedVerificationStatus === selectedVerificationFilter;
      const matchesPta = selectedPtaFilter === 'all' || p.ptaMemberCategory === selectedPtaFilter;
      const matchesPayment = selectedPaymentStatusFilter === 'all' || p.feePaymentStatus === selectedPaymentStatusFilter;

      return matchesSearch && matchesVerification && matchesPta && matchesPayment;
    });
  }, [parents, searchQuery, selectedVerificationFilter, selectedPtaFilter, selectedPaymentStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalParents = parents.length;
    const totalWardsMapped = parents.reduce((sum, p) => sum + p.wards.length, 0);
    const verifiedCount = parents.filter(p => p.supervisedVerificationStatus === 'verified_by_principal').length;
    const pendingCount = parents.filter(p => p.supervisedVerificationStatus === 'pending_verification').length;
    const flaggedCount = parents.filter(p => p.isFlaggedForSecurity || p.supervisedVerificationStatus === 'flagged_restricted').length;
    return {
      totalParents,
      totalWardsMapped,
      verifiedCount,
      pendingCount,
      flaggedCount,
      verifiedPercentage: totalParents > 0 ? Math.round((verifiedCount / totalParents) * 100) : 0
    };
  }, [parents]);

  // Handlers
  const handleToggleVerification = (parentId: string) => {
    setParents(prev => prev.map(p => {
      if (p.id === parentId) {
        const nextStatus: PrincipalVerificationStatus = 
          p.supervisedVerificationStatus === 'verified_by_principal'
            ? 'pending_verification'
            : 'verified_by_principal';

        const updated = {
          ...p,
          supervisedVerificationStatus: nextStatus,
          verifiedByPrincipalName: nextStatus === 'verified_by_principal' ? (currentUser.name || 'Dr. (Mrs.) Funke Adeyemi') : undefined,
          verificationDate: nextStatus === 'verified_by_principal' ? new Date().toISOString().split('T')[0] : undefined
        };

        // Add audit log
        const newLog: ParentAuditLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: nextStatus === 'verified_by_principal' ? 'principal_verified' : 'profile_updated',
          actorName: `${currentUser.name} (${currentUser.title})`,
          actorRole: currentUser.role,
          parentId: p.id,
          parentName: p.fullName,
          details: nextStatus === 'verified_by_principal'
            ? `Officially endorsed and verified by Office of the Principal.`
            : `Set back to pending verification for credential re-audit.`
        };
        setAuditLogs(l => [newLog, ...l]);

        return updated;
      }
      return p;
    }));

    showToast('Principal verification status updated.');
  };

  const handleTogglePickupRestriction = (parentId: string) => {
    setParents(prev => prev.map(p => {
      if (p.id === parentId) {
        const nextFlag = !p.isFlaggedForSecurity;
        const nextStatus: PrincipalVerificationStatus = nextFlag ? 'flagged_restricted' : 'verified_by_principal';

        const updated = {
          ...p,
          isFlaggedForSecurity: nextFlag,
          supervisedVerificationStatus: nextStatus,
          securityFlagReason: nextFlag ? 'Restricted pickup per Principal Administrative Order.' : undefined
        };

        const newLog: ParentAuditLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: nextFlag ? 'security_flagged' : 'pickup_authorized',
          actorName: `${currentUser.name} (${currentUser.title})`,
          actorRole: currentUser.role,
          parentId: p.id,
          parentName: p.fullName,
          details: nextFlag ? 'Restricted campus pickup order applied.' : 'Pickup restriction cleared by Principal.'
        };
        setAuditLogs(l => [newLog, ...l]);

        return updated;
      }
      return p;
    }));

    showToast('Pickup security status updated.');
  };

  const handleAddParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentName.trim() || !newParentPhone.trim()) {
      showToast('Please enter Parent full name and primary telephone number.');
      return;
    }

    const newCode = `PAR-2026-${String(parents.length + 1).padStart(3, '0')}`;
    const newId = `par-${Date.now()}`;
    const newParent: ParentGuardianProfile = {
      id: newId,
      parentCode: newCode,
      title: newParentTitle,
      fullName: newParentName.trim(),
      gender: newParentGender,
      avatar: newParentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      occupation: newParentOccupation.trim() || 'Professional',
      employerOrBusiness: newParentEmployer.trim() || 'Private Enterprise',
      residentialAddress: newParentAddress.trim() || 'Lagos State, Nigeria',
      stateOfOrigin: newParentStateOfOrigin,
      primaryPhone: newParentPhone.trim(),
      alternatePhone: newParentAltPhone.trim() || undefined,
      whatsappPhone: newParentPhone.trim(),
      email: newParentEmail.trim() || `${newParentName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      preferredContactChannel: newParentContactChannel,
      maritalStatus: newParentMaritalStatus,
      ptaMemberCategory: newParentPtaRole,
      portalAccessStatus: 'invitation_sent',
      portalAccessCode: `PORTAL-${newCode.replace('-', '')}`,
      feePaymentStatus: 'fully_cleared',
      totalOutstandingBalance: 0,
      pickupAuthorizationCode: `PCK-${Math.floor(1000 + Math.random() * 9000)}-${newCode.split('-')[2]}`,
      biometricEnrolled: false,
      supervisedVerificationStatus: 'verified_by_principal',
      verifiedByPrincipalName: currentUser.name || 'Dr. (Mrs.) Funke Adeyemi',
      verificationDate: new Date().toISOString().split('T')[0],
      principalSupervisionNotes: newParentNotes.trim() || 'Newly enrolled parent profile approved by Office of the Principal.',
      isFlaggedForSecurity: false,
      wards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setParents(prev => [newParent, ...prev]);

    // Audit Log
    const newLog: ParentAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'parent_created',
      actorName: `${currentUser.name} (${currentUser.title})`,
      actorRole: currentUser.role,
      parentId: newId,
      parentName: newParent.fullName,
      details: `Enrolled new parent profile (${newCode}) with verified Principal credentials.`
    };
    setAuditLogs(l => [newLog, ...l]);

    setShowAddParentModal(false);
    showToast(`Parent profile ${newParent.fullName} created successfully.`);

    // Reset Form
    setNewParentName('');
    setNewParentPhone('');
    setNewParentAltPhone('');
    setNewParentEmail('');
    setNewParentOccupation('');
    setNewParentEmployer('');
    setNewParentAddress('');
    setNewParentNotes('');
  };

  const handleLinkWardToParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLinkWardModal) return;

    const targetStudent = INITIAL_STUDENT_INSTITUTIONAL_PROFILES.find(s => s.id === selectedStudentIdToLink);
    if (!targetStudent) {
      showToast('Selected student not found in registry.');
      return;
    }

    const newWardMapping: StudentWardMapping = {
      studentId: targetStudent.id,
      studentName: targetStudent.fullName,
      admissionNumber: targetStudent.admissionNumber,
      classGroupName: targetStudent.classGroupName,
      classGrade: targetStudent.classGrade,
      relationship: wardRelationship,
      isPrimaryGuardian: wardIsPrimary,
      isAuthorizedPickup: wardHasPickup,
      emergencyPriority: wardEmergencyPriority,
      canReceiveReportCards: wardReceiveReports,
      canReceiveFeeInvoices: wardReceiveInvoices,
      verifiedByPrincipal: true,
      verifiedDate: new Date().toISOString().split('T')[0],
      notes: wardNotes.trim() || 'Mapped by Principal Admin Supervision.'
    };

    setParents(prev => prev.map(p => {
      if (p.id === showLinkWardModal.id) {
        // Prevent duplicate mapping
        const filteredWards = p.wards.filter(w => w.studentId !== targetStudent.id);
        return {
          ...p,
          wards: [...filteredWards, newWardMapping],
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    // Audit Log
    const newLog: ParentAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'ward_linked',
      actorName: `${currentUser.name} (${currentUser.title})`,
      actorRole: currentUser.role,
      parentId: showLinkWardModal.id,
      parentName: showLinkWardModal.fullName,
      details: `Mapped ward ${targetStudent.fullName} (${targetStudent.admissionNumber}) to parent as ${wardRelationship}.`
    };
    setAuditLogs(l => [newLog, ...l]);

    setShowLinkWardModal(null);
    showToast(`Ward ${targetStudent.fullName} linked to ${showLinkWardModal.fullName}.`);
  };

  const handleUnlinkWard = (parentId: string, studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ward ${studentName} from this parent profile?`)) return;

    setParents(prev => prev.map(p => {
      if (p.id === parentId) {
        return {
          ...p,
          wards: p.wards.filter(w => w.studentId !== studentId),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    const newLog: ParentAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'ward_unlinked',
      actorName: `${currentUser.name} (${currentUser.title})`,
      actorRole: currentUser.role,
      parentId: parentId,
      parentName: 'Parent',
      details: `Unlinked ward ${studentName} from parent profile.`
    };
    setAuditLogs(l => [newLog, ...l]);

    showToast(`Ward unlinked successfully.`);
  };

  const handleVerifyPickupCode = () => {
    if (!pickupCodeInput.trim()) return;
    const cleanCode = pickupCodeInput.trim().toUpperCase();
    const match = parents.find(p => p.pickupAuthorizationCode.toUpperCase() === cleanCode);
    if (match) {
      setPickupVerifyResult(match);
    } else {
      setPickupVerifyResult('not_found');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 text-sm font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Principal Supervisory Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-600/15 via-emerald-600/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Office of the Principal (Supreme Supervision)</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>Verified Parents & Guardians Registry</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Parents Database & Student Ward Mapping
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Supervised under the direct executive authority of the Office of the Principal. Maintain verified parent credentials, multi-child ward mappings across classes, emergency contacts, gate pickup authorization passes, and PTA leadership records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddParentModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll New Parent</span>
            </button>

            <button
              onClick={() => {
                setShowPickupVerifyModal(true);
                setPickupCodeInput('');
                setPickupVerifyResult(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <ScanFace className="w-4 h-4 text-sky-400" />
              <span>Gate Pickup Verification</span>
            </button>

            <button
              onClick={() => setShowAuditLogsModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-purple-400" />
              <span>Supervisory Logs</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Total Enrolled</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.totalParents} Parents</div>
            <div className="text-[11px] text-slate-400">Master Parent DB</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mapped Wards</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.totalWardsMapped} Students</div>
            <div className="text-[11px] text-slate-400">Across JSS 1 - SS 3</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Principal Verified</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.verifiedCount} ({stats.verifiedPercentage}%)</div>
            <div className="text-[11px] text-emerald-400">Verified by Principal</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.pendingCount} Parents</div>
            <div className="text-[11px] text-slate-400">Awaiting Interview</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security / Flags</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{stats.flaggedCount} Cases</div>
            <div className="text-[11px] text-rose-300">Restricted Pickup</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by parent name, code (PAR-...), phone, email, occupation, or ward name/admission no..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedVerificationFilter}
              onChange={(e) => setSelectedVerificationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Verification Statuses</option>
              <option value="verified_by_principal">Verified by Principal</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="flagged_restricted">Flagged / Restricted</option>
            </select>

            <select
              value={selectedPtaFilter}
              onChange={(e) => setSelectedPtaFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All PTA Roles</option>
              <option value="PTA Executive (Chairman)">PTA Chairman</option>
              <option value="PTA Executive (Treasurer)">PTA Treasurer</option>
              <option value="PTA Committee Member">Committee Member</option>
              <option value="Patron">Patron</option>
              <option value="General Member">General Member</option>
            </select>

            <select
              value={selectedPaymentStatusFilter}
              onChange={(e) => setSelectedPaymentStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Bursary Statuses</option>
              <option value="fully_cleared">Fully Cleared</option>
              <option value="installment_current">Installment Active</option>
              <option value="outstanding_arrears">Outstanding Arrears</option>
            </select>

            <button
              onClick={() => {
                window.print();
                showToast('Preparing Master PTA Directory for printing...');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span>Print PTA Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Parents Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredParents.map((parent) => {
          const isVerified = parent.supervisedVerificationStatus === 'verified_by_principal';
          const isFlagged = parent.isFlaggedForSecurity || parent.supervisedVerificationStatus === 'flagged_restricted';

          return (
            <div
              key={parent.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between relative group ${
                isFlagged 
                  ? 'border-rose-800/60 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900' 
                  : isVerified 
                    ? 'border-slate-800 hover:border-purple-700/50' 
                    : 'border-amber-800/40 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-purple-500/40 bg-slate-800">
                      <img 
                        src={parent.photoUrl} 
                        alt={parent.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isVerified && (
                      <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-md bg-purple-600 text-white text-[9px] font-black shadow">
                        VERIFIED
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                          {parent.parentCode}
                        </span>
                        {parent.ptaMemberCategory.includes('Executive') && (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                            {parent.ptaMemberCategory}
                          </span>
                        )}
                      </div>

                      {/* Verification Status Badge */}
                      {isVerified ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Principal Approved</span>
                        </span>
                      ) : isFlagged ? (
                        <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Restricted Custody</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Audit</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white truncate mt-1">
                      {parent.title} {parent.fullName}
                    </h3>
                    <p className="text-xs text-slate-300 truncate">
                      {parent.occupation} • <span className="text-slate-400">{parent.employerOrBusiness}</span>
                    </p>
                  </div>
                </div>

                {/* Contacts & Residence Grid */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-purple-400" />
                      <span>{parent.primaryPhone}</span>
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-sky-400" />
                      <span className="truncate max-w-[150px]">{parent.email}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span className="truncate max-w-[200px]">{parent.residentialAddress}</span>
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {parent.pickupAuthorizationCode}
                    </span>
                  </div>
                </div>

                {/* Mapped Wards Section */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Mapped Wards ({parent.wards.length})</span>
                    </span>
                    <button
                      onClick={() => setShowLinkWardModal(parent)}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Map Ward</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {parent.wards.map((ward) => (
                      <div
                        key={ward.studentId}
                        className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate">{ward.studentName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-800/40">
                              {ward.classGroupName}
                            </span>
                            <span className="text-[10px] text-slate-400">({ward.relationship})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Adm: {ward.admissionNumber}</span>
                            <span>•</span>
                            <span className={ward.isAuthorizedPickup ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {ward.isAuthorizedPickup ? 'Pickup Authorized' : 'Pickup Blocked'}
                            </span>
                            <span>•</span>
                            <span>Pri: #{ward.emergencyPriority}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlinkWard(parent.id, ward.studentId, ward.studentName)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-all"
                          title="Unlink ward"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {parent.wards.length === 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        No student wards mapped yet. Click "Map Ward" to attach student.
                      </div>
                    )}
                  </div>
                </div>

                {/* Principal Supervision Note */}
                {parent.principalSupervisionNotes && (
                  <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-300">Principal Supervision Note: </span>
                      {parent.principalSupervisionNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleVerification(parent.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isVerified
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{isVerified ? 'Principal Verified' : 'Verify by Principal'}</span>
                  </button>

                  <button
                    onClick={() => handleTogglePickupRestriction(parent.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isFlagged
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title="Toggle Pickup Restriction"
                  >
                    {isFlagged ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3 text-rose-400" />}
                    <span>{isFlagged ? 'Lift Restriction' : 'Restrict'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedParentForDetails(parent)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    Full Dossier
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADD PARENT MODAL                                              */}
      {/* ------------------------------------------------------------- */}
      {showAddParentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddParentModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-purple-600 text-white">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Enroll New Parent / Guardian</h3>
                <p className="text-xs text-slate-400">Office of Principal Supervised Registration</p>
              </div>
            </div>

            <form onSubmit={handleAddParent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Title</label>
                  <select
                    value={newParentTitle}
                    onChange={(e) => setNewParentTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Dr. (Mrs.)">Dr. (Mrs.)</option>
                    <option value="Chief">Chief</option>
                    <option value="Engr.">Engr.</option>
                    <option value="Barrister">Barrister</option>
                    <option value="Alhaji">Alhaji</option>
                    <option value="Hajia">Hajia</option>
                    <option value="Pastor">Pastor</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 font-semibold mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    placeholder="e.g. Babatunde Sanusi"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Primary Telephone (WhatsApp) *</label>
                  <input
                    type="text"
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Alternate Phone Number</label>
                  <input
                    type="text"
                    value={newParentAltPhone}
                    onChange={(e) => setNewParentAltPhone(e.target.value)}
                    placeholder="e.g. +234 802 999 8877"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Email Address</label>
                  <input
                    type="email"
                    value={newParentEmail}
                    onChange={(e) => setNewParentEmail(e.target.value)}
                    placeholder="e.g. b.sanusi@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Occupation / Profession</label>
                  <input
                    type="text"
                    value={newParentOccupation}
                    onChange={(e) => setNewParentOccupation(e.target.value)}
                    placeholder="e.g. Chartered Accountant, Civil Engineer"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Employer / Business Organization</label>
                  <input
                    type="text"
                    value={newParentEmployer}
                    onChange={(e) => setNewParentEmployer(e.target.value)}
                    placeholder="e.g. PwC Nigeria, Federal Ministry"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">PTA Membership Category</label>
                  <select
                    value={newParentPtaRole}
                    onChange={(e) => setNewParentPtaRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="General Member">General Member</option>
                    <option value="PTA Executive (Chairman)">PTA Executive (Chairman)</option>
                    <option value="PTA Executive (Treasurer)">PTA Executive (Treasurer)</option>
                    <option value="PTA Committee Member">PTA Committee Member</option>
                    <option value="Patron">Patron</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Residential Address</label>
                <input
                  type="text"
                  value={newParentAddress}
                  onChange={(e) => setNewParentAddress(e.target.value)}
                  placeholder="e.g. 18, Victoria Arobieke Street, Lekki Phase 1, Lagos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Principal Supervisory & Verification Remarks</label>
                <textarea
                  value={newParentNotes}
                  onChange={(e) => setNewParentNotes(e.target.value)}
                  placeholder="Enter executive notes regarding identity verification, custody agreements, or pickup authorizations..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddParentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Register & Verify Parent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LINK WARD TO PARENT MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {showLinkWardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowLinkWardModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Map Student Ward to Parent</h3>
                <p className="text-xs text-slate-400">Parent: <span className="text-purple-300 font-bold">{showLinkWardModal.title} {showLinkWardModal.fullName}</span></p>
              </div>
            </div>

            <form onSubmit={handleLinkWardToParent} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Select Enrolled Student *</label>
                <select
                  value={selectedStudentIdToLink}
                  onChange={(e) => setSelectedStudentIdToLink(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {INITIAL_STUDENT_INSTITUTIONAL_PROFILES.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.admissionNumber}) — {student.classGroupName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Relationship Type</label>
                  <select
                    value={wardRelationship}
                    onChange={(e) => setWardRelationship(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Uncle/Aunt">Uncle / Aunt</option>
                    <option value="Corporate Sponsor">Corporate Sponsor</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Emergency Priority</label>
                  <select
                    value={wardEmergencyPriority}
                    onChange={(e) => setWardEmergencyPriority(Number(e.target.value) as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1st Contact (Immediate)</option>
                    <option value={2}>2nd Contact (Secondary)</option>
                    <option value={3}>3rd Contact (Escalation)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={wardHasPickup}
                    onChange={(e) => setWardHasPickup(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Authorized for Campus Gate Pickup</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={wardReceiveReports}
                    onChange={(e) => setWardReceiveReports(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Receive Academic Terminal Report Cards</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={wardReceiveInvoices}
                    onChange={(e) => setWardReceiveInvoices(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Receive Termly Tuition Invoices & Bursary Notices</span>
                </label>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Mapping Notes & Special Authorizations</label>
                <input
                  type="text"
                  value={wardNotes}
                  onChange={(e) => setWardNotes(e.target.value)}
                  placeholder="e.g. Biological father; primary pickup contact"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLinkWardModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-950/50 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Ward Mapping</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GATE PICKUP VERIFICATION MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showPickupVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowPickupVerifyModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto mb-2">
                <ScanFace className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Campus Gate Pickup Verification</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scan or enter Parent Pickup Pass Code</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pickupCodeInput}
                  onChange={(e) => setPickupCodeInput(e.target.value)}
                  placeholder="e.g. PCK-8812-EZE"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-sky-300 uppercase placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={handleVerifyPickupCode}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Verify
                </button>
              </div>

              {/* Verification Result */}
              {pickupVerifyResult && pickupVerifyResult !== 'not_found' && (
                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                  pickupVerifyResult.isFlaggedForSecurity
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[11px]">
                      {pickupVerifyResult.isFlaggedForSecurity ? '⚠️ PICKUP RESTRICTED / FLAGGED' : '✅ AUTHORIZED GUARDIAN'}
                    </span>
                    <span className="font-mono">{pickupVerifyResult.pickupAuthorizationCode}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img 
                      src={pickupVerifyResult.photoUrl} 
                      alt={pickupVerifyResult.fullName} 
                      className="w-14 h-14 rounded-xl object-cover border border-white/20"
                    />
                    <div>
                      <div className="text-sm font-bold text-white">{pickupVerifyResult.title} {pickupVerifyResult.fullName}</div>
                      <div className="text-[11px] text-slate-300">{pickupVerifyResult.primaryPhone}</div>
                      <div className="text-[10px] text-slate-400">{pickupVerifyResult.residentialAddress}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="font-semibold mb-1">Authorized Wards for Pickup:</div>
                    <ul className="space-y-1">
                      {pickupVerifyResult.wards.map(w => (
                        <li key={w.studentId} className="flex items-center justify-between">
                          <span>{w.studentName} ({w.classGroupName})</span>
                          <span className={w.isAuthorizedPickup ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
                            {w.isAuthorizedPickup ? 'Permitted' : 'Blocked'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {pickupVerifyResult === 'not_found' && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200 text-center text-xs space-y-1">
                  <div className="font-bold">❌ Invalid Pickup Authorization Code</div>
                  <div className="text-[11px] text-rose-300">No registered parent found matching this pass. Please escort visitor to the Principal's Security Desk.</div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPickupVerifyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUPERVISORY AUDIT LOGS MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAuditLogsModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-purple-600 text-white">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Principal Supervisory Audit Logs</h3>
                <p className="text-xs text-slate-400">Cryptographic audit trail of parent verification and ward linkage actions</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">{log.action.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-200">{log.details}</div>
                  <div className="text-[10px] text-slate-400">Actor: <span className="text-slate-300 font-semibold">{log.actorName}</span></div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAuditLogsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PARENT FULL DOSSIER MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {selectedParentForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedParentForDetails(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-slate-800 shrink-0">
                <img 
                  src={selectedParentForDetails.photoUrl} 
                  alt={selectedParentForDetails.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold font-mono">
                    {selectedParentForDetails.parentCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {selectedParentForDetails.ptaMemberCategory}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {selectedParentForDetails.title} {selectedParentForDetails.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedParentForDetails.occupation} • {selectedParentForDetails.employerOrBusiness}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Telephone & WhatsApp</div>
                <div className="text-slate-200 font-semibold">{selectedParentForDetails.primaryPhone}</div>
                {selectedParentForDetails.alternatePhone && (
                  <div className="text-[11px] text-slate-400">Alt: {selectedParentForDetails.alternatePhone}</div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Email Address</div>
                <div className="text-slate-200 font-semibold">{selectedParentForDetails.email}</div>
                <div className="text-[11px] text-slate-400">Portal Code: {selectedParentForDetails.portalAccessCode}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Residential Residence</div>
                <div className="text-slate-200 font-semibold">{selectedParentForDetails.residentialAddress}</div>
                <div className="text-[11px] text-slate-400">Origin: {selectedParentForDetails.stateOfOrigin}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Gate Pickup Security Code</div>
                <div className="text-purple-300 font-mono font-black text-sm">{selectedParentForDetails.pickupAuthorizationCode}</div>
                <div className="text-[11px] text-emerald-400 font-semibold">Biometric Smartcard Linked</div>
              </div>
            </div>

            {/* Mapped Wards List */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-300">Enrolled Student Wards Mapped:</div>
              <div className="space-y-2">
                {selectedParentForDetails.wards.map(ward => (
                  <div key={ward.studentId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{ward.studentName}</div>
                      <div className="text-slate-400 text-[11px]">{ward.classGroupName} • Adm No: {ward.admissionNumber}</div>
                      <div className="text-[11px] text-purple-300 mt-0.5">Relationship: {ward.relationship} • Emergency Priority #{ward.emergencyPriority}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                        {ward.isAuthorizedPickup ? 'Pickup Permitted' : 'Restricted'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Principal Supervision Note */}
            <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Office of the Principal Supervisory Endorsement</span>
              </div>
              <p className="text-slate-300">
                {selectedParentForDetails.principalSupervisionNotes || 'Verified active guardian on record.'}
              </p>
              {selectedParentForDetails.verifiedByPrincipalName && (
                <div className="text-[10px] text-slate-400 pt-1">
                  Endorsed by: <span className="text-slate-200 font-semibold">{selectedParentForDetails.verifiedByPrincipalName}</span> on {selectedParentForDetails.verificationDate}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedParentForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
