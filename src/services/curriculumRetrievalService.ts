import { NERDC_SUBJECTS_DATABASE } from '../data/nerdcDatabase';
import { SubjectCurriculum, ClassGrade } from '../types';

export interface CurriculumRetrievalQuery {
  subjectIdOrCode: string;
  classGrade: ClassGrade;
  curriculumVersionId?: string;
}

export interface PureCurriculumCoverageSummary {
  subjectId: string;
  classGrade: ClassGrade;
  curriculumVersionId: string;
  totalRequiredTopics: number;
  totalLearningObjectives: number;
  missingRequirements: string[];
  lastEvaluatedAt: string;
}

export interface CurriculumRetrievalResult {
  isValid: boolean;
  subject?: SubjectCurriculum;
  matchedThemesCount: number;
  totalTopics: number;
  totalPerformanceObjectives: number;
  missingContextErrors: string[];
  curriculumSummary?: PureCurriculumCoverageSummary;
}

/**
 * Pure curriculum validation and structural retrieval helper.
 * Completely decoupled from textbook persistence and school Question Bank data.
 * Authoritative central curriculum queries are served by CentralCurriculumRepository (/api/v1/shared/curriculum/*).
 */
class CurriculumRetrievalService {
  private static instance: CurriculumRetrievalService;

  private constructor() {}

  public static getInstance(): CurriculumRetrievalService {
    if (!CurriculumRetrievalService.instance) {
      CurriculumRetrievalService.instance = new CurriculumRetrievalService();
    }
    return CurriculumRetrievalService.instance;
  }

  public retrieveCurriculumContext(
    query: CurriculumRetrievalQuery,
    authoritativeSubjects: readonly SubjectCurriculum[] = NERDC_SUBJECTS_DATABASE
  ): CurriculumRetrievalResult {
    const errors: string[] = [];
    const q = query.subjectIdOrCode.toLowerCase().trim();

    const subject = authoritativeSubjects.find(
      s => s.id.toLowerCase() === q || s.code.toLowerCase() === q || s.name.toLowerCase().includes(q)
    );

    if (!subject) {
      errors.push(`Subject '${query.subjectIdOrCode}' was not found in curriculum catalog.`);
      return {
        isValid: false,
        matchedThemesCount: 0,
        totalTopics: 0,
        totalPerformanceObjectives: 0,
        missingContextErrors: errors
      };
    }

    if (!subject.targetGrades.includes(query.classGrade)) {
      errors.push(`Subject '${subject.name}' is not approved for class level ${query.classGrade}.`);
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

    return {
      isValid: errors.length === 0,
      subject,
      matchedThemesCount: matchedThemes.length,
      totalTopics,
      totalPerformanceObjectives: totalObjectives,
      missingContextErrors: errors,
      curriculumSummary: {
        subjectId: subject.id,
        classGrade: query.classGrade,
        curriculumVersionId: query.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
        totalRequiredTopics: totalTopics,
        totalLearningObjectives: totalObjectives,
        missingRequirements: errors,
        lastEvaluatedAt: new Date().toISOString()
      }
    };
  }

  public assertValidCurriculumContext(
    query: CurriculumRetrievalQuery,
    authoritativeSubjects: readonly SubjectCurriculum[] = NERDC_SUBJECTS_DATABASE
  ): SubjectCurriculum {
    const result = this.retrieveCurriculumContext(query, authoritativeSubjects);
    if (!result.isValid || !result.subject) {
      throw new Error(
        `CURRICULUM_VALIDATION_ERROR: Cannot proceed. Missing or invalid curriculum context: ${result.missingContextErrors.join(' | ')}`
      );
    }
    return result.subject;
  }
}

export const curriculumRetrievalService = CurriculumRetrievalService.getInstance();
