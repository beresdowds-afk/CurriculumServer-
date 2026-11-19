import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, SubjectCurriculum } from '../types';
import { unifiedApiClient } from '../services/unifiedApiClient';
import {
  teachingEvidenceApiClient,
  type TeacherSubjectAssignmentDto,
  type VerifiedTaughtEvidenceBundleDto,
  type AssessmentScopeAuthorizationDto,
  type TaughtAssessmentGenerationResponseDto,
  type ScopeAssessmentType
} from '../services/teachingEvidenceApiClient';
import {
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Lock,
  BookOpen,
  FileCheck2
} from 'lucide-react';

interface TaughtAssessmentTabProps {
  currentUser?: UserProfile;
  subjects?: SubjectCurriculum[];
}

export const TaughtAssessmentTab: React.FC<TaughtAssessmentTabProps> = ({
  currentUser
}) => {
  const isAuthenticated = unifiedApiClient.isAuthenticated('school_flow');

  const [assignments, setAssignments] = useState<TeacherSubjectAssignmentDto[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [evidence, setEvidence] = useState<VerifiedTaughtEvidenceBundleDto | null>(null);
  const [authorizations, setAuthorizations] = useState<AssessmentScopeAuthorizationDto[]>([]);

  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Scope form state
  const [assessmentType, setAssessmentType] = useState<ScopeAssessmentType>('continuous_assessment');
  const [title, setTitle] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [objectiveCount, setObjectiveCount] = useState<number>(4);
  const [theoryCount, setTheoryCount] = useState<number>(2);
  const [totalMarks, setTotalMarks] = useState<number>(40);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [difficultyEasy, setDifficultyEasy] = useState<number>(30);
  const [difficultyMedium, setDifficultyMedium] = useState<number>(50);
  const [difficultyHard, setDifficultyHard] = useState<number>(20);
  const [instructions, setInstructions] = useState<string>(
    'Answer all questions within the authorized time. Show clear workings for theory items.'
  );

  // Scope authorization & generation state
  const [activeAuthorization, setActiveAuthorization] = useState<AssessmentScopeAuthorizationDto | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [insufficientDetails, setInsufficientDetails] = useState<Record<string, unknown> | null>(null);
  const [generatedAssessment, setGeneratedAssessment] = useState<TaughtAssessmentGenerationResponseDto | null>(null);
  const [copied, setCopied] = useState(false);

  // Load teacher's active assignments on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setIsLoadingAssignments(true);
    setLoadError(null);

    teachingEvidenceApiClient
      .listAssignments({ status: 'active' })
      .then((list) => {
        if (!active) return;
        setAssignments(list);
        if (list.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(list[0].id);
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setLoadError(err?.error || err?.message || 'Failed to load teaching assignments.');
      })
      .finally(() => {
        if (active) setIsLoadingAssignments(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Load verified server evidence & persisted scope authorizations when assignment changes
  useEffect(() => {
    if (!isAuthenticated || !selectedAssignmentId) {
      setEvidence(null);
      setAuthorizations([]);
      return;
    }
    let active = true;
    setIsLoadingEvidence(true);
    setActionError(null);
    setInsufficientDetails(null);
    setActiveAuthorization(null);

    Promise.all([
      teachingEvidenceApiClient.getVerifiedTaughtEvidence(
        selectedAssignmentId,
        'assessment_scope_selection'
      ),
      teachingEvidenceApiClient.listScopeAuthorizations({ assignmentId: selectedAssignmentId })
    ])
      .then(([bundle, auths]) => {
        if (!active) return;
        setEvidence(bundle);
        setAuthorizations(auths);
        setTitle(
          `${bundle.subjectName} ${bundle.classGradeName} ${bundle.section} (${bundle.term}) CA Test`
        );

        const defaultTopicIds = bundle.verifiedTopics.map((t) => t.topicId);
        const defaultObjIds = bundle.verifiedTopics.flatMap((t) =>
          t.coveredObjectives.map((o) => o.id)
        );
        setSelectedTopicIds(defaultTopicIds);
        setSelectedObjectiveIds(defaultObjIds);

        const latestAuthorized = auths.find((a) => a.status === 'authorized') || null;
        setActiveAuthorization(latestAuthorized);
      })
      .catch((err: any) => {
        if (!active) return;
        setEvidence(null);
        setActionError(err?.error || err?.message || 'Failed to retrieve verified teaching evidence.');
      })
      .finally(() => {
        if (active) setIsLoadingEvidence(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedAssignmentId]);

  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const toggleTopic = (topicId: string) => {
    const topic = evidence?.verifiedTopics.find((t) => t.topicId === topicId);
    const topicObjIds = topic ? topic.coveredObjectives.map((o) => o.id) : [];

    if (selectedTopicIds.includes(topicId)) {
      setSelectedTopicIds(selectedTopicIds.filter((id) => id !== topicId));
      setSelectedObjectiveIds(selectedObjectiveIds.filter((id) => !topicObjIds.includes(id)));
    } else {
      setSelectedTopicIds([...selectedTopicIds, topicId]);
      const merged = new Set([...selectedObjectiveIds, ...topicObjIds]);
      setSelectedObjectiveIds(Array.from(merged));
    }
    setActiveAuthorization(null);
  };

  const toggleObjective = (objectiveId: string) => {
    if (selectedObjectiveIds.includes(objectiveId)) {
      setSelectedObjectiveIds(selectedObjectiveIds.filter((id) => id !== objectiveId));
    } else {
      setSelectedObjectiveIds([...selectedObjectiveIds, objectiveId]);
    }
    setActiveAuthorization(null);
  };

  const handleAuthorizeScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) return;

    setIsAuthorizing(true);
    setActionError(null);
    setInsufficientDetails(null);

    try {
      const totalQ = Math.max(1, objectiveCount + theoryCount || questionCount);
      const objPct = Math.round((objectiveCount / totalQ) * 100);
      const theoryPct = 100 - objPct;

      const authorization = await teachingEvidenceApiClient.createScopeAuthorization({
        assignmentId: selectedAssignmentId,
        assessmentType,
        title: title.trim() || `${activeAssignment?.subjectName || 'Subject'} Taught Assessment`,
        selectedTopicIds,
        selectedObjectiveIds,
        questionCount,
        questionTypesConfig: {
          objective: objectiveCount,
          theory: theoryCount
        },
        objectiveTheoryBalance: {
          objectivePercent: objPct,
          theoryPercent: theoryPct,
          practicalPercent: 0
        },
        totalMarks,
        difficultyMix: {
          easy: difficultyEasy,
          medium: difficultyMedium,
          hard: difficultyHard
        },
        durationMinutes,
        instructions
      });

      setActiveAuthorization(authorization);
      const updatedList = await teachingEvidenceApiClient.listScopeAuthorizations({
        assignmentId: selectedAssignmentId
      });
      setAuthorizations(updatedList);
    } catch (err: any) {
      setActionError(err?.error || err?.message || 'Scope authorization rejected.');
      setInsufficientDetails(err?.details || null);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleGenerateTaughtAssessment = async () => {
    if (!activeAuthorization || activeAuthorization.status !== 'authorized') {
      setActionError('You must authorize an assessment scope before generating.');
      return;
    }

    setIsGenerating(true);
    setActionError(null);
    setInsufficientDetails(null);
    setGeneratedAssessment(null);

    try {
      const assessment = await teachingEvidenceApiClient.generateTaughtAssessment(
        activeAuthorization.id
      );
      setGeneratedAssessment(assessment);
    } catch (err: any) {
      setActionError(err?.error || err?.message || 'Taught assessment generation rejected.');
      setInsufficientDetails(err?.details || null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeAuthorization = async (authId: string) => {
    setActionError(null);
    try {
      await teachingEvidenceApiClient.revokeScopeAuthorization(
        authId,
        'Revoked by teacher before generation'
      );
      const updatedList = await teachingEvidenceApiClient.listScopeAuthorizations({
        assignmentId: selectedAssignmentId
      });
      setAuthorizations(updatedList);
      if (activeAuthorization?.id === authId) {
        setActiveAuthorization(null);
      }
    } catch (err: any) {
      setActionError(err?.error || err?.message || 'Failed to revoke scope authorization.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Evidence-Grounded Fair Testing & Teacher Scope Authority</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Taught-Only Classroom Tests, CAs & Examinations
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Strictly enforces server-side teaching evidence and teacher-only scope authorization. Client-supplied topic lists are never accepted; generated items enter the school Question Bank as <code className="text-teal-300 font-mono">pending_review</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 font-mono font-medium">
              Server-Verified Scope Only
            </span>
          </div>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="bg-slate-900/90 border border-amber-800/60 rounded-3xl p-8 text-center space-y-3">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Authenticated Teacher Session Required</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Sign in with your school teacher account to load your active teaching assignments, verified taught-topic evidence, and teacher-only assessment scope authorization controls.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Assignment + Verified Evidence + Teacher Scope Authorization */}
          <form
            onSubmit={handleAuthorizeScope}
            className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                1. Teacher Assignment & Verified Evidence
              </span>
              {currentUser?.role && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Role: {currentUser.role}
                </span>
              )}
            </div>

            {loadError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs">
                {loadError}
              </div>
            )}

            <div>
              <label className="text-slate-400 font-semibold block mb-1">
                Active Teaching Assignment:
              </label>
              {isLoadingAssignments ? (
                <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
                  Loading active assignments...
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200">
                  No active teacher subject assignments found for this tenant.
                </div>
              ) : (
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => {
                    setSelectedAssignmentId(e.target.value);
                    setGeneratedAssessment(null);
                  }}
                  className="w-full bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 text-xs"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.subjectName} — {a.classGradeName} {a.section} ({a.term} • {a.academicSession})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isLoadingEvidence && (
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Retrieving server-verified taught evidence...</span>
              </div>
            )}

            {evidence && (
              <>
                {/* Authoritative Scope Context & Excluded Non-Evidence Counters */}
                <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-teal-300">
                      {evidence.subjectName} • {evidence.classGradeName} {evidence.section}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      v:{evidence.curriculumVersionId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="font-bold text-emerald-400 font-mono">
                        {evidence.totalVerifiedTopics}
                      </div>
                      <div className="text-[10px] text-slate-400">Verified Topics</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="font-bold text-amber-400 font-mono">
                        {evidence.unresolvedExcludedCount + evidence.unconfirmedExcludedCount}
                      </div>
                      <div className="text-[10px] text-slate-400">Unresolved / Unconfirmed</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="font-bold text-slate-300 font-mono">
                        {evidence.lessonNotesExcludedCount}
                      </div>
                      <div className="text-[10px] text-slate-400">Lesson Notes Excluded</div>
                    </div>
                  </div>
                </div>

                {/* Verified Taught Topics & Covered Objectives Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">
                      2. Select Verified Topics & Covered Objectives ({selectedTopicIds.length}/{evidence.verifiedTopics.length})
                    </label>
                    {evidence.verifiedTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopicIds(evidence.verifiedTopics.map((t) => t.topicId));
                          setSelectedObjectiveIds(
                            evidence.verifiedTopics.flatMap((t) =>
                              t.coveredObjectives.map((o) => o.id)
                            )
                          );
                          setActiveAuthorization(null);
                        }}
                        className="text-[10px] text-teal-400 hover:underline"
                      >
                        Select All Verified
                      </button>
                    )}
                  </div>

                  {evidence.verifiedTopics.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>No Verified Taught Topics Yet</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        Record and confirm teaching completion in the Teacher Delivery Tracker first. Unresolved free-text topics and saved lesson notes are excluded.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar p-2 bg-slate-850 rounded-2xl border border-slate-800">
                      {evidence.verifiedTopics.map((topic) => {
                        const isChecked = selectedTopicIds.includes(topic.topicId);
                        return (
                          <div
                            key={topic.deliveryRecordId}
                            className={`p-3 rounded-xl border space-y-2 transition-all ${
                              isChecked
                                ? 'bg-slate-800 border-teal-500/60 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div
                              onClick={() => toggleTopic(topic.topicId)}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded bg-slate-800 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-semibold text-xs">{topic.topicTitle}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  {topic.coverageMode}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {topic.verificationBasis === 'admin_verified'
                                    ? 'Admin Verified'
                                    : 'Teacher Reported'}
                                </span>
                              </div>
                            </div>

                            {topic.coveredObjectives.length > 0 && (
                              <div className="pl-5 space-y-1 border-t border-slate-700/50 pt-1.5">
                                {topic.coveredObjectives.map((obj) => (
                                  <label
                                    key={obj.id}
                                    className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedObjectiveIds.includes(obj.id)}
                                      onChange={() => toggleObjective(obj.id)}
                                      className="mt-0.5 rounded bg-slate-900 text-teal-500"
                                    />
                                    <span>{obj.description}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assessment Configuration */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Assessment Type:</label>
                    <select
                      value={assessmentType}
                      onChange={(e) => {
                        setAssessmentType(e.target.value as ScopeAssessmentType);
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    >
                      <option value="quiz">Weekly Formative Quiz</option>
                      <option value="class_test">Class Test</option>
                      <option value="continuous_assessment">Continuous Assessment (CA)</option>
                      <option value="assignment">Graded Assignment</option>
                      <option value="midterm_exam">Mid-Term Examination</option>
                      <option value="exam">Term Examination</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Total Marks:</label>
                    <input
                      type="number"
                      min={1}
                      value={totalMarks}
                      onChange={(e) => {
                        setTotalMarks(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Assessment Title:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setActiveAuthorization(null);
                    }}
                    className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Questions:</label>
                    <input
                      type="number"
                      min={1}
                      value={questionCount}
                      onChange={(e) => {
                        setQuestionCount(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Objective:</label>
                    <input
                      type="number"
                      min={0}
                      value={objectiveCount}
                      onChange={(e) => {
                        setObjectiveCount(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Theory:</label>
                    <input
                      type="number"
                      min={0}
                      value={theoryCount}
                      onChange={(e) => {
                        setTheoryCount(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Minutes:</label>
                    <input
                      type="number"
                      min={5}
                      value={durationMinutes}
                      onChange={(e) => {
                        setDurationMinutes(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Easy %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={difficultyEasy}
                      onChange={(e) => {
                        setDifficultyEasy(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Medium %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={difficultyMedium}
                      onChange={(e) => {
                        setDifficultyMedium(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Hard %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={difficultyHard}
                      onChange={(e) => {
                        setDifficultyHard(Number(e.target.value));
                        setActiveAuthorization(null);
                      }}
                      className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Instructions:</label>
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={(e) => {
                      setInstructions(e.target.value);
                      setActiveAuthorization(null);
                    }}
                    className="w-full bg-slate-800 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs"
                  />
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                    {insufficientDetails && (
                      <div className="text-[11px] font-mono text-rose-300/90">
                        {JSON.stringify(insufficientDetails)}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Explicit Teacher-Only Authorization */}
                <button
                  type="submit"
                  disabled={
                    isAuthorizing ||
                    selectedTopicIds.length === 0 ||
                    selectedObjectiveIds.length === 0
                  }
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isAuthorizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Persisting Teacher Scope Authorization...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>1. Authorize Assessment Scope (Teacher Only)</span>
                    </>
                  )}
                </button>

                {activeAuthorization && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">
                        Scope Authorized (v{activeAuthorization.scopeVersion})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevokeAuthorization(activeAuthorization.id)}
                        className="text-[10px] text-rose-300 hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 break-all">
                      ID: {activeAuthorization.id}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Hash: {activeAuthorization.scopeHash.slice(0, 16)}...
                    </div>
                  </div>
                )}

                {/* Step 2: Generate From Authorized Scope */}
                <button
                  type="button"
                  onClick={handleGenerateTaughtAssessment}
                  disabled={
                    isGenerating ||
                    !activeAuthorization ||
                    activeAuthorization.status !== 'authorized'
                  }
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating From Authorized Evidence...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>2. Generate Taught Assessment</span>
                    </>
                  )}
                </button>

                {/* Prior Scope Authorizations Audit List */}
                {authorizations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Scope Authorization Versions ({authorizations.length})
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {authorizations.map((auth) => (
                        <div
                          key={auth.id}
                          onClick={() => {
                            if (auth.status === 'authorized') setActiveAuthorization(auth);
                          }}
                          className={`p-2 rounded-lg border text-[10px] flex items-center justify-between ${
                            auth.id === activeAuthorization?.id
                              ? 'bg-slate-800 border-teal-500/60 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="truncate">
                            v{auth.scopeVersion} • {auth.title}
                          </span>
                          <span className="font-mono uppercase">{auth.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </form>

          {/* Right Column: Generated Assessment & Provenance */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {generatedAssessment ? (
              <div className="space-y-6 text-xs text-slate-300 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono text-xs font-bold">
                        Evidence-Grounded • Scope v{generatedAssessment.scopeVersion}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono text-xs font-bold">
                        Review Status: {generatedAssessment.reviewStatus}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                        {generatedAssessment.totalMarks} Marks
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white">{generatedAssessment.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {generatedAssessment.subjectName} • {generatedAssessment.classGrade} • Curriculum Version: {generatedAssessment.curriculumVersionId}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(generatedAssessment, null, 2))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Test</span>
                    </button>
                  </div>
                </div>

                {/* Provenance & Persistence Summary */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Question Bank Persistence</span>
                    <span className="font-bold text-emerald-300">
                      {generatedAssessment.persistedQuestions.length} items saved (pending_review)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Blueprint ID</span>
                    <span className="font-mono text-slate-200">{generatedAssessment.blueprint?.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Provenance Record</span>
                    <span className="font-mono text-slate-200">{generatedAssessment.provenance?.id}</span>
                  </div>
                </div>

                {/* Guarantee Note */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-teal-400 text-[11px] uppercase tracking-wider">
                    Verified Scope & Fair Testing Guarantee
                  </span>
                  <p className="text-slate-300 text-[11px]">{generatedAssessment.guaranteeNote}</p>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-white text-sm">
                    Assessment Questions ({generatedAssessment.questions?.length || 0})
                  </h4>

                  {generatedAssessment.questions?.map((q, idx) => {
                    const guide = generatedAssessment.markingGuide?.find(
                      (g) => Number(g.questionNumber) === Number(q.questionNumber)
                    );
                    return (
                      <div
                        key={idx}
                        className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-teal-400 min-w-[20px]">
                              {q.questionNumber || idx + 1}.
                            </span>
                            <div className="space-y-1">
                              <p className="text-slate-100 font-medium leading-relaxed">
                                {q.questionText}
                              </p>
                              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                                <span>Topic: {q.topic}</span>
                                {q.topicId && <span>• ID: {q.topicId}</span>}
                                {q.learningObjectiveIds && q.learningObjectiveIds.length > 0 && (
                                  <span>• Objectives: {q.learningObjectiveIds.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                            [{q.marks} Marks • {q.difficulty}]
                          </span>
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                            {q.options.map((opt, oi) => (
                              <div
                                key={oi}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300"
                              >
                                <span className="font-bold text-teal-400 mr-1.5">{opt.key}.</span>
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}

                        {guide && (
                          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                            <strong className="text-teal-400">Marking Guide:</strong>{' '}
                            {guide.correctAnswer} — {guide.modelAnswer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-850 text-slate-600 flex items-center justify-center mx-auto border border-slate-800">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-xs max-w-sm mx-auto">
                  Select an assignment, review verified taught topics and covered objectives on the left, authorize the assessment scope as the assigned teacher, and click <strong>2. Generate Taught Assessment</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
