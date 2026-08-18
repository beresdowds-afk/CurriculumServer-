import {
  StudentSubjectScore,
  ClassAcademicRecord,
  StudentTermSummary,
  ScoreGrade,
  UserProfile,
  Teacher,
  ClassGroup,
  Student,
  Term,
  RLSPermissionEvaluation,
  RLSPolicyRule
} from '../types';
import { INITIAL_CLASS_GROUPS, INITIAL_STUDENTS, INITIAL_TEACHERS } from './schoolManagementData';

// -------------------------------------------------------------
// NERDC / WAEC STANDARD GRADING SCALE
// -------------------------------------------------------------
export function calculateGradeAndPoints(totalScore: number): {
  grade: ScoreGrade;
  points: number;
  remarks: 'Distinction (A1)' | 'Very Good (B2)' | 'Good (B3)' | 'Credit (C4-C6)' | 'Pass (D7-E8)' | 'Fail (F9)';
} {
  const score = Math.round(totalScore);
  if (score >= 75) {
    return { grade: 'A1', points: 9, remarks: 'Distinction (A1)' };
  } else if (score >= 70) {
    return { grade: 'B2', points: 8, remarks: 'Very Good (B2)' };
  } else if (score >= 65) {
    return { grade: 'B3', points: 7, remarks: 'Good (B3)' };
  } else if (score >= 60) {
    return { grade: 'C4', points: 6, remarks: 'Credit (C4-C6)' };
  } else if (score >= 55) {
    return { grade: 'C5', points: 5, remarks: 'Credit (C4-C6)' };
  } else if (score >= 50) {
    return { grade: 'C6', points: 4, remarks: 'Credit (C4-C6)' };
  } else if (score >= 45) {
    return { grade: 'D7', points: 3, remarks: 'Pass (D7-E8)' };
  } else if (score >= 40) {
    return { grade: 'E8', points: 2, remarks: 'Pass (D7-E8)' };
  } else {
    return { grade: 'F9', points: 0, remarks: 'Fail (F9)' };
  }
}

// -------------------------------------------------------------
// ROW-LEVEL SECURITY (RLS) EVALUATION ENGINE
// -------------------------------------------------------------
export function evaluateRLSAccess(
  user: UserProfile,
  classGroup: ClassGroup | undefined,
  subjectId: string | undefined,
  teachers: Teacher[]
): RLSPermissionEvaluation {
  // 1. Super Administrators, Principal, Vice Principal & Exam Officer
  if (
    user.role === 'principal' || 
    user.role === 'academic_coordinator' || 
    user.role === 'exam_officer' ||
    user.role === 'super_admin'
  ) {
    return {
      canViewSubjectGradebook: true,
      canEditSubjectScore: true,
      canSubmitSubjectScore: true,
      canUnlockSubjectScore: true,
      canViewClassBroadsheet: true,
      canEditFormTeacherRemarks: true,
      canEditAffectiveAndPsychomotor: true,
      canApproveAndPublishClassRecords: true,
      canGenerateReportCard: true,
      activePolicyRule: 'RLS_ACADEMIC_ADMIN_FULL_ACCESS',
      policyDescription: 'Principal / Exam Board Authority: Global administrative read & write permissions across all class groups, subjects, and broadsheets.',
      enforcedRestrictions: []
    };
  }

  // 2. Teacher Role (Subject Teacher / Form Teacher)
  const teacherRecord = teachers.find(
    t => t.id === user.id || t.fullName.toLowerCase().includes(user.name.toLowerCase()) || user.name.toLowerCase().includes(t.fullName.toLowerCase())
  );

  const teacherAssignedSubjects = user.assignedSubjects || teacherRecord?.subjects || [];
  const isFormTeacherOfThisClass = classGroup ? (
    classGroup.formTeacherId === user.id || 
    classGroup.formTeacherName.toLowerCase().includes(user.name.toLowerCase()) ||
    (teacherRecord && classGroup.formTeacherId === teacherRecord.id)
  ) : false;

  const isAssignedSubjectTeacher = subjectId && classGroup ? (
    teacherAssignedSubjects.some(s => s.toLowerCase() === subjectId.toLowerCase() || subjectId.toLowerCase().includes(s.toLowerCase())) ||
    (teacherRecord?.assignedClassGroupIds?.includes(classGroup.id))
  ) : false;

  // Form Teacher Broad Access
  if (isFormTeacherOfThisClass) {
    return {
      canViewSubjectGradebook: true,
      canEditSubjectScore: Boolean(isAssignedSubjectTeacher),
      canSubmitSubjectScore: Boolean(isAssignedSubjectTeacher),
      canUnlockSubjectScore: false,
      canViewClassBroadsheet: true,
      canEditFormTeacherRemarks: true,
      canEditAffectiveAndPsychomotor: true,
      canApproveAndPublishClassRecords: false, // Requires Exam Officer / Principal
      canGenerateReportCard: true,
      activePolicyRule: 'RLS_FORM_TEACHER_BROADSHEET_SCOPE',
      policyDescription: `Form Teacher Access [${classGroup?.name}]: Authorized to manage master broadsheet, affective/psychomotor domains, and form teacher remarks. Subject mark editing restricted to taught subjects only.`,
      enforcedRestrictions: isAssignedSubjectTeacher 
        ? []
        : ['Cannot alter other subject teachers\' continuous assessment / exam scores without Principal authorization.']
    };
  }

  // Pure Subject Teacher Access
  if (isAssignedSubjectTeacher) {
    return {
      canViewSubjectGradebook: true,
      canEditSubjectScore: true,
      canSubmitSubjectScore: true,
      canUnlockSubjectScore: false,
      canViewClassBroadsheet: false, // RLS isolation: cannot tamper with other subjects
      canEditFormTeacherRemarks: false,
      canEditAffectiveAndPsychomotor: false,
      canApproveAndPublishClassRecords: false,
      canGenerateReportCard: false,
      activePolicyRule: 'RLS_SUBJECT_TEACHER_ISOLATION',
      policyDescription: `Subject Teacher Isolation: Authorized strictly to input and submit CA and Exam marks for allocated subject [${subjectId || 'Assigned Subject'}] in ${classGroup?.name || 'Class'}.`,
      enforcedRestrictions: [
        'Isolated from other subject scores in this class.',
        'Read/Write access restricted to own assigned gradebook columns.',
        'Cannot modify Form Teacher qualitative remarks or Psychomotor ratings.'
      ]
    };
  }

  // 3. Student / Parent Restricted Read-Only
  if (user.role === 'student' || user.role === 'parent') {
    return {
      canViewSubjectGradebook: false,
      canEditSubjectScore: false,
      canSubmitSubjectScore: false,
      canUnlockSubjectScore: false,
      canViewClassBroadsheet: false,
      canEditFormTeacherRemarks: false,
      canEditAffectiveAndPsychomotor: false,
      canApproveAndPublishClassRecords: false,
      canGenerateReportCard: true, // View own individual report card only
      activePolicyRule: 'RLS_STUDENT_PARENT_RESTRICTED_READ',
      policyDescription: 'Student / Guardian Privacy Scope: Strictly read-only access limited to own published term report card and verified continuous assessment transcripts.',
      enforcedRestrictions: [
        'Direct gradebook write access strictly denied (RLS Violation: 403 Forbidden).',
        'Master broadsheet and peers\' personal scores are protected by privacy isolation.'
      ]
    };
  }

  // Fallback default restriction
  return {
    canViewSubjectGradebook: false,
    canEditSubjectScore: false,
    canSubmitSubjectScore: false,
    canUnlockSubjectScore: false,
    canViewClassBroadsheet: false,
    canEditFormTeacherRemarks: false,
    canEditAffectiveAndPsychomotor: false,
    canApproveAndPublishClassRecords: false,
    canGenerateReportCard: false,
    activePolicyRule: 'RLS_SUBJECT_TEACHER_ISOLATION',
    policyDescription: 'Unassigned Staff Member: Read/Write access denied for this class and subject under default isolation policy.',
    enforcedRestrictions: ['Access denied. You are not the assigned subject teacher or form master for this class group.']
  };
}

// -------------------------------------------------------------
// SUBJECTS DIRECTORY BY CLASS STREAM
// -------------------------------------------------------------
export const SS2_SCIENCE_SUBJECTS = [
  { id: 'General Mathematics', name: 'General Mathematics', teacherId: 'tch-001', teacherName: 'Mr. Olawale Adeleke', maxScore: 100 },
  { id: 'English Language', name: 'English Language', teacherId: 'tch-003', teacherName: 'Mrs. Ngozi Okonkwo', maxScore: 100 },
  { id: 'Physics', name: 'Physics', teacherId: 'tch-004', teacherName: 'Mr. David Sanusi', maxScore: 100 },
  { id: 'Chemistry', name: 'Chemistry', teacherId: 'tch-002', teacherName: 'Dr. Amina Bello', maxScore: 100 },
  { id: 'Biology', name: 'Biology', teacherId: 'tch-005', teacherName: 'Mr. Emeka Eze', maxScore: 100 },
  { id: 'Further Mathematics', name: 'Further Mathematics', teacherId: 'tch-001', teacherName: 'Mr. Olawale Adeleke', maxScore: 100 },
  { id: 'Computer Studies / ICT', name: 'Data Processing / ICT', teacherId: 'tch-008', teacherName: 'Mrs. Chioma Danjuma', maxScore: 100 },
  { id: 'Civic Education', name: 'Civic Education', teacherId: 'tch-007', teacherName: 'Mallam Ibrahim Yakubu', maxScore: 100 }
];

export const JSS2_ALPHA_SUBJECTS = [
  { id: 'General Mathematics', name: 'Mathematics', teacherId: 'tch-001', teacherName: 'Mr. Olawale Adeleke', maxScore: 100 },
  { id: 'English Studies', name: 'English Studies', teacherId: 'tch-003', teacherName: 'Mrs. Ngozi Okonkwo', maxScore: 100 },
  { id: 'Basic Science', name: 'Basic Science', teacherId: 'tch-002', teacherName: 'Dr. Amina Bello', maxScore: 100 },
  { id: 'Basic Technology', name: 'Basic Technology', teacherId: 'tch-009', teacherName: 'Mr. Babatunde Alabi', maxScore: 100 },
  { id: 'Computer Studies / ICT', name: 'Computer Studies', teacherId: 'tch-008', teacherName: 'Mrs. Chioma Danjuma', maxScore: 100 },
  { id: 'Social Studies', name: 'Social Studies', teacherId: 'tch-007', teacherName: 'Mallam Ibrahim Yakubu', maxScore: 100 },
  { id: 'Agricultural Science', name: 'Agricultural Science', teacherId: 'tch-005', teacherName: 'Mr. Emeka Eze', maxScore: 100 }
];

// Helper to seed realistic subject scores
function generateInitialSubjectScores(): StudentSubjectScore[] {
  const scores: StudentSubjectScore[] = [];

  // 1. SS 2 Science A Students
  const ss2ScienceStudents = INITIAL_STUDENTS.filter(s => s.classGroupId === 'grp-ss2-scia');
  
  ss2ScienceStudents.forEach((student, sIdx) => {
    SS2_SCIENCE_SUBJECTS.forEach((subject, subIdx) => {
      // Create distinct, realistic score variance
      const seed = (sIdx * 17 + subIdx * 23) % 40;
      let ca1 = Math.min(15, Math.max(9, 12 + ((seed % 7) - 3)));
      let ca2 = Math.min(15, Math.max(8, 13 + (((seed * 3) % 7) - 3)));
      let ca3 = Math.min(10, Math.max(6, 8 + ((seed % 5) - 2)));
      let exam = Math.min(60, Math.max(28, 46 + ((seed % 19) - 8)));

      // Top student boosts
      if (student.fullName.includes('Fatima Garba') || student.fullName.includes('Chinedu Eze')) {
        ca1 = Math.min(15, ca1 + 2);
        ca2 = Math.min(15, ca2 + 2);
        ca3 = 10;
        exam = Math.min(60, exam + 10);
      }

      // Student needing help
      if (student.fullName.includes('Bolanle')) {
        ca1 = Math.max(6, ca1 - 4);
        ca2 = Math.max(7, ca2 - 4);
        ca3 = Math.max(5, ca3 - 2);
        exam = Math.max(26, exam - 14);
      }

      const total = ca1 + ca2 + ca3 + exam;
      const { grade, points, remarks } = calculateGradeAndPoints(total);

      let comment = 'Good understanding of core principles. Keep up the consistency.';
      if (total >= 80) comment = 'Exceptional analytical insight and outstanding exam presentation.';
      else if (total >= 70) comment = 'Very good grasp of theoretical and practical curriculum concepts.';
      else if (total >= 60) comment = 'Satisfactory performance; can aim for higher distinction in exams.';
      else if (total < 50) comment = 'Requires targeted remedial practice in problem-solving and homework submission.';

      scores.push({
        id: `sc-ss2-${student.id}-${subject.id.replace(/\s+/g, '-').toLowerCase()}`,
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        classGroupId: 'grp-ss2-scia',
        classGroupName: 'SS 2 Science A',
        classGrade: 'SS 2',
        subjectId: subject.id,
        subjectName: subject.name,
        term: 'Term 1',
        academicSession: '2026/2027 Session',
        teacherId: subject.teacherId,
        teacherName: subject.teacherName,
        ca1Score: ca1,
        ca2Score: ca2,
        ca3Score: ca3,
        examScore: exam,
        totalScore: total,
        grade,
        gradePoints: points,
        remarks,
        teacherComment: comment,
        isLocked: false,
        isSubmitted: true,
        submittedAt: '2026-11-28T14:30:00.000Z',
        auditTrail: [
          {
            timestamp: '2026-11-28T14:30:00.000Z',
            actorId: subject.teacherId,
            actorName: subject.teacherName,
            actorRole: 'teacher',
            fieldModified: 'Initial Subject Mark Entry',
            previousValue: '0',
            newValue: String(total),
            reason: 'Term 1 End-of-Term Continuous Assessment & Exam Compilation'
          }
        ]
      });
    });
  });

  // 2. JSS 2 Alpha Students
  const jss2Students = INITIAL_STUDENTS.filter(s => s.classGroupId === 'grp-jss2-a');
  jss2Students.forEach((student, sIdx) => {
    JSS2_ALPHA_SUBJECTS.forEach((subject, subIdx) => {
      const seed = (sIdx * 13 + subIdx * 19) % 35;
      const ca1 = Math.min(15, Math.max(9, 11 + ((seed % 6) - 2)));
      const ca2 = Math.min(15, Math.max(9, 12 + (((seed * 2) % 6) - 2)));
      const ca3 = Math.min(10, Math.max(6, 8 + ((seed % 4) - 1)));
      const exam = Math.min(60, Math.max(30, 44 + ((seed % 17) - 6)));
      const total = ca1 + ca2 + ca3 + exam;
      const { grade, points, remarks } = calculateGradeAndPoints(total);

      scores.push({
        id: `sc-jss2-${student.id}-${subject.id.replace(/\s+/g, '-').toLowerCase()}`,
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        classGroupId: 'grp-jss2-a',
        classGroupName: 'JSS 2 Alpha',
        classGrade: 'JSS 2',
        subjectId: subject.id,
        subjectName: subject.name,
        term: 'Term 1',
        academicSession: '2026/2027 Session',
        teacherId: subject.teacherId,
        teacherName: subject.teacherName,
        ca1Score: ca1,
        ca2Score: ca2,
        ca3Score: ca3,
        examScore: exam,
        totalScore: total,
        grade,
        gradePoints: points,
        remarks,
        teacherComment: 'Active class participation. Solid foundational grasp.',
        isLocked: false,
        isSubmitted: true,
        submittedAt: '2026-11-29T10:15:00.000Z',
        auditTrail: [
          {
            timestamp: '2026-11-29T10:15:00.000Z',
            actorId: subject.teacherId,
            actorName: subject.teacherName,
            actorRole: 'teacher',
            fieldModified: 'Initial Subject Mark Entry',
            previousValue: '0',
            newValue: String(total),
            reason: 'JSS 2 Alpha Term 1 Compilation'
          }
        ]
      });
    });
  });

  return scores;
}

export const INITIAL_STUDENT_SUBJECT_SCORES: StudentSubjectScore[] = generateInitialSubjectScores();

// -------------------------------------------------------------
// COMPILED CLASS MASTER BROADSHEETS
// -------------------------------------------------------------
export function compileClassBroadsheet(
  classGroupId: string,
  classGroups: ClassGroup[],
  students: Student[],
  subjectScores: StudentSubjectScore[],
  term: Term = 'Term 1',
  academicSession: string = '2026/2027 Session'
): ClassAcademicRecord {
  const classGroup = classGroups.find(cg => cg.id === classGroupId) || classGroups[0];
  const enrolledStudents = students.filter(s => s.classGroupId === classGroupId);

  // Group scores by student
  const studentSummaries: StudentTermSummary[] = enrolledStudents.map(student => {
    const studentScores = subjectScores.filter(
      sc => sc.studentId === student.id && sc.term === term && sc.academicSession === academicSession
    );

    const totalMarksObtained = studentScores.reduce((sum, s) => sum + s.totalScore, 0);
    const totalMarksPossible = studentScores.length * 100;
    const termAverage = totalMarksPossible > 0 ? Number(((totalMarksObtained / totalMarksPossible) * 100).toFixed(1)) : 0;

    const distinctionsCount = studentScores.filter(s => ['A1', 'B2', 'B3'].includes(s.grade)).length;
    const creditsCount = studentScores.filter(s => ['C4', 'C5', 'C6'].includes(s.grade)).length;
    const passesCount = studentScores.filter(s => ['D7', 'E8'].includes(s.grade)).length;
    const failsCount = studentScores.filter(s => s.grade === 'F9').length;

    const totalPoints = studentScores.reduce((sum, s) => sum + s.gradePoints, 0);
    const gpa = studentScores.length > 0 ? Number(((totalPoints / (studentScores.length * 9)) * 5.0).toFixed(2)) : 0;

    let formRemarks = 'An all-round hardworking student with great promise. Keep up the high standard.';
    if (termAverage >= 80) formRemarks = 'Outstanding and brilliant academic performance! A role model in academic excellence and conduct.';
    else if (termAverage >= 70) formRemarks = 'A very commendable result. Consistent effort and disciplined focus evident across all subjects.';
    else if (termAverage >= 60) formRemarks = 'Good effort shown this term. Needs to double efforts in science calculations to reach distinction level.';
    else if (termAverage < 50) formRemarks = 'Academic performance is below expected potential. Parental intervention and extra prep clinic mandatory.';

    let prinRemarks = 'Approved. Excellent scholarly dedication.';
    if (termAverage >= 80) prinRemarks = 'Approved. Magnificent result, a true scholar of CurriculumFlow College. Keep soaring!';
    else if (termAverage >= 65) prinRemarks = 'Approved. Commendable progress. Maintain this positive learning trajectory.';
    else if (termAverage < 50) prinRemarks = 'Referred to Academic Support Clinic. Must demonstrate improvement in Term 2.';

    return {
      studentId: student.id,
      studentName: student.fullName,
      admissionNumber: student.admissionNumber,
      gender: student.gender,
      classGroupId: classGroup.id,
      classGroupName: classGroup.name,
      classGrade: classGroup.grade,
      term,
      academicSession,
      subjectScores: studentScores,
      totalMarksObtained,
      totalMarksPossible,
      termAverage,
      classPosition: 0, // Will be computed post-sort
      totalStudentsInClass: enrolledStudents.length,
      totalSubjectsOffered: studentScores.length,
      distinctionsCount,
      creditsCount,
      passesCount,
      failsCount,
      gpa,
      affectiveDomain: {
        punctuality: student.termAttendanceRate >= 95 ? 5 : 4,
        neatness: 5,
        politeness: 5,
        honesty: 5,
        leadership: student.fullName.includes('Garba') || student.fullName.includes('Eze') ? 5 : 4,
        relationshipWithPeers: 4,
        attentiveness: termAverage >= 70 ? 5 : 4,
        emotionalStability: 5
      },
      psychomotorSkills: {
        handwriting: 4,
        verbalFluency: 5,
        sportsAndGames: 4,
        handlingToolsAndLab: termAverage >= 75 ? 5 : 4,
        drawingAndCrafts: 4,
        musicalAndDramaticSkill: 3
      },
      formTeacherRemarks: formRemarks,
      formTeacherSignatureDate: '2026-12-05',
      principalRemarks: prinRemarks,
      principalSignatureDate: '2026-12-08',
      totalSchoolDays: 68,
      daysPresent: student.totalDaysPresent || 66,
      daysAbsent: student.totalDaysAbsent || 2,
      daysLate: student.totalDaysLate || 1,
      promotionStatus: 'Proceeding to Next Term',
      nextTermResumptionDate: '2027-01-11'
    };
  });

  // Rank students by termAverage descending
  studentSummaries.sort((a, b) => b.termAverage - a.termAverage);
  studentSummaries.forEach((s, idx) => {
    s.classPosition = idx + 1;
  });

  // Distinct subjects in broadsheet
  const subjectMap = new Map<string, string>();
  subjectScores
    .filter(sc => sc.classGroupId === classGroupId)
    .forEach(sc => subjectMap.set(sc.subjectId, sc.subjectName));

  const totalClassMarks = studentSummaries.reduce((sum, s) => sum + s.termAverage, 0);
  const classAveragePercentage = studentSummaries.length > 0 ? Number((totalClassMarks / studentSummaries.length).toFixed(1)) : 0;
  const highestAveragePercentage = studentSummaries.length > 0 ? studentSummaries[0].termAverage : 0;
  const lowestAveragePercentage = studentSummaries.length > 0 ? studentSummaries[studentSummaries.length - 1].termAverage : 0;
  const passedStudents = studentSummaries.filter(s => s.termAverage >= 50).length;
  const passRatePercentage = studentSummaries.length > 0 ? Math.round((passedStudents / studentSummaries.length) * 100) : 0;

  return {
    id: `rec-${classGroupId}-${term.toLowerCase().replace(/\s+/g, '')}-2026`,
    classGroupId: classGroup.id,
    classGroupName: classGroup.name,
    classGrade: classGroup.grade,
    term,
    academicSession,
    formTeacherId: classGroup.formTeacherId,
    formTeacherName: classGroup.formTeacherName,
    subjectIds: Array.from(subjectMap.keys()),
    subjectNames: Array.from(subjectMap.values()),
    studentSummaries,
    classAveragePercentage,
    highestAveragePercentage,
    lowestAveragePercentage,
    passRatePercentage,
    status: 'approved_by_principal',
    isLocked: false,
    lastUpdated: '2026-12-08T16:00:00.000Z',
    publishedAt: '2026-12-09T08:00:00.000Z',
    endorsedByPrincipal: true
  };
}

export const INITIAL_CLASS_ACADEMIC_RECORDS: ClassAcademicRecord[] = [
  compileClassBroadsheet('grp-ss2-scia', INITIAL_CLASS_GROUPS, INITIAL_STUDENTS, INITIAL_STUDENT_SUBJECT_SCORES),
  compileClassBroadsheet('grp-jss2-a', INITIAL_CLASS_GROUPS, INITIAL_STUDENTS, INITIAL_STUDENT_SUBJECT_SCORES)
];

// -------------------------------------------------------------
// SUBJECT-LEVEL LONGITUDINAL PERFORMANCE TRENDS (TERMS 1, 2, 3)
// -------------------------------------------------------------
export interface SubjectPerformanceTrend {
  id: string;
  name: string;
  code: string;
  department: 'Sciences' | 'Arts & Humanities' | 'Commercial' | 'Junior Secondary';
  departmentColor: string;
  leadTeacherName: string;
  term1Avg: number;
  term2Avg: number;
  term3Avg: number;
  priorYearBaselineAvg: number;
  highestScore: number;
  lowestScore: number;
  creditPassRateTerm1: number;
  creditPassRateTerm2: number;
  creditPassRateTerm3: number;
  distinctionRateTerm3: number;
  enrolledStudentsCount: number;
  status: 'improving' | 'stable' | 'needs_intervention';
  keyTopicGain: string;
  remedialInterventionNote: string;
  historicalMilestones: { term: string; average: number; passRate: number }[];
}

export const SUBJECT_PERFORMANCE_TRENDS: SubjectPerformanceTrend[] = [
  {
    id: 'subj-math',
    name: 'General Mathematics',
    code: 'MTH-201',
    department: 'Sciences',
    departmentColor: '#10b981',
    leadTeacherName: 'Mr. Babatunde Lawal',
    term1Avg: 68.4,
    term2Avg: 71.2,
    term3Avg: 75.6,
    priorYearBaselineAvg: 65.0,
    highestScore: 94,
    lowestScore: 48,
    creditPassRateTerm1: 82,
    creditPassRateTerm2: 88,
    creditPassRateTerm3: 94,
    distinctionRateTerm3: 42,
    enrolledStudentsCount: 68,
    status: 'improving',
    keyTopicGain: '+7.2% gain in Trigonometry and Circle Theorems after targeted tutorial cycles',
    remedialInterventionNote: 'Daily warm-up drill sheets scheduled for quadratic equations cohort',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 65.0, passRate: 78 },
      { term: 'Term 1 (Mich)', average: 68.4, passRate: 82 },
      { term: 'Term 2 (Lent)', average: 71.2, passRate: 88 },
      { term: 'Term 3 (Trin)', average: 75.6, passRate: 94 }
    ]
  },
  {
    id: 'subj-phy',
    name: 'Physics',
    code: 'PHY-201',
    department: 'Sciences',
    departmentColor: '#06b6d4',
    leadTeacherName: 'Dr. Adeleke Ogunleye',
    term1Avg: 66.0,
    term2Avg: 69.8,
    term3Avg: 76.2,
    priorYearBaselineAvg: 64.1,
    highestScore: 96,
    lowestScore: 45,
    creditPassRateTerm1: 79,
    creditPassRateTerm2: 86,
    creditPassRateTerm3: 92,
    distinctionRateTerm3: 46,
    enrolledStudentsCount: 38,
    status: 'improving',
    keyTopicGain: '+10.2% jump in Optics and Electromagnetic Induction following laboratory intensification',
    remedialInterventionNote: 'Hands-on practical apparatus workshops every Thursday afternoon',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 64.1, passRate: 76 },
      { term: 'Term 1 (Mich)', average: 66.0, passRate: 79 },
      { term: 'Term 2 (Lent)', average: 69.8, passRate: 86 },
      { term: 'Term 3 (Trin)', average: 76.2, passRate: 92 }
    ]
  },
  {
    id: 'subj-chem',
    name: 'Chemistry',
    code: 'CHM-201',
    department: 'Sciences',
    departmentColor: '#3b82f6',
    leadTeacherName: 'Mrs. Chioma Okafor',
    term1Avg: 64.5,
    term2Avg: 68.2,
    term3Avg: 73.4,
    priorYearBaselineAvg: 63.5,
    highestScore: 91,
    lowestScore: 42,
    creditPassRateTerm1: 76,
    creditPassRateTerm2: 84,
    creditPassRateTerm3: 90,
    distinctionRateTerm3: 38,
    enrolledStudentsCount: 38,
    status: 'improving',
    keyTopicGain: '+8.9% improvement in Stoichiometry, Volumetric Analysis, and Redox Reactions',
    remedialInterventionNote: 'Micro-lab titration assignments dispatched via LMS portal',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 63.5, passRate: 74 },
      { term: 'Term 1 (Mich)', average: 64.5, passRate: 76 },
      { term: 'Term 2 (Lent)', average: 68.2, passRate: 84 },
      { term: 'Term 3 (Trin)', average: 73.4, passRate: 90 }
    ]
  },
  {
    id: 'subj-bio',
    name: 'Biology',
    code: 'BIO-201',
    department: 'Sciences',
    departmentColor: '#14b8a6',
    leadTeacherName: 'Mrs. Chioma Okafor',
    term1Avg: 72.0,
    term2Avg: 74.5,
    term3Avg: 79.1,
    priorYearBaselineAvg: 70.0,
    highestScore: 95,
    lowestScore: 52,
    creditPassRateTerm1: 88,
    creditPassRateTerm2: 92,
    creditPassRateTerm3: 97,
    distinctionRateTerm3: 50,
    enrolledStudentsCount: 38,
    status: 'improving',
    keyTopicGain: '+7.1% surge in Genetics, Mendelian Inheritance, and Ecology field surveys',
    remedialInterventionNote: 'Botanical specimen drawing workshops conducted for SS2 science group',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 70.0, passRate: 85 },
      { term: 'Term 1 (Mich)', average: 72.0, passRate: 88 },
      { term: 'Term 2 (Lent)', average: 74.5, passRate: 92 },
      { term: 'Term 3 (Trin)', average: 79.1, passRate: 97 }
    ]
  },
  {
    id: 'subj-fmth',
    name: 'Further Mathematics',
    code: 'FMT-201',
    department: 'Sciences',
    departmentColor: '#8b5cf6',
    leadTeacherName: 'Mr. Babatunde Lawal',
    term1Avg: 62.1,
    term2Avg: 66.5,
    term3Avg: 71.0,
    priorYearBaselineAvg: 59.2,
    highestScore: 89,
    lowestScore: 40,
    creditPassRateTerm1: 72,
    creditPassRateTerm2: 80,
    creditPassRateTerm3: 88,
    distinctionRateTerm3: 32,
    enrolledStudentsCount: 22,
    status: 'improving',
    keyTopicGain: '+8.9% growth in Vectors and 3D Mechanics with peer coaching squads',
    remedialInterventionNote: 'Advanced calculus enrichment clinic conducted bi-weekly',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 59.2, passRate: 68 },
      { term: 'Term 1 (Mich)', average: 62.1, passRate: 72 },
      { term: 'Term 2 (Lent)', average: 66.5, passRate: 80 },
      { term: 'Term 3 (Trin)', average: 71.0, passRate: 88 }
    ]
  },
  {
    id: 'subj-eng',
    name: 'English Language',
    code: 'ENG-201',
    department: 'Arts & Humanities',
    departmentColor: '#f59e0b',
    leadTeacherName: 'Mrs. Ngozi Okonkwo',
    term1Avg: 71.5,
    term2Avg: 73.8,
    term3Avg: 78.4,
    priorYearBaselineAvg: 69.0,
    highestScore: 92,
    lowestScore: 50,
    creditPassRateTerm1: 86,
    creditPassRateTerm2: 90,
    creditPassRateTerm3: 96,
    distinctionRateTerm3: 45,
    enrolledStudentsCount: 75,
    status: 'improving',
    keyTopicGain: '+6.9% advance in Lexis & Structure and Argumentative Essay Mechanics',
    remedialInterventionNote: 'Weekly creative essay critique circles with rubric checklists',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 69.0, passRate: 84 },
      { term: 'Term 1 (Mich)', average: 71.5, passRate: 86 },
      { term: 'Term 2 (Lent)', average: 73.8, passRate: 90 },
      { term: 'Term 3 (Trin)', average: 78.4, passRate: 96 }
    ]
  },
  {
    id: 'subj-lit',
    name: 'Literature in English',
    code: 'LIT-201',
    department: 'Arts & Humanities',
    departmentColor: '#ec4899',
    leadTeacherName: 'Mrs. Ngozi Okonkwo',
    term1Avg: 65.0,
    term2Avg: 68.4,
    term3Avg: 74.2,
    priorYearBaselineAvg: 63.2,
    highestScore: 90,
    lowestScore: 46,
    creditPassRateTerm1: 78,
    creditPassRateTerm2: 84,
    creditPassRateTerm3: 91,
    distinctionRateTerm3: 36,
    enrolledStudentsCount: 30,
    status: 'improving',
    keyTopicGain: '+9.2% increase in Shakespearean Drama and African Prose character analysis',
    remedialInterventionNote: 'Reader theater sessions and dramatized poetic recitals',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 63.2, passRate: 75 },
      { term: 'Term 1 (Mich)', average: 65.0, passRate: 78 },
      { term: 'Term 2 (Lent)', average: 68.4, passRate: 84 },
      { term: 'Term 3 (Trin)', average: 74.2, passRate: 91 }
    ]
  },
  {
    id: 'subj-gov',
    name: 'Government & Civic Studies',
    code: 'GOV-201',
    department: 'Arts & Humanities',
    departmentColor: '#a855f7',
    leadTeacherName: 'Mr. Olumide Johnson',
    term1Avg: 69.2,
    term2Avg: 72.0,
    term3Avg: 76.5,
    priorYearBaselineAvg: 67.5,
    highestScore: 93,
    lowestScore: 50,
    creditPassRateTerm1: 84,
    creditPassRateTerm2: 89,
    creditPassRateTerm3: 94,
    distinctionRateTerm3: 40,
    enrolledStudentsCount: 32,
    status: 'improving',
    keyTopicGain: '+7.3% comprehension in Constitutional Development and Foreign Policy treaties',
    remedialInterventionNote: 'Mock parliamentary debates on separation of powers',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 67.5, passRate: 81 },
      { term: 'Term 1 (Mich)', average: 69.2, passRate: 84 },
      { term: 'Term 2 (Lent)', average: 72.0, passRate: 89 },
      { term: 'Term 3 (Trin)', average: 76.5, passRate: 94 }
    ]
  },
  {
    id: 'subj-acc',
    name: 'Financial Accounting',
    code: 'ACC-201',
    department: 'Commercial',
    departmentColor: '#f97316',
    leadTeacherName: 'Mrs. Aisha Bello',
    term1Avg: 63.8,
    term2Avg: 67.4,
    term3Avg: 72.5,
    priorYearBaselineAvg: 61.5,
    highestScore: 88,
    lowestScore: 44,
    creditPassRateTerm1: 75,
    creditPassRateTerm2: 82,
    creditPassRateTerm3: 89,
    distinctionRateTerm3: 34,
    enrolledStudentsCount: 26,
    status: 'improving',
    keyTopicGain: '+8.7% rise in Balance Sheets and Depreciation Adjustments',
    remedialInterventionNote: 'Double-entry bookkeeping practice sheets provided for commercial stream',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 61.5, passRate: 72 },
      { term: 'Term 1 (Mich)', average: 63.8, passRate: 75 },
      { term: 'Term 2 (Lent)', average: 67.4, passRate: 82 },
      { term: 'Term 3 (Trin)', average: 72.5, passRate: 89 }
    ]
  },
  {
    id: 'subj-econ',
    name: 'Economics',
    code: 'ECN-201',
    department: 'Commercial',
    departmentColor: '#eab308',
    leadTeacherName: 'Mr. Olumide Johnson',
    term1Avg: 65.4,
    term2Avg: 69.1,
    term3Avg: 74.8,
    priorYearBaselineAvg: 64.0,
    highestScore: 92,
    lowestScore: 48,
    creditPassRateTerm1: 80,
    creditPassRateTerm2: 86,
    creditPassRateTerm3: 93,
    distinctionRateTerm3: 39,
    enrolledStudentsCount: 45,
    status: 'improving',
    keyTopicGain: '+9.4% mastery in Price Elasticity and National Income Accounting curves',
    remedialInterventionNote: 'Graphical interpretation exercises on supply and demand curves',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 64.0, passRate: 78 },
      { term: 'Term 1 (Mich)', average: 65.4, passRate: 80 },
      { term: 'Term 2 (Lent)', average: 69.1, passRate: 86 },
      { term: 'Term 3 (Trin)', average: 74.8, passRate: 93 }
    ]
  },
  {
    id: 'subj-jbasic-sci',
    name: 'Basic Science & Technology',
    code: 'BST-102',
    department: 'Junior Secondary',
    departmentColor: '#0ea5e9',
    leadTeacherName: 'Dr. Adeleke Ogunleye',
    term1Avg: 70.2,
    term2Avg: 73.5,
    term3Avg: 77.4,
    priorYearBaselineAvg: 68.5,
    highestScore: 94,
    lowestScore: 46,
    creditPassRateTerm1: 85,
    creditPassRateTerm2: 90,
    creditPassRateTerm3: 95,
    distinctionRateTerm3: 44,
    enrolledStudentsCount: 42,
    status: 'improving',
    keyTopicGain: '+7.2% improvement in Energy Conversions, Living Things, and Simple Mechanisms',
    remedialInterventionNote: 'Junior STEM club demonstration sessions on Fridays',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 68.5, passRate: 82 },
      { term: 'Term 1 (Mich)', average: 70.2, passRate: 85 },
      { term: 'Term 2 (Lent)', average: 73.5, passRate: 90 },
      { term: 'Term 3 (Trin)', average: 77.4, passRate: 95 }
    ]
  },
  {
    id: 'subj-jmath',
    name: 'Junior Basic Mathematics',
    code: 'MTH-102',
    department: 'Junior Secondary',
    departmentColor: '#10b981',
    leadTeacherName: 'Mr. Babatunde Lawal',
    term1Avg: 66.0,
    term2Avg: 69.4,
    term3Avg: 74.0,
    priorYearBaselineAvg: 63.0,
    highestScore: 91,
    lowestScore: 42,
    creditPassRateTerm1: 78,
    creditPassRateTerm2: 85,
    creditPassRateTerm3: 92,
    distinctionRateTerm3: 38,
    enrolledStudentsCount: 42,
    status: 'improving',
    keyTopicGain: '+8.0% progress in Linear Equations and Plane Geometry constructions',
    remedialInterventionNote: 'Remedial math laboratory clinic with geometry tools',
    historicalMilestones: [
      { term: '24/25 Baseline', average: 63.0, passRate: 74 },
      { term: 'Term 1 (Mich)', average: 66.0, passRate: 78 },
      { term: 'Term 2 (Lent)', average: 69.4, passRate: 85 },
      { term: 'Term 3 (Trin)', average: 74.0, passRate: 92 }
    ]
  }
];
