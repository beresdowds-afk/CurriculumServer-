CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS cloud_billing;

CREATE TABLE billing.payment_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (length(trim(purpose)) BETWEEN 1 AND 240),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled', 'overdue')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE TABLE billing.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  obligation_id UUID,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void', 'overdue')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, obligation_id)
    REFERENCES billing.payment_obligations (tenant_id, id)
);

CREATE TABLE billing.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'opay', 'interswitch', 'bank_transfer')),
  reference TEXT NOT NULL,
  provider_transaction_id TEXT,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed', 'partially_refunded', 'refunded')),
  checkout_url TEXT,
  provider_status TEXT,
  failure_code TEXT,
  audit_reference UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  UNIQUE (tenant_id, id),
  UNIQUE (provider, reference),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, invoice_id)
    REFERENCES billing.invoices (tenant_id, id)
);

CREATE INDEX billing_payment_transactions_tenant_status_idx
  ON billing.payment_transactions (tenant_id, status, created_at DESC);

CREATE TABLE billing.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  provider_reference TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_reference UUID NOT NULL,
  UNIQUE (tenant_id, transaction_id),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES billing.payment_transactions (tenant_id, id)
);

CREATE TABLE billing.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'opay', 'interswitch', 'bank_transfer')),
  provider_event_id TEXT NOT NULL,
  tenant_id UUID REFERENCES production.tenants(id) ON DELETE SET NULL,
  transaction_id UUID,
  signature_verified BOOLEAN NOT NULL,
  payload_sha256 CHAR(64) NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_result TEXT CHECK (processing_result IS NULL OR processing_result IN ('settled', 'failed', 'ignored', 'rejected')),
  UNIQUE (provider, provider_event_id),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES billing.payment_transactions (tenant_id, id)
);

CREATE TABLE billing.settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  provider_settlement_id TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_source TEXT NOT NULL CHECK (verification_source IN ('provider_api', 'authenticated_webhook', 'approved_bank_feed')),
  audit_reference UUID NOT NULL,
  UNIQUE (tenant_id, provider_settlement_id),
  UNIQUE (tenant_id, transaction_id),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES billing.payment_transactions (tenant_id, id)
);

CREATE TABLE billing.refund_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  provider_refund_id TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  authorized_by UUID NOT NULL,
  audit_reference UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES billing.payment_transactions (tenant_id, id)
);

CREATE TABLE billing.financial_ledger (
  sequence_number BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('payment', 'refund')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  audit_reference UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, transaction_id, entry_type, audit_reference),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES billing.payment_transactions (tenant_id, id)
);

CREATE TABLE billing.audit_events (
  sequence_number BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  audit_reference UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  resource_id UUID NOT NULL,
  correlation_id TEXT NOT NULL,
  previous_hash CHAR(64) NOT NULL,
  entry_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION billing.reject_immutable_record_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable financial records cannot be modified or deleted';
END;
$$;

CREATE TRIGGER billing_receipts_immutable
  BEFORE UPDATE OR DELETE ON billing.receipts
  FOR EACH ROW EXECUTE FUNCTION billing.reject_immutable_record_mutation();
CREATE TRIGGER billing_ledger_immutable
  BEFORE UPDATE OR DELETE ON billing.financial_ledger
  FOR EACH ROW EXECUTE FUNCTION billing.reject_immutable_record_mutation();
CREATE TRIGGER billing_audit_immutable
  BEFORE UPDATE OR DELETE ON billing.audit_events
  FOR EACH ROW EXECUTE FUNCTION billing.reject_immutable_record_mutation();

CREATE TABLE cloud_billing.project_association_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL CHECK (length(trim(project_id)) BETWEEN 6 AND 128),
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  operator_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, status)
);

CREATE TABLE cloud_billing.resource_cost_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  billing_period DATE NOT NULL,
  cost_micros BIGINT NOT NULL CHECK (cost_micros >= 0),
  currency CHAR(3) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('cloud_billing_export', 'cloud_monitoring')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, resource_id, billing_period)
);

CREATE TABLE cloud_billing.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budget_micros BIGINT NOT NULL CHECK (budget_micros > 0),
  currency CHAR(3) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, period_start, period_end)
);

CREATE TABLE cloud_billing.usage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES production.tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  billing_period DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('cloud_billing_export', 'cloud_monitoring')),
  report JSONB NOT NULL CHECK (jsonb_typeof(report) = 'object'),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, billing_period, source)
);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'billing.payment_obligations',
    'billing.invoices',
    'billing.payment_transactions',
    'billing.receipts',
    'billing.webhook_events',
    'billing.settlement_records',
    'billing.refund_records',
    'billing.financial_ledger',
    'billing.audit_events',
    'cloud_billing.project_association_requests',
    'cloud_billing.resource_cost_attributions',
    'cloud_billing.budgets',
    'cloud_billing.usage_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s
       USING (tenant_id::text = production.current_tenant_id())
       WITH CHECK (tenant_id::text = production.current_tenant_id())',
      table_name
    );
  END LOOP;
END $$;

CREATE POLICY payment_transactions_control_plane_lookup
  ON billing.payment_transactions
  FOR SELECT
  USING (production.is_verified_control_plane_context());

INSERT INTO production.permissions (code, description) VALUES
  ('billing.payments.create', 'Initialize payments only for existing tenant payment obligations'),
  ('billing.payments.read', 'Read invoices, receipts, and payment transactions for this tenant'),
  ('billing.payments.refund', 'Request refunds for settled tenant payment transactions'),
  ('cloud_billing.association.request', 'Request project billing association review for this tenant'),
  ('cloud_billing.costs.read', 'Read cloud cost attribution reports for this tenant')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code IN (
  'billing.payments.create',
  'billing.payments.read',
  'billing.payments.refund',
  'cloud_billing.association.request',
  'cloud_billing.costs.read'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;
