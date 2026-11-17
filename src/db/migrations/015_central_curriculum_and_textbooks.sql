-- Stage 2: Central Curriculum Database, Central Textbook Services, Usage Metering,
-- and strictly tenant-isolated Instance-Level Question Bank & Assessment tables.
-- Forward-only migration; preserves all Stage 1 shared-service foundations.

-- =========================================================================
-- 1. CENTRAL CURRICULUM DATABASE (Platform-Owned, Tenant Read-Only)
-- =========================================================================

CREATE TABLE production.curriculum_countries (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  iso_code TEXT NOT NULL UNIQUE CHECK (length(trim(iso_code)) BETWEEN 2 AND 16),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  jurisdiction_type TEXT NOT NULL DEFAULT 'country'
    CHECK (jurisdiction_type IN ('country', 'state', 'regional', 'international')),
  region TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production.curriculum_education_authorities (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  country_id TEXT NOT NULL REFERENCES production.curriculum_countries(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) BETWEEN 2 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 240),
  authority_type TEXT NOT NULL DEFAULT 'national'
    CHECK (authority_type IN ('national', 'regional', 'examination_board', 'international')),
  official_url TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_curriculum_authorities_country_idx
  ON production.curriculum_education_authorities (country_id);

CREATE TABLE production.curriculum_frameworks (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  country_id TEXT NOT NULL REFERENCES production.curriculum_countries(id) ON DELETE RESTRICT,
  authority_id TEXT NOT NULL REFERENCES production.curriculum_education_authorities(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) BETWEEN 2 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 240),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_curriculum_frameworks_country_auth_idx
  ON production.curriculum_frameworks (country_id, authority_id, status);

CREATE TABLE production.curriculum_education_levels (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 32),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (framework_id, code)
);

CREATE TABLE production.curriculum_class_grades (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE CASCADE,
  education_level_id TEXT NOT NULL REFERENCES production.curriculum_education_levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 32),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (framework_id, name),
  UNIQUE (framework_id, code)
);
CREATE INDEX production_curriculum_grades_level_idx
  ON production.curriculum_class_grades (framework_id, education_level_id, sort_order);

CREATE TABLE production.curriculum_subject_classifications (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE production.curriculum_subjects (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 120),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE RESTRICT,
  education_level_id TEXT NOT NULL REFERENCES production.curriculum_education_levels(id) ON DELETE RESTRICT,
  classification_id TEXT NOT NULL REFERENCES production.curriculum_subject_classifications(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '',
  is_compulsory BOOLEAN NOT NULL DEFAULT false,
  recommended_periods_per_week INTEGER NOT NULL DEFAULT 3 CHECK (recommended_periods_per_week >= 0),
  official_source_url TEXT NOT NULL DEFAULT '',
  target_grades JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(target_grades) = 'array'),
  general_objectives JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(general_objectives) = 'array'),
  recommended_textbooks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(recommended_textbooks) = 'array'),
  equipment_requirements JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(equipment_requirements) = 'array'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, education_level_id, code)
);
CREATE INDEX production_curriculum_subjects_lookup_idx
  ON production.curriculum_subjects (framework_id, education_level_id, classification_id);

CREATE TABLE production.curriculum_versions (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 120),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE RESTRICT,
  version_tag TEXT NOT NULL CHECK (length(trim(version_tag)) BETWEEN 1 AND 80),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 240),
  academic_applicability JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(academic_applicability) = 'object'),
  release_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  supersedes_version_id TEXT REFERENCES production.curriculum_versions(id),
  superseded_by_version_id TEXT REFERENCES production.curriculum_versions(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'superseded', 'archived')),
  editorial_approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (editorial_approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  is_official_verified BOOLEAN NOT NULL DEFAULT false,
  source_provenance JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(source_provenance) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_id, version_tag)
);
CREATE INDEX production_curriculum_versions_fw_status_idx
  ON production.curriculum_versions (framework_id, status, release_date DESC);

CREATE TABLE production.curriculum_version_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE CASCADE,
  class_grade_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(class_grade_ids) = 'array'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curriculum_version_id, subject_id)
);

CREATE TABLE production.curriculum_themes (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 180),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE CASCADE,
  source_theme_id TEXT NOT NULL,
  theme_number INTEGER NOT NULL CHECK (theme_number >= 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  description TEXT NOT NULL DEFAULT '',
  UNIQUE (curriculum_version_id, subject_id, source_theme_id)
);
CREATE INDEX production_curriculum_themes_subject_idx
  ON production.curriculum_themes (curriculum_version_id, subject_id, theme_number);

CREATE TABLE production.curriculum_topics (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 180),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES production.curriculum_themes(id) ON DELETE CASCADE,
  class_grade_id TEXT NOT NULL REFERENCES production.curriculum_class_grades(id) ON DELETE RESTRICT,
  source_topic_id TEXT NOT NULL,
  class_grade_name TEXT NOT NULL,
  term TEXT NOT NULL,
  week INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  content_details JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(content_details) = 'array'),
  teacher_activities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(teacher_activities) = 'array'),
  student_activities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(student_activities) = 'array'),
  teaching_materials JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(teaching_materials) = 'array'),
  evaluation_guide JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evaluation_guide) = 'array'),
  practical_workshop_notes TEXT,
  competency_domain TEXT,
  exam_relevance JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(exam_relevance) = 'object'),
  UNIQUE (curriculum_version_id, subject_id, source_topic_id)
);
CREATE INDEX production_curriculum_topics_filter_idx
  ON production.curriculum_topics (curriculum_version_id, subject_id, class_grade_id, term, week);

CREATE TABLE production.curriculum_subtopics (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 220),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES production.curriculum_topics(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 500),
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX production_curriculum_subtopics_topic_idx
  ON production.curriculum_subtopics (topic_id, sort_order);

CREATE TABLE production.curriculum_learning_objectives (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 220),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES production.curriculum_topics(id) ON DELETE CASCADE,
  subtopic_id TEXT REFERENCES production.curriculum_subtopics(id) ON DELETE SET NULL,
  objective_type TEXT NOT NULL DEFAULT 'performance'
    CHECK (objective_type IN ('learning', 'performance', 'general')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL CHECK (length(trim(description)) >= 1),
  bloom_level TEXT
);
CREATE INDEX production_curriculum_objectives_topic_idx
  ON production.curriculum_learning_objectives (topic_id, objective_type, sort_order);

CREATE TABLE production.curriculum_standards (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 220),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES production.curriculum_subjects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES production.curriculum_topics(id) ON DELETE CASCADE,
  standard_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  exam_body TEXT NOT NULL DEFAULT 'NATIONAL'
);
CREATE INDEX production_curriculum_standards_lookup_idx
  ON production.curriculum_standards (curriculum_version_id, subject_id, topic_id);

CREATE TABLE production.curriculum_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL
    CHECK (change_type IN ('created', 'updated', 'migrated', 'approved', 'published', 'superseded', 'archived')),
  summary TEXT NOT NULL,
  diff_payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(diff_payload) = 'object'),
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_curriculum_change_history_ver_idx
  ON production.curriculum_change_history (curriculum_version_id, recorded_at DESC);

-- =========================================================================
-- 2. CENTRAL TEXTBOOK DATABASE (Platform-Owned, Tenant Published Read-Only)
-- =========================================================================

CREATE TABLE production.central_publishers (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 200),
  country_id TEXT REFERENCES production.curriculum_countries(id) ON DELETE SET NULL,
  website_url TEXT NOT NULL DEFAULT '',
  license_default TEXT NOT NULL DEFAULT 'PROPRIETARY_INSTITUTIONAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production.central_authors (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 120),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 200),
  email TEXT,
  affiliation TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production.central_textbooks (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 160),
  framework_id TEXT NOT NULL REFERENCES production.curriculum_frameworks(id) ON DELETE RESTRICT,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  education_level_id TEXT NOT NULL REFERENCES production.curriculum_education_levels(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  class_grade_id TEXT NOT NULL REFERENCES production.curriculum_class_grades(id) ON DELETE RESTRICT,
  class_grade_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  publisher_id TEXT REFERENCES production.central_publishers(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 300),
  subtitle TEXT,
  description TEXT NOT NULL DEFAULT '',
  current_version TEXT NOT NULL DEFAULT '1.0.0',
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
  editorial_approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (editorial_approval_status IN ('pending', 'in_review', 'approved', 'rejected', 'changes_requested')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  published_by TEXT,
  published_at TIMESTAMPTZ,
  copyright_holder TEXT NOT NULL DEFAULT 'Curriculum Server Editorial Board',
  license_type TEXT NOT NULL DEFAULT 'PROPRIETARY_INSTITUTIONAL',
  license_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(license_metadata) = 'object'),
  provenance_kind TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (provenance_kind IN ('authoritative_editorial', 'ai_generated', 'migrated_baseline', 'imported')),
  is_verified_authoritative BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    publication_status <> 'published'
    OR (editorial_approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND published_by IS NOT NULL AND published_at IS NOT NULL)
  )
);
CREATE INDEX production_central_textbooks_lookup_idx
  ON production.central_textbooks (framework_id, curriculum_version_id, subject_id, class_grade_id, publication_status);

CREATE TABLE production.central_textbook_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES production.central_authors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lead_author', 'co_author', 'editor', 'reviewer', 'illustrator', 'ai_assisted_generator')),
  contribution_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (textbook_id, author_id, role)
);

CREATE TABLE production.central_textbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  publication_status TEXT NOT NULL
    CHECK (publication_status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
  changelog TEXT NOT NULL DEFAULT '',
  snapshot_checksum TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (textbook_id, version_number)
);
CREATE INDEX production_central_textbook_versions_idx
  ON production.central_textbook_versions (textbook_id, created_at DESC);

CREATE TABLE production.central_textbook_chapters (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 180),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  summary TEXT NOT NULL DEFAULT '',
  topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(topic_ids) = 'array'),
  learning_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(learning_objective_ids) = 'array'),
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(learning_objectives) = 'array'),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (textbook_id, chapter_number)
);

CREATE TABLE production.central_textbook_sections (
  id TEXT PRIMARY KEY CHECK (length(trim(id)) BETWEEN 2 AND 200),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL CHECK (section_number > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  content_markdown TEXT NOT NULL DEFAULT '',
  examples JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(examples) = 'array'),
  worked_solutions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(worked_solutions) = 'array'),
  practical_activities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(practical_activities) = 'array'),
  key_vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(key_vocabulary) = 'array'),
  common_misconceptions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(common_misconceptions) = 'array'),
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewer_id TEXT,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, section_number)
);

CREATE TABLE production.central_textbook_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES production.central_textbook_sections(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL CHECK (block_order >= 0),
  block_type TEXT NOT NULL
    CHECK (block_type IN ('narrative', 'definition', 'worked_example', 'practical_activity', 'callout', 'diagram_ref', 'exercise', 'citation_note')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_blocks_sec_idx
  ON production.central_textbook_content_blocks (section_id, block_order);

CREATE TABLE production.central_textbook_objective_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES production.central_textbook_sections(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES production.curriculum_topics(id) ON DELETE SET NULL,
  learning_objective_id TEXT NOT NULL REFERENCES production.curriculum_learning_objectives(id) ON DELETE CASCADE,
  mapping_strength TEXT NOT NULL DEFAULT 'primary' CHECK (mapping_strength IN ('primary', 'supporting')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_obj_map_idx
  ON production.central_textbook_objective_mappings (textbook_id, learning_objective_id);

CREATE TABLE production.central_textbook_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES production.central_textbook_sections(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('illustration', 'diagram', 'photograph', 'pdf_export', 'epub_export', 'audio_companion')),
  title TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'local_durable',
  storage_key TEXT NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  bytes_size BIGINT NOT NULL DEFAULT 0 CHECK (bytes_size >= 0),
  access_scope TEXT NOT NULL DEFAULT 'entitled_private'
    CHECK (access_scope IN ('editorial_only', 'entitled_private')),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_media_idx
  ON production.central_textbook_media_assets (textbook_id, access_scope);

CREATE TABLE production.central_textbook_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  citation_key TEXT NOT NULL,
  author_or_source TEXT NOT NULL,
  title TEXT NOT NULL,
  publication_year TEXT,
  publisher TEXT,
  source_url TEXT,
  license_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_citations_idx
  ON production.central_textbook_citations (textbook_id, chapter_id);

CREATE TABLE production.central_textbook_editorial_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT NOT NULL REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES production.central_textbook_chapters(id) ON DELETE CASCADE,
  section_id TEXT REFERENCES production.central_textbook_sections(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('submitted_for_review', 'review_started', 'changes_requested', 'approved', 'rejected', 'published', 'archived', 'revision_created')),
  notes TEXT NOT NULL DEFAULT '',
  previous_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_reviews_idx
  ON production.central_textbook_editorial_reviews (textbook_id, created_at DESC);

CREATE TABLE production.central_textbook_coverage_manifests (
  textbook_id TEXT PRIMARY KEY REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  class_grade_name TEXT NOT NULL,
  total_required_topics INTEGER NOT NULL DEFAULT 0,
  topics_included_in_outline INTEGER NOT NULL DEFAULT 0,
  topics_covered_by_sections INTEGER NOT NULL DEFAULT 0,
  total_learning_objectives INTEGER NOT NULL DEFAULT 0,
  objectives_mapped_to_content INTEGER NOT NULL DEFAULT 0,
  coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(missing_requirements) = 'array'),
  sections_awaiting_review INTEGER NOT NULL DEFAULT 0,
  approved_content_count INTEGER NOT NULL DEFAULT 0,
  rejected_content_count INTEGER NOT NULL DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production.central_textbook_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id TEXT REFERENCES production.central_textbooks(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL REFERENCES production.curriculum_versions(id) ON DELETE RESTRICT,
  subject_id TEXT NOT NULL REFERENCES production.curriculum_subjects(id) ON DELETE RESTRICT,
  class_grade_name TEXT NOT NULL,
  job_type TEXT NOT NULL
    CHECK (job_type IN ('outline', 'chapter_content', 'full_textbook', 'curriculum_realignment')),
  status TEXT NOT NULL
    CHECK (status IN ('queued', 'running', 'paused_for_recovery', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  current_step TEXT NOT NULL DEFAULT '',
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  checkpoint_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(checkpoint_data) = 'object'),
  initiated_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX production_central_tb_jobs_status_idx
  ON production.central_textbook_generation_jobs (status, updated_at DESC);

-- =========================================================================
-- 3. SHARED SERVICE USAGE METERING (Tenant Read / Control-Plane Audit)
-- =========================================================================

CREATE TABLE production.shared_service_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  entitlement_id UUID,
  service_id TEXT NOT NULL CHECK (service_id IN ('central_curriculum', 'central_textbooks', 'central_vehicle_tracking')),
  operation TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  caller_kind TEXT NOT NULL CHECK (caller_kind IN ('tenant_user', 'internal_service')),
  units INTEGER NOT NULL DEFAULT 1 CHECK (units > 0),
  http_status INTEGER NOT NULL,
  correlation_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX production_shared_service_usage_tenant_idx
  ON production.shared_service_usage_metrics (tenant_id, service_id, recorded_at DESC);

-- =========================================================================
-- 4. INSTANCE-LEVEL QUESTION BANK & ASSESSMENTS (Strictly School-Owned)
-- =========================================================================

CREATE TABLE production.instance_question_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  subject_reference_id TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, name),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.instance_question_bank_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  category_id UUID,
  subject_reference_id TEXT NOT NULL,
  class_grade_name TEXT NOT NULL,
  curriculum_version_id TEXT NOT NULL DEFAULT 'NERDC-9YEAR-BASIC-2024',
  topic_reference_id TEXT NOT NULL DEFAULT 'general',
  learning_objective_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(learning_objective_ids) = 'array'),
  question_type TEXT NOT NULL CHECK (question_type IN ('objective', 'theory', 'practical', 'calculation')),
  stem TEXT NOT NULL CHECK (length(trim(stem)) >= 1),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  marking_rubric JSONB,
  marks INTEGER NOT NULL DEFAULT 2 CHECK (marks > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  cognitive_demand TEXT NOT NULL DEFAULT 'Application',
  source_type TEXT NOT NULL DEFAULT 'teacher_authored'
    CHECK (source_type IN ('verified_past_question', 'official_sample', 'teacher_authored', 'ai_practice', 'imported_unverified')),
  source_reference TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  creation_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (creation_method IN ('ai_assisted', 'manual', 'imported')),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('draft', 'pending_review', 'approved', 'rejected')),
  reviewer_id TEXT,
  approval_timestamp TIMESTAMPTZ,
  exposure_count INTEGER NOT NULL DEFAULT 0 CHECK (exposure_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id, category_id)
    REFERENCES production.instance_question_categories (tenant_id, application_instance_id, id) ON DELETE SET NULL
);
CREATE INDEX production_instance_qb_filter_idx
  ON production.instance_question_bank_items (tenant_id, application_instance_id, subject_reference_id, class_grade_name, question_type, review_status);

CREATE TABLE production.instance_assessment_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 240),
  subject_reference_id TEXT NOT NULL,
  class_grade_name TEXT NOT NULL,
  term TEXT NOT NULL,
  curriculum_version_id TEXT NOT NULL,
  assessment_type TEXT NOT NULL
    CHECK (assessment_type IN ('quiz', 'test', 'exam', 'continuous_assessment')),
  question_formats_count JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(question_formats_count) = 'object'),
  total_marks INTEGER NOT NULL CHECK (total_marks > 0),
  difficulty_mix JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(difficulty_mix) = 'object'),
  time_allowance_minutes INTEGER NOT NULL DEFAULT 60 CHECK (time_allowance_minutes > 0),
  allow_verified_past_questions BOOLEAN NOT NULL DEFAULT true,
  allow_ai_practice_questions BOOLEAN NOT NULL DEFAULT true,
  completed_topics_only BOOLEAN NOT NULL DEFAULT false,
  selected_topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(selected_topic_ids) = 'array'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'archived')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE production.instance_exam_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  blueprint_id UUID,
  exam_code TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 240),
  subject_reference_id TEXT NOT NULL,
  class_grade_name TEXT NOT NULL,
  term TEXT NOT NULL,
  academic_session TEXT NOT NULL DEFAULT '2026/2027',
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  total_marks INTEGER NOT NULL DEFAULT 100 CHECK (total_marks > 0),
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(instructions) = 'array'),
  selected_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(selected_question_ids) = 'array'),
  generation_hash TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  authorized_by_principal BOOLEAN NOT NULL DEFAULT false,
  authorized_by TEXT,
  authorized_at TIMESTAMPTZ,
  marking_scheme_unlocked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, application_instance_id, exam_code),
  UNIQUE (tenant_id, application_instance_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id, blueprint_id)
    REFERENCES production.instance_assessment_blueprints (tenant_id, application_instance_id, id) ON DELETE SET NULL
);

CREATE TABLE production.instance_assessment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_instance_id UUID NOT NULL,
  exam_configuration_id UUID NOT NULL,
  student_id UUID,
  student_identifier TEXT NOT NULL,
  score_obtained NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(responses) = 'object'),
  graded_by TEXT,
  graded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, application_instance_id)
    REFERENCES production.application_instances (tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, application_instance_id, exam_configuration_id)
    REFERENCES production.instance_exam_configurations (tenant_id, application_instance_id, id) ON DELETE CASCADE
);
CREATE INDEX production_instance_assessment_records_exam_idx
  ON production.instance_assessment_records (tenant_id, application_instance_id, exam_configuration_id);

-- =========================================================================
-- 5. INSTANCE-LEVEL QUESTION BANK PERMISSIONS
-- =========================================================================

INSERT INTO production.permissions (code, description) VALUES
  ('question_bank.read', 'Read school-owned Question Bank items and categories'),
  ('question_bank.manage', 'Create, update and delete school-owned Question Bank items'),
  ('question_bank.review', 'Review and approve school-owned Question Bank items'),
  ('assessments.read', 'Read school assessment blueprints, exam configurations and records'),
  ('assessments.manage', 'Manage school assessment blueprints, exam configurations and records')
ON CONFLICT (code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT 'tenant_admin', code
FROM production.permissions
WHERE code IN (
  'question_bank.read',
  'question_bank.manage',
  'question_bank.review',
  'assessments.read',
  'assessments.manage'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO production.role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES
  ('proprietor', 'question_bank.read'),
  ('proprietor', 'assessments.read'),
  ('principal', 'question_bank.read'),
  ('principal', 'question_bank.manage'),
  ('principal', 'question_bank.review'),
  ('principal', 'assessments.read'),
  ('principal', 'assessments.manage'),
  ('principal_administrator', 'question_bank.read'),
  ('principal_administrator', 'question_bank.manage'),
  ('principal_administrator', 'question_bank.review'),
  ('principal_administrator', 'assessments.read'),
  ('principal_administrator', 'assessments.manage'),
  ('vice_principal_academic', 'question_bank.read'),
  ('vice_principal_academic', 'question_bank.review'),
  ('vice_principal_academic', 'assessments.read'),
  ('vice_principal_academic', 'assessments.manage'),
  ('examination_officer', 'question_bank.read'),
  ('examination_officer', 'question_bank.review'),
  ('examination_officer', 'assessments.read'),
  ('examination_officer', 'assessments.manage'),
  ('academic_coordinator', 'question_bank.read'),
  ('academic_coordinator', 'assessments.read'),
  ('department_head', 'question_bank.read'),
  ('department_head', 'question_bank.review'),
  ('department_head', 'assessments.read'),
  ('teacher', 'question_bank.read'),
  ('teacher', 'question_bank.manage'),
  ('teacher', 'assessments.read'),
  ('subject_teacher', 'question_bank.read'),
  ('subject_teacher', 'question_bank.manage'),
  ('subject_teacher', 'assessments.read'),
  ('staff', 'question_bank.read'),
  ('staff', 'assessments.read')
) AS grants(role_code, permission_code)
WHERE EXISTS (SELECT 1 FROM production.roles r WHERE r.code = grants.role_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- =========================================================================
-- 6. ROW-LEVEL SECURITY (Forced Across Every Table)
-- =========================================================================

-- A. Central curriculum tables: tenants with verified tenant context can read;
--    ONLY verified control-plane editorial admin context can insert/update/delete.
DO $$
DECLARE
  tbl TEXT;
  central_curriculum_tables TEXT[] := ARRAY[
    'production.curriculum_countries',
    'production.curriculum_education_authorities',
    'production.curriculum_frameworks',
    'production.curriculum_education_levels',
    'production.curriculum_class_grades',
    'production.curriculum_subject_classifications',
    'production.curriculum_subjects',
    'production.curriculum_versions',
    'production.curriculum_version_subjects',
    'production.curriculum_themes',
    'production.curriculum_topics',
    'production.curriculum_subtopics',
    'production.curriculum_learning_objectives',
    'production.curriculum_standards',
    'production.curriculum_change_history'
  ];
BEGIN
  FOREACH tbl IN ARRAY central_curriculum_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY central_curriculum_verified_read ON %s
      FOR SELECT
      USING (
        production.is_verified_control_plane_context()
        OR production.current_tenant_id() IS NOT NULL
      )', tbl);
    EXECUTE format('CREATE POLICY central_curriculum_control_plane_write ON %s
      FOR ALL
      USING (production.is_verified_control_plane_context())
      WITH CHECK (production.is_verified_control_plane_context())', tbl);
  END LOOP;
END $$;

-- B. Central textbook tables: control-plane editorial admin has full access;
--    tenants can ONLY read published textbooks & their children & entitled media,
--    and NEVER editorial reviews or generation jobs.
DO $$
DECLARE
  tbl TEXT;
  all_central_textbook_tables TEXT[] := ARRAY[
    'production.central_publishers',
    'production.central_authors',
    'production.central_textbooks',
    'production.central_textbook_contributors',
    'production.central_textbook_versions',
    'production.central_textbook_chapters',
    'production.central_textbook_sections',
    'production.central_textbook_content_blocks',
    'production.central_textbook_objective_mappings',
    'production.central_textbook_media_assets',
    'production.central_textbook_citations',
    'production.central_textbook_editorial_reviews',
    'production.central_textbook_coverage_manifests',
    'production.central_textbook_generation_jobs'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_central_textbook_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY central_textbook_control_plane_all ON %s
      FOR ALL
      USING (production.is_verified_control_plane_context())
      WITH CHECK (production.is_verified_control_plane_context())', tbl);
  END LOOP;
END $$;

CREATE POLICY central_publishers_tenant_read ON production.central_publishers
  FOR SELECT USING (production.current_tenant_id() IS NOT NULL);
CREATE POLICY central_authors_tenant_read ON production.central_authors
  FOR SELECT USING (production.current_tenant_id() IS NOT NULL);

CREATE POLICY central_textbooks_tenant_published_read ON production.central_textbooks
  FOR SELECT
  USING (production.current_tenant_id() IS NOT NULL AND publication_status = 'published');

CREATE POLICY central_textbook_contributors_tenant_read ON production.central_textbook_contributors
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_versions_tenant_read ON production.central_textbook_versions
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND publication_status = 'published'
  );

CREATE POLICY central_textbook_chapters_tenant_read ON production.central_textbook_chapters
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_sections_tenant_read ON production.central_textbook_sections
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_blocks_tenant_read ON production.central_textbook_content_blocks
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_obj_map_tenant_read ON production.central_textbook_objective_mappings
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_media_tenant_read ON production.central_textbook_media_assets
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND access_scope = 'entitled_private'
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_citations_tenant_read ON production.central_textbook_citations
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

CREATE POLICY central_textbook_coverage_tenant_read ON production.central_textbook_coverage_manifests
  FOR SELECT
  USING (
    production.current_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM production.central_textbooks tb
      WHERE tb.id = textbook_id AND tb.publication_status = 'published'
    )
  );

-- C. Shared Service Usage Metrics: tenant read/write own metrics; control-plane read/audit all.
ALTER TABLE production.shared_service_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.shared_service_usage_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY shared_service_usage_tenant_rw ON production.shared_service_usage_metrics
  FOR ALL
  USING (
    tenant_id = production.current_tenant_id()::uuid
    OR production.is_verified_control_plane_context()
  )
  WITH CHECK (
    tenant_id = production.current_tenant_id()::uuid
    OR production.is_verified_control_plane_context()
  );

-- D. School-Instance Question Bank & Assessment Tables: STRICTLY tenant-owned.
--    Neither central services nor cross-tenant callers can read or write these rows.
DO $$
DECLARE
  tbl TEXT;
  instance_qb_tables TEXT[] := ARRAY[
    'production.instance_question_categories',
    'production.instance_question_bank_items',
    'production.instance_assessment_blueprints',
    'production.instance_exam_configurations',
    'production.instance_assessment_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY instance_qb_tables LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY instance_qb_strict_tenant_isolation ON %s
      FOR ALL
      USING (tenant_id = production.current_tenant_id()::uuid)
      WITH CHECK (tenant_id = production.current_tenant_id()::uuid)', tbl);
  END LOOP;
END $$;
