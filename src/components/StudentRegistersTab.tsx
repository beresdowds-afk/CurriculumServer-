import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Student, 
  ClassGroup, 
  Teacher, 
  ClassAttendanceRegister, 
  StudentAttendanceEntry, 
  AttendanceStatus,
  ClassGrade 
} from '../types';
import { 
  Users, 
  UserCheck, 
  ClipboardList, 
  Search, 
  Filter, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Send, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Download, 
  Printer, 
  Calendar, 
  ChevronRight, 
  Edit3,
  ShieldCheck,
  ScanFace,
  Fingerprint,
  Zap
} from 'lucide-react';
import { BiometricMovementLog } from '../types';

interface StudentRegistersTabProps {
  currentUser: UserProfile;
  students: Student[];
  classGroups: ClassGroup[];
  teachers: Teacher[];
  attendanceRegisters: ClassAttendanceRegister[];
  movementLogs?: BiometricMovementLog[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onSaveAttendanceRegister: (register: ClassAttendanceRegister) => void;
  initialSelectedClassGroupId?: string;
  onNavigateTab?: (tab: any) => void;
}

export const StudentRegistersTab: React.FC<StudentRegistersTabProps> = ({
  currentUser,
  students,
  classGroups,
  teachers,
  attendanceRegisters,
  movementLogs = [],
  onAddStudent,
  onUpdateStudent,
  onSaveAttendanceRegister,
  initialSelectedClassGroupId,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'class_registers' | 'general_roster'>('class_registers');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialSelectedClassGroupId || classGroups[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

  // Enrol Student Modal State
  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [enrolFormData, setEnrolFormData] = useState({
    fullName: '',
    admissionNumber: `CF/2026/${String(students.length + 101).padStart(4, '0')}`,
    gender: 'Female' as 'Male' | 'Female',
    dateOfBirth: '2009-05-15',
    classGroupId: classGroups[0]?.id || '',
    parentName: '',
    parentPhone: '+234 ',
    parentEmail: '',
    residentialAddress: 'Lagos, Nigeria'
  });

  // Current Class Group & its Form Master
  const currentClassGroup = useMemo(() => {
    return classGroups.find(cg => cg.id === selectedClassId) || classGroups[0];
  }, [classGroups, selectedClassId]);

  const currentFormTeacher = useMemo(() => {
    return teachers.find(t => t.id === currentClassGroup?.formTeacherId);
  }, [teachers, currentClassGroup]);

  // Students belonging to the active Class Group (Derived strictly from General Students Register)
  const classStudents = useMemo(() => {
    return students.filter(s => s.classGroupId === selectedClassId);
  }, [students, selectedClassId]);

  // Load existing register or create fresh entries from General Students DB
  const existingRegister = useMemo(() => {
    return attendanceRegisters.find(r => r.classGroupId === selectedClassId && r.date === selectedDate);
  }, [attendanceRegisters, selectedClassId, selectedDate]);

  // Live Register state
  const [liveEntries, setLiveEntries] = useState<Record<string, StudentAttendanceEntry>>({});
  const [generalRemarks, setGeneralRemarks] = useState(existingRegister?.generalRemarks || '');
  const [isSubmittedNotice, setIsSubmittedNotice] = useState<string | null>(null);

  // Synchronize live entries whenever classStudents or existingRegister changes
  React.useEffect(() => {
    const entryMap: Record<string, StudentAttendanceEntry> = {};
    if (existingRegister) {
      existingRegister.entries.forEach(e => {
        entryMap[e.studentId] = { ...e };
      });
      setGeneralRemarks(existingRegister.generalRemarks || '');
    } else {
      classStudents.forEach(stu => {
        entryMap[stu.id] = {
          studentId: stu.id,
          studentName: stu.fullName,
          admissionNumber: stu.admissionNumber,
          gender: stu.gender,
          status: 'present',
          arrivalTime: '07:45 AM',
          remarks: ''
        };
      });
      setGeneralRemarks('Daily morning roll call register taken by Form Master.');
    }
    setLiveEntries(entryMap);
  }, [selectedClassId, selectedDate, existingRegister, classStudents]);

  // Stats calculation
  const stats = useMemo(() => {
    const entries = Object.values(liveEntries) as StudentAttendanceEntry[];
    const total = classStudents.length;
    const present = entries.filter(e => e.status === 'present').length;
    const absent = entries.filter(e => e.status === 'absent').length;
    const late = entries.filter(e => e.status === 'late').length;
    const excused = entries.filter(e => e.status === 'excused').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, absent, late, excused, rate };
  }, [liveEntries, classStudents]);

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setLiveEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        arrivalTime: status === 'present' ? '07:45 AM' : status === 'late' ? '08:15 AM' : undefined
      }
    }));
  };

  const handleSetRemarks = (studentId: string, remarks: string) => {
    setLiveEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleMarkAllPresent = () => {
    setLiveEntries(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(sid => {
        next[sid] = { ...next[sid], status: 'present', arrivalTime: '07:45 AM' };
      });
      return next;
    });
  };

  const handleSyncBiometricLogs = () => {
    // Sync current register entries with biometric logs
    let matchedCount = 0;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    setLiveEntries(prev => {
      const next = { ...prev };
      classStudents.forEach(student => {
        // Find matching movement log for student
        const studentLog = movementLogs.find(
          log => (log.personId === student.id || log.personAdmissionNo === student.admissionNumber) &&
                 log.movementType === 'inbound_entry'
        );

        if (studentLog) {
          matchedCount++;
          const status = studentLog.punctualityStatus === 'late' ? 'late' : 'present';
          next[student.id] = {
            ...next[student.id],
            status,
            arrivalTime: studentLog.timeFormatted,
            remarks: `Biometric ${studentLog.verificationMethod.toUpperCase()} at ${studentLog.deviceName} (${studentLog.timeFormatted})`
          };
        } else {
          // If no biometric log found, default keep or mark absent with device note
          if (!next[student.id]?.arrivalTime) {
            next[student.id] = {
              ...next[student.id],
              remarks: next[student.id]?.remarks || 'No Gate/Biometric Terminal scan detected'
            };
          }
        }
      });
      return next;
    });

    setIsSubmittedNotice(
      `Biometric Hardware Sync: Matched ${matchedCount} verified scans across gate turnstiles & classroom terminals at ${nowTime}.`
    );
    setTimeout(() => setIsSubmittedNotice(null), 6000);
  };

  const handleSaveRegister = () => {
    const entriesArray = Object.values(liveEntries) as StudentAttendanceEntry[];
    const newReg: ClassAttendanceRegister = {
      id: existingRegister?.id || `reg-${selectedClassId}-${selectedDate}`,
      date: selectedDate,
      classGroupId: currentClassGroup.id,
      classGroupName: currentClassGroup.name,
      classGrade: currentClassGroup.grade,
      term: currentClassGroup.term,
      week: 5,
      session: 'Full Day',
      takenById: currentFormTeacher?.id || currentUser.id,
      takenByName: currentFormTeacher?.fullName || currentUser.name,
      takenAt: new Date().toISOString(),
      entries: entriesArray,
      totalEnrolled: stats.total,
      totalPresent: stats.present,
      totalAbsent: stats.absent,
      totalLate: stats.late,
      totalExcused: stats.excused,
      attendanceRatePercentage: stats.rate,
      generalRemarks,
      isSubmitted: true
    };

    onSaveAttendanceRegister(newReg);
    setIsSubmittedNotice(`Daily Attendance Register for ${currentClassGroup.name} on ${selectedDate} has been locked & saved. Attendance: ${stats.rate}%.`);
    setTimeout(() => setIsSubmittedNotice(null), 6000);
  };

  const handleEnrolStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolFormData.fullName.trim() || !enrolFormData.parentName.trim() || !enrolFormData.parentPhone.trim()) {
      alert('Please fill all required student and parent fields.');
      return;
    }

    const matchedGroup = classGroups.find(cg => cg.id === enrolFormData.classGroupId) || classGroups[0];

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      admissionNumber: enrolFormData.admissionNumber,
      fullName: enrolFormData.fullName,
      gender: enrolFormData.gender,
      dateOfBirth: enrolFormData.dateOfBirth,
      classGroupId: matchedGroup.id,
      classGroupName: matchedGroup.name,
      classGrade: matchedGroup.grade,
      parentName: enrolFormData.parentName,
      parentPhone: enrolFormData.parentPhone,
      parentEmail: enrolFormData.parentEmail || `${enrolFormData.fullName.toLowerCase().replace(/\s+/g, '.')}@parents.curriculumflow.ng`,
      residentialAddress: enrolFormData.residentialAddress,
      enrollmentStatus: 'active',
      termAttendanceRate: 100,
      totalDaysPresent: 1,
      totalDaysAbsent: 0,
      totalDaysLate: 0
    };

    onAddStudent(newStudent);
    setIsEnrolModalOpen(false);
  };

  // General Roster Filtered
  const filteredGeneralStudents = students.filter(s => {
    if (selectedGradeFilter !== 'all' && s.classGrade !== selectedGradeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchAdm = s.admissionNumber.toLowerCase().includes(q);
      const matchClass = s.classGroupName.toLowerCase().includes(q);
      const matchParent = s.parentName.toLowerCase().includes(q);
      if (!matchName && !matchAdm && !matchClass && !matchParent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>Institutional Student Registers & Daily Attendance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Student Register & Class Group Attendance Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Unified roll-call registers derived dynamically from the school's general student database. Track student presence, automated parent communication, and punctuality records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsEnrolModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enrol Student to Master DB</span>
            </button>
          </div>
        </div>

        {/* Sub-Nav Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-800/90 rounded-2xl border border-slate-700 w-fit mt-6">
          <button
            onClick={() => setActiveTab('class_registers')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'class_registers'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Class Group Registers (Daily Roll Call)</span>
          </button>

          <button
            onClick={() => setActiveTab('general_roster')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'general_roster'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>General Students Master Register ({students.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: CLASS GROUP DAILY ATTENDANCE REGISTER */}
      {activeTab === 'class_registers' && (
        <div className="space-y-6">
          {/* Class & Date Selector Controls */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Class Arm:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-800 text-white font-bold py-2 px-3.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {classGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name} ({cg.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Register Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 text-white font-mono font-bold py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="self-end pb-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Form Master: <strong className="text-emerald-400">{currentFormTeacher?.fullName || 'Assigned Master'}</strong>
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentClassGroup.roomNumber} • Term 1
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncBiometricLogs}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="Sync attendance directly from facial recognition and fingerprint gate devices"
              >
                <ScanFace className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sync Biometric Hardware</span>
              </button>

              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All Present</span>
              </button>

              <button
                onClick={handleSaveRegister}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Save & Submit Register</span>
              </button>
            </div>
          </div>

          {/* Submission Notice */}
          {isSubmittedNotice && (
            <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isSubmittedNotice}</span>
            </div>
          )}

          {/* Attendance KPI Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Enrolled in Arm</span>
              <span className="text-xl font-extrabold text-white mt-1 block font-mono">{stats.total}</span>
              <span className="text-[10px] text-slate-500">Derived from General DB</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Present (P)</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block font-mono">{stats.present}</span>
              <span className="text-[10px] text-emerald-500">In class session</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Late (L)</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block font-mono">{stats.late}</span>
              <span className="text-[10px] text-amber-500">Arrived after 08:00 AM</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Absent (A)</span>
              <span className="text-xl font-extrabold text-rose-400 mt-1 block font-mono">{stats.absent}</span>
              <span className="text-[10px] text-rose-500">Parent alert generated</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Daily Rate</span>
              <span className="text-xl font-extrabold text-teal-400 mt-1 block font-mono">{stats.rate}%</span>
              <span className="text-[10px] text-teal-500">Attendance Index</span>
            </div>
          </div>

          {/* Roll Call Attendance Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 overflow-x-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Class Roll Call: {currentClassGroup.name}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {classStudents.length} Students strictly synchronized with General Students Database
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Date: {selectedDate}
              </span>
            </div>

            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No students currently enrolled under this Class Group. Switch to the <strong>General Students Master Register</strong> tab to enrol students into {currentClassGroup.name}.
              </div>
            ) : (
              <div className="min-w-[700px] space-y-2">
                <div className="grid grid-cols-12 gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800 px-2">
                  <div className="col-span-1">No.</div>
                  <div className="col-span-4">Student Name & Admission ID</div>
                  <div className="col-span-4 text-center">Daily Status</div>
                  <div className="col-span-3">Remarks / Time</div>
                </div>

                {classStudents.map((stu, index) => {
                  const entry = liveEntries[stu.id] || {
                    studentId: stu.id,
                    studentName: stu.fullName,
                    admissionNumber: stu.admissionNumber,
                    gender: stu.gender,
                    status: 'present'
                  };

                  return (
                    <div
                      key={stu.id}
                      className="grid grid-cols-12 gap-3 items-center p-3 rounded-2xl bg-slate-850/60 border border-slate-800 hover:bg-slate-800/80 transition-all text-xs"
                    >
                      <div className="col-span-1 font-mono text-slate-500">
                        {index + 1}.
                      </div>

                      <div className="col-span-4">
                        <span className="font-bold text-white block">{stu.fullName}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{stu.admissionNumber}</span>
                          <span>•</span>
                          <span>{stu.gender}</span>
                          <span>•</span>
                          <span className="text-emerald-400">{stu.termAttendanceRate}% Term Att.</span>
                        </div>
                      </div>

                      <div className="col-span-4 flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'present')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1 ${
                            entry.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'late')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1 ${
                            entry.status === 'late'
                              ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Late</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetStatus(stu.id, 'absent')}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1 ${
                            entry.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>Absent</span>
                        </button>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="text"
                          value={entry.remarks || ''}
                          onChange={(e) => handleSetRemarks(stu.id, e.target.value)}
                          placeholder={entry.status === 'late' ? 'Time / Reason' : 'Remarks (Optional)'}
                          className="w-full bg-slate-900 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 text-[11px] focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* General Remarks Box */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <label className="text-slate-400 font-semibold block">Form Master's Daily Roll-Call Remarks & Sign-off:</label>
              <textarea
                rows={2}
                value={generalRemarks}
                onChange={(e) => setGeneralRemarks(e.target.value)}
                placeholder="Notes on morning assembly, health cases, weather delays, or clinic referrals..."
                className="w-full bg-slate-800 text-slate-200 p-3 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: GENERAL STUDENTS MASTER DATABASE */}
      {activeTab === 'general_roster' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white">General Students Master Register</h2>
              <p className="text-xs text-slate-400 mt-1">
                Centralized student repository containing student biodata, parent contact details, assigned Class Groups, and cumulative attendance rates.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
                {students.length} Total Enrolled Students
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Search Master Register</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, admission number, parent name..."
                  className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">Filter by Class Grade</label>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Grades (JSS 1 - SS 3)</option>
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
                <option value="SS 1">SS 1</option>
                <option value="SS 2">SS 2</option>
                <option value="SS 3">SS 3</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Admission No.</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class Group</th>
                  <th className="py-3 px-3">Gender</th>
                  <th className="py-3 px-3">Parent / Guardian</th>
                  <th className="py-3 px-3">Parent Phone</th>
                  <th className="py-3 px-3 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredGeneralStudents.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {stu.admissionNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {stu.fullName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {stu.classGroupName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {stu.gender}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {stu.parentName}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      <a 
                        href={`tel:${stu.parentPhone.replace(/\s+/g, '')}`} 
                        className="hover:text-emerald-400 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{stu.parentPhone}</span>
                      </a>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                        {stu.termAttendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrol Student Modal */}
      {isEnrolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Enrol Student to Master Register</h2>
              </div>
              <button 
                onClick={() => setIsEnrolModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrolStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={enrolFormData.fullName}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, fullName: e.target.value })}
                    placeholder="e.g. Fatima Garba"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Admission Number *</label>
                  <input
                    type="text"
                    required
                    value={enrolFormData.admissionNumber}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, admissionNumber: e.target.value })}
                    placeholder="CF/2026/0145"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Gender *</label>
                  <select
                    value={enrolFormData.gender}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, gender: e.target.value as any })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={enrolFormData.dateOfBirth}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Assigned Class Arm *</label>
                  <select
                    value={enrolFormData.classGroupId}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, classGroupId: e.target.value })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    {classGroups.map(cg => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} ({cg.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Parent / Guardian Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Parent Full Name *</label>
                    <input
                      type="text"
                      required
                      value={enrolFormData.parentName}
                      onChange={(e) => setEnrolFormData({ ...enrolFormData, parentName: e.target.value })}
                      placeholder="e.g. Alhaji Garba Danladi"
                      className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Parent Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={enrolFormData.parentPhone}
                      onChange={(e) => setEnrolFormData({ ...enrolFormData, parentPhone: e.target.value })}
                      placeholder="+234 803 111 2233"
                      className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Parent Email Address</label>
                  <input
                    type="email"
                    value={enrolFormData.parentEmail}
                    onChange={(e) => setEnrolFormData({ ...enrolFormData, parentEmail: e.target.value })}
                    placeholder="parent@consulting.ng"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnrolModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40"
                >
                  Complete Enrolment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
