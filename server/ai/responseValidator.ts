import type { AiTaskType } from '../../packages/shared-types/src/aiGatewayContracts';
import { AiGatewayError } from './types';

function parseStrictJson(rawText: string, taskType: AiTaskType): unknown {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiGatewayError(
      'INVALID_AI_RESPONSE',
      `AI provider returned invalid JSON for task '${taskType}'.`,
      502,
      { taskType }
    );
  }
}

function assertObject(val: unknown, taskType: AiTaskType): Record<string, unknown> {
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    throw new AiGatewayError(
      'INVALID_AI_RESPONSE',
      `Expected JSON object from AI provider for task '${taskType}'.`,
      502,
      { taskType }
    );
  }
  return val as Record<string, unknown>;
}

function assertNonEmptyString(val: unknown, field: string, taskType: AiTaskType): string {
  if (typeof val !== 'string' || !val.trim()) {
    throw new AiGatewayError(
      'INVALID_AI_RESPONSE',
      `AI response for '${taskType}' is missing required text field '${field}'.`,
      502,
      { taskType, field }
    );
  }
  return val.trim();
}

function assertNonEmptyArray(val: unknown, field: string, taskType: AiTaskType): unknown[] {
  if (!Array.isArray(val) || val.length === 0) {
    throw new AiGatewayError(
      'INVALID_AI_RESPONSE',
      `AI response for '${taskType}' must contain a non-empty '${field}' array.`,
      502,
      { taskType, field }
    );
  }
  return val;
}

/**
 * Validates and normalizes Gemini outputs per task type before returning to calling applications.
 * Prevents malformed or incomplete LLM payloads from entering persistence or client state.
 */
export function validateAiResponse(taskType: AiTaskType, rawText: string): unknown {
  if (taskType === 'curriculum_tutor') {
    const answer = rawText.trim();
    if (!answer) {
      throw new AiGatewayError('INVALID_AI_RESPONSE', 'Curriculum advisor returned an empty response.', 502);
    }
    return { answer, response: answer };
  }

  const parsed = parseStrictJson(rawText, taskType);

  switch (taskType) {
    case 'lesson_note': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.subject, 'subject', taskType);
      assertNonEmptyString(obj.topic, 'topic', taskType);
      assertNonEmptyArray(obj.behavioralObjectives, 'behavioralObjectives', taskType);
      assertNonEmptyArray(obj.presentationSteps, 'presentationSteps', taskType);
      return obj;
    }

    case 'scheme_of_work': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.subject, 'subject', taskType);
      assertNonEmptyArray(obj.weeks, 'weeks', taskType);
      return obj;
    }

    case 'adaptive_remedial': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.topicTitle, 'topicTitle', taskType);
      assertNonEmptyString(obj.weaknessIdentified, 'weaknessIdentified', taskType);
      assertNonEmptyArray(obj.remedialObjectives, 'remedialObjectives', taskType);
      assertNonEmptyArray(obj.scaffoldedPracticeExercises, 'scaffoldedPracticeExercises', taskType);
      return obj;
    }

    case 'textbook_outline': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.title, 'title', taskType);
      assertNonEmptyArray(obj.chapters, 'chapters', taskType);
      return obj;
    }

    case 'textbook_chapter': {
      const obj = assertObject(parsed, taskType);
      const sections = assertNonEmptyArray(obj.sections, 'sections', taskType);
      for (const s of sections) {
        const sec = assertObject(s, taskType);
        assertNonEmptyString(sec.title, 'sections[].title', taskType);
        assertNonEmptyString(sec.contentMarkdown, 'sections[].contentMarkdown', taskType);
      }
      return obj;
    }

    case 'secure_exam': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.title, 'title', taskType);
      const sections = assertNonEmptyArray(obj.sections, 'sections', taskType);
      for (const s of sections) {
        const sec = assertObject(s, taskType);
        assertNonEmptyString(sec.sectionName, 'sections[].sectionName', taskType);
        assertNonEmptyArray(sec.questions, 'sections[].questions', taskType);
      }
      return obj;
    }

    case 'marking_scheme': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.title, 'title', taskType);
      assertNonEmptyArray(obj.items, 'items', taskType);
      return obj;
    }

    case 'taught_assessment': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.title, 'title', taskType);
      assertNonEmptyArray(obj.coveredTopicsList, 'coveredTopicsList', taskType);
      assertNonEmptyArray(obj.questions, 'questions', taskType);
      assertNonEmptyArray(obj.markingGuide, 'markingGuide', taskType);
      return obj;
    }

    case 'variable_questions': {
      const list = Array.isArray(parsed)
        ? parsed
        : (assertObject(parsed, taskType).variants || assertObject(parsed, taskType).variations);
      const arr = assertNonEmptyArray(list, 'variants', taskType);
      for (const item of arr) {
        const variant = assertObject(item, taskType);
        assertNonEmptyString(variant.questionText, 'variants[].questionText', taskType);
        assertNonEmptyString(variant.correctAnswer, 'variants[].correctAnswer', taskType);
      }
      return arr;
    }

    case 'exam_builder': {
      const obj = assertObject(parsed, taskType);
      const questions = assertNonEmptyArray(obj.questions, 'questions', taskType);
      for (const q of questions) {
        const item = assertObject(q, taskType);
        assertNonEmptyString(item.questionText, 'questions[].questionText', taskType);
        assertNonEmptyString(item.correctAnswer, 'questions[].correctAnswer', taskType);
      }
      return obj;
    }

    case 'cbt_paper': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.title, 'title', taskType);
      const questions = assertNonEmptyArray(obj.questions, 'questions', taskType);
      for (const q of questions) {
        const item = assertObject(q, taskType);
        assertNonEmptyString(item.stem, 'questions[].stem', taskType);
        assertNonEmptyArray(item.options, 'questions[].options', taskType);
        assertNonEmptyString(item.correctAnswer, 'questions[].correctAnswer', taskType);
      }
      return obj;
    }

    case 'question_bank_items': {
      const obj = assertObject(parsed, taskType);
      const questions = assertNonEmptyArray(obj.questions, 'questions', taskType);
      for (const q of questions) {
        const item = assertObject(q, taskType);
        assertNonEmptyString(item.stem, 'questions[].stem', taskType);
        assertNonEmptyString(item.correctAnswer, 'questions[].correctAnswer', taskType);
      }
      return obj;
    }

    case 'provisioning_recommend': {
      const obj = assertObject(parsed, taskType);
      assertNonEmptyString(obj.recommendedTopology, 'recommendedTopology', taskType);
      assertNonEmptyString(obj.rationale, 'rationale', taskType);
      assertObject(obj.extractedRequirements, taskType);
      assertObject(obj.resourceSizing, taskType);
      assertObject(obj.workloadAnalysis, taskType);
      // Force read-only advisory invariant regardless of LLM fields
      return {
        ...obj,
        readOnlyAdvisory: true as const,
        directInfrastructureMutationAllowed: false as const
      };
    }

    default:
      return parsed;
  }
}
