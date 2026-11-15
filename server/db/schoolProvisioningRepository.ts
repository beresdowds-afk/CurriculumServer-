import { randomBytes } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import type { SchoolProvisioningConfirmation, SchoolProvisioningRequest } from '../../packages/shared-types/src/apiContracts';
import type { DatabaseClient, DatabasePool } from './postgres';
import { inTransaction } from './postgres';
import { withTenantTransaction, type VerifiedTenantPrincipal } from './tenantContext';

interface ProvisioningRow extends QueryResultRow {
  school_id: string;
  tenant_id: string;
  instance_id: string;
  school_name: string;
  instance_status: SchoolProvisioningConfirmation['instanceStatus'];
  application_id: string;
  created_at: Date;
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
  existing_user_id: string | null;
  existing_password_hash: string | null;
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
  display_name: string;
  school_type: string;
  country: string;
  state_province: string;
  city: string;
  physical_address: string;
  official_contact_email: string;
  telephone: string;
  time_zone: string;
  currency: string;
  default_language: string;
  instance_id: string;
  application_id: string;
  application_version: string | null;
  instance_status: string;
  enabled_features: string[];
  created_at: Date;
  activated_at: Date | null;
}

async function withControlPlaneTransaction<T>(
  pool: DatabasePool,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  return inTransaction(pool, async client => {
    await client.query("SELECT set_config('app.control_plane_admin', 'true', true)");
    return operation(client);
  });
}

function mapProvisioningRow(row: ProvisioningRow, idempotentReplay: boolean): PersistedSchoolProvisioning {
  return {
    schoolId: row.school_id,
    tenantId: row.tenant_id,
    instanceId: row.instance_id,
    schoolName: row.school_name,
    instanceStatus: row.instance_status,
    administratorActivationStatus: row.invitation_status === 'accepted'
      ? 'activated'
      : row.invitation_status === 'pending'
        ? 'invitation_sent'
        : 'delivery_pending',
    applicationId: row.application_id,
    createdAt: row.created_at.toISOString(),
    invitationId: row.invitation_id,
    invitationEmail: row.invitation_email,
    idempotentReplay
  };
}

const PROVISIONING_SELECT = `
  SELECT s.id AS school_id, t.id AS tenant_id, ai.id AS instance_id,
         s.name AS school_name, ai.status AS instance_status,
         ai.application_id, spr.created_at,
         invitation.id AS invitation_id, invitation.status AS invitation_status,
         invitation.invitation_email
  FROM production.school_provisioning_requests spr
  JOIN production.tenants t ON t.id = spr.tenant_id
  JOIN production.schools s ON s.id = spr.school_id AND s.tenant_id = spr.tenant_id
  JOIN production.application_instances ai
    ON ai.id = spr.application_instance_id AND ai.tenant_id = spr.tenant_id
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
    invitationTokenHash: Buffer,
    invitationExpiresAt: Date
  ): Promise<PersistedSchoolProvisioning> {
    return withControlPlaneTransaction(this.pool, async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [idempotencyKey]);
      const existing = await client.query<ProvisioningRow>(
        `${PROVISIONING_SELECT}
         WHERE spr.idempotency_key = $1
         FOR UPDATE OF spr`,
        [idempotencyKey]
      );
      if (existing.rows[0]) {
        const request = await client.query<{ request_hash: string }>(
          'SELECT request_hash FROM production.school_provisioning_requests WHERE idempotency_key = $1',
          [idempotencyKey]
        );
        if (request.rows[0]?.request_hash !== requestHash) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        const current = existing.rows[0];
        if (current.invitation_id && current.invitation_status !== 'accepted') {
          await client.query(
            `UPDATE production.school_admin_invitations
             SET token_hash = $2, status = 'pending', expires_at = $3,
                 last_delivery_error = NULL
             WHERE id = $1`,
            [current.invitation_id, invitationTokenHash, invitationExpiresAt]
          );
        }
        return mapProvisioningRow(current, true);
      }

      const tenantResult = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO production.tenants (display_name, status, created_by, tenant_slug)
         VALUES ($1, 'pending', $2, 'pending-' || gen_random_uuid()::text)
         RETURNING id, created_at`,
        [input.school.displayName.trim(), initiatedBy]
      );
      const tenant = tenantResult.rows[0];
      const slugPrefix = input.school.name.toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'school';
      await client.query(
        'UPDATE production.tenants SET tenant_slug = $2 WHERE id = $1',
        [tenant.id, `${slugPrefix}-${tenant.id.slice(0, 8)}`]
      );

      const organisationResult = await client.query<{ id: string }>(
        `INSERT INTO production.organizations
           (tenant_id, name, school_type, country, state_province, city, physical_address,
            official_contact_email, telephone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [tenant.id, input.school.displayName.trim(), input.school.schoolType, input.school.country,
          input.school.stateProvince, input.school.city, input.school.physicalAddress,
          input.school.officialContactEmail.toLowerCase(), input.school.telephone]
      );
      const schoolResult = await client.query<{ id: string }>(
        `INSERT INTO production.schools
           (tenant_id, organization_id, name, school_slug, school_type, country, state_province,
            city, physical_address, official_contact_email, telephone, time_zone, currency, default_language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [tenant.id, organisationResult.rows[0].id, input.school.name.trim(),
          `${slugPrefix}-${tenant.id.slice(0, 8)}`, input.school.schoolType, input.school.country,
          input.school.stateProvince, input.school.city, input.school.physicalAddress,
          input.school.officialContactEmail.toLowerCase(), input.school.telephone,
          input.configuration.timeZone, input.configuration.currency.toUpperCase(),
          input.configuration.language.toLowerCase()]
      );
      const schoolId = schoolResult.rows[0].id;

      await client.query(
        `INSERT INTO production.school_configurations
           (tenant_id, school_id, academic_session, academic_term_structure,
            education_levels, grading_configuration)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
        [tenant.id, schoolId, input.configuration.academicSession.trim(),
          JSON.stringify(input.configuration.academicTermStructure),
          JSON.stringify(input.configuration.educationLevels),
          JSON.stringify(input.configuration.gradingConfiguration ?? {})]
      );
      const instanceResult = await client.query<{ id: string }>(
        `INSERT INTO production.application_instances
           (tenant_id, school_id, application_id, application_version,
            configuration_version, status, enabled_features, deployment_architecture)
         VALUES ($1, $2, $3, NULL, '1', 'provisioning',
                 ARRAY['feat_student_registration', 'feat_exam_management']::text[], 'shared_database')
         RETURNING id`,
        [tenant.id, schoolId, input.applicationId]
      );
      const instanceId = instanceResult.rows[0].id;
      await client.query(
        `INSERT INTO production.school_provisioning_requests
           (idempotency_key, request_hash, tenant_id, school_id,
            application_instance_id, initiated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idempotencyKey, requestHash, tenant.id, schoolId, instanceId, initiatedBy]
      );
      const invitationResult = await client.query<{ id: string }>(
        `INSERT INTO production.school_admin_invitations
           (tenant_id, school_id, administrator_name, administrator_email,
            token_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [tenant.id, schoolId, input.administrator.fullName.trim(),
          input.administrator.email.toLowerCase(), invitationTokenHash, invitationExpiresAt, initiatedBy]
      );
      return {
        schoolId,
        tenantId: tenant.id,
        instanceId,
        schoolName: input.school.name.trim(),
        instanceStatus: 'provisioning',
        administratorActivationStatus: 'delivery_pending',
        applicationId: input.applicationId,
        createdAt: tenant.created_at.toISOString(),
        invitationId: invitationResult.rows[0].id,
        invitationEmail: input.administrator.email.toLowerCase(),
        idempotentReplay: false
      };
    });
  }

  async recordInvitationDelivery(invitationId: string, error?: string): Promise<void> {
    await withControlPlaneTransaction(this.pool, async client => {
      await client.query(
        `UPDATE production.school_admin_invitations
         SET delivery_attempts = delivery_attempts + 1,
             status = CASE WHEN $2::text IS NULL THEN 'pending' ELSE 'delivery_failed' END,
             last_delivery_error = $2
         WHERE id = $1`,
        [invitationId, error ?? null]
      );
    });
  }

  async getInvitation(tokenHash: Buffer): Promise<InvitationRow | undefined> {
    return withControlPlaneTransaction(this.pool, async client => {
      const result = await client.query<InvitationRow>(
        `SELECT invitation.id, invitation.tenant_id, invitation.school_id,
                invitation.administrator_name, invitation.administrator_email,
                invitation.expires_at, invitation.status AS invitation_status,
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
    return withControlPlaneTransaction(this.pool, async client => {
      const invitationResult = await client.query<InvitationRow>(
        `SELECT id, tenant_id, school_id, administrator_name, administrator_email,
                expires_at, status AS invitation_status
         FROM production.school_admin_invitations
         WHERE id = $1 AND token_hash = $2
         FOR UPDATE`,
        [invitationId, tokenHash]
      );
      const invitation = invitationResult.rows[0];
      if (!invitation || invitation.invitation_status !== 'pending' ||
          invitation.expires_at.getTime() <= Date.now()) {
        throw new Error('INVITATION_INVALID_OR_EXPIRED');
      }
      const userResult = await client.query<{ id: string; password_hash: string }>(
        `SELECT id, password_hash FROM production.users
         WHERE lower(email) = lower($1) FOR UPDATE`,
        [invitation.administrator_email]
      );
      let userId: string;
      if (userResult.rows[0]) {
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

      const membership = await client.query(
        `INSERT INTO production.memberships (tenant_id, user_subject, user_id, role)
         VALUES ($1, $2, $3, 'tenant_admin')
         ON CONFLICT (tenant_id, user_subject) DO NOTHING
         RETURNING user_id`,
        [invitation.tenant_id, userId, userId]
      );
      if (membership.rowCount !== 1) {
        throw new Error('ADMIN_MEMBERSHIP_ALREADY_EXISTS');
      }
      await client.query(
        `UPDATE production.school_admin_invitations
         SET status = 'accepted', accepted_at = now(), token_hash = $2
         WHERE id = $1`,
        [invitation.id, randomBytes(32)]
      );
      await client.query(
        `UPDATE production.tenants SET status = 'approved', updated_at = now()
         WHERE id = $1`,
        [invitation.tenant_id]
      );
      const activeInstance = await client.query(
        `UPDATE production.application_instances
         SET status = 'active', activated_at = now()
         WHERE tenant_id = $1 AND school_id = $2 AND status = 'provisioning'`,
        [invitation.tenant_id, invitation.school_id]
      );
      if (activeInstance.rowCount !== 1) {
        throw new Error('INSTANCE_ACTIVATION_FAILED');
      }
      return { tenantId: invitation.tenant_id, userId };
    });
  }

  async authenticateAdministrator(tenantId: string, email: string): Promise<SchoolAccount | undefined> {
    return withControlPlaneTransaction(this.pool, async client => {
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
           AND membership.role = 'tenant_admin' AND tenant.status = 'approved'`,
        [principal.tenantId, userId]
      );
      return result.rowCount === 1;
    });
  }

  async getSchool(principal: VerifiedTenantPrincipal): Promise<SchoolSummary | undefined> {
    return withTenantTransaction(this.pool, principal, async client => {
      const result = await client.query<SchoolSummary>(
        `SELECT school.id, school.tenant_id, school.school_slug, school.name, tenant.display_name,
                school.school_type, school.country, school.state_province, school.city,
                school.physical_address, school.official_contact_email, school.telephone,
                school.time_zone, school.currency, school.default_language,
                instance.id AS instance_id, instance.application_id, instance.application_version,
                instance.status AS instance_status, instance.enabled_features,
                instance.created_at, instance.activated_at
         FROM production.schools school
         JOIN production.tenants tenant ON tenant.id = school.tenant_id
         JOIN production.application_instances instance
           ON instance.tenant_id = school.tenant_id AND instance.school_id = school.id
         WHERE instance.status = 'active' AND school.tenant_id = $1
         LIMIT 1`,
        [principal.tenantId]
      );
      return result.rows[0];
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
    configuration: SchoolProvisioningRequest['configuration']
  ): Promise<void> {
    if (principal.role !== 'tenant_admin') throw new Error('FORBIDDEN');
    await withTenantTransaction(this.pool, principal, async client => {
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
    });
  }

  async getProvisioningStatus(instanceId: string): Promise<PersistedSchoolProvisioning | undefined> {
    return withControlPlaneTransaction(this.pool, async client => {
      const result = await client.query<ProvisioningRow>(
        `${PROVISIONING_SELECT}
         WHERE ai.id = $1`,
        [instanceId]
      );
      return result.rows[0] ? mapProvisioningRow(result.rows[0], false) : undefined;
    });
  }
}
