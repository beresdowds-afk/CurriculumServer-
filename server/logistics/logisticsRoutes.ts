import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationMiddleware } from '../authorization/middleware';
import { DatabaseFailure, type DatabasePool } from '../db/postgres';
import { LogisticsGpsRepository, LogisticsGpsRepositoryError } from './logisticsGpsRepository';
import { LogisticsError, LogisticsRepository } from './logisticsRepository';

export interface LogisticsCompletionRouterDependencies {
  getPool: () => DatabasePool;
  authorizationMiddleware: Pick<AuthorizationMiddleware, 'requirePermission' | 'activeMembership'>;
  createRepository?: (pool: DatabasePool) => LogisticsRepository;
  createGpsRepository?: (pool: DatabasePool) => LogisticsGpsRepository;
}

function actorFrom(req: Request): AuthorizedPrincipal {
  return (req as any).authorizedPrincipal as AuthorizedPrincipal;
}

function bodyText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function validationFailed(req: Request, res: Response, error: string): void {
  res.status(400).json({
    success: false,
    code: 'VALIDATION_FAILED',
    error,
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

function respondLogisticsError(req: Request, res: Response, error: unknown): void {
  const known = error instanceof LogisticsError;
  const code = known
    ? error.code
    : error instanceof DatabaseFailure
      ? 'DATABASE_UNAVAILABLE'
      : 'LOGISTICS_OPERATION_FAILED';
  const status = known
    ? error.code === 'FORBIDDEN' || error.code === 'FEATURE_DISABLED'
      ? 403
      : error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'CONFLICT'
          ? 409
          : error.code === 'INVALID_INPUT'
            ? 400
            : 503
    : 503;
  res.status(status).json({
    success: false,
    code,
    error: known ? error.message : 'The logistics operation could not be completed.',
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

function respondGpsError(req: Request, res: Response, error: unknown): void {
  const known = error instanceof LogisticsGpsRepositoryError;
  const status = known
    ? error.code === 'FORBIDDEN' || error.code === 'FEATURE_DISABLED'
      ? 403
      : error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'CONFLICT'
          ? 409
          : error.code === 'INVALID_INPUT'
            ? 400
            : 503
    : 503;
  res.status(status).json({
    success: false,
    code: known ? error.code : 'GPS_PROVIDER_UNAVAILABLE',
    error: known && error.code === 'INVALID_INPUT'
      ? 'GPS operation fields are invalid.'
      : 'The configured vehicle telemetry record is unavailable.',
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

export function createLogisticsCompletionRouter(deps: LogisticsCompletionRouterDependencies): Router {
  const router = express.Router();
  const repoFor = () =>
    deps.createRepository ? deps.createRepository(deps.getPool()) : new LogisticsRepository(deps.getPool());
  const gpsFor = () =>
    deps.createGpsRepository ? deps.createGpsRepository(deps.getPool()) : new LogisticsGpsRepository(deps.getPool(), null);

  const requireAny = (...permissions: string[]) => (req: Request, res: Response, next: NextFunction) => {
    deps.authorizationMiddleware.activeMembership(req, res, () => {
      const actor = actorFrom(req);
      if (permissions.some(permission => actor.hasPermission(permission))) {
        next();
        return;
      }
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        error: 'The required logistics permission is not granted.',
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
    });
  };

  // Guardians & pickup authorizations / passes
  router.get(
    '/logistics/guardians',
    requireAny('logistics.guardians.manage', 'logistics.gate.read', 'logistics.gate.manage'),
    async (req: Request, res: Response) => {
      const status = typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : undefined;
      if (status !== undefined && !['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
        validationFailed(req, res, 'Invalid verificationStatus filter.');
        return;
      }
      try {
        const data = await repoFor().listGuardians(actorFrom(req), {
          ...(status ? { verificationStatus: status as 'pending' | 'verified' | 'rejected' | 'suspended' } : {}),
          page: req.query.page === undefined ? undefined : Number(req.query.page),
          pageSize: req.query.pageSize === undefined ? undefined : Number(req.query.pageSize)
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/guardians',
    deps.authorizationMiddleware.requirePermission('logistics.guardians.manage'),
    async (req: Request, res: Response) => {
      const { fullName, phone, userId, identityReference } = req.body ?? {};
      if (typeof fullName !== 'string' || typeof phone !== 'string' ||
          (userId !== undefined && typeof userId !== 'string') ||
          (identityReference !== undefined && typeof identityReference !== 'string')) {
        validationFailed(req, res, 'Guardian registration fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().createGuardian(actorFrom(req), {
          fullName,
          phone,
          ...(userId ? { userId } : {}),
          ...(identityReference ? { identityReference } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/guardians/:guardianId/verify',
    deps.authorizationMiddleware.requirePermission('logistics.guardians.manage'),
    async (req: Request, res: Response) => {
      const status = req.body?.status;
      if (status !== 'verified' && status !== 'rejected' && status !== 'suspended') {
        validationFailed(req, res, 'Guardian verification status must be verified, rejected, or suspended.');
        return;
      }
      try {
        const data = await repoFor().verifyGuardian(actorFrom(req), {
          guardianId: req.params.guardianId,
          status
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/guardians/:guardianId/students',
    deps.authorizationMiddleware.requirePermission('logistics.guardians.manage'),
    async (req: Request, res: Response) => {
      const { studentId, relationship, startsAt, endsAt } = req.body ?? {};
      if (typeof studentId !== 'string' || typeof relationship !== 'string' ||
          (startsAt !== undefined && typeof startsAt !== 'string') ||
          (endsAt !== undefined && typeof endsAt !== 'string')) {
        validationFailed(req, res, 'Guardian-student link fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().linkGuardianStudent(actorFrom(req), {
          guardianId: req.params.guardianId,
          studentId,
          relationship,
          ...(startsAt ? { startsAt } : {}),
          ...(endsAt ? { endsAt } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/guardian-students/:relationshipId/pickup-authorizations',
    deps.authorizationMiddleware.requirePermission('logistics.guardians.manage'),
    async (req: Request, res: Response) => {
      const { startsAt, endsAt, additionalApprovalRequired } = req.body ?? {};
      if (typeof startsAt !== 'string' || typeof endsAt !== 'string' ||
          (additionalApprovalRequired !== undefined && typeof additionalApprovalRequired !== 'boolean')) {
        validationFailed(req, res, 'Pickup authorization fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().createPickupAuthorization(actorFrom(req), {
          guardianStudentId: req.params.relationshipId,
          startsAt,
          endsAt,
          ...(additionalApprovalRequired !== undefined ? { additionalApprovalRequired } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.get(
    '/logistics/pickup-passes',
    requireAny('logistics.guardians.manage', 'logistics.gate.read', 'logistics.gate.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listPickupPasses(actorFrom(req), {
          page: req.query.page === undefined ? undefined : Number(req.query.page),
          pageSize: req.query.pageSize === undefined ? undefined : Number(req.query.pageSize)
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/pickup-passes/:passId/revoke',
    deps.authorizationMiddleware.requirePermission('logistics.guardians.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().revokePickupPass(actorFrom(req), {
          passId: req.params.passId,
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Gate locations, officer assignments & security incidents
  router.get(
    '/logistics/gate/locations',
    requireAny('logistics.gate.read', 'logistics.gate.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listGateLocations(actorFrom(req));
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/gate/locations',
    deps.authorizationMiddleware.requirePermission('logistics.gate.manage'),
    async (req: Request, res: Response) => {
      if (typeof req.body?.name !== 'string') {
        validationFailed(req, res, 'Gate location name is required.');
        return;
      }
      try {
        const data = await repoFor().createGateLocation(actorFrom(req), {
          name: req.body.name,
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/gate/locations/:gateLocationId/officers',
    deps.authorizationMiddleware.requirePermission('logistics.gate.manage'),
    async (req: Request, res: Response) => {
      const { userId, startsAt, endsAt } = req.body ?? {};
      if (typeof userId !== 'string' ||
          (startsAt !== undefined && typeof startsAt !== 'string') ||
          (endsAt !== undefined && typeof endsAt !== 'string')) {
        validationFailed(req, res, 'Gate officer assignment fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().assignGateOfficer(actorFrom(req), {
          gateLocationId: req.params.gateLocationId,
          userId,
          ...(startsAt ? { startsAt } : {}),
          ...(endsAt ? { endsAt } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.get(
    '/logistics/gate/incidents',
    requireAny('logistics.gate.read', 'logistics.gate.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listSecurityIncidents(actorFrom(req), {
          page: req.query.page === undefined ? undefined : Number(req.query.page),
          pageSize: req.query.pageSize === undefined ? undefined : Number(req.query.pageSize)
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/gate/incidents',
    deps.authorizationMiddleware.requirePermission('logistics.gate.manage'),
    async (req: Request, res: Response) => {
      const { gateEventId, incidentType, description, details } = req.body ?? {};
      if (typeof incidentType !== 'string' || typeof description !== 'string' ||
          (gateEventId !== undefined && typeof gateEventId !== 'string') ||
          (details !== undefined && (typeof details !== 'object' || details === null || Array.isArray(details)))) {
        validationFailed(req, res, 'Security incident fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().recordSecurityIncident(actorFrom(req), {
          ...(gateEventId ? { gateEventId } : {}),
          incidentType,
          description,
          ...(details ? { details } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Exeat cancel & overdue evaluation
  router.post(
    '/logistics/exeats/evaluate-overdue',
    requireAny('logistics.exeat.approve', 'logistics.exeat.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().evaluateOverdueExeats(actorFrom(req));
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/exeats/:exeatId/cancel',
    requireAny('logistics.exeat.request', 'logistics.exeat.approve', 'logistics.exeat.manage'),
    async (req: Request, res: Response) => {
      if (typeof req.body?.reason !== 'string') {
        validationFailed(req, res, 'Cancellation reason is required.');
        return;
      }
      try {
        const data = await repoFor().cancelExeat(actorFrom(req), {
          exeatId: req.params.exeatId,
          reason: req.body.reason,
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Dining entitlements
  router.get(
    '/logistics/dining/entitlements',
    requireAny('logistics.dining.read', 'logistics.dining.manage', 'logistics.dining.entitlement.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listDiningEntitlements(actorFrom(req), {
          ...(typeof req.query.studentId === 'string' ? { studentId: req.query.studentId } : {}),
          ...(typeof req.query.status === 'string' ? { status: req.query.status } : {})
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/dining/entitlements',
    deps.authorizationMiddleware.requirePermission('logistics.dining.entitlement.manage'),
    async (req: Request, res: Response) => {
      const { studentId, mealPeriods, startsOn, endsOn, dietaryProfileReference } = req.body ?? {};
      if (typeof studentId !== 'string' || !Array.isArray(mealPeriods) || typeof startsOn !== 'string' ||
          (endsOn !== undefined && typeof endsOn !== 'string') ||
          (dietaryProfileReference !== undefined && typeof dietaryProfileReference !== 'string')) {
        validationFailed(req, res, 'Dining entitlement fields are invalid.');
        return;
      }
      try {
        const data = await repoFor().grantDiningEntitlement(actorFrom(req), {
          studentId,
          mealPeriods,
          startsOn,
          ...(endsOn ? { endsOn } : {}),
          ...(dietaryProfileReference ? { dietaryProfileReference } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.status(201).json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/dining/entitlements/:entitlementId/revoke',
    deps.authorizationMiddleware.requirePermission('logistics.dining.entitlement.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().revokeDiningEntitlement(actorFrom(req), {
          entitlementId: req.params.entitlementId,
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Transport telemetry read, trip passenger manifest, trip cancel
  router.get(
    '/logistics/transport/vehicles/:vehicleId/telemetry',
    deps.authorizationMiddleware.requirePermission('logistics.gps.read'),
    async (req: Request, res: Response) => {
      try {
        const data = await gpsFor().listVehicleTelemetry(actorFrom(req), req.params.vehicleId);
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondGpsError(req, res, error);
      }
    }
  );

  router.get(
    '/logistics/transport/trips/:tripId/passengers',
    requireAny('logistics.transport.read', 'logistics.transport.manage', 'logistics.transport.passengers.manage'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listTripPassengers(actorFrom(req), req.params.tripId);
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.post(
    '/logistics/transport/trips/:tripId/cancel',
    deps.authorizationMiddleware.requirePermission('logistics.transport.manage'),
    async (req: Request, res: Response) => {
      if (req.body?.reason !== undefined && typeof req.body.reason !== 'string') {
        validationFailed(req, res, 'Trip cancellation reason must be text.');
        return;
      }
      try {
        const data = await repoFor().cancelTrip(actorFrom(req), {
          tripId: req.params.tripId,
          ...(req.body?.reason ? { reason: bodyText(req.body.reason) } : {}),
          idempotencyKey: String(req.headers['idempotency-key'] || '')
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Library publication & usage audit
  router.post(
    '/logistics/library/resources/:resourceId/publication',
    deps.authorizationMiddleware.requirePermission('logistics.library.manage'),
    async (req: Request, res: Response) => {
      const status = req.body?.publicationStatus;
      if (status !== 'pending_review' && status !== 'published' && status !== 'archived') {
        validationFailed(req, res, 'publicationStatus must be pending_review, published, or archived.');
        return;
      }
      try {
        const data = await repoFor().updateLibraryPublicationStatus(actorFrom(req), {
          resourceId: req.params.resourceId,
          publicationStatus: status
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  router.get(
    '/logistics/library/resources/:resourceId/usage',
    requireAny('logistics.library.manage', 'logistics.library.read'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listLibraryUsageEvents(actorFrom(req), {
          resourceId: req.params.resourceId,
          page: req.query.page === undefined ? undefined : Number(req.query.page),
          pageSize: req.query.pageSize === undefined ? undefined : Number(req.query.pageSize)
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  // Logistics immutable audit ledger query
  router.get(
    '/logistics/audit',
    requireAny('logistics.audit.read', 'logistics.configuration.read'),
    async (req: Request, res: Response) => {
      try {
        const data = await repoFor().listAuditEvents(actorFrom(req), {
          ...(typeof req.query.entityType === 'string' ? { entityType: req.query.entityType } : {}),
          ...(typeof req.query.action === 'string' ? { action: req.query.action } : {}),
          page: req.query.page === undefined ? undefined : Number(req.query.page),
          pageSize: req.query.pageSize === undefined ? undefined : Number(req.query.pageSize)
        });
        res.json({ success: true, data, correlationId: (req as any).correlationId, timestamp: new Date().toISOString() });
      } catch (error) {
        respondLogisticsError(req, res, error);
      }
    }
  );

  return router;
}
