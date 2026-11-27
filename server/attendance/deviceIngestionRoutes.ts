import express, { type Request, type Response, type Router } from 'express';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabasePool } from '../db/postgres';
import {
  AttendanceDeviceIngestionService,
  AttendanceIngestionError,
  mapAttendanceError,
  type DeviceRequestAuthInput
} from './deviceIngestionService';

export interface AttendanceDeviceIngestionRouterDeps {
  getPool: () => DatabasePool;
  authorizationMiddleware: Pick<AuthorizationMiddleware, 'requirePermission'> &
    Partial<Pick<AuthorizationMiddleware, 'requirePermissionWithinScopes'>>;
  createService?: (pool: DatabasePool) => AttendanceDeviceIngestionService;
}

function actorFrom(req: Request): AuthorizedPrincipal {
  return (req as any).authorizedPrincipal;
}

function extractDeviceAuth(req: Request): DeviceRequestAuthInput {
  const pathWithoutQuery = (req.originalUrl || req.path || '').split('?')[0];
  const rawBody = Buffer.isBuffer((req as any).rawBody)
    ? (req as any).rawBody
    : typeof req.body === 'string'
      ? req.body
      : Buffer.alloc(0);

  return {
    deviceIdentity: (req.get('X-Device-Identity') || '').trim(),
    timestamp: (req.get('X-Device-Timestamp') || '').trim(),
    nonce: (req.get('X-Device-Nonce') || '').trim(),
    signature: (req.get('X-Device-Signature') || '').trim().toLowerCase(),
    method: req.method.toUpperCase(),
    path: pathWithoutQuery,
    rawBody
  };
}

function resolveSchoolScope(req: Request): string | undefined {
  const querySchool = typeof req.query.schoolId === 'string' && req.query.schoolId.trim()
    ? req.query.schoolId.trim()
    : undefined;
  const headerSchool = req.get('X-School-ID')?.trim() || undefined;
  const bodySchool = req.body && typeof req.body === 'object' && typeof req.body.schoolId === 'string' && req.body.schoolId.trim()
    ? req.body.schoolId.trim()
    : undefined;

  const distinct = [...new Set([querySchool, headerSchool, bodySchool].filter((v): v is string => Boolean(v)))];
  if (distinct.length > 1) {
    throw new AttendanceIngestionError(
      'CONFLICTING_SCHOOL_SCOPE',
      'Conflicting school identifiers were supplied.',
      400
    );
  }
  return distinct[0];
}

export function createAttendanceDeviceIngestionRouter(
  deps: AttendanceDeviceIngestionRouterDeps
): Router {
  const router = express.Router();
  const service = () => deps.createService
    ? deps.createService(deps.getPool())
    : new AttendanceDeviceIngestionService(deps.getPool());
  const requireSchoolPermission = (permission: string) =>
    deps.authorizationMiddleware.requirePermissionWithinScopes
      ? deps.authorizationMiddleware.requirePermissionWithinScopes(permission, ['school'])
      : deps.authorizationMiddleware.requirePermission(permission);

  const handleError = (req: Request, res: Response, error: unknown) => {
    const mapped = mapAttendanceError({ correlationId: (req as any).correlationId }, error);
    res.status(mapped.status).json(mapped.body);
  };

  // Device HMAC-authenticated endpoints (pre-tenant gateway; NO client-supplied tenant header trusted)
  router.post('/attendance/device-events', async (req: Request, res: Response) => {
    try {
      const outcome = await service().ingestSingleEvent(extractDeviceAuth(req), req.body);
      res.status(outcome.httpStatus).json({ success: outcome.success, data: outcome });
    } catch (error) {
      handleError(req, res, error);
    }
  });

  router.post('/attendance/device-events/batch', async (req: Request, res: Response) => {
    try {
      const data = await service().ingestBatchEvents(extractDeviceAuth(req), req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      handleError(req, res, error);
    }
  });

  router.post('/attendance/heartbeat', async (req: Request, res: Response) => {
    try {
      const data = await service().recordHeartbeat(extractDeviceAuth(req), req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      handleError(req, res, error);
    }
  });

  // Supports both signed device acknowledgement (X-Device-Identity + HMAC) and school-admin confirmation
  const manageGuard = requireSchoolPermission(PERMISSIONS.attendanceDevicesManage);
  router.post('/attendance/enrollment-ack', async (req: Request, res: Response) => {
    const hasDeviceHeaders = Boolean(req.get('X-Device-Identity')?.trim());
    if (hasDeviceHeaders) {
      try {
        const data = await service().acknowledgeDeviceEnrollmentByDevice(extractDeviceAuth(req), req.body);
        res.status(200).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
      return;
    }

    manageGuard(req, res, () => {
      void (async () => {
        try {
          const schoolId = resolveSchoolScope(req);
          const data = await service().acknowledgeDeviceEnrollmentByUser(actorFrom(req), {
            ...(req.body && typeof req.body === 'object' ? req.body : {}),
            ...(schoolId ? { schoolId } : {})
          });
          res.status(200).json({ success: true, data });
        } catch (error) {
          handleError(req, res, error);
        }
      })();
    });
  });

  // School-scoped user-authenticated registration, enrollment, register query, sync status, and adjustments
  router.post(
    '/attendance/devices',
    requireSchoolPermission(PERMISSIONS.attendanceDevicesManage),
    async (req: Request, res: Response) => {
      try {
        const schoolId = resolveSchoolScope(req);
        const data = await service().registerSchoolDeviceRequest(actorFrom(req), {
          ...(req.body && typeof req.body === 'object' ? req.body : {}),
          ...(schoolId ? { schoolId } : {})
        });
        res.status(201).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
    }
  );

  router.post(
    '/attendance/credentials',
    requireSchoolPermission(PERMISSIONS.attendanceCredentialsManage),
    async (req: Request, res: Response) => {
      try {
        const schoolId = resolveSchoolScope(req);
        const data = await service().enrollPersonCredential(actorFrom(req), {
          ...(req.body && typeof req.body === 'object' ? req.body : {}),
          ...(schoolId ? { schoolId } : {})
        });
        res.status(201).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
    }
  );

  router.get(
    '/attendance/register',
    requireSchoolPermission(PERMISSIONS.attendanceRead),
    async (req: Request, res: Response) => {
      try {
        const schoolId = resolveSchoolScope(req);
        const data = await service().getAttendanceRegister(actorFrom(req), {
          schoolId,
          date: typeof req.query.date === 'string' ? req.query.date : undefined,
          classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
          population: typeof req.query.population === 'string' ? req.query.population : undefined,
          attendanceType: typeof req.query.attendanceType === 'string' ? req.query.attendanceType : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined
        });
        res.status(200).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
    }
  );

  router.get(
    '/attendance/sync-status',
    requireSchoolPermission(PERMISSIONS.attendanceRead),
    async (req: Request, res: Response) => {
      try {
        const schoolId = resolveSchoolScope(req);
        const data = await service().getSyncStatus(actorFrom(req), schoolId);
        res.status(200).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
    }
  );

  router.patch(
    '/attendance/records/:recordId/adjustments',
    requireSchoolPermission(PERMISSIONS.attendanceAdjust),
    async (req: Request, res: Response) => {
      try {
        const schoolId = resolveSchoolScope(req);
        const data = await service().adjustAttendanceRecord(actorFrom(req), req.params.recordId, {
          status: req.body?.status,
          reason: req.body?.reason,
          schoolId
        });
        res.status(200).json({ success: true, data });
      } catch (error) {
        handleError(req, res, error);
      }
    }
  );

  return router;
}
