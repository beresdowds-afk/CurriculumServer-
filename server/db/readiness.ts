import type { DatabasePool } from './postgres';
import { classifyDatabaseError, DatabaseFailure, postgresRuntime } from './postgres';
import { discoverMigrations, inspectMigrations } from './migrations';
import { SUPPORTED_APPLICATION_TEMPLATES } from '../../src/data/applicationInstanceConfiguration';
import { deriveFeatureReadiness, INITIAL_REGISTERED_FEATURES } from '../../src/data/applicationRegistryData';
import {
  hasConfiguredPlatformAdminAccounts,
  hasInvitationEmailConfiguration,
  hasSecureControlPlaneSecret
} from '../schoolProvisioning';

const REQUIRED_TABLES = [
  'control_plane.customers',
  'control_plane.organisations',
  'control_plane.instances',
  'control_plane.provisioning_requests',
  'control_plane.provisioning_jobs',
  'control_plane.audit_logs',
  'control_plane.approval_records',
  'control_plane.piam_authorizations',
  'control_plane.resource_configurations',
  'control_plane.resource_verification_evidence',
  'control_plane.architecture_profiles',
  'control_plane.provisioning_job_attempts',
  'curriculum_flow.users',
  'curriculum_flow.students',
  'production.tenants',
  'production.organizations',
  'production.memberships',
  'production.instances',
  'production.provisioning_jobs',
  'production.approvals',
  'production.audit_events',
  'production.schools',
  'production.classes',
  'production.students',
  'production.academic_records',
  'production.users',
  'production.school_configurations',
  'production.application_instances',
  'production.school_provisioning_requests',
  'production.school_provisioning_operations',
  'production.application_instance_configurations',
  'production.school_commercial_agreements',
  'production.school_configuration_versions',
  'production.application_instance_deployments',
  'production.school_admin_invitations',
  'production.invitation_outbox',
  'production.invitation_delivery_attempts',
  'production.user_sessions',
  'production.membership_role_assignments',
  'production.role_assignment_scopes',
  'production.application_lifecycle_events',
  'production.permissions',
  'production.roles',
  'production.role_permissions'
];

export interface CapabilityReadiness {
  ready: boolean;
  // What was actually checked; absent when nothing could be verified.
  evidence?: string;
  reason?: string;
}

export interface SchoolAdministrationCapabilities {
  databaseConnection: CapabilityReadiness;
  migrations: CapabilityReadiness;
  identity: CapabilityReadiness;
  membership: CapabilityReadiness;
  authorization: CapabilityReadiness;
  tenantRls: CapabilityReadiness;
  invitationDelivery: CapabilityReadiness;
  applicationTemplates: CapabilityReadiness;
  provisioning: CapabilityReadiness;
}

function unverified(reason: string): CapabilityReadiness {
  return { ready: false, reason };
}

function allUnverified(reason: string): SchoolAdministrationCapabilities {
  return {
    databaseConnection: unverified(reason),
    migrations: unverified(reason),
    identity: unverified(reason),
    membership: unverified(reason),
    authorization: unverified(reason),
    tenantRls: unverified(reason),
    invitationDelivery: unverified(reason),
    applicationTemplates: unverified(reason),
    provisioning: unverified(reason)
  };
}

export interface PlatformReadiness {
  alive: true;
  database: {
    configured: boolean;
    connectionVerified: boolean;
    migrationsCurrent: boolean;
    requiredTablesAvailable: boolean;
    rlsPoliciesAvailable: boolean;
    trustedTenantContextAvailable: boolean;
    tenantSecurityAvailable: boolean;
    error?: string;
  };
  provisioning: {
    executionAvailable: boolean;
    invitationDeliveryAvailable: boolean;
    reason: string;
  };
  capabilities: SchoolAdministrationCapabilities;
  ready: boolean;
}

export async function inspectPlatformReadiness(
  pool?: DatabasePool,
  configured = postgresRuntime.configured,
  configurationError = postgresRuntime.configurationFailureKind
): Promise<PlatformReadiness> {
  if (!configured || !pool) {
    return {
      alive: true,
      database: {
        configured: false,
        connectionVerified: false,
        migrationsCurrent: false,
        requiredTablesAvailable: false,
        rlsPoliciesAvailable: false,
        trustedTenantContextAvailable: false,
        tenantSecurityAvailable: false,
        error: configurationError || 'configuration_missing'
      },
      provisioning: {
        executionAvailable: false,
        invitationDeliveryAvailable: false,
        reason: 'PostgreSQL, platform credentials, and secure token signing are required.'
      },
      capabilities: allUnverified('PostgreSQL is not configured.'),
      ready: false
    };
  }

  let connectionVerified = false;
  let migrationsCurrent = false;
  let requiredTablesAvailable = false;
  let rlsPoliciesAvailable = false;
  let tenantSecurityAvailable = false;
  let error: string | undefined;
  let identity = unverified('Not verified.');
  let membership = unverified('Not verified.');
  let authorization = unverified('Not verified.');
  let outboxSchema = false;
  let lifecycleSchema = false;
  try {
    await pool.query('SELECT 1');
    connectionVerified = true;
    const migrations = await discoverMigrations(`${process.cwd()}/src/db/migrations`);
    const migrationStatus = await inspectMigrations(pool, migrations);
    migrationsCurrent = migrationStatus.length > 0 &&
      migrationStatus.every(migration => migration.status === 'applied');

    const relations = await pool.query<{
      relation_name: string;
      rls: boolean;
      forced: boolean;
      owned_by_runtime: boolean;
    }>(
      `SELECT n.nspname || '.' || c.relname AS relation_name,
              c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
              c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user) AS owned_by_runtime
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname || '.' || c.relname = ANY($1::text[])`,
      [REQUIRED_TABLES]
    );
    requiredTablesAvailable = REQUIRED_TABLES.every(name =>
      relations.rows.some(row => row.relation_name === name)
    );
    const runtimeRole = await pool.query<{ superuser: boolean; bypass_rls: boolean }>(
      `SELECT rolsuper AS superuser, rolbypassrls AS bypass_rls
       FROM pg_roles WHERE rolname = current_user`
    );
    rlsPoliciesAvailable = requiredTablesAvailable &&
      REQUIRED_TABLES.every(name =>
        relations.rows.some(row =>
          row.relation_name === name && row.rls && row.forced && !row.owned_by_runtime
        )
      ) &&
      runtimeRole.rows.length === 1 &&
      !runtimeRole.rows[0].superuser &&
      !runtimeRole.rows[0].bypass_rls;
    if (requiredTablesAvailable) {
      const checks = await pool.query<{
        membership_columns: number;
        outbox_dead_letter: boolean;
        invitation_token_version: boolean;
        lifecycle_column: boolean;
        tenant_admin_permissions: number;
        users_email_unique: boolean;
      }>(
        `SELECT
           (SELECT count(*)::int FROM information_schema.columns
             WHERE table_schema = 'production' AND table_name = 'memberships'
               AND column_name IN ('status', 'revoked_at', 'user_id')) AS membership_columns,
           EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = 'invitation_outbox_status_check'
               AND pg_get_constraintdef(oid) LIKE '%dead_letter%') AS outbox_dead_letter,
           EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'production' AND table_name = 'school_admin_invitations'
               AND column_name = 'token_version') AS invitation_token_version,
           EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'production' AND table_name = 'application_instances'
               AND column_name = 'lifecycle_stage') AS lifecycle_column,
           (SELECT count(*)::int FROM production.role_permissions
             WHERE role_code = 'tenant_admin') AS tenant_admin_permissions,
           EXISTS (SELECT 1 FROM pg_indexes
             WHERE schemaname = 'production' AND indexname = 'production_users_email_lower_uq') AS users_email_unique`
      );
      const row = checks.rows[0];
      identity = row.users_email_unique
        ? { ready: true, evidence: 'production.users exists with a unique case-insensitive email index.' }
        : unverified('production.users email uniqueness is not verified.');
      membership = row.membership_columns === 3
        ? { ready: true, evidence: 'production.memberships has user_id, status and revocation columns.' }
        : unverified('Membership lifecycle columns are missing.');
      authorization = row.tenant_admin_permissions > 0
        ? { ready: true, evidence: 'Roles, permissions and role assignments are present in PostgreSQL.' }
        : unverified('No role permissions are seeded.');
      outboxSchema = row.outbox_dead_letter && row.invitation_token_version;
      lifecycleSchema = row.lifecycle_column;
    }
    const trustedTenantContextAvailable = rlsPoliciesAvailable && hasSecureControlPlaneSecret();
    tenantSecurityAvailable = trustedTenantContextAvailable;
    if (!migrationsCurrent) error = 'migrations_not_current';
    else if (!requiredTablesAvailable) error = 'required_tables_unavailable';
    else if (!rlsPoliciesAvailable) error = 'tenant_security_unavailable';
    else if (!trustedTenantContextAvailable) error = 'trusted_tenant_context_unavailable';
  } catch (failure) {
    error = failure instanceof DatabaseFailure && failure.kind === 'migration'
      ? 'migration_failure'
      : classifyDatabaseError(failure);
  }

  const trustedTenantContextAvailable = rlsPoliciesAvailable && hasSecureControlPlaneSecret();
  const provisioningReady = connectionVerified && migrationsCurrent &&
    requiredTablesAvailable && rlsPoliciesAvailable && trustedTenantContextAvailable &&
    hasConfiguredPlatformAdminAccounts();
  const invitationDeliveryAvailable = hasInvitationEmailConfiguration();
  const provisioningReason = !connectionVerified || !migrationsCurrent ||
    !requiredTablesAvailable || !rlsPoliciesAvailable
    ? 'PostgreSQL connection, current migrations, and tenant RLS policies are required.'
    : !trustedTenantContextAvailable
      ? 'Secure server-side token signing is not configured.'
      : !hasConfiguredPlatformAdminAccounts()
        ? 'Platform administrator credentials are not configured.'
        : !invitationDeliveryAvailable
          ? 'Shared PostgreSQL provisioning is available; invitation delivery remains pending until email configuration is supplied.'
          : 'Shared PostgreSQL school records are available; this workflow does not create cloud infrastructure.';

  const templatesReady = SUPPORTED_APPLICATION_TEMPLATES.length > 0 &&
    INITIAL_REGISTERED_FEATURES
      .filter(feature => feature.featureId === 'feat_school_administration_identity')
      .every(feature => deriveFeatureReadiness(feature).productionReady) &&
    lifecycleSchema;
  const schoolIdentityReady = provisioningReady && identity.ready && membership.ready &&
    authorization.ready && lifecycleSchema;
  const capabilities: SchoolAdministrationCapabilities = {
    databaseConnection: connectionVerified
      ? { ready: true, evidence: 'SELECT 1 succeeded.' }
      : unverified('The database connection could not be verified.'),
    migrations: migrationsCurrent
      ? { ready: true, evidence: 'All discovered migrations are applied with matching checksums.' }
      : unverified('Migrations are not current.'),
    identity,
    membership,
    authorization,
    tenantRls: rlsPoliciesAvailable && trustedTenantContextAvailable
      ? { ready: true, evidence: 'Required tables have forced RLS; runtime role is non-owner, non-superuser, without BYPASSRLS.' }
      : unverified('Forced RLS, a restricted runtime role, or secure token signing is not verified.'),
    invitationDelivery: outboxSchema && invitationDeliveryAvailable
      ? { ready: true, evidence: 'Outbox schema (dead-letter, token versions) present and email configuration supplied; live provider delivery is not verified.' }
      : unverified(outboxSchema
        ? 'Email delivery configuration is not supplied.'
        : 'Invitation outbox schema is not current.'),
    applicationTemplates: templatesReady
      ? { ready: true, evidence: 'Supported template catalogue and production-ready identity capability recorded; lifecycle schema present.' }
      : unverified('Template catalogue, capability readiness, or lifecycle schema is not verified.'),
    provisioning: schoolIdentityReady
      ? { ready: true, evidence: 'Connection, migrations, RLS, platform credentials, identity, membership and authorization verified.' }
      : unverified('Provisioning prerequisites are not all verified.')
  };

  return {
    alive: true,
    database: {
      configured: true,
      connectionVerified,
      migrationsCurrent,
      requiredTablesAvailable,
      rlsPoliciesAvailable,
      trustedTenantContextAvailable,
      tenantSecurityAvailable,
      ...(error ? { error } : {})
    },
    provisioning: {
      executionAvailable: provisioningReady && capabilities.provisioning.ready,
      invitationDeliveryAvailable,
      reason: provisioningReason
    },
    capabilities,
    ready: provisioningReady && capabilities.provisioning.ready
  };
}
