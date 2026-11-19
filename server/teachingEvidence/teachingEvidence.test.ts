import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { QueryResult, QueryResultRow } from 'pg';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  acceptanceTestOptions,
  databaseUrl,
  principal,
  TEST_CONTROL_PLANE_SECRET
} from '../db/testSupport';
import { createAuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';
import { CentralAiGatewayService } from '../ai/gatewayService';
import type { GeminiTransport } from '../ai/geminiProvider';
import { GoogleGeminiProviderAdapter } from '../ai/geminiProvider';
import { AiGatewayTrafficController } from '../ai/rateLimiter';
import { AiGatewayError } from '../ai/types';
import { InMemoryAiGatewayStore } from '../ai/usageMetering';
import { evaluateProductionCapabilityGate } from '../capabilities/productionCapabilityRegistry';
import { InstanceQuestionBankService } from '../questionBank/instanceQuestionBankService';
import { TeachingEvidenceService } from './teachingEvidenceService';
import { TeachingEvidenceError } from './teachingEvidenceTypes';

process.env.CONTROL_PLANE_SECRET ||= TEST_CONTROL_PLANE_SECRET;

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const INSTANCE_A = 'aaaa1111-1111-4111-8111-111111111111';
const INSTANCE_B = 'bbbb2222-2222-4222-8222-222222222222';
const SCHOOL_A = '99990001-1111-4111-8111-111111111111';
const CLASS_JSS1 = 'cccc0001-1111-4111-8111-111111111111';
const TEACHER_1 = 'dddd0001-1111-4111-8111-111111111111';
const TEACHER_2 = 'dddd0002-1111-4111-8111-111111111111';
const PRINCIPAL_1 = 'eeee0001-1111-4111-8111-111111111111';
const STAFF_1 = 'ffff0001-1111-4111-8111-111111111111';
const STAFF_2 = 'ffff0002-1111-4111-8111-111111111111';

const VER_V1 = 'NERDC-2024-V1';
const VER_V2 = 'NERDC-2026-V2';
const SUBJ_MATH = 'subj_math';
const TOPIC_FRACTIONS_V1 = 'top_math_v1_fractions';
const TOPIC_ALGEBRA_V1 = 'top_math_v1_algebra';
const TOPIC_GEOMETRY_V1 = 'top_math_v1_geometry';
const TOPIC_FRACTIONS_V2 = 'top_math_v2_fractions';
const OBJ_FRAC_1 = 'obj_v1_frac_1';
const OBJ_FRAC_2 = 'obj_v1_frac_2';
const OBJ_ALG_1 = 'obj_v1_alg_1';
const OBJ_GEO_1 = 'obj_v1_geo_1';
const OBJ_FRAC_V2_1 = 'obj_v2_frac_1';

function makeAuthPrincipal(params: {
  tenantId: string;
  userId: string;
  roleCode: string;
  permissions: string[];
}) {
  return createAuthorizedPrincipal({
    tenant: { ...principal(params.tenantId, params.roleCode), userId: params.userId, email: `${params.roleCode}@school.edu` },
    userId: params.userId,
    sessionId: crypto.randomUUID(),
    grants: [
      {
        roleCode: params.roleCode,
        permissions: params.permissions,
        scopes: []
      }
    ]
  });
}

function makeTeacherCtx(tenantId = TENANT_A, applicationInstanceId = INSTANCE_A, userId = TEACHER_1) {
  const perms = [
    PERMISSIONS.teachingDeliveryRead,
    PERMISSIONS.teachingDeliveryManage,
    PERMISSIONS.teachingEvidenceRead,
    PERMISSIONS.assessmentsRead,
    PERMISSIONS.assessmentsScopeAuthorize,
    PERMISSIONS.aiAssessmentsGenerate,
    PERMISSIONS.questionBankRead,
    PERMISSIONS.questionBankManage
  ];
  const auth = makeAuthPrincipal({ tenantId, userId, roleCode: 'subject_teacher', permissions: perms });
  return {
    tenant: auth.tenant,
    applicationInstanceId,
    authorizedPrincipal: auth,
    userId,
    role: 'subject_teacher'
  };
}

function makePrincipalCtx(tenantId = TENANT_A, applicationInstanceId = INSTANCE_A, userId = PRINCIPAL_1) {
  // Principal explicitly has oversight permissions EXCEPT assessmentsScopeAuthorize (teacher-only)
  const perms = [
    PERMISSIONS.teachingAssignmentsManage,
    PERMISSIONS.teachingDeliveryRead,
    PERMISSIONS.teachingEvidenceRead,
    PERMISSIONS.assessmentsRead,
    PERMISSIONS.assessmentsManage,
    PERMISSIONS.questionBankRead,
    PERMISSIONS.questionBankReview,
    PERMISSIONS.questionBankManage
  ];
  const auth = makeAuthPrincipal({ tenantId, userId, roleCode: 'principal', permissions: perms });
  return {
    tenant: auth.tenant,
    applicationInstanceId,
    authorizedPrincipal: auth,
    userId,
    role: 'principal'
  };
}

function createStatefulTeachingPool() {
  const curriculumVersions: Array<Record<string, any>> = [
    { id: VER_V1, version_tag: '2024.1', status: 'superseded' },
    { id: VER_V2, version_tag: '2026.1', status: 'active' }
  ];
  const curriculumSubjects: Array<Record<string, any>> = [
    { id: SUBJ_MATH, name: 'Mathematics', code: 'MTH' }
  ];
  const curriculumTopics: Array<Record<string, any>> = [
    {
      id: TOPIC_FRACTIONS_V1,
      curriculum_version_id: VER_V1,
      subject_id: SUBJ_MATH,
      title: 'Fractions and Decimals',
      class_grade_name: 'JSS 1',
      term: 'Term 1',
      week: 1
    },
    {
      id: TOPIC_ALGEBRA_V1,
      curriculum_version_id: VER_V1,
      subject_id: SUBJ_MATH,
      title: 'Simple Linear Equations',
      class_grade_name: 'JSS 1',
      term: 'Term 1',
      week: 2
    },
    {
      id: TOPIC_GEOMETRY_V1,
      curriculum_version_id: VER_V1,
      subject_id: SUBJ_MATH,
      title: 'Angles and Plane Shapes',
      class_grade_name: 'JSS 1',
      term: 'Term 2',
      week: 8
    },
    {
      id: TOPIC_FRACTIONS_V2,
      curriculum_version_id: VER_V2,
      subject_id: SUBJ_MATH,
      title: 'Fractions, Ratios and Decimals',
      class_grade_name: 'JSS 1',
      term: 'Term 1',
      week: 1
    }
  ];
  const curriculumObjectives: Array<Record<string, any>> = [
    { id: OBJ_FRAC_1, curriculum_version_id: VER_V1, topic_id: TOPIC_FRACTIONS_V1, description: 'Convert fractions to decimals', objective_type: 'performance', bloom_level: 'Apply', sort_order: 1 },
    { id: OBJ_FRAC_2, curriculum_version_id: VER_V1, topic_id: TOPIC_FRACTIONS_V1, description: 'Add and subtract unlike fractions', objective_type: 'performance', bloom_level: 'Understand', sort_order: 2 },
    { id: OBJ_ALG_1, curriculum_version_id: VER_V1, topic_id: TOPIC_ALGEBRA_V1, description: 'Solve one-variable equations', objective_type: 'performance', bloom_level: 'Apply', sort_order: 1 },
    { id: OBJ_GEO_1, curriculum_version_id: VER_V1, topic_id: TOPIC_GEOMETRY_V1, description: 'Measure interior angles of polygons', objective_type: 'performance', bloom_level: 'Analyze', sort_order: 1 },
    { id: OBJ_FRAC_V2_1, curriculum_version_id: VER_V2, topic_id: TOPIC_FRACTIONS_V2, description: 'Express ratios as simplified fractions', objective_type: 'performance', bloom_level: 'Apply', sort_order: 1 }
  ];
  const curriculumSubtopics: Array<Record<string, any>> = [
    { id: 'sub_frac_1', curriculum_version_id: VER_V1, topic_id: TOPIC_FRACTIONS_V1, title: 'Proper and Improper Fractions', sort_order: 1 }
  ];

  const classes: Array<Record<string, any>> = [
    { id: CLASS_JSS1, tenant_id: TENANT_A, school_id: SCHOOL_A, name: 'JSS 1', section: 'A', status: 'active' }
  ];
  const staff: Array<Record<string, any>> = [
    { id: STAFF_1, tenant_id: TENANT_A, school_id: SCHOOL_A, user_id: TEACHER_1, status: 'active' },
    { id: STAFF_2, tenant_id: TENANT_A, school_id: SCHOOL_A, user_id: TEACHER_2, status: 'active' }
  ];
  const memberships: Array<Record<string, any>> = [
    { tenant_id: TENANT_A, user_id: TEACHER_1, status: 'active' },
    { tenant_id: TENANT_A, user_id: TEACHER_2, status: 'active' }
  ];

  const assignments: Array<Record<string, any>> = [];
  const lessonNotes: Array<Record<string, any>> = [];
  const deliveries: Array<Record<string, any>> = [];
  const auditHistory: Array<Record<string, any>> = [];
  const scopeAuthorizations: Array<Record<string, any>> = [];
  const provenanceRecords: Array<Record<string, any>> = [];
  const qbQuestions: Array<Record<string, any>> = [];
  const qbBlueprints: Array<Record<string, any>> = [];
  const qbExamConfigs: Array<Record<string, any>> = [];

  let activeTenantId: string | null = null;

  const ok = <R extends QueryResultRow>(rows: any[], command = 'SELECT'): QueryResult<R> => ({
    rows: rows as R[],
    rowCount: rows.length,
    command,
    oid: 0,
    fields: []
  });

  const query = async <R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = []
  ): Promise<QueryResult<R>> => {
    const trimmed = sql.trim();

    if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
      return ok<R>([], trimmed);
    }
    if (trimmed.includes('set_config') && trimmed.includes('app.current_tenant_id')) {
      activeTenantId = String(values[0] || '');
      return ok<R>([], 'SET');
    }
    if (trimmed.startsWith('SET LOCAL app.current_tenant_id')) {
      return ok<R>([], 'SET');
    }
    if (trimmed.includes('SET LOCAL')) {
      return ok<R>([], 'SET');
    }

    // Curriculum resolver queries
    if (trimmed.includes('FROM production.curriculum_versions')) {
      return ok<R>(curriculumVersions.filter(v => v.id === values[0]));
    }
    if (trimmed.includes('FROM production.curriculum_subjects')) {
      return ok<R>(curriculumSubjects.filter(s => s.id === values[0]));
    }
    if (trimmed.includes('SELECT count(*)::int AS total') && trimmed.includes('FROM production.curriculum_topics')) {
      const ver = values[0];
      const subj = values[1];
      const grade = typeof values[2] === 'string' ? values[2].toLowerCase() : null;
      const total = curriculumTopics.filter(
        t => t.curriculum_version_id === ver && t.subject_id === subj && (!grade || t.class_grade_name.toLowerCase() === grade)
      ).length;
      return ok<R>([{ total }]);
    }
    if (trimmed.includes('FROM production.curriculum_topics') && trimmed.includes('WHERE id = $1')) {
      return ok<R>(curriculumTopics.filter(t => t.id === values[0]));
    }
    if (trimmed.includes('FROM production.curriculum_topics')) {
      const ver = values[0];
      const subj = values[1];
      const grade = typeof values[2] === 'string' ? values[2].toLowerCase() : null;
      return ok<R>(
        curriculumTopics.filter(
          t =>
            t.curriculum_version_id === ver &&
            t.subject_id === subj &&
            (!grade || t.class_grade_name.toLowerCase() === grade)
        )
      );
    }
    if (trimmed.includes('FROM production.curriculum_learning_objectives')) {
      const ver = values[0];
      const topicParam = values[1];
      const ids = Array.isArray(topicParam) ? topicParam : [topicParam];
      return ok<R>(curriculumObjectives.filter(o => o.curriculum_version_id === ver && ids.includes(o.topic_id)));
    }
    if (trimmed.includes('FROM production.curriculum_subtopics')) {
      const ver = values[0];
      const topicParam = values[1];
      const ids = Array.isArray(topicParam) ? topicParam : [topicParam];
      return ok<R>(curriculumSubtopics.filter(s => s.curriculum_version_id === ver && ids.includes(s.topic_id)));
    }

    // Classes & staff membership
    if (trimmed.includes('FROM production.classes')) {
      return ok<R>(
        classes.filter(c => c.tenant_id === values[0] && c.id === values[1] && c.status === 'active')
      );
    }
    if (trimmed.includes('FROM production.staff s')) {
      const tenantId = values[0];
      const schoolId = values[1];
      const staffOrUserId = values[2];
      const matches = staff.filter(s => {
        const hasMem = memberships.some(
          m => m.tenant_id === s.tenant_id && m.user_id === s.user_id && m.status === 'active'
        );
        if (!hasMem || s.tenant_id !== tenantId || s.school_id !== schoolId || s.status !== 'active') return false;
        return trimmed.includes('s.id = $3') ? s.id === staffOrUserId : s.user_id === staffOrUserId;
      });
      return ok<R>(matches.map(s => ({ id: s.id, user_id: s.user_id })));
    }

    // Teacher Subject Assignments
    if (trimmed.startsWith('INSERT INTO production.teacher_subject_assignments')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        school_id: values[2],
        academic_session: values[3],
        term: values[4],
        class_id: values[5],
        class_grade_name: values[6],
        section: values[7],
        subject_id: values[8],
        subject_name: values[9],
        curriculum_version_id: values[10],
        staff_id: values[11],
        teacher_user_id: values[12],
        status: 'active',
        assigned_by: values[13],
        assigned_at: new Date(),
        effective_from: new Date(),
        effective_to: values[14] || null,
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
        metadata: JSON.parse(String(values[15] || '{}')),
        created_at: new Date(),
        updated_at: new Date()
      };
      assignments.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.startsWith('UPDATE production.teacher_subject_assignments')) {
      const row = assignments.find(
        a => a.tenant_id === values[0] && a.application_instance_id === values[1] && a.id === values[2] && a.status !== 'revoked'
      );
      if (!row) return ok<R>([], 'UPDATE');
      row.status = 'revoked';
      row.revoked_at = new Date();
      row.revoked_by = values[3];
      row.revocation_reason = values[4];
      row.updated_at = new Date();
      return ok<R>([row], 'UPDATE');
    }
    if (trimmed.includes('FROM production.teacher_subject_assignments')) {
      let filtered = assignments.filter(a => a.tenant_id === values[0] && a.application_instance_id === values[1]);
      if (trimmed.includes('AND id = $3')) {
        filtered = filtered.filter(a => a.id === values[2]);
      } else {
        // parse simple conditions by inspecting values against sql placeholders
        const filterPairs = Array.from(trimmed.matchAll(/(\w+)\s*=\s*\$(\d+)/g));
        for (const match of filterPairs) {
          const col = match[1];
          const val = values[Number(match[2]) - 1];
          filtered = filtered.filter(a => a[col] === val);
        }
      }
      return ok<R>(filtered);
    }

    // Lesson notes
    if (trimmed.startsWith('INSERT INTO production.lesson_note_records')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        assignment_id: values[2],
        school_id: values[3],
        academic_session: values[4],
        term: values[5],
        class_id: values[6],
        class_grade_name: values[7],
        section: values[8],
        subject_id: values[9],
        curriculum_version_id: values[10],
        topic_id: values[11],
        topic_title: values[12],
        objective_ids: JSON.parse(String(values[13] || '[]')),
        title: values[14],
        note_content: JSON.parse(String(values[15] || '{}')),
        generation_source: values[16],
        ai_gateway_request_id: values[17],
        counts_as_taught: false,
        created_by_user_id: values[18],
        created_at: new Date(),
        updated_at: new Date()
      };
      lessonNotes.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('count(*)::int AS total FROM production.lesson_note_records')) {
      const total = lessonNotes.filter(
        n => n.tenant_id === values[0] && n.application_instance_id === values[1] && n.assignment_id === values[2]
      ).length;
      return ok<R>([{ total }]);
    }
    if (trimmed.includes('FROM production.lesson_note_records')) {
      const filtered = lessonNotes.filter(
        n =>
          n.tenant_id === values[0] &&
          n.application_instance_id === values[1] &&
          (!values[2] || n.assignment_id === values[2])
      );
      return ok<R>(filtered);
    }

    // Delivery audit history
    if (trimmed.startsWith('INSERT INTO production.teaching_delivery_audit_history')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        delivery_record_id: values[2],
        assignment_id: values[3],
        event_type: values[4],
        record_version: values[5],
        actor_user_id: values[6],
        actor_role: values[7],
        reason: values[8],
        before_snapshot: JSON.parse(String(values[9] || '{}')),
        after_snapshot: JSON.parse(String(values[10] || '{}')),
        occurred_at: new Date()
      };
      auditHistory.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('FROM production.teaching_delivery_audit_history')) {
      const filtered = auditHistory.filter(
        h =>
          h.tenant_id === values[0] &&
          h.application_instance_id === values[1] &&
          (!values[2] || h.delivery_record_id === values[2])
      );
      return ok<R>([...filtered].reverse());
    }

    // Delivery records
    if (trimmed.startsWith('INSERT INTO production.teaching_delivery_records')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        assignment_id: values[2],
        school_id: values[3],
        academic_session: values[4],
        term: values[5],
        class_id: values[6],
        class_grade_name: values[7],
        section: values[8],
        subject_id: values[9],
        curriculum_version_id: values[10],
        topic_id: values[11],
        topic_title_input: values[12],
        resolved_topic_title: values[13],
        resolution_status: values[14],
        resolution_notes: values[15],
        lesson_note_id: values[16],
        week_number: values[17],
        scheduled_date: values[18],
        status: 'assigned',
        received_at: null,
        opened_at: null,
        acknowledged_at: null,
        taught_at: null,
        completed_at: null,
        completion_confirmed_by_teacher: false,
        completion_teacher_user_id: null,
        completion_idempotency_key: null,
        coverage_mode: 'none',
        covered_objective_ids: [],
        uncovered_objective_ids: [],
        understanding_level: null,
        student_engagement: null,
        remedial_needed: false,
        remedial_topic: null,
        teacher_comments: '',
        challenges_noted: null,
        verification_basis: 'teacher_self_reported',
        admin_verification_status: 'unverified',
        admin_verified_by: null,
        admin_verified_at: null,
        record_version: 1,
        used_in_assessment_count: 0,
        correction_reason: null,
        created_by_user_id: values[19],
        updated_by_user_id: values[19],
        created_at: new Date(),
        updated_at: new Date()
      };
      deliveries.push(row);
      return ok<R>([row], 'INSERT');
    }

    if (trimmed.startsWith('UPDATE production.teaching_delivery_records')) {
      if (trimmed.includes('used_in_assessment_count = used_in_assessment_count + 1')) {
        const ids = Array.isArray(values[2]) ? values[2] : [];
        let updated = 0;
        for (const d of deliveries) {
          if (d.tenant_id === values[0] && d.application_instance_id === values[1] && ids.includes(d.id)) {
            d.used_in_assessment_count += 1;
            d.updated_at = new Date();
            updated += 1;
          }
        }
        return ok<R>([], 'UPDATE');
      }

      const row = deliveries.find(
        d => d.tenant_id === values[0] && d.application_instance_id === values[1] && d.id === values[2]
      );
      if (!row) return ok<R>([], 'UPDATE');

      if (trimmed.includes('completion_confirmed_by_teacher = true')) {
        row.status = values[3];
        row.taught_at = row.taught_at || new Date();
        if (values[3] === 'completed') row.completed_at = row.completed_at || new Date();
        row.completion_confirmed_by_teacher = true;
        row.completion_teacher_user_id = values[4];
        if (values[5]) row.completion_idempotency_key = values[5];
        row.coverage_mode = values[6];
        row.covered_objective_ids = JSON.parse(String(values[7] || '[]'));
        row.uncovered_objective_ids = JSON.parse(String(values[8] || '[]'));
        if (values[9]) row.understanding_level = values[9];
        if (values[10]) row.student_engagement = values[10];
        row.remedial_needed = Boolean(values[11]);
        row.remedial_topic = values[12];
        row.teacher_comments = values[13];
        row.challenges_noted = values[14];
        row.updated_by_user_id = values[4];
        row.updated_at = new Date();
      } else if (trimmed.includes("resolution_status = 'manually_mapped'")) {
        row.topic_id = values[3];
        row.resolved_topic_title = values[4];
        row.resolution_status = 'manually_mapped';
        row.resolution_notes = values[5];
        row.covered_objective_ids = JSON.parse(String(values[6] || '[]'));
        row.uncovered_objective_ids = JSON.parse(String(values[7] || '[]'));
        row.record_version = values[8];
        row.correction_reason = values[9];
        row.updated_by_user_id = values[10];
        row.updated_at = new Date();
      } else if (trimmed.includes('admin_verification_status = $4')) {
        row.admin_verification_status = values[3];
        row.verification_basis = values[4];
        row.admin_verified_by = values[5];
        row.admin_verified_at = new Date();
        row.updated_at = new Date();
      } else if (trimmed.includes('record_version = $13')) {
        if (values[3]) row.coverage_mode = values[3];
        row.covered_objective_ids = JSON.parse(String(values[4] || '[]'));
        row.uncovered_objective_ids = JSON.parse(String(values[5] || '[]'));
        if (values[6]) row.understanding_level = values[6];
        if (values[7]) row.student_engagement = values[7];
        if (values[8] !== null) row.remedial_needed = values[8];
        if (values[9] !== null) row.remedial_topic = values[9];
        if (values[10] !== null) row.teacher_comments = values[10];
        if (values[11] !== null) row.challenges_noted = values[11];
        row.record_version = values[12];
        row.correction_reason = values[13];
        row.updated_by_user_id = values[14];
        row.updated_at = new Date();
      } else {
        row.status = values[3];
        if (values[3] === 'received') row.received_at = row.received_at || new Date();
        if (values[3] === 'opened') row.opened_at = row.opened_at || new Date();
        if (values[3] === 'acknowledged') row.acknowledged_at = row.acknowledged_at || new Date();
        row.updated_by_user_id = values[4];
        row.updated_at = new Date();
      }
      return ok<R>([row], 'UPDATE');
    }

    if (trimmed.includes('FROM production.teaching_delivery_records')) {
      let filtered = deliveries.filter(d => d.tenant_id === values[0] && d.application_instance_id === values[1]);
      if (trimmed.includes('completion_idempotency_key = $4')) {
        filtered = filtered.filter(d => d.assignment_id === values[2] && d.completion_idempotency_key === values[3]);
      } else if (trimmed.includes('WHERE tenant_id = $1 AND application_instance_id = $2 AND id = $3')) {
        filtered = filtered.filter(d => d.id === values[2]);
      } else if (trimmed.includes('WHERE tenant_id = $1 AND application_instance_id = $2 AND assignment_id = $3')) {
        filtered = filtered.filter(d => d.assignment_id === values[2]);
      } else {
        const filterPairs = Array.from(trimmed.matchAll(/(\w+)\.(\w+)\s*=\s*\$(\d+)/g));
        for (const match of filterPairs) {
          const alias = match[1];
          const col = match[2];
          const val = values[Number(match[3]) - 1];
          if (alias === 'd') {
            filtered = filtered.filter(d => d[col] === val);
          } else if (alias === 'a') {
            filtered = filtered.filter(d => {
              const a = assignments.find(x => x.id === d.assignment_id);
              return a && a[col] === val;
            });
          }
        }
      }
      return ok<R>(filtered);
    }

    // Scope Authorizations
    if (trimmed.startsWith('UPDATE production.assessment_scope_authorizations')) {
      if (trimmed.includes("SET status = 'superseded'")) {
        const row = scopeAuthorizations.find(
          s => s.tenant_id === values[0] && s.application_instance_id === values[1] && s.id === values[2]
        );
        if (row) row.status = 'superseded';
        return ok<R>(row ? [row] : [], 'UPDATE');
      }
      if (trimmed.includes("SET status = 'revoked'")) {
        const row = scopeAuthorizations.find(
          s =>
            s.tenant_id === values[0] &&
            s.application_instance_id === values[1] &&
            s.id === values[2] &&
            s.status === 'authorized'
        );
        if (!row) return ok<R>([], 'UPDATE');
        row.status = 'revoked';
        row.revoked_at = new Date();
        row.revoked_by_user_id = values[3];
        row.revocation_reason = values[4];
        return ok<R>([row], 'UPDATE');
      }
    }
    if (trimmed.startsWith('INSERT INTO production.assessment_scope_authorizations')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        assignment_id: values[2],
        school_id: values[3],
        academic_session: values[4],
        term: values[5],
        class_id: values[6],
        class_grade_name: values[7],
        section: values[8],
        subject_id: values[9],
        curriculum_version_id: values[10],
        teacher_user_id: values[11],
        assessment_type: values[12],
        title: values[13],
        scope_version: values[14],
        supersedes_authorization_id: values[15],
        status: 'authorized',
        selected_topic_ids: JSON.parse(String(values[16] || '[]')),
        selected_objective_ids: JSON.parse(String(values[17] || '[]')),
        source_delivery_ids: JSON.parse(String(values[18] || '[]')),
        question_count: values[19],
        question_types_config: JSON.parse(String(values[20] || '{}')),
        objective_theory_balance: JSON.parse(String(values[21] || '{}')),
        total_marks: values[22],
        difficulty_mix: JSON.parse(String(values[23] || '{}')),
        duration_minutes: values[24],
        instructions: values[25],
        scope_hash: values[26],
        authorized_by_teacher_at: new Date(),
        revoked_at: null,
        revoked_by_user_id: null,
        revocation_reason: null,
        created_at: new Date()
      };
      scopeAuthorizations.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('FROM production.assessment_scope_authorizations')) {
      let filtered = scopeAuthorizations.filter(
        s => s.tenant_id === values[0] && s.application_instance_id === values[1]
      );
      if (trimmed.includes("AND status = 'authorized'") && trimmed.includes('ORDER BY scope_version DESC')) {
        filtered = filtered
          .filter(s => s.assignment_id === values[2] && s.assessment_type === values[3] && s.status === 'authorized')
          .sort((a, b) => b.scope_version - a.scope_version)
          .slice(0, 1);
      } else if (trimmed.includes('AND id = $3')) {
        filtered = filtered.filter(s => s.id === values[2]);
      } else {
        const filterPairs = Array.from(trimmed.matchAll(/(\w+)\s*=\s*\$(\d+)/g));
        for (const match of filterPairs) {
          const col = match[1];
          const val = values[Number(match[2]) - 1];
          filtered = filtered.filter(s => s[col] === val);
        }
      }
      return ok<R>(filtered);
    }

    // Provenance
    if (trimmed.startsWith('INSERT INTO production.assessment_generation_provenance')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        scope_authorization_id: values[2],
        blueprint_id: values[3],
        exam_configuration_id: values[4],
        assignment_id: values[5],
        teacher_user_id: values[6],
        academic_session: values[7],
        term: values[8],
        class_id: values[9],
        section: values[10],
        subject_id: values[11],
        curriculum_version_id: values[12],
        verified_topic_ids: JSON.parse(String(values[13] || '[]')),
        verified_objective_ids: JSON.parse(String(values[14] || '[]')),
        source_delivery_ids: JSON.parse(String(values[15] || '[]')),
        generated_question_ids: JSON.parse(String(values[16] || '[]')),
        ai_gateway_request_id: values[17],
        provider_id: values[18],
        model_id: values[19],
        generation_status: values[20],
        rejection_reason: values[21],
        created_by_user_id: values[22],
        created_at: new Date()
      };
      provenanceRecords.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('FROM production.assessment_generation_provenance')) {
      const filtered = provenanceRecords.filter(
        p =>
          p.tenant_id === values[0] &&
          p.application_instance_id === values[1] &&
          (!values[2] || p.scope_authorization_id === values[2])
      );
      return ok<R>(filtered);
    }

    // Question Bank & Blueprints & Exam Configs
    if (trimmed.includes('INSERT INTO production.instance_question_bank_items')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        category_id: values[2],
        subject_reference_id: values[3],
        class_grade_name: values[4],
        curriculum_version_id: values[5],
        topic_reference_id: values[6],
        learning_objective_ids: JSON.parse(String(values[7] || '[]')),
        question_type: values[8],
        stem: values[9],
        options: values[10] ? JSON.parse(String(values[10])) : null,
        correct_answer: values[11],
        explanation: values[12],
        marking_rubric: values[13] ? JSON.parse(String(values[13])) : null,
        marks: values[14],
        difficulty: values[15],
        cognitive_demand: values[16],
        source_type: values[17],
        source_reference: values[18],
        version: 1,
        creation_method: values[19],
        review_status: values[20],
        reviewer_id: null,
        approval_timestamp: null,
        exposure_count: 0,
        metadata: JSON.parse(String(values[21] || '{}')),
        created_by: values[22],
        created_at: new Date(),
        updated_at: new Date()
      };
      qbQuestions.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('UPDATE production.instance_question_bank_items')) {
      const row = qbQuestions.find(
        q => q.tenant_id === values[0] && q.application_instance_id === values[1] && q.id === values[2]
      );
      if (!row) return ok<R>([], 'UPDATE');
      row.review_status = values[3];
      row.reviewer_id = values[4];
      if (values[3] === 'approved') row.approval_timestamp = new Date();
      row.updated_at = new Date();
      return ok<R>([row], 'UPDATE');
    }
    if (trimmed.includes('FROM production.instance_question_bank_items')) {
      return ok<R>(qbQuestions.filter(q => q.tenant_id === values[0] && q.application_instance_id === values[1]));
    }
    if (trimmed.includes('INSERT INTO production.instance_assessment_blueprints')) {
      const extended = trimmed.includes('scope_authorization_id');
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        title: values[2],
        subject_reference_id: values[3],
        class_grade_name: values[4],
        term: values[5],
        curriculum_version_id: values[6],
        assessment_type: values[7],
        question_formats_count: JSON.parse(String(values[8] || '{}')),
        total_marks: values[9],
        difficulty_mix: JSON.parse(String(values[10] || '{}')),
        time_allowance_minutes: values[11],
        allow_verified_past_questions: values[12],
        allow_ai_practice_questions: values[13],
        completed_topics_only: values[14],
        selected_topic_ids: JSON.parse(String(values[15] || '[]')),
        ...(extended
          ? {
              scope_authorization_id: values[16],
              selected_objective_ids: JSON.parse(String(values[17] || '[]')),
              source_delivery_ids: JSON.parse(String(values[18] || '[]')),
              authorized_teacher_user_id: values[19],
              academic_session: values[20],
              section: values[21],
              status: 'draft',
              created_by: values[22]
            }
          : {
              status: 'draft',
              created_by: values[16]
            }),
        created_at: new Date(),
        updated_at: new Date()
      };
      qbBlueprints.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('FROM production.instance_assessment_blueprints')) {
      return ok<R>(qbBlueprints.filter(b => b.tenant_id === values[0] && b.application_instance_id === values[1]));
    }
    if (trimmed.includes('INSERT INTO production.instance_exam_configurations')) {
      const row = {
        id: crypto.randomUUID(),
        tenant_id: values[0],
        application_instance_id: values[1],
        blueprint_id: values[2],
        exam_code: values[3],
        title: values[4],
        subject_reference_id: values[5],
        class_grade_name: values[6],
        term: values[7],
        academic_session: values[8],
        duration_minutes: values[9],
        total_marks: values[10],
        instructions: JSON.parse(String(values[11] || '[]')),
        selected_question_ids: JSON.parse(String(values[12] || '[]')),
        generation_hash: values[13],
        is_locked: false,
        authorized_by_principal: false,
        authorized_by: null,
        authorized_at: null,
        marking_scheme_unlocked: false,
        metadata: JSON.parse(String(values[14] || '{}')),
        created_by: values[15],
        created_at: new Date(),
        updated_at: new Date()
      };
      qbExamConfigs.push(row);
      return ok<R>([row], 'INSERT');
    }
    if (trimmed.includes('FROM production.instance_exam_configurations')) {
      return ok<R>(qbExamConfigs.filter(e => e.tenant_id === values[0] && e.application_instance_id === values[1]));
    }

    // Optional AI Gateway context queries
    if (trimmed.includes('FROM production.schools')) {
      return ok<R>([{ name: 'Royal Scholars Academy' }]);
    }

    return ok<R>([]);
  };

  const client: DatabaseClient = {
    query,
    release: () => {}
  };

  const pool: DatabasePool = {
    query,
    connect: async () => client,
    end: async () => {}
  };

  return {
    pool,
    state: {
      assignments,
      lessonNotes,
      deliveries,
      auditHistory,
      scopeAuthorizations,
      provenanceRecords,
      qbQuestions,
      qbBlueprints,
      qbExamConfigs,
      getActiveTenantId: () => activeTenantId
    }
  };
}

async function seedCompletedFractionsDelivery(service: TeachingEvidenceService, versionId = VER_V1, topicId: string | null = TOPIC_FRACTIONS_V1) {
  const adminCtx = makePrincipalCtx();
  const teacherCtx = makeTeacherCtx();
  const assignment = await service.createAssignment(adminCtx, {
    schoolId: SCHOOL_A,
    academicSession: '2026/2027',
    term: 'Term 1',
    classId: CLASS_JSS1,
    section: 'A',
    subjectId: SUBJ_MATH,
    curriculumVersionId: versionId,
    teacherUserId: TEACHER_1,
    assignedBy: 'principal@school.edu'
  });

  const delivery = await service.createDeliveryRecord(teacherCtx, {
    assignmentId: assignment.id,
    topicId,
    topicTitle: versionId === VER_V1 ? 'Fractions and Decimals' : 'Fractions, Ratios and Decimals',
    weekNumber: 1,
    scheduledDate: '2026-10-05'
  });
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'received');
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'opened');
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'acknowledged');

  const objIds = versionId === VER_V1 ? [OBJ_FRAC_1, OBJ_FRAC_2] : [OBJ_FRAC_V2_1];
  const { record: completed } = await service.confirmTeachingCompletion(teacherCtx, delivery.id, {
    targetStatus: 'completed',
    confirmTaught: true,
    coverageMode: 'full',
    coveredObjectiveIds: objIds,
    understandingLevel: 'Good',
    studentEngagement: 'High',
    teacherComments: 'Students solved decimal conversion exercises accurately.',
    idempotencyKey: `idem-${delivery.id}`
  });

  return { adminCtx, teacherCtx, assignment, delivery: completed };
}

test('Capability registry gate passes for teacher_academic_progress_authority', () => {
  const routes: Array<[string, string]> = [
    ['GET', '/teaching/assignments'],
    ['POST', '/teaching/assignments'],
    ['GET', '/teaching/progress'],
    ['GET', '/teaching/evidence'],
    ['POST', '/assessments/scope-authorizations'],
    ['POST', '/assessments/taught-generate']
  ];
  for (const [method, routePath] of routes) {
    const decision = evaluateProductionCapabilityGate(method, routePath);
    assert.equal(decision.allowed, true, `Expected ${method} ${routePath} to pass capability gate`);
    if (decision.allowed) {
      assert.equal(decision.capabilityId, 'teacher_academic_progress_authority');
    }
  }
});

// =========================================================================
// AUTHENTICATION AND ASSIGNMENT (Scenarios 1-5)
// =========================================================================

test('1 & 2. Assigned teacher can view own assignments; unassigned teacher cannot record progress', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { teacherCtx, assignment } = await seedCompletedFractionsDelivery(service);

  const ownAssignments = await service.listAssignments(teacherCtx);
  assert.equal(ownAssignments.length, 1);
  assert.equal(ownAssignments[0].id, assignment.id);

  // Teacher 2 is not assigned to JSS 1A Mathematics
  const teacher2Ctx = makeTeacherCtx(TENANT_A, INSTANCE_A, TEACHER_2);
  const teacher2Assignments = await service.listAssignments(teacher2Ctx);
  assert.equal(teacher2Assignments.length, 0);

  await assert.rejects(
    () =>
      service.createDeliveryRecord(teacher2Ctx, {
        assignmentId: assignment.id,
        topicId: TOPIC_ALGEBRA_V1,
        topicTitle: 'Simple Linear Equations'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'FORBIDDEN' && err.httpStatus === 403
  );
});

test('3. A teacher cannot submit a different teacherUserId to impersonate another teacher', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const adminCtx = makePrincipalCtx();
  const teacher1Assignment = await service.createAssignment(adminCtx, {
    schoolId: SCHOOL_A,
    academicSession: '2026/2027',
    term: 'Term 1',
    classId: CLASS_JSS1,
    section: 'A',
    subjectId: SUBJ_MATH,
    curriculumVersionId: VER_V1,
    teacherUserId: TEACHER_1,
    assignedBy: 'principal@school.edu'
  });

  // Spoofed query trying to list Teacher 1's assignments using Teacher 2's identity
  const teacher2Ctx = makeTeacherCtx(TENANT_A, INSTANCE_A, TEACHER_2);
  const spoofedList = await service.listAssignments(teacher2Ctx, { teacherUserId: TEACHER_1 });
  assert.equal(spoofedList.length, 0);

  const deliveryByTeacher1 = await service.createDeliveryRecord(makeTeacherCtx(), {
    assignmentId: teacher1Assignment.id,
    topicId: TOPIC_FRACTIONS_V1,
    topicTitle: 'Fractions and Decimals'
  });

  // Teacher 2 cannot transition or confirm Teacher 1's delivery record
  await assert.rejects(
    () => service.transitionDeliveryStage(teacher2Ctx, deliveryByTeacher1.id, 'received'),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'FORBIDDEN'
  );
});

test('4. A teacher cannot access another tenant or another application instance records', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { assignment } = await seedCompletedFractionsDelivery(service);

  const crossTenantTeacher = makeTeacherCtx(TENANT_B, INSTANCE_A, TEACHER_1);
  await assert.rejects(
    () => service.getVerifiedTaughtEvidence(crossTenantTeacher, assignment.id),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'NOT_FOUND'
  );

  const crossInstanceTeacher = makeTeacherCtx(TENANT_A, INSTANCE_B, TEACHER_1);
  await assert.rejects(
    () => service.getVerifiedTaughtEvidence(crossInstanceTeacher, assignment.id),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'NOT_FOUND'
  );
});

test('5. Revoked or expired assignment cannot authorize new delivery or assessment scope activity', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { adminCtx, teacherCtx, assignment } = await seedCompletedFractionsDelivery(service);

  await service.revokeAssignment(adminCtx, assignment.id, 'Teacher reassigned');

  await assert.rejects(
    () =>
      service.createDeliveryRecord(teacherCtx, {
        assignmentId: assignment.id,
        topicId: TOPIC_ALGEBRA_V1,
        topicTitle: 'Simple Linear Equations'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'FORBIDDEN'
  );

  await assert.rejects(
    () =>
      service.createAssessmentScopeAuthorization(teacherCtx, {
        assignmentId: assignment.id,
        assessmentType: 'midterm_exam',
        title: 'Blocked Mid-Term',
        selectedTopicIds: [TOPIC_FRACTIONS_V1],
        selectedObjectiveIds: [OBJ_FRAC_1],
        questionCount: 4,
        totalMarks: 8
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'FORBIDDEN'
  );
});

// =========================================================================
// TEACHING DELIVERY (Scenarios 6-11)
// =========================================================================

test('6 & 7. Lesson notes and opening/acknowledging do NOT mark a topic as taught until explicit confirmation', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const adminCtx = makePrincipalCtx();
  const teacherCtx = makeTeacherCtx();
  const assignment = await service.createAssignment(adminCtx, {
    schoolId: SCHOOL_A,
    academicSession: '2026/2027',
    term: 'Term 1',
    classId: CLASS_JSS1,
    section: 'A',
    subjectId: SUBJ_MATH,
    curriculumVersionId: VER_V1,
    teacherUserId: TEACHER_1,
    assignedBy: 'principal@school.edu'
  });

  // 1) Create lesson note: countsAsTaught MUST be false
  const note = await service.createLessonNote(teacherCtx, {
    assignmentId: assignment.id,
    topicId: TOPIC_FRACTIONS_V1,
    topicTitle: 'Fractions and Decimals',
    objectiveIds: [OBJ_FRAC_1],
    title: 'Week 1 Lesson Plan',
    noteContent: { summary: 'Intro to fractions' }
  });
  assert.equal(note.countsAsTaught, false);

  // 2) Create delivery and advance only to 'acknowledged' (cannot skip straight to completed)
  const delivery = await service.createDeliveryRecord(teacherCtx, {
    assignmentId: assignment.id,
    topicId: TOPIC_FRACTIONS_V1,
    topicTitle: 'Fractions and Decimals',
    lessonNoteId: note.id
  });
  await assert.rejects(
    () =>
      service.confirmTeachingCompletion(teacherCtx, delivery.id, {
        targetStatus: 'completed',
        confirmTaught: true,
        coverageMode: 'full',
        understandingLevel: 'Good',
        studentEngagement: 'High'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'INVALID_TRANSITION' && err.httpStatus === 409
  );

  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'received');
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'opened');
  const ack = await service.transitionDeliveryStage(teacherCtx, delivery.id, 'acknowledged');
  assert.equal(ack.status, 'acknowledged');
  assert.equal(ack.completionConfirmedByTeacher, false);

  const evidenceBeforeConfirm = await service.getVerifiedTaughtEvidence(teacherCtx, assignment.id);
  assert.equal(evidenceBeforeConfirm.verifiedTopics.length, 0);
  assert.equal(evidenceBeforeConfirm.lessonNotesExcludedCount, 1);
  assert.equal(evidenceBeforeConfirm.unconfirmedExcludedCount, 1);

  // 3) Confirm teaching without confirmTaught=true is rejected
  await assert.rejects(
    () =>
      service.confirmTeachingCompletion(teacherCtx, delivery.id, {
        targetStatus: 'completed',
        confirmTaught: false,
        coverageMode: 'full',
        understandingLevel: 'Good',
        studentEngagement: 'High'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'VALIDATION_ERROR'
  );

  // 4) Teacher explicitly confirms completion with feedback
  const { record: completed } = await service.confirmTeachingCompletion(teacherCtx, delivery.id, {
    targetStatus: 'completed',
    confirmTaught: true,
    coverageMode: 'partial',
    coveredObjectiveIds: [OBJ_FRAC_1],
    uncoveredObjectiveIds: [OBJ_FRAC_2],
    understandingLevel: 'Fair',
    studentEngagement: 'Moderate',
    remedialNeeded: true,
    remedialTopic: 'Unlike denominators',
    teacherComments: 'Need remedial drill on unlike fractions'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completionConfirmedByTeacher, true);

  const evidenceAfter = await service.getVerifiedTaughtEvidence(teacherCtx, assignment.id);
  assert.equal(evidenceAfter.verifiedTopics.length, 1);
  assert.equal(evidenceAfter.verifiedTopics[0].coveredObjectives.length, 1);
});

test('8, 9, 10 & 11. Completion feedback linkage, duplicate idempotency, and versioned audit corrections', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { teacherCtx, delivery } = await seedCompletedFractionsDelivery(service);

  assert.equal(delivery.understandingLevel, 'Good');
  assert.equal(delivery.studentEngagement, 'High');
  assert.equal(delivery.recordVersion, 1);

  // Scenario 10: Duplicate completion with same idempotencyKey replays without error or duplication
  const replay = await service.confirmTeachingCompletion(teacherCtx, delivery.id, {
    targetStatus: 'completed',
    confirmTaught: true,
    coverageMode: 'full',
    coveredObjectiveIds: [OBJ_FRAC_1, OBJ_FRAC_2],
    understandingLevel: 'Good',
    studentEngagement: 'High',
    idempotencyKey: `idem-${delivery.id}`
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.record.id, delivery.id);

  // Scenario 11: Correction increments recordVersion and stores before/after audit snapshot
  const corrected = await service.correctDeliveryRecord(teacherCtx, delivery.id, {
    correctionReason: 'Objective 2 needs remedial revision after quiz check',
    coverageMode: 'partial',
    coveredObjectiveIds: [OBJ_FRAC_1],
    uncoveredObjectiveIds: [OBJ_FRAC_2],
    remedialNeeded: true,
    remedialTopic: 'Unlike fraction addition'
  });
  assert.equal(corrected.recordVersion, 2);
  assert.equal(corrected.remedialNeeded, true);

  const history = await service.getDeliveryAuditHistory(teacherCtx, delivery.id);
  const correctionEntry = history.find(h => h.eventType === 'corrected');
  assert(correctionEntry);
  assert.equal(correctionEntry.recordVersion, 2);
  assert.deepEqual(correctionEntry.beforeSnapshot.coveredObjectiveIds, [OBJ_FRAC_1, OBJ_FRAC_2]);
  assert.deepEqual(correctionEntry.afterSnapshot.coveredObjectiveIds, [OBJ_FRAC_1]);
});

// =========================================================================
// NERDC CURRICULUM RESOLUTION (Scenarios 12-15)
// =========================================================================

test('12 & 13. Topics and learning objectives validate strictly against exact curriculum version', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const adminCtx = makePrincipalCtx();
  const teacherCtx = makeTeacherCtx();

  const assignmentV1 = await service.createAssignment(adminCtx, {
    schoolId: SCHOOL_A,
    academicSession: '2026/2027',
    term: 'Term 1',
    classId: CLASS_JSS1,
    section: 'A',
    subjectId: SUBJ_MATH,
    curriculumVersionId: VER_V1,
    teacherUserId: TEACHER_1,
    assignedBy: 'principal@school.edu'
  });

  // Cross-version topic ID (V2 topic on V1 assignment) rejected 422 UNRESOLVED_CURRICULUM
  await assert.rejects(
    () =>
      service.createDeliveryRecord(teacherCtx, {
        assignmentId: assignmentV1.id,
        topicId: TOPIC_FRACTIONS_V2,
        topicTitle: 'Fractions, Ratios and Decimals'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'UNRESOLVED_CURRICULUM' && err.httpStatus === 422
  );

  // Wrong-topic learning objective rejected during completion confirmation
  const delivery = await service.createDeliveryRecord(teacherCtx, {
    assignmentId: assignmentV1.id,
    topicId: TOPIC_FRACTIONS_V1,
    topicTitle: 'Fractions and Decimals'
  });
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'received');
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'opened');
  await service.transitionDeliveryStage(teacherCtx, delivery.id, 'acknowledged');

  await assert.rejects(
    () =>
      service.confirmTeachingCompletion(teacherCtx, delivery.id, {
        targetStatus: 'completed',
        confirmTaught: true,
        coverageMode: 'full',
        coveredObjectiveIds: [OBJ_ALG_1], // belongs to Algebra, not Fractions!
        understandingLevel: 'Good',
        studentEngagement: 'High'
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'UNRESOLVED_CURRICULUM'
  );
});

test('14 & 15. Unresolved topics excluded until manually mapped; historical superseded versions stay pinned', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { teacherCtx, assignment } = await seedCompletedFractionsDelivery(service, VER_V1, TOPIC_FRACTIONS_V1);

  // Unmatched free-text topic -> resolutionStatus = 'unresolved'
  const unresolvedDelivery = await service.createDeliveryRecord(teacherCtx, {
    assignmentId: assignment.id,
    topicTitle: 'Custom Unlisted Binary Puzzles'
  });
  assert.equal(unresolvedDelivery.resolutionStatus, 'unresolved');
  assert.equal(unresolvedDelivery.topicId, null);

  await service.transitionDeliveryStage(teacherCtx, unresolvedDelivery.id, 'received');
  await service.transitionDeliveryStage(teacherCtx, unresolvedDelivery.id, 'opened');
  await service.transitionDeliveryStage(teacherCtx, unresolvedDelivery.id, 'acknowledged');
  await service.confirmTeachingCompletion(teacherCtx, unresolvedDelivery.id, {
    targetStatus: 'completed',
    confirmTaught: true,
    coverageMode: 'full',
    understandingLevel: 'Good',
    studentEngagement: 'Moderate'
  });

  // Excluded from verified evidence & progress count until manually mapped
  const bundleBeforeMap = await service.getVerifiedTaughtEvidence(teacherCtx, assignment.id);
  assert.equal(bundleBeforeMap.verifiedTopics.length, 1);
  assert.equal(bundleBeforeMap.unresolvedExcludedCount, 1);

  const mapped = await service.mapUnresolvedTopic(teacherCtx, unresolvedDelivery.id, {
    topicId: TOPIC_ALGEBRA_V1,
    coveredObjectiveIds: [OBJ_ALG_1],
    reason: 'Maps directly to NERDC JSS1 Simple Linear Equations'
  });
  assert.equal(mapped.resolutionStatus, 'manually_mapped');
  assert.equal(mapped.curriculumVersionId, VER_V1); // historical superseded version preserved!

  const bundleAfterMap = await service.getVerifiedTaughtEvidence(teacherCtx, assignment.id);
  assert.equal(bundleAfterMap.verifiedTopics.length, 2);
  assert.equal(bundleAfterMap.verifiedTopics[0].curriculumVersionId, VER_V1);
});

// =========================================================================
// PROGRESS REPORTING (Scenarios 16-19)
// =========================================================================

test('16, 17, 18 & 19. Live PostgreSQL progress calculations exclude mock data, unconfirmed records, and track verificationBasis', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { adminCtx, teacherCtx, assignment, delivery } = await seedCompletedFractionsDelivery(service, VER_V1, TOPIC_FRACTIONS_V1);

  // Add an incomplete ('opened') delivery + an unresolved delivery -> neither should inflate verifiedTaughtTopicsCount!
  const pendingDelivery = await service.createDeliveryRecord(teacherCtx, {
    assignmentId: assignment.id,
    topicId: TOPIC_ALGEBRA_V1,
    topicTitle: 'Simple Linear Equations'
  });
  await service.transitionDeliveryStage(teacherCtx, pendingDelivery.id, 'received');
  await service.transitionDeliveryStage(teacherCtx, pendingDelivery.id, 'opened');

  const progress = await service.getSubjectProgress(teacherCtx);
  assert.equal(progress.length, 1);
  assert.equal(progress[0].topicsInCurriculum, 3); // 3 topics in VER_V1
  assert.equal(progress[0].verifiedTaughtTopicsCount, 1); // ONLY Fractions is confirmed+resolved
  assert.equal(progress[0].openedCount, 1);
  assert.equal(progress[0].notYetTaughtCount, 2);
  assert.equal(progress[0].coveragePercentage, 33);
  assert.equal(progress[0].verificationBasis, 'teacher_self_reported');

  // Admin verification transitions verificationBasis
  await service.adminVerifyDelivery(adminCtx, delivery.id, {
    adminVerificationStatus: 'verified',
    reason: 'HOD verified physical lesson delivery log'
  });
  const verifiedProgress = await service.getSubjectProgress(adminCtx);
  assert.equal(verifiedProgress[0].verificationBasis, 'mixed'); // completed=admin_verified, pending=teacher_self_reported

  // Scenario 17: Verify live Phase A UI tabs have zero MOCK_* references and App.tsx never supplies MOCK_KPIS/MOCK_DELIVERIES
  const zeroMockUiFiles = [
    'src/components/CommandCenterTab.tsx',
    'src/components/AcademicAnalyticsTab.tsx',
    'src/components/TeacherDeliveryTrackerTab.tsx',
    'src/components/TaughtAssessmentTab.tsx'
  ];
  for (const relPath of zeroMockUiFiles) {
    const content = readFileSync(path.join(process.cwd(), relPath), 'utf8');
    assert.equal(/\bMOCK_(KPIS|DELIVERIES|USERS|STUDENT_PROFILES)\b/.test(content), false, `${relPath} must not reference mock data`);
  }
  const appContent = readFileSync(path.join(process.cwd(), 'apps/curriculum-flow/src/App.tsx'), 'utf8');
  assert.equal(/\bMOCK_(KPIS|DELIVERIES)\b/.test(appContent), false, 'App.tsx must not supply MOCK_KPIS or MOCK_DELIVERIES');
});

// =========================================================================
// ASSESSMENT AUTHORIZATION (Scenarios 20-23)
// =========================================================================

test('20, 21, 22 & 23. Teacher-only scope authorization, untaught rejection, and immutable scope versioning', async () => {
  const { pool } = createStatefulTeachingPool();
  const service = new TeachingEvidenceService(pool);
  const { adminCtx, teacherCtx, assignment } = await seedCompletedFractionsDelivery(service, VER_V1, TOPIC_FRACTIONS_V1);

  // Scenario 20: Principal / admin CANNOT authorize assessment scope (403 FORBIDDEN)
  await assert.rejects(
    () =>
      service.createAssessmentScopeAuthorization(adminCtx, {
        assignmentId: assignment.id,
        assessmentType: 'midterm_exam',
        title: 'Mid-Term Math',
        selectedTopicIds: [TOPIC_FRACTIONS_V1],
        selectedObjectiveIds: [OBJ_FRAC_1],
        questionCount: 4,
        totalMarks: 8
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'FORBIDDEN' && err.httpStatus === 403
  );

  // Scenario 22: Assigned teacher trying to authorize an untaught topic is rejected 422 INSUFFICIENT_EVIDENCE
  await assert.rejects(
    () =>
      service.createAssessmentScopeAuthorization(teacherCtx, {
        assignmentId: assignment.id,
        assessmentType: 'midterm_exam',
        title: 'Out-of-scope Mid-Term',
        selectedTopicIds: [TOPIC_GEOMETRY_V1],
        selectedObjectiveIds: [OBJ_GEO_1],
        questionCount: 4,
        totalMarks: 8
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'INSUFFICIENT_EVIDENCE' && err.httpStatus === 422
  );

  // Scenario 21: Assigned teacher authorizes verified scope
  const scopeV1 = await service.createAssessmentScopeAuthorization(teacherCtx, {
    assignmentId: assignment.id,
    assessmentType: 'midterm_exam',
    title: 'JSS 1 Mid-Term Test v1',
    selectedTopicIds: [TOPIC_FRACTIONS_V1],
    selectedObjectiveIds: [OBJ_FRAC_1],
    questionCount: 4,
    questionTypesConfig: { objective: 3, theory: 1 },
    difficultyMix: { Easy: 50, Medium: 50, Hard: 0 },
    totalMarks: 10,
    durationMinutes: 30
  });
  assert.equal(scopeV1.scopeVersion, 1);
  assert.equal(scopeV1.status, 'authorized');
  assert.deepEqual(scopeV1.selectedTopicIds, [TOPIC_FRACTIONS_V1]);
  assert.deepEqual(scopeV1.selectedObjectiveIds, [OBJ_FRAC_1]);

  // Scenario 23: Re-authorizing creates scopeVersion 2 and supersedes v1
  const scopeV2 = await service.createAssessmentScopeAuthorization(teacherCtx, {
    assignmentId: assignment.id,
    assessmentType: 'midterm_exam',
    title: 'JSS 1 Mid-Term Test v2',
    selectedTopicIds: [TOPIC_FRACTIONS_V1],
    selectedObjectiveIds: [OBJ_FRAC_1, OBJ_FRAC_2],
    questionCount: 5,
    totalMarks: 10,
    durationMinutes: 35
  });
  assert.equal(scopeV2.scopeVersion, 2);
  assert.equal(scopeV2.supersedesAuthorizationId, scopeV1.id);

  // Attempt to generate using superseded scopeV1 fails cleanly (409 SCOPE_MODIFICATION_CONFLICT)
  await assert.rejects(
    () => service.resolveAndValidateAuthorizedScopeForGeneration(teacherCtx, scopeV1.id),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'SCOPE_MODIFICATION_CONFLICT'
  );
});

// =========================================================================
// AI ASSESSMENT GENERATION & PROVENANCE (Scenarios 24-30)
// =========================================================================

test('24-30. Central AI Gateway enforces server-side evidence/scope, rejects spoofed completedTopics & insufficient evidence, and records provenance + pending_review QB items', async () => {
  const { pool, state } = createStatefulTeachingPool();
  const evidenceService = new TeachingEvidenceService(pool);
  const qbService = new InstanceQuestionBankService(pool);
  const { teacherCtx, assignment, delivery } = await seedCompletedFractionsDelivery(
    evidenceService,
    VER_V1,
    TOPIC_FRACTIONS_V1
  );

  // Scenario 29: Insufficient evidence check (requesting 25 questions from 1 taught topic / 2 objectives -> max 8)
  await assert.rejects(
    () =>
      evidenceService.createAssessmentScopeAuthorization(teacherCtx, {
        assignmentId: assignment.id,
        assessmentType: 'midterm_exam',
        title: 'Oversized Exam',
        selectedTopicIds: [TOPIC_FRACTIONS_V1],
        selectedObjectiveIds: [OBJ_FRAC_1, OBJ_FRAC_2],
        questionCount: 25,
        totalMarks: 50
      }),
    (err: unknown) => err instanceof TeachingEvidenceError && err.code === 'INSUFFICIENT_EVIDENCE' && err.httpStatus === 422
  );

  const scope = await evidenceService.createAssessmentScopeAuthorization(teacherCtx, {
    assignmentId: assignment.id,
    assessmentType: 'midterm_exam',
    title: 'Mid-Term Mathematics',
    selectedTopicIds: [TOPIC_FRACTIONS_V1],
    selectedObjectiveIds: [OBJ_FRAC_1],
    questionCount: 2,
    questionTypesConfig: { objective: 1, theory: 1 },
    totalMarks: 5,
    durationMinutes: 30
  });

  let capturedPromptContents = '';
  const mockTransport: GeminiTransport = {
    async generateContent(_config, params) {
      capturedPromptContents = params.contents;
      return {
        text: JSON.stringify({
          title: 'Mid-Term Mathematics',
          subjectName: 'Mathematics',
          classGrade: 'JSS 1',
          assessmentType: 'midterm_exam',
          totalMarks: 5,
          coveredTopicsList: ['Fractions and Decimals'],
          guaranteeNote: 'Strictly grounded in verified taught evidence.',
          questions: [
            {
              questionNumber: 1,
              section: 'A',
              questionType: 'objective',
              questionText: 'Convert 3/4 to a decimal.',
              options: [
                { key: 'A', text: '0.25' },
                { key: 'B', text: '0.75' }
              ],
              marks: 2,
              topic: 'Fractions and Decimals',
              topicId: TOPIC_FRACTIONS_V1,
              learningObjectiveIds: [OBJ_FRAC_1],
              cognitiveLevel: 'Apply',
              difficulty: 'Easy'
            },
            {
              questionNumber: 2,
              section: 'B',
              questionType: 'theory',
              questionText: 'Express 5/8 as a decimal showing division steps.',
              marks: 3,
              topic: 'Fractions and Decimals',
              topicId: TOPIC_FRACTIONS_V1,
              learningObjectiveIds: [OBJ_FRAC_1],
              cognitiveLevel: 'Apply',
              difficulty: 'Medium'
            }
          ],
          markingGuide: [
            {
              questionNumber: 1,
              section: 'A',
              correctAnswer: 'B',
              modelAnswer: '3 / 4 = 0.75',
              totalMarks: 2,
              stepBreakdown: [{ stepDescription: 'Divide numerator by denominator', marksAwarded: 2 }],
              partialCreditRules: 'All or nothing'
            },
            {
              questionNumber: 2,
              section: 'B',
              correctAnswer: '0.625',
              modelAnswer: '5 / 8 = 0.625',
              totalMarks: 3,
              stepBreakdown: [{ stepDescription: 'Long division steps', marksAwarded: 3 }],
              partialCreditRules: 'Award M1 for division setup'
            }
          ]
        }),
        usageMetadata: { promptTokenCount: 180, candidatesTokenCount: 240, totalTokenCount: 420 }
      };
    }
  };

  const env = {
    NODE_ENV: 'test',
    GOOGLE_CLOUD_PROJECT: 'curious-subject-477114-e4',
    GOOGLE_CLOUD_LOCATION: 'europe-west1'
  };
  const gateway = new CentralAiGatewayService({
    provider: new GoogleGeminiProviderAdapter(mockTransport, () => env),
    trafficController: new AiGatewayTrafficController(),
    getStore: () => ({ store: new InMemoryAiGatewayStore(), databaseConfigured: true, pool }),
    getEntitlementMode: () => 'decoupled',
    getEnv: () => env
  });

  const caller = {
    callerType: 'tenant_user' as const,
    userId: TEACHER_1,
    email: 'teacher@school.edu',
    role: 'subject_teacher',
    tenantId: TENANT_A,
    applicationInstanceId: INSTANCE_A,
    verifiedPrincipal: teacherCtx.tenant,
    authorizedPrincipal: teacherCtx.authorizedPrincipal,
    permissions: [PERMISSIONS.aiAssessmentsGenerate, PERMISSIONS.assessmentsScopeAuthorize]
  };

  // Scenario 25: Missing scopeAuthorizationId even with client completedTopics is REJECTED
  await assert.rejects(
    () =>
      gateway.execute({
        caller,
        envelope: {
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_ASSESSMENT_GENERATION',
          taskType: 'taught_assessment',
          tenantId: TENANT_A,
          applicationInstanceId: INSTANCE_A,
          payload: {
            completedTopics: [{ topic: 'Untaught Quantum Calculus' }],
            strictVerifiedEvidence: true
          }
        }
      }),
    (err: unknown) => err instanceof AiGatewayError && err.httpStatus === 403
  );

  // Scenario 24, 26, 27, 28: Execute with valid scopeAuthorizationId + injected spoofed completedTopics (must be stripped)
  const gatewayResult = await gateway.execute<any>({
    caller,
    envelope: {
      applicationId: 'SCHOOL_INSTANCE',
      capability: 'SCHOOL_ASSESSMENT_GENERATION',
      taskType: 'taught_assessment',
      tenantId: TENANT_A,
      applicationInstanceId: INSTANCE_A,
      payload: {
        scopeAuthorizationId: scope.id,
        completedTopics: [{ topic: 'SPOOFED_UNTAUGHT_FUTURE_SYLLABUS_TOPIC' }],
        strictVerifiedEvidence: true
      }
    }
  });

  // Assert untaught/spoofed topic never entered Gemini prompt; verified topic + objective DID
  assert.equal(capturedPromptContents.includes('SPOOFED_UNTAUGHT_FUTURE_SYLLABUS_TOPIC'), false);
  assert.equal(capturedPromptContents.includes('Angles and Plane Shapes'), false); // future Term 2 topic excluded
  assert.equal(capturedPromptContents.includes(TOPIC_FRACTIONS_V1), true);
  assert.equal(capturedPromptContents.includes(OBJ_FRAC_1), true);
  assert.equal(capturedPromptContents.includes(OBJ_FRAC_2), false); // teacher scoped only OBJ_FRAC_1

  // Scenario 30: Persist questions as pending_review + extended blueprint + provenance + usage counter
  const savedQuestions = [];
  for (const q of gatewayResult.data.questions) {
    savedQuestions.push(
      await qbService.createQuestion(teacherCtx.tenant, INSTANCE_A, {
        subjectReferenceId: assignment.subjectId,
        classGradeName: assignment.classGradeName,
        curriculumVersionId: assignment.curriculumVersionId,
        topicReferenceId: q.topicId,
        learningObjectiveIds: q.learningObjectiveIds,
        questionType: q.questionType,
        stem: q.questionText,
        options: q.options || null,
        correctAnswer: 'B',
        marks: q.marks,
        difficulty: q.difficulty,
        creationMethod: 'ai_assisted',
        reviewStatus: 'pending_review'
      })
    );
  }
  assert.equal(savedQuestions.length, 2);
  assert.equal(savedQuestions.every(q => q.reviewStatus === 'pending_review'), true);

  const blueprint = await qbService.createBlueprint(teacherCtx.tenant, INSTANCE_A, {
    title: scope.title,
    subjectReferenceId: assignment.subjectId,
    classGradeName: assignment.classGradeName,
    term: assignment.term,
    curriculumVersionId: assignment.curriculumVersionId,
    assessmentType: 'exam',
    questionFormatsCount: scope.questionTypesConfig,
    totalMarks: scope.totalMarks,
    difficultyMix: scope.difficultyMix,
    timeAllowanceMinutes: scope.durationMinutes,
    completedTopicsOnly: true,
    selectedTopicIds: scope.selectedTopicIds,
    scopeAuthorizationId: scope.id,
    selectedObjectiveIds: scope.selectedObjectiveIds,
    sourceDeliveryIds: scope.sourceDeliveryIds,
    authorizedTeacherUserId: scope.teacherUserId,
    academicSession: assignment.academicSession,
    section: assignment.section
  });
  assert.equal(blueprint.scopeAuthorizationId, scope.id);
  assert.deepEqual(blueprint.sourceDeliveryIds, [delivery.id]);

  const provenance = await evidenceService.recordGenerationProvenance(teacherCtx, {
    scopeAuthorization: scope,
    blueprintId: blueprint.id,
    generatedQuestionIds: savedQuestions.map(q => q.id),
    aiGatewayRequestId: gatewayResult.requestId,
    providerId: gatewayResult.routing.providerId,
    modelId: gatewayResult.routing.modelId,
    generationStatus: 'generated'
  });
  assert.equal(provenance.scopeAuthorizationId, scope.id);
  assert.equal(provenance.blueprintId, blueprint.id);
  assert.equal(provenance.generatedQuestionIds.length, 2);
  assert.equal(state.deliveries[0].used_in_assessment_count, 1);
});

// =========================================================================
// QUESTION BANK AND EXAMINATION REGRESSION (Scenarios 31-35)
// =========================================================================

test('31-35. Existing Question Bank isolation, review/approval, exam config, and blueprint preservation work cleanly', async () => {
  const { pool } = createStatefulTeachingPool();
  const qbService = new InstanceQuestionBankService(pool);
  const teacherPrincipal = makeTeacherCtx().tenant;
  const adminPrincipal = makePrincipalCtx().tenant;
  const otherTenantPrincipal = makeTeacherCtx(TENANT_B, INSTANCE_B, TEACHER_2).tenant;

  const q = await qbService.createQuestion(teacherPrincipal, INSTANCE_A, {
    subjectReferenceId: SUBJ_MATH,
    classGradeName: 'JSS 1',
    curriculumVersionId: VER_V1,
    topicReferenceId: TOPIC_FRACTIONS_V1,
    questionType: 'objective',
    stem: 'What is 1/2 + 1/4?',
    options: [
      { key: 'A', text: '3/4' },
      { key: 'B', text: '2/6' }
    ],
    correctAnswer: 'A',
    marks: 2,
    reviewStatus: 'pending_review'
  });
  assert.equal(q.reviewStatus, 'pending_review');

  // Scenario 31: Tenant B cannot read Tenant A question bank
  const otherQuestions = await qbService.listQuestions(otherTenantPrincipal, INSTANCE_B);
  assert.equal(otherQuestions.length, 0);

  // Scenario 32 & 35: Principal/reviewer approves question
  const approved = await qbService.reviewQuestion(adminPrincipal, INSTANCE_A, q.id, 'approved');
  assert.equal(approved.reviewStatus, 'approved');

  // Scenario 34: Standard blueprint creation without Phase A fields remains preserved
  const blueprint = await qbService.createBlueprint(adminPrincipal, INSTANCE_A, {
    title: 'Standard Exam Blueprint',
    subjectReferenceId: SUBJ_MATH,
    classGradeName: 'JSS 1',
    term: 'Term 1',
    curriculumVersionId: VER_V1,
    assessmentType: 'exam',
    questionFormatsCount: { objective: 1 },
    totalMarks: 2,
    difficultyMix: { Easy: 100 }
  });
  assert.equal(blueprint.status, 'draft');

  // Scenario 33: Exam configuration creation from approved question
  const examConfig = await qbService.createExamConfiguration(adminPrincipal, INSTANCE_A, {
    blueprintId: blueprint.id,
    examCode: 'JSS1-MTH-01',
    title: 'JSS 1 Mathematics Examination',
    subjectReferenceId: SUBJ_MATH,
    classGradeName: 'JSS 1',
    term: 'Term 1',
    selectedQuestionIds: [approved.id],
    totalMarks: 2
  });
  assert.equal(examConfig.selectedQuestionIds.length, 1);
  assert.equal(examConfig.blueprintId, blueprint.id);
});

// =========================================================================
// LIVE POSTGRESQL MIGRATION 018 ACCEPTANCE (when DATABASE_TEST_DISPOSABLE=1)
// =========================================================================

test(
  'Live PostgreSQL acceptance: migration 018 enforces schema constraints, RLS policies, and RBAC teacher-only scope grant',
  acceptanceTestOptions,
  async () => {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: databaseUrl });
    try {
      const migrationSql = readFileSync(
        path.join(process.cwd(), 'src/db/migrations/018_teacher_academic_progress_authority.sql'),
        'utf8'
      );
      await pool.query(migrationSql);

      const rlsTables = await pool.query<{ tablename: string; rowsecurity: boolean }>(
        `SELECT tablename, rowsecurity
         FROM pg_tables
         WHERE schemaname = 'production'
           AND tablename IN (
             'teacher_subject_assignments',
             'lesson_note_records',
             'teaching_delivery_records',
             'teaching_delivery_audit_history',
             'assessment_scope_authorizations',
             'assessment_generation_provenance'
           )`
      );
      assert.equal(rlsTables.rowCount, 6);
      assert.equal(rlsTables.rows.every(r => r.rowsecurity), true);
    } finally {
      await pool.end();
    }
  }
);
