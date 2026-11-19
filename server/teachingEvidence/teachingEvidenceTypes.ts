export type DeliveryWorkflowStatus =
  | 'assigned'
  | 'received'
  | 'opened'
  | 'acknowledged'
  | 'taught'
  | 'completed';

export type AssignmentStatus = 'active' | 'suspended' | 'expired' | 'revoked';

export type CurriculumResolutionStatus = 'resolved' | 'unresolved' | 'manually_mapped';

export type CoverageMode = 'full' | 'partial' | 'none';

export type UnderstandingLevel = 'excellent' | 'good' | 'fair' | 'poor';
export type StudentEngagementLevel = 'high' | 'medium' | 'low';
export type VerificationBasis = 'teacher_self_reported' | 'admin_verified' | 'peer_verified';
export type AdminVerificationStatus = 'unverified' | 'verified' | 'flagged';

export type ScopeAssessmentType =
  | 'quiz'
  | 'class_test'
  | 'test'
  | 'continuous_assessment'
  | 'assignment'
  | 'midterm_exam'
  | 'exam';

export type ScopeAuthorizationStatus = 'authorized' | 'superseded' | 'revoked';

export type TeachingEvidenceErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_COMPLETION'
  | 'UNRESOLVED_CURRICULUM'
  | 'INSUFFICIENT_EVIDENCE'
  | 'SCOPE_AUTHORIZATION_REQUIRED'
  | 'SCOPE_MODIFICATION_CONFLICT';

export class TeachingEvidenceError extends Error {
  constructor(
    public readonly code: TeachingEvidenceErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TeachingEvidenceError';
  }
}

export interface TeacherSubjectAssignment {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  schoolId: string;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  subjectName: string;
  curriculumVersionId: string;
  staffId: string;
  teacherUserId: string;
  status: AssignmentStatus;
  assignedBy: string;
  assignedAt: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LessonNoteRecord {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  assignmentId: string;
  schoolId: string;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  curriculumVersionId: string;
  topicId: string | null;
  topicTitle: string;
  objectiveIds: string[];
  title: string;
  noteContent: Record<string, unknown>;
  generationSource: 'teacher_authored' | 'ai_gateway' | 'imported';
  aiGatewayRequestId: string | null;
  countsAsTaught: false;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingDeliveryRecord {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  assignmentId: string;
  schoolId: string;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  curriculumVersionId: string;
  topicId: string | null;
  topicTitleInput: string;
  resolvedTopicTitle: string | null;
  resolutionStatus: CurriculumResolutionStatus;
  resolutionNotes: string | null;
  lessonNoteId: string | null;
  weekNumber: number;
  scheduledDate: string;
  status: DeliveryWorkflowStatus;
  receivedAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  taughtAt: string | null;
  completedAt: string | null;
  completionConfirmedByTeacher: boolean;
  completionTeacherUserId: string | null;
  completionIdempotencyKey: string | null;
  coverageMode: CoverageMode;
  coveredObjectiveIds: string[];
  uncoveredObjectiveIds: string[];
  understandingLevel: UnderstandingLevel | null;
  studentEngagement: StudentEngagementLevel | null;
  remedialNeeded: boolean;
  remedialTopic: string | null;
  teacherComments: string;
  challengesNoted: string | null;
  verificationBasis: VerificationBasis;
  adminVerificationStatus: AdminVerificationStatus;
  adminVerifiedBy: string | null;
  adminVerifiedAt: string | null;
  recordVersion: number;
  usedInAssessmentCount: number;
  correctionReason: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingDeliveryAuditEntry {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  deliveryRecordId: string | null;
  assignmentId: string | null;
  eventType:
    | DeliveryWorkflowStatus
    | 'corrected'
    | 'curriculum_mapped'
    | 'admin_verified'
    | 'evidence_retrieved';
  recordVersion: number;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  occurredAt: string;
}

export interface ResolvedCurriculumTopic {
  curriculumVersionId: string;
  curriculumVersionTag: string;
  curriculumVersionStatus: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicTitle: string;
  classGradeName: string;
  term: string;
  week: number;
  objectives: Array<{
    id: string;
    description: string;
    objectiveType: string;
    bloomLevel: string | null;
  }>;
  subtopics: Array<{
    id: string;
    title: string;
  }>;
}

export interface TopicResolutionOutcome {
  resolutionStatus: CurriculumResolutionStatus;
  resolvedTopic: ResolvedCurriculumTopic | null;
  reason: string;
}

export interface SubjectProgressSummary {
  assignmentId: string;
  tenantId: string;
  applicationInstanceId: string;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  subjectName: string;
  curriculumVersionId: string;
  teacherUserId: string;
  topicsInCurriculum: number;
  totalDeliveries: number;
  assignedCount: number;
  receivedCount: number;
  openedCount: number;
  acknowledgedCount: number;
  taughtCount: number;
  completedCount: number;
  verifiedTaughtTopicsCount: number;
  partiallyCoveredCount: number;
  notYetTaughtCount: number;
  unresolvedTopicsCount: number;
  remediationRequiredCount: number;
  coveragePercentage: number;
  verificationBasis: VerificationBasis | 'mixed';
  uncoveredObjectives: Array<{
    deliveryRecordId: string;
    topicId: string | null;
    topicTitle: string;
    objectiveIds: string[];
  }>;
  lastUpdatedAt: string | null;
}

export interface VerifiedTaughtTopicEvidence {
  deliveryRecordId: string;
  topicId: string;
  topicTitle: string;
  curriculumVersionId: string;
  weekNumber: number;
  status: 'taught' | 'completed';
  coverageMode: 'full' | 'partial';
  taughtAt: string;
  completedAt: string | null;
  coveredObjectives: Array<{
    id: string;
    description: string;
    bloomLevel: string | null;
  }>;
  uncoveredObjectiveIds: string[];
  remedialNeeded: boolean;
  remedialTopic: string | null;
  understandingLevel: UnderstandingLevel | null;
  verificationBasis: VerificationBasis;
  adminVerificationStatus: AdminVerificationStatus;
  recordVersion: number;
}

export interface VerifiedTaughtEvidenceBundle {
  assignment: TeacherSubjectAssignment;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  subjectName: string;
  curriculumVersionId: string;
  verifiedTopics: VerifiedTaughtTopicEvidence[];
  unresolvedExcludedCount: number;
  unconfirmedExcludedCount: number;
  lessonNotesExcludedCount: number;
  totalVerifiedTopics: number;
  totalCoveredObjectives: number;
  retrievedAt: string;
}

export interface AssessmentScopeAuthorization {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  assignmentId: string;
  schoolId: string;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  curriculumVersionId: string;
  teacherUserId: string;
  assessmentType: ScopeAssessmentType;
  title: string;
  scopeVersion: number;
  supersedesAuthorizationId: string | null;
  status: ScopeAuthorizationStatus;
  selectedTopicIds: string[];
  selectedObjectiveIds: string[];
  sourceDeliveryIds: string[];
  questionCount: number;
  questionTypesConfig: Record<string, number>;
  objectiveTheoryBalance: {
    objectivePercent: number;
    theoryPercent: number;
    practicalPercent: number;
  };
  totalMarks: number;
  difficultyMix: Record<string, number>;
  durationMinutes: number;
  instructions: string;
  scopeHash: string;
  authorizedByTeacherAt: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revocationReason: string | null;
  createdAt: string;
}

export interface AssessmentGenerationProvenanceRecord {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  scopeAuthorizationId: string;
  blueprintId: string | null;
  examConfigurationId: string | null;
  assignmentId: string;
  teacherUserId: string;
  academicSession: string;
  term: string;
  classId: string;
  section: string;
  subjectId: string;
  curriculumVersionId: string;
  verifiedTopicIds: string[];
  verifiedObjectiveIds: string[];
  sourceDeliveryIds: string[];
  generatedQuestionIds: string[];
  aiGatewayRequestId: string | null;
  providerId: string | null;
  modelId: string | null;
  generationStatus: 'generated' | 'insufficient_evidence' | 'rejected';
  rejectionReason: string | null;
  createdByUserId: string;
  createdAt: string;
}
