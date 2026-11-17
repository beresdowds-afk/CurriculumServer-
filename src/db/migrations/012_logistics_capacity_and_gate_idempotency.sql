ALTER TABLE production.logistics_gate_events
  ADD COLUMN request_fingerprint BYTEA
  CHECK (request_fingerprint IS NULL OR length(request_fingerprint) = 32);

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
    AND room.id = NEW.room_id
  FOR SHARE;
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

CREATE OR REPLACE FUNCTION production.enforce_logistics_room_capacity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  building_capacity INTEGER;
  room_bed_count INTEGER;
  building_bed_count INTEGER;
BEGIN
  SELECT building.approved_capacity INTO building_capacity
  FROM production.logistics_hostel_buildings building
  WHERE building.tenant_id = NEW.tenant_id AND building.school_id = NEW.school_id
    AND building.id = NEW.building_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hostel building not found' USING ERRCODE = '23503';
  END IF;

  SELECT count(*) INTO room_bed_count
  FROM production.logistics_hostel_beds bed
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND bed.room_id = NEW.id;
  IF room_bed_count > NEW.capacity THEN
    RAISE EXCEPTION 'Room capacity cannot be lower than registered beds' USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO building_bed_count
  FROM production.logistics_hostel_beds bed
  JOIN production.logistics_hostel_rooms room
    ON room.tenant_id = bed.tenant_id AND room.school_id = bed.school_id
   AND room.id = bed.room_id
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND (bed.room_id = NEW.id OR room.building_id = NEW.building_id);
  IF building_bed_count > building_capacity THEN
    RAISE EXCEPTION 'Approved hostel building capacity exceeded' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_room_capacity_guard
  BEFORE UPDATE OF building_id, capacity ON production.logistics_hostel_rooms
  FOR EACH ROW EXECUTE FUNCTION production.enforce_logistics_room_capacity();

CREATE OR REPLACE FUNCTION production.enforce_logistics_bed_availability()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_status TEXT;
BEGIN
  SELECT bed.status INTO current_status
  FROM production.logistics_hostel_beds bed
  WHERE bed.tenant_id = NEW.tenant_id AND bed.school_id = NEW.school_id
    AND bed.id = NEW.bed_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hostel bed not found' USING ERRCODE = '23503';
  END IF;
  IF NEW.ended_at IS NULL AND current_status <> 'available' THEN
    RAISE EXCEPTION 'An unavailable bed cannot have an active allocation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_allocation_bed_availability_guard
  BEFORE INSERT OR UPDATE OF bed_id, ended_at ON production.logistics_bed_allocations
  FOR EACH ROW EXECUTE FUNCTION production.enforce_logistics_bed_availability();

CREATE OR REPLACE FUNCTION production.prevent_unavailable_allocated_logistics_bed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'unavailable' AND EXISTS (
    SELECT 1 FROM production.logistics_bed_allocations allocation
    WHERE allocation.tenant_id = NEW.tenant_id AND allocation.school_id = NEW.school_id
      AND allocation.bed_id = NEW.id AND allocation.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An allocated bed cannot be made unavailable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_allocated_bed_status_guard
  BEFORE UPDATE OF status ON production.logistics_hostel_beds
  FOR EACH ROW EXECUTE FUNCTION production.prevent_unavailable_allocated_logistics_bed();
