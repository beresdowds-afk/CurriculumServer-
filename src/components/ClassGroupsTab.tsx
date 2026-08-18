import React, { useState } from 'react';
import { 
  UserProfile, 
  ClassGroup, 
  Teacher, 
  Student, 
  ClassGrade,
  Term 
} from '../types';
import { 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  DoorOpen, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  Edit3, 
  Trash2, 
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  X,
  Phone,
  Mail
} from 'lucide-react';

interface ClassGroupsTabProps {
  currentUser: UserProfile;
  classGroups: ClassGroup[];
  teachers: Teacher[];
  students: Student[];
  onAddClassGroup: (group: ClassGroup) => void;
  onUpdateClassGroup: (group: ClassGroup) => void;
  onDeleteClassGroup: (groupId: string) => void;
  onSelectClassForTimetable: (classGroupId: string) => void;
  onSelectClassForRegister: (classGroupId: string) => void;
}

export const ClassGroupsTab: React.FC<ClassGroupsTabProps> = ({
  currentUser,
  classGroups,
  teachers,
  students,
  onAddClassGroup,
  onUpdateClassGroup,
  onDeleteClassGroup,
  onSelectClassForTimetable,
  onSelectClassForRegister
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [activeGroup, setActiveGroup] = useState<ClassGroup | null>(classGroups[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    grade: 'SS 2' as ClassGrade,
    arm: 'Science A',
    stream: 'Science' as 'General' | 'Science' | 'Commercial' | 'Arts' | 'Technical',
    formTeacherId: teachers[0]?.id || '',
    roomNumber: 'Science Complex, Room 2',
    capacity: 35,
    academicYear: '2026/2027 Session',
    term: 'Term 1' as Term,
    classRepName: '',
    description: ''
  });

  const filteredGroups = classGroups.filter(cg => {
    if (selectedGrade !== 'all' && cg.grade !== selectedGrade) return false;
    if (selectedStream !== 'all' && cg.stream !== selectedStream) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cg.name.toLowerCase().includes(q);
      const matchCode = cg.code.toLowerCase().includes(q);
      const matchTeacher = cg.formTeacherName.toLowerCase().includes(q);
      const matchRoom = cg.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchTeacher && !matchRoom) return false;
    }
    return true;
  });

  // Calculate actual enrolled student count per group from General Students DB
  const getEnrolledStudents = (groupId: string) => {
    return students.filter(s => s.classGroupId === groupId);
  };

  const handleOpenAdd = () => {
    setFormData({
      code: 'SS-2SCIC',
      name: 'SS 2 Science C',
      grade: 'SS 2',
      arm: 'Science C',
      stream: 'Science',
      formTeacherId: teachers[0]?.id || '',
      roomNumber: 'Block C, Room 203',
      capacity: 35,
      academicYear: '2026/2027 Session',
      term: 'Term 1',
      classRepName: '',
      description: 'Newly created Senior Science class division.'
    });
    setEditingGroup(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cg: ClassGroup) => {
    setFormData({
      code: cg.code,
      name: cg.name,
      grade: cg.grade,
      arm: cg.arm,
      stream: cg.stream || 'General',
      formTeacherId: cg.formTeacherId,
      roomNumber: cg.roomNumber,
      capacity: cg.capacity,
      academicYear: cg.academicYear,
      term: cg.term,
      classRepName: cg.classRepName || '',
      description: cg.description || ''
    });
    setEditingGroup(cg);
    setIsAddModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.formTeacherId) {
      alert('Please fill all required fields: Class Name, Code, and Form Teacher.');
      return;
    }

    const assignedTeacher = teachers.find(t => t.id === formData.formTeacherId);
    const teacherName = assignedTeacher?.fullName || 'Assigned Form Master';

    if (editingGroup) {
      const updated: ClassGroup = {
        ...editingGroup,
        code: formData.code,
        name: formData.name,
        grade: formData.grade,
        arm: formData.arm,
        stream: formData.stream,
        formTeacherId: formData.formTeacherId,
        formTeacherName: teacherName,
        roomNumber: formData.roomNumber,
        capacity: Number(formData.capacity),
        academicYear: formData.academicYear,
        term: formData.term,
        classRepName: formData.classRepName,
        description: formData.description
      };
      onUpdateClassGroup(updated);
      if (activeGroup?.id === updated.id) setActiveGroup(updated);
    } else {
      const newGroup: ClassGroup = {
        id: `grp-${Date.now()}`,
        code: formData.code,
        name: formData.name,
        grade: formData.grade,
        arm: formData.arm,
        stream: formData.stream,
        formTeacherId: formData.formTeacherId,
        formTeacherName: teacherName,
        roomNumber: formData.roomNumber,
        capacity: Number(formData.capacity),
        studentCount: 0,
        academicYear: formData.academicYear,
        term: formData.term,
        classRepName: formData.classRepName,
        description: formData.description
      };
      onAddClassGroup(newGroup);
      setActiveGroup(newGroup);
    }

    setIsAddModalOpen(false);
  };

  const activeGroupStudents = activeGroup ? getEnrolledStudents(activeGroup.id) : [];
  const activeGroupTeacher = activeGroup ? teachers.find(t => t.id === activeGroup.formTeacherId) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>School Organizational Hierarchy & Arms Database</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Class Groups & Arms Management Database
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Structured database of class arms across Basic Education (JSS 1–3) and Senior Secondary (SS 1–3), linked to appointed Form Teachers from the Teacher's Pool and synchronized with classroom registers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{classGroups.length} Active Class Arms</span>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class Arm</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Search Class Arms</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search class name, room, code, form master..."
                className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Class Grade Level</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Class Grades (JSS 1 - SS 3)</option>
              <option value="JSS 1">JSS 1 (Basic 7)</option>
              <option value="JSS 2">JSS 2 (Basic 8)</option>
              <option value="JSS 3">JSS 3 (Basic 9 / BECE)</option>
              <option value="SS 1">SS 1 (Senior Entry)</option>
              <option value="SS 2">SS 2 (Senior Intermediate)</option>
              <option value="SS 3">SS 3 (WAEC / NECO / JAMB)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Academic Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Streams</option>
              <option value="General">General (Junior Secondary)</option>
              <option value="Science">Science Stream</option>
              <option value="Commercial">Commercial / Business</option>
              <option value="Arts">Arts & Humanities</option>
              <option value="Technical">Technical & Vocational</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Class Groups List */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[850px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Class Groups ({filteredGroups.length})
            </span>
            <span className="text-[10px] text-slate-500">Synced to Timetable</span>
          </div>

          {filteredGroups.map((cg) => {
            const isSelected = activeGroup?.id === cg.id;
            const enrolled = getEnrolledStudents(cg.id);
            const count = enrolled.length > 0 ? enrolled.length : cg.studentCount;
            const capacityRatio = Math.round((count / cg.capacity) * 100);

            return (
              <button
                key={cg.id}
                onClick={() => setActiveGroup(cg)}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                    : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{cg.name}</span>
                      <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                        {cg.code}
                      </span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">{cg.roomNumber}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {cg.stream || 'General'}
                  </span>
                </div>

                {/* Form Teacher & Enrolment Metric */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[210px]">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{cg.formTeacherName}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                    <Users className="w-3 h-3" />
                    <span>{count} / {cg.capacity} ({capacityRatio}%)</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Class Group Detailed Dossier */}
        {activeGroup && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                    {activeGroup.code} • {activeGroup.grade}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                    {activeGroup.stream || 'General'} Stream
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">{activeGroup.name}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <DoorOpen className="w-4 h-4 text-emerald-400" />
                  <span>Classroom: <strong className="text-slate-200">{activeGroup.roomNumber}</strong></span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start">
                <button
                  onClick={() => handleOpenEdit(activeGroup)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Arm</span>
                </button>
                <button
                  onClick={() => onSelectClassForRegister(activeGroup.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-teal-400" />
                  <span>Class Register</span>
                </button>
                <button
                  onClick={() => onSelectClassForTimetable(activeGroup.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Class Timetable</span>
                </button>
              </div>
            </div>

            {/* Form Master / Teacher Profile Card (Synced to Teacher Pool) */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Appointed Form Master / Class Teacher</span>
              </span>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center border border-purple-400/40">
                    {activeGroupTeacher?.avatar || 'FM'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{activeGroup.formTeacherName}</h4>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {activeGroupTeacher?.staffId || 'Staff Member'} • {activeGroupTeacher?.department || 'Faculty'}
                    </span>
                  </div>
                </div>

                {activeGroupTeacher && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${activeGroupTeacher.phone.replace(/\s+/g, '')}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700"
                      title="Call Form Teacher"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`mailto:${activeGroupTeacher.email}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-400 border border-slate-700"
                      title="Email Form Teacher"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {activeGroupTeacher && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Phone: <strong className="text-slate-200 font-mono">{activeGroupTeacher.phone}</strong></span>
                  <span>Email: <strong className="text-slate-200 font-mono">{activeGroupTeacher.email}</strong></span>
                </div>
              )}
            </div>

            {/* Enrolment Stats & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Enrolled Students</span>
                <span className="text-lg font-extrabold text-white mt-1 block">
                  {activeGroupStudents.length > 0 ? activeGroupStudents.length : activeGroup.studentCount}
                </span>
                <span className="text-[10px] text-emerald-400">Synced to General Register</span>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Classroom Capacity</span>
                <span className="text-lg font-extrabold text-white mt-1 block">
                  {activeGroup.capacity} Desks
                </span>
                <span className="text-[10px] text-slate-500">Max limit per arm</span>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class Representative</span>
                <span className="text-xs font-extrabold text-white mt-1 block truncate">
                  {activeGroup.classRepName || 'To Be Appointed'}
                </span>
                <span className="text-[10px] text-teal-400">Student Captain</span>
              </div>
            </div>

            {/* Enrolled Students Roster Peek (From General Students Database) */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Enrolled Students in this Arm ({activeGroupStudents.length})</span>
                </span>
                <button
                  onClick={() => onSelectClassForRegister(activeGroup.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>Open Full Attendance Register</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeGroupStudents.length === 0 ? (
                <div className="p-4 bg-slate-900 rounded-xl text-center text-xs text-slate-400">
                  No individual student profiles currently linked. Use the General Students Register to enrol students into this class arm.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {activeGroupStudents.map((stu, i) => (
                    <div
                      key={stu.id}
                      className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500 w-4">{i + 1}.</span>
                        <div>
                          <span className="font-bold text-white">{stu.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-400 ml-2">{stu.admissionNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">{stu.parentName}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          {stu.termAttendanceRate}% Att.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Class Group Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingGroup ? 'Edit Class Group Arm' : 'Create New Class Group Arm'}
                </h2>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Class Arm Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. SS 2 Science A / JSS 1 Beta"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Short Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="SS-2SCIA"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Class Grade *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value as ClassGrade })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                    <option value="SS 1">SS 1</option>
                    <option value="SS 2">SS 2</option>
                    <option value="SS 3">SS 3</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Academic Stream</label>
                  <select
                    value={formData.stream}
                    onChange={(e) => setFormData({ ...formData, stream: e.target.value as any })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="General">General</option>
                    <option value="Science">Science</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Arts">Arts</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Appointed Form Master / Class Teacher (From Teacher Pool) *
                </label>
                <select
                  required
                  value={formData.formTeacherId}
                  onChange={(e) => setFormData({ ...formData, formTeacherId: e.target.value })}
                  className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.staffId} - {t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Room / Building Location</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="Block A, Room 201"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Student Capacity Limit</label>
                  <input
                    type="number"
                    min="15"
                    max="60"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Class Representative / Prefect</label>
                <input
                  type="text"
                  value={formData.classRepName}
                  onChange={(e) => setFormData({ ...formData, classRepName: e.target.value })}
                  placeholder="e.g. Fatima Garba"
                  className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40"
                >
                  {editingGroup ? 'Save Changes' : 'Create Class Arm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
