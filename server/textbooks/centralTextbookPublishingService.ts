import crypto from 'crypto';
import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';
import { CentralTextbookError, CentralTextbookRepository } from './centralTextbookRepository';
import { CentralTextbookCoverageService } from './centralTextbookCoverageService';
import type { CentralTextbookDetail } from './centralTextbookTypes';

export class CentralTextbookPublishingService {
  constructor(
    private readonly pool: DatabasePool,
    private readonly repo: CentralTextbookRepository = new CentralTextbookRepository(pool),
    private readonly coverageService: CentralTextbookCoverageService = new CentralTextbookCoverageService(pool)
  ) {}

  async publishTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    options: { versionNumber?: string; changelog?: string } = {}
  ): Promise<CentralTextbookDetail> {
    if (actor.role !== 'super_admin') {
      throw new CentralTextbookError('FORBIDDEN', 'Only central editorial administrators may publish authoritative textbooks.');
    }

    const actorName = actor.email || actor.userId || 'editorial_admin';
    const preCheck = await this.repo.getTextbookById(actor, textbookId);
    if (!preCheck) {
      throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    }

    if (preCheck.editorialApprovalStatus !== 'approved' || !preCheck.approvedBy || !preCheck.approvedAt) {
      throw new CentralTextbookError(
        'APPROVAL_REQUIRED',
        `Textbook ${textbookId} cannot be published until it receives central editorial approval.`
      );
    }

    if (preCheck.chapters.length === 0) {
      throw new CentralTextbookError('VALIDATION_ERROR', 'Textbook has no chapters.');
    }

    const allSections = preCheck.chapters.flatMap(ch => ch.sections);
    if (allSections.length === 0) {
      throw new CentralTextbookError('VALIDATION_ERROR', 'Textbook has no sections to publish.');
    }
    if (allSections.some(sec => sec.reviewStatus !== 'approved')) {
      throw new CentralTextbookError('APPROVAL_REQUIRED', 'All sections must be editorially approved prior to publishing.');
    }

    const nextVersion = options.versionNumber?.trim() || preCheck.currentVersion || '1.0.0';
    const snapshotChecksum = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          id: preCheck.id,
          version: nextVersion,
          curriculumVersionId: preCheck.curriculumVersionId,
          chapters: preCheck.chapters.map(ch => ({
            id: ch.id,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            sections: ch.sections.map(s => ({
              id: s.id,
              sectionNumber: s.sectionNumber,
              title: s.title,
              contentMarkdown: s.contentMarkdown
            }))
          }))
        })
      )
      .digest('hex');

    await withControlPlaneTransaction(this.pool, actor, async client => {
      await client.query(
        `UPDATE production.central_textbooks
         SET publication_status = 'published',
             current_version = $2,
             published_by = $3,
             published_at = now(),
             is_verified_authoritative = true,
             updated_at = now()
         WHERE id = $1`,
        [textbookId, nextVersion, actorName]
      );

      await client.query(
        `UPDATE production.central_textbook_chapters
         SET status = 'published', updated_at = now()
         WHERE textbook_id = $1`,
        [textbookId]
      );

      await client.query(
        `INSERT INTO production.central_textbook_versions
           (textbook_id, version_number, curriculum_version_id, publication_status, changelog,
            snapshot_checksum, created_by, published_at)
         VALUES ($1, $2, $3, 'published', $4, $5, $6, now())
         ON CONFLICT (textbook_id, version_number) DO UPDATE SET
           publication_status = 'published',
           changelog = EXCLUDED.changelog,
           snapshot_checksum = EXCLUDED.snapshot_checksum,
           published_at = now()`,
        [
          textbookId,
          nextVersion,
          preCheck.curriculumVersionId,
          options.changelog || `Published edition ${nextVersion}`,
          snapshotChecksum,
          actorName
        ]
      );

      await client.query(
        `INSERT INTO production.central_textbook_editorial_reviews
           (textbook_id, reviewer_id, reviewer_role, action, notes, previous_status, new_status)
         VALUES ($1, $2, $3, 'published', $4, $5, 'published')`,
        [
          textbookId,
          actorName,
          actor.role,
          options.changelog || `Published authoritative edition ${nextVersion} (checksum ${snapshotChecksum.slice(0, 12)})`,
          preCheck.publicationStatus
        ]
      );
    });

    await this.coverageService.recomputeAndPersistCoverage(actor, textbookId);
    const published = await this.repo.getTextbookById(actor, textbookId);
    if (!published) throw new CentralTextbookError('NOT_FOUND', `Textbook ${textbookId} not found.`);
    return published;
  }

  async supersedeTextbook(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    supersededByTextbookId?: string | null,
    reason?: string
  ): Promise<CentralTextbookDetail> {
    if (actor.role !== 'super_admin') {
      throw new CentralTextbookError('FORBIDDEN', 'Only central editorial administrators may supersede or withdraw textbooks.');
    }
    return this.repo.supersedeTextbook(actor, textbookId, supersededByTextbookId, reason);
  }
}
