import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import { InstanceQuestionBankRepository } from './instanceQuestionBankRepository';
import type {
  InstanceAssessmentBlueprint,
  InstanceAssessmentRecord,
  InstanceExamConfiguration,
  InstanceQuestionCategory,
  InstanceQuestionItem,
  QuestionDeleteOrArchiveResult,
  QuestionReviewStatus
} from './instanceQuestionBankTypes';

/**
 * School-instance-owned Question Bank and Assessment Service.
 * Completely independent from Central Curriculum & Central Textbook services.
 * All records live inside each school's tenant-isolated PostgreSQL tables.
 */
export class InstanceQuestionBankService {
  readonly repository: InstanceQuestionBankRepository;

  constructor(pool: DatabasePool) {
    this.repository = new InstanceQuestionBankRepository(pool);
  }

  listCategories(tenant: VerifiedTenantPrincipal, applicationInstanceId: string): Promise<InstanceQuestionCategory[]> {
    return this.repository.listCategories(tenant, applicationInstanceId);
  }

  createCategory(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: { name: string; description?: string; subjectReferenceId?: string },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionCategory> {
    return this.repository.createCategory(tenant, applicationInstanceId, input, actorPrincipal);
  }

  updateCategory(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    categoryId: string,
    input: { name?: string; description?: string; subjectReferenceId?: string | null },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionCategory> {
    return this.repository.updateCategory(tenant, applicationInstanceId, categoryId, input, actorPrincipal);
  }

  listQuestions(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    filter?: {
      subjectReferenceId?: string;
      classGradeName?: string;
      questionType?: string;
      reviewStatus?: string;
      difficulty?: string;
      categoryId?: string;
      includeArchived?: boolean;
    }
  ): Promise<InstanceQuestionItem[]> {
    return this.repository.listQuestions(tenant, applicationInstanceId, filter);
  }

  createQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: Parameters<InstanceQuestionBankRepository['createQuestion']>[2],
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    return this.repository.createQuestion(tenant, applicationInstanceId, input, actorPrincipal);
  }

  submitQuestionForReview(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    return this.repository.submitQuestionForReview(tenant, applicationInstanceId, questionId, actorPrincipal);
  }

  reviewQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    reviewStatus: QuestionReviewStatus,
    actorPrincipal?: AuthorizedPrincipal,
    reason?: string
  ): Promise<InstanceQuestionItem> {
    return this.repository.reviewQuestion(tenant, applicationInstanceId, questionId, reviewStatus, actorPrincipal, reason);
  }

  archiveQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    reason?: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    return this.repository.archiveQuestion(tenant, applicationInstanceId, questionId, reason, actorPrincipal);
  }

  deleteOrArchiveQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal,
    reason?: string
  ): Promise<QuestionDeleteOrArchiveResult> {
    return this.repository.deleteOrArchiveQuestion(tenant, applicationInstanceId, questionId, actorPrincipal, reason);
  }

  deleteQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<boolean> {
    return this.repository.deleteQuestion(tenant, applicationInstanceId, questionId, actorPrincipal);
  }

  listBlueprints(tenant: VerifiedTenantPrincipal, applicationInstanceId: string): Promise<InstanceAssessmentBlueprint[]> {
    return this.repository.listBlueprints(tenant, applicationInstanceId);
  }

  createBlueprint(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: Parameters<InstanceQuestionBankRepository['createBlueprint']>[2],
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceAssessmentBlueprint> {
    return this.repository.createBlueprint(tenant, applicationInstanceId, input, actorPrincipal);
  }

  listExamConfigurations(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceExamConfiguration[]> {
    return this.repository.listExamConfigurations(tenant, applicationInstanceId);
  }

  createExamConfiguration(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: Parameters<InstanceQuestionBankRepository['createExamConfiguration']>[2],
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceExamConfiguration> {
    return this.repository.createExamConfiguration(tenant, applicationInstanceId, input, actorPrincipal);
  }

  recordAssessmentSubmission(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: Parameters<InstanceQuestionBankRepository['recordAssessmentSubmission']>[2],
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceAssessmentRecord> {
    return this.repository.recordAssessmentSubmission(tenant, applicationInstanceId, input, actorPrincipal);
  }

  listAssessmentRecords(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    examConfigurationId?: string
  ): Promise<InstanceAssessmentRecord[]> {
    return this.repository.listAssessmentRecords(tenant, applicationInstanceId, examConfigurationId);
  }

  async seedStarterPastQuestions(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem[]> {
    const items = await Promise.all([
      this.repository.createQuestion(tenant, applicationInstanceId, {
        subjectReferenceId: 'sub-math',
        classGradeName: 'SS 3',
        curriculumVersionId: 'NERDC-SSEC-2024',
        topicReferenceId: 'top-indices-logarithms',
        learningObjectiveIds: ['obj-log-1'],
        questionType: 'objective',
        stem: 'Simplify (log10 8 / log10 2) without using mathematical tables.',
        options: [
          { key: 'A', text: '1' },
          { key: 'B', text: '2' },
          { key: 'C', text: '3' },
          { key: 'D', text: '4' }
        ],
        correctAnswer: 'C',
        explanation: 'log10 8 = log10(2^3) = 3 log10 2, therefore ratio equals 3.',
        marks: 2,
        difficulty: 'Medium',
        cognitiveDemand: 'Application',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC May/June 2023 General Mathematics Paper 1, Question 14',
        creationMethod: 'imported',
        reviewStatus: 'pending_review'
      }, actorPrincipal),
      this.repository.createQuestion(tenant, applicationInstanceId, {
        subjectReferenceId: 'sub-chem',
        classGradeName: 'SS 2',
        curriculumVersionId: 'NERDC-SSEC-2024',
        topicReferenceId: 'top-electrolysis',
        learningObjectiveIds: ['obj-elect-1'],
        questionType: 'objective',
        stem: 'During the electrolysis of acidified water using platinum electrodes, the gas produced at the anode is:',
        options: [
          { key: 'A', text: 'Hydrogen' },
          { key: 'B', text: 'Oxygen' },
          { key: 'C', text: 'Chlorine' },
          { key: 'D', text: 'Sulphur (IV) oxide' }
        ],
        correctAnswer: 'B',
        explanation: 'OH- ions are discharged preferentially at the anode yielding oxygen gas.',
        marks: 2,
        difficulty: 'Medium',
        cognitiveDemand: 'Comprehension',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC 2022 Chemistry Paper 1, Question 8',
        creationMethod: 'imported',
        reviewStatus: 'pending_review'
      })
    ]);
    return items;
  }

  async seedStarterTheoryQuestions(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem[]> {
    return Promise.all([
      this.repository.createQuestion(tenant, applicationInstanceId, {
        subjectReferenceId: 'sub-math',
        classGradeName: 'SS 3',
        curriculumVersionId: 'NERDC-SSEC-2024',
        topicReferenceId: 'top-quadratic-equations',
        learningObjectiveIds: ['obj-quad-2'],
        questionType: 'theory',
        stem: 'Using the quadratic formula, solve the equation 2x^2 - 7x + 3 = 0.',
        correctAnswer: 'x = 3 or x = 0.5',
        explanation: 'Discriminant = (-7)^2 - 4(2)(3) = 25, giving roots (7 ± 5) / 4.',
        markingRubric: [
          { stepDescription: 'Identify coefficients a=2, b=-7, c=3', marksAwarded: 2 },
          { stepDescription: 'Apply quadratic formula accurately', marksAwarded: 3 },
          { stepDescription: 'Compute roots x = 3 and x = 0.5', marksAwarded: 3 }
        ],
        marks: 8,
        difficulty: 'Medium',
        cognitiveDemand: 'Application',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC May/June 2023 General Mathematics Paper 2, Question 5',
        creationMethod: 'imported',
        reviewStatus: 'pending_review'
      }, actorPrincipal)
    ]);
  }

  async seedStarterPracticalQuestions(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem[]> {
    return Promise.all([
      this.repository.createQuestion(tenant, applicationInstanceId, {
        subjectReferenceId: 'sub-chem',
        classGradeName: 'SS 3',
        curriculumVersionId: 'NERDC-SSEC-2024',
        topicReferenceId: 'top-volumetric-analysis',
        learningObjectiveIds: ['obj-titration-1'],
        questionType: 'practical',
        stem: 'Describe the volumetric titration procedure to determine unknown NaOH concentration against 0.0500 mol dm^-3 HCl using methyl orange.',
        correctAnswer: 'Average concordant titre within 0.20 cm^3; calculate molarity using cA vA / cB vB = nA / nB.',
        explanation: 'Concordant burette readings ensure analytical precision in acid-base titrations.',
        markingRubric: [
          { stepDescription: 'Proper apparatus rinsing and indicator choice', marksAwarded: 4 },
          { stepDescription: 'Safety precautions and concordant titration table', marksAwarded: 6 }
        ],
        marks: 10,
        difficulty: 'Medium',
        cognitiveDemand: 'Application',
        sourceType: 'verified_past_question',
        sourceReference: 'WAEC May/June 2023 Chemistry Practical Alternative B',
        creationMethod: 'imported',
        reviewStatus: 'pending_review'
      }, actorPrincipal)
    ]);
  }
}
