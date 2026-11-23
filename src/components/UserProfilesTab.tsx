import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  MailPlus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react';
import type {
  GuardianRecord,
  GuardianWardSummary,
  IamAuditEventRecord,
  IamMemberInvitationRecord,
  IamMembershipRecord,
  IamRoleDefinition,
  IamSessionRecord,
  MfaFactorSummary,
  SchoolAdministrationStudent,
  SchoolInstitutionalIdentity,
  SchoolStatusHistoryRecord,
  SchoolStatusTransitionRequest
} from '../../packages/shared-types/src/apiContracts';
import type { SchoolBrandProfile, UserProfile } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface UserProfilesTabProps {
  currentUser?: UserProfile;
  brandProfile?: SchoolBrandProfile;
  onNavigateTab?: (tab: any) => void;
  onSelectStudentParent?: (parentId: string) => void;
}

type GovernanceSection = 'memberships' | 'invitations' | 'guardians' | 'school_identity' | 'security_audit';

export const UserProfilesTab: React.FC<UserProfilesTabProps> = ({
  onNavigateTab
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [activeSection, setActiveSection] = useState<GovernanceSection>('memberships');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Live datasets
  const [school, setSchool] = useState<SchoolInstitutionalIdentity | null>(null);
  const [statusHistory, setStatusHistory] = useState<SchoolStatusHistoryRecord[]>([]);
  const [memberships, setMemberships] = useState<IamMembershipRecord[]>([]);
  const [roles, setRoles] = useState<IamRoleDefinition[]>([]);
  const [invitations, setInvitations] = useState<IamMemberInvitationRecord[]>([]);
  const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
  const [students, setStudents] = useState<SchoolAdministrationStudent[]>([]);
  const [myWards, setMyWards] = useState<GuardianWardSummary[]>([]);
  const [sessions, setSessions] = useState<IamSessionRecord[]>([]);
  const [mfaFactors, setMfaFactors] = useState<MfaFactorSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<IamAuditEventRecord[]>([]);

  // Form states
  const [roleDraft, setRoleDraft] = useState<{ userId: string; roleCode: string }>({ userId: '', roleCode: 'teacher' });
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    intendedRoleCode: 'teacher'
  });
  const [lastIssuedInviteToken, setLastIssuedInviteToken] = useState<{ email: string; token: string } | null>(null);

  const [guardianForm, setGuardianForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    occupation: '',
    residentialAddress: ''
  });
  const [linkForm, setLinkForm] = useState({
    guardianId: '',
    studentId: '',
    relationshipType: 'mother' as 'mother' | 'father' | 'legal_guardian' | 'sponsor' | 'sibling' | 'other',
    isPrimary: true
  });

  const [profileForm, setProfileForm] = useState({
    legalName: '',
    registeredIdentity: '',
    ownership: 'private',
    educationalClassification: '',
    administrativeAddress: '',
    physicalAddress: '',
    officialContactEmail: '',
    telephone: '',
    motto: ''
  });
  const [statusTransition, setStatusTransition] = useState<{ toStatus: SchoolStatusTransitionRequest['toStatus']; reason: string }>({
    toStatus: 'active',
    reason: ''
  });

  const [mfaEnrollName, setMfaEnrollName] = useState('Authenticator App');
  const [pendingMfaEnroll, setPendingMfaEnroll] = useState<{ factorId: string; otpauthUri: string; secretBase32: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadAll = useCallback(async () => {
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        unifiedApiClient.getMySchool(),
        unifiedApiClient.getMySchoolStatusHistory(),
        unifiedApiClient.listIamRoles(),
        unifiedApiClient.listIamMemberships(),
        unifiedApiClient.listMemberInvitations(),
        unifiedApiClient.listGuardians(),
        unifiedApiClient.listStudents({ page: 1, pageSize: 100 }),
        unifiedApiClient.listIamSessions(),
        unifiedApiClient.listMfaFactors(),
        unifiedApiClient.listIamAuditEvents({ limit: 50 }),
        unifiedApiClient.listMyWards()
      ]);

      const [
        schoolRes, historyRes, rolesRes, membershipsRes, invitesRes,
        guardiansRes, studentsRes, sessionsRes, mfaRes, auditRes, wardsRes
      ] = results;

      if (schoolRes.status === 'fulfilled') {
        const s = schoolRes.value;
        setSchool(s);
        setProfileForm({
          legalName: s.legalName || s.name || '',
          registeredIdentity: s.registeredIdentity || '',
          ownership: s.ownership || 'private',
          educationalClassification: s.educationalClassification || '',
          administrativeAddress: s.administrativeAddress || '',
          physicalAddress: s.physicalAddress || '',
          officialContactEmail: s.officialContactEmail || '',
          telephone: s.telephone || '',
          motto: s.motto || ''
        });
      }
      if (historyRes.status === 'fulfilled') setStatusHistory(historyRes.value);
      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
      if (membershipsRes.status === 'fulfilled') {
        setMemberships(membershipsRes.value);
        if (membershipsRes.value[0]?.userId && !roleDraft.userId) {
          setRoleDraft(prev => ({ ...prev, userId: membershipsRes.value[0].userId }));
        }
      }
      if (invitesRes.status === 'fulfilled') setInvitations(invitesRes.value);
      if (guardiansRes.status === 'fulfilled') {
        setGuardians(guardiansRes.value);
        if (guardiansRes.value[0]?.id && !linkForm.guardianId) {
          setLinkForm(prev => ({ ...prev, guardianId: guardiansRes.value[0].id }));
        }
      }
      if (studentsRes.status === 'fulfilled') {
        setStudents(studentsRes.value.records);
        if (studentsRes.value.records[0]?.id && !linkForm.studentId) {
          setLinkForm(prev => ({ ...prev, studentId: studentsRes.value.records[0].id }));
        }
      }
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value);
      if (mfaRes.status === 'fulfilled') setMfaFactors(mfaRes.value);
      if (auditRes.status === 'fulfilled') setAuditEvents(auditRes.value);
      if (wardsRes.status === 'fulfilled') setMyWards(wardsRes.value);

      const firstRejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (results.every(r => r.status === 'rejected') && firstRejection) {
        setError((firstRejection.reason as { error?: string })?.error || 'Unable to load institutional identity and IAM records.');
      }
    } catch (err) {
      setError((err as { error?: string })?.error || 'Failed to load institutional identity and IAM data.');
    } finally {
      setLoading(false);
    }
  }, [linkForm.guardianId, linkForm.studentId, roleDraft.userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Authenticated School Session Required</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Sign in with your school member credentials to manage institutional identity, memberships, roles, invitations, guardians, MFA, and audit logs.
        </p>
        <a
          href="?school_admin=login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
        >
          <Lock className="w-4 h-4" />
          <span>Sign In to School Portal</span>
        </a>
      </div>
    );
  }

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setError('');
    try {
      await action();
      showNotice(successMessage);
      await loadAll();
    } catch (err) {
      setError((err as { error?: string })?.error || 'Operation failed. Check permissions and input values.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div className="rounded-2xl border border-emerald-600/40 bg-emerald-950/80 px-4 py-3 text-xs font-semibold text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-600/40 bg-rose-950/70 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Central IAM, Institutional Identity & Guardian Directory</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              {school?.displayName || 'School Identity & Access Governance'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              PostgreSQL-enforced RBAC across memberships, member invitations, verified guardians, MFA factors, active sessions, and immutable audit events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('student_registers')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Student Registers
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {([
            ['memberships', `Members & Roles (${memberships.length})`],
            ['invitations', `Invitations (${invitations.length})`],
            ['guardians', `Guardians & Wards (${guardians.length})`],
            ['school_identity', 'School Profile & Status'],
            ['security_audit', `Sessions, MFA & Audit (${sessions.length})`]
          ] as Array<[GovernanceSection, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'memberships' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Tenant Memberships ({memberships.length})</span>
            </h2>
            {memberships.length === 0 ? (
              <p className="text-xs text-slate-400">No memberships visible or membership read permission required.</p>
            ) : (
              <div className="space-y-3">
                {memberships.map(member => (
                  <div key={member.userId} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white">{member.fullName}</div>
                      <div className="text-xs text-slate-400 font-mono">{member.email} · {member.userId}</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50 text-[10px] font-bold">
                          {member.membershipStatus}
                        </span>
                        {member.assignedRoles.map(roleCode => (
                          <button
                            key={roleCode}
                            type="button"
                            title="Revoke role"
                            onClick={() =>
                              runAction(
                                () => unifiedApiClient.revokeMembershipRole(member.userId, roleCode, 'Administrative role update').then(() => undefined),
                                `Revoked ${roleCode} from ${member.fullName}.`
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-200 hover:text-rose-200 border border-slate-700 text-[10px] font-mono"
                          >
                            {roleCode} ×
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.membershipStatus === 'active' ? (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () => unifiedApiClient.suspendMembership(member.userId, 'Suspended by administrator').then(() => undefined),
                              `Suspended membership for ${member.fullName}.`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-semibold"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () => unifiedApiClient.reactivateMembership(member.userId, 'Reactivated by administrator').then(() => undefined),
                              `Reactivated membership for ${member.fullName}.`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Assign School Role</span>
            </h2>
            <form
              onSubmit={event => {
                event.preventDefault();
                runAction(
                  () => unifiedApiClient.assignMembershipRole(roleDraft.userId, roleDraft.roleCode).then(() => undefined),
                  `Assigned ${roleDraft.roleCode}.`
                );
              }}
              className="space-y-3 text-xs"
            >
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Member</span>
                <select
                  value={roleDraft.userId}
                  onChange={e => setRoleDraft(prev => ({ ...prev, userId: e.target.value }))}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  <option value="">Select member…</option>
                  {memberships.map(m => (
                    <option key={m.userId} value={m.userId}>{m.fullName} ({m.email})</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Canonical Role</span>
                <select
                  value={roleDraft.roleCode}
                  onChange={e => setRoleDraft(prev => ({ ...prev, roleCode: e.target.value }))}
                  required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  {roles.map(r => (
                    <option key={r.code} value={r.code}>{r.code} — {r.description}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                Assign Role
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSection === 'invitations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MailPlus className="w-4 h-4 text-purple-400" />
              <span>Invite School Member</span>
            </h2>
            <form
              onSubmit={event => {
                event.preventDefault();
                runAction(async () => {
                  const res = await unifiedApiClient.createMemberInvitation(inviteForm);
                  if (res.rawToken) {
                    setLastIssuedInviteToken({ email: res.invitation.email, token: res.rawToken });
                  }
                  setInviteForm({ fullName: '', email: '', intendedRoleCode: 'teacher' });
                }, `Invitation created for ${inviteForm.email}.`);
              }}
              className="space-y-3 text-xs"
            >
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Full Name *</span>
                <input
                  required
                  value={inviteForm.fullName}
                  onChange={e => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Email *</span>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Intended Role *</span>
                <select
                  value={inviteForm.intendedRoleCode}
                  onChange={e => setInviteForm(prev => ({ ...prev, intendedRoleCode: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  {(roles.length > 0 ? roles : [{ code: 'teacher', description: 'Teacher' } as IamRoleDefinition]).map(r => (
                    <option key={r.code} value={r.code}>{r.code}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
                Send / Issue Member Invitation
              </button>
            </form>

            {lastIssuedInviteToken && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 text-xs space-y-2">
                <div className="font-bold text-emerald-300">One-Time Invitation Token for {lastIssuedInviteToken.email}</div>
                <div className="font-mono break-all text-slate-200 text-[11px]">
                  ?member_invitation={lastIssuedInviteToken.token}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?member_invitation=${lastIssuedInviteToken.token}`)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Invite Link</span>
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Issued Invitations ({invitations.length})</h2>
            {invitations.length === 0 ? (
              <p className="text-xs text-slate-400">No invitations found.</p>
            ) : (
              <div className="space-y-2.5">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-white">{inv.fullName}</div>
                      <div className="text-slate-400 font-mono">{inv.email} · {inv.intendedRoleCode}</div>
                      <div className="text-[11px] text-slate-500">Status: {inv.status} · Expires {inv.expiresAt}</div>
                    </div>
                    {inv.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            () => unifiedApiClient.revokeMemberInvitation(inv.id, 'Revoked by administrator').then(() => undefined),
                            `Revoked invitation for ${inv.email}.`
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'guardians' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Register Guardian</span>
              </h2>
              <form
                onSubmit={event => {
                  event.preventDefault();
                  runAction(async () => {
                    await unifiedApiClient.createGuardian({
                      fullName: guardianForm.fullName,
                      phone: guardianForm.phone,
                      email: guardianForm.email || null,
                      occupation: guardianForm.occupation || null,
                      residentialAddress: guardianForm.residentialAddress || null
                    });
                    setGuardianForm({ fullName: '', phone: '', email: '', occupation: '', residentialAddress: '' });
                  }, 'Guardian profile created.');
                }}
                className="space-y-3 text-xs"
              >
                <input
                  required
                  placeholder="Full Name *"
                  value={guardianForm.fullName}
                  onChange={e => setGuardianForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
                <input
                  required
                  placeholder="Phone Number *"
                  value={guardianForm.phone}
                  onChange={e => setGuardianForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={guardianForm.email}
                  onChange={e => setGuardianForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
                <input
                  placeholder="Residential Address"
                  value={guardianForm.residentialAddress}
                  onChange={e => setGuardianForm(prev => ({ ...prev, residentialAddress: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
                <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Create Guardian Record
                </button>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white">Link Guardian to Student</h2>
              <form
                onSubmit={event => {
                  event.preventDefault();
                  runAction(
                    () => unifiedApiClient.linkStudentGuardian(linkForm.guardianId, {
                      studentId: linkForm.studentId,
                      relationshipType: linkForm.relationshipType,
                      isPrimary: linkForm.isPrimary,
                      canViewAcademicRecords: true,
                      canViewMedicalSummary: true
                    }).then(() => undefined),
                    'Student linked to guardian.'
                  );
                }}
                className="space-y-3 text-xs"
              >
                <select
                  required
                  value={linkForm.guardianId}
                  onChange={e => setLinkForm(prev => ({ ...prev, guardianId: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  <option value="">Select guardian…</option>
                  {guardians.map(g => <option key={g.id} value={g.id}>{g.full_name} ({g.verification_status})</option>)}
                </select>
                <select
                  required
                  value={linkForm.studentId}
                  onChange={e => setLinkForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
                </select>
                <select
                  value={linkForm.relationshipType}
                  onChange={e => setLinkForm(prev => ({ ...prev, relationshipType: e.target.value as any }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                >
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="legal_guardian">Legal Guardian</option>
                  <option value="sponsor">Sponsor</option>
                </select>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                  Link Ward
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white">Guardians Directory ({guardians.length})</h2>
              {guardians.length === 0 ? (
                <p className="text-xs text-slate-400">No guardians registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {guardians.map(g => (
                    <div key={g.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white">{g.full_name}</div>
                        <div className="text-slate-400 font-mono">{g.phone}{g.email ? ` · ${g.email}` : ''}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                          Verification: {g.verification_status}
                        </span>
                      </div>
                      {g.verification_status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(
                              () => unifiedApiClient.verifyGuardian(g.id, 'verified').then(() => undefined),
                              `Verified guardian ${g.full_name}.`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          Verify Identity
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {myWards.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <h2 className="text-sm font-bold text-emerald-300">My Verified Wards ({myWards.length})</h2>
                {myWards.map(w => (
                  <div key={w.student.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
                    <span className="font-bold text-white">{w.student.first_name} {w.student.last_name} ({w.student.admission_number})</span>
                    <span className="text-slate-400">{w.relationshipType} · {w.student.lifecycle_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'school_identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Institutional Identity & Registration Profile</span>
            </h2>
            <form
              onSubmit={event => {
                event.preventDefault();
                runAction(
                  () => unifiedApiClient.updateMySchoolProfile({
                    legalName: profileForm.legalName,
                    registeredIdentity: profileForm.registeredIdentity || null,
                    ownership: profileForm.ownership as any,
                    educationalClassification: profileForm.educationalClassification,
                    administrativeAddress: profileForm.administrativeAddress || null,
                    physicalAddress: profileForm.physicalAddress,
                    officialContactEmail: profileForm.officialContactEmail,
                    telephone: profileForm.telephone,
                    motto: profileForm.motto || null
                  }).then(() => undefined),
                  'School institutional profile updated.'
                );
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            >
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Legal Name</span>
                <input value={profileForm.legalName} onChange={e => setProfileForm(prev => ({ ...prev, legalName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Registered Identity / RC Number</span>
                <input value={profileForm.registeredIdentity} onChange={e => setProfileForm(prev => ({ ...prev, registeredIdentity: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Ownership</span>
                <select value={profileForm.ownership} onChange={e => setProfileForm(prev => ({ ...prev, ownership: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white">
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="federal">Federal</option>
                  <option value="state">State</option>
                  <option value="mission">Mission</option>
                  <option value="international">International</option>
                  <option value="community">Community</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Educational Classification</span>
                <input value={profileForm.educationalClassification} onChange={e => setProfileForm(prev => ({ ...prev, educationalClassification: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Official Contact Email</span>
                <input type="email" value={profileForm.officialContactEmail} onChange={e => setProfileForm(prev => ({ ...prev, officialContactEmail: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="space-y-1">
                <span className="text-slate-300 font-semibold">Telephone</span>
                <input value={profileForm.telephone} onChange={e => setProfileForm(prev => ({ ...prev, telephone: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="sm:col-span-2 space-y-1">
                <span className="text-slate-300 font-semibold">Physical Address</span>
                <input value={profileForm.physicalAddress} onChange={e => setProfileForm(prev => ({ ...prev, physicalAddress: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <label className="sm:col-span-2 space-y-1">
                <span className="text-slate-300 font-semibold">Administrative Address</span>
                <input value={profileForm.administrativeAddress} onChange={e => setProfileForm(prev => ({ ...prev, administrativeAddress: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </label>
              <div className="sm:col-span-2 flex justify-end pt-2">
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
                  Save Institutional Profile
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Institutional Lifecycle & History</h2>
            <form
              onSubmit={event => {
                event.preventDefault();
                runAction(
                  () => unifiedApiClient.transitionMySchoolStatus(statusTransition).then(() => undefined),
                  `School institutional status transitioned to ${statusTransition.toStatus}.`
                );
              }}
              className="space-y-3 text-xs"
            >
              <select
                value={statusTransition.toStatus}
                onChange={e => setStatusTransition(prev => ({ ...prev, toStatus: e.target.value as any }))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending_activation">Pending Activation</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
              <input
                required
                placeholder="Transition reason *"
                value={statusTransition.reason}
                onChange={e => setStatusTransition(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
              />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                Record Status Transition
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-slate-800 max-h-64 overflow-y-auto">
              {statusHistory.map(h => (
                <div key={h.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                  <div className="font-bold text-white">{h.from_status || 'initial'} → {h.to_status}</div>
                  <div className="text-slate-400">{h.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'security_audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Multi-Factor Authentication (TOTP)</span>
              </h2>
              <div className="flex gap-2 text-xs">
                <input
                  value={mfaEnrollName}
                  onChange={e => setMfaEnrollName(e.target.value)}
                  placeholder="Device / Authenticator name"
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    runAction(async () => {
                      const enrolled = await unifiedApiClient.enrollTotpMfa(mfaEnrollName);
                      setPendingMfaEnroll(enrolled);
                    }, 'TOTP secret generated. Verify with your authenticator app.')
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Enroll TOTP
                </button>
              </div>

              {pendingMfaEnroll && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-700/50 space-y-3 text-xs">
                  <div className="font-bold text-emerald-300">Setup Key (Base32): <span className="font-mono">{pendingMfaEnroll.secretBase32}</span></div>
                  <div className="text-[11px] text-slate-400 break-all font-mono">{pendingMfaEnroll.otpauthUri}</div>
                  <div className="flex gap-2">
                    <input
                      value={mfaVerifyCode}
                      onChange={e => setMfaVerifyCode(e.target.value)}
                      placeholder="6-digit code"
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await unifiedApiClient.verifyTotpMfa(pendingMfaEnroll.factorId, mfaVerifyCode);
                          setPendingMfaEnroll(null);
                          setMfaVerifyCode('');
                        }, 'TOTP factor verified and enabled.')
                      }
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                    >
                      Verify Code
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {mfaFactors.map(factor => (
                  <div key={factor.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{factor.friendlyName}</div>
                      <div className="text-slate-400">Status: {factor.status}</div>
                    </div>
                    {factor.status !== 'disabled' && (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            () => unifiedApiClient.disableTotpMfa(factor.id).then(() => undefined),
                            'MFA factor disabled.'
                          )
                        }
                        className="p-2 rounded-lg bg-rose-950/70 text-rose-300 border border-rose-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white">Active Sessions ({sessions.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{session.fullName} ({session.authMethod})</div>
                      <div className="text-slate-400 font-mono truncate">{session.email}</div>
                    </div>
                    {!session.revokedAt && (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            () => unifiedApiClient.revokeIamSession(session.id, 'Revoked via console').then(() => undefined),
                            'Session revoked.'
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-semibold"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">IAM Security Audit Ledger ({auditEvents.length})</h2>
            <div className="space-y-2 max-h-[540px] overflow-y-auto">
              {auditEvents.map(ev => (
                <div key={ev.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-purple-300 font-mono">{ev.action}</span>
                    <span className="text-slate-500 text-[11px]">{ev.occurredAt}</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] truncate">Actor: {ev.actorSubject}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
