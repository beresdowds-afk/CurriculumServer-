import { Type } from '@google/genai';
import type { AiTaskType } from '../../packages/shared-types/src/aiGatewayContracts';
import { AiGatewayError } from './types';

export interface OrchestratedPrompt {
  systemInstruction: string;
  contents: string;
  responseSchema?: unknown;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|credentials|secrets)/i,
  /bypass\s+(tenant|security|rls|authorization)/i,
  /execute\s+(gcloud|terraform|drop\s+table|alter\s+iam)/i
];

export function sanitizeTextInput(value: unknown, maxLen = 4000): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\u0000/g, '').trim();
  if (trimmed.length > maxLen) {
    return trimmed.slice(0, maxLen);
  }
  return trimmed;
}

export function assertSafePromptPayload(payload: Record<string, unknown>): void {
  const serialized = JSON.stringify(payload);
  if (serialized.length > 48000) {
    throw new AiGatewayError(
      'VALIDATION_ERROR',
      'AI request payload exceeds maximum allowed size.',
      400
    );
  }
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new AiGatewayError(
        'VALIDATION_ERROR',
        'AI request contains disallowed instruction-override or infrastructure-mutation directives.',
        400
      );
    }
  }
}

export function buildOrchestratedPrompt(
  taskType: AiTaskType,
  payload: Record<string, unknown>,
  schoolContext?: {
    tenantId?: string | null;
    schoolName?: string;
    curriculumTopicsSummary?: string;
    questionBankSummary?: string;
  }
): OrchestratedPrompt {
  assertSafePromptPayload(payload);

  const groundingContext = [
    schoolContext?.schoolName ? `Verified School Institution: ${schoolContext.schoolName}` : '',
    schoolContext?.curriculumTopicsSummary ? `Grounded Curriculum Context:\n${schoolContext.curriculumTopicsSummary}` : '',
    schoolContext?.questionBankSummary ? `School Question Bank Context:\n${schoolContext.questionBankSummary}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  switch (taskType) {
    case 'lesson_note': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const topicTitle = sanitizeTextInput(payload.topicTitle, 400);
      if (!subjectName || !classGrade || !topicTitle) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName, classGrade, and topicTitle are required.', 400);
      }
      const subTopic = sanitizeTextInput(payload.subTopic, 400) || 'Core concepts and applications';
      const term = sanitizeTextInput(payload.term, 80) || 'Term 1';
      const week = Number(payload.week || 5);
      const durationMinutes = Number(payload.durationMinutes || 80);
      const contextNotes = sanitizeTextInput(payload.contextNotes, 1500) || 'Focus on active student participation, practical illustrations, and Nigerian real-life context.';

      return {
        systemInstruction:
          'You are a certified Senior Educational Curriculum Specialist adhering strictly to Nigerian NERDC National Curriculum standards (Basic JSS 1-3 and Senior Secondary SSS 1-3). Produce an official, ready-to-teach Lesson Note strictly as valid JSON conforming to the schema.',
        contents: `Generate an official NERDC Lesson Note:\n- Subject: ${subjectName}\n- Class Level: ${classGrade}\n- Topic: ${topicTitle}\n- Sub-Topic: ${subTopic}\n- Term: ${term}\n- Week: ${week}\n- Duration: ${durationMinutes} minutes\n- Pedagogical Context: ${contextNotes}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            classGrade: { type: Type.STRING },
            topic: { type: Type.STRING },
            subTopic: { type: Type.STRING },
            term: { type: Type.STRING },
            duration: { type: Type.STRING },
            averageAge: { type: Type.STRING },
            behavioralObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            previousKnowledge: { type: Type.STRING },
            instructionalMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
            referenceBooks: { type: Type.ARRAY, items: { type: Type.STRING } },
            introduction: {
              type: Type.OBJECT,
              properties: { duration: { type: Type.STRING }, activity: { type: Type.STRING } },
              required: ['duration', 'activity']
            },
            presentationSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  teacherActivity: { type: Type.STRING },
                  studentActivity: { type: Type.STRING },
                  learningPoint: { type: Type.STRING }
                },
                required: ['stepNumber', 'title', 'durationMinutes', 'teacherActivity', 'studentActivity', 'learningPoint']
              }
            },
            guidedPractice: { type: Type.STRING },
            independentPractice: { type: Type.STRING },
            evaluationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            summaryAndConclusion: { type: Type.STRING },
            assignment: { type: Type.ARRAY, items: { type: Type.STRING } },
            teacherRemarks: { type: Type.STRING }
          },
          required: ['subject', 'classGrade', 'topic', 'subTopic', 'behavioralObjectives', 'previousKnowledge', 'instructionalMaterials', 'presentationSteps', 'evaluationQuestions', 'assignment']
        }
      };
    }

    case 'scheme_of_work': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required.', 400);
      }
      const term = sanitizeTextInput(payload.term, 80) || 'Term 1';
      return {
        systemInstruction:
          'You are an expert NERDC Curriculum Officer. Generate a structured 12-week Scheme of Work conforming to official NERDC themes, performance objectives, teacher/student activities, materials, and evaluation guides.',
        contents: `Generate a 12-week Scheme of Work:\n- Subject: ${subjectName}\n- Class: ${classGrade}\n- Term: ${term}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            classGrade: { type: Type.STRING },
            term: { type: Type.STRING },
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.INTEGER },
                  topic: { type: Type.STRING },
                  subTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                  teacherActivities: { type: Type.STRING },
                  studentActivities: { type: Type.STRING },
                  materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                  evaluation: { type: Type.STRING }
                },
                required: ['week', 'topic', 'subTopics', 'objectives', 'teacherActivities', 'studentActivities', 'materials', 'evaluation']
              }
            }
          },
          required: ['subject', 'classGrade', 'term', 'weeks']
        }
      };
    }

    case 'adaptive_remedial': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const topicTitle = sanitizeTextInput(payload.topicTitle, 400);
      if (!subjectName || !classGrade || !topicTitle) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName, classGrade, and topicTitle are required.', 400);
      }
      const teacherComment = sanitizeTextInput(payload.teacherComment, 1500) || 'Students struggled to apply core concepts.';
      const understandingLevel = sanitizeTextInput(payload.understandingLevel, 100) || 'Poor/Fair';
      const failedObjectives = Array.isArray(payload.failedObjectives)
        ? payload.failedObjectives.map(o => sanitizeTextInput(o, 300)).filter(Boolean)
        : [];
      return {
        systemInstruction:
          'You are an Adaptive Learning & Remedial Education Director. Construct diagnostic weakness, corrective remedial objectives, alternative pedagogical strategies, simplified explanations, 3 scaffolded practice levels, and 3 reassessment questions in strict JSON.',
        contents: `Generate Adaptive Remedial Unit:\n- Subject: ${subjectName}\n- Class: ${classGrade}\n- Topic: ${topicTitle}\n- Understanding: ${understandingLevel}\n- Teacher Observation: ${teacherComment}\n- Failed Objectives: ${failedObjectives.join(', ') || 'Fundamental application'}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicTitle: { type: Type.STRING },
            weaknessIdentified: { type: Type.STRING },
            masteryScoreEstimate: { type: Type.INTEGER },
            remedialObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            remedialStrategies: { type: Type.ARRAY, items: { type: Type.STRING } },
            simplifiedExplanation: { type: Type.STRING },
            scaffoldedPracticeExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  guidanceHint: { type: Type.STRING }
                },
                required: ['level', 'prompt', 'guidanceHint']
              }
            },
            reassessmentQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['topicTitle', 'weaknessIdentified', 'remedialObjectives', 'remedialStrategies', 'simplifiedExplanation', 'scaffoldedPracticeExercises', 'reassessmentQuestions']
        }
      };
    }

    case 'curriculum_tutor': {
      const question = sanitizeTextInput(payload.question || payload.userQuery, 3000);
      if (!question) {
        throw new AiGatewayError('VALIDATION_ERROR', 'question is required for curriculum inquiry.', 400);
      }
      const subjectContext = sanitizeTextInput(payload.subjectContext, 300) || 'General Curriculum';
      const classContext = sanitizeTextInput(payload.classContext, 200) || 'Secondary School';
      const topicContext = sanitizeTextInput(payload.topicContext, 300) || sanitizeTextInput(payload.context, 800) || 'Academic Standards';
      const userRole = sanitizeTextInput(payload.userRole || payload.role, 100) || 'Academic Administrator';
      return {
        systemInstruction:
          'You are the CurriculumFlow Senior Academic Advisor grounded in NERDC standards (JSS 1-3, SSS 1-3) and WAEC/NECO/BECE benchmarks. Provide structured, authoritative pedagogical guidance.',
        contents: `Role: ${userRole}\nSubject: ${subjectContext}\nClass: ${classContext}\nTopic/Context: ${topicContext}\n\nQuery: ${question}${groundingContext ? `\n\n${groundingContext}` : ''}`
      };
    }

    case 'textbook_outline': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const subjectCode = sanitizeTextInput(payload.subjectCode, 60);
      const educationLevelCode = sanitizeTextInput(payload.educationLevelCode, 40) || 'SSS';
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const versionTitle = sanitizeTextInput(payload.versionTitle, 200);
      const versionTag = sanitizeTextInput(payload.versionTag, 100);
      const versionId = sanitizeTextInput(payload.curriculumVersionId, 120);
      const isOfficialVerified = Boolean(payload.isOfficialVerified);
      const groundedTopics = Array.isArray(payload.topics) ? payload.topics : [];
      const competencies = Array.isArray(payload.competencies) ? payload.competencies.slice(0, 20) : [];
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for textbook outline generation.', 400);
      }
      return {
        systemInstruction:
          'You are a Senior Central Curriculum Textbook Editor. Produce valid JSON defining title, description, academicYear, and 4 to 10 coherent chapters. Every chapter MUST reference valid topicIds and learningObjectiveIds from the supplied curriculum payload.',
        contents: `Generate an authoritative curriculum-aligned textbook outline grounded ONLY in the retrieved curriculum data below.\nSubject: ${subjectName} (${subjectCode})\nEducation Level: ${educationLevelCode.toUpperCase()}\nClass Grade: ${classGrade}\nCurriculum Version: ${versionTitle} (${versionTag}, id=${versionId})\nOfficial Verified Status: ${isOfficialVerified}\nAuthoritative Curriculum Topics: ${JSON.stringify(groundedTopics)}\nCompetencies: ${JSON.stringify(competencies)}`,
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
      };
    }

    case 'textbook_chapter': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const curriculumVersionId = sanitizeTextInput(payload.curriculumVersionId, 120);
      const chapterNumber = Number(payload.chapterNumber || 1);
      const chapterTitle = sanitizeTextInput(payload.chapterTitle, 400);
      const chapterSummary = sanitizeTextInput(payload.chapterSummary, 2000);
      const learningObjectives = Array.isArray(payload.learningObjectives) ? payload.learningObjectives : [];
      const groundedTopics = Array.isArray(payload.topics) ? payload.topics : [];
      if (!subjectName || !classGrade || !chapterTitle) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName, classGrade, and chapterTitle are required for textbook chapter generation.', 400);
      }
      return {
        systemInstruction:
          `You are a Senior Subject Matter Author writing strictly for ${classGrade}. Produce 2-4 progressive lesson sections in valid JSON containing: clear age-appropriate prose (contentMarkdown), worked examples, step-by-step workedSolutions, practicalActivities, instructionalTables, illustrationSpecs, keyVocabulary, commonMisconceptions, plus chapterSummary, revisionExercises (with answerGuide), and citations.`,
        contents: `Generate complete instructional textbook sections for Chapter ${chapterNumber}: "${chapterTitle}".\nSubject: ${subjectName}\nTarget Class Level: ${classGrade}\nCurriculum Version ID: ${curriculumVersionId}\nChapter Summary: ${chapterSummary}\nChapter Learning Objectives: ${JSON.stringify(learningObjectives)}\nGrounded Curriculum Topics & Instructional Materials: ${JSON.stringify(groundedTopics)}`,
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
                      properties: { title: { type: Type.STRING }, problem: { type: Type.STRING }, solution: { type: Type.STRING } },
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
                      properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } },
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
      };
    }

    case 'secure_exam': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for secure exam generation.', 400);
      }
      const term = sanitizeTextInput(payload.term, 80) || 'Term 1';
      const targetExam = sanitizeTextInput(payload.targetExam, 120) || 'WAEC/NECO Standard';
      const mcqCount = Math.max(1, Math.min(60, Number(payload.mcqCount || payload.sectionAQuestionsCount || 5)));
      const theoryCount = Math.max(1, Math.min(20, Number(payload.theoryCount || payload.sectionBQuestionsCount || 2)));
      const difficultyMix = sanitizeTextInput(payload.difficultyMix, 200) || '30% Easy, 50% Medium, 20% Hard';
      const coveredTopics = Array.isArray(payload.coveredTopics) ? payload.coveredTopics : [];

      return {
        systemInstruction:
          'You are the Chief Examination Officer for WAEC, NECO, and BECE. Generate a complete official examination paper with Section A (Multiple-Choice Objective) and Section B (Structured Theory) balanced across Bloom taxonomy.',
        contents: `Generate a Secure Examination Paper:\n- Subject: ${subjectName}\n- Class Level: ${classGrade}\n- Term: ${term}\n- Target Standard: ${targetExam}\n- Specifications: ${mcqCount} Multiple Choice Questions + ${theoryCount} Structured Theory Questions\n- Difficulty Distribution: ${difficultyMix}\n- Topics: ${coveredTopics.length > 0 ? JSON.stringify(coveredTopics) : 'Approved syllabus themes'}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            durationMinutes: { type: Type.INTEGER },
            totalMarks: { type: Type.INTEGER },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sectionName: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNumber: { type: Type.INTEGER },
                        questionType: { type: Type.STRING },
                        questionText: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                            required: ['key', 'text']
                          }
                        },
                        marks: { type: Type.INTEGER },
                        topic: { type: Type.STRING },
                        cognitiveLevel: { type: Type.STRING },
                        difficulty: { type: Type.STRING }
                      },
                      required: ['questionNumber', 'questionType', 'questionText', 'marks', 'topic', 'cognitiveLevel', 'difficulty']
                    }
                  }
                },
                required: ['sectionName', 'instructions', 'marks', 'questions']
              }
            }
          },
          required: ['title', 'durationMinutes', 'totalMarks', 'instructions', 'sections']
        }
      };
    }

    case 'marking_scheme': {
      const examId = sanitizeTextInput(payload.examId, 120) || 'CF-EXAM-2026';
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for marking scheme generation.', 400);
      }
      const term = sanitizeTextInput(payload.term, 80) || 'Term 1';
      const questionsPayload = payload.questionsPayload || payload.questions || [];
      return {
        systemInstruction:
          'You are the Chief Examiner for WAEC/NECO. Generate the Official Confidential Marking Scheme and Step-by-Step Scoring Guide strictly matching the provided questions with Method Marks (M), Accuracy Marks (A), and Partial Credit Rules.',
        contents: `Generate Official Marking Scheme for Exam ID ${examId}:\n- Subject: ${subjectName}\n- Class: ${classGrade}\n- Term: ${term}\n- Questions:\n${JSON.stringify(questionsPayload)}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            totalMarks: { type: Type.INTEGER },
            generalMarkingInstructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  section: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING },
                  totalMarks: { type: Type.INTEGER },
                  stepBreakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { stepDescription: { type: Type.STRING }, marksAwarded: { type: Type.NUMBER } },
                      required: ['stepDescription', 'marksAwarded']
                    }
                  },
                  partialCreditRules: { type: Type.STRING },
                  examinerNotes: { type: Type.STRING }
                },
                required: ['questionNumber', 'section', 'correctAnswer', 'modelAnswer', 'totalMarks', 'stepBreakdown', 'partialCreditRules']
              }
            }
          },
          required: ['title', 'totalMarks', 'generalMarkingInstructions', 'items']
        }
      };
    }

    case 'taught_assessment': {
      const verifiedEvidence =
        payload.verifiedEvidence && typeof payload.verifiedEvidence === 'object'
          ? (payload.verifiedEvidence as Record<string, unknown>)
          : null;
      const authorizedScope =
        payload.authorizedScope && typeof payload.authorizedScope === 'object'
          ? (payload.authorizedScope as Record<string, unknown>)
          : null;

      const subjectName = sanitizeTextInput(
        (verifiedEvidence?.subjectName as string) || payload.subjectName,
        200
      );
      const classGrade = sanitizeTextInput(
        (verifiedEvidence?.classGradeName as string) || payload.classGrade,
        100
      );
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for taught-only assessment.', 400);
      }
      const assessmentType = sanitizeTextInput(
        (authorizedScope?.assessmentType as string) || payload.assessmentType || payload.assessmentTitle,
        120
      ) || 'Class Test';
      const verifiedTopics = Array.isArray(verifiedEvidence?.topics) ? verifiedEvidence.topics : [];
      const fallbackTopics = Array.isArray(payload.completedTopics) ? payload.completedTopics : [];
      const effectiveTopics = verifiedTopics.length > 0 ? verifiedTopics : fallbackTopics;
      if (effectiveTopics.length === 0) {
        throw new AiGatewayError('VALIDATION_ERROR', 'Verified taught topics must contain at least one taught topic.', 400);
      }

      const totalQuestions = Math.max(
        1,
        Math.min(100, Number(authorizedScope?.questionCount || payload.totalQuestions || 5))
      );
      const curriculumVersionId = sanitizeTextInput(
        (verifiedEvidence?.curriculumVersionId as string) || payload.curriculumVersionId,
        120
      ) || 'NERDC-BASELINE';
      const totalMarks = Math.max(1, Number(authorizedScope?.totalMarks || payload.totalMarks || totalQuestions * 2));
      const durationMinutes = Math.max(5, Number(authorizedScope?.durationMinutes || payload.durationMinutes || 30));
      const questionTypesConfig = authorizedScope?.questionTypesConfig || payload.questionTypesConfig || {
        questionType: sanitizeTextInput(payload.questionType, 80) || 'mixed'
      };
      const difficultyMix = authorizedScope?.difficultyMix || payload.difficultyMix || { Easy: 30, Medium: 50, Hard: 20 };
      const instructions = sanitizeTextInput((authorizedScope?.instructions as string) || payload.instructions, 1000);

      return {
        systemInstruction:
          'You are a School Assessment Specialist. CRITICAL CONSTRAINT: Generate assessment items STRICTLY AND ONLY from the verified taught topics, resolved NERDC topic IDs, and confirmed covered learning objectives provided in this prompt. Never introduce untaught topics, uncovered objectives, or out-of-scope curriculum material. Every question must explicitly reference its source NERDC topicId and learningObjectiveIds.',
        contents: `Generate a ${assessmentType} strictly bounded to teacher-authorized taught evidence:
- Curriculum Version: ${curriculumVersionId}
- Subject: ${subjectName}
- Class: ${classGrade}${verifiedEvidence?.section ? ` (${sanitizeTextInput(verifiedEvidence.section, 80)})` : ''}
- Academic Session / Term: ${sanitizeTextInput(verifiedEvidence?.academicSession, 60) || 'Current Session'} / ${sanitizeTextInput(verifiedEvidence?.term, 40) || 'Current Term'}
- Scope Authorization ID: ${sanitizeTextInput(authorizedScope?.scopeAuthorizationId, 80) || 'in-memory-harness'} (v${Number(authorizedScope?.scopeVersion || 1)})
- Total Questions: ${totalQuestions}
- Total Marks: ${totalMarks}
- Duration Minutes: ${durationMinutes}
- Question Types Config: ${JSON.stringify(questionTypesConfig)}
- Difficulty Mix: ${JSON.stringify(difficultyMix)}
${instructions ? `- Teacher Instructions: ${instructions}\n` : ''}- VERIFIED TAUGHT TOPICS & COVERED OBJECTIVES ONLY:
${JSON.stringify(effectiveTopics)}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subjectName: { type: Type.STRING },
            classGrade: { type: Type.STRING },
            assessmentType: { type: Type.STRING },
            totalMarks: { type: Type.INTEGER },
            coveredTopicsList: { type: Type.ARRAY, items: { type: Type.STRING } },
            guaranteeNote: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  section: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                      required: ['key', 'text']
                    }
                  },
                  marks: { type: Type.INTEGER },
                  topic: { type: Type.STRING },
                  topicId: { type: Type.STRING },
                  learningObjectiveIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cognitiveLevel: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ['questionNumber', 'section', 'questionType', 'questionText', 'marks', 'topic', 'cognitiveLevel', 'difficulty']
              }
            },
            markingGuide: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  section: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING },
                  totalMarks: { type: Type.INTEGER },
                  stepBreakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { stepDescription: { type: Type.STRING }, marksAwarded: { type: Type.NUMBER } },
                      required: ['stepDescription', 'marksAwarded']
                    }
                  },
                  partialCreditRules: { type: Type.STRING }
                },
                required: ['questionNumber', 'section', 'correctAnswer', 'modelAnswer', 'totalMarks', 'stepBreakdown', 'partialCreditRules']
              }
            }
          },
          required: ['title', 'subjectName', 'classGrade', 'assessmentType', 'totalMarks', 'coveredTopicsList', 'guaranteeNote', 'questions', 'markingGuide']
        }
      };
    }

    case 'variable_questions': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const topicTitle = sanitizeTextInput(payload.topicTitle, 400);
      if (!subjectName || !classGrade || !topicTitle) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName, classGrade, and topicTitle are required.', 400);
      }
      const baseQuestion = sanitizeTextInput(payload.baseQuestion || payload.baseQuestionPrompt || payload.objective || payload.learningObjective, 2000);
      const count = Math.max(1, Math.min(10, Number(payload.variantCount || 3)));
      return {
        systemInstruction:
          'You are a Senior Psychometrician for WAEC/NECO. Generate parallel variable question forms with identical cognitive difficulty and learning objective, varying numbers/contexts cleanly with step-by-step solutions.',
        contents: `Generate ${count} distinct variable question variants:\n- Subject: ${subjectName}\n- Class Level: ${classGrade}\n- Topic: ${topicTitle}\n- Base Question / Objective: ${baseQuestion || 'Core curriculum calculation and concept application'}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              variantNumber: { type: Type.INTEGER },
              questionText: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                  required: ['key', 'text']
                }
              },
              correctAnswer: { type: Type.STRING },
              stepByStepSolution: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              alignedObjective: { type: Type.STRING }
            },
            required: ['variantNumber', 'questionText', 'correctAnswer', 'stepByStepSolution', 'difficulty', 'alignedObjective']
          }
        }
      };
    }

    case 'exam_builder': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      const topicTitle = sanitizeTextInput(payload.topicTitle, 400);
      if (!subjectName || !classGrade || !topicTitle) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName, classGrade, and topicTitle are required.', 400);
      }
      const targetExam = sanitizeTextInput(payload.targetExam, 80) || 'WAEC';
      const count = Math.max(1, Math.min(25, Number(payload.count || 5)));
      const questionType = sanitizeTextInput(payload.questionType, 60) || 'multiple_choice';
      return {
        systemInstruction:
          `You are a Senior ${targetExam} Examiner. Generate curriculum-aligned examination questions with accurate answer keys and marking schemes strictly as JSON.`,
        contents: `Generate ${count} ${questionType} ${targetExam} questions:\n- Subject: ${subjectName}\n- Class: ${classGrade}\n- Topic: ${topicTitle}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  questionType: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                      required: ['key', 'text']
                    }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  markingScheme: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ['questionNumber', 'questionType', 'questionText', 'correctAnswer', 'explanation', 'difficulty']
              }
            }
          },
          required: ['questions']
        }
      };
    }

    case 'cbt_paper': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for CBT generation.', 400);
      }
      const topicTitle = sanitizeTextInput(payload.topicTitle, 400) || 'Term Assessment';
      const questionCount = Math.max(1, Math.min(60, Number(payload.questionCount || payload.count || 10)));
      const durationMinutes = Math.max(5, Math.min(180, Number(payload.durationMinutes || 30)));
      return {
        systemInstruction:
          'You are a Computer-Based Testing (CBT) Chief Assessment Psychometrician. Produce strictly JSON CBT items with 4 distinct options (A-D), unambiguous correctKey, cognitive level, and distractor rationale.',
        contents: `Generate a ${questionCount}-question CBT Examination Paper (${durationMinutes} mins):\n- Subject: ${subjectName}\n- Class: ${classGrade}\n- Topic Focus: ${topicTitle}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subjectName: { type: Type.STRING },
            classGrade: { type: Type.STRING },
            durationMinutes: { type: Type.INTEGER },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  stem: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                      required: ['key', 'text']
                    }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  cognitiveDemand: { type: Type.STRING },
                  marks: { type: Type.INTEGER }
                },
                required: ['questionNumber', 'stem', 'options', 'correctAnswer', 'explanation', 'difficulty', 'cognitiveDemand', 'marks']
              }
            }
          },
          required: ['title', 'subjectName', 'classGrade', 'durationMinutes', 'questions']
        }
      };
    }

    case 'question_bank_items': {
      const subjectName = sanitizeTextInput(payload.subjectName, 200);
      const classGrade = sanitizeTextInput(payload.classGrade, 100);
      if (!subjectName || !classGrade) {
        throw new AiGatewayError('VALIDATION_ERROR', 'subjectName and classGrade are required for Question Bank item generation.', 400);
      }
      const qType = sanitizeTextInput(payload.questionType, 60) || 'objective';
      const topic = sanitizeTextInput(payload.topic || payload.topicTitle, 400) || 'Core Curriculum';
      const count = Math.max(1, Math.min(20, Number(payload.count || 3)));
      const isObjective = qType === 'objective';

      return {
        systemInstruction: isObjective
          ? 'You are an expert WAEC/NECO Assessment Item Writer. Return JSON questions array with stem, options (A-D), correctAnswer, explanation, difficulty, cognitiveDemand.'
          : 'You are an expert Chief Examiner and Science Practical Assessor. Return JSON questions array with stem, correctAnswer, explanation, marks, difficulty, cognitiveDemand, markingRubric.',
        contents: `Generate ${count} ${qType} assessment questions:\n- Subject: ${subjectName}\n- Class Level: ${classGrade}\n- Topic: ${topic}${groundingContext ? `\n\n${groundingContext}` : ''}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stem: { type: Type.STRING },
                  ...(isObjective
                    ? {
                        options: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: { key: { type: Type.STRING }, text: { type: Type.STRING } },
                            required: ['key', 'text']
                          }
                        }
                      }
                    : {
                        marks: { type: Type.INTEGER },
                        markingRubric: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: { stepDescription: { type: Type.STRING }, marksAwarded: { type: Type.NUMBER } },
                            required: ['stepDescription', 'marksAwarded']
                          }
                        }
                      }),
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  cognitiveDemand: { type: Type.STRING }
                },
                required: isObjective
                  ? ['stem', 'options', 'correctAnswer', 'explanation', 'difficulty', 'cognitiveDemand']
                  : ['stem', 'correctAnswer', 'explanation', 'marks', 'difficulty', 'cognitiveDemand', 'markingRubric']
              }
            }
          },
          required: ['questions']
        }
      };
    }

    case 'provisioning_recommend': {
      const prompt = sanitizeTextInput(payload.prompt || payload.rawPrompt, 4000);
      if (!prompt) {
        throw new AiGatewayError('VALIDATION_ERROR', 'prompt is required for provisioning recommendations.', 400);
      }
      return {
        systemInstruction:
          'You are the Curriculum Infrastructure Provisioning Advisor (CIPA). Analyze school onboarding requirements and output STRICTLY READ-ONLY architecture, Cloud Run/Cloud SQL sizing, and workload recommendations in JSON. NEVER claim infrastructure was provisioned or IAM was modified.',
        contents: `Analyze provisioning request and produce advisory recommendations:\n${prompt}\n\nTarget Platform GCP Region Baseline: europe-west1`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedTopology: { type: Type.STRING },
            recommendedGcpRegion: { type: Type.STRING },
            rationale: { type: Type.STRING },
            tradeOffs: { type: Type.ARRAY, items: { type: Type.STRING } },
            extractedRequirements: {
              type: Type.OBJECT,
              properties: {
                schoolName: { type: Type.STRING },
                studentPopulation: { type: Type.INTEGER },
                staffPopulation: { type: Type.INTEGER },
                concurrentUsers: { type: Type.INTEGER },
                securityIsolation: { type: Type.STRING },
                databaseStrategy: { type: Type.STRING },
                storageStrategy: { type: Type.STRING },
                storageRequirementsGb: { type: Type.INTEGER }
              },
              required: ['schoolName', 'studentPopulation', 'staffPopulation', 'concurrentUsers', 'securityIsolation', 'databaseStrategy', 'storageStrategy', 'storageRequirementsGb']
            },
            resourceSizing: {
              type: Type.OBJECT,
              properties: {
                cloudRunMinInstances: { type: Type.INTEGER },
                cloudRunMaxInstances: { type: Type.INTEGER },
                cloudRunCpu: { type: Type.STRING },
                cloudRunMemory: { type: Type.STRING },
                cloudSqlTier: { type: Type.STRING },
                estimatedConcurrentPeakUsers: { type: Type.INTEGER }
              },
              required: ['cloudRunMinInstances', 'cloudRunMaxInstances', 'cloudRunCpu', 'cloudRunMemory', 'cloudSqlTier', 'estimatedConcurrentPeakUsers']
            },
            workloadAnalysis: {
              type: Type.OBJECT,
              properties: {
                profile: { type: Type.STRING },
                cbtConcurrencyPeak: { type: Type.INTEGER },
                aiRequestsPerDayEstimate: { type: Type.INTEGER },
                notes: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['profile', 'cbtConcurrencyPeak', 'aiRequestsPerDayEstimate', 'notes']
            }
          },
          required: ['recommendedTopology', 'recommendedGcpRegion', 'rationale', 'tradeOffs', 'extractedRequirements', 'resourceSizing', 'workloadAnalysis']
        }
      };
    }

    default:
      throw new AiGatewayError('UNSUPPORTED_CAPABILITY', `Unsupported AI task type: ${String(taskType)}`, 400);
  }
}
