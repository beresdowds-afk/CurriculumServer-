import type { Request, RequestHandler, Response } from 'express';
import {
  evaluateProductionCapabilityGate,
  LEGACY_API_CAPABILITIES,
  type CapabilityRegistration
} from './productionCapabilityRegistry';

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

export function createProductionCapabilityGateMiddleware(
  resolvePath: (path: string) => string = path => path,
  registry?: readonly CapabilityRegistration[]
): RequestHandler {
  return (req, res, next) => {
    const decision = evaluateProductionCapabilityGate(req.method, resolvePath(req.path), registry);
    if (decision.allowed) {
      next();
      return;
    }
    productionPersistenceUnavailable(req, res, decision.capabilityId);
  };
}

export function createApiCapabilityGateMiddleware(): RequestHandler {
  const versioned = createProductionCapabilityGateMiddleware(path => path.slice(3) || '/');
  const legacy = createProductionCapabilityGateMiddleware(path => path, LEGACY_API_CAPABILITIES);
  return (req, res, next) => {
    return (/^\/v1(?:\/|$)/i.test(req.path) ? versioned : legacy)(req, res, next);
  };
}
