import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import type {
  CurriculumChangeHistoryRecord,
  CurriculumClassGradeRecord,
  CurriculumCompetencyRecord,
  CurriculumCountryRecord,
  CurriculumCoverageSummaryRecord,
  CurriculumEducationAuthorityRecord,
  CurriculumFilterParams,
  CurriculumFrameworkRecord,
  CurriculumLearningObjectiveRecord,
  CurriculumSourceDocumentRecord,
  CurriculumStandardRecord,
  CurriculumSubjectDetail,
  CurriculumSubjectSummary,
  CurriculumSubtopicRecord,
  CurriculumThemeDetail,
  CurriculumTopicRecord,
  CurriculumVersionRecord,
  PaginatedResult
} from './centralCurriculumTypes';

export class CentralCurriculumError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'VALIDATION_ERROR'
      | 'FORBIDDEN'
      | 'VERSION_CONFLICT',
    message: string
  ) {
    super(message);
    this.name = 'CentralCurriculumError';
  }
}

export function normalizePagination(page?: number, limit?: number): { page: number; limit: number; offset: number } {
  const safePage = Number.isFinite(page) && (page as number) >= 1 ? Math.floor(page as number) : 1;
  const safeLimit = Number.isFinite(limit) && (limit as number) >= 1
    ? Math.min(100, Math.floor(limit as number))
    : 25;
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

function mapVersionRow(row: any): CurriculumVersionRecord {
  return {
    id: row.id,
    frameworkId: row.framework_id,
    frameworkCode: row.framework_code || undefined,
    versionTag: row.version_tag,
    title: row.title,
    academicApplicability: row.academic_applicability || {},
    releaseDate: row.release_date instanceof Date ? row.release_date.toISOString() : String(row.release_date),
    effectiveFrom: row.effective_from instanceof Date ? row.effective_from.toISOString() : row.effective_from || null,
    effectiveTo: row.effective_to instanceof Date ? row.effective_to.toISOString() : row.effective_to || null,
    supersedesVersionId: row.supersedes_version_id || null,
    supersededByVersionId: row.superseded_by_version_id || null,
    isSuperseded: row.status === 'superseded' || Boolean(row.superseded_by_version_id),
    status: row.status,
    editorialApprovalStatus: row.editorial_approval_status,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at instanceof Date ? row.approved_at.toISOString() : row.approved_at || null,
    isOfficialVerified: Boolean(row.is_official_verified),
    sourceProvenance: row.source_provenance || {},
    createdBy: row.created_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  };
}

export class CentralCurriculumRepository {
  constructor(private readonly pool: DatabasePool) {}

  private async runRead<T>(
    principal: VerifiedTenantPrincipal,
    fn: (client: DatabaseClient) => Promise<T>
  ): Promise<T> {
    if (principal.role === 'super_admin') {
      return withControlPlaneTransaction(this.pool, principal, fn);
    }
    return withTenantTransaction(this.pool, principal, fn);
  }

  private buildDefaultVersionStatusClause(principal: VerifiedTenantPrincipal, alias = 'v'): string {
    return principal.role === 'super_admin'
      ? `${alias}.status IN ('published', 'approved')`
      : `${alias}.status = 'published'`;
  }

  private buildExplicitVersionVisibilityClause(principal: VerifiedTenantPrincipal, alias = 'v'): string {
    return principal.role === 'super_admin'
      ? ''
      : ` AND ${alias}.status IN ('published', 'superseded')`;
  }

  async listCountries(
    principal: VerifiedTenantPrincipal,
    params: { page?: number; limit?: number; search?: string } = {}
  ): Promise<PaginatedResult<CurriculumCountryRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(name ILIKE $${values.length} OR iso_code ILIKE $${values.length} OR region ILIKE $${values.length})`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM production.curriculum_countries ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT id, iso_code, name, jurisdiction_type, region, metadata
         FROM production.curriculum_countries
         ${where}
         ORDER BY name ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          isoCode: r.iso_code,
          name: r.name,
          jurisdictionType: r.jurisdiction_type,
          region: r.region,
          metadata: r.metadata || {}
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listAuthorities(
    principal: VerifiedTenantPrincipal,
    params: { countryId?: string; page?: number; limit?: number; search?: string } = {}
  ): Promise<PaginatedResult<CurriculumEducationAuthorityRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.countryId?.trim()) {
        values.push(params.countryId.trim());
        conditions.push(`country_id = $${values.length}`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(name ILIKE $${values.length} OR code ILIKE $${values.length})`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM production.curriculum_education_authorities ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT id, country_id, code, name, authority_type, official_url, metadata
         FROM production.curriculum_education_authorities
         ${where}
         ORDER BY name ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          countryId: r.country_id,
          code: r.code,
          name: r.name,
          authorityType: r.authority_type,
          officialUrl: r.official_url,
          metadata: r.metadata || {}
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listFrameworks(
    principal: VerifiedTenantPrincipal,
    params: { countryId?: string; authorityId?: string; status?: string; page?: number; limit?: number; search?: string } = {}
  ): Promise<PaginatedResult<CurriculumFrameworkRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.countryId?.trim()) {
        values.push(params.countryId.trim());
        conditions.push(`f.country_id = $${values.length}`);
      }
      if (params.authorityId?.trim()) {
        values.push(params.authorityId.trim());
        conditions.push(`f.authority_id = $${values.length}`);
      }
      if (params.status?.trim()) {
        values.push(params.status.trim());
        conditions.push(`f.status = $${values.length}`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(f.name ILIKE $${values.length} OR f.code ILIKE $${values.length} OR f.description ILIKE $${values.length})`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM production.curriculum_frameworks f ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT f.id, f.country_id, c.name AS country_name, f.authority_id, a.name AS authority_name,
                f.code, f.name, f.description, f.status, f.metadata
         FROM production.curriculum_frameworks f
         JOIN production.curriculum_countries c ON c.id = f.country_id
         JOIN production.curriculum_education_authorities a ON a.id = f.authority_id
         ${where}
         ORDER BY f.name ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          countryId: r.country_id,
          countryName: r.country_name,
          authorityId: r.authority_id,
          authorityName: r.authority_name,
          code: r.code,
          name: r.name,
          description: r.description,
          status: r.status,
          metadata: r.metadata || {}
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listGrades(
    principal: VerifiedTenantPrincipal,
    params: { frameworkId?: string; levelCode?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<CurriculumClassGradeRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`g.framework_id = $${values.length}`);
      }
      if (params.levelCode?.trim() && params.levelCode !== 'all') {
        values.push(params.levelCode.trim().toLowerCase());
        conditions.push(`lower(l.code) = $${values.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM production.curriculum_class_grades g
         JOIN production.curriculum_education_levels l ON l.id = g.education_level_id
         ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT g.id, g.framework_id, g.education_level_id, l.code AS level_code, l.name AS level_name,
                g.code, g.name, g.sort_order
         FROM production.curriculum_class_grades g
         JOIN production.curriculum_education_levels l ON l.id = g.education_level_id
         ${where}
         ORDER BY g.sort_order ASC, g.name ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          frameworkId: r.framework_id,
          educationLevelId: r.education_level_id,
          educationLevelCode: r.level_code,
          educationLevelName: r.level_name,
          code: r.code,
          name: r.name,
          sortOrder: r.sort_order
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listVersions(
    principal: VerifiedTenantPrincipal,
    params: { frameworkId?: string; status?: string; includeChangeHistory?: boolean; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<CurriculumVersionRecord & { changeHistory?: CurriculumChangeHistoryRecord[] }>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`v.framework_id = $${values.length}`);
      }
      if (params.status?.trim()) {
        values.push(params.status.trim());
        conditions.push(`v.status = $${values.length}`);
      }
      if (principal.role !== 'super_admin') {
        conditions.push(`v.status IN ('published', 'superseded')`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM production.curriculum_versions v ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT v.*, f.code AS framework_code
         FROM production.curriculum_versions v
         JOIN production.curriculum_frameworks f ON f.id = v.framework_id
         ${where}
         ORDER BY v.release_date DESC, v.created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      const versions = rows.rows.map(mapVersionRow);

      let historyMap = new Map<string, CurriculumChangeHistoryRecord[]>();
      if (params.includeChangeHistory && versions.length > 0) {
        const versionIds = versions.map(v => v.id);
        const histRows = await client.query(
          `SELECT id, curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor, recorded_at
           FROM production.curriculum_change_history
           WHERE curriculum_version_id = ANY($1::text[])
           ORDER BY recorded_at DESC`,
          [versionIds]
        );
        for (const hr of histRows.rows) {
          const list = historyMap.get(hr.curriculum_version_id) || [];
          list.push({
            id: hr.id,
            curriculumVersionId: hr.curriculum_version_id,
            entityType: hr.entity_type,
            entityId: hr.entity_id,
            changeType: hr.change_type,
            summary: hr.summary,
            diffPayload: hr.diff_payload || {},
            actor: hr.actor,
            recordedAt: hr.recorded_at instanceof Date ? hr.recorded_at.toISOString() : String(hr.recorded_at)
          });
          historyMap.set(hr.curriculum_version_id, list);
        }
      }

      return {
        items: versions.map(v => ({
          ...v,
          ...(params.includeChangeHistory ? { changeHistory: historyMap.get(v.id) || [] } : {})
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listSubjects(
    principal: VerifiedTenantPrincipal,
    params: CurriculumFilterParams = {}
  ): Promise<PaginatedResult<CurriculumSubjectSummary>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`v.id = $${values.length}${this.buildExplicitVersionVisibilityClause(principal, 'v')}`);
      } else {
        conditions.push(this.buildDefaultVersionStatusClause(principal, 'v'));
      }

      if (params.countryId?.trim()) {
        values.push(params.countryId.trim());
        conditions.push(`f.country_id = $${values.length}`);
      }
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`s.framework_id = $${values.length}`);
      }
      if (params.levelCode?.trim() && params.levelCode !== 'all') {
        values.push(params.levelCode.trim().toLowerCase());
        conditions.push(`lower(l.code) = $${values.length}`);
      }
      if (params.classificationCode?.trim() && params.classificationCode !== 'all') {
        values.push(params.classificationCode.trim().toLowerCase());
        conditions.push(`lower(c.code) = $${values.length}`);
      }
      if (params.compulsoryOnly === true) {
        conditions.push(`s.is_compulsory = true`);
      }
      if (params.gradeName?.trim() && params.gradeName !== 'all') {
        values.push(JSON.stringify([params.gradeName.trim()]));
        conditions.push(`s.target_grades @> $${values.length}::jsonb`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(s.name ILIKE $${values.length} OR s.code ILIKE $${values.length} OR s.description ILIKE $${values.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM production.curriculum_version_subjects vs
         JOIN production.curriculum_versions v ON v.id = vs.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = vs.subject_id
         JOIN production.curriculum_frameworks f ON f.id = s.framework_id
         JOIN production.curriculum_education_levels l ON l.id = s.education_level_id
         JOIN production.curriculum_subject_classifications c ON c.id = s.classification_id
         ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);

      const rows = await client.query(
        `SELECT s.*, l.code AS level_code, c.code AS classification_code, c.name AS classification_name,
                v.id AS resolved_version_id, v.status AS resolved_version_status, v.is_official_verified,
                (SELECT count(*)::int FROM production.curriculum_topics t
                 WHERE t.subject_id = s.id AND t.curriculum_version_id = v.id) AS topic_count,
                (SELECT count(*)::int FROM production.curriculum_learning_objectives o
                 JOIN production.curriculum_topics t2 ON t2.id = o.topic_id
                 WHERE t2.subject_id = s.id AND o.curriculum_version_id = v.id) AS objective_count
         FROM production.curriculum_version_subjects vs
         JOIN production.curriculum_versions v ON v.id = vs.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = vs.subject_id
         JOIN production.curriculum_frameworks f ON f.id = s.framework_id
         JOIN production.curriculum_education_levels l ON l.id = s.education_level_id
         JOIN production.curriculum_subject_classifications c ON c.id = s.classification_id
         ${where}
         ORDER BY s.name ASC, v.release_date DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      return {
        items: rows.rows.map(r => ({
          id: r.id,
          frameworkId: r.framework_id,
          educationLevelId: r.education_level_id,
          educationLevelCode: r.level_code,
          classificationId: r.classification_id,
          classificationCode: r.classification_code,
          classificationName: r.classification_name,
          code: r.code,
          name: r.name,
          description: r.description,
          isCompulsory: r.is_compulsory,
          recommendedPeriodsPerWeek: r.recommended_periods_per_week,
          officialSourceUrl: r.official_source_url,
          targetGrades: r.target_grades || [],
          generalObjectives: r.general_objectives || [],
          recommendedTextbooks: r.recommended_textbooks || [],
          equipmentRequirements: r.equipment_requirements || [],
          status: r.status,
          curriculumVersionId: r.resolved_version_id,
          curriculumVersionStatus: r.resolved_version_status,
          isOfficialVerified: Boolean(r.is_official_verified),
          topicCount: r.topic_count ?? 0,
          objectiveCount: r.objective_count ?? 0
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async getSubjectDetail(
    principal: VerifiedTenantPrincipal,
    subjectIdOrCode: string,
    options: { versionId?: string; classGrade?: string } = {}
  ): Promise<CurriculumSubjectDetail | undefined> {
    const queryKey = subjectIdOrCode.trim();
    if (!queryKey) return undefined;

    return this.runRead(principal, async client => {
      const versionFilter = options.versionId?.trim()
        ? `AND v.id = $2${this.buildExplicitVersionVisibilityClause(principal, 'v')}`
        : `AND ${this.buildDefaultVersionStatusClause(principal, 'v')}`;
      const queryParams: unknown[] = options.versionId?.trim()
        ? [queryKey, options.versionId.trim()]
        : [queryKey];

      const subRow = await client.query(
        `SELECT s.*, l.code AS level_code, c.code AS classification_code, c.name AS classification_name,
                v.id AS ver_id, v.framework_id AS ver_fw_id, v.version_tag, v.title AS ver_title,
                v.academic_applicability, v.release_date, v.effective_from, v.effective_to,
                v.supersedes_version_id, v.superseded_by_version_id, v.status AS ver_status,
                v.editorial_approval_status, v.approved_by, v.approved_at, v.is_official_verified,
                v.source_provenance, v.created_by AS ver_created_by, v.created_at AS ver_created_at,
                v.updated_at AS ver_updated_at
         FROM production.curriculum_version_subjects vs
         JOIN production.curriculum_versions v ON v.id = vs.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = vs.subject_id
         JOIN production.curriculum_education_levels l ON l.id = s.education_level_id
         JOIN production.curriculum_subject_classifications c ON c.id = s.classification_id
         WHERE (s.id = $1 OR lower(s.code) = lower($1) OR lower(s.name) = lower($1))
           ${versionFilter}
         ORDER BY CASE v.status WHEN 'published' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, v.release_date DESC
         LIMIT 1`,
        queryParams
      );

      if (subRow.rowCount === 0) return undefined;
      const r = subRow.rows[0];
      const version = mapVersionRow({
        id: r.ver_id,
        framework_id: r.ver_fw_id,
        version_tag: r.version_tag,
        title: r.ver_title,
        academic_applicability: r.academic_applicability,
        release_date: r.release_date,
        effective_from: r.effective_from,
        effective_to: r.effective_to,
        supersedes_version_id: r.supersedes_version_id,
        superseded_by_version_id: r.superseded_by_version_id,
        status: r.ver_status,
        editorial_approval_status: r.editorial_approval_status,
        approved_by: r.approved_by,
        approved_at: r.approved_at,
        is_official_verified: r.is_official_verified,
        source_provenance: r.source_provenance,
        created_by: r.ver_created_by,
        created_at: r.ver_created_at,
        updated_at: r.ver_updated_at
      });

      const themesRows = await client.query(
        `SELECT id, source_theme_id, theme_number, title, description
         FROM production.curriculum_themes
         WHERE curriculum_version_id = $1 AND subject_id = $2
         ORDER BY theme_number ASC, title ASC`,
        [version.id, r.id]
      );

      const topicConditions = ['curriculum_version_id = $1', 'subject_id = $2'];
      const topicValues: unknown[] = [version.id, r.id];
      if (options.classGrade?.trim() && options.classGrade !== 'all') {
        topicValues.push(options.classGrade.trim());
        topicConditions.push(`class_grade_name = $${topicValues.length}`);
      }

      const topicRows = await client.query(
        `SELECT *
         FROM production.curriculum_topics
         WHERE ${topicConditions.join(' AND ')}
         ORDER BY week ASC, title ASC`,
        topicValues
      );

      const topicIds = topicRows.rows.map(t => t.id);
      const subtopicsByTopic = new Map<string, CurriculumSubtopicRecord[]>();
      const objectivesByTopic = new Map<string, CurriculumLearningObjectiveRecord[]>();

      if (topicIds.length > 0) {
        const subRows = await client.query(
          `SELECT id, curriculum_version_id, topic_id, sort_order, title, description
           FROM production.curriculum_subtopics
           WHERE topic_id = ANY($1::text[])
           ORDER BY sort_order ASC`,
          [topicIds]
        );
        for (const sr of subRows.rows) {
          const list = subtopicsByTopic.get(sr.topic_id) || [];
          list.push({
            id: sr.id,
            curriculumVersionId: sr.curriculum_version_id,
            topicId: sr.topic_id,
            sortOrder: sr.sort_order,
            title: sr.title,
            description: sr.description
          });
          subtopicsByTopic.set(sr.topic_id, list);
        }

        const objRows = await client.query(
          `SELECT id, curriculum_version_id, topic_id, subtopic_id, objective_type, sort_order, description, bloom_level
           FROM production.curriculum_learning_objectives
           WHERE topic_id = ANY($1::text[])
           ORDER BY sort_order ASC`,
          [topicIds]
        );
        for (const orow of objRows.rows) {
          const list = objectivesByTopic.get(orow.topic_id) || [];
          list.push({
            id: orow.id,
            curriculumVersionId: orow.curriculum_version_id,
            topicId: orow.topic_id,
            subtopicId: orow.subtopic_id || null,
            objectiveType: orow.objective_type,
            sortOrder: orow.sort_order,
            description: orow.description,
            bloomLevel: orow.bloom_level || null
          });
          objectivesByTopic.set(orow.topic_id, list);
        }
      }

      const topicsByTheme = new Map<string, CurriculumTopicRecord[]>();
      for (const tr of topicRows.rows) {
        const list = topicsByTheme.get(tr.theme_id) || [];
        list.push({
          id: tr.id,
          sourceTopicId: tr.source_topic_id,
          curriculumVersionId: tr.curriculum_version_id,
          subjectId: tr.subject_id,
          themeId: tr.theme_id,
          classGradeId: tr.class_grade_id,
          classGradeName: tr.class_grade_name,
          term: tr.term,
          week: tr.week,
          title: tr.title,
          contentDetails: tr.content_details || [],
          teacherActivities: tr.teacher_activities || [],
          studentActivities: tr.student_activities || [],
          teachingMaterials: tr.teaching_materials || [],
          evaluationGuide: tr.evaluation_guide || [],
          practicalWorkshopNotes: tr.practical_workshop_notes || null,
          competencyDomain: tr.competency_domain || null,
          examRelevance: tr.exam_relevance || {},
          subtopics: subtopicsByTopic.get(tr.id) || [],
          objectives: objectivesByTopic.get(tr.id) || []
        });
        topicsByTheme.set(tr.theme_id, list);
      }

      const themes: CurriculumThemeDetail[] = themesRows.rows.map(th => ({
        id: th.id,
        sourceThemeId: th.source_theme_id,
        themeNumber: th.theme_number,
        title: th.title,
        description: th.description,
        topics: topicsByTheme.get(th.id) || []
      }));

      const stdRows = await client.query(
        `SELECT id, framework_id, curriculum_version_id, subject_id, topic_id, standard_code, title, description, exam_body
         FROM production.curriculum_standards
         WHERE curriculum_version_id = $1 AND subject_id = $2
         ORDER BY standard_code ASC`,
        [version.id, r.id]
      );
      const standards: CurriculumStandardRecord[] = stdRows.rows.map(sr => ({
        id: sr.id,
        frameworkId: sr.framework_id,
        curriculumVersionId: sr.curriculum_version_id,
        subjectId: sr.subject_id || null,
        topicId: sr.topic_id || null,
        standardCode: sr.standard_code,
        title: sr.title,
        description: sr.description,
        examBody: sr.exam_body
      }));

      return {
        id: r.id,
        frameworkId: r.framework_id,
        educationLevelId: r.education_level_id,
        educationLevelCode: r.level_code,
        classificationId: r.classification_id,
        classificationCode: r.classification_code,
        classificationName: r.classification_name,
        code: r.code,
        name: r.name,
        description: r.description,
        isCompulsory: r.is_compulsory,
        recommendedPeriodsPerWeek: r.recommended_periods_per_week,
        officialSourceUrl: r.official_source_url,
        targetGrades: r.target_grades || [],
        generalObjectives: r.general_objectives || [],
        recommendedTextbooks: r.recommended_textbooks || [],
        equipmentRequirements: r.equipment_requirements || [],
        status: r.status,
        curriculumVersionId: version.id,
        curriculumVersionStatus: version.status,
        isOfficialVerified: version.isOfficialVerified,
        topicCount: topicRows.rows.length,
        objectiveCount: Array.from(objectivesByTopic.values()).reduce((sum, list) => sum + list.length, 0),
        version,
        themes,
        standards
      };
    });
  }

  async listTopics(
    principal: VerifiedTenantPrincipal,
    params: CurriculumFilterParams = {}
  ): Promise<PaginatedResult<CurriculumTopicRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`t.curriculum_version_id = $${values.length}${this.buildExplicitVersionVisibilityClause(principal, 'v')}`);
      } else {
        conditions.push(this.buildDefaultVersionStatusClause(principal, 'v'));
      }
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`s.framework_id = $${values.length}`);
      }
      if (params.subjectId?.trim()) {
        values.push(params.subjectId.trim());
        conditions.push(`(t.subject_id = $${values.length} OR lower(s.code) = lower($${values.length}))`);
      }
      if (params.gradeName?.trim() && params.gradeName !== 'all') {
        values.push(params.gradeName.trim());
        conditions.push(`t.class_grade_name = $${values.length}`);
      }
      if (params.term?.trim() && params.term !== 'all') {
        values.push(params.term.trim());
        conditions.push(`t.term = $${values.length}`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(t.title ILIKE $${values.length} OR s.name ILIKE $${values.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM production.curriculum_topics t
         JOIN production.curriculum_versions v ON v.id = t.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = t.subject_id
         ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT t.*, s.name AS subject_name, th.title AS theme_title
         FROM production.curriculum_topics t
         JOIN production.curriculum_versions v ON v.id = t.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = t.subject_id
         JOIN production.curriculum_themes th ON th.id = t.theme_id
         ${where}
         ORDER BY s.name ASC, t.class_grade_name ASC, t.week ASC, t.title ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      const topicIds = rows.rows.map(r => r.id);
      const subtopicsByTopic = new Map<string, CurriculumSubtopicRecord[]>();
      const objectivesByTopic = new Map<string, CurriculumLearningObjectiveRecord[]>();
      if (topicIds.length > 0) {
        const subRows = await client.query(
          `SELECT * FROM production.curriculum_subtopics WHERE topic_id = ANY($1::text[]) ORDER BY sort_order ASC`,
          [topicIds]
        );
        for (const sr of subRows.rows) {
          const list = subtopicsByTopic.get(sr.topic_id) || [];
          list.push({
            id: sr.id,
            curriculumVersionId: sr.curriculum_version_id,
            topicId: sr.topic_id,
            sortOrder: sr.sort_order,
            title: sr.title,
            description: sr.description
          });
          subtopicsByTopic.set(sr.topic_id, list);
        }
        const objRows = await client.query(
          `SELECT * FROM production.curriculum_learning_objectives WHERE topic_id = ANY($1::text[]) ORDER BY sort_order ASC`,
          [topicIds]
        );
        for (const orow of objRows.rows) {
          const list = objectivesByTopic.get(orow.topic_id) || [];
          list.push({
            id: orow.id,
            curriculumVersionId: orow.curriculum_version_id,
            topicId: orow.topic_id,
            subtopicId: orow.subtopic_id || null,
            objectiveType: orow.objective_type,
            sortOrder: orow.sort_order,
            description: orow.description,
            bloomLevel: orow.bloom_level || null
          });
          objectivesByTopic.set(orow.topic_id, list);
        }
      }

      return {
        items: rows.rows.map(tr => ({
          id: tr.id,
          sourceTopicId: tr.source_topic_id,
          curriculumVersionId: tr.curriculum_version_id,
          subjectId: tr.subject_id,
          subjectName: tr.subject_name,
          themeId: tr.theme_id,
          themeTitle: tr.theme_title,
          classGradeId: tr.class_grade_id,
          classGradeName: tr.class_grade_name,
          term: tr.term,
          week: tr.week,
          title: tr.title,
          contentDetails: tr.content_details || [],
          teacherActivities: tr.teacher_activities || [],
          studentActivities: tr.student_activities || [],
          teachingMaterials: tr.teaching_materials || [],
          evaluationGuide: tr.evaluation_guide || [],
          practicalWorkshopNotes: tr.practical_workshop_notes || null,
          competencyDomain: tr.competency_domain || null,
          examRelevance: tr.exam_relevance || {},
          subtopics: subtopicsByTopic.get(tr.id) || [],
          objectives: objectivesByTopic.get(tr.id) || []
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listObjectives(
    principal: VerifiedTenantPrincipal,
    params: CurriculumFilterParams = {}
  ): Promise<PaginatedResult<CurriculumLearningObjectiveRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`o.curriculum_version_id = $${values.length}${this.buildExplicitVersionVisibilityClause(principal, 'v')}`);
      } else {
        conditions.push(this.buildDefaultVersionStatusClause(principal, 'v'));
      }
      if (params.subjectId?.trim()) {
        values.push(params.subjectId.trim());
        conditions.push(`t.subject_id = $${values.length}`);
      }
      if (params.topicId?.trim()) {
        values.push(params.topicId.trim());
        conditions.push(`(o.topic_id = $${values.length} OR t.source_topic_id = $${values.length})`);
      }
      if (params.gradeName?.trim() && params.gradeName !== 'all') {
        values.push(params.gradeName.trim());
        conditions.push(`t.class_grade_name = $${values.length}`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(o.description ILIKE $${values.length} OR t.title ILIKE $${values.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM production.curriculum_learning_objectives o
         JOIN production.curriculum_topics t ON t.id = o.topic_id
         JOIN production.curriculum_versions v ON v.id = o.curriculum_version_id
         ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT o.id, o.curriculum_version_id, o.topic_id, t.title AS topic_title,
                t.subject_id, t.class_grade_name, o.subtopic_id, o.objective_type,
                o.sort_order, o.description, o.bloom_level
         FROM production.curriculum_learning_objectives o
         JOIN production.curriculum_topics t ON t.id = o.topic_id
         JOIN production.curriculum_versions v ON v.id = o.curriculum_version_id
         ${where}
         ORDER BY t.subject_id ASC, t.class_grade_name ASC, o.sort_order ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          curriculumVersionId: r.curriculum_version_id,
          topicId: r.topic_id,
          topicTitle: r.topic_title,
          subjectId: r.subject_id,
          classGradeName: r.class_grade_name,
          subtopicId: r.subtopic_id || null,
          objectiveType: r.objective_type,
          sortOrder: r.sort_order,
          description: r.description,
          bloomLevel: r.bloom_level || null
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listCompetencies(
    principal: VerifiedTenantPrincipal,
    params: {
      versionId?: string;
      subjectId?: string;
      topicId?: string;
      competencyType?: CurriculumCompetencyRecord['competencyType'];
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<CurriculumCompetencyRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`c.curriculum_version_id = $${values.length}${this.buildExplicitVersionVisibilityClause(principal, 'v')}`);
      } else {
        conditions.push(this.buildDefaultVersionStatusClause(principal, 'v'));
      }
      if (params.subjectId?.trim()) {
        values.push(params.subjectId.trim());
        conditions.push(`c.subject_id = $${values.length}`);
      }
      if (params.topicId?.trim()) {
        values.push(params.topicId.trim());
        conditions.push(`c.topic_id = $${values.length}`);
      }
      if (params.competencyType) {
        values.push(params.competencyType);
        conditions.push(`c.competency_type = $${values.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM central_curriculum.curriculum_competencies c
         JOIN production.curriculum_versions v ON v.id = c.curriculum_version_id
         ${where}`,
        values
      );
      const total = Number(countRes.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT c.*
         FROM central_curriculum.curriculum_competencies c
         JOIN production.curriculum_versions v ON v.id = c.curriculum_version_id
         ${where}
         ORDER BY c.competency_code ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          curriculumVersionId: r.curriculum_version_id,
          subjectId: r.subject_id,
          topicId: r.topic_id || null,
          competencyCode: r.competency_code,
          competencyType: r.competency_type,
          title: r.title,
          description: r.description,
          assessmentCriteria: r.assessment_criteria || [],
          progressionLevel: r.progression_level || null,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async listSourceDocuments(
    principal: VerifiedTenantPrincipal,
    params: { frameworkId?: string; versionId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<CurriculumSourceDocumentRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`d.framework_id = $${values.length}`);
      }
      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`d.curriculum_version_id = $${values.length}`);
      }
      if (principal.role !== 'super_admin') {
        conditions.push(`v.status IN ('published', 'superseded')`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM central_curriculum.curriculum_source_documents d
         JOIN production.curriculum_versions v ON v.id = d.curriculum_version_id
         ${where}`,
        values
      );
      const total = Number(countRes.rows[0]?.count || 0);
      const rows = await client.query(
        `SELECT d.*
         FROM central_curriculum.curriculum_source_documents d
         JOIN production.curriculum_versions v ON v.id = d.curriculum_version_id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );
      return {
        items: rows.rows.map(r => ({
          id: r.id,
          authorityId: r.authority_id,
          frameworkId: r.framework_id,
          curriculumVersionId: r.curriculum_version_id,
          documentTitle: r.document_title,
          documentCode: r.document_code || '',
          sourceUrl: r.source_url || '',
          publicationYear: r.publication_year || null,
          effectiveFrom: r.effective_from instanceof Date ? r.effective_from.toISOString() : r.effective_from || null,
          effectiveTo: r.effective_to instanceof Date ? r.effective_to.toISOString() : r.effective_to || null,
          checksumSha256: r.checksum_sha256 || null,
          provenanceMetadata: r.provenance_metadata || {},
          isOfficialGazette: Boolean(r.is_official_gazette),
          importedBy: r.imported_by,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  /**
   * Computes curriculum structure and progression metrics strictly from Central Curriculum tables.
   * Zero direct SQL dependencies on Central Textbook or School Question Bank tables.
   */
  async getCoverage(
    principal: VerifiedTenantPrincipal,
    params: { frameworkId?: string; versionId?: string; subjectId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<CurriculumCoverageSummaryRecord>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (params.versionId?.trim()) {
        values.push(params.versionId.trim());
        conditions.push(`v.id = $${values.length}${this.buildExplicitVersionVisibilityClause(principal, 'v')}`);
      } else {
        conditions.push(this.buildDefaultVersionStatusClause(principal, 'v'));
      }
      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`s.framework_id = $${values.length}`);
      }
      if (params.subjectId?.trim()) {
        values.push(params.subjectId.trim());
        conditions.push(`s.id = $${values.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM production.curriculum_version_subjects vs
         JOIN production.curriculum_versions v ON v.id = vs.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = vs.subject_id
         ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);

      const rows = await client.query(
        `SELECT v.id AS curriculum_version_id, v.version_tag, s.framework_id,
                s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
                (SELECT count(*)::int FROM production.curriculum_topics t
                 WHERE t.curriculum_version_id = v.id AND t.subject_id = s.id) AS total_topics,
                (SELECT count(*)::int FROM production.curriculum_learning_objectives o
                 JOIN production.curriculum_topics t2 ON t2.id = o.topic_id
                 WHERE o.curriculum_version_id = v.id AND t2.subject_id = s.id) AS total_objectives
         FROM production.curriculum_version_subjects vs
         JOIN production.curriculum_versions v ON v.id = vs.curriculum_version_id
         JOIN production.curriculum_subjects s ON s.id = vs.subject_id
         ${where}
         ORDER BY s.name ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      return {
        items: rows.rows.map(r => ({
          curriculumVersionId: r.curriculum_version_id,
          versionTag: r.version_tag,
          frameworkId: r.framework_id,
          subjectId: r.subject_id,
          subjectCode: r.subject_code,
          subjectName: r.subject_name,
          totalTopics: Number(r.total_topics || 0),
          totalLearningObjectives: Number(r.total_objectives || 0),
          publishedTextbooksCount: 0,
          topicsCoveredByPublishedTextbooks: 0,
          objectivesMappedInPublishedTextbooks: 0,
          coveragePercentage: 0
        })),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  // =========================================================================
  // CENTRAL EDITORIAL ADMINISTRATION (Strictly Control-Plane Only)
  // =========================================================================

  async registerFrameworkHierarchy(
    actor: VerifiedTenantPrincipal,
    input: {
      country: { id: string; isoCode: string; name: string; jurisdictionType?: 'country' | 'state' | 'regional' | 'international'; region?: string };
      authority: { id: string; code: string; name: string; authorityType?: 'national' | 'regional' | 'examination_board' | 'international'; officialUrl?: string };
      framework: { id: string; code: string; name: string; description?: string; status?: 'draft' | 'active' | 'superseded' | 'archived' };
      levels: Array<{ id: string; code: string; name: string; sortOrder: number }>;
      grades: Array<{ id: string; educationLevelId: string; code: string; name: string; sortOrder: number }>;
    }
  ): Promise<{ frameworkId: string }> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      await client.query(
        `INSERT INTO production.curriculum_countries (id, iso_code, name, jurisdiction_type, region)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region`,
        [input.country.id, input.country.isoCode, input.country.name, input.country.jurisdictionType || 'country', input.country.region || '']
      );
      await client.query(
        `INSERT INTO production.curriculum_education_authorities (id, country_id, code, name, authority_type, official_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, official_url = EXCLUDED.official_url`,
        [input.authority.id, input.country.id, input.authority.code, input.authority.name, input.authority.authorityType || 'national', input.authority.officialUrl || '']
      );
      await client.query(
        `INSERT INTO production.curriculum_frameworks (id, country_id, authority_id, code, name, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = now()`,
        [input.framework.id, input.country.id, input.authority.id, input.framework.code, input.framework.name, input.framework.description || '', input.framework.status || 'active']
      );
      for (const lvl of input.levels) {
        await client.query(
          `INSERT INTO production.curriculum_education_levels (id, framework_id, code, name, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
          [lvl.id, input.framework.id, lvl.code, lvl.name, lvl.sortOrder]
        );
      }
      for (const grade of input.grades) {
        await client.query(
          `INSERT INTO production.curriculum_class_grades (id, framework_id, education_level_id, code, name, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
          [grade.id, input.framework.id, grade.educationLevelId, grade.code, grade.name, grade.sortOrder]
        );
      }
      return { frameworkId: input.framework.id };
    });
  }

  async createVersion(
    actor: VerifiedTenantPrincipal,
    input: {
      id: string;
      frameworkId: string;
      versionTag: string;
      title: string;
      academicApplicability?: Record<string, unknown>;
      releaseDate?: string;
      supersedesVersionId?: string;
      isOfficialVerified?: boolean;
      sourceProvenance?: Record<string, unknown>;
    }
  ): Promise<CurriculumVersionRecord> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const actorName = actor.email || actor.userId || 'platform_administrator';
      const result = await client.query(
        `INSERT INTO production.curriculum_versions
           (id, framework_id, version_tag, title, academic_applicability, release_date,
            supersedes_version_id, status, editorial_approval_status, is_official_verified,
            source_provenance, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'draft', 'pending', $8, $9::jsonb, $10)
         RETURNING *`,
        [
          input.id,
          input.frameworkId,
          input.versionTag,
          input.title,
          JSON.stringify(input.academicApplicability || {}),
          input.releaseDate || new Date().toISOString(),
          input.supersedesVersionId || null,
          Boolean(input.isOfficialVerified),
          JSON.stringify(input.sourceProvenance || { origin: 'editorial_authoring' }),
          actorName
        ]
      );
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_version', $1, 'created', $2, $3::jsonb, $4)`,
        [
          input.id,
          `Created draft curriculum version ${input.versionTag}`,
          JSON.stringify({ supersedesVersionId: input.supersedesVersionId || null }),
          actorName
        ]
      );
      return mapVersionRow(result.rows[0]);
    });
  }

  async approveVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const actorName = actor.email || actor.userId || 'platform_administrator';
      const updated = await client.query(
        `UPDATE production.curriculum_versions
         SET editorial_approval_status = 'approved',
             status = CASE WHEN status = 'draft' OR status = 'under_review' THEN 'approved' ELSE status END,
             approved_by = $2,
             approved_at = now(),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [versionId, actorName]
      );
      if (updated.rowCount === 0) {
        throw new CentralCurriculumError('NOT_FOUND', `Curriculum version ${versionId} not found.`);
      }
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_version', $1, 'approved', $2, $3::jsonb, $4)`,
        [versionId, notes || `Editorial approval recorded by ${actorName}`, JSON.stringify({ notes: notes || '' }), actorName]
      );
      return mapVersionRow(updated.rows[0]);
    });
  }

  async publishVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string
  ): Promise<CurriculumVersionRecord> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const actorName = actor.email || actor.userId || 'platform_administrator';
      const existing = await client.query(
        `SELECT * FROM production.curriculum_versions WHERE id = $1`,
        [versionId]
      );
      if (existing.rowCount === 0) {
        throw new CentralCurriculumError('NOT_FOUND', `Curriculum version ${versionId} not found.`);
      }
      const ver = existing.rows[0];
      if (ver.editorial_approval_status !== 'approved') {
        throw new CentralCurriculumError('VALIDATION_ERROR', `Curriculum version ${versionId} requires editorial approval before publishing.`);
      }

      if (ver.supersedes_version_id) {
        await client.query(
          `UPDATE production.curriculum_versions
           SET status = 'superseded',
               superseded_by_version_id = $2,
               effective_to = now(),
               updated_at = now()
           WHERE id = $1`,
          [ver.supersedes_version_id, versionId]
        );
        await client.query(
          `INSERT INTO production.curriculum_change_history
             (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
           VALUES ($1, 'curriculum_version', $1, 'superseded', $2, $3::jsonb, $4)`,
          [
            ver.supersedes_version_id,
            `Superseded by curriculum version ${versionId}`,
            JSON.stringify({ supersededByVersionId: versionId }),
            actorName
          ]
        );
      }

      const published = await client.query(
        `UPDATE production.curriculum_versions
         SET status = 'published',
             effective_from = COALESCE(effective_from, now()),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [versionId]
      );
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_version', $1, 'published', $2, $3::jsonb, $4)`,
        [versionId, `Curriculum version ${versionId} published by ${actorName}`, JSON.stringify({}), actorName]
      );
      return mapVersionRow(published.rows[0]);
    });
  }

  async submitVersionForReview(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const actorName = actor.email || actor.userId || 'platform_administrator';
      const updated = await client.query(
        `UPDATE production.curriculum_versions
         SET status = 'under_review',
             updated_at = now()
         WHERE id = $1 AND status IN ('draft', 'under_review')
         RETURNING *`,
        [versionId]
      );
      if (updated.rowCount === 0) {
        throw new CentralCurriculumError('VALIDATION_ERROR', `Curriculum version ${versionId} cannot be moved to under_review.`);
      }
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_version', $1, 'updated', $2, $3::jsonb, $4)`,
        [versionId, notes || `Submitted curriculum version ${versionId} for review`, JSON.stringify({ status: 'under_review' }), actorName]
      );
      return mapVersionRow(updated.rows[0]);
    });
  }

  async supersedeVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    supersededByVersionId?: string | null,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const actorName = actor.email || actor.userId || 'platform_administrator';
      const updated = await client.query(
        `UPDATE production.curriculum_versions
         SET status = 'superseded',
             superseded_by_version_id = COALESCE($2, superseded_by_version_id),
             effective_to = COALESCE(effective_to, now()),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [versionId, supersededByVersionId || null]
      );
      if (updated.rowCount === 0) {
        throw new CentralCurriculumError('NOT_FOUND', `Curriculum version ${versionId} not found.`);
      }
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_version', $1, 'superseded', $2, $3::jsonb, $4)`,
        [
          versionId,
          notes || `Marked curriculum version ${versionId} superseded`,
          JSON.stringify({ supersededByVersionId: supersededByVersionId || null }),
          actorName
        ]
      );
      return mapVersionRow(updated.rows[0]);
    });
  }
}
