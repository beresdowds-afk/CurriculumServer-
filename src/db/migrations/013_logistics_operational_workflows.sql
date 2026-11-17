ALTER TABLE production.logistics_exeats
  ADD COLUMN reason TEXT NOT NULL DEFAULT 'Legacy request',
  ADD COLUMN requested_by_guardian_id UUID,
  ADD COLUMN request_idempotency_key TEXT,
  ADD COLUMN request_fingerprint BYTEA,
  ADD COLUMN departure_gate_location_id UUID,
  ADD COLUMN return_gate_location_id UUID,
  ADD COLUMN departure_recorded_by UUID REFERENCES production.users(id),
  ADD COLUMN return_recorded_by UUID REFERENCES production.users(id),
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancelled_by UUID REFERENCES production.users(id),
  ADD COLUMN cancellation_reason TEXT,
  ADD CONSTRAINT logistics_exeat_reason_length CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  ADD CONSTRAINT logistics_exeat_cancel_metadata CHECK (
    (cancelled_at IS NULL AND cancelled_by IS NULL) OR
    (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
  ),
  ADD CONSTRAINT logistics_exeat_request_fingerprint_length CHECK (
    request_fingerprint IS NULL OR length(request_fingerprint) = 32
  ),
  ADD CONSTRAINT logistics_exeat_departure_return_order CHECK (
    returned_at IS NULL OR (departed_at IS NOT NULL AND returned_at >= departed_at)
  ),
  ADD CONSTRAINT logistics_exeat_requester_guardian_fk
    FOREIGN KEY (tenant_id, school_id, requested_by_guardian_id)
    REFERENCES production.logistics_guardians (tenant_id, school_id, id),
  ADD CONSTRAINT logistics_exeat_departure_gate_fk
    FOREIGN KEY (tenant_id, school_id, departure_gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id),
  ADD CONSTRAINT logistics_exeat_return_gate_fk
    FOREIGN KEY (tenant_id, school_id, return_gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id);

CREATE UNIQUE INDEX logistics_exeat_idempotency_uq
  ON production.logistics_exeats (tenant_id, school_id, request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;
CREATE INDEX logistics_exeat_student_status_period_idx
  ON production.logistics_exeats (tenant_id, school_id, student_id, status, departure_due_at);
CREATE INDEX logistics_exeat_overdue_due_idx
  ON production.logistics_exeats (tenant_id, school_id, return_due_at)
  WHERE status IN ('departed', 'overdue');

ALTER TABLE production.logistics_exeat_approvals
  ADD COLUMN idempotency_key TEXT,
  ADD COLUMN request_fingerprint BYTEA;
ALTER TABLE production.logistics_exeat_approvals
  ADD CONSTRAINT logistics_exeat_approval_fingerprint_length CHECK (
    request_fingerprint IS NULL OR length(request_fingerprint) = 32
  );
CREATE UNIQUE INDEX logistics_exeat_approval_idempotency_uq
  ON production.logistics_exeat_approvals (tenant_id, school_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION production.enforce_logistics_exeat_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  transition_allowed BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending_housemaster' THEN
      RAISE EXCEPTION 'New exeats must start pending approval' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  transition_allowed :=
    (OLD.status = 'pending_housemaster' AND NEW.status IN (
      'pending_principal', 'approved', 'rejected', 'cancelled', 'expired'
    )) OR
    (OLD.status = 'pending_principal' AND NEW.status IN ('approved', 'rejected', 'cancelled', 'expired')) OR
    (OLD.status = 'approved' AND NEW.status IN ('departure_authorized', 'cancelled', 'expired')) OR
    (OLD.status = 'departure_authorized' AND NEW.status IN ('departed', 'cancelled', 'expired')) OR
    (OLD.status = 'departed' AND NEW.status IN ('returned', 'overdue')) OR
    (OLD.status = 'overdue' AND NEW.status = 'returned');
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'Invalid exeat state transition' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_exeat_state_transition_guard
  BEFORE INSERT OR UPDATE OF status ON production.logistics_exeats
  FOR EACH ROW EXECUTE FUNCTION production.enforce_logistics_exeat_transition();

ALTER TABLE production.logistics_student_movements
  ADD COLUMN gate_location_id UUID,
  ADD COLUMN idempotency_key TEXT,
  ADD CONSTRAINT logistics_movement_gate_fk
    FOREIGN KEY (tenant_id, school_id, gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id);
CREATE UNIQUE INDEX logistics_movement_idempotency_uq
  ON production.logistics_student_movements (tenant_id, school_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX logistics_student_movement_history_idx
  ON production.logistics_student_movements (tenant_id, school_id, student_id, occurred_at DESC);

CREATE TABLE production.logistics_dining_entitlements (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  meal_periods TEXT[] NOT NULL CHECK (cardinality(meal_periods) > 0),
  starts_on DATE NOT NULL,
  ends_on DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'ended')),
  dietary_profile_reference TEXT,
  created_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX logistics_dining_entitlement_student_idx
  ON production.logistics_dining_entitlements (tenant_id, school_id, student_id, starts_on, ends_on)
  WHERE status = 'active';

CREATE TABLE production.logistics_dining_exceptions (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL,
  student_id UUID NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'entitlement_override', 'attendance_correction', 'dietary_exception', 'service_exception'
  )),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  idempotency_key TEXT NOT NULL,
  authorized_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id, meal_id)
    REFERENCES production.logistics_dining_meals (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id)
);
CREATE INDEX logistics_dining_exception_meal_idx
  ON production.logistics_dining_exceptions (tenant_id, school_id, meal_id, created_at DESC);
CREATE INDEX logistics_dining_attendance_meal_idx
  ON production.logistics_dining_attendance (tenant_id, school_id, meal_id, served_at DESC);
ALTER TABLE production.logistics_dining_attendance
  ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX logistics_dining_attendance_idempotency_uq
  ON production.logistics_dining_attendance (tenant_id, school_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE production.logistics_trip_staff_assignments (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('driver', 'attendant')),
  assigned_by UUID NOT NULL REFERENCES production.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, trip_id)
    REFERENCES production.logistics_trips (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id),
  CHECK (ended_at IS NULL OR ended_at > assigned_at)
);
CREATE UNIQUE INDEX logistics_trip_staff_active_role_uq
  ON production.logistics_trip_staff_assignments (tenant_id, trip_id, assignment_role)
  WHERE ended_at IS NULL AND assignment_role = 'driver';
CREATE INDEX logistics_trip_staff_user_idx
  ON production.logistics_trip_staff_assignments (tenant_id, school_id, user_id, assigned_at DESC);

CREATE TABLE production.logistics_trip_passenger_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  student_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('boarded', 'dropped_off')),
  idempotency_key TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id, trip_id)
    REFERENCES production.logistics_trips (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id)
);
CREATE UNIQUE INDEX logistics_trip_passenger_event_once_uq
  ON production.logistics_trip_passenger_events (tenant_id, trip_id, student_id, event_type);
CREATE INDEX logistics_trip_passenger_events_trip_idx
  ON production.logistics_trip_passenger_events (tenant_id, school_id, trip_id, occurred_at);

ALTER TABLE production.logistics_trips
  ADD COLUMN scheduled_departure_at TIMESTAMPTZ,
  ADD COLUMN scheduled_arrival_at TIMESTAMPTZ,
  ADD CONSTRAINT logistics_trip_schedule_order CHECK (
    scheduled_arrival_at IS NULL OR scheduled_departure_at IS NULL OR
    scheduled_arrival_at > scheduled_departure_at
  );
CREATE INDEX logistics_trip_school_date_idx
  ON production.logistics_trips (tenant_id, school_id, trip_date DESC, status);
CREATE INDEX logistics_student_route_history_idx
  ON production.logistics_student_routes (tenant_id, school_id, student_id, starts_at DESC);

ALTER TABLE production.logistics_library_resources
  ADD COLUMN request_idempotency_key TEXT,
  ADD COLUMN request_fingerprint BYTEA,
  ADD CONSTRAINT logistics_library_resource_fingerprint_length CHECK (
    request_fingerprint IS NULL OR length(request_fingerprint) = 32
  );
CREATE UNIQUE INDEX logistics_library_resource_idempotency_uq
  ON production.logistics_library_resources (tenant_id, school_id, request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;

CREATE TABLE production.logistics_library_catalog_items (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  material_type TEXT NOT NULL CHECK (material_type IN ('book', 'periodical', 'reference', 'digital', 'other')),
  isbn TEXT,
  subject_id TEXT,
  class_id UUID,
  author TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  publication_year INTEGER CHECK (publication_year IS NULL OR publication_year BETWEEN 1000 AND 2200),
  loan_period_days INTEGER NOT NULL DEFAULT 14 CHECK (loan_period_days BETWEEN 1 AND 365),
  max_renewals INTEGER NOT NULL DEFAULT 1 CHECK (max_renewals BETWEEN 0 AND 10),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id)
);
CREATE UNIQUE INDEX logistics_library_isbn_uq
  ON production.logistics_library_catalog_items (tenant_id, school_id, isbn)
  WHERE isbn IS NOT NULL;
CREATE INDEX logistics_library_catalog_search_idx
  ON production.logistics_library_catalog_items (tenant_id, school_id, lower(title))
  WHERE status = 'active';

CREATE TABLE production.logistics_library_copies (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL,
  copy_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'loaned', 'lost', 'damaged', 'retired')),
  added_by UUID NOT NULL REFERENCES production.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, copy_code),
  FOREIGN KEY (tenant_id, school_id, catalog_item_id)
    REFERENCES production.logistics_library_catalog_items (tenant_id, school_id, id)
);
CREATE INDEX logistics_library_copies_item_idx
  ON production.logistics_library_copies (tenant_id, school_id, catalog_item_id, status);

CREATE TABLE production.logistics_library_loans (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL,
  student_id UUID,
  borrower_user_id UUID,
  checked_out_by UUID NOT NULL REFERENCES production.users(id),
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  returned_to UUID REFERENCES production.users(id),
  renewal_count INTEGER NOT NULL DEFAULT 0 CHECK (renewal_count >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'returned', 'lost', 'damaged')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, copy_id)
    REFERENCES production.logistics_library_copies (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, borrower_user_id)
    REFERENCES production.memberships (tenant_id, user_id),
  CHECK ((student_id IS NOT NULL)::integer + (borrower_user_id IS NOT NULL)::integer = 1),
  CHECK (due_at > checked_out_at),
  CHECK ((status = 'open' AND returned_at IS NULL) OR
         (status <> 'open' AND returned_at IS NOT NULL))
);
CREATE UNIQUE INDEX logistics_library_copy_open_loan_uq
  ON production.logistics_library_loans (tenant_id, copy_id)
  WHERE status = 'open';
CREATE INDEX logistics_library_borrower_loans_idx
  ON production.logistics_library_loans (tenant_id, school_id, student_id, checked_out_at DESC)
  WHERE student_id IS NOT NULL;
CREATE INDEX logistics_library_overdue_idx
  ON production.logistics_library_loans (tenant_id, school_id, due_at)
  WHERE status = 'open';

CREATE TABLE production.logistics_library_loan_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('checked_out', 'renewed', 'returned', 'lost', 'damaged')),
  idempotency_key TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES production.users(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id, loan_id)
    REFERENCES production.logistics_library_loans (tenant_id, school_id, id)
);
CREATE INDEX logistics_library_loan_events_history_idx
  ON production.logistics_library_loan_events (tenant_id, school_id, loan_id, occurred_at);

INSERT INTO production.permissions (code, description) VALUES
  ('logistics.exeat.read', 'Read school exeat requests and history'),
  ('logistics.exeat.request', 'Request an exeat for self or verified ward'),
  ('logistics.exeat.depart', 'Record an approved exeat departure'),
  ('logistics.exeat.return', 'Record an exeat return'),
  ('logistics.movement.read', 'Read student movement history'),
  ('logistics.movement.record', 'Record authorized student movement'),
  ('logistics.dining.entitlement.manage', 'Manage student dining entitlements'),
  ('logistics.dining.attendance.record', 'Record student meal attendance'),
  ('logistics.transport.passengers.manage', 'Record trip boarding and drop-off')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code FROM production.permissions
WHERE code LIKE 'logistics.%'
ON CONFLICT DO NOTHING;
INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('principal', 'logistics.exeat.read'),
  ('principal', 'logistics.exeat.approve'),
  ('principal', 'logistics.exeat.depart'),
  ('principal', 'logistics.exeat.return'),
  ('housemaster', 'logistics.exeat.read'),
  ('housemaster', 'logistics.exeat.approve'),
  ('housemaster', 'logistics.exeat.request'),
  ('housemaster', 'logistics.movement.read'),
  ('housemaster', 'logistics.movement.record'),
  ('hostel_assistant', 'logistics.movement.read'),
  ('hostel_assistant', 'logistics.movement.record'),
  ('security_officer', 'logistics.exeat.read'),
  ('security_officer', 'logistics.exeat.depart'),
  ('security_officer', 'logistics.exeat.return'),
  ('security_officer', 'logistics.movement.read'),
  ('security_officer', 'logistics.movement.record'),
  ('parent', 'logistics.exeat.read'),
  ('parent', 'logistics.exeat.request'),
  ('parent', 'logistics.movement.read'),
  ('student', 'logistics.exeat.read'),
  ('student', 'logistics.exeat.request'),
  ('dining_officer', 'logistics.dining.entitlement.manage'),
  ('dining_officer', 'logistics.dining.attendance.record'),
  ('transport_manager', 'logistics.transport.passengers.manage'),
  ('staff', 'logistics.movement.read')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION production.reject_logistics_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Logistics history is immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER logistics_dining_attendance_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_dining_attendance
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_dining_exceptions_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_dining_exceptions
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_trip_passenger_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_trip_passenger_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_library_loan_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_library_loan_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_library_resource_versions_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_library_resource_versions
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.logistics_dining_entitlements',
    'production.logistics_dining_exceptions',
    'production.logistics_trip_staff_assignments',
    'production.logistics_trip_passenger_events',
    'production.logistics_library_catalog_items',
    'production.logistics_library_copies',
    'production.logistics_library_loans',
    'production.logistics_library_loan_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %s USING (
         tenant_id::text = production.current_tenant_id()::text
         OR production.is_verified_control_plane_context()
       ) WITH CHECK (
         tenant_id::text = production.current_tenant_id()::text
         OR production.is_verified_control_plane_context()
       )', table_name
    );
    EXECUTE format(
      'CREATE TRIGGER prevent_tenant_id_change
       BEFORE UPDATE OF tenant_id ON %s
       FOR EACH ROW EXECUTE FUNCTION production.prevent_tenant_id_change()', table_name
    );
  END LOOP;
END $$;
