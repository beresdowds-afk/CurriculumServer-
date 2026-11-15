import type { DatabasePool } from './postgres';
import { classifyDatabaseError, DatabaseFailure, postgresRuntime } from './postgres';
import { discoverMigrations, inspectMigrations } from './migrations';
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
  'production.school_admin_invitations'
];

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
    reason: string;
  };
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
      provisioning: { executionAvailable: false, reason: 'PostgreSQL, platform credentials, secure token signing, and invitation email configuration are required.' },
      ready: false
    };
  }

  let connectionVerified = false;
  let migrationsCurrent = false;
  let requiredTablesAvailable = false;
  let rlsPoliciesAvailable = false;
  let tenantSecurityAvailable = false;
  let error: string | undefined;
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
    hasConfiguredPlatformAdminAccounts() && hasInvitationEmailConfiguration();
  const provisioningReason = !connectionVerified || !migrationsCurrent ||
    !requiredTablesAvailable || !rlsPoliciesAvailable
    ? 'PostgreSQL connection, current migrations, and tenant RLS policies are required.'
    : !trustedTenantContextAvailable
      ? 'Secure server-side token signing is not configured.'
      : !hasConfiguredPlatformAdminAccounts()
        ? 'Platform administrator credentials are not configured.'
        : !hasInvitationEmailConfiguration()
          ? 'Administrator invitation email configuration is incomplete.'
          : 'Shared PostgreSQL school records are available; this workflow does not create cloud infrastructure.';

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
    provisioning: { executionAvailable: provisioningReady, reason: provisioningReason },
    ready: provisioningReady
  };
}
