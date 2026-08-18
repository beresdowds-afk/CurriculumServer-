import React, { useState } from 'react';
import { 
  TenantSchoolApp 
} from '../types';
import { 
  X, 
  Award, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  Download, 
  ArrowRight, 
  Sparkles, 
  FileText, 
  Check, 
  Percent, 
  Coins, 
  Building,
  Key
} from 'lucide-react';

interface LeaseToOwnTrackerModalProps {
  tenant: TenantSchoolApp | null;
  isOpen: boolean;
  onClose: () => void;
  onPayInstallment?: (tenantId: string) => void;
  onEarlyBuyout?: (tenantId: string, finalAmount: number) => void;
}

export const LeaseToOwnTrackerModal: React.FC<LeaseToOwnTrackerModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onPayInstallment,
  onEarlyBuyout
}) => {
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [earlyBuyoutProcessed, setEarlyBuyoutProcessed] = useState(false);

  if (!isOpen || !tenant || !tenant.leaseToOwnContract) return null;

  const contract = tenant.leaseToOwnContract;
  const equityPercentage = Math.min(
    100, 
    Math.round((contract.totalEquityAccumulated / contract.totalBuyoutPrice) * 100)
  );

  const discountedEarlyBuyout = Math.round(
    contract.remainingBuyoutBalance * (1 - contract.earlyBuyoutDiscountPercent / 100)
  );

  const isEligibleForPerpetualHandover = contract.monthsPaid >= contract.amortizationPeriodMonths || contract.isPerpetualLicenseGranted || earlyBuyoutProcessed;

  const handleProcessEarlyBuyout = () => {
    if (onEarlyBuyout) {
      onEarlyBuyout(tenant.id, discountedEarlyBuyout);
    }
    setEarlyBuyoutProcessed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-500/30 text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Lease-to-Own Software Amortization Ledger</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700">
                  {equityPercentage}% Equity
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Capital acquisition contract for <strong className="text-slate-200">{tenant.schoolName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          {/* Equity Progress Hero */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 border border-purple-800/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Amortization Equity Progress
                </span>
                <h4 className="text-2xl font-black text-white tracking-tight mt-0.5">
                  ₦{(contract.totalEquityAccumulated).toLocaleString()}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / ₦{(contract.totalBuyoutPrice).toLocaleString()} Total Buyout
                  </span>
                </h4>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Amortization Term</span>
                <span className="text-sm font-bold text-slate-200">
                  Month {contract.monthsPaid} of {contract.amortizationPeriodMonths} Paid
                </span>
              </div>
            </div>

            {/* Visual Multi-step Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-purple-500/40"
                  style={{ width: `${equityPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Start: {contract.startDate}</span>
                <span className="text-purple-300 font-semibold">{contract.amortizationPeriodMonths - contract.monthsPaid} Months Remaining</span>
                <span>Target Perpetual Handover: {contract.targetPerpetualHandoverDate}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Monthly Amortization</span>
              </div>
              <p className="text-lg font-bold text-white">
                ₦{(contract.monthlyAmortizationInstallment).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400">100% credited to software equity</span>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Remaining Balance</span>
              </div>
              <p className="text-lg font-bold text-amber-300">
                ₦{(contract.remainingBuyoutBalance).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400">Amortized over remaining months</span>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Source Escrow Status</span>
              </div>
              <p className="text-xs font-bold text-sky-300 capitalize">
                {contract.escrowSourceCodeReleaseStatus.replace(/_/g, ' ')}
              </p>
              <span className="text-[10px] text-slate-400">Audited in independent legal escrow</span>
            </div>
          </div>

          {/* Early Buyout Discount Opportunity */}
          {!isEligibleForPerpetualHandover && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Percent className="w-4 h-4" />
                  <span>Early Buyout Incentive ({contract.earlyBuyoutDiscountPercent}% Instant Discount)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  Pay the remaining buyout upfront for <strong className="text-white">₦{(discountedEarlyBuyout).toLocaleString()}</strong> (Save ₦{(contract.remainingBuyoutBalance - discountedEarlyBuyout).toLocaleString()}) and immediately unlock your Perpetual On-Premise License & Full Source Code release.
                </p>
              </div>

              <button
                onClick={handleProcessEarlyBuyout}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 whitespace-nowrap shrink-0 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trigger Early Buyout</span>
              </button>
            </div>
          )}

          {/* Perpetual License Certificate & Handover Banner */}
          {(isEligibleForPerpetualHandover || equityPercentage >= 100) && (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Award className="w-5 h-5" />
                  <span>Perpetual Software Ownership Qualified!</span>
                </div>
                <button
                  onClick={() => setShowCertificatePreview(prev => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showCertificatePreview ? 'Hide Certificate' : 'View Official Certificate'}</span>
                </button>
              </div>

              <p className="text-xs text-amber-200/90 leading-relaxed">
                {tenant.schoolName} has fulfilled full software amortization equity. The institution is now legally granted a <strong>Perpetual, Royalty-Free On-Premise License</strong> with access to unencrypted Docker source deployments and offline database shard ownership.
              </p>

              {/* Certificate Preview Card */}
              {showCertificatePreview && (
                <div className="p-6 rounded-xl bg-slate-950 border-2 border-amber-500/60 shadow-2xl text-center space-y-4 animate-fadeIn">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                      <Building className="w-8 h-8" />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400">
                      CURRICULUM SERVER SAAS INFRASTRUCTURE
                    </span>
                    <h2 className="text-xl font-serif font-black text-amber-200 tracking-wide mt-1">
                      CERTIFICATE OF PERPETUAL SOFTWARE LICENSE & ESCROW RELEASE
                    </h2>
                  </div>

                  <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                    This certifies that <strong className="text-white">{tenant.schoolName}</strong> (App ID: <code className="text-amber-400 font-mono">{tenant.appId}</code>) has completed all 24 amortization equity installments under Lease-to-Own Master Contract <code className="text-amber-300">#CS-LTO-2026-081</code>. Full source code deployment credentials, database schemas, and offline self-hosting rights are hereby transferred.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-slate-400 border-t border-slate-800">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">License ID</span>
                      <span className="font-mono text-slate-200">LIC-PERPETUAL-{tenant.appId}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Handover Date</span>
                      <span className="text-slate-200">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-500">Escrow Auth</span>
                      <span className="text-emerald-400 font-mono">RELEASED_AND_SEALED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
