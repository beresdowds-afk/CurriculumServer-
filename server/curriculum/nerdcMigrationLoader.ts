import type { SubjectCurriculum } from '../../src/types';
import { NERDC_SUBJECTS_DATABASE } from '../../src/data/nerdcDatabase';
import type { DatabasePool } from '../db/postgres';
import { withControlPlaneTransaction, type VerifiedTenantPrincipal } from '../db/tenantContext';

export interface CurriculumMigrationReport {
  countriesCreatedOrUpdated: number;
  authoritiesCreatedOrUpdated: number;
  frameworksCreatedOrUpdated: number;
  versionsCreatedOrUpdated: number;
  subjectsMigrated: number;
  themesMigrated: number;
  topicsMigrated: number;
  subtopicsMigrated: number;
  objectivesMigrated: number;
  standardsMigrated: number;
  isOfficialVerified: boolean;
  provenanceOrigin: string;
}

const CLASSIFICATION_METADATA: Record<string, { id: string; name: string; description: string }> = {
  core: { id: 'cls-core', name: 'Core Compulsory Subjects', description: 'Compulsory national core curriculum subjects' },
  science_math: { id: 'cls-science-math', name: 'Science & Mathematics', description: 'STEM, pure sciences and mathematics subjects' },
  humanities: { id: 'cls-humanities', name: 'Humanities & Social Sciences', description: 'Literature, history, government, civic and religious studies' },
  business: { id: 'cls-business', name: 'Business & Commercial Studies', description: 'Accounting, commerce, economics and business studies' },
  technology: { id: 'cls-technology', name: 'Technology & Engineering', description: 'Basic technology, technical drawing, ICT and computer studies' },
  trade_entrepreneurship: { id: 'cls-trade-entrepreneurship', name: 'Trade & Entrepreneurship', description: 'Applied trades and entrepreneurship curriculum subjects' },
  vocational: { id: 'cls-vocational', name: 'Vocational Education', description: 'Pre-vocational and applied vocational studies' }
};

function gradeIdFor(frameworkId: string, gradeName: string): string {
  return `${frameworkId}:grade-${gradeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export async function migrateNerdcDatasetsToPostgres(
  pool: DatabasePool,
  actor: VerifiedTenantPrincipal,
  datasets: readonly SubjectCurriculum[] = NERDC_SUBJECTS_DATABASE
): Promise<CurriculumMigrationReport> {
  const actorName = actor.email || actor.userId || 'central_curriculum_migrator';
  return withControlPlaneTransaction(pool, actor, async client => {
    // 1. Seed Country & Authority (explicitly data-driven; schema supports any country/authority)
    await client.query(
      `INSERT INTO production.curriculum_countries (id, iso_code, name, jurisdiction_type, region)
       VALUES ('country-ng', 'NG', 'Nigeria', 'country', 'West Africa')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region`
    );
    await client.query(
      `INSERT INTO production.curriculum_education_authorities
         (id, country_id, code, name, authority_type, official_url)
       VALUES
         ('auth-nerdc', 'country-ng', 'NERDC', 'Nigerian Educational Research and Development Council', 'national', 'https://www.nerdc.gov.ng')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, official_url = EXCLUDED.official_url`
    );

    // 2. Frameworks
    await client.query(
      `INSERT INTO production.curriculum_frameworks
         (id, country_id, authority_id, code, name, description, status)
       VALUES
         ('fw-nerdc-9yr-basic', 'country-ng', 'auth-nerdc', 'NERDC-9YR-BASIC',
          'NERDC 9-Year Basic Education Curriculum (JSS 1-3)',
          'Junior Secondary segment of the Nigerian 9-Year Basic Education Curriculum.', 'active'),
         ('fw-nerdc-ssec', 'country-ng', 'auth-nerdc', 'NERDC-SSEC',
          'NERDC New Senior Secondary Education Curriculum (SS 1-3)',
          'Senior Secondary Education Curriculum covering Science, Humanities, Business, Technology and Trade fields.', 'active')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`
    );

    // 3. Education Levels & Class Grades
    await client.query(
      `INSERT INTO production.curriculum_education_levels (id, framework_id, code, name, sort_order)
       VALUES
         ('lvl-jss', 'fw-nerdc-9yr-basic', 'jss', 'Junior Secondary School', 1),
         ('lvl-sss', 'fw-nerdc-ssec', 'sss', 'Senior Secondary School', 2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`
    );

    const grades = [
      { id: gradeIdFor('fw-nerdc-9yr-basic', 'JSS 1'), fw: 'fw-nerdc-9yr-basic', lvl: 'lvl-jss', code: 'JSS1', name: 'JSS 1', sort: 1 },
      { id: gradeIdFor('fw-nerdc-9yr-basic', 'JSS 2'), fw: 'fw-nerdc-9yr-basic', lvl: 'lvl-jss', code: 'JSS2', name: 'JSS 2', sort: 2 },
      { id: gradeIdFor('fw-nerdc-9yr-basic', 'JSS 3'), fw: 'fw-nerdc-9yr-basic', lvl: 'lvl-jss', code: 'JSS3', name: 'JSS 3', sort: 3 },
      { id: gradeIdFor('fw-nerdc-ssec', 'SS 1'), fw: 'fw-nerdc-ssec', lvl: 'lvl-sss', code: 'SS1', name: 'SS 1', sort: 4 },
      { id: gradeIdFor('fw-nerdc-ssec', 'SS 2'), fw: 'fw-nerdc-ssec', lvl: 'lvl-sss', code: 'SS2', name: 'SS 2', sort: 5 },
      { id: gradeIdFor('fw-nerdc-ssec', 'SS 3'), fw: 'fw-nerdc-ssec', lvl: 'lvl-sss', code: 'SS3', name: 'SS 3', sort: 6 }
    ];
    for (const g of grades) {
      await client.query(
        `INSERT INTO production.curriculum_class_grades
           (id, framework_id, education_level_id, code, name, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
        [g.id, g.fw, g.lvl, g.code, g.name, g.sort]
      );
    }

    // 4. Classifications
    for (const [code, meta] of Object.entries(CLASSIFICATION_METADATA)) {
      await client.query(
        `INSERT INTO production.curriculum_subject_classifications (id, code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [meta.id, code, meta.name, meta.description]
      );
    }

    // 5. Versions (explicitly tagged as migrated TS baseline, NOT claimed externally verified gazette!)
    const provenance = {
      origin: 'nerdc_typescript_baseline_migration',
      verifiedOfficialGazette: false,
      note: 'Migrated from application TypeScript datasets; pending official authority gazette verification.'
    };
    const versions = [
      {
        id: 'NERDC-9YEAR-BASIC-2024',
        frameworkId: 'fw-nerdc-9yr-basic',
        versionTag: '2024.1-baseline',
        title: 'NERDC 9-Year Basic Education (JSS 1-3) Migrated Baseline',
        applicability: { academicSessions: ['2024/2025', '2025/2026', '2026/2027'], levels: ['jss'] }
      },
      {
        id: 'NERDC-SSEC-2024',
        frameworkId: 'fw-nerdc-ssec',
        versionTag: '2024.1-baseline',
        title: 'NERDC Senior Secondary Education Curriculum (SS 1-3) Migrated Baseline',
        applicability: { academicSessions: ['2024/2025', '2025/2026', '2026/2027'], levels: ['sss'] }
      }
    ];
    for (const v of versions) {
      await client.query(
        `INSERT INTO production.curriculum_versions
           (id, framework_id, version_tag, title, academic_applicability, release_date, effective_from,
            status, editorial_approval_status, approved_by, approved_at, is_official_verified,
            source_provenance, created_by)
         VALUES ($1, $2, $3, $4, $5::jsonb, '2024-09-01T00:00:00Z', '2024-09-01T00:00:00Z',
                 'published', 'approved', $6, now(), false, $7::jsonb, $6)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           source_provenance = EXCLUDED.source_provenance,
           is_official_verified = false,
           updated_at = now()`,
        [v.id, v.frameworkId, v.versionTag, v.title, JSON.stringify(v.applicability), actorName, JSON.stringify(provenance)]
      );
    }

    let subjectsMigrated = 0;
    let themesMigrated = 0;
    let topicsMigrated = 0;
    let subtopicsMigrated = 0;
    let objectivesMigrated = 0;
    let standardsMigrated = 0;

    for (const subject of datasets) {
      const frameworkId = subject.level === 'jss' ? 'fw-nerdc-9yr-basic' : 'fw-nerdc-ssec';
      const educationLevelId = subject.level === 'jss' ? 'lvl-jss' : 'lvl-sss';
      const versionId = subject.level === 'jss' ? 'NERDC-9YEAR-BASIC-2024' : 'NERDC-SSEC-2024';
      const classification = CLASSIFICATION_METADATA[subject.field] || CLASSIFICATION_METADATA.core;

      await client.query(
        `INSERT INTO production.curriculum_subjects
           (id, framework_id, education_level_id, classification_id, code, name, description,
            is_compulsory, recommended_periods_per_week, official_source_url,
            target_grades, general_objectives, recommended_textbooks, equipment_requirements, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, 'active')
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           target_grades = EXCLUDED.target_grades,
           general_objectives = EXCLUDED.general_objectives,
           recommended_textbooks = EXCLUDED.recommended_textbooks,
           equipment_requirements = EXCLUDED.equipment_requirements,
           updated_at = now()`,
        [
          subject.id,
          frameworkId,
          educationLevelId,
          classification.id,
          subject.code,
          subject.name,
          subject.description,
          subject.isCompulsory,
          subject.recommendedPeriodsPerWeek,
          subject.officialSourceUrl || '',
          JSON.stringify(subject.targetGrades || []),
          JSON.stringify(subject.generalObjectives || []),
          JSON.stringify(subject.recommendedTextbooks || []),
          JSON.stringify(subject.equipmentAndLabRequirements || [])
        ]
      );

      const gradeIds = (subject.targetGrades || []).map(g => gradeIdFor(frameworkId, g));
      await client.query(
        `INSERT INTO production.curriculum_version_subjects
           (curriculum_version_id, subject_id, class_grade_ids)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (curriculum_version_id, subject_id) DO UPDATE SET
           class_grade_ids = EXCLUDED.class_grade_ids`,
        [versionId, subject.id, JSON.stringify(gradeIds)]
      );
      subjectsMigrated += 1;

      for (const theme of subject.themes || []) {
        const themeDbId = `${versionId}:${subject.id}:${theme.id}`;
        await client.query(
          `INSERT INTO production.curriculum_themes
             (id, curriculum_version_id, subject_id, source_theme_id, theme_number, title, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             theme_number = EXCLUDED.theme_number,
             title = EXCLUDED.title,
             description = EXCLUDED.description`,
          [themeDbId, versionId, subject.id, theme.id, theme.themeNumber, theme.title, theme.description || '']
        );
        themesMigrated += 1;

        for (const topic of theme.topics || []) {
          const topicDbId = `${versionId}:${subject.id}:${topic.id}`;
          const classGradeId = gradeIdFor(frameworkId, topic.classGrade);
          await client.query(
            `INSERT INTO production.curriculum_topics
               (id, curriculum_version_id, subject_id, theme_id, class_grade_id, source_topic_id,
                class_grade_name, term, week, title, content_details, teacher_activities,
                student_activities, teaching_materials, evaluation_guide, practical_workshop_notes,
                competency_domain, exam_relevance)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17, $18::jsonb)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               week = EXCLUDED.week,
               term = EXCLUDED.term,
               content_details = EXCLUDED.content_details,
               exam_relevance = EXCLUDED.exam_relevance`,
            [
              topicDbId,
              versionId,
              subject.id,
              themeDbId,
              classGradeId,
              topic.id,
              topic.classGrade,
              topic.term,
              topic.week || 1,
              topic.title,
              JSON.stringify(topic.contentDetails || []),
              JSON.stringify(topic.teacherActivities || []),
              JSON.stringify(topic.studentActivities || []),
              JSON.stringify(topic.teachingMaterials || []),
              JSON.stringify(topic.evaluationGuide || []),
              topic.practicalWorkshopNotes || null,
              topic.competencyDomain || null,
              JSON.stringify(topic.examRelevance || {})
            ]
          );
          topicsMigrated += 1;

          for (let sIdx = 0; sIdx < (topic.subTopics || []).length; sIdx += 1) {
            const subTitle = topic.subTopics[sIdx];
            const subId = `${topicDbId}:sub-${sIdx + 1}`;
            await client.query(
              `INSERT INTO production.curriculum_subtopics
                 (id, curriculum_version_id, topic_id, sort_order, title, description)
               VALUES ($1, $2, $3, $4, $5, '')
               ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order`,
              [subId, versionId, topicDbId, sIdx + 1, subTitle]
            );
            subtopicsMigrated += 1;
          }

          for (let oIdx = 0; oIdx < (topic.performanceObjectives || []).length; oIdx += 1) {
            const objText = topic.performanceObjectives[oIdx];
            const objId = `${topicDbId}:obj-${oIdx + 1}`;
            await client.query(
              `INSERT INTO production.curriculum_learning_objectives
                 (id, curriculum_version_id, topic_id, objective_type, sort_order, description)
               VALUES ($1, $2, $3, 'performance', $4, $5)
               ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order`,
              [objId, versionId, topicDbId, oIdx + 1, objText]
            );
            objectivesMigrated += 1;
          }

          if (topic.competencyDomain || (topic.evaluationGuide && topic.evaluationGuide.length > 0)) {
            await client.query(
              `INSERT INTO central_curriculum.curriculum_competencies
                 (id, curriculum_version_id, subject_id, topic_id, competency_code,
                  competency_type, title, description, assessment_criteria, progression_level)
               VALUES ($1, $2, $3, $4, $5, 'competency', $6, $7, $8::jsonb, $9)
               ON CONFLICT (id) DO UPDATE SET
                 title = EXCLUDED.title,
                 description = EXCLUDED.description,
                 assessment_criteria = EXCLUDED.assessment_criteria`,
              [
                `${topicDbId}:comp-1`,
                versionId,
                subject.id,
                topicDbId,
                `COMP-${subject.code}-${topic.id}`,
                topic.competencyDomain || `${topic.title} Mastery`,
                `Mastery and applied understanding of ${topic.title} (${topic.classGrade}).`,
                JSON.stringify(topic.evaluationGuide || []),
                topic.classGrade
              ]
            );
          }

          if (topic.examRelevance) {
            for (const body of ['bece', 'waec', 'neco', 'jamb'] as const) {
              if (topic.examRelevance[body]) {
                const stdId = `${topicDbId}:std-${body}`;
                await client.query(
                  `INSERT INTO production.curriculum_standards
                     (id, framework_id, curriculum_version_id, subject_id, topic_id, standard_code, title, description, exam_body)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
                  [
                    stdId,
                    frameworkId,
                    versionId,
                    subject.id,
                    topicDbId,
                    `${body.toUpperCase()}-${subject.code}-${topic.id}`,
                    `${body.toUpperCase()} Syllabus Alignment: ${topic.title}`,
                    (topic.examRelevance.commonExamAreas || []).join('; '),
                    body.toUpperCase()
                  ]
                );
                standardsMigrated += 1;
              }
            }
          }
        }
      }
    }

    for (const v of versions) {
      await client.query(
        `INSERT INTO central_curriculum.curriculum_source_documents
           (id, authority_id, framework_id, curriculum_version_id, document_title, document_code,
            source_url, publication_year, provenance_metadata, is_official_gazette, imported_by)
         VALUES ($1, 'auth-nerdc', $2, $3, $4, $5, 'https://www.nerdc.gov.ng', '2024', $6::jsonb, false, $7)
         ON CONFLICT (id) DO UPDATE SET
           document_title = EXCLUDED.document_title,
           provenance_metadata = EXCLUDED.provenance_metadata`,
        [
          `src-${v.id}`,
          v.frameworkId,
          v.id,
          `${v.title} (TypeScript Baseline Import)`,
          v.id,
          JSON.stringify(provenance),
          actorName
        ]
      );
      await client.query(
        `INSERT INTO production.curriculum_change_history
           (curriculum_version_id, entity_type, entity_id, change_type, summary, diff_payload, actor)
         VALUES ($1, 'curriculum_dataset', $1, 'migrated', $2, $3::jsonb, $4)`,
        [
          v.id,
          `Idempotent migration of TypeScript NERDC dataset (${subjectsMigrated} subjects, ${topicsMigrated} topics, ${objectivesMigrated} objectives total across baseline).`,
          JSON.stringify({ subjectsMigrated, themesMigrated, topicsMigrated, subtopicsMigrated, objectivesMigrated, isOfficialVerified: false }),
          actorName
        ]
      );
    }

    return {
      countriesCreatedOrUpdated: 1,
      authoritiesCreatedOrUpdated: 1,
      frameworksCreatedOrUpdated: 2,
      versionsCreatedOrUpdated: versions.length,
      subjectsMigrated,
      themesMigrated,
      topicsMigrated,
      subtopicsMigrated,
      objectivesMigrated,
      standardsMigrated,
      isOfficialVerified: false,
      provenanceOrigin: provenance.origin
    };
  });
}
