export type QuestionType = 'objective' | 'theory' | 'practical' | 'calculation';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type QuestionSourceType =
  | 'verified_past_question'
  | 'official_sample'
  | 'teacher_authored'
  | 'ai_practice'
  | 'imported_unverified';

export interface InstanceQuestionCategory {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  name: string;
  description: string;
  subjectReferenceId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InstanceQuestionItem {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  categoryId?: string | null;
  subjectReferenceId: string;
  classGradeName: string;
  curriculumVersionId: string;
  topicReferenceId: string;
  learningObjectiveIds: string[];
  questionType: QuestionType;
  stem: string;
  options?: Array<{ key: string; text: string }> | null;
  correctAnswer: string;
  explanation: string;
  markingRubric?: Array<{ stepDescription: string; marksAwarded: number }> | null;
  marks: number;
  difficulty: QuestionDifficulty;
  cognitiveDemand: string;
  sourceType: QuestionSourceType;
  sourceReference?: string | null;
  version: number;
  creationMethod: 'ai_assisted' | 'manual' | 'imported';
  reviewStatus: QuestionReviewStatus;
  reviewerId?: string | null;
  approvalTimestamp?: string | null;
  exposureCount: number;
  archivedAt?: string | null;
  archivedBy?: string | null;
  archiveReason?: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDeleteOrArchiveResult {
  found: boolean;
  deleted: boolean;
  archived: boolean;
  question?: InstanceQuestionItem;
}

export interface InstanceAssessmentBlueprint {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  title: string;
  subjectReferenceId: string;
  classGradeName: string;
  term: string;
  curriculumVersionId: string;
  assessmentType: 'quiz' | 'test' | 'exam' | 'continuous_assessment';
  questionFormatsCount: Record<string, number>;
  totalMarks: number;
  difficultyMix: Record<string, number>;
  timeAllowanceMinutes: number;
  allowVerifiedPastQuestions: boolean;
  allowAiPracticeQuestions: boolean;
  completedTopicsOnly: boolean;
  selectedTopicIds: string[];
  scopeAuthorizationId?: string | null;
  selectedObjectiveIds?: string[];
  sourceDeliveryIds?: string[];
  authorizedTeacherUserId?: string | null;
  academicSession?: string | null;
  section?: string;
  status: 'draft' | 'approved' | 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceExamConfiguration {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  blueprintId?: string | null;
  examCode: string;
  title: string;
  subjectReferenceId: string;
  classGradeName: string;
  term: string;
  academicSession: string;
  durationMinutes: number;
  totalMarks: number;
  instructions: string[];
  selectedQuestionIds: string[];
  generationHash: string;
  isLocked: boolean;
  authorizedByPrincipal: boolean;
  authorizedBy?: string | null;
  authorizedAt?: string | null;
  markingSchemeUnlocked: boolean;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceAssessmentRecord {
  id: string;
  tenantId: string;
  applicationInstanceId: string;
  examConfigurationId: string;
  studentId?: string | null;
  studentIdentifier: string;
  scoreObtained: number;
  maxScore: number;
  responses: Record<string, unknown>;
  gradedBy?: string | null;
  gradedAt?: string | null;
  status: 'in_progress' | 'submitted' | 'graded' | 'verified';
  createdAt: string;
}
