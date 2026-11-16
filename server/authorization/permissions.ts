// Canonical permission and role codes. Authoritative role -> permission
// mappings live in PostgreSQL (production.role_permissions, migration 008);
// these constants only name them for application code.
export const PERMISSIONS = {
  schoolProfileRead: 'school.profile.read',
  schoolConfigurationRead: 'school.configuration.read',
  schoolConfigurationManage: 'school.configuration.manage',
  membershipRead: 'membership.read',
  membershipRolesAssign: 'membership.roles.assign',
  studentsRead: 'students.read',
  studentsManage: 'students.manage',
  classesRead: 'classes.read',
  classesManage: 'classes.manage',
  staffRead: 'staff.read',
  staffManage: 'staff.manage',
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
