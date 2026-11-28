import express, { type Request, type Response, type Router } from 'express';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { AuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import type { DatabasePool } from './postgres';
import { SchoolFinancePolicies, SchoolFinancePolicyError } from './schoolFinancePolicies';
import {
  SchoolSettlementAccounts,
  SettlementCallbackSignatureError
} from './schoolSettlementAccounts';
import { SettlementProviderError } from './settlementProviderAdapters';

function sendFinanceError(res: Response, error: unknown): void {
  if (error instanceof SchoolFinancePolicyError) {
    const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'CONFLICT' ? 409 : 400;
    res.status(status).json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof SettlementCallbackSignatureError) {
    res.status(401).json({ success: false, code: 'INVALID_SIGNATURE', error: error.message });
    return;
  }
  if (error instanceof SettlementProviderError) {
    const status =
      error.code === 'PROVIDER_NOT_CONFIGURED' || error.code === 'PROVIDER_UNAVAILABLE'
        ? 503
        : 422;
    res.status(status).json({ success: false, code: error.code, error: error.message });
    return;
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Permission denied.' });
    return;
  }
  console.error('School finance operation failed.', error);
  res.status(503).json({
    success: false,
    code: 'SCHOOL_FINANCE_UNAVAILABLE',
    error: 'School finance workflow is temporarily unavailable.'
  });
}

function actorFrom(req: Request): AuthorizedPrincipal {
  return (req as any).authorizedPrincipal;
}

export interface SchoolFinanceRouterDependencies {
  getPool: () => DatabasePool;
  authorizationMiddleware: Pick<AuthorizationMiddleware, 'requirePermission'>;
  createFeePoliciesService?: (pool: DatabasePool) => SchoolFinancePolicies;
  createSettlementService?: (pool: DatabasePool) => SchoolSettlementAccounts;
  cmagHooks?: {
    emitTenantWorkflowNotification: (event: {
      tenantId: string;
      category: 'fees';
      purpose: string;
      guardianId?: string;
      toPhone?: string;
      message: string;
      idempotencyKey?: string;
      actorSubject: string;
    }) => Promise<unknown>;
  };
}

export function createSchoolFinanceRouter(deps: SchoolFinanceRouterDependencies): Router {
  const router = express.Router();
  const policiesFor = () =>
    deps.createFeePoliciesService
      ? deps.createFeePoliciesService(deps.getPool())
      : new SchoolFinancePolicies(deps.getPool());
  const settlementFor = () =>
    deps.createSettlementService
      ? deps.createSettlementService(deps.getPool())
      : new SchoolSettlementAccounts(deps.getPool());

  router.get(
    '/school-finance/schools',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesRead),
    async (req: Request, res: Response) => {
      try {
        const data = await policiesFor().listSchools(actorFrom(req));
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/fee-policies',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesRead),
    async (req: Request, res: Response) => {
      try {
        const asOfDate = typeof req.query.asOfDate === 'string' ? req.query.asOfDate : undefined;
        const data = await policiesFor().list(actorFrom(req), req.params.schoolId, asOfDate);
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/fee-policies/effective',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesRead),
    async (req: Request, res: Response) => {
      try {
        const data = await policiesFor().resolveEffectivePolicy(actorFrom(req), req.params.schoolId, {
          academicSession: req.query.academicSession,
          term: req.query.term,
          asOfDate: req.query.asOfDate
        });
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/fee-policies',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesCreate),
    async (req: Request, res: Response) => {
      try {
        const id = await policiesFor().create(actorFrom(req), req.params.schoolId, req.body);
        res.status(201).json({ success: true, data: { id } });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/fee-policies/:policyId/approve',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesApprove),
    async (req: Request, res: Response) => {
      try {
        await policiesFor().approve(actorFrom(req), req.params.schoolId, req.params.policyId);
        if (deps.cmagHooks && typeof req.body?.notifyPhone === 'string' && req.body.notifyPhone.trim()) {
          void deps.cmagHooks.emitTenantWorkflowNotification({
            tenantId: actorFrom(req).tenantId,
            category: 'fees',
            purpose: 'fee_policy_approved',
            toPhone: req.body.notifyPhone.trim(),
            message: `Fee policy ${req.params.policyId} has been approved for school ${req.params.schoolId}.`,
            idempotencyKey: `fee-policy-approve:${req.params.policyId}`,
            actorSubject: actorFrom(req).userId
          }).catch(() => {});
        }
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/fee-policies/:policyId/supersede',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinancePoliciesApprove),
    async (req: Request, res: Response) => {
      try {
        await policiesFor().supersede(actorFrom(req), req.params.schoolId, req.params.policyId, req.body);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/settlement-accounts',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementRead),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const data = await settlementFor().list(actorFrom(req), req.params.schoolId);
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/settlement-accounts/active',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementRead),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const data = await settlementFor().getActiveSettlementAccount(actorFrom(req), req.params.schoolId);
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementRead),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const data = await settlementFor().details(actorFrom(req), req.params.schoolId, req.params.requestId);
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.get(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/events',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementRead),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const data = await settlementFor().events(actorFrom(req), req.params.schoolId, req.params.requestId);
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementRequest),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const id = await settlementFor().request(actorFrom(req), req.params.schoolId, req.body);
        res.status(201).json({ success: true, data: { id } });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/approve',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().approve(actorFrom(req), req.params.schoolId, req.params.requestId);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/reject',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().reject(actorFrom(req), req.params.schoolId, req.params.requestId, req.body);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/verify',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementVerify),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const idempotencyHeader = req.headers['idempotency-key'];
        const idempotencyKey = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader;
        const data = await settlementFor().verify(
          actorFrom(req),
          req.params.schoolId,
          req.params.requestId,
          idempotencyKey
        );
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/activate',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().activate(actorFrom(req), req.params.schoolId, req.params.requestId);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/suspend',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().suspend(actorFrom(req), req.params.schoolId, req.params.requestId, req.body);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/revoke',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().revoke(actorFrom(req), req.params.schoolId, req.params.requestId, req.body);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/replace',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementApprove),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        await settlementFor().replace(actorFrom(req), req.params.schoolId, req.params.requestId, req.body);
        res.json({ success: true });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  router.post(
    '/school-finance/schools/:schoolId/settlement-accounts/:requestId/verification-callback',
    deps.authorizationMiddleware.requirePermission(PERMISSIONS.schoolFinanceSettlementVerify),
    async (req: Request, res: Response) => {
      res.set('Cache-Control', 'no-store');
      try {
        const rawBody: Buffer = Buffer.isBuffer((req as any).rawBody)
          ? (req as any).rawBody
          : Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
        const idempotencyHeader = req.headers['idempotency-key'];
        const idempotencyKey = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader;
        const data = await settlementFor().handleVerificationCallback(
          actorFrom(req),
          req.params.schoolId,
          req.params.requestId,
          {
            rawBody,
            headers: req.headers,
            payload: req.body,
            idempotencyKey
          }
        );
        res.json({ success: true, data });
      } catch (error) {
        sendFinanceError(res, error);
      }
    }
  );

  return router;
}
