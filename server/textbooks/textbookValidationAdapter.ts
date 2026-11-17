import type { CurriculumTopicRecord } from '../curriculum/centralCurriculumTypes';
import type {
  CentralTextbookDetail,
  CentralTextbookValidationFinding
} from './centralTextbookTypes';

export interface TextbookValidationResult {
  overallPassed: boolean;
  readinessScore: number;
  findings: CentralTextbookValidationFinding[];
  summary: {
    errorCount: number;
    warningCount: number;
    chapterCount: number;
    sectionCount: number;
    coveredTopicCount: number;
    requiredTopicCount: number;
    mappedObjectiveCount: number;
    requiredObjectiveCount: number;
  };
}

/**
 * Automated Central Textbook Quality & Curriculum Grounding Validator.
 * Evaluates structural completeness, curriculum alignment, vocabulary appropriateness,
 * illustration consistency, citations, and duplicate detection prior to editorial sign-off.
 */
export class TextbookContentValidationAdapter {
  validate(
    textbook: CentralTextbookDetail,
    requiredTopics: CurriculumTopicRecord[] = []
  ): TextbookValidationResult {
    const findings: CentralTextbookValidationFinding[] = [];

    const requiredTopicIds = new Set(requiredTopics.map(t => t.id));
    const requiredObjectiveIds = new Set(requiredTopics.flatMap(t => t.objectives.map(o => o.id)));

    const chapterNumbers = new Set<number>();
    const chapterTitles = new Set<string>();
    const coveredTopicIds = new Set<string>();
    const coveredObjectiveIds = new Set<string>(
      textbook.objectiveMappings.map(m => m.learningObjectiveId)
    );

    let sectionCount = 0;

    if (textbook.chapters.length === 0) {
      findings.push({
        code: 'NO_CHAPTERS',
        severity: 'error',
        category: 'incomplete_chapter_structure',
        message: 'Textbook contains zero chapters.'
      });
    }

    for (const ch of textbook.chapters) {
      if (chapterNumbers.has(ch.chapterNumber)) {
        findings.push({
          code: 'DUPLICATE_CHAPTER_NUMBER',
          severity: 'error',
          category: 'duplicate_chapters',
          chapterId: ch.id,
          message: `Duplicate chapter number ${ch.chapterNumber} detected ("${ch.title}").`
        });
      }
      chapterNumbers.add(ch.chapterNumber);

      const normTitle = ch.title.trim().toLowerCase();
      if (chapterTitles.has(normTitle)) {
        findings.push({
          code: 'DUPLICATE_CHAPTER_TITLE',
          severity: 'error',
          category: 'duplicate_chapters',
          chapterId: ch.id,
          message: `Duplicate chapter title "${ch.title}".`
        });
      }
      chapterTitles.add(normTitle);

      for (const tId of ch.topicIds) coveredTopicIds.add(tId);
      for (const oId of ch.learningObjectiveIds) coveredObjectiveIds.add(oId);

      if (!ch.sections || ch.sections.length === 0) {
        findings.push({
          code: 'CHAPTER_MISSING_SECTIONS',
          severity: 'error',
          category: 'incomplete_chapter_structure',
          chapterId: ch.id,
          message: `Chapter ${ch.chapterNumber} ("${ch.title}") has no generated or authored sections.`
        });
        continue;
      }

      const sectionNumbers = new Set<number>();
      for (const sec of ch.sections) {
        sectionCount += 1;
        if (sectionNumbers.has(sec.sectionNumber)) {
          findings.push({
            code: 'DUPLICATE_SECTION_NUMBER',
            severity: 'error',
            category: 'duplicate_chapters',
            chapterId: ch.id,
            sectionId: sec.id,
            message: `Chapter ${ch.chapterNumber} contains duplicate section number ${sec.sectionNumber}.`
          });
        }
        sectionNumbers.add(sec.sectionNumber);

        const body = (sec.contentMarkdown || '').trim();
        if (body.length < 40) {
          findings.push({
            code: 'SECTION_EXPLANATION_TOO_SHORT',
            severity: 'error',
            category: 'contradictory_explanations',
            chapterId: ch.id,
            sectionId: sec.id,
            message: `Section "${sec.title}" lacks substantive lesson explanation (${body.length} chars).`
          });
        }

        if (sec.examples.length === 0 && sec.workedSolutions.length === 0) {
          findings.push({
            code: 'SECTION_MISSING_EXAMPLES',
            severity: 'warning',
            category: 'incomplete_chapter_structure',
            chapterId: ch.id,
            sectionId: sec.id,
            message: `Section "${sec.title}" does not include worked examples or solutions.`
          });
        }

        if (sec.keyVocabulary.length === 0) {
          findings.push({
            code: 'SECTION_MISSING_VOCABULARY',
            severity: 'warning',
            category: 'vocabulary_suitability',
            chapterId: ch.id,
            sectionId: sec.id,
            message: `Section "${sec.title}" has no key vocabulary glossary terms for ${textbook.classGradeName}.`
          });
        }

        for (const ill of sec.illustrationSpecs || []) {
          if (!ill.conceptDescription?.trim() || !ill.caption?.trim() || !Array.isArray(ill.labels) || ill.labels.length === 0) {
            findings.push({
              code: 'ILLUSTRATION_METADATA_INCOMPLETE',
              severity: 'warning',
              category: 'illustration_inconsistency',
              chapterId: ch.id,
              sectionId: sec.id,
              message: `Illustration in "${sec.title}" lacks concept description, caption, or diagram labels.`
            });
          }
        }
      }
    }

    // Check required curriculum topics & objectives coverage
    if (requiredTopicIds.size > 0) {
      const missingTopics = [...requiredTopicIds].filter(id => !coveredTopicIds.has(id));
      if (missingTopics.length > 0) {
        findings.push({
          code: 'MISSING_CURRICULUM_TOPICS',
          severity: 'error',
          category: 'missing_curriculum_topics',
          message: `${missingTopics.length} required curriculum topic(s) for ${textbook.classGradeName} are missing from chapters.`
        });
      }
    }

    if (requiredObjectiveIds.size > 0) {
      const missingObjectives = [...requiredObjectiveIds].filter(id => !coveredObjectiveIds.has(id));
      if (missingObjectives.length > 0) {
        findings.push({
          code: 'MISSING_LEARNING_OUTCOMES',
          severity: missingObjectives.length === requiredObjectiveIds.size ? 'error' : 'warning',
          category: 'missing_learning_outcomes',
          message: `${missingObjectives.length} curriculum learning objective(s) are not yet mapped to textbook chapters/sections.`
        });
      }
    }

    if (textbook.citations.length === 0 && textbook.provenanceKind === 'ai_generated') {
      findings.push({
        code: 'MISSING_CITATIONS',
        severity: 'warning',
        category: 'unsupported_claims',
        message: 'Textbook should cite at least one authoritative curriculum source reference before publication.'
      });
    }

    for (const ill of textbook.illustrations || []) {
      if (!ill.sectionId || !ill.lessonConsistencyVerified) {
        findings.push({
          code: 'ILLUSTRATION_UNLINKED_OR_UNVERIFIED',
          severity: 'warning',
          category: 'illustration_inconsistency',
          chapterId: ill.chapterId || undefined,
          sectionId: ill.sectionId || undefined,
          message: `Illustration "${ill.caption || ill.conceptDescription}" requires section consistency verification.`
        });
      }
    }

    const errorCount = findings.filter(f => f.severity === 'error').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;
    const rawScore = Math.max(0, 100 - errorCount * 20 - warningCount * 5);
    const overallPassed = errorCount === 0;

    return {
      overallPassed,
      readinessScore: Number(rawScore.toFixed(2)),
      findings,
      summary: {
        errorCount,
        warningCount,
        chapterCount: textbook.chapters.length,
        sectionCount,
        coveredTopicCount: coveredTopicIds.size,
        requiredTopicCount: requiredTopicIds.size,
        mappedObjectiveCount: coveredObjectiveIds.size,
        requiredObjectiveCount: requiredObjectiveIds.size
      }
    };
  }
}
