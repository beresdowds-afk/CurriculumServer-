CREATE TABLE production.project_approval_requests (
  request_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES production.tenants(id),
  project_id TEXT NOT NULL CHECK (project_id ~ '^[a-z][a-z0-9-]{4,28}[a-z0-9]$'),
  operation TEXT NOT NULL CHECK (operation = 'create_customer_project'),
  contract_hash TEXT NOT NULL CHECK (contract_hash ~ '^[0-9a-f]{64}$'),
  authority_reference TEXT NOT NULL CHECK (length(authority_reference) BETWEEN 1 AND 256),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, tenant_id)
);

CREATE TABLE production.project_approval_notifications (
  event_id UUID PRIMARY KEY,
  request_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  claimed_status TEXT NOT NULL CHECK (
    claimed_status IN ('REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED', 'FAILED')
  ),
  event_timestamp TIMESTAMPTZ NOT NULL,
  notification_hash TEXT NOT NULL CHECK (notification_hash ~ '^[0-9a-f]{64}$'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (request_id, tenant_id)
    REFERENCES production.project_approval_requests (request_id, tenant_id)
);
CREATE INDEX project_approval_notifications_request_idx
  ON production.project_approval_notifications (request_id, received_at);

ALTER TABLE production.project_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.project_approval_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY project_approval_requests_control_plane
  ON production.project_approval_requests
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

ALTER TABLE production.project_approval_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.project_approval_notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY project_approval_notifications_control_plane
  ON production.project_approval_notifications
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());
