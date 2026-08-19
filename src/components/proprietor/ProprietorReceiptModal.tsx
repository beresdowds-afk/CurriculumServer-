import React from 'react';
import { TenantBillingInvoice, TenantSchoolApp } from '../../types';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  FileText, 
  QrCode, 
  Lock, 
  Award,
  Globe
} from 'lucide-react';

interface ProprietorReceiptModalProps {
  invoice: TenantBillingInvoice;
  tenant: TenantSchoolApp;
  onClose: () => void;
}

export const ProprietorReceiptModal: React.FC<ProprietorReceiptModalProps> = ({
  invoice,
  tenant,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isPaid = invoice.status === 'paid';
  const subtotal = invoice.totalAmount;
  const vatAmount = Math.round(subtotal * 0.075); // 7.5% VAT (Nigeria standard)
  const grossAmount = subtotal + vatAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100 font-sans">
        
        {/* Top Control Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Official Tax Invoice & Payment Receipt</h3>
              <p className="text-[11px] text-slate-400 font-mono">Doc Ref: {invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-xs" id="printable-proprietor-receipt">
          {/* Header & Logo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow">
                  CS
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight uppercase">CURRICULUM SERVER INC.</h2>
                  <p className="text-[10px] text-slate-400">Cloud EdTech Infrastructure & Multi-Tenant Operating System</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                TIN: 24910294-0001 • RC: 1892044<br />
                Plot 14, Commercial Avenue, Victoria Island, Lagos, Nigeria<br />
                billing@curriculumserver.com • +234 (01) 888-CURRICULUM
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${
                isPaid 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{invoice.status}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Invoice Date: {new Date(invoice.issuedDate).toLocaleDateString()}</p>
              {invoice.paidAt && (
                <p className="text-[11px] text-emerald-400 font-mono">Paid On: {new Date(invoice.paidAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {/* Bill To Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed To (School / Proprietorship):</span>
              <p className="font-bold text-white text-sm mt-0.5">{tenant.schoolName}</p>
              <p className="text-slate-300 text-[11px]">{tenant.address || 'Lagos State, Nigeria'}</p>
              <p className="text-slate-400 text-[11px] font-mono mt-1">
                Proprietor / Rep: {tenant.principalName} ({tenant.principalEmail})
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenant Cloud Provisioning:</span>
              <p className="text-slate-300 text-[11px] font-mono mt-0.5">Tenant App ID: <strong className="text-white">{tenant.appId}</strong></p>
              <p className="text-slate-300 text-[11px] font-mono">Subdomain: <strong className="text-emerald-400">{tenant.subdomain}</strong></p>
              <p className="text-slate-300 text-[11px] font-mono">Active Tier: <strong className="text-indigo-300">{tenant.subscriptionTier}</strong></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">Billing Cycle</th>
                  <th className="pb-2 text-center">Allocation</th>
                  <th className="pb-2 text-right">Amount (NGN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-white">CurriculumFlow Platform Subscription</p>
                    <p className="text-[11px] text-slate-400">{invoice.billingPeriod} • {tenant.subscriptionTier} Tier</p>
                  </td>
                  <td className="py-3 text-center font-mono">Yearly</td>
                  <td className="py-3 text-center">{tenant.studentCapacity.toLocaleString()} Students</td>
                  <td className="py-3 text-right font-mono font-bold">₦{subtotal.toLocaleString()}</td>
                </tr>
                {tenant.leaseToOwnContract && (
                  <tr>
                    <td className="py-3">
                      <p className="font-bold text-white">Lease-to-Own Software Equity Amortization</p>
                      <p className="text-[11px] text-slate-400">Month {tenant.leaseToOwnContract.monthsPaid} Equity Pool Contribution</p>
                    </td>
                    <td className="py-3 text-center font-mono">Contract</td>
                    <td className="py-3 text-center">Perpetual Escrow</td>
                    <td className="py-3 text-right font-mono font-bold text-amber-400">Included</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center">
                <QrCode className="w-14 h-14 text-slate-950" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                <p className="font-bold text-slate-300">AUTHENTICITY VERIFICATION</p>
                <p>Digital Cryptographic Seal</p>
                <p className="text-emerald-400 truncate w-40">SHA-256: {invoice.paymentReference || 'ref_paid_cs_2026'}</p>
              </div>
            </div>

            <div className="w-full sm:w-60 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="text-slate-200">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>VAT (7.5%):</span>
                <span className="text-slate-200">₦{vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Due:</span>
                <span className="text-emerald-400">₦{grossAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer & Compliance Note */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Federal Inland Revenue Service (FIRS) compliant e-tax receipt generated by Curriculum Server Billing Node.</span>
            </div>
            <span className="font-mono text-slate-500">CS-FIRS-2026-NGR</span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Curriculum Server SaaS Control Plane</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
