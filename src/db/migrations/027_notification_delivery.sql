CREATE TABLE production.notification_subscriptions (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  id UUID NOT NULL,
  owner_id TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 256),
  encrypted_subscription TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE production.notification_outbox (
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'web_push')),
  encrypted_request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'accepted', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK (status = 'queued' OR lease_token IS NULL)
);
CREATE INDEX notification_outbox_due_idx
  ON production.notification_outbox (tenant_id, next_attempt_at, created_at)
  WHERE status = 'queued';

CREATE TABLE production.notification_attempts (
  tenant_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  lease_token UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'failed')),
  error_code TEXT,
  provider_message_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, notification_id, attempt_number),
  FOREIGN KEY (tenant_id, notification_id)
    REFERENCES production.notification_outbox (tenant_id, id) ON DELETE CASCADE,
  CHECK ((status = 'pending') = (finished_at IS NULL))
);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.notification_subscriptions',
    'production.notification_outbox',
    'production.notification_attempts'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING
       (tenant_id::text = production.current_tenant_id() OR production.is_verified_control_plane_context())
       WITH CHECK
       (tenant_id::text = production.current_tenant_id() OR production.is_verified_control_plane_context())',
      table_name
    );
  END LOOP;
END $$;
