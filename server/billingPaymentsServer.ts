import { createHash, randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AuthorizationRepository } from './authorization/authorizationRepository';
import { createAuthorizationMiddleware } from './authorization/middleware';
import { postgresRuntime, type DatabaseClient } from './db/postgres';
import {
  createVerifiedTenantPrincipal,
  withControlPlaneTransaction,
  withTenantTransaction
} from './db/tenantContext';
import { isPlatformAdminEmail, hasSecureControlPlaneSecret } from './schoolProvisioning';
import { ServerTenantTokenService, isPlatformAdminTokenContext } from './tenantTokenService';
import {
  initializeProviderPayment,
  normalizeProviderWebhook,
  ProviderIntegrationError,
  refundProviderPayment,
  verifyProviderPayment,
  verifyProviderWebhookSignature,
  type BillingPaymentProvider,
  type VerifiedProviderPayment
} from './billingPaymentsProviders';
import { createSlidingWindowRateLimiter } from './sharedServices/rateLimiter';

const PROVIDERS = new Set<BillingPaymentProvider>([
  'paystack', 'flutterwave', 'opay', 'interswitch', 'bank_transfer'
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MONEY_MINOR = Number.MAX_SAFE_INTEGER;

interface TenantRequest extends Request {
  trustedTenantContext?: ReturnType<typeof createVerifiedTenantPrincipal>;
  verifiedToken?: ReturnType<typeof ServerTenantTokenService.verifyTenantToken>;
  tenantContext?: ReturnType<typeof ServerTenantTokenService.verifyTenantToken>['context'];
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  invoice_id: string;
  provider: BillingPaymentProvider;
  reference: string;
  provider_transaction_id: string | null;
  amount_minor: string;
  currency: string;
  status: string;
  checkout_url: string | null;
  invoice_number?: string;
}

function providerFrom(value: unknown): BillingPaymentProvider | undefined {
  return typeof value === 'string' && PROVIDERS.has(value as BillingPaymentProvider)
    ? value as BillingPaymentProvider
    : undefined;
}

function safeError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof ProviderIntegrationError) {
    const status = error.code === 'PROVIDER_NOT_CONFIGURED' ? 503 :
      error.code === 'PROVIDER_UNAVAILABLE' ? 502 : 422;
    return { status, code: error.code, message: error.message };
  }
  return { status: 500, code: 'BILLING_OPERATION_FAILED', message: 'The billing operation could not be completed.' };
}

function respondError(res: Response, error: unknown): void {
  const safe = safeError(error);
  res.status(safe.status).json({ success: false, code: safe.code, error: safe.message });
}

function tenantPrincipal(req: TenantRequest) {
  if (req.trustedTenantContext) return req.trustedTenantContext;
  if (!req.verifiedToken) throw new Error('Verified tenant context is unavailable.');
  const principal = createVerifiedTenantPrincipal(req.verifiedToken);
  req.trustedTenantContext = principal;
  return principal;
}

function serviceControlPlanePrincipal() {
  const now = Math.floor(Date.now() / 1000);
  return createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId: 'platform-control-plane',
      appId: 'billing-payments-runtime',
      schoolName: 'Billing Payments Service',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: 'platform-control-plane',
      role: 'super_admin',
      issuedAt: now,
      expiresAt: now + 60,
      tokenSignature: '',
      permissions: ['control_plane']
    }
  });
}

function auditHash(record: {
  auditReference: string;
  tenantId: string;
  actorId?: string;
  action: string;
  resourceId: string;
  correlationId: string;
  previousHash: string;
}): string {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

async function writeAuditEvent(
  client: DatabaseClient,
  input: {
    tenantId: string;
    actorId?: string;
    action: string;
    resourceId: string;
    correlationId: string;
  }
): Promise<string> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('billing.audit_events'))`);
  const previous = await client.query<{ entry_hash: string }>(
    'SELECT entry_hash FROM billing.audit_events ORDER BY sequence_number DESC LIMIT 1'
  );
  const auditReference = randomUUID();
  const previousHash = previous.rows[0]?.entry_hash || '0'.repeat(64);
  const record = {
    auditReference,
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: input.action,
    resourceId: input.resourceId,
    correlationId: input.correlationId,
    previousHash
  };
  const entryHash = auditHash(record);
  await client.query(
    `INSERT INTO billing.audit_events
       (audit_reference, tenant_id, actor_id, action, resource_id, correlation_id, previous_hash, entry_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [auditReference, input.tenantId, input.actorId ?? null, input.action,
      input.resourceId, input.correlationId, previousHash, entryHash]
  );
  return auditReference;
}

async function updateFromVerifiedPayment(
  tenantId: string,
  transactionId: string,
  verified: VerifiedProviderPayment,
  source: 'provider_api' | 'authenticated_webhook',
  correlationId: string,
  actorId?: string
): Promise<Record<string, unknown>> {
  const principal = createVerifiedTenantPrincipal({
    valid: true,
    context: {
      tenantId,
      appId: 'billing-payments-runtime',
      schoolName: 'Verified Provider Settlement',
      subscriptionTier: 'platform',
      status: 'ACTIVE',
      databaseName: '',
      storageNamespace: '',
      issuer: 'CurriculumServer-ControlPlane',
      audience: tenantId,
      role: 'tenant_admin',
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      tokenSignature: '',
      permissions: ['billing.payments.settle']
    }
  });
  return withTenantTransaction(postgresRuntime.getPool(), principal, async client => {
    const result = await client.query<PaymentRow & { invoice_number: string }>(
      `SELECT t.*, i.invoice_number
       FROM billing.payment_transactions t
       JOIN billing.invoices i ON i.tenant_id = t.tenant_id AND i.id = t.invoice_id
       WHERE t.id = $1 AND t.tenant_id = $2
       FOR UPDATE OF t`,
      [transactionId, tenantId]
    );
    const payment = result.rows[0];
    if (!payment) throw new Error('Payment not found.');
    if (payment.reference !== verified.reference ||
        Number(payment.amount_minor) !== verified.amountMinor ||
        payment.currency !== verified.currency) {
      throw new ProviderIntegrationError('Provider settlement does not match the invoice.', 'PROVIDER_REJECTED');
    }
    if (payment.status === 'settled') {
      const receipt = await client.query(
        'SELECT receipt_number, issued_at FROM billing.receipts WHERE tenant_id = $1 AND transaction_id = $2',
        [tenantId, transactionId]
      );
      return { alreadyProcessed: true, payment, receipt: receipt.rows[0] };
    }
    if (verified.status === 'pending') {
      return { alreadyProcessed: false, payment, status: 'pending' };
    }
    if (verified.status === 'failed') {
      await client.query(
        `UPDATE billing.payment_transactions
         SET status = 'failed', provider_transaction_id = $3, provider_status = $4, updated_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, transactionId, verified.providerTransactionId, verified.providerStatus]
      );
      const auditReference = await writeAuditEvent(client, {
        tenantId, actorId, action: 'payment_failed', resourceId: transactionId, correlationId
      });
      return { alreadyProcessed: false, status: 'failed', auditReference };
    }
    if (!verified.settlementId) {
      throw new ProviderIntegrationError('Provider settlement identifier is missing.', 'PROVIDER_REJECTED');
    }
    const auditReference = await writeAuditEvent(client, {
      tenantId, actorId, action: 'payment_settled', resourceId: transactionId, correlationId
    });
    await client.query(
      `UPDATE billing.payment_transactions
       SET status = 'settled', provider_transaction_id = $3, provider_status = $4,
           settled_at = now(), updated_at = now(), audit_reference = $5
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, transactionId, verified.providerTransactionId, verified.providerStatus, auditReference]
    );
    await client.query(
      `UPDATE billing.invoices SET status = 'paid'
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, payment.invoice_id]
    );
    await client.query(
      `UPDATE billing.payment_obligations SET status = 'paid', updated_at = now()
       WHERE tenant_id = $1 AND id = (
         SELECT obligation_id FROM billing.invoices WHERE tenant_id = $1 AND id = $2
       )`,
      [tenantId, payment.invoice_id]
    );
    await client.query(
      `INSERT INTO billing.settlement_records
         (tenant_id, transaction_id, provider_settlement_id, amount_minor, currency, verification_source, audit_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, transaction_id) DO NOTHING`,
      [tenantId, transactionId, verified.settlementId, verified.amountMinor,
        verified.currency, source, auditReference]
    );
    await client.query(
      `INSERT INTO billing.financial_ledger
         (tenant_id, transaction_id, entry_type, amount_minor, currency, audit_reference)
       VALUES ($1, $2, 'payment', $3, $4, $5)
       ON CONFLICT (tenant_id, transaction_id, entry_type, audit_reference) DO NOTHING`,
      [tenantId, transactionId, verified.amountMinor, verified.currency, auditReference]
    );
    const receiptNumber = `RCP-${randomUUID().replace(/-/g, '').toUpperCase()}`;
    await client.query(
      `INSERT INTO billing.receipts
         (tenant_id, transaction_id, receipt_number, amount_minor, currency, provider_reference, audit_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, transactionId, receiptNumber, verified.amountMinor,
        verified.currency, verified.reference, auditReference]
    );
    return { alreadyProcessed: false, status: 'settled', receiptNumber, auditReference };
  });
}

function requirePlatformAdministrator(req: TenantRequest, res: Response, next: NextFunction): void {
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization!.slice(7).trim()
    : '';
  if (!token || !hasSecureControlPlaneSecret()) {
    res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Platform administrator authentication is required.' });
    return;
  }
  const verified = ServerTenantTokenService.verifyTenantToken(token);
  const context = verified.context;
  if (!verified.valid || !context || !isPlatformAdminTokenContext(context) ||
      !isPlatformAdminEmail(context.email || '')) {
    res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'Platform administrator authorization is required.' });
    return;
  }
  req.tenantContext = context;
  next();
}

async function googleMetadataAccessToken(): Promise<string> {
  let response: globalThis.Response;
  try {
    response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3_000) }
    );
  } catch {
    throw new Error('Google Cloud Billing credentials are unavailable.');
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok || !body || typeof body !== 'object' ||
      typeof (body as { access_token?: unknown }).access_token !== 'string') {
    throw new Error('Google Cloud Billing credentials are unavailable.');
  }
  return (body as { access_token: string }).access_token;
}

export function createBillingPaymentsApp() {
  const app = express();
  const pool = postgresRuntime.getPool();
  const billingPaymentsRateLimiter = createSlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: Math.max(10, Number(process.env.BILLING_PAYMENTS_RATE_LIMIT_MAX || 120)),
    serviceLabel: 'billing-payments',
    keyGenerator: req => req.ip || 'anonymous'
  });
  app.use('/api/v1/server/payments', billingPaymentsRateLimiter);
  app.use('/api/v1/cloud-billing', billingPaymentsRateLimiter);
  app.use((req, res, next) => {
    const rawWebhook = /^\/api\/v1\/server\/payments\/webhook\/[^/]+$/.test(req.path);
    const parser = rawWebhook
      ? express.raw({ type: 'application/json', limit: '256kb' })
      : express.json({ limit: '256kb' });
    parser(req, res, next);
  });
  const authorization = createAuthorizationMiddleware({
    verifyToken: token => ServerTenantTokenService.verifyTenantToken(token),
    signingConfigured: hasSecureControlPlaneSecret,
    authorization: () => new AuthorizationRepository(pool),
    platformAdministratorAllowed: isPlatformAdminEmail
  });

  app.get('/health', async (_req, res) => {
    const health = await postgresRuntime.healthCheck();
    res.status(health.connectionVerified ? 200 : 503).json({
      success: health.connectionVerified,
      service: 'curriculum-billing-payments',
      database: health.connectionVerified ? 'connected' : 'unavailable'
    });
  });

  app.post(
    '/api/v1/server/payments/initialize',
    authorization.requirePermission('billing.payments.create'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const provider = providerFrom(req.body?.provider);
        const obligationId = typeof req.body?.obligationId === 'string' ? req.body.obligationId : '';
        const email = typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim() : '';
        const emailAtIndex = email.indexOf('@');
        const emailLastDot = email.lastIndexOf('.');
        const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
        if (!provider || provider === 'bank_transfer' || !UUID.test(obligationId) ||
            email.length > 254 || emailAtIndex <= 0 || emailAtIndex !== email.lastIndexOf('@') ||
            emailLastDot <= emailAtIndex + 1 || emailLastDot >= email.length - 1 || /\s/.test(email) ||
            idempotencyKey.length < 8 || idempotencyKey.length > 200) {
          res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'A supported provider, open obligation, customer email, and Idempotency-Key are required.' });
          return;
        }
        const created = await withTenantTransaction(pool, principal, async client => {
          const existing = await client.query<PaymentRow>(
            `SELECT t.*, i.invoice_number
             FROM billing.payment_transactions t
             JOIN billing.invoices i ON i.tenant_id = t.tenant_id AND i.id = t.invoice_id
             WHERE t.tenant_id = $1 AND t.idempotency_key = $2`,
            [principal.tenantId, idempotencyKey]
          );
          if (existing.rows[0]) return { existing: existing.rows[0] };
          const obligation = await client.query<{
            id: string; amount_minor: string; currency: string; purpose: string
          }>(
            `SELECT id, amount_minor, currency, purpose
             FROM billing.payment_obligations
             WHERE tenant_id = $1 AND id = $2 AND status = 'open'
             FOR UPDATE`,
            [principal.tenantId, obligationId]
          );
          if (!obligation.rows[0]) throw new Error('Open payment obligation not found.');
          const reference = `cs_${randomUUID().replace(/-/g, '')}`;
          const invoiceNumber = `INV-${randomUUID().replace(/-/g, '').toUpperCase()}`;
          const invoice = await client.query<{ id: string }>(
            `INSERT INTO billing.invoices (tenant_id, obligation_id, invoice_number, amount_minor, currency, description, due_at)
             VALUES ($1, $2, $3, $4, $5, $6, now() + interval '14 days')
             RETURNING id`,
            [principal.tenantId, obligationId, invoiceNumber, obligation.rows[0].amount_minor,
              obligation.rows[0].currency, obligation.rows[0].purpose]
          );
          const transaction = await client.query<PaymentRow>(
            `INSERT INTO billing.payment_transactions
               (tenant_id, invoice_id, provider, reference, idempotency_key, amount_minor, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [principal.tenantId, invoice.rows[0].id, provider, reference, idempotencyKey,
              obligation.rows[0].amount_minor, obligation.rows[0].currency]
          );
          const auditReference = await writeAuditEvent(client, {
            tenantId: principal.tenantId,
            actorId: req.tenantContext?.userId,
            action: 'invoice_issued',
            resourceId: invoice.rows[0].id,
            correlationId: String(req.headers['x-correlation-id'] || randomUUID())
          });
          await client.query(
            `UPDATE billing.payment_transactions SET audit_reference = $3
             WHERE tenant_id = $1 AND id = $2`,
            [principal.tenantId, transaction.rows[0].id, auditReference]
          );
          return {
            payment: transaction.rows[0],
            invoiceNumber,
            amountMinor: Number(obligation.rows[0].amount_minor),
            currency: obligation.rows[0].currency,
            description: obligation.rows[0].purpose
          };
        });
        if ('existing' in created) {
          if (created.existing.status === 'pending' && created.existing.checkout_url) {
            res.json({
              success: true,
              data: {
                provider: created.existing.provider,
                reference: created.existing.reference,
                authorizationUrl: created.existing.checkout_url,
                invoiceNumber: created.existing.invoice_number,
                amountMinor: Number(created.existing.amount_minor),
                currency: created.existing.currency,
                status: created.existing.status
              }
            });
            return;
          }
          res.status(409).json({ success: false, code: 'IDEMPOTENCY_CONFLICT', error: 'This idempotency key already has a non-retryable payment.' });
          return;
        }
        const redirectUrl = process.env.BILLING_PAYMENTS_RETURN_URL?.trim();
        if (!redirectUrl || new URL(redirectUrl).protocol !== 'https:') {
          throw new ProviderIntegrationError('BILLING_PAYMENTS_RETURN_URL must be an HTTPS URL.', 'PROVIDER_NOT_CONFIGURED');
        }
        let checkout;
        try {
          checkout = await initializeProviderPayment(provider, {
            reference: created.payment.reference,
            amountMinor: created.amountMinor,
            currency: created.currency,
            email,
            description: created.description,
            tenantId: principal.tenantId,
            invoiceNumber: created.invoiceNumber,
            callbackUrl: redirectUrl
          });
        } catch (error) {
          await withTenantTransaction(pool, principal, async client => {
            await client.query(
              `UPDATE billing.payment_transactions
               SET status = 'failed', failure_code = $3, updated_at = now()
               WHERE tenant_id = $1 AND id = $2 AND status = 'pending'`,
              [principal.tenantId, created.payment.id,
                error instanceof ProviderIntegrationError ? error.code : 'PROVIDER_UNAVAILABLE']
            );
            await writeAuditEvent(client, {
              tenantId: principal.tenantId,
              actorId: req.tenantContext?.userId,
              action: 'payment_initialization_failed',
              resourceId: created.payment.id,
              correlationId: String(req.headers['x-correlation-id'] || randomUUID())
            });
          });
          throw error;
        }
        await withTenantTransaction(pool, principal, client => client.query(
          `UPDATE billing.payment_transactions
           SET checkout_url = $3, provider_transaction_id = $4, updated_at = now()
           WHERE tenant_id = $1 AND id = $2 AND status = 'pending'`,
          [principal.tenantId, created.payment.id, checkout.authorizationUrl, checkout.providerTransactionId ?? null]
        ).then(() => undefined));
        res.status(201).json({
          success: true,
          data: {
            provider,
            reference: created.payment.reference,
            authorizationUrl: checkout.authorizationUrl,
            invoiceNumber: created.invoiceNumber,
            amountMinor: created.amountMinor,
            currency: created.currency,
            status: 'pending'
          }
        });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.post(
    '/api/v1/server/payments/verify',
    authorization.requirePermission('billing.payments.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const reference = typeof req.body?.reference === 'string' ? req.body.reference : '';
        const provider = providerFrom(req.body?.provider);
        if (!provider || provider === 'bank_transfer' || !reference) {
          res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'A provider and transaction reference are required.' });
          return;
        }
        const result = await withTenantTransaction(pool, principal, async client => {
          const found = await client.query<PaymentRow>(
            `SELECT * FROM billing.payment_transactions
             WHERE tenant_id = $1 AND provider = $2 AND reference = $3`,
            [principal.tenantId, provider, reference]
          );
          return found.rows[0];
        });
        if (!result) {
          res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', error: 'Payment transaction not found.' });
          return;
        }
        const verified = await verifyProviderPayment(
          provider,
          result.reference,
          Number(result.amount_minor),
          typeof req.body?.providerTransactionId === 'string' ? req.body.providerTransactionId : undefined
        );
        const settled = await updateFromVerifiedPayment(
          principal.tenantId,
          result.id,
          verified,
          'provider_api',
          String(req.headers['x-correlation-id'] || randomUUID()),
          req.tenantContext?.userId
        );
        res.json({ success: true, data: settled });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.post('/api/v1/server/payments/webhook/:provider', async (req, res) => {
    try {
      const provider = providerFrom(req.params.provider);
      if (!provider || !Buffer.isBuffer(req.body) ||
          !verifyProviderWebhookSignature(provider, req.body, req.headers)) {
        res.status(401).json({ success: false, code: 'INVALID_WEBHOOK_SIGNATURE', error: 'Provider callback signature is invalid.' });
        return;
      }
      const payload: unknown = JSON.parse(req.body.toString('utf8'));
      const event = normalizeProviderWebhook(provider, payload);
      if (!event.reference || !event.eventId || !event.providerTransactionId ||
          !Number.isSafeInteger(event.amountMinor) || event.amountMinor <= 0 ||
          event.currency !== 'NGN') {
        res.status(400).json({ success: false, code: 'INVALID_PROVIDER_EVENT', error: 'Provider callback does not contain a valid payment event.' });
        return;
      }
      const lookup = await withControlPlaneTransaction(
        pool,
        serviceControlPlanePrincipal(),
        async client => client.query<PaymentRow>(
          `SELECT id, tenant_id, invoice_id, provider, reference, provider_transaction_id,
                  amount_minor, currency, status, checkout_url
           FROM billing.payment_transactions
           WHERE provider = $1 AND reference = $2
           LIMIT 1`,
          [provider, event.reference]
        )
      );
      const payment = lookup.rows[0];
      if (!payment) {
        res.status(404).json({ success: false, code: 'PAYMENT_NOT_FOUND', error: 'Provider callback reference is not recognized.' });
        return;
      }
      if (Number(payment.amount_minor) !== event.amountMinor || payment.currency !== event.currency) {
        res.status(422).json({ success: false, code: 'PAYMENT_MISMATCH', error: 'Provider callback does not match the recorded payment.' });
        return;
      }
      const principal = createVerifiedTenantPrincipal({
        valid: true,
        context: {
          tenantId: payment.tenant_id,
          appId: 'billing-payments-runtime',
          schoolName: 'Verified Provider Callback',
          subscriptionTier: 'platform',
          status: 'ACTIVE',
          databaseName: '',
          storageNamespace: '',
          issuer: 'CurriculumServer-ControlPlane',
          audience: payment.tenant_id,
          role: 'tenant_admin',
          issuedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 60,
          tokenSignature: '',
          permissions: ['billing.payments.settle']
        }
      });
      const settled = await withTenantTransaction(pool, principal, async client => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO billing.webhook_events
             (provider, provider_event_id, tenant_id, transaction_id, signature_verified, payload_sha256, payload)
           VALUES ($1, $2, $3, $4, true, $5, $6)
           ON CONFLICT (provider, provider_event_id) DO NOTHING
           RETURNING id`,
          [provider, event.eventId, payment.tenant_id, payment.id,
            createHash('sha256').update(req.body).digest('hex'), payload]
        );
        if (!inserted.rowCount) return { alreadyProcessed: true };
        const result = await updateFromVerifiedPayment(
          payment.tenant_id,
          payment.id,
          event,
          'authenticated_webhook',
          String(req.headers['x-correlation-id'] || randomUUID())
        );
        await client.query(
          `UPDATE billing.webhook_events
           SET processed_at = now(), processing_result = $3
           WHERE provider = $1 AND provider_event_id = $2`,
          [provider, event.eventId, event.status === 'pending' ? 'ignored' : event.status]
        );
        return result;
      });
      res.status(200).json({ received: true, processed: true, ...settled });
    } catch (error) {
      respondError(res, error);
    }
  });

  app.post(
    '/api/v1/server/payments/refunds',
    authorization.requirePermission('billing.payments.refund'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const reference = typeof req.body?.reference === 'string' ? req.body.reference : '';
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
        const requestedMinor = Number(req.body?.amountMinor);
        const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
        if (!reference || reason.length < 5 || reason.length > 500 ||
            !Number.isSafeInteger(requestedMinor) || requestedMinor <= 0 ||
            requestedMinor > MONEY_MINOR || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
          res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'Reference, refund amount, reason, and Idempotency-Key are required.' });
          return;
        }
        const refund = await withTenantTransaction(pool, principal, async client => {
          const payment = await client.query<PaymentRow>(
            `SELECT * FROM billing.payment_transactions
             WHERE tenant_id = $1 AND reference = $2
             FOR UPDATE`,
            [principal.tenantId, reference]
          );
          const row = payment.rows[0];
          if (!row || row.status !== 'settled') throw new Error('Only settled payments can be refunded.');
          const prior = await client.query<{ amount_minor: string }>(
            `SELECT coalesce(sum(amount_minor), 0)::text AS amount_minor
             FROM billing.refund_records
             WHERE tenant_id = $1 AND transaction_id = $2 AND status IN ('pending', 'succeeded')`,
            [principal.tenantId, row.id]
          );
          const refundedMinor = Number(prior.rows[0]?.amount_minor || '0');
          if (requestedMinor + refundedMinor > Number(row.amount_minor)) {
            throw new Error('Refund exceeds the remaining settled amount.');
          }
          const created = await client.query<{ id: string }>(
            `INSERT INTO billing.refund_records
               (tenant_id, transaction_id, amount_minor, currency, status, reason, idempotency_key, authorized_by)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
             ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
             RETURNING id`,
            [principal.tenantId, row.id, requestedMinor, row.currency, reason,
              idempotencyKey, req.tenantContext?.userId]
          );
          if (!created.rows[0]) {
            const existing = await client.query(
              `SELECT id, status, provider_refund_id
               FROM billing.refund_records
               WHERE tenant_id = $1 AND idempotency_key = $2`,
              [principal.tenantId, idempotencyKey]
            );
            return { payment: row, existing: existing.rows[0] };
          }
          return { payment: row, refundId: created.rows[0].id };
        });
        if ('existing' in refund) {
          res.json({ success: true, data: refund.existing });
          return;
        }
        let providerRefund;
        try {
          providerRefund = await refundProviderPayment(
            refund.payment.provider,
            refund.payment.provider_transaction_id || '',
            requestedMinor,
            refund.payment.currency,
            reason
          );
        } catch (error) {
          await withTenantTransaction(pool, principal, async client => {
            await client.query(
              `UPDATE billing.refund_records
               SET status = 'failed', updated_at = now()
               WHERE tenant_id = $1 AND id = $2 AND status = 'pending'`,
              [principal.tenantId, refund.refundId]
            );
            await writeAuditEvent(client, {
              tenantId: principal.tenantId,
              actorId: req.tenantContext?.userId,
              action: 'payment_refund_failed',
              resourceId: refund.refundId!,
              correlationId: String(req.headers['x-correlation-id'] || randomUUID())
            });
          });
          throw error;
        }
        const result = await withTenantTransaction(pool, principal, async client => {
          const auditReference = await writeAuditEvent(client, {
            tenantId: principal.tenantId,
            actorId: req.tenantContext?.userId,
            action: 'payment_refund_requested',
            resourceId: refund.refundId!,
            correlationId: String(req.headers['x-correlation-id'] || randomUUID())
          });
          await client.query(
            `UPDATE billing.refund_records
             SET status = 'succeeded', provider_refund_id = $3, audit_reference = $4, updated_at = now()
             WHERE tenant_id = $1 AND id = $2`,
            [principal.tenantId, refund.refundId, providerRefund.providerRefundId, auditReference]
          );
          await client.query(
            `INSERT INTO billing.financial_ledger
               (tenant_id, transaction_id, entry_type, amount_minor, currency, audit_reference)
             VALUES ($1, $2, 'refund', $3, $4, $5)`,
            [principal.tenantId, refund.payment.id, requestedMinor,
              refund.payment.currency, auditReference]
          );
          const totals = await client.query<{ refunded_minor: string }>(
            `SELECT coalesce(sum(amount_minor), 0)::text AS refunded_minor
             FROM billing.refund_records
             WHERE tenant_id = $1 AND transaction_id = $2 AND status = 'succeeded'`,
            [principal.tenantId, refund.payment.id]
          );
          const status = Number(totals.rows[0]?.refunded_minor) >= Number(refund.payment.amount_minor)
            ? 'refunded' : 'partially_refunded';
          await client.query(
            `UPDATE billing.payment_transactions SET status = $3, updated_at = now()
             WHERE tenant_id = $1 AND id = $2`,
            [principal.tenantId, refund.payment.id, status]
          );
          return { id: refund.refundId, status: 'succeeded', providerRefundId: providerRefund.providerRefundId };
        });
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/server/payments/transactions',
    authorization.requirePermission('billing.payments.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const rows = await withTenantTransaction(pool, principal, client => client.query(
          `SELECT id, provider, reference, amount_minor, currency, status, created_at, settled_at
           FROM billing.payment_transactions
           WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [principal.tenantId]
        ));
        res.json({ success: true, data: rows.rows });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/server/payments/reconciliation',
    authorization.requirePermission('billing.payments.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const records = await withTenantTransaction(pool, principal, client => client.query(
          `SELECT s.provider_settlement_id, s.amount_minor, s.currency, s.verification_source,
                  s.verified_at, t.reference, t.provider, t.status
           FROM billing.settlement_records s
           JOIN billing.payment_transactions t ON t.tenant_id = s.tenant_id AND t.id = s.transaction_id
           WHERE s.tenant_id = $1
           ORDER BY s.verified_at DESC LIMIT 100`,
          [principal.tenantId]
        ));
        res.json({ success: true, data: records.rows });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/cloud-billing/usage-reports/:projectId',
    authorization.requirePermission('cloud_billing.costs.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const reports = await withTenantTransaction(pool, principal, client => client.query(
          `SELECT project_id, billing_period, source, report, imported_at
           FROM cloud_billing.usage_reports
           WHERE tenant_id = $1 AND project_id = $2
           ORDER BY billing_period DESC LIMIT 24`,
          [principal.tenantId, req.params.projectId]
        ));
        res.json({ success: true, data: reports.rows });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/server/payments/invoices/:invoiceNumber',
    authorization.requirePermission('billing.payments.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const invoice = await withTenantTransaction(pool, principal, client => client.query(
          `SELECT id, invoice_number, amount_minor, currency, description, status, issued_at, due_at
           FROM billing.invoices WHERE tenant_id = $1 AND invoice_number = $2`,
          [principal.tenantId, req.params.invoiceNumber]
        ));
        if (!invoice.rows[0]) {
          res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', error: 'Invoice not found.' });
          return;
        }
        res.json({ success: true, data: invoice.rows[0] });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/server/payments/receipts/:receiptNumber',
    authorization.requirePermission('billing.payments.read'),
    async (req: TenantRequest, res: Response) => {
      try {
        const principal = tenantPrincipal(req);
        const receipt = await withTenantTransaction(pool, principal, client => client.query(
          `SELECT r.receipt_number, r.amount_minor, r.currency, r.provider_reference, r.issued_at,
                  i.invoice_number, t.provider
           FROM billing.receipts r
           JOIN billing.payment_transactions t ON t.tenant_id = r.tenant_id AND t.id = r.transaction_id
           JOIN billing.invoices i ON i.tenant_id = t.tenant_id AND i.id = t.invoice_id
           WHERE r.tenant_id = $1 AND r.receipt_number = $2`,
          [principal.tenantId, req.params.receiptNumber]
        ));
        if (!receipt.rows[0]) {
          res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', error: 'Receipt not found.' });
          return;
        }
        res.json({ success: true, data: receipt.rows[0] });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.get(
    '/api/v1/cloud-billing/projects/:projectId/billing-info',
    requirePlatformAdministrator,
    async (req, res) => {
      try {
        const projectId = req.params.projectId;
        if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId)) {
          res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'Invalid Google Cloud project ID.' });
          return;
        }
        const token = await googleMetadataAccessToken();
        let response: globalThis.Response;
        try {
          response = await fetch(
            `https://cloudbilling.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/billingInfo`,
            { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }
          );
        } catch {
          throw new Error('Google Cloud Billing API is unavailable.');
        }
        const body: unknown = await response.json().catch(() => undefined);
        if (!response.ok) {
          res.status(response.status === 403 ? 403 : 502).json({
            success: false,
            code: response.status === 403 ? 'CLOUD_BILLING_FORBIDDEN' : 'CLOUD_BILLING_UNAVAILABLE',
            error: response.status === 403
              ? 'The billing-payments runtime has no access to this project billing record.'
              : 'Google Cloud Billing API request failed.'
          });
          return;
        }
        res.json({ success: true, data: body });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.post(
    '/api/v1/cloud-billing/project-association-requests',
    authorization.requirePermission('cloud_billing.association.request'),
    async (req: TenantRequest, res) => {
      try {
        const principal = tenantPrincipal(req);
        const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : '';
        if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) || !UUID.test(req.tenantContext?.userId || '')) {
          res.status(400).json({ success: false, code: 'VALIDATION_FAILED', error: 'A valid project ID is required.' });
          return;
        }
        const result = await withTenantTransaction(pool, principal, client => client.query(
          `INSERT INTO cloud_billing.project_association_requests (tenant_id, project_id, requested_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (tenant_id, project_id, status) DO NOTHING
           RETURNING id, project_id, status, created_at`,
          [principal.tenantId, projectId, req.tenantContext!.userId]
        ));
        res.status(202).json({ success: true, data: result.rows[0] ?? { projectId, status: 'pending' } });
      } catch (error) {
        respondError(res, error);
      }
    }
  );

  app.post('/api/v1/cloud-billing/projects/:projectId/associate', (_req, res) => {
    res.status(403).json({
      success: false,
      code: 'CLOUD_BILLING_OPERATOR_REQUIRED',
      error: 'Project billing association requires an independently authorized cloud-billing-operator operation.'
    });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, code: 'RESOURCE_NOT_FOUND', error: 'Billing endpoint not found.' });
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    respondError(res, error);
  });
  return app;
}

if (process.env.BILLING_PAYMENTS_AUTOSTART === 'true') {
  const port = Number(process.env.PORT) || 8080;
  const app = createBillingPaymentsApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Billing payments backend listening on ${port}.`);
  });
  const shutdown = () => {
    server.close(() => void postgresRuntime.close());
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
