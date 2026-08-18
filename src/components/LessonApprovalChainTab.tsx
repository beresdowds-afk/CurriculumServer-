import React, { useState } from 'react';
import { 
  UserProfile, 
  StandardLessonNote, 
  LessonApprovalStatus 
} from '../types';
import { 
  FileCheck2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  UserCheck, 
  Sparkles, 
  Eye, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck,
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface LessonApprovalChainTabProps {
  currentUser: UserProfile;
  lessonNotes: StandardLessonNote[];
  onApproveLesson: (lessonId: string) => void;
  onRejectLesson: (lessonId: string, reason: string) => void;
  onReviewLesson: (lessonId: string, comment: string) => void;
  onOpenDraftModal: () => void;
}

export const LessonApprovalChainTab: React.FC<LessonApprovalChainTabProps> = ({
  currentUser,
  lessonNotes,
  onApproveLesson,
  onRejectLesson,
  onReviewLesson,
  onOpenDraftModal,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeLessonId, setActiveLessonId] = useState<string>(lessonNotes[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const filteredLessons = lessonNotes.filter((lesson) => {
    if (selectedStatus === 'all') return true;
    return lesson.status === selectedStatus;
  });

  const activeLesson = lessonNotes.find((l) => l.id === activeLessonId) || filteredLessons[0] || lessonNotes[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: LessonApprovalStatus) => {
    switch (status) {
      case 'approved':
      case 'distributed':
        return { label: 'Principal Approved', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'pending_principal_approval':
        return { label: 'Awaiting Principal Sign-off', color: 'bg-purple-950 text-purple-300 border-purple-800' };
      case 'pending_coordinator_review':
        return { label: 'In Academic VP Review', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' };
      case 'rejected':
        return { label: 'Modifications Requested', color: 'bg-rose-950 text-rose-300 border-rose-800' };
      default:
        return { label: 'Drafted', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const canApprove = currentUser.role === 'principal' || currentUser.role === 'super_admin';
  const canReview = currentUser.role === 'academic_coordinator' || currentUser.role === 'principal' || currentUser.role === 'hod';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Principal's Academic Quality & Approval Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Standardized Lesson Note Review & Distribution Chain
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Teachers receive approved materials that meet the school's high pedagogical standards: <strong className="text-slate-200">AI Draft → Academic Coordinator Review → Principal Sign-off → Distribution</strong>.
            </p>
          </div>

          <button
            onClick={onOpenDraftModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 self-start"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Official Lesson Note</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 mt-6 border-t border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All Lesson Notes', count: lessonNotes.length },
            { id: 'pending_coordinator_review', label: 'In VP Review', count: lessonNotes.filter(l => l.status === 'pending_coordinator_review').length },
            { id: 'pending_principal_approval', label: 'Awaiting Principal Approval', count: lessonNotes.filter(l => l.status === 'pending_principal_approval').length },
            { id: 'approved', label: 'Approved & Distributed', count: lessonNotes.filter(l => l.status === 'approved' || l.status === 'distributed').length },
            { id: 'rejected', label: 'Changes Requested', count: lessonNotes.filter(l => l.status === 'rejected').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedStatus === tab.id
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === tab.id ? 'bg-purple-800 text-purple-100' : 'bg-slate-700 text-slate-300'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column View: Lesson Note List + Full Lesson Note Preview with Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lesson Notes List */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2 max-h-[850px] overflow-y-auto custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Submitted Notes ({filteredLessons.length})
          </span>

          {filteredLessons.map((lesson) => {
            const isSelected = activeLesson && activeLesson.id === lesson.id;
            const badge = getStatusBadge(lesson.status);
            return (
              <button
                key={lesson.id}
                onClick={() => {
                  setActiveLessonId(lesson.id);
                  setIsRejecting(false);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                  isSelected
                    ? 'bg-slate-800 border-purple-500/50 shadow-md shadow-purple-950/20'
                    : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{lesson.subjectName} ({lesson.classGrade})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-semibold line-clamp-1">{lesson.topicTitle}</p>
                
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Wk {lesson.week} • Les {lesson.lessonNumber}</span>
                  <span>By: {lesson.createdBy}</span>
                </div>
              </button>
            );
          })}

          {filteredLessons.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No lesson notes match this status.
            </div>
          )}
        </div>

        {/* Right Column: Complete Standardized Lesson Note Preview & Approval Controls */}
        {activeLesson && (
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Header / Meta Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono text-xs font-bold">
                    Official Standard Lesson Note
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getStatusBadge(activeLesson.status).color}`}>
                    {getStatusBadge(activeLesson.status).label}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">{activeLesson.topicTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{activeLesson.subTopic}</p>
              </div>

              {/* Print & Copy Actions */}
              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={() => handleCopy(JSON.stringify(activeLesson, null, 2))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Copy Full Lesson Note JSON/Text"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Print Official Lesson Note"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Note</span>
                </button>
              </div>
            </div>

            {/* Approval Chain Signature Box */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span>Academic Governance & Sign-off Log</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">1. Author / Originator</span>
                  <span className="font-bold text-slate-200">{activeLesson.createdBy}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">{new Date(activeLesson.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">2. Academic Coordinator</span>
                  <span className="font-bold text-slate-200">{activeLesson.reviewedBy || 'Pending Review'}</span>
                  {activeLesson.reviewedAt && (
                    <span className="text-[10px] text-indigo-400 block mt-1">{new Date(activeLesson.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">3. Principal Executive Sign-off</span>
                  <span className="font-bold text-slate-200">{activeLesson.approvedBy || 'Pending Executive Approval'}</span>
                  {activeLesson.approvedAt && (
                    <span className="text-[10px] text-emerald-400 block mt-1">{new Date(activeLesson.approvedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {activeLesson.reviewComment && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-xs text-indigo-200">
                  <strong className="text-indigo-400">Coordinator Remark:</strong> {activeLesson.reviewComment}
                </div>
              )}
            </div>

            {/* Structured Lesson Note Body (Official NERDC Layout) */}
            <div className="space-y-6 text-xs text-slate-300">
              {/* Basic Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-850 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">Subject</span>
                  <span className="font-bold text-white">{activeLesson.subjectName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Class Grade</span>
                  <span className="font-bold text-white">{activeLesson.classGrade} ({activeLesson.averageAge})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Term & Week</span>
                  <span className="font-bold text-white">{activeLesson.term} • Wk {activeLesson.week} (Les {activeLesson.lessonNumber})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Duration</span>
                  <span className="font-bold text-white">{activeLesson.durationMinutes} Minutes</span>
                </div>
              </div>

              {/* Previous Knowledge & Learning Objectives */}
              <div className="space-y-4">
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-200">Previous Knowledge / Entry Behavior:</span>
                  <p className="text-slate-400 leading-relaxed">{activeLesson.previousKnowledge}</p>
                </div>

                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400">Behavioral Learning Objectives:</span>
                  <p className="text-[11px] text-slate-400 italic">By the end of the lesson, students will be able to:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-200 font-medium">
                    {activeLesson.learningObjectives.map((obj, i) => (
                      <li key={i} className="leading-relaxed">{obj}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Instructional Materials & References */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-blue-400">Instructional Materials / Teaching Aids:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    {activeLesson.instructionalMaterials.map((mat, i) => (
                      <li key={i}>{mat}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400">Reference Course Books:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                    {activeLesson.referenceBooks.map((ref, i) => (
                      <li key={i}>{ref}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Introduction */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">Set Induction / Introduction ({activeLesson.introduction.duration}):</span>
                <p className="text-slate-300 leading-relaxed">{activeLesson.introduction.activity}</p>
              </div>

              {/* Presentation Steps Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-200 block uppercase tracking-wider text-[11px]">
                  Step-by-Step Lesson Presentation
                </span>
                <div className="space-y-3">
                  {activeLesson.presentationSteps.map((step) => (
                    <div key={step.stepNumber} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-emerald-400">Step {step.stepNumber}: {step.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{step.durationMinutes} Minutes</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <strong className="text-slate-300 block mb-0.5">Teacher's Activity:</strong>
                          <p className="text-slate-400 leading-relaxed">{step.teacherActivity}</p>
                        </div>
                        <div>
                          <strong className="text-slate-300 block mb-0.5">Students' Activity:</strong>
                          <p className="text-slate-400 leading-relaxed">{step.studentActivity}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60 text-[11px]">
                        <strong className="text-indigo-300">Core Learning Point:</strong> {step.learningPoint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation, Homework & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400">Formative Evaluation Questions:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {activeLesson.evaluationQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-purple-400">Homework & Take-Home Assignment:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {activeLesson.homework.map((hw, i) => (
                      <li key={i}>{hw}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Summary & Conclusion:</span>
                <p className="text-slate-400 leading-relaxed">{activeLesson.summaryAndConclusion}</p>
              </div>
            </div>

            {/* Action Bar for Principals & Academic Coordinators */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <span className="text-xs font-bold text-white block">
                Executive Action Center
              </span>

              {/* Coordinator Review Action */}
              {canReview && activeLesson.status === 'pending_coordinator_review' && (
                <div className="bg-indigo-950/30 p-4 rounded-2xl border border-indigo-800/60 space-y-3 text-xs">
                  <span className="font-bold text-indigo-300">Academic Coordinator Review & Remarks</span>
                  <input
                    type="text"
                    value={reviewCommentInput}
                    onChange={(e) => setReviewCommentInput(e.target.value)}
                    placeholder="Enter review remarks and forward to Principal..."
                    className="w-full bg-slate-900 text-slate-200 p-2.5 rounded-xl border border-indigo-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                  <button
                    onClick={() => {
                      onReviewLesson(activeLesson.id, reviewCommentInput || 'Pedagogically sound and aligned with NERDC standards.');
                      setReviewCommentInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review & Forward to Principal</span>
                  </button>
                </div>
              )}

              {/* Principal Final Approval Action */}
              {canApprove && (activeLesson.status === 'pending_principal_approval' || activeLesson.status === 'pending_coordinator_review') && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onApproveLesson(activeLesson.id)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Authorize Distribution to Teachers</span>
                  </button>

                  <button
                    onClick={() => setIsRejecting(!isRejecting)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 font-semibold text-xs transition-all"
                  >
                    Request Modification / Reject
                  </button>
                </div>
              )}

              {/* Reject Reason Drawer */}
              {isRejecting && (
                <div className="bg-rose-950/30 p-4 rounded-2xl border border-rose-800/60 space-y-3 text-xs animate-fadeIn">
                  <span className="font-bold text-rose-300">Modification Instructions for Teacher</span>
                  <textarea
                    rows={3}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="Specify why modification is requested (e.g. Include more Nigerian practical examples, extend guided practice)..."
                    className="w-full bg-slate-900 text-slate-200 p-2.5 rounded-xl border border-rose-700/60 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                  />
                  <button
                    onClick={() => {
                      if (rejectReasonInput.trim()) {
                        onRejectLesson(activeLesson.id, rejectReasonInput);
                        setRejectReasonInput('');
                        setIsRejecting(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all"
                  >
                    Send Modification Request
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
