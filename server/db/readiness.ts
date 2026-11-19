import type { DatabasePool } from './postgres';
import { classifyDatabaseError, DatabaseFailure, postgresRuntime } from './postgres';
import { discoverMigrations, inspectMigrations } from './migrations';
import {
  APPLICATION_TEMPLATE_REGISTRY,
  SUPPORTED_APPLICATION_TEMPLATES
} from '../../src/data/applicationInstanceConfiguration';
import { SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE } from '../../packages/shared-types/src/schoolAdministrationTemplate';
import {
  hasConfiguredPlatformAdminAccounts,
  hasInvitationEmailConfiguration,
  hasSecureControlPlaneSecret
} from '../schoolProvisioning';
import { PRODUCTION_CAPABILITIES } from '../capabilities/productionCapabilityRegistry';

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
  'production.application_service_entitlements',
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
  'production.role_permissions',
  'production.curriculum_countries',
  'production.curriculum_education_authorities',
  'production.curriculum_frameworks',
  'production.curriculum_education_levels',
  'production.curriculum_class_grades',
  'production.curriculum_subject_classifications',
  'production.curriculum_subjects',
  'production.curriculum_versions',
  'production.curriculum_version_subjects',
  'production.curriculum_themes',
  'production.curriculum_topics',
  'production.curriculum_subtopics',
  'production.curriculum_learning_objectives',
  'production.curriculum_standards',
  'production.curriculum_change_history',
  'production.central_publishers',
  'production.central_authors',
  'production.central_textbooks',
  'production.central_textbook_contributors',
  'production.central_textbook_versions',
  'production.central_textbook_chapters',
  'production.central_textbook_sections',
  'production.central_textbook_content_blocks',
  'production.central_textbook_objective_mappings',
  'production.central_textbook_media_assets',
  'production.central_textbook_citations',
  'production.central_textbook_editorial_reviews',
  'production.central_textbook_coverage_manifests',
  'production.central_textbook_generation_jobs',
  'production.shared_service_usage_metrics',
  'production.instance_question_categories',
  'production.instance_question_bank_items',
  'production.instance_assessment_blueprints',
  'production.instance_exam_configurations',
  'production.instance_assessment_records',
  'central_curriculum.curriculum_source_documents',
  'central_curriculum.curriculum_competencies',
  'central_textbooks.textbook_illustrations',
  'central_textbooks.textbook_glossaries',
  'central_textbooks.textbook_validation_reports',
  'central_textbooks.textbook_revisions',
  'production.ai_gateway_capabilities',
  'production.tenant_ai_entitlements',
  'production.ai_gateway_requests',
  'production.ai_gateway_usage_metrics',
  'production.ai_gateway_audit_events',
  'production.teacher_subject_assignments',
  'production.lesson_note_records',
  'production.teaching_delivery_records',
  'production.teaching_delivery_audit_history',
  'production.assessment_scope_authorizations',
  'production.assessment_generation_provenance'
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
  capabilityImplementation: CapabilityReadiness;
  capabilityConfiguration: CapabilityReadiness;
  runtimeDependencies: CapabilityReadiness;
  applicationReadiness: CapabilityReadiness;
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
    capabilityImplementation: unverified(reason),
    capabilityConfiguration: unverified(reason),
    runtimeDependencies: unverified(reason),
    applicationReadiness: unverified(reason),
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
  let authorizationContextKeyAvailable = false;
  let runtimeCanAccessAuthorizationContextKey = true;
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
    const contextKey = await pool.query<{
      configured: boolean;
      runtime_can_access: boolean;
    }>(
      `SELECT production.authorization_context_key_configured() AS configured,
              (has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'SELECT')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'INSERT')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'UPDATE')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'DELETE')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRUNCATE')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'REFERENCES')
               OR has_table_privilege(current_user, 'control_plane.authorization_context_keys', 'TRIGGER')
              ) AS runtime_can_access`
    );
    authorizationContextKeyAvailable = contextKey.rows[0]?.configured === true;
    runtimeCanAccessAuthorizationContextKey = contextKey.rows[0]?.runtime_can_access !== false;
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
    const trustedTenantContextAvailable = rlsPoliciesAvailable &&
      authorizationContextKeyAvailable && !runtimeCanAccessAuthorizationContextKey &&
      hasSecureControlPlaneSecret();
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

  const trustedTenantContextAvailable = rlsPoliciesAvailable &&
    authorizationContextKeyAvailable && !runtimeCanAccessAuthorizationContextKey &&
    hasSecureControlPlaneSecret();
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

  const stage2Capabilities = PRODUCTION_CAPABILITIES.filter(capability =>
    !['platform_liveness', 'curriculum_reference'].includes(capability.id)
  );
  const stage2Implemented = stage2Capabilities.length > 0 &&
    stage2Capabilities.every(capability =>
      capability.state === 'ready' &&
      capability.acceptanceTests.length > 0 &&
      capability.readinessEvidence.length > 0
    );
  const runtimeDependenciesReady = provisioningReady && invitationDeliveryAvailable;
  const schoolAdministrationTemplate = APPLICATION_TEMPLATE_REGISTRY.find(template =>
    template.templateId === SCHOOL_ADMINISTRATION_IDENTITY_TEMPLATE.templateId
  );
  const templatesReady = Boolean(schoolAdministrationTemplate?.status === 'published' &&
    schoolAdministrationTemplate.provisionable) &&
    SUPPORTED_APPLICATION_TEMPLATES.length > 0 && lifecycleSchema &&
    stage2Implemented && runtimeDependenciesReady;
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
      ? { ready: true, evidence: 'Forced RLS, a restricted runtime role, an unreadable authorization key, and signed database contexts are verified.' }
      : unverified('Forced RLS, a restricted runtime role, an unreadable authorization key, and signed database contexts are not all verified.'),
    invitationDelivery: outboxSchema && invitationDeliveryAvailable
      ? { ready: true, evidence: 'Outbox schema (dead-letter, token versions) present and email configuration supplied; live provider delivery is not verified.' }
      : unverified(outboxSchema
        ? 'Email delivery configuration is not supplied.'
        : 'Invitation outbox schema is not current.'),
    applicationTemplates: templatesReady
      ? { ready: true, evidence: 'The template is published and provisionable; mandatory capabilities, runtime dependencies, and lifecycle schema are verified.' }
      : unverified('Template publication, mandatory capabilities, runtime dependencies, or lifecycle schema is not verified.'),
    capabilityImplementation: stage2Implemented
      ? { ready: true, evidence: 'Every registered administration capability is ready.' }
      : unverified('One or more administration capabilities are not operationally implemented.'),
    capabilityConfiguration: templatesReady
      ? { ready: true, evidence: 'The school administration template and all mandatory provisioning prerequisites are verified.' }
      : unverified('The school administration template is not yet published and provisionable.'),
    runtimeDependencies: runtimeDependenciesReady
      ? { ready: true, evidence: 'Database, migrations, authorization, platform credentials, and invitation delivery are configured.' }
      : unverified('One or more database, authorization, platform, or invitation-delivery dependencies are unavailable.'),
    applicationReadiness: unverified('Per-instance application health evidence is not available from platform readiness.'),
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
