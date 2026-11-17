// The /api/v1 lockdown stays fail-closed: a route is served only when its
// capability is ready and carries the required operational evidence.
export type CapabilityState =
  | 'not_started'
  | 'implemented'
  | 'configured'
  | 'ready'
  | 'degraded'
  | 'disabled';

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
  readinessEvidence: readonly string[];
  state: CapabilityState;
}

const exact = (...paths: string[]) => new RegExp(`^(?:${paths.map(p => p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})$`);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const uuidPath = (suffix = '') => new RegExp(`^/schools/me/students/${uuid}${suffix}$`, 'i');
const unavailableAdministrationRoute = (resource: string) =>
  new RegExp(`^/schools/me/${resource}(?:/.*)?$`);

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
    readinessEvidence: ['static_health_handlers'],
    state: 'ready'
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
    readinessEvidence: ['static_reference_data'],
    state: 'ready'
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
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'school_identity',
    description: 'Tenant-scoped school profile, configuration, and membership APIs.',
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
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'student_administration',
    description: 'Student directory and record APIs.',
    routes: [
      { method: 'GET', path: exact('/schools/me/students') },
      { method: 'POST', path: exact('/schools/me/students') },
      { method: 'GET', path: uuidPath() }
    ],
    requiredRepositories: ['SchoolAdministrationRepository'],
    requiredMigrations: [9],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['students.read', 'students.create'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolAdministration.integration.test.ts'],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'class_administration',
    description: 'School class creation and student class assignment APIs.',
    routes: [
      { method: 'POST', path: exact('/schools/me/classes') },
      { method: 'POST', path: uuidPath('/class') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository'],
    requiredMigrations: [9],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['classes.create', 'classes.update'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolAdministration.integration.test.ts'],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'staff_administration',
    description: 'School staff directory, invitations, and membership lifecycle.',
    routes: [
      { method: 'GET', path: unavailableAdministrationRoute('staff') },
      { method: 'POST', path: unavailableAdministrationRoute('staff') },
      { method: 'PATCH', path: unavailableAdministrationRoute('staff') },
      { method: 'DELETE', path: unavailableAdministrationRoute('staff') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository', 'AuthorizationRepository'],
    requiredMigrations: [9],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['staff.read', 'staff.manage'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'not_started'
  },
  {
    id: 'administrative_permissions',
    description: 'School role assignment and permission administration.',
    routes: [
      { method: 'GET', path: unavailableAdministrationRoute('roles') },
      { method: 'GET', path: unavailableAdministrationRoute('permissions') },
      { method: 'GET', path: unavailableAdministrationRoute('memberships') },
      { method: 'POST', path: unavailableAdministrationRoute('roles') },
      { method: 'PATCH', path: unavailableAdministrationRoute('memberships') },
      { method: 'DELETE', path: unavailableAdministrationRoute('memberships') }
    ],
    requiredRepositories: ['AuthorizationRepository'],
    requiredMigrations: [8, 9],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['membership.roles.assign', 'permissions.manage'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'not_started'
  },
  {
    id: 'student_lifecycle',
    description: 'Student lifecycle transitions, class history, and audit history.',
    routes: [
      { method: 'POST', path: uuidPath('/lifecycle') },
      { method: 'GET', path: uuidPath('/history') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository'],
    requiredMigrations: [9],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['student_lifecycle.manage'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolAdministration.integration.test.ts'],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'application_template_discovery',
    description: 'Discover provisionable school-application templates.',
    routes: [{ method: 'GET', path: exact('/application-templates') }],
    requiredRepositories: ['ApplicationTemplateRepository'],
    requiredMigrations: [7, 10],
    authentication: 'platform_administrator',
    authorization: { rule: 'platform_template_discovery', permissions: [] },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'not_started'
  }
];

/** Reasons a registration may not be served even if marked enabled. */
export function capabilityActivationProblems(capability: CapabilityRegistration): string[] {
  const problems: string[] = [];
  if (capability.state !== 'ready') problems.push(`capability state is '${capability.state}'`);
  if (capability.acceptanceTests.length === 0) problems.push('no acceptance tests declared');
  if (capability.readinessEvidence.length === 0) problems.push('operational readiness evidence is missing');
  if (capability.routes.length === 0) problems.push('no routes declared');
  if (capability.authentication !== 'none' && capability.authorization.rule === 'public') {
    problems.push('authenticated capability declares public authorization');
  }
  if (capability.authentication === 'tenant_user_session' &&
      (capability.tenantContext !== 'transaction_local_tenant' || capability.authorization.permissions.length === 0)) {
    problems.push('tenant capability lacks tenant-context transaction or permissions');
  }
  if (capability.authentication === 'platform_administrator' &&
      capability.tenantContext !== 'control_plane_transaction') {
    problems.push('platform capability lacks a control-plane transaction context');
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
