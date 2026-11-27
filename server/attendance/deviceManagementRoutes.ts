import express, { type Request, type Response, type Router } from 'express';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabasePool } from '../db/postgres';
import {
  AttendanceDeviceManagementError,
  AttendanceDeviceManagementService
} from './deviceManagementService';

export interface AttendanceDeviceManagementRouterDeps {
  getPool: () => DatabasePool;
  authorizationMiddleware: Pick<AuthorizationMiddleware, 'requirePermission'> &
    Partial<Pick<AuthorizationMiddleware, 'requirePermissionWithinScopes'>>;
  createService?: (pool: DatabasePool) => AttendanceDeviceManagementService;
}

function actorFrom(req: Request): AuthorizedPrincipal {
  return (req as any).authorizedPrincipal;
}

function requestedSchoolScope(req: Request): string | undefined {
  const querySchool = typeof req.query.schoolId === 'string' && req.query.schoolId.trim()
    ? req.query.schoolId.trim()
    : undefined;
  const headerSchool = req.get('X-School-ID')?.trim() || undefined;
  const bodySchool = req.body && typeof req.body === 'object' && typeof req.body.schoolId === 'string' && req.body.schoolId.trim()
    ? req.body.schoolId.trim()
    : undefined;

  const provided = [querySchool, headerSchool, bodySchool].filter((v): v is string => Boolean(v));
  const distinct = [...new Set(provided)];
  if (distinct.length > 1) {
    throw new AttendanceDeviceManagementError(
      'CONFLICTING_SCHOOL_SCOPE',
      'Conflicting school identifiers were supplied.',
      400
    );
  }
  return distinct[0];
}

function sendError(req: Request, res: Response, error: unknown): void {
  const correlationId = (req as any).correlationId;
  if (error instanceof AttendanceDeviceManagementError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      error: error.message,
      correlationId
    });
    return;
  }
  console.error('Attendance device management error.');
  res.status(503).json({
    success: false,
    code: 'ATTENDANCE_DEVICE_MANAGEMENT_UNAVAILABLE',
    error: 'Attendance device management is temporarily unavailable.',
    correlationId
  });
}

export function createAttendanceDeviceManagementRouter(
  deps: AttendanceDeviceManagementRouterDeps
): Router {
  const router = express.Router();
  const service = () => deps.createService
    ? deps.createService(deps.getPool())
    : new AttendanceDeviceManagementService(deps.getPool());
  const requireSchoolPermission = (permission: string) =>
    deps.authorizationMiddleware.requirePermissionWithinScopes
      ? deps.authorizationMiddleware.requirePermissionWithinScopes(permission, ['school'])
      : deps.authorizationMiddleware.requirePermission(permission);

  router.get(
    '/schools/me/attendance/capability',
    requireSchoolPermission(PERMISSIONS.attendanceRead),
    async (req: Request, res: Response) => {
      try {
        const data = await service().getCapability(actorFrom(req), requestedSchoolScope(req));
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.get(
    '/schools/me/attendance/devices',
    requireSchoolPermission(PERMISSIONS.attendanceRead),
    async (req: Request, res: Response) => {
      try {
        const data = await service().listDevices(actorFrom(req), requestedSchoolScope(req));
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.get(
    '/schools/me/attendance/devices/:deviceId',
    requireSchoolPermission(PERMISSIONS.attendanceRead),
    async (req: Request, res: Response) => {
      try {
        const data = await service().getDeviceDetail(
          actorFrom(req),
          req.params.deviceId,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/test',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesManage),
    async (req: Request, res: Response) => {
      try {
        const data = await service().testDeviceConnectivity(
          actorFrom(req),
          req.params.deviceId,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/suspend',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesSuspend),
    async (req: Request, res: Response) => {
      try {
        const data = await service().suspendDevice(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/reactivate',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesActivate),
    async (req: Request, res: Response) => {
      try {
        const data = await service().reactivateDevice(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/revoke',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesRevoke),
    async (req: Request, res: Response) => {
      try {
        const data = await service().revokeDevice(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/decommission',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesRevoke),
    async (req: Request, res: Response) => {
      try {
        const data = await service().decommissionDevice(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/reassign-location',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesManage),
    async (req: Request, res: Response) => {
      try {
        const data = await service().reassignDeviceLocation(
          actorFrom(req),
          req.params.deviceId,
          { locationId: req.body?.locationId, reason: req.body?.reason },
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/credentials/rotate',
    requireSchoolPermission(PERMISSIONS.attendanceCredentialsManage),
    async (req: Request, res: Response) => {
      try {
        const data = await service().rotateDeviceCredential(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  router.post(
    '/schools/me/attendance/devices/:deviceId/credentials/revoke',
    requireSchoolPermission(PERMISSIONS.attendanceCredentialsManage),
    async (req: Request, res: Response) => {
      try {
        const data = await service().revokeDeviceCredential(
          actorFrom(req),
          req.params.deviceId,
          req.body?.reason,
          requestedSchoolScope(req)
        );
        res.json({ success: true, data });
      } catch (error) {
        sendError(req, res, error);
      }
    }
  );

  return router;
}
