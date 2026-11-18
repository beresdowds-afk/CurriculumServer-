import type { Request, RequestHandler, Response } from 'express';
import { evaluateProductionCapabilityGate } from './productionCapabilityRegistry';

function productionPersistenceUnavailable(req: Request, res: Response, capabilityId?: string): void {
  res.status(503).json({
    success: false,
    error: 'This operation is unavailable until its production persistence and authorization adapters are configured.',
    code: 'PRODUCTION_PERSISTENCE_UNAVAILABLE',
    ...(capabilityId ? { capabilityId } : {}),
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

export function createProductionCapabilityGateMiddleware(): RequestHandler {
  return (req, res, next) => {
    const decision = evaluateProductionCapabilityGate(req.method, req.path);
    if (decision.allowed) {
      next();
      return;
    }
    productionPersistenceUnavailable(req, res, decision.capabilityId);
  };
}
