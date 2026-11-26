import express, { type Request, type Response } from 'express';
import type { CentralAiGatewayService } from '../ai/gatewayService';
import type { AuthenticatedAiCaller } from '../ai/types';
import { createApplicationInstancePermissionGuard, extractApplicationInstanceId } from '../authorization/applicationInstanceScope';
import type { AuthorizedPrincipal } from '../authorization/authorizedPrincipal';
import type { createAuthorizationMiddleware } from '../authorization/middleware';
import { PERMISSIONS } from '../authorization/permissions';
import { TamperEvidentAuditService } from '../../src/services/tamperEvidentAuditService';
import { InstanceQuestionBankError } from './instanceQuestionBankRepository';
import type { InstanceQuestionBankService } from './instanceQuestionBankService';

type AuthorizationMiddleware = ReturnType<typeof createAuthorizationMiddleware>;

export interface QuestionBankRouterDeps {
  getService: () => InstanceQuestionBankService;
  auth: AuthorizationMiddleware;
  rateLimiter: express.RequestHandler;
  centralAiGatewayService?: CentralAiGatewayService;
  buildGatewayCallerFromTenantReq?: (req: Request) => AuthenticatedAiCaller;
  sendAiGatewayError?: (res: Response, err: unknown, correlationId?: string) => void;
}

function actorFromReq(req: Request): AuthorizedPrincipal | undefined {
  return (req as Request & { authorizedPrincipal?: AuthorizedPrincipal }).authorizedPrincipal;
}

function instanceIdFromReq(req: Request): string {
  return (req as Request & { applicationInstanceId?: string }).applicationInstanceId || extractApplicationInstanceId(req);
}

function tenantFromReq(req: Request) {
  return (req as Request & { trustedTenantContext?: any }).trustedTenantContext;
}

function handleInstanceQuestionBankError(req: Request, res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof InstanceQuestionBankError) {
    const status =
      err.code === 'NOT_FOUND' ? 404 :
      err.code === 'FORBIDDEN' ? 403 :
      err.code === 'CONFLICT' ? 409 :
      400;
    res.status(status).json({
      success: false,
      error: err.message,
      code: err.code,
      correlationId: (req as any).correlationId,
      timestamp: new Date().toISOString()
    });
    return;
  }
  res.status(503).json({
    success: false,
    error: err instanceof Error ? err.message : fallbackMessage,
    code: 'INSTANCE_QUESTION_BANK_UNAVAILABLE',
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString()
  });
}

export function createQuestionBankRouter(deps: QuestionBankRouterDeps): express.Router {
  const router = express.Router();
  const requireInstancePermission = (permission: string) =>
    createApplicationInstancePermissionGuard(deps.auth, permission);

  router.use('/question-bank', deps.rateLimiter);
  router.use('/assessment-blueprints', deps.rateLimiter);
  router.use('/assessments/exams', deps.rateLimiter);
  router.use('/assessments/records', deps.rateLimiter);

  router.get(
    '/question-bank/categories',
    requireInstancePermission(PERMISSIONS.questionBankRead),
    async (req: Request, res: Response) => {
      try {
        const categories = await deps.getService().listCategories(tenantFromReq(req), instanceIdFromReq(req));
        res.json({ success: true, total: categories.length, categories });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to list question bank categories');
      }
    }
  );

  router.post(
    '/question-bank/categories',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const { name, description, subjectReferenceId } = req.body ?? {};
        if (!name || typeof name !== 'string') {
          res.status(400).json({ success: false, error: 'Category name is required', code: 'VALIDATION_ERROR' });
          return;
        }
        const category = await deps.getService().createCategory(
          tenantFromReq(req),
          instanceIdFromReq(req),
          { name, description, subjectReferenceId },
          actorFromReq(req)
        );
        res.status(201).json({ success: true, category });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to create question category');
      }
    }
  );

  router.patch(
    '/question-bank/categories/:id',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const { name, description, subjectReferenceId } = req.body ?? {};
        const category = await deps.getService().updateCategory(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.params.id,
          { name, description, subjectReferenceId },
          actorFromReq(req)
        );
        res.json({ success: true, category });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to update question category');
      }
    }
  );

  router.get(
    '/question-bank',
    requireInstancePermission(PERMISSIONS.questionBankRead),
    async (req: Request, res: Response) => {
      try {
        const {
          subjectId,
          subjectReferenceId,
          classGrade,
          questionType,
          reviewStatus,
          difficulty,
          categoryId,
          includeArchived
        } = req.query;
        const questions = await deps.getService().listQuestions(
          tenantFromReq(req),
          instanceIdFromReq(req),
          {
            subjectReferenceId: (subjectReferenceId || subjectId) as string,
            classGradeName: classGrade as string,
            questionType: questionType as string,
            reviewStatus: reviewStatus as string,
            difficulty: difficulty as string,
            categoryId: categoryId as string,
            includeArchived: includeArchived === 'true'
          }
        );
        res.json({ success: true, total: questions.length, questions });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to load instance question bank');
      }
    }
  );

  router.post(
    '/question-bank',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const payload = req.body ?? {};
        const subjectReferenceId = payload.subjectReferenceId || payload.subjectId;
        if (!payload.stem || !subjectReferenceId || typeof payload.correctAnswer !== 'string' || !payload.correctAnswer.trim()) {
          res.status(400).json({
            success: false,
            error: 'Missing required question parameters: stem, subjectReferenceId, correctAnswer',
            code: 'VALIDATION_ERROR'
          });
          return;
        }
        const saved = await deps.getService().createQuestion(
          tenantFromReq(req),
          instanceIdFromReq(req),
          {
            id: payload.id,
            categoryId: payload.categoryId,
            subjectReferenceId,
            classGradeName: payload.classGrade || payload.classGradeName || 'JSS 1',
            curriculumVersionId: payload.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
            topicReferenceId: payload.topicId || payload.topicReferenceId || 'general',
            learningObjectiveIds: payload.learningObjectiveIds || [],
            questionType: payload.questionType || 'objective',
            stem: payload.stem,
            options: payload.options,
            correctAnswer: payload.correctAnswer,
            explanation: payload.explanation || '',
            markingRubric: payload.markingRubric,
            marks: payload.marks ?? 2,
            difficulty: payload.difficulty || 'Medium',
            cognitiveDemand: payload.cognitiveDemand || 'Application',
            sourceType: payload.sourceType || 'teacher_authored',
            sourceReference: payload.sourceReference,
            creationMethod: payload.creationMethod || 'manual',
            reviewStatus: payload.reviewStatus || 'pending_review',
            metadata: payload.metadata
          },
          actorFromReq(req)
        );
        res.status(201).json({ success: true, question: saved });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to save question');
      }
    }
  );

  router.post(
    '/question-bank/items/:id/submit',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const updated = await deps.getService().submitQuestionForReview(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.params.id,
          actorFromReq(req)
        );
        res.json({ success: true, question: updated });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to submit question for review');
      }
    }
  );

  router.post(
    '/question-bank/items/:id/review',
    requireInstancePermission(PERMISSIONS.questionBankReview),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { reviewStatus, reason } = req.body ?? {};
        const tenant = tenantFromReq(req);
        const updated = await deps.getService().reviewQuestion(
          tenant,
          instanceIdFromReq(req),
          id,
          reviewStatus,
          actorFromReq(req),
          typeof reason === 'string' ? reason : undefined
        );
        TamperEvidentAuditService.logPlatformAction({
          actor: tenant.email || tenant.userId || 'school_curator',
          actorRole: tenant.role,
          tenantId: tenant.tenantId,
          action: reviewStatus === 'approved' ? 'question_item_approved' : reviewStatus === 'rejected' ? 'question_item_rejected' : 'question_item_reviewed',
          target: `question:${id}`,
          result: 'SUCCESS',
          outcome: 'SUCCESS',
          resourceType: 'instance_question_item',
          resourceId: id,
          details: `School Question ${id} updated to status '${reviewStatus}'`,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.json({ success: true, question: updated });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to review question item');
      }
    }
  );

  router.post(
    '/question-bank/items/:id/archive',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
        const question = await deps.getService().archiveQuestion(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.params.id,
          reason,
          actorFromReq(req)
        );
        res.json({ success: true, archived: true, question });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to archive question item');
      }
    }
  );

  router.delete(
    '/question-bank/items/:id',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
        const result = await deps.getService().deleteOrArchiveQuestion(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.params.id,
          actorFromReq(req),
          reason
        );
        if (!result.found) {
          res.status(404).json({ success: false, error: 'Question not found', code: 'NOT_FOUND' });
          return;
        }
        res.json({
          success: true,
          deleted: result.deleted,
          archived: result.archived,
          ...(result.question ? { question: result.question } : {})
        });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to delete question item');
      }
    }
  );

  router.post(
    '/question-bank/seed-past-questions',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const list = await deps.getService().seedStarterPastQuestions(
          tenantFromReq(req),
          instanceIdFromReq(req),
          actorFromReq(req)
        );
        res.json({ success: true, total: list.length, questions: list });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to seed instance past questions');
      }
    }
  );

  router.post(
    '/question-bank/seed-theory-questions',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const list = await deps.getService().seedStarterTheoryQuestions(
          tenantFromReq(req),
          instanceIdFromReq(req),
          actorFromReq(req)
        );
        res.json({ success: true, total: list.length, questions: list });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to seed instance theory questions');
      }
    }
  );

  router.post(
    '/question-bank/seed-practical-questions',
    requireInstancePermission(PERMISSIONS.questionBankManage),
    async (req: Request, res: Response) => {
      try {
        const list = await deps.getService().seedStarterPracticalQuestions(
          tenantFromReq(req),
          instanceIdFromReq(req),
          actorFromReq(req)
        );
        res.json({ success: true, total: list.length, questions: list });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to seed instance practical questions');
      }
    }
  );

  const handleGenerate = (questionKind: 'practical' | 'theory' | 'objective') => async (req: Request, res: Response) => {
    if (!deps.centralAiGatewayService || !deps.buildGatewayCallerFromTenantReq || !deps.sendAiGatewayError) {
      res.status(503).json({ success: false, error: 'AI generation service unavailable', code: 'AI_GATEWAY_UNAVAILABLE' });
      return;
    }
    try {
      const { subjectName, subjectId, classGrade, topic, count, questionType } = req.body ?? {};
      if (!subjectName || !classGrade) {
        res.status(400).json({ error: 'Missing required parameters: subjectName, classGrade' });
        return;
      }
      const caller = deps.buildGatewayCallerFromTenantReq(req);
      const effectiveType = questionKind === 'theory' ? (questionType || 'theory') : questionKind;
      const gatewayResult = await deps.centralAiGatewayService.execute<{ questions: any[] }>({
        caller,
        envelope: {
          applicationId: 'SCHOOL_INSTANCE',
          capability: 'SCHOOL_QUESTION_BANK_GENERATION',
          taskType: 'question_bank_items',
          tenantId: caller.tenantId || undefined,
          applicationInstanceId: caller.applicationInstanceId || undefined,
          payload: {
            subjectName,
            classGrade,
            topic: topic || (questionKind === 'practical' ? 'Laboratory Practical' : questionKind === 'objective' ? 'General Core Topics' : 'Core Curriculum'),
            count: count || (questionKind === 'objective' ? 3 : 2),
            questionType: effectiveType
          },
          correlationId: (req as any).correlationId
        }
      });

      const createdItems = [];
      const qbService = deps.getService();
      const tenant = tenantFromReq(req);
      const instanceId = instanceIdFromReq(req);
      const actor = actorFromReq(req);
      for (const item of gatewayResult.data.questions || []) {
        const saved = await qbService.createQuestion(tenant, instanceId, {
          subjectReferenceId: subjectId || subjectName,
          classGradeName: classGrade,
          topicReferenceId: topic || (questionKind === 'practical' ? 'practical-general' : 'general'),
          questionType: effectiveType,
          stem: item.stem,
          ...(questionKind === 'objective' ? { options: item.options } : {}),
          correctAnswer: item.correctAnswer || (questionKind === 'objective' ? 'A' : 'See model answer'),
          explanation: item.explanation || '',
          ...(questionKind !== 'objective' ? { markingRubric: item.markingRubric || [] } : {}),
          marks: questionKind === 'objective' ? 2 : (item.marks || (questionKind === 'practical' ? 10 : 8)),
          difficulty: item.difficulty || 'Medium',
          cognitiveDemand: item.cognitiveDemand || (questionKind === 'practical' ? 'Analysis' : 'Application'),
          sourceType: 'ai_practice',
          sourceReference: 'Central AI Gateway Question Bank Generator',
          creationMethod: 'ai_assisted',
          reviewStatus: 'pending_review'
        }, actor);
        createdItems.push(saved);
      }
      res.json({
        success: true,
        count: createdItems.length,
        questions: createdItems,
        reviewRequired: true,
        gatewayRequestId: gatewayResult.requestId,
        routing: gatewayResult.routing,
        usage: gatewayResult.usage
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AiGatewayError') {
        deps.sendAiGatewayError(res, err, (req as any).correlationId);
        return;
      }
      handleInstanceQuestionBankError(req, res, err, `Failed to generate ${questionKind} questions`);
    }
  };

  router.post('/question-bank/generate-practical', requireInstancePermission(PERMISSIONS.questionBankManage), handleGenerate('practical'));
  router.post('/question-bank/generate-theory', requireInstancePermission(PERMISSIONS.questionBankManage), handleGenerate('theory'));
  router.post('/question-bank/generate-objective', requireInstancePermission(PERMISSIONS.questionBankManage), handleGenerate('objective'));

  router.get(
    '/assessment-blueprints',
    requireInstancePermission(PERMISSIONS.assessmentsRead),
    async (req: Request, res: Response) => {
      try {
        const blueprints = await deps.getService().listBlueprints(tenantFromReq(req), instanceIdFromReq(req));
        res.json({ success: true, blueprints });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to load assessment blueprints');
      }
    }
  );

  router.post(
    '/assessment-blueprints',
    requireInstancePermission(PERMISSIONS.assessmentsManage),
    async (req: Request, res: Response) => {
      try {
        const payload = req.body ?? {};
        const blueprint = await deps.getService().createBlueprint(
          tenantFromReq(req),
          instanceIdFromReq(req),
          {
            title: payload.title,
            subjectReferenceId: payload.subjectReferenceId || payload.subjectId,
            classGradeName: payload.classGradeName || payload.classGrade,
            term: payload.term || 'Term 1',
            curriculumVersionId: payload.curriculumVersionId || 'NERDC-9YEAR-BASIC-2024',
            assessmentType: payload.assessmentType || 'exam',
            questionFormatsCount: payload.questionFormatsCount || {},
            totalMarks: Number(payload.totalMarks || 100),
            difficultyMix: payload.difficultyMix || {},
            timeAllowanceMinutes: payload.timeAllowanceMinutes,
            allowVerifiedPastQuestions: payload.allowVerifiedPastQuestions,
            allowAiPracticeQuestions: payload.allowAiPracticeQuestions,
            completedTopicsOnly: payload.completedTopicsOnly,
            selectedTopicIds: payload.selectedTopicIds,
            scopeAuthorizationId: payload.scopeAuthorizationId,
            selectedObjectiveIds: payload.selectedObjectiveIds,
            sourceDeliveryIds: payload.sourceDeliveryIds,
            authorizedTeacherUserId: payload.authorizedTeacherUserId,
            academicSession: payload.academicSession,
            section: payload.section
          },
          actorFromReq(req)
        );
        res.status(201).json({ success: true, blueprint });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to create assessment blueprint');
      }
    }
  );

  router.get(
    '/assessments/exams',
    requireInstancePermission(PERMISSIONS.assessmentsRead),
    async (req: Request, res: Response) => {
      try {
        const exams = await deps.getService().listExamConfigurations(tenantFromReq(req), instanceIdFromReq(req));
        res.json({ success: true, exams });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to list exam configurations');
      }
    }
  );

  router.post(
    '/assessments/exams',
    requireInstancePermission(PERMISSIONS.assessmentsManage),
    async (req: Request, res: Response) => {
      try {
        const exam = await deps.getService().createExamConfiguration(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.body ?? {},
          actorFromReq(req)
        );
        res.status(201).json({ success: true, exam });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to create exam configuration');
      }
    }
  );

  router.get(
    '/assessments/records',
    requireInstancePermission(PERMISSIONS.assessmentsRead),
    async (req: Request, res: Response) => {
      try {
        const records = await deps.getService().listAssessmentRecords(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.query.examConfigurationId as string | undefined
        );
        res.json({ success: true, records });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to list assessment records');
      }
    }
  );

  router.post(
    '/assessments/records',
    requireInstancePermission(PERMISSIONS.assessmentsManage),
    async (req: Request, res: Response) => {
      try {
        const record = await deps.getService().recordAssessmentSubmission(
          tenantFromReq(req),
          instanceIdFromReq(req),
          req.body ?? {},
          actorFromReq(req)
        );
        res.status(201).json({ success: true, record });
      } catch (err) {
        handleInstanceQuestionBankError(req, res, err, 'Failed to persist assessment record');
      }
    }
  );

  return router;
}
