import { GoogleGenAI, Type } from '@google/genai';
import { ClassGrade } from '../types';
import { textbookDb } from './textbookQuestionBankService';
import { curriculumRetrievalService } from './curriculumRetrievalService';
import { Textbook, TextbookChapter, TextbookSection } from '../types/textbookAndQuestionBank';

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || 'us-central1';

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return new GoogleGenAI({
    vertexai: true,
    project: project || undefined,
    location: location || 'us-central1',
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getGenAIClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

export class TextbookGenerationEngine {
  private static instance: TextbookGenerationEngine;

  private constructor() {}

  public static getInstance(): TextbookGenerationEngine {
    if (!TextbookGenerationEngine.instance) {
      TextbookGenerationEngine.instance = new TextbookGenerationEngine();
    }
    return TextbookGenerationEngine.instance;
  }

  /**
   * Generates a complete NERDC-compliant textbook outline and initiates generation job.
   */
  public async generateTextbookOutline(subjectIdOrCode: string, classGrade: ClassGrade, authorName?: string): Promise<Textbook> {
    const subject = curriculumRetrievalService.assertValidCurriculumContext({ subjectIdOrCode, classGrade });

    const systemPrompt = `You are an expert Nigerian Educational Research and Development Council (NERDC) Curriculum Editor and Senior Textbook Author.
Generate a comprehensive, pedagogically rigorous textbook outline for Nigerian secondary schools conforming strictly to official NERDC curricula.
The textbook must be divided into 6 to 10 structured chapters covering all required themes and topics for ${subject.name} (${classGrade}).`;

    const userPrompt = `Create a textbook outline for:
- Subject: ${subject.name} (Code: ${subject.code})
- Class Grade: ${classGrade}
- Themes: ${JSON.stringify(subject.themes.map((th: any) => th.title || th.name || 'Theme'))}
Return JSON with chapters containing chapterNumber, title, summary, and learningObjectives array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  learningObjectives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['chapterNumber', 'title', 'summary', 'learningObjectives'],
              },
            },
          },
          required: ['title', 'description', 'chapters'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const textbookId = `tb-${subject.code.toLowerCase()}-${classGrade.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`;

    const chapters: TextbookChapter[] = (parsed.chapters || []).map((ch: any, idx: number) => ({
      id: `${textbookId}-ch${idx + 1}`,
      textbookId,
      chapterNumber: ch.chapterNumber || idx + 1,
      title: ch.title || `Chapter ${idx + 1}`,
      summary: ch.summary || '',
      learningObjectives: ch.learningObjectives || [],
      sections: [],
      status: 'draft',
    }));

    const textbook: Textbook = {
      id: textbookId,
      subjectId: subject.id,
      subjectName: subject.name,
      classGrade,
      curriculumVersionId: 'NERDC-2024-V1',
      title: parsed.title || `${subject.name} for ${classGrade} (NERDC Compliant)`,
      author: authorName || 'Curriculum Server Academic AI Engine & NERDC Editorial Board',
      description: parsed.description || `Authoritative textbook for ${subject.name} (${classGrade}) aligned with Nigerian Educational Research and Development Council standards.`,
      status: 'draft',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters,
      approvalHistory: [
        {
          id: `ah-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'usr-ai-engine',
          userName: 'Curriculum AI Generation Engine',
          role: 'system',
          action: 'created',
          notes: 'Outline generated successfully from NERDC database.',
        },
      ],
    };

    textbookDb.saveTextbook(textbook);
    textbookDb.createJob({
      id: `job-tb-${Date.now()}`,
      type: 'textbook',
      targetId: textbookId,
      title: textbook.title,
      status: 'queued',
      progressPercent: 10,
      currentStep: 'Outline generated. Ready for chapter section generation.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return textbook;
  }

  /**
   * Generates detailed pedagogical content, examples, practicals, and worked solutions for a chapter.
   */
  public async generateChapterContent(textbookId: string, chapterId: string): Promise<TextbookChapter> {
    const textbook = textbookDb.getTextbookById(textbookId);
    if (!textbook) throw new Error(`Textbook not found: ${textbookId}`);

    const chapter = textbook.chapters.find(c => c.id === chapterId);
    if (!chapter) throw new Error(`Chapter not found: ${chapterId}`);

    const systemPrompt = `You are a Senior Nigerian Textbook Author and Subject Matter Expert in ${textbook.subjectName} (${textbook.classGrade}).
Write comprehensive, engaging, and academically rigorous textbook sections for the given chapter, conforming to NERDC learning objectives.
Include detailed explanations, worked examples, step-by-step solutions, practical activities, key vocabulary, and common student misconceptions.`;

    const userPrompt = `Generate textbook content for Chapter ${chapter.chapterNumber}: "${chapter.title}"
Learning Objectives: ${JSON.stringify(chapter.learningObjectives)}
Subject: ${textbook.subjectName}, Class: ${textbook.classGrade}.
Provide 3 structured sections with full markdown content, examples with solutions, practical activities, key vocabulary, and misconceptions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
                        solution: { type: Type.STRING },
                      },
                      required: ['title', 'problem', 'solution'],
                    },
                  },
                  workedSolutions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
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
                        expectedObservations: { type: Type.STRING },
                      },
                      required: ['title', 'objective', 'equipmentNeeded', 'safetyPrecautions', 'procedureSteps', 'expectedObservations'],
                    },
                  },
                  keyVocabulary: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING },
                      },
                      required: ['term', 'definition'],
                    },
                  },
                  commonMisconceptions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['sectionNumber', 'title', 'contentMarkdown', 'examples', 'workedSolutions', 'practicalActivities', 'keyVocabulary', 'commonMisconceptions'],
              },
            },
          },
          required: ['sections'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const sections: TextbookSection[] = (parsed.sections || []).map((sec: any, idx: number) => ({
      id: `${chapterId}-sec-${idx + 1}`,
      chapterId,
      sectionNumber: sec.sectionNumber || idx + 1,
      title: sec.title || `Section ${idx + 1}`,
      contentMarkdown: sec.contentMarkdown || '',
      examples: sec.examples || [],
      workedSolutions: sec.workedSolutions || [],
      practicalActivities: sec.practicalActivities || [],
      keyVocabulary: sec.keyVocabulary || [],
      commonMisconceptions: sec.commonMisconceptions || [],
      reviewStatus: 'pending',
      lastUpdated: new Date().toISOString(),
    }));

    chapter.sections = sections;
    chapter.status = 'review';
    textbook.updatedAt = new Date().toISOString();
    textbookDb.saveTextbook(textbook);

    return chapter;
  }
}

export const textbookGenerationEngine = TextbookGenerationEngine.getInstance();
