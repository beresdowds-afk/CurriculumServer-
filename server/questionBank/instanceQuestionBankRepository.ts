import type { DatabasePool } from '../db/postgres';
import { withTenantTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import type {
  InstanceAssessmentBlueprint,
  InstanceAssessmentRecord,
  InstanceExamConfiguration,
  InstanceQuestionCategory,
  InstanceQuestionItem,
  QuestionDifficulty,
  QuestionReviewStatus,
  QuestionSourceType,
  QuestionType
} from './instanceQuestionBankTypes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InstanceQuestionBankError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN',
    message: string
  ) {
    super(message);
    this.name = 'InstanceQuestionBankError';
  }
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v ?? '');
}

function mapCategory(row: any): InstanceQuestionCategory {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    name: row.name,
    description: row.description || '',
    subjectReferenceId: row.subject_reference_id || null,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at)
  };
}

function mapQuestion(row: any): InstanceQuestionItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    categoryId: row.category_id || null,
    subjectReferenceId: row.subject_reference_id,
    classGradeName: row.class_grade_name,
    curriculumVersionId: row.curriculum_version_id,
    topicReferenceId: row.topic_reference_id,
    learningObjectiveIds: row.learning_objective_ids || [],
    questionType: row.question_type,
    stem: row.stem,
    options: row.options || null,
    correctAnswer: row.correct_answer,
    explanation: row.explanation || '',
    markingRubric: row.marking_rubric || null,
    marks: Number(row.marks ?? 2),
    difficulty: row.difficulty,
    cognitiveDemand: row.cognitive_demand,
    sourceType: row.source_type,
    sourceReference: row.source_reference || null,
    version: Number(row.version ?? 1),
    creationMethod: row.creation_method,
    reviewStatus: row.review_status,
    reviewerId: row.reviewer_id || null,
    approvalTimestamp: row.approval_timestamp ? toIso(row.approval_timestamp) : null,
    exposureCount: Number(row.exposure_count ?? 0),
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapBlueprint(row: any): InstanceAssessmentBlueprint {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    title: row.title,
    subjectReferenceId: row.subject_reference_id,
    classGradeName: row.class_grade_name,
    term: row.term,
    curriculumVersionId: row.curriculum_version_id,
    assessmentType: row.assessment_type,
    questionFormatsCount: row.question_formats_count || {},
    totalMarks: Number(row.total_marks ?? 0),
    difficultyMix: row.difficulty_mix || {},
    timeAllowanceMinutes: Number(row.time_allowance_minutes ?? 60),
    allowVerifiedPastQuestions: Boolean(row.allow_verified_past_questions),
    allowAiPracticeQuestions: Boolean(row.allow_ai_practice_questions),
    completedTopicsOnly: Boolean(row.completed_topics_only),
    selectedTopicIds: row.selected_topic_ids || [],
    ...(row.scope_authorization_id !== undefined ? { scopeAuthorizationId: row.scope_authorization_id || null } : {}),
    ...(row.selected_objective_ids !== undefined ? { selectedObjectiveIds: row.selected_objective_ids || [] } : {}),
    ...(row.source_delivery_ids !== undefined ? { sourceDeliveryIds: row.source_delivery_ids || [] } : {}),
    ...(row.authorized_teacher_user_id !== undefined ? { authorizedTeacherUserId: row.authorized_teacher_user_id || null } : {}),
    ...(row.academic_session !== undefined ? { academicSession: row.academic_session || null } : {}),
    ...(row.section !== undefined ? { section: row.section || 'General' } : {}),
    status: row.status,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapExamConfig(row: any): InstanceExamConfiguration {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    blueprintId: row.blueprint_id || null,
    examCode: row.exam_code,
    title: row.title,
    subjectReferenceId: row.subject_reference_id,
    classGradeName: row.class_grade_name,
    term: row.term,
    academicSession: row.academic_session,
    durationMinutes: Number(row.duration_minutes ?? 60),
    totalMarks: Number(row.total_marks ?? 100),
    instructions: row.instructions || [],
    selectedQuestionIds: row.selected_question_ids || [],
    generationHash: row.generation_hash,
    isLocked: Boolean(row.is_locked),
    authorizedByPrincipal: Boolean(row.authorized_by_principal),
    authorizedBy: row.authorized_by || null,
    authorizedAt: row.authorized_at ? toIso(row.authorized_at) : null,
    markingSchemeUnlocked: Boolean(row.marking_scheme_unlocked),
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapAssessmentRecord(row: any): InstanceAssessmentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    examConfigurationId: row.exam_configuration_id,
    studentId: row.student_id || null,
    studentIdentifier: row.student_identifier,
    scoreObtained: Number(row.score_obtained ?? 0),
    maxScore: Number(row.max_score ?? 100),
    responses: row.responses || {},
    gradedBy: row.graded_by || null,
    gradedAt: row.graded_at ? toIso(row.graded_at) : null,
    status: row.status,
    createdAt: toIso(row.created_at)
  };
}

export class InstanceQuestionBankRepository {
  constructor(private readonly pool: DatabasePool) {}

  private assertValidScope(tenant: VerifiedTenantPrincipal, applicationInstanceId: string): void {
    if (!UUID.test(tenant.tenantId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'A valid school tenant context is required for Question Bank operations.');
    }
    if (!UUID.test(applicationInstanceId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'A valid applicationInstanceId UUID is required.');
    }
  }

  async listCategories(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceQuestionCategory[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.instance_question_categories
         WHERE tenant_id = $1 AND application_instance_id = $2
         ORDER BY name ASC`,
        [tenant.tenantId, applicationInstanceId]
      );
      return res.rows.map(mapCategory);
    });
  }

  async createCategory(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: { name: string; description?: string; subjectReferenceId?: string }
  ): Promise<InstanceQuestionCategory> {
    this.assertValidScope(tenant, applicationInstanceId);
    const actor = tenant.email || tenant.userId || 'school_staff';
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `INSERT INTO production.instance_question_categories
           (tenant_id, application_instance_id, name, description, subject_reference_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, application_instance_id, name) DO UPDATE SET
           description = EXCLUDED.description
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          input.name.trim(),
          input.description || '',
          input.subjectReferenceId || null,
          actor
        ]
      );
      return mapCategory(res.rows[0]);
    });
  }

  async listQuestions(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    filter: {
      subjectReferenceId?: string;
      classGradeName?: string;
      questionType?: string;
      reviewStatus?: string;
      difficulty?: string;
      categoryId?: string;
    } = {}
  ): Promise<InstanceQuestionItem[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];

      if (filter.subjectReferenceId?.trim()) {
        values.push(filter.subjectReferenceId.trim());
        conditions.push(`subject_reference_id = $${values.length}`);
      }
      if (filter.classGradeName?.trim() && filter.classGradeName !== 'all') {
        values.push(filter.classGradeName.trim());
        conditions.push(`class_grade_name = $${values.length}`);
      }
      if (filter.questionType?.trim() && filter.questionType !== 'all') {
        values.push(filter.questionType.trim());
        conditions.push(`question_type = $${values.length}`);
      }
      if (filter.reviewStatus?.trim() && filter.reviewStatus !== 'all') {
        values.push(filter.reviewStatus.trim());
        conditions.push(`review_status = $${values.length}`);
      }
      if (filter.difficulty?.trim() && filter.difficulty !== 'all') {
        values.push(filter.difficulty.trim());
        conditions.push(`difficulty = $${values.length}`);
      }
      if (filter.categoryId?.trim()) {
        values.push(filter.categoryId.trim());
        conditions.push(`category_id = $${values.length}`);
      }

      const res = await client.query(
        `SELECT * FROM production.instance_question_bank_items
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        values
      );
      return res.rows.map(mapQuestion);
    });
  }

  async createQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      id?: string;
      categoryId?: string | null;
      subjectReferenceId: string;
      classGradeName: string;
      curriculumVersionId?: string;
      topicReferenceId?: string;
      learningObjectiveIds?: string[];
      questionType: QuestionType;
      stem: string;
      options?: Array<{ key: string; text: string }> | null;
      correctAnswer: string;
      explanation?: string;
      markingRubric?: Array<{ stepDescription: string; marksAwarded: number }> | null;
      marks?: number;
      difficulty?: QuestionDifficulty;
      cognitiveDemand?: string;
      sourceType?: QuestionSourceType;
      sourceReference?: string | null;
      creationMethod?: 'ai_assisted' | 'manual' | 'imported';
      reviewStatus?: QuestionReviewStatus;
      metadata?: Record<string, unknown>;
    }
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (input.reviewStatus !== undefined && !['draft', 'pending_review'].includes(input.reviewStatus)) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'New questions must be draft or pending review; approval requires a separate review.'
      );
    }
    const actor = tenant.email || tenant.userId || 'school_teacher';
    const hasCustomUuid = Boolean(input.id && UUID.test(input.id));

    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        hasCustomUuid
          ? `INSERT INTO production.instance_question_bank_items
               (id, tenant_id, application_instance_id, category_id, subject_reference_id, class_grade_name,
                curriculum_version_id, topic_reference_id, learning_objective_ids, question_type, stem,
                options, correct_answer, explanation, marking_rubric, marks, difficulty, cognitive_demand,
                source_type, source_reference, creation_method, review_status, metadata, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13, $14, $15::jsonb,
                     $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24)
             RETURNING *`
          : `INSERT INTO production.instance_question_bank_items
               (tenant_id, application_instance_id, category_id, subject_reference_id, class_grade_name,
                curriculum_version_id, topic_reference_id, learning_objective_ids, question_type, stem,
                options, correct_answer, explanation, marking_rubric, marks, difficulty, cognitive_demand,
                source_type, source_reference, creation_method, review_status, metadata, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb, $12, $13, $14::jsonb,
                     $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23)
             RETURNING *`,
        hasCustomUuid
          ? [
              input.id,
              tenant.tenantId,
              applicationInstanceId,
              input.categoryId || null,
              input.subjectReferenceId,
              input.classGradeName,
              input.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
              input.topicReferenceId || 'general',
              JSON.stringify(input.learningObjectiveIds || []),
              input.questionType,
              input.stem,
              input.options ? JSON.stringify(input.options) : null,
              input.correctAnswer,
              input.explanation || '',
              input.markingRubric ? JSON.stringify(input.markingRubric) : null,
              input.marks ?? 2,
              input.difficulty || 'Medium',
              input.cognitiveDemand || 'Application',
              input.sourceType || 'teacher_authored',
              input.sourceReference || null,
              input.creationMethod || 'manual',
              input.reviewStatus || 'pending_review',
              JSON.stringify(input.metadata || {}),
              actor
            ]
          : [
              tenant.tenantId,
              applicationInstanceId,
              input.categoryId || null,
              input.subjectReferenceId,
              input.classGradeName,
              input.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
              input.topicReferenceId || 'general',
              JSON.stringify(input.learningObjectiveIds || []),
              input.questionType,
              input.stem,
              input.options ? JSON.stringify(input.options) : null,
              input.correctAnswer,
              input.explanation || '',
              input.markingRubric ? JSON.stringify(input.markingRubric) : null,
              input.marks ?? 2,
              input.difficulty || 'Medium',
              input.cognitiveDemand || 'Application',
              input.sourceType || 'teacher_authored',
              input.sourceReference || null,
              input.creationMethod || 'manual',
              input.reviewStatus || 'pending_review',
              JSON.stringify(input.metadata || {}),
              actor
            ]
      );
      return mapQuestion(res.rows[0]);
    });
  }

  async reviewQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    reviewStatus: QuestionReviewStatus
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question ID UUID.');
    }
    if (!['draft', 'pending_review', 'approved', 'rejected'].includes(reviewStatus)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question review status.');
    }
    const reviewerId = tenant.email || tenant.userId || 'school_reviewer';
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `UPDATE production.instance_question_bank_items
         SET review_status = $4,
             reviewer_id = $5,
             approval_timestamp = CASE WHEN $4 = 'approved' THEN now() ELSE NULL END,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, questionId, reviewStatus, reviewerId]
      );
      if (res.rowCount === 0) {
        throw new InstanceQuestionBankError('NOT_FOUND', `Question ${questionId} not found in this school instance.`);
      }
      return mapQuestion(res.rows[0]);
    });
  }

  async deleteQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string
  ): Promise<boolean> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) return false;
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `DELETE FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      return (res.rowCount ?? 0) > 0;
    });
  }

  // --- Assessment Blueprints ---
  async listBlueprints(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceAssessmentBlueprint[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.instance_assessment_blueprints
         WHERE tenant_id = $1 AND application_instance_id = $2
         ORDER BY created_at DESC`,
        [tenant.tenantId, applicationInstanceId]
      );
      return res.rows.map(mapBlueprint);
    });
  }

  async createBlueprint(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      title: string;
      subjectReferenceId: string;
      classGradeName: string;
      term: string;
      curriculumVersionId: string;
      assessmentType: 'quiz' | 'test' | 'exam' | 'continuous_assessment';
      questionFormatsCount: Record<string, number>;
      totalMarks: number;
      difficultyMix: Record<string, number>;
      timeAllowanceMinutes?: number;
      allowVerifiedPastQuestions?: boolean;
      allowAiPracticeQuestions?: boolean;
      completedTopicsOnly?: boolean;
      selectedTopicIds?: string[];
      scopeAuthorizationId?: string | null;
      selectedObjectiveIds?: string[];
      sourceDeliveryIds?: string[];
      authorizedTeacherUserId?: string | null;
      academicSession?: string | null;
      section?: string;
    }
  ): Promise<InstanceAssessmentBlueprint> {
    this.assertValidScope(tenant, applicationInstanceId);
    const actor = tenant.email || tenant.userId || 'school_examiner';
    const hasPhaseAProvenance = Boolean(
      input.scopeAuthorizationId ||
      (input.selectedObjectiveIds && input.selectedObjectiveIds.length > 0) ||
      (input.sourceDeliveryIds && input.sourceDeliveryIds.length > 0) ||
      input.authorizedTeacherUserId ||
      input.academicSession ||
      input.section
    );
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        hasPhaseAProvenance
          ? `INSERT INTO production.instance_assessment_blueprints
               (tenant_id, application_instance_id, title, subject_reference_id, class_grade_name, term,
                curriculum_version_id, assessment_type, question_formats_count, total_marks, difficulty_mix,
                time_allowance_minutes, allow_verified_past_questions, allow_ai_practice_questions,
                completed_topics_only, selected_topic_ids, scope_authorization_id, selected_objective_ids,
                source_delivery_ids, authorized_teacher_user_id, academic_session, section, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12, $13, $14, $15, $16::jsonb,
                     $17, $18::jsonb, $19::jsonb, $20, $21, $22, 'draft', $23)
             RETURNING *`
          : `INSERT INTO production.instance_assessment_blueprints
               (tenant_id, application_instance_id, title, subject_reference_id, class_grade_name, term,
                curriculum_version_id, assessment_type, question_formats_count, total_marks, difficulty_mix,
                time_allowance_minutes, allow_verified_past_questions, allow_ai_practice_questions,
                completed_topics_only, selected_topic_ids, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12, $13, $14, $15, $16::jsonb, 'draft', $17)
             RETURNING *`,
        hasPhaseAProvenance
          ? [
              tenant.tenantId,
              applicationInstanceId,
              input.title,
              input.subjectReferenceId,
              input.classGradeName,
              input.term,
              input.curriculumVersionId,
              input.assessmentType,
              JSON.stringify(input.questionFormatsCount || {}),
              input.totalMarks,
              JSON.stringify(input.difficultyMix || {}),
              input.timeAllowanceMinutes ?? 60,
              input.allowVerifiedPastQuestions ?? true,
              input.allowAiPracticeQuestions ?? true,
              input.completedTopicsOnly ?? false,
              JSON.stringify(input.selectedTopicIds || []),
              input.scopeAuthorizationId || null,
              JSON.stringify(input.selectedObjectiveIds || []),
              JSON.stringify(input.sourceDeliveryIds || []),
              input.authorizedTeacherUserId || null,
              input.academicSession || null,
              input.section || 'General',
              actor
            ]
          : [
              tenant.tenantId,
              applicationInstanceId,
              input.title,
              input.subjectReferenceId,
              input.classGradeName,
              input.term,
              input.curriculumVersionId,
              input.assessmentType,
              JSON.stringify(input.questionFormatsCount || {}),
              input.totalMarks,
              JSON.stringify(input.difficultyMix || {}),
              input.timeAllowanceMinutes ?? 60,
              input.allowVerifiedPastQuestions ?? true,
              input.allowAiPracticeQuestions ?? true,
              input.completedTopicsOnly ?? false,
              JSON.stringify(input.selectedTopicIds || []),
              actor
            ]
      );
      return mapBlueprint(res.rows[0]);
    });
  }

  // --- Exam Configurations & Question Selections ---
  async listExamConfigurations(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceExamConfiguration[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.instance_exam_configurations
         WHERE tenant_id = $1 AND application_instance_id = $2
         ORDER BY created_at DESC`,
        [tenant.tenantId, applicationInstanceId]
      );
      return res.rows.map(mapExamConfig);
    });
  }

  async createExamConfiguration(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      blueprintId?: string | null;
      examCode: string;
      title: string;
      subjectReferenceId: string;
      classGradeName: string;
      term: string;
      academicSession?: string;
      durationMinutes?: number;
      totalMarks?: number;
      instructions?: string[];
      selectedQuestionIds?: string[];
      generationHash: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<InstanceExamConfiguration> {
    this.assertValidScope(tenant, applicationInstanceId);
    const actor = tenant.email || tenant.userId || 'school_examiner';
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `INSERT INTO production.instance_exam_configurations
           (tenant_id, application_instance_id, blueprint_id, exam_code, title, subject_reference_id,
            class_grade_name, term, academic_session, duration_minutes, total_marks, instructions,
            selected_question_ids, generation_hash, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15::jsonb, $16)
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          input.blueprintId || null,
          input.examCode,
          input.title,
          input.subjectReferenceId,
          input.classGradeName,
          input.term,
          input.academicSession || '2026/2027',
          input.durationMinutes ?? 60,
          input.totalMarks ?? 100,
          JSON.stringify(input.instructions || []),
          JSON.stringify(input.selectedQuestionIds || []),
          input.generationHash,
          JSON.stringify(input.metadata || {}),
          actor
        ]
      );
      return mapExamConfig(res.rows[0]);
    });
  }

  // --- Assessment Records ---
  async recordAssessmentSubmission(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      examConfigurationId: string;
      studentId?: string | null;
      studentIdentifier: string;
      scoreObtained: number;
      maxScore: number;
      responses: Record<string, unknown>;
      status?: 'in_progress' | 'submitted' | 'graded' | 'verified';
    }
  ): Promise<InstanceAssessmentRecord> {
    this.assertValidScope(tenant, applicationInstanceId);
    const actor = tenant.email || tenant.userId || 'school_examiner';
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `INSERT INTO production.instance_assessment_records
           (tenant_id, application_instance_id, exam_configuration_id, student_id, student_identifier,
            score_obtained, max_score, responses, graded_by, graded_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now(), $10)
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          input.examConfigurationId,
          input.studentId || null,
          input.studentIdentifier,
          input.scoreObtained,
          input.maxScore,
          JSON.stringify(input.responses || {}),
          actor,
          input.status || 'graded'
        ]
      );
      return mapAssessmentRecord(res.rows[0]);
    });
  }

  async listAssessmentRecords(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    examConfigurationId?: string
  ): Promise<InstanceAssessmentRecord[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (examConfigurationId && UUID.test(examConfigurationId)) {
        values.push(examConfigurationId);
        conditions.push(`exam_configuration_id = $${values.length}`);
      }
      const res = await client.query(
        `SELECT * FROM production.instance_assessment_records
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        values
      );
      return res.rows.map(mapAssessmentRecord);
    });
  }
}
