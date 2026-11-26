-- Complete Phase 4 Campus Logistics workflows, audit visibility, library MIME/scan tracking,
-- notification outbox linkage, and principal governance role grants.

ALTER TABLE production.logistics_library_resource_versions
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'clean'
    CHECK (scan_status IN ('pending', 'clean', 'blocked')),
  ADD COLUMN IF NOT EXISTS mime_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS logistics_audit_events_school_time_idx
  ON production.logistics_audit_events (tenant_id, school_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS logistics_pickup_passes_school_created_idx
  ON production.logistics_pickup_passes (tenant_id, school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS logistics_guardians_school_created_idx
  ON production.logistics_guardians (tenant_id, school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS production.logistics_notification_dispatches (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pickup_authorized',
    'pickup_denied',
    'exeat_approved',
    'exeat_rejected',
    'exeat_departed',
    'exeat_returned',
    'exeat_overdue',
    'transport_boarded',
    'transport_dropped_off',
    'transport_incident'
  )),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  student_id UUID,
  guardian_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'web_push')),
  outbox_id UUID,
  status TEXT NOT NULL CHECK (status IN ('queued', 'skipped_unconfigured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, guardian_id)
    REFERENCES production.logistics_guardians (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, outbox_id)
    REFERENCES production.notification_outbox (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS logistics_notification_dispatches_entity_idx
  ON production.logistics_notification_dispatches (tenant_id, school_id, entity_type, entity_id, created_at DESC);

CREATE TRIGGER logistics_notification_dispatches_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_notification_dispatches
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();

ALTER TABLE production.logistics_notification_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.logistics_notification_dispatches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON production.logistics_notification_dispatches;
CREATE POLICY tenant_isolation ON production.logistics_notification_dispatches
  USING (
    tenant_id::text = production.current_tenant_id()::text
    OR production.is_verified_control_plane_context()
  )
  WITH CHECK (
    tenant_id::text = production.current_tenant_id()::text
    OR production.is_verified_control_plane_context()
  );

DROP TRIGGER IF EXISTS prevent_tenant_id_change ON production.logistics_notification_dispatches;
CREATE TRIGGER prevent_tenant_id_change
  BEFORE UPDATE OF tenant_id ON production.logistics_notification_dispatches
  FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_id_change();

INSERT INTO production.permissions (code, description) VALUES
  ('logistics.audit.read', 'Read campus logistics immutable audit ledger')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code FROM production.permissions WHERE code LIKE 'logistics.%'
ON CONFLICT DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('principal', 'logistics.configuration.read'),
  ('principal', 'logistics.configuration.manage'),
  ('principal', 'logistics.gate.read'),
  ('principal', 'logistics.guardians.manage'),
  ('principal', 'logistics.hostel.read'),
  ('principal', 'logistics.dining.read'),
  ('principal', 'logistics.dietary.read'),
  ('principal', 'logistics.transport.read'),
  ('principal', 'logistics.gps.read'),
  ('principal', 'logistics.library.read'),
  ('principal', 'logistics.audit.read')
ON CONFLICT DO NOTHING;
