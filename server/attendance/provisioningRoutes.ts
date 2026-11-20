import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import type { AttendanceProvisioningRepository, CreateAttendanceProvisioningRequest } from './attendanceProvisioningRepository';

type AttendanceRequest = Request & { trustedTenantContext?: VerifiedTenantPrincipal; correlationId?: string };

function platformPrincipal(req: Request): VerifiedTenantPrincipal {
  const principal = (req as AttendanceRequest).trustedTenantContext;
  if (!principal) throw new Error('VERIFIED_PLATFORM_PRINCIPAL_REQUIRED');
  return principal;
}

function sendError(req: Request, res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const invalid = [
    'INVALID_ATTENDANCE_PROVISIONING_REQUEST', 'INVALID_DEVICE_MODEL_ID',
    'INVALID_PROVISIONING_REQUEST_ID', 'DEVICE_MODEL_NOT_CATALOGUED_FOR_CATEGORY'
  ].includes(message);
  const conflict = ['IDEMPOTENCY_CONFLICT', 'ATTENDANCE_CAPABILITY_NOT_REQUESTED'].includes(message);
  if (!invalid && !conflict) console.error('Attendance provisioning repository operation failed.');
  res.status(invalid ? 400 : conflict ? 409 : 503).json({
    success: false,
    code: invalid || conflict ? message : 'ATTENDANCE_PROVISIONING_UNAVAILABLE',
    error: invalid ? 'Invalid attendance provisioning request.' :
      conflict ? 'Attendance provisioning request conflicts with current state.' :
        'Attendance provisioning is temporarily unavailable.',
    correlationId: (req as AttendanceRequest).correlationId
  });
}

export function createAttendanceProvisioningRouter(
  requirePlatformAdministrator: RequestHandler,
  repository: () => AttendanceProvisioningRepository
): Router {
  const router = Router();
  router.use(requirePlatformAdministrator);

  router.get('/device-catalogue', async (req, res) => {
    try {
      const data = await repository().listCatalogue(platformPrincipal(req));
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.get('/device-catalogue/:modelId', async (req, res) => {
    try {
      const records = await repository().listCatalogue(platformPrincipal(req), req.params.modelId);
      if (!records[0]) {
        res.status(404).json({ success: false, code: 'DEVICE_MODEL_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: records[0] });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/provisioning-requests', async (req, res) => {
    const body = req.body as { applicationInstanceId?: unknown; request?: CreateAttendanceProvisioningRequest };
    const idempotencyKey = req.get('Idempotency-Key') || '';
    if (!body || typeof body.applicationInstanceId !== 'string' || !body.request ||
        !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      sendError(req, res, new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST'));
      return;
    }
    try {
      const data = await repository().createRequest(
        platformPrincipal(req),
        body.applicationInstanceId,
        body.request,
        idempotencyKey
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.get('/provisioning-requests/:requestId', async (req, res) => {
    try {
      const data = await repository().getRequest(platformPrincipal(req), req.params.requestId);
      if (!data) {
        res.status(404).json({ success: false, code: 'ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  return router;
}
