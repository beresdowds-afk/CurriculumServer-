CREATE TABLE production.application_service_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  service_id TEXT NOT NULL CHECK (service_id IN (
    'central_curriculum', 'central_textbooks', 'central_vehicle_tracking'
  )),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL AND revoked_by IS NULL)
  )
);

CREATE INDEX production_service_entitlements_instance_service_idx
  ON production.application_service_entitlements
    (tenant_id, application_instance_id, service_id, created_at DESC);
CREATE INDEX production_service_entitlements_expiry_idx
  ON production.application_service_entitlements (expires_at)
  WHERE status = 'active' AND revoked_at IS NULL;

ALTER TABLE production.application_service_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.application_service_entitlements FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_service_entitlement_read
  ON production.application_service_entitlements
  FOR SELECT
  USING (tenant_id = production.current_tenant_id()::uuid);

CREATE POLICY platform_service_entitlement_management
  ON production.application_service_entitlements
  FOR ALL
  USING (production.is_verified_control_plane_context())
  WITH CHECK (production.is_verified_control_plane_context());

INSERT INTO production.permissions (code, description) VALUES
  ('shared.curriculum.discover', 'Discover the central curriculum service'),
  ('shared.curriculum.authorize', 'Request authorization for central curriculum operations'),
  ('shared.curriculum.health', 'Read central curriculum service health'),
  ('shared.curriculum.consume', 'Consume central curriculum operations'),
  ('shared.textbooks.discover', 'Discover the central textbook service'),
  ('shared.textbooks.authorize', 'Request authorization for central textbook operations'),
  ('shared.textbooks.health', 'Read central textbook service health'),
  ('shared.textbooks.consume', 'Consume central textbook operations'),
  ('shared.vehicle_tracking.discover', 'Discover the planned central vehicle tracking service'),
  ('shared.vehicle_tracking.authorize', 'Request authorization for central vehicle tracking operations'),
  ('shared.vehicle_tracking.health', 'Read central vehicle tracking service health'),
  ('shared.vehicle_tracking.consume', 'Consume central vehicle tracking operations')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code IN (
  'shared.curriculum.discover',
  'shared.curriculum.authorize',
  'shared.curriculum.health',
  'shared.curriculum.consume',
  'shared.textbooks.discover',
  'shared.textbooks.authorize',
  'shared.textbooks.health',
  'shared.textbooks.consume',
  'shared.vehicle_tracking.discover',
  'shared.vehicle_tracking.authorize',
  'shared.vehicle_tracking.health'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;
