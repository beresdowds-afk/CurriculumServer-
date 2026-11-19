import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserProfile,
  AssignedLessonDelivery,
  DeliveryStatus,
  TeacherFeedback,
  StudentUnderstanding
} from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';
import {
  teachingEvidenceApiClient,
  type TeacherSubjectAssignmentDto,
  type TeachingDeliveryRecordDto,
  type TeachingDeliveryAuditEntryDto,
  type SubjectProgressSummaryDto,
  type ResolvedCurriculumTopicDto,
  type CoverageMode,
  type UnderstandingLevel,
  type StudentEngagementLevel
} from '../services/teachingEvidenceApiClient';
import {
  CalendarCheck2,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  History,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Edit3,
  Lock
} from 'lucide-react';

interface TeacherDeliveryTrackerTabProps {
  currentUser?: UserProfile;
  deliveries?: AssignedLessonDelivery[];
  onUpdateDeliveryStatus?: (deliveryId: string, status: DeliveryStatus) => void;
  onSubmitFeedback?: (deliveryId: string, feedback: TeacherFeedback) => void;
  onTriggerRemedial?: (delivery: AssignedLessonDelivery) => void;
}

export const TeacherDeliveryTrackerTab: React.FC<TeacherDeliveryTrackerTabProps> = ({
  currentUser,
  onTriggerRemedial
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');
  const sessionClaims = unifiedApiClient.getSchoolFlowSession();
  const activeRole = (sessionClaims?.role || currentUser?.role || '').toLowerCase();
  const isOversightRole =
    activeRole === 'principal' ||
    activeRole === 'school_admin' ||
    activeRole === 'admin' ||
    activeRole === 'super_admin';

  // Persistent PostgreSQL-backed state
  const [assignments, setAssignments] = useState<TeacherSubjectAssignmentDto[]>([]);
  const [deliveries, setDeliveries] = useState<TeachingDeliveryRecordDto[]>([]);
  const [progressList, setProgressList] = useState<SubjectProgressSummaryDto[]>([]);
  const [topicCatalogByAssignment, setTopicCatalogByAssignment] = useState<
    Record<string, ResolvedCurriculumTopicDto[]>
  >({});
  const [auditHistory, setAuditHistory] = useState<TeachingDeliveryAuditEntryDto[]>([]);

  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [activeDeliveryId, setActiveDeliveryId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Create delivery drawer
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createAssignmentId, setCreateAssignmentId] = useState<string>('');
  const [createTopicId, setCreateTopicId] = useState<string>('');
  const [createTopicTitle, setCreateTopicTitle] = useState<string>('');
  const [createWeekNumber, setCreateWeekNumber] = useState<number>(1);
  const [createScheduledDate, setCreateScheduledDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Confirm teaching & completion feedback drawer
  const [isCompletionDrawerOpen, setIsCompletionDrawerOpen] = useState<boolean>(false);
  const [confirmTargetStatus, setConfirmTargetStatus] = useState<'taught' | 'completed'>('completed');
  const [confirmTaughtChecked, setConfirmTaughtChecked] = useState<boolean>(true);
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('full');
  const [coveredObjectiveIds, setCoveredObjectiveIds] = useState<string[]>([]);
  const [understanding, setUnderstanding] = useState<UnderstandingLevel>('good');
  const [engagement, setEngagement] = useState<StudentEngagementLevel>('high');
  const [comment, setComment] = useState<string>('');
  const [requestRemedial, setRequestRemedial] = useState<boolean>(false);
  const [remedialTopic, setRemedialTopic] = useState<string>('');

  // Versioned correction drawer
  const [isCorrectOpen, setIsCorrectOpen] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Unresolved manual mapping state
  const [mapTopicId, setMapTopicId] = useState<string>('');
  const [mapReason, setMapReason] = useState<string>('Aligned to authoritative NERDC topic');

  // Audit history visibility
  const [showAuditHistory, setShowAuditHistory] = useState<boolean>(false);

  const loadWorkspaceData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const [assignmentRows, deliveryRows, progressRows] = await Promise.all([
        teachingEvidenceApiClient.listAssignments(),
        teachingEvidenceApiClient.listDeliveries(),
        teachingEvidenceApiClient.getSubjectProgress()
      ]);
      setAssignments(assignmentRows);
      setDeliveries(deliveryRows);
      setProgressList(progressRows);

      if (assignmentRows.length > 0 && !createAssignmentId) {
        setCreateAssignmentId(assignmentRows[0].id);
      }
      if (deliveryRows.length > 0 && (!activeDeliveryId || !deliveryRows.some((d) => d.id === activeDeliveryId))) {
        setActiveDeliveryId(deliveryRows[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to load teaching delivery evidence.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeDeliveryId, createAssignmentId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const activeDelivery = useMemo(
    () => deliveries.find((d) => d.id === activeDeliveryId) || null,
    [deliveries, activeDeliveryId]
  );

  // Load version-pinned NERDC topics for active delivery assignment or create assignment
  const ensureTopicsLoaded = useCallback(
    async (assignmentId: string) => {
      if (!assignmentId || topicCatalogByAssignment[assignmentId]) return;
      try {
        const topics = await teachingEvidenceApiClient.listCurriculumTopicsForAssignment(assignmentId);
        setTopicCatalogByAssignment((prev) => ({ ...prev, [assignmentId]: topics }));
      } catch {
        // Ignore non-fatal topic catalog lookup failure
      }
    },
    [topicCatalogByAssignment]
  );

  useEffect(() => {
    if (activeDelivery?.assignmentId) {
      ensureTopicsLoaded(activeDelivery.assignmentId);
    }
  }, [activeDelivery?.assignmentId, ensureTopicsLoaded]);

  useEffect(() => {
    if (isCreateOpen && createAssignmentId) {
      ensureTopicsLoaded(createAssignmentId);
    }
  }, [isCreateOpen, createAssignmentId, ensureTopicsLoaded]);

  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === activeDelivery?.assignmentId) || null,
    [assignments, activeDelivery]
  );

  const activeTopicCatalog = activeDelivery
    ? topicCatalogByAssignment[activeDelivery.assignmentId] || []
    : [];

  const activeResolvedTopic = useMemo(() => {
    if (!activeDelivery?.topicId) return null;
    return activeTopicCatalog.find((t) => t.topicId === activeDelivery.topicId) || null;
  }, [activeDelivery, activeTopicCatalog]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((del) => {
      if (selectedAssignmentFilter !== 'all' && del.assignmentId !== selectedAssignmentFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && del.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [deliveries, selectedAssignmentFilter, selectedStatusFilter]);

  // Seed objective checklist when opening completion or correction drawer
  useEffect(() => {
    if (!activeDelivery) return;
    if (activeDelivery.coveredObjectiveIds.length > 0) {
      setCoveredObjectiveIds(activeDelivery.coveredObjectiveIds);
    } else if (activeResolvedTopic) {
      setCoveredObjectiveIds(activeResolvedTopic.objectives.map((o) => o.id));
    } else {
      setCoveredObjectiveIds([]);
    }
    if (activeDelivery.understandingLevel) {
      setUnderstanding(activeDelivery.understandingLevel);
    }
    if (activeDelivery.studentEngagement) {
      setEngagement(activeDelivery.studentEngagement);
    }
    setRequestRemedial(Boolean(activeDelivery.remedialNeeded));
    setRemedialTopic(activeDelivery.remedialTopic || '');
    if (activeDelivery.coverageMode === 'full' || activeDelivery.coverageMode === 'partial') {
      setCoverageMode(activeDelivery.coverageMode);
    } else {
      setCoverageMode('full');
    }
  }, [activeDelivery?.id, activeResolvedTopic]);

  const loadAuditHistory = async (deliveryId: string) => {
    try {
      const entries = await teachingEvidenceApiClient.getDeliveryAuditHistory(deliveryId);
      setAuditHistory(entries);
      setShowAuditHistory(true);
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to load audit history.');
    }
  };

  const getStageBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed & Confirmed',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-800'
        };
      case 'taught':
        return {
          label: 'Taught (Feedback Pending)',
          color: 'bg-blue-950 text-blue-300 border-blue-800'
        };
      case 'acknowledged':
        return {
          label: 'Acknowledged by Teacher',
          color: 'bg-indigo-950 text-indigo-300 border-indigo-800'
        };
      case 'opened':
        return {
          label: 'Opened & Viewed',
          color: 'bg-teal-950 text-teal-300 border-teal-800'
        };
      case 'received':
        return {
          label: 'Received in Inbox',
          color: 'bg-amber-950 text-amber-300 border-amber-800'
        };
      default:
        return {
          label: 'Assigned (Unopened)',
          color: 'bg-slate-800 text-slate-400 border-slate-700'
        };
    }
  };

  const handleStageTransition = async (
    deliveryId: string,
    targetStatus: 'received' | 'opened' | 'acknowledged'
  ) => {
    setIsMutating(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      const updated = await teachingEvidenceApiClient.transitionDeliveryStage(
        deliveryId,
        targetStatus
      );
      setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setStatusNotice(`Delivery transitioned to '${updated.status}'.`);
      if (showAuditHistory) await loadAuditHistory(deliveryId);
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to update delivery stage.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAssignmentId || (!createTopicId && !createTopicTitle.trim())) {
      setErrorMsg('Select an assignment and a NERDC topic or enter a topic title.');
      return;
    }

    setIsMutating(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      const created = await teachingEvidenceApiClient.createDeliveryRecord({
        assignmentId: createAssignmentId,
        topicId: createTopicId || null,
        topicTitle: createTopicTitle.trim() || 'Selected Curriculum Topic',
        weekNumber: createWeekNumber,
        scheduledDate: createScheduledDate
      });
      setIsCreateOpen(false);
      setCreateTopicTitle('');
      setActiveDeliveryId(created.id);
      await loadWorkspaceData();
      setStatusNotice(
        created.resolutionStatus === 'unresolved'
          ? 'Delivery created as UNRESOLVED. Map it to an official NERDC topic before it counts toward progress or assessments.'
          : 'Teaching delivery record created and resolved against exact curriculum version.'
      );
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to create delivery record.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    setIsMutating(true);
    setErrorMsg(null);
    setStatusNotice(null);

    const allObjIds = activeResolvedTopic ? activeResolvedTopic.objectives.map((o) => o.id) : [];
    const uncoveredIds = allObjIds.filter((id) => !coveredObjectiveIds.includes(id));

    try {
      const idempotencyKey = `complete-${activeDelivery.id}-${confirmTargetStatus}-v${activeDelivery.recordVersion}-${Date.now()}`;
      const res = await teachingEvidenceApiClient.confirmTeachingCompletion(activeDelivery.id, {
        targetStatus: confirmTargetStatus,
        confirmTaught: confirmTaughtChecked,
        coverageMode: coverageMode === 'none' ? 'full' : coverageMode,
        coveredObjectiveIds,
        uncoveredObjectiveIds: uncoveredIds,
        understandingLevel: understanding,
        studentEngagement: engagement,
        remedialNeeded: requestRemedial || understanding === 'poor' || understanding === 'fair',
        remedialTopic: remedialTopic.trim() || null,
        teacherComments: comment.trim() || 'Lesson delivered according to approved NERDC standard.',
        idempotencyKey
      });
      setIsCompletionDrawerOpen(false);
      setComment('');
      await loadWorkspaceData();
      setStatusNotice(
        res.idempotentReplay
          ? 'Duplicate confirmation detected — returned existing persisted record.'
          : `Teaching evidence confirmed (stage: ${res.delivery.status}, basis: ${res.delivery.verificationBasis}).`
      );
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to confirm teaching completion.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleCorrectRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;
    if (!correctionReason.trim()) {
      setErrorMsg('A clear correction reason is mandatory.');
      return;
    }

    setIsMutating(true);
    setErrorMsg(null);
    setStatusNotice(null);

    const allObjIds = activeResolvedTopic ? activeResolvedTopic.objectives.map((o) => o.id) : [];
    const uncoveredIds = allObjIds.filter((id) => !coveredObjectiveIds.includes(id));

    try {
      const updated = await teachingEvidenceApiClient.correctDeliveryRecord(activeDelivery.id, {
        correctionReason: correctionReason.trim(),
        coverageMode,
        coveredObjectiveIds,
        uncoveredObjectiveIds: uncoveredIds,
        understandingLevel: understanding,
        studentEngagement: engagement,
        remedialNeeded: requestRemedial,
        remedialTopic: remedialTopic.trim() || null,
        teacherComments: comment.trim() || activeDelivery.teacherComments
      });
      setIsCorrectOpen(false);
      setCorrectionReason('');
      await loadWorkspaceData();
      await loadAuditHistory(updated.id);
      setStatusNotice(`Record corrected cleanly (now v${updated.recordVersion}) with audit entry preserved.`);
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to correct teaching delivery record.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleMapUnresolved = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery || !mapTopicId) return;

    setIsMutating(true);
    setErrorMsg(null);
    setStatusNotice(null);

    const chosen = activeTopicCatalog.find((t) => t.topicId === mapTopicId);
    try {
      const updated = await teachingEvidenceApiClient.mapUnresolvedTopic(activeDelivery.id, {
        topicId: mapTopicId,
        coveredObjectiveIds: chosen ? chosen.objectives.map((o) => o.id) : undefined,
        reason: mapReason.trim() || 'Manually mapped to official NERDC curriculum topic'
      });
      await loadWorkspaceData();
      setStatusNotice(
        `Topic manually mapped to '${updated.resolvedTopicTitle}' (${updated.resolutionStatus}).`
      );
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Failed to map topic to NERDC curriculum.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleAdminVerify = async (status: 'verified' | 'flagged') => {
    if (!activeDelivery) return;
    setIsMutating(true);
    setErrorMsg(null);
    try {
      await teachingEvidenceApiClient.adminVerifyDelivery(activeDelivery.id, {
        adminVerificationStatus: status,
        reason:
          status === 'verified'
            ? 'Verified by school academic authority'
            : 'Flagged by school academic authority for review'
      });
      await loadWorkspaceData();
      setStatusNotice(`Delivery marked adminVerificationStatus='${status}'.`);
    } catch (err: any) {
      setErrorMsg(err?.error || err?.message || 'Admin verification failed.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleTriggerRemedialUi = () => {
    if (!activeDelivery || !onTriggerRemedial) return;
    onTriggerRemedial({
      id: activeDelivery.id,
      lessonNoteId: activeDelivery.lessonNoteId || '',
      subjectName: activeAssignment?.subjectName || activeDelivery.subjectId,
      classGrade: activeDelivery.classGradeName as any,
      classSection: activeDelivery.section,
      teacherId: activeDelivery.completionTeacherUserId || activeAssignment?.teacherUserId || '',
      teacherName: currentUser?.name || 'Assigned Teacher',
      dayOfWeek: 'Monday',
      period: 1,
      scheduledTime: activeDelivery.scheduledDate,
      topicTitle: activeDelivery.resolvedTopicTitle || activeDelivery.topicTitleInput,
      subTopic: activeDelivery.remedialTopic || '',
      week: activeDelivery.weekNumber,
      status: activeDelivery.status,
      assignedAt: activeDelivery.createdAt,
      feedback: {
        understandingLevel: (activeDelivery.understandingLevel || 'fair') as StudentUnderstanding,
        engagementRating: activeDelivery.studentEngagement === 'high' ? 5 : 3,
        comments: activeDelivery.teacherComments,
        uncoveredObjectives: activeDelivery.uncoveredObjectiveIds,
        suggestedRemedialTopic: activeDelivery.remedialTopic || undefined,
        requestAdditionalLesson: activeDelivery.remedialNeeded,
        requestCurriculumModification: false,
        submittedAt: activeDelivery.completedAt || activeDelivery.updatedAt
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              <CalendarCheck2 className="w-4 h-4" />
              <span>Authoritative Digital Teaching Evidence & Delivery Pipeline</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              End-to-End Lesson Execution & Verification Loop
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Real PostgreSQL-backed lifecycle: <strong className="text-slate-200">Assigned → Received → Opened → Acknowledged → Taught → Completed</strong>. Only teacher-confirmed, NERDC-resolved records feed progress & taught assessments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(!isCreateOpen)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log / Assign Teaching Period</span>
                </button>
                <button
                  type="button"
                  onClick={loadWorkspaceData}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Assignment & Stage Filters */}
        {isAuthenticated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 mt-6 border-t border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Filter by Teaching Assignment</label>
              <select
                value={selectedAssignmentFilter}
                onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="all">All Visible Assignments ({assignments.length})</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.subjectName} — {a.classGradeName} {a.section} ({a.term})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Filter by Delivery Stage</label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="all">All 6 Stages</option>
                <option value="assigned">1. Assigned</option>
                <option value="received">2. Received</option>
                <option value="opened">3. Opened</option>
                <option value="acknowledged">4. Acknowledged</option>
                <option value="taught">5. Taught</option>
                <option value="completed">6. Completed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="bg-slate-900/90 border border-amber-800/60 rounded-3xl p-8 text-center space-y-3">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Authenticated School Session Required</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Sign in with your school teacher or academic administrator credentials to view assignments, confirm taught lessons, resolve curriculum topics, and inspect audit trails.
          </p>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusNotice && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs">
              {statusNotice}
            </div>
          )}

          {/* Authoritative Subject Progress Summary Strip */}
          {progressList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressList.map((summary) => (
                <div
                  key={summary.assignmentId}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white truncate">
                      {summary.subjectName} • {summary.classGradeName} {summary.section}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {summary.coveragePercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, summary.coveragePercentage)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>
                      Verified: {summary.verifiedTaughtTopicsCount}/{summary.topicsInCurriculum || summary.totalDeliveries}
                    </span>
                    <span>Unresolved: {summary.unresolvedTopicsCount}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                      {summary.verificationBasis}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Delivery Form Drawer */}
          {isCreateOpen && (
            <form
              onSubmit={handleCreateDelivery}
              className="bg-slate-900 border border-blue-800/60 rounded-3xl p-6 space-y-4 text-xs"
            >
              <h3 className="text-sm font-bold text-white">Create Teaching Delivery Record</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Assignment</label>
                  <select
                    value={createAssignmentId}
                    onChange={(e) => {
                      setCreateAssignmentId(e.target.value);
                      setCreateTopicId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                    required
                  >
                    <option value="">Select assignment...</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.subjectName} — {a.classGradeName} {a.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Official NERDC Topic (Optional)</label>
                  <select
                    value={createTopicId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateTopicId(val);
                      const found = (topicCatalogByAssignment[createAssignmentId] || []).find(
                        (t) => t.topicId === val
                      );
                      if (found) setCreateTopicTitle(found.topicTitle);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                  >
                    <option value="">Free-text / Custom Topic Title</option>
                    {(topicCatalogByAssignment[createAssignmentId] || []).map((t) => (
                      <option key={t.topicId} value={t.topicId}>
                        Wk {t.week}: {t.topicTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Topic Title</label>
                  <input
                    type="text"
                    value={createTopicTitle}
                    onChange={(e) => setCreateTopicTitle(e.target.value)}
                    placeholder="Exact NERDC topic or free-text"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                    required={!createTopicId}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Week</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={createWeekNumber}
                      onChange={(e) => setCreateWeekNumber(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={createScheduledDate}
                      onChange={(e) => setCreateScheduledDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Teaching Delivery
                </button>
              </div>
            </form>
          )}

          {/* Main Two-Column View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Delivery Records List */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-3 max-h-[850px] overflow-y-auto custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block">
                Teaching Delivery Records ({filteredDeliveries.length})
              </span>

              {filteredDeliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                  No persisted delivery records match the current filters.
                </div>
              ) : (
                filteredDeliveries.map((del) => {
                  const isSelected = activeDelivery?.id === del.id;
                  const stageBadge = getStageBadge(del.status);
                  const assign = assignments.find((a) => a.id === del.assignmentId);
                  return (
                    <button
                      type="button"
                      key={del.id}
                      onClick={() => {
                        setActiveDeliveryId(del.id);
                        setIsCompletionDrawerOpen(false);
                        setIsCorrectOpen(false);
                        setShowAuditHistory(false);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                        isSelected
                          ? 'bg-slate-800 border-blue-500/50 shadow-md shadow-blue-950/20'
                          : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {del.classGradeName} {del.section}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Wk {del.weekNumber}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${stageBadge.color}`}>
                          {stageBadge.label}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-200">
                          {assign?.subjectName || del.subjectId}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {del.resolvedTopicTitle || del.topicTitleInput}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span>{del.scheduledDate} • {del.term}</span>
                        <span className="font-mono">
                          v{del.recordVersion} • {del.resolutionStatus}
                        </span>
                      </div>

                      {del.resolutionStatus === 'unresolved' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/40">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Unresolved Curriculum Mapping (Excluded from Assessments)</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Column: Active Delivery Execution, Correction & Audit Panel */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              {!activeDelivery ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  Select or create a teaching delivery record to manage its 6-stage lifecycle.
                </div>
              ) : (
                <>
                  {/* Delivery Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono text-xs font-bold">
                          {activeDelivery.classGradeName} {activeDelivery.section} • Wk {activeDelivery.weekNumber}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getStageBadge(activeDelivery.status).color}`}>
                          {getStageBadge(activeDelivery.status).label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {activeDelivery.verificationBasis}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-white">
                        {activeDelivery.resolvedTopicTitle || activeDelivery.topicTitleInput}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {activeAssignment?.subjectName || activeDelivery.subjectId} • Version: {activeDelivery.curriculumVersionId} • Record v{activeDelivery.recordVersion}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadAuditHistory(activeDelivery.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Trail</span>
                      </button>
                    </div>
                  </div>

                  {/* Unresolved Topic Warning & Manual Mapping UI */}
                  {activeDelivery.resolutionStatus === 'unresolved' && (
                    <form
                      onSubmit={handleMapUnresolved}
                      className="p-4 rounded-2xl bg-amber-950/30 border border-amber-700/60 space-y-3 text-xs"
                    >
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Unresolved Curriculum Mapping</span>
                      </div>
                      <p className="text-amber-100/80 text-[11px]">
                        "{activeDelivery.topicTitleInput}" did not match an authoritative topic in curriculum version <code className="font-mono">{activeDelivery.curriculumVersionId}</code>. Unresolved deliveries are excluded from verified coverage and taught assessments until mapped.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={mapTopicId}
                          onChange={(e) => setMapTopicId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                          required
                        >
                          <option value="">Select official NERDC topic...</option>
                          {activeTopicCatalog.map((t) => (
                            <option key={t.topicId} value={t.topicId}>
                              Wk {t.week}: {t.topicTitle}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={mapReason}
                          onChange={(e) => setMapReason(e.target.value)}
                          placeholder="Reason for manual mapping"
                          className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-200"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isMutating || !mapTopicId}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Map to Official NERDC Topic</span>
                      </button>
                    </form>
                  )}

                  {/* 6-Stage Delivery Progress Bar */}
                  <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      6-Stage Digital Teaching Lifecycle
                    </span>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                      {[
                        { stage: 'assigned', label: '1. Assigned' },
                        { stage: 'received', label: '2. Received' },
                        { stage: 'opened', label: '3. Opened' },
                        { stage: 'acknowledged', label: '4. Acknowledged' },
                        { stage: 'taught', label: '5. Taught' },
                        { stage: 'completed', label: '6. Completed' }
                      ].map((st) => {
                        const stagesOrder: DeliveryStatus[] = [
                          'assigned',
                          'received',
                          'opened',
                          'acknowledged',
                          'taught',
                          'completed'
                        ];
                        const currentIndex = stagesOrder.indexOf(activeDelivery.status);
                        const isDone = stagesOrder.indexOf(st.stage as DeliveryStatus) <= currentIndex;
                        const isCurrent = activeDelivery.status === st.stage;

                        return (
                          <div
                            key={st.stage}
                            className={`p-2 rounded-xl border text-[11px] font-semibold transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                                : isDone
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            <span className="block">{st.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lifecycle Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {activeDelivery.status === 'assigned' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => handleStageTransition(activeDelivery.id, 'received')}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          Mark Received
                        </button>
                      )}

                      {activeDelivery.status === 'received' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => handleStageTransition(activeDelivery.id, 'opened')}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold"
                        >
                          Open & Review
                        </button>
                      )}

                      {activeDelivery.status === 'opened' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => handleStageTransition(activeDelivery.id, 'acknowledged')}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                        >
                          Acknowledge Readiness to Teach
                        </button>
                      )}

                      {activeDelivery.status === 'acknowledged' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => {
                            setConfirmTargetStatus('taught');
                            setIsCompletionDrawerOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                        >
                          Confirm Taught in Class
                        </button>
                      )}

                      {activeDelivery.status === 'taught' && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => {
                            setConfirmTargetStatus('completed');
                            setIsCompletionDrawerOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                        >
                          Submit Post-Lesson Feedback & Complete
                        </button>
                      )}

                      {(activeDelivery.status === 'taught' || activeDelivery.status === 'completed') && (
                        <button
                          type="button"
                          onClick={() => setIsCorrectOpen(!isCorrectOpen)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Amend / Correct Evidence</span>
                        </button>
                      )}

                      {isOversightRole &&
                        (activeDelivery.status === 'taught' || activeDelivery.status === 'completed') && (
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => handleAdminVerify('verified')}
                            className="px-3.5 py-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Admin Verify</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Confirm Teaching / Feedback Drawer */}
                  {isCompletionDrawerOpen && (
                    <form
                      onSubmit={handleConfirmCompletion}
                      className="bg-slate-850 p-6 rounded-2xl border border-blue-800/60 space-y-4 text-xs animate-fadeIn"
                    >
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>
                          {confirmTargetStatus === 'taught'
                            ? 'Teacher Teaching Confirmation'
                            : 'Complete Delivery & Submit Post-Lesson Feedback'}
                        </span>
                      </h3>

                      <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmTaughtChecked}
                          onChange={(e) => setConfirmTaughtChecked(e.target.checked)}
                          required
                        />
                        <span>I confirm this topic was physically taught by me to this class.</span>
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setCoverageMode('full')}
                          className={`p-2 rounded-xl border font-bold ${
                            coverageMode === 'full'
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          Full Coverage
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverageMode('partial')}
                          className={`p-2 rounded-xl border font-bold ${
                            coverageMode === 'partial'
                              ? 'bg-amber-600 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          Partial Coverage
                        </button>
                        <select
                          value={engagement}
                          onChange={(e) => setEngagement(e.target.value as StudentEngagementLevel)}
                          className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200"
                        >
                          <option value="high">High Engagement</option>
                          <option value="medium">Medium Engagement</option>
                          <option value="low">Low Engagement</option>
                        </select>
                      </div>

                      {activeResolvedTopic && activeResolvedTopic.objectives.length > 0 && (
                        <div className="space-y-1.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="font-semibold text-slate-300 block">
                            Covered NERDC Learning Objectives ({coveredObjectiveIds.length}/{activeResolvedTopic.objectives.length})
                          </span>
                          {activeResolvedTopic.objectives.map((obj) => (
                            <label key={obj.id} className="flex items-start gap-2 text-[11px] text-slate-300">
                              <input
                                type="checkbox"
                                checked={coveredObjectiveIds.includes(obj.id)}
                                onChange={() =>
                                  setCoveredObjectiveIds((prev) =>
                                    prev.includes(obj.id)
                                      ? prev.filter((id) => id !== obj.id)
                                      : [...prev, obj.id]
                                  )
                                }
                              />
                              <span>{obj.description}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['excellent', 'good', 'fair', 'poor'] as UnderstandingLevel[]).map((lvl) => (
                          <button
                            type="button"
                            key={lvl}
                            onClick={() => {
                              setUnderstanding(lvl);
                              if (lvl === 'fair' || lvl === 'poor') setRequestRemedial(true);
                            }}
                            className={`p-2.5 rounded-xl border capitalize font-bold ${
                              understanding === lvl
                                ? 'bg-blue-600 text-white border-blue-400'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Classroom remarks, learner misconceptions, or covered examples..."
                        className="w-full bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-700 text-xs"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="remedialCheckLive"
                          checked={requestRemedial}
                          onChange={(e) => setRequestRemedial(e.target.checked)}
                        />
                        <label htmlFor="remedialCheckLive" className="text-slate-300">
                          Request Remedial Follow-up Session
                        </label>
                      </div>

                      {requestRemedial && (
                        <input
                          type="text"
                          value={remedialTopic}
                          onChange={(e) => setRemedialTopic(e.target.value)}
                          placeholder="Specific remedial focus area..."
                          className="w-full bg-slate-900 text-slate-200 p-2 rounded-xl border border-slate-700"
                        />
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCompletionDrawerOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isMutating || !confirmTaughtChecked}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          Confirm & Save Evidence
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Versioned Evidence Correction Form */}
                  {isCorrectOpen && (
                    <form
                      onSubmit={handleCorrectRecord}
                      className="bg-slate-850 p-6 rounded-2xl border border-amber-700/60 space-y-4 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-amber-300 text-sm">
                          Amend Teaching Delivery Evidence (v{activeDelivery.recordVersion} → v{activeDelivery.recordVersion + 1})
                        </h3>
                        {activeDelivery.usedInAssessmentCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Used in {activeDelivery.usedInAssessmentCount} assessment(s)
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">
                          Mandatory Correction Reason:
                        </label>
                        <input
                          type="text"
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                          placeholder="e.g. Objective 2 was postponed to next week due to practical lab schedule"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={coverageMode}
                          onChange={(e) => setCoverageMode(e.target.value as CoverageMode)}
                          className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200"
                        >
                          <option value="full">Full Coverage</option>
                          <option value="partial">Partial Coverage</option>
                        </select>
                        <select
                          value={understanding}
                          onChange={(e) => setUnderstanding(e.target.value as UnderstandingLevel)}
                          className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200"
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Updated observation comments..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                      />

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCorrectOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isMutating}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                        >
                          Save Versioned Correction
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Persisted Feedback Summary */}
                  {(activeDelivery.status === 'taught' || activeDelivery.status === 'completed') && (
                    <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span>Verified Classroom Delivery Summary</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Coverage: {activeDelivery.coverageMode} • Objectives: {activeDelivery.coveredObjectiveIds.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Understanding</span>
                          <span className="font-bold capitalize text-emerald-400">
                            {activeDelivery.understandingLevel || 'not recorded'}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Engagement</span>
                          <span className="font-bold capitalize text-white">
                            {activeDelivery.studentEngagement || 'not recorded'}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Admin Verification</span>
                          <span className="font-bold capitalize text-blue-300">
                            {activeDelivery.adminVerificationStatus}
                          </span>
                        </div>
                      </div>

                      {activeDelivery.teacherComments && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300">
                          {activeDelivery.teacherComments}
                        </div>
                      )}

                      {activeDelivery.remedialNeeded && onTriggerRemedial && (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-amber-300 block">Remedial Follow-up Flagged</span>
                            <span className="text-[10px] text-amber-400/80">
                              {activeDelivery.remedialTopic || 'Adaptive remedial practice recommended'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleTriggerRemedialUi}
                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px]"
                          >
                            Build Remedial Unit →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Trail Drawer */}
                  {showAuditHistory && (
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-2">
                          <History className="w-4 h-4 text-blue-400" />
                          <span>Immutable Audit History ({auditHistory.length} events)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAuditHistory(false)}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {auditHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="font-bold text-slate-200">
                                {entry.eventType} (v{entry.recordVersion})
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Actor: {entry.actorUserId} ({entry.actorRole})
                                {entry.reason ? ` • Reason: ${entry.reason}` : ''}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                              {new Date(entry.occurredAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
