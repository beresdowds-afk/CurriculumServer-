import React, { useState, useMemo } from 'react';
import { 
  UserProfile,
  PrincipalInstitutionalProfile,
  AdminOfficerInstitutionalProfile,
  TeacherInstitutionalProfile,
  StudentInstitutionalProfile,
  SchoolBrandProfile
} from '../types';
import { 
  INITIAL_PRINCIPAL_PROFILE,
  INITIAL_ADMIN_OFFICER_PROFILES,
  INITIAL_TEACHER_INSTITUTIONAL_PROFILES,
  INITIAL_STUDENT_INSTITUTIONAL_PROFILES
} from '../data/userProfilesData';
import { 
  ShieldCheck, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Users, 
  UserCheck, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Printer, 
  Download, 
  QrCode, 
  Fingerprint, 
  ScanFace, 
  Sparkles, 
  Star, 
  Activity, 
  Layers, 
  Eye, 
  Lock, 
  FileText, 
  User, 
  X, 
  Save, 
  Check, 
  ArrowRight,
  ExternalLink,
  CreditCard,
  School,
  IdCard,
  UserPlus
} from 'lucide-react';

interface UserProfilesTabProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  onNavigateTab: (tab: any) => void;
  onSelectStudentParent?: (parentId: string) => void;
}

type ProfileCategory = 'all' | 'principal' | 'administrative_officer' | 'teacher' | 'student' | 'my_profile';

export const UserProfilesTab: React.FC<UserProfilesTabProps> = ({
  currentUser,
  brandProfile,
  onNavigateTab,
  onSelectStudentParent
}) => {
  // Profiles State
  const [principalProfile, setPrincipalProfile] = useState<PrincipalInstitutionalProfile>(INITIAL_PRINCIPAL_PROFILE);
  const [adminProfiles, setAdminProfiles] = useState<AdminOfficerInstitutionalProfile[]>(INITIAL_ADMIN_OFFICER_PROFILES);
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherInstitutionalProfile[]>(INITIAL_TEACHER_INSTITUTIONAL_PROFILES);
  const [studentProfiles, setStudentProfiles] = useState<StudentInstitutionalProfile[]>(INITIAL_STUDENT_INSTITUTIONAL_PROFILES);

  // Filters and Navigation
  const [activeCategory, setActiveCategory] = useState<ProfileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

  // Active Modals & Selected Profile
  const [selectedProfileForDetails, setSelectedProfileForDetails] = useState<{
    type: 'principal' | 'admin' | 'teacher' | 'student';
    data: any;
  } | null>(null);

  const [selectedProfileForIdCard, setSelectedProfileForIdCard] = useState<{
    type: 'principal' | 'admin' | 'teacher' | 'student';
    data: any;
  } | null>(null);

  const [idCardFlipped, setIdCardFlipped] = useState(false);
  const [editingProfile, setEditingProfile] = useState<{
    type: 'principal' | 'admin' | 'teacher' | 'student';
    data: any;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Lists
  const filteredAdmins = useMemo(() => {
    return adminProfiles.filter(adm => {
      const matchesSearch = adm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDepartmentFilter === 'all' || adm.department === selectedDepartmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [adminProfiles, searchQuery, selectedDepartmentFilter]);

  const filteredTeachers = useMemo(() => {
    return teacherProfiles.filter(tch => {
      const matchesSearch = tch.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tch.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tch.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tch.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDepartmentFilter === 'all' || tch.department.toLowerCase().includes(selectedDepartmentFilter.toLowerCase());
      return matchesSearch && matchesDept;
    });
  }, [teacherProfiles, searchQuery, selectedDepartmentFilter]);

  const filteredStudents = useMemo(() => {
    return studentProfiles.filter(stu => {
      const matchesSearch = stu.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.classGroupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.primaryParentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGradeFilter === 'all' || stu.classGrade === selectedGradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [studentProfiles, searchQuery, selectedGradeFilter]);

  const isPrincipalMatch = useMemo(() => {
    if (!searchQuery) return true;
    return principalProfile.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      principalProfile.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      principalProfile.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      principalProfile.trcnNumber.toLowerCase().includes(searchQuery.toLowerCase());
  }, [principalProfile, searchQuery]);

  // Total counts
  const totalCount = 1 + adminProfiles.length + teacherProfiles.length + studentProfiles.length;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 text-sm font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Executive Institutional Registry</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                TRCN & NERDC Compliant Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Institutional User Profiles
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Comprehensive role-specific profiles with verified credentials, official portraits, academic qualifications, assigned responsibilities, biometric status, and digital institutional ID cards for Principal, Administrative Officers, Teachers, and Students.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('user_onboarding')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/50 flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard Users & Wards</span>
            </button>

            <button
              onClick={() => {
                setSelectedProfileForIdCard({
                  type: 'principal',
                  data: principalProfile
                });
                setIdCardFlipped(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer"
            >
              <IdCard className="w-4 h-4" />
              <span>Principal Executive ID</span>
            </button>

            <button
              onClick={() => onNavigateTab('parent_database')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Supervised Parents Database</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Office of Principal</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">1 Executive</div>
            <div className="text-[11px] text-slate-400">Root Governance</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-sky-400 font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin Officers</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{adminProfiles.length} Officers</div>
            <div className="text-[11px] text-slate-400">VPs, Bursar, Exams, Dean, ICT</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teaching Faculty</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{teacherProfiles.length} Masters/Mistresses</div>
            <div className="text-[11px] text-slate-400">TRCN Certified Faculty</div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Enrolled Students</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{studentProfiles.length} Profiles</div>
            <div className="text-[11px] text-slate-400">Mapped to Parents DB</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        {/* Category Buttons */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-2 pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Profiles ({totalCount})</span>
          </button>

          <button
            onClick={() => setActiveCategory('principal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'principal'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                : 'bg-slate-800/80 text-purple-300 hover:bg-slate-800 hover:text-white border border-purple-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Principal & CEO (1)</span>
          </button>

          <button
            onClick={() => setActiveCategory('administrative_officer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'administrative_officer'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                : 'bg-slate-800/80 text-sky-300 hover:bg-slate-800 hover:text-white border border-sky-800/40'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Administrative Officers ({adminProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveCategory('teacher')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'teacher'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800 hover:text-white border border-emerald-800/40'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Teachers Pool ({teacherProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveCategory('student')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === 'student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'bg-slate-800/80 text-indigo-300 hover:bg-slate-800 hover:text-white border border-indigo-800/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Students ({studentProfiles.length})</span>
          </button>
        </div>

        {/* Search & Secondary Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800/60">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by full name, staff/admission ID, TRCN number, qualification, subject, or office..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(activeCategory === 'all' || activeCategory === 'teacher' || activeCategory === 'administrative_officer') && (
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="Mathematics & STEM">Mathematics & STEM</option>
              <option value="Science & Laboratory">Science & Laboratory</option>
              <option value="Languages & Humanities">Languages & Humanities</option>
              <option value="Business & Commercial">Business & Commercial</option>
              <option value="Directorate of Academic Operations">Directorate of Academics</option>
              <option value="Staff Administration">Staff Administration</option>
            </select>
          )}

          {(activeCategory === 'all' || activeCategory === 'student') && (
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Class Grades</option>
              <option value="JSS 1">JSS 1</option>
              <option value="JSS 2">JSS 2</option>
              <option value="JSS 3">JSS 3</option>
              <option value="SS 1">SS 1</option>
              <option value="SS 2">SS 2</option>
              <option value="SS 3">SS 3</option>
            </select>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. PRINCIPAL PROFILE SECTION                                  */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'all' || activeCategory === 'principal') && isPrincipalMatch && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-purple-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span>Office of the Principal & Chief Executive</span>
            </h2>
            <span className="text-xs text-slate-400">Supreme Governance Authority</span>
          </div>

          <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Photo & Badge */}
              <div className="flex flex-col items-center text-center sm:items-start sm:text-left gap-3 shrink-0">
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-purple-500/60 shadow-xl bg-slate-800">
                    <img 
                      src={principalProfile.photoUrl} 
                      alt={principalProfile.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black border border-purple-300 shadow-md">
                    CHIEF EXEC
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-purple-300">
                    {principalProfile.staffId}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    TRCN: <span className="text-slate-200 font-mono">{principalProfile.trcnNumber}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    <ScanFace className="w-3 h-3 text-emerald-400" />
                    <span>Biometric Enrolled</span>
                  </div>
                </div>
              </div>

              {/* Info & Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {principalProfile.fullName}
                    </h3>
                    <p className="text-xs font-semibold text-purple-300 mt-0.5">
                      {principalProfile.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProfileForDetails({ type: 'principal', data: principalProfile })}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                      <span>Full Dossier</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProfileForIdCard({ type: 'principal', data: principalProfile });
                        setIdCardFlipped(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold border border-purple-500/50 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                      <span>Print ID Card</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/70 rounded-xl p-3 border border-purple-900/30 space-y-1">
                    <div className="text-purple-400 font-semibold flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Highest Academic Qualification</span>
                    </div>
                    <div className="text-slate-200 font-medium">
                      {principalProfile.highestQualification}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {principalProfile.institutionGraduated} • {principalProfile.yearsOfExperience} Years Experience
                    </div>
                  </div>

                  <div className="bg-slate-950/70 rounded-xl p-3 border border-purple-900/30 space-y-1">
                    <div className="text-purple-400 font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Executive Office & Contacts</span>
                    </div>
                    <div className="text-slate-200 font-medium">
                      {principalProfile.officeLocation}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{principalProfile.officialEmail}</span>
                      <span>•</span>
                      <span>{principalProfile.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Executive Mission Statement */}
                <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl p-3 text-xs">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Executive Mission Statement</span>
                  </div>
                  <p className="text-slate-300 italic leading-relaxed">
                    "{principalProfile.executiveMission}"
                  </p>
                </div>

                {/* Supervised Directorates */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Direct Directorates:</span>
                  {principalProfile.supervisoryDirectorates.map((dir, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-md bg-purple-900/40 border border-purple-700/40 text-purple-200 text-[11px] font-medium">
                      {dir}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ADMINISTRATIVE OFFICERS SECTION                            */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'all' || activeCategory === 'administrative_officer') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-sky-300 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span>Administrative Officers & Directorate Portfolios</span>
            </h2>
            <span className="text-xs text-slate-400">{filteredAdmins.length} Officers Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="bg-slate-900 border border-slate-800 hover:border-sky-700/50 rounded-2xl p-5 shadow-lg transition-all space-y-4 relative group"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-sky-500/40 bg-slate-800">
                      <img 
                        src={admin.photoUrl} 
                        alt={admin.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.2 rounded-md bg-sky-600 text-white text-[9px] font-black">
                      ADMIN
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                        {admin.staffId}
                      </span>
                      {admin.biometricEnrolled && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <ScanFace className="w-3 h-3" />
                          <span>Biometric</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate mt-1">
                      {admin.fullName}
                    </h3>
                    <p className="text-xs text-sky-300 font-medium truncate">
                      {admin.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {admin.department}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="text-slate-300 font-medium flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate">{admin.qualification}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {admin.officeLocation}
                    </span>
                    <span className="font-semibold text-slate-300">
                      Reports to: {admin.reportingTo}
                    </span>
                  </div>
                </div>

                {/* Primary Responsibilities Snippet */}
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-bold text-slate-400">Key Administrative Portfolio:</div>
                  <ul className="space-y-1">
                    {admin.primaryResponsibilities.slice(0, 2).map((resp, idx) => (
                      <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {admin.officialEmail}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProfileForDetails({ type: 'admin', data: admin })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProfileForIdCard({ type: 'admin', data: admin });
                        setIdCardFlipped(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      ID Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TEACHING FACULTY SECTION                                   */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'all' || activeCategory === 'teacher') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              <span>Teaching Faculty (Subject Masters & Mistresses)</span>
            </h2>
            <span className="text-xs text-slate-400">{filteredTeachers.length} Teachers Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-700/50 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-800 shrink-0">
                      <img 
                        src={teacher.photoUrl} 
                        alt={teacher.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {teacher.staffId}
                        </span>
                        {teacher.isFormTeacher && (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                            Form Master
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate mt-1">
                        {teacher.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {teacher.department}
                      </p>
                    </div>
                  </div>

                  {/* Subjects Badges */}
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((sub, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/40 text-emerald-200 text-[10px] font-semibold">
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Qualifications & Load */}
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="text-[11px] text-slate-300 truncate">
                      <span className="font-semibold text-slate-400">TRCN:</span> {teacher.trcnNumber}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Teaching Load:</span>
                      <span className="font-bold text-emerald-300">
                        {teacher.weeklyTeachingPeriods} / {teacher.maxPeriodsCapacity} periods/wk
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Syllabus Completion:</span>
                      <span className="font-bold text-sky-300">
                        {teacher.syllabusCompletionRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{teacher.performanceRating}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProfileForDetails({ type: 'teacher', data: teacher })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProfileForIdCard({ type: 'teacher', data: teacher });
                        setIdCardFlipped(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      ID Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ENROLLED STUDENTS SECTION                                  */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'all' || activeCategory === 'student') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Enrolled Students Registry (Mapped to Parents)</span>
            </h2>
            <span className="text-xs text-slate-400">{filteredStudents.length} Students Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-700/50 rounded-2xl p-5 shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-indigo-500/40 bg-slate-800 shrink-0">
                      <img 
                        src={student.photoUrl} 
                        alt={student.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                          {student.admissionNumber}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          GPA: {student.currentTermGpa}%
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white truncate mt-1">
                        {student.fullName}
                      </h3>
                      <p className="text-[11px] text-indigo-300 font-medium truncate">
                        {student.classGroupName} • {student.termPositionInClass}
                      </p>
                    </div>
                  </div>

                  {/* Student Badges */}
                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Sport House:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[150px]">{student.houseSportTeam}</span>
                    </div>

                    {student.leadershipRole && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Leadership:</span>
                        <span className="text-amber-300 font-bold truncate max-w-[150px]">{student.leadershipRole}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Attendance Rate:</span>
                      <span className="text-emerald-400 font-bold">{student.termAttendanceRate}%</span>
                    </div>

                    {/* Mapped Parent Info */}
                    <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Mapped Guardian:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[140px]">
                        {student.primaryParentName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      if (onSelectStudentParent && student.primaryParentId) {
                        onSelectStudentParent(student.primaryParentId);
                      }
                      onNavigateTab('parent_database');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>View Parent DB</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProfileForDetails({ type: 'student', data: student })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProfileForIdCard({ type: 'student', data: student });
                        setIdCardFlipped(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      ID Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FULL PROFILE DOSSIER MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {selectedProfileForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedProfileForDetails(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-slate-800 shrink-0">
                <img 
                  src={selectedProfileForDetails.data.photoUrl} 
                  alt={selectedProfileForDetails.data.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase font-mono">
                    {selectedProfileForDetails.data.staffId || selectedProfileForDetails.data.admissionNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Active Verified Profile
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white truncate">
                  {selectedProfileForDetails.data.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedProfileForDetails.data.title || selectedProfileForDetails.data.classGroupName}
                </p>
              </div>
            </div>

            {/* Dossier Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Official Contact Email</div>
                <div className="text-slate-200 font-semibold">{selectedProfileForDetails.data.officialEmail || selectedProfileForDetails.data.email || 'N/A'}</div>
                {(selectedProfileForDetails.data.alternativeAccessEmail || selectedProfileForDetails.data.alternativeEmail) && (
                  <div className="text-[11px] text-amber-300 font-mono">
                    Alt: {selectedProfileForDetails.data.alternativeAccessEmail || selectedProfileForDetails.data.alternativeEmail}
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Telephone Number</div>
                <div className="text-slate-200 font-semibold">{selectedProfileForDetails.data.phone || 'N/A'}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Location / Office / Residential</div>
                <div className="text-slate-200 font-semibold">{selectedProfileForDetails.data.officeLocation || selectedProfileForDetails.data.residentialAddress || 'Campus Ground'}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Academic Certification / TRCN</div>
                <div className="text-slate-200 font-semibold">{selectedProfileForDetails.data.trcnNumber || selectedProfileForDetails.data.qualification || selectedProfileForDetails.data.bloodGroupGenotype || 'Registered'}</div>
              </div>
            </div>

            {/* Custom Extra Data based on type */}
            {selectedProfileForDetails.type === 'principal' && (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-purple-300">Executive Philosophy:</div>
                <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 italic">
                  "{selectedProfileForDetails.data.educationalPhilosophy}"
                </p>
              </div>
            )}

            {selectedProfileForDetails.type === 'teacher' && (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-emerald-300">Specialization & Pedagogy Notes:</div>
                <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedProfileForDetails.data.specializationNotes}
                </p>
              </div>
            )}

            {selectedProfileForDetails.type === 'student' && (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-indigo-300">Mapped Guardian & Emergency Details:</div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-200 font-bold">{selectedProfileForDetails.data.primaryParentName} ({selectedProfileForDetails.data.primaryParentRelationship})</div>
                  <div className="text-slate-400">Emergency Telephone: {selectedProfileForDetails.data.primaryParentPhone}</div>
                  <div className="text-slate-400">RFID Smartcard UID: {selectedProfileForDetails.data.rfidSmartCardUid}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedProfileForIdCard(selectedProfileForDetails);
                  setSelectedProfileForDetails(null);
                  setIdCardFlipped(false);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <IdCard className="w-4 h-4" />
                <span>Generate Official ID Card</span>
              </button>

              <button
                onClick={() => setSelectedProfileForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIGITAL INSTITUTIONAL ID CARD GENERATOR MODAL                 */}
      {/* ------------------------------------------------------------- */}
      {selectedProfileForIdCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedProfileForIdCard(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-lg font-black text-white">Digital Institutional ID Card</h3>
              <p className="text-xs text-slate-400 mt-0.5">National Security & Smart Campus Credential</p>
            </div>

            {/* ID Card Front & Back Flippable Container */}
            <div className="flex justify-center">
              <div 
                className="w-full max-w-[320px] aspect-[1/1.58] rounded-2xl shadow-2xl border border-slate-700/60 relative overflow-hidden text-slate-900 select-none transition-all duration-500"
                style={{
                  background: idCardFlipped
                    ? 'linear-gradient(145deg, #1e293b, #0f172a)'
                    : 'linear-gradient(145deg, #ffffff, #f1f5f9)'
                }}
              >
                {!idCardFlipped ? (
                  // --- FRONT SIDE ---
                  <div className="p-4 h-full flex flex-col justify-between">
                    {/* Top Header */}
                    <div className="text-center border-b pb-2 border-slate-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <School className="w-4 h-4 text-purple-700" />
                        <span className="font-black text-[13px] tracking-tight text-slate-900 uppercase">
                          {brandProfile?.schoolName || 'CURRICULUMFLOW ACADEMY'}
                        </span>
                      </div>
                      <p className="text-[9px] text-purple-700 font-bold uppercase tracking-wider">
                        {selectedProfileForIdCard.type === 'principal' ? 'Office of the Principal' : selectedProfileForIdCard.type === 'admin' ? 'Administrative Directorate' : selectedProfileForIdCard.type === 'teacher' ? 'Academic Faculty Card' : 'Official Student Card'}
                      </p>
                    </div>

                    {/* Photo & Role */}
                    <div className="flex flex-col items-center text-center my-auto">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-600 shadow-md bg-slate-200 mb-2">
                        <img 
                          src={selectedProfileForIdCard.data.photoUrl} 
                          alt={selectedProfileForIdCard.data.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="font-black text-sm text-slate-900 leading-tight">
                        {selectedProfileForIdCard.data.fullName}
                      </div>
                      <div className="text-[11px] font-semibold text-purple-700 mt-0.5">
                        {selectedProfileForIdCard.data.title || selectedProfileForIdCard.data.classGroupName}
                      </div>

                      <div className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-xs tracking-wider">
                        {selectedProfileForIdCard.data.staffId || selectedProfileForIdCard.data.admissionNumber}
                      </div>
                    </div>

                    {/* Bottom Bar & Hologram */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-600">
                      <div>
                        <div>Exp: <span className="font-bold text-slate-800">July 2027</span></div>
                        <div>Blood/Geno: <span className="font-bold">{selectedProfileForIdCard.data.bloodGroupGenotype || 'O+ / AA'}</span></div>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-black text-[9px] border border-purple-300">
                        <ShieldCheck className="w-3 h-3 text-purple-700" />
                        <span>VERIFIED</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // --- BACK SIDE ---
                  <div className="p-4 h-full flex flex-col justify-between text-white">
                    <div className="space-y-2 text-[10px] text-slate-300">
                      <div className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                        Card Terms & Conditions
                      </div>
                      <p className="leading-relaxed text-[10px]">
                        This card remains the property of CurriculumFlow Academy. If found, please return to the Principal's Security Office or call +234 803 111 2233.
                      </p>
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[10px] space-y-1">
                        <div><strong className="text-slate-200">Emergency Phone:</strong> +234 803 111 2233</div>
                        <div><strong className="text-slate-200">Smartcard UID:</strong> RFID-99482019</div>
                        <div><strong className="text-slate-200">Security Hash:</strong> SHA-256-CF-SEC-091</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <div className="p-1 bg-white rounded-lg">
                        <QrCode className="w-10 h-10 text-black" />
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400">Authorized Signature</div>
                        <div className="font-serif italic font-bold text-purple-300 text-xs">Dr. Funke Adeyemi</div>
                        <div className="text-[8px] text-slate-400">Principal & Chief Executive</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setIdCardFlipped(!idCardFlipped)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {idCardFlipped ? 'Show Front' : 'Show Back'}
              </button>

              <button
                onClick={() => {
                  window.print();
                  showToast('Preparing digital credential for printing...');
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/50"
              >
                <Printer className="w-4 h-4" />
                <span>Print Digital Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
