import { ClassGrade, Term } from '../types';

export type TextbookStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
export type SectionReviewStatus = 'pending' | 'approved' | 'rejected';

export interface TextbookSection {
  id: string;
  chapterId: string;
  sectionNumber: number;
  title: string;
  contentMarkdown: string;
  examples: Array<{ title: string; problem: string; solution: string }>;
  workedSolutions: string[];
  practicalActivities?: Array<{
    title: string;
    objective: string;
    equipmentNeeded: string[];
    safetyPrecautions: string[];
    procedureSteps: string[];
    expectedObservations: string;
  }>;
  keyVocabulary: Array<{ term: string; definition: string }>;
  commonMisconceptions: string[];
  reviewStatus: SectionReviewStatus;
  reviewerNotes?: string;
  lastUpdated: string;
}

export interface TextbookChapter {
  id: string;
  textbookId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  learningObjectives: string[];
  sections: TextbookSection[];
  status: TextbookStatus;
}

export interface Textbook {
  id: string;
  subjectId: string;
  subjectName: string;
  classGrade: ClassGrade;
  curriculumVersionId: string;
  title: string;
  author: string;
  description: string;
  status: TextbookStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  chapters: TextbookChapter[];
  approvalHistory: Array<{
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    role: string;
    action: 'created' | 'submitted_review' | 'approved' | 'rejected' | 'published';
    notes?: string;
  }>;
}

export interface CurriculumCoverageManifest {
  textbookId: string;
  subjectId: string;
  classGrade: ClassGrade;
  curriculumVersionId: string;
  totalRequiredTopics: number;
  topicsIncludedInOutline: number;
  topicsCoveredBySections: number;
  totalLearningObjectives: number;
  objectivesMappedToContent: number;
  objectivesSupportedByQuestionBank: number;
  coveragePercentage: number;
  missingRequirements: string[];
  sectionsAwaitingReview: number;
  questionsAwaitingValidation: number;
  approvedContentCount: number;
  rejectedContentCount: number;
  lastEvaluatedAt: string;
}

export type QuestionType = 'objective' | 'theory' | 'practical' | 'calculation';
export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
export type CognitiveDemand = 'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation';
export type QuestionSourceType = 'verified_past_question' | 'official_sample' | 'teacher_authored' | 'ai_practice' | 'imported_unverified';
export type QuestionReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface QuestionOption {
  key: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface MarkingRubricStep {
  stepDescription: string;
  marksAwarded: number;
}

export interface QuestionItem {
  id: string;
  subjectId: string;
  classGrade: ClassGrade;
  curriculumVersionId: string;
  topicId: string;
  subTopicId?: string;
  learningObjectiveIds: string[];
  questionType: QuestionType;
  stem: string;
  options?: QuestionOption[];
  correctAnswer: string; // e.g. 'B' or model answer text
  explanation: string;
  markingRubric?: MarkingRubricStep[];
  marks: number;
  difficulty: QuestionDifficulty;
  cognitiveDemand: CognitiveDemand;
  sourceType: QuestionSourceType;
  sourceReference?: string; // e.g. "WAEC 2023 Physics Paper 2, No. 4"
  version: number;
  creationMethod: 'ai_assisted' | 'manual' | 'imported';
  reviewStatus: QuestionReviewStatus;
  reviewerId?: string;
  approvalTimestamp?: string;
  exposureCount: number;
  createdAt: string;
}

export interface AssessmentBlueprint {
  id: string;
  title: string;
  subjectId: string;
  classGrade: ClassGrade;
  term: Term;
  curriculumVersionId: string;
  assessmentType: 'quiz' | 'test' | 'exam' | 'continuous_assessment';
  questionFormatsCount: {
    objective: number;
    theory: number;
    practical: number;
    calculation: number;
  };
  totalMarks: number;
  difficultyMix: {
    easyPercent: number;
    mediumPercent: number;
    hardPercent: number;
  };
  timeAllowanceMinutes: number;
  allowVerifiedPastQuestions: boolean;
  allowAiPracticeQuestions: boolean;
  completedTopicsOnly: boolean;
  selectedTopicIds: string[];
  status: 'draft' | 'approved' | 'active';
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  type: 'textbook' | 'question_bank' | 'assessment';
  targetId: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progressPercent: number;
  currentStep: string;
  errorDetails?: string;
  createdAt: string;
  updatedAt: string;
}
