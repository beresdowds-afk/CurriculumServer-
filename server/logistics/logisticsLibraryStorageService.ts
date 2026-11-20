import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { assertAuthorized } from '../authorization/authorizedPrincipal';
import type { DatabaseClient, DatabasePool } from '../db/postgres';
import { withTenantTransaction } from '../db/tenantContext';
import { ServerSecretVault } from '../storageAndDatabaseManager';
import {
  GoogleCloudStorageLogisticsAdapter,
  GoogleDriveLogisticsStorageAdapter,
  LogisticsStorageError,
  type GoogleAccessTokenProvider
} from './googleLogisticsStorageAdapters';
import type { LogisticsResourceUpload, LogisticsStorageAdapter } from './logisticsStorageAdapter';

type Provider = 'google_drive' | 'google_cloud_storage';
type Strategy = 'private_drive' | 'platform_storage' | 'hybrid';
type Visibility = 'staff_only' | 'students' | 'staff_and_students';
type Fetch = (
  input: string | URL | Request,
  init?: RequestInit & { duplex?: 'half' }
) => Promise<Response>;

const LIBRARY_FEATURE = 'feat_logistics_elibrary';
const READ_PERMISSION = 'logistics.library.read';
const MANAGE_PERMISSION = 'logistics.library.manage';
const STORAGE_MANAGE_PERMISSION = 'logistics.library.storage.manage';

export class LogisticsLibraryStorageError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN'
      | 'SCHOOL_CONTEXT_UNAVAILABLE'
      | 'FEATURE_DISABLED'
      | 'INVALID_CONFIGURATION'
      | 'PROVIDER_NOT_CONFIGURED'
      | 'PROVIDER_VERIFICATION_FAILED'
      | 'NOT_FOUND'
      | 'INVALID_INPUT'
      | 'CONFLICT'
      | 'STORAGE_FAILED'
  ) {
    super(code);
    this.name = 'LogisticsLibraryStorageError';
  }
}

export interface LibraryStorageConfigurationInput {
  strategy: Strategy;
  driveFolderId?: string;
  gcsBucket?: string;
  refreshToken?: string;
  placementRules?: Record<string, unknown>;
}

export interface LibraryResourceUpload {
  resourceId: string;
  contentType: string;
  contentLength: number;
  content: AsyncIterable<Uint8Array>;
}

export interface LibraryReadInput {
  resourceId: string;
  version?: number;
  action: 'view' | 'download';
}

interface ConfigurationRow {
  strategy: Strategy;
  primary_provider: Provider;
  secondary_provider: Provider | null;
  drive_folder_id: string | null;
  gcs_bucket: string | null;
  placement_rules: Record<string, unknown>;
  credentials_envelope: string;
  status: string;
}

interface ResourceRow {
  id: string;
  class_id: string | null;
  owner_user_id: string;
  publication_status: string;
  visibility: Visibility;
  current_version: number;
}

interface ReadResourceRow extends ResourceRow {
  storage_object_key: string;
  version: number;
  checksum: Buffer;
  content_type: string | null;
  content_length: string | null;
}

export interface LibraryDownload {
  stream: Readable;
  contentType: string;
  contentLength: number;
  version: number;
}

export interface LibraryResourceSummary {
  id: string;
  title: string;
  subjectId: string | null;
  description: string;
  publicationStatus: string;
  currentVersion: number;
  visibility: Visibility;
}

export interface LogisticsLibraryStorageDependencies {
  platformTokens?: GoogleAccessTokenProvider;
  fetcher?: Fetch;
  env?: NodeJS.ProcessEnv;
}

function providerForStrategy(strategy: Strategy): Provider {
  return strategy === 'private_drive' ? 'google_drive' : 'google_cloud_storage';
}

function providersFor(configuration: Pick<ConfigurationRow, 'primary_provider' | 'secondary_provider'>): Provider[] {
  return configuration.secondary_provider
    ? [configuration.primary_provider, configuration.secondary_provider]
    : [configuration.primary_provider];
}

function checkConfiguration(input: LibraryStorageConfigurationInput): {
  primary: Provider;
  secondary: Provider | null;
  folderId: string | null;
  bucket: string | null;
  refreshToken: string;
  rules: Record<string, unknown>;
} {
  if (!input || !['private_drive', 'platform_storage', 'hybrid'].includes(input.strategy)) {
    throw new LogisticsLibraryStorageError('INVALID_CONFIGURATION');
  }
  const primary = providerForStrategy(input.strategy);
  const secondary = input.strategy === 'hybrid'
    ? (primary === 'google_drive' ? 'google_cloud_storage' : 'google_drive')
    : null;
  const folderId = input.driveFolderId?.trim() || null;
  const bucket = input.gcsBucket?.trim() || null;
  const needsDrive = primary === 'google_drive' || secondary === 'google_drive';
  const needsGcs = primary === 'google_cloud_storage' || secondary === 'google_cloud_storage';
  const refreshToken = input.refreshToken?.trim() || '';
  if ((needsDrive && (!folderId || !/^[A-Za-z0-9_-]{10,256}$/.test(folderId) || !refreshToken)) ||
      (needsGcs && (!bucket || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket))) ||
      (input.placementRules !== undefined &&
        (!input.placementRules || typeof input.placementRules !== 'object' ||
         Array.isArray(input.placementRules)))) {
    throw new LogisticsLibraryStorageError('INVALID_CONFIGURATION');
  }
  const rules = input.placementRules ?? {};
  const placement = rules.contentTypeProviders;
  if (placement !== undefined && (!placement || typeof placement !== 'object' || Array.isArray(placement) ||
      Object.entries(placement as Record<string, unknown>).some(([contentType, provider]) =>
        !/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(contentType) ||
        (provider !== primary && provider !== secondary)))) {
    throw new LogisticsLibraryStorageError('INVALID_CONFIGURATION');
  }
  return { primary, secondary, folderId, bucket, refreshToken, rules };
}

export function hasLibraryReadAccess(
  actor: Pick<AuthorizedPrincipal, 'roles' | 'grants' | 'hasPermission' | 'hasPermissionFor'>,
  resource: Pick<ResourceRow, 'publication_status' | 'visibility'>,
  mappedStudentIds: readonly string[]
): boolean {
  if (actor.roles.includes('student')) {
    return resource.publication_status === 'published' &&
      (resource.visibility === 'students' || resource.visibility === 'staff_and_students') &&
      mappedStudentIds.some(studentId =>
        actor.hasPermissionFor(READ_PERMISSION, 'student', studentId) &&
        actor.grants.some(grant => grant.permissions.includes(READ_PERMISSION) &&
          grant.scopes.some(scope =>
            scope.resourceType === 'student' && scope.resourceId === studentId)));
  }
  return actor.hasPermission(READ_PERMISSION) &&
    (resource.publication_status === 'published' ||
      actor.hasPermission(MANAGE_PERMISSION));
}

function safeFailure(error: unknown): LogisticsLibraryStorageError {
  if (error instanceof LogisticsLibraryStorageError) return error;
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return new LogisticsLibraryStorageError('FORBIDDEN');
  }
  if (error instanceof LogisticsStorageError) {
    if (error.code === 'PROVIDER_NOT_CONFIGURED') {
      return new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
    }
    return new LogisticsLibraryStorageError('STORAGE_FAILED');
  }
  return new LogisticsLibraryStorageError('STORAGE_FAILED');
}

export class LogisticsLibraryStorageService {
  private readonly fetcher: Fetch;
  private readonly env: NodeJS.ProcessEnv;

  constructor(
    private readonly pool: DatabasePool,
    private readonly dependencies: LogisticsLibraryStorageDependencies = {}
  ) {
    this.fetcher = dependencies.fetcher ?? fetch;
    this.env = dependencies.env ?? process.env;
  }

  async getConfiguration(actor: AuthorizedPrincipal): Promise<Record<string, unknown> | null> {
    try {
      assertAuthorized(actor, STORAGE_MANAGE_PERMISSION);
      return await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, true);
        await this.assertActiveStaffMember(client, actor, schoolId);
        const result = await client.query<Record<string, unknown>>(
          `SELECT strategy, primary_provider AS "primaryProvider",
                  secondary_provider AS "secondaryProvider", drive_folder_id AS "driveFolderId",
                  gcs_bucket AS "gcsBucket", placement_rules AS "placementRules",
                  status, verified_at AS "verifiedAt", configuration_version AS "configurationVersion"
           FROM production.logistics_library_storage_configurations
           WHERE tenant_id = $1 AND school_id = $2`,
          [actor.tenantId, schoolId]
        );
        return result.rows[0] ?? null;
      });
    } catch (error) {
      throw safeFailure(error);
    }
  }

  async listResources(
    actor: AuthorizedPrincipal,
    input: { page?: number; pageSize?: number; search?: string } = {}
  ): Promise<{ page: number; pageSize: number; total: number; data: LibraryResourceSummary[] }> {
    try {
      if (!actor.roles.includes('student')) assertAuthorized(actor, READ_PERMISSION);
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 50;
      const search = input.search?.trim() ?? '';
      if (!Number.isInteger(page) || page < 1 ||
          !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || search.length > 200) {
        throw new LogisticsLibraryStorageError('INVALID_INPUT');
      }
      const scopedStudentIds = [...new Set(actor.grants.flatMap(grant =>
        grant.permissions.includes(READ_PERMISSION)
          ? grant.scopes.filter(scope => scope.resourceType === 'student').map(scope => scope.resourceId)
          : []
      ))];
      return await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, false);
        await this.assertActiveTenantMember(client, actor);
        const isStudent = actor.roles.includes('student');
        if (isStudent) {
          if (!scopedStudentIds.length) throw new LogisticsLibraryStorageError('FORBIDDEN');
        } else {
          await this.assertActiveStaffMember(client, actor, schoolId);
        }
        const filter = isStudent
          ? `resource.publication_status = 'published'
             AND resource.visibility IN ('students', 'staff_and_students')
             AND EXISTS (
               SELECT 1
               FROM production.logistics_library_resource_student_access access
               JOIN production.students student
                 ON student.tenant_id = access.tenant_id
                AND student.school_id = access.school_id
                AND student.id = access.student_id
               LEFT JOIN production.student_class_assignments assignment
                 ON assignment.tenant_id = student.tenant_id
                AND assignment.school_id = student.school_id
                AND assignment.student_id = student.id
                AND assignment.ended_at IS NULL
               WHERE access.tenant_id = resource.tenant_id
                 AND access.school_id = resource.school_id
                 AND access.resource_id = resource.id
                 AND access.student_id = ANY($3::uuid[])
                 AND student.lifecycle_status = 'active'
                 AND (resource.class_id IS NULL OR assignment.class_id = resource.class_id)
             )`
          : `(resource.publication_status = 'published' OR $3::boolean)`;
        const searchIndex = isStudent ? 4 : 4;
        const count = await client.query<{ total: string }>(
          `SELECT count(*)::text AS total
           FROM production.logistics_library_resources resource
           WHERE resource.tenant_id = $1 AND resource.school_id = $2
             AND ${filter} AND ($${searchIndex}::text = '' OR resource.title ILIKE '%' || $${searchIndex} || '%')`,
          isStudent
            ? [actor.tenantId, schoolId, scopedStudentIds, search]
            : [actor.tenantId, schoolId, actor.hasPermission(MANAGE_PERMISSION), search]
        );
        const data = await client.query<LibraryResourceSummary>(
          `SELECT resource.id, resource.title, resource.subject_id AS "subjectId",
                  resource.description, resource.publication_status AS "publicationStatus",
                  resource.current_version AS "currentVersion", resource.visibility
           FROM production.logistics_library_resources resource
           WHERE resource.tenant_id = $1 AND resource.school_id = $2
             AND ${filter} AND ($${searchIndex}::text = '' OR resource.title ILIKE '%' || $${searchIndex} || '%')
           ORDER BY resource.title, resource.id
           LIMIT $${searchIndex + 1} OFFSET $${searchIndex + 2}`,
          isStudent
            ? [actor.tenantId, schoolId, scopedStudentIds, search, pageSize, (page - 1) * pageSize]
            : [actor.tenantId, schoolId, actor.hasPermission(MANAGE_PERMISSION), search, pageSize, (page - 1) * pageSize]
        );
        if (isStudent && data.rows.some(resource =>
          !hasLibraryReadAccess(actor, { publication_status: resource.publicationStatus, visibility: resource.visibility },
            scopedStudentIds)
        )) {
          throw new LogisticsLibraryStorageError('FORBIDDEN');
        }
        return { page, pageSize, total: Number(count.rows[0]?.total || 0), data: data.rows };
      });
    } catch (error) {
      throw safeFailure(error);
    }
  }

  async configure(
    actor: AuthorizedPrincipal,
    input: LibraryStorageConfigurationInput
  ): Promise<{ status: 'verified'; configurationVersion: number }> {
    try {
      assertAuthorized(actor, STORAGE_MANAGE_PERMISSION);
      const prepared = checkConfiguration(input);
      const encryptedRefreshToken = prepared.refreshToken
        ? ServerSecretVault.encrypt(prepared.refreshToken)
        : '';
      const saved = await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, true);
        await this.assertActiveStaffMember(client, actor, schoolId);
        const result = await client.query<{ configuration_version: number }>(
          `INSERT INTO production.logistics_library_storage_configurations
             (tenant_id, school_id, strategy, primary_provider, secondary_provider,
              drive_folder_id, gcs_bucket, placement_rules, credentials_envelope,
              status, verified_at, verified_by, configuration_version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'unverified', NULL, NULL, 1)
           ON CONFLICT (tenant_id, school_id) DO UPDATE SET
             strategy = EXCLUDED.strategy,
             primary_provider = EXCLUDED.primary_provider,
             secondary_provider = EXCLUDED.secondary_provider,
             drive_folder_id = EXCLUDED.drive_folder_id,
             gcs_bucket = EXCLUDED.gcs_bucket,
             placement_rules = EXCLUDED.placement_rules,
             credentials_envelope = EXCLUDED.credentials_envelope,
             status = 'unverified',
             verified_at = NULL,
             verified_by = NULL,
             configuration_version =
               production.logistics_library_storage_configurations.configuration_version + 1,
             updated_at = now()
           RETURNING configuration_version`,
          [actor.tenantId, schoolId, input.strategy, prepared.primary, prepared.secondary,
            prepared.folderId, prepared.bucket, JSON.stringify(prepared.rules), encryptedRefreshToken]
        );
        await this.audit(client, actor, schoolId, 'library_storage_configuration_pending_verification',
          'library_storage_configuration', String(result.rows[0].configuration_version), {
            strategy: input.strategy, primaryProvider: prepared.primary, secondaryProvider: prepared.secondary
          });
        return { schoolId, version: result.rows[0].configuration_version };
      });

      const verificationConfig: ConfigurationRow = {
        strategy: input.strategy,
        primary_provider: prepared.primary,
        secondary_provider: prepared.secondary,
        drive_folder_id: prepared.folderId,
        gcs_bucket: prepared.bucket,
        placement_rules: prepared.rules,
        credentials_envelope: encryptedRefreshToken,
        status: 'unverified'
      };
      await this.verifyProviders(actor.tenantId, saved.schoolId, verificationConfig);
      await withTenantTransaction(this.pool, actor.tenant, async client => {
        await this.schoolContext(client, actor, true);
        await this.assertActiveStaffMember(client, actor, saved.schoolId);
        const updated = await client.query(
          `UPDATE production.logistics_library_storage_configurations
           SET status = 'verified', verified_at = now(), verified_by = $3, updated_at = now()
           WHERE tenant_id = $1 AND school_id = $2 AND configuration_version = $4
             AND status = 'unverified'`,
          [actor.tenantId, saved.schoolId, actor.userId, saved.version]
        );
        if (updated.rowCount !== 1) throw new LogisticsLibraryStorageError('CONFLICT');
        await this.audit(client, actor, saved.schoolId, 'library_storage_configuration_verified',
          'library_storage_configuration', String(saved.version), {
            strategy: input.strategy, primaryProvider: prepared.primary, secondaryProvider: prepared.secondary
          });
      });
      return { status: 'verified', configurationVersion: saved.version };
    } catch (error) {
      throw safeFailure(error);
    }
  }

  async setResourceVisibility(
    actor: AuthorizedPrincipal,
    input: { resourceId: string; visibility: Visibility; studentIds: string[] }
  ): Promise<void> {
    try {
      assertAuthorized(actor, MANAGE_PERMISSION);
      if (!/^[0-9a-f-]{36}$/i.test(input.resourceId) ||
          !['staff_only', 'students', 'staff_and_students'].includes(input.visibility) ||
          !Array.isArray(input.studentIds) || input.studentIds.length > 500 ||
          input.studentIds.some(id => !/^[0-9a-f-]{36}$/i.test(id)) ||
          new Set(input.studentIds).size !== input.studentIds.length ||
          (input.visibility === 'staff_only' && input.studentIds.length > 0)) {
        throw new LogisticsLibraryStorageError('INVALID_INPUT');
      }
      await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, false);
        await this.assertActiveStaffMember(client, actor, schoolId);
        const resource = await client.query<{ class_id: string | null }>(
          `SELECT class_id FROM production.logistics_library_resources
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
          [actor.tenantId, schoolId, input.resourceId]
        );
        if (!resource.rows[0]) throw new LogisticsLibraryStorageError('NOT_FOUND');
        if (input.studentIds.length) {
          const validStudents = await client.query<{ student_id: string }>(
            `SELECT student.id AS student_id
             FROM production.students student
             LEFT JOIN production.student_class_assignments assignment
               ON assignment.tenant_id = student.tenant_id
              AND assignment.school_id = student.school_id
              AND assignment.student_id = student.id
              AND assignment.ended_at IS NULL
             WHERE student.tenant_id = $1 AND student.school_id = $2
               AND student.id = ANY($3::uuid[])
               AND student.lifecycle_status = 'active'
               AND ($4::uuid IS NULL OR assignment.class_id = $4)`,
            [actor.tenantId, schoolId, input.studentIds, resource.rows[0].class_id]
          );
          if (validStudents.rowCount !== input.studentIds.length) {
            throw new LogisticsLibraryStorageError('INVALID_INPUT');
          }
        }
        await client.query(
          `DELETE FROM production.logistics_library_resource_student_access
           WHERE tenant_id = $1 AND school_id = $2 AND resource_id = $3`,
          [actor.tenantId, schoolId, input.resourceId]
        );
        if (input.studentIds.length) {
          await client.query(
            `INSERT INTO production.logistics_library_resource_student_access
               (tenant_id, school_id, resource_id, student_id, granted_by)
             SELECT $1, $2, $3, student_id, $5
             FROM unnest($4::uuid[]) AS student_id`,
            [actor.tenantId, schoolId, input.resourceId, input.studentIds, actor.userId]
          );
        }
        await client.query(
          `UPDATE production.logistics_library_resources
           SET visibility = $4
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, input.resourceId, input.visibility]
        );
        await this.audit(client, actor, schoolId, 'library_resource_visibility_updated',
          'library_resource', input.resourceId, {
            visibility: input.visibility, authorizedStudentCount: input.studentIds.length
          });
      });
    } catch (error) {
      throw safeFailure(error);
    }
  }

  async uploadResource(
    actor: AuthorizedPrincipal,
    input: LibraryResourceUpload
  ): Promise<{ version: number; contentLength: number }> {
    try {
      assertAuthorized(actor, MANAGE_PERMISSION);
      if (!/^[0-9a-f-]{36}$/i.test(input.resourceId)) {
        throw new LogisticsLibraryStorageError('INVALID_INPUT');
      }
      return await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, false);
        await this.assertActiveStaffMember(client, actor, schoolId);
        const resource = await client.query<{ id: string }>(
          `SELECT id FROM production.logistics_library_resources
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3 FOR UPDATE`,
          [actor.tenantId, schoolId, input.resourceId]
        );
        if (!resource.rows[0]) throw new LogisticsLibraryStorageError('NOT_FOUND');
        const nextVersion = await client.query<{ version: number }>(
          `SELECT coalesce(max(version), 0) + 1 AS version
           FROM production.logistics_library_resource_versions
           WHERE tenant_id = $1 AND school_id = $2 AND resource_id = $3`,
          [actor.tenantId, schoolId, input.resourceId]
        );
        const configuration = await this.verifiedConfiguration(client, actor.tenantId, schoolId);
        const version = nextVersion.rows[0].version;
        const adapter = this.adapterFor(
          actor.tenantId, schoolId, configuration,
          this.selectProvider(configuration, input.contentType)
        );
        const stored = await adapter.store({
          ...input,
          tenantId: actor.tenantId,
          schoolId,
          version
        } satisfies LogisticsResourceUpload);
        const result = await client.query(
          `INSERT INTO production.logistics_library_resource_versions
             (tenant_id, school_id, resource_id, version, storage_object_key, checksum,
              content_type, content_length, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (tenant_id, resource_id, version) DO NOTHING`,
          [actor.tenantId, schoolId, input.resourceId, version,
            stored.objectKey, stored.sha256, stored.contentType, stored.contentLength, actor.userId]
        );
        if (result.rowCount !== 1) throw new LogisticsLibraryStorageError('CONFLICT');
        await client.query(
          `UPDATE production.logistics_library_resources
           SET storage_object_key = $4, current_version = $5
           WHERE tenant_id = $1 AND school_id = $2 AND id = $3`,
          [actor.tenantId, schoolId, input.resourceId, stored.objectKey, version]
        );
        await this.audit(client, actor, schoolId, 'library_resource_file_uploaded',
          'library_resource', input.resourceId, {
            version, contentType: stored.contentType, contentLength: stored.contentLength
          });
        return { version, contentLength: stored.contentLength };
      });
    } catch (error) {
      throw safeFailure(error);
    }
  }

  async openResource(
    actor: AuthorizedPrincipal,
    input: LibraryReadInput
  ): Promise<LibraryDownload> {
    try {
      if (!actor.roles.includes('student')) assertAuthorized(actor, READ_PERMISSION);
      if (!/^[0-9a-f-]{36}$/i.test(input.resourceId) ||
          (input.version !== undefined && (!Number.isInteger(input.version) || input.version < 1)) ||
          !['view', 'download'].includes(input.action)) {
        throw new LogisticsLibraryStorageError('INVALID_INPUT');
      }
      const context = await withTenantTransaction(this.pool, actor.tenant, async client => {
        const schoolId = await this.schoolContext(client, actor, false);
        await this.assertActiveTenantMember(client, actor);
        const resourceResult = await client.query<ReadResourceRow>(
          `SELECT resource.id, resource.class_id, resource.owner_user_id,
                  resource.publication_status, resource.visibility, resource.current_version,
                  version.storage_object_key, version.version, version.checksum,
                  version.content_type, version.content_length::text AS content_length
           FROM production.logistics_library_resources resource
           JOIN production.logistics_library_resource_versions version
             ON version.tenant_id = resource.tenant_id
            AND version.school_id = resource.school_id
            AND version.resource_id = resource.id
           WHERE resource.tenant_id = $1 AND resource.school_id = $2 AND resource.id = $3
             AND ($4::integer IS NULL OR version.version = $4)
           ORDER BY version.version DESC
           LIMIT 1`,
          [actor.tenantId, schoolId, input.resourceId, input.version ?? null]
        );
        const resource = resourceResult.rows[0];
        if (!resource) throw new LogisticsLibraryStorageError('NOT_FOUND');
        const mapped = await client.query<{ student_id: string }>(
          `SELECT access.student_id
           FROM production.logistics_library_resource_student_access access
           JOIN production.students student
             ON student.tenant_id = access.tenant_id
            AND student.school_id = access.school_id
            AND student.id = access.student_id
           LEFT JOIN production.student_class_assignments assignment
             ON assignment.tenant_id = student.tenant_id
            AND assignment.school_id = student.school_id
            AND assignment.student_id = student.id
            AND assignment.ended_at IS NULL
           WHERE access.tenant_id = $1 AND access.school_id = $2
             AND access.resource_id = $3 AND student.lifecycle_status = 'active'
             AND ($4::uuid IS NULL OR assignment.class_id = $4)`,
          [actor.tenantId, schoolId, input.resourceId, resource.class_id]
        );
        const studentIds = mapped.rows.map(row => row.student_id);
        const isStudent = actor.roles.includes('student');
        if (isStudent) {
          if (!hasLibraryReadAccess(actor, resource, studentIds)) {
            throw new LogisticsLibraryStorageError('FORBIDDEN');
          }
        } else {
          if (!actor.hasPermission(READ_PERMISSION)) throw new LogisticsLibraryStorageError('FORBIDDEN');
          await this.assertActiveStaffMember(client, actor, schoolId);
          if (!hasLibraryReadAccess(actor, resource, studentIds)) {
            throw new LogisticsLibraryStorageError('FORBIDDEN');
          }
        }
        const configuration = await this.verifiedConfiguration(client, actor.tenantId, schoolId);
        return { schoolId, resource, configuration };
      });

      const provider: Provider = context.resource.storage_object_key.startsWith('drive:')
        ? 'google_drive' : 'google_cloud_storage';
      if (!providersFor(context.configuration).includes(provider)) {
        throw new LogisticsLibraryStorageError('STORAGE_FAILED');
      }
      const readTokens = this.tokensFor(actor.tenantId, context.schoolId, context.configuration);
      const accessToken = await readTokens.getAccessToken({
        tenantId: actor.tenantId,
        schoolId: context.schoolId,
        provider
      });
      if (provider === 'google_drive') {
        await this.verifyDriveFolder(accessToken, context.configuration.drive_folder_id);
        await this.verifyDriveResource(
          accessToken, context.resource.storage_object_key, actor.tenantId,
          context.schoolId, input.resourceId, context.configuration.drive_folder_id
        );
      } else {
        await this.verifyGcsBucket(accessToken, context.configuration.gcs_bucket);
      }
      const contentLength = Number(context.resource.content_length);
      if (!context.resource.content_type || !Number.isSafeInteger(contentLength) ||
          contentLength < 1 || contentLength > 250 * 1024 * 1024 ||
          !Buffer.isBuffer(context.resource.checksum) || context.resource.checksum.length !== 32) {
        throw new LogisticsLibraryStorageError('STORAGE_FAILED');
      }
      const source = await this.adapterFor(
        actor.tenantId, context.schoolId, context.configuration, provider
      ).openRead(actor.tenantId, context.schoolId, context.resource.storage_object_key);
      try {
        await withTenantTransaction(this.pool, actor.tenant, async client => {
          await this.schoolContext(client, actor, false);
          await this.assertActiveTenantMember(client, actor);
          await client.query(
            `INSERT INTO production.logistics_library_usage_events
               (tenant_id, school_id, resource_id, actor_user_id, action, resource_version)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [actor.tenantId, context.schoolId, input.resourceId, actor.userId,
              input.action, context.resource.version]
          );
          await this.audit(client, actor, context.schoolId, `library_resource_${input.action}`,
            'library_resource', input.resourceId, { version: context.resource.version });
        });
      } catch (error) {
        source.destroy();
        throw error;
      }
      const expectedChecksum = context.resource.checksum.toString('hex');
      const stream = Readable.from((async function* () {
        const checksum = createHash('sha256');
        let length = 0;
        try {
          for await (const chunk of source) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            length += bytes.length;
            if (length > contentLength) throw new LogisticsLibraryStorageError('STORAGE_FAILED');
            checksum.update(bytes);
            yield bytes;
          }
          if (length !== contentLength || checksum.digest('hex') !== expectedChecksum) {
            throw new LogisticsLibraryStorageError('STORAGE_FAILED');
          }
        } finally {
          if (!source.destroyed) source.destroy();
        }
      })());
      return {
        stream,
        contentType: context.resource.content_type,
        contentLength,
        version: context.resource.version
      };
    } catch (error) {
      throw safeFailure(error);
    }
  }

  private async schoolContext(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    requireManageCapability: boolean
  ): Promise<string> {
    const instances = await client.query<{ school_id: string; enabled_features: string[] }>(
      `SELECT school_id, enabled_features
       FROM production.application_instances
       WHERE tenant_id = $1 AND application_id = 'app_curriculum_flow'
         AND status = 'active' AND provisioning_status = 'ready'
       ORDER BY created_at DESC
       LIMIT 2`,
      [actor.tenantId]
    );
    if (instances.rowCount !== 1) throw new LogisticsLibraryStorageError('SCHOOL_CONTEXT_UNAVAILABLE');
    const schoolId = instances.rows[0].school_id;
    if (!instances.rows[0].enabled_features.includes(LIBRARY_FEATURE)) {
      throw new LogisticsLibraryStorageError('FEATURE_DISABLED');
    }
    const capability = await client.query<{ enabled: boolean }>(
      `SELECT coalesce((capabilities ->> 'digital_library')::boolean, false) AS enabled
       FROM production.logistics_feature_configurations
       WHERE tenant_id = $1 AND school_id = $2`,
      [actor.tenantId, schoolId]
    );
    if (!capability.rows[0]?.enabled) throw new LogisticsLibraryStorageError('FEATURE_DISABLED');
    if (requireManageCapability && !actor.hasPermission(STORAGE_MANAGE_PERMISSION)) {
      throw new LogisticsLibraryStorageError('FORBIDDEN');
    }
    return schoolId;
  }

  private async audit(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await client.query(
      `INSERT INTO production.logistics_audit_events
         (tenant_id, school_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [actor.tenantId, schoolId, actor.userId, action, entityType, entityId, JSON.stringify(details)]
    );
  }

  private async assertActiveTenantMember(client: DatabaseClient, actor: AuthorizedPrincipal): Promise<void> {
    const membership = await client.query(
      `SELECT 1 FROM production.memberships membership
       JOIN production.users user_record ON user_record.id = membership.user_id
       WHERE membership.tenant_id = $1 AND membership.user_id = $2
         AND membership.status = 'active' AND membership.revoked_at IS NULL
         AND user_record.account_status = 'active'`,
      [actor.tenantId, actor.userId]
    );
    if (membership.rowCount !== 1) throw new LogisticsLibraryStorageError('FORBIDDEN');
  }

  private async assertActiveStaffMember(
    client: DatabaseClient,
    actor: AuthorizedPrincipal,
    schoolId: string
  ): Promise<void> {
    await this.assertActiveTenantMember(client, actor);
    const staff = await client.query(
      `SELECT 1 FROM production.staff
       WHERE tenant_id = $1 AND school_id = $2 AND user_id = $3 AND status = 'active'`,
      [actor.tenantId, schoolId, actor.userId]
    );
    if (staff.rowCount !== 1) throw new LogisticsLibraryStorageError('FORBIDDEN');
  }

  private async verifiedConfiguration(
    client: DatabaseClient,
    tenantId: string,
    schoolId: string
  ): Promise<ConfigurationRow> {
    const result = await client.query<ConfigurationRow>(
      `SELECT strategy, primary_provider, secondary_provider, drive_folder_id,
              gcs_bucket, placement_rules, credentials_envelope, status
       FROM production.logistics_library_storage_configurations
       WHERE tenant_id = $1 AND school_id = $2 AND status = 'verified'`,
      [tenantId, schoolId]
    );
    if (!result.rows[0]) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
    return result.rows[0];
  }

  private selectProvider(configuration: ConfigurationRow, contentType: string): Provider {
    const selected = configuration.placement_rules.contentTypeProviders;
    const provider = selected && typeof selected === 'object'
      ? (selected as Record<string, unknown>)[contentType]
      : undefined;
    return provider === 'google_drive' || provider === 'google_cloud_storage'
      ? provider
      : configuration.primary_provider;
  }

  private tokensFor(
    tenantId: string,
    schoolId: string,
    configuration: ConfigurationRow
  ): GoogleAccessTokenProvider {
    const thisService = this;
    const driveToken = async (): Promise<string> => {
      const clientId = this.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
      const clientSecret = this.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
      if (!configuration.credentials_envelope || !clientId || !clientSecret) {
        throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
      }
      let refreshToken: string;
      try {
        refreshToken = ServerSecretVault.decrypt(configuration.credentials_envelope);
      } catch {
        throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
      }
      if (!refreshToken) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
      let response: Response;
      try {
        response = await this.fetcher('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          }),
          signal: AbortSignal.timeout(15_000)
        });
      } catch {
        throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
      }
      if (!response.ok) throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
      const tokenData = await response.json() as { access_token?: unknown };
      if (typeof tokenData.access_token !== 'string' || !tokenData.access_token.trim()) {
        throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
      }
      return tokenData.access_token;
    };
    return {
      async getAccessToken(input) {
        if (input.tenantId !== tenantId || input.schoolId !== schoolId) {
          throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
        }
        if (input.provider === 'google_drive') return driveToken();
        const platform = thisService.dependencies.platformTokens;
        if (!platform) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
        try {
          const token = await platform.getAccessToken(input);
          if (!token?.trim()) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
          return token;
        } catch {
          throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
        }
      }
    };
  }

  private adapterFor(
    tenantId: string,
    schoolId: string,
    configuration: ConfigurationRow,
    provider: Provider
  ): LogisticsStorageAdapter {
    if (!providersFor(configuration).includes(provider)) {
      throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
    }
    const tokens = this.tokensFor(tenantId, schoolId, configuration);
    if (provider === 'google_drive') {
      if (!configuration.drive_folder_id) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
      return new GoogleDriveLogisticsStorageAdapter(tokens, configuration.drive_folder_id, this.fetcher);
    }
    if (!configuration.gcs_bucket) throw new LogisticsLibraryStorageError('PROVIDER_NOT_CONFIGURED');
    return new GoogleCloudStorageLogisticsAdapter(tokens, configuration.gcs_bucket, this.fetcher);
  }

  private async verifyProviders(
    tenantId: string,
    schoolId: string,
    configuration: ConfigurationRow
  ): Promise<void> {
    try {
      const tokens = this.tokensFor(tenantId, schoolId, configuration);
      for (const provider of providersFor(configuration)) {
        const accessToken = await tokens.getAccessToken({ tenantId, schoolId, provider });
        if (provider === 'google_drive') {
          await this.verifyDriveFolder(accessToken, configuration.drive_folder_id);
        } else {
          await this.verifyGcsBucket(accessToken, configuration.gcs_bucket);
        }
      }
    } catch (error) {
      if (error instanceof LogisticsLibraryStorageError &&
          error.code === 'PROVIDER_NOT_CONFIGURED') {
        throw error;
      }
      throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    }
  }

  private async verifyDriveFolder(token: string, folderId: string | null): Promise<void> {
    if (!folderId) throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    const response = await this.fetcher(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed,ownedByMe,shared,permissions(type,role,allowFileDiscovery,domain)`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    const folder = await response.json() as {
      id?: unknown;
      mimeType?: unknown;
      trashed?: unknown;
      ownedByMe?: unknown;
      shared?: unknown;
      permissions?: Array<{ type?: unknown; role?: unknown; allowFileDiscovery?: unknown }>;
    };
    if (folder.id !== folderId || folder.mimeType !== 'application/vnd.google-apps.folder' ||
        folder.trashed !== false || folder.ownedByMe !== true || folder.shared !== false ||
        !Array.isArray(folder.permissions) ||
        !folder.permissions.some(permission => permission.type === 'user' && permission.role === 'owner') ||
        folder.permissions.some(permission => permission.type !== 'user' || permission.role !== 'owner' ||
          permission.allowFileDiscovery === true)) {
      throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    }
  }

  private async verifyDriveResource(
    token: string,
    objectKey: string,
    tenantId: string,
    schoolId: string,
    resourceId: string,
    folderId: string | null
  ): Promise<void> {
    const fileId = objectKey.startsWith('drive:') ? objectKey.slice(6) : '';
    if (!folderId || !/^[A-Za-z0-9_-]{10,256}$/.test(fileId)) {
      throw new LogisticsLibraryStorageError('STORAGE_FAILED');
    }
    const response = await this.fetcher(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,trashed,ownedByMe,shared,parents,appProperties,permissions(type,role,allowFileDiscovery)`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    const file = await response.json() as {
      id?: unknown;
      trashed?: unknown;
      ownedByMe?: unknown;
      shared?: unknown;
      parents?: unknown;
      appProperties?: Record<string, unknown>;
      permissions?: Array<{ type?: unknown; role?: unknown; allowFileDiscovery?: unknown }>;
    };
    if (file.id !== fileId || file.trashed !== false || file.ownedByMe !== true ||
        file.shared !== false || !Array.isArray(file.parents) || !file.parents.includes(folderId) ||
        file.appProperties?.tenantId !== tenantId || file.appProperties.schoolId !== schoolId ||
        file.appProperties.resourceId !== resourceId || !Array.isArray(file.permissions) ||
        !file.permissions.some(permission => permission.type === 'user' && permission.role === 'owner') ||
        file.permissions.some(permission => permission.type !== 'user' || permission.role !== 'owner' ||
          permission.allowFileDiscovery === true)) {
      throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    }
  }

  private async verifyGcsBucket(token: string, bucket: string | null): Promise<void> {
    if (!bucket) throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    const headers = { Authorization: `Bearer ${token}` };
    const base = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`;
    const [metadataResponse, iamResponse] = await Promise.all([
      this.fetcher(`${base}?fields=name,iamConfiguration`, {
        headers, signal: AbortSignal.timeout(15_000)
      }),
      this.fetcher(`${base}/iam?optionsRequestedPolicyVersion=3`, {
        headers, signal: AbortSignal.timeout(15_000)
      })
    ]);
    if (!metadataResponse.ok || !iamResponse.ok) {
      throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    }
    const [metadata, policy] = await Promise.all([
      metadataResponse.json() as Promise<{
        name?: unknown;
        iamConfiguration?: {
          publicAccessPrevention?: unknown;
          uniformBucketLevelAccess?: { enabled?: unknown };
        };
      }>,
      iamResponse.json() as Promise<{ bindings?: Array<{ members?: string[] }> }>
    ]);
    const publicPrincipals = new Set(['allUsers', 'allAuthenticatedUsers']);
    if (metadata.name !== bucket ||
        metadata.iamConfiguration?.publicAccessPrevention !== 'enforced' ||
        metadata.iamConfiguration.uniformBucketLevelAccess?.enabled !== true ||
        !Array.isArray(policy.bindings) ||
        policy.bindings.some(binding => !Array.isArray(binding.members) ||
          binding.members.some(member => publicPrincipals.has(member)))) {
      throw new LogisticsLibraryStorageError('PROVIDER_VERIFICATION_FAILED');
    }
  }
}
