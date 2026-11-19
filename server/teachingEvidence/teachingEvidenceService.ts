import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import { TeachingEvidenceRepository } from './teachingEvidenceRepository';
import {
  TeachingEvidenceError,
  type AdminVerificationStatus,
  type AssessmentGenerationProvenanceRecord,
  type AssessmentScopeAuthorization,
  type CoverageMode,
  type LessonNoteRecord,
  type ScopeAssessmentType,
  type StudentEngagementLevel,
  type SubjectProgressSummary,
  type TeacherSubjectAssignment,
  type TeachingDeliveryAuditEntry,
  type TeachingDeliveryRecord,
  type UnderstandingLevel,
  type VerifiedTaughtEvidenceBundle,
  type VerifiedTaughtTopicEvidence
} from './teachingEvidenceTypes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACADEMIC_OVERSIGHT_ROLES = new Set([
  'tenant_admin',
  'principal',
  'principal_administrator',
  'vice_principal_academic',
  'academic_coordinator',
  'examination_officer',
  'department_head'
]);

const TEACHER_ELIGIBLE_ROLES = new Set(['teacher', 'subject_teacher']);

export interface TeachingActorContext {
  tenant: VerifiedTenantPrincipal;
  applicationInstanceId: string;
  authorizedPrincipal?: AuthorizedPrincipal;
  userId?: string;
  role?: string;
}

export interface EvaluatedScopeContext {
  assignment: TeacherSubjectAssignment;
  scopeAuthorization: AssessmentScopeAuthorization;
  evidenceBundle: VerifiedTaughtEvidenceBundle;
  scopedTopics: VerifiedTaughtTopicEvidence[];
  scopedObjectiveIds: string[];
  maxQuestionsSupported: number;
}

export class TeachingEvidenceService {
  readonly repository: TeachingEvidenceRepository;

  constructor(pool: DatabasePool) {
    this.repository = new TeachingEvidenceRepository(pool);
  }

  private resolveActor(ctx: TeachingActorContext): {
    userId: string;
    primaryRole: string;
    roles: string[];
    isAcademicOversight: boolean;
    hasPermission: (perm: string) => boolean;
  } {
    const userId = ctx.authorizedPrincipal?.userId || ctx.tenant.userId || ctx.userId || '';
    if (!userId || !UUID.test(userId)) {
      throw new TeachingEvidenceError(
        'UNAUTHENTICATED',
        'A verified user identity is required for teaching evidence operations.',
        401
      );
    }
    const roles: string[] = ctx.authorizedPrincipal?.roles?.length
      ? [...ctx.authorizedPrincipal.roles]
      : [ctx.role || ctx.tenant.role || 'staff'];
    const primaryRole = roles[0] || 'staff';
    const hasPermission = (perm: string) =>
      ctx.authorizedPrincipal ? ctx.authorizedPrincipal.hasPermission(perm) : false;

    const isAcademicOversight =
      roles.some(r => ACADEMIC_OVERSIGHT_ROLES.has(r)) ||
      hasPermission(PERMISSIONS.teachingAssignmentsManage);

    return { userId, primaryRole, roles, isAcademicOversight, hasPermission };
  }

  private assertActiveAssignment(assignment: TeacherSubjectAssignment): void {
    if (assignment.status !== 'active' || assignment.revokedAt) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        `Teacher subject assignment '${assignment.id}' is '${assignment.status}' and cannot be used for teaching operations.`,
        403,
        { assignmentId: assignment.id, status: assignment.status }
      );
    }
    if (assignment.effectiveTo && new Date(assignment.effectiveTo).getTime() <= Date.now()) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        `Teacher subject assignment '${assignment.id}' has expired.`,
        403,
        { assignmentId: assignment.id, effectiveTo: assignment.effectiveTo }
      );
    }
  }

  private assertTeacherOwnsAssignment(assignment: TeacherSubjectAssignment, actorUserId: string): void {
    this.assertActiveAssignment(assignment);
    if (assignment.teacherUserId !== actorUserId) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Only the assigned subject teacher can confirm teaching delivery, record lesson evidence, or authorize assessment scope for this class and subject.',
        403,
        { assignmentId: assignment.id, assignedTeacherUserId: assignment.teacherUserId, callerUserId: actorUserId }
      );
    }
  }

  async createAssignment(
    ctx: TeachingActorContext,
    input: Parameters<TeachingEvidenceRepository['createAssignment']>[2]
  ): Promise<TeacherSubjectAssignment> {
    const actor = this.resolveActor(ctx);
    return this.repository.createAssignment(ctx.tenant, ctx.applicationInstanceId, {
      ...input,
      assignedBy: input.assignedBy || ctx.tenant.email || actor.userId
    });
  }

  async listAssignments(
    ctx: TeachingActorContext,
    filter: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      status?: string;
    } = {}
  ): Promise<TeacherSubjectAssignment[]> {
    const actor = this.resolveActor(ctx);
    const effectiveFilter = actor.isAcademicOversight
      ? filter
      : { ...filter, teacherUserId: actor.userId };
    return this.repository.listAssignments(ctx.tenant, ctx.applicationInstanceId, effectiveFilter);
  }

  async revokeAssignment(
    ctx: TeachingActorContext,
    assignmentId: string,
    reason: string
  ): Promise<TeacherSubjectAssignment> {
    const actor = this.resolveActor(ctx);
    return this.repository.revokeAssignment(
      ctx.tenant,
      ctx.applicationInstanceId,
      assignmentId,
      ctx.tenant.email || actor.userId,
      reason
    );
  }

  async listCurriculumTopicsForAssignment(ctx: TeachingActorContext, assignmentId: string) {
    const actor = this.resolveActor(ctx);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      assignmentId
    );
    if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'You do not have access to this teacher subject assignment.',
        403
      );
    }
    return this.repository.listCurriculumTopicsForAssignment(ctx.tenant, ctx.applicationInstanceId, assignmentId);
  }

  async createLessonNote(
    ctx: TeachingActorContext,
    input: {
      assignmentId: string;
      topicId?: string | null;
      topicTitle: string;
      objectiveIds?: string[];
      title: string;
      noteContent: Record<string, unknown>;
      generationSource?: 'teacher_authored' | 'ai_gateway' | 'imported';
      aiGatewayRequestId?: string | null;
    }
  ): Promise<LessonNoteRecord> {
    const actor = this.resolveActor(ctx);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      input.assignmentId
    );
    this.assertTeacherOwnsAssignment(assignment, actor.userId);
    return this.repository.createLessonNote(ctx.tenant, ctx.applicationInstanceId, {
      assignment,
      topicId: input.topicId,
      topicTitle: input.topicTitle,
      objectiveIds: input.objectiveIds,
      title: input.title,
      noteContent: input.noteContent,
      generationSource: input.generationSource,
      aiGatewayRequestId: input.aiGatewayRequestId,
      actorUserId: actor.userId
    });
  }

  async listLessonNotes(ctx: TeachingActorContext, assignmentId?: string): Promise<LessonNoteRecord[]> {
    const actor = this.resolveActor(ctx);
    if (assignmentId) {
      const assignment = await this.repository.getAssignmentById(
        ctx.tenant,
        ctx.applicationInstanceId,
        assignmentId
      );
      if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
        throw new TeachingEvidenceError('FORBIDDEN', 'You do not have access to lesson notes for this assignment.', 403);
      }
      return this.repository.listLessonNotes(ctx.tenant, ctx.applicationInstanceId, assignmentId);
    }
    const notes = await this.repository.listLessonNotes(ctx.tenant, ctx.applicationInstanceId);
    if (actor.isAcademicOversight) return notes;
    const ownAssignmentIds = new Set(
      (await this.repository.listAssignments(ctx.tenant, ctx.applicationInstanceId, { teacherUserId: actor.userId })).map(
        a => a.id
      )
    );
    return notes.filter(n => ownAssignmentIds.has(n.assignmentId));
  }

  async createDeliveryRecord(
    ctx: TeachingActorContext,
    input: {
      assignmentId: string;
      topicId?: string | null;
      topicTitle: string;
      lessonNoteId?: string | null;
      weekNumber?: number;
      scheduledDate?: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    const actor = this.resolveActor(ctx);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      input.assignmentId
    );
    this.assertActiveAssignment(assignment);
    if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Cannot create teaching delivery records for an assignment owned by another teacher.',
        403
      );
    }
    return this.repository.createDeliveryRecord(ctx.tenant, ctx.applicationInstanceId, {
      assignment,
      topicId: input.topicId,
      topicTitle: input.topicTitle,
      lessonNoteId: input.lessonNoteId,
      weekNumber: input.weekNumber,
      scheduledDate: input.scheduledDate,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async listDeliveries(
    ctx: TeachingActorContext,
    filter: {
      assignmentId?: string;
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      status?: string;
      resolutionStatus?: string;
    } = {}
  ): Promise<TeachingDeliveryRecord[]> {
    const actor = this.resolveActor(ctx);
    if (filter.assignmentId && !actor.isAcademicOversight) {
      const assignment = await this.repository.getAssignmentById(
        ctx.tenant,
        ctx.applicationInstanceId,
        filter.assignmentId
      );
      if (assignment.teacherUserId !== actor.userId) {
        throw new TeachingEvidenceError('FORBIDDEN', 'You cannot inspect teaching deliveries for another teacher.', 403);
      }
    }
    const effectiveFilter = actor.isAcademicOversight
      ? filter
      : { ...filter, teacherUserId: actor.userId };
    return this.repository.listDeliveries(ctx.tenant, ctx.applicationInstanceId, effectiveFilter);
  }

  async transitionDeliveryStage(
    ctx: TeachingActorContext,
    deliveryId: string,
    targetStatus: 'received' | 'opened' | 'acknowledged'
  ): Promise<TeachingDeliveryRecord> {
    const actor = this.resolveActor(ctx);
    const existing = await this.repository.getDeliveryById(ctx.tenant, ctx.applicationInstanceId, deliveryId);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      existing.assignmentId
    );
    this.assertTeacherOwnsAssignment(assignment, actor.userId);
    return this.repository.transitionDeliveryStage(ctx.tenant, ctx.applicationInstanceId, {
      deliveryId,
      targetStatus,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async confirmTeachingCompletion(
    ctx: TeachingActorContext,
    deliveryId: string,
    input: {
      targetStatus: 'taught' | 'completed';
      confirmTaught: boolean;
      coverageMode: CoverageMode;
      coveredObjectiveIds?: string[];
      uncoveredObjectiveIds?: string[];
      understandingLevel?: UnderstandingLevel;
      studentEngagement?: StudentEngagementLevel;
      remedialNeeded?: boolean;
      remedialTopic?: string;
      teacherComments?: string;
      challengesNoted?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ record: TeachingDeliveryRecord; idempotentReplay: boolean }> {
    const actor = this.resolveActor(ctx);
    const existing = await this.repository.getDeliveryById(ctx.tenant, ctx.applicationInstanceId, deliveryId);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      existing.assignmentId
    );
    // Strict: ONLY the assigned teacher can confirm teaching completion (admins/principals cannot forge completion!)
    this.assertTeacherOwnsAssignment(assignment, actor.userId);
    return this.repository.confirmTeachingCompletion(ctx.tenant, ctx.applicationInstanceId, {
      deliveryId,
      assignment,
      ...input,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async correctDeliveryRecord(
    ctx: TeachingActorContext,
    deliveryId: string,
    input: {
      correctionReason: string;
      coverageMode?: CoverageMode;
      coveredObjectiveIds?: string[];
      uncoveredObjectiveIds?: string[];
      understandingLevel?: UnderstandingLevel;
      studentEngagement?: StudentEngagementLevel;
      remedialNeeded?: boolean;
      remedialTopic?: string | null;
      teacherComments?: string;
      challengesNoted?: string | null;
    }
  ): Promise<TeachingDeliveryRecord> {
    const actor = this.resolveActor(ctx);
    const existing = await this.repository.getDeliveryById(ctx.tenant, ctx.applicationInstanceId, deliveryId);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      existing.assignmentId
    );
    this.assertTeacherOwnsAssignment(assignment, actor.userId);
    return this.repository.correctDeliveryRecord(ctx.tenant, ctx.applicationInstanceId, {
      deliveryId,
      ...input,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async mapUnresolvedTopic(
    ctx: TeachingActorContext,
    deliveryId: string,
    input: {
      topicId: string;
      coveredObjectiveIds?: string[];
      reason: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    const actor = this.resolveActor(ctx);
    const existing = await this.repository.getDeliveryById(ctx.tenant, ctx.applicationInstanceId, deliveryId);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      existing.assignmentId
    );
    this.assertActiveAssignment(assignment);
    if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Only the assigned teacher or an academic administrator can map an unresolved topic.',
        403
      );
    }
    return this.repository.mapUnresolvedTopic(ctx.tenant, ctx.applicationInstanceId, {
      deliveryId,
      topicId: input.topicId,
      coveredObjectiveIds: input.coveredObjectiveIds,
      reason: input.reason,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async adminVerifyDelivery(
    ctx: TeachingActorContext,
    deliveryId: string,
    input: {
      adminVerificationStatus: AdminVerificationStatus;
      reason: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    const actor = this.resolveActor(ctx);
    if (!actor.isAcademicOversight) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Academic oversight authorization is required to verify teaching delivery records.',
        403
      );
    }
    return this.repository.adminVerifyDelivery(ctx.tenant, ctx.applicationInstanceId, {
      deliveryId,
      adminVerificationStatus: input.adminVerificationStatus,
      reason: input.reason,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole
    });
  }

  async getDeliveryAuditHistory(ctx: TeachingActorContext, deliveryId: string): Promise<TeachingDeliveryAuditEntry[]> {
    const actor = this.resolveActor(ctx);
    const existing = await this.repository.getDeliveryById(ctx.tenant, ctx.applicationInstanceId, deliveryId);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      existing.assignmentId
    );
    if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
      throw new TeachingEvidenceError('FORBIDDEN', 'You do not have access to this delivery audit history.', 403);
    }
    return this.repository.listAuditHistory(ctx.tenant, ctx.applicationInstanceId, deliveryId);
  }

  async getSubjectProgress(
    ctx: TeachingActorContext,
    filter: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      assignmentId?: string;
    } = {}
  ): Promise<SubjectProgressSummary[]> {
    const actor = this.resolveActor(ctx);
    const effectiveFilter = actor.isAcademicOversight
      ? filter
      : { ...filter, teacherUserId: actor.userId };
    return this.repository.getSubjectProgressSummaries(ctx.tenant, ctx.applicationInstanceId, effectiveFilter);
  }

  async getVerifiedTaughtEvidence(
    ctx: TeachingActorContext,
    assignmentId: string,
    purpose?: string
  ): Promise<VerifiedTaughtEvidenceBundle> {
    const actor = this.resolveActor(ctx);
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      assignmentId
    );
    const isOwner = assignment.teacherUserId === actor.userId;
    if (!isOwner && !actor.isAcademicOversight) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'You are not authorized to retrieve verified teaching evidence for this assignment.',
        403
      );
    }
    return this.repository.getVerifiedTaughtEvidence(ctx.tenant, ctx.applicationInstanceId, {
      assignment,
      actorUserId: actor.userId,
      actorRole: actor.primaryRole,
      purpose
    });
  }

  evaluateSufficiency(params: {
    evidenceBundle: VerifiedTaughtEvidenceBundle;
    selectedTopicIds: string[];
    selectedObjectiveIds: string[];
    questionCount: number;
  }): {
    scopedTopics: VerifiedTaughtTopicEvidence[];
    scopedObjectiveIds: string[];
    sourceDeliveryIds: string[];
    maxQuestionsSupported: number;
  } {
    if (params.evidenceBundle.verifiedTopics.length === 0) {
      throw new TeachingEvidenceError(
        'INSUFFICIENT_EVIDENCE',
        'No verified taught topics exist for this teacher assignment. Confirm teaching completion of at least one resolved NERDC topic before authorizing an assessment.',
        422,
        {
          verifiedTopicsCount: 0,
          unresolvedExcludedCount: params.evidenceBundle.unresolvedExcludedCount,
          unconfirmedExcludedCount: params.evidenceBundle.unconfirmedExcludedCount
        }
      );
    }

    const topicById = new Map<string, VerifiedTaughtTopicEvidence[]>();
    for (const item of params.evidenceBundle.verifiedTopics) {
      const list = topicById.get(item.topicId) || [];
      list.push(item);
      topicById.set(item.topicId, list);
    }

    const scopedTopics: VerifiedTaughtTopicEvidence[] = [];
    for (const topicId of [...new Set(params.selectedTopicIds)]) {
      const matches = topicById.get(topicId);
      if (!matches || matches.length === 0) {
        throw new TeachingEvidenceError(
          'INSUFFICIENT_EVIDENCE',
          `Selected topic '${topicId}' does not have verified taught evidence for this teacher, class, term, and curriculum version.`,
          422,
          { rejectedTopicId: topicId }
        );
      }
      scopedTopics.push(...matches);
    }

    if (scopedTopics.length === 0) {
      throw new TeachingEvidenceError(
        'INSUFFICIENT_EVIDENCE',
        'At least one verified taught topic must be selected in the assessment scope.',
        422
      );
    }

    const availableObjectives = new Set(
      scopedTopics.flatMap(t => t.coveredObjectives.map(o => o.id))
    );
    const requestedObjectives =
      params.selectedObjectiveIds.length > 0
        ? [...new Set(params.selectedObjectiveIds)]
        : [...availableObjectives];

    for (const objId of requestedObjectives) {
      if (!availableObjectives.has(objId)) {
        throw new TeachingEvidenceError(
          'INSUFFICIENT_EVIDENCE',
          `Learning objective '${objId}' has not been confirmed as covered in the verified taught evidence.`,
          422,
          { rejectedObjectiveId: objId }
        );
      }
    }

    if (requestedObjectives.length === 0) {
      throw new TeachingEvidenceError(
        'INSUFFICIENT_EVIDENCE',
        'Selected verified taught topics do not contain any covered learning objectives.',
        422
      );
    }

    const distinctTopicsCount = new Set(scopedTopics.map(t => t.topicId)).size;
    const maxQuestionsSupported = Math.max(requestedObjectives.length * 4, distinctTopicsCount * 5);
    if (params.questionCount > maxQuestionsSupported) {
      throw new TeachingEvidenceError(
        'INSUFFICIENT_EVIDENCE',
        `Requested ${params.questionCount} questions exceeds verified taught evidence capacity (maximum ${maxQuestionsSupported} grounded items from ${distinctTopicsCount} taught topic(s) and ${requestedObjectives.length} covered objective(s)). Complete teaching of additional topics/objectives or reduce questionCount.`,
        422,
        {
          requestedQuestions: params.questionCount,
          maxQuestionsSupported,
          verifiedTopicsCount: distinctTopicsCount,
          verifiedObjectivesCount: requestedObjectives.length
        }
      );
    }

    const sourceDeliveryIds = [...new Set(scopedTopics.map(t => t.deliveryRecordId))];
    return {
      scopedTopics,
      scopedObjectiveIds: requestedObjectives,
      sourceDeliveryIds,
      maxQuestionsSupported
    };
  }

  async createAssessmentScopeAuthorization(
    ctx: TeachingActorContext,
    input: {
      assignmentId: string;
      assessmentType: ScopeAssessmentType;
      title: string;
      selectedTopicIds: string[];
      selectedObjectiveIds?: string[];
      questionCount: number;
      questionTypesConfig?: Record<string, number>;
      objectiveTheoryBalance?: {
        objectivePercent: number;
        theoryPercent: number;
        practicalPercent: number;
      };
      totalMarks: number;
      difficultyMix?: Record<string, number>;
      durationMinutes?: number;
      instructions?: string;
    }
  ): Promise<AssessmentScopeAuthorization> {
    const actor = this.resolveActor(ctx);
    // Strict Teacher-Only Enforcement: caller must hold teacher role/permission AND own the assignment
    const hasTeacherRole = actor.roles.some(r => TEACHER_ELIGIBLE_ROLES.has(r));
    if (ctx.authorizedPrincipal && !ctx.authorizedPrincipal.hasPermission(PERMISSIONS.assessmentsScopeAuthorize)) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Only an authorized subject teacher can define and authorize assessment scope.',
        403
      );
    }
    if (!hasTeacherRole && !ctx.authorizedPrincipal?.hasPermission(PERMISSIONS.assessmentsScopeAuthorize)) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'Assessment scope authorization is restricted strictly to the assigned subject teacher.',
        403
      );
    }

    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      input.assignmentId
    );
    this.assertTeacherOwnsAssignment(assignment, actor.userId);

    if (
      !Array.isArray(input.selectedTopicIds) ||
      input.selectedTopicIds.length === 0 ||
      !Number.isFinite(input.questionCount) ||
      input.questionCount < 1 ||
      input.questionCount > 100
    ) {
      throw new TeachingEvidenceError(
        'VALIDATION_ERROR',
        'selectedTopicIds (non-empty) and questionCount (1..100) are required to authorize assessment scope.',
        400
      );
    }

    const evidenceBundle = await this.repository.getVerifiedTaughtEvidence(
      ctx.tenant,
      ctx.applicationInstanceId,
      {
        assignment,
        actorUserId: actor.userId,
        actorRole: actor.primaryRole,
        purpose: 'Validate teacher assessment scope authorization against verified taught evidence.'
      }
    );

    const evaluated = this.evaluateSufficiency({
      evidenceBundle,
      selectedTopicIds: input.selectedTopicIds,
      selectedObjectiveIds: input.selectedObjectiveIds || [],
      questionCount: input.questionCount
    });

    const objectiveTheoryBalance = input.objectiveTheoryBalance || {
      objectivePercent: 60,
      theoryPercent: 40,
      practicalPercent: 0
    };
    const questionTypesConfig = input.questionTypesConfig || {
      objective: Math.max(
        0,
        Math.round((input.questionCount * (objectiveTheoryBalance.objectivePercent || 0)) / 100)
      ),
      theory: Math.max(
        0,
        input.questionCount -
          Math.round((input.questionCount * (objectiveTheoryBalance.objectivePercent || 0)) / 100)
      )
    };
    const difficultyMix = input.difficultyMix || { Easy: 30, Medium: 50, Hard: 20 };

    return this.repository.createScopeAuthorization(ctx.tenant, ctx.applicationInstanceId, {
      assignment,
      assessmentType: input.assessmentType,
      title: input.title,
      selectedTopicIds: [...new Set(evaluated.scopedTopics.map(t => t.topicId))],
      selectedObjectiveIds: evaluated.scopedObjectiveIds,
      sourceDeliveryIds: evaluated.sourceDeliveryIds,
      questionCount: input.questionCount,
      questionTypesConfig,
      objectiveTheoryBalance,
      totalMarks: Math.max(1, Number(input.totalMarks || input.questionCount * 2)),
      difficultyMix,
      durationMinutes: Math.max(5, Math.min(300, Number(input.durationMinutes || 30))),
      instructions: input.instructions || 'Answer all questions strictly within the authorized taught topics.'
    });
  }

  async listScopeAuthorizations(
    ctx: TeachingActorContext,
    filter: { assignmentId?: string; status?: string } = {}
  ): Promise<AssessmentScopeAuthorization[]> {
    const actor = this.resolveActor(ctx);
    return this.repository.listScopeAuthorizations(ctx.tenant, ctx.applicationInstanceId, {
      ...filter,
      ...(actor.isAcademicOversight ? {} : { teacherUserId: actor.userId })
    });
  }

  async revokeScopeAuthorization(
    ctx: TeachingActorContext,
    scopeAuthorizationId: string,
    reason: string
  ): Promise<AssessmentScopeAuthorization> {
    const actor = this.resolveActor(ctx);
    const scope = await this.repository.getScopeAuthorizationById(
      ctx.tenant,
      ctx.applicationInstanceId,
      scopeAuthorizationId
    );
    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      scope.assignmentId
    );
    this.assertTeacherOwnsAssignment(assignment, actor.userId);
    return this.repository.revokeScopeAuthorization(
      ctx.tenant,
      ctx.applicationInstanceId,
      scopeAuthorizationId,
      actor.userId,
      reason
    );
  }

  /**
   * Validates that a persisted teacher-authorized assessment scope exists, is active,
   * matches the current teacher/assignment (or authorized school exam execution if specified),
   * and matches sufficient verified taught evidence right before AI generation.
   */
  async resolveAndValidateAuthorizedScopeForGeneration(
    ctx: TeachingActorContext,
    scopeAuthorizationId: string,
    options: { requireCallerIsAuthorizingTeacher?: boolean } = { requireCallerIsAuthorizingTeacher: true }
  ): Promise<EvaluatedScopeContext> {
    const actor = this.resolveActor(ctx);
    if (!scopeAuthorizationId || !UUID.test(scopeAuthorizationId)) {
      throw new TeachingEvidenceError(
        'SCOPE_AUTHORIZATION_REQUIRED',
        'A valid persisted teacher-owned scopeAuthorizationId UUID is required to generate a taught-only assessment.',
        400
      );
    }

    const scopeAuthorization = await this.repository.getScopeAuthorizationById(
      ctx.tenant,
      ctx.applicationInstanceId,
      scopeAuthorizationId
    );
    if (scopeAuthorization.status !== 'authorized') {
      throw new TeachingEvidenceError(
        'SCOPE_MODIFICATION_CONFLICT',
        `Assessment scope authorization '${scopeAuthorization.id}' has status '${scopeAuthorization.status}' and can no longer be used for generation.`,
        409,
        { scopeAuthorizationId: scopeAuthorization.id, status: scopeAuthorization.status }
      );
    }

    const assignment = await this.repository.getAssignmentById(
      ctx.tenant,
      ctx.applicationInstanceId,
      scopeAuthorization.assignmentId
    );
    this.assertActiveAssignment(assignment);

    if (options.requireCallerIsAuthorizingTeacher !== false) {
      if (assignment.teacherUserId !== actor.userId || scopeAuthorization.teacherUserId !== actor.userId) {
        throw new TeachingEvidenceError(
          'FORBIDDEN',
          'Only the teacher who owns the assignment and authorized the assessment scope may generate assessments from it.',
          403
        );
      }
    } else if (!actor.isAcademicOversight && assignment.teacherUserId !== actor.userId) {
      throw new TeachingEvidenceError(
        'FORBIDDEN',
        'You are not authorized to execute assessment generation for this class and subject.',
        403
      );
    }

    const evidenceBundle = await this.repository.getVerifiedTaughtEvidence(
      ctx.tenant,
      ctx.applicationInstanceId,
      {
        assignment,
        actorUserId: actor.userId,
        actorRole: actor.primaryRole,
        purpose: `Validate assessment generation under scope authorization ${scopeAuthorization.id} v${scopeAuthorization.scopeVersion}`
      }
    );

    const evaluated = this.evaluateSufficiency({
      evidenceBundle,
      selectedTopicIds: scopeAuthorization.selectedTopicIds,
      selectedObjectiveIds: scopeAuthorization.selectedObjectiveIds,
      questionCount: scopeAuthorization.questionCount
    });

    return {
      assignment,
      scopeAuthorization,
      evidenceBundle,
      scopedTopics: evaluated.scopedTopics,
      scopedObjectiveIds: evaluated.scopedObjectiveIds,
      maxQuestionsSupported: evaluated.maxQuestionsSupported
    };
  }

  async recordGenerationProvenance(
    ctx: TeachingActorContext,
    params: {
      scopeAuthorization: AssessmentScopeAuthorization;
      blueprintId?: string | null;
      examConfigurationId?: string | null;
      generatedQuestionIds: string[];
      aiGatewayRequestId?: string | null;
      providerId?: string | null;
      modelId?: string | null;
      generationStatus: 'generated' | 'insufficient_evidence' | 'rejected';
      rejectionReason?: string | null;
    }
  ): Promise<AssessmentGenerationProvenanceRecord> {
    const actor = this.resolveActor(ctx);
    return this.repository.recordGenerationProvenance(ctx.tenant, ctx.applicationInstanceId, {
      ...params,
      createdByUserId: actor.userId
    });
  }

  async listGenerationProvenance(
    ctx: TeachingActorContext,
    scopeAuthorizationId?: string
  ): Promise<AssessmentGenerationProvenanceRecord[]> {
    this.resolveActor(ctx);
    return this.repository.listGenerationProvenance(ctx.tenant, ctx.applicationInstanceId, scopeAuthorizationId);
  }
}
