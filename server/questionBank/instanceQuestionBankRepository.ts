import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withTenantTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import type {
  InstanceAssessmentBlueprint,
  InstanceAssessmentRecord,
  InstanceExamConfiguration,
  InstanceQuestionCategory,
  InstanceQuestionItem,
  QuestionDeleteOrArchiveResult,
  QuestionDifficulty,
  QuestionReviewStatus,
  QuestionSourceType,
  QuestionType
} from './instanceQuestionBankTypes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_QUESTION_TYPES: readonly QuestionType[] = ['objective', 'theory', 'practical', 'calculation'];
const VALID_DIFFICULTIES: readonly QuestionDifficulty[] = ['Easy', 'Medium', 'Hard'];
const VALID_REVIEW_STATUSES: readonly QuestionReviewStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];
const VALID_SOURCE_TYPES: readonly QuestionSourceType[] = [
  'verified_past_question',
  'official_sample',
  'teacher_authored',
  'ai_practice',
  'imported_unverified'
];
const VALID_CREATION_METHODS = ['ai_assisted', 'manual', 'imported'] as const;
const VALID_ASSESSMENT_TYPES = ['quiz', 'test', 'exam', 'continuous_assessment'] as const;
const VALID_RECORD_STATUSES = ['in_progress', 'submitted', 'graded', 'verified'] as const;
const OVERSIGHT_ROLES = new Set([
  'tenant_admin',
  'principal',
  'principal_administrator',
  'vice_principal_academic',
  'examination_officer',
  'department_head'
]);
const ALLOWED_REVIEW_TRANSITIONS: Record<QuestionReviewStatus, readonly QuestionReviewStatus[]> = {
  draft: ['pending_review', 'approved', 'rejected'],
  pending_review: ['approved', 'rejected', 'draft'],
  rejected: ['pending_review', 'draft'],
  approved: ['rejected']
};

export class InstanceQuestionBankError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT',
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
    createdAt: toIso(row.created_at),
    ...(row.updated_at !== undefined ? { updatedAt: toIso(row.updated_at) } : {})
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
    archivedAt: row.archived_at ? toIso(row.archived_at) : null,
    archivedBy: row.archived_by || null,
    archiveReason: row.archive_reason || null,
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

function isTeacherRestricted(actor: AuthorizedPrincipal | undefined, permission: string): boolean {
  if (!actor) return false;
  return !actor.grants.some(grant =>
    OVERSIGHT_ROLES.has(grant.roleCode) && grant.permissions.includes(permission)
  );
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

  private async assertInstanceOwnership(
    client: DatabaseClient,
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<void> {
    const owned = await client.query<{ id: string }>(
      `SELECT id FROM production.application_instances
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenant.tenantId, applicationInstanceId]
    );
    if ((owned.rowCount ?? 0) === 0) {
      throw new InstanceQuestionBankError(
        'FORBIDDEN',
        'The requested application instance does not belong to the authenticated tenant.'
      );
    }
  }

  private async assertTeacherAssignmentScope(
    client: DatabaseClient,
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    actor: AuthorizedPrincipal | undefined,
    permission: string,
    subjectReferenceId: string | null | undefined,
    classGradeName?: string | null
  ): Promise<void> {
    if (!actor || !isTeacherRestricted(actor, permission)) return;

    if (!subjectReferenceId || !subjectReferenceId.trim()) {
      throw new InstanceQuestionBankError(
        'FORBIDDEN',
        'Teacher-scoped operations must identify an assigned subject.'
      );
    }

    const params: unknown[] = [tenant.tenantId, applicationInstanceId, actor.userId, subjectReferenceId.trim()];
    let gradePredicate = '';
    if (classGradeName && classGradeName.trim()) {
      params.push(classGradeName.trim());
      gradePredicate = ` AND lower(class_grade_name) = lower($${params.length})`;
    }

    const assigned = await client.query(
      `SELECT id FROM production.teacher_subject_assignments
       WHERE tenant_id = $1
         AND application_instance_id = $2
         AND teacher_user_id = $3
         AND status = 'active'
         AND (lower(subject_id) = lower($4) OR lower(subject_name) = lower($4))${gradePredicate}
       LIMIT 1`,
      params
    );
    if ((assigned.rowCount ?? 0) === 0) {
      throw new InstanceQuestionBankError(
        'FORBIDDEN',
        'Teacher is not actively assigned to this subject and class grade in this school instance.'
      );
    }
  }

  private async writeAuditEvent(
    client: DatabaseClient,
    tenant: VerifiedTenantPrincipal,
    actor: AuthorizedPrincipal | undefined,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const actorSubject = actor?.userId || tenant.userId || tenant.email || 'school_staff';
    await client.query(
      `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [tenant.tenantId, actorSubject, action, JSON.stringify(details)]
    );
  }

  async listCategories(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceQuestionCategory[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
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
    input: { name: string; description?: string; subjectReferenceId?: string },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionCategory> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 2 || name.length > 120) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Category name must be between 2 and 120 characters.');
    }
    const description = typeof input.description === 'string' ? input.description.trim().slice(0, 500) : '';
    const subjectReferenceId = typeof input.subjectReferenceId === 'string' && input.subjectReferenceId.trim()
      ? input.subjectReferenceId.trim()
      : null;

    const actor = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_staff';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        subjectReferenceId
      );
      const res = await client.query(
        `INSERT INTO production.instance_question_categories
           (tenant_id, application_instance_id, name, description, subject_reference_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, application_instance_id, name) DO UPDATE SET
           description = EXCLUDED.description,
           subject_reference_id = COALESCE(EXCLUDED.subject_reference_id, production.instance_question_categories.subject_reference_id),
           updated_at = now()
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          name,
          description,
          subjectReferenceId,
          actor
        ]
      );
      const category = mapCategory(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_category_created', {
        applicationInstanceId,
        categoryId: category.id,
        name: category.name,
        subjectReferenceId: category.subjectReferenceId ?? null
      });
      return category;
    });
  }

  async updateCategory(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    categoryId: string,
    input: { name?: string; description?: string; subjectReferenceId?: string | null },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionCategory> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(categoryId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid category ID UUID.');
    }
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    const nextName = input.name !== undefined ? input.name.trim() : undefined;
    if (nextName !== undefined && (nextName.length < 2 || nextName.length > 120)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Category name must be between 2 and 120 characters.');
    }
    const nextDescription = input.description !== undefined ? input.description.trim().slice(0, 500) : undefined;
    const hasSubjectPatch = input.subjectReferenceId !== undefined;
    const nextSubject = input.subjectReferenceId === null
      ? null
      : typeof input.subjectReferenceId === 'string' && input.subjectReferenceId.trim()
        ? input.subjectReferenceId.trim()
        : null;
    if (nextName === undefined && nextDescription === undefined && !hasSubjectPatch) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'At least one category field must be provided for update.');
    }

    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const existing = await client.query(
        `SELECT * FROM production.instance_question_categories
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, categoryId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        throw new InstanceQuestionBankError('NOT_FOUND', `Category ${categoryId} not found in this school instance.`);
      }
      const effectiveSubject = hasSubjectPatch ? nextSubject : existing.rows[0].subject_reference_id;
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        effectiveSubject
      );

      const res = await client.query(
        `UPDATE production.instance_question_categories
         SET name = COALESCE($4, name),
             description = COALESCE($5, description),
             subject_reference_id = CASE WHEN $6::boolean THEN $7 ELSE subject_reference_id END,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          categoryId,
          nextName ?? null,
          nextDescription ?? null,
          hasSubjectPatch,
          nextSubject
        ]
      );
      const updated = mapCategory(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_category_updated', {
        applicationInstanceId,
        categoryId: updated.id,
        name: updated.name,
        subjectReferenceId: updated.subjectReferenceId ?? null
      });
      return updated;
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
      includeArchived?: boolean;
    } = {}
  ): Promise<InstanceQuestionItem[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (filter.categoryId?.trim() && !UUID.test(filter.categoryId.trim())) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid categoryId filter UUID.');
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      if (!filter.includeArchived) {
        conditions.push('archived_at IS NULL');
      }
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
    },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    if (input.reviewStatus !== undefined && !['draft', 'pending_review'].includes(input.reviewStatus)) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'New questions must be draft or pending review; approval requires a separate review.'
      );
    }
    if (input.id !== undefined && !UUID.test(input.id)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Question ID must be a valid UUID.');
    }
    if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '' && !UUID.test(input.categoryId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Category ID must be a valid UUID.');
    }
    if (!VALID_QUESTION_TYPES.includes(input.questionType)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid question type: ${String(input.questionType)}.`);
    }
    const difficulty = input.difficulty || 'Medium';
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid difficulty: ${String(difficulty)}.`);
    }
    const sourceType = input.sourceType || 'teacher_authored';
    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid source type: ${String(sourceType)}.`);
    }
    const creationMethod = input.creationMethod || 'manual';
    if (!VALID_CREATION_METHODS.includes(creationMethod)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid creation method: ${String(creationMethod)}.`);
    }
    const marks = input.marks ?? 2;
    if (!Number.isInteger(marks) || marks < 1 || marks > 200) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Question marks must be a positive integer between 1 and 200.');
    }
    const stem = typeof input.stem === 'string' ? input.stem.trim() : '';
    const correctAnswer = typeof input.correctAnswer === 'string' ? input.correctAnswer.trim() : '';
    const subjectReferenceId = typeof input.subjectReferenceId === 'string' ? input.subjectReferenceId.trim() : '';
    const classGradeName = typeof input.classGradeName === 'string' ? input.classGradeName.trim() : '';
    if (!stem || !correctAnswer || !subjectReferenceId || !classGradeName) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'subjectReferenceId, classGradeName, stem, and correctAnswer are required.'
      );
    }
    if (input.options !== undefined && input.options !== null) {
      if (!Array.isArray(input.options) || input.options.length < 2) {
        throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Question options must include at least two choices.');
      }
      const seenKeys = new Set<string>();
      for (const option of input.options) {
        if (!option || typeof option.key !== 'string' || !option.key.trim() ||
            typeof option.text !== 'string' || !option.text.trim()) {
          throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Each question option must specify non-empty key and text.');
        }
        const normKey = option.key.trim().toLowerCase();
        if (seenKeys.has(normKey)) {
          throw new InstanceQuestionBankError('VALIDATION_ERROR', `Duplicate option key: ${option.key}.`);
        }
        seenKeys.add(normKey);
      }
      const normAnswer = correctAnswer.toLowerCase();
      const matchesOption = input.options.some(option =>
        option.key.trim().toLowerCase() === normAnswer || option.text.trim().toLowerCase() === normAnswer
      );
      if (!matchesOption) {
        throw new InstanceQuestionBankError(
          'VALIDATION_ERROR',
          'Objective correctAnswer must match one of the supplied option keys or option texts.'
        );
      }
    }
    if (input.markingRubric !== undefined && input.markingRubric !== null) {
      if (!Array.isArray(input.markingRubric)) {
        throw new InstanceQuestionBankError('VALIDATION_ERROR', 'markingRubric must be an array.');
      }
      for (const step of input.markingRubric) {
        if (!step || typeof step.stepDescription !== 'string' || !step.stepDescription.trim() ||
            typeof step.marksAwarded !== 'number' || !Number.isFinite(step.marksAwarded) || step.marksAwarded <= 0) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            'Each marking rubric step requires a non-empty description and positive marksAwarded.'
          );
        }
      }
    }

    const actor = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_teacher';
    const hasCustomUuid = Boolean(input.id && UUID.test(input.id));

    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        subjectReferenceId,
        classGradeName
      );
      if (input.categoryId) {
        const cat = await client.query(
          `SELECT id FROM production.instance_question_categories
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
          [tenant.tenantId, applicationInstanceId, input.categoryId]
        );
        if ((cat.rowCount ?? 0) === 0) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            `Category ${input.categoryId} does not exist in this school instance.`
          );
        }
      }
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
              subjectReferenceId,
              classGradeName,
              input.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
              input.topicReferenceId || 'general',
              JSON.stringify(input.learningObjectiveIds || []),
              input.questionType,
              stem,
              input.options ? JSON.stringify(input.options) : null,
              correctAnswer,
              input.explanation || '',
              input.markingRubric ? JSON.stringify(input.markingRubric) : null,
              marks,
              difficulty,
              input.cognitiveDemand || 'Application',
              sourceType,
              input.sourceReference || null,
              creationMethod,
              input.reviewStatus || 'pending_review',
              JSON.stringify(input.metadata || {}),
              actor
            ]
          : [
              tenant.tenantId,
              applicationInstanceId,
              input.categoryId || null,
              subjectReferenceId,
              classGradeName,
              input.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
              input.topicReferenceId || 'general',
              JSON.stringify(input.learningObjectiveIds || []),
              input.questionType,
              stem,
              input.options ? JSON.stringify(input.options) : null,
              correctAnswer,
              input.explanation || '',
              input.markingRubric ? JSON.stringify(input.markingRubric) : null,
              marks,
              difficulty,
              input.cognitiveDemand || 'Application',
              sourceType,
              input.sourceReference || null,
              creationMethod,
              input.reviewStatus || 'pending_review',
              JSON.stringify(input.metadata || {}),
              actor
            ]
      );
      const item = mapQuestion(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_item_created', {
        applicationInstanceId,
        questionId: item.id,
        subjectReferenceId: item.subjectReferenceId,
        classGradeName: item.classGradeName,
        questionType: item.questionType,
        reviewStatus: item.reviewStatus
      });
      return item;
    });
  }

  async submitQuestionForReview(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question ID UUID.');
    }
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const existing = await client.query(
        `SELECT * FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        throw new InstanceQuestionBankError('NOT_FOUND', `Question ${questionId} not found in this school instance.`);
      }
      const row = existing.rows[0];
      if (row.archived_at) {
        throw new InstanceQuestionBankError('CONFLICT', 'Archived questions cannot be submitted for review.');
      }
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        row.subject_reference_id,
        row.class_grade_name
      );
      if (!['draft', 'rejected'].includes(row.review_status)) {
        throw new InstanceQuestionBankError(
          'VALIDATION_ERROR',
          `Only draft or rejected questions can be submitted for review (current status: ${row.review_status}).`
        );
      }
      const res = await client.query(
        `UPDATE production.instance_question_bank_items
         SET review_status = 'pending_review',
             approval_timestamp = NULL,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      const updated = mapQuestion(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_item_submitted_for_review', {
        applicationInstanceId,
        questionId,
        previousStatus: row.review_status,
        reviewStatus: updated.reviewStatus
      });
      return updated;
    });
  }

  async reviewQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    reviewStatus: QuestionReviewStatus,
    actorPrincipal?: AuthorizedPrincipal,
    reason?: string
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question ID UUID.');
    }
    if (!VALID_REVIEW_STATUSES.includes(reviewStatus)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question review status.');
    }
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankReview, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.review permission for this application instance.');
    }
    const reviewerId = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_reviewer';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const existing = await client.query(
        `SELECT * FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        throw new InstanceQuestionBankError('NOT_FOUND', `Question ${questionId} not found in this school instance.`);
      }
      const row = existing.rows[0];
      if (row.archived_at) {
        throw new InstanceQuestionBankError('CONFLICT', 'Archived questions cannot be reviewed.');
      }
      const currentStatus = (row.review_status || 'pending_review') as QuestionReviewStatus;
      if (currentStatus !== reviewStatus) {
        const allowed = ALLOWED_REVIEW_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(reviewStatus)) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            `Invalid review state transition from '${currentStatus}' to '${reviewStatus}'.`
          );
        }
      }
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
      const updated = mapQuestion(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, `question_bank_item_${reviewStatus}`, {
        applicationInstanceId,
        questionId,
        previousStatus: currentStatus,
        reviewStatus,
        ...(reason ? { reason: reason.slice(0, 300) } : {})
      });
      return updated;
    });
  }

  async archiveQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    reason = 'Archived by authorized staff',
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceQuestionItem> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid question ID UUID.');
    }
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    const actorId = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_staff';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const existing = await client.query(
        `SELECT * FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        throw new InstanceQuestionBankError('NOT_FOUND', `Question ${questionId} not found in this school instance.`);
      }
      const row = existing.rows[0];
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        row.subject_reference_id,
        row.class_grade_name
      );
      if (isTeacherRestricted(actorPrincipal, PERMISSIONS.questionBankManage) && row.review_status === 'approved') {
        throw new InstanceQuestionBankError('FORBIDDEN', 'Approved questions require reviewer or leadership authorization to archive.');
      }
      if (row.archived_at) {
        return mapQuestion(row);
      }
      const res = await client.query(
        `UPDATE production.instance_question_bank_items
         SET archived_at = now(),
             archived_by = $4,
             archive_reason = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, questionId, actorId, reason.trim().slice(0, 300) || 'Archived']
      );
      const archived = mapQuestion(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_item_archived', {
        applicationInstanceId,
        questionId,
        reason: archived.archiveReason
      });
      return archived;
    });
  }

  async deleteOrArchiveQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal,
    reason?: string
  ): Promise<QuestionDeleteOrArchiveResult> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (!UUID.test(questionId)) {
      return { found: false, deleted: false, archived: false };
    }
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.questionBankManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing question_bank.manage permission for this application instance.');
    }
    const actorId = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_staff';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const existing = await client.query(
        `SELECT * FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      if ((existing.rowCount ?? 0) === 0) {
        return { found: false, deleted: false, archived: false };
      }
      const row = existing.rows[0];
      await this.assertTeacherAssignmentScope(
        client,
        tenant,
        applicationInstanceId,
        actorPrincipal,
        PERMISSIONS.questionBankManage,
        row.subject_reference_id,
        row.class_grade_name
      );
      if (isTeacherRestricted(actorPrincipal, PERMISSIONS.questionBankManage) && row.review_status === 'approved') {
        throw new InstanceQuestionBankError('FORBIDDEN', 'Approved questions require reviewer or leadership authorization to archive or remove.');
      }

      const references = await client.query<{ referenced: boolean }>(
        `SELECT (
           EXISTS (
             SELECT 1 FROM production.instance_exam_configurations
             WHERE tenant_id = $1 AND application_instance_id = $2
               AND selected_question_ids ? $3
           )
           OR EXISTS (
             SELECT 1 FROM production.instance_assessment_records
             WHERE tenant_id = $1 AND application_instance_id = $2
               AND responses ? $3
           )
         ) AS referenced`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      const isReferenced = Boolean(references.rows[0]?.referenced) || row.review_status === 'approved';
      if (isReferenced) {
        if (row.archived_at) {
          return { found: true, deleted: false, archived: true, question: mapQuestion(row) };
        }
        const archivedRes = await client.query(
          `UPDATE production.instance_question_bank_items
           SET archived_at = now(),
               archived_by = $4,
               archive_reason = $5,
               updated_at = now()
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
           RETURNING *`,
          [
            tenant.tenantId,
            applicationInstanceId,
            questionId,
            actorId,
            reason?.trim().slice(0, 300) || 'Preserved in archive due to assessment or approval history'
          ]
        );
        const question = mapQuestion(archivedRes.rows[0]);
        await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_item_archived', {
          applicationInstanceId,
          questionId,
          reason: question.archiveReason
        });
        return { found: true, deleted: false, archived: true, question };
      }

      const deleted = await client.query(
        `DELETE FROM production.instance_question_bank_items
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
        [tenant.tenantId, applicationInstanceId, questionId]
      );
      if ((deleted.rowCount ?? 0) === 0) {
        return { found: false, deleted: false, archived: false };
      }
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'question_bank_item_deleted', {
        applicationInstanceId,
        questionId,
        subjectReferenceId: row.subject_reference_id,
        reviewStatus: row.review_status
      });
      return { found: true, deleted: true, archived: false };
    });
  }

  async deleteQuestion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    questionId: string,
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<boolean> {
    const result = await this.deleteOrArchiveQuestion(tenant, applicationInstanceId, questionId, actorPrincipal);
    return result.deleted || result.archived;
  }

  // --- Assessment Blueprints ---
  async listBlueprints(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceAssessmentBlueprint[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
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
    },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceAssessmentBlueprint> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.assessmentsManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing assessments.manage permission for this application instance.');
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const subjectReferenceId = typeof input.subjectReferenceId === 'string' ? input.subjectReferenceId.trim() : '';
    const classGradeName = typeof input.classGradeName === 'string' ? input.classGradeName.trim() : '';
    const term = typeof input.term === 'string' ? input.term.trim() : '';
    const curriculumVersionId = typeof input.curriculumVersionId === 'string' ? input.curriculumVersionId.trim() : '';
    if (title.length < 2 || title.length > 240 || !subjectReferenceId || !classGradeName || !term || !curriculumVersionId) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'Blueprint requires title (2-240 chars), subjectReferenceId, classGradeName, term, and curriculumVersionId.'
      );
    }
    if (!VALID_ASSESSMENT_TYPES.includes(input.assessmentType)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid assessmentType: ${String(input.assessmentType)}.`);
    }
    if (!Number.isFinite(input.totalMarks) || input.totalMarks <= 0) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Blueprint totalMarks must be positive.');
    }
    const timeAllowanceMinutes = input.timeAllowanceMinutes ?? 60;
    if (!Number.isInteger(timeAllowanceMinutes) || timeAllowanceMinutes <= 0) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Blueprint timeAllowanceMinutes must be a positive integer.');
    }
    if (input.scopeAuthorizationId && !UUID.test(input.scopeAuthorizationId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid scopeAuthorizationId UUID.');
    }

    const actor = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_examiner';
    const hasPhaseAProvenance = Boolean(
      input.scopeAuthorizationId ||
      (input.selectedObjectiveIds && input.selectedObjectiveIds.length > 0) ||
      (input.sourceDeliveryIds && input.sourceDeliveryIds.length > 0) ||
      input.authorizedTeacherUserId ||
      input.academicSession ||
      input.section
    );
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      if (input.scopeAuthorizationId) {
        const authRes = await client.query(
          `SELECT id FROM production.assessment_scope_authorizations
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
          [tenant.tenantId, applicationInstanceId, input.scopeAuthorizationId]
        );
        if ((authRes.rowCount ?? 0) === 0) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            `Scope authorization ${input.scopeAuthorizationId} does not belong to this school instance.`
          );
        }
      }
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
              title,
              subjectReferenceId,
              classGradeName,
              term,
              curriculumVersionId,
              input.assessmentType,
              JSON.stringify(input.questionFormatsCount || {}),
              input.totalMarks,
              JSON.stringify(input.difficultyMix || {}),
              timeAllowanceMinutes,
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
              title,
              subjectReferenceId,
              classGradeName,
              term,
              curriculumVersionId,
              input.assessmentType,
              JSON.stringify(input.questionFormatsCount || {}),
              input.totalMarks,
              JSON.stringify(input.difficultyMix || {}),
              timeAllowanceMinutes,
              input.allowVerifiedPastQuestions ?? true,
              input.allowAiPracticeQuestions ?? true,
              input.completedTopicsOnly ?? false,
              JSON.stringify(input.selectedTopicIds || []),
              actor
            ]
      );
      const blueprint = mapBlueprint(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'assessment_blueprint_created', {
        applicationInstanceId,
        blueprintId: blueprint.id,
        title: blueprint.title,
        assessmentType: blueprint.assessmentType,
        totalMarks: blueprint.totalMarks
      });
      return blueprint;
    });
  }

  // --- Exam Configurations & Question Selections ---
  async listExamConfigurations(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string
  ): Promise<InstanceExamConfiguration[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
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
    },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceExamConfiguration> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.assessmentsManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing assessments.manage permission for this application instance.');
    }
    const examCode = typeof input.examCode === 'string' ? input.examCode.trim() : '';
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const subjectReferenceId = typeof input.subjectReferenceId === 'string' ? input.subjectReferenceId.trim() : '';
    const classGradeName = typeof input.classGradeName === 'string' ? input.classGradeName.trim() : '';
    const term = typeof input.term === 'string' ? input.term.trim() : '';
    const generationHash = typeof input.generationHash === 'string' ? input.generationHash.trim() : '';
    if (!examCode || title.length < 2 || title.length > 240 || !subjectReferenceId || !classGradeName || !term || !generationHash) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'Exam configuration requires examCode, title (2-240 chars), subjectReferenceId, classGradeName, term, and generationHash.'
      );
    }
    const durationMinutes = input.durationMinutes ?? 60;
    const totalMarks = input.totalMarks ?? 100;
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || !Number.isInteger(totalMarks) || totalMarks <= 0) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Exam durationMinutes and totalMarks must be positive integers.');
    }
    if (input.blueprintId && !UUID.test(input.blueprintId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid blueprintId UUID.');
    }
    const selectedQuestionIds = input.selectedQuestionIds || [];
    if (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.some(id => typeof id !== 'string' || !UUID.test(id))) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'All selectedQuestionIds must be valid UUIDs.');
    }
    const uniqueQuestionIds = [...new Set(selectedQuestionIds)];

    const actor = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_examiner';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      if (input.blueprintId) {
        const bp = await client.query(
          `SELECT id FROM production.instance_assessment_blueprints
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
          [tenant.tenantId, applicationInstanceId, input.blueprintId]
        );
        if ((bp.rowCount ?? 0) === 0) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            `Assessment blueprint ${input.blueprintId} does not belong to this school instance.`
          );
        }
      }
      if (uniqueQuestionIds.length > 0) {
        const questions = await client.query<{ id: string; review_status: string; archived_at: unknown }>(
          `SELECT id, review_status, archived_at
           FROM production.instance_question_bank_items
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = ANY($3::uuid[])`,
          [tenant.tenantId, applicationInstanceId, uniqueQuestionIds]
        );
        if (questions.rows.length !== uniqueQuestionIds.length) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            'One or more selectedQuestionIds do not belong to this school instance.'
          );
        }
        if (questions.rows.some(q => q.archived_at || q.review_status === 'rejected')) {
          throw new InstanceQuestionBankError(
            'VALIDATION_ERROR',
            'Archived or rejected questions cannot be included in an exam configuration.'
          );
        }
      }
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
          examCode,
          title,
          subjectReferenceId,
          classGradeName,
          term,
          input.academicSession || '2026/2027',
          durationMinutes,
          totalMarks,
          JSON.stringify(input.instructions || []),
          JSON.stringify(uniqueQuestionIds),
          generationHash,
          JSON.stringify(input.metadata || {}),
          actor
        ]
      );
      const exam = mapExamConfig(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'exam_configuration_created', {
        applicationInstanceId,
        examConfigurationId: exam.id,
        examCode: exam.examCode,
        blueprintId: exam.blueprintId,
        selectedQuestionCount: exam.selectedQuestionIds.length
      });
      return exam;
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
    },
    actorPrincipal?: AuthorizedPrincipal
  ): Promise<InstanceAssessmentRecord> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (actorPrincipal && !actorPrincipal.hasPermissionFor(PERMISSIONS.assessmentsManage, 'application_instance', applicationInstanceId)) {
      throw new InstanceQuestionBankError('FORBIDDEN', 'Missing assessments.manage permission for this application instance.');
    }
    if (!UUID.test(input.examConfigurationId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'A valid examConfigurationId UUID is required.');
    }
    if (input.studentId !== undefined && input.studentId !== null && input.studentId !== '' && !UUID.test(input.studentId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid studentId UUID.');
    }
    const studentIdentifier = typeof input.studentIdentifier === 'string' ? input.studentIdentifier.trim() : '';
    if (!studentIdentifier) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'studentIdentifier is required.');
    }
    if (!Number.isFinite(input.maxScore) || input.maxScore <= 0 ||
        !Number.isFinite(input.scoreObtained) || input.scoreObtained < 0 || input.scoreObtained > input.maxScore) {
      throw new InstanceQuestionBankError(
        'VALIDATION_ERROR',
        'scoreObtained must be between 0 and a positive maxScore.'
      );
    }
    const status = input.status || 'graded';
    if (!VALID_RECORD_STATUSES.includes(status)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', `Invalid assessment record status: ${String(status)}.`);
    }

    const actor = actorPrincipal?.userId || tenant.email || tenant.userId || 'school_examiner';
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
      const exam = await client.query<{ id: string }>(
        `SELECT id FROM production.instance_exam_configurations
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
        [tenant.tenantId, applicationInstanceId, input.examConfigurationId]
      );
      if ((exam.rowCount ?? 0) === 0) {
        throw new InstanceQuestionBankError(
          'FORBIDDEN',
          `Exam configuration ${input.examConfigurationId} does not belong to this school instance.`
        );
      }
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
          studentIdentifier,
          input.scoreObtained,
          input.maxScore,
          JSON.stringify(input.responses || {}),
          actor,
          status
        ]
      );
      const record = mapAssessmentRecord(res.rows[0]);
      await this.writeAuditEvent(client, tenant, actorPrincipal, 'assessment_record_submitted', {
        applicationInstanceId,
        assessmentRecordId: record.id,
        examConfigurationId: record.examConfigurationId,
        status: record.status
      });
      return record;
    });
  }

  async listAssessmentRecords(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    examConfigurationId?: string
  ): Promise<InstanceAssessmentRecord[]> {
    this.assertValidScope(tenant, applicationInstanceId);
    if (examConfigurationId !== undefined && examConfigurationId !== '' && !UUID.test(examConfigurationId)) {
      throw new InstanceQuestionBankError('VALIDATION_ERROR', 'Invalid examConfigurationId filter UUID.');
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      await this.assertInstanceOwnership(client, tenant, applicationInstanceId);
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
