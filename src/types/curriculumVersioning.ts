import { ClassGrade, SubjectField, Term } from '../types';

export type CurriculumCategory = 'basic_education_9yr' | 'senior_secondary' | 'trade_vocational';
export type SourceRetrievalMethod = 'HTTPS_DIRECT_INGEST' | 'AUTHORIZED_API_GATEWAY' | 'MANUAL_SOURCE_UPLOAD';
export type SourceStatus = 'ACTIVE' | 'UNREACHABLE' | 'AUTH_REQUIRED' | 'MANUAL_INTERVENTION_REQUIRED' | 'DEPRECATED';
export type SourceVerificationStatus = 'OFFICIAL_VERIFIED' | 'PROVISIONAL_PENDING' | 'UNVERIFIED' | 'REJECTED';

export interface CurriculumSourceRegistryEntry {
  sourceId: string;
  name: string;
  officialUrl: string;
  subjectId: string;
  subjectName: string;
  classLevel: 'jss' | 'sss' | 'all';
  category: CurriculumCategory;
  publishedVersionTag: string;
  retrievalMethod: SourceRetrievalMethod;
  lastSuccessfulRetrieval: string | null;
  lastAttemptTimestamp: string | null;
  sourceStatus: SourceStatus;
  verificationStatus: SourceVerificationStatus;
  issuingAuthority: string;
  contactEmail: string;
  isOfficial: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreservedSourceEvidence {
  documentId: string;
  sourceId: string;
  originalFileName: string;
  storagePath: string;
  sourceUrlOrOrigin: string;
  retrievalTimestamp: string;
  publicationMetadata: {
    gazetteNumber?: string;
    issuingYear: number;
    issuingBody: string;
    title: string;
  };
  fileType: string;
  sha256Checksum: string;
  fileSizeBytes: number;
  sourceVersion: string;
  processingStatus: 'PRESERVED' | 'PARSED' | 'VALIDATED' | 'REJECTED_CORRUPTED' | 'ARCHIVED';
  validationErrors?: string[];
}

export interface ExtractedCurriculumTopic {
  topicId: string;
  title: string;
  term: Term;
  week: number;
  subTopics: string[];
  learningObjectives: string[];
  performanceObjectives: string[];
  activities: {
    teacherActivities: string[];
    studentActivities: string[];
  };
  evaluationGuidance: string[];
  recommendedTextbooks: string[];
  provenance: {
    documentId: string;
    sectionReference?: string;
    pageNumber?: number;
  };
}

export interface ExtractedCurriculumSubject {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  classGrade: ClassGrade;
  level: 'jss' | 'sss';
  field: SubjectField;
  themes: Array<{
    title: string;
    description: string;
    topics: ExtractedCurriculumTopic[];
  }>;
  documentId: string;
  extractedAt: string;
  aiAssisted: boolean;
  humanValidationStatus: 'PENDING_HUMAN_VALIDATION' | 'VALIDATED' | 'REJECTED';
  validatedBy?: {
    userId: string;
    userName: string;
    timestamp: string;
    notes?: string;
  };
}

export type ChangeCategory =
  | 'ADDED_TOPIC'
  | 'REMOVED_TOPIC'
  | 'MODIFIED_TOPIC'
  | 'ADDED_OBJECTIVE'
  | 'REMOVED_OBJECTIVE'
  | 'MODIFIED_OBJECTIVE'
  | 'EVALUATION_GUIDANCE_CHANGED'
  | 'STRUCTURAL_REORGANIZATION';

export interface CurriculumChangeRecord {
  changeId: string;
  subjectId: string;
  subjectName: string;
  classGrade: ClassGrade;
  category: ChangeCategory;
  itemPath: string;
  itemTitle: string;
  previousValue: any;
  newValue: any;
  sourceEvidence: {
    documentId: string;
    sectionReference?: string;
  };
  sourceVersion: string;
  previousVersion: string;
  detectedAt: string;
  confidence: number;
  humanReviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type EditorialWorkflowState =
  | 'DISCOVERED'
  | 'INGESTED'
  | 'PARSED'
  | 'VALIDATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'FAILED';

export interface CurriculumEditorialReview {
  reviewId: string;
  targetType: 'DOCUMENT' | 'CURRICULUM_SNAPSHOT' | 'VERSION_RELEASE';
  targetId: string;
  state: EditorialWorkflowState;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  decision: 'APPROVED' | 'REJECTED' | 'REQUEST_REVISION';
  editorialNotes: string;
  timestamp: string;
}

export interface GovernedCurriculumVersion {
  versionId: string;
  versionTag: string;
  title: string;
  sourceDocumentId: string;
  sourceDocumentChecksum: string;
  effectiveAcademicYear: string;
  effectiveDate: string;
  publishedAt: string;
  previousVersionId: string | null;
  integrityChecksum: string;
  approvedBy: {
    userId: string;
    name: string;
    role: string;
    timestamp: string;
  };
  totalSubjects: number;
  totalTopics: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DEPRECATED';
}

export type ImpactSeverity =
  | 'INFORMATIONAL'
  | 'RECOMMENDED_REVIEW'
  | 'MANDATORY_REVIEW'
  | 'POTENTIALLY_OBSOLETE_CONTENT';

export interface DownstreamImpactReport {
  reportId: string;
  generatedAt: string;
  sourceCurriculumVersionId: string;
  targetCurriculumVersionId: string;
  subjectId: string;
  classGrade: ClassGrade;
  overallSeverity: ImpactSeverity;
  affectedTextbooks: Array<{
    textbookId: string;
    title: string;
    author: string;
    boundCurriculumVersionId: string;
    affectedChapters: string[];
    impactSeverity: ImpactSeverity;
    remediationGuidance: string;
  }>;
  affectedQuestions: Array<{
    questionId: string;
    stem: string;
    topicId: string;
    boundCurriculumVersionId: string;
    impactReason: string;
    severity: ImpactSeverity;
  }>;
  affectedBlueprints: Array<{
    blueprintId: string;
    examTitle: string;
    reasons: string[];
  }>;
  affectedTenants: Array<{
    tenantId: string;
    schoolName: string;
    studentsEnrolledCount: number;
  }>;
  remediationChecklist: string[];
}

export type DurableJobStatus = 'QUEUED' | 'RUNNING' | 'CHECKPOINTED' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface DurableCurriculumSyncJob {
  jobId: string;
  jobType: 'ANNUAL_SCHEDULED_SYNC' | 'MANUAL_SYNC' | 'SOURCE_INGESTION' | 'IMPACT_REEVALUATION';
  status: DurableJobStatus;
  sourceId: string;
  progressPercent: number;
  checkpoints: string[];
  currentStep: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  resultSummary?: string;
  actor: string;
  resumableState?: Record<string, any>;
}
