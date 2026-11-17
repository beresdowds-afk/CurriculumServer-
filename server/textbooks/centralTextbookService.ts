import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import {
  CurriculumRetrievalAdapter,
  type CurriculumRetrievalPort
} from '../curriculum/centralCurriculumAdapters';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import type { PaginatedResult } from '../curriculum/centralCurriculumTypes';
import { CentralTextbookCoverageService } from './centralTextbookCoverageService';
import { CentralTextbookEditorialService } from './centralTextbookEditorialService';
import { CentralTextbookGenerationService, type TextbookAiAdapter } from './centralTextbookGenerationService';
import { CentralTextbookPublishingService } from './centralTextbookPublishingService';
import { CentralTextbookError, CentralTextbookRepository } from './centralTextbookRepository';
import { CentralTextbookStorageProvider, defaultTextbookStorageProvider } from './centralTextbookStorage';
import type {
  CentralTextbookCoverageManifest,
  CentralTextbookDetail,
  CentralTextbookFilterParams,
  CentralTextbookGenerationJob,
  CentralTextbookMediaAsset,
  CentralTextbookSummary,
  CentralTextbookVersionRecord
} from './centralTextbookTypes';

export class CentralTextbookService {
  readonly repository: CentralTextbookRepository;
  readonly coverage: CentralTextbookCoverageService;
  readonly editorial: CentralTextbookEditorialService;
  readonly publishing: CentralTextbookPublishingService;
  readonly generation: CentralTextbookGenerationService;
  readonly storage: CentralTextbookStorageProvider;

  constructor(
    pool: DatabasePool,
    options: {
      storage?: CentralTextbookStorageProvider;
      curriculumPort?: CurriculumRetrievalPort;
      curriculumRepo?: CentralCurriculumRepository;
      aiAdapter?: TextbookAiAdapter;
    } = {}
  ) {
    this.storage = options.storage || defaultTextbookStorageProvider;
    const curriculumPort: CurriculumRetrievalPort = options.curriculumPort
      || new CurriculumRetrievalAdapter(options.curriculumRepo || new CentralCurriculumRepository(pool));
    this.repository = new CentralTextbookRepository(pool);
    this.coverage = new CentralTextbookCoverageService(pool, curriculumPort);
    this.editorial = new CentralTextbookEditorialService(pool, this.repository, this.coverage, curriculumPort);
    this.publishing = new CentralTextbookPublishingService(pool, this.repository, this.coverage);
    this.generation = new CentralTextbookGenerationService(
      pool,
      curriculumPort,
      this.repository,
      this.coverage,
      options.aiAdapter
    );
  }

  listTextbooks(
    principal: VerifiedTenantPrincipal,
    params?: CentralTextbookFilterParams
  ): Promise<PaginatedResult<CentralTextbookSummary>> {
    return this.repository.listTextbooks(principal, params);
  }

  getTextbook(principal: VerifiedTenantPrincipal, textbookId: string): Promise<CentralTextbookDetail | undefined> {
    return this.repository.getTextbookById(principal, textbookId);
  }

  getCoverageManifest(
    principal: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookCoverageManifest | undefined> {
    return this.repository.getCoverageManifest(principal, textbookId);
  }

  listVersions(
    principal: VerifiedTenantPrincipal,
    textbookId: string
  ): Promise<CentralTextbookVersionRecord[]> {
    return this.repository.listVersions(principal, textbookId);
  }

  async uploadPrivateMedia(
    actor: VerifiedTenantPrincipal,
    input: {
      textbookId: string;
      chapterId?: string;
      sectionId?: string;
      assetType: CentralTextbookMediaAsset['assetType'];
      title: string;
      altText?: string;
      mimeType: string;
      fileName: string;
      content: Buffer;
      accessScope?: 'editorial_only' | 'entitled_private';
    }
  ): Promise<CentralTextbookMediaAsset> {
    if (actor.role !== 'super_admin') {
      throw new CentralTextbookError('FORBIDDEN', 'Only central editorial administrators may upload textbook media.');
    }
    const book = await this.repository.getTextbookById(actor, input.textbookId);
    if (!book) {
      throw new CentralTextbookError('NOT_FOUND', `Textbook ${input.textbookId} not found.`);
    }
    const stored = await this.storage.writeMedia(input.textbookId, input.fileName, input.content);
    return this.repository.recordMediaAsset(actor, {
      textbookId: input.textbookId,
      chapterId: input.chapterId,
      sectionId: input.sectionId,
      assetType: input.assetType,
      title: input.title,
      altText: input.altText,
      mimeType: input.mimeType,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      checksumSha256: stored.checksumSha256,
      bytesSize: stored.bytesSize,
      accessScope: input.accessScope || 'entitled_private'
    });
  }

  async readEntitledMedia(
    principal: VerifiedTenantPrincipal,
    textbookId: string,
    assetId: string
  ): Promise<{ asset: CentralTextbookMediaAsset; buffer: Buffer }> {
    const asset = await this.repository.getMediaAsset(principal, textbookId, assetId);
    if (!asset) {
      throw new CentralTextbookError('NOT_FOUND', `Entitled media asset ${assetId} not found.`);
    }
    const buffer = await this.storage.readMedia(asset.storageKey, asset.checksumSha256);
    return { asset, buffer };
  }

  listGenerationJobs(
    actor: VerifiedTenantPrincipal,
    filter?: { status?: CentralTextbookGenerationJob['status']; textbookId?: string }
  ): Promise<CentralTextbookGenerationJob[]> {
    return this.repository.listGenerationJobs(actor, filter);
  }
}
