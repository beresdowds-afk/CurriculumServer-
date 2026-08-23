import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  Teacher, 
  ClassGroup, 
  SubjectCurriculum,
  ClassGrade 
} from '../types';
import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  Calendar, 
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Award,
  ChevronRight,
  AlertCircle,
  Download,
  X
} from 'lucide-react';

interface TeacherPoolTabProps {
  currentUser: UserProfile;
  teachers: Teacher[];
  classGroups: ClassGroup[];
  subjects: SubjectCurriculum[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSelectTeacherForTimetable: (teacherId: string) => void;
}

export const TeacherPoolTab: React.FC<TeacherPoolTabProps> = ({
  currentUser,
  teachers,
  classGroups,
  subjects,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onSelectTeacherForTimetable
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(teachers[0] || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    staffId: '',
    qualification: '',
    department: 'Mathematics & STEM',
    selectedSubjects: [] as string[],
    selectedClassGroups: [] as string[],
    maxPeriodsPerWeek: 24,
    specializationNotes: ''
  });

  const [modalSubjectSearch, setModalSubjectSearch] = useState('');
  const [modalSubjectLevel, setModalSubjectLevel] = useState<'all' | 'jss' | 'sss'>('all');

  const departments = Array.from(new Set(teachers.map(t => t.department))).filter(Boolean);

  const filteredTeachers = teachers.filter(t => {
    if (selectedDepartment !== 'all' && t.department !== selectedDepartment) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.fullName.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchPhone = t.phone.toLowerCase().includes(q);
      const matchStaffId = t.staffId.toLowerCase().includes(q);
      const matchSubject = t.subjects.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchStaffId && !matchSubject) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    const nextStaffNum = teachers.length + 10;
    setFormData({
      fullName: '',
      phone: '+234 ',
      email: '',
      staffId: `CF-TCH-${String(nextStaffNum).padStart(3, '0')}`,
      qualification: 'B.Sc (Ed) / B.A (Ed), TRCN Certified',
      department: 'Mathematics & STEM',
      selectedSubjects: ['General Mathematics'],
      selectedClassGroups: ['SS 2 Science A'],
      maxPeriodsPerWeek: 24,
      specializationNotes: ''
    });
    setEditingTeacher(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setFormData({
      fullName: t.fullName,
      phone: t.phone,
      email: t.email,
      staffId: t.staffId,
      qualification: t.qualification,
      department: t.department,
      selectedSubjects: [...t.subjects],
      selectedClassGroups: [...t.assignedClassGroupNames],
      maxPeriodsPerWeek: t.maxPeriodsPerWeek,
      specializationNotes: t.specializationNotes || ''
    });
    setEditingTeacher(t);
    setIsAddModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert('Please fill all required fields: Full Name, Phone Number, and Email.');
      return;
    }

    const matchedGroupIds = classGroups
      .filter(cg => formData.selectedClassGroups.includes(cg.name))
      .map(cg => cg.id);

    const initials = formData.fullName
      .split(' ')
      .filter(w => !['Mr.', 'Mrs.', 'Dr.', 'Mallam', 'Miss', 'Prof.'].includes(w))
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TC';

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        staffId: formData.staffId,
        qualification: formData.qualification,
        department: formData.department,
        subjects: formData.selectedSubjects.length > 0 ? formData.selectedSubjects : ['General Studies'],
        assignedClassGroupNames: formData.selectedClassGroups,
        assignedClassGroupIds: matchedGroupIds,
        maxPeriodsPerWeek: Number(formData.maxPeriodsPerWeek),
        specializationNotes: formData.specializationNotes,
        avatar: initials
      };
      onUpdateTeacher(updated);
      if (activeTeacher?.id === updated.id) setActiveTeacher(updated);
    } else {
      const newTeacher: Teacher = {
        id: `tch-${Date.now()}`,
        staffId: formData.staffId,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        qualification: formData.qualification,
        subjects: formData.selectedSubjects.length > 0 ? formData.selectedSubjects : ['General Studies'],
        assignedClassGroupIds: matchedGroupIds,
        assignedClassGroupNames: formData.selectedClassGroups,
        department: formData.department,
        status: 'active',
        maxPeriodsPerWeek: Number(formData.maxPeriodsPerWeek),
        currentPeriodsCount: 0,
        avatar: initials,
        joinedDate: new Date().toISOString().split('T')[0],
        specializationNotes: formData.specializationNotes
      };
      onAddTeacher(newTeacher);
      setActiveTeacher(newTeacher);
    }

    setIsAddModalOpen(false);
  };

  const toggleSubjectSelect = (subName: string) => {
    setFormData(prev => {
      const exists = prev.selectedSubjects.includes(subName);
      if (exists) {
        return { ...prev, selectedSubjects: prev.selectedSubjects.filter(s => s !== subName) };
      } else {
        return { ...prev, selectedSubjects: [...prev.selectedSubjects, subName] };
      }
    });
  };

  const toggleClassSelect = (clsName: string) => {
    setFormData(prev => {
      const exists = prev.selectedClassGroups.includes(clsName);
      if (exists) {
        return { ...prev, selectedClassGroups: prev.selectedClassGroups.filter(c => c !== clsName) };
      } else {
        return { ...prev, selectedClassGroups: [...prev.selectedClassGroups, clsName] };
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Faculty & Academic Staff Repository</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Teacher's Pool & Subject Allocation Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Centralized register of verified teachers, TRCN credentials, direct contact channels (Phone & Email), assigned NERDC subjects, and synchronized timetable allocations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>{teachers.length} Verified Educators</span>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Teacher to Pool</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Search Faculty</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, email, staff ID..."
                className="w-full bg-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Academic Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Teaching Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active on Timetable</option>
              <option value="on_leave">On Academic Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Teachers List */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[850px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faculty Members ({filteredTeachers.length})
            </span>
            <span className="text-[10px] text-slate-500">Sorted by Department</span>
          </div>

          {filteredTeachers.map((t) => {
            const isSelected = activeTeacher?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTeacher(t)}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                    : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-sm flex items-center justify-center border border-emerald-500/40 shadow-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white leading-snug">{t.fullName}</h3>
                      <span className="text-[10px] font-mono text-emerald-400">{t.staffId}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    t.status === 'active' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>

                {/* Contact Quick Peek */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{t.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{t.email}</span>
                  </div>
                </div>

                {/* Subjects Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {t.subjects.slice(0, 2).map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700">
                      {s}
                    </span>
                  ))}
                  {t.subjects.length > 2 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                      +{t.subjects.length - 2} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Teacher Detail & Contact Hub */}
        {activeTeacher && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Header with Avatar and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-emerald-400/40 shadow-xl shadow-emerald-950/40">
                  {activeTeacher.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">{activeTeacher.fullName}</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {activeTeacher.staffId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{activeTeacher.department}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{activeTeacher.qualification}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={() => handleOpenEdit(activeTeacher)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => onSelectTeacherForTimetable(activeTeacher.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Timetable</span>
                </button>
              </div>
            </div>

            {/* Direct Contact Cards (Phone & Email) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Official Phone Line</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">WhatsApp Active</span>
                </div>
                <p className="text-sm font-extrabold text-white font-mono">{activeTeacher.phone}</p>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${activeTeacher.phone.replace(/\s+/g, '')}`}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-all font-semibold flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${activeTeacher.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-950 text-teal-300 border border-teal-800 hover:bg-teal-900 transition-all font-semibold flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Institutional Email</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">Verified Domain</span>
                </div>
                <p className="text-xs font-extrabold text-white font-mono truncate">{activeTeacher.email}</p>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`mailto:${activeTeacher.email}`}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750 transition-all font-semibold flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Send Message</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Assigned Subjects & Class Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Teaching Subject Allocations ({activeTeacher.subjects.length})</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">DB Source of Truth</span>
                </div>
                <div className="space-y-2">
                  {activeTeacher.subjects.map((sub, idx) => {
                    const matchedSubj = NERDC_SUBJECTS_DATABASE.find(s => 
                      s.name.toLowerCase() === sub.toLowerCase() ||
                      s.code.toLowerCase() === sub.toLowerCase() ||
                      sub.toLowerCase().includes(s.name.toLowerCase())
                    );
                    const topicCount = matchedSubj?.themes.reduce((acc, th) => acc + th.topics.length, 0) || 0;
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-emerald-300">{sub}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {matchedSubj ? `${matchedSubj.code} • ${matchedSubj.level.toUpperCase()} • ${topicCount} NERDC Topics` : 'NERDC Standard Aligned'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const topicList = matchedSubj ? matchedSubj.themes.flatMap(t => t.topics).map(t => t.title).join(', ') : 'Aligned with 2025/2026 NERDC National Gazette';
                              alert(`📖 Viewing Updated NERDC Curriculum for ${sub}:\n\nLevel: ${matchedSubj?.level.toUpperCase() || 'JSS/SSS'}\nField: ${matchedSubj?.field || 'General'}\nStandard Topics: ${topicList}`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                            title="View NERDC Curriculum Outline"
                          >
                            <BookOpen className="w-3 h-3 text-emerald-400" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => {
                              alert(`📥 Downloading official 2025/2026 NERDC National Curriculum & Teaching Scheme for ${sub} (${matchedSubj?.code || 'NERDC-STD'})...`);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] font-semibold flex items-center gap-1"
                            title="Download Curriculum Syllabus"
                          >
                            <Download className="w-3 h-3 text-emerald-400" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assigned Class Groups ({activeTeacher.assignedClassGroupNames.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeTeacher.assignedClassGroupNames.map((cls, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-900 text-slate-200 border border-slate-700">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Teaching Workload & Form Teacher Status */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Weekly Timetable Teaching Load</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {activeTeacher.currentPeriodsCount} / {activeTeacher.maxPeriodsPerWeek} Periods Assigned
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (activeTeacher.currentPeriodsCount / activeTeacher.maxPeriodsPerWeek) * 100)}%` }}
                />
              </div>

              {activeTeacher.isFormTeacher && (
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800 text-xs text-purple-200 flex items-center justify-between mt-2">
                  <span className="font-semibold">Appointed Form Master / Class Teacher:</span>
                  <span className="font-extrabold bg-purple-900 px-2 py-0.5 rounded border border-purple-700">
                    {activeTeacher.formClassGroupName || 'Active Class'}
                  </span>
                </div>
              )}

              {activeTeacher.specializationNotes && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-emerald-400 block mb-0.5">Specialization & Pedagogical Notes:</strong>
                  <p>{activeTeacher.specializationNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingTeacher ? 'Edit Teacher Record' : 'Register New Teacher to Pool'}
                </h2>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Full Name & Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Mr. Olawale Adeleke / Dr. Amina Bello"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Staff ID Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    placeholder="CF-TCH-042"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Official Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+234 803 123 4567"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="teacher@curriculumflow.edu.ng"
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Academic Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Mathematics & STEM">Mathematics & STEM</option>
                    <option value="Science & Laboratory">Science & Laboratory</option>
                    <option value="Languages & Humanities">Languages & Humanities</option>
                    <option value="Business & Commercial Studies">Business & Commercial Studies</option>
                    <option value="Vocational & Technical Studies">Vocational & Technical Studies</option>
                    <option value="Humanities & Social Sciences">Humanities & Social Sciences</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Max Periods per Week</label>
                  <input
                    type="number"
                    min="10"
                    max="35"
                    value={formData.maxPeriodsPerWeek}
                    onChange={(e) => setFormData({ ...formData, maxPeriodsPerWeek: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Educational Qualification & Certifications</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g. B.Sc (Ed) Mathematics (UNILAG), TRCN Certified"
                  className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Select Subjects - Authoritative NERDC Database */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold block text-xs">
                    Assigned Teaching Subjects ({formData.selectedSubjects.length} Selected)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Authoritative NERDC 2025/2026 Database
                  </span>
                </div>

                {/* Sub-search and level filters */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={modalSubjectSearch}
                      onChange={(e) => setModalSubjectSearch(e.target.value)}
                      placeholder="Filter all 34 NERDC subjects..."
                      className="w-full bg-slate-850 text-slate-200 pl-8 pr-2 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex rounded-lg bg-slate-850 p-0.5 border border-slate-700 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setModalSubjectLevel('all')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        modalSubjectLevel === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSubjectLevel('jss')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        modalSubjectLevel === 'jss' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      JSS (Basic)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSubjectLevel('sss')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        modalSubjectLevel === 'sss' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      SSS (Senior)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-2 bg-slate-850/90 rounded-xl border border-slate-700">
                  {NERDC_SUBJECTS_DATABASE
                    .filter(s => {
                      if (modalSubjectLevel !== 'all' && s.level !== modalSubjectLevel) return false;
                      if (modalSubjectSearch.trim()) {
                        const q = modalSubjectSearch.toLowerCase();
                        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.field.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map(s => {
                      const isChecked = formData.selectedSubjects.includes(s.name);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleSubjectSelect(s.name)}
                          className={`text-left p-2 rounded-lg text-[11px] font-medium transition-all flex flex-col justify-between ${
                            isChecked 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm' 
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="font-semibold truncate">{isChecked ? '✓ ' : '+ '}{s.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] mt-1 text-slate-500">
                            <span className="uppercase font-mono font-bold text-slate-400">{s.code}</span>
                            <span className={`px-1 rounded ${s.level === 'jss' ? 'bg-indigo-950 text-indigo-300' : 'bg-purple-950 text-purple-300'}`}>
                              {s.level.toUpperCase()}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Select Class Groups */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Assigned Class Groups ({formData.selectedClassGroups.length} Selected)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-800/80 rounded-xl border border-slate-700">
                  {classGroups.map(cg => {
                    const isChecked = formData.selectedClassGroups.includes(cg.name);
                    return (
                      <button
                        type="button"
                        key={cg.id}
                        onClick={() => toggleClassSelect(cg.name)}
                        className={`text-left p-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          isChecked 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-850'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}{cg.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Specialization & Pedagogical Notes</label>
                <textarea
                  rows={2}
                  value={formData.specializationNotes}
                  onChange={(e) => setFormData({ ...formData, specializationNotes: e.target.value })}
                  placeholder="e.g. Specializes in Senior Secondary STEM calculations, WAEC practicals, or remedial clinics..."
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
                  {editingTeacher ? 'Save Changes' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
