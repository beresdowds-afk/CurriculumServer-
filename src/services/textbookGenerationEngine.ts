import type { DatabasePool } from '../../server/db/postgres';
import type { VerifiedTenantPrincipal } from '../../server/db/tenantContext';
import { CentralTextbookService } from '../../server/textbooks/centralTextbookService';
import type { CentralTextbookChapterRecord, CentralTextbookDetail } from '../../server/textbooks/centralTextbookTypes';
import type { ClassGrade } from '../types';

/**
 * Facade delegating textbook outline & chapter generation strictly to
 * the PostgreSQL-backed CentralTextbookService.
 * Zero in-memory Maps and zero Question Bank coupling.
 */
export class TextbookGenerationEngine {
  private static instance: TextbookGenerationEngine;
  private pool: DatabasePool | null = null;
  private centralService: CentralTextbookService | null = null;

  private constructor() {}

  public static getInstance(): TextbookGenerationEngine {
    if (!TextbookGenerationEngine.instance) {
      TextbookGenerationEngine.instance = new TextbookGenerationEngine();
    }
    return TextbookGenerationEngine.instance;
  }

  public configurePool(pool: DatabasePool): void {
    this.pool = pool;
    this.centralService = new CentralTextbookService(pool);
  }

  private getService(): CentralTextbookService {
    if (!this.pool || !this.centralService) {
      throw new Error(
        'CENTRAL_TEXTBOOK_DB_UNAVAILABLE: TextbookGenerationEngine requires a configured PostgreSQL pool (in-memory storage was decommissioned in Stage 2).'
      );
    }
    return this.centralService;
  }

  public async generateTextbookOutline(
    actor: VerifiedTenantPrincipal,
    subjectIdOrCode: string,
    classGrade: ClassGrade | string,
    options: { curriculumVersionId?: string; authorName?: string } = {}
  ): Promise<CentralTextbookDetail> {
    const { textbook } = await this.getService().generation.generateTextbookOutline(actor, {
      subjectIdOrCode,
      classGrade,
      curriculumVersionId: options.curriculumVersionId,
      authorName: options.authorName
    });
    return textbook;
  }

  public async generateChapterContent(
    actor: VerifiedTenantPrincipal,
    textbookId: string,
    chapterId: string
  ): Promise<CentralTextbookChapterRecord> {
    const { chapter } = await this.getService().generation.generateChapterContent(actor, {
      textbookId,
      chapterId
    });
    return chapter;
  }
}

export const textbookGenerationEngine = TextbookGenerationEngine.getInstance();
