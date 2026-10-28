import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { SubjectCurriculum, ClassGrade } from '../types';
import { CurriculumCoverageManifest } from '../types/textbookAndQuestionBank';
import { textbookDb } from './textbookQuestionBankService';

export interface CurriculumRetrievalQuery {
  subjectIdOrCode: string;
  classGrade: ClassGrade;
  curriculumVersionId?: string;
}

export interface CurriculumRetrievalResult {
  isValid: boolean;
  subject?: SubjectCurriculum;
  matchedThemesCount: number;
  totalTopics: number;
  totalPerformanceObjectives: number;
  missingContextErrors: string[];
  manifest?: CurriculumCoverageManifest;
}

class CurriculumRetrievalService {
  private static instance: CurriculumRetrievalService;

  private constructor() {}

  public static getInstance(): CurriculumRetrievalService {
    if (!CurriculumRetrievalService.instance) {
      CurriculumRetrievalService.instance = new CurriculumRetrievalService();
    }
    return CurriculumRetrievalService.instance;
  }

  /**
   * Retrieves authoritative NERDC curriculum records for a specific subject and class grade,
   * producing a traceable coverage manifest and validating context completeness.
   */
  public retrieveCurriculumContext(query: CurriculumRetrievalQuery): CurriculumRetrievalResult {
    const errors: string[] = [];
    const q = query.subjectIdOrCode.toLowerCase().trim();

    const subject = NERDC_SUBJECTS_DATABASE.find(
      s => s.id.toLowerCase() === q || s.code.toLowerCase() === q || s.name.toLowerCase().includes(q)
    );

    if (!subject) {
      errors.push(`Subject '${query.subjectIdOrCode}' not found in official NERDC database.`);
      return {
        isValid: false,
        matchedThemesCount: 0,
        totalTopics: 0,
        totalPerformanceObjectives: 0,
        missingContextErrors: errors
      };
    }

    if (!subject.targetGrades.includes(query.classGrade)) {
      errors.push(`Subject '${subject.name}' is not officially approved for class level ${query.classGrade} under NERDC standards.`);
    }

    const matchedThemes = subject.themes;
    const totalTopics = matchedThemes.reduce((sum, th) => sum + th.topics.length, 0);
    const totalObjectives = matchedThemes.reduce(
      (sum, th) => sum + th.topics.reduce((tSum, t) => tSum + t.performanceObjectives.length, 0),
      0
    );

    if (totalTopics === 0) {
      errors.push(`Curriculum record for '${subject.name}' contains zero topics for version ${query.curriculumVersionId || 'default'}.`);
    }

    const isValid = errors.length === 0;

    // Build or retrieve coverage manifest
    const existingTextbooks = textbookDb.getTextbooks(query.classGrade, subject.id);
    let manifest: CurriculumCoverageManifest | undefined;

    if (existingTextbooks.length > 0) {
      manifest = textbookDb.getCoverageManifest(existingTextbooks[0].id);
    }

    if (!manifest) {
      manifest = {
        textbookId: `tb-pending-${subject.code}-${query.classGrade.replace(/\s+/g, '')}`,
        subjectId: subject.id,
        classGrade: query.classGrade,
        curriculumVersionId: query.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
        totalRequiredTopics: totalTopics,
        topicsIncludedInOutline: 0,
        topicsCoveredBySections: 0,
        totalLearningObjectives: totalObjectives,
        objectivesMappedToContent: 0,
        objectivesSupportedByQuestionBank: 0,
        coveragePercentage: 0,
        missingRequirements: errors,
        sectionsAwaitingReview: 0,
        questionsAwaitingValidation: 0,
        approvedContentCount: 0,
        rejectedContentCount: 0,
        lastEvaluatedAt: new Date().toISOString()
      };
    }

    return {
      isValid,
      subject,
      matchedThemesCount: matchedThemes.length,
      totalTopics,
      totalPerformanceObjectives: totalObjectives,
      missingContextErrors: errors,
      manifest
    };
  }

  /**
   * Strict validation guard that blocks downstream generation workflows if required curriculum context is missing.
   */
  public assertValidCurriculumContext(query: CurriculumRetrievalQuery): SubjectCurriculum {
    const result = this.retrieveCurriculumContext(query);
    if (!result.isValid || !result.subject) {
      throw new Error(
        `CURRICULUM_VALIDATION_ERROR: Cannot proceed with generation. Missing or invalid curriculum context: ${result.missingContextErrors.join(' | ')}`
      );
    }
    return result.subject;
  }
}

export const curriculumRetrievalService = CurriculumRetrievalService.getInstance();
