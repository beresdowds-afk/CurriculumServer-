import type { SubjectCurriculum } from '../../src/types';
import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import { withControlPlaneTransaction } from '../db/tenantContext';
import { CentralCurriculumError, CentralCurriculumRepository } from './centralCurriculumRepository';
import { migrateNerdcDatasetsToPostgres, type CurriculumMigrationReport } from './nerdcMigrationLoader';
import type {
  CurriculumClassGradeRecord,
  CurriculumCompetencyRecord,
  CurriculumCountryRecord,
  CurriculumCoverageSummaryRecord,
  CurriculumEducationAuthorityRecord,
  CurriculumFilterParams,
  CurriculumFrameworkRecord,
  CurriculumLearningObjectiveRecord,
  CurriculumSourceDocumentRecord,
  CurriculumSubjectDetail,
  CurriculumSubjectSummary,
  CurriculumTopicRecord,
  CurriculumVersionRecord,
  PaginatedResult
} from './centralCurriculumTypes';

/**
 * Decoupled Service Port exposed by Central Curriculum Retrieval Service to external
 * central consumers (such as Central Textbook Generation Service). Consumers NEVER
 * query curriculum PostgreSQL tables directly.
 */
export interface CurriculumRetrievalPort {
  getSubjectForApprovedPublishedCurriculum(
    principal: VerifiedTenantPrincipal,
    subjectIdOrCode: string,
    options?: { versionId?: string; classGrade?: string }
  ): Promise<{
    subject: CurriculumSubjectDetail;
    grade: CurriculumClassGradeRecord;
    topicsForGrade: CurriculumTopicRecord[];
    competencies: CurriculumCompetencyRecord[];
    sourceDocuments: CurriculumSourceDocumentRecord[];
  }>;
  getCurriculumTopicAndObjectiveCounts(
    principal: VerifiedTenantPrincipal,
    params: { curriculumVersionId: string; subjectId: string; classGradeName?: string }
  ): Promise<{ totalTopics: number; totalLearningObjectives: number }>;
}

export interface CurriculumAuditLoggerPort {
  recordEvent(
    actor: VerifiedTenantPrincipal,
    input: {
      action: string;
      targetResource: string;
      outcome: 'success' | 'failure' | 'blocked';
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
}

export class CurriculumDatabaseAccessAdapter {
  constructor(readonly repository: CentralCurriculumRepository) {}
}

export class CurriculumSourceImportAdapter {
  constructor(private readonly pool: DatabasePool) {}

  async importNerdcBaseline(
    actor: VerifiedTenantPrincipal,
    datasets?: readonly SubjectCurriculum[]
  ): Promise<CurriculumMigrationReport> {
    return migrateNerdcDatasetsToPostgres(this.pool, actor, datasets);
  }
}

export class CurriculumVersionManagementAdapter {
  constructor(private readonly repo: CentralCurriculumRepository) {}

  createDraftVersion(
    actor: VerifiedTenantPrincipal,
    input: Parameters<CentralCurriculumRepository['createVersion']>[1]
  ): Promise<CurriculumVersionRecord> {
    return this.repo.createVersion(actor, input);
  }

  submitForReview(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return this.repo.submitVersionForReview(actor, versionId, notes);
  }

  approveVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return this.repo.approveVersion(actor, versionId, notes);
  }

  publishVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string
  ): Promise<CurriculumVersionRecord> {
    return this.repo.publishVersion(actor, versionId);
  }

  supersedeVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    supersededByVersionId?: string | null,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    return this.repo.supersedeVersion(actor, versionId, supersededByVersionId, notes);
  }
}

export class CurriculumRetrievalAdapter implements CurriculumRetrievalPort {
  constructor(private readonly repo: CentralCurriculumRepository) {}

  listCountries(principal: VerifiedTenantPrincipal, params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResult<CurriculumCountryRecord>> {
    return this.repo.listCountries(principal, params);
  }

  listAuthorities(principal: VerifiedTenantPrincipal, params?: { countryId?: string; page?: number; limit?: number; search?: string }): Promise<PaginatedResult<CurriculumEducationAuthorityRecord>> {
    return this.repo.listAuthorities(principal, params);
  }

  listFrameworks(principal: VerifiedTenantPrincipal, params?: { countryId?: string; authorityId?: string; status?: string; page?: number; limit?: number; search?: string }): Promise<PaginatedResult<CurriculumFrameworkRecord>> {
    return this.repo.listFrameworks(principal, params);
  }

  listGrades(principal: VerifiedTenantPrincipal, params?: { frameworkId?: string; levelCode?: string; page?: number; limit?: number }): Promise<PaginatedResult<CurriculumClassGradeRecord>> {
    return this.repo.listGrades(principal, params);
  }

  listVersions(principal: VerifiedTenantPrincipal, params?: { frameworkId?: string; status?: string; includeChangeHistory?: boolean; page?: number; limit?: number }) {
    return this.repo.listVersions(principal, params);
  }

  listSubjects(principal: VerifiedTenantPrincipal, params?: CurriculumFilterParams): Promise<PaginatedResult<CurriculumSubjectSummary>> {
    return this.repo.listSubjects(principal, params);
  }

  getSubjectDetail(principal: VerifiedTenantPrincipal, subjectIdOrCode: string, options?: { versionId?: string; classGrade?: string }): Promise<CurriculumSubjectDetail | undefined> {
    return this.repo.getSubjectDetail(principal, subjectIdOrCode, options);
  }

  listTopics(principal: VerifiedTenantPrincipal, params?: CurriculumFilterParams): Promise<PaginatedResult<CurriculumTopicRecord>> {
    return this.repo.listTopics(principal, params);
  }

  listObjectives(principal: VerifiedTenantPrincipal, params?: CurriculumFilterParams): Promise<PaginatedResult<CurriculumLearningObjectiveRecord>> {
    return this.repo.listObjectives(principal, params);
  }

  listCompetencies(principal: VerifiedTenantPrincipal, params?: Parameters<CentralCurriculumRepository['listCompetencies']>[1]): Promise<PaginatedResult<CurriculumCompetencyRecord>> {
    return this.repo.listCompetencies(principal, params);
  }

  listSourceDocuments(principal: VerifiedTenantPrincipal, params?: Parameters<CentralCurriculumRepository['listSourceDocuments']>[1]): Promise<PaginatedResult<CurriculumSourceDocumentRecord>> {
    return this.repo.listSourceDocuments(principal, params);
  }

  /**
   * Authoritative generation gate: enforces that curriculum is BOTH editorially approved
   * AND published (never draft, under_review, rejected, or superseded).
   */
  async getSubjectForApprovedPublishedCurriculum(
    principal: VerifiedTenantPrincipal,
    subjectIdOrCode: string,
    options: { versionId?: string; classGrade?: string } = {}
  ): Promise<{
    subject: CurriculumSubjectDetail;
    grade: CurriculumClassGradeRecord;
    topicsForGrade: CurriculumTopicRecord[];
    competencies: CurriculumCompetencyRecord[];
    sourceDocuments: CurriculumSourceDocumentRecord[];
  }> {
    const subject = await this.repo.getSubjectDetail(principal, subjectIdOrCode, {
      versionId: options.versionId,
      classGrade: options.classGrade
    });
    if (!subject) {
      throw new CentralCurriculumError(
        'NOT_FOUND',
        `Curriculum subject '${subjectIdOrCode}' was not found in the Central Curriculum Database.`
      );
    }

    if (subject.version.status !== 'published' || subject.version.editorialApprovalStatus !== 'approved') {
      throw new CentralCurriculumError(
        'VALIDATION_ERROR',
        `Curriculum version '${subject.version.id}' must be both 'approved' and 'published' before textbook generation (current status='${subject.version.status}', approval='${subject.version.editorialApprovalStatus}').`
      );
    }

    const gradesResult = await this.repo.listGrades(principal, {
      frameworkId: subject.frameworkId,
      limit: 50
    });
    const requestedGrade = (options.classGrade || '').trim().toLowerCase();
    const grade = gradesResult.items.find(
      g => g.name.toLowerCase() === requestedGrade || g.code.toLowerCase() === requestedGrade
    );
    if (!grade) {
      throw new CentralCurriculumError(
        'VALIDATION_ERROR',
        `Class grade '${options.classGrade || ''}' is not registered for framework '${subject.frameworkId}'.`
      );
    }

    const topicsForGrade = subject.themes
      .flatMap(th => th.topics)
      .filter(t => t.classGradeName.toLowerCase() === grade.name.toLowerCase());
    if (topicsForGrade.length === 0) {
      throw new CentralCurriculumError(
        'VALIDATION_ERROR',
        `No approved curriculum topics found for '${subject.name}' (${grade.name}) in version '${subject.curriculumVersionId}'.`
      );
    }

    const [compRes, docRes] = await Promise.all([
      this.repo.listCompetencies(principal, {
        versionId: subject.curriculumVersionId,
        subjectId: subject.id,
        limit: 100
      }),
      this.repo.listSourceDocuments(principal, {
        versionId: subject.curriculumVersionId,
        frameworkId: subject.frameworkId,
        limit: 20
      })
    ]);

    return {
      subject: {
        ...subject,
        competencies: compRes.items,
        sourceDocuments: docRes.items
      },
      grade,
      topicsForGrade,
      competencies: compRes.items,
      sourceDocuments: docRes.items
    };
  }

  async getCurriculumTopicAndObjectiveCounts(
    principal: VerifiedTenantPrincipal,
    params: { curriculumVersionId: string; subjectId: string; classGradeName?: string }
  ): Promise<{ totalTopics: number; totalLearningObjectives: number }> {
    const topicsResult = await this.repo.listTopics(principal, {
      versionId: params.curriculumVersionId,
      subjectId: params.subjectId,
      gradeName: params.classGradeName,
      limit: 100
    });
    const topics = topicsResult.items;
    const totalLearningObjectives = topics.reduce(
      (sum, topic) => sum + (topic.objectives?.length || 0),
      0
    );
    return {
      totalTopics: Math.max(topicsResult.pagination.total, topics.length),
      totalLearningObjectives
    };
  }
}

export class CurriculumCoverageValidationAdapter {
  constructor(private readonly repo: CentralCurriculumRepository) {}

  async getCoverage(
    principal: VerifiedTenantPrincipal,
    params?: { frameworkId?: string; versionId?: string; subjectId?: string; page?: number; limit?: number }
  ): Promise<PaginatedResult<CurriculumCoverageSummaryRecord>> {
    return this.repo.getCoverage(principal, params);
  }

  async validateSubjectProgressionCompleteness(
    principal: VerifiedTenantPrincipal,
    subjectIdOrCode: string,
    versionId?: string
  ): Promise<{ valid: boolean; issues: string[]; totalTopics: number; totalObjectives: number }> {
    const detail = await this.repo.getSubjectDetail(principal, subjectIdOrCode, { versionId });
    if (!detail) {
      return {
        valid: false,
        issues: [`Curriculum subject '${subjectIdOrCode}' not found.`],
        totalTopics: 0,
        totalObjectives: 0
      };
    }
    const issues: string[] = [];
    const topics = detail.themes.flatMap(th => th.topics);
    if (topics.length === 0) issues.push('Subject contains zero curriculum topics.');
    const missingObjectives = topics.filter(t => !t.objectives || t.objectives.length === 0);
    if (missingObjectives.length > 0) {
      issues.push(`${missingObjectives.length} topic(s) lack explicit learning/performance objectives.`);
    }
    return {
      valid: issues.length === 0,
      issues,
      totalTopics: detail.topicCount ?? topics.length,
      totalObjectives: detail.objectiveCount ?? topics.reduce((s, t) => s + t.objectives.length, 0)
    };
  }
}

export class CurriculumPublicationApprovalAdapter {
  constructor(private readonly versionMgmt: CurriculumVersionManagementAdapter) {}

  async approveAndPublish(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    await this.versionMgmt.approveVersion(actor, versionId, notes);
    return this.versionMgmt.publishVersion(actor, versionId);
  }
}

export class CurriculumAuditLoggingAdapter implements CurriculumAuditLoggerPort {
  constructor(private readonly pool: DatabasePool) {}

  async recordEvent(
    actor: VerifiedTenantPrincipal,
    input: {
      action: string;
      targetResource: string;
      outcome: 'success' | 'failure' | 'blocked';
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await withControlPlaneTransaction(this.pool, actor, async client => {
      await client.query(
        `INSERT INTO control_plane.audit_logs
           (actor_email, action, target_resource, metadata_json, tenant_id, actor_id, outcome)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        [
          actor.email || actor.userId || 'platform_administrator',
          input.action,
          input.targetResource,
          JSON.stringify(input.metadata || {}),
          actor.tenantId || 'control-plane',
          actor.userId || null,
          input.outcome
        ]
      );
    });
  }
}
