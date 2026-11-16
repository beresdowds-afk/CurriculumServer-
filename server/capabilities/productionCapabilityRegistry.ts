// Explicit production capability registry. The /api/v1 lockdown stays
// fail-closed: a request is served only when it matches a route group whose
// registration is enabled AND carries the evidence required to be enabled.
export type CapabilityReadiness = 'not_started' | 'in_progress' | 'implemented' | 'enabled';

export type CapabilityAuthentication =
  | 'none'
  | 'platform_administrator'
  | 'tenant_user_session'
  | 'invitation_token';

export type CapabilityTenantContext =
  | 'none'
  | 'transaction_local_tenant'
  | 'control_plane_transaction'
  | 'invitation_token_transaction';

export interface CapabilityRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: RegExp;
}

export interface CapabilityRegistration {
  id: string;
  description: string;
  routes: CapabilityRoute[];
  requiredRepositories: string[];
  requiredMigrations: number[];
  authentication: CapabilityAuthentication;
  authorization: { rule: string; permissions: string[] };
  tenantContext: CapabilityTenantContext;
  // Test files that prove the capability end to end. Required to enable.
  acceptanceTests: string[];
  readiness: CapabilityReadiness;
}

const exact = (...paths: string[]) => new RegExp(`^(?:${paths.map(p => p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})$`);
const uuid = '[0-9a-f-]{36}';

export const PRODUCTION_CAPABILITIES: readonly CapabilityRegistration[] = [
  {
    id: 'platform_liveness',
    description: 'Liveness and readiness endpoints.',
    routes: [{ method: 'GET', path: exact('/health', '/readiness', '/agent/health', '/agent/ready', '/flow/status') }],
    requiredRepositories: [],
    requiredMigrations: [],
    authentication: 'none',
    authorization: { rule: 'public', permissions: [] },
    tenantContext: 'none',
    acceptanceTests: ['server/db/readiness.test.ts'],
    readiness: 'enabled'
  },
  {
    id: 'curriculum_reference',
    description: 'Read-only platform curriculum reference data.',
    routes: [
      { method: 'GET', path: exact('/curriculum', '/curriculum/stats', '/curriculum/subjects') },
      { method: 'GET', path: /^\/curriculum\/subject\/[A-Za-z0-9_-]+$/ }
    ],
    requiredRepositories: [],
    requiredMigrations: [],
    authentication: 'none',
    authorization: { rule: 'public_reference_data', permissions: [] },
    tenantContext: 'none',
    acceptanceTests: ['server/capabilities/productionCapabilityRegistry.test.ts'],
    readiness: 'enabled'
  },
  {
    id: 'school_provisioning',
    description: 'Platform-administrator school provisioning and invitation activation.',
    routes: [
      { method: 'POST', path: exact('/server/auth/login', '/schools/provision', '/schools/activation', '/schools/auth/login') },
      { method: 'POST', path: new RegExp(`^/schools/provision/${uuid}/retry$`, 'i') },
      { method: 'GET', path: new RegExp(`^/schools/provision/${uuid}$`, 'i') }
    ],
    requiredRepositories: ['SchoolProvisioningRepository', 'AuthorizationRepository'],
    requiredMigrations: [5, 6, 7, 8],
    authentication: 'platform_administrator',
    authorization: { rule: 'platform_administrator_or_invitation_token', permissions: [] },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: ['server/db/postgres.integration.test.ts'],
    readiness: 'enabled'
  },
  {
    id: 'school_tenant_access',
    description: 'Tenant-scoped school profile, configuration, and membership for authorized members.',
    routes: [
      { method: 'GET', path: exact('/schools/me', '/schools/me/config', '/schools/me/membership') },
      { method: 'PUT', path: exact('/schools/me/config') }
    ],
    requiredRepositories: ['SchoolProvisioningRepository', 'AuthorizationRepository'],
    requiredMigrations: [5, 6, 7, 8],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: ['school.profile.read', 'school.configuration.read', 'school.configuration.manage', 'membership.read']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/postgres.integration.test.ts', 'server/authorization/middleware.test.ts'],
    readiness: 'enabled'
  },
  // Stage 2 groups: registered but intentionally not enabled.
  stage2('school_identity', 'School identity administration.', [/^\/school\/(?:profile|identity)(?:\/.*)?$/], ['school.profile.read'], ['SchoolProvisioningRepository']),
  stage2('student_administration', 'Student administration.', [/^\/(?:school\/)?students(?:\/.*)?$/], ['students.read', 'students.manage'], ['StudentRepository']),
  stage2('class_administration', 'Class administration.', [/^\/(?:school\/)?classes(?:\/.*)?$/], ['classes.read', 'classes.manage'], ['ClassRepository']),
  stage2('staff_administration', 'Staff administration.', [/^\/(?:school\/)?staff(?:\/.*)?$/], ['staff.read', 'staff.manage'], ['StaffRepository']),
  stage2('administrative_permissions', 'Role and permission administration.', [/^\/school\/(?:roles|permissions|memberships)(?:\/.*)?$/], ['membership.roles.assign'], ['AuthorizationRepository']),
  stage2('student_lifecycle', 'Student lifecycle workflows.', [/^\/school\/student-lifecycle(?:\/.*)?$/], ['student_lifecycle.manage'], ['StudentRepository', 'StudentLifecycleService'])
];

function stage2(
  id: string,
  description: string,
  patterns: RegExp[],
  permissions: string[],
  requiredRepositories: string[]
): CapabilityRegistration {
  return {
    id,
    description,
    routes: patterns.flatMap(path =>
      (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map(method => ({ method, path }))
    ),
    requiredRepositories,
    requiredMigrations: [8],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission_and_resource_scope', permissions },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [],
    readiness: 'not_started'
  };
}

/** Reasons a registration may not be served even if marked enabled. */
export function capabilityActivationProblems(capability: CapabilityRegistration): string[] {
  const problems: string[] = [];
  if (capability.readiness !== 'enabled') problems.push('readiness is not enabled');
  if (capability.acceptanceTests.length === 0) problems.push('no acceptance tests declared');
  if (capability.routes.length === 0) problems.push('no routes declared');
  if (capability.authentication !== 'none' && capability.authorization.rule === 'public') {
    problems.push('authenticated capability declares public authorization');
  }
  if (capability.authentication === 'tenant_user_session' &&
      (capability.tenantContext !== 'transaction_local_tenant' || capability.authorization.permissions.length === 0)) {
    problems.push('tenant capability lacks tenant-context transaction or permissions');
  }
  return problems;
}

export type CapabilityGateDecision =
  | { allowed: true; capabilityId: string }
  | { allowed: false; reason: 'unknown_route' | 'capability_not_ready'; capabilityId?: string; problems?: string[] };

export function evaluateProductionCapabilityGate(
  method: string,
  path: string,
  registry: readonly CapabilityRegistration[] = PRODUCTION_CAPABILITIES
): CapabilityGateDecision {
  let blocked: CapabilityGateDecision | undefined;
  for (const capability of registry) {
    if (!capability.routes.some(route => route.method === method.toUpperCase() && route.path.test(path))) continue;
    const problems = capabilityActivationProblems(capability);
    if (problems.length === 0) return { allowed: true, capabilityId: capability.id };
    blocked ??= { allowed: false, reason: 'capability_not_ready', capabilityId: capability.id, problems };
  }
  return blocked ?? { allowed: false, reason: 'unknown_route' };
}
