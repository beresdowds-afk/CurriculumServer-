-- 035_question_bank_scoped_writes_hardening.sql
-- Adds archival metadata on Question Bank items to preserve historical assessment references,
-- and category update timestamps for auditable category modifications.

ALTER TABLE production.instance_question_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE production.instance_question_bank_items
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by TEXT,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS production_instance_qb_active_idx
  ON production.instance_question_bank_items (tenant_id, application_instance_id, review_status)
  WHERE archived_at IS NULL;
