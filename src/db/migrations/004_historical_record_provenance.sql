-- Existing rows are not evidence of live resources or verified provisioning.

ALTER TABLE control_plane.provisioning_jobs
  ADD COLUMN record_origin TEXT NOT NULL DEFAULT 'historical_unverified'
    CHECK (record_origin IN ('application', 'historical_unverified'));

ALTER TABLE curriculum_flow.users
  ADD COLUMN record_origin TEXT NOT NULL DEFAULT 'historical_unverified'
    CHECK (record_origin IN ('application', 'historical_unverified'));
ALTER TABLE curriculum_flow.students
  ADD COLUMN record_origin TEXT NOT NULL DEFAULT 'historical_unverified'
    CHECK (record_origin IN ('application', 'historical_unverified'));
