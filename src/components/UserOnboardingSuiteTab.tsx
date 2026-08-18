import React, { useState, useMemo } from 'react';
import { 
  UserProfile, 
  UserRole,
  ClassGrade,
  SchoolBrandProfile,
  TenantSchoolApp,
  ParentGuardianProfile,
  StudentInstitutionalProfile,
  TeacherInstitutionalProfile,
  AdminOfficerInstitutionalProfile
} from '../types';
import { 
  INITIAL_PARENTS_DATABASE 
} from '../data/parentDatabaseData';
import { 
  INITIAL_STUDENT_INSTITUTIONAL_PROFILES,
  INITIAL_TEACHER_INSTITUTIONAL_PROFILES,
  INITIAL_ADMIN_OFFICER_PROFILES
} from '../data/userProfilesData';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  UserCheck, 
  GraduationCap, 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Printer, 
  QrCode, 
  KeyRound, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Calendar, 
  Sparkles, 
  Check, 
  X, 
  Copy, 
  Send, 
  MessageSquare, 
  Share2, 
  ExternalLink, 
  Eye, 
  Edit3, 
  Trash2, 
  Lock, 
  FileSpreadsheet, 
  Layers, 
  BookOpen, 
  IdCard, 
  Award, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight,
  Shield,
  Briefcase,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { MainTabType } from './Navbar';

interface UserOnboardingSuiteTabProps {
  currentUser: UserProfile;
  brandProfile?: SchoolBrandProfile;
  activeTenant?: TenantSchoolApp;
  onNavigateTab: (tab: MainTabType) => void;
  allUsers?: UserProfile[];
  onAddNewUser?: (user: UserProfile) => void;
}

type OnboardingViewMode = 
  | 'overview'
  | 'staff_wizard'
  | 'student_wizard'
  | 'parent_wizard'
  | 'bulk_ingestion'
  | 'passes_credentials'
  | 'audit_logs';

const ALL_SUBJECTS = [
  'Mathematics', 'English Language', 'Civic Education', 'Biology', 
  'Chemistry', 'Physics', 'Further Mathematics', 'Agricultural Science', 
  'Economics', 'Government', 'Literature in English', 'Commerce', 
  'Financial Accounting', 'Technical Drawing', 'Computer Studies / ICT', 
  'Basic Science', 'Basic Technology', 'French', 'Yoruba', 'Igbo', 'Hausa'
];

const ALL_CLASS_GRADES: ClassGrade[] = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

export const UserOnboardingSuiteTab: React.FC<UserOnboardingSuiteTabProps> = ({
  currentUser,
  brandProfile,
  activeTenant,
  onNavigateTab,
  allUsers = [],
  onAddNewUser
}) => {
  // Navigation & Sub-views
  const [activeView, setActiveView] = useState<OnboardingViewMode>('overview');

  // Dynamic School Brand Identity
  const schoolName = brandProfile?.schoolName || activeTenant?.schoolName || 'Greenfield Academy';
  const schoolMotto = brandProfile?.motto || 'Excellence. Character. Impact.';
  const schoolEmail = brandProfile?.contactEmail || activeTenant?.principalEmail || 'info@greenfieldacademy.edu.ng';
  const schoolPhone = brandProfile?.contactPhone || activeTenant?.principalPhone || '+234 800 123 4567';
  const schoolAddress = brandProfile?.campusAddress || activeTenant?.address || '12 Excellence Drive, Lekki, Lagos';
  const schoolDomain = activeTenant?.customDomain || activeTenant?.subdomain ? `${activeTenant?.subdomain}.curriculumflow.sch.ng` : 'greenfieldacademy.sch.ng';

  // Master Local State for Onboarded Entities
  const [staffList, setStaffList] = useState<TeacherInstitutionalProfile[]>(INITIAL_TEACHER_INSTITUTIONAL_PROFILES);
  const [studentList, setStudentList] = useState<StudentInstitutionalProfile[]>(INITIAL_STUDENT_INSTITUTIONAL_PROFILES);
  const [parentList, setParentList] = useState<ParentGuardianProfile[]>(INITIAL_PARENTS_DATABASE);

  // Search & Filter State
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'staff' | 'student' | 'parent'>('all');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // 1. STAFF ONBOARDING WIZARD STATE
  // =========================================================================
  const [staffStep, setStaffStep] = useState<number>(1);
  const [staffForm, setStaffForm] = useState({
    title: 'Mr.',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    dateOfBirth: '1988-06-15',
    email: '',
    phone: '',
    trcnNumber: '',
    role: 'teacher' as UserRole,
    department: 'Sciences & Mathematics',
    officeTitle: 'Subject Teacher',
    assignedSubjects: ['Mathematics'] as string[],
    assignedClasses: ['JSS 1', 'JSS 2'] as ClassGrade[],
    yearsOfExperience: 5,
    qualification: 'B.Sc (Ed) Mathematics - University of Lagos',
    requireMFA: true,
    sendInviteSMS: true,
    sendInviteEmail: true,
    temporaryPassword: 'CF-' + Math.floor(100000 + Math.random() * 900000)
  });

  // =========================================================================
  // 2. STUDENT ONBOARDING WIZARD STATE
  // =========================================================================
  const [studentStep, setStudentStep] = useState<number>(1);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    dateOfBirth: '2011-04-12',
    classGrade: 'JSS 1' as ClassGrade,
    classArm: 'Gold',
    admissionNumber: `CF/2026/${Math.floor(1000 + Math.random() * 9000)}`,
    streamCategory: 'Day Student' as 'Day Student' | 'Boarding Student',
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: 'None',
    residentialAddress: 'Lekki Phase 1, Lagos',
    stateOfOrigin: 'Lagos State',
    parentRelationship: 'Father',
    parentFullName: '',
    parentPhone: '',
    parentEmail: '',
    selectedExistingParentId: '',
    temporaryPin: Math.floor(1000 + Math.random() * 9000).toString()
  });

  // =========================================================================
  // 3. PARENT ONBOARDING WIZARD STATE
  // =========================================================================
  const [parentStep, setParentStep] = useState<number>(1);
  const [parentForm, setParentForm] = useState({
    title: 'Mr.',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    primaryPhone: '',
    whatsappPhone: '',
    email: '',
    ninNumber: 'NIN-' + Math.floor(10000000000 + Math.random() * 90000000000),
    occupation: '',
    employer: '',
    residentialAddress: '',
    stateOfOrigin: 'Lagos State',
    selectedWardIds: [] as string[],
    relationshipToWards: 'Father',
    isAuthorizedPickup: true,
    receiveBroadsheetSMS: true,
    receiveBursaryInvoices: true,
    portalAccessCode: 'PORTAL-' + Math.floor(1000 + Math.random() * 9000),
    pickupCode: 'PCK-' + Math.floor(1000 + Math.random() * 9000) + '-SEC'
  });

  // =========================================================================
  // 4. BULK CSV INGESTION STATE
  // =========================================================================
  const [bulkCategory, setBulkCategory] = useState<'students' | 'staff' | 'parents'>('students');
  const [csvFileContent, setCsvFileContent] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // =========================================================================
  // 5. PASS / CREDENTIAL MODAL STATE
  // =========================================================================
  const [selectedPassEntity, setSelectedPassEntity] = useState<{
    type: 'staff' | 'student' | 'parent';
    data: any;
  } | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // =========================================================================
  // 6. AUDIT LOG STATE
  // =========================================================================
  const [auditLogs, setAuditLogs] = useState<{
    id: string;
    timestamp: string;
    action: string;
    targetName: string;
    targetRole: string;
    performedBy: string;
    status: 'success' | 'verified' | 'dispatched';
    details: string;
  }[]>([
    {
      id: 'aud-001',
      timestamp: '2026-08-18 11:20:04',
      action: 'Staff Account Created & TRCN Verified',
      targetName: 'Mr. Babatunde Adeola',
      targetRole: 'Senior Mathematics Teacher',
      performedBy: 'Dr. (Mrs.) Funke Adeyemi (Principal)',
      status: 'verified',
      details: 'Assigned JSS 1 & JSS 2 Maths, 2FA enabled, SMS Onboarding Pass Dispatched.'
    },
    {
      id: 'aud-002',
      timestamp: '2026-08-18 10:15:30',
      action: 'Student Admission & Smart ID Enrolled',
      targetName: 'Chinedu Eze',
      targetRole: 'Student (SS 2 Science A)',
      performedBy: 'Dr. (Mrs.) Funke Adeyemi (Principal)',
      status: 'success',
      details: 'Admission CF/2024/0142 confirmed, linked to Chief Okechukwu Eze (Father).'
    },
    {
      id: 'aud-003',
      timestamp: '2026-08-18 09:40:12',
      action: 'Parent Supervised Verification & Gate Pass Issued',
      targetName: 'Chief Okechukwu Eze',
      targetRole: 'Parent / PTA Chairman',
      performedBy: 'Dr. (Mrs.) Funke Adeyemi (Principal)',
      status: 'verified',
      details: 'Gate PIN PCK-8812-EZE generated, WhatsApp Portal Invite dispatched.'
    }
  ]);

  // Handler to finalize Staff Creation
  const handleFinalizeStaff = () => {
    const newStaffId = `CF-TEA-${Math.floor(100 + Math.random() * 900)}`;
    const newStaffProfile: TeacherInstitutionalProfile = {
      id: `usr-tea-${Date.now()}`,
      staffId: newStaffId,
      fullName: `${staffForm.title} ${staffForm.fullName}`,
      title: staffForm.officeTitle,
      avatar: staffForm.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      gender: staffForm.gender,
      trcnNumber: staffForm.trcnNumber || `TRCN/LA/${Math.floor(2010 + Math.random() * 14)}/${Math.floor(100000 + Math.random() * 900000)}`,
      qualification: staffForm.qualification,
      department: staffForm.department,
      subjects: staffForm.assignedSubjects,
      assignedClassGroupIds: ['cls-001'],
      assignedClassGroupNames: staffForm.assignedClasses,
      isFormTeacher: false,
      officeLocation: 'Academic Staff Room, Wing B',
      email: staffForm.email || `${staffForm.fullName.toLowerCase().replace(/\s+/g, '.')}@${schoolDomain}`,
      phone: staffForm.phone || '+234 800 000 0000',
      joinedDate: new Date().toISOString().split('T')[0],
      weeklyTeachingPeriods: 18,
      maxPeriodsCapacity: 24,
      specializationNotes: `${staffForm.yearsOfExperience} yrs experience. ${staffForm.qualification}`,
      biometricEnrolled: true,
      performanceRating: 5.0,
      syllabusCompletionRate: 100,
      status: 'active'
    };

    setStaffList(prev => [newStaffProfile, ...prev]);

    // Also add to UserProfile if parent handler provided
    if (onAddNewUser) {
      onAddNewUser({
        id: newStaffProfile.id,
        name: newStaffProfile.fullName,
        title: newStaffProfile.title,
        role: staffForm.role as any,
        avatar: newStaffProfile.avatar,
        email: newStaffProfile.email,
        phone: newStaffProfile.phone,
        assignedSubjects: newStaffProfile.subjects,
        assignedClasses: newStaffProfile.assignedClassGroupNames,
        department: newStaffProfile.department,
        officeTitle: newStaffProfile.title,
        isEmailVerified: true,
        isPhoneVerified: true,
        mfaEnabled: staffForm.requireMFA
      });
    }

    // Add audit log
    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action: 'Staff Account Created & TRCN Verified',
      targetName: newStaffProfile.fullName,
      targetRole: `${newStaffProfile.title} (${newStaffProfile.department})`,
      performedBy: `${currentUser.name} (${currentUser.role})`,
      status: 'verified' as const,
      details: `Assigned ${newStaffProfile.subjects.join(', ')} for ${newStaffProfile.assignedClassGroupNames.join(', ')}. Temporary PIN: ${staffForm.temporaryPassword}`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    showToast(`Staff member "${newStaffProfile.fullName}" onboarded and verified successfully!`);
    setSelectedPassEntity({ type: 'staff', data: { ...newStaffProfile, tempPassword: staffForm.temporaryPassword } });
    setIsPassModalOpen(true);
    setActiveView('overview');
    setStaffStep(1);
  };

  // Handler to finalize Student Admission
  const handleFinalizeStudent = () => {
    const newStudentProfile: StudentInstitutionalProfile = {
      id: `usr-stu-${Date.now()}`,
      admissionNumber: studentForm.admissionNumber,
      fullName: studentForm.fullName,
      gender: studentForm.gender,
      dateOfBirth: studentForm.dateOfBirth,
      avatar: studentForm.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      classGroupId: 'cls-001',
      classGroupName: `${studentForm.classGrade} ${studentForm.classArm}`,
      classGrade: studentForm.classGrade,
      houseSportTeam: 'Emerald Falcon',
      residentialAddress: studentForm.residentialAddress,
      bloodGroupGenotype: `${studentForm.bloodGroup} / ${studentForm.genotype}`,
      academicSession: '2026/2027 Session',
      currentTermGpa: 85.0,
      termPositionInClass: 'Admitted',
      termAttendanceRate: 100,
      punctualityScore: 'Exemplary',
      enrolledSubjectsCount: 11,
      biometricEnrolled: true,
      rfidSmartCardUid: studentForm.temporaryPin,
      conductRating: 'Exemplary',
      primaryParentId: studentForm.selectedExistingParentId || `par-${Date.now()}`,
      primaryParentName: studentForm.parentFullName || 'Guardian',
      primaryParentPhone: studentForm.parentPhone || '+234 800 000 0000',
      primaryParentRelationship: studentForm.parentRelationship,
      status: 'active'
    };

    setStudentList(prev => [newStudentProfile, ...prev]);

    // If new parent was entered in student form, create parent too
    if (studentForm.parentFullName && !studentForm.selectedExistingParentId) {
      const newParent: ParentGuardianProfile = {
        id: `par-${Date.now()}`,
        parentCode: `PAR-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: 'Mr./Mrs.',
        fullName: studentForm.parentFullName,
        gender: studentForm.parentRelationship === 'Mother' ? 'Female' : 'Male',
        avatar: studentForm.parentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        occupation: 'Parent / Sponsor',
        employerOrBusiness: 'Private Enterprise',
        residentialAddress: studentForm.residentialAddress,
        stateOfOrigin: studentForm.stateOfOrigin,
        primaryPhone: studentForm.parentPhone,
        whatsappPhone: studentForm.parentPhone,
        email: studentForm.parentEmail || `parent.${Date.now()}@gmail.com`,
        preferredContactChannel: 'whatsapp',
        maritalStatus: 'Married',
        ptaMemberCategory: 'General Member',
        portalAccessStatus: 'activated',
        portalAccessCode: `PORTAL-${Math.floor(1000 + Math.random() * 9000)}`,
        feePaymentStatus: 'fully_cleared',
        totalOutstandingBalance: 0,
        pickupAuthorizationCode: `PCK-${Math.floor(1000 + Math.random() * 9000)}-SEC`,
        biometricEnrolled: true,
        supervisedVerificationStatus: 'verified_by_principal',
        verifiedByPrincipalName: currentUser.name,
        verificationDate: new Date().toISOString().split('T')[0],
        principalSupervisionNotes: `Onboarded alongside ward ${studentForm.fullName} during term admission.`,
        isFlaggedForSecurity: false,
        wards: [
          {
            studentId: newStudentProfile.id,
            studentName: newStudentProfile.fullName,
            admissionNumber: newStudentProfile.admissionNumber,
            classGroupName: newStudentProfile.classGroupName,
            classGrade: newStudentProfile.classGrade,
            relationship: studentForm.parentRelationship,
            isPrimaryGuardian: true,
            isAuthorizedPickup: true,
            emergencyPriority: 1,
            canReceiveReportCards: true,
            canReceiveFeeInvoices: true,
            verifiedByPrincipal: true,
            verifiedDate: new Date().toISOString().split('T')[0],
            notes: 'Primary guardian linked during online admission.'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setParentList(prev => [newParent, ...prev]);
    }

    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action: 'Student Enrolled & Admission Slip Generated',
      targetName: newStudentProfile.fullName,
      targetRole: `Student (${newStudentProfile.classGroupName})`,
      performedBy: `${currentUser.name} (${currentUser.role})`,
      status: 'success' as const,
      details: `Admission No ${newStudentProfile.admissionNumber}, Smart PIN ${newStudentProfile.rfidSmartCardUid}.`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    showToast(`Student "${newStudentProfile.fullName}" admitted and enrolled in ${newStudentProfile.classGroupName}!`);
    setSelectedPassEntity({ type: 'student', data: newStudentProfile });
    setIsPassModalOpen(true);
    setActiveView('overview');
    setStudentStep(1);
  };

  // Handler to finalize Parent Registration & Ward Linking
  const handleFinalizeParent = () => {
    const selectedWardObjects = studentList
      .filter(s => parentForm.selectedWardIds.includes(s.id))
      .map(s => ({
        studentId: s.id,
        studentName: s.fullName,
        admissionNumber: s.admissionNumber,
        classGroupName: s.classGroupName,
        classGrade: s.classGrade,
        relationship: parentForm.relationshipToWards,
        isPrimaryGuardian: true,
        isAuthorizedPickup: parentForm.isAuthorizedPickup,
        emergencyPriority: 1 as const,
        canReceiveReportCards: parentForm.receiveBroadsheetSMS,
        canReceiveFeeInvoices: parentForm.receiveBursaryInvoices,
        verifiedByPrincipal: true,
        verifiedDate: new Date().toISOString().split('T')[0],
        notes: `Supervised ward binding verified by Principal on ${new Date().toLocaleDateString()}`
      }));

    const newParent: ParentGuardianProfile = {
      id: `par-${Date.now()}`,
      parentCode: `PAR-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: parentForm.title,
      fullName: `${parentForm.title} ${parentForm.fullName}`,
      gender: parentForm.gender,
      avatar: parentForm.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      occupation: parentForm.occupation || 'Business Executive',
      employerOrBusiness: parentForm.employer || 'Self-Employed / Corporate',
      residentialAddress: parentForm.residentialAddress || 'Lagos State',
      stateOfOrigin: parentForm.stateOfOrigin,
      primaryPhone: parentForm.primaryPhone,
      whatsappPhone: parentForm.whatsappPhone || parentForm.primaryPhone,
      email: parentForm.email,
      preferredContactChannel: 'whatsapp',
      maritalStatus: 'Married',
      ptaMemberCategory: 'General Member',
      portalAccessStatus: 'activated',
      portalAccessCode: parentForm.portalAccessCode,
      feePaymentStatus: 'fully_cleared',
      totalOutstandingBalance: 0,
      pickupAuthorizationCode: parentForm.pickupCode,
      biometricEnrolled: true,
      supervisedVerificationStatus: 'verified_by_principal',
      verifiedByPrincipalName: currentUser.name,
      verificationDate: new Date().toISOString().split('T')[0],
      principalSupervisionNotes: `Verified and authorized for gate pickup with PIN ${parentForm.pickupCode}`,
      isFlaggedForSecurity: false,
      wards: selectedWardObjects,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setParentList(prev => [newParent, ...prev]);

    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action: 'Parent Registered & Multi-Ward Binding Verified',
      targetName: newParent.fullName,
      targetRole: `Parent / Guardian (${selectedWardObjects.length} Wards Linked)`,
      performedBy: `${currentUser.name} (${currentUser.role})`,
      status: 'verified' as const,
      details: `Gate Pickup PIN: ${newParent.pickupAuthorizationCode}, Linked Wards: ${selectedWardObjects.map(w => w.studentName).join(', ')}`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    showToast(`Parent "${newParent.fullName}" registered with ${selectedWardObjects.length} linked wards!`);
    setSelectedPassEntity({ type: 'parent', data: newParent });
    setIsPassModalOpen(true);
    setActiveView('overview');
    setParentStep(1);
  };

  // CSV Template Generation
  const downloadCsvTemplate = (category: 'students' | 'staff' | 'parents') => {
    let header = '';
    let sample = '';
    let filename = '';

    if (category === 'students') {
      header = 'FullName,Gender,DateOfBirth,ClassGrade,ClassArm,ResidentialAddress,ParentName,ParentPhone,ParentEmail,BloodGroup';
      sample = 'Chinedu Eze,Male,2011-05-14,JSS 1,Gold,"15 Admiralty Way, Lekki",Chief Okechukwu Eze,+2348037654321,o.eze@atlanticlogistics.ng,O+\nAmina Bello,Female,2010-09-21,SS 1,Science,"Victoria Island, Lagos",Alhaji Garba Bello,+2348029994411,g.bello@investments.ng,AA';
      filename = 'curriculum_flow_student_onboarding_template.csv';
    } else if (category === 'staff') {
      header = 'Title,FullName,Gender,Email,Phone,Role,Department,AssignedSubjects,AssignedClasses,Qualification,TRCN';
      sample = 'Mr.,Babatunde Adeola,Male,adeola.b@school.edu.ng,+2348031234567,teacher,Sciences & Mathematics,"Mathematics, Further Mathematics","JSS 1, JSS 2",B.Sc Mathematics,TRCN/LA/2018/9982\nMrs.,Folashade Adeleke,Female,adeleke.f@school.edu.ng,+2348028881234,hod,Languages & Humanities,"English Language, Literature","SS 1, SS 2",M.A English,TRCN/LA/2014/1123';
      filename = 'curriculum_flow_staff_onboarding_template.csv';
    } else {
      header = 'Title,FullName,Gender,PrimaryPhone,WhatsAppPhone,Email,NIN,Occupation,ResidentialAddress,WardAdmissionNumbers,Relationship';
      sample = 'Chief,Okechukwu Eze,Male,+2348037654321,+2348037654321,o.eze@atlantic.ng,NIN-88910293847,Maritime Logistics,"15 Admiralty Way, Lekki","CF/2024/0142, CF/2025/0319",Father\nDr.,Zainab Mohammed,Female,+2348095551212,+2348095551212,z.mohammed@clinic.ng,NIN-19283746501,Medical Consultant,"Ikoyi, Lagos","CF/2026/0411",Mother';
      filename = 'curriculum_flow_parent_onboarding_template.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(`${header}\n${sample}`);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Template "${filename}" downloaded successfully!`);
  };

  // Sample CSV Process simulator
  const handleSimulateBulkIngestion = () => {
    setIsProcessingCsv(true);
    setTimeout(() => {
      setIsProcessingCsv(false);
      let count = 0;
      if (bulkCategory === 'students') {
        count = 12;
        showToast(`Successfully ingested 12 new students into active class registers!`);
      } else if (bulkCategory === 'staff') {
        count = 4;
        showToast(`Successfully ingested 4 faculty members and generated credential passes!`);
      } else {
        count = 9;
        showToast(`Successfully linked 9 parent accounts with gate security PINs!`);
      }

      setAuditLogs(prev => [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          action: `Bulk ${bulkCategory.toUpperCase()} Ingestion Batch Processed`,
          targetName: `${count} ${bulkCategory} records`,
          targetRole: 'Batch Ingestion Engine',
          performedBy: `${currentUser.name} (Principal Admin)`,
          status: 'success',
          details: `Processed via CSV batch uploader with automated format validation and ID generation.`
        },
        ...prev
      ]);
      setActiveView('overview');
    }, 1200);
  };

  // Filtered Directory Data
  const directoryItems = useMemo(() => {
    const items: Array<{
      id: string;
      category: 'staff' | 'student' | 'parent';
      name: string;
      identifier: string;
      badge: string;
      meta1: string;
      meta2: string;
      status: string;
      data: any;
    }> = [];

    if (directoryFilter === 'all' || directoryFilter === 'staff') {
      staffList.forEach(s => {
        items.push({
          id: s.id,
          category: 'staff',
          name: s.fullName,
          identifier: s.staffId,
          badge: s.title || s.qualification,
          meta1: s.department,
          meta2: (s.subjects || []).join(', '),
          status: s.status,
          data: s
        });
      });
    }

    if (directoryFilter === 'all' || directoryFilter === 'student') {
      studentList.forEach(s => {
        items.push({
          id: s.id,
          category: 'student',
          name: s.fullName,
          identifier: s.admissionNumber,
          badge: s.classGroupName,
          meta1: `Session: ${s.academicSession}`,
          meta2: `Emergency: ${s.primaryParentPhone}`,
          status: s.status,
          data: s
        });
      });
    }

    if (directoryFilter === 'all' || directoryFilter === 'parent') {
      parentList.forEach(p => {
        items.push({
          id: p.id,
          category: 'parent',
          name: p.fullName,
          identifier: p.parentCode,
          badge: `${p.wards.length} Ward${p.wards.length > 1 ? 's' : ''}`,
          meta1: `Phone: ${p.primaryPhone}`,
          meta2: p.wards.map(w => w.studentName).join(', '),
          status: p.portalAccessStatus,
          data: p
        });
      });
    }

    if (!directorySearch.trim()) return items;
    const q = directorySearch.toLowerCase();
    return items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.identifier.toLowerCase().includes(q) || 
      i.meta1.toLowerCase().includes(q) || 
      i.meta2.toLowerCase().includes(q)
    );
  }, [staffList, studentList, parentList, directoryFilter, directorySearch]);

  return (
    <div className="w-full bg-[#f8fafc] text-slate-800 font-sans space-y-6">
      
      {/* ============================================================ */}
      {/* 0. TOAST NOTIFICATION                                         */}
      {/* ============================================================ */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#042f24] text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TOP EXECUTIVE ONBOARDING SUITE HEADER                      */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Brand Crest & Title */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#043b2c] to-emerald-950 p-1 flex items-center justify-center shadow-lg shrink-0">
              <div className="w-full h-full border border-amber-400/50 rounded-xl flex items-center justify-center bg-[#032e22]">
                <ShieldCheck className="w-7 h-7 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black tracking-wider uppercase border border-emerald-200">
                  OFFICE OF PRINCIPAL ADMIN
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {schoolDomain}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                User Creation & Onboarding Governance Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-0.5">
                Principal executive controls to provision verified faculty, admit new students, onboard parents with multi-ward gate authorization, and execute batch CSV ingestions for <span className="font-semibold text-emerald-900">{schoolName}</span>.
              </p>
            </div>
          </div>

          {/* Right: Quick Action Wizard Triggers */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setActiveView('staff_wizard');
                setStaffStep(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-300" />
              <span>Onboard Staff</span>
            </button>

            <button
              onClick={() => {
                setActiveView('student_wizard');
                setStudentStep(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#043b2c] hover:bg-[#032e22] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Admit Student</span>
            </button>

            <button
              onClick={() => {
                setActiveView('parent_wizard');
                setParentStep(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-blue-200" />
              <span>Register Parent</span>
            </button>

            <button
              onClick={() => setActiveView('bulk_ingestion')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>Bulk CSV</span>
            </button>
          </div>

        </div>

        {/* Live Onboarding Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100">
          
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-700">Verified Faculty</div>
              <div className="text-lg font-black text-slate-900 font-mono">{staffList.length} Staff</div>
              <div className="text-[10px] text-emerald-600 font-semibold">100% TRCN Accredited</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-teal-700">Enrolled Students</div>
              <div className="text-lg font-black text-slate-900 font-mono">{studentList.length} Active</div>
              <div className="text-[10px] text-teal-600 font-semibold">Smart IDs Issued</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-700">Supervised Parents</div>
              <div className="text-lg font-black text-slate-900 font-mono">{parentList.length} Guardians</div>
              <div className="text-[10px] text-blue-600 font-semibold">Gate Passes Active</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-700">Principal Governance</div>
              <div className="text-lg font-black text-slate-900 font-mono">Level 5 Root</div>
              <div className="text-[10px] text-amber-700 font-semibold">Audit Logs Enabled</div>
            </div>
          </div>

        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Directory & Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveView('staff_wizard');
              setStaffStep(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'staff_wizard'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Staff Onboarding Wizard</span>
          </button>

          <button
            onClick={() => {
              setActiveView('student_wizard');
              setStudentStep(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'student_wizard'
                ? 'bg-[#043b2c] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Admission Wizard</span>
          </button>

          <button
            onClick={() => {
              setActiveView('parent_wizard');
              setParentStep(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'parent_wizard'
                ? 'bg-blue-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Parent & Ward Linking Wizard</span>
          </button>

          <button
            onClick={() => setActiveView('bulk_ingestion')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'bulk_ingestion'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV Ingestion Engine</span>
          </button>

          <button
            onClick={() => setActiveView('audit_logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'audit_logs'
                ? 'bg-purple-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Onboarding Audit Trail</span>
          </button>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. MASTER DIRECTORY & OVERVIEW VIEW                          */}
      {/* ============================================================ */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          
          {/* Quick Action Banner with Onboarding Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Staff Onboarding */}
            <div 
              onClick={() => {
                setActiveView('staff_wizard');
                setStaffStep(1);
              }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-800">
                  Staff & Faculty Onboarding
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Provision new teachers, HODs, exam officers and bursars. Assign curriculum subjects, class grades, TRCN certification, and generate temporary login PIN slips.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-4">
                <span>Start Staff Wizard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Student Admission */}
            <div 
              onClick={() => {
                setActiveView('student_wizard');
                setStudentStep(1);
              }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-teal-800">
                  Student Enrolment & Admission
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Admit students with automated Admission IDs, stream placement (JSS 1 to SS 3), medical alerts, biometric records, and instant Smart Admission passes.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-teal-700 mt-4">
                <span>Start Admission Wizard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Parent & Ward Binding */}
            <div 
              onClick={() => {
                setActiveView('parent_wizard');
                setParentStep(1);
              }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-800">
                  Parent Registration & Multi-Ward Binding
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Register guardians, link multiple student wards under one profile, configure emergency contacts, issue Gate Pickup PINs, and dispatch WhatsApp invite links.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-700 mt-4">
                <span>Start Parent Wizard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Master Search & Filter Directory Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Table Header Bar */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Active Provisioned Users Directory
                </h2>
                <p className="text-xs text-slate-500">
                  Search and manage all {directoryItems.length} active institutional accounts on this instance.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={e => setDirectorySearch(e.target.value)}
                    placeholder="Search by name, ID, class..."
                    className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-56 sm:w-64"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setDirectoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${directoryFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    All ({staffList.length + studentList.length + parentList.length})
                  </button>
                  <button
                    onClick={() => setDirectoryFilter('staff')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${directoryFilter === 'staff' ? 'bg-emerald-50 text-emerald-800 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Staff ({staffList.length})
                  </button>
                  <button
                    onClick={() => setDirectoryFilter('student')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${directoryFilter === 'student' ? 'bg-teal-50 text-teal-800 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Students ({studentList.length})
                  </button>
                  <button
                    onClick={() => setDirectoryFilter('parent')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${directoryFilter === 'parent' ? 'bg-blue-50 text-blue-800 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    Parents ({parentList.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200/80">
                    <th className="py-3.5 px-5">User & Bio Identity</th>
                    <th className="py-3.5 px-4">System Ref / ID</th>
                    <th className="py-3.5 px-4">Category & Designation</th>
                    <th className="py-3.5 px-4">Allocations & Wards</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {directoryItems.slice(0, 15).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.category === 'staff' ? 'bg-emerald-100 text-emerald-800' :
                            item.category === 'student' ? 'bg-teal-100 text-teal-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{item.category} Account</div>
                          </div>
                        </div>
                      </td>

                      {/* Identifier */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.identifier}
                      </td>

                      {/* Badge / Designation */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.category === 'staff' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          item.category === 'student' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                          'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {item.badge}
                        </span>
                      </td>

                      {/* Allocations / Meta */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        <div className="font-semibold text-slate-800">{item.meta1}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.meta2}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Principal Verified</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPassEntity({ type: item.category, data: item.data });
                              setIsPassModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 transition-colors cursor-pointer"
                            title="Generate Printable Onboarding Pass & QR Code"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPassEntity({ type: item.category, data: item.data });
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-green-50 hover:text-green-800 text-slate-600 transition-colors cursor-pointer"
                            title="Send WhatsApp / SMS Invite Link"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 3. STAFF ONBOARDING WIZARD                                    */}
      {/* ============================================================ */}
      {activeView === 'staff_wizard' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          
          {/* Header & Steps Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Step {staffStep} of 4 • Guided Workflow
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Staff & Faculty Onboarding Wizard
              </h2>
            </div>

            {/* Step Pills */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    staffStep === step ? 'bg-emerald-800 text-white shadow-md scale-105' :
                    staffStep > step ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  {staffStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Personal Details & System Identification */}
          {staffStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">1. Personal Bio-Data & System Identifiers</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                  <select
                    value={staffForm.title}
                    onChange={e => setStaffForm({ ...staffForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Engr.">Engr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    value={staffForm.fullName}
                    onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    placeholder="e.g. Babatunde Adeola"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={staffForm.gender}
                    onChange={e => setStaffForm({ ...staffForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Mobile Phone *</label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="+234 803 123 4567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="adeola.b@school.edu.ng"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TRCN Registration Number</label>
                  <input
                    type="text"
                    value={staffForm.trcnNumber}
                    onChange={e => setStaffForm({ ...staffForm, trcnNumber: e.target.value })}
                    placeholder="e.g. TRCN/LA/2018/009182"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Highest Academic Qualification</label>
                  <input
                    type="text"
                    value={staffForm.qualification}
                    onChange={e => setStaffForm({ ...staffForm, qualification: e.target.value })}
                    placeholder="e.g. B.Sc (Ed) Mathematics"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Role & Department Allocation */}
          {staffStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">2. Institutional Role & Department</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designated Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="teacher">Subject Teacher</option>
                    <option value="hod">Head of Department (HOD)</option>
                    <option value="exam_officer">Examination Officer</option>
                    <option value="vice_principal_academic">Vice Principal (Academic)</option>
                    <option value="vice_principal_admin">Vice Principal (Admin)</option>
                    <option value="bursar_finance">Bursar / Finance Officer</option>
                    <option value="ict_system_admin">ICT System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Department *</label>
                  <select
                    value={staffForm.department}
                    onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Sciences & Mathematics">Sciences & Mathematics</option>
                    <option value="Languages & Humanities">Languages & Humanities</option>
                    <option value="Business & Commercial Studies">Business & Commercial Studies</option>
                    <option value="Technical & Vocational Studies">Technical & Vocational Studies</option>
                    <option value="Administration & Registry">Administration & Registry</option>
                    <option value="Bursary & Finance">Bursary & Finance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Office Title</label>
                <input
                  type="text"
                  value={staffForm.officeTitle}
                  onChange={e => setStaffForm({ ...staffForm, officeTitle: e.target.value })}
                  placeholder="e.g. Senior Mathematics Master & Form Master"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Curriculum Subject & Class Allocations */}
          {staffStep === 3 && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">3. Curriculum Teaching & Class Allocations</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Assigned Teaching Classes</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ALL_CLASS_GRADES.map(grade => {
                    const isSelected = staffForm.assignedClasses.includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setStaffForm({
                              ...staffForm,
                              assignedClasses: staffForm.assignedClasses.filter(g => g !== grade)
                            });
                          } else {
                            setStaffForm({
                              ...staffForm,
                              assignedClasses: [...staffForm.assignedClasses, grade]
                            });
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {grade}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Assigned Curriculum Subjects</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {ALL_SUBJECTS.map(subj => {
                    const isSelected = staffForm.assignedSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setStaffForm({
                              ...staffForm,
                              assignedSubjects: staffForm.assignedSubjects.filter(s => s !== subj)
                            });
                          } else {
                            setStaffForm({
                              ...staffForm,
                              assignedSubjects: [...staffForm.assignedSubjects, subj]
                            });
                          }
                        }}
                        className={`py-1.5 px-2.5 rounded-lg text-left text-[11px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className="truncate">{subj}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Security Credentials & Activation Dispatch */}
          {staffStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">4. Security Credentials & Activation Pass</h3>
              
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Generated Temporary Access PIN</span>
                  <button 
                    onClick={() => setStaffForm({ ...staffForm, temporaryPassword: 'CF-' + Math.floor(100000 + Math.random() * 900000) })}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-900 bg-white p-3 rounded-xl border border-emerald-200 text-center tracking-wider">
                  {staffForm.temporaryPassword}
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  The faculty member will be required to configure their permanent password and 2-Factor Authentication upon initial login.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.requireMFA}
                    onChange={e => setStaffForm({ ...staffForm, requireMFA: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Enforce Mandatory 2FA Authenticator</div>
                    <div className="text-[10px] text-slate-500">Requires Google Authenticator or SMS TOTP validation on each session.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={staffForm.sendInviteSMS}
                    onChange={e => setStaffForm({ ...staffForm, sendInviteSMS: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Dispatch Instant SMS Welcome & Activation PIN</div>
                    <div className="text-[10px] text-slate-500">Sends instant SMS via Curriculum Flow SMS Gateway.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                if (staffStep > 1) setStaffStep(staffStep - 1);
                else setActiveView('overview');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {staffStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {staffStep < 4 ? (
              <button
                onClick={() => {
                  if (!staffForm.fullName.trim()) {
                    showToast('Please enter the staff member’s full legal name.');
                    return;
                  }
                  setStaffStep(staffStep + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalizeStaff}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Issue Staff Pass</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 4. STUDENT ADMISSION WIZARD                                   */}
      {/* ============================================================ */}
      {activeView === 'student_wizard' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          
          {/* Header & Steps Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Step {studentStep} of 4 • Student Enrolment
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Student Admission & Enrolment Wizard
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(step => (
                <div 
                  key={step}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    studentStep === step ? 'bg-teal-800 text-white shadow-md scale-105' :
                    studentStep > step ? 'bg-teal-100 text-teal-800' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  {studentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Student Demographics */}
          {studentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">1. Student Demographics & Admission Number</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    value={studentForm.fullName}
                    onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })}
                    placeholder="e.g. Chinedu Eze"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={studentForm.gender}
                    onChange={e => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={studentForm.admissionNumber}
                    onChange={e => setStudentForm({ ...studentForm, admissionNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={studentForm.dateOfBirth}
                    onChange={e => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State of Origin</label>
                  <input
                    type="text"
                    value={studentForm.stateOfOrigin}
                    onChange={e => setStudentForm({ ...studentForm, stateOfOrigin: e.target.value })}
                    placeholder="e.g. Lagos State"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={studentForm.residentialAddress}
                  onChange={e => setStudentForm({ ...studentForm, residentialAddress: e.target.value })}
                  placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Academic Placement & Stream */}
          {studentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">2. Class Grade & Arm Placement</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Grade *</label>
                  <select
                    value={studentForm.classGrade}
                    onChange={e => setStudentForm({ ...studentForm, classGrade: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    {ALL_CLASS_GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Arm / Stream</label>
                  <select
                    value={studentForm.classArm}
                    onChange={e => setStudentForm({ ...studentForm, classArm: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Gold">Gold Arm</option>
                    <option value="Diamond">Diamond Arm</option>
                    <option value="Science A">Science A</option>
                    <option value="Arts B">Arts B</option>
                    <option value="Commercial">Commercial Arm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={studentForm.streamCategory}
                    onChange={e => setStudentForm({ ...studentForm, streamCategory: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Day Student">Day Student</option>
                    <option value="Boarding Student">Boarding Student</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                <div className="text-xs font-bold text-teal-900">Enrolment Placement Preview:</div>
                <div className="text-sm font-black text-teal-800 mt-0.5">
                  {studentForm.fullName || 'Student'} → {studentForm.classGrade} {studentForm.classArm} ({studentForm.streamCategory})
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Medical & Special Educational Profile */}
          {studentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">3. Health Profile & Emergency Alerts</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={studentForm.bloodGroup}
                    onChange={e => setStudentForm({ ...studentForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="O+">O+ (Positive)</option>
                    <option value="O-">O- (Negative)</option>
                    <option value="A+">A+ (Positive)</option>
                    <option value="A-">A- (Negative)</option>
                    <option value="B+">B+ (Positive)</option>
                    <option value="AB+">AB+ (Positive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Genotype</label>
                  <select
                    value={studentForm.genotype}
                    onChange={e => setStudentForm({ ...studentForm, genotype: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="AA">AA (Normal)</option>
                    <option value="AS">AS (Carrier)</option>
                    <option value="SS">SS (Sickle Cell)</option>
                    <option value="AC">AC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medical Alerts / Allergies</label>
                <input
                  type="text"
                  value={studentForm.allergies}
                  onChange={e => setStudentForm({ ...studentForm, allergies: e.target.value })}
                  placeholder="e.g. Asthmatic inhaler required, Peanuts allergy, None"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Parent / Guardian Linking */}
          {studentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">4. Parent / Guardian Association</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link to Existing Registered Parent (Optional)</label>
                <select
                  value={studentForm.selectedExistingParentId}
                  onChange={e => setStudentForm({ ...studentForm, selectedExistingParentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Create New Parent Record Below --</option>
                  {parentList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.primaryPhone} - {p.wards.length} Wards)
                    </option>
                  ))}
                </select>
              </div>

              {!studentForm.selectedExistingParentId && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">New Guardian Details:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship</label>
                      <select
                        value={studentForm.parentRelationship}
                        onChange={e => setStudentForm({ ...studentForm, parentRelationship: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Legal Guardian">Legal Guardian</option>
                        <option value="Sponsor">Sponsor</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Full Name</label>
                      <input
                        type="text"
                        value={studentForm.parentFullName}
                        onChange={e => setStudentForm({ ...studentForm, parentFullName: e.target.value })}
                        placeholder="e.g. Chief Okechukwu Eze"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Phone *</label>
                      <input
                        type="tel"
                        value={studentForm.parentPhone}
                        onChange={e => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                        placeholder="+234 803 765 4321"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent Email</label>
                      <input
                        type="email"
                        value={studentForm.parentEmail}
                        onChange={e => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                        placeholder="parent@gmail.com"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                if (studentStep > 1) setStudentStep(studentStep - 1);
                else setActiveView('overview');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {studentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {studentStep < 4 ? (
              <button
                onClick={() => {
                  if (!studentForm.fullName.trim()) {
                    showToast('Please enter the student’s full name.');
                    return;
                  }
                  setStudentStep(studentStep + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalizeStudent}
                className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Issue Student Smart Pass</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PARENT ONBOARDING & WARD LINKING WIZARD                    */}
      {/* ============================================================ */}
      {activeView === 'parent_wizard' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          
          {/* Header & Steps Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Step {parentStep} of 3 • Guardian Registration
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Parent Registration & Ward Linking Wizard
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3].map(step => (
                <div 
                  key={step}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    parentStep === step ? 'bg-blue-800 text-white shadow-md scale-105' :
                    parentStep > step ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  {parentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Parent Bio-Data & Verification */}
          {parentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">1. Guardian Bio-Data & National ID</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salutation</label>
                  <select
                    value={parentForm.title}
                    onChange={e => setParentForm({ ...parentForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Chief">Chief</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Alhaji">Alhaji</option>
                    <option value="Hajia">Hajia</option>
                    <option value="Engr.">Engr.</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={parentForm.fullName}
                    onChange={e => setParentForm({ ...parentForm, fullName: e.target.value })}
                    placeholder="e.g. Okechukwu Eze"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone *</label>
                  <input
                    type="tel"
                    value={parentForm.primaryPhone}
                    onChange={e => setParentForm({ ...parentForm, primaryPhone: e.target.value })}
                    placeholder="+234 803 765 4321"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone (For SMS/Portal)</label>
                  <input
                    type="tel"
                    value={parentForm.whatsappPhone}
                    onChange={e => setParentForm({ ...parentForm, whatsappPhone: e.target.value })}
                    placeholder="+234 803 765 4321"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={parentForm.email}
                    onChange={e => setParentForm({ ...parentForm, email: e.target.value })}
                    placeholder="parent@atlantic.ng"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Occupation & Employer</label>
                  <input
                    type="text"
                    value={parentForm.occupation}
                    onChange={e => setParentForm({ ...parentForm, occupation: e.target.value })}
                    placeholder="e.g. Managing Director - Maritime Logistics"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID (NIN)</label>
                  <input
                    type="text"
                    value={parentForm.ninNumber}
                    onChange={e => setParentForm({ ...parentForm, ninNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Multi-Ward Selector & Association */}
          {parentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">2. Select & Link Student Wards</h3>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  {parentForm.selectedWardIds.length} Ward{parentForm.selectedWardIds.length > 1 ? 's' : ''} Selected
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Relationship to Selected Wards</label>
                <select
                  value={parentForm.relationshipToWards}
                  onChange={e => setParentForm({ ...parentForm, relationshipToWards: e.target.value })}
                  className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Sponsor">Sponsor</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 max-h-56 overflow-y-auto">
                <div className="text-[11px] text-slate-500 font-bold px-1">Click to select and associate children with this guardian:</div>
                {studentList.map(student => {
                  const isSelected = parentForm.selectedWardIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        if (isSelected) {
                          setParentForm({
                            ...parentForm,
                            selectedWardIds: parentForm.selectedWardIds.filter(id => id !== student.id)
                          });
                        } else {
                          setParentForm({
                            ...parentForm,
                            selectedWardIds: [...parentForm.selectedWardIds, student.id]
                          });
                        }
                      }}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border border-blue-300 shadow-sm'
                          : 'bg-white hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{student.fullName}</div>
                          <div className="text-[10px] text-slate-500">{student.admissionNumber} • {student.currentClassArm}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Security Clearances & Gate Pickup PIN */}
          {parentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">3. Gate Security PIN & Authorization Rules</h3>
              
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">Supervised Gate Pickup Code</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Automated Vault</span>
                </div>
                <div className="text-xl font-black font-mono text-blue-950 bg-white p-3 rounded-xl border border-blue-200 text-center tracking-widest">
                  {parentForm.pickupCode}
                </div>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Gate security guards will scan this QR payload or verify this PIN when authorizing student departure.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentForm.isAuthorizedPickup}
                    onChange={e => setParentForm({ ...parentForm, isAuthorizedPickup: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Authorized for Emergency Student Pickup</div>
                    <div className="text-[10px] text-slate-500">Security checkpoint will allow student release to this parent.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentForm.receiveBroadsheetSMS}
                    onChange={e => setParentForm({ ...parentForm, receiveBroadsheetSMS: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Direct Academic Report Card & Broadsheet Recipient</div>
                    <div className="text-[10px] text-slate-500">Sends instant SMS alert and WhatsApp PDF report card at term conclusion.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                if (parentStep > 1) setParentStep(parentStep - 1);
                else setActiveView('overview');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {parentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {parentStep < 3 ? (
              <button
                onClick={() => {
                  if (!parentForm.fullName.trim()) {
                    showToast('Please enter the guardian’s full name.');
                    return;
                  }
                  setParentStep(parentStep + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinalizeParent}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Issue Parent Gate Pass</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 6. BULK CSV / SPREADSHEET INGESTION ENGINE                    */}
      {/* ============================================================ */}
      {activeView === 'bulk_ingestion' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Batch Import Engine
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Bulk CSV & Spreadsheet Ingestion
              </h2>
            </div>

            {/* Target Category Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setBulkCategory('students')}
                className={`px-3 py-1.5 rounded-lg transition-all ${bulkCategory === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Students Bulk
              </button>
              <button
                onClick={() => setBulkCategory('staff')}
                className={`px-3 py-1.5 rounded-lg transition-all ${bulkCategory === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Staff Bulk
              </button>
              <button
                onClick={() => setBulkCategory('parents')}
                className={`px-3 py-1.5 rounded-lg transition-all ${bulkCategory === 'parents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Parents Bulk
              </button>
            </div>
          </div>

          {/* Template Download Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Pre-Formatted {bulkCategory.toUpperCase()} Template (.CSV)
                </div>
                <div className="text-[11px] text-slate-500">
                  Includes valid header definitions, class grades, and column formats.
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadCsvTemplate(bulkCategory)}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/60 transition-colors space-y-3 cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center shadow-sm">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">
                Drag and drop your populated {bulkCategory} CSV file here
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Supports UTF-8 formatted CSV, XLSX or TSV files up to 10MB
              </div>
            </div>
            <button
              onClick={handleSimulateBulkIngestion}
              disabled={isProcessingCsv}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isProcessingCsv ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating & Ingesting Records...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload & Ingest Sample Batch</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 7. AUDIT LOGS & PRINCIPAL GOVERNANCE TRAIL                    */}
      {/* ============================================================ */}
      {activeView === 'audit_logs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Immutable Ledger
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Principal Onboarding Audit Log
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {auditLogs.length} Events Logged
            </span>
          </div>

          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {log.targetRole}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Target: <span className="font-bold text-slate-900">{log.targetName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{log.details}</div>
                </div>
                <div className="text-left sm:text-right shrink-0 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400">{log.timestamp}</div>
                  <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                    By: {log.performedBy}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 8. PRINTABLE ONBOARDING PASS / CREDENTIAL MODAL               */}
      {/* ============================================================ */}
      {isPassModalOpen && selectedPassEntity && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-black text-slate-900">Official Institutional Onboarding Pass</span>
              </div>
              <button 
                onClick={() => setIsPassModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Pass Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#032e22] to-[#043b2c] text-white border-2 border-amber-400/40 shadow-xl space-y-4 relative overflow-hidden">
              
              {/* Watermark Crest */}
              <div className="absolute -right-8 -bottom-8 opacity-10 text-white pointer-events-none">
                <ShieldCheck className="w-48 h-48" />
              </div>

              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-700/60">
                <div>
                  <div className="text-[10px] uppercase font-black text-amber-400 tracking-widest">
                    {schoolName}
                  </div>
                  <div className="text-xs text-emerald-200 font-medium">{schoolMotto}</div>
                </div>
                <div className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase font-mono">
                  {selectedPassEntity.type.toUpperCase()} PASS
                </div>
              </div>

              {/* Entity Info */}
              <div className="space-y-2">
                <div className="text-lg font-black text-white">
                  {selectedPassEntity.data.fullName || selectedPassEntity.data.name}
                </div>
                <div className="text-xs text-emerald-200 font-mono">
                  ID Ref: {selectedPassEntity.data.staffId || selectedPassEntity.data.admissionNumber || selectedPassEntity.data.parentCode || 'CF-REF-001'}
                </div>
              </div>

              {/* QR & Security PIN */}
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-300">Activation / Access PIN</div>
                  <div className="text-lg font-black font-mono text-white tracking-wider">
                    {selectedPassEntity.data.tempPassword || selectedPassEntity.data.portalAccessPin || selectedPassEntity.data.portalAccessCode || 'CF-PASS-2026'}
                  </div>
                </div>
                <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center text-slate-900">
                  <QrCode className="w-10 h-10" />
                </div>
              </div>

              {/* Verification Seal */}
              <div className="text-[9px] text-emerald-300/80 flex items-center justify-between pt-2 border-t border-emerald-700/60">
                <span>Verified by: Dr. (Mrs.) Funke Adeyemi (Principal)</span>
                <span>Curriculum Flow Secure Vault</span>
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Pass Slip</span>
              </button>
              <button
                onClick={() => {
                  setIsPassModalOpen(false);
                  setIsWhatsAppModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp Invite</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. WHATSAPP / SMS INVITATION DISPATCH MODAL                   */}
      {/* ============================================================ */}
      {isWhatsAppModalOpen && selectedPassEntity && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-black text-slate-900">Dispatch WhatsApp / SMS Welcome Invitation</span>
              </div>
              <button 
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                Message preview to be dispatched to <span className="font-bold text-slate-900">{selectedPassEntity.data.fullName}</span>:
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-950 whitespace-pre-wrap leading-relaxed">
{`Hello ${selectedPassEntity.data.fullName},

Welcome to ${schoolName}! Your official Curriculum Flow institutional profile is now active.

📱 Portal URL: https://${schoolDomain}/portal
🔑 Access PIN: ${selectedPassEntity.data.tempPassword || selectedPassEntity.data.portalAccessPin || selectedPassEntity.data.portalAccessCode || 'CF-PASS-2026'}
🔒 Verification Status: Authorized by Principal

Please log in to configure your profile and view your academic dashboard.`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Hello ${selectedPassEntity.data.fullName},\n\nWelcome to ${schoolName}! Your Curriculum Flow portal access PIN is: ${selectedPassEntity.data.tempPassword || selectedPassEntity.data.portalAccessPin || 'CF-PASS-2026'}\nLogin at https://${schoolDomain}`);
                  showToast('Invitation text copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </button>

              <button
                onClick={() => {
                  showToast(`SMS & WhatsApp invitation successfully dispatched to ${selectedPassEntity.data.fullName}!`);
                  setIsWhatsAppModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Instant Message</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
