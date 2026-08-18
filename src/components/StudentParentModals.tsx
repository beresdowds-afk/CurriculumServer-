import React, { useState } from 'react';
import {
  StudentAssignmentItem,
  ParentFeeInvoice,
  ParentConsentSlip,
  ParentPickupPassData,
  StudentPerformanceEntry,
  SchoolBrandProfile
} from '../types';
import {
  X,
  Send,
  CheckCircle2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  Printer,
  Download,
  AlertCircle,
  FileText,
  Lock,
  Sparkles,
  HelpCircle,
  Paperclip,
  Check
} from 'lucide-react';

// -------------------------------------------------------------
// 1. STUDENT ASSIGNMENT SUBMISSION MODAL
// -------------------------------------------------------------
interface AssignmentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: StudentAssignmentItem | null;
  onSubmit: (asgId: string, answerText: string) => void;
}

export const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSubmit
}) => {
  const [answerText, setAnswerText] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() && !attachedFile) return;
    onSubmit(assignment.id, answerText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
              {assignment.subject}
            </span>
            <h3 className="font-bold text-base mt-1">{assignment.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 text-xs">
            <p className="font-bold text-teal-950">Teacher Instructions ({assignment.teacherName}):</p>
            <p className="text-teal-800 mt-1">{assignment.instructions}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-teal-700">
              <span>{assignment.formattedDue}</span>
              <span>Max Score: {assignment.maxScore} Marks</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Your Homework Solution / Written Text
            </label>
            <textarea
              rows={4}
              required
              placeholder="Type your answers, proofs, or essay content here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Attach File / Worksheet Photo
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                 onClick={() => setAttachedFile('David_K_Homework_Solution.pdf')}>
              <Paperclip className="w-4 h-4 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                {attachedFile ? (
                  <span className="text-teal-700 font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Attached: {attachedFile}
                  </span>
                ) : (
                  'Click to simulate attaching handwritten PDF or photo'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Homework to Teacher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. ASK TEACHER / ACADEMIC CONSULTATION MODAL
// -------------------------------------------------------------
interface AskTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendQuery: (teacher: string, subject: string, question: string) => void;
}

export const AskTeacherModal: React.FC<AskTeacherModalProps> = ({
  isOpen,
  onClose,
  onSendQuery
}) => {
  const [teacher, setTeacher] = useState('Mr. Daniel Adeyemi (Mathematics)');
  const [subject, setSubject] = useState('Clarification on Quadratic Formula Steps');
  const [question, setQuestion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSendQuery(teacher, subject, question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-300" />
            <h3 className="font-bold text-base">Ask Teacher / Academic Query</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Subject Master
            </label>
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="Mr. Daniel Adeyemi (Mathematics)">Mr. Daniel Adeyemi (Mathematics Master)</option>
              <option value="Mrs. Ngozi Okonjo (English Language)">Mrs. Ngozi Okonjo (English Mistress)</option>
              <option value="Mrs. Amina Yusuf (Basic Science)">Mrs. Amina Yusuf (Science & Technology)</option>
              <option value="Mme. Claire Dubois (French)">Mme. Claire Dubois (French Master)</option>
              <option value="Mr. Kelechi Nwosu (Civic Education)">Mr. Kelechi Nwosu (Civic Education)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Question Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Your Question or Clarification
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the problem, equation, or concept you'd like help with..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send to Teacher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. PARENT FEE INVOICE & PAYSTACK SIMULATOR MODAL
// -------------------------------------------------------------
interface ParentFeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ParentFeeInvoice | null;
  onPaymentSuccess: (invoiceId: string, receiptNo: string) => void;
}

export const ParentFeePaymentModal: React.FC<ParentFeePaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handlePayNow = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const receiptNo = `RCP-2026-${Math.floor(Math.random() * 89999) + 10000}`;
      setPaidReceipt(receiptNo);
      onPaymentSuccess(invoice.id, receiptNo);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-300" />
            <div>
              <h3 className="font-bold text-base">Bursary Fee Payment Portal</h3>
              <p className="text-[11px] text-teal-200">Ward: {invoice.wardName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {paidReceipt ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-600">
                Tuition fee payment of <span className="font-bold text-teal-800">₦{invoice.totalAmount.toLocaleString()}</span> has been confirmed by Greenfield Academy Bursary.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
                Receipt Ref: {paidReceipt}
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm"
              >
                Close & View Updated Ledger
              </button>
            </div>
          ) : (
            <>
              {/* Fee Breakdown */}
              <div className="space-y-2 border-b border-slate-200 pb-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Invoice #{invoice.invoiceNumber}</span>
                  <span>{invoice.term}</span>
                </div>
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{item.description}</span>
                    <span className="font-semibold text-slate-900">₦{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-bold text-teal-900">
                  <span>Total Amount Payable</span>
                  <span className="text-base text-teal-700">₦{invoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'card', label: 'Debit Card', sub: 'Visa / Verve' },
                    { id: 'transfer', label: 'Bank Transfer', sub: 'Virtual NUBAN' },
                    { id: 'ussd', label: 'USSD Bank', sub: '*737# / *901#' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === m.id
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-xs">{m.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Encrypted 256-bit Bursary Direct Settlement via Central Bank of Nigeria authorized gateway.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayNow}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Pay ₦{invoice.totalAmount.toLocaleString()} Now
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. PARENT PICKUP SECURITY PASS QR MODAL
// -------------------------------------------------------------
interface PickupPassQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: ParentPickupPassData | null;
}

export const PickupPassQRModal: React.FC<PickupPassQRModalProps> = ({
  isOpen,
  onClose,
  pass
}) => {
  if (!isOpen || !pass) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 text-center">
        <div className="bg-gradient-to-r from-teal-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="text-left">
            <h3 className="font-bold text-base">Digital Security Pickup Pass</h3>
            <p className="text-[11px] text-teal-200">Greenfield Academy Gate Protocol</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
            <div className="w-44 h-44 bg-white rounded-xl border border-slate-300 flex flex-col items-center justify-center p-2 shadow-sm">
              <QrCode className="w-36 h-36 text-slate-900" />
            </div>
            <p className="text-xs font-mono font-bold text-teal-900 mt-2">PIN: {pass.passPin}</p>
          </div>

          <div className="text-left space-y-1.5 text-xs bg-teal-50/70 p-3 rounded-xl border border-teal-200">
            <p><span className="text-slate-500 font-semibold">Student Ward:</span> <span className="font-bold text-slate-900">{pass.wardName}</span></p>
            <p><span className="text-slate-500 font-semibold">Authorized Escort:</span> <span className="font-bold text-slate-900">{pass.authorizedPersonName}</span></p>
            <p><span className="text-slate-500 font-semibold">Registered Vehicle:</span> <span className="font-semibold text-slate-800">{pass.vehicleRegNumber || 'Pedestrian / Escort'}</span></p>
            <p><span className="text-slate-500 font-semibold">Gate Status:</span> <span className="font-bold text-emerald-700 uppercase">ACTIVE & VERIFIED</span></p>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Gate Pass / Save Image
          </button>
        </div>
      </div>
    </div>
  );
};
