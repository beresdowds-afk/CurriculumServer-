import React, { useState } from 'react';
import {
  PrincipalMemoDispatch,
  VisitorLogEntry,
  TeacherReliefAssignment,
  OfficialDocumentRequest,
  FacilityBookingEntry,
  DelegatedPrincipalRBACPolicy,
  SchoolBrandProfile,
  PrincipalMemoUrgency,
  PrincipalMemoAudience,
  VisitorIdType,
  OfficialDocType
} from '../types';
import {
  X,
  Send,
  UserCheck,
  Building2,
  FileCheck2,
  ShieldCheck,
  Calendar,
  Clock,
  QrCode,
  CheckCircle2,
  Printer,
  FileText,
  Lock,
  Sparkles,
  Users,
  Award,
  AlertTriangle,
  Download,
  Search,
  Check,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

// -------------------------------------------------------------
// 1. PRINCIPAL MEMO & EXECUTIVE DISPATCH MODAL
// -------------------------------------------------------------
interface PrincipalMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandProfile: SchoolBrandProfile;
  onSaveMemo: (memo: PrincipalMemoDispatch) => void;
}

export const PrincipalMemoModal: React.FC<PrincipalMemoModalProps> = ({
  isOpen,
  onClose,
  brandProfile,
  onSaveMemo
}) => {
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState<PrincipalMemoAudience>('all_teachers');
  const [urgency, setUrgency] = useState<PrincipalMemoUrgency>('priority');
  const [content, setContent] = useState('');
  const [memoRefNumber, setMemoRefNumber] = useState(`PR/EXEC/2026/04${Math.floor(Math.random() * 90) + 10}`);
  const [isSignRequested, setIsSignRequested] = useState(true);

  if (!isOpen) return null;

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newMemo: PrincipalMemoDispatch = {
      id: `memo-${Date.now()}`,
      memoRefNumber,
      title,
      sender: 'Office of the Principal',
      preparedByAssistant: 'Mrs. Folashade Adeleke',
      targetAudience,
      urgency,
      content,
      dispatchedAt: new Date().toISOString(),
      acknowledgmentsCount: 0,
      totalRecipientsCount: targetAudience === 'all_teachers' ? 48 : targetAudience === 'hods' ? 8 : 135,
      status: isSignRequested ? 'signed_and_dispatched' : 'draft_for_principal_signature',
      principalSigned: isSignRequested,
      principalSignedAt: isSignRequested ? new Date().toISOString() : undefined
    };

    onSaveMemo(newMemo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Send className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Dispatch Principal Executive Memo</h3>
              <p className="text-xs text-teal-200">Executive Secretariat & Staff Circular Broadcast</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDispatch} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Memo Ref Number
              </label>
              <input
                type="text"
                value={memoRefNumber}
                onChange={(e) => setMemoRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as PrincipalMemoUrgency)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="routine">Routine Administrative Note</option>
                <option value="priority">Priority Staff Directive</option>
                <option value="urgent_immediate_action">Urgent Immediate Action (Alert Banner)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as PrincipalMemoAudience)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="all_teachers">All Teaching Staff & Subject Masters (48 Staff)</option>
              <option value="hods">Heads of Department (HODs) & Academic Board (8 Staff)</option>
              <option value="senior_secondary_staff">Senior Secondary School Teachers (SS 1 - SS 3)</option>
              <option value="junior_secondary_staff">Junior Secondary School Teachers (JSS 1 - JSS 3)</option>
              <option value="administrative_staff">Non-Teaching & Administrative Staff (15 Staff)</option>
              <option value="all_school_community">Entire School Faculty & Staff Community (135 Staff)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Memo Subject / Directive Heading
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Directive on Compulsory Attendance for Continuous Assessment Moderation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Memo Content & Official Instructions
            </label>
            <textarea
              required
              rows={4}
              placeholder="Type the principal's official text, requirements, deadlines, and policy references here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Principal Signature Authorization Box */}
          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-teal-900">Principal Delegated Digital Endorsement</p>
                <p className="text-[11px] text-teal-700">Apply Principal Seal (Ref: PR-DELEGATE-2026-A)</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSignRequested}
                onChange={(e) => setIsSignRequested(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-xs font-bold text-slate-700">Sign & Stamp Now</span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              Dispatch Official Memo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. VISITOR CHECK-IN & SECURITY PASS MODAL
// -------------------------------------------------------------
interface VisitorCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVisitor: (visitor: VisitorLogEntry) => void;
}

export const VisitorCheckInModal: React.FC<VisitorCheckInModalProps> = ({
  isOpen,
  onClose,
  onSaveVisitor
}) => {
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorOrganization, setVisitorOrganization] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [personToSee, setPersonToSee] = useState('Principal Dr. Mustapha');
  const [idCardTypeVerified, setIdCardTypeVerified] = useState<VisitorIdType>('National NIN Card');
  const [escortAssigned, setEscortAssigned] = useState('Mrs. Folashade Adeleke');
  const [entryClearanceNotes, setEntryClearanceNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    const newVisitor: VisitorLogEntry = {
      id: `vis-${Date.now()}`,
      badgeNumber: `VIS-2026-0${Math.floor(Math.random() * 90) + 10}`,
      visitorName,
      visitorPhone: visitorPhone || '+234 800 000 0000',
      visitorOrganization: visitorOrganization || 'Self / Private Citizen',
      purposeOfVisit,
      personToSee,
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: personToSee.includes('Principal') ? 'escorted_to_principal' : 'active_on_premises',
      idCardTypeVerified,
      escortAssigned,
      entryClearanceNotes: entryClearanceNotes || 'ID verified at Front Desk. Digital badge issued.',
      principalApproved: true
    };

    onSaveVisitor(newVisitor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <UserCheck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Register School Visitor & Issue Pass</h3>
              <p className="text-xs text-teal-200">Front Office & Principal Protocol Log</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Visitor Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chief Oladipo Johnson"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="+234 803 000 0000"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Organization / Company / Affiliation
              </label>
              <input
                type="text"
                placeholder="e.g. Ministry of Education / PTA"
                value={visitorOrganization}
                onChange={(e) => setVisitorOrganization(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Person / Office To Visit
              </label>
              <select
                value={personToSee}
                onChange={(e) => setPersonToSee(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Principal Dr. Mustapha">Principal Dr. Mustapha (Executive Suite)</option>
                <option value="VP Academic (Mr. Okonkwo)">VP Academic (Mr. Okonkwo)</option>
                <option value="VP Admin (Mrs. Yusuf)">VP Admin (Mrs. Yusuf)</option>
                <option value="Bursary & Accounts Desk">Bursary & Accounts Desk</option>
                <option value="Registry Desk">Registry Desk (Mrs. Adeleke)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                ID Document Verified
              </label>
              <select
                value={idCardTypeVerified}
                onChange={(e) => setIdCardTypeVerified(e.target.value as VisitorIdType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="National NIN Card">National NIN Slip / Card</option>
                <option value="Driver's License">FRSC Driver's License</option>
                <option value="International Passport">International Passport</option>
                <option value="Voter Card">INEC Voter Card</option>
                <option value="Staff / Corporate ID">Corporate / Official Work ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Escort Officer Assigned
              </label>
              <input
                type="text"
                value={escortAssigned}
                onChange={(e) => setEscortAssigned(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Purpose of Visit
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. WAEC Accreditation team visit, student transfer consultation, vendor supply calibration..."
              value={purposeOfVisit}
              onChange={(e) => setPurposeOfVisit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Check In & Issue Badge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. TEACHER RELIEF & SUBSTITUTE DUTY ROSTER MODAL
// -------------------------------------------------------------
interface TeacherReliefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRelief: (relief: TeacherReliefAssignment) => void;
}

export const TeacherReliefModal: React.FC<TeacherReliefModalProps> = ({
  isOpen,
  onClose,
  onSaveRelief
}) => {
  const [periodSlot, setPeriodSlot] = useState('Period 3 (10:00 - 10:45 AM)');
  const [absentTeacherName, setAbsentTeacherName] = useState('Mrs. Ngozi Okonjo');
  const [subjectName, setSubjectName] = useState('English Studies');
  const [classGroupName, setClassGroupName] = useState('SS 1 Diamond');
  const [assignedReliefTeacherName, setAssignedReliefTeacherName] = useState('Mr. Daniel Adeyemi');
  const [dutyLocation, setDutyLocation] = useState('Room 203, Senior Secondary Wing');
  const [lessonWorkAssigned, setLessonWorkAssigned] = useState('Comprehension Exercise & Continuous Assessment revision.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRelief: TeacherReliefAssignment = {
      id: `relief-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      periodSlot,
      absentTeacherName,
      subjectName,
      classGroupName,
      assignedReliefTeacherName,
      dutyLocation,
      lessonWorkAssigned,
      reliefStatus: 'assigned',
      principalEndorsement: true,
      notes: 'Relief duty docket logged by Executive Assistant.'
    };
    onSaveRelief(newRelief);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Users className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Assign Teacher Relief / Substitute Roster</h3>
              <p className="text-xs text-teal-200">Classroom Coverage & Timetable Dispatch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period / Time Slot
              </label>
              <select
                value={periodSlot}
                onChange={(e) => setPeriodSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Period 1 (8:00 - 8:45 AM)">Period 1 (8:00 - 8:45 AM)</option>
                <option value="Period 2 (8:50 - 9:35 AM)">Period 2 (8:50 - 9:35 AM)</option>
                <option value="Period 3 (10:00 - 10:45 AM)">Period 3 (10:00 - 10:45 AM)</option>
                <option value="Period 4 (10:45 - 11:30 AM)">Period 4 (10:45 - 11:30 AM)</option>
                <option value="Period 5 (12:30 - 1:15 PM)">Period 5 (12:30 - 1:15 PM)</option>
                <option value="Period 6 (1:15 - 2:00 PM)">Period 6 (1:15 - 2:00 PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Absent Staff Member
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mrs. Ngozi Okonjo (Official Leave)"
                value={absentTeacherName}
                onChange={(e) => setAbsentTeacherName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject & Topic
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class Arm & Room Location
              </label>
              <input
                type="text"
                required
                value={classGroupName}
                onChange={(e) => setClassGroupName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Relief Teacher
            </label>
            <select
              value={assignedReliefTeacherName}
              onChange={(e) => setAssignedReliefTeacherName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
            >
              <option value="Mr. Daniel Adeyemi">Mr. Daniel Adeyemi (Free Period 3)</option>
              <option value="Mr. Babatunde Adewale">Mr. Babatunde Adewale (Free Period 3)</option>
              <option value="Mrs. Amina Yusuf (VP Admin)">Mrs. Amina Yusuf (VP Admin)</option>
              <option value="Mr. David Sanusi (Exam Officer)">Mr. David Sanusi (Exam Officer)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Classwork / Learning Task Assigned to Students
            </label>
            <textarea
              rows={2}
              value={lessonWorkAssigned}
              onChange={(e) => setLessonWorkAssigned(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Dispatch Relief Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. OFFICIAL DOCUMENT / TRANSCRIPT & CERTIFICATE MODAL
// -------------------------------------------------------------
interface DocumentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandProfile: SchoolBrandProfile;
  onSaveDocRequest: (req: OfficialDocumentRequest) => void;
}

export const DocumentProcessingModal: React.FC<DocumentProcessingModalProps> = ({
  isOpen,
  onClose,
  brandProfile,
  onSaveDocRequest
}) => {
  const [studentName, setStudentName] = useState('Chinedu Eze');
  const [admissionNumber, setAdmissionNumber] = useState('GFA/2023/048');
  const [documentType, setDocumentType] = useState<OfficialDocType>('Official Academic Transcript');
  const [requestedBy, setRequestedBy] = useState('Parent for University Admission');
  const [destinationInstitution, setDestinationInstitution] = useState('University of Ibadan Admissions');
  const [bursaryReceiptNumber, setBursaryReceiptNumber] = useState(`BUR-RCP-${Math.floor(Math.random() * 8999) + 1000}`);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reqNum = `DOC-REQ-2026-0${Math.floor(Math.random() * 90) + 10}`;
    const newDoc: OfficialDocumentRequest = {
      id: `doc-${Date.now()}`,
      requestNumber: reqNum,
      studentName,
      admissionNumber,
      documentType,
      requestedBy,
      destinationInstitution,
      paymentStatus: 'fee_cleared',
      bursaryReceiptNumber,
      processingStatus: 'principal_seal_applied',
      issuedDate: new Date().toISOString().split('T')[0],
      verificationQrCode: `https://greenfieldacademy.edu.ng/verify/${reqNum}`,
      signedByPrincipal: true,
      principalSignatureRef: `PR-SIG-${admissionNumber.replace(/\//g, '-')}`
    };

    onSaveDocRequest(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileCheck2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Generate Official Academic Document</h3>
              <p className="text-xs text-teal-200">Transcripts, Testimonials, & Clearance Certs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Full Name
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Admission Number
              </label>
              <input
                type="text"
                required
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as OfficialDocType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Official Academic Transcript">Official Academic Transcript</option>
                <option value="Certificate of Clearance">Certificate of Clearance</option>
                <option value="Character Testimonial">Character Testimonial</option>
                <option value="Transfer Certificate">Transfer Certificate</option>
                <option value="Visa Embassy Verification Letter">Visa Embassy Verification Letter</option>
                <option value="Statement of WAEC/BECE Results">Statement of WAEC/BECE Results</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bursary Clearance Receipt #
              </label>
              <input
                type="text"
                value={bursaryReceiptNumber}
                onChange={(e) => setBursaryReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Destination Organization / University / Embassy
            </label>
            <input
              type="text"
              placeholder="e.g. University of Toronto / UK Visas & Immigration"
              value={destinationInstitution}
              onChange={(e) => setDestinationInstitution(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-900 font-medium">
              Document will be generated with official watermarked seal, QR code verification link, and Principal signature endorsement.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Award className="w-4 h-4" />
              Generate & Stamp Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. PRINCIPAL DELEGATED IAM / RBAC INSPECTOR MODAL
// -------------------------------------------------------------
interface PrincipalRBACPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: DelegatedPrincipalRBACPolicy;
}

export const PrincipalRBACPolicyModal: React.FC<PrincipalRBACPolicyModalProps> = ({
  isOpen,
  onClose,
  policy
}) => {
  const [elevationRequested, setElevationRequested] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-400/30">
              <ShieldCheck className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Principal IAM & RBAC Authority Matrix</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  ENFORCED
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">Policy Ref: {policy.policyCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Executive Delegation Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delegating Authority</p>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">{policy.grantedByPrincipalName}</h4>
              <p className="text-xs text-slate-600">Principal & Chief Executive Officer (Greenfield Academy)</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Role</p>
              <h4 className="font-bold text-teal-800 text-sm mt-0.5">{policy.grantedToUserName}</h4>
              <p className="text-xs text-slate-600">Executive Administrative Assistant</p>
            </div>
          </div>

          {/* Granular Permissions List */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-600" />
              Active Delegated Administrative Permissions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(policy.activePermissions).map(([key, isGranted]) => {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^can /, 'Authorize ')
                  .replace(/^./, str => str.toUpperCase());
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      isGranted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    {isGranted ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-slate-400">
                        <Lock className="w-3.5 h-3.5" /> Restricted
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Trail */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Executive Audit & Policy Log
            </h4>
            <div className="space-y-2">
              {policy.auditTrail.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{log.action}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">Authorized by: {log.actor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Privilege Elevation Request */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-xs font-bold text-amber-900">Need Temporary Elevated Privileges?</h5>
                <p className="text-xs text-amber-800 mt-1">
                  You may dispatch an urgent MFA elevation request to Principal Dr. Mustapha for broadsheet endorsement or financial waiver override.
                </p>
                {elevationRequested ? (
                  <div className="mt-3 p-2 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Elevation Request #ELEV-892 Dispatched to Principal's Secure Device
                  </div>
                ) : (
                  <button
                    onClick={() => setElevationRequested(true)}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Request Temporary Principal Elevation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">Seal: {policy.principalDelegationSeal}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
