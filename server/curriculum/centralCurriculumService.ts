import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import type { SubjectCurriculum } from '../../src/types';
import { CentralCurriculumRepository } from './centralCurriculumRepository';
import {
  CurriculumAuditLoggingAdapter,
  CurriculumCoverageValidationAdapter,
  CurriculumDatabaseAccessAdapter,
  CurriculumPublicationApprovalAdapter,
  CurriculumRetrievalAdapter,
  CurriculumSourceImportAdapter,
  CurriculumVersionManagementAdapter,
  type CurriculumAuditLoggerPort
} from './centralCurriculumAdapters';
import type { CurriculumMigrationReport } from './nerdcMigrationLoader';
import type { CurriculumVersionRecord } from './centralCurriculumTypes';

/**
 * Authoritative Central Curriculum Retrieval & Lifecycle Service.
 * Orchestrates dedicated operational adapters while maintaining strict isolation from
 * Central Textbooks and School-Instance Question Banks.
 */
export class CentralCurriculumService {
  readonly repository: CentralCurriculumRepository;
  readonly dbAdapter: CurriculumDatabaseAccessAdapter;
  readonly sourceImport: CurriculumSourceImportAdapter;
  readonly versionManagement: CurriculumVersionManagementAdapter;
  readonly retrieval: CurriculumRetrievalAdapter;
  readonly coverageValidation: CurriculumCoverageValidationAdapter;
  readonly publicationApproval: CurriculumPublicationApprovalAdapter;
  readonly auditLogger: CurriculumAuditLoggerPort;

  constructor(pool: DatabasePool) {
    this.repository = new CentralCurriculumRepository(pool);
    this.dbAdapter = new CurriculumDatabaseAccessAdapter(this.repository);
    this.sourceImport = new CurriculumSourceImportAdapter(pool);
    this.versionManagement = new CurriculumVersionManagementAdapter(this.repository);
    this.retrieval = new CurriculumRetrievalAdapter(this.repository);
    this.coverageValidation = new CurriculumCoverageValidationAdapter(this.repository);
    this.publicationApproval = new CurriculumPublicationApprovalAdapter(this.versionManagement);
    this.auditLogger = new CurriculumAuditLoggingAdapter(pool);
  }

  async importNerdcDataset(
    actor: VerifiedTenantPrincipal,
    datasets?: readonly SubjectCurriculum[]
  ): Promise<CurriculumMigrationReport> {
    const report = await this.sourceImport.importNerdcBaseline(actor, datasets);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_nerdc_imported',
      targetResource: 'central_curriculum:NERDC',
      outcome: 'success',
      metadata: {
        subjectsMigrated: report.subjectsMigrated,
        topicsMigrated: report.topicsMigrated,
        objectivesMigrated: report.objectivesMigrated,
        isOfficialVerified: report.isOfficialVerified
      }
    }).catch(() => {});
    return report;
  }

  async registerFrameworkHierarchy(
    actor: VerifiedTenantPrincipal,
    input: Parameters<CentralCurriculumRepository['registerFrameworkHierarchy']>[1]
  ): Promise<{ frameworkId: string }> {
    const res = await this.repository.registerFrameworkHierarchy(actor, input);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_framework_registered',
      targetResource: `framework:${res.frameworkId}`,
      outcome: 'success',
      metadata: { countryIso: input.country.isoCode, authorityCode: input.authority.code }
    }).catch(() => {});
    return res;
  }

  async createVersion(
    actor: VerifiedTenantPrincipal,
    input: Parameters<CentralCurriculumRepository['createVersion']>[1]
  ): Promise<CurriculumVersionRecord> {
    const version = await this.versionManagement.createDraftVersion(actor, input);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_version_created',
      targetResource: `curriculum_version:${version.id}`,
      outcome: 'success'
    }).catch(() => {});
    return version;
  }

  async submitVersionForReview(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    const version = await this.versionManagement.submitForReview(actor, versionId, notes);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_version_submitted_review',
      targetResource: `curriculum_version:${version.id}`,
      outcome: 'success'
    }).catch(() => {});
    return version;
  }

  async approveVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    const version = await this.versionManagement.approveVersion(actor, versionId, notes);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_version_approved',
      targetResource: `curriculum_version:${version.id}`,
      outcome: 'success',
      metadata: { notes: notes || '' }
    }).catch(() => {});
    return version;
  }

  async publishVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string
  ): Promise<CurriculumVersionRecord> {
    const version = await this.versionManagement.publishVersion(actor, versionId);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_version_published',
      targetResource: `curriculum_version:${version.id}`,
      outcome: 'success'
    }).catch(() => {});
    return version;
  }

  async supersedeVersion(
    actor: VerifiedTenantPrincipal,
    versionId: string,
    supersededByVersionId?: string | null,
    notes?: string
  ): Promise<CurriculumVersionRecord> {
    const version = await this.versionManagement.supersedeVersion(actor, versionId, supersededByVersionId, notes);
    await this.auditLogger.recordEvent(actor, {
      action: 'central_curriculum_version_superseded',
      targetResource: `curriculum_version:${version.id}`,
      outcome: 'success',
      metadata: { supersededByVersionId: supersededByVersionId || null }
    }).catch(() => {});
    return version;
  }
}
