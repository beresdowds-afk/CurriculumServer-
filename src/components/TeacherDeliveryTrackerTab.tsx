import React, { useState } from 'react';
import { 
  UserProfile, 
  AssignedLessonDelivery, 
  DeliveryStatus, 
  TeacherFeedback,
  StudentUnderstanding
} from '../types';
import { 
  CalendarCheck2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  Sparkles, 
  ChevronRight, 
  MessageSquare, 
  ThumbsUp, 
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface TeacherDeliveryTrackerTabProps {
  currentUser: UserProfile;
  deliveries: AssignedLessonDelivery[];
  onUpdateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  onSubmitFeedback: (deliveryId: string, feedback: TeacherFeedback) => void;
  onTriggerRemedial: (delivery: AssignedLessonDelivery) => void;
}

export const TeacherDeliveryTrackerTab: React.FC<TeacherDeliveryTrackerTabProps> = ({
  currentUser,
  deliveries,
  onUpdateDeliveryStatus,
  onSubmitFeedback,
  onTriggerRemedial
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [activeDeliveryId, setActiveDeliveryId] = useState<string>(deliveries[0]?.id || '');
  
  // Feedback form state
  const [understanding, setUnderstanding] = useState<StudentUnderstanding>('good');
  const [engagement, setEngagement] = useState<number>(4);
  const [comment, setComment] = useState('');
  const [requestRemedial, setRequestRemedial] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const filteredDeliveries = deliveries.filter((del) => {
    if (selectedDay !== 'all' && del.dayOfWeek !== selectedDay) return false;
    // If teacher role, optionally filter to teacher or show all
    return true;
  });

  const activeDelivery = deliveries.find((d) => d.id === activeDeliveryId) || filteredDeliveries[0] || deliveries[0];

  const getStageBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed & Feedback Logged', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'taught':
        return { label: 'Taught (Feedback Pending)', color: 'bg-blue-950 text-blue-300 border-blue-800' };
      case 'acknowledged':
        return { label: 'Acknowledged by Teacher', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' };
      case 'opened':
        return { label: 'Opened & Viewed', color: 'bg-teal-950 text-teal-300 border-teal-800' };
      case 'received':
        return { label: 'Received in Teacher Inbox', color: 'bg-amber-950 text-amber-300 border-amber-800' };
      default:
        return { label: 'Assigned (Unopened)', color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    const feedbackPayload: TeacherFeedback = {
      understandingLevel: understanding,
      engagementRating: engagement,
      comments: comment || 'Lesson delivered according to approved standard.',
      requestAdditionalLesson: requestRemedial || understanding === 'poor' || understanding === 'fair',
      requestCurriculumModification: false,
      submittedAt: new Date().toISOString()
    };

    onSubmitFeedback(activeDelivery.id, feedbackPayload);
    setIsSubmittingFeedback(false);
    setComment('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              <CalendarCheck2 className="w-4 h-4" />
              <span>Digital Teaching Record & Classroom Delivery Tracking</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              End-to-End Lesson Execution & Teacher Feedback Loop
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Distinguishing every delivery stage: <strong className="text-slate-200">Assigned → Received → Opened → Acknowledged → Taught → Completed</strong>. Catching syllabus gaps early.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-medium">
              {deliveries.filter(d => d.status === 'completed').length} of {deliveries.length} Periods Delivered
            </span>
          </div>
        </div>

        {/* Day of Week Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-6 mt-6 border-t border-slate-800 text-xs">
          {['all', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedDay === day
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {day === 'all' ? 'Entire Week Timetable' : day}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scheduled Teaching Periods */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-3 max-h-[850px] overflow-y-auto custom-scrollbar">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 block">
            Assigned Teaching Periods ({filteredDeliveries.length})
          </span>

          {filteredDeliveries.map((del) => {
            const isSelected = activeDelivery && activeDelivery.id === del.id;
            const stageBadge = getStageBadge(del.status);
            return (
              <button
                key={del.id}
                onClick={() => {
                  setActiveDeliveryId(del.id);
                  setIsSubmittingFeedback(false);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-800 border-blue-500/50 shadow-md shadow-blue-950/20'
                    : 'bg-slate-850/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{del.classSection}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Period {del.period}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${stageBadge.color}`}>
                    {stageBadge.label}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-200">{del.subjectName}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{del.topicTitle}</p>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span>{del.dayOfWeek} • {del.scheduledTime}</span>
                  <span className="font-medium text-slate-400">{del.teacherName}</span>
                </div>

                {del.isDelayed && del.status !== 'completed' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/40">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Delay Detected: Period has passed without completion log</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Delivery Execution & Feedback Panel */}
        {activeDelivery && (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* Delivery Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono text-xs font-bold">
                    {activeDelivery.classSection} • Period {activeDelivery.period}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getStageBadge(activeDelivery.status).color}`}>
                    {getStageBadge(activeDelivery.status).label}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white">{activeDelivery.topicTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{activeDelivery.subTopic}</p>
              </div>

              <div className="text-right text-xs text-slate-400">
                <span className="block font-bold text-white">{activeDelivery.dayOfWeek}</span>
                <span>{activeDelivery.scheduledTime}</span>
              </div>
            </div>

            {/* 6-Stage Delivery Progress Bar */}
            <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Digital Teaching Lifecycle
              </span>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                {[
                  { stage: 'assigned', label: '1. Assigned' },
                  { stage: 'received', label: '2. Received' },
                  { stage: 'opened', label: '3. Opened' },
                  { stage: 'acknowledged', label: '4. Acknowledged' },
                  { stage: 'taught', label: '5. Taught' },
                  { stage: 'completed', label: '6. Completed' },
                ].map((st, i) => {
                  const stagesOrder: DeliveryStatus[] = ['assigned', 'received', 'opened', 'acknowledged', 'taught', 'completed'];
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

              {/* Teacher Lifecycle Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {activeDelivery.status === 'assigned' && (
                  <button
                    onClick={() => onUpdateDeliveryStatus(activeDelivery.id, 'received')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Mark Received
                  </button>
                )}

                {(activeDelivery.status === 'assigned' || activeDelivery.status === 'received') && (
                  <button
                    onClick={() => onUpdateDeliveryStatus(activeDelivery.id, 'opened')}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold"
                  >
                    Open & Review Note
                  </button>
                )}

                {activeDelivery.status === 'opened' && (
                  <button
                    onClick={() => onUpdateDeliveryStatus(activeDelivery.id, 'acknowledged')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                  >
                    Acknowledge Readiness to Teach
                  </button>
                )}

                {activeDelivery.status === 'acknowledged' && (
                  <button
                    onClick={() => onUpdateDeliveryStatus(activeDelivery.id, 'taught')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                  >
                    Mark as Taught in Class
                  </button>
                )}

                {activeDelivery.status === 'taught' && (
                  <button
                    onClick={() => setIsSubmittingFeedback(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow animate-pulse"
                  >
                    Submit Post-Lesson Feedback
                  </button>
                )}
              </div>
            </div>

            {/* Submitted Feedback Summary (If already completed) */}
            {activeDelivery.feedback && (
              <div className="bg-slate-850 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Teacher's Post-Lesson Feedback</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Logged: {new Date(activeDelivery.feedback.submittedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Student Understanding</span>
                    <span className={`font-bold capitalize ${
                      activeDelivery.feedback.understandingLevel === 'excellent' ? 'text-emerald-400' :
                      activeDelivery.feedback.understandingLevel === 'good' ? 'text-blue-400' :
                      activeDelivery.feedback.understandingLevel === 'fair' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {activeDelivery.feedback.understandingLevel}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Engagement Level</span>
                    <span className="font-bold text-white">{activeDelivery.feedback.engagementRating} / 5 Stars</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <strong className="text-slate-400 block text-[10px]">Classroom Observation:</strong>
                  <p className="text-slate-300 leading-relaxed">{activeDelivery.feedback.comments}</p>
                </div>

                {activeDelivery.feedback.requestAdditionalLesson && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-300 block">Remedial Lesson Requested</span>
                      <span className="text-[10px] text-amber-400/80">Adaptive remedial unit recommended prior to next topic</span>
                    </div>
                    <button
                      onClick={() => onTriggerRemedial(activeDelivery)}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px]"
                    >
                      Build Remedial Unit →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Post-Lesson Feedback Form Drawer */}
            {(isSubmittingFeedback || (!activeDelivery.feedback && activeDelivery.status === 'taught')) && (
              <form onSubmit={handleFeedbackSubmit} className="bg-slate-850 p-6 rounded-2xl border border-blue-800/60 space-y-4 text-xs animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Submit Post-Lesson Quality & Understanding Feedback</span>
                  </h3>
                </div>

                {/* Understanding Rating */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Overall Student Understanding:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'excellent', label: '🌟 Excellent', desc: '>85% Mastery' },
                      { id: 'good', label: '👍 Good', desc: '70-84% Mastery' },
                      { id: 'fair', label: '⚠️ Fair', desc: '50-69% (Needs Rev)' },
                      { id: 'poor', label: '🔴 Poor', desc: '<50% (Remedial Req)' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          setUnderstanding(opt.id as StudentUnderstanding);
                          if (opt.id === 'fair' || opt.id === 'poor') {
                            setRequestRemedial(true);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          understanding === opt.id
                            ? 'bg-blue-600 text-white border-blue-400 shadow'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold block">{opt.label}</span>
                        <span className="text-[10px] opacity-80">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qualitative Comments */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Teacher's Remarks & Identified Difficulties:</label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Students struggled with algebraic fractions with non-unit coefficients. Additional guided practice required..."
                    className="w-full bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                {/* Remedial Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remedialCheck"
                    checked={requestRemedial}
                    onChange={(e) => setRequestRemedial(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="remedialCheck" className="text-slate-300 font-medium cursor-pointer">
                    Request Adaptive Remedial Intervention before unlocking next syllabus topic
                  </label>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmittingFeedback(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40"
                  >
                    Save & Complete Digital Teaching Record
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
