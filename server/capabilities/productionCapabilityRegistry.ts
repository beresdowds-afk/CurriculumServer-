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
const classUuidPath = () => new RegExp(`^/schools/me/classes/${uuid}$`, 'i');
const staffUuidPath = () => new RegExp(`^/schools/me/staff/${uuid}$`, 'i');
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
    id: 'central_iam',
    description: 'Centralized identity, Google OIDC, MFA, and session management.',
    routes: [
      { method: 'POST', path: exact('/server/auth/login', '/server/auth/verify', '/schools/auth/login', '/flow/auth/login') }
    ],
    requiredRepositories: ['AuthorizationRepository', 'SchoolProvisioningRepository'],
    requiredMigrations: [5, 6, 7, 8, 9, 10],
    authentication: 'none',
    authorization: { rule: 'identity_and_session_verification_required', permissions: [] },
    tenantContext: 'none',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'not_started'
  },
  {
    id: 'biometric_attendance',
    description: 'Student and staff attendance; blocked until IAM, device authentication, persistence, notification integration and operational acceptance are verified.',
    routes: [],
    requiredRepositories: ['AttendanceRepository', 'AuthorizationRepository', 'NotificationService'],
    requiredMigrations: [8, 10, 27, 31],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_resource_scope_with_separate_device_authentication',
      permissions: [
        'attendance.configuration.read', 'attendance.configuration.manage',
        'attendance.sessions.read', 'attendance.sessions.manage',
        'attendance.students.read', 'attendance.students.override',
        'attendance.staff.read', 'attendance.staff.self.read', 'attendance.staff.override',
        'attendance.devices.read', 'attendance.devices.manage', 'attendance.devices.enroll',
        'attendance.devices.revoke', 'attendance.biometric.enroll', 'attendance.biometric.manage',
        'attendance.reports.read', 'attendance.reports.export',
        'attendance.notifications.read', 'attendance.notifications.manage', 'attendance.exceptions.review'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'not_started'
  },
  {
    id: 'school_provisioning',
    description: 'Platform-administrator school provisioning and invitation activation.',
    routes: [
      { method: 'POST', path: exact('/schools/provision', '/schools/activation') },
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
    id: 'question_bank_scoped_writes',
    description: 'Question Bank and assessment writes requiring principal-bound repositories and item-level scope enforcement.',
    routes: [
      { method: 'POST', path: /^\/(?:question-bank(?:\/.*)?|assessment-blueprints|assessments(?:\/(?!scope-authorizations(?:\/.*)?$|taught-generate$).*?)?)$/ },
      { method: 'DELETE', path: /^\/question-bank\/items\/[0-9a-f-]+$/i }
    ],
    requiredRepositories: ['InstanceQuestionBankRepository', 'AuthorizationRepository'],
    requiredMigrations: [8, 10, 15],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_resource_scope',
      permissions: ['question_bank.manage', 'question_bank.review', 'assessments.manage']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'school_finance_fee_policies',
    description: 'School-specific immutable fee policy versions and principal approvals.',
    routes: [
      { method: 'GET', path: exact('/school-finance/schools') },
      { method: 'GET', path: new RegExp(`^/school-finance/schools/${uuid}/fee-policies$`, 'i') },
      { method: 'POST', path: new RegExp(`^/school-finance/schools/${uuid}/fee-policies(?:/${uuid}/approve)?$`, 'i') }
    ],
    requiredRepositories: ['SchoolFinancePolicies', 'AuthorizationRepository'],
    requiredMigrations: [8, 9, 10, 29],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'tenant_wide_database_permission_and_principal_role_for_approval',
      permissions: ['school_finance.policies.read', 'school_finance.policies.create', 'school_finance.policies.approve']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolFinancePolicies.integration.test.ts'],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'school_finance_settlement_account_requests',
    description: 'Principal proposals and proprietor approvals of school settlement accounts; no provider activation.',
    routes: [
      { method: 'GET', path: new RegExp(`^/school-finance/schools/${uuid}/settlement-accounts(?:/${uuid})?$`, 'i') },
      { method: 'POST', path: new RegExp(`^/school-finance/schools/${uuid}/settlement-accounts(?:/${uuid}/approve)?$`, 'i') }
    ],
    requiredRepositories: ['SchoolSettlementAccounts', 'AuthorizationRepository'],
    requiredMigrations: [8, 9, 10, 29, 30],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'tenant_wide_database_permission_and_principal_or_proprietor_role',
      permissions: ['school_finance.settlement.read', 'school_finance.settlement.request', 'school_finance.settlement.approve']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolFinancePolicies.integration.test.ts'],
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
      { method: 'GET', path: uuidPath() },
      { method: 'PATCH', path: uuidPath() }
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
      { method: 'GET', path: exact('/schools/me/classes') },
      { method: 'POST', path: exact('/schools/me/classes') },
      { method: 'PATCH', path: classUuidPath() },
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
    description: 'School staff records and directory.',
    routes: [
      { method: 'GET', path: exact('/schools/me/staff') },
      { method: 'GET', path: staffUuidPath() },
      { method: 'POST', path: exact('/schools/me/staff') },
      { method: 'PATCH', path: staffUuidPath() }
    ],
    requiredRepositories: ['SchoolAdministrationRepository', 'AuthorizationRepository'],
    requiredMigrations: [9],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: ['staff.read', 'staff.create', 'staff.update']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/schoolAdministration.integration.test.ts'],
    readinessEvidence: [],
    state: 'implemented'
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
    id: 'campus_logistics',
    description: 'Tenant-authorized campus gate security, exeat workflows, dining, transport events, and hostel occupancy.',
    routes: [
      { method: 'GET', path: exact(
        '/logistics/configuration', '/logistics/occupancy', '/logistics/gate/events',
        '/logistics/hostel/allocations', '/logistics/hostel/register',
        '/logistics/exeats', '/logistics/dining/meals', '/logistics/dining/dietary-restrictions',
        '/logistics/library/resources', '/logistics/library/storage', '/logistics/transport/routes', '/logistics/transport/drivers',
        '/logistics/transport/vehicles', '/logistics/transport/student-routes', '/logistics/transport/trips'
      ) },
      { method: 'GET', path: new RegExp(`^/logistics/exeats/${uuid}$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/maintenance$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/transport/trips/${uuid}/incidents$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/library/resources/${uuid}/download$`, 'i') },
      { method: 'PATCH', path: exact('/logistics/configuration') },
      { method: 'PUT', path: exact('/logistics/library/storage') },
      { method: 'PUT', path: new RegExp(`^/logistics/library/resources/${uuid}/file$`, 'i') },
      { method: 'POST', path: exact(
        '/logistics/pickup-passes',
        '/logistics/gate/scans',
        '/logistics/exeats',
        '/logistics/library/resources',
        '/logistics/hostel/register',
        '/logistics/hostel/assignments',
        '/logistics/dining/meals',
        '/logistics/dining/dietary-restrictions',
        '/logistics/transport/routes',
        '/logistics/transport/drivers',
        '/logistics/transport/vehicles',
        '/logistics/transport/student-routes',
        '/logistics/transport/trips'
      ) },
      { method: 'POST', path: new RegExp(`^/logistics/hostel/assignments/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/dining/dietary-restrictions/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/drivers/${uuid}/qualification$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/(?:compliance|maintenance)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/maintenance/${uuid}/complete$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/student-routes/${uuid}/end$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/(?:complete|incidents)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/library/resources/${uuid}/visibility$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/exeats/${uuid}/(?:decisions|departure-authorization|gate-movements)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/dining/meals/${uuid}/attendance$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/passenger-events$`, 'i') },
      { method: 'PATCH', path: new RegExp(`^/logistics/transport/trips/${uuid}/assignment$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/start$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/gps-device$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/telemetry/sync$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/gps-device-bindings/${uuid}/revoke$`, 'i') }
    ],
    requiredRepositories: ['LogisticsRepository', 'LogisticsGpsRepository', 'AuthorizationRepository'],
    requiredMigrations: [11, 12, 13, 26, 27, 28],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_school_configuration',
      permissions: [
        'logistics.configuration.read',
        'logistics.configuration.manage',
        'logistics.gate.manage',
        'logistics.hostel.read',
        'logistics.hostel.manage',
        'logistics.dining.manage',
        'logistics.dietary.read',
        'logistics.dietary.manage',
        'logistics.dietary.exception',
        'logistics.transport.read',
        'logistics.transport.manage',
        'logistics.transport.passengers.manage',
        'logistics.gps.read',
        'logistics.gps.manage',
        'logistics.library.read',
        'logistics.library.manage',
        'logistics.library.storage.manage'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/logistics/logisticsRepository.test.ts',
      'server/logistics/logisticsRepository.integration.test.ts',
      'server/logistics/boardingTransport.integration.test.ts',
      'server/notifications/notificationService.test.ts'
    ],
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
  },
  {
    id: 'central_shared_service_foundation',
    description: 'Tenant-authorized discovery, authorization and health foundations for centrally owned shared services.',
    routes: [
      { method: 'GET', path: /^\/shared\/(?:curriculum|textbooks|vehicle-tracking)\/(?:discovery|health)$/ },
      { method: 'POST', path: /^\/shared\/(?:curriculum|textbooks|vehicle-tracking)\/authorization$/ }
    ],
    requiredRepositories: ['SharedServiceAuthorizationRepository'],
    requiredMigrations: [14],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_application_service_entitlement',
      permissions: [
        'shared.curriculum.discover',
        'shared.curriculum.authorize',
        'shared.curriculum.health',
        'shared.textbooks.discover',
        'shared.textbooks.authorize',
        'shared.textbooks.health',
        'shared.vehicle_tracking.discover',
        'shared.vehicle_tracking.authorize',
        'shared.vehicle_tracking.health'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/sharedServices/authorization.test.ts', 'server/sharedServices/registry.test.ts'],
    readinessEvidence: ['database_entitlement_boundary', 'tenant_authorization_and_audit_path'],
    state: 'ready'
  },
  {
    id: 'shared_service_platform_administration',
    description: 'Platform-administrator service entitlement grants and revocations.',
    routes: [
      { method: 'POST', path: exact('/platform/shared-services/entitlements') },
      { method: 'POST', path: /^\/platform\/shared-services\/entitlements\/[0-9a-f-]+\/revoke$/i }
    ],
    requiredRepositories: ['SharedServiceAuthorizationRepository'],
    requiredMigrations: [14],
    authentication: 'platform_administrator',
    authorization: {
      rule: 'platform_administrator_service_entitlement_management',
      permissions: []
    },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: ['server/sharedServices/authorization.test.ts'],
    readinessEvidence: ['signed_control_plane_transaction', 'platform_entitlement_audit'],
    state: 'ready'
  },
  {
    id: 'central_curriculum_consumption',
    description: 'Tenant-authorized retrieval of central curriculum countries, authorities, frameworks, grades, subjects, topics, objectives, competencies, source documents, versions, and coverage.',
    routes: [
      { method: 'GET', path: exact(
        '/shared/curriculum/countries',
        '/shared/curriculum/authorities',
        '/shared/curriculum/frameworks',
        '/shared/curriculum/grades',
        '/shared/curriculum/subjects',
        '/shared/curriculum/topics',
        '/shared/curriculum/objectives',
        '/shared/curriculum/competencies',
        '/shared/curriculum/source-documents',
        '/shared/curriculum/versions',
        '/shared/curriculum/coverage'
      ) },
      { method: 'GET', path: /^\/shared\/curriculum\/subjects\/[A-Za-z0-9_.:-]+$/ }
    ],
    requiredRepositories: ['CentralCurriculumRepository', 'SharedServiceAuthorizationRepository'],
    requiredMigrations: [14, 15, 16],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_application_service_entitlement',
      permissions: ['shared.curriculum.consume']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/curriculum/centralCurriculum.test.ts', 'server/sharedServices/authorization.test.ts'],
    readinessEvidence: ['postgresql_central_curriculum_database', 'tenant_entitlement_and_usage_metering'],
    state: 'ready'
  },
  {
    id: 'central_textbook_consumption',
    description: 'Tenant-authorized retrieval of published central textbooks, chapters, versions, coverage manifests, and entitled private media assets.',
    routes: [
      { method: 'GET', path: exact('/shared/textbooks') },
      { method: 'GET', path: /^\/shared\/textbooks\/[A-Za-z0-9_.:-]+$/ },
      { method: 'GET', path: /^\/shared\/textbooks\/[A-Za-z0-9_.:-]+\/(?:coverage|versions)$/ },
      { method: 'GET', path: /^\/shared\/textbooks\/[A-Za-z0-9_.:-]+\/chapters\/[A-Za-z0-9_.:-]+$/ },
      { method: 'GET', path: /^\/shared\/textbooks\/[A-Za-z0-9_.:-]+\/media\/[0-9a-f-]+$/i }
    ],
    requiredRepositories: ['CentralTextbookRepository', 'SharedServiceAuthorizationRepository'],
    requiredMigrations: [14, 15, 16],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_application_service_entitlement',
      permissions: ['shared.textbooks.consume']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/textbooks/centralTextbook.test.ts', 'server/sharedServices/authorization.test.ts'],
    readinessEvidence: ['postgresql_central_textbook_database', 'private_durable_media_storage'],
    state: 'ready'
  },
  {
    id: 'central_shared_content_write_protection',
    description: 'Explicit 403 rejection path preventing school/tenant mutations on central curriculum and textbook APIs.',
    routes: [
      { method: 'POST', path: /^\/shared\/(?:curriculum|textbooks)\/(?!authorization$)[A-Za-z0-9_./:-]+$/ },
      { method: 'PUT', path: /^\/shared\/(?:curriculum|textbooks)\/[A-Za-z0-9_./:-]+$/ },
      { method: 'PATCH', path: /^\/shared\/(?:curriculum|textbooks)\/[A-Za-z0-9_./:-]+$/ },
      { method: 'DELETE', path: /^\/shared\/(?:curriculum|textbooks)\/[A-Za-z0-9_./:-]+$/ }
    ],
    requiredRepositories: ['SharedServiceAuthorizationRepository'],
    requiredMigrations: [14, 15, 16],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'authoritative_central_content_read_only_for_tenants',
      permissions: ['shared.curriculum.consume', 'shared.textbooks.consume']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/curriculum/centralCurriculum.test.ts', 'server/textbooks/centralTextbook.test.ts'],
    readinessEvidence: ['tenant_write_rejection_handler', 'forced_postgresql_rls_control_plane_writes'],
    state: 'ready'
  },
  {
    id: 'central_editorial_administration',
    description: 'Platform editorial administrator workflows for central curriculum migrations/versions and central textbook generation, validation, review, approval, media, supersession, and publishing.',
    routes: [
      { method: 'POST', path: exact(
        '/platform/shared/curriculum/migrate-nerdc',
        '/platform/shared/curriculum/frameworks',
        '/platform/shared/curriculum/versions',
        '/platform/shared/textbooks/generate-outline',
        '/platform/shared/textbooks/generate-full',
        '/platform/shared/textbooks/generation-jobs/recover'
      ) },
      { method: 'POST', path: /^\/platform\/shared\/curriculum\/versions\/[A-Za-z0-9_.:-]+\/(?:submit-review|approve|publish|supersede)$/ },
      { method: 'GET', path: exact('/platform/shared/textbooks', '/platform/shared/textbooks/generation-jobs') },
      { method: 'POST', path: /^\/platform\/shared\/textbooks\/generation-jobs\/[0-9a-f-]+\/retry$/i },
      { method: 'POST', path: /^\/platform\/shared\/textbooks\/[A-Za-z0-9_.:-]+\/chapters\/[A-Za-z0-9_.:-]+\/generate$/ },
      { method: 'POST', path: /^\/platform\/shared\/textbooks\/[A-Za-z0-9_.:-]+\/(?:validate|submit-review|approve|reject|publish|supersede|media)$/ }
    ],
    requiredRepositories: ['CentralCurriculumRepository', 'CentralTextbookRepository'],
    requiredMigrations: [15, 16],
    authentication: 'platform_administrator',
    authorization: { rule: 'platform_editorial_administrator', permissions: [] },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: ['server/curriculum/centralCurriculum.test.ts', 'server/textbooks/centralTextbook.test.ts'],
    readinessEvidence: ['signed_control_plane_transaction', 'editorial_approval_and_publishing_workflow'],
    state: 'ready'
  },
  {
    id: 'instance_question_bank_and_assessments',
    description: 'Strictly school-instance-owned Question Bank, categories, assessment blueprints, exam configurations, and assessment records.',
    routes: [
      { method: 'GET', path: exact('/question-bank', '/question-bank/categories', '/assessment-blueprints', '/assessments/exams', '/assessments/records') },
      { method: 'POST', path: exact(
        '/question-bank',
        '/question-bank/categories',
        '/question-bank/seed-past-questions',
        '/question-bank/seed-theory-questions',
        '/question-bank/seed-practical-questions',
        '/question-bank/generate-objective',
        '/question-bank/generate-theory',
        '/question-bank/generate-practical',
        '/assessment-blueprints',
        '/assessments/exams',
        '/assessments/records'
      ) },
      { method: 'POST', path: /^\/question-bank\/items\/[0-9a-f-]+\/review$/i },
      { method: 'DELETE', path: /^\/question-bank\/items\/[0-9a-f-]+$/i }
    ],
    requiredRepositories: ['InstanceQuestionBankRepository'],
    requiredMigrations: [15],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: [
        'question_bank.read',
        'question_bank.manage',
        'question_bank.review',
        'assessments.read',
        'assessments.manage'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/questionBank/instanceQuestionBank.test.ts'],
    readinessEvidence: ['tenant_isolated_instance_question_bank', 'instance_assessment_persistence'],
    state: 'ready'
  },
  {
    id: 'teacher_academic_progress_authority',
    description: 'Authenticated teacher assignments, lesson note separation, 6-stage teaching delivery workflow, NERDC resolution, progress reporting, verified taught evidence, teacher-only scope authorizations, and provenance.',
    routes: [
      { method: 'GET', path: exact(
        '/teaching/assignments',
        '/teaching/lesson-notes',
        '/teaching/deliveries',
        '/teaching/progress',
        '/teaching/evidence',
        '/assessments/scope-authorizations',
        '/assessments/provenance'
      ) },
      { method: 'GET', path: /^\/teaching\/assignments\/[0-9a-f-]+\/curriculum-topics$/i },
      { method: 'GET', path: /^\/teaching\/deliveries\/[0-9a-f-]+\/audit-history$/i },
      { method: 'POST', path: exact(
        '/teaching/assignments',
        '/teaching/lesson-notes',
        '/teaching/deliveries',
        '/assessments/scope-authorizations',
        '/assessments/taught-generate'
      ) },
      { method: 'POST', path: /^\/teaching\/assignments\/[0-9a-f-]+\/revoke$/i },
      { method: 'POST', path: /^\/teaching\/deliveries\/[0-9a-f-]+\/(?:transition|complete|correct|map-curriculum|admin-verify)$/i },
      { method: 'POST', path: /^\/assessments\/scope-authorizations\/[0-9a-f-]+\/revoke$/i }
    ],
    requiredRepositories: ['TeachingEvidenceRepository', 'InstanceQuestionBankRepository'],
    requiredMigrations: [25],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_assignment_ownership',
      permissions: [
        'teaching.assignments.manage',
        'teaching.delivery.read',
        'teaching.delivery.manage',
        'teaching.evidence.read',
        'assessments.scope.authorize',
        'assessments.read',
        'ai.assessments.generate'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/teachingEvidence/teachingEvidence.test.ts'],
    readinessEvidence: ['postgresql_teaching_evidence_ledger', 'teacher_only_scope_authorization_enforcement'],
    state: 'ready'
  }
];

export const LEGACY_API_CAPABILITIES: readonly CapabilityRegistration[] = [
  {
    id: 'legacy_liveness',
    description: 'Legacy public liveness endpoint.',
    routes: [{ method: 'GET', path: exact('/health') }],
    requiredRepositories: [],
    requiredMigrations: [],
    authentication: 'none',
    authorization: { rule: 'public', permissions: [] },
    tenantContext: 'none',
    acceptanceTests: ['server/authorization/schoolAdministrationGuards.test.ts'],
    readinessEvidence: ['static_health_handler'],
    state: 'ready'
  }
];

/** Reasons a registration may not be served even if marked enabled. */
export function capabilityActivationProblems(capability: CapabilityRegistration): string[] {
  const problems: string[] = [];
  if (capability.state !== 'ready') problems.push(`capability state is '${capability.state}'`);
  if (capability.acceptanceTests.length === 0) problems.push('no acceptance tests declared');
  if (capability.readinessEvidence.length === 0) problems.push('operational readiness evidence is missing');
  if (capability.routes.length === 0) problems.push('no routes declared');
  if (!capability.authorization.rule.trim()) problems.push('authorization rule is missing');
  if (capability.authentication !== 'none' && capability.requiredRepositories.length === 0) {
    problems.push('authenticated capability declares no required repositories');
  }
  if (capability.authentication !== 'none' && capability.requiredMigrations.length === 0) {
    problems.push('authenticated capability declares no required migrations');
  }
  if (capability.requiredRepositories.some(repository => !repository.trim())) {
    problems.push('required repository declaration is invalid');
  }
  if (capability.requiredMigrations.some(migration =>
    !Number.isInteger(migration) || migration < 1
  )) {
    problems.push('required migration declaration is invalid');
  }
  const publicRules = ['public', 'public_reference_data'];
  if (capability.authentication !== 'none' && publicRules.includes(capability.authorization.rule)) {
    problems.push('authenticated capability declares public authorization');
  }
  if (capability.authentication === 'none' && !publicRules.includes(capability.authorization.rule)) {
    problems.push('unauthenticated capability declares non-public authorization');
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
  const matches = registry.filter(capability =>
    capability.routes.some(route => route.method === method.toUpperCase() && route.path.test(path))
  );
  if (matches.length === 0) return { allowed: false, reason: 'unknown_route' };
  const blocked = matches
    .map(capability => ({ capability, problems: capabilityActivationProblems(capability) }))
    .find(match => match.problems.length > 0);
  if (blocked) {
    return {
      allowed: false,
      reason: 'capability_not_ready',
      capabilityId: blocked.capability.id,
      problems: blocked.problems
    };
  }
  return { allowed: true, capabilityId: matches[0].id };
}
