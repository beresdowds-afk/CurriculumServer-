import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import type { CurriculumRetrievalPort } from '../curriculum/centralCurriculumAdapters';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import { CurriculumRetrievalAdapter } from '../curriculum/centralCurriculumAdapters';
import type { CentralTextbookCoverageManifest } from './centralTextbookTypes';

/**
 * Evaluates and persists curriculum-to-textbook coverage manifests.
 * Curriculum topic/objective totals are retrieved strictly via CurriculumRetrievalPort
 * (never querying curriculum SQL tables directly from the textbook domain).
 * Question Bank records are completely excluded by design.
 */
export class CentralTextbookCoverageService {
  private readonly curriculumPort: CurriculumRetrievalPort;

  constructor(
    private readonly pool: DatabasePool,
    curriculumPort?: CurriculumRetrievalPort
  ) {
    this.curriculumPort = curriculumPort || new CurriculumRetrievalAdapter(new CentralCurriculumRepository(pool));
  }

  async recomputeAndPersistCoverage(
    actor: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookCoverageManifest> {
    const bookRow = await withControlPlaneTransaction(this.pool, actor, async client => {
      const tbRes = await client.query(
        `SELECT id, curriculum_version_id, subject_id, class_grade_name
         FROM production.central_textbooks
         WHERE id = $1`,
        [textbookId]
      );
      if (tbRes.rowCount === 0) {
        throw new Error(`Textbook ${textbookId} not found`);
      }
      return tbRes.rows[0];
    });

    // Retrieve curriculum requirements strictly through the Central Curriculum service port
    const curriculumCounts = await this.curriculumPort.getCurriculumTopicAndObjectiveCounts(actor, {
      curriculumVersionId: bookRow.curriculum_version_id,
      subjectId: bookRow.subject_id,
      classGradeName: bookRow.class_grade_name
    });

    const totalRequiredTopics = curriculumCounts.totalTopics;
    const totalLearningObjectives = curriculumCounts.totalLearningObjectives;

    return withControlPlaneTransaction(this.pool, actor, async client => {
      const chRes = await client.query(
        `SELECT id, topic_ids, learning_objective_ids, learning_objectives
         FROM production.central_textbook_chapters
         WHERE textbook_id = $1`,
        [textbookId]
      );
      const outlineTopicIds = new Set<string>();
      const outlineObjectiveIds = new Set<string>();
      for (const ch of chRes.rows) {
        for (const tId of ch.topic_ids || []) outlineTopicIds.add(String(tId));
        for (const oId of ch.learning_objective_ids || []) outlineObjectiveIds.add(String(oId));
      }

      const secStats = await client.query<{
        chapter_count_with_sections: string;
        awaiting_review: string;
        approved_count: string;
        rejected_count: string;
      }>(
        `SELECT count(DISTINCT chapter_id)::text AS chapter_count_with_sections,
                count(*) FILTER (WHERE review_status = 'pending')::text AS awaiting_review,
                count(*) FILTER (WHERE review_status = 'approved')::text AS approved_count,
                count(*) FILTER (WHERE review_status = 'rejected')::text AS rejected_count
         FROM production.central_textbook_sections
         WHERE textbook_id = $1`,
        [textbookId]
      );

      const mapStats = await client.query<{
        mapped_objectives: string;
        covered_topics: string;
      }>(
        `SELECT count(DISTINCT learning_objective_id)::text AS mapped_objectives,
                count(DISTINCT topic_id) FILTER (WHERE topic_id IS NOT NULL)::text AS covered_topics
         FROM production.central_textbook_objective_mappings
         WHERE textbook_id = $1`,
        [textbookId]
      );

      const topicsIncludedInOutline = outlineTopicIds.size > 0 ? outlineTopicIds.size : chRes.rows.length;
      const mappedFromTable = Number(mapStats.rows[0]?.mapped_objectives || 0);
      const objectivesMappedToContent = mappedFromTable > 0 ? mappedFromTable : outlineObjectiveIds.size;
      const coveredFromTable = Number(mapStats.rows[0]?.covered_topics || 0);
      const topicsCoveredBySections = coveredFromTable > 0
        ? coveredFromTable
        : Number(secStats.rows[0]?.chapter_count_with_sections || 0);

      const denominator = totalLearningObjectives > 0 ? totalLearningObjectives : Math.max(1, totalRequiredTopics);
      const numerator = totalLearningObjectives > 0 ? objectivesMappedToContent : topicsCoveredBySections;
      const coveragePercentage = Math.min(100, Number(((numerator / denominator) * 100).toFixed(2)));

      const missingRequirements: string[] = [];
      if (chRes.rows.length === 0) missingRequirements.push('No chapters created in textbook outline.');
      if (Number(secStats.rows[0]?.chapter_count_with_sections || 0) < chRes.rows.length) {
        missingRequirements.push('One or more chapters are missing generated/authored sections.');
      }
      if (Number(secStats.rows[0]?.awaiting_review || 0) > 0) {
        missingRequirements.push(`${secStats.rows[0].awaiting_review} section(s) awaiting editorial review.`);
      }
      if (Number(secStats.rows[0]?.rejected_count || 0) > 0) {
        missingRequirements.push(`${secStats.rows[0].rejected_count} rejected section(s) require remediation.`);
      }

      const sectionsAwaitingReview = Number(secStats.rows[0]?.awaiting_review || 0);
      const approvedContentCount = Number(secStats.rows[0]?.approved_count || 0);
      const rejectedContentCount = Number(secStats.rows[0]?.rejected_count || 0);

      const upsertRes = await client.query(
        `INSERT INTO production.central_textbook_coverage_manifests
           (textbook_id, curriculum_version_id, subject_id, class_grade_name,
            total_required_topics, topics_included_in_outline, topics_covered_by_sections,
            total_learning_objectives, objectives_mapped_to_content, coverage_percentage,
            missing_requirements, sections_awaiting_review, approved_content_count,
            rejected_content_count, last_evaluated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, now())
         ON CONFLICT (textbook_id) DO UPDATE SET
           total_required_topics = EXCLUDED.total_required_topics,
           topics_included_in_outline = EXCLUDED.topics_included_in_outline,
           topics_covered_by_sections = EXCLUDED.topics_covered_by_sections,
           total_learning_objectives = EXCLUDED.total_learning_objectives,
           objectives_mapped_to_content = EXCLUDED.objectives_mapped_to_content,
           coverage_percentage = EXCLUDED.coverage_percentage,
           missing_requirements = EXCLUDED.missing_requirements,
           sections_awaiting_review = EXCLUDED.sections_awaiting_review,
           approved_content_count = EXCLUDED.approved_content_count,
           rejected_content_count = EXCLUDED.rejected_content_count,
           last_evaluated_at = now()
         RETURNING *`,
        [
          textbookId,
          bookRow.curriculum_version_id,
          bookRow.subject_id,
          bookRow.class_grade_name,
          totalRequiredTopics,
          topicsIncludedInOutline,
          topicsCoveredBySections,
          totalLearningObjectives,
          objectivesMappedToContent,
          coveragePercentage,
          JSON.stringify(missingRequirements),
          sectionsAwaitingReview,
          approvedContentCount,
          rejectedContentCount
        ]
      );

      const row = upsertRes.rows[0];
      return {
        textbookId: row.textbook_id,
        curriculumVersionId: row.curriculum_version_id,
        subjectId: row.subject_id,
        classGradeName: row.class_grade_name,
        totalRequiredTopics: Number(row.total_required_topics),
        topicsIncludedInOutline: Number(row.topics_included_in_outline),
        topicsCoveredBySections: Number(row.topics_covered_by_sections),
        totalLearningObjectives: Number(row.total_learning_objectives),
        objectivesMappedToContent: Number(row.objectives_mapped_to_content),
        coveragePercentage: Number(row.coverage_percentage),
        missingRequirements: row.missing_requirements || [],
        sectionsAwaitingReview: Number(row.sections_awaiting_review),
        approvedContentCount: Number(row.approved_content_count),
        rejectedContentCount: Number(row.rejected_content_count),
        lastEvaluatedAt: row.last_evaluated_at instanceof Date ? row.last_evaluated_at.toISOString() : String(row.last_evaluated_at)
      };
    });
  }
}
