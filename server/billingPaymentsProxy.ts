import type { Request, Response } from 'express';

async function serviceIdentityToken(audience: string): Promise<string> {
  let response: globalThis.Response;
  try {
    const metadataUrl = new URL(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity'
    );
    metadataUrl.searchParams.set('audience', audience);
    metadataUrl.searchParams.set('format', 'full');
    response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(3_000)
    });
  } catch {
    throw new Error('Billing service identity is unavailable.');
  }
  if (!response.ok) throw new Error('Billing service identity is unavailable.');
  return response.text();
}

export async function proxyBillingPaymentsRequest(
  req: Request,
  res: Response,
  targetPath: string,
  bodyOverride?: Buffer
): Promise<void> {
  const serviceUrl = process.env.BILLING_PAYMENTS_SERVICE_URL?.trim();
  if (!serviceUrl) {
    res.status(503).json({
      success: false,
      code: 'BILLING_PAYMENTS_UNAVAILABLE',
      error: 'The internal billing-payments service is not configured.',
      correlationId: (req as any).correlationId
    });
    return;
  }
  let base: URL;
  try {
    base = new URL(serviceUrl);
  } catch {
    res.status(503).json({ success: false, code: 'BILLING_PAYMENTS_UNAVAILABLE', error: 'The internal billing-payments service URL is invalid.' });
    return;
  }
  if (base.protocol !== 'https:' || base.username || base.password) {
    res.status(503).json({ success: false, code: 'BILLING_PAYMENTS_UNAVAILABLE', error: 'The internal billing-payments service URL must use HTTPS.' });
    return;
  }
  const target = new URL(targetPath, base);
  if (target.origin !== base.origin) {
    res.status(400).json({ success: false, code: 'INVALID_BILLING_ROUTE', error: 'Invalid billing route.' });
    return;
  }
  try {
    const identity = await serviceIdentityToken(base.origin);
    const headers: Record<string, string> = {
      'X-Serverless-Authorization': `Bearer ${identity}`,
      'X-Correlation-ID': String(req.headers['x-correlation-id'] || (req as any).correlationId || ''),
      Accept: 'application/json'
    };
    if (typeof req.headers.authorization === 'string') {
      headers.Authorization = req.headers.authorization;
    }
    if (typeof req.headers['idempotency-key'] === 'string') {
      headers['Idempotency-Key'] = req.headers['idempotency-key'];
    }
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') headers['Content-Type'] = contentType;
    const body = bodyOverride ?? (
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(JSON.stringify(req.body ?? {}))
    );
    const response = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(15_000)
    });
    const responseBody = await response.text();
    res.status(response.status);
    res.type(response.headers.get('content-type') || 'application/json').send(responseBody);
  } catch {
    res.status(503).json({
      success: false,
      code: 'BILLING_PAYMENTS_UNAVAILABLE',
      error: 'The internal billing-payments service could not be reached.',
      correlationId: (req as any).correlationId
    });
  }
}
