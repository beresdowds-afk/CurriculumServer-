import crypto from 'node:crypto';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withTenantTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { NerdcCurriculumResolver } from './nerdcCurriculumResolver';
import {
  TeachingEvidenceError,
  type AdminVerificationStatus,
  type AssessmentGenerationProvenanceRecord,
  type AssessmentScopeAuthorization,
  type CoverageMode,
  type DeliveryWorkflowStatus,
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

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value ? String(value) : '';
}

function toNullableIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseJsonArray<T = string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

function mapAssignment(row: any): TeacherSubjectAssignment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    schoolId: row.school_id,
    academicSession: row.academic_session,
    term: row.term,
    classId: row.class_id,
    classGradeName: row.class_grade_name,
    section: row.section,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    curriculumVersionId: row.curriculum_version_id,
    staffId: row.staff_id,
    teacherUserId: row.teacher_user_id,
    status: row.status,
    assignedBy: row.assigned_by,
    assignedAt: toIso(row.assigned_at),
    effectiveFrom: toIso(row.effective_from),
    effectiveTo: toNullableIso(row.effective_to),
    revokedAt: toNullableIso(row.revoked_at),
    revokedBy: row.revoked_by || null,
    revocationReason: row.revocation_reason || null,
    metadata: parseJsonObject(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapLessonNote(row: any): LessonNoteRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    assignmentId: row.assignment_id,
    schoolId: row.school_id,
    academicSession: row.academic_session,
    term: row.term,
    classId: row.class_id,
    classGradeName: row.class_grade_name,
    section: row.section,
    subjectId: row.subject_id,
    curriculumVersionId: row.curriculum_version_id,
    topicId: row.topic_id || null,
    topicTitle: row.topic_title,
    objectiveIds: parseJsonArray<string>(row.objective_ids),
    title: row.title,
    noteContent: parseJsonObject(row.note_content),
    generationSource: row.generation_source,
    aiGatewayRequestId: row.ai_gateway_request_id || null,
    countsAsTaught: false,
    createdByUserId: row.created_by_user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapDelivery(row: any): TeachingDeliveryRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    assignmentId: row.assignment_id,
    schoolId: row.school_id,
    academicSession: row.academic_session,
    term: row.term,
    classId: row.class_id,
    classGradeName: row.class_grade_name,
    section: row.section,
    subjectId: row.subject_id,
    curriculumVersionId: row.curriculum_version_id,
    topicId: row.topic_id || null,
    topicTitleInput: row.topic_title_input,
    resolvedTopicTitle: row.resolved_topic_title || null,
    resolutionStatus: row.resolution_status,
    resolutionNotes: row.resolution_notes || null,
    lessonNoteId: row.lesson_note_id || null,
    weekNumber: Number(row.week_number ?? 1),
    scheduledDate: row.scheduled_date instanceof Date ? row.scheduled_date.toISOString().slice(0, 10) : String(row.scheduled_date ?? ''),
    status: row.status,
    receivedAt: toNullableIso(row.received_at),
    openedAt: toNullableIso(row.opened_at),
    acknowledgedAt: toNullableIso(row.acknowledged_at),
    taughtAt: toNullableIso(row.taught_at),
    completedAt: toNullableIso(row.completed_at),
    completionConfirmedByTeacher: Boolean(row.completion_confirmed_by_teacher),
    completionTeacherUserId: row.completion_teacher_user_id || null,
    completionIdempotencyKey: row.completion_idempotency_key || null,
    coverageMode: row.coverage_mode,
    coveredObjectiveIds: parseJsonArray<string>(row.covered_objective_ids),
    uncoveredObjectiveIds: parseJsonArray<string>(row.uncovered_objective_ids),
    understandingLevel: row.understanding_level || null,
    studentEngagement: row.student_engagement || null,
    remedialNeeded: Boolean(row.remedial_needed),
    remedialTopic: row.remedial_topic || null,
    teacherComments: row.teacher_comments || '',
    challengesNoted: row.challenges_noted || null,
    verificationBasis: row.verification_basis || 'teacher_self_reported',
    adminVerificationStatus: row.admin_verification_status || 'unverified',
    adminVerifiedBy: row.admin_verified_by || null,
    adminVerifiedAt: toNullableIso(row.admin_verified_at),
    recordVersion: Number(row.record_version ?? 1),
    usedInAssessmentCount: Number(row.used_in_assessment_count ?? 0),
    correctionReason: row.correction_reason || null,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapAudit(row: any): TeachingDeliveryAuditEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    deliveryRecordId: row.delivery_record_id || null,
    assignmentId: row.assignment_id || null,
    eventType: row.event_type,
    recordVersion: Number(row.record_version ?? 1),
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    reason: row.reason || null,
    beforeSnapshot: parseJsonObject(row.before_snapshot),
    afterSnapshot: parseJsonObject(row.after_snapshot),
    occurredAt: toIso(row.occurred_at)
  };
}

function mapScopeAuthorization(row: any): AssessmentScopeAuthorization {
  const balance = parseJsonObject<{ objectivePercent?: number; theoryPercent?: number; practicalPercent?: number }>(
    row.objective_theory_balance
  );
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    assignmentId: row.assignment_id,
    schoolId: row.school_id,
    academicSession: row.academic_session,
    term: row.term,
    classId: row.class_id,
    classGradeName: row.class_grade_name,
    section: row.section,
    subjectId: row.subject_id,
    curriculumVersionId: row.curriculum_version_id,
    teacherUserId: row.teacher_user_id,
    assessmentType: row.assessment_type,
    title: row.title,
    scopeVersion: Number(row.scope_version ?? 1),
    supersedesAuthorizationId: row.supersedes_authorization_id || null,
    status: row.status,
    selectedTopicIds: parseJsonArray<string>(row.selected_topic_ids),
    selectedObjectiveIds: parseJsonArray<string>(row.selected_objective_ids),
    sourceDeliveryIds: parseJsonArray<string>(row.source_delivery_ids),
    questionCount: Number(row.question_count ?? 0),
    questionTypesConfig: parseJsonObject<Record<string, number>>(row.question_types_config),
    objectiveTheoryBalance: {
      objectivePercent: Number(balance.objectivePercent ?? 100),
      theoryPercent: Number(balance.theoryPercent ?? 0),
      practicalPercent: Number(balance.practicalPercent ?? 0)
    },
    totalMarks: Number(row.total_marks ?? 0),
    difficultyMix: parseJsonObject<Record<string, number>>(row.difficulty_mix),
    durationMinutes: Number(row.duration_minutes ?? 30),
    instructions: row.instructions || '',
    scopeHash: row.scope_hash,
    authorizedByTeacherAt: toIso(row.authorized_by_teacher_at),
    revokedAt: toNullableIso(row.revoked_at),
    revokedByUserId: row.revoked_by_user_id || null,
    revocationReason: row.revocation_reason || null,
    createdAt: toIso(row.created_at)
  };
}

function mapProvenance(row: any): AssessmentGenerationProvenanceRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationInstanceId: row.application_instance_id,
    scopeAuthorizationId: row.scope_authorization_id,
    blueprintId: row.blueprint_id || null,
    examConfigurationId: row.exam_configuration_id || null,
    assignmentId: row.assignment_id,
    teacherUserId: row.teacher_user_id,
    academicSession: row.academic_session,
    term: row.term,
    classId: row.class_id,
    section: row.section,
    subjectId: row.subject_id,
    curriculumVersionId: row.curriculum_version_id,
    verifiedTopicIds: parseJsonArray<string>(row.verified_topic_ids),
    verifiedObjectiveIds: parseJsonArray<string>(row.verified_objective_ids),
    sourceDeliveryIds: parseJsonArray<string>(row.source_delivery_ids),
    generatedQuestionIds: parseJsonArray<string>(row.generated_question_ids),
    aiGatewayRequestId: row.ai_gateway_request_id || null,
    providerId: row.provider_id || null,
    modelId: row.model_id || null,
    generationStatus: row.generation_status,
    rejectionReason: row.rejection_reason || null,
    createdByUserId: row.created_by_user_id,
    createdAt: toIso(row.created_at)
  };
}

const VALID_STAGE_TRANSITIONS: Record<DeliveryWorkflowStatus, DeliveryWorkflowStatus[]> = {
  assigned: ['received'],
  received: ['opened'],
  opened: ['acknowledged'],
  acknowledged: ['taught', 'completed'],
  taught: ['completed'],
  completed: []
};

export class TeachingEvidenceRepository {
  private readonly resolver = new NerdcCurriculumResolver();

  constructor(private readonly pool: DatabasePool) {}

  private assertScope(tenant: VerifiedTenantPrincipal, applicationInstanceId: string): void {
    if (!UUID.test(tenant.tenantId)) {
      throw new TeachingEvidenceError('FORBIDDEN', 'A valid school tenant context is required.', 403);
    }
    if (!UUID.test(applicationInstanceId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'A valid applicationInstanceId UUID is required.', 400);
    }
  }

  private async insertAudit(
    client: DatabaseClient,
    params: {
      tenantId: string;
      applicationInstanceId: string;
      deliveryRecordId?: string | null;
      assignmentId?: string | null;
      eventType: TeachingDeliveryAuditEntry['eventType'];
      recordVersion: number;
      actorUserId: string;
      actorRole: string;
      reason?: string | null;
      beforeSnapshot?: Record<string, unknown>;
      afterSnapshot?: Record<string, unknown>;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.teaching_delivery_audit_history (
         tenant_id, application_instance_id, delivery_record_id, assignment_id,
         event_type, record_version, actor_user_id, actor_role, reason,
         before_snapshot, after_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
      [
        params.tenantId,
        params.applicationInstanceId,
        params.deliveryRecordId || null,
        params.assignmentId || null,
        params.eventType,
        params.recordVersion,
        params.actorUserId,
        params.actorRole,
        params.reason || null,
        JSON.stringify(params.beforeSnapshot || {}),
        JSON.stringify(params.afterSnapshot || {})
      ]
    );
  }

  async createAssignment(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      schoolId?: string;
      academicSession: string;
      term: string;
      classId: string;
      section?: string;
      subjectId: string;
      curriculumVersionId: string;
      staffId?: string;
      teacherUserId: string;
      assignedBy: string;
      effectiveTo?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TeacherSubjectAssignment> {
    this.assertScope(tenant, applicationInstanceId);
    if (!UUID.test(input.classId) || !UUID.test(input.teacherUserId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'Valid classId and teacherUserId UUIDs are required.', 400);
    }

    return withTenantTransaction(this.pool, tenant, async client => {
      const version = await this.resolver.resolveCurriculumVersion(client, input.curriculumVersionId);
      const subject = await this.resolver.resolveSubject(client, input.subjectId);

      // Verify class belongs to tenant school
      const classRes = await client.query<{ id: string; school_id: string; name: string; section: string }>(
        `SELECT id, school_id, name, section
         FROM production.classes
         WHERE tenant_id = $1 AND id = $2 AND status = 'active'
         LIMIT 1`,
        [tenant.tenantId, input.classId]
      );
      if (classRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Class was not found in this school tenant.', 404);
      }
      const cls = classRes.rows[0];
      const schoolId = input.schoolId || cls.school_id;
      if (cls.school_id !== schoolId) {
        throw new TeachingEvidenceError('FORBIDDEN', 'Class does not belong to the specified school.', 403);
      }

      // Verify active membership + staff linkage for teacherUserId
      const staffRes = input.staffId
        ? await client.query<{ id: string; user_id: string | null }>(
            `SELECT s.id, s.user_id
             FROM production.staff s
             JOIN production.memberships m ON m.tenant_id = s.tenant_id AND m.user_id = s.user_id
             WHERE s.tenant_id = $1 AND s.school_id = $2 AND s.id = $3 AND s.status = 'active' AND m.status = 'active'
             LIMIT 1`,
            [tenant.tenantId, schoolId, input.staffId]
          )
        : await client.query<{ id: string; user_id: string | null }>(
            `SELECT s.id, s.user_id
             FROM production.staff s
             JOIN production.memberships m ON m.tenant_id = s.tenant_id AND m.user_id = s.user_id
             WHERE s.tenant_id = $1 AND s.school_id = $2 AND s.user_id = $3 AND s.status = 'active' AND m.status = 'active'
             LIMIT 1`,
            [tenant.tenantId, schoolId, input.teacherUserId]
          );

      if (staffRes.rowCount === 0 || staffRes.rows[0].user_id !== input.teacherUserId) {
        throw new TeachingEvidenceError(
          'FORBIDDEN',
          'Target teacher does not hold an active staff membership in this school.',
          403
        );
      }

      const section = (input.section || cls.section || 'General').trim();
      const res = await client.query(
        `INSERT INTO production.teacher_subject_assignments (
           tenant_id, application_instance_id, school_id, academic_session, term,
           class_id, class_grade_name, section, subject_id, subject_name,
           curriculum_version_id, staff_id, teacher_user_id, assigned_by,
           effective_to, metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          schoolId,
          input.academicSession.trim(),
          input.term.trim(),
          cls.id,
          cls.name,
          section,
          subject.id,
          subject.name,
          version.id,
          staffRes.rows[0].id,
          input.teacherUserId,
          input.assignedBy,
          input.effectiveTo || null,
          JSON.stringify(input.metadata || {})
        ]
      );
      return mapAssignment(res.rows[0]);
    });
  }

  async listAssignments(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    filter: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      status?: string;
    } = {}
  ): Promise<TeacherSubjectAssignment[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];

      if (filter.teacherUserId) {
        values.push(filter.teacherUserId);
        conditions.push(`teacher_user_id = $${values.length}`);
      }
      if (filter.academicSession) {
        values.push(filter.academicSession);
        conditions.push(`academic_session = $${values.length}`);
      }
      if (filter.term) {
        values.push(filter.term);
        conditions.push(`term = $${values.length}`);
      }
      if (filter.classId) {
        values.push(filter.classId);
        conditions.push(`class_id = $${values.length}`);
      }
      if (filter.subjectId) {
        values.push(filter.subjectId);
        conditions.push(`subject_id = $${values.length}`);
      }
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`status = $${values.length}`);
      }

      const res = await client.query(
        `SELECT * FROM production.teacher_subject_assignments
         WHERE ${conditions.join(' AND ')}
         ORDER BY assigned_at DESC`,
        values
      );
      return res.rows.map(mapAssignment);
    });
  }

  async getAssignmentById(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    assignmentId: string
  ): Promise<TeacherSubjectAssignment> {
    this.assertScope(tenant, applicationInstanceId);
    if (!UUID.test(assignmentId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'Invalid assignmentId UUID.', 400);
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.teacher_subject_assignments
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         LIMIT 1`,
        [tenant.tenantId, applicationInstanceId, assignmentId]
      );
      if (res.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teacher subject assignment was not found.', 404);
      }
      return mapAssignment(res.rows[0]);
    });
  }

  async revokeAssignment(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    assignmentId: string,
    revokedBy: string,
    reason: string
  ): Promise<TeacherSubjectAssignment> {
    this.assertScope(tenant, applicationInstanceId);
    if (!UUID.test(assignmentId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'Invalid assignmentId UUID.', 400);
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `UPDATE production.teacher_subject_assignments
         SET status = 'revoked',
             revoked_at = now(),
             revoked_by = $4,
             revocation_reason = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3 AND status <> 'revoked'
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, assignmentId, revokedBy, reason.trim() || 'Assignment revoked']
      );
      if (res.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Active assignment not found or already revoked.', 404);
      }
      return mapAssignment(res.rows[0]);
    });
  }

  async listCurriculumTopicsForAssignment(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    assignmentId: string
  ) {
    const assignment = await this.getAssignmentById(tenant, applicationInstanceId, assignmentId);
    return withTenantTransaction(this.pool, tenant, client =>
      this.resolver.listTopicsForVersionSubject(client, {
        curriculumVersionId: assignment.curriculumVersionId,
        subjectId: assignment.subjectId,
        classGradeName: assignment.classGradeName
      })
    );
  }

  async createLessonNote(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      assignment: TeacherSubjectAssignment;
      topicId?: string | null;
      topicTitle: string;
      objectiveIds?: string[];
      title: string;
      noteContent: Record<string, unknown>;
      generationSource?: 'teacher_authored' | 'ai_gateway' | 'imported';
      aiGatewayRequestId?: string | null;
      actorUserId: string;
    }
  ): Promise<LessonNoteRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      let resolvedTopicId: string | null = null;
      let finalTopicTitle = input.topicTitle.trim();
      let finalObjectiveIds = input.objectiveIds || [];

      if (input.topicId || input.topicTitle.trim()) {
        const resolution = await this.resolver.resolveTopicForDelivery(client, {
          curriculumVersionId: input.assignment.curriculumVersionId,
          subjectId: input.assignment.subjectId,
          classGradeName: input.assignment.classGradeName,
          topicId: input.topicId,
          topicTitleInput: input.topicTitle
        });
        if (resolution.resolvedTopic) {
          resolvedTopicId = resolution.resolvedTopic.topicId;
          finalTopicTitle = resolution.resolvedTopic.topicTitle;
          if (finalObjectiveIds.length > 0) {
            const validated = this.resolver.validateObjectiveSelectionForTopic(
              resolution.resolvedTopic,
              finalObjectiveIds
            );
            finalObjectiveIds = validated.coveredObjectiveIds;
          }
        }
      }

      const res = await client.query(
        `INSERT INTO production.lesson_note_records (
           tenant_id, application_instance_id, assignment_id, school_id,
           academic_session, term, class_id, class_grade_name, section,
           subject_id, curriculum_version_id, topic_id, topic_title,
           objective_ids, title, note_content, generation_source,
           ai_gateway_request_id, counts_as_taught, created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb, $17, $18, false, $19)
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          input.assignment.id,
          input.assignment.schoolId,
          input.assignment.academicSession,
          input.assignment.term,
          input.assignment.classId,
          input.assignment.classGradeName,
          input.assignment.section,
          input.assignment.subjectId,
          input.assignment.curriculumVersionId,
          resolvedTopicId,
          finalTopicTitle,
          JSON.stringify(finalObjectiveIds),
          input.title.trim(),
          JSON.stringify(input.noteContent || {}),
          input.generationSource || 'teacher_authored',
          input.aiGatewayRequestId && UUID.test(input.aiGatewayRequestId) ? input.aiGatewayRequestId : null,
          input.actorUserId
        ]
      );
      return mapLessonNote(res.rows[0]);
    });
  }

  async listLessonNotes(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    assignmentId?: string
  ): Promise<LessonNoteRecord[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (assignmentId) {
        values.push(assignmentId);
        conditions.push(`assignment_id = $${values.length}`);
      }
      const res = await client.query(
        `SELECT * FROM production.lesson_note_records
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        values
      );
      return res.rows.map(mapLessonNote);
    });
  }

  async createDeliveryRecord(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    input: {
      assignment: TeacherSubjectAssignment;
      topicId?: string | null;
      topicTitle: string;
      lessonNoteId?: string | null;
      weekNumber?: number;
      scheduledDate?: string;
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const resolution = await this.resolver.resolveTopicForDelivery(client, {
        curriculumVersionId: input.assignment.curriculumVersionId,
        subjectId: input.assignment.subjectId,
        classGradeName: input.assignment.classGradeName,
        topicId: input.topicId,
        topicTitleInput: input.topicTitle
      });

      const scheduledDate = input.scheduledDate || new Date().toISOString().slice(0, 10);
      const res = await client.query(
        `INSERT INTO production.teaching_delivery_records (
           tenant_id, application_instance_id, assignment_id, school_id,
           academic_session, term, class_id, class_grade_name, section,
           subject_id, curriculum_version_id, topic_id, topic_title_input,
           resolved_topic_title, resolution_status, resolution_notes,
           lesson_note_id, week_number, scheduled_date, status,
           created_by_user_id, updated_by_user_id
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19::date, 'assigned', $20, $20
         )
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          input.assignment.id,
          input.assignment.schoolId,
          input.assignment.academicSession,
          input.assignment.term,
          input.assignment.classId,
          input.assignment.classGradeName,
          input.assignment.section,
          input.assignment.subjectId,
          input.assignment.curriculumVersionId,
          resolution.resolvedTopic?.topicId || null,
          input.topicTitle.trim(),
          resolution.resolvedTopic?.topicTitle || null,
          resolution.resolutionStatus,
          resolution.reason,
          input.lessonNoteId && UUID.test(input.lessonNoteId) ? input.lessonNoteId : null,
          Math.max(1, Number(input.weekNumber || 1)),
          scheduledDate,
          input.actorUserId
        ]
      );
      const created = mapDelivery(res.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: created.id,
        assignmentId: input.assignment.id,
        eventType: 'assigned',
        recordVersion: created.recordVersion,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        reason: 'Created teaching delivery assignment record.',
        afterSnapshot: {
          status: created.status,
          resolutionStatus: created.resolutionStatus,
          topicId: created.topicId,
          topicTitleInput: created.topicTitleInput
        }
      });
      return created;
    });
  }

  async listDeliveries(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
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
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['d.tenant_id = $1', 'd.application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];

      if (filter.assignmentId) {
        values.push(filter.assignmentId);
        conditions.push(`d.assignment_id = $${values.length}`);
      }
      if (filter.teacherUserId) {
        values.push(filter.teacherUserId);
        conditions.push(`a.teacher_user_id = $${values.length}`);
      }
      if (filter.academicSession) {
        values.push(filter.academicSession);
        conditions.push(`d.academic_session = $${values.length}`);
      }
      if (filter.term) {
        values.push(filter.term);
        conditions.push(`d.term = $${values.length}`);
      }
      if (filter.classId) {
        values.push(filter.classId);
        conditions.push(`d.class_id = $${values.length}`);
      }
      if (filter.subjectId) {
        values.push(filter.subjectId);
        conditions.push(`d.subject_id = $${values.length}`);
      }
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`d.status = $${values.length}`);
      }
      if (filter.resolutionStatus) {
        values.push(filter.resolutionStatus);
        conditions.push(`d.resolution_status = $${values.length}`);
      }

      const res = await client.query(
        `SELECT d.*
         FROM production.teaching_delivery_records d
         JOIN production.teacher_subject_assignments a
           ON a.tenant_id = d.tenant_id AND a.application_instance_id = d.application_instance_id AND a.id = d.assignment_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY d.week_number ASC, d.scheduled_date ASC, d.created_at DESC`,
        values
      );
      return res.rows.map(mapDelivery);
    });
  }

  async getDeliveryById(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    deliveryId: string
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    if (!UUID.test(deliveryId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'Invalid deliveryId UUID.', 400);
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         LIMIT 1`,
        [tenant.tenantId, applicationInstanceId, deliveryId]
      );
      if (res.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      return mapDelivery(res.rows[0]);
    });
  }

  async listAuditHistory(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    deliveryId?: string
  ): Promise<TeachingDeliveryAuditEntry[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (deliveryId) {
        values.push(deliveryId);
        conditions.push(`delivery_record_id = $${values.length}`);
      }
      const res = await client.query(
        `SELECT * FROM production.teaching_delivery_audit_history
         WHERE ${conditions.join(' AND ')}
         ORDER BY occurred_at DESC`,
        values
      );
      return res.rows.map(mapAudit);
    });
  }

  async transitionDeliveryStage(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      deliveryId: string;
      targetStatus: 'received' | 'opened' | 'acknowledged';
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const existingRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId]
      );
      if (existingRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      const current = mapDelivery(existingRes.rows[0]);
      const allowed = VALID_STAGE_TRANSITIONS[current.status];
      if (!allowed.includes(params.targetStatus)) {
        throw new TeachingEvidenceError(
          'INVALID_TRANSITION',
          `Cannot transition teaching delivery from '${current.status}' to '${params.targetStatus}'. Allowed next stage(s): ${allowed.join(', ') || 'none'}.`,
          409,
          { currentStatus: current.status, targetStatus: params.targetStatus, allowedNextStages: allowed }
        );
      }

      const timestampColumn =
        params.targetStatus === 'received'
          ? 'received_at'
          : params.targetStatus === 'opened'
          ? 'opened_at'
          : 'acknowledged_at';

      const updatedRes = await client.query(
        `UPDATE production.teaching_delivery_records
         SET status = $4,
             ${timestampColumn} = COALESCE(${timestampColumn}, now()),
             updated_by_user_id = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId, params.targetStatus, params.actorUserId]
      );
      const updated = mapDelivery(updatedRes.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: updated.id,
        assignmentId: updated.assignmentId,
        eventType: params.targetStatus,
        recordVersion: updated.recordVersion,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        beforeSnapshot: { status: current.status },
        afterSnapshot: { status: updated.status }
      });
      return updated;
    });
  }

  async confirmTeachingCompletion(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      deliveryId: string;
      assignment: TeacherSubjectAssignment;
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
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<{ record: TeachingDeliveryRecord; idempotentReplay: boolean }> {
    this.assertScope(tenant, applicationInstanceId);
    if (!params.confirmTaught) {
      throw new TeachingEvidenceError(
        'VALIDATION_ERROR',
        'Explicit teacher confirmation (confirmTaught=true) is required to mark a topic as taught or completed.',
        400
      );
    }

    return withTenantTransaction(this.pool, tenant, async client => {
      if (params.idempotencyKey?.trim()) {
        const replayRes = await client.query(
          `SELECT * FROM production.teaching_delivery_records
           WHERE tenant_id = $1 AND application_instance_id = $2 AND assignment_id = $3 AND completion_idempotency_key = $4
           LIMIT 1`,
          [tenant.tenantId, applicationInstanceId, params.assignment.id, params.idempotencyKey.trim()]
        );
        if (replayRes.rowCount && replayRes.rowCount > 0) {
          const existingReplay = mapDelivery(replayRes.rows[0]);
          if (existingReplay.id !== params.deliveryId) {
            throw new TeachingEvidenceError(
              'DUPLICATE_COMPLETION',
              'Completion idempotency key was already consumed by a different delivery record.',
              409
            );
          }
          return { record: existingReplay, idempotentReplay: true };
        }
      }

      const existingRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId]
      );
      if (existingRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      const current = mapDelivery(existingRes.rows[0]);

      const allowed = VALID_STAGE_TRANSITIONS[current.status];
      if (!allowed.includes(params.targetStatus)) {
        throw new TeachingEvidenceError(
          'INVALID_TRANSITION',
          `Cannot confirm '${params.targetStatus}' directly from stage '${current.status}'. Complete prior acknowledgment stages first.`,
          409,
          { currentStatus: current.status, targetStatus: params.targetStatus, allowedNextStages: allowed }
        );
      }

      if (params.targetStatus === 'completed' && (!params.understandingLevel || !params.studentEngagement)) {
        throw new TeachingEvidenceError(
          'VALIDATION_ERROR',
          'Structured teacher feedback (understandingLevel and studentEngagement) is required to complete delivery.',
          400
        );
      }

      // Validate objectives against NERDC curriculum version if topic is resolved
      let finalCovered = params.coveredObjectiveIds || [];
      let finalUncovered = params.uncoveredObjectiveIds || [];
      if (current.topicId) {
        const resolution = await this.resolver.resolveTopicForDelivery(client, {
          curriculumVersionId: current.curriculumVersionId,
          subjectId: current.subjectId,
          classGradeName: current.classGradeName,
          topicId: current.topicId,
          topicTitleInput: current.topicTitleInput,
          manualMapping: current.resolutionStatus === 'manually_mapped'
        });
        if (resolution.resolvedTopic) {
          if (finalCovered.length === 0 && params.coverageMode === 'full') {
            finalCovered = resolution.resolvedTopic.objectives.map(o => o.id);
          }
          const validated = this.resolver.validateObjectiveSelectionForTopic(
            resolution.resolvedTopic,
            finalCovered,
            finalUncovered
          );
          finalCovered = validated.coveredObjectiveIds;
          finalUncovered = validated.uncoveredObjectiveIds;
        }
      }

      if (params.coverageMode !== 'none' && current.topicId && finalCovered.length === 0) {
        throw new TeachingEvidenceError(
          'VALIDATION_ERROR',
          'At least one covered learning objective must be specified when topic coverage is full or partial.',
          400
        );
      }

      const updatedRes = await client.query(
        `UPDATE production.teaching_delivery_records
         SET status = $4,
             taught_at = COALESCE(taught_at, now()),
             completed_at = CASE WHEN $4 = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END,
             completion_confirmed_by_teacher = true,
             completion_teacher_user_id = $5,
             completion_idempotency_key = COALESCE($6, completion_idempotency_key),
             coverage_mode = $7,
             covered_objective_ids = $8::jsonb,
             uncovered_objective_ids = $9::jsonb,
             understanding_level = COALESCE($10, understanding_level),
             student_engagement = COALESCE($11, student_engagement),
             remedial_needed = $12,
             remedial_topic = $13,
             teacher_comments = $14,
             challenges_noted = $15,
             updated_by_user_id = $5,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.deliveryId,
          params.targetStatus,
          params.actorUserId,
          params.idempotencyKey?.trim() || null,
          params.coverageMode,
          JSON.stringify(finalCovered),
          JSON.stringify(finalUncovered),
          params.understandingLevel || null,
          params.studentEngagement || null,
          Boolean(params.remedialNeeded),
          params.remedialTopic?.trim() || null,
          (params.teacherComments ?? current.teacherComments ?? '').trim(),
          params.challengesNoted?.trim() || null
        ]
      );
      const updated = mapDelivery(updatedRes.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: updated.id,
        assignmentId: updated.assignmentId,
        eventType: params.targetStatus,
        recordVersion: updated.recordVersion,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        reason: `Teacher confirmed topic status '${params.targetStatus}' (${updated.coverageMode} coverage).`,
        beforeSnapshot: {
          status: current.status,
          coverageMode: current.coverageMode,
          coveredObjectiveIds: current.coveredObjectiveIds
        },
        afterSnapshot: {
          status: updated.status,
          coverageMode: updated.coverageMode,
          coveredObjectiveIds: updated.coveredObjectiveIds,
          uncoveredObjectiveIds: updated.uncoveredObjectiveIds,
          remedialNeeded: updated.remedialNeeded
        }
      });
      return { record: updated, idempotentReplay: false };
    });
  }

  async correctDeliveryRecord(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      deliveryId: string;
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
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    if (!params.correctionReason || params.correctionReason.trim().length < 5) {
      throw new TeachingEvidenceError(
        'VALIDATION_ERROR',
        'A clear correctionReason (at least 5 characters) is mandatory when revising teaching evidence.',
        400
      );
    }

    return withTenantTransaction(this.pool, tenant, async client => {
      const existingRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId]
      );
      if (existingRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      const current = mapDelivery(existingRes.rows[0]);

      let nextCovered = params.coveredObjectiveIds ?? current.coveredObjectiveIds;
      let nextUncovered = params.uncoveredObjectiveIds ?? current.uncoveredObjectiveIds;
      if (current.topicId) {
        const resolution = await this.resolver.resolveTopicForDelivery(client, {
          curriculumVersionId: current.curriculumVersionId,
          subjectId: current.subjectId,
          classGradeName: current.classGradeName,
          topicId: current.topicId,
          topicTitleInput: current.topicTitleInput,
          manualMapping: current.resolutionStatus === 'manually_mapped'
        });
        if (resolution.resolvedTopic) {
          const validated = this.resolver.validateObjectiveSelectionForTopic(
            resolution.resolvedTopic,
            nextCovered,
            nextUncovered
          );
          nextCovered = validated.coveredObjectiveIds;
          nextUncovered = validated.uncoveredObjectiveIds;
        }
      }

      const nextVersion = current.recordVersion + 1;
      const updatedRes = await client.query(
        `UPDATE production.teaching_delivery_records
         SET coverage_mode = COALESCE($4, coverage_mode),
             covered_objective_ids = $5::jsonb,
             uncovered_objective_ids = $6::jsonb,
             understanding_level = COALESCE($7, understanding_level),
             student_engagement = COALESCE($8, student_engagement),
             remedial_needed = COALESCE($9, remedial_needed),
             remedial_topic = COALESCE($10, remedial_topic),
             teacher_comments = COALESCE($11, teacher_comments),
             challenges_noted = COALESCE($12, challenges_noted),
             record_version = $13,
             correction_reason = $14,
             updated_by_user_id = $15,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.deliveryId,
          params.coverageMode || null,
          JSON.stringify(nextCovered),
          JSON.stringify(nextUncovered),
          params.understandingLevel || null,
          params.studentEngagement || null,
          params.remedialNeeded === undefined ? null : params.remedialNeeded,
          params.remedialTopic === undefined ? null : params.remedialTopic,
          params.teacherComments === undefined ? null : params.teacherComments.trim(),
          params.challengesNoted === undefined ? null : params.challengesNoted,
          nextVersion,
          params.correctionReason.trim(),
          params.actorUserId
        ]
      );
      const updated = mapDelivery(updatedRes.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: updated.id,
        assignmentId: updated.assignmentId,
        eventType: 'corrected',
        recordVersion: nextVersion,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        reason: params.correctionReason.trim(),
        beforeSnapshot: {
          recordVersion: current.recordVersion,
          usedInAssessmentCount: current.usedInAssessmentCount,
          coverageMode: current.coverageMode,
          coveredObjectiveIds: current.coveredObjectiveIds,
          uncoveredObjectiveIds: current.uncoveredObjectiveIds,
          understandingLevel: current.understandingLevel,
          studentEngagement: current.studentEngagement,
          remedialNeeded: current.remedialNeeded,
          teacherComments: current.teacherComments
        },
        afterSnapshot: {
          recordVersion: updated.recordVersion,
          usedInAssessmentCount: updated.usedInAssessmentCount,
          coverageMode: updated.coverageMode,
          coveredObjectiveIds: updated.coveredObjectiveIds,
          uncoveredObjectiveIds: updated.uncoveredObjectiveIds,
          understandingLevel: updated.understandingLevel,
          studentEngagement: updated.studentEngagement,
          remedialNeeded: updated.remedialNeeded,
          teacherComments: updated.teacherComments
        }
      });
      return updated;
    });
  }

  async mapUnresolvedTopic(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      deliveryId: string;
      topicId: string;
      coveredObjectiveIds?: string[];
      reason: string;
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const existingRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId]
      );
      if (existingRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      const current = mapDelivery(existingRes.rows[0]);

      const resolution = await this.resolver.resolveTopicForDelivery(client, {
        curriculumVersionId: current.curriculumVersionId,
        subjectId: current.subjectId,
        classGradeName: current.classGradeName,
        topicId: params.topicId,
        topicTitleInput: current.topicTitleInput,
        manualMapping: true
      });
      if (!resolution.resolvedTopic) {
        throw new TeachingEvidenceError(
          'UNRESOLVED_CURRICULUM',
          resolution.reason,
          422,
          { topicId: params.topicId, curriculumVersionId: current.curriculumVersionId }
        );
      }

      let covered = params.coveredObjectiveIds || current.coveredObjectiveIds;
      if (covered.length === 0 && current.coverageMode === 'full') {
        covered = resolution.resolvedTopic.objectives.map(o => o.id);
      }
      const validated = this.resolver.validateObjectiveSelectionForTopic(
        resolution.resolvedTopic,
        covered,
        current.uncoveredObjectiveIds
      );

      const nextVersion = current.recordVersion + 1;
      const updatedRes = await client.query(
        `UPDATE production.teaching_delivery_records
         SET topic_id = $4,
             resolved_topic_title = $5,
             resolution_status = 'manually_mapped',
             resolution_notes = $6,
             covered_objective_ids = $7::jsonb,
             uncovered_objective_ids = $8::jsonb,
             record_version = $9,
             correction_reason = $10,
             updated_by_user_id = $11,
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.deliveryId,
          resolution.resolvedTopic.topicId,
          resolution.resolvedTopic.topicTitle,
          resolution.reason,
          JSON.stringify(validated.coveredObjectiveIds),
          JSON.stringify(validated.uncoveredObjectiveIds),
          nextVersion,
          params.reason.trim() || 'Manual curriculum mapping',
          params.actorUserId
        ]
      );
      const updated = mapDelivery(updatedRes.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: updated.id,
        assignmentId: updated.assignmentId,
        eventType: 'curriculum_mapped',
        recordVersion: nextVersion,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        reason: params.reason.trim() || resolution.reason,
        beforeSnapshot: {
          topicId: current.topicId,
          resolutionStatus: current.resolutionStatus
        },
        afterSnapshot: {
          topicId: updated.topicId,
          resolvedTopicTitle: updated.resolvedTopicTitle,
          resolutionStatus: updated.resolutionStatus
        }
      });
      return updated;
    });
  }

  async adminVerifyDelivery(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      deliveryId: string;
      adminVerificationStatus: AdminVerificationStatus;
      reason: string;
      actorUserId: string;
      actorRole: string;
    }
  ): Promise<TeachingDeliveryRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const existingRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.deliveryId]
      );
      if (existingRes.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Teaching delivery record not found.', 404);
      }
      const current = mapDelivery(existingRes.rows[0]);
      const nextBasis =
        params.adminVerificationStatus === 'verified' ? 'admin_verified' : 'teacher_self_reported';

      const updatedRes = await client.query(
        `UPDATE production.teaching_delivery_records
         SET admin_verification_status = $4,
             verification_basis = $5,
             admin_verified_by = $6,
             admin_verified_at = now(),
             updated_at = now()
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.deliveryId,
          params.adminVerificationStatus,
          nextBasis,
          params.actorUserId
        ]
      );
      const updated = mapDelivery(updatedRes.rows[0]);
      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        deliveryRecordId: updated.id,
        assignmentId: updated.assignmentId,
        eventType: 'admin_verified',
        recordVersion: updated.recordVersion,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        reason: params.reason.trim() || `Admin verification set to '${params.adminVerificationStatus}'`,
        beforeSnapshot: {
          adminVerificationStatus: current.adminVerificationStatus,
          verificationBasis: current.verificationBasis
        },
        afterSnapshot: {
          adminVerificationStatus: updated.adminVerificationStatus,
          verificationBasis: updated.verificationBasis
        }
      });
      return updated;
    });
  }

  async getSubjectProgressSummaries(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    filter: {
      teacherUserId?: string;
      academicSession?: string;
      term?: string;
      classId?: string;
      subjectId?: string;
      assignmentId?: string;
    } = {}
  ): Promise<SubjectProgressSummary[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (filter.teacherUserId) {
        values.push(filter.teacherUserId);
        conditions.push(`teacher_user_id = $${values.length}`);
      }
      if (filter.academicSession) {
        values.push(filter.academicSession);
        conditions.push(`academic_session = $${values.length}`);
      }
      if (filter.term) {
        values.push(filter.term);
        conditions.push(`term = $${values.length}`);
      }
      if (filter.classId) {
        values.push(filter.classId);
        conditions.push(`class_id = $${values.length}`);
      }
      if (filter.subjectId) {
        values.push(filter.subjectId);
        conditions.push(`subject_id = $${values.length}`);
      }
      if (filter.assignmentId) {
        values.push(filter.assignmentId);
        conditions.push(`id = $${values.length}`);
      }

      const assignmentRows = await client.query(
        `SELECT * FROM production.teacher_subject_assignments
         WHERE ${conditions.join(' AND ')}
         ORDER BY subject_name ASC, class_grade_name ASC`,
        values
      );
      const assignments = assignmentRows.rows.map(mapAssignment);
      if (assignments.length === 0) return [];

      const summaries: SubjectProgressSummary[] = [];
      for (const assignment of assignments) {
        const topicsInCurriculum = await this.resolver.countCurriculumTopicsForScope(client, {
          curriculumVersionId: assignment.curriculumVersionId,
          subjectId: assignment.subjectId,
          classGradeName: assignment.classGradeName
        });

        const deliveryRes = await client.query(
          `SELECT * FROM production.teaching_delivery_records
           WHERE tenant_id = $1 AND application_instance_id = $2 AND assignment_id = $3
           ORDER BY updated_at DESC`,
          [tenant.tenantId, applicationInstanceId, assignment.id]
        );
        const deliveries = deliveryRes.rows.map(mapDelivery);

        const assignedCount = deliveries.filter(d => d.status === 'assigned').length;
        const receivedCount = deliveries.filter(d => d.status === 'received').length;
        const openedCount = deliveries.filter(d => d.status === 'opened').length;
        const acknowledgedCount = deliveries.filter(d => d.status === 'acknowledged').length;
        const taughtCount = deliveries.filter(d => d.status === 'taught').length;
        const completedCount = deliveries.filter(d => d.status === 'completed').length;

        const verifiedDeliveries = deliveries.filter(
          d =>
            (d.status === 'taught' || d.status === 'completed') &&
            d.completionConfirmedByTeacher &&
            (d.resolutionStatus === 'resolved' || d.resolutionStatus === 'manually_mapped') &&
            Boolean(d.topicId) &&
            d.coverageMode !== 'none'
        );
        const verifiedDistinctTopics = new Set(verifiedDeliveries.map(d => d.topicId as string));
        const verifiedTaughtTopicsCount = verifiedDistinctTopics.size;
        const partiallyCoveredCount = deliveries.filter(d => d.coverageMode === 'partial').length;
        const unresolvedTopicsCount = deliveries.filter(d => d.resolutionStatus === 'unresolved').length;
        const remediationRequiredCount = deliveries.filter(d => d.remedialNeeded).length;

        const notYetTaughtCount = Math.max(0, topicsInCurriculum - verifiedTaughtTopicsCount);
        const denominator = topicsInCurriculum > 0 ? topicsInCurriculum : deliveries.length;
        const coveragePercentage =
          denominator > 0 ? Math.min(100, Math.round((verifiedTaughtTopicsCount / denominator) * 100)) : 0;

        const bases = new Set(deliveries.map(d => d.verificationBasis));
        const verificationBasis: SubjectProgressSummary['verificationBasis'] =
          bases.size === 0
            ? 'teacher_self_reported'
            : bases.size === 1
            ? ([...bases][0] as SubjectProgressSummary['verificationBasis'])
            : 'mixed';

        const uncoveredObjectives = deliveries
          .filter(d => d.uncoveredObjectiveIds.length > 0)
          .map(d => ({
            deliveryRecordId: d.id,
            topicId: d.topicId,
            topicTitle: d.resolvedTopicTitle || d.topicTitleInput,
            objectiveIds: d.uncoveredObjectiveIds
          }));

        summaries.push({
          assignmentId: assignment.id,
          tenantId: assignment.tenantId,
          applicationInstanceId: assignment.applicationInstanceId,
          academicSession: assignment.academicSession,
          term: assignment.term,
          classId: assignment.classId,
          classGradeName: assignment.classGradeName,
          section: assignment.section,
          subjectId: assignment.subjectId,
          subjectName: assignment.subjectName,
          curriculumVersionId: assignment.curriculumVersionId,
          teacherUserId: assignment.teacherUserId,
          topicsInCurriculum,
          totalDeliveries: deliveries.length,
          assignedCount,
          receivedCount,
          openedCount,
          acknowledgedCount,
          taughtCount,
          completedCount,
          verifiedTaughtTopicsCount,
          partiallyCoveredCount,
          notYetTaughtCount,
          unresolvedTopicsCount,
          remediationRequiredCount,
          coveragePercentage,
          verificationBasis,
          uncoveredObjectives,
          lastUpdatedAt: deliveries[0]?.updatedAt || null
        });
      }
      return summaries;
    });
  }

  async getVerifiedTaughtEvidence(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      assignment: TeacherSubjectAssignment;
      actorUserId: string;
      actorRole: string;
      purpose?: string;
    }
  ): Promise<VerifiedTaughtEvidenceBundle> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const deliveriesRes = await client.query(
        `SELECT * FROM production.teaching_delivery_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND assignment_id = $3
         ORDER BY week_number ASC, scheduled_date ASC`,
        [tenant.tenantId, applicationInstanceId, params.assignment.id]
      );
      const allDeliveries = deliveriesRes.rows.map(mapDelivery);

      const lessonNotesRes = await client.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM production.lesson_note_records
         WHERE tenant_id = $1 AND application_instance_id = $2 AND assignment_id = $3`,
        [tenant.tenantId, applicationInstanceId, params.assignment.id]
      );
      const lessonNotesExcludedCount = Number(lessonNotesRes.rows[0]?.total ?? 0);

      let unresolvedExcludedCount = 0;
      let unconfirmedExcludedCount = 0;
      const eligibleDeliveries: TeachingDeliveryRecord[] = [];

      for (const delivery of allDeliveries) {
        if (delivery.resolutionStatus === 'unresolved' || !delivery.topicId) {
          unresolvedExcludedCount += 1;
          continue;
        }
        if (
          (delivery.status !== 'taught' && delivery.status !== 'completed') ||
          !delivery.completionConfirmedByTeacher ||
          !delivery.taughtAt ||
          delivery.coverageMode === 'none'
        ) {
          unconfirmedExcludedCount += 1;
          continue;
        }
        eligibleDeliveries.push(delivery);
      }

      const topicIds = [...new Set(eligibleDeliveries.map(d => d.topicId as string))];
      const objectiveMap = new Map<string, { id: string; description: string; bloomLevel: string | null }>();
      if (topicIds.length > 0) {
        const objRes = await client.query<{
          id: string;
          description: string;
          bloom_level: string | null;
        }>(
          `SELECT id, description, bloom_level
           FROM production.curriculum_learning_objectives
           WHERE curriculum_version_id = $1 AND topic_id = ANY($2::text[])
           ORDER BY sort_order ASC, id ASC`,
          [params.assignment.curriculumVersionId, topicIds]
        );
        for (const row of objRes.rows) {
          objectiveMap.set(row.id, {
            id: row.id,
            description: row.description,
            bloomLevel: row.bloom_level
          });
        }
      }

      const verifiedTopics: VerifiedTaughtTopicEvidence[] = eligibleDeliveries.map(d => ({
        deliveryRecordId: d.id,
        topicId: d.topicId as string,
        topicTitle: d.resolvedTopicTitle || d.topicTitleInput,
        curriculumVersionId: d.curriculumVersionId,
        weekNumber: d.weekNumber,
        status: d.status as 'taught' | 'completed',
        coverageMode: d.coverageMode as 'full' | 'partial',
        taughtAt: d.taughtAt as string,
        completedAt: d.completedAt,
        coveredObjectives: d.coveredObjectiveIds
          .map(id => objectiveMap.get(id))
          .filter((o): o is { id: string; description: string; bloomLevel: string | null } => Boolean(o)),
        uncoveredObjectiveIds: d.uncoveredObjectiveIds,
        remedialNeeded: d.remedialNeeded,
        remedialTopic: d.remedialTopic,
        understandingLevel: d.understandingLevel,
        verificationBasis: d.verificationBasis,
        adminVerificationStatus: d.adminVerificationStatus,
        recordVersion: d.recordVersion
      }));

      const totalCoveredObjectives = new Set(
        verifiedTopics.flatMap(t => t.coveredObjectives.map(o => o.id))
      ).size;

      await this.insertAudit(client, {
        tenantId: tenant.tenantId,
        applicationInstanceId,
        assignmentId: params.assignment.id,
        eventType: 'evidence_retrieved',
        recordVersion: 1,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        reason: params.purpose || 'Verified taught-topic evidence retrieved.',
        afterSnapshot: {
          verifiedTopicsCount: verifiedTopics.length,
          totalCoveredObjectives,
          unresolvedExcludedCount,
          unconfirmedExcludedCount,
          lessonNotesExcludedCount
        }
      });

      return {
        assignment: params.assignment,
        academicSession: params.assignment.academicSession,
        term: params.assignment.term,
        classId: params.assignment.classId,
        classGradeName: params.assignment.classGradeName,
        section: params.assignment.section,
        subjectId: params.assignment.subjectId,
        subjectName: params.assignment.subjectName,
        curriculumVersionId: params.assignment.curriculumVersionId,
        verifiedTopics,
        unresolvedExcludedCount,
        unconfirmedExcludedCount,
        lessonNotesExcludedCount,
        totalVerifiedTopics: verifiedTopics.length,
        totalCoveredObjectives,
        retrievedAt: new Date().toISOString()
      };
    });
  }

  async createScopeAuthorization(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    params: {
      assignment: TeacherSubjectAssignment;
      assessmentType: ScopeAssessmentType;
      title: string;
      selectedTopicIds: string[];
      selectedObjectiveIds: string[];
      sourceDeliveryIds: string[];
      questionCount: number;
      questionTypesConfig: Record<string, number>;
      objectiveTheoryBalance: {
        objectivePercent: number;
        theoryPercent: number;
        practicalPercent: number;
      };
      totalMarks: number;
      difficultyMix: Record<string, number>;
      durationMinutes: number;
      instructions: string;
    }
  ): Promise<AssessmentScopeAuthorization> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const prevRes = await client.query<{ id: string; scope_version: number }>(
        `SELECT id, scope_version
         FROM production.assessment_scope_authorizations
         WHERE tenant_id = $1 AND application_instance_id = $2
           AND assignment_id = $3 AND assessment_type = $4 AND status = 'authorized'
         ORDER BY scope_version DESC
         LIMIT 1
         FOR UPDATE`,
        [tenant.tenantId, applicationInstanceId, params.assignment.id, params.assessmentType]
      );

      let nextVersion = 1;
      let supersedesId: string | null = null;
      if (prevRes.rowCount && prevRes.rowCount > 0) {
        supersedesId = prevRes.rows[0].id;
        nextVersion = Number(prevRes.rows[0].scope_version) + 1;
        await client.query(
          `UPDATE production.assessment_scope_authorizations
           SET status = 'superseded'
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3`,
          [tenant.tenantId, applicationInstanceId, supersedesId]
        );
      }

      const scopeHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            assignmentId: params.assignment.id,
            teacherUserId: params.assignment.teacherUserId,
            assessmentType: params.assessmentType,
            scopeVersion: nextVersion,
            selectedTopicIds: [...params.selectedTopicIds].sort(),
            selectedObjectiveIds: [...params.selectedObjectiveIds].sort(),
            sourceDeliveryIds: [...params.sourceDeliveryIds].sort(),
            questionCount: params.questionCount,
            totalMarks: params.totalMarks,
            difficultyMix: params.difficultyMix
          })
        )
        .digest('hex');

      const res = await client.query(
        `INSERT INTO production.assessment_scope_authorizations (
           tenant_id, application_instance_id, assignment_id, school_id,
           academic_session, term, class_id, class_grade_name, section,
           subject_id, curriculum_version_id, teacher_user_id, assessment_type,
           title, scope_version, supersedes_authorization_id, status,
           selected_topic_ids, selected_objective_ids, source_delivery_ids,
           question_count, question_types_config, objective_theory_balance,
           total_marks, difficulty_mix, duration_minutes, instructions, scope_hash
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, 'authorized', $17::jsonb, $18::jsonb, $19::jsonb,
           $20, $21::jsonb, $22::jsonb, $23, $24::jsonb, $25, $26, $27
         )
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.assignment.id,
          params.assignment.schoolId,
          params.assignment.academicSession,
          params.assignment.term,
          params.assignment.classId,
          params.assignment.classGradeName,
          params.assignment.section,
          params.assignment.subjectId,
          params.assignment.curriculumVersionId,
          params.assignment.teacherUserId,
          params.assessmentType,
          params.title.trim(),
          nextVersion,
          supersedesId,
          JSON.stringify(params.selectedTopicIds),
          JSON.stringify(params.selectedObjectiveIds),
          JSON.stringify(params.sourceDeliveryIds),
          params.questionCount,
          JSON.stringify(params.questionTypesConfig),
          JSON.stringify(params.objectiveTheoryBalance),
          params.totalMarks,
          JSON.stringify(params.difficultyMix),
          params.durationMinutes,
          params.instructions.trim(),
          `sha256-${scopeHash}`
        ]
      );
      return mapScopeAuthorization(res.rows[0]);
    });
  }

  async getScopeAuthorizationById(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    scopeAuthorizationId: string
  ): Promise<AssessmentScopeAuthorization> {
    this.assertScope(tenant, applicationInstanceId);
    if (!UUID.test(scopeAuthorizationId)) {
      throw new TeachingEvidenceError('VALIDATION_ERROR', 'Invalid scopeAuthorizationId UUID.', 400);
    }
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `SELECT * FROM production.assessment_scope_authorizations
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3
         LIMIT 1`,
        [tenant.tenantId, applicationInstanceId, scopeAuthorizationId]
      );
      if (res.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Assessment scope authorization was not found.', 404);
      }
      return mapScopeAuthorization(res.rows[0]);
    });
  }

  async listScopeAuthorizations(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    filter: { assignmentId?: string; teacherUserId?: string; status?: string } = {}
  ): Promise<AssessmentScopeAuthorization[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (filter.assignmentId) {
        values.push(filter.assignmentId);
        conditions.push(`assignment_id = $${values.length}`);
      }
      if (filter.teacherUserId) {
        values.push(filter.teacherUserId);
        conditions.push(`teacher_user_id = $${values.length}`);
      }
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`status = $${values.length}`);
      }
      const res = await client.query(
        `SELECT * FROM production.assessment_scope_authorizations
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        values
      );
      return res.rows.map(mapScopeAuthorization);
    });
  }

  async revokeScopeAuthorization(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    scopeAuthorizationId: string,
    revokedByUserId: string,
    reason: string
  ): Promise<AssessmentScopeAuthorization> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const res = await client.query(
        `UPDATE production.assessment_scope_authorizations
         SET status = 'revoked',
             revoked_at = now(),
             revoked_by_user_id = $4,
             revocation_reason = $5
         WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3 AND status = 'authorized'
         RETURNING *`,
        [tenant.tenantId, applicationInstanceId, scopeAuthorizationId, revokedByUserId, reason.trim() || 'Revoked by teacher']
      );
      if (res.rowCount === 0) {
        throw new TeachingEvidenceError('NOT_FOUND', 'Authorized assessment scope not found or already inactive.', 404);
      }
      return mapScopeAuthorization(res.rows[0]);
    });
  }

  async recordGenerationProvenance(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
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
      createdByUserId: string;
    }
  ): Promise<AssessmentGenerationProvenanceRecord> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      if (params.generationStatus === 'generated' && params.scopeAuthorization.sourceDeliveryIds.length > 0) {
        await client.query(
          `UPDATE production.teaching_delivery_records
           SET used_in_assessment_count = used_in_assessment_count + 1,
               updated_at = now()
           WHERE tenant_id = $1 AND application_instance_id = $2 AND id = ANY($3::uuid[])`,
          [tenant.tenantId, applicationInstanceId, params.scopeAuthorization.sourceDeliveryIds]
        );
      }

      const res = await client.query(
        `INSERT INTO production.assessment_generation_provenance (
           tenant_id, application_instance_id, scope_authorization_id,
           blueprint_id, exam_configuration_id, assignment_id, teacher_user_id,
           academic_session, term, class_id, section, subject_id, curriculum_version_id,
           verified_topic_ids, verified_objective_ids, source_delivery_ids,
           generated_question_ids, ai_gateway_request_id, provider_id, model_id,
           generation_status, rejection_reason, created_by_user_id
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19, $20, $21, $22, $23
         )
         RETURNING *`,
        [
          tenant.tenantId,
          applicationInstanceId,
          params.scopeAuthorization.id,
          params.blueprintId || null,
          params.examConfigurationId || null,
          params.scopeAuthorization.assignmentId,
          params.scopeAuthorization.teacherUserId,
          params.scopeAuthorization.academicSession,
          params.scopeAuthorization.term,
          params.scopeAuthorization.classId,
          params.scopeAuthorization.section,
          params.scopeAuthorization.subjectId,
          params.scopeAuthorization.curriculumVersionId,
          JSON.stringify(params.scopeAuthorization.selectedTopicIds),
          JSON.stringify(params.scopeAuthorization.selectedObjectiveIds),
          JSON.stringify(params.scopeAuthorization.sourceDeliveryIds),
          JSON.stringify(params.generatedQuestionIds),
          params.aiGatewayRequestId && UUID.test(params.aiGatewayRequestId) ? params.aiGatewayRequestId : null,
          params.providerId || null,
          params.modelId || null,
          params.generationStatus,
          params.rejectionReason || null,
          params.createdByUserId
        ]
      );
      return mapProvenance(res.rows[0]);
    });
  }

  async listGenerationProvenance(
    tenant: VerifiedTenantPrincipal,
    applicationInstanceId: string,
    scopeAuthorizationId?: string
  ): Promise<AssessmentGenerationProvenanceRecord[]> {
    this.assertScope(tenant, applicationInstanceId);
    return withTenantTransaction(this.pool, tenant, async client => {
      const conditions = ['tenant_id = $1', 'application_instance_id = $2'];
      const values: unknown[] = [tenant.tenantId, applicationInstanceId];
      if (scopeAuthorizationId) {
        values.push(scopeAuthorizationId);
        conditions.push(`scope_authorization_id = $${values.length}`);
      }
      const res = await client.query(
        `SELECT * FROM production.assessment_generation_provenance
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        values
      );
      return res.rows.map(mapProvenance);
    });
  }
}
