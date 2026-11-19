import type { DatabaseClient } from '../db/postgres';
import {
  TeachingEvidenceError,
  type ResolvedCurriculumTopic,
  type TopicResolutionOutcome
} from './teachingEvidenceTypes';

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class NerdcCurriculumResolver {
  async resolveCurriculumVersion(
    client: DatabaseClient,
    curriculumVersionId: string
  ): Promise<{ id: string; versionTag: string; status: string }> {
    const res = await client.query<{
      id: string;
      version_tag: string;
      status: string;
    }>(
      `SELECT id, version_tag, status
       FROM production.curriculum_versions
       WHERE id = $1
       LIMIT 1`,
      [curriculumVersionId]
    );
    if (res.rowCount === 0) {
      throw new TeachingEvidenceError(
        'UNRESOLVED_CURRICULUM',
        `Authoritative curriculum version '${curriculumVersionId}' does not exist in Central Curriculum Database.`,
        422,
        { curriculumVersionId }
      );
    }
    return {
      id: res.rows[0].id,
      versionTag: res.rows[0].version_tag,
      status: res.rows[0].status
    };
  }

  async resolveSubject(
    client: DatabaseClient,
    subjectId: string
  ): Promise<{ id: string; name: string; code: string }> {
    const res = await client.query<{ id: string; name: string; code: string }>(
      `SELECT id, name, code
       FROM production.curriculum_subjects
       WHERE id = $1
       LIMIT 1`,
      [subjectId]
    );
    if (res.rowCount === 0) {
      throw new TeachingEvidenceError(
        'UNRESOLVED_CURRICULUM',
        `Authoritative subject '${subjectId}' does not exist in Central Curriculum Database.`,
        422,
        { subjectId }
      );
    }
    return res.rows[0];
  }

  async countCurriculumTopicsForScope(
    client: DatabaseClient,
    params: {
      curriculumVersionId: string;
      subjectId: string;
      classGradeName?: string;
    }
  ): Promise<number> {
    const conditions = ['curriculum_version_id = $1', 'subject_id = $2'];
    const values: unknown[] = [params.curriculumVersionId, params.subjectId];
    if (params.classGradeName?.trim()) {
      values.push(params.classGradeName.trim().toLowerCase());
      conditions.push(`lower(trim(class_grade_name)) = $${values.length}`);
    }
    const res = await client.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM production.curriculum_topics
       WHERE ${conditions.join(' AND ')}`,
      values
    );
    return Number(res.rows[0]?.total ?? 0);
  }

  async listTopicsForVersionSubject(
    client: DatabaseClient,
    params: {
      curriculumVersionId: string;
      subjectId: string;
      classGradeName?: string;
    }
  ): Promise<ResolvedCurriculumTopic[]> {
    const version = await this.resolveCurriculumVersion(client, params.curriculumVersionId);
    const subject = await this.resolveSubject(client, params.subjectId);
    const conditions = ['t.curriculum_version_id = $1', 't.subject_id = $2'];
    const values: unknown[] = [params.curriculumVersionId, params.subjectId];
    if (params.classGradeName?.trim()) {
      values.push(params.classGradeName.trim().toLowerCase());
      conditions.push(`lower(trim(t.class_grade_name)) = $${values.length}`);
    }

    const topicRows = await client.query<{
      id: string;
      title: string;
      class_grade_name: string;
      term: string;
      week: number;
    }>(
      `SELECT t.id, t.title, t.class_grade_name, t.term, t.week
       FROM production.curriculum_topics t
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.week ASC, t.title ASC`,
      values
    );
    if (topicRows.rowCount === 0) return [];

    const topicIds = topicRows.rows.map(r => r.id);
    const objRows = await client.query<{
      id: string;
      topic_id: string;
      description: string;
      objective_type: string;
      bloom_level: string | null;
    }>(
      `SELECT id, topic_id, description, objective_type, bloom_level
       FROM production.curriculum_learning_objectives
       WHERE curriculum_version_id = $1 AND topic_id = ANY($2::text[])
       ORDER BY sort_order ASC, id ASC`,
      [params.curriculumVersionId, topicIds]
    );
    const subRows = await client.query<{
      id: string;
      topic_id: string;
      title: string;
    }>(
      `SELECT id, topic_id, title
       FROM production.curriculum_subtopics
       WHERE curriculum_version_id = $1 AND topic_id = ANY($2::text[])
       ORDER BY sort_order ASC, id ASC`,
      [params.curriculumVersionId, topicIds]
    );

    return topicRows.rows.map(topic => ({
      curriculumVersionId: version.id,
      curriculumVersionTag: version.versionTag,
      curriculumVersionStatus: version.status,
      subjectId: subject.id,
      subjectName: subject.name,
      topicId: topic.id,
      topicTitle: topic.title,
      classGradeName: topic.class_grade_name,
      term: topic.term,
      week: Number(topic.week ?? 1),
      objectives: objRows.rows
        .filter(o => o.topic_id === topic.id)
        .map(o => ({
          id: o.id,
          description: o.description,
          objectiveType: o.objective_type,
          bloomLevel: o.bloom_level
        })),
      subtopics: subRows.rows
        .filter(s => s.topic_id === topic.id)
        .map(s => ({ id: s.id, title: s.title }))
    }));
  }

  /**
   * Resolves a topic strictly against the exact curriculumVersionId recorded on the assignment/delivery.
   * Superseded versions remain resolvable historically so previously verified teaching evidence
   * is never invalidated or silently remapped when a newer NERDC curriculum version releases.
   */
  async resolveTopicForDelivery(
    client: DatabaseClient,
    params: {
      curriculumVersionId: string;
      subjectId: string;
      classGradeName?: string;
      topicId?: string | null;
      topicTitleInput: string;
      manualMapping?: boolean;
    }
  ): Promise<TopicResolutionOutcome> {
    const version = await this.resolveCurriculumVersion(client, params.curriculumVersionId);
    const subject = await this.resolveSubject(client, params.subjectId);

    const loadTopicDetails = async (topicRow: {
      id: string;
      title: string;
      class_grade_name: string;
      term: string;
      week: number;
    }): Promise<ResolvedCurriculumTopic> => {
      const objRows = await client.query<{
        id: string;
        description: string;
        objective_type: string;
        bloom_level: string | null;
      }>(
        `SELECT id, description, objective_type, bloom_level
         FROM production.curriculum_learning_objectives
         WHERE curriculum_version_id = $1 AND topic_id = $2
         ORDER BY sort_order ASC, id ASC`,
        [version.id, topicRow.id]
      );
      const subRows = await client.query<{ id: string; title: string }>(
        `SELECT id, title
         FROM production.curriculum_subtopics
         WHERE curriculum_version_id = $1 AND topic_id = $2
         ORDER BY sort_order ASC, id ASC`,
        [version.id, topicRow.id]
      );
      return {
        curriculumVersionId: version.id,
        curriculumVersionTag: version.versionTag,
        curriculumVersionStatus: version.status,
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topicRow.id,
        topicTitle: topicRow.title,
        classGradeName: topicRow.class_grade_name,
        term: topicRow.term,
        week: Number(topicRow.week ?? 1),
        objectives: objRows.rows.map(o => ({
          id: o.id,
          description: o.description,
          objectiveType: o.objective_type,
          bloomLevel: o.bloom_level
        })),
        subtopics: subRows.rows
      };
    };

    // 1. Explicit topicId lookup MUST match exact curriculum_version_id AND subject_id (never cross-version!)
    if (params.topicId?.trim()) {
      const requestedId = params.topicId.trim();
      const byId = await client.query<{
        id: string;
        subject_id: string;
        curriculum_version_id: string;
        title: string;
        class_grade_name: string;
        term: string;
        week: number;
      }>(
        `SELECT id, subject_id, curriculum_version_id, title, class_grade_name, term, week
         FROM production.curriculum_topics
         WHERE id = $1
         LIMIT 1`,
        [requestedId]
      );
      if (byId.rowCount === 0) {
        return {
          resolutionStatus: 'unresolved',
          resolvedTopic: null,
          reason: `Topic ID '${requestedId}' does not exist in curriculum version '${version.id}'.`
        };
      }
      const row = byId.rows[0];
      if (row.curriculum_version_id !== version.id || row.subject_id !== subject.id) {
        throw new TeachingEvidenceError(
          'UNRESOLVED_CURRICULUM',
          `Topic '${requestedId}' belongs to curriculum version '${row.curriculum_version_id}' / subject '${row.subject_id}', not '${version.id}' / '${subject.id}'. Cross-version topic mapping is forbidden.`,
          422,
          {
            requestedTopicId: requestedId,
            expectedCurriculumVersionId: version.id,
            actualCurriculumVersionId: row.curriculum_version_id,
            expectedSubjectId: subject.id,
            actualSubjectId: row.subject_id
          }
        );
      }
      const resolvedTopic = await loadTopicDetails(row);
      return {
        resolutionStatus: params.manualMapping ? 'manually_mapped' : 'resolved',
        resolvedTopic,
        reason: params.manualMapping
          ? `Manually mapped to NERDC topic '${resolvedTopic.topicTitle}' (${version.id}).`
          : `Resolved deterministically to NERDC topic '${resolvedTopic.topicTitle}' (${version.id}).`
      };
    }

    // 2. Title resolution within exact curriculum_version_id and subject_id
    const normalizedInput = normalizeTitle(params.topicTitleInput);
    if (!normalizedInput) {
      return {
        resolutionStatus: 'unresolved',
        resolvedTopic: null,
        reason: 'Empty topic title cannot be resolved against NERDC curriculum.'
      };
    }

    const candidates = await client.query<{
      id: string;
      title: string;
      class_grade_name: string;
      term: string;
      week: number;
    }>(
      `SELECT id, title, class_grade_name, term, week
       FROM production.curriculum_topics
       WHERE curriculum_version_id = $1 AND subject_id = $2`,
      [version.id, subject.id]
    );

    const exactMatches = candidates.rows.filter(c => normalizeTitle(c.title) === normalizedInput);
    const gradeScoped = params.classGradeName?.trim()
      ? exactMatches.filter(
          c => c.class_grade_name.trim().toLowerCase() === params.classGradeName!.trim().toLowerCase()
        )
      : exactMatches;

    const chosen = gradeScoped.length === 1 ? gradeScoped[0] : exactMatches.length === 1 ? exactMatches[0] : null;
    if (!chosen) {
      return {
        resolutionStatus: 'unresolved',
        resolvedTopic: null,
        reason: `Free-text topic '${params.topicTitleInput}' could not be deterministically matched in ${subject.name} (${version.id}). Manual curriculum mapping is required before assessment eligibility.`
      };
    }

    const resolvedTopic = await loadTopicDetails(chosen);
    return {
      resolutionStatus: 'resolved',
      resolvedTopic,
      reason: `Matched NERDC topic '${resolvedTopic.topicTitle}' in version '${version.id}'.`
    };
  }

  validateObjectiveSelectionForTopic(
    resolvedTopic: ResolvedCurriculumTopic,
    coveredObjectiveIds: string[],
    uncoveredObjectiveIds: string[] = []
  ): {
    coveredObjectiveIds: string[];
    uncoveredObjectiveIds: string[];
  } {
    const validIds = new Set(resolvedTopic.objectives.map(o => o.id));
    for (const id of [...coveredObjectiveIds, ...uncoveredObjectiveIds]) {
      if (!validIds.has(id)) {
        throw new TeachingEvidenceError(
          'UNRESOLVED_CURRICULUM',
          `Learning objective '${id}' does not belong to NERDC topic '${resolvedTopic.topicId}' in version '${resolvedTopic.curriculumVersionId}'.`,
          422,
          {
            objectiveId: id,
            topicId: resolvedTopic.topicId,
            curriculumVersionId: resolvedTopic.curriculumVersionId
          }
        );
      }
    }

    const dedupCovered = [...new Set(coveredObjectiveIds)];
    const coveredSet = new Set(dedupCovered);
    const dedupUncovered = [...new Set(uncoveredObjectiveIds)].filter(id => !coveredSet.has(id));
    return {
      coveredObjectiveIds: dedupCovered,
      uncoveredObjectiveIds: dedupUncovered
    };
  }
}
