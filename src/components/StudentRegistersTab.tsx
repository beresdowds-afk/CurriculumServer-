import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  IdCard,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import type {
  SchoolAdministrationClass,
  SchoolAdministrationStudent,
  StudentAdmissionRecord,
  StudentDigitalIdCardRecord,
  StudentMedicalProfileRecord
} from '../../packages/shared-types/src/apiContracts';
import type { UserProfile } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface StudentRegistersTabProps {
  currentUser?: UserProfile;
  initialSelectedClassGroupId?: string;
  onNavigateTab?: (tab: any) => void;
}

export const StudentRegistersTab: React.FC<StudentRegistersTabProps> = ({
  initialSelectedClassGroupId
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [activeTab, setActiveTab] = useState<'general_roster' | 'admissions'>('general_roster');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [students, setStudents] = useState<SchoolAdministrationStudent[]>([]);
  const [classes, setClasses] = useState<SchoolAdministrationClass[]>([]);
  const [admissions, setAdmissions] = useState<StudentAdmissionRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(initialSelectedClassGroupId || 'all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    admissionNumber: '',
    firstName: '',
    lastName: '',
    gender: 'female' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
    dateOfBirth: '',
    nationality: 'Nigerian',
    stateOfOrigin: '',
    residentialAddress: ''
  });

  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    applicationNumber: '',
    firstName: '',
    lastName: '',
    targetGradeLevel: 'JSS 1',
    previousSchoolName: ''
  });

  // Active Student Dossier Modal (Medical, Digital ID, Class Allocation, Lifecycle, History)
  const [selectedStudent, setSelectedStudent] = useState<SchoolAdministrationStudent | null>(null);
  const [medicalProfile, setMedicalProfile] = useState<StudentMedicalProfileRecord | null>(null);
  const [medicalDraft, setMedicalDraft] = useState({
    bloodGroup: 'unknown',
    genotype: 'unknown',
    allergies: '',
    physicianName: '',
    physicianPhone: '',
    consentForEmergencyCare: false
  });
  const [digitalId, setDigitalId] = useState<StudentDigitalIdCardRecord | null>(null);
  const [issuedQrToken, setIssuedQrToken] = useState<string>('');
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [assignClassId, setAssignClassId] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadData = useCallback(async () => {
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    setLoading(true);
    setError('');
    try {
      const [studentsRes, classesRes, admissionsRes] = await Promise.allSettled([
        unifiedApiClient.listStudents({ page: 1, pageSize: 100 }),
        unifiedApiClient.listClasses({ page: 1, pageSize: 100 }),
        unifiedApiClient.listAdmissions()
      ]);

      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value.records);
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value.records);
      if (admissionsRes.status === 'fulfilled') setAdmissions(admissionsRes.value);

      if (studentsRes.status === 'rejected') {
        setError((studentsRes.reason as { error?: string })?.error || 'Unable to load students.');
      }
    } catch (err) {
      setError((err as { error?: string })?.error || 'Unable to load student administration records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openStudentDossier = async (student: SchoolAdministrationStudent) => {
    setSelectedStudent(student);
    setAssignClassId(student.class_id || classes[0]?.id || '');
    setIssuedQrToken('');
    setError('');

    const [medRes, cardRes, histRes] = await Promise.allSettled([
      unifiedApiClient.getStudentMedicalProfile(student.id),
      unifiedApiClient.getStudentDigitalId(student.id),
      unifiedApiClient.getStudentHistory(student.id)
    ]);

    if (medRes.status === 'fulfilled') {
      const med = medRes.value;
      setMedicalProfile(med);
      setMedicalDraft({
        bloodGroup: med?.blood_group || 'unknown',
        genotype: med?.genotype || 'unknown',
        allergies: Array.isArray(med?.allergies) ? med.allergies.join(', ') : '',
        physicianName: med?.physician_name || '',
        physicianPhone: med?.physician_phone || '',
        consentForEmergencyCare: Boolean(med?.consent_for_emergency_care)
      });
    } else {
      setMedicalProfile(null);
    }

    if (cardRes.status === 'fulfilled') {
      setDigitalId(cardRes.value);
    } else {
      setDigitalId(null);
    }

    if (histRes.status === 'fulfilled') {
      setHistoryRows(histRes.value);
    } else {
      setHistoryRows([]);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(stu => {
      if (selectedClassFilter !== 'all' && stu.class_id !== selectedClassFilter) return false;
      if (selectedStatusFilter !== 'all' && stu.lifecycle_status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${stu.first_name} ${stu.last_name}`.toLowerCase();
        return full.includes(q) || stu.admission_number.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, selectedClassFilter, selectedStatusFilter, searchQuery]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach(c => map.set(c.id, c.name));
    return map;
  }, [classes]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Authenticated School Session Required</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Sign in to access student admissions, biodata registers, medical profiles, digital identity cards, and lifecycle workflows.
        </p>
        <a
          href="?school_admin=login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
        >
          <Lock className="w-4 h-4" />
          <span>Sign In to School Portal</span>
        </a>
      </div>
    );
  }

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

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>Student Lifecycle, Admissions & Identity Registry</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Student Master Register & Admissions Pipeline</h1>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative PostgreSQL records for student biodata, admissions review, class allocation, medical care consent, and signed digital ID cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdmissionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Admission Application</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEnrolModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Student</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('general_roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'general_roster' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Master Register ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'admissions' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Admissions Queue ({admissions.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'general_roster' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student name or admission number…"
                className="w-full bg-slate-950 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-800"
              />
            </div>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800"
            >
              <option value="all">All Class Groups</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800"
            >
              <option value="all">All Lifecycle Statuses</option>
              {['applicant', 'admitted', 'enrolled', 'active', 'suspended', 'transferred', 'graduated', 'withdrawn'].map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No persisted students match the active filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">Admission No.</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Gender</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map(stu => (
                    <tr key={stu.id} className="hover:bg-slate-850/60">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">{stu.admission_number}</td>
                      <td className="py-3 px-3 font-bold text-white">{stu.first_name} {stu.last_name}</td>
                      <td className="py-3 px-3 text-slate-300">{stu.class_id ? (classNameById.get(stu.class_id) || stu.class_id) : 'Unassigned'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                          {stu.lifecycle_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{stu.gender || '—'}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openStudentDossier(stu)}
                          className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold"
                        >
                          Manage Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admissions' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Admission Applications ({admissions.length})</h2>
          {admissions.length === 0 ? (
            <p className="text-xs text-slate-400">No admission applications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {admissions.map(app => (
                <div key={app.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white">{app.first_name} {app.last_name} · <span className="font-mono text-emerald-400">{app.application_number}</span></div>
                    <div className="text-slate-400">Target Grade: {app.target_grade_level} · Status: <strong className="text-indigo-300">{app.status}</strong></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {app.status !== 'approved' && app.status !== 'enrolled' && (
                      <button
                        type="button"
                        onClick={async () => {
                          setError('');
                          try {
                            await unifiedApiClient.reviewAdmission(app.id, { decision: 'approved', reviewNotes: 'Approved via Student Register console' });
                            showNotice(`Approved admission ${app.application_number}.`);
                            await loadData();
                          } catch (err) {
                            setError((err as { error?: string })?.error || 'Review failed.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                      >
                        Approve
                      </button>
                    )}
                    {app.status === 'approved' && (
                      <button
                        type="button"
                        onClick={async () => {
                          setError('');
                          try {
                            await unifiedApiClient.enrollAdmission(app.id, {
                              admissionNumber: `ADM-${app.application_number}`,
                              classId: app.target_class_id || classes[0]?.id || null
                            });
                            showNotice(`Enrolled applicant ${app.first_name} ${app.last_name}.`);
                            await loadData();
                          } catch (err) {
                            setError((err as { error?: string })?.error || 'Enrollment failed.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        Enroll Student
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-xs">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="font-mono text-emerald-400 font-bold">{selectedStudent.admission_number}</span>
                <h2 className="text-lg font-extrabold text-white">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p className="text-slate-400">Lifecycle Status: <strong className="text-white">{selectedStudent.lifecycle_status}</strong></p>
              </div>
              <button type="button" onClick={() => setSelectedStudent(null)} className="p-2 rounded-xl bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white">Class & Lifecycle</h3>
                <div className="flex gap-2">
                  <select
                    value={assignClassId}
                    onChange={e => setAssignClassId(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                  >
                    <option value="">Select class…</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!assignClassId}
                    onClick={async () => {
                      setError('');
                      try {
                        const updated = await unifiedApiClient.assignStudentClass(selectedStudent.id, assignClassId);
                        setSelectedStudent(updated);
                        showNotice('Class assignment updated.');
                        await loadData();
                      } catch (err) {
                        setError((err as { error?: string })?.error || 'Class assignment failed.');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Assign
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(['admit', 'enroll', 'activate', 'suspend', 'graduate'] as const).map(action => (
                    <button
                      key={action}
                      type="button"
                      onClick={async () => {
                        setError('');
                        try {
                          const updated = await unifiedApiClient.transitionStudentLifecycle(selectedStudent.id, {
                            type: action,
                            ...(action === 'suspend' ? { reason: 'Administrative review' } : {})
                          });
                          setSelectedStudent(updated);
                          showNotice(`Student transitioned via ${action}.`);
                          await loadData();
                        } catch (err) {
                          setError((err as { error?: string })?.error || `Lifecycle action ${action} is not valid from current status.`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold capitalize"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-purple-400" />
                  <span>Digital Identity Card</span>
                </h3>
                {digitalId ? (
                  <div className="space-y-1">
                    <div className="font-mono text-purple-300 font-bold">{digitalId.card_number}</div>
                    <div className="text-slate-400">Status: {digitalId.status} · Expires: {digitalId.expires_at}</div>
                    {issuedQrToken && <div className="text-[11px] font-mono text-emerald-300 break-all">QR Token: {issuedQrToken}</div>}
                    {digitalId.status === 'active' && (
                      <button
                        type="button"
                        onClick={async () => {
                          setError('');
                          try {
                            const revoked = await unifiedApiClient.revokeStudentDigitalId(selectedStudent.id, 'Reissue requested');
                            setDigitalId(revoked);
                            showNotice('Digital ID revoked.');
                          } catch (err) {
                            setError((err as { error?: string })?.error || 'Could not revoke ID card.');
                          }
                        }}
                        className="mt-2 px-3 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 font-semibold"
                      >
                        Revoke Card
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400">No active digital ID issued yet.</p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    try {
                      const issued = await unifiedApiClient.issueStudentDigitalId(selectedStudent.id, 365);
                      setDigitalId(issued.card);
                      setIssuedQrToken(issued.qrToken);
                      showNotice('Signed digital ID card issued.');
                    } catch (err) {
                      setError((err as { error?: string })?.error || 'Failed to issue digital ID card.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Issue Digital ID Card
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>Restricted Medical Profile</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={medicalDraft.bloodGroup}
                  onChange={e => setMedicalDraft(prev => ({ ...prev, bloodGroup: e.target.value }))}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                >
                  {['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>Blood: {bg}</option>
                  ))}
                </select>
                <select
                  value={medicalDraft.genotype}
                  onChange={e => setMedicalDraft(prev => ({ ...prev, genotype: e.target.value }))}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                >
                  {['unknown', 'AA', 'AS', 'SS', 'AC', 'SC'].map(g => (
                    <option key={g} value={g}>Genotype: {g}</option>
                  ))}
                </select>
                <input
                  placeholder="Allergies (comma-separated)"
                  value={medicalDraft.allergies}
                  onChange={e => setMedicalDraft(prev => ({ ...prev, allergies: e.target.value }))}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  placeholder="Physician Name"
                  value={medicalDraft.physicianName}
                  onChange={e => setMedicalDraft(prev => ({ ...prev, physicianName: e.target.value }))}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
                <input
                  placeholder="Physician Phone"
                  value={medicalDraft.physicianPhone}
                  onChange={e => setMedicalDraft(prev => ({ ...prev, physicianPhone: e.target.value }))}
                  className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={medicalDraft.consentForEmergencyCare}
                    onChange={e => setMedicalDraft(prev => ({ ...prev, consentForEmergencyCare: e.target.checked }))}
                  />
                  <span>Guardian consent for emergency medical care</span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    try {
                      const saved = await unifiedApiClient.upsertStudentMedicalProfile(selectedStudent.id, {
                        bloodGroup: medicalDraft.bloodGroup as any,
                        genotype: medicalDraft.genotype as any,
                        allergies: medicalDraft.allergies.split(',').map(s => s.trim()).filter(Boolean),
                        physicianName: medicalDraft.physicianName || null,
                        physicianPhone: medicalDraft.physicianPhone || null,
                        consentForEmergencyCare: medicalDraft.consentForEmergencyCare
                      });
                      setMedicalProfile(saved);
                      showNotice('Medical profile saved.');
                    } catch (err) {
                      setError((err as { error?: string })?.error || 'Could not update medical profile (check medical permission).');
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Save Medical Profile ({medicalProfile ? 'Update' : 'Create'})
                </button>
              </div>
            </div>

            {historyRows.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white">Academic & Lifecycle History</h3>
                {historyRows.map((h, i) => (
                  <div key={i} className="text-[11px] text-slate-300 border-b border-slate-800/60 pb-1">
                    {JSON.stringify(h)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isEnrolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Register New Student</h2>
              <button type="button" onClick={() => setIsEnrolModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setError('');
                try {
                  await unifiedApiClient.createStudent({
                    admissionNumber: studentForm.admissionNumber,
                    firstName: studentForm.firstName,
                    lastName: studentForm.lastName,
                    gender: studentForm.gender,
                    dateOfBirth: studentForm.dateOfBirth || null,
                    nationality: studentForm.nationality || null,
                    stateOfOrigin: studentForm.stateOfOrigin || null,
                    residentialAddress: studentForm.residentialAddress || null
                  });
                  setIsEnrolModalOpen(false);
                  setStudentForm({ admissionNumber: '', firstName: '', lastName: '', gender: 'female', dateOfBirth: '', nationality: 'Nigerian', stateOfOrigin: '', residentialAddress: '' });
                  showNotice('Student created in master register.');
                  await loadData();
                } catch (err) {
                  setError((err as { error?: string })?.error || 'Could not register student.');
                }
              }}
              className="space-y-3"
            >
              <input required placeholder="Admission Number *" value={studentForm.admissionNumber} onChange={e => setStudentForm(p => ({ ...p, admissionNumber: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First Name *" value={studentForm.firstName} onChange={e => setStudentForm(p => ({ ...p, firstName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
                <input required placeholder="Last Name *" value={studentForm.lastName} onChange={e => setStudentForm(p => ({ ...p, lastName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={studentForm.gender} onChange={e => setStudentForm(p => ({ ...p, gender: e.target.value as any }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
                <input type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm(p => ({ ...p, dateOfBirth: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </div>
              <input placeholder="Residential Address" value={studentForm.residentialAddress} onChange={e => setStudentForm(p => ({ ...p, residentialAddress: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                Save Student Record
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdmissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Submit Admission Application</h2>
              <button type="button" onClick={() => setIsAdmissionModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setError('');
                try {
                  await unifiedApiClient.createAdmission({
                    applicationNumber: admissionForm.applicationNumber,
                    firstName: admissionForm.firstName,
                    lastName: admissionForm.lastName,
                    targetGradeLevel: admissionForm.targetGradeLevel,
                    previousSchoolName: admissionForm.previousSchoolName || null
                  });
                  setIsAdmissionModalOpen(false);
                  setAdmissionForm({ applicationNumber: '', firstName: '', lastName: '', targetGradeLevel: 'JSS 1', previousSchoolName: '' });
                  showNotice('Admission application recorded.');
                  await loadData();
                } catch (err) {
                  setError((err as { error?: string })?.error || 'Could not submit admission application.');
                }
              }}
              className="space-y-3"
            >
              <input required placeholder="Application Number *" value={admissionForm.applicationNumber} onChange={e => setAdmissionForm(p => ({ ...p, applicationNumber: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono" />
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First Name *" value={admissionForm.firstName} onChange={e => setAdmissionForm(p => ({ ...p, firstName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
                <input required placeholder="Last Name *" value={admissionForm.lastName} onChange={e => setAdmissionForm(p => ({ ...p, lastName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              </div>
              <input required placeholder="Target Grade Level (e.g. JSS 1) *" value={admissionForm.targetGradeLevel} onChange={e => setAdmissionForm(p => ({ ...p, targetGradeLevel: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              <input placeholder="Previous School Name" value={admissionForm.previousSchoolName} onChange={e => setAdmissionForm(p => ({ ...p, previousSchoolName: e.target.value }))} className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                Submit Application
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
