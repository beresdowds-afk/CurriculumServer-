import React from 'react';
import { OfficialReceipt, SchoolBrandProfile } from '../types';
import { numberToWordsNaira } from '../data/bursaryAccountsData';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  Smartphone,
  QrCode,
  School,
  FileCheck
} from 'lucide-react';

interface OfficialReceiptModalProps {
  receipt: OfficialReceipt;
  onClose: () => void;
  onShareNotification?: (receipt: OfficialReceipt) => void;
  brandProfile?: SchoolBrandProfile;
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  receipt,
  onClose,
  onShareNotification,
  brandProfile
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'paystack':
        return {
          label: 'Paystack Gateway (Online / Card)',
          icon: <CreditCard className="w-4 h-4 text-cyan-400" />,
          color: 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
        };
      case 'opay':
        return {
          label: 'OPay Business (Instant Virtual Transfer)',
          icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
        };
      case 'bank_transfer':
        return {
          label: 'Direct Bank Transfer / NIP Settlement',
          icon: <Building2 className="w-4 h-4 text-blue-400" />,
          color: 'bg-blue-950/80 text-blue-300 border-blue-700'
        };
      default:
        return {
          label: 'Bursary Cash / Direct',
          icon: <CheckCircle2 className="w-4 h-4 text-slate-400" />,
          color: 'bg-slate-800 text-slate-300 border-slate-700'
        };
    }
  };

  const channelInfo = getChannelBadge(receipt.paymentChannel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scaleUp my-8">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <FileCheck className="w-4 h-4" />
            <span>Official E-Receipt & Payment Clearance</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Receipt</span>
            </button>

            {onShareNotification && (
              <button
                onClick={() => onShareNotification(receipt)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Send SMS/Email receipt to parent"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Send to Parent</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div id="printable-receipt-area" className="p-8 sm:p-10 bg-slate-900 text-slate-100 space-y-6 print:bg-white print:text-black">
          {/* School Header & Crest */}
          <div 
            className="border-b-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderColor: brandProfile?.brandTheme?.primaryColor || '#059669' }}
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg border border-emerald-400/30 overflow-hidden"
                style={{
                  background: brandProfile?.brandTheme?.primaryColor 
                    ? `linear-gradient(135deg, ${brandProfile.brandTheme.primaryColor}, ${brandProfile.brandTheme.secondaryColor})` 
                    : 'linear-gradient(135deg, #059669, #0f766e)'
                }}
              >
                {brandProfile?.crestLogoUrl ? (
                  <img src={brandProfile.crestLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <School className="w-8 h-8" />
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white print:text-black tracking-tight uppercase">
                  {brandProfile?.schoolName || 'CURRICULUMFLOW ACADEMY'}
                </h1>
                <p className="text-xs text-emerald-400 font-semibold print:text-emerald-700">
                  Directorate of Bursary & Financial Administration
                </p>
                <p className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5">
                  {brandProfile ? `${brandProfile.address.streetAddress}, ${brandProfile.address.city}, ${brandProfile.address.state} • ${brandProfile.contact.bursaryEmail || brandProfile.contact.primaryEmail}` : 'Plot 12, Academic Boulevard, Victoria Island, Lagos, Nigeria • bursary@curriculumflow.edu.ng'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700 print:border-black print:text-black print:bg-emerald-100">
                OFFICIAL RECEIPT
              </span>
              <div className="mt-2 text-slate-300 print:text-black font-bold">
                No: {receipt.receiptNumber}
              </div>
              <div className="text-slate-400 print:text-slate-600 text-[11px]">
                Date: {new Date(receipt.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Student & Invoice Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 print:bg-slate-50 print:border-slate-300 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Student Name</span>
              <span className="font-bold text-white print:text-black">{receipt.studentName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Admission Number</span>
              <span className="font-mono font-bold text-emerald-400 print:text-emerald-800">{receipt.admissionNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Class Grade</span>
              <span className="font-bold text-white print:text-black">{receipt.classGrade}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Invoice Ref</span>
              <span className="font-mono font-bold text-slate-300 print:text-black">{receipt.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Payer / Parent</span>
              <span className="font-medium text-slate-200 print:text-black">{receipt.parentName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Parent Phone</span>
              <span className="font-mono text-slate-300 print:text-black">{receipt.parentPhone}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Transaction Ref</span>
              <span className="font-mono text-[11px] text-slate-300 print:text-black truncate block" title={receipt.transactionReference}>
                {receipt.transactionReference}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Payment Channel</span>
              <span className="font-semibold text-emerald-400 print:text-black flex items-center gap-1">
                {channelInfo.label.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Amount Paid Highlight Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 print:bg-emerald-50 print:border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block print:text-emerald-800">
                Amount Paid (In Figures)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white print:text-black font-mono">
                ₦{receipt.amountPaidThisTransaction.toLocaleString()}.00
              </div>
              <div className="text-xs italic text-slate-300 print:text-slate-800 mt-1 font-serif">
                "{receipt.amountInWords}"
              </div>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${channelInfo.color}`}>
                {channelInfo.icon}
                <span>{channelInfo.label}</span>
              </span>
            </div>
          </div>

          {/* Breakdown Ledger Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 print:bg-slate-100 print:text-black font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Financial Item Description</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4 text-right">Paid To Date</th>
                  <th className="py-3 px-4 text-right">Balance Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                <tr className="text-slate-200 print:text-black">
                  <td className="py-3 px-4 font-semibold">
                    Term 3 Tuition, STEM Labs, CBT Platform, PTA & Infrastructure Package
                  </td>
                  <td className="py-3 px-4 text-right font-mono">₦{receipt.totalInvoiceAmount.toLocaleString()}.00</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 print:text-emerald-800">
                    ₦{receipt.totalCumulativePaid.toLocaleString()}.00
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-300 print:text-black">
                    ₦{receipt.balanceRemaining.toLocaleString()}.00
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-950/80 font-bold border-t border-slate-800 print:bg-slate-100 print:border-slate-300">
                <tr>
                  <td className="py-3 px-4 text-white print:text-black uppercase text-[11px]">
                    Academic Clearance Status:
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-right font-mono">
                    {receipt.balanceRemaining === 0 ? (
                      <span className="text-emerald-400 print:text-emerald-800 font-extrabold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-4 h-4" /> FULLY CLEARED FOR TERM 3 (100% COMPLETE)
                      </span>
                    ) : (
                      <span className="text-amber-400 print:text-amber-800 font-bold">
                        PARTIAL CLEARANCE (₦{receipt.balanceRemaining.toLocaleString()}.00 OUTSTANDING)
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer & Authorized Signatures */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-xs border-t border-slate-800 print:border-slate-300">
            {/* QR Code Security Stamp */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center shadow">
                <QrCode className="w-14 h-14 text-slate-950" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 print:text-slate-600 block uppercase font-bold">
                  Digital Audit Stamp
                </span>
                <span className="font-mono text-[9px] text-emerald-400 print:text-emerald-800 block truncate max-w-[140px]">
                  {receipt.qrVerificationCode}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Verify @ portal.curriculumflow.edu.ng/verify
                </span>
              </div>
            </div>

            {/* Electronic Stamp */}
            <div className="text-center">
              <div className="w-24 h-10 border-2 border-dashed border-emerald-500/50 rounded-xl mx-auto flex items-center justify-center text-[10px] font-black text-emerald-400 print:text-emerald-800 uppercase tracking-widest rotate-[-4deg]">
                AUDITED & PAID
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Bursary Central Clearance</span>
            </div>

            {/* Bursar Signature */}
            <div className="text-right space-y-1">
              <div className="font-serif italic text-sm text-emerald-400 print:text-emerald-900 border-b border-slate-700 print:border-slate-400 pb-1">
                Chief O. Eze (FCA)
              </div>
              <span className="text-[11px] font-bold text-white print:text-black block">
                {receipt.authorizedBursarName}
              </span>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                CurriculumFlow Bursary & Accounts Board
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
