import { GoogleGenAI, Type } from '@google/genai';
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

const VALID_GEMINI_TEXT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite'
]);

export function resolveGeminiTextbookConfig(env: NodeJS.ProcessEnv = process.env): {
  model: string;
  promptVersion: string;
  timeoutMs: number;
  maxRetries: number;
} {
  const configuredModel = (env.GEMINI_TEXTBOOK_MODEL || 'gemini-4-hydrogen').trim();
  const model = VALID_GEMINI_TEXT_MODELS.has(configuredModel)
    ? configuredModel
    : 'gemini-4-hydrogen';
  const promptVersion = (env.GEMINI_TEXTBOOK_PROMPT_VERSION || 'v2.nerdc-grounded').trim();
  const parsedTimeout = Number(env.GEMINI_TEXTBOOK_TIMEOUT_MS || 45000);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= 2000 ? parsedTimeout : 45000;
  const parsedRetries = Number(env.GEMINI_TEXTBOOK_MAX_RETRIES || 3);
  const maxRetries = Number.isInteger(parsedRetries) && parsedRetries >= 1 && parsedRetries <= 5 ? parsedRetries : 3;
  return { model, promptVersion, timeoutMs, maxRetries };
}

function getConfiguredGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new CentralTextbookError(
      'VALIDATION_ERROR',
      'GEMINI_API_KEY is not configured for server-side Central Textbook generation.'
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Gemini textbook operation timed out after ${timeoutMs}ms (${label}).`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isNonRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured|400 Bad Request|403 Forbidden/i.test(message);
}

/**
 * Operational Server-Side Google Gemini Textbook Adapter.
 * Strictly grounded in Central Curriculum data, supports timeouts and exponential backoff,
 * and NEVER emits fabricated or mocked textbook output when credentials fail.
 */
export class GeminiTextbookOperationalAdapter implements TextbookAiAdapter {
  private readonly cfg = resolveGeminiTextbookConfig();

  getExecutionMetadata(): TextbookAiExecutionMetadata {
    return {
      model: this.cfg.model,
      promptVersion: this.cfg.promptVersion,
      generationConfig: {
        responseMimeType: 'application/json',
        timeoutMs: this.cfg.timeoutMs,
        maxRetries: this.cfg.maxRetries
      }
    };
  }

  private async executeWithBackoff<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.cfg.maxRetries; attempt += 1) {
      try {
        return await withTimeout(fn(), this.cfg.timeoutMs, label);
      } catch (err) {
        lastError = err;
        if (err instanceof CentralTextbookError || isNonRetryableGeminiError(err) || attempt === this.cfg.maxRetries) {
          throw err;
        }
        const backoffMs = Math.min(4000, 350 * Math.pow(2, attempt - 1));
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async generateOutline(input: {
    subject: CurriculumSubjectDetail;
    classGrade: string;
    topics: CurriculumTopicRecord[];
    competencies?: CurriculumCompetencyRecord[];
  }): Promise<GeneratedOutlinePayload> {
    const ai = getConfiguredGenAIClient();
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

    const response = await this.executeWithBackoff('generateOutline', () =>
      ai.models.generateContent({
        model: this.cfg.model,
        contents: `Generate an authoritative curriculum-aligned textbook outline grounded ONLY in the retrieved curriculum data below.
Subject: ${input.subject.name} (${input.subject.code})
Education Level: ${input.subject.educationLevelCode.toUpperCase()}
Class Grade: ${input.classGrade}
Curriculum Version: ${input.subject.version.title} (${input.subject.version.versionTag}, id=${input.subject.version.id})
Official Verified Status: ${input.subject.version.isOfficialVerified}
Authoritative Curriculum Topics: ${JSON.stringify(groundedTopics)}
Competencies: ${JSON.stringify((input.competencies || []).slice(0, 20).map(c => ({ code: c.competencyCode, title: c.title })))}`,
        config: {
          systemInstruction:
            'You are a Senior Central Curriculum Textbook Editor. Produce valid JSON defining title, description, academicYear, and 4 to 10 coherent chapters. Every chapter MUST reference valid topicIds and learningObjectiveIds from the supplied curriculum payload.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              academicYear: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chapterNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    introductoryExplanation: { type: Type.STRING },
                    topicIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    learningObjectiveIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['chapterNumber', 'title', 'summary', 'introductoryExplanation', 'topicIds', 'learningObjectiveIds', 'learningObjectives']
                }
              }
            },
            required: ['title', 'description', 'chapters']
          }
        }
      })
    );

    const raw = (response.text || '').trim();
    if (!raw) {
      throw new CentralTextbookError('VALIDATION_ERROR', 'Gemini returned an empty response for textbook outline.');
    }
    return JSON.parse(raw) as GeneratedOutlinePayload;
  }

  async generateChapterSections(input: {
    textbook: CentralTextbookDetail;
    chapter: CentralTextbookChapterRecord;
    topics?: CurriculumTopicRecord[];
  }): Promise<GeneratedChapterSectionsPayload> {
    const ai = getConfiguredGenAIClient();
    const groundedTopics = (input.topics || []).map(t => ({
      topicId: t.id,
      title: t.title,
      subtopics: t.subtopics.map(s => s.title),
      teacherActivities: t.teacherActivities,
      studentActivities: t.studentActivities,
      teachingMaterials: t.teachingMaterials,
      evaluationGuide: t.evaluationGuide
    }));

    const response = await this.executeWithBackoff(`generateChapter_${input.chapter.chapterNumber}`, () =>
      ai.models.generateContent({
        model: this.cfg.model,
        contents: `Generate complete instructional textbook sections for Chapter ${input.chapter.chapterNumber}: "${input.chapter.title}".
Subject: ${input.textbook.subjectName}
Target Class Level: ${input.textbook.classGradeName}
Curriculum Version ID: ${input.textbook.curriculumVersionId}
Chapter Summary: ${input.chapter.summary}
Chapter Learning Objectives: ${JSON.stringify(input.chapter.learningObjectives)}
Grounded Curriculum Topics & Instructional Materials: ${JSON.stringify(groundedTopics)}`,
        config: {
          systemInstruction:
            `You are a Senior Subject Matter Author writing strictly for ${input.textbook.classGradeName}. Produce 2-4 progressive lesson sections in valid JSON containing: clear age-appropriate prose (contentMarkdown), worked examples, step-by-step workedSolutions, practicalActivities, instructionalTables, illustrationSpecs (describing educational diagrams/charts strictly matching the lesson & target class level with labeled parts), keyVocabulary (used consistently for glossary), commonMisconceptions, plus chapterSummary, revisionExercises (with answerGuide), and citations.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapterSummary: { type: Type.STRING },
              revisionExercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    exerciseNumber: { type: Type.INTEGER },
                    questionType: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    answerGuide: { type: Type.STRING }
                  },
                  required: ['exerciseNumber', 'questionType', 'prompt', 'answerGuide']
                }
              },
              citations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    citationKey: { type: Type.STRING },
                    authorOrSource: { type: Type.STRING },
                    title: { type: Type.STRING },
                    publicationYear: { type: Type.STRING }
                  },
                  required: ['citationKey', 'authorOrSource', 'title']
                }
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sectionNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    contentMarkdown: { type: Type.STRING },
                    examples: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          problem: { type: Type.STRING },
                          solution: { type: Type.STRING }
                        },
                        required: ['title', 'problem', 'solution']
                      }
                    },
                    workedSolutions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    practicalActivities: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          objective: { type: Type.STRING },
                          equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                          safetyPrecautions: { type: Type.ARRAY, items: { type: Type.STRING } },
                          procedureSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                          expectedObservations: { type: Type.STRING }
                        },
                        required: ['title', 'objective', 'equipmentNeeded', 'safetyPrecautions', 'procedureSteps', 'expectedObservations']
                      }
                    },
                    instructionalTables: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                          rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                        },
                        required: ['title', 'headers', 'rows']
                      }
                    },
                    illustrationSpecs: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          conceptDescription: { type: Type.STRING },
                          caption: { type: Type.STRING },
                          labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                          ageAppropriatenessNote: { type: Type.STRING }
                        },
                        required: ['conceptDescription', 'caption', 'labels']
                      }
                    },
                    keyVocabulary: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          term: { type: Type.STRING },
                          definition: { type: Type.STRING }
                        },
                        required: ['term', 'definition']
                      }
                    },
                    commonMisconceptions: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['sectionNumber', 'title', 'contentMarkdown', 'examples', 'workedSolutions', 'practicalActivities', 'keyVocabulary', 'commonMisconceptions']
                }
              }
            },
            required: ['sections']
          }
        }
      })
    );

    const raw = (response.text || '').trim();
    if (!raw) {
      throw new CentralTextbookError('VALIDATION_ERROR', `Gemini returned empty content for chapter ${input.chapter.chapterNumber}.`);
    }
    return JSON.parse(raw) as GeneratedChapterSectionsPayload;
  }
}
