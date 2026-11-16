// Canonical permission and role codes. Authoritative role -> permission
// mappings live in PostgreSQL (production.role_permissions, migration 008);
// these constants only name them for application code.
export const PERMISSIONS = {
  schoolProfileRead: 'school.profile.read',
  schoolProfileUpdate: 'school.profile.update',
  schoolConfigurationRead: 'school.configuration.read',
  schoolConfigurationManage: 'school.configuration.manage',
  membershipRead: 'membership.read',
  membershipRolesAssign: 'membership.roles.assign',
  studentsRead: 'students.read',
  studentsManage: 'students.manage',
  studentsCreate: 'students.create',
  studentsUpdate: 'students.update',
  studentsAdmit: 'students.admit',
  studentsTransfer: 'students.transfer',
  studentsPromote: 'students.promote',
  studentsGraduate: 'students.graduate',
  classesRead: 'classes.read',
  classesManage: 'classes.manage',
  classesCreate: 'classes.create',
  classesUpdate: 'classes.update',
  staffRead: 'staff.read',
  staffManage: 'staff.manage',
  staffCreate: 'staff.create',
  staffUpdate: 'staff.update',
  staffAppoint: 'staff.appoint',
  identityInvite: 'identity.invite',
  identityManage: 'identity.manage',
  permissionsManage: 'permissions.manage',
  studentLifecycleManage: 'student_lifecycle.manage'
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const TENANT_ROLES = {
  tenantAdmin: 'tenant_admin',
  staff: 'staff',
  readOnly: 'read_only'
} as const;

// Platform administration is deliberately not a tenant role.
export const PLATFORM_ADMIN_ROLE = 'super_admin';
