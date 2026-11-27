import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import type {
  AttendanceProvisioningRepository,
  CreateAttendanceProvisioningRequest,
  DeviceCatalogueModelInput,
  ProvisioningExecutionStepEvidence,
  RegisterAdapterInput
} from './attendanceProvisioningRepository';
import type { AttendanceProvisioningState } from './provisioningWorkflow';

type AttendanceRequest = Request & { trustedTenantContext?: VerifiedTenantPrincipal; correlationId?: string };

function platformPrincipal(req: Request): VerifiedTenantPrincipal {
  const principal = (req as AttendanceRequest).trustedTenantContext;
  if (!principal) throw new Error('VERIFIED_PLATFORM_PRINCIPAL_REQUIRED');
  return principal;
}

function sendError(req: Request, res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : '';
  const notFound = [
    'ATTENDANCE_PROVISIONING_REQUEST_NOT_FOUND',
    'DEVICE_MODEL_NOT_FOUND',
    'ADAPTER_NOT_FOUND'
  ].includes(message);
  const invalid = [
    'INVALID_ATTENDANCE_PROVISIONING_REQUEST',
    'INVALID_ATTENDANCE_PROVISIONING_TRANSITION',
    'INVALID_DEVICE_MODEL_ID',
    'INVALID_PROVISIONING_REQUEST_ID',
    'DEVICE_MODEL_NOT_CATALOGUED_FOR_CATEGORY',
    'INVALID_CATALOGUE_MODEL_INPUT',
    'INVALID_VERIFICATION_STATUS',
    'INVALID_ADAPTER_REGISTRATION',
    'INVALID_ADAPTER_IDENTIFIER',
    'INVALID_PROVISIONING_STEP_RESULT',
    'ADAPTER_VERIFICATION_EVIDENCE_REQUIRED',
    'SIMULATOR_CANNOT_BE_PRODUCTION_VERIFIED',
    'UNVERIFIED_HARDWARE_ADAPTER',
    'ADAPTER_NOT_REGISTERED'
  ].includes(message);
  const conflict = [
    'IDEMPOTENCY_CONFLICT',
    'ATTENDANCE_CAPABILITY_NOT_REQUESTED',
    'ATTENDANCE_PROVISIONING_STATE_CONFLICT',
    'ATTENDANCE_PROVISIONING_TERMINAL_STATE',
    'PROVISIONING_COMPATIBILITY_CHECK_REQUIRED',
    'PROVISIONING_STEP_OUT_OF_ORDER',
    'PROVISIONING_RETRY_LIMIT_EXCEEDED',
    'NON_RETRYABLE_PROVISIONING_FAILURE',
    'ATTENDANCE_DEVICE_ACTIVATION_PREREQUISITES_UNMET',
    'ADAPTER_NOT_VERIFIED',
    'TENANT_MEMBERSHIP_REQUIRED_FOR_DEVICE_OWNERSHIP'
  ].includes(message);

  if (!notFound && !invalid && !conflict) {
    console.error('Attendance provisioning repository operation failed.');
  }
  const status = notFound ? 404 : invalid ? 400 : conflict ? 409 : 503;
  res.status(status).json({
    success: false,
    code: notFound || invalid || conflict ? message : 'ATTENDANCE_PROVISIONING_UNAVAILABLE',
    error: notFound
      ? 'Attendance provisioning resource was not found.'
      : invalid
        ? 'Invalid attendance provisioning request.'
        : conflict
          ? 'Attendance provisioning request conflicts with current state or verification rules.'
          : 'Attendance provisioning is temporarily unavailable.',
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

  router.post('/device-catalogue', async (req, res) => {
    try {
      const data = await repository().createCatalogueModel(
        platformPrincipal(req),
        req.body as DeviceCatalogueModelInput
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.patch('/device-catalogue/:modelId', async (req, res) => {
    try {
      const data = await repository().updateCatalogueModel(
        platformPrincipal(req),
        req.params.modelId,
        req.body as Partial<DeviceCatalogueModelInput> & { reason?: string }
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/device-catalogue/:modelId/enable', async (req, res) => {
    try {
      const data = await repository().setCatalogueModelEnabled(
        platformPrincipal(req),
        req.params.modelId,
        true,
        typeof req.body?.reason === 'string' ? req.body.reason : undefined
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/device-catalogue/:modelId/disable', async (req, res) => {
    try {
      const data = await repository().setCatalogueModelEnabled(
        platformPrincipal(req),
        req.params.modelId,
        false,
        typeof req.body?.reason === 'string' ? req.body.reason : undefined
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/adapters', async (req, res) => {
    try {
      const data = await repository().registerAdapter(
        platformPrincipal(req),
        req.body as RegisterAdapterInput
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/adapters/:adapterId/versions/:adapterVersion/verify', async (req, res) => {
    try {
      const data = await repository().verifyAdapter(
        platformPrincipal(req),
        req.params.adapterId,
        req.params.adapterVersion,
        req.body
      );
      res.json({ success: true, data });
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

  router.post('/provisioning-requests/:requestId/validate', async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key') || '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      sendError(req, res, new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST'));
      return;
    }
    try {
      const firmwareVersion = typeof req.body?.firmwareVersion === 'string' ? req.body.firmwareVersion : undefined;
      const data = await repository().validateProvisioningRequest(
        platformPrincipal(req),
        req.params.requestId,
        idempotencyKey,
        firmwareVersion
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/provisioning-requests/:requestId/execute', async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key') || '';
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      sendError(req, res, new Error('INVALID_ATTENDANCE_PROVISIONING_REQUEST'));
      return;
    }
    try {
      const evidence = (req.body && typeof req.body === 'object' ? req.body.evidence ?? {} : {}) as ProvisioningExecutionStepEvidence;
      const data = await repository().executeProvisioningRequest(
        platformPrincipal(req),
        req.params.requestId,
        evidence,
        idempotencyKey
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  router.post('/provisioning-requests/:requestId/retry', async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key') || '';
    const targetState = req.body?.targetState as AttendanceProvisioningState | undefined;
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey) || typeof targetState !== 'string') {
      sendError(req, res, new Error('INVALID_ATTENDANCE_PROVISIONING_TRANSITION'));
      return;
    }
    try {
      const data = await repository().retryProvisioningRequest(
        platformPrincipal(req),
        req.params.requestId,
        targetState,
        idempotencyKey
      );
      res.json({ success: true, data });
    } catch (error) {
      sendError(req, res, error);
    }
  });

  return router;
}
