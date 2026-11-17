export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface CurriculumCountryRecord {
  id: string;
  isoCode: string;
  name: string;
  jurisdictionType: 'country' | 'state' | 'regional' | 'international';
  region: string;
  metadata: Record<string, unknown>;
}

export interface CurriculumEducationAuthorityRecord {
  id: string;
  countryId: string;
  code: string;
  name: string;
  authorityType: 'national' | 'regional' | 'examination_board' | 'international';
  officialUrl: string;
  metadata: Record<string, unknown>;
}

export interface CurriculumFrameworkRecord {
  id: string;
  countryId: string;
  countryName?: string;
  authorityId: string;
  authorityName?: string;
  code: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'superseded' | 'archived';
  metadata: Record<string, unknown>;
}

export interface CurriculumClassGradeRecord {
  id: string;
  frameworkId: string;
  educationLevelId: string;
  educationLevelCode?: string;
  educationLevelName?: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface CurriculumVersionRecord {
  id: string;
  frameworkId: string;
  frameworkCode?: string;
  versionTag: string;
  title: string;
  academicApplicability: Record<string, unknown>;
  releaseDate: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  supersedesVersionId?: string | null;
  supersededByVersionId?: string | null;
  isSuperseded: boolean;
  status: 'draft' | 'under_review' | 'approved' | 'published' | 'superseded' | 'archived';
  editorialApprovalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | null;
  approvedAt?: string | null;
  isOfficialVerified: boolean;
  sourceProvenance: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSubjectSummary {
  id: string;
  frameworkId: string;
  educationLevelId: string;
  educationLevelCode: string;
  classificationId: string;
  classificationCode: string;
  classificationName: string;
  code: string;
  name: string;
  description: string;
  isCompulsory: boolean;
  recommendedPeriodsPerWeek: number;
  officialSourceUrl: string;
  targetGrades: string[];
  generalObjectives: string[];
  recommendedTextbooks: string[];
  equipmentRequirements: string[];
  status: string;
  curriculumVersionId: string;
  curriculumVersionStatus: string;
  isOfficialVerified: boolean;
  topicCount?: number;
  objectiveCount?: number;
}

export interface CurriculumSubtopicRecord {
  id: string;
  curriculumVersionId: string;
  topicId: string;
  sortOrder: number;
  title: string;
  description: string;
}

export interface CurriculumLearningObjectiveRecord {
  id: string;
  curriculumVersionId: string;
  topicId: string;
  topicTitle?: string;
  subjectId?: string;
  classGradeName?: string;
  subtopicId?: string | null;
  objectiveType: 'learning' | 'performance' | 'general';
  sortOrder: number;
  description: string;
  bloomLevel?: string | null;
}

export interface CurriculumStandardRecord {
  id: string;
  frameworkId: string;
  curriculumVersionId: string;
  subjectId?: string | null;
  topicId?: string | null;
  standardCode: string;
  title: string;
  description: string;
  examBody: string;
}

export interface CurriculumTopicRecord {
  id: string;
  sourceTopicId: string;
  curriculumVersionId: string;
  subjectId: string;
  subjectName?: string;
  themeId: string;
  themeTitle?: string;
  classGradeId: string;
  classGradeName: string;
  term: string;
  week: number;
  title: string;
  contentDetails: string[];
  teacherActivities: string[];
  studentActivities: string[];
  teachingMaterials: string[];
  evaluationGuide: string[];
  practicalWorkshopNotes?: string | null;
  competencyDomain?: string | null;
  examRelevance: Record<string, unknown>;
  subtopics: CurriculumSubtopicRecord[];
  objectives: CurriculumLearningObjectiveRecord[];
}

export interface CurriculumThemeDetail {
  id: string;
  sourceThemeId: string;
  themeNumber: number;
  title: string;
  description: string;
  topics: CurriculumTopicRecord[];
}

export interface CurriculumSourceDocumentRecord {
  id: string;
  authorityId: string;
  frameworkId: string;
  curriculumVersionId: string;
  documentTitle: string;
  documentCode: string;
  sourceUrl: string;
  publicationYear?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  checksumSha256?: string | null;
  provenanceMetadata: Record<string, unknown>;
  isOfficialGazette: boolean;
  importedBy: string;
  createdAt: string;
}

export interface CurriculumCompetencyRecord {
  id: string;
  curriculumVersionId: string;
  subjectId: string;
  topicId?: string | null;
  competencyCode: string;
  competencyType: 'competency' | 'skill' | 'learning_outcome' | 'assessment_objective';
  title: string;
  description: string;
  assessmentCriteria: string[];
  progressionLevel?: string | null;
  createdAt: string;
}

export interface CurriculumSubjectDetail extends CurriculumSubjectSummary {
  version: CurriculumVersionRecord;
  themes: CurriculumThemeDetail[];
  standards: CurriculumStandardRecord[];
  competencies?: CurriculumCompetencyRecord[];
  sourceDocuments?: CurriculumSourceDocumentRecord[];
}

export interface CurriculumChangeHistoryRecord {
  id: string;
  curriculumVersionId: string;
  entityType: string;
  entityId: string;
  changeType: 'created' | 'updated' | 'migrated' | 'approved' | 'published' | 'superseded' | 'archived';
  summary: string;
  diffPayload: Record<string, unknown>;
  actor: string;
  recordedAt: string;
}

export interface CurriculumCoverageSummaryRecord {
  curriculumVersionId: string;
  versionTag: string;
  frameworkId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  totalTopics: number;
  totalLearningObjectives: number;
  publishedTextbooksCount: number;
  topicsCoveredByPublishedTextbooks: number;
  objectivesMappedInPublishedTextbooks: number;
  coveragePercentage: number;
}

export interface CurriculumFilterParams {
  countryId?: string;
  authorityId?: string;
  frameworkId?: string;
  versionId?: string;
  levelCode?: string;
  gradeName?: string;
  classificationCode?: string;
  compulsoryOnly?: boolean;
  subjectId?: string;
  topicId?: string;
  term?: string;
  search?: string;
  page?: number;
  limit?: number;
}
