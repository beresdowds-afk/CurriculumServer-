import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Teacher, 
  ClassGroup, 
  SubjectCurriculum, 
  TimetableSlot, 
  DayOfWeek,
  TIMETABLE_PERIOD_CONFIGS 
} from '../types';
import { TIMETABLE_PERIOD_CONFIGS as PERIOD_CONFIGS } from '../data/schoolManagementData';
import { 
  Calendar, 
  Clock, 
  Users, 
  Layers, 
  BookOpen, 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Filter, 
  Send,
  DoorOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';

interface SchoolTimetableTabProps {
  currentUser: UserProfile;
  timetableSlots: TimetableSlot[];
  teachers: Teacher[];
  classGroups: ClassGroup[];
  subjects: SubjectCurriculum[];
  onAddSlot: (slot: TimetableSlot) => void;
  onUpdateSlot: (slot: TimetableSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onSyncToDeliveryTracker: (slots: TimetableSlot[]) => void;
  initialSelectedClassGroupId?: string;
  initialSelectedTeacherId?: string;
}

export const SchoolTimetableTab: React.FC<SchoolTimetableTabProps> = ({
  currentUser,
  timetableSlots,
  teachers,
  classGroups,
  subjects,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onSyncToDeliveryTracker,
  initialSelectedClassGroupId,
  initialSelectedTeacherId
}) => {
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'master'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialSelectedClassGroupId || classGroups[0]?.id || ''
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialSelectedTeacherId || teachers[0]?.id || ''
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Form State for Slot Add/Edit
  const [slotFormData, setSlotFormData] = useState({
    dayOfWeek: 'Monday' as DayOfWeek,
    periodNumber: 1,
    classGroupId: classGroups[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    teacherId: teachers[0]?.id || '',
    roomNumber: 'Science Complex, Lab 2',
    isLabPractical: false,
    isRemedial: false
  });

  const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Conflict Detection Engine
  const conflicts = useMemo(() => {
    const list: { slot1: TimetableSlot; slot2: TimetableSlot; reason: string }[] = [];
    for (let i = 0; i < timetableSlots.length; i++) {
      for (let j = i + 1; j < timetableSlots.length; j++) {
        const a = timetableSlots[i];
        const b = timetableSlots[j];
        if (a.dayOfWeek === b.dayOfWeek && a.periodNumber === b.periodNumber) {
          // Check Teacher double-booking
          if (a.teacherId === b.teacherId) {
            list.push({
              slot1: a,
              slot2: b,
              reason: `Teacher Conflict: ${a.teacherName} is double-booked for ${a.classGroupName} and ${b.classGroupName} on ${a.dayOfWeek} (Period ${a.periodNumber}).`
            });
          }
          // Check Room clash
          else if (a.roomNumber.trim().toLowerCase() === b.roomNumber.trim().toLowerCase() && a.roomNumber !== '') {
            list.push({
              slot1: a,
              slot2: b,
              reason: `Room Clash: ${a.roomNumber} is allocated to both ${a.classGroupName} and ${b.classGroupName} on ${a.dayOfWeek} (Period ${a.periodNumber}).`
            });
          }
        }
      }
    }
    return list;
  }, [timetableSlots]);

  // Selected Class & Teacher objects
  const activeClass = classGroups.find(cg => cg.id === selectedClassId) || classGroups[0];
  const activeTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];

  // Helper to find slot
  const findSlotForClass = (day: DayOfWeek, periodNum: number) => {
    return timetableSlots.find(s => s.classGroupId === selectedClassId && s.dayOfWeek === day && s.periodNumber === periodNum);
  };

  const findSlotForTeacher = (day: DayOfWeek, periodNum: number) => {
    return timetableSlots.find(s => s.teacherId === selectedTeacherId && s.dayOfWeek === day && s.periodNumber === periodNum);
  };

  const handleOpenAddSlot = (day?: DayOfWeek, period?: number) => {
    const defaultDay = day || selectedDay;
    const defaultPeriod = period || 1;
    setSlotFormData({
      dayOfWeek: defaultDay,
      periodNumber: defaultPeriod,
      classGroupId: selectedClassId || classGroups[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      teacherId: selectedTeacherId || teachers[0]?.id || '',
      roomNumber: activeClass?.roomNumber || 'Room 101',
      isLabPractical: false,
      isRemedial: false
    });
    setEditingSlot(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setSlotFormData({
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      classGroupId: slot.classGroupId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      roomNumber: slot.roomNumber,
      isLabPractical: !!slot.isLabPractical,
      isRemedial: !!slot.isRemedial
    });
    setEditingSlot(slot);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedClass = classGroups.find(cg => cg.id === slotFormData.classGroupId);
    const matchedTeacher = teachers.find(t => t.id === slotFormData.teacherId);
    const matchedSubject = subjects.find(s => s.id === slotFormData.subjectId);
    const periodConf = PERIOD_CONFIGS.find(p => p.periodNumber === Number(slotFormData.periodNumber));

    if (!matchedClass || !matchedTeacher || !matchedSubject) {
      alert('Please select valid Class Group, Teacher, and Subject.');
      return;
    }

    if (editingSlot) {
      const updated: TimetableSlot = {
        ...editingSlot,
        dayOfWeek: slotFormData.dayOfWeek,
        periodNumber: Number(slotFormData.periodNumber),
        startTime: periodConf?.startTime || '08:00 AM',
        endTime: periodConf?.endTime || '08:45 AM',
        classGroupId: matchedClass.id,
        classGroupName: matchedClass.name,
        classGrade: matchedClass.grade,
        subjectId: matchedSubject.id,
        subjectName: matchedSubject.name,
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.fullName,
        roomNumber: slotFormData.roomNumber,
        isLabPractical: slotFormData.isLabPractical,
        isRemedial: slotFormData.isRemedial
      };
      onUpdateSlot(updated);
    } else {
      const newSlot: TimetableSlot = {
        id: `slot-${Date.now()}`,
        dayOfWeek: slotFormData.dayOfWeek,
        periodNumber: Number(slotFormData.periodNumber),
        startTime: periodConf?.startTime || '08:00 AM',
        endTime: periodConf?.endTime || '08:45 AM',
        classGroupId: matchedClass.id,
        classGroupName: matchedClass.name,
        classGrade: matchedClass.grade,
        subjectId: matchedSubject.id,
        subjectName: matchedSubject.name,
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.fullName,
        roomNumber: slotFormData.roomNumber,
        isLabPractical: slotFormData.isLabPractical,
        isRemedial: slotFormData.isRemedial
      };
      onAddSlot(newSlot);
    }

    setIsSlotModalOpen(false);
  };

  const handleSyncDelivery = () => {
    onSyncToDeliveryTracker(timetableSlots);
    setSyncNotice(`Successfully synchronized ${timetableSlots.length} scheduled periods across all Class Arms to the Teacher Delivery Tracker.`);
    setTimeout(() => setSyncNotice(null), 6000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4" />
              <span>Institutional Master Scheduling Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              School Timetable Management & Period Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Synchronized scheduling engine linking the Teacher's Pool, NERDC Subjects, and Class Groups with real-time clash detection and 1-click synchronization to the Teacher Delivery Tracker.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncDelivery}
              className="px-4 py-2.5 rounded-2xl bg-teal-950/90 hover:bg-teal-900 text-teal-300 border border-teal-700 font-bold text-xs transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Sync to Delivery Tracker</span>
            </button>
            <button
              onClick={() => handleOpenAddSlot()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timetable Slot</span>
            </button>
          </div>
        </div>

        {/* Sync Notice Alert */}
        {syncNotice && (
          <div className="mt-4 p-3 rounded-2xl bg-teal-950 border border-teal-700 text-teal-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Conflict Alert Banner */}
        {conflicts.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{conflicts.length} Timetable Clashes / Double-Booking Conflicts Detected!</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              {conflicts.map((c, i) => (
                <li key={i}>{c.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* View Mode Tabs & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 p-1 bg-slate-800/90 rounded-2xl border border-slate-700">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'class'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Class Arm</span>
            </button>

            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Teacher (Faculty)</span>
            </button>

            <button
              onClick={() => setViewMode('master')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'master'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Master Day Matrix</span>
            </button>
          </div>

          {/* Dynamic Selector based on View Mode */}
          <div className="flex items-center gap-3">
            {viewMode === 'class' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Select Arm:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-800 text-white font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {classGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name} ({cg.grade})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'teacher' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Select Teacher:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-slate-800 text-white font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.staffId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'master' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Day:</span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                  className="bg-slate-800 text-white font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: BY CLASS ARM SCHEDULE MATRIX */}
      {viewMode === 'class' && activeClass && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{activeClass.name} Weekly Timetable</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {activeClass.roomNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Form Master: <strong className="text-slate-200">{activeClass.formTeacherName}</strong> • {activeClass.stream || 'General'} Stream
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              8 Standard NERDC Periods / Day
            </span>
          </div>

          <div className="min-w-[760px] space-y-3">
            {/* Header Row */}
            <div className="grid grid-cols-9 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <div className="text-left font-mono">Day / Period</div>
              {PERIOD_CONFIGS.map(p => (
                <div key={p.periodNumber} className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 block font-mono">P{p.periodNumber}</span>
                  <span className="text-[9px] text-slate-500 font-normal">{p.startTime}</span>
                </div>
              ))}
            </div>

            {/* Days Rows */}
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid grid-cols-9 gap-2 items-stretch">
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex flex-col justify-center">
                  <span className="text-xs font-extrabold text-white">{day}</span>
                  <span className="text-[10px] text-slate-500">School Day</span>
                </div>

                {PERIOD_CONFIGS.map(p => {
                  const slot = findSlotForClass(day, p.periodNumber);
                  return (
                    <div
                      key={p.periodNumber}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between relative group min-h-[90px] ${
                        slot
                          ? slot.isRemedial
                            ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                            : slot.isLabPractical
                            ? 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                          : 'bg-slate-900/40 border-dashed border-slate-800 hover:border-slate-700 text-slate-600'
                      }`}
                    >
                      {slot ? (
                        <>
                          <div>
                            <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                              {slot.subjectName}
                            </span>
                            <span className="text-[10px] text-emerald-400 block mt-1 truncate">
                              {slot.teacherName}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-700/50 text-[9px]">
                            <span className="text-slate-400 truncate">{slot.roomNumber}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEditSlot(slot)}
                                className="p-1 hover:text-white"
                                title="Edit Slot"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDeleteSlot(slot.id)}
                                className="p-1 hover:text-rose-400"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenAddSlot(day, p.periodNumber)}
                          className="w-full h-full flex flex-col items-center justify-center text-slate-600 hover:text-emerald-400 group"
                        >
                          <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                          <span className="text-[9px] mt-0.5">Allocate</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: BY TEACHER FACULTY SCHEDULE */}
      {viewMode === 'teacher' && activeTeacher && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm flex items-center justify-center">
                {activeTeacher.avatar}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">{activeTeacher.fullName} Schedule</h2>
                <p className="text-xs text-slate-400">
                  Staff ID: <strong className="text-slate-200 font-mono">{activeTeacher.staffId}</strong> • {activeTeacher.department}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 block">
                {timetableSlots.filter(s => s.teacherId === activeTeacher.id).length} Teaching Periods Scheduled
              </span>
              <span className="text-[10px] text-slate-500">Max Capacity: {activeTeacher.maxPeriodsPerWeek} / wk</span>
            </div>
          </div>

          <div className="min-w-[760px] space-y-3">
            {/* Header Row */}
            <div className="grid grid-cols-9 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <div className="text-left font-mono">Day / Period</div>
              {PERIOD_CONFIGS.map(p => (
                <div key={p.periodNumber} className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 block font-mono">P{p.periodNumber}</span>
                  <span className="text-[9px] text-slate-500 font-normal">{p.startTime}</span>
                </div>
              ))}
            </div>

            {/* Days Rows */}
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid grid-cols-9 gap-2 items-stretch">
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex flex-col justify-center">
                  <span className="text-xs font-extrabold text-white">{day}</span>
                  <span className="text-[10px] text-slate-500">Work Day</span>
                </div>

                {PERIOD_CONFIGS.map(p => {
                  const slot = findSlotForTeacher(day, p.periodNumber);
                  return (
                    <div
                      key={p.periodNumber}
                      className={`p-2.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                        slot
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                          : 'bg-slate-900/40 border-dashed border-slate-800/80 text-slate-600'
                      }`}
                    >
                      {slot ? (
                        <>
                          <div>
                            <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                              {slot.subjectName}
                            </span>
                            <span className="text-[10px] text-teal-300 font-semibold block mt-1 truncate">
                              Class: {slot.classGroupName}
                            </span>
                          </div>
                          <div className="pt-1 mt-1 border-t border-emerald-800/50 text-[9px] text-slate-400 flex items-center justify-between">
                            <span>{slot.roomNumber}</span>
                            <span className="text-emerald-400">P{slot.periodNumber}</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                          <span className="text-[10px] font-mono">Free Period</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: MASTER DAY MATRIX */}
      {viewMode === 'master' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 overflow-x-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-white">Master School Schedule: {selectedDay}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Showing all active Class Arms and allocated subjects across Periods 1 to 8.</p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {classGroups.length} Class Arms Active
            </span>
          </div>

          <div className="min-w-[760px] space-y-3">
            <div className="grid grid-cols-9 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              <div className="text-left font-mono">Class Arm</div>
              {PERIOD_CONFIGS.map(p => (
                <div key={p.periodNumber} className="bg-slate-850 p-2 rounded-xl border border-slate-800 font-mono text-emerald-400">
                  P{p.periodNumber}
                </div>
              ))}
            </div>

            {classGroups.map(cg => (
              <div key={cg.id} className="grid grid-cols-9 gap-2 items-stretch">
                <div className="bg-slate-850 p-3 rounded-2xl border border-slate-800 flex flex-col justify-center">
                  <span className="text-xs font-bold text-white truncate">{cg.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{cg.roomNumber}</span>
                </div>

                {PERIOD_CONFIGS.map(p => {
                  const slot = timetableSlots.find(
                    s => s.classGroupId === cg.id && s.dayOfWeek === selectedDay && s.periodNumber === p.periodNumber
                  );
                  return (
                    <div
                      key={p.periodNumber}
                      className={`p-2 rounded-2xl border text-[10px] flex flex-col justify-between min-h-[75px] ${
                        slot 
                          ? 'bg-slate-800 border-slate-700 text-slate-200' 
                          : 'bg-slate-900/30 border-dashed border-slate-800 text-slate-600'
                      }`}
                    >
                      {slot ? (
                        <>
                          <span className="font-bold text-white line-clamp-1">{slot.subjectName}</span>
                          <span className="text-emerald-400 text-[9px] truncate">{slot.teacherName}</span>
                        </>
                      ) : (
                        <span className="text-slate-600 text-center m-auto">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Timetable Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingSlot ? 'Edit Timetable Allocation' : 'Allocate Timetable Period Slot'}
                </h2>
              </div>
              <button 
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Day of Week *</label>
                  <select
                    value={slotFormData.dayOfWeek}
                    onChange={(e) => setSlotFormData({ ...slotFormData, dayOfWeek: e.target.value as DayOfWeek })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Period Number *</label>
                  <select
                    value={slotFormData.periodNumber}
                    onChange={(e) => setSlotFormData({ ...slotFormData, periodNumber: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  >
                    {PERIOD_CONFIGS.map(p => (
                      <option key={p.periodNumber} value={p.periodNumber}>
                        P{p.periodNumber}: {p.label} ({p.startTime} - {p.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Class Group Arm *</label>
                  <select
                    value={slotFormData.classGroupId}
                    onChange={(e) => setSlotFormData({ ...slotFormData, classGroupId: e.target.value })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    {classGroups.map(cg => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} ({cg.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Subject (NERDC Database) *</label>
                  <select
                    value={slotFormData.subjectId}
                    onChange={(e) => setSlotFormData({ ...slotFormData, subjectId: e.target.value })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assigned Teacher (From Pool) *</label>
                <select
                  value={slotFormData.teacherId}
                  onChange={(e) => setSlotFormData({ ...slotFormData, teacherId: e.target.value })}
                  className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} — {t.staffId} ({t.subjects.slice(0, 2).join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Room / Laboratory Location</label>
                <input
                  type="text"
                  value={slotFormData.roomNumber}
                  onChange={(e) => setSlotFormData({ ...slotFormData, roomNumber: e.target.value })}
                  placeholder="e.g. Science Complex, Lab 2"
                  className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotFormData.isLabPractical}
                    onChange={(e) => setSlotFormData({ ...slotFormData, isLabPractical: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-200 font-semibold">Laboratory / Practical Session</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotFormData.isRemedial}
                    onChange={(e) => setSlotFormData({ ...slotFormData, isRemedial: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-200 font-semibold">Adaptive Remedial Clinic</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40"
                >
                  {editingSlot ? 'Save Changes' : 'Allocate Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
