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
  const [paymentChannel, setPaymentChannel] = useState<'paystack' | 'opay' | 'monnify' | 'flutterwave' | 'bank_wire'>('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tellerReference, setTellerReference] = useState('');
  const [opayPhoneNumber, setOpayPhoneNumber] = useState(tenant.principalPhone || '08031234567');
  const [paystackSubMethod, setPaystackSubMethod] = useState<'card' | 'ussd' | 'transfer'>('card');
  const [txRef, setTxRef] = useState(`ref_cs_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

  const amountToPay = customAmount || invoice?.totalAmount || tenant.subscriptionPricePerMonth;
  const vatAmount = Math.round(amountToPay * 0.075);
  const totalAmount = amountToPay + vatAmount;

  // Dynamic fee calculation based on PSP provider
  const pspProcessingFee = paymentChannel === 'opay' ? 50 : paymentChannel === 'paystack' ? Math.min(2000, Math.round(amountToPay * 0.015)) : 0;
  const grandTotal = totalAmount + (paymentChannel === 'bank_wire' ? 0 : pspProcessingFee);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleExecutePayment = () => {
    setIsProcessing(true);
    const generatedRef = paymentChannel === 'opay'
      ? `OPAY_PROP_${Date.now().toString().slice(-8)}_${Math.floor(100 + Math.random() * 900)}`
      : paymentChannel === 'paystack'
      ? `PSTK_PROP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
      : txRef;
    setTxRef(generatedRef);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setTimeout(() => {
        onPaymentSuccess(invoice?.id || `inv_${Date.now()}`, paymentChannel, generatedRef);
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Select Integrated Payment Service Provider (PSP)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>CBN-Licensed Gateways</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { 
                      id: 'paystack', 
                      name: 'Paystack Gateway', 
                      desc: 'Card, USSD & Apple Pay', 
                      badge: 'Instant Card Auth',
                      fee: '1.5% (Capped ₦2k)',
                      icon: CreditCard,
                      theme: 'cyan'
                    },
                    { 
                      id: 'opay', 
                      name: 'OPay Digital Bank', 
                      desc: 'Dedicated NUBAN & Wallet', 
                      badge: 'Zero Surcharge (₦50)',
                      fee: 'Flat ₦50 Fee',
                      icon: Smartphone,
                      theme: 'emerald'
                    },
                    { 
                      id: 'monnify', 
                      name: 'Monnify / Wema NUBAN', 
                      desc: 'Automated Bank Wire', 
                      badge: 'NIP Direct',
                      fee: '1.0% (Capped ₦1k)',
                      icon: Building2,
                      theme: 'blue'
                    },
                    { 
                      id: 'flutterwave', 
                      name: 'Flutterwave Barter', 
                      desc: 'Mobile Money & Cards', 
                      badge: 'Multi-Currency',
                      fee: '1.4% Fee',
                      icon: Smartphone,
                      theme: 'amber'
                    },
                    { 
                      id: 'bank_wire', 
                      name: 'Corporate Bank Wire', 
                      desc: 'Manual Teller / Upload', 
                      badge: 'Direct GTBank',
                      fee: '₦0 Surcharge',
                      icon: Lock,
                      theme: 'slate'
                    }
                  ].map(ch => {
                    const Icon = ch.icon;
                    const isSelected = paymentChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setPaymentChannel(ch.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-slate-700'}`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </span>
                          </div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{ch.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{ch.desc}</p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-900 flex items-center justify-between text-[9px]">
                          <span className="text-emerald-400/90 font-medium">{ch.badge}</span>
                          <span className="text-slate-500 font-mono">{ch.fee}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paystack Details */}
              {paymentChannel === 'paystack' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-900/50 space-y-3 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Paystack Checkout Node</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(['card', 'ussd', 'transfer'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaystackSubMethod(m)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize cursor-pointer transition-all ${
                            paystackSubMethod === m ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paystackSubMethod === 'card' && (
                    <div className="space-y-2 text-xs">
                      <p className="text-[11px] text-slate-300">
                        Immediate recurring debit via tokenized Mastercard, Visa, or Nigerian Verve card.
                      </p>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">Merchant Gateway:</span>
                          <span className="font-bold text-white">CurriculumFlow Platform</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">Settlement SLA:</span>
                          <span className="font-bold text-cyan-400">Instant T+0 Webhook</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        <span>Protected by Paystack 256-bit AES PCI-DSS Level 1 encryption.</span>
                      </div>
                    </div>
                  )}

                  {paystackSubMethod === 'ussd' && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Dial USSD Short Code on Proprietor Phone:</span>
                      <div className="font-mono text-cyan-300 font-bold text-sm bg-slate-950 p-2 rounded-lg text-center border border-slate-800">
                        *737*000*8190# (GTBank) • *894*000*412# (FirstBank)
                      </div>
                      <span className="text-[10px] text-slate-400 block">Funds clear instantly once authorized on your mobile handset.</span>
                    </div>
                  )}

                  {paystackSubMethod === 'transfer' && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Paystack Dynamic Bank:</span>
                        <strong className="text-white">Titan Paystack Bank</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Dynamic Pay-in NUBAN:</span>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-cyan-400 text-sm">9988102914</strong>
                          <button 
                            onClick={() => handleCopy('9988102914', 'pstk_nuban')}
                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            {copiedField === 'pstk_nuban' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPay Details */}
              {paymentChannel === 'opay' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-900/50 space-y-3 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>OPay Instant Settlement (CBN Licensed)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                      Lowest Processing Fee (₦50)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono">
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Dedicated OPay Virtual Account:</span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-emerald-400">8031112233</span>
                        <button 
                          onClick={() => handleCopy('8031112233', 'opay_nuban')}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                        >
                          {copiedField === 'opay_nuban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'opay_nuban' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-sans">Bank Name: <strong>OPay Digital Services (Paycom)</strong></span>
                      <span className="text-[10px] text-slate-400 block font-sans">Beneficiary: <strong>CurriculumFlow / {tenant.schoolName.substring(0, 15)}</strong></span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">OPay Wallet Push Authorization:</span>
                      <input 
                        type="text" 
                        value={opayPhoneNumber}
                        onChange={e => setOpayPhoneNumber(e.target.value)}
                        placeholder="OPay registered phone (e.g. 0803...)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Push prompt sends instant biometric approval notice to your OPay mobile app.
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Real-time webhook callback triggers within 3.2 seconds with automated e-receipt dispatch.</span>
                  </div>
                </div>
              )}

              {/* Monnify Details */}
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

              {/* Flutterwave Details */}
              {paymentChannel === 'flutterwave' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gateway Portal:</span>
                    <strong className="text-white">Flutterwave Multi-Rail Merchant Node</strong>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Accepts international Visa/Mastercard cards, M-Pesa, Barter, and Nigerian Bank Transfer rails.
                  </p>
                </div>
              )}

              {/* Bank Wire Details */}
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
