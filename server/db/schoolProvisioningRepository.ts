import { randomBytes } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import type {
  SchoolProvisioningConfirmation,
  SchoolProvisioningOperationResponse,
  SchoolProvisioningRequest
} from '../../packages/shared-types/src/apiContracts';
import type { DatabaseClient, DatabasePool } from './postgres';
import { inTransaction } from './postgres';
import {
  withControlPlaneTransaction,
  setInvitationTenantContext,
  setInvitationTokenContext,
  withTenantLoginTransaction,
  withTenantTransaction,
  type VerifiedTenantPrincipal
} from './tenantContext';
import { INITIAL_REGISTERED_APPLICATIONS } from '../../src/data/applicationRegistryData';
import { buildApplicationInstanceConfiguration } from '../../src/data/applicationInstanceConfiguration';
import { CENTRAL_SHARED_SERVICE_IDS, type CentralSharedServiceId } from '../../packages/shared-types/src/sharedServiceContracts';
import {
  createInvitationToken,
  hashInvitationToken,
  validateSchoolProvisioningRequest
} from '../schoolProvisioning';
import { advanceLifecycle } from './applicationLifecycle';
import { assertAuthorized, type AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import { PERMISSIONS } from '../authorization/permissions';

interface ProvisioningRow extends QueryResultRow {
  operation_id: string;
  provisioning_status: SchoolProvisioningConfirmation['provisioningStatus'];
  configuration_readiness: SchoolProvisioningConfirmation['configurationReadiness'];
  application_readiness: SchoolProvisioningConfirmation['applicationReadiness'];
  invitation_delivery_status: SchoolProvisioningConfirmation['invitationDeliveryStatus'];
  deployment_status: SchoolProvisioningConfirmation['deploymentStatus'];
  school_id: string;
  tenant_id: string;
  instance_id: string;
  school_name: string;
  instance_status: SchoolProvisioningConfirmation['instanceStatus'];
  application_id: string;
  created_at: Date;
  updated_at: Date;
  invitation_id: string | null;
  invitation_status: string | null;
  invitation_email: string | null;
}

interface InvitationRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  school_id: string;
  administrator_name: string;
  administrator_email: string;
  expires_at: Date;
  invitation_status: string;
  intended_role_code: string;
  existing_user_id: string | null;
  existing_password_hash: string | null;
}

export interface PreparedInvitationDelivery {
  invitationId: string;
  attemptId: string;
  token: string;
  fullName: string;
  email: string;
  schoolName: string;
}

export interface PersistedProvisioningOperation extends SchoolProvisioningOperationResponse {
  idempotencyKey: string;
  requestHash: string;
  requestPayload: unknown;
  initiatedBy: string;
}

export class ProvisioningOperationError extends Error {
  constructor(
    public readonly operationId: string,
    public readonly failureCode: string,
    public readonly retryable: boolean
  ) {
    super('School provisioning failed and was recorded for safe retry.');
    this.name = 'ProvisioningOperationError';
  }
}

interface AccountRow extends QueryResultRow {
  user_id: string;
  tenant_id: string;
  school_name: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: string;
}

export interface PersistedSchoolProvisioning extends SchoolProvisioningConfirmation {
  invitationId: string | null;
  invitationEmail: string | null;
  idempotentReplay: boolean;
}

export interface SchoolAccount {
  userId: string;
  tenantId: string;
  schoolName: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: string;
}

export interface SchoolSummary extends QueryResultRow {
  id: string;
  tenant_id: string;
  school_slug: string;
  name: string;
  short_name: string;
  display_name: string;
  school_type: string;
  country: string;
  state_province: string;
  city: string;
  physical_address: string;
  official_contact_email: string;
  telephone: string;
  website: string | null;
  motto: string | null;
  principal_name: string | null;
  principal_email: string | null;
  principal_phone: string | null;
  ict_administrator_name: string | null;
  ict_administrator_email: string | null;
  ict_administrator_phone: string | null;
  logo_url: string | null;
  primary_brand_color: string;
  accent_brand_color: string;
  time_zone: string;
  currency: string;
  default_language: string;
  instance_id: string;
  application_id: string;
  application_version: string | null;
  instance_status: string;
  enabled_features: string[];
  central_service_dependencies?: string[];
  created_at: Date;
  activated_at: Date | null;
}

async function withInvitationTokenTransaction<T>(
  pool: DatabasePool,
  tokenHash: Buffer,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  return inTransaction(pool, async client => {
    await setInvitationTokenContext(client, tokenHash);
    return operation(client);
  });
}

async function withSchoolLoginTransaction<T>(
  pool: DatabasePool,
  tenantId: string,
  email: string,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new Error('TENANT_NOT_FOUND');
  }
  return withTenantLoginTransaction(pool, tenantId, email, operation);
}

function mapProvisioningRow(row: ProvisioningRow, idempotentReplay: boolean): PersistedSchoolProvisioning {
  return {
    operationId: row.operation_id,
    schoolId: row.school_id,
    tenantId: row.tenant_id,
    instanceId: row.instance_id,
    schoolName: row.school_name,
    instanceStatus: row.instance_status,
    provisioningStatus: row.provisioning_status,
    configurationReadiness: row.configuration_readiness,
    applicationReadiness: row.application_readiness,
    administratorActivationStatus: row.invitation_status === 'accepted'
      ? 'activated'
      : row.invitation_status === 'expired'
        ? 'expired'
        : row.invitation_status === 'revoked'
          ? 'revoked'
          : row.invitation_delivery_status === 'delivered'
            ? 'invitation_sent'
            : 'delivery_pending',
    invitationDeliveryStatus: row.invitation_delivery_status,
    deploymentStatus: row.deployment_status,
    applicationId: row.application_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    invitationId: row.invitation_id,
    invitationEmail: row.invitation_email,
    idempotentReplay
  };
}

const PROVISIONING_SELECT = `
  SELECT operation.id AS operation_id, operation.status AS provisioning_status,
         CASE WHEN operation.status = 'ready' AND ai.provisioning_status = 'ready'
              THEN 'ready' ELSE 'pending' END AS configuration_readiness,
         CASE WHEN deployment.health_check_status = 'verified' THEN 'ready'
              WHEN deployment.health_check_status = 'failed' THEN 'failed'
              ELSE 'pending' END AS application_readiness,
         deployment.deployment_status,
         CASE WHEN invitation_outbox.status = 'delivered' THEN 'delivered'
              WHEN invitation_outbox.status IN ('retryable_failure', 'failed') THEN 'retryable_failure'
              WHEN invitation_outbox.status = 'sending' THEN 'sending'
              ELSE 'pending' END AS invitation_delivery_status,
         s.id AS school_id, t.id AS tenant_id, ai.id AS instance_id,
         s.name AS school_name, ai.status AS instance_status,
         ai.application_id, spr.created_at, operation.updated_at,
         invitation.id AS invitation_id, invitation.status AS invitation_status,
         invitation.invitation_email
  FROM production.school_provisioning_requests spr
  JOIN production.school_provisioning_operations operation
    ON operation.idempotency_key = spr.idempotency_key
  JOIN production.tenants t ON t.id = spr.tenant_id
  JOIN production.schools s ON s.id = spr.school_id AND s.tenant_id = spr.tenant_id
  JOIN production.application_instances ai
    ON ai.id = spr.application_instance_id AND ai.tenant_id = spr.tenant_id
  LEFT JOIN production.application_instance_deployments deployment
    ON deployment.tenant_id = spr.tenant_id
   AND deployment.application_instance_id = spr.application_instance_id
  LEFT JOIN LATERAL (
    SELECT status
    FROM production.invitation_outbox
    WHERE invitation_id = (
      SELECT id FROM production.school_admin_invitations
      WHERE tenant_id = spr.tenant_id AND school_id = spr.school_id
      ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY created_at DESC LIMIT 1
  ) invitation_outbox ON true
  LEFT JOIN LATERAL (
    SELECT id, status, administrator_email AS invitation_email
    FROM production.school_admin_invitations
    WHERE tenant_id = spr.tenant_id AND school_id = spr.school_id
    ORDER BY created_at DESC LIMIT 1
  ) invitation ON true
`;

export class SchoolProvisioningRepository {
  constructor(private readonly pool: DatabasePool) {}

  async provision(
    input: SchoolProvisioningRequest,
    initiatedBy: string,
    idempotencyKey: string,
    requestHash: string,
    principal: VerifiedTenantPrincipal
  ): Promise<PersistedSchoolProvisioning> {
    input = validateSchoolProvisioningRequest(input);
    const operationId = await withControlPlaneTransaction(this.pool, principal, async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [idempotencyKey]);
      const current = await client.query<{
        id: string;
        request_hash: string;
        status: string;
      }>(
        `SELECT id, request_hash, status
         FROM production.school_provisioning_operations
         WHERE idempotency_key = $1
         FOR UPDATE`,
        [idempotencyKey]
      );
      if (current.rows[0]) {
        if (current.rows[0].request_hash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT');
        if (current.rows[0].status !== 'ready') {
          await client.query(
            `UPDATE production.school_provisioning_operations
             SET status = 'running', retryable = false, attempt_count = attempt_count + 1,
                 error_code = NULL, error_details = '{}'::jsonb, updated_at = now()
             WHERE id = $1`,
            [current.rows[0].id]
          );
        }
        return current.rows[0].id;
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO production.school_provisioning_operations
           (idempotency_key, request_hash, request_payload, initiated_by,
            status, attempt_count)
         VALUES ($1, $2, $3::jsonb, $4, 'running', 1)
         RETURNING id`,
        [idempotencyKey, requestHash, JSON.stringify(input), initiatedBy]
      );
      return inserted.rows[0].id;
    });

    try {
      const result = await withControlPlaneTransaction(this.pool, principal, async client => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [operationId]);
        const operation = await client.query<{ status: string; request_hash: string }>(
          `SELECT status, request_hash FROM production.school_provisioning_operations
           WHERE id = $1 FOR UPDATE`,
          [operationId]
        );
        if (operation.rows[0]?.request_hash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT');
        const existing = await client.query<ProvisioningRow>(
          `${PROVISIONING_SELECT} WHERE spr.idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existing.rows[0]) return mapProvisioningRow(existing.rows[0], true);

        const tenantResult = await client.query<{ id: string; created_at: Date }>(
          `INSERT INTO production.tenants (display_name, status, created_by, tenant_slug)
           VALUES ($1, 'pending', $2, $3) RETURNING id, created_at`,
          [input.school.displayName, initiatedBy, input.school.slug]
        );
        const tenant = tenantResult.rows[0];
        const organizationResult = await client.query<{ id: string }>(
          `INSERT INTO production.organizations
             (tenant_id, name, school_type, country, state_province, city,
              physical_address, official_contact_email, telephone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [tenant.id, input.school.displayName, input.school.schoolType, input.school.country,
            input.school.stateProvince, input.school.city, input.school.physicalAddress,
            input.school.officialContactEmail, input.school.telephone]
        );
        const schoolResult = await client.query<{ id: string }>(
          `INSERT INTO production.schools
             (tenant_id, organization_id, name, school_slug, short_name, school_type,
              country, state_province, city, physical_address, official_contact_email,
              telephone, time_zone, currency, default_language, website, motto,
              principal_name, principal_email, principal_phone, ict_administrator_name,
              ict_administrator_email, ict_administrator_phone, logo_url,
              primary_brand_color, accent_brand_color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                   $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
           RETURNING id`,
          [tenant.id, organizationResult.rows[0].id, input.school.name, input.school.slug,
            input.school.shortName, input.school.schoolType, input.school.country,
            input.school.stateProvince, input.school.city, input.school.physicalAddress,
            input.school.officialContactEmail, input.school.telephone, input.configuration.timeZone,
            input.configuration.currency, input.configuration.language, input.school.website ?? null,
            input.school.motto ?? null, input.school.principalName ?? null,
            input.school.principalEmail ?? null, input.school.principalPhone ?? null,
            input.school.ictAdministratorName ?? null, input.school.ictAdministratorEmail ?? null,
            input.school.ictAdministratorPhone ?? null, input.school.logoUrl ?? null,
            input.school.primaryBrandColor ?? '#1d4ed8', input.school.accentBrandColor ?? '#0f766e']
        );
        const schoolId = schoolResult.rows[0].id;

        await client.query(
          `INSERT INTO production.school_configurations
             (tenant_id, school_id, academic_session, academic_term_structure,
              education_levels, grading_configuration)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
          [tenant.id, schoolId, input.configuration.academicSession,
            JSON.stringify(input.configuration.academicTermStructure),
            JSON.stringify(input.configuration.educationLevels),
            JSON.stringify(input.configuration.gradingConfiguration ?? {})]
        );
        await client.query(
          `INSERT INTO production.school_configuration_versions
             (tenant_id, school_id, configuration_version, configuration, created_by)
           VALUES ($1, $2, 1, $3::jsonb, $4)`,
          [tenant.id, schoolId, JSON.stringify(input.configuration), initiatedBy]
        );
        const application = INITIAL_REGISTERED_APPLICATIONS.find(item => item.appId === input.applicationId);
        if (!application) throw new Error('APPLICATION_REGISTRY_ENTRY_UNAVAILABLE');
        const applicationConfiguration = input.applicationConfiguration ??
          buildApplicationInstanceConfiguration({
            applicationId: input.applicationId,
            templateId: input.templateId,
            templateVersion: input.templateVersion,
            enabledCapabilities: input.enabledFeatures,
            deploymentArchitecture: input.architecture
          });
        const instanceResult = await client.query<{ id: string }>(
          `INSERT INTO production.application_instances
             (tenant_id, school_id, application_id, application_version, configuration_version,
              status, provisioning_status, enabled_features, deployment_architecture,
              architecture, template_id, template_version)
           VALUES ($1, $2, $3, $4, $5, 'provisioning', 'running',
                   $6::text[], 'shared_database', $7, $8, $9)
           RETURNING id`,
          [
            tenant.id, schoolId, input.applicationId, application.version,
            String(applicationConfiguration.configurationVersion), input.enabledFeatures,
            input.architecture, input.templateId, input.templateVersion
          ]
        );
        const instanceId = instanceResult.rows[0].id;
        const configuration = {
          ...applicationConfiguration,
          tenantId: tenant.id,
          architecture: input.architecture,
          template: { id: input.templateId, version: input.templateVersion },
          enabledFeatureIds: applicationConfiguration.enabledCapabilities,
          featureDependencies: applicationConfiguration.capabilityDependencies,
          featureOverrides: input.featureOverrides ?? {},
          schoolConfiguration: input.configuration,
          branding: {
            logoUrl: input.school.logoUrl,
            primaryColor: input.school.primaryBrandColor ?? '#1d4ed8',
            accentColor: input.school.accentBrandColor ?? '#0f766e'
          },
          deployment: input.deployment,
          provisioningStatus: 'ready'
        };
        await client.query(
          `INSERT INTO production.application_instance_configurations
             (tenant_id, application_instance_id, configuration_version, schema_version,
              configuration, created_by)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [
            tenant.id, instanceId, applicationConfiguration.configurationVersion,
            applicationConfiguration.schemaVersion, JSON.stringify(configuration), initiatedBy
          ]
        );
        const logisticsConfiguration =
          applicationConfiguration.featureConfigurations?.feat_logistics_support;
        if (logisticsConfiguration) {
          const capabilities = logisticsConfiguration.settings.capabilities;
          if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
            throw new Error('LOGISTICS_FEATURE_CONFIGURATION_INVALID');
          }
          await client.query(
            `INSERT INTO production.logistics_feature_configurations
               (tenant_id, school_id, capabilities, settings)
             VALUES ($1, $2, $3::jsonb, $4::jsonb)
             ON CONFLICT (tenant_id, school_id) DO UPDATE SET
               configuration_version = production.logistics_feature_configurations.configuration_version + 1,
               capabilities = EXCLUDED.capabilities,
               settings = EXCLUDED.settings,
               updated_at = now()`,
            [tenant.id, schoolId, JSON.stringify(capabilities),
              JSON.stringify(logisticsConfiguration.settings)]
          );
        }
        await client.query(
          `INSERT INTO production.school_commercial_agreements
             (tenant_id, school_id, application_instance_id, commercial_model,
              plan_reference, price_reference, currency, billing_interval, agreed_amount_minor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [tenant.id, schoolId, instanceId, input.commercial.commercialModel,
            input.commercial.planReference, input.commercial.priceReference,
            input.commercial.currency, input.commercial.billingInterval,
            input.commercial.agreedAmountMinor ?? null]
        );
        const domainRequested = Boolean(
          input.deployment.requestedSubdomain ||
          input.deployment.requestedCustomDomain ||
          input.deployment.applicationUrl
        );
        await client.query(
          `INSERT INTO production.application_instance_deployments
             (tenant_id, application_instance_id, requested_subdomain,
              requested_custom_domain, application_url, deployment_target,
              deployment_status, dns_status, tls_status)
           VALUES ($1, $2, $3, $4, $5, 'shared_platform', $6, $7, $8)`,
          [tenant.id, instanceId, input.deployment.requestedSubdomain ?? null,
            input.deployment.requestedCustomDomain ?? null, input.deployment.applicationUrl ?? null,
            domainRequested ? 'manual_action_required' : 'not_required',
            input.deployment.requestedSubdomain || input.deployment.requestedCustomDomain
              ? 'manual_action_required' : 'not_requested',
            input.deployment.requestedCustomDomain ? 'manual_action_required' : 'not_requested']
        );
        await client.query(
          `INSERT INTO production.school_provisioning_requests
             (idempotency_key, request_hash, tenant_id, school_id,
              application_instance_id, initiated_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [idempotencyKey, requestHash, tenant.id, schoolId, instanceId, initiatedBy]
        );
        const invitationToken = createInvitationToken();
        const invitationResult = await client.query<{ id: string }>(
          `INSERT INTO production.school_admin_invitations
             (tenant_id, school_id, administrator_name, administrator_email,
              intended_role_code, token_hash, expires_at, created_by)
           VALUES ($1, $2, $3, $4, 'tenant_admin', $5, $6, $7) RETURNING id`,
          [tenant.id, schoolId, input.administrator.fullName, input.administrator.email,
            invitationToken.tokenHash, new Date(Date.now() + 24 * 60 * 60 * 1000), initiatedBy]
        );
        await client.query(
          `INSERT INTO production.invitation_outbox (tenant_id, invitation_id)
           VALUES ($1, $2)`,
          [tenant.id, invitationResult.rows[0].id]
        );
        await client.query(
          `UPDATE production.application_instances
           SET status = 'ready_for_activation', provisioning_status = 'ready', updated_at = now()
           WHERE tenant_id = $1 AND id = $2`,
          [tenant.id, instanceId]
        );
        await advanceLifecycle(client, tenant.id, instanceId, 'template_verified', initiatedBy, {
          templateId: input.templateId,
          templateVersion: input.templateVersion,
          validatedAgainst: 'application_registry'
        });
        await client.query(
          `UPDATE production.school_provisioning_operations
           SET tenant_id = $2, school_id = $3, application_instance_id = $4,
               status = 'ready', retryable = false, error_code = NULL,
               error_details = '{}'::jsonb, completed_at = now(), updated_at = now()
           WHERE id = $1`,
          [operationId, tenant.id, schoolId, instanceId]
        );
        await client.query(
          `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
           VALUES ($1, $2, 'school_instance_provisioned', $3::jsonb)`,
          [tenant.id, initiatedBy, JSON.stringify({
            operationId,
            schoolId,
            applicationInstanceId: instanceId,
            configurationVersion: 1
          })]
        );
        const stored = await client.query<ProvisioningRow>(
          `${PROVISIONING_SELECT} WHERE spr.idempotency_key = $1`,
          [idempotencyKey]
        );
        return mapProvisioningRow(stored.rows[0], false);
      });
      return result;
    } catch (error) {
      const failureCode = (error as { code?: string })?.code === '23505'
        ? 'DUPLICATE_SCHOOL'
        : 'PROVISIONING_FAILED';
      const retryable = failureCode !== 'DUPLICATE_SCHOOL';
      await withControlPlaneTransaction(this.pool, principal, client =>
        client.query(
          `UPDATE production.school_provisioning_operations
           SET status = $2, retryable = $3,
               error_code = $4,
               error_details = jsonb_build_object('message', $5::text),
               updated_at = now()
           WHERE id = $1 AND status <> 'ready'`,
          [
            operationId,
            retryable ? 'retryable_failure' : 'failed',
            retryable,
            failureCode,
            error instanceof Error ? error.message : 'Provisioning failed.'
          ]
        ).then(() => undefined)
      );
      throw new ProvisioningOperationError(operationId, failureCode, retryable);
    }
  }

  async recordInvitationDelivery(
    invitationId: string,
    principal: VerifiedTenantPrincipal,
    attemptId: string,
    result: { providerMessageId?: string; error?: string }
  ): Promise<void> {
    await withControlPlaneTransaction(this.pool, principal, async client => {
      const failed = result.error !== undefined;
      const outbox = await client.query<{ attempt_count: number; max_attempts: number }>(
        `UPDATE production.invitation_outbox
         SET status = CASE
               WHEN NOT $2::boolean THEN 'delivered'
               WHEN attempt_count >= max_attempts THEN 'dead_letter'
               ELSE 'retryable_failure' END,
             dead_lettered_at = CASE
               WHEN $2::boolean AND attempt_count >= max_attempts THEN now() ELSE NULL END,
             last_error = $3, provider_message_id = $4, locked_at = NULL, updated_at = now()
         WHERE invitation_id = $1 AND status = 'sending'
         RETURNING attempt_count, max_attempts`,
        [invitationId, failed, result.error ?? null, result.providerMessageId ?? null]
      );
      await client.query(
        `UPDATE production.school_admin_invitations
         SET delivery_attempts = delivery_attempts + 1,
             status = CASE WHEN $2::boolean THEN 'delivery_failed' ELSE 'pending' END,
             last_delivery_error = $3, updated_at = now()
         WHERE id = $1`,
        [invitationId, failed, result.error ?? null]
      );
      await client.query(
        `UPDATE production.invitation_delivery_attempts
         SET status = CASE WHEN $2::boolean THEN 'failed' ELSE 'delivered' END,
             error_code = CASE WHEN $2::boolean THEN 'EMAIL_DELIVERY_FAILED' ELSE NULL END,
             provider_message_id = $3,
             completed_at = now()
         WHERE id = $1 AND status = 'sending'`,
        [attemptId, failed, result.providerMessageId ?? null]
      );
      if (failed && outbox.rows[0] && outbox.rows[0].attempt_count >= outbox.rows[0].max_attempts) {
        await client.query(
          `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
           SELECT tenant_id, $2, 'school_admin_invitation_dead_lettered', $3::jsonb
           FROM production.school_admin_invitations WHERE id = $1`,
          [invitationId, principal.email || 'platform_admin',
            JSON.stringify({ invitationId, attempts: outbox.rows[0].attempt_count })]
        );
      }
      if (!failed) {
        const instance = await client.query<{ tenant_id: string; application_instance_id: string }>(
          `SELECT request.tenant_id, request.application_instance_id
           FROM production.school_admin_invitations invitation
           JOIN production.school_provisioning_requests request
             ON request.tenant_id = invitation.tenant_id AND request.school_id = invitation.school_id
           WHERE invitation.id = $1 AND request.application_instance_id IS NOT NULL
           LIMIT 1`,
          [invitationId]
        );
        if (instance.rows[0]) {
          await advanceLifecycle(
            client, instance.rows[0].tenant_id, instance.rows[0].application_instance_id,
            'admin_invited', principal.email || 'platform_admin', { invitationId }
          );
        }
      }
    });
  }

  async prepareInvitationDelivery(
    invitationId: string,
    principal: VerifiedTenantPrincipal
  ): Promise<PreparedInvitationDelivery | undefined> {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query<{
        invitation_id: string;
        outbox_id: string;
        tenant_id: string;
        administrator_name: string;
        administrator_email: string;
        school_name: string;
        status: string;
        attempt_count: number;
        max_attempts: number;
        token_version: number;
      }>(
        `SELECT invitation.id AS invitation_id, outbox.id AS outbox_id,
                invitation.tenant_id, invitation.administrator_name,
                invitation.administrator_email, school.name AS school_name,
                outbox.status, outbox.attempt_count, outbox.max_attempts,
                invitation.token_version
         FROM production.school_admin_invitations invitation
         JOIN production.schools school
           ON school.tenant_id = invitation.tenant_id AND school.id = invitation.school_id
         JOIN production.invitation_outbox outbox
           ON outbox.tenant_id = invitation.tenant_id
          AND outbox.invitation_id = invitation.id
         WHERE invitation.id = $1
           AND invitation.status IN ('pending', 'delivery_failed')
           AND (outbox.status IN ('pending', 'retryable_failure')
                OR (outbox.status = 'sending' AND outbox.locked_at < now() - interval '2 minutes'))
         FOR UPDATE OF invitation, outbox`,
        [invitationId]
      );
      const row = result.rows[0];
      if (!row) return undefined;
      if (row.attempt_count >= row.max_attempts) {
        await client.query(
          `UPDATE production.invitation_outbox
           SET status = 'dead_letter', dead_lettered_at = now(), locked_at = NULL, updated_at = now()
           WHERE id = $1`,
          [row.outbox_id]
        );
        await client.query(
          `UPDATE production.school_admin_invitations
           SET status = 'delivery_failed', updated_at = now() WHERE id = $1`,
          [invitationId]
        );
        return undefined;
      }
      const { token, tokenHash } = createInvitationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await client.query(
        `UPDATE production.school_admin_invitations
         SET token_hash = $2, status = 'pending', expires_at = $3,
             token_version = token_version + 1,
             last_delivery_error = NULL, updated_at = now()
         WHERE id = $1`,
        [invitationId, tokenHash, expiresAt]
      );
      // Rotation invalidates any previously issued link; record it, noting when
      // the previous attempt's outcome is unknown (a stale 'sending' lock).
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_admin_invitation_token_rotated', $3::jsonb)`,
        [row.tenant_id, principal.email || 'platform_admin', JSON.stringify({
          invitationId,
          fromVersion: row.token_version,
          toVersion: row.token_version + 1,
          previousAttemptOutcomeUnknown: row.status === 'sending'
        })]
      );
      await client.query(
        `UPDATE production.invitation_outbox
         SET status = 'sending', attempt_count = attempt_count + 1,
             locked_at = now(), last_error = NULL, updated_at = now()
         WHERE id = $1`,
        [row.outbox_id]
      );
      const attempt = await client.query<{ id: string }>(
        `INSERT INTO production.invitation_delivery_attempts
           (tenant_id, outbox_id, status, token_version)
         VALUES ($1, $2, 'sending', $3) RETURNING id`,
        [row.tenant_id, row.outbox_id, row.token_version + 1]
      );
      return {
        invitationId,
        attemptId: attempt.rows[0].id,
        token,
        fullName: row.administrator_name,
        email: row.administrator_email,
        schoolName: row.school_name
      };
    });
  }

  async queueInvitationRetry(
    instanceId: string,
    principal: VerifiedTenantPrincipal,
    idempotencyKey?: string
  ): Promise<string | undefined> {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      // A repeated request with the same key never re-queues delivery.
      const result = await client.query<{ invitation_id: string }>(
        `UPDATE production.invitation_outbox outbox
         SET status = 'pending', available_at = now(), updated_at = now(),
             last_error = NULL, idempotency_key = COALESCE($2, outbox.idempotency_key),
             attempt_count = CASE WHEN outbox.status = 'dead_letter' THEN 0 ELSE outbox.attempt_count END,
             dead_lettered_at = NULL
         FROM production.school_admin_invitations invitation,
              production.school_provisioning_requests request
         WHERE outbox.invitation_id = invitation.id
           AND request.tenant_id = invitation.tenant_id
           AND request.school_id = invitation.school_id
           AND request.application_instance_id = $1
           AND outbox.status IN ('retryable_failure', 'failed', 'dead_letter')
           AND invitation.status IN ('pending', 'delivery_failed')
           AND ($2::text IS NULL OR outbox.idempotency_key IS DISTINCT FROM $2)
         RETURNING invitation.id AS invitation_id`,
        [instanceId, idempotencyKey ?? null]
      );
      return result.rows[0]?.invitation_id;
    });
  }

  /** Revokes an unaccepted invitation; its link stops working immediately. */
  async revokeInvitation(
    invitationId: string,
    principal: VerifiedTenantPrincipal,
    reason: string
  ): Promise<boolean> {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const revoked = await client.query<{ tenant_id: string }>(
        `UPDATE production.school_admin_invitations
         SET status = 'revoked', revoked_at = now(), token_hash = $2,
             token_version = token_version + 1, updated_at = now()
         WHERE id = $1 AND status IN ('pending', 'delivery_failed')
         RETURNING tenant_id`,
        [invitationId, randomBytes(32)]
      );
      if (revoked.rowCount !== 1) return false;
      await client.query(
        `UPDATE production.invitation_outbox
         SET status = 'cancelled', locked_at = NULL, updated_at = now()
         WHERE invitation_id = $1 AND status IN ('pending', 'sending', 'retryable_failure')`,
        [invitationId]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_admin_invitation_revoked', $3::jsonb)`,
        [revoked.rows[0].tenant_id, principal.email || 'platform_admin',
          JSON.stringify({ invitationId, reason })]
      );
      return true;
    });
  }

  async getInvitation(tokenHash: Buffer): Promise<InvitationRow | undefined> {
    return withInvitationTokenTransaction(this.pool, tokenHash, async client => {
      const result = await client.query<InvitationRow>(
        `SELECT invitation.id, invitation.tenant_id, invitation.school_id,
                invitation.administrator_name, invitation.administrator_email,
                invitation.expires_at, invitation.status AS invitation_status,
                invitation.intended_role_code,
                user_record.id AS existing_user_id,
                user_record.password_hash AS existing_password_hash
         FROM production.school_admin_invitations invitation
         LEFT JOIN production.users user_record
           ON lower(user_record.email) = lower(invitation.administrator_email)
         WHERE invitation.token_hash = $1`,
        [tokenHash]
      );
      return result.rows[0];
    });
  }

  async activateAdministrator(
    invitationId: string,
    tokenHash: Buffer,
    passwordHash: string,
    existingPasswordHash?: string
  ): Promise<{ tenantId: string; userId: string }> {
    return withInvitationTokenTransaction(this.pool, tokenHash, async client => {
      const candidateResult = await client.query<Pick<InvitationRow, 'tenant_id'>>(
        `SELECT tenant_id
         FROM production.school_admin_invitations
         WHERE id = $1 AND token_hash = $2`,
        [invitationId, tokenHash]
      );
      const candidate = candidateResult.rows[0];
      if (!candidate) throw new Error('INVITATION_INVALID_OR_EXPIRED');
      await setInvitationTenantContext(client, candidate.tenant_id, tokenHash);
      const invitationResult = await client.query<InvitationRow>(
        `SELECT id, tenant_id, school_id, administrator_name, administrator_email,
                expires_at, status AS invitation_status, intended_role_code
         FROM production.school_admin_invitations
         WHERE id = $1 AND token_hash = $2
         FOR UPDATE`,
        [invitationId, tokenHash]
      );
      const invitation = invitationResult.rows[0];
      if (!invitation || invitation.invitation_status !== 'pending' ||
          invitation.expires_at.getTime() <= Date.now() ||
          invitation.intended_role_code !== 'tenant_admin') {
        throw new Error('INVITATION_INVALID_OR_EXPIRED');
      }
      const userResult = await client.query<{
        id: string;
        password_hash: string;
        account_status: 'active' | 'suspended';
      }>(
        `SELECT id, password_hash, account_status FROM production.users
         WHERE lower(email) = lower($1) FOR UPDATE`,
        [invitation.administrator_email]
      );
      let userId: string;
      if (userResult.rows[0]) {
        if (userResult.rows[0].account_status !== 'active') {
          throw new Error('ACCOUNT_INACTIVE');
        }
        if (!existingPasswordHash || existingPasswordHash !== userResult.rows[0].password_hash) {
          throw new Error('ACCOUNT_CREDENTIALS_CHANGED');
        }
        userId = userResult.rows[0].id;
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO production.users
             (email, full_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, now())
           RETURNING id`,
          [invitation.administrator_email, invitation.administrator_name, passwordHash]
        );
        userId = inserted.rows[0].id;
      }

      const existingMembership = await client.query(
        `SELECT 1 FROM production.memberships
         WHERE tenant_id = $1 AND user_id = $2
         FOR UPDATE`,
        [invitation.tenant_id, userId]
      );
      if (existingMembership.rowCount !== 0) {
        throw new Error('ADMIN_MEMBERSHIP_ALREADY_EXISTS');
      }
      const membership = await client.query(
        `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (tenant_id, user_subject) DO NOTHING
         RETURNING user_id`,
        [invitation.tenant_id, userId, userId, invitation.intended_role_code]
      );
      if (membership.rowCount !== 1) {
        throw new Error('ADMIN_MEMBERSHIP_ALREADY_EXISTS');
      }
      await client.query(
        `INSERT INTO production.membership_role_assignments
           (tenant_id, user_subject, role_code, assigned_by)
         VALUES ($1, $2, $3, $4)`,
        [invitation.tenant_id, userId, invitation.intended_role_code, `invitation:${invitation.id}`]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'membership_role_assigned', $3::jsonb)`,
        [invitation.tenant_id, `invitation:${invitation.id}`,
          JSON.stringify({ invitationId: invitation.id, roleCode: invitation.intended_role_code })]
      );
      const accepted = await client.query(
        `UPDATE production.school_admin_invitations
         SET status = 'accepted', accepted_at = now(), token_hash = $2, updated_at = now()
         WHERE id = $1 AND tenant_id = $3 AND token_hash = $4
           AND status = 'pending' AND expires_at > now()
         RETURNING id`,
        [invitation.id, createInvitationToken().tokenHash, invitation.tenant_id, tokenHash]
      );
      if (accepted.rowCount !== 1) throw new Error('INVITATION_INVALID_OR_EXPIRED');
      await client.query(
        `UPDATE production.tenants SET status = 'approved', updated_at = now()
         WHERE id = $1`,
        [invitation.tenant_id]
      );
      await client.query(
        `UPDATE production.school_admin_invitations
         SET accepted_user_id = $2, updated_at = now()
         WHERE id = $1`,
        [invitation.id, userId]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_admin_invitation_accepted', $3::jsonb)`,
        [invitation.tenant_id, userId, JSON.stringify({ invitationId: invitation.id })]
      );
      // Administrator and membership activation do not activate the application.
      const instance = await client.query<{ application_instance_id: string }>(
        `SELECT application_instance_id FROM production.school_provisioning_requests
         WHERE tenant_id = $1 AND school_id = $2 AND application_instance_id IS NOT NULL
         LIMIT 1`,
        [invitation.tenant_id, invitation.school_id]
      );
      if (instance.rows[0]) {
        await advanceLifecycle(
          client, invitation.tenant_id, instance.rows[0].application_instance_id,
          'membership_active', userId, { invitationId: invitation.id }
        );
      }
      return { tenantId: invitation.tenant_id, userId };
    });
  }

  async authenticateAdministrator(tenantId: string, email: string): Promise<SchoolAccount | undefined> {
    return withSchoolLoginTransaction(this.pool, tenantId, email, async client => {
      const result = await client.query<AccountRow>(
        `SELECT user_record.id AS user_id, membership.tenant_id, school_org.name AS school_name,
                user_record.email, user_record.full_name, user_record.password_hash, membership.role
         FROM production.users user_record
         JOIN production.memberships membership ON membership.user_id = user_record.id
         JOIN production.tenants tenant ON tenant.id = membership.tenant_id
         JOIN production.organizations school_org ON school_org.tenant_id = tenant.id
         JOIN production.schools school
           ON school.tenant_id = school_org.tenant_id
          AND school.organization_id = school_org.id
         WHERE membership.tenant_id = $1
           AND lower(user_record.email) = lower($2)
           AND user_record.account_status = 'active'
           AND membership.status = 'active'
           AND tenant.status = 'approved'
         LIMIT 1`,
        [tenantId, email]
      );
      const row = result.rows[0];
      return row && {
        userId: row.user_id,
        tenantId: row.tenant_id,
        schoolName: row.school_name,
        email: row.email,
        fullName: row.full_name,
        passwordHash: row.password_hash,
        role: row.role
      };
    });
  }

  async getMembership(principal: VerifiedTenantPrincipal, userId: string): Promise<boolean> {
    return withTenantTransaction(this.pool, principal, async client => {
      const result = await client.query(
        `SELECT 1 FROM production.memberships membership
         JOIN production.tenants tenant ON tenant.id = membership.tenant_id
         WHERE membership.tenant_id = $1 AND membership.user_id = $2
           AND membership.status = 'active' AND tenant.status = 'approved'`,
        [principal.tenantId, userId]
      );
      return result.rowCount === 1;
    });
  }

  async getSchool(principal: VerifiedTenantPrincipal): Promise<SchoolSummary | undefined> {
    return withTenantTransaction(this.pool, principal, async client => {
      const result = await client.query<SchoolSummary>(
        `SELECT school.id, school.tenant_id, school.school_slug, school.name,
                school.short_name, tenant.display_name,
                school.school_type, school.country, school.state_province, school.city,
                school.physical_address, school.official_contact_email, school.telephone,
                school.website, school.motto, school.principal_name, school.principal_email,
                school.principal_phone, school.ict_administrator_name,
                school.ict_administrator_email, school.ict_administrator_phone,
                school.logo_url, school.primary_brand_color, school.accent_brand_color,
                school.time_zone, school.currency, school.default_language,
                instance.id AS instance_id, instance.application_id, instance.application_version,
                instance.status AS instance_status, instance.enabled_features,
                COALESCE(latest_cfg.configuration->'centralServiceDependencies', '[]'::jsonb) AS central_service_dependencies,
                instance.created_at, instance.activated_at
         FROM production.schools school
         JOIN production.tenants tenant ON tenant.id = school.tenant_id
         JOIN production.application_instances instance
           ON instance.tenant_id = school.tenant_id AND instance.school_id = school.id
         LEFT JOIN LATERAL (
           SELECT configuration
           FROM production.application_instance_configurations
           WHERE tenant_id = instance.tenant_id AND application_instance_id = instance.id
           ORDER BY configuration_version DESC LIMIT 1
         ) latest_cfg ON true
         WHERE instance.status IN ('ready_for_activation', 'active') AND school.tenant_id = $1
         LIMIT 1`,
        [principal.tenantId]
      );
      return result.rows[0];
    });
  }

  async updateApplicationServiceDependencies(
    instanceId: string,
    centralServiceDependencies: readonly string[],
    principal: VerifiedTenantPrincipal
  ): Promise<{ instanceId: string; configurationVersion: number; centralServiceDependencies: CentralSharedServiceId[] }> {
    const uniqueDeps = [...new Set(centralServiceDependencies)].sort();
    for (const dep of uniqueDeps) {
      if (!CENTRAL_SHARED_SERVICE_IDS.includes(dep as CentralSharedServiceId)) {
        throw new Error(`UNKNOWN_SHARED_SERVICE_DEPENDENCY:${dep}`);
      }
    }
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const current = await client.query<{
        tenant_id: string;
        school_id: string;
        configuration: Record<string, unknown>;
        current_version: number;
      }>(
        `SELECT instance.tenant_id, instance.school_id,
                latest.configuration, latest.configuration_version AS current_version
         FROM production.application_instances instance
         JOIN LATERAL (
           SELECT configuration, configuration_version
           FROM production.application_instance_configurations
           WHERE tenant_id = instance.tenant_id AND application_instance_id = instance.id
           ORDER BY configuration_version DESC LIMIT 1
         ) latest ON true
         WHERE instance.id = $1
         FOR UPDATE OF instance`,
        [instanceId]
      );
      const row = current.rows[0];
      if (!row) throw new Error('APPLICATION_INSTANCE_NOT_FOUND');

      const nextVersion = row.current_version + 1;
      const updatedSnapshot = {
        ...row.configuration,
        centralServiceDependencies: uniqueDeps,
        configurationVersion: nextVersion
      };
      await client.query(
        `INSERT INTO production.application_instance_configurations
           (tenant_id, application_instance_id, configuration_version, schema_version,
            configuration, created_by)
         VALUES ($1, $2, $3, 1, $4::jsonb, $5)`,
        [
          row.tenant_id,
          instanceId,
          nextVersion,
          JSON.stringify(updatedSnapshot),
          principal.email || principal.userId || 'platform_admin'
        ]
      );
      await client.query(
        `UPDATE production.application_instances
         SET configuration_version = $2, updated_at = now()
         WHERE id = $1`,
        [instanceId, String(nextVersion)]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'application_service_dependencies_updated', $3::jsonb)`,
        [
          row.tenant_id,
          principal.email || principal.userId || 'platform_admin',
          JSON.stringify({
            applicationInstanceId: instanceId,
            schoolId: row.school_id,
            configurationVersion: nextVersion,
            centralServiceDependencies: uniqueDeps
          })
        ]
      );
      return {
        instanceId,
        configurationVersion: nextVersion,
        centralServiceDependencies: uniqueDeps as CentralSharedServiceId[]
      };
    });
  }

  async getConfiguration(principal: VerifiedTenantPrincipal) {
    return withTenantTransaction(this.pool, principal, async client => {
      const result = await client.query<{
        academic_session: string;
        academic_term_structure: SchoolProvisioningRequest['configuration']['academicTermStructure'];
        education_levels: string[];
        grading_configuration: Record<string, unknown>;
        time_zone: string;
        currency: string;
        default_language: string;
      }>(
        `SELECT configuration.academic_session, configuration.academic_term_structure,
                configuration.education_levels, configuration.grading_configuration,
                school.time_zone, school.currency, school.default_language
         FROM production.school_configurations configuration
         JOIN production.schools school
           ON school.tenant_id = configuration.tenant_id
          AND school.id = configuration.school_id
         WHERE configuration.tenant_id = $1 LIMIT 1`,
        [principal.tenantId]
      );
      const row = result.rows[0];
      return row && {
        timeZone: row.time_zone,
        currency: row.currency,
        language: row.default_language,
        academicSession: row.academic_session,
        academicTermStructure: row.academic_term_structure,
        educationLevels: row.education_levels,
        gradingConfiguration: row.grading_configuration
      };
    });
  }

  async updateConfiguration(
    principal: VerifiedTenantPrincipal,
    configuration: SchoolProvisioningRequest['configuration'],
    authorization: AuthorizedPrincipal
  ): Promise<void> {
    assertAuthorized(authorization, PERMISSIONS.schoolConfigurationManage);
    if (authorization.tenantId !== principal.tenantId) throw new Error('FORBIDDEN');
    await withTenantTransaction(this.pool, principal, async client => {
      const current = await client.query<{
        school_id: string;
        instance_id: string;
        configuration: Record<string, unknown>;
        current_version: number;
      }>(
        `SELECT school.id AS school_id, instance.id AS instance_id,
                latest.configuration,
                latest.configuration_version AS current_version
         FROM production.schools school
         JOIN production.application_instances instance
           ON instance.tenant_id = school.tenant_id AND instance.school_id = school.id
         JOIN LATERAL (
           SELECT configuration, configuration_version
           FROM production.application_instance_configurations
           WHERE tenant_id = school.tenant_id AND application_instance_id = instance.id
           ORDER BY configuration_version DESC LIMIT 1
         ) latest ON true
         WHERE school.tenant_id = $1
         FOR UPDATE OF instance`,
        [principal.tenantId]
      );
      if (!current.rows[0]) throw new Error('SCHOOL_CONFIGURATION_NOT_FOUND');
      const nextVersion = current.rows[0].current_version + 1;
      await client.query(
        `INSERT INTO production.school_configuration_versions
           (tenant_id, school_id, configuration_version, configuration, created_by)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [principal.tenantId, current.rows[0].school_id, nextVersion,
          JSON.stringify(configuration), principal.email || 'tenant_admin']
      );
      await client.query(
        `UPDATE production.school_configurations
         SET academic_session = $2, academic_term_structure = $3::jsonb,
             education_levels = $4::jsonb, grading_configuration = $5::jsonb,
             updated_at = now()
         WHERE tenant_id = $1`,
        [principal.tenantId, configuration.academicSession,
          JSON.stringify(configuration.academicTermStructure),
          JSON.stringify(configuration.educationLevels),
          JSON.stringify(configuration.gradingConfiguration ?? {})]
      );
      await client.query(
        `UPDATE production.schools
         SET time_zone = $2, currency = $3, default_language = $4, updated_at = now()
         WHERE tenant_id = $1`,
        [principal.tenantId, configuration.timeZone,
          configuration.currency.toUpperCase(), configuration.language.toLowerCase()]
      );
      const updatedSnapshot = {
        ...current.rows[0].configuration,
        schoolConfiguration: configuration,
        configurationVersion: nextVersion
      };
      await client.query(
        `INSERT INTO production.application_instance_configurations
           (tenant_id, application_instance_id, configuration_version,
            schema_version, configuration, created_by)
         VALUES ($1, $2, $3, 1, $4::jsonb, $5)`,
        [principal.tenantId, current.rows[0].instance_id, nextVersion,
          JSON.stringify(updatedSnapshot), principal.email || 'tenant_admin']
      );
      await client.query(
        `UPDATE production.application_instances
         SET configuration_version = $3, updated_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [principal.tenantId, current.rows[0].instance_id, String(nextVersion)]
      );
      await client.query(
        `INSERT INTO production.audit_events (tenant_id, actor_subject, action, details)
         VALUES ($1, $2, 'school_configuration_updated', $3::jsonb)`,
        [principal.tenantId, principal.email || 'tenant_admin',
          JSON.stringify({ schoolId: current.rows[0].school_id, configurationVersion: nextVersion })]
      );
      const stage = await client.query<{ lifecycle_stage: string }>(
        `SELECT lifecycle_stage FROM production.application_instances
         WHERE tenant_id = $1 AND id = $2`,
        [principal.tenantId, current.rows[0].instance_id]
      );
      if (stage.rows[0]?.lifecycle_stage === 'membership_active') {
        await advanceLifecycle(
          client, principal.tenantId, current.rows[0].instance_id,
          'configuration_completed', authorization.userId, { configurationVersion: nextVersion }
        );
      }
    });
  }

  /**
   * Explicit application activation by a platform administrator. Requires a
   * completed school configuration and a verified deployment health check.
   */
  async activateApplication(
    instanceId: string,
    principal: VerifiedTenantPrincipal
  ): Promise<void> {
    await withControlPlaneTransaction(this.pool, principal, async client => {
      const row = await client.query<{
        tenant_id: string; lifecycle_stage: string; health_check_status: string | null;
      }>(
        `SELECT instance.tenant_id, instance.lifecycle_stage, deployment.health_check_status
         FROM production.application_instances instance
         LEFT JOIN production.application_instance_deployments deployment
           ON deployment.tenant_id = instance.tenant_id
          AND deployment.application_instance_id = instance.id
         WHERE instance.id = $1 FOR UPDATE OF instance`,
        [instanceId]
      );
      const current = row.rows[0];
      if (!current) throw new Error('APPLICATION_INSTANCE_NOT_FOUND');
      if (current.lifecycle_stage !== 'configuration_completed') {
        throw new Error('APPLICATION_ACTIVATION_PREREQUISITES_UNMET');
      }
      if (current.health_check_status !== 'verified') {
        throw new Error('APPLICATION_HEALTH_NOT_VERIFIED');
      }
      await client.query(
        `UPDATE production.application_instances
         SET status = 'active', activated_at = now(), updated_at = now()
         WHERE id = $1`,
        [instanceId]
      );
      await advanceLifecycle(
        client, current.tenant_id, instanceId, 'application_activated',
        principal.email || 'platform_admin', { healthCheck: 'verified' }
      );
    });
  }

  async getProvisioningStatus(
    instanceId: string,
    principal: VerifiedTenantPrincipal
  ): Promise<PersistedSchoolProvisioning | undefined> {
    return withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query<ProvisioningRow>(
        `${PROVISIONING_SELECT}
         WHERE ai.id = $1 OR operation.id = $1
         LIMIT 1`,
        [instanceId]
      );
      return result.rows[0] ? mapProvisioningRow(result.rows[0], false) : undefined;
    });
  }

  async getProvisioningOperation(
    operationId: string,
    principal: VerifiedTenantPrincipal
  ): Promise<PersistedProvisioningOperation | undefined> {
    const operation = await withControlPlaneTransaction(this.pool, principal, async client => {
      const result = await client.query<{
        id: string;
        idempotency_key: string;
        request_hash: string;
        request_payload: SchoolProvisioningRequest;
        initiated_by: string;
        status: SchoolProvisioningOperationResponse['status'];
        retryable: boolean;
        attempt_count: number;
        created_at: Date;
        updated_at: Date;
        completed_at: Date | null;
        error_code: string | null;
        error_details: { message?: string };
        application_instance_id: string | null;
      }>(
        `SELECT id, idempotency_key, request_hash, request_payload, initiated_by,
                status, retryable, attempt_count, created_at, updated_at, completed_at,
                error_code, error_details, application_instance_id
         FROM production.school_provisioning_operations
         WHERE id = $1`,
        [operationId]
      );
      return result.rows[0];
    });
    if (!operation) return undefined;
    const provisioning = await this.getProvisioningStatus(operation.id, principal);
    return {
      operationId: operation.id,
      status: operation.status,
      retryable: operation.retryable,
      attemptCount: operation.attempt_count,
      createdAt: operation.created_at.toISOString(),
      updatedAt: operation.updated_at.toISOString(),
      completedAt: operation.completed_at?.toISOString() ?? null,
      ...(operation.error_code ? {
        error: {
          code: operation.error_code,
          message: operation.error_details.message || 'School provisioning did not complete.',
          retryable: operation.retryable
        }
      } : {}),
      ...(provisioning ? { provisioning } : {}),
      idempotencyKey: operation.idempotency_key,
      requestHash: operation.request_hash,
      requestPayload: operation.request_payload,
      initiatedBy: operation.initiated_by
    };
  }
}
