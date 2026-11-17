-- 016_central_curriculum_and_textbook_domains.sql
-- Migration 016: Logical Domain Schemas, Gemini Generation Metadata, Illustrations,
-- Glossaries, Content Validation Reports, Curriculum Provenance & Competencies.
-- Strictly non-destructive upgrade preserving 001-015 schemas, IDs, and data.
-- Question Bank remains 100% isolated inside production.instance_* per school instance.

-- =========================================================================
-- 1. DEDICATED LOGICAL CENTRAL DOMAINS
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS central_curriculum;
CREATE SCHEMA IF NOT EXISTS central_textbooks;

-- =========================================================================
-- 2. CENTRAL CURRICULUM DOMAIN EXTENSIONS (central_curriculum.*)
-- =========================================================================

CREATE TABLE IF NOT EXISTS central_curriculum.curriculum_source_documents (
  id TEXT PRIMARY KEY,
  authority_id TEXT NOT NULL REFERENCES production.curriculum_education_authorities(id) ON DELETE RESTRICT,
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_code TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  publication_year TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  checksum_sha256 TEXT,
  provenance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_official_gazette BOOLEAN NOT NULL DEFAULT false,
  imported_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS central_curriculum_source_docs_ver_idx
  ON central_curriculum.curriculum_source_documents (curriculum_version_id, framework_id);

CREATE TABLE IF NOT EXISTS central_curriculum.curriculum_competencies (
  id TEXT PRIMARY KEY,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES production.curriculum_topics(id) ON DELETE CASCADE,
  competency_code TEXT NOT NULL,
  competency_type TEXT NOT NULL
    CHECK (competency_type IN ('competency', 'skill', 'learning_outcome', 'assessment_objective')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assessment_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  progression_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS central_curriculum_competencies_lookup_idx
  ON central_curriculum.curriculum_competencies (curriculum_version_id, subject_id, topic_id);

-- =========================================================================
-- 3. CENTRAL TEXTBOOK LIFECYCLE, GEMINI GENERATION & EDITORIAL EXTENSIONS
-- =========================================================================

ALTER TABLE production.central_textbooks
  ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS withdrawal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by_textbook_id TEXT,
  ADD COLUMN IF NOT EXISTS gemini_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS generation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'production'
      AND rel.relname = 'central_textbooks'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%publication_status%'
  LOOP
    EXECUTE format('ALTER TABLE production.central_textbooks DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE production.central_textbooks
  ADD CONSTRAINT central_textbooks_publication_status_check
  CHECK (publication_status IN (
    'draft', 'generating', 'generated', 'in_review', 'under_review',
    'approved', 'published', 'rejected', 'superseded', 'archived'
  ));

ALTER TABLE production.central_textbook_chapters
  ADD COLUMN IF NOT EXISTS introductory_explanation TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS chapter_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revision_exercises JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'production'
      AND rel.relname = 'central_textbook_chapters'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE production.central_textbook_chapters DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE production.central_textbook_chapters
  ADD CONSTRAINT central_textbook_chapters_status_check
  CHECK (status IN (
    'draft', 'generating', 'generated', 'in_review', 'under_review',
    'approved', 'published', 'rejected', 'superseded', 'archived'
  ));

ALTER TABLE production.central_textbook_sections
  ADD COLUMN IF NOT EXISTS instructional_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS illustration_specs JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE production.central_textbook_generation_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS gemini_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS generation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_report_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS central_textbook_generation_jobs_idempotency_uq
  ON production.central_textbook_generation_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'production'
      AND rel.relname = 'central_textbook_versions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%publication_status%'
  LOOP
    EXECUTE format('ALTER TABLE production.central_textbook_versions DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE production.central_textbook_versions
  ADD CONSTRAINT central_textbook_versions_status_check
  CHECK (publication_status IN (
    'draft', 'generating', 'generated', 'in_review', 'under_review',
    'approved', 'published', 'rejected', 'superseded', 'archived'
  ));

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'production'
      AND rel.relname = 'central_textbook_editorial_reviews'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE production.central_textbook_editorial_reviews DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE production.central_textbook_editorial_reviews
  ADD CONSTRAINT central_textbook_editorial_reviews_action_check
  CHECK (action IN (
    'submitted_for_review', 'review_started', 'changes_requested',
    'approved', 'rejected', 'published', 'archived',
    'revision_created', 'validated', 'superseded', 'withdrawn'
  ));

-- =========================================================================
-- 4. DEDICATED CENTRAL TEXTBOOK DOMAIN TABLES (central_textbooks.*)
-- =========================================================================

CREATE TABLE IF NOT EXISTS central_textbooks.textbook_illustrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES production.central_textbook_sections(id) ON DELETE CASCADE,
  learning_objective_id TEXT,
  concept_description TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_class_grade TEXT NOT NULL DEFAULT '',
  age_appropriateness_note TEXT NOT NULL DEFAULT '',
  lesson_consistency_verified BOOLEAN NOT NULL DEFAULT false,
  media_asset_id UUID REFERENCES production.central_textbook_media_assets(id) ON DELETE SET NULL,
  generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS central_textbooks_illustrations_tb_idx
  ON central_textbooks.textbook_illustrations (textbook_id, chapter_id, section_id);

CREATE TABLE IF NOT EXISTS central_textbooks.textbook_glossaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  pronunciation_hint TEXT,
  context_example TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (textbook_id, term)
);

CREATE INDEX IF NOT EXISTS central_textbooks_glossaries_tb_idx
  ON central_textbooks.textbook_glossaries (textbook_id, chapter_id, sort_order);

CREATE TABLE IF NOT EXISTS central_textbooks.textbook_validation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL,
  overall_passed BOOLEAN NOT NULL DEFAULT false,
  readiness_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_by TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS central_textbooks_validation_reports_tb_idx
  ON central_textbooks.textbook_validation_reports (textbook_id, validated_at DESC);

CREATE TABLE IF NOT EXISTS central_textbooks.textbook_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  previous_version_number TEXT,
  new_version_number TEXT NOT NULL,
  revision_type TEXT NOT NULL
    CHECK (revision_type IN ('initial_generation', 'chapter_regeneration', 'editorial_correction', 'curriculum_update', 'supersession')),
  summary TEXT NOT NULL DEFAULT '',
  diff_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (textbook_id, revision_number)
);

-- =========================================================================
-- 5. FORCED ROW-LEVEL SECURITY ON NEW CENTRAL DOMAIN TABLES
-- =========================================================================

DO $$
DECLARE
  tbl TEXT;
  curr_tables TEXT[] := ARRAY[
    'central_curriculum.curriculum_source_documents',
    'central_curriculum.curriculum_competencies'
  ];
  tb_admin_only_tables TEXT[] := ARRAY[
    'central_textbooks.textbook_validation_reports',
    'central_textbooks.textbook_revisions'
  ];
  tb_published_read_tables TEXT[] := ARRAY[
    'central_textbooks.textbook_illustrations',
    'central_textbooks.textbook_glossaries'
  ];
BEGIN
  FOREACH tbl IN ARRAY curr_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY central_curriculum_domain_read ON %s
      FOR SELECT
      USING (
        production.is_verified_control_plane_context()
        OR production.current_tenant_id() IS NOT NULL
      )', tbl);
    EXECUTE format('CREATE POLICY central_curriculum_domain_write ON %s
      FOR ALL
      USING (production.is_verified_control_plane_context())
      WITH CHECK (production.is_verified_control_plane_context())', tbl);
  END LOOP;

  FOREACH tbl IN ARRAY tb_admin_only_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY central_textbooks_domain_control_plane_all ON %s
      FOR ALL
      USING (production.is_verified_control_plane_context())
      WITH CHECK (production.is_verified_control_plane_context())', tbl);
  END LOOP;

  FOREACH tbl IN ARRAY tb_published_read_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY central_textbooks_domain_control_plane_all ON %s
      FOR ALL
      USING (production.is_verified_control_plane_context())
      WITH CHECK (production.is_verified_control_plane_context())', tbl);
    EXECUTE format('CREATE POLICY central_textbooks_domain_tenant_published_read ON %s
      FOR SELECT
      USING (
        production.current_tenant_id() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM production.central_textbooks tb
          WHERE tb.id = textbook_id AND tb.publication_status = ''published''
        )
      )', tbl);
  END LOOP;
END $$;
