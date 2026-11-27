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
    description: 'Centralized identity, Google OIDC, MFA, and public invitation activation endpoints.',
    routes: [
      { method: 'GET', path: exact('/schools/auth/oidc/google/start', '/schools/invitations/preview') },
      { method: 'POST', path: exact(
        '/server/auth/login',
        '/server/auth/verify',
        '/schools/auth/login',
        '/schools/auth/mfa/verify',
        '/schools/auth/oidc/google/callback',
        '/schools/invitations/accept',
        '/flow/auth/login'
      ) }
    ],
    requiredRepositories: ['AuthorizationRepository', 'SchoolProvisioningRepository'],
    requiredMigrations: [5, 6, 7, 8, 9, 10, 34],
    authentication: 'none',
    authorization: { rule: 'public', permissions: [] },
    tenantContext: 'none',
    acceptanceTests: ['server/authorization/iamLifecycle.test.ts', 'server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_user_sessions', 'totp_mfa_and_oidc_pkce', 'member_invitation_tokens'],
    state: 'ready'
  },
  {
    id: 'school_provisioning',
    description: 'Platform-administrator school provisioning and invitation activation.',
    routes: [
      { method: 'POST', path: exact('/schools/provision', '/schools/activation') },
      { method: 'POST', path: new RegExp(`^/schools/provision/${uuid}/retry$`, 'i') },
      { method: 'GET', path: new RegExp(`^/schools/provision/${uuid}(?:/steps)?$`, 'i') }
    ],
    requiredRepositories: ['SchoolProvisioningRepository', 'AuthorizationRepository'],
    requiredMigrations: [5, 6, 7, 8, 34],
    authentication: 'platform_administrator',
    authorization: { rule: 'platform_administrator_or_invitation_token', permissions: [] },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: ['server/schoolProvisioning.test.ts', 'server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['idempotent_transactional_provisioning', 'durable_workflow_steps', 'outbox_invitation_delivery'],
    state: 'ready'
  },
  {
    id: 'question_bank_scoped_writes',
    description: 'Question Bank and assessment writes requiring principal-bound repositories, instance ownership, teacher scope, and review enforcement.',
    routes: [
      {
        method: 'POST',
        path: exact(
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
        )
      },
      { method: 'PATCH', path: new RegExp(`^/question-bank/categories/${uuid}$`, 'i') },
      { method: 'POST', path: new RegExp(`^/question-bank/items/${uuid}/(?:submit|review|archive)$`, 'i') },
      { method: 'DELETE', path: new RegExp(`^/question-bank/items/${uuid}$`, 'i') }
    ],
    requiredRepositories: ['InstanceQuestionBankRepository', 'AuthorizationRepository'],
    requiredMigrations: [8, 10, 15, 25, 35],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_resource_scope',
      permissions: ['question_bank.manage', 'question_bank.review', 'assessments.manage']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/questionBank/instanceQuestionBank.test.ts',
      'server/questionBank/instanceQuestionBankRoutes.integration.test.ts'
    ],
    readinessEvidence: [
      'tenant_and_application_instance_ownership_enforced',
      'conflicting_instance_scope_rejection_and_audit',
      'teacher_subject_class_assignment_scoping',
      'separate_review_approval_and_archival_preservation',
      'postgresql_rls_and_route_integration_tests'
    ],
    state: 'ready'
  },
  {
    id: 'school_finance_fee_policies',
    description: 'School-specific immutable fee policy versions, effective-date resolution, principal approval, and supersession.',
    routes: [
      { method: 'GET', path: exact('/school-finance/schools') },
      { method: 'GET', path: new RegExp(`^/school-finance/schools/${uuid}/fee-policies(?:/effective)?$`, 'i') },
      { method: 'POST', path: new RegExp(`^/school-finance/schools/${uuid}/fee-policies(?:/${uuid}/(?:approve|supersede))?$`, 'i') }
    ],
    requiredRepositories: ['SchoolFinancePolicies', 'AuthorizationRepository'],
    requiredMigrations: [8, 9, 10, 29, 36],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'multi_school_database_permission_and_principal_role_for_approval',
      permissions: [
        'school_finance.policies.read',
        'school_finance.policies.create',
        'school_finance.policies.approve',
        'school_finance.policies.supersede'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/db/schoolFinancePolicies.test.ts',
      'server/db/schoolFinanceRoutes.test.ts',
      'server/db/schoolFinancePolicies.integration.test.ts',
      'src/components/AccountManagementTab.test.tsx'
    ],
    readinessEvidence: [
      'immutable_fee_policy_versions_and_supersessions',
      'effective_policy_resolution_excludes_unapproved_and_superseded',
      'multi_school_principal_approval_enforcement',
      'account_management_ui_non_payment_disclosure'
    ],
    state: 'ready'
  },
  {
    id: 'school_finance_settlement_account_requests',
    description: 'Principal proposals, proprietor governance, and fail-closed OPay/Paystack/Flutterwave verification for school settlement accounts; payment execution remains disabled.',
    routes: [
      { method: 'GET', path: new RegExp(`^/school-finance/schools/${uuid}/settlement-accounts(?:/active|/${uuid}(?:/events)?)?$`, 'i') },
      { method: 'POST', path: new RegExp(`^/school-finance/schools/${uuid}/settlement-accounts(?:/${uuid}/(?:approve|reject|verify|activate|suspend|revoke|replace|verification-callback))?$`, 'i') }
    ],
    requiredRepositories: ['SchoolSettlementAccounts', 'AuthorizationRepository'],
    requiredMigrations: [8, 9, 10, 29, 30, 37],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'multi_school_database_permission_and_principal_or_proprietor_role',
      permissions: [
        'school_finance.settlement.read',
        'school_finance.settlement.request',
        'school_finance.settlement.approve',
        'school_finance.settlement.verify',
        'school_finance.settlement.manage'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/db/schoolSettlementAccounts.test.ts',
      'server/db/schoolFinanceRoutes.test.ts',
      'server/db/schoolFinancePolicies.integration.test.ts'
    ],
    readinessEvidence: [
      'fail_closed_opay_paystack_flutterwave_verification_adapters',
      'encrypted_nuban_and_provider_reference_vault_storage',
      'single_active_default_settlement_account_constraint',
      'signed_idempotent_verification_callbacks_and_immutable_events'
    ],
    state: 'ready'
  },
  {
    id: 'school_identity',
    description: 'Tenant-scoped school institutional identity, profile, status history, departments, academic calendar, configuration, and membership APIs.',
    routes: [
      { method: 'GET', path: exact(
        '/schools/me',
        '/schools/me/config',
        '/schools/me/membership',
        '/schools/me/status-history',
        '/schools/me/departments',
        '/schools/me/academic-sessions'
      ) },
      { method: 'PUT', path: exact('/schools/me', '/schools/me/config') },
      { method: 'PATCH', path: exact('/schools/me') },
      { method: 'PATCH', path: new RegExp(`^/schools/me/departments/${uuid}$`, 'i') },
      { method: 'POST', path: exact('/schools/me/status', '/schools/me/departments', '/schools/me/academic-sessions') },
      { method: 'POST', path: new RegExp(`^/schools/me/academic-sessions/${uuid}/(?:activate|terms)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/academic-terms/${uuid}/activate$`, 'i') }
    ],
    requiredRepositories: ['SchoolProvisioningRepository', 'SchoolAdministrationRepository', 'AuthorizationRepository'],
    requiredMigrations: [5, 6, 7, 8, 9, 34],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: [
        'school.profile.read',
        'school.profile.update',
        'school.configuration.read',
        'school.configuration.manage',
        'membership.read',
        'departments.read',
        'departments.manage',
        'sessions.read',
        'sessions.manage'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/prompt1Administration.test.ts', 'server/authorization/middleware.test.ts'],
    readinessEvidence: ['postgresql_school_identity_and_status_history', 'departments_and_academic_calendar_rls'],
    state: 'ready'
  },
  {
    id: 'student_administration',
    description: 'Student directory, admissions workflow, medical profiles, digital ID cards, and guardian management APIs.',
    routes: [
      { method: 'GET', path: exact('/schools/me/students', '/schools/me/admissions', '/schools/me/guardians', '/schools/me/guardians/my-wards') },
      { method: 'POST', path: exact('/schools/me/students', '/schools/me/admissions', '/schools/me/guardians') },
      { method: 'POST', path: new RegExp(`^/schools/me/admissions/${uuid}/(?:review|enroll)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/guardians/${uuid}/(?:verify|students)$`, 'i') },
      { method: 'PATCH', path: new RegExp(`^/schools/me/guardians/${uuid}$`, 'i') },
      { method: 'DELETE', path: new RegExp(`^/schools/me/guardians/${uuid}/students/${uuid}$`, 'i') },
      { method: 'GET', path: uuidPath() },
      { method: 'PATCH', path: uuidPath() },
      { method: 'GET', path: uuidPath('/medical') },
      { method: 'PUT', path: uuidPath('/medical') },
      { method: 'GET', path: uuidPath('/digital-id') },
      { method: 'POST', path: uuidPath('/digital-id') },
      { method: 'POST', path: uuidPath('/digital-id/revoke') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository'],
    requiredMigrations: [9, 34],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: [
        'students.read',
        'students.create',
        'students.update',
        'students.medical.read',
        'students.medical.manage',
        'admissions.read',
        'admissions.manage',
        'guardians.read',
        'guardians.manage',
        'guardians.verify'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_student_admissions_medical_digital_id', 'guardian_verification_and_ward_scoping'],
    state: 'ready'
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
    requiredMigrations: [9, 34],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['classes.read', 'classes.create', 'classes.update'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_classes_and_assignments'],
    state: 'ready'
  },
  {
    id: 'staff_administration',
    description: 'School staff directory, account linking, role appointments, subject allocations, and status transitions.',
    routes: [
      { method: 'GET', path: exact('/schools/me/staff') },
      { method: 'GET', path: staffUuidPath() },
      { method: 'POST', path: exact('/schools/me/staff') },
      { method: 'PATCH', path: staffUuidPath() },
      { method: 'GET', path: new RegExp(`^/schools/me/staff/${uuid}/subject-allocations$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/staff/${uuid}/(?:link-user|unlink-user|appointments|subject-allocations|status)$`, 'i') },
      { method: 'DELETE', path: new RegExp(`^/schools/me/staff/${uuid}/subject-allocations/${uuid}$`, 'i') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository', 'AuthorizationRepository'],
    requiredMigrations: [9, 34],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: ['staff.read', 'staff.create', 'staff.update', 'staff.appoint']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_staff_linking_appointments_allocations'],
    state: 'ready'
  },
  {
    id: 'attendance_platform_device_provisioning',
    description: 'Platform-level attendance device catalogue administration, adapter registry/verification, compatibility checks, and durable 12-state provisioning workflows.',
    routes: [
      { method: 'GET', path: exact('/platform/attendance/device-catalogue') },
      { method: 'POST', path: exact(
        '/platform/attendance/device-catalogue',
        '/platform/attendance/adapters',
        '/platform/attendance/provisioning-requests'
      ) },
      { method: 'GET', path: new RegExp(`^/platform/attendance/(?:provisioning-requests|device-catalogue)/${uuid}$`, 'i') },
      { method: 'PATCH', path: new RegExp(`^/platform/attendance/device-catalogue/${uuid}$`, 'i') },
      { method: 'POST', path: new RegExp(`^/platform/attendance/device-catalogue/${uuid}/(?:enable|disable)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/platform/attendance/adapters/[A-Za-z0-9._:-]+/versions/[A-Za-z0-9._:-]+/verify$`, 'i') },
      { method: 'POST', path: new RegExp(`^/platform/attendance/provisioning-requests/${uuid}/(?:validate|execute|retry)$`, 'i') }
    ],
    requiredRepositories: [
      'SchoolProvisioningRepository',
      'AttendanceProvisioningRepository',
      'AttendanceProvisioningWorkflow',
      'AttendanceAdapterRegistry'
    ],
    requiredMigrations: [31, 32, 33, 39],
    authentication: 'platform_administrator',
    authorization: {
      rule: 'verified_platform_administrator_and_control_plane_transaction',
      permissions: ['attendance.devices.provision']
    },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: [
      'server/attendance/provisioningWorkflow.test.ts',
      'server/attendance/provisioningAndCatalogue.test.ts',
      'server/attendance/attendanceLifecycle.integration.test.ts'
    ],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'attendance_school_device_management',
    description: 'Tenant-scoped school attendance capability, allocated-device status, health diagnostics, lifecycle controls, location reassignment, and device credential rotation/revocation.',
    routes: [
      { method: 'GET', path: exact('/schools/me/attendance/devices', '/schools/me/attendance/capability') },
      { method: 'GET', path: new RegExp(`^/schools/me/attendance/devices/${uuid}$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/attendance/devices/${uuid}/(?:test|suspend|reactivate|revoke|decommission|reassign-location)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/attendance/devices/${uuid}/credentials/(?:rotate|revoke)$`, 'i') }
    ],
    requiredRepositories: ['AttendanceDeviceManagementService', 'AttendanceProvisioningRepository', 'AuthorizationRepository'],
    requiredMigrations: [8, 10, 31, 32, 39],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'tenant_membership_and_resource_scoped_attendance_permission',
      permissions: [
        'attendance.read',
        'attendance.devices.manage',
        'attendance.devices.activate',
        'attendance.devices.suspend',
        'attendance.devices.revoke',
        'attendance.credentials.manage'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/attendance/deviceManagement.test.ts',
      'server/attendance/attendanceLifecycle.integration.test.ts'
    ],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'attendance_device_ingestion',
    description: 'Authenticated attendance device enrollment, HMAC-SHA256 ingestion with replay protection, schedule classification, PostgreSQL register, manual adjustments, offline sync, and verified guardian notification outbox intents.',
    routes: [
      { method: 'POST', path: exact(
        '/attendance/devices',
        '/attendance/credentials',
        '/attendance/device-events',
        '/attendance/device-events/batch',
        '/attendance/heartbeat',
        '/attendance/enrollment-ack'
      ) },
      { method: 'GET', path: exact('/attendance/sync-status', '/attendance/register') },
      { method: 'PATCH', path: new RegExp(`^/attendance/records/${uuid}/adjustments$`, 'i') }
    ],
    requiredRepositories: ['AttendanceDeviceIngestionService', 'AuthorizationRepository', 'NotificationService'],
    requiredMigrations: [8, 10, 27, 31, 32, 34, 39],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'device_hmac_and_database_permission_with_school_scope',
      permissions: ['attendance.devices.manage', 'attendance.credentials.manage', 'attendance.read', 'attendance.adjust']
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/attendance/deviceAdapter.test.ts',
      'server/attendance/deviceIngestion.test.ts',
      'server/attendance/attendanceLifecycle.integration.test.ts'
    ],
    readinessEvidence: [],
    state: 'implemented'
  },
  {
    id: 'administrative_permissions',
    description: 'School role assignment, permission governance, member invitations, sessions, TOTP MFA, and audit administration.',
    routes: [
      { method: 'GET', path: exact(
        '/schools/me/roles',
        '/schools/me/permissions',
        '/schools/me/memberships',
        '/schools/me/invitations',
        '/schools/me/sessions',
        '/schools/me/audit-events',
        '/schools/me/mfa/totp'
      ) },
      { method: 'POST', path: exact(
        '/schools/auth/logout',
        '/schools/me/memberships/roles',
        '/schools/me/invitations',
        '/schools/me/mfa/totp'
      ) },
      { method: 'POST', path: new RegExp(`^/schools/me/memberships/${uuid}/(?:suspend|reactivate|revoke)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/invitations/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/sessions/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/schools/me/mfa/totp/${uuid}/verify$`, 'i') },
      { method: 'DELETE', path: exact('/schools/me/memberships/roles') },
      { method: 'DELETE', path: new RegExp(`^/schools/me/mfa/totp/${uuid}$`, 'i') }
    ],
    requiredRepositories: ['AuthorizationRepository'],
    requiredMigrations: [8, 9, 34],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission',
      permissions: [
        'membership.read',
        'membership.roles.assign',
        'permissions.manage',
        'identity.invite',
        'identity.manage',
        'identity.sessions.manage',
        'identity.mfa.manage',
        'audit.read'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/authorization/iamLifecycle.test.ts', 'server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['database_rbac_and_privilege_escalation_prevention', 'session_mfa_and_audit_governance'],
    state: 'ready'
  },
  {
    id: 'student_lifecycle',
    description: 'Student lifecycle transitions, class history, and audit history.',
    routes: [
      { method: 'POST', path: uuidPath('/lifecycle') },
      { method: 'GET', path: uuidPath('/history') }
    ],
    requiredRepositories: ['SchoolAdministrationRepository'],
    requiredMigrations: [9, 34],
    authentication: 'tenant_user_session',
    authorization: { rule: 'database_permission', permissions: ['student_lifecycle.manage'] },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: ['server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_student_lifecycle_state_machine'],
    state: 'ready'
  },
  {
    id: 'campus_logistics',
    description: 'Tenant-authorized campus gate security, guardian pickup passes, exeat workflows, dining, transport events, GPS telemetry, digital library, hostel occupancy, and immutable audit trail.',
    routes: [
      { method: 'GET', path: exact(
        '/logistics/configuration', '/logistics/occupancy',
        '/logistics/guardians', '/logistics/pickup-passes',
        '/logistics/gate/locations', '/logistics/gate/events', '/logistics/gate/incidents',
        '/logistics/hostel/allocations', '/logistics/hostel/register',
        '/logistics/exeats', '/logistics/dining/meals', '/logistics/dining/entitlements', '/logistics/dining/dietary-restrictions',
        '/logistics/library/resources', '/logistics/library/storage', '/logistics/transport/routes', '/logistics/transport/drivers',
        '/logistics/transport/vehicles', '/logistics/transport/student-routes', '/logistics/transport/trips',
        '/logistics/audit'
      ) },
      { method: 'GET', path: new RegExp(`^/logistics/exeats/${uuid}$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/(?:maintenance|telemetry)$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/transport/trips/${uuid}/(?:incidents|passengers)$`, 'i') },
      { method: 'GET', path: new RegExp(`^/logistics/library/resources/${uuid}/(?:download|usage)$`, 'i') },
      { method: 'PATCH', path: exact('/logistics/configuration') },
      { method: 'PUT', path: exact('/logistics/library/storage') },
      { method: 'PUT', path: new RegExp(`^/logistics/library/resources/${uuid}/file$`, 'i') },
      { method: 'POST', path: exact(
        '/logistics/guardians',
        '/logistics/pickup-passes',
        '/logistics/gate/locations',
        '/logistics/gate/scans',
        '/logistics/gate/incidents',
        '/logistics/exeats',
        '/logistics/exeats/evaluate-overdue',
        '/logistics/library/resources',
        '/logistics/hostel/register',
        '/logistics/hostel/assignments',
        '/logistics/dining/meals',
        '/logistics/dining/entitlements',
        '/logistics/dining/dietary-restrictions',
        '/logistics/transport/routes',
        '/logistics/transport/drivers',
        '/logistics/transport/vehicles',
        '/logistics/transport/student-routes',
        '/logistics/transport/trips'
      ) },
      { method: 'POST', path: new RegExp(`^/logistics/guardians/${uuid}/(?:verify|students)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/guardian-students/${uuid}/pickup-authorizations$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/pickup-passes/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/gate/locations/${uuid}/officers$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/hostel/assignments/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/dining/entitlements/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/dining/dietary-restrictions/${uuid}/revoke$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/drivers/${uuid}/qualification$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/(?:compliance|maintenance)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/maintenance/${uuid}/complete$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/student-routes/${uuid}/end$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/(?:complete|cancel|incidents)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/library/resources/${uuid}/(?:visibility|publication)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/exeats/${uuid}/(?:decisions|departure-authorization|gate-movements|cancel)$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/dining/meals/${uuid}/attendance$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/passenger-events$`, 'i') },
      { method: 'PATCH', path: new RegExp(`^/logistics/transport/trips/${uuid}/assignment$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/trips/${uuid}/start$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/gps-device$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/vehicles/${uuid}/telemetry/sync$`, 'i') },
      { method: 'POST', path: new RegExp(`^/logistics/transport/gps-device-bindings/${uuid}/revoke$`, 'i') }
    ],
    requiredRepositories: ['LogisticsRepository', 'LogisticsGpsRepository', 'LogisticsLibraryStorageService', 'AuthorizationRepository'],
    requiredMigrations: [11, 12, 13, 26, 27, 28, 38],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_school_configuration',
      permissions: [
        'logistics.configuration.read',
        'logistics.configuration.manage',
        'logistics.guardians.manage',
        'logistics.gate.read',
        'logistics.gate.manage',
        'logistics.hostel.read',
        'logistics.hostel.manage',
        'logistics.exeat.read',
        'logistics.exeat.request',
        'logistics.exeat.approve',
        'logistics.dining.read',
        'logistics.dining.manage',
        'logistics.dining.entitlement.manage',
        'logistics.dining.attendance.record',
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
        'logistics.library.storage.manage',
        'logistics.audit.read'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/logistics/logisticsRepository.test.ts',
      'server/logistics/logisticsRoutes.test.ts',
      'server/logistics/logisticsFeatureTemplate.test.ts',
      'server/logistics/logisticsLibraryStorageService.test.ts',
      'server/logistics/traccarGpsAdapter.test.ts',
      'server/logistics/googleLogisticsStorageAdapters.test.ts',
      'server/logistics/logisticsRepository.integration.test.ts',
      'server/logistics/boardingTransport.integration.test.ts',
      'server/notifications/notificationService.test.ts'
    ],
    readinessEvidence: [
      'postgresql_rls_scoped_logistics_workflows',
      'guardian_pickup_passes_and_gate_incidents_verified',
      'exeat_notifications_and_overdue_evaluation_verified',
      'dining_entitlements_and_transport_manifests_verified',
      'library_mime_allowlist_and_publication_controls_verified',
      'immutable_logistics_audit_trail_and_api_acceptance'
    ],
    state: 'ready'
  },
  {
    id: 'application_template_discovery',
    description: 'Discover provisionable school-application templates.',
    routes: [{ method: 'GET', path: exact('/application-templates') }],
    requiredRepositories: ['ApplicationTemplateRepository'],
    requiredMigrations: [7, 10, 34],
    authentication: 'platform_administrator',
    authorization: { rule: 'platform_template_discovery', permissions: [] },
    tenantContext: 'control_plane_transaction',
    acceptanceTests: ['server/db/prompt1Administration.test.ts'],
    readinessEvidence: ['postgresql_application_templates_catalogue'],
    state: 'ready'
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
    description: 'Strictly school-instance-owned Question Bank read endpoints for categories, items, blueprints, exam configurations, and assessment records.',
    routes: [
      { method: 'GET', path: exact('/question-bank', '/question-bank/categories', '/assessment-blueprints', '/assessments/exams', '/assessments/records') }
    ],
    requiredRepositories: ['InstanceQuestionBankRepository', 'AuthorizationRepository'],
    requiredMigrations: [8, 10, 15, 25, 35],
    authentication: 'tenant_user_session',
    authorization: {
      rule: 'database_permission_and_resource_scope',
      permissions: [
        'question_bank.read',
        'assessments.read'
      ]
    },
    tenantContext: 'transaction_local_tenant',
    acceptanceTests: [
      'server/questionBank/instanceQuestionBank.test.ts',
      'server/questionBank/instanceQuestionBankRoutes.integration.test.ts'
    ],
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
