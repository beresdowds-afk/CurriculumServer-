import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import type { CurriculumRetrievalPort } from '../curriculum/centralCurriculumAdapters';
import { CurriculumRetrievalAdapter } from '../curriculum/centralCurriculumAdapters';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import { CentralTextbookError, CentralTextbookRepository } from './centralTextbookRepository';
import { CentralTextbookCoverageService } from './centralTextbookCoverageService';
import { TextbookContentValidationAdapter } from './textbookValidationAdapter';
import type {
  CentralTextbookDetail,
  CentralTextbookValidationReport,
  TextbookSectionReviewStatus
} from './centralTextbookTypes';

export class CentralTextbookEditorialService {
  private readonly validator = new TextbookContentValidationAdapter();
  private readonly curriculumPort: CurriculumRetrievalPort;

  constructor(
    private readonly pool: DatabasePool,
    private readonly repo: CentralTextbookRepository = new CentralTextbookRepository(pool),
    private readonly coverageService: CentralTextbookCoverageService = new CentralTextbookCoverageService(pool),
    curriculumPort?: CurriculumRetrievalPort
  ) {
    this.curriculumPort = curriculumPort || new CurriculumRetrievalAdapter(new CentralCurriculumRepository(pool));
  }

  private assertEditorialAdmin(actor: VerifiedTenantPrincipal): void {
    if (actor.role !== 'super_admin') {
      throw new CentralTextbookError('FORBIDDEN', 'Only central editorial administrators may execute textbook review or approval workflows.');
    }
  }

  async validateTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookValidationReport> {
    this.assertEditorialAdmin(actor);
    const book = await this.repo.getTextbookById(actor, textbookId);
    if (!book) {
      throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    }

    let requiredTopics: any[] = [];
    try {
      const curriculumData = await this.curriculumPort.getSubjectForApprovedPublishedCurriculum(
        actor,
        book.subjectId,
        { versionId: book.curriculumVersionId, classGrade: book.classGradeName }
      );
      requiredTopics = curriculumData.topicsForGrade;
    } catch {
      requiredTopics = [];
    }

    const evaluation = this.validator.validate(book, requiredTopics);
    return this.repo.saveValidationReport(actor, {
      textbookId: book.id,
      curriculumVersionId: book.curriculumVersionId,
      overallPassed: evaluation.overallPassed,
      readinessScore: evaluation.readinessScore,
      findings: evaluation.findings,
      summary: evaluation.summary
    });
  }

  async submitForReview(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    notes = ''
  ): Promise<CentralTextbookDetail> {
    this.assertEditorialAdmin(actor);
    const actorName = actor.email || actor.userId || 'editorial_admin';

    await withControlPlaneTransaction(this.pool, actor, async client => {
      const tbRes = await client.query(
        `SELECT publication_status FROM production.central_textbooks WHERE id = $1`,
        [textbookId]
      );
      if (tbRes.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
      }
      const prevStatus = tbRes.rows[0].publication_status;
      if (prevStatus === 'published') {
        throw new CentralTextbookError('CONFLICT', `Textbook ${textbookId} is already published.`);
      }

      const chRes = await client.query<{ cnt: string }>(
        `SELECT count(*)::text AS cnt FROM production.central_textbook_chapters WHERE textbook_id = $1`,
        [textbookId]
      );
      if (Number(chRes.rows[0]?.cnt || 0) === 0) {
        throw new CentralTextbookError('VALIDATION_ERROR', 'Cannot submit a textbook without chapters for editorial review.');
      }

      await client.query(
        `UPDATE production.central_textbooks
         SET publication_status = 'under_review',
             editorial_approval_status = 'in_review',
             updated_at = now()
         WHERE id = $1`,
        [textbookId]
      );
      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, 'submitted_for_review', $4, $5, 'under_review')`,
        [textbookId, actorName, actor.role, notes || 'Submitted to central editorial review board.', prevStatus]
      );
    });

    await this.coverageService.recomputeAndPersistCoverage(actor, textbookId);
    const updated = await this.repo.getTextbookById(actor, textbookId);
    if (!updated) throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    return updated;
  }

  async reviewSection(
    actor: VerifiedTenantPrincipal,
    input: { textbookId: string; chapterId: string; sectionId: string; reviewStatus: TextbookSectionReviewStatus; notes?: string }
  ): Promise<CentralTextbookDetail> {
    this.assertEditorialAdmin(actor);
    const actorName = actor.email || actor.userId || 'editorial_admin';

    await withControlPlaneTransaction(this.pool, actor, async client => {
      const existing = await client.query(
        `SELECT review_status FROM production.central_textbook_sections
         WHERE id = $1 AND textbook_id = $2 AND chapter_id = $3`,
        [input.sectionId, input.textbookId, input.chapterId]
      );
      if (existing.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Section ${input.sectionId} not found.`);
      }
      const prev = existing.rows[0].review_status;
      await client.query(
        `UPDATE production.central_textbook_sections
         SET review_status = $2,
             reviewer_id = $3,
             reviewer_notes = $4,
             reviewed_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [input.sectionId, input.reviewStatus, actorName, input.notes || '']
      );
      const action = input.reviewStatus === 'approved'
        ? 'approved'
        : input.reviewStatus === 'rejected'
          ? 'rejected'
          : 'changes_requested';
      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, chapter_id, section_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          input.textbookId,
          input.chapterId,
          input.sectionId,
          actorName,
          actor.role,
          action,
          input.notes || `Section marked ${input.reviewStatus}`,
          prev,
          input.reviewStatus
        ]
      );
    });

    await this.coverageService.recomputeAndPersistCoverage(actor, input.textbookId);
    const updated = await this.repo.getTextbookById(actor, input.textbookId);
    if (!updated) throw new CentralTextbookError('NOT_FOUND', `Textbook ${input.textbookId} not found.`);
    return updated;
  }

  async approveTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    notes = ''
  ): Promise<CentralTextbookDetail> {
    this.assertEditorialAdmin(actor);
    const actorName = actor.email || actor.userId || 'editorial_admin';

    await withControlPlaneTransaction(this.pool, actor, async client => {
      const tbRes = await client.query(
        `SELECT publication_status FROM production.central_textbooks WHERE id = $1`,
        [textbookId]
      );
      if (tbRes.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
      }

      const secStats = await client.query<{ total: string; rejected: string }>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE review_status = 'rejected')::text AS rejected
         FROM production.central_textbook_sections
         WHERE textbook_id = $1`,
        [textbookId]
      );
      if (Number(secStats.rows[0]?.total || 0) === 0) {
        throw new CentralTextbookError('VALIDATION_ERROR', 'Cannot approve a textbook that has zero authored/generated sections.');
      }
      if (Number(secStats.rows[0]?.rejected || 0) > 0) {
        throw new CentralTextbookError('VALIDATION_ERROR', 'Resolve all rejected sections before granting editorial approval.');
      }

      await client.query(
        `UPDATE production.central_textbook_sections
         SET review_status = 'approved',
             reviewer_id = COALESCE(reviewer_id, $2),
             reviewed_at = COALESCE(reviewed_at, now()),
             updated_at = now()
         WHERE textbook_id = $1 AND review_status = 'pending'`,
        [textbookId, actorName]
      );
      await client.query(
        `UPDATE production.central_textbook_chapters
         SET status = 'approved', updated_at = now()
         WHERE textbook_id = $1 AND status <> 'published'`,
        [textbookId]
      );
      await client.query(
        `UPDATE production.central_textbooks
         SET editorial_approval_status = 'approved',
             publication_status = CASE WHEN publication_status = 'published' THEN 'published' ELSE 'approved' END,
             approved_by = $2,
             approved_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [textbookId, actorName]
      );
      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, 'approved', $4, $5, 'approved')`,
        [textbookId, actorName, actor.role, notes || 'Editorial approval granted.', tbRes.rows[0].publication_status]
      );
    });

    await this.coverageService.recomputeAndPersistCoverage(actor, textbookId);
    const updated = await this.repo.getTextbookById(actor, textbookId);
    if (!updated) throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    return updated;
  }

  async rejectTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    reason: string,
    requestChangesOnly = false
  ): Promise<CentralTextbookDetail> {
    this.assertEditorialAdmin(actor);
    const actorName = actor.email || actor.userId || 'editorial_admin';

    await withControlPlaneTransaction(this.pool, actor, async client => {
      const tbRes = await client.query(
        `SELECT publication_status FROM production.central_textbooks WHERE id = $1`,
        [textbookId]
      );
      if (tbRes.rowCount === 0) {
        throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
      }
      if (tbRes.rows[0].publication_status === 'published') {
        throw new CentralTextbookError('CONFLICT', 'Published editions cannot be rejected in place; create a new revision or supersede.');
      }

      const newApprovalStatus = requestChangesOnly ? 'changes_requested' : 'rejected';
      const newPublicationStatus = requestChangesOnly ? 'draft' : 'rejected';
      await client.query(
        `UPDATE production.central_textbooks
         SET publication_status = $3,
             editorial_approval_status = $2,
             approved_by = NULL,
             approved_at = NULL,
             updated_at = now()
         WHERE id = $1`,
        [textbookId, newApprovalStatus, newPublicationStatus]
      );
      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          textbookId,
          actorName,
          actor.role,
          requestChangesOnly ? 'changes_requested' : 'rejected',
          reason || 'Returned to draft for revision.',
          tbRes.rows[0].publication_status,
          newPublicationStatus
        ]
      );
    });

    const updated = await this.repo.getTextbookById(actor, textbookId);
    if (!updated) throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    return updated;
  }
}
