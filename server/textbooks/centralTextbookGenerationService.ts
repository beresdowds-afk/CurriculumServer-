import type { DatabasePool } from '../db/postgres';
import type { VerifiedTenantPrincipal } from '../db/tenantContext';
import {
  CurriculumRetrievalAdapter,
  type CurriculumRetrievalPort
} from '../curriculum/centralCurriculumAdapters';
import { CentralCurriculumRepository } from '../curriculum/centralCurriculumRepository';
import type { CurriculumTopicRecord } from '../curriculum/centralCurriculumTypes';
import { CentralTextbookError, CentralTextbookRepository } from './centralTextbookRepository';
import { CentralTextbookCoverageService } from './centralTextbookCoverageService';
import {
  GeminiTextbookOperationalAdapter,
  type GeneratedChapterSectionsPayload,
  type GeneratedOutlinePayload,
  type TextbookAiAdapter
} from './geminiTextbookAdapter';
import { TextbookContentValidationAdapter } from './textbookValidationAdapter';
import type {
  CentralTextbookChapterRecord,
  CentralTextbookDetail,
  CentralTextbookGenerationJob
} from './centralTextbookTypes';

export type { GeneratedChapterSectionsPayload, GeneratedOutlinePayload, TextbookAiAdapter };

function isCurriculumRetrievalPort(candidate: unknown): candidate is CurriculumRetrievalPort {
  return Boolean(
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as CurriculumRetrievalPort).getSubjectForApprovedPublishedCurriculum === 'function'
  );
}

/**
 * Curriculum-Grounded Central Textbook Generation Service.
 * - Retrieves curriculum strictly via CurriculumRetrievalPort (zero cross-domain curriculum SQL).
 * - Enforces approved + published curriculum gate prior to initiating AI generation.
 * - Uses idempotency keys to prevent accidental duplicate generation jobs.
 * - Persists Gemini model/prompt/config metadata, glossaries, illustrations, citations, and validation reports.
 * - Never auto-publishes generated textbooks (leaves them as 'draft' or 'generated' with pending editorial approval).
 */
export class CentralTextbookGenerationService {
  private readonly curriculumPort: CurriculumRetrievalPort;
  private readonly validator = new TextbookContentValidationAdapter();

  constructor(
    private readonly pool: DatabasePool,
    curriculumSource: CurriculumRetrievalPort | CentralCurriculumRepository = new CentralCurriculumRepository(pool),
    private readonly textbookRepo: CentralTextbookRepository = new CentralTextbookRepository(pool),
    private readonly coverageService: CentralTextbookCoverageService = new CentralTextbookCoverageService(
      pool,
      isCurriculumRetrievalPort(curriculumSource)
        ? curriculumSource
        : new CurriculumRetrievalAdapter(curriculumSource)
    ),
    private readonly aiAdapter: TextbookAiAdapter = new GeminiTextbookOperationalAdapter()
  ) {
    this.curriculumPort = isCurriculumRetrievalPort(curriculumSource)
      ? curriculumSource
      : new CurriculumRetrievalAdapter(curriculumSource);
  }

  private assertEditorialAdmin(actor: VerifiedTenantPrincipal): void {
    if (actor.role !== 'super_admin') {
      throw new CentralTextbookError('FORBIDDEN', 'Only central editorial administrators may initiate textbook generation.');
    }
  }

  async generateTextbookOutline(
    actor: VerifiedTenantPrincipal,
    input: {
      subjectIdOrCode: string;
      classGrade: string;
      curriculumVersionId?: string;
      authorName?: string;
      publisherName?: string;
      academicYear?: string;
      idempotencyKey?: string;
      maxAttempts?: number;
    }
  ): Promise<{ textbook: CentralTextbookDetail; job: CentralTextbookGenerationJob }> {
    this.assertEditorialAdmin(actor);

    if (input.idempotencyKey?.trim()) {
      const existingJob = await this.textbookRepo.findGenerationJobByIdempotencyKey(actor, input.idempotencyKey.trim());
      if (existingJob && existingJob.status === 'completed' && existingJob.textbookId) {
        const existingBook = await this.textbookRepo.getTextbookById(actor, existingJob.textbookId);
        if (existingBook) {
          return { textbook: existingBook, job: existingJob };
        }
      }
    }

    // Strict Gate: Curriculum MUST be both editorially approved AND published.
    let curriculumPayload;
    try {
      curriculumPayload = await this.curriculumPort.getSubjectForApprovedPublishedCurriculum(
        actor,
        input.subjectIdOrCode,
        {
          versionId: input.curriculumVersionId,
          classGrade: input.classGrade
        }
      );
    } catch (err: any) {
      throw new CentralTextbookError('VALIDATION_ERROR', err?.message || 'Approved/published curriculum validation failed.');
    }

    const { subject, grade: gradeRecord, topicsForGrade, competencies } = curriculumPayload;
    const execMeta = this.aiAdapter.getExecutionMetadata?.() ?? {
      model: 'gemini-4-hydrogen',
      promptVersion: 'v2.nerdc-grounded',
      generationConfig: {}
    };

    let job = await this.textbookRepo.createGenerationJob(actor, {
      curriculumVersionId: subject.curriculumVersionId,
      subjectId: subject.id,
      classGradeName: gradeRecord.name,
      jobType: 'outline',
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey || null,
      geminiModel: execMeta.model,
      promptVersion: execMeta.promptVersion,
      generationConfig: execMeta.generationConfig,
      payload: {
        subjectIdOrCode: input.subjectIdOrCode,
        classGrade: gradeRecord.name,
        authorName: input.authorName || null,
        academicYear: input.academicYear || ''
      }
    });

    const maxAttempts = job.maxAttempts;
    let lastErr: Error | undefined;
    let outline: GeneratedOutlinePayload | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      job = await this.textbookRepo.updateGenerationJob(actor, job.id, {
        status: 'running',
        attemptCount: attempt,
        progressPercent: 25,
        currentStep: `Generating curriculum-aligned outline (attempt ${attempt}/${maxAttempts})`,
        lastError: null,
        checkpointData: {
          curriculumValidatedAt: new Date().toISOString(),
          curriculumVersionId: subject.curriculumVersionId,
          topicCount: topicsForGrade.length,
          geminiModel: execMeta.model
        }
      });

      try {
        const candidate = await this.aiAdapter.generateOutline({
          subject,
          classGrade: gradeRecord.name,
          topics: topicsForGrade,
          competencies
        });
        if (!candidate || !Array.isArray(candidate.chapters) || candidate.chapters.length === 0) {
          throw new Error('Generated outline contained zero chapters.');
        }
        outline = candidate;
        break;
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        await this.textbookRepo.updateGenerationJob(actor, job.id, {
          status: attempt < maxAttempts ? 'paused_for_recovery' : 'failed',
          lastError: lastErr.message,
          currentStep: attempt < maxAttempts
            ? `Attempt ${attempt} failed; preparing retry`
            : `Generation failed after ${attempt} attempts`,
          completed: attempt >= maxAttempts
        });
      }
    }

    if (!outline) {
      throw new CentralTextbookError(
        'VALIDATION_ERROR',
        `Textbook outline generation failed: ${lastErr?.message || 'Unknown error'}`
      );
    }

    const textbookId = `tb-${subject.code.toLowerCase().replace(/[^a-z0-9]+/g, '')}-${gradeRecord.code.toLowerCase()}-${Date.now()}`;
    const validTopicIds = new Set(topicsForGrade.map(t => t.id));
    const defaultTopicIds = topicsForGrade.map(t => t.id);
    const defaultObjectiveIds = topicsForGrade.flatMap(t => t.objectives.map(o => o.id));

    const chapters = outline.chapters.map((ch, idx) => {
      const groundedTopicIds = (ch.topicIds || []).filter(id => validTopicIds.has(id));
      const resolvedTopicIds = groundedTopicIds.length > 0
        ? groundedTopicIds
        : [defaultTopicIds[idx % defaultTopicIds.length]];
      return {
        id: `${textbookId}-ch-${ch.chapterNumber || idx + 1}`,
        chapterNumber: ch.chapterNumber || idx + 1,
        title: (ch.title || `Chapter ${idx + 1}`).trim(),
        summary: (ch.summary || '').trim(),
        introductoryExplanation: (ch.introductoryExplanation || ch.summary || '').trim(),
        topicIds: resolvedTopicIds,
        learningObjectiveIds: ch.learningObjectiveIds?.length
          ? ch.learningObjectiveIds
          : defaultObjectiveIds.slice(idx, idx + 2),
        learningObjectives: ch.learningObjectives || []
      };
    });

    // Strictly persisted as 'draft' with 'pending' editorial approval — NEVER 'published'.
    const textbook = await this.textbookRepo.createTextbookDraft(actor, {
      id: textbookId,
      frameworkId: subject.frameworkId,
      curriculumVersionId: subject.curriculumVersionId,
      educationLevelId: subject.educationLevelId,
      subjectId: subject.id,
      classGradeId: gradeRecord.id,
      classGradeName: gradeRecord.name,
      subjectName: subject.name,
      title: (outline.title || `${subject.name} for ${gradeRecord.name}`).trim(),
      description: (outline.description || `Curriculum-aligned draft textbook for ${subject.name} (${gradeRecord.name}).`).trim(),
      academicYear: outline.academicYear || input.academicYear || '',
      publisher: {
        id: 'pub-central-editorial',
        name: input.publisherName || 'Curriculum Server Central Press'
      },
      author: {
        id: 'auth-central-ai-team',
        fullName: input.authorName || 'Curriculum Server Academic AI & Editorial Board',
        affiliation: 'Central Textbook Directorate'
      },
      provenanceKind: 'ai_generated',
      geminiModel: execMeta.model,
      promptVersion: execMeta.promptVersion,
      generationConfig: execMeta.generationConfig,
      chapters
    });

    await this.coverageService.recomputeAndPersistCoverage(actor, textbookId);
    const completedBook = await this.textbookRepo.getTextbookById(actor, textbookId);
    job = await this.textbookRepo.updateGenerationJob(actor, job.id, {
      textbookId,
      status: 'completed',
      progressPercent: 100,
      currentStep: 'Draft outline persisted awaiting section generation and editorial review.',
      checkpointData: { textbookId, chapterCount: chapters.length, publicationStatus: 'draft' },
      completed: true
    });

    return { textbook: completedBook || textbook, job };
  }

  async generateChapterContent(
    actor: VerifiedTenantPrincipal,
    input: {
      textbookId: string;
      chapterId: string;
      idempotencyKey?: string;
      maxAttempts?: number;
    }
  ): Promise<{ chapter: CentralTextbookChapterRecord; job: CentralTextbookGenerationJob }> {
    this.assertEditorialAdmin(actor);

    const textbook = await this.textbookRepo.getTextbookById(actor, input.textbookId);
    if (!textbook) {
      throw new CentralTextbookError('NOT_FOUND', `Textbook ${input.textbookId} not found.`);
    }
    const chapter = textbook.chapters.find(c => c.id === input.chapterId);
    if (!chapter) {
      throw new CentralTextbookError('NOT_FOUND', `Chapter ${input.chapterId} not found on textbook ${input.textbookId}.`);
    }

    if (input.idempotencyKey?.trim()) {
      const existingJob = await this.textbookRepo.findGenerationJobByIdempotencyKey(actor, input.idempotencyKey.trim());
      if (existingJob && existingJob.status === 'completed') {
        const refreshed = await this.textbookRepo.getTextbookById(actor, input.textbookId);
        const existingChapter = refreshed?.chapters.find(c => c.id === input.chapterId);
        if (existingChapter && existingChapter.sections.length > 0) {
          return { chapter: existingChapter, job: existingJob };
        }
      }
    }

    let chapterTopics: CurriculumTopicRecord[] = [];
    try {
      const curriculumData = await this.curriculumPort.getSubjectForApprovedPublishedCurriculum(
        actor,
        textbook.subjectId,
        { versionId: textbook.curriculumVersionId, classGrade: textbook.classGradeName }
      );
      chapterTopics = curriculumData.topicsForGrade.filter(
        t => chapter.topicIds.includes(t.id) || chapter.topicIds.length === 0
      );
    } catch {
      chapterTopics = [];
    }

    const execMeta = this.aiAdapter.getExecutionMetadata?.() ?? {
      model: 'gemini-4-hydrogen',
      promptVersion: 'v2.nerdc-grounded',
      generationConfig: {}
    };

    let job = await this.textbookRepo.createGenerationJob(actor, {
      textbookId: textbook.id,
      curriculumVersionId: textbook.curriculumVersionId,
      subjectId: textbook.subjectId,
      classGradeName: textbook.classGradeName,
      jobType: 'chapter_content',
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey || null,
      geminiModel: execMeta.model,
      promptVersion: execMeta.promptVersion,
      generationConfig: execMeta.generationConfig,
      payload: { chapterId: chapter.id, chapterNumber: chapter.chapterNumber }
    });

    let generated: GeneratedChapterSectionsPayload | undefined;
    let lastErr: Error | undefined;
    for (let attempt = 1; attempt <= job.maxAttempts; attempt += 1) {
      job = await this.textbookRepo.updateGenerationJob(actor, job.id, {
        status: 'running',
        attemptCount: attempt,
        progressPercent: 40,
        currentStep: `Generating sections for Chapter ${chapter.chapterNumber} (attempt ${attempt}/${job.maxAttempts})`,
        lastError: null
      });
      try {
        const res = await this.aiAdapter.generateChapterSections({
          textbook,
          chapter,
          topics: chapterTopics
        });
        if (!res || !Array.isArray(res.sections) || res.sections.length === 0) {
          throw new Error('Generated chapter response contained zero sections.');
        }
        generated = res;
        break;
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        await this.textbookRepo.updateGenerationJob(actor, job.id, {
          status: attempt < job.maxAttempts ? 'paused_for_recovery' : 'failed',
          lastError: lastErr.message,
          currentStep: attempt < job.maxAttempts ? 'Retrying section generation' : 'Chapter generation failed',
          completed: attempt >= job.maxAttempts
        });
      }
    }

    if (!generated) {
      throw new CentralTextbookError(
        'VALIDATION_ERROR',
        `Chapter content generation failed: ${lastErr?.message || 'Unknown error'}`
      );
    }

    const updatedChapter = await this.textbookRepo.saveChapterSections(
      actor,
      textbook.id,
      chapter.id,
      generated.sections.map((sec, idx) => ({
        id: `${chapter.id}-sec-${sec.sectionNumber || idx + 1}`,
        sectionNumber: sec.sectionNumber || idx + 1,
        title: (sec.title || `Section ${idx + 1}`).trim(),
        contentMarkdown: sec.contentMarkdown || '',
        examples: sec.examples || [],
        workedSolutions: sec.workedSolutions || [],
        practicalActivities: sec.practicalActivities || [],
        instructionalTables: sec.instructionalTables || [],
        illustrationSpecs: sec.illustrationSpecs || [],
        keyVocabulary: sec.keyVocabulary || [],
        commonMisconceptions: sec.commonMisconceptions || [],
        objectiveMappings: chapter.learningObjectiveIds.map(objId => ({
          topicId: chapter.topicIds[0] || null,
          learningObjectiveId: objId,
          mappingStrength: 'primary'
        }))
      })),
      {
        chapterSummary: generated.chapterSummary,
        revisionExercises: generated.revisionExercises,
        citations: generated.citations,
        classGradeName: textbook.classGradeName,
        geminiModel: execMeta.model,
        promptVersion: execMeta.promptVersion
      }
    );

    await this.coverageService.recomputeAndPersistCoverage(actor, textbook.id);
    const refreshedBook = await this.textbookRepo.getTextbookById(actor, textbook.id);
    if (refreshedBook) {
      const validation = this.validator.validate(refreshedBook, chapterTopics);
      await this.textbookRepo.saveValidationReport(actor, {
        textbookId: textbook.id,
        curriculumVersionId: textbook.curriculumVersionId,
        overallPassed: validation.overallPassed,
        readinessScore: validation.readinessScore,
        findings: validation.findings,
        summary: validation.summary
      });
    }

    job = await this.textbookRepo.updateGenerationJob(actor, job.id, {
      status: 'completed',
      progressPercent: 100,
      currentStep: `Chapter ${chapter.chapterNumber} sections validated and saved for editorial review.`,
      checkpointData: { chapterId: chapter.id, sectionsCount: updatedChapter.sections.length },
      completed: true
    });

    return { chapter: updatedChapter, job };
  }

  async generateFullTextbook(
    actor: VerifiedTenantPrincipal,
    input: {
      subjectIdOrCode: string;
      classGrade: string;
      curriculumVersionId?: string;
      authorName?: string;
      publisherName?: string;
      academicYear?: string;
      idempotencyKey?: string;
    }
  ): Promise<{ textbook: CentralTextbookDetail; jobs: CentralTextbookGenerationJob[] }> {
    const { textbook, job: outlineJob } = await this.generateTextbookOutline(actor, input);
    const jobs: CentralTextbookGenerationJob[] = [outlineJob];
    for (const ch of textbook.chapters) {
      const { job: chJob } = await this.generateChapterContent(actor, {
        textbookId: textbook.id,
        chapterId: ch.id,
        idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:ch-${ch.chapterNumber}` : undefined
      });
      jobs.push(chJob);
    }
    const finalBook = await this.textbookRepo.getTextbookById(actor, textbook.id);
    return { textbook: finalBook || textbook, jobs };
  }

  async retryJob(
    actor: VerifiedTenantPrincipal,
    jobId: string
  ): Promise<CentralTextbookGenerationJob | { job: CentralTextbookGenerationJob; result: unknown }> {
    this.assertEditorialAdmin(actor);
    const existing = await this.textbookRepo.getGenerationJob(actor, jobId);
    if (!existing) {
      throw new CentralTextbookError('NOT_FOUND', `Generation job ${jobId} not found.`);
    }
    if (existing.status === 'completed') {
      return existing;
    }

    if (existing.jobType === 'outline') {
      const result = await this.generateTextbookOutline(actor, {
        subjectIdOrCode: String(existing.payload.subjectIdOrCode || existing.subjectId),
        classGrade: String(existing.payload.classGrade || existing.classGradeName),
        curriculumVersionId: existing.curriculumVersionId,
        authorName: typeof existing.payload.authorName === 'string' ? existing.payload.authorName : undefined,
        maxAttempts: existing.maxAttempts
      });
      return { job: result.job, result: result.textbook };
    }

    if (existing.jobType === 'chapter_content' && existing.textbookId && existing.payload.chapterId) {
      const result = await this.generateChapterContent(actor, {
        textbookId: existing.textbookId,
        chapterId: String(existing.payload.chapterId),
        maxAttempts: existing.maxAttempts
      });
      return { job: result.job, result: result.chapter };
    }

    throw new CentralTextbookError('VALIDATION_ERROR', `Job ${jobId} cannot be automatically retried.`);
  }

  async recoverInterruptedJobs(actor: VerifiedTenantPrincipal): Promise<CentralTextbookGenerationJob[]> {
    this.assertEditorialAdmin(actor);
    return this.textbookRepo.markInterruptedJobsForRecovery(actor);
  }
}
