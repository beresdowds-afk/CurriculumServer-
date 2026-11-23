import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Unlink,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import type {
  CreateSchoolStaffRequest,
  IamMembershipRecord,
  IamRoleDefinition,
  SchoolAdministrationClass,
  SchoolDepartmentRecord,
  SchoolStaffRecord,
  StaffStatusTransitionRequest,
  StaffSubjectAllocationRecord
} from '../../packages/shared-types/src/apiContracts';
import type { UserProfile } from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface TeacherPoolTabProps {
  currentUser?: UserProfile;
  onSelectTeacherForTimetable?: (teacherId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TeacherPoolTab: React.FC<TeacherPoolTabProps> = ({
  onSelectTeacherForTimetable,
  onNavigateTab
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Persisted tenant datasets
  const [staff, setStaff] = useState<SchoolStaffRecord[]>([]);
  const [departments, setDepartments] = useState<SchoolDepartmentRecord[]>([]);
  const [classes, setClasses] = useState<SchoolAdministrationClass[]>([]);
  const [iamRoles, setIamRoles] = useState<IamRoleDefinition[]>([]);
  const [memberships, setMemberships] = useState<IamMembershipRecord[]>([]);

  // Selection & per-staff subject allocations
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [allocations, setAllocations] = useState<StaffSubjectAllocationRecord[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Create / Edit Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SchoolStaffRecord | null>(null);
  const [staffForm, setStaffForm] = useState({
    staffNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: 'Subject Teacher',
    departmentId: '',
    staffCategory: 'teaching' as 'teaching' | 'administrative' | 'support' | 'executive',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'visiting',
    qualification: '',
    trcnNumber: '',
    maxPeriodsPerWeek: 24,
    specializationNotes: ''
  });

  // Governance controls on active staff dossier
  const [linkUserId, setLinkUserId] = useState('');
  const [unlinkReason, setUnlinkReason] = useState('');
  const [appointRoleCode, setAppointRoleCode] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [nextStatus, setNextStatus] = useState<StaffStatusTransitionRequest['toStatus']>('on_leave');

  // Subject allocation inline form
  const [allocSubjectCode, setAllocSubjectCode] = useState(NERDC_SUBJECTS_DATABASE[0]?.code || 'MTH');
  const [allocSubjectName, setAllocSubjectName] = useState(NERDC_SUBJECTS_DATABASE[0]?.name || 'General Mathematics');
  const [allocClassId, setAllocClassId] = useState('');
  const [allocPeriods, setAllocPeriods] = useState(4);
  const [catalogSearch, setCatalogSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    setLoading(true);
    setError('');
    try {
      const [staffRes, deptRes, classRes, rolesRes, membershipsRes] = await Promise.all([
        unifiedApiClient.listStaff({ page: 1, pageSize: 100 }),
        unifiedApiClient.listDepartments().catch(() => [] as SchoolDepartmentRecord[]),
        unifiedApiClient.listClasses({ page: 1, pageSize: 100 }).catch(() => ({ records: [] as SchoolAdministrationClass[], page: 1, pageSize: 100, total: 0 })),
        unifiedApiClient.listIamRoles().catch(() => [] as IamRoleDefinition[]),
        unifiedApiClient.listIamMemberships().catch(() => [] as IamMembershipRecord[])
      ]);
      setStaff(staffRes.records);
      setDepartments(deptRes);
      setClasses(classRes.records);
      setIamRoles(rolesRes);
      setMemberships(membershipsRes);
      setSelectedStaffId(prev => (prev && staffRes.records.some(s => s.id === prev) ? prev : staffRes.records[0]?.id || ''));
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to load school staff directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeStaff = useMemo(
    () => staff.find(s => s.id === selectedStaffId) || null,
    [staff, selectedStaffId]
  );

  const loadAllocations = useCallback(async (staffId: string) => {
    if (!staffId || !unifiedApiClient.isAuthenticated('school_flow')) {
      setAllocations([]);
      return;
    }
    setLoadingAllocations(true);
    try {
      const list = await unifiedApiClient.listStaffSubjectAllocations(staffId);
      setAllocations(list);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to load subject allocations.');
    } finally {
      setLoadingAllocations(false);
    }
  }, []);

  useEffect(() => {
    if (activeStaff?.id) {
      loadAllocations(activeStaff.id);
    } else {
      setAllocations([]);
    }
  }, [activeStaff?.id, loadAllocations]);

  const deptById = useMemo(() => {
    const map = new Map<string, SchoolDepartmentRecord>();
    for (const d of departments) map.set(d.id, d);
    return map;
  }, [departments]);

  const classById = useMemo(() => {
    const map = new Map<string, SchoolAdministrationClass>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const membershipByUserId = useMemo(() => {
    const map = new Map<string, IamMembershipRecord>();
    for (const m of memberships) map.set(m.userId, m);
    return map;
  }, [memberships]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staff.filter(s => {
      if (selectedDepartmentId !== 'all' && (s.department_id || '') !== selectedDepartmentId) return false;
      if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
      if (q) {
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        const matches =
          full.includes(q) ||
          s.staff_number.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q) ||
          s.designation.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [staff, selectedDepartmentId, selectedStatus, searchQuery]);

  const filteredNerdcCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return NERDC_SUBJECTS_DATABASE;
    return NERDC_SUBJECTS_DATABASE.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.level.toLowerCase().includes(q)
    );
  }, [catalogSearch]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setStaffForm({
      staffNumber: `STF-${String(staff.length + 1).padStart(4, '0')}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: 'Subject Teacher',
      departmentId: '',
      staffCategory: 'teaching',
      employmentType: 'full_time',
      qualification: '',
      trcnNumber: '',
      maxPeriodsPerWeek: 24,
      specializationNotes: ''
    });
    setIsStaffModalOpen(true);
  };

  const openEditModal = (rec: SchoolStaffRecord) => {
    setEditingStaff(rec);
    setStaffForm({
      staffNumber: rec.staff_number,
      firstName: rec.first_name,
      lastName: rec.last_name,
      email: rec.email || '',
      phone: rec.phone || '',
      designation: rec.designation,
      departmentId: rec.department_id || '',
      staffCategory: rec.staff_category || 'teaching',
      employmentType: rec.employment_type || 'full_time',
      qualification: rec.qualification || '',
      trcnNumber: rec.trcn_number || '',
      maxPeriodsPerWeek: rec.max_periods_per_week || 24,
      specializationNotes: rec.specialization_notes || ''
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!staffForm.staffNumber.trim() || !staffForm.firstName.trim() || !staffForm.lastName.trim() || !staffForm.designation.trim()) {
      setError('Staff number, first name, last name, and designation are required.');
      return;
    }
    const payload: CreateSchoolStaffRequest = {
      staffNumber: staffForm.staffNumber.trim(),
      firstName: staffForm.firstName.trim(),
      lastName: staffForm.lastName.trim(),
      email: staffForm.email.trim() || null,
      phone: staffForm.phone.trim() || null,
      designation: staffForm.designation.trim(),
      departmentId: staffForm.departmentId || null,
      staffCategory: staffForm.staffCategory,
      employmentType: staffForm.employmentType,
      qualification: staffForm.qualification.trim() || null,
      trcnNumber: staffForm.trcnNumber.trim() || null,
      maxPeriodsPerWeek: Number(staffForm.maxPeriodsPerWeek) || 24,
      specializationNotes: staffForm.specializationNotes.trim() || null
    };
    try {
      if (editingStaff) {
        const updated = await unifiedApiClient.updateStaff(editingStaff.id, payload);
        setSelectedStaffId(updated.id);
        setNotice(`Staff record ${updated.first_name} ${updated.last_name} updated.`);
      } else {
        const created = await unifiedApiClient.createStaff(payload);
        setSelectedStaffId(created.id);
        setNotice(`Staff record ${created.first_name} ${created.last_name} created in PostgreSQL.`);
      }
      setIsStaffModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to save staff record.');
    }
  };

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff || !linkUserId) return;
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.linkStaffUser(activeStaff.id, linkUserId);
      setLinkUserId('');
      setNotice('User account linked to staff profile.');
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to link user account.');
    }
  };

  const handleUnlinkUser = async () => {
    if (!activeStaff) return;
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.unlinkStaffUser(activeStaff.id, unlinkReason.trim() || 'Administrative unlink');
      setUnlinkReason('');
      setNotice('User account unlinked from staff record.');
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to unlink user account.');
    }
  };

  const handleAppointRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff || !appointRoleCode) return;
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.appointStaffRole(activeStaff.id, appointRoleCode);
      setNotice(`Appointed role "${appointRoleCode}" for ${activeStaff.first_name} ${activeStaff.last_name}.`);
      setAppointRoleCode('');
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to appoint staff role.');
    }
  };

  const handleAllocateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setError('');
    setNotice('');
    if (!allocSubjectCode.trim() || !allocSubjectName.trim()) {
      setError('Subject code and subject name are required.');
      return;
    }
    try {
      await unifiedApiClient.allocateStaffSubject(activeStaff.id, {
        subjectCode: allocSubjectCode.trim(),
        subjectName: allocSubjectName.trim(),
        classId: allocClassId || null,
        periodsPerWeek: Number(allocPeriods) || 4
      });
      setNotice(`Subject "${allocSubjectName}" allocated to ${activeStaff.first_name} ${activeStaff.last_name}.`);
      await loadAllocations(activeStaff.id);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to allocate subject.');
    }
  };

  const handleRevokeAllocation = async (allocationId: string) => {
    if (!activeStaff) return;
    setError('');
    setNotice('');
    try {
      await unifiedApiClient.revokeStaffSubjectAllocation(activeStaff.id, allocationId);
      setNotice('Subject allocation ended.');
      await loadAllocations(activeStaff.id);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to revoke subject allocation.');
    }
  };

  const handleTransitionStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setError('');
    setNotice('');
    if (!statusReason.trim()) {
      setError('A status transition / separation reason is required.');
      return;
    }
    try {
      await unifiedApiClient.transitionStaffStatus(activeStaff.id, {
        toStatus: nextStatus,
        reason: statusReason.trim()
      });
      setStatusReason('');
      setNotice(`Staff lifecycle transitioned to "${nextStatus}".`);
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to update staff status.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-white">School Authentication Required</h2>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Staff records, TRCN credentials, subject allocations, and leadership appointments are protected per school tenant. Sign in via School Admin Access to manage the staff pool.
        </p>
      </div>
    );
  }

  const activeLinkedUser = activeStaff?.user_id ? membershipByUserId.get(activeStaff.user_id) || null : null;
  const activeAllocationsCount = allocations.filter(a => a.status === 'active').length;
  const activeWeeklyPeriods = allocations
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + (a.periods_per_week || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Staff Administration, Appointments & NERDC Allocations</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Staff & Teacher Pool Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Manage teaching and non-teaching staff records, link IAM user accounts, appoint leadership roles, allocate NERDC subjects to class arms, and track separation workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Staff</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, staff number, designation, email..."
              className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700"
            />
          </div>
          <select
            value={selectedDepartmentId}
            onChange={e => setSelectedDepartmentId(e.target.value)}
            className="bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700"
          >
            <option value="all">All Lifecycle Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="suspended">Suspended</option>
            <option value="retired">Retired</option>
            <option value="departed">Departed</option>
          </select>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{error}</span>
            <button onClick={() => setError('')} className="text-rose-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {notice && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-emerald-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[850px] overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Staff Directory ({filteredStaff.length})</span>
            <span className="text-[10px] font-normal">PostgreSQL Persisted</span>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
              No staff records match the current filter.
            </div>
          ) : (
            filteredStaff.map(rec => {
              const initials = `${rec.first_name?.[0] || ''}${rec.last_name?.[0] || ''}`.toUpperCase() || 'ST';
              const dept = rec.department_id ? deptById.get(rec.department_id) : null;
              const isSelected = activeStaff?.id === rec.id;
              return (
                <button
                  key={rec.id}
                  onClick={() => setSelectedStaffId(rec.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white truncate">{rec.first_name} {rec.last_name}</h3>
                        <span className="text-[10px] font-mono text-emerald-400 block truncate">
                          {rec.staff_number} • {rec.designation}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      rec.status === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800">
                    <span className="truncate">{dept ? dept.name : rec.staff_category || 'teaching'}</span>
                    <span className="font-mono text-[10px]">{rec.user_id ? 'IAM Linked' : 'Unlinked'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Detail Dossier */}
        {activeStaff && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    {activeStaff.staff_number}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
                    {activeStaff.staff_category || 'teaching'} • {activeStaff.employment_type || 'full_time'}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  {activeStaff.first_name} {activeStaff.last_name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeStaff.designation}
                  {activeStaff.department_id && deptById.get(activeStaff.department_id)
                    ? ` • ${deptById.get(activeStaff.department_id)!.name}`
                    : ''}
                </p>
                {(activeStaff.qualification || activeStaff.trcn_number) && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {activeStaff.qualification || 'Qualification not specified'}
                      {activeStaff.trcn_number ? ` • TRCN: ${activeStaff.trcn_number}` : ''}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openEditModal(activeStaff)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    if (onSelectTeacherForTimetable) onSelectTeacherForTimetable(activeStaff.id);
                    else if (onNavigateTab) onNavigateTab('school_timetable');
                    else window.location.hash = '#/school_timetable';
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timetable</span>
                </button>
              </div>
            </div>

            {/* Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> Official Phone
                </span>
                <p className="font-mono font-bold text-white">{activeStaff.phone || 'Not recorded'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" /> Institutional Email
                </span>
                <p className="font-mono font-bold text-white truncate">{activeStaff.email || 'Not recorded'}</p>
              </div>
            </div>

            {/* IAM User Account Linking & Role Appointment */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>IAM User Account Link & Role Appointment</span>
                </span>
                {activeLinkedUser && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    {activeLinkedUser.email} ({activeLinkedUser.primaryRole})
                  </span>
                )}
              </div>

              {activeStaff.user_id ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-slate-400">Linked User: </span>
                      <strong className="text-white">{activeLinkedUser ? `${activeLinkedUser.fullName} (${activeLinkedUser.email})` : activeStaff.user_id}</strong>
                      {activeLinkedUser && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Assigned Roles: {activeLinkedUser.assignedRoles.join(', ') || activeLinkedUser.primaryRole}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={unlinkReason}
                        onChange={e => setUnlinkReason(e.target.value)}
                        placeholder="Unlink reason..."
                        className="bg-slate-800 text-white px-2.5 py-1 rounded-lg border border-slate-700 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={handleUnlinkUser}
                        className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 font-semibold flex items-center gap-1"
                      >
                        <Unlink className="w-3 h-3" /> Unlink
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAppointRole} className="flex flex-wrap items-center gap-2">
                    <select
                      value={appointRoleCode}
                      onChange={e => setAppointRoleCode(e.target.value)}
                      className="flex-1 bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                    >
                      <option value="">Select role to appoint...</option>
                      {iamRoles.map(r => (
                        <option key={r.code} value={r.code}>{r.code} — {r.description}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!appointRoleCode}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold"
                    >
                      Appoint Role
                    </button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleLinkUser} className="flex flex-wrap items-center gap-2">
                  <select
                    value={linkUserId}
                    onChange={e => setLinkUserId(e.target.value)}
                    className="flex-1 bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">Select tenant user account to link...</option>
                    {memberships.map(m => (
                      <option key={m.userId} value={m.userId}>{m.fullName} ({m.email}) — {m.primaryRole}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!linkUserId}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Link User</span>
                  </button>
                </form>
              )}
            </div>

            {/* Subject Allocations + Weekly Load */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Subject Allocations ({activeAllocationsCount} active • {activeWeeklyPeriods} / {activeStaff.max_periods_per_week || 24} periods)</span>
                </span>
                {loadingAllocations && <span className="text-[10px] text-slate-400">Syncing...</span>}
              </div>

              {allocations.length === 0 ? (
                <p className="text-slate-400 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  No subject allocations recorded for this staff member yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {allocations.map(alloc => {
                    const cls = alloc.class_id ? classById.get(alloc.class_id) : null;
                    return (
                      <div key={alloc.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-emerald-300">
                            {alloc.subject_name} <span className="font-mono text-slate-400">({alloc.subject_code})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Class: {cls ? cls.name : 'All / Unassigned'} • {alloc.periods_per_week} periods/week • Status: {alloc.status}
                          </div>
                        </div>
                        {alloc.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeAllocation(alloc.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[10px] font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> End
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Allocate NERDC Subject Form */}
              <form onSubmit={handleAllocateSubject} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Allocate Subject from NERDC Catalog</span>
                  <input
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Filter catalog..."
                    className="bg-slate-800 text-white px-2.5 py-1 rounded-lg border border-slate-700 text-[11px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={allocSubjectCode}
                    onChange={e => {
                      const match = NERDC_SUBJECTS_DATABASE.find(s => s.code === e.target.value);
                      setAllocSubjectCode(e.target.value);
                      if (match) setAllocSubjectName(match.name);
                    }}
                    className="bg-slate-800 text-white px-2.5 py-2 rounded-xl border border-slate-700"
                  >
                    {filteredNerdcCatalog.map(sub => (
                      <option key={sub.id} value={sub.code}>
                        {sub.code} — {sub.name} ({sub.level.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <select
                    value={allocClassId}
                    onChange={e => setAllocClassId(e.target.value)}
                    className="bg-slate-800 text-white px-2.5 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">Any Class Arm</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.academic_year})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={allocSubjectName}
                    onChange={e => setAllocSubjectName(e.target.value)}
                    placeholder="Subject Name"
                    className="flex-1 bg-slate-800 text-white px-2.5 py-2 rounded-xl border border-slate-700"
                  />
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={allocPeriods}
                    onChange={e => setAllocPeriods(Number(e.target.value))}
                    className="w-20 bg-slate-800 text-white px-2.5 py-2 rounded-xl border border-slate-700"
                    title="Periods per week"
                  />
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Allocate
                  </button>
                </div>
              </form>
            </div>

            {/* Staff Lifecycle & Separation Workflow */}
            <form onSubmit={handleTransitionStatus} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Lifecycle Status & Separation Transition (Current: {activeStaff.status})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={nextStatus}
                  onChange={e => setNextStatus(e.target.value as StaffStatusTransitionRequest['toStatus'])}
                  className="bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                  <option value="retired">Retired</option>
                  <option value="departed">Departed</option>
                </select>
                <input
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder="Recorded reason (required)..."
                  className="sm:col-span-2 bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {activeStaff.separation_reason && (
                  <span className="text-[11px] text-amber-300">Last transition note: {activeStaff.separation_reason}</span>
                )}
                <button type="submit" className="ml-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold">
                  Apply Status Transition
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal: Register / Edit Staff */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span>{editingStaff ? 'Edit Staff Profile' : 'Register Staff Member'}</span>
              </h2>
              <button onClick={() => setIsStaffModalOpen(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Staff Number *</span>
                  <input
                    required
                    value={staffForm.staffNumber}
                    onChange={e => setStaffForm({ ...staffForm, staffNumber: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Designation *</span>
                  <input
                    required
                    value={staffForm.designation}
                    onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">First Name *</span>
                  <input
                    required
                    value={staffForm.firstName}
                    onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Last Name *</span>
                  <input
                    required
                    value={staffForm.lastName}
                    onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Official Email</span>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Official Phone</span>
                  <input
                    value={staffForm.phone}
                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Department</span>
                  <select
                    value={staffForm.departmentId}
                    onChange={e => setStaffForm({ ...staffForm, departmentId: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Staff Category</span>
                  <select
                    value={staffForm.staffCategory}
                    onChange={e => setStaffForm({ ...staffForm, staffCategory: e.target.value as typeof staffForm.staffCategory })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="teaching">Teaching Staff</option>
                    <option value="administrative">Administrative Staff</option>
                    <option value="support">Support Staff</option>
                    <option value="executive">Executive Leadership</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Employment Type</span>
                  <select
                    value={staffForm.employmentType}
                    onChange={e => setStaffForm({ ...staffForm, employmentType: e.target.value as typeof staffForm.employmentType })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="full_time">Full-Time</option>
                    <option value="part_time">Part-Time</option>
                    <option value="contract">Contract</option>
                    <option value="visiting">Visiting</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Max Periods / Week</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={staffForm.maxPeriodsPerWeek}
                    onChange={e => setStaffForm({ ...staffForm, maxPeriodsPerWeek: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Qualification</span>
                  <input
                    value={staffForm.qualification}
                    onChange={e => setStaffForm({ ...staffForm, qualification: e.target.value })}
                    placeholder="B.Sc (Ed) Mathematics"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">TRCN / Registration Number</span>
                  <input
                    value={staffForm.trcnNumber}
                    onChange={e => setStaffForm({ ...staffForm, trcnNumber: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Specialization & Notes</span>
                <textarea
                  rows={2}
                  value={staffForm.specializationNotes}
                  onChange={e => setStaffForm({ ...staffForm, specializationNotes: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsStaffModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">
                  {editingStaff ? 'Save Staff Profile' : 'Register Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
