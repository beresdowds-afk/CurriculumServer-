import { unifiedApiClient } from './unifiedApiClient';

export type DeliveryWorkflowStatus =
  | 'assigned'
  | 'received'
  | 'opened'
  | 'acknowledged'
  | 'taught'
  | 'completed';

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

export interface TeacherSubjectAssignmentDto {
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
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  assignedBy: string;
  assignedAt: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedCurriculumTopicDto {
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

export interface LessonNoteRecordDto {
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

export interface TeachingDeliveryRecordDto {
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

export interface TeachingDeliveryAuditEntryDto {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  deliveryRecordId: string | null;
  assignmentId: string | null;
  eventType: string;
  recordVersion: number;
  actorUserId: string;
  actorRole: string;
  reason: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterSnapshot: Record<string, unknown>;
  occurredAt: string;
}

export interface SubjectProgressSummaryDto {
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

export interface VerifiedTaughtTopicEvidenceDto {
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

export interface VerifiedTaughtEvidenceBundleDto {
  assignment: TeacherSubjectAssignmentDto;
  academicSession: string;
  term: string;
  classId: string;
  classGradeName: string;
  section: string;
  subjectId: string;
  subjectName: string;
  curriculumVersionId: string;
  verifiedTopics: VerifiedTaughtTopicEvidenceDto[];
  unresolvedExcludedCount: number;
  unconfirmedExcludedCount: number;
  lessonNotesExcludedCount: number;
  totalVerifiedTopics: number;
  totalCoveredObjectives: number;
  retrievedAt: string;
}

export interface AssessmentScopeAuthorizationDto {
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

export interface AssessmentGenerationProvenanceDto {
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

export interface TaughtAssessmentGenerationResponseDto {
  title: string;
  subjectName: string;
  classGrade: string;
  assessmentType: string;
  totalMarks: number;
  coveredTopicsList: string[];
  guaranteeNote: string;
  questions: Array<{
    questionNumber: number;
    section: string;
    questionType: string;
    questionText: string;
    options?: Array<{ key: string; text: string }>;
    marks: number;
    topic: string;
    topicId?: string;
    learningObjectiveIds?: string[];
    cognitiveLevel: string;
    difficulty: string;
  }>;
  markingGuide: Array<{
    questionNumber: number;
    section: string;
    correctAnswer: string;
    modelAnswer: string;
    totalMarks: number;
    stepBreakdown: Array<{ stepDescription: string; marksAwarded: number }>;
    partialCreditRules: string;
  }>;
  scopeAuthorizationId: string;
  scopeVersion: number;
  curriculumVersionId: string;
  blueprint: { id: string; title: string; assessmentType: string; totalMarks: number };
  persistedQuestions: Array<{ id: string; stem: string; reviewStatus: string }>;
  provenance: AssessmentGenerationProvenanceDto;
  reviewRequired: true;
  reviewStatus: 'pending_review';
  gatewayRequestId: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const teachingEvidenceApiClient = {
  async listAssignments(
    filters: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      status?: string;
    } = {},
    applicationInstanceId?: string
  ): Promise<TeacherSubjectAssignmentDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      assignments: TeacherSubjectAssignmentDto[];
    }>(`/api/v1/teaching/assignments${buildQuery(filters)}`, { method: 'GET' }, applicationInstanceId);
    return res.assignments || [];
  },

  async createAssignment(
    payload: {
      schoolId?: string;
      academicSession: string;
      term: string;
      classId: string;
      section?: string;
      subjectId: string;
      curriculumVersionId: string;
      staffId?: string;
      teacherUserId: string;
      effectiveTo?: string | null;
      metadata?: Record<string, unknown>;
    },
    applicationInstanceId?: string
  ): Promise<TeacherSubjectAssignmentDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      assignment: TeacherSubjectAssignmentDto;
    }>(
      '/api/v1/teaching/assignments',
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.assignment;
  },

  async revokeAssignment(
    assignmentId: string,
    reason: string,
    applicationInstanceId?: string
  ): Promise<TeacherSubjectAssignmentDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      assignment: TeacherSubjectAssignmentDto;
    }>(
      `/api/v1/teaching/assignments/${encodeURIComponent(assignmentId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      applicationInstanceId
    );
    return res.assignment;
  },

  async listCurriculumTopicsForAssignment(
    assignmentId: string,
    applicationInstanceId?: string
  ): Promise<ResolvedCurriculumTopicDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      topics: ResolvedCurriculumTopicDto[];
    }>(
      `/api/v1/teaching/assignments/${encodeURIComponent(assignmentId)}/curriculum-topics`,
      { method: 'GET' },
      applicationInstanceId
    );
    return res.topics || [];
  },

  async listLessonNotes(
    assignmentId?: string,
    applicationInstanceId?: string
  ): Promise<LessonNoteRecordDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      lessonNotes: LessonNoteRecordDto[];
    }>(`/api/v1/teaching/lesson-notes${buildQuery({ assignmentId })}`, { method: 'GET' }, applicationInstanceId);
    return res.lessonNotes || [];
  },

  async createLessonNote(
    payload: {
      assignmentId: string;
      topicId?: string | null;
      topicTitle: string;
      objectiveIds?: string[];
      title: string;
      noteContent: Record<string, unknown>;
      generationSource?: 'teacher_authored' | 'ai_gateway' | 'imported';
      aiGatewayRequestId?: string | null;
    },
    applicationInstanceId?: string
  ): Promise<{ lessonNote: LessonNoteRecordDto; countsAsTaught: false; notice: string }> {
    return unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      lessonNote: LessonNoteRecordDto;
      countsAsTaught: false;
      notice: string;
    }>(
      '/api/v1/teaching/lesson-notes',
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
  },

  async listDeliveries(
    filters: {
      assignmentId?: string;
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      status?: string;
      resolutionStatus?: string;
    } = {},
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      deliveries: TeachingDeliveryRecordDto[];
    }>(`/api/v1/teaching/deliveries${buildQuery(filters)}`, { method: 'GET' }, applicationInstanceId);
    return res.deliveries || [];
  },

  async createDeliveryRecord(
    payload: {
      assignmentId: string;
      topicId?: string | null;
      topicTitle: string;
      lessonNoteId?: string | null;
      weekNumber?: number;
      scheduledDate?: string;
    },
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      '/api/v1/teaching/deliveries',
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.delivery;
  },

  async transitionDeliveryStage(
    deliveryId: string,
    targetStatus: 'received' | 'opened' | 'acknowledged',
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/transition`,
      { method: 'POST', body: JSON.stringify({ targetStatus }) },
      applicationInstanceId
    );
    return res.delivery;
  },

  async confirmTeachingCompletion(
    deliveryId: string,
    payload: {
      targetStatus: 'taught' | 'completed';
      confirmTaught: boolean;
      coverageMode: 'full' | 'partial';
      coveredObjectiveIds?: string[];
      uncoveredObjectiveIds?: string[];
      understandingLevel?: UnderstandingLevel;
      studentEngagement?: StudentEngagementLevel;
      remedialNeeded?: boolean;
      remedialTopic?: string | null;
      teacherComments?: string;
      challengesNoted?: string | null;
      idempotencyKey?: string;
    },
    applicationInstanceId?: string
  ): Promise<{ idempotentReplay: boolean; delivery: TeachingDeliveryRecordDto }> {
    return unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      idempotentReplay: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/complete`,
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
  },

  async correctDeliveryRecord(
    deliveryId: string,
    payload: {
      correctionReason: string;
      coverageMode?: 'full' | 'partial';
      coveredObjectiveIds?: string[];
      uncoveredObjectiveIds?: string[];
      understandingLevel?: UnderstandingLevel;
      studentEngagement?: StudentEngagementLevel;
      remedialNeeded?: boolean;
      remedialTopic?: string | null;
      teacherComments?: string;
      challengesNoted?: string | null;
    },
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/correct`,
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.delivery;
  },

  async mapUnresolvedTopic(
    deliveryId: string,
    payload: {
      topicId: string;
      coveredObjectiveIds?: string[];
      reason?: string;
    },
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/map-curriculum`,
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.delivery;
  },

  async adminVerifyDelivery(
    deliveryId: string,
    payload: { adminVerificationStatus: 'verified' | 'flagged' | 'unverified'; reason: string },
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryRecordDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      delivery: TeachingDeliveryRecordDto;
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/admin-verify`,
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.delivery;
  },

  async getDeliveryAuditHistory(
    deliveryId: string,
    applicationInstanceId?: string
  ): Promise<TeachingDeliveryAuditEntryDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      history: TeachingDeliveryAuditEntryDto[];
    }>(
      `/api/v1/teaching/deliveries/${encodeURIComponent(deliveryId)}/audit-history`,
      { method: 'GET' },
      applicationInstanceId
    );
    return res.history || [];
  },

  async getSubjectProgress(
    filters: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      assignmentId?: string;
    } = {},
    applicationInstanceId?: string
  ): Promise<SubjectProgressSummaryDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      progress: SubjectProgressSummaryDto[];
    }>(`/api/v1/teaching/progress${buildQuery(filters)}`, { method: 'GET' }, applicationInstanceId);
    return res.progress || [];
  },

  async getVerifiedTaughtEvidence(
    assignmentId: string,
    purpose?: string,
    applicationInstanceId?: string
  ): Promise<VerifiedTaughtEvidenceBundleDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      evidence: VerifiedTaughtEvidenceBundleDto;
    }>(
      `/api/v1/teaching/evidence${buildQuery({ assignmentId, purpose })}`,
      { method: 'GET' },
      applicationInstanceId
    );
    return res.evidence;
  },

  async listScopeAuthorizations(
    filters: { assignmentId?: string; status?: string } = {},
    applicationInstanceId?: string
  ): Promise<AssessmentScopeAuthorizationDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      authorizations: AssessmentScopeAuthorizationDto[];
    }>(
      `/api/v1/assessments/scope-authorizations${buildQuery(filters)}`,
      { method: 'GET' },
      applicationInstanceId
    );
    return res.authorizations || [];
  },

  async createScopeAuthorization(
    payload: {
      assignmentId: string;
      assessmentType: ScopeAssessmentType;
      title: string;
      selectedTopicIds: string[];
      selectedObjectiveIds?: string[];
      questionCount: number;
      questionTypesConfig?: Record<string, number>;
      objectiveTheoryBalance?: {
        objectivePercent: number;
        theoryPercent: number;
        practicalPercent: number;
      };
      totalMarks: number;
      difficultyMix?: Record<string, number>;
      durationMinutes?: number;
      instructions?: string;
    },
    applicationInstanceId?: string
  ): Promise<AssessmentScopeAuthorizationDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      authorization: AssessmentScopeAuthorizationDto;
    }>(
      '/api/v1/assessments/scope-authorizations',
      { method: 'POST', body: JSON.stringify(payload) },
      applicationInstanceId
    );
    return res.authorization;
  },

  async revokeScopeAuthorization(
    authorizationId: string,
    reason: string,
    applicationInstanceId?: string
  ): Promise<AssessmentScopeAuthorizationDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      authorization: AssessmentScopeAuthorizationDto;
    }>(
      `/api/v1/assessments/scope-authorizations/${encodeURIComponent(authorizationId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      applicationInstanceId
    );
    return res.authorization;
  },

  async generateTaughtAssessment(
    scopeAuthorizationId: string,
    applicationInstanceId?: string
  ): Promise<TaughtAssessmentGenerationResponseDto> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      assessment: TaughtAssessmentGenerationResponseDto;
    }>(
      '/api/v1/assessments/taught-generate',
      { method: 'POST', body: JSON.stringify({ scopeAuthorizationId }) },
      applicationInstanceId
    );
    return res.assessment;
  },

  async listGenerationProvenance(
    scopeAuthorizationId?: string,
    applicationInstanceId?: string
  ): Promise<AssessmentGenerationProvenanceDto[]> {
    const res = await unifiedApiClient.requestSchoolFlow<{
      success: boolean;
      provenance: AssessmentGenerationProvenanceDto[];
    }>(
      `/api/v1/assessments/provenance${buildQuery({ scopeAuthorizationId })}`,
      { method: 'GET' },
      applicationInstanceId
    );
    return res.provenance || [];
  }
};
