import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  ClipboardList,
  DoorOpen,
  Edit3,
  GraduationCap,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import type {
  AcademicSessionRecord,
  CreateDepartmentRequest,
  CreateSchoolClassRequest,
  SchoolAdministrationClass,
  SchoolAdministrationStudent,
  SchoolDepartmentRecord,
  SchoolStaffRecord
} from '../../packages/shared-types/src/apiContracts';
import type { UserProfile } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';

interface ClassGroupsTabProps {
  currentUser?: UserProfile;
  onSelectClassForTimetable?: (classGroupId: string) => void;
  onSelectClassForRegister?: (classGroupId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ClassGroupsTab: React.FC<ClassGroupsTabProps> = ({
  onSelectClassForTimetable,
  onSelectClassForRegister,
  onNavigateTab
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const [subTab, setSubTab] = useState<'class_arms' | 'departments'>('class_arms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Persisted tenant datasets
  const [classes, setClasses] = useState<SchoolAdministrationClass[]>([]);
  const [departments, setDepartments] = useState<SchoolDepartmentRecord[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [staff, setStaff] = useState<SchoolStaffRecord[]>([]);
  const [students, setStudents] = useState<SchoolAdministrationStudent[]>([]);

  // Filters & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Class modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolAdministrationClass | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    academicYear: '',
    section: '',
    gradeLevel: 'JSS 1',
    arm: 'A',
    roomNumber: '',
    capacity: 35,
    departmentId: '',
    academicSessionId: '',
    classTeacherStaffId: '',
    status: 'active' as 'active' | 'archived'
  });

  // Department modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<SchoolDepartmentRecord | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    unitType: 'academic' as 'academic' | 'administrative' | 'support' | 'faculty',
    parentDepartmentId: '',
    headStaffId: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });

  const loadData = useCallback(async () => {
    if (!unifiedApiClient.isAuthenticated('school_flow')) return;
    setLoading(true);
    setError('');
    try {
      const [classRes, deptRes, sessRes, staffRes, studentRes] = await Promise.all([
        unifiedApiClient.listClasses({ page: 1, pageSize: 100 }),
        unifiedApiClient.listDepartments().catch(() => [] as SchoolDepartmentRecord[]),
        unifiedApiClient.listAcademicSessions().catch(() => [] as AcademicSessionRecord[]),
        unifiedApiClient.listStaff({ page: 1, pageSize: 100 }).catch(() => ({ records: [] as SchoolStaffRecord[], page: 1, pageSize: 100, total: 0 })),
        unifiedApiClient.listStudents({ page: 1, pageSize: 200 }).catch(() => ({ records: [] as SchoolAdministrationStudent[], page: 1, pageSize: 200, total: 0 }))
      ]);
      setClasses(classRes.records);
      setDepartments(deptRes);
      setSessions(sessRes);
      setStaff(staffRes.records);
      setStudents(studentRes.records);
      setSelectedClassId(prev => (prev && classRes.records.some(c => c.id === prev) ? prev : classRes.records[0]?.id || ''));
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to load school classes and organizational departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSession = useMemo(
    () => sessions.find(s => s.is_current) || sessions[0] || null,
    [sessions]
  );

  const staffById = useMemo(() => {
    const map = new Map<string, SchoolStaffRecord>();
    for (const s of staff) map.set(s.id, s);
    return map;
  }, [staff]);

  const deptById = useMemo(() => {
    const map = new Map<string, SchoolDepartmentRecord>();
    for (const d of departments) map.set(d.id, d);
    return map;
  }, [departments]);

  const studentsByClass = useMemo(() => {
    const map = new Map<string, SchoolAdministrationStudent[]>();
    for (const stu of students) {
      if (!stu.class_id) continue;
      const list = map.get(stu.class_id) || [];
      list.push(stu);
      map.set(stu.class_id, list);
    }
    return map;
  }, [students]);

  const gradeOptions = useMemo(() => {
    const grades = Array.from(new Set(classes.map(c => c.grade_level).filter(Boolean) as string[]));
    return grades.sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classes.filter(c => {
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      if (selectedGrade !== 'all' && (c.grade_level || '') !== selectedGrade) return false;
      if (q) {
        const teacher = c.class_teacher_staff_id ? staffById.get(c.class_teacher_staff_id) : undefined;
        const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.toLowerCase() : '';
        const deptName = c.department_id ? (deptById.get(c.department_id)?.name || '').toLowerCase() : '';
        const matches =
          c.name.toLowerCase().includes(q) ||
          (c.section || '').toLowerCase().includes(q) ||
          (c.grade_level || '').toLowerCase().includes(q) ||
          (c.arm || '').toLowerCase().includes(q) ||
          (c.room_number || '').toLowerCase().includes(q) ||
          teacherName.includes(q) ||
          deptName.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [classes, selectedStatus, selectedGrade, searchQuery, staffById, deptById]);

  const activeClass = useMemo(
    () => classes.find(c => c.id === selectedClassId) || filteredClasses[0] || null,
    [classes, selectedClassId, filteredClasses]
  );

  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm({
      name: '',
      academicYear: activeSession?.session_code || activeSession?.display_name || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      section: 'General',
      gradeLevel: 'JSS 1',
      arm: 'A',
      roomNumber: '',
      capacity: 35,
      departmentId: '',
      academicSessionId: activeSession?.id || '',
      classTeacherStaffId: '',
      status: 'active'
    });
    setIsClassModalOpen(true);
  };

  const openEditClass = (cls: SchoolAdministrationClass) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      academicYear: cls.academic_year,
      section: cls.section || '',
      gradeLevel: cls.grade_level || '',
      arm: cls.arm || '',
      roomNumber: cls.room_number || '',
      capacity: cls.capacity || 35,
      departmentId: cls.department_id || '',
      academicSessionId: cls.academic_session_id || '',
      classTeacherStaffId: cls.class_teacher_staff_id || '',
      status: cls.status
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!classForm.name.trim() || !classForm.academicYear.trim()) {
      setError('Class name and academic year are required.');
      return;
    }
    const payload: CreateSchoolClassRequest = {
      name: classForm.name.trim(),
      academicYear: classForm.academicYear.trim(),
      section: classForm.section.trim() || 'General',
      gradeLevel: classForm.gradeLevel.trim() || undefined,
      arm: classForm.arm.trim() || undefined,
      roomNumber: classForm.roomNumber.trim() || undefined,
      capacity: Number(classForm.capacity) > 0 ? Number(classForm.capacity) : 35,
      departmentId: classForm.departmentId || null,
      academicSessionId: classForm.academicSessionId || null,
      classTeacherStaffId: classForm.classTeacherStaffId || null
    };
    try {
      if (editingClass) {
        const updated = await unifiedApiClient.updateClass(editingClass.id, {
          ...payload,
          status: classForm.status
        });
        setSelectedClassId(updated.id);
        setNotice(`Class arm "${updated.name}" updated.`);
      } else {
        const created = await unifiedApiClient.createClass(payload);
        setSelectedClassId(created.id);
        setNotice(`Class arm "${created.name}" created in PostgreSQL.`);
      }
      setIsClassModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to save class arm.');
    }
  };

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm({
      name: '',
      code: '',
      unitType: 'academic',
      parentDepartmentId: '',
      headStaffId: '',
      description: '',
      status: 'active'
    });
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: SchoolDepartmentRecord) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      unitType: dept.unit_type,
      parentDepartmentId: dept.parent_department_id || '',
      headStaffId: dept.head_staff_id || '',
      description: dept.description || '',
      status: dept.status
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!deptForm.name.trim()) {
      setError('Department name is required.');
      return;
    }
    const basePayload: CreateDepartmentRequest = {
      name: deptForm.name.trim(),
      code: deptForm.code.trim() || null,
      unitType: deptForm.unitType,
      parentDepartmentId: deptForm.parentDepartmentId || null,
      headStaffId: deptForm.headStaffId || null,
      description: deptForm.description.trim()
    };
    try {
      if (editingDept) {
        const updated = await unifiedApiClient.updateDepartment(editingDept.id, {
          ...basePayload,
          status: deptForm.status
        });
        setNotice(`Department "${updated.name}" updated.`);
      } else {
        const created = await unifiedApiClient.createDepartment(basePayload);
        setNotice(`Organizational unit "${created.name}" created.`);
      }
      setIsDeptModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Unable to save organizational department.');
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
          Class groups, grade levels, arms, and organizational departments are isolated per school tenant in PostgreSQL. Sign in via School Admin Access to inspect or modify school structure.
        </p>
      </div>
    );
  }

  const activeClassStudents = activeClass ? studentsByClass.get(activeClass.id) || [] : [];
  const activeClassTeacher = activeClass?.class_teacher_staff_id ? staffById.get(activeClass.class_teacher_staff_id) || null : null;
  const activeClassDepartment = activeClass?.department_id ? deptById.get(activeClass.department_id) || null : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Organizational Structure, Class Levels & Arms</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Class Groups & Departments Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Manage school faculties, administrative departments, academic class levels, arms, classroom capacities, and appointed form masters.
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
              onClick={subTab === 'class_arms' ? openCreateClass : openCreateDept}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{subTab === 'class_arms' ? 'Create Class Arm' : 'Create Department'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSubTab('class_arms')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                subTab === 'class_arms'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Class Arms ({classes.length})</span>
            </button>
            <button
              onClick={() => setSubTab('departments')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                subTab === 'departments'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Departments & Units ({departments.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>{classes.filter(c => c.status === 'active').length} active arms</span>
            <span>•</span>
            <span>{students.length} enrolled students</span>
          </div>
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

      {/* Sub-Tab 1: Class Arms */}
      {subTab === 'class_arms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search class name, arm, room, teacher, department..."
                className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700"
            >
              <option value="all">All Grade Levels ({gradeOptions.length})</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'all' | 'active' | 'archived')}
              className="bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Arms</option>
              <option value="archived">Archived Arms</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[750px] overflow-y-auto">
              <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Class Groups ({filteredClasses.length})</span>
                <span className="text-[10px] font-normal">PostgreSQL Persisted</span>
              </div>

              {filteredClasses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No class arms match the current filters. Create a class arm to get started.
                </div>
              ) : (
                filteredClasses.map(cg => {
                  const enrolledCount = (studentsByClass.get(cg.id) || []).length;
                  const teacher = cg.class_teacher_staff_id ? staffById.get(cg.class_teacher_staff_id) : null;
                  const capacity = cg.capacity || 35;
                  const ratio = Math.round((enrolledCount / capacity) * 100);
                  const isSelected = activeClass?.id === cg.id;

                  return (
                    <button
                      key={cg.id}
                      onClick={() => setSelectedClassId(cg.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{cg.name}</span>
                            {cg.grade_level && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                                {cg.grade_level}{cg.arm ? ` • ${cg.arm}` : ''}
                              </span>
                            )}
                          </h3>
                          <span className="text-[10px] text-slate-400">
                            {cg.room_number || 'Room unassigned'} • {cg.academic_year}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          cg.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {cg.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800 text-slate-300">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unassigned Form Master'}</span>
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{enrolledCount} / {capacity} ({ratio}%)</span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {activeClass && (
              <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {activeClass.grade_level || 'Class'} {activeClass.arm ? `• Arm ${activeClass.arm}` : ''}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                        {activeClass.section || 'General'} Section
                      </span>
                      {activeClassDepartment && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {activeClassDepartment.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">{activeClass.name}</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4 text-emerald-400" />
                      <span>Room: <strong className="text-slate-200">{activeClass.room_number || 'Unassigned'}</strong> • Academic Year: <strong className="text-slate-200">{activeClass.academic_year}</strong></span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openEditClass(activeClass)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Arm</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onSelectClassForRegister) onSelectClassForRegister(activeClass.id);
                        else if (onNavigateTab) onNavigateTab('student_registers');
                        else window.location.hash = '#/student_registers';
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Register</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onSelectClassForTimetable) onSelectClassForTimetable(activeClass.id);
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

                {/* Form Master Card */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Appointed Form Master / Class Teacher</span>
                  </div>
                  {activeClassTeacher ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold text-white">{activeClassTeacher.first_name} {activeClassTeacher.last_name}</p>
                        <p className="text-[11px] font-mono text-emerald-400">{activeClassTeacher.staff_number} • {activeClassTeacher.designation}</p>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {activeClassTeacher.email || 'No email'} • {activeClassTeacher.phone || 'No phone'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No form master is currently appointed for this class arm.</p>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Enrolled Students</span>
                    <span className="text-lg font-extrabold text-white block mt-1">{activeClassStudents.length}</span>
                  </div>
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Capacity Limit</span>
                    <span className="text-lg font-extrabold text-white block mt-1">{activeClass.capacity || 35} Seats</span>
                  </div>
                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Utilization</span>
                    <span className="text-lg font-extrabold text-emerald-400 block mt-1">
                      {Math.round((activeClassStudents.length / (activeClass.capacity || 35)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Enrolled Students Roster */}
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-400" />
                      <span>Assigned Students ({activeClassStudents.length})</span>
                    </span>
                  </div>
                  {activeClassStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      No students are currently assigned to this class arm. Assign students from the Student Registers tab.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {activeClassStudents.map((stu, idx) => (
                        <div key={stu.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 w-5">{idx + 1}.</span>
                            <span className="font-bold text-white">{stu.first_name} {stu.last_name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{stu.admission_number}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-semibold">
                            {stu.lifecycle_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Departments & Organizational Hierarchy */}
      {subTab === 'departments' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white">Departments, Faculties & Administrative Units</h2>
              <p className="text-xs text-slate-400">Hierarchical institutional units with department heads and parent-unit links.</p>
            </div>
          </div>

          {departments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
              No departments configured yet. Create an academic faculty or administrative unit to begin structuring the school.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const parent = dept.parent_department_id ? deptById.get(dept.parent_department_id) : null;
                const head = dept.head_staff_id ? staffById.get(dept.head_staff_id) : null;
                const linkedClasses = classes.filter(c => c.department_id === dept.id);
                return (
                  <div key={dept.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
                              {dept.unit_type}
                            </span>
                            {dept.code && (
                              <span className="text-[10px] font-mono text-slate-400">{dept.code}</span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white mt-1.5">{dept.name}</h3>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          dept.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {dept.status}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="text-xs text-slate-400">{dept.description}</p>
                      )}
                      <div className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                        <div>Parent Unit: <strong className="text-white">{parent ? parent.name : 'Top-Level Unit'}</strong></div>
                        <div>Head of Unit: <strong className="text-emerald-300">{head ? `${head.first_name} ${head.last_name}` : 'Unassigned'}</strong></div>
                        <div>Linked Class Arms: <strong className="text-white">{linkedClasses.length}</strong></div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-800">
                      <button
                        onClick={() => openEditDept(dept)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Unit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Class Arm */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>{editingClass ? 'Edit Class Arm' : 'Create Class Arm'}</span>
              </h2>
              <button onClick={() => setIsClassModalOpen(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Class Name *</span>
                  <input
                    required
                    value={classForm.name}
                    onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                    placeholder="e.g. SS 2 Science A"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Academic Year *</span>
                  <input
                    required
                    value={classForm.academicYear}
                    onChange={e => setClassForm({ ...classForm, academicYear: e.target.value })}
                    placeholder="2026/2027"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Grade Level</span>
                  <input
                    value={classForm.gradeLevel}
                    onChange={e => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                    placeholder="JSS 1 / SS 2 / Primary 5"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Arm / Stream</span>
                  <input
                    value={classForm.arm}
                    onChange={e => setClassForm({ ...classForm, arm: e.target.value })}
                    placeholder="A / Gold / Science"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Section</span>
                  <input
                    value={classForm.section}
                    onChange={e => setClassForm({ ...classForm, section: e.target.value })}
                    placeholder="Senior Secondary / Science"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Classroom Location</span>
                  <input
                    value={classForm.roomNumber}
                    onChange={e => setClassForm({ ...classForm, roomNumber: e.target.value })}
                    placeholder="Block B, Room 204"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Capacity</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={classForm.capacity}
                    onChange={e => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Academic Session</span>
                  <select
                    value={classForm.academicSessionId}
                    onChange={e => setClassForm({ ...classForm, academicSessionId: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">Unlinked</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.display_name} ({s.session_code})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Department / Faculty</span>
                  <select
                    value={classForm.departmentId}
                    onChange={e => setClassForm({ ...classForm, departmentId: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">None</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Form Master / Class Teacher</span>
                  <select
                    value={classForm.classTeacherStaffId}
                    onChange={e => setClassForm({ ...classForm, classTeacherStaffId: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {staff.map(st => (
                      <option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.staff_number})</option>
                    ))}
                  </select>
                </label>
              </div>

              {editingClass && (
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Status</span>
                  <select
                    value={classForm.status}
                    onChange={e => setClassForm({ ...classForm, status: e.target.value as 'active' | 'archived' })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsClassModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">
                  {editingClass ? 'Save Changes' : 'Create Class Arm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Department */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{editingDept ? 'Edit Department / Unit' : 'Create Department / Organizational Unit'}</span>
              </h2>
              <button onClick={() => setIsDeptModalOpen(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Department Name *</span>
                  <input
                    required
                    value={deptForm.name}
                    onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Faculty of Natural Sciences"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Unit Code</span>
                  <input
                    value={deptForm.code}
                    onChange={e => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="SCI-FAC"
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Unit Type</span>
                  <select
                    value={deptForm.unitType}
                    onChange={e => setDeptForm({ ...deptForm, unitType: e.target.value as typeof deptForm.unitType })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="academic">Academic Department</option>
                    <option value="faculty">Faculty / Division</option>
                    <option value="administrative">Administrative Unit</option>
                    <option value="support">Support Unit</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Parent Unit</span>
                  <select
                    value={deptForm.parentDepartmentId}
                    onChange={e => setDeptForm({ ...deptForm, parentDepartmentId: e.target.value })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="">None (Top-Level)</option>
                    {departments
                      .filter(d => d.id !== editingDept?.id)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Department Head (Staff Member)</span>
                <select
                  value={deptForm.headStaffId}
                  onChange={e => setDeptForm({ ...deptForm, headStaffId: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                >
                  <option value="">Unassigned</option>
                  {staff.map(st => (
                    <option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.staff_number})</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Description</span>
                <textarea
                  rows={2}
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                />
              </label>

              {editingDept && (
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Status</span>
                  <select
                    value={deptForm.status}
                    onChange={e => setDeptForm({ ...deptForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold">
                  {editingDept ? 'Save Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
