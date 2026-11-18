import { resolveCapabilityPolicy } from '../ai/capabilityRegistry';
import { GoogleGeminiProviderAdapter } from '../ai/geminiProvider';
import { normalizeGeminiModelId, resolveGeminiRuntimeConfig } from '../ai/modelConfig';
import { buildOrchestratedPrompt } from '../ai/promptOrchestrator';
import { validateAiResponse } from '../ai/responseValidator';
import { AiGatewayError, type AiProviderAdapter } from '../ai/types';
import type {
  CurriculumCompetencyRecord,
  CurriculumSubjectDetail,
  CurriculumTopicRecord
} from '../curriculum/centralCurriculumTypes';
import { CentralTextbookError } from './centralTextbookRepository';
import type {
  CentralTextbookChapterRecord,
  CentralTextbookDetail,
  InstructionalTableSpec,
  RevisionExerciseSpec,
  SectionIllustrationSpec
} from './centralTextbookTypes';

export interface GeneratedOutlinePayload {
  title: string;
  description: string;
  academicYear?: string;
  chapters: Array<{
    chapterNumber: number;
    title: string;
    summary: string;
    introductoryExplanation?: string;
    topicIds: string[];
    learningObjectiveIds: string[];
    learningObjectives: string[];
  }>;
}

export interface GeneratedChapterSectionsPayload {
  chapterSummary?: string;
  revisionExercises?: RevisionExerciseSpec[];
  citations?: Array<{
    citationKey: string;
    authorOrSource: string;
    title: string;
    publicationYear?: string;
    publisher?: string;
    sourceUrl?: string;
  }>;
  sections: Array<{
    sectionNumber: number;
    title: string;
    contentMarkdown: string;
    examples: Array<{ title: string; problem: string; solution: string }>;
    workedSolutions: string[];
    practicalActivities: Array<{
      title: string;
      objective: string;
      equipmentNeeded: string[];
      safetyPrecautions: string[];
      procedureSteps: string[];
      expectedObservations: string;
    }>;
    instructionalTables?: InstructionalTableSpec[];
    illustrationSpecs?: SectionIllustrationSpec[];
    keyVocabulary: Array<{ term: string; definition: string }>;
    commonMisconceptions: string[];
  }>;
}

export interface TextbookAiExecutionMetadata {
  model: string;
  promptVersion: string;
  generationConfig: Record<string, unknown>;
}

export interface TextbookAiAdapter {
  getExecutionMetadata?(): TextbookAiExecutionMetadata;
  generateOutline(input: {
    subject: CurriculumSubjectDetail;
    classGrade: string;
    topics: CurriculumTopicRecord[];
    competencies?: CurriculumCompetencyRecord[];
  }): Promise<GeneratedOutlinePayload>;
  generateChapterSections(input: {
    textbook: CentralTextbookDetail;
    chapter: CentralTextbookChapterRecord;
    topics?: CurriculumTopicRecord[];
  }): Promise<GeneratedChapterSectionsPayload>;
}

export function resolveGeminiTextbookConfig(env: NodeJS.ProcessEnv = process.env): {
  model: string;
  promptVersion: string;
  timeoutMs: number;
  maxRetries: number;
} {
  const gatewayCfg = resolveGeminiRuntimeConfig(env);
  const model = normalizeGeminiModelId(env.GEMINI_TEXTBOOK_MODEL || gatewayCfg.defaultModels.standard, 'gemini-4-hydrogen');
  const promptVersion = (env.GEMINI_TEXTBOOK_PROMPT_VERSION || 'v2.nerdc-grounded').trim();
  const parsedTimeout = Number(env.GEMINI_TEXTBOOK_TIMEOUT_MS || gatewayCfg.timeoutMs);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 2000 ? parsedTimeout : gatewayCfg.timeoutMs;
  const parsedRetries = Number(env.GEMINI_TEXTBOOK_MAX_RETRIES || gatewayCfg.maxRetries);
  const maxRetries = Number.isInteger(parsedRetries) && parsedRetries >= 1 && parsedRetries <= 5
    ? parsedRetries
    : gatewayCfg.maxRetries;
  return { model, promptVersion, timeoutMs, maxRetries };
}

/**
 * Operational Server-Side Google Gemini Textbook Adapter routed through Central AI Gateway primitives.
 * Supports both Vertex AI ADC (Cloud Run runtime service account) and explicit GEMINI_API_KEY,
 * strictly grounded in Central Curriculum data, and NEVER emits fabricated textbook output.
 */
export class GeminiTextbookOperationalAdapter implements TextbookAiAdapter {
  private readonly cfg = resolveGeminiTextbookConfig();
  private readonly provider: AiProviderAdapter;

  constructor(provider?: AiProviderAdapter) {
    this.provider = provider ?? new GoogleGeminiProviderAdapter();
  }

  getExecutionMetadata(): TextbookAiExecutionMetadata {
    return {
      model: this.cfg.model,
      promptVersion: this.cfg.promptVersion,
      generationConfig: {
        responseMimeType: 'application/json',
        timeoutMs: this.cfg.timeoutMs,
        maxRetries: this.cfg.maxRetries,
        authMode: this.provider.getAuthMode()
      }
    };
  }

  private mapGatewayFailure(err: unknown): never {
    if (err instanceof CentralTextbookError) throw err;
    if (err instanceof AiGatewayError) {
      if (
        !process.env.GEMINI_API_KEY &&
        /PERMISSION_DENIED|UNAUTHENTICATED|Could not load the default credentials|not configured/i.test(err.message)
      ) {
        throw new CentralTextbookError(
          'VALIDATION_ERROR',
          `GEMINI_API_KEY is not configured and Vertex AI ADC failed: ${err.message}`
        );
      }
      throw new CentralTextbookError('VALIDATION_ERROR', err.message);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  async generateOutline(input: {
    subject: CurriculumSubjectDetail;
    classGrade: string;
    topics: CurriculumTopicRecord[];
    competencies?: CurriculumCompetencyRecord[];
  }): Promise<GeneratedOutlinePayload> {
    const policy = resolveCapabilityPolicy('CURRICULUM_SERVER', 'TEXTBOOK_GENERATION', 'textbook_outline');
    const groundedTopics = input.topics.map(t => ({
      topicId: t.id,
      term: t.term,
      week: t.week,
      title: t.title,
      subtopics: t.subtopics.map(s => s.title),
      performanceObjectives: t.objectives.map(o => ({ id: o.id, text: o.description })),
      contentDetails: t.contentDetails,
      teachingMaterials: t.teachingMaterials
    }));

    try {
      const orchestrated = buildOrchestratedPrompt('textbook_outline', {
        subjectName: input.subject.name,
        subjectCode: input.subject.code,
        educationLevelCode: input.subject.educationLevelCode,
        classGrade: input.classGrade,
        versionTitle: input.subject.version.title,
        versionTag: input.subject.version.versionTag,
        curriculumVersionId: input.subject.version.id,
        isOfficialVerified: input.subject.version.isOfficialVerified,
        topics: groundedTopics,
        competencies: (input.competencies || []).slice(0, 20).map(c => ({ code: c.competencyCode, title: c.title }))
      });

      const result = await this.provider.generate({
        modelId: this.cfg.model,
        contents: orchestrated.contents,
        systemInstruction: orchestrated.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: orchestrated.responseSchema,
        temperature: policy.temperature,
        timeoutMs: this.cfg.timeoutMs,
        maxRetries: this.cfg.maxRetries,
        correlationId: `tb_outline_${input.subject.id}`,
        label: 'CURRICULUM_SERVER:TEXTBOOK_GENERATION:textbook_outline'
      });

      return validateAiResponse('textbook_outline', result.rawText) as GeneratedOutlinePayload;
    } catch (err) {
      this.mapGatewayFailure(err);
    }
  }

  async generateChapterSections(input: {
    textbook: CentralTextbookDetail;
    chapter: CentralTextbookChapterRecord;
    topics?: CurriculumTopicRecord[];
  }): Promise<GeneratedChapterSectionsPayload> {
    const policy = resolveCapabilityPolicy('CURRICULUM_SERVER', 'TEXTBOOK_GENERATION', 'textbook_chapter');
    const groundedTopics = (input.topics || []).map(t => ({
      topicId: t.id,
      title: t.title,
      subtopics: t.subtopics.map(s => s.title),
      teacherActivities: t.teacherActivities,
      studentActivities: t.studentActivities,
      teachingMaterials: t.teachingMaterials,
      evaluationGuide: t.evaluationGuide
    }));

    try {
      const orchestrated = buildOrchestratedPrompt('textbook_chapter', {
        subjectName: input.textbook.subjectName,
        classGrade: input.textbook.classGradeName,
        curriculumVersionId: input.textbook.curriculumVersionId,
        chapterNumber: input.chapter.chapterNumber,
        chapterTitle: input.chapter.title,
        chapterSummary: input.chapter.summary,
        learningObjectives: input.chapter.learningObjectives,
        topics: groundedTopics
      });

      const result = await this.provider.generate({
        modelId: this.cfg.model,
        contents: orchestrated.contents,
        systemInstruction: orchestrated.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: orchestrated.responseSchema,
        temperature: policy.temperature,
        timeoutMs: this.cfg.timeoutMs,
        maxRetries: this.cfg.maxRetries,
        correlationId: `tb_chap_${input.textbook.id}_${input.chapter.chapterNumber}`,
        label: `CURRICULUM_SERVER:TEXTBOOK_GENERATION:chapter_${input.chapter.chapterNumber}`
      });

      return validateAiResponse('textbook_chapter', result.rawText) as GeneratedChapterSectionsPayload;
    } catch (err) {
      this.mapGatewayFailure(err);
    }
  }
}
