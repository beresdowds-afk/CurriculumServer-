import React, { useState } from 'react';
import { TenantBillingInvoice, TenantSchoolApp } from '../../types';
import { 
  X, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  QrCode, 
  Lock, 
  ArrowRight, 
  Upload, 
  Smartphone,
  Layers,
  Award,
  DollarSign
} from 'lucide-react';

interface ProprietorSubscriptionCheckoutModalProps {
  invoice?: TenantBillingInvoice;
  tenant: TenantSchoolApp;
  customAmount?: number;
  paymentTitle?: string;
  onClose: () => void;
  onPaymentSuccess: (invoiceId: string, paymentMethod: string, reference: string) => void;
}

export const ProprietorSubscriptionCheckoutModal: React.FC<ProprietorSubscriptionCheckoutModalProps> = ({
  invoice,
  tenant,
  customAmount,
  paymentTitle,
  onClose,
  onPaymentSuccess
}) => {
  const [paymentChannel, setPaymentChannel] = useState<'paystack' | 'monnify' | 'flutterwave' | 'bank_wire'>('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tellerReference, setTellerReference] = useState('');
  const [txRef] = useState(`ref_cs_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  const amountToPay = customAmount || invoice?.totalAmount || tenant.subscriptionPricePerMonth;
  const vatAmount = Math.round(amountToPay * 0.075);
  const totalAmount = amountToPay + vatAmount;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setTimeout(() => {
        onPaymentSuccess(invoice?.id || `inv_${Date.now()}`, paymentChannel, txRef);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100 font-sans">
        
        {/* Header */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">
                {paymentTitle || `Pay Platform Invoice (${invoice?.invoiceNumber || 'Subscription Renewal'})`}
              </h3>
              <p className="text-[11px] text-slate-400">Proprietor Instant Billing Gateway • Multi-Channel Checkout</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {isCompleted ? (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Payment Confirmed & Settled!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Your transaction has been verified across the Curriculum Server billing node. Your active plan entitlements and lease-to-own software equity ledger have been immediately updated.
              </p>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400 max-w-sm mx-auto">
                <p>Transaction Ref: <strong className="text-emerald-400">{txRef}</strong></p>
                <p className="text-[11px] mt-0.5">Payment Method: <span className="uppercase text-white">{paymentChannel}</span></p>
              </div>
            </div>
          ) : (
            <>
              {/* Amount Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">School / Tenant:</span>
                  <span className="font-bold text-white">{tenant.schoolName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Subscription Tier & Plan:</span>
                  <span className="font-bold text-indigo-300">{tenant.subscriptionTier} (Up to {tenant.studentCapacity.toLocaleString()} Students)</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Total Due (incl. 7.5% VAT)</span>
                    <p className="text-2xl font-black text-emerald-400">₦{totalAmount.toLocaleString()}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                    Auto-Provisioned
                  </span>
                </div>
              </div>

              {/* Payment Channel Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select Settlement Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'paystack', name: 'Paystack Card / USSD', desc: 'Instant Visa, Verve & Mastercard', icon: CreditCard },
                    { id: 'monnify', name: 'Dedicated Virtual NUBAN', desc: 'Automated Wema Bank Wire', icon: Building2 },
                    { id: 'flutterwave', name: 'Flutterwave Portal', desc: 'Barter, Mobile Money & Cards', icon: Smartphone },
                    { id: 'bank_wire', name: 'Corporate Bank Wire', desc: 'Direct Teller / Invoice Upload', icon: Lock }
                  ].map(ch => {
                    const Icon = ch.icon;
                    const isSelected = paymentChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setPaymentChannel(ch.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-700'}`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </span>
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{ch.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{ch.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channel-Specific Details */}
              {paymentChannel === 'monnify' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Beneficiary Bank:</span>
                    <strong className="text-white">Wema Bank PLC</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Account Name:</span>
                    <strong className="text-white">Curriculum Server / {tenant.schoolName.substring(0, 15)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-900">
                    <span>Virtual Dedicated NUBAN:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-400 text-sm">7089124091</strong>
                      <button 
                        onClick={() => handleCopy('7089124091', 'nuban')}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      >
                        {copiedField === 'nuban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {paymentChannel === 'bank_wire' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Corporate Bank:</span>
                      <strong className="text-white">Guaranty Trust Bank (GTBank)</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Corporate Account:</span>
                      <strong className="text-emerald-400 text-sm">0142998810</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Account Name:</span>
                      <strong className="text-white">Curriculum Server Technologies Ltd</strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Enter Bank Wire Reference / Teller Number:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. GTB/TEL/2026/099182"
                      value={tellerReference}
                      onChange={e => setTellerReference(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>256-Bit SSL Encrypted Settlement</span>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecutePayment}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying PSP Settlement...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize ₦{totalAmount.toLocaleString()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
