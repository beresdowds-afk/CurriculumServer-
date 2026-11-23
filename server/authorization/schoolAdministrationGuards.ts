import type { Request, RequestHandler } from 'express';
import type { AuthorizedPrincipal } from './authorizedPrincipal';
import type { createAuthorizationMiddleware } from './middleware';
import { PERMISSIONS } from './permissions';

type AuthorizationMiddleware = ReturnType<typeof createAuthorizationMiddleware>;

export function createSchoolAdministrationGuards(auth: AuthorizationMiddleware) {
  const studentRead = auth.requirePermissionWithinScopes(PERMISSIONS.studentsRead, ['student', 'class']);
  const studentResource = (req: Request) => ({ resourceType: 'student', resourceId: req.params.studentId });
  const studentRecordRead: RequestHandler = (req, res, next) => {
    studentRead(req, res, () => {
      const actor = (req as Request & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      const id = req.params.studentId;
      const hasClassScope = actor.grants.some(grant =>
        grant.permissions.includes(PERMISSIONS.studentsRead) &&
        grant.scopes.some(scope => scope.resourceType === 'class')
      );
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
          (!actor.hasPermissionFor(PERMISSIONS.studentsRead, 'student', id) && !hasClassScope)) {
        res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Permission denied.' });
        return;
      }
      next();
    });
  };

  const lifecycle: RequestHandler = (req, res, next) => {
    auth.requireResourcePermission(PERMISSIONS.studentLifecycleManage, studentResource)(req, res, () => {
      const type = req.body?.type;
      const permission = type === 'admit' || type === 'activate' || type === 'enroll' ? PERMISSIONS.studentsAdmit
        : type === 'external_transfer' ? PERMISSIONS.studentsTransfer
          : type === 'graduate' ? PERMISSIONS.studentsGraduate
            : type === 'withdraw' || type === 'reinstate' || type === 'suspend' ? PERMISSIONS.studentsUpdate : undefined;
      if (!permission) {
        res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'Unsupported lifecycle action.' });
        return;
      }
      const actor = (req as Request & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      if (!actor.hasPermissionFor(permission, 'student', req.params.studentId)) {
        res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Permission denied.' });
        return;
      }
      next();
    });
  };

  const assignClass: RequestHandler = (req, res, next) => {
    auth.requireResourcePermission(PERMISSIONS.classesUpdate, req => ({
      resourceType: 'class', resourceId: typeof req.body?.classId === 'string' ? req.body.classId : ''
    }))(req, res, () => {
      const operation = req.body?.operation;
      if (operation !== undefined && !['assign', 'promote', 'internal_transfer'].includes(operation)) {
        res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'Invalid class assignment operation.' });
        return;
      }
      const permission = operation === 'promote' ? PERMISSIONS.studentsPromote
        : operation === 'internal_transfer' ? PERMISSIONS.studentsTransfer : PERMISSIONS.classesUpdate;
      const actor = (req as Request & { authorizedPrincipal: AuthorizedPrincipal }).authorizedPrincipal;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.studentId) ||
          !actor.hasPermissionFor(permission, 'student', req.params.studentId)) {
        res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Permission denied.' });
        return;
      }
      next();
    });
  };

  const staffResource = (req: Request) => ({ resourceType: 'staff', resourceId: req.params.staffId });

  return {
    schoolProfileUpdate: auth.requirePermission(PERMISSIONS.schoolProfileUpdate),
    schoolStatusRead: auth.requirePermission(PERMISSIONS.schoolProfileRead),
    departmentsRead: auth.requirePermission(PERMISSIONS.departmentsRead),
    departmentsManage: auth.requirePermission(PERMISSIONS.departmentsManage),
    sessionsRead: auth.requirePermission(PERMISSIONS.sessionsRead),
    sessionsManage: auth.requirePermission(PERMISSIONS.sessionsManage),
    studentRead,
    studentRecordRead,
    studentCreate: auth.requirePermission(PERMISSIONS.studentsCreate),
    studentUpdate: auth.requireResourcePermission(PERMISSIONS.studentsUpdate, studentResource),
    studentMedicalRead: auth.requireResourcePermission(PERMISSIONS.studentsMedicalRead, studentResource),
    studentMedicalManage: auth.requireResourcePermission(PERMISSIONS.studentsMedicalManage, studentResource),
    studentDigitalIdRead: studentRecordRead,
    studentDigitalIdManage: auth.requireResourcePermission(PERMISSIONS.studentsUpdate, studentResource),
    admissionsRead: auth.requirePermission(PERMISSIONS.admissionsRead),
    admissionsManage: auth.requirePermission(PERMISSIONS.admissionsManage),
    guardiansRead: auth.requirePermission(PERMISSIONS.guardiansRead),
    guardiansManage: auth.requirePermission(PERMISSIONS.guardiansManage),
    guardiansVerify: auth.requirePermission(PERMISSIONS.guardiansVerify),
    guardianSelfRead: auth.activeMembership,
    lifecycle,
    assignClass,
    classRead: auth.requirePermission(PERMISSIONS.classesRead),
    classCreate: auth.requirePermission(PERMISSIONS.classesCreate),
    classUpdate: auth.requireResourcePermission(PERMISSIONS.classesUpdate, req => ({
      resourceType: 'class', resourceId: req.params.classId
    })),
    staffRead: auth.requirePermission(PERMISSIONS.staffRead),
    staffCreate: auth.requirePermission(PERMISSIONS.staffCreate),
    staffRecordRead: auth.requireResourcePermission(PERMISSIONS.staffRead, staffResource),
    staffUpdate: auth.requireResourcePermission(PERMISSIONS.staffUpdate, staffResource),
    staffAppoint: auth.requireResourcePermission(PERMISSIONS.staffAppoint, staffResource),
    staffLinkAccount: auth.requirePermission(PERMISSIONS.identityManage),
    rolesRead: auth.requirePermission(PERMISSIONS.membershipRead),
    permissionsRead: auth.requirePermission(PERMISSIONS.membershipRead),
    membershipRead: auth.requirePermission(PERMISSIONS.membershipRead),
    membershipRolesAssign: auth.requirePermission(PERMISSIONS.membershipRolesAssign),
    identityInvite: auth.requirePermission(PERMISSIONS.identityInvite),
    identityManage: auth.requirePermission(PERMISSIONS.identityManage),
    sessionsManageAccess: auth.requirePermission(PERMISSIONS.identitySessionsManage),
    mfaManage: auth.requirePermission(PERMISSIONS.identityMfaManage),
    auditRead: auth.requirePermission(PERMISSIONS.auditRead)
  };
}
