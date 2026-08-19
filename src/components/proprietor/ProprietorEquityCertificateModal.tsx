import React from 'react';
import { TenantSchoolApp } from '../../types';
import { 
  X, 
  Printer, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Lock, 
  FileText, 
  QrCode, 
  Download 
} from 'lucide-react';

interface ProprietorEquityCertificateModalProps {
  tenant: TenantSchoolApp;
  onClose: () => void;
}

export const ProprietorEquityCertificateModal: React.FC<ProprietorEquityCertificateModalProps> = ({
  tenant,
  onClose
}) => {
  const contract = tenant.leaseToOwnContract;
  const monthsPaid = contract?.monthsPaid || 14;
  const totalMonths = contract?.amortizationPeriodMonths || 36;
  const accumulatedEquity = contract?.totalEquityAccumulated || 4200000;
  const targetDate = contract?.targetPerpetualHandoverDate || '2027-08-31';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100 font-sans">
        
        {/* Top Control Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Certificate of Software Equity & Escrow</h3>
              <p className="text-[11px] text-slate-400 font-mono">Contract Ref: LTO-NGR-{tenant.appId.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-8 sm:p-10 space-y-6 text-center border-8 border-double border-amber-600/30 m-4 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg font-black text-xl">
              🏆
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
              CURRICULUM SERVER EDTECH INFRASTRUCTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-white mt-1">
              Certificate of Software Equity
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Issued under the Nigerian Copyright Act & Perpetual SaaS Escrow Framework
            </p>
          </div>

          <div className="py-4 border-y border-amber-500/20 text-xs text-slate-300 space-y-2">
            <p>This document certifies that the institution</p>
            <h3 className="text-xl font-bold text-amber-300">{tenant.schoolName}</h3>
            <p className="text-slate-400 max-w-lg mx-auto text-[11px]">
              represented by Proprietor / Head of School <strong>{tenant.principalName}</strong>, is actively accumulating equity toward full perpetual ownership and source code license escrow of the <strong>CurriculumFlow</strong> cloud application.
            </p>
          </div>

          {/* Equity Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Amortization Period</span>
              <p className="font-mono font-bold text-white mt-1">{monthsPaid} / {totalMonths} Months</p>
              <p className="text-[10px] text-emerald-400 font-semibold">{Math.round((monthsPaid / totalMonths) * 100)}% Equity Earned</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Accumulated Capital</span>
              <p className="font-mono font-bold text-amber-400 mt-1">₦{accumulatedEquity.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">Locked in escrow</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Perpetual Handover</span>
              <p className="font-mono font-bold text-white mt-1">{targetDate}</p>
              <p className="text-[10px] text-indigo-400">Zero recurring dues after</p>
            </div>
          </div>

          {/* Verification & Signatures */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
            <div className="text-center sm:text-left">
              <div className="w-32 h-0.5 bg-slate-700 mx-auto sm:mx-0 mb-1" />
              <p className="font-bold text-slate-200">Engr. D. K. Adeyemo</p>
              <p className="text-[10px]">VP Cloud Infrastructure, Curriculum Server</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-950" />
              </div>
              <div className="text-[9px] text-slate-500 font-mono text-left">
                <p>ESCROW KEY VALIDATED</p>
                <p>ID: {tenant.appId}</p>
                <p className="text-emerald-400">STATUS: IN GOOD STANDING</p>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="w-32 h-0.5 bg-slate-700 mx-auto sm:ml-auto mb-1" />
              <p className="font-bold text-slate-200">{tenant.principalName}</p>
              <p className="text-[10px]">Proprietor / Authorized Trustee</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">Curriculum Server Perpetual License Escrow Deed</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
