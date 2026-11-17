-- Campus Logistics & Support durable operational foundation.
-- All records inherit the existing production tenant and school identities.

CREATE TABLE production.logistics_feature_configurations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  configuration_version INTEGER NOT NULL DEFAULT 1 CHECK (configuration_version > 0),
  capabilities JSONB NOT NULL CHECK (jsonb_typeof(capabilities) = 'object'),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  updated_by UUID REFERENCES production.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, school_id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_guardians (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 160),
  phone TEXT NOT NULL CHECK (length(trim(phone)) BETWEEN 3 AND 40),
  identity_reference_hash BYTEA,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TABLE production.logistics_guardian_students (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL,
  student_id UUID NOT NULL,
  relationship TEXT NOT NULL CHECK (length(trim(relationship)) BETWEEN 1 AND 80),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'ended')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES production.users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, guardian_id, student_id),
  FOREIGN KEY (tenant_id, school_id, guardian_id)
    REFERENCES production.logistics_guardians (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id) ON DELETE CASCADE,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE production.logistics_pickup_authorizations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  guardian_student_id UUID NOT NULL,
  authorized_by UUID NOT NULL REFERENCES production.users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  additional_approval_required BOOLEAN NOT NULL DEFAULT false,
  additional_approved_by UUID REFERENCES production.users(id),
  additional_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, guardian_student_id)
    REFERENCES production.logistics_guardian_students (tenant_id, school_id, id),
  CHECK (ends_at > starts_at),
  CHECK (NOT additional_approval_required OR additional_approved_by IS NULL OR additional_approved_at IS NOT NULL)
);

CREATE TABLE production.logistics_pickup_passes (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  pickup_authorization_id UUID NOT NULL,
  token_hash BYTEA NOT NULL UNIQUE,
  pin_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES production.users(id),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0 AND use_count <= max_uses),
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_pin_attempts >= 0),
  locked_until TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, idempotency_key),
  FOREIGN KEY (tenant_id, school_id, pickup_authorization_id)
    REFERENCES production.logistics_pickup_authorizations (tenant_id, school_id, id),
  CHECK (length(token_hash) = 32),
  CHECK (expires_at > created_at)
);

CREATE TABLE production.logistics_gate_locations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_gate_devices (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gate_location_id UUID NOT NULL,
  device_key_hash BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  registered_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, device_key_hash),
  FOREIGN KEY (tenant_id, school_id, gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_gate_officer_assignments (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gate_location_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL REFERENCES production.users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE UNIQUE INDEX logistics_gate_assignment_active_uq
  ON production.logistics_gate_officer_assignments (tenant_id, gate_location_id, user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE production.logistics_gate_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gate_location_id UUID NOT NULL,
  student_id UUID,
  guardian_id UUID,
  pickup_pass_id UUID,
  actor_user_id UUID REFERENCES production.users(id),
  direction TEXT NOT NULL CHECK (direction IN ('entry', 'exit')),
  outcome TEXT NOT NULL CHECK (outcome IN ('authorized', 'denied', 'incident')),
  reason_code TEXT,
  vehicle_registration TEXT,
  correlation_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, correlation_id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, gate_location_id)
    REFERENCES production.logistics_gate_locations (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, guardian_id)
    REFERENCES production.logistics_guardians (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, pickup_pass_id)
    REFERENCES production.logistics_pickup_passes (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_security_incidents (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gate_event_id UUID,
  incident_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, gate_event_id)
    REFERENCES production.logistics_gate_events (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_hostel_buildings (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  approved_capacity INTEGER NOT NULL CHECK (approved_capacity >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_hostel_assignments (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('housemaster', 'assistant')),
  assigned_by UUID NOT NULL REFERENCES production.users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, building_id)
    REFERENCES production.logistics_hostel_buildings (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE production.logistics_hostel_rooms (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL,
  floor TEXT NOT NULL DEFAULT '',
  wing TEXT NOT NULL DEFAULT '',
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, building_id, room_number),
  FOREIGN KEY (tenant_id, school_id, building_id)
    REFERENCES production.logistics_hostel_buildings (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_hostel_beds (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, room_id, bed_number),
  FOREIGN KEY (tenant_id, school_id, room_id)
    REFERENCES production.logistics_hostel_rooms (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_bed_allocations (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  bed_id UUID NOT NULL,
  allocated_by UUID NOT NULL REFERENCES production.users(id),
  approved_by UUID REFERENCES production.users(id),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES production.users(id),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, bed_id)
    REFERENCES production.logistics_hostel_beds (tenant_id, school_id, id),
  CHECK (ended_at IS NULL OR ended_at > allocated_at)
);
CREATE UNIQUE INDEX logistics_one_active_bed_per_student
  ON production.logistics_bed_allocations (tenant_id, student_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX logistics_one_student_per_active_bed
  ON production.logistics_bed_allocations (tenant_id, bed_id) WHERE ended_at IS NULL;

CREATE TABLE production.logistics_student_movements (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'check_in', 'check_out', 'room_transfer', 'exeat_departure', 'exeat_return',
    'sickbay_in', 'sickbay_out', 'curfew_violation'
  )),
  from_room_id UUID,
  to_room_id UUID,
  exeat_id UUID,
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, from_room_id)
    REFERENCES production.logistics_hostel_rooms (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, to_room_id)
    REFERENCES production.logistics_hostel_rooms (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_exeats (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES production.users(id),
  destination TEXT NOT NULL CHECK (length(trim(destination)) BETWEEN 1 AND 500),
  departure_due_at TIMESTAMPTZ NOT NULL,
  return_due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_housemaster' CHECK (status IN (
    'pending_housemaster', 'pending_principal', 'approved', 'departure_authorized',
    'departed', 'returned', 'rejected', 'cancelled', 'expired', 'overdue'
  )),
  qr_token_hash BYTEA,
  guardian_consent_verified_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  CHECK (return_due_at > departure_due_at)
);

CREATE TABLE production.logistics_exeat_approvals (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  exeat_id UUID NOT NULL,
  approver_id UUID NOT NULL REFERENCES production.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  approval_stage TEXT NOT NULL CHECK (approval_stage IN ('housemaster', 'principal')),
  rationale TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, exeat_id)
    REFERENCES production.logistics_exeats (tenant_id, school_id, id)
);
ALTER TABLE production.logistics_student_movements
  ADD CONSTRAINT logistics_movement_exeat_fk
  FOREIGN KEY (tenant_id, school_id, exeat_id)
  REFERENCES production.logistics_exeats (tenant_id, school_id, id);

CREATE TABLE production.logistics_roll_calls (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  recorded_by UUID NOT NULL REFERENCES production.users(id),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'unaccounted')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  service_date DATE NOT NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, student_id, service_date),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_dining_meals (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  dining_hall TEXT NOT NULL,
  service_date DATE NOT NULL,
  service_period TEXT NOT NULL,
  menu JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(menu) = 'array'),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, dining_hall, service_date, service_period),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  CHECK (ends_at > starts_at)
);

CREATE TABLE production.logistics_dining_attendance (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL,
  student_id UUID NOT NULL,
  served_by UUID NOT NULL REFERENCES production.users(id),
  diet_fulfilled BOOLEAN NOT NULL DEFAULT false,
  served_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correction_of UUID,
  correction_reason TEXT,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, meal_id, student_id),
  FOREIGN KEY (tenant_id, school_id, meal_id)
    REFERENCES production.logistics_dining_meals (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, correction_of)
    REFERENCES production.logistics_dining_attendance (tenant_id, id),
  CHECK (correction_of IS NULL OR length(trim(correction_reason)) > 0)
);

CREATE TABLE production.logistics_vehicles (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL,
  operator_type TEXT NOT NULL CHECK (operator_type IN ('school_owned', 'outsourced')),
  approved BOOLEAN NOT NULL DEFAULT false,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  inspection_valid_until DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'retired')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, school_id, registration),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_drivers (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  licence_hash BYTEA NOT NULL,
  licence_valid_until DATE NOT NULL,
  qualified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'retired')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, user_id)
    REFERENCES production.memberships (tenant_id, user_id)
);

CREATE TABLE production.logistics_routes (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'retired')),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.logistics_route_stops (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL,
  stop_order INTEGER NOT NULL CHECK (stop_order > 0),
  stop_name TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  UNIQUE (tenant_id, route_id, stop_order),
  FOREIGN KEY (tenant_id, school_id, route_id)
    REFERENCES production.logistics_routes (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_student_routes (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  route_id UUID NOT NULL,
  pickup_stop_id UUID,
  dropoff_stop_id UUID,
  starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at DATE,
  assigned_by UUID NOT NULL REFERENCES production.users(id),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, route_id)
    REFERENCES production.logistics_routes (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, pickup_stop_id)
    REFERENCES production.logistics_route_stops (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, dropoff_stop_id)
    REFERENCES production.logistics_route_stops (tenant_id, school_id, id),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE UNIQUE INDEX logistics_one_active_route_per_student
  ON production.logistics_student_routes (tenant_id, student_id) WHERE ends_at IS NULL;

CREATE TABLE production.logistics_trips (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL,
  vehicle_id UUID,
  driver_id UUID,
  trip_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'driver_assigned', 'vehicle_assigned', 'started', 'in_progress',
    'completed', 'cancelled', 'suspended', 'emergency'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, route_id)
    REFERENCES production.logistics_routes (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, vehicle_id)
    REFERENCES production.logistics_vehicles (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, driver_id)
    REFERENCES production.logistics_drivers (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_trip_passengers (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  student_id UUID NOT NULL,
  boarded_at TIMESTAMPTZ,
  boarded_by UUID REFERENCES production.users(id),
  dropped_off_at TIMESTAMPTZ,
  dropped_off_by UUID REFERENCES production.users(id),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, trip_id, student_id),
  FOREIGN KEY (tenant_id, school_id, trip_id)
    REFERENCES production.logistics_trips (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id, student_id)
    REFERENCES production.students (tenant_id, school_id, id),
  CHECK (dropped_off_at IS NULL OR boarded_at IS NOT NULL)
);

CREATE TABLE production.logistics_library_resources (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id TEXT,
  class_id UUID,
  description TEXT NOT NULL DEFAULT '',
  owner_user_id UUID NOT NULL REFERENCES production.users(id),
  storage_object_key TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'pending_review', 'published', 'archived')),
  verified_by UUID REFERENCES production.users(id),
  verified_at TIMESTAMPTZ,
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, school_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, school_id, class_id)
    REFERENCES production.classes (tenant_id, school_id, id)
);

CREATE TABLE production.logistics_library_resource_versions (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  storage_object_key TEXT NOT NULL,
  checksum BYTEA NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES production.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, resource_id, version),
  FOREIGN KEY (tenant_id, school_id, resource_id)
    REFERENCES production.logistics_library_resources (tenant_id, school_id, id)
);

CREATE OR REPLACE FUNCTION production.enforce_logistics_bed_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_building_id UUID;
  room_capacity INTEGER;
  building_capacity INTEGER;
  room_bed_count INTEGER;
  building_bed_count INTEGER;
BEGIN
  SELECT room.building_id, room.capacity
    INTO target_building_id, room_capacity
  FROM production.logistics_hostel_rooms room
  WHERE room.tenant_id = NEW.tenant_id AND room.school_id = NEW.school_id
    AND room.id = NEW.room_id;
  IF target_building_id IS NULL THEN
    RAISE EXCEPTION 'Hostel room not found' USING ERRCODE = '23503';
  END IF;

  SELECT building.approved_capacity INTO building_capacity
  FROM production.logistics_hostel_buildings building
  WHERE building.tenant_id = NEW.tenant_id AND building.school_id = NEW.school_id
    AND building.id = target_building_id
  FOR UPDATE;

  SELECT count(*) INTO room_bed_count
  FROM production.logistics_hostel_beds bed
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND bed.room_id = NEW.room_id AND bed.id IS DISTINCT FROM NEW.id;
  IF room_bed_count >= room_capacity THEN
    RAISE EXCEPTION 'Hostel room capacity exceeded' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO building_bed_count
  FROM production.logistics_hostel_beds bed
  JOIN production.logistics_hostel_rooms room
    ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
   AND room.id = bed.room_id
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND room.building_id = target_building_id AND bed.id IS DISTINCT FROM NEW.id;
  IF building_bed_count >= building_capacity THEN
    RAISE EXCEPTION 'Approved hostel building capacity exceeded' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_bed_capacity_guard
  BEFORE INSERT OR UPDATE OF room_id ON production.logistics_hostel_beds
  FOR EACH ROW EXECUTE FUNCTION production.enforce_logistics_bed_capacity();

CREATE OR REPLACE FUNCTION production.enforce_logistics_building_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allocated_beds INTEGER;
BEGIN
  SELECT count(*) INTO allocated_beds
  FROM production.logistics_hostel_beds bed
  JOIN production.logistics_hostel_rooms room
    ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
   AND room.id = bed.room_id
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND room.building_id = NEW.id;
  IF NEW.approved_capacity < allocated_beds THEN
    RAISE EXCEPTION 'Approved capacity cannot be lower than registered beds' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_building_capacity_guard
  BEFORE UPDATE OF approved_capacity ON production.logistics_hostel_buildings
  FOR EACH ROW EXECUTE FUNCTION production.enforce_logistics_building_capacity();

CREATE TABLE production.logistics_audit_events (
  tenant_id UUID NOT NULL,
  school_id UUID NOT NULL,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  correlation_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, school_id)
    REFERENCES production.schools (tenant_id, id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION production.reject_logistics_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Logistics history is immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER logistics_gate_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_gate_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_audit_events_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_audit_events
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_exeat_approvals_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_exeat_approvals
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();
CREATE TRIGGER logistics_student_movements_immutable
  BEFORE UPDATE OR DELETE ON production.logistics_student_movements
  FOR EACH ROW EXECUTE FUNCTION production.reject_logistics_history_mutation();

INSERT INTO production.permissions (code, description) VALUES
  ('logistics.configuration.read', 'Read logistics feature configuration'),
  ('logistics.configuration.manage', 'Configure school logistics capabilities'),
  ('logistics.gate.read', 'Read gate security records'),
  ('logistics.gate.manage', 'Manage gate security and pickup authorization'),
  ('logistics.guardians.manage', 'Verify guardian relationships and pickup permissions'),
  ('logistics.hostel.read', 'Read hostel occupancy and movement records'),
  ('logistics.hostel.manage', 'Manage hostel facilities, allocations, and roll calls'),
  ('logistics.exeat.approve', 'Approve or reject exeat requests'),
  ('logistics.dining.read', 'Read dining operations'),
  ('logistics.dining.manage', 'Manage meal schedules and attendance'),
  ('logistics.transport.read', 'Read transport operations'),
  ('logistics.transport.manage', 'Manage vehicles, drivers, routes, and trips'),
  ('logistics.library.read', 'Read published library resources'),
  ('logistics.library.manage', 'Manage library resources and publication')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.roles (code, description) VALUES
  ('security_officer', 'School gate security officer'),
  ('housemaster', 'Boarding housemaster'),
  ('hostel_assistant', 'Hostel assistant'),
  ('dining_officer', 'Dining operations officer'),
  ('transport_manager', 'School transport manager'),
  ('library_administrator', 'School library administrator')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code FROM production.permissions WHERE code LIKE 'logistics.%'
ON CONFLICT DO NOTHING;
INSERT INTO production.role_permissions (role_code, permission_code) VALUES
  ('staff', 'logistics.configuration.read'),
  ('security_officer', 'logistics.gate.read'),
  ('security_officer', 'logistics.gate.manage'),
  ('housemaster', 'logistics.hostel.read'),
  ('housemaster', 'logistics.hostel.manage'),
  ('housemaster', 'logistics.exeat.approve'),
  ('hostel_assistant', 'logistics.hostel.read'),
  ('hostel_assistant', 'logistics.hostel.manage'),
  ('dining_officer', 'logistics.dining.read'),
  ('dining_officer', 'logistics.dining.manage'),
  ('transport_manager', 'logistics.transport.read'),
  ('transport_manager', 'logistics.transport.manage'),
  ('library_administrator', 'logistics.library.read'),
  ('library_administrator', 'logistics.library.manage')
ON CONFLICT DO NOTHING;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'production.logistics_feature_configurations',
    'production.logistics_guardians',
    'production.logistics_guardian_students',
    'production.logistics_pickup_authorizations',
    'production.logistics_pickup_passes',
    'production.logistics_gate_locations',
    'production.logistics_gate_devices',
    'production.logistics_gate_officer_assignments',
    'production.logistics_gate_events',
    'production.logistics_security_incidents',
    'production.logistics_hostel_buildings',
    'production.logistics_hostel_assignments',
    'production.logistics_hostel_rooms',
    'production.logistics_hostel_beds',
    'production.logistics_bed_allocations',
    'production.logistics_student_movements',
    'production.logistics_exeats',
    'production.logistics_exeat_approvals',
    'production.logistics_roll_calls',
    'production.logistics_dining_meals',
    'production.logistics_dining_attendance',
    'production.logistics_vehicles',
    'production.logistics_drivers',
    'production.logistics_routes',
    'production.logistics_route_stops',
    'production.logistics_student_routes',
    'production.logistics_trips',
    'production.logistics_trip_passengers',
    'production.logistics_library_resources',
    'production.logistics_library_resource_versions',
    'production.logistics_audit_events'
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
