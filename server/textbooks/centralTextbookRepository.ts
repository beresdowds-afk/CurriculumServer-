import type { DatabaseClient, DatabasePool } from '../db/postgres';
import {
  withControlPlaneTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from '../db/tenantContext';
import { normalizePagination } from '../curriculum/centralCurriculumRepository';
import type { PaginatedResult } from '../curriculum/centralCurriculumTypes';
import type {
  CentralContributorRecord,
  CentralTextbookChapterRecord,
  CentralTextbookCitation,
  CentralTextbookCoverageManifest,
  CentralTextbookDetail,
  CentralTextbookEditorialReviewRecord,
  CentralTextbookFilterParams,
  CentralTextbookGenerationJob,
  CentralTextbookGlossaryRecord,
  CentralTextbookIllustrationRecord,
  CentralTextbookMediaAsset,
  CentralTextbookObjectiveMapping,
  CentralTextbookRevisionRecord,
  CentralTextbookSectionRecord,
  CentralTextbookSummary,
  CentralTextbookValidationReport,
  CentralTextbookVersionRecord,
  GenerationJobStatus,
  GenerationJobType,
  InstructionalTableSpec,
  RevisionExerciseSpec,
  SectionIllustrationSpec,
  TextbookProvenanceKind,
  TextbookPublicationStatus
} from './centralTextbookTypes';

export class CentralTextbookError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'VALIDATION_ERROR'
      | 'APPROVAL_REQUIRED'
      | 'FORBIDDEN'
      | 'CONFLICT',
    message: string
  ) {
    super(message);
    this.name = 'CentralTextbookError';
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}

function mapTextbookSummary(row: any): CentralTextbookSummary {
  return {
    id: row.id,
    frameworkId: row.framework_id,
    curriculumVersionId: row.curriculum_version_id,
    educationLevelId: row.education_level_id,
    subjectId: row.subject_id,
    classGradeId: row.class_grade_id,
    classGradeName: row.class_grade_name,
    subjectName: row.subject_name,
    publisherId: row.publisher_id || null,
    publisherName: row.publisher_name || null,
    title: row.title,
    subtitle: row.subtitle || null,
    description: row.description || '',
    academicYear: row.academic_year || '',
    currentVersion: row.current_version,
    publicationStatus: row.publication_status,
    editorialApprovalStatus: row.editorial_approval_status,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at ? toIso(row.approved_at) : null,
    publishedBy: row.published_by || null,
    publishedAt: row.published_at ? toIso(row.published_at) : null,
    withdrawalAt: row.withdrawal_at ? toIso(row.withdrawal_at) : null,
    supersededByTextbookId: row.superseded_by_textbook_id || null,
    copyrightHolder: row.copyright_holder,
    licenseType: row.license_type,
    licenseMetadata: row.license_metadata || {},
    provenanceKind: row.provenance_kind,
    isVerifiedAuthoritative: Boolean(row.is_verified_authoritative),
    geminiModel: row.gemini_model || null,
    promptVersion: row.prompt_version || null,
    generationConfig: row.generation_config || {},
    validationPassed: Boolean(row.validation_passed),
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapGenerationJob(row: any): CentralTextbookGenerationJob {
  return {
    id: row.id,
    textbookId: row.textbook_id || null,
    curriculumVersionId: row.curriculum_version_id,
    subjectId: row.subject_id,
    classGradeName: row.class_grade_name,
    jobType: row.job_type,
    status: row.status,
    progressPercent: Number(row.progress_percent ?? 0),
    currentStep: row.current_step || '',
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 3),
    lastError: row.last_error || null,
    idempotencyKey: row.idempotency_key || null,
    geminiModel: row.gemini_model || null,
    promptVersion: row.prompt_version || null,
    generationConfig: row.generation_config || {},
    validationReportId: row.validation_report_id || null,
    payload: row.payload || {},
    checkpointData: row.checkpoint_data || {},
    initiatedBy: row.initiated_by,
    startedAt: row.started_at ? toIso(row.started_at) : null,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapCoverageManifest(row: any): CentralTextbookCoverageManifest {
  return {
    textbookId: row.textbook_id,
    curriculumVersionId: row.curriculum_version_id,
    subjectId: row.subject_id,
    classGradeName: row.class_grade_name,
    totalRequiredTopics: Number(row.total_required_topics ?? 0),
    topicsIncludedInOutline: Number(row.topics_included_in_outline ?? 0),
    topicsCoveredBySections: Number(row.topics_covered_by_sections ?? 0),
    totalLearningObjectives: Number(row.total_learning_objectives ?? 0),
    objectivesMappedToContent: Number(row.objectives_mapped_to_content ?? 0),
    coveragePercentage: Number(row.coverage_percentage ?? 0),
    missingRequirements: row.missing_requirements || [],
    sectionsAwaitingReview: Number(row.sections_awaiting_review ?? 0),
    approvedContentCount: Number(row.approved_content_count ?? 0),
    rejectedContentCount: Number(row.rejected_content_count ?? 0),
    lastEvaluatedAt: toIso(row.last_evaluated_at)
  };
}

export class CentralTextbookRepository {
  constructor(private readonly pool: DatabasePool) {}

  private isControlPlane(principal: VerifiedTenantPrincipal): boolean {
    return principal.role === 'super_admin';
  }

  private async runRead<T>(
    principal: VerifiedTenantPrincipal,
    fn: (client: DatabaseClient) => Promise<T>
  ): Promise<T> {
    if (this.isControlPlane(principal)) {
      return withControlPlaneTransaction(this.pool, principal, fn);
    }
    return withTenantTransaction(this.pool, principal, fn);
  }

  async listTextbooks(
    principal: VerifiedTenantPrincipal,
    params: CentralTextbookFilterParams = {}
  ): Promise<PaginatedResult<CentralTextbookSummary>> {
    const { page, limit, offset } = normalizePagination(params.page, params.limit);
    const controlPlane = this.isControlPlane(principal);

    return this.runRead(principal, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (!controlPlane) {
        conditions.push(`tb.publication_status = 'published'`);
      } else if (params.publicationStatus) {
        values.push(params.publicationStatus);
        conditions.push(`tb.publication_status = $${values.length}`);
      }

      if (params.frameworkId?.trim()) {
        values.push(params.frameworkId.trim());
        conditions.push(`tb.framework_id = $${values.length}`);
      }
      if (params.curriculumVersionId?.trim()) {
        values.push(params.curriculumVersionId.trim());
        conditions.push(`tb.curriculum_version_id = $${values.length}`);
      }
      if (params.subjectId?.trim()) {
        values.push(params.subjectId.trim());
        conditions.push(`tb.subject_id = $${values.length}`);
      }
      if (params.classGrade?.trim() && params.classGrade !== 'all') {
        values.push(params.classGrade.trim());
        conditions.push(`tb.class_grade_name = $${values.length}`);
      }
      if (params.search?.trim()) {
        values.push(`%${params.search.trim()}%`);
        conditions.push(`(tb.title ILIKE $${values.length} OR tb.subject_name ILIKE $${values.length} OR tb.description ILIKE $${values.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM production.central_textbooks tb ${where}`,
        values
      );
      const total = Number(countResult.rows[0]?.count || 0);

      const rows = await client.query(
        `SELECT tb.*, p.name AS publisher_name
         FROM production.central_textbooks tb
         LEFT JOIN production.central_publishers p ON p.id = tb.publisher_id
         ${where}
         ORDER BY tb.updated_at DESC, tb.title ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      );

      return {
        items: rows.rows.map(mapTextbookSummary),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      };
    });
  }

  async getTextbookById(
    principal: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookDetail | undefined> {
    const controlPlane = this.isControlPlane(principal);
    return this.runRead(principal, async client => {
      const tbRes = await client.query(
        `SELECT tb.*, p.name AS publisher_name
         FROM production.central_textbooks tb
         LEFT JOIN production.central_publishers p ON p.id = tb.publisher_id
         WHERE tb.id = $1 ${controlPlane ? '' : `AND tb.publication_status = 'published'`}`,
        [textbookId]
      );
      if (tbRes.rowCount === 0) return undefined;
      const summary = mapTextbookSummary(tbRes.rows[0]);

      const contribRes = await client.query(
        `SELECT c.author_id, a.full_name, a.affiliation, c.role, c.contribution_order
         FROM production.central_textbook_contributors c
         JOIN production.central_authors a ON a.id = c.author_id
         WHERE c.textbook_id = $1
         ORDER BY c.contribution_order ASC`,
        [textbookId]
      );
      const contributors: CentralContributorRecord[] = contribRes.rows.map(r => ({
        authorId: r.author_id,
        fullName: r.full_name,
        affiliation: r.affiliation || '',
        role: r.role,
        contributionOrder: Number(r.contribution_order ?? 0)
      }));

      const chRes = await client.query(
        `SELECT * FROM production.central_textbook_chapters
         WHERE textbook_id = $1
         ORDER BY chapter_number ASC`,
        [textbookId]
      );
      const secRes = await client.query(
        `SELECT * FROM production.central_textbook_sections
         WHERE textbook_id = $1
         ORDER BY section_number ASC`,
        [textbookId]
      );
      const blkRes = await client.query(
        `SELECT * FROM production.central_textbook_content_blocks
         WHERE textbook_id = $1
         ORDER BY block_order ASC`,
        [textbookId]
      );

      const blocksBySec = new Map<string, any[]>();
      for (const b of blkRes.rows) {
        const list = blocksBySec.get(b.section_id) || [];
        list.push({
          id: b.id,
          blockOrder: Number(b.block_order ?? 0),
          blockType: b.block_type,
          content: b.content || {}
        });
        blocksBySec.set(b.section_id, list);
      }

      const sectionsByChapter = new Map<string, CentralTextbookSectionRecord[]>();
      for (const s of secRes.rows) {
        const list = sectionsByChapter.get(s.chapter_id) || [];
        list.push({
          id: s.id,
          textbookId: s.textbook_id,
          chapterId: s.chapter_id,
          sectionNumber: Number(s.section_number),
          title: s.title,
          contentMarkdown: s.content_markdown || '',
          examples: s.examples || [],
          workedSolutions: s.worked_solutions || [],
          practicalActivities: s.practical_activities || [],
          instructionalTables: s.instructional_tables || [],
          illustrationSpecs: s.illustration_specs || [],
          keyVocabulary: s.key_vocabulary || [],
          commonMisconceptions: s.common_misconceptions || [],
          contentBlocks: blocksBySec.get(s.id) || [],
          reviewStatus: s.review_status,
          reviewerId: s.reviewer_id || null,
          reviewerNotes: s.reviewer_notes || null,
          reviewedAt: s.reviewed_at ? toIso(s.reviewed_at) : null,
          updatedAt: toIso(s.updated_at)
        });
        sectionsByChapter.set(s.chapter_id, list);
      }

      const chapters: CentralTextbookChapterRecord[] = chRes.rows.map(c => ({
        id: c.id,
        textbookId: c.textbook_id,
        chapterNumber: Number(c.chapter_number),
        title: c.title,
        summary: c.summary || '',
        introductoryExplanation: c.introductory_explanation || '',
        chapterSummary: c.chapter_summary || '',
        revisionExercises: c.revision_exercises || [],
        topicIds: c.topic_ids || [],
        learningObjectiveIds: c.learning_objective_ids || [],
        learningObjectives: c.learning_objectives || [],
        status: c.status,
        sections: sectionsByChapter.get(c.id) || []
      }));

      const mapRes = await client.query(
        `SELECT id, chapter_id, section_id, topic_id, learning_objective_id, mapping_strength
         FROM production.central_textbook_objective_mappings
         WHERE textbook_id = $1`,
        [textbookId]
      );
      const objectiveMappings: CentralTextbookObjectiveMapping[] = mapRes.rows.map(m => ({
        id: m.id,
        chapterId: m.chapter_id,
        sectionId: m.section_id || null,
        topicId: m.topic_id || null,
        learningObjectiveId: m.learning_objective_id,
        mappingStrength: m.mapping_strength
      }));

      const mediaRes = await client.query(
        `SELECT * FROM production.central_textbook_media_assets
         WHERE textbook_id = $1 ${controlPlane ? '' : `AND access_scope = 'entitled_private'`}
         ORDER BY created_at DESC`,
        [textbookId]
      );
      const mediaAssets: CentralTextbookMediaAsset[] = mediaRes.rows.map(m => ({
        id: m.id,
        textbookId: m.textbook_id,
        chapterId: m.chapter_id || null,
        sectionId: m.section_id || null,
        assetType: m.asset_type,
        title: m.title,
        altText: m.alt_text || '',
        mimeType: m.mime_type,
        storageProvider: m.storage_provider,
        storageKey: m.storage_key,
        checksumSha256: m.checksum_sha256,
        bytesSize: Number(m.bytes_size ?? 0),
        accessScope: m.access_scope,
        uploadedBy: m.uploaded_by,
        createdAt: toIso(m.created_at)
      }));

      const citRes = await client.query(
        `SELECT * FROM production.central_textbook_citations
         WHERE textbook_id = $1
         ORDER BY citation_key ASC`,
        [textbookId]
      );
      const citations: CentralTextbookCitation[] = citRes.rows.map(c => ({
        id: c.id,
        textbookId: c.textbook_id,
        chapterId: c.chapter_id || null,
        citationKey: c.citation_key,
        authorOrSource: c.author_or_source,
        title: c.title,
        publicationYear: c.publication_year || null,
        publisher: c.publisher || null,
        sourceUrl: c.source_url || null,
        licenseNote: c.license_note || null
      }));

      const verRes = await client.query(
        `SELECT * FROM production.central_textbook_versions
         WHERE textbook_id = $1 ${controlPlane ? '' : `AND publication_status = 'published'`}
         ORDER BY created_at DESC`,
        [textbookId]
      );
      const versions: CentralTextbookVersionRecord[] = verRes.rows.map(v => ({
        id: v.id,
        textbookId: v.textbook_id,
        versionNumber: v.version_number,
        curriculumVersionId: v.curriculum_version_id,
        publicationStatus: v.publication_status,
        changelog: v.changelog || '',
        snapshotChecksum: v.snapshot_checksum || null,
        createdBy: v.created_by,
        createdAt: toIso(v.created_at),
        publishedAt: v.published_at ? toIso(v.published_at) : null
      }));

      const covRes = await client.query(
        `SELECT * FROM production.central_textbook_coverage_manifests WHERE textbook_id = $1`,
        [textbookId]
      );
      const coverageManifest = covRes.rowCount ? mapCoverageManifest(covRes.rows[0]) : undefined;

      let editorialReviews: CentralTextbookEditorialReviewRecord[] | undefined;
      let validationReports: CentralTextbookValidationReport[] | undefined;
      let revisions: CentralTextbookRevisionRecord[] | undefined;

      const illRes = await client.query(
        `SELECT * FROM central_textbooks.textbook_illustrations WHERE textbook_id = $1 ORDER BY created_at ASC`,
        [textbookId]
      );
      const illustrations: CentralTextbookIllustrationRecord[] = illRes.rows.map(i => ({
        id: i.id,
        textbookId: i.textbook_id,
        chapterId: i.chapter_id || null,
        sectionId: i.section_id || null,
        learningObjectiveId: i.learning_objective_id || null,
        conceptDescription: i.concept_description,
        caption: i.caption || '',
        labels: i.labels || [],
        targetClassGrade: i.target_class_grade || '',
        ageAppropriatenessNote: i.age_appropriateness_note || '',
        lessonConsistencyVerified: Boolean(i.lesson_consistency_verified),
        mediaAssetId: i.media_asset_id || null,
        generationMetadata: i.generation_metadata || {},
        createdAt: toIso(i.created_at)
      }));

      const glosRes = await client.query(
        `SELECT * FROM central_textbooks.textbook_glossaries WHERE textbook_id = $1 ORDER BY sort_order ASC, term ASC`,
        [textbookId]
      );
      const glossaries: CentralTextbookGlossaryRecord[] = glosRes.rows.map(g => ({
        id: g.id,
        textbookId: g.textbook_id,
        chapterId: g.chapter_id || null,
        term: g.term,
        definition: g.definition,
        pronunciationHint: g.pronunciation_hint || null,
        contextExample: g.context_example || null,
        sortOrder: Number(g.sort_order ?? 0),
        createdAt: toIso(g.created_at)
      }));

      if (controlPlane) {
        const revRes = await client.query(
          `SELECT * FROM production.central_textbook_editorial_reviews
           WHERE textbook_id = $1
           ORDER BY created_at DESC`,
          [textbookId]
        );
        editorialReviews = revRes.rows.map(r => ({
          id: r.id,
          textbookId: r.textbook_id,
          chapterId: r.chapter_id || null,
          sectionId: r.section_id || null,
          reviewerId: r.reviewer_id,
          reviewerRole: r.reviewer_role,
          action: r.action,
          notes: r.notes || '',
          previousStatus: r.previous_status || null,
          newStatus: r.new_status,
          createdAt: toIso(r.created_at)
        }));

        const valRes = await client.query(
          `SELECT * FROM central_textbooks.textbook_validation_reports WHERE textbook_id = $1 ORDER BY validated_at DESC`,
          [textbookId]
        );
        validationReports = valRes.rows.map(v => ({
          id: v.id,
          textbookId: v.textbook_id,
          curriculumVersionId: v.curriculum_version_id,
          overallPassed: Boolean(v.overall_passed),
          readinessScore: Number(v.readiness_score ?? 0),
          findings: v.findings || [],
          summary: v.summary || {},
          validatedBy: v.validated_by,
          validatedAt: toIso(v.validated_at)
        }));

        const tRevRes = await client.query(
          `SELECT * FROM central_textbooks.textbook_revisions WHERE textbook_id = $1 ORDER BY revision_number DESC`,
          [textbookId]
        );
        revisions = tRevRes.rows.map(tr => ({
          id: tr.id,
          textbookId: tr.textbook_id,
          revisionNumber: Number(tr.revision_number),
          previousVersionNumber: tr.previous_version_number || null,
          newVersionNumber: tr.new_version_number,
          revisionType: tr.revision_type,
          summary: tr.summary || '',
          diffMetadata: tr.diff_metadata || {},
          createdBy: tr.created_by,
          createdAt: toIso(tr.created_at)
        }));
      }

      return {
        ...summary,
        contributors,
        chapters,
        objectiveMappings,
        mediaAssets,
        citations,
        versions,
        illustrations,
        glossaries,
        coverageManifest,
        ...(editorialReviews ? { editorialReviews } : {}),
        ...(validationReports ? { validationReports } : {}),
        ...(revisions ? { revisions } : {})
      };
    });
  }

  async getCoverageManifest(
    principal: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookCoverageManifest | undefined> {
    const controlPlane = this.isControlPlane(principal);
    return this.runRead(principal, async client => {
      const res = await client.query(
        `SELECT cm.*
         FROM production.central_textbook_coverage_manifests cm
         JOIN production.central_textbooks tb ON tb.id = cm.textbook_id
         WHERE cm.textbook_id = $1 ${controlPlane ? '' : `AND tb.publication_status = 'published'`}`,
        [textbookId]
      );
      return res.rowCount ? mapCoverageManifest(res.rows[0]) : undefined;
    });
  }

  async listVersions(
    principal: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookVersionRecord[]> {
    const controlPlane = this.isControlPlane(principal);
    return this.runRead(principal, async client => {
      const res = await client.query(
        `SELECT * FROM production.central_textbook_versions
         WHERE textbook_id = $1 ${controlPlane ? '' : `AND publication_status = 'published'`}
         ORDER BY created_at DESC`,
        [textbookId]
      );
      return res.rows.map(v => ({
        id: v.id,
        textbookId: v.textbook_id,
        versionNumber: v.version_number,
        curriculumVersionId: v.curriculum_version_id,
        publicationStatus: v.publication_status,
        changelog: v.changelog || '',
        snapshotChecksum: v.snapshot_checksum || null,
        createdBy: v.created_by,
        createdAt: toIso(v.created_at),
        publishedAt: v.published_at ? toIso(v.published_at) : null
      }));
    });
  }

  async getMediaAsset(
    principal: VerifiedTenantPrincipal,
    textbookId: string,
    assetId: string
  ): Promise<CentralTextbookMediaAsset | undefined> {
    const controlPlane = this.isControlPlane(principal);
    return this.runRead(principal, async client => {
      const res = await client.query(
        `SELECT ma.*
         FROM production.central_textbook_media_assets ma
         JOIN production.central_textbooks tb ON tb.id = ma.textbook_id
         WHERE ma.textbook_id = $1 AND ma.id = $2
           ${controlPlane ? '' : `AND tb.publication_status = 'published' AND ma.access_scope = 'entitled_private'`}`,
        [textbookId, assetId]
      );
      if (res.rowCount === 0) return undefined;
      const m = res.rows[0];
      return {
        id: m.id,
        textbookId: m.textbook_id,
        chapterId: m.chapter_id || null,
        sectionId: m.section_id || null,
        assetType: m.asset_type,
        title: m.title,
        altText: m.alt_text || '',
        mimeType: m.mime_type,
        storageProvider: m.storage_provider,
        storageKey: m.storage_key,
        checksumSha256: m.checksum_sha256,
        bytesSize: Number(m.bytes_size ?? 0),
        accessScope: m.access_scope,
        uploadedBy: m.uploaded_by,
        createdAt: toIso(m.created_at)
      };
    });
  }

  // =========================================================================
  // CONTROL-PLANE EDITORIAL WRITES (Strictly Super-Admin Transaction Context)
  // =========================================================================

  async createTextbookDraft(
    actor: VerifiedTenantPrincipal,
    input: {
      id: string;
      frameworkId: string;
      curriculumVersionId: string;
      educationLevelId: string;
      subjectId: string;
      classGradeId: string;
      classGradeName: string;
      subjectName: string;
      title: string;
      subtitle?: string;
      description: string;
      academicYear?: string;
      publisher?: { id: string; name: string; countryId?: string };
      author?: { id: string; fullName: string; affiliation?: string };
      copyrightHolder?: string;
      licenseType?: string;
      provenanceKind?: TextbookProvenanceKind;
      geminiModel?: string | null;
      promptVersion?: string | null;
      generationConfig?: Record<string, unknown>;
      initialStatus?: 'draft' | 'generated';
      chapters: Array<{
        id: string;
        chapterNumber: number;
        title: string;
        summary: string;
        introductoryExplanation?: string;
        topicIds: string[];
        learningObjectiveIds: string[];
        learningObjectives: string[];
      }>;
    }
  ): Promise<CentralTextbookDetail> {
    const actorName = actor.email || actor.userId || 'editorial_admin';
    const initialStatus = input.initialStatus === 'generated' ? 'generated' : 'draft';
    await withControlPlaneTransaction(this.pool, actor, async client => {
      let publisherId: string | null = null;
      if (input.publisher) {
        publisherId = input.publisher.id;
        await client.query(
          `INSERT INTO production.central_publishers (id, name, country_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [input.publisher.id, input.publisher.name, input.publisher.countryId || null]
        );
      }

      // Always force non-published initial state & editorial_approval_status = 'pending'
      await client.query(
        `INSERT INTO production.central_textbooks
           (id, framework_id, curriculum_version_id, education_level_id, subject_id,
            class_grade_id, class_grade_name, subject_name, publisher_id, title, subtitle,
            description, current_version, publication_status, editorial_approval_status,
            copyright_holder, license_type, provenance_kind, is_verified_authoritative, created_by,
            academic_year, gemini_model, prompt_version, generation_config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, '1.0.0', $17, 'pending',
                 $13, $14, $15, false, $16, $18, $19, $20, $21::jsonb)`,
        [
          input.id,
          input.frameworkId,
          input.curriculumVersionId,
          input.educationLevelId,
          input.subjectId,
          input.classGradeId,
          input.classGradeName,
          input.subjectName,
          publisherId,
          input.title,
          input.subtitle || null,
          input.description,
          input.copyrightHolder || 'Curriculum Server Editorial Board',
          input.licenseType || 'PROPRIETARY_INSTITUTIONAL',
          input.provenanceKind || 'ai_generated',
          actorName,
          initialStatus,
          input.academicYear || '',
          input.geminiModel || null,
          input.promptVersion || null,
          JSON.stringify(input.generationConfig || {})
        ]
      );

      if (input.author) {
        await client.query(
          `INSERT INTO production.central_authors (id, full_name, affiliation)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
          [input.author.id, input.author.fullName, input.author.affiliation || '']
        );
        await client.query(
          `INSERT INTO production.central_textbook_contributors (textbook_id, author_id, role, contribution_order)
           VALUES ($1, $2, 'lead_author', 1)
           ON CONFLICT (textbook_id, author_id, role) DO NOTHING`,
          [input.id, input.author.id]
        );
      }

      for (const ch of input.chapters) {
        await client.query(
          `INSERT INTO production.central_textbook_chapters
             (id, textbook_id, chapter_number, title, summary, topic_ids,
              learning_objective_ids, learning_objectives, status, introductory_explanation)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, 'draft', $9)`,
          [
            ch.id,
            input.id,
            ch.chapterNumber,
            ch.title,
            ch.summary,
            JSON.stringify(ch.topicIds || []),
            JSON.stringify(ch.learningObjectiveIds || []),
            JSON.stringify(ch.learningObjectives || []),
            ch.introductoryExplanation || ch.summary || ''
          ]
        );
      }

      await client.query(
        `INSERT INTO production.central_textbook_versions
           (textbook_id, version_number, curriculum_version_id, publication_status, changelog, created_by)
         VALUES ($1, '1.0.0', $2, $4, 'Initial generated/authored draft outline', $3)`,
        [input.id, input.curriculumVersionId, actorName, initialStatus]
      );

      await client.query(
        `INSERT INTO central_textbooks.textbook_revisions
           (textbook_id, revision_number, previous_version_number, new_version_number, revision_type, summary, diff_metadata, created_by)
         VALUES ($1, 1, NULL, '1.0.0', 'initial_generation', 'Initial curriculum-grounded textbook creation', $2::jsonb, $3)
         ON CONFLICT (textbook_id, revision_number) DO NOTHING`,
        [
          input.id,
          JSON.stringify({ geminiModel: input.geminiModel || null, promptVersion: input.promptVersion || null }),
          actorName
        ]
      );

      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, 'revision_created', 'Created draft textbook record awaiting content & review.', NULL, $4)`,
        [input.id, actorName, actor.role, initialStatus]
      );
    });

    const created = await this.getTextbookById(actor, input.id);
    if (!created) throw new CentralTextbookError('NOT_FOUND', `Failed to load created textbook ${input.id}`);
    return created;
  }

  async saveChapterSections(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    chapterId: string,
    sections: Array<{
      id: string;
      sectionNumber: number;
      title: string;
      contentMarkdown: string;
      examples: Array<{ title: string; problem: string; solution: string }>;
      workedSolutions: string[];
      practicalActivities: Array<{
        title: string;
        objective: string;
        equipmentNeeded: string[];
        safetyPrecautions: string[];
        procedureSteps: string[];
        expectedObservations: string;
      }>;
      instructionalTables?: InstructionalTableSpec[];
      illustrationSpecs?: SectionIllustrationSpec[];
      keyVocabulary: Array<{ term: string; definition: string }>;
      commonMisconceptions: string[];
      objectiveMappings?: Array<{ topicId?: string | null; learningObjectiveId: string; mappingStrength?: 'primary' | 'supporting' }>;
    }>,
    chapterExtras?: {
      chapterSummary?: string;
      revisionExercises?: RevisionExerciseSpec[];
      citations?: Array<{ citationKey: string; authorOrSource: string; title: string; publicationYear?: string; publisher?: string; sourceUrl?: string }>;
      classGradeName?: string;
      geminiModel?: string | null;
      promptVersion?: string | null;
    }
  ): Promise<CentralTextbookChapterRecord> {
    await withControlPlaneTransaction(this.pool, actor, async client => {
      const chRes = await client.query(
        `SELECT * FROM production.central_textbook_chapters WHERE id = $1 AND textbook_id = $2`,
        [chapterId, textbookId]
      );
      if (chRes.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Chapter ${chapterId} not found on textbook ${textbookId}`);
      }

      let vocabSortOrder = 0;
      for (const sec of sections) {
        await client.query(
          `INSERT INTO production.central_textbook_sections
             (id, textbook_id, chapter_id, section_number, title, content_markdown,
              examples, worked_solutions, practical_activities, key_vocabulary,
              common_misconceptions, review_status, updated_at,
              instructional_tables, illustration_specs)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, 'pending', now(),
                   $12::jsonb, $13::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             content_markdown = EXCLUDED.content_markdown,
             examples = EXCLUDED.examples,
             worked_solutions = EXCLUDED.worked_solutions,
             practical_activities = EXCLUDED.practical_activities,
             key_vocabulary = EXCLUDED.key_vocabulary,
             common_misconceptions = EXCLUDED.common_misconceptions,
             instructional_tables = EXCLUDED.instructional_tables,
             illustration_specs = EXCLUDED.illustration_specs,
             review_status = 'pending',
             updated_at = now()`,
          [
            sec.id,
            textbookId,
            chapterId,
            sec.sectionNumber,
            sec.title,
            sec.contentMarkdown,
            JSON.stringify(sec.examples || []),
            JSON.stringify(sec.workedSolutions || []),
            JSON.stringify(sec.practicalActivities || []),
            JSON.stringify(sec.keyVocabulary || []),
            JSON.stringify(sec.commonMisconceptions || []),
            JSON.stringify(sec.instructionalTables || []),
            JSON.stringify(sec.illustrationSpecs || [])
          ]
        );

        await client.query(
          `DELETE FROM production.central_textbook_content_blocks WHERE section_id = $1`,
          [sec.id]
        );
        await client.query(
          `INSERT INTO production.central_textbook_content_blocks
             (textbook_id, chapter_id, section_id, block_order, block_type, content)
           VALUES ($1, $2, $3, 1, 'narrative', $4::jsonb)`,
          [textbookId, chapterId, sec.id, JSON.stringify({ markdown: sec.contentMarkdown })]
        );

        await client.query(
          `DELETE FROM central_textbooks.textbook_illustrations WHERE section_id = $1`,
          [sec.id]
        );
        for (const ill of sec.illustrationSpecs || []) {
          await client.query(
            `INSERT INTO central_textbooks.textbook_illustrations
               (textbook_id, chapter_id, section_id, learning_objective_id, concept_description,
                caption, labels, target_class_grade, age_appropriateness_note,
                lesson_consistency_verified, generation_metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true, $10::jsonb)`,
            [
              textbookId,
              chapterId,
              sec.id,
              ill.learningObjectiveId || sec.objectiveMappings?.[0]?.learningObjectiveId || null,
              ill.conceptDescription,
              ill.caption || '',
              JSON.stringify(ill.labels || []),
              chapterExtras?.classGradeName || '',
              ill.ageAppropriatenessNote || `Appropriate for ${chapterExtras?.classGradeName || 'target class'}`,
              JSON.stringify({
                geminiModel: chapterExtras?.geminiModel || null,
                promptVersion: chapterExtras?.promptVersion || null
              })
            ]
          );
        }

        for (const vocab of sec.keyVocabulary || []) {
          if (!vocab.term?.trim() || !vocab.definition?.trim()) continue;
          vocabSortOrder += 1;
          await client.query(
            `INSERT INTO central_textbooks.textbook_glossaries
               (textbook_id, chapter_id, term, definition, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (textbook_id, term) DO UPDATE SET
               definition = EXCLUDED.definition,
               chapter_id = EXCLUDED.chapter_id`,
            [textbookId, chapterId, vocab.term.trim(), vocab.definition.trim(), vocabSortOrder]
          );
        }

        for (const mapping of sec.objectiveMappings || []) {
          await client.query(
            `INSERT INTO production.central_textbook_objective_mappings
               (textbook_id, chapter_id, section_id, topic_id, learning_objective_id, mapping_strength)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              textbookId,
              chapterId,
              sec.id,
              mapping.topicId || null,
              mapping.learningObjectiveId,
              mapping.mappingStrength || 'primary'
            ]
          );
        }
      }

      for (const cit of chapterExtras?.citations || []) {
        await client.query(
          `INSERT INTO production.central_textbook_citations
             (textbook_id, chapter_id, citation_key, author_or_source, title, publication_year, publisher, source_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            textbookId,
            chapterId,
            cit.citationKey,
            cit.authorOrSource,
            cit.title,
            cit.publicationYear || null,
            cit.publisher || null,
            cit.sourceUrl || null
          ]
        );
      }

      // Chapter transitions to generated / under_review while textbook remains non-published
      await client.query(
        `UPDATE production.central_textbook_chapters
         SET status = 'generated',
             chapter_summary = COALESCE(NULLIF($2, ''), chapter_summary),
             revision_exercises = CASE WHEN jsonb_array_length($3::jsonb) > 0 THEN $3::jsonb ELSE revision_exercises END,
             updated_at = now()
         WHERE id = $1`,
        [
          chapterId,
          chapterExtras?.chapterSummary || '',
          JSON.stringify(chapterExtras?.revisionExercises || [])
        ]
      );
      await client.query(
        `UPDATE production.central_textbooks
         SET publication_status = CASE WHEN publication_status IN ('draft', 'generating') THEN 'generated' ELSE publication_status END,
             updated_at = now()
         WHERE id = $1`,
        [textbookId]
      );
    });

    const book = await this.getTextbookById(actor, textbookId);
    const updatedChapter = book?.chapters.find(c => c.id === chapterId);
    if (!updatedChapter) throw new CentralTextbookError('NOT_FOUND', `Chapter ${chapterId} not found`);
    return updatedChapter;
  }

  async recordMediaAsset(
    actor: VerifiedTenantPrincipal,
    input: {
      textbookId: string;
      chapterId?: string;
      sectionId?: string;
      assetType: CentralTextbookMediaAsset['assetType'];
      title: string;
      altText?: string;
      mimeType: string;
      storageProvider: string;
      storageKey: string;
      checksumSha256: string;
      bytesSize: number;
      accessScope?: 'editorial_only' | 'entitled_private';
    }
  ): Promise<CentralTextbookMediaAsset> {
    const actorName = actor.email || actor.userId || 'editorial_admin';
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `INSERT INTO production.central_textbook_media_assets
           (textbook_id, chapter_id, section_id, asset_type, title, alt_text, mime_type,
            storage_provider, storage_key, checksum_sha256, bytes_size, access_scope, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          input.textbookId,
          input.chapterId || null,
          input.sectionId || null,
          input.assetType,
          input.title,
          input.altText || '',
          input.mimeType,
          input.storageProvider,
          input.storageKey,
          input.checksumSha256,
          input.bytesSize,
          input.accessScope || 'entitled_private',
          actorName
        ]
      );
      const m = res.rows[0];
      return {
        id: m.id,
        textbookId: m.textbook_id,
        chapterId: m.chapter_id || null,
        sectionId: m.section_id || null,
        assetType: m.asset_type,
        title: m.title,
        altText: m.alt_text || '',
        mimeType: m.mime_type,
        storageProvider: m.storage_provider,
        storageKey: m.storage_key,
        checksumSha256: m.checksum_sha256,
        bytesSize: Number(m.bytes_size ?? 0),
        accessScope: m.access_scope,
        uploadedBy: m.uploaded_by,
        createdAt: toIso(m.created_at)
      };
    });
  }

  async addCitation(
    actor: VerifiedTenantPrincipal,
    input: Omit<CentralTextbookCitation, 'id'>
  ): Promise<CentralTextbookCitation> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `INSERT INTO production.central_textbook_citations
           (textbook_id, chapter_id, citation_key, author_or_source, title, publication_year, publisher, source_url, license_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.textbookId,
          input.chapterId || null,
          input.citationKey,
          input.authorOrSource,
          input.title,
          input.publicationYear || null,
          input.publisher || null,
          input.sourceUrl || null,
          input.licenseNote || null
        ]
      );
      const c = res.rows[0];
      return {
        id: c.id,
        textbookId: c.textbook_id,
        chapterId: c.chapter_id || null,
        citationKey: c.citation_key,
        authorOrSource: c.author_or_source,
        title: c.title,
        publicationYear: c.publication_year || null,
        publisher: c.publisher || null,
        sourceUrl: c.source_url || null,
        licenseNote: c.license_note || null
      };
    });
  }

  async findGenerationJobByIdempotencyKey(
    actor: VerifiedTenantPrincipal,
    idempotencyKey: string
  ): Promise<CentralTextbookGenerationJob | undefined> {
    if (!idempotencyKey.trim()) return undefined;
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `SELECT * FROM production.central_textbook_generation_jobs WHERE idempotency_key = $1 LIMIT 1`,
        [idempotencyKey.trim()]
      );
      return res.rowCount ? mapGenerationJob(res.rows[0]) : undefined;
    });
  }

  // Generation job persistence (control plane)
  async createGenerationJob(
    actor: VerifiedTenantPrincipal,
    input: {
      textbookId?: string | null;
      curriculumVersionId: string;
      subjectId: string;
      classGradeName: string;
      jobType: GenerationJobType;
      maxAttempts?: number;
      payload?: Record<string, unknown>;
      idempotencyKey?: string | null;
      geminiModel?: string | null;
      promptVersion?: string | null;
      generationConfig?: Record<string, unknown>;
    }
  ): Promise<CentralTextbookGenerationJob> {
    const actorName = actor.email || actor.userId || 'editorial_admin';
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `INSERT INTO production.central_textbook_generation_jobs
           (textbook_id, curriculum_version_id, subject_id, class_grade_name, job_type,
            status, progress_percent, current_step, attempt_count, max_attempts, payload,
            checkpoint_data, initiated_by, started_at,
            idempotency_key, gemini_model, prompt_version, generation_config)
         VALUES ($1, $2, $3, $4, $5, 'queued', 0, 'Queued for curriculum validation', 0, $6, $7::jsonb, '{}'::jsonb, $8, now(),
                 $9, $10, $11, $12::jsonb)
         RETURNING *`,
        [
          input.textbookId || null,
          input.curriculumVersionId,
          input.subjectId,
          input.classGradeName,
          input.jobType,
          input.maxAttempts ?? 3,
          JSON.stringify(input.payload || {}),
          actorName,
          input.idempotencyKey || null,
          input.geminiModel || null,
          input.promptVersion || null,
          JSON.stringify(input.generationConfig || {})
        ]
      );
      return mapGenerationJob(res.rows[0]);
    });
  }

  async updateGenerationJob(
    actor: VerifiedTenantPrincipal,
    jobId: string,
    patch: {
      textbookId?: string;
      status?: GenerationJobStatus;
      progressPercent?: number;
      currentStep?: string;
      attemptCount?: number;
      lastError?: string | null;
      checkpointData?: Record<string, unknown>;
      completed?: boolean;
    }
  ): Promise<CentralTextbookGenerationJob> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const existing = await client.query(
        `SELECT * FROM production.central_textbook_generation_jobs WHERE id = $1`,
        [jobId]
      );
      if (existing.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Generation job ${jobId} not found`);
      }
      const prev = existing.rows[0];
      const mergedCheckpoint = patch.checkpointData
        ? { ...(prev.checkpoint_data || {}), ...patch.checkpointData }
        : prev.checkpoint_data || {};

      const updated = await client.query(
        `UPDATE production.central_textbook_generation_jobs
         SET textbook_id = COALESCE($2, textbook_id),
             status = COALESCE($3, status),
             progress_percent = COALESCE($4, progress_percent),
             current_step = COALESCE($5, current_step),
             attempt_count = COALESCE($6, attempt_count),
             last_error = $7,
             checkpoint_data = $8::jsonb,
             completed_at = CASE WHEN $9 THEN now() ELSE completed_at END,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [
          jobId,
          patch.textbookId || null,
          patch.status || null,
          patch.progressPercent ?? null,
          patch.currentStep ?? null,
          patch.attemptCount ?? null,
          patch.lastError === undefined ? prev.last_error : patch.lastError,
          JSON.stringify(mergedCheckpoint),
          Boolean(patch.completed)
        ]
      );
      return mapGenerationJob(updated.rows[0]);
    });
  }

  async getGenerationJob(
    actor: VerifiedTenantPrincipal,
    jobId: string
  ): Promise<CentralTextbookGenerationJob | undefined> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `SELECT * FROM production.central_textbook_generation_jobs WHERE id = $1`,
        [jobId]
      );
      return res.rowCount ? mapGenerationJob(res.rows[0]) : undefined;
    });
  }

  async listGenerationJobs(
    actor: VerifiedTenantPrincipal,
    filter: { status?: GenerationJobStatus; textbookId?: string } = {}
  ): Promise<CentralTextbookGenerationJob[]> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`status = $${values.length}`);
      }
      if (filter.textbookId) {
        values.push(filter.textbookId);
        conditions.push(`textbook_id = $${values.length}`);
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const res = await client.query(
        `SELECT * FROM production.central_textbook_generation_jobs ${where} ORDER BY created_at DESC LIMIT 100`,
        values
      );
      return res.rows.map(mapGenerationJob);
    });
  }

  async markInterruptedJobsForRecovery(
    actor: VerifiedTenantPrincipal
  ): Promise<CentralTextbookGenerationJob[]> {
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const res = await client.query(
        `UPDATE production.central_textbook_generation_jobs
         SET status = 'paused_for_recovery',
             current_step = 'Interrupted before completion; queued for recovery',
             updated_at = now()
         WHERE status IN ('queued', 'running')
         RETURNING *`
      );
      return res.rows.map(mapGenerationJob);
    });
  }

  async saveValidationReport(
    actor: VerifiedTenantPrincipal,
    input: {
      textbookId: string;
      curriculumVersionId: string;
      overallPassed: boolean;
      readinessScore: number;
      findings: unknown[];
      summary: Record<string, unknown>;
    }
  ): Promise<CentralTextbookValidationReport> {
    const actorName = actor.email || actor.userId || 'editorial_validator';
    return withControlPlaneTransaction(this.pool, actor, async client => {
      const inserted = await client.query(
        `INSERT INTO central_textbooks.textbook_validation_reports
           (textbook_id, curriculum_version_id, overall_passed, readiness_score, findings, summary, validated_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
         RETURNING *`,
        [
          input.textbookId,
          input.curriculumVersionId,
          input.overallPassed,
          input.readinessScore,
          JSON.stringify(input.findings || []),
          JSON.stringify(input.summary || {}),
          actorName
        ]
      );
      await client.query(
        `UPDATE production.central_textbooks
         SET validation_passed = $2, updated_at = now()
         WHERE id = $1`,
        [input.textbookId, input.overallPassed]
      );
      const r = inserted.rows[0];
      return {
        id: r.id,
        textbookId: r.textbook_id,
        curriculumVersionId: r.curriculum_version_id,
        overallPassed: Boolean(r.overall_passed),
        readinessScore: Number(r.readiness_score ?? 0),
        findings: r.findings || [],
        summary: r.summary || {},
        validatedBy: r.validated_by,
        validatedAt: toIso(r.validated_at)
      };
    });
  }

  async supersedeTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    supersededByTextbookId?: string | null,
    reason?: string
  ): Promise<CentralTextbookDetail> {
    const actorName = actor.email || actor.userId || 'editorial_admin';
    await withControlPlaneTransaction(this.pool, actor, async client => {
      const existing = await client.query(
        `SELECT current_version, publication_status FROM production.central_textbooks WHERE id = $1`,
        [textbookId]
      );
      if (existing.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
      }
      await client.query(
        `UPDATE production.central_textbooks
         SET publication_status = 'superseded',
             superseded_by_textbook_id = COALESCE($2, superseded_by_textbook_id),
             withdrawal_at = COALESCE(withdrawal_at, now()),
             is_verified_authoritative = false,
             updated_at = now()
         WHERE id = $1`,
        [textbookId, supersededByTextbookId || null]
      );
      await client.query(
        `INSERT INTO central_textbooks.textbook_revisions
           (textbook_id, revision_number, previous_version_number, new_version_number, revision_type, summary, diff_metadata, created_by)
         VALUES ($1,
           COALESCE((SELECT MAX(revision_number) FROM central_textbooks.textbook_revisions WHERE textbook_id = $1), 0) + 1,
           $2, $2, 'superseded', $3, $4::jsonb, $5)`,
        [
          textbookId,
          existing.rows[0].current_version || '1.0.0',
          reason || `Edition superseded${supersededByTextbookId ? ` by ${supersededByTextbookId}` : ''}.`,
          JSON.stringify({ supersededByTextbookId: supersededByTextbookId || null }),
          actorName
        ]
      );
      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, 'superseded', $4, $5, 'superseded')`,
        [
          textbookId,
          actorName,
          actor.role,
          reason || `Edition superseded${supersededByTextbookId ? ` by ${supersededByTextbookId}` : ''}.`,
          existing.rows[0].publication_status
        ]
      );
    });
    const updated = await this.getTextbookById(actor, textbookId);
    if (!updated) throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    return updated;
  }
}
