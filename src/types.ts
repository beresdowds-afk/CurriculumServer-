export type EducationLevel = 'jss' | 'sss' | 'all';

export type SubjectField = 
  | 'core'
  | 'science_math'
  | 'humanities'
  | 'business'
  | 'technology'
  | 'trade_entrepreneurship'
  | 'vocational';

export type ClassGrade = 
  | 'JSS 1' 
  | 'JSS 2' 
  | 'JSS 3' 
  | 'SS 1' 
  | 'SS 2' 
  | 'SS 3';

export type Term = 'Term 1' | 'Term 2' | 'Term 3';

export type UserRole = 
  | 'principal' 
  | 'principal_admin'
  | 'vice_principal_academic'
  | 'vice_principal_admin'
  | 'academic_coordinator' 
  | 'admin_assistant'
  | 'administrative_assistant'
  | 'hod' 
  | 'hod_sciences'
  | 'hod_arts'
  | 'teacher' 
  | 'subject_teacher'
  | 'exam_officer' 
  | 'bursar_finance'
  | 'dean_student_affairs'
  | 'ict_system_admin'
  | 'student' 
  | 'parent'
  | 'super_admin';

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  avatar: string;
  assignedSubjects?: string[];
  assignedClasses?: ClassGrade[];
  department?: string;
  officeTitle?: string;
  email?: string;
  alternativeAccessEmail?: string;
  alternativeEmail?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isGoogleLinked?: boolean;
  mfaEnabled?: boolean;
  adminRoles?: string[];
  assignedAdminRoles?: string[];
  isSystemRoot?: boolean;
}

// -----------------------------------------------------------------
// CURRICULUM SOURCE OF TRUTH
// -----------------------------------------------------------------
export interface PerformanceObjective {
  id: string;
  description: string;
  bloomLevel?: 'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation';
}

export interface CurriculumTopic {
  id: string;
  title: string;
  week: number;
  term: Term;
  classGrade: ClassGrade;
  subTopics: string[];
  performanceObjectives: string[];
  contentDetails: string[];
  teacherActivities: string[];
  studentActivities: string[];
  teachingMaterials: string[];
  evaluationGuide: string[];
  practicalWorkshopNotes?: string;
  competencyDomain?: string;
  examRelevance?: {
    bece?: boolean;
    waec?: boolean;
    neco?: boolean;
    jamb?: boolean;
    commonExamAreas?: string[];
  };
}

export interface CurriculumTheme {
  id: string;
  themeNumber: number;
  title: string;
  description: string;
  topics: CurriculumTopic[];
}

export interface SubjectCurriculum {
  id: string;
  name: string;
  code: string;
  level: 'jss' | 'sss';
  field: SubjectField;
  description: string;
  isCompulsory: boolean;
  recommendedPeriodsPerWeek: number;
  targetGrades: ClassGrade[];
  officialSourceUrl: string;
  generalObjectives: string[];
  themes: CurriculumTheme[];
  recommendedTextbooks?: string[];
  equipmentAndLabRequirements?: string[];
}

// -----------------------------------------------------------------
// NERDC CURRICULUM DATABASE & ANNUAL UPDATE WORKER
// -----------------------------------------------------------------
export type NerdcWorkerStatus = 'idle' | 'running' | 'completed' | 'failed' | 'scheduled';

export type NerdcSyncStage = 
  | 'idle' 
  | 'portal_handshake' 
  | 'gazette_ingestion' 
  | 'exam_matrix_validation' 
  | 'checksum_verification' 
  | 'db_persistence' 
  | 'tenant_notification_dispatch';

export interface NerdcWorkerLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DIFF';
  message: string;
  stage?: NerdcSyncStage;
  details?: any;
}

export type CurriculumChangeCategory = 
  | 'ADDED_TOPIC'
  | 'MODIFIED_OBJECTIVES'
  | 'EXAM_REALIGNMENT'
  | 'NEW_INSTRUCTIONAL_AIDS'
  | 'PRACTICAL_GUIDELINES'
  | 'EVALUATION_CRITERIA_UPDATE'
  | 'SYLLABUS_EXPANSION'
  | 'VERIFIED_BASELINE';

export interface CurriculumGranularChange {
  id: string;
  topicTitle: string;
  grade: ClassGrade;
  term: Term;
  category: CurriculumChangeCategory;
  summary: string;
  previousContent?: string;
  updatedContent?: string;
  pedagogicalRationale?: string;
  waecExamImpact?: string;
}

export interface NerdcCurriculumDiff {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  level: 'jss' | 'sss';
  field: SubjectField;
  changeType: 'added' | 'updated' | 'verified' | 'realigned';
  details: string;
  changedFields: string[];
  previousVersionTag?: string;
  updatedVersionTag?: string;
  timestamp?: string;
  affectedGrades?: ClassGrade[];
  affectedThemesCount?: number;
  addedTopicsCount?: number;
  modifiedTopicsCount?: number;
  granularChanges?: CurriculumGranularChange[];
  gazetteNoticeReference?: string;
  checksum?: string;
}

export interface NerdcAnnualWorkerConfig {
  isEnabled: boolean;
  cronSchedule: string; // e.g. "0 2 1 8 *" (August 1st, 02:00 AM UTC)
  annualRunMonth: number; // 8 = August
  annualRunDay: number; // 1 = 1st of month
  autoApplyToTenants: boolean;
  notifyEmails: string[];
  notifyPrincipals: boolean;
  notifyAcademicCoordinators: boolean;
  lastRunTimestamp: string;
  nextRunTimestamp: string;
  currentRevisionTag: string; // e.g. "NERDC-GAZETTE-2026.1-AUGUST"
  portalSourceUrl: string;
  backupBeforeUpdate: boolean;
}

export interface NerdcAnnualSyncReport {
  executionId: string;
  timestamp: string;
  durationMs: number;
  status: 'success' | 'failed';
  subjectsProcessed: number;
  themesProcessed: number;
  topicsProcessed: number;
  checksum: string;
  diffs: NerdcCurriculumDiff[];
  logs: NerdcWorkerLog[];
}

// -----------------------------------------------------------------
// LESSON PLANNING & APPROVAL CHAIN
// -----------------------------------------------------------------
export type LessonApprovalStatus = 
  | 'draft' 
  | 'pending_coordinator_review' 
  | 'pending_principal_approval' 
  | 'approved' 
  | 'rejected' 
  | 'distributed';

export interface LessonPlanStep {
  stepNumber: number;
  title: string;
  durationMinutes: number;
  teacherActivity: string;
  studentActivity: string;
  learningPoint: string;
}

export interface StandardLessonNote {
  id: string;
  subjectId: string;
  subjectName: string;
  classGrade: ClassGrade;
  term: Term;
  week: number;
  lessonNumber: number;
  topicTitle: string;
  subTopic: string;
  durationMinutes: number;
  averageAge: string;
  previousKnowledge: string;
  learningObjectives: string[];
  instructionalMaterials: string[];
  referenceBooks: string[];
  introduction: {
    duration: string;
    activity: string;
  };
  presentationSteps: LessonPlanStep[];
  guidedPractice?: string;
  independentPractice?: string;
  evaluationQuestions: string[];
  summaryAndConclusion: string;
  homework: string[];
  teacherRemarks?: string;
  
  // Approval Pipeline
  status: LessonApprovalStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  version: number;
}

export interface LessonPlanResponse {
  subject: string;
  classGrade: string;
  term: string;
  duration: string;
  averageAge: string;
  topic: string;
  subTopic: string;
  behavioralObjectives: string[];
  previousKnowledge: string;
  instructionalMaterials: string[];
  referenceBooks?: string[];
  introduction: {
    duration: string;
    activity: string;
  };
  presentationSteps: LessonPlanStep[];
  evaluationQuestions: string[];
  summaryAndConclusion: string;
  assignment: string[];
  teacherRemarks?: string;
}

export interface SchemeOfWorkItem {
  weekNumber: number;
  topic: string;
  subTopics: string[];
  learningObjectives: string[];
  teacherActivities: string[];
  studentActivities: string[];
  teachingAids: string[];
  evaluationGuide: string[];
  remarks?: string;
}

// -----------------------------------------------------------------
// TEACHER DELIVERY TRACKING & DIGITAL TEACHING RECORD
// -----------------------------------------------------------------
export type DeliveryStatus = 
  | 'assigned' 
  | 'received' 
  | 'opened' 
  | 'acknowledged' 
  | 'taught' 
  | 'completed';

export type StudentUnderstanding = 'excellent' | 'good' | 'fair' | 'poor';

export interface TeacherFeedback {
  understandingLevel: StudentUnderstanding;
  engagementRating: number; // 1 to 5
  comments: string;
  uncoveredObjectives?: string[];
  suggestedRemedialTopic?: string;
  requestAdditionalLesson: boolean;
  requestCurriculumModification: boolean;
  submittedAt: string;
}

export interface AssignedLessonDelivery {
  id: string;
  lessonNoteId: string;
  subjectName: string;
  classGrade: ClassGrade;
  classSection: string; // e.g., 'JSS 2A', 'SS 2 Science'
  teacherId: string;
  teacherName: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number;
  scheduledTime: string;
  topicTitle: string;
  subTopic: string;
  week: number;
  status: DeliveryStatus;
  assignedAt: string;
  acknowledgedAt?: string;
  taughtAt?: string;
  completedAt?: string;
  feedback?: TeacherFeedback;
  isDelayed?: boolean;
  adaptiveRemedialTriggered?: boolean;
}

// -----------------------------------------------------------------
// ADAPTIVE LESSON & REMEDIAL PROGRESSION
// -----------------------------------------------------------------
export interface AdaptiveRemedialUnit {
  id: string;
  originalLessonId: string;
  subjectName: string;
  classGrade: ClassGrade;
  topicTitle: string;
  weaknessIdentified: string;
  masteryScore: number;
  remedialObjectives: string[];
  remedialStrategies: string[];
  simplifiedExplanation: string;
  scaffoldedPracticeExercises: {
    level: 'Basic' | 'Intermediate' | 'Mastery';
    prompt: string;
    guidanceHint: string;
  }[];
  reassessmentQuestions: string[];
  status: 'recommended' | 'scheduled' | 'delivered' | 'mastery_achieved';
  createdAt: string;
}

// -----------------------------------------------------------------
// QUESTION BANK & VARIABLE QUESTION ENGINE
// -----------------------------------------------------------------
export type QuestionCognitiveLevel = 
  | 'Remembering' 
  | 'Understanding' 
  | 'Applying' 
  | 'Analyzing' 
  | 'Evaluating' 
  | 'Creating';

export type BloomsTaxonomyLevel = QuestionCognitiveLevel;

export type QuestionType = 'multiple_choice' | 'short_answer' | 'structured_theory' | 'problem_solving';

export interface QuestionBankItem {
  id: string;
  subject: string;
  subjectName?: string;
  classGrade: ClassGrade;
  term: Term;
  topic: string;
  topicTitle?: string;
  subtopic: string;
  curriculumObjective: string;
  learningObjective?: string;
  questionType: QuestionType;
  type?: QuestionType;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cognitiveLevel: QuestionCognitiveLevel;
  bloomsLevel?: QuestionCognitiveLevel;
  questionText: string;
  prompt?: string;
  options?: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  expectedAnswer: string;
  correctAnswer?: string;
  stepByStepSolution?: string;
  solution?: string;
  markAllocation: number;
  marks?: number;
  source: 'WAEC' | 'NECO' | 'BECE' | 'JAMB' | 'School Question Bank';
  version: number;
  usageCount: number;
  isVariableTemplate?: boolean;
  variableFormula?: string;
}

export interface VariableQuestionVariant {
  variantId: string;
  templateId?: string;
  questionText: string;
  options?: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: string;
  stepByStepSolution: string;
  variablesUsed: Record<string, string | number>;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  alignedObjective: string;
}

// -----------------------------------------------------------------
// SECURE EXAMINATION & SEPARATE MARKING SCHEME
// -----------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'generated' | 'viewed' | 'downloaded' | 'authorized' | 'locked' | 'regenerated' | 'marking_scheme_unlocked';
  ipAddress?: string;
  notes?: string;
}

export interface ExamQuestionItem {
  questionNumber: number;
  section: 'Section A (Objective/MCQ)' | 'Section B (Theory & Structured)' | 'Section C (Practical)';
  questionType: QuestionType;
  questionText: string;
  options?: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  marks: number;
  topic: string;
  cognitiveLevel: QuestionCognitiveLevel;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  modelAnswer?: string;
  markingGuide?: string;
  correctAnswer?: string;
}

export type ExamQuestion = ExamQuestionItem;

export interface MarkingSchemeItem {
  questionNumber: number;
  section: string;
  correctAnswer: string;
  modelAnswer: string;
  totalMarks: number;
  stepBreakdown: {
    stepDescription: string;
    marksAwarded: number;
  }[];
  partialCreditRules: string;
  examinerNotes?: string;
}

export interface SecureExaminationPaper {
  id: string;
  examId: string;
  generationHash: string;
  subjectName: string;
  classGrade: ClassGrade;
  term?: Term;
  academicSession?: string;
  academicYear?: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  instructions?: string[];
  generalInstructions?: string[];
  sections?: {
    sectionName: string;
    instructions: string;
    marks: number;
    questions: ExamQuestionItem[];
  }[];
  sectionA?: any;
  sectionB?: any;
  
  // Institutional Branding & Governance
  schoolName?: string;
  schoolAddress?: string;
  schoolMotto?: string;
  schoolLogoUrl?: string;
  schoolLogoBase64?: string;
  schoolLogoType?: 'crest' | 'shield' | 'custom' | 'academic';
  centerNumber?: string;
  principalName?: string;
  subjectTeacherName?: string;
  
  // Security Subsystem
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  releaseDate?: string;
  isReleasedForPrinting?: boolean;
  authorizedByPrincipal?: boolean;
  isAuthorizedByPrincipal?: boolean;
  authorizedBy?: string;
  auditTrail?: AuditLogEntry[];
  securityAuditLog?: {
    action: string;
    performedBy: string;
    timestamp: string;
    ipHash?: string;
  }[];
  createdAt?: string;
  
  // Linked Marking Scheme Reference (Kept Separate)
  markingSchemeId: string;
  markingSchemeUnlocked: boolean;
}

export interface SecureMarkingScheme {
  id: string;
  examId: string;
  generationHash?: string;
  subjectName: string;
  classGrade: ClassGrade;
  term?: Term;
  title?: string;
  examTitle?: string;
  totalMarks?: number;
  generalMarkingInstructions?: string[];
  generalExaminerNotes?: string[];
  schoolName?: string;
  schoolAddress?: string;
  principalName?: string;
  subjectTeacherName?: string;
  items?: MarkingSchemeItem[];
  sectionARubric?: any[];
  sectionBRubric?: any[];
  createdAt?: string;
  isReleasedToTeachers?: boolean;
  isConfidential?: boolean;
  unlockedAt?: string;
  unlockedBy?: string;
}

// -----------------------------------------------------------------
// TAUGHT-ONLY ASSESSMENT GENERATION
// -----------------------------------------------------------------
export interface TaughtAssessmentRequest {
  subjectName: string;
  classGrade: ClassGrade;
  assessmentType: 'Class Test' | 'Weekly Quiz' | 'Take-Home Assignment' | 'Mid-Term Test';
  completedTopics: {
    topicId: string;
    topicTitle: string;
    completionPercentage: number;
    completedObjectives: string[];
  }[];
  totalQuestions: number;
  questionType: 'multiple_choice' | 'theory' | 'mixed';
}

export interface TaughtAssessmentResponse {
  title: string;
  subjectName: string;
  classGrade: ClassGrade;
  assessmentType: string;
  totalMarks: number;
  coveredTopicsList: string[];
  guaranteeNote: string;
  questions: ExamQuestionItem[];
  markingGuide: MarkingSchemeItem[];
}

// -----------------------------------------------------------------
// CURRICULUM COVERAGE & ACADEMIC ANALYTICS
// -----------------------------------------------------------------
export interface TermCoverageMetric {
  term: Term;
  plannedLessons: number;
  deliveredLessons: number;
  coveragePercentage: number;
}

export interface SubjectCoverageBreakdown {
  subjectId: string;
  subjectName: string;
  classGrade: ClassGrade;
  teacherName: string;
  overallCoveragePercentage: number;
  terms: TermCoverageMetric[];
  currentWeek: number;
  expectedWeek: number;
  status: 'on_track' | 'slight_delay' | 'critical_delay';
  delayedTopicsCount: number;
}

export interface TeacherPerformanceMetric {
  teacherId: string;
  teacherName: string;
  department: string;
  assignedClasses: string[];
  lessonCompletionRate: number;
  curriculumCoverageRate: number;
  timelinessScore: number;
  assessmentFrequencyScore: number;
  studentMasteryAverage: number;
  remedialComplianceRate: number;
  feedbackSubmissionRate: number;
  ratingBadge: 'Master Educator' | 'Senior Teacher' | 'Compliant' | 'Needs Attention';
}

export interface StudentTopicMastery {
  topic: string;
  topicTitle?: string;
  masteryPercentage: number;
  assessmentsTaken?: number;
  status: 'mastered' | 'satisfactory' | 'needs_practice' | 'critical_gap';
  lastAssessed: string;
}

export interface StudentMasteryProfile {
  studentId: string;
  studentName: string;
  classGrade: ClassGrade;
  classSection: string;
  overallMasteryPercentage: number;
  rankInClass?: number;
  topicMasteryBreakdown: {
    topicTitle: string;
    masteryPercentage: number;
    assessmentsTaken: number;
  }[];
  identifiedWeaknesses: string[];
  recommendedInterventions: string[];
}

export interface StudentLearningProfile {
  studentId: string;
  studentName: string;
  classGrade: ClassGrade;
  classSection: string;
  parentName: string;
  parentEmail: string;
  overallAverage: number;
  subjects: {
    subjectName: string;
    averageScore: number;
    topics: StudentTopicMastery[];
    priorityWeakAreas: string[];
    recommendedPracticeUnit?: string;
  }[];
}

export interface SchoolAcademicCommandKPIs {
  overallCurriculumCoverage: number;
  lessonsDeliveredPercentage: number;
  teacherComplianceRate: number;
  studentAssessmentAverage: number;
  outstandingLessonsCount: number;
  classesRequiringAttentionCount: number;
  subjectsBehindScheduleCount: number;
  pendingPrincipalApprovalsCount: number;
  pendingExamsForLockCount: number;
}

// -----------------------------------------------------------------
// TEACHER POOL & FACULTY DIRECTORY
// -----------------------------------------------------------------
export interface Teacher {
  id: string;
  staffId: string;
  fullName: string;
  phone: string;
  email: string;
  qualification: string;
  subjects: string[];
  assignedClassGroupIds: string[];
  assignedClassGroupNames: string[];
  department: string;
  status: 'active' | 'on_leave' | 'inactive';
  maxPeriodsPerWeek: number;
  currentPeriodsCount: number;
  avatar: string;
  joinedDate: string;
  isFormTeacher?: boolean;
  formClassGroupId?: string;
  formClassGroupName?: string;
  specializationNotes?: string;
}

// -----------------------------------------------------------------
// CLASS GROUPS DATABASE
// -----------------------------------------------------------------
export interface ClassGroup {
  id: string;
  code: string;
  name: string;
  grade: ClassGrade;
  arm: string;
  stream?: 'General' | 'Science' | 'Commercial' | 'Arts' | 'Technical';
  formTeacherId: string;
  formTeacherName: string;
  roomNumber: string;
  capacity: number;
  studentCount: number;
  academicYear: string;
  term: Term;
  classRepName?: string;
  description?: string;
}

// -----------------------------------------------------------------
// GENERAL STUDENTS REGISTER / DATABASE
// -----------------------------------------------------------------
export interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  residentialAddress?: string;
  enrollmentStatus: 'active' | 'suspended' | 'graduated' | 'transferred';
  termAttendanceRate: number;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  totalDaysLate: number;
  photoUrl?: string;
  emergencyContact?: string;
  specialNeedsNotes?: string;
}

// -----------------------------------------------------------------
// SCHOOL TIMETABLE MANAGEMENT PORTAL
// -----------------------------------------------------------------
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface TimetableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number; // 1 through 8
  startTime: string;
  endTime: string;
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  roomNumber: string;
  isRemedial?: boolean;
  isLabPractical?: boolean;
}

export interface TimetablePeriodConfig {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export const TIMETABLE_PERIOD_CONFIGS: TimetablePeriodConfig[] = [
  { periodNumber: 1, label: 'Period 1', startTime: '08:00 AM', endTime: '08:45 AM' },
  { periodNumber: 2, label: 'Period 2', startTime: '08:45 AM', endTime: '09:30 AM' },
  { periodNumber: 3, label: 'Period 3', startTime: '09:30 AM', endTime: '10:15 AM' },
  { periodNumber: 0, label: 'Short Break', startTime: '10:15 AM', endTime: '10:35 AM', isBreak: true },
  { periodNumber: 4, label: 'Period 4', startTime: '10:35 AM', endTime: '11:20 AM' },
  { periodNumber: 5, label: 'Period 5', startTime: '11:20 AM', endTime: '12:05 PM' },
  { periodNumber: 6, label: 'Period 6', startTime: '12:05 PM', endTime: '12:50 PM' },
  { periodNumber: 0, label: 'Long Break / Lunch', startTime: '12:50 PM', endTime: '01:30 PM', isBreak: true },
  { periodNumber: 7, label: 'Period 7', startTime: '01:30 PM', endTime: '02:15 PM' },
  { periodNumber: 8, label: 'Period 8 (Prep/Remedial)', startTime: '02:15 PM', endTime: '03:00 PM' }
];

// -----------------------------------------------------------------
// CLASS GROUP REGISTERS & ATTENDANCE
// -----------------------------------------------------------------
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface StudentAttendanceEntry {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gender: 'Male' | 'Female';
  status: AttendanceStatus;
  remarks?: string;
  arrivalTime?: string;
}

export interface ClassAttendanceRegister {
  id: string;
  date: string; // YYYY-MM-DD
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  term: Term;
  week: number;
  session: 'Morning' | 'Afternoon' | 'Full Day';
  takenById: string;
  takenByName: string;
  takenAt: string;
  entries: StudentAttendanceEntry[];
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  attendanceRatePercentage: number;
  generalRemarks?: string;
  isSubmitted: boolean;
  biometricSyncStatus?: 'fully_synced' | 'partially_synced' | 'manual_only';
  lastBiometricSyncTime?: string;
}

// -----------------------------------------------------------------
// BIOMETRIC, FACIAL RECOGNITION & MOVEMENT MONITORING
// -----------------------------------------------------------------
export type BiometricVerificationMethod = 
  | 'facial_recognition' 
  | 'fingerprint' 
  | 'rfid_smartcard' 
  | 'ble_beacon' 
  | 'manual_admin';

export type MovementLocationType = 
  | 'main_gate' 
  | 'classroom_block' 
  | 'staff_room' 
  | 'science_laboratory' 
  | 'library' 
  | 'hallway_checkpoint' 
  | 'school_clinic' 
  | 'dining_hall' 
  | 'sports_complex';

export type PunctualityCategory = 
  | 'early' 
  | 'on_time' 
  | 'slight_late' 
  | 'late' 
  | 'very_late' 
  | 'early_departure' 
  | 'excused';

export interface BiometricDevice {
  id: string;
  name: string;
  deviceType: 'facial_recognition' | 'fingerprint' | 'hybrid_dual' | 'rfid_turnstile' | 'hallway_ai_camera';
  locationType: MovementLocationType;
  assignedLocationName: string;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  status: 'online' | 'offline' | 'syncing' | 'maintenance';
  lastHeartbeat: string;
  batteryLevel?: number; // e.g. 94% or undefined if AC powered
  totalScansToday: number;
  syncMode: 'realtime_push' | 'periodic_poll';
  targetAudience: 'all' | 'students_only' | 'teachers_only' | 'class_specific';
  assignedClassGroupIds?: string[];
  cameraResolution?: string;
  fingerprintSensorDpi?: number;
  serialNumber: string;
}

export interface BiometricMovementLog {
  id: string;
  personType: 'student' | 'teacher';
  personId: string;
  personName: string;
  personIdentifier: string; // Admission Number or Staff ID
  classGroupId?: string;
  classGroupName?: string;
  department?: string;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g. 07:38:14 AM
  date: string; // YYYY-MM-DD
  deviceId: string;
  deviceName: string;
  locationName: string;
  locationType: MovementLocationType;
  verificationMethod: BiometricVerificationMethod;
  movementType: 'entry_gate' | 'exit_gate' | 'classroom_arrival' | 'hallway_transit' | 'lab_entry' | 'library_access' | 'clinic_visit';
  confidenceScore: number; // 0-100 (e.g. 99.4%)
  punctualityStatus: PunctualityCategory;
  minutesVariance: number; // negative if early, positive if late
  parentAlertStatus?: 'sent' | 'pending' | 'delivered' | 'failed' | 'not_applicable';
  parentAlertChannel?: 'sms' | 'whatsapp' | 'email';
  parentAlertDispatchedAt?: string;
  parentContactNumber?: string;
  snapshotUrl?: string;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  staffId: string;
  department: string;
  date: string; // YYYY-MM-DD
  clockInTime?: string; // 07:28 AM
  clockOutTime?: string; // 03:45 PM
  clockInDevice?: string;
  clockOutDevice?: string;
  clockInMethod: BiometricVerificationMethod;
  status: 'present' | 'late' | 'absent' | 'on_duty_off_campus' | 'sick_leave';
  punctualityStatus: PunctualityCategory;
  minutesLate: number;
  totalCampusHours: string; // e.g. "8h 15m"
  expectedArrival: string; // e.g. "07:30 AM"
  scheduledPeriodsToday: number;
  punctualLessonsDelivered: number;
  movementLogCount: number;
  dutyExemptionNote?: string;
  adminApprovalStatus?: 'approved' | 'pending_review' | 'flagged';
}

export interface MovementPass {
  id: string;
  passCode: string; // e.g. "PASS-2026-882"
  personType: 'student' | 'teacher';
  personId: string;
  personName: string;
  personIdentifier: string;
  classGroupName?: string;
  passType: 'hallway_pass' | 'clinic_pass' | 'science_lab_transfer' | 'library_pass' | 'official_gate_exit' | 'early_dismissal';
  issuedBy: string;
  issuedAt: string;
  validUntil: string;
  originLocation: string;
  destinationLocation: string;
  reason: string;
  status: 'active' | 'completed' | 'expired' | 'violation_flagged';
  scannedAtCheckpoints: { checkpointName: string; timestamp: string }[];
}

export interface BiometricEnrollmentProfile {
  personId: string;
  personType: 'student' | 'teacher';
  personName: string;
  personIdentifier: string;
  classGroupName?: string;
  department?: string;
  facialEnrolled: boolean;
  facialTemplateCount: number;
  fingerprintEnrolled: boolean;
  enrolledFingers: string[]; // e.g. ["Right Thumb", "Right Index"]
  rfidCardUid?: string;
  enrollmentQualityScore: number; // 0 - 100
  lastUpdated: string;
  status: 'active_enrolled' | 'pending_facial' | 'pending_fingerprint' | 're_enrollment_required';
}

// -----------------------------------------------------------------
// ACADEMIC CALENDAR, TERM DATES, HOLIDAYS & EVENTS
// -----------------------------------------------------------------
export interface AcademicTermConfig {
  id: string;
  term: Term;
  session: string; // e.g. "2026/2027"
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  resumptionDate: string;
  staffResumptionDate: string;
  totalWeeks: number;
  totalTeachingDays: number;
  isCurrent: boolean;
  status: 'upcoming' | 'active' | 'completed';
  midTermBreakStart: string;
  midTermBreakEnd: string;
  revisionWeekStart: string;
  revisionWeekEnd: string;
  examinationStart: string;
  examinationEnd: string;
  vacationStart: string;
  vacationEnd: string;
  nextTermResumptionDate: string;
  caSubmissionDeadline1?: string;
  caSubmissionDeadline2?: string;
  themeOrMotto?: string;
  termObjectives?: string[];
  approvedByPrincipal: boolean;
  approvalDate?: string;
  principalRemarks?: string;
}

export type PublicHolidayType = 'national' | 'religious' | 'state' | 'special_gazetted';

export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: PublicHolidayType;
  daysCount: number;
  term: Term;
  academicSession: string;
  description: string;
  isMandatoryClosed: boolean;
  gazetteReference?: string;
}

export type SchoolEventType = 
  | 'academic_milestone'
  | 'continuous_assessment'
  | 'examination'
  | 'pta_meeting'
  | 'sports_extracurricular'
  | 'staff_development'
  | 'ceremonial'
  | 'inspection_audit'
  | 'holiday_break';

export interface SchoolEvent {
  id: string;
  title: string;
  eventType: SchoolEventType;
  term: Term;
  academicSession: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location: string;
  targetAudience: 'all' | 'teachers' | 'students' | 'parents' | 'management' | 'jss_only' | 'sss_only';
  organizer: string;
  description: string;
  isPublished: boolean;
  colorTag?: string;
  priority: 'high' | 'medium' | 'normal';
  status: 'scheduled' | 'ongoing' | 'completed' | 'postponed' | 'cancelled';
  requiresAttendance: boolean;
}

export interface AcademicSessionInfo {
  id: string;
  session: string; // e.g. "2026/2027"
  title: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  terms: AcademicTermConfig[];
}

// -----------------------------------------------------------------
// ACADEMIC RECORDS, SUBJECT TEACHER PORTALS & RLS POLICIES
// -----------------------------------------------------------------
export type ScoreGrade = 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';

export interface ScoreAuditRecord {
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  fieldModified: string;
  previousValue: number | string;
  newValue: number | string;
  reason?: string;
}

export interface StudentSubjectScore {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gender: 'Male' | 'Female';
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  subjectId: string;
  subjectName: string;
  term: Term;
  academicSession: string;
  teacherId: string; // Subject teacher assigned
  teacherName: string;
  
  // Continuous Assessment & Exam Components
  ca1Score: number; // 0 - 15 (e.g. 1st Continuous Assessment Test)
  ca2Score: number; // 0 - 15 (e.g. Mid-Term Assessment / Project)
  ca3Score: number; // 0 - 10 (e.g. Practical, Classwork & Assignments)
  examScore: number; // 0 - 60 (Terminal Examination)
  totalScore: number; // 0 - 100 (ca1 + ca2 + ca3 + exam)
  
  // Evaluation & Standings
  grade: ScoreGrade;
  gradePoints: number; // 9 for A1 down to 0 for F9
  remarks: 'Distinction (A1)' | 'Very Good (B2)' | 'Good (B3)' | 'Credit (C4-C6)' | 'Pass (D7-E8)' | 'Fail (F9)';
  teacherComment: string;
  subjectPosition?: number;
  highestInClass?: number;
  lowestInClass?: number;
  classAverage?: number;
  
  // Lifecycle & RLS Lock
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  isSubmitted: boolean;
  submittedAt?: string;
  auditTrail: ScoreAuditRecord[];
}

export interface AffectiveDomainRatings {
  punctuality: number; // 1 to 5
  neatness: number;
  politeness: number;
  honesty: number;
  leadership: number;
  relationshipWithPeers: number;
  attentiveness: number;
  emotionalStability: number;
}

export interface PsychomotorSkillRatings {
  handwriting: number; // 1 to 5
  verbalFluency: number;
  sportsAndGames: number;
  handlingToolsAndLab: number;
  drawingAndCrafts: number;
  musicalAndDramaticSkill: number;
}

export interface StudentTermSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gender: 'Male' | 'Female';
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  term: Term;
  academicSession: string;
  
  // Aggregated Academic Metrics
  subjectScores: StudentSubjectScore[];
  totalMarksObtained: number;
  totalMarksPossible: number;
  termAverage: number; // Percentage
  classPosition: number;
  totalStudentsInClass: number;
  totalSubjectsOffered: number;
  distinctionsCount: number; // A1, B2, B3
  creditsCount: number; // C4, C5, C6
  passesCount: number; // D7, E8
  failsCount: number; // F9
  gpa: number; // e.g. 4.25 / 5.0
  
  // Behavioral & Form Teacher Section
  affectiveDomain: AffectiveDomainRatings;
  psychomotorSkills: PsychomotorSkillRatings;
  formTeacherRemarks: string;
  formTeacherSignatureDate?: string;
  principalRemarks: string;
  principalSignatureDate?: string;
  
  // Attendance Extract
  totalSchoolDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  
  // Terminal Status
  promotionStatus?: 'Promoted to Next Grade' | 'Promoted on Trial' | 'Repeat Class' | 'Proceeding to Next Term';
  nextTermResumptionDate?: string;
}

export interface ClassAcademicRecord {
  id: string;
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  term: Term;
  academicSession: string;
  formTeacherId: string;
  formTeacherName: string;
  
  // Subjects offered in this class group
  subjectIds: string[];
  subjectNames: string[];
  
  // Student Summaries & Aggregate Class KPIs
  studentSummaries: StudentTermSummary[];
  classAveragePercentage: number;
  highestAveragePercentage: number;
  lowestAveragePercentage: number;
  passRatePercentage: number; // % of students with average >= 50%
  
  // Publication Status
  status: 'draft_entry' | 'submitted_to_exam_officer' | 'approved_by_principal' | 'published_to_parents';
  isLocked: boolean;
  lastUpdated: string;
  publishedAt?: string;
  endorsedByPrincipal?: boolean;
}

// -----------------------------------------------------------------
// ROW-LEVEL SECURITY (RLS) POLICIES & CONTEXT
// -----------------------------------------------------------------
export type RLSPolicyRule = 
  | 'RLS_SUBJECT_TEACHER_ISOLATION'
  | 'RLS_FORM_TEACHER_BROADSHEET_SCOPE'
  | 'RLS_ACADEMIC_ADMIN_FULL_ACCESS'
  | 'RLS_STUDENT_PARENT_RESTRICTED_READ'
  | 'RLS_LOCKED_RECORD_IMMUTABLE';

export interface RLSPermissionEvaluation {
  canViewSubjectGradebook: boolean;
  canEditSubjectScore: boolean;
  canSubmitSubjectScore: boolean;
  canUnlockSubjectScore: boolean;
  canViewClassBroadsheet: boolean;
  canEditFormTeacherRemarks: boolean;
  canEditAffectiveAndPsychomotor: boolean;
  canApproveAndPublishClassRecords: boolean;
  canGenerateReportCard: boolean;
  activePolicyRule: RLSPolicyRule;
  policyDescription: string;
  enforcedRestrictions: string[];
}

// -----------------------------------------------------------------
// IDENTITY & ACCESS MANAGEMENT (IAM), AUTHENTICATION & PRINCIPAL ADMIN
// -----------------------------------------------------------------
export type AuthProviderType = 'email_password' | 'google_sso' | 'phone_otp';

export type SystemAdminRoleType = 
  | 'super_admin'                  // Platform Super Admin (Curriculum Server Control Plane)
  | 'platform_root'                // Platform Root Master Engineer
  | 'principal_admin'             // Office of the Principal (Supreme Super Admin)
  | 'administrative_assistant'     // Executive Assistant & Registry Administrator under Principal
  | 'vice_principal_academic'      // Vice Principal Academics
  | 'vice_principal_admin'         // Vice Principal Administration
  | 'examination_officer'          // Chief Examination Officer
  | 'bursar_finance'               // Bursar & Financial Controller
  | 'dean_student_affairs'         // Dean of Student Affairs
  | 'ict_system_admin'             // ICT & Systems Administrator
  | 'hod_sciences'                 // Head of Dept (Sciences & Math)
  | 'hod_humanities'               // Head of Dept (Languages & Humanities)
  | 'hod_business_vocational'      // Head of Dept (Business & Tech)
  | 'academic_coordinator'         // Academic Coordinator
  | 'custom_admin';                // Custom Assigned Admin Role

export interface IAMPermissionMatrix {
  // Curriculum & Schemes of Work
  canManageCurriculum: boolean;
  canApproveSchemesOfWork: boolean;
  
  // Lesson Plans & Quality Assurance
  canSubmitLessonPlans: boolean;
  canReviewLessonPlans: boolean;
  canPrincipalApproveLessonPlans: boolean;
  
  // Timetables & Staff Allocations
  canDesignTimetable: boolean;
  canLockTimetable: boolean;
  
  // Academic Records, Broadsheets & Broadsheet Endorsement
  canEnterContinuousAssessment: boolean;
  canEditAffectivePsychomotor: boolean;
  canUnlockLockedScores: boolean;
  canApproveBroadsheets: boolean;
  canPublishReportCards: boolean;
  
  // Question Bank & Secure CBT Exams
  canAuthorQuestions: boolean;
  canGenerateExams: boolean;
  canUnlockExams: boolean;
  
  // Teacher Pool & Biometric Attendance
  canManageTeacherPool: boolean;
  canEnrollBiometrics: boolean;
  canOverrideAttendanceLogs: boolean;
  
  // Institutional Governance & IAM Administration
  canAssignAdminRoles: boolean;
  canCreateCustomRoles: boolean;
  canEnforceSecurityPolicies: boolean;
  canViewSecurityAuditLogs: boolean;
  canRevokeUserSessions: boolean;
  canResetCredentials: boolean;
}

export interface AdminRoleDefinition {
  id: string;
  roleType: SystemAdminRoleType;
  title: string;
  officeTitle: string; // e.g. "Office of the Principal"
  department: string;
  badgeColor: 'purple' | 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose' | 'teal' | 'sky';
  description: string;
  isSystemRoot?: boolean; // Principal Admin is immutable system root
  isCustom?: boolean;
  permissions: IAMPermissionMatrix;
  assignedUsersCount: number;
  createdAt: string;
  createdBy: string;
}

export interface UserAuthAccount {
  id: string;
  userId: string;
  staffOrStudentId: string;
  fullName: string;
  email: string;
  alternativeAccessEmail?: string;
  alternativeEmail?: string;
  isEmailVerified: boolean;
  phone: string;
  isPhoneVerified: boolean;
  googleId?: string;
  googleEmail?: string;
  isGoogleLinked: boolean;
  googleAvatarUrl?: string;
  avatar: string;
  authProviders: AuthProviderType[];
  mfaEnabled: boolean;
  mfaMethod?: 'sms_phone' | 'google_authenticator' | 'email_otp';
  
  // Role & IAM
  primaryRole: UserRole;
  assignedAdminRoles: SystemAdminRoleType[];
  customRoleIds?: string[];
  assignedByPrincipalDate?: string;
  delegationExpiryDate?: string;
  isActingRole?: boolean;
  status: 'active' | 'suspended' | 'pending_verification';
  
  // Security & Audit
  lastLoginAt: string;
  lastLoginIp: string;
  lastLoginMethod: AuthProviderType;
  securityRiskLevel: 'low' | 'medium' | 'high';
  passwordLastChanged: string;
  sessionToken?: string;
}

export interface IAMSecurityPolicy {
  requireEmailVerification: boolean;
  requirePhoneVerificationForAdmins: boolean;
  enforceGoogleSSODomain: boolean;
  allowedGoogleDomain: string; // e.g. '@curriculumflow.edu.ng'
  requireMFAForPrincipalAdmin: boolean;
  requireMFAForExamOfficer: boolean;
  sessionTimeoutMinutes: number; // 15, 60, 480, 1440
  passwordMinLength: number;
  autoLockLockedBroadsheets: boolean;
  maxFailedLoginAttempts: number;
}

export interface IAMSecurityAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILED' 
    | 'GOOGLE_SSO_LINKED' 
    | 'PHONE_VERIFIED' 
    | 'ROLE_ASSIGNED' 
    | 'ROLE_REVOKED' 
    | 'ROLE_CREATED' 
    | 'PERMISSION_MODIFIED' 
    | 'POLICY_UPDATED' 
    | 'MFA_ENFORCED' 
    | 'SESSION_REVOKED'
    | 'BROADSHEET_UNLOCKED';
  targetUserId?: string;
  targetUserName?: string;
  targetRole?: string;
  ipAddress: string;
  details: string;
  status: 'success' | 'warning' | 'denied';
}

// -----------------------------------------------------------------
// 12. BURSARY, BILLING, INVOICES, PSPS & RECONCILIATIONS
// -----------------------------------------------------------------
export type FeeCategory = 
  | 'tuition' 
  | 'science_lab' 
  | 'ict_lms' 
  | 'development_levy' 
  | 'uniform_boarding' 
  | 'exam_fees' 
  | 'pta' 
  | 'medical_insurance' 
  | 'transport'
  | 'excursion'
  | 'clubs_societies'
  | 'sports_uniform'
  | 'graduation_valedictory'
  | 'late_penalty'
  | 'coaching_extramural'
  | 'sundry_special';

export type FeeFrequency = 'per_term' | 'annual_session' | 'one_off_event' | 'on_demand';
export type FeeTargetAudience = 'all_students' | 'day_only' | 'boarding_only' | 'specific_grades' | 'elective_club';
export type FeeApprovalStatus = 'draft' | 'pending_principal_approval' | 'approved_published' | 'archived';

export interface FeeItem {
  id: string;
  code?: string;
  name: string;
  category: FeeCategory;
  amount: number;
  isCompulsory: boolean;
  applicableGrades: ClassGrade[];
  description: string;
  // Principal Admin Governance Properties
  frequency?: FeeFrequency;
  targetAudience?: FeeTargetAudience;
  approvalStatus?: FeeApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  designatedAccount?: string;
  installmentEligible?: boolean;
  allowCustomAmount?: boolean;
  dueDate?: string;
  gracePeriodDays?: number;
  lateSurchargePercent?: number;
  maxEnrollmentSlots?: number;
  enrolledStudentsCount?: number;
  tags?: string[];
}

export interface FeeSchedule {
  id: string;
  name: string;
  code?: string;
  academicSession: string;
  term: Term;
  classGrade: ClassGrade;
  studentType?: 'all' | 'day' | 'boarding';
  feeItems: FeeItem[];
  totalAmount: number;
  approvalStatus?: FeeApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface SundryPaymentOrder {
  id: string;
  orderNumber: string; // e.g. SND-2026-0045
  feeItemId: string;
  feeItemName: string;
  category: FeeCategory;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  amount: number;
  paymentStatus: 'pending' | 'paid' | 'waived';
  paymentDate?: string;
  receiptNumber?: string;
  transactionReference?: string;
  paymentChannel?: PaymentChannel;
  additionalDetails?: {
    uniformSize?: string;
    busRouteZone?: string;
    excursionConsentSigned?: boolean;
    examSubjectsSelected?: string[];
    clubRole?: string;
    customNote?: string;
  };
  issuedAt: string;
  issuedBy: string;
}

export type InvoiceStatus = 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'waived';

export interface InvoiceLineItem {
  feeItemId: string;
  name: string;
  category: FeeCategory;
  amount: number;
  discountAmount: number;
  netAmount: number;
}

export interface StudentInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-T3-001
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  classGroupId: string;
  classGroupName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  term: Term;
  academicSession: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  totalDiscount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  qrCodeHash: string;
  notes?: string;
  createdAt: string;
}

export type PaymentChannel = 'paystack' | 'opay' | 'bank_transfer' | 'cash_bursary' | 'pos_terminal';
export type PaymentStatus = 'successful' | 'pending_verification' | 'failed' | 'refunded';

export interface PaymentChannelDetails {
  bankName?: string;
  senderAccountName?: string;
  senderAccountNumber?: string;
  pspReference?: string;
  virtualAccountNumber?: string;
  cardLast4?: string;
  cardBrand?: string;
  authorizationCode?: string;
  proofOfPaymentUrl?: string;
  tellerNumber?: string;
  channelSpecificPayload?: Record<string, any>;
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string; // e.g. REC-2026-T3-0042
  transactionReference: string; // e.g. PSTK_CF_2026_98741 or OPAY_TX_12398
  invoiceId: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  amountPaid: number;
  gatewayFee: number;
  netAmount: number;
  paymentChannel: PaymentChannel;
  channelDetails: PaymentChannelDetails;
  paymentDate: string;
  status: PaymentStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface OfficialReceipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  transactionReference: string;
  invoiceId: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  amountInFigures: number;
  amountInWords: string;
  paymentChannel: PaymentChannel;
  paymentDate: string;
  totalInvoiceAmount: number;
  amountPaidThisTransaction: number;
  totalCumulativePaid: number;
  balanceRemaining: number;
  authorizedBursarName: string;
  qrVerificationCode: string;
  generatedAt: string;
  schoolStampUrl?: string;
  bursarSignatureUrl?: string;
}

export type ReconciliationStatus = 'auto_matched' | 'manual_matched' | 'unallocated_deposit' | 'flagged_discrepancy';

export interface ReconciliationRecord {
  id: string;
  settlementBatchId: string;
  date: string;
  channel: PaymentChannel;
  externalTransactionRef: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  grossAmount: number;
  processingFee: number;
  netSettlementAmount: number;
  status: ReconciliationStatus;
  bankSettlementRef: string;
  notes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PaymentNotification {
  id: string;
  type: 'sms' | 'email' | 'in_app';
  recipient: string; // Phone number or email
  recipientName: string;
  studentName: string;
  title: string;
  message: string;
  timestamp: string;
  status: 'delivered' | 'sent' | 'pending' | 'failed';
  relatedReceiptNumber?: string;
  relatedInvoiceNumber?: string;
  channelIcon?: string;
}

export interface StudentAccountSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  classGroupName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  totalBilled: number;
  totalPaid: number;
  totalDiscounts: number;
  currentBalance: number;
  clearanceStatus: 'fully_cleared' | 'provisional_cleared' | 'blocked_debtor';
  invoicesCount: number;
  receiptsCount: number;
  lastPaymentDate?: string;
  virtualNubanAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  activeInstallmentPlan?: {
    planName: string;
    completedTranches: number;
    totalTranches: number;
    nextDueTranche?: string;
    nextDueAmount?: number;
    nextDueDate?: string;
  };
}

// -----------------------------------------------------------------
// 13. PRINCIPAL INSTALLMENT PAYMENT POLICY & AGREEMENTS
// -----------------------------------------------------------------
export interface InstallmentTranche {
  id: string;
  trancheNumber: number;
  name: string; // e.g. "Tranche 1: Resumption & Class Attendance"
  shortCode: string; // e.g. "T1", "T2", "T3"
  percentage: number; // e.g. 50 (for 50%)
  deadlineWeek: string; // e.g. "Week 1 (Resumption)"
  dueDate: string; // e.g. "2026-05-08"
  academicClearanceScope: string; // e.g. "Classroom Access, Uniforms & Digital LMS"
  isCompulsoryForAdmission: boolean;
  latePenaltySurchargePercent: number;
  description: string;
}

export type InstallmentPresetType = 
  | '3_tranche_standard' 
  | '2_tranche_50_50' 
  | '2_tranche_60_40' 
  | '4_tranche_flexi' 
  | 'custom';

export interface PolicyAuditEntry {
  id: string;
  timestamp: string;
  modifiedBy: string;
  modifierRole: UserRole;
  changeSummary: string;
  signatureHash: string;
}

export interface InstallmentPolicy {
  id: string;
  policyTitle: string;
  academicSession: string;
  term: Term;
  isActive: boolean;
  allowInstallmentPayments: boolean;
  presetType: InstallmentPresetType;
  minimumInitialDepositPercent: number; // e.g. 50%
  gracePeriodDays: number; // e.g. 7 days
  latePenaltyRatePercent: number; // e.g. 5%
  enableLatePenalties: boolean;
  enableAutomaticClearanceGates: boolean;
  midtermClearanceMinimumPercent: number; // e.g. 75%
  finalExamClearanceMinimumPercent: number; // e.g. 100%
  hardshipDiscretionAllowed: boolean;
  autoRemindersEnabled: boolean;
  reminderDaysBeforeDue: number[]; // e.g. [7, 3, 0]
  tranches: InstallmentTranche[];
  principalApproval: {
    principalName: string;
    principalId: string;
    approvedAt: string;
    approvalStamp: string;
    digitalSignatureHash: string;
    remarks: string;
  };
  policyGuidelines: string;
  auditTrail: PolicyAuditEntry[];
}

export interface CustomStudentTranche {
  trancheNumber: number;
  name: string;
  amount: number;
  percentage: number;
  dueDate: string;
  status: 'paid' | 'due' | 'overdue' | 'waived';
  paidAmount: number;
  paidDate?: string;
  receiptNumber?: string;
  clearanceMilestone: string;
}

export interface StudentInstallmentAgreement {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  invoiceId: string;
  invoiceNumber: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  totalInvoiceAmount: number;
  agreedPlanType: 'standard_policy' | 'custom_hardship_plan' | 'staff_concession';
  customTranches: CustomStudentTranche[];
  principalApprovalStatus: 'approved' | 'pending_review' | 'declined';
  approvedByPrincipalName?: string;
  approvedAt?: string;
  specialNotes?: string;
  createdAt: string;
}

// -----------------------------------------------------------------
// 14. REVENUE COLLECTIONS VS PROJECTED ACADEMIC TERM BUDGET
// -----------------------------------------------------------------
export interface MonthlyRevenueBudgetData {
  id: string;
  monthKey: string; // e.g. "2025-09", "2026-04", etc.
  monthLabel: string; // e.g. "Apr 2026"
  academicSession: string;
  term: Term;
  termPhase: string; // e.g. "Resumption & Tranche 1", "Mid-Term Clearance", "Final Exam Tranche"
  
  // Revenue Projections vs Actuals
  projectedRevenueTarget: number;
  actualRevenueCollected: number;
  tuitionRevenue: number;
  stemIctLevies: number;
  boardingTransportRevenue: number;
  otherLevies: number;
  
  // Budget & Expenditures
  projectedOperationalBudget: number;
  actualOperationalExpenditure: number;
  expenditureBreakdown: {
    facultyStaffSalaries: number;
    stemIctLabsEnergy: number;
    boardingCateringLogistics: number;
    facilityMaintenanceCapEx: number;
    academicRegulatoryExamFees: number;
  };

  // Performance & Variance
  collectionAttainmentRate: number; // percentage (e.g. 102.5%)
  revenueVariance: number; // actual - projected
  netOperatingSurplus: number; // actual revenue - actual expenditure
  collectionEfficiencyStatus: 'surpassed_target' | 'on_track' | 'lagging_behind' | 'critical_shortfall';
  activeTransactionsCount: number;
  channelBreakdown: {
    paystack: number;
    opay: number;
    bankTransfer: number;
  };
  notes: string;
}

export interface AcademicTermBudgetSummary {
  term: Term;
  academicSession: string;
  termTitle: string;
  totalProjectedBudget: number;
  totalTargetRevenue: number;
  totalActualCollected: number;
  totalExpenditureSpent: number;
  netSurplusDeficit: number;
  collectionRate: number;
  budgetUtilizationRate: number;
  monthsCovered: string[];
}

// -----------------------------------------------------------------
// SCHOOL BRAND & INSTITUTIONAL IDENTITY MANAGEMENT (PRINCIPAL GOVERNANCE)
// -----------------------------------------------------------------
export type LogoShape = 'shield' | 'circle' | 'square' | 'rounded';
export type BrandPresetTheme = 'emerald_prestige' | 'royal_sapphire' | 'crimson_ruby' | 'slate_cyber' | 'amber_gold' | 'custom';

export interface BrandRevisionEntry {
  version: number;
  publishedAt: string;
  publishedBy: string;
  summaryNotes: string;
  changesHighlight: string[];
}

export interface SchoolBrandProfile {
  id: string;
  schoolName: string;
  shortName: string;
  motto: string;
  establishedYear: number;
  schoolType: string;
  accreditationNumber: string;
  examCentreNumbers: {
    waec?: string;
    neco?: string;
    bece?: string;
    jambCbt?: string;
  };
  crestLogoUrl: string;
  logoShape: LogoShape;
  logoIconType: 'school' | 'book' | 'graduation' | 'award' | 'landmark' | 'shield' | 'custom';
  crestBadgePreset: BrandPresetTheme;
  principalSignatureUrl: string;
  principalName: string;
  principalTitle: string;
  stampSealUrl: string;
  watermarkText: string;
  brandTheme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    presetKey: BrandPresetTheme;
  };
  contact: {
    primaryEmail: string;
    admissionsEmail: string;
    bursaryEmail: string;
    principalEmail: string;
    primaryPhone: string;
    alternatePhone: string;
    whatsappSupport: string;
    emergencyHelpline: string;
    officialWebsite: string;
    studentPortalUrl: string;
    parentPortalUrl: string;
    lmsUrl: string;
  };
  address: {
    streetAddress: string;
    areaDistrict: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    campusName: string;
    landmarks: string;
    geoCoordinates?: {
      latitude: number;
      longitude: number;
      googleMapsUrl?: string;
    };
  };
  socialMedia: {
    facebookUrl: string;
    twitterXUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    youtubeUrl: string;
    tiktokUrl: string;
    telegramChannel: string;
    whatsappChannel: string;
  };
  academicAffiliation: string;
  status: 'published' | 'draft_pending_publish';
  publishedAt?: string;
  publishedBy?: string;
  version: number;
  lastSavedAt: string;
  lastSavedBy: string;
  publishAuditHistory: BrandRevisionEntry[];
}

// -----------------------------------------------------------------
// INSTITUTIONAL USER PROFILES (Principal, Admins, Teachers, Students)
// -----------------------------------------------------------------
export type InstitutionalUserType = 'principal' | 'administrative_officer' | 'teacher' | 'student';

export interface PrincipalInstitutionalProfile {
  id: string;
  staffId: string;
  fullName: string;
  title: string;
  role: 'principal' | 'principal_admin';
  avatar: string;
  photoUrl?: string;
  gender: 'Male' | 'Female';
  dateOfBirth?: string;
  trcnNumber: string; // Teachers Registration Council of Nigeria
  nationalIdNumber?: string;
  highestQualification: string;
  institutionGraduated: string;
  yearsOfExperience: number;
  tenureStartDate: string;
  appointedBy: string;
  officeLocation: string;
  officeHours: string;
  officialEmail: string;
  personalEmail?: string;
  phone: string;
  alternatePhone?: string;
  executiveMission: string;
  educationalPhilosophy: string;
  professionalMemberships: string[];
  committeesChaired: string[];
  supervisoryDirectorates: string[];
  signatureUrl?: string;
  securityClearanceLevel: 'Root Executive (Level 5)' | 'Level 4' | 'Level 3';
  biometricId: string;
  biometricEnrolled: boolean;
  status: 'active' | 'on_leave' | 'sabbatical';
}

export interface AdminOfficerInstitutionalProfile {
  id: string;
  staffId: string;
  fullName: string;
  title: string;
  administrativeRole: 
    | 'vice_principal_academic'
    | 'vice_principal_admin'
    | 'exam_officer'
    | 'bursar_finance'
    | 'dean_student_affairs'
    | 'ict_system_admin'
    | 'hod_sciences'
    | 'hod_arts';
  department: string;
  officeTitle: string;
  officeLocation: string;
  officeHours: string;
  avatar: string;
  photoUrl?: string;
  gender: 'Male' | 'Female';
  qualification: string;
  trcnNumber?: string;
  officialEmail: string;
  phone: string;
  reportingTo: string; // e.g. "Office of the Principal"
  primaryResponsibilities: string[];
  delegatedGovernanceScope: string[];
  committeesChaired: string[];
  tenureStartDate: string;
  biometricEnrolled: boolean;
  mfaEnabled: boolean;
  status: 'active' | 'on_leave';
}

export interface TeacherInstitutionalProfile {
  id: string;
  staffId: string;
  fullName: string;
  title: string;
  gender: 'Male' | 'Female';
  avatar: string;
  photoUrl?: string;
  qualification: string;
  trcnNumber: string;
  department: string;
  subjects: string[];
  assignedClassGroupIds: string[];
  assignedClassGroupNames: string[];
  isFormTeacher: boolean;
  formClassGroupId?: string;
  formClassGroupName?: string;
  officeLocation: string;
  email: string;
  phone: string;
  joinedDate: string;
  weeklyTeachingPeriods: number;
  maxPeriodsCapacity: number;
  specializationNotes: string;
  teachingPhilosophy?: string;
  biometricEnrolled: boolean;
  performanceRating: number; // e.g. 4.8 / 5.0
  syllabusCompletionRate: number; // percentage
  status: 'active' | 'on_leave';
}

export interface StudentInstitutionalProfile {
  id: string;
  admissionNumber: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  avatar: string;
  photoUrl?: string;
  classGroupId: string;
  classGroupName: string;
  classGrade: ClassGrade;
  houseSportTeam: string; // e.g. "Emerald Falcon", "Gold Eagle", "Sapphire Dragon"
  clubOrSociety?: string;
  leadershipRole?: string; // e.g. "Head Boy", "Assistant Head Girl", "STEM Club Captain", "Class Rep"
  residentialAddress: string;
  bloodGroupGenotype?: string; // e.g. "O+ / AA"
  academicSession: string;
  currentTermGpa: number; // e.g. 88.4%
  termPositionInClass: string; // e.g. "2nd of 34"
  termAttendanceRate: number; // e.g. 96.8%
  punctualityScore: 'Exemplary' | 'Good' | 'Needs Improvement';
  enrolledSubjectsCount: number;
  biometricEnrolled: boolean;
  rfidSmartCardUid?: string;
  conductRating: 'Exemplary' | 'Very Good' | 'Satisfactory' | 'Under Observation';
  primaryParentId: string;
  primaryParentName: string;
  primaryParentPhone: string;
  primaryParentRelationship: string;
  status: 'active' | 'suspended' | 'graduated' | 'transferred';
}

// -----------------------------------------------------------------
// PARENT DATABASE & STUDENT-TO-PARENT MAPPING (Principal Supervised)
// -----------------------------------------------------------------
export type ParentRelationshipType = 
  | 'Father'
  | 'Mother'
  | 'Legal Guardian'
  | 'Grandparent'
  | 'Uncle/Aunt'
  | 'Corporate Sponsor'
  | 'Foster Parent';

export type PrincipalVerificationStatus = 
  | 'verified_by_principal'
  | 'pending_verification'
  | 'flagged_restricted';

export interface StudentWardMapping {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGroupName: string;
  classGrade: ClassGrade;
  relationship: ParentRelationshipType;
  isPrimaryGuardian: boolean;
  isAuthorizedPickup: boolean;
  emergencyPriority: 1 | 2 | 3;
  canReceiveReportCards: boolean;
  canReceiveFeeInvoices: boolean;
  verifiedByPrincipal: boolean;
  verifiedDate?: string;
  notes?: string;
}

export interface ParentGuardianProfile {
  id: string;
  parentCode: string; // e.g. "PAR-2026-081"
  title: string; // e.g. "Dr.", "Chief", "Engr.", "Barr.", "Alh.", "Mrs.", "Mr."
  fullName: string;
  gender: 'Male' | 'Female';
  avatar: string;
  photoUrl?: string;
  occupation: string;
  employerOrBusiness: string;
  residentialAddress: string;
  stateOfOrigin?: string;
  primaryPhone: string;
  alternatePhone?: string;
  whatsappPhone?: string;
  email: string;
  preferredContactChannel: 'whatsapp' | 'sms' | 'email' | 'phone_call';
  maritalStatus: 'Married' | 'Single' | 'Widowed' | 'Divorced';
  ptaMemberCategory: 'General Member' | 'PTA Executive (Chairman)' | 'PTA Executive (Treasurer)' | 'PTA Committee Member' | 'Patron';
  portalAccessStatus: 'activated' | 'invitation_sent' | 'suspended';
  portalAccessCode?: string;
  feePaymentStatus: 'fully_cleared' | 'installment_current' | 'outstanding_arrears';
  totalOutstandingBalance: number;
  pickupAuthorizationCode: string;
  biometricEnrolled: boolean;
  supervisedVerificationStatus: PrincipalVerificationStatus;
  verifiedByPrincipalName?: string;
  verificationDate?: string;
  principalSupervisionNotes?: string;
  isFlaggedForSecurity: boolean;
  securityFlagReason?: string;
  wards: StudentWardMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface ParentAuditLog {
  id: string;
  timestamp: string;
  action: 
    | 'parent_created'
    | 'ward_linked'
    | 'ward_unlinked'
    | 'pickup_authorized'
    | 'pickup_revoked'
    | 'principal_verified'
    | 'profile_updated'
    | 'security_flagged';
  actorName: string;
  actorRole: string;
  parentId: string;
  parentName: string;
  details: string;
}

// -----------------------------------------------------------------
// CURRICULUM SERVER - MULTI-TENANT SAAS & CLONING PLATFORM TYPES
// -----------------------------------------------------------------

export type BusinessModelType = 'monthly' | 'yearly' | 'lease_to_own';

export type TenantStatus = 
  | 'active' 
  | 'trialing' 
  | 'grace_period' 
  | 'suspended' 
  | 'archived'
  | 'lease_completed_perpetual' 
  | 'deprovisioned'
  | 'decommissioned';

// -----------------------------------------------------------------
// 4-BUNDLE ARCHITECTURE (Administration, Teaching, Assessment, Accounts & Billing)
// -----------------------------------------------------------------
export type CurriculumFlowBundleKey = 
  | 'administration' 
  | 'teaching' 
  | 'assessment' 
  | 'accounts_billing'
  | 'logistics_support';

export interface CurriculumFlowBundleFeature {
  id: string;
  key: string;
  bundleKey: CurriculumFlowBundleKey;
  name: string;
  description: string;
  subItems: string[];
  defaultEnabled: boolean;
  isCore: boolean;
  iconName: string;
}

export interface CurriculumFlowBundle {
  key: CurriculumFlowBundleKey;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  monthlyPriceNGN: number;
  yearlyPriceNGN: number;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  iconName: string;
  features: CurriculumFlowBundleFeature[];
  isActive?: boolean;
  isCustom?: boolean;
  discountPercentage?: number;
}

export interface SubscriptionPlanOffer {
  id: string;
  name: string;
  tierKey: 'starter' | 'pro' | 'enterprise' | 'lease_to_own' | 'custom';
  tagline: string;
  description: string;
  monthlyPriceNGN: number;
  yearlyPriceNGN: number;
  leaseToOwnMonthlyNGN?: number;
  leaseToOwnTotalBuyoutNGN?: number;
  leaseToOwnAmortizationMonths?: number;
  setupFeeNGN: number;
  currency: 'NGN' | 'USD';
  studentCapacity: number;
  facultyLimit: number;
  storageLimitMb: number;
  trialDays: number;
  gracePeriodDays: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  isActive: boolean;
  status: 'published' | 'draft' | 'archived';
  includedBundles: CurriculumFlowBundleKey[];
  includedFeatures: string[];
  customLimitsDescription?: string;
  colorScheme: string;
  badgeText?: string;
  iconName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoDiscountOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed_ngn';
  discountValue: number; // e.g. 20 for 20% or 50000 for ₦50,000 off
  applicableCategory: 'all' | 'subscription_plans' | 'bundles' | 'add_ons' | 'domains';
  targetPlanId?: string;
  minOrderValueNGN?: number;
  maxDiscountNGN?: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface PricingChangeAuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  adminEmail: string;
  targetType: 'subscription_plan' | 'bundle' | 'add_on_feature' | 'domain_tld' | 'promo_offer';
  targetId: string;
  targetName: string;
  action: 'price_updated' | 'offer_created' | 'offer_deleted' | 'status_toggled' | 'catalog_imported' | 'reset_defaults';
  oldValueSummary?: string;
  newValueSummary: string;
  notes?: string;
}

export interface BundleUpgradeRequest {
  id: string;
  tenantId: string;
  tenantSchoolName: string;
  requestedBundle: CurriculumFlowBundleKey;
  requestType: 'activate' | 'deactivate';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requestedBy: string;
  monthlyPriceImpactNGN: number;
  notes?: string;
}

export type OptionalFeatureKey = 
  | 'ai_curriculum_advisor'
  | 'adaptive_remedial_engine'
  | 'biometric_rfid_gate'
  | 'secure_cbt_lockdown'
  | 'bursary_psp_multi_split'
  | 'parent_ward_security_hub'
  | 'custom_domain_whitelabel'
  | 'hybrid_offline_sync'
  | 'whatsapp_sms_broadcast'
  | 'spanner_audit_trail';

export interface OptionalFeatureDefinition {
  id?: string;
  key: OptionalFeatureKey;
  name: string;
  shortDesc: string;
  category: 'ai' | 'security' | 'fintech' | 'infrastructure' | 'communication' | 'custom';
  monthlyPrice: number; // in NGN
  yearlyPrice: number;
  isCoreDefault?: boolean;
  requiredTier?: 'Starter' | 'Pro' | 'Enterprise' | 'All';
  iconName: string;
  isActive?: boolean;
  isCustom?: boolean;
  badge?: string;
}

export interface LeaseToOwnContract {
  totalBuyoutPrice: number; // e.g. ₦8,400,000
  amortizationPeriodMonths: number; // e.g. 24 months
  monthlyAmortizationInstallment: number; // e.g. ₦350,000 / month
  monthsPaid: number; // e.g. 9
  totalEquityAccumulated: number; // e.g. ₦3,150,000
  remainingBuyoutBalance: number; // e.g. ₦5,250,000
  startDate: string;
  targetPerpetualHandoverDate: string;
  isPerpetualLicenseGranted: boolean;
  perpetualCertificateId?: string;
  escrowSourceCodeReleaseStatus: 'locked_in_escrow' | 'partial_escrow_audit' | 'released_to_client';
  earlyBuyoutDiscountPercent: number; // e.g. 10%
  // Computed & helper properties
  monthlyPaymentNgn?: number;
  monthlyLeasePaymentNgn?: number;
  equityAccruedNgn?: number;
  equityPercentage?: number;
  remainingBuyoutPriceNgn?: number;
  isBuyoutEligible?: boolean;
  totalContractPriceNgn?: number;
  totalTermMonths?: number;
}

export interface TenantBillingInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-CS-2026-0042"
  tenantAppId: string;
  tenantSchoolName: string;
  businessModel: BusinessModelType;
  billingPeriod: string; // e.g. "August 2026", "2026/2027 Academic Year", "Lease Installment #9 of 24"
  amount: number;
  taxVat: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'waived' | 'failed';
  dueDate: string;
  paidDate?: string;
  paymentGatewayRef?: string;
  pspChannel?: 'Paystack' | 'Flutterwave' | 'OPay' | 'Direct Bank Wire' | 'Virtual NUBAN';
  downloadReceiptUrl?: string;
  notes?: string;
  gatewayResponseCode?: string; // e.g. '00_APPROVED', '200_OK', '51_INSUFFICIENT_FUNDS', '504_TIMEOUT'
  gatewayResponseMessage?: string;
  gatewayTransactionStatus?: 'success' | 'pending' | 'failed' | 'processing';
  gatewayLatencyMs?: number;
  gatewayAuthMethod?: 'HMAC-SHA512' | 'Bearer-Secret' | 'Direct-NUBAN';
  lastWebhookTimestamp?: string;
}

export interface PspPaymentWebhookEvent {
  id: string;
  provider: 'paystack' | 'opay';
  event: string;
  transactionReference: string;
  invoiceNumber: string;
  tenantSchoolName: string;
  amountNaira: number;
  currency: string;
  httpStatusCode: number;
  status: '200_OK' | '400_BAD_REQUEST' | '500_SERVER_ERROR' | 'PENDING_RETRY';
  signatureVerified: boolean;
  signatureType: 'HMAC-SHA512' | 'x-paystack-signature';
  signatureHash: string;
  originIp: string;
  latencyMs: number;
  timestamp: string;
  payload: Record<string, any>;
  rawExecutionLog: string[];
}

export type SuperAdminAccessApprovalStatus = 'approved' | 'pending_approval' | 'revoked' | 'not_requested';

export interface SuperAdminAccessLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: 'access_requested' | 'access_approved' | 'access_revoked' | 'instance_entered' | 'scope_elevated';
  details: string;
}

export interface SuperAdminAccessGrant {
  status: SuperAdminAccessApprovalStatus;
  approvedByPrincipalName?: string;
  approvedByPrincipalEmail?: string;
  approvedAt?: string;
  expiresAt?: string; // ISO string or 'indefinite'
  accessScope?: 'full_diagnostic_support' | 'read_only_audit' | 'emergency_hotfix';
  requestReason?: string;
  requestedAt?: string;
  requestedByEmail?: string;
  requestedByName?: string;
  accessLogs?: SuperAdminAccessLog[];
}

export interface TenantSchoolApp {
  id: string;
  appId: string; // e.g. "CF-2026-KINGS-LAG"
  appSecret: string; // Cryptographic app secret e.g. "cf_sec_live_9f81a7b..."
  publishableKey: string; // e.g. "cf_pub_live_7c4d..."
  schoolName: string;
  schoolSlug: string; // e.g. "kings-college-lagos"
  subdomain: string; // e.g. "kingscollege.curriculumflow.com"
  customDomain?: string; // e.g. "portal.kingscollege.edu.ng"
  customDomainStatus?: 'verified_active' | 'dns_pending' | 'ssl_provisioning' | 'unconfigured';
  locationState: string; // e.g. "Lagos State"
  country: string; // e.g. "Nigeria"
  address: string;
  principalName: string;
  principalEmail: string;
  principalPhone: string;
  ictAdminName: string;
  ictAdminEmail: string;
  
  // Business & Licensing
  businessModel: BusinessModelType;
  subscriptionTier: 'Starter Academy' | 'Pro College' | 'Apex Enterprise' | 'Bespoke Lease-to-Own';
  subscriptionPricePerMonth: number;
  subscriptionPricePerYear: number;
  currency: 'NGN' | 'USD';
  status: TenantStatus;
  trialEndsAt?: string;
  subscriptionRenewDate?: string;
  gracePeriodDays: number;
  autoRenew: boolean;
  leaseToOwnContract?: LeaseToOwnContract;
  
  // Capacity & Health
  studentCapacity: number;
  activeStudentsCount: number;
  facultyCount: number;
  storageUsageMb: number;
  maxStorageMb: number;
  uptimePercent90Days: number;
  lastActiveTimestamp: string;
  databaseShardId: string;
  databaseIsolationType: 'isolated_tenant_schema' | 'dedicated_shard' | 'hybrid_on_prem_sync';
  provisionedFromTemplateVersion?: string;
  clonedFromTemplateVersion?: string;
  
  // Branding Profile attached to this provisioned instance
  brandProfile: SchoolBrandProfile;
  
  // 4-Bundle Licensing Model (Administration, Teaching, Assessment, Accounts & Billing)
  licensedBundles: Record<CurriculumFlowBundleKey, boolean>;

  // Granular In-App Feature Overrides (decided by School Principal within CURRICULUM FLOW)
  inAppFeatureOverrides?: Record<string, boolean>;

  // Bundle Upgrade & Downgrade Requests
  bundleUpgradeRequests?: BundleUpgradeRequest[];

  // Feature flags active for this school
  enabledFeatures: Record<OptionalFeatureKey, boolean>;
  
  // API & Webhook settings
  webhookUrl?: string;
  webhookSecret?: string;
  rateLimitReqPerMin: number;
  ipWhitelist?: string[];
  
  // Metadata & Audit
  createdAt: string;
  provisionedByAdmin?: string;
  clonedByAdmin?: string;
  licenseHash: string;
  auditLogsCount: number;

  // Platform Super Admin Delegated Access Governance (Requires Principal Admin Approval)
  superAdminAccessGrant?: SuperAdminAccessGrant;
}

export interface CurriculumServerSaaSMetrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  leaseToOwnTenants: number;
  monthlyRecurringRevenueNGN: number;
  annualRecurringRevenueNGN: number;
  totalLeaseEquityPoolNGN: number;
  totalManagedStudents: number;
  totalManagedFaculty: number;
  globalUptimePercent: number;
  platformVersion: string;
}

export type PlatformViewMode = 'saas_master_console' | 'tenant_school_instance';

// ==========================================
// DOMAIN MANAGEMENT & REGISTRAR TYPES
// ==========================================

export type DomainRegistrationStatus = 
  | 'active' 
  | 'pending_verification' 
  | 'pending_payment' 
  | 'dns_propagating' 
  | 'expired' 
  | 'failed';

export type DomainType = 'primary' | 'subdomain_alias' | 'portal_redirect';

export type DomainRegistrarType = 
  | 'nira_accredited_whogohost' 
  | 'cloudflare_registrar' 
  | 'namecheap_api' 
  | 'google_cloud_run_edge'
  | 'external_self_hosted';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV';

export interface DnsRecord {
  id: string;
  type: DnsRecordType;
  name: string;
  value: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  status: 'active' | 'propagating' | 'error';
  description?: string;
}

export interface SchoolCustomDomain {
  id: string;
  tenantId: string;
  tenantSchoolName: string;
  domainName: string;
  domainType: DomainType;
  isRegisteredViaCurriculumServer: boolean;
  registrar: DomainRegistrarType;
  registeredDate?: string;
  expiryDate?: string;
  autoRenew: boolean;
  pricePerYearNGN: number;
  status: DomainRegistrationStatus;
  sslStatus: 'ssl_active' | 'ssl_issuing' | 'ssl_expired' | 'ssl_error';
  sslExpiresAt?: string;
  dnsRecords: DnsRecord[];
  cnameTarget: string;
  anycastIp: string;
  verificationToken: string;
  isPrimary: boolean;
  hstsEnabled: boolean;
  forceHttps: boolean;
  dnssecEnabled: boolean;
  lastCheckedTimestamp: string;
}

export interface TldPricingPlan {
  id?: string;
  tld: string;
  category: 'Nigerian Education' | 'Sovereign ccTLD' | 'Global Commercial' | 'Specialty Academy' | 'Custom Extension';
  priceNGN: number;
  renewPriceNGN: number;
  wholesaleCostNGN?: number;
  marginPercent?: number;
  popular?: boolean;
  requiresVerification?: boolean;
  accreditationBody?: string;
  description: string;
  isActive?: boolean;
  isCustom?: boolean;
}

export interface DomainPurchaseOrder {
  orderId: string;
  tenantId: string;
  tenantSchoolName: string;
  domainName: string;
  tld: string;
  years: number;
  amountNGN: number;
  registrantName: string;
  registrantEmail: string;
  registrantPhone: string;
  schoolRegistrationNumber?: string;
  registrar: DomainRegistrarType;
  paymentMethod: 'paystack' | 'flutterwave' | 'bursary_ledger' | 'direct_wire';
  paymentStatus: 'paid' | 'pending' | 'failed';
  createdAt: string;
  dnsProvisioned: boolean;
  transactionRef: string;
}

export type DnsPropagationStatus = 
  | 'fully_propagated' 
  | 'partially_propagated' 
  | 'propagating' 
  | 'unresolved';

export interface DnsPropagationNodeResult {
  nodeId: string;
  location: string;
  region: string;
  flag: string;
  dnsServer: string;
  ip: string;
  resolvedValue: string;
  expectedValue: string;
  status: 'matched' | 'mismatched' | 'pending' | 'timeout';
  latencyMs: number;
  lastChecked: string;
}

export interface DnsPropagationCheckSummary {
  domain: string;
  recordType: DnsRecordType;
  expectedTarget: string;
  propagationScore: number; // 0 - 100%
  status: DnsPropagationStatus;
  totalNodes: number;
  healthyNodes: number;
  averageLatencyMs: number;
  checkedAt: string;
  nodeResults: DnsPropagationNodeResult[];
}

// =================================================================
// PRODUCTION MULTI-TENANT CONTROL PLANE & PROVISIONING TYPES
// =================================================================

export type ProvisioningState = 
  | 'PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'TENANT_CREATED'
  | 'DATABASE_PROVISIONING'
  | 'DATABASE_READY'
  | 'STORAGE_PROVISIONING'
  | 'APP_PROVISIONING'
  | 'CONFIGURING'
  | 'DOMAIN_CONFIGURING'
  | 'SSL_CONFIGURING'
  | 'HEALTH_CHECK'
  | 'READY'
  | 'ACTIVE'
  | 'FAILED'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'DECOMMISSIONING';

export type ProvisioningStepId = 
  | 'payment_confirmation'
  | 'tenant_record'
  | 'database_creation'
  | 'database_migration'
  | 'storage_namespace'
  | 'docker_app_stack'
  | 'secrets_injection'
  | 'feature_entitlements'
  | 'domain_dns_routing'
  | 'ssl_handshake'
  | 'health_check_verification'
  | 'admin_activation';

export interface ProvisioningStepItem {
  id: ProvisioningStepId;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  logs: string[];
}

export interface ProvisioningJobRun {
  jobId: string;
  tenantId: string;
  schoolName: string;
  currentState: ProvisioningState;
  initiatedAt: string;
  completedAt?: string;
  steps: ProvisioningStepItem[];
  overallProgress: number; // 0 - 100%
  errorSummary?: string;
  canRetry: boolean;
  activeStepIndex: number;
}

export type FeatureEntitlementState = 
  | 'ACTIVE' 
  | 'PENDING_UPGRADE' 
  | 'PENDING_DOWNGRADE' 
  | 'SCHEDULED_FOR_REMOVAL' 
  | 'SUSPENDED' 
  | 'CANCELLED';

export interface TenantFeatureEntitlement {
  featureKey: OptionalFeatureKey;
  state: FeatureEntitlementState;
  enabledAt: string;
  scheduledChangeDate?: string;
  gracePeriodEndsAt?: string;
  version: string;
  autoRenew: boolean;
}

export interface TenantContainerHealth {
  frontendStatus: 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  frontendPort: number;
  apiStatus: 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  apiPort: number;
  workerStatus: 'healthy' | 'idle' | 'busy' | 'stopped';
  activeWorkerJobs: number;
  databaseStatus: 'connected' | 'reconnecting' | 'failed';
  databaseName: string;
  storageNamespace: string;
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
  latencyMs: number;
  lastHealthCheck: string;
}

export interface TenantResourcePolicy {
  cpuLimitCores: number;
  memoryLimitMb: number;
  storageQuotaMb: number;
  rateLimitReqPerMin: number;
  maxConcurrentBackgroundJobs: number;
  aiMonthlyTokenLimit: number;
  aiTokensUsedCurrentCycle: number;
  aiExamsGeneratedCount: number;
  maxStudentsLimit: number;
  maxTeachersLimit: number;
}

export type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
export type JobType = 
  | 'EXAM_PAPER_GENERATION'
  | 'MARKING_SCHEME_GENERATION'
  | 'LESSON_NOTE_SYNTHESIS'
  | 'ADAPTIVE_REMEDIAL_BATCH'
  | 'BROADSHEET_COMPILATION'
  | 'DATABASE_BACKUP_SNAPSHOT'
  | 'DATABASE_RESTORE_VERIFY'
  | 'BULK_STUDENT_ENROLLMENT'
  | 'DNS_PROPAGATION_POLL';

export interface BackgroundJob {
  jobId: string;
  tenantId: string;
  tenantSchoolName: string;
  jobType: JobType;
  priority: JobPriority;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progressPercent: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  payloadSummary: string;
  resultPayload?: any;
}

export interface PlatformAuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  tenantId?: string;
  tenantSchoolName?: string;
  action: 
    | 'tenant_created'
    | 'tenant_provisioning_started'
    | 'tenant_provisioning_completed'
    | 'tenant_provisioning_failed'
    | 'subscription_created'
    | 'subscription_upgraded'
    | 'subscription_downgraded'
    | 'feature_enabled'
    | 'feature_disabled'
    | 'domain_added'
    | 'dns_record_changed'
    | 'app_deployed'
    | 'app_upgraded'
    | 'app_rolled_back'
    | 'tenant_suspended'
    | 'tenant_reactivated'
    | 'tenant_archived'
    | 'backup_created'
    | 'backup_restored'
    | 'payment_received'
    | 'psp_webhook_processed'
    | 'admin_login'
    | 'admin_action'
    | (string & {});
  target: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING' | 'BLOCKED' | (string & {});
  ipAddress?: string;
  deviceMetadata?: string;
  details: string;
}

export interface TenantBackupSnapshot {
  snapshotId: string;
  tenantId: string;
  tenantSchoolName: string;
  databaseName: string;
  storageNamespace: string;
  createdAt: string;
  sizeMb: number;
  databaseTablesCount: number;
  filesCount: number;
  checksumSha256: string;
  storageLocation: string;
  status: 'available' | 'restoring' | 'corrupted' | 'archived';
  lastVerificationDate?: string;
  isAutomatedNightly: boolean;
}

export interface AppVersionCatalogItem {
  version: string; // e.g. "v1.4.2"
  dockerImageTag: string; // "curriculumflow-app:1.4.2"
  dbSchemaVersion: string; // "db_schema_v14"
  releasedAt: string;
  isStable: boolean;
  isCanary: boolean;
  releaseNotes: string[];
  minimumCompatibleVersion: string;
}

export type WebhookEventType = 
  | 'tenant.created'
  | 'tenant.provisioning.completed'
  | 'tenant.provisioning.failed'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'feature.enabled'
  | 'feature.disabled'
  | 'domain.verified'
  | 'domain.updated'
  | 'application.deployed'
  | 'application.updated'
  | 'application.failed'
  | 'exam.generated'
  | 'exam.released'
  | 'payment.charge.success'
  | 'payment.charge.failed'
  | 'payment.opay.virtual_nuban_credited'
  | 'payment.opay.push_checkout_completed'
  | 'payment.paystack.subscription_renewed'
  | 'payment.paystack.split_settled'
  | 'payment.refund.processed';

export interface PlatformWebhookSubscription {
  id: string;
  tenantId: string;
  endpointUrl: string;
  secret: string;
  subscribedEvents: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  successRatePercent: number;
}

export interface PlatformWebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  tenantId: string;
  event: WebhookEventType;
  payload: any;
  signature: string;
  status: 'delivered' | 'retrying' | 'failed';
  httpStatusCode?: number;
  timestamp: string;
  attemptNumber: number;
  latencyMs: number;
  responseBodySnippet?: string;
}

export interface ApiSubscriptionKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  scopes: string[]; // e.g. ["curriculum:read", "students:write", "exams:read"]
  rateLimitPerMin: number;
  createdAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
}

export interface TenantIsolationTestResult {
  testId: string;
  name: string;
  category: 'database' | 'storage' | 'api' | 'entitlement' | 'noisy_neighbor' | 'dns' | 'secrets' | 'security';
  tenantA: string;
  tenantB: string;
  passed: boolean;
  executionTimeMs: number;
  details: string;
  securityProof: string;
}

// -----------------------------------------------------------------
// ADMINISTRATIVE ASSISTANT & PRINCIPAL EXECUTIVE REGISTRY WORKFLOWS
// -----------------------------------------------------------------
export type PrincipalMemoUrgency = 'routine' | 'priority' | 'urgent_immediate_action';
export type PrincipalMemoAudience = 
  | 'all_teachers' 
  | 'hods' 
  | 'senior_secondary_staff' 
  | 'junior_secondary_staff' 
  | 'administrative_staff' 
  | 'all_school_community';

export interface PrincipalMemoDispatch {
  id: string;
  memoRefNumber: string; // e.g. "PR/EXEC/2026/042"
  title: string;
  sender: string; // "Office of the Principal"
  preparedByAssistant: string; // "Mrs. Folashade Adeleke"
  targetAudience: PrincipalMemoAudience;
  urgency: PrincipalMemoUrgency;
  content: string;
  dispatchedAt: string;
  acknowledgmentsCount: number;
  totalRecipientsCount: number;
  status: 'draft_for_principal_signature' | 'signed_and_dispatched' | 'archived';
  principalSigned: boolean;
  principalSignedAt?: string;
  attachmentUrl?: string;
}

export type VisitorStatus = 'active_on_premises' | 'cleared_and_departed' | 'appointment_pending' | 'escorted_to_principal';
export type VisitorIdType = 'National NIN Card' | "Driver's License" | 'International Passport' | 'Voter Card' | 'Staff / Corporate ID';

export interface VisitorLogEntry {
  id: string;
  badgeNumber: string; // e.g. "VIS-2026-088"
  visitorName: string;
  visitorPhone: string;
  visitorOrganization: string;
  purposeOfVisit: string;
  personToSee: string; // "Principal Dr. Mustapha" | "VP Academic" | "Bursary" | "Registry Desk"
  timeIn: string;
  timeOut?: string;
  status: VisitorStatus;
  idCardTypeVerified: VisitorIdType;
  escortAssigned?: string;
  entryClearanceNotes?: string;
  principalApproved?: boolean;
}

export interface TeacherReliefAssignment {
  id: string;
  date: string;
  periodSlot: string; // e.g. "Period 3 (10:00 - 10:45 AM)"
  absentTeacherName: string;
  subjectName: string;
  classGroupName: string; // e.g. "SS 2 Gold"
  assignedReliefTeacherName: string;
  dutyLocation: string; // "Room 204, Senior Block"
  lessonWorkAssigned: string;
  reliefStatus: 'assigned' | 'in_progress' | 'completed' | 'unassigned_alert';
  principalEndorsement: boolean;
  notes?: string;
}

export type OfficialDocType = 
  | 'Official Academic Transcript' 
  | 'Certificate of Clearance' 
  | 'Character Testimonial' 
  | 'Transfer Certificate' 
  | 'Visa Embassy Verification Letter' 
  | 'Statement of WAEC/BECE Results';

export type DocProcessingStatus = 
  | 'submitted' 
  | 'assistant_compiled' 
  | 'principal_seal_applied' 
  | 'issued_to_client' 
  | 'dispatched_via_courier';

export interface OfficialDocumentRequest {
  id: string;
  requestNumber: string; // e.g. "DOC-REQ-2026-119"
  studentName: string;
  admissionNumber: string;
  documentType: OfficialDocType;
  requestedBy: string;
  destinationInstitution?: string;
  paymentStatus: 'fee_cleared' | 'fee_exempt_scholar' | 'payment_pending';
  bursaryReceiptNumber?: string;
  processingStatus: DocProcessingStatus;
  issuedDate?: string;
  verificationQrCode: string;
  signedByPrincipal: boolean;
  principalSignatureRef?: string;
  trackingNumber?: string;
}

export interface FacilityBookingEntry {
  id: string;
  facilityName: string; // "Main Multi-Purpose Auditorium", "Advanced Science Lab Alpha", "Digital ICT CBT Suite 1", "Olympic Sports Pavilion", "Executive Boardroom"
  bookedBy: string;
  department: string;
  eventTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  expectedAttendance: number;
  technicalRequirements: string[];
  approvalStatus: 'approved_by_admin_assistant' | 'pending_principal_nod' | 'completed' | 'cancelled';
  notes?: string;
}

export interface DelegatedPrincipalRBACPolicy {
  policyId: string;
  policyCode: string; // e.g. "PR-IAM-DELEGATE-2026-A"
  policyTitle: string;
  grantedToUserId: string;
  grantedToUserName: string;
  grantedByPrincipalName: string;
  effectiveDate: string;
  expiryDate: string;
  status: 'active_enforced' | 'elevation_requested' | 'suspended_by_principal';
  activePermissions: {
    canDispatchPrincipalMemos: boolean;
    canProcessTranscriptsAndCertificates: boolean;
    canManageVisitorRegistry: boolean;
    canAssignTeacherReliefRoster: boolean;
    canManageFacilityBookings: boolean;
    canVerifyBursaryClearance: boolean;
    canAccessStudentRegistry: boolean;
    canManageStaffDutyRoster: boolean;
    canElevateToPrincipalDirectLine: boolean;
    canIssueStudentIdentityPasses: boolean;
  };
  principalDelegationSeal: string;
  auditTrail: {
    timestamp: string;
    action: string;
    actor: string;
  }[];
}

// -----------------------------------------------------------------
// STUDENT & PARENT DASHBOARD INTERACTIVE DATA MODELS & RLS TYPES
// -----------------------------------------------------------------
export interface StudentAssignmentItem {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  dueDate: string;
  formattedDue: string; // e.g. "Due May 22"
  status: 'pending' | 'submitted' | 'graded';
  score?: number;
  maxScore: number;
  teacherName: string;
  submissionDate?: string;
  instructions: string;
  teacherFeedback?: string;
}

export interface StudentPerformanceEntry {
  subject: string;
  score: number; // 0 - 100
  termGrade: string; // "A", "B", "C"
  ca1Score: number; // /20
  ca2Score: number; // /20
  examScore: number; // /60
  subjectTeacher: string;
  remarks: string;
}

export interface StudentTimetableSlot {
  id: string;
  time: string; // "8:00 AM"
  endTime: string; // "8:45 AM"
  subject: string;
  teacher: string;
  room: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  currentActive?: boolean;
}

export interface StudentExamScheduleItem {
  id: string;
  subject: string;
  examDate: string;
  time: string;
  venue: string;
  seatNumber: string;
  format: 'CBT Computer-Based' | 'Written Paper';
  durationMinutes: number;
  hallPassVerified: boolean;
}

export interface StudentStudyResourceItem {
  id: string;
  title: string;
  subject: string;
  type: 'Study Materials' | 'Past Questions' | 'E-Library' | 'Video Tutorial';
  fileSize: string;
  downloadsCount: number;
  downloadUrl?: string;
}

export interface PortalMessageItem {
  id: string;
  senderName: string;
  senderRole: string; // "Mr. Daniel Adeyemi (Maths Master)" | "Office of the Principal" | "Class Master"
  senderAvatar: string;
  recipientId: string;
  subject: string;
  preview: string;
  fullMessage: string;
  timestamp: string;
  timeAgo: string; // "2h ago", "1d ago"
  isRead: boolean;
  isImportant?: boolean;
}

export interface PortalAnnouncementItem {
  id: string;
  title: string;
  category: 'Academic' | 'Administrative' | 'Sports' | 'Examination' | 'Health';
  publishedBy: string;
  publishedDate: string;
  timeAgo: string; // "1d ago", "2d ago"
  content: string;
  isPinned?: boolean;
}

export interface ParentFeeInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-TER2-092"
  wardId: string;
  wardName: string;
  term: string; // "Term 2, 2025/2026"
  items: {
    description: string;
    amount: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'overdue' | 'pending';
  receiptNumber?: string;
  paymentGatewayRef?: string;
}

export interface ParentConsentSlip {
  id: string;
  wardId: string;
  wardName: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  cost: number;
  deadline: string;
  description: string;
  status: 'approved' | 'declined' | 'pending';
  approvedAt?: string;
  parentNotes?: string;
}

export interface ParentPickupPassData {
  id: string;
  wardId: string;
  wardName: string;
  authorizedPersonName: string;
  relationship: string;
  phone: string;
  vehicleRegNumber?: string;
  qrCodeData: string;
  passPin: string;
  validUntil: string;
  status: 'active' | 'used_today' | 'revoked';
}

export interface RLSAccessContext {
  userId: string;
  userRole: UserRole;
  allowedStudentIds: string[]; // RLS filter: Students this user is allowed to view
  allowedParentIds: string[]; // RLS filter: Parents this user is allowed to view
  isSuperAdmin: boolean;
  isPrincipalAdmin: boolean;
}

// -----------------------------------------------------------------
// 1. TERMINAL REPORT CARD & TRANSCRIPT PRINT STUDIO
// -----------------------------------------------------------------
export interface SubjectScoreBreakdown {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  ca1Score: number; // Max 20
  ca2Score: number; // Max 20
  examScore: number; // Max 60
  totalScore: number; // Max 100
  grade: 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
  remark: 'Distinction' | 'Very Good' | 'Good' | 'Credit' | 'Pass' | 'Fail';
  classHighest: number;
  classLowest: number;
  classAverage: number;
  positionInSubject: number;
  subjectTeacherName: string;
}

export interface AffectiveDomainRating {
  trait: string; // e.g. 'Punctuality', 'Neatness', 'Politeness', 'Honesty', 'Leadership', 'Teamwork'
  rating: 1 | 2 | 3 | 4 | 5; // 5: Excellent, 4: Good, 3: Fair, 2: Poor, 1: Very Poor
}

export interface PsychomotorDomainRating {
  skill: string; // e.g. 'Handwriting', 'Sports & Games', 'Crafts & Arts', 'Laboratory Skills', 'Public Speaking'
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface TerminalReportCard {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  classArm: string; // e.g. 'SS 2 Alpha'
  academicSession: string; // '2025/2026'
  term: Term;
  avatarUrl?: string;
  dob?: string;
  gender: 'Male' | 'Female';
  
  // Attendance metrics
  timesSchoolOpened: number;
  timesPresent: number;
  timesPunctual: number;
  
  // Academic metrics
  subjectScores: SubjectScoreBreakdown[];
  totalMarksObtained: number;
  totalMarksPossible: number;
  averagePercentage: number;
  gpa: number; // 0.0 - 5.0 scale
  classPosition: number;
  totalStudentsInClass: number;
  cohortPosition: number;
  totalStudentsInCohort: number;
  
  // Domains
  affectiveRatings: AffectiveDomainRating[];
  psychomotorRatings: PsychomotorDomainRating[];
  
  // Remarks & Signatures
  formTeacherRemark: string;
  formTeacherName: string;
  principalRemark: string;
  principalName: string;
  principalSignatureStampUrl?: string;
  nextTermBeginsDate: string;
  nextTermFeesNGN: number;
  
  // Official security seal
  qrSecurityVerificationCode: string;
  issueDate: string;
  isPublished: boolean;
}

export interface MultiYearTranscriptRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  graduationYear?: string;
  cumulativeGPA: number;
  classRankPercentile: number;
  termlySummaries: {
    session: string;
    term: Term;
    classGrade: ClassGrade;
    termAverage: number;
    gpa: number;
    position: number;
    totalStudents: number;
    subjectsCount: number;
    status: 'Pass' | 'Distinction' | 'Promoted' | 'Trial';
  }[];
}

// -----------------------------------------------------------------
// 2. IN-HOUSE PROMOTIONS & MOCK EXAMINATION MANAGEMENT
// -----------------------------------------------------------------
export type PromotionOutcome = 
  | 'promoted' 
  | 'promoted_on_trial' 
  | 'repeat_class' 
  | 'recommended_for_withdrawal' 
  | 'pending_deliberation';

export interface PromotionRuleCriteria {
  id: string;
  targetClassGrade: ClassGrade; // e.g., 'SS 2'
  promotedToGrade: ClassGrade; // e.g., 'SS 3'
  minimumCumulativeAverage: number; // e.g., 50%
  mustPassEnglish: boolean;
  mustPassMathematics: boolean;
  minimumCreditPassesCount: number; // e.g., 5 subjects with >= 50%
  minimumAttendancePercentage: number; // e.g., 75%
  maxAllowedFails: number;
  trialEligibilityMargin: number; // e.g., within 5% of cutoff
}

export interface StudentPromotionRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  classArm: string;
  term1Average: number;
  term2Average: number;
  term3Average: number;
  annualCumulativeAverage: number;
  totalCreditsCount: number;
  passedEnglish: boolean;
  passedMathematics: boolean;
  overallAttendanceRate: number;
  computedOutcome: PromotionOutcome;
  finalDecision: PromotionOutcome;
  councilRemarks: string;
  deliberatedBy?: string;
  deliberatedAt?: string;
}

export type MockExamType = 'waec_mock' | 'neco_mock' | 'bece_mock' | 'jamb_utme_trial';

export interface MockExamSchedule {
  id: string;
  title: string; // e.g. "2026 SS 3 Joint WAEC Pre-Mock Examinations"
  examType: MockExamType;
  academicSession: string;
  targetGrades: ClassGrade[];
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'grading' | 'published';
  totalCandidates: number;
  participatingArms: string[];
  chiefExaminer: string;
  centerCode: string;
}

export interface MockCandidateScore {
  id: string;
  mockExamId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  indexNumber: string; // e.g., 'WAEC/MOCK/2026/042'
  classArm: string;
  subjectScores: {
    subjectName: string;
    subjectCode: string;
    paper1ObjScore: number; // 40
    paper2TheoryScore: number; // 60
    totalScore: number; // 100
    grade: 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
    predictedWaecScore: string; // e.g. "Likely Credit (B3-C4)"
  }[];
  totalAggregatePoints: number;
  aggregateAverage: number;
  waecReadinessIndex: 'High Distinction' | 'Credit Ready' | 'Borderline at Risk' | 'Critical Intervention';
}

// -----------------------------------------------------------------
// 3. PHASED DOCKER-PER-TENANT ORCHESTRATION & RUNTIME SERVICE
// -----------------------------------------------------------------
export type ContainerLifecycleState = 
  | 'PROVISIONING'
  | 'WARM_STANDBY'
  | 'ACTIVE_RUNNING'
  | 'ISOLATED_SANDBOX'
  | 'DRAINING'
  | 'MIGRATING'
  | 'COLD_HIBERNATED'
  | 'FAILED_OOM'
  | 'TERMINATED';

export interface ContainerCgroupLimits {
  cpuCoresLimit: number; // e.g. 2.0
  memoryLimitMb: number; // e.g. 2048 MB
  memorySwapMb: number;
  cpuShares: number; // 1024
  ioBandwidthMbPerSec: number;
  maxProcesses: number; // 256
  networkNamespace: string; // 'ns-tenant-kings-lagos'
}

export interface DockerTenantContainer {
  containerId: string;
  tenantId: string;
  tenantSchoolName: string;
  subdomain: string;
  dockerImageTag: string; // e.g. 'curriculumflow/tenant-runtime:v2.4.8-alpine'
  lifecycleState: ContainerLifecycleState;
  nodeHostName: string; // e.g. 'gcp-eu-west2-worker-pod-04'
  ipAddress: string; // e.g. '10.244.12.84'
  port: number; // 3000
  uptimeSeconds: number;
  cgroupLimits: ContainerCgroupLimits;
  
  // Real-time telemetry
  currentCpuUsagePercent: number;
  currentMemoryUsageMb: number;
  currentMemoryPercent: number;
  activeRequestsPerSec: number;
  lastHealthCheckTimestamp: string;
  healthCheckStatus: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
  coldStartRecoveryTimeMs: number;
  
  // Storage & Database Shard Isolation
  databaseShardId: string;
  databaseHost: string;
  databaseSchema: string; // e.g. 'tenant_kings_lagos_prod'
  isEncryptedAtRest: boolean;
  isolationSecurityLevel: 'L3_CGROUP_NAMESPACE_ISOLATED' | 'L4_VIRTUAL_MACHINE_MICROVM';
}

export interface ShardMigrationJob {
  migrationId: string;
  tenantId: string;
  sourceNode: string;
  targetNode: string;
  sourceShard: string;
  targetShard: string;
  status: 'QUEUED' | 'COPYING_DATA' | 'REPLAYING_WAL' | 'DRAINING_TRAFFIC' | 'COMPLETED' | 'ROLLBACK';
  progressPercent: number;
  startedAt: string;
  estimatedCompletionAt: string;
  zeroDowntimeCutoverMs: number;
  bytesTransferredMb: number;
  totalBytesMb: number;
}

// -----------------------------------------------------------------
// 5. LOGISTICS SUPPORT MANAGEMENT (BUNDLE 5) TYPES
// -----------------------------------------------------------------

// A. Gate Security Kiosk & Guardian Pickup Scanner
export type ExitAuthorizationStatus = 'authorized_exit' | 'flagged_invalid_pin' | 'unauthorized_guardian' | 'pending_verification' | 'revoked_pass';

export interface GatePickupPass {
  id: string;
  passCode: string; // e.g. "GT-PASS-2026-892"
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  studentPhotoUrl: string;
  primaryParentName: string;
  authorizedGuardianName: string;
  relationship: string;
  guardianPhone: string;
  guardianPhotoUrl: string;
  guardianNinOrId: string;
  qrPayload: string;
  pinCode: string;
  validDate: string; // YYYY-MM-DD
  expiryTime: string; // e.g. "18:00"
  vehicleRegNumber?: string;
  isBoardingStudent: boolean;
  activeExeatApproved?: boolean;
  status: 'active' | 'scanned_out' | 'expired' | 'revoked';
}

export interface GateSecurityScanLog {
  id: string;
  timestamp: string;
  passId: string;
  studentId: string;
  studentName: string;
  guardianName: string;
  securityOfficerName: string;
  gateLocation: 'Main Front Gate Kiosk' | 'Boarding House South Gate' | 'Sports Complex Gate' | 'Staff Car Park Gate';
  authorizationStatus: ExitAuthorizationStatus;
  notes?: string;
  smsAlertSentToParent: boolean;
}

// B. Digital E-Library & Curriculum Resource Repository
export type LibraryResourceType = 
  | 'nerdc_textbook' 
  | 'waec_past_paper' 
  | 'neco_past_paper' 
  | 'jamb_utme_series' 
  | 'audio_courseware' 
  | 'video_lecture' 
  | 'interactive_pdf' 
  | 'staff_uploaded_worksheet';

export interface LibraryResourceItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  classGrade: ClassGrade | 'All Grades';
  level: 'jss' | 'sss' | 'all';
  type: LibraryResourceType;
  format: 'PDF' | 'MP3' | 'MP4' | 'EPUB' | 'ZIP';
  fileSizeMb: number;
  authorOrPublisher: string; // e.g. "NERDC / Learn Africa", "WAEC Council Secretariat"
  editionOrYear: string; // e.g. "2025 Revised Edition", "WAEC 2024 Past Questions with Solution Key"
  downloadCount: number;
  viewCount: number;
  coverImageUrl: string;
  fileDownloadUrl: string;
  description: string;
  curriculumAlignedThemes: string[];
  isStaffUploaded?: boolean;
  uploadedByStaffName?: string;
  uploadedAt?: string;
  isVerifiedByHOD: boolean;
}

export interface LibraryResourceUploadPayload {
  title: string;
  subjectName: string;
  classGrade: ClassGrade | 'All Grades';
  type: LibraryResourceType;
  format: 'PDF' | 'MP3' | 'MP4' | 'EPUB';
  description: string;
  authorOrStaffName: string;
  editionOrYear: string;
  tags: string[];
  fileSizeMb: number;
  fileDataUrl?: string;
  fileName?: string;
}

// C. Boarding House & Hostel Management Suite
export interface HostelRoom {
  id: string;
  roomNumber: string; // e.g. "Room 101"
  floor: 'Ground Floor' | 'First Floor' | 'Second Floor';
  totalBeds: number;
  occupiedBeds: number;
  bedNumbers: string[];
  wing: 'North Wing' | 'South Wing' | 'East Wing' | 'West Wing';
  isIsolationRoom?: boolean;
  prefectInCharge?: string;
}

export interface HostelDormitory {
  id: string;
  name: string; // e.g. "Queen Amina Hall", "King Jaja of Opobo Hall", "Sir Ahmadu Bello House", "Moremi Hall"
  gender: 'Boys' | 'Girls';
  category: 'Junior Secondary' | 'Senior Secondary' | 'Mixed';
  houseMasterName: string;
  houseMasterPhone: string;
  assistantHouseMasterName: string;
  totalCapacity: number;
  occupiedCount: number;
  availableBeds: number;
  occupancyRatePercent: number;
  colorHex: string;
  rooms: HostelRoom[];
  prefectsCount: number;
  status: 'optimal' | 'near_capacity' | 'full' | 'maintenance';
}

export type ExeatType = 'weekend_home' | 'medical_hospital' | 'family_emergency' | 'academic_competition' | 'official_school_errand';
export type ExeatApprovalStatus = 'pending_housemaster' | 'approved_by_housemaster' | 'approved_by_principal' | 'rejected_by_housemaster' | 'departed_campus' | 'returned_and_signed_in' | 'overdue_return';

export interface StudentExeatRequest {
  id: string;
  exeatNumber: string; // e.g. "EXT-2026-084"
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGrade: ClassGrade;
  dormitoryId: string;
  dormitoryName: string;
  roomNumber: string;
  exeatType: ExeatType;
  reason: string;
  destinationAddress: string;
  destinationState: string;
  parentOrGuardianName: string;
  parentPhone: string;
  departureDate: string;
  departureTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
  actualReturnTimestamp?: string;
  status: ExeatApprovalStatus;
  houseMasterNotes?: string;
  houseMasterApprovedAt?: string;
  houseMasterName?: string;
  gateExitScannedAt?: string;
  gateReturnScannedAt?: string;
  parentConsentConfirmed: boolean;
  qrVerificationHash: string;
}

export interface EveningRollCallEntry {
  id: string;
  date: string;
  dormitoryId: string;
  dormitoryName: string;
  totalBoarders: number;
  presentCount: number;
  absentOnApprovedExeat: number;
  absentInSickBay: number;
  unaccountedAbsenceCount: number;
  conductedBy: string; // House Master or Prefect
  timestamp: string;
  remarks: string;
}

export interface DiningMealRegister {
  id: string;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  menuItems: string[];
  specialDietMealsCount: number;
  totalBoardersServed: number;
  inspectionPassedByNurse: boolean;
  foodCommitteeRepresentative: string;
  notes?: string;
}

// D. School Bus Transportation & Route Management
export interface BusStopLocation {
  id: string;
  stopName: string; // e.g. "Lekki Phase 1 Gate", "Admiralty Way Junction", "Ajah Roundabout", "Ikeja GRA Mall"
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number; // e.g. 500 meters
  estimatedArrivalMorning: string; // "06:45 AM"
  estimatedArrivalAfternoon: string; // "04:15 PM"
  assignedStudentIds: string[];
  assignedStudentCount: number;
}

export interface BusRoute {
  id: string;
  routeCode: string; // e.g. "BUS-RT-01 (Island Express)", "BUS-RT-02 (Mainland Shuttle)"
  routeName: string;
  assignedBusVehicleId: string;
  busPlateNumber: string;
  driverName: string;
  driverPhone: string;
  busAttendantName: string;
  busAttendantPhone: string;
  capacity: number;
  totalAssignedStudents: number;
  routeStops: BusStopLocation[];
  currentTripStatus: 'idle_at_school' | 'morning_pickup_in_progress' | 'morning_trip_completed' | 'afternoon_dropoff_in_progress' | 'afternoon_trip_completed' | 'maintenance_grounded';
  currentActiveStopIndex: number;
  gpsCoordinates: {
    lat: number;
    lng: number;
    speedKmh: number;
    headingDeg: number;
    lastUpdated: string;
  };
}

export interface BusTripPassengerLog {
  id: string;
  tripDate: string;
  routeId: string;
  routeCode: string;
  studentId: string;
  studentName: string;
  classGrade: ClassGrade;
  busStopName: string;
  parentName: string;
  parentPhone: string;
  checkInStatus: 'boarded' | 'absent_not_at_stop' | 'dropped_off_safely' | 'parent_picked_manually';
  checkInTime?: string;
  dropOffTime?: string;
  scannedByAttendant: boolean;
}

export interface BusDriverProfile {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  yearsOfExperience: number;
  assignedBusNumber: string;
  medicalClearanceStatus: 'passed' | 'review_required';
  safetyRating: number; // 4.9 / 5.0
  lastDrugTestDate: string;
}

export interface BusMaintenanceRecord {
  id: string;
  busVehicleId: string;
  plateNumber: string;
  serviceType: 'Routine 5000km Engine Oil & Filter' | 'Brake Pad & Hydraulic Overhaul' | 'Tire Replacement & Wheel Alignment' | 'Air Conditioning Servicing' | 'Comprehensive Safety MOT';
  serviceDate: string;
  mileageKm: number;
  costNgn: number;
  servicedByWorkshop: string;
  nextServiceDueDate: string;
  approvedByTransportOfficer: string;
  status: 'completed' | 'scheduled_pending' | 'urgent_attention';
}

export interface ParentGeofenceAlertNotification {
  id: string;
  timestamp: string;
  busRouteCode: string;
  busPlateNumber: string;
  stopName: string;
  studentName: string;
  parentPhone: string;
  parentName: string;
  alertType: 'approaching_geofence' | 'arrived_at_stop' | 'student_boarded' | 'student_dropped_off';
  messageText: string;
  isRead: boolean;
}





