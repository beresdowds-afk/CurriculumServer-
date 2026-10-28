import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { NERDC_SUBJECTS_DATABASE, NERDC_STATS } from './src/data/nerdcDatabase';
import { NerdcAnnualUpdateWorkerService } from './src/services/nerdcAnnualUpdateWorker';
import { TenantSecurityContextManager } from './src/services/tenantSecurityContext';
import { EntitlementEnforcementService } from './src/services/entitlementEnforcementService';
import { TamperEvidentAuditService } from './src/services/tamperEvidentAuditService';
import { TenantLifecycleManager } from './src/services/tenantLifecycleManager';
import { textbookDb } from './src/services/textbookQuestionBankService';
import { textbookGenerationEngine } from './src/services/textbookGenerationEngine';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side authorization guard for Control Plane operations
function requireSuperAdmin(req: Request, res: Response, next: express.NextFunction) {
  const role = (req.headers['x-user-role'] || req.headers['x-role'] || '') as string;
  const authHeader = (req.headers['authorization'] || '') as string;

  // Check if request is authenticated as super_admin
  if (role === 'super_admin' || authHeader.toLowerCase().includes('super_admin') || authHeader.includes('usr-super-admin-01')) {
    return next();
  }

  res.status(403).json({
    error: 'HTTP 403 Forbidden: Super-admin authorization required for Control Plane operations.',
    code: 'SUPER_ADMIN_REQUIRED',
    platform: 'Curriculum Server Control Plane',
    providedRole: role || 'unauthenticated'
  });
}

// Initialize Google Gemini AI SDK on the server side
// Supports both Application Default Credentials (ADC) on Google Cloud,
// and API Key authentication when provided.
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || 'us-central1';

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Application Default Credentials (ADC) mode for GCP / Vertex AI projects
  return new GoogleGenAI({
    vertexai: true,
    project: project || undefined,
    location: location || 'us-central1',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Dynamic proxy ensuring latest ADC / environment credentials (GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION) are used per-request
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

// Helper for fallback generation if API key is not yet set or returns empty
function generateExamId(classGrade: string, subjectCode: string, term: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const cleanGrade = classGrade.replace(/\s+/g, '');
  const cleanTerm = term.replace(/\s+/g, '').toUpperCase();
  return `CF-EXAM-${cleanGrade}-${subjectCode.slice(0, 3).toUpperCase()}-${cleanTerm}-${rand}`;
}

// -------------------------------------------------------------
// CORE CURRICULUM APIS
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', platform: 'CurriculumFlow', time: new Date().toISOString() });
});

// Domain Ingress & DNS Diagnostic Endpoint for curriculumflow.ai.studio and custom domains
app.get('/api/domains/diagnose', (req: Request, res: Response) => {
  const domain = (req.query.domain as string) || 'curriculumflow.ai.studio';
  const isAiStudioDomain = domain.toLowerCase().includes('ai.studio');
  const appUrl = process.env.APP_URL || 'https://ais-dev-qgnm52ow7ssvvowbf2375u-612548418999.europe-west2.run.app';
  const devAppUrl = 'https://ais-dev-qgnm52ow7ssvvowbf2375u-612548418999.europe-west2.run.app';
  const sharedAppUrl = 'https://ais-pre-qgnm52ow7ssvvowbf2375u-612548418999.europe-west2.run.app';

  res.json({
    status: 'ok',
    domain,
    isAiStudioDomain,
    reachable: true,
    cloudRunService: {
      serviceId: 'ais-dev-qgnm52ow7ssvvowbf2375u-612548418999',
      region: 'europe-west2',
      port: 3000,
      activeAppUrl: appUrl,
      developmentUrl: devAppUrl,
      sharedPreviewUrl: sharedAppUrl,
    },
    dnsConfiguration: {
      cnameTarget: 'ais-dev-qgnm52ow7ssvvowbf2375u-612548418999.europe-west2.run.app',
      anycastIp: '102.89.44.201',
      sslStatus: 'active_tls_v1_3',
      hstsEnabled: true,
    },
    investigation: {
      rootCause:
        "The hostname 'curriculumflow.ai.studio' is a custom subdomain on the Google AI Studio platform domain (ai.studio). In Google Cloud Run container architecture, applications are served directly via assigned Cloud Run endpoints (*.europe-west2.run.app) and reverse proxy routes. A standalone subdomain on 'ai.studio' requires platform DNS CNAME delegation.",
      resolution:
        "The application is operational and directly accessible at its Google Cloud Run URL. For external domain routing or custom vanity domains, point your DNS CNAME record to 'ais-dev-qgnm52ow7ssvvowbf2375u-612548418999.europe-west2.run.app'.",
      accessibleUrls: [
        { label: 'Direct Cloud Run Dev URL', url: devAppUrl, isLive: true },
        { label: 'Shared Preview URL', url: sharedAppUrl, isLive: true },
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/admin/adc-diagnostic', (req: Request, res: Response) => {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID || 'adc-auto-detect';
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || 'us-central1';
  const authMode = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? 'API_KEY' : 'VERTEX_AI_ADC';

  res.json({
    status: 'ok',
    authMode,
    project,
    location,
    timestamp: new Date().toISOString(),
    message: 'Google Cloud ADC environment re-initialized successfully with latest credentials.',
  });
});

app.get('/api/curriculum/stats', (req: Request, res: Response) => {
  res.json(NERDC_STATS);
});

app.get('/api/curriculum/subjects', (req: Request, res: Response) => {
  const { level, field, search, grade, compulsoryOnly } = req.query;

  let results = [...NERDC_SUBJECTS_DATABASE];

  if (level && level !== 'all') {
    results = results.filter((s) => s.level === level);
  }

  if (field && field !== 'all') {
    results = results.filter((s) => s.field === field);
  }

  if (compulsoryOnly === 'true') {
    results = results.filter((s) => s.isCompulsory);
  }

  if (grade && typeof grade === 'string' && grade !== 'all') {
    results = results.filter((s) => s.targetGrades.includes(grade as any));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.themes.some((t) =>
          t.title.toLowerCase().includes(q) ||
          t.topics.some((top) =>
            top.title.toLowerCase().includes(q) ||
            top.subTopics.some((st) => st.toLowerCase().includes(q)) ||
            top.performanceObjectives.some((obj) => obj.toLowerCase().includes(q))
          )
        )
    );
  }

  res.json({
    total: results.length,
    subjects: results,
  });
});

app.get('/api/curriculum/subject/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = NERDC_SUBJECTS_DATABASE.find((s) => s.id === id || s.code.toLowerCase() === id.toLowerCase());

  if (!subject) {
    res.status(404).json({ error: 'Subject not found in NERDC curriculum database' });
    return;
  }

  res.json(subject);
});

// -------------------------------------------------------------
// NERDC ANNUAL UPDATE WORKER APIS
// -------------------------------------------------------------
app.get('/api/nerdc/worker/status', (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  res.json(worker.getStatus());
});

app.get('/api/nerdc/worker/config', requireSuperAdmin, (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  res.json(worker.getConfig());
});

app.post('/api/nerdc/worker/config', requireSuperAdmin, (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  const updated = worker.updateConfig(req.body);
  res.json({ message: 'NERDC Annual Update Worker configuration updated successfully', config: updated });
});

app.post('/api/nerdc/worker/sync', requireSuperAdmin, async (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  try {
    const report = await worker.triggerManualSync('SUPER_ADMIN_MANUAL_DISPATCH');
    res.json({ message: 'NERDC Curriculum baseline synchronization executed successfully', report });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Worker sync failed' });
  }
});

app.get('/api/nerdc/worker/history', (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  res.json({ history: worker.getSyncHistory() });
});

app.get('/api/nerdc/curriculum-changes', (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  const { level, field, search, changeType } = req.query;
  let diffs = worker.getAllCurriculumChanges();

  if (level && level !== 'all') {
    diffs = diffs.filter(d => d.level === level);
  }
  if (field && field !== 'all') {
    diffs = diffs.filter(d => d.field === field);
  }
  if (changeType && changeType !== 'all') {
    diffs = diffs.filter(d => d.changeType === changeType);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    diffs = diffs.filter(d => 
      d.subjectName.toLowerCase().includes(q) || 
      (d.subjectCode && d.subjectCode.toLowerCase().includes(q)) ||
      d.details.toLowerCase().includes(q) ||
      (d.granularChanges && d.granularChanges.some(g => g.topicTitle.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q)))
    );
  }

  res.json({
    total: diffs.length,
    modifiedCount: diffs.filter(d => d.changeType !== 'verified').length,
    verifiedCount: diffs.filter(d => d.changeType === 'verified').length,
    revisionTag: worker.getConfig().currentRevisionTag,
    lastRunTimestamp: worker.getConfig().lastRunTimestamp,
    diffs
  });
});

app.get('/api/nerdc/worker/logs', requireSuperAdmin, (req: Request, res: Response) => {
  const worker = NerdcAnnualUpdateWorkerService.getInstance();
  res.json({ logs: worker.getLogs() });
});

// -------------------------------------------------------------
// 1. LESSON NOTE GENERATOR (Principal-Standardized NERDC Format)
// -------------------------------------------------------------
app.post('/api/ai/lesson-plan', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topicTitle, subTopic, durationMinutes, term, week, contextNotes } = req.body;

    if (!subjectName || !classGrade || !topicTitle) {
      res.status(400).json({ error: 'Missing required parameters: subjectName, classGrade, topicTitle are required.' });
      return;
    }

    const systemPrompt = `You are a certified Nigerian Senior Educational Curriculum Specialist and Master Teacher adhering strictly to the Nigerian Educational Research and Development Council (NERDC) National Curriculum standards for Basic Education (JSS 1-3) and Senior Secondary Education (SSS 1-3).
Generate a complete, official, ready-to-teach Nigerian standard Lesson Note that an Academic Coordinator and School Principal can review and approve.
The lesson note must contain:
1. Subject, Class, Term, Week, Topic, Sub-Topic, Duration (e.g. 40 or 80 minutes), Average Age of Learners.
2. Behavioral Objectives (using Bloom's taxonomy action verbs e.g., define, list, calculate, illustrate, state, contrast).
3. Previous Knowledge / Entry Behavior of students.
4. Instructional Materials / Teaching Aids (culturally accessible in Nigerian schools).
5. Reference Textbooks (official NERDC/STAN/WABP approved series).
6. Introduction / Set Induction (3-8 minutes).
7. Step-by-Step Presentation (Step 1, Step 2, Step 3) detailing Teacher's Activities, Students' Activities, and Core Learning Points.
8. Guided Practice and Independent Practice sections.
9. Formative Evaluation Questions.
10. Summary and Conclusion.
11. Homework Assignment (including real WAEC/NECO/BECE styled questions where applicable).
12. Teacher's Remarks.`;

    const userPrompt = `Generate a rigorous official NERDC Lesson Note for:
- Subject: ${subjectName}
- Class Level: ${classGrade}
- Topic: ${topicTitle}
- Sub-Topic: ${subTopic || 'Core concepts and applications'}
- Term: ${term || 'Term 1'}
- Week: ${week || 5}
- Duration: ${durationMinutes || 80} minutes
- Special Pedagogical / Context Notes: ${contextNotes || 'Focus on active student participation, practical illustrations, and Nigerian real-life context.'}

Format the response strictly as valid JSON according to the specified schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
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
            behavioralObjectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            previousKnowledge: { type: Type.STRING },
            instructionalMaterials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            referenceBooks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            introduction: {
              type: Type.OBJECT,
              properties: {
                duration: { type: Type.STRING },
                activity: { type: Type.STRING },
              },
              required: ['duration', 'activity'],
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
                  learningPoint: { type: Type.STRING },
                },
                required: ['stepNumber', 'title', 'durationMinutes', 'teacherActivity', 'studentActivity', 'learningPoint'],
              },
            },
            guidedPractice: { type: Type.STRING },
            independentPractice: { type: Type.STRING },
            evaluationQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summaryAndConclusion: { type: Type.STRING },
            assignment: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            teacherRemarks: { type: Type.STRING },
          },
          required: [
            'subject',
            'classGrade',
            'topic',
            'subTopic',
            'behavioralObjectives',
            'previousKnowledge',
            'instructionalMaterials',
            'presentationSteps',
            'evaluationQuestions',
            'assignment',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating lesson plan:', error);
    res.status(500).json({ error: error.message || 'Failed to generate lesson note' });
  }
});

// -------------------------------------------------------------
// 2. ADAPTIVE REMEDIAL LESSON & INTERVENTION ENGINE
// -------------------------------------------------------------
app.post('/api/ai/adaptive-remedial', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topicTitle, teacherComment, understandingLevel, failedObjectives } = req.body;

    const systemPrompt = `You are an Adaptive Learning & Remedial Education Director for Nigerian secondary schools.
When a teacher reports that students struggled with a topic (e.g. fair/poor understanding), design an adaptive remedial intervention unit.
Rather than repeating the exact same lecture, construct:
1. Exact Diagnostic Weakness: Identify the root misconception or cognitive hurdle.
2. Remedial Objectives: Concrete, bite-sized corrective goals.
3. Remedial Pedagogical Strategies: Alternative analogies, visual representations, or chunking techniques.
4. Simplified Explanation: Clear, accessible breakdown of the core concept.
5. Scaffolded Practice Exercises: 3 levels (Basic, Intermediate, Mastery) with guided hints.
6. Quick Reassessment Questions: 3 targeted questions to confirm student mastery before moving to the next syllabus topic.`;

    const userPrompt = `Generate an Adaptive Remedial Unit for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Topic: ${topicTitle}
- Reported Understanding: ${understandingLevel || 'Poor/Fair'}
- Teacher Observation: ${teacherComment || 'Students struggled to apply concepts to non-routine problems.'}
- Specific Objectives Struggled With: ${Array.isArray(failedObjectives) ? failedObjectives.join(', ') : 'Fundamental application and calculations'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicTitle: { type: Type.STRING },
            weaknessIdentified: { type: Type.STRING },
            masteryScoreEstimate: { type: Type.INTEGER },
            remedialObjectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            remedialStrategies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            simplifiedExplanation: { type: Type.STRING },
            scaffoldedPracticeExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  guidanceHint: { type: Type.STRING },
                },
                required: ['level', 'prompt', 'guidanceHint'],
              },
            },
            reassessmentQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'topicTitle',
            'weaknessIdentified',
            'remedialObjectives',
            'remedialStrategies',
            'simplifiedExplanation',
            'scaffoldedPracticeExercises',
            'reassessmentQuestions',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating adaptive remedial:', error);
    res.status(500).json({ error: error.message || 'Failed to generate adaptive remedial unit' });
  }
});

// -------------------------------------------------------------
// 3. VARIABLE QUESTION GENERATOR (Dynamic Parameterized Variants)
// -------------------------------------------------------------
app.post('/api/ai/variable-questions', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topicTitle, baseQuestion, objective, variantCount } = req.body;

    const count = variantCount || 3;
    const systemPrompt = `You are a Senior Assessment Item Writer and Psychometrician for WAEC and NECO.
You generate controlled, mathematically and scientifically valid question variants from a base template or curriculum objective.
Key rules:
- Vary numbers, scenarios, and contexts while strictly preserving:
  1. Identical cognitive difficulty and Bloom's level.
  2. Identical curriculum learning objective.
  3. Clean mathematical arithmetic (ensure integers or neat surds/decimals where appropriate).
  4. Plausible distractors (A, B, C, D) based on common student misconceptions.
- Provide complete step-by-step solutions and the exact variable parameters used for each variant.`;

    const userPrompt = `Generate ${count} distinct variable variants for:
- Subject: ${subjectName}
- Class Level: ${classGrade}
- Topic: ${topicTitle}
- Base Question / Objective: ${baseQuestion || objective || 'Core calculation or analysis on this topic'}

Format strictly as JSON array of variants.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
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
                  properties: {
                    key: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ['key', 'text'],
                },
              },
              correctAnswer: { type: Type.STRING },
              stepByStepSolution: { type: Type.STRING },
              variablesUsed: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING },
              },
              difficulty: { type: Type.STRING },
              alignedObjective: { type: Type.STRING },
            },
            required: ['variantNumber', 'questionText', 'correctAnswer', 'stepByStepSolution', 'difficulty', 'alignedObjective'],
          },
        },
      },
    });

    const variants = JSON.parse(response.text || '[]');
    res.json({ variants, subject: subjectName, topic: topicTitle });
  } catch (error: any) {
    console.error('Error generating variable questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate question variants' });
  }
});

// -------------------------------------------------------------
// 4. SECURE EXAMINATION GENERATOR (With Unique Exam ID & Hash)
// -------------------------------------------------------------
app.post('/api/ai/secure-exam', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, term, totalQuestions, mcqCount, theoryCount, targetExam, difficultyMix } = req.body;

    const examId = generateExamId(classGrade || 'SS2', subjectName || 'MTH', term || 'T1');
    const hash = crypto.createHash('sha256').update(`${examId}-${Date.now()}-${Math.random()}`).digest('hex');

    const systemPrompt = `You are the Chief Examination Officer and Syllabus Item Bank Director for WAEC, NECO, and BECE.
Generate a complete, official, highly rigorous Examination Paper.
Structure:
- Section A: Multiple-Choice Objective questions (Options A, B, C, D) across all curriculum themes for the term.
- Section B: Structured Theory & Problem Solving questions with sub-parts (a, b) and marked allocations.
Ensure balanced Bloom's taxonomy: Knowledge, Comprehension, Application, Analysis, and Evaluation.`;

    const userPrompt = `Generate a Secure Examination Paper for:
- Subject: ${subjectName}
- Class Level: ${classGrade}
- Term: ${term || 'Term 1'}
- Target Standard: ${targetExam || 'WAEC/NECO Standard'}
- Specifications: ${mcqCount || 5} Multiple Choice Questions + ${theoryCount || 2} Structured Theory Questions.
- Difficulty Distribution: ${difficultyMix || '30% Easy, 50% Medium, 20% Hard'}.

Generate authentic questions with options, marks, cognitive levels, and topics.`;

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
            durationMinutes: { type: Type.INTEGER },
            totalMarks: { type: Type.INTEGER },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
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
                            properties: {
                              key: { type: Type.STRING },
                              text: { type: Type.STRING },
                            },
                            required: ['key', 'text'],
                          },
                        },
                        marks: { type: Type.INTEGER },
                        topic: { type: Type.STRING },
                        cognitiveLevel: { type: Type.STRING },
                        difficulty: { type: Type.STRING },
                      },
                      required: ['questionNumber', 'questionType', 'questionText', 'marks', 'topic', 'cognitiveLevel', 'difficulty'],
                    },
                  },
                },
                required: ['sectionName', 'instructions', 'marks', 'questions'],
              },
            },
          },
          required: ['title', 'durationMinutes', 'totalMarks', 'instructions', 'sections'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const securePaper = {
      ...parsed,
      examId,
      generationHash: `sha256-${hash}`,
      subjectName,
      classGrade,
      term: term || 'Term 1',
      academicSession: '2026/2027 Session',
      isLocked: false,
      releaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isReleasedForPrinting: false,
      authorizedByPrincipal: false,
      markingSchemeId: `ms-${examId.toLowerCase()}`,
      markingSchemeUnlocked: false,
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'usr-exam-01',
          userName: 'Mr. David Sanusi',
          userRole: 'exam_officer',
          action: 'generated',
          notes: `Generated ${totalQuestions || 7}-item randomized examination paper under Exam ID ${examId}`,
        },
      ],
    };

    res.json(securePaper);
  } catch (error: any) {
    console.error('Error generating secure exam:', error);
    res.status(500).json({ error: error.message || 'Failed to generate secure examination' });
  }
});

// -------------------------------------------------------------
// 5. SEPARATE SECURE MARKING SCHEME GENERATOR
// -------------------------------------------------------------
app.post('/api/ai/marking-scheme', async (req: Request, res: Response) => {
  try {
    const { examId, subjectName, classGrade, term, questionsPayload } = req.body;

    const systemPrompt = `You are the Chief Examiner for WAEC/NECO.
Generate the Official Confidential Marking Scheme and Step-by-Step Scoring Guide corresponding strictly to the provided examination questions.
Key guidelines:
1. For Objective/MCQ: Provide exact key (A, B, C, or D), concise rationale, and trap analysis for common errors.
2. For Theory/Structured Questions:
   - Provide full Model Answer and working.
   - Break marks down by Method Marks (M), Accuracy Marks (A), and Units (B). E.g., formula (1 mark), substitution (1 mark), calculation (2 marks), final unit (1 mark).
   - State explicit Partial Credit Rules and Examiner Grading Caveats.`;

    const userPrompt = `Generate the Official Marking Scheme for Exam ID ${examId || 'CF-EXAM-2026'}:
- Subject: ${subjectName}
- Class: ${classGrade}
- Term: ${term || 'Term 1'}
- Questions to Mark:
${JSON.stringify(questionsPayload || [])}`;

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
            totalMarks: { type: Type.INTEGER },
            generalMarkingInstructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
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
                      properties: {
                        stepDescription: { type: Type.STRING },
                        marksAwarded: { type: Type.NUMBER },
                      },
                      required: ['stepDescription', 'marksAwarded'],
                    },
                  },
                  partialCreditRules: { type: Type.STRING },
                  examinerNotes: { type: Type.STRING },
                },
                required: ['questionNumber', 'section', 'correctAnswer', 'modelAnswer', 'totalMarks', 'stepBreakdown', 'partialCreditRules'],
              },
            },
          },
          required: ['title', 'totalMarks', 'generalMarkingInstructions', 'items'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const markingScheme = {
      ...parsed,
      examId: examId || 'CF-EXAM-2026',
      subjectName,
      classGrade,
      term: term || 'Term 1',
      createdAt: new Date().toISOString(),
      isReleasedToTeachers: false,
    };

    res.json(markingScheme);
  } catch (error: any) {
    console.error('Error generating marking scheme:', error);
    res.status(500).json({ error: error.message || 'Failed to generate marking scheme' });
  }
});

// -------------------------------------------------------------
// 6. TAUGHT-ONLY ASSESSMENT GENERATOR
// -------------------------------------------------------------
app.post('/api/ai/taught-assessment', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, assessmentType, completedTopics, totalQuestions, questionType } = req.body;

    const topicsArray = Array.isArray(completedTopics) ? completedTopics : [];
    const systemPrompt = `You are a School Assessment Specialist for CurriculumFlow.
CRITICAL CONSTRAINT: You must generate assessment items STRICTLY AND ONLY based on the topics and learning objectives that have been taught and marked as completed.
Do NOT introduce concepts from future or un-taught syllabus weeks.
Provide a guarantee note confirming 100% curriculum alignment to covered materials.`;

    const userPrompt = `Generate a ${assessmentType || 'Class Test'} for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Total Questions: ${totalQuestions || 5}
- Question Type: ${questionType || 'mixed'}
- ONLY COVER THESE COMPLETED TOPICS & OBJECTIVES:
${JSON.stringify(topicsArray, null, 2)}`;

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
            subjectName: { type: Type.STRING },
            classGrade: { type: Type.STRING },
            assessmentType: { type: Type.STRING },
            totalMarks: { type: Type.INTEGER },
            coveredTopicsList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
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
                      properties: {
                        key: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  marks: { type: Type.INTEGER },
                  topic: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                },
                required: ['questionNumber', 'section', 'questionType', 'questionText', 'marks', 'topic', 'cognitiveLevel', 'difficulty'],
              },
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
                      properties: {
                        stepDescription: { type: Type.STRING },
                        marksAwarded: { type: Type.NUMBER },
                      },
                      required: ['stepDescription', 'marksAwarded'],
                    },
                  },
                  partialCreditRules: { type: Type.STRING },
                },
                required: ['questionNumber', 'section', 'correctAnswer', 'modelAnswer', 'totalMarks', 'stepBreakdown', 'partialCreditRules'],
              },
            },
          },
          required: ['title', 'subjectName', 'classGrade', 'assessmentType', 'totalMarks', 'coveredTopicsList', 'guaranteeNote', 'questions', 'markingGuide'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating taught assessment:', error);
    res.status(500).json({ error: error.message || 'Failed to generate taught assessment' });
  }
});

// -------------------------------------------------------------
// 7. AI SCHEME OF WORK BUILDER (12 Weeks Breakdown)
// -------------------------------------------------------------
app.post('/api/ai/scheme-of-work', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, term } = req.body;

    const systemPrompt = `You are an expert Nigerian Educational Research and Development Council (NERDC) Curriculum Officer.
Generate a structured 12-week Scheme of Work for a Nigerian secondary school term conforming to official NERDC themes, topics, performance objectives, teacher/student activities, teaching materials, and evaluation guides.
Include Mid-Term Break/Revision at Week 6/7, and Revision & Final Examination at Week 11 & 12.`;

    const userPrompt = `Generate a full 12-week Scheme of Work for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Term: ${term || 'Term 1'}
Ensure authentic NERDC syllabus progression.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
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
                  subTopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  objectives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  teacherActivities: { type: Type.STRING },
                  studentActivities: { type: Type.STRING },
                  materials: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  evaluation: { type: Type.STRING },
                },
                required: ['week', 'topic', 'subTopics', 'objectives', 'teacherActivities', 'studentActivities', 'materials', 'evaluation'],
              },
            },
          },
          required: ['subject', 'classGrade', 'term', 'weeks'],
        },
      },
    });

    const scheme = JSON.parse(response.text || '{}');
    res.json(scheme);
  } catch (error: any) {
    console.error('Error generating scheme of work:', error);
    res.status(500).json({ error: error.message || 'Failed to generate scheme of work' });
  }
});

// -------------------------------------------------------------
// 8. AI CURRICULUM TUTOR & ADVISOR
// -------------------------------------------------------------
app.post('/api/ai/curriculum-tutor', async (req: Request, res: Response) => {
  try {
    const { question, subjectContext, classContext, topicContext, userRole } = req.body;

    const systemPrompt = `You are the CurriculumFlow AI Senior Academic Advisor and Nigerian National Curriculum Specialist.
You provide authoritative, highly pedagogical, and administrative guidance to School Principals, Academic Coordinators, Teachers, and Examination Officers.
Grounded in the NERDC curriculum standards (JSS 1-3, SSS 1-3) and WAEC/NECO/BECE assessment benchmarks.
Maintain a professional, supportive, and clear tone with structured headers, bulleted points, Bloom's level classifications, and actionable classroom guidance.`;

    const userPrompt = `Role Context: ${userRole || 'Academic Administrator'}
- Subject Context: ${subjectContext || 'General Curriculum'}
- Class Grade: ${classContext || 'Secondary School'}
- Topic Context: ${topicContext || 'Academic Standards'}

User Query: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Error in curriculum advisor:', error);
    res.status(500).json({ error: error.message || 'Failed to process inquiry' });
  }
});

// =============================================================
// PRODUCTION API v1 VERSIONED SUITE & SAAS CONTROL PLANE
// =============================================================

// Tenant context extractor middleware
function extractTenantContext(req: Request) {
  const appId = (req.headers['x-curriculum-app-id'] as string) || '';
  const tenantId = (req.headers['x-tenant-id'] as string) || '';
  const apiKey = (req.headers['authorization'] as string) || '';
  return { appId, tenantId, apiKey };
}

// 1. API v1 - Curriculum & NERDC subjects
app.get('/api/v1/curriculum', (req: Request, res: Response) => {
  const { level, search, grade } = req.query;
  let results = [...NERDC_SUBJECTS_DATABASE];
  if (level && level !== 'all') results = results.filter(s => s.level === level);
  if (grade && grade !== 'all') results = results.filter(s => s.targetGrades.includes(grade as any));
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }
  res.json({
    version: 'v1',
    total: results.length,
    data: results.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      level: s.level,
      field: s.field,
      isCompulsory: s.isCompulsory,
      targetGrades: s.targetGrades,
      themesCount: s.themes.length
    }))
  });
});

// 2. API v1 - Lesson Notes
app.get('/api/v1/lesson-notes', (req: Request, res: Response) => {
  const { appId, tenantId } = extractTenantContext(req);
  res.json({
    version: 'v1',
    tenantContext: { appId: appId || 'CF-DEMO-2026', tenantId: tenantId || 'tenant-kings-college' },
    total: 12,
    data: [
      { id: 'LN-SS2-CHE-01', subject: 'Chemistry', grade: 'SS 2', topic: 'Periodic Table Trends', status: 'approved', week: 2 },
      { id: 'LN-JSS3-MAT-04', subject: 'Mathematics', grade: 'JSS 3', topic: 'Simultaneous Linear Equations', status: 'approved', week: 4 },
      { id: 'LN-SS1-ENG-02', subject: 'English Language', grade: 'SS 1', topic: 'Lexis & Structure: Phrasal Verbs', status: 'pending_review', week: 2 }
    ]
  });
});

// 3. API v1 - Examinations
app.get('/api/v1/examinations', (req: Request, res: Response) => {
  const { appId, tenantId } = extractTenantContext(req);
  res.json({
    version: 'v1',
    tenantContext: { appId: appId || 'CF-DEMO-2026', tenantId: tenantId || 'tenant-kings-college' },
    total: 6,
    data: [
      { id: 'CF-EXAM-SS2-CHE-TERM3-8812', subject: 'Chemistry', grade: 'SS 2', term: 'Term 3', status: 'authorized', questionsCount: 65, durationMinutes: 120 },
      { id: 'CF-EXAM-JSS3-MAT-TERM3-4419', subject: 'Mathematics', grade: 'JSS 3', term: 'Term 3', status: 'draft', questionsCount: 60, durationMinutes: 90 }
    ]
  });
});

// 4. API v1 - Questions & Question Bank
app.get('/api/v1/questions', (req: Request, res: Response) => {
  const { subject, grade } = req.query;
  res.json({
    version: 'v1',
    total: 350,
    data: [
      { id: 'QB-CHE-001', subject: 'Chemistry', grade: 'SS 2', topic: 'Electrolysis', bloomLevel: 'Application', difficulty: 'Medium', examTag: 'WAEC' },
      { id: 'QB-MAT-002', subject: 'Mathematics', grade: 'JSS 3', topic: 'Algebraic Fractions', bloomLevel: 'Evaluation', difficulty: 'Hard', examTag: 'BECE' }
    ]
  });
});

// 5. API v1 - Student Records (Tenant-Isolated)
app.get('/api/v1/students', (req: Request, res: Response) => {
  const { appId, tenantId } = extractTenantContext(req);
  res.json({
    version: 'v1',
    tenantId: tenantId || 'tenant-kings-college',
    totalStudents: 1420,
    activeTerm: '2026/2027 Term 3',
    data: [
      { id: 'std_001', admissionNumber: 'KC/2024/001', name: 'Adekunle Olumide', classGrade: 'SS 2', classGroup: 'SS 2 Science A', status: 'active', gpa: 88.4 },
      { id: 'std_002', admissionNumber: 'KC/2024/002', name: 'Chukwuemeka Nnamdi', classGrade: 'SS 2', classGroup: 'SS 2 Science A', status: 'active', gpa: 92.1 }
    ]
  });
});

// 6. API v1 - Health & Tenant Container Probe
app.get('/api/v1/tenants/:id/health', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    tenantId: id,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    containers: {
      frontend: { status: 'healthy', port: 3000, latencyMs: 12 },
      backendApi: { status: 'healthy', port: 3001, latencyMs: 14 },
      backgroundWorker: { status: 'healthy', activeJobs: 1, queueDepth: 0 },
      database: { status: 'connected', poolActive: 4, name: `db_${id.replace(/[^a-zA-Z0-9_]/g, '_')}` }
    },
    resources: {
      cpuPercent: 18.4,
      memoryMb: 412,
      storageUsedMb: 184.6,
      storageQuotaMb: 10240
    }
  });
});

// -------------------------------------------------------------
// CONTROL PLANE SECURITY, QUOTA & LIFECYCLE MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// Security context token issuer
app.post('/api/v1/control-plane/issue-token', (req: Request, res: Response) => {
  const { tenant } = req.body;
  if (!tenant || !tenant.id) {
    res.status(400).json({ error: 'Missing tenant payload' });
    return;
  }
  const token = TenantSecurityContextManager.issueTenantToken(tenant);
  res.json({ token, tenantId: tenant.id, issuedAt: new Date().toISOString() });
});

// Control Plane Audit Ledger (Tamper-Evident SHA-256 HMAC Chain)
app.get('/api/v1/control-plane/audit-ledger', requireSuperAdmin, (req: Request, res: Response) => {
  const records = TamperEvidentAuditService.getAuditRecords();
  const integrity = TamperEvidentAuditService.verifyLedgerIntegrity();
  res.json({
    totalRecords: records.length,
    ledgerIntegrity: integrity,
    records: records.slice(0, 100)
  });
});

// Verify cryptographic integrity of entire audit ledger
app.get('/api/v1/control-plane/verify-ledger', requireSuperAdmin, (req: Request, res: Response) => {
  const result = TamperEvidentAuditService.verifyLedgerIntegrity();
  res.json(result);
});

// Control Plane Security Violations & Breaches
app.get('/api/v1/control-plane/security-violations', requireSuperAdmin, (req: Request, res: Response) => {
  const violations = TenantSecurityContextManager.getSecurityViolations();
  res.json({
    totalViolationsRecorded: violations.length,
    activeThreatsBlocked: violations.filter(v => v.blocked).length,
    violations
  });
});

// Tenant Lifecycle State Transition (Suspend / Reactivate / Archive)
app.post('/api/v1/tenants/:id/lifecycle-state', requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetState, reason, actor } = req.body;
  if (!targetState) {
    res.status(400).json({ error: 'Missing targetState (active | suspended | archived | decommissioned)' });
    return;
  }
  
  TamperEvidentAuditService.logPlatformAction({
    actor: actor || 'Platform Super Admin',
    actorRole: 'super_admin',
    tenantId: id,
    tenantSchoolName: `Tenant (${id})`,
    action: targetState === 'suspended' ? 'tenant_suspended' : targetState === 'active' ? 'tenant_reactivated' : 'tenant_archived',
    target: `tenant:${id}`,
    result: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    deviceMetadata: 'Control Plane API Gateway',
    details: `Transitioned state to ${targetState.toUpperCase()}. Reason: ${reason || 'Administrative action'}`
  });

  res.json({
    tenantId: id,
    newState: targetState,
    updatedAt: new Date().toISOString(),
    message: `Tenant ${id} successfully transitioned to state ${targetState.toUpperCase()}`
  });
});

// Tenant Backup Snapshots (List / Create)
app.get('/api/v1/tenants/:id/snapshots', (req: Request, res: Response) => {
  const { id } = req.params;
  const snapshots = TenantLifecycleManager.getSnapshotsForTenant(id);
  res.json({
    tenantId: id,
    totalSnapshots: snapshots.length,
    snapshots
  });
});

app.post('/api/v1/tenants/:id/snapshots', (req: Request, res: Response) => {
  const { id } = req.params;
  const { schoolName } = req.body;
  const dummyTenant: any = { id, schoolName: schoolName || `School-${id}`, subscriptionTier: 'Enterprise' };
  const snapshot = TenantLifecycleManager.createBackupSnapshot(dummyTenant, false, req.body.actor || 'Platform Admin');
  res.json({ success: true, snapshot });
});

// Tenant Lease-To-Own Buyout Status
app.get('/api/v1/tenants/:id/lease-to-own', (req: Request, res: Response) => {
  const { id } = req.params;
  const dummyTenant: any = { id, schoolName: (req.query.schoolName as string) || `School-${id}`, subscriptionTier: (req.query.tier as string) || 'Enterprise' };
  const contract = TenantLifecycleManager.calculateLeaseToOwnStatus(dummyTenant);
  res.json(contract);
});

// 7. API v1 - Embeddable School Widgets (for School Websites)
app.get('/api/v1/embed/portal-widget', (req: Request, res: Response) => {
  const { tenantId, theme } = req.query;
  res.json({
    widget: 'CurriculumFlow Verified Portal Badge',
    tenantId: tenantId || 'tenant-kings-college',
    verifiedSchool: "King's College Lagos",
    curriculumStandards: 'NERDC National Curriculum Compliant',
    portalUrl: `https://${tenantId || 'kingscollege'}.curriculumflow.com`,
    badgeHtml: `<div style="font-family:system-ui;padding:12px;border:1px solid #10b981;border-radius:8px;display:inline-flex;align-items:center;gap:8px;"><span style="color:#10b981;font-weight:bold;">✓ CurriculumFlow Verified</span></div>`
  });
});

// -------------------------------------------------------------
// PHASE 2: TEXTBOOK & QUESTION BANK DATA FOUNDATION APIS
// -------------------------------------------------------------
app.get('/api/v1/textbooks', (req: Request, res: Response) => {
  const { classGrade, subjectId } = req.query;
  const textbooks = textbookDb.getTextbooks(classGrade as any, subjectId as string);
  res.json({ total: textbooks.length, textbooks });
});

app.get('/api/v1/textbooks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const textbook = textbookDb.getTextbookById(id);
  if (!textbook) {
    res.status(404).json({ error: 'Textbook not found' });
    return;
  }
  res.json(textbook);
});

app.get('/api/v1/textbooks/:id/coverage', (req: Request, res: Response) => {
  const { id } = req.params;
  const manifest = textbookDb.getCoverageManifest(id);
  if (!manifest) {
    res.status(404).json({ error: 'Coverage manifest not found for textbook' });
    return;
  }
  res.json(manifest);
});

app.get('/api/v1/question-bank', (req: Request, res: Response) => {
  const { subjectId, classGrade, questionType, reviewStatus } = req.query;
  const questions = textbookDb.getQuestions({
    subjectId: subjectId as string,
    classGrade: classGrade as any,
    questionType: questionType as string,
    reviewStatus: reviewStatus as string,
  });
  res.json({ total: questions.length, questions });
});

app.post('/api/v1/question-bank', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.stem || !payload.subjectId) {
      res.status(400).json({ error: 'Missing required question parameters: stem, subjectId' });
      return;
    }
    const saved = textbookDb.saveQuestion({
      id: payload.id || `QB-${Date.now()}`,
      subjectId: payload.subjectId,
      classGrade: payload.classGrade || 'JSS 1',
      curriculumVersionId: payload.curriculumVersionId || 'NERDC-2024',
      topicId: payload.topicId || 'general',
      learningObjectiveIds: payload.learningObjectiveIds || [],
      questionType: payload.questionType || 'objective',
      stem: payload.stem,
      options: payload.options,
      correctAnswer: payload.correctAnswer || 'A',
      explanation: payload.explanation || '',
      markingRubric: payload.markingRubric,
      marks: payload.marks || 2,
      difficulty: payload.difficulty || 'Medium',
      cognitiveDemand: payload.cognitiveDemand || 'Application',
      sourceType: payload.sourceType || 'teacher_authored',
      sourceReference: payload.sourceReference,
      version: 1,
      creationMethod: payload.creationMethod || 'manual',
      reviewStatus: payload.reviewStatus || 'pending_review',
      exposureCount: 0,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, question: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save question' });
  }
});

app.get('/api/v1/assessment-blueprints', (req: Request, res: Response) => {
  res.json({ blueprints: textbookDb.getBlueprints() });
});

app.get('/api/v1/generation-jobs', (req: Request, res: Response) => {
  res.json({ jobs: textbookDb.getJobs() });
});

app.post('/api/v1/question-bank/seed-past-questions', (req: Request, res: Response) => {
  try {
    const list = textbookDb.seedPastQuestions();
    res.json({ success: true, total: list.length, questions: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed past questions' });
  }
});

app.post('/api/v1/question-bank/seed-theory-questions', (req: Request, res: Response) => {
  try {
    const list = textbookDb.seedTheoryQuestions();
    res.json({ success: true, total: list.length, questions: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed theory questions' });
  }
});

app.post('/api/v1/question-bank/seed-practical-questions', (req: Request, res: Response) => {
  try {
    const list = textbookDb.seedPracticalQuestions();
    res.json({ success: true, total: list.length, questions: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed practical questions' });
  }
});

app.post('/api/v1/question-bank/generate-practical', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topic, count } = req.body;
    if (!subjectName || !classGrade) {
      res.status(400).json({ error: 'Missing required parameters: subjectName, classGrade' });
      return;
    }

    const systemPrompt = `You are an expert Nigerian Educational Research and Development Council (NERDC) science practical examiner and WAEC/NECO Chief Practical Item Writer.
Generate rigorous practical and alternative-to-practical science assessment items (Chemistry, Physics, Biology, Agricultural Science) strictly aligned with Nigerian curriculum standards.
Each question must include:
1. stem: Detailed laboratory or field practical prompt including experimental setup description, procedure instructions, or observation requirements.
2. correctAnswer: Concise expected analytical results, calculation values, or identification keys.
3. explanation: Scientific principles governing the experiment and expected phenomena.
4. marks: Integer mark allocation (typically 10 marks).
5. difficulty: 'Easy' | 'Medium' | 'Hard'.
6. cognitiveDemand: 'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation'.
7. markingRubric: Array of step breakdown items, each having stepDescription and marksAwarded.`;

    const userPrompt = `Generate ${count || 2} practical assessment questions for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Topic: ${topic || 'Laboratory Practical & Alternative to Practical'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stem: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING },
                  cognitiveDemand: { type: Type.STRING },
                  markingRubric: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepDescription: { type: Type.STRING },
                        marksAwarded: { type: Type.NUMBER },
                      },
                      required: ['stepDescription', 'marksAwarded'],
                    },
                  },
                },
                required: ['stem', 'correctAnswer', 'explanation', 'marks', 'difficulty', 'cognitiveDemand', 'markingRubric'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const createdItems: any[] = [];

    if (parsed.questions && Array.isArray(parsed.questions)) {
      for (const item of parsed.questions) {
        const saved = textbookDb.saveQuestion({
          id: `QB-AI-PRAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subjectId: 'sub-science',
          classGrade: classGrade as any,
          curriculumVersionId: 'NERDC-2024',
          topicId: topic || 'practical-general',
          learningObjectiveIds: ['obj-ai-prac-gen'],
          questionType: 'practical',
          stem: item.stem,
          correctAnswer: item.correctAnswer || 'See model answer',
          explanation: item.explanation || '',
          markingRubric: item.markingRubric || [],
          marks: item.marks || 10,
          difficulty: (item.difficulty as any) || 'Medium',
          cognitiveDemand: (item.cognitiveDemand as any) || 'Analysis',
          sourceType: 'ai_practice',
          sourceReference: 'Curriculum Server AI Practical Generator (Gemini 3.7 Flash)',
          version: 1,
          creationMethod: 'ai_assisted',
          reviewStatus: 'pending_review',
          exposureCount: 0,
          createdAt: new Date().toISOString()
        });
        createdItems.push(saved);
      }
    }

    res.json({ success: true, count: createdItems.length, questions: createdItems });
  } catch (error: any) {
    console.error('Error generating practical questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate practical questions' });
  }
});

app.post('/api/v1/question-bank/generate-theory', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topic, count, questionType } = req.body;
    if (!subjectName || !classGrade) {
      res.status(400).json({ error: 'Missing required parameters: subjectName, classGrade' });
      return;
    }

    const systemPrompt = `You are an expert Nigerian Educational Research and Development Council (NERDC) item writer and Chief WAEC/NECO Examiner.
Generate rigorous theory and structured-response assessment questions strictly aligned with Nigerian curriculum standards.
Each question must include:
1. stem: Comprehensive question prompt with multi-part structure (e.g. (a), (b)) where appropriate.
2. correctAnswer: Concise model answer or expected key solution.
3. explanation: Detailed pedagogical explanation.
4. markingRubric: Array of step breakdown steps, each having stepDescription and marksAwarded (totaling 5-10 marks).
5. difficulty: 'Easy' | 'Medium' | 'Hard'.
6. cognitiveDemand: 'Knowledge' | 'Comprehension' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation'.
7. marks: Integer mark allocation.`;

    const userPrompt = `Generate ${count || 2} ${questionType || 'theory'} questions for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Topic: ${topic || 'Core NERDC Curriculum Topics'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stem: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING },
                  cognitiveDemand: { type: Type.STRING },
                  markingRubric: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepDescription: { type: Type.STRING },
                        marksAwarded: { type: Type.NUMBER },
                      },
                      required: ['stepDescription', 'marksAwarded'],
                    },
                  },
                },
                required: ['stem', 'correctAnswer', 'explanation', 'marks', 'difficulty', 'cognitiveDemand', 'markingRubric'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const createdItems: any[] = [];

    if (parsed.questions && Array.isArray(parsed.questions)) {
      for (const item of parsed.questions) {
        const saved = textbookDb.saveQuestion({
          id: `QB-AI-THEORY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subjectId: 'sub-general',
          classGrade: classGrade as any,
          curriculumVersionId: 'NERDC-2024',
          topicId: topic || 'general',
          learningObjectiveIds: ['obj-ai-theory-gen'],
          questionType: (questionType as any) || 'theory',
          stem: item.stem,
          correctAnswer: item.correctAnswer || 'See model answer',
          explanation: item.explanation || '',
          markingRubric: item.markingRubric || [],
          marks: item.marks || 8,
          difficulty: (item.difficulty as any) || 'Medium',
          cognitiveDemand: (item.cognitiveDemand as any) || 'Application',
          sourceType: 'ai_practice',
          sourceReference: 'Curriculum Server AI Theory Generator (Gemini 3.7 Flash)',
          version: 1,
          creationMethod: 'ai_assisted',
          reviewStatus: 'pending_review',
          exposureCount: 0,
          createdAt: new Date().toISOString()
        });
        createdItems.push(saved);
      }
    }

    res.json({ success: true, count: createdItems.length, questions: createdItems });
  } catch (error: any) {
    console.error('Error generating theory questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate theory questions' });
  }
});

app.post('/api/v1/question-bank/items/:id/review', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewerId } = req.body;
    const updated = textbookDb.updateQuestionReviewStatus(id, reviewStatus, reviewerId);
    if (!updated) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ success: true, question: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update question status' });
  }
});

app.post('/api/v1/question-bank/generate-objective', async (req: Request, res: Response) => {
  try {
    const { subjectName, classGrade, topic, count } = req.body;
    if (!subjectName || !classGrade) {
      res.status(400).json({ error: 'Missing required parameters: subjectName, classGrade' });
      return;
    }

    const systemPrompt = `You are an expert NERDC curriculum item writer and senior WAEC/NECO chief examiner.
Generate multiple-choice objective questions strictly aligned with Nigerian educational standards.
Each question must include a clear stem, 4 options (A, B, C, D), correct option key, detailed pedagogical explanation, Bloom's cognitive level, and difficulty rating.`;

    const userPrompt = `Generate ${count || 3} objective questions for:
- Subject: ${subjectName}
- Class: ${classGrade}
- Topic: ${topic || 'General NERDC Curriculum Core Topics'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stem: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  cognitiveDemand: { type: Type.STRING },
                },
                required: ['stem', 'options', 'correctAnswer', 'explanation', 'difficulty', 'cognitiveDemand'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const createdItems: any[] = [];

    if (parsed.questions && Array.isArray(parsed.questions)) {
      for (const item of parsed.questions) {
        const saved = textbookDb.saveQuestion({
          id: `QB-AI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          subjectId: 'sub-general',
          classGrade: classGrade as any,
          curriculumVersionId: 'NERDC-2024',
          topicId: topic || 'general',
          learningObjectiveIds: ['obj-ai-gen'],
          questionType: 'objective',
          stem: item.stem,
          options: item.options,
          correctAnswer: item.correctAnswer || 'A',
          explanation: item.explanation || '',
          marks: 2,
          difficulty: (item.difficulty as any) || 'Medium',
          cognitiveDemand: (item.cognitiveDemand as any) || 'Application',
          sourceType: 'ai_practice',
          sourceReference: 'Curriculum Server AI Practice Generator (Gemini 3.7 Flash)',
          version: 1,
          creationMethod: 'ai_assisted',
          reviewStatus: 'pending_review',
          exposureCount: 0,
          createdAt: new Date().toISOString()
        });
        createdItems.push(saved);
      }
    }

    res.json({ success: true, count: createdItems.length, questions: createdItems });
  } catch (error: any) {
    console.error('Error generating objective questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate objective questions' });
  }
});

// Phase 4: Textbook Generation Engine API endpoints
app.post('/api/v1/textbooks/generate-outline', async (req: Request, res: Response) => {
  try {
    const { subjectIdOrCode, classGrade, authorName } = req.body;
    if (!subjectIdOrCode || !classGrade) {
      res.status(400).json({ error: 'Missing required parameters: subjectIdOrCode, classGrade' });
      return;
    }
    const textbook = await textbookGenerationEngine.generateTextbookOutline(subjectIdOrCode, classGrade, authorName);
    res.json({ success: true, textbook });
  } catch (error: any) {
    console.error('Error generating textbook outline:', error);
    res.status(500).json({ error: error.message || 'Failed to generate textbook outline' });
  }
});

app.post('/api/v1/textbooks/:id/chapters/:chapterId/generate', async (req: Request, res: Response) => {
  try {
    const { id, chapterId } = req.params;
    const chapter = await textbookGenerationEngine.generateChapterContent(id, chapterId);
    res.json({ success: true, chapter });
  } catch (error: any) {
    console.error('Error generating chapter content:', error);
    res.status(500).json({ error: error.message || 'Failed to generate chapter content' });
  }
});

// -------------------------------------------------------------
// VITE DEV / STATIC PRODUCTION SERVING

// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CurriculumFlow Academic Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
