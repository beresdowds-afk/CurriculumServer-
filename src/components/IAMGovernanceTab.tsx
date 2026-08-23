import React, { useState } from 'react';
import { 
  UserProfile, 
  UserAuthAccount, 
  AdminRoleDefinition, 
  IAMSecurityPolicy, 
  IAMSecurityAuditLog,
  SystemAdminRoleType,
  IAMPermissionMatrix,
  AuthProviderType
} from '../types';
import { 
  ShieldCheck, 
  Users, 
  KeyRound, 
  Smartphone, 
  Mail, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  Settings2, 
  FileText, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Clock, 
  Calendar, 
  Award, 
  Building2, 
  Filter, 
  ChevronRight, 
  Check, 
  X, 
  RefreshCw, 
  ExternalLink,
  Sliders,
  Sparkles,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

interface IAMGovernanceTabProps {
  currentUser: UserProfile;
  currentAccount: UserAuthAccount;
  allAccounts: UserAuthAccount[];
  adminRoles: AdminRoleDefinition[];
  securityPolicy: IAMSecurityPolicy;
  auditLogs: IAMSecurityAuditLog[];
  onAssignRole: (userId: string, roleType: SystemAdminRoleType, isActing?: boolean, expiryDate?: string) => void;
  onRevokeRole: (userId: string, roleType: SystemAdminRoleType) => void;
  onCreateCustomRole: (newRole: AdminRoleDefinition) => void;
  onUpdatePolicy: (newPolicy: IAMSecurityPolicy) => void;
  onToggleMFA: (userId: string) => void;
  onRevokeSession: (userId: string) => void;
  onTriggerPhoneVerification: (account: UserAuthAccount) => void;
  onOpenAuthModal: () => void;
}

export const IAMGovernanceTab: React.FC<IAMGovernanceTabProps> = ({
  currentUser,
  currentAccount,
  allAccounts,
  adminRoles,
  securityPolicy,
  auditLogs,
  onAssignRole,
  onRevokeRole,
  onCreateCustomRole,
  onUpdatePolicy,
  onToggleMFA,
  onRevokeSession,
  onTriggerPhoneVerification,
  onOpenAuthModal
}) => {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'roles' | 'policies' | 'audit_logs'>('directory');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTargetAccount, setSelectedTargetAccount] = useState<UserAuthAccount | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<SystemAdminRoleType>('vice_principal_academic');
  const [isActingAssignment, setIsActingAssignment] = useState(false);
  const [actingExpiryDate, setActingExpiryDate] = useState('2026-12-31');

  // Custom Role Creation Modal
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleOffice, setNewRoleOffice] = useState('');
  const [newRoleDepartment, setNewRoleDepartment] = useState('Academic Operations');
  const [newRoleBadgeColor, setNewRoleBadgeColor] = useState<'purple' | 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose' | 'teal' | 'sky'>('indigo');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<IAMPermissionMatrix>({
    canManageCurriculum: true,
    canApproveSchemesOfWork: false,
    canSubmitLessonPlans: true,
    canReviewLessonPlans: true,
    canPrincipalApproveLessonPlans: false,
    canDesignTimetable: false,
    canLockTimetable: false,
    canEnterContinuousAssessment: true,
    canEditAffectivePsychomotor: true,
    canUnlockLockedScores: false,
    canApproveBroadsheets: false,
    canPublishReportCards: false,
    canAuthorQuestions: true,
    canGenerateExams: false,
    canUnlockExams: false,
    canManageTeacherPool: false,
    canEnrollBiometrics: false,
    canOverrideAttendanceLogs: false,
    canAssignAdminRoles: false,
    canCreateCustomRoles: false,
    canEnforceSecurityPolicies: false,
    canViewSecurityAuditLogs: false,
    canRevokeUserSessions: false,
    canResetCredentials: false,
  });

  // Policy Form State
  const [policyForm, setPolicyForm] = useState<IAMSecurityPolicy>(securityPolicy);
  const [policySavedFeedback, setPolicySavedFeedback] = useState(false);

  // Permission Inspector Modal
  const [inspectingRole, setInspectingRole] = useState<AdminRoleDefinition | null>(null);

  // Filtered Accounts
  const filteredAccounts = allAccounts.filter(acc => {
    const matchesSearch = 
      acc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.alternativeAccessEmail && acc.alternativeAccessEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.alternativeEmail && acc.alternativeEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      acc.staffOrStudentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.phone.includes(searchQuery);

    if (!matchesSearch) return false;
    if (roleFilter === 'all') return true;
    if (roleFilter === 'principal_admin') return acc.primaryRole === 'principal_admin' || acc.assignedAdminRoles.includes('principal_admin');
    if (roleFilter === 'admins_only') return acc.assignedAdminRoles.length > 0;
    if (roleFilter === 'unverified_phone') return !acc.isPhoneVerified;
    if (roleFilter === 'mfa_enabled') return acc.mfaEnabled;
    return acc.assignedAdminRoles.includes(roleFilter as SystemAdminRoleType) || acc.primaryRole === roleFilter;
  });

  // Calculate Metrics
  const totalStaff = allAccounts.length;
  const totalAssignedAdmins = allAccounts.filter(a => a.assignedAdminRoles.length > 0).length;
  const verifiedPhoneCount = allAccounts.filter(a => a.isPhoneVerified).length;
  const phoneVerifiedRate = Math.round((verifiedPhoneCount / totalStaff) * 100);
  const googleLinkedCount = allAccounts.filter(a => a.isGoogleLinked).length;
  const googleLinkedRate = Math.round((googleLinkedCount / totalStaff) * 100);
  const mfaCount = allAccounts.filter(a => a.mfaEnabled).length;
  const mfaRate = Math.round((mfaCount / totalStaff) * 100);

  // Handlers
  const handleOpenAssignModal = (account: UserAuthAccount) => {
    setSelectedTargetAccount(account);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignRole = () => {
    if (!selectedTargetAccount) return;
    onAssignRole(
      selectedTargetAccount.userId,
      selectedRoleToAssign,
      isActingAssignment,
      isActingAssignment ? actingExpiryDate : undefined
    );
    setIsAssignModalOpen(false);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePolicy(policyForm);
    setPolicySavedFeedback(true);
    setTimeout(() => setPolicySavedFeedback(false), 2500);
  };

  const handleCreateCustomRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle) return;

    const customRoleId = `role-custom-${Date.now()}`;
    const newRole: AdminRoleDefinition = {
      id: customRoleId,
      roleType: 'custom_admin',
      title: newRoleTitle,
      officeTitle: newRoleOffice || newRoleTitle,
      department: newRoleDepartment,
      badgeColor: newRoleBadgeColor,
      description: newRoleDescription || `Custom administrative role created by Office of Principal.`,
      isCustom: true,
      permissions: newRolePermissions,
      assignedUsersCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: currentAccount.fullName
    };

    onCreateCustomRole(newRole);
    setIsCreateRoleModalOpen(false);
    // Reset
    setNewRoleTitle('');
    setNewRoleOffice('');
    setNewRoleDescription('');
  };

  const togglePermissionKey = (key: keyof IAMPermissionMatrix) => {
    setNewRolePermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Executive Office of the Principal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-900/60 border-2 border-purple-400/40 flex items-center justify-center text-purple-200 shadow-lg shadow-purple-950/60 shrink-0">
              <ShieldCheck className="w-8 h-8 text-purple-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Office of the Principal • Root IAM & Governance Matrix
                </h1>
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/50 flex items-center gap-1">
                  <Award className="w-3 h-3 text-purple-300" />
                  Executive Super Admin
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Centralized Identity and Access Management (IAM) engine. The Principal Admin possesses sovereign authority to provision administrative staff roles, delegate acting mandates, enforce Multi-Factor Authentication (MFA), and audit institutional access trails.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateRoleModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-900/50 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Create Admin Role</span>
            </button>

            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-950/50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Auth & Security Portal</span>
            </button>
          </div>
        </div>

        {/* IAM Governance Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Staff Accounts</span>
              <Users className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white">{totalStaff}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Full institutional directory</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Assigned Admin Roles</span>
              <Award className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-indigo-300">{totalAssignedAdmins}</div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5">VPs, Exam Officers, HODs</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Phone Verified (MFA)</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">{phoneVerifiedRate}%</div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">{verifiedPhoneCount} of {totalStaff} verified</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Google SSO Adoption</span>
              <Globe className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-sky-300">{googleLinkedRate}%</div>
            <div className="text-[10px] text-sky-400/80 mt-0.5">{googleLinkedCount} accounts bound</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>MFA Enforcement</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300">{mfaRate}%</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">{mfaCount} active 2FA policies</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'directory'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff & Admin Directory</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
            {allAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'roles'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Admin Roles Registry</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
            {adminRoles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'policies'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Security & MFA Policies</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'audit_logs'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>IAM Security Audit Trail</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* 1. STAFF & ADMIN DIRECTORY SUB-TAB */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by full name, staff ID, email, or mobile line..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Roles ({allAccounts.length})</option>
                <option value="principal_admin">Principal Admin Only</option>
                <option value="admins_only">All Admin Roles Assigned</option>
                <option value="vice_principal_academic">VP Academics</option>
                <option value="examination_officer">Exam Officers</option>
                <option value="unverified_phone">Unverified Phone Line</option>
                <option value="mfa_enabled">MFA Protected Only</option>
              </select>
            </div>
          </div>

          {/* Accounts Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAccounts.map((acc) => {
              const isPrincipal = acc.primaryRole === 'principal_admin';
              return (
                <div
                  key={acc.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:border-slate-700 ${
                    isPrincipal 
                      ? 'border-purple-600/50 bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900' 
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Avatar + Name + Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-purple-300 shadow-md">
                          {acc.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-tight">{acc.fullName}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {acc.staffOrStudentId}
                            </span>
                          </div>
                          <div className="text-xs text-purple-400 font-medium mt-0.5">
                            {isPrincipal ? 'Principal & Chief Executive Officer' : acc.primaryRole}
                          </div>
                        </div>
                      </div>

                      {/* MFA Badge */}
                      <div className="shrink-0">
                        {acc.mfaEnabled ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            MFA Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                            MFA Optional
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Admin Roles */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 mr-1 self-center">Assigned Roles:</span>
                      {acc.assignedAdminRoles.length > 0 ? (
                        acc.assignedAdminRoles.map(role => {
                          const roleDef = adminRoles.find(r => r.roleType === role);
                          return (
                            <span
                              key={role}
                              className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-200 border border-purple-700/60 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Award className="w-3 h-3 text-purple-400" />
                              {roleDef?.title || role}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No administrative roles assigned</span>
                      )}
                    </div>

                    {/* Credentials & Verification Matrix */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 grid grid-cols-3 gap-2 text-[11px]">
                      {/* Email */}
                      <div className="space-y-0.5">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>Email</span>
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-200" title={acc.email}>
                          {acc.email}
                        </div>
                        {acc.alternativeAccessEmail && (
                          <div className="truncate font-mono text-[9px] text-amber-300 flex items-center gap-1" title={`Alternative Access: ${acc.alternativeAccessEmail}`}>
                            <span className="px-1 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold text-[8px]">ALT</span>
                            <span>{acc.alternativeAccessEmail}</span>
                          </div>
                        )}
                        <div>
                          {acc.isEmailVerified ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400">Unverified</span>
                          )}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="space-y-0.5">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-slate-500" />
                          <span>Mobile Line</span>
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-200" title={acc.phone}>
                          {acc.phone || 'None'}
                        </div>
                        <div>
                          {acc.isPhoneVerified ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> SMS Verified
                            </span>
                          ) : (
                            <button
                              onClick={() => onTriggerPhoneVerification(acc)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                            >
                              Verify Phone
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Google SSO */}
                      <div className="space-y-0.5">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>Google SSO</span>
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-200">
                          {acc.isGoogleLinked ? 'Linked' : 'Not Linked'}
                        </div>
                        <div>
                          {acc.isGoogleLinked ? (
                            <span className="text-[10px] text-sky-400 flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Unbound</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Security Meta */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Last login: <span className="text-slate-300">{new Date(acc.lastLoginAt).toLocaleTimeString()}</span></span>
                      <span>Method: <span className="text-purple-300 font-semibold uppercase">{acc.lastLoginMethod}</span></span>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!isPrincipal && (
                        <button
                          onClick={() => handleOpenAssignModal(acc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 text-purple-400" />
                          <span>Assign Admin Role</span>
                        </button>
                      )}

                      <button
                        onClick={() => onToggleMFA(acc.userId)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          acc.mfaEnabled 
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                            : 'bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {acc.mfaEnabled ? 'Disable 2FA' : 'Enforce 2FA'}
                      </button>
                    </div>

                    <button
                      onClick={() => onRevokeSession(acc.userId)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
                      title="Terminate active session tokens on all devices"
                    >
                      Revoke Sessions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ADMIN ROLES REGISTRY SUB-TAB */}
      {activeSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Administrative Roles & Authority Levels</h3>
              <p className="text-xs text-slate-400">
                System and custom roles provisionable by the Office of the Principal.
              </p>
            </div>
            <button
              onClick={() => setIsCreateRoleModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Admin Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminRoles.map((role) => {
              const activeCount = allAccounts.filter(a => a.assignedAdminRoles.includes(role.roleType) || a.primaryRole === role.roleType).length;
              return (
                <div
                  key={role.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between ${
                    role.isSystemRoot ? 'border-purple-600/50 bg-slate-900/90' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-tight">{role.title}</h4>
                          {role.isSystemRoot && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                              Root Authority
                            </span>
                          )}
                          {role.isCustom && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                              Custom Role
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{role.officeTitle} • <span className="text-purple-400">{role.department}</span></div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                        {activeCount} Staff
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      {role.description}
                    </p>

                    {/* Key Permissions Checklist Preview */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Permitted Capabilities:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {role.permissions.canPrincipalApproveLessonPlans ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                          ) : role.permissions.canReviewLessonPlans ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span className={role.permissions.canReviewLessonPlans || role.permissions.canPrincipalApproveLessonPlans ? 'text-slate-200' : 'text-slate-500'}>
                            Lesson Plan Approval
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {role.permissions.canApproveBroadsheets ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span className={role.permissions.canApproveBroadsheets ? 'text-slate-200' : 'text-slate-500'}>
                            Broadsheet Endorsement
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {role.permissions.canUnlockExams ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span className={role.permissions.canUnlockExams ? 'text-slate-200' : 'text-slate-500'}>
                            CBT Exam Decryption
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {role.permissions.canAssignAdminRoles ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-600" />
                          )}
                          <span className={role.permissions.canAssignAdminRoles ? 'text-slate-200' : 'text-slate-500'}>
                            IAM Role Provisioning
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setInspectingRole(role)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <span>View All 24 IAM Permissions</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[10px] text-slate-500">
                      Created by {role.createdBy}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SECURITY POLICIES & MFA ENFORCEMENT */}
      {activeSubTab === 'policies' && (
        <form onSubmit={handleSavePolicy} className="space-y-6 max-w-4xl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Institutional Security & Authentication Policies</h3>
                <p className="text-xs text-slate-400">
                  Global IAM constraints enforced across all school staff, teachers, and administrators.
                </p>
              </div>
              {policySavedFeedback && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-xs font-bold text-emerald-300 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>Policies Saved & Active</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Policy 1: Phone Verification */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Enforce Mobile Phone Verification for Administrative Staff</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Mandates that all Vice Principals, Examination Officers, and Form Teachers must verify a Nigerian or international mobile line via 6-digit SMS OTP.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={policyForm.requirePhoneVerificationForAdmins}
                  onChange={(e) => setPolicyForm({ ...policyForm, requirePhoneVerificationForAdmins: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Policy 2: Google Workspace Domain Enforcement */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Restrict Google Single Sign-On to Official School Domain</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Restricts Google SSO log-ins exclusively to verified email accounts matching <span className="font-mono text-sky-300">{policyForm.allowedGoogleDomain}</span>.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={policyForm.enforceGoogleSSODomain}
                  onChange={(e) => setPolicyForm({ ...policyForm, enforceGoogleSSODomain: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Policy 3: MFA on Critical Broadsheet & Exam Operations */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Require 2-Factor SMS Challenge on Broadsheet Signoff & Exam Unlocking</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Prompts the Principal and Exam Officer for an instant SMS OTP before terminal exam papers can be scrambled or student broadsheets locked for publication.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={policyForm.requireMFAForPrincipalAdmin}
                  onChange={(e) => setPolicyForm({ ...policyForm, requireMFAForPrincipalAdmin: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Policy 4: Session Timeout */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Administrative Inactivity Session Timeout</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Automatically invalidates browser session tokens after period of inactivity.
                  </p>
                </div>
                <select
                  value={policyForm.sessionTimeoutMinutes}
                  onChange={(e) => setPolicyForm({ ...policyForm, sessionTimeoutMinutes: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={15}>15 Minutes (High Security)</option>
                  <option value={60}>1 Hour (Standard Staff)</option>
                  <option value={480}>8 Hours (School Working Day)</option>
                  <option value={1440}>24 Hours</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save & Enforce Institutional Policies</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. SECURITY AUDIT TRAIL SUB-TAB */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Live Identity & Access Management Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Immutable chronological log of authentications, Google SSO handshakes, OTP verifications, and role assignments.
              </p>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded border border-purple-800">
              {auditLogs.length} Recorded Events
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">IP Address / Location</th>
                    <th className="py-3 px-4">Audit Details</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{log.actorName}</div>
                        <div className="text-[10px] text-purple-400">{log.actorRole}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.actionType === 'LOGIN_SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          log.actionType === 'ROLE_ASSIGNED' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          log.actionType === 'PHONE_VERIFIED' ? 'bg-teal-950 text-teal-300 border border-teal-800' :
                          log.actionType === 'POLICY_UPDATED' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300 max-w-xs leading-relaxed">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                            <Check className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Alert
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ASSIGN ADMIN ROLE TO STAFF */}
      {isAssignModalOpen && selectedTargetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Assign Administrative Role</h3>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-sm text-purple-300">
                {selectedTargetAccount.avatar}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{selectedTargetAccount.fullName}</div>
                <div className="text-[11px] text-slate-400">{selectedTargetAccount.staffOrStudentId} • {selectedTargetAccount.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Select Administrative Role:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {adminRoles.filter(r => !r.isSystemRoot).map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleToAssign(role.roleType)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedRoleToAssign === role.roleType
                        ? 'bg-purple-950/40 border-purple-500 text-purple-100 ring-1 ring-purple-500/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{role.title}</div>
                      <div className="text-[10px] text-slate-400">{role.department}</div>
                    </div>
                    {selectedRoleToAssign === role.roleType && (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Acting / Temporary Delegation Toggle */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={isActingAssignment}
                  onChange={(e) => setIsActingAssignment(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                />
                <span>Designate as Temporary / Acting Role (With Expiration)</span>
              </label>

              {isActingAssignment && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Mandate Expiry Date:</span>
                  <input
                    type="date"
                    value={actingExpiryDate}
                    onChange={(e) => setActingExpiryDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignRole}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40"
              >
                Issue Mandate & Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CUSTOM ADMIN ROLE */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-5 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Create Custom Administrative Role</h3>
              </div>
              <button 
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRoleSubmit} className="overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Guidance Counselor & Welfare Admin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Office / Unit Title
                  </label>
                  <input
                    type="text"
                    value={newRoleOffice}
                    onChange={(e) => setNewRoleOffice(e.target.value)}
                    placeholder="e.g. Office of Student Guidance & Welfare"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={newRoleDepartment}
                    onChange={(e) => setNewRoleDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Academic Operations">Academic Operations</option>
                    <option value="Science & Mathematics">Science & Mathematics</option>
                    <option value="Languages & Humanities">Languages & Humanities</option>
                    <option value="Business & Technology">Business & Technology</option>
                    <option value="Student Affairs">Student Affairs</option>
                    <option value="Examinations & Quality">Examinations & Quality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge Color
                  </label>
                  <select
                    value={newRoleBadgeColor}
                    onChange={(e) => setNewRoleBadgeColor(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="purple">Purple (Executive)</option>
                    <option value="indigo">Indigo (Academic)</option>
                    <option value="blue">Blue (STEM)</option>
                    <option value="amber">Amber (Exams)</option>
                    <option value="emerald">Emerald (Finance)</option>
                    <option value="rose">Rose (Student Affairs)</option>
                    <option value="teal">Teal (ICT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description of Mandate & Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Outline the responsibilities and scope of this role..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Granular Permission Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Select Granular IAM Permissions:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canReviewLessonPlans}
                      onChange={() => togglePermissionKey('canReviewLessonPlans')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Review Lesson Plans</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canApproveBroadsheets}
                      onChange={() => togglePermissionKey('canApproveBroadsheets')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Endorse Broadsheets</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canUnlockExams}
                      onChange={() => togglePermissionKey('canUnlockExams')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Decrypt & Unlock CBT Exams</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canManageTeacherPool}
                      onChange={() => togglePermissionKey('canManageTeacherPool')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Manage Teacher Pool & Deployments</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canEnrollBiometrics}
                      onChange={() => togglePermissionKey('canEnrollBiometrics')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Biometric Device Enrollment</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canPublishReportCards}
                      onChange={() => togglePermissionKey('canPublishReportCards')}
                      className="rounded border-slate-700 bg-slate-900 text-purple-600"
                    />
                    <span>Publish Report Cards</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40"
                >
                  Create & Register Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FULL 24 IAM PERMISSIONS INSPECTOR */}
      {inspectingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4 text-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{inspectingRole.title}</h3>
                <p className="text-xs text-purple-400">{inspectingRole.officeTitle} • 24 IAM Permissions Matrix</p>
              </div>
              <button 
                onClick={() => setInspectingRole(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1">
              {Object.entries(inspectingRole.permissions).map(([permKey, isAllowed]) => (
                <div 
                  key={permKey}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs"
                >
                  <span className="font-mono text-slate-300">{permKey}</span>
                  {isAllowed ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Granted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-600 text-[11px]">
                      <X className="w-3.5 h-3.5" /> Denied
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setInspectingRole(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold mt-2"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
