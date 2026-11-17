export type TextbookPublicationStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'in_review'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'superseded'
  | 'archived';

export type TextbookEditorialApprovalStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type TextbookSectionReviewStatus = 'pending' | 'approved' | 'rejected';

export type TextbookProvenanceKind =
  | 'authoritative_editorial'
  | 'ai_generated'
  | 'migrated_baseline'
  | 'imported';

export type GenerationJobType =
  | 'outline'
  | 'chapter_content'
  | 'full_textbook'
  | 'curriculum_realignment';

export type GenerationJobStatus =
  | 'queued'
  | 'running'
  | 'paused_for_recovery'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CentralPublisherRecord {
  id: string;
  name: string;
  countryId?: string | null;
  websiteUrl: string;
  licenseDefault: string;
}

export interface CentralContributorRecord {
  authorId: string;
  fullName: string;
  affiliation: string;
  role: 'lead_author' | 'co_author' | 'editor' | 'reviewer' | 'illustrator' | 'ai_assisted_generator';
  contributionOrder: number;
}

export interface CentralContentBlockRecord {
  id: string;
  blockOrder: number;
  blockType:
    | 'narrative'
    | 'definition'
    | 'worked_example'
    | 'practical_activity'
    | 'callout'
    | 'diagram_ref'
    | 'exercise'
    | 'citation_note';
  content: Record<string, unknown>;
}

export interface CentralTextbookObjectiveMapping {
  id: string;
  chapterId: string;
  sectionId?: string | null;
  topicId?: string | null;
  learningObjectiveId: string;
  mappingStrength: 'primary' | 'supporting';
}

export interface CentralTextbookMediaAsset {
  id: string;
  textbookId: string;
  chapterId?: string | null;
  sectionId?: string | null;
  assetType: 'illustration' | 'diagram' | 'photograph' | 'pdf_export' | 'epub_export' | 'audio_companion';
  title: string;
  altText: string;
  mimeType: string;
  storageProvider: string;
  storageKey: string;
  checksumSha256: string;
  bytesSize: number;
  accessScope: 'editorial_only' | 'entitled_private';
  uploadedBy: string;
  createdAt: string;
}

export interface CentralTextbookCitation {
  id: string;
  textbookId: string;
  chapterId?: string | null;
  citationKey: string;
  authorOrSource: string;
  title: string;
  publicationYear?: string | null;
  publisher?: string | null;
  sourceUrl?: string | null;
  licenseNote?: string | null;
}

export interface InstructionalTableSpec {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface SectionIllustrationSpec {
  conceptDescription: string;
  caption: string;
  labels: string[];
  learningObjectiveId?: string | null;
  ageAppropriatenessNote?: string;
}

export interface RevisionExerciseSpec {
  exerciseNumber: number;
  questionType: 'short_answer' | 'structured' | 'calculation' | 'practical' | 'essay';
  prompt: string;
  answerGuide: string;
  learningObjectiveId?: string | null;
}

export interface CentralTextbookIllustrationRecord {
  id: string;
  textbookId: string;
  chapterId?: string | null;
  sectionId?: string | null;
  learningObjectiveId?: string | null;
  conceptDescription: string;
  caption: string;
  labels: string[];
  targetClassGrade: string;
  ageAppropriatenessNote: string;
  lessonConsistencyVerified: boolean;
  mediaAssetId?: string | null;
  generationMetadata: Record<string, unknown>;
  createdAt: string;
}

export interface CentralTextbookGlossaryRecord {
  id: string;
  textbookId: string;
  chapterId?: string | null;
  term: string;
  definition: string;
  pronunciationHint?: string | null;
  contextExample?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CentralTextbookValidationFinding {
  code: string;
  severity: 'error' | 'warning';
  category:
    | 'missing_curriculum_topics'
    | 'missing_learning_outcomes'
    | 'duplicate_chapters'
    | 'contradictory_explanations'
    | 'vocabulary_suitability'
    | 'illustration_inconsistency'
    | 'unsupported_claims'
    | 'incomplete_chapter_structure'
    | 'curriculum_coverage_gap';
  message: string;
  chapterId?: string;
  sectionId?: string;
}

export interface CentralTextbookValidationReport {
  id: string;
  textbookId: string;
  curriculumVersionId: string;
  overallPassed: boolean;
  readinessScore: number;
  findings: CentralTextbookValidationFinding[];
  summary: Record<string, unknown>;
  validatedBy: string;
  validatedAt: string;
}

export interface CentralTextbookRevisionRecord {
  id: string;
  textbookId: string;
  revisionNumber: number;
  previousVersionNumber?: string | null;
  newVersionNumber: string;
  revisionType: 'initial_generation' | 'chapter_regeneration' | 'editorial_correction' | 'curriculum_update' | 'supersession';
  summary: string;
  diffMetadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface CentralTextbookSectionRecord {
  id: string;
  textbookId: string;
  chapterId: string;
  sectionNumber: number;
  title: string;
  contentMarkdown: string;
  examples: Array<{ title: string; problem: string; solution: string }>;
  workedSolutions: string[];
  practicalActivities: Array<{
    title: string;
    objective: string;
    equipmentNeeded: string[];
    safetyPrecautions: string[];
    procedureSteps: string[];
    expectedObservations: string;
  }>;
  instructionalTables?: InstructionalTableSpec[];
  illustrationSpecs?: SectionIllustrationSpec[];
  keyVocabulary: Array<{ term: string; definition: string }>;
  commonMisconceptions: string[];
  contentBlocks: CentralContentBlockRecord[];
  reviewStatus: TextbookSectionReviewStatus;
  reviewerId?: string | null;
  reviewerNotes?: string | null;
  reviewedAt?: string | null;
  updatedAt: string;
}

export interface CentralTextbookChapterRecord {
  id: string;
  textbookId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  introductoryExplanation?: string;
  chapterSummary?: string;
  revisionExercises?: RevisionExerciseSpec[];
  topicIds: string[];
  learningObjectiveIds: string[];
  learningObjectives: string[];
  status: TextbookPublicationStatus;
  sections: CentralTextbookSectionRecord[];
}

export interface CentralTextbookVersionRecord {
  id: string;
  textbookId: string;
  versionNumber: string;
  curriculumVersionId: string;
  publicationStatus: TextbookPublicationStatus;
  changelog: string;
  snapshotChecksum?: string | null;
  createdBy: string;
  createdAt: string;
  publishedAt?: string | null;
}

export interface CentralTextbookEditorialReviewRecord {
  id: string;
  textbookId: string;
  chapterId?: string | null;
  sectionId?: string | null;
  reviewerId: string;
  reviewerRole: string;
  action:
    | 'submitted_for_review'
    | 'review_started'
    | 'changes_requested'
    | 'approved'
    | 'rejected'
    | 'published'
    | 'archived'
    | 'revision_created'
    | 'validated'
    | 'superseded'
    | 'withdrawn';
  notes: string;
  previousStatus?: string | null;
  newStatus: string;
  createdAt: string;
}

export interface CentralTextbookCoverageManifest {
  textbookId: string;
  curriculumVersionId: string;
  subjectId: string;
  classGradeName: string;
  totalRequiredTopics: number;
  topicsIncludedInOutline: number;
  topicsCoveredBySections: number;
  totalLearningObjectives: number;
  objectivesMappedToContent: number;
  coveragePercentage: number;
  missingRequirements: string[];
  sectionsAwaitingReview: number;
  approvedContentCount: number;
  rejectedContentCount: number;
  lastEvaluatedAt: string;
}

export interface CentralTextbookSummary {
  id: string;
  frameworkId: string;
  curriculumVersionId: string;
  educationLevelId: string;
  subjectId: string;
  classGradeId: string;
  classGradeName: string;
  subjectName: string;
  publisherId?: string | null;
  publisherName?: string | null;
  title: string;
  subtitle?: string | null;
  description: string;
  academicYear?: string;
  currentVersion: string;
  publicationStatus: TextbookPublicationStatus;
  editorialApprovalStatus: TextbookEditorialApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishedBy?: string | null;
  publishedAt?: string | null;
  withdrawalAt?: string | null;
  supersededByTextbookId?: string | null;
  copyrightHolder: string;
  licenseType: string;
  licenseMetadata: Record<string, unknown>;
  provenanceKind: TextbookProvenanceKind;
  isVerifiedAuthoritative: boolean;
  geminiModel?: string | null;
  promptVersion?: string | null;
  generationConfig?: Record<string, unknown>;
  validationPassed?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CentralTextbookDetail extends CentralTextbookSummary {
  contributors: CentralContributorRecord[];
  chapters: CentralTextbookChapterRecord[];
  objectiveMappings: CentralTextbookObjectiveMapping[];
  mediaAssets: CentralTextbookMediaAsset[];
  citations: CentralTextbookCitation[];
  versions: CentralTextbookVersionRecord[];
  illustrations?: CentralTextbookIllustrationRecord[];
  glossaries?: CentralTextbookGlossaryRecord[];
  validationReports?: CentralTextbookValidationReport[];
  revisions?: CentralTextbookRevisionRecord[];
  coverageManifest?: CentralTextbookCoverageManifest;
  editorialReviews?: CentralTextbookEditorialReviewRecord[];
}

export interface CentralTextbookGenerationJob {
  id: string;
  textbookId?: string | null;
  curriculumVersionId: string;
  subjectId: string;
  classGradeName: string;
  jobType: GenerationJobType;
  status: GenerationJobStatus;
  progressPercent: number;
  currentStep: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  idempotencyKey?: string | null;
  geminiModel?: string | null;
  promptVersion?: string | null;
  generationConfig?: Record<string, unknown>;
  validationReportId?: string | null;
  payload: Record<string, unknown>;
  checkpointData: Record<string, unknown>;
  initiatedBy: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CentralTextbookFilterParams {
  frameworkId?: string;
  curriculumVersionId?: string;
  subjectId?: string;
  classGrade?: string;
  publicationStatus?: TextbookPublicationStatus;
  search?: string;
  page?: number;
  limit?: number;
}
