import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Teacher, 
  ClassGroup, 
  Student, 
  BiometricDevice, 
  BiometricMovementLog, 
  TeacherAttendanceRecord, 
  MovementPass, 
  BiometricEnrollmentProfile,
  BiometricVerificationMethod,
  PunctualityCategory,
  MovementLocationType
} from '../types';
import { 
  ScanFace, 
  Fingerprint, 
  Users, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Wifi, 
  Cpu, 
  Send, 
  Smartphone, 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  X, 
  RefreshCw, 
  Zap, 
  Calendar, 
  Download, 
  Printer, 
  Layers, 
  Building, 
  FileText, 
  Radio, 
  Camera, 
  Sparkles,
  ChevronRight,
  UserCheck,
  Flame,
  Key
} from 'lucide-react';

interface BiometricAttendanceTabProps {
  currentUser: UserProfile;
  teachers: Teacher[];
  classGroups: ClassGroup[];
  students: Student[];
  devices: BiometricDevice[];
  movementLogs: BiometricMovementLog[];
  teacherAttendanceRecords: TeacherAttendanceRecord[];
  movementPasses: MovementPass[];
  biometricProfiles: BiometricEnrollmentProfile[];
  onAddMovementLog: (log: BiometricMovementLog) => void;
  onUpdateTeacherAttendance: (record: TeacherAttendanceRecord) => void;
  onAddMovementPass: (pass: MovementPass) => void;
  onUpdateMovementPass: (pass: MovementPass) => void;
  onUpdateBiometricProfile: (profile: BiometricEnrollmentProfile) => void;
  onSyncClassRegisterFromBiometrics?: (classGroupId: string, date: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export const BiometricAttendanceTab: React.FC<BiometricAttendanceTabProps> = ({
  currentUser,
  teachers,
  classGroups,
  students,
  devices,
  movementLogs,
  teacherAttendanceRecords,
  movementPasses,
  biometricProfiles,
  onAddMovementLog,
  onUpdateTeacherAttendance,
  onAddMovementPass,
  onUpdateMovementPass,
  onUpdateBiometricProfile,
  onSyncClassRegisterFromBiometrics,
  onNavigateTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'live_feed' | 'class_attendance' | 'teacher_attendance' | 'devices_hub' | 'movement_passes' | 'biometric_enrollment'
  >('live_feed');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classGroups[0]?.id || ''
  );
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast / Action notification
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // --- SIMULATOR STATE (Test Live Scan) ---
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPersonType, setSimPersonType] = useState<'student' | 'teacher'>('student');
  const [simPersonId, setSimPersonId] = useState(students[0]?.id || '');
  const [simDeviceId, setSimDeviceId] = useState(devices[0]?.id || '');
  const [simMethod, setSimMethod] = useState<BiometricVerificationMethod>('facial_recognition');
  const [simTimeVariance, setSimTimeVariance] = useState<number>(0); // 0 = on-time, 15 = 15m late

  // --- PASS ISSUANCE MODAL STATE ---
  const [isIssuePassModalOpen, setIsIssuePassModalOpen] = useState(false);
  const [newPassData, setNewPassData] = useState({
    personType: 'student' as 'student' | 'teacher',
    personId: students[0]?.id || '',
    passType: 'clinic_pass' as MovementPass['passType'],
    originLocation: 'Classroom Block A',
    destinationLocation: 'School Health Clinic',
    validMinutes: 30,
    reason: 'Complaining of headache / clinic checkup.'
  });

  // --- BIOMETRIC ENROLLMENT MODAL STATE ---
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollingPerson, setEnrollingPerson] = useState<{
    id: string;
    name: string;
    type: 'student' | 'teacher';
    identifier: string;
    group: string;
  } | null>(null);
  const [enrollStep, setEnrollStep] = useState<'face' | 'fingerprint' | 'complete'>('face');
  const [capturedFaceAngles, setCapturedFaceAngles] = useState<string[]>([]);
  const [capturedFingers, setCapturedFingers] = useState<string[]>([]);

  // Statistics calculation for today's scans
  const liveStats = useMemo(() => {
    const todayLogs = movementLogs.filter(l => l.date === selectedDate);
    const totalScans = todayLogs.length;
    const studentScans = todayLogs.filter(l => l.personType === 'student').length;
    const teacherScans = todayLogs.filter(l => l.personType === 'teacher').length;
    const onTimeScans = todayLogs.filter(l => l.punctualityStatus === 'early' || l.punctualityStatus === 'on_time').length;
    const lateScans = todayLogs.filter(l => l.punctualityStatus === 'slight_late' || l.punctualityStatus === 'late' || l.punctualityStatus === 'very_late').length;
    const onTimePercentage = totalScans > 0 ? Math.round((onTimeScans / totalScans) * 100) : 100;
    const parentAlertsDispatched = todayLogs.filter(l => l.parentAlertStatus === 'delivered' || l.parentAlertStatus === 'sent').length;
    return { totalScans, studentScans, teacherScans, onTimeScans, lateScans, onTimePercentage, parentAlertsDispatched };
  }, [movementLogs, selectedDate]);

  // Selected Class Group info
  const currentClassGroup = useMemo(() => {
    return classGroups.find(c => c.id === selectedClassId) || classGroups[0];
  }, [classGroups, selectedClassId]);

  const currentClassStudents = useMemo(() => {
    return students.filter(s => s.classGroupId === selectedClassId);
  }, [students, selectedClassId]);

  // Class students biometric check-in statuses for today
  const classBiometricStatuses = useMemo(() => {
    const todayLogs = movementLogs.filter(l => l.date === selectedDate && l.personType === 'student' && l.classGroupId === selectedClassId);
    
    return currentClassStudents.map(stu => {
      const studentLogs = todayLogs.filter(l => l.personId === stu.id);
      const firstEntry = studentLogs.find(l => l.movementType === 'entry_gate' || l.movementType === 'classroom_arrival') || studentLogs[0];
      
      const isScanned = !!firstEntry;
      const arrivalTime = firstEntry ? firstEntry.timeFormatted : 'Not Scanned';
      const status: PunctualityCategory = firstEntry ? firstEntry.punctualityStatus : 'late';
      const device = firstEntry ? firstEntry.deviceName : '—';
      const method = firstEntry ? firstEntry.verificationMethod : undefined;
      const parentAlert = firstEntry ? firstEntry.parentAlertStatus : 'pending';

      return {
        student: stu,
        isScanned,
        arrivalTime,
        punctualityStatus: status,
        device,
        method,
        parentAlert,
        confidence: firstEntry?.confidenceScore
      };
    });
  }, [currentClassStudents, movementLogs, selectedDate, selectedClassId]);

  // Handle Trigger Simulated Scan
  const handleExecuteSimulatedScan = () => {
    const selectedDev = devices.find(d => d.id === simDeviceId) || devices[0];
    let personName = '';
    let personIdentifier = '';
    let classGroupId: string | undefined = undefined;
    let classGroupName: string | undefined = undefined;
    let department: string | undefined = undefined;
    let parentPhone: string | undefined = undefined;

    if (simPersonType === 'student') {
      const stu = students.find(s => s.id === simPersonId) || students[0];
      personName = stu.fullName;
      personIdentifier = stu.admissionNumber;
      classGroupId = stu.classGroupId;
      classGroupName = stu.classGroupName;
      parentPhone = stu.parentPhone;
    } else {
      const tch = teachers.find(t => t.id === simPersonId) || teachers[0];
      personName = tch.fullName;
      personIdentifier = tch.staffId;
      department = tch.department;
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Determine punctuality status based on variance
    let punctuality: PunctualityCategory = 'on_time';
    if (simTimeVariance <= -10) punctuality = 'early';
    else if (simTimeVariance <= 0) punctuality = 'on_time';
    else if (simTimeVariance <= 15) punctuality = 'slight_late';
    else punctuality = 'late';

    const newLog: BiometricMovementLog = {
      id: `log-${Date.now()}`,
      personType: simPersonType,
      personId: simPersonId,
      personName,
      personIdentifier,
      classGroupId,
      classGroupName,
      department,
      timestamp: now.toISOString(),
      timeFormatted,
      date: selectedDate,
      deviceId: selectedDev.id,
      deviceName: selectedDev.name,
      locationName: selectedDev.assignedLocationName,
      locationType: selectedDev.locationType,
      verificationMethod: simMethod,
      movementType: selectedDev.locationType === 'main_gate' ? 'entry_gate' : selectedDev.locationType === 'classroom_block' ? 'classroom_arrival' : 'hallway_transit',
      confidenceScore: simMethod === 'facial_recognition' ? 99.4 : 98.6,
      punctualityStatus: punctuality,
      minutesVariance: simTimeVariance,
      parentAlertStatus: simPersonType === 'student' ? 'delivered' : undefined,
      parentAlertChannel: simPersonType === 'student' ? 'sms' : undefined,
      parentAlertDispatchedAt: timeFormatted,
      parentContactNumber: parentPhone,
      isFlagged: punctuality === 'late' || punctuality === 'slight_late',
      flagReason: punctuality === 'late' ? `Scanned ${simTimeVariance} mins after target. Automated Guardian Alert dispatched.` : undefined
    };

    onAddMovementLog(newLog);

    // If teacher, also update teacher attendance clock-in
    if (simPersonType === 'teacher') {
      const existing = teacherAttendanceRecords.find(r => r.teacherId === simPersonId && r.date === selectedDate);
      if (existing) {
        onUpdateTeacherAttendance({
          ...existing,
          clockInTime: timeFormatted,
          clockInMethod: simMethod,
          status: punctuality === 'late' ? 'late' : 'present',
          punctualityStatus: punctuality,
          minutesLate: Math.max(0, simTimeVariance),
          clockInDevice: selectedDev.name
        });
      } else {
        const tch = teachers.find(t => t.id === simPersonId);
        onUpdateTeacherAttendance({
          id: `tch-att-${Date.now()}`,
          teacherId: simPersonId,
          teacherName: tch?.fullName || personName,
          staffId: tch?.staffId || personIdentifier,
          department: tch?.department || 'General Faculty',
          date: selectedDate,
          clockInTime: timeFormatted,
          clockInMethod: simMethod,
          status: punctuality === 'late' ? 'late' : 'present',
          punctualityStatus: punctuality,
          minutesLate: Math.max(0, simTimeVariance),
          totalCampusHours: 'Just Clocked In',
          expectedArrival: '07:30 AM',
          scheduledPeriodsToday: 4,
          punctualLessonsDelivered: punctuality === 'on_time' ? 4 : 3,
          movementLogCount: 1,
          clockInDevice: selectedDev.name,
          adminApprovalStatus: 'approved'
        });
      }
    }

    setIsSimulatorOpen(false);
    showToast(`Instant Biometric Scan Ingested: ${personName} (${simMethod.replace('_', ' ')}) at ${selectedDev.name}. Parent notification queued.`);
  };

  // Handle Sync Class Register from Biometric hardware
  const handleTriggerClassRegisterSync = () => {
    if (onSyncClassRegisterFromBiometrics) {
      onSyncClassRegisterFromBiometrics(selectedClassId, selectedDate);
    }
    showToast(`Class Register for ${currentClassGroup.name} synchronized with live biometric terminal gate & corridor scans!`);
  };

  // Handle Issue Movement Pass
  const handleCreateMovementPass = (e: React.FormEvent) => {
    e.preventDefault();
    let personName = '';
    let personIdentifier = '';
    let classGroupName = '';

    if (newPassData.personType === 'student') {
      const stu = students.find(s => s.id === newPassData.personId) || students[0];
      personName = stu.fullName;
      personIdentifier = stu.admissionNumber;
      classGroupName = stu.classGroupName;
    } else {
      const tch = teachers.find(t => t.id === newPassData.personId) || teachers[0];
      personName = tch.fullName;
      personIdentifier = tch.staffId;
    }

    const now = new Date();
    const issuedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const validUntilDate = new Date(now.getTime() + newPassData.validMinutes * 60000);
    const validUntil = validUntilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newPass: MovementPass = {
      id: `pass-${Date.now()}`,
      passCode: `PASS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      personType: newPassData.personType,
      personId: newPassData.personId,
      personName,
      personIdentifier,
      classGroupName,
      passType: newPassData.passType,
      issuedBy: `${currentUser.name} (${currentUser.role})`,
      issuedAt,
      validUntil,
      originLocation: newPassData.originLocation,
      destinationLocation: newPassData.destinationLocation,
      reason: newPassData.reason,
      status: 'active',
      scannedAtCheckpoints: [
        { checkpointName: 'Origin Departure Terminal', timestamp: issuedAt }
      ]
    };

    onAddMovementPass(newPass);
    setIsIssuePassModalOpen(false);
    showToast(`Digital Movement Pass ${newPass.passCode} issued for ${personName} to ${newPass.destinationLocation}.`);
  };

  // Filtered Live Logs
  const filteredMovementLogs = useMemo(() => {
    return movementLogs.filter(log => {
      if (selectedDate && log.date !== selectedDate) return false;
      if (selectedDeviceFilter !== 'all' && log.deviceId !== selectedDeviceFilter) return false;
      if (selectedRoleFilter !== 'all' && log.personType !== selectedRoleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = log.personName.toLowerCase().includes(q);
        const matchId = log.personIdentifier.toLowerCase().includes(q);
        const matchLoc = log.locationName.toLowerCase().includes(q);
        const matchDev = log.deviceName.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchLoc && !matchDev) return false;
      }
      return true;
    });
  }, [movementLogs, selectedDate, selectedDeviceFilter, selectedRoleFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Hero Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ScanFace className="w-4 h-4" />
              <span>Biometric IoT & Automated Attendance Infrastructure</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Biometric Attendance, Punctuality & Movement Monitoring
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Real-time synchronization with facial recognition terminals, dual-fingerprint turnstiles, and hallway movement scanners across all class groups and staff members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate Biometric Scan</span>
            </button>

            <button
              onClick={() => setIsIssuePassModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-xs transition-all flex items-center gap-2"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Issue Movement Pass</span>
            </button>
          </div>
        </div>

        {/* Live System Status Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Hardware Fleet</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-extrabold text-white">{devices.filter(d => d.status === 'online').length}/{devices.length} Online</span>
            </div>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Today's Scans</span>
            <span className="text-sm font-extrabold text-white mt-1 block font-mono">{liveStats.totalScans}</span>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Students Scanned</span>
            <span className="text-sm font-extrabold text-emerald-400 mt-1 block font-mono">{liveStats.studentScans}</span>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Staff Clocked-In</span>
            <span className="text-sm font-extrabold text-teal-400 mt-1 block font-mono">{liveStats.teacherScans}</span>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Punctuality Index</span>
            <span className="text-sm font-extrabold text-amber-400 mt-1 block font-mono">{liveStats.onTimePercentage}%</span>
          </div>

          <div className="bg-slate-850/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Parent Alerts Sent</span>
            <span className="text-sm font-extrabold text-blue-400 mt-1 block font-mono">{liveStats.parentAlertsDispatched}</span>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700 w-fit mt-6">
          <button
            onClick={() => setActiveSubTab('live_feed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'live_feed'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Scan Stream</span>
          </button>

          <button
            onClick={() => setActiveSubTab('class_attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'class_attendance'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Class Group Roll-Call Sync</span>
          </button>

          <button
            onClick={() => setActiveSubTab('teacher_attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'teacher_attendance'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Teacher Attendance & Duty Hours</span>
          </button>

          <button
            onClick={() => setActiveSubTab('devices_hub')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'devices_hub'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Biometric Hardware Fleet ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('movement_passes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'movement_passes'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Campus Movement & Passes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('biometric_enrollment')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'biometric_enrollment'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Enrollment & Template DB</span>
          </button>
        </div>
      </div>

      {/* Toast Alert Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LIVE BIOMETRIC & MOVEMENT STREAM VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'live_feed' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 text-white font-mono font-bold py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Filter by Device Terminal:</label>
                <select
                  value={selectedDeviceFilter}
                  onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                  className="bg-slate-800 text-white font-semibold py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Terminals & Gates ({devices.length})</option>
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Person Category:</label>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
                  className="bg-slate-800 text-white font-semibold py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All (Students & Teachers)</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers / Staff Only</option>
                </select>
              </div>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, admission #, staff ID..."
                className="w-full bg-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Live Log Stream Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="text-sm font-extrabold text-white">Live Ingested Biometric & Movement Logs</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {filteredMovementLogs.length} Verified Scans
              </span>
            </div>

            {filteredMovementLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>No biometric scans recorded matching the selected filter criteria.</p>
                <button
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Test Face/Fingerprint Scan</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Person & Category</th>
                      <th className="py-3 px-3">Verification Device & Method</th>
                      <th className="py-3 px-3">Location & Movement</th>
                      <th className="py-3 px-3 text-center">Punctuality Status</th>
                      <th className="py-3 px-3">Parent Alert Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredMovementLogs.map((log) => {
                      const isLate = log.punctualityStatus === 'late' || log.punctualityStatus === 'slight_late';
                      const isEarly = log.punctualityStatus === 'early';

                      return (
                        <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {log.timeFormatted}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{log.personName}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                log.personType === 'student'
                                  ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                                  : 'bg-teal-950/80 border-teal-800 text-teal-300'
                              }`}>
                                {log.personType === 'student' ? 'Student' : 'Staff'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              <span>{log.personIdentifier}</span>
                              {log.classGroupName && <span> • {log.classGroupName}</span>}
                              {log.department && <span> • {log.department}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-slate-200">
                              {log.verificationMethod === 'facial_recognition' ? (
                                <ScanFace className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : log.verificationMethod === 'fingerprint' ? (
                                <Fingerprint className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              ) : (
                                <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              )}
                              <span className="font-semibold">{log.deviceName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Match: {log.confidenceScore}% confidence
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-slate-300 font-medium">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{log.locationName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              {log.movementType.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 ${
                              log.punctualityStatus === 'early' || log.punctualityStatus === 'on_time'
                                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                                : log.punctualityStatus === 'slight_late'
                                ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                                : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                            }`}>
                              {log.punctualityStatus === 'early' ? 'Early Arrival' :
                               log.punctualityStatus === 'on_time' ? 'On Time' :
                               log.punctualityStatus === 'slight_late' ? `Late (${log.minutesVariance}m)` :
                               `Late (+${log.minutesVariance}m)`}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {log.parentAlertStatus ? (
                              <div className="flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px] text-slate-300 font-semibold">
                                  {log.parentAlertChannel?.toUpperCase()}: <strong className="text-emerald-400">Delivered</strong>
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Staff Internal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLASS GROUP ATTENDANCE & BIOMETRIC ROLL-CALL SYNC VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'class_attendance' && (
        <div className="space-y-6">
          {/* Class Arm Selector & 1-Click Biometric Sync */}
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
                    <option key={cg.id} value={cg.id}>{cg.name} ({cg.grade})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Attendance Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 text-white font-mono font-bold py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="self-end pb-0.5">
                <span className="text-[11px] text-slate-400 block">
                  Form Master: <strong className="text-emerald-400">{currentClassGroup.formTeacherName}</strong>
                </span>
                <span className="text-[10px] text-slate-500">
                  {currentClassStudents.length} Students Enrolled
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerClassRegisterSync}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Auto-Sync Roll-Call with Biometric Devices</span>
              </button>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('student_registers')}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Official Register</span>
                </button>
              )}
            </div>
          </div>

          {/* Biometric Scan Verification Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Biometric Terminal Attendance Status: {currentClassGroup.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Automatic gate turnstile & classroom wall-reader ingestion on {selectedDate}
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800">
                {classBiometricStatuses.filter(s => s.isScanned).length} / {currentClassStudents.length} Biometrically Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">No.</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Admission No.</th>
                    <th className="py-3 px-3">Arrival Time</th>
                    <th className="py-3 px-3">Ingesting Terminal</th>
                    <th className="py-3 px-3 text-center">Punctuality Grading</th>
                    <th className="py-3 px-3">Parent Notification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {classBiometricStatuses.map((item, idx) => (
                    <tr key={item.student.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}.</td>
                      <td className="py-3 px-3 font-bold text-white">
                        {item.student.fullName}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400">
                        {item.student.admissionNumber}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {item.isScanned ? (
                          <span className="text-emerald-400 font-bold">{item.arrivalTime}</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Not Scanned (Absent)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {item.device}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isScanned ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.punctualityStatus === 'early' || item.punctualityStatus === 'on_time'
                              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                              : item.punctualityStatus === 'slight_late'
                              ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                          }`}>
                            {item.punctualityStatus.toUpperCase().replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[10px] font-bold">
                            UNRECORDED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.student.parentPhone}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TEACHER ATTENDANCE & PUNCTUALITY VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'teacher_attendance' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">Teacher Biometric Clock-In & Punctuality Ledger</h2>
              <p className="text-xs text-slate-400 mt-1">
                Faculty arrival time target: <strong className="text-emerald-400">07:30 AM</strong> • Grace cutoff: <strong className="text-amber-400">07:45 AM</strong> • Official departure: <strong className="text-blue-400">03:30 PM</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 text-white font-mono font-bold py-2 px-3 rounded-xl border border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Teacher Attendance Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 overflow-x-auto space-y-4">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Staff ID & Teacher Name</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Morning Clock-In</th>
                  <th className="py-3 px-3">Clock-In Terminal</th>
                  <th className="py-3 px-3">Departure Clock-Out</th>
                  <th className="py-3 px-3 text-center">Punctuality Status</th>
                  <th className="py-3 px-3 text-right">Periods Punctuality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teacherAttendanceRecords.map((rec) => {
                  const isLate = rec.status === 'late' || rec.punctualityStatus === 'slight_late';
                  const isExcused = rec.status === 'on_duty_off_campus';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{rec.teacherName}</span>
                        <span className="text-[10px] font-mono text-emerald-400">{rec.staffId}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {rec.department}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {rec.clockInTime ? (
                          <span className="text-emerald-400 font-bold">{rec.clockInTime}</span>
                        ) : isExcused ? (
                          <span className="text-cyan-400 font-semibold">Exempt (Official Duty)</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">Not Clocked-In</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {rec.clockInDevice || '—'}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-300">
                        {rec.clockOutTime || 'On Campus (Active)'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 ${
                          rec.status === 'present'
                            ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                            : isExcused
                            ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300'
                            : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                        }`}>
                          {rec.status === 'present' ? 'On-Time / Present' :
                           isExcused ? 'Official Duty' :
                           `Late (${rec.minutesLate}m delay)`}
                        </span>
                        {rec.dutyExemptionNote && (
                          <span className="text-[10px] text-slate-400 block mt-1 italic">
                            {rec.dutyExemptionNote}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {rec.punctualLessonsDelivered} / {rec.scheduledPeriodsToday} Lessons
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BIOMETRIC HARDWARE FLEET & IOT GATEWAY VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'devices_hub' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white">Biometric Hardware Fleet & Network Gateway</h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time connection status, IP addresses, firmware versions, and biometric throughput counters.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>TLS 1.3 Secure LAN Gateway</span>
            </div>
          </div>

          {/* Grid of Device Hardware Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-emerald-500/40 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      {dev.deviceType === 'facial_recognition' ? (
                        <ScanFace className="w-5 h-5" />
                      ) : dev.deviceType === 'fingerprint' ? (
                        <Fingerprint className="w-5 h-5" />
                      ) : (
                        <Radio className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{dev.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">S/N: {dev.serialNumber}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{dev.status}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Location:</span>
                    <strong className="text-slate-200">{dev.assignedLocationName}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>IP Address:</span>
                    <strong className="text-emerald-400 font-mono">{dev.ipAddress}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Firmware:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{dev.firmwareVersion}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Today's Throughput:</span>
                    <strong className="text-white font-mono">{dev.totalScansToday} scans</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Heartbeat: {dev.lastHeartbeat}</span>
                  <button
                    onClick={() => {
                      setSimDeviceId(dev.id);
                      setIsSimulatorOpen(true);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <span>Test Scan</span>
                    <Zap className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* REST API & Webhook Integration Blueprint */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Biometric Device API Webhook Schema (Hikvision, ZKTeco, Suprema, Custom AI Cameras)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Biometric edge devices can push real-time JSON payloads to the CurriculumFlow automated listener endpoint:
            </p>
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`POST /api/biometrics/v1/scan-event
Headers: { "Authorization": "Bearer SEC_TOKEN_CF_2026", "Content-Type": "application/json" }
Payload: {
  "deviceId": "dev-gate-01",
  "verificationMethod": "facial_recognition",
  "personIdentifier": "CF/2026/0101",
  "confidenceScore": 99.8,
  "timestamp": "2026-08-14T07:22:14Z",
  "snapshotBase64": "..."
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CAMPUS MOVEMENT & DIGITAL PASSES VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'movement_passes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white">Campus Movement Passes & Zone Checkpoints</h2>
              <p className="text-xs text-slate-400 mt-1">
                Authorized student & staff movement tracking between classrooms, laboratories, clinic, and gate exits.
              </p>
            </div>

            <button
              onClick={() => setIsIssuePassModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Movement Pass</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {movementPasses.map((pass) => (
              <div
                key={pass.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-emerald-500/40 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {pass.passCode}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{pass.personName}</h4>
                    <span className="text-[11px] text-slate-400">{pass.classGroupName || pass.personIdentifier}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                    pass.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {pass.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Pass Type:</span>
                    <strong className="text-slate-200 uppercase">{pass.passType.replace('_', ' ')}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Route:</span>
                    <span className="text-slate-300">{pass.originLocation} → <strong>{pass.destinationLocation}</strong></span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Validity Window:</span>
                    <strong className="text-amber-400 font-mono">{pass.issuedAt} - {pass.validUntil}</strong>
                  </div>

                  <div className="pt-2 text-slate-300 text-[11px] bg-slate-850 p-2.5 rounded-xl border border-slate-800 italic">
                    "{pass.reason}"
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Issued By: {pass.issuedBy}</span>
                  <span>{pass.scannedAtCheckpoints.length} Checkpoints Scanned</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BIOMETRIC ENROLLMENT & TEMPLATE DB VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'biometric_enrollment' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white">Biometric Enrollment & Template Management</h2>
              <p className="text-xs text-slate-400 mt-1">
                Facial 3D feature embeddings, fingerprint min-hashes, and RFID smartcard assignment status.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
              {biometricProfiles.filter(p => p.status === 'active_enrolled').length} / {biometricProfiles.length} Fully Enrolled
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {biometricProfiles.map((prof) => (
              <div
                key={prof.personId}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-emerald-500/40 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{prof.personName}</h4>
                    <span className="text-[11px] font-mono text-emerald-400">{prof.personIdentifier}</span>
                    <span className="text-[11px] text-slate-400 block">{prof.classGroupName || prof.department}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold ${
                    prof.status === 'active_enrolled'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {prof.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ScanFace className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Facial Recognition (3D AI):</span>
                    </span>
                    <strong className={prof.facialEnrolled ? 'text-emerald-400' : 'text-rose-400'}>
                      {prof.facialEnrolled ? `${prof.facialTemplateCount} Angles Enrolled` : 'Missing'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                      <span>Optical Fingerprints:</span>
                    </span>
                    <strong className={prof.fingerprintEnrolled ? 'text-purple-400' : 'text-rose-400'}>
                      {prof.fingerprintEnrolled ? prof.enrolledFingers.join(', ') : 'Not Enrolled'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>RFID Smartcard UID:</span>
                    </span>
                    <span className="font-mono text-slate-200">{prof.rfidCardUid || 'None'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Quality: <strong className="text-emerald-400">{prof.enrollmentQualityScore}%</strong></span>
                  <button
                    onClick={() => {
                      setEnrollingPerson({
                        id: prof.personId,
                        name: prof.personName,
                        type: prof.personType,
                        identifier: prof.personIdentifier,
                        group: prof.classGroupName || prof.department || ''
                      });
                      setEnrollStep('face');
                      setCapturedFaceAngles(['Front', 'Left 45°', 'Right 45°', 'Chin Up', 'Smile']);
                      setCapturedFingers(['Right Thumb', 'Right Index']);
                      setIsEnrollModalOpen(true);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <span>Re-Calibrate</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIMULATOR MODAL (Live Biometric Test Scan) */}
      {/* ========================================================================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Biometric Scan Hardware Simulator</h2>
              </div>
              <button 
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Person Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimPersonType('student');
                      setSimPersonId(students[0]?.id || '');
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      simPersonType === 'student'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimPersonType('teacher');
                      setSimPersonId(teachers[0]?.id || '');
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      simPersonType === 'teacher'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Teacher / Staff
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Select {simPersonType === 'student' ? 'Student' : 'Staff Member'}:
                </label>
                <select
                  value={simPersonId}
                  onChange={(e) => setSimPersonId(e.target.value)}
                  className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {simPersonType === 'student'
                    ? students.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber} - {s.classGroupName})</option>
                      ))
                    : teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName} ({t.staffId} - {t.department})</option>
                      ))
                  }
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Biometric Terminal:</label>
                <select
                  value={simDeviceId}
                  onChange={(e) => setSimDeviceId(e.target.value)}
                  className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.assignedLocationName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Verification Modality:</label>
                  <select
                    value={simMethod}
                    onChange={(e) => setSimMethod(e.target.value as any)}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="facial_recognition">Facial Recognition (AI)</option>
                    <option value="fingerprint">Dual Fingerprint Scan</option>
                    <option value="rfid_smartcard">RFID Smartcard Badge</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Punctuality Variance:</label>
                  <select
                    value={simTimeVariance}
                    onChange={(e) => setSimTimeVariance(Number(e.target.value))}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={-20}>Early Arrival (-20 mins)</option>
                    <option value={0}>On-Time (07:30 - 07:45 AM)</option>
                    <option value={10}>Slight Late (+10 mins)</option>
                    <option value={30}>Late (+30 mins after bell)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 text-[11px]">
                <strong className="text-emerald-400 block mb-0.5">Automated Event Pipeline:</strong>
                Executing this scan immediately records the movement checkpoint, updates the class/teacher daily roll-call register, and dispatches automated parent SMS notification.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSimulatedScan}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ingest Live Scan Event</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ISSUE MOVEMENT PASS MODAL */}
      {/* ========================================================================= */}
      {isIssuePassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Issue Digital Campus Movement Pass</h2>
              </div>
              <button 
                onClick={() => setIsIssuePassModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovementPass} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Pass Category:</label>
                  <select
                    value={newPassData.passType}
                    onChange={(e) => setNewPassData({ ...newPassData, passType: e.target.value as any })}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="clinic_pass">Clinic / Health Visit</option>
                    <option value="science_lab_transfer">Science Lab Transfer</option>
                    <option value="library_pass">Library / CBT Center</option>
                    <option value="hallway_pass">Hallway Official Pass</option>
                    <option value="official_gate_exit">Official Gate Exit Pass</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Valid Duration:</label>
                  <select
                    value={newPassData.validMinutes}
                    onChange={(e) => setNewPassData({ ...newPassData, validMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours (Lab Practical)</option>
                    <option value={360}>Full Day (Excursion)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Student / Staff:</label>
                <select
                  value={newPassData.personId}
                  onChange={(e) => setNewPassData({ ...newPassData, personId: e.target.value })}
                  className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber} - {s.classGroupName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Origin Location:</label>
                  <input
                    type="text"
                    required
                    value={newPassData.originLocation}
                    onChange={(e) => setNewPassData({ ...newPassData, originLocation: e.target.value })}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Destination Location:</label>
                  <input
                    type="text"
                    required
                    value={newPassData.destinationLocation}
                    onChange={(e) => setNewPassData({ ...newPassData, destinationLocation: e.target.value })}
                    className="w-full bg-slate-800 text-white py-2 px-3 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason / Notes:</label>
                <textarea
                  rows={2}
                  required
                  value={newPassData.reason}
                  onChange={(e) => setNewPassData({ ...newPassData, reason: e.target.value })}
                  className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIssuePassModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40"
                >
                  Generate Digital Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BIOMETRIC ENROLLMENT CALIBRATION MODAL */}
      {/* ========================================================================= */}
      {isEnrollModalOpen && enrollingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Biometric Profile Calibration</h2>
              </div>
              <button 
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-center">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 mb-3">
                  <ScanFace className="w-10 h-10 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-white">{enrollingPerson.name}</h3>
                <span className="text-[11px] font-mono text-emerald-400">{enrollingPerson.identifier} • {enrollingPerson.group}</span>
              </div>

              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 text-left space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Enrolled Feature Embeddings (99.4% Match Quality)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {capturedFaceAngles.map((angle, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                      ✓ {angle}
                    </span>
                  ))}
                  {capturedFingers.map((finger, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-bold">
                      ✓ {finger}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdateBiometricProfile({
                    personId: enrollingPerson.id,
                    personType: enrollingPerson.type,
                    personName: enrollingPerson.name,
                    personIdentifier: enrollingPerson.identifier,
                    classGroupName: enrollingPerson.group,
                    facialEnrolled: true,
                    facialTemplateCount: 6,
                    fingerprintEnrolled: true,
                    enrolledFingers: ['Right Thumb', 'Right Index', 'Left Thumb'],
                    rfidCardUid: `RFID-SYNC-${Date.now().toString().slice(-4)}`,
                    enrollmentQualityScore: 99,
                    lastUpdated: new Date().toISOString().split('T')[0],
                    status: 'active_enrolled'
                  });
                  setIsEnrollModalOpen(false);
                  showToast(`Biometric template calibration updated for ${enrollingPerson.name}. Propagated to all 6 terminals.`);
                }}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Deploy Biometric Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
